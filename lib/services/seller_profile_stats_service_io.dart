import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/seller_profile_stats_service_base.dart';

const _requestTimeout = Duration(seconds: 10);

SellerProfileStatsService createSellerProfileStatsService() =>
    _IoSellerProfileStatsService(
      buildLocalApiBaseUrls(isAndroid: Platform.isAndroid),
    );

class _IoSellerProfileStatsService implements SellerProfileStatsService {
  _IoSellerProfileStatsService(this._baseUrls);

  final List<String> _baseUrls;
  final HttpClient _client = HttpClient();

  @override
  Future<SellerProfileStats?> fetchStats(String adminId) async {
    final trimmedAdminId = adminId.trim();
    if (trimmedAdminId.isEmpty) {
      return null;
    }

    for (final baseUrl in _baseUrls) {
      try {
        final uri = Uri.parse(
          '$baseUrl/api/sellers/${Uri.encodeComponent(trimmedAdminId)}/profile',
        );
        final request = await _client.getUrl(uri).timeout(_requestTimeout);
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        final response = await request.close().timeout(_requestTimeout);
        final body = await response.transform(utf8.decoder).join();
        if (response.statusCode != HttpStatus.ok) {
          return null;
        }
        rememberWorkingLocalApiBaseUrl(baseUrl);
        final decoded = jsonDecode(body);
        return decoded is Map
            ? SellerProfileStats.fromJson(Map<String, dynamic>.from(decoded))
            : null;
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        return null;
      }
    }

    return null;
  }
}
