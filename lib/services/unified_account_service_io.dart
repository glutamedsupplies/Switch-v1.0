import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_url_probe_io.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/unified_account_service_base.dart';
import 'package:switch_app/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 10);
const _connectTimeout = Duration(seconds: 4);

UnifiedAccountService createUnifiedAccountService() => _IoUnifiedAccountService();

class _IoUnifiedAccountService implements UnifiedAccountService {
  _IoUnifiedAccountService();

  final HttpClient _client = HttpClient()
    ..connectionTimeout = _connectTimeout;

  Future<List<String>> _resolveBaseUrls() async {
    await resolveWorkingLocalApiBaseUrl();
    return buildLocalApiBaseUrls(isAndroid: Platform.isAndroid);
  }

  Future<UnifiedAccountSessionResult> _request({
    required String method,
    required String path,
    Map<String, dynamic>? payload,
    Map<String, String>? query,
  }) async {
    var receivedServerResponse = false;

    for (final baseUrl in await _resolveBaseUrls()) {
      try {
        final queryParameters = <String, String>{};
        if (query != null) {
          for (final entry in query.entries) {
            final value = entry.value.trim();
            if (value.isNotEmpty) {
              queryParameters[entry.key] = value;
            }
          }
        }
        final uri = Uri.parse('$baseUrl$path').replace(
          queryParameters:
              queryParameters.isEmpty ? null : queryParameters,
        );
        final request = method == 'GET'
            ? await _client.getUrl(uri).timeout(_connectTimeout)
            : await _client.postUrl(uri).timeout(_connectTimeout);
        request.headers.contentType = ContentType.json;
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        final sessionToken = (await AuthSession.getSessionToken())?.trim() ?? '';
        if (sessionToken.isNotEmpty) {
          request.headers.set('X-Switch-Session', sessionToken);
        }
        if (payload != null) {
          request.write(jsonEncode(payload));
        }

        final response = await request.close().timeout(_requestTimeout);
        receivedServerResponse = true;
        rememberWorkingLocalApiBaseUrl(baseUrl);
        final body = await response.transform(utf8.decoder).join();
        final decoded = body.isEmpty
            ? const <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;

        if (response.statusCode == HttpStatus.ok ||
            response.statusCode == HttpStatus.created) {
          final sessionRaw = decoded['session'];
          final session = sessionRaw is Map<String, dynamic>
              ? sessionRaw
              : sessionRaw is Map
                  ? Map<String, dynamic>.from(sessionRaw)
                  : const <String, dynamic>{};
          return UnifiedAccountSessionResult(
            session: session,
            message: decoded['message']?.toString() ?? 'Success.',
          );
        }

        throw UnifiedAccountServiceException(
          decoded['message']?.toString() ?? 'Unified account request failed.',
          statusCode: response.statusCode,
          code: decoded['code']?.toString() ?? '',
        );
      } on SocketException {
        // Try next base URL.
      } on TimeoutException {
        // Try next base URL.
      } on HttpException {
        // Try next base URL.
      } on FormatException {
        throw const UnifiedAccountServiceException(
          'The server returned an invalid unified account response.',
        );
      }
    }

    throw UnifiedAccountServiceException(
      receivedServerResponse
          ? 'Unified account request failed.'
          : 'Cannot reach the backend. Check that it is running.',
    );
  }

