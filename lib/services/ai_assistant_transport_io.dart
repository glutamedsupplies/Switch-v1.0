import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/ai_assistant_transport_base.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 40);

AiAssistantTransport createAiAssistantTransport() => _IoAiAssistantTransport();

class _IoAiAssistantTransport implements AiAssistantTransport {
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 6);

  @override
  Future<AiAssistantHttpResult> send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = (await AuthSession.getSessionToken())?.trim() ?? '';
    final payload = body == null ? null : jsonEncode(body);
    final baseUrls = buildLocalApiBaseUrls(isAndroid: Platform.isAndroid);

    for (final baseUrl in baseUrls) {
      final HttpClientRequest request;
      try {
        request = await _client.openUrl(method, Uri.parse('$baseUrl$path'));
      } on SocketException {
        continue;
      } on HttpException {
        continue;
      }
      try {
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        if (token.isNotEmpty) {
          request.headers.set('X-Switch-Session', token);
        }
        if (payload != null) {
          request.headers.contentType = ContentType.json;
          request.write(payload);
        }
        final response = await request.close().timeout(_requestTimeout);
        final text = await response.transform(utf8.decoder).join();
        rememberWorkingLocalApiBaseUrl(baseUrl);
        final decoded = text.isEmpty ? null : jsonDecode(text);
        return AiAssistantHttpResult(
          response.statusCode,
          decoded is Map<String, dynamic>
              ? decoded
              : decoded is Map
                  ? Map<String, dynamic>.from(decoded)
                  : const <String, dynamic>{},
        );
      } on SocketException {
        if (method != 'GET') {
          throw const AiAssistantTransportException(
            'The connection dropped. Please try again.',
          );
        }
      } on TimeoutException {
        // The request may already have been processed; don't resend it elsewhere.
        throw const AiAssistantTransportException(
          'The assistant is taking too long. Please try again.',
        );
      } on FormatException {
        throw const AiAssistantTransportException(
          'The server returned an invalid response.',
        );
      }
    }

    throw const AiAssistantTransportException(
      'Cannot reach Switch right now. Check your connection and try again.',
    );
  }
}
