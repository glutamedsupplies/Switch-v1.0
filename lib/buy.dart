import 'package:flutter/material.dart';
import 'package:gms_shopping/add_to_cart.dart';
import 'package:gms_shopping/models/product.dart';

typedef BuySelection = AddToCartSelection;

Future<BuySelection?> showBuyModal(
  BuildContext context, {
  required Product product,
  List<Product> catalogProducts = const <Product>[],
  ProductVariant? selectedVariant,
  int? discountPercent,
  bool showsTopBrand = false,
}) {
  return showAddToCartModal(
    context,
    product: product,
    catalogProducts: catalogProducts,
    selectedVariant: selectedVariant,
    discountPercent: discountPercent,
    showsTopBrand: showsTopBrand,
    submitButtonVerb: 'Buy',
  );
}
