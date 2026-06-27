// ============================================================================
// shop.dart
// ============================================================================
// Main shop page displaying categories and products with filtering,
// lazy loading, visual search support, and scroll-to-top functionality.
//
// Key Features:
// - Category carousel for filtering products by category
// - Lazy loading of products as user scrolls (loads 6 products per page)
// - Visual search mode for image-based product discovery
// - Scroll-to-top button that appears after scrolling down
// - Product cards with badges (discount, top seller, top rated)
// - Responsive 2-column product grid layout
// ============================================================================

import 'dart:async';

// Flutter material design components
import 'package:flutter/material.dart';

// Product model used throughout the shop page
import 'package:gms_shopping/models/product.dart';

// Navigation to product details page when user taps a product
import 'package:gms_shopping/product_details.dart';

// Repository for fetching categories from the backend
import 'package:gms_shopping/services/category_repository.dart';

// Repository for fetching products from the backend
import 'package:gms_shopping/services/product_repository.dart';

// Utility for formatting currency values (PHP symbol and amount)
import 'package:gms_shopping/utils/currency_format.dart';

// Utility for smooth animations (60fps motion framework)
import 'package:gms_shopping/utils/motion_60fps.dart';

// Session-based image caching to avoid reloading images
import 'package:gms_shopping/utils/session_image_cache.dart';

// Loading indicator with bouncing dots animation
import 'package:gms_shopping/widgets/bouncing_dots_loader.dart';

// "No more products" indicator shown at end of product list
import 'package:gms_shopping/widgets/no_more_products_indicator.dart';

// Widget displaying company/store identity on product cards
import 'package:gms_shopping/widgets/product_company_identity.dart';

// Widget that provides tap-lift animation effect on product cards
import 'package:gms_shopping/widgets/product_card_tap_lift.dart';

// ============================================================================
// ShopPage Widget
// ============================================================================
// The main entry point widget for the shop page.
// Manages the overall shop UI including category filtering and product display.
//
// Parameters:
// - surfaceColor: Background color for cards and surfaces
// - titleColor: Primary text color for titles
// - secondaryColor: Secondary text color for descriptions
// - primaryColor: Accent color for interactive elements and highlights
// - searchQuery: Text search query to filter products
// - visualSearchProducts: Products found via image search (optional)
// - isVisualSearchLoading: Whether visual search is in progress
// - visualSearchError: Error message if visual search failed
// - onClearVisualSearch: Callback to clear visual search and return to normal mode
// ============================================================================

class ShopPage extends StatefulWidget {
  const ShopPage({
    super.key,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.searchQuery,
    this.visualSearchProducts,
    this.isVisualSearchLoading = false,
    this.visualSearchError = '',
    this.onClearVisualSearch,
  });

  // Background color for cards and surfaces
  final Color surfaceColor;
  // Primary text color for titles and headings
  final Color titleColor;
  // Secondary text color for descriptions and labels
  final Color secondaryColor;
  // Accent color for buttons, links, and highlights
  final Color primaryColor;
  // Current text search query entered by the user
  final String searchQuery;
  // Products returned from visual/image search (null when not in visual search mode)
  final List<Product>? visualSearchProducts;
  // Whether visual search is currently loading
  final bool isVisualSearchLoading;
  // Error message if visual search failed
  final String visualSearchError;
  // Callback to clear visual search and return to normal shop view
  final VoidCallback? onClearVisualSearch;

  @override
  State<ShopPage> createState() => _ShopPageState();
}

// ============================================================================
// _ShopPageState
// ============================================================================
// State class for ShopPage. Manages:
// - Category and product data loading from repositories
// - Category selection and product filtering
// - Scroll position tracking for lazy loading and scroll-to-top button
// - Carousel opacity animation based on scroll position
// - Visual search mode integration
// ============================================================================

class _ShopPageState extends State<ShopPage> {
  // ========================================================================
  // Static Caches
  // ========================================================================
  // Cached categories to avoid re-fetching on rebuilds within the same session.
  // Persists across widget rebuilds but is cleared on app restart.
  static List<String>? _cachedCategories;
  // Cached products to avoid re-fetching on rebuilds within the same session.
  static List<Product>? _cachedProducts;
  // Cached selected category to maintain filter state across rebuilds.
  static String _cachedSelectedCategory = '';

  // ========================================================================
  // Timing Constants
  // ========================================================================
  // Delay before showing refresh indicator (prevents flashing for quick loads)
  static const Duration _refreshIndicatorDelay = Duration(milliseconds: 650);
  // Duration for carousel fade animation (11 frames at ~60fps ≈ 183ms)
  static final Duration _carouselFadeDuration = appMotionFrames(11);
  // Scroll distance in pixels needed to fully fade out the carousel (72px)
  static const double _carouselFadeScrollDistance = 72;
  // ========================================================================
  // Scroll Constants
  // ========================================================================
  // Scroll offset (in pixels) after which the scroll-to-top button becomes visible
  static const double _scrollToTopRevealOffset = 180;
  // Number of products to load per page during lazy loading
  static const int _lazyLoadPageSize = 6;
  // Distance from bottom of list (in pixels) to trigger loading more products
  static const double _lazyLoadTriggerExtent = 240;

  // ========================================================================
  // Repositories
  // ========================================================================
  // Repository for fetching categories from the backend API
  late final CategoryRepository _categoryRepository;
  // Repository for fetching products from the backend API
  late final ProductRepository _productRepository;

  // ========================================================================
  // Scroll Controller
  // ========================================================================
  // Controller for managing the shop's scroll position.
  // Used to detect scroll events for lazy loading and scroll-to-top button.
  late final ScrollController _scrollController;

  // ========================================================================
  // ValueNotifiers (Reactive State)
  // ========================================================================
  // Notifier containing the Future for loading categories.
  // UI rebuilds when a new Future is assigned.
  late final ValueNotifier<Future<List<String>>> _categoriesFutureNotifier;
  // Notifier containing the Future for loading products.
  // UI rebuilds when a new Future is assigned.
  late final ValueNotifier<Future<List<Product>>> _productsFutureNotifier;
  // Notifier for the currently selected category filter.
  // Empty string means "All Categories" is selected.
  late final ValueNotifier<String> _selectedCategoryNotifier;
  // Notifier for carousel opacity (0.0 to 1.0).
  // Fades out as user scrolls down to reveal more products.
  late final ValueNotifier<double> _carouselOpacityNotifier;
  // Notifier for scroll-to-top button visibility.
  // True when user has scrolled past _scrollToTopRevealOffset.
  late final ValueNotifier<bool> _showsScrollToTopButtonNotifier;
  // Signal notifier for triggering bottom overscroll loading.
  // Incremented to signal that more products should be loaded.
  late final ValueNotifier<int> _bottomOverscrollSignalNotifier;
  // Notifier for the number of products currently visible in the grid.
  // Used for lazy loading pagination.
  late final ValueNotifier<int> _visibleProductCountNotifier;

  // ========================================================================
  // Category Future Setter
  // ========================================================================
  // Sets the categories Future, but only updates if it's a different object.
  // Prevents unnecessary rebuilds when the same Future is reassigned.
  set _categoriesFuture(Future<List<String>> value) {
    if (!identical(_categoriesFutureNotifier.value, value)) {
      _categoriesFutureNotifier.value = value;
    }
  }

  // ========================================================================
  // Products Future Setter
  // ========================================================================
  // Sets the products Future, but only updates if it's a different object.
  // Prevents unnecessary rebuilds when the same Future is reassigned.
  set _productsFuture(Future<List<Product>> value) {
    if (!identical(_productsFutureNotifier.value, value)) {
      _productsFutureNotifier.value = value;
    }
  }

  // ========================================================================
  // Selected Category Getter/Setter
  // ========================================================================
  // Gets the currently selected category filter.
  // Empty string means "All Categories" is selected.
  String get _selectedCategory => _selectedCategoryNotifier.value;
  // Sets the selected category, but only triggers update if value changed.
  set _selectedCategory(String value) {
    if (_selectedCategoryNotifier.value != value) {
      _selectedCategoryNotifier.value = value;
    }
  }

  // ========================================================================
  // Carousel Opacity Getter/Setter
  // ========================================================================
  // Gets the current carousel opacity (0.0 = invisible, 1.0 = fully visible).
  double get _carouselOpacity => _carouselOpacityNotifier.value;
  // Sets carousel opacity, but only triggers update if change >= 0.01.
  // Threshold prevents micro-updates that cause jitter.
  set _carouselOpacity(double value) {
    if ((_carouselOpacityNotifier.value - value).abs() >= 0.01) {
      _carouselOpacityNotifier.value = value;
    }
  }

