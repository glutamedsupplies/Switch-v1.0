import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:switch_app/add_to_cart.dart';
import 'package:switch_app/place_order.dart';
import 'package:switch_app/buy.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/chat_support.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:switch_app/customer_review.dart';
import 'package:switch_app/review_media_viewer.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/guest_session.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/main.dart' show HomeFeedProductCard;
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/own_listing.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/models/store_type_summary.dart';
import 'package:switch_app/search_bar.dart' as app_search;
import 'package:switch_app/services/flash_deals_service.dart'
    show
        BuyerFlashDeal,
        FlashDealReserveException,
        productFlashDealCountdown,
        productLiveFlashDeal,
        releaseFlashDealReservation,
        reserveFlashDealStock;
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/services/seller_profile_stats_service.dart';
import 'package:switch_app/services/store_type_repository.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/theme/product_layout.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/utils/image_tone.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/utils/session_image_cache.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:switch_app/widgets/bouncing_dots_loader.dart';
import 'package:switch_app/widgets/home_voucher_carousel.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';
import 'package:video_player/video_player.dart';
import 'package:switch_app/widgets/product_company_identity.dart';
import 'package:switch_app/widgets/lucide_share_icon.dart';
import 'package:switch_app/widgets/report_listing_sheet.dart';
import 'package:switch_app/services/listing_report_service.dart';
import 'package:switch_app/utils/share_links.dart';

const String _kProductDetailsBackSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="m15 18-6-6 6-6"/>'
    '</svg>';

const String _kProductDetailsSearchSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="m21 21-4.34-4.34"/>'
    '<circle cx="11" cy="11" r="8"/>'
    '</svg>';

const String _kProductDetailsCartSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/>'
    '<path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/>'
    '<circle cx="18" cy="20" r="2"/>'
    '<circle cx="8" cy="20" r="2"/>'
    '</svg>';

const String _kProductDetailsChatSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M19.95 10.05a7 7 0 011.412 7.872 1 1 0 00-.058.787l.675 2.089a1 1 0 01-1.236 1.168l-2.155-.631a1 1 0 00-.745.06 7 7 0 01-7.793-1.445"/>'
    '<path d="M2.696 12.708a1 1 0 00-.058-.785 7 7 0 113.518 3.473 1 1 0 00-.744-.061l-2.155.63a1 1 0 01-1.236-1.167z"/>'
    '</svg>';

const String _kProductDetailsCartPlusSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M16 5h6"/>'
    '<path d="M19 2v6"/>'
    '<path d="m2.05 2.05 1.099-.028a1 1 0 011.008.815l2.69 14.347A1 1 0 007.83 18H18"/>'
    '<path d="M4.564 5H12"/>'
    '<path d="M6.25 14h12.712a2 2 0 001.991-1.57l.172-1.041"/>'
    '<circle cx="18" cy="20" r="2"/>'
    '<circle cx="8" cy="20" r="2"/>'
    '</svg>';

class _ProductDetailsLucideIcon extends StatelessWidget {
  const _ProductDetailsLucideIcon({
    required this.svg,
    required this.color,
    this.size = 24,
  });

  final String svg;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      svg,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }
}

const String _kLucideTruckSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>'
    '<path d="M15 18H9"/>'
    '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35'
    'A1 1 0 0 0 17.52 8H14"/>'
    '<circle cx="17" cy="18" r="2"/>'
    '<circle cx="7" cy="18" r="2"/>'
    '</svg>';

const String _kLucideBoxSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8'
    'a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>'
    '<path d="m3.3 7 8.7 5 8.7-5"/>'
    '<path d="M12 22V12"/>'
    '</svg>';

const String _kLucideCalendarSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M8 2v3"/>'
    '<path d="M16 2v3"/>'
    '<rect x="3" y="3" width="18" height="18" rx="2"/>'
    '<path d="M3 9h18"/>'
    '</svg>';

const String _kLucideShoppingBagSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M16 10a4 4 0 0 1-8 0"/>'
    '<path d="M3.103 6.034h17.794"/>'
    '<path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2'
    'V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>'
    '</svg>';

const String _kLucideTrendingUpSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>'
    '<polyline points="16 7 22 7 22 13"/>'
    '</svg>';

const String _kLucideStarSvg =
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 '
    '1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 '
    '0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 '
    '0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 '
    '0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 '
    '0 1.597-1.16z"/>'
    '</svg>';

class _ProductTitleIconBadge extends StatelessWidget {
  const _ProductTitleIconBadge({
    required this.svg,
    required this.colors,
    this.filledIcon = false,
  });

  static const double size = 22;

  final String svg;
  final List<Color> colors;
  final bool filledIcon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(7),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: _ProductDetailsLucideIcon(
        svg: svg,
        color: Colors.white,
        size: filledIcon ? 13 : 14,
      ),
    );
  }
}

/// Platform and placeholder names that sellers' data sometimes stores as a
/// category; they are not catalog categories and stay hidden on the chip.
const Set<String> _kPlatformCategoryKeys = {
  'food',
  'shop',
  'hotel',
  'hotels',
  'resort',
  'resorts',
  'general',
  'uncategorized',
};

String _normalizeProductCategoryIconName(String value) {
  var key = value.trim().toLowerCase();
  if (key.startsWith('tabler:') || key.startsWith('tabler-')) {
    return key;
  }
  key = key.replaceFirst(RegExp(r'^lucide[:_-]'), '');
  key = key
      .replaceAll('&', ' and ')
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'-{2,}'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  const aliases = <String, String>{
    'apparel': 'shirt',
    'bakery': 'croissant',
    'bakeries': 'croissant',
    'beverage': 'coffee',
    'beverages': 'coffee',
    'breakfast': 'croissant',
    'burgers': 'hamburger',
    'clothes': 'shirt',
    'clothing': 'shirt',
    'desserts': 'cake',
    'drinks': 'coffee',
    'electronics': 'laptop',
    'fashion': 'shirt',
    'food': 'utensils',
    'foods': 'utensils',
    'fruits': 'apple',
    'gadgets': 'smartphone',
    'health': 'pill',
    'meals': 'utensils',
    'pastries': 'croissant',
    'pharmacy': 'pill',
    'products': 'package',
    'snacks': 'sandwich',
    'technology': 'laptop',
    'vegetables': 'carrot',
    'wellness': 'pill',
  };
  return aliases[key] ?? (key.isEmpty ? 'tag' : key);
}

String _productCategoryIconSvgUrl(String iconName) {
  final normalized = _normalizeProductCategoryIconName(iconName);
  if (normalized.startsWith('tabler:')) {
    final slug = normalized.substring(7);
    return 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.44.0/icons/outline/$slug.svg';
  }
  if (normalized.startsWith('tabler-')) {
    final slug = normalized.substring(7);
    return 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.44.0/icons/outline/$slug.svg';
  }
  return 'https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/$normalized.svg';
}

class _ProductDetailsCategoryIcon extends StatelessWidget {
  const _ProductDetailsCategoryIcon({
    required this.categoryName,
    required this.iconName,
    required this.iconImageUrl,
    required this.color,
  });

  final String categoryName;
  final String iconName;
  final String iconImageUrl;
  final Color color;

  static const double _size = 18;

  Widget _fallback() {
    final effectiveName = iconName.trim().isNotEmpty ? iconName : categoryName;
    return SvgPicture.network(
      _productCategoryIconSvgUrl(effectiveName),
      width: _size,
      height: _size,
      fit: BoxFit.contain,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      placeholderBuilder: (_) =>
          Icon(Icons.sell_outlined, size: _size, color: color),
      errorBuilder: (context, error, stackTrace) =>
          Icon(Icons.sell_outlined, size: _size, color: color),
    );
  }

  Widget? _dataImage(String source) {
    if (!source.toLowerCase().startsWith('data:image/')) return null;
    final commaIndex = source.indexOf(',');
    if (commaIndex < 0) return null;
    try {
      final metadata = source.substring(0, commaIndex).toLowerCase();
      final payload = source.substring(commaIndex + 1);
      final bytes = metadata.contains(';base64')
          ? base64Decode(payload)
          : Uint8List.fromList(utf8.encode(Uri.decodeComponent(payload)));
      if (metadata.contains('svg+xml')) {
        return SvgPicture.string(
          utf8.decode(bytes),
          width: _size,
          height: _size,
          fit: BoxFit.contain,
        );
      }
      return Image.memory(
        bytes,
        width: _size,
        height: _size,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => _fallback(),
      );
    } on FormatException {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final uploadedIcon = iconImageUrl.trim();
    if (uploadedIcon.isEmpty) return _fallback();

    final dataImage = _dataImage(uploadedIcon);
    if (dataImage != null) return dataImage;

    final uri = Uri.tryParse(uploadedIcon);
    if ((uri?.path.toLowerCase().endsWith('.svg') ?? false)) {
      return SvgPicture.network(
        uploadedIcon,
        width: _size,
        height: _size,
        fit: BoxFit.contain,
        placeholderBuilder: (_) => _fallback(),
        errorBuilder: (context, error, stackTrace) => _fallback(),
      );
    }

    return Image.network(
      uploadedIcon,
      width: _size,
      height: _size,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) => _fallback(),
    );
  }
}

enum ProductDetailsEntrySource { standard, cart }

final Duration _productDetailsPageTransitionDuration = appMotionFrames(20);

Future<void> openProductDetailsPage(
  BuildContext context,
  Product product, {
  ProductDetailsEntrySource source = ProductDetailsEntrySource.standard,
  Object? heroTag,
  String platformId = '',
}) {
  if (!isProductVisibleToUsers(product)) {
    AppSnackBar.showError(
      context,
      message: 'This product is out of stock and hidden right now.',
    );
    return Future<void>.value();
  }

  return Navigator.of(context).push(
    _ProductDetailsPageRoute(
      product: product,
      source: source,
      heroTag: heroTag,
      platformId: platformId,
    ),
  );
}

class _ProductDetailsPageRoute extends MaterialPageRoute<void> {
  _ProductDetailsPageRoute({
    required Product product,
    required ProductDetailsEntrySource source,
    required Object? heroTag,
    required String platformId,
  }) : super(
         builder: (_) => ProductDetailsPage(
           product: product,
           source: source,
           sourceHeroTag: heroTag,
           platformId: platformId,
         ),
       );

  @override
  Duration get transitionDuration => _productDetailsPageTransitionDuration;

  @override
  Duration get reverseTransitionDuration =>
      _productDetailsPageTransitionDuration;

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final primaryAnimation = CurvedAnimation(
      parent: animation,
      curve: Curves.easeInOutCubic,
      reverseCurve: Curves.easeInOutCubic,
    );
    final secondaryRouteAnimation = CurvedAnimation(
      parent: secondaryAnimation,
      curve: Curves.easeInOutCubic,
      reverseCurve: Curves.easeInOutCubic,
    );

    // Cascade slide: push from right / pop to right; previous page shifts left.
    return ClipRect(
      child: SlideTransition(
        position: Tween<Offset>(
          begin: Offset.zero,
          end: const Offset(-1, 0),
        ).animate(secondaryRouteAnimation),
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(1, 0),
            end: Offset.zero,
          ).animate(primaryAnimation),
          child: child,
        ),
      ),
    );
  }
}

class ProductDetailsPage extends StatefulWidget {
  const ProductDetailsPage({
    super.key,
    required this.product,
    this.source = ProductDetailsEntrySource.standard,
    this.sourceHeroTag,
    this.platformId = '',
  });

  final Product product;
  final ProductDetailsEntrySource source;
  final Object? sourceHeroTag;
  final String platformId;

  @override
  State<ProductDetailsPage> createState() => _ProductDetailsPageState();
}

