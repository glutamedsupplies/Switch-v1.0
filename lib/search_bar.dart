import 'dart:async';
import 'dart:math' as math;
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:switch_app/models/buyer_platform_summary.dart';
import 'package:switch_app/models/delivery_partner.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/models/seller_summary.dart';
import 'package:switch_app/models/store_type_summary.dart';
import 'package:switch_app/product_details.dart';
import 'package:switch_app/services/delivery_partner_repository.dart';
import 'package:switch_app/services/for_you_recommendations.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/services/search_suggestions_service.dart';
import 'package:switch_app/services/visual_product_detector.dart';
import 'package:switch_app/services/vouchers_service.dart';
import 'package:switch_app/theme/default_font.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:switch_app/utils/app_keyboard.dart';
import 'package:switch_app/utils/session_image_cache.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';
import 'package:switch_app/widgets/horizontal_end_fade.dart';
import 'package:switch_app/widgets/product_card_tap_lift.dart';
import 'package:switch_app/widgets/search_not_found_art.dart';
import 'package:switch_app/widgets/seller_legit_badge.dart';
import 'package:switch_app/order_store.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

const Color searchAccentGreen = Color(0xFF00897B);
const Color searchChipMint = Color(0xFFE6F5F3);
const Color _searchAccentGreen = searchAccentGreen;
const Color _searchChipMint = searchChipMint;
const String _shopPlatformArtAsset = 'assets/images/shop-home-label-art.png';
const String _foodPlatformArtAsset = 'assets/images/food-platform-icon.png';
const String _topSearchFireArtAsset = 'assets/images/top-search-fire-art.png';
const String _recentSearchHeadingArtAsset =
    'assets/images/recent-search-heading-art.png';
const String _switchLogoAsset = 'assets/images/switch-logo.svg';

/// Keeps the two primary platforms on the same polished local 3D icon set as
/// the Top Searches artwork, instead of allowing a lower-quality remote icon
/// to replace them in search results.
String? _primaryPlatform3dArtAsset(String platformId) {
  return switch (platformId.trim().toLowerCase()) {
    'shop' => _shopPlatformArtAsset,
    'food' => _foodPlatformArtAsset,
    _ => null,
  };
}
const String _lucideSearchIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="m21 21-4.34-4.34"/>'
    '<circle cx="11" cy="11" r="8"/>'
    '</svg>';
const String _lucideClockFadingIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M12 2a10 10 0 0 1 7.38 16.75"/>'
    '<path d="M12 6v6l4 2"/>'
    '<path d="M2.5 8.875a10 10 0 0 0-.5 3"/>'
    '<path d="M2.83 16a10 10 0 0 0 2.43 3.4"/>'
    '<path d="M4.636 5.235a10 10 0 0 1 .891-.857"/>'
    '<path d="M8.644 21.42a10 10 0 0 0 7.631-.38"/>'
    '</svg>';
const String _lucideFilledStarIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'
    '</svg>';
const String _lucideTrendingUpIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M16 7h6v6"/>'
    '<path d="m22 7-8.5 8.5-5-5L2 17"/>'
    '</svg>';

Widget _lucideSearchIcon({required Color color, double size = 20}) {
  return SvgPicture.string(
    _lucideSearchIconSvg,
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
  );
}

Widget _lucideClockFadingIcon({required Color color, double size = 18}) {
  return SvgPicture.string(
    _lucideClockFadingIconSvg,
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
  );
}

Widget _lucideFilledStarIcon({required Color color, double size = 18}) {
  return SvgPicture.string(
    _lucideFilledStarIconSvg,
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
  );
}

Widget _lucideTrendingUpIcon({required Color color, double size = 15}) {
  return SvgPicture.string(
    _lucideTrendingUpIconSvg,
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
  );
}

Future<List<DeliveryPartner>>? _searchDeliveryPartnersFuture;

Future<List<DeliveryPartner>> _fetchSearchDeliveryPartners() {
  final ongoing = _searchDeliveryPartnersFuture;
  if (ongoing != null) return ongoing;

  final request = () async {
    try {
      return await createDeliveryPartnerRepository().fetchDeliveryPartners(
        forceRefresh: true,
      );
    } catch (_) {
      _searchDeliveryPartnersFuture = null;
      rethrow;
    }
  }();
  _searchDeliveryPartnersFuture = request;
  return request;
}

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

/// Approved/YOLO identity for the home search bar. Empty when nothing is detected.
Future<String> detectApprovedScanSearchLabel({
  required ProductRepository productRepository,
  required Uint8List imageBytes,
  required String filename,
  String imagePath = '',
}) async {
  if (imageBytes.isEmpty) {
    return '';
  }

  final detection = await prepareVisualSearchImage(
    imagePath: imagePath,
    imageBytes: imageBytes,
    filename: filename,
  );
  final matches = await productRepository.searchProductsByImage(
    imageBytes: detection.imageBytes,
    filename: detection.filename,
  );
  for (final product in matches) {
    final name = product.name.trim();
    if (name.isNotEmpty) {
      return name;
    }
  }
  return '';
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

  return fallbackProduct == null
      ? const <Product>[]
      : <Product>[fallbackProduct];
}

Future<void> clearProductSearchRecentSearches({String platformId = ''}) async {
  final prefs = await SharedPreferences.getInstance();
  final key = await resolveBuyerRecentSearchesKey(platformId: platformId);
  await prefs.remove(key);
}

Future<void> pushBuyerRecentSearch(
  String term, {
  String platformId = '',
}) async {
  final next = term.trim();
  if (next.isEmpty) return;
  final key = await resolveBuyerRecentSearchesKey(platformId: platformId);
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getStringList(key) ?? <String>[];
  existing.removeWhere((entry) => entry.toLowerCase() == next.toLowerCase());
  existing.insert(0, next);
  await prefs.setStringList(
    key,
    existing.length > 30 ? existing.take(30).toList() : existing,
  );
  ForYouRecommendations.instance.notifyChanged();
}

class ProductSearchBar extends StatefulWidget {
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
    this.readOnly = false,
    this.autofocus = false,
    this.showClearButton = true,
    this.focusNode,
    this.onCameraTap,
    this.isCameraLoading = false,
    this.onLocationTap,
    this.isLocationLoading = false,
    this.hintText,
    this.pillStyle = false,
    this.alwaysUseFocusedStyle = false,
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
  final bool readOnly;
  final bool autofocus;
  final bool showClearButton;
  final FocusNode? focusNode;
  final VoidCallback? onCameraTap;
  final bool isCameraLoading;
  final VoidCallback? onLocationTap;
  final bool isLocationLoading;
  final String? hintText;

  /// Matches main_dart.html `.md-sa-search` pill search field.
  final bool pillStyle;
  final bool alwaysUseFocusedStyle;

  @override
  State<ProductSearchBar> createState() => _ProductSearchBarState();
}

class _ProductSearchBarState extends State<ProductSearchBar> {
  FocusNode? _ownedFocusNode;

  FocusNode get _focusNode => widget.focusNode ?? _ownedFocusNode!;

  @override
  void initState() {
    super.initState();
    if (widget.focusNode == null) {
      _ownedFocusNode = FocusNode();
    }
  }

