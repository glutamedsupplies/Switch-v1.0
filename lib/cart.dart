import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart' show compute;
import 'package:switch_app/place_order.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/product_details.dart';
import 'package:switch_app/search_bar.dart';
import 'package:switch_app/services/flash_deals_service.dart';
import 'package:switch_app/services/analytics_event_service.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/widgets/search_not_found_art.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum CartPageAction { openShop }

/// Normalizes buyer platform ids used to scope carts (shop vs food, etc.).
String normalizeCartPlatformId(String? platformId) {
  final id = (platformId ?? '').trim().toLowerCase();
  if (id.isEmpty || id == 'none') {
    return 'shop';
  }
  return id;
}

String cartPlatformDisplayName(String? platformId) {
  switch (normalizeCartPlatformId(platformId)) {
    case 'food':
      return 'Food';
    case 'shop':
      return 'Shop';
    default:
      final id = normalizeCartPlatformId(platformId);
      return id[0].toUpperCase() + id.substring(1);
  }
}

Future<CartPageAction?> openCartPage(
  BuildContext context, {
  String platformId = '',
}) async {
  if (platformId.trim().isNotEmpty) {
    await CartStore.instance.setActivePlatform(platformId);
  } else {
    await CartStore.instance.ensureLoaded();
  }

  if (!context.mounted) {
    return null;
  }

  return Navigator.of(context).push<CartPageAction>(
    MaterialPageRoute<CartPageAction>(
      builder: (_) => CartPage(platformId: CartStore.instance.activePlatformId),
    ),
  );
}

int cartTotalItemCount(Iterable<CartItemData> items) {
  return items.fold<int>(0, (total, item) => total + item.quantity);
}

int cartEntryCount(Iterable<CartItemData> items) {
  return items.length;
}

BookingLineItem _bookingLineItemFromCartItem(CartItemData item) {
  return BookingLineItem(
    referenceKey: item.entryKey,
    adminId: item.adminId,
    productId: item.productId,
    productName: item.productName,
    productImageUrl: item.productImageUrl,
    category: item.category,
    deliveryPartnerIds: item.deliveryPartnerIds,
    paymentPartnerIds: item.paymentPartnerIds,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    originalUnitPrice: item.originalUnitPrice,
    variantId: item.variantId,
    variantName: item.variantName,
    variantAddOns: item.variantAddOns,
    productRating: item.productRating,
    showsTopBrand: item.showsTopBrand,
    availableStock: item.availableStock,
    companyName: item.companyName,
    flashDealId: item.flashDealId,
    flashReservationId: item.flashReservationId,
    reservationExpiresAt: item.reservationExpiresAt,
  );
}

bool _isCartProductInTopSelling(
  Product product,
  List<Product> products, {
  int limit = 10,
}) {
  final rankedProducts =
      [...filterVisibleProducts(products).where((product) => product.sold > 0)]
        ..sort((first, second) {
          final soldCompare = second.sold.compareTo(first.sold);
          if (soldCompare != 0) {
            return soldCompare;
          }

          final ratingCompare = second.rating.compareTo(first.rating);
          if (ratingCompare != 0) {
            return ratingCompare;
          }

          return first.name.compareTo(second.name);
        });

  return rankedProducts
      .take(limit)
      .any((candidate) => candidate.id == product.id);
}

class CartItemData {
  const CartItemData({
    this.adminId = '',
    required this.productId,
    required this.productName,
    required this.productImageUrl,
    required this.category,
    this.deliveryPartnerIds = const <String>[],
    this.paymentPartnerIds = const <String>[],
    required this.quantity,
    required this.unitPrice,
    required this.originalUnitPrice,
    required this.variantId,
    required this.variantName,
    this.variantAddOns = const <ProductVariantAddOn>[],
    this.productRating = 0,
    this.showsTopBrand = false,
    this.availableStock = 0,
    this.companyName = '',
    this.flashDealId = '',
    this.flashReservationId = '',
    this.reservationExpiresAt = '',
  });

  final String productId;
  final String adminId;
  final String productName;
  final String productImageUrl;
  final String category;
  final List<String> deliveryPartnerIds;
  final List<String> paymentPartnerIds;
  final int quantity;
  final double unitPrice;
  final double originalUnitPrice;
  final String variantId;
  final String variantName;
  final List<ProductVariantAddOn> variantAddOns;
  final double productRating;
  final bool showsTopBrand;
  final int availableStock;
  final String companyName;
  final String flashDealId;
  final String flashReservationId;
  final String reservationExpiresAt;

  String get entryKey =>
      '${adminId.trim()}::${productId.trim()}::${variantId.trim()}';

  bool get hasVariant => variantName.trim().isNotEmpty;
  bool get hasStock => availableStock > 0;
  bool get hasFlashLock =>
      flashDealId.trim().isNotEmpty && flashReservationId.trim().isNotEmpty;
  bool get hasDiscount =>
      unitPrice >= 0 && originalUnitPrice > 0 && unitPrice < originalUnitPrice;
  bool get showsTopReviews => productRating >= 4.5 && productRating <= 5;
  String get stockLabel => hasStock ? 'Stock: $availableStock' : 'Sold out';
  DateTime? get reservationExpiresAtDate =>
      DateTime.tryParse(reservationExpiresAt.trim());
  bool get isFlashReservationExpired {
    if (!hasFlashLock) return false;
    final expiresAt = reservationExpiresAtDate;
    if (expiresAt == null) return true;
    return !expiresAt.toUtc().isAfter(DateTime.now().toUtc());
  }

  int? get discountPercent {
    if (!hasDiscount || originalUnitPrice <= 0) {
      return null;
    }

    final percent =
        (((originalUnitPrice - unitPrice) / originalUnitPrice) * 100).round();
    return percent > 0 ? percent : null;
  }

  double get totalPrice => unitPrice * quantity;
  double get totalOriginalPrice => originalUnitPrice * quantity;

  CartItemData copyWith({
    String? adminId,
    String? productId,
    String? productName,
    String? productImageUrl,
    String? category,
    List<String>? deliveryPartnerIds,
    List<String>? paymentPartnerIds,
    int? quantity,
    double? unitPrice,
    double? originalUnitPrice,
    String? variantId,
    String? variantName,
    List<ProductVariantAddOn>? variantAddOns,
    double? productRating,
    bool? showsTopBrand,
    int? availableStock,
    String? companyName,
    String? flashDealId,
    String? flashReservationId,
    String? reservationExpiresAt,
    bool clearFlashLock = false,
  }) {
    return CartItemData(
      adminId: adminId ?? this.adminId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      productImageUrl: productImageUrl ?? this.productImageUrl,
      category: category ?? this.category,
      deliveryPartnerIds: deliveryPartnerIds ?? this.deliveryPartnerIds,
      paymentPartnerIds: paymentPartnerIds ?? this.paymentPartnerIds,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      originalUnitPrice: originalUnitPrice ?? this.originalUnitPrice,
      variantId: variantId ?? this.variantId,
      variantName: variantName ?? this.variantName,
      variantAddOns: variantAddOns ?? this.variantAddOns,
      productRating: productRating ?? this.productRating,
      showsTopBrand: showsTopBrand ?? this.showsTopBrand,
      availableStock: availableStock ?? this.availableStock,
      companyName: companyName ?? this.companyName,
      flashDealId: clearFlashLock ? '' : (flashDealId ?? this.flashDealId),
      flashReservationId: clearFlashLock
          ? ''
          : (flashReservationId ?? this.flashReservationId),
      reservationExpiresAt: clearFlashLock
          ? ''
          : (reservationExpiresAt ?? this.reservationExpiresAt),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'productId': productId,
      'adminId': adminId,
      'productName': productName,
      'productImageUrl': productImageUrl,
      'category': category,
      'deliveryPartnerIds': deliveryPartnerIds,
      'paymentPartnerIds': paymentPartnerIds,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'originalUnitPrice': originalUnitPrice,
      'variantId': variantId,
      'variantName': variantName,
      'variantAddOns': variantAddOns
          .map(
            (addOn) => <String, dynamic>{
              'id': addOn.id,
              'name': addOn.name,
              'quantity': addOn.quantity,
            },
          )
          .toList(growable: false),
      'productRating': productRating,
      'showsTopBrand': showsTopBrand,
      'availableStock': availableStock,
      'companyName': companyName,
      'flashDealId': flashDealId,
      'flashReservationId': flashReservationId,
      'reservationExpiresAt': reservationExpiresAt,
    };
  }

