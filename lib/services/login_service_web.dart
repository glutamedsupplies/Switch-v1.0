import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/login_service_base.dart';

LoginService createLoginService() {
  return _HttpLoginService(
    baseUrls: buildLocalApiBaseUrls(isAndroid: Platform.isAndroid),
  );
}

class _HttpLoginService implements LoginService {
  _HttpLoginService({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  final HttpClient _client = HttpClient();

  @override
  Future<LoginResult> loginWithEmail({
    required String email,
    required String password,
  }) async {
    final payload = jsonEncode(<String, dynamic>{
      'email': email.trim(),
      'password': password.trim(),
    });
    final failures = <String>[];

    for (final baseUrl in baseUrls) {
      try {
        final request = await _client.postUrl(
          Uri.parse('$baseUrl/api/accounts/login'),
        );
        request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.write(payload);

        final response = await request.close();
        final responseBody = await response.transform(utf8.decoder).join();
        final decoded = responseBody.isEmpty
            ? <String, dynamic>{}
            : jsonDecode(responseBody) as Map<String, dynamic>;

        if (response.statusCode == HttpStatus.ok) {
          // Parse account data from response
          final account = decoded['account'] as Map<String, dynamic>?;
          return LoginResult.success(
            account,
            message: decoded['message']?.toString(),
            created: decoded['created'] == true,
          );
        }

        final message = decoded['message']?.toString() ?? 'Login failed.';
        failures.add('$baseUrl -> ${response.statusCode}: $message');
      } on SocketException {
        failures.add('$baseUrl -> SocketException');
      } on HttpException catch (e) {
        failures.add('$baseUrl -> HttpException: ${e.message}');
      } catch (e) {
        failures.add('$baseUrl -> $e');
      }
    }

    final lastFailure = failures.isNotEmpty ? failures.last : 'Connection failed.';
    return LoginResult.failure(
      lastFailure.replaceFirst(RegExp(r'^.*?-> '), ''),
    );
  }

  @override
  Future<LoginResult> loginWithGoogle({
    required String idToken,
    bool createIfMissing = true,
    String? verificationToken,
    String? preferredLanguage,
  }) async {
    final body = <String, dynamic>{
      'idToken': idToken.trim(),
      'createIfMissing': createIfMissing,
    };
    final token = verificationToken?.trim();
    if (token != null && token.isNotEmpty) {
      body['verificationToken'] = token;
    }
    final language = preferredLanguage?.trim();
    if (language != null && language.isNotEmpty) {
      body['preferredLanguage'] = language;
    }
    final payload = jsonEncode(body);
    final failures = <String>[];

    for (final baseUrl in baseUrls) {
      try {
        final request = await _client.postUrl(
          Uri.parse('$baseUrl/api/auth/google/login'),
        );
        request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.write(payload);

        final response = await request.close();
        final responseBody = await response.transform(utf8.decoder).join();
        final decoded = responseBody.isEmpty
            ? <String, dynamic>{}
            : jsonDecode(responseBody) as Map<String, dynamic>;

        if (response.statusCode == HttpStatus.ok) {
          final account = decoded['account'] as Map<String, dynamic>?;
          return LoginResult.success(
            account,
            message: decoded['message']?.toString(),
            created: decoded['created'] == true,
          );
        }

        final message =
            decoded['message']?.toString() ?? 'Unable to sign in with Google.';
        return LoginResult.failure(
          message,
          code: decoded['code']?.toString(),
        );
      } on SocketException {
        failures.add('$baseUrl -> SocketException');
      } on HttpException catch (e) {
        failures.add('$baseUrl -> HttpException: ${e.message}');
      } catch (e) {
        failures.add('$baseUrl -> $e');
      }
    }

    final lastFailure =
        failures.isNotEmpty ? failures.last : 'Connection failed.';
    return LoginResult.failure(
      lastFailure.replaceFirst(RegExp(r'^.*?-> '), ''),
    );
  }
}


