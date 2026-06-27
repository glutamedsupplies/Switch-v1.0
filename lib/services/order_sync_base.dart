abstract class OrderSyncService {
  Future<List<Map<String, dynamic>>> fetchOrders();

  Future<void> replaceOrders(List<Map<String, dynamic>> orders);

  Future<void> upsertOrders(List<Map<String, dynamic>> orders);

  Future<void> cancelOrderGroup(int createdAtEpochMs);

  Future<String> uploadReviewMedia({
    required List<int> bytes,
    required String fileName,
    required String contentType,
  });
}
