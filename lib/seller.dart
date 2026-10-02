// =============================================================================
// SELLER PAGE - Seller Profile and Products Display
// =============================================================================
// This file implements the SellerPage widget which displays a seller's profile
// information and their product listings. Users can view seller details, follow
// the seller, and message them through this page.
// =============================================================================

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:switch_app/chat_support.dart';
import 'package:switch_app/guest_session.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';
import 'package:switch_app/widgets/home_voucher_carousel.dart';
import 'package:switch_app/widgets/lucide_share_icon.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/own_listing.dart';
import 'package:switch_app/main.dart' show ShopListingGrid;
import 'package:switch_app/widgets/report_seller_sheet.dart';
import 'package:switch_app/services/company_report_service.dart';
import 'package:switch_app/utils/share_links.dart';

// =============================================================================
// SellerPage Widget
// =============================================================================
// A StatefulWidget that displays a seller's profile and their product catalog.
// Users can follow/unfollow sellers and initiate chat conversations.
// =============================================================================
class SellerPage extends StatefulWidget {
  // Creates a SellerPage with the seller's admin ID and optional initial name.
  // The adminId is required to identify the seller and fetch their data.
  const SellerPage({super.key, required this.adminId, this.initialName});

  // Unique identifier for the seller (admin account ID)
  final String adminId;
  // Optional display name for the seller (used as fallback if API name unavailable)
  final String? initialName;

  @override
  State<SellerPage> createState() => _SellerPageState();
}

// =============================================================================
// _SellerPageState
// =============================================================================
// Manages the state for the SellerPage widget, including seller profile data,
// follow status, and product listings.
// =============================================================================
class _SellerPageState extends State<SellerPage> {
  // Future that holds the list of products from this seller
  // Initialized once in initState and shared across rebuilds
  late final Future<List<Product>> _productsFuture;

  // Whether the current user is following this seller
  bool _isFollowing = false;
  // True when this seller dashboard belongs to the signed-in user's company.
  bool _isOwnCompany = false;
  bool _ownCompanyResolved = false;
  // Reporting stays hidden until the buyer has ordered from this store.
  bool _reportEligible = false;
  // URL or base64-encoded image data for the seller's profile picture
  String _sellerPicture = '';
  // Average rating of the seller based on their products
  double _sellerRating = 0.0;
  // Total number of reviews/comments for all seller products
  int _sellerComments = 0;
  // Number of users following this seller
  int _sellerFollowerCount = 0;
  // Cached seller name to avoid repeated API calls
  String _sellerNameCached = '';
  String _sellerCompanyId = '';
  // Company cover/background photo shown behind the profile header
  String _sellerBackground = '';
  String _sellerStoreType = '';
  bool _sellerVerified = false;
  int _sellerProductCount = 0;

  // Returns true if the current user is in guest mode (not logged in)
  bool get _isGuestMode => GuestSession.isGuest && !AuthSession.isLoggedInSync;

  // =============================================================================
  // initState
  // =============================================================================
  // Initializes the state by loading seller products, preferences, profile,
  // and follow status from the server.
  // =============================================================================
  @override
  void initState() {
    super.initState();
    // Load products from this seller
    _productsFuture = _loadSellerProducts();
    // Fetch seller profile from API
    _loadSellerProfile();
    // Own-company check first so Follow/Message never flash for self-view.
    _resolveOwnCompany();
  }

  Future<void> _resolveOwnCompany() async {
    if (_isGuestMode) {
      if (!mounted) return;
      setState(() {
        _isOwnCompany = false;
        _ownCompanyResolved = true;
        _reportEligible = false;
      });
      return;
    }

    final scope = await loadOwnListingScope();
    if (!mounted) return;

    final isOwn = listingBelongsToOwnCompany(
      scope: scope,
      adminId: widget.adminId,
      companyId: _sellerCompanyId,
      companyName: widget.initialName ?? _sellerNameCached,
    );
    setState(() {
      _isOwnCompany = isOwn;
      _ownCompanyResolved = true;
    });

    if (isOwn) {
      return;
    }

    unawaited(_refreshReportEligibility());
    // Only load follow state for other companies.
    await _loadPrefs();
    await _loadFollowState();
  }

