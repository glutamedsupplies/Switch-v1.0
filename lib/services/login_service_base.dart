abstract class LoginService {
  Future<LoginResult> loginWithEmail({
    required String email,
    required String password,
  });

  /// Google Instant Sign-In.
  ///
  /// When [createIfMissing] is false, returns [LoginResult.isNotFound] if the
  /// Google account is not linked to Switch yet (caller should verify email).
  /// Creating a new account requires a registration [verificationToken].
  Future<LoginResult> loginWithGoogle({
    required String idToken,
    bool createIfMissing = true,
    String? verificationToken,
    String? preferredLanguage,
  });
}

class LoginResult {
  const LoginResult._({
    this.account,
    this.errorMessage,
    this.successMessage,
    this.created = false,
    this.code,
  });

  final Map<String, dynamic>? account;
  final String? errorMessage;
  final String? successMessage;
  final bool created;
  final String? code;

  bool get isSuccess => errorMessage == null;
  bool get isFailure => errorMessage != null;
  bool get isError => errorMessage != null;
  bool get isNotFound => code == 'not_found';

  factory LoginResult.success(
    Map<String, dynamic>? account, {
    String? message,
    bool created = false,
  }) {
    return LoginResult._(
      account: account,
      successMessage: message,
      created: created,
    );
  }

  factory LoginResult.failure(String errorMessage, {String? code}) {
    return LoginResult._(errorMessage: errorMessage, code: code);
  }
}
