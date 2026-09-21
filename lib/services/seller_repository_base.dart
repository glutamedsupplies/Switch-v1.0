import 'package:switch_app/models/seller_summary.dart';

abstract class SellerRepository {
  Future<List<SellerSummary>> fetchSellers({bool forceRefresh = false});
}

class SellerRepositoryException implements Exception {
  const SellerRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}
