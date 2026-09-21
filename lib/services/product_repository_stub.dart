import 'dart:typed_data';

import 'package:switch_app/models/product.dart';
import 'package:switch_app/services/product_repository_base.dart';

ProductRepository createProductRepository({String? baseUrl}) {
  return _UnsupportedProductRepository();
}

class _UnsupportedProductRepository implements ProductRepository {
  @override
  Future<List<Product>> fetchProducts({bool forceRefresh = false}) {
    throw UnsupportedError(
      'This platform does not support the product repository.',
    );
  }

  @override
  Future<List<Product>> searchProductsByImage({
    required Uint8List imageBytes,
    required String filename,
  }) {
    throw UnsupportedError(
      'This platform does not support visual product search.',
    );
  }
}
