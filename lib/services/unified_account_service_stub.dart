import 'package:gms_shopping/services/unified_account_service_base.dart';

UnifiedAccountService createUnifiedAccountService() =>
    const _UnsupportedUnifiedAccountService();

class _UnsupportedUnifiedAccountService implements UnifiedAccountService {
  const _UnsupportedUnifiedAccountService();

  UnifiedAccountServiceException get _error => const UnifiedAccountServiceException(
        'Unified account features are unavailable on this platform.',
      );

  @override
  Future<UnifiedAccountSessionResult> fetchSession({
    String? accountId,
    String? email,
    String? activeMode,
    String? companyId,
  }) async {
    throw _error;
  }

  @override
  Future<UnifiedAccountSessionResult> switchRole({
    required String accountId,
    required String activeMode,
    String? companyId,
  }) async {
    throw _error;
  }

  @override
  Future<UnifiedAccountSessionResult> updateProfileImage({
    required String accountId,
    required String profileImageUrl,
  }) async {
    throw _error;
  }

  @override
  Future<UnifiedAccountSessionResult> startBecomeSeller({
    required String accountId,
    required String companyName,
    String businessType = '',
    String planName = 'Starter Seller Plan',
  }) async {
    throw _error;
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
  }) async {
    throw _error;
  }

  @override
  Future<UnifiedSellerCatalogResult> fetchSellerPlanCatalog() async {
    throw _error;
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
    throw _error;
  }

  @override
  Future<String> changePassword({
    required String accountId,
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
    String email = '',
  }) async {
    throw _error;
  }

  @override
  Future<SellerSwitchPinResult> fetchSellerSwitchPinStatus({
    required String accountId,
    String companyId = '',
    String email = '',
  }) async {
    throw _error;
  }

  @override
  Future<SellerSwitchPinResult> setSellerSwitchPin({
    required String accountId,
    required String pin,
    required String confirmPin,
    String companyId = '',
    String email = '',
  }) async {
    throw _error;
  }

  @override
  Future<SellerSwitchPinResult> verifySellerSwitchPin({
    required String accountId,
    required String pin,
    String companyId = '',
    String email = '',
  }) async {
    throw _error;
  }
}
