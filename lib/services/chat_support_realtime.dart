import 'chat_support_realtime_types.dart';
import 'chat_support_realtime_stub.dart'
    if (dart.library.io) 'chat_support_realtime_io.dart'
    if (dart.library.html) 'chat_support_realtime_web.dart' as impl;

export 'chat_support_realtime_types.dart';

ChatSupportRealtimeListener createChatSupportRealtimeListener(
  void Function() onChatUpdate,
) {
  return impl.createChatSupportRealtimeListener(onChatUpdate);
}