  Future<Map<String, dynamic>> _requestRaw({
    required String method,
    required String path,
    Map<String, dynamic>? payload,
    Map<String, String>? query,
  }) async {
    var receivedServerResponse = false;

    for (final baseUrl in await _resolveBaseUrls()) {
      try {
        final queryParameters = <String, String>{};
        if (query != null) {
          for (final entry in query.entries) {
            final value = entry.value.trim();
            if (value.isNotEmpty) {
              queryParameters[entry.key] = value;
            }
          }
        }
        final uri = Uri.parse('$baseUrl$path').replace(
          queryParameters: queryParameters.isEmpty ? null : queryParameters,
        );
        final request = method == 'GET'
            ? await _client.getUrl(uri).timeout(_connectTimeout)
            : await _client.postUrl(uri).timeout(_connectTimeout);
        request.headers.contentType = ContentType.json;
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        final sessionToken = (await AuthSession.getSessionToken())?.trim() ?? '';
        if (sessionToken.isNotEmpty) {
          request.headers.set('X-Switch-Session', sessionToken);
        }
        if (payload != null) {
          request.write(jsonEncode(payload));
        }

        final response = await request.close().timeout(_requestTimeout);
        receivedServerResponse = true;
        rememberWorkingLocalApiBaseUrl(baseUrl);
        final body = await response.transform(utf8.decoder).join();
        final decoded = body.isEmpty
            ? const <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;
        if (response.statusCode == HttpStatus.ok ||
            response.statusCode == HttpStatus.created) {
          return decoded;
        }
        throw UnifiedAccountServiceException(
          decoded['message']?.toString() ?? 'Unified account request failed.',
          statusCode: response.statusCode,
          code: decoded['code']?.toString() ?? '',
        );
      } on SocketException {
        // Try next base URL.
      } on TimeoutException {
        // Try next base URL.
      } on HttpException {
        // Try next base URL.
      } on FormatException {
        throw const UnifiedAccountServiceException(
          'The server returned an invalid unified account response.',
        );
      }
    }

    throw UnifiedAccountServiceException(
      receivedServerResponse
          ? 'Unified account request failed.'
          : 'Cannot reach the backend. Check that it is running.',
    );
  }

  @override
  Future<UnifiedAccountSessionResult> fetchSession({
    String? accountId,
    String? email,
    String? activeMode,
    String? companyId,
  }) {
    return _request(
      method: 'GET',
      path: '/api/auth/session',
      query: {
        if ((accountId ?? '').trim().isNotEmpty) 'accountId': accountId!.trim(),
        if ((email ?? '').trim().isNotEmpty) 'email': email!.trim(),
        if ((activeMode ?? '').trim().isNotEmpty) 'activeMode': activeMode!.trim(),
        if ((companyId ?? '').trim().isNotEmpty) 'companyId': companyId!.trim(),
      },
    );
  }

  @override
  Future<UnifiedAccountSessionResult> switchRole({
    required String accountId,
    required String activeMode,
    String? companyId,
  }) {
    return _request(
      method: 'POST',
      path: '/api/auth/switch-role',
      payload: {
        'accountId': accountId.trim(),
        'activeMode': activeMode.trim(),
        if ((companyId ?? '').trim().isNotEmpty) 'companyId': companyId!.trim(),
      },
    );
  }

  @override
  Future<UnifiedAccountSessionResult> updateProfileImage({
    required String accountId,
    required String profileImageUrl,
  }) {
    return _request(
      method: 'POST',
      path: '/api/account/profile-image',
      payload: {
        'accountId': accountId.trim(),
        'profileImageUrl': profileImageUrl.trim(),
      },
    );
  }

  @override
  Future<UnifiedAccountSessionResult> startBecomeSeller({
    required String accountId,
    required String companyName,
    String businessType = '',
    String planName = 'Starter Seller Plan',
    String sellerKind = '',
    Map<String, String> payoutBank = const <String, String>{},
    String storeAddress = '',
    double? storeLatitude,
    double? storeLongitude,
  }) {
    return _request(
      method: 'POST',
      path: '/api/account/become-seller/start',
      payload: {
        'accountId': accountId.trim(),
        'companyName': companyName.trim(),
        'businessType': businessType.trim(),
        'planName': planName.trim(),
        'sellerKind': sellerKind.trim(),
        'payoutBank': payoutBank,
        'storeAddress': storeAddress.trim(),
        'storeLatitude': ?storeLatitude,
        'storeLongitude': ?storeLongitude,
      },
    );
  }

