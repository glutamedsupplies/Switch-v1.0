abstract class LoginService {
  Future<LoginResult> loginWithEmail({
    required String email,
    required String password,
  });
}

class LoginResult {
  const LoginResult._({
    this.account,
    this.errorMessage,
  });

  final Map<String, dynamic>? account;
  final String? errorMessage;

  bool get isSuccess => errorMessage == null;
  bool get isFailure => errorMessage != null;
  bool get isError => errorMessage != null;

  factory LoginResult.success([Map<String, dynamic>? account]) {
    return LoginResult._(account: account);
  }

  factory LoginResult.failure(String errorMessage) {
    return LoginResult._(errorMessage: errorMessage);
  }
}

