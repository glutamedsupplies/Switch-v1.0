import 'package:switch_app/services/verification_service_base.dart';

VerificationService createVerificationService({String? baseUrl}) {
  return _StubVerificationService();
}

class _StubVerificationService implements VerificationService {
  @override
  Future<VerificationSendResult> sendVerificationCode({
    required String purpose,
    required String channel,
    String email = '',
    String mobileNumber = '',
  }) async {
    throw const VerificationException(
      'Verification is not available on this platform.',
    );
  }

  @override
  Future<VerificationVerifyResult> verifyVerificationCode({
    required String purpose,
    required String channel,
    required String code,
    String email = '',
    String mobileNumber = '',
  }) async {
    throw const VerificationException(
      'Verification is not available on this platform.',
    );
  }
}