  @override
  void didUpdateWidget(covariant ProductSearchBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      if (widget.focusNode == null && _ownedFocusNode == null) {
        _ownedFocusNode = FocusNode();
      }
      if (widget.focusNode != null && _ownedFocusNode != null) {
        _ownedFocusNode!.dispose();
        _ownedFocusNode = null;
      }
    }
  }

  @override
  void dispose() {
    _ownedFocusNode?.dispose();
    super.dispose();
  }

  void _focusField() {
    if (widget.readOnly) {
      widget.onTap?.call();
      return;
    }
    if (!_focusNode.hasFocus) {
      _focusNode.requestFocus();
    }
    widget.onTap?.call();
  }

  void _handleClearTap() {
    // Clear the query only — do not unfocus / exit search mode.
    widget.onClear?.call();
    if (!_focusNode.hasFocus) {
      _focusNode.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasQuery = widget.controller.text.trim().isNotEmpty;

    Widget buildField({required bool focused}) {
      final borderRadius = BorderRadius.circular(widget.pillStyle ? 999 : 8);
      final muteIcon = const Color(0xFF6B7280);
      final isDark = theme.brightness == Brightness.dark;
      // Idle: transparent + border (main_dart). Focus: solid white immediately — no gray wash/splash.
      final Color pillFill;
      final Color pillHintColor;
      final Color pillTextColor;
      final Color pillIconColor;
      if (focused) {
        pillFill = Colors.white;
        pillHintColor = const Color(0x73162033);
        pillTextColor = const Color(0xFF162033);
        pillIconColor = muteIcon;
      } else {
        pillFill = Colors.transparent;
        if (isDark) {
          pillHintColor = Colors.white.withValues(alpha: 0.55);
          pillTextColor = Colors.white.withValues(alpha: 0.92);
          pillIconColor = Colors.white.withValues(alpha: 0.75);
        } else {
          pillHintColor = const Color(0x73162033);
          pillTextColor = const Color(0xFF162033);
          pillIconColor = muteIcon;
        }
      }

      final textField = TextField(
        controller: widget.controller,
        focusNode: _focusNode,
        readOnly: widget.readOnly,
        autofocus: widget.autofocus,
        autocorrect: false,
        enableSuggestions: false,
        scrollPadding: EdgeInsets.zero,
        onTapOutside:
            widget.onTapOutside ??
            (_) {
              _focusNode.unfocus();
              FocusManager.instance.primaryFocus?.unfocus();
            },
        onTap: widget.onTap,
        onChanged: widget.onChanged,
        onSubmitted: widget.onSubmitted,
        textInputAction: TextInputAction.search,
        cursorColor: widget.pillStyle
            ? const Color(0xFF162033)
            : widget.iconColor,
        decoration: InputDecoration(
          isCollapsed: true,
          isDense: true,
          filled: false,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          disabledBorder: InputBorder.none,
          errorBorder: InputBorder.none,
          focusedErrorBorder: InputBorder.none,
          contentPadding: EdgeInsets.zero,
          hintText: widget.hintText,
          hintStyle: theme.textTheme.bodyMedium?.copyWith(
            color: widget.pillStyle
                ? pillHintColor
                : widget.textColor.withValues(alpha: 0.45),
            fontWeight: FontWeight.w500,
            fontSize: widget.pillStyle ? 15 : null,
          ),
        ),
        style: theme.textTheme.bodyMedium?.copyWith(
          color: widget.pillStyle ? pillTextColor : widget.textColor,
          fontWeight: widget.pillStyle ? FontWeight.w500 : FontWeight.w600,
          fontSize: widget.pillStyle ? 15 : null,
          height: widget.pillStyle ? 1.25 : null,
        ),
      );

      final field = Material(
        color: Colors.transparent,
        elevation: 0,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        child: AnimatedContainer(
          duration: widget.pillStyle
              ? Duration.zero
              : const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          width: double.infinity,
          height: widget.pillStyle ? 48 : 44,
          alignment: Alignment.centerLeft,
          decoration: BoxDecoration(
            color: widget.pillStyle ? pillFill : widget.backgroundColor,
            borderRadius: borderRadius,
            // Always keep 1px border width so focus/unfocus stay aligned.
            // Visible only when unfocused (matches main_dart.html).
            border: widget.pillStyle
                ? Border.all(
                    width: 1,
                    color: focused
                        ? Colors.transparent
                        : (isDark
                              ? Colors.white.withValues(alpha: 0.28)
                              : const Color(0x2E162033)), // rgba(22,32,51,0.18)
                  )
                : null,
            boxShadow: widget.pillStyle && focused
                ? const [
                    BoxShadow(
                      color: Color(0x66000000),
                      blurRadius: 1,
                      offset: Offset(0, 1),
                    ),
                    BoxShadow(
                      color: Color(0x0D000000),
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          padding: EdgeInsets.symmetric(horizontal: widget.pillStyle ? 14 : 12),
          child: Row(
            children: [
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _focusField,
                child: SvgPicture.asset(
                  'assets/icons/search.svg',
                  width: widget.pillStyle ? 22 : 20,
                  height: widget.pillStyle ? 22 : 20,
                  colorFilter: ColorFilter.mode(
                    widget.pillStyle ? pillIconColor : widget.iconColor,
                    BlendMode.srcIn,
                  ),
                ),
              ),
              SizedBox(width: widget.pillStyle ? 10 : 10),
              Expanded(
                child: IgnorePointer(
                  ignoring: widget.readOnly && widget.onTap != null,
                  child: widget.pillStyle
                      ? Theme(
                          data: theme.copyWith(
                            splashColor: Colors.transparent,
                            highlightColor: Colors.transparent,
                            hoverColor: Colors.transparent,
                            focusColor: Colors.transparent,
                            splashFactory: NoSplash.splashFactory,
                            inputDecorationTheme: const InputDecorationTheme(
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              disabledBorder: InputBorder.none,
                              errorBorder: InputBorder.none,
                              focusedErrorBorder: InputBorder.none,
                              filled: false,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                              hoverColor: Colors.transparent,
                              focusColor: Colors.transparent,
                            ),
                          ),
                          child: textField,
                        )
                      : textField,
                ),
              ),
              if (widget.showClearButton &&
                  hasQuery &&
                  widget.onClear != null) ...[
                const SizedBox(width: 8),
                Focus(
                  canRequestFocus: false,
                  skipTraversal: true,
                  descendantsAreFocusable: false,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _handleClearTap,
                      splashFactory: NoSplash.splashFactory,
                      overlayColor: const WidgetStatePropertyAll(
                        Colors.transparent,
                      ),
                      borderRadius: BorderRadius.circular(999),
                      child: SizedBox(
                        width: widget.pillStyle ? 28 : 24,
                        height: widget.pillStyle ? 28 : 24,
                        child: Icon(
                          Icons.close_rounded,
                          size: widget.pillStyle ? 16 : 20,
                          color: widget.pillStyle
                              ? pillIconColor
                              : widget.textColor.withValues(alpha: 0.8),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
              if (widget.onLocationTap != null) ...[
                const SizedBox(width: 4),
                Focus(
                  canRequestFocus: false,
                  skipTraversal: true,
                  descendantsAreFocusable: false,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: widget.isLocationLoading
                          ? null
                          : widget.onLocationTap,
                      splashFactory: NoSplash.splashFactory,
                      overlayColor: const WidgetStatePropertyAll(
                        Colors.transparent,
                      ),
                      borderRadius: BorderRadius.circular(999),
                      child: SizedBox(
                        width: widget.pillStyle ? 32 : 28,
                        height: widget.pillStyle ? 32 : 28,
                        child: Center(
                          child: widget.isLocationLoading
                              ? const SkeletonCircle(size: 18)
                              : Icon(
                                  Icons.my_location_rounded,
                                  size: widget.pillStyle ? 20 : 20,
                                  color: widget.pillStyle
                                      ? const Color(0xFF1A73E8)
                                      : widget.iconColor,
                                ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
              if (widget.onCameraTap != null) ...[
                const SizedBox(width: 8),
                SizedBox(
                  width: 32,
                  height: 32,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      splashFactory: NoSplash.splashFactory,
                      overlayColor: const WidgetStatePropertyAll(
                        Colors.transparent,
                      ),
                      onTap: widget.isCameraLoading ? null : widget.onCameraTap,
                      child: Center(
                        child: widget.isCameraLoading
                            ? const SkeletonCircle(size: 18)
                            : Icon(
                                Icons.photo_camera_rounded,
                                size: 20,
                                color: widget.iconColor,
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      );

      if (widget.readOnly && widget.onTap != null) {
        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: borderRadius,
            onTap: widget.onTap,
            child: field,
          ),
        );
      }

      // Whole pill/container focuses the field — icon, padding, empty sides.
      return Listener(
        behavior: HitTestBehavior.opaque,
        onPointerDown: (_) => _focusField(),
        child: field,
      );
    }

    if (widget.pillStyle) {
      return ListenableBuilder(
        listenable: _focusNode,
        builder: (context, _) => buildField(
          focused: widget.alwaysUseFocusedStyle || _focusNode.hasFocus,
        ),
      );
    }

    return buildField(focused: widget.alwaysUseFocusedStyle);
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
    this.embedded = false,
    this.onEmbeddedClose,
    this.initialQuery = '',
    this.platformId = '',
    this.category = '',
    this.storeType = '',
    this.sellersFuture,
    this.storeTypesFuture,
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

  /// Stay on the current page. Uses the old search field, not a new route.
  final bool embedded;
  final VoidCallback? onEmbeddedClose;
  final String initialQuery;
  final String platformId;
  final String category;
  final String storeType;
  final Future<List<SellerSummary>>? sellersFuture;
  final Future<List<StoreTypeSummary>>? storeTypesFuture;

  @override
  State<ProductSearchPage> createState() => _ProductSearchPageState();
}

class _ProductSearchPageState extends State<ProductSearchPage> {
  static const Duration _refreshIndicatorDelay = Duration(milliseconds: 650);

  List<String> _recentSearches = <String>[];

  late final TextEditingController _searchController;
  late final ImagePicker _imagePicker;
  late Future<List<Product>> _productsFuture;
  String _query = '';
  bool _isRefreshing = false;
  bool _isVisualSearching = false;
  bool _isDetectingVisualProduct = false;
  List<Product>? _visualSearchProducts;
  String _visualSearchError = '';
  String _visualSearchLabel = '';

  @override
  void initState() {
    super.initState();
    final seedQuery = widget.initialQuery.trim();
    _searchController = TextEditingController(text: seedQuery);
    _query = seedQuery;
    _imagePicker = ImagePicker();
    _productsFuture = _resolveScopedProducts(
      productsFuture: widget.productsFuture,
    );
    _loadRecentSearches();
    if (seedQuery.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _submitSearch(seedQuery);
        }
      });
    }
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

  Future<String> _resolveRecentSearchesKey() {
    return resolveBuyerRecentSearchesKey(platformId: widget.platformId);
  }

  Future<void> _loadRecentSearches() async {
    final key = await _resolveRecentSearchesKey();
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(key);
    if (mounted) {
      setState(() {
        _recentSearches = raw ?? <String>[];
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
      _isDetectingVisualProduct = false;
      _visualSearchProducts = null;
      _visualSearchError = '';
      _visualSearchLabel = '';
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
      if (_recentSearches.length > 30) {
        _recentSearches = _recentSearches.take(30).toList();
      }
      _query = nextQuery;
      _searchController.text = nextQuery;
      _searchController.selection = TextSelection.collapsed(
        offset: nextQuery.length,
      );
      _isDetectingVisualProduct = false;
      _visualSearchProducts = null;
      _visualSearchError = '';
      _visualSearchLabel = '';
    });

    _persistRecentSearches();
    unawaited(
      recordBuyerSearchEvent(
        nextQuery,
        platformId: widget.platformId,
        category: widget.category,
        storeType: widget.storeType,
      ),
    );
  }

  void _applySuggestion(String value) {
    final nextQuery = value.trim();
    if (nextQuery.isEmpty) {
      return;
    }
    FocusManager.instance.primaryFocus?.unfocus();
    _submitSearch(nextQuery);
  }

  void _clearSearch() {
    if (_searchController.text.isEmpty &&
        _query.isEmpty &&
        _visualSearchProducts == null &&
        _visualSearchError.isEmpty) {
      return;
    }

    setState(() {
      _searchController.clear();
      _query = '';
      _isDetectingVisualProduct = false;
      _visualSearchProducts = null;
      _visualSearchError = '';
      _visualSearchLabel = '';
    });
  }

  Future<void> _startVisualSearch() async {
    if (_isVisualSearching || _isDetectingVisualProduct) {
      return;
    }

    FocusManager.instance.primaryFocus?.unfocus();

    final pickedImage = await pickVisualSearchCameraImage(
      imagePicker: _imagePicker,
    );

    if (pickedImage == null) {
      return;
    }

    await _searchListingsFromScan(pickedImage);
  }

  Future<void> _searchListingsFromScan(
    VisualSearchCameraCapture pickedImage,
  ) async {
    if (_isVisualSearching || _isDetectingVisualProduct) {
      return;
    }

    FocusManager.instance.primaryFocus?.unfocus();

    setState(() {
      _isDetectingVisualProduct = true;
      _visualSearchProducts = null;
      _visualSearchError = '';
      _visualSearchLabel = '';
      _searchController.clear();
      _query = '';
    });

    try {
      final detection = await prepareVisualSearchImage(
        imagePath: pickedImage.imagePath,
        imageBytes: pickedImage.imageBytes,
        filename: pickedImage.filename,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _isDetectingVisualProduct = false;
        _isVisualSearching = true;
      });

      // Identify the product from saved listing images (YOLO class basis),
      // then open every live listing of that class. Not approve/reject.
      var matches = await widget.productRepository.searchProductsByImage(
        imageBytes: detection.imageBytes,
        filename: detection.filename,
      );
      matches = await _scopeVisualMatches(matches);

      final className = _scanClassFromVisualMatches(
        matches,
        detectorLabel: detection.label,
      );
      final catalog = await _productsFuture;
      final listings = _listingsForScanClass(
        catalog,
        className,
        visualMatches: matches,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _visualSearchProducts = listings;
        _visualSearchLabel = className;
        _isVisualSearching = false;
        if (className.isNotEmpty) {
          _query = className;
        }
      });
      if (className.isNotEmpty && _searchController.text != className) {
        _searchController.value = TextEditingValue(
          text: className,
          selection: TextSelection.collapsed(offset: className.length),
        );
      }

      if (listings.length == 1 && mounted) {
        await openProductDetailsPage(
          context,
          listings.first,
          platformId: widget.platformId,
        );
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isDetectingVisualProduct = false;
        _isVisualSearching = false;
        _visualSearchProducts = const <Product>[];
        _visualSearchError = error.toString();
      });
    }
  }

  String _scanClassFromVisualMatches(
    List<Product> visualMatches, {
    required String detectorLabel,
  }) {
    for (final product in visualMatches) {
      final name = product.name.trim();
      if (name.isNotEmpty) {
        return name;
      }
    }

    final label = detectorLabel.trim();
    if (_isSpecificScanClassLabel(label)) {
      return label;
    }
    return '';
  }

  List<Product> _listingsForScanClass(
    List<Product> catalog,
    String className, {
    List<Product> visualMatches = const <Product>[],
  }) {
    final normalizedClass = normalizeBuyerLiveSearchKey(className);
    if (normalizedClass.isEmpty) {
      return const <Product>[];
    }

    final ordered = <Product>[];
    final seenIds = <String>{};

    void addListing(Product product) {
      if (!isProductVisibleToUsers(product)) {
        return;
      }
      if (!_productMatchesScanClass(product, normalizedClass)) {
        return;
      }
      final id = product.id.trim().toLowerCase();
      if (id.isNotEmpty && !seenIds.add(id)) {
        return;
      }
      ordered.add(product);
    }

    for (final match in visualMatches) {
      addListing(match);
    }
    for (final product in catalog) {
      addListing(product);
    }

    return ordered;
  }

  bool _productMatchesScanClass(Product product, String normalizedClass) {
    final nameKey = normalizeBuyerLiveSearchKey(product.name);
    if (nameKey.isEmpty || normalizedClass.isEmpty) {
      return false;
    }
    return nameKey == normalizedClass ||
        nameKey.startsWith('$normalizedClass ') ||
        nameKey.contains(' $normalizedClass ') ||
        nameKey.endsWith(' $normalizedClass');
  }

  bool _isSpecificScanClassLabel(String label) {
    final normalized = normalizeBuyerLiveSearchKey(label);
    if (normalized.length < 3) {
      return false;
    }
    const genericLabels = <String>{
      'object',
      'item',
      'thing',
      'product',
      'food',
      'drink',
      'bottle',
      'package',
      'box',
      'container',
      'person',
      'unknown',
      'image',
      'photo',
      'packaged goods',
      'home good',
      'fashion good',
      'furniture',
      'kitchenware',
      'clothing',
      'shoe',
      'bag',
      'electronics',
      'tool',
    };
    return !genericLabels.contains(normalized);
  }

  Future<void> _runVisualSearchWithCapture(
    VisualSearchCameraCapture pickedImage,
  ) async {
    await _searchListingsFromScan(pickedImage);
  }

  Future<List<Product>> _resolveScopedProducts({
    required Future<List<Product>> productsFuture,
  }) async {
    final products = await productsFuture;
    final platformId = widget.platformId.trim();
    final sellersFuture = widget.sellersFuture;
    final storeTypesFuture = widget.storeTypesFuture;
    if (platformId.isEmpty ||
        sellersFuture == null ||
        storeTypesFuture == null) {
      return products;
    }

    final sellers = await sellersFuture;
    final storeTypes = await storeTypesFuture;
    return filterProductsForBuyerPlatform(
      products: products,
      storeTypes: storeTypes,
      sellers: sellers,
      platformId: platformId,
    );
  }

  Future<List<Product>> _scopeVisualMatches(List<Product> matches) async {
    final platformId = widget.platformId.trim();
    final sellersFuture = widget.sellersFuture;
    final storeTypesFuture = widget.storeTypesFuture;
    if (platformId.isEmpty ||
        sellersFuture == null ||
        storeTypesFuture == null) {
      return matches;
    }

    final sellers = await sellersFuture;
    final storeTypes = await storeTypesFuture;
    return filterProductsForBuyerPlatform(
      products: matches,
      storeTypes: storeTypes,
      sellers: sellers,
      platformId: platformId,
    );
  }

  Future<void> _refreshProducts() async {
    if (_isRefreshing) {
      return;
    }

    final nextFuture = _resolveScopedProducts(
      productsFuture: widget.productRepository.fetchProducts(
        forceRefresh: true,
      ),
    );

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

  List<Product> _filterProducts(List<Product> products) {
    final normalizedQuery = normalizeBuyerLiveSearchKey(_query);
    if (normalizedQuery.isEmpty) {
      return const <Product>[];
    }

    final scored = <({Product product, int score})>[];
    for (final product in products) {
      if (!isProductVisibleToUsers(product)) continue;
      final nameScore = buyerLiveSearchMatchScore(
        product.name,
        normalizedQuery,
      );
      final companyScore = buyerLiveSearchMatchScore(
        product.companyName,
        normalizedQuery,
      );
      final categoryScore = buyerLiveSearchMatchScore(
        product.categoryLabel,
        normalizedQuery,
      );
      var score = nameScore;
      if (companyScore > score) score = companyScore;
      if (categoryScore > score) score = categoryScore;
      if (score < 0) continue;
      scored.add((product: product, score: score));
    }

    scored.sort((left, right) {
      final byScore = right.score.compareTo(left.score);
      if (byScore != 0) return byScore;
      return right.product.createdAt.compareTo(left.product.createdAt);
    });

    return scored.map((entry) => entry.product).toList(growable: false);
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
    String header = '',
  }) {
    final productColumns = _buildProductColumns(products);
    final cardSurfaceColor =
        widget.productCardSurfaceColor ?? widget.surfaceColor;
    final resolvedHeader = header.trim();

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        if (resolvedHeader.isNotEmpty) ...[
          Text(
            resolvedHeader,
            style: TextStyle(
              color: widget.titleColor,
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            products.length == 1 ? '1 listing' : '${products.length} listings',
            style: TextStyle(
              color: widget.secondaryColor,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 14),
        ],
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (
              var columnIndex = 0;
              columnIndex < productColumns.length;
              columnIndex++
            ) ...[
              if (columnIndex > 0) const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (
                      var itemIndex = 0;
                      itemIndex < productColumns[columnIndex].length;
                      itemIndex++
                    ) ...[
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
                        platformId: widget.platformId,
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
    if (_isDetectingVisualProduct || _isVisualSearching) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: const [
          SizedBox(height: 12),
          SkeletonProductGrid(count: 6),
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
            title: 'No listing found',
            message:
                'This scan did not match a saved product. Try a clearer photo of the item.',
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
      header: _visualSearchLabel.trim().isEmpty
          ? ''
          : 'Listings for $_visualSearchLabel',
    );
  }

  Widget _buildSearchField({
    required Color fieldBackgroundColor,
    required bool autofocus,
  }) {
    return ProductSearchBar(
      controller: _searchController,
      onChanged: _handleSearchChanged,
      onSubmitted: _submitSearch,
      onClear: _clearSearch,
      iconColor: widget.primaryColor,
      textColor: widget.titleColor,
      backgroundColor: fieldBackgroundColor,
      autofocus: autofocus,
      onCameraTap: _startVisualSearch,
      isCameraLoading: _isDetectingVisualProduct || _isVisualSearching,
      onTapOutside: dismissSearchKeyboardOnTapOutside,
    );
  }

  Widget _buildSearchResults() {
    final showResults = _query.isNotEmpty;
    final showVisualResults =
        _isDetectingVisualProduct ||
        _isVisualSearching ||
        _visualSearchProducts != null ||
        _visualSearchError.isNotEmpty;

    if (showVisualResults) {
      return _buildVisualSearchResults();
    }
    if (showResults) {
      return FutureBuilder<List<Product>>(
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
                children: const [
                  SizedBox(height: 12),
                  SkeletonProductGrid(count: 6),
                ],
              ),
            );
          }

          final allProducts = snapshot.data ?? const <Product>[];
          final topSellerIds = {
            for (final product in _buildSearchTopSellingProducts(allProducts))
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
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
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
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    children: [
                      _SearchStatusView(
                        icon: Icons.search_off_rounded,
                        title: 'No matching products',
                        message: 'Try another product name or category.',
                        primaryColor: widget.primaryColor,
                        showSearchNotFoundArt: true,
                      ),
                    ],
                  )
                : _buildProductResultList(
                    visibleProducts,
                    topSellerIds: topSellerIds,
                  ),
          );
        },
      );
    }

    return BuyerSearchSuggestionsPanel(
      primaryColor: widget.primaryColor,
      titleColor: widget.titleColor,
      secondaryColor: widget.secondaryColor,
      platformId: widget.platformId,
      onSelectTerm: _applySuggestion,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fieldBackgroundColor =
        theme.inputDecorationTheme.fillColor ??
        theme.colorScheme.surfaceContainerHighest.withOpacity(0.65);
    final autofocus =
        !widget.startWithCamera && widget.initialVisualSearchCapture == null;

    if (widget.embedded) {
      return ColoredBox(
        color: widget.surfaceColor,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 4, 16, 14),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: widget.titleColor,
                      size: 20,
                    ),
                    onPressed: widget.onEmbeddedClose,
                  ),
                  Expanded(
                    child: _buildSearchField(
                      fieldBackgroundColor: fieldBackgroundColor,
                      autofocus: autofocus,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(child: _buildSearchResults()),
          ],
        ),
      );
    }

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
              child: _buildSearchField(
                fieldBackgroundColor: fieldBackgroundColor,
                autofocus: autofocus,
              ),
            ),
            Expanded(child: _buildSearchResults()),
          ],
        ),
      ),
    );
  }
}

class BuyerSearchSuggestionsPanel extends StatefulWidget {
  const BuyerSearchSuggestionsPanel({
    super.key,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onSelectTerm,
    this.platformId = '',
    this.padding = const EdgeInsets.fromLTRB(16, 0, 16, 24),
  });

  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final ValueChanged<String> onSelectTerm;
  final String platformId;
  final EdgeInsetsGeometry padding;

  @override
  State<BuyerSearchSuggestionsPanel> createState() =>
      _BuyerSearchSuggestionsPanelState();
}

class _BuyerSearchSuggestionsPanelState
    extends State<BuyerSearchSuggestionsPanel> {
  static const int _collapsedRecentSearchLimit = 5;
  static const int _collapsedTrendingLimit = 6;

  List<String> _recentSearches = <String>[];
  List<TrendingSearchTerm> _trendingSearches = <TrendingSearchTerm>[];
  bool _recentSearchesLoaded = false;
  bool _trendingSearchesLoaded = false;
  bool _showAllRecentSearches = false;
  bool _showAllTrendingSearches = false;
  int _suggestionsEpoch = 0;

  @override
  void initState() {
    super.initState();
    _loadRecentSearches();
    _loadTrendingSearches();
  }

  @override
  void didUpdateWidget(covariant BuyerSearchSuggestionsPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.platformId.trim().toLowerCase() !=
        widget.platformId.trim().toLowerCase()) {
      _recentSearchesLoaded = false;
      _trendingSearchesLoaded = false;
      _showAllRecentSearches = false;
      _showAllTrendingSearches = false;
      _suggestionsEpoch++;
      _loadRecentSearches();
      _loadTrendingSearches();
    }
  }

  Future<String> _resolveRecentSearchesKey() {
    return resolveBuyerRecentSearchesKey(platformId: widget.platformId);
  }

  Future<void> _loadRecentSearches() async {
    final key = await _resolveRecentSearchesKey();
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(key);
    if (!mounted) return;
    setState(() {
      _recentSearches = raw ?? <String>[];
      _recentSearchesLoaded = true;
    });
  }

  Future<void> _loadTrendingSearches() async {
    final trending = await fetchTrendingSearches(
      limit: 18,
      platformId: widget.platformId,
    );
    if (!mounted) return;
    setState(() {
      _trendingSearches = trending;
      _trendingSearchesLoaded = true;
    });
  }

  Future<void> _persistRecentSearches() async {
    final key = await _resolveRecentSearchesKey();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(key, _recentSearches);
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
    if (_recentSearches.isEmpty) return;
    setState(() {
      _recentSearches.clear();
      _showAllRecentSearches = false;
    });
    _persistRecentSearches();
  }

  Future<void> _refreshSuggestions() async {
    setState(() {
      _recentSearchesLoaded = false;
      _trendingSearchesLoaded = false;
      _suggestionsEpoch++;
    });
    await Future.wait<void>([_loadRecentSearches(), _loadTrendingSearches()]);
  }

  void _selectTerm(String value) {
    final nextQuery = value.trim();
    if (nextQuery.isEmpty) return;

    final existingIndex = _recentSearches.indexWhere(
      (entry) => entry.toLowerCase() == nextQuery.toLowerCase(),
    );
    if (existingIndex >= 0) {
      _recentSearches.removeAt(existingIndex);
    }
    setState(() {
      _recentSearches.insert(0, nextQuery);
      if (_recentSearches.length > 30) {
        _recentSearches = _recentSearches.take(30).toList();
      }
      _showAllRecentSearches = false;
    });
    _persistRecentSearches();
    widget.onSelectTerm(nextQuery);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final visibleRecent =
        (!_showAllRecentSearches &&
            _recentSearches.length > _collapsedRecentSearchLimit)
        ? _recentSearches.take(_collapsedRecentSearchLimit).toList()
        : _recentSearches;
    final visibleTrending =
        (!_showAllTrendingSearches &&
            _trendingSearches.length > _collapsedTrendingLimit)
        ? _trendingSearches.take(_collapsedTrendingLimit).toList()
        : _trendingSearches;
    final hasHiddenTrending =
        !_showAllTrendingSearches &&
        _trendingSearches.length > _collapsedTrendingLimit;

    final suggestionsReady =
        _recentSearchesLoaded && _trendingSearchesLoaded;

    return RefreshIndicator(
      color: widget.primaryColor,
      onRefresh: _refreshSuggestions,
      child: MinimumSkeletonReveal(
        switchKey: ValueKey<int>(_suggestionsEpoch),
        ready: suggestionsReady,
        skeleton: SkeletonSearchSuggestionsPanel(padding: widget.padding),
        child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: widget.padding,
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          if (visibleTrending.isNotEmpty) ...[
            Row(
              children: [
                Image.asset(
                  _topSearchFireArtAsset,
                  width: 22,
                  height: 22,
                  fit: BoxFit.contain,
                  filterQuality: FilterQuality.high,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Top Searches',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: widget.titleColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (hasHiddenTrending || _showAllTrendingSearches)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _showAllTrendingSearches = !_showAllTrendingSearches;
                      });
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: searchAccentGreen,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      _showAllTrendingSearches ? 'Show less' : 'See All',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in visibleTrending)
                  _TopSearchChip(
                    label: item.term,
                    onTap: () => _selectTerm(item.term),
                  ),
              ],
            ),
            const SizedBox(height: 22),
          ],
          Row(
            children: [
              Image.asset(
                _recentSearchHeadingArtAsset,
                width: 22,
                height: 22,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.high,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Recent Searches',
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: widget.titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (_recentSearches.isNotEmpty)
                TextButton(
                  onPressed: _clearAllRecentSearches,
                  style: TextButton.styleFrom(
                    foregroundColor: searchAccentGreen,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text(
                    'Clear All',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (_recentSearches.isEmpty)
            _RecentSearchEmptyState(
              title: 'No recent searches yet',
              message: 'Your recent searches will show up here.',
              titleColor: widget.titleColor,
              secondaryColor: widget.secondaryColor,
            )
          else
            _RecentSearchesCard(
              searches: visibleRecent,
              primaryColor: widget.primaryColor,
              titleColor: widget.titleColor,
              secondaryColor: widget.secondaryColor,
              onDeleteSearch: _deleteRecentSearch,
              onSelectSearch: _selectTerm,
            ),
          if (!_showAllRecentSearches &&
              _recentSearches.length > _collapsedRecentSearchLimit) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.center,
              child: TextButton(
                onPressed: () {
                  setState(() {
                    _showAllRecentSearches = true;
                  });
                },
                style: TextButton.styleFrom(
                  foregroundColor: searchAccentGreen,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                ),
                child: const Text('See more'),
              ),
            ),
          ],
        ],
      ),
      ),
    );
  }
}

class _TopSearchChip extends StatelessWidget {
  const _TopSearchChip({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _searchChipMint,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _lucideTrendingUpIcon(
                color: _searchAccentGreen,
                size: 15,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: Color(0xFF1F2937),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
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
    required this.onSelectSearch,
  });

  final List<String> searches;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final ValueChanged<String> onDeleteSearch;
  final ValueChanged<String> onSelectSearch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final search in searches)
              ConstrainedBox(
                constraints: BoxConstraints(maxWidth: constraints.maxWidth),
                child: Material(
                  color: theme.colorScheme.surfaceContainerHighest.withOpacity(
                    theme.brightness == Brightness.dark ? 0.58 : 0.72,
                  ),
                  borderRadius: BorderRadius.circular(999),
                  child: InkWell(
                    onTap: () => onSelectSearch(search),
                    borderRadius: BorderRadius.circular(999),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(11, 7, 6, 7),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _lucideClockFadingIcon(
                            color: secondaryColor.withOpacity(0.9),
                            size: 17,
                          ),
                          const SizedBox(width: 7),
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: constraints.maxWidth - 78,
                            ),
                            child: Text(
                              search,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: titleColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 3),
                          GestureDetector(
                            onTap: () => onDeleteSearch(search),
                            behavior: HitTestBehavior.opaque,
                            child: Padding(
                              padding: const EdgeInsets.all(3),
                              child: Icon(
                                Icons.close_rounded,
                                color: secondaryColor,
                                size: 17,
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
        );
      },
    );
  }
}

List<Product> _buildSearchTopSellingProducts(
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
    this.platformId = '',
  });

  final Product product;
  final Color surfaceColor;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final bool showTopSellerBadge;
  final String platformId;

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

    return ColoredBox(
      color: Colors.white,
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

                      return const SkeletonShimmer(baseColor: kSkeletonBaseColor);
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
      onTapWithHero: (heroTag) => openProductDetailsPage(
        context,
        product,
        heroTag: heroTag,
        platformId: platformId,
      ),
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
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
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
        _lucideFilledStarIcon(color: iconColor, size: 16),
        const SizedBox(width: 4),
        Text(
          _formatSearchProductRating(product.rating),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textStyle,
        ),
        const SizedBox(width: 10),
        Icon(Icons.mode_comment_outlined, size: 15, color: commentIconColor),
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
    this.showSearchNotFoundArt = false,
  });

  final IconData icon;
  final String title;
  final String message;
  final Color primaryColor;
  final bool showSearchNotFoundArt;

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
          if (showSearchNotFoundArt)
            const SearchNotFoundArt(size: 124)
          else
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: primaryColor.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: primaryColor, size: 28),
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

class _RecentSearchEmptyState extends StatelessWidget {
  const _RecentSearchEmptyState({
    required this.title,
    required this.message,
    required this.titleColor,
    required this.secondaryColor,
    this.showSearchNotFoundArt = false,
  });

  final String title;
  final String message;
  final Color titleColor;
  final Color secondaryColor;
  final bool showSearchNotFoundArt;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          showSearchNotFoundArt
              ? const SearchNotFoundArt(size: 160)
              : SizedBox(
                  width: 206,
                  height: 178,
                  child: Image.asset(
                    'assets/images/recent-search-empty-art.png',
                    fit: BoxFit.contain,
                    filterQuality: FilterQuality.high,
                    semanticLabel: 'Open box with a search magnifying glass',
                  ),
                ),
          const SizedBox(height: 2),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: titleColor,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 7),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 280),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: secondaryColor,
                height: 1.4,
              ),
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
    this.decoration,
    this.fontSize,
  });

  final double amount;
  final Color color;
  final TextDecoration? decoration;
  final double? fontSize;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(
      amount: amount,
      color: color,
      decoration: decoration,
      fontSize: fontSize,
      fontWeight: FontWeight.w600,
      trimTrailingZeros: false,
    );
  }
}

