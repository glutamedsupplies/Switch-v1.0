import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:gms_shopping/cart.dart';
import 'package:gms_shopping/chat_support.dart';
import 'package:gms_shopping/chat_list.dart';
import 'package:gms_shopping/drawable_list_view.dart';
import 'package:gms_shopping/favorite_products_store.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/login_redirect.dart';
import 'package:gms_shopping/models/product.dart';
import 'package:gms_shopping/models/seller_summary.dart';
import 'package:gms_shopping/order.dart';
import 'package:gms_shopping/order_tab_navigation.dart';
import 'package:gms_shopping/order_store.dart';
import 'package:gms_shopping/profile.dart';
import 'package:gms_shopping/product_details.dart';
import 'package:gms_shopping/seller.dart';
import 'package:gms_shopping/search_bar.dart' as app_search;
import 'package:gms_shopping/services/notification_sound_service.dart';
import 'package:gms_shopping/services/product_repository.dart';
import 'package:gms_shopping/services/seller_repository.dart';
import 'package:gms_shopping/services/visual_product_detector.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/utils/app_keyboard.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:gms_shopping/utils/currency_format.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:gms_shopping/utils/session_image_cache.dart';
import 'package:gms_shopping/widgets/no_more_products_indicator.dart';
import 'package:gms_shopping/widgets/bouncing_dots_loader.dart';
import 'package:gms_shopping/widgets/product_company_identity.dart';
import 'package:gms_shopping/widgets/product_card_tap_lift.dart';
import 'package:shared_preferences/shared_preferences.dart';

