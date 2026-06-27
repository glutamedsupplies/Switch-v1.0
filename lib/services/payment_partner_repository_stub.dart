import 'package:gms_shopping/models/payment_partner.dart';
import 'package:gms_shopping/services/payment_partner_repository_base.dart';

PaymentPartnerRepository createPaymentPartnerRepository({String? baseUrl}) {
  return _UnsupportedPaymentPartnerRepository();
}

class _UnsupportedPaymentPartnerRepository implements PaymentPartnerRepository {
  @override
  Future<List<PaymentPartner>> fetchPaymentPartners({
    bool forceRefresh = false,
  }) {
    throw const PaymentPartnerRepositoryException(
      'Payment partners are not supported on this platform.',
    );
  }
}

class PaymentPartnerRepositoryException implements Exception {
  const PaymentPartnerRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}