  factory CartItemData.fromJson(Map<String, dynamic> json) {
    return CartItemData(
      adminId:
          json['adminId']?.toString() ??
          json['tenantId']?.toString() ??
          json['ownerAdminId']?.toString() ??
          '',
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? '',
      productImageUrl: json['productImageUrl']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      deliveryPartnerIds: _normalizeCartStringList(
        json['deliveryPartnerIds'] as List<dynamic>?,
      ),
      paymentPartnerIds: _normalizeCartStringList(
        json['paymentPartnerIds'] as List<dynamic>?,
      ),
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      originalUnitPrice:
          (json['originalUnitPrice'] as num?)?.toDouble() ??
          (json['unitPrice'] as num?)?.toDouble() ??
          0,
      variantId: json['variantId']?.toString() ?? '',
      variantName: json['variantName']?.toString() ?? '',
      variantAddOns: (json['variantAddOns'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (entry) =>
                ProductVariantAddOn.fromJson(Map<String, dynamic>.from(entry)),
          )
          .where(
            (addOn) =>
                addOn.id.trim().isNotEmpty && addOn.name.trim().isNotEmpty,
          )
          .toList(growable: false),
      productRating: (json['productRating'] as num?)?.toDouble() ?? 0,
      showsTopBrand: json['showsTopBrand'] == true,
      companyName: json['companyName']?.toString() ?? '',
      availableStock:
          (json['availableStock'] as num?)?.toInt() ??
          (json['stock'] as num?)?.toInt() ??
          0,
      flashDealId: json['flashDealId']?.toString() ?? '',
      flashReservationId: json['flashReservationId']?.toString() ?? '',
      reservationExpiresAt: json['reservationExpiresAt']?.toString() ?? '',
    );
  }
}

List<String> _normalizeCartStringList(List<dynamic>? rawValues) {
  final normalizedValues = <String>[];
  final seen = <String>{};

  for (final candidate in rawValues ?? const <dynamic>[]) {
    final value = candidate?.toString().trim() ?? '';
    final normalizedKey = value.toLowerCase();
    if (value.isEmpty || seen.contains(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.add(value);
  }

  return List<String>.unmodifiable(normalizedValues);
}

bool _areStringListsEqual(List<String> left, List<String> right) {
  if (left.length != right.length) {
    return false;
  }

  for (var index = 0; index < left.length; index += 1) {
    if (left[index] != right[index]) {
      return false;
    }
  }

  return true;
}

Future<List<CartItemData>> _decodeStoredCartItemsInBackground(
  String rawCartItems,
) {
  return compute(_decodeStoredCartItems, rawCartItems);
}

List<CartItemData> _decodeStoredCartItems(String rawCartItems) {
  final decoded = jsonDecode(rawCartItems) as List<dynamic>;

  return decoded
      .whereType<Map>()
      .map((entry) => CartItemData.fromJson(Map<String, dynamic>.from(entry)))
      .where((item) => item.productId.trim().isNotEmpty && item.quantity > 0)
      .toList(growable: false);
}

class CartStore {
  CartStore._();

  static final CartStore instance = CartStore._();

  final ValueNotifier<List<CartItemData>> cartItemsNotifier =
      ValueNotifier<List<CartItemData>>(const <CartItemData>[]);

  bool _hasLoaded = false;
  String? _lastAccountId;
  String? _lastEmail;
  String _activePlatformId = 'shop';

  String get activePlatformId => _activePlatformId;

  /// Switches the in-memory cart to [platformId] (shop/food/…).
  /// Shop and Food keep separate persisted carts and never mix.
  Future<void> setActivePlatform(String platformId) async {
    final next = normalizeCartPlatformId(platformId);
    if (_hasLoaded && next == _activePlatformId) {
      return;
    }

    if (next != _activePlatformId) {
      _activePlatformId = next;
      _hasLoaded = false;
      cartItemsNotifier.value = const <CartItemData>[];
    }

    await ensureLoaded();
  }

  /// Force reload cart for the current account.
  /// Call this after login/logout to ensure correct cart is loaded.
  Future<void> reloadForCurrentAccount() async {
    _hasLoaded = false;
    _lastAccountId = null;
    _lastEmail = null;
    cartItemsNotifier.value = const <CartItemData>[];
    await ensureLoaded();
  }

  Future<String> _resolveAccountKeyPrefix() async {
    final accountId = await AuthSession.getAccountId();
    if (accountId != null && accountId.trim().isNotEmpty) {
      return 'cart_items_${accountId.trim()}';
    }
    // For guests, use email as fallback to ensure each guest session has its own cart
    final email = await AuthSession.getAccountEmail();
    if (email != null && email.trim().isNotEmpty) {
      return 'cart_items_${email.trim().hashCode.abs()}';
    }
    // Final fallback: use a random guest identifier
    return 'cart_items_guest_${DateTime.now().millisecondsSinceEpoch}';
  }

  /// Builds the per-account + per-platform storage key.
  Future<String> _resolveStorageKey() async {
    final prefix = await _resolveAccountKeyPrefix();
    return '${prefix}_p_${normalizeCartPlatformId(_activePlatformId)}';
  }

  /// Pre-platform-scoping key (shared cart). Used once to migrate into Shop.
  Future<String> _resolveLegacyStorageKey() async {
    return _resolveAccountKeyPrefix();
  }

  Future<List<CartItemData>> _hydrateItemsFromCatalog(
    List<CartItemData> items,
  ) async {
    if (items.isEmpty) {
      return items;
    }

    try {
      final catalogProducts = await createProductRepository().fetchProducts();
      if (catalogProducts.isEmpty) {
        return items;
      }

      final productsById = <String, Product>{
        for (final product in catalogProducts)
          product.id.trim().toLowerCase(): product,
      };

      return items
          .map((item) {
            final catalogProduct =
                productsById[item.productId.trim().toLowerCase()];
            if (catalogProduct == null) {
              return item;
            }
            final variant = findProductVariantById(
              catalogProduct,
              item.variantId,
            );
            final availableStock = resolveProductAvailableStock(
              catalogProduct,
              variant: variant,
              catalogProducts: catalogProducts,
            );

            return item.copyWith(
              productRating: catalogProduct.rating,
              showsTopBrand: _isCartProductInTopSelling(
                catalogProduct,
                catalogProducts,
              ),
              availableStock: availableStock,
              deliveryPartnerIds: catalogProduct.deliveryPartnerIds,
              paymentPartnerIds: catalogProduct.paymentPartnerIds,
              quantity: _normalizeCartQuantity(
                item.quantity,
                availableStock: availableStock,
              ),
            );
          })
          .toList(growable: false);
    } catch (_) {
      return items;
    }
  }

  bool _didHydrateItemMetadataChange(
    List<CartItemData> previous,
    List<CartItemData> next,
  ) {
    if (previous.length != next.length) {
      return true;
    }

    for (var index = 0; index < previous.length; index++) {
      final previousItem = previous[index];
      final nextItem = next[index];
      if (previousItem.productRating != nextItem.productRating ||
          previousItem.showsTopBrand != nextItem.showsTopBrand ||
          previousItem.availableStock != nextItem.availableStock ||
          !_areStringListsEqual(
            previousItem.deliveryPartnerIds,
            nextItem.deliveryPartnerIds,
          ) ||
          !_areStringListsEqual(
            previousItem.paymentPartnerIds,
            nextItem.paymentPartnerIds,
          )) {
        return true;
      }
    }

    return false;
  }

  Future<void> ensureLoaded() async {
    final accountId = await AuthSession.getAccountId();
    final email = await AuthSession.getAccountEmail();
    final trimmedAccountId = accountId?.trim();
    final trimmedEmail = email?.trim();
    final lastTrimmedAccountId = _lastAccountId?.trim();
    final lastTrimmedEmail = _lastEmail?.trim();

    // If the account changed, clear the cart and reload with the new key.
    // This ensures each account has its own separate cart.
    // Handle null comparisons properly - different null states mean different users
    final accountChanged =
        trimmedAccountId != lastTrimmedAccountId ||
        (trimmedAccountId == null) != (lastTrimmedAccountId == null);
    final emailChanged =
        trimmedEmail != lastTrimmedEmail ||
        (trimmedEmail == null) != (lastTrimmedEmail == null);

    if (_hasLoaded && (accountChanged || emailChanged)) {
      // Clear the in-memory cart first before reloading for new account
      cartItemsNotifier.value = const <CartItemData>[];
      _hasLoaded = false;
    }

    if (_hasLoaded) {
      return;
    }

    _lastAccountId = accountId;
    _lastEmail = email;
    _activePlatformId = normalizeCartPlatformId(_activePlatformId);

    final storageKey = await _resolveStorageKey();
    final preferences = await SharedPreferences.getInstance();
    var rawCartItems = preferences.getString(storageKey);

    // One-time migration: old shared cart → Shop cart only.
    if ((rawCartItems == null || rawCartItems.trim().isEmpty) &&
        _activePlatformId == 'shop') {
      final legacyKey = await _resolveLegacyStorageKey();
      if (legacyKey != storageKey) {
        final legacyRaw = preferences.getString(legacyKey);
        if (legacyRaw != null && legacyRaw.trim().isNotEmpty) {
          rawCartItems = legacyRaw;
          await preferences.setString(storageKey, legacyRaw);
          await preferences.remove(legacyKey);
        }
      }
    }

    if (rawCartItems == null || rawCartItems.trim().isEmpty) {
      cartItemsNotifier.value = const <CartItemData>[];
      _hasLoaded = true;
      return;
    }

    try {
      final loadedItems = await _decodeStoredCartItemsInBackground(
        rawCartItems,
      );
      final hydratedItems = await _hydrateItemsFromCatalog(loadedItems);

      cartItemsNotifier.value = List<CartItemData>.unmodifiable(hydratedItems);
      if (_didHydrateItemMetadataChange(loadedItems, hydratedItems)) {
        await _persist(hydratedItems);
      }
    } catch (_) {
      cartItemsNotifier.value = const <CartItemData>[];
    }

    _hasLoaded = true;
  }

  Future<void> addItem(
    Product product, {
    required int quantity,
    ProductVariant? selectedVariant,
    List<Product> catalogProducts = const <Product>[],
    bool showsTopBrand = false,
    String platformId = '',
  }) async {
    if (platformId.trim().isNotEmpty) {
      await setActivePlatform(platformId);
    } else {
      await ensureLoaded();
    }

    final variant = selectedVariant;
    final originalPrice = variant?.originalPrice ?? product.originalPrice;
    final availableStock = resolveProductAvailableStock(
      product,
      variant: variant,
      catalogProducts: catalogProducts,
    );
    var normalizedQuantity = _normalizeCartQuantity(
      quantity,
      availableStock: availableStock,
    );

    var unitPrice =
        variant?.displayPrice ??
        ((product.salesPrice != null &&
                product.salesPrice! >= 0 &&
                product.salesPrice! < product.originalPrice)
            ? product.salesPrice!
            : product.originalPrice);
    var flashDealId = '';
    var flashReservationId = '';
    var reservationExpiresAt = '';

    final scopedPlatform = platformId.trim().isNotEmpty
        ? platformId
        : activePlatformId;
    final liveDeal = await productLiveFlashDeal(
      productId: product.id,
      platformId: scopedPlatform,
      variantId: variant?.id,
    );

    final nextItems = List<CartItemData>.from(cartItemsNotifier.value);
    final provisionalKey =
        '${product.adminId.trim()}::${product.id.trim()}::${variant?.id.trim() ?? ''}';
    final existingIndex = nextItems.indexWhere(
      (item) => item.entryKey == provisionalKey,
    );
    final existingItem = existingIndex >= 0 ? nextItems[existingIndex] : null;
    final targetQuantity = existingItem == null
        ? normalizedQuantity
        : _normalizeCartQuantity(
            existingItem.quantity + normalizedQuantity,
            availableStock: availableStock,
          );

    if (liveDeal != null &&
        liveDeal.isLive &&
        liveDeal.flashPrice >= 0 &&
        liveDeal.flashPrice < originalPrice) {
      final cappedByDeal = liveDeal.dealStockRemaining > 0
          ? math.min(targetQuantity, liveDeal.dealStockRemaining)
          : targetQuantity;
      final cappedByBuyer = liveDeal.perBuyerLimit > 0
          ? math.min(cappedByDeal, liveDeal.perBuyerLimit)
          : cappedByDeal;
      final reserveQty = cappedByBuyer < 1 ? 1 : cappedByBuyer;

      try {
        final reservation = await reserveFlashDealStock(
          dealId: liveDeal.id,
          quantity: reserveQty,
          variantId: variant?.id ?? '',
          replaceReservationId: existingItem?.flashReservationId ?? '',
        );
        unitPrice = reservation.lockedUnitPrice > 0
            ? reservation.lockedUnitPrice
            : liveDeal.flashPrice;
        flashDealId = reservation.dealId;
        flashReservationId = reservation.id;
        reservationExpiresAt = reservation.expiresAt.toUtc().toIso8601String();
        normalizedQuantity = reserveQty;
      } on FlashDealReserveException {
        rethrow;
      } catch (_) {
        throw FlashDealReserveException(
          'Unable to lock Flash Deal price right now.',
        );
      }
    }

    final nextItem = CartItemData(
      adminId: product.adminId.trim(),
      productId: product.id.trim(),
      productName: product.name.trim().isEmpty
          ? 'Unnamed Product'
          : product.name,
      productImageUrl: (variant?.imageUrl.trim().isNotEmpty ?? false)
          ? variant!.imageUrl
          : product.imageUrl,
      category: product.category,
      deliveryPartnerIds: product.deliveryPartnerIds,
      paymentPartnerIds: product.paymentPartnerIds,
      quantity: flashReservationId.isNotEmpty
          ? normalizedQuantity
          : targetQuantity,
      unitPrice: unitPrice,
      originalUnitPrice: originalPrice,
      variantId: variant?.id ?? '',
      variantName: variant?.name ?? '',
      variantAddOns: variant?.addOns ?? const <ProductVariantAddOn>[],
      productRating: product.rating,
      showsTopBrand: showsTopBrand,
      availableStock: availableStock,
      companyName: product.companyName.trim(),
      flashDealId: flashDealId,
      flashReservationId: flashReservationId,
      reservationExpiresAt: reservationExpiresAt,
    );

    if (existingIndex >= 0) {
      final existing = nextItems[existingIndex];
      nextItems[existingIndex] = existing.copyWith(
        quantity: nextItem.quantity,
        unitPrice: nextItem.unitPrice,
        originalUnitPrice: nextItem.originalUnitPrice,
        productImageUrl: nextItem.productImageUrl,
        productName: nextItem.productName,
        adminId: nextItem.adminId,
        category: nextItem.category,
        variantName: nextItem.variantName,
        productRating: nextItem.productRating,
        showsTopBrand: nextItem.showsTopBrand,
        availableStock: nextItem.availableStock,
        companyName: nextItem.companyName,
        flashDealId: nextItem.flashDealId,
        flashReservationId: nextItem.flashReservationId,
        reservationExpiresAt: nextItem.reservationExpiresAt,
        clearFlashLock:
            nextItem.flashReservationId.isEmpty &&
            existing.flashReservationId.isNotEmpty,
      );
    } else {
      nextItems.insert(0, nextItem);
    }

    await _persist(nextItems);
    unawaited(
      analyticsEvents.record(
        eventName: 'added_to_cart',
        productId: product.id,
        platformId: scopedPlatform,
        source: 'cart',
        properties: <String, dynamic>{
          'quantity': nextItem.quantity,
          if (nextItem.variantId.isNotEmpty) 'variantId': nextItem.variantId,
        },
      ),
    );
  }

  Future<void> updateQuantity(String entryKey, int quantity) async {
    await ensureLoaded();

    final nextItems = List<CartItemData>.from(cartItemsNotifier.value);
    final itemIndex = nextItems.indexWhere((item) => item.entryKey == entryKey);
    if (itemIndex < 0) {
      return;
    }

    final current = nextItems[itemIndex];
    final normalizedQuantity = _normalizeCartQuantity(
      quantity,
      availableStock: current.availableStock,
    );

    if (current.hasFlashLock &&
        current.flashDealId.isNotEmpty &&
        normalizedQuantity != current.quantity) {
      try {
        final reservation = await reserveFlashDealStock(
          dealId: current.flashDealId,
          quantity: normalizedQuantity,
          variantId: current.variantId,
          replaceReservationId: current.flashReservationId,
        );
        nextItems[itemIndex] = current.copyWith(
          quantity: reservation.quantity > 0
              ? reservation.quantity
              : normalizedQuantity,
          unitPrice: reservation.lockedUnitPrice > 0
              ? reservation.lockedUnitPrice
              : current.unitPrice,
          flashDealId: reservation.dealId,
          flashReservationId: reservation.id,
          reservationExpiresAt: reservation.expiresAt.toUtc().toIso8601String(),
        );
      } on FlashDealReserveException {
        // Keep previous quantity/lock if re-reserve fails.
        return;
      } catch (_) {
        return;
      }
    } else {
      nextItems[itemIndex] = current.copyWith(quantity: normalizedQuantity);
    }

    await _persist(nextItems);
  }

  Future<void> removeItem(String entryKey) async {
    await removeItems(<String>{entryKey});
  }

  Future<void> removeItems(Iterable<String> entryKeys) async {
    await ensureLoaded();

    final normalizedEntryKeys = entryKeys
        .map((entryKey) => entryKey.trim())
        .where((entryKey) => entryKey.isNotEmpty)
        .toSet();
    if (normalizedEntryKeys.isEmpty) {
      return;
    }

    final removed = cartItemsNotifier.value
        .where((item) => normalizedEntryKeys.contains(item.entryKey))
        .toList(growable: false);
    for (final item in removed) {
      if (item.flashReservationId.trim().isNotEmpty) {
        unawaited(releaseFlashDealReservation(item.flashReservationId));
      }
    }

    final nextItems = cartItemsNotifier.value
        .where((item) => !normalizedEntryKeys.contains(item.entryKey))
        .toList(growable: false);
    if (nextItems.length == cartItemsNotifier.value.length) {
      return;
    }

    await _persist(nextItems);
  }

  /// Extends held flash locks before checkout; reverts price if hold is lost.
  Future<List<String>> prepareCheckoutFlashLocks() async {
    await ensureLoaded();
    final nextItems = List<CartItemData>.from(cartItemsNotifier.value);
    final warnings = <String>[];
    var changed = false;

    for (var index = 0; index < nextItems.length; index++) {
      final item = nextItems[index];
      if (!item.hasFlashLock) continue;

      final extended = await extendFlashDealReservation(
        item.flashReservationId,
      );
      if (extended != null && extended.isHeld) {
        nextItems[index] = item.copyWith(
          unitPrice: extended.lockedUnitPrice > 0
              ? extended.lockedUnitPrice
              : item.unitPrice,
          flashReservationId: extended.id,
          reservationExpiresAt: extended.expiresAt.toUtc().toIso8601String(),
          quantity: extended.quantity > 0 ? extended.quantity : item.quantity,
        );
        changed = true;
        continue;
      }

      await releaseFlashDealReservation(item.flashReservationId);
      nextItems[index] = item.copyWith(
        unitPrice: item.originalUnitPrice,
        clearFlashLock: true,
      );
      warnings.add(
        '${item.productName} flash price expired — reverted to regular price.',
      );
      changed = true;
    }

    if (changed) {
      await _persist(nextItems);
    }
    return warnings;
  }

  Future<void> clear() async {
    await ensureLoaded();
    for (final item in cartItemsNotifier.value) {
      if (item.flashReservationId.trim().isNotEmpty) {
        unawaited(releaseFlashDealReservation(item.flashReservationId));
      }
    }
    await _persist(const <CartItemData>[]);
  }

  Future<void> _persist(List<CartItemData> items) async {
    final normalizedItems = List<CartItemData>.unmodifiable(items);
    cartItemsNotifier.value = normalizedItems;

    final storageKey = await _resolveStorageKey();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      storageKey,
      jsonEncode([for (final item in normalizedItems) item.toJson()]),
    );
  }
}

class CartPage extends StatefulWidget {
  const CartPage({super.key, this.platformId = ''});

  final String platformId;

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  late final ProductRepository _productRepository;
  late final TextEditingController _searchController;
  late final FocusNode _searchFocusNode;
  final Set<String> _selectedEntryKeys = <String>{};
  Set<String> _knownCartEntryKeys = const <String>{};
  Map<String, Product>? _catalogProductsById;
  String _searchQuery = '';
  bool _isSearching = false;
  bool _isEditingCart = false;
  bool _hasInitializedSelection = false;

  String get _platformId => normalizeCartPlatformId(
    widget.platformId.isNotEmpty
        ? widget.platformId
        : CartStore.instance.activePlatformId,
  );

  String get _platformLabel => cartPlatformDisplayName(_platformId);

  @override
  void initState() {
    super.initState();
    _productRepository = createProductRepository();
    _searchController = TextEditingController();
    _searchFocusNode = FocusNode();
    CartStore.instance.cartItemsNotifier.addListener(
      _syncSelectionWithCartItems,
    );
    _syncSelectionWithCartItems();
  }

  @override
  void dispose() {
    CartStore.instance.cartItemsNotifier.removeListener(
      _syncSelectionWithCartItems,
    );
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  bool _sameKeySet(Set<String> left, Set<String> right) {
    if (left.length != right.length) {
      return false;
    }

    for (final value in left) {
      if (!right.contains(value)) {
        return false;
      }
    }

    return true;
  }

  void _syncSelectionWithCartItems() {
    final currentEntryKeys = CartStore.instance.cartItemsNotifier.value
        .map((item) => item.entryKey)
        .toSet();

    if (!_hasInitializedSelection) {
      _selectedEntryKeys
        ..clear()
        ..addAll(currentEntryKeys);
      _knownCartEntryKeys = currentEntryKeys;
      _hasInitializedSelection = true;
      if (mounted) {
        setState(() {});
      }
      return;
    }

    final nextSelectedEntryKeys = _selectedEntryKeys
        .where(currentEntryKeys.contains)
        .toSet();
    nextSelectedEntryKeys.addAll(
      currentEntryKeys.difference(_knownCartEntryKeys),
    );

    final selectionChanged = !_sameKeySet(
      _selectedEntryKeys,
      nextSelectedEntryKeys,
    );
    final knownKeysChanged = !_sameKeySet(
      _knownCartEntryKeys,
      currentEntryKeys,
    );
    _selectedEntryKeys
      ..clear()
      ..addAll(nextSelectedEntryKeys);
    _knownCartEntryKeys = currentEntryKeys;

    if (mounted && (selectionChanged || knownKeysChanged)) {
      setState(() {});
    }
  }

  void _handleItemSelectionChanged(String entryKey, bool isSelected) {
    setState(() {
      if (isSelected) {
        _selectedEntryKeys.add(entryKey);
      } else {
        _selectedEntryKeys.remove(entryKey);
      }
    });
  }

  void _handleSearchChanged(String value) {
    final nextQuery = value.trim();
    if (_searchQuery == nextQuery) {
      return;
    }

    setState(() {
      _searchQuery = nextQuery;
    });
  }

  void _toggleSearch() {
    if (_isSearching) {
      return;
    }

    setState(() {
      _isSearching = true;
    });
  }

  void _toggleEditMode() {
    _collapseSearchPreservingInput();
    setState(() {
      _isEditingCart = !_isEditingCart;
    });
  }

  void _cancelSearch() {
    _searchFocusNode.unfocus();
    FocusManager.instance.primaryFocus?.unfocus();
    if (_searchController.text.isEmpty &&
        _searchQuery.isEmpty &&
        !_isSearching) {
      return;
    }

    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _isSearching = false;
    });
  }

  void _collapseSearchPreservingInput() {
    _searchFocusNode.unfocus();
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_isSearching) {
      return;
    }

    setState(() {
      _isSearching = false;
    });
  }

