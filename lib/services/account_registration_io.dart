import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/admin_scope.dart';
import 'package:gms_shopping/services/account_registration_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _defaultDesktopBaseUrl = 'http://127.0.0.1:8080';
const _defaultAndroidEmulatorBaseUrl = 'http://10.0.2.2:8080';
const _defaultAndroidUsbBaseUrl = 'http://127.0.0.1:8080';
const _defaultCurrentWifiBaseUrl = 'http://192.168.100.225:8080';

AccountRegistrationService createAccountRegistrationService({String? baseUrl}) {
  return _HttpAccountRegistrationService(
    baseUrls: _buildBaseUrls(baseUrl: baseUrl),
  );
}

List<String> _buildBaseUrls({String? baseUrl}) {
  final urls = <String>[];

  void addUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty || urls.contains(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  // Priority order: explicit baseUrl > environment > platform-specific defaults
  addUrl(baseUrl);
  addUrl(_environmentBaseUrl);

  if (Platform.isAndroid) {
    // WiFi IP first (most likely to work for physical device)
    addUrl(_defaultCurrentWifiBaseUrl);
    addUrl(_defaultAndroidUsbBaseUrl);
    addUrl(_defaultAndroidEmulatorBaseUrl);
    addUrl(_defaultDesktopBaseUrl);
    addUrl('http://localhost:8080');
  } else {
    addUrl(_defaultDesktopBaseUrl);
    addUrl('http://localhost:8080');
  }

  return urls;
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
  _HttpAccountRegistrationService({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  final HttpClient _client = HttpClient()
    ..connectionTimeout = const Duration(seconds: 10);

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
    required String password,
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
    });

    // Try each URL until one succeeds
    for (final baseUrl in baseUrls) {
      final result = await _tryRegisterAtUrl(baseUrl, payload);

      if (result.statusCode == HttpStatus.created) {
        return; // Success!
      }

      // For 400 errors (validation failures), report immediately
      if (result.statusCode == HttpStatus.badRequest) {
        throw AccountRegistrationException(result.errorMessage ?? 'Registration failed.');
      }

      // For other errors (network issues), try next URL
      // Continue to next URL...
    }

    // All URLs failed
    throw AccountRegistrationException(
      'Unable to connect to server. Please check your internet connection and try again.',
    );
  }
}

class AccountRegistrationException implements Exception {
  const AccountRegistrationException(this.message);

  final String message;

  @override
  String toString() => message;
}
