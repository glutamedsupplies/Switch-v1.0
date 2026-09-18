import 'package:gms_shopping/models/buyer_platform_summary.dart';

abstract class PlatformRepository {
  Future<List<BuyerPlatformSummary>> fetchPlatforms({bool forceRefresh = false});
}

class PlatformRepositoryException implements Exception {
  PlatformRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}
