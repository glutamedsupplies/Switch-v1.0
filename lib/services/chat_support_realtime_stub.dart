import 'chat_support_realtime_types.dart';

class ChatSupportRealtimeListenerImpl implements ChatSupportRealtimeListener {
  ChatSupportRealtimeListenerImpl(this.onChatUpdate);

  final void Function() onChatUpdate;

  @override
  void start({
    required String customerId,
    required String adminId,
  }) {}

  @override
  void stop() {}
}

ChatSupportRealtimeListener createChatSupportRealtimeListener(
  void Function() onChatUpdate,
) {
  return ChatSupportRealtimeListenerImpl(onChatUpdate);
}
