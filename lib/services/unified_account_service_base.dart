class UnifiedAccountServiceException implements Exception {
  const UnifiedAccountServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}

class UnifiedAccountSessionResult {
  const UnifiedAccountSessionResult({
    required this.session,
    required this.message,
  });

  final Map<String, dynamic> session;
  final String message;
}

class UnifiedSellerCatalogResult {
  const UnifiedSellerCatalogResult({
    required this.catalog,
    required this.message,
  });

  final Map<String, dynamic> catalog;
  final String message;
}

class UnifiedCheckoutIntentResult {
  const UnifiedCheckoutIntentResult({
    required this.checkoutIntent,
    required this.message,
  });

  final Map<String, dynamic> checkoutIntent;
  final String message;
}

class SellerSwitchPinResult {
  const SellerSwitchPinResult({
    required this.hasPin,
    required this.message,
    this.unlockToken = '',
    this.companyId = '',
    this.companyName = '',
  });

  final bool hasPin;
  final String message;
  final String unlockToken;
  final String companyId;
  final String companyName;
}

abstract class UnifiedAccountService {
  Future<UnifiedAccountSessionResult> fetchSession({
    String? accountId,
    String? email,
    String? activeMode,
    String? companyId,
  });

  Future<UnifiedAccountSessionResult> switchRole({
    required String accountId,
    required String activeMode,
    String? companyId,
  });

  Future<UnifiedAccountSessionResult> updateProfileImage({
    required String accountId,
    required String profileImageUrl,
  });

  Future<UnifiedAccountSessionResult> startBecomeSeller({
    required String accountId,
    required String companyName,
    String businessType = '',
    String planName = 'Starter Seller Plan',
  });

  Future<UnifiedAccountSessionResult> confirmBecomeSeller({
    required String accountId,
    required String companyId,
    String planName = 'Starter Seller Plan',
    String billingCycle = 'monthly',
    String paymentGateway = 'manual',
    String paymentReference = '',
    double amount = 0,
    String currencyCode = 'PHP',
  });

  Future<UnifiedSellerCatalogResult> fetchSellerPlanCatalog();

  Future<UnifiedCheckoutIntentResult> createSellerCheckoutIntent({
    required String accountId,
    required String companyId,
    String planName = 'Starter Seller Plan',
    String billingCycle = 'monthly',
    String paymentGateway = 'manual',
    String paymentReference = '',
    double amount = 0,
    String currencyCode = 'PHP',
  });

  Future<String> changePassword({
    required String accountId,
    required String currentPassword,
    required String newPassword,
    required String confirmPassword,
    String email = '',
  });

  Future<SellerSwitchPinResult> fetchSellerSwitchPinStatus({
    required String accountId,
    String companyId = '',
    String email = '',
  });

  Future<SellerSwitchPinResult> setSellerSwitchPin({
    required String accountId,
    required String pin,
    required String confirmPin,
    String companyId = '',
    String email = '',
  });

  Future<SellerSwitchPinResult> verifySellerSwitchPin({
    required String accountId,
    required String pin,
    String companyId = '',
    String email = '',
  });
}
