import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:gms_shopping/models/product.dart';
import 'package:gms_shopping/product_details.dart';
import 'package:gms_shopping/services/product_repository.dart';
import 'package:gms_shopping/services/visual_product_detector.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:gms_shopping/utils/currency_format.dart';
import 'package:gms_shopping/utils/session_image_cache.dart';
import 'package:gms_shopping/widgets/bouncing_dots_loader.dart';
import 'package:gms_shopping/widgets/product_card_tap_lift.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class VisualSearchCameraCapture {
  const VisualSearchCameraCapture({
    required this.imagePath,
    required this.imageBytes,
    required this.filename,
  });

  final String imagePath;
  final Uint8List imageBytes;
  final String filename;
}

Future<VisualSearchCameraCapture?> pickVisualSearchCameraImage({
  ImagePicker? imagePicker,
}) async {
  final picker = imagePicker ?? ImagePicker();
  final pickedImage = await picker.pickImage(
    source: ImageSource.camera,
    imageQuality: 82,
    maxWidth: 1280,
    maxHeight: 1280,
  );

  if (pickedImage == null) {
    return null;
  }

  return VisualSearchCameraCapture(
    imagePath: pickedImage.path,
    imageBytes: await pickedImage.readAsBytes(),
    filename: pickedImage.name,
  );
}

List<Product> limitVisualSearchProductMatches(List<Product> products) {
  Product? fallbackProduct;
  final seenProductKeys = <String>{};

  for (final product in products) {
    final normalizedKey = product.id.trim().isNotEmpty
        ? product.id.trim().toLowerCase()
        : product.name.trim().toLowerCase();
    if (normalizedKey.isNotEmpty && !seenProductKeys.add(normalizedKey)) {
      continue;
    }

    fallbackProduct ??= product;
    if (isProductVisibleToUsers(product)) {
      return <Product>[product];
    }
  }

  return fallbackProduct == null ? const <Product>[] : <Product>[fallbackProduct];
}

Future<void> clearProductSearchRecentSearches() async {
  final prefs = await SharedPreferences.getInstance();
  final accountId = await AuthSession.getAccountId();
  final key = accountId != null && accountId.trim().isNotEmpty
      ? 'recent_searches_${accountId.trim()}'
      : 'recent_searches';
  await prefs.remove(key);
}

class ProductSearchBar extends StatelessWidget {
  const ProductSearchBar({
    super.key,
    required this.controller,
    required this.iconColor,
    required this.textColor,
    required this.backgroundColor,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
    this.onTapOutside,
    this.onTap,
    this.hintText = 'Search available products',
    this.hintColor,
    this.readOnly = false,
    this.autofocus = false,
    this.showClearButton = true,
    this.focusNode,
    this.onCameraTap,
    this.isCameraLoading = false,
  });

  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;
  final TapRegionCallback? onTapOutside;
  final VoidCallback? onTap;
  final Color iconColor;
  final Color textColor;
  final Color backgroundColor;
  final String hintText;
  final Color? hintColor;
  final bool readOnly;
  final bool autofocus;
  final bool showClearButton;
  final FocusNode? focusNode;
  final VoidCallback? onCameraTap;
  final bool isCameraLoading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasQuery = controller.text.trim().isNotEmpty;
    void handleCloseTap() {
      focusNode?.unfocus();
      FocusManager.instance.primaryFocus?.unfocus();
      onClear?.call();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        focusNode?.unfocus();
        FocusManager.instance.primaryFocus?.unfocus();
      });
    }

    final searchField = Container(
      height: 44,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Icon(
            Icons.search_rounded,
            size: 20,
            color: iconColor,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: IgnorePointer(
              ignoring: readOnly && onTap != null,
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                readOnly: readOnly,
                autofocus: autofocus,
                onTapOutside:
                    onTapOutside ??
                    (_) {
                      focusNode?.unfocus();
                      FocusManager.instance.primaryFocus?.unfocus();
                    },
                onTap: onTap,
                onChanged: onChanged,
                onSubmitted: onSubmitted,
                textInputAction: TextInputAction.search,
                cursorColor: iconColor,
                decoration: InputDecoration(
                  hintText: hintText,
                  hintStyle: theme.textTheme.bodyMedium?.copyWith(
                    color: (hintColor ?? textColor).withOpacity(0.7),
                  ),
                  border: InputBorder.none,
                  isCollapsed: true,
                ),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: textColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          if (showClearButton && hasQuery && onClear != null) ...[
            const SizedBox(width: 8),
            Focus(
              canRequestFocus: false,
              skipTraversal: true,
              descendantsAreFocusable: false,
              child: GestureDetector(
                onTap: handleCloseTap,
                behavior: HitTestBehavior.opaque,
                child: Icon(
                  Icons.close_rounded,
                  size: 20,
                  color: textColor.withOpacity(0.8),
                ),
              ),
            ),
          ],
          if (onCameraTap != null) ...[
            const SizedBox(width: 8),
            SizedBox(
              width: 32,
              height: 32,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: isCameraLoading ? null : onCameraTap,
                  child: Center(
                    child: isCameraLoading
                        ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: iconColor,
                            ),
                          )
                        : Icon(
                            Icons.photo_camera_rounded,
                            size: 20,
                            color: iconColor,
                          ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );

    if (readOnly && onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: searchField,
        ),
      );
    }

    return searchField;
  }
}

