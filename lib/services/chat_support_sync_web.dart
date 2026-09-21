import 'dart:async';
import 'dart:convert';
import 'dart:html';
import 'dart:typed_data';

import 'package:switch_app/services/admin_scope.dart';
import 'package:switch_app/services/chat_support_sync_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 3);
String? _preferredBaseUrl;

ChatSupportSyncService createChatSupportSyncService({String? baseUrl}) {
  return _WebChatSupportSyncService(baseUrls: _buildBaseUrls(baseUrl: baseUrl));
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
  addUrl(window.location.origin);
  addUrl('http://127.0.0.1:8080');
  addUrl('http://localhost:8080');

  return urls;
}

String _resolveChatScopeAdminId(String adminId) {
  final scopedAdminId = adminId.trim();
  if (scopedAdminId.isNotEmpty) {
    return scopedAdminId;
  }
  return activeAdminId;
}

String _withChatAdminScopeUrl(String url, {String adminId = ''}) {
  final resolvedAdminId = _resolveChatScopeAdminId(adminId);
  final uri = Uri.parse(url);
  if (resolvedAdminId.isEmpty || uri.queryParameters.containsKey('adminId')) {
    return uri.toString();
  }
  return uri
      .replace(
        queryParameters: <String, String>{
          ...uri.queryParameters,
          'adminId': resolvedAdminId,
        },
      )
      .toString();
}

Map<String, String> _withChatAdminScopeHeaders(
  Map<String, String> headers, {
  String adminId = '',
}) {
  final resolvedAdminId = _resolveChatScopeAdminId(adminId);
  if (resolvedAdminId.isEmpty || headers.containsKey('X-GMS-Admin-ID')) {
    return headers;
  }
  return <String, String>{...headers, 'X-GMS-Admin-ID': resolvedAdminId};
}

Map<String, dynamic> _withChatAdminScopePayload(
  Map<String, dynamic> payload, {
  String adminId = '',
}) {
  final resolvedAdminId = _resolveChatScopeAdminId(adminId);
  if (resolvedAdminId.isEmpty || payload.containsKey('adminId')) {
    return payload;
  }
  return <String, dynamic>{...payload, 'adminId': resolvedAdminId};
}

class _WebChatSupportSyncService implements ChatSupportSyncService {
  _WebChatSupportSyncService({required this.baseUrls});

  final List<String> baseUrls;

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
    for (final field in <String>[
      'productImageUrl',
      'customerAvatarUrl',
      'customerImageUrl',
      'customerProfileImageUrl',
      'companyPictureUrl',
    ]) {
      normalizedThread[field] = _resolveChatMediaUrl(
        baseUrl,
        normalizedThread[field],
      );
    }
    final rawMessages = normalizedThread['messages'];
    if (rawMessages is List) {
      normalizedThread['messages'] = rawMessages
          .map((message) {
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
          })
          .toList(growable: false);
    }

