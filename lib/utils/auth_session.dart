import 'dart:convert';

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
  static const String _activeModeKey = 'activeMode';
  static const String _activeCompanyIdKey = 'activeCompanyId';
  static const String _availableModesKey = 'availableModes';

  /// Notifier for synchronous login state checking.
  /// Use [isLoggedInSync] getter for sync checks, or [isLoggedIn] for async.
  static final ValueNotifier<bool> isLoggedInNotifier = ValueNotifier<bool>(false);
  static final ValueNotifier<String> activeModeNotifier =
      ValueNotifier<String>('buyer');
  static final ValueNotifier<int> accountRevision = ValueNotifier<int>(0);

  static void notifyAccountChanged() {
    accountRevision.value = accountRevision.value + 1;
  }

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
    final savedMode = await getActiveMode();
    if (activeModeNotifier.value != savedMode) {
      activeModeNotifier.value = savedMode;
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
    notifyAccountChanged();
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
    notifyAccountChanged();
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

  static Future<String> getActiveMode() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_activeModeKey)?.trim().toLowerCase() ?? '';
    if (saved.isEmpty) {
      return 'buyer';
    }
    return saved;
  }

  static Future<void> setActiveMode(String? mode) async {
    final prefs = await SharedPreferences.getInstance();
    final normalized = mode?.trim().toLowerCase() ?? '';
    final nextMode = normalized.isEmpty ? 'buyer' : normalized;
    await prefs.setString(_activeModeKey, nextMode);
    if (activeModeNotifier.value != nextMode) {
      activeModeNotifier.value = nextMode;
    }
  }

  static Future<String?> getActiveCompanyId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_activeCompanyIdKey);
  }

  static Future<void> setActiveCompanyId(String? companyId) async {
    final prefs = await SharedPreferences.getInstance();
    final normalized = companyId?.trim() ?? '';
    if (normalized.isEmpty) {
      await prefs.remove(_activeCompanyIdKey);
    } else {
      await prefs.setString(_activeCompanyIdKey, normalized);
    }
  }

  static Future<List<String>> getAvailableModes() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_availableModesKey)?.trim() ?? '';
    if (raw.isEmpty) {
      return const ['buyer'];
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        final modes = decoded
            .map((item) => item.toString().trim().toLowerCase())
            .where((item) => item.isNotEmpty)
            .toSet()
            .toList(growable: false);
        return modes.isEmpty ? const ['buyer'] : modes;
      }
    } catch (_) {
      // Ignore corrupt session metadata and fall back safely.
    }
    return const ['buyer'];
  }

  static Future<void> setAvailableModes(List<String> modes) async {
    final prefs = await SharedPreferences.getInstance();
    final normalized = modes
        .map((item) => item.trim().toLowerCase())
        .where((item) => item.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final nextModes = normalized.isEmpty ? const ['buyer'] : normalized;
    await prefs.setString(_availableModesKey, jsonEncode(nextModes));
  }

  static Future<bool> hasMode(String mode) async {
    final normalized = mode.trim().toLowerCase();
    if (normalized.isEmpty) {
      return false;
    }
    final modes = await getAvailableModes();
    return modes.contains(normalized);
  }

  static Future<void> setUnifiedSession(Map<String, dynamic>? session) async {
    final normalizedSession = session ?? const <String, dynamic>{};
    final account = normalizedSession['account'];
    final accountMap = account is Map<String, dynamic>
        ? account
        : account is Map
            ? Map<String, dynamic>.from(account)
            : const <String, dynamic>{};

    String pick(Map<String, dynamic> source, List<String> keys) {
      for (final key in keys) {
        final value = source[key]?.toString().trim() ?? '';
        if (value.isNotEmpty) {
          return value;
        }
      }
      return '';
    }

    final accountId = pick(accountMap, const [
      'id',
      'accountId',
      'accountCode',
      'userId',
      'uid',
    ]);
    final email = pick(accountMap, const ['email', 'accountEmail']);
    final displayName = pick(accountMap, const [
      'name',
      'displayName',
      'fullName',
    ]);
    final firstName = pick(accountMap, const ['firstName', 'first_name']);
    final lastName = pick(accountMap, const ['lastName', 'last_name']);
    final phone = pick(accountMap, const [
      'mobileNumber',
      'phone',
      'phoneNumber',
    ]);
    final profileImageUrl = pick(accountMap, const [
      'profileImageUrl',
      'avatarUrl',
      'photoUrl',
      'pictureUrl',
      'imageUrl',
    ]);
    final resolvedName = displayName.isNotEmpty
        ? displayName
        : [firstName, lastName].where((value) => value.isNotEmpty).join(' ');
    final activeMode =
        normalizedSession['activeMode']?.toString().trim().toLowerCase() ??
            '';
    final activeCompanyId =
        normalizedSession['activeCompanyId']?.toString().trim() ?? '';
    final availableModesRaw = normalizedSession['availableModes'];
    final availableModes = availableModesRaw is List
        ? availableModesRaw
            .map((item) => item.toString().trim().toLowerCase())
            .where((item) => item.isNotEmpty)
            .toList(growable: false)
        : const <String>['buyer'];

    await setAccountId(accountId.isNotEmpty ? accountId : email);
    await setAccountEmail(email);
    await setAccountName(resolvedName);
    await setAvailableModes(availableModes);
    await setActiveMode(activeMode);
    await setActiveCompanyId(activeCompanyId);
    notifyAccountChanged();

    // Keep the customer app profile aligned with the same account record used
    // by Super Admin User Data.
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile_first_name', firstName);
    await prefs.setString('profile_last_name', lastName);
    await prefs.setString('profile_email', email);
    await prefs.setString('profile_phone', phone);
    await prefs.setString('profile_image_url', profileImageUrl);
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
    await prefs.remove(_activeModeKey);
    await prefs.remove(_activeCompanyIdKey);
    await prefs.remove(_availableModesKey);
    // Profile identity must not survive logout — otherwise the next session
    // (or guest shell) can briefly/wrongly show the previous account email.
    await prefs.remove('profile_first_name');
    await prefs.remove('profile_last_name');
    await prefs.remove('profile_email');
    await prefs.remove('profile_phone');
    await prefs.remove('profile_image_url');
    await prefs.remove('profile_image');
    await prefs.remove('profile_address');
    if (isLoggedInSync) {
      isLoggedInNotifier.value = false;
    }
    if (activeModeNotifier.value != 'buyer') {
      activeModeNotifier.value = 'buyer';
    }
    notifyAccountChanged();
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
