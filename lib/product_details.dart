import 'dart:async';

import 'package:switch_app/add_to_cart.dart';
import 'package:switch_app/place_order.dart';
import 'package:switch_app/buy.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/chat_support.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_app/customer_review.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/guest_session.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/own_listing.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/search_bar.dart' as app_search;
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/utils/session_image_cache.dart';
import 'package:switch_app/widgets/bouncing_dots_loader.dart';
import 'package:video_player/video_player.dart';
import 'package:switch_app/widgets/product_company_identity.dart';
import 'package:switch_app/widgets/product_card_tap_lift.dart';
import 'package:switch_app/widgets/horizontal_end_fade.dart';

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
  static const int _relatedProductsBatchSize = 3;
  static const double _heroExpandedHeight = 340;
  static const String _defaultHeaderTitle = 'Product Details';
  late final ProductRepository _productRepository;
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
  final ValueNotifier<int> _visibleRelatedProductsCountNotifier =
      ValueNotifier<int>(_relatedProductsBatchSize);
  final ValueNotifier<int> _bottomOverscrollSignalNotifier = ValueNotifier<int>(
    0,
  );
  bool _isCartFlightAnimating = false;
  final ValueNotifier<bool> _showsScrollToTopButtonNotifier =
      ValueNotifier<bool>(false);

  bool get _showsHeaderUtilityActions =>
      widget.source != ProductDetailsEntrySource.cart;

  bool get _isGuestMode => GuestSession.isGuest && !AuthSession.isLoggedInSync;
  bool _isOwnListing = false;
  bool _ownListingResolved = false;
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
    _productNotifier = ValueNotifier<Product>(widget.product);
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
    _heroPageController = PageController(initialPage: _currentHeroMediaIndex);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _precacheHeroImages();
      }
    });
  }

  Product get _product => _productNotifier.value;
  set _product(Product value) {
    _productNotifier.value = value;
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
    _currentHeroMediaIndexNotifier.dispose();
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
    _catalogProducts = catalogProducts ?? _catalogProducts;
    _heroImageUrls = _product.detailsDisplayImageUrls;
    _heroMediaItems = _buildHeroMediaItems();
    _currentHeroMediaIndex = _resolveInitialHeroMediaIndex();
    _precacheHeroImages();
    _visibleRelatedProductsCount = _relatedProductsBatchSize;
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

  double get _originalPrice => _product.originalPrice;

  double? get _salesPrice => _product.salesPrice;

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
        ),
      );
    }

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

    for (final imageUrl in _heroImageUrls) {
      final trimmedImageUrl = imageUrl.trim();
      if (trimmedImageUrl.isEmpty) {
        continue;
      }

      mediaItems.add(
        _ProductDetailsMediaItem(
          type: _ProductDetailsMediaType.image,
          url: trimmedImageUrl,
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
                        child: Icon(
                          Icons.shopping_cart_outlined,
                          color: iconColor,
                          size: 24,
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
      });
      return;
    }
    setState(() {
      _isOwnListing = false;
      _ownListingResolved = false;
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

  Future<void> _openAddToCartModal() async {
    var catalogProducts = _catalogProducts ?? const <Product>[];
    if (catalogProducts.isEmpty) {
      try {
        catalogProducts = await _relatedProductsFuture;
        _catalogProducts = catalogProducts;
      } catch (_) {
        catalogProducts = const <Product>[];
      }
    }

    final addToCartSelection = await showAddToCartModal(
      context,
      product: _product,
      catalogProducts: catalogProducts,
      discountPercent: _discountPercent,
      showsTopBrand:
          catalogProducts.isNotEmpty &&
          _isProductInTopSelling(_product, catalogProducts),
    );

    if (!mounted || addToCartSelection == null) {
      return;
    }

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

    if (!mounted) {
      return;
    }

    await _playAddToCartAnimation();

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
    var catalogProducts = _catalogProducts ?? const <Product>[];
    if (catalogProducts.isEmpty) {
      try {
        catalogProducts = await _relatedProductsFuture;
        _catalogProducts = catalogProducts;
      } catch (_) {
        catalogProducts = const <Product>[];
      }
    }

    final buySelection = await showBuyModal(
      context,
      product: _product,
      catalogProducts: catalogProducts,
      discountPercent: _discountPercent,
      showsTopBrand:
          catalogProducts.isNotEmpty &&
          _isProductInTopSelling(_product, catalogProducts),
    );

    if (!mounted || buySelection == null) {
      return;
    }

    final bookingAction = await openBookingPage(
      context,
      items: [
        BookingLineItem.fromProduct(
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
        ),
      ],
      source: BookingFlowSource.directBuy,
      platformId: _cartPlatformId,
    );

    if (!mounted || bookingAction != BookingPageAction.orderPlaced) {
      return;
    }

    _showTopActionMessage(
      'Direct order placed for ${buySelection.quantity} item${buySelection.quantity == 1 ? '' : 's'}.',
    );
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

  Future<void> _openCustomerReviewsPage() {
    final reviewItems = [
      for (final review in _customerReviews)
        CustomerReviewItem(
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
      horizontal: 10,
      vertical: 6,
    );
    final statusChipPadding = const EdgeInsets.symmetric(
      horizontal: 7,
      vertical: 3,
    );
    final uniformChipLabelStyle = theme.textTheme.labelSmall?.copyWith(
      fontWeight: FontWeight.w800,
    );
    final topPadding = MediaQuery.paddingOf(context).top;
    final collapsedHeaderHeight = topPadding + kToolbarHeight;
    final detailsSurfaceColor = _productDetailsSurfaceColor(context);

    return Scaffold(
      backgroundColor: detailsSurfaceColor,
      bottomNavigationBar: ValueListenableBuilder<Product>(
        valueListenable: _productNotifier,
        builder: (context, _, child) => _ProductDetailsFooterBar(
          surfaceColor: homeHeaderColor,
          primaryColor: primaryColor,
          secondaryColor: secondaryColor,
          targetHeight: collapsedHeaderHeight,
          buyPriceAmount: _displayPrice,
          isGuestMode: _isGuestMode,
          isOwnListing: _isOwnListing,
          purchaseActionsEnabled: _isGuestMode || _ownListingResolved,
          listingInsightBusy: _listingInsightBusy,
          onChatTap: _handleChatTap,
          onAddToCartTap: _handleAddToCartTap,
          onBuyTap: _handleBuyNowTap,
          onListingInsightTap: () => unawaited(_handleListingInsightTap()),
        ),
      ),
      body: Stack(
        children: [
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
                  automaticallyImplyLeading: false,
                  pinned: true,
                  expandedHeight: _heroExpandedHeight,
                  flexibleSpace: FlexibleSpaceBar(
                    background: AnimatedBuilder(
                      animation: Listenable.merge([
                        _productNotifier,
                        _currentHeroMediaIndexNotifier,
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
                        onImageTap: _openHeroImagePreview,
                        onCommentsTap: _openCustomerReviewsPage,
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
                SliverToBoxAdapter(
                  child: ValueListenableBuilder<Product>(
                    valueListenable: _productNotifier,
                    builder: (context, product, child) => Padding(
                      padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final categoryChip = _ProductDetailChipData(
                                icon: Icons.grid_view_outlined,
                                label: product.categoryLabel.trim().isEmpty
                                    ? 'Uncategorized'
                                    : product.categoryLabel,
                                color: primaryColor,
                                labelColor: primaryColor,
                                iconColor: primaryColor,
                                padding: uniformChipPadding,
                                labelStyle: uniformChipLabelStyle?.copyWith(
                                  height: 1.15,
                                ),
                              );

                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  Expanded(
                                    child: Align(
                                      alignment: Alignment.centerLeft,
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: _ProductDetailChip.fromData(
                                          categoryChip,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  ValueListenableBuilder<List<String>>(
                                    valueListenable: FavoriteProductsStore
                                        .instance
                                        .favoriteProductIdsNotifier,
                                    builder: (context, favoriteProductIds, child) {
                                      final isFavorite = favoriteProductIds
                                          .contains(product.id);

                                      return SizedBox(
                                        width: 42,
                                        height: 42,
                                        child: IconButton(
                                          onPressed: _handleFavoriteToggle,
                                          tooltip: isFavorite
                                              ? 'Remove from favorites'
                                              : 'Add to favorites',
                                          padding: EdgeInsets.zero,
                                          splashRadius: 22,
                                          icon: Icon(
                                            isFavorite
                                                ? Icons.favorite_rounded
                                                : Icons.favorite_border_rounded,
                                            color: isFavorite
                                                ? const Color(0xFFD32F2F)
                                                : secondaryColor,
                                            size: 26,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 16),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final productTitle = product.name.trim().isEmpty
                                  ? 'Unnamed Product'
                                  : product.name;
                              final productTitleStyle = theme
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    height: 1,
                                  );
                              final titleMaxWidth = constraints.maxWidth;
                              final titleLineCount = _measureTextLineCount(
                                context,
                                text: productTitle,
                                style: productTitleStyle,
                                maxWidth: titleMaxWidth,
                              );
                              final titleBottomSpacing = titleLineCount <= 1
                                  ? 0.0
                                  : 4.0;

                              return ValueListenableBuilder<
                                Future<List<Product>>
                              >(
                                valueListenable: _relatedProductsFutureNotifier,
                                builder: (context, relatedProductsFuture, child) {
                                  return FutureBuilder<List<Product>>(
                                    future: relatedProductsFuture,
                                    builder: (context, snapshot) {
                                      final showsTopSellingChip =
                                          snapshot.hasData &&
                                          _isProductInTopSelling(
                                            product,
                                            snapshot.data ?? const <Product>[],
                                          );
                                      final statusChipItems =
                                          <_ProductDetailChipData>[
                                            if (_discountPercent != null)
                                              _ProductDetailChipData(
                                                icon:
                                                    Icons.local_offer_outlined,
                                                label: '-$_discountPercent%',
                                                color: const Color(0xFFC62828),
                                                backgroundColor: const Color(
                                                  0xFFD32F2F,
                                                ),
                                                labelColor: Colors.white,
                                                iconColor: Colors.white,
                                                padding: statusChipPadding,
                                                iconSize: 14,
                                                borderRadius:
                                                    const BorderRadius.all(
                                                      Radius.circular(8),
                                                    ),
                                                labelStyle:
                                                    uniformChipLabelStyle
                                                        ?.copyWith(
                                                          color: Colors.white,
                                                          fontSize: 10,
                                                          height: 1,
                                                        ),
                                              ),
                                            if (showsTopSellingChip)
                                              _ProductDetailChipData(
                                                icon: Icons
                                                    .workspace_premium_outlined,
                                                label: 'Top Selling',
                                                color: const Color.fromARGB(
                                                  255,
                                                  15,
                                                  194,
                                                  176,
                                                ),
                                                backgroundColor:
                                                    const Color.fromARGB(
                                                      255,
                                                      15,
                                                      194,
                                                      176,
                                                    ),
                                                labelColor: Colors.white,
                                                iconColor: Colors.white,
                                                padding: statusChipPadding,
                                                iconSize: 14,
                                                borderRadius:
                                                    const BorderRadius.all(
                                                      Radius.circular(8),
                                                    ),
                                                labelStyle:
                                                    uniformChipLabelStyle
                                                        ?.copyWith(
                                                          color: Colors.white,
                                                          fontSize: 10,
                                                          height: 1,
                                                        ),
                                              ),
                                            if (_showsTopReviewsChip)
                                              _ProductDetailChipData(
                                                icon:
                                                    Icons.star_outline_rounded,
                                                label: 'Top Rating',
                                                color: const Color(0xFFF9A825),
                                                backgroundColor: const Color(
                                                  0xFFF9A825,
                                                ),
                                                labelColor: Colors.white,
                                                iconColor: Colors.white,
                                                padding: statusChipPadding,
                                                iconSize: 14,
                                                borderRadius:
                                                    const BorderRadius.all(
                                                      Radius.circular(8),
                                                    ),
                                                labelStyle:
                                                    uniformChipLabelStyle
                                                        ?.copyWith(
                                                          color: Colors.white,
                                                          fontSize: 10,
                                                          height: 1,
                                                        ),
                                              ),
                                          ];
                                      const statusChipSpacing = 6.0;
                                      final titleLastLineWidth =
                                          _measureTextLastLineWidth(
                                            context,
                                            text: productTitle,
                                            style: productTitleStyle,
                                            maxWidth: titleMaxWidth,
                                          );
                                      final inlineStatusAvailableWidth =
                                          titleLineCount <= 2
                                          ? titleMaxWidth - titleLastLineWidth
                                          : 0.0;
                                      var inlineStatusChipCount = 0;
                                      var inlineStatusWidth = 0.0;
                                      if (inlineStatusAvailableWidth > 0) {
                                        for (final chip in statusChipItems) {
                                          final nextWidth =
                                              inlineStatusWidth +
                                              statusChipSpacing +
                                              _estimateProductDetailChipWidth(
                                                context,
                                                chip,
                                              );
                                          if (nextWidth >
                                              inlineStatusAvailableWidth) {
                                            break;
                                          }

                                          inlineStatusChipCount++;
                                          inlineStatusWidth = nextWidth;
                                        }
                                      }
                                      final inlineStatusChipItems =
                                          statusChipItems
                                              .take(inlineStatusChipCount)
                                              .toList(growable: false);
                                      final belowStatusChipItems =
                                          statusChipItems
                                              .skip(inlineStatusChipCount)
                                              .toList(growable: false);
                                      final hasInlineStatusChips =
                                          inlineStatusChipItems.isNotEmpty;

                                      return Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Row(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Expanded(
                                                child: hasInlineStatusChips
                                                    ? Text.rich(
                                                        TextSpan(
                                                          style:
                                                              productTitleStyle,
                                                          children: [
                                                            TextSpan(
                                                              text:
                                                                  productTitle,
                                                            ),
                                                            for (final chip
                                                                in inlineStatusChipItems)
                                                              WidgetSpan(
                                                                alignment:
                                                                    PlaceholderAlignment
                                                                        .middle,
                                                                child: Padding(
                                                                  padding:
                                                                      const EdgeInsets.only(
                                                                        left:
                                                                            statusChipSpacing,
                                                                      ),
                                                                  child:
                                                                      _ProductDetailChip.fromData(
                                                                        chip,
                                                                      ),
                                                                ),
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
                                          if (hasInlineStatusChips)
                                            const SizedBox(height: 4)
                                          else
                                            SizedBox(
                                              height: titleBottomSpacing,
                                            ),
                                          if (belowStatusChipItems
                                              .isNotEmpty) ...[
                                            Wrap(
                                              spacing: 6,
                                              runSpacing: 4,
                                              crossAxisAlignment:
                                                  WrapCrossAlignment.center,
                                              children: [
                                                for (final chip
                                                    in belowStatusChipItems)
                                                  _ProductDetailChip.fromData(
                                                    chip,
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 10),
                                          ],
                                          Wrap(
                                            spacing: 10,
                                            runSpacing: 6,
                                            crossAxisAlignment:
                                                WrapCrossAlignment.center,
                                            children: [
                                              _ProductDetailPrice(
                                                amount: _displayPrice,
                                                color: primaryColor,
                                                fontWeight: FontWeight.w800,
                                                fontSize: 28,
                                              ),
                                              if (_hasSalesPrice)
                                                _ProductDetailPrice(
                                                  amount: _originalPrice,
                                                  color: secondaryColor,
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 15,
                                                  decoration: TextDecoration
                                                      .lineThrough,
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 8),
                                          InkWell(
                                            onTap: () {
                                              final adminId =
                                                  product.adminId
                                                      .trim()
                                                      .isNotEmpty
                                                  ? product.adminId.trim()
                                                  : product.companyName.trim();
                                              if (adminId.isEmpty) {
                                                return;
                                              }
                                              Navigator.of(context).pushNamed(
                                                '/seller',
                                                arguments: {
                                                  'adminId': adminId,
                                                  'initialName': product
                                                      .companyName
                                                      .trim(),
                                                },
                                              );
                                            },
                                            child: ProductCompanyIdentity(
                                              product: product,
                                              textColor: secondaryColor,
                                              fallbackColor: primaryColor,
                                              avatarSize: 28,
                                              fontSize: 13,
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
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              Expanded(
                                child: _ProductDetailStatCard(
                                  icon: Icons.star_rounded,
                                  iconColor: const Color(0xFFF9A825),
                                  header: _ProductRatingStars(
                                    rating: _product.rating,
                                    size: 16,
                                    spacing: 2,
                                    emptyColor: secondaryColor.withOpacity(
                                      0.22,
                                    ),
                                  ),
                                  label: 'Rating',
                                  value: _product.rating.toStringAsFixed(1),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _ProductDetailStatCard(
                                  icon: Icons.calendar_today_outlined,
                                  iconColor: primaryColor,
                                  label: 'Posted',
                                  value: _formattedDate,
                                  valueLines: 2,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),
                          Column(
                            key: _aboutSectionKey,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'About this product',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 12),
                              if (product.description.trim().isNotEmpty)
                                Text(
                                  product.description,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: secondaryColor,
                                    height: 1.2,
                                  ),
                                )
                              else if (product.descriptionImageUrls.isEmpty)
                                Text(
                                  'No details available about this product yet.',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: secondaryColor,
                                    height: 1.2,
                                  ),
                                ),
                              if (product.descriptionImageUrls.isNotEmpty) ...[
                                if (product.description.trim().isNotEmpty)
                                  const SizedBox(height: 14),
                                _ProductDescriptionImageList(
                                  imageUrls: product.descriptionImageUrls,
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 16),
                          Column(
                            key: _customerReviewsSectionKey,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      'Customer Reviews',
                                      style: theme.textTheme.titleSmall
                                          ?.copyWith(
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                  ),
                                  if (_customerReviews.isNotEmpty)
                                    InkWell(
                                      onTap: _openCustomerReviewsPage,
                                      borderRadius: const BorderRadius.all(
                                        Radius.circular(10),
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 4,
                                          vertical: 4,
                                        ),
                                        child: Text(
                                          'View all',
                                          style: theme.textTheme.labelLarge
                                              ?.copyWith(
                                                color: primaryColor,
                                                fontWeight: FontWeight.w700,
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
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: secondaryColor,
                                    height: 1.2,
                                  ),
                                )
                              else
                                _CustomerReviewCarousel(
                                  reviews: _customerReviews,
                                  titleColor: theme.colorScheme.onSurface,
                                  secondaryColor: secondaryColor,
                                  sellerCompanyName: _product.companyName,
                                ),
                            ],
                          ),
                          SizedBox(
                            height: _customerReviewsToRelatedProductsSpacing(
                              _customerReviews,
                            ),
                          ),
                          KeyedSubtree(
                            key: _relatedProductsSectionKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Related Products',
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                ValueListenableBuilder<Future<List<Product>>>(
                                  valueListenable:
                                      _relatedProductsFutureNotifier,
                                  builder: (context, relatedProductsFuture, child) {
                                    return FutureBuilder<List<Product>>(
                                      future: relatedProductsFuture,
                                      builder: (context, snapshot) {
                                        if (snapshot.connectionState ==
                                                ConnectionState.waiting &&
                                            !snapshot.hasData) {
                                          return Center(
                                            child: Padding(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 18,
                                                  ),
                                              child: BouncingDotsLoader(
                                                activeColor: primaryColor,
                                                inactiveColor: secondaryColor
                                                    .withOpacity(0.28),
                                              ),
                                            ),
                                          );
                                        }

                                        if (snapshot.hasError) {
                                          return Text(
                                            'Unable to load related products right now.',
                                            style: theme.textTheme.bodyMedium
                                                ?.copyWith(
                                                  color: secondaryColor,
                                                  height: 1.55,
                                                ),
                                          );
                                        }

                                        final relatedProducts =
                                            _buildRelatedProducts(
                                              snapshot.data ??
                                                  const <Product>[],
                                            );
                                        final topSellerIds = {
                                          for (final product
                                              in _buildTopSellingProducts(
                                                snapshot.data ??
                                                    const <Product>[],
                                              ))
                                            product.id,
                                        };

                                        if (relatedProducts.isEmpty) {
                                          return Text(
                                            'No related products available in this category yet.',
                                            style: theme.textTheme.bodyMedium
                                                ?.copyWith(
                                                  color: secondaryColor,
                                                  height: 1.55,
                                                ),
                                          );
                                        }

                                        return ValueListenableBuilder<int>(
                                          valueListenable:
                                              _visibleRelatedProductsCountNotifier,
                                          builder: (context, visibleCount, child) {
                                            final visibleRelatedProductsCount =
                                                visibleCount
                                                    .clamp(
                                                      0,
                                                      relatedProducts.length,
                                                    )
                                                    .toInt();

                                            return ListView.builder(
                                              shrinkWrap: true,
                                              primary: false,
                                              physics:
                                                  const NeverScrollableScrollPhysics(),
                                              itemCount:
                                                  visibleRelatedProductsCount,
                                              itemBuilder: (context, index) {
                                                final relatedProduct =
                                                    relatedProducts[index];

                                                return Padding(
                                                  padding: EdgeInsets.only(
                                                    bottom:
                                                        index ==
                                                            visibleRelatedProductsCount -
                                                                1
                                                        ? 0
                                                        : 12,
                                                  ),
                                                  child: _RelatedProductCard(
                                                    product: relatedProduct,
                                                    showTopSellerBadge:
                                                        topSellerIds.contains(
                                                          relatedProduct.id,
                                                        ),
                                                    platformId: _cartPlatformId,
                                                  ),
                                                );
                                              },
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
                            valueListenable: _bottomOverscrollSignalNotifier,
                            builder: (context, overscrollSignal, child) =>
                                _ProductDetailsScrollEndIndicator(
                                  scrollController: _scrollController,
                                  overscrollSignal: overscrollSignal,
                                  primaryColor: primaryColor,
                                  secondaryColor: secondaryColor,
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
          AnimatedBuilder(
            animation: _scrollController,
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
              final headerIconColor =
                  theme.iconTheme.color ?? theme.colorScheme.onSurface;
              final headerActionIconColor = headerIconColor.withOpacity(0.76);
              final headerTitle = _resolveHeaderTitle(
                scrollOffset: scrollOffset,
                headerBottom: collapsedHeaderHeight,
                revealProgress: headerRevealProgress,
              );

              return Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: RepaintBoundary(
                  child: Container(
                    height: collapsedHeaderHeight,
                    decoration: BoxDecoration(
                      color: homeHeaderColor.withOpacity(headerOpacity),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06 * headerOpacity),
                          blurRadius: 14,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Row(
                          children: [
                            SizedBox(
                              width: 48,
                              height: 48,
                              child: IconButton(
                                onPressed: () =>
                                    Navigator.of(context).maybePop(),
                                tooltip: 'Back',
                                icon: Icon(
                                  Icons.arrow_back_ios_new_rounded,
                                  color: headerIconColor,
                                  size: 24,
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
                                  constraints: const BoxConstraints.tightFor(
                                    width: 40,
                                    height: 40,
                                  ),
                                  splashRadius: 20,
                                  icon: Icon(
                                    Icons.search_outlined,
                                    color: headerActionIconColor,
                                    size: 24,
                                  ),
                                ),
                              ),
                              _buildCartOverlayButton(headerActionIconColor),
                            ],
                          ],
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
    required this.onImageTap,
    required this.onCommentsTap,
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
  final VoidCallback onImageTap;
  final VoidCallback onCommentsTap;
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
                      loadingFallback: Center(
                        child: BouncingDotsLoader(
                          activeColor: primaryColor,
                          inactiveColor: primaryColor.withOpacity(0.24),
                        ),
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
            bottom: 6,
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
            bottom: mediaItems.length > 1 ? 24 : 16,
            child: SafeArea(
              top: false,
              minimum: const EdgeInsets.only(right: 2, bottom: 2),
              child: _HeroBuyerCommentPopup(
                reviews: commentPreviews,
                onTap: onCommentsTap,
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
  const _HeroBuyerCommentPopup({required this.reviews, required this.onTap});

  final List<_ProductCustomerReview> reviews;
  final VoidCallback onTap;

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
    final bubbleColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final bubbleShadowColor = Colors.black.withOpacity(
      theme.brightness == Brightness.dark ? 0.24 : 0.12,
    );
    final avatarColor = theme.colorScheme.primary.withOpacity(
      theme.brightness == Brightness.dark ? 0.26 : 0.12,
    );
    final avatarTextColor = theme.colorScheme.primary;
    final bodyColor =
        theme.textTheme.bodySmall?.color?.withOpacity(0.9) ??
        theme.colorScheme.onSurface.withOpacity(0.9);
    final review = _currentReview;
    final reviewerInitial = review.reviewer.trim().isEmpty
        ? '?'
        : review.reviewer.trim()[0];

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 198),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: const BorderRadius.all(Radius.circular(18)),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                right: 14,
                bottom: -4,
                child: IgnorePointer(
                  child: Transform.rotate(
                    angle: 0.78539816339,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: bubbleColor,
                        borderRadius: const BorderRadius.all(
                          Radius.circular(3),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Ink(
                padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
                decoration: BoxDecoration(
                  color: bubbleColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(6),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: bubbleShadowColor,
                      blurRadius: 14,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: avatarColor,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        reviewerInitial.toUpperCase(),
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: avatarTextColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final reviewMessageStyle = theme.textTheme.bodySmall
                              ?.copyWith(
                                color: bodyColor,
                                fontSize: 5,
                                height: 1.05,
                                fontWeight: FontWeight.w100,
                              );
                          final reviewMessageLayout = _resolveProductTextFit(
                            context,
                            text: review.message,
                            style: reviewMessageStyle,
                            maxWidth: constraints.maxWidth,
                            maxLines: 3,
                            minFontSize: 9,
                          );

                          final popupTransitionDuration = appMotionFrames(31);

                          return RepaintBoundary(
                            child: AnimatedSize(
                              duration: popupTransitionDuration,
                              curve: Curves.easeOutCubic,
                              alignment: Alignment.topLeft,
                              child: AnimatedSwitcher(
                                duration: popupTransitionDuration,
                                switchInCurve: Curves.easeOutCubic,
                                switchOutCurve: Curves.easeInCubic,
                                layoutBuilder:
                                    (currentChild, previousChildren) {
                                      return currentChild ??
                                          const SizedBox.shrink();
                                    },
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
                                child: Column(
                                  key: ValueKey(
                                    '${review.reviewer}-${review.title}-${review.message}',
                                  ),
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      review.message,
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis,
                                      style: reviewMessageStyle?.copyWith(
                                        fontSize: reviewMessageLayout.fontSize,
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

    return WillPopScope(
      onWillPop: _handleBackPress,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: DecoratedBox(
          decoration: const BoxDecoration(color: Colors.black),
          child: Stack(
            children: [
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
                          inactiveColor: widget.primaryColor.withOpacity(0.24),
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
                    padding: const EdgeInsets.fromLTRB(6, 4, 12, 0),
                    child: Row(
                      children: [
                        IconButton(
                          onPressed: () =>
                              Navigator.of(context).pop(_currentIndex),
                          tooltip: 'Close preview',
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: Colors.white,
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
                                  color: Colors.white,
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
                                ? Colors.white
                                : Colors.white.withOpacity(0.36),
                          ),
                        ),
                      ],
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
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(widget.mediaItems.length, (
                            index,
                          ) {
                            final isActive = index == _currentIndex;

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
            ],
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

class _ProductDescriptionImageList extends StatelessWidget {
  const _ProductDescriptionImageList({required this.imageUrls});

  final List<String> imageUrls;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final placeholderColor = theme.colorScheme.onSurface.withValues(
      alpha: 0.05,
    );
    final fallbackColor = theme.colorScheme.onSurface.withValues(alpha: 0.42);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < imageUrls.length; index += 1)
          Padding(
            padding: EdgeInsets.only(top: index == 0 ? 0 : 12),
            child: AspectRatio(
              aspectRatio: 1,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: ColoredBox(
                  color: placeholderColor,
                  child: _ProductDetailsNetworkImage(
                    imageUrl: imageUrls[index],
                    fit: BoxFit.cover,
                    loadingFallback: ColoredBox(color: placeholderColor),
                    errorFallback: Center(
                      child: Icon(
                        Icons.broken_image_outlined,
                        color: fallbackColor,
                        size: 34,
                      ),
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
    this.alignment = Alignment.center,
    this.errorFallback,
    this.loadingFallback,
  });

  final String imageUrl;
  final BoxFit? fit;
  final AlignmentGeometry alignment;
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
      alignment: widget.alignment,
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

class _ProductDetailsFooterBar extends StatelessWidget {
  const _ProductDetailsFooterBar({
    required this.surfaceColor,
    required this.primaryColor,
    required this.secondaryColor,
    required this.targetHeight,
    required this.buyPriceAmount,
    required this.isGuestMode,
    required this.isOwnListing,
    required this.purchaseActionsEnabled,
    required this.listingInsightBusy,
    required this.onChatTap,
    required this.onAddToCartTap,
    required this.onBuyTap,
    required this.onListingInsightTap,
  });

  final Color surfaceColor;
  final Color primaryColor;
  final Color secondaryColor;
  final double targetHeight;
  final double buyPriceAmount;
  final bool isGuestMode;
  final bool isOwnListing;
  final bool purchaseActionsEnabled;
  final bool listingInsightBusy;
  final VoidCallback onChatTap;
  final VoidCallback onAddToCartTap;
  final VoidCallback onBuyTap;
  final VoidCallback onListingInsightTap;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.paddingOf(context).bottom;
    final minimumHeight = bottomPadding + 64.0;
    final resolvedHeight = targetHeight > minimumHeight
        ? targetHeight
        : minimumHeight;
    final contentHeight = resolvedHeight - bottomPadding;
    final controlHeight = contentHeight <= 52
        ? 52.0
        : contentHeight >= 56
        ? 56.0
        : contentHeight;
    final buyButtonHeight = controlHeight - 8;
    final theme = Theme.of(context);
    final buyForegroundColor = theme.brightness == Brightness.dark
        ? theme.cardColor
        : theme.colorScheme.onPrimary;
    final disabledActionColor = secondaryColor.withOpacity(0.42);
    final resolvedBuyBackgroundColor = isOwnListing
        ? primaryColor
        : isGuestMode
        ? secondaryColor.withOpacity(0.16)
        : primaryColor;
    final resolvedBuyForegroundColor = isOwnListing
        ? buyForegroundColor
        : isGuestMode
        ? secondaryColor.withOpacity(0.82)
        : buyForegroundColor;
    final purchaseEnabled = purchaseActionsEnabled && !listingInsightBusy;
    final buyPriceFontSize = theme.textTheme.titleMedium?.fontSize ?? 16;

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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (!isOwnListing) ...[
                    _ProductFooterIconAction(
                      height: controlHeight,
                      icon: Icons.chat_bubble_outline_rounded,
                      label: 'Chat',
                      iconColor: !purchaseEnabled || isGuestMode
                          ? disabledActionColor
                          : secondaryColor,
                      onTap: purchaseEnabled ? onChatTap : () {},
                    ),
                    const SizedBox(width: 10),
                    _ProductFooterIconAction(
                      height: controlHeight,
                      icon: Icons.add_shopping_cart_outlined,
                      label: 'Add to Cart',
                      iconColor: !purchaseEnabled || isGuestMode
                          ? disabledActionColor
                          : primaryColor,
                      onTap: purchaseEnabled ? onAddToCartTap : () {},
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Center(
                      child: SizedBox(
                        height: buyButtonHeight,
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: !purchaseEnabled
                              ? null
                              : isOwnListing
                              ? onListingInsightTap
                              : onBuyTap,
                          style: FilledButton.styleFrom(
                            backgroundColor: resolvedBuyBackgroundColor,
                            foregroundColor: resolvedBuyForegroundColor,
                            disabledBackgroundColor: secondaryColor.withOpacity(
                              0.16,
                            ),
                            disabledForegroundColor: secondaryColor.withOpacity(
                              0.72,
                            ),
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.all(
                                Radius.circular(8),
                              ),
                            ),
                            textStyle: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          child: listingInsightBusy
                              ? SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: resolvedBuyForegroundColor,
                                  ),
                                )
                              : FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: isOwnListing
                                      ? Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.insights_rounded,
                                              size: 18,
                                              color: resolvedBuyForegroundColor,
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              'Listing Insight',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleSmall
                                                  ?.copyWith(
                                                    color:
                                                        resolvedBuyForegroundColor,
                                                    fontWeight: FontWeight.w800,
                                                  ),
                                            ),
                                          ],
                                        )
                                      : Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              'Buy',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .titleSmall
                                                  ?.copyWith(
                                                    color:
                                                        resolvedBuyForegroundColor,
                                                    fontWeight: FontWeight.w800,
                                                  ),
                                            ),
                                            const SizedBox(height: 1),
                                            _ProductDetailPrice(
                                              amount: buyPriceAmount,
                                              color: resolvedBuyForegroundColor
                                                  .withOpacity(0.86),
                                              fontWeight: FontWeight.w800,
                                              fontSize: buyPriceFontSize,
                                            ),
                                          ],
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
      ),
    );
  }
}

class _ProductFooterIconAction extends StatelessWidget {
  const _ProductFooterIconAction({
    required this.height,
    required this.icon,
    required this.label,
    required this.iconColor,
    required this.onTap,
  });

  final double height;
  final IconData icon;
  final String label;
  final Color iconColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: const BorderRadius.all(Radius.circular(14)),
        child: SizedBox(
          width: 74,
          height: height,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 22, color: iconColor),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: iconColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
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
    this.icon,
    this.backgroundColor,
    this.labelColor,
    this.iconColor,
    this.iconSize,
    this.padding,
    this.borderRadius,
    this.labelStyle,
  });

  final IconData? icon;
  final String label;
  final Color color;
  final Color? backgroundColor;
  final Color? labelColor;
  final Color? iconColor;
  final double? iconSize;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  final TextStyle? labelStyle;

  int get compactFlex {
    final labelWeight = label.trim().length.clamp(6, 18);
    final iconWeight = icon == null ? 0 : 4;
    return (labelWeight + iconWeight).clamp(8, 22);
  }
}

class _ProductDetailChip extends StatelessWidget {
  const _ProductDetailChip({
    required this.label,
    required this.color,
    this.icon,
    this.backgroundColor,
    this.labelColor,
    this.iconColor,
    this.iconSize,
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
      icon: chipData.icon,
      label: chipData.label,
      color: chipData.color,
      backgroundColor: chipData.backgroundColor,
      labelColor: chipData.labelColor,
      iconColor: chipData.iconColor,
      iconSize: chipData.iconSize,
      padding: chipData.padding,
      borderRadius: chipData.borderRadius,
      labelStyle: chipData.labelStyle,
      compactWhenTight: compactWhenTight,
      fillWidth: fillWidth,
    );
  }

  final IconData? icon;
  final String label;
  final Color color;
  final Color? backgroundColor;
  final Color? labelColor;
  final Color? iconColor;
  final double? iconSize;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  final TextStyle? labelStyle;
  final bool compactWhenTight;
  final bool fillWidth;

  @override
  Widget build(BuildContext context) {
    final resolvedBackgroundColor = backgroundColor ?? color.withOpacity(0.1);
    final resolvedLabelColor = labelColor ?? color;
    final resolvedIconColor = iconColor ?? resolvedLabelColor;
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
        if (icon != null) ...[
          Icon(icon, size: iconSize ?? 16, color: resolvedIconColor),
          const SizedBox(width: 6),
        ],
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

class _ProductDetailStatCard extends StatelessWidget {
  const _ProductDetailStatCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    this.valueLines = 1,
    this.header,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final int valueLines;
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: _homeProductCardSurfaceColor(theme),
        borderRadius: const BorderRadius.all(Radius.circular(8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          header ?? Icon(icon, size: 18, color: iconColor),
          const SizedBox(height: 10),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.textTheme.bodySmall?.color?.withOpacity(0.68),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: valueLines,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
              height: 1.25,
            ),
          ),
        ],
      ),
    );
  }
}

double _estimateProductDetailChipWidth(
  BuildContext context,
  _ProductDetailChipData chip,
) {
  final resolvedLabelStyle =
      (Theme.of(context).textTheme.labelMedium?.copyWith(
                color: chip.labelColor ?? chip.color,
                fontWeight: FontWeight.w700,
              ) ??
              TextStyle(
                color: chip.labelColor ?? chip.color,
                fontWeight: FontWeight.w700,
              ))
          .merge(chip.labelStyle);
  final resolvedPadding =
      (chip.padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 8))
          .resolve(Directionality.of(context));

  return resolvedPadding.left +
      resolvedPadding.right +
      _measureTextWidth(context, text: chip.label, style: resolvedLabelStyle) +
      (chip.icon == null ? 0 : (chip.iconSize ?? 16) + 6);
}

double _measureTextWidth(
  BuildContext context, {
  required String text,
  required TextStyle? style,
}) {
  final painter = TextPainter(
    text: TextSpan(
      text: text,
      style: DefaultTextStyle.of(context).style.merge(style),
    ),
    textDirection: Directionality.of(context),
    textScaler: MediaQuery.textScalerOf(context),
    maxLines: 1,
  )..layout();

  return painter.width;
}

double _measureTextLastLineWidth(
  BuildContext context, {
  required String text,
  required TextStyle? style,
  required double maxWidth,
}) {
  if (!maxWidth.isFinite || maxWidth <= 0) {
    return 0;
  }

  final painter = TextPainter(
    text: TextSpan(
      text: text,
      style: DefaultTextStyle.of(context).style.merge(style),
    ),
    textDirection: Directionality.of(context),
    textScaler: MediaQuery.textScalerOf(context),
  )..layout(maxWidth: maxWidth);
  final lineMetrics = painter.computeLineMetrics();

  if (lineMetrics.isEmpty) {
    return 0;
  }

  return lineMetrics.last.width;
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
      return Icon(Icons.star_rounded, size: size, color: emptyColor);
    }

    if (fillFraction >= 1) {
      return Icon(Icons.star_rounded, size: size, color: filledColor);
    }

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          Icon(Icons.star_rounded, size: size, color: emptyColor),
          ClipRect(
            child: Align(
              alignment: Alignment.centerLeft,
              widthFactor: fillFraction,
              child: Icon(Icons.star_rounded, size: size, color: filledColor),
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
    this.sellerReply,
  });

  final String reviewer;
  final String title;
  final String message;
  final double rating;
  final List<ProductReviewMedia> media;
  final ProductReviewSellerReply? sellerReply;

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

class _CustomerReviewCarousel extends StatefulWidget {
  const _CustomerReviewCarousel({
    required this.reviews,
    required this.titleColor,
    required this.secondaryColor,
    required this.sellerCompanyName,
  });

  final List<_ProductCustomerReview> reviews;
  final Color titleColor;
  final Color secondaryColor;
  final String sellerCompanyName;

  @override
  State<_CustomerReviewCarousel> createState() =>
      _CustomerReviewCarouselState();
}

class _CustomerReviewCarouselState extends State<_CustomerReviewCarousel> {
  static const Duration _autoSwipeInterval = Duration(seconds: 4);

  late final PageController _pageController;
  Timer? _autoSwipeTimer;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _syncAutoSwipeTimer();
  }

  @override
  void didUpdateWidget(covariant _CustomerReviewCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.reviews.length != widget.reviews.length) {
      _currentIndex = 0;
      if (_pageController.hasClients) {
        _pageController.jumpToPage(0);
      }
    }
    _syncAutoSwipeTimer();
  }

  void _syncAutoSwipeTimer() {
    _autoSwipeTimer?.cancel();
    if (widget.reviews.length <= 1) {
      _autoSwipeTimer = null;
      return;
    }

    _autoSwipeTimer = Timer.periodic(_autoSwipeInterval, (_) {
      if (!mounted || !_pageController.hasClients || widget.reviews.isEmpty) {
        return;
      }

      final nextIndex = (_currentIndex + 1) % widget.reviews.length;
      _pageController.animateToPage(
        nextIndex,
        duration: appMotionFrames(20),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _autoSwipeTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reviews = widget.reviews;
    if (reviews.isEmpty) {
      return const SizedBox.shrink();
    }

    if (reviews.length == 1) {
      return _CustomerReviewCard(
        review: reviews.first,
        titleColor: widget.titleColor,
        secondaryColor: widget.secondaryColor,
        sellerCompanyName: widget.sellerCompanyName,
      );
    }

    final hasReviewMedia = reviews.any((review) => review.media.isNotEmpty);
    final hasSellerReply = reviews.any(
      (review) => review.sellerReply?.message.trim().isNotEmpty ?? false,
    );

    return Column(
      children: [
        SizedBox(
          height: hasReviewMedia
              ? (hasSellerReply ? 314 : 248)
              : (hasSellerReply ? 218 : 132),
          child: HorizontalEndFade(
            child: PageView.builder(
              controller: _pageController,
              itemCount: reviews.length,
              onPageChanged: (index) {
                setState(() {
                  _currentIndex = index;
                });
              },
              itemBuilder: (context, index) {
                return _CustomerReviewCard(
                  review: reviews[index],
                  titleColor: widget.titleColor,
                  secondaryColor: widget.secondaryColor,
                  sellerCompanyName: widget.sellerCompanyName,
                );
              },
            ),
          ),
        ),
        if (reviews.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(reviews.length, (index) {
              final isActive = index == _currentIndex;
              return AnimatedContainer(
                duration: appMotionFrames(10),
                width: isActive ? 18 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: isActive
                      ? widget.titleColor
                      : widget.secondaryColor.withOpacity(0.24),
                  borderRadius: const BorderRadius.all(Radius.circular(999)),
                ),
              );
            }),
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
  });

  final _ProductCustomerReview review;
  final Color titleColor;
  final Color secondaryColor;
  final String sellerCompanyName;

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
          CustomerReviewMediaStrip(media: review.media, tileSize: 76),
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

class _RelatedProductCard extends StatelessWidget {
  const _RelatedProductCard({
    required this.product,
    this.showTopSellerBadge = false,
    this.platformId = '',
  });

  final Product product;
  final bool showTopSellerBadge;
  final String platformId;

  bool get _hasSalesPrice =>
      product.salesPrice != null && product.salesPrice! >= 0;
  bool get _showsOriginalPrice =>
      _hasSalesPrice && product.salesPrice! < product.originalPrice;

  int? get _discountPercentValue {
    final salesPrice = product.salesPrice;
    if (salesPrice == null || product.originalPrice <= 0) {
      return null;
    }

    final discountAmount = product.originalPrice - salesPrice;
    if (discountAmount <= 0) {
      return null;
    }

    final percent = ((discountAmount / product.originalPrice) * 100).round();
    return percent > 0 ? percent : null;
  }

  bool get _showsTopSellerInlineBadge => showTopSellerBadge;
  bool get _showsTopRatedInlineBadge =>
      product.rating >= 4.5 && product.rating <= 5;
  bool get _showsDiscountInlineBadge => _discountPercentValue != null;

  double get _displayPrice =>
      _hasSalesPrice ? product.salesPrice! : product.originalPrice;

  TextStyle _inlineBadgeTextStyle(BuildContext context) {
    return Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
          height: 1,
        ) ??
        const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
          height: 1,
        );
  }

  Widget _buildSecondaryRowBadge(
    BuildContext context, {
    required String label,
    required Color color,
  }) {
    final compactStyle = _inlineBadgeTextStyle(context).copyWith(fontSize: 9.4);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2.3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: const BorderRadius.all(Radius.circular(8)),
      ),
      child: Text(label, style: compactStyle),
    );
  }

  Widget _buildImage({required Color primaryColor, required bool hasImage}) {
    final fallback = _ProductDetailsHeroFallback(
      primaryColor: primaryColor,
      initial: product.name.trim().isEmpty
          ? '?'
          : product.name.trim()[0].toUpperCase(),
    );

    return Stack(
      children: [
        Positioned.fill(
          child: hasImage
              ? _ProductDetailsNetworkImage(
                  imageUrl: product.cardDisplayImageUrl,
                  fit: BoxFit.cover,
                  alignment: product.hasSavedCardImageCrop
                      ? Alignment.center
                      : Alignment(
                          product.cardImageAlignmentX,
                          product.cardImageAlignmentY,
                        ),
                  errorFallback: fallback,
                )
              : fallback,
        ),
      ],
    );
  }

  Widget _buildProductDetails(
    BuildContext context, {
    required Color primaryColor,
    required Color secondaryColor,
  }) {
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final productTitle = product.name.trim().isEmpty
            ? 'Unnamed Product'
            : product.name;
        final nameStyle = theme.textTheme.titleSmall?.copyWith(
          fontSize: 16,
          color: theme.colorScheme.onSurface,
          fontWeight: FontWeight.w500,
          letterSpacing: 0,
          height: 1,
        );
        final nameLayout = _resolveProductTextFit(
          context,
          text: productTitle,
          style: nameStyle,
          maxWidth: constraints.maxWidth,
          maxLines: 2,
          minFontSize: 10,
        );
        final showsCompactBadgeRow =
            _showsTopSellerInlineBadge ||
            _showsDiscountInlineBadge ||
            _showsTopRatedInlineBadge;
        final statsTextStyle = theme.textTheme.bodySmall?.copyWith(
          color: secondaryColor,
          fontWeight: FontWeight.w200,
          letterSpacing: 0,
          height: 1,
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              product.categoryLabel.trim().isEmpty
                  ? 'Uncategorized'
                  : product.categoryLabel,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelSmall?.copyWith(
                color: primaryColor,
                fontWeight: FontWeight.w700,
                letterSpacing: 0,
                height: 1.15,
              ),
            ),
            const SizedBox(height: 0),
            Text(
              productTitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: nameStyle?.copyWith(fontSize: nameLayout.fontSize),
            ),
            if (showsCompactBadgeRow) ...[
              const SizedBox(height: 2),
              Wrap(
                spacing: 1,
                runSpacing: 1,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (_showsTopSellerInlineBadge)
                    _buildSecondaryRowBadge(
                      context,
                      label: 'Top Seller',
                      color: const Color(0xFF00897B),
                    ),
                  if (_showsDiscountInlineBadge)
                    _buildSecondaryRowBadge(
                      context,
                      label: '-${_discountPercentValue!}%',
                      color: const Color(0xFFD32F2F),
                    ),
                  if (_showsTopRatedInlineBadge)
                    _buildSecondaryRowBadge(
                      context,
                      label: 'Top Rating',
                      color: const Color(0xFFF9A825),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 1),
            Wrap(
              spacing: 8,
              runSpacing: 2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _ProductDetailPrice(
                  amount: _displayPrice,
                  color: primaryColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 17,
                ),
                if (_showsOriginalPrice)
                  _ProductDetailPrice(
                    amount: product.originalPrice,
                    color: secondaryColor,
                    fontWeight: FontWeight.w400,
                    fontSize: 11,
                    decoration: TextDecoration.lineThrough,
                  ),
              ],
            ),
            const SizedBox(height: 1),
            Row(
              children: [
                const Icon(
                  Icons.star_rounded,
                  size: 16,
                  color: Color(0xFFF9A825),
                ),
                const SizedBox(width: 4),
                Text(product.rating.toStringAsFixed(1), style: statsTextStyle),
                const SizedBox(width: 10),
                Icon(
                  Icons.mode_comment_outlined,
                  size: 15,
                  color: secondaryColor,
                ),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    _formatProductCommentCount(product.commentCount),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: statsTextStyle,
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    final hasImage = product.cardDisplayImageUrl.isNotEmpty;

    return ProductCardTapLift(
      onTapWithHero: (heroTag) => openProductDetailsPage(
        context,
        product,
        heroTag: heroTag,
        platformId: platformId,
      ),
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: _homeProductCardSurfaceColor(theme),
          borderRadius: const BorderRadius.all(Radius.circular(8)),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: handleTap,
            child: SizedBox(
              height: 124,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SizedBox(
                    width: 128,
                    child: ProductCardTapLift.liftImage(
                      liftValue: liftValue,
                      child: Hero(
                        tag: heroTag,
                        child: _buildImage(
                          primaryColor: primaryColor,
                          hasImage: hasImage,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: _buildProductDetails(
                          context,
                          primaryColor: primaryColor,
                          secondaryColor: secondaryColor,
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
    final symbolFontSize = fontSize * 0.75;

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '\u20B1',
            style: TextStyle(
              color: color,
              fontWeight: fontWeight,
              fontSize: symbolFontSize,
              decoration: decoration,
              letterSpacing: 0,
              height: 1,
            ),
          ),
          TextSpan(
            text: formatCurrencyAmount(amount),
            style: TextStyle(
              color: color,
              fontWeight: fontWeight,
              fontSize: fontSize,
              decoration: decoration,
              letterSpacing: 0,
              height: 1,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductTextFitResult {
  const _ProductTextFitResult({
    required this.fontSize,
    required this.lineCount,
  });

  final double fontSize;
  final int lineCount;
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

_ProductTextFitResult _resolveProductTextFit(
  BuildContext context, {
  required String text,
  required TextStyle? style,
  required double maxWidth,
  required int maxLines,
  required double minFontSize,
}) {
  final mergedStyle = DefaultTextStyle.of(context).style.merge(style);
  final textDirection = Directionality.of(context);
  final textScaler = MediaQuery.textScalerOf(context);
  final startingFontSize = mergedStyle.fontSize ?? 14.0;
  var resolvedFontSize = startingFontSize;

  if (maxWidth.isFinite && maxWidth > 0) {
    while (resolvedFontSize > minFontSize) {
      final painter = TextPainter(
        text: TextSpan(
          text: text,
          style: mergedStyle.copyWith(fontSize: resolvedFontSize),
        ),
        maxLines: maxLines,
        textDirection: textDirection,
        textScaler: textScaler,
        ellipsis: '...',
      )..layout(maxWidth: maxWidth);

      if (!painter.didExceedMaxLines) {
        break;
      }

      resolvedFontSize -= 0.5;
    }
  }

  final finalFontSize = resolvedFontSize < minFontSize
      ? minFontSize
      : resolvedFontSize;
  final lineCount = _measureTextLineCount(
    context,
    text: text,
    style: mergedStyle.copyWith(fontSize: finalFontSize),
    maxWidth: maxWidth,
    maxLines: maxLines,
  );

  return _ProductTextFitResult(fontSize: finalFontSize, lineCount: lineCount);
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

Color _productDetailsSurfaceColor(BuildContext context) {
  return Theme.of(context).brightness == Brightness.dark
      ? Colors.black
      : Colors.white;
}

String _formatCurrency(double amount) => formatPesoCurrency(amount);

String _formatProductCommentCount(int commentCount) {
  final normalizedCount = commentCount < 0 ? 0 : commentCount;
  final label = normalizedCount == 1 ? 'comment' : 'comments';
  return '${_formatCompactCount(normalizedCount)} $label';
}

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
