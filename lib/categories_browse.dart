import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/guest_session.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/models/store_type_summary.dart';
import 'package:switch_app/product_details.dart';
import 'package:switch_app/search_bar.dart' as app_search;
import 'package:switch_app/services/flash_deals_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/theme/app_theme.dart';
import 'package:switch_app/utils/app_keyboard.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/widgets/horizontal_end_fade.dart';
import 'package:switch_app/widgets/product_card_tap_lift.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';

/// Platform-scoped category catalog entry for the Categories browse flow.
class CategoryBrowseItem {
  const CategoryBrowseItem({
    required this.name,
    this.iconName = '',
    this.imageUrl = '',
    this.iconImageUrl = '',
    this.itemCount = 0,
    this.iconColor = const Color(0xFF236BCF),
    this.iconBackgroundColor = const Color(0xFFEAF2FF),
  });

  final String name;
  final String iconName;
  /// Super Admin category photo (business type → categories). Never a listing photo.
  final String imageUrl;
  /// Super Admin uploaded category icon image (optional).
  final String iconImageUrl;
  final int itemCount;
  /// Matches Super Admin `--business-type-category-icon-color`.
  final Color iconColor;
  /// Matches Super Admin `--business-type-category-icon-bg`.
  final Color iconBackgroundColor;

  /// Full-bleed card photo from Super Admin only (empty ⇒ show icon instead).
  String get displayImageUrl => imageUrl.trim();

  bool get hasAdminPhoto => displayImageUrl.isNotEmpty;
}

String _normalizeCategoryKey(String value) {
  return value
      .trim()
      .toLowerCase()
      .replaceAll('&', ' and ')
      .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
      .trim();
}

String _platformIdForStoreType(StoreTypeSummary item) {
  final explicit = item.platformId.trim().toLowerCase();
  if (explicit.isNotEmpty) return explicit;
  final key = _normalizeCategoryKey(item.name);
  if (key.isEmpty) return 'shop';
  if (key.contains('hotel') ||
      key.contains('hote ') ||
      (RegExp(r'\bhotes?\b').hasMatch(key) && key.contains('restaurant'))) {
    return 'hotels';
  }
  if (key == 'food' ||
      key == 'foods' ||
      key.contains('restaurant') ||
      key.contains('dining') ||
      key.contains('cafe')) {
    return 'food';
  }
  return 'shop';
}

String formatCategoryItemCount(int count) {
  if (count <= 0) return '0 items';
  if (count < 1000) return '$count items';
  final thousands = count / 1000;
  if (count < 10000) {
    final fixed = thousands.toStringAsFixed(1);
    final trimmed = fixed.endsWith('.0')
        ? fixed.substring(0, fixed.length - 2)
        : fixed;
    return '${trimmed}K items';
  }
  return '${thousands.round()}K items';
}

String _normalizeLucideCategoryIconKey(String value) {
  return value
      .trim()
      .toLowerCase()
      .replaceAll('&', ' and ')
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
}

/// Super Admin `lucideCategoryIconAliases` — e.g. meals → utensils.
const Map<String, String> _kCategoryIconAliases = {
  'apparel': 'shirt',
  'bakery': 'croissant',
  'bakeries': 'croissant',
  'beverage': 'coffee',
  'beverages': 'coffee',
  'breakfast': 'croissant',
  'burger': 'hamburger',
  'burgers': 'hamburger',
  'cake': 'cake',
  'cakes': 'cake',
  'category': 'tag',
  'clothes': 'shirt',
  'clothing': 'shirt',
  'coffee': 'coffee',
  'dessert': 'cake',
  'desserts': 'cake',
  'dinner': 'utensils',
  'drink': 'coffee',
  'drinks': 'coffee',
  'electronics': 'laptop',
  'fashion': 'shirt',
  'food': 'utensils',
  'foods': 'utensils',
  'fruit': 'apple',
  'fruits': 'apple',
  'gadget': 'smartphone',
  'gadgets': 'smartphone',
  'hamburger': 'hamburger',
  'health': 'pill',
  'lunch': 'utensils',
  'meal': 'utensils',
  'meals': 'utensils',
  'medical': 'pill',
  'medicine': 'pill',
  'pastry': 'croissant',
  'pastries': 'croissant',
  'pharmacy': 'pill',
  'phone': 'smartphone',
  'produce': 'apple',
  'products': 'package',
  'snack': 'sandwich',
  'snacks': 'sandwich',
  'soup': 'soup',
  'sweet': 'cake',
  'sweets': 'cake',
  'tech': 'laptop',
  'technology': 'laptop',
  'vegetable': 'carrot',
  'vegetables': 'carrot',
  'wellness': 'pill',
};

/// Super Admin `lucideCategoryIconPaths` (inline SVG path bodies).
const Map<String, String> _kCategoryIconSvgPaths = {
  'apple':
      '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"></path><path d="M10 2c1 .5 2 2 2 5"></path>',
  'burger':
      '<path d="M18 11H6a4 4 0 0 1 0-8h12a4 4 0 0 1 0 8Z"></path><path d="M20 11H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2Z"></path><path d="M18 16H6a4 4 0 0 0 0 8h12a4 4 0 0 0 0-8Z"></path>',
  'hamburger':
      '<path d="M18 11H6a4 4 0 0 1 0-8h12a4 4 0 0 1 0 8Z"></path><path d="M20 11H4a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2Z"></path><path d="M18 16H6a4 4 0 0 0 0 8h12a4 4 0 0 0 0-8Z"></path>',
  'cake':
      '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"></path><path d="M2 21h20"></path><path d="M7 8v3"></path><path d="M12 8v3"></path><path d="M17 8v3"></path><path d="M7 4h.01"></path><path d="M12 4h.01"></path><path d="M17 4h.01"></path>',
  'carrot':
      '<path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.95 4.95 0 1 0-7-7C5.14 11.2 1.64 21.07 1.64 21.07a.5.5 0 0 0 .63.63Z"></path><path d="m9 15-2-2"></path><path d="m13 11-2-2"></path><path d="m14.5 4.5 2-2"></path><path d="m11.5 7.5 2-2"></path><path d="m16.5 7.5 3-3"></path>',
  'coffee':
      '<path d="M10 2v2"></path><path d="M14 2v2"></path><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"></path><path d="M6 2v2"></path>',
  'croissant':
      '<path d="M4.4 14.9A7 7 0 0 1 12 4.6a7 7 0 0 1 7.6 10.3"></path><path d="M12 4.6a7 7 0 0 0 0 14.8"></path><path d="M12 19.4a7 7 0 0 0 0-14.8"></path><path d="M4.4 14.9c1.5 2.8 4.3 4.5 7.6 4.5s6.1-1.7 7.6-4.5"></path>',
  'glass-water':
      '<path d="M15.2 22H8.8a2 2 0 0 1-2-1.79L5 3h14l-1.81 17.21A2 2 0 0 1 15.2 22Z"></path><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0"></path>',
  'hammer':
      '<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"></path><path d="m18 15 4-4"></path><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18 14"></path>',
  'laptop':
      '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"></path><path d="M2 16h20v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z"></path>',
  'package':
      '<path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="M3.3 7 12 12l8.7-5"></path><path d="M12 22V12"></path>',
  'pill':
      '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path>',
  'sandwich':
      '<path d="m2.75 8.75 2.1-2.1a2 2 0 0 1 2.83 0L9.5 8.5"></path><path d="M15.5 7.5 18 5a2 2 0 0 1 2.83 0l.67.67"></path><path d="M3 11h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="m5 15 1.5 5h11L19 15"></path><path d="M8 11V8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3"></path>',
  'shirt':
      '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.46l.7 2.1a2 2 0 0 0 2.5 1.25L6 9.1V22h12V9.1l.52.17a2 2 0 0 0 2.5-1.25l.7-2.1a2 2 0 0 0-1.34-2.46Z"></path>',
  'smartphone':
      '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path>',
  'soup':
      '<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"></path><path d="M7 21h10"></path><path d="M19.5 12 22 6"></path><path d="M16.25 3c.27.45.5 1.05.5 1.75C16.75 6.82 15 7.68 15 9.5c0 .69.23 1.2.5 1.5"></path><path d="M8.25 3c.27.45.5 1.05.5 1.75C8.75 6.82 7 7.68 7 9.5c0 .69.23 1.2.5 1.5"></path>',
  'tag':
      '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l4.58-4.58a2.426 2.426 0 0 0 0-3.42z"></path><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"></circle>',
  'utensils':
      '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>',
};

