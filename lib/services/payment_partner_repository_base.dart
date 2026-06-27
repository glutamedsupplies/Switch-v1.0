import 'package:gms_shopping/models/payment_partner.dart';

abstract class PaymentPartnerRepository {
  Future<List<PaymentPartner>> fetchPaymentPartners({
    bool forceRefresh = false,
  });
}