  @override
  Future<void> addSellerDocument({
    required String accountId,
    required String companyId,
    required String type,
    required String url,
    String fileName = '',
    String label = '',
  }) async {
    await _request(
      method: 'POST',
      path: '/api/account/become-seller/documents',
      payload: {
        'accountId': accountId.trim(),
        'companyId': companyId.trim(),
        'type': type.trim(),
        'url': url.trim(),
        'fileName': fileName.trim(),
        'label': label.trim(),
      },
    );
  }

  @override
  Future<UnifiedAccountSessionResult> confirmBecomeSeller({
    required String accountId,
    required String companyId,
    String planName = 'Starter Seller Plan',
    String billingCycle = 'monthly',
    String paymentGateway = 'manual',
    String paymentReference = '',
    double amount = 0,
    String currencyCode = 'PHP',
  }) {
    return _request(
      method: 'POST',
      path: '/api/account/become-seller/confirm-payment',
      payload: {
        'accountId': accountId.trim(),
        'companyId': companyId.trim(),
        'planName': planName.trim(),
        'billingCycle': billingCycle.trim(),
        'paymentGateway': paymentGateway.trim(),
        'paymentReference': paymentReference.trim(),
        'amount': amount,
        'currencyCode': currencyCode.trim(),
      },
    );
  }

