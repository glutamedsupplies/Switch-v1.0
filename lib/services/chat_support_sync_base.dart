abstract class ChatSupportSyncService {
  Future<List<Map<String, dynamic>>> fetchThreads({
    required String customerId,
    String adminId = '',
  });

  Future<Map<String, dynamic>?> fetchThread({
    required String threadId,
    String adminId = '',
  });

  Future<Map<String, dynamic>> requestAiReply({
    required String threadId,
    String adminId = '',
  });

  Future<Map<String, dynamic>> syncThread(
    Map<String, dynamic> thread, {
    String adminId = '',
  });

  Future<Map<String, dynamic>> editMessage({
    required String threadId,
    String adminId = '',
    required String messageId,
    required String text,
  });

  Future<Map<String, dynamic>> deleteMessage({
    required String threadId,
    String adminId = '',
    required String messageId,
    String? customerId,
  });

  Future<Map<String, dynamic>?> updateTyping({
    required String threadId,
    String adminId = '',
    required String actor,
    required bool isTyping,
    bool? isOnline,
    String? displayName,
    String? avatarUrl,
    Map<String, dynamic>? thread,
  });

  Future<String> uploadChatMedia({
    required List<int> bytes,
    required String fileName,
    required String contentType,
  });

  Future<void> deleteThread(String threadId, {String adminId = ''});
}

class ChatSupportSyncException implements Exception {
  const ChatSupportSyncException(this.message);

  final String message;

  @override
  String toString() => 'ChatSupportSyncException: $message';
}
