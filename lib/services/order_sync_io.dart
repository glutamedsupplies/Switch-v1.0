import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart' show compute;
import 'package:switch_app/services/admin_scope.dart';
import 'package:switch_app/services/local_api_base_url_probe_io.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/order_sync_base.dart';
import 'package:switch_app/utils/auth_session.dart';

// Short connect timeout so dead loopback/LAN candidates fail fast; a longer
// response timeout because saving orders writes to PostgreSQL.
const _connectTimeout = Duration(seconds: 3);
const _requestTimeout = Duration(seconds: 20);
String? _preferredBaseUrl;

/// Pulls `message` out of a JSON error body so the buyer sees the real reason.
String _serverErrorMessage(int statusCode, String responseBody) {
  final trimmed = responseBody.trim();
  if (trimmed.isEmpty) return 'Server error ($statusCode)';
  try {
    final decoded = jsonDecode(trimmed);
    if (decoded is Map && decoded['message'] is String) {
      final message = (decoded['message'] as String).trim();
      if (message.isNotEmpty) return message;
    }
  } catch (_) {}
  return trimmed;
}

Future<List<Map<String, dynamic>>> _decodeOrderItemsInBackground(
  String responseBody,
) {
  return compute(_decodeOrderItems, responseBody);
}

String _normalizeBaseUrl(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    return '';
  }

  var sanitized = trimmed;
  if ((sanitized.startsWith('"') && sanitized.endsWith('"')) ||
      (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
    sanitized = sanitized.substring(1, sanitized.length - 1).trim();
  }

  while (sanitized.endsWith('/')) {
    sanitized = sanitized.substring(0, sanitized.length - 1).trimRight();
  }

  if (sanitized.isEmpty) {
    return '';
  }

  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    return sanitized;
  }

  return 'http://$sanitized';
}

String _normalizeApiPath(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
}

Uri _buildApiUri(String baseUrl, String apiPath) {
  final normalizedBaseUrl = _normalizeBaseUrl(baseUrl);
  if (normalizedBaseUrl.isEmpty) {
    throw const _BaseUrlAttemptFailure('invalid URL');
  }

  final parsedBaseUri = Uri.tryParse('$normalizedBaseUrl/');
  if (parsedBaseUri == null ||
      !parsedBaseUri.hasScheme ||
      parsedBaseUri.host.trim().isEmpty) {
    throw _BaseUrlAttemptFailure('invalid URL: $baseUrl');
  }

  return parsedBaseUri.resolve(_normalizeApiPath(apiPath));
}

List<String> _resolveCandidateBaseUrls(
  List<String> baseUrls, {
  String? preferredBaseUrl,
}) {
  final resolved = <String>[];

  void addUrl(String? value) {
    final normalizedValue = _normalizeBaseUrl(value ?? '');
    if (normalizedValue.isEmpty || resolved.contains(normalizedValue)) {
      return;
    }
    resolved.add(normalizedValue);
  }

  addUrl(preferredBaseUrl);
  for (final baseUrl in baseUrls) {
    addUrl(baseUrl);
  }

  return resolved;
}

OrderSyncService createOrderSyncService({String? baseUrl}) {
  return _HttpOrderSyncService(explicitBaseUrl: baseUrl);
}

List<String> _buildBaseUrls({String? baseUrl}) {
  return buildLocalApiBaseUrls(
    baseUrl: baseUrl,
    isAndroid: Platform.isAndroid,
  ).map(_normalizeBaseUrl).where((url) => url.isNotEmpty).toList();
}

void _setAdminScopeHeader(HttpHeaders headers) {
  final adminId = activeAdminId;
  if (adminId.isNotEmpty) {
    headers.set('X-GMS-Admin-ID', adminId);
  }
}

