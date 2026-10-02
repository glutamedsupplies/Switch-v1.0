import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_url_probe_io.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/utils/auth_session.dart';

// Connect fails fast on dead candidates; the response waits longer because the
// backend has to call PayMongo before it can answer.
const _connectTimeout = Duration(seconds: 3);
const _responseTimeout = Duration(seconds: 30);
String? _preferredBaseUrl;

class BuyerCheckoutSessionResult {
  const BuyerCheckoutSessionResult({
    required this.provider,
    required this.checkoutUrl,
    required this.paymentReference,
    required this.alreadyPaid,
    this.orderGroupId = '',
    this.createdAtEpochMs = 0,
    this.message = '',
  });

  final String provider;
  final String checkoutUrl;
  final String paymentReference;
  final bool alreadyPaid;
  final String orderGroupId;
  final int createdAtEpochMs;
  final String message;

  bool get hasHostedCheckout =>
      provider == 'paymongo' && checkoutUrl.trim().isNotEmpty;
}

class BuyerCheckoutException implements Exception {
  const BuyerCheckoutException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _UnreachableBaseUrl implements Exception {
  const _UnreachableBaseUrl(this.reason);

  final String reason;
}

Future<BuyerCheckoutSessionResult> createBuyerOrderCheckoutSession({
  required int createdAtEpochMs,
  String orderGroupId = '',
  String paymentGateway = '',
  String paymentMethodType = '',
  String? baseUrl,
}) async {
  final workingBaseUrl = await resolveWorkingLocalApiBaseUrl();
  final candidates = <String>[];
  for (final candidate in <String?>[
    baseUrl,
    _preferredBaseUrl,
    workingBaseUrl,
    ...buildLocalApiBaseUrls(isAndroid: Platform.isAndroid),
  ]) {
    final trimmed = candidate?.trim() ?? '';
    if (trimmed.isNotEmpty && !candidates.contains(trimmed)) {
      candidates.add(trimmed);
    }
  }

  final failures = <String>[];
  for (final candidate in candidates) {
    try {
      final result = await _createCheckoutAtBaseUrl(
        candidate,
        createdAtEpochMs: createdAtEpochMs,
        orderGroupId: orderGroupId,
        paymentGateway: paymentGateway,
        paymentMethodType: paymentMethodType,
      );
      _preferredBaseUrl = candidate;
      rememberWorkingLocalApiBaseUrl(candidate);
      return result;
    } on _UnreachableBaseUrl catch (error) {
      failures.add('$candidate -> ${error.reason}');
    }
  }

  throw BuyerCheckoutException(
    'Unable to reach the payment server. Tried: ${failures.join(' | ')}',
  );
}

/// Throws [_UnreachableBaseUrl] only when the backend could not be reached, so
/// the next candidate is tried. Any answer from the backend (including errors
/// and slow PayMongo responses) is final to avoid creating duplicate sessions.
Future<BuyerCheckoutSessionResult> _createCheckoutAtBaseUrl(
  String baseUrl, {
  required int createdAtEpochMs,
  required String orderGroupId,
  required String paymentGateway,
  required String paymentMethodType,
}) async {
  final uri = Uri.parse('$baseUrl/api/orders/checkout-session');
  final client = HttpClient()..connectionTimeout = _connectTimeout;
  try {
    final HttpClientRequest request;
    try {
      request = await client.postUrl(uri).timeout(_connectTimeout);
    } on SocketException catch (error) {
      throw _UnreachableBaseUrl(error.message);
    } on TimeoutException {
      throw const _UnreachableBaseUrl('timeout');
    } on HttpException catch (error) {
      throw _UnreachableBaseUrl(error.message);
    }
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');

    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    final accountEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
    final sessionToken = (await AuthSession.getSessionToken())?.trim() ?? '';
    if (sessionToken.isNotEmpty) {
      request.headers.set('X-Switch-Session', sessionToken);
    }
    if (accountId.isNotEmpty) {
      request.headers.set('X-GMS-Account-ID', accountId);
    }
    if (accountEmail.isNotEmpty) {
      request.headers.set('X-GMS-Account-Email', accountEmail);
    }

    request.write(
      jsonEncode(<String, dynamic>{
        if (orderGroupId.trim().isNotEmpty) 'orderGroupId': orderGroupId.trim(),
        'createdAtEpochMs': createdAtEpochMs,
        if (paymentGateway.trim().isNotEmpty)
          'paymentGateway': paymentGateway.trim(),
        if (paymentMethodType.trim().isNotEmpty)
          'paymentMethodType': paymentMethodType.trim(),
        if (accountId.isNotEmpty) 'accountId': accountId,
        if (accountEmail.isNotEmpty) 'email': accountEmail,
      }),
    );

    final String body;
    final int statusCode;
    try {
      final response = await request.close().timeout(_responseTimeout);
      statusCode = response.statusCode;
      body = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_responseTimeout);
    } on TimeoutException {
      throw const BuyerCheckoutException(
        'The payment server took too long to respond. Please try again.',
      );
    } on SocketException catch (error) {
      throw BuyerCheckoutException('Payment request failed: ${error.message}');
    } on HttpException catch (error) {
      throw BuyerCheckoutException('Payment request failed: ${error.message}');
    }

    Map<String, dynamic> decoded = const <String, dynamic>{};
    if (body.trim().isNotEmpty) {
      try {
        final parsed = jsonDecode(body);
        if (parsed is Map<String, dynamic>) decoded = parsed;
      } on FormatException {
        // Non-JSON body; fall through to the status-code message.
      }
    }

    if (statusCode != HttpStatus.ok && statusCode != HttpStatus.created) {
      final message = (decoded['message']?.toString() ?? '').trim();
      throw BuyerCheckoutException(
        message.isNotEmpty ? message : 'Checkout failed ($statusCode)',
      );
    }

    return BuyerCheckoutSessionResult(
      provider: (decoded['provider']?.toString() ?? 'manual').trim(),
      checkoutUrl: (decoded['checkoutUrl']?.toString() ?? '').trim(),
      paymentReference:
          (decoded['paymentReference']?.toString() ?? '').trim(),
      alreadyPaid: decoded['alreadyPaid'] == true,
      orderGroupId: (decoded['orderGroupId']?.toString() ?? '').trim(),
      createdAtEpochMs:
          int.tryParse('${decoded['createdAtEpochMs'] ?? createdAtEpochMs}') ??
              createdAtEpochMs,
      message: (decoded['message']?.toString() ?? '').trim(),
    );
  } finally {
    client.close(force: true);
  }
}