  Future<void> _removeSelectedItems() async {
    final selectedEntryKeys = _selectedEntryKeys.toList(growable: false);
    if (selectedEntryKeys.isEmpty) {
      return;
    }

    final removedEntryCount = selectedEntryKeys.length;
    await CartStore.instance.removeItems(selectedEntryKeys);
    if (!mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message:
          'Removed $removedEntryCount cart item${removedEntryCount == 1 ? '' : 's'}.',
    );
  }

  Future<void> _moveSelectedItemsToFavorites() async {
    final selectedEntryKeys = _selectedEntryKeys.toList(growable: false);
    if (selectedEntryKeys.isEmpty) {
      return;
    }

    final selectedItems = CartStore.instance.cartItemsNotifier.value
        .where((item) => _selectedEntryKeys.contains(item.entryKey))
        .toList(growable: false);
    final selectedProductIds = selectedItems
        .map((item) => item.productId.trim())
        .where((productId) => productId.isNotEmpty)
        .toSet()
        .toList(growable: false);

    if (selectedProductIds.isEmpty) {
      return;
    }

    await FavoriteProductsStore.instance.ensureLoaded();
    for (final productId in selectedProductIds) {
      if (!FavoriteProductsStore.instance.isFavorite(productId)) {
        await FavoriteProductsStore.instance.toggleFavorite(productId);
      }
    }

    await CartStore.instance.removeItems(selectedEntryKeys);
    if (!mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message:
          'Moved ${selectedEntryKeys.length} cart item${selectedEntryKeys.length == 1 ? '' : 's'} to favorites.',
      icon: Icons.favorite_rounded,
      iconColor: const Color(0xFFD32F2F),
    );
  }

