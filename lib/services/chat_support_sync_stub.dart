import 'chat_support_sync_base.dart';

ChatSupportSyncService createChatSupportSyncService({String? baseUrl}) {
  return const _UnsupportedChatSupportSyncService();
}

class _UnsupportedChatSupportSyncService implements ChatSupportSyncService {
  const _UnsupportedChatSupportSyncService();

  @override
  Future<List<Map<String, dynamic>>> fetchThreads({
    required String customerId,
    String adminId = '',
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }

  @override
  Future<Map<String, dynamic>?> fetchThread({
    required String threadId,
    String adminId = '',
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }

  @override
  Future<Map<String, dynamic>> requestAiReply({
    required String threadId,
    String adminId = '',
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }

  @override
  Future<Map<String, dynamic>> syncThread(
    Map<String, dynamic> thread, {
    String adminId = '',
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }

  @override
  Future<Map<String, dynamic>> editMessage({
    required String threadId,
    String adminId = '',
    required String messageId,
    required String text,
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }

  @override
  Future<Map<String, dynamic>> deleteMessage({
    required String threadId,
    String adminId = '',
    required String messageId,
    String? customerId,
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
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
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }

  @override
  Future<void> deleteThread(String threadId, {String adminId = ''}) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }

  @override
  Future<String> uploadChatMedia({
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) {
    throw const ChatSupportSyncException(
      'Chat support sync is not available on this platform.',
    );
  }
}
