import 'dart:async';
import 'dart:convert';
import 'dart:html';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show compute;
import 'package:switch_app/services/admin_scope.dart';
import 'package:switch_app/services/order_sync_base.dart';
import 'package:switch_app/utils/auth_session.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 10);
String? _preferredBaseUrl;

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

String _buildApiUrl(String baseUrl, String apiPath) {
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

  final normalizedApiPath = apiPath.trim().startsWith('/')
      ? apiPath.trim().substring(1)
      : apiPath.trim();
  return parsedBaseUri.resolve(normalizedApiPath).toString();
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
  return _WebOrderSyncService(
    baseUrls: _buildBaseUrls(baseUrl: baseUrl),
  );
}

List<String> _buildBaseUrls({String? baseUrl}) {
  final urls = <String>[];

  void addUrl(String? value) {
    final trimmed = _normalizeBaseUrl(value ?? '');
    if (trimmed.isEmpty || urls.contains(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  addUrl(baseUrl);
  addUrl(_environmentBaseUrl);
  addUrl(window.location.origin);
  addUrl('http://127.0.0.1:8080');
  addUrl('http://localhost:8080');

  return urls;
}

Future<Map<String, String>> _withOrderAccountHeaders(
  Map<String, String> headers,
) async {
  final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
  final accountEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
  final requestAccountId = accountId.isNotEmpty ? accountId : accountEmail;
  final scopedHeaders = withAdminScopeHeaders(headers);

  return <String, String>{
    ...scopedHeaders,
    if (requestAccountId.isNotEmpty) 'X-GMS-Account-ID': requestAccountId,
    if (accountEmail.isNotEmpty) 'X-GMS-Account-Email': accountEmail,
  };
}

class _WebOrderSyncService implements OrderSyncService {
  _WebOrderSyncService({
    required this.baseUrls,
  });

  final List<String> baseUrls;

  Future<List<Map<String, dynamic>>> _fetchOrdersFromBaseUrl(
    String baseUrl,
  ) async {
    try {
      final ordersUrl = withAdminScopeUrl(_buildApiUrl(baseUrl, '/api/orders'));
      final response = await HttpRequest.request(
        ordersUrl,
        method: 'GET',
        requestHeaders: await _withOrderAccountHeaders(const {
          'Accept': 'application/json',
        }),
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      _preferredBaseUrl = baseUrl;
      return _decodeOrderItemsInBackground(response.responseText ?? '{}');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<void> _replaceOrdersAtBaseUrl(
    String baseUrl,
    List<Map<String, dynamic>> orders,
  ) async {
    try {
      final ordersUrl = withAdminScopeUrl(_buildApiUrl(baseUrl, '/api/orders'));
      final response = await HttpRequest.request(
        ordersUrl,
        method: 'PUT',
        sendData: jsonEncode(withAdminScopePayload(<String, dynamic>{
          'orders': orders,
        })),
        requestHeaders: await _withOrderAccountHeaders(const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }),
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      _preferredBaseUrl = baseUrl;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<void> _upsertOrdersAtBaseUrl(
    String baseUrl,
    List<Map<String, dynamic>> orders,
  ) async {
    try {
      final ordersUrl = withAdminScopeUrl(_buildApiUrl(baseUrl, '/api/orders'));
      final response = await HttpRequest.request(
        ordersUrl,
        method: 'POST',
        sendData: jsonEncode(withAdminScopePayload(<String, dynamic>{
          'orders': orders,
        })),
        requestHeaders: await _withOrderAccountHeaders(const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }),
      ).timeout(_requestTimeout);

      if (response.status != 200 && response.status != 201) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      _preferredBaseUrl = baseUrl;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<void> _cancelOrderGroupAtBaseUrl(
    String baseUrl,
    int createdAtEpochMs,
  ) async {
    try {
      final ordersUrl = withAdminScopeUrl(_buildApiUrl(
        baseUrl,
        '/api/orders/$createdAtEpochMs/cancel',
      ));
      final response = await HttpRequest.request(
        ordersUrl,
        method: 'POST',
        sendData: jsonEncode(withAdminScopePayload(<String, dynamic>{})),
        requestHeaders: await _withOrderAccountHeaders(const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }),
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      _preferredBaseUrl = baseUrl;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<String> _uploadReviewMediaToBaseUrl({
    required String baseUrl,
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) async {
    try {
      final response = await HttpRequest.request(
        _buildApiUrl(baseUrl, '/api/review-uploads'),
        method: 'POST',
        requestHeaders: <String, String>{
          'Accept': 'application/json',
          'Content-Type': contentType,
          'x-file-name': fileName,
        },
        sendData: Uint8List.fromList(bytes).buffer,
      ).timeout(_requestTimeout);

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;

      if (response.status != 201 && response.status != 200) {
        final errorMessage = (decoded['message']?.toString() ?? '').trim();
        throw _BaseUrlAttemptFailure(
          errorMessage.isNotEmpty ? errorMessage : '${response.status}',
        );
      }

      final mediaUrl = (decoded['mediaUrl']?.toString() ??
              decoded['imageUrl']?.toString() ??
              '')
          .trim();
      if (mediaUrl.isEmpty) {
        throw const _BaseUrlAttemptFailure('invalid upload response');
      }

      _preferredBaseUrl = baseUrl;
      if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        return mediaUrl;
      }

      return '$baseUrl$mediaUrl';
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  @override
  Future<List<Map<String, dynamic>>> fetchOrders() async {
    final preferredBaseUrl = _preferredBaseUrl;
    final candidateBaseUrls = _resolveCandidateBaseUrls(
      baseUrls,
      preferredBaseUrl: preferredBaseUrl,
    );

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
        'Could not connect to backend orders. No usable backend URLs were found.',
      );
    }

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          OrderSyncServiceException(
            'Could not connect to backend orders. Tried: ${candidateBaseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}. Make sure backend/server.js is running.',
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
    final candidateBaseUrls = _resolveCandidateBaseUrls(
      baseUrls,
      preferredBaseUrl: _preferredBaseUrl,
    );
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
    final candidateBaseUrls = _resolveCandidateBaseUrls(
      baseUrls,
      preferredBaseUrl: _preferredBaseUrl,
    );
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
    final candidateBaseUrls = _resolveCandidateBaseUrls(
      baseUrls,
      preferredBaseUrl: _preferredBaseUrl,
    );
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
    final candidateBaseUrls = _resolveCandidateBaseUrls(
      baseUrls,
      preferredBaseUrl: _preferredBaseUrl,
    );
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
  const _BaseUrlAttemptFailure(this.message);

  final String message;
}