enum BuyerLiveSearchKind { company, listing }

class BuyerLiveSearchHit {
  const BuyerLiveSearchHit({
    required this.kind,
    required this.title,
    required this.subtitle,
    this.platformId = '',
    this.platform,
    this.storeType,
    this.seller,
    this.product,
    this.relatedProducts = const <Product>[],
    this.soldCount = 0,
    this.disabledReason = '',
  });

  final BuyerLiveSearchKind kind;
  final String title;
  final String subtitle;
  final String platformId;
  final BuyerPlatformSummary? platform;
  final StoreTypeSummary? storeType;
  final SellerSummary? seller;
  final Product? product;
  final List<Product> relatedProducts;

  /// Aggregate units sold for this company (from product.sold after completed sales).
  final int soldCount;
  final String disabledReason;

  bool get isDisabled => disabledReason.trim().isNotEmpty;
}

String normalizeBuyerLiveSearchKey(String value) {
  return value
      .trim()
      .toLowerCase()
      .replaceAll('&', ' and ')
      .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
      .trim();
}

int _buyerLiveSearchEditDistance(String left, String right) {
  if (left == right) return 0;
  if (left.isEmpty) return right.length;
  if (right.isEmpty) return left.length;

  final rows = left.length + 1;
  final cols = right.length + 1;
  final prev = List<int>.generate(cols, (index) => index);
  final curr = List<int>.filled(cols, 0);

  for (var i = 1; i < rows; i++) {
    curr[0] = i;
    final leftChar = left.codeUnitAt(i - 1);
    for (var j = 1; j < cols; j++) {
      final cost = leftChar == right.codeUnitAt(j - 1) ? 0 : 1;
      final deletion = prev[j] + 1;
      final insertion = curr[j - 1] + 1;
      final substitution = prev[j - 1] + cost;
      curr[j] = deletion < insertion
          ? (deletion < substitution ? deletion : substitution)
          : (insertion < substitution ? insertion : substitution);
    }
    for (var j = 0; j < cols; j++) {
      prev[j] = curr[j];
    }
  }
  return prev[cols - 1];
}

