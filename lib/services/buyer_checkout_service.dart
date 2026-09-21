import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 12);
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

Future<BuyerCheckoutSessionResult> createBuyerOrderCheckoutSession({
  required int createdAtEpochMs,
  String orderGroupId = '',
  String paymentGateway = '',
  String? baseUrl,
}) async {
  final candidates = buildLocalApiBaseUrls(
    baseUrl: baseUrl ?? _preferredBaseUrl,
    isAndroid: Platform.isAndroid,
  );
  Object? lastError;

  for (final candidate in candidates) {
    try {
      final result = await _createCheckoutAtBaseUrl(
        candidate,
        createdAtEpochMs: createdAtEpochMs,
        orderGroupId: orderGroupId,
        paymentGateway: paymentGateway,
      );
      _preferredBaseUrl = candidate;
      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw Exception(
    lastError?.toString() ?? 'Unable to create buyer checkout session.',
  );
}

Future<BuyerCheckoutSessionResult> _createCheckoutAtBaseUrl(
  String baseUrl, {
  required int createdAtEpochMs,
  required String orderGroupId,
  required String paymentGateway,
}) async {
  final uri = Uri.parse('$baseUrl/api/orders/checkout-session');
  final client = HttpClient();
  try {
    final request = await client.postUrl(uri).timeout(_requestTimeout);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');

    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    final accountEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
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
        if (accountId.isNotEmpty) 'accountId': accountId,
        if (accountEmail.isNotEmpty) 'email': accountEmail,
      }),
    );

    final response = await request.close().timeout(_requestTimeout);
    final body = await response
        .transform(utf8.decoder)
        .join()
        .timeout(_requestTimeout);
    final decoded = body.trim().isEmpty
        ? <String, dynamic>{}
        : jsonDecode(body) as Map<String, dynamic>;

    if (response.statusCode != HttpStatus.ok &&
        response.statusCode != HttpStatus.created) {
      final message = (decoded['message']?.toString() ?? '').trim();
      throw Exception(
        message.isNotEmpty ? message : 'Checkout failed (${response.statusCode})',
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
