import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/admin_scope.dart';
import 'package:gms_shopping/services/chat_support_sync_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _defaultDesktopBaseUrl = 'http://127.0.0.1:8080';
const _defaultAndroidEmulatorBaseUrl = 'http://10.0.2.2:8080';
const _defaultAndroidUsbBaseUrl = 'http://127.0.0.1:8080';
const _defaultCurrentWifiBaseUrl = 'http://192.168.100.225:8080';
const _requestTimeout = Duration(seconds: 3);
String? _preferredBaseUrl;

ChatSupportSyncService createChatSupportSyncService({String? baseUrl}) {
  return _HttpChatSupportSyncService(
    baseUrls: _buildBaseUrls(baseUrl: baseUrl),
  );
}

List<String> _buildBaseUrls({String? baseUrl}) {
  final urls = <String>[];

  void addUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty || urls.contains(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  addUrl(baseUrl);
  addUrl(_environmentBaseUrl);

  if (Platform.isAndroid) {
    addUrl(_defaultAndroidEmulatorBaseUrl);
    addUrl(_defaultAndroidUsbBaseUrl);
    addUrl(_defaultCurrentWifiBaseUrl);
    addUrl('http://localhost:8080');
  } else {
    addUrl(_defaultDesktopBaseUrl);
    addUrl('http://localhost:8080');
  }

  return urls;
}

String _resolveChatScopeAdminId(String adminId) {
  final scopedAdminId = adminId.trim();
  if (scopedAdminId.isNotEmpty) {
    return scopedAdminId;
  }
  return activeAdminId;
}

void _setAdminScopeHeader(HttpHeaders headers, {String adminId = ''}) {
  final resolvedAdminId = _resolveChatScopeAdminId(adminId);
  if (resolvedAdminId.isNotEmpty) {
    headers.set('X-GMS-Admin-ID', resolvedAdminId);
  }
}

Uri _withChatAdminScopeUri(Uri uri, {String adminId = ''}) {
  final resolvedAdminId = _resolveChatScopeAdminId(adminId);
  if (resolvedAdminId.isEmpty || uri.queryParameters.containsKey('adminId')) {
    return uri;
  }
  return uri.replace(
    queryParameters: <String, String>{
      ...uri.queryParameters,
      'adminId': resolvedAdminId,
    },
  );
}

Map<String, dynamic> _withChatAdminScopePayload(
  Map<String, dynamic> payload, {
  String adminId = '',
}) {
  final resolvedAdminId = _resolveChatScopeAdminId(adminId);
  if (resolvedAdminId.isEmpty || payload.containsKey('adminId')) {
    return payload;
  }
  return <String, dynamic>{
    ...payload,
    'adminId': resolvedAdminId,
  };
}

class _HttpChatSupportSyncService implements ChatSupportSyncService {
  _HttpChatSupportSyncService({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  final HttpClient _client = HttpClient();

  String _resolveChatMediaUrl(String baseUrl, Object? rawUrl) {
    final normalizedUrl = rawUrl?.toString().trim() ?? '';
    if (normalizedUrl.isEmpty) {
      return '';
    }

    if (normalizedUrl.startsWith('http://') ||
        normalizedUrl.startsWith('https://')) {
      return normalizedUrl;
    }

    return '$baseUrl$normalizedUrl';
  }

  Map<String, dynamic> _normalizeThreadMediaUrls({
    required String baseUrl,
    required Map<String, dynamic> thread,
  }) {
    final normalizedThread = Map<String, dynamic>.from(thread);
    final rawMessages = normalizedThread['messages'];
    if (rawMessages is List) {
      normalizedThread['messages'] = rawMessages.map((message) {
        if (message is! Map) {
          return message;
        }
        final normalizedMessage = Map<String, dynamic>.from(
          message.cast<Object?, Object?>(),
        );
        normalizedMessage['imageUrl'] = _resolveChatMediaUrl(
          baseUrl,
          normalizedMessage['imageUrl'],
        );
        return normalizedMessage;
      }).toList(growable: false);
    }

    return normalizedThread;
  }

  Future<List<Map<String, dynamic>>> _fetchThreadsFromBaseUrl({
    required String baseUrl,
    required String customerId,
    String adminId = '',
  }) async {
    try {
      final uri = _withChatAdminScopeUri(Uri.parse(
        '$baseUrl/api/chat-support?customerId=${Uri.encodeQueryComponent(customerId)}',
      ), adminId: adminId);
      final request = await _client.getUrl(uri).timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final items = (decoded['threads'] as List<dynamic>? ?? const <dynamic>[]);
      _preferredBaseUrl = baseUrl;

      return items
          .whereType<Map<String, dynamic>>()
          .map(
            (item) => _normalizeThreadMediaUrls(
              baseUrl: baseUrl,
              thread: Map<String, dynamic>.from(item),
            ),
          )
          .toList(growable: false);
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<Map<String, dynamic>?> _fetchThreadFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
  }) async {
    try {
      final uri = _withChatAdminScopeUri(Uri.parse(
        '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}',
      ), adminId: adminId);
      final request = await _client.getUrl(uri).timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode == HttpStatus.notFound) {
        _preferredBaseUrl = baseUrl;
        return null;
      }

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final thread = decoded['thread'];
      if (thread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(thread),
      );
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<Map<String, dynamic>> _requestAiReplyFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
  }) async {
    try {
      final request = await _client
          .postUrl(
            _withChatAdminScopeUri(Uri.parse(
              '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/ai-reply',
            ), adminId: adminId),
          )
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);
      request.write(jsonEncode(_withChatAdminScopePayload(
        <String, dynamic>{},
        adminId: adminId,
      )));

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        final decodedError =
            responseBody.trim().isEmpty ? null : jsonDecode(responseBody);
        final errorMessage =
            decodedError is Map<String, dynamic>
                ? decodedError['message']?.toString().trim()
                : null;
        throw _BaseUrlAttemptFailure(
          errorMessage?.isNotEmpty == true
              ? errorMessage!
              : '${response.statusCode}',
        );
      }

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final thread = decoded['thread'];
      if (thread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(thread),
      );
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<Map<String, dynamic>> _syncThreadToBaseUrl({
    required String baseUrl,
    required Map<String, dynamic> thread,
    String adminId = '',
  }) async {
    try {
      final request = await _client
          .postUrl(_withChatAdminScopeUri(
            Uri.parse('$baseUrl/api/chat-support'),
            adminId: adminId,
          ))
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);
      request.write(
        jsonEncode(_withChatAdminScopePayload(
          <String, dynamic>{'thread': thread},
          adminId: adminId,
        )),
      );

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final syncedThread = decoded['thread'];
      if (syncedThread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(syncedThread),
      );
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<Map<String, dynamic>> _editMessageFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
    required String messageId,
    required String text,
  }) async {
    try {
      final request = await _client
          .postUrl(
            _withChatAdminScopeUri(Uri.parse(
              '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/edit-message',
            ), adminId: adminId),
          )
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);
      request.write(
        jsonEncode(_withChatAdminScopePayload(<String, dynamic>{
          'messageId': messageId,
          'text': text,
        }, adminId: adminId)),
      );

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      if (response.statusCode != HttpStatus.ok) {
        final errorMessage = (decoded['message']?.toString() ?? '').trim();
        throw _BaseUrlAttemptFailure(
          errorMessage.isNotEmpty ? errorMessage : '${response.statusCode}',
        );
      }

      final updatedThread = decoded['thread'];
      if (updatedThread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(updatedThread),
      );
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<Map<String, dynamic>> _deleteMessageFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
    required String messageId,
    String? customerId,
  }) async {
    try {
      final request = await _client
          .postUrl(
            _withChatAdminScopeUri(Uri.parse(
              '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/delete-message',
            ), adminId: adminId),
          )
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);
      request.write(
        jsonEncode(_withChatAdminScopePayload(<String, dynamic>{
          'messageId': messageId,
          if ((customerId ?? '').trim().isNotEmpty) 'customerId': customerId!.trim(),
        }, adminId: adminId)),
      );

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      if (response.statusCode != HttpStatus.ok) {
        final errorMessage = (decoded['message']?.toString() ?? '').trim();
        throw _BaseUrlAttemptFailure(
          errorMessage.isNotEmpty ? errorMessage : '${response.statusCode}',
        );
      }

      final updatedThread = decoded['thread'];
      if (updatedThread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(updatedThread),
      );
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<Map<String, dynamic>?> _updateTypingFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
    required String actor,
    required bool isTyping,
    bool? isOnline,
    String? displayName,
    String? avatarUrl,
    Map<String, dynamic>? thread,
  }) async {
    try {
      final request = await _client
          .postUrl(
            _withChatAdminScopeUri(Uri.parse(
              '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/typing',
            ), adminId: adminId),
          )
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);
      request.write(
        jsonEncode(_withChatAdminScopePayload(<String, dynamic>{
          'actor': actor,
          'isTyping': isTyping,
          'isOnline': ?isOnline,
          if ((displayName ?? '').trim().isNotEmpty)
            'displayName': displayName!.trim(),
          if ((avatarUrl ?? '').trim().isNotEmpty) 'avatarUrl': avatarUrl!.trim(),
          'thread': ?thread,
        }, adminId: adminId)),
      );

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode == HttpStatus.notFound) {
        _preferredBaseUrl = baseUrl;
        return null;
      }

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final updatedThread = decoded['thread'];
      if (updatedThread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(updatedThread),
      );
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<String> _uploadChatMediaToBaseUrl({
    required String baseUrl,
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) async {
    try {
      final request = await _client
          .postUrl(Uri.parse('$baseUrl/api/uploads'))
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
        );
      }

      final imageUrl = (decoded['imageUrl']?.toString() ?? '').trim();
      if (imageUrl.isEmpty) {
        throw const _BaseUrlAttemptFailure('invalid upload response');
      }

      _preferredBaseUrl = baseUrl;
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      return '$baseUrl$imageUrl';
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<void> _deleteThreadFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
  }) async {
    try {
      final request = await _client
          .deleteUrl(
            _withChatAdminScopeUri(Uri.parse(
              '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}',
            ), adminId: adminId),
          )
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      _setAdminScopeHeader(request.headers, adminId: adminId);

      final response = await request.close().timeout(_requestTimeout);
      await response.transform(utf8.decoder).join().timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      _preferredBaseUrl = baseUrl;
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<T> _runWithFallbacks<T>({
    required Future<T> Function(String baseUrl) run,
    required String errorPrefix,
  }) {
    final failures = <String>[];
    final completer = Completer<T>();
    var remaining = baseUrls.length;

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          ChatSupportSyncException(
            '$errorPrefix Tried: ${baseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}.',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      run(baseUrl).then((result) {
        if (!completer.isCompleted) {
          completer.complete(result);
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
  Future<List<Map<String, dynamic>>> fetchThreads({
    required String customerId,
    String adminId = '',
  }) async {
    if (customerId.trim().isEmpty) {
      return const <Map<String, dynamic>>[];
    }

    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _fetchThreadsFromBaseUrl(
          baseUrl: preferredBaseUrl,
          customerId: customerId,
          adminId: adminId,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<List<Map<String, dynamic>>>(
      run: (baseUrl) => _fetchThreadsFromBaseUrl(
        baseUrl: baseUrl,
        customerId: customerId,
        adminId: adminId,
      ),
      errorPrefix: 'Could not fetch chat support threads.',
    );
  }

  @override
  Future<Map<String, dynamic>?> fetchThread({
    required String threadId,
    String adminId = '',
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _fetchThreadFromBaseUrl(
          baseUrl: preferredBaseUrl,
          threadId: threadId,
          adminId: adminId,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<Map<String, dynamic>?>(
      run: (baseUrl) => _fetchThreadFromBaseUrl(
        baseUrl: baseUrl,
        threadId: threadId,
        adminId: adminId,
      ),
      errorPrefix: 'Could not fetch chat support thread.',
    );
  }

  @override
  Future<Map<String, dynamic>> requestAiReply({
    required String threadId,
    String adminId = '',
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _requestAiReplyFromBaseUrl(
          baseUrl: preferredBaseUrl,
          threadId: threadId,
          adminId: adminId,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<Map<String, dynamic>>(
      run: (baseUrl) => _requestAiReplyFromBaseUrl(
        baseUrl: baseUrl,
        threadId: threadId,
        adminId: adminId,
      ),
      errorPrefix: 'Could not request chat AI reply.',
    );
  }

  @override
  Future<Map<String, dynamic>> syncThread(
    Map<String, dynamic> thread, {
    String adminId = '',
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _syncThreadToBaseUrl(
          baseUrl: preferredBaseUrl,
          thread: thread,
          adminId: adminId,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<Map<String, dynamic>>(
      run: (baseUrl) => _syncThreadToBaseUrl(
        baseUrl: baseUrl,
        thread: thread,
        adminId: adminId,
      ),
      errorPrefix: 'Could not sync chat support thread.',
    );
  }

  @override
  Future<Map<String, dynamic>> editMessage({
    required String threadId,
    String adminId = '',
    required String messageId,
    required String text,
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _editMessageFromBaseUrl(
          baseUrl: preferredBaseUrl,
          threadId: threadId,
          adminId: adminId,
          messageId: messageId,
          text: text,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<Map<String, dynamic>>(
      run: (baseUrl) => _editMessageFromBaseUrl(
        baseUrl: baseUrl,
        threadId: threadId,
        adminId: adminId,
        messageId: messageId,
        text: text,
      ),
      errorPrefix: 'Could not edit chat message.',
    );
  }

  @override
  Future<Map<String, dynamic>> deleteMessage({
    required String threadId,
    String adminId = '',
    required String messageId,
    String? customerId,
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _deleteMessageFromBaseUrl(
          baseUrl: preferredBaseUrl,
          threadId: threadId,
          adminId: adminId,
          messageId: messageId,
          customerId: customerId,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<Map<String, dynamic>>(
      run: (baseUrl) => _deleteMessageFromBaseUrl(
        baseUrl: baseUrl,
        threadId: threadId,
        adminId: adminId,
        messageId: messageId,
        customerId: customerId,
      ),
      errorPrefix: 'Could not delete chat message.',
    );
  }

  @override
  Future<Map<String, dynamic>?> updateTyping({
    required String threadId,
    String adminId = '',
    required String actor,
    required bool isTyping,
    bool? isOnline,
    String? displayName,
    String? avatarUrl,
    Map<String, dynamic>? thread,
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _updateTypingFromBaseUrl(
          baseUrl: preferredBaseUrl,
          threadId: threadId,
          adminId: adminId,
          actor: actor,
          isTyping: isTyping,
          isOnline: isOnline,
          displayName: displayName,
          avatarUrl: avatarUrl,
          thread: thread,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<Map<String, dynamic>?>(
      run: (baseUrl) => _updateTypingFromBaseUrl(
        baseUrl: baseUrl,
        threadId: threadId,
        adminId: adminId,
        actor: actor,
        isTyping: isTyping,
        isOnline: isOnline,
        displayName: displayName,
        avatarUrl: avatarUrl,
        thread: thread,
      ),
      errorPrefix: 'Could not update chat typing state.',
    );
  }

  @override
  Future<String> uploadChatMedia({
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _uploadChatMediaToBaseUrl(
          baseUrl: preferredBaseUrl,
          bytes: bytes,
          fileName: fileName,
          contentType: contentType,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _runWithFallbacks<String>(
      run: (baseUrl) => _uploadChatMediaToBaseUrl(
        baseUrl: baseUrl,
        bytes: bytes,
        fileName: fileName,
        contentType: contentType,
      ),
      errorPrefix: 'Could not upload chat media.',
    );
  }

  @override
  Future<void> deleteThread(String threadId, {String adminId = ''}) async {
    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        await _deleteThreadFromBaseUrl(
          baseUrl: preferredBaseUrl,
          threadId: threadId,
          adminId: adminId,
        );
        return;
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    await _runWithFallbacks<void>(
      run: (baseUrl) => _deleteThreadFromBaseUrl(
        baseUrl: baseUrl,
        threadId: threadId,
        adminId: adminId,
      ),
      errorPrefix: 'Could not delete chat support thread.',
    );
  }
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message);

  final String message;
}
