import 'package:switch_app/models/delivery_partner.dart';

abstract class DeliveryPartnerRepository {
  Future<List<DeliveryPartner>> fetchDeliveryPartners({
    bool forceRefresh = false,
  });
}
