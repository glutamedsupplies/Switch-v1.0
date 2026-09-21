import 'package:flutter/material.dart';
import 'package:switch_app/add_to_cart.dart';
import 'package:switch_app/models/product.dart';

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
