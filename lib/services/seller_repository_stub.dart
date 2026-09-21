import 'package:switch_app/models/seller_summary.dart';
import 'package:switch_app/services/seller_repository_base.dart';

SellerRepository createSellerRepository({String? baseUrl}) {
  return _UnsupportedSellerRepository();
}

class _UnsupportedSellerRepository implements SellerRepository {
  @override
  Future<List<SellerSummary>> fetchSellers({bool forceRefresh = false}) {
    throw UnsupportedError(
      'This platform does not support the seller repository.',
    );
  }
}
