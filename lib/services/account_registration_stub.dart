import 'package:gms_shopping/services/account_registration_base.dart';

AccountRegistrationService createAccountRegistrationService({String? baseUrl}) {
  return _UnsupportedAccountRegistrationService();
}

class _UnsupportedAccountRegistrationService
    implements AccountRegistrationService {
  @override
  Future<void> registerAppAccount({
    required String firstName,
    required String lastName,
    required String countryCode,
    required String mobileNumber,
    required String email,
    String password = '',
    required String verificationToken,
    String verificationChannel = 'email',
    String? preferredLanguage,
    Map<String, dynamic>? googleProfile,
  }) {
    throw UnsupportedError(
      'This platform does not support account registration.',
    );
  }
}