int _buyerLiveSearchMaxEdits(String query) {
  final length = query.length;
  if (length <= 2) return 0;
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  return 3;
}

/// Higher score = stronger match. Returns `-1` when nothing matches.
int buyerLiveSearchMatchScore(String haystack, String normalizedQuery) {
  final key = normalizeBuyerLiveSearchKey(haystack);
  final query = normalizeBuyerLiveSearchKey(normalizedQuery);
  if (key.isEmpty || query.isEmpty) return -1;

  if (key == query) return 300;
  if (key.startsWith(query)) return 200;
  if (key.contains(query)) return 100;

  final compactKey = key.replaceAll(' ', '');
  final compactQuery = query.replaceAll(' ', '');
  if (compactKey.contains(compactQuery)) return 95;
  if (compactKey.startsWith(compactQuery)) return 90;

  final keyTokens = key
      .split(' ')
      .where((token) => token.isNotEmpty)
      .toList(growable: false);
  final queryTokens = query
      .split(' ')
      .where((token) => token.isNotEmpty)
      .toList(growable: false);

  if (queryTokens.isNotEmpty &&
      queryTokens.every(
        (queryToken) => keyTokens.any(
          (keyToken) =>
              keyToken == queryToken ||
              keyToken.startsWith(queryToken) ||
              keyToken.contains(queryToken) ||
              queryToken.contains(keyToken),
        ),
      )) {
    return 85;
  }

  if (queryTokens.any(
    (queryToken) => keyTokens.any(
      (keyToken) =>
          keyToken.startsWith(queryToken) || queryToken.startsWith(keyToken),
    ),
  )) {
    return 75;
  }

  final maxEdits = _buyerLiveSearchMaxEdits(compactQuery);
  if (maxEdits > 0) {
    if (_buyerLiveSearchEditDistance(compactKey, compactQuery) <= maxEdits) {
      return 65;
    }

    for (final token in keyTokens) {
      if ((token.length - compactQuery.length).abs() > maxEdits) continue;
      if (_buyerLiveSearchEditDistance(token, compactQuery) <= maxEdits) {
        return 60;
      }
    }

    if (compactQuery.length >= 3 && compactKey.length >= compactQuery.length) {
      final prefix = compactKey.substring(0, compactQuery.length);
      if (_buyerLiveSearchEditDistance(prefix, compactQuery) <= 1) {
        return 50;
      }
    }

    // Allow a typo inside a longer token (e.g. "bananna" → "banana shake").
    for (final token in keyTokens) {
      if (token.length < compactQuery.length) continue;
      for (
        var start = 0;
        start <= token.length - compactQuery.length;
        start++
      ) {
        final slice = token.substring(start, start + compactQuery.length);
        if (_buyerLiveSearchEditDistance(slice, compactQuery) <= 1) {
          return 45;
        }
      }
    }
  }

  return -1;
}

int _buyerLiveSearchMatchScore(String haystack, String normalizedQuery) {
  return buyerLiveSearchMatchScore(haystack, normalizedQuery);
}

String _buyerLiveSearchPlatformLabel(
  List<BuyerPlatformSummary> platforms,
  String platformId,
) {
  final wanted = platformId.trim().toLowerCase();
  for (final platform in platforms) {
    if (platform.id.trim().toLowerCase() == wanted) {
      return platform.name.trim().isEmpty ? platform.id : platform.name.trim();
    }
  }
  if (wanted.isEmpty) return '';
  return wanted[0].toUpperCase() + wanted.substring(1);
}

