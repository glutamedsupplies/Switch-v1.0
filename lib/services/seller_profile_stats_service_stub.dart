import 'package:switch_app/services/seller_profile_stats_service_base.dart';

SellerProfileStatsService createSellerProfileStatsService() =>
    _StubSellerProfileStatsService();

class _StubSellerProfileStatsService implements SellerProfileStatsService {
  @override
  Future<SellerProfileStats?> fetchStats(String adminId) async => null;
}