Future<void> _setAccountIdHeader(HttpHeaders headers) async {
  final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
  final accountEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
  final requestAccountId = accountId.isNotEmpty ? accountId : accountEmail;
  final sessionToken = (await AuthSession.getSessionToken())?.trim() ?? '';
  if (sessionToken.isNotEmpty) {
    headers.set('X-Switch-Session', sessionToken);
  }

  if (requestAccountId.isNotEmpty) {
    headers.set('X-GMS-Account-ID', requestAccountId);
  }
  if (accountEmail.isNotEmpty) {
    headers.set('X-GMS-Account-Email', accountEmail);
  }
}

class _HttpOrderSyncService implements OrderSyncService {
  _HttpOrderSyncService({this.explicitBaseUrl});

  final String? explicitBaseUrl;
  final HttpClient _client = HttpClient()..connectionTimeout = _connectTimeout;

  /// Built per call so the backend URL that is already known to work (from
  /// any service) is tried first instead of hanging on dead candidates.
  Future<List<String>> _candidateBaseUrls() async {
    await resolveWorkingLocalApiBaseUrl();
    return _resolveCandidateBaseUrls(
      _buildBaseUrls(baseUrl: explicitBaseUrl),
      preferredBaseUrl: _preferredBaseUrl,
    );
  }

  void _rememberBaseUrl(String baseUrl) {
    _preferredBaseUrl = baseUrl;
    rememberWorkingLocalApiBaseUrl(baseUrl);
  }

  Future<List<Map<String, dynamic>>> _fetchOrdersFromBaseUrl(
    String baseUrl,
  ) async {
    try {
      final ordersUri = withAdminScopeUri(_buildApiUri(baseUrl, '/api/orders'));
      final request = await _client
          .getUrl(ordersUri)
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      _setAdminScopeHeader(request.headers);
      await _setAccountIdHeader(request.headers);

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      _rememberBaseUrl(baseUrl);
      return _decodeOrderItemsInBackground(responseBody);
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    } on ArgumentError catch (error) {
      throw _BaseUrlAttemptFailure(error.message ?? 'invalid URL');
    } on _BaseUrlAttemptFailure {
      rethrow;
    } catch (error) {
      throw _BaseUrlAttemptFailure(error.toString());
    }
  }

  Future<void> _replaceOrdersAtBaseUrl(
    String baseUrl,
    List<Map<String, dynamic>> orders,
  ) async {
    try {
      final ordersUri = withAdminScopeUri(_buildApiUri(baseUrl, '/api/orders'));
      final request = await _client
          .putUrl(ordersUri)
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers);
      await _setAccountIdHeader(request.headers);
      request.write(jsonEncode(withAdminScopePayload(<String, dynamic>{
        'orders': orders,
      })));

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure(
          _serverErrorMessage(response.statusCode, responseBody),
          reachedServer: true,
        );
      }

