import 'package:gms_shopping/services/google_auth_service_base.dart';

GoogleAuthService createGoogleAuthService({String? baseUrl}) {
  return _StubGoogleAuthService();
}

class _StubGoogleAuthService implements GoogleAuthService {
  @override
  Future<GoogleAuthProfile?> signIn() async {
    throw const GoogleAuthException(
      'Google sign-in is not available on this platform.',
    );
  }
}
