import 'package:switch_app/services/payment_partner_repository_base.dart';

import 'payment_partner_repository_stub.dart'
    if (dart.library.io) 'payment_partner_repository_io.dart'
    if (dart.library.html) 'payment_partner_repository_web.dart' as repository;

export 'payment_partner_repository_base.dart';

final Map<String, PaymentPartnerRepository> _paymentPartnerRepositoryCache =
    <String, PaymentPartnerRepository>{};

PaymentPartnerRepository createPaymentPartnerRepository({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _paymentPartnerRepositoryCache.putIfAbsent(
    cacheKey,
    () => repository.createPaymentPartnerRepository(baseUrl: baseUrl),
  );
}
