import 'package:switch_app/models/delivery_partner.dart';
import 'package:switch_app/services/delivery_partner_repository_base.dart';

DeliveryPartnerRepository createDeliveryPartnerRepository({String? baseUrl}) {
  return _UnsupportedDeliveryPartnerRepository();
}

class _UnsupportedDeliveryPartnerRepository
    implements DeliveryPartnerRepository {
  @override
  Future<List<DeliveryPartner>> fetchDeliveryPartners({
    bool forceRefresh = false,
  }) {
    throw UnsupportedError(
      'This platform does not support the delivery partner repository.',
    );
  }
}