  // ========================================================================
  // Scroll-to-Top Button Visibility Getter/Setter
  // ========================================================================
  // Gets whether the scroll-to-top button should be visible.
  bool get _showsScrollToTopButton => _showsScrollToTopButtonNotifier.value;
  // Sets scroll-to-top button visibility, only updates if value changed.
  set _showsScrollToTopButton(bool value) {
    if (_showsScrollToTopButtonNotifier.value != value) {
      _showsScrollToTopButtonNotifier.value = value;
    }
  }

  // ========================================================================
  // Bottom Overscroll Signal Getter/Setter
  // ========================================================================
  // Gets the current overscroll signal value.
  // Incrementing this value triggers lazy loading of more products.
  int get _bottomOverscrollSignal => _bottomOverscrollSignalNotifier.value;
  // Sets the overscroll signal, only updates if value changed.
  set _bottomOverscrollSignal(int value) {
    if (_bottomOverscrollSignalNotifier.value != value) {
      _bottomOverscrollSignalNotifier.value = value;
    }
  }

  // ========================================================================
  // Visible Product Count Getter/Setter
  // ========================================================================
  // Gets the number of products currently visible (loaded for lazy loading).
  int get _visibleProductCount => _visibleProductCountNotifier.value;
  // Sets the visible product count, only updates if value changed.
  set _visibleProductCount(int value) {
    if (_visibleProductCountNotifier.value != value) {
      _visibleProductCountNotifier.value = value;
    }
  }

  // ========================================================================
  // initState
  // ========================================================================
  // Initializes the state. Sets up repositories, scroll controller,
  // and ValueNotifiers. Loads categories and products, using cache if available.
  // ========================================================================
  @override
  void initState() {
    super.initState();

    // Initialize repositories for API calls
    _categoryRepository = createCategoryRepository();
    _productRepository = createProductRepository();

    // Initialize scroll controller for tracking scroll position
    _scrollController = ScrollController();

    // Initialize ValueNotifiers with default values
    _selectedCategoryNotifier = ValueNotifier(_cachedSelectedCategory);
    _carouselOpacityNotifier = ValueNotifier(1); // Start with full opacity
    _showsScrollToTopButtonNotifier = ValueNotifier(false); // Hidden initially
    _bottomOverscrollSignalNotifier = ValueNotifier(0);
    _visibleProductCountNotifier = ValueNotifier(_lazyLoadPageSize);

    // Load categories - use cache if available, otherwise fetch from API
    final cachedCategories = _cachedCategories;
    if (cachedCategories != null && cachedCategories.isNotEmpty) {
      // Use cached categories and refresh in background
      _categoriesFutureNotifier = ValueNotifier(
        Future<List<String>>.value(cachedCategories),
      );
      unawaited(_refreshCategories(showLoading: false));
    } else {
      // No cache available, fetch from API
      _categoriesFutureNotifier = ValueNotifier(_loadCategories());
    }

    // Load products - use cache if available, otherwise fetch from API
    final cachedProducts = _cachedProducts;
    if (cachedProducts != null && cachedProducts.isNotEmpty) {
      // Use cached products and refresh in background
      _productsFutureNotifier = ValueNotifier(
        Future<List<Product>>.value(cachedProducts),
      );
      unawaited(_refreshProducts(showLoading: false));
    } else {
      // No cache available, fetch from API
      _productsFutureNotifier = ValueNotifier(_loadProducts());
    }
  }

  // ========================================================================
  // _loadCategories
  // ========================================================================
  // Fetches categories from the repository and caches them.
  // Returns a list of category names.
  // ========================================================================
  Future<List<String>> _loadCategories() async {
    final categories = await _categoryRepository.fetchCategories();
    _cachedCategories = categories; // Update static cache
    return categories;
  }

  // ========================================================================
  // _loadProducts
  // ========================================================================
  // Fetches all products from the repository and caches them.
  // Returns a list of Product objects.
  // ========================================================================
  Future<List<Product>> _loadProducts() async {
    final products = await _productRepository.fetchProducts();
    _cachedProducts = products; // Update static cache
    return products;
  }

  // ========================================================================
  // _forceReloadCategories
  // ========================================================================
  // Forces a fresh fetch of categories from the API, bypassing cache.
  // Updates the static cache with new data.
  // ========================================================================
  Future<List<String>> _forceReloadCategories() async {
    final categories = await _categoryRepository.fetchCategories(
      forceRefresh: true,
    );
    _cachedCategories = categories;
    return categories;
  }

  // ========================================================================
  // _forceReloadProducts
  // ========================================================================
  // Forces a fresh fetch of products from the API, bypassing cache.
  // Updates the static cache with new data.
  // ========================================================================
  Future<List<Product>> _forceReloadProducts() async {
    final products = await _productRepository.fetchProducts(forceRefresh: true);
    _cachedProducts = products;
    return products;
  }

  // ========================================================================
  // _refreshCategories
  // ========================================================================
  // Refreshes the categories list. Optionally shows a loading indicator.
  // If showLoading is false, refreshes silently in the background.
  // ========================================================================
  Future<void> _refreshCategories({bool showLoading = true}) async {
    final nextFuture = _forceReloadCategories();

    // Update the notifier to trigger loading state in UI
    if (showLoading) {
      _categoriesFuture = nextFuture;
    }

    try {
      final categories = await nextFuture;

      // If not showing loading, update the Future value after completion
      if (!showLoading && mounted) {
        _categoriesFuture = Future<List<String>>.value(categories);
      }
    } catch (_) {
      // Errors are handled by the FutureBuilder in the build method
    }
  }

  // ========================================================================
  // _refreshProducts
  // ========================================================================
  // Refreshes the products list. Optionally shows a loading indicator.
  // If showLoading is false, refreshes silently in the background.
  // ========================================================================
  Future<void> _refreshProducts({bool showLoading = true}) async {
    final nextFuture = _forceReloadProducts();

    if (showLoading) {
      _productsFuture = nextFuture;
    }

    try {
      final products = await nextFuture;

      if (!showLoading && mounted) {
        _productsFuture = Future<List<Product>>.value(products);
      }
    } catch (_) {
      // The FutureBuilder below shows the backend error state.
    }
  }

  // ========================================================================
  // _refreshShopData
  // ========================================================================
  // Refreshes both categories and products in parallel.
  // Waits for all refreshes and a delay before completing.
  // Used for pull-to-refresh functionality.
  // ========================================================================
  Future<void> _refreshShopData() async {
    await Future.wait<dynamic>([
      _refreshCategories(showLoading: false),
      _refreshProducts(showLoading: false),
      // Delay to prevent loading indicator from flashing
      Future<void>.delayed(_refreshIndicatorDelay),
    ]);
  }

  // ========================================================================
  // _updateScrollToTopButtonVisibility
  // ========================================================================
  // Updates the scroll-to-top button visibility based on scroll offset.
  // Shows the button when scrolled past _scrollToTopRevealOffset (180px).
  // ========================================================================
  void _updateScrollToTopButtonVisibility(double offset) {
    // Calculate if button should be visible
    final shouldShowScrollToTopButton = offset > _scrollToTopRevealOffset;
    // Skip if no change or widget unmounted
    if (_showsScrollToTopButton == shouldShowScrollToTopButton || !mounted) {
      return;
    }

    _showsScrollToTopButton = shouldShowScrollToTopButton;
  }

  // ========================================================================
  // _updateCarouselOpacity
  // ========================================================================
  // Updates the carousel opacity with threshold check to prevent jitter.
  // Opacity changes are ignored if the difference is less than 0.01.
  // ========================================================================
  void _updateCarouselOpacity(double nextOpacity) {
    // Skip if change is negligible or widget unmounted
    if ((_carouselOpacity - nextOpacity).abs() < 0.01 || !mounted) {
      return;
    }

    _carouselOpacity = nextOpacity;
  }