String _buyerLiveSearchStoreTypePlatformId(StoreTypeSummary item) {
  final explicit = item.platformId.trim().toLowerCase();
  if (explicit.isNotEmpty) return explicit;
  final key = normalizeBuyerLiveSearchKey(item.name);
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

Set<String> _buyerPlatformSellerAdminIds({
  required List<StoreTypeSummary> storeTypes,
  required List<SellerSummary> sellers,
  required String platformId,
}) {
  final wanted = platformId.trim().toLowerCase();
  if (wanted.isEmpty) return const <String>{};

  final typeKeys = storeTypes
      .where((item) => _buyerLiveSearchStoreTypePlatformId(item) == wanted)
      .map((item) => normalizeBuyerLiveSearchKey(item.name))
      .where((key) => key.isNotEmpty)
      .toSet();
  if (typeKeys.isEmpty) {
    return const <String>{};
  }

  return sellers
      .where(
        (seller) =>
            typeKeys.contains(normalizeBuyerLiveSearchKey(seller.storeType)),
      )
      .map((seller) => seller.adminId.trim().toLowerCase())
      .where((id) => id.isNotEmpty)
      .toSet();
}

/// Keeps only products sold by sellers that belong to [platformId]
/// (shop → shop listings, food → food listings, etc.).
List<Product> filterProductsForBuyerPlatform({
  required List<Product> products,
  required List<StoreTypeSummary> storeTypes,
  required List<SellerSummary> sellers,
  required String platformId,
}) {
  final adminIds = _buyerPlatformSellerAdminIds(
    storeTypes: storeTypes,
    sellers: sellers,
    platformId: platformId,
  );
  if (adminIds.isEmpty) {
    return const <Product>[];
  }

  return filterVisibleProducts(products)
      .where(
        (product) => adminIds.contains(product.adminId.trim().toLowerCase()),
      )
      .toList(growable: false);
}

List<BuyerLiveSearchHit> buildBuyerLiveSearchHits({
  required String query,
  required List<BuyerPlatformSummary> platforms,
  required List<StoreTypeSummary> storeTypes,
  required List<SellerSummary> sellers,
  required List<Product> products,
  String platformId = '',
  int limitPerSection = 12,
}) {
  final rawQuery = query.trim();
  final normalizedQuery = normalizeBuyerLiveSearchKey(rawQuery);
  if (normalizedQuery.isEmpty) {
    return const <BuyerLiveSearchHit>[];
  }

  final scopedPlatformId = platformId.trim().toLowerCase();
  final platformAdminIds = scopedPlatformId.isEmpty
      ? const <String>{}
      : _buyerPlatformSellerAdminIds(
          storeTypes: storeTypes,
          sellers: sellers,
          platformId: scopedPlatformId,
        );

  final platformById = <String, BuyerPlatformSummary>{
    for (final platform in platforms)
      if (platform.id.trim().isNotEmpty)
        platform.id.trim().toLowerCase(): platform,
  };

  bool isPlatformActive(String id) {
    if (id.trim().isEmpty) return true;
    final platform = platformById[id.trim().toLowerCase()];
    if (platform == null) return true;
    if (platform.status == 'inactive') return false;
    if (platform.comingSoon) return false;
    return true;
  }

  String? disabledForPlatform(String id) {
    final platform = platformById[id.trim().toLowerCase()];
    if (platform == null) return null;
    if (platform.status == 'inactive') {
      return '${platform.name} is unavailable.';
    }
    if (platform.comingSoon) {
      return '${platform.name} is coming soon.';
    }
    return null;
  }

  StoreTypeSummary? storeTypeForSeller(SellerSummary seller) {
    final sellerStoreTypeKey = normalizeBuyerLiveSearchKey(seller.storeType);
    if (sellerStoreTypeKey.isEmpty) return null;
    for (final storeType in storeTypes) {
      if (normalizeBuyerLiveSearchKey(storeType.name) == sellerStoreTypeKey) {
        return storeType;
      }
    }
    return null;
  }

  SellerSummary? sellerForProduct(Product product) {
    final adminId = product.adminId.trim().toLowerCase();
    if (adminId.isEmpty) return null;
    for (final seller in sellers) {
      if (seller.adminId.trim().toLowerCase() == adminId) {
        return seller;
      }
    }
    return null;
  }

  final productsBySellerId = <String, List<Product>>{};
  for (final product in products) {
    if (!isProductVisibleToUsers(product)) continue;
    final adminId = product.adminId.trim().toLowerCase();
    if (adminId.isEmpty) continue;
    productsBySellerId.putIfAbsent(adminId, () => <Product>[]).add(product);
  }
  for (final sellerProducts in productsBySellerId.values) {
    sellerProducts.sort((left, right) {
      final ratingOrder = right.rating.compareTo(left.rating);
      if (ratingOrder != 0) return ratingOrder;
      final reviewOrder = right.ratingCount.compareTo(left.ratingCount);
      if (reviewOrder != 0) return reviewOrder;
      final soldOrder = right.sold.compareTo(left.sold);
      if (soldOrder != 0) return soldOrder;
      return right.createdAt.compareTo(left.createdAt);
    });
  }

  List<Product> bestProductsForSeller(
    SellerSummary seller, {
    Product? matchedProduct,
  }) {
    final products = List<Product>.from(
      productsBySellerId[seller.adminId.trim().toLowerCase()] ??
          const <Product>[],
    );
    if (matchedProduct != null) {
      products.removeWhere((item) => item.id == matchedProduct.id);
      products.insert(0, matchedProduct);
    }
    return products.take(10).toList(growable: false);
  }

  int soldCountForSeller(SellerSummary seller) {
    final sellerProducts =
        productsBySellerId[seller.adminId.trim().toLowerCase()] ??
        const <Product>[];
    return sellerProducts.fold<int>(
      0,
      (total, product) => total + (product.sold < 0 ? 0 : product.sold),
    );
  }

  final companyHits = <({BuyerLiveSearchHit hit, int score})>[];
  for (final seller in sellers) {
    final companyScore = _buyerLiveSearchMatchScore(
      seller.companyName,
      normalizedQuery,
    );
    final nameScore = _buyerLiveSearchMatchScore(seller.name, normalizedQuery);
    final displayScore = _buyerLiveSearchMatchScore(
      seller.displayName,
      normalizedQuery,
    );
    var score = companyScore;
    if (nameScore > score) score = nameScore;
    if (displayScore > score) score = displayScore;
    if (score < 0) continue;

    final linkedStoreType = storeTypeForSeller(seller);
    final hitPlatformId = linkedStoreType == null
        ? ''
        : _buyerLiveSearchStoreTypePlatformId(linkedStoreType);
    if (scopedPlatformId.isNotEmpty && hitPlatformId != scopedPlatformId) {
      continue;
    }
    if (hitPlatformId.isNotEmpty && !isPlatformActive(hitPlatformId)) {
      continue;
    }
    final platformLabel = hitPlatformId.isEmpty
        ? ''
        : _buyerLiveSearchPlatformLabel(platforms, hitPlatformId);
    final path = [
      if (platformLabel.isNotEmpty) platformLabel,
      if (seller.storeType.trim().isNotEmpty) seller.storeType.trim(),
    ].join(' · ');

    companyHits.add((
      hit: BuyerLiveSearchHit(
        kind: BuyerLiveSearchKind.company,
        title: seller.displayName,
        subtitle: path.isEmpty ? 'Company' : path,
        platformId: hitPlatformId,
        platform: platformById[hitPlatformId],
        storeType: linkedStoreType,
        seller: seller,
        relatedProducts: bestProductsForSeller(seller),
        soldCount: soldCountForSeller(seller),
        disabledReason: hitPlatformId.isEmpty
            ? ''
            : (disabledForPlatform(hitPlatformId) ?? ''),
      ),
      score: score,
    ));
  }
  companyHits.sort((a, b) => b.score.compareTo(a.score));

  final listingHits = <({BuyerLiveSearchHit hit, int score})>[];
  for (final product in products) {
    if (!isProductVisibleToUsers(product)) continue;
    if (scopedPlatformId.isNotEmpty) {
      final adminId = product.adminId.trim().toLowerCase();
      if (adminId.isEmpty || !platformAdminIds.contains(adminId)) {
        continue;
      }
    }
    final nameScore = _buyerLiveSearchMatchScore(product.name, normalizedQuery);
    final companyScore = _buyerLiveSearchMatchScore(
      product.companyName,
      normalizedQuery,
    );
    var score = nameScore;
    if (companyScore > score) score = companyScore;
    if (score < 0) continue;

    final linkedSeller = sellerForProduct(product);
    final linkedStoreType = linkedSeller == null
        ? null
        : storeTypeForSeller(linkedSeller);
    final hitPlatformId = linkedStoreType == null
        ? ''
        : _buyerLiveSearchStoreTypePlatformId(linkedStoreType);
    final companyLabel = product.companyName.trim().isNotEmpty
        ? product.companyName.trim()
        : 'Listing';
    listingHits.add((
      hit: BuyerLiveSearchHit(
        kind: BuyerLiveSearchKind.listing,
        title: product.name.trim().isEmpty ? 'Listing' : product.name.trim(),
        subtitle: companyLabel,
        platformId: hitPlatformId,
        platform: platformById[hitPlatformId],
        storeType: linkedStoreType,
        seller: linkedSeller,
        product: product,
        relatedProducts: linkedSeller == null
            ? <Product>[product]
            : bestProductsForSeller(linkedSeller, matchedProduct: product),
        soldCount: linkedSeller == null
            ? (product.sold < 0 ? 0 : product.sold)
            : soldCountForSeller(linkedSeller),
      ),
      score: score,
    ));
  }
  listingHits.sort((a, b) => b.score.compareTo(a.score));

  return <BuyerLiveSearchHit>[
    ...companyHits.take(limitPerSection).map((entry) => entry.hit),
    ...listingHits.take(limitPerSection).map((entry) => entry.hit),
  ];
}

class BuyerPossibleSearchTerm {
  const BuyerPossibleSearchTerm({
    required this.term,
    required this.kindLabel,
    required this.score,
  });

  final String term;
  final String kindLabel;
  final int score;
}

/// Autocomplete-style terms from everything searchable in the buyer catalog.
/// Used while typing — before platform / listing results are shown.
List<BuyerPossibleSearchTerm> buildBuyerPossibleSearchTerms({
  required String query,
  required List<BuyerPlatformSummary> platforms,
  required List<StoreTypeSummary> storeTypes,
  required List<SellerSummary> sellers,
  required List<Product> products,
  List<String> extraTerms = const <String>[],
  String platformId = '',
  int limit = 40,
}) {
  final rawQuery = query.trim();
  final normalizedQuery = normalizeBuyerLiveSearchKey(rawQuery);
  if (normalizedQuery.isEmpty) {
    return const <BuyerPossibleSearchTerm>[];
  }

  final scopedPlatformId = platformId.trim().toLowerCase();
  final platformAdminIds = scopedPlatformId.isEmpty
      ? const <String>{}
      : _buyerPlatformSellerAdminIds(
          storeTypes: storeTypes,
          sellers: sellers,
          platformId: scopedPlatformId,
        );

  final bestByKey = <String, BuyerPossibleSearchTerm>{};

  void consider(String rawTerm, String kindLabel, int score) {
    final term = rawTerm.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (term.isEmpty || score < 0) return;
    final key = normalizeBuyerLiveSearchKey(term);
    if (key.isEmpty) return;
    final existing = bestByKey[key];
    if (existing == null || score > existing.score) {
      bestByKey[key] = BuyerPossibleSearchTerm(
        term: term,
        kindLabel: kindLabel,
        score: score,
      );
    }
  }

  for (final platform in platforms) {
    final name = platform.name.trim();
    if (name.isEmpty) continue;
    consider(
      name,
      'Platform',
      buyerLiveSearchMatchScore(name, normalizedQuery),
    );
  }

  for (final storeType in storeTypes) {
    if (scopedPlatformId.isNotEmpty &&
        _buyerLiveSearchStoreTypePlatformId(storeType) != scopedPlatformId) {
      continue;
    }
    final name = storeType.name.trim();
    if (name.isEmpty) continue;
    consider(
      name,
      'Category',
      buyerLiveSearchMatchScore(name, normalizedQuery),
    );
  }

  for (final seller in sellers) {
    if (scopedPlatformId.isNotEmpty && platformAdminIds.isNotEmpty) {
      final adminId = seller.adminId.trim().toLowerCase();
      if (!platformAdminIds.contains(adminId)) continue;
    }
    final company = seller.companyName.trim();
    if (company.isNotEmpty) {
      consider(
        company,
        'Shop',
        buyerLiveSearchMatchScore(company, normalizedQuery),
      );
    }
    final display = seller.displayName.trim();
    if (display.isNotEmpty &&
        normalizeBuyerLiveSearchKey(display) !=
            normalizeBuyerLiveSearchKey(company)) {
      consider(
        display,
        'Shop',
        buyerLiveSearchMatchScore(display, normalizedQuery),
      );
    }
  }

  for (final product in products) {
    if (!isProductVisibleToUsers(product)) continue;
    if (scopedPlatformId.isNotEmpty && platformAdminIds.isNotEmpty) {
      final adminId = product.adminId.trim().toLowerCase();
      if (!platformAdminIds.contains(adminId)) continue;
    }
    final name = product.name.trim();
    if (name.isEmpty) continue;
    consider(name, 'Listing', buyerLiveSearchMatchScore(name, normalizedQuery));
    final category = product.categoryLabel.trim();
    if (category.isNotEmpty) {
      consider(
        category,
        'Category',
        buyerLiveSearchMatchScore(category, normalizedQuery),
      );
    }
  }

  for (final extra in extraTerms) {
    final term = extra.trim();
    if (term.isEmpty) continue;
    consider(term, 'Search', buyerLiveSearchMatchScore(term, normalizedQuery));
  }

  // Always offer searching the typed query itself when nothing exact exists.
  final typedKey = normalizedQuery;
  if (!bestByKey.containsKey(typedKey)) {
    bestByKey[typedKey] = BuyerPossibleSearchTerm(
      term: rawQuery,
      kindLabel: 'Search',
      score: 290,
    );
  }

  final ranked = bestByKey.values.toList(growable: false)
    ..sort((left, right) {
      final byScore = right.score.compareTo(left.score);
      if (byScore != 0) return byScore;
      return left.term.toLowerCase().compareTo(right.term.toLowerCase());
    });

  return ranked.take(limit).toList(growable: false);
}

class BuyerPossibleSearchesPanel extends StatelessWidget {
  const BuyerPossibleSearchesPanel({
    super.key,
    required this.query,
    required this.terms,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onSelectTerm,
    this.padding = const EdgeInsets.fromLTRB(16, 0, 16, 24),
    this.isLoading = false,
    this.onRefresh,
  });

  final String query;
  final List<BuyerPossibleSearchTerm> terms;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final ValueChanged<String> onSelectTerm;
  final EdgeInsetsGeometry padding;
  final bool isLoading;
  final Future<void> Function()? onRefresh;

  Widget _wrapRefresh(Widget child) {
    final refresh = onRefresh;
    if (refresh == null) return child;
    return RefreshIndicator(
      color: primaryColor,
      onRefresh: refresh,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final trimmedQuery = query.trim();

    if (isLoading && terms.isEmpty) {
      return _wrapRefresh(
        const SkeletonListRows(count: 8),
      );
    }

    if (terms.isEmpty) {
      return _wrapRefresh(
        ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: padding,
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          children: [
            _RecentSearchEmptyState(
              title: 'No matching searches',
              message: trimmedQuery.isEmpty
                  ? 'Start typing to see possible searches.'
                  : 'No possible searches for "$trimmedQuery".',
              titleColor: titleColor,
              secondaryColor: secondaryColor,
              showSearchNotFoundArt: true,
            ),
          ],
        ),
      );
    }

    return _wrapRefresh(
      ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: padding,
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          for (var index = 0; index < terms.length; index++) ...[
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onSelectTerm(terms[index].term),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4,
                    vertical: 10,
                  ),
                  child: Row(
                    children: [
                      _lucideSearchIcon(
                        color: secondaryColor.withOpacity(0.85),
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _PossibleSearchTermLabel(
                          term: terms[index].term,
                          query: trimmedQuery,
                          titleColor: titleColor,
                        ),
                      ),
                      Icon(
                        Icons.north_west_rounded,
                        color: secondaryColor.withOpacity(0.55),
                        size: 16,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PossibleSearchTermLabel extends StatelessWidget {
  const _PossibleSearchTermLabel({
    required this.term,
    required this.query,
    required this.titleColor,
  });

  final String term;
  final String query;
  final Color titleColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final baseStyle = theme.textTheme.bodyMedium?.copyWith(
      color: titleColor,
      fontWeight: FontWeight.w600,
    );
    final highlightStyle = baseStyle?.copyWith(
      color: searchAccentGreen,
      fontWeight: FontWeight.w800,
    );

    final lowerTerm = term.toLowerCase();
    final lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.isEmpty) {
      return Text(
        term,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: baseStyle,
      );
    }

    final matchIndex = lowerTerm.indexOf(lowerQuery);
    if (matchIndex < 0) {
      return Text(
        term,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: baseStyle,
      );
    }

    final before = term.substring(0, matchIndex);
    final match = term.substring(matchIndex, matchIndex + lowerQuery.length);
    final after = term.substring(matchIndex + lowerQuery.length);

    return Text.rich(
      TextSpan(
        children: [
          if (before.isNotEmpty) TextSpan(text: before, style: baseStyle),
          TextSpan(text: match, style: highlightStyle),
          if (after.isNotEmpty) TextSpan(text: after, style: baseStyle),
        ],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

enum _LiveSearchLazyRowKind { summaryHeader, platformHeader, company }

class _LiveSearchLazyRow {
  const _LiveSearchLazyRow._(this.kind, {this.platformAnchorHit, this.companyHits});

  final _LiveSearchLazyRowKind kind;
  final BuyerLiveSearchHit? platformAnchorHit;
  final List<BuyerLiveSearchHit>? companyHits;

  factory _LiveSearchLazyRow.summaryHeader() {
    return const _LiveSearchLazyRow._(_LiveSearchLazyRowKind.summaryHeader);
  }

  factory _LiveSearchLazyRow.platform(BuyerLiveSearchHit anchor) {
    return _LiveSearchLazyRow._(
      _LiveSearchLazyRowKind.platformHeader,
      platformAnchorHit: anchor,
    );
  }

  factory _LiveSearchLazyRow.company(List<BuyerLiveSearchHit> hits) {
    return _LiveSearchLazyRow._(
      _LiveSearchLazyRowKind.company,
      companyHits: hits,
    );
  }
}

List<_LiveSearchLazyRow> _flattenLiveSearchHits(List<BuyerLiveSearchHit> hits) {
  if (hits.isEmpty) {
    return const <_LiveSearchLazyRow>[];
  }

  final rows = <_LiveSearchLazyRow>[_LiveSearchLazyRow.summaryHeader()];
  final hitsByPlatform = <String, List<BuyerLiveSearchHit>>{};
  for (final hit in hits) {
    final platformId =
        hit.platform?.id.trim().toLowerCase().isNotEmpty == true
        ? hit.platform!.id.trim().toLowerCase()
        : hit.platformId.trim().toLowerCase();
    hitsByPlatform
        .putIfAbsent(platformId.isEmpty ? 'shop' : platformId, () => [])
        .add(hit);
  }

  for (final platformHits in hitsByPlatform.values) {
    final hitsByCompany = <String, List<BuyerLiveSearchHit>>{};
    for (final hit in platformHits) {
      final sellerId = hit.seller?.adminId.trim().toLowerCase() ?? '';
      final productSellerId = hit.product?.adminId.trim().toLowerCase() ?? '';
      final companyName =
          hit.seller?.displayName.trim().toLowerCase() ??
          hit.product?.companyName.trim().toLowerCase() ??
          hit.title.trim().toLowerCase();
      final companyKey = sellerId.isNotEmpty
          ? sellerId
          : productSellerId.isNotEmpty
          ? productSellerId
          : companyName;
      hitsByCompany.putIfAbsent(companyKey, () => []).add(hit);
    }

    var platformHeaderAdded = false;
    for (final companyHits in hitsByCompany.values) {
      if (!platformHeaderAdded) {
        rows.add(_LiveSearchLazyRow.platform(platformHits.first));
        platformHeaderAdded = true;
      }
      rows.add(_LiveSearchLazyRow.company(companyHits));
    }
  }

  return rows;
}

class BuyerLiveSearchResultsPanel extends StatefulWidget {
  const BuyerLiveSearchResultsPanel({
    super.key,
    required this.query,
    required this.hits,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onSelectHit,
    this.padding = const EdgeInsets.fromLTRB(10, 0, 10, 16),
    this.isLoading = false,
    this.onRefresh,
    this.onRequestMoreHits,
    this.hasMoreHits = false,
    this.minimumSkeletonDuration = kContentSwitchSkeletonMinDuration,
  });

  final String query;
  final List<BuyerLiveSearchHit> hits;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final ValueChanged<BuyerLiveSearchHit> onSelectHit;
  final EdgeInsetsGeometry padding;
  final bool isLoading;
  final Future<void> Function()? onRefresh;
  final VoidCallback? onRequestMoreHits;
  final bool hasMoreHits;
  /// Parent already held commit skeleton — skip a second hold on first paint.
  final Duration minimumSkeletonDuration;

  @override
  State<BuyerLiveSearchResultsPanel> createState() =>
      _BuyerLiveSearchResultsPanelState();
}

class _BuyerLiveSearchResultsPanelState extends State<BuyerLiveSearchResultsPanel> {
  static const int _initialVisibleRows = 4;
  static const int _lazyLoadPageSize = 3;
  static const double _lazyLoadTriggerExtent = 320;

  int _visibleRowCount = _initialVisibleRows;
  bool _requestedMoreHits = false;
  bool _refreshing = false;
  int _refreshEpoch = 0;

  @override
  void didUpdateWidget(covariant BuyerLiveSearchResultsPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.query.trim().toLowerCase() !=
        widget.query.trim().toLowerCase()) {
      _visibleRowCount = _initialVisibleRows;
      _requestedMoreHits = false;
      return;
    }
    if (widget.hits.length > oldWidget.hits.length) {
      _requestedMoreHits = false;
      final totalRows = _flattenLiveSearchHits(widget.hits).length;
      _visibleRowCount = math.min(
        _visibleRowCount + _lazyLoadPageSize,
        totalRows,
      );
    }
  }

  Future<void> _handleRefresh() async {
    final refresh = widget.onRefresh;
    if (refresh == null) return;
    // Skeleton as soon as pull-refresh fires — before any network wait.
    setState(() {
      _refreshing = true;
      _refreshEpoch++;
    });
    try {
      await refresh();
    } finally {
      if (mounted) {
        setState(() => _refreshing = false);
      }
    }
  }

  Widget _wrapRefresh(Widget child) {
    final refresh = widget.onRefresh;
    if (refresh == null) return child;
    return RefreshIndicator(
      color: widget.primaryColor,
      onRefresh: _handleRefresh,
      child: child,
    );
  }

  String _platformLabel(BuyerLiveSearchHit hit) {
    final platformName = hit.platform?.name.trim() ?? '';
    if (platformName.isNotEmpty) return platformName;
    final platformId = hit.platformId.trim();
    if (platformId.isEmpty) return 'Shop';
    return '${platformId[0].toUpperCase()}${platformId.substring(1)}';
  }

  double _platformIconSize(BuyerLiveSearchHit hit) {
    final platformId = hit.platform?.id.trim().toLowerCase().isNotEmpty == true
        ? hit.platform!.id.trim().toLowerCase()
        : hit.platformId.trim().toLowerCase();
    return switch (platformId) {
      'food' => 32,
      'shop' => 30,
      '' => 30,
      _ => 22,
    };
  }

  void _loadMoreVisibleRows(int totalRows) {
    if (_visibleRowCount >= totalRows) return;
    setState(() {
      _visibleRowCount = math.min(
        _visibleRowCount + _lazyLoadPageSize,
        totalRows,
      );
    });
  }

  void _maybeExpandResults(ScrollMetrics metrics, int totalRows) {
    final remaining =
        (metrics.maxScrollExtent - metrics.pixels).clamp(0.0, double.infinity);
    final atEnd = remaining <= _lazyLoadTriggerExtent;

    if (_visibleRowCount < totalRows) {
      if (atEnd) {
        _loadMoreVisibleRows(totalRows);
      }
      return;
    }

    if (!atEnd || _requestedMoreHits) return;
    final requestMore = widget.onRequestMoreHits;
    if (requestMore == null || !widget.hasMoreHits) return;
    _requestedMoreHits = true;
    requestMore();
  }

  Widget _buildSummaryHeader(BuildContext context, ThemeData theme, int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 2, 2, 16),
      child: Row(
        children: [
          Expanded(
            child: Text.rich(
              TextSpan(
                text: 'Showing results for ',
                children: [
                  TextSpan(
                    text: '"${widget.query.trim()}"',
                    style: TextStyle(
                      color: widget.titleColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(
                color: widget.secondaryColor,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '$count ${count == 1 ? 'result' : 'results'}',
            style: theme.textTheme.labelSmall?.copyWith(
              color: widget.secondaryColor,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLazyRow(BuildContext context, ThemeData theme, _LiveSearchLazyRow row) {
    switch (row.kind) {
      case _LiveSearchLazyRowKind.summaryHeader:
        return _buildSummaryHeader(context, theme, widget.hits.length);
      case _LiveSearchLazyRowKind.platformHeader:
        final anchor = row.platformAnchorHit!;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _BuyerLiveSearchSectionHeader(
            leading: _BuyerLiveSearchPlatformIcon(
              platform: anchor.platform,
              platformId: anchor.platformId,
              color: widget.primaryColor,
              size: _platformIconSize(anchor),
            ),
            title: _platformLabel(anchor),
            primaryColor: widget.primaryColor,
            titleColor: widget.titleColor,
          ),
        );
      case _LiveSearchLazyRowKind.company:
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _BuyerLiveSearchCompanyResult(
            hits: row.companyHits!,
            titleColor: widget.titleColor,
            secondaryColor: widget.secondaryColor,
            primaryColor: widget.primaryColor,
            onSelectHit: widget.onSelectHit,
          ),
        );
    }
  }

  Widget _buildResultsBody(BuildContext context, ThemeData theme) {
    if (widget.hits.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: widget.padding,
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          const SizedBox(height: 14),
          const Center(child: SearchNotFoundArt(size: 154)),
          const SizedBox(height: 10),
          Text(
            'No matches for "${widget.query.trim()}"',
            textAlign: TextAlign.center,
            style: theme.textTheme.titleSmall?.copyWith(
              color: widget.titleColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try another keyword across companies or listings.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: widget.secondaryColor,
            ),
          ),
        ],
      );
    }

    final rows = _flattenLiveSearchHits(widget.hits);
    final visibleCount = math.min(_visibleRowCount, rows.length);

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        if (notification.depth != 0 ||
            notification.metrics.axis != Axis.vertical) {
          return false;
        }
        if (notification is ScrollUpdateNotification ||
            notification is OverscrollNotification) {
          _maybeExpandResults(notification.metrics, rows.length);
        }
        return false;
      },
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: widget.padding,
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        itemCount: visibleCount,
        itemBuilder: (context, index) {
          final row = rows[index];
          final isLast = index == visibleCount - 1;
          return Padding(
            padding: EdgeInsets.only(bottom: isLast ? 8 : 0),
            child: _buildLazyRow(context, theme, row),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final trimmedQuery = widget.query.trim().toLowerCase();
    final showSkeleton = widget.isLoading || _refreshing;

    return _wrapRefresh(
      MinimumSkeletonReveal(
        switchKey: Object.hash(
          trimmedQuery.isEmpty ? 'live-search-empty' : trimmedQuery,
          _refreshEpoch,
        ),
        ready: !showSkeleton,
        minimumDuration: widget.minimumSkeletonDuration,
        skeleton: SkeletonLiveSearchResultsPanel(padding: widget.padding),
        child: _buildResultsBody(context, theme),
      ),
    );
  }
}

class _BuyerLiveSearchSectionHeader extends StatelessWidget {
  const _BuyerLiveSearchSectionHeader({
    this.icon,
    this.leading,
    required this.title,
    required this.primaryColor,
    required this.titleColor,
  }) : assert(icon != null || leading != null);

  final IconData? icon;
  final Widget? leading;
  final String title;
  final Color primaryColor;
  final Color titleColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 2, 2, 10),
      child: Row(
        children: [
          leading ?? Icon(icon, size: 18, color: primaryColor),
          const SizedBox(width: 8),
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: titleColor,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _BuyerLiveSearchPlatformIcon extends StatelessWidget {
  const _BuyerLiveSearchPlatformIcon({
    required this.platform,
    required this.platformId,
    required this.color,
    required this.size,
  });

  final BuyerPlatformSummary? platform;
  final String platformId;
  final Color color;
  final double size;

  String get _normalizedId {
    final id = platform?.id.trim().toLowerCase() ?? '';
    return id.isNotEmpty ? id : platformId.trim().toLowerCase();
  }

  bool _isSvgUrl(String value) {
    final normalized = value.trim().toLowerCase();
    final path = Uri.tryParse(normalized)?.path.toLowerCase() ?? normalized;
    return path.endsWith('.svg') ||
        normalized.contains('image/svg') ||
        normalized.contains('format=svg');
  }

  String get _fallbackSvg {
    final iconName = platform?.iconName.trim().toLowerCase() ?? '';
    final id = _normalizedId;
    if (iconName == 'utensils' || id == 'food') {
      return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>''';
    }
    if (iconName == 'hotel' || id == 'hotels' || id == 'hotel') {
      return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg>''';
    }
    if (iconName == 'tree-palm' || id.contains('resort')) {
      return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A7.76 7.76 0 0 1 15.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-2 2-4 2-6"/></svg>''';
    }
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/></svg>''';
  }

  Widget _fallback() {
    return SvgPicture.string(
      _fallbackSvg,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primaryPlatformArt = _primaryPlatform3dArtAsset(_normalizedId);
    if (primaryPlatformArt != null) {
      return Image.asset(
        primaryPlatformArt,
        width: size,
        height: size,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
        isAntiAlias: true,
      );
    }

    final iconUrl = platform?.iconImageUrl.trim() ?? '';
    if (iconUrl.isNotEmpty) {
      if (_isSvgUrl(iconUrl)) {
        return SvgPicture.network(
          iconUrl,
          width: size,
          height: size,
          fit: BoxFit.contain,
          placeholderBuilder: (_) => _fallback(),
        );
      }
      return CachedNetworkImage(
        imageUrl: iconUrl,
        width: size,
        height: size,
        fit: BoxFit.contain,
        errorWidget: (_, _, _) => _fallback(),
      );
    }

    final id = _normalizedId;
    if (id.isEmpty) {
      return Image.asset(
        _shopPlatformArtAsset,
        width: size,
        height: size,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
        isAntiAlias: true,
      );
    }
    return _fallback();
  }
}

class _BuyerLiveSearchCompanyResult extends StatelessWidget {
  const _BuyerLiveSearchCompanyResult({
    required this.hits,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.onSelectHit,
  });

  final List<BuyerLiveSearchHit> hits;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final ValueChanged<BuyerLiveSearchHit> onSelectHit;

  static const double _productCardWidth = 96;
  static const double _productImageHeight = _productCardWidth;
  static const double _productCarouselHeight = 170;

  BuyerLiveSearchHit get _sourceHit => hits.first;

  SellerSummary? get _seller {
    for (final hit in hits) {
      if (hit.seller != null) return hit.seller;
    }
    return null;
  }

  StoreTypeSummary? get _storeType {
    for (final hit in hits) {
      if (hit.storeType != null) return hit.storeType;
    }
    return null;
  }

  List<Product> get _products {
    final productsById = <String, Product>{};
    for (final hit in hits) {
      final product = hit.product;
      if (product != null) {
        productsById.putIfAbsent(product.id, () => product);
      }
    }
    for (final hit in hits) {
      for (final product in hit.relatedProducts) {
        productsById.putIfAbsent(product.id, () => product);
      }
    }
    return productsById.values.take(10).toList(growable: false);
  }

  String get _companyName {
    final sellerName = _seller?.displayName.trim() ?? '';
    if (sellerName.isNotEmpty) return sellerName;
    for (final product in _products) {
      if (product.companyName.trim().isNotEmpty) {
        return product.companyName.trim();
      }
    }
    return _sourceHit.title.trim().isEmpty
        ? 'Company'
        : _sourceHit.title.trim();
  }

  bool get _showsLegitBadge {
    final seller = _seller;
    if (seller != null && seller.isLegitSeller) return true;
    for (final product in _products) {
      if (product.isLegitSeller) return true;
    }
    return false;
  }

  String get _companyAdminId {
    final sellerId = _seller?.adminId.trim() ?? '';
    if (sellerId.isNotEmpty) return sellerId.toLowerCase();
    for (final product in _products) {
      final id = product.adminId.trim();
      if (id.isNotEmpty) return id.toLowerCase();
    }
    return '';
  }

  bool _hasOrderedBefore(List<OrderEntryData> orders) {
    final adminId = _companyAdminId;
    if (adminId.isEmpty) return false;
    for (final order in orders) {
      if (order.adminId.trim().toLowerCase() == adminId) return true;
    }
    return false;
  }

  String get _companyImageUrl {
    final sellerImage = _seller?.displayImageUrl.trim() ?? '';
    if (sellerImage.isNotEmpty) return sellerImage;
    for (final product in _products) {
      if (product.companyPictureUrl.trim().isNotEmpty) {
        return product.companyPictureUrl.trim();
      }
    }
    return _products.isEmpty ? '' : _products.first.cardDisplayImageUrl;
  }

  double get _rating {
    var weightedTotal = 0.0;
    var weightTotal = 0;
    for (final product in _products) {
      if (product.rating <= 0) continue;
      final weight = product.ratingCount > 0 ? product.ratingCount : 1;
      weightedTotal += product.rating * weight;
      weightTotal += weight;
    }
    return weightTotal == 0 ? 0 : weightedTotal / weightTotal;
  }

  int get _ratingCount =>
      _products.fold<int>(0, (total, product) => total + product.ratingCount);

  int get _soldCount {
    var best = 0;
    for (final hit in hits) {
      if (hit.soldCount > best) best = hit.soldCount;
    }
    if (best > 0) return best;
    return _products.fold<int>(
      0,
      (total, product) => total + (product.sold < 0 ? 0 : product.sold),
    );
  }

  List<String> get _deliveryPartnerIds {
    final seen = <String>{};
    final ids = <String>[];
    for (final product in _products) {
      for (final rawId in product.deliveryPartnerIds) {
        final id = rawId.trim();
        if (id.isEmpty || !seen.add(id)) continue;
        ids.add(id);
      }
    }
    return ids;
  }

  BuyerLiveSearchHit _productHit(Product product) {
    for (final hit in hits) {
      if (hit.product?.id == product.id) return hit;
    }
    return BuyerLiveSearchHit(
      kind: BuyerLiveSearchKind.listing,
      title: product.name,
      subtitle: _companyName,
      platformId: _sourceHit.platformId,
      platform: _sourceHit.platform,
      storeType: _storeType,
      seller: _seller,
      product: product,
      relatedProducts: _products,
      soldCount: _soldCount,
    );
  }

  BuyerLiveSearchHit get _companyHit {
    for (final hit in hits) {
      if (hit.kind == BuyerLiveSearchKind.company) return hit;
    }
    final seller = _seller;
    if (seller == null) return _sourceHit;
    return BuyerLiveSearchHit(
      kind: BuyerLiveSearchKind.company,
      title: _companyName,
      subtitle: _storeType?.name ?? seller.storeType,
      platformId: _sourceHit.platformId,
      platform: _sourceHit.platform,
      storeType: _storeType,
      seller: seller,
      relatedProducts: _products,
      soldCount: _soldCount,
    );
  }

  Widget _productCard(BuildContext context, Product product) {
    final displayPrice =
        product.salesPrice != null &&
            product.salesPrice! >= 0 &&
            product.salesPrice! < product.originalPrice
        ? product.salesPrice!
        : product.originalPrice;
    final hit = _productHit(product);

    return SizedBox(
      width: _productCardWidth,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onSelectHit(hit),
          borderRadius: BorderRadius.circular(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: _productCardWidth,
                height: _productImageHeight,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: _BuyerLiveSearchPreview(
                    hit: hit,
                    icon: Icons.inventory_2_outlined,
                    primaryColor: primaryColor,
                  ),
                ),
              ),
              const SizedBox(height: 7),
              _SearchPriceText(
                amount: displayPrice,
                color: titleColor,
                fontSize: 16,
              ),
              const SizedBox(height: 4),
              Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: titleColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final products = _products;
    final rating = _rating;
    final storeTypeLabel = _storeType?.name.trim().isNotEmpty == true
        ? _storeType!.name.trim()
        : (_seller?.storeType.trim() ?? '');
    final deliveryPartnerIds = _deliveryPartnerIds;
    final voucherPlatformId =
        _sourceHit.platform?.id.trim().toLowerCase().isNotEmpty == true
        ? _sourceHit.platform!.id.trim().toLowerCase()
        : _sourceHit.platformId.trim().toLowerCase();
    final previewHit = BuyerLiveSearchHit(
      kind: BuyerLiveSearchKind.company,
      title: _companyName,
      subtitle: storeTypeLabel,
      platformId: _sourceHit.platformId,
      platform: _sourceHit.platform,
      storeType: _storeType,
      seller: _seller,
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => onSelectHit(_companyHit),
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 104,
                      height: 104,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: _BuyerLiveSearchPreview(
                          hit: previewHit,
                          imageUrlOverride: _companyImageUrl,
                          icon: Icons.storefront_rounded,
                          primaryColor: primaryColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ValueListenableBuilder<List<OrderEntryData>>(
                              valueListenable:
                                  OrderStore.instance.ordersNotifier,
                              builder: (context, orders, _) {
                                return SellerCompanyNameWithLegitBadge(
                                  name: _companyName,
                                  showLegitBadge: _showsLegitBadge,
                                  showOrderedBefore: _hasOrderedBefore(orders),
                                  maxLines: 1,
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontSize: 18,
                                    color: titleColor,
                                    fontWeight: FontWeight.w800,
                                    height: 1.12,
                                  ),
                                );
                              },
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                _lucideFilledStarIcon(
                                  color: const Color(0xFFFFC107),
                                  size: 19,
                                ),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text.rich(
                                    TextSpan(
                                      style: theme.textTheme.bodySmall
                                          ?.copyWith(
                                            fontSize: 14,
                                            color: titleColor,
                                            fontWeight: FontWeight.w400,
                                          ),
                                      children: [
                                        TextSpan(
                                          text: rating > 0
                                              ? '${rating.toStringAsFixed(1)} (${_formatSearchCompactCount(_ratingCount)})'
                                              : 'New',
                                        ),
                                        if (storeTypeLabel.isNotEmpty) ...[
                                          TextSpan(
                                            text: '  •  ',
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                                  fontSize: 14,
                                                  height: 1,
                                                  color: titleColor,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                          ),
                                          TextSpan(text: storeTypeLabel),
                                        ],
                                        TextSpan(
                                          text: '  •  ',
                                          style: theme.textTheme.bodySmall
                                              ?.copyWith(
                                                fontSize: 14,
                                                height: 1,
                                                color: titleColor,
                                                fontWeight: FontWeight.w700,
                                              ),
                                        ),
                                        TextSpan(
                                          text:
                                              '${_formatSearchCompactCount(_soldCount)} sold',
                                        ),
                                      ],
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            if (deliveryPartnerIds.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              FutureBuilder<List<DeliveryPartner>>(
                                future: _fetchSearchDeliveryPartners(),
                                builder: (context, snapshot) {
                                  final partnersById =
                                      <String, DeliveryPartner>{
                                        for (final partner
                                            in snapshot.data ??
                                                const <DeliveryPartner>[])
                                          if (partner.id.trim().isNotEmpty &&
                                              partner.isEnabled)
                                            partner.id.trim().toLowerCase():
                                                partner,
                                      };
                                  final logos =
                                      <({String label, String imageUrl})>[];
                                  for (final id in deliveryPartnerIds) {
                                    final partner =
                                        partnersById[id.toLowerCase()];
                                    logos.add((
                                      label: partner?.branchLabel ?? 'Courier',
                                      imageUrl: partner?.imageUrl ?? '',
                                    ));
                                  }
                                  if (logos.isEmpty) {
                                    return const SizedBox.shrink();
                                  }
                                  return SizedBox(
                                    height: 22,
                                    child: HorizontalEndFade(
                                      child: ListView.separated(
                                        scrollDirection: Axis.horizontal,
                                        physics: const BouncingScrollPhysics(),
                                        padding: EdgeInsets.zero,
                                        itemCount: logos.length,
                                        separatorBuilder: (_, _) =>
                                            const SizedBox(width: 10),
                                        itemBuilder: (context, index) {
                                          final logo = logos[index];
                                          return _SearchCourierLogoChip(
                                            imageUrl: logo.imageUrl,
                                            label: logo.label,
                                            primaryColor: primaryColor,
                                            secondaryColor: secondaryColor,
                                          );
                                        },
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],
                            FutureBuilder<List<BuyerVoucherItem>>(
                              future: fetchSearchResultVouchers(
                                platformId: voucherPlatformId,
                                sellerAdminId: _companyAdminId,
                              ),
                              builder: (context, snapshot) {
                                final vouchers =
                                    snapshot.data ?? const <BuyerVoucherItem>[];
                                if (vouchers.isEmpty) {
                                  return const SizedBox.shrink();
                                }
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: _SearchVoucherCarousel(
                                    vouchers: vouchers,
                                    primaryColor: primaryColor,
                                    titleColor: titleColor,
                                    secondaryColor: secondaryColor,
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (products.isNotEmpty) ...[
            const SizedBox(height: 10),
            SizedBox(
              height: _productCarouselHeight,
              child: HorizontalEndFade(
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.only(right: 18),
                  itemCount: products.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 12),
                  itemBuilder: (context, index) =>
                      _productCard(context, products[index]),
                ),
              ),
            ),
          ],
          Container(
            height: 1,
            margin: const EdgeInsets.only(top: 14),
            color: secondaryColor.withValues(alpha: 0.16),
          ),
        ],
      ),
    );
  }
}

class _SearchCourierLogoChip extends StatelessWidget {
  const _SearchCourierLogoChip({
    required this.imageUrl,
    required this.label,
    required this.primaryColor,
    required this.secondaryColor,
  });

  final String imageUrl;
  final String label;
  final Color primaryColor;
  final Color secondaryColor;

  static const double _size = 20;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl.trim();
    final name = label.trim().isEmpty ? 'Courier' : label.trim();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: _size,
          height: _size,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
          ),
          child: ClipOval(
            child: url.isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.cover,
                    width: _size,
                    height: _size,
                    memCacheWidth: 64,
                    memCacheHeight: 64,
                    placeholder: (context, _) =>
                        ColoredBox(color: primaryColor.withValues(alpha: 0.08)),
                    errorWidget: (context, _, _) => ColoredBox(
                      color: primaryColor.withValues(alpha: 0.1),
                      child: Icon(
                        Icons.local_shipping_outlined,
                        size: 11,
                        color: primaryColor,
                      ),
                    ),
                  )
                : ColoredBox(
                    color: primaryColor.withValues(alpha: 0.1),
                    child: Icon(
                      Icons.local_shipping_outlined,
                      size: 11,
                      color: primaryColor,
                    ),
                  ),
          ),
        ),
        const SizedBox(width: 5),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 120),
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color.fromARGB(255, 150, 150, 150),
              fontSize: 14,
              fontWeight: FontWeight.w500,
              height: 1,
            ),
          ),
        ),
      ],
    );
  }
}

class _SearchVoucherCarousel extends StatelessWidget {
  const _SearchVoucherCarousel({
    required this.vouchers,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
  });

  final List<BuyerVoucherItem> vouchers;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final cardWidth = (constraints.maxWidth * 0.82)
              .clamp(168.0, 220.0)
              .toDouble();
          return HorizontalEndFade(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(8, 0, 18, 0),
              itemCount: vouchers.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                return SizedBox(
                  width: cardWidth,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4, bottom: 6),
                    child: _SearchVoucherTicketCard(
                      voucher: vouchers[index],
                      primaryColor: primaryColor,
                      titleColor: titleColor,
                      secondaryColor: secondaryColor,
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

// Compact offer chip kept for reference; search results use ticket cards.
// ignore: unused_element
class _SearchVoucherOfferCard extends StatelessWidget {
  const _SearchVoucherOfferCard({
    required this.voucher,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
  });

  final BuyerVoucherItem voucher;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;

  Future<void> _copyCode(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: voucher.code));
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('${voucher.code} copied'),
          duration: const Duration(seconds: 1),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardColor = isDark ? const Color(0xFF202936) : Colors.white;
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.16)
        : secondaryColor.withValues(alpha: 0.24);
    final iconColor = primaryColor.computeLuminance() > 0.62
        ? Color.lerp(primaryColor, const Color(0xFF0F172A), 0.48)!
        : primaryColor;

    return Material(
      color: cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: borderColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _copyCode(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: isDark ? 0.2 : 0.12),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(voucher.icon, size: 21, color: iconColor),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      voucher.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: titleColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        height: 1.05,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Min. spend ${voucher.minimumSpend}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: secondaryColor,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w400,
                        height: 1,
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

// Compact ticket voucher under company search cards (same size as prior offer chips).
class _SearchVoucherTicketCard extends StatelessWidget {
  const _SearchVoucherTicketCard({
    required this.voucher,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
  });

  final BuyerVoucherItem voucher;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;

  Widget _voucherBrandArtwork() {
    return SvgPicture.asset(
      _switchLogoAsset,
      width: 28,
      height: 28,
      fit: BoxFit.contain,
      colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
    );
  }

  Future<void> _copyCode(BuildContext context) async {
    await Clipboard.setData(ClipboardData(text: voucher.code));
    if (!context.mounted) return;
    final messenger = ScaffoldMessenger.maybeOf(context);
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('${voucher.code} copied'),
          duration: const Duration(seconds: 1),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final accent = primaryColor;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const background = Colors.white;
    // Inherits the color configured through the Super Admin color picker.
    final artBackground = primaryColor;
    final cardSecondaryColor = isDark
        ? const Color(0xFF667085)
        : secondaryColor;
    final badge = voucher.badge.trim();
    final eyebrow = badge.isEmpty || badge.toLowerCase() == 'sitewide'
        ? null
        : badge.toUpperCase();
    const ticketHeight = 54.0;
    final notchY = _SearchVoucherTicketClipper.notchCenterY(ticketHeight);
    final spendDigits = voucher.minimumSpend.replaceFirst(
      RegExp(r'^[₱\u20B1]\s*'),
      '',
    );
    final minSpendStyle = GoogleFonts.getFont(
      defaultFontFamily,
      color: const Color.fromARGB(255, 150, 150, 150),
      fontSize: 12,
      height: 1,
      fontWeight: FontWeight.w400,
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _copyCode(context),
        customBorder: const _SearchVoucherTicketShapeBorder(),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            const Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(
                  painter: _SearchVoucherTicketShadowPainter(),
                ),
              ),
            ),
            PhysicalShape(
              clipper: const _SearchVoucherTicketClipper(),
              clipBehavior: Clip.antiAlias,
              color: background,
              elevation: 0,
              shadowColor: Colors.transparent,
              child: SizedBox(
                height: ticketHeight,
                child: Stack(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: ticketHeight,
                          height: ticketHeight,
                          color: artBackground,
                          alignment: Alignment.center,
                          padding: const EdgeInsets.all(6),
                          child: _voucherBrandArtwork(),
                        ),
                        const SizedBox(width: 7),
                        Expanded(
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(
                              0,
                              4,
                              8,
                              ticketHeight - (notchY - 3),
                            ),
                            child: Align(
                              alignment: Alignment.bottomLeft,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (eyebrow != null) ...[
                                    Text(
                                      eyebrow,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: cardSecondaryColor.withValues(
                                          alpha: 0.9,
                                        ),
                                        fontSize: 6.6,
                                        height: 1,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 2.5),
                                  ],
                                  Text(
                                    voucher.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.black,
                                      fontSize: 16,
                                      height: 1,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    Positioned(
                      left: ticketHeight + 7,
                      right: 8,
                      top: notchY - 0.5,
                      height: 1,
                      child: CustomPaint(
                        painter: _SearchVoucherDividerPainter(
                          color: accent.withValues(alpha: 0.28),
                        ),
                      ),
                    ),
                    Positioned(
                      left: ticketHeight + 7,
                      right: 8,
                      top: notchY + 2,
                      child: Text(
                        'Min. spend \u20B1$spendDigits',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: minSpendStyle,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchVoucherTicketShapeBorder extends ShapeBorder {
  const _SearchVoucherTicketShapeBorder();

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      getOuterPath(rect, textDirection: textDirection);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    return const _SearchVoucherTicketClipper().getClip(rect.size)
      ..shift(rect.topLeft);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {}

  @override
  ShapeBorder scale(double t) => this;
}

class _SearchVoucherTicketClipper extends CustomClipper<Path> {
  const _SearchVoucherTicketClipper({this.borderRadius = 8});

  /// Corner radius of the white voucher card (shadow uses the same path).
  final double borderRadius;

  /// Shared with the dashed divider — slightly below mid so curves meet the line.
  static double notchCenterY(double height) => height * 0.60;

  @override
  Path getClip(Size size) {
    final ticket = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          Offset.zero & size,
          Radius.circular(borderRadius),
        ),
      );
    final y = notchCenterY(size.height);
    final notches = Path()
      ..addOval(Rect.fromCircle(center: Offset(0, y), radius: 5))
      ..addOval(Rect.fromCircle(center: Offset(size.width, y), radius: 5));
    return Path.combine(PathOperation.difference, ticket, notches);
  }

  @override
  bool shouldReclip(covariant _SearchVoucherTicketClipper oldClipper) =>
      oldClipper.borderRadius != borderRadius;
}

class _SearchVoucherTicketShadowPainter extends CustomPainter {
  const _SearchVoucherTicketShadowPainter({this.borderRadius = 8});

  final double borderRadius;

  static const _shadows = <BoxShadow>[
    BoxShadow(color: Color(0x66000000), blurRadius: 1, offset: Offset(0, 1)),
    BoxShadow(color: Color(0x0D000000), blurRadius: 4, offset: Offset(0, 2)),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final ticketPath = _SearchVoucherTicketClipper(
      borderRadius: borderRadius,
    ).getClip(size);
    for (final shadow in _shadows) {
      canvas.drawPath(ticketPath.shift(shadow.offset), shadow.toPaint());
    }
  }

  @override
  bool shouldRepaint(covariant _SearchVoucherTicketShadowPainter oldDelegate) {
    return oldDelegate.borderRadius != borderRadius;
  }
}

class _SearchVoucherDividerPainter extends CustomPainter {
  const _SearchVoucherDividerPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..strokeCap = StrokeCap.round;
    const dashWidth = 4.0;
    const dashGap = 4.0;
    for (double x = 0; x < size.width; x += dashWidth + dashGap) {
      canvas.drawLine(
        Offset(x, size.height / 2),
        Offset(
          (x + dashWidth).clamp(0.0, size.width).toDouble(),
          size.height / 2,
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _SearchVoucherDividerPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

class _BuyerLiveSearchPreview extends StatelessWidget {
  const _BuyerLiveSearchPreview({
    required this.hit,
    required this.icon,
    required this.primaryColor,
    this.imageUrlOverride = '',
  });

  final BuyerLiveSearchHit hit;
  final IconData icon;
  final Color primaryColor;
  final String imageUrlOverride;

  String get _imageUrl {
    if (imageUrlOverride.trim().isNotEmpty) return imageUrlOverride.trim();
    final productUrl = hit.product?.cardImageUrl.trim().isNotEmpty == true
        ? hit.product!.cardImageUrl.trim()
        : (hit.product?.imageUrl.trim() ?? '');
    if (productUrl.isNotEmpty) return productUrl;

    return hit.seller?.displayImageUrl.trim() ?? '';
  }

  bool get _usesIconLayout {
    return false;
  }

  bool _isSvgUrl(String value) {
    final normalized = value.trim().toLowerCase();
    final path = Uri.tryParse(normalized)?.path.toLowerCase() ?? normalized;
    return path.endsWith('.svg') ||
        normalized.contains('image/svg') ||
        normalized.contains('format=svg');
  }

  Widget _fallbackPreview() {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor.withValues(alpha: 0.16),
            primaryColor.withValues(alpha: 0.05),
          ],
        ),
      ),
      child: Center(
        child: Icon(
          icon,
          size: 27,
          color: primaryColor.withValues(alpha: 0.88),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = _imageUrl;
    if (imageUrl.isEmpty) return _fallbackPreview();

    final fit = _usesIconLayout ? BoxFit.contain : BoxFit.cover;
    final image = _isSvgUrl(imageUrl)
        ? SvgPicture.network(
            imageUrl,
            fit: fit,
            placeholderBuilder: (_) => _fallbackPreview(),
            errorBuilder: (_, _, _) => _fallbackPreview(),
          )
        : CachedNetworkImage(
            imageUrl: imageUrl,
            fit: fit,
            placeholder: (_, _) => _fallbackPreview(),
            errorWidget: (_, _, _) => _fallbackPreview(),
          );

    return Semantics(
      image: true,
      label: '${hit.title} photo',
      child: ColoredBox(
        color: primaryColor.withValues(alpha: 0.055),
        child: _usesIconLayout
            ? Padding(padding: const EdgeInsets.all(16), child: image)
            : image,
      ),
    );
  }
}