  Future<void> _refreshReportEligibility() async {
    final result = await createCompanyReportService()
        .checkSellerReportEligibility(
          adminId: widget.adminId,
          companyId: _sellerCompanyId,
        );
    if (!mounted) return;
    setState(() {
      _reportEligible = result.eligible;
    });
  }

  Future<void> _openReportSeller(String companyName) async {
    await openReportSellerSheet(
      context,
      adminId: widget.adminId,
      companyId: _sellerCompanyId,
      companyName: companyName,
    );
    if (mounted) {
      unawaited(_refreshReportEligibility());
    }
  }

  // =============================================================================
  // _loadPrefs
  // =============================================================================
  // Loads the locally cached follow preference from SharedPreferences.
  // This provides instant UI feedback before the API responds.
  // =============================================================================
  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final keyFollow = await _followPreferenceKey();
    // Default to not following if no preference is stored
    final isFollowing = keyFollow == null
        ? false
        : prefs.getBool(keyFollow) ?? false;
    if (!mounted) {
      return;
    }

    setState(() {
      _isFollowing = isFollowing;
    });
  }

  // =============================================================================
  // _loadSellerProfile
  // =============================================================================
  // Fetches the seller's profile information from the backend API.
  // Retrieves profile picture, rating, comment count, and follower count.
  // =============================================================================
  Future<void> _loadSellerProfile() async {
    try {
      final baseUrl = _getBaseUrl();
      // Encode adminId to handle special characters in URL
      final uri = Uri.parse(
        '$baseUrl/api/sellers/${Uri.encodeComponent(widget.adminId)}/profile',
      );
      final client = HttpClient();
      final req = await client.getUrl(uri);
      // Set account headers for authentication
      await _setAccountHeaders(req.headers);
      final resp = await req.close();
      final body = await resp.transform(utf8.decoder).join();
      if (resp.statusCode == 200) {
        final data = jsonDecode(body) as Map<String, dynamic>;
        if (mounted) {
          setState(() {
            // Try multiple possible field names for the profile picture
            final pic = _resolveSellerImageUrl(
              data['companyPictureUrl'] ??
                  data['profileImageUrl'] ??
                  data['pictureUrl'] ??
                  '',
            );
            if (pic.isNotEmpty) _sellerPicture = pic;
            final background = _resolveSellerImageUrl(
              data['companyBackgroundUrl'] ??
                  data['backgroundUrl'] ??
                  data['coverImageUrl'] ??
                  '',
            );
            if (background.isNotEmpty) _sellerBackground = background;
            _sellerStoreType = (data['storeType'] ?? '').toString().trim();
            _sellerVerified = data['verified'] == true;
            final productCount = (data['productCount'] as num?)?.toInt();
            if (productCount != null) _sellerProductCount = productCount;
            // Parse rating with fallback to 0
            _sellerRating = (data['rating'] as num?)?.toDouble() ?? 0;
            // Parse comment count with fallback to 0
            _sellerComments = (data['commentCount'] as num?)?.toInt() ?? 0;
            // Try multiple possible field names for follower count
            _sellerFollowerCount =
                (data['followersCount'] as num?)?.toInt() ??
                (data['followerCount'] as num?)?.toInt() ??
                0;
            // Cache the seller name
            final name = (data['name'] as String?) ?? '';
            if (name.isNotEmpty) _sellerNameCached = name;
            final companyId = (data['companyId'] ?? data['company_id'] ?? '')
                .toString()
                .trim();
            if (companyId.isNotEmpty) _sellerCompanyId = companyId;
          });
          if (_sellerCompanyId.isNotEmpty && !_isOwnCompany) {
            await _resolveOwnCompany();
          }
        }
      }
      client.close();
    } catch (_) {
      // Silently fail - UI will use cached/default values
    }
  }

  // =============================================================================
  // _getBaseUrl
  // =============================================================================
  // Returns the appropriate base URL for API calls based on the platform.
  // Android uses the local network IP, other platforms use localhost.
  // =============================================================================
  String _getBaseUrl() {
    return buildLocalApiBaseUrls(isAndroid: Platform.isAndroid).first;
  }

  // =============================================================================
  // _resolveSellerImageUrl
  // =============================================================================
  // Normalizes seller image URLs to absolute URLs.
  // Handles relative paths by prepending the base URL.
  // =============================================================================
  String _resolveSellerImageUrl(Object? value) {
    final imageUrl = value?.toString().trim() ?? '';
    // Return as-is if already empty, base64, or absolute URL
    if (imageUrl.isEmpty ||
        imageUrl.startsWith('data:') ||
        imageUrl.startsWith('http://') ||
        imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Prepend base URL for relative paths
    if (imageUrl.startsWith('/')) {
      return '${_getBaseUrl()}$imageUrl';
    }

    return imageUrl;
  }

  // =============================================================================
  // _buildSellerImageProvider
  // =============================================================================
  // Creates an ImageProvider for the seller's profile picture.
  // Supports both network images and base64-encoded data URLs.
  // Returns null if no picture is available.
  // =============================================================================
  ImageProvider? _buildSellerImageProvider() =>
      _buildImageProvider(_sellerPicture);

  ImageProvider? _buildImageProvider(String raw) {
    final pic = _resolveSellerImageUrl(raw);
    if (pic.isEmpty) return null;
    // Handle base64 data URLs
    if (pic.startsWith('data:')) {
      final comma = pic.indexOf(',');
      if (comma != -1) {
        try {
          final bytes = base64Decode(pic.substring(comma + 1));
          return MemoryImage(Uint8List.fromList(bytes));
        } catch (_) {
          return null;
        }
      }
    }
    return NetworkImage(pic);
  }

  // =============================================================================
  // _getAccountId
  // =============================================================================
  // Retrieves the current user's account ID from the auth session.
  // =============================================================================
  Future<String?> _getAccountId() async {
    return AuthSession.getAccountId();
  }

  // =============================================================================
  // _getAccountEmail
  // =============================================================================
  // Retrieves the current user's email from the auth session.
  // Used as fallback identification if account ID is unavailable.
  // =============================================================================
  Future<String?> _getAccountEmail() async {
    return AuthSession.getAccountEmail();
  }

  // Legacy preference key format (kept for backward compatibility)
  String get _legacyFollowPreferenceKey => 'seller_follow_${widget.adminId}';

  // =============================================================================
  // _sellerPreferenceKeyPart
  // =============================================================================
  // Generates a URL-encoded part of the follow preference key based on seller ID.
  // Used to create unique preference keys for each seller.
  // =============================================================================
  String _sellerPreferenceKeyPart() {
    final sellerId = widget.adminId.trim();
    return Uri.encodeComponent(sellerId.isEmpty ? 'unknown-seller' : sellerId);
  }

  // =============================================================================
  // _currentAccountPreferenceKeyPart
  // =============================================================================
  // Generates a URL-encoded part of the preference key based on the current
  // user's account. Uses account ID first, then falls back to email.
  // Returns null if no account information is available.
  // =============================================================================
  Future<String?> _currentAccountPreferenceKeyPart() async {
    final accountId = (await _getAccountId())?.trim() ?? '';
    if (accountId.isNotEmpty) {
      return Uri.encodeComponent(accountId.toLowerCase());
    }

    final accountEmail = (await _getAccountEmail())?.trim() ?? '';
    if (accountEmail.isNotEmpty) {
      return Uri.encodeComponent(accountEmail.toLowerCase());
    }

    return null;
  }

  // =============================================================================
  // _followPreferenceKey
  // =============================================================================
  // Constructs the full SharedPreferences key for storing follow status.
  // Format: seller_follow_{sellerId}_{accountIdOrEmail}
  // Returns null if no account information is available.
  // =============================================================================
  Future<String?> _followPreferenceKey() async {
    final accountKey = await _currentAccountPreferenceKeyPart();
    if (accountKey == null) {
      return null;
    }

    return 'seller_follow_${_sellerPreferenceKeyPart()}_$accountKey';
  }

  // =============================================================================
  // _setAccountHeaders
  // =============================================================================
  // Sets authentication headers for HTTP requests.
  // Includes X-GMS-Account-Id and X-GMS-Account-Email headers.
  // =============================================================================
  Future<void> _setAccountHeaders(HttpHeaders headers) async {
    final accountId = (await _getAccountId())?.trim() ?? '';
    final accountEmail = (await _getAccountEmail())?.trim() ?? '';

    if (accountId.isNotEmpty) {
      headers.set('X-GMS-Account-Id', accountId);
    }
    if (accountEmail.isNotEmpty) {
      headers.set('X-GMS-Account-Email', accountEmail);
    }
  }

  // =============================================================================
  // _readJsonMap
  // =============================================================================
  // Reads and parses JSON from an HTTP response.
  // Returns an empty map if the response body is empty or invalid.
  // =============================================================================
  Future<Map<String, dynamic>> _readJsonMap(HttpClientResponse response) async {
    final body = await response.transform(utf8.decoder).join();
    if (body.trim().isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(body);
    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }

  // =============================================================================
  // _loadFollowState
  // =============================================================================
  // Fetches the current follow status from the server API.
  // Updates local SharedPreferences with the server state.
  // =============================================================================
  Future<void> _loadFollowState() async {
    try {
      final accountId = (await _getAccountId())?.trim() ?? '';
      final accountEmail = (await _getAccountEmail())?.trim() ?? '';
      // Skip if no account info (guest user)
      if (accountId.isEmpty && accountEmail.isEmpty) {
        return;
      }

      final baseUrl = _getBaseUrl();
      final uri = Uri.parse(
        '$baseUrl/api/sellers/${Uri.encodeComponent(widget.adminId)}/is-followed',
      );
      final client = HttpClient();
      final req = await client.getUrl(uri);
      await _setAccountHeaders(req.headers);
      final resp = await req.close();
      final data = await _readJsonMap(resp);
      client.close();

      if (resp.statusCode == 200 && mounted) {
        final followed = data['followed'] == true;
        final prefs = await SharedPreferences.getInstance();
        final keyFollow = await _followPreferenceKey();
        if (keyFollow != null) {
          await prefs.setBool(keyFollow, followed);
        }
        // Remove legacy preference key
        await prefs.remove(_legacyFollowPreferenceKey);
        if (mounted) {
          setState(() => _isFollowing = followed);
        }
      }
    } catch (_) {
      // Silently fail - UI will use cached/default values
    }
  }

  // =============================================================================
  // _toggleFollow
  // =============================================================================
  // Toggles the follow status of the current seller.
  // Shows error message if user is not logged in.
  // Updates both server and local storage.
  // =============================================================================
  Future<void> _toggleFollow() async {
    if (_isOwnCompany) {
      return;
    }
    try {
      final accountId = (await _getAccountId())?.trim() ?? '';
      final accountEmail = (await _getAccountEmail())?.trim() ?? '';
      // Require login to follow sellers
      if (accountId.isEmpty && accountEmail.isEmpty) {
        if (mounted) {
          AppSnackBar.showError(
            context,
            message: 'Please login to follow sellers.',
          );
        }
        return;
      }
      // Determine the new follow state
      final next = !_isFollowing;
      final baseUrl = _getBaseUrl();
      // Use appropriate endpoint based on action (follow or unfollow)
      final uri = Uri.parse(
        '$baseUrl/api/sellers/${Uri.encodeComponent(widget.adminId)}/${next ? 'follow' : 'unfollow'}',
      );
      final client = HttpClient();
      final req = await client.postUrl(uri);
      await _setAccountHeaders(req.headers);
      final resp = await req.close();
      final data = await _readJsonMap(resp);
      client.close();
      // Check for successful response (200 or 201 Created)
      if (resp.statusCode == 200 || resp.statusCode == 201) {
        // Get followed state from response, fallback to optimistic update
        final followed = data['followed'] is bool
            ? data['followed'] as bool
            : next;
        // Get updated follower count from server
        final serverFollowersCount = (data['followersCount'] as num?)?.toInt();
        final prefs = await SharedPreferences.getInstance();
        final keyFollow = await _followPreferenceKey();
        if (keyFollow != null) {
          await prefs.setBool(keyFollow, followed);
        }
        // Remove legacy preference key
        await prefs.remove(_legacyFollowPreferenceKey);
        if (mounted) {
          setState(() {
            _isFollowing = followed;
            // Calculate fallback follower count if server didn't provide it
            final fallbackFollowersCount =
                (_sellerFollowerCount + (followed ? 1 : -1))
                    .clamp(0, 1 << 31)
                    .toInt();
            // Use server count if available, otherwise calculate locally
            _sellerFollowerCount =
                serverFollowersCount ?? fallbackFollowersCount;
          });
        }
      } else {
        // Show error message from server or generic fallback
        if (mounted) {
          AppSnackBar.showError(
            context,
            message: data['message']?.toString().trim().isNotEmpty == true
                ? data['message'].toString()
                : 'Unable to ${next ? 'follow' : 'unfollow'} seller.',
          );
        }
      }
    } catch (_) {
      if (mounted) {
        AppSnackBar.showError(
          context,
          message: 'Unable to update follower count.',
        );
      }
    }
  }

  // =============================================================================
  // _handleMessageTap
  // =============================================================================
  // Opens the chat support page with the seller.
  // Redirects guests to login first.
  // Uses the first product from the seller to establish the chat context.
  // =============================================================================
  Future<void> _handleMessageTap() async {
    if (_isOwnCompany) {
      return;
    }
    // Redirect guests to login
    if (_isGuestMode) {
      await redirectGuestToLogin(context);
      return;
    }

    try {
      final products = await _productsFuture;
      if (!mounted) {
        return;
      }

      // Require at least one product to start a chat
      if (products.isEmpty) {
        AppSnackBar.showInfo(
          context,
          message: 'No seller product is available to start a chat.',
        );
        return;
      }

      // Determine seller name (cached > initialName > adminId)
      final sellerName = _sellerNameCached.trim().isNotEmpty
          ? _sellerNameCached.trim()
          : (widget.initialName?.trim().isNotEmpty == true
                ? widget.initialName!.trim()
                : widget.adminId.trim());
      final product = products.first;
      // Ensure product has seller identity for chat display
      final chatProduct = product.copyWith(
        companyName: product.companyName.trim().isNotEmpty
            ? product.companyName
            : sellerName,
        companyPictureUrl: product.companyPictureUrl.trim().isNotEmpty
            ? product.companyPictureUrl
            : _sellerPicture,
      );

      // Open the chat support page
      await openChatSupportPage(context, product: chatProduct);
    } catch (_) {
      if (!mounted) {
        return;
      }

      AppSnackBar.showError(context, message: 'Unable to open chat right now.');
    }
  }

  // =============================================================================
  // _loadSellerProducts
  // =============================================================================
  // Fetches all products from the product repository and filters by seller ID.
  // Also aggregates seller statistics (rating, comments) from products.
  // =============================================================================
  Future<List<Product>> _loadSellerProducts() async {
    final repo = createProductRepository();
    final products = await repo.fetchProducts();
    // Filter products by matching adminId (case-insensitive)
    final target = widget.adminId.trim().toLowerCase();
    final filtered = products
        .where((p) => p.adminId.trim().toLowerCase() == target)
        .toList(growable: false);
    // Update seller info from first product if available
    if (filtered.isNotEmpty && mounted) {
      final p = filtered.first;
      setState(() {
        // Use product's company picture if available
        final companyPictureUrl = _resolveSellerImageUrl(p.companyPictureUrl);
        if (companyPictureUrl.isNotEmpty) {
          _sellerPicture = companyPictureUrl;
        }
        _sellerProductCount = filtered.length;
        // Aggregate rating and comments from all products
        _sellerRating = _aggregateSellerRating(filtered);
        _sellerComments = _aggregateSellerComments(filtered);
        // Use product's company name as seller name
        _sellerNameCached = p.companyName.trim().isNotEmpty
            ? p.companyName.trim()
            : (widget.initialName ?? widget.adminId);
      });
    } else if (mounted) {
      // Fallback to initial name if no products found
      setState(() {
        _sellerNameCached = widget.initialName ?? widget.adminId;
      });
    }

    return filtered;
  }

  // =============================================================================
  // _aggregateSellerRating
  // =============================================================================
  // Calculates the weighted average rating across all seller products.
  // Uses ratingPoints/ratingCount for precision when available.
  // =============================================================================
  double _aggregateSellerRating(List<Product> products) {
    var totalRatingPoints = 0.0;
    var totalRatingCount = 0;

    for (final product in products) {
      // Use pre-calculated rating points if available
      if (product.ratingCount > 0) {
        totalRatingPoints += product.ratingPoints > 0
            ? product.ratingPoints
            : product.rating * product.ratingCount;
        totalRatingCount += product.ratingCount;
      } else if (product.rating > 0) {
        // Fallback to simple rating for products without count
        totalRatingPoints += product.rating;
        totalRatingCount += 1;
      }
    }

    if (totalRatingCount <= 0) {
      return 0;
    }

    return totalRatingPoints / totalRatingCount;
  }

  // =============================================================================
  // _aggregateSellerComments
  // =============================================================================
  // Sums up the total comment count across all seller products.
  // Uses the larger of commentCount or reviewComments.length.
  // =============================================================================
  int _aggregateSellerComments(List<Product> products) {
    var totalComments = 0;
    for (final product in products) {
      totalComments += product.commentCount > product.reviewComments.length
          ? product.commentCount
          : product.reviewComments.length;
    }
    return totalComments;
  }

  // =============================================================================
  // build
  // =============================================================================
  // Main UI builder for the Seller Page.
  // Displays seller profile, stats, action buttons, and product grid.
  // =============================================================================
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Determine the seller name to display (cached > initialName > adminId)
    final nameToShow = _sellerNameCached.isNotEmpty
        ? _sellerNameCached
        : (widget.initialName ?? widget.adminId);
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        automaticallyImplyLeading: false,
        leading: Padding(
          padding: const EdgeInsets.all(8),
          child: _buildCoverIconButton(
            icon: Icons.arrow_back_rounded,
            tooltip: 'Back',
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildProfileHeader(context, nameToShow),
              Divider(
                height: 1,
                thickness: 1,
                color: theme.colorScheme.outlineVariant.withOpacity(0.5),
              ),
              HomeVoucherCarousel(
                platformId: '',
                sellerAdminId: widget.adminId,
                title: 'Company Vouchers',
                backgroundColor: theme.scaffoldBackgroundColor,
                titleColor: theme.colorScheme.onSurface,
                secondaryColor: theme.colorScheme.onSurfaceVariant,
                primaryColor: theme.colorScheme.primary,
              ),
              // =============================================================================
              // Products Section Header
              // =================================================================
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Row(
                  children: [
                    Icon(
                      Icons.inventory_2_rounded,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Products',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              // =================================================================
              // Products Grid
              // Uses FutureBuilder to asynchronously load products from _productsFuture.
              // Shows loading spinner, error message, or empty state as needed.
              // =================================================================
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: FutureBuilder<List<Product>>(
                  future: _productsFuture,
                  builder: (context, snapshot) {
                    // Loading state - show spinner while fetching products
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.all(40),
                        child: const SkeletonProductGrid(count: 6),
                      );
                    }

                    // Error state - show error message if fetch failed
                    if (snapshot.hasError) {
                      return Padding(
                        padding: const EdgeInsets.all(40),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(
                                Icons.error_outline,
                                size: 48,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 12),
                              const Text('Unable to load seller products.'),
                            ],
                          ),
                        ),
                      );
                    }

                    // Empty state - show message when seller has no products
                    final products = snapshot.data ?? const <Product>[];
                    if (products.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(40),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(
                                Icons.inventory_2_outlined,
                                size: 48,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 12),
                              const Text('No products found for this seller.'),
                            ],
                          ),
                        ),
                      );
                    }

                    // Success state - Shop-style 2-column grid; each card
                    // shows company identity (name + picture).
                    return ShopListingGrid(
                      products: [
                        for (final p in products)
                          p.copyWith(
                            companyName: p.companyName.trim().isNotEmpty
                                ? p.companyName
                                : nameToShow,
                            companyPictureUrl:
                                p.companyPictureUrl.trim().isNotEmpty
                                ? p.companyPictureUrl
                                : _sellerPicture,
                          ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  // =============================================================================
  // _buildInitials
  // =============================================================================
  // Displays the first letter of the seller's name as a fallback
  // when no profile picture is available.
  // =============================================================================
  Widget _buildInitials(String name) {
    return Center(
      child: Text(
        name.isNotEmpty ? name.characters.first.toUpperCase() : '',
        style: const TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w700,
          height: 1,
        ),
      ),
    );
  }

  // =============================================================================
  // Profile header (cover photo + overlapping avatar)
  // =============================================================================
  static const double _coverBaseHeight = 150;
  static const double _avatarSize = 96;

  Widget _buildProfileHeader(BuildContext context, String name) {
    final theme = Theme.of(context);
    final coverHeight = _coverBaseHeight + MediaQuery.paddingOf(context).top;
    final isVisitor = _ownCompanyResolved && !_isOwnCompany;
    final mutedColor = theme.colorScheme.onSurfaceVariant;
    final subtitleParts = <String>[
      _sellerStoreType.isNotEmpty ? _sellerStoreType : 'Company store',
      _sellerVerified ? 'Verified seller' : 'Seller on Switch',
    ];

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(height: coverHeight, child: _buildCover(theme)),
            SizedBox(
              height: _avatarSize / 2 + 4,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (widget.adminId.trim().isNotEmpty)
                    IconButton(
                      tooltip: 'Copy store link',
                      onPressed: _copyStoreLink,
                      icon: Icon(Icons.link_rounded, color: mutedColor),
                    ),
                  if (isVisitor && _reportEligible)
                    _buildMoreMenu(context, name),
                  const SizedBox(width: 4),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (_sellerRating > 0) ...[
                        const SizedBox(width: 6),
                        Icon(
                          Icons.star_rounded,
                          size: 20,
                          color: Colors.amber[600],
                        ),
                        const SizedBox(width: 2),
                        Text(
                          _sellerRating.toStringAsFixed(1),
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      for (var i = 0; i < subtitleParts.length; i++) ...[
                        if (i > 0)
                          Container(
                            width: 1,
                            height: 12,
                            margin: const EdgeInsets.symmetric(horizontal: 8),
                            color: theme.colorScheme.outlineVariant,
                          ),
                        Flexible(
                          child: Text(
                            subtitleParts[i],
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: mutedColor,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _buildHeaderStat(
                        context,
                        'Followers',
                        _sellerFollowerCount,
                      ),
                      const SizedBox(width: 32),
                      _buildHeaderStat(
                        context,
                        'Products',
                        _sellerProductCount,
                      ),
                      const SizedBox(width: 32),
                      _buildHeaderStat(context, 'Reviews', _sellerComments),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      // Follow / Message only for other companies — never for own.
                      if (isVisitor) ...[
                        _buildHeaderButton(
                          context,
                          icon: _isFollowing
                              ? Icons.check_rounded
                              : Icons.person_add_alt_1_outlined,
                          label: _isFollowing ? 'Following' : 'Follow',
                          active: _isFollowing,
                          onPressed: _toggleFollow,
                        ),
                        _buildHeaderButton(
                          context,
                          icon: Icons.chat_bubble_outline_rounded,
                          label: 'Message',
                          onPressed: _handleMessageTap,
                        ),
                      ],
                      if (widget.adminId.trim().isNotEmpty)
                        Builder(
                          builder: (buttonContext) => _buildHeaderButton(
                            buttonContext,
                            iconWidget: const LucideShareIcon(size: 18),
                            label: 'Share',
                            onPressed: () => shareCompanyLink(
                              buttonContext,
                              adminId: widget.adminId,
                              companyName: name,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        Positioned(
          left: 16,
          top: coverHeight - _avatarSize / 2,
          child: _buildAvatar(theme, name),
        ),
      ],
    );
  }

  Widget _buildCover(ThemeData theme) {
    final provider = _buildImageProvider(_sellerBackground);
    final fallback = _buildCoverFallback(theme);
    return Stack(
      fit: StackFit.expand,
      children: [
        if (provider != null)
          Image(
            image: provider,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => fallback,
          )
        else
          fallback,
        // Keeps the status bar and back button legible on bright photos.
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.center,
              colors: [Color(0x59000000), Color(0x00000000)],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCoverFallback(ThemeData theme) {
    final primary = theme.colorScheme.primary;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [primary, Color.lerp(primary, Colors.black, 0.35)!],
        ),
      ),
      child: Center(
        child: Padding(
          padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final icon in const [
                Icons.north_east_rounded,
                Icons.south_east_rounded,
                Icons.south_west_rounded,
                Icons.north_west_rounded,
              ])
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Icon(
                    icon,
                    size: 40,
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(ThemeData theme, String name) {
    final provider = _buildSellerImageProvider();
    return SizedBox(
      width: _avatarSize,
      height: _avatarSize,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: _avatarSize,
            height: _avatarSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Color.alphaBlend(
                theme.colorScheme.primary.withOpacity(0.12),
                theme.colorScheme.surface,
              ),
              border: Border.all(
                color: theme.scaffoldBackgroundColor,
                width: 4,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.12),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipOval(
              child: provider != null
                  ? Image(
                      image: provider,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _buildInitials(name),
                    )
                  : _buildInitials(name),
            ),
          ),
          if (_sellerVerified)
            Positioned(
              right: 0,
              bottom: 2,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: theme.scaffoldBackgroundColor,
                ),
                padding: const EdgeInsets.all(2),
                child: const Icon(
                  Icons.verified_rounded,
                  size: 24,
                  color: Color(0xFF2E90FA),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCoverIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return Material(
      color: Colors.black.withOpacity(0.32),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        padding: EdgeInsets.zero,
        icon: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _buildMoreMenu(BuildContext context, String name) {
    final theme = Theme.of(context);
    return PopupMenuButton<String>(
      tooltip: 'More',
      icon: Icon(
        Icons.more_horiz_rounded,
        color: theme.colorScheme.onSurfaceVariant,
      ),
      onSelected: (value) {
        if (value == 'report') _openReportSeller(name);
      },
      itemBuilder: (_) => const [
        PopupMenuItem<String>(
          value: 'report',
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.flag_outlined),
            title: Text('Report seller'),
          ),
        ),
      ],
    );
  }

  Future<void> _copyStoreLink() async {
    await Clipboard.setData(
      ClipboardData(text: companyShareUrl(widget.adminId)),
    );
    if (!mounted) return;
    AppSnackBar.showSuccess(context, message: 'Store link copied.');
  }

  Widget _buildHeaderStat(BuildContext context, String label, int value) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          _compactCount(value),
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildHeaderButton(
    BuildContext context, {
    IconData? icon,
    Widget? iconWidget,
    required String label,
    required VoidCallback? onPressed,
    bool active = false,
  }) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: iconWidget ?? Icon(icon, size: 18),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: active ? scheme.primary : scheme.onSurface,
        backgroundColor: active
            ? scheme.primary.withOpacity(0.08)
            : scheme.surface,
        side: BorderSide(
          color: active
              ? scheme.primary.withOpacity(0.45)
              : scheme.outlineVariant,
        ),
        minimumSize: const Size(0, 38),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        textStyle: theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  String _compactCount(int value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(value >= 10000000 ? 0 : 1)}M';
    }
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(value >= 10000 ? 0 : 1)}K';
    }
    return '$value';
  }
}