class ProductSearchPage extends StatefulWidget {
  const ProductSearchPage({
    super.key,
    required this.productsFuture,
    required this.productRepository,
    required this.primaryColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    this.productCardSurfaceColor,
    this.startWithCamera = false,
    this.initialVisualSearchCapture,
  });

  final Future<List<Product>> productsFuture;
  final ProductRepository productRepository;
  final Color primaryColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color? productCardSurfaceColor;
  final bool startWithCamera;
  final VisualSearchCameraCapture? initialVisualSearchCapture;

  @override
  State<ProductSearchPage> createState() => _ProductSearchPageState();
}

class _ProductSearchPageState extends State<ProductSearchPage> {
  static const int _collapsedRecentSearchLimit = 3;
  static const Duration _refreshIndicatorDelay = Duration(milliseconds: 650);

  List<String> _recentSearches = <String>[];
  bool _recentSearchesLoaded = false;

  late final TextEditingController _searchController;
  late final ImagePicker _imagePicker;
  late Future<List<Product>> _productsFuture;
  String _query = '';
  bool _showAllRecentSearches = false;
  bool _isRefreshing = false;
  bool _isVisualSearching = false;
  List<Product>? _visualSearchProducts;
  String _visualSearchError = '';

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _imagePicker = ImagePicker();
    _productsFuture = widget.productsFuture;
    _loadRecentSearches();
    final initialCapture = widget.initialVisualSearchCapture;
    if (initialCapture != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _runVisualSearchWithCapture(initialCapture);
        }
      });
    } else if (widget.startWithCamera) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _startVisualSearch();
        }
      });
    }
  }

  Future<String> _resolveRecentSearchesKey() async {
    final accountId = await AuthSession.getAccountId();
    if (accountId != null && accountId.trim().isNotEmpty) {
      return 'recent_searches_${accountId.trim()}';
    }
    return 'recent_searches';
  }

  Future<void> _loadRecentSearches() async {
    final key = await _resolveRecentSearchesKey();
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(key);
    if (mounted) {
      setState(() {
        _recentSearches = raw ?? <String>[];
        _recentSearchesLoaded = true;
      });
    }
  }

  Future<void> _persistRecentSearches() async {
    final key = await _resolveRecentSearchesKey();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(key, _recentSearches);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _handleSearchChanged(String value) {
    final nextQuery = value.trim();
    if (_query == nextQuery) {
      return;
    }

    setState(() {
      _query = nextQuery;
      _visualSearchProducts = null;
      _visualSearchError = '';
    });
  }

  void _submitSearch(String value) {
    final nextQuery = value.trim();
    if (nextQuery.isEmpty) {
      return;
    }

    final existingIndex = _recentSearches.indexWhere(
      (entry) => entry.toLowerCase() == nextQuery.toLowerCase(),
    );

    if (existingIndex >= 0) {
      _recentSearches.removeAt(existingIndex);
    }

    setState(() {
      _recentSearches.insert(0, nextQuery);
      _query = nextQuery;
      _showAllRecentSearches = false;
      _visualSearchProducts = null;
      _visualSearchError = '';
    });

    _persistRecentSearches();
  }

  void _clearSearch() {
    if (_searchController.text.isEmpty && _query.isEmpty) {
      return;
    }

    setState(() {
      _searchController.clear();
      _query = '';
      _visualSearchProducts = null;
      _visualSearchError = '';
    });
  }

  Future<void> _startVisualSearch() async {
    if (_isVisualSearching) {
      return;
    }

    FocusManager.instance.primaryFocus?.unfocus();

    final pickedImage = await pickVisualSearchCameraImage(
      imagePicker: _imagePicker,
    );

    if (pickedImage == null) {
      return;
    }

    await _runVisualSearchWithCapture(pickedImage);
  }

  Future<void> _runVisualSearchWithCapture(
    VisualSearchCameraCapture pickedImage,
  ) async {
    if (_isVisualSearching) {
      return;
    }

    FocusManager.instance.primaryFocus?.unfocus();

    setState(() {
      _isVisualSearching = true;
      _visualSearchProducts = null;
      _visualSearchError = '';
      _recentSearches.clear();
      _showAllRecentSearches = false;
      _searchController.clear();
      _query = '';
    });

    _persistRecentSearches();

    try {
      final detectedImage = await prepareVisualSearchImage(
        imagePath: pickedImage.imagePath,
        imageBytes: pickedImage.imageBytes,
        filename: pickedImage.filename,
      );

      final matches = await widget.productRepository.searchProductsByImage(
        imageBytes: detectedImage.imageBytes,
        filename: detectedImage.filename,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _visualSearchProducts = limitVisualSearchProductMatches(matches);
        _isVisualSearching = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _visualSearchProducts = const <Product>[];
        _visualSearchError = error.toString();
        _isVisualSearching = false;
      });
    }
  }

  void _deleteRecentSearch(String value) {
    setState(() {
      _recentSearches.removeWhere(
        (entry) => entry.toLowerCase() == value.toLowerCase(),
      );
      if (_recentSearches.length <= _collapsedRecentSearchLimit) {
        _showAllRecentSearches = false;
      }
    });
    _persistRecentSearches();
  }

  void _clearAllRecentSearches() {
    if (_recentSearches.isEmpty) {
      return;
    }

    setState(() {
      _recentSearches.clear();
      _showAllRecentSearches = false;
    });
    _persistRecentSearches();
  }

  Future<void> _refreshProducts() async {
    if (_isRefreshing) {
      return;
    }

    final nextFuture = widget.productRepository.fetchProducts(forceRefresh: true);

    setState(() {
      _isRefreshing = true;
      _productsFuture = nextFuture;
    });

    try {
      await Future.wait<dynamic>([
        nextFuture,
        Future<void>.delayed(_refreshIndicatorDelay),
      ]);
    } finally {
      if (!mounted) {
        _isRefreshing = false;
        return;
      }

      setState(() {
        _isRefreshing = false;
      });
    }
  }

  List<String> _visibleRecentSearches() {
    if (_showAllRecentSearches ||
        _recentSearches.length <= _collapsedRecentSearchLimit) {
      return _recentSearches;
    }

    return _recentSearches.take(_collapsedRecentSearchLimit).toList();
  }

  List<Product> _filterProducts(List<Product> products) {
    final normalizedQuery = _query.trim().toLowerCase();
    if (normalizedQuery.isEmpty) {
      return const <Product>[];
    }

    final visibleProducts = products
        .where(isProductVisibleToUsers)
        .where(
          (product) => product.name.toLowerCase().contains(normalizedQuery),
        )
        .toList()
      ..sort((first, second) => second.createdAt.compareTo(first.createdAt));

    return visibleProducts;
  }

  List<List<Product>> _buildProductColumns(List<Product> products) {
    final columns = List<List<Product>>.generate(2, (_) => <Product>[]);

    for (var index = 0; index < products.length; index++) {
      columns[index % columns.length].add(products[index]);
    }

    return columns;
  }

  Widget _buildProductResultList(
    List<Product> products, {
    required Set<String> topSellerIds,
  }) {
    final productColumns = _buildProductColumns(products);
    final cardSurfaceColor =
        widget.productCardSurfaceColor ?? widget.surfaceColor;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var columnIndex = 0;
                columnIndex < productColumns.length;
                columnIndex++) ...[
              if (columnIndex > 0) const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var itemIndex = 0;
                        itemIndex < productColumns[columnIndex].length;
                        itemIndex++) ...[
                      if (itemIndex > 0) const SizedBox(height: 12),
                      _SearchProductTile(
                        product: productColumns[columnIndex][itemIndex],
                        surfaceColor: cardSurfaceColor,
                        primaryColor: widget.primaryColor,
                        titleColor: widget.titleColor,
                        secondaryColor: widget.secondaryColor,
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
        ),
      ],
    );
  }

  Widget _buildVisualSearchResults() {
    if (_isVisualSearching) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          const SizedBox(height: 140),
          Center(
            child: BouncingDotsLoader(
              activeColor: widget.primaryColor,
              inactiveColor: widget.secondaryColor.withOpacity(0.28),
            ),
          ),
        ],
      );
    }

    if (_visualSearchError.isNotEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          _SearchStatusView(
            icon: Icons.camera_alt_outlined,
            title: 'Unable to search photo',
            message: 'Check the server connection, then try another photo.',
            primaryColor: widget.primaryColor,
          ),
        ],
      );
    }

    final products = _visualSearchProducts ?? const <Product>[];
    if (products.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          _SearchStatusView(
            icon: Icons.center_focus_weak_rounded,
            title: 'No visual match found',
            message: 'Try a brighter photo with the product label in frame.',
            primaryColor: widget.primaryColor,
          ),
        ],
      );
    }

    return _buildProductResultList(
      products,
      topSellerIds: {
        for (final product in _buildSearchTopSellingProducts(products))
          product.id,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fieldBackgroundColor =
        theme.inputDecorationTheme.fillColor ??
        theme.colorScheme.surfaceContainerHighest.withOpacity(0.65);
    final showResults = _query.isNotEmpty;
    final showVisualResults =
        _isVisualSearching ||
        _visualSearchProducts != null ||
        _visualSearchError.isNotEmpty;
    final visibleRecentSearches = _visibleRecentSearches();
    final hasHiddenSearches =
        !_showAllRecentSearches &&
        _recentSearches.length > _collapsedRecentSearchLimit;

    return Scaffold(
      backgroundColor: widget.surfaceColor,
      appBar: AppBar(
        backgroundColor: widget.surfaceColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: widget.titleColor,
            size: 20,
          ),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        titleSpacing: 0,
        title: Text(
          'Search',
          style: theme.textTheme.titleMedium?.copyWith(
            color: widget.titleColor,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
              child: ProductSearchBar(
                controller: _searchController,
                onChanged: _handleSearchChanged,
                onSubmitted: _submitSearch,
                onClear: _clearSearch,
                iconColor: widget.primaryColor,
                textColor: widget.titleColor,
                backgroundColor: fieldBackgroundColor,
                autofocus: true,
              ),
            ),
            Expanded(
              child: showVisualResults
                  ? _buildVisualSearchResults()
                  : showResults
                  ? FutureBuilder<List<Product>>(
                      future: _productsFuture,
                      builder: (context, snapshot) {
                        if (snapshot.connectionState == ConnectionState.waiting &&
                            !snapshot.hasData) {
                          return RefreshIndicator(
                            color: widget.primaryColor,
                            onRefresh: _refreshProducts,
                            child: ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                              children: [
                                const SizedBox(height: 140),
                                Center(
                                  child: BouncingDotsLoader(
                                    activeColor: widget.primaryColor,
                                    inactiveColor:
                                        widget.secondaryColor.withOpacity(0.28),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        final allProducts = snapshot.data ?? const <Product>[];
                        final topSellerIds = {
                          for (final product
                              in _buildSearchTopSellingProducts(allProducts))
                            product.id,
                        };
                        final visibleProducts = snapshot.hasError
                            ? const <Product>[]
                            : _filterProducts(allProducts);

                        return RefreshIndicator(
                          color: widget.primaryColor,
                          onRefresh: _refreshProducts,
                          child: snapshot.hasError
                              ? ListView(
                                  physics:
                                      const AlwaysScrollableScrollPhysics(),
                                  padding:
                                      const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                  children: [
                                    _SearchStatusView(
                                      icon: Icons.wifi_off_rounded,
                                      title: 'Unable to load products',
                                      message:
                                          'Check the server connection, then pull down to refresh.',
                                      primaryColor: widget.primaryColor,
                                    ),
                                  ],
                                )
                              : visibleProducts.isEmpty
                                  ? ListView(
                                      physics:
                                          const AlwaysScrollableScrollPhysics(),
                                      padding: const EdgeInsets.fromLTRB(
                                        16,
                                        0,
                                        16,
                                        24,
                                      ),
                                      children: [
                                        _SearchStatusView(
                                          icon: Icons.search_off_rounded,
                                          title: 'No matching products',
                                          message:
                                              'Try another product name or category.',
                                          primaryColor: widget.primaryColor,
                                        ),
                                      ],
                                    )
                                  : _buildProductResultList(
                                      visibleProducts,
                                      topSellerIds: topSellerIds,
                                    ),
                        );
                      },
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Recent Searches',
                              style: theme.textTheme.titleSmall?.copyWith(
                                color: widget.titleColor,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            if (_query.isNotEmpty)
                              Text(
                                'Products appear while typing',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: widget.secondaryColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        if (_recentSearches.isEmpty)
                          _SearchStatusView(
                            icon: Icons.history_rounded,
                            title: 'No recent searches yet',
                            message:
                                'Products will appear as soon as the client types.',
                            primaryColor: widget.primaryColor,
                          )
                        else
                          _RecentSearchesCard(
                            searches: visibleRecentSearches,
                            primaryColor: widget.primaryColor,
                            titleColor: widget.titleColor,
                            secondaryColor: widget.secondaryColor,
                            onDeleteSearch: _deleteRecentSearch,
                          ),
                        if (hasHiddenSearches) ...[
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.center,
                            child: TextButton(
                              onPressed: () {
                                setState(() {
                                  _showAllRecentSearches = true;
                                });
                              },
                              style: TextButton.styleFrom(
                                foregroundColor: widget.primaryColor,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 4),
                              ),
                              child: const Text('See more'),
                            ),
                          ),
                        ] else if (_showAllRecentSearches &&
                            _recentSearches.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.center,
                            child: TextButton(
                              onPressed: _clearAllRecentSearches,
                              style: TextButton.styleFrom(
                                foregroundColor: widget.primaryColor,
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 4),
                              ),
                              child: const Text('Clear all'),
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
  }
}

class _RecentSearchesCard extends StatelessWidget {
  const _RecentSearchesCard({
    required this.searches,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onDeleteSearch,
  });

  final List<String> searches;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final ValueChanged<String> onDeleteSearch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          for (var index = 0; index < searches.length; index++) ...[
            ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 2,
              ),
              leading: Icon(
                Icons.history_rounded,
                color: primaryColor,
                size: 20,
              ),
              title: Text(
                searches[index],
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: titleColor,
                  fontWeight: FontWeight.w700,
                ),
              ),
              trailing: GestureDetector(
                onTap: () => onDeleteSearch(searches[index]),
                behavior: HitTestBehavior.opaque,
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Icon(
                    Icons.close_rounded,
                    color: secondaryColor,
                    size: 18,
                  ),
                ),
              ),
            ),
            if (index != searches.length - 1)
              Divider(
                height: 1,
                indent: 16,
                endIndent: 16,
                color: secondaryColor.withOpacity(0.18),
              ),
          ],
        ],
      ),
    );
  }
}

List<Product> _buildSearchTopSellingProducts(
  List<Product> products, {
  int limit = 10,
}) {
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

bool _isSearchTopRatedProduct(Product product) =>
    product.rating >= 4.5 && product.rating <= 5;

String _formatSearchProductRating(double rating) => rating.toStringAsFixed(1);

String _formatSearchProductCommentCount(int commentCount) {
  final normalizedCount = commentCount < 0 ? 0 : commentCount;
  final label = normalizedCount == 1 ? 'comment' : 'comments';
  return '${_formatSearchCompactCount(normalizedCount)} $label';
}

String _formatSearchCompactCount(int count) {
  if (count < 1000) {
    return count.toString();
  }

  final thousands = count ~/ 1000;
  final suffix = count % 1000 == 0 ? 'K' : 'K+';
  return '$thousands$suffix';
}

class _SearchProductTile extends StatelessWidget {
  const _SearchProductTile({
    required this.product,
    required this.surfaceColor,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    this.showTopSellerBadge = false,
  });

  final Product product;
  final Color surfaceColor;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final bool showTopSellerBadge;

  static const double _cardBorderRadius = 8;
  static const double _imageHeight = 180;

  bool get _hasSalesPrice =>
      product.salesPrice != null &&
      product.salesPrice! >= 0 &&
      product.salesPrice! < product.originalPrice;

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

  bool get _showsTopRatedBadge => _isSearchTopRatedProduct(product);

  double get _effectivePrice =>
      _hasSalesPrice ? product.salesPrice! : product.originalPrice;

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
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              height: 1,
            ),
      ),
    );
  }

  Widget _buildProductImage(BuildContext context) {
    final displayImageUrl = product.cardDisplayImageUrl;
    final hasImage = displayImageUrl.isNotEmpty;
    final imageBackgroundColor = Theme.of(context).brightness == Brightness.dark
        ? Colors.black
        : Colors.white;

    return ColoredBox(
      color: imageBackgroundColor,
      child: Stack(
        children: [
          Positioned.fill(
            child: hasImage
                ? Image.network(
                    displayImageUrl,
                    fit: BoxFit.cover,
                    alignment: product.hasSavedCardImageCrop
                        ? Alignment.center
                        : Alignment(
                            product.cardImageAlignmentX,
                            product.cardImageAlignmentY,
                          ),
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) {
                        SessionImageCache.markLoaded(displayImageUrl);
                        return child;
                      }

                      if (SessionImageCache.wasLoaded(displayImageUrl)) {
                        return child;
                      }

                      return Center(
                        child: BouncingDotsLoader(
                          activeColor: primaryColor,
                          inactiveColor: secondaryColor.withOpacity(0.28),
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) =>
                        _SearchImagePlaceholder(
                      primaryColor: primaryColor,
                      secondaryColor: secondaryColor,
                    ),
                  )
                : _SearchImagePlaceholder(
                    primaryColor: primaryColor,
                    secondaryColor: secondaryColor,
                  ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ProductCardTapLift(
      onTapWithHero: (heroTag) =>
          openProductDetailsPage(context, product, heroTag: heroTag),
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: surfaceColor,
          borderRadius: BorderRadius.circular(_cardBorderRadius),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: handleTap,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ProductCardTapLift.liftImage(
                  liftValue: liftValue,
                  child: Hero(
                    tag: heroTag,
                    child: SizedBox(
                      height: _imageHeight,
                      width: double.infinity,
                      child: _buildProductImage(context),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.category,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: primaryColor,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: titleColor,
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 0,
                          height: 1,
                        ),
                      ),
                      if (showTopSellerBadge ||
                          _discountPercentValue != null ||
                          _showsTopRatedBadge) ...[
                        const SizedBox(height: 2),
                        Wrap(
                          spacing: 2,
                          runSpacing: 2,
                          children: [
                            if (showTopSellerBadge)
                              _buildInlineBadge(
                                context,
                                label: 'Top Seller',
                                color: const Color(0xFF00897B),
                              ),
                            if (_discountPercentValue != null)
                              _buildInlineBadge(
                                context,
                                label: '-${_discountPercentValue!}%',
                                color: const Color(0xFFD32F2F),
                              ),
                            if (_showsTopRatedBadge)
                              _buildInlineBadge(
                                context,
                                label: 'Top Rating',
                                color: const Color(0xFFF9A825),
                              ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 8,
                        runSpacing: 2,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          _SearchPriceText(
                            amount: _effectivePrice,
                            color: primaryColor,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                          if (_hasSalesPrice)
                            _SearchPriceText(
                              amount: product.originalPrice,
                              color: secondaryColor.withOpacity(0.72),
                              decoration: TextDecoration.lineThrough,
                              fontSize: 11,
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      _SearchProductStatsRow(
                        product: product,
                        iconColor: const Color(0xFFF9A825),
                        textStyle: theme.textTheme.bodySmall?.copyWith(
                          color: secondaryColor,
                          fontWeight: FontWeight.w200,
                          letterSpacing: 0,
                          height: 1,
                        ),
                      ),
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

class _SearchProductStatsRow extends StatelessWidget {
  const _SearchProductStatsRow({
    required this.product,
    required this.iconColor,
    this.textStyle,
  });

  final Product product;
  final Color iconColor;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    final commentIconColor =
        textStyle?.color ?? Theme.of(context).colorScheme.primary;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.star_rounded,
          size: 16,
          color: iconColor,
        ),
        const SizedBox(width: 4),
        Text(
          _formatSearchProductRating(product.rating),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textStyle,
        ),
        const SizedBox(width: 10),
        Icon(
          Icons.mode_comment_outlined,
          size: 15,
          color: commentIconColor,
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            _formatSearchProductCommentCount(product.commentCount),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textStyle,
          ),
        ),
      ],
    );
  }
}

class _SearchImagePlaceholder extends StatelessWidget {
  const _SearchImagePlaceholder({
    required this.primaryColor,
    required this.secondaryColor,
  });

  final Color primaryColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor.withOpacity(0.16),
            secondaryColor.withOpacity(0.08),
          ],
        ),
      ),
      child: Center(
        child: Icon(
          Icons.image_outlined,
          size: 34,
          color: primaryColor.withOpacity(0.8),
        ),
      ),
    );
  }
}

class _SearchStatusView extends StatelessWidget {
  const _SearchStatusView({
    required this.icon,
    required this.title,
    required this.message,
    required this.primaryColor,
  });

  final IconData icon;
  final String title;
  final String message;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: primaryColor,
              size: 28,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.textTheme.bodyMedium?.color?.withOpacity(0.75),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchPriceText extends StatelessWidget {
  const _SearchPriceText({
    required this.amount,
    required this.color,
    this.fontWeight,
    this.decoration,
    this.fontSize,
  });

  final double amount;
  final Color color;
  final FontWeight? fontWeight;
  final TextDecoration? decoration;
  final double? fontSize;

  @override
  Widget build(BuildContext context) {
    final resolvedStyle =
        Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: color,
              fontWeight: fontWeight ?? FontWeight.w700,
              decoration: decoration,
              fontSize: fontSize,
              letterSpacing: 0,
              height: 1,
            ) ??
            TextStyle(
              color: color,
              fontWeight: fontWeight ?? FontWeight.w700,
              decoration: decoration,
              fontSize: fontSize,
              letterSpacing: 0,
              height: 1,
            );
    final symbolFontSize = (resolvedStyle.fontSize ?? 14) * 0.75;

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '\u20B1',
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
