import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/local_api_base_urls.dart';
import 'package:gms_shopping/services/workspace_theme_sync.dart';

Future<String?> fetchWorkspaceColorHex({
  required Duration timeout,
}) async {
  final baseUrls = buildLocalApiBaseUrls(isAndroid: Platform.isAndroid);
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 3);

  try {
    for (final baseUrl in baseUrls) {
      try {
        final request = await client
            .getUrl(Uri.parse('$baseUrl/api/workspace-theme'))
            .timeout(timeout);
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.headers.set(HttpHeaders.cacheControlHeader, 'no-store');

        final response = await request.close().timeout(timeout);
        final body = await response.transform(utf8.decoder).join();
        if (response.statusCode != HttpStatus.ok) {
          continue;
        }

        final decoded = body.isEmpty
            ? const <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;
        final hex = normalizeWorkspaceColorHex(
          decoded['workspaceColor']?.toString() ?? decoded['color']?.toString(),
        );
        if (hex == null) {
          continue;
        }

        rememberWorkingLocalApiBaseUrl(baseUrl);
        return hex;
      } on SocketException {
        // Try the next local / emulator / LAN candidate.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        // Invalid JSON — try the next address.
      }
    }
  } finally {
    client.close(force: true);
  }

  return null;
}
