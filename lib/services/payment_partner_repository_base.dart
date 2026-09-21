import 'package:switch_app/models/payment_partner.dart';

abstract class PaymentPartnerRepository {
  Future<List<PaymentPartner>> fetchPaymentPartners({
    bool forceRefresh = false,
  });
}
