import 'dart:convert';
import 'dart:html';

import 'package:gms_shopping/services/admin_scope.dart';
import 'package:gms_shopping/services/account_registration_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');

AccountRegistrationService createAccountRegistrationService({String? baseUrl}) {
  return _WebAccountRegistrationService(
    baseUrl: baseUrl ??
        (_environmentBaseUrl.isNotEmpty
            ? _environmentBaseUrl
            : 'http://127.0.0.1:8080'),
  );
}

class _WebAccountRegistrationService implements AccountRegistrationService {
  _WebAccountRegistrationService({
    required this.baseUrl,
  });

  final String baseUrl;

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
    try {
      final response = await HttpRequest.request(
        withAdminScopeUrl('$baseUrl/api/accounts'),
        method: 'POST',
        requestHeaders: withAdminScopeHeaders(const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }),
        sendData: jsonEncode(withAdminScopePayload(<String, dynamic>{
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
        })),
      );

      if (response.status != 201) {
        final decoded =
            jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
        throw AccountRegistrationException(
          decoded['message']?.toString() ?? 'Unable to create account.',
        );
      }
    } catch (error) {
      if (error is AccountRegistrationException) {
        rethrow;
      }

      throw const AccountRegistrationException(
        'Could not connect to the backend to create the account.',
      );
    }
  }
}