  @override
  Future<UnifiedAccountSessionResult> withdrawPendingCompany({
    required String accountId,
    required String companyId,
    String email = '',
    String reason = '',
  }) {
    return _request(
      method: 'POST',
      path: '/api/account/become-seller/withdraw-company',
      payload: {
        'accountId': accountId.trim(),
        'companyId': companyId.trim(),
        if (email.trim().isNotEmpty) 'email': email.trim(),
        if (reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
  }

  @override
  Future<UnifiedSellerCatalogResult> fetchSellerPlanCatalog() async {
    final decoded = await _requestRaw(
      method: 'GET',
      path: '/api/account/seller-plans',
    );
    final catalogRaw = decoded['catalog'];
    final catalog = catalogRaw is Map<String, dynamic>
        ? catalogRaw
        : catalogRaw is Map
            ? Map<String, dynamic>.from(catalogRaw)
            : const <String, dynamic>{};
    return UnifiedSellerCatalogResult(
      catalog: catalog,
      message: decoded['message']?.toString() ?? 'Seller plans loaded.',
      firstCompanyFree: decoded['firstCompanyFree'] != false &&
          catalog['firstCompanyFree'] != false,
      requiresPaidPlan: decoded['requiresPaidPlan'] == true ||
          catalog['requiresPaidPlan'] == true,
      canSubmitFreeFirst: (decoded['requiresPaidPlan'] != true &&
              catalog['requiresPaidPlan'] != true) &&
          decoded['canSubmitFreeFirst'] != false &&
          catalog['canSubmitFreeFirst'] != false,
      existingCompanyCount:
          int.tryParse('${decoded['existingCompanyCount'] ?? catalog['existingCompanyCount'] ?? 0}') ??
              0,
    );
  }

  @override
  Future<UnifiedCheckoutIntentResult> createSellerCheckoutIntent({
    required String accountId,
    required String companyId,
    String planName = 'Starter Seller Plan',
    String billingCycle = 'monthly',
    String paymentGateway = 'manual',
    String paymentReference = '',
    double amount = 0,
    String currencyCode = 'PHP',
  }) async {
    final decoded = await _requestRaw(
      method: 'POST',
      path: '/api/account/become-seller/checkout-intent',
      payload: {
        'accountId': accountId.trim(),
        'companyId': companyId.trim(),
        'planName': planName.trim(),
        'billingCycle': billingCycle.trim(),
        'paymentGateway': paymentGateway.trim(),
        'paymentReference': paymentReference.trim(),
        'amount': amount,
        'currencyCode': currencyCode.trim(),
      },
    );
    final checkoutIntentRaw = decoded['checkoutIntent'];
    final checkoutIntent = checkoutIntentRaw is Map<String, dynamic>
        ? checkoutIntentRaw
        : checkoutIntentRaw is Map
            ? Map<String, dynamic>.from(checkoutIntentRaw)
            : const <String, dynamic>{};
    return UnifiedCheckoutIntentResult(
      checkoutIntent: checkoutIntent,
      message:
          decoded['message']?.toString() ?? 'Seller checkout intent created.',
    );
  }

  @override
  Future<String> changePassword({
    required String accountId,
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
    String email = '',
  }) async {
    final decoded = await _requestRaw(
      method: 'POST',
      path: '/api/account/change-password',
      payload: {
        'accountId': accountId.trim(),
        if (email.trim().isNotEmpty) 'email': email.trim(),
        'currentPassword': currentPassword,
        'newPassword': newPassword,
        'confirmPassword': confirmPassword,
      },
    );
    return decoded['message']?.toString() ?? 'Password updated successfully.';
  }

  SellerSwitchPinResult _pinResult(Map<String, dynamic> decoded) {
    final workspaceStatus =
        decoded['workspaceStatus']?.toString().trim().toLowerCase() ?? '';
    final workspaceBlocked = decoded['workspaceBlocked'] == true ||
        const {
          'banned',
          'pending_review',
          'pending_payment',
          'deactivated',
          'suspended',
        }.contains(workspaceStatus);
    return SellerSwitchPinResult(
      hasPin: decoded['hasPin'] == true,
      message: decoded['message']?.toString() ?? '',
      unlockToken: decoded['unlockToken']?.toString() ?? '',
      companyId: decoded['companyId']?.toString() ?? '',
      companyName: decoded['companyName']?.toString() ?? '',
      pinResetRequired: decoded['pinResetRequired'] == true,
      pinResetReason: decoded['pinResetReason']?.toString() ?? '',
      workspaceBlocked: workspaceBlocked,
      workspaceStatus: workspaceStatus,
      banReason: decoded['banReason']?.toString() ?? '',
      banDescription: decoded['banDescription']?.toString() ?? '',
    );
  }

  @override
  Future<SellerSwitchPinResult> fetchSellerSwitchPinStatus({
    required String accountId,
    String companyId = '',
    String email = '',
  }) async {
    final decoded = await _requestRaw(
      method: 'POST',
      path: '/api/account/seller-switch-pin/status',
      payload: {
        'accountId': accountId.trim(),
        if (companyId.trim().isNotEmpty) 'companyId': companyId.trim(),
        if (email.trim().isNotEmpty) 'email': email.trim(),
      },
    );
    return _pinResult(decoded);
  }

  @override
  Future<SellerSwitchPinResult> setSellerSwitchPin({
    required String accountId,
    required String pin,
    required String confirmPin,
    String companyId = '',
    String email = '',
  }) async {
    final decoded = await _requestRaw(
      method: 'POST',
      path: '/api/account/seller-switch-pin/set',
      payload: {
        'accountId': accountId.trim(),
        'pin': pin,
        'confirmPin': confirmPin,
        if (companyId.trim().isNotEmpty) 'companyId': companyId.trim(),
        if (email.trim().isNotEmpty) 'email': email.trim(),
      },
    );
    return _pinResult(decoded);
  }

  @override
  Future<SellerSwitchPinResult> verifySellerSwitchPin({
    required String accountId,
    required String pin,
    String companyId = '',
    String email = '',
  }) async {
    final decoded = await _requestRaw(
      method: 'POST',
      path: '/api/account/seller-switch-pin/verify',
      payload: {
        'accountId': accountId.trim(),
        'pin': pin,
        if (companyId.trim().isNotEmpty) 'companyId': companyId.trim(),
        if (email.trim().isNotEmpty) 'email': email.trim(),
      },
    );
    return _pinResult(decoded);
  }
}