const int _dealFilterAllIndex = 0;
const int _dealFilterNewPostIndex = 1;
const int _dealFilterFlashDealsIndex = 2;
const int _dealFilterTopSellingIndex = 3;
const int _dealFilterTopRatingIndex = 4;
const Duration _newProductPostDuration = Duration(days: 30);
const int _newProductsShowcaseLimit = 10;
const String _homeNavActiveIconAsset = 'assets/icons/home_icon_filled.svg';
const String _homeNavInactiveIconAsset = 'assets/icons/house.svg';
const String _chatNavActiveIconAsset = 'assets/icons/message_icon_filled.svg';
const String _chatNavInactiveIconAsset = 'assets/icons/messages-square.svg';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await GuestSession.ensureLoaded();
  await AuthSession.ensureLoaded();
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
        return MaterialApp(
          title: 'GMS Shopping',
          debugShowCheckedModeBanner: false,
          theme: appLightTheme,
          darkTheme: appDarkTheme,
          themeMode: themeMode,
          themeAnimationDuration: Duration.zero,
          navigatorObservers: [_keyboardDismissObserver],
          onGenerateRoute: (settings) {
            if (settings.name == '/seller') {
              final args = settings.arguments as Map<String, dynamic>? ?? {};
              final adminId = args['adminId'] as String? ?? '';
              final initialName = args['initialName'] as String?;
              return MaterialPageRoute<void>(builder: (_) => SellerPage(adminId: adminId, initialName: initialName));
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
  static const Duration _productAutoRefreshInterval = Duration(seconds: 15);
  static const Duration _chatAutoRefreshInterval = Duration(
    milliseconds: 350,
  );
  static const Duration _exitBackPressWindow = Duration(seconds: 2);
  late final ProductRepository _productRepository;
  late final SellerRepository _sellerRepository;
  late final ScrollController _productDashboardScrollController;
  late final TextEditingController _favoritesSearchController;
  late final FocusNode _favoritesSearchFocusNode;
  late final ValueNotifier<double> _heroImageOpacityNotifier;
  late final ValueNotifier<Future<List<Product>>> _productsFutureNotifier;
  late final ValueNotifier<Future<List<SellerSummary>>> _sellersFutureNotifier;
  late final ValueNotifier<bool> _isFavoritesSearchingNotifier;
  late final ValueNotifier<bool> _showsNewMessagePopupNotifier;
  late final ValueNotifier<bool> _showsScrollToTopButtonNotifier;
  late final ValueNotifier<bool> _isHomeChromeVisibleNotifier;
  late final ValueNotifier<String> _favoritesSearchQueryNotifier;
  late final ValueNotifier<int> _selectedIndexNotifier;
  late final ValueNotifier<int> _selectedOrderStageIndexNotifier;
  late final ValueNotifier<int> _selectedDealsIndexNotifier;
  late final ValueNotifier<int> _homeBottomOverscrollSignalNotifier;
  late final ValueNotifier<_HeaderAction?> _selectedHeaderActionNotifier;
  late final ValueNotifier<bool> _isShopVisualSearchingNotifier;
  late final ValueNotifier<List<Product>?> _shopVisualSearchProductsNotifier;
  late final ValueNotifier<String> _shopVisualSearchErrorNotifier;
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

  bool _isDrawerOpen = false;
  bool _isOpeningVisualSearchCamera = false;
  bool _isRefreshingChats = false;
  bool _isRefreshingProducts = false;
  final List<int> _tabHistory = <int>[0];
  int _lastIncomingSupportEvent = 0;
  int _lastHandledOrderTabRequest = 0;
  double _lastKeyboardBottomInset = 0;
  double _lastHomeCompanyScrollOffset = 0;
  DateTime? _lastBackPressAt;
  String _profileFirstName = '';
  String _profileLastName = '';
  String _profileEmail = '';

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

  int get _selectedDealsIndex => _selectedDealsIndexNotifier.value;
  set _selectedDealsIndex(int value) {
    if (_selectedDealsIndexNotifier.value != value) {
      _selectedDealsIndexNotifier.value = value;
    }
  }

  int get _homeBottomOverscrollSignal =>
      _homeBottomOverscrollSignalNotifier.value;
  set _homeBottomOverscrollSignal(int value) {
    if (_homeBottomOverscrollSignalNotifier.value != value) {
      _homeBottomOverscrollSignalNotifier.value = value;
    }
  }

  _HeaderAction? get _selectedHeaderAction => _selectedHeaderActionNotifier.value;
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

  bool get _isGuestMode => GuestSession.isGuest && !AuthSession.isLoggedInSync;

  bool _isGuestRestrictedTab(int index) {
    return index != 0 && index != 1;
  }

  void _redirectGuestToLogin() {
    unawaited(
      redirectGuestToLogin(
        context,
        themeModeNotifier: widget.themeModeNotifier,
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(CartStore.instance.ensureLoaded());
    unawaited(_initializeChatUnreadTracking());
    unawaited(_loadProfileData());
    _productRepository = widget.productRepository ?? createProductRepository();
    _sellerRepository = createSellerRepository();
    _productDashboardScrollController = ScrollController();
    _favoritesSearchController = TextEditingController();
    _favoritesSearchFocusNode = FocusNode();
    _heroImageOpacityNotifier = ValueNotifier(1);
    _productsFutureNotifier = ValueNotifier(_productRepository.fetchProducts());
    _sellersFutureNotifier = ValueNotifier(_sellerRepository.fetchSellers());
    _isFavoritesSearchingNotifier = ValueNotifier(false);
    _showsNewMessagePopupNotifier = ValueNotifier(false);
    _showsScrollToTopButtonNotifier = ValueNotifier(false);
    _isHomeChromeVisibleNotifier = ValueNotifier(true);
    _favoritesSearchQueryNotifier = ValueNotifier('');
    _selectedIndexNotifier = ValueNotifier(0);
    _selectedOrderStageIndexNotifier = ValueNotifier(0);
    _selectedDealsIndexNotifier = ValueNotifier(0);
    _homeBottomOverscrollSignalNotifier = ValueNotifier(0);
    _selectedHeaderActionNotifier = ValueNotifier(null);
    _isShopVisualSearchingNotifier = ValueNotifier(false);
    _shopVisualSearchProductsNotifier = ValueNotifier(null);
    _shopVisualSearchErrorNotifier = ValueNotifier('');
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
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    _profileFirstName = prefs.getString('profile_first_name') ?? '';
    _profileLastName = prefs.getString('profile_last_name') ?? '';
    _profileEmail = prefs.getString('profile_email') ?? '';
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

    if (_selectedHeaderAction == action) {
      _selectedHeaderAction = null;
    } else {
      _selectedHeaderAction = action;
    }
  }

  Future<void> _openCartPage() async {
    dismissAppKeyboard();
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    _selectedHeaderAction = _HeaderAction.cart;

    final cartAction = await openCartPage(context);

    if (!mounted) {
      return;
    }

    if (cartAction == CartPageAction.openShop) {
      _handleNavigationTap(1);
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
    if (index != 1 && _showsScrollToTopButton) {
      _showsScrollToTopButton = false;
    }
    if (index == 0) {
      _isHomeChromeVisible = true;
      _lastHomeCompanyScrollOffset = 0;
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
    _navigateToTab(index);
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

  Future<void> _openSearchPage() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) {
          final theme = Theme.of(context);

          return app_search.ProductSearchPage(
            productsFuture: _productsFuture,
            productRepository: _productRepository,
            primaryColor: theme.colorScheme.primary,
            surfaceColor: theme.cardColor,
            productCardSurfaceColor: _fieldBackgroundColor,
            titleColor: theme.colorScheme.onSurface,
            secondaryColor:
                theme.textTheme.bodyMedium?.color ??
                theme.colorScheme.onSurface.withOpacity(0.7),
          );
        },
      ),
    );
  }

  Future<void> _openVisualSearchPage() async {
    if (_isGuestMode) {
      _redirectGuestToLogin();
      return;
    }

    if (_isOpeningVisualSearchCamera) {
      return;
    }

    dismissAppKeyboard();
    _isOpeningVisualSearchCamera = true;
    app_search.clearProductSearchRecentSearches();

    app_search.VisualSearchCameraCapture? cameraCapture;
    try {
      cameraCapture = await app_search.pickVisualSearchCameraImage();
    } catch (_) {
      if (mounted) {
        AppSnackBar.showError(
          context,
          message: 'Unable to open camera search.',
        );
      }
    } finally {
      _isOpeningVisualSearchCamera = false;
    }

    if (!mounted || cameraCapture == null) {
      return;
    }

    _shopVisualSearchProducts = null;
    _shopVisualSearchError = '';
    _isShopVisualSearching = true;
    _navigateToTab(1);

    try {
      final detectedImage = await prepareVisualSearchImage(
        imagePath: cameraCapture.imagePath,
        imageBytes: cameraCapture.imageBytes,
        filename: cameraCapture.filename,
      );
      final matches = await _productRepository.searchProductsByImage(
        imageBytes: detectedImage.imageBytes,
        filename: detectedImage.filename,
      );

      if (!mounted) {
        return;
      }

      _shopVisualSearchProducts = app_search.limitVisualSearchProductMatches(
        matches,
      );
      _shopVisualSearchError = '';
      _isShopVisualSearching = false;
    } catch (error) {
      if (!mounted) {
        return;
      }

      _shopVisualSearchProducts = const <Product>[];
      _shopVisualSearchError = error.toString();
      _isShopVisualSearching = false;
      AppSnackBar.showError(
        context,
        message: 'Unable to search by image.',
      );
    }
  }

  void _clearShopVisualSearch() {
    _isShopVisualSearching = false;
    _shopVisualSearchProducts = null;
    _shopVisualSearchError = '';
  }

  void _handleDealsTap(int index) {
    final shouldChangeIndex = _selectedDealsIndex != index;

    _resetHeroImageOpacity();
    if (_showsScrollToTopButton) {
      _showsScrollToTopButton = false;
    }

    _selectedDealsIndex = index;

    if (!shouldChangeIndex) {
      _handleShopDashboardScroll(0);
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_productDashboardScrollController.hasClients) {
        return;
      }

      if (_productDashboardScrollController.offset > 0) {
        _productDashboardScrollController.jumpTo(0);
      }

      _handleShopDashboardScroll(0);
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

    if (mounted) {
      _sellersFuture = nextSellersFuture;
    }

    await Future.wait<dynamic>([
      _refreshProducts(resetHero: false),
      nextSellersFuture,
    ]);
  }

  void _startProductAutoRefresh() {
    _productAutoRefreshTimer?.cancel();
    _productAutoRefreshTimer = Timer.periodic(
      _productAutoRefreshInterval,
      (_) {
        _refreshProducts(
          resetHero: false,
          includeRefreshDelay: false,
        );
      },
    );
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
    _chatAutoRefreshTimer = Timer.periodic(
      _chatAutoRefreshInterval,
      (_) {
        unawaited(_refreshChats());
      },
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshProducts(
        resetHero: false,
        includeRefreshDelay: false,
      );
      unawaited(_refreshChats());
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

    if (!isOpened && _selectedHeaderAction == _HeaderAction.menu) {
      _selectedHeaderAction = null;
    }
  }

  void _handleHomeCompanyListScroll(double offset) {
    final nextOpacity = (1 - (offset / 180)).clamp(0.0, 1.0).toDouble();
    final scrollDelta = offset - _lastHomeCompanyScrollOffset;
    const directionThreshold = 5.0;

    if (offset <= 2) {
      _isHomeChromeVisible = true;
    } else if (scrollDelta > directionThreshold) {
      _isHomeChromeVisible = false;
    } else if (scrollDelta < -directionThreshold) {
      _isHomeChromeVisible = true;
    }

    _lastHomeCompanyScrollOffset = offset;

    if ((_heroImageOpacityNotifier.value - nextOpacity).abs() >= 0.01) {
      _heroImageOpacityNotifier.value = nextOpacity;
    }
  }

  void _handleShopDashboardScroll(double offset) {
    final shouldShowScrollToTopButton = offset > 180;

    if (_showsScrollToTopButton != shouldShowScrollToTopButton) {
      _showsScrollToTopButton = shouldShowScrollToTopButton;
    }
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
    if (_isDrawerOpen) {
      Navigator.of(context).pop();
      return false;
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
      AppSnackBar.showError(
        context,
        message: 'Please tap again to exit.',
      );
      return false;
    }

    return true;
  }

  @override
  void dispose() {
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
    _productDashboardScrollController.dispose();
    _favoritesSearchController.dispose();
    _favoritesSearchFocusNode.dispose();
    _heroImageOpacityNotifier.dispose();
    _productsFutureNotifier.dispose();
    _sellersFutureNotifier.dispose();
    _isFavoritesSearchingNotifier.dispose();
    _showsNewMessagePopupNotifier.dispose();
    _showsScrollToTopButtonNotifier.dispose();
    _isHomeChromeVisibleNotifier.dispose();
    _favoritesSearchQueryNotifier.dispose();
    _selectedIndexNotifier.dispose();
    _selectedOrderStageIndexNotifier.dispose();
    _selectedDealsIndexNotifier.dispose();
    _homeBottomOverscrollSignalNotifier.dispose();
    _selectedHeaderActionNotifier.dispose();
    _isShopVisualSearchingNotifier.dispose();
    _shopVisualSearchProductsNotifier.dispose();
    _shopVisualSearchErrorNotifier.dispose();
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
        drawer: DrawableListView(
          userFirstName: _profileFirstName,
          userLastName: _profileLastName,
          userEmail: _profileEmail,
        ),
        onDrawerChanged: _handleDrawerChanged,
        body: Column(
          children: [
            Expanded(
              child: SafeArea(
                bottom: false,
                child: ValueListenableBuilder<int>(
                  valueListenable: _selectedIndexNotifier,
                  builder: (context, selectedIndex, child) {
                    if (selectedIndex == 0) {
                      return _buildHomeMainArea();
                    }

                    return _buildNonHomeMainArea(selectedIndex);
                  },
                ),
              ),
            ),
            AnimatedBuilder(
              animation: Listenable.merge([
                _selectedIndexNotifier,
                _isHomeChromeVisibleNotifier,
              ]),
              builder: (context, child) {
                final selectedIndex = _selectedIndex;
                final isVisible =
                    selectedIndex != 0 || _isHomeChromeVisible;

                return _FooterVisibilityTransition(
                  visible: isVisible,
                  child: _FooterSection(
                    backgroundColor: _fieldBackgroundColor,
                    activeColor: _primaryColor,
                    inactiveColor: _secondaryColor,
                    selectedIndex: selectedIndex,
                    onTap: _handleNavigationTap,
                    onChatTap: _openProductConcernPage,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeMainArea() {
    return Column(
      children: [
        AnimatedBuilder(
          animation: Listenable.merge([
            _productsFutureNotifier,
            _selectedHeaderActionNotifier,
            _showsNewMessagePopupNotifier,
            _heroImageOpacityNotifier,
            _isHomeChromeVisibleNotifier,
          ]),
          builder: (context, child) {
            const fullHeroHeight = 260.0;
            const minHeroHeight = 52.0;
            final heroImageOpacity = _heroImageOpacityNotifier.value;
            final heroHeight =
                minHeroHeight +
                ((fullHeroHeight - minHeroHeight) * heroImageOpacity);

            return _HomeHeaderVisibilityTransition(
              visible: _isHomeChromeVisible,
              child: _HomeHeroSection(
                productsFuture: _productsFuture,
                selectedAction: _selectedHeaderAction,
                showNewMessagePopup: _showsNewMessagePopup,
                onActionTap: _handleHeaderAction,
                onSearchTap: () => _openSearchPage(),
                activeColor: _primaryColor,
                secondaryColor: _secondaryColor,
                heroImageOpacity: heroImageOpacity,
                heroHeight: heroHeight,
              ),
            );
          },
        ),
        Expanded(
          child: AnimatedBuilder(
            animation: Listenable.merge([
              _productsFutureNotifier,
              _sellersFutureNotifier,
            ]),
            builder: (context, child) {
              return _HomeCompaniesPage(
                sellersFuture: _sellersFuture,
                productsFuture: _productsFuture,
                backgroundColor: _dashboardForegroundColor,
                surfaceColor: _fieldBackgroundColor,
                titleColor: _titleColor,
                secondaryColor: _secondaryColor,
                primaryColor: _primaryColor,
                onRefresh: _refreshHomeCompanies,
                onScrollOffsetChanged: _handleHomeCompanyListScroll,
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildShopDashboardBody() {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _productsFutureNotifier,
        _selectedDealsIndexNotifier,
        _homeBottomOverscrollSignalNotifier,
        _showsScrollToTopButtonNotifier,
        _isShopVisualSearchingNotifier,
        _shopVisualSearchProductsNotifier,
        _shopVisualSearchErrorNotifier,
      ]),
      builder: (context, child) {
        final hasVisualSearchResults = _shopVisualSearchProducts != null;
        final visualSearchProducts = _shopVisualSearchProducts;
        final productsFuture = hasVisualSearchResults
            ? Future<List<Product>>.value(visualSearchProducts ?? const [])
            : _productsFuture;

        return Stack(
          children: [
            Positioned.fill(
              top: _DealsCarousel.height,
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
                      selectedDealsIndex: _selectedDealsIndex,
                      backgroundColor: _dashboardForegroundColor,
                      surfaceColor: _fieldBackgroundColor,
                      titleColor: _titleColor,
                      secondaryColor: _secondaryColor,
                      primaryColor: _primaryColor,
                      searchQuery: '',
                      scrollController: _productDashboardScrollController,
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
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: _DealsCarousel(
                selectedIndex: _selectedDealsIndex,
                backgroundColor: _fieldBackgroundColor,
                activeColor: _primaryColor,
                inactiveColor: _secondaryColor,
                onTap: _handleDealsTap,
              ),
            ),
            Positioned(
              right: 16,
              bottom: 18,
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
                    ? FloatingActionButton.small(
                        key: const ValueKey('shop-scroll-to-top-button'),
                        heroTag: 'shop-scroll-to-top-button',
                        backgroundColor: _primaryColor,
                        foregroundColor: _dashboardForegroundColor,
                        onPressed: _scrollDashboardToTop,
                        child: const Icon(Icons.keyboard_arrow_up_rounded),
                      )
                    : const SizedBox.shrink(
                        key: ValueKey('shop-scroll-to-top-button-hidden'),
                      ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildNonHomeMainArea(int selectedIndex) {
    final isShopTab = selectedIndex == 1;
    final headerBackgroundColor =
        isShopTab ? _chatHeaderBackgroundColor : _fieldBackgroundColor;
    final headerSearchFieldBackgroundColor = isShopTab
        ? _chatHeaderSearchFieldBackgroundColor
        : headerBackgroundColor;

    return Column(
      children: [
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
              showsSearchButton: selectedIndex != 2 && selectedIndex != 3,
              isSearchExpanded: selectedIndex == 4 && _isFavoritesSearching,
              searchController:
                  selectedIndex == 4 ? _favoritesSearchController : null,
              searchFocusNode:
                  selectedIndex == 4 ? _favoritesSearchFocusNode : null,
              searchFieldBackgroundColor: headerSearchFieldBackgroundColor,
              searchHintText: 'Search favorites',
              onSearchChanged:
                  selectedIndex == 4 ? _handleFavoritesSearchChanged : null,
              onSearchClear:
                  selectedIndex == 4 ? _resetFavoritesSearch : null,
              onSearchTapOutside:
                  selectedIndex == 4 ? (_) => _resetFavoritesSearch() : null,
              showNewMessagePopup: _showsNewMessagePopup,
              title: selectedIndex == 1
                  ? 'Shop'
                  : selectedIndex == 2
                      ? 'Order'
                      : selectedIndex == 3
                          ? 'Account'
                          : selectedIndex == 4
                              ? 'Favorites'
                              : null,
              selectedAction: _selectedHeaderAction,
              onActionTap: _handleHeaderAction,
              onSearchTap: selectedIndex == 4
                  ? _toggleFavoritesSearch
                  : () => _openSearchPage(),
            );
          },
        ),
        Expanded(
          child: _buildNonHomeBody(selectedIndex),
        ),
      ],
    );
  }

  Widget _buildNonHomeBody(int selectedIndex) {
    switch (selectedIndex) {
      case 1:
        return _buildShopDashboardBody();
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
            );
          },
        );
      case 2:
        return ValueListenableBuilder<int>(
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
        );
      case 3:
        return ProfilePage(
          backgroundColor: _dashboardForegroundColor,
          surfaceColor: _fieldBackgroundColor,
          titleColor: _titleColor,
          secondaryColor: _secondaryColor,
          primaryColor: _primaryColor,
          themeModeNotifier: widget.themeModeNotifier,
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
    required this.selectedIndex,
    required this.backgroundColor,
    required this.activeColor,
    required this.inactiveColor,
    required this.onTap,
  });

  static const double height = 38;

  final int selectedIndex;
  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<int> onTap;


  //Dito mag lalagay ng text carousel sa home dashboard 
  @override
  Widget build(BuildContext context) {
    const items = [
      'For You',
      'New Post',
      'Flash Deals',
      'Top Selling',
      'Top Rating',
    ];

    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
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
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          scrollDirection: Axis.horizontal,
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(width: 10),
          itemBuilder: (context, index) {
            final isActive = selectedIndex == index;

            return InkWell(
              onTap: () => onTap(index),
              borderRadius: BorderRadius.circular(4),
              overlayColor: const WidgetStatePropertyAll(Colors.transparent),
              splashFactory: NoSplash.splashFactory,
              highlightColor: Colors.transparent,
              splashColor: Colors.transparent,
              hoverColor: Colors.transparent,
              focusColor: Colors.transparent,
              child: AnimatedContainer(
                duration: appMotionFrames(11),
                padding: const EdgeInsets.fromLTRB(4, 6, 4, 8),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: isActive ? activeColor : Colors.transparent,
                      width: 2,
                    ),
                  ),
                ),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: Text(
                    items[index],
                    textHeightBehavior: const TextHeightBehavior(
                      applyHeightToFirstAscent: false,
                      applyHeightToLastDescent: false,
                    ),
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: isActive ? activeColor : inactiveColor,
                          fontWeight: FontWeight.w700,
                          height: 1,
                        ),
                  ),
                ),
              ),
            );
          },
            ),
          ),
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
    this.searchHintText = 'Search',
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
  final String searchHintText;
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
                            hintText: searchHintText,
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
                            icon: selectedAction == _HeaderAction.notification
                                ? Icons.notifications
                                : Icons.notifications_outlined,
                            color: selectedAction == _HeaderAction.notification
                                ? activeColor
                                : inactiveColor,
                            onPressed: () => onActionTap(_HeaderAction.notification),
                          ),
                          const SizedBox(width: 2),
                          ValueListenableBuilder<List<CartItemData>>(
                            valueListenable: CartStore.instance.cartItemsNotifier,
                            builder: (context, items, child) {
                              return _HeaderIconButton(
                                tooltip: 'Cart',
                                icon: selectedAction == _HeaderAction.cart
                                    ? Icons.shopping_cart_rounded
                                    : Icons.shopping_cart_outlined,
                                color: selectedAction == _HeaderAction.cart
                                    ? activeColor
                                    : inactiveColor,
                                badgeCount: cartEntryCount(items),
                                onPressed: () => onActionTap(_HeaderAction.cart),
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
    this.badgeCount = 0,
  });

  final String tooltip;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;
  final int badgeCount;
  final bool showBadgeAsDotOnly;

  @override
  Widget build(BuildContext context) {
    final displayBadge = badgeCount > 0;
    final badgeLabel = badgeCount > 99 ? '99+' : '$badgeCount';

    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      padding: const EdgeInsets.all(8),
      constraints: const BoxConstraints(),
      icon: SizedBox(
        width: 24,
        height: 24,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Align(
              alignment: Alignment.center,
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
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
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
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
    required this.selectedDealsIndex,
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
    this.onScrollOffsetChanged,
  });

  final Future<List<Product>> productsFuture;
  final int selectedDealsIndex;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String searchQuery;
  final ScrollController scrollController;
  final Future<void> Function() onRefresh;
  final ValueChanged<double>? onScrollOffsetChanged;
  final int bottomOverscrollSignal;
  final VoidCallback onBottomOverscroll;

  static const double _topSellingCardHeight = 124;
  static const double _homeProductCardBorderRadius = 8;

  @override
  State<_ProductDashboard> createState() => _ProductDashboardState();
}

class _ProductDashboardState extends State<_ProductDashboard> {
  static const int _lazyLoadPageSize = 6;
  static const double _lazyLoadTriggerExtent = 240;

  int _visibleProductCount = _lazyLoadPageSize;

  bool _matchesSearchQuery(Product product) {
    final normalizedQuery = widget.searchQuery.trim().toLowerCase();
    if (normalizedQuery.isEmpty) {
      return true;
    }

    return product.name.toLowerCase().contains(normalizedQuery) ||
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
    List<Product> filteredProducts;

    switch (widget.selectedDealsIndex) {
      case _dealFilterNewPostIndex:
        filteredProducts = _buildNewPostProducts(visibleProducts);
        break;
      case _dealFilterFlashDealsIndex:
        filteredProducts = visibleProducts
            .where((product) => _discountAmount(product) != null)
            .toList();
        break;
      case _dealFilterTopSellingIndex:
        filteredProducts = _buildTopSellingProducts(visibleProducts);
        break;
      case _dealFilterTopRatingIndex:
        final topReviewedProducts = visibleProducts.where(_isTopRatedProduct).toList()
          ..sort((first, second) {
            final ratingCompare = second.rating.compareTo(first.rating);
            if (ratingCompare != 0) {
              return ratingCompare;
            }

            return second.sold.compareTo(first.sold);
          });
        filteredProducts = topReviewedProducts;
        break;
      case _dealFilterAllIndex:
      default:
        filteredProducts = [...visibleProducts]
          ..sort(
            (first, second) => first.name.toLowerCase().compareTo(
                  second.name.toLowerCase(),
                ),
          );
        break;
    }

    return _applySearchFilter(filteredProducts);
  }

  IconData get _emptyStateIcon {
    switch (widget.selectedDealsIndex) {
      case _dealFilterNewPostIndex:
        return Icons.new_releases_outlined;
      case _dealFilterFlashDealsIndex:
        return Icons.local_offer_outlined;
      case _dealFilterTopSellingIndex:
        return Icons.leaderboard_rounded;
      case _dealFilterTopRatingIndex:
        return Icons.star_outline_rounded;
      default:
        return Icons.inventory_2_outlined;
    }
  }

  String get _emptyStateTitle {
    if (widget.searchQuery.trim().isNotEmpty) {
      return 'No matching products';
    }

    switch (widget.selectedDealsIndex) {
      case _dealFilterNewPostIndex:
        return 'No new posts yet';
      case _dealFilterFlashDealsIndex:
        return 'No flash deals yet';
      case _dealFilterTopSellingIndex:
        return 'No top-selling products yet';
      case _dealFilterTopRatingIndex:
        return 'No top reviews yet';
      default:
        return 'No products yet';
    }
  }

  String get _emptyStateMessage {
    if (widget.searchQuery.trim().isNotEmpty) {
      return 'Try another product name, category, or clear the search field.';
    }

    switch (widget.selectedDealsIndex) {
      case _dealFilterNewPostIndex:
        return 'Products stay in New Post for 30 days after they are added.';
      case _dealFilterFlashDealsIndex:
        return 'There are no discounted products right now. Pull down to refresh after adding sale prices.';
      case _dealFilterTopSellingIndex:
        return 'Only the top 10 highest-sold products appear here. Add products with sold counts, then pull down to refresh.';
      case _dealFilterTopRatingIndex:
        return 'Only products rated 4.5 to 5.0 appear here. Add higher-rated products, then pull down to refresh.';
      default:
        return 'Add products in the backend admin page, then pull down to refresh.';
    }
  }

  void _scheduleScrollReset() {
    if (widget.onScrollOffsetChanged == null) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.onScrollOffsetChanged?.call(0);
    });
  }

  @override
  void didUpdateWidget(covariant _ProductDashboard oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.selectedDealsIndex != widget.selectedDealsIndex ||
        oldWidget.searchQuery != widget.searchQuery) {
      _visibleProductCount = _lazyLoadPageSize;
    }
  }

  int _resolvedVisibleProductCount(int totalCount) {
    if (totalCount <= 0) {
      return 0;
    }

    return _visibleProductCount > totalCount ? totalCount : _visibleProductCount;
  }

  int _estimateLineCount(
    String text, {
    required int charsPerLine,
    int minLines = 1,
    int? maxLines,
  }) {
    final normalized = text.trim();
    var lines =
        normalized.isEmpty ? minLines : (normalized.length / charsPerLine).ceil();

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

  bool _loadMoreProductsIfNeeded(int totalCount) {
    if (_visibleProductCount >= totalCount) {
      return false;
    }

    final nextVisibleProductCount = _visibleProductCount + _lazyLoadPageSize;

    setState(() {
      _visibleProductCount = nextVisibleProductCount > totalCount
          ? totalCount
          : nextVisibleProductCount;
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
            final products = snapshot.data ?? const <Product>[];
            final allTopSellingProducts = _buildTopSellingProducts(products);
            final topSellerIds = {
              for (final product in allTopSellingProducts) product.id,
            };
            final isAllView = widget.selectedDealsIndex == _dealFilterAllIndex;
            final isTopSellingView =
                widget.selectedDealsIndex == _dealFilterTopSellingIndex;
            final isTopReviewView =
                widget.selectedDealsIndex == _dealFilterTopRatingIndex;
            final isNewPostView =
                widget.selectedDealsIndex == _dealFilterNewPostIndex;
            final isFlashDealsView =
                widget.selectedDealsIndex == _dealFilterFlashDealsIndex;
            final topSellingProducts = isTopSellingView
                ? allTopSellingProducts
                : const <Product>[];
            final filteredProducts = _filterProducts(products);
            final visibleProducts = filteredProducts
                .take(_resolvedVisibleProductCount(filteredProducts.length))
                .toList(growable: false);
            final topSellingRanks = isTopSellingView
                ? <String, int>{
                    for (var index = 0; index < topSellingProducts.length; index++)
                      topSellingProducts[index].id: index + 1,
                  }
                : const <String, int>{};
            final productColumns = isTopSellingView
                ? const <List<Product>>[<Product>[], <Product>[]]
                : _buildProductColumns(visibleProducts);
            final hasMoreProducts = visibleProducts.length < filteredProducts.length;

            if (snapshot.connectionState == ConnectionState.waiting &&
                products.isEmpty) {
              _scheduleScrollReset();
              return _RefreshStateView(
                onRefresh: widget.onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: widget.backgroundColor,
                child: SizedBox(
                  height: constraints.maxHeight,
                  child: Center(
                    child: BouncingDotsLoader(
                      activeColor: widget.primaryColor,
                      inactiveColor: widget.secondaryColor.withOpacity(0.28),
                    ),
                  ),
                ),
              );
            }

            if (snapshot.hasError && products.isEmpty) {
              _scheduleScrollReset();
              return _RefreshStateView(
                onRefresh: widget.onRefresh,
                minHeight: constraints.maxHeight,
                backgroundColor: widget.backgroundColor,
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
                child: _DashboardStateCard(
                  icon: _emptyStateIcon,
                  title: _emptyStateTitle,
                  message: _emptyStateMessage,
                  primaryColor: widget.primaryColor,
                  surfaceColor: widget.backgroundColor,
                  secondaryColor: widget.secondaryColor,
                  borderRadius: 0,
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: widget.onRefresh,
              child: NotificationListener<ScrollNotification>(
                onNotification: (notification) {
                  if (notification.depth != 0 ||
                      notification.metrics.axis != Axis.vertical) {
                    return false;
                  }

                  final offset = notification.metrics.pixels;
                  widget.onScrollOffsetChanged?.call(offset < 0 ? 0 : offset);
                  final remainingDistance = (notification.metrics.maxScrollExtent - offset)
                      .clamp(0.0, double.infinity);
                  var loadedMoreProducts = false;

                  if (hasMoreProducts &&
                      remainingDistance <= _lazyLoadTriggerExtent) {
                    loadedMoreProducts =
                        _loadMoreProductsIfNeeded(filteredProducts.length);
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
                      controller: widget.scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
                      itemCount:
                          isTopSellingView ? visibleProducts.length + 1 : 2,
                      itemBuilder: (context, index) {
                        final isIndicatorItem = isTopSellingView
                            ? index == visibleProducts.length
                            : index == 1;
                        if (isIndicatorItem) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 18),
                            child: NoMoreProductsIndicator(
                              scrollController: widget.scrollController,
                              overscrollSignal: widget.bottomOverscrollSignal,
                              primaryColor: widget.primaryColor,
                              secondaryColor: widget.secondaryColor,
                            ),
                          );
                        }

                        if (isTopSellingView) {
                          final product = visibleProducts[index];
                          return Padding(
                            padding: EdgeInsets.only(
                              bottom: index == visibleProducts.length - 1
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
                                topSellingRank: topSellingRanks[product.id],
                                showTopSellerBadge: false,
                                showTopRatedImageBadge: isTopReviewView,
                                showDiscountInlineBadge: !isFlashDealsView,
                                showNewBadge: isNewPostView,
                              ),
                            ),
                          );
                        }

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (var columnIndex = 0;
                                columnIndex < productColumns.length;
                                columnIndex++) ...[
                              if (columnIndex > 0) const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    for (var itemIndex = 0;
                                        itemIndex <
                                            productColumns[columnIndex].length;
                                        itemIndex++) ...[
                                      if (itemIndex > 0)
                                        const SizedBox(height: 12),
                                      _ProductCard(
                                        product: productColumns[columnIndex]
                                            [itemIndex],
                                        surfaceColor: widget.surfaceColor,
                                        titleColor: widget.titleColor,
                                        secondaryColor: widget.secondaryColor,
                                        primaryColor: widget.primaryColor,
                                        borderRadius: _ProductDashboard
                                            ._homeProductCardBorderRadius,
                                        showTopSellerBadge:
                                            topSellerIds.contains(
                                          productColumns[columnIndex][itemIndex]
                                              .id,
                                        ),
                                        showTopRatedImageBadge: isTopReviewView,
                                        showDiscountInlineBadge: !isFlashDealsView,
                                        showNewBadge: isNewPostView,
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

class _CompanyListing {
  const _CompanyListing({
    required this.id,
    required this.adminId,
    required this.name,
    required this.storeType,
    required this.pictureUrl,
    required this.productCount,
    required this.categories,
    required this.latestProduct,
  });

  final String id;
  final String adminId;
  final String name;
  final String storeType;
  final String pictureUrl;
  final int productCount;
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

  String get statusLabel => hasListings ? listingCountLabel : 'Coming Soon';

  String get storeTypeLabel {
    final normalizedStoreType = storeType.trim();
    return normalizedStoreType.isEmpty ? 'Store Type' : normalizedStoreType;
  }
}

class _MutableCompanyListing {
  _MutableCompanyListing({
    required this.id,
    required this.adminId,
    required String name,
    required String storeType,
    required String pictureUrl,
  })  : name = name.trim().isEmpty ? 'Company' : name.trim(),
        storeType = storeType.trim(),
        pictureUrl = pictureUrl.trim();

  final String id;
  String adminId;
  String name;
  String storeType;
  String pictureUrl;
  Product? latestProduct;
  int productCount = 0;
  final Set<String> categories = <String>{};

  void addProduct(Product product) {
    productCount += 1;

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

    categories.addAll(product.categoryList.where((category) => category.isNotEmpty));

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
      categories: categories.toList(growable: false),
      latestProduct: latestProduct,
    );
  }
}

class _HomeCompaniesPage extends StatelessWidget {
  const _HomeCompaniesPage({
    required this.sellersFuture,
    required this.productsFuture,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    required this.onRefresh,
    required this.onScrollOffsetChanged,
  });

  final Future<List<SellerSummary>> sellersFuture;
  final Future<List<Product>> productsFuture;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final Future<void> Function() onRefresh;
  final ValueChanged<double> onScrollOffsetChanged;

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
    final companiesByKey = <String, _MutableCompanyListing>{};

    for (final seller in sellers) {
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

    for (final product in filterVisibleProducts(products)) {
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
          storeType: '',
          pictureUrl: product.companyPictureUrl.trim(),
        ),
      );
      company.addProduct(product);
    }

    final companies = companiesByKey.values
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

        return first.name.toLowerCase().compareTo(second.name.toLowerCase());
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
                  child: Center(
                    child: BouncingDotsLoader(
                      activeColor: primaryColor,
                      inactiveColor: secondaryColor.withOpacity(0.28),
                    ),
                  ),
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

                return RefreshIndicator(
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
      arguments: {
        'adminId': company.adminId,
        'initialName': company.name,
      },
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
                              company.storeTypeLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(
                                    color: primaryColor,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0,
                                    height: 1.15,
                                  ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              company.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(
                                    fontSize: 15,
                                    color: titleColor,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 0,
                                    height: 1.05,
                                  ),
                            ),
                            const Spacer(),
                            Text(
                              company.statusLabel,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: company.hasListings
                                        ? secondaryColor
                                        : primaryColor,
                                    fontWeight: company.hasListings
                                        ? FontWeight.w500
                                        : FontWeight.w800,
                                    letterSpacing: 0,
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
            color: errorMessage.isNotEmpty ? const Color(0xFFD32F2F) : primaryColor,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: errorMessage.isNotEmpty ? const Color(0xFFD32F2F) : secondaryColor,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0,
                  ),
            ),
          ),
          IconButton(
            onPressed: onClear,
            tooltip: 'Clear visual search',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints.tightFor(width: 32, height: 32),
            icon: Icon(
              Icons.close_rounded,
              size: 18,
              color: secondaryColor,
            ),
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
  if (salesPrice == null || salesPrice < 0 || salesPrice >= product.originalPrice) {
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
  final recentProducts = [
    ...filterVisibleProducts(products).where(_isNewProductPost),
  ]..sort((first, second) {
      final createdAtCompare = second.createdAt.compareTo(first.createdAt);
      if (createdAtCompare != 0) {
        return createdAtCompare;
      }

      return first.name.toLowerCase().compareTo(second.name.toLowerCase());
    });

  return recentProducts;
}

bool _isTopRatedProduct(Product product) => product.rating >= 4.5 && product.rating <= 5;

List<Product> _buildTopSellingProducts(
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
        title: 'Shop',
        message: 'Shop content is separate from Home and is currently empty.',
        icon: Icons.shopping_bag_outlined,
      );
    case 2:
      return const _SectionPlaceholderData(
        title: 'Order',
        message: 'Order content is separate from Home and will appear here.',
        icon: Icons.receipt_long_outlined,
      );
    case 3:
      return const _SectionPlaceholderData(
        title: 'Account',
        message: 'Account content is separate from Home and will appear here.',
        icon: Icons.person_outline_rounded,
      );
    case 4:
      return const _SectionPlaceholderData(
        title: 'Favorites',
        message: 'Favorites content is separate from Home and will appear here.',
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

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: AnimatedSize(
        duration: appMotionFrames(16),
        curve: Curves.easeOutCubic,
        alignment: Alignment.topCenter,
        child: visible
            ? child
            : const SizedBox(
                width: double.infinity,
                height: 0,
              ),
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
            ? (theme.inputDecorationTheme.fillColor ??
                theme.colorScheme.surface)
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
            child: Opacity(
              opacity: heroImageOpacity,
              child: child,
            ),
          ),
        ),
      );
    }

    return FutureBuilder<List<Product>>(
      future: productsFuture,
      builder: (context, snapshot) {
        final showcaseProducts =
            _buildShowcaseProducts(snapshot.data ?? const <Product>[]);

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
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.86),
            ),
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
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
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
            BouncingDotsLoader(
              activeColor: primaryColor,
              inactiveColor: primaryColor.withOpacity(0.22),
            ),
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
  });

  final List<Product> products;
  final bool isFallback;
  final Color primaryColor;
  final String? featuredDiscountProductId;

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
      }
    });
  }

  @override
  void didUpdateWidget(covariant _NewProductsShowcase oldWidget) {
    super.didUpdateWidget(oldWidget);

    final hasChanged = oldWidget.products.length != widget.products.length ||
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

    _autoSlideTimer = Timer.periodic(
      const Duration(seconds: 4),
      (_) {
        if (!_pageController.hasClients) {
          return;
        }

        final nextPage = (_currentPage + 1) % widget.products.length;
        _pageController.animateToPage(
          nextPage,
          duration: appMotionFrames(27),
          curve: Curves.easeInOut,
        );
      },
    );
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
              },
              itemBuilder: (context, index) {
                return _ShowcaseCard(
                  product: widget.products[index],
                  isFallback: widget.isFallback,
                  primaryColor: widget.primaryColor,
                  featuredDiscountProductId: widget.featuredDiscountProductId,
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
  });

  final Product product;
  final bool isFallback;
  final Color primaryColor;
  final String? featuredDiscountProductId;

  bool get _hasSalesPrice => product.salesPrice != null && product.salesPrice! >= 0;

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
      onTapWithHero: (heroTag) =>
          openProductDetailsPage(context, product, heroTag: heroTag),
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: Colors.transparent,
          child: InkWell(
        onTap: handleTap,
        child: Container(
          decoration: BoxDecoration(
            color: primaryColor.withOpacity(0.14),
          ),
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
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
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
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
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
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
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
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Colors.white.withOpacity(0.95),
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        if (_showsOriginalPrice)
                          _PriceText(
                            amount: product.originalPrice,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
                      textStyle: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white.withOpacity(0.9),
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Posted $_formattedDate',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white.withOpacity(0.82),
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
      },
    );
  }
}

class _ShowcaseImage extends StatelessWidget {
  const _ShowcaseImage({
    required this.product,
    required this.primaryColor,
  });

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
          : Alignment(
              product.cardImageAlignmentX,
              product.cardImageAlignmentY,
            ),
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

class _RefreshStateView extends StatelessWidget {
  const _RefreshStateView({
    required this.onRefresh,
    required this.minHeight,
    required this.backgroundColor,
    required this.child,
  });

  final Future<void> Function() onRefresh;
  final double minHeight;
  final Color backgroundColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ColoredBox(
          color: backgroundColor,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: minHeight),
            child: child,
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
  });

  final IconData icon;
  final String title;
  final String message;
  final Color primaryColor;
  final Color surfaceColor;
  final Color secondaryColor;
  final double borderRadius;

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
          Icon(
            icon,
            size: 34,
            color: primaryColor,
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
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
  });

  final Color backgroundColor;
  final Color productCardSurfaceColor;
  final Future<List<Product>> productsFuture;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String searchQuery;
  final Future<void> Function() onRefresh;

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
    var lines =
        normalized.isEmpty ? minLines : (normalized.length / charsPerLine).ceil();

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
                child: _DashboardStateCard(
                  icon: Icons.favorite_border_rounded,
                  title: 'No favorites yet',
                  message:
                      'Tap the heart icon on any product details page to save products here.',
                  primaryColor: primaryColor,
                  surfaceColor: backgroundColor,
                  secondaryColor: secondaryColor,
                  borderRadius: 0,
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
                final savedFavoriteProducts =
                    _buildFavoriteProducts(products, favoriteProductIds);
                final favoriteProducts =
                    _applySearchFilter(savedFavoriteProducts);
                final productColumns = _buildProductColumns(favoriteProducts);

                if (snapshot.connectionState == ConnectionState.waiting &&
                    products.isEmpty) {
                  return _RefreshStateView(
                    onRefresh: onRefresh,
                    minHeight: constraints.maxHeight,
                    backgroundColor: backgroundColor,
                    child: SizedBox(
                      height: constraints.maxHeight,
                      child: Center(
                        child: BouncingDotsLoader(
                          activeColor: primaryColor,
                          inactiveColor: secondaryColor.withOpacity(0.28),
                        ),
                      ),
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
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: onRefresh,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: ColoredBox(
                      color: backgroundColor,
                      child: ConstrainedBox(
                        constraints:
                            BoxConstraints(minHeight: constraints.maxHeight),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(10, 14, 10, 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(6, 0, 6, 14),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
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
                                            color:
                                                secondaryColor.withOpacity(0.78),
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  for (var columnIndex = 0;
                                      columnIndex < productColumns.length;
                                      columnIndex++) ...[
                                    if (columnIndex > 0)
                                      const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.stretch,
                                        children: [
                                          for (var itemIndex = 0;
                                              itemIndex <
                                                  productColumns[columnIndex]
                                                      .length;
                                              itemIndex++) ...[
                                            if (itemIndex > 0)
                                              const SizedBox(height: 12),
                                            _ProductCard(
                                              product: productColumns[columnIndex]
                                                  [itemIndex],
                                              surfaceColor:
                                                  productCardSurfaceColor,
                                              titleColor: titleColor,
                                              secondaryColor: secondaryColor,
                                              primaryColor: primaryColor,
                                              borderRadius:
                                                  _ProductDashboard
                                                      ._homeProductCardBorderRadius,
                                              showTopSellerBadge: topSellerIds
                                                  .contains(
                                                    productColumns[columnIndex]
                                                        [itemIndex]
                                                        .id,
                                                  ),
                                              showDiscountInlineBadge: false,
                                              onFavoriteTap: () =>
                                                  _handleFavoriteCardToggle(
                                                context,
                                                productColumns[columnIndex]
                                                    [itemIndex],
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

  bool get _hasSalesPrice => product.salesPrice != null && product.salesPrice! >= 0;

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

  Widget _buildInlineBadge(
    BuildContext context, {
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 6,
        vertical: 3,
      ),
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

  Widget _buildSecondaryRowBadge(
    BuildContext context, {
    required String label,
    required Color color,
  }) {
    final compactStyle = _inlineBadgeTextStyle(context).copyWith(fontSize: 9.4);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 4,
        vertical: 2.3,
      ),
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

  double _measureInlineBadgeWidth(
    BuildContext context, {
    required String label,
  }) {
    final labelStyle = _inlineBadgeTextStyle(context);
    final painter = TextPainter(
      text: TextSpan(
        text: label,
        style: labelStyle,
      ),
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
      text: TextSpan(
        text: product.name,
        style: style,
      ),
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
        _measureInlineBadgeWidth(
          context,
          label: '-${_discountPercentValue!}%',
        ),
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

  Widget _buildProductMedia({
    required double imageHeight,
  }) {
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
          Positioned(
            top: 0,
            right: 0,
            child: const _TopRatedImageBadge(),
          ),
        if (_showsNewBadge)
          Positioned(
            top: 0,
            right: 0,
            child: _NewBadge(),
          ),
      ],
    );
  }

  Widget _buildProductDetails(BuildContext context, {bool isTopSelling = false}) {
    final categorySpacing = 0.0;
    final nameSpacing = isTopSelling ? 1.0 : 2.0;
    final statsSpacing = isTopSelling ? 1.0 : 4.0;
    final productNameStyle = Theme.of(context).textTheme.titleSmall?.copyWith(
          fontSize: 15,
          color: titleColor,
          fontWeight: FontWeight.w500,
          letterSpacing: 0,
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
        final showsCompactBadgeRow = useCompactTopBadges &&
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
                    letterSpacing: 0,
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
                        letterSpacing: 0,
                      ),
                ),
                if (_showsOriginalPrice)
                  _PriceText(
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
            SizedBox(height: statsSpacing),
            _ProductStatsRow(
              product: product,
              iconColor: const Color(0xFFF9A825),
              textStyle: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    fontWeight: FontWeight.w200,
                    letterSpacing: 0,
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
      onTapWithHero: (heroTag) =>
          openProductDetailsPage(context, product, heroTag: heroTag),
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
                              child: _buildProductMedia(imageHeight: double.infinity),
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

        final clampedFontSize =
            resolvedFontSize < minFontSize ? minFontSize : resolvedFontSize;

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
  const _DiscountBadge({
    required this.percent,
  });

  final int percent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFD32F2F),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(8),
        ),
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
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFF1976D2),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(8),
        ),
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
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFFFB8C00),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(8),
        ),
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
  const _TopSellingImageBadge({
    required this.rank,
  });

  final int rank;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(
        minWidth: 38,
        minHeight: 30,
      ),
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 6,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF00897B),
        borderRadius: BorderRadius.only(
          bottomRight: Radius.circular(8),
        ),
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
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
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
        Icon(
          Icons.star_rounded,
          size: 16,
          color: iconColor,
        ),
        const SizedBox(width: 4),
        Text(
          _formatProductRating(product.rating),
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
  const _PriceText({
    required this.amount,
    this.style,
  });

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final resolvedStyle =
        DefaultTextStyle.of(context).style.merge(style).copyWith(
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
        return ClipRect(
          child: Align(
            alignment: Alignment.topCenter,
            heightFactor: value,
            child: Transform.translate(
              offset: Offset(0, (1 - value) * 88),
              child: Opacity(
                opacity: value,
                child: child,
              ),
            ),
          ),
        );
      },
      child: child,
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
    required this.onChatTap,
  });

  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;
  final int selectedIndex;
  final ValueChanged<int> onTap;
  final VoidCallback onChatTap;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<List<OrderEntryData>>(
      valueListenable: OrderStore.instance.ordersNotifier,
      builder: (context, orders, _) {
        final bottomPadding = MediaQuery.paddingOf(context).bottom;
        const barHeight = 62.0;
        final footerHeight = barHeight + bottomPadding;
        final orderBadgeCount = _orderTransactionBadgeCount(orders);
        final isLightMode = Theme.of(context).brightness == Brightness.light;
        final isDarkMode = Theme.of(context).brightness == Brightness.dark;
        final footerTopShadow = isLightMode || isDarkMode
            ? <BoxShadow>[
                BoxShadow(
                  color: isDarkMode
                      ? Colors.white.withOpacity(0.14)
                      : Colors.black.withOpacity(0.14),
                  blurRadius: isDarkMode ? 20 : 18,
                  offset: const Offset(0, -5),
                  spreadRadius: isDarkMode ? -8 : -6,
                ),
              ]
            : const <BoxShadow>[];
        return ValueListenableBuilder<List<ChatSupportThreadData>>(
          valueListenable: ChatSupportStore.instance.threadListNotifier,
          builder: (context, threads, child) {
            final chatBadgeCount = _chatUnreadBadgeCount(threads);
            final items = [
              _NavItemData(
                index: 0,
                label: 'Home',
                iconBuilder: (color, isActive) => _HomeNavigationSvgIcon(
                  assetName: isActive
                      ? _homeNavActiveIconAsset
                      : _homeNavInactiveIconAsset,
                  color: color,
                ),
              ),
              const _NavItemData(
                index: 1,
                label: 'Shop',
                inactiveIcon: Icons.shopping_bag_outlined,
                activeIcon: Icons.shopping_bag_rounded,
              ),
              _NavItemData(
                index: 2,
                label: 'Order',
                inactiveIcon: Icons.receipt_long_outlined,
                activeIcon: Icons.receipt_long,
                badgeCount: orderBadgeCount,
              ),
              const _NavItemData(
                index: 3,
                label: 'Account',
                inactiveIcon: Icons.person_outline_rounded,
                activeIcon: Icons.person_rounded,
              ),
              _NavItemData(
                index: -2,
                label: 'Chat',
                iconBuilder: (color, isActive) => _ChatNavigationSvgIcon(
                  assetName: isActive
                      ? _chatNavActiveIconAsset
                      : _chatNavInactiveIconAsset,
                  color: color,
                ),
                badgeCount: chatBadgeCount,
                onTap: onChatTap,
              ),
            ];

            Widget buildDestination(_NavItemData item) {
              final isActive = selectedIndex == item.index;

              return Expanded(
                child: _NavigationButton(
                  label: item.label,
                  icon: isActive ? item.activeIcon : item.inactiveIcon,
                  iconBuilder: item.iconBuilder,
                  isActive: isActive,
                  activeColor: activeColor,
                  inactiveColor: inactiveColor,
                  badgeCount: item.badgeCount,
                  onTap: item.onTap ?? () => onTap(item.index),
                ),
              );
            }

            return SizedBox(
              width: double.infinity,
              height: footerHeight,
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.topCenter,
                children: [
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: backgroundColor,
                        boxShadow: footerTopShadow,
                      ),
                      child: SizedBox(
                        height: barHeight + bottomPadding,
                        child: Padding(
                          padding: EdgeInsets.only(bottom: bottomPadding),
                          child: Row(
                            children: [
                              for (final item in items) buildDestination(item),
                            ],
                          ),
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
    final currentColor = isActive ? activeColor : inactiveColor;
    final displayBadge = badgeCount > 0;
    final badgeLabel = badgeCount > 99 ? '99+' : '$badgeCount';

    return Semantics(
      label: label,
      button: true,
      selected: isActive,
      child: InkWell(
        onTap: onTap,
        borderRadius: const BorderRadius.all(Radius.circular(18)),
        child: Center(
          child: SizedBox(
            width: 74,
            child: Center(
              child: SizedBox(
                width: 34,
                height: 34,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Align(
                      alignment: Alignment.center,
                      child: iconBuilder?.call(currentColor, isActive) ??
                          Icon(
                            icon,
                            color: currentColor,
                            size: 24,
                          ),
                    ),
                    if (displayBadge)
                      Positioned(
                        top: 0,
                        right: 0,
                        child: Container(
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 1,
                          ),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE53935),
                            borderRadius:
                                const BorderRadius.all(Radius.circular(8)),
                          ),
                          child: Text(
                            badgeLabel,
                            textAlign: TextAlign.center,
                            style:
                                Theme.of(context).textTheme.labelSmall?.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      height: 1,
                                      fontSize: 9.5,
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
  }) : assert(iconBuilder != null || (inactiveIcon != null && activeIcon != null));

  final int index;
  final String label;
  final IconData? inactiveIcon;
  final IconData? activeIcon;
  final _NavIconBuilder? iconBuilder;
  final int badgeCount;
  final VoidCallback? onTap;
}

class _ChatNavigationSvgIcon extends StatelessWidget {
  const _ChatNavigationSvgIcon({
    required this.assetName,
    required this.color,
  });

  final String assetName;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 24,
      child: CustomPaint(
        painter: _ChatNavigationSvgIconPainter(
          color: color,
          isFilled: assetName == _chatNavActiveIconAsset,
        ),
      ),
    );
  }
}

class _ChatNavigationSvgIconPainter extends CustomPainter {
  const _ChatNavigationSvgIconPainter({
    required this.color,
    required this.isFilled,
  });

  final Color color;
  final bool isFilled;

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

    final backBubble = _backBubblePath();
    final frontBubble = _frontBubblePath();
    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    if (isFilled) {
      final fillPaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;
      canvas.drawPath(backBubble, fillPaint);
      canvas.drawPath(frontBubble, fillPaint);
      canvas.drawPath(backBubble, strokePaint);
      canvas.drawPath(frontBubble, strokePaint);
    } else {
      canvas.drawPath(frontBubble, strokePaint);
      canvas.drawPath(_backBubbleOutlinePath(), strokePaint);
    }

    canvas.restore();
  }

  static Path _frontBubblePath() {
    return Path()
      ..moveTo(4, 2)
      ..lineTo(14, 2)
      ..quadraticBezierTo(16, 2, 16, 4)
      ..lineTo(16, 10)
      ..quadraticBezierTo(16, 12, 14, 12)
      ..lineTo(6.8, 12)
      ..quadraticBezierTo(6, 12, 5.4, 12.6)
      ..lineTo(3.2, 14.8)
      ..quadraticBezierTo(2, 16, 2, 14.3)
      ..lineTo(2, 4)
      ..quadraticBezierTo(2, 2, 4, 2)
      ..close();
  }

  static Path _backBubblePath() {
    return Path()
      ..moveTo(10, 9)
      ..lineTo(20, 9)
      ..quadraticBezierTo(22, 9, 22, 11)
      ..lineTo(22, 21.3)
      ..quadraticBezierTo(22, 23, 20.8, 21.8)
      ..lineTo(18.6, 19.6)
      ..quadraticBezierTo(18, 19, 17.2, 19)
      ..lineTo(10, 19)
      ..quadraticBezierTo(8, 19, 8, 17)
      ..lineTo(8, 11)
      ..quadraticBezierTo(8, 9, 10, 9)
      ..close();
  }

  static Path _backBubbleOutlinePath() {
    return Path()
      ..moveTo(20, 9)
      ..quadraticBezierTo(22, 9, 22, 11)
      ..lineTo(22, 21.3)
      ..quadraticBezierTo(22, 23, 20.8, 21.8)
      ..lineTo(18.6, 19.6)
      ..quadraticBezierTo(18, 19, 17.2, 19)
      ..lineTo(10, 19)
      ..quadraticBezierTo(8, 19, 8, 17)
      ..lineTo(8, 16);
  }

  @override
  bool shouldRepaint(covariant _ChatNavigationSvgIconPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.isFilled != isFilled;
  }
}

class _HomeNavigationSvgIcon extends StatelessWidget {
  const _HomeNavigationSvgIcon({
    required this.assetName,
    required this.color,
  });

  final String assetName;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 24,
      child: CustomPaint(
        painter: _HomeNavigationSvgIconPainter(
          color: color,
          isFilled: assetName == _homeNavActiveIconAsset,
        ),
      ),
    );
  }
}

class _HomeNavigationSvgIconPainter extends CustomPainter {
  const _HomeNavigationSvgIconPainter({
    required this.color,
    required this.isFilled,
  });

  final Color color;
  final bool isFilled;

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

    final housePath = _housePath();
    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    if (isFilled) {
      final fillPath = Path.combine(
        ui.PathOperation.difference,
        housePath,
        _filledDoorCutoutPath(),
      );
      canvas.drawPath(
        fillPath,
        Paint()
          ..color = color
          ..style = PaintingStyle.fill,
      );
      canvas.drawPath(housePath, strokePaint);
    } else {
      canvas.drawPath(_outlineDoorPath(), strokePaint);
      canvas.drawPath(housePath, strokePaint);
    }

    canvas.restore();
  }

  static Path _housePath() {
    return Path()
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
      ..arcToPoint(
        const Offset(21, 10),
        radius: const Radius.elliptical(2, 2),
      )
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
  }

  static Path _filledDoorCutoutPath() {
    return Path()
      ..moveTo(9.5, 21)
      ..relativeLineTo(0, -8)
      ..relativeArcToPoint(
        const Offset(0.5, -0.5),
        radius: const Radius.elliptical(0.5, 0.5),
      )
      ..relativeLineTo(4, 0)
      ..relativeArcToPoint(
        const Offset(0.5, 0.5),
        radius: const Radius.elliptical(0.5, 0.5),
      )
      ..relativeLineTo(0, 8)
      ..close();
  }

  static Path _outlineDoorPath() {
    return Path()
      ..moveTo(15, 21)
      ..relativeLineTo(0, -8)
      ..relativeArcToPoint(
        const Offset(-1, -1),
        radius: const Radius.elliptical(1, 1),
        clockwise: false,
      )
      ..relativeLineTo(-4, 0)
      ..relativeArcToPoint(
        const Offset(-1, 1),
        radius: const Radius.elliptical(1, 1),
        clockwise: false,
      )
      ..relativeLineTo(0, 8);
  }

  @override
  bool shouldRepaint(covariant _HomeNavigationSvgIconPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.isFilled != isFilled;
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
