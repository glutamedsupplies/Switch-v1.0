import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/chat_support_realtime_types.dart';
import 'package:gms_shopping/services/local_api_base_urls.dart';

class ChatSupportRealtimeListenerImpl implements ChatSupportRealtimeListener {
  ChatSupportRealtimeListenerImpl(this.onChatUpdate);

  final void Function() onChatUpdate;

  String? _activeCustomerId;
  String? _activeAdminId;
  int _connectionGeneration = 0;
  Timer? _reconnectTimer;
  String? _preferredBaseUrl;
  HttpClient? _activeClient;

  @override
  void start({
    required String customerId,
    required String adminId,
  }) {
    final normalizedCustomerId = customerId.trim().toLowerCase();
    final normalizedAdminId = adminId.trim();
    if (normalizedCustomerId.isEmpty || normalizedAdminId.isEmpty) {
      return;
    }

    _activeCustomerId = normalizedCustomerId;
    _activeAdminId = normalizedAdminId;
    _connectionGeneration += 1;
    _reconnectTimer?.cancel();
    unawaited(_connect(_connectionGeneration));
  }

  @override
  void stop() {
    _connectionGeneration += 1;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _activeCustomerId = null;
    _activeAdminId = null;
    _activeClient?.close(force: true);
    _activeClient = null;
  }

  Future<void> _connect(int generation) async {
    if (generation != _connectionGeneration) {
      return;
    }

    final customerId = _activeCustomerId;
    final adminId = _activeAdminId;
    if (customerId == null || adminId == null) {
      return;
    }

    final baseUrls = _preferredBaseUrl == null
        ? buildLocalApiBaseUrls(isAndroid: Platform.isAndroid)
        : <String>[_preferredBaseUrl!, ...buildLocalApiBaseUrls(isAndroid: Platform.isAndroid)]
            .where((url) => url.trim().isNotEmpty)
            .toSet()
            .toList();

    for (final baseUrl in baseUrls) {
      if (generation != _connectionGeneration) {
        return;
      }

      try {
        final client = HttpClient();
        _activeClient?.close(force: true);
        _activeClient = client;
        final uri = Uri.parse('$baseUrl/api/chat-support/events').replace(
          queryParameters: <String, String>{
            'customerId': customerId,
            'adminId': adminId,
          },
        );
        final request = await client.getUrl(uri).timeout(
          const Duration(seconds: 12),
        );
        request.headers.set(HttpHeaders.acceptHeader, 'text/event-stream');
        final response = await request.close().timeout(
          const Duration(seconds: 12),
        );
        if (response.statusCode != HttpStatus.ok) {
          continue;
        }

        _preferredBaseUrl = baseUrl;
        var buffer = '';
        await for (final chunk in response.transform(utf8.decoder)) {
          if (generation != _connectionGeneration) {
            return;
          }
          buffer += chunk.replaceAll('\r\n', '\n');
          var separatorIndex = buffer.indexOf('\n\n');
          while (separatorIndex >= 0) {
            final block = buffer.substring(0, separatorIndex);
            buffer = buffer.substring(separatorIndex + 2);
            _handleEventBlock(block);
            separatorIndex = buffer.indexOf('\n\n');
          }
        }
      } on Object {
        // Try the next base URL or reconnect shortly.
      }
    }

    if (generation != _connectionGeneration) {
      return;
    }

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 2), () {
      unawaited(_connect(generation));
    });
  }

  void _handleEventBlock(String block) {
    final dataLines = <String>[];
    var eventName = 'message';

    for (final rawLine in block.split('\n')) {
      final line = rawLine.trimRight();
      if (line.isEmpty || line.startsWith(':')) {
        continue;
      }
      final separatorIndex = line.indexOf(':');
      final field = separatorIndex >= 0 ? line.substring(0, separatorIndex) : line;
      final value = separatorIndex >= 0
          ? line.substring(separatorIndex + 1).replaceFirst(' ', '')
          : '';
      if (field == 'event') {
        eventName = value.isEmpty ? 'message' : value;
      } else if (field == 'data') {
        dataLines.add(value);
      }
    }

    if (dataLines.isEmpty) {
      return;
    }

    try {
      final payload = jsonDecode(dataLines.join('\n'));
      if (payload is! Map<String, dynamic>) {
        return;
      }
      if (eventName == 'ready' || payload['type'] == 'ready') {
        return;
      }
      final topics = payload['topics'];
      if (topics is List &&
          topics.any((topic) => topic.toString().toLowerCase() == 'chat')) {
        onChatUpdate();
      }
    } on Object {
      // Ignore malformed realtime payloads.
    }
  }
}

ChatSupportRealtimeListener createChatSupportRealtimeListener(
  void Function() onChatUpdate,
) {
  return ChatSupportRealtimeListenerImpl(onChatUpdate);
}
