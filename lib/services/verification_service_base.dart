abstract class VerificationService {
  Future<VerificationSendResult> sendVerificationCode({
    required String purpose,
    required String channel,
    String email = '',
    String mobileNumber = '',
  });

  Future<VerificationVerifyResult> verifyVerificationCode({
    required String purpose,
    required String channel,
    required String code,
    String email = '',
    String mobileNumber = '',
  });
}

class VerificationSendResult {
  const VerificationSendResult({
    required this.channel,
    required this.target,
    this.debugCode,
    this.expiresAt,
    this.createdAt,
    this.resendAvailableAt,
    this.resendCooldownSeconds,
  });

  final String channel;
  final String target;
  final String? debugCode;
  final DateTime? expiresAt;
  final DateTime? createdAt;
  final DateTime? resendAvailableAt;
  final int? resendCooldownSeconds;

  bool get isSuccess => true;
}

class VerificationVerifyResult {
  const VerificationVerifyResult({
    required this.verificationToken,
    required this.channel,
    required this.target,
  });

  final String verificationToken;
  final String channel;
  final String target;
}

class VerificationException implements Exception {
  const VerificationException(this.message);

  final String message;

  @override
  String toString() => message;
}
