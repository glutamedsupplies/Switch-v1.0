import 'package:gms_shopping/services/login_service_base.dart';

LoginService createLoginService({String? baseUrl}) {
  return _IoLoginService(baseUrl: baseUrl);
}

class _IoLoginService implements LoginService {
  _IoLoginService({
    String? baseUrl,
  }) : _baseUrl = baseUrl ?? 'http://127.0.0.1:8080';

  final String _baseUrl;

  @override
  Future<LoginResult> loginWithEmail({
    required String email,
    required String password,
  }) async {
    // IO implementation placeholder - uses native HTTP client
    // For now, return a not implemented error
    return LoginResult.failure(
      'App login is not yet available. Please use the web login.',
    );
  }
}