class _ProductDetailsPageState extends State<ProductDetailsPage>
    with TickerProviderStateMixin {
  static const int _relatedProductsBatchSize = 4;
  static const double _heroExpandedHeight = 340;
  String _selectedVariantId = '';
  static const String _defaultHeaderTitle = 'Product Details';
  late final ProductRepository _productRepository;
  late final StoreTypeRepository _storeTypeRepository;
  StoreTypeCategoryDetail? _categoryIconDetail;
  List<String> _voucherBusinessTypeIds = const <String>[];
  Set<String> _nonCategoryKeys = _kPlatformCategoryKeys;
  late final ValueNotifier<Future<List<Product>>>
  _relatedProductsFutureNotifier;
  late final ValueNotifier<Product> _productNotifier;
  List<Product>? _catalogProducts;
  late List<String> _heroImageUrls;
  late List<_ProductDetailsMediaItem> _heroMediaItems;
  late final PageController _heroPageController;
  late final ScrollController _scrollController;
  late final AnimationController _cartPulseController;
  late final Animation<double> _cartPulseScale;
  final GlobalKey _aboutSectionKey = GlobalKey();
  final GlobalKey _heroImageKey = GlobalKey();
  final GlobalKey _cartIconKey = GlobalKey();
  final GlobalKey _customerReviewsSectionKey = GlobalKey();
  final GlobalKey _relatedProductsSectionKey = GlobalKey();
  late final ValueNotifier<int> _currentHeroMediaIndexNotifier;
  final ValueNotifier<bool> _heroCommentDismissedNotifier = ValueNotifier<bool>(
    false,
  );
  final ValueNotifier<int> _visibleRelatedProductsCountNotifier =
      ValueNotifier<int>(_relatedProductsBatchSize);
  final ValueNotifier<int> _bottomOverscrollSignalNotifier = ValueNotifier<int>(
    0,
  );
  bool _isCartFlightAnimating = false;
  final ValueNotifier<double?> _heroTopLuminanceNotifier =
      ValueNotifier<double?>(null);
  int _heroToneRequest = 0;
  final ValueNotifier<bool> _showsScrollToTopButtonNotifier =
      ValueNotifier<bool>(false);

  bool get _showsHeaderUtilityActions =>
      widget.source != ProductDetailsEntrySource.cart;

  bool get _isGuestMode => GuestSession.isGuest && !AuthSession.isLoggedInSync;
  bool _isOwnListing = false;
  bool _ownListingResolved = false;
  bool _reportEligible = false;
  bool _listingInsightBusy = false;

  String get _cartPlatformId {
    final explicit = widget.platformId.trim();
    if (explicit.isNotEmpty) {
      return normalizeCartPlatformId(explicit);
    }
    return CartStore.instance.activePlatformId;
  }

  @override
  void initState() {
    super.initState();
    final platformId = widget.platformId.trim();
    if (platformId.isNotEmpty) {
      unawaited(CartStore.instance.setActivePlatform(platformId));
    } else {
      unawaited(CartStore.instance.ensureLoaded());
    }
    _productRepository = createProductRepository();
    _storeTypeRepository = createStoreTypeRepository();
    _productNotifier = ValueNotifier<Product>(widget.product);
    unawaited(_loadCategoryIcon());
    _revealContentWhenResolved(_loadVariantFlashDeals());
    AuthSession.accountRevision.addListener(_handleAccountRevision);
    if (_isGuestMode) {
      _ownListingResolved = true;
    } else {
      unawaited(_resolveOwnListing());
    }
    final relatedProductsFuture = _productRepository.fetchProducts();
    _relatedProductsFutureNotifier = ValueNotifier<Future<List<Product>>>(
      relatedProductsFuture,
    );
    unawaited(
      relatedProductsFuture
          .then((products) {
            _catalogProducts = products;
          })
          .catchError((_) {}),
    );
    _heroImageUrls = _product.detailsDisplayImageUrls;
    _heroMediaItems = _buildHeroMediaItems();
    _scrollController = ScrollController();
    _cartPulseController = AnimationController(
      vsync: this,
      duration: appMotionFrames(20),
    );
    _cartPulseScale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(
          begin: 1,
          end: 1.18,
        ).chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 46,
      ),
      TweenSequenceItem(
        tween: Tween<double>(
          begin: 1.18,
          end: 1,
        ).chain(CurveTween(curve: Curves.easeInOutCubic)),
        weight: 54,
      ),
    ]).animate(_cartPulseController);
    _currentHeroMediaIndexNotifier = ValueNotifier<int>(
      _resolveInitialHeroMediaIndex(),
    );
    _currentHeroMediaIndexNotifier.addListener(_handleHeroMediaIndexChanged);
    _heroPageController = PageController(initialPage: _currentHeroMediaIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _precacheHeroImages();
        unawaited(_syncHeroTopLuminance());
      }
    });
  }

  Product get _product => _productNotifier.value;
  set _product(Product value) {
    _productNotifier.value = value;
  }

  String _normalizedCategoryKey(String value) {
    return value
        .trim()
        .toLowerCase()
        .replaceAll('&', ' and ')
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .trim();
  }

  List<String> _visibleCategoriesFor(Product product) {
    return product.categoryList.where((category) {
      final key = _normalizedCategoryKey(category);
      return key.isNotEmpty && !_nonCategoryKeys.contains(key);
    }).toList();
  }

  Future<void> _loadCategoryIcon() async {
    try {
      final storeTypes = await _storeTypeRepository.fetchStoreTypes();
      final realCategoryKeys = <String>{
        for (final storeType in storeTypes) ...[
          ...storeType.categories.map(_normalizedCategoryKey),
          ...storeType.categoryDetails.map(
            (detail) => _normalizedCategoryKey(detail.name),
          ),
        ],
      };
      final nonCategoryKeys = <String>{
        ..._kPlatformCategoryKeys,
        for (final storeType in storeTypes) ...[
          _normalizedCategoryKey(storeType.name),
          _normalizedCategoryKey(storeType.platformId),
        ],
      }..removeAll(realCategoryKeys);
      if (mounted) {
        setState(() => _nonCategoryKeys = nonCategoryKeys);
      }

      final categoryKeys = _visibleCategoriesFor(
        _product,
      ).map(_normalizedCategoryKey).toSet();
      if (categoryKeys.isEmpty) return;

      final platformId = widget.platformId.trim().toLowerCase();
      StoreTypeCategoryDetail? match;
      StoreTypeSummary? matchedStoreType;

      for (var pass = 0; pass < 2 && match == null; pass += 1) {
        for (final storeType in storeTypes) {
          final isPlatformMatch =
              platformId.isEmpty ||
              storeType.platformId.trim().toLowerCase() == platformId;
          if ((pass == 0 && !isPlatformMatch) ||
              (pass == 1 && isPlatformMatch)) {
            continue;
          }
          for (final detail in storeType.categoryDetails) {
            if (detail.status == 'inactive') continue;
            if (categoryKeys.contains(_normalizedCategoryKey(detail.name))) {
              match = detail;
              matchedStoreType = storeType;
              break;
            }
          }
          if (match != null) break;
        }
      }

      if (!mounted) return;
      final businessTypeIds = matchedStoreType == null
          ? const <String>[]
          : <String>[matchedStoreType.name];
      if (identical(match, _categoryIconDetail) &&
          listEquals(businessTypeIds, _voucherBusinessTypeIds)) {
        return;
      }
      setState(() {
        _categoryIconDetail = match;
        _voucherBusinessTypeIds = businessTypeIds;
      });
    } catch (_) {
      // Keep the category-name fallback icon when the catalog is unavailable.
    }
  }

  Future<List<Product>> get _relatedProductsFuture =>
      _relatedProductsFutureNotifier.value;
  set _relatedProductsFuture(Future<List<Product>> value) {
    _relatedProductsFutureNotifier.value = value;
  }

  int get _currentHeroMediaIndex => _currentHeroMediaIndexNotifier.value;
  set _currentHeroMediaIndex(int value) {
    if (_currentHeroMediaIndexNotifier.value != value) {
      _currentHeroMediaIndexNotifier.value = value;
    }
  }

  int get _bottomOverscrollSignal => _bottomOverscrollSignalNotifier.value;
  set _bottomOverscrollSignal(int value) {
    _bottomOverscrollSignalNotifier.value = value;
  }

  int get _visibleRelatedProductsCount =>
      _visibleRelatedProductsCountNotifier.value;
  set _visibleRelatedProductsCount(int value) {
    _visibleRelatedProductsCountNotifier.value = value;
  }

  bool get _showsScrollToTopButton => _showsScrollToTopButtonNotifier.value;
  set _showsScrollToTopButton(bool value) {
    _showsScrollToTopButtonNotifier.value = value;
  }

  @override
  void dispose() {
    AuthSession.accountRevision.removeListener(_handleAccountRevision);
    _showsScrollToTopButtonNotifier.dispose();
    _visibleRelatedProductsCountNotifier.dispose();
    _bottomOverscrollSignalNotifier.dispose();
    _currentHeroMediaIndexNotifier.removeListener(_handleHeroMediaIndexChanged);
    _currentHeroMediaIndexNotifier.dispose();
    _heroCommentDismissedNotifier.dispose();
    _heroTopLuminanceNotifier.dispose();
    _productNotifier.dispose();
    _relatedProductsFutureNotifier.dispose();
    _cartPulseController.dispose();
    _scrollController.dispose();
    _heroPageController.dispose();
    super.dispose();
  }

  void _handleCartOverlayTap() {
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    unawaited(openCartPage(context, platformId: _cartPlatformId));
  }

  void _syncDisplayProduct(
    Product nextProduct, {
    List<Product>? catalogProducts,
  }) {
    _product = nextProduct;
    unawaited(_loadCategoryIcon());
    _catalogProducts = catalogProducts ?? _catalogProducts;
    _heroImageUrls = _product.detailsDisplayImageUrls;
    _heroMediaItems = _buildHeroMediaItems();
    _currentHeroMediaIndex = _resolveInitialHeroMediaIndex();
    _precacheHeroImages();
    unawaited(_syncHeroTopLuminance());
    _visibleRelatedProductsCount = _relatedProductsBatchSize;
  }

  /// Measures the part of the current hero media under the transparent header
  /// so its icons can switch between light and dark.
  Future<void> _syncHeroTopLuminance() async {
    if (!mounted) {
      return;
    }
    final request = ++_heroToneRequest;
    final index = _currentHeroMediaIndex;
    final mediaItem = index >= 0 && index < _heroMediaItems.length
        ? _heroMediaItems[index]
        : null;
    final rawUrl = mediaItem == null
        ? ''
        : (mediaItem.isVideo ? mediaItem.thumbnailUrl : mediaItem.url).trim();
    if (rawUrl.isEmpty) {
      _heroTopLuminanceNotifier.value = null;
      return;
    }

    final media = MediaQuery.of(context);
    final topPadding = media.padding.top;
    final boxSize = Size(media.size.width, topPadding + _heroExpandedHeight);
    final region = Rect.fromLTWH(
      0,
      0,
      boxSize.width,
      topPadding + kToolbarHeight,
    );
    double? luminance;
    for (final url in {_preferUploadedWebpImageUrl(rawUrl), rawUrl}) {
      if (url.isEmpty) {
        continue;
      }
      luminance = await sampleCoverImageLuminance(
        provider: NetworkImage(url),
        cacheKey: url,
        boxSize: boxSize,
        region: region,
      );
      if (luminance != null) {
        break;
      }
    }
    if (!mounted || request != _heroToneRequest) {
      return;
    }
    _heroTopLuminanceNotifier.value = luminance;
  }

  void _handleHeroMediaIndexChanged() {
    unawaited(_syncHeroTopLuminance());
  }

  /// Tone under the header before the hero media has been measured: images
  /// load on a white box, and media-less products show the tinted fallback.
  double _heroFallbackLuminance(Color surfaceColor, Color primaryColor) {
    final index = _currentHeroMediaIndex;
    if (index < 0 || index >= _heroMediaItems.length) {
      return Color.alphaBlend(
        primaryColor.withOpacity(0.15),
        surfaceColor,
      ).computeLuminance();
    }
    final mediaItem = _heroMediaItems[index];
    return mediaItem.isVideo && mediaItem.thumbnailUrl.trim().isEmpty
        ? 0.0
        : 1.0;
  }

  void _precacheHeroImages() {
    if (!mounted) {
      return;
    }

    for (final mediaItem in _heroMediaItems) {
      if (!mediaItem.isImage) {
        continue;
      }

      final originalImageUrl = mediaItem.url.trim();
      if (originalImageUrl.isEmpty) {
        continue;
      }

      final preferredImageUrl = _preferUploadedWebpImageUrl(originalImageUrl);
      _precacheProductDetailsImage(preferredImageUrl);
      if (preferredImageUrl != originalImageUrl) {
        _precacheProductDetailsImage(originalImageUrl);
      }
    }
  }

  void _precacheProductDetailsImage(String imageUrl) {
    final normalizedImageUrl = imageUrl.trim();
    if (normalizedImageUrl.isEmpty ||
        SessionImageCache.wasLoaded(normalizedImageUrl)) {
      return;
    }

    SessionImageCache.precache(context, normalizedImageUrl);
  }

  Future<void> _refreshProductDetails() async {
    try {
      final products = await _productRepository.fetchProducts();
      if (!mounted) {
        return;
      }

      Product? refreshedProduct;
      for (final product in products) {
        if (product.id == _product.id) {
          refreshedProduct = product;
          break;
        }
      }

      _relatedProductsFuture = Future<List<Product>>.value(products);
      _syncDisplayProduct(
        refreshedProduct ?? _product,
        catalogProducts: products,
      );

      if (_heroPageController.hasClients) {
        _heroPageController.jumpToPage(_currentHeroMediaIndex);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      AppSnackBar.showError(
        context,
        message: 'Unable to refresh product details: $error',
      );
      rethrow;
    }
  }

  bool get _hasSalesPrice =>
      _salesPrice != null && _salesPrice! >= 0 && _salesPrice! < _originalPrice;

  double get _displayPrice => _hasSalesPrice ? _salesPrice! : _originalPrice;

  static final SellerProfileStatsService _sellerStatsService =
      createSellerProfileStatsService();
  String _sellerStatsAdminId = '';
  SellerProfileStats? _sellerStats;
  bool _sellerStatsLoading = false;

  String _sellerAdminIdFor(Product product) {
    final adminId = product.adminId.trim();
    return adminId.isNotEmpty ? adminId : product.companyName.trim();
  }

  List<String> _voucherBrandIdsFor(Product product) {
    return product.specifications
        .where(
          (specification) =>
              _normalizedCategoryKey(specification.label) == 'brand',
        )
        .map((specification) => specification.value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList(growable: false);
  }

  SellerProfileStats? _sellerStatsFor(Product product) {
    final adminId = _sellerAdminIdFor(product);
    if (adminId != _sellerStatsAdminId) {
      _sellerStatsAdminId = adminId;
      _sellerStats = null;
      _sellerStatsLoading = true;
      unawaited(_loadSellerStats(adminId));
    }
    return _sellerStats;
  }

  Future<void> _loadSellerStats(String adminId) async {
    SellerProfileStats? stats;
    try {
      stats = await _sellerStatsService.fetchStats(adminId);
    } catch (_) {
      stats = null;
    }
    if (!mounted || adminId != _sellerStatsAdminId) return;
    setState(() {
      _sellerStats = stats;
      _sellerStatsLoading = false;
    });
  }

  void _openSellerPage(Product product) {
    final adminId = _sellerAdminIdFor(product);
    if (adminId.isEmpty) return;
    Navigator.of(context).pushNamed(
      '/seller',
      arguments: {
        'adminId': adminId,
        'initialName': product.companyName.trim(),
      },
    );
  }

  BuyerFlashDeal? _liveFlashDeal;

  /// Campaign deal per variant id ('' when the listing has no variants); the
  /// backend prices each variant separately.
  Map<String, BuyerFlashDeal?> _variantFlashDeals = const {};
  Future<void>? _variantFlashDealsLoad;
  bool _contentReady = false;

  void _revealContentWhenResolved(Future<void> load) {
    unawaited(
      Future.wait<void>([
        Future.any<void>([
          load.catchError((Object _) {}),
          Future<void>.delayed(const Duration(milliseconds: 2500)),
        ]),
        Future<void>.delayed(kContentSwitchSkeletonMinDuration),
      ]).then((_) {
        if (mounted && !_contentReady) setState(() => _contentReady = true);
      }),
    );
  }

  void _handleFlashDealChanged(BuyerFlashDeal? deal) {
    if (!mounted || identical(deal, _liveFlashDeal)) return;
    setState(() => _liveFlashDeal = deal);
    if (deal == null) {
      setState(() => _variantFlashDeals = const {});
    } else {
      unawaited(_loadVariantFlashDeals());
    }
  }

  Future<void> _loadVariantFlashDeals() {
    final productId = _product.id;
    final variantKeys = _product.variants.isEmpty
        ? const <String>['']
        : _product.variants.map((variant) => variant.id).toList();
    final load = () async {
      final deals = await Future.wait(
        variantKeys.map(
          (variantKey) => productLiveFlashDeal(
            productId: productId,
            platformId: _cartPlatformId,
            variantId: variantKey.isEmpty ? null : variantKey,
          ).then<BuyerFlashDeal?>((deal) => deal, onError: (Object _) => null),
        ),
      );
      if (!mounted || productId != _product.id) return;
      setState(() {
        _variantFlashDeals = {
          for (var index = 0; index < variantKeys.length; index++)
            variantKeys[index]: deals[index],
        };
      });
    }();
    _variantFlashDealsLoad = load;
    return load;
  }

  double? _flashPriceFor(ProductVariant? variant) {
    final deal = _variantFlashDeals[variant?.id ?? ''];
    final originalPrice = variant?.originalPrice ?? _product.originalPrice;
    if (deal == null ||
        !deal.isLive ||
        !deal.endsAt.isAfter(DateTime.now()) ||
        !(deal.flashPrice >= 0) ||
        !(deal.flashPrice < originalPrice)) {
      return null;
    }
    return deal.flashPrice;
  }

  Map<String, double> get _flashPricesByVariantId => {
    for (final variantKey in _variantFlashDeals.keys)
      if (_flashPriceFor(
            _product.variants
                .where((variant) => variant.id == variantKey)
                .firstOrNull,
          )
          case final price?)
        variantKey: price,
  };

  BuyerFlashDeal? get _activeFlashDealPrice {
    if (_flashPriceFor(_selectedVariant) == null) return null;
    return _variantFlashDeals[_selectedVariant?.id ?? ''];
  }

  double get _shownPrice => _activeFlashDealPrice?.flashPrice ?? _displayPrice;

  bool get _showsStruckOriginalPrice =>
      _activeFlashDealPrice != null || _hasSalesPrice;

  int? get _shownDiscountPercent {
    final flashPrice = _activeFlashDealPrice?.flashPrice;
    if (flashPrice == null || _originalPrice <= 0) {
      return _discountPercent;
    }
    final percent = (((_originalPrice - flashPrice) / _originalPrice) * 100)
        .round();
    return percent > 0 ? percent : _discountPercent;
  }

  bool get _showsFreeShippingBadge =>
      _product.freeDelivery || (_activeFlashDealPrice?.freeShipping ?? false);

  ProductVariant? get _selectedVariant {
    final variants = _product.variants;
    if (variants.isEmpty) {
      return null;
    }
    for (final variant in variants) {
      if (variant.id == _selectedVariantId) {
        return variant;
      }
    }
    return variants.first;
  }

  void _handleVariantSelected(ProductVariant variant) {
    if (_selectedVariant?.id == variant.id) {
      return;
    }
    HapticFeedback.lightImpact();
    setState(() {
      _selectedVariantId = variant.id;
    });
    _showVariantInHero(variant);
  }

  void _selectVariantById(String variantId) {
    if (variantId == _selectedVariantId) {
      return;
    }
    setState(() => _selectedVariantId = variantId);
    final variant = _selectedVariant;
    if (variant != null) {
      _showVariantInHero(variant);
    }
  }

  /// Moves the hero album to the variant's photo, or back to the product's
  /// main photo when the variant has none.
  void _showVariantInHero(ProductVariant variant) {
    final variantImageUrl = variant.imageUrl.trim();
    final variantMediaIndex = variantImageUrl.isEmpty
        ? -1
        : _heroMediaItems.indexWhere(
            (mediaItem) =>
                mediaItem.isImage && mediaItem.url == variantImageUrl,
          );
    final targetIndex = variantMediaIndex >= 0
        ? variantMediaIndex
        : _mainImageMediaIndex();
    if (targetIndex < 0 || targetIndex == _currentHeroMediaIndex) {
      return;
    }

    _currentHeroMediaIndex = targetIndex;
    if (_heroPageController.hasClients) {
      _heroPageController.animateToPage(
        targetIndex,
        duration: appMotionFrames(13),
        curve: Curves.easeOutCubic,
      );
    }
  }

  int _mainImageMediaIndex() {
    if (_heroImageUrls.isEmpty) {
      return -1;
    }
    final resolvedImageIndex = _product.resolvedMainImageIndex
        .clamp(0, _heroImageUrls.length - 1)
        .toInt();
    final targetImageUrl = _heroImageUrls[resolvedImageIndex];
    return _heroMediaItems.indexWhere(
      (mediaItem) => mediaItem.isImage && mediaItem.url == targetImageUrl,
    );
  }

  bool _isDetailsVariantSoldOut(Product product, ProductVariant variant) {
    final catalogProducts = _catalogProducts ?? const <Product>[];
    if (variant.addOns.isNotEmpty && catalogProducts.isEmpty) {
      return false;
    }
    return resolveProductAvailableStock(
          product,
          variant: variant,
          catalogProducts: catalogProducts,
        ) <=
        0;
  }

  Widget _buildDetailsVariantSelector(
    ThemeData theme,
    Product product,
    Color primaryColor,
  ) {
    final selectedVariant = _selectedVariant;
    final inkColor = theme.brightness == Brightness.dark
        ? Colors.white
        : const Color(0xFF111827);

    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                'Variants',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: inkColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${product.variants.length}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: inkColor.withOpacity(0.6),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            child: Row(
              children: [
                for (final (index, variant) in product.variants.indexed) ...[
                  if (index > 0) const SizedBox(width: 8),
                  _ProductDetailsVariantChip(
                    label: variant.name.trim().isEmpty
                        ? 'Variant'
                        : variant.name.trim(),
                    isSelected: selectedVariant?.id == variant.id,
                    isSoldOut: _isDetailsVariantSoldOut(product, variant),
                    accentColor: primaryColor,
                    onTap: () => _handleVariantSelected(variant),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  double get _originalPrice =>
      _selectedVariant?.originalPrice ?? _product.originalPrice;

  double? get _salesPrice =>
      _selectedVariant?.salesPrice ?? _product.salesPrice;

  int get _availableStock => _product.stock;

  int? get _discountPercent {
    final salesPrice = _salesPrice;
    if (salesPrice == null || _originalPrice <= 0) {
      return null;
    }

    final discountAmount = _originalPrice - salesPrice;
    if (discountAmount <= 0) {
      return null;
    }

    final percent = ((discountAmount / _originalPrice) * 100).round();
    return percent > 0 ? percent : null;
  }

  bool get _showsTopReviewsChip =>
      _product.rating >= 4.5 && _product.rating <= 5;

  String get _currentHeroImageUrl {
    if (_heroMediaItems.isNotEmpty) {
      final normalizedMediaIndex = _currentHeroMediaIndex
          .clamp(0, _heroMediaItems.length - 1)
          .toInt();
      final currentMedia = _heroMediaItems[normalizedMediaIndex];
      if (currentMedia.isImage) {
        return currentMedia.url;
      }
    }

    if (_heroImageUrls.isEmpty) {
      return _product.imageUrl;
    }

    final normalizedIndex = _product.resolvedMainImageIndex
        .clamp(0, _heroImageUrls.length - 1)
        .toInt();
    return _heroImageUrls[normalizedIndex];
  }

  String get _productInitial {
    final trimmedName = _product.name.trim();
    if (trimmedName.isEmpty) {
      return '?';
    }

    return trimmedName[0].toUpperCase();
  }

  String get _formattedDate {
    final monthNames = const [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return '${monthNames[_product.createdAt.month - 1]} '
        '${_product.createdAt.day}, ${_product.createdAt.year}';
  }

  List<_ProductCustomerReview> get _customerReviews {
    final reviews = <_ProductCustomerReview>[];
    final seenKeys = <String>{};

    for (final comment in _product.reviewComments) {
      final message = comment.message.trim();
      if (message.isEmpty && comment.media.isEmpty) {
        continue;
      }

      final mediaKey = comment.media.map((media) => media.url).join('|');
      final key = '${comment.id}|$message|$mediaKey'.toLowerCase();
      if (seenKeys.contains(key)) {
        continue;
      }

      seenKeys.add(key);
      final reviewer = comment.reviewer.trim().isEmpty
          ? 'Verified Buyer'
          : comment.reviewer.trim();
      reviews.add(
        _ProductCustomerReview(
          id: comment.id,
          reviewer: reviewer,
          title: comment.title.trim().isEmpty
              ? 'Customer product review'
              : comment.title.trim(),
          message: message,
          rating: comment.rating > 0
              ? comment.rating
              : (_product.rating > 0 ? _product.rating : 5),
          media: comment.media,
          sellerReply: comment.sellerReply,
          createdAt: comment.createdAt,
        ),
      );
    }

    final originalOrder = {
      for (var index = 0; index < reviews.length; index += 1)
        reviews[index]: index,
    };
    reviews.sort((first, second) {
      final firstDate = first.createdAt;
      final secondDate = second.createdAt;
      if (firstDate != null && secondDate != null) {
        final byDate = secondDate.compareTo(firstDate);
        if (byDate != 0) {
          return byDate;
        }
      } else if (firstDate != null || secondDate != null) {
        return firstDate != null ? -1 : 1;
      }
      return originalOrder[first]!.compareTo(originalOrder[second]!);
    });

    return reviews;
  }

  List<Product> _buildRelatedProducts(List<Product> products) {
    final normalizedCategories = _product.categoryList
        .map((category) => category.trim().toLowerCase())
        .where((category) => category.isNotEmpty)
        .toSet();

    final relatedProducts =
        products
            .where((product) => product.id != _product.id)
            .where(isProductVisibleToUsers)
            .where((product) {
              if (normalizedCategories.isEmpty) {
                return false;
              }

              return product.categoryList.any(
                (category) => normalizedCategories.contains(
                  category.trim().toLowerCase(),
                ),
              );
            })
            .toList()
          ..sort(
            (first, second) => second.createdAt.compareTo(first.createdAt),
          );

    return relatedProducts;
  }

  List<_ProductDetailsMediaItem> _buildHeroMediaItems() {
    final mediaItems = <_ProductDetailsMediaItem>[];
    final videoUrls = _product.galleryVideoUrls;
    final videoThumbnailUrls = _product.galleryVideoThumbnailUrls;
    for (var index = 0; index < videoUrls.length; index += 1) {
      final videoUrl = videoUrls[index];
      final trimmedVideoUrl = videoUrl.trim();
      if (trimmedVideoUrl.isEmpty) {
        continue;
      }

      mediaItems.add(
        _ProductDetailsMediaItem(
          type: _ProductDetailsMediaType.video,
          url: trimmedVideoUrl,
          thumbnailUrl: index < videoThumbnailUrls.length
              ? videoThumbnailUrls[index]
              : '',
        ),
      );
    }

    final imageUrls = <String>{};
    for (final imageUrl in _heroImageUrls) {
      final trimmedImageUrl = imageUrl.trim();
      if (trimmedImageUrl.isEmpty) {
        continue;
      }

      imageUrls.add(trimmedImageUrl);
      mediaItems.add(
        _ProductDetailsMediaItem(
          type: _ProductDetailsMediaType.image,
          url: trimmedImageUrl,
        ),
      );
    }

    // Variant photos join the album after the product photos, once each.
    for (final variant in _product.variants) {
      final variantImageUrl = variant.imageUrl.trim();
      if (variantImageUrl.isEmpty || !imageUrls.add(variantImageUrl)) {
        continue;
      }

      mediaItems.add(
        _ProductDetailsMediaItem(
          type: _ProductDetailsMediaType.image,
          url: variantImageUrl,
        ),
      );
    }

    return mediaItems;
  }

  int _resolveInitialHeroMediaIndex() {
    if (_heroMediaItems.isEmpty) {
      return 0;
    }

    if (_product.hasVideo) {
      return 0;
    }

    if (_heroImageUrls.isEmpty) {
      return 0;
    }

    final resolvedImageIndex = _product.resolvedMainImageIndex
        .clamp(0, _heroImageUrls.length - 1)
        .toInt();
    final targetImageUrl = _heroImageUrls[resolvedImageIndex];
    final mediaIndex = _heroMediaItems.indexWhere(
      (mediaItem) => mediaItem.isImage && mediaItem.url == targetImageUrl,
    );

    return mediaIndex >= 0 ? mediaIndex : 0;
  }

  Future<void> _openHeroImagePreview() async {
    if (_heroMediaItems.isEmpty) {
      return;
    }

    final selectedImageIndex = await Navigator.of(context).push<int>(
      PageRouteBuilder<int>(
        transitionDuration: appMotionFrames(19),
        reverseTransitionDuration: appMotionFrames(19),
        pageBuilder: (context, animation, secondaryAnimation) =>
            _ProductMediaPreviewPage(
              mediaItems: _heroMediaItems,
              initialIndex: _currentHeroMediaIndex,
              productName: _product.name,
              model3dUrl: _product.model3dUrl,
              primaryColor: Theme.of(context).colorScheme.primary,
            ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
            ),
            child: child,
          );
        },
      ),
    );

    if (!mounted ||
        selectedImageIndex == null ||
        selectedImageIndex == _currentHeroMediaIndex) {
      return;
    }

    _currentHeroMediaIndex = selectedImageIndex;

    if (_heroPageController.hasClients) {
      _heroPageController.animateToPage(
        selectedImageIndex,
        duration: appMotionFrames(13),
        curve: Curves.easeOutCubic,
      );
    }
  }

  Future<void> _handleFavoriteToggle() async {
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    final isNowFavorite = await FavoriteProductsStore.instance.toggleFavorite(
      _product.id,
    );

    if (!mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message: isNowFavorite
          ? 'Product added to favorites.'
          : 'Product removed from favorites.',
      icon: isNowFavorite
          ? Icons.favorite_rounded
          : Icons.favorite_border_rounded,
      iconColor: const Color(0xFFD32F2F),
    );
  }

  void _showTopActionMessage(String message) {
    AppSnackBar.showSuccess(context, message: message);
  }

  void _redirectGuestToLogin() {
    unawaited(redirectGuestToLogin(context));
  }

  Rect? _resolveRectFromKey(GlobalKey key, RenderBox overlayBox) {
    final targetContext = key.currentContext;
    if (targetContext == null) {
      return null;
    }

    final renderObject = targetContext.findRenderObject();
    if (renderObject is! RenderBox || !renderObject.hasSize) {
      return null;
    }

    final topLeft = renderObject.localToGlobal(
      Offset.zero,
      ancestor: overlayBox,
    );

    return topLeft & renderObject.size;
  }

  Widget _buildCartFlightPreview({
    required String imageUrl,
    required Color primaryColor,
  }) {
    final theme = Theme.of(context);
    final trimmedImageUrl = imageUrl.trim();

    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: const BorderRadius.all(Radius.circular(18)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.16),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.all(Radius.circular(18)),
        child: trimmedImageUrl.isNotEmpty
            ? _ProductDetailsNetworkImage(
                imageUrl: trimmedImageUrl,
                fit: BoxFit.cover,
                errorFallback: _ProductDetailsHeroFallback(
                  primaryColor: primaryColor,
                  initial: _productInitial,
                ),
              )
            : _ProductDetailsHeroFallback(
                primaryColor: primaryColor,
                initial: _productInitial,
              ),
      ),
    );
  }

  Future<void> _playAddToCartAnimation() async {
    if (_isCartFlightAnimating || !mounted) {
      return;
    }

    final overlayState = Overlay.maybeOf(context);
    final overlayBox = overlayState?.context.findRenderObject();
    if (overlayState == null || overlayBox is! RenderBox) {
      return;
    }

    final heroRect = _resolveRectFromKey(_heroImageKey, overlayBox);
    final cartRect = _resolveRectFromKey(_cartIconKey, overlayBox);
    if (heroRect == null || cartRect == null) {
      return;
    }

    final primaryColor = Theme.of(context).colorScheme.primary;
    final startSide = (heroRect.width * 0.28).clamp(84.0, 118.0).toDouble();
    const endSide = 30.0;
    final startCenter = Offset(
      heroRect.center.dx,
      heroRect.center.dy + (heroRect.height * 0.08),
    );
    final endCenter = Offset(cartRect.center.dx, cartRect.center.dy + 2);
    final controller = AnimationController(
      vsync: this,
      duration: appMotionFrames(46),
    );
    final curvedAnimation = CurvedAnimation(
      parent: controller,
      curve: Curves.easeInOutCubicEmphasized,
    );
    late final OverlayEntry overlayEntry;
    _isCartFlightAnimating = true;

    overlayEntry = OverlayEntry(
      builder: (context) {
        return IgnorePointer(
          child: AnimatedBuilder(
            animation: controller,
            builder: (context, child) {
              final progress = curvedAnimation.value;
              final arcLift = (1 - ((progress * 2) - 1).abs()) * 76;
              final currentCenter = Offset(
                startCenter.dx + ((endCenter.dx - startCenter.dx) * progress),
                startCenter.dy +
                    ((endCenter.dy - startCenter.dy) * progress) -
                    arcLift,
              );
              final currentSide =
                  startSide + ((endSide - startSide) * progress);
              final currentOpacity = (1 - (progress * 0.14))
                  .clamp(0.0, 1.0)
                  .toDouble();

              return Stack(
                children: [
                  Positioned(
                    left: currentCenter.dx - (currentSide / 2),
                    top: currentCenter.dy - (currentSide / 2),
                    width: currentSide,
                    height: currentSide,
                    child: RepaintBoundary(
                      child: Opacity(
                        opacity: currentOpacity,
                        child: Transform.rotate(
                          angle: (1 - progress) * 0.08,
                          child: child,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
            child: _buildCartFlightPreview(
              imageUrl: _currentHeroImageUrl,
              primaryColor: primaryColor,
            ),
          ),
        );
      },
    );

    overlayState.insert(overlayEntry);

    try {
      await controller.forward();
      if (mounted) {
        unawaited(_cartPulseController.forward(from: 0));
      }
    } finally {
      overlayEntry.remove();
      controller.dispose();
      _isCartFlightAnimating = false;
    }
  }

  Widget _buildCartOverlayButton(Color headerIconColor) {
    return ScaleTransition(
      scale: _cartPulseScale,
      child: RepaintBoundary(
        child: ValueListenableBuilder<List<CartItemData>>(
          valueListenable: CartStore.instance.cartItemsNotifier,
          builder: (context, items, child) {
            final badgeCount = _isGuestMode ? 0 : cartEntryCount(items);
            final badgeLabel = badgeCount > 99 ? '99+' : '$badgeCount';
            final iconColor = _isGuestMode
                ? headerIconColor.withOpacity(0.46)
                : headerIconColor;

            return SizedBox(
              key: _cartIconKey,
              width: 40,
              height: 40,
              child: IconButton(
                onPressed: _handleCartOverlayTap,
                tooltip: 'Cart',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints.tightFor(
                  width: 40,
                  height: 40,
                ),
                splashRadius: 20,
                icon: SizedBox(
                  width: 24,
                  height: 24,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Align(
                        alignment: Alignment.center,
                        child: _ProductDetailsLucideIcon(
                          svg: _kProductDetailsCartSvg,
                          color: iconColor,
                        ),
                      ),
                      if (badgeCount > 0)
                        Positioned(
                          top: -6,
                          right: -8,
                          child: Container(
                            constraints: const BoxConstraints(
                              minWidth: 17,
                              minHeight: 17,
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 4,
                              vertical: 1,
                            ),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE53935),
                              borderRadius: const BorderRadius.all(
                                Radius.circular(8),
                              ),
                            ),
                            child: Center(
                              child: Text(
                                badgeLabel,
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      height: 1,
                                      fontSize: 9.5,
                                    ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _handleAccountRevision() {
    clearOwnListingScopeCache();
    if (!mounted) {
      return;
    }
    if (_isGuestMode) {
      setState(() {
        _isOwnListing = false;
        _ownListingResolved = true;
        _reportEligible = false;
      });
      return;
    }
    setState(() {
      _isOwnListing = false;
      _ownListingResolved = false;
      _reportEligible = false;
    });
    unawaited(_resolveOwnListing());
  }

  Future<void> _resolveOwnListing() async {
    final isOwnListing = await isOwnCompanyListing(_product);
    if (!mounted) {
      return;
    }

    setState(() {
      _isOwnListing = isOwnListing;
      _ownListingResolved = true;
    });
    if (!isOwnListing) {
      unawaited(_refreshReportEligibility());
    }
  }

  Future<void> _refreshReportEligibility() async {
    if (_isGuestMode) {
      setState(() {
        _reportEligible = false;
      });
      return;
    }
    final product = _product;
    final result = await createListingReportService()
        .checkListingReportEligibility(
          productId: product.id,
          adminId: product.adminId,
          companyId: product.companyId,
        );
    if (!mounted || _product.id != product.id) {
      return;
    }
    setState(() {
      _reportEligible = result.eligible;
    });
  }

  void _handleChatTap() {
    if (_isOwnListing) {
      return;
    }

    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    final catalogProducts = _catalogProducts ?? const <Product>[];
    final showsTopBrand =
        catalogProducts.isNotEmpty &&
        _isProductInTopSelling(_product, catalogProducts);
    unawaited(
      openChatSupportPage(
        context,
        product: _product,
        showsTopBrand: showsTopBrand,
      ),
    );
  }

  void _handleAddToCartTap() {
    if (_isOwnListing) {
      return;
    }

    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    unawaited(_openAddToCartModal());
  }

  Future<void> _openSearchPage() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) {
          final theme = Theme.of(context);

          return app_search.ProductSearchPage(
            productsFuture: _relatedProductsFuture,
            productRepository: _productRepository,
            primaryColor: theme.colorScheme.primary,
            surfaceColor: theme.cardColor,
            productCardSurfaceColor:
                theme.inputDecorationTheme.fillColor ??
                theme.colorScheme.surface,
            titleColor: theme.colorScheme.onSurface,
            secondaryColor:
                theme.textTheme.bodyMedium?.color ??
                theme.colorScheme.onSurface.withOpacity(0.7),
          );
        },
      ),
    );
  }

  /// Add-on variant stock is derived from the catalog, so only those products
  /// need to wait for it before opening a purchase modal.
  Future<List<Product>> _catalogForPurchaseModal() async {
    final cached = _catalogProducts ?? const <Product>[];
    if (cached.isNotEmpty) {
      return cached;
    }
    final needsCatalog = _product.variants.any(
      (variant) => variant.addOns.isNotEmpty,
    );
    if (!needsCatalog) {
      unawaited(
        _relatedProductsFuture.then<void>(
          (products) => _catalogProducts ??= products,
          onError: (Object _) {},
        ),
      );
      return cached;
    }
    try {
      final products = await _relatedProductsFuture;
      _catalogProducts = products;
      return products;
    } catch (_) {
      return const <Product>[];
    }
  }

  Future<void> _awaitVariantFlashDeals() async {
    try {
      await _variantFlashDealsLoad?.timeout(const Duration(seconds: 6));
    } catch (_) {}
  }

  Future<void> _openAddToCartModal() async {
    final catalogProducts = await _catalogForPurchaseModal();
    await _awaitVariantFlashDeals();
    if (!mounted) {
      return;
    }

    final addToCartSelection = await showAddToCartModal(
      context,
      product: _product,
      catalogProducts: catalogProducts,
      selectedVariant: _selectedVariant,
      discountPercent: _shownDiscountPercent,
      flashPricesByVariantId: _flashPricesByVariantId,
      showsTopBrand:
          catalogProducts.isNotEmpty &&
          _isProductInTopSelling(_product, catalogProducts),
    );

    if (!mounted || addToCartSelection == null) {
      return;
    }

    final addedVariantId = addToCartSelection.selectedVariant?.id;
    if (addedVariantId != null) {
      _selectVariantById(addedVariantId);
    }

    final flightAnimation = _playAddToCartAnimation();
    try {
      await CartStore.instance.addItem(
        _product,
        quantity: addToCartSelection.quantity,
        selectedVariant: addToCartSelection.selectedVariant,
        catalogProducts: catalogProducts,
        showsTopBrand:
            catalogProducts.isNotEmpty &&
            _isProductInTopSelling(_product, catalogProducts),
        platformId: _cartPlatformId,
      );
    } on FlashDealReserveException catch (error) {
      if (mounted) {
        AppSnackBar.showError(context, message: error.message);
      }
      return;
    }

    await flightAnimation;
    if (!mounted) {
      return;
    }

    _showTopActionMessage(
      'Added ${addToCartSelection.quantity} item${addToCartSelection.quantity > 1 ? 's' : ''} to cart.',
    );
  }

  void _handleBuyNowTap() {
    if (_isOwnListing) {
      unawaited(_handleListingInsightTap());
      return;
    }

    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    unawaited(_openBuyModal());
  }

  Future<void> _openBuyModal() async {
    final catalogProducts = await _catalogForPurchaseModal();
    await _awaitVariantFlashDeals();
    if (!mounted) {
      return;
    }

    final buySelection = await showBuyModal(
      context,
      product: _product,
      catalogProducts: catalogProducts,
      selectedVariant: _selectedVariant,
      discountPercent: _shownDiscountPercent,
      flashPricesByVariantId: _flashPricesByVariantId,
      showsTopBrand:
          catalogProducts.isNotEmpty &&
          _isProductInTopSelling(_product, catalogProducts),
    );

    if (!mounted || buySelection == null) {
      return;
    }

    final boughtVariantId = buySelection.selectedVariant?.id;
    if (boughtVariantId != null) {
      _selectVariantById(boughtVariantId);
    }

    var lineItem = BookingLineItem.fromProduct(
      product: _product,
      quantity: buySelection.quantity,
      selectedVariant: buySelection.selectedVariant,
      availableStock: resolveProductAvailableStock(
        _product,
        variant: buySelection.selectedVariant,
        catalogProducts: catalogProducts,
      ),
      showsTopBrand:
          catalogProducts.isNotEmpty &&
          _isProductInTopSelling(_product, catalogProducts),
    );
    try {
      lineItem = await _lockFlashDealForBuy(
        lineItem,
        variant: buySelection.selectedVariant,
      );
    } on FlashDealReserveException catch (error) {
      if (mounted) {
        AppSnackBar.showError(context, message: error.message);
      }
      return;
    }
    if (!mounted) {
      if (lineItem.flashReservationId.isNotEmpty) {
        unawaited(releaseFlashDealReservation(lineItem.flashReservationId));
      }
      return;
    }

    final bookingAction = await openBookingPage(
      context,
      items: [lineItem],
      source: BookingFlowSource.directBuy,
      platformId: _cartPlatformId,
    );

    if (bookingAction != BookingPageAction.orderPlaced) {
      if (lineItem.flashReservationId.isNotEmpty) {
        unawaited(releaseFlashDealReservation(lineItem.flashReservationId));
      }
      return;
    }
    if (!mounted) {
      return;
    }

    _showTopActionMessage(
      'Direct order placed for ${lineItem.quantity} item${lineItem.quantity == 1 ? '' : 's'}.',
    );
  }

  /// Reserves campaign stock so the order is charged the flash price, the same
  /// way the cart does when a live deal covers the chosen variant.
  Future<BookingLineItem> _lockFlashDealForBuy(
    BookingLineItem lineItem, {
    required ProductVariant? variant,
  }) async {
    final deal = await productLiveFlashDeal(
      productId: _product.id,
      platformId: _cartPlatformId,
      variantId: variant?.id,
    );
    final originalPrice = variant?.originalPrice ?? _product.originalPrice;
    if (deal == null ||
        !deal.isLive ||
        !(deal.flashPrice >= 0) ||
        !(deal.flashPrice < originalPrice)) {
      return lineItem;
    }

    var quantity = lineItem.quantity;
    if (deal.dealStockRemaining > 0) {
      quantity = math.min(quantity, deal.dealStockRemaining);
    }
    if (deal.perBuyerLimit > 0) {
      quantity = math.min(quantity, deal.perBuyerLimit);
    }
    if (quantity < 1) quantity = 1;

    try {
      final reservation = await reserveFlashDealStock(
        dealId: deal.id,
        quantity: quantity,
        variantId: variant?.id ?? '',
      );
      return lineItem.copyWith(
        quantity: quantity,
        unitPrice: reservation.lockedUnitPrice > 0
            ? reservation.lockedUnitPrice
            : deal.flashPrice,
        flashDealId: reservation.dealId,
        flashReservationId: reservation.id,
        reservationExpiresAt: reservation.expiresAt.toUtc().toIso8601String(),
      );
    } on FlashDealReserveException {
      rethrow;
    } catch (_) {
      throw FlashDealReserveException(
        'Unable to lock Flash Deal price right now.',
      );
    }
  }

  Future<void> _handleListingInsightTap() async {
    if (_listingInsightBusy) {
      return;
    }

    setState(() => _listingInsightBusy = true);
    try {
      await openOwnListingInsight(context, product: _product);
    } finally {
      if (mounted) {
        setState(() => _listingInsightBusy = false);
      }
    }
  }

  Future<void> _openReviewMediaViewer(
    _ProductCustomerReview review,
    int mediaIndex,
  ) {
    final feed = buildReviewMediaFeed(
      _customerReviews.map(
        (item) => (
          id: item.id,
          reviewer: item.reviewer,
          rating: item.rating,
          message: item.message,
          media: item.media,
        ),
      ),
    );
    final tappedUrl = mediaIndex >= 0 && mediaIndex < review.media.length
        ? review.media[mediaIndex].url
        : '';
    final initialIndex = feed.indexWhere(
      (entry) => entry.reviewId == review.id && entry.media.url == tappedUrl,
    );
    return openReviewMediaViewer(
      context,
      productId: _product.id,
      entries: feed,
      initialIndex: initialIndex < 0 ? 0 : initialIndex,
    );
  }

  Future<void> _openCustomerReviewsPage() {
    final reviewItems = [
      for (final review in _customerReviews)
        CustomerReviewItem(
          id: review.id,
          reviewer: review.reviewer,
          title: review.title,
          message: review.message,
          rating: review.rating,
          media: review.media,
          sellerReply: review.sellerReply,
        ),
    ];

    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CustomerReviewPage(
          productName: _product.name,
          productId: _product.id,
          reviews: reviewItems,
          productCompanyName: _product.companyName,
        ),
      ),
    );
  }

  bool _hasSectionReachedHeader(
    GlobalKey sectionKey, {
    required double headerBottom,
  }) {
    final sectionContext = sectionKey.currentContext;
    if (sectionContext == null) {
      return false;
    }

    final renderObject = sectionContext.findRenderObject();
    if (renderObject is! RenderBox || !renderObject.hasSize) {
      return false;
    }

    final sectionTop = renderObject.localToGlobal(Offset.zero).dy;
    return sectionTop <= headerBottom + 8;
  }

  String _resolveHeaderTitle({
    required double scrollOffset,
    required double headerBottom,
    required double revealProgress,
  }) {
    if (scrollOffset <= 0 || revealProgress <= 0.02) {
      return '';
    }

    if (_hasSectionReachedHeader(
      _relatedProductsSectionKey,
      headerBottom: headerBottom,
    )) {
      return 'Related Products';
    }

    if (_hasSectionReachedHeader(
      _customerReviewsSectionKey,
      headerBottom: headerBottom,
    )) {
      return 'Customer Reviews';
    }

    if (_hasSectionReachedHeader(
      _aboutSectionKey,
      headerBottom: headerBottom,
    )) {
      return 'About this product';
    }

    return _defaultHeaderTitle;
  }

  void _updateScrollToTopButtonVisibility(double offset) {
    final shouldShowScrollToTopButton = offset > 180;
    if (_showsScrollToTopButton == shouldShowScrollToTopButton || !mounted) {
      return;
    }

    _showsScrollToTopButton = shouldShowScrollToTopButton;
  }

  Future<void> _scrollToTop() async {
    if (!_scrollController.hasClients) {
      return;
    }

    await _scrollController.animateTo(
      0,
      duration: appMotionFrames(19),
      curve: Curves.easeOutCubic,
    );
  }

  bool _tryLoadMoreRelatedProducts(ScrollMetrics metrics) {
    final catalogProducts = _catalogProducts;
    if (catalogProducts == null ||
        catalogProducts.isEmpty ||
        metrics.axis != Axis.vertical) {
      return false;
    }

    final relatedProducts = _buildRelatedProducts(catalogProducts);
    if (relatedProducts.isEmpty ||
        _visibleRelatedProductsCount >= relatedProducts.length ||
        metrics.extentAfter > 180) {
      return false;
    }

    final nextVisibleCount =
        _visibleRelatedProductsCount + _relatedProductsBatchSize >
            relatedProducts.length
        ? relatedProducts.length
        : _visibleRelatedProductsCount + _relatedProductsBatchSize;
    if (nextVisibleCount == _visibleRelatedProductsCount) {
      return false;
    }

    _visibleRelatedProductsCount = nextVisibleCount;
    return true;
  }

  bool _handleScrollNotification(ScrollNotification notification) {
    if (notification.depth != 0 || notification.metrics.axis != Axis.vertical) {
      return false;
    }

    final offset = notification.metrics.pixels <= 0
        ? 0.0
        : notification.metrics.pixels;
    _updateScrollToTopButtonVisibility(offset);

    final loadedMoreRelatedProducts = _tryLoadMoreRelatedProducts(
      notification.metrics,
    );
    if (loadedMoreRelatedProducts) {
      return false;
    }

    if (notification is OverscrollNotification &&
        notification.overscroll > 0 &&
        notification.metrics.pixels >= notification.metrics.maxScrollExtent) {
      _bottomOverscrollSignal += 1;
    }

    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final homeHeaderColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    final uniformChipPadding = const EdgeInsets.symmetric(
      horizontal: 14,
      vertical: 8,
    );
    final uniformChipLabelStyle = theme.textTheme.labelLarge?.copyWith(
      fontWeight: FontWeight.w600,
    );
    final topPadding = MediaQuery.paddingOf(context).top;
    final collapsedHeaderHeight = topPadding + kToolbarHeight;
    final detailsSurfaceColor = _productDetailsSurfaceColor(context);
    final isDarkDetails = theme.brightness == Brightness.dark;
    final detailsHeaderColor = isDarkDetails
        ? kSwitchDarkSurfaceDark
        : Colors.white;
    final detailsInkColor = isDarkDetails
        ? Colors.white
        : const Color(0xFF111827);

    return Scaffold(
      backgroundColor: detailsSurfaceColor,
      bottomNavigationBar: IgnorePointer(
        ignoring: !_contentReady,
        child: ValueListenableBuilder<Product>(
          valueListenable: _productNotifier,
          builder: (context, product, child) => _ProductDetailsFooterBar(
            productId: product.id,
            platformId: _cartPlatformId,
            variantId: _selectedVariant?.id ?? '',
            primaryColor: primaryColor,
            secondaryColor: secondaryColor,
            isGuestMode: _isGuestMode,
            isOwnListing: _isOwnListing,
            purchaseActionsEnabled: _isGuestMode || _ownListingResolved,
            listingInsightBusy: _listingInsightBusy,
            onChatTap: _handleChatTap,
            onAddToCartTap: _handleAddToCartTap,
            onBuyTap: _handleBuyNowTap,
            onListingInsightTap: () => unawaited(_handleListingInsightTap()),
            onFlashDealChanged: _handleFlashDealChanged,
          ),
        ),
      ),
      body: Stack(
        children: [
          if (!isDarkDetails)
            const Positioned.fill(child: _ProductDetailsGlassBackdrop()),
          NotificationListener<ScrollNotification>(
            onNotification: _handleScrollNotification,
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                SliverAppBar(
                  backgroundColor: Colors.transparent,
                  surfaceTintColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  elevation: 0,
                  scrolledUnderElevation: 0,
                  forceElevated: false,
                  automaticallyImplyLeading: false,
                  pinned: true,
                  expandedHeight: _heroExpandedHeight,
                  flexibleSpace: Stack(
                    fit: StackFit.expand,
                    clipBehavior: Clip.none,
                    children: [
                      ClipPath(
                        clipper: isDarkDetails
                            ? null
                            : _ProductDetailsHeroCapClipper(
                                collapsedHeight: collapsedHeaderHeight,
                              ),
                        child: FlexibleSpaceBar(
                          background: AnimatedBuilder(
                            animation: Listenable.merge([
                              _productNotifier,
                              _currentHeroMediaIndexNotifier,
                              _heroCommentDismissedNotifier,
                            ]),
                            builder: (context, child) => _ProductDetailsHero(
                              heroImageKey: _heroImageKey,
                              sourceHeroTag: widget.sourceHeroTag,
                              product: _product,
                              primaryColor: primaryColor,
                              mediaItems: _heroMediaItems,
                              pageController: _heroPageController,
                              currentMediaIndex: _currentHeroMediaIndex,
                              commentPreviews: _customerReviews,
                              isCommentPreviewDismissed:
                                  _heroCommentDismissedNotifier.value,
                              onImageTap: _openHeroImagePreview,
                              onCommentsTap: _openCustomerReviewsPage,
                              onCommentDismiss: () =>
                                  _heroCommentDismissedNotifier.value = true,
                              onPageChanged: (nextIndex) {
                                if (_currentHeroMediaIndex == nextIndex) {
                                  return;
                                }

                                _currentHeroMediaIndex = nextIndex;
                              },
                            ),
                          ),
                        ),
                      ),
                      // Rounded top of the details sheet, drawn inside the
                      // app bar so it tracks the sheet edge while collapsing.
                      // The dark sheet overlaps by 1px so no hero seam shows at
                      // fractional scroll offsets. The glass sheet instead
                      // sits over a hole clipped out of the hero, so it shows
                      // the same page backdrop as the sheet body. Hidden once
                      // fully collapsed.
                      Positioned.fill(
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            if (constraints.maxHeight <=
                                collapsedHeaderHeight + 0.5) {
                              return const SizedBox.shrink();
                            }
                            return Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Positioned(
                                  left: 0,
                                  right: 0,
                                  bottom: isDarkDetails ? -1 : 0,
                                  height: isDarkDetails
                                      ? _kDetailsSheetRadius + 1
                                      : _kDetailsSheetRadius,
                                  child: IgnorePointer(
                                    child: isDarkDetails
                                        ? DecoratedBox(
                                            decoration: BoxDecoration(
                                              color: detailsHeaderColor,
                                              borderRadius:
                                                  const BorderRadius.vertical(
                                                    top: Radius.circular(50),
                                                  ),
                                            ),
                                          )
                                        : const _ProductDetailsGlassSheetCap(),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                SliverToBoxAdapter(
                  child: ValueListenableBuilder<Product>(
                    valueListenable: _productNotifier,
                    builder: (context, product, child) => _ProductDetailsSheetSurface(
                      isDark: isDarkDetails,
                      darkColor: detailsHeaderColor,
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 280),
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        layoutBuilder: (currentChild, previousChildren) =>
                            Stack(
                              alignment: Alignment.topCenter,
                              children: [...previousChildren, ?currentChild],
                            ),
                        child: !_contentReady
                            ? const _ProductDetailsContentSkeleton(
                                key: ValueKey('product-details-skeleton'),
                              )
                            : Column(
                                key: const ValueKey('product-details-content'),
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      kProductContentSidePadding,
                                      0,
                                      kProductContentSidePadding,
                                      20,
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Builder(
                                          builder: (context) {
                                            final visibleCategories =
                                                _visibleCategoriesFor(product);
                                            final categoryChips = [
                                              for (
                                                var index = 0;
                                                index <
                                                    visibleCategories.length;
                                                index++
                                              )
                                                _ProductDetailChipData(
                                                  leading: _ProductDetailsCategoryIcon(
                                                    categoryName:
                                                        visibleCategories[index],
                                                    iconName: index == 0
                                                        ? _categoryIconDetail
                                                                  ?.iconName ??
                                                              ''
                                                        : '',
                                                    iconImageUrl: index == 0
                                                        ? _categoryIconDetail
                                                                  ?.iconImageUrl ??
                                                              ''
                                                        : '',
                                                    color: detailsInkColor,
                                                  ),
                                                  label:
                                                      visibleCategories[index],
                                                  color: detailsInkColor,
                                                  backgroundColor: isDarkDetails
                                                      ? Colors.white
                                                            .withOpacity(0.12)
                                                      : Colors.white.withValues(
                                                          alpha: 0.6,
                                                        ),
                                                  labelColor: detailsInkColor,
                                                  padding: uniformChipPadding,
                                                  borderRadius:
                                                      const BorderRadius.all(
                                                        Radius.circular(1200),
                                                      ),
                                                  labelStyle:
                                                      uniformChipLabelStyle,
                                                ),
                                            ];

                                            return Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.center,
                                              children: [
                                                Expanded(
                                                  child: SingleChildScrollView(
                                                    scrollDirection:
                                                        Axis.horizontal,
                                                    physics:
                                                        const BouncingScrollPhysics(),
                                                    child: Row(
                                                      spacing: 6,
                                                      children: [
                                                        for (final chip
                                                            in categoryChips)
                                                          _ProductDetailChip.fromData(
                                                            chip,
                                                          ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                ValueListenableBuilder<
                                                  List<String>
                                                >(
                                                  valueListenable:
                                                      FavoriteProductsStore
                                                          .instance
                                                          .favoriteProductIdsNotifier,
                                                  builder:
                                                      (
                                                        context,
                                                        favoriteProductIds,
                                                        child,
                                                      ) {
                                                        final isFavorite =
                                                            favoriteProductIds
                                                                .contains(
                                                                  product.id,
                                                                );

                                                        return SizedBox(
                                                          width: 36,
                                                          height: 36,
                                                          child: IconButton(
                                                            onPressed:
                                                                _handleFavoriteToggle,
                                                            tooltip: isFavorite
                                                                ? 'Remove from favorites'
                                                                : 'Add to favorites',
                                                            padding:
                                                                EdgeInsets.zero,
                                                            splashRadius: 20,
                                                            icon: Icon(
                                                              isFavorite
                                                                  ? Icons
                                                                        .favorite_rounded
                                                                  : Icons
                                                                        .favorite_border_rounded,
                                                              color: isFavorite
                                                                  ? const Color(
                                                                      0xFFFF5252,
                                                                    )
                                                                  : detailsInkColor
                                                                        .withOpacity(
                                                                          0.78,
                                                                        ),
                                                              size: 24,
                                                            ),
                                                          ),
                                                        );
                                                      },
                                                ),
                                              ],
                                            );
                                          },
                                        ),
                                        const SizedBox(height: 10),
                                        LayoutBuilder(
                                          builder: (context, constraints) {
                                            final productTitle =
                                                product.name.trim().isEmpty
                                                ? 'Unnamed Product'
                                                : product.name;
                                            final productTitleStyle = theme
                                                .textTheme
                                                .headlineSmall
                                                ?.copyWith(
                                                  color: detailsInkColor,
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 26,
                                                  height: 1.15,
                                                );
                                            final titleMaxWidth =
                                                constraints.maxWidth;
                                            final titleLineCount =
                                                _measureTextLineCount(
                                                  context,
                                                  text: productTitle,
                                                  style: productTitleStyle,
                                                  maxWidth: titleMaxWidth,
                                                );
                                            final titleBottomSpacing =
                                                titleLineCount <= 1 ? 0.0 : 4.0;

                                            return ValueListenableBuilder<
                                              Future<List<Product>>
                                            >(
                                              valueListenable:
                                                  _relatedProductsFutureNotifier,
                                              builder:
                                                  (
                                                    context,
                                                    relatedProductsFuture,
                                                    child,
                                                  ) {
                                                    return FutureBuilder<
                                                      List<Product>
                                                    >(
                                                      future:
                                                          relatedProductsFuture,
                                                      builder: (context, snapshot) {
                                                        const statusChipSpacing =
                                                            6.0;
                                                        final showsTopSellingBadge =
                                                            snapshot.hasData &&
                                                            _isProductInTopSelling(
                                                              product,
                                                              snapshot.data ??
                                                                  const <
                                                                    Product
                                                                  >[],
                                                            );
                                                        final titleBadges = <Widget>[
                                                          if (_activeFlashDealPrice !=
                                                              null)
                                                            const _ProductTitleIconBadge(
                                                              svg:
                                                                  _kLucideZapSvg,
                                                              colors: [
                                                                Color(
                                                                  0xFFE6005C,
                                                                ),
                                                                Color(
                                                                  0xFFFF4D88,
                                                                ),
                                                              ],
                                                              filledIcon: true,
                                                            ),
                                                          if (_showsFreeShippingBadge)
                                                            const _ProductTitleIconBadge(
                                                              svg:
                                                                  _kLucideTruckSvg,
                                                              colors: [
                                                                Color(
                                                                  0xFF00A86B,
                                                                ),
                                                                Color(
                                                                  0xFF2CC98F,
                                                                ),
                                                              ],
                                                            ),
                                                          if (showsTopSellingBadge)
                                                            const _ProductTitleIconBadge(
                                                              svg:
                                                                  _kLucideTrendingUpSvg,
                                                              colors: [
                                                                Color(
                                                                  0xFF0B9E8F,
                                                                ),
                                                                Color(
                                                                  0xFF2DD4BF,
                                                                ),
                                                              ],
                                                            ),
                                                          if (_showsTopReviewsChip)
                                                            const _ProductTitleIconBadge(
                                                              svg:
                                                                  _kLucideStarSvg,
                                                              colors: [
                                                                Color(
                                                                  0xFFF59E0B,
                                                                ),
                                                                Color(
                                                                  0xFFFFC93C,
                                                                ),
                                                              ],
                                                              filledIcon: true,
                                                            ),
                                                        ];
                                                        return Column(
                                                          crossAxisAlignment:
                                                              CrossAxisAlignment
                                                                  .start,
                                                          mainAxisSize:
                                                              MainAxisSize.min,
                                                          children: [
                                                            Row(
                                                              crossAxisAlignment:
                                                                  CrossAxisAlignment
                                                                      .start,
                                                              children: [
                                                                Expanded(
                                                                  child:
                                                                      titleBadges
                                                                          .isNotEmpty
                                                                      ? Text.rich(
                                                                          TextSpan(
                                                                            style:
                                                                                productTitleStyle,
                                                                            children: [
                                                                              for (final badge in titleBadges)
                                                                                WidgetSpan(
                                                                                  alignment: PlaceholderAlignment.middle,
                                                                                  child: Padding(
                                                                                    padding: const EdgeInsets.only(
                                                                                      right: statusChipSpacing,
                                                                                    ),
                                                                                    child: badge,
                                                                                  ),
                                                                                ),
                                                                              TextSpan(
                                                                                text: productTitle,
                                                                              ),
                                                                            ],
                                                                          ),
                                                                        )
                                                                      : Text(
                                                                          productTitle,
                                                                          style:
                                                                              productTitleStyle,
                                                                        ),
                                                                ),
                                                              ],
                                                            ),
                                                            SizedBox(
                                                              height:
                                                                  titleBottomSpacing,
                                                            ),
                                                            Wrap(
                                                              spacing: 10,
                                                              runSpacing: 6,
                                                              crossAxisAlignment:
                                                                  WrapCrossAlignment
                                                                      .center,
                                                              children: [
                                                                _ProductDetailPrice(
                                                                  amount:
                                                                      _shownPrice,
                                                                  color:
                                                                      primaryColor,
                                                                  fontWeight:
                                                                      FontWeight
                                                                          .w700,
                                                                  fontSize: 38,
                                                                ),
                                                                if (_showsStruckOriginalPrice)
                                                                  Row(
                                                                    mainAxisSize:
                                                                        MainAxisSize
                                                                            .min,
                                                                    children: [
                                                                      _ProductDetailPrice(
                                                                        amount:
                                                                            _originalPrice,
                                                                        color: detailsInkColor
                                                                            .withOpacity(
                                                                              0.5,
                                                                            ),
                                                                        fontWeight:
                                                                            FontWeight.w500,
                                                                        fontSize:
                                                                            15,
                                                                        decoration:
                                                                            TextDecoration.lineThrough,
                                                                      ),
                                                                      if (_shownDiscountPercent !=
                                                                          null) ...[
                                                                        const SizedBox(
                                                                          width:
                                                                              6,
                                                                        ),
                                                                        Container(
                                                                          padding: const EdgeInsets.symmetric(
                                                                            horizontal:
                                                                                6,
                                                                            vertical:
                                                                                1,
                                                                          ),
                                                                          decoration: const BoxDecoration(
                                                                            color: Color(
                                                                              0xFFD32F2F,
                                                                            ),
                                                                            borderRadius: BorderRadius.all(
                                                                              Radius.circular(
                                                                                5,
                                                                              ),
                                                                            ),
                                                                          ),
                                                                          child: Text(
                                                                            '-$_shownDiscountPercent%',
                                                                            style: GoogleFonts.roboto(
                                                                              color: Colors.white,
                                                                              fontSize: 15,
                                                                              fontWeight: FontWeight.w700,
                                                                              height: 1.2,
                                                                            ),
                                                                          ),
                                                                        ),
                                                                      ],
                                                                    ],
                                                                  ),
                                                              ],
                                                            ),
                                                            const SizedBox(
                                                              height: 4,
                                                            ),
                                                            Wrap(
                                                              spacing: 14,
                                                              runSpacing: 6,
                                                              children: [
                                                                SwitchMetaItem(
                                                                  leading: _ProductDetailsLucideIcon(
                                                                    svg:
                                                                        _kLucideStarSvg,
                                                                    color: Color(
                                                                      0xFFF9A825,
                                                                    ),
                                                                    size: 16,
                                                                  ),
                                                                  iconColor:
                                                                      const Color(
                                                                        0xFFF9A825,
                                                                      ),
                                                                  label:
                                                                      _product.ratingCount >
                                                                          0
                                                                      ? '${_product.rating.toStringAsFixed(1)} (${_product.ratingCount})'
                                                                      : _product
                                                                            .rating
                                                                            .toStringAsFixed(
                                                                              1,
                                                                            ),
                                                                  color:
                                                                      detailsInkColor,
                                                                ),
                                                                SwitchMetaItem(
                                                                  leading: _ProductDetailsLucideIcon(
                                                                    svg:
                                                                        _kLucideBoxSvg,
                                                                    color:
                                                                        _availableStock >
                                                                            0
                                                                        ? detailsInkColor.withValues(
                                                                            alpha:
                                                                                0.7,
                                                                          )
                                                                        : const Color(
                                                                            0xFFC62828,
                                                                          ),
                                                                    size: 16,
                                                                  ),
                                                                  iconColor:
                                                                      _availableStock >
                                                                          0
                                                                      ? detailsInkColor
                                                                            .withOpacity(
                                                                              0.7,
                                                                            )
                                                                      : const Color(
                                                                          0xFFC62828,
                                                                        ),
                                                                  label:
                                                                      _availableStock >
                                                                          0
                                                                      ? 'Stock: $_availableStock'
                                                                      : 'Sold out',
                                                                  color:
                                                                      _availableStock >
                                                                          0
                                                                      ? detailsInkColor
                                                                      : const Color(
                                                                          0xFFC62828,
                                                                        ),
                                                                ),
                                                                if (_product
                                                                        .sold >
                                                                    0)
                                                                  SwitchMetaItem(
                                                                    leading: _ProductDetailsLucideIcon(
                                                                      svg:
                                                                          _kLucideShoppingBagSvg,
                                                                      color:
                                                                          primaryColor,
                                                                      size: 16,
                                                                    ),
                                                                    iconColor:
                                                                        primaryColor,
                                                                    label:
                                                                        '${_formatCompactCount(_product.sold)} sold',
                                                                    color:
                                                                        detailsInkColor,
                                                                  ),
                                                                SwitchMetaItem(
                                                                  leading: _ProductDetailsLucideIcon(
                                                                    svg:
                                                                        _kLucideCalendarSvg,
                                                                    color: detailsInkColor
                                                                        .withValues(
                                                                          alpha:
                                                                              0.7,
                                                                        ),
                                                                    size: 16,
                                                                  ),
                                                                  iconColor:
                                                                      detailsInkColor
                                                                          .withOpacity(
                                                                            0.7,
                                                                          ),
                                                                  label:
                                                                      _formattedDate,
                                                                  color:
                                                                      detailsInkColor,
                                                                ),
                                                              ],
                                                            ),
                                                            if (product
                                                                .variants
                                                                .isNotEmpty)
                                                              _buildDetailsVariantSelector(
                                                                theme,
                                                                product,
                                                                primaryColor,
                                                              ),
                                                            const SizedBox(
                                                              height: 8,
                                                            ),
                                                            TextButtonTheme(
                                                              data: TextButtonThemeData(
                                                                style: TextButton.styleFrom(
                                                                  foregroundColor:
                                                                      detailsInkColor
                                                                          .withOpacity(
                                                                            0.82,
                                                                          ),
                                                                ),
                                                              ),
                                                              child: Wrap(
                                                                spacing: 4,
                                                                crossAxisAlignment:
                                                                    WrapCrossAlignment
                                                                        .center,
                                                                children: [
                                                                  if (_ownListingResolved &&
                                                                      !_isOwnListing &&
                                                                      _reportEligible)
                                                                    TextButton.icon(
                                                                      onPressed: () async {
                                                                        await openReportListingSheet(
                                                                          context,
                                                                          productId:
                                                                              product.id,
                                                                          productName:
                                                                              product.name,
                                                                          adminId:
                                                                              product.adminId,
                                                                          companyId:
                                                                              product.companyId,
                                                                          companyName:
                                                                              product.companyName,
                                                                        );
                                                                        if (mounted) {
                                                                          unawaited(
                                                                            _refreshReportEligibility(),
                                                                          );
                                                                        }
                                                                      },
                                                                      icon: const Icon(
                                                                        Icons
                                                                            .flag_outlined,
                                                                        size:
                                                                            18,
                                                                      ),
                                                                      label: const Text(
                                                                        'Report this listing',
                                                                      ),
                                                                    ),
                                                                ],
                                                              ),
                                                            ),
                                                          ],
                                                        );
                                                      },
                                                    );
                                                  },
                                            );
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                  ClipPath(
                                    clipper: const SwitchArcClipper(
                                      arcHeight: _kDetailsArcHeight,
                                    ),
                                    child: ColoredBox(
                                      color: detailsSurfaceColor,
                                      child: Padding(
                                        padding: const EdgeInsets.fromLTRB(
                                          kProductContentSidePadding,
                                          _kDetailsArcHeight + 16,
                                          kProductContentSidePadding,
                                          28,
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Column(
                                              key: _aboutSectionKey,
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'About this product',
                                                  style: theme
                                                      .textTheme
                                                      .titleMedium
                                                      ?.copyWith(
                                                        fontWeight:
                                                            FontWeight.w800,
                                                      ),
                                                ),
                                                const SizedBox(height: 12),
                                                if (product.description
                                                    .trim()
                                                    .isNotEmpty)
                                                  Text(
                                                    product.description,
                                                    style: theme
                                                        .textTheme
                                                        .bodyMedium
                                                        ?.copyWith(
                                                          color: secondaryColor,
                                                          height: 1.2,
                                                        ),
                                                  )
                                                else if (product
                                                    .descriptionImageUrls
                                                    .isEmpty)
                                                  Text(
                                                    'No details available about this product yet.',
                                                    style: theme
                                                        .textTheme
                                                        .bodyMedium
                                                        ?.copyWith(
                                                          color: secondaryColor,
                                                          height: 1.2,
                                                        ),
                                                  ),
                                                if (product
                                                    .descriptionImageUrls
                                                    .isNotEmpty) ...[
                                                  if (product.description
                                                      .trim()
                                                      .isNotEmpty)
                                                    const SizedBox(height: 14),
                                                  _ProductDescriptionImageList(
                                                    imageUrls: product
                                                        .descriptionImageUrls,
                                                  ),
                                                ],
                                              ],
                                            ),
                                            if (product
                                                .specifications
                                                .isNotEmpty) ...[
                                              const SizedBox(height: 20),
                                              Text(
                                                'Specifications',
                                                style: theme
                                                    .textTheme
                                                    .titleMedium
                                                    ?.copyWith(
                                                      fontWeight:
                                                          FontWeight.w800,
                                                    ),
                                              ),
                                              const SizedBox(height: 12),
                                              _ProductSpecificationsCard(
                                                specifications:
                                                    product.specifications,
                                                secondaryColor: secondaryColor,
                                              ),
                                            ],
                                            HomeVoucherCarousel(
                                              platformId: _cartPlatformId,
                                              backgroundColor:
                                                  detailsSurfaceColor,
                                              titleColor: detailsInkColor,
                                              secondaryColor: secondaryColor,
                                              primaryColor: primaryColor,
                                              sellerAdminId: _sellerAdminIdFor(
                                                product,
                                              ),
                                              title: 'Available vouchers',
                                              includePlatformVouchers: true,
                                              productId: product.id,
                                              categoryIds:
                                                  _visibleCategoriesFor(product),
                                              businessTypeIds:
                                                  _voucherBusinessTypeIds,
                                              brandIds: _voucherBrandIdsFor(
                                                product,
                                              ),
                                              variantIds: product.variants
                                                  .map((variant) => variant.id)
                                                  .where(
                                                    (id) => id.trim().isNotEmpty,
                                                  )
                                                  .toList(growable: false),
                                              horizontalPadding: 0,
                                              contentTopPadding: 20,
                                            ),
                                            if (_sellerAdminIdFor(
                                              product,
                                            ).isNotEmpty) ...[
                                              const SizedBox(height: 16),
                                              _SellerChatListTile(
                                                product: product,
                                                stats: _sellerStatsFor(product),
                                                isLoadingStats:
                                                    _sellerStatsLoading,
                                                primaryColor: primaryColor,
                                                secondaryColor: secondaryColor,
                                                onVisit: () =>
                                                    _openSellerPage(product),
                                              ),
                                            ],
                                            const SizedBox(height: 16),
                                            Column(
                                              key: _customerReviewsSectionKey,
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        'Customer Reviews',
                                                        style: theme
                                                            .textTheme
                                                            .titleMedium
                                                            ?.copyWith(
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w800,
                                                            ),
                                                      ),
                                                    ),
                                                    if (_customerReviews
                                                        .isNotEmpty)
                                                      InkWell(
                                                        onTap:
                                                            _openCustomerReviewsPage,
                                                        borderRadius:
                                                            const BorderRadius.all(
                                                              Radius.circular(
                                                                10,
                                                              ),
                                                            ),
                                                        child: Padding(
                                                          padding:
                                                              const EdgeInsets.symmetric(
                                                                horizontal: 4,
                                                                vertical: 4,
                                                              ),
                                                          child: Text(
                                                            'View all',
                                                            style: theme
                                                                .textTheme
                                                                .labelLarge
                                                                ?.copyWith(
                                                                  color:
                                                                      primaryColor,
                                                                  fontWeight:
                                                                      FontWeight
                                                                          .w700,
                                                                ),
                                                          ),
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                                const SizedBox(height: 12),
                                                if (_customerReviews.isEmpty)
                                                  Text(
                                                    'No customer reviews available yet for this product.',
                                                    style: theme
                                                        .textTheme
                                                        .bodyMedium
                                                        ?.copyWith(
                                                          color: secondaryColor,
                                                          height: 1.2,
                                                        ),
                                                  )
                                                else
                                                  _LatestCustomerReviews(
                                                    reviews: _customerReviews,
                                                    titleColor: theme
                                                        .colorScheme
                                                        .onSurface,
                                                    secondaryColor:
                                                        secondaryColor,
                                                    sellerCompanyName:
                                                        _product.companyName,
                                                    onMediaTap:
                                                        _openReviewMediaViewer,
                                                  ),
                                              ],
                                            ),
                                            SizedBox(
                                              height:
                                                  _customerReviewsToRelatedProductsSpacing(
                                                    _customerReviews,
                                                  ),
                                            ),
                                            KeyedSubtree(
                                              key: _relatedProductsSectionKey,
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    'Related Products',
                                                    style: theme
                                                        .textTheme
                                                        .titleMedium
                                                        ?.copyWith(
                                                          fontWeight:
                                                              FontWeight.w800,
                                                        ),
                                                  ),
                                                  const SizedBox(height: 12),
                                                  ValueListenableBuilder<
                                                    Future<List<Product>>
                                                  >(
                                                    valueListenable:
                                                        _relatedProductsFutureNotifier,
                                                    builder:
                                                        (
                                                          context,
                                                          relatedProductsFuture,
                                                          child,
                                                        ) {
                                                          return FutureBuilder<
                                                            List<Product>
                                                          >(
                                                            future:
                                                                relatedProductsFuture,
                                                            builder: (context, snapshot) {
                                                              if (snapshot.connectionState ==
                                                                      ConnectionState
                                                                          .waiting &&
                                                                  !snapshot
                                                                      .hasData) {
                                                                return const _RelatedProductsSkeleton();
                                                              }

                                                              if (snapshot
                                                                  .hasError) {
                                                                return Text(
                                                                  'Unable to load related products right now.',
                                                                  style: theme
                                                                      .textTheme
                                                                      .bodyMedium
                                                                      ?.copyWith(
                                                                        color:
                                                                            secondaryColor,
                                                                        height:
                                                                            1.55,
                                                                      ),
                                                                );
                                                              }

                                                              final relatedProducts =
                                                                  _buildRelatedProducts(
                                                                    snapshot.data ??
                                                                        const <
                                                                          Product
                                                                        >[],
                                                                  );
                                                              final topSellerIds = {
                                                                for (final product
                                                                    in _buildTopSellingProducts(
                                                                      snapshot.data ??
                                                                          const <
                                                                            Product
                                                                          >[],
                                                                    ))
                                                                  product.id,
                                                              };

                                                              if (relatedProducts
                                                                  .isEmpty) {
                                                                return Text(
                                                                  'No related products available in this category yet.',
                                                                  style: theme
                                                                      .textTheme
                                                                      .bodyMedium
                                                                      ?.copyWith(
                                                                        color:
                                                                            secondaryColor,
                                                                        height:
                                                                            1.55,
                                                                      ),
                                                                );
                                                              }

                                                              return ValueListenableBuilder<
                                                                int
                                                              >(
                                                                valueListenable:
                                                                    _visibleRelatedProductsCountNotifier,
                                                                builder:
                                                                    (
                                                                      context,
                                                                      visibleCount,
                                                                      child,
                                                                    ) {
                                                                      final visibleRelatedProductsCount = visibleCount
                                                                          .clamp(
                                                                            0,
                                                                            relatedProducts.length,
                                                                          )
                                                                          .toInt();

                                                                      return _RelatedProductsMasonry(
                                                                        products: relatedProducts
                                                                            .take(
                                                                              visibleRelatedProductsCount,
                                                                            )
                                                                            .toList(),
                                                                        topSellerIds:
                                                                            topSellerIds,
                                                                        platformId:
                                                                            _cartPlatformId,
                                                                      );
                                                                    },
                                                              );
                                                            },
                                                          );
                                                        },
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(height: 18),
                                            ValueListenableBuilder<int>(
                                              valueListenable:
                                                  _bottomOverscrollSignalNotifier,
                                              builder:
                                                  (
                                                    context,
                                                    overscrollSignal,
                                                    child,
                                                  ) =>
                                                      _ProductDetailsScrollEndIndicator(
                                                        scrollController:
                                                            _scrollController,
                                                        overscrollSignal:
                                                            overscrollSignal,
                                                        primaryColor:
                                                            primaryColor,
                                                        secondaryColor:
                                                            secondaryColor,
                                                      ),
                                            ),
                                          ],
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
              ],
            ),
          ),
          AnimatedBuilder(
            animation: Listenable.merge([
              _scrollController,
              _heroTopLuminanceNotifier,
            ]),
            builder: (context, child) {
              final scrollOffset = _scrollController.hasClients
                  ? _scrollController.offset
                  : 0.0;
              final collapseRange =
                  (_heroExpandedHeight - collapsedHeaderHeight) <= 0
                  ? 1.0
                  : (_heroExpandedHeight - collapsedHeaderHeight);
              final collapseProgress = (scrollOffset / collapseRange).clamp(
                0.0,
                1.0,
              );
              final headerRevealProgress =
                  (((collapseProgress - 0.34) / 0.66).clamp(0.0, 1.0) as num)
                      .toDouble();
              final headerOpacity = Curves.easeOutCubic.transform(
                headerRevealProgress,
              );
              final isDarkTheme = theme.brightness == Brightness.dark;
              final headerSurfaceColor = isDarkTheme
                  ? homeHeaderColor
                  : Colors.white;
              final heroLuminance =
                  _heroTopLuminanceNotifier.value ??
                  _heroFallbackLuminance(detailsSurfaceColor, primaryColor);
              final backdropLuminance =
                  heroLuminance +
                  (headerSurfaceColor.computeLuminance() - heroLuminance) *
                      headerOpacity;
              final usesLightIcons =
                  backdropLuminance < kLightBackdropLuminance;
              const darkIconColor = Colors.black;
              final headerTitle = _resolveHeaderTitle(
                scrollOffset: scrollOffset,
                headerBottom: collapsedHeaderHeight,
                revealProgress: headerRevealProgress,
              );

              return Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: AnnotatedRegion<SystemUiOverlayStyle>(
                  value: usesLightIcons
                      ? SystemUiOverlayStyle.light.copyWith(
                          statusBarColor: Colors.transparent,
                        )
                      : SystemUiOverlayStyle.dark.copyWith(
                          statusBarColor: Colors.transparent,
                        ),
                  child: RepaintBoundary(
                    child: Container(
                      height: collapsedHeaderHeight,
                      decoration: BoxDecoration(
                        color: headerSurfaceColor.withOpacity(headerOpacity),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(
                              0.08 * headerOpacity,
                            ),
                            blurRadius: 18,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: SafeArea(
                        bottom: false,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: TweenAnimationBuilder<Color?>(
                            tween: ColorTween(
                              end: usesLightIcons
                                  ? Colors.white
                                  : darkIconColor,
                            ),
                            duration: appMotionFrames(13),
                            curve: Curves.easeOutCubic,
                            builder: (context, animatedIconColor, _) {
                              final headerIconColor =
                                  animatedIconColor ?? darkIconColor;
                              final headerActionIconColor = usesLightIcons
                                  ? headerIconColor.withOpacity(0.92)
                                  : headerIconColor;
                              return Row(
                                children: [
                                  SizedBox(
                                    width: 48,
                                    height: 48,
                                    child: IconButton(
                                      onPressed: () =>
                                          Navigator.of(context).maybePop(),
                                      tooltip: 'Back',
                                      icon: _ProductDetailsLucideIcon(
                                        svg: _kProductDetailsBackSvg,
                                        color: headerIconColor,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: IgnorePointer(
                                      child: AnimatedOpacity(
                                        duration: appMotionFrames(11),
                                        opacity: headerTitle.isEmpty
                                            ? 0
                                            : headerOpacity,
                                        child: Align(
                                          alignment: Alignment.centerLeft,
                                          child: Text(
                                            headerTitle,
                                            textAlign: TextAlign.left,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: theme.textTheme.titleMedium
                                                ?.copyWith(
                                                  color: headerIconColor,
                                                  fontWeight: FontWeight.w800,
                                                ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                  if (_showsHeaderUtilityActions) ...[
                                    SizedBox(
                                      width: 40,
                                      height: 40,
                                      child: IconButton(
                                        onPressed: _openSearchPage,
                                        tooltip: 'Search',
                                        padding: EdgeInsets.zero,
                                        constraints:
                                            const BoxConstraints.tightFor(
                                              width: 40,
                                              height: 40,
                                            ),
                                        splashRadius: 20,
                                        icon: _ProductDetailsLucideIcon(
                                          svg: _kProductDetailsSearchSvg,
                                          color: headerActionIconColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                  if (_product.id.trim().isNotEmpty)
                                    SizedBox(
                                      width: 40,
                                      height: 40,
                                      child: Builder(
                                        builder: (buttonContext) => IconButton(
                                          onPressed: () => shareListingLink(
                                            buttonContext,
                                            productId: _product.id,
                                            productName: _product.name,
                                          ),
                                          tooltip: 'Share',
                                          padding: EdgeInsets.zero,
                                          constraints:
                                              const BoxConstraints.tightFor(
                                                width: 40,
                                                height: 40,
                                              ),
                                          splashRadius: 20,
                                          icon: LucideShareIcon(
                                            color: headerActionIconColor,
                                            size: 22,
                                          ),
                                        ),
                                      ),
                                    ),
                                  if (_showsHeaderUtilityActions)
                                    _buildCartOverlayButton(
                                      headerActionIconColor,
                                    ),
                                ],
                              );
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          Positioned(
            right: 16,
            bottom: 18,
            child: ValueListenableBuilder<bool>(
              valueListenable: _showsScrollToTopButtonNotifier,
              builder: (context, showsScrollToTopButton, child) =>
                  RepaintBoundary(
                    child: AnimatedSwitcher(
                      duration: appMotionFrames(13),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      transitionBuilder: (child, animation) {
                        final offsetAnimation = Tween<Offset>(
                          begin: const Offset(0, 0.2),
                          end: Offset.zero,
                        ).animate(animation);

                        return FadeTransition(
                          opacity: animation,
                          child: SlideTransition(
                            position: offsetAnimation,
                            child: child,
                          ),
                        );
                      },
                      child: showsScrollToTopButton
                          ? FloatingActionButton.small(
                              key: const ValueKey(
                                'product-details-scroll-to-top-button',
                              ),
                              heroTag: 'product-details-scroll-to-top-button',
                              backgroundColor: primaryColor,
                              foregroundColor: theme.cardColor,
                              onPressed: _scrollToTop,
                              child: const Icon(
                                Icons.keyboard_arrow_up_rounded,
                              ),
                            )
                          : const SizedBox.shrink(
                              key: ValueKey(
                                'product-details-scroll-to-top-button-hidden',
                              ),
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

class _ProductDetailsHero extends StatelessWidget {
  const _ProductDetailsHero({
    required this.heroImageKey,
    required this.sourceHeroTag,
    required this.product,
    required this.primaryColor,
    required this.mediaItems,
    required this.pageController,
    required this.currentMediaIndex,
    required this.commentPreviews,
    required this.isCommentPreviewDismissed,
    required this.onImageTap,
    required this.onCommentsTap,
    required this.onCommentDismiss,
    required this.onPageChanged,
  });

  final GlobalKey heroImageKey;
  final Object? sourceHeroTag;
  final Product product;
  final Color primaryColor;
  final List<_ProductDetailsMediaItem> mediaItems;
  final PageController pageController;
  final int currentMediaIndex;
  final List<_ProductCustomerReview> commentPreviews;
  final bool isCommentPreviewDismissed;
  final VoidCallback onImageTap;
  final VoidCallback onCommentsTap;
  final VoidCallback onCommentDismiss;
  final ValueChanged<int> onPageChanged;

  String get _initial {
    final trimmedName = product.name.trim();
    if (trimmedName.isEmpty) {
      return '?';
    }

    return trimmedName[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final hasMedia = mediaItems.isNotEmpty;
    final heroMedia = SizedBox.expand(
      child: hasMedia
          ? RepaintBoundary(
              child: PageView.builder(
                controller: pageController,
                itemCount: mediaItems.length,
                onPageChanged: onPageChanged,
                itemBuilder: (context, index) {
                  final mediaItem = mediaItems[index];
                  if (mediaItem.isVideo) {
                    return _ProductDetailsHeroVideo(
                      videoUrl: mediaItem.url,
                      thumbnailUrl: mediaItem.thumbnailUrl,
                      primaryColor: primaryColor,
                      onTap: onImageTap,
                    );
                  }

                  return GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: onImageTap,
                    child: _ProductDetailsNetworkImage(
                      imageUrl: mediaItem.url,
                      fit: BoxFit.cover,
                      errorFallback: _ProductDetailsHeroFallback(
                        primaryColor: primaryColor,
                        initial: _initial,
                      ),
                    ),
                  );
                },
              ),
            )
          : _ProductDetailsHeroFallback(
              primaryColor: primaryColor,
              initial: _initial,
            ),
    );

    return Stack(
      fit: StackFit.expand,
      children: [
        KeyedSubtree(
          key: heroImageKey,
          child: sourceHeroTag == null
              ? heroMedia
              : Hero(
                  tag: sourceHeroTag!,
                  createRectTween: (begin, end) {
                    return RectTween(begin: begin, end: end);
                  },
                  flightShuttleBuilder:
                      (
                        flightContext,
                        animation,
                        flightDirection,
                        fromHeroContext,
                        toHeroContext,
                      ) {
                        if (flightDirection == HeroFlightDirection.push) {
                          final toHero = toHeroContext.widget as Hero;
                          return toHero.child;
                        }

                        return _ProductDetailsHeroFlightSnapshot(
                          product: product,
                          primaryColor: primaryColor,
                          mediaItem:
                              currentMediaIndex >= 0 &&
                                  currentMediaIndex < mediaItems.length
                              ? mediaItems[currentMediaIndex]
                              : null,
                        );
                      },
                  child: heroMedia,
                ),
        ),
        if (mediaItems.length > 1)
          Positioned(
            left: 0,
            right: 0,
            bottom: 6 + _kDetailsSheetRadius,
            child: IgnorePointer(
              child: SafeArea(
                top: false,
                minimum: const EdgeInsets.only(bottom: 2),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(mediaItems.length, (index) {
                        final isActive = index == currentMediaIndex;

                        return AnimatedContainer(
                          duration: appMotionFrames(13),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          height: 7,
                          width: isActive ? 20 : 7,
                          decoration: BoxDecoration(
                            color: isActive
                                ? Colors.white
                                : Colors.white.withOpacity(0.36),
                            borderRadius: const BorderRadius.all(
                              Radius.circular(999),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ),
            ),
          ),
        if (commentPreviews.isNotEmpty)
          Positioned(
            right: 14,
            bottom: (mediaItems.length > 1 ? 24 : 16) + _kDetailsSheetRadius,
            child: SafeArea(
              top: false,
              minimum: const EdgeInsets.only(right: 2, bottom: 2),
              child: IgnorePointer(
                ignoring: isCommentPreviewDismissed,
                child: AnimatedOpacity(
                  opacity: isCommentPreviewDismissed ? 0 : 1,
                  duration: appMotionFrames(14),
                  curve: Curves.easeOutCubic,
                  child: AnimatedScale(
                    scale: isCommentPreviewDismissed ? 0.86 : 1,
                    alignment: Alignment.bottomRight,
                    duration: appMotionFrames(14),
                    curve: Curves.easeOutCubic,
                    child: _HeroBuyerCommentPopup(
                      reviews: commentPreviews,
                      onTap: onCommentsTap,
                      onDismiss: onCommentDismiss,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ProductDetailsHeroFlightSnapshot extends StatelessWidget {
  const _ProductDetailsHeroFlightSnapshot({
    required this.product,
    required this.primaryColor,
    required this.mediaItem,
  });

  final Product product;
  final Color primaryColor;
  final _ProductDetailsMediaItem? mediaItem;

  String get _initial {
    final trimmedName = product.name.trim();
    if (trimmedName.isEmpty) {
      return '?';
    }

    return trimmedName[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final fallback = _ProductDetailsHeroFallback(
      primaryColor: primaryColor,
      initial: _initial,
    );
    final item = mediaItem;
    final imageUrl = item == null
        ? ''
        : (item.isVideo ? item.thumbnailUrl.trim() : item.url.trim());

    return SizedBox.expand(
      child: imageUrl.isEmpty
          ? fallback
          : _ProductDetailsNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              errorFallback: fallback,
              loadingFallback: fallback,
            ),
    );
  }
}

class _HeroBuyerCommentPopup extends StatefulWidget {
  const _HeroBuyerCommentPopup({
    required this.reviews,
    required this.onTap,
    required this.onDismiss,
  });

  final List<_ProductCustomerReview> reviews;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  @override
  State<_HeroBuyerCommentPopup> createState() => _HeroBuyerCommentPopupState();
}

class _HeroBuyerCommentPopupState extends State<_HeroBuyerCommentPopup> {
  static const Duration _rotationInterval = Duration(seconds: 4);

  Timer? _rotationTimer;
  int _currentReviewIndex = 0;

  _ProductCustomerReview get _currentReview =>
      widget.reviews[_currentReviewIndex.clamp(0, widget.reviews.length - 1)];

  @override
  void initState() {
    super.initState();
    _syncRotationTimer();
  }

  @override
  void didUpdateWidget(covariant _HeroBuyerCommentPopup oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.reviews.isEmpty) {
      _currentReviewIndex = 0;
    } else if (_currentReviewIndex >= widget.reviews.length) {
      _currentReviewIndex = 0;
    }

    if (oldWidget.reviews.length != widget.reviews.length) {
      _syncRotationTimer();
    }
  }

  void _syncRotationTimer() {
    _rotationTimer?.cancel();
    if (widget.reviews.length <= 1) {
      return;
    }

    _rotationTimer = Timer.periodic(_rotationInterval, (_) {
      if (!mounted || widget.reviews.length <= 1) {
        return;
      }

      setState(() {
        _currentReviewIndex = (_currentReviewIndex + 1) % widget.reviews.length;
      });
    });
  }

  @override
  void dispose() {
    _rotationTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDarkMode = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;
    final bubbleColor = isDarkMode ? const Color(0xFF1F1F23) : Colors.white;
    final nameColor = isDarkMode ? Colors.white : const Color(0xFF111827);
    final messageColor = isDarkMode
        ? Colors.white.withOpacity(0.78)
        : const Color(0xFF4B5563);
    final emptyStarColor = isDarkMode
        ? Colors.white.withOpacity(0.22)
        : const Color(0xFFE5E7EB);
    final bubbleShadows = [
      BoxShadow(
        color: Colors.black.withOpacity(isDarkMode ? 0.32 : 0.14),
        blurRadius: 20,
        offset: const Offset(0, 8),
      ),
      BoxShadow(
        color: Colors.black.withOpacity(isDarkMode ? 0.18 : 0.06),
        blurRadius: 3,
        offset: const Offset(0, 1),
      ),
    ];
    const bubbleRadius = BorderRadius.only(
      topLeft: Radius.circular(18),
      topRight: Radius.circular(18),
      bottomLeft: Radius.circular(18),
      bottomRight: Radius.circular(6),
    );
    final review = _currentReview;
    final reviewerName = review.reviewer.trim().isEmpty
        ? 'Buyer'
        : review.reviewer.trim();
    final reviewerInitial = reviewerName[0].toUpperCase();
    final filledStars = review.rating.round().clamp(0, 5);
    final transitionDuration = appMotionFrames(31);

    final content = Column(
      key: ValueKey('${review.reviewer}-${review.title}-${review.message}'),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [primaryColor, primaryColor.withOpacity(0.72)],
                ),
              ),
              child: Text(
                reviewerInitial,
                style: theme.textTheme.labelMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  height: 1,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    reviewerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: nameColor,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (var star = 0; star < 5; star++)
                        _ProductDetailsLucideIcon(
                          svg: _kLucideStarSvg,
                          size: 12,
                          color: star < filledStars
                              ? const Color(0xFFF9A825)
                              : emptyStarColor,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        if (review.message.trim().isNotEmpty) ...[
          const SizedBox(height: 7),
          Text(
            review.message.trim(),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: messageColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
              height: 1.3,
            ),
          ),
        ],
      ],
    );

    const bubbleShape = _HeroCommentBubbleBorder(borderRadius: bubbleRadius);

    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 150, maxWidth: 232),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          DecoratedBox(
            decoration: ShapeDecoration(
              shape: bubbleShape,
              color: bubbleColor,
              shadows: bubbleShadows,
            ),
            child: Material(
              color: bubbleColor,
              shape: bubbleShape,
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: widget.onTap,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 9, 30, 10),
                  child: RepaintBoundary(
                    child: AnimatedSize(
                      duration: transitionDuration,
                      curve: Curves.easeOutCubic,
                      alignment: Alignment.topLeft,
                      child: AnimatedSwitcher(
                        duration: transitionDuration,
                        switchInCurve: Curves.easeOutCubic,
                        switchOutCurve: Curves.easeInCubic,
                        layoutBuilder: (currentChild, previousChildren) =>
                            currentChild ?? const SizedBox.shrink(),
                        transitionBuilder: (child, animation) {
                          final offsetAnimation = Tween<Offset>(
                            begin: const Offset(0, 0.28),
                            end: Offset.zero,
                          ).animate(animation);
                          return FadeTransition(
                            opacity: animation,
                            child: ClipRect(
                              child: SlideTransition(
                                position: offsetAnimation,
                                child: child,
                              ),
                            ),
                          );
                        },
                        child: content,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: 2,
            right: 2,
            child: Semantics(
              button: true,
              label: 'Hide buyer comment',
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: widget.onDismiss,
                child: SizedBox(
                  width: 30,
                  height: 30,
                  child: Center(
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: nameColor.withOpacity(isDarkMode ? 0.12 : 0.07),
                      ),
                      alignment: Alignment.center,
                      child: Icon(
                        Icons.close_rounded,
                        size: 13,
                        color: nameColor.withOpacity(0.62),
                      ),
                    ),
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

class _HeroCommentBubbleBorder extends ShapeBorder {
  const _HeroCommentBubbleBorder({required this.borderRadius});

  final BorderRadius borderRadius;

  static const double _tailRightInset = 12;
  static const double _tailBaseWidth = 18;
  static const double _tailHeight = 7;

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      getOuterPath(rect, textDirection: textDirection);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    final bubblePath = Path()..addRRect(borderRadius.toRRect(rect));
    final baseRight = rect.right - _tailRightInset;
    final baseLeft = baseRight - _tailBaseWidth;
    final tipX = baseRight - _tailBaseWidth * 0.38;
    final baseY = rect.bottom - 1;
    final tipY = rect.bottom + _tailHeight;
    final tailPath = Path()
      ..moveTo(baseLeft, baseY)
      ..quadraticBezierTo(tipX - 3, baseY + 1, tipX - 1.4, tipY - 1.2)
      ..quadraticBezierTo(tipX, tipY + 0.4, tipX + 1.4, tipY - 1.2)
      ..quadraticBezierTo(tipX + 3, baseY + 1, baseRight, baseY)
      ..close();
    return Path.combine(PathOperation.union, bubblePath, tailPath);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {}

  @override
  ShapeBorder scale(double t) =>
      _HeroCommentBubbleBorder(borderRadius: borderRadius * t);
}

class _ProductMediaPreviewPage extends StatefulWidget {
  const _ProductMediaPreviewPage({
    required this.mediaItems,
    required this.initialIndex,
    required this.productName,
    required this.model3dUrl,
    required this.primaryColor,
  });

  final List<_ProductDetailsMediaItem> mediaItems;
  final int initialIndex;
  final String productName;
  final String model3dUrl;
  final Color primaryColor;

  @override
  State<_ProductMediaPreviewPage> createState() =>
      _ProductMediaPreviewPageState();
}

class _ProductMediaPreviewPageState extends State<_ProductMediaPreviewPage> {
  late final PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    final safeInitialIndex = widget.mediaItems.isEmpty
        ? 0
        : widget.initialIndex.clamp(0, widget.mediaItems.length - 1).toInt();
    _currentIndex = safeInitialIndex;
    _pageController = PageController(initialPage: safeInitialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<bool> _handleBackPress() async {
    Navigator.of(context).pop(_currentIndex);
    return false;
  }

  bool get _hasModel3d => widget.model3dUrl.trim().isNotEmpty;

  Future<void> _openModelPreview() async {
    final modelUrl = widget.model3dUrl.trim();
    if (modelUrl.isEmpty) {
      return;
    }

    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => _ProductModelPreviewPage(
          modelUrl: modelUrl,
          productName: widget.productName,
          primaryColor: widget.primaryColor,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.productName.trim().isEmpty
        ? 'Product media'
        : widget.productName;
    final hasModel3d = _hasModel3d;
    const foregroundColor = Color(0xFF111827);
    final backdropItem = widget.mediaItems.isEmpty
        ? null
        : widget.mediaItems[_currentIndex];
    final backdropUrl = backdropItem == null
        ? ''
        : (backdropItem.isVideo ? backdropItem.thumbnailUrl : backdropItem.url)
              .trim();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: WillPopScope(
        onWillPop: _handleBackPress,
        child: Scaffold(
          backgroundColor: Colors.white,
          body: DecoratedBox(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFFFFFFFF),
                  Color(0xFFF1F4F9),
                  Color(0xFFE9EEF5),
                ],
              ),
            ),
            child: Stack(
              children: [
                Positioned.fill(
                  child: AnimatedSwitcher(
                    duration: appMotionFrames(18),
                    child: backdropUrl.isEmpty
                        ? const SizedBox.expand()
                        : ImageFiltered(
                            key: ValueKey<String>(backdropUrl),
                            imageFilter: ImageFilter.blur(
                              sigmaX: 40,
                              sigmaY: 40,
                            ),
                            child: _ProductDetailsNetworkImage(
                              imageUrl: backdropUrl,
                              fit: BoxFit.cover,
                              errorFallback: const SizedBox.expand(),
                              loadingFallback: const SizedBox.expand(),
                            ),
                          ),
                  ),
                ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.white.withValues(alpha: 0.78),
                          Colors.white.withValues(alpha: 0.62),
                          Colors.white.withValues(alpha: 0.80),
                        ],
                      ),
                    ),
                  ),
                ),
                RepaintBoundary(
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: widget.mediaItems.length,
                    onPageChanged: (index) {
                      if (_currentIndex == index) {
                        return;
                      }

                      setState(() {
                        _currentIndex = index;
                      });
                    },
                    itemBuilder: (context, index) {
                      final mediaItem = widget.mediaItems[index];
                      if (mediaItem.isVideo) {
                        return Center(
                          child: _ProductDetailsFullscreenVideoPlayer(
                            videoUrl: mediaItem.url,
                            thumbnailUrl: mediaItem.thumbnailUrl,
                            primaryColor: widget.primaryColor,
                          ),
                        );
                      }

                      return Center(
                        child: _ProductDetailsNetworkImage(
                          imageUrl: mediaItem.url,
                          fit: BoxFit.contain,
                          errorFallback: _ProductDetailsHeroFallback(
                            primaryColor: widget.primaryColor,
                            initial: title[0].toUpperCase(),
                          ),
                          loadingFallback: BouncingDotsLoader(
                            activeColor: widget.primaryColor,
                            inactiveColor: widget.primaryColor.withOpacity(
                              0.24,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(10, 6, 10, 0),
                      child: _ProductMediaGlassPanel(
                        borderRadius: 22,
                        padding: const EdgeInsets.fromLTRB(2, 2, 6, 2),
                        child: Row(
                          children: [
                            IconButton(
                              onPressed: () =>
                                  Navigator.of(context).pop(_currentIndex),
                              tooltip: 'Close preview',
                              icon: const Icon(
                                Icons.arrow_back_ios_new_rounded,
                                color: foregroundColor,
                              ),
                            ),
                            const SizedBox(width: 2),
                            Expanded(
                              child: Text(
                                title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      color: foregroundColor,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              onPressed: hasModel3d ? _openModelPreview : null,
                              tooltip: hasModel3d
                                  ? 'View 3D model'
                                  : 'No 3D model uploaded',
                              icon: Icon(
                                Icons.view_in_ar_rounded,
                                color: hasModel3d
                                    ? foregroundColor
                                    : foregroundColor.withValues(alpha: 0.3),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                if (widget.mediaItems.length > 1)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 16,
                    child: SafeArea(
                      top: false,
                      child: Center(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: _ProductMediaGlassPanel(
                            borderRadius: 999,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 8,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                widget.mediaItems.length,
                                (index) {
                                  final isActive = index == _currentIndex;

                                  return AnimatedContainer(
                                    duration: appMotionFrames(13),
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 3,
                                    ),
                                    height: 7,
                                    width: isActive ? 20 : 7,
                                    decoration: BoxDecoration(
                                      color: isActive
                                          ? widget.primaryColor
                                          : foregroundColor.withValues(
                                              alpha: 0.22,
                                            ),
                                      borderRadius: const BorderRadius.all(
                                        Radius.circular(999),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Frosted white glass surface used on the media preview overlays.
class _ProductMediaGlassPanel extends StatelessWidget {
  const _ProductMediaGlassPanel({
    required this.child,
    this.borderRadius = 20,
    this.padding = EdgeInsets.zero,
  });

  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(borderRadius);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: radius,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withValues(alpha: 0.72),
                  Colors.white.withValues(alpha: 0.48),
                ],
              ),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.85),
                width: 1,
              ),
            ),
            child: Padding(padding: padding, child: child),
          ),
        ),
      ),
    );
  }
}

class _ProductModelPreviewPage extends StatelessWidget {
  const _ProductModelPreviewPage({
    required this.modelUrl,
    required this.productName,
    required this.primaryColor,
  });

  final String modelUrl;
  final String productName;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final title = productName.trim().isEmpty ? '3D model' : productName.trim();

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          Positioned.fill(
            child: _ProductDetailsModelViewer(
              modelUrl: modelUrl,
              productName: title,
              primaryColor: primaryColor,
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(6, 4, 12, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      tooltip: 'Close 3D preview',
                      icon: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: Colors.black87,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                    const Icon(
                      Icons.view_in_ar_rounded,
                      color: Colors.black87,
                      size: 24,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductDetailsModelViewer extends StatelessWidget {
  const _ProductDetailsModelViewer({
    required this.modelUrl,
    required this.productName,
    required this.primaryColor,
  });

  final String modelUrl;
  final String productName;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final trimmedModelUrl = modelUrl.trim();
    if (trimmedModelUrl.isEmpty) {
      return _ProductDetailsModelFallback(
        primaryColor: primaryColor,
        message: 'No 3D model uploaded.',
      );
    }

    if (defaultTargetPlatform != TargetPlatform.android) {
      return _ProductDetailsModelFallback(
        primaryColor: primaryColor,
        message: '3D preview is available on Android.',
      );
    }

    return AndroidView(
      viewType: 'gms_shopping/model_viewer',
      creationParams: <String, String>{
        'modelUrl': trimmedModelUrl,
        'productName': productName,
      },
      creationParamsCodec: const StandardMessageCodec(),
      gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
        Factory<OneSequenceGestureRecognizer>(() => EagerGestureRecognizer()),
      },
    );
  }
}

class _ProductDetailsModelFallback extends StatelessWidget {
  const _ProductDetailsModelFallback({
    required this.primaryColor,
    required this.message,
  });

  final Color primaryColor;
  final String message;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.white,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.view_in_ar_rounded, color: primaryColor, size: 42),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                message,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.black87,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _ProductDetailsMediaType { image, video }

/// One full description photo plus half of the next one, so the peeking half
/// (softened with a white blur) reads as a carousel hint.
class _ProductDescriptionImageList extends StatefulWidget {
  const _ProductDescriptionImageList({required this.imageUrls});

  final List<String> imageUrls;

  @override
  State<_ProductDescriptionImageList> createState() =>
      _ProductDescriptionImageListState();
}

class _ProductDescriptionImageListState
    extends State<_ProductDescriptionImageList> {
  static const double _visibleItemCount = 1.5;
  static const double _itemGap = 10;

  final ScrollController _scrollController = ScrollController();
  final ScrollController _blurredMirrorController = ScrollController();
  final ValueNotifier<bool> _hasMoreToTheRight = ValueNotifier<bool>(true);

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_syncEdgeFade);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_syncEdgeFade);
    _scrollController.dispose();
    _blurredMirrorController.dispose();
    _hasMoreToTheRight.dispose();
    super.dispose();
  }

  void _syncEdgeFade() {
    if (!_scrollController.hasClients) {
      return;
    }
    final position = _scrollController.position;
    _hasMoreToTheRight.value = position.pixels < position.maxScrollExtent - 4;
    if (_blurredMirrorController.hasClients) {
      _blurredMirrorController.jumpTo(position.pixels);
    }
  }

  Widget _buildCarouselList({
    required ScrollController controller,
    required ScrollPhysics physics,
    required double itemExtent,
    required Color placeholderColor,
    required Color fallbackColor,
  }) {
    return ListView.builder(
      controller: controller,
      scrollDirection: Axis.horizontal,
      physics: physics,
      itemExtent: itemExtent,
      itemCount: widget.imageUrls.length,
      itemBuilder: (context, index) => Padding(
        padding: const EdgeInsets.only(right: _itemGap),
        child: _buildImage(
          widget.imageUrls[index],
          placeholderColor,
          fallbackColor,
        ),
      ),
    );
  }

  Widget _buildImage(String imageUrl, Color placeholderColor, Color fallback) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: ColoredBox(
        color: placeholderColor,
        child: _ProductDetailsNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          loadingFallback: ColoredBox(color: placeholderColor),
          errorFallback: Center(
            child: Icon(Icons.broken_image_outlined, color: fallback, size: 34),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final placeholderColor = theme.colorScheme.onSurface.withValues(
      alpha: 0.05,
    );
    final fallbackColor = theme.colorScheme.onSurface.withValues(alpha: 0.42);
    final imageUrls = widget.imageUrls;

    if (imageUrls.length == 1) {
      return AspectRatio(
        aspectRatio: 1,
        child: _buildImage(imageUrls.first, placeholderColor, fallbackColor),
      );
    }

    final fadeColor = _productDetailsSurfaceColor(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final viewportWidth = constraints.maxWidth;
        final itemWidth = (viewportWidth - _itemGap) / _visibleItemCount;
        final itemExtent = itemWidth + _itemGap;
        final peekWidth = viewportWidth - itemExtent;
        double stop(double x) => (x / viewportWidth).clamp(0.0, 1.0);
        final blurStart = stop(itemWidth - 28);
        final blurFull = stop(itemExtent + peekWidth * 0.35);

        return SizedBox(
          height: itemWidth,
          child: Stack(
            children: [
              _buildCarouselList(
                controller: _scrollController,
                physics: _SnapToItemScrollPhysics(itemExtent: itemExtent),
                itemExtent: itemExtent,
                placeholderColor: placeholderColor,
                fallbackColor: fallbackColor,
              ),
              Positioned.fill(
                child: IgnorePointer(
                  child: ValueListenableBuilder<bool>(
                    valueListenable: _hasMoreToTheRight,
                    builder: (context, hasMore, child) => AnimatedOpacity(
                      opacity: hasMore ? 1 : 0,
                      duration: appMotionFrames(12),
                      child: child,
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ShaderMask(
                          blendMode: BlendMode.dstIn,
                          shaderCallback: (bounds) => LinearGradient(
                            colors: const [
                              Colors.transparent,
                              Colors.transparent,
                              Colors.white,
                              Colors.white,
                            ],
                            stops: [0, blurStart, blurFull, 1],
                          ).createShader(bounds),
                          child: ClipRect(
                            child: ImageFiltered(
                              imageFilter: ImageFilter.blur(
                                sigmaX: 3.2,
                                sigmaY: 3.2,
                              ),
                              child: _buildCarouselList(
                                controller: _blurredMirrorController,
                                physics: const NeverScrollableScrollPhysics(),
                                itemExtent: itemExtent,
                                placeholderColor: placeholderColor,
                                fallbackColor: fallbackColor,
                              ),
                            ),
                          ),
                        ),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                fadeColor.withValues(alpha: 0),
                                fadeColor.withValues(alpha: 0),
                                fadeColor.withValues(alpha: 0.32),
                                fadeColor.withValues(alpha: 0.9),
                              ],
                              stops: [
                                0,
                                stop(itemWidth - 12),
                                stop(itemExtent + peekWidth * 0.45),
                                1,
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SnapToItemScrollPhysics extends ScrollPhysics {
  const _SnapToItemScrollPhysics({required this.itemExtent, super.parent});

  final double itemExtent;

  @override
  _SnapToItemScrollPhysics applyTo(ScrollPhysics? ancestor) =>
      _SnapToItemScrollPhysics(
        itemExtent: itemExtent,
        parent: buildParent(ancestor),
      );

  @override
  Simulation? createBallisticSimulation(
    ScrollMetrics position,
    double velocity,
  ) {
    if ((velocity <= 0 && position.pixels <= position.minScrollExtent) ||
        (velocity >= 0 && position.pixels >= position.maxScrollExtent)) {
      return super.createBallisticSimulation(position, velocity);
    }

    final tolerance = toleranceFor(position);
    var page = position.pixels / itemExtent;
    if (velocity < -tolerance.velocity) {
      page -= 0.5;
    } else if (velocity > tolerance.velocity) {
      page += 0.5;
    }
    final target = (page.roundToDouble() * itemExtent).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    if ((target - position.pixels).abs() < tolerance.distance) {
      return null;
    }
    return ScrollSpringSimulation(
      spring,
      position.pixels,
      target,
      velocity,
      tolerance: tolerance,
    );
  }

  @override
  bool get allowImplicitScrolling => false;
}

/// Text-only variant option on the dark details sheet. Variant photos show in
/// the hero album and in the Buy / Add to Cart sheets instead.
RRect _productDetailsCapRRect(Size size) {
  const radius = Radius.circular(_kDetailsSheetRadius);
  return RRect.fromRectAndCorners(
    Rect.fromLTRB(
      0,
      size.height - _kDetailsSheetRadius,
      size.width,
      size.height,
    ),
    topLeft: radius,
    topRight: radius,
  );
}

/// Cuts the glass sheet's rounded cap out of the hero so the page backdrop
/// shows through it, exactly like it does behind the sheet body.
class _ProductDetailsHeroCapClipper extends CustomClipper<Path> {
  const _ProductDetailsHeroCapClipper({required this.collapsedHeight});

  final double collapsedHeight;

  @override
  Path getClip(Size size) {
    final bounds = Path()..addRect(Offset.zero & size);
    if (size.height <= collapsedHeight + 0.5) {
      return bounds;
    }
    return Path.combine(
      PathOperation.difference,
      bounds,
      Path()..addRRect(_productDetailsCapRRect(size)),
    );
  }

  @override
  bool shouldReclip(_ProductDetailsHeroCapClipper oldClipper) =>
      oldClipper.collapsedHeight != collapsedHeight;
}

class _ProductDetailsGlassSheetCap extends StatelessWidget {
  const _ProductDetailsGlassSheetCap();

  @override
  Widget build(BuildContext context) {
    // Same tint as the top of _ProductDetailsSheetSurface so the cap and the
    // body read as one pane.
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(
        top: Radius.circular(_kDetailsSheetRadius),
      ),
      child: ColoredBox(
        color: Colors.white.withValues(alpha: _kDetailsGlassSeamAlpha),
      ),
    );
  }
}

/// Near-white gray backdrop the translucent details sheet scrolls over.
class _ProductDetailsGlassBackdrop extends StatelessWidget {
  const _ProductDetailsGlassBackdrop();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(color: Color(0xFFF8F9FB));
  }
}

class _ProductDetailsSheetSurface extends StatelessWidget {
  const _ProductDetailsSheetSurface({
    required this.isDark,
    required this.darkColor,
    required this.child,
  });

  final bool isDark;
  final Color darkColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (isDark) {
      return ColoredBox(color: darkColor, child: child);
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: _kDetailsGlassSeamAlpha),
            Colors.white.withValues(alpha: 0.54),
            Colors.white.withValues(alpha: 0.48),
          ],
          stops: const [0, 0.3, 1],
        ),
      ),
      child: child,
    );
  }
}

class _ProductDetailsVariantChip extends StatelessWidget {
  const _ProductDetailsVariantChip({
    required this.label,
    required this.isSelected,
    required this.isSoldOut,
    required this.accentColor,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final bool isSoldOut;
  final Color accentColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final inkColor = isDark ? Colors.white : const Color(0xFF111827);
    final foregroundColor = isSelected
        ? Colors.white
        : inkColor.withOpacity(isSoldOut ? 0.45 : 0.82);

    return Semantics(
      button: true,
      selected: isSelected,
      label: isSoldOut ? '$label, sold out' : label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          onTap();
          // Only the horizontal variant row may move; the page stays put.
          final rowPosition = Scrollable.maybeOf(context)?.position;
          final chipBox = context.findRenderObject();
          if (rowPosition != null &&
              rowPosition.axis == Axis.horizontal &&
              chipBox != null) {
            rowPosition.ensureVisible(
              chipBox,
              alignment: 0.5,
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOutCubic,
            );
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          constraints: const BoxConstraints(minHeight: 36),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? accentColor
                : isDark
                ? Colors.white.withOpacity(0.1)
                : Colors.white.withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: isSelected
                  ? accentColor
                  : isDark
                  ? Colors.white.withOpacity(0.2)
                  : const Color(0xFF0F172A).withValues(alpha: 0.08),
            ),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: const Color(
                        0xFF0F172A,
                      ).withValues(alpha: isSelected ? 0.12 : 0.05),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
          ),
          child: Text(
            isSoldOut ? '$label · Sold out' : label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelLarge?.copyWith(
              color: foregroundColor,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              decoration: isSoldOut && !isSelected
                  ? TextDecoration.lineThrough
                  : null,
              decorationColor: foregroundColor,
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductDetailsMediaItem {
  const _ProductDetailsMediaItem({
    required this.type,
    required this.url,
    this.thumbnailUrl = '',
  });

  final _ProductDetailsMediaType type;
  final String url;
  final String thumbnailUrl;

  bool get isImage => type == _ProductDetailsMediaType.image;
  bool get isVideo => type == _ProductDetailsMediaType.video;
}

class _ProductDetailsNetworkImage extends StatefulWidget {
  const _ProductDetailsNetworkImage({
    required this.imageUrl,
    this.fit,
    this.errorFallback,
    this.loadingFallback,
  });

  final String imageUrl;
  final BoxFit? fit;
  final Widget? errorFallback;
  final Widget? loadingFallback;

  @override
  State<_ProductDetailsNetworkImage> createState() =>
      _ProductDetailsNetworkImageState();
}

class _ProductDetailsNetworkImageState
    extends State<_ProductDetailsNetworkImage> {
  bool _usesOriginalUrlFallback = false;

  String get _originalImageUrl => widget.imageUrl.trim();
  String get _preferredImageUrl =>
      _preferUploadedWebpImageUrl(_originalImageUrl);
  bool get _canFallbackToOriginal =>
      _preferredImageUrl.isNotEmpty && _preferredImageUrl != _originalImageUrl;

  void _markImageLoaded(String imageUrl) {
    SessionImageCache.markLoaded(imageUrl);
  }

  @override
  void didUpdateWidget(covariant _ProductDetailsNetworkImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl && _usesOriginalUrlFallback) {
      _usesOriginalUrlFallback = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeImageUrl = _usesOriginalUrlFallback
        ? _originalImageUrl
        : _preferredImageUrl;
    if (activeImageUrl.isEmpty) {
      return widget.errorFallback ?? const SizedBox.shrink();
    }

    final image = Image.network(
      activeImageUrl,
      fit: widget.fit,
      errorBuilder: (context, error, stackTrace) {
        if (!_usesOriginalUrlFallback && _canFallbackToOriginal) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _usesOriginalUrlFallback = true;
              });
            }
          });

          return widget.loadingFallback ??
              widget.errorFallback ??
              const SizedBox.shrink();
        }

        return widget.errorFallback ?? const SizedBox.shrink();
      },
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) {
          _markImageLoaded(activeImageUrl);
          return child;
        }

        if (SessionImageCache.wasLoaded(activeImageUrl)) {
          return child;
        }

        return widget.loadingFallback ?? child;
      },
    );

    return ColoredBox(color: Colors.white, child: image);
  }
}

class _ProductDetailsHeroVideo extends StatefulWidget {
  const _ProductDetailsHeroVideo({
    required this.videoUrl,
    this.thumbnailUrl = '',
    required this.primaryColor,
    required this.onTap,
  });

  final String videoUrl;
  final String thumbnailUrl;
  final Color primaryColor;
  final VoidCallback onTap;

  @override
  State<_ProductDetailsHeroVideo> createState() =>
      _ProductDetailsHeroVideoState();
}

class _ProductDetailsHeroVideoState extends State<_ProductDetailsHeroVideo> {
  VideoPlayerController? _controller;
  bool _isInitializing = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    if (widget.thumbnailUrl.trim().isNotEmpty) {
      _isInitializing = false;
      return;
    }

    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      final controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.videoUrl),
      );
      _controller = controller;
      await controller.initialize();
      await controller.setLooping(false);
      await controller.setVolume(0);
      await controller.pause();
      await controller.seekTo(const Duration(milliseconds: 10));
      await controller.pause();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _isInitializing = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isInitializing = false;
        _hasError = true;
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Widget _buildThumbnailLayer() {
    final thumbnailUrl = widget.thumbnailUrl.trim();
    if (thumbnailUrl.isEmpty) {
      return const SizedBox.expand();
    }

    return Positioned.fill(
      child: _ProductDetailsNetworkImage(
        imageUrl: thumbnailUrl,
        fit: BoxFit.cover,
        errorFallback: const SizedBox.expand(),
        loadingFallback: const SizedBox.expand(),
      ),
    );
  }

  Widget _buildPlayOverlay() {
    return Center(
      child: Container(
        width: 68,
        height: 68,
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.24),
          shape: BoxShape.circle,
        ),
        child: const Icon(
          Icons.play_arrow_rounded,
          size: 38,
          color: Colors.white,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.thumbnailUrl.trim().isNotEmpty) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [_buildThumbnailLayer(), _buildPlayOverlay()],
        ),
      );
    }

    if (_isInitializing) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildThumbnailLayer(),
            Center(
              child: BouncingDotsLoader(
                activeColor: widget.primaryColor,
                inactiveColor: widget.primaryColor.withOpacity(0.24),
              ),
            ),
          ],
        ),
      );
    }

    final controller = _controller;
    if (_hasError || controller == null || !controller.value.isInitialized) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap,
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildThumbnailLayer(),
            Center(
              child: Icon(
                Icons.videocam_off_rounded,
                size: 54,
                color: Colors.white.withOpacity(0.92),
              ),
            ),
          ],
        ),
      );
    }

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          _buildThumbnailLayer(),
          ClipRect(
            child: FittedBox(
              fit: BoxFit.cover,
              clipBehavior: Clip.hardEdge,
              child: SizedBox(
                width: controller.value.size.width,
                height: controller.value.size.height,
                child: RepaintBoundary(child: VideoPlayer(controller)),
              ),
            ),
          ),
          _buildPlayOverlay(),
        ],
      ),
    );
  }
}

class _ProductDetailsFullscreenVideoPlayer extends StatefulWidget {
  const _ProductDetailsFullscreenVideoPlayer({
    required this.videoUrl,
    this.thumbnailUrl = '',
    required this.primaryColor,
  });

  final String videoUrl;
  final String thumbnailUrl;
  final Color primaryColor;

  @override
  State<_ProductDetailsFullscreenVideoPlayer> createState() =>
      _ProductDetailsFullscreenVideoPlayerState();
}

class _ProductDetailsFullscreenVideoPlayerState
    extends State<_ProductDetailsFullscreenVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isInitializing = true;
  String? _errorText;

  String _formatVideoDuration(Duration duration) {
    if (duration.inHours > 0) {
      final hours = duration.inHours;
      final minutes = duration.inMinutes
          .remainder(60)
          .toString()
          .padLeft(2, '0');
      final seconds = duration.inSeconds
          .remainder(60)
          .toString()
          .padLeft(2, '0');
      return '$hours:$minutes:$seconds';
    }

    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      final controller = VideoPlayerController.networkUrl(
        Uri.parse(widget.videoUrl),
      );
      _controller = controller;
      await controller.initialize();
      await controller.setLooping(false);
      await controller.pause();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _isInitializing = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isInitializing = false;
        _errorText = 'Unable to play this product video.';
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _togglePlayback() {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return;
    }

    if (controller.value.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }

    setState(() {});
  }

  Widget _buildThumbnail({
    BoxFit fit = BoxFit.contain,
    BorderRadius? borderRadius,
  }) {
    final thumbnailUrl = widget.thumbnailUrl.trim();
    if (thumbnailUrl.isEmpty) {
      return const SizedBox.shrink();
    }

    Widget thumbnail = _ProductDetailsNetworkImage(
      imageUrl: thumbnailUrl,
      fit: fit,
      errorFallback: const SizedBox.shrink(),
      loadingFallback: const SizedBox.shrink(),
    );

    if (borderRadius != null) {
      thumbnail = ClipRRect(borderRadius: borderRadius, child: thumbnail);
    }

    return thumbnail;
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;

    if (_isInitializing) {
      return ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: ClipRRect(
            borderRadius: const BorderRadius.all(Radius.circular(22)),
            child: Stack(
              fit: StackFit.expand,
              alignment: Alignment.center,
              children: [
                ColoredBox(
                  color: Colors.black,
                  child: _buildThumbnail(fit: BoxFit.cover),
                ),
                const Center(child: CircularProgressIndicator()),
              ],
            ),
          ),
        ),
      );
    }

    if (controller == null || !controller.value.isInitialized) {
      return ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: ClipRRect(
            borderRadius: const BorderRadius.all(Radius.circular(22)),
            child: Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(
                  color: Colors.black.withOpacity(0.78),
                  child: _buildThumbnail(fit: BoxFit.cover),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withOpacity(0.16),
                        Colors.black.withOpacity(0.62),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 22,
                    vertical: 24,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.videocam_off_rounded,
                        color: Colors.white.withOpacity(0.92),
                        size: 52,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _errorText ?? 'Unable to play this product video.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
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

    final aspectRatio = controller.value.aspectRatio > 0
        ? controller.value.aspectRatio
        : 16 / 9;

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 900),
      child: AspectRatio(
        aspectRatio: aspectRatio,
        child: ClipRRect(
          borderRadius: const BorderRadius.all(Radius.circular(22)),
          child: Stack(
            fit: StackFit.expand,
            children: [
              ColoredBox(
                color: Colors.black,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _buildThumbnail(fit: BoxFit.contain),
                    FittedBox(
                      fit: BoxFit.contain,
                      child: SizedBox(
                        width: controller.value.size.width,
                        height: controller.value.size.height,
                        child: RepaintBoundary(child: VideoPlayer(controller)),
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: ValueListenableBuilder<VideoPlayerValue>(
                  valueListenable: controller,
                  builder: (context, value, child) {
                    final currentPosition = value.position > value.duration
                        ? value.duration
                        : value.position;
                    final positionLabel = _formatVideoDuration(currentPosition);
                    final durationLabel = _formatVideoDuration(value.duration);

                    return Container(
                      padding: const EdgeInsets.fromLTRB(8, 8, 10, 8),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.52),
                        borderRadius: const BorderRadius.all(
                          Radius.circular(20),
                        ),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: _togglePlayback,
                            iconSize: 28,
                            splashRadius: 22,
                            color: Colors.white,
                            icon: Icon(
                              value.isPlaying
                                  ? Icons.pause_circle_filled_rounded
                                  : Icons.play_circle_fill_rounded,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: ClipRRect(
                              borderRadius: const BorderRadius.all(
                                Radius.circular(999),
                              ),
                              child: SizedBox(
                                height: 6,
                                child: VideoProgressIndicator(
                                  controller,
                                  allowScrubbing: true,
                                  padding: EdgeInsets.zero,
                                  colors: VideoProgressColors(
                                    playedColor: widget.primaryColor,
                                    bufferedColor: Colors.white.withOpacity(
                                      0.3,
                                    ),
                                    backgroundColor: Colors.white.withOpacity(
                                      0.18,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            '$positionLabel / $durationLabel',
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductDetailsFooterBar extends StatefulWidget {
  const _ProductDetailsFooterBar({
    required this.productId,
    required this.platformId,
    required this.variantId,
    required this.primaryColor,
    required this.secondaryColor,
    required this.isGuestMode,
    required this.isOwnListing,
    required this.purchaseActionsEnabled,
    required this.listingInsightBusy,
    required this.onChatTap,
    required this.onAddToCartTap,
    required this.onBuyTap,
    required this.onListingInsightTap,
    required this.onFlashDealChanged,
  });

  final String productId;
  final String platformId;
  final String variantId;
  final ValueChanged<BuyerFlashDeal?> onFlashDealChanged;
  final Color primaryColor;
  final Color secondaryColor;
  final bool isGuestMode;
  final bool isOwnListing;
  final bool purchaseActionsEnabled;
  final bool listingInsightBusy;
  final VoidCallback onChatTap;
  final VoidCallback onAddToCartTap;
  final VoidCallback onBuyTap;
  final VoidCallback onListingInsightTap;

  @override
  State<_ProductDetailsFooterBar> createState() =>
      _ProductDetailsFooterBarState();
}

class _ProductDetailsFooterBarState extends State<_ProductDetailsFooterBar> {
  BuyerFlashDeal? _flashDeal;
  Timer? _countdownTimer;
  Duration _serverClockOffset = Duration.zero;
  int _requestGeneration = 0;
  BuyerFlashDeal? _reportedDeal;

  DateTime get _now => DateTime.now().add(_serverClockOffset);

  /// Reports the deal to the page only while it is live, so the listing
  /// price switches when an upcoming deal starts and reverts when it ends.
  void _reportLiveDeal() {
    final deal = _flashDeal;
    final now = _now;
    final live =
        deal != null && !now.isBefore(deal.startsAt) && deal.endsAt.isAfter(now)
        ? deal
        : null;
    if (identical(live, _reportedDeal)) return;
    _reportedDeal = live;
    widget.onFlashDealChanged(live);
  }

  @override
  void initState() {
    super.initState();
    unawaited(_loadFlashDeal());
  }

  @override
  void didUpdateWidget(covariant _ProductDetailsFooterBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.productId != oldWidget.productId ||
        widget.platformId != oldWidget.platformId ||
        widget.variantId != oldWidget.variantId) {
      unawaited(_loadFlashDeal());
    }
  }

  Future<void> _loadFlashDeal() async {
    final generation = ++_requestGeneration;
    try {
      final deal = await productFlashDealCountdown(
        productId: widget.productId,
        platformId: widget.platformId,
        variantId: widget.variantId,
      );
      if (!mounted || generation != _requestGeneration) return;

      _countdownTimer?.cancel();
      _serverClockOffset = deal?.serverNow == null
          ? Duration.zero
          : deal!.serverNow!.difference(DateTime.now());
      setState(() {
        _flashDeal = deal != null && deal.endsAt.isAfter(_now) ? deal : null;
      });
      _reportLiveDeal();
      if (_flashDeal != null) {
        _countdownTimer = Timer.periodic(
          const Duration(seconds: 1),
          _handleCountdownTick,
        );
      }
    } catch (_) {
      if (!mounted || generation != _requestGeneration) return;
      _countdownTimer?.cancel();
      setState(() => _flashDeal = null);
      _reportLiveDeal();
    }
  }

  void _handleCountdownTick(Timer timer) {
    final deal = _flashDeal;
    if (!mounted || deal == null) {
      timer.cancel();
      return;
    }
    if (!deal.endsAt.isAfter(_now)) {
      timer.cancel();
      setState(() => _flashDeal = null);
      _reportLiveDeal();
      unawaited(_loadFlashDeal());
      return;
    }
    setState(() {});
    _reportLiveDeal();
  }

  @override
  void dispose() {
    _requestGeneration += 1;
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomPadding = MediaQuery.paddingOf(context).bottom;
    final flashDeal = _flashDeal;
    final hasFlashDeal = flashDeal != null && flashDeal.endsAt.isAfter(_now);
    final actionsHeight = bottomPadding + 64.0;
    final resolvedHeight =
        actionsHeight +
        (hasFlashDeal ? _ProductFooterFlashDealCountdown.height : 0);
    final onPrimary = theme.colorScheme.onPrimary;
    final purchaseEnabled =
        widget.purchaseActionsEnabled && !widget.listingInsightBusy;
    final purchaseDimmed = !purchaseEnabled || widget.isGuestMode;
    final buyBackgroundColor = widget.isOwnListing
        ? widget.primaryColor
        : widget.isGuestMode
        ? Colors.white.withOpacity(0.16)
        : widget.primaryColor;
    final buyForegroundColor = widget.isOwnListing || !widget.isGuestMode
        ? onPrimary
        : Colors.white.withOpacity(0.6);

    return SizedBox(
      height: resolvedHeight,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hasFlashDeal)
            _ProductFooterFlashDealCountdown(deal: flashDeal, now: _now),
          Expanded(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: _productDetailsSurfaceColor(context),
              ),
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, bottomPadding),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: 48,
                        child: Row(
                          children: [
                            if (!widget.isOwnListing) ...[
                              _ProductFooterCircleAction(
                                svg: _kProductDetailsChatSvg,
                                tooltip: 'Message',
                                iconColor: purchaseDimmed
                                    ? widget.secondaryColor.withOpacity(0.5)
                                    : theme.colorScheme.onSurface,
                                onTap: purchaseEnabled
                                    ? widget.onChatTap
                                    : null,
                              ),
                              const SizedBox(width: 10),
                              _ProductFooterCircleAction(
                                svg: _kProductDetailsCartPlusSvg,
                                tooltip: 'Add to Cart',
                                iconColor: purchaseDimmed
                                    ? widget.secondaryColor.withOpacity(0.5)
                                    : theme.colorScheme.onSurface,
                                onTap: purchaseEnabled
                                    ? widget.onAddToCartTap
                                    : null,
                              ),
                              const SizedBox(width: 10),
                            ],
                            Expanded(
                              child: _ProductFooterStadiumButton(
                                backgroundColor: buyBackgroundColor,
                                foregroundColor: buyForegroundColor,
                                icon: widget.isOwnListing
                                    ? Icons.insights_rounded
                                    : Icons.shopping_bag_outlined,
                                label: widget.isOwnListing
                                    ? 'Listing Insight'
                                    : 'Buy',
                                busy: widget.listingInsightBusy,
                                onTap: !purchaseEnabled
                                    ? null
                                    : widget.isOwnListing
                                    ? widget.onListingInsightTap
                                    : widget.onBuyTap,
                              ),
                            ),
                          ],
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

class _ProductFooterFlashDealCountdown extends StatelessWidget {
  const _ProductFooterFlashDealCountdown({
    required this.deal,
    required this.now,
  });

  static const double height = 40;

  final BuyerFlashDeal deal;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final isUpcoming = now.isBefore(deal.startsAt);
    final target = isUpcoming ? deal.startsAt : deal.endsAt;
    final campaignName = deal.campaignName.trim();
    final promotionName = campaignName.isNotEmpty ? campaignName : 'Flash Deal';
    final remaining = target.difference(now);
    final seconds = remaining.isNegative ? 0 : remaining.inSeconds;
    final days = seconds ~/ Duration.secondsPerDay;
    String twoDigits(int value) => value.toString().padLeft(2, '0');

    return Container(
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 18),
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.vertical(top: Radius.circular(height / 2)),
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFFE6005C), Color(0xFFFF2D72), Color(0xFFFF6B9A)],
          stops: [0.0, 0.45, 1.0],
        ),
      ),
      child: Row(
        children: [
          Flexible(
            child: Text(
              isUpcoming ? '$promotionName starts in' : promotionName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
          ),
          const SizedBox(width: 4),
          SvgPicture.string(
            _kLucideZapSvg,
            width: 16,
            height: 16,
            colorFilter: const ColorFilter.mode(
              Color(0xFFFFD43B),
              BlendMode.srcIn,
            ),
          ),
          const Spacer(),
          const _RingingAlarmIcon(),
          const SizedBox(width: 6),
          if (days > 0) ...[
            _FlipClockTile(value: twoDigits(days)),
            const _FlipClockSeparator(),
          ],
          _FlipClockTile(value: twoDigits((seconds ~/ 3600) % 24)),
          const _FlipClockSeparator(),
          _FlipClockTile(value: twoDigits((seconds ~/ 60) % 60)),
          if (days == 0) ...[
            const _FlipClockSeparator(),
            _FlipClockTile(value: twoDigits(seconds % 60)),
          ],
        ],
      ),
    );
  }
}

class _RingingAlarmIcon extends StatefulWidget {
  const _RingingAlarmIcon();

  @override
  State<_RingingAlarmIcon> createState() => _RingingAlarmIconState();
}

class _RingingAlarmIconState extends State<_RingingAlarmIcon>
    with SingleTickerProviderStateMixin {
  static const Duration _rest = Duration(milliseconds: 1200);
  static const int _wobbles = 6;
  static const double _maxAngle = 0.32;
  static const double _size = 17;

  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 650),
  );
  Timer? _restTimer;

  @override
  void initState() {
    super.initState();
    _controller.addStatusListener(_handleStatus);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncPlayback();
  }

  bool get _animationsDisabled => MediaQuery.disableAnimationsOf(context);

  void _syncPlayback() {
    if (_animationsDisabled) {
      _restTimer?.cancel();
      _restTimer = null;
      _controller.stop();
      _controller.value = 0;
    } else if (!_controller.isAnimating && _restTimer == null) {
      _ring();
    }
  }

  void _ring() {
    _restTimer = null;
    if (!mounted || _animationsDisabled) {
      return;
    }
    _controller.forward(from: 0);
  }

  void _handleStatus(AnimationStatus status) {
    if (status != AnimationStatus.completed) {
      return;
    }
    _controller.value = 0;
    _restTimer?.cancel();
    _restTimer = Timer(_rest, _ring);
  }

  @override
  void dispose() {
    _restTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final p = _controller.value;
        final envelope = math.sin(p * math.pi);
        final angle =
            math.sin(p * _wobbles * 2 * math.pi) * _maxAngle * envelope;
        return Transform.rotate(
          angle: angle,
          alignment: const Alignment(0, 1 / 12),
          child: Transform.scale(scale: 1 + 0.1 * envelope, child: child),
        );
      },
      child: SvgPicture.string(
        _kLucideAlarmClockSvg,
        width: _size,
        height: _size,
        colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
      ),
    );
  }
}

const String _kLucideZapSvg =
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 '
    '6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46'
    'l1.92-6.02A1 1 0 0 0 11 14z"/>'
    '</svg>';

const String _kLucideAlarmClockSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
    '<circle cx="12" cy="13" r="8"/>'
    '<path d="M12 9v4l2 2"/>'
    '<path d="M5 3 2 6"/>'
    '<path d="m22 6-3-3"/>'
    '<path d="M6.38 18.7 4 21"/>'
    '<path d="M17.64 18.67 20 21"/>'
    '</svg>';

class _FlipClockSeparator extends StatelessWidget {
  const _FlipClockSeparator();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: Text(
        ':',
        style: GoogleFonts.roboto(
          color: _FlipClockTileState._tileDark,
          fontSize: 15,
          fontWeight: FontWeight.w800,
          height: 1,
        ),
      ),
    );
  }
}

/// Split-flap digit tile matching the web Flash Deal clock: on change the old
/// top half falls away and the new bottom half lands.
class _FlipClockTile extends StatefulWidget {
  const _FlipClockTile({required this.value});

  final String value;

  @override
  State<_FlipClockTile> createState() => _FlipClockTileState();
}

class _FlipClockTileState extends State<_FlipClockTile>
    with SingleTickerProviderStateMixin {
  static const double _height = 24;
  static const double _radius = 6;
  static const double _quarterTurn = 1.5707963267948966;
  static const Color _tileDark = Color(0xFF7A0030);

  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 450),
  );
  late String _current = widget.value;
  late String _previous = widget.value;

  @override
  void didUpdateWidget(covariant _FlipClockTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value == _current) {
      return;
    }
    _previous = _current;
    _current = widget.value;
    if (MediaQuery.disableAnimationsOf(context)) {
      _previous = _current;
      _controller.value = 1;
      return;
    }
    _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _width => _current.length > 2 ? 10.0 * _current.length + 6 : 27;

  Widget _face(String text) {
    return Container(
      width: _width,
      height: _height,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.all(Radius.circular(_radius)),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF94003B), _tileDark],
        ),
      ),
      child: Text(
        text,
        maxLines: 1,
        style: GoogleFonts.roboto(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w700,
          letterSpacing: 0,
          height: 1,
        ),
      ),
    );
  }

  Widget _half(String text, {required bool top, double shade = 0}) {
    return ClipRect(
      child: Align(
        alignment: top ? Alignment.topCenter : Alignment.bottomCenter,
        heightFactor: 0.5,
        child: Stack(
          children: [
            _face(text),
            if (shade > 0)
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.all(
                      Radius.circular(_radius),
                    ),
                    color: Colors.black.withValues(alpha: shade),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Matrix4 _flapTransform(double angle) => Matrix4.identity()
    ..setEntry(3, 2, 0.006)
    ..rotateX(angle);

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.all(Radius.circular(_radius)),
        boxShadow: [
          BoxShadow(
            color: Color(0x33800030),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          if (!_controller.isAnimating) {
            return _face(_current);
          }

          final t = _controller.value;
          final fall = Curves.easeIn.transform((t / 0.45).clamp(0.0, 1.0));
          final land = Curves.easeOut.transform(
            ((t - 0.4) / 0.6).clamp(0.0, 1.0),
          );

          return SizedBox(
            width: _width,
            height: _height,
            child: Stack(
              children: [
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: _half(_current, top: true),
                ),
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: _half(land < 1 ? _previous : _current, top: false),
                ),
                if (fall < 1)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: Transform(
                      alignment: Alignment.bottomCenter,
                      transform: _flapTransform(-_quarterTurn * fall),
                      child: _half(_previous, top: true, shade: 0.3 * fall),
                    ),
                  ),
                if (land > 0)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Transform(
                      alignment: Alignment.topCenter,
                      transform: _flapTransform(_quarterTurn * (1 - land)),
                      child: _half(
                        _current,
                        top: false,
                        shade: 0.3 * (1 - land),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ProductFooterCircleAction extends StatelessWidget {
  const _ProductFooterCircleAction({
    required this.svg,
    required this.tooltip,
    required this.iconColor,
    required this.onTap,
  });

  final String svg;
  final String tooltip;
  final Color iconColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: 48,
      height: 48,
      child: Tooltip(
        message: tooltip,
        child: OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            padding: EdgeInsets.zero,
            shape: const CircleBorder(),
            side: BorderSide(
              color: theme.colorScheme.onSurface.withOpacity(0.18),
            ),
            foregroundColor: iconColor,
            backgroundColor: Colors.transparent,
          ),
          child: _ProductDetailsLucideIcon(
            svg: svg,
            size: 21,
            color: iconColor,
          ),
        ),
      ),
    );
  }
}

class _ProductFooterStadiumButton extends StatelessWidget {
  const _ProductFooterStadiumButton({
    required this.backgroundColor,
    required this.foregroundColor,
    required this.icon,
    required this.label,
    required this.busy,
    required this.onTap,
  });

  final Color backgroundColor;
  final Color foregroundColor;
  final IconData icon;
  final String label;
  final bool busy;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isEnabled = onTap != null;
    final resolvedBackground = isEnabled
        ? backgroundColor
        : Colors.white.withOpacity(0.16);
    final resolvedForeground = isEnabled
        ? foregroundColor
        : Colors.white.withOpacity(0.6);

    return Material(
      color: resolvedBackground,
      shape: const StadiumBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 18),
          alignment: Alignment.center,
          child: busy
              ? SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: resolvedForeground,
                  ),
                )
              : FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon, size: 20, color: resolvedForeground),
                      const SizedBox(width: 6),
                      Text(
                        label,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: resolvedForeground,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}

class _ProductDetailsScrollEndIndicator extends StatefulWidget {
  const _ProductDetailsScrollEndIndicator({
    required this.scrollController,
    required this.overscrollSignal,
    required this.primaryColor,
    required this.secondaryColor,
  });

  final ScrollController scrollController;
  final int overscrollSignal;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  State<_ProductDetailsScrollEndIndicator> createState() =>
      _ProductDetailsScrollEndIndicatorState();
}

class _ProductDetailsScrollEndIndicatorState
    extends State<_ProductDetailsScrollEndIndicator> {
  Timer? _noMoreProductsTimer;
  bool _showNoMoreProducts = false;

  @override
  void didUpdateWidget(covariant _ProductDetailsScrollEndIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.overscrollSignal != oldWidget.overscrollSignal) {
      _noMoreProductsTimer?.cancel();
      setState(() {
        _showNoMoreProducts = false;
      });
      _noMoreProductsTimer = Timer(const Duration(milliseconds: 650), () {
        if (!mounted) {
          return;
        }

        setState(() {
          _showNoMoreProducts = true;
        });
      });
    }
  }

  @override
  void dispose() {
    _noMoreProductsTimer?.cancel();
    super.dispose();
  }

  void _resetIfScrolledAwayFromBottom() {
    if (!_showNoMoreProducts && _noMoreProductsTimer == null) {
      return;
    }

    _noMoreProductsTimer?.cancel();
    _noMoreProductsTimer = null;
    if (mounted) {
      setState(() {
        _showNoMoreProducts = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.scrollController,
      builder: (context, child) {
        if (!widget.scrollController.hasClients) {
          return const SizedBox.shrink();
        }

        final position = widget.scrollController.position;
        final remainingDistance = (position.maxScrollExtent - position.pixels)
            .clamp(0.0, double.infinity);
        final isNearBottom = remainingDistance <= 20;

        if (!isNearBottom) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              _resetIfScrolledAwayFromBottom();
            }
          });
        }

        return Center(
          child: RepaintBoundary(
            child: AnimatedSwitcher(
              duration: appMotionFrames(13),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeOutCubic,
              child: _showNoMoreProducts && isNearBottom
                  ? ConstrainedBox(
                      key: const ValueKey('no-more-products'),
                      constraints: const BoxConstraints(maxWidth: 280),
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              height: 1,
                              color: widget.secondaryColor.withOpacity(0.22),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            'No more products',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: widget.secondaryColor,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Container(
                              height: 1,
                              color: widget.secondaryColor.withOpacity(0.22),
                            ),
                          ),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(key: ValueKey('no-bottom-status')),
            ),
          ),
        );
      },
    );
  }
}

class _ProductDetailsHeroFallback extends StatelessWidget {
  const _ProductDetailsHeroFallback({
    required this.primaryColor,
    required this.initial,
  });

  final Color primaryColor;
  final String initial;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor.withOpacity(0.22),
            primaryColor.withOpacity(0.08),
          ],
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: Theme.of(context).textTheme.displayMedium?.copyWith(
            color: primaryColor,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _ProductDetailChipData {
  const _ProductDetailChipData({
    required this.label,
    required this.color,
    this.leading,
    this.backgroundColor,
    this.labelColor,
    this.padding,
    this.borderRadius,
    this.labelStyle,
  });

  final Widget? leading;
  final String label;
  final Color color;
  final Color? backgroundColor;
  final Color? labelColor;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  final TextStyle? labelStyle;

  int get compactFlex {
    final labelWeight = label.trim().length.clamp(6, 18);
    final iconWeight = leading == null ? 0 : 4;
    return (labelWeight + iconWeight).clamp(8, 22);
  }
}

class _ProductDetailChip extends StatelessWidget {
  const _ProductDetailChip({
    required this.label,
    required this.color,
    this.leading,
    this.backgroundColor,
    this.labelColor,
    this.padding,
    this.borderRadius,
    this.labelStyle,
    this.compactWhenTight = false,
    this.fillWidth = false,
  });

  factory _ProductDetailChip.fromData(
    _ProductDetailChipData chipData, {
    bool compactWhenTight = false,
    bool fillWidth = false,
  }) {
    return _ProductDetailChip(
      leading: chipData.leading,
      label: chipData.label,
      color: chipData.color,
      backgroundColor: chipData.backgroundColor,
      labelColor: chipData.labelColor,
      padding: chipData.padding,
      borderRadius: chipData.borderRadius,
      labelStyle: chipData.labelStyle,
      compactWhenTight: compactWhenTight,
      fillWidth: fillWidth,
    );
  }

  final Widget? leading;
  final String label;
  final Color color;
  final Color? backgroundColor;
  final Color? labelColor;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  final TextStyle? labelStyle;
  final bool compactWhenTight;
  final bool fillWidth;

  @override
  Widget build(BuildContext context) {
    final resolvedBackgroundColor = backgroundColor ?? color.withOpacity(0.1);
    final resolvedLabelColor = labelColor ?? color;
    final resolvedLabelStyle =
        (Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: resolvedLabelColor,
                  fontWeight: FontWeight.w700,
                ) ??
                TextStyle(
                  color: resolvedLabelColor,
                  fontWeight: FontWeight.w700,
                ))
            .merge(labelStyle)
            .copyWith(color: resolvedLabelColor);
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (leading case final leading?) ...[leading, const SizedBox(width: 6)],
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: resolvedLabelStyle,
        ),
      ],
    );

    return Container(
      width: fillWidth ? double.infinity : null,
      padding:
          padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: resolvedBackgroundColor,
        borderRadius:
            borderRadius ?? const BorderRadius.all(Radius.circular(8)),
      ),
      child: compactWhenTight
          ? Align(
              alignment: Alignment.centerLeft,
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: content,
              ),
            )
          : content,
    );
  }
}

class _ProductRatingStars extends StatelessWidget {
  const _ProductRatingStars({
    required this.rating,
    this.starCount = 5,
    this.size = 14.0,
    this.spacing = 2.0,
    this.filledColor = const Color(0xFFF9A825),
    this.emptyColor = const Color(0xFFE0E0E0),
  });

  final double rating;
  final int starCount;
  final double size;
  final double spacing;
  final Color filledColor;
  final Color emptyColor;

  @override
  Widget build(BuildContext context) {
    final normalizedRating = rating.clamp(0.0, starCount.toDouble()).toDouble();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List<Widget>.generate(starCount, (index) {
        final fillFraction = (normalizedRating - index)
            .clamp(0.0, 1.0)
            .toDouble();

        return Padding(
          padding: EdgeInsets.only(right: index == starCount - 1 ? 0 : spacing),
          child: _ProductRatingStar(
            fillFraction: fillFraction,
            size: size,
            filledColor: filledColor,
            emptyColor: emptyColor,
          ),
        );
      }),
    );
  }
}

class _ProductRatingStar extends StatelessWidget {
  const _ProductRatingStar({
    required this.fillFraction,
    required this.size,
    required this.filledColor,
    required this.emptyColor,
  });

  final double fillFraction;
  final double size;
  final Color filledColor;
  final Color emptyColor;

  @override
  Widget build(BuildContext context) {
    if (fillFraction <= 0) {
      return _ProductDetailsLucideIcon(
        svg: _kLucideStarSvg,
        size: size,
        color: emptyColor,
      );
    }

    if (fillFraction >= 1) {
      return _ProductDetailsLucideIcon(
        svg: _kLucideStarSvg,
        size: size,
        color: filledColor,
      );
    }

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          _ProductDetailsLucideIcon(
            svg: _kLucideStarSvg,
            size: size,
            color: emptyColor,
          ),
          ClipRect(
            child: Align(
              alignment: Alignment.centerLeft,
              widthFactor: fillFraction,
              child: _ProductDetailsLucideIcon(
                svg: _kLucideStarSvg,
                size: size,
                color: filledColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductCustomerReview {
  const _ProductCustomerReview({
    required this.reviewer,
    required this.title,
    required this.message,
    required this.rating,
    required this.media,
    this.id = '',
    this.sellerReply,
    this.createdAt,
  });

  final String id;
  final String reviewer;
  final String title;
  final String message;
  final double rating;
  final List<ProductReviewMedia> media;
  final ProductReviewSellerReply? sellerReply;
  final DateTime? createdAt;

  bool get hasExpandedContent =>
      media.isNotEmpty ||
      (sellerReply?.message.trim().isNotEmpty ?? false) ||
      message.trim().length > 120;
}

double _customerReviewsToRelatedProductsSpacing(
  List<_ProductCustomerReview> reviews,
) {
  if (reviews.length > 1) {
    return 16;
  }

  if (reviews.isEmpty) {
    return 12;
  }

  return reviews.first.hasExpandedContent ? 12 : 6;
}

class _ProductDetailSection extends StatelessWidget {
  const _ProductDetailSection({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _homeProductCardSurfaceColor(theme),
        borderRadius: const BorderRadius.all(Radius.circular(22)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// Shows only the newest reviews; older ones live behind "View all".
class _LatestCustomerReviews extends StatelessWidget {
  const _LatestCustomerReviews({
    required this.reviews,
    required this.titleColor,
    required this.secondaryColor,
    required this.sellerCompanyName,
    required this.onMediaTap,
  });

  static const int _maxVisibleReviews = 2;

  final List<_ProductCustomerReview> reviews;
  final Color titleColor;
  final Color secondaryColor;
  final String sellerCompanyName;
  final void Function(_ProductCustomerReview review, int mediaIndex) onMediaTap;

  @override
  Widget build(BuildContext context) {
    final latestReviews = reviews.take(_maxVisibleReviews).toList();
    if (latestReviews.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < latestReviews.length; index += 1) ...[
          if (index > 0)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Divider(
                height: 1,
                thickness: 1,
                color: secondaryColor.withOpacity(0.14),
              ),
            ),
          _CustomerReviewCard(
            review: latestReviews[index],
            titleColor: titleColor,
            secondaryColor: secondaryColor,
            sellerCompanyName: sellerCompanyName,
            onMediaTap: (mediaIndex) =>
                onMediaTap(latestReviews[index], mediaIndex),
          ),
        ],
      ],
    );
  }
}

class _CustomerReviewCard extends StatelessWidget {
  const _CustomerReviewCard({
    required this.review,
    required this.titleColor,
    required this.secondaryColor,
    required this.sellerCompanyName,
    required this.onMediaTap,
  });

  final _ProductCustomerReview review;
  final Color titleColor;
  final Color secondaryColor;
  final String sellerCompanyName;
  final ValueChanged<int> onMediaTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final reviewerInitial = review.reviewer.trim().isEmpty
        ? '?'
        : review.reviewer.trim().characters.first.toUpperCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: titleColor.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                reviewerInitial,
                style: theme.textTheme.titleSmall?.copyWith(
                  color: titleColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    review.reviewer,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: titleColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  _ProductRatingStars(
                    rating: review.rating,
                    size: 14,
                    spacing: 2,
                    emptyColor: secondaryColor.withOpacity(0.22),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (review.message.trim().isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(
            review.message,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: secondaryColor,
              height: 1.15,
            ),
          ),
        ],
        if (review.media.isNotEmpty) ...[
          const SizedBox(height: 10),
          CustomerReviewMediaStrip(
            media: review.media,
            tileSize: 76,
            onMediaTap: onMediaTap,
          ),
        ],
        if (review.sellerReply != null) ...[
          const SizedBox(height: 12),
          CustomerReviewSellerReplyBlock(
            reply: review.sellerReply!,
            fallbackCompanyName: sellerCompanyName,
          ),
        ],
      ],
    );
  }
}

/// Two-column staggered grid of home "For You" cards, balanced like the feed.
class _RelatedProductsMasonry extends StatelessWidget {
  const _RelatedProductsMasonry({
    required this.products,
    required this.topSellerIds,
    required this.platformId,
  });

  final List<Product> products;
  final Set<String> topSellerIds;
  final String platformId;

  @override
  Widget build(BuildContext context) {
    const spacing = 12.0;
    final columns = [<Product>[], <Product>[]];
    final columnWeights = [0.0, 0.0];
    for (final product in products) {
      final target = columnWeights[0] <= columnWeights[1] ? 0 : 1;
      columns[target].add(product);
      columnWeights[target] += HomeFeedProductCard.estimatedHeightWeight(
        product,
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (
          var columnIndex = 0;
          columnIndex < columns.length;
          columnIndex++
        ) ...[
          if (columnIndex > 0) const SizedBox(width: spacing),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (
                  var itemIndex = 0;
                  itemIndex < columns[columnIndex].length;
                  itemIndex++
                ) ...[
                  if (itemIndex > 0) const SizedBox(height: spacing),
                  HomeFeedProductCard(
                    key: ValueKey<String>(columns[columnIndex][itemIndex].id),
                    product: columns[columnIndex][itemIndex],
                    showTopSellerBadge: topSellerIds.contains(
                      columns[columnIndex][itemIndex].id,
                    ),
                    platformId: platformId,
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

Color _homeProductCardSurfaceColor(ThemeData theme) =>
    theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

class _ProductDetailPrice extends StatelessWidget {
  const _ProductDetailPrice({
    required this.amount,
    required this.color,
    required this.fontWeight,
    required this.fontSize,
    this.decoration,
  });

  final double amount;
  final Color color;
  final FontWeight fontWeight;
  final double fontSize;
  final TextDecoration? decoration;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(
      amount: amount,
      color: color,
      fontSize: fontSize,
      fontWeight: fontWeight,
      decoration: decoration,
      trimTrailingZeros: false,
    );
  }
}

int _measureTextLineCount(
  BuildContext context, {
  required String text,
  required TextStyle? style,
  required double maxWidth,
  int? maxLines,
}) {
  if (!maxWidth.isFinite || maxWidth <= 0) {
    return 1;
  }

  final mergedStyle = DefaultTextStyle.of(context).style.merge(style);
  final painter = TextPainter(
    text: TextSpan(text: text, style: mergedStyle),
    textDirection: Directionality.of(context),
    textScaler: MediaQuery.textScalerOf(context),
    maxLines: maxLines,
    ellipsis: maxLines == null ? null : '...',
  )..layout(maxWidth: maxWidth);

  final lineCount = painter.computeLineMetrics().length;
  if (lineCount < 1) {
    return 1;
  }

  if (maxLines == null) {
    return lineCount;
  }

  return lineCount.clamp(1, maxLines);
}

String _preferUploadedWebpImageUrl(String imageUrl) {
  final trimmedImageUrl = imageUrl.trim();
  if (trimmedImageUrl.isEmpty) {
    return '';
  }

  final parsedImageUrl = Uri.tryParse(trimmedImageUrl);
  if (parsedImageUrl == null) {
    return trimmedImageUrl;
  }

  final imagePath = parsedImageUrl.path;
  final normalizedImagePath = imagePath.toLowerCase();
  if (!normalizedImagePath.contains('/uploads/')) {
    return trimmedImageUrl;
  }

  final lastSlashIndex = imagePath.lastIndexOf('/');
  final lastDotIndex = imagePath.lastIndexOf('.');
  if (lastDotIndex <= lastSlashIndex) {
    return trimmedImageUrl;
  }

  final extension = normalizedImagePath.substring(lastDotIndex);
  if (extension == '.png') {
    return trimmedImageUrl;
  }

  const uploadImageExtensions = <String>{
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.tif',
    '.tiff',
    '.avif',
    '.heic',
    '.heif',
    '.jfif',
  };
  if (!uploadImageExtensions.contains(extension)) {
    return trimmedImageUrl;
  }

  return parsedImageUrl
      .replace(path: '${imagePath.substring(0, lastDotIndex)}.webp')
      .toString();
}

const double _kDetailsArcHeight = 26;
const double _kDetailsSheetRadius = 32;
const double _kDetailsGlassSeamAlpha = 0.62;

Color _detailsSkeletonBaseColor(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? const Color(0xFF2A2C33)
      : kSkeletonBaseColor;
}

class _ProductDetailsContentSkeleton extends StatelessWidget {
  const _ProductDetailsContentSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    final baseColor = _detailsSkeletonBaseColor(context);

    Widget box(double? width, double height, {double radius = 6}) {
      return SkeletonBox(
        width: width,
        height: height,
        borderRadius: radius,
        baseColor: baseColor,
      );
    }

    Widget variantBubble() {
      return Padding(
        padding: const EdgeInsets.only(right: 14),
        child: Column(
          children: [
            SkeletonCircle(size: 56, baseColor: baseColor),
            const SizedBox(height: 8),
            box(48, 10),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kProductContentSidePadding,
        0,
        kProductContentSidePadding,
        28,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              box(92, 34, radius: 999),
              const SizedBox(width: 6),
              box(78, 34, radius: 999),
              const Spacer(),
              SkeletonCircle(size: 30, baseColor: baseColor),
            ],
          ),
          const SizedBox(height: 14),
          box(double.infinity, 26, radius: 8),
          const SizedBox(height: 8),
          box(200, 26, radius: 8),
          const SizedBox(height: 16),
          Row(
            children: [
              box(150, 34, radius: 10),
              const SizedBox(width: 10),
              box(70, 16),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              box(64, 14),
              const SizedBox(width: 14),
              box(72, 14),
              const SizedBox(width: 14),
              box(56, 14),
              const SizedBox(width: 14),
              box(80, 14),
            ],
          ),
          const SizedBox(height: 22),
          box(90, 18),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const NeverScrollableScrollPhysics(),
            child: Row(children: List.generate(4, (_) => variantBubble())),
          ),
          const SizedBox(height: 32),
          box(160, 20),
          const SizedBox(height: 14),
          box(double.infinity, 12),
          const SizedBox(height: 8),
          box(double.infinity, 12),
          const SizedBox(height: 8),
          box(double.infinity, 12),
          const SizedBox(height: 8),
          box(180, 12),
          const SizedBox(height: 24),
          box(130, 20),
          const SizedBox(height: 12),
          box(double.infinity, 120, radius: 14),
          const SizedBox(height: 20),
          Row(
            children: [
              SkeletonCircle(size: 48, baseColor: baseColor),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    box(140, 15),
                    const SizedBox(height: 8),
                    box(110, 12),
                  ],
                ),
              ),
              box(72, 34, radius: 999),
            ],
          ),
          const SizedBox(height: 28),
          box(150, 20),
          const SizedBox(height: 14),
          const _RelatedProductsSkeleton(),
        ],
      ),
    );
  }
}

class _RelatedProductsSkeleton extends StatelessWidget {
  const _RelatedProductsSkeleton();

  @override
  Widget build(BuildContext context) {
    final baseColor = _detailsSkeletonBaseColor(context);

    Widget card() {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: SkeletonBox(
              width: double.infinity,
              height: double.infinity,
              borderRadius: 14,
              baseColor: baseColor,
            ),
          ),
          const SizedBox(height: 10),
          SkeletonBox(
            width: double.infinity,
            height: 13,
            borderRadius: 6,
            baseColor: baseColor,
          ),
          const SizedBox(height: 6),
          SkeletonBox(
            width: 90,
            height: 13,
            borderRadius: 6,
            baseColor: baseColor,
          ),
          const SizedBox(height: 10),
          SkeletonBox(
            width: 70,
            height: 18,
            borderRadius: 6,
            baseColor: baseColor,
          ),
        ],
      );
    }

    Widget column() {
      return Expanded(
        child: Column(children: [card(), const SizedBox(height: 16), card()]),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [column(), const SizedBox(width: 12), column()],
      ),
    );
  }
}

class _SellerChatListTile extends StatelessWidget {
  const _SellerChatListTile({
    required this.product,
    required this.stats,
    required this.isLoadingStats,
    required this.primaryColor,
    required this.secondaryColor,
    required this.onVisit,
  });

  final Product product;
  final SellerProfileStats? stats;
  final bool isLoadingStats;
  final Color primaryColor;
  final Color secondaryColor;
  final VoidCallback onVisit;

  static String _compactCount(int value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1).replaceAll('.0', '')}M';
    }
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1).replaceAll('.0', '')}K';
    }
    return '$value';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final companyName = product.companyName.trim();
    final rating = stats?.rating ?? 0;
    final followerCount = stats?.followerCount ?? 0;
    final metaStyle = theme.textTheme.bodySmall?.copyWith(
      color: secondaryColor,
      fontWeight: FontWeight.w600,
      height: 1.2,
    );

    return Material(
      color: _homeProductCardSurfaceColor(theme),
      borderRadius: const BorderRadius.all(Radius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onVisit,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              ProductCompanyAvatar(
                imageUrl: product.companyPictureUrl,
                fallbackColor: primaryColor,
                size: 48,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      companyName.isEmpty ? 'Company' : companyName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (isLoadingStats && stats == null)
                      SkeletonBox(
                        width: 120,
                        height: 12,
                        borderRadius: 6,
                        baseColor: _detailsSkeletonBaseColor(context),
                      )
                    else
                      Row(
                        children: [
                          _ProductDetailsLucideIcon(
                            svg: _kLucideStarSvg,
                            size: 15,
                            color: rating > 0
                                ? const Color(0xFFFFB800)
                                : theme.colorScheme.onSurface.withOpacity(0.22),
                          ),
                          const SizedBox(width: 3),
                          Text(
                            rating > 0 ? rating.toStringAsFixed(1) : 'New',
                            style: metaStyle,
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: Text('•', style: metaStyle),
                          ),
                          Flexible(
                            child: Text(
                              '${_compactCount(followerCount)} '
                              '${followerCount == 1 ? 'follower' : 'followers'}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: metaStyle,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(
                onPressed: onVisit,
                style: FilledButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(0, 34),
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  shape: const StadiumBorder(),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  textStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                child: const Text('Visit'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductSpecificationsCard extends StatelessWidget {
  const _ProductSpecificationsCard({
    required this.specifications,
    required this.secondaryColor,
  });

  final List<ProductSpecification> specifications;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dividerColor = secondaryColor.withOpacity(0.14);

    return Container(
      decoration: BoxDecoration(
        color: _homeProductCardSurfaceColor(theme),
        borderRadius: const BorderRadius.all(Radius.circular(16)),
      ),
      // Keep labels such as Brand on the same leading edge as the
      // Specifications section heading.
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: [
          for (var index = 0; index < specifications.length; index++)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                border: index == specifications.length - 1
                    ? null
                    : Border(bottom: BorderSide(color: dividerColor)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      specifications[index].label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: secondaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: Text(
                      specifications[index].value,
                      textAlign: TextAlign.right,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

Color _productDetailsSurfaceColor(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? Colors.black
      : Colors.white;
}

String _formatCurrency(double amount) => formatPesoCurrency(amount);

String _formatCompactCount(int count) {
  if (count < 1000) {
    return count.toString();
  }

  final thousands = count ~/ 1000;
  final suffix = count % 1000 == 0 ? 'K' : 'K+';
  return '$thousands$suffix';
}

bool _isProductInTopSelling(
  Product product,
  List<Product> products, {
  int limit = 10,
}) {
  return _buildTopSellingProducts(
    products,
    limit: limit,
  ).any((candidate) => candidate.id == product.id);
}

List<Product> _buildTopSellingProducts(
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

  return rankedProducts.take(limit).toList();
}
