abstract class AccountRegistrationService {
  Future<void> registerAppAccount({
    required String firstName,
    required String lastName,
    required String countryCode,
    required String mobileNumber,
    required String email,
    required String password,
  });
}
