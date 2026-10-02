import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_url_probe_io.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/login_service_base.dart';

const _requestTimeout = Duration(seconds: 8);
const _connectTimeout = Duration(seconds: 3);

LoginService createLoginService() => _IoLoginService();

class _IoLoginService implements LoginService {
  _IoLoginService();

  final HttpClient _client = HttpClient()
    ..connectionTimeout = _connectTimeout;

  Future<LoginResult> _postLogin({
    required String path,
    required String payload,
    required String failureFallback,
  }) async {
    var receivedServerResponse = false;

    await resolveWorkingLocalApiBaseUrl();
    final baseUrls = buildLocalApiBaseUrls(isAndroid: Platform.isAndroid);
    for (final baseUrl in baseUrls) {
      try {
        final request = await _client
            .postUrl(Uri.parse('$baseUrl$path'))
            .timeout(_connectTimeout);
        request.headers.contentType = ContentType.json;
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.write(payload);

        final response = await request.close().timeout(_requestTimeout);
        receivedServerResponse = true;
        final body = await response.transform(utf8.decoder).join();
        final decoded = body.isEmpty
            ? const <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;

        if (response.statusCode == HttpStatus.ok) {
          final account = decoded['account'];
          if (account is Map<String, dynamic>) {
            rememberWorkingLocalApiBaseUrl(baseUrl);
            return LoginResult.success(
              account,
              message: decoded['message']?.toString(),
              created: decoded['created'] == true,
              sessionToken: decoded['sessionToken']?.toString(),
            );
          }
          return LoginResult.failure(
            'The server returned an invalid login response.',
          );
        }

        final code = decoded['code']?.toString();
        return LoginResult.failure(
          decoded['message']?.toString() ?? failureFallback,
          code: code,
        );
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next local, emulator, or LAN address.
      } on HttpException {
        // Try the next address. The final message remains shopper-friendly.
      } on FormatException {
        return LoginResult.failure('The server returned an invalid response.');
      }
    }

    return LoginResult.failure(
      receivedServerResponse
          ? failureFallback
          : 'Cannot reach the backend. Check that it is running and that your phone is connected by USB or to the same Wi-Fi network.',
    );
  }

  @override
  Future<LoginResult> loginWithEmail({
    required String email,
    required String password,
  }) {
    return _postLogin(
      path: '/api/accounts/login',
      payload: jsonEncode({'email': email.trim(), 'password': password}),
      failureFallback: 'Unable to sign in.',
    );
  }

  @override
  Future<LoginResult> loginWithGoogle({
    required String idToken,
    bool createIfMissing = true,
    String? verificationToken,
    String? preferredLanguage,
  }) {
    final payload = <String, dynamic>{
      'idToken': idToken.trim(),
      'createIfMissing': createIfMissing,
    };
    final token = verificationToken?.trim();
    if (token != null && token.isNotEmpty) {
      payload['verificationToken'] = token;
    }
    final language = preferredLanguage?.trim();
    if (language != null && language.isNotEmpty) {
      payload['preferredLanguage'] = language;
    }
    return _postLogin(
      path: '/api/auth/google/login',
      payload: jsonEncode(payload),
      failureFallback: 'Unable to sign in with Google.',
    );
  }
}