/// Super Admin `businessTypeCategoryIconPalette`.
const List<({Color background, Color color})> _kCategoryIconPalette = [
  (background: Color(0xFFEAF2FF), color: Color(0xFF236BCF)), // blue
  (background: Color(0xFFFDEBF1), color: Color(0xFFC63D70)), // rose
  (background: Color(0xFFE7F8EF), color: Color(0xFF16905B)), // mint
  (background: Color(0xFFF3EAFE), color: Color(0xFF8C3FC1)), // violet
  (background: Color(0xFFFFF5D8), color: Color(0xFFC27A0B)), // amber
  (background: Color(0xFFE6F7F8), color: Color(0xFF168A91)), // aqua
  (background: Color(0xFFFEE2E2), color: Color(0xFFDC2626)), // red
  (background: Color(0xFFE0E7FF), color: Color(0xFF4F46E5)), // indigo
  (background: Color(0xFFECFCCB), color: Color(0xFF65A30D)), // lime
  (background: Color(0xFFFAE8FF), color: Color(0xFFC026D3)), // fuchsia
  (background: Color(0xFFFFEDD5), color: Color(0xFFEA580C)), // orange
  (background: Color(0xFFCCFBF1), color: Color(0xFF0F766E)), // teal
];

({Color background, Color color}) categoryIconColorsForIndex(int index) {
  final safeIndex = index < 0 ? 0 : index;
  // Same formula as Super Admin getBusinessTypeCategoryIconColors.
  final paletteIndex = (safeIndex * 5) % _kCategoryIconPalette.length;
  return _kCategoryIconPalette[paletteIndex];
}

