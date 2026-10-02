import 'dart:async';
import 'dart:convert';
import 'dart:html';

import 'package:switch_app/services/ai_assistant_transport_base.dart';
import 'package:switch_app/utils/auth_session.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 40);
String? _preferredBaseUrl;

AiAssistantTransport createAiAssistantTransport() => _WebAiAssistantTransport();

List<String> _baseUrls() {
  final urls = <String>[];
  void add(String? value) {
    var trimmed = (value ?? '').trim();
    while (trimmed.endsWith('/')) {
      trimmed = trimmed.substring(0, trimmed.length - 1);
    }
    if (trimmed.isNotEmpty && !urls.contains(trimmed)) urls.add(trimmed);
  }

  add(_preferredBaseUrl);
  for (final part in _environmentBaseUrl.split(RegExp(r'[,;\s]+'))) {
    add(part);
  }
  add(window.location.origin);
  add('http://127.0.0.1:8080');
  add('http://localhost:8080');
  return urls;
}

Map<String, dynamic> _decode(String? text) {
  if (text == null || text.isEmpty) return const <String, dynamic>{};
  final decoded = jsonDecode(text);
  return decoded is Map ? Map<String, dynamic>.from(decoded) : const <String, dynamic>{};
}

class _WebAiAssistantTransport implements AiAssistantTransport {
  @override
  Future<AiAssistantHttpResult> send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final token = (await AuthSession.getSessionToken())?.trim() ?? '';
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (token.isNotEmpty) 'X-Switch-Session': token,
    };

    for (final baseUrl in _baseUrls()) {
      try {
        final xhr = await HttpRequest.request(
          '$baseUrl$path',
          method: method,
          requestHeaders: headers,
          sendData: body == null ? null : jsonEncode(body),
          withCredentials: baseUrl == window.location.origin,
        ).timeout(_requestTimeout);
        _preferredBaseUrl = baseUrl;
        return AiAssistantHttpResult(xhr.status ?? 0, _decode(xhr.responseText));
      } on TimeoutException {
        // The request may already have been processed; don't resend it elsewhere.
        throw const AiAssistantTransportException(
          'The assistant is taking too long. Please try again.',
        );
      } on FormatException {
        throw const AiAssistantTransportException(
          'The server returned an invalid response.',
        );
      } catch (error) {
        // dart:html rejects non-2xx responses with the XHR as the event target.
        final target = error is ProgressEvent ? error.target : null;
        if (target is HttpRequest && (target.status ?? 0) > 0) {
          _preferredBaseUrl = baseUrl;
          return AiAssistantHttpResult(target.status!, _decode(target.responseText));
        }
      }
    }

    throw const AiAssistantTransportException(
      'Cannot reach Switch right now. Check your connection and try again.',
    );
  }
}
