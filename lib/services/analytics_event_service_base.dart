abstract class AnalyticsEventService {
  Future<void> record({
    required String eventName,
    required String productId,
    String platformId = '',
    String source = 'buyer_app',
    Map<String, dynamic> properties = const <String, dynamic>{},
  });
}
