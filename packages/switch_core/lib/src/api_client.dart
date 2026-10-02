import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

/// Error returned by the Switch backend (`{ message, code, ...extras }`).
class SwitchApiException implements Exception {
  SwitchApiException({
    required this.statusCode,
    required this.code,
    required this.message,
    this.details = const <String, dynamic>{},
  });

  final int statusCode;
  final String code;
  final String message;
  final Map<String, dynamic> details;

  bool get isUnauthorized => statusCode == 401;
  bool get isNetworkError => statusCode == 0;

  @override
  String toString() => message;
}

typedef SessionTokenReader = String? Function();
typedef UnauthorizedHandler = void Function(SwitchApiException error);

/// Minimal JSON client for the Switch backend.
///
/// Sessions are sent in the `X-Switch-Session` header; the backend decides
/// which routes a token's role may reach.
class SwitchApiClient {
  SwitchApiClient({
    required this.baseUrl,
    this.readSessionToken,
    this.onUnauthorized,
    http.Client? httpClient,
    this.timeout = const Duration(seconds: 20),
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;
  final SessionTokenReader? readSessionToken;
  final UnauthorizedHandler? onUnauthorized;
  final Duration timeout;
  final http.Client _http;

  Uri uri(String path, [Map<String, String?>? query]) {
    final cleaned = <String, String>{};
    query?.forEach((key, value) {
      if (value != null && value.isNotEmpty) cleaned[key] = value;
    });
    return Uri.parse('$baseUrl$path').replace(queryParameters: cleaned.isEmpty ? null : cleaned);
  }

  Map<String, String> headers({String? contentType}) {
    final token = readSessionToken?.call();
    return <String, String>{
      'Accept': 'application/json',
      'Content-Type': ?contentType,
      if (token != null && token.isNotEmpty) 'X-Switch-Session': token,
    };
  }

  Future<Map<String, dynamic>> getJson(String path, {Map<String, String?>? query}) {
    return _send(() => _http.get(uri(path, query), headers: headers()));
  }

  Future<Map<String, dynamic>> postJson(String path, [Map<String, dynamic>? body]) {
    return _send(
      () => _http.post(
        uri(path),
        headers: headers(contentType: 'application/json'),
        body: jsonEncode(body ?? const <String, dynamic>{}),
      ),
    );
  }

  Future<Map<String, dynamic>> patchJson(String path, Map<String, dynamic> body) {
    return _send(
      () => _http.patch(uri(path), headers: headers(contentType: 'application/json'), body: jsonEncode(body)),
    );
  }

  Future<Map<String, dynamic>> putJson(String path, Map<String, dynamic> body) {
    return _send(
      () => _http.put(uri(path), headers: headers(contentType: 'application/json'), body: jsonEncode(body)),
    );
  }

  Future<Map<String, dynamic>> deleteJson(String path) {
    return _send(() => _http.delete(uri(path), headers: headers()));
  }

  /// Uploads raw bytes (the backend reads the request body as the file).
  Future<Map<String, dynamic>> postBytes(
    String path,
    Uint8List bytes, {
    required String contentType,
    Map<String, String?>? query,
  }) {
    return _send(
      () => _http.post(uri(path, query), headers: headers(contentType: contentType), body: bytes),
      timeoutOverride: const Duration(seconds: 90),
    );
  }

  Future<Map<String, dynamic>> _send(
    Future<http.Response> Function() request, {
    Duration? timeoutOverride,
  }) async {
    http.Response response;
    try {
      response = await request().timeout(timeoutOverride ?? timeout);
    } on TimeoutException {
      throw SwitchApiException(
        statusCode: 0,
        code: 'NETWORK_TIMEOUT',
        message: 'The server took too long to respond. Check your connection and try again.',
      );
    } catch (_) {
      throw SwitchApiException(
        statusCode: 0,
        code: 'NETWORK_ERROR',
        message: 'Unable to reach Switch. Check your internet connection.',
      );
    }

    Map<String, dynamic> body = const <String, dynamic>{};
    if (response.bodyBytes.isNotEmpty) {
      try {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        if (decoded is Map<String, dynamic>) body = decoded;
      } catch (_) {
        body = const <String, dynamic>{};
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) return body;

    final error = SwitchApiException(
      statusCode: response.statusCode,
      code: (body['code'] ?? 'HTTP_${response.statusCode}').toString(),
      message: (body['message'] ?? 'Request failed (${response.statusCode}).').toString(),
      details: body,
    );
    if (error.isUnauthorized) onUnauthorized?.call(error);
    throw error;
  }

  void close() => _http.close();
}
