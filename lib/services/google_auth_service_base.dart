class GoogleAuthProfile {
  const GoogleAuthProfile({
    required this.idToken,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.displayName,
    required this.picture,
    required this.subject,
  });

  final String idToken;
  final String email;
  final String firstName;
  final String lastName;
  final String displayName;
  final String picture;
  final String subject;

  Map<String, dynamic> toRegistrationProfile() {
    return {
      'provider': 'google',
      'subject': subject,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'displayName': displayName,
      'picture': picture,
    };
  }
}

abstract class GoogleAuthService {
  Future<GoogleAuthProfile?> signIn();
}

class GoogleAuthException implements Exception {
  const GoogleAuthException(this.message);

  final String message;

  @override
  String toString() => message;
}
