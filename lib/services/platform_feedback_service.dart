import 'package:switch_app/services/platform_feedback_service_base.dart';

import 'platform_feedback_service_stub.dart'
    if (dart.library.io) 'platform_feedback_service_io.dart' as service;

export 'platform_feedback_service_base.dart';

PlatformFeedbackService createPlatformFeedbackService() =>
    service.createPlatformFeedbackService();
