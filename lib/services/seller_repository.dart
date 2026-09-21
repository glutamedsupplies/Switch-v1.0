import 'package:switch_app/services/seller_repository_base.dart';

import 'seller_repository_stub.dart'
    if (dart.library.io) 'seller_repository_io.dart'
    if (dart.library.html) 'seller_repository_web.dart' as repository;

export 'seller_repository_base.dart';

final Map<String, SellerRepository> _sellerRepositoriesByBaseUrl =
    <String, SellerRepository>{};

SellerRepository createSellerRepository({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _sellerRepositoriesByBaseUrl.putIfAbsent(
    cacheKey,
    () => repository.createSellerRepository(baseUrl: baseUrl),
  );
}
