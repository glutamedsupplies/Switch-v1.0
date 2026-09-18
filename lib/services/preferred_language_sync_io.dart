import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/l10n/app_login_languages.dart';
import 'package:gms_shopping/services/admin_scope.dart';
import 'package:gms_shopping/services/local_api_base_urls.dart';

Future<void> updatePreferredLanguage({
  required String accountId,
  required String preferredLanguage,
}) async {
  final id = accountId.trim();
  final language = AppLoginLanguages.normalize(preferredLanguage);
  if (id.isEmpty) return;

  final baseUrls = buildLocalApiBaseUrls(isAndroid: Platform.isAndroid);
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
  final payload = withAdminScopePayload(<String, dynamic>{
    'accountId': id,
    'preferredLanguage': language,
  });

  try {
    for (final baseUrl in baseUrls) {
      try {
        final request = await client.openUrl(
          'PATCH',
          withAdminScopeUri(
            Uri.parse('$baseUrl/api/accounts/preferred-language'),
          ),
        );
        request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        final adminId = activeAdminId;
        if (adminId.isNotEmpty) {
          request.headers.set('X-GMS-Admin-ID', adminId);
        }
        request.write(jsonEncode(payload));
        final response = await request.close().timeout(
          const Duration(seconds: 12),
        );
        await response.drain<void>();
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return;
        }
      } catch (_) {
        // Try next base URL.
      }
    }
  } finally {
    client.close(force: true);
  }
}
