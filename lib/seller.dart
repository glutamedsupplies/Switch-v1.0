// =============================================================================
// SELLER PAGE - Seller Profile and Products Display
// =============================================================================
// This file implements the SellerPage widget which displays a seller's profile
// information and their product listings. Users can view seller details, follow
// the seller, and message them through this page.
// =============================================================================

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:gms_shopping/chat_support.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/login_redirect.dart';
import 'package:gms_shopping/models/product.dart';
import 'package:gms_shopping/services/product_repository.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:gms_shopping/product_details.dart';
import 'package:gms_shopping/widgets/product_card.dart';

// =============================================================================
// SellerPage Widget
// =============================================================================
// A StatefulWidget that displays a seller's profile and their product catalog.
// Users can follow/unfollow sellers and initiate chat conversations.
// =============================================================================
class SellerPage extends StatefulWidget {
  // Creates a SellerPage with the seller's admin ID and optional initial name.
  // The adminId is required to identify the seller and fetch their data.
  const SellerPage({
    super.key,
    required this.adminId,
    this.initialName,
  });

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
    // Load locally cached follow preference
    _loadPrefs();
    // Fetch seller profile from API
    _loadSellerProfile();
    // Check if user is following this seller
    _loadFollowState();
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
    final isFollowing =
        keyFollow == null ? false : prefs.getBool(keyFollow) ?? false;
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
          });
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
    if (Platform.isAndroid) {
      return 'http://192.168.100.225:8080';
    }
    return 'http://127.0.0.1:8080';
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
  ImageProvider? _buildSellerImageProvider() {
    final pic = _resolveSellerImageUrl(_sellerPicture);
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
        final followed =
            data['followed'] is bool ? data['followed'] as bool : next;
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
      await openChatSupportPage(
        context,
        product: chatProduct,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      AppSnackBar.showError(
        context,
        message: 'Unable to open chat right now.',
      );
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
    final sellerImageProvider = _buildSellerImageProvider();
    return Scaffold(
      appBar: AppBar(
        title: Text(nameToShow),
        centerTitle: true,
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
            // =================================================================
            // Company Profile Section
            // =================================================================
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              child: Column(
                children: [
                  // Company Logo/Picture - Circular avatar with fallback to initials
                  Container(
                    width: 78,
                    height: 78,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: theme.colorScheme.primary.withOpacity(0.12),
                    ),
                    child: ClipOval(
                      child: sellerImageProvider != null
                          ? Image(
                              image: sellerImageProvider,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) =>
                                  _buildInitials(nameToShow),
                            )
                          : _buildInitials(nameToShow),
                    ),
                  ),
                  const SizedBox(height: 10),
                  // Stats Grid - Rating, Reviews, Followers
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: theme.cardColor,
                      borderRadius: BorderRadius.circular(12),
                      border: theme.brightness == Brightness.dark
                          ? Border.all(
                              color: Colors.white.withOpacity(0.10),
                            )
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        // Rating stat with star icon
                        _buildStatItem(
                          context,
                          Icons.star_rounded,
                          Colors.amber[700]!,
                          _sellerRating.toStringAsFixed(1),
                          'Rating',
                        ),
                        _buildDivider(),
                        // Reviews stat with review icon
                        _buildStatItem(
                          context,
                          Icons.rate_review_rounded,
                          theme.colorScheme.primary,
                          '$_sellerComments',
                          'Reviews',
                        ),
                        _buildDivider(),
                        // Followers stat with people icon
                        _buildStatItem(
                          context,
                          Icons.people_rounded,
                          theme.colorScheme.secondary,
                          '$_sellerFollowerCount',
                          'Followers',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  // Action Buttons - Follow and Message
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Follow/Unfollow button
                      SizedBox(
                        width: 132,
                        child: ElevatedButton.icon(
                          onPressed: _toggleFollow,
                          icon: Icon(
                            _isFollowing ? Icons.check : Icons.add,
                            size: 18,
                          ),
                          label: Text(
                            _isFollowing ? 'Following' : 'Follow',
                            style: const TextStyle(height: 1),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isFollowing
                                ? Colors.grey[300]
                                : theme.colorScheme.primary,
                            foregroundColor: _isFollowing
                                ? Colors.black87
                                : Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Message seller button
                      SizedBox(
                        width: 132,
                        child: OutlinedButton.icon(
                          onPressed: _handleMessageTap,
                          icon: const Icon(Icons.message_rounded, size: 18),
                          label: const Text(
                            'Message',
                            style: TextStyle(height: 1),
                          ),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
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
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }

                    // Error state - show error message if fetch failed
                    if (snapshot.hasError) {
                      return Padding(
                        padding: const EdgeInsets.all(40),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
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

                    // Success state - display products in a 2-column grid
                    // Each product card shows company identity (name + picture)
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisExtent: 322,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: products.length,
                      itemBuilder: (context, index) {
                        final p = products[index];
                        // Enrich product with seller identity if not already set
                        final cardProduct = p.copyWith(
                          companyName: p.companyName.trim().isNotEmpty
                              ? p.companyName
                              : nameToShow,
                          companyPictureUrl:
                              p.companyPictureUrl.trim().isNotEmpty
                                  ? p.companyPictureUrl
                                  : _sellerPicture,
                        );
                        return ProductCard(
                          p: cardProduct,
                          onTapWithHero: (heroTag) => openProductDetailsPage(
                            context,
                            p,
                            heroTag: heroTag,
                          ),
                          showCompanyIdentity: true,
                        );
                      },
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
  // _buildStatItem
  // =============================================================================
  // Reusable widget for displaying a single stat item in the stats row.
  // Parameters:
  //   - icon: The icon to display (e.g., star, review, people)
  //   - iconColor: Color of the icon
  //   - value: The numeric/stat value to display (e.g., "4.5", "120")
  //   - label: Descriptive label below the value (e.g., "Rating", "Reviews")
  // =============================================================================
  Widget _buildStatItem(
    BuildContext context,
    IconData icon,
    Color iconColor,
    String value,
    String label,
  ) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(height: 3),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                height: 1,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color:
                    Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                height: 1,
              ),
        ),
      ],
    );
  }

  // =============================================================================
  // _buildDivider
  // =============================================================================
  // Vertical divider line (1px wide, 32px tall) used to visually separate
  // stat items in the stats row.
  // =============================================================================
  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 32,
      color: Colors.grey[300],
    );
  }
}
