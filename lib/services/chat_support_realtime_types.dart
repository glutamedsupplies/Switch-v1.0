abstract class ChatSupportRealtimeListener {
  void start({
    required String customerId,
    required String adminId,
  });

  void stop();
}
