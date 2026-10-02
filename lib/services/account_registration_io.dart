import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/account_registration_base.dart';
import 'package:switch_app/services/admin_scope.dart';
import 'package:switch_app/services/local_api_base_url_probe_io.dart';
import 'package:switch_app/services/local_api_base_urls.dart';

AccountRegistrationService createAccountRegistrationService({String? baseUrl}) {
  return _HttpAccountRegistrationService(baseUrl: baseUrl);
}

/// Result of an account registration attempt at a specific URL
class _AccountResult {
  const _AccountResult({
    required this.statusCode,
    required this.body,
    required this.errorMessage,
  });

  final int statusCode;
  final Map<String, dynamic> body;
  final String? errorMessage;
}

class _HttpAccountRegistrationService implements AccountRegistrationService {
  _HttpAccountRegistrationService({this.baseUrl});

  final String? baseUrl;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 3);

  Future<_AccountResult> _tryRegisterAtUrl(
    String baseUrl,
    Map<String, dynamic> payload,
  ) async {
    try {
      final request = await _client.postUrl(
        withAdminScopeUri(Uri.parse('$baseUrl/api/accounts')),
      );
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final adminId = activeAdminId;
      if (adminId.isNotEmpty) {
        request.headers.set('X-GMS-Admin-ID', adminId);
      }
      request.write(jsonEncode(payload));

      final response = await request.close().timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw TimeoutException('Request timed out'),
      );
      final responseBody = await response.transform(utf8.decoder).join();
      final decoded = responseBody.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(responseBody) as Map<String, dynamic>;

      return _AccountResult(
        statusCode: response.statusCode,
        body: decoded,
        errorMessage: response.statusCode == HttpStatus.created
            ? null
            : decoded['message']?.toString() ?? 'Unable to create account.',
      );
    } on SocketException {
      return _AccountResult(
        statusCode: 0,
        body: {},
        errorMessage: 'Cannot connect to server',
      );
    } on TimeoutException {
      return _AccountResult(
        statusCode: 0,
        body: {},
        errorMessage: 'Request timed out',
      );
    } on HttpException catch (error) {
      return _AccountResult(
        statusCode: 0,
        body: {},
        errorMessage: error.message,
      );
    } on FormatException {
      return _AccountResult(
        statusCode: 0,
        body: {},
        errorMessage: 'Invalid server response',
      );
    }
  }

  @override
  Future<void> registerAppAccount({
    required String firstName,
    required String lastName,
    required String countryCode,
    required String mobileNumber,
    required String email,
    String password = '',
    required String verificationToken,
    String verificationChannel = 'email',
    String? preferredLanguage,
    Map<String, dynamic>? googleProfile,
  }) async {
    final payload = withAdminScopePayload(<String, dynamic>{
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'countryCode': countryCode.trim(),
      'mobileNumber': mobileNumber.trim(),
      'email': email.trim(),
      'password': password.trim(),
      'source': 'app',
      'faceVerified': false,
      'verificationToken': verificationToken.trim(),
      'verificationChannel': verificationChannel.trim(),
      if (preferredLanguage != null && preferredLanguage.trim().isNotEmpty)
        'preferredLanguage': preferredLanguage.trim(),
      if (googleProfile != null) 'googleProfile': googleProfile,
    });

    await resolveWorkingLocalApiBaseUrl();
    final baseUrls = buildLocalApiBaseUrls(
      baseUrl: baseUrl,
      isAndroid: Platform.isAndroid,
    );
    for (final baseUrl in baseUrls) {
      final result = await _tryRegisterAtUrl(baseUrl, payload);

      if (result.statusCode == HttpStatus.created) {
        rememberWorkingLocalApiBaseUrl(baseUrl);
        return;
      }

      // Any HTTP reply came from the real backend; only network failures
      // (status 0) move on to the next address.
      if (result.statusCode != 0) {
        rememberWorkingLocalApiBaseUrl(baseUrl);
        throw AccountRegistrationException(
          result.errorMessage ?? 'Registration failed.',
        );
      }
    }

    // All URLs failed
    throw AccountRegistrationException(
      'Unable to connect to server. Please check your internet connection and try again.',
    );
  }
}
