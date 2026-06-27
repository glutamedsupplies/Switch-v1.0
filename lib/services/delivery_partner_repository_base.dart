import 'package:gms_shopping/models/delivery_partner.dart';

abstract class DeliveryPartnerRepository {
  Future<List<DeliveryPartner>> fetchDeliveryPartners({
    bool forceRefresh = false,
  });
}
