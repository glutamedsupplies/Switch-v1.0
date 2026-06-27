import 'package:gms_shopping/services/delivery_partner_repository_base.dart';

import 'delivery_partner_repository_stub.dart'
    if (dart.library.io) 'delivery_partner_repository_io.dart'
    if (dart.library.html) 'delivery_partner_repository_web.dart' as repository;

export 'delivery_partner_repository_base.dart';

final Map<String, DeliveryPartnerRepository>
    _deliveryPartnerRepositoriesByBaseUrl =
    <String, DeliveryPartnerRepository>{};

DeliveryPartnerRepository createDeliveryPartnerRepository({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _deliveryPartnerRepositoriesByBaseUrl.putIfAbsent(
    cacheKey,
    () => repository.createDeliveryPartnerRepository(baseUrl: baseUrl),
  );
}