    return normalizedThread;
  }

  Future<List<Map<String, dynamic>>> _fetchThreadsFromBaseUrl({
    required String baseUrl,
    required String customerId,
    String adminId = '',
  }) async {
    try {
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support?customerId=${Uri.encodeQueryComponent(customerId)}',
          adminId: adminId,
        ),
        method: 'GET',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
        }, adminId: adminId),
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
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
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<Map<String, dynamic>?> _fetchThreadFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
  }) async {
    try {
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}',
          adminId: adminId,
        ),
        method: 'GET',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
        }, adminId: adminId),
      ).timeout(_requestTimeout);

      if (response.status == 404) {
        _preferredBaseUrl = baseUrl;
        return null;
      }

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      final thread = decoded['thread'];
      if (thread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(thread),
      );
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<Map<String, dynamic>> _requestAiReplyFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
  }) async {
    try {
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/ai-reply',
          adminId: adminId,
        ),
        method: 'POST',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }, adminId: adminId),
        sendData: jsonEncode(
          _withChatAdminScopePayload(<String, dynamic>{}, adminId: adminId),
        ),
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        final decodedError =
            jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
        final errorMessage = decodedError['message']?.toString().trim();
        throw _BaseUrlAttemptFailure(
          errorMessage?.isNotEmpty == true
              ? errorMessage!
              : '${response.status}',
        );
      }

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      final thread = decoded['thread'];
      if (thread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(thread),
      );
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<Map<String, dynamic>> _requestHumanAgentFromBaseUrl({
    required String baseUrl,
    required String threadId,
    required String customerId,
    String adminId = '',
  }) async {
    try {
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/request-agent',
          adminId: adminId,
        ),
        method: 'POST',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }, adminId: adminId),
        sendData: jsonEncode(
          _withChatAdminScopePayload(<String, dynamic>{
            'customerId': customerId,
          }, adminId: adminId),
        ),
      ).timeout(_requestTimeout);
      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      if (response.status != 200) {
        final message = decoded['message']?.toString().trim();
        throw _BaseUrlAttemptFailure(
          message?.isNotEmpty == true ? message! : '${response.status}',
        );
      }
      final thread = decoded['thread'];
      if (thread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }
      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(thread),
      );
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<Map<String, dynamic>> _syncThreadToBaseUrl({
    required String baseUrl,
    required Map<String, dynamic> thread,
    String adminId = '',
  }) async {
    try {
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl('$baseUrl/api/chat-support', adminId: adminId),
        method: 'POST',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }, adminId: adminId),
        sendData: jsonEncode(
          _withChatAdminScopePayload(<String, dynamic>{
            'thread': thread,
          }, adminId: adminId),
        ),
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      final syncedThread = decoded['thread'];
      if (syncedThread is! Map<String, dynamic>) {
        throw const _BaseUrlAttemptFailure('invalid thread response');
      }

      _preferredBaseUrl = baseUrl;
      return _normalizeThreadMediaUrls(
        baseUrl: baseUrl,
        thread: Map<String, dynamic>.from(syncedThread),
      );
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
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
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/edit-message',
          adminId: adminId,
        ),
        method: 'POST',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }, adminId: adminId),
        sendData: jsonEncode(
          _withChatAdminScopePayload(<String, dynamic>{
            'messageId': messageId,
            'text': text,
          }, adminId: adminId),
        ),
      ).timeout(_requestTimeout);

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      if (response.status != 200) {
        final errorMessage = (decoded['message']?.toString() ?? '').trim();
        throw _BaseUrlAttemptFailure(
          errorMessage.isNotEmpty ? errorMessage : '${response.status}',
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
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
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
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/delete-message',
          adminId: adminId,
        ),
        method: 'POST',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }, adminId: adminId),
        sendData: jsonEncode(
          _withChatAdminScopePayload(<String, dynamic>{
            'messageId': messageId,
            if ((customerId ?? '').trim().isNotEmpty)
              'customerId': customerId!.trim(),
          }, adminId: adminId),
        ),
      ).timeout(_requestTimeout);

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      if (response.status != 200) {
        final errorMessage = (decoded['message']?.toString() ?? '').trim();
        throw _BaseUrlAttemptFailure(
          errorMessage.isNotEmpty ? errorMessage : '${response.status}',
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
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
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
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}/typing',
          adminId: adminId,
        ),
        method: 'POST',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }, adminId: adminId),
        sendData: jsonEncode(
          _withChatAdminScopePayload(<String, dynamic>{
            'actor': actor,
            'isTyping': isTyping,
            'isOnline': ?isOnline,
            if ((displayName ?? '').trim().isNotEmpty)
              'displayName': displayName!.trim(),
            if ((avatarUrl ?? '').trim().isNotEmpty)
              'avatarUrl': avatarUrl!.trim(),
            'thread': ?thread,
          }, adminId: adminId),
        ),
      ).timeout(_requestTimeout);

      if (response.status == 404) {
        _preferredBaseUrl = baseUrl;
        return null;
      }

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      if (response.status != 200) {
        final errorMessage = (decoded['message']?.toString() ?? '').trim();
        throw _BaseUrlAttemptFailure(
          errorMessage.isNotEmpty ? errorMessage : '${response.status}',
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
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<String> _uploadChatMediaToBaseUrl({
    required String baseUrl,
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) async {
    try {
      final response = await HttpRequest.request(
        '$baseUrl/api/uploads',
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

      final imageUrl = (decoded['imageUrl']?.toString() ?? '').trim();
      if (imageUrl.isEmpty) {
        throw const _BaseUrlAttemptFailure('invalid upload response');
      }

      _preferredBaseUrl = baseUrl;
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      return '$baseUrl$imageUrl';
    } on _BaseUrlAttemptFailure {
      rethrow;
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<void> _deleteThreadFromBaseUrl({
    required String baseUrl,
    required String threadId,
    String adminId = '',
  }) async {
    try {
      final response = await HttpRequest.request(
        _withChatAdminScopeUrl(
          '$baseUrl/api/chat-support/${Uri.encodeComponent(threadId)}',
          adminId: adminId,
        ),
        method: 'DELETE',
        requestHeaders: _withChatAdminScopeHeaders(const <String, String>{
          'Accept': 'application/json',
        }, adminId: adminId),
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
      run(baseUrl)
          .then((result) {
            if (!completer.isCompleted) {
              completer.complete(result);
            }
          })
          .catchError((Object error) {
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
  Future<Map<String, dynamic>> requestHumanAgent({
    required String threadId,
    required String customerId,
    String adminId = '',
  }) async {
    final preferredBaseUrl = _preferredBaseUrl;
    if (preferredBaseUrl != null) {
      try {
        return await _requestHumanAgentFromBaseUrl(
          baseUrl: preferredBaseUrl,
          threadId: threadId,
          customerId: customerId,
          adminId: adminId,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }
    return _runWithFallbacks<Map<String, dynamic>>(
      run: (baseUrl) => _requestHumanAgentFromBaseUrl(
        baseUrl: baseUrl,
        threadId: threadId,
        customerId: customerId,
        adminId: adminId,
      ),
      errorPrefix: 'Could not request a human support agent.',
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