String? categoryIconSvgUrl(String iconName) {
  var key = iconName.trim().toLowerCase();
  if (key.isEmpty) return null;
  key = key
      .replaceAll('&', ' and ')
      .replaceAll(RegExp(r'[^a-z0-9:_-]+'), '-')
      .replaceAll(RegExp(r'-{2,}'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  if (key.isEmpty) return null;

  if (key.startsWith('tabler:')) {
    final slug = key.substring(7);
    if (slug.isEmpty) return null;
    return 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.44.0/icons/outline/$slug.svg';
  }
  if (key.startsWith('tabler-')) {
    final slug = key.substring(7);
    if (slug.isEmpty) return null;
    return 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.44.0/icons/outline/$slug.svg';
  }
  return 'https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/$key.svg';
}

String _applyCategoryIconAlias(String key) {
  return _kCategoryIconAliases[key] ?? key;
}

/// Matches Super Admin icon resolution for `business-type-showcase__category-icon-surface`.
String resolveEffectiveCategoryIconName({
  required String storedIconName,
  required String categoryName,
}) {
  final stored = storedIconName.trim();
  if (stored.isNotEmpty) {
    final lower = stored.toLowerCase();
    if (lower.startsWith('tabler:') || lower.startsWith('tabler-')) {
      return stored;
    }
    return _applyCategoryIconAlias(_normalizeLucideCategoryIconKey(stored));
  }

  final categoryKey = _normalizeLucideCategoryIconKey(categoryName);
  if (categoryKey.isEmpty) return 'tag';

  if (_kCategoryIconAliases.containsKey(categoryKey)) {
    return _kCategoryIconAliases[categoryKey]!;
  }
  if (_kCategoryIconSvgPaths.containsKey(categoryKey)) {
    return categoryKey;
  }

  for (final token in categoryKey.split('-')) {
    if (token.isEmpty) continue;
    if (_kCategoryIconAliases.containsKey(token)) {
      return _kCategoryIconAliases[token]!;
    }
    if (_kCategoryIconSvgPaths.containsKey(token)) {
      return token;
    }
  }

  return 'tag';
}

String _categoryIconSvgMarkup(String iconName) {
  final key = _normalizeLucideCategoryIconKey(iconName);
  final paths = _kCategoryIconSvgPaths[key] ?? _kCategoryIconSvgPaths['tag']!;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">$paths</svg>';
}

/// Builds unique Super Admin published categories.
///
/// When [platformId] is non-empty, only that platform's business-type
/// categories are included (Shop View All). When empty / [allPlatforms]
/// is true, every published category across platforms is included
/// (left-nav Categories).
///
/// Media comes from Super Admin business-type category details only —
/// never from product listing photos. Missing photo ⇒ Lucide/Tabler icon.
List<CategoryBrowseItem> buildPublishedCategories({
  required List<StoreTypeSummary> storeTypes,
  required List<Product> products,
  String platformId = '',
  bool allPlatforms = false,
}) {
  final scopedPlatformId = platformId.trim().toLowerCase();
  if (!allPlatforms && scopedPlatformId.isEmpty) {
    return const <CategoryBrowseItem>[];
  }

  final catalog = <String, CategoryBrowseItem>{};
  var nextColorIndex = 0;

  for (final storeType in storeTypes) {
    if (!allPlatforms &&
        _platformIdForStoreType(storeType) != scopedPlatformId) {
      continue;
    }

    var storeTypeCategoryIndex = 0;
    for (final detail in storeType.categoryDetails) {
      final name = detail.name.trim();
      final key = _normalizeCategoryKey(name);
      if (key.isEmpty || detail.status == 'inactive') continue;
      final existing = catalog[key];
      final colors = existing != null
          ? (
              background: existing.iconBackgroundColor,
              color: existing.iconColor,
            )
          : categoryIconColorsForIndex(storeTypeCategoryIndex);
      storeTypeCategoryIndex += 1;
      if (existing == null) nextColorIndex += 1;
      catalog[key] = CategoryBrowseItem(
        name: existing?.name ?? name,
        iconName: (existing?.iconName.trim().isNotEmpty ?? false)
            ? existing!.iconName
            : detail.iconName.trim(),
        imageUrl: (existing?.imageUrl.trim().isNotEmpty ?? false)
            ? existing!.imageUrl
            : detail.imageUrl.trim(),
        iconImageUrl: (existing?.iconImageUrl.trim().isNotEmpty ?? false)
            ? existing!.iconImageUrl
            : detail.iconImageUrl.trim(),
        itemCount: existing?.itemCount ?? 0,
        iconColor: colors.color,
        iconBackgroundColor: colors.background,
      );
    }

    for (final category in storeType.categories) {
      final name = category.trim();
      final key = _normalizeCategoryKey(name);
      if (key.isEmpty) continue;
      catalog.putIfAbsent(
        key,
        () {
          final colors = categoryIconColorsForIndex(nextColorIndex);
          nextColorIndex += 1;
          return CategoryBrowseItem(
            name: name,
            iconColor: colors.color,
            iconBackgroundColor: colors.background,
          );
        },
      );
    }
  }

  // Products only contribute item counts — never images, never new categories.
  final counts = <String, int>{};
  for (final product in products) {
    for (final label in product.categoryList) {
      final key = _normalizeCategoryKey(label);
      if (key.isEmpty || !catalog.containsKey(key)) continue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  final items = catalog.entries.map((entry) {
    final current = entry.value;
    return CategoryBrowseItem(
      name: current.name,
      iconName: resolveEffectiveCategoryIconName(
        storedIconName: current.iconName,
        categoryName: current.name,
      ),
      imageUrl: current.imageUrl.trim(),
      iconImageUrl: current.iconImageUrl.trim(),
      itemCount: counts[entry.key] ?? 0,
      iconColor: current.iconColor,
      iconBackgroundColor: current.iconBackgroundColor,
    );
  }).toList()
    ..sort((a, b) {
      final byCount = b.itemCount.compareTo(a.itemCount);
      if (byCount != 0) return byCount;
      return a.name.toLowerCase().compareTo(b.name.toLowerCase());
    });

  return items;
}

/// Platform-scoped catalog (Shop / Food View All).
List<CategoryBrowseItem> buildPlatformCategories({
  required String platformId,
  required List<StoreTypeSummary> storeTypes,
  required List<Product> products,
}) {
  return buildPublishedCategories(
    platformId: platformId,
    storeTypes: storeTypes,
    products: products,
  );
}

/// All Super Admin published categories across every buyer platform.
List<CategoryBrowseItem> buildAllPublishedCategories({
  required List<StoreTypeSummary> storeTypes,
  required List<Product> products,
}) {
  return buildPublishedCategories(
    storeTypes: storeTypes,
    products: products,
    allPlatforms: true,
  );
}

List<Product> productsInCategory(List<Product> products, String categoryName) {
  return products
      .where((product) => product.belongsToCategory(categoryName))
      .toList(growable: false);
}

/// Sibling categories on the same platform (for chips / shop-by-subcategory).
List<CategoryBrowseItem> siblingCategoriesFor({
  required CategoryBrowseItem selected,
  required List<CategoryBrowseItem> all,
  int limit = 12,
}) {
  final selectedKey = _normalizeCategoryKey(selected.name);
  return all
      .where((item) => _normalizeCategoryKey(item.name) != selectedKey)
      .take(limit)
      .toList(growable: false);
}

Future<void> openCategoriesBrowsePage(
  BuildContext context, {
  required String platformId,
  required String platformName,
  required Color primaryColor,
  required Future<List<StoreTypeSummary>> storeTypesFuture,
  required Future<List<Product>> productsFuture,
  bool showAllPlatforms = false,
  VoidCallback? onMenuTap,
}) {
  return Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => CategoriesOverviewPage(
        platformId: platformId,
        platformName: platformName,
        primaryColor: primaryColor,
        storeTypesFuture: storeTypesFuture,
        productsFuture: productsFuture,
        showAllPlatforms: showAllPlatforms,
        onMenuTap: onMenuTap,
      ),
    ),
  );
}

/// Horizontal categories strip for the shop All-tab home feed (above New Post).
class HomeCategoriesCarousel extends StatefulWidget {
  const HomeCategoriesCarousel({
    super.key,
    required this.platformId,
    required this.platformName,
    required this.storeTypesFuture,
    required this.productsFuture,
    required this.backgroundColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    this.onViewAll,
  });

  static const double tileWidth = 88;
  static const double imageHeight = 72;
  static const double carouselHeight = 108;
  static const int maxCategories = 12;

  final String platformId;
  final String platformName;
  final Future<List<StoreTypeSummary>> storeTypesFuture;
  final Future<List<Product>> productsFuture;
  final Color backgroundColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final VoidCallback? onViewAll;

  @override
  State<HomeCategoriesCarousel> createState() => _HomeCategoriesCarouselState();
}

class _HomeCategoriesCarouselState extends State<HomeCategoriesCarousel> {
  late Future<({List<CategoryBrowseItem> categories, List<Product> products})>
  _catalogFuture;

  @override
  void initState() {
    super.initState();
    _catalogFuture = _load();
  }

  @override
  void didUpdateWidget(covariant HomeCategoriesCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    final platformChanged =
        oldWidget.platformId.trim().toLowerCase() !=
        widget.platformId.trim().toLowerCase();
    if (platformChanged ||
        !identical(oldWidget.storeTypesFuture, widget.storeTypesFuture) ||
        !identical(oldWidget.productsFuture, widget.productsFuture)) {
      _catalogFuture = _load();
    }
  }

  Future<({List<CategoryBrowseItem> categories, List<Product> products})>
  _load() async {
    List<StoreTypeSummary> storeTypes = const <StoreTypeSummary>[];
    List<Product> products = const <Product>[];
    try {
      storeTypes = await widget.storeTypesFuture;
    } catch (_) {}
    try {
      products = await widget.productsFuture;
    } catch (_) {}
    return (
      categories: buildPlatformCategories(
        platformId: widget.platformId,
        storeTypes: storeTypes,
        products: products,
      ),
      products: products,
    );
  }

  void _openCategory(
    BuildContext context,
    CategoryBrowseItem category,
    List<CategoryBrowseItem> all,
    List<Product> products,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CategoryDetailPage(
          platformId: widget.platformId,
          platformName: widget.platformName,
          primaryColor: widget.primaryColor,
          category: category,
          siblingCategories: siblingCategoriesFor(
            selected: category,
            all: all,
          ),
          products: productsInCategory(products, category.name),
          allPlatformProducts: products,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<
      ({List<CategoryBrowseItem> categories, List<Product> products})
    >(
      future: _catalogFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const SizedBox.shrink();
        }

        final payload = snapshot.data;
        final categories = payload?.categories ?? const <CategoryBrowseItem>[];
        if (categories.isEmpty) {
          return const SizedBox.shrink();
        }

        final products = payload?.products ?? const <Product>[];
        final visible =
            categories.length <= HomeCategoriesCarousel.maxCategories
            ? categories
            : categories
                  .take(HomeCategoriesCarousel.maxCategories)
                  .toList(growable: false);

        return Material(
          color: widget.backgroundColor,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(0, 2, 0, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
                  child: Row(
                    children: [
                      Text(
                        'Categories',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              color: widget.titleColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 17,
                              height: 1.1,
                            ),
                      ),
                      const Spacer(),
                      if (widget.onViewAll != null)
                        TextButton(
                          onPressed: widget.onViewAll,
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 0,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'View all',
                            style: Theme.of(context).textTheme.labelLarge
                                ?.copyWith(
                                  color: widget.primaryColor,
                                  fontWeight: FontWeight.w700,
                                  height: 1.1,
                                ),
                          ),
                        ),
                    ],
                  ),
                ),
                SizedBox(
                  height: HomeCategoriesCarousel.carouselHeight,
                  child: HorizontalEndFade(
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(14, 0, 22, 0),
                      scrollDirection: Axis.horizontal,
                      itemCount: visible.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final category = visible[index];
                        return _HomeCategoryTile(
                          category: category,
                          primaryColor: widget.primaryColor,
                          titleColor: widget.titleColor,
                          onTap: () => _openCategory(
                            context,
                            category,
                            categories,
                            products,
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _HomeCategoryTile extends StatelessWidget {
  const _HomeCategoryTile({
    required this.category,
    required this.primaryColor,
    required this.titleColor,
    required this.onTap,
  });

  final CategoryBrowseItem category;
  final Color primaryColor;
  final Color titleColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: HomeCategoriesCarousel.tileWidth,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: HomeCategoriesCarousel.tileWidth,
                height: HomeCategoriesCarousel.imageHeight,
                child: _CategoryImage(
                  imageUrl: category.imageUrl,
                  iconName: category.iconName,
                  iconImageUrl: category.iconImageUrl,
                  primaryColor: primaryColor,
                  iconColor: category.iconColor,
                  iconBackgroundColor: category.iconBackgroundColor,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: titleColor,
                fontWeight: FontWeight.w600,
                height: 1.15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

bool _isGuestMode() => GuestSession.isGuest && !AuthSession.isLoggedInSync;

void _redirectGuestToLogin(BuildContext context) {
  redirectGuestToLogin(context);
}

// ---------------------------------------------------------------------------
// Overview — Shoply-style category grid (platform-scoped)
// ---------------------------------------------------------------------------

class CategoriesOverviewPage extends StatefulWidget {
  const CategoriesOverviewPage({
    super.key,
    required this.platformId,
    required this.platformName,
    required this.primaryColor,
    required this.storeTypesFuture,
    required this.productsFuture,
    /// Left-nav Categories: every Super Admin published category.
    /// Platform View All: leave false to keep this platform only.
    this.showAllPlatforms = false,
    this.onMenuTap,
  });

  final String platformId;
  final String platformName;
  final Color primaryColor;
  final Future<List<StoreTypeSummary>> storeTypesFuture;
  final Future<List<Product>> productsFuture;
  final bool showAllPlatforms;
  /// Opens the shop platform sidebar (same as the Shop header menu).
  final VoidCallback? onMenuTap;

  @override
  State<CategoriesOverviewPage> createState() => _CategoriesOverviewPageState();
}

class _CategoriesOverviewPageState extends State<CategoriesOverviewPage> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  String _query = '';
  _CategorySortOption _sort = _CategorySortOption.mostPopular;
  late final Future<_CategoriesCatalogPayload> _catalogFuture;

  @override
  void initState() {
    super.initState();
    _catalogFuture = _loadCatalog();
    _searchFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  Future<_CategoriesCatalogPayload> _loadCatalog() async {
    final storeTypes = await widget.storeTypesFuture;
    final products = await widget.productsFuture;
    final categories = widget.showAllPlatforms
        ? buildAllPublishedCategories(
            storeTypes: storeTypes,
            products: products,
          )
        : buildPlatformCategories(
            platformId: widget.platformId,
            storeTypes: storeTypes,
            products: products,
          );
    return _CategoriesCatalogPayload(
      categories: categories,
      products: products,
    );
  }

  List<CategoryBrowseItem> _sortedCategories(
    List<CategoryBrowseItem> input,
    List<Product> products,
  ) {
    final items = List<CategoryBrowseItem>.of(input);
    final favoriteIds =
        FavoriteProductsStore.instance.favoriteProductIdsNotifier.value
            .map((id) => id.trim())
            .where((id) => id.isNotEmpty)
            .toSet();

    int likedCountFor(CategoryBrowseItem category) {
      var count = 0;
      for (final product in products) {
        if (!product.belongsToCategory(category.name)) continue;
        if (favoriteIds.contains(product.id.trim())) count += 1;
      }
      return count;
    }

    double avgRatingFor(CategoryBrowseItem category) {
      var total = 0.0;
      var rated = 0;
      for (final product in products) {
        if (!product.belongsToCategory(category.name)) continue;
        if (product.rating <= 0) continue;
        total += product.rating;
        rated += 1;
      }
      if (rated == 0) return 0;
      return total / rated;
    }

    int nameCmp(CategoryBrowseItem a, CategoryBrowseItem b) =>
        a.name.toLowerCase().compareTo(b.name.toLowerCase());

    items.sort((a, b) {
      switch (_sort) {
        case _CategorySortOption.nameAsc:
          return nameCmp(a, b);
        case _CategorySortOption.nameDesc:
          return nameCmp(b, a);
        case _CategorySortOption.mostPopular:
          final byCount = b.itemCount.compareTo(a.itemCount);
          return byCount != 0 ? byCount : nameCmp(a, b);
        case _CategorySortOption.fewestItems:
          final byCount = a.itemCount.compareTo(b.itemCount);
          return byCount != 0 ? byCount : nameCmp(a, b);
        case _CategorySortOption.mostLiked:
          final byLiked =
              likedCountFor(b).compareTo(likedCountFor(a));
          return byLiked != 0 ? byLiked : nameCmp(a, b);
        case _CategorySortOption.topRated:
          final byRating =
              avgRatingFor(b).compareTo(avgRatingFor(a));
          return byRating != 0 ? byRating : nameCmp(a, b);
      }
    });
    return items;
  }

  void _openCategory(
    CategoryBrowseItem category,
    List<CategoryBrowseItem> all,
    List<Product> products,
  ) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CategoryDetailPage(
          platformId: widget.platformId,
          platformName: widget.platformName,
          primaryColor: widget.primaryColor,
          category: category,
          siblingCategories: siblingCategoriesFor(
            selected: category,
            all: all,
          ),
          products: productsInCategory(products, category.name),
          allPlatformProducts: products,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final titleColor = appLightTextPrimary;
    final secondaryColor = appLightTextSecondary;
    final surface = Theme.of(context).colorScheme.surface;
    final searchFieldColor =
        Theme.of(context).inputDecorationTheme.fillColor ??
        Theme.of(context).colorScheme.surface;
    final platformLabel = widget.platformName.trim().isEmpty
        ? 'Shop'
        : widget.platformName.trim();
    final emptyCatalogMessage = widget.showAllPlatforms
        ? 'No categories published yet.'
        : 'No categories yet for $platformLabel.';
    final isSearchActive = _searchFocusNode.hasFocus;

    return Material(
      color: surface,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Menu',
                    onPressed: () {
                      if (widget.onMenuTap != null) {
                        widget.onMenuTap!();
                        return;
                      }
                      Scaffold.maybeOf(context)?.openDrawer();
                    },
                    icon: Icon(Icons.menu_rounded,
                        size: 24, color: titleColor),
                  ),
                  Expanded(
                    child: Text(
                      'Categories',
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: titleColor,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  // Balance the menu button so the title stays centered.
                  const SizedBox(width: 48),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 12, 6, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOutCubic,
                      constraints: BoxConstraints(
                        minWidth: isSearchActive ? 300 : 360,
                        maxWidth: isSearchActive ? 420 : 360,
                      ),
                      child: app_search.ProductSearchBar(
                        controller: _searchController,
                        focusNode: _searchFocusNode,
                        iconColor: secondaryColor,
                        textColor: titleColor,
                        backgroundColor: searchFieldColor,
                        pillStyle: true,
                        hintText: 'Search categories...',
                        onChanged: (value) =>
                            setState(() => _query = value.trim()),
                        onClear: () {
                          _searchController.clear();
                          setState(() => _query = '');
                          if (!_searchFocusNode.hasFocus) {
                            _searchFocusNode.requestFocus();
                          }
                        },
                        onTapOutside: dismissSearchKeyboardOnTapOutside,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
            Expanded(
              child: FutureBuilder<_CategoriesCatalogPayload>(
                future: _catalogFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Padding(
                      padding: EdgeInsets.all(20),
                      child: SkeletonBox(width: double.infinity, height: 220),
                    );
                  }

                  if (snapshot.hasError) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Could not load categories.',
                          style: TextStyle(color: secondaryColor),
                        ),
                      ),
                    );
                  }

                  final payload = snapshot.data!;
                  return ValueListenableBuilder<List<String>>(
                    valueListenable: FavoriteProductsStore
                        .instance.favoriteProductIdsNotifier,
                    builder: (context, _, __) {
                      final matched = _query.isEmpty
                          ? payload.categories
                          : payload.categories
                              .where(
                                (item) => item.name
                                    .toLowerCase()
                                    .contains(_query.toLowerCase()),
                              )
                              .toList(growable: false);
                      final filtered = _sortedCategories(
                        matched,
                        payload.products,
                      );

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 4, 12, 0),
                            child: Row(
                              children: [
                                Text(
                                  filtered.isEmpty
                                      ? '0 categories'
                                      : '${filtered.length} categor'
                                          '${filtered.length == 1 ? 'y' : 'ies'}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelMedium
                                      ?.copyWith(color: secondaryColor),
                                ),
                                const Spacer(),
                                _CategoriesSortButton(
                                  value: _sort,
                                  primaryColor: widget.primaryColor,
                                  secondaryColor: secondaryColor,
                                  titleColor: titleColor,
                                  onChanged: (next) =>
                                      setState(() => _sort = next),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: filtered.isEmpty
                                ? Center(
                                    child: Padding(
                                      padding: const EdgeInsets.all(32),
                                      child: Text(
                                        _query.isEmpty
                                            ? emptyCatalogMessage
                                            : 'No categories match “$_query”.',
                                        textAlign: TextAlign.center,
                                        style:
                                            TextStyle(color: secondaryColor),
                                      ),
                                    ),
                                  )
                                : LayoutBuilder(
                                    builder: (context, constraints) {
                                      const crossAxisCount = 2;
                                      const spacing = 14.0;
                                      const horizontalPadding = 32.0;
                                      const textBlockHeight = 56.0;
                                      // 1px border on top + bottom of the card.
                                      const borderThickness = 2.0;
                                      final usableWidth =
                                          constraints.maxWidth -
                                              horizontalPadding -
                                              spacing;
                                      final tileWidth =
                                          usableWidth / crossAxisCount;
                                      final imageHeight = tileWidth * 3 / 4;
                                      final mainAxisExtent = imageHeight +
                                          textBlockHeight +
                                          borderThickness;

                                      return GridView.builder(
                                        padding: const EdgeInsets.fromLTRB(
                                          16,
                                          8,
                                          16,
                                          24,
                                        ),
                                        gridDelegate:
                                            SliverGridDelegateWithFixedCrossAxisCount(
                                          crossAxisCount: crossAxisCount,
                                          mainAxisSpacing: spacing,
                                          crossAxisSpacing: spacing,
                                          mainAxisExtent: mainAxisExtent,
                                        ),
                                        itemCount: filtered.length,
                                        itemBuilder: (context, index) {
                                          final category = filtered[index];
                                          return _CategoryOverviewCard(
                                            category: category,
                                            primaryColor: widget.primaryColor,
                                            titleColor: titleColor,
                                            secondaryColor: secondaryColor,
                                            onTap: () => _openCategory(
                                              category,
                                              payload.categories,
                                              payload.products,
                                            ),
                                          );
                                        },
                                      );
                                    },
                                  ),
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoriesCatalogPayload {
  const _CategoriesCatalogPayload({
    required this.categories,
    required this.products,
  });

  final List<CategoryBrowseItem> categories;
  final List<Product> products;
}

enum _CategorySortOption {
  nameAsc,
  nameDesc,
  mostPopular,
  fewestItems,
  mostLiked,
  topRated,
}

extension on _CategorySortOption {
  String get label {
    switch (this) {
      case _CategorySortOption.nameAsc:
        return 'A – Z';
      case _CategorySortOption.nameDesc:
        return 'Z – A';
      case _CategorySortOption.mostPopular:
        return 'Most popular';
      case _CategorySortOption.fewestItems:
        return 'Fewest items';
      case _CategorySortOption.mostLiked:
        return 'Most liked';
      case _CategorySortOption.topRated:
        return 'Top rated';
    }
  }

  IconData get icon {
    switch (this) {
      case _CategorySortOption.nameAsc:
        return Icons.sort_by_alpha_rounded;
      case _CategorySortOption.nameDesc:
        return Icons.sort_by_alpha_rounded;
      case _CategorySortOption.mostPopular:
        return Icons.local_fire_department_rounded;
      case _CategorySortOption.fewestItems:
        return Icons.filter_list_rounded;
      case _CategorySortOption.mostLiked:
        return Icons.favorite_rounded;
      case _CategorySortOption.topRated:
        return Icons.star_rounded;
    }
  }
}

class _CategoriesSortButton extends StatelessWidget {
  const _CategoriesSortButton({
    required this.value,
    required this.primaryColor,
    required this.secondaryColor,
    required this.titleColor,
    required this.onChanged,
  });

  final _CategorySortOption value;
  final Color primaryColor;
  final Color secondaryColor;
  final Color titleColor;
  final ValueChanged<_CategorySortOption> onChanged;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<_CategorySortOption>(
      tooltip: 'Sort categories',
      initialValue: value,
      onSelected: onChanged,
      offset: const Offset(0, 40),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      itemBuilder: (context) {
        return _CategorySortOption.values.map((option) {
          final selected = option == value;
          return PopupMenuItem<_CategorySortOption>(
            value: option,
            child: Row(
              children: [
                Icon(
                  option.icon,
                  size: 18,
                  color: selected ? primaryColor : secondaryColor,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    option.label,
                    style: TextStyle(
                      color: selected ? primaryColor : titleColor,
                      fontWeight:
                          selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
                if (selected)
                  Icon(Icons.check_rounded, size: 18, color: primaryColor),
              ],
            ),
          );
        }).toList(growable: false);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Color.lerp(
                Theme.of(context).colorScheme.surface,
                primaryColor,
                0.08,
              ) ??
              primaryColor.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.swap_vert_rounded, size: 18, color: primaryColor),
            const SizedBox(width: 6),
            Text(
              value.label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(width: 2),
            Icon(Icons.expand_more_rounded, size: 18, color: secondaryColor),
          ],
        ),
      ),
    );
  }
}

class _CategoryOverviewCard extends StatelessWidget {
  const _CategoryOverviewCard({
    required this.category,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onTap,
  });

  final CategoryBrowseItem category;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(16);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: radius,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: radius,
            border: Border.all(
              color: secondaryColor.withValues(alpha: 0.22),
              width: 1,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Flush to the card border on top / left / right.
              AspectRatio(
                aspectRatio: 4 / 3,
                child: _CategoryImage(
                  imageUrl: category.imageUrl,
                  iconName: category.iconName,
                  iconImageUrl: category.iconImageUrl,
                  primaryColor: primaryColor,
                  iconColor: category.iconColor,
                  iconBackgroundColor: category.iconBackgroundColor,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 8, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            category.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(
                                  color: titleColor,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            formatCategoryItemCount(category.itemCount),
                            style: Theme.of(context)
                                .textTheme
                                .labelSmall
                                ?.copyWith(color: secondaryColor),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: secondaryColor.withValues(alpha: 0.7),
                      size: 22,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
class _CategoryImage extends StatelessWidget {
  const _CategoryImage({
    required this.imageUrl,
    required this.iconName,
    required this.primaryColor,
    this.iconImageUrl = '',
    this.iconColor,
    this.iconBackgroundColor,
  });

  /// Super Admin category photo. Empty ⇒ render showcase icon surface.
  final String imageUrl;
  final String iconName;
  final String iconImageUrl;
  final Color primaryColor;
  final Color? iconColor;
  final Color? iconBackgroundColor;

  Color get _glyphColor => iconColor ?? primaryColor;
  Color get _badgeBg =>
      iconBackgroundColor ??
      (Color.lerp(Colors.white, primaryColor, 0.14) ?? primaryColor);

  @override
  Widget build(BuildContext context) {
    final photoUrl = imageUrl.trim();
    if (photoUrl.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: photoUrl,
        fit: BoxFit.cover,
        placeholder: (_, __) => _showcaseIconSurface(),
        errorWidget: (_, __, ___) => _showcaseIconSurface(),
      );
    }
    return _showcaseIconSurface();
  }

  /// Mirrors Super Admin `.business-type-showcase__category-icon-surface`.
  Widget _showcaseIconSurface() {
    final softBg = Color.lerp(Colors.white, _badgeBg, 0.55) ?? _badgeBg;

    return ColoredBox(
      color: softBg,
      child: Center(
        child: Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _badgeBg,
            border: Border.all(color: Colors.white, width: 4),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Center(child: _surfaceGlyph(size: 32)),
        ),
      ),
    );
  }

  Widget _surfaceGlyph({required double size}) {
    final uploadedIcon = iconImageUrl.trim();
    if (uploadedIcon.isNotEmpty) {
      return Padding(
        padding: EdgeInsets.all(size * 0.22),
        child: CachedNetworkImage(
          imageUrl: uploadedIcon,
          fit: BoxFit.contain,
          width: size,
          height: size,
          placeholder: (_, __) => _namedIcon(size: size),
          errorWidget: (_, __, ___) => _namedIcon(size: size),
        ),
      );
    }
    return _namedIcon(size: size);
  }

  Widget _namedIcon({required double size}) {
    final resolved = iconName.trim().isEmpty ? 'tag' : iconName.trim();
    final key = _normalizeLucideCategoryIconKey(resolved);
    final hasInlinePath = _kCategoryIconSvgPaths.containsKey(key);
    final inlineSvg = SvgPicture.string(
      _categoryIconSvgMarkup(resolved),
      width: size,
      height: size,
      fit: BoxFit.contain,
      colorFilter: ColorFilter.mode(_glyphColor, BlendMode.srcIn),
    );

    // Prefer Super Admin inline paths (correct glyph + no CDN mismatch).
    if (hasInlinePath || key == 'tag') {
      return inlineSvg;
    }

    final svgUrl = categoryIconSvgUrl(resolved);
    if (svgUrl == null) return inlineSvg;

    return SvgPicture.network(
      svgUrl,
      width: size,
      height: size,
      fit: BoxFit.contain,
      colorFilter: ColorFilter.mode(_glyphColor, BlendMode.srcIn),
      placeholderBuilder: (_) => inlineSvg,
      errorBuilder: (_, __, ___) => inlineSvg,
    );
  }
}

// ---------------------------------------------------------------------------
// Detail — hero + chips + subcategories + products (platform-scoped)
// ---------------------------------------------------------------------------

class CategoryDetailPage extends StatefulWidget {
  const CategoryDetailPage({
    super.key,
    required this.platformId,
    required this.platformName,
    required this.primaryColor,
    required this.category,
    required this.siblingCategories,
    required this.products,
    required this.allPlatformProducts,
  });

  final String platformId;
  final String platformName;
  final Color primaryColor;
  final CategoryBrowseItem category;
  final List<CategoryBrowseItem> siblingCategories;
  final List<Product> products;
  final List<Product> allPlatformProducts;

  @override
  State<CategoryDetailPage> createState() => _CategoryDetailPageState();
}

class _CategoryDetailPageState extends State<CategoryDetailPage> {
  static const String _allChipId = 'all';
  String _selectedChipId = _allChipId;

  List<Product> get _visibleProducts {
    if (_selectedChipId == _allChipId) {
      return widget.products;
    }
    return widget.products
        .where((product) => product.belongsToCategory(_selectedChipId))
        .toList(growable: false);
  }

  Future<void> _openCart() async {
    if (_isGuestMode()) {
      _redirectGuestToLogin(context);
      return;
    }
    await openCartPage(context, platformId: widget.platformId);
  }

  Future<void> _toggleFavorite(Product product) async {
    if (_isGuestMode()) {
      _redirectGuestToLogin(context);
      return;
    }
    await FavoriteProductsStore.instance.toggleFavorite(product.id);
    if (!mounted) return;
    setState(() {});
  }

  Future<void> _addToCart(Product product) async {
    if (_isGuestMode()) {
      _redirectGuestToLogin(context);
      return;
    }
    try {
      await CartStore.instance.addItem(
        product,
        quantity: 1,
        catalogProducts: widget.allPlatformProducts,
        platformId: widget.platformId,
      );
      if (!mounted) return;
      AppSnackBar.showSuccess(context, message: 'Added to cart.');
    } on FlashDealReserveException catch (error) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: error.message);
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(
        context,
        message: 'Unable to add this product to your cart.',
      );
    }
  }

  void _openProduct(Product product) {
    unawaited(
      openProductDetailsPage(
        context,
        product,
        platformId: widget.platformId,
      ),
    );
  }

  void _selectSibling(CategoryBrowseItem sibling) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => CategoryDetailPage(
          platformId: widget.platformId,
          platformName: widget.platformName,
          primaryColor: widget.primaryColor,
          category: sibling,
          siblingCategories: siblingCategoriesFor(
            selected: sibling,
            all: [
              widget.category,
              ...widget.siblingCategories,
            ],
          ),
          products: productsInCategory(
            widget.allPlatformProducts,
            sibling.name,
          ),
          allPlatformProducts: widget.allPlatformProducts,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final titleColor = appLightTextPrimary;
    final secondaryColor = appLightTextSecondary;
    final surface = Theme.of(context).colorScheme.surface;
    final categoryName = widget.category.name;
    final chips = <({String id, String label})>[
      (id: _allChipId, label: 'All'),
      ...widget.siblingCategories
          .take(8)
          .map((item) => (id: item.name, label: item.name)),
    ];
    final visible = _visibleProducts;

    return Scaffold(
      backgroundColor: surface,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 2, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Back',
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: Icon(Icons.arrow_back_ios_new_rounded,
                        size: 20, color: titleColor),
                  ),
                  Expanded(
                    child: Text(
                      categoryName,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: titleColor,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  ValueListenableBuilder<List<CartItemData>>(
                    valueListenable: CartStore.instance.cartItemsNotifier,
                    builder: (context, items, _) {
                      final count = cartEntryCount(items);
                      return IconButton(
                        tooltip: 'Cart',
                        onPressed: () => unawaited(_openCart()),
                        icon: Badge(
                          isLabelVisible: count > 0,
                          backgroundColor: widget.primaryColor,
                          label: Text(
                            '$count',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: Icon(
                            Icons.shopping_bag_outlined,
                            color: secondaryColor,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            Expanded(
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      child: _CategoryHeroBanner(
                        category: widget.category,
                        primaryColor: widget.primaryColor,
                        platformName: widget.platformName,
                        onShopTap: () {
                          // Already on this category — scroll to products.
                        },
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: SizedBox(
                        height: 42,
                        child: HorizontalEndFade(
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                            scrollDirection: Axis.horizontal,
                            itemCount: chips.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 8),
                            itemBuilder: (context, index) {
                              final chip = chips[index];
                              final selected = chip.id == _selectedChipId;
                              return _CategoryFilterChip(
                                label: chip.label,
                                selected: selected,
                                primaryColor: widget.primaryColor,
                                onTap: () {
                                  if (chip.id == _allChipId) {
                                    setState(() => _selectedChipId = _allChipId);
                                    return;
                                  }
                                  final match = widget.siblingCategories
                                      .where((s) => s.name == chip.id)
                                      .toList(growable: false);
                                  if (match.isNotEmpty) {
                                    _selectSibling(match.first);
                                  }
                                },
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (widget.siblingCategories.isNotEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'Shop by subcategory',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          color: titleColor,
                                          fontWeight: FontWeight.w800,
                                        ),
                                  ),
                                ),
                                Text(
                                  'See All >',
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelMedium
                                      ?.copyWith(
                                        color: widget.primaryColor,
                                        fontWeight: FontWeight.w600,
                                      ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              height: 108,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: widget.siblingCategories.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(width: 10),
                                itemBuilder: (context, index) {
                                  final sibling =
                                      widget.siblingCategories[index];
                                  return _SubcategoryTile(
                                    category: sibling,
                                    primaryColor: widget.primaryColor,
                                    titleColor: titleColor,
                                    onTap: () => _selectSibling(sibling),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Popular products',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    color: titleColor,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                          ),
                          Text(
                            formatCategoryItemCount(visible.length),
                            style: Theme.of(context)
                                .textTheme
                                .labelMedium
                                ?.copyWith(color: secondaryColor),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (visible.isEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
                        child: Text(
                          'No products in this category yet.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: secondaryColor),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      sliver: SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.62,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final product = visible[index];
                            return ValueListenableBuilder<List<String>>(
                              valueListenable: FavoriteProductsStore
                                  .instance.favoriteProductIdsNotifier,
                              builder: (context, favorites, _) {
                                final isFavorite =
                                    favorites.contains(product.id);
                                return _CategoryProductCard(
                                  product: product,
                                  primaryColor: widget.primaryColor,
                                  titleColor: titleColor,
                                  secondaryColor: secondaryColor,
                                  isFavorite: isFavorite,
                                  onTap: () => _openProduct(product),
                                  onFavoriteTap: () =>
                                      unawaited(_toggleFavorite(product)),
                                  onAddToCart: () =>
                                      unawaited(_addToCart(product)),
                                );
                              },
                            );
                          },
                          childCount: visible.length,
                        ),
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                      child: _CategoryFooterBanner(
                        categoryName: categoryName,
                        primaryColor: widget.primaryColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryHeroBanner extends StatelessWidget {
  const _CategoryHeroBanner({
    required this.category,
    required this.primaryColor,
    required this.platformName,
    required this.onShopTap,
  });

  final CategoryBrowseItem category;
  final Color primaryColor;
  final String platformName;
  final VoidCallback onShopTap;

  @override
  Widget build(BuildContext context) {
    final platformLabel =
        platformName.trim().isEmpty ? 'Shop' : platformName.trim();

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        height: 168,
        child: Stack(
          fit: StackFit.expand,
          children: [
            _CategoryImage(
              imageUrl: category.imageUrl,
              iconName: category.iconName,
              iconImageUrl: category.iconImageUrl,
              primaryColor: primaryColor,
              iconColor: category.iconColor,
              iconBackgroundColor: category.iconBackgroundColor,
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Colors.black.withValues(alpha: 0.72),
                    Colors.black.withValues(alpha: 0.28),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'MADE FOR EVERYDAY · ${platformLabel.toUpperCase()}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.82),
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.4,
                        ),
                  ),
                  const Spacer(),
                  Text(
                    'Explore ${category.name}',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          height: 1.15,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Quality picks, closer to you.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.88),
                        ),
                  ),
                  const SizedBox(height: 12),
                  Material(
                    color: primaryColor,
                    borderRadius: BorderRadius.circular(999),
                    child: InkWell(
                      onTap: onShopTap,
                      borderRadius: BorderRadius.circular(999),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 8,
                        ),
                        child: Text(
                          'Shop ${category.name} →',
                          style:
                              Theme.of(context).textTheme.labelLarge?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryFilterChip extends StatelessWidget {
  const _CategoryFilterChip({
    required this.label,
    required this.selected,
    required this.primaryColor,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color primaryColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? primaryColor : const Color(0xFFF3F4F6),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: AnimatedContainer(
          duration: appMotionFrames(8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: selected ? Colors.white : appLightTextPrimary,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
      ),
    );
  }
}

class _SubcategoryTile extends StatelessWidget {
  const _SubcategoryTile({
    required this.category,
    required this.primaryColor,
    required this.titleColor,
    required this.onTap,
  });

  final CategoryBrowseItem category;
  final Color primaryColor;
  final Color titleColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 88,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: 88,
                height: 72,
                child: _CategoryImage(
                  imageUrl: category.imageUrl,
                  iconName: category.iconName,
                  iconImageUrl: category.iconImageUrl,
                  primaryColor: primaryColor,
                  iconColor: category.iconColor,
                  iconBackgroundColor: category.iconBackgroundColor,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w600,
                    height: 1.15,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryProductCard extends StatelessWidget {
  const _CategoryProductCard({
    required this.product,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.isFavorite,
    required this.onTap,
    required this.onFavoriteTap,
    required this.onAddToCart,
  });

  final Product product;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final bool isFavorite;
  final VoidCallback onTap;
  final VoidCallback onFavoriteTap;
  final VoidCallback onAddToCart;

  double get _displayPrice {
    final sales = product.salesPrice;
    if (sales != null && sales >= 0) return sales;
    return product.originalPrice;
  }

  @override
  Widget build(BuildContext context) {
    return ProductCardTapLift(
      onTap: onTap,
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: handleTap,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE8EAED)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    flex: 55,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Hero(
                          tag: heroTag,
                          child: ProductCardTapLift.liftImage(
                            liftValue: liftValue,
                            child: CachedNetworkImage(
                              imageUrl: product.imageUrl,
                              fit: BoxFit.cover,
                              placeholder: (_, __) =>
                                  Container(color: const Color(0xFFF3F4F6)),
                              errorWidget: (_, __, ___) => ColoredBox(
                                color: const Color(0xFFF3F4F6),
                                child: Icon(
                                  Icons.image_outlined,
                                  color: secondaryColor,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Material(
                            color: Colors.white.withValues(alpha: 0.92),
                            shape: const CircleBorder(),
                            child: InkWell(
                              customBorder: const CircleBorder(),
                              onTap: onFavoriteTap,
                              child: Padding(
                                padding: const EdgeInsets.all(6),
                                child: Icon(
                                  isFavorite
                                      ? Icons.favorite_rounded
                                      : Icons.favorite_border_rounded,
                                  size: 18,
                                  color: isFavorite
                                      ? const Color(0xFFE11D48)
                                      : secondaryColor,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 45,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                size: 14,
                                color: Color(0xFFF59E0B),
                              ),
                              const SizedBox(width: 2),
                              Text(
                                product.rating.toStringAsFixed(1),
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      color: titleColor,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                              if (product.ratingCount > 0) ...[
                                Text(
                                  ' (${product.ratingCount})',
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelSmall
                                      ?.copyWith(color: secondaryColor),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            product.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: titleColor,
                                  fontWeight: FontWeight.w600,
                                  height: 1.2,
                                ),
                          ),
                          const Spacer(),
                          Row(
                            children: [
                              Expanded(
                                child: AppPriceText(
                                  amount: _displayPrice,
                                  color: titleColor,
                                  fontWeight: FontWeight.w800,
                                  fontSize: Theme.of(context)
                                          .textTheme
                                          .titleSmall
                                          ?.fontSize ??
                                      14,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Material(
                                color: primaryColor,
                                borderRadius: BorderRadius.circular(8),
                                child: InkWell(
                                  onTap: onAddToCart,
                                  borderRadius: BorderRadius.circular(8),
                                  child: const SizedBox(
                                    width: 30,
                                    height: 30,
                                    child: Icon(
                                      Icons.shopping_cart_outlined,
                                      size: 16,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _CategoryFooterBanner extends StatelessWidget {
  const _CategoryFooterBanner({
    required this.categoryName,
    required this.primaryColor,
  });

  final String categoryName;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Color.lerp(Colors.white, primaryColor, 0.10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: Color.lerp(Colors.white, primaryColor, 0.22)!,
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.eco_outlined, color: primaryColor, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Better $categoryName. Brighter possibilities. Quality picks for a better tomorrow.',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: appLightTextPrimary,
                    height: 1.25,
                  ),
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: primaryColor),
        ],
      ),
    );
  }
}
