import 'package:switch_app/services/platform_feedback_service_base.dart';

PlatformFeedbackService createPlatformFeedbackService() =>
    _StubPlatformFeedbackService();

class _StubPlatformFeedbackService implements PlatformFeedbackService {
  @override
  Future<PlatformFeedbackResult> submitUserFeedback({
    required String accountId,
    required String email,
    required int rating,
    required String message,
    List<PlatformFeedbackAttachmentUpload> attachments = const [],
  }) async {
    return PlatformFeedbackResult.failure(
      'Feedback is unavailable on this platform build.',
    );
  }
}