  // ========================================================================
  // _handleShopScrollNotification
  // ========================================================================
  // Handles scroll notifications for:
  // - Scroll-to-top button visibility
  // - Carousel opacity fade effect
  // - Lazy loading trigger
  // - Bottom overscroll detection
  //
  // Returns false to allow the notification to propagate.
  // ========================================================================
  bool _handleShopScrollNotification(
    ScrollNotification notification, {
    required int totalProductCount,
  }) {
    // Only handle top-level vertical scroll notifications
    if (notification.depth != 0 || notification.metrics.axis != Axis.vertical) {
      return false;
    }

    // Get current scroll offset (clamped to 0 minimum)
    final offset = notification.metrics.pixels <= 0
        ? 0.0
        : notification.metrics.pixels;

    // Update scroll-to-top button visibility
    _updateScrollToTopButtonVisibility(offset);

    // Calculate remaining distance to bottom of scroll
    final remainingDistance = (notification.metrics.maxScrollExtent - offset)
        .clamp(0.0, double.infinity);
    // Check if there are more products to load
    final hasMoreProducts = _resolvedVisibleProductCount(totalProductCount) <
        totalProductCount;
    var loadedMoreProducts = false;

    // Trigger lazy loading if near bottom and more products available
    if (hasMoreProducts && remainingDistance <= _lazyLoadTriggerExtent) {
      loadedMoreProducts = _loadMoreProductsIfNeeded(totalProductCount);
    }

    // Handle carousel opacity based on scroll direction
    if (offset == 0) {
      // At top, show carousel at full opacity
      _updateCarouselOpacity(1);
    } else if (notification is ScrollUpdateNotification) {
      final scrollDelta = notification.scrollDelta ?? 0;

      if (scrollDelta < 0) {
        // Scrolling up, show carousel
        _updateCarouselOpacity(1);
      } else if (scrollDelta > 0) {
        // Scrolling down, fade out carousel
        final nextOpacity =
            (1 - (offset / _carouselFadeScrollDistance)).clamp(0.0, 1.0).toDouble();
        _updateCarouselOpacity(nextOpacity);
      }
    }

    // Handle bottom overscroll (pull down at bottom of list)
    if (notification is OverscrollNotification &&
        notification.overscroll > 0 &&
        notification.metrics.pixels >= notification.metrics.maxScrollExtent) {
      // Trigger overscroll signal if not already loading more
      if (!loadedMoreProducts &&
          !_loadMoreProductsIfNeeded(totalProductCount)) {
        _bottomOverscrollSignal = _bottomOverscrollSignal + 1;
      }
    }

    return false; // Allow notification to propagate
  }

  // ========================================================================
  // _resolvedVisibleProductCount
  // ========================================================================
  // Gets the current visible product count, capped at total product count.
  // ========================================================================
  // ========================================================================
  // _resolvedVisibleProductCount
  // ========================================================================
  // Gets the current visible product count, capped at total product count.
  // Prevents showing more products than available.
  // ========================================================================
  int _resolvedVisibleProductCount(int totalCount) {
    if (totalCount <= 0) {
      return 0;
    }

    return _visibleProductCount > totalCount ? totalCount : _visibleProductCount;
  }

  // ========================================================================
  // _loadMoreProductsIfNeeded
  // ========================================================================
  // Loads the next page of products if there are more to load.
  // Returns true if more products were loaded, false if at end of list.
  // ========================================================================
  bool _loadMoreProductsIfNeeded(int totalCount) {
    // Already at end, nothing to load
    if (_visibleProductCount >= totalCount) {
      return false;
    }

    // Calculate next page of products
    final nextVisibleProductCount = _visibleProductCount + _lazyLoadPageSize;
    _visibleProductCount = nextVisibleProductCount > totalCount
        ? totalCount
        : nextVisibleProductCount;
    return true;
  }

  // ========================================================================
  // _resetLazyLoadedProducts
  // ========================================================================
  // Resets the visible product count to initial page size.
  // Called when category changes to restart lazy loading.
  // ========================================================================
  void _resetLazyLoadedProducts() {
    _visibleProductCount = _lazyLoadPageSize;
  }

  // ========================================================================
  // _scrollShopToTop
  // ========================================================================
  // Animates scroll position to the top of the product list.
  // Uses easeOutCubic curve for smooth deceleration.
  // ========================================================================
  Future<void> _scrollShopToTop() async {
    // Check if scroll controller is attached
    if (!_scrollController.hasClients) {
      return;
    }

    // Animate to top with smooth easing
    await _scrollController.animateTo(
      0,
      duration: appMotionFrames(19), // ~317ms at 60fps
      curve: Curves.easeOutCubic,
    );
  }

  // ========================================================================
  // dispose
  // ========================================================================
  // Cleans up resources when the widget is removed.
  // Disposes scroll controller and all ValueNotifiers.
  // ========================================================================
  @override
  void dispose() {
    // Dispose scroll controller to prevent memory leaks
    _scrollController.dispose();
    // Dispose all ValueNotifiers to free resources
    _categoriesFutureNotifier.dispose();
    _productsFutureNotifier.dispose();
    _selectedCategoryNotifier.dispose();
    _carouselOpacityNotifier.dispose();
    _showsScrollToTopButtonNotifier.dispose();
    _bottomOverscrollSignalNotifier.dispose();
    _visibleProductCountNotifier.dispose();
    super.dispose();
  }

  // ========================================================================
  // didUpdateWidget
  // ========================================================================
  // Called when the widget configuration changes.
  // Resets lazy loading when search parameters change.
  // ========================================================================
  @override
  void didUpdateWidget(covariant ShopPage oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Check if search-related parameters changed
    if (oldWidget.searchQuery != widget.searchQuery ||
        oldWidget.visualSearchProducts != widget.visualSearchProducts ||
        oldWidget.isVisualSearchLoading != widget.isVisualSearchLoading ||
        oldWidget.visualSearchError != widget.visualSearchError) {
      // Reset visible product count for new search results
      _resetLazyLoadedProducts();
    }
  }

  // ========================================================================
  // _resolveSelectedCategory
  // ========================================================================
  // Resolves which category should be selected.
  // Falls back to first category if preferred category is invalid.
  // ========================================================================
  String _resolveSelectedCategory(
    List<String> categories, {
    String? preferredCategory,
  }) {
    final resolvedPreferredCategory = preferredCategory ?? _selectedCategory;

    // No categories available
    if (categories.isEmpty) {
      return '';
    }

    // Use preferred category if valid
    if (resolvedPreferredCategory.isNotEmpty &&
        categories.contains(resolvedPreferredCategory)) {
      return resolvedPreferredCategory;
    }

    // Fall back to first category
    return categories.first;
  }

  // ========================================================================
  // _buildVisibleCategories
  // ========================================================================
  // Builds list of categories that have visible products.
  // Deduplicates categories and filters empty values.
  // ========================================================================
  List<String> _buildVisibleCategories(
    List<String> categories,
    List<Product> products,
  ) {
    final seenProductCategories = <String>{};
    final productBackedCategories = <String>[];

    // Collect categories from visible products
    for (final product in products) {
      if (!_isVisibleInShop(product)) {
        continue;
      }

      for (final category in product.categoryList) {
        final normalizedCategory = category.trim().toLowerCase();
        // Skip empty or duplicate categories
        if (category.isEmpty || seenProductCategories.contains(normalizedCategory)) {
          continue;
        }

        seenProductCategories.add(normalizedCategory);
        productBackedCategories.add(category);
      }
    }

    // If no predefined categories, use product-backed categories
    if (categories.isEmpty) {
      return productBackedCategories;
    }

    // Filter predefined categories to only those with visible products
    return categories.where((category) {
      final normalizedCategory = category.trim().toLowerCase();
      return normalizedCategory.isNotEmpty &&
          seenProductCategories.contains(normalizedCategory);
    }).toList();
  }

  // ========================================================================
  // _isVisibleInShop
  // ========================================================================
  // Checks if a product is visible to users.
  // Uses global visibility check from utils.
  // ========================================================================
  bool _isVisibleInShop(Product product) => isProductVisibleToUsers(product);

  // ========================================================================
  // _matchesSearchQuery
  // ========================================================================
  // Checks if a product matches the search query.
  // Searches in product name, category, and description.
  // ========================================================================
  bool _matchesSearchQuery(
    Product product, {
    required String normalizedQuery,
  }) {
    // Empty query matches all products
    if (normalizedQuery.isEmpty) {
      return true;
    }

    // Check if query appears in name, category, or description
    return product.name.toLowerCase().contains(normalizedQuery) ||
        product.categoryLabel.toLowerCase().contains(normalizedQuery) ||
        product.description.toLowerCase().contains(normalizedQuery);
  }

  // ========================================================================
  // _filterProductsByCategory
  // ========================================================================
  // Filters products by selected category and search query.
  // Only returns products that are visible and match criteria.
  // ========================================================================
  List<Product> _filterProductsByCategory(
    List<Product> products,
    String selectedCategory,
  ) {
    final normalizedSelectedCategory = selectedCategory.trim().toLowerCase();
    final normalizedQuery = widget.searchQuery.trim().toLowerCase();

    // No category selected, return empty
    if (normalizedSelectedCategory.isEmpty) {
      return const <Product>[];
    }

    // Filter products by visibility, search match, and category
    return products.where((product) {
      return _isVisibleInShop(product) &&
          _matchesSearchQuery(
            product,
            normalizedQuery: normalizedQuery,
          ) &&
          product.belongsToCategory(normalizedSelectedCategory);
    }).toList();
  }

