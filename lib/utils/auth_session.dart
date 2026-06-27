import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Centralized session management for the currently logged-in account.
///
/// All stores should use [accountId] to build per-account storage keys.
/// When no account is logged in (guest mode), [accountId] returns `null`.
class AuthSession {
  AuthSession._();

  static const String _accountIdKey = 'accountId';
  static const String _accountEmailKey = 'accountEmail';
  static const String _accountNameKey = 'accountName';

  /// Notifier for synchronous login state checking.
  /// Use [isLoggedInSync] getter for sync checks, or [isLoggedIn] for async.
  static final ValueNotifier<bool> isLoggedInNotifier = ValueNotifier<bool>(false);

  /// Synchronous check if user is logged in (uses cached value).
  static bool get isLoggedInSync => isLoggedInNotifier.value;

  /// Async check if user is logged in (reads from SharedPreferences).
  /// Alias for the existing [isLoggedIn] method.
  static Future<bool> isLoggedInAsync() async {
    return await isLoggedIn();
  }

  /// Loads the login state from SharedPreferences and updates the notifier.
  /// Call this at app startup.
  static Future<void> ensureLoaded() async {
    final isCurrentlyLoggedIn = await isLoggedIn();
    if (isLoggedInNotifier.value != isCurrentlyLoggedIn) {
      isLoggedInNotifier.value = isCurrentlyLoggedIn;
    }
  }

  // ---------------------------------------------------------------------------
  // Account ID
  // ---------------------------------------------------------------------------

  /// Returns the stored account ID, or `null` when in guest mode.
  static Future<String?> getAccountId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accountIdKey);
  }

  /// Persists the account ID so every store can reference it.
  static Future<void> setAccountId(String? accountId) async {
    final prefs = await SharedPreferences.getInstance();
    if (accountId == null || accountId.trim().isEmpty) {
      await prefs.remove(_accountIdKey);
      if (isLoggedInSync) {
        isLoggedInNotifier.value = false;
      }
    } else {
      await prefs.setString(_accountIdKey, accountId.trim());
      if (!isLoggedInSync) {
        isLoggedInNotifier.value = true;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Profile helpers
  // ---------------------------------------------------------------------------

  static Future<String?> getAccountEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accountEmailKey);
  }

  static Future<void> setAccountEmail(String? email) async {
    final prefs = await SharedPreferences.getInstance();
    if (email == null || email.trim().isEmpty) {
      await prefs.remove(_accountEmailKey);
    } else {
      await prefs.setString(_accountEmailKey, email.trim());
      final savedAccountId = prefs.getString(_accountIdKey)?.trim() ?? '';
      if (savedAccountId.isEmpty && !isLoggedInSync) {
        isLoggedInNotifier.value = true;
      }
    }
  }

  static Future<String?> getAccountName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accountNameKey);
  }

  static Future<void> setAccountName(String? name) async {
    final prefs = await SharedPreferences.getInstance();
    if (name == null || name.trim().isEmpty) {
      await prefs.remove(_accountNameKey);
    } else {
      await prefs.setString(_accountNameKey, name.trim());
    }
  }

  // ---------------------------------------------------------------------------
  // Session helpers
  // ---------------------------------------------------------------------------

  /// `true` when a real account (not guest) is logged in.
  static Future<bool> isLoggedIn() async {
    final id = await getAccountId();
    if (id != null && id.trim().isNotEmpty) {
      return true;
    }

    final email = await getAccountEmail();
    return email != null && email.trim().isNotEmpty;
  }

  /// Clears **all** session-related keys from SharedPreferences.
  ///
  /// Call this on logout.  Individual stores are responsible for clearing
  /// their own per-account data — see [clearAllStores].
  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accountIdKey);
    await prefs.remove(_accountEmailKey);
    await prefs.remove(_accountNameKey);
    if (isLoggedInSync) {
      isLoggedInNotifier.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk clear — called on logout
  // ---------------------------------------------------------------------------

  /// One-time migration: removes old **global** (non-per-account) keys that
  /// were used before per-account isolation was implemented.
  ///
  ///
  /// Call this once at app startup.
  static Future<void> migrateOldGlobalData() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().toList(growable: false);

    // These are the old global key names (without account ID suffix).
    const oldGlobalKeys = <String>{
      'favorite_product_ids',
      'cart_items',
      'client_orders',
      'chat_support_threads',
      'chat_support_customer_id',
      'chat_support_storage_version',
      'recent_searches',
    };

    for (final key in keys) {
      if (oldGlobalKeys.contains(key)) {
        await prefs.remove(key);
      }
    }

    // Remove only legacy guest/test order keys. Keep real per-account orders.
    for (final key in keys) {
      final normalizedKey = key.toLowerCase();
      final isLegacyOrderKey = normalizedKey == 'client_orders_guest' ||
          normalizedKey.startsWith('client_orders_guest_') ||
          normalizedKey.startsWith('client_orders_guest-') ||
          normalizedKey.startsWith('client_orders_test_') ||
          normalizedKey.startsWith('client_orders_sample_') ||
          normalizedKey.startsWith('client_orders_anonymous_') ||
          normalizedKey.startsWith('client_orders_unknown_');
      if (isLegacyOrderKey) {
        await prefs.remove(key);
      }
    }
  }

  /// Removes every known per-account key so the next login starts fresh.
  ///
  /// This is intentionally aggressive: it removes keys matching the patterns
  /// used by FavoriteProductsStore, CartStore, OrderStore, ChatSupportStore,
  /// and the search bar.  If you add a new store, add its key prefix here.
  static Future<void> clearAllStores() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().toList(growable: false);

    const perAccountPrefixes = <String>[
      'favorite_product_ids_',
      'cart_items_',
      'client_orders_',
      'chat_support_threads_',
      'chat_support_customer_id_',
      'chat_support_storage_version_',
      'recent_searches_',
      // Profile keys (stored by profile.dart)
      'profile_first_name',
      'profile_last_name',
      'profile_email',
      'profile_phone',
      'profile_address',
      'profile_image',
    ];

    for (final key in keys) {
      final shouldRemove = perAccountPrefixes
          .any((prefix) => key.startsWith(prefix));
      if (shouldRemove) {
        await prefs.remove(key);
      }
    }

    await clearSession();
  }
}
