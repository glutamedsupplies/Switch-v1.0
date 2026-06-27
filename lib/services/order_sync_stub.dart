import 'package:gms_shopping/services/order_sync_base.dart';

OrderSyncService createOrderSyncService({String? baseUrl}) {
  return _UnsupportedOrderSyncService();
}

class _UnsupportedOrderSyncService implements OrderSyncService {
  @override
  Future<List<Map<String, dynamic>>> fetchOrders() async {
    throw const OrderSyncServiceException(
      'Order sync is not supported on this platform.',
    );
  }

  @override
  Future<void> replaceOrders(List<Map<String, dynamic>> orders) async {
    throw const OrderSyncServiceException(
      'Order sync is not supported on this platform.',
    );
  }

  @override
  Future<void> upsertOrders(List<Map<String, dynamic>> orders) async {
    throw const OrderSyncServiceException(
      'Order sync is not supported on this platform.',
    );
  }

  @override
  Future<void> cancelOrderGroup(int createdAtEpochMs) async {
    throw const OrderSyncServiceException(
      'Order sync is not supported on this platform.',
    );
  }

  @override
  Future<String> uploadReviewMedia({
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) async {
    throw const OrderSyncServiceException(
      'Review media uploads are not supported on this platform.',
    );
  }
}

class OrderSyncServiceException implements Exception {
  const OrderSyncServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}