  // ========================================================================
  // build
  // ========================================================================
  // Main build method for the shop page.
  // Builds nested FutureBuilders for categories and products.
  // Includes category carousel, product grid, scroll-to-top button.
  // ========================================================================
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Calculate minimum height for product section
        final sectionMinHeight = (constraints.maxHeight -
                18 - // Top padding
                16)  // Bottom padding
            .clamp(0.0, double.infinity)
            .toDouble();

        // Outer FutureBuilder for categories
        return ValueListenableBuilder<Future<List<String>>>(
          valueListenable: _categoriesFutureNotifier,
          builder: (context, categoriesFuture, child) {
            return FutureBuilder<List<String>>(
              future: categoriesFuture,
              builder: (context, categoriesSnapshot) {
                final categories = categoriesSnapshot.data ?? const <String>[];
                // Show loading indicator only if waiting and no data
                final categoriesAreLoading =
                    categoriesSnapshot.connectionState ==
                            ConnectionState.waiting &&
                        categories.isEmpty;

                // Inner FutureBuilder for products
                return ValueListenableBuilder<Future<List<Product>>>(
                  valueListenable: _productsFutureNotifier,
                  builder: (context, productsFuture, child) {
                    return FutureBuilder<List<Product>>(
                      future: productsFuture,
                      builder: (context, productsSnapshot) {
                        final products =
                            productsSnapshot.data ?? const <Product>[];

                        // Get IDs of top-selling products for badge display
                        final topSellerIds = {
                          for (final product
                              in _shopBuildTopSellingProducts(products))
                            product.id,
                        };

                        // Check for server errors
                        final hasServerError =
                            (categoriesSnapshot.hasError &&
                                    categories.isEmpty) ||
                                (productsSnapshot.hasError &&
                                    products.isEmpty);

                        // Check if in visual search mode
                        final isVisualSearchMode =
                            widget.isVisualSearchLoading ||
                            widget.visualSearchProducts != null ||
                            widget.visualSearchError.trim().isNotEmpty;

                        // Build visible categories list
                        final visibleCategories = isVisualSearchMode
                            ? const <String>[]
                            : _buildVisibleCategories(categories, products);

                        // Selected category notifier
                        return ValueListenableBuilder<String>(
                          valueListenable: _selectedCategoryNotifier,
                          builder: (context, selectedCategoryValue, child) {
                            // Resolve which category to show
                            final selectedCategory = _resolveSelectedCategory(
                              visibleCategories,
                              preferredCategory: selectedCategoryValue,
                            );

                            // Filter products based on mode
                            final filteredProducts = isVisualSearchMode
                                ? (widget.visualSearchProducts ??
                                        const <Product>[])
                                    .where(_isVisibleInShop)
                                    .toList(growable: false)
                                : _filterProductsByCategory(
                                    products,
                                    selectedCategory,
                                  );

                            // Stack contains: product list, category carousel, scroll-to-top button
                            return Stack(
                              children: [
                                // Product list with pull-to-refresh
                                Positioned.fill(
                                  top: 0,
                                  child: RefreshIndicator(
                                    onRefresh: _refreshShopData,
                                    child: ValueListenableBuilder<int>(
                                      valueListenable:
                                          _visibleProductCountNotifier,
                                      builder: (
                                        context,
                                        visibleProductCount,
                                        child,
                                      ) {
                                        // Calculate visible products count
                                        final resolvedVisibleProductCount =
                                            visibleProductCount >
                                                    filteredProducts.length
                                                ? filteredProducts.length
                                                : visibleProductCount;
                                        // Get slice of products to display
                                        final visibleProducts = filteredProducts
                                            .take(resolvedVisibleProductCount)
                                            .toList(growable: false);

                                        // Show "no more products" indicator if products exist
                                        final showsNoMoreIndicator =
                                            visibleProducts.isNotEmpty;

                                        // Scroll notification listener for lazy loading
                                        return NotificationListener<
                                            ScrollNotification>(
                                          onNotification: (notification) =>
                                              _handleShopScrollNotification(
                                                notification,
                                                totalProductCount:
                                                    filteredProducts.length,
                                              ),
                                          child: RepaintBoundary(
                                            child: ListView.builder(
                                              controller: _scrollController,
                                              physics:
                                                  const AlwaysScrollableScrollPhysics(),
                                              padding:
                                                  const EdgeInsets.fromLTRB(
                                                0,
                                                18,
                                                0,
                                                0,
                                              ),
                                              // 2 items: product section + no more indicator
                                              itemCount:
                                                  showsNoMoreIndicator ? 2 : 1,
                                              itemBuilder: (context, index) {
                                                // Item 0: Product section
                                                if (index == 0) {
                                                  return Padding(
                                                    padding:
                                                        const EdgeInsets.fromLTRB(
                                                      10,
                                                      0,
                                                      10,
                                                      0,
                                                    ),
                                                    child: _ShopProductsSection(
                                                      surfaceColor:
                                                          widget.surfaceColor,
                                                      titleColor:
                                                          widget.titleColor,
                                                      secondaryColor:
                                                          widget.secondaryColor,
                                                      primaryColor:
                                                          widget.primaryColor,
                                                      selectedCategory:
                                                          isVisualSearchMode
                                                              ? ''
                                                              : selectedCategory,
                                                      searchQuery:
                                                          widget.searchQuery,
                                                      products: visibleProducts,
                                                      topSellerIds:
                                                          topSellerIds,
                                                      isLoading:
                                                          isVisualSearchMode
                                                              ? widget
                                                                  .isVisualSearchLoading
                                                              : productsSnapshot
                                                                          .connectionState ==
                                                                      ConnectionState
                                                                          .waiting &&
                                                                  products
                                                                      .isEmpty,
                                                      errorMessage:
                                                          isVisualSearchMode &&
                                                                  widget
                                                                      .visualSearchError
                                                                      .trim()
                                                                      .isNotEmpty
                                                              ? widget
                                                                  .visualSearchError
                                                              : productsSnapshot
                                                                          .hasError &&
                                                                      products
                                                                          .isEmpty
                                                                  ? productsSnapshot
                                                                      .error
                                                                      .toString()
                                                                  : null,
                                                      minHeight:
                                                          sectionMinHeight,
                                                      isVisualSearchMode:
                                                          isVisualSearchMode,
                                                      onClearVisualSearch: widget
                                                          .onClearVisualSearch,
                                                    ),
                                                  );
                                                }

                                                // Item 1: No more products indicator
                                                return Padding(
                                                  padding:
                                                      const EdgeInsets.fromLTRB(
                                                    10,
                                                    18,
                                                    10,
                                                    0,
                                                  ),
                                                  child:
                                                      ValueListenableBuilder<
                                                          int>(
                                                    valueListenable:
                                                        _bottomOverscrollSignalNotifier,
                                                    builder: (
                                                      context,
                                                      bottomOverscrollSignal,
                                                      child,
                                                    ) {
                                                      return NoMoreProductsIndicator(
                                                        scrollController:
                                                            _scrollController,
                                                        overscrollSignal:
                                                            bottomOverscrollSignal,
                                                        primaryColor:
                                                            widget.primaryColor,
                                                        secondaryColor:
                                                            widget
                                                                .secondaryColor,
                                                      );
                                                    },
                                                  ),
                                                );
                                              },
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ),

                                // Category carousel (hidden in visual search mode)
                                if (!isVisualSearchMode)
                                  Positioned(
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    child: ValueListenableBuilder<double>(
                                      valueListenable:
                                          _carouselOpacityNotifier,
                                      builder:
                                          (context, carouselOpacity, child) {
                                        return _ShopCategoryCarousel(
                                          categories: visibleCategories,
                                          selectedCategory: selectedCategory,
                                          isLoading: categoriesAreLoading,
                                          backgroundColor: widget.surfaceColor,
                                          activeColor: widget.primaryColor,
                                          inactiveColor: widget.secondaryColor,
                                          opacity: carouselOpacity,
                                          showEmptyMessage: !hasServerError,
                                          onTap: _handleCategorySelected,
                                        );
                                      },
                                    ),
                                  ),

                                // Scroll-to-top floating button
                                Positioned(
                                  right: 16,
                                  bottom: 18,
                                  child: ValueListenableBuilder<bool>(
                                    valueListenable:
                                        _showsScrollToTopButtonNotifier,
                                    builder: (
                                      context,
                                      showsScrollToTopButton,
                                      child,
                                    ) {
                                      // Animated switcher for smooth button appearance
                                      return AnimatedSwitcher(
                                        duration: appMotionFrames(13),
                                        switchInCurve: Curves.easeOutCubic,
                                        switchOutCurve: Curves.easeInCubic,
                                        transitionBuilder: (child, animation) {
                                          // Slide up + fade animation
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
                                        // Show/hide scroll-to-top button
                                        child: showsScrollToTopButton
                                            ? FloatingActionButton.small(
                                                key: const ValueKey(
                                                  'shop-scroll-to-top-button',
                                                ),
                                                heroTag:
                                                    'shop-scroll-to-top-button',
                                                backgroundColor:
                                                    widget.primaryColor,
                                                foregroundColor:
                                                    widget.surfaceColor,
                                                onPressed: _scrollShopToTop,
                                                child: const Icon(
                                                  Icons
                                                      .keyboard_arrow_up_rounded,
                                                ),
                                              )
                                            : const SizedBox.shrink(
                                                key: ValueKey(
                                                  'shop-scroll-to-top-button-hidden',
                                                ),
                                              ),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            );
                          },
                        );
                      },
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }

  // ========================================================================
  // _handleCategorySelected
  // ========================================================================
  // Called when user taps a category chip.
  // Updates selected category and resets lazy loading.
  // ========================================================================
  void _handleCategorySelected(String category) {
    _selectedCategory = category;
    _cachedSelectedCategory = category;
    _resetLazyLoadedProducts();
  }
}

// ========================================================================
// _ShopCategoryCarousel
// ========================================================================
// Horizontal scrollable list of category filter chips.
// Fades based on scroll position and shows loading/empty states.
// ========================================================================
class _ShopCategoryCarousel extends StatelessWidget {
  const _ShopCategoryCarousel({
    required this.categories,
    required this.selectedCategory,
    required this.isLoading,
    required this.backgroundColor,
    required this.activeColor,
    required this.inactiveColor,
    required this.opacity,
    required this.showEmptyMessage,
    required this.onTap,
  });

  // List of category names to display
  final List<String> categories;
  // Currently selected category (used for highlighting)
  final String selectedCategory;
  // Whether categories are still loading
  final bool isLoading;
  // Background color for the carousel container
  final Color backgroundColor;
  // Color for active/selected category chip
  final Color activeColor;
  // Color for inactive/unselected category chip
  final Color inactiveColor;
  // Opacity for fade animation based on scroll
  final double opacity;
  // Whether to show "No product categories yet" message
  final bool showEmptyMessage;
  // Callback when a category chip is tapped
  final ValueChanged<String> onTap;

  // Fixed height for the carousel
  static const double height = 38;

  @override
  Widget build(BuildContext context) {
    // Ignore pointer events when fully faded out
    return IgnorePointer(
      ignoring: opacity <= 0.01,
      child: AnimatedOpacity(
        duration: _ShopPageState._carouselFadeDuration,
        opacity: opacity,
        child: Container(
          decoration: BoxDecoration(
            color: backgroundColor,
            // Subtle shadow for depth
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                offset: const Offset(0, 5),
                blurRadius: 14,
              ),
            ],
          ),
          child: SizedBox(
            height: height,
            // Show loading indicator while fetching categories
            child: isLoading
                ? Center(
                    child: BouncingDotsLoader(
                      activeColor: activeColor,
                      inactiveColor: inactiveColor.withOpacity(0.28),
                    ),
                  )
                // Show empty message if no categories
                : categories.isEmpty
                    ? showEmptyMessage
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            children: [
                              Align(
                                alignment: Alignment.bottomCenter,
                                child: Text(
                                  'No product categories yet',
                                  style:
                                      Theme.of(context).textTheme.bodySmall?.copyWith(
                                            color: inactiveColor,
                                            fontWeight: FontWeight.w600,
                                          ),
                                ),
                              ),
                            ],
                          )
                        : const SizedBox.shrink()
                    // Show category chips list
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        scrollDirection: Axis.horizontal,
                        itemCount: categories.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (context, index) {
                          final category = categories[index];
                          // Check if this category is selected
                          final isActive = category == selectedCategory;

                          return InkWell(
                            onTap: () => onTap(category),
                            borderRadius: BorderRadius.circular(4),
                            overlayColor: const WidgetStatePropertyAll(
                              Colors.transparent,
                            ),
                            splashFactory: NoSplash.splashFactory,
                            highlightColor: Colors.transparent,
                            splashColor: Colors.transparent,
                            hoverColor: Colors.transparent,
                            focusColor: Colors.transparent,
                            // Animated container for smooth active state transition
                            child: AnimatedContainer(
                              duration: appMotionFrames(11),
                              padding: const EdgeInsets.fromLTRB(4, 6, 4, 8),
                              decoration: BoxDecoration(
                                // Bottom border indicates active selection
                                border: Border(
                                  bottom: BorderSide(
                                    color:
                                        isActive ? activeColor : Colors.transparent,
                                    width: 2,
                                  ),
                                ),
                              ),
                              child: Align(
                                alignment: Alignment.bottomCenter,
                                child: Text(
                                  category,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style:
                                      Theme.of(context).textTheme.bodySmall?.copyWith(
                                            // Active category uses primary color
                                            color: isActive
                                                ? activeColor
                                                : inactiveColor,
                                            fontWeight: isActive
                                                ? FontWeight.w700
                                                : FontWeight.w600,
                                          ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ),
      ),
    );
  }
}

// ========================================================================
// _ShopProductsSection
// ========================================================================
// Displays a grid of products with loading, error, and empty states.
// Uses a 2-column layout with height-balanced distribution.
// ========================================================================
class _ShopProductsSection extends StatelessWidget {
  const _ShopProductsSection({
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.selectedCategory,
    required this.searchQuery,
    required this.products,
    required this.topSellerIds,
    required this.isLoading,
    required this.errorMessage,
    required this.minHeight,
    this.isVisualSearchMode = false,
    this.onClearVisualSearch,
  });

  // Colors for theming
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;

  // Category and search context
  final String selectedCategory;
  final String searchQuery;

  // Products to display
  final List<Product> products;

  // IDs of top-selling products (for badge display)
  final Set<String> topSellerIds;

  // Loading and error states
  final bool isLoading;
  final String? errorMessage;

  // Minimum height for the section
  final double minHeight;

  // Visual search mode flag
  final bool isVisualSearchMode;

  // Callback to clear visual search
  final VoidCallback? onClearVisualSearch;

  // Spacing between product columns
  static const double _productColumnSpacing = 12;
  // Number of columns in the grid
  static const int _productColumnCount = 2;

  // ========================================================================
  // _estimateLineCount
  // ========================================================================
  // Estimates how many lines text will occupy based on character count.
  // Used to calculate product card heights for balanced layout.
  // ========================================================================
  int _estimateLineCount(
    String text, {
    required int charsPerLine,
    int minLines = 1,
    int? maxLines,
  }) {
    final normalized = text.trim();
    var lines = normalized.isEmpty
        ? minLines
        : (normalized.length / charsPerLine).ceil();

    if (lines < minLines) {
      lines = minLines;
    }

    if (maxLines != null && lines > maxLines) {
      lines = maxLines;
    }

    return lines;
  }

  // ========================================================================
  // _estimateProductCardHeight
  // ========================================================================
  // Estimates the height of a product card based on name length and features.
  // Base height + name lines + company identity badge if present.
  // ========================================================================
  double _estimateProductCardHeight(Product product) {
    // Estimate name line count (max 2 lines)
    final nameLines = _estimateLineCount(
      product.name,
      charsPerLine: 16,
      maxLines: 2,
    );

    // Base height + name lines + company badge
    return 238 + (nameLines * 18) + (product.hasCompanyIdentity ? 24 : 0);
  }

  // ========================================================================
  // _buildProductColumns
  // ========================================================================
  // Distributes products into columns for balanced height layout.
  // Products are assigned to the shortest column to minimize height difference.
  // ========================================================================
  List<List<Product>> _buildProductColumns(List<Product> products) {
    // Initialize empty columns
    final columns = List<List<Product>>.generate(
      _productColumnCount,
      (_) => <Product>[],
    );
    // Track estimated heights of each column
    final estimatedHeights = List<double>.filled(_productColumnCount, 0);

    // Distribute products to shortest column
    for (final product in products) {
      var targetColumn = 0;

      // Find shortest column
      for (var index = 1; index < estimatedHeights.length; index++) {
        if (estimatedHeights[index] < estimatedHeights[targetColumn]) {
          targetColumn = index;
        }
      }

      // Add product to target column and update height
      columns[targetColumn].add(product);
      estimatedHeights[targetColumn] += _estimateProductCardHeight(product);
    }

    return columns;
  }

  @override
  Widget build(BuildContext context) {
    // Check for error state
    final hasError = errorMessage != null && errorMessage!.isNotEmpty;
    // Show header only when displaying products
    final showsHeaderBlock = !hasError && !isLoading;

    // Build product columns for layout
    final productColumns = _buildProductColumns(products);

    // Determine section title based on mode
    final sectionTitle = isVisualSearchMode
        ? 'Image Search Results'
        : selectedCategory.isEmpty
            ? 'Products'
            : '$selectedCategory Products';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with title and clear button (visual search mode)
        if (showsHeaderBlock) ...[
          Row(
            children: [
              Expanded(
                child: Text(
                  sectionTitle,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              // Clear visual search button
              if (isVisualSearchMode && onClearVisualSearch != null)
                Tooltip(
                  message: 'Clear image search',
                  child: Material(
                    color: surfaceColor,
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: onClearVisualSearch,
                      customBorder: const CircleBorder(),
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: Icon(
                          Icons.close_rounded,
                          size: 18,
                          color: secondaryColor,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
        ],

        // Error state
        if (hasError)
          SizedBox(
            height: minHeight,
            child: Center(
              child: _ShopStateCard(
                surfaceColor: surfaceColor,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
                primaryColor: primaryColor,
                icon: Icons.cloud_off_rounded,
                title: isVisualSearchMode
                    ? 'Unable to search image'
                    : 'Could not load products',
                message: errorMessage!,
                showWrapper: false,
                centerContent: true,
              ),
            ),
          )
        // Loading state
        else if (isLoading)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: BouncingDotsLoader(
                activeColor: primaryColor,
                inactiveColor: secondaryColor.withOpacity(0.28),
              ),
            ),
          )
        // Empty state
        else if (products.isEmpty)
          _ShopStateCard(
            surfaceColor: surfaceColor,
            titleColor: titleColor,
            secondaryColor: secondaryColor,
            primaryColor: primaryColor,
            icon: isVisualSearchMode
                ? Icons.center_focus_weak_rounded
                : Icons.inventory_2_outlined,
            title: isVisualSearchMode
                ? 'No visual match found'
                : searchQuery.trim().isNotEmpty
                    ? 'No matching products'
                    : 'No products in this category',
            message: isVisualSearchMode
                ? 'Try another photo with the product clearly in frame.'
                : searchQuery.trim().isNotEmpty
                    ? 'Try another product name or clear the search field.'
                    : selectedCategory.isEmpty
                        ? 'Choose a category to show products here.'
                        : 'Add products under $selectedCategory on the server and they will appear here.',
          )
        // Products grid
        else
          LayoutBuilder(
            builder: (context, constraints) {
              // 2-column row layout for balanced product display
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (var columnIndex = 0;
                      columnIndex < productColumns.length;
                      columnIndex++) ...[
                    // Add spacing between columns (except before first)
                    if (columnIndex > 0)
                      const SizedBox(width: _productColumnSpacing),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (var itemIndex = 0;
                              itemIndex < productColumns[columnIndex].length;
                              itemIndex++) ...[
                            // Add spacing between cards (except before first)
                            if (itemIndex > 0)
                              const SizedBox(height: _productColumnSpacing),
                            _ShopProductCard(
                              product: productColumns[columnIndex][itemIndex],
                              surfaceColor: surfaceColor,
                              titleColor: titleColor,
                              secondaryColor: secondaryColor,
                              primaryColor: primaryColor,
                              // Show "Top Seller" badge if product is top seller
                              showTopSellerBadge: topSellerIds.contains(
                                productColumns[columnIndex][itemIndex].id,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
      ],
    );
  }
}

// ========================================================================
// _ShopStateCard
// ========================================================================
// Displays a state message with icon, title, and description.
// Used for loading, error, and empty states.
// ========================================================================
class _ShopStateCard extends StatelessWidget {
  const _ShopStateCard({
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.icon,
    required this.title,
    required this.message,
    this.showWrapper = true,
    this.centerContent = false,
  });

  // Colors for theming
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;

  // Icon to display
  final IconData icon;
  // Title text
  final String title;
  // Description message
  final String message;

  // Whether to wrap in a card container
  final bool showWrapper;
  // Whether to center the content
  final bool centerContent;

  @override
  Widget build(BuildContext context) {
    // Content widget with icon, title, and message
    final content = Column(
      mainAxisAlignment:
          centerContent ? MainAxisAlignment.center : MainAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment:
          centerContent ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 28,
          color: primaryColor,
        ),
        const SizedBox(height: 12),
        Text(
          title,
          textAlign: centerContent ? TextAlign.center : TextAlign.start,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: titleColor,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: centerContent ? TextAlign.center : TextAlign.start,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: secondaryColor,
                height: 1.45,
              ),
        ),
      ],
    );

    // Return without card wrapper (used in error state)
    if (!showWrapper) {
      return SizedBox(
        width: double.infinity,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: content,
          ),
        ),
      );
    }

    // Return with card wrapper (used in empty state)
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(24),
      ),
      child: content,
    );
  }
}

// ========================================================================
// _ShopProductCard
// ========================================================================
// Individual product card widget displaying product image, name, price,
// and various badges (discount, top seller, top rated).
// ========================================================================
class _ShopProductCard extends StatelessWidget {
  const _ShopProductCard({
    required this.product,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.showTopSellerBadge,
  });

  // Product to display
  final Product product;

  // Colors for theming
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;

  // Whether to show "Top Seller" badge
  final bool showTopSellerBadge;

  // Border radius for the card
  static const double _shopProductCardBorderRadius = 8;
  // Fixed height for product image
  static const double _shopProductImageHeight = 180;

  // Cache for badge width calculations (to avoid recalculation)
  static final Map<String, double> _inlineBadgeWidthCache = <String, double>{};
  // Cache for compact badge layout (whether to stack badges)
  static final Map<String, bool> _compactBadgeLayoutCache = <String, bool>{};

  // Helper to cache metric values with size limit
  static T _cacheMetric<T>(Map<String, T> cache, String key, T value) {
    if (cache.length > 400) {
      cache.clear();
    }

    cache[key] = value;
    return value;
  }

  // Check if product has a valid sales price
  bool get _hasSalesPrice => product.salesPrice != null && product.salesPrice! >= 0;

  // Check if original price should be shown (sales price is lower)
  bool get _showsOriginalPrice =>
      _hasSalesPrice && product.salesPrice! < product.originalPrice;

  // Get the price to display (sales price if available, otherwise original)
  double get _displayPrice =>
      _hasSalesPrice ? product.salesPrice! : product.originalPrice;

  // Get discount percentage
  int? get _discountPercentValue => _shopDiscountPercent(product);

  // Check if product is top rated
  bool get _showsTopRatedBadge => _shopIsTopRatedProduct(product);

  // Check if top seller badge should be shown
  bool get _showsTopSellerInlineBadge => showTopSellerBadge;

  // Check if discount badge should be shown
  bool get _showsDiscountInlineBadge => _discountPercentValue != null;

  // Check if top rated badge should be shown
  bool get _showsTopRatedInlineBadge => _showsTopRatedBadge;

  // Text style for inline badges
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

  // Build a text badge (e.g., "20% OFF")
  Widget _buildInlineBadge(
    BuildContext context, {
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: _inlineBadgeTextStyle(context),
      ),
    );
  }

  // Build an icon badge (e.g., fire icon for top seller)
  Widget _buildInlineIconBadge({
    required IconData icon,
    required Color color,
    required String tooltip,
  }) {
    return Tooltip(
      message: tooltip,
      child: Container(
        width: 15,
        height: 15,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 11,
          color: Colors.white,
        ),
      ),
    );
  }

  // Build a smaller badge for secondary row (compact layout)
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
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: compactStyle,
      ),
    );
  }

  // Build a smaller icon badge for secondary row (compact layout)
  Widget _buildSecondaryRowIconBadge({
    required IconData icon,
    required Color color,
    required String tooltip,
  }) {
    return Tooltip(
      message: tooltip,
      child: Container(
        width: 14,
        height: 14,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 9,
          color: Colors.white,
        ),
      ),
    );
  }

  // Measure the width of a badge text for layout calculations
  double _measureInlineBadgeWidth(
    BuildContext context, {
    required String label,
  }) {
    final labelStyle = _inlineBadgeTextStyle(context);
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final cacheKey = [
      label,
      labelStyle.fontSize,
      labelStyle.fontWeight?.value,
      textScale,
    ].join('|');
    final cachedWidth = _inlineBadgeWidthCache[cacheKey];
    if (cachedWidth != null) {
      return cachedWidth;
    }

    // Use TextPainter to measure text width
    final painter = TextPainter(
      text: TextSpan(
        text: label,
        style: labelStyle,
      ),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();

    return _cacheMetric(
      _inlineBadgeWidthCache,
      cacheKey,
      painter.width + 12, // Add padding
    );
  }

  // Determine if compact badge layout should be used (badges below name)
  // This is decided based on whether product name takes 2 lines
  bool _shouldUseCompactTopBadges(
    BuildContext context, {
    required TextStyle style,
    required double maxWidth,
  }) {
    // No badges to show or invalid width
    if ((!_showsTopSellerInlineBadge &&
            !_showsDiscountInlineBadge &&
            !_showsTopRatedInlineBadge) ||
        !maxWidth.isFinite ||
        maxWidth <= 0) {
      return false;
    }

    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final compactBadgeCacheKey = [
      product.id,
      product.name,
      _discountPercentValue,
      _showsTopSellerInlineBadge,
      _showsTopRatedInlineBadge,
      maxWidth.toStringAsFixed(1),
      style.fontSize,
      style.fontWeight?.value,
      textScale,
    ].join('|');
    final cachedDecision = _compactBadgeLayoutCache[compactBadgeCacheKey];
    if (cachedDecision != null) {
      return cachedDecision;
    }

    // Measure if product name exceeds 2 lines
    final painter = TextPainter(
      text: TextSpan(
        text: product.name,
        style: style,
      ),
      maxLines: 2,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout(maxWidth: maxWidth);

    // If name exceeds 2 lines, use compact layout
    if (painter.didExceedMaxLines) {
      return _cacheMetric(
        _compactBadgeLayoutCache,
        compactBadgeCacheKey,
        true,
      );
    }

    final lineMetrics = painter.computeLineMetrics();
    if (lineMetrics.isEmpty) {
      return _cacheMetric(
        _compactBadgeLayoutCache,
        compactBadgeCacheKey,
        false,
      );
    }

    // Calculate total badge widths
    final badgeWidths = <double>[
      if (_showsDiscountInlineBadge)
        _measureInlineBadgeWidth(
          context,
          label: '-${_discountPercentValue!}%',
        ),
      if (_showsTopSellerInlineBadge) 15,
      if (_showsTopRatedInlineBadge) 15,
    ];
    var usedLineCount = lineMetrics.length;
    var currentLineWidth = lineMetrics.last.width;

    // Check if badges fit on current lines
    for (final badgeWidth in badgeWidths) {
      if (currentLineWidth + badgeWidth <= maxWidth) {
        currentLineWidth += badgeWidth;
        continue;
      }

      // If we need a 3rd line or badge is wider than max, use compact
      if (usedLineCount >= 2 || badgeWidth > maxWidth) {
        return _cacheMetric(
          _compactBadgeLayoutCache,
          compactBadgeCacheKey,
          true,
        );
      }

      usedLineCount++;
      currentLineWidth = badgeWidth;
    }

    return _cacheMetric(
      _compactBadgeLayoutCache,
      compactBadgeCacheKey,
      false,
    );
  }

  // Build product name with inline badges and price section
  Widget _buildNameAndPrice(BuildContext context) {
    final productNameStyle = Theme.of(context).textTheme.titleSmall?.copyWith(
          color: titleColor,
          fontWeight: FontWeight.w500,
          fontSize: 15,
          letterSpacing: 0,
          height: 1,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        // Decide whether to use compact badge layout
        final useCompactTopBadges = _shouldUseCompactTopBadges(
          context,
          style: productNameStyle ?? const TextStyle(),
          maxWidth: constraints.maxWidth,
        );

        // Build inline badge spans for name row
        final nameBadgeSpans = <InlineSpan>[
          // Discount badge
          if (_showsDiscountInlineBadge && !useCompactTopBadges)
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Padding(
                padding: const EdgeInsets.only(left: 2),
                child: _buildInlineBadge(
                  context,
                  label: '-${_discountPercentValue!}%',
                  color: const Color(0xFFD32F2F),
                ),
              ),
            ),
          // Top seller badge
          if (_showsTopSellerInlineBadge && !useCompactTopBadges)
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Padding(
                padding: const EdgeInsets.only(left: 2),
                child: _buildInlineIconBadge(
                  icon: Icons.emoji_events_rounded,
                  color: const Color(0xFF00897B),
                  tooltip: 'Top Seller',
                ),
              ),
            ),
          // Top rated badge
          if (_showsTopRatedInlineBadge && !useCompactTopBadges)
            WidgetSpan(
              alignment: PlaceholderAlignment.middle,
              child: Padding(
                padding: const EdgeInsets.only(left: 2),
                child: _buildInlineIconBadge(
                  icon: Icons.workspace_premium_rounded,
                  color: const Color(0xFFF9A825),
                  tooltip: 'Top Rating',
                ),
              ),
            ),
        ];

        // Build product name widget (with or without inline badges)
        final productNameWidget = nameBadgeSpans.isNotEmpty
            ? Text.rich(
                TextSpan(
                  style: productNameStyle,
                  children: [
                    TextSpan(text: product.name),
                    ...nameBadgeSpans,
                  ],
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              )
            : Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: productNameStyle,
              );

        // Check if compact badge row should be shown below name
        final showsCompactBadgeRow = useCompactTopBadges &&
            (_showsTopSellerInlineBadge ||
                _showsDiscountInlineBadge ||
                _showsTopRatedInlineBadge);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            productNameWidget,
            // Compact badge row (below name)
            if (showsCompactBadgeRow) ...[
              const SizedBox(height: 2),
              Wrap(
                spacing: 1,
                runSpacing: 1,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (_showsDiscountInlineBadge)
                    _buildSecondaryRowBadge(
                      context,
                      label: '-${_discountPercentValue!}%',
                      color: const Color(0xFFD32F2F),
                    ),
                  if (_showsTopSellerInlineBadge)
                    _buildSecondaryRowIconBadge(
                      icon: Icons.emoji_events_rounded,
                      color: const Color(0xFF00897B),
                      tooltip: 'Top Seller',
                    ),
                  if (_showsTopRatedInlineBadge)
                    _buildSecondaryRowIconBadge(
                      icon: Icons.workspace_premium_rounded,
                      color: const Color(0xFFF9A825),
                      tooltip: 'Top Rating',
                    ),
                ],
              ),
            ],
            const SizedBox(height: 2),
            // Price row
            Wrap(
              spacing: 8,
              runSpacing: 2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                // Display price
                _ShopPriceText(
                  amount: _displayPrice,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 16,
                        color: primaryColor,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0,
                      ),
                ),
                // Original price (strikethrough if on sale)
                if (_showsOriginalPrice)
                  _ShopPriceText(
                    amount: product.originalPrice,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontSize: 11,
                          color: secondaryColor.withOpacity(0.72),
                          decoration: TextDecoration.lineThrough,
                          letterSpacing: 0,
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
    // Use ProductCardTapLift for tap animation effect
    return ProductCardTapLift(
      onTapWithHero: (heroTag) =>
          openProductDetailsPage(context, product, heroTag: heroTag),
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: surfaceColor,
          borderRadius: BorderRadius.circular(_shopProductCardBorderRadius),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: handleTap,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product image with Hero animation
                ProductCardTapLift.liftImage(
                  liftValue: liftValue,
                  child: Hero(
                    tag: heroTag,
                    child: _ShopProductImage(
                      product: product,
                      primaryColor: primaryColor,
                      height: _shopProductImageHeight,
                    ),
                  ),
                ),
                // Product details section
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Category label
                      Text(
                        product.category,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: primaryColor,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0,
                              height: 1.15,
                            ),
                      ),
                      const SizedBox(height: 0),
                      // Product name with price
                      _buildNameAndPrice(context),
                      const SizedBox(height: 6),
                      // Rating and comment count
                      _ShopProductStatsRow(
                        product: product,
                        iconColor: const Color(0xFFF9A825),
                        textStyle: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: secondaryColor,
                              fontWeight: FontWeight.w200,
                              letterSpacing: 0,
                              height: 1,
                            ),
                      ),
                      // Company identity badge if present
                      if (product.hasCompanyIdentity) ...[
                        const SizedBox(height: 4),
                        Transform.translate(
                          offset: const Offset(0, -2),
                          child: ProductCompanyIdentity(
                            product: product,
                            textColor: secondaryColor,
                            fallbackColor: primaryColor,
                          ),
                        ),
                      ],
                    ],
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

// =============================================================================
// _ShopProductImage Widget
// Displays the product image with caching, loading states, and fallback support
// =============================================================================
// This widget shows the product's display image from the card URL.
// It handles:
// - Image loading with a bouncing dots loader while fetching
// - Session-level image caching to avoid reloading recently shown images
// - Fallback to a letter-based placeholder when no image is available
// - Proper image alignment based on saved crop settings
// =============================================================================
class _ShopProductImage extends StatelessWidget {
  const _ShopProductImage({
    required this.product,
    required this.primaryColor,
    this.height = 180,
  });

  final Product product;
  final Color primaryColor;
  final double height;

  // Get the first letter of the product name for fallback display
  String get _initial {
    if (product.name.trim().isEmpty) {
      return '?';
    }
    return product.name.trim()[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    // Get the display image URL for this product
    final displayImageUrl = product.cardDisplayImageUrl;
    final hasImage = displayImageUrl.isNotEmpty;

    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        // Use dark background in dark mode, white in light mode
        color: Theme.of(context).brightness == Brightness.dark
            ? Colors.black
            : Colors.white,
      ),
      clipBehavior: Clip.antiAlias,
      child: hasImage
          // Show network image if URL is available
          ? Image.network(
              displayImageUrl,
              fit: BoxFit.cover,
              // Use centered alignment if crop is saved, otherwise use stored alignment values
              alignment: product.hasSavedCardImageCrop
                  ? Alignment.center
                  : Alignment(
                      product.cardImageAlignmentX,
                      product.cardImageAlignmentY,
                    ),
              // Show fallback if image fails to load
              errorBuilder: (context, error, stackTrace) {
                return _ShopProductImageFallback(
                  initial: _initial,
                  primaryColor: primaryColor,
                );
              },
              // Show loading indicator while image is being fetched
              loadingBuilder: (context, child, loadingProgress) {
                // Image fully loaded
                if (loadingProgress == null) {
                  SessionImageCache.markLoaded(displayImageUrl);
                  return child;
                }

                // If this image was previously loaded in this session, show immediately
                if (SessionImageCache.wasLoaded(displayImageUrl)) {
                  return child;
                }

                // Show bouncing dots loader while loading for new images
                return Center(
                  child: BouncingDotsLoader(
                    activeColor: primaryColor,
                    inactiveColor: primaryColor.withOpacity(0.24),
                  ),
                );
              },
            )
          // No image URL available, show fallback
          : _ShopProductImageFallback(
              initial: _initial,
              primaryColor: primaryColor,
            ),
    );
  }
}

// =============================================================================
// _ShopProductImageFallback Widget
// Displays a letter-based placeholder when product image is unavailable
// =============================================================================
// This widget shows the first letter of the product name in a colored circle
// as a fallback when no product image is available or fails to load.
// =============================================================================
class _ShopProductImageFallback extends StatelessWidget {
  const _ShopProductImageFallback({
    required this.initial,
    required this.primaryColor,
  });

  final String initial;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          // Semi-transparent primary color circle
          color: primaryColor.withOpacity(0.14),
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: Text(
          initial,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: primaryColor,
                fontWeight: FontWeight.w800,
              ),
        ),
      ),
    );
  }
}

// =============================================================================
// _ShopPriceText Widget
// Displays a price amount with Philippine Peso (₱) currency symbol
// =============================================================================
// This widget renders a price value with the Philippine Peso symbol.
// The currency symbol is sized at 75% of the main amount font size.
// =============================================================================
class _ShopPriceText extends StatelessWidget {
  const _ShopPriceText({
    required this.amount,
    this.style,
  });

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    // Merge provided style with default text style
    final resolvedStyle =
        DefaultTextStyle.of(context).style.merge(style).copyWith(
              letterSpacing: 0,
              height: 1,
            );
    // Currency symbol is slightly smaller than the amount
    final symbolFontSize = (resolvedStyle.fontSize ?? 14) * 0.75;

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '\u20B1', // Philippine Peso symbol
            style: resolvedStyle.copyWith(fontSize: symbolFontSize),
          ),
          TextSpan(
            text: formatCurrencyAmount(amount),
            style: resolvedStyle,
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// _ShopProductStatsRow Widget
// Displays product rating (stars) and comment count in a single row
// =============================================================================
// This widget shows the product's average rating with a star icon
// and the number of comments/reviews with a comment icon.
// Both values are formatted for display (compact notation for large numbers).
// =============================================================================
class _ShopProductStatsRow extends StatelessWidget {
  const _ShopProductStatsRow({
    required this.product,
    required this.iconColor,
    this.textStyle,
  });

  final Product product;
  final Color iconColor;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    // Use provided text color or fall back to theme primary color
    final commentIconColor =
        textStyle?.color ?? Theme.of(context).colorScheme.primary;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Star icon for rating
        Icon(
          Icons.star_rounded,
          size: 16,
          color: iconColor,
        ),
        const SizedBox(width: 4),
        // Rating value (e.g., "4.5")
        Text(
          _shopFormatProductRating(product.rating),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textStyle,
        ),
        const SizedBox(width: 10),
        // Comment icon
        Icon(
          Icons.mode_comment_outlined,
          size: 15,
          color: commentIconColor,
        ),
        const SizedBox(width: 4),
        // Comment count (e.g., "125 comments")
        Flexible(
          child: Text(
            _shopFormatProductCommentCount(product.commentCount),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textStyle,
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// Helper functions for product display formatting and filtering
// =============================================================================

// =============================================================================
// _shopDiscountPercent
// Calculates the discount percentage for a product
// =============================================================================
// Returns the discount percentage (e.g., 20 for 20% off) if:
// - The product has a sales price
// - The original price is greater than 0
// - There is a positive discount amount
// Returns null if no discount applies.
// =============================================================================
int? _shopDiscountPercent(Product product) {
  final salesPrice = product.salesPrice;
  // Must have a sales price and valid original price
  if (salesPrice == null || product.originalPrice <= 0) {
    return null;
  }

  final discountAmount = product.originalPrice - salesPrice;
  // Discount must be positive
  if (discountAmount <= 0) {
    return null;
  }

  // Calculate percentage and round to nearest integer
  final percent = ((discountAmount / product.originalPrice) * 100).round();
  if (percent <= 0) {
    return null;
  }

  return percent;
}

// =============================================================================
// _shopFormatProductRating
// Formats the product rating for display
// =============================================================================
// Returns the rating with one decimal place (e.g., "4.5", "5.0", "3.2")
// =============================================================================
String _shopFormatProductRating(double rating) => rating.toStringAsFixed(1);

// =============================================================================
// _shopFormatProductCommentCount
// Formats the comment count for display with proper singular/plural label
// =============================================================================
// Returns a string like "125 comments" or "1 comment".
// Uses compact notation for large numbers (e.g., "1.2K comments").
// =============================================================================
String _shopFormatProductCommentCount(int commentCount) {
  // Ensure non-negative count
  final normalizedCount = commentCount < 0 ? 0 : commentCount;
  // Use singular or plural label based on count
  final label = normalizedCount == 1 ? 'comment' : 'comments';
  return '${_shopFormatCompactCount(normalizedCount)} $label';
}

// =============================================================================
// _shopFormatCompactCount
// Converts large numbers to compact notation (e.g., 1500 -> "1K+")
// =============================================================================
// - Numbers less than 1000 are shown as-is
// - Numbers 1000+ are shown as "XK" or "XK+" if there's a remainder
// Examples: 999 -> "999", 1000 -> "1K", 1500 -> "1K+", 2000 -> "2K"
// =============================================================================
String _shopFormatCompactCount(int count) {
  // Numbers under 1000 don't need compact notation
  if (count < 1000) {
    return count.toString();
  }

  // Calculate thousands
  final thousands = count ~/ 1000;
  // Add "+" suffix if there's a remainder (e.g., 1500 -> "1K+")
  final suffix = count % 1000 == 0 ? 'K' : 'K+';
  return '$thousands$suffix';
}

// =============================================================================
// _shopIsTopRatedProduct
// Checks if a product qualifies as "top rated"
// =============================================================================
// A product is considered top rated if its rating is between 4.5 and 5.0.
// This is used to display the "Top Rating" badge on product cards.
// =============================================================================
bool _shopIsTopRatedProduct(Product product) =>
    product.rating >= 4.5 && product.rating <= 5;

// =============================================================================
// _shopBuildTopSellingProducts
// Builds a list of top-selling products sorted by sales count
// =============================================================================
// Filters products to only include those with sales (sold > 0),
// sorts them by highest sales count, and returns up to 'limit' products.
// Used for displaying "Top Seller" badges on high-volume products.
// =============================================================================
List<Product> _shopBuildTopSellingProducts(
  List<Product> products, {
  int limit = 10,
}) {
  // Filter to products with sales and sort by sold count descending
  final rankedProducts = [
    ...filterVisibleProducts(products).where((product) => product.sold > 0),
  ]..sort((first, second) {
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

  return rankedProducts.take(limit).toList(growable: false);
}
