class PlatformFeedbackResult {
  const PlatformFeedbackResult._({
    required this.ok,
    required this.message,
  });

  final bool ok;
  final String message;

  factory PlatformFeedbackResult.success(String message) {
    return PlatformFeedbackResult._(ok: true, message: message);
  }

  factory PlatformFeedbackResult.failure(String message) {
    return PlatformFeedbackResult._(ok: false, message: message);
  }
}

class PlatformFeedbackAttachmentUpload {
  const PlatformFeedbackAttachmentUpload({
    required this.path,
    required this.name,
    required this.contentType,
    required this.kind,
    required this.sizeBytes,
  });

  final String path;
  final String name;
  final String contentType;
  final String kind;
  final int sizeBytes;
}

abstract class PlatformFeedbackService {
  Future<PlatformFeedbackResult> submitUserFeedback({
    required String accountId,
    required String email,
    required int rating,
    required String message,
    List<PlatformFeedbackAttachmentUpload> attachments = const [],
  });
}
