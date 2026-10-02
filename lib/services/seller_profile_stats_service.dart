import 'package:switch_app/services/seller_profile_stats_service_base.dart';

import 'seller_profile_stats_service_stub.dart'
    if (dart.library.io) 'seller_profile_stats_service_io.dart'
    as service;

export 'seller_profile_stats_service_base.dart';

SellerProfileStatsService createSellerProfileStatsService() =>
    service.createSellerProfileStatsService();
