import 'package:switch_app/services/product_repository_base.dart';

import 'product_repository_stub.dart'
    if (dart.library.io) 'product_repository_io.dart'
    if (dart.library.html) 'product_repository_web.dart' as repository;

export 'product_repository_base.dart';

final Map<String, ProductRepository> _productRepositoriesByBaseUrl =
    <String, ProductRepository>{};

ProductRepository createProductRepository({String? baseUrl}) {
  final cacheKey = baseUrl?.trim() ?? '';
  return _productRepositoriesByBaseUrl.putIfAbsent(
    cacheKey,
    () => repository.createProductRepository(baseUrl: baseUrl),
  );
}
