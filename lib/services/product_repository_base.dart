import 'dart:typed_data';

import 'package:switch_app/models/product.dart';

abstract class ProductRepository {
  Future<List<Product>> fetchProducts({bool forceRefresh = false});

  Future<List<Product>> searchProductsByImage({
    required Uint8List imageBytes,
    required String filename,
  });
}
