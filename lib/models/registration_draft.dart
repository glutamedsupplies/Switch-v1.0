class RegistrationDraft {
  const RegistrationDraft({
    required this.firstName,
    required this.lastName,
    required this.countryCode,
    required this.mobileNumber,
    required this.email,
    required this.password,
    this.googleProfile,
  });

  final String firstName;
  final String lastName;
  final String countryCode;
  final String mobileNumber;
  final String email;
  final String password;
  final Map<String, dynamic>? googleProfile;

  Map<String, dynamic> toJson() {
    return {
      'firstName': firstName,
      'lastName': lastName,
      'countryCode': countryCode,
      'mobileNumber': mobileNumber,
      'email': email,
      'password': password,
      if (googleProfile != null) 'googleProfile': googleProfile,
    };
  }
}
