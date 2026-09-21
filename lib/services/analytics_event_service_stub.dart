import 'analytics_event_service_base.dart';

AnalyticsEventService createAnalyticsEventService() =>
    const _NoopAnalyticsEventService();

class _NoopAnalyticsEventService implements AnalyticsEventService {
  const _NoopAnalyticsEventService();

  @override
  Future<void> record({
    required String eventName,
    required String productId,
    String platformId = '',
    String source = 'buyer_app',
    Map<String, dynamic> properties = const <String, dynamic>{},
  }) async {}
}
