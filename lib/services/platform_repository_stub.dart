import 'package:switch_app/models/buyer_platform_summary.dart';
import 'package:switch_app/services/platform_repository_base.dart';

PlatformRepository createPlatformRepository({String? baseUrl}) {
  return _StubPlatformRepository();
}

class _StubPlatformRepository implements PlatformRepository {
  @override
  Future<List<BuyerPlatformSummary>> fetchPlatforms({bool forceRefresh = false}) {
    return Future<List<BuyerPlatformSummary>>.value(const <BuyerPlatformSummary>[
      BuyerPlatformSummary(
        id: 'shop',
        name: 'Shop',
        sortOrder: 1,
        primaryColor: '#2563eb',
      ),
      BuyerPlatformSummary(
        id: 'food',
        name: 'Food',
        sortOrder: 2,
        primaryColor: '#ea580c',
      ),
      BuyerPlatformSummary(
        id: 'hotels',
        name: 'Hotels',
        sortOrder: 3,
        primaryColor: '#7c3aed',
      ),
    ]);
  }
}