      _rememberBaseUrl(baseUrl);
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on ArgumentError catch (error) {
      throw _BaseUrlAttemptFailure(error.message ?? 'invalid URL');
    } on _BaseUrlAttemptFailure {
      rethrow;
    } catch (error) {
      throw _BaseUrlAttemptFailure(error.toString());
    }
  }

  Future<void> _upsertOrdersAtBaseUrl(
    String baseUrl,
    List<Map<String, dynamic>> orders,
  ) async {
    try {
      final ordersUri = withAdminScopeUri(_buildApiUri(baseUrl, '/api/orders'));
      final request = await _client
          .postUrl(ordersUri)
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers);
      await _setAccountIdHeader(request.headers);
      request.write(jsonEncode(withAdminScopePayload(<String, dynamic>{
        'orders': orders,
      })));

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok &&
          response.statusCode != HttpStatus.created) {
        throw _BaseUrlAttemptFailure(
          _serverErrorMessage(response.statusCode, responseBody),
          reachedServer: true,
        );
      }

      _rememberBaseUrl(baseUrl);
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on ArgumentError catch (error) {
      throw _BaseUrlAttemptFailure(error.message ?? 'invalid URL');
    } on _BaseUrlAttemptFailure {
      rethrow;
    } catch (error) {
      throw _BaseUrlAttemptFailure(error.toString());
    }
  }

  Future<void> _cancelOrderGroupAtBaseUrl(
    String baseUrl,
    int createdAtEpochMs,
  ) async {
    try {
      final ordersUri = withAdminScopeUri(_buildApiUri(
        baseUrl,
        '/api/orders/$createdAtEpochMs/cancel',
      ));
      final request = await _client
          .postUrl(ordersUri)
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers);
      await _setAccountIdHeader(request.headers);
      request.write(jsonEncode(withAdminScopePayload(<String, dynamic>{})));

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure(
          _serverErrorMessage(response.statusCode, responseBody),
          reachedServer: true,
        );
      }

      _rememberBaseUrl(baseUrl);
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on ArgumentError catch (error) {
      throw _BaseUrlAttemptFailure(error.message ?? 'invalid URL');
    } on _BaseUrlAttemptFailure {
      rethrow;
    } catch (error) {
      throw _BaseUrlAttemptFailure(error.toString());
    }
  }

  Future<String> _uploadReviewMediaToBaseUrl({
    required String baseUrl,
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) async {
    try {
      final uploadUri = _buildApiUri(baseUrl, '/api/review-uploads');
      final request = await _client
          .postUrl(uploadUri)
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, contentType);
      request.headers.set('x-file-name', fileName);
      request.add(bytes);

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      Map<String, dynamic> decoded = const <String, dynamic>{};
      if (responseBody.trim().isNotEmpty) {
        decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      }

      if (response.statusCode != HttpStatus.created &&
          response.statusCode != HttpStatus.ok) {
        final errorMessage = (decoded['message']?.toString() ?? '').trim();
        throw _BaseUrlAttemptFailure(
          errorMessage.isNotEmpty ? errorMessage : '${response.statusCode}',
          reachedServer: true,
        );
      }

      final mediaUrl = (decoded['mediaUrl']?.toString() ??
              decoded['imageUrl']?.toString() ??
              '')
          .trim();
      if (mediaUrl.isEmpty) {
        throw const _BaseUrlAttemptFailure('invalid upload response');
      }

      _rememberBaseUrl(baseUrl);
      if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        return mediaUrl;
      }

      return '$baseUrl$mediaUrl';
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    } on ArgumentError catch (error) {
      throw _BaseUrlAttemptFailure(error.message ?? 'invalid URL');
    } on _BaseUrlAttemptFailure {
      rethrow;
    } catch (error) {
      throw _BaseUrlAttemptFailure(error.toString());
    }
  }

  @override
  Future<List<Map<String, dynamic>>> fetchOrders() async {
    final candidateBaseUrls = await _candidateBaseUrls();
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _fetchOrdersFromBaseUrl(preferredBaseUrl);
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    final failures = <String>[];
    final completer = Completer<List<Map<String, dynamic>>>();
    var remaining = candidateBaseUrls.length;

    if (candidateBaseUrls.isEmpty) {
      throw const OrderSyncServiceException(
        'Backend order sync not connected. No usable backend URLs were found.',
      );
    }

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          OrderSyncServiceException(
            'Backend order sync not connected. Tried: ${candidateBaseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}. '
            'If you use a real phone, connect by USB then run: adb reverse tcp:8080 tcp:8080',
          ),
        );
      }
    }

    for (final baseUrl in candidateBaseUrls) {
      _fetchOrdersFromBaseUrl(baseUrl).then((orders) {
        if (!completer.isCompleted) {
          completer.complete(orders);
        }
      }).catchError((Object error) {
        final failure = error is _BaseUrlAttemptFailure
            ? error.message
            : 'unknown error';
        completeFailure(baseUrl, failure);
      });
    }

    return completer.future;
  }

  @override
  Future<void> replaceOrders(List<Map<String, dynamic>> orders) async {
    final candidateBaseUrls = await _candidateBaseUrls();
    final failures = <String>[];

    if (candidateBaseUrls.isEmpty) {
      throw const OrderSyncServiceException(
        'Unable to sync orders to the backend. No usable backend URLs were found.',
      );
    }

    for (final baseUrl in candidateBaseUrls) {
      try {
        await _replaceOrdersAtBaseUrl(baseUrl, orders);
        return;
      } on _BaseUrlAttemptFailure catch (error) {
        if (error.reachedServer) {
          throw OrderSyncServiceException(error.message);
        }
        failures.add('$baseUrl -> ${error.message}');
      }
    }

    throw OrderSyncServiceException(
      'Unable to sync orders to the backend. Tried: ${candidateBaseUrls.join(', ')}. '
      'Failed results: ${failures.join(' | ')}.',
    );
  }

  @override
  Future<void> upsertOrders(List<Map<String, dynamic>> orders) async {
    final candidateBaseUrls = await _candidateBaseUrls();
    final failures = <String>[];

    if (candidateBaseUrls.isEmpty) {
      throw const OrderSyncServiceException(
        'Unable to upsert orders to the backend. No usable backend URLs were found.',
      );
    }

    for (final baseUrl in candidateBaseUrls) {
      try {
        await _upsertOrdersAtBaseUrl(baseUrl, orders);
        return;
      } on _BaseUrlAttemptFailure catch (error) {
        if (error.reachedServer) {
          throw OrderSyncServiceException(error.message);
        }
        failures.add('$baseUrl -> ${error.message}');
      }
    }

    throw OrderSyncServiceException(
      'Unable to upsert orders to the backend. Tried: ${candidateBaseUrls.join(', ')}. '
      'Failed results: ${failures.join(' | ')}.',
    );
  }

  @override
  Future<void> cancelOrderGroup(int createdAtEpochMs) async {
    final candidateBaseUrls = await _candidateBaseUrls();
    final failures = <String>[];

    if (candidateBaseUrls.isEmpty) {
      throw const OrderSyncServiceException(
        'Unable to cancel order in the backend. No usable backend URLs were found.',
      );
    }

    for (final baseUrl in candidateBaseUrls) {
      try {
        await _cancelOrderGroupAtBaseUrl(baseUrl, createdAtEpochMs);
        return;
      } on _BaseUrlAttemptFailure catch (error) {
        if (error.reachedServer) {
          throw OrderSyncServiceException(error.message);
        }
        failures.add('$baseUrl -> ${error.message}');
      }
    }

    throw OrderSyncServiceException(
      'Unable to cancel order in the backend. Tried: ${candidateBaseUrls.join(', ')}. '
      'Failed results: ${failures.join(' | ')}.',
    );
  }

  @override
  Future<String> uploadReviewMedia({
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) async {
    final candidateBaseUrls = await _candidateBaseUrls();
    final failures = <String>[];

    if (candidateBaseUrls.isEmpty) {
      throw const OrderSyncServiceException(
        'Unable to upload review media. No usable backend URLs were found.',
      );
    }

    for (final baseUrl in candidateBaseUrls) {
      try {
        return await _uploadReviewMediaToBaseUrl(
          baseUrl: baseUrl,
          bytes: bytes,
          fileName: fileName,
          contentType: contentType,
        );
      } on _BaseUrlAttemptFailure catch (error) {
        if (error.reachedServer) {
          throw OrderSyncServiceException(error.message);
        }
        failures.add('$baseUrl -> ${error.message}');
      }
    }

    throw OrderSyncServiceException(
      'Unable to upload review media. Tried: ${candidateBaseUrls.join(', ')}. '
      'Failed results: ${failures.join(' | ')}.',
    );
  }
}

List<Map<String, dynamic>> _decodeOrderItems(String responseBody) {
  final decoded = jsonDecode(responseBody);
  final rawOrders = decoded is List<dynamic>
      ? decoded
      : decoded is Map<String, dynamic>
      ? (decoded['orders'] as List<dynamic>? ?? const <dynamic>[])
      : const <dynamic>[];

  return rawOrders
      .whereType<Map>()
      .map((entry) => Map<String, dynamic>.from(entry))
      .toList(growable: false);
}

class OrderSyncServiceException implements Exception {
  const OrderSyncServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message, {this.reachedServer = false});

  final String message;

  /// The backend answered (with an error), so other URLs won't do better.
  final bool reachedServer;
}
