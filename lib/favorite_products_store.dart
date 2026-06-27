import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:gms_shopping/utils/auth_session.dart';

class FavoriteProductsStore {
  FavoriteProductsStore._();

  static final FavoriteProductsStore instance = FavoriteProductsStore._();

  final ValueNotifier<List<String>> favoriteProductIdsNotifier =
      ValueNotifier<List<String>>(const <String>[]);

  bool _hasLoaded = false;
  String? _lastAccountId;
  String? _lastEmail;

  /// Force reload favorites for the current account.
  /// Call this after login/logout to ensure correct favorites are loaded.
  Future<void> reloadForCurrentAccount() async {
    _hasLoaded = false;
    _lastAccountId = null;
    _lastEmail = null;
    favoriteProductIdsNotifier.value = const <String>[];
    await ensureLoaded();
  }

  /// Builds the per-account storage key.
  /// Uses accountId if available, falls back to email hash for guests.
  /// This ensures each user (including guests) has their own favorites.
  Future<String> _resolveStorageKey() async {
    final accountId = await AuthSession.getAccountId();
    if (accountId != null && accountId.trim().isNotEmpty) {
      return 'favorite_product_ids_${accountId.trim()}';
    }
    // For guests, use email as fallback to ensure each guest session has its own favorites
    final email = await AuthSession.getAccountEmail();
    if (email != null && email.trim().isNotEmpty) {
      return 'favorite_product_ids_${email.trim().hashCode.abs()}';
    }
    // Final fallback: use a random guest identifier
    return 'favorite_product_ids_guest_${DateTime.now().millisecondsSinceEpoch}';
  }

  Future<void> ensureLoaded() async {
    final accountId = await AuthSession.getAccountId();
    final email = await AuthSession.getAccountEmail();
    final trimmedAccountId = accountId?.trim();
    final trimmedEmail = email?.trim();
    final lastTrimmedAccountId = _lastAccountId?.trim();
    final lastTrimmedEmail = _lastEmail?.trim();

    // If the account changed, clear favorites and reload with the new key.
    // This ensures each account has its own separate favorites.
    // Handle null comparisons properly - different null states mean different users
    final accountChanged = trimmedAccountId != lastTrimmedAccountId ||
        (trimmedAccountId == null) != (lastTrimmedAccountId == null);
    final emailChanged = trimmedEmail != lastTrimmedEmail ||
        (trimmedEmail == null) != (lastTrimmedEmail == null);

    if (_hasLoaded && (accountChanged || emailChanged)) {
      // Clear in-memory favorites first before reloading for new account
      favoriteProductIdsNotifier.value = const <String>[];
      _hasLoaded = false;
    }

    if (_hasLoaded) {
      return;
    }

    _lastAccountId = accountId;
    _lastEmail = email;

    final storageKey = await _resolveStorageKey();
    final preferences = await SharedPreferences.getInstance();
    final savedProductIds =
        preferences.getStringList(storageKey) ?? const <String>[];

    favoriteProductIdsNotifier.value =
        List<String>.unmodifiable(_normalizeFavoriteProductIds(savedProductIds));
    _hasLoaded = true;
  }

  bool isFavorite(String productId) {
    final normalizedProductId = productId.trim();
    if (normalizedProductId.isEmpty) {
      return false;
    }

    return favoriteProductIdsNotifier.value.contains(normalizedProductId);
  }

  Future<bool> toggleFavorite(String productId) async {
    await ensureLoaded();

    final normalizedProductId = productId.trim();
    if (normalizedProductId.isEmpty) {
      return false;
    }

    final nextFavoriteProductIds =
        List<String>.from(favoriteProductIdsNotifier.value);
    final existingIndex =
        nextFavoriteProductIds.indexOf(normalizedProductId);

    final isNowFavorite = existingIndex < 0;
    if (isNowFavorite) {
      nextFavoriteProductIds.insert(0, normalizedProductId);
    } else {
      nextFavoriteProductIds.removeAt(existingIndex);
    }

    final normalizedFavoriteProductIds =
        List<String>.unmodifiable(
      _normalizeFavoriteProductIds(nextFavoriteProductIds),
    );
    favoriteProductIdsNotifier.value = normalizedFavoriteProductIds;

    final storageKey = await _resolveStorageKey();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setStringList(
      storageKey,
      normalizedFavoriteProductIds,
    );

    return isNowFavorite;
  }

  List<String> _normalizeFavoriteProductIds(List<String> productIds) {
    final normalizedProductIds = <String>[];
    final seenProductIds = <String>{};

    for (final productId in productIds) {
      final normalizedProductId = productId.trim();
      if (normalizedProductId.isEmpty ||
          seenProductIds.contains(normalizedProductId)) {
        continue;
      }

      seenProductIds.add(normalizedProductId);
      normalizedProductIds.add(normalizedProductId);
    }

    return normalizedProductIds;
  }
}