  void _handleCheckout() {
    unawaited(_openCheckoutPage());
  }

  Future<Map<String, Product>> _getCatalogProductsById() async {
    final cachedProducts = _catalogProductsById;
    if (cachedProducts != null) {
      return cachedProducts;
    }

    final products = await _productRepository.fetchProducts();
    final productsById = <String, Product>{
      for (final product in products) product.id.trim().toLowerCase(): product,
    };
    _catalogProductsById = productsById;
    return productsById;
  }

  Future<void> _openCartItemProductDetails(CartItemData item) async {
    final normalizedProductId = item.productId.trim().toLowerCase();
    if (normalizedProductId.isEmpty) {
      return;
    }

    try {
      final productsById = await _getCatalogProductsById();
      final product = productsById[normalizedProductId];
      if (!mounted) {
        return;
      }

      if (product == null || !isProductVisibleToUsers(product)) {
        AppSnackBar.showError(
          context,
          message: 'This product is out of stock and hidden right now.',
        );
        return;
      }

      await openProductDetailsPage(
        context,
        product,
        source: ProductDetailsEntrySource.cart,
        platformId: _platformId,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      AppSnackBar.showError(
        context,
        message: 'Unable to open product details right now.',
      );
    }
  }

  Future<void> _openCheckoutPage() async {
    final warnings = await CartStore.instance.prepareCheckoutFlashLocks();
    if (!mounted) {
      return;
    }
    if (warnings.isNotEmpty) {
      AppSnackBar.showError(context, message: warnings.first);
    }

    final selectedItems = CartStore.instance.cartItemsNotifier.value
        .where((item) => _selectedEntryKeys.contains(item.entryKey))
        .toList(growable: false);
    if (selectedItems.isEmpty) {
      return;
    }

    final bookingAction = await openBookingPage(
      context,
      items: [
        for (final item in selectedItems) _bookingLineItemFromCartItem(item),
      ],
      source: BookingFlowSource.cartCheckout,
      platformId: _platformId,
    );

    if (!mounted || bookingAction != BookingPageAction.orderPlaced) {
      return;
    }

    final selectedEntryKeys = selectedItems
        .map((item) => item.entryKey)
        .toSet();
    await CartStore.instance.removeItems(selectedEntryKeys);
    if (!mounted) {
      return;
    }

    setState(() {
      _selectedEntryKeys.removeAll(selectedEntryKeys);
    });

    final orderedItemCount = cartTotalItemCount(selectedItems);
    AppSnackBar.showSuccess(
      context,
      message:
          'Checkout completed for $orderedItemCount item${orderedItemCount == 1 ? '' : 's'}.',
    );
  }

  bool _areAllItemsSelected(List<CartItemData> items) {
    if (items.isEmpty) {
      return false;
    }

    for (final item in items) {
      if (!_selectedEntryKeys.contains(item.entryKey)) {
        return false;
      }
    }

    return true;
  }

  void _handleSelectAllChanged(List<CartItemData> items, bool isSelected) {
    final entryKeys = items.map((item) => item.entryKey).toSet();
    setState(() {
      if (isSelected) {
        _selectedEntryKeys.addAll(entryKeys);
      } else {
        _selectedEntryKeys.removeAll(entryKeys);
      }
    });
  }

  List<CartItemData> _filterItems(List<CartItemData> items) {
    final query = _searchQuery.trim().toLowerCase();
    if (query.isEmpty) {
      return items;
    }

    return items
        .where((item) {
          return item.productName.toLowerCase().contains(query) ||
              item.category.toLowerCase().contains(query) ||
              item.variantName.toLowerCase().contains(query);
        })
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final homeDashboardCardColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final fieldBackgroundColor =
        theme.inputDecorationTheme.fillColor ??
        theme.colorScheme.surfaceContainerHighest.withOpacity(0.65);
    final headerForegroundColor = theme.colorScheme.onSurface;
    final cartHeaderShadowColor = Colors.black.withOpacity(0.12);

    return Scaffold(
      backgroundColor: theme.cardColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: cartHeaderShadowColor,
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: AppBar(
            elevation: 0,
            scrolledUnderElevation: 0,
            surfaceTintColor: Colors.transparent,
            centerTitle: false,
            titleSpacing: _isSearching ? 0 : NavigationToolbar.kMiddleSpacing,
            backgroundColor: homeDashboardCardColor,
            foregroundColor: headerForegroundColor,
            title: AnimatedSwitcher(
              duration: appMotionFrames(13),
              transitionBuilder: (child, animation) {
                return FadeTransition(
                  opacity: animation,
                  child: SizeTransition(
                    sizeFactor: animation,
                    axis: Axis.horizontal,
                    axisAlignment: -1,
                    child: child,
                  ),
                );
              },
              child: _isSearching
                  ? Padding(
                      key: const ValueKey('cart-search-bar'),
                      padding: const EdgeInsets.only(right: 4),
                      child: ProductSearchBar(
                        controller: _searchController,
                        focusNode: _searchFocusNode,
                        onChanged: _handleSearchChanged,
                        onSubmitted: _handleSearchChanged,
                        onClear: _cancelSearch,
                        onTapOutside: (_) => _collapseSearchPreservingInput(),
                        iconColor: primaryColor,
                        textColor: theme.colorScheme.onSurface,
                        backgroundColor: fieldBackgroundColor,
                      ),
                    )
                  : ValueListenableBuilder<List<CartItemData>>(
                      key: const ValueKey('cart-header-title'),
                      valueListenable: CartStore.instance.cartItemsNotifier,
                      builder: (context, items, _) {
                        final selectedItemCount = cartTotalItemCount(
                          items.where(
                            (item) =>
                                _selectedEntryKeys.contains(item.entryKey),
                          ),
                        );

                        return FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '$_platformLabel Cart',
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if (selectedItemCount > 0) ...[
                                const SizedBox(width: 8),
                                Text(
                                  '($selectedItemCount selected)',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: headerForegroundColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
            ),
            actions: _isSearching
                ? const <Widget>[]
                : [
                    IconButton(
                      onPressed: _toggleSearch,
                      tooltip: 'Search cart items',
                      icon: const Icon(Icons.search_rounded),
                    ),
                    IconButton(
                      onPressed: _toggleEditMode,
                      tooltip: _isEditingCart ? 'Done editing' : 'Edit cart',
                      isSelected: _isEditingCart,
                      icon: const Icon(Icons.edit_outlined),
                      selectedIcon: const Icon(Icons.check_rounded),
                    ),
                  ],
          ),
        ),
      ),
      body: ValueListenableBuilder<List<CartItemData>>(
        valueListenable: CartStore.instance.cartItemsNotifier,
        builder: (context, items, child) {
          if (items.isEmpty) {
            return _CartEmptyState(
              primaryColor: primaryColor,
              secondaryColor: secondaryColor,
              platformLabel: _platformLabel,
            );
          }

          final visibleItems = _filterItems(items);
          final selectedItems = items
              .where((item) => _selectedEntryKeys.contains(item.entryKey))
              .toList(growable: false);

          if (visibleItems.isEmpty) {
            return _CartSearchEmptyState(secondaryColor: secondaryColor);
          }

          final subtotal = selectedItems.fold<double>(
            0,
            (total, item) => total + item.totalPrice,
          );
          final totalItems = cartTotalItemCount(selectedItems);
          final allItemsSelected = _areAllItemsSelected(items);

          return Column(
            children: [
              Expanded(
                child: NotificationListener<UserScrollNotification>(
                  onNotification: (notification) {
                    if (notification.direction != ScrollDirection.idle) {
                      _collapseSearchPreservingInput();
                    }
                    return false;
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(0, 16, 0, 12),
                    itemCount: visibleItems.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = visibleItems[index];
                      return _CartItemCard(
                        item: item,
                        isSelected: _selectedEntryKeys.contains(item.entryKey),
                        onSelectionChanged: (isSelected) {
                          _handleItemSelectionChanged(
                            item.entryKey,
                            isSelected,
                          );
                        },
                        onOpenProduct: () {
                          unawaited(_openCartItemProductDetails(item));
                        },
                      );
                    },
                  ),
                ),
              ),
              _CartSummaryBar(
                subtotal: subtotal,
                originalSubtotal: selectedItems.fold<double>(
                  0,
                  (total, item) => total + item.totalOriginalPrice,
                ),
                itemCount: totalItems,
                allItemsSelected: allItemsSelected,
                isEditing: _isEditingCart,
                onSelectAllChanged: (isSelected) {
                  _handleSelectAllChanged(items, isSelected);
                },
                onMoveToFavorites: _moveSelectedItemsToFavorites,
                onActionPressed: _isEditingCart
                    ? _removeSelectedItems
                    : _handleCheckout,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CartEmptyState extends StatelessWidget {
  const _CartEmptyState({
    required this.primaryColor,
    required this.secondaryColor,
    required this.platformLabel,
  });

  final Color primaryColor;
  final Color secondaryColor;
  final String platformLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final browseLabel = platformLabel.toLowerCase() == 'food'
        ? 'Start browsing food'
        : 'Start shopping';

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.shopping_cart_outlined, size: 34, color: primaryColor),
            const SizedBox(height: 14),
            Text(
              'Your $platformLabel cart is empty',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Add products from $platformLabel and they will appear here only.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: secondaryColor,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            FractionallySizedBox(
              widthFactor: 0.5,
              child: FilledButton(
                onPressed: () {
                  Navigator.of(context).pop(CartPageAction.openShop);
                },
                child: Text(browseLabel),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartSearchEmptyState extends StatelessWidget {
  const _CartSearchEmptyState({required this.secondaryColor});

  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SearchNotFoundArt(size: 120),
            const SizedBox(height: 12),
            Text(
              'No matching cart items',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Try another product name, category, or variant from your add to cart items.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: secondaryColor,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({
    required this.item,
    required this.isSelected,
    required this.onSelectionChanged,
    required this.onOpenProduct,
  });

  final CartItemData item;
  final bool isSelected;
  final ValueChanged<bool> onSelectionChanged;
  final VoidCallback onOpenProduct;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final homeDashboardCardColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.7) ??
        theme.colorScheme.onSurface.withOpacity(0.7);
    final hasBadgeRow =
        item.category.trim().isNotEmpty ||
        item.discountPercent != null ||
        item.showsTopBrand ||
        item.showsTopReviews;
    final variantName = item.variantName.trim();
    final productNameStyle = theme.textTheme.titleSmall?.copyWith(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      height: 1.15,
    );
    final variantTextStyle = theme.textTheme.bodySmall?.copyWith(
      color: secondaryColor,
      fontWeight: FontWeight.w500,
      height: 1.2,
    );

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: homeDashboardCardColor),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 88,
            child: Center(
              child: Checkbox(
                value: isSelected,
                onChanged: (value) => onSelectionChanged(value ?? false),
                shape: const CircleBorder(),
                side: BorderSide(
                  color: isSelected ? primaryColor : secondaryColor,
                  width: 1.4,
                ),
                visualDensity: VisualDensity.compact,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onOpenProduct,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _CartItemImage(item: item, primaryColor: primaryColor),
                      const SizedBox(width: 12),
                      Expanded(
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            final productNameLineCount =
                                _measureCartTextLineCount(
                                  context,
                                  text: item.productName,
                                  style: productNameStyle,
                                  maxWidth: constraints.maxWidth,
                                  maxLines: 2,
                                );
                            final priceTopSpacing = variantName.isNotEmpty
                                ? 4.0
                                : productNameLineCount <= 1
                                ? 4.0
                                : 6.0;
                            final stockSection = item.hasStock
                                ? Row(
                                    children: [
                                      Icon(
                                        Icons.inventory_2_outlined,
                                        size: 14,
                                        color: secondaryColor,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          item.stockLabel,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: theme.textTheme.bodySmall
                                              ?.copyWith(
                                                color: secondaryColor,
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                      ),
                                    ],
                                  )
                                : Text(
                                    item.stockLabel,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: const Color(0xFFD32F2F),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  );
                            final quantitySection = Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 5,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: theme.cardColor,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _CartQuantityButton(
                                    icon: Icons.remove_rounded,
                                    onTap: () =>
                                        CartStore.instance.updateQuantity(
                                          item.entryKey,
                                          item.quantity - 1,
                                        ),
                                  ),
                                  SizedBox(
                                    width: 28,
                                    child: Center(
                                      child: Text(
                                        '${item.quantity}',
                                        style: theme.textTheme.titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w800,
                                            ),
                                      ),
                                    ),
                                  ),
                                  _CartQuantityButton(
                                    icon: Icons.add_rounded,
                                    onTap:
                                        item.hasStock &&
                                            item.quantity < item.availableStock
                                        ? () =>
                                              CartStore.instance.updateQuantity(
                                                item.entryKey,
                                                item.quantity + 1,
                                              )
                                        : null,
                                  ),
                                ],
                              ),
                            );

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (hasBadgeRow)
                                  SizedBox(
                                    width: double.infinity,
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            if (item.category.trim().isNotEmpty)
                                              _CartInfoChip(
                                                label: item.category,
                                                color: primaryColor,
                                                icon: Icons.grid_view_outlined,
                                              ),
                                            if (item.category
                                                    .trim()
                                                    .isNotEmpty &&
                                                (item.discountPercent != null ||
                                                    item.showsTopBrand ||
                                                    item.showsTopReviews))
                                              const SizedBox(width: 6),
                                            if (item.discountPercent !=
                                                null) ...[
                                              _CartInfoChip(
                                                label:
                                                    '-${item.discountPercent}%',
                                                color: const Color(0xFFC62828),
                                                icon:
                                                    Icons.local_offer_outlined,
                                                backgroundColor: const Color(
                                                  0xFFD32F2F,
                                                ),
                                                labelColor: Colors.white,
                                                iconColor: Colors.white,
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 10,
                                                      vertical: 6,
                                                    ),
                                                labelStyle: theme
                                                    .textTheme
                                                    .labelSmall
                                                    ?.copyWith(
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      fontSize: 9,
                                                    ),
                                              ),
                                            ],
                                            if (item.showsTopBrand) ...[
                                              if (item.discountPercent != null)
                                                const SizedBox(width: 6),
                                              _CartInfoChip(
                                                label: 'Top Selling',
                                                color: const Color.fromARGB(
                                                  255,
                                                  15,
                                                  194,
                                                  176,
                                                ),
                                                icon: Icons
                                                    .workspace_premium_outlined,
                                                backgroundColor:
                                                    const Color.fromARGB(
                                                      255,
                                                      15,
                                                      194,
                                                      176,
                                                    ),
                                                labelColor: Colors.white,
                                                iconColor: Colors.white,
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 10,
                                                      vertical: 6,
                                                    ),
                                                labelStyle: theme
                                                    .textTheme
                                                    .labelSmall
                                                    ?.copyWith(
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      fontSize: 9,
                                                    ),
                                              ),
                                            ],
                                            if (item.showsTopReviews) ...[
                                              if (item.discountPercent !=
                                                      null ||
                                                  item.showsTopBrand)
                                                const SizedBox(width: 6),
                                              _CartInfoChip(
                                                label: 'Top Rating',
                                                color: const Color(0xFFF9A825),
                                                icon:
                                                    Icons.star_outline_rounded,
                                                backgroundColor: const Color(
                                                  0xFFF9A825,
                                                ),
                                                labelColor: Colors.white,
                                                iconColor: Colors.white,
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 10,
                                                      vertical: 6,
                                                    ),
                                                labelStyle: theme
                                                    .textTheme
                                                    .labelSmall
                                                    ?.copyWith(
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      fontSize: 9,
                                                    ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                if (hasBadgeRow) const SizedBox(height: 8),
                                Text(
                                  item.productName,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: productNameStyle,
                                ),
                                if (variantName.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    variantName,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: variantTextStyle,
                                  ),
                                ],
                                SizedBox(height: priceTopSpacing),
                                SizedBox(
                                  width: double.infinity,
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    alignment: Alignment.centerLeft,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        _CartPriceText(
                                          amount: item.totalPrice,
                                          style: theme.textTheme.titleMedium
                                              ?.copyWith(
                                                color: primaryColor,
                                                fontWeight: FontWeight.w800,
                                              ),
                                        ),
                                        if (item.hasDiscount) ...[
                                          const SizedBox(width: 8),
                                          _CartPriceText(
                                            amount: item.totalOriginalPrice,
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                                  color: secondaryColor,
                                                  decoration: TextDecoration
                                                      .lineThrough,
                                                ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                                if (item.hasFlashLock) ...[
                                  const SizedBox(height: 6),
                                  _CartFlashHoldBadge(item: item),
                                ],
                                const SizedBox(height: 4),
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Expanded(child: stockSection),
                                    const SizedBox(width: 12),
                                    quantitySection,
                                  ],
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CartItemImage extends StatelessWidget {
  const _CartItemImage({required this.item, required this.primaryColor});

  final CartItemData item;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final imageUrl = item.productImageUrl.trim();
    final initial = item.productName.trim().isEmpty
        ? '?'
        : item.productName.trim()[0].toUpperCase();

    return SizedBox(
      width: 88,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 88,
          height: 88,
          child: imageUrl.isEmpty
              ? _CartImageFallback(primaryColor: primaryColor, initial: initial)
              : ColoredBox(
                  color: Colors.white,
                  child: Image.network(
                    imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return _CartImageFallback(
                        primaryColor: primaryColor,
                        initial: initial,
                      );
                    },
                  ),
                ),
        ),
      ),
    );
  }
}

class _CartImageFallback extends StatelessWidget {
  const _CartImageFallback({required this.primaryColor, required this.initial});

  final Color primaryColor;
  final String initial;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: primaryColor.withOpacity(0.14),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
          color: primaryColor,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _CartInfoChip extends StatelessWidget {
  const _CartInfoChip({
    required this.label,
    required this.color,
    this.icon,
    this.backgroundColor,
    this.labelColor,
    this.iconColor,
    this.padding,
    this.labelStyle,
  });

  final String label;
  final Color color;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? labelColor;
  final Color? iconColor;
  final EdgeInsetsGeometry? padding;
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    final resolvedBackgroundColor = backgroundColor ?? color.withOpacity(0.1);
    final resolvedLabelColor = labelColor ?? color;
    final resolvedIconColor = iconColor ?? resolvedLabelColor;

    return Container(
      padding:
          padding ?? const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: resolvedBackgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: resolvedIconColor),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style:
                (Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: resolvedLabelColor,
                          fontWeight: FontWeight.w700,
                        ) ??
                        TextStyle(
                          color: resolvedLabelColor,
                          fontWeight: FontWeight.w700,
                        ))
                    .merge(labelStyle)
                    .copyWith(color: resolvedLabelColor),
          ),
        ],
      ),
    );
  }
}

class _CartDiscountSummaryBadge extends StatelessWidget {
  const _CartDiscountSummaryBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFD32F2F),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _CartQuantityButton extends StatelessWidget {
  const _CartQuantityButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 22,
          height: 22,
          child: Icon(
            icon,
            size: 15,
            color: onTap == null
                ? primaryColor.withOpacity(0.34)
                : primaryColor,
          ),
        ),
      ),
    );
  }
}

class _CartSummaryBar extends StatelessWidget {
  const _CartSummaryBar({
    required this.subtotal,
    required this.originalSubtotal,
    required this.itemCount,
    required this.allItemsSelected,
    required this.isEditing,
    required this.onSelectAllChanged,
    required this.onMoveToFavorites,
    required this.onActionPressed,
  });

  final double subtotal;
  final double originalSubtotal;
  final int itemCount;
  final bool allItemsSelected;
  final bool isEditing;
  final ValueChanged<bool> onSelectAllChanged;
  final VoidCallback onMoveToFavorites;
  final VoidCallback onActionPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mediaPadding = MediaQuery.paddingOf(context);
    final isDarkMode = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final checkoutTextColor = isDarkMode ? Colors.black : Colors.white;
    final hasDiscountedTotal = originalSubtotal > subtotal;
    final discountPercent = hasDiscountedTotal && originalSubtotal > 0
        ? (((originalSubtotal - subtotal) / originalSubtotal) * 100).round()
        : 0;
    final bottomPadding = mediaPadding.bottom;
    final footerTargetHeight = mediaPadding.top + kToolbarHeight;
    final minimumHeight = bottomPadding + 64.0;
    final resolvedHeight = footerTargetHeight > minimumHeight
        ? footerTargetHeight
        : minimumHeight;
    final contentHeight = resolvedHeight - bottomPadding;
    final controlHeight = contentHeight <= 52
        ? 52.0
        : contentHeight >= 56
        ? 56.0
        : contentHeight;
    final actionButtonHeight = controlHeight - 8;

    return SizedBox(
      height: resolvedHeight,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: surfaceColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 18,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: Padding(
          padding: EdgeInsets.fromLTRB(14, 0, 14, bottomPadding),
          child: Center(
            child: SizedBox(
              height: controlHeight,
              child: Row(
                children: [
                  InkWell(
                    onTap: () => onSelectAllChanged(!allItemsSelected),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Checkbox(
                            value: allItemsSelected,
                            onChanged: (value) =>
                                onSelectAllChanged(value ?? false),
                            shape: const CircleBorder(),
                            side: BorderSide(
                              color: allItemsSelected
                                  ? primaryColor
                                  : secondaryColor,
                              width: 1.4,
                            ),
                            visualDensity: VisualDensity.compact,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            'All',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (isEditing)
                    const Spacer()
                  else
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerRight,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              _CartPriceText(
                                amount: subtotal,
                                style: theme.textTheme.titleSmall?.copyWith(
                                  color: primaryColor,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if (hasDiscountedTotal) ...[
                                const SizedBox(height: 2),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _CartDiscountSummaryBadge(
                                      label: '-$discountPercent%',
                                    ),
                                    const SizedBox(width: 6),
                                    _CartPriceText(
                                      amount: originalSubtotal,
                                      style: theme.textTheme.labelSmall
                                          ?.copyWith(
                                            color: secondaryColor,
                                            fontWeight: FontWeight.w700,
                                            decoration:
                                                TextDecoration.lineThrough,
                                          ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(width: 12),
                  if (isEditing)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: actionButtonHeight,
                          height: actionButtonHeight,
                          child: IconButton(
                            onPressed: itemCount <= 0
                                ? null
                                : onMoveToFavorites,
                            tooltip: 'Move selected items to favorites',
                            style: IconButton.styleFrom(
                              foregroundColor: primaryColor,
                              disabledForegroundColor: theme.disabledColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            icon: const Icon(Icons.favorite_border_rounded),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          width: actionButtonHeight,
                          height: actionButtonHeight,
                          child: IconButton(
                            onPressed: itemCount <= 0 ? null : onActionPressed,
                            tooltip: 'Delete selected items',
                            style: IconButton.styleFrom(
                              foregroundColor: const Color(0xFFD32F2F),
                              disabledForegroundColor: theme.disabledColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            icon: const Icon(Icons.delete_outline_rounded),
                          ),
                        ),
                      ],
                    )
                  else
                    SizedBox(
                      width: 126,
                      height: actionButtonHeight,
                      child: FilledButton(
                        onPressed: itemCount <= 0 ? null : onActionPressed,
                        style: FilledButton.styleFrom(
                          foregroundColor: checkoutTextColor,
                          textStyle: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                        ),
                        child: Text(
                          'Check out',
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: checkoutTextColor,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

int _measureCartTextLineCount(
  BuildContext context, {
  required String text,
  required TextStyle? style,
  required double maxWidth,
  required int maxLines,
}) {
  if (maxWidth <= 0 || !maxWidth.isFinite || text.trim().isEmpty) {
    return 1;
  }

  final painter = TextPainter(
    text: TextSpan(
      text: text,
      style: DefaultTextStyle.of(context).style.merge(style),
    ),
    textDirection: Directionality.of(context),
    textScaler: MediaQuery.textScalerOf(context),
    maxLines: maxLines,
  )..layout(maxWidth: maxWidth);

  final lineCount = painter.computeLineMetrics().length;
  if (lineCount < 1) {
    return 1;
  }

  return lineCount > maxLines ? maxLines : lineCount;
}

int _normalizeCartQuantity(int quantity, {required int availableStock}) {
  final normalizedQuantity = quantity.clamp(1, 999).toInt();
  if (availableStock > 0 && normalizedQuantity > availableStock) {
    return availableStock;
  }

  return normalizedQuantity;
}

class _CartFlashHoldBadge extends StatefulWidget {
  const _CartFlashHoldBadge({required this.item});

  final CartItemData item;

  @override
  State<_CartFlashHoldBadge> createState() => _CartFlashHoldBadgeState();
}

class _CartFlashHoldBadgeState extends State<_CartFlashHoldBadge> {
  Timer? _timer;
  Duration _remaining = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void didUpdateWidget(covariant _CartFlashHoldBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.item.reservationExpiresAt !=
        widget.item.reservationExpiresAt) {
      _tick();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _tick() {
    final expiresAt = widget.item.reservationExpiresAtDate;
    final next = expiresAt == null
        ? Duration.zero
        : expiresAt.difference(DateTime.now());
    if (!mounted) return;
    setState(() {
      _remaining = next.isNegative ? Duration.zero : next;
    });
  }

  String _format(Duration value) {
    final totalSeconds = value.inSeconds;
    if (totalSeconds <= 0) return 'expired';
    final minutes = value.inMinutes;
    final seconds = value.inSeconds.remainder(60);
    if (minutes >= 60) {
      final hours = value.inHours;
      final mins = value.inMinutes.remainder(60);
      return '${hours}h ${mins}m';
    }
    return '${minutes}m ${seconds.toString().padLeft(2, '0')}s';
  }

  @override
  Widget build(BuildContext context) {
    final expired = _remaining <= Duration.zero;
    return Row(
      children: [
        Icon(
          Icons.bolt_rounded,
          size: 14,
          color: expired ? const Color(0xFF94A3B8) : const Color(0xFFD97706),
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            expired
                ? 'Flash hold expired — refresh at checkout'
                : 'Flash price locked · ${_format(_remaining)}',
            style: TextStyle(
              color: expired
                  ? const Color(0xFF64748B)
                  : const Color(0xFFB45309),
              fontSize: 11,
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
        ),
      ],
    );
  }
}

class _CartPriceText extends StatelessWidget {
  const _CartPriceText({required this.amount, this.style});

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(amount: amount, style: style);
  }
}
