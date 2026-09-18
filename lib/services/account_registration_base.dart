abstract class AccountRegistrationService {
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
  });
}

class AccountRegistrationException implements Exception {
  const AccountRegistrationException(this.message);

  final String message;

  @override
  String toString() => message;
}
