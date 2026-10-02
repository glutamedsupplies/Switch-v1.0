import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/listing_report_service_base.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 12);

ListingReportService createListingReportService() =>
    _IoListingReportService(buildLocalApiBaseUrls(isAndroid: Platform.isAndroid));

class _IoListingReportService implements ListingReportService {
  _IoListingReportService(this._baseUrls);

  final List<String> _baseUrls;
  final HttpClient _client = HttpClient();

  Future<void> _applyAuthHeaders(HttpHeaders headers) async {
    headers.set(HttpHeaders.acceptHeader, 'application/json');
    headers.contentType = ContentType.json;
    final sessionToken = (await AuthSession.getSessionToken())?.trim() ?? '';
    if (sessionToken.isNotEmpty) {
      headers.set('X-Switch-Session', sessionToken);
    }
    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    if (accountId.isNotEmpty) {
      headers.set('X-GMS-Account-ID', accountId);
    }
  }

  @override
  Future<ListingReportEligibility> checkListingReportEligibility({
    required String productId,
    String adminId = '',
    String companyId = '',
  }) async {
    final query = <String, String>{
      if (productId.trim().isNotEmpty) 'productId': productId.trim(),
      if (adminId.trim().isNotEmpty) 'adminId': adminId.trim(),
      if (companyId.trim().isNotEmpty) 'companyId': companyId.trim(),
    };

    for (final baseUrl in _baseUrls) {
      try {
        final uri = Uri.parse('$baseUrl/api/account/listing-reports/eligibility')
            .replace(queryParameters: query);
        final request = await _client.getUrl(uri).timeout(_requestTimeout);
        await _applyAuthHeaders(request.headers);
        final response = await request.close().timeout(_requestTimeout);
        final body = await response.transform(utf8.decoder).join();
        final decoded = body.isEmpty
            ? const <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;
        final message = decoded['message']?.toString().trim() ?? '';
        if (response.statusCode == HttpStatus.ok) {
          rememberWorkingLocalApiBaseUrl(baseUrl);
          return ListingReportEligibility(
            eligible: decoded['eligible'] == true,
            message: message,
          );
        }
        return ListingReportEligibility(
          eligible: false,
          message: message.isNotEmpty
              ? message
              : 'Unable to check if you can report this listing.',
        );
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        return const ListingReportEligibility(
          eligible: false,
          message: 'The server returned an invalid response.',
        );
      }
    }

    return const ListingReportEligibility(
      eligible: false,
      message: 'Cannot reach the backend. Check that it is running.',
    );
  }

  @override
  Future<ListingReportResult> submitListingReport({
    required String productId,
    required String productName,
    required String reasonCategory,
    required String reasonText,
    String adminId = '',
    String companyId = '',
    String companyName = '',
    String orderId = '',
  }) async {
    var receivedServerResponse = false;
    final payload = jsonEncode(<String, dynamic>{
      'productId': productId.trim(),
      'productName': productName.trim(),
      'adminId': adminId.trim(),
      'companyId': companyId.trim(),
      'companyName': companyName.trim(),
      'reasonCategory': reasonCategory.trim(),
      'reasonText': reasonText.trim(),
      'orderId': orderId.trim(),
    });

    for (final baseUrl in _baseUrls) {
      try {
        final request = await _client
            .postUrl(Uri.parse('$baseUrl/api/account/listing-reports'))
            .timeout(_requestTimeout);
        await _applyAuthHeaders(request.headers);
        request.write(payload);
        final response = await request.close().timeout(_requestTimeout);
        receivedServerResponse = true;
        final body = await response.transform(utf8.decoder).join();
        final decoded = body.isEmpty
            ? const <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;
        final message = decoded['message']?.toString().trim().isNotEmpty == true
            ? decoded['message'].toString()
            : 'Listing report submitted for Super Admin review.';
        final report = decoded['report'] is Map
            ? Map<String, dynamic>.from(decoded['report'] as Map)
            : const <String, dynamic>{};
        final reportId = (decoded['reportId'] ?? report['reportId'] ?? '')
            .toString()
            .trim();
        if (response.statusCode == HttpStatus.created ||
            response.statusCode == HttpStatus.ok) {
          rememberWorkingLocalApiBaseUrl(baseUrl);
          return ListingReportResult.success(
            reportId.isEmpty
                ? message
                : message.contains(reportId)
                    ? message
                    : '$message Report ID: $reportId',
            reportId: reportId,
          );
        }
        return ListingReportResult.failure(message);
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        return ListingReportResult.failure(
          'The server returned an invalid response.',
        );
      }
    }

    return ListingReportResult.failure(
      receivedServerResponse
          ? 'Unable to submit listing report.'
          : 'Cannot reach the backend. Check that it is running.',
    );
  }
}
