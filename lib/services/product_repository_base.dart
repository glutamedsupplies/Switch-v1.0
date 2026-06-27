import 'dart:typed_data';

import 'package:gms_shopping/models/product.dart';

abstract class ProductRepository {
  Future<List<Product>> fetchProducts({bool forceRefresh = false});

  Future<List<Product>> searchProductsByImage({
    required Uint8List imageBytes,
    required String filename,
  });
}
