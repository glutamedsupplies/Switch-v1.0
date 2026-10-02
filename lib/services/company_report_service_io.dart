import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/company_report_service_base.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 12);

CompanyReportService createCompanyReportService() =>
    _IoCompanyReportService(buildLocalApiBaseUrls(isAndroid: Platform.isAndroid));

class _IoCompanyReportService implements CompanyReportService {
  _IoCompanyReportService(this._baseUrls);

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
  Future<CompanyReportEligibility> checkSellerReportEligibility({
    required String adminId,
    String companyId = '',
    String productId = '',
  }) async {
    final query = <String, String>{
      if (adminId.trim().isNotEmpty) 'adminId': adminId.trim(),
      if (companyId.trim().isNotEmpty) 'companyId': companyId.trim(),
      if (productId.trim().isNotEmpty) 'productId': productId.trim(),
    };

    for (final baseUrl in _baseUrls) {
      try {
        final uri = Uri.parse('$baseUrl/api/account/company-reports/eligibility')
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
          return CompanyReportEligibility(
            eligible: decoded['eligible'] == true,
            message: message,
          );
        }
        return CompanyReportEligibility(
          eligible: false,
          message: message.isNotEmpty
              ? message
              : 'Unable to check if you can report this store.',
        );
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        return const CompanyReportEligibility(
          eligible: false,
          message: 'The server returned an invalid response.',
        );
      }
    }

    return const CompanyReportEligibility(
      eligible: false,
      message: 'Cannot reach the backend. Check that it is running.',
    );
  }

  @override
  Future<CompanyReportResult> submitSellerReport({
    required String adminId,
    required String companyName,
    required String reasonCategory,
    required String reasonText,
    String companyId = '',
    String productId = '',
    String productName = '',
    String orderId = '',
  }) async {
    var receivedServerResponse = false;
    final payload = jsonEncode(<String, dynamic>{
      'adminId': adminId.trim(),
      'companyId': companyId.trim(),
      'companyName': companyName.trim(),
      'reasonCategory': reasonCategory.trim(),
      'reasonText': reasonText.trim(),
      'productId': productId.trim(),
      'productName': productName.trim(),
      'orderId': orderId.trim(),
    });

    for (final baseUrl in _baseUrls) {
      try {
        final request = await _client
            .postUrl(Uri.parse('$baseUrl/api/account/company-reports'))
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
            : 'Report submitted for Super Admin review.';
        final report = decoded['report'] is Map
            ? Map<String, dynamic>.from(decoded['report'] as Map)
            : const <String, dynamic>{};
        final reportId = (decoded['reportId'] ?? report['reportId'] ?? '')
            .toString()
            .trim();
        if (response.statusCode == HttpStatus.created ||
            response.statusCode == HttpStatus.ok) {
          rememberWorkingLocalApiBaseUrl(baseUrl);
          return CompanyReportResult.success(
            reportId.isEmpty
                ? message
                : message.contains(reportId)
                    ? message
                    : '$message Report ID: $reportId',
            reportId: reportId,
          );
        }
        return CompanyReportResult.failure(message);
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        return CompanyReportResult.failure(
          'The server returned an invalid response.',
        );
      }
    }

    return CompanyReportResult.failure(
      receivedServerResponse
          ? 'Unable to submit report.'
          : 'Cannot reach the backend. Check that it is running.',
    );
  }
}
