import 'package:gms_shopping/services/login_service_base.dart';

LoginService createLoginService() => const _UnsupportedLoginService();

class _UnsupportedLoginService implements LoginService {
  const _UnsupportedLoginService();

  @override
  Future<LoginResult> loginWithEmail({
    required String email,
    required String password,
  }) async =>
      LoginResult.failure('Login is unavailable on this platform. Please use the mobile app.');

  @override
  Future<LoginResult> loginWithGoogle({
    required String idToken,
    bool createIfMissing = true,
    String? verificationToken,
    String? preferredLanguage,
  }) async =>
      LoginResult.failure('Google sign-in is unavailable on this platform.');
}
