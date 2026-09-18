import 'dart:async';
import 'dart:convert';
import 'dart:html';

import 'package:gms_shopping/l10n/app_login_languages.dart';
import 'package:gms_shopping/services/admin_scope.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');

Future<void> updatePreferredLanguage({
  required String accountId,
  required String preferredLanguage,
}) async {
  final id = accountId.trim();
  final language = AppLoginLanguages.normalize(preferredLanguage);
  if (id.isEmpty) return;

  final baseUrl = _environmentBaseUrl.isNotEmpty
      ? _environmentBaseUrl
      : 'http://127.0.0.1:8080';

  try {
    await HttpRequest.request(
      withAdminScopeUrl('$baseUrl/api/accounts/preferred-language'),
      method: 'PATCH',
      requestHeaders: withAdminScopeHeaders(const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
      sendData: jsonEncode(withAdminScopePayload(<String, dynamic>{
        'accountId': id,
        'preferredLanguage': language,
      })),
    );
  } catch (_) {
    // Preference stays local if sync fails.
  }
}
