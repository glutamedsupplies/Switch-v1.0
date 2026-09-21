import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/categories_browse.dart';
import 'package:switch_app/chat_support.dart';
import 'package:switch_app/chat_list.dart';
import 'package:switch_app/drawable_list_view.dart';
import 'package:switch_app/favorite_products_store.dart';
import 'package:switch_app/guest_session.dart';
import 'package:switch_app/l10n/app_buyer_languages.dart';
import 'package:switch_app/login.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/register.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/models/seller_summary.dart';
import 'package:switch_app/models/store_type_summary.dart';
import 'package:switch_app/models/buyer_platform_summary.dart';
import 'package:switch_app/order.dart';
import 'package:switch_app/order_tab_navigation.dart';
import 'package:switch_app/order_store.dart';
import 'package:switch_app/product_details.dart';
import 'package:switch_app/seller.dart';
import 'package:switch_app/search_bar.dart' as app_search;
import 'package:switch_app/services/app_language_preference.dart';
import 'package:switch_app/services/device_session_guard.dart';
import 'package:switch_app/services/notification_sound_service.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/services/search_suggestions_service.dart';
import 'package:switch_app/services/seller_repository.dart';
import 'package:switch_app/services/store_type_repository.dart';
import 'package:switch_app/services/platform_repository.dart';
import 'package:switch_app/services/platform_theme_sync.dart';
import 'package:switch_app/services/unified_account_service.dart';
import 'package:switch_app/services/vouchers_service.dart';
import 'package:switch_app/services/visual_product_detector.dart';
import 'package:switch_app/services/workspace_theme_sync.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/theme/app_theme.dart';
import 'package:switch_app/utils/app_keyboard.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/utils/session_image_cache.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:switch_app/widgets/no_more_products_indicator.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';
import 'package:switch_app/widgets/product_company_identity.dart';
import 'package:switch_app/widgets/product_card_tap_lift.dart';
import 'package:switch_app/widgets/horizontal_end_fade.dart';
import 'package:switch_app/widgets/search_not_found_art.dart';
import 'package:switch_app/utils/buyer_notification_time_sections.dart';
import 'package:switch_app/widgets/buyer_notifications_panel.dart';
import 'package:switch_app/widgets/buyer_account_panel.dart';
import 'package:switch_app/widgets/buyer_platform_activity_list.dart';
import 'package:switch_app/widgets/buyer_right_panel_host.dart';
import 'package:switch_app/services/buyer_delivery_address_store.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/select_address_page.dart';
import 'package:switch_app/widgets/location_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

const int _dealFilterAllIndex = 0;
const int _dealFilterFlashDealsIndex = 1;
const int _dealFilterTopSellingIndex = 2;
const int _dealFilterTopRatingIndex = 3;
/// New Post chip — toggle stackable on top of All / Flash / Top Selling / Top Rating.
const int _dealFilterNewPostIndex = 4;
const int _shopDealLazyLoadPageSize = 6;
const Duration _newProductPostDuration = Duration(days: 30);
const int _newProductsShowcaseLimit = 10;

const String _lucideBellIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M10.268 21a2 2 0 0 0 3.464 0"/>'
    '<path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>'
    '</svg>';
const String _lucideMenuIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M4 5h16"/>'
    '<path d="M4 12h16"/>'
    '<path d="M4 19h16"/>'
    '</svg>';
const String _lucideMapPinIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>'
    '<circle cx="12" cy="10" r="3"/>'
    '</svg>';
const String _lucideShoppingCartIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/>'
    '<path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/>'
    '<circle cx="18" cy="20" r="2"/>'
    '<circle cx="8" cy="20" r="2"/>'
    '</svg>';
const String _lucideSoupIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/>'
    '<path d="M7 21h10"/>'
    '<path d="M19.5 12 22 6"/>'
    '<path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/>'
    '<path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/>'
    '<path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/>'
    '</svg>';
const String _lucideTruckIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>'
    '<path d="M15 18H9"/>'
    '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>'
    '<circle cx="17" cy="18" r="2"/>'
    '<circle cx="7" cy="18" r="2"/>'
    '</svg>';
const String _switchLogoAsset = 'assets/images/switch-logo.svg';
const String _shopHomeLabelArtAsset = 'assets/images/shop-home-label-art.png';
const String _foodPlatformIconAsset = 'assets/images/food-platform-icon.png';
const Color _shopHeaderIconOnLight = Color(0xFF0F172A);

/// Empty buyer platform id means the picker is showing.
const String _kBuyerPlatformNone = '';

List<BuyerPlatformSummary> _defaultBuyerPlatforms() {
  return const <BuyerPlatformSummary>[
    BuyerPlatformSummary(
      id: 'shop',
      name: 'Shop',
      sortOrder: 1,
      primaryColor: '#2563eb',
    ),
    BuyerPlatformSummary(
      id: 'food',
      name: 'Food',
      sortOrder: 2,
      primaryColor: '#ea580c',
    ),
    BuyerPlatformSummary(
      id: 'hotels',
      name: 'Hotels',
      sortOrder: 3,
      primaryColor: '#7c3aed',
    ),
  ];
}

String _normalizeBuyerKey(String value) {
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
  final key = _normalizeBuyerKey(item.name);
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

List<StoreTypeSummary> _storeTypesForPlatform(
  List<StoreTypeSummary> all,
  String platformId,
) {
  final wanted = platformId.trim().toLowerCase();
  if (wanted.isEmpty) return const <StoreTypeSummary>[];
  return all
      .where((item) => _platformIdForStoreType(item) == wanted)
      .toList(growable: false);
}

/// Product-listing storefront with platform-scoped search (matches HTML Switch Shop).
bool _isProductListingStorefront(String platformId) {
  final id = platformId.trim().toLowerCase();
  return id == 'shop' || id == 'food';
}

/// Shop platform storefront (matches HTML Switch Shop entry).
bool _isShopPlatformStorefront(String platformId) {
  return _isProductListingStorefront(platformId);
}

Iterable<String> _liveSearchHitCategoryLabels(
  app_search.BuyerLiveSearchHit hit,
) {
  final labels = <String>[];
  final seen = <String>{};

  void addCategory(String raw) {
    final label = raw.trim();
    if (label.isEmpty) return;
    final key = _normalizeBuyerKey(label);
    if (key.isEmpty || !seen.add(key)) return;
    labels.add(label);
  }

  final product = hit.product;
  if (product != null) {
    for (final category in product.categoryList) {
      addCategory(category);
    }
  }
  for (final related in hit.relatedProducts) {
    for (final category in related.categoryList) {
      addCategory(category);
    }
  }
  return labels;
}

/// Categories in [hits] for a scoped shop/food platform search.
/// Icons use Super Admin category `iconName` (Lucide/Tabler), not images.
List<({String id, String label, String iconName})> _liveSearchCategoriesWithHits(
  List<app_search.BuyerLiveSearchHit> hits, {
  required String platformId,
  List<StoreTypeSummary> storeTypes = const <StoreTypeSummary>[],
}) {
  final scopedPlatformId = platformId.trim().toLowerCase();
  if (!_isProductListingStorefront(scopedPlatformId)) {
    return const <({String id, String label, String iconName})>[];
  }

  final catalog = <String, ({String label, String iconName})>{};
  for (final storeType in storeTypes) {
    if (_platformIdForStoreType(storeType) != scopedPlatformId) continue;
    for (final detail in storeType.categoryDetails) {
      final key = _normalizeBuyerKey(detail.name);
      if (key.isEmpty) continue;
      catalog.putIfAbsent(
        key,
        () => (label: detail.name.trim(), iconName: detail.iconName.trim()),
      );
      if ((catalog[key]?.iconName ?? '').isEmpty &&
          detail.iconName.trim().isNotEmpty) {
        catalog[key] = (
          label: catalog[key]!.label,
          iconName: detail.iconName.trim(),
        );
      }
    }
    for (final category in storeType.categories) {
      final key = _normalizeBuyerKey(category);
      if (key.isEmpty) continue;
      catalog.putIfAbsent(
        key,
        () => (label: category.trim(), iconName: ''),
      );
    }
  }

  final byKey = <String, ({String id, String label, String iconName})>{};
  for (final hit in hits) {
    for (final category in _liveSearchHitCategoryLabels(hit)) {
      final id = _normalizeBuyerKey(category);
      if (id.isEmpty) continue;
      final meta = catalog[id];
      final label = (meta?.label.trim().isNotEmpty ?? false)
          ? meta!.label.trim()
          : category.trim();
      final iconName = meta?.iconName.trim() ?? '';
      final existing = byKey[id];
      if (existing == null) {
        byKey[id] = (id: id, label: label, iconName: iconName);
        continue;
      }
      if (existing.iconName.isEmpty && iconName.isNotEmpty) {
        byKey[id] = (id: id, label: existing.label, iconName: iconName);
      }
    }
  }

  final ordered = byKey.values.toList(growable: false)
    ..sort((a, b) => a.label.toLowerCase().compareTo(b.label.toLowerCase()));
  return ordered;
}

List<app_search.BuyerLiveSearchHit> _filterLiveSearchHitsByCategory(
  List<app_search.BuyerLiveSearchHit> hits,
  String categoryFilter,
) {
  final wanted = categoryFilter.trim().toLowerCase();
  if (wanted.isEmpty || wanted == 'all') return hits;
  return hits
      .where(
        (hit) => _liveSearchHitCategoryLabels(hit).any(
          (category) => _normalizeBuyerKey(category) == wanted,
        ),
      )
      .toList(growable: false);
}

Future<double?> _sampleImageTopLuminance(String imageUrl) async {
  final normalized = imageUrl.trim();
  if (normalized.isEmpty) {
    return null;
  }

  try {
    final provider = CachedNetworkImageProvider(normalized);
    final completer = Completer<ui.Image>();
    final stream = provider.resolve(const ImageConfiguration());
    late final ImageStreamListener listener;
    listener = ImageStreamListener(
      (info, _) {
        stream.removeListener(listener);
        if (!completer.isCompleted) {
          completer.complete(info.image);
        }
      },
      onError: (error, stackTrace) {
        stream.removeListener(listener);
        if (!completer.isCompleted) {
          completer.completeError(error, stackTrace);
        }
      },
    );
    stream.addListener(listener);

    final image = await completer.future.timeout(const Duration(seconds: 5));
    final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    if (data == null) {
      return null;
    }

    final width = image.width;
    final height = image.height;
    if (width <= 0 || height <= 0) {
      return null;
    }

    final sampleHeight = math.max(1, (height * 0.22).round());
    final stepX = math.max(1, width ~/ 48);
    final stepY = math.max(1, sampleHeight ~/ 12);
    var sum = 0.0;
    var count = 0;

    for (var y = 0; y < sampleHeight; y += stepY) {
      for (var x = 0; x < width; x += stepX) {
        final offset = (y * width + x) * 4;
        final r = data.getUint8(offset) / 255.0;
        final g = data.getUint8(offset + 1) / 255.0;
        final b = data.getUint8(offset + 2) / 255.0;
        sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        count++;
      }
    }

    if (count == 0) {
      return null;
    }

    return sum / count;
  } catch (_) {
    return null;
  }
}

Color _shopHeaderIconColorForLuminance(double? luminance) {
  final value = luminance ?? 0.32;
  // Dark / dim slides → white icons; light slides → dark icons.
  final t = ((value - 0.38) / 0.28).clamp(0.0, 1.0);
  return Color.lerp(Colors.white, _shopHeaderIconOnLight, t)!;
}

Widget _lucideShoppingCartIcon({required Color color, double size = 24}) {
  return SvgPicture.string(
    _lucideShoppingCartIconSvg,
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
  );
}

Widget _lucideSoupIcon({required Color color, double size = 24}) {
  return SvgPicture.string(
    _lucideSoupIconSvg,
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
  );
}

/// Dashed vertical rule between voucher icon and countdown (ticket perforation).
class _VoucherChipPerforationDivider extends StatelessWidget {
  const _VoucherChipPerforationDivider({
    required this.height,
    required this.color,
  });

  final double height;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(2, height),
      painter: _VoucherChipPerforationPainter(color: color),
    );
  }
}

class _VoucherChipPerforationPainter extends CustomPainter {
  _VoucherChipPerforationPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..strokeCap = StrokeCap.round;
    const dashLength = 2.0;
    const gap = 2.0;
    final x = size.width / 2;
    var y = 0.0;
    while (y < size.height) {
      final endY = math.min(y + dashLength, size.height);
      canvas.drawLine(Offset(x, y), Offset(x, endY), paint);
      y += dashLength + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _VoucherChipPerforationPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

Widget _platformCartIcon({
  required Color color,
  required bool useFoodCartIcon,
  double size = 24,
}) {
  if (useFoodCartIcon) {
    return _lucideSoupIcon(color: color, size: size);
  }
  return _lucideShoppingCartIcon(color: color, size: size);
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  // Draw behind status + device nav bars so transparent system bars work.
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  await GuestSession.ensureLoaded();
  await AuthSession.ensureLoaded();
  await DeviceSessionGuard.checkOnce();
  await AppLanguagePreference.ensureLoaded();
  // One-time cleanup: remove old global (non-per-account) sample data.
  await AuthSession.migrateOldGlobalData();
  await FavoriteProductsStore.instance.ensureLoaded();
  await CartStore.instance.ensureLoaded();
  await OrderStore.instance.ensureLoaded();
  unawaited(OrderStore.instance.refreshFromRemote());

  // If neither logged in nor in guest mode, default to guest mode.
  // This ensures the app always starts in a known state.
  final loggedIn = await AuthSession.isLoggedIn();
  if (!loggedIn && !GuestSession.isGuest) {
    await GuestSession.continueAsGuest();
  }

  const initialThemeMode = ThemeMode.system;

  await WorkspaceThemeSync.instance.ensureStarted();
  runApp(MyApp(initialThemeMode: initialThemeMode));
}

class MyApp extends StatefulWidget {
  const MyApp({
    super.key,
    required this.initialThemeMode,
    this.productRepository,
  });

  final ThemeMode initialThemeMode;
  final ProductRepository? productRepository;

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final ValueNotifier<ThemeMode> _themeModeNotifier;
  late final AppKeyboardDismissObserver _keyboardDismissObserver;

  @override
  void initState() {
    super.initState();
    _themeModeNotifier = ValueNotifier(widget.initialThemeMode);
    _keyboardDismissObserver = AppKeyboardDismissObserver();
  }

  @override
  void dispose() {
    _themeModeNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: _themeModeNotifier,
      builder: (context, themeMode, child) {
        return ValueListenableBuilder<Color>(
          valueListenable: WorkspaceThemeSync.instance.primaryColor,
          builder: (context, workspacePrimary, _) {
            return ValueListenableBuilder<Color?>(
              valueListenable: PlatformThemeSync.instance.primaryOverride,
              builder: (context, platformPrimary, _) {
                final primary = platformPrimary ?? workspacePrimary;
                return MaterialApp(
                  title: 'Switch',
                  debugShowCheckedModeBanner: false,
                  theme: buildAppLightTheme(primary: primary),
                  darkTheme: buildAppDarkTheme(
                    primary: platformPrimary ?? appDarkPrimaryColor,
                  ),
                  themeMode: themeMode,
                  themeAnimationDuration: Duration.zero,
                  navigatorObservers: [_keyboardDismissObserver],
                  builder: (context, child) {
                    // Apply appLetterSpacing to bare TextStyle merges app-wide.
                    return DefaultTextStyle.merge(
                      style: const TextStyle(letterSpacing: appLetterSpacing),
                      child: child ?? const SizedBox.shrink(),
                    );
                  },
                  onGenerateRoute: (settings) {
                    if (settings.name == '/seller') {
                      final args =
                          settings.arguments as Map<String, dynamic>? ?? {};
                      final adminId = args['adminId'] as String? ?? '';
                      final initialName = args['initialName'] as String?;
                      return MaterialPageRoute<void>(
                        builder: (_) => SellerPage(
                          adminId: adminId,
                          initialName: initialName,
                        ),
                      );
                    }
                    return null;
                  },
                  home: HeaderFooterPage(
                    themeModeNotifier: _themeModeNotifier,
                    productRepository: widget.productRepository,
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

class HeaderFooterPage extends StatefulWidget {
  const HeaderFooterPage({
    super.key,
    required this.themeModeNotifier,
    this.productRepository,
  });

  final ValueNotifier<ThemeMode> themeModeNotifier;
  final ProductRepository? productRepository;

  @override
  State<HeaderFooterPage> createState() => _HeaderFooterPageState();
}

enum _HeaderAction { menu, cart, notification }

int _chatUnreadBadgeCount(List<ChatSupportThreadData> threads) {
  var unreadCount = 0;

  for (final thread in threads) {
    unreadCount += thread.unreadMessageCount;
  }

  return unreadCount;
}

class _HeaderFooterPageState extends State<HeaderFooterPage>
    with WidgetsBindingObserver {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final GlobalKey<_BuyerPlatformPickerState> _buyerPlatformPickerKey =
      GlobalKey<_BuyerPlatformPickerState>();
  static const Duration _productAutoRefreshInterval = Duration(seconds: 15);
  static const Duration _chatAutoRefreshInterval = Duration(milliseconds: 350);
  static const Duration _exitBackPressWindow = Duration(seconds: 2);
  late final ProductRepository _productRepository;
  late final SellerRepository _sellerRepository;
  late final StoreTypeRepository _storeTypeRepository;
  late final PlatformRepository _platformRepository;
  final Map<int, ScrollController> _shopDealScrollControllers =
      <int, ScrollController>{};
  late final TextEditingController _favoritesSearchController;
  late final FocusNode _favoritesSearchFocusNode;
  late final TextEditingController _shopSearchController;
  late final FocusNode _shopSearchFocusNode;
  late final ValueNotifier<double> _heroImageOpacityNotifier;
  late final ValueNotifier<Future<List<Product>>> _productsFutureNotifier;
  late final ValueNotifier<Future<List<SellerSummary>>> _sellersFutureNotifier;
  late final ValueNotifier<Future<List<StoreTypeSummary>>>
  _storeTypesFutureNotifier;
  late final ValueNotifier<Future<List<BuyerPlatformSummary>>>
  _platformsFutureNotifier;
  late final ValueNotifier<String> _buyerPlatformNotifier;
  late final ValueNotifier<StoreTypeSummary?> _selectedStoreTypeNotifier;
  late final ValueNotifier<bool> _categoriesBrowseOpenNotifier;
  late final ValueNotifier<String> _storeTypeCategoryFilterNotifier;
  late final ValueNotifier<bool> _isFavoritesSearchingNotifier;
  late final ValueNotifier<bool> _showsNewMessagePopupNotifier;
  late final ValueNotifier<bool> _showsScrollToTopButtonNotifier;
  late final ValueNotifier<bool> _isHomeChromeVisibleNotifier;
  late final ValueNotifier<bool> _homePickerSearchActiveNotifier;
  late final ValueNotifier<String> _favoritesSearchQueryNotifier;
  late final ValueNotifier<int> _selectedIndexNotifier;
  late final ValueNotifier<int> _selectedOrderStageIndexNotifier;
  /// Bitmask of stackable sorts: Flash / Top Selling / Top Rating (`1 << index`).
  /// `0` + New Post off = All. New Post stacks via [_newPostFilterActiveNotifier].
  late final ValueNotifier<int> _dealSortMaskNotifier;
  late final ValueNotifier<bool> _newPostFilterActiveNotifier;
  late final ValueNotifier<int> _homeBottomOverscrollSignalNotifier;
  late final ValueNotifier<_HeaderAction?> _selectedHeaderActionNotifier;
  late final ValueNotifier<bool> _isShopVisualSearchingNotifier;
  late final ValueNotifier<List<Product>?> _shopVisualSearchProductsNotifier;
  late final ValueNotifier<String> _shopVisualSearchErrorNotifier;
  late final ValueNotifier<String> _shopSearchQueryNotifier;
  late final ValueNotifier<bool> _isShopSearchModeNotifier;

  /// Committed term shows listing results; draft typing shows possible searches.
  String _shopCommittedSearchQuery = '';
  /// Platform-scoped live search business-type filter (`all` / store-type key).
  String _shopLiveSearchStoreTypeFilter = 'all';
  final Set<String> _visitedShopLiveSearchFilterIds = <String>{'all'};
  bool _shopLiveSearchFilterSlideForward = true;
  bool _shopLiveSearchFilterShowSkeleton = false;
  Timer? _shopLiveSearchFilterSkeletonTimer;
  bool _suppressShopSearchRefocus = false;
  Timer? _shopSearchCloseGuard;
  bool _shopUsesPlainSortHeader = false;
  late final ValueNotifier<bool> _isShopHeaderCollapsedNotifier;
  /// When false, sticky header snaps with no slide (sort-tab swaps).
  late final ValueNotifier<bool> _shopStickyHeaderAnimateNotifier;
  /// Bumps on sort restore so product list shows skeleton before past scroll.
  late final ValueNotifier<int> _shopDealSwitchEpochNotifier;
  late final ValueNotifier<bool> _shopDealSwitchReadyNotifier;

  /// Same hero widget across browse/search so the collapse can animate
  /// instead of jumping to an already-collapsed header.
  final GlobalKey _shopPlatformHeroKey = GlobalKey();
  late final ValueNotifier<bool> _platformRefreshSkeletonNotifier;
  late ThemeData _theme;
  late bool _isDarkMode;
  late Color _fieldBackgroundColor;
  late Color _titleColor;
  late Color _secondaryColor;
  late Color _primaryColor;
  late Color _dashboardForegroundColor;
  late Color _chatHeaderBackgroundColor;
  late Color _chatHeaderSearchFieldBackgroundColor;
  Timer? _productAutoRefreshTimer;
  Timer? _chatAutoRefreshTimer;
  Timer? _newMessagePopupTimer;
  Timer? _footerChromeRevealTimer;
  OverlayEntry? _drawerSystemBarsOverlay;

  bool _isDrawerOpen = false;
  bool _isOpeningVisualSearchCamera = false;
  bool _isRefreshingChats = false;
  bool _isRefreshingProducts = false;
  final List<int> _tabHistory = <int>[0];
  int _lastIncomingSupportEvent = 0;
  int _lastHandledOrderTabRequest = 0;
  double _lastKeyboardBottomInset = 0;
  double _lastHomeCompanyScrollOffset = 0;
  double _shopDashboardScrollOffset = 0;
  int _shopDashboardVisibleCount = 6;
  /// Per sort-tab scroll + lazy-load window so All ↔ New Post keeps place.
  final Map<int, double> _shopDealScrollOffsets = <int, double>{};
  final Map<int, int> _shopDealVisibleCounts = <int, int>{};
  int _shopDealSwitchGeneration = 0;
  bool _platformPageMovesForward = true;
  final Map<String, ScrollController> _buyerLayerScrollControllers =
      <String, ScrollController>{};

  /// Browse-list filter frozen while search UI is open so the offstage list
  /// keeps its exact scroll position and item set.
  String _shopFrozenListSearchQuery = '';
  String? _cachedShopListingPlatformId;
  Future<List<Product>>? _cachedShopListingProductsFuture;
  Future<List<Product>>? _cachedShopListingProductsSource;
  Future<List<StoreTypeSummary>>? _cachedShopListingStoreTypesSource;
  Future<List<SellerSummary>>? _cachedShopListingSellersSource;
  Future<_BuyerLiveSearchCatalog>? _cachedShopLiveSearchCatalogFuture;
  Object? _cachedShopLiveSearchCatalogToken;
  DateTime? _lastBackPressAt;
  String _profileFirstName = '';
  String _profileLastName = '';
  String _profileEmail = '';
  String _profilePhone = '';
  String _profileImageUrl = '';
  String _profileAccountId = '';
  late final UnifiedAccountService _unifiedAccountService;

  Future<List<Product>> get _productsFuture => _productsFutureNotifier.value;
  set _productsFuture(Future<List<Product>> value) {
    if (!identical(_productsFutureNotifier.value, value)) {
      _productsFutureNotifier.value = value;
    }
  }

  Future<List<SellerSummary>> get _sellersFuture =>
      _sellersFutureNotifier.value;
  set _sellersFuture(Future<List<SellerSummary>> value) {
    if (!identical(_sellersFutureNotifier.value, value)) {
      _sellersFutureNotifier.value = value;
    }
  }

  Future<List<StoreTypeSummary>> get _storeTypesFuture =>
      _storeTypesFutureNotifier.value;
  set _storeTypesFuture(Future<List<StoreTypeSummary>> value) {
    if (!identical(_storeTypesFutureNotifier.value, value)) {
      _storeTypesFutureNotifier.value = value;
    }
  }

  Future<List<BuyerPlatformSummary>> get _platformsFuture =>
      _platformsFutureNotifier.value;
  set _platformsFuture(Future<List<BuyerPlatformSummary>> value) {
    if (!identical(_platformsFutureNotifier.value, value)) {
      _platformsFutureNotifier.value = value;
    }
  }

  String get _buyerPlatform => _buyerPlatformNotifier.value;
  set _buyerPlatform(String value) {
    if (_buyerPlatformNotifier.value != value) {
      _buyerPlatformNotifier.value = value;
    }
  }

  StoreTypeSummary? get _selectedStoreType => _selectedStoreTypeNotifier.value;
  set _selectedStoreType(StoreTypeSummary? value) {
    if (!identical(_selectedStoreTypeNotifier.value, value)) {
      _selectedStoreTypeNotifier.value = value;
    }
  }

  bool get _isCategoriesBrowseOpen => _categoriesBrowseOpenNotifier.value;
  set _isCategoriesBrowseOpen(bool value) {
    if (_categoriesBrowseOpenNotifier.value != value) {
      _categoriesBrowseOpenNotifier.value = value;
    }
  }

  String get _storeTypeCategoryFilter => _storeTypeCategoryFilterNotifier.value;
  set _storeTypeCategoryFilter(String value) {
    if (_storeTypeCategoryFilterNotifier.value != value) {
      _storeTypeCategoryFilterNotifier.value = value;
    }
  }

  bool get _isFavoritesSearching => _isFavoritesSearchingNotifier.value;
  set _isFavoritesSearching(bool value) {
    if (_isFavoritesSearchingNotifier.value != value) {
      _isFavoritesSearchingNotifier.value = value;
    }
  }

  bool get _showsNewMessagePopup => _showsNewMessagePopupNotifier.value;
  set _showsNewMessagePopup(bool value) {
    if (_showsNewMessagePopupNotifier.value != value) {
      _showsNewMessagePopupNotifier.value = value;
    }
  }

  bool get _showsScrollToTopButton => _showsScrollToTopButtonNotifier.value;
  set _showsScrollToTopButton(bool value) {
    if (_showsScrollToTopButtonNotifier.value != value) {
      _showsScrollToTopButtonNotifier.value = value;
    }
  }

  bool get _isHomeChromeVisible => _isHomeChromeVisibleNotifier.value;
  set _isHomeChromeVisible(bool value) {
    if (_isHomeChromeVisibleNotifier.value != value) {
      _isHomeChromeVisibleNotifier.value = value;
    }
  }

  String get _favoritesSearchQuery => _favoritesSearchQueryNotifier.value;
  set _favoritesSearchQuery(String value) {
    if (_favoritesSearchQueryNotifier.value != value) {
      _favoritesSearchQueryNotifier.value = value;
    }
  }

  int get _selectedIndex => _selectedIndexNotifier.value;
  set _selectedIndex(int value) {
    if (_selectedIndexNotifier.value != value) {
      _selectedIndexNotifier.value = value;
    }
  }

  int get _selectedOrderStageIndex => _selectedOrderStageIndexNotifier.value;
  set _selectedOrderStageIndex(int value) {
    if (_selectedOrderStageIndexNotifier.value != value) {
      _selectedOrderStageIndexNotifier.value = value;
    }
  }

  int get _dealSortMask => _dealSortMaskNotifier.value;
  set _dealSortMask(int value) {
    if (_dealSortMaskNotifier.value != value) {
      _dealSortMaskNotifier.value = value;
    }
  }

  bool get _newPostFilterActive => _newPostFilterActiveNotifier.value;
  set _newPostFilterActive(bool value) {
    if (_newPostFilterActiveNotifier.value != value) {
      _newPostFilterActiveNotifier.value = value;
    }
  }

  /// Scroll / lazy-load key: sort bits + New Post bit. `0` = All.
  int get _shopDealFilterKey =>
      (_dealSortMask << 1) | (_newPostFilterActive ? 1 : 0);

  bool get _isAllDealFilter => _shopDealFilterKey == 0;

  int get _homeBottomOverscrollSignal =>
      _homeBottomOverscrollSignalNotifier.value;
  set _homeBottomOverscrollSignal(int value) {
    if (_homeBottomOverscrollSignalNotifier.value != value) {
      _homeBottomOverscrollSignalNotifier.value = value;
    }
  }

  _HeaderAction? get _selectedHeaderAction =>
      _selectedHeaderActionNotifier.value;
  set _selectedHeaderAction(_HeaderAction? value) {
    if (_selectedHeaderActionNotifier.value != value) {
      _selectedHeaderActionNotifier.value = value;
    }
  }

  bool get _isShopVisualSearching => _isShopVisualSearchingNotifier.value;
  set _isShopVisualSearching(bool value) {
    if (_isShopVisualSearchingNotifier.value != value) {
      _isShopVisualSearchingNotifier.value = value;
    }
  }

  List<Product>? get _shopVisualSearchProducts =>
      _shopVisualSearchProductsNotifier.value;
  set _shopVisualSearchProducts(List<Product>? value) {
    if (!identical(_shopVisualSearchProductsNotifier.value, value)) {
      _shopVisualSearchProductsNotifier.value = value;
    }
  }

  String get _shopVisualSearchError => _shopVisualSearchErrorNotifier.value;
  set _shopVisualSearchError(String value) {
    if (_shopVisualSearchErrorNotifier.value != value) {
      _shopVisualSearchErrorNotifier.value = value;
    }
  }

  bool get _isShopSearchMode => _isShopSearchModeNotifier.value;
  set _isShopSearchMode(bool value) {
    if (_isShopSearchModeNotifier.value != value) {
      _isShopSearchModeNotifier.value = value;
    }
  }

  bool get _isShopHeaderCollapsed => _isShopHeaderCollapsedNotifier.value;
  set _isShopHeaderCollapsed(bool value) {
    if (_isShopHeaderCollapsedNotifier.value != value) {
      _isShopHeaderCollapsedNotifier.value = value;
    }
  }

  String get _shopSearchQuery => _shopSearchQueryNotifier.value;
  set _shopSearchQuery(String value) {
    if (_shopSearchQueryNotifier.value != value) {
      _shopSearchQueryNotifier.value = value;
    }
  }

  bool get _isGuestMode => GuestSession.isGuest && !AuthSession.isLoggedInSync;

  bool _isGuestRestrictedTab(int index) {
    // Guests can only browse Home. Scan / Activity / Message require login.
    return index != 0;
  }

  void _goToBrowseHome({String platformId = 'shop'}) {
    _navigateToTab(0);
    final normalized = platformId.trim().toLowerCase();
    if (normalized.isNotEmpty) {
      _selectBuyerPlatform(normalized);
    }
  }

  void _redirectGuestToLogin() {
    unawaited(
      redirectGuestToLogin(
        context,
        themeModeNotifier: widget.themeModeNotifier,
      ),
    );
  }

  void _openGuestLoginPage() {
    dismissAppKeyboard();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => LoginPage(themeModeNotifier: widget.themeModeNotifier),
      ),
    );
  }

  void _openGuestSignUpPage() {
    dismissAppKeyboard();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            RegisterPage(themeModeNotifier: widget.themeModeNotifier),
      ),
    );
  }

  Future<void> _openGuestHelpCentre() async {
    dismissAppKeyboard();
    final base =
        (localApiEnvironmentBaseUrl.trim().isNotEmpty
                ? localApiEnvironmentBaseUrl
                : localApiLoopbackBaseUrl)
            .replaceAll(RegExp(r'/+$'), '');
    final uri = Uri.parse('$base/help_centre.html');
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched && mounted) {
        AppSnackBar.showInfo(context, message: 'Example link: $uri');
      }
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showInfo(context, message: 'Example link: $uri');
    }
  }

  @override
  void initState() {
    super.initState();
    _unifiedAccountService = createUnifiedAccountService();
    WidgetsBinding.instance.addObserver(this);
    DeviceSessionGuard.start(onSignedOut: _handleRemoteDeviceSignOut);
    unawaited(CartStore.instance.ensureLoaded());
    unawaited(_initializeChatUnreadTracking());
    unawaited(_loadProfileData());
    _productRepository = widget.productRepository ?? createProductRepository();
    _sellerRepository = createSellerRepository();
    _storeTypeRepository = createStoreTypeRepository();
    _platformRepository = createPlatformRepository();
    _favoritesSearchController = TextEditingController();
    _favoritesSearchFocusNode = FocusNode();
    _shopSearchController = TextEditingController();
    _shopSearchFocusNode = FocusNode()..addListener(_onShopSearchFocusChanged);
    _heroImageOpacityNotifier = ValueNotifier(1);
    _productsFutureNotifier = ValueNotifier(_productRepository.fetchProducts());
    _sellersFutureNotifier = ValueNotifier(_sellerRepository.fetchSellers());
    _storeTypesFutureNotifier = ValueNotifier(
      _storeTypeRepository.fetchStoreTypes(),
    );
    _platformsFutureNotifier = ValueNotifier(
      _platformRepository.fetchPlatforms(),
    );
    _buyerPlatformNotifier = ValueNotifier(_kBuyerPlatformNone);
    _selectedStoreTypeNotifier = ValueNotifier<StoreTypeSummary?>(null);
    _categoriesBrowseOpenNotifier = ValueNotifier(false);
    _storeTypeCategoryFilterNotifier = ValueNotifier('all');
    _isFavoritesSearchingNotifier = ValueNotifier(false);
    _showsNewMessagePopupNotifier = ValueNotifier(false);
    _showsScrollToTopButtonNotifier = ValueNotifier(false);
    _isHomeChromeVisibleNotifier = ValueNotifier(true);
    _homePickerSearchActiveNotifier = ValueNotifier(false);
    _favoritesSearchQueryNotifier = ValueNotifier('');
    _selectedIndexNotifier = ValueNotifier(0);
    _selectedOrderStageIndexNotifier = ValueNotifier(0);
    _dealSortMaskNotifier = ValueNotifier(0);
    _newPostFilterActiveNotifier = ValueNotifier(false);
    _homeBottomOverscrollSignalNotifier = ValueNotifier(0);
    _selectedHeaderActionNotifier = ValueNotifier(null);
    _isShopVisualSearchingNotifier = ValueNotifier(false);
    _shopVisualSearchProductsNotifier = ValueNotifier(null);
    _shopVisualSearchErrorNotifier = ValueNotifier('');
    _shopSearchQueryNotifier = ValueNotifier('');
    _isShopSearchModeNotifier = ValueNotifier(false);
    _isShopHeaderCollapsedNotifier = ValueNotifier(false);
    _shopStickyHeaderAnimateNotifier = ValueNotifier(true);
    _shopDealSwitchEpochNotifier = ValueNotifier(0);
    _shopDealSwitchReadyNotifier = ValueNotifier(true);
    _platformRefreshSkeletonNotifier = ValueNotifier(false);
    _startProductAutoRefresh();
    _startChatAutoRefresh();
    _lastHandledOrderTabRequest =
        OrderTabNavigation.instance.requestNotifier.value.requestId;
    OrderTabNavigation.instance.requestNotifier.addListener(
      _handleOrderTabNavigationRequest,
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    _theme = Theme.of(context);
    _isDarkMode = _theme.brightness == Brightness.dark;
    _fieldBackgroundColor =
        _theme.inputDecorationTheme.fillColor ?? _theme.colorScheme.surface;
    _titleColor = _theme.colorScheme.onSurface;
    _secondaryColor =
        _theme.textTheme.bodyMedium?.color ??
        _theme.colorScheme.onSurface.withValues(alpha: 0.7);
    _primaryColor = _theme.colorScheme.primary;
    _dashboardForegroundColor = _theme.cardColor;
    _chatHeaderBackgroundColor =
        _theme.inputDecorationTheme.fillColor ?? _theme.colorScheme.surface;
    _chatHeaderSearchFieldBackgroundColor =
        _theme.inputDecorationTheme.fillColor ??
        _theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.65);
  }

  Future<void> _initializeChatUnreadTracking() async {
    await ChatSupportStore.instance.ensureLoaded();
    if (!mounted) {
      return;
    }

    _lastIncomingSupportEvent =
        ChatSupportStore.instance.incomingSupportEventNotifier.value;
    ChatSupportStore.instance.incomingSupportEventNotifier.addListener(
      _handleIncomingSupportEvent,
    );
  }

  Future<void> _loadProfileData() async {
    final accountId = ((await AuthSession.getAccountId()) ?? '').trim();
    final email = ((await AuthSession.getAccountEmail()) ?? '').trim();
    if (accountId.isNotEmpty || email.isNotEmpty) {
      try {
        final result = await _unifiedAccountService.fetchSession(
          accountId: accountId.isNotEmpty ? accountId : null,
          email: email.isNotEmpty ? email : null,
        );
        await AuthSession.setUnifiedSession(result.session);
        // Pull server preferredLanguage so web ↔ app stay in sync.
        await AppLanguagePreference.syncFromUnifiedSession(result.session);
      } catch (_) {
        // The saved profile remains available if the account service is offline.
      }
    }

    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    final resolvedAccountId = ((await AuthSession.getAccountId()) ?? '').trim();
    setState(() {
      _profileFirstName = prefs.getString('profile_first_name') ?? '';
      _profileLastName = prefs.getString('profile_last_name') ?? '';
      _profileEmail = prefs.getString('profile_email') ?? '';
      _profilePhone = prefs.getString('profile_phone') ?? '';
      _profileImageUrl = prefs.getString('profile_image_url') ?? '';
      _profileAccountId = resolvedAccountId;
    });
  }

  void _handleIncomingSupportEvent() {
    if (!mounted) {
      return;
    }

    final incomingSupportEvent =
        ChatSupportStore.instance.incomingSupportEventNotifier.value;
    if (incomingSupportEvent <= _lastIncomingSupportEvent) {
      return;
    }

    _lastIncomingSupportEvent = incomingSupportEvent;
    _newMessagePopupTimer?.cancel();
    unawaited(playNotificationSound());
    _showsNewMessagePopup = true;
    _newMessagePopupTimer = Timer(const Duration(seconds: 2), () {
      if (!mounted) {
        return;
      }

      _showsNewMessagePopup = false;
    });
  }

  void _handleHeaderAction(_HeaderAction action) {
    dismissAppKeyboard();

    if (action == _HeaderAction.menu) {
      _selectedHeaderAction = _isDrawerOpen ? null : _HeaderAction.menu;

      if (_isDrawerOpen) {
        Navigator.of(context).pop();
      } else {
        _scaffoldKey.currentState?.openDrawer();
      }
      return;
    }

    if (_isGuestMode &&
        (action == _HeaderAction.cart ||
            action == _HeaderAction.notification)) {
      _redirectGuestToLogin();
      return;
    }

    if (action == _HeaderAction.cart) {
      unawaited(_openCartPage());
      return;
    }

    if (action == _HeaderAction.notification) {
      unawaited(_openNotificationsPanel());
      return;
    }

    if (_selectedHeaderAction == action) {
      _selectedHeaderAction = null;
    } else {
      _selectedHeaderAction = action;
    }
  }

  Future<void> _openNotificationsPanel() async {
    dismissAppKeyboard();
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    _selectedHeaderAction = _HeaderAction.notification;
    // Tie time buckets to shared util (parity with main_dart.html notifSectionFor).
    await BuyerNotificationsPanel.show(
      context,
      primaryColor: _primaryColor,
      surfaceColor: _dashboardForegroundColor,
      titleColor: _titleColor,
      secondaryColor: _secondaryColor,
      firstName: _profileFirstName,
      sectionFor: BuyerNotificationTimeSections.sectionFor,
      sectionLabel: BuyerNotificationTimeSections.label,
    );
    if (!mounted) return;
    if (_selectedHeaderAction == _HeaderAction.notification) {
      _selectedHeaderAction = null;
    }
  }

  Future<void> _openAccountSettingsPanel({
    BuyerAccountPanelView initialView = BuyerAccountPanelView.menu,
  }) async {
    dismissAppKeyboard();
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    final accountName = [
      _profileFirstName.trim(),
      _profileLastName.trim(),
    ].where((part) => part.isNotEmpty).join(' ');
    final platformId = _buyerPlatform == _kBuyerPlatformNone
        ? ''
        : _buyerPlatform;
    final platformLabel = await _resolveCurrentPlatformLabel();
    if (!mounted) return;

    await BuyerAccountPanel.show(
      context,
      primaryColor: _primaryColor,
      surfaceColor: _dashboardForegroundColor,
      titleColor: _titleColor,
      secondaryColor: _secondaryColor,
      displayName: accountName.isEmpty ? 'Account' : accountName,
      email: _profileEmail,
      phone: _profilePhone,
      accountId: _profileAccountId.isEmpty ? '—' : _profileAccountId,
      initials: _buyerAccountInitials(
        firstName: _profileFirstName,
        lastName: _profileLastName,
        email: _profileEmail,
      ),
      imageUrl: _profileImageUrl,
      productsFuture: _productsFuture,
      onSignOut: _handleBuyerAccountSignOut,
      initialView: initialView,
      onOpenSelectAddress: () {
        unawaited(_openSelectAddressPage());
      },
      onProfileImageChanged: (imageUrl) {
        if (!mounted) return;
        setState(() => _profileImageUrl = imageUrl);
      },
      themeModeNotifier: widget.themeModeNotifier,
      onExploreShop: _goToBrowseHome,
      onOpenProduct: (product) {
        unawaited(
          openProductDetailsPage(context, product, platformId: platformId),
        );
      },
      platformId: platformId,
      platformLabel: platformLabel,
      onOpenActivityItem: (item) {
        _navigateToTab(2, orderStageIndex: item.stageIndex);
      },
    );
    unawaited(BuyerDeliveryAddressStore.instance.reload());
  }

  Future<void> _openSelectAddressPage({
    String? initialEditAddressId,
    bool openEditor = false,
  }) async {
    dismissAppKeyboard();
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }
    await BuyerDeliveryAddressStore.instance.reload();
    if (!mounted) return;
    await openSelectAddressPage(
      context,
      primaryColor: _primaryColor,
      initialEditAddressId: initialEditAddressId,
      openEditor: openEditor,
    );
  }

  Future<void> _openFoodDeliveryLocationPicker() async {
    dismissAppKeyboard();
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }
    await BuyerDeliveryAddressStore.instance.reload();
    if (!mounted) return;
    final isShop = _buyerPlatform.trim().toLowerCase() == 'shop';
    await showFoodDeliveryLocationPicker(
      context,
      primaryColor: _primaryColor,
      title: isShop ? 'What is your address?' : 'Where to deliver?',
      emptySubtitle: 'Set your delivery address',
      filledSubtitle: isShop
          ? 'Choose the address for this order.'
          : 'Choose where you want your order delivered.',
    );
  }

  Future<void> _handleRemoteDeviceSignOut() async {
    if (!mounted) return;
    AppSnackBar.showInfo(
      context,
      message: 'This device was signed out. The saved sign-in was removed.',
    );
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
  }

  Future<void> _handleBuyerAccountSignOut() async {
    await ChatSupportStore.instance.clearForLogout();
    await AuthSession.clearSession();
    await GuestSession.continueAsGuest();
    await CartStore.instance.reloadForCurrentAccount();
    await FavoriteProductsStore.instance.reloadForCurrentAccount();
    await OrderStore.instance.reloadForCurrentAccount();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
  }

  Future<void> _openCartPage() async {
    dismissAppKeyboard();
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    _selectedHeaderAction = _HeaderAction.cart;

    final platformId = _buyerPlatform == _kBuyerPlatformNone
        ? CartStore.instance.activePlatformId
        : _buyerPlatform;
    final cartAction = await openCartPage(context, platformId: platformId);

    if (!mounted) {
      return;
    }

    if (cartAction == CartPageAction.openShop) {
      _goToBrowseHome(
        platformId: platformId.trim().isEmpty ? 'shop' : platformId,
      );
    }

    if (_selectedHeaderAction == _HeaderAction.cart) {
      _selectedHeaderAction = null;
    }
  }

  void _openProductConcernPage() {
    dismissAppKeyboard();
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    unawaited(openChatListPage(context));
  }

  ScrollController _buyerLayerScrollController(String layerKey) {
    return _buyerLayerScrollControllers.putIfAbsent(
      layerKey,
      ScrollController.new,
    );
  }

  void _releaseBuyerPlatformLayerScrollControllers(String platformId) {
    final normalized = platformId.trim().toLowerCase();
    if (normalized.isEmpty) {
      return;
    }

    final keysToRemove = _buyerLayerScrollControllers.keys
        .where(
          (key) =>
              key == 'layer:types:$normalized' ||
              key.startsWith('layer:companies:$normalized:'),
        )
        .toList(growable: false);

    for (final key in keysToRemove) {
      _buyerLayerScrollControllers.remove(key)?.dispose();
    }
  }

  ScrollController _shopDealScrollControllerFor(int index) {
    return _shopDealScrollControllers.putIfAbsent(
      index,
      () => ScrollController(
        initialScrollOffset: _shopDealScrollOffsets[index] ?? 0,
      ),
    );
  }

  ScrollController get _productDashboardScrollController =>
      _shopDealScrollControllerFor(_shopDealFilterKey);

  double _shopDealSavedOffset(int index) {
    final controller = _shopDealScrollControllers[index];
    if (controller == null) {
      return _shopDealScrollOffsets[index] ?? 0;
    }
    if (controller.hasClients) {
      final pixels = controller.offset;
      return pixels < 0 ? 0 : pixels;
    }
    return controller.initialScrollOffset;
  }

  /// Bake [offset] into a fresh controller so the next ListView mount starts
  /// exactly there (keepScrollOffset/PageStorage alone is not reliable here).
  void _replaceShopDealScrollController(int index, double offset) {
    final clamped = offset < 0 ? 0.0 : offset;
    _shopDealScrollOffsets[index] = clamped;
    final old = _shopDealScrollControllers.remove(index);
    if (old != null) {
      if (old.hasClients) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          old.dispose();
        });
      } else {
        old.dispose();
      }
    }
    _shopDealScrollControllers[index] = ScrollController(
      initialScrollOffset: clamped,
    );
  }

  void _resetShopDashboardScroll({bool resetLazyLoad = true}) {
    _shopUsesPlainSortHeader = false;
    for (final controller in _shopDealScrollControllers.values) {
      controller.dispose();
    }
    _shopDealScrollControllers.clear();
    _shopDashboardScrollOffset = 0;
    _shopDealScrollOffsets.clear();
    if (resetLazyLoad) {
      _shopDealVisibleCounts.clear();
      _shopDashboardVisibleCount = _shopDealLazyLoadPageSize;
    }
    _handleShopDashboardScroll(0);
  }

  void _syncHomeScrollChromeFromControllers() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _selectedIndex != 0) {
        return;
      }

      final platformId = _buyerPlatform.trim().toLowerCase();
      if (platformId.isNotEmpty &&
          platformId != _kBuyerPlatformNone &&
          _isProductListingStorefront(platformId) &&
          _productDashboardScrollController.hasClients) {
        _handleShopDashboardScroll(_productDashboardScrollController.offset);
        return;
      }

      final pickerController = _buyerLayerScrollControllers['layer:picker'];
      if (pickerController != null && pickerController.hasClients) {
        _updateFooterChromeFromScroll(pickerController.offset);
      }
    });
  }

  int _mainTabStackIndex(int selectedIndex) {
    switch (selectedIndex) {
      case 2:
        return 1;
      case 4:
        return 2;
      default:
        return 0;
    }
  }

  void _navigateToTab(
    int index, {
    bool addToHistory = true,
    int? orderStageIndex,
  }) {
    dismissAppKeyboard();
    if (_isGuestMode && _isGuestRestrictedTab(index)) {
      _redirectGuestToLogin();
      return;
    }

    _resetHeroImageOpacity();
    if (index != 4) {
      _resetFavoritesSearch();
    }
    if (index != 0 && _showsScrollToTopButton) {
      _showsScrollToTopButton = false;
    }
    if (index == 0) {
      _cancelFooterChromeRevealTimer();
      if (addToHistory) {
        _isHomeChromeVisible = true;
        _lastHomeCompanyScrollOffset = 0;
      } else {
        _syncHomeScrollChromeFromControllers();
      }
    }

    final shouldChangeTab = _selectedIndex != index;
    final shouldUpdateOrderStage =
        orderStageIndex != null && _selectedOrderStageIndex != orderStageIndex;
    if (!shouldChangeTab && !shouldUpdateOrderStage) {
      return;
    }

    _lastBackPressAt = null;
    if (orderStageIndex != null) {
      _selectedOrderStageIndex = orderStageIndex;
    }
    _selectedIndex = index;
    if (addToHistory && shouldChangeTab) {
      if (_tabHistory.isEmpty || _tabHistory.last != index) {
        _tabHistory.add(index);
      }
    }
  }

  void _handleNavigationTap(int index) {
    // Scan is an action (image search), not a selected tab.
    if (index == 1) {
      _openVisualSearchPage();
      return;
    }
    // Message opens chat list without changing the selected tab.
    if (index == 3) {
      _openProductConcernPage();
      return;
    }
    // Activity lives in the platform right sidebar — not on Home.
    if (index == 2) {
      unawaited(_handleActivityNavigationTap());
      return;
    }
    _navigateToTab(index);
  }

  Future<void> _handleActivityNavigationTap() async {
    final platformId = _buyerPlatform.trim().toLowerCase();
    if (platformId.isEmpty || platformId == _kBuyerPlatformNone) {
      _navigateToTab(2);
      return;
    }
    await _openPlatformActivityPanel();
  }

  Future<String> _resolveCurrentPlatformLabel() async {
    final platformId = _buyerPlatform.trim().toLowerCase();
    if (platformId.isEmpty || platformId == _kBuyerPlatformNone) {
      return 'Home';
    }
    try {
      final platforms = await _platformsFuture;
      for (final platform in platforms) {
        if (platform.id == platformId) {
          final name = platform.name.trim();
          if (name.isNotEmpty) return name;
          break;
        }
      }
    } catch (_) {}
    if (platformId == 'food') return 'Food';
    if (platformId == 'hotels') return 'Hotels';
    if (platformId == 'shop') return 'Shop';
    return platformId[0].toUpperCase() + platformId.substring(1);
  }

  Widget _buildActivitySwitchHeader({
    VoidCallback? onNotificationTap,
    VoidCallback? onAccountTap,
  }) {
    final accountName = [
      _profileFirstName.trim(),
      _profileLastName.trim(),
    ].where((part) => part.isNotEmpty).join(' ');

    return ColoredBox(
      color: Colors.transparent,
      child: _SwitchSiteHeader(
        titleColor: _titleColor,
        secondaryColor: _secondaryColor,
        primaryColor: _primaryColor,
        isLoggedIn: !_isGuestMode,
        accountName: accountName.isEmpty ? 'Account' : accountName,
        accountInitials: _buyerAccountInitials(
          firstName: _profileFirstName,
          lastName: _profileLastName,
          email: _profileEmail,
        ),
        accountImageUrl: _profileImageUrl,
        onLanguageTap: () {},
        onNotificationTap:
            onNotificationTap ?? () => unawaited(_openNotificationsPanel()),
        onAccountTap:
            onAccountTap ?? () => unawaited(_openAccountSettingsPanel()),
      ),
    );
  }

  Future<void> _openAfterClosingActivityPanel(
    BuildContext panelContext,
    Future<void> Function() openPanel,
  ) async {
    await Navigator.of(panelContext).maybePop();
    if (!mounted) return;
    await openPanel();
  }

  Future<void> _openPlatformActivityPanel() async {
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }
    dismissAppKeyboard();
    final platformLabel = await _resolveCurrentPlatformLabel();
    if (!mounted) return;
    await BuyerPlatformActivityPanel.show(
      context,
      platformLabel: platformLabel,
      primaryColor: _primaryColor,
      surfaceColor: _dashboardForegroundColor,
      titleColor: _titleColor,
      secondaryColor: _secondaryColor,
      onOpenItem: (item) {
        _navigateToTab(2, orderStageIndex: item.stageIndex);
      },
      headerBuilder: (panelContext) => _buildActivitySwitchHeader(
        onNotificationTap: () => unawaited(
          _openAfterClosingActivityPanel(panelContext, _openNotificationsPanel),
        ),
        onAccountTap: () => unawaited(
          _openAfterClosingActivityPanel(
            panelContext,
            _openAccountSettingsPanel,
          ),
        ),
      ),
    );
  }

  void _handleOrderTabNavigationRequest() {
    if (!mounted) {
      return;
    }

    final nextRequest = OrderTabNavigation.instance.requestNotifier.value;
    if (nextRequest.requestId == _lastHandledOrderTabRequest) {
      return;
    }

    _lastHandledOrderTabRequest = nextRequest.requestId;
    _navigateToTab(2, orderStageIndex: nextRequest.orderStageIndex);
  }

  void _handleFavoritesSearchChanged(String value) {
    final nextQuery = value.trim();
    if (_favoritesSearchQuery == nextQuery) {
      return;
    }

    _favoritesSearchQuery = nextQuery;
  }

  void _resetFavoritesSearch() {
    _favoritesSearchFocusNode.unfocus();
    if (_favoritesSearchController.text.isEmpty &&
        _favoritesSearchQuery.isEmpty &&
        !_isFavoritesSearching) {
      return;
    }

    _favoritesSearchController.clear();
    _favoritesSearchQuery = '';
    _isFavoritesSearching = false;
  }

  void _toggleFavoritesSearch() {
    if (_isFavoritesSearching) {
      _resetFavoritesSearch();
      return;
    }

    _isFavoritesSearching = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _favoritesSearchFocusNode.requestFocus();
      }
    });
  }

  void _lockShopSearchFocus() {
    _suppressShopSearchRefocus = true;
    _shopSearchFocusNode.canRequestFocus = false;
    _shopSearchFocusNode.unfocus();
    FocusManager.instance.primaryFocus?.unfocus();
    _shopSearchCloseGuard?.cancel();
    // Hold through the header collapse so a pointer-up or reparent
    // cannot put the caret back in the search field.
    _shopSearchCloseGuard = Timer(const Duration(milliseconds: 420), () {
      if (!mounted) return;
      _shopSearchFocusNode.canRequestFocus = true;
      _suppressShopSearchRefocus = false;
    });
  }

  void _captureShopListScrollForSearch() {
    if (_productDashboardScrollController.hasClients) {
      final offset = _productDashboardScrollController.offset;
      _shopDashboardScrollOffset = offset < 0 ? 0 : offset;
    }
    _shopFrozenListSearchQuery = _shopSearchQuery;
  }

  /// Opens the main Shop search chrome (hero field) — used by the sticky
  /// display-only search tap so focus always lands on the real input.
  void _openMainShopSearch() {
    if (_suppressShopSearchRefocus) {
      return;
    }
    _captureShopListScrollForSearch();
    if (!_isShopSearchMode) {
      _isShopSearchMode = true;
    }
    _ensureShopSearchFocusAfterLayout();
  }

  void _onShopSearchFocusChanged() {
    if (_suppressShopSearchRefocus) {
      if (_shopSearchFocusNode.hasFocus) {
        _shopSearchFocusNode.unfocus();
      }
      return;
    }
    if (_shopSearchFocusNode.hasFocus && !_isShopSearchMode) {
      _captureShopListScrollForSearch();
      _isShopSearchMode = true;
      _ensureShopSearchFocusAfterLayout();
    }
  }

  void _ensureShopSearchFocusAfterLayout({int attempt = 0}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _suppressShopSearchRefocus || !_isShopSearchMode) {
        return;
      }
      if (!_shopSearchFocusNode.canRequestFocus) {
        if (attempt < 8) {
          _ensureShopSearchFocusAfterLayout(attempt: attempt + 1);
        }
        return;
      }
      if (!_shopSearchFocusNode.hasFocus) {
        _shopSearchFocusNode.requestFocus();
      }
      if (attempt < 2) {
        _ensureShopSearchFocusAfterLayout(attempt: attempt + 1);
      }
    });
  }

  /// Pointer-down on the shop back icon: drop the keyboard without moving
  /// the header yet, so the finger doesn't land on the search field.
  void _holdShopSearchBack() {
    _lockShopSearchFocus();
  }

  void _resetShopLiveSearchStoreTypeFilter({bool notify = true}) {
    _shopLiveSearchFilterSkeletonTimer?.cancel();
    _shopLiveSearchFilterSkeletonTimer = null;
    void apply() {
      _shopLiveSearchStoreTypeFilter = 'all';
      _visitedShopLiveSearchFilterIds
        ..clear()
        ..add('all');
      _shopLiveSearchFilterShowSkeleton = false;
      _shopLiveSearchFilterSlideForward = true;
    }

    if (!notify) {
      apply();
      return;
    }
    if (!mounted) {
      apply();
      return;
    }
    setState(apply);
  }

  void _selectShopLiveSearchStoreTypeFilter(
    String id, {
    required List<({String id, String label, String iconName})>
        storeTypesWithHits,
  }) {
    final nextId = id.trim().toLowerCase();
    if (nextId.isEmpty || nextId == _shopLiveSearchStoreTypeFilter) return;

    final order = <String>[
      'all',
      for (final storeType in storeTypesWithHits) storeType.id,
    ];
    final oldIndex = order.indexOf(_shopLiveSearchStoreTypeFilter);
    final newIndex = order.indexOf(nextId);
    final forward = newIndex >= oldIndex;
    final firstVisit = !_visitedShopLiveSearchFilterIds.contains(nextId);

    _shopLiveSearchFilterSkeletonTimer?.cancel();
    setState(() {
      _shopLiveSearchFilterSlideForward = forward;
      _shopLiveSearchStoreTypeFilter = nextId;
      _shopLiveSearchFilterShowSkeleton = firstVisit;
    });

    if (!firstVisit) return;

    _shopLiveSearchFilterSkeletonTimer = Timer(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() {
        _shopLiveSearchFilterShowSkeleton = false;
        _visitedShopLiveSearchFilterIds.add(nextId);
      });
    });
  }

  void _exitShopSearchMode({bool clearQuery = true}) {
    _lockShopSearchFocus();
    if (clearQuery) {
      // Restore the list filter from when search opened so the offstage
      // product grid (and its scroll offset) does not change on dismiss.
      _shopSearchQuery = _shopFrozenListSearchQuery;
      final text = _shopFrozenListSearchQuery;
      _shopSearchController.value = TextEditingValue(
        text: text,
        selection: TextSelection.collapsed(offset: text.length),
      );
    }
    _shopCommittedSearchQuery = '';
    _resetShopLiveSearchStoreTypeFilter(notify: false);
    _isShopSearchMode = false;
  }

  void _handleShopSearchChanged(String value) {
    if (_suppressShopSearchRefocus) return;
    if (!_isShopSearchMode) {
      _captureShopListScrollForSearch();
      _isShopSearchMode = true;
    }
    final draft = value.trim();
    if (draft.isEmpty ||
        draft.toLowerCase() != _shopCommittedSearchQuery.toLowerCase()) {
      _shopCommittedSearchQuery = '';
      _resetShopLiveSearchStoreTypeFilter(notify: false);
    }
    _shopSearchQuery = value;
  }

  void _clearShopSearch({bool keepFocus = true}) {
    _shopSearchController.clear();
    _shopSearchQuery = '';
    _shopCommittedSearchQuery = '';
    _resetShopLiveSearchStoreTypeFilter(notify: false);
    if (keepFocus) {
      if (!_isShopSearchMode) {
        _captureShopListScrollForSearch();
      }
      _isShopSearchMode = true;
      _shopSearchFocusNode.requestFocus();
    } else {
      _exitShopSearchMode(clearQuery: true);
    }
  }

  Future<void> _persistShopRecentSearch(String query) async {
    final platformId = _buyerPlatform == _kBuyerPlatformNone
        ? ''
        : _buyerPlatform;
    await app_search.pushBuyerRecentSearch(query, platformId: platformId);
  }

  void _submitShopSearch(String value) {
    final query = value.trim();
    if (query.isEmpty) {
      _exitShopSearchMode(clearQuery: true);
      return;
    }
    // Enter commits to live listing results inside search mode.
    _shopSearchController.text = query;
    _shopSearchController.selection = TextSelection.collapsed(
      offset: query.length,
    );
    _shopCommittedSearchQuery = query;
    _shopSearchQuery = query;
    _resetShopLiveSearchStoreTypeFilter();
    _shopSearchFocusNode.unfocus();
    final platformId = _buyerPlatform == _kBuyerPlatformNone
        ? ''
        : _buyerPlatform;
    unawaited(_persistShopRecentSearch(query));
    unawaited(recordBuyerSearchEvent(query, platformId: platformId));
  }

  void _applyShopSearchSuggestion(String value) {
    final query = value.trim();
    if (query.isEmpty) return;
    _shopSearchController.text = query;
    _shopSearchController.selection = TextSelection.collapsed(
      offset: query.length,
    );
    _shopCommittedSearchQuery = query;
    _shopSearchQuery = query;
    _resetShopLiveSearchStoreTypeFilter();
    _shopSearchFocusNode.unfocus();
    final platformId = _buyerPlatform == _kBuyerPlatformNone
        ? ''
        : _buyerPlatform;
    unawaited(_persistShopRecentSearch(query));
    unawaited(recordBuyerSearchEvent(query, platformId: platformId));
  }

  Future<void> _openSearchPage({String initialQuery = ''}) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) {
          final theme = Theme.of(context);
          final platformId = _buyerPlatform == _kBuyerPlatformNone
              ? ''
              : _buyerPlatform;

          return app_search.ProductSearchPage(
            productsFuture: platformId.isEmpty
                ? _productsFuture
                : _resolveShopListingProducts(platformIdFilter: platformId),
            productRepository: _productRepository,
            primaryColor: theme.colorScheme.primary,
            surfaceColor: theme.cardColor,
            productCardSurfaceColor: _fieldBackgroundColor,
            titleColor: theme.colorScheme.onSurface,
            secondaryColor:
                theme.textTheme.bodyMedium?.color ??
                theme.colorScheme.onSurface.withOpacity(0.7),
            initialQuery: initialQuery,
            platformId: platformId,
            sellersFuture: platformId.isEmpty ? null : _sellersFuture,
            storeTypesFuture: platformId.isEmpty ? null : _storeTypesFuture,
          );
        },
      ),
    );
  }

  Future<void> _handleBuyerLiveSearchHit(
    app_search.BuyerLiveSearchHit hit,
  ) async {
    if (hit.isDisabled) {
      if (!mounted) return;
      AppSnackBar.showInfo(context, message: hit.disabledReason);
      return;
    }

    switch (hit.kind) {
      case app_search.BuyerLiveSearchKind.company:
        final seller = hit.seller;
        if (seller == null) return;
        // Open the company dashboard directly. Do not select platform / store
        // type underneath — otherwise Back lands on Hardware + All/Equipment.
        final adminId = seller.adminId.trim();
        if (adminId.isEmpty) return;
        if (!mounted) return;
        await Navigator.of(context).pushNamed(
          '/seller',
          arguments: {'adminId': adminId, 'initialName': seller.displayName},
        );
        return;
      case app_search.BuyerLiveSearchKind.listing:
        final product = hit.product;
        if (product == null) return;
        if (!mounted) return;
        final listingPlatformId = hit.platformId.trim().isNotEmpty
            ? hit.platformId
            : (_buyerPlatform == _kBuyerPlatformNone ? '' : _buyerPlatform);
        if (listingPlatformId.trim().isNotEmpty &&
            _isProductListingStorefront(listingPlatformId)) {
          _selectBuyerPlatform(listingPlatformId);
        }
        await openProductDetailsPage(
          context,
          product,
          platformId: listingPlatformId,
        );
        return;
    }
  }

  Future<void> _handleGlobalBuyerSearch(String rawQuery) async {
    final query = rawQuery.trim();
    if (query.isEmpty) {
      return;
    }

    final normalizedQuery = _normalizeBuyerKey(query);
    if (normalizedQuery.isEmpty) {
      return;
    }

    List<SellerSummary> sellers;
    try {
      sellers = await _sellersFuture;
    } catch (_) {
      sellers = const <SellerSummary>[];
    }

    SellerSummary? matchedSeller;
    var bestSellerScore = -1;
    for (final seller in sellers) {
      final score = [
        app_search.buyerLiveSearchMatchScore(
          seller.companyName,
          normalizedQuery,
        ),
        app_search.buyerLiveSearchMatchScore(seller.name, normalizedQuery),
        app_search.buyerLiveSearchMatchScore(
          seller.displayName,
          normalizedQuery,
        ),
      ].fold<int>(-1, (best, next) => next > best ? next : best);
      if (score > bestSellerScore) {
        bestSellerScore = score;
        matchedSeller = seller;
      }
    }

    if (matchedSeller != null) {
      // Company match from home search: open seller page only. Skipping
      // platform/store-type selection keeps Back on the previous screen.
      final adminId = matchedSeller.adminId.trim();
      if (adminId.isNotEmpty && mounted) {
        await Navigator.of(context).pushNamed(
          '/seller',
          arguments: {
            'adminId': adminId,
            'initialName': matchedSeller.displayName,
          },
        );
        return;
      }
    }

    List<Product> products;
    try {
      products = await _productsFuture;
    } catch (_) {
      products = const <Product>[];
    }

    Product? matchedListing;
    var bestListingScore = -1;
    for (final product in products) {
      if (!isProductVisibleToUsers(product)) continue;
      final score = [
        app_search.buyerLiveSearchMatchScore(product.name, normalizedQuery),
        app_search.buyerLiveSearchMatchScore(
          product.companyName,
          normalizedQuery,
        ),
        app_search.buyerLiveSearchMatchScore(
          product.categoryLabel,
          normalizedQuery,
        ),
      ].fold<int>(-1, (best, next) => next > best ? next : best);
      if (score > bestListingScore) {
        bestListingScore = score;
        matchedListing = product;
      }
    }

    if (matchedListing != null && mounted) {
      await openProductDetailsPage(context, matchedListing);
      return;
    }

    if (!mounted) return;
    await _openSearchPage(initialQuery: query);
  }

  void _openVisualSearchPage() {
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    if (_isOpeningVisualSearchCamera) {
      return;
    }

    dismissAppKeyboard();
    if (_selectedIndex != 0) {
      _navigateToTab(0);
    }
    if (_buyerPlatform != _kBuyerPlatformNone) {
      _clearBuyerPlatform();
    }

    _isOpeningVisualSearchCamera = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final picker = _buyerPlatformPickerKey.currentState;
      if (!mounted || picker == null) {
        _isOpeningVisualSearchCamera = false;
        return;
      }
      unawaited(
        picker.runScanIntoHomeSearch(_productRepository).whenComplete(() {
          _isOpeningVisualSearchCamera = false;
        }),
      );
    });
  }

  void _clearShopVisualSearch() {
    _isShopVisualSearching = false;
    _shopVisualSearchProducts = null;
    _shopVisualSearchError = '';
  }

  void _viewAllNewPostProducts() {
    _applyShopDealFilterChange(() {
      _dealSortMask = 0;
      _newPostFilterActive = true;
    });
  }

  void _viewAllFlashDealProducts() {
    _applyShopDealFilterChange(() {
      _dealSortMask = 1 << _dealFilterFlashDealsIndex;
      _newPostFilterActive = false;
    });
  }

  void _viewAllTopSellingProducts() {
    _applyShopDealFilterChange(() {
      _dealSortMask = 1 << _dealFilterTopSellingIndex;
      _newPostFilterActive = false;
    });
  }

  void _viewAllTopRatingProducts() {
    _applyShopDealFilterChange(() {
      _dealSortMask = 1 << _dealFilterTopRatingIndex;
      _newPostFilterActive = false;
    });
  }

  void _toggleNewPostFilter() {
    _applyShopDealFilterChange(() {
      _newPostFilterActive = !_newPostFilterActive;
    });
  }

  void _handleDealsTap(int index) {
    if (index == _dealFilterNewPostIndex) {
      _toggleNewPostFilter();
      return;
    }

    if (index == _dealFilterAllIndex) {
      if (_isAllDealFilter) {
        return;
      }
      // All is exclusive — clears stacked New Post / Flash / Top Selling / Top Rating.
      _applyShopDealFilterChange(() {
        _dealSortMask = 0;
        _newPostFilterActive = false;
      });
      return;
    }

    // Flash / Top Selling / Top Rating — toggle and stack (AND) with New Post.
    _applyShopDealFilterChange(() {
      _dealSortMask ^= (1 << index);
    });
  }

  void _applyShopDealFilterChange(VoidCallback mutateFilters) {
    _resetHeroImageOpacity();
    if (_showsScrollToTopButton) {
      _showsScrollToTopButton = false;
    }

    final previousKey = _shopDealFilterKey;
    final previousOffset = _shopDealSavedOffset(previousKey);
    _shopDealScrollOffsets[previousKey] = previousOffset;
    _shopDealVisibleCounts[previousKey] = _shopDashboardVisibleCount;

    final stickyHeaderWasVisible = _isShopHeaderCollapsed;
    mutateFilters();
    final nextKey = _shopDealFilterKey;

    final savedTargetOffset = _shopDealScrollOffsets[nextKey] ?? 0.0;
    final targetOffset = stickyHeaderWasVisible ? savedTargetOffset : 0.0;
    if (!stickyHeaderWasVisible) {
      _shopDealScrollOffsets[nextKey] = 0.0;
    }

    final isNonAllSort = nextKey != 0;
    // Non-All (any stacked sort / New Post) always uses the plain sticky header.
    // All keeps sticky only when restoring a past scroll past the hero.
    _shopUsesPlainSortHeader = isNonAllSort;
    final shouldCollapse = isNonAllSort ||
        (stickyHeaderWasVisible &&
            targetOffset >= _ShopPlatformHeroBackground.height);

    // Target controller must already carry the saved offset before remount.
    _replaceShopDealScrollController(nextKey, targetOffset);

    final switchGeneration = ++_shopDealSwitchGeneration;

    // Sticky visible → skeleton while past scroll remounts.
    // Sticky hidden → jump to top, no skeleton (e.g. Flash→All with little scroll).
    _shopStickyHeaderAnimateNotifier.value = false;
    final useSortRestoreSkeleton = stickyHeaderWasVisible;
    if (useSortRestoreSkeleton) {
      _shopDealSwitchReadyNotifier.value = false;
      _shopDealSwitchEpochNotifier.value++;
    }
    _shopDashboardVisibleCount =
        _shopDealVisibleCounts[nextKey] ?? _shopDealLazyLoadPageSize;
    _isShopHeaderCollapsed = shouldCollapse;
    _shopDashboardScrollOffset = targetOffset < 0 ? 0 : targetOffset;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || switchGeneration != _shopDealSwitchGeneration) {
        return;
      }
      // Only bake the tab we left — never recreate the active tab's controller.
      if (previousKey != _shopDealFilterKey) {
        _replaceShopDealScrollController(previousKey, previousOffset);
      }
      _shopStickyHeaderAnimateNotifier.value = true;
      if (useSortRestoreSkeleton) {
        _shopDealSwitchReadyNotifier.value = true;
      }

      void syncScrollChrome() {
        if (!mounted || switchGeneration != _shopDealSwitchGeneration) {
          return;
        }
        if (!_shopDealSwitchReadyNotifier.value) {
          return;
        }
        if (!_productDashboardScrollController.hasClients) {
          return;
        }
        final maxExtent =
            _productDashboardScrollController.position.maxScrollExtent;
        final clamped = targetOffset.clamp(0.0, maxExtent).toDouble();
        if ((_productDashboardScrollController.offset - clamped).abs() > 1) {
          _productDashboardScrollController.jumpTo(clamped);
        }
        _handleShopDashboardScroll(_productDashboardScrollController.offset);
      }

      if (useSortRestoreSkeleton) {
        Future<void>.delayed(const Duration(seconds: 1), syncScrollChrome);
      } else {
        syncScrollChrome();
      }
    });
  }

  Future<void> _refreshProducts({
    bool resetHero = true,
    bool includeRefreshDelay = true,
  }) async {
    if (_isRefreshingProducts) {
      return;
    }

    if (resetHero) {
      _resetHeroImageOpacity();
    }

    _isRefreshingProducts = true;
    final nextFuture = _productRepository.fetchProducts(forceRefresh: true);

    if (mounted) {
      _productsFuture = nextFuture;
    }

    try {
      if (includeRefreshDelay) {
        await Future.wait<dynamic>([
          nextFuture,
          Future<void>.delayed(const Duration(milliseconds: 650)),
        ]);
      } else {
        await nextFuture;
      }
    } catch (_) {
      // The FutureBuilder shows backend errors using the assigned future.
    } finally {
      _isRefreshingProducts = false;
    }
  }

  Future<void> _refreshHomeCompanies() async {
    final nextSellersFuture = _sellerRepository.fetchSellers(
      forceRefresh: true,
    );
    final nextStoreTypesFuture = _storeTypeRepository.fetchStoreTypes(
      forceRefresh: true,
    );
    final nextPlatformsFuture = _platformRepository.fetchPlatforms(
      forceRefresh: true,
    );

    if (mounted) {
      _sellersFuture = nextSellersFuture;
      _storeTypesFuture = nextStoreTypesFuture;
      _platformsFuture = nextPlatformsFuture;
    }

    await Future.wait<dynamic>([
      _refreshProducts(resetHero: false),
      nextSellersFuture,
      nextStoreTypesFuture,
      nextPlatformsFuture,
    ]);
    unawaited(_syncActivePlatformTheme());
  }

  Future<bool> _isPlatformBackendReachable() async {
    try {
      await _platformRepository
          .fetchPlatforms(forceRefresh: true)
          .timeout(const Duration(seconds: 3));
      return true;
    } catch (_) {
      return false;
    }
  }

  void _setPlatformRefreshSkeleton(bool value) {
    if (_platformRefreshSkeletonNotifier.value == value) return;
    _platformRefreshSkeletonNotifier.value = value;
  }

  /// Pull-to-refresh after the spinner hands off: show body skeleton (header
  /// stays), fetch up to 30s, snackbar + keep skeleton when offline.
  Future<void> _refreshHomeCompaniesFromPull() async {
    // Skeleton may already be up (shown with the wheel); don't remount it.
    if (!_platformRefreshSkeletonNotifier.value) {
      _buyerPlatformPickerKey.currentState?.prepareForPullRefresh();
      _setPlatformRefreshSkeleton(true);
    }
    try {
      await _refreshHomeCompanies().timeout(const Duration(seconds: 30));
      if (mounted) {
        _setPlatformRefreshSkeleton(false);
      }
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: 'No internet connection');
      _setPlatformRefreshSkeleton(true);
    }
  }

  Future<void> _showPlatformOfflineSkeleton() async {
    _buyerPlatformPickerKey.currentState?.prepareForPullRefresh();
    _setPlatformRefreshSkeleton(true);
  }

  void _selectBuyerPlatform(String platformId) {
    _shopFrozenListSearchQuery = '';
    _exitShopSearchMode(clearQuery: true);
    _isShopHeaderCollapsed = false;
    _resetShopDashboardScroll();
    _platformPageMovesForward = true;
    _buyerPlatform = platformId.trim().toLowerCase();
    _selectedStoreType = null;
    _isCategoriesBrowseOpen = false;
    _storeTypeCategoryFilter = 'all';
    _cancelFooterChromeRevealTimer();
    _isHomeChromeVisible = true;
    unawaited(_syncActivePlatformTheme());
    if (_isProductListingStorefront(_buyerPlatform)) {
      unawaited(CartStore.instance.setActivePlatform(_buyerPlatform));
    }
  }

  Future<void> _closeSidebarAndSelectPlatform(
    BuyerPlatformSummary platform,
  ) async {
    await Navigator.of(context).maybePop();
    if (!mounted) return;

    final lang = AppLanguagePreference.code;
    if (platform.status == 'inactive') {
      AppSnackBar.showInfo(
        context,
        message: AppBuyerLanguages.t(
          lang,
          'platform.unavailableMsg',
          params: {'name': platform.name},
        ),
      );
      return;
    }
    if (platform.comingSoon) {
      AppSnackBar.showInfo(
        context,
        message: AppBuyerLanguages.t(
          lang,
          'platform.comingSoon',
          params: {'name': platform.name},
        ),
      );
      return;
    }

    final platformId = platform.id.trim().toLowerCase();
    if (platformId == _buyerPlatform) return;
    _selectBuyerPlatform(platformId);
  }

  Future<void> _closeSidebarAndReturnHome() async {
    await Navigator.of(context).maybePop();
    if (!mounted) return;
    _clearBuyerPlatform(animateForward: true);
  }

  Future<void> _closeSidebarAndOpenCategories() async {
    await Navigator.of(context).maybePop();
    if (!mounted) return;

    final platformId = _buyerPlatform.trim().toLowerCase();
    if (!_isProductListingStorefront(platformId)) {
      return;
    }

    // Stay inside the shop Scaffold so the left nav can open on Categories.
    _platformPageMovesForward = true;
    _selectedStoreType = null;
    _isCategoriesBrowseOpen = true;
  }

  void _closeCategoriesBrowse() {
    if (!_isCategoriesBrowseOpen) return;
    _platformPageMovesForward = false;
    _isCategoriesBrowseOpen = false;
  }

  void _selectShopStoreType(StoreTypeSummary storeType) {
    _platformPageMovesForward = true;
    _selectedStoreType = storeType;
    _isCategoriesBrowseOpen = false;
    _storeTypeCategoryFilter = 'all';
    _cancelFooterChromeRevealTimer();
    _isHomeChromeVisible = true;
  }

  void _clearShopStoreType() {
    _platformPageMovesForward = false;
    _selectedStoreType = null;
    _storeTypeCategoryFilter = 'all';
  }

  void _clearBuyerPlatform({bool animateForward = false}) {
    _releaseBuyerPlatformLayerScrollControllers(_buyerPlatform);
    _shopFrozenListSearchQuery = '';
    _exitShopSearchMode(clearQuery: true);
    _isShopHeaderCollapsed = false;
    _resetShopDashboardScroll();
    _platformPageMovesForward = animateForward;
    _buyerPlatform = _kBuyerPlatformNone;
    _selectedStoreType = null;
    _isCategoriesBrowseOpen = false;
    _storeTypeCategoryFilter = 'all';
    PlatformThemeSync.instance.clear();
  }

  Future<void> _syncActivePlatformTheme() async {
    final platformId = _buyerPlatform.trim().toLowerCase();
    if (platformId.isEmpty || platformId == _kBuyerPlatformNone) {
      PlatformThemeSync.instance.clear();
      return;
    }

    const fallbackColors = <String, String>{
      'shop': '#2563eb',
      'food': '#ea580c',
      'hotels': '#7c3aed',
      'resort': '#0891b2',
    };

    try {
      final platforms = await _platformsFuture;
      BuyerPlatformSummary? match;
      for (final platform in platforms) {
        if (platform.id == platformId) {
          match = platform;
          break;
        }
      }
      final hex = (match?.primaryColor.trim().isNotEmpty ?? false)
          ? match!.primaryColor
          : (fallbackColors[platformId] ?? '');
      if (hex.isEmpty) {
        PlatformThemeSync.instance.clear();
        return;
      }
      PlatformThemeSync.instance.setPlatformPrimaryHex(hex);
    } catch (_) {
      final fallback = fallbackColors[platformId];
      if (fallback == null) {
        PlatformThemeSync.instance.clear();
        return;
      }
      PlatformThemeSync.instance.setPlatformPrimaryHex(fallback);
    }
  }

  void _startProductAutoRefresh() {
    _productAutoRefreshTimer?.cancel();
    _productAutoRefreshTimer = Timer.periodic(_productAutoRefreshInterval, (_) {
      final platformPickerSearchIsActive =
          _buyerPlatformPickerKey.currentState?._isSearchActive ?? false;
      if (_isShopSearchMode || platformPickerSearchIsActive) {
        return;
      }
      unawaited(_refreshProducts(resetHero: false, includeRefreshDelay: false));
    });
  }

  Future<void> _refreshChats() async {
    if (_isRefreshingChats) {
      return;
    }

    _isRefreshingChats = true;
    try {
      await ChatSupportStore.instance.refreshThreadsFromServer();
    } finally {
      _isRefreshingChats = false;
    }
  }

  void _startChatAutoRefresh() {
    _chatAutoRefreshTimer?.cancel();
    unawaited(_refreshChats());
    _chatAutoRefreshTimer = Timer.periodic(_chatAutoRefreshInterval, (_) {
      unawaited(_refreshChats());
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshProducts(resetHero: false, includeRefreshDelay: false);
      unawaited(_refreshChats());
      unawaited(DeviceSessionGuard.checkOnce());
    }
  }

  @override
  void didChangeMetrics() {
    final view = WidgetsBinding.instance.platformDispatcher.views.first;
    final nextBottomInset = view.viewInsets.bottom / view.devicePixelRatio;
    final wasKeyboardVisible = _lastKeyboardBottomInset > 1;
    final isKeyboardHidden = nextBottomInset <= 1;
    _lastKeyboardBottomInset = nextBottomInset;

    if (wasKeyboardVisible && isKeyboardHidden) {
      FocusManager.instance.primaryFocus?.unfocus();
    }
  }

  void _handleDrawerChanged(bool isOpened) {
    if (!mounted) {
      return;
    }

    _isDrawerOpen = isOpened;

    if (isOpened) {
      _showDrawerSystemBarsOverlay();
    } else {
      _removeDrawerSystemBarsOverlay();
    }

    if (!isOpened && _selectedHeaderAction == _HeaderAction.menu) {
      _selectedHeaderAction = null;
    }
  }

  void _showDrawerSystemBarsOverlay() {
    _removeDrawerSystemBarsOverlay(restoreSystemStyle: false);

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final overlayStyle = BuyerRightPanelHost.transparentOverlayStyle(
      isDark: isDark,
    );
    SystemChrome.setSystemUIOverlayStyle(overlayStyle);

    final overlay = Overlay.of(context, rootOverlay: true);
    final entry = OverlayEntry(
      builder: (overlayContext) {
        final padding = MediaQuery.paddingOf(overlayContext);
        return IgnorePointer(
          child: AnnotatedRegion<SystemUiOverlayStyle>(
            value: overlayStyle,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (padding.top > 0)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: padding.top,
                    child: const ColoredBox(
                      color: BuyerRightPanelHost.statusBarOverlayColor,
                    ),
                  ),
                if (padding.bottom > 0)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: padding.bottom,
                    child: const ColoredBox(
                      color: BuyerRightPanelHost.navigationBarOverlayColor,
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );

    _drawerSystemBarsOverlay = entry;
    overlay.insert(entry);
  }

  void _removeDrawerSystemBarsOverlay({bool restoreSystemStyle = true}) {
    final entry = _drawerSystemBarsOverlay;
    _drawerSystemBarsOverlay = null;
    if (entry != null) {
      entry.remove();
      entry.dispose();
    }

    if (!restoreSystemStyle || !mounted) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    SystemChrome.setSystemUIOverlayStyle(
      BuyerRightPanelHost.transparentOverlayStyle(isDark: isDark),
    );
  }

  void _cancelFooterChromeRevealTimer() {
    _footerChromeRevealTimer?.cancel();
    _footerChromeRevealTimer = null;
  }

  /// Hides the footer on scroll-down; shows it again only on scroll-up (or at top).
  void _updateFooterChromeFromScroll(double offset) {
    final scrollDelta = offset - _lastHomeCompanyScrollOffset;
    const directionThreshold = 2.0;

    if (offset <= 2) {
      _cancelFooterChromeRevealTimer();
      _isHomeChromeVisible = true;
    } else if (scrollDelta > directionThreshold) {
      // Scrolling down → slide nav bar away. No auto-reveal while still down.
      _cancelFooterChromeRevealTimer();
      _isHomeChromeVisible = false;
    } else if (scrollDelta < -directionThreshold) {
      // Scrolling up → bring nav bar back.
      _cancelFooterChromeRevealTimer();
      _isHomeChromeVisible = true;
    }

    _lastHomeCompanyScrollOffset = offset;
  }

  void _handleHomeCompanyListScroll(double offset) {
    final nextOpacity = (1 - (offset / 180)).clamp(0.0, 1.0).toDouble();
    _updateFooterChromeFromScroll(offset);

    if ((_heroImageOpacityNotifier.value - nextOpacity).abs() >= 0.01) {
      _heroImageOpacityNotifier.value = nextOpacity;
    }
  }

  void _handleShopDashboardScroll(double offset) {
    // Freeze while sort-restore skeleton is up so a transient 0 doesn't
    // wipe the saved All/New Post offset or header state.
    if (!_shopDealSwitchReadyNotifier.value) {
      return;
    }
    final nextOffset = offset < 0 ? 0.0 : offset;
    _shopDashboardScrollOffset = nextOffset;
    _shopDealScrollOffsets[_shopDealFilterKey] = nextOffset;
    final shouldShowScrollToTopButton = nextOffset > 180;
    final forcePlainStickyHeader =
        !_isAllDealFilter && _shopUsesPlainSortHeader;
    final crossedHeroThreshold = _isShopHeaderCollapsed
        ? nextOffset > _ShopPlatformHeroBackground.height - 16
        : nextOffset >= _ShopPlatformHeroBackground.height;
    final shouldCollapseShopHeader =
        forcePlainStickyHeader || crossedHeroThreshold;

    if (_showsScrollToTopButton != shouldShowScrollToTopButton) {
      _showsScrollToTopButton = shouldShowScrollToTopButton;
    }
    if (_isShopHeaderCollapsed != shouldCollapseShopHeader) {
      _isShopHeaderCollapsed = shouldCollapseShopHeader;
    }
    _updateFooterChromeFromScroll(nextOffset);
  }

  void _syncShopDashboardScrollChrome() {
    if (!_productDashboardScrollController.hasClients) {
      return;
    }
    _handleShopDashboardScroll(_productDashboardScrollController.offset);
  }

  void _handleHomeBottomOverscroll() {
    if (!mounted) {
      return;
    }

    _homeBottomOverscrollSignal = _homeBottomOverscrollSignal + 1;
  }

  Future<void> _scrollDashboardToTop() async {
    if (!_productDashboardScrollController.hasClients) {
      return;
    }

    await _productDashboardScrollController.animateTo(
      0,
      duration: appMotionFrames(19),
      curve: Curves.easeOutCubic,
    );
  }

  void _resetHeroImageOpacity() {
    if (_heroImageOpacityNotifier.value == 1) {
      return;
    }

    _heroImageOpacityNotifier.value = 1;
  }

  Future<bool> _handleDeviceBackPress() async {
    if (_isShopSearchMode) {
      final keyboardIsVisible =
          MediaQuery.viewInsetsOf(context).bottom > 1 ||
          _lastKeyboardBottomInset > 1;

      if (keyboardIsVisible) {
        dismissAppKeyboard();
        return false;
      }

      _exitShopSearchMode(clearQuery: true);
      return false;
    }

    final platformPickerState = _buyerPlatformPickerKey.currentState;
    if (platformPickerState?._isSearchActive ?? false) {
      final keyboardIsVisible =
          MediaQuery.viewInsetsOf(context).bottom > 1 ||
          _lastKeyboardBottomInset > 1;

      if (keyboardIsVisible) {
        // First device-back only dismisses the keyboard. Search mode stays open.
        dismissAppKeyboard();
        return false;
      }

      // Once the keyboard is already hidden, the next back exits search mode.
      platformPickerState!._cancelSearch();
      return false;
    }

    if (_isDrawerOpen) {
      Navigator.of(context).pop();
      return false;
    }

    // Popup menus (e.g. Categories sort), dialogs, and pushed pages must
    // dismiss first — otherwise WillPopScope skips them and jumps Home.
    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      navigator.pop();
      return false;
    }

    if (_selectedIndex == 0) {
      if (_isCategoriesBrowseOpen) {
        _closeCategoriesBrowse();
        return false;
      }
      if (_selectedStoreType != null) {
        _clearShopStoreType();
        return false;
      }
      if (_buyerPlatform != _kBuyerPlatformNone) {
        _clearBuyerPlatform();
        return false;
      }
    }

    if (_selectedIndex == 4 && _isFavoritesSearching) {
      _resetFavoritesSearch();
      return false;
    }

    if (_tabHistory.length > 1) {
      _tabHistory.removeLast();
      _navigateToTab(_tabHistory.last, addToHistory: false);
      return false;
    }

    final now = DateTime.now();
    if (_lastBackPressAt == null ||
        now.difference(_lastBackPressAt!) > _exitBackPressWindow) {
      _lastBackPressAt = now;
      AppSnackBar.showError(context, message: 'Please tap again to exit.');
      return false;
    }

    return true;
  }

  @override
  void dispose() {
    DeviceSessionGuard.stop();
    _removeDrawerSystemBarsOverlay(restoreSystemStyle: false);
    WidgetsBinding.instance.removeObserver(this);
    ChatSupportStore.instance.incomingSupportEventNotifier.removeListener(
      _handleIncomingSupportEvent,
    );
    _chatAutoRefreshTimer?.cancel();
    _newMessagePopupTimer?.cancel();
    _productAutoRefreshTimer?.cancel();
    OrderTabNavigation.instance.requestNotifier.removeListener(
      _handleOrderTabNavigationRequest,
    );
    for (final controller in _shopDealScrollControllers.values) {
      controller.dispose();
    }
    _shopDealScrollControllers.clear();
    for (final controller in _buyerLayerScrollControllers.values) {
      controller.dispose();
    }
    _buyerLayerScrollControllers.clear();
    _favoritesSearchController.dispose();
    _favoritesSearchFocusNode.dispose();
    _shopSearchCloseGuard?.cancel();
    _shopLiveSearchFilterSkeletonTimer?.cancel();
    _shopSearchController.dispose();
    _shopSearchFocusNode.removeListener(_onShopSearchFocusChanged);
    _shopSearchFocusNode.dispose();
    _heroImageOpacityNotifier.dispose();
    _productsFutureNotifier.dispose();
    _sellersFutureNotifier.dispose();
    _storeTypesFutureNotifier.dispose();
    _platformsFutureNotifier.dispose();
    _buyerPlatformNotifier.dispose();
    _selectedStoreTypeNotifier.dispose();
    _categoriesBrowseOpenNotifier.dispose();
    _storeTypeCategoryFilterNotifier.dispose();
    _isFavoritesSearchingNotifier.dispose();
    _showsNewMessagePopupNotifier.dispose();
    _showsScrollToTopButtonNotifier.dispose();
    _cancelFooterChromeRevealTimer();
    _isHomeChromeVisibleNotifier.dispose();
    _homePickerSearchActiveNotifier.dispose();
    _favoritesSearchQueryNotifier.dispose();
    _selectedIndexNotifier.dispose();
    _selectedOrderStageIndexNotifier.dispose();
    _dealSortMaskNotifier.dispose();
    _newPostFilterActiveNotifier.dispose();
    _homeBottomOverscrollSignalNotifier.dispose();
    _selectedHeaderActionNotifier.dispose();
    _isShopVisualSearchingNotifier.dispose();
    _shopVisualSearchProductsNotifier.dispose();
    _shopVisualSearchErrorNotifier.dispose();
    _shopSearchQueryNotifier.dispose();
    _isShopSearchModeNotifier.dispose();
    _isShopHeaderCollapsedNotifier.dispose();
    _shopStickyHeaderAnimateNotifier.dispose();
    _shopDealSwitchEpochNotifier.dispose();
    _shopDealSwitchReadyNotifier.dispose();
    _platformRefreshSkeletonNotifier.dispose();
    PlatformThemeSync.instance.clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _handleDeviceBackPress,
      child: Scaffold(
        key: _scaffoldKey,
        resizeToAvoidBottomInset: false,
        backgroundColor: _dashboardForegroundColor,
        drawer: AnimatedBuilder(
          animation: Listenable.merge([
            _buyerPlatformNotifier,
            _selectedStoreTypeNotifier,
            _categoriesBrowseOpenNotifier,
            _platformsFutureNotifier,
          ]),
          builder: (context, child) {
            if (_isShopPlatformStorefront(_buyerPlatform) &&
                _selectedStoreType == null) {
              return _SwitchShopPlatformSidebar(
                platformsFuture: _platformsFuture,
                activePlatformId: _buyerPlatform,
                categoriesSelected: _isCategoriesBrowseOpen,
                primaryColor: _primaryColor,
                titleColor: _titleColor,
                secondaryColor: _secondaryColor,
                surfaceColor: _dashboardForegroundColor,
                onClose: () => Navigator.of(context).maybePop(),
                onHomeTap: () => unawaited(_closeSidebarAndReturnHome()),
                onCategoriesTap: () {
                  if (_isCategoriesBrowseOpen) {
                    Navigator.of(context).maybePop();
                    return;
                  }
                  unawaited(_closeSidebarAndOpenCategories());
                },
                onSelectPlatform: (platform) =>
                    unawaited(_closeSidebarAndSelectPlatform(platform)),
              );
            }

            return DrawableListView(
              userFirstName: _profileFirstName,
              userLastName: _profileLastName,
              userEmail: _profileEmail,
            );
          },
        ),
        onDrawerChanged: _handleDrawerChanged,
        body: Stack(
          children: [
            Positioned.fill(
              child: AnimatedBuilder(
                animation: Listenable.merge([
                  _selectedIndexNotifier,
                  _buyerPlatformNotifier,
                  _homePickerSearchActiveNotifier,
                ]),
                builder: (context, child) {
                  final selectedIndex = _selectedIndexNotifier.value;
                  // Shared Switch site header for Home picker ↔ Activity
                  // (no tab-switch animation — Instant IndexedStack swap).
                  final pinSiteHeader =
                      selectedIndex == 2 ||
                      (selectedIndex == 0 &&
                          _buyerPlatform == _kBuyerPlatformNone &&
                          !_homePickerSearchActiveNotifier.value);

                  final tabStack = IndexedStack(
                    index: _mainTabStackIndex(selectedIndex),
                    sizing: StackFit.expand,
                    children: [
                      _buildHomeMainArea(
                        omitSiteHeader: selectedIndex == 0 &&
                            _buyerPlatform == _kBuyerPlatformNone,
                      ),
                      SafeArea(
                        // Shared/overlaid site header already clears the top.
                        top: false,
                        bottom: false,
                        child: Padding(
                          // Match overlaid _SwitchSiteHeader height (status + row).
                          padding: EdgeInsets.only(
                            top: MediaQuery.paddingOf(context).top + 56,
                          ),
                          child: _buildNonHomeMainArea(
                            2,
                            includeHeader: false,
                          ),
                        ),
                      ),
                      SafeArea(
                        bottom: false,
                        child: _buildNonHomeMainArea(4),
                      ),
                    ],
                  );

                  // Overlay shared transparent header on the tab body.
                  final content = Stack(
                    fit: StackFit.expand,
                    children: [
                      tabStack,
                      if (pinSiteHeader)
                        Positioned(
                          top: 0,
                          left: 0,
                          right: 0,
                          // Transparent — dashboard wash shows through.
                          // _SwitchSiteHeader already pads for the status bar.
                          child: _buildActivitySwitchHeader(),
                        ),
                    ],
                  );

                  final isDark =
                      Theme.of(context).brightness == Brightness.dark;
                  final isInsidePlatform =
                      selectedIndex == 0 &&
                      _buyerPlatform != _kBuyerPlatformNone;
                  // Platform storefront: keep device nav bar fully transparent
                  // (Android otherwise paints a contrast scrim over transparent).
                  final systemUi = SystemUiOverlayStyle(
                    statusBarColor: Colors.transparent,
                    statusBarIconBrightness: isDark
                        ? Brightness.light
                        : Brightness.dark,
                    statusBarBrightness: isDark
                        ? Brightness.dark
                        : Brightness.light,
                    systemNavigationBarColor: Colors.transparent,
                    systemNavigationBarDividerColor: Colors.transparent,
                    systemNavigationBarContrastEnforced: !isInsidePlatform
                        ? null
                        : false,
                    systemNavigationBarIconBrightness: isDark
                        ? Brightness.light
                        : Brightness.dark,
                  );
                  return AnnotatedRegion<SystemUiOverlayStyle>(
                    value: systemUi,
                    child: content,
                  );
                },
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: AnimatedBuilder(
                animation: Listenable.merge([
                  _selectedIndexNotifier,
                  _buyerPlatformNotifier,
                  _isHomeChromeVisibleNotifier,
                  GuestSession.isGuestNotifier,
                ]),
                builder: (context, child) {
                  final selectedIndex = _selectedIndex;
                  final usesAutoHideChrome = selectedIndex == 0;
                  final isInsidePlatform =
                      selectedIndex == 0 &&
                      _buyerPlatform != _kBuyerPlatformNone;
                  final isVisible =
                      !isInsidePlatform &&
                      (!usesAutoHideChrome || _isHomeChromeVisible);
                  final isGuestMode = _isGuestMode;

                  return isGuestMode
                      ? _GuestAuthFooter(
                          primaryColor: _primaryColor,
                          onLogin: _openGuestLoginPage,
                          onSignUp: _openGuestSignUpPage,
                          onHelpCentre: _openGuestHelpCentre,
                        )
                      : _FooterVisibilityTransition(
                          visible: isVisible,
                          child: _FooterSection(
                            backgroundColor: _fieldBackgroundColor,
                            activeColor: _primaryColor,
                            inactiveColor: _secondaryColor,
                            selectedIndex: selectedIndex,
                            onTap: _handleNavigationTap,
                          ),
                        );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlatformPageTransition({
    required String transitionKey,
    required Widget child,
  }) {
    return _PlatformPageTurnTransition(
      transitionKey: transitionKey,
      forward: _platformPageMovesForward,
      duration: appPageTransitionDuration,
      backgroundColor: _dashboardForegroundColor,
      child: child,
    );
  }

  Widget _buildHomeMainArea({bool omitSiteHeader = false}) {
    return _buildHomeMainAreaContent(omitSiteHeader: omitSiteHeader);
  }

  Widget _buildHomeMainAreaContent({bool omitSiteHeader = false}) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _buyerPlatformNotifier,
        _selectedStoreTypeNotifier,
        _categoriesBrowseOpenNotifier,
        _storeTypeCategoryFilterNotifier,
        _storeTypesFutureNotifier,
        _platformsFutureNotifier,
        _productsFutureNotifier,
        _sellersFutureNotifier,
        _selectedHeaderActionNotifier,
        _showsNewMessagePopupNotifier,
        _heroImageOpacityNotifier,
        _isHomeChromeVisibleNotifier,
        _platformRefreshSkeletonNotifier,
      ]),
      builder: (context, child) {
        final platformId = _buyerPlatform;
        final selectedStoreType = _selectedStoreType;

        if (platformId == _kBuyerPlatformNone) {
          final accountName = [
            _profileFirstName.trim(),
            _profileLastName.trim(),
          ].where((part) => part.isNotEmpty).join(' ');
          return _buildPlatformPageTransition(
            transitionKey: 'picker',
            child: _BuyerPlatformPicker(
              key: _buyerPlatformPickerKey,
              platformsFuture: _platformsFuture,
              storeTypesFuture: _storeTypesFuture,
              sellersFuture: _sellersFuture,
              productsFuture: _productsFuture,
              catalogScrollController: _buyerLayerScrollController(
                'layer:picker',
              ),
              onScrollOffsetChanged: _updateFooterChromeFromScroll,
              backgroundColor: _dashboardForegroundColor,
              surfaceColor: _fieldBackgroundColor,
              titleColor: _titleColor,
              secondaryColor: _secondaryColor,
              primaryColor: _primaryColor,
              isLoggedIn: !_isGuestMode,
              accountName: accountName.isEmpty ? 'Account' : accountName,
              accountInitials: _buyerAccountInitials(
                firstName: _profileFirstName,
                lastName: _profileLastName,
                email: _profileEmail,
              ),
              accountImageUrl: _profileImageUrl,
              showRefreshSkeleton: _platformRefreshSkeletonNotifier.value,
              showSiteHeader: !omitSiteHeader,
              onSearchModeChanged: (active) {
                if (_homePickerSearchActiveNotifier.value == active) return;
                _homePickerSearchActiveNotifier.value = active;
              },
              onRefresh: _refreshHomeCompaniesFromPull,
              onSearchRefresh: _refreshPlatformPickerSearchQuietly,
              onConnectivityCheck: _isPlatformBackendReachable,
              onOfflineSkeleton: _showPlatformOfflineSkeleton,
              onSelect: (platform) {
                final lang = AppLanguagePreference.code;
                if (platform.status == 'inactive') {
                  AppSnackBar.showInfo(
                    context,
                    message: AppBuyerLanguages.t(
                      lang,
                      'platform.unavailableMsg',
                      params: {'name': platform.name},
                    ),
                  );
                  return;
                }
                if (platform.comingSoon) {
                  AppSnackBar.showInfo(
                    context,
                    message: AppBuyerLanguages.t(
                      lang,
                      'platform.comingSoon',
                      params: {'name': platform.name},
                    ),
                  );
                  return;
                }
                _selectBuyerPlatform(platform.id);
              },
              onSearchSubmitted: _handleGlobalBuyerSearch,
              onLiveSearchHit: _handleBuyerLiveSearchHit,
              onNotificationTap: () => unawaited(_openNotificationsPanel()),
              onAccountTap: () => unawaited(_openAccountSettingsPanel()),
            ),
          );
        }

        if (selectedStoreType == null) {
          return _buildPlatformPageTransition(
            transitionKey: _isCategoriesBrowseOpen
                ? 'categories-$platformId'
                : 'platform-$platformId',
            child: FutureBuilder<List<BuyerPlatformSummary>>(
              future: _platformsFuture,
              builder: (context, snapshot) {
                final platforms = snapshot.data ?? _defaultBuyerPlatforms();
                BuyerPlatformSummary? match;
                for (final item in platforms) {
                  if (item.id == platformId) {
                    match = item;
                    break;
                  }
                }
                final title = match?.name ?? platformId;

                // Shop / Food platforms: branded hero + platform-scoped product search.
                if (_isProductListingStorefront(platformId)) {
                  final accountName = [
                    _profileFirstName.trim(),
                    _profileLastName.trim(),
                  ].where((part) => part.isNotEmpty).join(' ');
                  final platformLabel = match?.name.trim().isNotEmpty == true
                      ? match!.name.trim()
                      : (platformId == 'food' ? 'Food' : 'Shop');

                  if (_isCategoriesBrowseOpen) {
                    return CategoriesOverviewPage(
                      platformId: platformId,
                      platformName: platformLabel,
                      primaryColor: _primaryColor,
                      storeTypesFuture: _storeTypesFuture,
                      productsFuture: _resolveShopListingProducts(
                        platformIdFilter: platformId,
                      ),
                      onMenuTap: () =>
                          _handleHeaderAction(_HeaderAction.menu),
                    );
                  }

                  final isFoodPlatform = platformId == 'food';
                  final isShopPlatform = platformId == 'shop';
                  final showAddressInHeader = isFoodPlatform || isShopPlatform;
                  if (showAddressInHeader) {
                    unawaited(
                      BuyerDeliveryAddressStore.instance.ensureLoaded(),
                    );
                  }
                  return _buildShopDashboardBody(
                    platformIdFilter: platformId,
                    platformName: platformLabel,
                    showProductShowcase: true,
                    showcaseOverlayHeader: _ShopShowcaseOverlayHeaderData(
                      accountName: accountName.isEmpty
                          ? 'Account'
                          : accountName,
                      accountInitials: _buyerAccountInitials(
                        firstName: _profileFirstName,
                        lastName: _profileLastName,
                        email: _profileEmail,
                      ),
                      accountImageUrl: _profileImageUrl,
                      selectedAction: _selectedHeaderAction,
                      onMenuTap: () => _handleHeaderAction(_HeaderAction.menu),
                      onNotificationTap: () =>
                          _handleHeaderAction(_HeaderAction.notification),
                      onCartTap: () => _handleHeaderAction(_HeaderAction.cart),
                      searchController: _shopSearchController,
                      searchFocusNode: _shopSearchFocusNode,
                      searchHintText: 'Search in $platformLabel',
                      isSearchModeListenable: _isShopSearchModeNotifier,
                      onSearchChanged: _handleShopSearchChanged,
                      onSearchClear: () => _clearShopSearch(),
                      onSearchSubmitted: _submitShopSearch,
                      onSearchCancel: () =>
                          _exitShopSearchMode(clearQuery: true),
                      onSearchBackHold: _holdShopSearchBack,
                      onAccountTap: () =>
                          unawaited(_openAccountSettingsPanel()),
                      showDeliveryLocation: showAddressInHeader,
                      deliveryLocationTitle: isShopPlatform
                          ? 'What is your address?'
                          : 'Where to deliver?',
                      onDeliveryLocationTap: showAddressInHeader
                          ? () => unawaited(_openFoodDeliveryLocationPicker())
                          : null,
                      useFoodCartIcon: isFoodPlatform,
                    ),
                  );
                }

                return _wrapWithPlatformActivityRail(
                  platformId: platformId,
                  child: Column(
                    children: [
                      _ShopLayerAppBar(
                        title: 'Switch × $title',
                        onBack: _clearBuyerPlatform,
                        titleColor: _titleColor,
                        secondaryColor: _secondaryColor,
                        surfaceColor: _fieldBackgroundColor,
                      ),
                      Expanded(
                        child: _ShopBusinessTypesPage(
                          platformId: platformId,
                          storeTypesFuture: _storeTypesFuture,
                          scrollController: _buyerLayerScrollController(
                            'layer:types:$platformId',
                          ),
                          backgroundColor: _dashboardForegroundColor,
                          surfaceColor: _fieldBackgroundColor,
                          titleColor: _titleColor,
                          secondaryColor: _secondaryColor,
                          primaryColor: _primaryColor,
                          onRefresh: _refreshHomeCompanies,
                          onSelect: _selectShopStoreType,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        }

        final storeType = selectedStoreType;
        final categories = storeType.categories;

        return _buildPlatformPageTransition(
          transitionKey: 'store-$platformId-${storeType.name}',
          child: _wrapWithPlatformActivityRail(
            platformId: _buyerPlatform,
            child: Column(
              children: [
                _ShopLayerAppBar(
                  title: storeType.name,
                  onBack: _clearShopStoreType,
                  titleColor: _titleColor,
                  secondaryColor: _secondaryColor,
                  surfaceColor: _fieldBackgroundColor,
                ),
                if (categories.isNotEmpty)
                  _ShopCategoryChipBar(
                    categories: categories,
                    selected: _storeTypeCategoryFilter,
                    primaryColor: _primaryColor,
                    secondaryColor: _secondaryColor,
                    surfaceColor: _fieldBackgroundColor,
                    onSelect: (value) {
                      _storeTypeCategoryFilter = value;
                    },
                  ),
                Expanded(
                  child: _HomeCompaniesPage(
                    sellersFuture: _sellersFuture,
                    productsFuture: _productsFuture,
                    scrollController: _buyerLayerScrollController(
                      'layer:companies:$platformId:${storeType.name}',
                    ),
                    backgroundColor: _dashboardForegroundColor,
                    surfaceColor: _fieldBackgroundColor,
                    titleColor: _titleColor,
                    secondaryColor: _secondaryColor,
                    primaryColor: _primaryColor,
                    onRefresh: _refreshHomeCompanies,
                    onScrollOffsetChanged: _handleHomeCompanyListScroll,
                    storeTypeFilter: storeType.name,
                    categoryFilter: _storeTypeCategoryFilter == 'all'
                        ? null
                        : _storeTypeCategoryFilter,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<List<Product>> _resolveShopListingProducts({
    required String? platformIdFilter,
    List<Product>? visualSearchProducts,
  }) {
    final platformId = platformIdFilter?.trim().toLowerCase() ?? '';

    if (visualSearchProducts != null) {
      if (platformId.isEmpty) {
        return Future<List<Product>>.value(visualSearchProducts);
      }
      final storeTypesFuture = _storeTypesFuture;
      final sellersFuture = _sellersFuture;
      return () async {
        final storeTypes = await storeTypesFuture;
        final sellers = await sellersFuture;
        return app_search.filterProductsForBuyerPlatform(
          products: visualSearchProducts,
          storeTypes: storeTypes,
          sellers: sellers,
          platformId: platformId,
        );
      }();
    }

    if (platformId.isEmpty) {
      return _productsFuture;
    }

    if (_cachedShopListingProductsFuture != null &&
        _cachedShopListingPlatformId == platformId &&
        identical(_cachedShopListingProductsSource, _productsFuture) &&
        identical(_cachedShopListingStoreTypesSource, _storeTypesFuture) &&
        identical(_cachedShopListingSellersSource, _sellersFuture)) {
      return _cachedShopListingProductsFuture!;
    }

    final productsFuture = _productsFuture;
    final storeTypesFuture = _storeTypesFuture;
    final sellersFuture = _sellersFuture;
    final resolved = () async {
      final products = await productsFuture;
      final storeTypes = await storeTypesFuture;
      final sellers = await sellersFuture;
      return app_search.filterProductsForBuyerPlatform(
        products: products,
        storeTypes: storeTypes,
        sellers: sellers,
        platformId: platformId,
      );
    }();

    _cachedShopListingPlatformId = platformId;
    _cachedShopListingProductsSource = productsFuture;
    _cachedShopListingStoreTypesSource = storeTypesFuture;
    _cachedShopListingSellersSource = sellersFuture;
    _cachedShopListingProductsFuture = resolved;
    return resolved;
  }

  Future<_BuyerLiveSearchCatalog> _resolveShopLiveSearchCatalog({
    required String platformId,
  }) {
    final productsFuture = _resolveShopListingProducts(
      platformIdFilter: platformId,
    );
    final token = (
      platformId.trim().toLowerCase(),
      productsFuture,
      _platformsFuture,
      _storeTypesFuture,
      _sellersFuture,
    );
    if (_cachedShopLiveSearchCatalogFuture != null &&
        _cachedShopLiveSearchCatalogToken == token) {
      return _cachedShopLiveSearchCatalogFuture!;
    }

    final platformsFuture = _platformsFuture;
    final storeTypesFuture = _storeTypesFuture;
    final sellersFuture = _sellersFuture;
    final resolved = () async {
      List<BuyerPlatformSummary> platforms;
      try {
        platforms = await platformsFuture;
      } catch (_) {
        platforms = _defaultBuyerPlatforms();
      }
      List<StoreTypeSummary> storeTypes;
      try {
        storeTypes = await storeTypesFuture;
      } catch (_) {
        storeTypes = const <StoreTypeSummary>[];
      }
      List<SellerSummary> sellers;
      try {
        sellers = await sellersFuture;
      } catch (_) {
        sellers = const <SellerSummary>[];
      }
      List<Product> products;
      try {
        products = await productsFuture;
      } catch (_) {
        products = const <Product>[];
      }
      return _BuyerLiveSearchCatalog(
        platforms: platforms.isEmpty ? _defaultBuyerPlatforms() : platforms,
        storeTypes: storeTypes,
        sellers: sellers,
        products: products,
      );
    }();

    _cachedShopLiveSearchCatalogToken = token;
    _cachedShopLiveSearchCatalogFuture = resolved;
    return resolved;
  }

  Future<void> _refreshShopLiveSearch({required String platformId}) async {
    // Search-only refresh: do not run home pull/company refresh.
    // Clear caches + setState first so the results panel flips to skeleton
    // as soon as pull-refresh starts.
    _cachedShopLiveSearchCatalogFuture = null;
    _cachedShopLiveSearchCatalogToken = null;
    _cachedShopListingProductsFuture = null;
    _cachedShopListingPlatformId = null;
    _cachedShopListingProductsSource = null;
    _cachedShopListingStoreTypesSource = null;
    _cachedShopListingSellersSource = null;

    unawaited(fetchSearchResultVouchers(forceRefresh: true));

    final nextProducts = _productRepository.fetchProducts(forceRefresh: true);
    final nextSellers = _sellerRepository.fetchSellers(forceRefresh: true);
    final nextStoreTypes = _storeTypeRepository.fetchStoreTypes(
      forceRefresh: true,
    );
    final nextPlatforms = _platformRepository.fetchPlatforms(
      forceRefresh: true,
    );

    if (mounted) {
      _productsFuture = nextProducts;
      _sellersFuture = nextSellers;
      _storeTypesFuture = nextStoreTypes;
      _platformsFuture = nextPlatforms;
      setState(() {});
    }

    await Future.wait<dynamic>([
      nextProducts,
      nextSellers,
      nextStoreTypes,
      nextPlatforms,
    ]);
    if (!mounted) return;
    await _resolveShopLiveSearchCatalog(platformId: platformId);
    if (mounted) setState(() {});
  }

  Future<void> _refreshPlatformPickerSearchQuietly() async {
    unawaited(fetchSearchResultVouchers(forceRefresh: true));
    final nextProducts = _productRepository.fetchProducts(forceRefresh: true);
    final nextSellers = _sellerRepository.fetchSellers(forceRefresh: true);
    final nextStoreTypes = _storeTypeRepository.fetchStoreTypes(
      forceRefresh: true,
    );
    final nextPlatforms = _platformRepository.fetchPlatforms(
      forceRefresh: true,
    );
    if (mounted) {
      _productsFuture = nextProducts;
      _sellersFuture = nextSellers;
      _storeTypesFuture = nextStoreTypes;
      _platformsFuture = nextPlatforms;
    }
    await Future.wait<dynamic>([
      nextProducts,
      nextSellers,
      nextStoreTypes,
      nextPlatforms,
    ]);
  }

  void _viewAllHomeCategories() {
    _platformPageMovesForward = true;
    _selectedStoreType = null;
    _isCategoriesBrowseOpen = true;
  }

  Widget _buildShopDashboardBody({
    String? platformIdFilter,
    String platformName = '',
    bool showProductShowcase = false,
    _ShopShowcaseOverlayHeaderData? showcaseOverlayHeader,
  }) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _productsFutureNotifier,
        _storeTypesFutureNotifier,
        _sellersFutureNotifier,
        _platformsFutureNotifier,
        _dealSortMaskNotifier,
        _newPostFilterActiveNotifier,
        _isShopHeaderCollapsedNotifier,
        _shopDealSwitchEpochNotifier,
        _shopDealSwitchReadyNotifier,
        _homeBottomOverscrollSignalNotifier,
        _showsScrollToTopButtonNotifier,
        _isShopVisualSearchingNotifier,
        _shopVisualSearchProductsNotifier,
        _shopVisualSearchErrorNotifier,
        _shopSearchQueryNotifier,
        _isShopSearchModeNotifier,
        _selectedHeaderActionNotifier,
      ]),
      builder: (context, child) {
        final platformId = (platformIdFilter ?? '').trim().toLowerCase();
        final hasVisualSearchResults = _shopVisualSearchProducts != null;
        final visualSearchProducts = _shopVisualSearchProducts;
        final productsFuture = _resolveShopListingProducts(
          platformIdFilter: platformIdFilter,
          visualSearchProducts: hasVisualSearchResults
              ? (visualSearchProducts ?? const <Product>[])
              : null,
        );

        final draftQuery = _shopSearchController.text.trim();
        final showLiveResults =
            draftQuery.isNotEmpty &&
            _shopCommittedSearchQuery.isNotEmpty &&
            draftQuery.toLowerCase() == _shopCommittedSearchQuery.toLowerCase();
        final searchPanel = !_isShopSearchMode
            ? null
            : (draftQuery.isEmpty
                  ? app_search.BuyerSearchSuggestionsPanel(
                      key: ValueKey('shop-search-suggestions-$platformId'),
                      primaryColor: _primaryColor,
                      titleColor: _titleColor,
                      secondaryColor: _secondaryColor,
                      platformId: platformId,
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                      onSelectTerm: _applyShopSearchSuggestion,
                    )
                  : FutureBuilder<_BuyerLiveSearchCatalog>(
                      future: _resolveShopLiveSearchCatalog(
                        platformId: platformId,
                      ),
                      builder: (context, snapshot) {
                        final catalog = snapshot.data;
                        final isLoading = showLiveResults
                            ? snapshot.connectionState ==
                                ConnectionState.waiting
                            : snapshot.connectionState ==
                                    ConnectionState.waiting &&
                                catalog == null;
                        if (showLiveResults) {
                          final hits = catalog == null
                              ? const <app_search.BuyerLiveSearchHit>[]
                              : app_search.buildBuyerLiveSearchHits(
                                  query: draftQuery,
                                  platforms: catalog.platforms,
                                  storeTypes: catalog.storeTypes,
                                  sellers: catalog.sellers,
                                  products: catalog.products,
                                  platformId: platformId,
                                );
                          const searchPadding =
                              EdgeInsets.fromLTRB(12, 8, 12, 24);
                          final resultsPanel =
                              app_search.BuyerLiveSearchResultsPanel(
                            query: draftQuery,
                            hits: hits,
                            isLoading: isLoading,
                            primaryColor: _primaryColor,
                            titleColor: _titleColor,
                            secondaryColor: _secondaryColor,
                            padding: searchPadding,
                            onRefresh: () =>
                                _refreshShopLiveSearch(platformId: platformId),
                            onSelectHit: (hit) async {
                              // Keep search mode + query so Back returns here.
                              dismissAppKeyboard();
                              await _handleBuyerLiveSearchHit(hit);
                            },
                          );

                          // Category sort chips only for shop/food platforms.
                          if (!_isProductListingStorefront(platformId)) {
                            return resultsPanel;
                          }

                          final categoriesWithHits =
                              _liveSearchCategoriesWithHits(
                            hits,
                            platformId: platformId,
                            storeTypes:
                                catalog?.storeTypes ??
                                const <StoreTypeSummary>[],
                          );
                          if (categoriesWithHits.isEmpty) {
                            return resultsPanel;
                          }

                          final availableIds = {
                            for (final category in categoriesWithHits)
                              category.id,
                          };
                          final selectedFilter =
                              _shopLiveSearchStoreTypeFilter == 'all' ||
                                  availableIds.contains(
                                    _shopLiveSearchStoreTypeFilter,
                                  )
                              ? _shopLiveSearchStoreTypeFilter
                              : 'all';
                          if (selectedFilter !=
                              _shopLiveSearchStoreTypeFilter) {
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              if (!mounted) return;
                              if (_shopLiveSearchStoreTypeFilter ==
                                  selectedFilter) {
                                return;
                              }
                              setState(
                                () => _shopLiveSearchStoreTypeFilter =
                                    selectedFilter,
                              );
                            });
                          }

                          final filteredHits = _filterLiveSearchHitsByCategory(
                            hits,
                            selectedFilter,
                          );
                          final filteredPanel =
                              app_search.BuyerLiveSearchResultsPanel(
                            query: draftQuery,
                            hits: filteredHits,
                            isLoading: isLoading,
                            primaryColor: _primaryColor,
                            titleColor: _titleColor,
                            secondaryColor: _secondaryColor,
                            padding: searchPadding,
                            onRefresh: () =>
                                _refreshShopLiveSearch(platformId: platformId),
                            onSelectHit: (hit) async {
                              dismissAppKeyboard();
                              await _handleBuyerLiveSearchHit(hit);
                            },
                          );
                          final showFilterSkeleton =
                              _shopLiveSearchFilterShowSkeleton &&
                              selectedFilter == _shopLiveSearchStoreTypeFilter;
                          final filterBody = showFilterSkeleton
                              ? const SkeletonLiveSearchResultsPanel(
                                  padding: searchPadding,
                                )
                              : filteredPanel;

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              SizedBox(
                                height:
                                    _LiveSearchStoreTypeFilterCarousel.height,
                                child: _LiveSearchStoreTypeFilterCarousel(
                                  storeTypes: categoriesWithHits,
                                  selectedId: selectedFilter,
                                  backgroundColor: _dashboardForegroundColor,
                                  activeColor: _primaryColor,
                                  inactiveColor: _secondaryColor,
                                  onSelect: (id) =>
                                      _selectShopLiveSearchStoreTypeFilter(
                                        id,
                                        storeTypesWithHits: categoriesWithHits,
                                      ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Expanded(
                                child: _LiveSearchFilterPageSlide(
                                  transitionKey: selectedFilter,
                                  forward: _shopLiveSearchFilterSlideForward,
                                  duration: appPageTransitionDuration,
                                  child: filterBody,
                                ),
                              ),
                            ],
                          );
                        }

                        final terms = catalog == null
                            ? const <app_search.BuyerPossibleSearchTerm>[]
                            : app_search.buildBuyerPossibleSearchTerms(
                                query: draftQuery,
                                platforms: catalog.platforms,
                                storeTypes: catalog.storeTypes,
                                sellers: catalog.sellers,
                                products: catalog.products,
                                platformId: platformId,
                              );
                        return app_search.BuyerPossibleSearchesPanel(
                          query: draftQuery,
                          terms: terms,
                          isLoading: isLoading,
                          primaryColor: _primaryColor,
                          titleColor: _titleColor,
                          secondaryColor: _secondaryColor,
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                          onSelectTerm: _applyShopSearchSuggestion,
                        );
                      },
                    ));

        // One keyed hero instance so search focus can animate collapse/expand.
        // While searching, it moves to the pinned overlay; the offstage list
        // keeps a same-height placeholder so scroll position stays exact.
        final shopHero = !showProductShowcase
            ? null
            : _ShopPlatformHeroBackground(
                key: _shopPlatformHeroKey,
                primaryColor: _primaryColor,
                backgroundColor: _dashboardForegroundColor,
                // While sticky is showing, drop the off-screen hero field so
                // opening search from sticky focuses the main hero chrome.
                overlayHeader: _isShopHeaderCollapsed && !_isShopSearchMode
                    ? null
                    : showcaseOverlayHeader,
                headerPrimaryColor: _primaryColor,
              );
        final usePlainSortHeader =
            !_isAllDealFilter && !_isShopSearchMode;
        final plainSortHeaderInset = usePlainSortHeader
            ? _ShopStickySearchHeader.estimateHeight(
                context,
                showDeliveryLocation:
                    showcaseOverlayHeader?.showDeliveryLocation ?? false,
              )
            : 0.0;
        Widget? buildShopScrollHeader({
          required bool skeletonizeMostPopular,
          bool attachHeroKey = true,
        }) {
          if (!showProductShowcase) return null;
          // MinimumSkeletonReveal keeps skeleton + live mounted during fade.
          // Only the live header may hold `_shopPlatformHeroKey`.
          final Widget? headerHero;
          if (_isShopSearchMode) {
            headerHero = const SizedBox(
              height: _ShopPlatformHeroBackground.height,
            );
          } else if (usePlainSortHeader) {
            headerHero = SizedBox(height: plainSortHeaderInset);
          } else if (attachHeroKey) {
            headerHero = shopHero;
          } else {
            headerHero = _ShopPlatformHeroBackground(
              primaryColor: _primaryColor,
              backgroundColor: _dashboardForegroundColor,
              overlayHeader: _isShopHeaderCollapsed && !_isShopSearchMode
                  ? null
                  : showcaseOverlayHeader,
              headerPrimaryColor: _primaryColor,
            );
          }
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (headerHero != null) headerHero,
              if (!usePlainSortHeader)
                skeletonizeMostPopular
                    ? _DealsCarouselSkeleton(
                        backgroundColor: _dashboardForegroundColor,
                      )
                    : _DealsCarousel(
                        dealSortMask: _dealSortMask,
                        newPostActive: _newPostFilterActive,
                        backgroundColor: _dashboardForegroundColor,
                        activeColor: _primaryColor,
                        inactiveColor: _secondaryColor,
                        onTap: _handleDealsTap,
                      )
              else if (skeletonizeMostPopular)
                _DealsCarouselSkeleton(
                  backgroundColor: _dashboardForegroundColor,
                ),
              if (_isAllDealFilter) ...[
                skeletonizeMostPopular
                    ? SkeletonMostPopularCompanies(
                        columnsPerRow:
                            _MostPopularCompaniesCarousel.columnsPerRow,
                        rowsPerPage: _MostPopularCompaniesCarousel.rowsPerPage,
                        avatarSize: _MostPopularCompaniesCarousel.avatarSize,
                      )
                    : _MostPopularCompaniesCarousel(
                        platformId: platformId,
                        productsFuture: productsFuture,
                        sellersFuture: _sellersFuture,
                        backgroundColor: _dashboardForegroundColor,
                        titleColor: _titleColor,
                        secondaryColor: _secondaryColor,
                        primaryColor: _primaryColor,
                      ),
                skeletonizeMostPopular
                    ? const SkeletonHomeCategoriesCarousel()
                    : HomeCategoriesCarousel(
                        platformId: platformId,
                        platformName: platformName.trim().isEmpty
                            ? (platformId == 'food' ? 'Food' : 'Shop')
                            : platformName.trim(),
                        storeTypesFuture: _storeTypesFuture,
                        productsFuture: productsFuture,
                        backgroundColor: _dashboardForegroundColor,
                        titleColor: _titleColor,
                        secondaryColor: _secondaryColor,
                        primaryColor: _primaryColor,
                        onViewAll: _viewAllHomeCategories,
                      ),
                skeletonizeMostPopular
                    ? const SkeletonNewPostHomeCarousel(
                        cardCount: 4,
                        cardWidth: _HomeProductOfferCarousel.cardWidth,
                        listHeight: _HomeProductOfferCarousel.carouselHeight,
                      )
                    : _HomeProductOfferCarousel(
                        title: 'New Arrivals',
                        iconAsset: 'assets/images/new-post-sort-3d.png',
                        productsFuture: productsFuture,
                        buildProducts: _buildNewPostProducts,
                        backgroundColor: _dashboardForegroundColor,
                        surfaceColor: _fieldBackgroundColor,
                        titleColor: _titleColor,
                        secondaryColor: _secondaryColor,
                        primaryColor: _primaryColor,
                        platformId: platformId,
                        onViewAll: _viewAllNewPostProducts,
                        onReturnedFromProductRoute:
                            _syncShopDashboardScrollChrome,
                      ),
                skeletonizeMostPopular
                    ? const SkeletonNewPostHomeCarousel(
                        cardCount: 4,
                        cardWidth: _HomeProductOfferCarousel.cardWidth,
                        listHeight: _HomeProductOfferCarousel.carouselHeight,
                      )
                    : _HomeProductOfferCarousel(
                        title: 'Flash Deals',
                        iconAsset: 'assets/images/flash-deals-sort-3d.png',
                        productsFuture: productsFuture,
                        buildProducts: _buildFlashDealHomeProducts,
                        backgroundColor: _dashboardForegroundColor,
                        surfaceColor: _fieldBackgroundColor,
                        titleColor: _titleColor,
                        secondaryColor: _secondaryColor,
                        primaryColor: _primaryColor,
                        platformId: platformId,
                        onViewAll: _viewAllFlashDealProducts,
                        onReturnedFromProductRoute:
                            _syncShopDashboardScrollChrome,
                      ),
                skeletonizeMostPopular
                    ? const SkeletonNewPostHomeCarousel(
                        cardCount: 4,
                        cardWidth: _HomeProductOfferCarousel.cardWidth,
                        listHeight: _HomeProductOfferCarousel.carouselHeight,
                      )
                    : _HomeProductOfferCarousel(
                        title: 'Top Selling',
                        iconAsset: 'assets/images/top-selling-sort-3d.png',
                        productsFuture: productsFuture,
                        buildProducts: _buildTopSellingHomeProducts,
                        backgroundColor: _dashboardForegroundColor,
                        surfaceColor: _fieldBackgroundColor,
                        titleColor: _titleColor,
                        secondaryColor: _secondaryColor,
                        primaryColor: _primaryColor,
                        platformId: platformId,
                        onViewAll: _viewAllTopSellingProducts,
                        onReturnedFromProductRoute:
                            _syncShopDashboardScrollChrome,
                      ),
                skeletonizeMostPopular
                    ? const SkeletonNewPostHomeCarousel(
                        cardCount: 4,
                        cardWidth: _HomeProductOfferCarousel.cardWidth,
                        listHeight: _HomeProductOfferCarousel.carouselHeight,
                      )
                    : _HomeProductOfferCarousel(
                        title: 'Top Rating',
                        iconAsset: 'assets/images/top-rating-sort-3d.png',
                        productsFuture: productsFuture,
                        buildProducts: _buildTopRatingHomeProducts,
                        backgroundColor: _dashboardForegroundColor,
                        surfaceColor: _fieldBackgroundColor,
                        titleColor: _titleColor,
                        secondaryColor: _secondaryColor,
                        primaryColor: _primaryColor,
                        platformId: platformId,
                        onViewAll: _viewAllTopRatingProducts,
                        onReturnedFromProductRoute:
                            _syncShopDashboardScrollChrome,
                      ),
              ],
            ],
          );
        }

        final shopScrollHeader = buildShopScrollHeader(
          skeletonizeMostPopular: false,
          attachHeroKey: true,
        );
        final shopSkeletonScrollHeader = buildShopScrollHeader(
          skeletonizeMostPopular: true,
          attachHeroKey: false,
        );

        final dealsAndProducts = Stack(
          children: [
            Positioned.fill(
              top: showProductShowcase ? 0 : _DealsCarousel.totalHeight,
              child: Column(
                children: [
                  if (_isShopVisualSearching ||
                      _shopVisualSearchError.isNotEmpty ||
                      hasVisualSearchResults)
                    _ShopVisualSearchBanner(
                      isLoading: _isShopVisualSearching,
                      resultCount: visualSearchProducts?.length,
                      errorMessage: _shopVisualSearchError,
                      primaryColor: _primaryColor,
                      secondaryColor: _secondaryColor,
                      surfaceColor: _fieldBackgroundColor,
                      onClear: _clearShopVisualSearch,
                    ),
                  Expanded(
                    child: _ProductDashboard(
                      productsFuture: productsFuture,
                      dealSortMask: _dealSortMask,
                      newPostFilterActive: _newPostFilterActive,
                      backgroundColor: _dashboardForegroundColor,
                      surfaceColor: _fieldBackgroundColor,
                      titleColor: _titleColor,
                      secondaryColor: _secondaryColor,
                      primaryColor: _primaryColor,
                      searchQuery: _isShopSearchMode
                          ? _shopFrozenListSearchQuery
                          : _shopSearchQuery,
                      scrollController: _productDashboardScrollController,
                      leadingContent: shopScrollHeader,
                      skeletonLeadingContent: shopSkeletonScrollHeader,
                      platformId: platformId,
                      preservedVisibleCount: _shopDashboardVisibleCount,
                      dealSwitchEpoch: _shopDealSwitchEpochNotifier.value,
                      dealSwitchReady: _shopDealSwitchReadyNotifier.value,
                      onVisibleCountChanged: (count) {
                        _shopDashboardVisibleCount = count;
                        _shopDealVisibleCounts[_shopDealFilterKey] = count;
                      },
                      onReturnedFromProductRoute:
                          _syncShopDashboardScrollChrome,
                      onRefresh: hasVisualSearchResults
                          ? () async => _clearShopVisualSearch()
                          : () => _refreshProducts(resetHero: false),
                      onScrollOffsetChanged: _handleShopDashboardScroll,
                      bottomOverscrollSignal: _homeBottomOverscrollSignal,
                      onBottomOverscroll: _handleHomeBottomOverscroll,
                    ),
                  ),
                ],
              ),
            ),
            if (!showProductShowcase)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: _DealsCarousel(
                  dealSortMask: _dealSortMask,
                  newPostActive: _newPostFilterActive,
                  backgroundColor: _dashboardForegroundColor,
                  activeColor: _primaryColor,
                  inactiveColor: _secondaryColor,
                  onTap: _handleDealsTap,
                ),
              ),
            Positioned(
              left: 0,
              right: 0,
              // Sit just above the device bottom system nav / home indicator.
              bottom: MediaQuery.paddingOf(context).bottom + 10,
              child: Center(
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
                  child: _showsScrollToTopButton
                      ? Material(
                          key: const ValueKey('shop-scroll-to-top-button'),
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(999),
                          elevation: 2,
                          shadowColor: Colors.black26,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(999),
                            onTap: _scrollDashboardToTop,
                            child: const Padding(
                              padding: EdgeInsets.fromLTRB(14, 10, 10, 10),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    'Back to top',
                                    style: TextStyle(
                                      color: Color(0xFF162033),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      height: 1.1,
                                    ),
                                  ),
                                  SizedBox(width: 4),
                                  Icon(
                                    Icons.keyboard_arrow_up_rounded,
                                    color: Color(0xFF162033),
                                    size: 22,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      : const SizedBox.shrink(
                          key: ValueKey('shop-scroll-to-top-button-hidden'),
                        ),
                ),
              ),
            ),
          ],
        );

        final stickyHeaderOverlay =
            showProductShowcase &&
                showcaseOverlayHeader != null &&
                !_isShopSearchMode
            ? ListenableBuilder(
                listenable: Listenable.merge([
                  _isShopHeaderCollapsedNotifier,
                  _shopStickyHeaderAnimateNotifier,
                ]),
                builder: (context, child) {
                  final isVisible = _isShopHeaderCollapsed;
                  final animate = _shopStickyHeaderAnimateNotifier.value;
                  final slideDuration = animate
                      ? const Duration(milliseconds: 260)
                      : Duration.zero;
                  final fadeDuration = animate
                      ? const Duration(milliseconds: 180)
                      : Duration.zero;
                  return IgnorePointer(
                    ignoring: !isVisible,
                    child: AnimatedSlide(
                      duration: slideDuration,
                      curve: Curves.easeOutCubic,
                      offset: isVisible ? Offset.zero : const Offset(0, -1),
                      child: AnimatedOpacity(
                        duration: fadeDuration,
                        opacity: isVisible ? 1 : 0,
                        child: child,
                      ),
                    ),
                  );
                },
                child: _ShopStickySearchHeader(
                  header: showcaseOverlayHeader,
                  backgroundColor: _dashboardForegroundColor,
                  primaryColor: _primaryColor,
                  dealSortMask: _dealSortMask,
                  newPostActive: _newPostFilterActive,
                  dealsActiveColor: _primaryColor,
                  dealsInactiveColor: _secondaryColor,
                  onDealsTap: _handleDealsTap,
                  onSearchTap: _openMainShopSearch,
                ),
              )
            : null;

        final searchOverlay = !_isShopSearchMode
            ? null
            : ColoredBox(
                color: _dashboardForegroundColor,
                child: Column(
                  children: [
                    if (shopHero != null) shopHero,
                    Expanded(
                      child: wrapSearchKeyboardDismiss(child: searchPanel!),
                    ),
                  ],
                ),
              );

        final Widget content;
        if (!showProductShowcase) {
          content = _isShopSearchMode
              ? Stack(
                  fit: StackFit.expand,
                  children: [
                    Offstage(offstage: true, child: dealsAndProducts),
                    ColoredBox(
                      color: _dashboardForegroundColor,
                      child: wrapSearchKeyboardDismiss(child: searchPanel!),
                    ),
                  ],
                )
              : dealsAndProducts;
        } else {
          content = Stack(
            fit: StackFit.expand,
            children: [
              Offstage(
                offstage: _isShopSearchMode,
                child: TickerMode(
                  enabled: !_isShopSearchMode,
                  child: IgnorePointer(
                    ignoring: _isShopSearchMode,
                    child: ExcludeSemantics(
                      excluding: _isShopSearchMode,
                      child: dealsAndProducts,
                    ),
                  ),
                ),
              ),
              if (searchOverlay != null) searchOverlay,
              if (stickyHeaderOverlay != null)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: stickyHeaderOverlay,
                ),
            ],
          );
        }

        return _wrapWithPlatformActivityRail(
          platformId: platformId,
          child: content,
        );
      },
    );
  }

  Widget _wrapWithPlatformActivityRail({
    required String platformId,
    required Widget child,
  }) {
    final normalized = platformId.trim().toLowerCase();
    if (normalized.isEmpty ||
        normalized == _kBuyerPlatformNone ||
        _isGuestMode) {
      return child;
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 1100) {
          return child;
        }
        return FutureBuilder<String>(
          future: _resolveCurrentPlatformLabel(),
          builder: (context, snapshot) {
            final label = snapshot.data?.trim().isNotEmpty == true
                ? snapshot.data!.trim()
                : (normalized == 'food'
                      ? 'Food'
                      : normalized == 'shop'
                      ? 'Shop'
                      : normalized);
            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: child),
                BuyerPlatformActivityRail(
                  platformLabel: label,
                  primaryColor: _primaryColor,
                  titleColor: _titleColor,
                  secondaryColor: _secondaryColor,
                  surfaceColor: _dashboardForegroundColor,
                  onOpenItem: (item) {
                    _navigateToTab(2, orderStageIndex: item.stageIndex);
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildNonHomeMainArea(
    int selectedIndex, {
    bool includeHeader = true,
  }) {
    final headerBackgroundColor = _fieldBackgroundColor;
    final headerSearchFieldBackgroundColor = headerBackgroundColor;

    return Column(
      children: [
        if (includeHeader)
          if (selectedIndex == 2)
            AnimatedBuilder(
              animation: Listenable.merge([
                _selectedHeaderActionNotifier,
                _showsNewMessagePopupNotifier,
              ]),
              builder: (context, child) => _buildActivitySwitchHeader(),
            )
          else
            AnimatedBuilder(
              animation: Listenable.merge([
                _selectedHeaderActionNotifier,
                _showsNewMessagePopupNotifier,
                _isFavoritesSearchingNotifier,
              ]),
              builder: (context, child) {
                return _HeaderSection(
                  backgroundColor: headerBackgroundColor,
                  inactiveColor: _titleColor,
                  activeColor: _primaryColor,
                  // Search ("What are you looking for?") lives on Home only.
                  showsSearchButton: false,
                  isSearchExpanded: selectedIndex == 4 && _isFavoritesSearching,
                  searchController: selectedIndex == 4
                      ? _favoritesSearchController
                      : null,
                  searchFocusNode: selectedIndex == 4
                      ? _favoritesSearchFocusNode
                      : null,
                  searchFieldBackgroundColor: headerSearchFieldBackgroundColor,
                  onSearchChanged: selectedIndex == 4
                      ? _handleFavoritesSearchChanged
                      : null,
                  onSearchClear: selectedIndex == 4
                      ? _resetFavoritesSearch
                      : null,
                  onSearchTapOutside: selectedIndex == 4
                      ? (_) => _resetFavoritesSearch()
                      : null,
                  showNewMessagePopup: _showsNewMessagePopup,
                  title: selectedIndex == 4 ? 'Favorites' : null,
                  selectedAction: _selectedHeaderAction,
                  onActionTap: _handleHeaderAction,
                  onSearchTap: selectedIndex == 4
                      ? _toggleFavoritesSearch
                      : () => _openSearchPage(),
                );
              },
            ),
        Expanded(child: _buildNonHomeBody(selectedIndex)),
      ],
    );
  }

  Widget _buildNonHomeBody(int selectedIndex) {
    switch (selectedIndex) {
      case 4:
        return AnimatedBuilder(
          animation: Listenable.merge([
            _productsFutureNotifier,
            _favoritesSearchQueryNotifier,
          ]),
          builder: (context, child) {
            return _FavoritesPage(
              backgroundColor: _dashboardForegroundColor,
              productCardSurfaceColor: _fieldBackgroundColor,
              productsFuture: _productsFuture,
              titleColor: _titleColor,
              secondaryColor: _secondaryColor,
              primaryColor: _primaryColor,
              searchQuery: _favoritesSearchQuery,
              onRefresh: () => _refreshProducts(resetHero: false),
              onExplore: _goToBrowseHome,
            );
          },
        );
      case 2:
        // Home-level Activity is disabled. Full process UI opens only from
        // platform activity list items / deep links.
        if (_buyerPlatform == _kBuyerPlatformNone) {
          return ColoredBox(
            color: _dashboardForegroundColor,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 18, 10, 16),
              child: _DashboardStateCard(
                icon: Icons.history_rounded,
                title: 'Recent activity',
                message:
                    'Open a platform like Shop to see orders, process updates, and history in the activity sidebar.',
                primaryColor: _primaryColor,
                surfaceColor: _fieldBackgroundColor,
                secondaryColor: _secondaryColor,
              ),
            ),
          );
        }
        return ColoredBox(
          color: _dashboardForegroundColor,
          child: ValueListenableBuilder<int>(
            valueListenable: _selectedOrderStageIndexNotifier,
            builder: (context, selectedOrderStageIndex, child) {
              return OrderPage(
                initialStageIndex: selectedOrderStageIndex,
                backgroundColor: _dashboardForegroundColor,
                surfaceColor: _fieldBackgroundColor,
                titleColor: _titleColor,
                secondaryColor: _secondaryColor,
                primaryColor: _primaryColor,
              );
            },
          ),
        );
      default:
        final currentSection = _sectionPlaceholderDataForIndex(selectedIndex);
        return Padding(
          padding: const EdgeInsets.fromLTRB(10, 18, 10, 16),
          child: _DashboardStateCard(
            icon: currentSection.icon,
            title: currentSection.title,
            message: currentSection.message,
            primaryColor: _primaryColor,
            surfaceColor: _fieldBackgroundColor,
            secondaryColor: _secondaryColor,
          ),
        );
    }
  }
}

class _DealsCarousel extends StatelessWidget {
  const _DealsCarousel({
    required this.dealSortMask,
    required this.backgroundColor,
    required this.activeColor,
    required this.inactiveColor,
    required this.onTap,
    this.newPostActive = false,
  });

  static const double height = 42;
  static const double bottomPadding = 10;
  static double get totalHeight => height + bottomPadding;

  /// Bitmask of Flash / Top Selling / Top Rating. `0` + !newPost = All.
  final int dealSortMask;
  final bool newPostActive;
  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    // All first, then New Post; dealIndex keeps filter ids stable.
    const items = [
      (
        label: 'All',
        icon: Icons.grid_view_rounded,
        dealIndex: _dealFilterAllIndex,
      ),
      (
        label: 'New Arrivals',
        icon: Icons.new_releases_rounded,
        dealIndex: _dealFilterNewPostIndex,
      ),
      (
        label: 'Flash Deals',
        icon: Icons.bolt_rounded,
        dealIndex: _dealFilterFlashDealsIndex,
      ),
      (
        label: 'Top Selling',
        icon: Icons.trending_up_rounded,
        dealIndex: _dealFilterTopSellingIndex,
      ),
      (
        label: 'Top Rating',
        icon: Icons.star_rounded,
        dealIndex: _dealFilterTopRatingIndex,
      ),
    ];
    const inactiveBorderColor = Color(0xFFD1D5DB);
    final isAllActive = dealSortMask == 0 && !newPostActive;

    return Material(
      color: backgroundColor,
      elevation: 0,
      shadowColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.only(bottom: bottomPadding),
        child: SizedBox(
          height: height,
          child: HorizontalEndFade(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(10, 6, 22, 6),
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final item = items[index];
                final dealIndex = item.dealIndex;
                final isActive = dealIndex == _dealFilterAllIndex
                    ? isAllActive
                    : dealIndex == _dealFilterNewPostIndex
                    ? newPostActive
                    : (dealSortMask & (1 << dealIndex)) != 0;
                final borderColor = isActive ? activeColor : inactiveBorderColor;
                final labelColor = isActive ? activeColor : inactiveColor;

                return InkWell(
                  onTap: () => onTap(dealIndex),
                  borderRadius: BorderRadius.circular(999),
                  overlayColor: const WidgetStatePropertyAll(
                    Colors.transparent,
                  ),
                  splashFactory: NoSplash.splashFactory,
                  highlightColor: Colors.transparent,
                  splashColor: Colors.transparent,
                  hoverColor: Colors.transparent,
                  focusColor: Colors.transparent,
                  child: AnimatedContainer(
                    duration: appMotionFrames(11),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.only(
                      left: 4,
                      right: 11,
                      top: 3,
                      bottom: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: borderColor,
                        width: 1.2,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        item.label == 'Flash Deals'
                            ? Image.asset(
                                'assets/images/flash-deals-sort-3d.png',
                                width: 28,
                                height: 28,
                                fit: BoxFit.contain,
                                filterQuality: FilterQuality.high,
                                isAntiAlias: true,
                                excludeFromSemantics: true,
                              )
                            : item.label == 'Top Selling'
                            ? Image.asset(
                                'assets/images/top-selling-sort-3d.png',
                                width: 28,
                                height: 28,
                                fit: BoxFit.contain,
                                filterQuality: FilterQuality.high,
                                isAntiAlias: true,
                                excludeFromSemantics: true,
                              )
                            : item.label == 'Top Rating'
                            ? Image.asset(
                                'assets/images/top-rating-sort-3d.png',
                                width: 28,
                                height: 28,
                                fit: BoxFit.contain,
                                filterQuality: FilterQuality.high,
                                isAntiAlias: true,
                                excludeFromSemantics: true,
                              )
                            : item.label == 'New Arrivals'
                            ? Image.asset(
                                'assets/images/new-post-sort-3d.png',
                                width: 28,
                                height: 28,
                                fit: BoxFit.contain,
                                filterQuality: FilterQuality.high,
                                isAntiAlias: true,
                                excludeFromSemantics: true,
                              )
                            : Icon(
                                item.icon,
                                size: 15,
                                color: labelColor,
                              ),
                        const SizedBox(width: 6),
                        Text(
                          item.label,
                          textHeightBehavior: const TextHeightBehavior(
                            applyHeightToFirstAscent: false,
                            applyHeightToLastDescent: false,
                          ),
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                color: labelColor,
                                fontWeight: FontWeight.w700,
                                height: 1,
                              ),
                        ),
                      ],
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

/// Skeleton for the sorting row inside the scrollable platform content.
/// The duplicate sorting row in `_ShopStickySearchHeader` stays interactive.
class _DealsCarouselSkeleton extends StatelessWidget {
  const _DealsCarouselSkeleton({required this.backgroundColor});

  static const List<double> _pillWidths = <double>[62, 118, 126, 124, 120];

  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: backgroundColor,
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.only(bottom: _DealsCarousel.bottomPadding),
        child: SizedBox(
          height: _DealsCarousel.height,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(10, 6, 22, 6),
            itemCount: _pillWidths.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              return SkeletonBox(
                width: _pillWidths[index],
                height: 30,
                borderRadius: 999,
              );
            },
          ),
        ),
      ),
    );
  }
}

List<_CompanyListing> _buildMostPopularCompanies({
  required List<SellerSummary> sellers,
  required List<Product> products,
  int limit = 20,
}) {
  final companiesByKey = <String, _MutableCompanyListing>{};

  String companyKeyForSeller(SellerSummary seller) {
    final adminId = seller.adminId.trim();
    if (adminId.isNotEmpty) {
      return 'admin:${adminId.toLowerCase()}';
    }
    final companyName = seller.displayName.trim();
    final companyPictureUrl = seller.displayImageUrl.trim();
    if (companyName.isEmpty && companyPictureUrl.isEmpty) {
      return '';
    }
    return 'company:${companyName.toLowerCase()}|${companyPictureUrl.toLowerCase()}';
  }

  String companyKeyForProduct(Product product) {
    final adminId = product.adminId.trim();
    if (adminId.isNotEmpty) {
      return 'admin:${adminId.toLowerCase()}';
    }
    final companyName = product.companyName.trim();
    final companyPictureUrl = product.companyPictureUrl.trim();
    if (companyName.isEmpty && companyPictureUrl.isEmpty) {
      return '';
    }
    return 'company:${companyName.toLowerCase()}|${companyPictureUrl.toLowerCase()}';
  }

  for (final seller in sellers) {
    final companyKey = companyKeyForSeller(seller);
    if (companyKey.isEmpty) {
      continue;
    }
    companiesByKey.putIfAbsent(
      companyKey,
      () => _MutableCompanyListing(
        id: companyKey,
        adminId: seller.adminId.trim(),
        name: seller.displayName,
        storeType: seller.storeType,
        pictureUrl: seller.displayImageUrl,
      ),
    );
  }

  for (final product in filterVisibleProducts(products)) {
    final companyKey = companyKeyForProduct(product);
    if (companyKey.isEmpty) {
      continue;
    }
    final company = companiesByKey.putIfAbsent(
      companyKey,
      () => _MutableCompanyListing(
        id: companyKey,
        adminId: product.adminId.trim(),
        name: product.companyName.trim(),
        storeType: '',
        pictureUrl: product.companyPictureUrl.trim(),
      ),
    );
    company.addProduct(product);
  }

  // Only companies with live listings on this dashboard (popularity = sold).
  final companies =
      companiesByKey.values
          .map((company) => company.toCompanyListing())
          .where((company) => company.adminId.trim().isNotEmpty)
          .where((company) => company.hasListings)
          .toList(growable: false)
        ..sort((first, second) {
          final soldCompare = second.soldCount.compareTo(first.soldCount);
          if (soldCompare != 0) {
            return soldCompare;
          }
          final listingCompare = second.productCount.compareTo(
            first.productCount,
          );
          if (listingCompare != 0) {
            return listingCompare;
          }
          return first.name.toLowerCase().compareTo(second.name.toLowerCase());
        });

  if (companies.length <= limit) {
    return companies;
  }
  return companies.take(limit).toList(growable: false);
}

class _MostPopularCompaniesCarousel extends StatefulWidget {
  const _MostPopularCompaniesCarousel({
    required this.platformId,
    required this.productsFuture,
    required this.sellersFuture,
    required this.backgroundColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
  });

  static const int columnsPerRow = 5;
  static const int rowsPerPage = 2;
  static const int pageSize = columnsPerRow * rowsPerPage;
  static const int maxCompanies = 20;
  static const double avatarSize = 56;
  static const double rowHeight = 84;
  static const double rowGap = 0;
  static double get height =>
      (rowHeight * rowsPerPage) + (rowGap * (rowsPerPage - 1));

  final String platformId;
  final Future<List<Product>> productsFuture;
  final Future<List<SellerSummary>> sellersFuture;
  final Color backgroundColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;

  @override
  State<_MostPopularCompaniesCarousel> createState() =>
      _MostPopularCompaniesCarouselState();
}

class _MostPopularCompaniesCarouselState
    extends State<_MostPopularCompaniesCarousel> {
  late final PageController _pageController;
  late Future<({List<Product> products, List<SellerSummary> sellers})>
  _catalogFuture;
  ({List<Product> products, List<SellerSummary> sellers})? _cachedCatalog;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _catalogFuture = _loadCatalog();
  }

  @override
  void didUpdateWidget(covariant _MostPopularCompaniesCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    final platformChanged =
        oldWidget.platformId.trim().toLowerCase() !=
        widget.platformId.trim().toLowerCase();
    if (platformChanged) {
      _cachedCatalog = null;
      _currentPage = 0;
      if (_pageController.hasClients) {
        _pageController.jumpToPage(0);
      }
    }
    if (!identical(oldWidget.productsFuture, widget.productsFuture) ||
        !identical(oldWidget.sellersFuture, widget.sellersFuture)) {
      _catalogFuture = _loadCatalog();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<({List<Product> products, List<SellerSummary> sellers})>
  _loadCatalog() async {
    List<Product> products = const <Product>[];
    List<SellerSummary> sellers = const <SellerSummary>[];
    try {
      products = await widget.productsFuture;
    } catch (_) {}
    try {
      sellers = await widget.sellersFuture;
    } catch (_) {}
    return (products: products, sellers: sellers);
  }

  void _openCompany(BuildContext context, _CompanyListing company) {
    final adminId = company.adminId.trim();
    if (adminId.isEmpty) {
      return;
    }
    Navigator.of(context).pushNamed(
      '/seller',
      arguments: {'adminId': adminId, 'initialName': company.name},
    );
  }

  List<_CompanyListing?> _buildSlots(List<_CompanyListing> companies) {
    return List<_CompanyListing?>.generate(
      _MostPopularCompaniesCarousel.maxCompanies,
      (index) => index < companies.length ? companies[index] : null,
      growable: false,
    );
  }

  Widget _buildSectionShell({required Widget body}) {
    return Material(
      color: widget.backgroundColor,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 2, 0, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Text(
                'Most Popular',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: widget.titleColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            body,
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingSkeleton() {
    return Material(
      color: widget.backgroundColor,
      child: SkeletonMostPopularCompanies(
        columnsPerRow: _MostPopularCompaniesCarousel.columnsPerRow,
        rowsPerPage: _MostPopularCompaniesCarousel.rowsPerPage,
        avatarSize: _MostPopularCompaniesCarousel.avatarSize,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<({List<Product> products, List<SellerSummary> sellers})>(
      future: _catalogFuture,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          _cachedCatalog = snapshot.data;
        }
        final catalog = snapshot.data ?? _cachedCatalog;
        final isLoading =
            snapshot.connectionState == ConnectionState.waiting &&
            catalog == null;

        if (isLoading) {
          return _buildLoadingSkeleton();
        }

        final products = catalog?.products ?? const <Product>[];
        final sellers = catalog?.sellers ?? const <SellerSummary>[];
        final companies = _buildMostPopularCompanies(
          sellers: sellers,
          products: products,
          limit: _MostPopularCompaniesCarousel.maxCompanies,
        );
        final slots = _buildSlots(companies);
        const pageCount =
            _MostPopularCompaniesCarousel.maxCompanies ~/
            _MostPopularCompaniesCarousel.pageSize;
        final safePage = _currentPage.clamp(0, pageCount - 1);

        return _buildSectionShell(
          body: Column(
            children: [
              SizedBox(
                height: _MostPopularCompaniesCarousel.height,
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: pageCount,
                  onPageChanged: (page) {
                    if (_currentPage == page) {
                      return;
                    }
                    setState(() => _currentPage = page);
                  },
                  itemBuilder: (context, pageIndex) {
                    final start =
                        pageIndex * _MostPopularCompaniesCarousel.pageSize;

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Column(
                        children: [
                          for (
                            var row = 0;
                            row < _MostPopularCompaniesCarousel.rowsPerPage;
                            row++
                          ) ...[
                            if (row > 0)
                              const SizedBox(
                                height: _MostPopularCompaniesCarousel.rowGap,
                              ),
                            SizedBox(
                              height: _MostPopularCompaniesCarousel.rowHeight,
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  for (
                                    var col = 0;
                                    col <
                                        _MostPopularCompaniesCarousel
                                            .columnsPerRow;
                                    col++
                                  )
                                    Expanded(
                                      child: _MostPopularCompanyTile(
                                        company:
                                            slots[start +
                                                (row *
                                                    _MostPopularCompaniesCarousel
                                                        .columnsPerRow) +
                                                col],
                                        primaryColor: widget.primaryColor,
                                        titleColor: widget.titleColor,
                                        secondaryColor: widget.secondaryColor,
                                        onTap: () {
                                          final company =
                                              slots[start +
                                                  (row *
                                                      _MostPopularCompaniesCarousel
                                                          .columnsPerRow) +
                                                  col];
                                          if (company == null) {
                                            return;
                                          }
                                          _openCompany(context, company);
                                        },
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(pageCount, (index) {
                    final isActive = index == safePage;
                    return AnimatedContainer(
                      duration: appMotionFrames(13),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      height: 6,
                      width: isActive ? 16 : 6,
                      decoration: BoxDecoration(
                        color: isActive
                            ? widget.primaryColor
                            : widget.secondaryColor.withValues(alpha: 0.35),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MostPopularCompanyTile extends StatelessWidget {
  const _MostPopularCompanyTile({
    required this.company,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.onTap,
  });

  final _CompanyListing? company;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final VoidCallback onTap;

  bool get _isFilled => company != null;

  @override
  Widget build(BuildContext context) {
    final filledCompany = company;
    return InkWell(
      onTap: _isFilled ? onTap : null,
      borderRadius: BorderRadius.circular(12),
      overlayColor: const WidgetStatePropertyAll(Colors.transparent),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (filledCompany != null)
              _MostPopularCompanyAvatar(
                company: filledCompany,
                primaryColor: primaryColor,
                size: _MostPopularCompaniesCarousel.avatarSize,
              )
            else
              _MostPopularEmptySlotAvatar(
                secondaryColor: secondaryColor,
                size: _MostPopularCompaniesCarousel.avatarSize,
              ),
            const SizedBox(height: 4),
            Text(
              filledCompany?.name ?? 'Slot',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: filledCompany != null
                    ? titleColor
                    : secondaryColor.withValues(alpha: 0.72),
                fontWeight: FontWeight.w600,
                height: 1.15,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MostPopularEmptySlotAvatar extends StatelessWidget {
  const _MostPopularEmptySlotAvatar({
    required this.secondaryColor,
    required this.size,
  });

  final Color secondaryColor;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: secondaryColor.withValues(alpha: 0.08),
        ),
        child: Icon(
          Icons.storefront_outlined,
          size: size * 0.42,
          color: secondaryColor.withValues(alpha: 0.45),
        ),
      ),
    );
  }
}

class _MostPopularCompanyAvatar extends StatelessWidget {
  const _MostPopularCompanyAvatar({
    required this.company,
    required this.primaryColor,
    required this.size,
  });

  final _CompanyListing company;
  final Color primaryColor;
  final double size;

  @override
  Widget build(BuildContext context) {
    final imageUrl = company.displayImageUrl.trim();
    final dataImageBytes = _decodeDataImageBytes(imageUrl);

    return SizedBox(
      width: size,
      height: size,
      child: ClipOval(
        child: dataImageBytes != null
            ? Image.memory(
                dataImageBytes,
                fit: BoxFit.cover,
                gaplessPlayback: true,
              )
            : imageUrl.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.cover,
                errorWidget: (_, _, _) => _buildFallback(),
                placeholder: (_, _) => _buildFallback(),
              )
            : _buildFallback(),
      ),
    );
  }

  Widget _buildFallback() {
    return ColoredBox(
      color: primaryColor.withValues(alpha: 0.1),
      child: Center(
        child: Text(
          company.initial,
          style: TextStyle(
            color: primaryColor,
            fontWeight: FontWeight.w800,
            fontSize: size * 0.36,
            height: 1,
          ),
        ),
      ),
    );
  }
}

/// Search-listing-style product chip for New Post home carousel.
class _NewPostHomeOfferCard extends StatelessWidget {
  const _NewPostHomeOfferCard({
    required this.product,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    this.platformId = '',
    this.onReturnedFromDetails,
  });

  /// Match search-result listing product carousel.
  static const double cardWidth = 96;
  static const double imageHeight = cardWidth;
  static const double imageRadius = 14;

  /// Change these to resize New Post prices.
  static const double priceFontSize = 16;
  static const double originalPriceFontSize = 11;

  /// Strikethrough original price weight — change this (e.g. w400 / w500 / w600).
  static const FontWeight originalPriceFontWeight = FontWeight.w600;

  static const double _priceRowGap = 6;

  final Product product;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String platformId;
  final VoidCallback? onReturnedFromDetails;

  double get _displayPrice {
    final sales = product.salesPrice;
    if (sales != null &&
        sales >= 0 &&
        sales < product.originalPrice) {
      return sales;
    }
    return product.originalPrice;
  }

  bool get _hasDiscountedOriginal {
    final sales = product.salesPrice;
    return sales != null && sales >= 0 && product.originalPrice > sales;
  }

  double _measurePriceWidth(
    BuildContext context, {
    required double amount,
    required double fontSize,
    required FontWeight fontWeight,
  }) {
    final painter = TextPainter(
      text: TextSpan(
        text: formatPesoCurrency(amount, trimTrailingZeros: false),
        style: GoogleFonts.roboto(
          fontSize: fontSize,
          fontWeight: fontWeight,
          height: 1,
        ),
      ),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
      maxLines: 1,
    )..layout();
    return painter.width;
  }

  bool _canShowOriginalBesideSales(BuildContext context) {
    if (!_hasDiscountedOriginal) return false;
    final salesWidth = _measurePriceWidth(
      context,
      amount: _displayPrice,
      fontSize: priceFontSize,
      fontWeight: FontWeight.w600,
    );
    final originalWidth = _measurePriceWidth(
      context,
      amount: product.originalPrice,
      fontSize: originalPriceFontSize,
      fontWeight: originalPriceFontWeight,
    );
    return salesWidth + _priceRowGap + originalWidth <= cardWidth;
  }

  @override
  Widget build(BuildContext context) {
    return ProductCardTapLift(
      onTapWithHero: (heroTag) async {
        await openProductDetailsPage(
          context,
          product,
          heroTag: heroTag,
          platformId: platformId,
        );
        onReturnedFromDetails?.call();
      },
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: handleTap,
            borderRadius: BorderRadius.circular(imageRadius),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: cardWidth,
                  height: imageHeight,
                  child: ProductCardTapLift.liftImage(
                    liftValue: liftValue,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(imageRadius),
                      child: Hero(
                        tag: heroTag,
                        child: _ProductImage(
                          product: product,
                          primaryColor: primaryColor,
                          height: imageHeight,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 7),
                Builder(
                  builder: (context) {
                    final showOriginal = _canShowOriginalBesideSales(context);
                    return Row(
                      children: [
                        Flexible(
                          child: AppPriceText(
                            amount: _displayPrice,
                            color: titleColor,
                            fontSize: priceFontSize,
                            fontWeight: FontWeight.w600,
                            trimTrailingZeros: false,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (showOriginal) ...[
                          const SizedBox(width: _priceRowGap),
                          AppPriceText(
                            amount: product.originalPrice,
                            color: const Color(0xFF9E9E9E),
                            fontSize: originalPriceFontSize,
                            fontWeight: originalPriceFontWeight,
                            decoration: TextDecoration.lineThrough,
                            decorationColor: const Color(0xFF9E9E9E),
                            trimTrailingZeros: false,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    );
                  },
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
        );
      },
    );
  }
}

class _HomeProductOfferCarousel extends StatelessWidget {
  const _HomeProductOfferCarousel({
    required this.title,
    required this.iconAsset,
    required this.productsFuture,
    required this.buildProducts,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    this.platformId = '',
    this.onViewAll,
    this.onReturnedFromProductRoute,
  });

  /// Image (96) + gap (7) + price (~16) + gap (4) + 2-line name (~34).
  static const double carouselHeight = 170;
  static const double cardWidth = _NewPostHomeOfferCard.cardWidth;
  static const int maxProducts = 10;

  final String title;
  final String iconAsset;
  final Future<List<Product>> productsFuture;
  final List<Product> Function(List<Product> products) buildProducts;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String platformId;
  final VoidCallback? onViewAll;
  final VoidCallback? onReturnedFromProductRoute;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Product>>(
      future: productsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData) {
          return const SizedBox.shrink();
        }

        final offers = buildProducts(snapshot.data ?? const <Product>[]);
        if (offers.isEmpty) {
          return const SizedBox.shrink();
        }

        final visible = offers.length <= maxProducts
            ? offers
            : offers.take(maxProducts).toList(growable: false);

        return Material(
          color: backgroundColor,
          child: Padding(
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
                  child: Row(
                    children: [
                      Image.asset(
                        iconAsset,
                        width: 28,
                        height: 28,
                        fit: BoxFit.contain,
                        filterQuality: FilterQuality.high,
                        isAntiAlias: true,
                        excludeFromSemantics: true,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: titleColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Spacer(),
                      if (onViewAll != null)
                        TextButton(
                          onPressed: onViewAll,
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
                                  color: primaryColor,
                                  fontWeight: FontWeight.w700,
                                  height: 1.1,
                                ),
                          ),
                        ),
                    ],
                  ),
                ),
                SizedBox(
                  height: carouselHeight,
                  child: HorizontalEndFade(
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(10, 0, 22, 0),
                      scrollDirection: Axis.horizontal,
                      itemCount: visible.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        return SizedBox(
                          width: cardWidth,
                          child: _NewPostHomeOfferCard(
                            product: visible[index],
                            titleColor: titleColor,
                            secondaryColor: secondaryColor,
                            primaryColor: primaryColor,
                            platformId: platformId,
                            onReturnedFromDetails: onReturnedFromProductRoute,
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

class _HeaderSection extends StatelessWidget {
  const _HeaderSection({
    required this.backgroundColor,
    required this.inactiveColor,
    required this.activeColor,
    this.showsSearchButton = true,
    this.isSearchExpanded = false,
    this.searchController,
    this.searchFocusNode,
    this.searchFieldBackgroundColor,
    this.onSearchChanged,
    this.onSearchClear,
    this.onSearchTapOutside,
    required this.showNewMessagePopup,
    this.title,
    required this.selectedAction,
    required this.onActionTap,
    required this.onSearchTap,
  });

  final Color backgroundColor;
  final Color inactiveColor;
  final Color activeColor;
  final bool showsSearchButton;
  final bool isSearchExpanded;
  final TextEditingController? searchController;
  final FocusNode? searchFocusNode;
  final Color? searchFieldBackgroundColor;
  final ValueChanged<String>? onSearchChanged;
  final VoidCallback? onSearchClear;
  final TapRegionCallback? onSearchTapOutside;
  final bool showNewMessagePopup;
  final String? title;
  final _HeaderAction? selectedAction;
  final ValueChanged<_HeaderAction> onActionTap;
  final VoidCallback onSearchTap;

  @override
  Widget build(BuildContext context) {
    final showsExpandedSearch = isSearchExpanded && searchController != null;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        boxShadow: isDarkMode
            ? [
                BoxShadow(
                  color: Colors.white.withOpacity(0.12),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                  spreadRadius: -8,
                ),
              ]
            : const [],
      ),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                _HeaderIconButton(
                  tooltip: 'Menu',
                  icon: selectedAction == _HeaderAction.menu
                      ? Icons.menu_open_rounded
                      : Icons.menu_rounded,
                  color: selectedAction == _HeaderAction.menu
                      ? activeColor
                      : inactiveColor,
                  onPressed: () => onActionTap(_HeaderAction.menu),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: AnimatedSwitcher(
                    duration: appMotionFrames(13),
                    switchInCurve: Curves.easeOutCubic,
                    switchOutCurve: Curves.easeInCubic,
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
                    child: showsExpandedSearch
                        ? app_search.ProductSearchBar(
                            key: const ValueKey('header-expanded-search-bar'),
                            controller: searchController!,
                            focusNode: searchFocusNode,
                            onChanged: onSearchChanged,
                            onSubmitted: onSearchChanged,
                            onClear: onSearchClear,
                            onTapOutside: onSearchTapOutside,
                            iconColor: activeColor,
                            textColor: Theme.of(context).colorScheme.onSurface,
                            backgroundColor:
                                searchFieldBackgroundColor ?? backgroundColor,

                            autofocus: false,
                            showClearButton: true,
                          )
                        : Align(
                            key: const ValueKey('header-static-content'),
                            alignment: Alignment.centerLeft,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (showNewMessagePopup)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 5,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE53935),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      'New message',
                                      style: Theme.of(context)
                                          .textTheme
                                          .labelSmall
                                          ?.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                  ),
                                if (showNewMessagePopup &&
                                    title != null &&
                                    title!.trim().isNotEmpty)
                                  const SizedBox(width: 10),
                                if (title != null && title!.trim().isNotEmpty)
                                  Text(
                                    title!,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          color: inactiveColor,
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
          ),
          const SizedBox(width: 8),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedSwitcher(
                duration: appMotionFrames(13),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: SizeTransition(
                      sizeFactor: animation,
                      axis: Axis.horizontal,
                      axisAlignment: 1,
                      child: child,
                    ),
                  );
                },
                child: showsExpandedSearch || !showsSearchButton
                    ? const SizedBox.shrink(
                        key: ValueKey('header-search-button-hidden'),
                      )
                    : _HeaderIconButton(
                        key: const ValueKey('header-search-button-visible'),
                        tooltip: 'Search',
                        icon: Icons.search_rounded,
                        color: inactiveColor,
                        onPressed: onSearchTap,
                      ),
              ),
              AnimatedSwitcher(
                duration: appMotionFrames(13),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: SizeTransition(
                      sizeFactor: animation,
                      axis: Axis.horizontal,
                      axisAlignment: 1,
                      child: child,
                    ),
                  );
                },
                child: showsExpandedSearch
                    ? const SizedBox.shrink(
                        key: ValueKey('header-search-actions-hidden'),
                      )
                    : Row(
                        key: const ValueKey('header-search-actions-visible'),
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(width: 2),
                          _HeaderIconButton(
                            tooltip: 'Notifications',
                            icon: Icons.notifications_none_rounded,
                            customIcon: SvgPicture.string(
                              _lucideBellIconSvg,
                              width: 24,
                              height: 24,
                              colorFilter: ColorFilter.mode(
                                selectedAction == _HeaderAction.notification
                                    ? activeColor
                                    : inactiveColor,
                                BlendMode.srcIn,
                              ),
                            ),
                            color: selectedAction == _HeaderAction.notification
                                ? activeColor
                                : inactiveColor,
                            onPressed: () =>
                                onActionTap(_HeaderAction.notification),
                          ),
                          const SizedBox(width: 2),
                          ValueListenableBuilder<List<CartItemData>>(
                            valueListenable:
                                CartStore.instance.cartItemsNotifier,
                            builder: (context, items, child) {
                              final cartColor =
                                  selectedAction == _HeaderAction.cart
                                  ? activeColor
                                  : inactiveColor;
                              return _HeaderIconButton(
                                tooltip: 'Cart',
                                icon: Icons.shopping_cart_outlined,
                                customIcon: _lucideShoppingCartIcon(
                                  color: cartColor,
                                ),
                                color: cartColor,
                                badgeCount: cartEntryCount(items),
                                onPressed: () =>
                                    onActionTap(_HeaderAction.cart),
                              );
                            },
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    super.key,
    required this.tooltip,
    required this.icon,
    required this.color,
    required this.onPressed,
    this.customIcon,
    this.badgeCount = 0,
    this.showBadgeAsDotOnly = false,
    this.padding = const EdgeInsets.all(8),
    this.constraints = const BoxConstraints(),
  });

  final String tooltip;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;
  final Widget? customIcon;
  final int badgeCount;
  final bool showBadgeAsDotOnly;
  final EdgeInsetsGeometry padding;
  final BoxConstraints constraints;

  @override
  Widget build(BuildContext context) {
    final displayBadge = badgeCount > 0;
    final badgeLabel = badgeCount > 99 ? '99+' : '$badgeCount';

    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      padding: padding,
      constraints: constraints,
      icon: SizedBox(
        width: 24,
        height: 24,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Align(
              alignment: Alignment.center,
              child: customIcon ?? Icon(icon, color: color, size: 24),
            ),
            if (displayBadge)
              Positioned(
                top: showBadgeAsDotOnly ? -3 : -7,
                right: showBadgeAsDotOnly ? -3 : -9,
                child: showBadgeAsDotOnly
                    ? Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          color: Color(0xFFE53935),
                          shape: BoxShape.circle,
                        ),
                      )
                    : Container(
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
                          borderRadius: BorderRadius.circular(8),
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
    );
  }
}

class _ProductDashboard extends StatefulWidget {
  const _ProductDashboard({
    required this.productsFuture,
    required this.dealSortMask,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.searchQuery,
    required this.scrollController,
    required this.onRefresh,
    required this.bottomOverscrollSignal,
    required this.onBottomOverscroll,
    this.leadingContent,
    this.skeletonLeadingContent,
    this.onScrollOffsetChanged,
    this.platformId = '',
    this.preservedVisibleCount = 6,
    this.dealSwitchEpoch = 0,
    this.dealSwitchReady = true,
    this.newPostFilterActive = false,
    this.onVisibleCountChanged,
    this.onReturnedFromProductRoute,
  });

  final Future<List<Product>> productsFuture;
  final int dealSortMask;
  final bool newPostFilterActive;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String searchQuery;
  final ScrollController scrollController;
  final Future<void> Function() onRefresh;
  final Widget? leadingContent;
  final Widget? skeletonLeadingContent;
  final ValueChanged<double>? onScrollOffsetChanged;
  final int bottomOverscrollSignal;
  final VoidCallback onBottomOverscroll;
  final String platformId;
  final int preservedVisibleCount;
  final int dealSwitchEpoch;
  final bool dealSwitchReady;
  final ValueChanged<int>? onVisibleCountChanged;
  final VoidCallback? onReturnedFromProductRoute;

  static const double _topSellingCardHeight = 124;
  static const double _homeProductCardBorderRadius = 8;
  /// For You / home grid image size — square (same width & height feel).
  /// Change this number to resize the product card image.
  static const double _homeProductImageSize = 164;

  @override
  State<_ProductDashboard> createState() => _ProductDashboardState();
}

class _ProductDashboardState extends State<_ProductDashboard> {
  static const int _lazyLoadPageSize = _shopDealLazyLoadPageSize;
  static const double _lazyLoadTriggerExtent = 240;

  late int _visibleProductCount;
  List<Product>? _cachedProducts;
  int _dealContentEpoch = 0;
  bool _loadingMoreProducts = false;
  bool _endReachedLoading = false;
  bool _endCheckPending = false;

  @override
  void initState() {
    super.initState();
    _visibleProductCount = widget.preservedVisibleCount < _lazyLoadPageSize
        ? _lazyLoadPageSize
        : widget.preservedVisibleCount;
  }

  void _setVisibleProductCount(int count) {
    if (_visibleProductCount == count) {
      return;
    }
    _visibleProductCount = count;
    widget.onVisibleCountChanged?.call(count);
  }

  bool _matchesSearchQuery(Product product) {
    final normalizedQuery = widget.searchQuery.trim().toLowerCase();
    if (normalizedQuery.isEmpty) {
      return true;
    }

    return product.name.toLowerCase().contains(normalizedQuery) ||
        product.companyName.toLowerCase().contains(normalizedQuery) ||
        product.categoryLabel.toLowerCase().contains(normalizedQuery) ||
        product.description.toLowerCase().contains(normalizedQuery);
  }

  List<Product> _applySearchFilter(List<Product> products) {
    if (widget.searchQuery.trim().isEmpty) {
      return products;
    }

    return products.where(_matchesSearchQuery).toList();
  }

  List<Product> _filterProducts(List<Product> products) {
    final visibleProducts = filterVisibleProducts(products);
    var filteredProducts = List<Product>.from(visibleProducts);

    final hasFlash =
        (widget.dealSortMask & (1 << _dealFilterFlashDealsIndex)) != 0;
    final hasTopSelling =
        (widget.dealSortMask & (1 << _dealFilterTopSellingIndex)) != 0;
    final hasTopRating =
        (widget.dealSortMask & (1 << _dealFilterTopRatingIndex)) != 0;

    // Stacked sorts AND together (e.g. new + flash + top selling).
    if (hasFlash) {
      filteredProducts = filteredProducts
          .where((product) => _discountAmount(product) != null)
          .toList();
    }
    if (hasTopRating) {
      filteredProducts =
          filteredProducts.where(_isTopRatedProduct).toList();
    }
    if (hasTopSelling) {
      final topSellingIds = {
        for (final product in _buildTopSellingProducts(visibleProducts))
          product.id,
      };
      filteredProducts = filteredProducts
          .where((product) => topSellingIds.contains(product.id))
          .toList();
    }
    if (widget.newPostFilterActive) {
      filteredProducts = _buildNewPostProducts(filteredProducts);
    }

    if (hasTopSelling) {
      filteredProducts = [...filteredProducts]
        ..sort((first, second) {
          final soldCompare = second.sold.compareTo(first.sold);
          if (soldCompare != 0) {
            return soldCompare;
          }
          return second.rating.compareTo(first.rating);
        });
    } else if (hasTopRating) {
      filteredProducts = [...filteredProducts]
        ..sort((first, second) {
          final ratingCompare = second.rating.compareTo(first.rating);
          if (ratingCompare != 0) {
            return ratingCompare;
          }
          return second.sold.compareTo(first.sold);
        });
    } else if (!widget.newPostFilterActive && !hasFlash) {
      filteredProducts = [...filteredProducts]
        ..sort(
          (first, second) =>
              first.name.toLowerCase().compareTo(second.name.toLowerCase()),
        );
    }

    return _applySearchFilter(filteredProducts);
  }

  bool get _hasFlashFilter =>
      (widget.dealSortMask & (1 << _dealFilterFlashDealsIndex)) != 0;
  bool get _hasTopSellingFilter =>
      (widget.dealSortMask & (1 << _dealFilterTopSellingIndex)) != 0;
  bool get _hasTopRatingFilter =>
      (widget.dealSortMask & (1 << _dealFilterTopRatingIndex)) != 0;
  bool get _isAllDealFilter =>
      widget.dealSortMask == 0 && !widget.newPostFilterActive;

  IconData get _emptyStateIcon {
    if (widget.newPostFilterActive && widget.dealSortMask == 0) {
      return Icons.new_releases_outlined;
    }
    if (_hasFlashFilter) {
      return Icons.local_offer_outlined;
    }
    if (_hasTopSellingFilter) {
      return Icons.leaderboard_rounded;
    }
    if (_hasTopRatingFilter) {
      return Icons.star_outline_rounded;
    }
    return Icons.inventory_2_outlined;
  }

  String get _emptyStateTitle {
    if (widget.searchQuery.trim().isNotEmpty) {
      return 'No matching products';
    }

    if (widget.newPostFilterActive) {
      final parts = <String>[];
      if (_hasFlashFilter) parts.add('flash deals');
      if (_hasTopSellingFilter) parts.add('top-selling');
      if (_hasTopRatingFilter) parts.add('top-rated');
      if (parts.isEmpty) {
        return 'No new posts yet';
      }
      return 'No new ${parts.join(' + ')} posts';
    }

    if (_hasFlashFilter && !_hasTopSellingFilter && !_hasTopRatingFilter) {
      return 'No flash deals yet';
    }
    if (_hasTopSellingFilter && !_hasFlashFilter && !_hasTopRatingFilter) {
      return 'No top-selling products yet';
    }
    if (_hasTopRatingFilter && !_hasFlashFilter && !_hasTopSellingFilter) {
      return 'No top reviews yet';
    }
    if (widget.dealSortMask != 0) {
      return 'No matching products';
    }
    return 'No products yet';
  }

  String get _emptyStateMessage {
    if (widget.searchQuery.trim().isNotEmpty) {
      return 'Try another product name, category, or clear the search field.';
    }

    if (widget.newPostFilterActive) {
      return 'Products stay in New Post for 30 days after they are added.';
    }

    if (_hasFlashFilter) {
      return 'There are no discounted products right now. Pull down to refresh after adding sale prices.';
    }
    if (_hasTopSellingFilter) {
      return 'Only the top 10 highest-sold products appear here. Add products with sold counts, then pull down to refresh.';
    }
    if (_hasTopRatingFilter) {
      return 'Only products rated 4.5 to 5.0 appear here. Add higher-rated products, then pull down to refresh.';
    }
    return 'Add products in the backend admin page, then pull down to refresh.';
  }

  void _scheduleScrollReset() {
    if (widget.onScrollOffsetChanged == null) {
      return;
    }

    // Keep sticky header / scroll chrome in sync with the real offset when the
    // list is only briefly showing an empty/loading frame.
    if (widget.scrollController.hasClients &&
        widget.scrollController.offset > 0) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.scrollController.hasClients &&
          widget.scrollController.offset > 0) {
        return;
      }
      widget.onScrollOffsetChanged?.call(0);
    });
  }

  @override
  void didUpdateWidget(covariant _ProductDashboard oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.searchQuery != widget.searchQuery) {
      _dealContentEpoch++;
      _setVisibleProductCount(_lazyLoadPageSize);
      return;
    }

    if (oldWidget.dealSortMask != widget.dealSortMask ||
        oldWidget.newPostFilterActive != widget.newPostFilterActive) {
      // Keep each sort tab's lazy-load window; load more only 6 at a time.
      final restored = widget.preservedVisibleCount < _lazyLoadPageSize
          ? _lazyLoadPageSize
          : widget.preservedVisibleCount;
      _setVisibleProductCount(restored);
    } else if (oldWidget.preservedVisibleCount != widget.preservedVisibleCount &&
        widget.preservedVisibleCount > _visibleProductCount) {
      _setVisibleProductCount(widget.preservedVisibleCount);
    }
  }

  int _resolvedVisibleProductCount(int totalCount) {
    if (totalCount <= 0) {
      return 0;
    }

    return _visibleProductCount > totalCount
        ? totalCount
        : _visibleProductCount;
  }

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

  double _estimateProductCardHeight(
    Product product, {
    bool usePortraitImage = false,
  }) {
    final nameLines = _estimateLineCount(
      product.name,
      charsPerLine: 16,
      maxLines: 2,
    );

    // Portrait For You cards use ~3:4 media (~218 on typical phone columns).
    final imageBlock = usePortraitImage ? 218.0 : 180.0;
    return imageBlock +
        58 +
        (nameLines * 18) +
        (product.hasCompanyIdentity ? 24 : 0);
  }

  List<List<Product>> _buildProductColumns(
    List<Product> products, {
    bool usePortraitImage = false,
  }) {
    final columns = [<Product>[], <Product>[]];
    final estimatedHeights = [0.0, 0.0];

    for (final product in products) {
      final targetColumn = estimatedHeights[0] <= estimatedHeights[1] ? 0 : 1;
      columns[targetColumn].add(product);
      estimatedHeights[targetColumn] += _estimateProductCardHeight(
        product,
        usePortraitImage: usePortraitImage,
      );
    }

    return columns;
  }

  bool _loadMoreProductsIfNeeded(int totalCount) {
    if (_visibleProductCount >= totalCount) {
      return false;
    }
    if (_loadingMoreProducts || _endReachedLoading || _endCheckPending) {
      return true;
    }

    setState(() {
      _loadingMoreProducts = true;
    });

    // Keep the footer dots visible briefly; screen stays clamped (no bounce).
    Future<void>.delayed(const Duration(milliseconds: 450), () {
      if (!mounted) return;
      final nextVisibleProductCount = _visibleProductCount + _lazyLoadPageSize;
      setState(() {
        _setVisibleProductCount(
          nextVisibleProductCount > totalCount
              ? totalCount
              : nextVisibleProductCount,
        );
        _loadingMoreProducts = false;
      });
    });

    return true;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return FutureBuilder<List<Product>>(
          future: widget.productsFuture,
          builder: (context, snapshot) {
            if (snapshot.hasData) {
              _cachedProducts = snapshot.data;
            }
            final products =
                snapshot.data ?? _cachedProducts ?? const <Product>[];
            final allTopSellingProducts = _buildTopSellingProducts(products);
            final topSellerIds = {
              for (final product in allTopSellingProducts) product.id,
            };
            final isAllView = _isAllDealFilter;
            final isTopSellingView = _hasTopSellingFilter;
            final isTopReviewView = _hasTopRatingFilter;
            final isNewPostView = widget.newPostFilterActive;
            final isRowListView = isTopSellingView;
            final isFlashDealsView = _hasFlashFilter;
            final topSellingProducts = isTopSellingView
                ? allTopSellingProducts
                : const <Product>[];
            final filteredProducts = _filterProducts(products);
            final visibleProducts = filteredProducts
                .take(_resolvedVisibleProductCount(filteredProducts.length))
                .toList(growable: false);
            final topSellingRanks = isTopSellingView
                ? <String, int>{
                    for (
                      var index = 0;
                      index < topSellingProducts.length;
                      index++
                    )
                      topSellingProducts[index].id: index + 1,
                  }
                : const <String, int>{};
            final productColumns = isRowListView
                ? const <List<Product>>[<Product>[], <Product>[]]
                : _buildProductColumns(visibleProducts);
            final hasMoreProducts =
                visibleProducts.length < filteredProducts.length;
            final leadingItemCount = widget.leadingContent == null ? 0 : 1;
            final contentSwitchKey = Object.hash(
              widget.searchQuery.trim(),
              _dealContentEpoch,
              widget.dealSwitchEpoch,
              widget.dealSortMask,
              widget.newPostFilterActive,
            );
            final contentReady = widget.dealSwitchReady;
            // Skeleton must not share the dashboard ScrollController —
            // MinimumSkeletonReveal's AnimatedSwitcher can keep both children
            // mounted during the fade, which would attach the controller twice.
            Widget buildProductSkeleton() {
              final showMostPopularSkeleton = isAllView;
              return _RefreshStateView(
                onRefresh: widget.onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: widget.backgroundColor,
                leadingContent:
                    widget.skeletonLeadingContent ?? widget.leadingContent,
                onScrollOffsetChanged: widget.onScrollOffsetChanged,
                child: SizedBox(
                  height: constraints.maxHeight,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Keep Most Popular and product-card placeholders in the
                      // same reveal; fall back here when no header was supplied.
                      if (showMostPopularSkeleton &&
                          widget.skeletonLeadingContent == null &&
                          widget.leadingContent == null)
                        SkeletonMostPopularCompanies(
                          columnsPerRow:
                              _MostPopularCompaniesCarousel.columnsPerRow,
                          rowsPerPage:
                              _MostPopularCompaniesCarousel.rowsPerPage,
                          avatarSize:
                              _MostPopularCompaniesCarousel.avatarSize,
                        ),
                      const Expanded(
                        child: SkeletonProductGrid(count: 6),
                      ),
                    ],
                  ),
                ),
              );
            }

            if (snapshot.connectionState == ConnectionState.waiting &&
                products.isEmpty) {
              _scheduleScrollReset();
              return MinimumSkeletonReveal(
                switchKey: contentSwitchKey,
                ready: false,
                minimumDuration: const Duration(seconds: 1),
                skeleton: buildProductSkeleton(),
                child: buildProductSkeleton(),
              );
            }

            if (snapshot.hasError && products.isEmpty) {
              _scheduleScrollReset();
              return _RefreshStateView(
                onRefresh: widget.onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: widget.backgroundColor,
                leadingContent: widget.leadingContent,
                scrollController: widget.scrollController,
                onScrollOffsetChanged: widget.onScrollOffsetChanged,
                child: _DashboardStateCard(
                  icon: Icons.cloud_off_rounded,
                  title: 'Backend not connected',
                  message: snapshot.error.toString(),
                  primaryColor: widget.primaryColor,
                  surfaceColor: widget.backgroundColor,
                  secondaryColor: widget.secondaryColor,
                  borderRadius: 0,
                ),
              );
            }

            if (filteredProducts.isEmpty) {
              _scheduleScrollReset();
              return _RefreshStateView(
                onRefresh: widget.onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: widget.backgroundColor,
                leadingContent: widget.leadingContent,
                scrollController: widget.scrollController,
                onScrollOffsetChanged: widget.onScrollOffsetChanged,
                child: _DashboardStateCard(
                  icon: _emptyStateIcon,
                  title: _emptyStateTitle,
                  message: _emptyStateMessage,
                  primaryColor: widget.primaryColor,
                  surfaceColor: widget.backgroundColor,
                  secondaryColor: widget.secondaryColor,
                  borderRadius: 0,
                  showSearchNotFoundArt: widget.searchQuery.trim().isNotEmpty,
                ),
              );
            }

            return MinimumSkeletonReveal(
              switchKey: contentSwitchKey,
              ready: contentReady,
              minimumDuration: const Duration(seconds: 1),
              skeleton: buildProductSkeleton(),
              child: _SwitchRefreshIndicator(
              onRefresh: widget.onRefresh,
              child: NotificationListener<ScrollNotification>(
                onNotification: (notification) {
                  if (notification.depth != 0 ||
                      notification.metrics.axis != Axis.vertical) {
                    return false;
                  }

                  final offset = notification.metrics.pixels;
                  widget.onScrollOffsetChanged?.call(offset < 0 ? 0 : offset);
                  final remainingDistance =
                      (notification.metrics.maxScrollExtent - offset).clamp(
                        0.0,
                        double.infinity,
                      );
                  var loadedMoreProducts = false;

                  if (hasMoreProducts &&
                      remainingDistance <= _lazyLoadTriggerExtent) {
                    loadedMoreProducts = _loadMoreProductsIfNeeded(
                      filteredProducts.length,
                    );
                  }

                  if (notification is OverscrollNotification &&
                      notification.overscroll > 0 &&
                      notification.metrics.pixels >=
                          notification.metrics.maxScrollExtent) {
                    if (!loadedMoreProducts &&
                        !_loadMoreProductsIfNeeded(filteredProducts.length)) {
                      widget.onBottomOverscroll();
                    }
                  }

                  return false;
                },
                child: ColoredBox(
                  color: widget.backgroundColor,
                  child: RepaintBoundary(
                    child: ListView.builder(
                      key: ValueKey(
                        'shop-deal-scroll-${widget.dealSortMask}-${widget.newPostFilterActive}',
                      ),
                      controller: widget.scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: widget.leadingContent == null
                          ? const EdgeInsets.fromLTRB(10, 10, 10, 0)
                          : EdgeInsets.zero,
                      itemCount:
                          leadingItemCount +
                          (isRowListView ? visibleProducts.length + 1 : 2),
                      itemBuilder: (context, index) {
                        if (widget.leadingContent != null && index == 0) {
                          return widget.leadingContent!;
                        }

                        final dashboardIndex = index - leadingItemCount;
                        final isIndicatorItem = isRowListView
                            ? dashboardIndex == visibleProducts.length
                            : dashboardIndex == 1;
                        if (isIndicatorItem) {
                          return Padding(
                            padding: widget.leadingContent == null
                                ? const EdgeInsets.only(top: 18)
                                : const EdgeInsets.fromLTRB(10, 18, 10, 0),
                            child: NoMoreProductsIndicator(
                              scrollController: widget.scrollController,
                              overscrollSignal: widget.bottomOverscrollSignal,
                              primaryColor: widget.primaryColor,
                              secondaryColor: widget.secondaryColor,
                            ),
                          );
                        }

                        if (isRowListView) {
                          final product = visibleProducts[dashboardIndex];
                          return Padding(
                            padding: widget.leadingContent == null
                                ? EdgeInsets.only(
                                    bottom:
                                        dashboardIndex ==
                                            visibleProducts.length - 1
                                        ? 0
                                        : 12,
                                  )
                                : EdgeInsets.fromLTRB(
                                    10,
                                    dashboardIndex == 0 ? 10 : 0,
                                    10,
                                    dashboardIndex == visibleProducts.length - 1
                                        ? 0
                                        : 12,
                                  ),
                            child: SizedBox(
                              height: _ProductDashboard._topSellingCardHeight,
                              child: _ProductCard(
                                product: product,
                                surfaceColor: widget.surfaceColor,
                                titleColor: widget.titleColor,
                                secondaryColor: widget.secondaryColor,
                                primaryColor: widget.primaryColor,
                                borderRadius: _ProductDashboard
                                    ._homeProductCardBorderRadius,
                                topSellingRank: isTopSellingView
                                    ? topSellingRanks[product.id]
                                    : 11,
                                showTopSellerBadge: false,
                                showTopRatedImageBadge: isTopReviewView,
                                showDiscountInlineBadge: !isFlashDealsView,
                                showNewBadge: isNewPostView,
                                platformId: widget.platformId,
                                onReturnedFromDetails:
                                    widget.onReturnedFromProductRoute,
                              ),
                            ),
                          );
                        }

                        final productGrid = Row(
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
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    for (
                                      var itemIndex = 0;
                                      itemIndex <
                                          productColumns[columnIndex].length;
                                      itemIndex++
                                    ) ...[
                                      if (itemIndex > 0)
                                        const SizedBox(height: 12),
                                      _ProductCard(
                                        product:
                                            productColumns[columnIndex][itemIndex],
                                        surfaceColor: widget.surfaceColor,
                                        titleColor: widget.titleColor,
                                        secondaryColor: widget.secondaryColor,
                                        primaryColor: widget.primaryColor,
                                        borderRadius: _ProductDashboard
                                            ._homeProductCardBorderRadius,
                                        showTopSellerBadge: topSellerIds.contains(
                                          productColumns[columnIndex][itemIndex]
                                              .id,
                                        ),
                                        showTopRatedImageBadge: isTopReviewView,
                                        showDiscountInlineBadge:
                                            !isFlashDealsView,
                                        showNewBadge: isNewPostView,
                                        platformId: widget.platformId,
                                        onReturnedFromDetails:
                                            widget.onReturnedFromProductRoute,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ],
                        );

                        if (widget.leadingContent == null) {
                          return productGrid;
                        }

                        return Padding(
                          padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
                          child: productGrid,
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
            );
          },
        );
      },
    );
  }
}

/// Matches the pure edge-to-edge slide used by the Devices account sub-pages.
///
/// The outgoing page is rasterized before the incoming live tree is mounted.
/// That keeps the visual two-page slide while avoiding duplicate GlobalKeys,
/// FocusNodes, and ScrollControllers during platform changes.
class _PlatformPageTurnTransition extends StatefulWidget {
  const _PlatformPageTurnTransition({
    required this.transitionKey,
    required this.forward,
    required this.duration,
    required this.backgroundColor,
    required this.child,
  });

  final String transitionKey;
  final bool forward;
  final Duration duration;
  final Color backgroundColor;
  final Widget child;

  @override
  State<_PlatformPageTurnTransition> createState() =>
      _PlatformPageTurnTransitionState();
}

class _PlatformPageTurnTransitionState
    extends State<_PlatformPageTurnTransition>
    with SingleTickerProviderStateMixin {
  final GlobalKey _captureKey = GlobalKey();
  late final AnimationController _controller;
  late final Animation<double> _curvedAnimation;
  late String _displayedKey;
  late Widget _displayedChild;
  late Color _displayedBackgroundColor;
  String? _pendingKey;
  Widget? _pendingChild;
  Color? _pendingBackgroundColor;
  bool _pendingForward = true;
  bool _capturing = false;
  bool _transitioning = false;
  bool _slideForward = true;
  ui.Image? _outgoingSnapshot;

  @override
  void initState() {
    super.initState();
    _displayedKey = widget.transitionKey;
    _displayedChild = widget.child;
    _displayedBackgroundColor = widget.backgroundColor;
    _slideForward = widget.forward;
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..value = 1;
    _curvedAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Cubic(0.22, 1.0, 0.36, 1.0),
    );
  }

  @override
  void didUpdateWidget(covariant _PlatformPageTurnTransition oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.duration != widget.duration) {
      _controller.duration = widget.duration;
    }

    if (widget.transitionKey == _displayedKey) {
      _displayedChild = widget.child;
      _displayedBackgroundColor = widget.backgroundColor;
      _pendingKey = null;
      _pendingChild = null;
      _pendingBackgroundColor = null;
      return;
    }

    _pendingKey = widget.transitionKey;
    _pendingChild = widget.child;
    _pendingBackgroundColor = widget.backgroundColor;
    _pendingForward = widget.forward;
    if (!_capturing && !_controller.isAnimating) {
      unawaited(_startPageTurn());
    }
  }

  Future<ui.Image?> _captureDisplayedPage() async {
    await WidgetsBinding.instance.endOfFrame;
    if (!mounted) return null;
    final boundary =
        _captureKey.currentContext?.findRenderObject()
            as RenderRepaintBoundary?;
    if (boundary == null) return null;

    final pixelRatio = math.min(View.of(context).devicePixelRatio, 1.5);
    try {
      return await boundary.toImage(pixelRatio: pixelRatio);
    } catch (_) {
      return null;
    }
  }

  Future<void> _startPageTurn() async {
    if (_capturing || _controller.isAnimating || _pendingKey == null) return;
    _capturing = true;
    final snapshot = await _captureDisplayedPage();
    if (!mounted) {
      snapshot?.dispose();
      return;
    }

    final nextKey = _pendingKey;
    final nextChild = _pendingChild;
    if (nextKey == null || nextChild == null || nextKey == _displayedKey) {
      snapshot?.dispose();
      _capturing = false;
      return;
    }

    final previousSnapshot = _outgoingSnapshot;
    setState(() {
      _outgoingSnapshot = snapshot;
      _displayedKey = nextKey;
      _displayedChild = nextChild;
      _displayedBackgroundColor =
          _pendingBackgroundColor ?? widget.backgroundColor;
      _slideForward = _pendingForward;
      _pendingKey = null;
      _pendingChild = null;
      _pendingBackgroundColor = null;
      _capturing = false;
      _transitioning = true;
    });
    previousSnapshot?.dispose();

    try {
      await _controller.forward(from: 0).orCancel;
    } on TickerCanceled {
      return;
    }
    if (!mounted) return;

    final completedSnapshot = _outgoingSnapshot;
    setState(() {
      _outgoingSnapshot = null;
      _transitioning = false;
    });
    completedSnapshot?.dispose();

    if (_pendingKey != null && _pendingKey != _displayedKey) {
      unawaited(_startPageTurn());
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _outgoingSnapshot?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: AnimatedBuilder(
        animation: _curvedAnimation,
        builder: (context, _) {
          final t = _curvedAnimation.value;
          final outgoingDx = _slideForward ? -t : t;
          final incomingDx = !_transitioning
              ? 0.0
              : (_slideForward ? 1.0 - t : t - 1.0);
          final outgoingSnapshot = _outgoingSnapshot;

          return Stack(
            fit: StackFit.expand,
            children: [
              if (_transitioning && outgoingSnapshot != null)
                FractionalTranslation(
                  translation: Offset(outgoingDx, 0),
                  child: ColoredBox(
                    color: widget.backgroundColor,
                    child: RawImage(
                      image: outgoingSnapshot,
                      fit: BoxFit.fill,
                      filterQuality: FilterQuality.low,
                    ),
                  ),
                ),
              FractionalTranslation(
                translation: Offset(incomingDx, 0),
                child: RepaintBoundary(
                  key: _captureKey,
                  child: ColoredBox(
                    color: _displayedBackgroundColor,
                    child: _displayedChild,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CompanyListing {
  const _CompanyListing({
    required this.id,
    required this.adminId,
    required this.name,
    required this.storeType,
    required this.pictureUrl,
    required this.productCount,
    required this.soldCount,
    required this.categories,
    required this.latestProduct,
  });

  final String id;
  final String adminId;
  final String name;
  final String storeType;
  final String pictureUrl;
  final int productCount;
  final int soldCount;
  final List<String> categories;
  final Product? latestProduct;

  bool get hasListings => productCount > 0;

  String get displayImageUrl {
    final companyImageUrl = pictureUrl.trim();
    if (companyImageUrl.isNotEmpty) {
      return companyImageUrl;
    }

    return latestProduct?.cardDisplayImageUrl ?? '';
  }

  String get initial {
    final normalizedName = name.trim();
    if (normalizedName.isEmpty) {
      return '?';
    }

    return normalizedName[0].toUpperCase();
  }

  String get listingCountLabel =>
      '$productCount listing${productCount == 1 ? '' : 's'}';

  String get statusLabel => hasListings
      ? listingCountLabel
      : AppBuyerLanguages.t(AppLanguagePreference.code, 'platform.soon');

  String get storeTypeLabel {
    final normalizedStoreType = storeType.trim();
    return normalizedStoreType.isEmpty ? 'Store Type' : normalizedStoreType;
  }

  String get storeTypeWithSoldLabel {
    return '$storeTypeLabel · ${_formatCompactCount(soldCount < 0 ? 0 : soldCount)} sold';
  }
}

class _MutableCompanyListing {
  _MutableCompanyListing({
    required this.id,
    required this.adminId,
    required String name,
    required String storeType,
    required String pictureUrl,
  }) : name = name.trim().isEmpty ? 'Company' : name.trim(),
       storeType = storeType.trim(),
       pictureUrl = pictureUrl.trim();

  final String id;
  String adminId;
  String name;
  String storeType;
  String pictureUrl;
  Product? latestProduct;
  int productCount = 0;
  int soldCount = 0;
  final Set<String> categories = <String>{};

  void addProduct(Product product) {
    productCount += 1;
    final productSold = product.sold < 0 ? 0 : product.sold;
    soldCount += productSold;

    final nextAdminId = product.adminId.trim();
    if (adminId.isEmpty && nextAdminId.isNotEmpty) {
      adminId = nextAdminId;
    }

    final nextName = product.companyName.trim();
    if ((name == 'Company' || name.isEmpty) && nextName.isNotEmpty) {
      name = nextName;
    }

    final nextPictureUrl = product.companyPictureUrl.trim();
    if (pictureUrl.isEmpty && nextPictureUrl.isNotEmpty) {
      pictureUrl = nextPictureUrl;
    }

    categories.addAll(
      product.categoryList.where((category) => category.isNotEmpty),
    );

    final currentLatestProduct = latestProduct;
    if (currentLatestProduct == null ||
        product.createdAt.isAfter(currentLatestProduct.createdAt)) {
      latestProduct = product;
    }
  }

  _CompanyListing toCompanyListing() {
    return _CompanyListing(
      id: id,
      adminId: adminId,
      name: name.trim().isEmpty ? 'Company' : name.trim(),
      storeType: storeType,
      pictureUrl: pictureUrl,
      productCount: productCount,
      soldCount: soldCount < 0 ? 0 : soldCount,
      categories: categories.toList(growable: false),
      latestProduct: latestProduct,
    );
  }
}

bool _isSvgAssetUrl(String url) {
  final trimmed = url.trim().toLowerCase();
  if (trimmed.isEmpty) return false;
  final path = Uri.tryParse(trimmed)?.path.toLowerCase() ?? trimmed;
  return path.endsWith('.svg') ||
      trimmed.contains('image/svg') ||
      trimmed.contains('format=svg');
}

String? _homeBuyerPlatformLabelArt(BuyerPlatformSummary platform) {
  // Shop and Food use the app's fixed 3D artwork.  Do this before looking at
  // backend-provided icons so their small, rounded icons stay as smooth and
  // consistent as the Top Searches 3D artwork.
  return switch (platform.id.trim().toLowerCase()) {
    'shop' => _shopHomeLabelArtAsset,
    'food' => _foodPlatformIconAsset,
    _ => null,
  };
}

double _buyerPlatformIconDisplaySize(BuyerPlatformSummary platform) {
  return switch (platform.id.trim().toLowerCase()) {
    'food' => 32.0,
    'shop' => 30.0,
    _ => 22.0,
  };
}

/// Lucide SVGs matching `main_dart.js` PLATFORM_ICON_SVGS.
String _buyerPlatformFallbackSvg(BuyerPlatformSummary platform) {
  final named = platform.iconName.trim().toLowerCase();
  final id = platform.id.trim().toLowerCase();
  if (named == 'utensils' || id == 'food') {
    return '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
  <path d="M7 2v20"/>
  <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
</svg>''';
  }
  if (named == 'hotel' || id == 'hotels' || id == 'hotel') {
    return '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 22v-6.57"/>
  <path d="M12 11h.01"/>
  <path d="M12 7h.01"/>
  <path d="M14 15.43V22"/>
  <path d="M15 16a5 5 0 0 0-6 0"/>
  <path d="M16 11h.01"/>
  <path d="M16 7h.01"/>
  <path d="M8 11h.01"/>
  <path d="M8 7h.01"/>
  <rect x="4" y="2" width="16" height="20" rx="2"/>
</svg>''';
  }
  if (named == 'tree-palm' ||
      id == 'resort' ||
      id.contains('resort') ||
      id.contains('palm')) {
    return '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/>
  <path d="M13 7.14A7.76 7.76 0 0 1 15.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/>
  <path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"/>
  <path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-2 2-4 2-6"/>
</svg>''';
  }
  return '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/>
  <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/>
  <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>
</svg>''';
}

Widget _buyerPlatformSvgIcon({
  required BuyerPlatformSummary platform,
  required Color color,
  double size = 22,
}) {
  final iconUrl = platform.iconImageUrl.trim();
  if (iconUrl.isNotEmpty && _isSvgAssetUrl(iconUrl)) {
    return SvgPicture.network(
      iconUrl,
      width: size,
      height: size,
      fit: BoxFit.contain,
      placeholderBuilder: (_) => SizedBox(width: size, height: size),
    );
  }
  if (iconUrl.isNotEmpty) {
    return CachedNetworkImage(
      imageUrl: iconUrl,
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorWidget: (context, url, error) => SvgPicture.string(
        _buyerPlatformFallbackSvg(platform),
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      ),
    );
  }
  return SvgPicture.string(
    _buyerPlatformFallbackSvg(platform),
    width: size,
    height: size,
    colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
  );
}

class _BuyerPlatformPicker extends StatefulWidget {
  const _BuyerPlatformPicker({
    super.key,
    required this.platformsFuture,
    required this.storeTypesFuture,
    required this.sellersFuture,
    required this.productsFuture,
    this.catalogScrollController,
    this.onScrollOffsetChanged,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.isLoggedIn,
    required this.accountName,
    required this.accountInitials,
    required this.accountImageUrl,
    required this.showRefreshSkeleton,
    this.showSiteHeader = true,
    this.onSearchModeChanged,
    required this.onRefresh,
    this.onSearchRefresh,
    required this.onConnectivityCheck,
    required this.onOfflineSkeleton,
    required this.onSelect,
    required this.onSearchSubmitted,
    required this.onLiveSearchHit,
    required this.onNotificationTap,
    required this.onAccountTap,
  });

  final Future<List<BuyerPlatformSummary>> platformsFuture;
  final Future<List<StoreTypeSummary>> storeTypesFuture;
  final Future<List<SellerSummary>> sellersFuture;
  final Future<List<Product>> productsFuture;
  final ScrollController? catalogScrollController;
  final ValueChanged<double>? onScrollOffsetChanged;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final bool isLoggedIn;
  final String accountName;
  final String accountInitials;
  final String accountImageUrl;
  final bool showRefreshSkeleton;
  /// When false, site header is pinned outside the tab-slide body.
  final bool showSiteHeader;
  final ValueChanged<bool>? onSearchModeChanged;
  final Future<void> Function() onRefresh;
  final Future<void> Function()? onSearchRefresh;
  final Future<bool> Function() onConnectivityCheck;
  final Future<void> Function() onOfflineSkeleton;
  final ValueChanged<BuyerPlatformSummary> onSelect;
  final ValueChanged<String> onSearchSubmitted;
  final ValueChanged<app_search.BuyerLiveSearchHit> onLiveSearchHit;
  final VoidCallback onNotificationTap;
  final VoidCallback onAccountTap;

  @override
  State<_BuyerPlatformPicker> createState() => _BuyerPlatformPickerState();
}

class _BuyerPlatformPickerState extends State<_BuyerPlatformPicker> {
  late final TextEditingController _searchController;
  late final FocusNode _searchFocusNode;
  late Future<_BuyerLiveSearchCatalog> _liveSearchCatalogFuture;
  final GlobalKey _platformChromeKey = GlobalKey();
  Timer? _placeholderTimer;
  String _placeholderHint = 'Search ';
  List<String> _placeholderPhrases = const <String>['everything'];
  int _phraseIndex = 0;
  int _charIndex = 0;
  String _placeholderMode = 'typing'; // typing | holding | deleting
  bool _searchMode = false;
  bool _scanMatching = false;

  /// When set and equal to the bar text, show platform/listing results.
  /// While typing a different draft, show possible searches instead.
  String _committedSearchQuery = '';
  int _contentEpoch = 0;
  int _lastPlatformCount = 3;
  static const int _liveSearchInitialSectionLimit = 4;
  static const int _liveSearchSectionLimitStep = 4;
  static const int _liveSearchSectionLimitMax = 48;
  int _liveSearchHitSectionLimit = _liveSearchInitialSectionLimit;
  int _liveSearchHitsAtLastExpand = -1;
  bool _liveSearchHitsExhausted = false;

  /// Platform filter for live "Showing results" (`all` / `shop` / `food` / …).
  String _liveSearchPlatformFilter = 'all';
  /// Filters the user already opened (no skeleton on revisit).
  final Set<String> _visitedLiveSearchFilterIds = <String>{'all'};
  bool _liveSearchFilterSlideForward = true;
  bool _liveSearchFilterShowSkeleton = false;
  Timer? _liveSearchFilterSkeletonTimer;
  /// After committing a possible search, hold chips + results skeleton together.
  bool _liveSearchCommitShowSkeleton = false;
  int _liveSearchCommitEpoch = 0;

  void _resetLiveSearchHitPagination() {
    _liveSearchHitSectionLimit = _liveSearchInitialSectionLimit;
    _liveSearchHitsAtLastExpand = -1;
    _liveSearchHitsExhausted = false;
  }

  void _clearLiveSearchCommitSkeleton() {
    _liveSearchCommitShowSkeleton = false;
  }

  void _beginLiveSearchCommitSkeleton() {
    _liveSearchCommitShowSkeleton = true;
    _liveSearchCommitEpoch++;
  }

  void _resetLiveSearchPlatformFilter() {
    _liveSearchFilterSkeletonTimer?.cancel();
    _liveSearchFilterSkeletonTimer = null;
    _clearLiveSearchCommitSkeleton();
    _liveSearchPlatformFilter = 'all';
    _visitedLiveSearchFilterIds
      ..clear()
      ..add('all');
    _liveSearchFilterShowSkeleton = false;
    _liveSearchFilterSlideForward = true;
  }

  void _selectLiveSearchPlatformFilter(
    String id, {
    required List<({String id, String label})> platformsWithHits,
  }) {
    final nextId = id.trim().toLowerCase();
    if (nextId.isEmpty || nextId == _liveSearchPlatformFilter) return;

    final order = <String>[
      'all',
      for (final platform in platformsWithHits) platform.id,
    ];
    final oldIndex = order.indexOf(_liveSearchPlatformFilter);
    final newIndex = order.indexOf(nextId);
    final forward = newIndex >= oldIndex;
    final firstVisit = !_visitedLiveSearchFilterIds.contains(nextId);

    _liveSearchFilterSkeletonTimer?.cancel();
    setState(() {
      _liveSearchFilterSlideForward = forward;
      _liveSearchPlatformFilter = nextId;
      _resetLiveSearchHitPagination();
      _liveSearchFilterShowSkeleton = firstVisit;
    });

    if (!firstVisit) return;

    _liveSearchFilterSkeletonTimer = Timer(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() {
        _liveSearchFilterShowSkeleton = false;
        _visitedLiveSearchFilterIds.add(nextId);
      });
    });
  }

  String _liveSearchHitPlatformId(app_search.BuyerLiveSearchHit hit) {
    final fromPlatform = hit.platform?.id.trim().toLowerCase() ?? '';
    if (fromPlatform.isNotEmpty) return fromPlatform;
    final fromId = hit.platformId.trim().toLowerCase();
    return fromId.isEmpty ? 'shop' : fromId;
  }

  String _liveSearchHitPlatformLabel(app_search.BuyerLiveSearchHit hit) {
    final name = hit.platform?.name.trim() ?? '';
    if (name.isNotEmpty) return name;
    final id = _liveSearchHitPlatformId(hit);
    if (id.isEmpty) return 'Shop';
    return '${id[0].toUpperCase()}${id.substring(1)}';
  }

  /// Platforms that actually appear in [hits], ordered shop → food → others.
  List<({String id, String label})> _liveSearchPlatformsWithHits(
    List<app_search.BuyerLiveSearchHit> hits,
  ) {
    final labels = <String, String>{};
    for (final hit in hits) {
      final id = _liveSearchHitPlatformId(hit);
      labels.putIfAbsent(id, () => _liveSearchHitPlatformLabel(hit));
    }

    final ordered = <({String id, String label})>[];
    for (final id in const <String>['shop', 'food']) {
      final label = labels.remove(id);
      if (label != null) {
        ordered.add((id: id, label: label));
      }
    }
    final rest = labels.entries.toList()
      ..sort((a, b) => a.value.toLowerCase().compareTo(b.value.toLowerCase()));
    for (final entry in rest) {
      ordered.add((id: entry.key, label: entry.value));
    }
    return ordered;
  }

  List<app_search.BuyerLiveSearchHit> _filterLiveSearchHitsByPlatform(
    List<app_search.BuyerLiveSearchHit> hits,
    String platformFilter,
  ) {
    final wanted = platformFilter.trim().toLowerCase();
    if (wanted.isEmpty || wanted == 'all') return hits;
    return hits
        .where((hit) => _liveSearchHitPlatformId(hit) == wanted)
        .toList(growable: false);
  }

  void _requestMoreLiveSearchHits(int currentHitCount) {
    if (_liveSearchHitsExhausted ||
        _liveSearchHitSectionLimit >= _liveSearchSectionLimitMax) {
      return;
    }
    _liveSearchHitsAtLastExpand = currentHitCount;
    setState(() {
      _liveSearchHitSectionLimit = math.min(
        _liveSearchHitSectionLimit + _liveSearchSectionLimitStep,
        _liveSearchSectionLimitMax,
      );
    });
  }

  void _syncLiveSearchHitExhausted(int hitCount) {
    if (_liveSearchHitsAtLastExpand < 0) return;
    if (hitCount <= _liveSearchHitsAtLastExpand) {
      _liveSearchHitsExhausted = true;
    }
    _liveSearchHitsAtLastExpand = -1;
  }

  /// Reset all body content for pull-to-refresh. Site header is left untouched.
  void prepareForPullRefresh() {
    if (!mounted) return;
    _placeholderTimer?.cancel();
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() {
      _setSearchMode(false);
      _scanMatching = false;
      _committedSearchQuery = '';
      _resetLiveSearchHitPagination();
      _resetLiveSearchPlatformFilter();
      _contentEpoch++;
      _phraseIndex = 0;
      _charIndex = 0;
      _placeholderMode = 'typing';
      _placeholderHint = AppBuyerLanguages.t(
        AppLanguagePreference.code,
        'platform.search.prefix',
      );
    });
    _liveSearchCatalogFuture = _resolveLiveSearchCatalog();
    _schedulePlaceholderStep(280);
  }

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _searchFocusNode = FocusNode()..addListener(_onSearchFocusChanged);
    _searchController.addListener(_onSearchTextChanged);
    _liveSearchCatalogFuture = _resolveLiveSearchCatalog();
    _placeholderHint = AppBuyerLanguages.t(
      AppLanguagePreference.code,
      'platform.search.prefix',
    );
    _placeholderPhrases = <String>[
      AppBuyerLanguages.t(
        AppLanguagePreference.code,
        'platform.search.everythingWord',
      ),
    ];
    AppLanguagePreference.codeNotifier.addListener(_onLanguageChanged);
    _schedulePlaceholderStep(280);
  }

  void _onLanguageChanged() {
    if (!mounted) return;
    final lang = AppLanguagePreference.code;
    setState(() {
      _placeholderHint = AppBuyerLanguages.t(lang, 'platform.search.prefix');
      _phraseIndex = 0;
      _charIndex = 0;
      _placeholderMode = 'typing';
    });
  }

  @override
  void didUpdateWidget(covariant _BuyerPlatformPicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.platformsFuture, widget.platformsFuture) ||
        !identical(oldWidget.storeTypesFuture, widget.storeTypesFuture) ||
        !identical(oldWidget.sellersFuture, widget.sellersFuture) ||
        !identical(oldWidget.productsFuture, widget.productsFuture)) {
      _liveSearchCatalogFuture = _resolveLiveSearchCatalog();
    }
  }

  Future<_BuyerLiveSearchCatalog> _resolveLiveSearchCatalog() async {
    List<BuyerPlatformSummary> platforms;
    try {
      platforms = await widget.platformsFuture;
    } catch (_) {
      platforms = _defaultBuyerPlatforms();
    }
    if (platforms.isEmpty) {
      platforms = _defaultBuyerPlatforms();
    }

    List<StoreTypeSummary> storeTypes;
    try {
      storeTypes = await widget.storeTypesFuture;
    } catch (_) {
      storeTypes = const <StoreTypeSummary>[];
    }

    List<SellerSummary> sellers;
    try {
      sellers = await widget.sellersFuture;
    } catch (_) {
      sellers = const <SellerSummary>[];
    }

    List<Product> products;
    try {
      products = await widget.productsFuture;
    } catch (_) {
      products = const <Product>[];
    }

    return _BuyerLiveSearchCatalog(
      platforms: platforms,
      storeTypes: storeTypes,
      sellers: sellers,
      products: products,
    );
  }

  Future<void> _refreshLiveSearchCatalog() async {
    // Search-only refresh — never fan out to home/platform pull.
    // Kick a new catalog future first so the results panel can show skeleton
    // immediately while platform/product fetches run underneath.
    if (!mounted) return;
    setState(() {
      _liveSearchCatalogFuture = _resolveLiveSearchCatalog();
    });

    final searchRefresh = widget.onSearchRefresh;
    if (searchRefresh != null) {
      await searchRefresh();
      if (!mounted) return;
      setState(() {
        _liveSearchCatalogFuture = _resolveLiveSearchCatalog();
      });
    } else {
      unawaited(fetchSearchResultVouchers(forceRefresh: true));
    }
    await _liveSearchCatalogFuture;
  }

  @override
  void dispose() {
    AppLanguagePreference.codeNotifier.removeListener(_onLanguageChanged);
    _placeholderTimer?.cancel();
    _searchController.removeListener(_onSearchTextChanged);
    _searchFocusNode.removeListener(_onSearchFocusChanged);
    _liveSearchFilterSkeletonTimer?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onSearchFocusChanged() {
    if (_searchFocusNode.hasFocus) {
      _placeholderTimer?.cancel();
      if (!_searchMode) {
        setState(() {
          _setSearchMode(true);
        });
        _notifyScrollChromeReset();
        _keepSearchFocus();
        return;
      }
    } else if (_searchController.text.trim().isEmpty && !_searchMode) {
      _schedulePlaceholderStep(280);
    }
    setState(() {});
  }

  void _keepSearchFocus() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_searchMode) return;
      if (!_searchFocusNode.hasFocus) {
        _searchFocusNode.requestFocus();
      }
    });
  }

  void _onSearchTextChanged() {
    final draft = _searchController.text.trim();
    if (draft.isNotEmpty) {
      _placeholderTimer?.cancel();
    } else if (!_searchFocusNode.hasFocus && !_searchMode) {
      _schedulePlaceholderStep(280);
    }
    // Typing a different draft leaves committed results and shows possibles.
    if (draft.isEmpty ||
        draft.toLowerCase() != _committedSearchQuery.toLowerCase()) {
      _committedSearchQuery = '';
      _resetLiveSearchPlatformFilter();
    }
    setState(() {});
  }

  /// Scan stays on this Home search. Detected YOLO/approved name goes in the bar.
  Future<void> runScanIntoHomeSearch(
    ProductRepository productRepository,
  ) async {
    if (_scanMatching) {
      return;
    }

    final capture = await app_search.pickVisualSearchCameraImage();
    if (!mounted || capture == null) {
      return;
    }

    _placeholderTimer?.cancel();
    _searchController.clear();
    setState(() {
      _setSearchMode(true);
      _scanMatching = true;
    });

    String detected = '';
    try {
      detected = await app_search.detectApprovedScanSearchLabel(
        productRepository: productRepository,
        imageBytes: capture.imageBytes,
        filename: capture.filename,
        imagePath: capture.imagePath,
      );
    } catch (_) {
      detected = '';
    }

    if (!mounted) {
      return;
    }

    final label = detected.trim();
    if (label.isEmpty) {
      _searchController.clear();
      setState(() {
        _setSearchMode(false);
        _scanMatching = false;
        _committedSearchQuery = '';
        _resetLiveSearchPlatformFilter();
      });
      _schedulePlaceholderStep(280);
      AppSnackBar.showInfo(context, message: 'No match. Nothing was scanned.');
      return;
    }

    _committedSearchQuery = label;
    _resetLiveSearchHitPagination();
    _resetLiveSearchPlatformFilter();
    _beginLiveSearchCommitSkeleton();
    _searchController.value = TextEditingValue(
      text: label,
      selection: TextSelection.collapsed(offset: label.length),
    );
    setState(() {
      _setSearchMode(true);
      _scanMatching = false;
    });
  }

  bool get _shouldPausePlaceholder {
    if (_searchMode) return true;
    if (_searchFocusNode.hasFocus) return true;
    if (_searchController.text.trim().isNotEmpty) return true;
    return false;
  }

  bool _isPlaceholderPlatformAvailable(BuyerPlatformSummary item) {
    if (item.comingSoon) return false;
    final status = item.status.trim().toLowerCase();
    return status != 'inactive' &&
        status != 'deactivated' &&
        status != 'disabled' &&
        status != 'unavailable';
  }

  void _syncPlaceholderPhrases(List<BuyerPlatformSummary> platforms) {
    final lang = AppLanguagePreference.code;
    final everythingWord = AppBuyerLanguages.t(
      lang,
      'platform.search.everythingWord',
    );
    final names = platforms
        .where(_isPlaceholderPlatformAvailable)
        .map((item) => item.name.trim())
        .where((name) => name.isNotEmpty)
        .toList(growable: false);
    final next = <String>[...names, everythingWord];
    if (next.join('|') == _placeholderPhrases.join('|')) return;
    _placeholderPhrases = next;
    _phraseIndex = 0;
    _charIndex = 0;
    _placeholderMode = 'typing';
    _placeholderHint = AppBuyerLanguages.t(lang, 'platform.search.prefix');
  }

  void _schedulePlaceholderStep(int delayMs) {
    _placeholderTimer?.cancel();
    _placeholderTimer = Timer(
      Duration(milliseconds: delayMs),
      _runPlaceholderStep,
    );
  }

  void _runPlaceholderStep() {
    if (!mounted) return;
    if (_shouldPausePlaceholder) {
      _schedulePlaceholderStep(400);
      return;
    }
    final lang = AppLanguagePreference.code;
    final searchPrefix = AppBuyerLanguages.t(lang, 'platform.search.prefix');
    if (_placeholderPhrases.isEmpty) {
      _placeholderPhrases = <String>[
        AppBuyerLanguages.t(lang, 'platform.search.everythingWord'),
      ];
    }
    final phrase =
        _placeholderPhrases[_phraseIndex % _placeholderPhrases.length];

    if (_placeholderMode == 'typing') {
      _charIndex = (_charIndex + 1).clamp(0, phrase.length);
      setState(() {
        _placeholderHint = '$searchPrefix${phrase.substring(0, _charIndex)}';
      });
      if (_charIndex >= phrase.length) {
        _placeholderMode = 'holding';
        _schedulePlaceholderStep(1400);
        return;
      }
      _schedulePlaceholderStep(72);
      return;
    }

    if (_placeholderMode == 'holding') {
      _placeholderMode = 'deleting';
      _schedulePlaceholderStep(40);
      return;
    }

    _charIndex = (_charIndex - 1).clamp(0, phrase.length);
    setState(() {
      _placeholderHint = '$searchPrefix${phrase.substring(0, _charIndex)}';
    });
    if (_charIndex <= 0) {
      _placeholderMode = 'typing';
      _phraseIndex = (_phraseIndex + 1) % _placeholderPhrases.length;
      _schedulePlaceholderStep(320);
      return;
    }
    _schedulePlaceholderStep(36);
  }

  bool get _isSearchActive => _searchMode;

  void _setSearchMode(bool value) {
    if (_searchMode == value) return;
    _searchMode = value;
    widget.onSearchModeChanged?.call(value);
  }

  Widget _wrapScrollChrome(Widget child) {
    final onScroll = widget.onScrollOffsetChanged;
    if (onScroll == null) return child;
    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        if (notification.metrics.axis != Axis.vertical) {
          return false;
        }
        // depth 0 = primary results/catalog list; ignore nested carousels.
        if (notification.depth != 0) {
          return false;
        }
        if (notification is ScrollUpdateNotification ||
            notification is OverscrollNotification ||
            notification is ScrollEndNotification) {
          final offset = notification.metrics.pixels;
          onScroll(offset < 0 ? 0 : offset);
        }
        return false;
      },
      child: child,
    );
  }

  void _notifyScrollChromeReset() {
    widget.onScrollOffsetChanged?.call(0);
  }

  void _cancelSearch() {
    _placeholderTimer?.cancel();
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() {
      _setSearchMode(false);
      _scanMatching = false;
      _committedSearchQuery = '';
      _resetLiveSearchPlatformFilter();
    });
    _resetLiveSearchHitPagination();
    _notifyScrollChromeReset();
    _schedulePlaceholderStep(280);
  }

  void _submitSearch([String? value]) {
    final query = (value ?? _searchController.text).trim();
    if (query.isEmpty) {
      return;
    }
    // Enter commits to live platform/listing results (same as picking a possible).
    _committedSearchQuery = query;
    _resetLiveSearchHitPagination();
    _resetLiveSearchPlatformFilter();
    _beginLiveSearchCommitSkeleton();
    _searchController.value = TextEditingValue(
      text: query,
      selection: TextSelection.collapsed(offset: query.length),
    );
    setState(() {
      _setSearchMode(true);
    });
    _searchFocusNode.unfocus();
    unawaited(recordBuyerSearchEvent(query));
  }

  void _applySuggestion(String term) {
    final query = term.trim();
    if (query.isEmpty) return;
    // Commit first so the text listener does not clear it.
    _committedSearchQuery = query;
    _resetLiveSearchHitPagination();
    _resetLiveSearchPlatformFilter();
    _beginLiveSearchCommitSkeleton();
    _searchController.value = TextEditingValue(
      text: query,
      selection: TextSelection.collapsed(offset: query.length),
    );
    setState(() {
      _setSearchMode(true);
    });
    _searchFocusNode.unfocus();
    unawaited(recordBuyerSearchEvent(query));
  }

  void _selectLiveHit(app_search.BuyerLiveSearchHit hit) {
    // Keep search mode + query under the pushed route so Back restores results.
    _searchFocusNode.unfocus();
    widget.onLiveSearchHit(hit);
  }

  Future<void> _openLanguagePicker() async {
    _searchFocusNode.unfocus();
    final current = AppLanguagePreference.code;
    if (!mounted) return;
    final selected = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) {
        return LoginLanguagePickerSheet(selectedCode: current);
      },
    );
    if (!mounted || selected == null) return;
    await AppLanguagePreference.setLanguage(selected);
  }

  @override
  Widget build(BuildContext context) {
    // Match main_dart.html platform home: brand header + soft wash + centered picker.
    final statusTop = MediaQuery.paddingOf(context).top;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final transparentBars = BuyerRightPanelHost.transparentOverlayStyle(
      isDark: isDark,
    );

    final body = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.alphaBlend(
              widget.primaryColor.withValues(alpha: 0.14),
              widget.backgroundColor,
            ),
            widget.backgroundColor,
            Color.alphaBlend(
              const Color(0xFF079985).withValues(alpha: 0.08),
              widget.backgroundColor,
            ),
          ],
        ),
      ),
      child: SafeArea(
        top: false,
        // Draw under the system nav so the dashboard wash stays visible while
        // scrolling search results (nav bar itself stays transparent).
        bottom: false,
        child: FutureBuilder<List<BuyerPlatformSummary>>(
          future: widget.platformsFuture,
          builder: (context, snapshot) {
            final showSkeleton =
                !_isSearchActive &&
                (widget.showRefreshSkeleton ||
                    (!snapshot.hasData &&
                        (snapshot.connectionState == ConnectionState.waiting ||
                            snapshot.hasError)));

            final platforms = (snapshot.data ?? _defaultBuyerPlatforms())
                .where((item) => item.id.trim().isNotEmpty)
                .toList(growable: false);
            if (platforms.isNotEmpty) {
              _lastPlatformCount = platforms.length;
              if (!showSkeleton) {
                _syncPlaceholderPhrases(platforms);
              }
            }

            final skeletonCount = math.max(
              platforms.isNotEmpty ? platforms.length : _lastPlatformCount,
              1,
            );

            // Keep header + title + search in one tree so focus can animate
            // the site header up (heightFactor → 0) instead of remounting.
            // When showSiteHeader is false, header is pinned outside tab slide.
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.showSiteHeader)
                  _HomeHeaderVisibilityTransition(
                    visible: !_isSearchActive,
                    child: IgnorePointer(
                      ignoring: _isSearchActive,
                      child: ExcludeSemantics(
                        excluding: _isSearchActive,
                        child: _buildSiteHeader(),
                      ),
                    ),
                  ),
                Expanded(
                  child: AnimatedPadding(
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeOutCubic,
                    padding: EdgeInsets.fromLTRB(
                      6,
                      _isSearchActive
                          ? statusTop + 8
                          : (widget.showSiteHeader
                                ? 20
                                // Clear overlaid transparent site header.
                                : statusTop + 56 + 12),
                      6,
                      0,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ..._buildPlatformChrome(),
                        Expanded(
                          child: _isSearchActive
                              ? wrapSearchKeyboardDismiss(
                                  child: _wrapScrollChrome(
                                    _buildPlatformSearchResults(),
                                  ),
                                )
                              : _SwitchRefreshIndicator(
                                  onRefresh: widget.onRefresh,
                                  skeletonHandoff: true,
                                  onConnectivityCheck:
                                      widget.onConnectivityCheck,
                                  onOfflineSkeleton: widget.onOfflineSkeleton,
                                  child: MinimumSkeletonReveal(
                                    switchKey: ValueKey<int>(_contentEpoch),
                                    ready: !showSkeleton,
                                    skeleton: _BuyerPlatformPageSkeleton(
                                      platformCount: skeletonCount,
                                    ),
                                    child: _wrapScrollChrome(
                                      _buildPlatformCatalog(
                                        platforms: platforms,
                                        hasError: snapshot.hasError,
                                      ),
                                    ),
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );

    // Search results: keep system nav transparent so the dashboard shows through.
    if (!_isSearchActive) return body;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: transparentBars,
      child: body,
    );
  }

  Widget _buildSiteHeader() {
    return _SwitchSiteHeader(
      titleColor: widget.titleColor,
      secondaryColor: widget.secondaryColor,
      primaryColor: widget.primaryColor,
      isLoggedIn: widget.isLoggedIn,
      accountName: widget.accountName,
      accountInitials: widget.accountInitials,
      accountImageUrl: widget.accountImageUrl,
      onLanguageTap: () => unawaited(_openLanguagePicker()),
      onNotificationTap: widget.onNotificationTap,
      onAccountTap: widget.onAccountTap,
    );
  }

  Widget _buildPlatformSearchResults() {
    final navInset = MediaQuery.viewPaddingOf(context).bottom;
    // No artificial bottom gap — only the device gesture/nav inset so the last
    // rows can scroll clear while the dashboard shows under a transparent bar.
    final searchContentPadding = EdgeInsets.fromLTRB(10, 0, 10, navInset);

    if (_scanMatching) {
      return SkeletonSearchSuggestionsPanel(
        padding: EdgeInsets.fromLTRB(10, 24, 10, navInset),
      );
    }
    final draftQuery = _searchController.text.trim();
    if (draftQuery.isEmpty) {
      return KeyedSubtree(
        key: const ValueKey('platform-search-suggestions'),
        child: app_search.BuyerSearchSuggestionsPanel(
          primaryColor: widget.primaryColor,
          titleColor: widget.titleColor,
          secondaryColor: widget.secondaryColor,
          padding: searchContentPadding,
          onSelectTerm: _applySuggestion,
        ),
      );
    }

    final showLiveResults =
        _committedSearchQuery.isNotEmpty &&
        draftQuery.toLowerCase() == _committedSearchQuery.toLowerCase();

    return KeyedSubtree(
      key: ValueKey(
        showLiveResults ? 'platform-search-live' : 'platform-search-possible',
      ),
      child: FutureBuilder<_BuyerLiveSearchCatalog>(
        future: _liveSearchCatalogFuture,
        builder: (context, snapshot) {
          final catalog = snapshot.data;
          final isLoading = showLiveResults
              ? snapshot.connectionState == ConnectionState.waiting
              : snapshot.connectionState == ConnectionState.waiting &&
                  catalog == null;

          if (showLiveResults) {
            final hits = catalog == null
                ? const <app_search.BuyerLiveSearchHit>[]
                : app_search.buildBuyerLiveSearchHits(
                    query: draftQuery,
                    platforms: catalog.platforms,
                    storeTypes: catalog.storeTypes,
                    sellers: catalog.sellers,
                    products: catalog.products,
                    limitPerSection: _liveSearchHitSectionLimit,
                  );
            _syncLiveSearchHitExhausted(hits.length);
            final hasMoreLiveSearchHits =
                !_liveSearchHitsExhausted &&
                _liveSearchHitSectionLimit < _liveSearchSectionLimitMax;
            final platformsWithHits = _liveSearchPlatformsWithHits(hits);
            final availableIds = {
              for (final platform in platformsWithHits) platform.id,
            };
            final selectedFilter =
                _liveSearchPlatformFilter == 'all' ||
                    availableIds.contains(_liveSearchPlatformFilter)
                ? _liveSearchPlatformFilter
                : 'all';
            if (selectedFilter != _liveSearchPlatformFilter) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted) return;
                if (_liveSearchPlatformFilter == selectedFilter) return;
                setState(() => _liveSearchPlatformFilter = selectedFilter);
              });
            }
            final filteredHits = _filterLiveSearchHitsByPlatform(
              hits,
              selectedFilter,
            );
            final resultsPanel = app_search.BuyerLiveSearchResultsPanel(
              query: draftQuery,
              hits: filteredHits,
              isLoading: isLoading,
              primaryColor: widget.primaryColor,
              titleColor: widget.titleColor,
              secondaryColor: widget.secondaryColor,
              padding: searchContentPadding,
              onRefresh: _refreshLiveSearchCatalog,
              onSelectHit: _selectLiveHit,
              hasMoreHits: hasMoreLiveSearchHits,
              onRequestMoreHits: hasMoreLiveSearchHits
                  ? () => _requestMoreLiveSearchHits(hits.length)
                  : null,
              // Parent commit reveal already held skeleton for chips + body.
              minimumSkeletonDuration: _liveSearchCommitShowSkeleton
                  ? Duration.zero
                  : kContentSwitchSkeletonMinDuration,
            );

            final showCommitSkeleton = _liveSearchCommitShowSkeleton;
            final showFilterSkeleton =
                !showCommitSkeleton &&
                _liveSearchFilterShowSkeleton &&
                selectedFilter == _liveSearchPlatformFilter;
            final filterBody = showFilterSkeleton
                ? SkeletonLiveSearchResultsPanel(padding: searchContentPadding)
                : resultsPanel;

            final liveResultsBody = platformsWithHits.isEmpty
                ? resultsPanel
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: _LiveSearchPlatformFilterCarousel.height,
                        child: _LiveSearchPlatformFilterCarousel(
                          platforms: platformsWithHits,
                          selectedId: selectedFilter,
                          backgroundColor: widget.backgroundColor,
                          activeColor: widget.primaryColor,
                          inactiveColor: widget.secondaryColor,
                          onSelect: (id) => _selectLiveSearchPlatformFilter(
                            id,
                            platformsWithHits: platformsWithHits,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Whole results pane slides (search + chips stay put).
                      Expanded(
                        child: _LiveSearchFilterPageSlide(
                          transitionKey: selectedFilter,
                          forward: _liveSearchFilterSlideForward,
                          duration: appPageTransitionDuration,
                          child: filterBody,
                        ),
                      ),
                    ],
                  );

            // One shared reveal so sort chips and results appear together.
            if (!showCommitSkeleton) return liveResultsBody;
            return MinimumSkeletonReveal(
              switchKey: Object.hash(
                'live-search-commit',
                draftQuery.toLowerCase(),
                _liveSearchCommitEpoch,
              ),
              // Keep ready once catalog exists so pull-refresh does not
              // re-skeleton the sort chips; results panel handles refresh.
              ready: catalog != null,
              skeleton: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(
                    height: _LiveSearchPlatformFilterCarousel.height,
                    child: SkeletonHorizontalChips(
                      heights: 30,
                      count: 3,
                      padding: EdgeInsets.fromLTRB(6, 6, 22, 6),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: SkeletonLiveSearchResultsPanel(
                      padding: searchContentPadding,
                    ),
                  ),
                ],
              ),
              child: liveResultsBody,
            );
          }

          final terms = catalog == null
              ? const <app_search.BuyerPossibleSearchTerm>[]
              : app_search.buildBuyerPossibleSearchTerms(
                  query: draftQuery,
                  platforms: catalog.platforms,
                  storeTypes: catalog.storeTypes,
                  sellers: catalog.sellers,
                  products: catalog.products,
                );
          return app_search.BuyerPossibleSearchesPanel(
            query: draftQuery,
            terms: terms,
            isLoading: isLoading,
            primaryColor: widget.primaryColor,
            titleColor: widget.titleColor,
            secondaryColor: widget.secondaryColor,
            padding: searchContentPadding,
            onSelectTerm: _applySuggestion,
          );
        },
      ),
    );
  }

  List<Widget> _buildPlatformChrome() {
    return [
      KeyedSubtree(
        key: _platformChromeKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildPlatformTitleHeader(),
            const SizedBox(height: 16),
            _buildPlatformSearchBar(),
            const SizedBox(height: 12),
          ],
        ),
      ),
    ];
  }

  /// Title, search stay above; only platform cards scroll here.
  Widget _buildPlatformCatalog({
    required List<BuyerPlatformSummary> platforms,
    required bool hasError,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final horizontalInset = constraints.maxWidth > 820
            ? (constraints.maxWidth - 820) / 2
            : 0.0;
        final gap = constraints.maxWidth <= 700 ? 6.0 : 8.0;
        final showUnavailable = hasError && platforms.isEmpty;

        // Site header + title/search stay above this scroll so search-focus
        // can collapse the header with animation. Grid scrolls underneath.
        return CustomScrollView(
          key: ValueKey('platform-grid-$_contentEpoch'),
          controller: widget.catalogScrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            if (showUnavailable)
              SliverToBoxAdapter(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 280),
                  child: _DashboardStateCard(
                    icon: Icons.cloud_off_rounded,
                    title: 'Unavailable',
                    message: '',
                    primaryColor: widget.primaryColor,
                    surfaceColor: widget.backgroundColor,
                    secondaryColor: widget.secondaryColor,
                    borderRadius: 0,
                  ),
                ),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(
                  horizontalInset + 6,
                  0,
                  horizontalInset + 6,
                  20,
                ),
                sliver: SliverGrid(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: gap,
                    mainAxisSpacing: gap,
                    childAspectRatio: 3 / 4,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    final platform = platforms[index];
                    return _BuyerPlatformCard(
                      platform: platform,
                      minimumImageDelay: Duration.zero,
                      surfaceColor: widget.surfaceColor,
                      titleColor: widget.titleColor,
                      secondaryColor: widget.secondaryColor,
                      primaryColor: widget.primaryColor,
                      onTap: () => widget.onSelect(platform),
                    );
                  }, childCount: platforms.length),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildPlatformTitleHeader() {
    return SizedBox(
      height: 44,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: IgnorePointer(
              ignoring: !_isSearchActive,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 180),
                opacity: _isSearchActive ? 1 : 0,
                child: IconButton(
                  onPressed: _cancelSearch,
                  tooltip: 'Back',
                  color: widget.titleColor,
                  iconSize: 26,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints.tightFor(
                    width: 36,
                    height: 44,
                  ),
                  icon: const Icon(Icons.chevron_left_rounded),
                ),
              ),
            ),
          ),
          Text(
            AppBuyerLanguages.t(AppLanguagePreference.code, 'platform.title'),
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.visible,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: widget.titleColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlatformSearchBar() {
    return Align(
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
        constraints: BoxConstraints(
          minWidth: _isSearchActive ? 300 : 360,
          maxWidth: _isSearchActive ? 420 : 360,
        ),
        child: app_search.ProductSearchBar(
          controller: _searchController,
          focusNode: _searchFocusNode,
          iconColor: widget.secondaryColor,
          textColor: widget.titleColor,
          backgroundColor: widget.surfaceColor,
          pillStyle: true,
          hintText: _isSearchActive
              ? AppBuyerLanguages.t(
                  AppLanguagePreference.code,
                  'platform.search.everything',
                )
              : _placeholderHint,
          onSubmitted: _submitSearch,
          onClear: () {
            _searchController.clear();
            if (!_searchFocusNode.hasFocus) {
              _searchFocusNode.requestFocus();
            }
            setState(() {});
          },
          onChanged: (_) => setState(() {}),
          onTapOutside: dismissSearchKeyboardOnTapOutside,
        ),
      ),
    );
  }
}

/// Full-pane edge-to-edge slide for live-search filter bodies.
/// Matches main platform page-turn motion; chrome (search + chips) stays put.
class _LiveSearchFilterPageSlide extends StatefulWidget {
  const _LiveSearchFilterPageSlide({
    required this.transitionKey,
    required this.forward,
    required this.duration,
    required this.child,
  });

  final String transitionKey;
  final bool forward;
  final Duration duration;
  final Widget child;

  @override
  State<_LiveSearchFilterPageSlide> createState() =>
      _LiveSearchFilterPageSlideState();
}

class _LiveSearchFilterPageSlideState extends State<_LiveSearchFilterPageSlide>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _curved;
  late String _displayedKey;
  late Widget _displayedChild;
  Widget? _outgoingChild;
  bool _slideForward = true;

  @override
  void initState() {
    super.initState();
    _displayedKey = widget.transitionKey;
    _displayedChild = widget.child;
    _slideForward = widget.forward;
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..value = 1;
    _curved = CurvedAnimation(
      parent: _controller,
      curve: const Cubic(0.22, 1.0, 0.36, 1.0),
    );
  }

  @override
  void didUpdateWidget(covariant _LiveSearchFilterPageSlide oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.duration != widget.duration) {
      _controller.duration = widget.duration;
    }

    if (widget.transitionKey == _displayedKey) {
      // Same filter — swap skeleton ↔ results in place (no page slide).
      _displayedChild = widget.child;
      return;
    }

    _outgoingChild = _displayedChild;
    _displayedKey = widget.transitionKey;
    _displayedChild = widget.child;
    _slideForward = widget.forward;
    setState(() {});
    unawaited(
      _controller.forward(from: 0).then((_) {
        if (!mounted) return;
        setState(() => _outgoingChild = null);
      }),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: AnimatedBuilder(
        animation: _curved,
        builder: (context, _) {
          final t = _curved.value;
          final animating = t < 1.0 && _outgoingChild != null;
          final outgoingDx = _slideForward ? -t : t;
          final incomingDx = animating
              ? (_slideForward ? 1.0 - t : t - 1.0)
              : 0.0;

          return Stack(
            fit: StackFit.expand,
            children: [
              if (animating)
                FractionalTranslation(
                  translation: Offset(outgoingDx, 0),
                  child: SizedBox.expand(child: _outgoingChild),
                ),
              FractionalTranslation(
                translation: Offset(incomingDx, 0),
                child: SizedBox.expand(child: _displayedChild),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Platform filter under Home search results (All / Shop / Food…).
/// Platforms with no hits stay hidden.
class _LiveSearchPlatformFilterCarousel extends StatelessWidget {
  const _LiveSearchPlatformFilterCarousel({
    required this.platforms,
    required this.selectedId,
    required this.backgroundColor,
    required this.activeColor,
    required this.inactiveColor,
    required this.onSelect,
  });

  /// Match `_DealsCarousel` (All / New Post) pill row geometry.
  static const double height = 42;
  static const double bottomPadding = 0;

  static const String _shopBagSvg =
      '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/></svg>''';

  static const String _foodSoupSvg =
      '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/><path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/><path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/></svg>''';

  static const String _allGridSvg =
      '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>''';

  final List<({String id, String label})> platforms;
  final String selectedId;
  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<String> onSelect;

  IconData _fallbackIconFor(String id) {
    switch (id.trim().toLowerCase()) {
      case 'hotels':
      case 'hotel':
        return Icons.hotel_rounded;
      case 'resort':
        return Icons.beach_access_rounded;
      default:
        return Icons.apps_rounded;
    }
  }

  Widget _chipIcon(String id, {required Color color}) {
    const size = 15.0;
    final key = id.trim().toLowerCase();
    final svg = switch (key) {
      'all' => _allGridSvg,
      'shop' => _shopBagSvg,
      'food' => _foodSoupSvg,
      _ => null,
    };
    if (svg != null) {
      return SvgPicture.string(
        svg,
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      );
    }
    return Icon(_fallbackIconFor(key), size: size, color: color);
  }

  @override
  Widget build(BuildContext context) {
    final chips = <({String id, String label})>[
      (id: 'all', label: 'All'),
      ...platforms,
    ];
    final inactivePillColor =
        Color.lerp(backgroundColor, activeColor, 0.08) ?? backgroundColor;

    return SizedBox(
      height: height,
      child: HorizontalEndFade(
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(10, 6, 22, 6),
          scrollDirection: Axis.horizontal,
          itemCount: chips.length,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            final chip = chips[index];
            final isActive = chip.id == selectedId;
            final iconColor = isActive ? Colors.white : activeColor;

            return InkWell(
              onTap: () => onSelect(chip.id),
              borderRadius: BorderRadius.circular(999),
              overlayColor: const WidgetStatePropertyAll(Colors.transparent),
              splashFactory: NoSplash.splashFactory,
              highlightColor: Colors.transparent,
              splashColor: Colors.transparent,
              hoverColor: Colors.transparent,
              focusColor: Colors.transparent,
              child: AnimatedContainer(
                duration: appMotionFrames(11),
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(
                  horizontal: 11,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: isActive ? activeColor : inactivePillColor,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _chipIcon(chip.id, color: iconColor),
                    const SizedBox(width: 6),
                    Text(
                      chip.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textHeightBehavior: const TextHeightBehavior(
                        applyHeightToFirstAscent: false,
                        applyHeightToLastDescent: false,
                      ),
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: isActive ? Colors.white : inactiveColor,
                        fontWeight: FontWeight.w400,
                        fontSize: 14,
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Category filter for platform-scoped search (All + shop/food categories).
/// Icons match Super Admin category Lucide/Tabler icons (not uploaded images).
class _LiveSearchStoreTypeFilterCarousel extends StatelessWidget {
  const _LiveSearchStoreTypeFilterCarousel({
    required this.storeTypes,
    required this.selectedId,
    required this.backgroundColor,
    required this.activeColor,
    required this.inactiveColor,
    required this.onSelect,
  });

  static const double height = 42;

  static const String _allGridSvg =
      '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>''';

  static const String _tagFallbackSvg =
      '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l4.58-4.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>''';

  final List<({String id, String label, String iconName})> storeTypes;
  final String selectedId;
  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<String> onSelect;

  Widget _strokeSvg(String svg, {required Color color, double size = 15}) {
    return SvgPicture.string(
      svg,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }

  String? _categoryIconSvgUrl(String iconName) {
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

  Widget _categoryChipIcon({
    required String iconName,
    required Color color,
  }) {
    const size = 15.0;
    final url = _categoryIconSvgUrl(iconName);
    final fallback = _strokeSvg(_tagFallbackSvg, color: color, size: size);
    if (url == null) return fallback;

    return SizedBox(
      width: size,
      height: size,
      child: SvgPicture.network(
        url,
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
        placeholderBuilder: (_) => fallback,
        // Keep chip layout stable even if CDN misses an icon name.
        errorBuilder: (_, __, ___) => fallback,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final chips = <({String id, String label, String iconName})>[
      (id: 'all', label: 'All', iconName: ''),
      ...storeTypes,
    ];
    final inactivePillColor =
        Color.lerp(backgroundColor, activeColor, 0.08) ?? backgroundColor;

    return SizedBox(
      height: height,
      child: HorizontalEndFade(
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(10, 6, 22, 6),
          scrollDirection: Axis.horizontal,
          itemCount: chips.length,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            final chip = chips[index];
            final isActive = chip.id == selectedId;
            final iconColor = isActive ? Colors.white : activeColor;

            return InkWell(
              onTap: () => onSelect(chip.id),
              borderRadius: BorderRadius.circular(999),
              overlayColor: const WidgetStatePropertyAll(Colors.transparent),
              splashFactory: NoSplash.splashFactory,
              highlightColor: Colors.transparent,
              splashColor: Colors.transparent,
              hoverColor: Colors.transparent,
              focusColor: Colors.transparent,
              child: AnimatedContainer(
                duration: appMotionFrames(11),
                curve: Curves.easeOutCubic,
                padding: const EdgeInsets.symmetric(
                  horizontal: 11,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: isActive ? activeColor : inactivePillColor,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    chip.id == 'all'
                        ? _strokeSvg(_allGridSvg, color: iconColor)
                        : _categoryChipIcon(
                            iconName: chip.iconName,
                            color: iconColor,
                          ),
                    const SizedBox(width: 6),
                    Text(
                      chip.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textHeightBehavior: const TextHeightBehavior(
                        applyHeightToFirstAscent: false,
                        applyHeightToLastDescent: false,
                      ),
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: isActive ? Colors.white : inactiveColor,
                        fontWeight: FontWeight.w400,
                        fontSize: 14,
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _BuyerLiveSearchCatalog {
  const _BuyerLiveSearchCatalog({
    required this.platforms,
    required this.storeTypes,
    required this.sellers,
    required this.products,
  });

  final List<BuyerPlatformSummary> platforms;
  final List<StoreTypeSummary> storeTypes;
  final List<SellerSummary> sellers;
  final List<Product> products;
}

String _buyerAccountInitials({
  required String firstName,
  required String lastName,
  required String email,
}) {
  final first = firstName.trim();
  final last = lastName.trim();
  if (first.isNotEmpty || last.isNotEmpty) {
    final a = first.isNotEmpty ? first[0] : '';
    final b = last.isNotEmpty ? last[0] : (first.length > 1 ? first[1] : '');
    return '$a$b'.toUpperCase();
  }
  final mail = email.trim();
  if (mail.isNotEmpty) {
    return mail[0].toUpperCase();
  }
  return 'S';
}

/// Matches `.login-site-header` from `main_dart.html` (brand + actions).
class _SwitchSiteHeader extends StatelessWidget {
  const _SwitchSiteHeader({
    this.titleColor = const Color(0xFF0F172A),
    required this.secondaryColor,
    required this.primaryColor,
    required this.isLoggedIn,
    required this.accountName,
    required this.accountInitials,
    required this.accountImageUrl,
    required this.onLanguageTap,
    required this.onNotificationTap,
    required this.onAccountTap,
  });

  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final bool isLoggedIn;
  final String accountName;
  final String accountInitials;
  final String accountImageUrl;
  final VoidCallback onLanguageTap;
  final VoidCallback onNotificationTap;
  final VoidCallback onAccountTap;

  static const String _logoAsset = 'assets/images/switch-logo.svg';
  static const String _globeAsset = 'assets/icons/globe.svg';

  Widget _buildAccountAvatar() {
    final imageUrl = accountImageUrl.trim();
    final initials = Text(
      accountInitials,
      // Match `.md-account-menu__initials` (font-weight: 700)
      style: const TextStyle(
        color: Colors.white,
        fontSize: 12,
        fontWeight: FontWeight.w700,
      ),
    );
    final fallback = Container(
      width: 34,
      height: 34,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor,
            Color.lerp(primaryColor, const Color(0xFF0F172A), 0.28) ??
                primaryColor,
          ],
        ),
      ),
      child: initials,
    );

    if (imageUrl.isEmpty) {
      return fallback;
    }

    return ClipOval(
      child: SizedBox(
        width: 34,
        height: 34,
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => fallback,
          errorWidget: (context, url, error) => fallback,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isNarrow = MediaQuery.sizeOf(context).width <= 720;
    final logoSize = isNarrow ? 36.0 : 40.0;
    final fontSize = isNarrow ? 20.0 : 24.0;
    final gap = isNarrow ? 8.0 : 10.0;
    final horizontal = isNarrow ? 12.0 : 8.0;
    final vertical = isNarrow ? 10.0 : 8.0;
    final actionColor = secondaryColor;
    // Content draws under the transparent status bar — pad header below notch.
    final topInset = MediaQuery.paddingOf(context).top;

    return ColoredBox(
      color: Colors.transparent,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          horizontal,
          topInset + vertical,
          horizontal,
          vertical,
        ),
        child: Row(
          children: [
            Expanded(
              child: Semantics(
                label: 'Switch home',
                header: true,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: logoSize,
                      height: logoSize,
                      child: SvgPicture.asset(
                        _logoAsset,
                        fit: BoxFit.contain,
                        semanticsLabel: 'Switch',
                      ),
                    ),
                    SizedBox(width: gap),
                    Flexible(
                      child: Text(
                        'Switch',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        // Match `.login-site-header__brand` (font-weight: 500)
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: titleColor,
                          fontSize: fontSize,
                          fontWeight: FontWeight.w600,
                          height: 1.1,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Logged-in: notif → account (language lives in account sidebar).
            // Guest: language only.
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isLoggedIn)
                  IconButton(
                    onPressed: onNotificationTap,
                    tooltip: 'Notifications',
                    padding: EdgeInsets.zero,
                    visualDensity: const VisualDensity(
                      horizontal: -4,
                      vertical: -2,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 34,
                      minHeight: 44,
                    ),
                    icon: SvgPicture.string(
                      _lucideBellIconSvg,
                      width: 24,
                      height: 24,
                      colorFilter: ColorFilter.mode(
                        actionColor,
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
                if (!isLoggedIn)
                  IconButton(
                    onPressed: onLanguageTap,
                    tooltip: 'Language',
                    padding: EdgeInsets.zero,
                    visualDensity: const VisualDensity(
                      horizontal: -4,
                      vertical: -2,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 34,
                      minHeight: 44,
                    ),
                    icon: SvgPicture.asset(
                      _globeAsset,
                      width: 22,
                      height: 22,
                      colorFilter: ColorFilter.mode(
                        actionColor,
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
                if (isLoggedIn)
                  Tooltip(
                    message: accountName,
                    child: InkWell(
                      onTap: onAccountTap,
                      borderRadius: BorderRadius.circular(999),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(2, 4, 4, 4),
                        child: _buildAccountAvatar(),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _BuyerPlatformPageSkeleton extends StatelessWidget {
  const _BuyerPlatformPageSkeleton({required this.platformCount, this.leading});

  final int platformCount;
  final Widget? leading;

  /// Lighter base so skeleton reads soft, not heavy gray.
  static const Color _shimmerBase = Color(0xFFEFF2F6);

  @override
  Widget build(BuildContext context) {
    final cardCount = math.max(platformCount, 1);

    return LayoutBuilder(
      builder: (context, constraints) {
        final horizontalInset = constraints.maxWidth > 820
            ? (constraints.maxWidth - 820) / 2
            : 0.0;
        final gap = constraints.maxWidth <= 700 ? 6.0 : 8.0;

        return ExcludeSemantics(
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              if (leading != null) SliverToBoxAdapter(child: leading),
              SliverPadding(
                padding: EdgeInsets.fromLTRB(
                  horizontalInset + 6,
                  0,
                  horizontalInset + 6,
                  20,
                ),
                sliver: SliverGrid(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: gap,
                    mainAxisSpacing: gap,
                    childAspectRatio: 3 / 4,
                  ),
                  delegate: SliverChildBuilderDelegate((context, index) {
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: const SkeletonShimmer(
                        baseColor: _shimmerBase,
                      ),
                    );
                  }, childCount: cardCount),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DelayedPlatformImage extends StatefulWidget {
  const _DelayedPlatformImage({
    required this.imageUrl,
    required this.fit,
    required this.fallbackColor,
    required this.shimmerBaseColor,
    required this.minimumDelay,
  });

  final String imageUrl;
  final BoxFit fit;
  final Color fallbackColor;
  final Color shimmerBaseColor;
  final Duration minimumDelay;

  @override
  State<_DelayedPlatformImage> createState() => _DelayedPlatformImageState();
}

class _DelayedPlatformImageState extends State<_DelayedPlatformImage> {
  Timer? _minimumDelayTimer;
  bool _minimumDelayElapsed = false;
  bool _imageSettled = false;

  @override
  void initState() {
    super.initState();
    _restartLoadingState();
  }

  @override
  void didUpdateWidget(covariant _DelayedPlatformImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _restartLoadingState();
    }
  }

  @override
  void dispose() {
    _minimumDelayTimer?.cancel();
    super.dispose();
  }

  void _restartLoadingState() {
    _minimumDelayTimer?.cancel();
    _minimumDelayElapsed = widget.minimumDelay <= Duration.zero;
    _imageSettled = false;
    if (_minimumDelayElapsed) return;
    _minimumDelayTimer = Timer(widget.minimumDelay, () {
      if (!mounted) return;
      setState(() => _minimumDelayElapsed = true);
    });
  }

  void _markImageSettled(String expectedUrl) {
    if (_imageSettled) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _imageSettled || widget.imageUrl != expectedUrl) return;
      setState(() => _imageSettled = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.imageUrl;
    final revealImage = _minimumDelayElapsed && _imageSettled;

    return Stack(
      fit: StackFit.expand,
      children: [
        AnimatedOpacity(
          opacity: revealImage ? 1 : 0,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          child: CachedNetworkImage(
            imageUrl: imageUrl,
            fit: widget.fit,
            fadeInDuration: Duration.zero,
            fadeOutDuration: Duration.zero,
            imageBuilder: (context, imageProvider) {
              _markImageSettled(imageUrl);
              return Image(image: imageProvider, fit: widget.fit);
            },
            placeholder: (context, url) => const SizedBox.expand(),
            errorWidget: (context, url, error) =>
                ColoredBox(color: widget.fallbackColor),
          ),
        ),
        IgnorePointer(
          child: AnimatedOpacity(
            opacity: revealImage ? 0 : 1,
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            child: ExcludeSemantics(
              child: TickerMode(
                enabled: !revealImage,
                child: SkeletonShimmer(
                  baseColor: widget.shimmerBaseColor,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _BuyerPlatformCard extends StatelessWidget {
  const _BuyerPlatformCard({
    required this.platform,
    required this.minimumImageDelay,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.onTap,
  });

  final BuyerPlatformSummary platform;
  final Duration minimumImageDelay;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final VoidCallback onTap;

  bool get _isInactive => platform.status == 'inactive';
  bool get _isSoon => platform.comingSoon;
  bool get _isReady => !_isInactive && !_isSoon;
  bool get _hasHero => platform.heroImageUrl.trim().isNotEmpty;

  String? get _statusLabel {
    final lang = AppLanguagePreference.code;
    if (_isInactive) {
      return AppBuyerLanguages.t(lang, 'platform.unavailable');
    }
    if (_isSoon) {
      return AppBuyerLanguages.t(lang, 'platform.soon');
    }
    return null;
  }

  Widget _buildIcon({required Color color}) {
    final localArt = _homeBuyerPlatformLabelArt(platform);
    final size = _buyerPlatformIconDisplaySize(platform);
    if (localArt != null) {
      return Image.asset(
        localArt,
        width: size,
        height: size,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
        isAntiAlias: true,
      );
    }
    return _buyerPlatformSvgIcon(platform: platform, color: color, size: size);
  }

  @override
  Widget build(BuildContext context) {
    final labelColor = _hasHero ? Colors.white : titleColor;
    final statusColor = _hasHero
        ? Colors.white.withValues(alpha: 0.86)
        : primaryColor;
    final readyFill = Color.alphaBlend(
      primaryColor.withValues(alpha: 0.10),
      Color.alphaBlend(
        const Color(0xFF079985).withValues(alpha: 0.08),
        surfaceColor,
      ),
    );

    return Opacity(
      opacity: _isReady ? 1 : 0.72,
      child: AspectRatio(
        aspectRatio: 3 / 4,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                color: Color(0x14162033),
                blurRadius: 40,
                offset: Offset(0, 18),
              ),
            ],
          ),
          child: Material(
            color: _hasHero
                ? const Color(0xFF0F172A)
                : (_isReady ? readyFill : surfaceColor),
            borderRadius: BorderRadius.circular(16),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (_hasHero) ...[
                    _DelayedPlatformImage(
                      imageUrl: platform.heroImageUrl.trim(),
                      fit: BoxFit.cover,
                      fallbackColor: readyFill,
                      shimmerBaseColor: const Color(0xFFEFF2F6),
                      minimumDelay: minimumImageDelay,
                    ),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0x140F172A), Color(0x8C0F172A)],
                        ),
                      ),
                    ),
                  ],
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 18, 14, 18),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _buildIcon(color: labelColor),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                platform.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                // Match `.md-platform-card strong` (font-weight: 500)
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      color: labelColor,
                                      fontWeight: FontWeight.w600,
                                      shadows: _hasHero
                                          ? const [
                                              Shadow(
                                                color: Color(0x590F172A),
                                                blurRadius: 8,
                                              ),
                                            ]
                                          : null,
                                    ),
                              ),
                            ),
                          ],
                        ),
                        if (_statusLabel != null) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: _hasHero && _isSoon
                                ? const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 5,
                                  )
                                : EdgeInsets.zero,
                            decoration: _hasHero && _isSoon
                                ? const BoxDecoration(
                                    color: Color(0xFF636363),
                                    borderRadius: BorderRadius.only(
                                      topLeft: Radius.circular(20),
                                      topRight: Radius.circular(8),
                                      bottomRight: Radius.circular(20),
                                      bottomLeft: Radius.circular(8),
                                    ),
                                  )
                                : null,
                            child: Text(
                              _statusLabel!,
                              // Match `.md-platform-card` status span (font-weight: 500)
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: _hasHero && _isSoon
                                        ? Colors.white
                                        : statusColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                        ],
                      ],
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

class _ShopLayerAppBar extends StatelessWidget {
  const _ShopLayerAppBar({
    required this.title,
    required this.onBack,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
  });

  final String title;
  final VoidCallback onBack;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: surfaceColor,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 52,
          child: Row(
            children: [
              IconButton(
                onPressed: onBack,
                icon: Icon(Icons.arrow_back_rounded, color: titleColor),
                tooltip: 'Back',
              ),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: titleColor,
                    // Match `.login-site-header__brand` / `.ss-brand__platform`
                    fontWeight: FontWeight.w500,
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

/// Switch Shop top bar: hamburger + notif / cart / profile.
/// Language lives in the account right sidebar when logged in.
/// Brand lives in the sidebar (`_SwitchShopPlatformSidebar`).
/// Shop/Food can show an address prompt + current location beside the menu.
class _SwitchPlatformBrandAppBar extends StatelessWidget {
  const _SwitchPlatformBrandAppBar({
    required this.iconColor,
    required this.primaryColor,
    required this.accountName,
    required this.accountInitials,
    required this.accountImageUrl,
    required this.onMenuTap,
    required this.onNotificationTap,
    required this.onCartTap,
    required this.onAccountTap,
    this.surfaceColor = Colors.transparent,
    this.selectedAction,
    this.showDeliveryLocation = false,
    this.deliveryLocationTitle = 'Where to deliver?',
    this.onDeliveryLocationTap,
    this.useFoodCartIcon = false,
    this.useSafeArea = true,
  });

  final Color iconColor;
  final Color surfaceColor;
  final Color primaryColor;
  final String accountName;
  final String accountInitials;
  final String accountImageUrl;
  final _HeaderAction? selectedAction;
  final VoidCallback onMenuTap;
  final VoidCallback onNotificationTap;
  final VoidCallback onCartTap;
  final VoidCallback onAccountTap;
  final bool showDeliveryLocation;
  final String deliveryLocationTitle;
  final VoidCallback? onDeliveryLocationTap;
  final bool useFoodCartIcon;
  final bool useSafeArea;

  Widget _wrapSafeArea({required Widget child}) {
    if (!useSafeArea) {
      return child;
    }
    return SafeArea(bottom: false, child: child);
  }

  Widget _buildAccountAvatar() {
    final imageUrl = accountImageUrl.trim();
    final initials = Text(
      accountInitials,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 12,
        fontWeight: FontWeight.w700,
      ),
    );
    final fallback = Container(
      width: 34,
      height: 34,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor,
            Color.lerp(primaryColor, const Color(0xFF0F172A), 0.28) ??
                primaryColor,
          ],
        ),
      ),
      child: initials,
    );

    if (imageUrl.isEmpty) {
      return fallback;
    }

    return ClipOval(
      child: SizedBox(
        width: 34,
        height: 34,
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => fallback,
          errorWidget: (context, url, error) => fallback,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final actionColor = iconColor;
    final activeColor =
        Color.lerp(iconColor, primaryColor, 0.35) ?? primaryColor;
    final barHeight = showDeliveryLocation ? 72.0 : 56.0;
    final titleStyle = Theme.of(context).textTheme.headlineSmall?.copyWith(
      color: iconColor,
      fontWeight: FontWeight.w600,
      fontSize: showDeliveryLocation ? 17 : 22,
      height: 1.1,
    );

    return Material(
      color: surfaceColor,
      elevation: 0,
      child: _wrapSafeArea(
        child: SizedBox(
          height: barHeight,
          child: Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                IconButton(
                  onPressed: onMenuTap,
                  tooltip: 'Open menu',
                  icon: SvgPicture.string(
                    _lucideMenuIconSvg,
                    width: 24,
                    height: 24,
                    colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
                  ),
                ),
                if (showDeliveryLocation)
                  Expanded(
                    child: InkWell(
                      onTap: onDeliveryLocationTap,
                      borderRadius: BorderRadius.circular(10),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(2, 4, 8, 4),
                        child: ListenableBuilder(
                          listenable: BuyerDeliveryAddressStore.instance,
                          builder: (context, _) {
                            final location = BuyerDeliveryAddressStore
                                .instance
                                .headerLocationLabel;
                            return Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    SvgPicture.string(
                                      _lucideMapPinIconSvg,
                                      width: 18,
                                      height: 18,
                                      colorFilter: ColorFilter.mode(
                                        iconColor,
                                        BlendMode.srcIn,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        deliveryLocationTitle,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: titleStyle,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  location,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: iconColor.withValues(alpha: 0.88),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    height: 1.2,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ),
                  )
                else
                  const Spacer(),
                IconButton(
                  onPressed: onNotificationTap,
                  tooltip: 'Notifications',
                  padding: EdgeInsets.zero,
                  visualDensity: const VisualDensity(
                    horizontal: -4,
                    vertical: -2,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 34,
                    minHeight: 44,
                  ),
                  icon: SvgPicture.string(
                    _lucideBellIconSvg,
                    width: 24,
                    height: 24,
                    colorFilter: ColorFilter.mode(
                      selectedAction == _HeaderAction.notification
                          ? activeColor
                          : actionColor,
                      BlendMode.srcIn,
                    ),
                  ),
                ),
                ValueListenableBuilder<List<CartItemData>>(
                  valueListenable: CartStore.instance.cartItemsNotifier,
                  builder: (context, items, child) {
                    final cartColor = selectedAction == _HeaderAction.cart
                        ? activeColor
                        : actionColor;
                    return _HeaderIconButton(
                      tooltip: 'Cart',
                      icon: Icons.shopping_cart_outlined,
                      customIcon: _platformCartIcon(
                        color: cartColor,
                        useFoodCartIcon: useFoodCartIcon,
                      ),
                      color: cartColor,
                      badgeCount: cartEntryCount(items),
                      onPressed: onCartTap,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 10,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 34,
                        minHeight: 44,
                      ),
                    );
                  },
                ),
                Tooltip(
                  message: accountName,
                  child: InkWell(
                    onTap: onAccountTap,
                    borderRadius: BorderRadius.circular(999),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(2, 4, 4, 4),
                      child: _buildAccountAvatar(),
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

class _ShopShowcaseOverlayHeaderData {
  const _ShopShowcaseOverlayHeaderData({
    required this.accountName,
    required this.accountInitials,
    required this.accountImageUrl,
    required this.onMenuTap,
    required this.onNotificationTap,
    required this.onCartTap,
    required this.searchController,
    required this.searchFocusNode,
    required this.onSearchChanged,
    required this.onSearchClear,
    required this.onSearchSubmitted,
    required this.onAccountTap,
    this.searchHintText = 'Search in Shop',
    this.isSearchModeListenable,
    this.onSearchCancel,
    this.onSearchBackHold,
    this.selectedAction,
    this.showDeliveryLocation = false,
    this.deliveryLocationTitle = 'Where to deliver?',
    this.onDeliveryLocationTap,
    this.useFoodCartIcon = false,
  });

  final String accountName;
  final String accountInitials;
  final String accountImageUrl;
  final _HeaderAction? selectedAction;
  final VoidCallback onMenuTap;
  final VoidCallback onNotificationTap;
  final VoidCallback onCartTap;
  final TextEditingController searchController;
  final FocusNode searchFocusNode;
  final String searchHintText;
  final ValueNotifier<bool>? isSearchModeListenable;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onSearchClear;
  final ValueChanged<String> onSearchSubmitted;
  final VoidCallback? onSearchCancel;
  final VoidCallback? onSearchBackHold;
  final VoidCallback onAccountTap;
  final bool showDeliveryLocation;
  final String deliveryLocationTitle;
  final VoidCallback? onDeliveryLocationTap;
  final bool useFoodCartIcon;
}

/// Static Shop hero used while the product slideshow is disabled.
class _ShopPlatformHeroBackground extends StatelessWidget {
  const _ShopPlatformHeroBackground({
    super.key,
    required this.primaryColor,
    required this.backgroundColor,
    required this.overlayHeader,
    required this.headerPrimaryColor,
    this.searchActiveOverride,
  });

  static const double height = 224;
  static const Duration _animDuration = Duration(milliseconds: 280);

  final Color primaryColor;
  final Color backgroundColor;
  final _ShopShowcaseOverlayHeaderData? overlayHeader;
  final Color headerPrimaryColor;

  /// When non-null, forces expanded/collapsed search chrome instead of
  /// listening to focus / search-mode notifiers.
  final bool? searchActiveOverride;

  @override
  Widget build(BuildContext context) {
    final deeperColor =
        Color.lerp(primaryColor, const Color(0xFF001C18), 0.16) ?? primaryColor;
    final highlightColor =
        Color.lerp(primaryColor, Colors.white, 0.12) ?? primaryColor;
    final header = overlayHeader;
    final statusBarInset = MediaQuery.paddingOf(context).top;
    final searchModeHeight = statusBarInset + 56;

    final listenables = <Listenable>[
      if (header?.searchFocusNode != null) header!.searchFocusNode,
      if (header?.isSearchModeListenable != null)
        header!.isSearchModeListenable!,
    ];

    Widget buildHero({required bool searchIsActive}) {
      return AnimatedContainer(
        duration: _animDuration,
        curve: Curves.easeOutCubic,
        width: double.infinity,
        height: searchIsActive ? searchModeHeight : height,
        color: backgroundColor,
        child: ClipRect(
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Blue branded wash — collapses/fades out while searching.
              Positioned.fill(
                child: IgnorePointer(
                  child: AnimatedOpacity(
                    duration: _animDuration,
                    curve: Curves.easeOutCubic,
                    opacity: searchIsActive ? 0 : 1,
                    child: ClipPath(
                      clipper: const _ShopPlatformHeroClipper(),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [highlightColor, primaryColor, deeperColor],
                            stops: const [0, 0.56, 1],
                          ),
                        ),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Positioned(
                              right: -72,
                              top: 76,
                              child: Container(
                                width: 210,
                                height: 210,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white.withOpacity(0.055),
                                ),
                              ),
                            ),
                            Positioned(
                              left: -48,
                              bottom: 20,
                              child: Container(
                                width: 132,
                                height: 132,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.black.withOpacity(0.035),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (header != null)
                Positioned.fill(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      AnimatedPositioned(
                        duration: _animDuration,
                        curve: Curves.easeOutCubic,
                        top:
                            statusBarInset +
                            (searchIsActive
                                ? 6
                                : (header?.showDeliveryLocation == true
                                      ? 84
                                      : 68)),
                        left: searchIsActive ? 48 : 18,
                        right: searchIsActive ? 10 : 18,
                        child: Align(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: searchIsActive ? 520 : 420,
                            ),
                            child: app_search.ProductSearchBar(
                              controller: header.searchController,
                              focusNode: header.searchFocusNode,
                              iconColor: const Color(0xFF6B7280),
                              textColor: const Color(0xFF162033),
                              backgroundColor: Colors.white,
                              pillStyle: true,
                              alwaysUseFocusedStyle: true,
                              hintText: header.searchHintText,
                              onChanged: header.onSearchChanged,
                              onSubmitted: header.onSearchSubmitted,
                              onClear: header.onSearchClear,
                              onTapOutside: dismissSearchKeyboardOnTapOutside,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 0,
                        left: 0,
                        right: 0,
                        child: IgnorePointer(
                          ignoring: searchIsActive,
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 180),
                            opacity: searchIsActive ? 0 : 1,
                            child: AnimatedSlide(
                              duration: _animDuration,
                              curve: Curves.easeOutCubic,
                              offset: searchIsActive
                                  ? const Offset(0, -0.7)
                                  : Offset.zero,
                              child: _SwitchPlatformBrandAppBar(
                                iconColor: Colors.white,
                                primaryColor: headerPrimaryColor,
                                accountName: header.accountName,
                                accountInitials: header.accountInitials,
                                accountImageUrl: header.accountImageUrl,
                                selectedAction: header.selectedAction,
                                onMenuTap: header.onMenuTap,
                                onNotificationTap: header.onNotificationTap,
                                onCartTap: header.onCartTap,
                                onAccountTap: header.onAccountTap,
                                showDeliveryLocation:
                                    header.showDeliveryLocation,
                                deliveryLocationTitle:
                                    header.deliveryLocationTitle,
                                onDeliveryLocationTap:
                                    header.onDeliveryLocationTap,
                                useFoodCartIcon: header.useFoodCartIcon,
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Last in the stack so the focused search field cannot
                      // steal the tap. Exit on pointer-up so the header does
                      // not slide under the finger and refocus the bar.
                      Positioned(
                        top: statusBarInset + (searchIsActive ? 2 : 0),
                        left: 0,
                        child: IgnorePointer(
                          ignoring: !searchIsActive,
                          child: AnimatedOpacity(
                            duration: const Duration(milliseconds: 180),
                            opacity: searchIsActive ? 1 : 0,
                            child: TextFieldTapRegion(
                              child: Listener(
                                behavior: HitTestBehavior.opaque,
                                onPointerDown: (_) =>
                                    header.onSearchBackHold?.call(),
                                onPointerUp: (_) =>
                                    header.onSearchCancel?.call(),
                                onPointerCancel: (_) =>
                                    header.onSearchCancel?.call(),
                                child: IconButton(
                                  onPressed: header.onSearchCancel,
                                  tooltip: 'Back',
                                  color: searchIsActive
                                      ? const Color(0xFF162033)
                                      : Colors.white,
                                  iconSize: 26,
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints.tightFor(
                                    width: 48,
                                    height: 48,
                                  ),
                                  icon: const Icon(Icons.chevron_left_rounded),
                                ),
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

    if (searchActiveOverride != null) {
      return buildHero(searchIsActive: searchActiveOverride!);
    }

    if (header == null || listenables.isEmpty) {
      return buildHero(searchIsActive: false);
    }

    return ListenableBuilder(
      listenable: Listenable.merge(listenables),
      builder: (context, child) {
        final searchIsActive =
            header.isSearchModeListenable?.value == true ||
            header.searchFocusNode.hasFocus;
        return buildHero(searchIsActive: searchIsActive);
      },
    );
  }
}

class _ShopStickySearchHeader extends StatelessWidget {
  const _ShopStickySearchHeader({
    required this.header,
    required this.backgroundColor,
    required this.primaryColor,
    required this.dealSortMask,
    required this.dealsActiveColor,
    required this.dealsInactiveColor,
    required this.onDealsTap,
    required this.onSearchTap,
    this.newPostActive = false,
  });

  /// Brand bar + search field + deals row under the status bar.
  static double estimateHeight(
    BuildContext context, {
    bool showDeliveryLocation = false,
  }) {
    final statusBar = MediaQuery.paddingOf(context).top;
    final brandBarHeight = showDeliveryLocation ? 72.0 : 56.0;
    const searchBlockHeight = 52.0;
    return statusBar +
        brandBarHeight +
        searchBlockHeight +
        _DealsCarousel.totalHeight;
  }

  final _ShopShowcaseOverlayHeaderData header;
  final Color backgroundColor;
  final Color primaryColor;
  final int dealSortMask;
  final bool newPostActive;
  final Color dealsActiveColor;
  final Color dealsInactiveColor;
  final ValueChanged<int> onDealsTap;
  final VoidCallback onSearchTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iconColor = theme.colorScheme.onSurface;
    final searchColor = theme.colorScheme.surfaceContainerHighest.withValues(
      alpha: 0.72,
    );

    return Material(
      color: backgroundColor,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.18),
      surfaceTintColor: Colors.transparent,
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _SwitchPlatformBrandAppBar(
              iconColor: iconColor,
              surfaceColor: backgroundColor,
              primaryColor: primaryColor,
              accountName: header.accountName,
              accountInitials: header.accountInitials,
              accountImageUrl: header.accountImageUrl,
              selectedAction: header.selectedAction,
              onMenuTap: header.onMenuTap,
              onNotificationTap: header.onNotificationTap,
              onCartTap: header.onCartTap,
              onAccountTap: header.onAccountTap,
              showDeliveryLocation: header.showDeliveryLocation,
              deliveryLocationTitle: header.deliveryLocationTitle,
              onDeliveryLocationTap: header.onDeliveryLocationTap,
              useFoodCartIcon: header.useFoodCartIcon,
              useSafeArea: false,
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onSearchTap,
                  child: IgnorePointer(
                    child: app_search.ProductSearchBar(
                      controller: header.searchController,
                      // Display mirror of the main Shop search — taps open that.
                      readOnly: true,
                      showClearButton: false,
                      iconColor: const Color(0xFF6B7280),
                      textColor: const Color(0xFF162033),
                      backgroundColor: searchColor,
                      hintText: header.searchHintText,
                      onTapOutside: (_) {},
                    ),
                  ),
                ),
              ),
            ),
            _DealsCarousel(
              dealSortMask: dealSortMask,
              newPostActive: newPostActive,
              backgroundColor: backgroundColor,
              activeColor: dealsActiveColor,
              inactiveColor: dealsInactiveColor,
              onTap: onDealsTap,
            ),
          ],
        ),
      ),
    );
  }
}

class _ShopPlatformHeroClipper extends CustomClipper<Path> {
  const _ShopPlatformHeroClipper();

  @override
  Path getClip(Size size) {
    return Path()
      ..lineTo(0, size.height - 38)
      ..cubicTo(
        size.width * 0.24,
        size.height - 8,
        size.width * 0.58,
        size.height + 2,
        size.width,
        size.height - 48,
      )
      ..lineTo(size.width, 0)
      ..close();
  }

  @override
  bool shouldReclip(covariant _ShopPlatformHeroClipper oldClipper) => false;
}

Widget _switchShopBrandMark({
  required BuildContext context,
  required String platformLabel,
  required BuyerPlatformSummary? platform,
  required Color titleColor,
  required Color primaryColor,
  double logoSize = 36,
  double fontSize = 22,
}) {
  final label = platformLabel.trim().isEmpty ? 'Shop' : platformLabel.trim();
  final platformForIcon =
      platform ?? BuyerPlatformSummary(id: label.toLowerCase(), name: label);
  final platformArt = _homeBuyerPlatformLabelArt(platformForIcon);

  return Semantics(
    label: 'Switch $label',
    header: true,
    child: Row(
      children: [
        SizedBox(
          width: logoSize,
          height: logoSize,
          child: SvgPicture.asset(
            _switchLogoAsset,
            fit: BoxFit.contain,
            semanticsLabel: 'Switch',
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'Switch',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: titleColor,
                    fontSize: fontSize,
                    fontWeight: FontWeight.w500,
                    height: 1.1,
                  ),
                ),
                const WidgetSpan(
                  alignment: PlaceholderAlignment.middle,
                  child: SizedBox(width: 8),
                ),
                WidgetSpan(
                  alignment: PlaceholderAlignment.middle,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(10, 5, 10, 5),
                    decoration: BoxDecoration(
                      color: primaryColor,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(20),
                        topRight: Radius.circular(8),
                        bottomRight: Radius.circular(20),
                        bottomLeft: Radius.circular(8),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: primaryColor.withOpacity(0.28),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        platformArt != null
                            ? Image.asset(
                                platformArt,
                                width: 18,
                                height: 18,
                                fit: BoxFit.contain,
                                filterQuality: FilterQuality.high,
                                isAntiAlias: true,
                              )
                            : _buyerPlatformSvgIcon(
                                platform: platformForIcon,
                                color: Colors.white,
                                size: 14,
                              ),
                        const SizedBox(width: 5),
                        Text(
                          label,
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w500,
                                height: 1.2,
                                fontSize: 12,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    ),
  );
}

/// HTML-aligned Switch Shop side menu (brand + Home + platforms).
class _SwitchShopPlatformSidebar extends StatelessWidget {
  const _SwitchShopPlatformSidebar({
    required this.platformsFuture,
    required this.activePlatformId,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
    required this.onClose,
    required this.onHomeTap,
    required this.onCategoriesTap,
    required this.onSelectPlatform,
    this.categoriesSelected = false,
  });

  final Future<List<BuyerPlatformSummary>> platformsFuture;
  final String activePlatformId;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;
  final VoidCallback onClose;
  final VoidCallback onHomeTap;
  final VoidCallback onCategoriesTap;
  final ValueChanged<BuyerPlatformSummary> onSelectPlatform;
  final bool categoriesSelected;

  @override
  Widget build(BuildContext context) {
    final resolvedSurfaceColor = surfaceColor.a == 0
        ? Theme.of(context).colorScheme.surface
        : surfaceColor;

    return Drawer(
      backgroundColor: resolvedSurfaceColor,
      surfaceTintColor: Colors.transparent,
      width: math.min(300, MediaQuery.sizeOf(context).width - 48),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 12, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: FutureBuilder<List<BuyerPlatformSummary>>(
                      future: platformsFuture,
                      builder: (context, snapshot) {
                        final platforms =
                            snapshot.data ?? _defaultBuyerPlatforms();
                        BuyerPlatformSummary? match;
                        for (final item in platforms) {
                          if (item.id == activePlatformId) {
                            match = item;
                            break;
                          }
                        }
                        return _switchShopBrandMark(
                          context: context,
                          platformLabel: match?.name ?? 'Shop',
                          platform: match,
                          titleColor: titleColor,
                          primaryColor: primaryColor,
                          logoSize: 32,
                          fontSize: 20,
                        );
                      },
                    ),
                  ),
                  IconButton(
                    onPressed: onClose,
                    tooltip: 'Close menu',
                    icon: Icon(Icons.close_rounded, color: secondaryColor),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SwitchShopSidebarLink(
                label: 'Home',
                icon: Icons.home_outlined,
                selected: false,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
                primaryColor: primaryColor,
                onTap: onHomeTap,
              ),
              _SwitchShopSidebarLink(
                label: 'Categories',
                selected: categoriesSelected,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
                primaryColor: primaryColor,
                leadingSlotSize: 26,
                leading: Image.asset(
                  'assets/images/sidebar-dark-red-pattern.png',
                  width: 26,
                  height: 26,
                  fit: BoxFit.contain,
                  filterQuality: FilterQuality.high,
                  isAntiAlias: true,
                ),
                onTap: onCategoriesTap,
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
                child: Text(
                  'Platforms',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: secondaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Expanded(
                child: FutureBuilder<List<BuyerPlatformSummary>>(
                  future: platformsFuture,
                  builder: (context, snapshot) {
                    final platforms = [
                      ...(snapshot.data ?? _defaultBuyerPlatforms()),
                    ]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

                    return ListView.separated(
                      itemCount: platforms.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 4),
                      itemBuilder: (context, index) {
                        final platform = platforms[index];
                        final platformArt = _homeBuyerPlatformLabelArt(
                          platform,
                        );
                        final platformIconSize = _buyerPlatformIconDisplaySize(
                          platform,
                        );
                        final isActive =
                            platform.id ==
                            activePlatformId.trim().toLowerCase();
                        final unavailable =
                            platform.status == 'inactive' ||
                            platform.comingSoon;
                        final label = unavailable && !isActive
                            ? '${platform.name} · Soon'
                            : platform.name;

                        return _SwitchShopSidebarLink(
                          label: label,
                          selected: isActive && !categoriesSelected,
                          disabled: unavailable && !isActive,
                          titleColor: titleColor,
                          secondaryColor: secondaryColor,
                          primaryColor: primaryColor,
                          leadingSlotSize: 30,
                          leading: platformArt != null
                              ? Image.asset(
                                  platformArt,
                                  width: platformIconSize,
                                  height: platformIconSize,
                                  fit: BoxFit.contain,
                                  filterQuality: FilterQuality.high,
                                  isAntiAlias: true,
                                )
                              : _buyerPlatformSvgIcon(
                                  platform: platform,
                                  color: isActive
                                      ? primaryColor
                                      : secondaryColor,
                                  size: platformIconSize,
                                ),
                          onTap: unavailable && !isActive
                              ? () => onSelectPlatform(platform)
                              : () => onSelectPlatform(platform),
                        );
                      },
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

class _SwitchShopSidebarLink extends StatelessWidget {
  const _SwitchShopSidebarLink({
    required this.label,
    required this.selected,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.onTap,
    this.icon,
    this.leading,
    this.leadingSlotSize = 24,
    this.disabled = false,
  });

  final String label;
  final bool selected;
  final bool disabled;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final VoidCallback onTap;
  final IconData? icon;
  final Widget? leading;
  final double leadingSlotSize;

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? primaryColor
        : (disabled ? secondaryColor.withOpacity(0.55) : titleColor);

    return Material(
      color: selected ? primaryColor.withOpacity(0.10) : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          child: Row(
            children: [
              SizedBox(
                width: leadingSlotSize,
                height: leadingSlotSize,
                child:
                    leading ??
                    Icon(icon ?? Icons.circle_outlined, color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: color,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
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

/// App product slideshow for Switch Shop (not platform hero background).
class _ShopProductsShowcaseBanner extends StatefulWidget {
  const _ShopProductsShowcaseBanner({
    required this.productsFuture,
    required this.primaryColor,
    required this.secondaryColor,
    this.overlayHeader,
    this.headerPrimaryColor,
  });

  static const double height = 248;

  final Future<List<Product>> productsFuture;
  final Color primaryColor;
  final Color secondaryColor;
  final _ShopShowcaseOverlayHeaderData? overlayHeader;
  final Color? headerPrimaryColor;

  @override
  State<_ShopProductsShowcaseBanner> createState() =>
      _ShopProductsShowcaseBannerState();
}

class _ShopProductsShowcaseBannerState
    extends State<_ShopProductsShowcaseBanner> {
  Color _iconColor = Colors.white;
  Color _previousIconColor = Colors.white;
  int _luminanceToken = 0;

  Future<void> _syncIconColorForProduct(Product? product) async {
    final token = ++_luminanceToken;
    final imageUrl = product?.cardDisplayImageUrl.trim() ?? '';
    final luminance = imageUrl.isEmpty
        ? 0.32
        : await _sampleImageTopLuminance(imageUrl);
    if (!mounted || token != _luminanceToken) {
      return;
    }

    final next = _shopHeaderIconColorForLuminance(luminance);
    if (next == _iconColor) {
      return;
    }

    setState(() {
      _previousIconColor = _iconColor;
      _iconColor = next;
    });
  }

  Widget _buildOverlayHeader(Color iconColor) {
    final header = widget.overlayHeader;
    if (header == null) {
      return const SizedBox.shrink();
    }

    return _SwitchPlatformBrandAppBar(
      iconColor: iconColor,
      primaryColor: widget.headerPrimaryColor ?? widget.primaryColor,
      accountName: header.accountName,
      accountInitials: header.accountInitials,
      accountImageUrl: header.accountImageUrl,
      selectedAction: header.selectedAction,
      onMenuTap: header.onMenuTap,
      onNotificationTap: header.onNotificationTap,
      onCartTap: header.onCartTap,
      onAccountTap: header.onAccountTap,
      showDeliveryLocation: header.showDeliveryLocation,
      deliveryLocationTitle: header.deliveryLocationTitle,
      onDeliveryLocationTap: header.onDeliveryLocationTap,
      useFoodCartIcon: header.useFoodCartIcon,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: _ShopProductsShowcaseBanner.height,
      child: FutureBuilder<List<Product>>(
        future: widget.productsFuture,
        builder: (context, snapshot) {
          final showcaseProducts = _buildShowcaseProducts(
            snapshot.data ?? const <Product>[],
          );

          if (showcaseProducts.products.isEmpty) {
            final isLoading =
                snapshot.connectionState == ConnectionState.waiting;
            final emptyIconColor = _shopHeaderIconOnLight;
            return Stack(
              fit: StackFit.expand,
              children: [
                Container(
                  color: widget.primaryColor.withOpacity(0.14),
                  alignment: Alignment.center,
                  padding: const EdgeInsets.fromLTRB(20, 64, 20, 20),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isLoading
                            ? 'Loading showcase…'
                            : 'No showcase images yet',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        isLoading
                            ? 'Fetching latest shop products.'
                            : 'New shop products with images will slide here.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: widget.secondaryColor,
                          height: 1.35,
                        ),
                      ),
                      if (isLoading) ...[
                        const SizedBox(height: 14),
                        const SkeletonShowcaseBanner(),
                      ],
                    ],
                  ),
                ),
                if (widget.overlayHeader != null)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: _buildOverlayHeader(emptyIconColor),
                  ),
              ],
            );
          }

          return Stack(
            fit: StackFit.expand,
            children: [
              _NewProductsShowcase(
                products: showcaseProducts.products,
                isFallback: showcaseProducts.isFallback,
                primaryColor: widget.primaryColor,
                featuredDiscountProductId:
                    showcaseProducts.featuredDiscountProductId,
                onVisibleProductChanged: _syncIconColorForProduct,
                platformId: '',
              ),
              if (widget.overlayHeader != null)
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: TweenAnimationBuilder<Color?>(
                    tween: ColorTween(
                      begin: _previousIconColor,
                      end: _iconColor,
                    ),
                    duration: const Duration(milliseconds: 420),
                    curve: Curves.easeOutCubic,
                    builder: (context, color, child) {
                      return _buildOverlayHeader(color ?? _iconColor);
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _ShopCategoryChipBar extends StatelessWidget {
  const _ShopCategoryChipBar({
    required this.categories,
    required this.selected,
    required this.primaryColor,
    required this.secondaryColor,
    required this.surfaceColor,
    required this.onSelect,
  });

  final List<String> categories;
  final String selected;
  final Color primaryColor;
  final Color secondaryColor;
  final Color surfaceColor;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final chips = <String>['all', ...categories];
    return Material(
      color: surfaceColor,
      child: SizedBox(
        height: 52,
        child: HorizontalEndFade(
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 8, 22, 10),
            itemCount: chips.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final value = chips[index];
              final label = value == 'all' ? 'All' : value;
              final isActive = selected == value;
              return ChoiceChip(
                label: Text(label),
                selected: isActive,
                onSelected: (_) => onSelect(value),
                selectedColor: primaryColor,
                labelStyle: TextStyle(
                  color: isActive ? Colors.white : secondaryColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
                backgroundColor: surfaceColor,
                side: BorderSide(
                  color: isActive
                      ? primaryColor
                      : secondaryColor.withValues(alpha: 0.25),
                ),
                showCheckmark: false,
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ShopBusinessTypesPage extends StatelessWidget {
  const _ShopBusinessTypesPage({
    required this.platformId,
    required this.storeTypesFuture,
    this.scrollController,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.onRefresh,
    required this.onSelect,
  });

  final String platformId;
  final Future<List<StoreTypeSummary>> storeTypesFuture;
  final ScrollController? scrollController;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final Future<void> Function() onRefresh;
  final ValueChanged<StoreTypeSummary> onSelect;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<StoreTypeSummary>>(
      future: storeTypesFuture,
      builder: (context, snapshot) {
        final all = snapshot.data ?? const <StoreTypeSummary>[];
        final types = _storeTypesForPlatform(all, platformId);

        if (snapshot.connectionState == ConnectionState.waiting &&
            types.isEmpty) {
          return ColoredBox(
            color: backgroundColor,
            child: SkeletonProductGrid(
              count: 4,
              crossAxisCount: 2,
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
            ),
          );
        }

        if (snapshot.hasError && types.isEmpty) {
          return _RefreshStateView(
            onRefresh: onRefresh,
            minHeight: 280,
            backgroundColor: backgroundColor,
            child: _DashboardStateCard(
              icon: Icons.cloud_off_rounded,
              title: 'Unavailable',
              message: '',
              primaryColor: primaryColor,
              surfaceColor: backgroundColor,
              secondaryColor: secondaryColor,
              borderRadius: 0,
            ),
          );
        }

        if (types.isEmpty) {
          return _RefreshStateView(
            onRefresh: onRefresh,
            minHeight: 280,
            backgroundColor: backgroundColor,
            child: _DashboardStateCard(
              icon: Icons.storefront_rounded,
              title: 'Coming Soon',
              message: '',
              primaryColor: primaryColor,
              surfaceColor: backgroundColor,
              secondaryColor: secondaryColor,
              borderRadius: 0,
            ),
          );
        }

        return _SwitchRefreshIndicator(
          onRefresh: onRefresh,
          child: GridView.builder(
            controller: scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 20),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.05,
            ),
            itemCount: types.length,
            itemBuilder: (context, index) {
              final item = types[index];
              final imageUrl = item.iconImageUrl.trim().isNotEmpty
                  ? item.iconImageUrl.trim()
                  : item.heroImageUrl.trim();
              return Material(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  onTap: () => onSelect(item),
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: SizedBox(
                            width: 48,
                            height: 48,
                            child: imageUrl.isEmpty
                                ? ColoredBox(
                                    color: primaryColor.withOpacity(0.12),
                                    child: Center(
                                      child: Text(
                                        item.initial,
                                        style: TextStyle(
                                          color: primaryColor,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  )
                                : CachedNetworkImage(
                                    imageUrl: imageUrl,
                                    fit: BoxFit.cover,
                                    errorWidget: (_, __, ___) => ColoredBox(
                                      color: primaryColor.withOpacity(0.12),
                                      child: Center(
                                        child: Text(
                                          item.initial,
                                          style: TextStyle(
                                            color: primaryColor,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          item.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(
                                color: titleColor,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${item.categories.length} categor${item.categories.length == 1 ? 'y' : 'ies'}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: secondaryColor),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _HomeCompaniesPage extends StatelessWidget {
  const _HomeCompaniesPage({
    required this.sellersFuture,
    required this.productsFuture,
    this.scrollController,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.onRefresh,
    required this.onScrollOffsetChanged,
    this.storeTypeFilter,
    this.categoryFilter,
  });

  final Future<List<SellerSummary>> sellersFuture;
  final Future<List<Product>> productsFuture;
  final ScrollController? scrollController;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final Future<void> Function() onRefresh;
  final ValueChanged<double> onScrollOffsetChanged;
  final String? storeTypeFilter;
  final String? categoryFilter;

  String _companyKeyForSeller(SellerSummary seller) {
    final adminId = seller.adminId.trim();
    if (adminId.isNotEmpty) {
      return 'admin:${adminId.toLowerCase()}';
    }

    final companyName = seller.displayName.trim();
    final companyPictureUrl = seller.displayImageUrl.trim();
    if (companyName.isEmpty && companyPictureUrl.isEmpty) {
      return '';
    }

    return 'company:${companyName.toLowerCase()}|${companyPictureUrl.toLowerCase()}';
  }

  String _companyKeyForProduct(Product product) {
    final adminId = product.adminId.trim();
    if (adminId.isNotEmpty) {
      return 'admin:${adminId.toLowerCase()}';
    }

    final companyName = product.companyName.trim();
    final companyPictureUrl = product.companyPictureUrl.trim();
    if (companyName.isEmpty && companyPictureUrl.isEmpty) {
      return '';
    }

    return 'company:${companyName.toLowerCase()}|${companyPictureUrl.toLowerCase()}';
  }

  List<_CompanyListing> _buildCompanyListings({
    required List<SellerSummary> sellers,
    required List<Product> products,
  }) {
    final wantedStoreType = _normalizeBuyerKey(storeTypeFilter ?? '');
    final wantedCategory = _normalizeBuyerKey(categoryFilter ?? '');

    final filteredSellers = wantedStoreType.isEmpty
        ? sellers
        : sellers
              .where(
                (seller) =>
                    _normalizeBuyerKey(seller.storeType) == wantedStoreType,
              )
              .toList(growable: false);

    final adminIds = filteredSellers
        .map((seller) => seller.adminId.trim().toLowerCase())
        .where((id) => id.isNotEmpty)
        .toSet();

    var visibleProducts = filterVisibleProducts(products);
    if (wantedStoreType.isNotEmpty) {
      visibleProducts = visibleProducts
          .where((product) {
            final adminId = product.adminId.trim().toLowerCase();
            return adminId.isNotEmpty && adminIds.contains(adminId);
          })
          .toList(growable: false);
    }
    if (wantedCategory.isNotEmpty) {
      visibleProducts = visibleProducts
          .where((product) => product.belongsToCategory(wantedCategory))
          .toList(growable: false);
    }

    final companiesByKey = <String, _MutableCompanyListing>{};

    for (final seller in filteredSellers) {
      final companyKey = _companyKeyForSeller(seller);
      if (companyKey.isEmpty) {
        continue;
      }

      companiesByKey.putIfAbsent(
        companyKey,
        () => _MutableCompanyListing(
          id: companyKey,
          adminId: seller.adminId.trim(),
          name: seller.displayName,
          storeType: seller.storeType,
          pictureUrl: seller.displayImageUrl,
        ),
      );
    }

    for (final product in visibleProducts) {
      final companyKey = _companyKeyForProduct(product);
      if (companyKey.isEmpty) {
        continue;
      }

      final company = companiesByKey.putIfAbsent(
        companyKey,
        () => _MutableCompanyListing(
          id: companyKey,
          adminId: product.adminId.trim(),
          name: product.companyName.trim(),
          storeType: storeTypeFilter?.trim() ?? '',
          pictureUrl: product.companyPictureUrl.trim(),
        ),
      );
      company.addProduct(product);
    }

    if (wantedCategory.isNotEmpty) {
      companiesByKey.removeWhere((_, company) => company.productCount == 0);
    }

    final companies =
        companiesByKey.values
            .map((company) => company.toCompanyListing())
            .toList(growable: false)
          ..sort((first, second) {
            if (first.hasListings != second.hasListings) {
              return first.hasListings ? -1 : 1;
            }

            final firstLatestProduct = first.latestProduct;
            final secondLatestProduct = second.latestProduct;
            if (firstLatestProduct != null && secondLatestProduct != null) {
              final dateCompare = secondLatestProduct.createdAt.compareTo(
                firstLatestProduct.createdAt,
              );
              if (dateCompare != 0) {
                return dateCompare;
              }
            } else if (firstLatestProduct != null) {
              return -1;
            } else if (secondLatestProduct != null) {
              return 1;
            }

            return first.name.toLowerCase().compareTo(
              second.name.toLowerCase(),
            );
          });

    return companies;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return FutureBuilder<List<SellerSummary>>(
          future: sellersFuture,
          builder: (context, sellersSnapshot) {
            final sellers = sellersSnapshot.data ?? const <SellerSummary>[];

            if (sellersSnapshot.connectionState == ConnectionState.waiting &&
                sellers.isEmpty) {
              return _RefreshStateView(
                onRefresh: onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: backgroundColor,
                child: SizedBox(
                  height: constraints.maxHeight,
                  child: const SkeletonProductGrid(count: 6),
                ),
              );
            }

            if (sellersSnapshot.hasError && sellers.isEmpty) {
              return _RefreshStateView(
                onRefresh: onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: backgroundColor,
                child: _DashboardStateCard(
                  icon: Icons.cloud_off_rounded,
                  title: 'Companies unavailable',
                  message: sellersSnapshot.error.toString(),
                  primaryColor: primaryColor,
                  surfaceColor: backgroundColor,
                  secondaryColor: secondaryColor,
                  borderRadius: 0,
                ),
              );
            }

            return FutureBuilder<List<Product>>(
              future: productsFuture,
              builder: (context, productsSnapshot) {
                final products = productsSnapshot.hasError
                    ? const <Product>[]
                    : productsSnapshot.data ?? const <Product>[];
                final companies = _buildCompanyListings(
                  sellers: sellers,
                  products: products,
                );

                if (companies.isEmpty) {
                  return _RefreshStateView(
                    onRefresh: onRefresh,
                    minHeight: constraints.maxHeight,
                    backgroundColor: backgroundColor,
                    child: _DashboardStateCard(
                      icon: Icons.storefront_rounded,
                      title: 'Coming Soon',
                      message: '',
                      primaryColor: primaryColor,
                      surfaceColor: backgroundColor,
                      secondaryColor: secondaryColor,
                      borderRadius: 0,
                    ),
                  );
                }

                return _SwitchRefreshIndicator(
                  onRefresh: onRefresh,
                  child: NotificationListener<ScrollNotification>(
                    onNotification: (notification) {
                      if (notification.depth != 0 ||
                          notification.metrics.axis != Axis.vertical) {
                        return false;
                      }

                      final offset = notification.metrics.pixels;
                      onScrollOffsetChanged(offset < 0 ? 0 : offset);
                      return false;
                    },
                    child: ColoredBox(
                      color: backgroundColor,
                      child: GridView.builder(
                        controller: scrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(10, 10, 10, 16),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 0.72,
                            ),
                        itemCount: companies.length,
                        itemBuilder: (context, index) {
                          return _CompanyCard(
                            company: companies[index],
                            surfaceColor: surfaceColor,
                            titleColor: titleColor,
                            secondaryColor: secondaryColor,
                            primaryColor: primaryColor,
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

class _CompanyCard extends StatelessWidget {
  const _CompanyCard({
    required this.company,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
  });

  final _CompanyListing company;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;

  bool get _canOpenSeller => company.adminId.trim().isNotEmpty;

  void _openCompany(BuildContext context) {
    if (!_canOpenSeller) {
      return;
    }

    Navigator.of(context).pushNamed(
      '/seller',
      arguments: {'adminId': company.adminId, 'initialName': company.name},
    );
  }

  @override
  Widget build(BuildContext context) {
    return ProductCardTapLift(
      onTap: _canOpenSeller ? () => _openCompany(context) : null,
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: surfaceColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              _ProductDashboard._homeProductCardBorderRadius,
            ),
            side: const BorderSide(
              color: ui.Color.fromARGB(255, 238, 238, 238),
              width: 1,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: handleTap,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final imageHeight = constraints.maxHeight * 0.70;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ProductCardTapLift.liftImage(
                      liftValue: liftValue,
                      child: _CompanyImage(
                        company: company,
                        primaryColor: primaryColor,
                        height: imageHeight,
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              company.storeTypeWithSoldLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.labelSmall
                                  ?.copyWith(
                                    color: primaryColor,
                                    fontWeight: FontWeight.w700,
                                    height: 1.15,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              company.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(
                                    fontSize: 15,
                                    color: titleColor,
                                    fontWeight: FontWeight.w500,
                                    height: 1.05,
                                  ),
                            ),
                            const Spacer(),
                            Text(
                              company.statusLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: company.hasListings
                                        ? secondaryColor
                                        : primaryColor,
                                    fontWeight: company.hasListings
                                        ? FontWeight.w500
                                        : FontWeight.w800,
                                    height: 1,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }
}

class _CompanyImage extends StatelessWidget {
  const _CompanyImage({
    required this.company,
    required this.primaryColor,
    required this.height,
  });

  final _CompanyListing company;
  final Color primaryColor;
  final double height;

  @override
  Widget build(BuildContext context) {
    final imageUrl = company.displayImageUrl.trim();
    final dataImageBytes = _decodeDataImageBytes(imageUrl);
    final latestProduct = company.latestProduct;

    return SizedBox(
      height: height,
      width: double.infinity,
      child: dataImageBytes != null
          ? Image.memory(
              dataImageBytes,
              fit: BoxFit.cover,
              gaplessPlayback: true,
            )
          : imageUrl.isNotEmpty
          ? CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              alignment: company.pictureUrl.trim().isNotEmpty
                  ? Alignment.center
                  : latestProduct == null
                  ? Alignment.center
                  : Alignment(
                      latestProduct.cardImageAlignmentX,
                      latestProduct.cardImageAlignmentY,
                    ),
              fadeInDuration: const Duration(milliseconds: 300),
              fadeOutDuration: const Duration(milliseconds: 200),
              placeholderFadeInDuration: const Duration(milliseconds: 300),
              errorWidget: (context, url, error) {
                return _CompanyImageFallback(
                  initial: company.initial,
                  primaryColor: primaryColor,
                );
              },
            )
          : _CompanyImageFallback(
              initial: company.initial,
              primaryColor: primaryColor,
            ),
    );
  }
}

class _CompanyImageFallback extends StatelessWidget {
  const _CompanyImageFallback({
    required this.initial,
    required this.primaryColor,
  });

  final String initial;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: primaryColor.withOpacity(0.12),
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

class _ShopVisualSearchBanner extends StatelessWidget {
  const _ShopVisualSearchBanner({
    required this.isLoading,
    required this.resultCount,
    required this.errorMessage,
    required this.primaryColor,
    required this.secondaryColor,
    required this.surfaceColor,
    required this.onClear,
  });

  final bool isLoading;
  final int? resultCount;
  final String errorMessage;
  final Color primaryColor;
  final Color secondaryColor;
  final Color surfaceColor;
  final VoidCallback onClear;

  String get _title {
    if (errorMessage.isNotEmpty) {
      return 'Visual search unavailable';
    }

    if (isLoading) {
      return 'Searching by image';
    }

    final count = resultCount ?? 0;
    return '$count visual match${count == 1 ? '' : 'es'}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: surfaceColor,
      padding: const EdgeInsets.fromLTRB(14, 8, 8, 8),
      child: Row(
        children: [
          Icon(
            errorMessage.isNotEmpty
                ? Icons.error_outline_rounded
                : Icons.center_focus_strong_rounded,
            size: 18,
            color: errorMessage.isNotEmpty
                ? const Color(0xFFD32F2F)
                : primaryColor,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: errorMessage.isNotEmpty
                    ? const Color(0xFFD32F2F)
                    : secondaryColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          IconButton(
            onPressed: onClear,
            tooltip: 'Clear visual search',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints.tightFor(width: 32, height: 32),
            icon: Icon(Icons.close_rounded, size: 18, color: secondaryColor),
          ),
        ],
      ),
    );
  }
}

Uint8List? _decodeDataImageBytes(String imageUrl) {
  final normalizedUrl = imageUrl.trim();
  if (!normalizedUrl.toLowerCase().startsWith('data:image/')) {
    return null;
  }

  final commaIndex = normalizedUrl.indexOf(',');
  if (commaIndex < 0 || commaIndex == normalizedUrl.length - 1) {
    return null;
  }

  try {
    return base64Decode(normalizedUrl.substring(commaIndex + 1));
  } catch (_) {
    return null;
  }
}

double? _discountAmount(Product product) {
  final salesPrice = product.salesPrice;
  if (salesPrice == null ||
      salesPrice < 0 ||
      salesPrice >= product.originalPrice) {
    return null;
  }

  return product.originalPrice - salesPrice;
}

int? _discountPercent(Product product) {
  final discountAmount = _discountAmount(product);
  if (discountAmount == null || product.originalPrice <= 0) {
    return null;
  }

  final percent = ((discountAmount / product.originalPrice) * 100).round();
  if (percent <= 0) {
    return null;
  }

  return percent;
}

String _formatProductRating(double rating) => rating.toStringAsFixed(1);

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

bool _hasAvailableStock(Product product) => isProductVisibleToUsers(product);

bool _isNewProductPost(Product product) {
  final cutoffDate = DateTime.now().subtract(_newProductPostDuration);
  return !product.createdAt.isBefore(cutoffDate);
}

List<Product> _buildNewPostProducts(List<Product> products) {
  final recentProducts =
      [...filterVisibleProducts(products).where(_isNewProductPost)]
        ..sort((first, second) {
          final createdAtCompare = second.createdAt.compareTo(first.createdAt);
          if (createdAtCompare != 0) {
            return createdAtCompare;
          }

          return first.name.toLowerCase().compareTo(second.name.toLowerCase());
        });

  return recentProducts;
}

List<Product> _buildFlashDealHomeProducts(List<Product> products) {
  final flashDeals =
      [
        ...filterVisibleProducts(
          products,
        ).where((product) => _discountAmount(product) != null),
      ]..sort((first, second) {
        final firstDiscount = _discountAmount(first) ?? 0;
        final secondDiscount = _discountAmount(second) ?? 0;
        final discountCompare = secondDiscount.compareTo(firstDiscount);
        if (discountCompare != 0) {
          return discountCompare;
        }

        return first.name.toLowerCase().compareTo(second.name.toLowerCase());
      });

  return flashDeals;
}

/// Home All carousel: prefer real top-sellers; if none have sold counts yet,
/// still show visible products so the section is not blank.
List<Product> _buildTopSellingHomeProducts(List<Product> products) {
  final ranked = _buildTopSellingProducts(products);
  if (ranked.isNotEmpty) {
    return ranked;
  }

  final fallback =
      [...filterVisibleProducts(products)]..sort((first, second) {
        final soldCompare = second.sold.compareTo(first.sold);
        if (soldCompare != 0) {
          return soldCompare;
        }

        final ratingCompare = second.rating.compareTo(first.rating);
        if (ratingCompare != 0) {
          return ratingCompare;
        }

        return first.name.toLowerCase().compareTo(second.name.toLowerCase());
      });

  return fallback.take(10).toList();
}

bool _isTopRatedProduct(Product product) =>
    product.rating >= 4.5 && product.rating <= 5;

List<Product> _buildTopRatingProducts(
  List<Product> products, {
  int limit = 10,
}) {
  final topReviewedProducts =
      [...filterVisibleProducts(products).where(_isTopRatedProduct)]
        ..sort((first, second) {
          final ratingCompare = second.rating.compareTo(first.rating);
          if (ratingCompare != 0) {
            return ratingCompare;
          }

          return second.sold.compareTo(first.sold);
        });

  return topReviewedProducts.take(limit).toList();
}

/// Home All carousel: prefer 4.5–5.0 rated products; fallback to highest rated.
List<Product> _buildTopRatingHomeProducts(List<Product> products) {
  final ranked = _buildTopRatingProducts(products);
  if (ranked.isNotEmpty) {
    return ranked;
  }

  final fallback =
      [...filterVisibleProducts(products)]..sort((first, second) {
        final ratingCompare = second.rating.compareTo(first.rating);
        if (ratingCompare != 0) {
          return ratingCompare;
        }

        return second.sold.compareTo(first.sold);
      });

  return fallback.take(10).toList();
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

Product? _findTopDiscountProduct(List<Product> products) {
  Product? topDiscountProduct;
  double highestDiscount = -1;

  for (final product in products) {
    final discountAmount = _discountAmount(product);
    if (discountAmount == null || discountAmount <= highestDiscount) {
      continue;
    }

    topDiscountProduct = product;
    highestDiscount = discountAmount;
  }

  return topDiscountProduct;
}

List<Product> _prioritizeFeaturedProduct(
  List<Product> products, {
  Product? featuredProduct,
  int? limit,
}) {
  final prioritized = <Product>[];

  if (featuredProduct != null) {
    prioritized.add(featuredProduct);
  }

  for (final product in products) {
    if (featuredProduct != null && product.id == featuredProduct.id) {
      continue;
    }
    prioritized.add(product);
  }

  if (limit != null && prioritized.length > limit) {
    return prioritized.take(limit).toList();
  }

  return prioritized;
}

_ShowcaseProducts _buildShowcaseProducts(List<Product> products) {
  final inStockProducts = products.where(_hasAvailableStock).toList();

  if (inStockProducts.isEmpty) {
    return const _ShowcaseProducts(products: []);
  }

  final sortedProducts = [...inStockProducts]
    ..sort((first, second) => second.createdAt.compareTo(first.createdAt));

  final recentProducts = sortedProducts.where(_isNewProductPost).toList();

  if (recentProducts.isNotEmpty) {
    final topDiscountProduct = _findTopDiscountProduct(recentProducts);
    final showcaseProducts = _prioritizeFeaturedProduct(
      recentProducts,
      featuredProduct: topDiscountProduct,
      limit: _newProductsShowcaseLimit,
    );

    return _ShowcaseProducts(
      products: showcaseProducts,
      featuredDiscountProductId: topDiscountProduct?.id,
    );
  }

  final topDiscountProduct = _findTopDiscountProduct(sortedProducts);
  final fallbackProducts = _prioritizeFeaturedProduct(
    sortedProducts,
    featuredProduct: topDiscountProduct,
    limit: 5,
  );

  return _ShowcaseProducts(
    products: fallbackProducts,
    isFallback: true,
    featuredDiscountProductId: topDiscountProduct?.id,
  );
}

class _SectionPlaceholderData {
  const _SectionPlaceholderData({
    required this.title,
    required this.message,
    required this.icon,
  });

  final String title;
  final String message;
  final IconData icon;
}

_SectionPlaceholderData _sectionPlaceholderDataForIndex(int index) {
  switch (index) {
    case 1:
      return const _SectionPlaceholderData(
        title: 'Scan',
        message: 'Scan a product photo to search by image.',
        icon: Icons.qr_code_scanner_rounded,
      );
    case 2:
      return const _SectionPlaceholderData(
        title: 'Activity',
        message:
            'Open a platform like Shop to see orders, process updates, and history in the activity sidebar.',
        icon: Icons.history_rounded,
      );
    case 3:
      return const _SectionPlaceholderData(
        title: 'Message',
        message: 'Support chats and seller messages appear here.',
        icon: Icons.chat_bubble_outline_rounded,
      );
    case 4:
      return const _SectionPlaceholderData(
        title: 'Favorites',
        message:
            'Favorites content is separate from Home and will appear here.',
        icon: Icons.favorite_border_rounded,
      );
    case 5:
      return const _SectionPlaceholderData(
        title: 'Feedback',
        message: 'Feedback content is separate from Home and will appear here.',
        icon: Icons.rate_review_outlined,
      );
    case 6:
      return const _SectionPlaceholderData(
        title: 'Customer Support',
        message:
            'Customer support content is separate from Home and will appear here.',
        icon: Icons.support_agent_outlined,
      );
    default:
      return const _SectionPlaceholderData(
        title: 'Section',
        message: 'This section is separate from Home.',
        icon: Icons.dashboard_customize_outlined,
      );
  }
}

class _HomeHeaderVisibilityTransition extends StatelessWidget {
  const _HomeHeaderVisibilityTransition({
    required this.visible,
    required this.child,
  });

  final bool visible;
  final Widget child;

  static const Duration _duration = Duration(milliseconds: 280);

  @override
  Widget build(BuildContext context) {
    // heightFactor collapses the header upward; translate + fade sell the
    // “tumataas” motion on Home search focus.
    return ClipRect(
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(end: visible ? 1 : 0),
        duration: _duration,
        curve: Curves.easeOutCubic,
        builder: (context, value, child) {
          return Align(
            alignment: Alignment.topCenter,
            heightFactor: value,
            child: Transform.translate(
              offset: Offset(0, (1 - value) * 72),
              child: Opacity(opacity: value.clamp(0.0, 1.0), child: child),
            ),
          );
        },
        child: child,
      ),
    );
  }
}

class _HomeHeroSection extends StatelessWidget {
  const _HomeHeroSection({
    required this.productsFuture,
    required this.selectedAction,
    required this.showNewMessagePopup,
    required this.onActionTap,
    required this.onSearchTap,
    required this.activeColor,
    required this.secondaryColor,
    required this.heroImageOpacity,
    required this.heroHeight,
  });

  final Future<List<Product>> productsFuture;
  final _HeaderAction? selectedAction;
  final bool showNewMessagePopup;
  final ValueChanged<_HeaderAction> onActionTap;
  final VoidCallback onSearchTap;
  final Color activeColor;
  final Color secondaryColor;
  final double heroImageOpacity;
  final double heroHeight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final collapsedHeaderBackgroundColor =
        theme.brightness == Brightness.light && heroImageOpacity <= 0.02
        ? (theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface)
        : Colors.transparent;
    final collapsedHeaderColor =
        theme.brightness == Brightness.light && heroImageOpacity <= 0.02
        ? Colors.black
        : Colors.white;

    Widget buildHeroLayer(Widget child) {
      return ClipRect(
        child: OverflowBox(
          alignment: Alignment.topCenter,
          minHeight: 260,
          maxHeight: 260,
          child: SizedBox(
            height: 260,
            child: Opacity(opacity: heroImageOpacity, child: child),
          ),
        ),
      );
    }

    return FutureBuilder<List<Product>>(
      future: productsFuture,
      builder: (context, snapshot) {
        final showcaseProducts = _buildShowcaseProducts(
          snapshot.data ?? const <Product>[],
        );

        if (showcaseProducts.products.isEmpty) {
          return SizedBox(
            width: double.infinity,
            height: heroHeight,
            child: Stack(
              fit: StackFit.expand,
              children: [
                buildHeroLayer(
                  _HomeHeroFallback(
                    primaryColor: activeColor,
                    secondaryColor: secondaryColor,
                    isLoading:
                        snapshot.connectionState == ConnectionState.waiting,
                  ),
                ),
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: _HeaderSection(
                    backgroundColor: collapsedHeaderBackgroundColor,
                    inactiveColor: collapsedHeaderColor,
                    activeColor: collapsedHeaderColor,
                    showNewMessagePopup: showNewMessagePopup,
                    selectedAction: selectedAction,
                    onActionTap: onActionTap,
                    onSearchTap: onSearchTap,
                  ),
                ),
              ],
            ),
          );
        }

        return SizedBox(
          width: double.infinity,
          height: heroHeight,
          child: Stack(
            fit: StackFit.expand,
            children: [
              buildHeroLayer(
                _NewProductsShowcase(
                  products: showcaseProducts.products,
                  isFallback: showcaseProducts.isFallback,
                  primaryColor: activeColor,
                  featuredDiscountProductId:
                      showcaseProducts.featuredDiscountProductId,
                ),
              ),
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: _HeaderSection(
                  backgroundColor: collapsedHeaderBackgroundColor,
                  inactiveColor: collapsedHeaderColor,
                  activeColor: collapsedHeaderColor,
                  showNewMessagePopup: showNewMessagePopup,
                  selectedAction: selectedAction,
                  onActionTap: onActionTap,
                  onSearchTap: onSearchTap,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _HomeHeroFallback extends StatelessWidget {
  const _HomeHeroFallback({
    required this.primaryColor,
    required this.secondaryColor,
    required this.isLoading,
  });

  final Color primaryColor;
  final Color secondaryColor;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: primaryColor.withOpacity(0.14),
      padding: const EdgeInsets.fromLTRB(18, 74, 18, 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.86)),
            child: Text(
              isLoading ? 'Loading' : 'New Products',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: primaryColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            isLoading ? 'Fetching latest products...' : 'No product image yet',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            isLoading
                ? 'Your newest product posts will appear here.'
                : 'Save a product with an image to show it here.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: secondaryColor,
              height: 1.4,
            ),
          ),
          if (isLoading) ...[
            const SizedBox(height: 16),
            const SkeletonBox(width: 48, height: 48, borderRadius: 12),
          ],
        ],
      ),
    );
  }
}

class _ShowcaseProducts {
  const _ShowcaseProducts({
    required this.products,
    this.isFallback = false,
    this.featuredDiscountProductId,
  });

  final List<Product> products;
  final bool isFallback;
  final String? featuredDiscountProductId;
}

class _NewProductsShowcase extends StatefulWidget {
  const _NewProductsShowcase({
    required this.products,
    required this.isFallback,
    required this.primaryColor,
    this.featuredDiscountProductId,
    this.onVisibleProductChanged,
    this.platformId = '',
  });

  final List<Product> products;
  final bool isFallback;
  final Color primaryColor;
  final String? featuredDiscountProductId;
  final ValueChanged<Product>? onVisibleProductChanged;
  final String platformId;

  @override
  State<_NewProductsShowcase> createState() => _NewProductsShowcaseState();
}

class _NewProductsShowcaseState extends State<_NewProductsShowcase> {
  late final PageController _pageController;
  Timer? _autoSlideTimer;
  int _currentPage = 0;
  bool _isUserInteracting = false;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _restartAutoSlide();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _precacheShowcaseImages();
        _notifyVisibleProduct();
      }
    });
  }

  void _notifyVisibleProduct() {
    if (widget.products.isEmpty) {
      return;
    }
    final index = _currentPage.clamp(0, widget.products.length - 1);
    widget.onVisibleProductChanged?.call(widget.products[index]);
  }

  @override
  void didUpdateWidget(covariant _NewProductsShowcase oldWidget) {
    super.didUpdateWidget(oldWidget);

    final hasChanged =
        oldWidget.products.length != widget.products.length ||
        !_sameProductOrder(oldWidget.products, widget.products);

    if (hasChanged) {
      _currentPage = 0;
      if (_pageController.hasClients) {
        _pageController.jumpToPage(0);
      }
      _restartAutoSlide();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _precacheShowcaseImages();
          _notifyVisibleProduct();
        }
      });
    }
  }

  bool _sameProductOrder(List<Product> first, List<Product> second) {
    if (first.length != second.length) {
      return false;
    }

    for (var index = 0; index < first.length; index++) {
      if (first[index].id != second[index].id) {
        return false;
      }
    }

    return true;
  }

  void _restartAutoSlide() {
    _autoSlideTimer?.cancel();

    if (_isUserInteracting || widget.products.length <= 1) {
      return;
    }

    _autoSlideTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!_pageController.hasClients) {
        return;
      }

      final nextPage = (_currentPage + 1) % widget.products.length;
      _pageController.animateToPage(
        nextPage,
        duration: appMotionFrames(27),
        curve: Curves.easeInOut,
      );
    });
  }

  void _precacheShowcaseImages() {
    _ShowcaseImage.precacheProductImages(context, widget.products);
  }

  void _pauseAutoSlide() {
    _autoSlideTimer?.cancel();
    _autoSlideTimer = null;
  }

  void _pauseAutoSlideForUserInteraction() {
    if (_isUserInteracting) {
      return;
    }

    _isUserInteracting = true;
    _pauseAutoSlide();
  }

  void _resumeAutoSlideAfterUserInteraction() {
    if (!_isUserInteracting) {
      return;
    }

    _isUserInteracting = false;
    _restartAutoSlide();
  }

  bool _handleShowcaseScrollNotification(ScrollNotification notification) {
    if (notification.metrics.axis != Axis.horizontal) {
      return false;
    }

    if (notification is ScrollStartNotification &&
        notification.dragDetails != null) {
      _pauseAutoSlideForUserInteraction();
    } else if (notification is UserScrollNotification &&
        notification.direction == ScrollDirection.idle) {
      _resumeAutoSlideAfterUserInteraction();
    } else if (notification is ScrollEndNotification) {
      _resumeAutoSlideAfterUserInteraction();
    }

    return false;
  }

  @override
  void dispose() {
    _autoSlideTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        NotificationListener<ScrollNotification>(
          onNotification: _handleShowcaseScrollNotification,
          child: RepaintBoundary(
            child: PageView.builder(
              controller: _pageController,
              itemCount: widget.products.length,
              onPageChanged: (page) {
                if (_currentPage == page) {
                  return;
                }

                setState(() {
                  _currentPage = page;
                });
                _notifyVisibleProduct();
              },
              itemBuilder: (context, index) {
                return _ShowcaseCard(
                  product: widget.products[index],
                  isFallback: widget.isFallback,
                  primaryColor: widget.primaryColor,
                  featuredDiscountProductId: widget.featuredDiscountProductId,
                  platformId: widget.platformId,
                );
              },
            ),
          ),
        ),
        if (widget.products.length > 1)
          Positioned(
            left: 0,
            right: 0,
            bottom: 14,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(widget.products.length, (index) {
                final isActive = index == _currentPage;

                return AnimatedContainer(
                  duration: appMotionFrames(13),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  height: 7,
                  width: isActive ? 20 : 7,
                  decoration: BoxDecoration(
                    color: isActive
                        ? Colors.white
                        : Colors.white.withOpacity(0.36),
                    borderRadius: BorderRadius.circular(999),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }
}

class _ShowcaseCard extends StatelessWidget {
  const _ShowcaseCard({
    required this.product,
    required this.isFallback,
    required this.primaryColor,
    this.featuredDiscountProductId,
    this.platformId = '',
  });

  final Product product;
  final bool isFallback;
  final Color primaryColor;
  final String? featuredDiscountProductId;
  final String platformId;

  bool get _hasSalesPrice =>
      product.salesPrice != null && product.salesPrice! >= 0;

  bool get _showsOriginalPrice =>
      _hasSalesPrice && product.salesPrice! < product.originalPrice;

  bool get _isNewPost {
    return _isNewProductPost(product);
  }

  bool get _isFeaturedDiscount =>
      featuredDiscountProductId == product.id && _showsOriginalPrice;

  List<String> get _badgeLabels {
    final labels = <String>[];

    if (isFallback) {
      labels.add('Latest Saved');
    } else if (_isNewPost) {
      labels.add('New');
    }

    if (_isFeaturedDiscount) {
      labels.add('Top Discount');
    }

    if (labels.isEmpty) {
      labels.add('Featured');
    }

    return labels;
  }

  double get _displayPrice =>
      _hasSalesPrice ? product.salesPrice! : product.originalPrice;

  String get _formattedDate {
    final monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final month = monthNames[product.createdAt.month - 1];
    return '$month ${product.createdAt.day}, ${product.createdAt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return ProductCardTapLift(
      onTapWithHero: (heroTag) => openProductDetailsPage(
        context,
        product,
        heroTag: heroTag,
        platformId: platformId,
      ),
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: handleTap,
            child: Container(
              decoration: BoxDecoration(color: primaryColor.withOpacity(0.14)),
              clipBehavior: Clip.hardEdge,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ProductCardTapLift.liftImage(
                    liftValue: liftValue,
                    child: Hero(
                      tag: heroTag,
                      child: _ShowcaseImage(
                        product: product,
                        primaryColor: primaryColor,
                      ),
                    ),
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withOpacity(0.06),
                          Colors.black.withOpacity(0.7),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 72, 18, 22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ..._badgeLabels.map((label) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.18),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  label,
                                  style: Theme.of(context).textTheme.labelSmall
                                      ?.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              );
                            }),
                          ],
                        ),
                        const Spacer(),
                        Text(
                          product.category,
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                color: Colors.white.withOpacity(0.86),
                                fontWeight: FontWeight.w600,
                                height: 1.15,
                              ),
                        ),
                        const SizedBox(height: 0),
                        Text(
                          product.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                fontSize: 25,
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                height: 1,
                              ),
                        ),
                        const SizedBox(height: 1),
                        Wrap(
                          spacing: 8,
                          runSpacing: 2,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            _PriceText(
                              amount: _displayPrice,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: Colors.white.withOpacity(0.95),
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            if (_showsOriginalPrice)
                              _PriceText(
                                amount: product.originalPrice,
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      fontSize: 11,
                                      color: Colors.white.withOpacity(0.72),
                                      decoration: TextDecoration.lineThrough,
                                    ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _ProductStatsRow(
                          product: product,
                          iconColor: const Color(0xFFFFD54F),
                          textStyle: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Colors.white.withOpacity(0.9),
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Posted $_formattedDate',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: Colors.white.withOpacity(0.82)),
                        ),
                      ],
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

class _ShowcaseImage extends StatelessWidget {
  const _ShowcaseImage({required this.product, required this.primaryColor});

  final Product product;
  final Color primaryColor;

  static void precacheProductImages(
    BuildContext context,
    List<Product> products,
  ) {
    SessionImageCache.precacheAll(
      context,
      products.map((product) => product.cardDisplayImageUrl),
    );
  }

  String get _initial {
    if (product.name.isEmpty) {
      return '?';
    }

    return product.name[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final displayImageUrl = product.cardDisplayImageUrl;
    final hasImage = displayImageUrl.isNotEmpty;

    if (!hasImage) {
      return Container(
        color: primaryColor.withOpacity(0.2),
        alignment: Alignment.center,
        child: Text(
          _initial,
          style: Theme.of(context).textTheme.displaySmall?.copyWith(
            color: primaryColor,
            fontWeight: FontWeight.w800,
          ),
        ),
      );
    }

    return CachedNetworkImage(
      imageUrl: displayImageUrl,
      fit: BoxFit.cover,
      filterQuality: FilterQuality.medium,
      alignment: product.hasSavedCardImageCrop
          ? Alignment.center
          : Alignment(product.cardImageAlignmentX, product.cardImageAlignmentY),
      fadeInDuration: const Duration(milliseconds: 300),
      fadeOutDuration: const Duration(milliseconds: 200),
      placeholderFadeInDuration: const Duration(milliseconds: 300),
      errorWidget: (context, url, error) {
        return Container(
          color: primaryColor.withOpacity(0.2),
          alignment: Alignment.center,
          child: Text(
            _initial,
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
              color: primaryColor,
              fontWeight: FontWeight.w800,
            ),
          ),
        );
      },
    );
  }
}

class _SwitchRefreshIndicator extends StatefulWidget {
  const _SwitchRefreshIndicator({
    required this.onRefresh,
    required this.child,
    this.skeletonHandoff = false,
    this.onConnectivityCheck,
    this.onOfflineSkeleton,
  });

  final Future<void> Function() onRefresh;
  final Widget child;

  /// Show skeleton as soon as the wheel starts. Online: spin 1s then fetch
  /// under skeleton. Offline: spin up to 30s, snackbar, keep skeleton.
  final bool skeletonHandoff;
  final Future<bool> Function()? onConnectivityCheck;
  final Future<void> Function()? onOfflineSkeleton;

  @override
  State<_SwitchRefreshIndicator> createState() =>
      _SwitchRefreshIndicatorState();
}

class _SwitchRefreshIndicatorState extends State<_SwitchRefreshIndicator> {
  static const Duration _wheelMinDuration = Duration(seconds: 1);
  static const Duration _offlineWheelDuration = Duration(seconds: 30);
  static const Duration _settleDuration = Duration(milliseconds: 320);
  static const Duration _wheelShrinkDuration = Duration(milliseconds: 160);

  // Platform picker layout under status bar:
  // padding 20 + title 44 + gap 16 + search bar center 24 ≈ settle on search bar.
  static const double _searchBarSettleTravel = 144;
  static const double _maximumTrackedPull = 420;
  static const double _pullToTravelFactor = 0.58;
  static const double _maximumIndicatorTravel = 160;
  static const double _indicatorExtent = 40;
  static const double _dragProgressExtent = 144;

  final OverlayPortalController _overlayController = OverlayPortalController(
    debugLabel: 'main-top-refresh-spinner',
  );
  RefreshIndicatorStatus? _status;
  double _pullDistance = 0;
  double _heldTravel = 0;
  bool _spinWhileDismissing = false;
  Timer? _hideOverlayTimer;
  /// While refresh is pulled open (finger still down), keep scroll at top so
  /// only the overlay icon moves — not the platform/list content.
  final ValueNotifier<bool> _lockContentAtTop = ValueNotifier<bool>(false);

  bool get _isDragging =>
      _status == RefreshIndicatorStatus.drag ||
      _status == RefreshIndicatorStatus.armed;

  bool get _isRefreshing =>
      _status == RefreshIndicatorStatus.snap ||
      _status == RefreshIndicatorStatus.refresh;

  bool get _showIndicator =>
      _status != null &&
      _status != RefreshIndicatorStatus.done &&
      _status != RefreshIndicatorStatus.canceled;

  bool get _showSpinningWheel => _isRefreshing || _spinWhileDismissing;

  double get _dragTravel => (_pullDistance * _pullToTravelFactor)
      .clamp(0.0, _maximumIndicatorTravel)
      .toDouble();

  @override
  void dispose() {
    _hideOverlayTimer?.cancel();
    _lockContentAtTop.dispose();
    super.dispose();
  }

  void _handleStatusChange(RefreshIndicatorStatus? status) {
    if (!mounted || _status == status) return;

    _lockContentAtTop.value =
        status == RefreshIndicatorStatus.drag ||
        status == RefreshIndicatorStatus.armed;

    final dismissing =
        status == RefreshIndicatorStatus.done ||
        status == RefreshIndicatorStatus.canceled;
    if (dismissing) {
      // Hold the wheel in place so it can shrink away instead of teleporting up.
      // Keep indeterminate spin during dismiss — don't snap back to drag icon.
      _heldTravel = _isRefreshing ? _searchBarSettleTravel : _dragTravel;
      _spinWhileDismissing = _isRefreshing;
    }

    setState(() {
      _status = status;
      if (status == RefreshIndicatorStatus.drag) {
        _pullDistance = 0;
        _spinWhileDismissing = false;
      }
    });
    _hideOverlayTimer?.cancel();
    if (_showIndicator) {
      if (!_overlayController.isShowing) {
        _overlayController.show();
      }
      return;
    }

    // Keep overlay up while the wheel shrinks out, then hide.
    if (!_overlayController.isShowing) {
      setState(() {
        _pullDistance = 0;
        _spinWhileDismissing = false;
      });
      return;
    }
    _hideOverlayTimer = Timer(_wheelShrinkDuration, () {
      if (mounted && !_showIndicator) {
        _overlayController.hide();
        setState(() {
          _pullDistance = 0;
          _heldTravel = 0;
          _spinWhileDismissing = false;
        });
      }
    });
  }

  bool _trackPullDistance(ScrollNotification notification) {
    if (notification.depth != 0 ||
        notification.metrics.axisDirection != AxisDirection.down ||
        !_isDragging) {
      return false;
    }

    double? pullDelta;
    if (notification is ScrollUpdateNotification) {
      pullDelta = -(notification.scrollDelta ?? 0);
    } else if (notification is OverscrollNotification) {
      pullDelta = -notification.overscroll;
    }

    if (pullDelta != null && pullDelta != 0) {
      final nextDistance = (_pullDistance + pullDelta)
          .clamp(0.0, _maximumTrackedPull)
          .toDouble();
      if ((nextDistance - _pullDistance).abs() >= 0.1) {
        setState(() => _pullDistance = nextDistance);
      }
    }
    return false;
  }

  void _clampContentWhileRefreshOpen(ScrollNotification notification) {
    if (!_lockContentAtTop.value) return;
    if (notification.depth != 0 ||
        notification.metrics.axis != Axis.vertical) {
      return;
    }
    if (notification is! ScrollUpdateNotification &&
        notification is! OverscrollNotification) {
      return;
    }
    if (notification.metrics.pixels <= 0.01) return;
    final scrollContext = notification.context;
    if (scrollContext == null) return;
    final position = Scrollable.maybeOf(scrollContext)?.position;
    if (position == null || !position.hasPixels) return;
    if (position.pixels > position.minScrollExtent) {
      position.jumpTo(position.minScrollExtent);
    }
  }

  bool _onRefreshScrollNotification(ScrollNotification notification) {
    _clampContentWhileRefreshOpen(notification);
    return _trackPullDistance(notification);
  }

  Future<void> _handleRefresh() async {
    if (!widget.skeletonHandoff) {
      await Future<void>.delayed(_wheelMinDuration);
      await widget.onRefresh();
      return;
    }

    // Skeleton appears together with the loading wheel.
    unawaited(widget.onOfflineSkeleton?.call());

    final startedAt = DateTime.now();
    final connectivityCheck = widget.onConnectivityCheck;
    final probeFuture = connectivityCheck?.call();

    await Future<void>.delayed(_wheelMinDuration);

    var online = true;
    if (probeFuture != null) {
      online = await probeFuture;
    }

    if (!online) {
      final elapsed = DateTime.now().difference(startedAt);
      final remaining = _offlineWheelDuration - elapsed;
      if (remaining > Duration.zero) {
        await Future<void>.delayed(remaining);
      }
      if (!mounted) return;
      AppSnackBar.showError(context, message: 'No internet connection');
      // Skeleton already showing; keep it after the wheel dismisses.
      return;
    }

    // Wheel min done — dismiss spinner; skeleton stays until fetch finishes.
    unawaited(widget.onRefresh());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return OverlayPortal.targetsRootOverlay(
      controller: _overlayController,
      overlayChildBuilder: (overlayContext) {
        final statusBarInset = MediaQuery.paddingOf(overlayContext).top;
        final double indicatorTravel;
        if (_isRefreshing || _spinWhileDismissing) {
          indicatorTravel = _searchBarSettleTravel;
        } else if (_showIndicator) {
          indicatorTravel = _dragTravel;
        } else {
          // Stay put while shrinking out (do not jump back to the top).
          indicatorTravel = _heldTravel;
        }

        // travel=0 keeps the disc fully above the status bar; pull brings it
        // down until it settles on the "What are you looking for?" search bar.
        final top = statusBarInset - _indicatorExtent + indicatorTravel;
        final followFinger = _isDragging;
        final progress = (_pullDistance / _dragProgressExtent).clamp(0.0, 1.0);
        final visible = _showIndicator;
        final opacity = visible
            ? (_showSpinningWheel
                  ? 1.0
                  : (indicatorTravel / (_indicatorExtent * 0.85)).clamp(
                      0.0,
                      1.0,
                    ))
            : 0.0;

        return AnimatedPositioned(
          duration: followFinger ? Duration.zero : _settleDuration,
          curve: Curves.easeOutCubic,
          top: top,
          left: 0,
          right: 0,
          child: IgnorePointer(
            child: AnimatedOpacity(
              duration: followFinger ? Duration.zero : _wheelShrinkDuration,
              curve: Curves.easeInCubic,
              opacity: opacity,
              child: AnimatedScale(
                duration: followFinger ? Duration.zero : _wheelShrinkDuration,
                curve: Curves.easeInCubic,
                scale: visible ? 1.0 : 0.0,
                child: Center(
                  child: RefreshProgressIndicator(
                    // Keep spinning through dismiss — don't snap back to drag arc.
                    value: _showSpinningWheel ? null : progress,
                    color: theme.colorScheme.primary,
                    backgroundColor: theme.colorScheme.surface,
                    semanticsLabel: 'Refreshing',
                    elevation: 2,
                  ),
                ),
              ),
            ),
          ),
        );
      },
      child: RefreshIndicator.noSpinner(
        onRefresh: _handleRefresh,
        onStatusChange: _handleStatusChange,
        child: NotificationListener<ScrollNotification>(
          onNotification: _trackPullDistance,
          child: widget.child,
        ),
      ),
    );
  }
}

class _RefreshStateView extends StatelessWidget {
  const _RefreshStateView({
    required this.onRefresh,
    required this.minHeight,
    required this.backgroundColor,
    required this.child,
    this.leadingContent,
    this.scrollController,
    this.onScrollOffsetChanged,
  });

  final Future<void> Function() onRefresh;
  final double minHeight;
  final Color backgroundColor;
  final Widget child;
  final Widget? leadingContent;
  final ScrollController? scrollController;
  final ValueChanged<double>? onScrollOffsetChanged;

  @override
  Widget build(BuildContext context) {
    return _SwitchRefreshIndicator(
      onRefresh: onRefresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (notification) {
          if (notification.depth == 0 &&
              notification.metrics.axis == Axis.vertical) {
            final offset = notification.metrics.pixels;
            onScrollOffsetChanged?.call(offset < 0 ? 0 : offset);
          }
          return false;
        },
        child: SingleChildScrollView(
          controller: scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          child: ColoredBox(
            color: backgroundColor,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (leadingContent != null) leadingContent!,
                ConstrainedBox(
                  constraints: BoxConstraints(minHeight: minHeight),
                  child: child,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DashboardStateCard extends StatelessWidget {
  const _DashboardStateCard({
    required this.icon,
    required this.title,
    required this.message,
    required this.primaryColor,
    required this.surfaceColor,
    required this.secondaryColor,
    this.borderRadius = 24,
    this.showSearchNotFoundArt = false,
  });

  final IconData icon;
  final String title;
  final String message;
  final Color primaryColor;
  final Color surfaceColor;
  final Color secondaryColor;
  final double borderRadius;
  final bool showSearchNotFoundArt;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showSearchNotFoundArt)
            const SearchNotFoundArt(size: 132)
          else
            Icon(icon, size: 34, color: primaryColor),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: secondaryColor,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _FavoritesEmptyState extends StatelessWidget {
  const _FavoritesEmptyState({
    required this.titleColor,
    required this.primaryColor,
    required this.secondaryColor,
    required this.onExplore,
  });

  final Color titleColor;
  final Color primaryColor;
  final Color secondaryColor;
  final VoidCallback onExplore;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final availableHeight = constraints.hasBoundedHeight
            ? constraints.maxHeight
            : constraints.minHeight;
        final isCompact = availableHeight < 520;
        // Match invite "gift" reward art display width (157).
        final artSize = isCompact ? 140.0 : 157.0;

        return Center(
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: 28,
              vertical: isCompact ? 28 : 40,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Semantics(
                    image: true,
                    label: 'Favorites illustration',
                    child: SizedBox.square(
                      dimension: artSize,
                      child: Image.asset(
                        'assets/images/favorites-empty-art.png',
                        fit: BoxFit.contain,
                        filterQuality: FilterQuality.high,
                        excludeFromSemantics: true,
                      ),
                    ),
                  ),
                  SizedBox(height: isCompact ? 12 : 18),
                  Text(
                    'Your favorites is empty',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: titleColor,
                      fontSize: isCompact ? 20 : 22,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 9),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 310),
                    child: Text(
                      'Save the items you love by tapping the heart. You\'ll find them all here anytime.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: secondaryColor.withOpacity(0.82),
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                  ),
                  SizedBox(height: isCompact ? 18 : 24),
                  SizedBox(
                    width: 176,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: onExplore,
                      style: ElevatedButton.styleFrom(
                        elevation: 0,
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text(
                        'Explore now',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
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

class _FavoritesPage extends StatelessWidget {
  const _FavoritesPage({
    required this.backgroundColor,
    required this.productCardSurfaceColor,
    required this.productsFuture,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.searchQuery,
    required this.onRefresh,
    required this.onExplore,
  });

  final Color backgroundColor;
  final Color productCardSurfaceColor;
  final Future<List<Product>> productsFuture;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String searchQuery;
  final Future<void> Function() onRefresh;
  final VoidCallback onExplore;

  List<Product> _buildFavoriteProducts(
    List<Product> products,
    List<String> favoriteProductIds,
  ) {
    final productsById = <String, Product>{
      for (final product in products) product.id: product,
    };

    return [
      for (final favoriteProductId in favoriteProductIds)
        if (productsById.containsKey(favoriteProductId) &&
            isProductVisibleToUsers(productsById[favoriteProductId]!))
          productsById[favoriteProductId]!,
    ];
  }

  bool _matchesSearchQuery(Product product) {
    final normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery.isEmpty) {
      return true;
    }

    return product.name.toLowerCase().contains(normalizedQuery) ||
        product.categoryLabel.toLowerCase().contains(normalizedQuery) ||
        product.description.toLowerCase().contains(normalizedQuery);
  }

  List<Product> _applySearchFilter(List<Product> products) {
    if (searchQuery.trim().isEmpty) {
      return products;
    }

    return products.where(_matchesSearchQuery).toList(growable: false);
  }

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

  double _estimateProductCardHeight(Product product) {
    final nameLines = _estimateLineCount(
      product.name,
      charsPerLine: 16,
      maxLines: 2,
    );

    return 238 + (nameLines * 18) + (product.hasCompanyIdentity ? 24 : 0);
  }

  List<List<Product>> _buildProductColumns(List<Product> products) {
    final columns = [<Product>[], <Product>[]];
    final estimatedHeights = [0.0, 0.0];

    for (final product in products) {
      final targetColumn = estimatedHeights[0] <= estimatedHeights[1] ? 0 : 1;
      columns[targetColumn].add(product);
      estimatedHeights[targetColumn] += _estimateProductCardHeight(product);
    }

    return columns;
  }

  Future<void> _handleFavoriteCardToggle(
    BuildContext context,
    Product product,
  ) async {
    final isNowFavorite = await FavoriteProductsStore.instance.toggleFavorite(
      product.id,
    );

    if (!context.mounted) {
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

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return ValueListenableBuilder<List<String>>(
          valueListenable:
              FavoriteProductsStore.instance.favoriteProductIdsNotifier,
          builder: (context, favoriteProductIds, child) {
            if (favoriteProductIds.isEmpty) {
              return _RefreshStateView(
                onRefresh: onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: backgroundColor,
                child: _FavoritesEmptyState(
                  titleColor: titleColor,
                  primaryColor: primaryColor,
                  secondaryColor: secondaryColor,
                  onExplore: onExplore,
                ),
              );
            }

            return FutureBuilder<List<Product>>(
              future: productsFuture,
              builder: (context, snapshot) {
                final products = snapshot.data ?? const <Product>[];
                final topSellerIds = {
                  for (final product in _buildTopSellingProducts(products))
                    product.id,
                };
                final savedFavoriteProducts = _buildFavoriteProducts(
                  products,
                  favoriteProductIds,
                );
                final favoriteProducts = _applySearchFilter(
                  savedFavoriteProducts,
                );
                final productColumns = _buildProductColumns(favoriteProducts);

                if (snapshot.connectionState == ConnectionState.waiting &&
                    products.isEmpty) {
                  return _RefreshStateView(
                    onRefresh: onRefresh,
                    minHeight: constraints.maxHeight,
                    backgroundColor: backgroundColor,
                    child: SizedBox(
                      height: constraints.maxHeight,
                      child: const SkeletonProductGrid(count: 6),
                    ),
                  );
                }

                if (snapshot.hasError && products.isEmpty) {
                  return _RefreshStateView(
                    onRefresh: onRefresh,
                    minHeight: constraints.maxHeight,
                    backgroundColor: backgroundColor,
                    child: _DashboardStateCard(
                      icon: Icons.cloud_off_rounded,
                      title: 'Favorites unavailable',
                      message: snapshot.error.toString(),
                      primaryColor: primaryColor,
                      surfaceColor: backgroundColor,
                      secondaryColor: secondaryColor,
                      borderRadius: 0,
                    ),
                  );
                }

                if (savedFavoriteProducts.isEmpty) {
                  return _RefreshStateView(
                    onRefresh: onRefresh,
                    minHeight: constraints.maxHeight,
                    backgroundColor: backgroundColor,
                    child: _DashboardStateCard(
                      icon: Icons.heart_broken_outlined,
                      title: 'Favorite products unavailable',
                      message:
                          'Your saved items are hidden right now because they are out of stock or not in the current product list. Pull down to refresh after they are restocked or added back.',
                      primaryColor: primaryColor,
                      surfaceColor: backgroundColor,
                      secondaryColor: secondaryColor,
                      borderRadius: 0,
                    ),
                  );
                }

                if (favoriteProducts.isEmpty) {
                  return _RefreshStateView(
                    onRefresh: onRefresh,
                    minHeight: constraints.maxHeight,
                    backgroundColor: backgroundColor,
                    child: _DashboardStateCard(
                      icon: Icons.search_off_rounded,
                      title: 'No matching favorites',
                      message:
                          'Try another product name or category, or close the search.',
                      primaryColor: primaryColor,
                      surfaceColor: backgroundColor,
                      secondaryColor: secondaryColor,
                      borderRadius: 0,
                      showSearchNotFoundArt: true,
                    ),
                  );
                }

                return _SwitchRefreshIndicator(
                  onRefresh: onRefresh,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: ColoredBox(
                      color: backgroundColor,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(10, 14, 10, 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.fromLTRB(6, 0, 6, 14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Favorites',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleLarge
                                          ?.copyWith(
                                            color: titleColor,
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      searchQuery.trim().isNotEmpty
                                          ? '${favoriteProducts.length} matching favorite${favoriteProducts.length == 1 ? '' : 's'}'
                                          : '${favoriteProducts.length} saved product${favoriteProducts.length == 1 ? '' : 's'}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyMedium
                                          ?.copyWith(
                                            color: secondaryColor.withOpacity(
                                              0.78,
                                            ),
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  for (
                                    var columnIndex = 0;
                                    columnIndex < productColumns.length;
                                    columnIndex++
                                  ) ...[
                                    if (columnIndex > 0)
                                      const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          for (
                                            var itemIndex = 0;
                                            itemIndex <
                                                productColumns[columnIndex]
                                                    .length;
                                            itemIndex++
                                          ) ...[
                                            if (itemIndex > 0)
                                              const SizedBox(height: 12),
                                            _ProductCard(
                                              product:
                                                  productColumns[columnIndex][itemIndex],
                                              surfaceColor:
                                                  productCardSurfaceColor,
                                              titleColor: titleColor,
                                              secondaryColor: secondaryColor,
                                              primaryColor: primaryColor,
                                              borderRadius: _ProductDashboard
                                                  ._homeProductCardBorderRadius,
                                              showTopSellerBadge: topSellerIds
                                                  .contains(
                                                    productColumns[columnIndex][itemIndex]
                                                        .id,
                                                  ),
                                              showDiscountInlineBadge: false,
                                              onFavoriteTap: () =>
                                                  _handleFavoriteCardToggle(
                                                    context,
                                                    productColumns[columnIndex][itemIndex],
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
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.product,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    this.topSellingRank,
    this.borderRadius = 12,
    this.onFavoriteTap,
    this.showTopSellerBadge = false,
    this.showTopRatedImageBadge = false,
    this.showDiscountInlineBadge = false,
    this.showNewBadge = false,
    this.platformId = '',
    this.onReturnedFromDetails,
  });

  final Product product;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final int? topSellingRank;
  final double borderRadius;
  final VoidCallback? onFavoriteTap;
  final bool showTopSellerBadge;
  final bool showTopRatedImageBadge;
  final bool showDiscountInlineBadge;
  final bool showNewBadge;
  final String platformId;
  final VoidCallback? onReturnedFromDetails;

  bool get _hasSalesPrice =>
      product.salesPrice != null && product.salesPrice! >= 0;

  bool get _showsOriginalPrice =>
      _hasSalesPrice && product.salesPrice! < product.originalPrice;

  double get _displayPrice =>
      _hasSalesPrice ? product.salesPrice! : product.originalPrice;

  int? get _discountPercentValue => _discountPercent(product);
  bool get _isTopSellingCard => topSellingRank != null;
  bool get _showsTopSellerImageCornerBadge =>
      topSellingRank != null && topSellingRank! <= 10;
  bool get _showsTopSellerInlineBadge => showTopSellerBadge;
  bool get _showsTopRatedInlineBadge =>
      !showTopRatedImageBadge && _isTopRatedProduct(product);
  bool get _showsTopRatedImageCornerBadge =>
      topSellingRank == null &&
      showTopRatedImageBadge &&
      _isTopRatedProduct(product);
  bool get _showsDiscountInlineBadge =>
      _discountPercentValue != null && showDiscountInlineBadge;
  bool get _showsNewBadge => showNewBadge || _isNewProductPost(product);

  TextStyle _inlineBadgeTextStyle(BuildContext context) {
    return Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          height: 1,
        ) ??
        const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          height: 1,
        );
  }

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
      child: Text(label, style: _inlineBadgeTextStyle(context)),
    );
  }

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
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        child: Icon(icon, size: 11, color: Colors.white),
      ),
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
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: compactStyle),
    );
  }

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
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        child: Icon(icon, size: 9, color: Colors.white),
      ),
    );
  }

  double _measureInlineBadgeWidth(
    BuildContext context, {
    required String label,
  }) {
    final labelStyle = _inlineBadgeTextStyle(context);
    final painter = TextPainter(
      text: TextSpan(text: label, style: labelStyle),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();

    return painter.width + 12;
  }

  bool _shouldUseCompactTopBadges(
    BuildContext context, {
    required TextStyle style,
    required double maxWidth,
  }) {
    if ((!_showsTopSellerInlineBadge &&
            !_showsDiscountInlineBadge &&
            !_showsTopRatedInlineBadge &&
            !_showsNewBadge) ||
        !maxWidth.isFinite ||
        maxWidth <= 0) {
      return false;
    }

    final painter = TextPainter(
      text: TextSpan(text: product.name, style: style),
      maxLines: 2,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout(maxWidth: maxWidth);

    if (painter.didExceedMaxLines) {
      return true;
    }

    final lineMetrics = painter.computeLineMetrics();
    if (lineMetrics.isEmpty) {
      return false;
    }

    final badgeWidths = <double>[
      if (_showsDiscountInlineBadge)
        _measureInlineBadgeWidth(context, label: '-${_discountPercentValue!}%'),
      if (_showsTopSellerInlineBadge) 15,
      if (_showsTopRatedInlineBadge) 15,
    ];
    var usedLineCount = lineMetrics.length;
    var currentLineWidth = lineMetrics.last.width;

    for (final badgeWidth in badgeWidths) {
      if (currentLineWidth + badgeWidth <= maxWidth) {
        currentLineWidth += badgeWidth;
        continue;
      }

      if (usedLineCount >= 2 || badgeWidth > maxWidth) {
        return true;
      }

      usedLineCount++;
      currentLineWidth = badgeWidth;
    }

    return false;
  }

  Widget _buildProductMedia({required double imageHeight}) {
    return Stack(
      children: [
        _ProductImage(
          product: product,
          primaryColor: primaryColor,
          height: imageHeight,
        ),
        if (_showsTopSellerImageCornerBadge)
          Positioned(
            top: 0,
            left: 0,
            child: _TopSellingImageBadge(rank: topSellingRank!),
          ),
        if (_showsTopRatedImageCornerBadge)
          Positioned(top: 0, right: 0, child: const _TopRatedImageBadge()),
        if (_showsNewBadge) Positioned(top: 0, right: 0, child: _NewBadge()),
      ],
    );
  }

  Widget _buildProductDetails(
    BuildContext context, {
    bool isTopSelling = false,
  }) {
    final categorySpacing = 0.0;
    final nameSpacing = isTopSelling ? 1.0 : 2.0;
    final statsSpacing = isTopSelling ? 1.0 : 4.0;
    final productNameStyle = Theme.of(context).textTheme.titleSmall?.copyWith(
      fontSize: 15,
      color: titleColor,
      fontWeight: FontWeight.w500,
      height: 1,
    );
    return LayoutBuilder(
      builder: (context, constraints) {
        final reservedFavoriteWidth = onFavoriteTap != null ? 36.0 : 0.0;
        final availableNameWidth = constraints.maxWidth - reservedFavoriteWidth;
        final useCompactTopBadges = isTopSelling
            ? false
            : _shouldUseCompactTopBadges(
                context,
                style: productNameStyle ?? const TextStyle(),
                maxWidth: availableNameWidth,
              );
        final nameBadgeSpans = <InlineSpan>[
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
            : isTopSelling
            ? _AutoSizeText(
                product.name,
                maxLines: 2,
                minFontSize: 10,
                style: productNameStyle,
              )
            : Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: productNameStyle,
              );
        final showsCompactBadgeRow =
            useCompactTopBadges &&
            (_showsTopSellerInlineBadge ||
                _showsDiscountInlineBadge ||
                _showsTopRatedInlineBadge ||
                _showsNewBadge);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              product.category,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: primaryColor,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
            SizedBox(height: categorySpacing),
            if (onFavoriteTap != null)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: productNameWidget),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 28,
                    height: 28,
                    child: IconButton(
                      onPressed: onFavoriteTap,
                      tooltip: 'Remove from favorites',
                      padding: EdgeInsets.zero,
                      splashRadius: 18,
                      icon: const Icon(
                        Icons.favorite_rounded,
                        size: 20,
                        color: Color(0xFFD32F2F),
                      ),
                    ),
                  ),
                ],
              )
            else
              productNameWidget,
            if (showsCompactBadgeRow) ...[
              const SizedBox(height: 4),
              Wrap(
                spacing: 1,
                runSpacing: 1,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (_showsNewBadge)
                    _buildSecondaryRowBadge(
                      context,
                      label: 'New',
                      color: primaryColor,
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
            SizedBox(height: nameSpacing),
            Wrap(
              spacing: 8,
              runSpacing: 2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _PriceText(
                  amount: _displayPrice,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: isTopSelling ? 17 : 16,
                    color: primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (_showsOriginalPrice)
                  _PriceText(
                    amount: product.originalPrice,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontSize: 11,
                      color: secondaryColor.withOpacity(0.72),
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
              ],
            ),
            SizedBox(height: statsSpacing),
            _ProductStatsRow(
              product: product,
              iconColor: const Color(0xFFF9A825),
              textStyle: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: secondaryColor,
                fontWeight: FontWeight.w200,
                height: 1,
              ),
            ),
            if (product.hasCompanyIdentity) ...[
              const SizedBox(height: 4),
              Transform.translate(
                offset: const Offset(0, -2),
                child: ProductCompanyIdentity(
                  product: product,
                  textColor: secondaryColor,
                  fallbackColor: primaryColor,
                  avatarSize: 18,
                  fontSize: 11,
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ProductCardTapLift(
      onTapWithHero: (heroTag) async {
        await openProductDetailsPage(
          context,
          product,
          heroTag: heroTag,
          platformId: platformId,
        );
        onReturnedFromDetails?.call();
      },
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: surfaceColor,
          borderRadius: BorderRadius.circular(borderRadius),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: handleTap,
            child: _isTopSellingCard
                ? SizedBox.expand(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(
                          width: 128,
                          child: ProductCardTapLift.liftImage(
                            liftValue: liftValue,
                            child: Hero(
                              tag: heroTag,
                              child: _buildProductMedia(
                                imageHeight: double.infinity,
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
                                isTopSelling: true,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ProductCardTapLift.liftImage(
                        liftValue: liftValue,
                        child: Hero(
                          tag: heroTag,
                          child: _buildProductMedia(imageHeight: 180),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
                        child: _buildProductDetails(context),
                      ),
                    ],
                  ),
          ),
        );
      },
    );
  }
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({
    required this.product,
    required this.primaryColor,
    this.height = 180,
  });

  final Product product;
  final Color primaryColor;
  final double height;

  String get _initial {
    if (product.name.isEmpty) {
      return '?';
    }

    return product.name[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final displayImageUrl = product.cardDisplayImageUrl;
    final hasImage = displayImageUrl.isNotEmpty;

    return SizedBox(
      height: height,
      width: double.infinity,
      child: hasImage
          ? CachedNetworkImage(
              imageUrl: displayImageUrl,
              fit: BoxFit.cover,
              alignment: product.hasSavedCardImageCrop
                  ? Alignment.center
                  : Alignment(
                      product.cardImageAlignmentX,
                      product.cardImageAlignmentY,
                    ),
              fadeInDuration: const Duration(milliseconds: 300),
              fadeOutDuration: const Duration(milliseconds: 200),
              placeholderFadeInDuration: const Duration(milliseconds: 300),
              errorWidget: (context, url, error) {
                return _ProductImageFallback(
                  initial: _initial,
                  primaryColor: primaryColor,
                );
              },
            )
          : _ProductImageFallback(
              initial: _initial,
              primaryColor: primaryColor,
            ),
    );
  }
}

class _ProductImageFallback extends StatelessWidget {
  const _ProductImageFallback({
    required this.initial,
    required this.primaryColor,
  });

  final String initial;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return Center(
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

class _AutoSizeText extends StatelessWidget {
  const _AutoSizeText(
    this.text, {
    required this.maxLines,
    required this.minFontSize,
    this.style,
  });

  final String text;
  final int maxLines;
  final double minFontSize;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final baseStyle = DefaultTextStyle.of(context).style.merge(style);

    return LayoutBuilder(
      builder: (context, constraints) {
        final textDirection = Directionality.of(context);
        final textScaler = MediaQuery.textScalerOf(context);
        final startingFontSize = baseStyle.fontSize ?? 14;
        var resolvedFontSize = startingFontSize;

        if (constraints.maxWidth.isFinite) {
          while (resolvedFontSize > minFontSize) {
            final painter = TextPainter(
              text: TextSpan(
                text: text,
                style: baseStyle.copyWith(fontSize: resolvedFontSize),
              ),
              maxLines: maxLines,
              textDirection: textDirection,
              textScaler: textScaler,
              ellipsis: '...',
            )..layout(maxWidth: constraints.maxWidth);

            if (!painter.didExceedMaxLines) {
              break;
            }

            resolvedFontSize -= 0.5;
          }
        }

        final clampedFontSize = resolvedFontSize < minFontSize
            ? minFontSize
            : resolvedFontSize;

        return Text(
          text,
          maxLines: maxLines,
          overflow: TextOverflow.ellipsis,
          style: baseStyle.copyWith(fontSize: clampedFontSize),
        );
      },
    );
  }
}

class _DiscountBadge extends StatelessWidget {
  const _DiscountBadge({required this.percent});

  final int percent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFD32F2F),
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(8)),
      ),
      child: Text(
        '-$percent%',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _NewBadge extends StatelessWidget {
  const _NewBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF1976D2),
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(8)),
      ),
      child: Text(
        'New',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _TopRatedImageBadge extends StatelessWidget {
  const _TopRatedImageBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: const BoxDecoration(
        color: Color(0xFFFB8C00),
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(8)),
      ),
      child: const Icon(
        Icons.workspace_premium_rounded,
        size: 18,
        color: Colors.white,
      ),
    );
  }
}

class _TopSellingImageBadge extends StatelessWidget {
  const _TopSellingImageBadge({required this.rank});

  final int rank;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 38, minHeight: 30),
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: const BoxDecoration(
        color: Color(0xFF00897B),
        borderRadius: BorderRadius.only(bottomRight: Radius.circular(8)),
      ),
      child: rank <= 3
          ? const Icon(
              Icons.emoji_events_rounded,
              size: 18,
              color: Colors.white,
            )
          : Text(
              '$rank',
              textAlign: TextAlign.center,
              style:
                  Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ) ??
                  const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
            ),
    );
  }
}

class _ProductStatsRow extends StatelessWidget {
  const _ProductStatsRow({
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
        Icon(Icons.star_rounded, size: 16, color: iconColor),
        const SizedBox(width: 4),
        Text(
          _formatProductRating(product.rating),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textStyle,
        ),
        const SizedBox(width: 10),
        Icon(Icons.mode_comment_outlined, size: 15, color: commentIconColor),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            _formatProductCommentCount(product.commentCount),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textStyle,
          ),
        ),
      ],
    );
  }
}

class _PriceText extends StatelessWidget {
  const _PriceText({required this.amount, this.style});

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(amount: amount, style: style);
  }
}

class _FooterVisibilityTransition extends StatelessWidget {
  const _FooterVisibilityTransition({
    required this.visible,
    required this.child,
  });

  final bool visible;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(end: visible ? 1 : 0),
      duration: appMotionFrames(16),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        final t = value.clamp(0.0, 1.0);
        return IgnorePointer(
          ignoring: t < 0.05,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * 96),
            child: Opacity(opacity: t, child: child),
          ),
        );
      },
      child: child,
    );
  }
}

class _GuestAuthFooter extends StatelessWidget {
  const _GuestAuthFooter({
    required this.primaryColor,
    required this.onLogin,
    required this.onSignUp,
    required this.onHelpCentre,
  });

  final Color primaryColor;
  final VoidCallback onLogin;
  final VoidCallback onSignUp;
  final VoidCallback onHelpCentre;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.paddingOf(context).bottom;
    final secondaryTextColor = Theme.of(context).brightness == Brightness.dark
        ? Colors.black54
        : Colors.black54;

    return Padding(
      // Leave room above so the top shadow is not clipped.
      padding: const EdgeInsets.only(top: 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.14),
              blurRadius: 20,
              offset: const Offset(0, -6),
              spreadRadius: -6,
            ),
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 8,
              offset: const Offset(0, -2),
              spreadRadius: 0,
            ),
          ],
        ),
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 18, 20, 14 + bottomPadding),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onLogin,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: primaryColor,
                        side: BorderSide(color: primaryColor),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      child: const Text(
                        'Login',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: onSignUp,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      child: const Text(
                        'Sign up',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                alignment: WrapAlignment.center,
                spacing: 8,
                children: [
                  Text(
                    'Need support?',
                    style: TextStyle(color: secondaryTextColor, fontSize: 12.5),
                  ),
                  TextButton(
                    onPressed: onHelpCentre,
                    style: TextButton.styleFrom(
                      foregroundColor: primaryColor,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      visualDensity: VisualDensity.compact,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'Help Centre',
                      style: TextStyle(
                        color: primaryColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FooterSection extends StatelessWidget {
  const _FooterSection({
    required this.backgroundColor,
    required this.activeColor,
    required this.inactiveColor,
    required this.selectedIndex,
    required this.onTap,
  });

  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;
  final int selectedIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<List<OrderEntryData>>(
      valueListenable: OrderStore.instance.ordersNotifier,
      builder: (context, orders, _) {
        final bottomPadding = MediaQuery.paddingOf(context).bottom;
        const barHeight = 62.0;
        final orderBadgeCount = _orderTransactionBadgeCount(orders);
        final isDarkMode = Theme.of(context).brightness == Brightness.dark;
        final fadeColor = isDarkMode ? backgroundColor : Colors.white;
        final navSurfaceColor = Theme.of(context).colorScheme.surface;
        return ValueListenableBuilder<List<ChatSupportThreadData>>(
          valueListenable: ChatSupportStore.instance.threadListNotifier,
          builder: (context, threads, child) {
            final chatBadgeCount = _chatUnreadBadgeCount(threads);
            final items = [
              _NavItemData(
                index: 0,
                label: 'Home',
                iconBuilder: (color, _) => _BuyerNavSvgIcon(
                  kind: _BuyerNavIconKind.home,
                  color: color,
                ),
              ),
              _NavItemData(
                index: 1,
                label: 'Scan',
                iconBuilder: (color, _) => _BuyerNavSvgIcon(
                  kind: _BuyerNavIconKind.scan,
                  color: color,
                ),
                onTap: () => onTap(1),
              ),
              _NavItemData(
                index: 2,
                label: 'Activity',
                iconBuilder: (color, _) => _BuyerNavSvgIcon(
                  kind: _BuyerNavIconKind.activity,
                  color: color,
                ),
                badgeCount: orderBadgeCount,
              ),
              _NavItemData(
                index: 3,
                label: 'Message',
                iconBuilder: (color, _) => _BuyerNavSvgIcon(
                  kind: _BuyerNavIconKind.message,
                  color: color,
                ),
                badgeCount: chatBadgeCount,
                onTap: () => onTap(3),
              ),
            ];

            return SizedBox(
              width: double.infinity,
              height: barHeight + bottomPadding + 40,
              child: Stack(
                alignment: Alignment.bottomCenter,
                children: [
                  // Soft fade behind the floating rounded navigation surface.
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: barHeight + bottomPadding + 56,
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              fadeColor.withOpacity(0),
                              fadeColor.withOpacity(0.28),
                              fadeColor.withOpacity(0.72),
                              fadeColor.withOpacity(0.94),
                            ],
                            stops: const [0.0, 0.32, 0.68, 1.0],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.fromLTRB(10, 18, 10, 8 + bottomPadding),
                    child: Container(
                      height: barHeight,
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: navSurfaceColor,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(
                              isDarkMode ? 0.24 : 0.1,
                            ),
                            blurRadius: 22,
                            offset: const Offset(0, 7),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: Row(
                          children: [
                            for (final item in items)
                              Expanded(
                                flex: selectedIndex == item.index ? 3 : 2,
                                child: _NavigationButton(
                                  label: item.label,
                                  icon: selectedIndex == item.index
                                      ? item.activeIcon
                                      : item.inactiveIcon,
                                  iconBuilder: item.iconBuilder,
                                  isActive: selectedIndex == item.index,
                                  activeColor: activeColor,
                                  inactiveColor: inactiveColor,
                                  badgeCount: item.badgeCount,
                                  onTap: item.onTap ?? () => onTap(item.index),
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
      },
    );
  }
}

class _NavigationButton extends StatelessWidget {
  const _NavigationButton({
    required this.label,
    this.icon,
    this.iconBuilder,
    required this.isActive,
    required this.activeColor,
    required this.inactiveColor,
    this.badgeCount = 0,
    required this.onTap,
  }) : assert(icon != null || iconBuilder != null);

  final String label;
  final IconData? icon;
  final _NavIconBuilder? iconBuilder;
  final bool isActive;
  final Color activeColor;
  final Color inactiveColor;
  final int badgeCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final iconColor = isActive ? Colors.white : inactiveColor;
    final displayBadge = badgeCount > 0;
    final badgeLabel = badgeCount > 99 ? '99+' : '$badgeCount';

    Widget buildIcon() {
      return SizedBox(
        width: 24,
        height: 24,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            iconBuilder?.call(iconColor, isActive) ??
                Icon(icon, color: iconColor, size: 24),
            if (displayBadge)
              Positioned(
                top: -4,
                right: -7,
                child: Container(
                  constraints: const BoxConstraints(
                    minWidth: 14,
                    minHeight: 14,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 3,
                    vertical: 1,
                  ),
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: Color(0xFFE53935),
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                  ),
                  child: Text(
                    badgeLabel,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      height: 1,
                      fontSize: 8.5,
                      letterSpacing: 0,
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    }

    return Semantics(
      label: label,
      button: true,
      selected: isActive,
      child: InkWell(
        onTap: onTap,
        splashFactory: NoSplash.splashFactory,
        highlightColor: Colors.transparent,
        overlayColor: const WidgetStatePropertyAll(Colors.transparent),
        child: Center(
          child: AnimatedContainer(
            duration: appMotionFrames(10),
            curve: Curves.easeOutCubic,
            padding: EdgeInsets.symmetric(
              horizontal: isActive ? 12 : 4,
              vertical: isActive ? 10 : 4,
            ),
            decoration: BoxDecoration(
              color: isActive ? activeColor : Colors.transparent,
              borderRadius: BorderRadius.circular(999),
            ),
            child: isActive
                ? Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      buildIcon(),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            height: 1.1,
                            // Keep bottom nav independent of appLetterSpacing.
                            letterSpacing: 0,
                          ),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      buildIcon(),
                      const SizedBox(height: 3),
                      Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: inactiveColor,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w500,
                          height: 1.1,
                          // Keep bottom nav independent of appLetterSpacing.
                          letterSpacing: 0,
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

typedef _NavIconBuilder = Widget Function(Color color, bool isActive);

class _NavItemData {
  const _NavItemData({
    required this.index,
    required this.label,
    this.inactiveIcon,
    this.activeIcon,
    this.iconBuilder,
    this.badgeCount = 0,
    this.onTap,
  }) : assert(
         iconBuilder != null || (inactiveIcon != null && activeIcon != null),
       );

  final int index;
  final String label;
  final IconData? inactiveIcon;
  final IconData? activeIcon;
  final _NavIconBuilder? iconBuilder;
  final int badgeCount;
  final VoidCallback? onTap;
}

enum _BuyerNavIconKind { home, scan, activity, message }

class _BuyerNavSvgIcon extends StatelessWidget {
  const _BuyerNavSvgIcon({required this.kind, required this.color});

  final _BuyerNavIconKind kind;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 24,
      child: CustomPaint(
        painter: _BuyerNavSvgIconPainter(kind: kind, color: color),
      ),
    );
  }
}

class _BuyerNavSvgIconPainter extends CustomPainter {
  const _BuyerNavSvgIconPainter({required this.kind, required this.color});

  final _BuyerNavIconKind kind;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final iconSize = size.shortestSide;
    final offset = Offset(
      (size.width - iconSize) / 2,
      (size.height - iconSize) / 2,
    );
    canvas
      ..save()
      ..translate(offset.dx, offset.dy)
      ..scale(iconSize / 24);

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    switch (kind) {
      case _BuyerNavIconKind.home:
        _paintHome(canvas, paint);
      case _BuyerNavIconKind.scan:
        _paintScan(canvas, paint);
      case _BuyerNavIconKind.activity:
        _paintActivity(canvas, paint);
      case _BuyerNavIconKind.message:
        _paintMessage(canvas, paint);
    }

    canvas.restore();
  }

  // Lucide `house`
  static void _paintHome(Canvas canvas, Paint paint) {
    final house = Path()
      ..moveTo(3, 10)
      ..relativeArcToPoint(
        const Offset(0.709, -1.528),
        radius: const Radius.elliptical(2, 2),
      )
      ..relativeLineTo(7, -6)
      ..relativeArcToPoint(
        const Offset(2.582, 0),
        radius: const Radius.elliptical(2, 2),
      )
      ..relativeLineTo(7, 6)
      ..arcToPoint(const Offset(21, 10), radius: const Radius.elliptical(2, 2))
      ..relativeLineTo(0, 9)
      ..relativeArcToPoint(
        const Offset(-2, 2),
        radius: const Radius.elliptical(2, 2),
      )
      ..lineTo(5, 21)
      ..relativeArcToPoint(
        const Offset(-2, -2),
        radius: const Radius.elliptical(2, 2),
      )
      ..close();

    final door = Path()
      ..moveTo(15, 21)
      ..lineTo(15, 13)
      ..relativeArcToPoint(
        const Offset(-1, -1),
        radius: const Radius.elliptical(1, 1),
        clockwise: false,
      )
      ..lineTo(10, 12)
      ..relativeArcToPoint(
        const Offset(-1, 1),
        radius: const Radius.elliptical(1, 1),
        clockwise: false,
      )
      ..lineTo(9, 21);

    canvas
      ..drawPath(door, paint)
      ..drawPath(house, paint);
  }

  // Lucide `scan-square`
  static void _paintScan(Canvas canvas, Paint paint) {
    canvas
      ..drawPath(
        Path()
          ..moveTo(3, 7)
          ..lineTo(3, 5)
          ..relativeArcToPoint(
            const Offset(2, -2),
            radius: const Radius.elliptical(2, 2),
          )
          ..lineTo(7, 3),
        paint,
      )
      ..drawPath(
        Path()
          ..moveTo(17, 3)
          ..lineTo(19, 3)
          ..relativeArcToPoint(
            const Offset(2, 2),
            radius: const Radius.elliptical(2, 2),
          )
          ..lineTo(21, 7),
        paint,
      )
      ..drawPath(
        Path()
          ..moveTo(21, 17)
          ..lineTo(21, 19)
          ..relativeArcToPoint(
            const Offset(-2, 2),
            radius: const Radius.elliptical(2, 2),
          )
          ..lineTo(17, 21),
        paint,
      )
      ..drawPath(
        Path()
          ..moveTo(7, 21)
          ..lineTo(5, 21)
          ..relativeArcToPoint(
            const Offset(-2, -2),
            radius: const Radius.elliptical(2, 2),
          )
          ..lineTo(3, 17),
        paint,
      );

    final inner = RRect.fromRectAndRadius(
      const Rect.fromLTWH(8, 8, 8, 8),
      const Radius.circular(1),
    );
    canvas.drawRRect(inner, paint);
  }

  // Lucide `clipboard-clock`
  static void _paintActivity(Canvas canvas, Paint paint) {
    canvas
      ..drawPath(
        Path()
          ..moveTo(16, 14)
          ..lineTo(16, 16.2)
          ..lineTo(17.6, 17.2),
        paint,
      )
      ..drawPath(
        Path()
          ..moveTo(16, 4)
          ..lineTo(18, 4)
          ..relativeArcToPoint(
            const Offset(2, 2),
            radius: const Radius.elliptical(2, 2),
          )
          ..lineTo(20, 6.832),
        paint,
      )
      ..drawPath(
        Path()
          ..moveTo(8, 4)
          ..lineTo(6, 4)
          ..relativeArcToPoint(
            const Offset(-2, 2),
            radius: const Radius.elliptical(2, 2),
            clockwise: false,
          )
          ..lineTo(4, 20)
          ..relativeArcToPoint(
            const Offset(2, 2),
            radius: const Radius.elliptical(2, 2),
            clockwise: false,
          )
          ..lineTo(8, 22),
        paint,
      );

    canvas.drawCircle(const Offset(16, 16), 6, paint);

    final clip = RRect.fromRectAndRadius(
      const Rect.fromLTWH(8, 2, 8, 4),
      const Radius.circular(1),
    );
    canvas.drawRRect(clip, paint);
  }

  // Lucide `messages-square`
  static void _paintMessage(Canvas canvas, Paint paint) {
    final front = Path()
      ..moveTo(16, 10)
      ..relativeArcToPoint(
        const Offset(-2, 2),
        radius: const Radius.elliptical(2, 2),
      )
      ..lineTo(6.828, 12)
      ..relativeArcToPoint(
        const Offset(-1.414, 0.586),
        radius: const Radius.elliptical(2, 2),
        clockwise: false,
      )
      ..lineTo(3.212, 14.788)
      ..arcToPoint(
        const Offset(2, 14.286),
        radius: const Radius.circular(0.71),
        clockwise: false,
      )
      ..lineTo(2, 4)
      ..relativeArcToPoint(
        const Offset(2, -2),
        radius: const Radius.elliptical(2, 2),
      )
      ..lineTo(14, 2)
      ..relativeArcToPoint(
        const Offset(2, 2),
        radius: const Radius.elliptical(2, 2),
      )
      ..close();

    final back = Path()
      ..moveTo(20, 9)
      ..relativeArcToPoint(
        const Offset(2, 2),
        radius: const Radius.elliptical(2, 2),
      )
      ..lineTo(22, 21.286)
      ..arcToPoint(
        const Offset(20.788, 21.788),
        radius: const Radius.circular(0.71),
      )
      ..lineTo(18.586, 19.586)
      ..relativeArcToPoint(
        const Offset(-1.414, -0.586),
        radius: const Radius.elliptical(2, 2),
        clockwise: false,
      )
      ..lineTo(10, 19)
      ..relativeArcToPoint(
        const Offset(-2, -2),
        radius: const Radius.elliptical(2, 2),
      )
      ..lineTo(8, 16);

    canvas
      ..drawPath(front, paint)
      ..drawPath(back, paint);
  }

  @override
  bool shouldRepaint(covariant _BuyerNavSvgIconPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.kind != kind;
  }
}

int _orderTransactionBadgeCount(List<OrderEntryData> entries) {
  final transactionIds = <int>{};
  for (final entry in entries) {
    if (entry.createdAtEpochMs > 0) {
      transactionIds.add(entry.createdAtEpochMs);
    }
  }
  return transactionIds.length;
}
