import 'chat_support_sync_base.dart';

import 'chat_support_sync_stub.dart'
    if (dart.library.io) 'chat_support_sync_io.dart'
    if (dart.library.html) 'chat_support_sync_web.dart' as sync_service;

final Map<String, ChatSupportSyncService> _servicesByBaseUrl =
    <String, ChatSupportSyncService>{};

ChatSupportSyncService createChatSupportSyncService({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _servicesByBaseUrl.putIfAbsent(
    cacheKey,
    () => sync_service.createChatSupportSyncService(baseUrl: baseUrl),
  );
}
