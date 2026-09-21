import 'analytics_event_service_stub.dart'
    if (dart.library.io) 'analytics_event_service_io.dart'
    if (dart.library.html) 'analytics_event_service_web.dart'
    as service;

export 'analytics_event_service_base.dart';

final analyticsEvents = service.createAnalyticsEventService();
