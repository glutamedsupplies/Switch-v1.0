import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:gms_shopping/l10n/app_login_languages.dart';
import 'package:gms_shopping/services/preferred_language_sync.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Guest + per-account language preference.
///
/// Guest / pre-auth uses [AppLoginLanguages.storageKey].
/// Signed-in accounts also keep `gms-account-language_<accountId>`.
/// Creating an account seeds from the current guest language and never
/// forces English over a saved choice.
class AppLanguagePreference {
  AppLanguagePreference._();

  static const String _accountKeyPrefix = 'gms-account-language_';

  static final ValueNotifier<String> codeNotifier = ValueNotifier<String>('en');

  static String get code => AppLoginLanguages.normalize(codeNotifier.value);

  static String accountStorageKey(String accountId) =>
      '$_accountKeyPrefix${accountId.trim()}';

  static Future<void> ensureLoaded() async {
    final prefs = await SharedPreferences.getInstance();
    final accountId = ((await AuthSession.getAccountId()) ?? '').trim();
    String resolved;
    if (accountId.isNotEmpty) {
      final accountSaved = prefs.getString(accountStorageKey(accountId));
      if (accountSaved != null && accountSaved.trim().isNotEmpty) {
        resolved = AppLoginLanguages.normalize(accountSaved);
      } else {
        resolved = AppLoginLanguages.normalize(
          prefs.getString(AppLoginLanguages.storageKey),
        );
        await prefs.setString(accountStorageKey(accountId), resolved);
      }
    } else {
      resolved = AppLoginLanguages.normalize(
        prefs.getString(AppLoginLanguages.storageKey),
      );
    }
    if (codeNotifier.value != resolved) {
      codeNotifier.value = resolved;
    }
  }

  /// Guest / device language currently selected (before or without an account).
  static Future<String> getGuestLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    return AppLoginLanguages.normalize(
      prefs.getString(AppLoginLanguages.storageKey),
    );
  }

  /// Persist language for the current context (guest or signed-in account).
  static Future<String> setLanguage(
    String languageCode, {
    bool syncRemote = true,
  }) async {
    final next = AppLoginLanguages.normalize(languageCode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppLoginLanguages.storageKey, next);

    final accountId = ((await AuthSession.getAccountId()) ?? '').trim();
    if (accountId.isNotEmpty) {
      await prefs.setString(accountStorageKey(accountId), next);
      if (syncRemote) {
        unawaited(
          PreferredLanguageSync.update(
            accountId: accountId,
            preferredLanguage: next,
          ),
        );
      }
    }

    if (codeNotifier.value != next) {
      codeNotifier.value = next;
    }
    return next;
  }

  /// After login / create / session refresh: apply account language without
  /// resetting to English.
  ///
  /// - If [accountPreferredLanguage] is set → use it (server is source of truth).
  /// - Else → keep current guest language and seed it onto the account.
  static Future<String> applyForSignedInAccount({
    required String accountId,
    String? accountPreferredLanguage,
  }) async {
    final id = accountId.trim();
    final guest = await getGuestLanguage();
    final fromAccount = (accountPreferredLanguage ?? '').trim();
    final hasAccountLanguage = fromAccount.isNotEmpty;
    final next = AppLoginLanguages.normalize(
      hasAccountLanguage ? fromAccount : guest,
    );

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppLoginLanguages.storageKey, next);
    if (id.isNotEmpty) {
      await prefs.setString(accountStorageKey(id), next);
    }

    if (codeNotifier.value != next) {
      codeNotifier.value = next;
    }

    // Only seed when the account has no saved language yet.
    if (id.isNotEmpty && !hasAccountLanguage) {
      unawaited(
        PreferredLanguageSync.update(
          accountId: id,
          preferredLanguage: next,
        ),
      );
    }

    return next;
  }

  /// Pull language from a unified `/api/auth/session` payload.
  ///
  /// Call after every successful session refresh so web ↔ app stay aligned.
  static Future<String?> syncFromUnifiedSession(
    Map<String, dynamic>? session,
  ) async {
    if (session == null || session.isEmpty) return null;

    final accountRaw = session['account'];
    final accountMap = accountRaw is Map<String, dynamic>
        ? accountRaw
        : accountRaw is Map
            ? Map<String, dynamic>.from(accountRaw)
            : null;
    final source = accountMap ?? session;

    String pickId(Map<String, dynamic> map) {
      for (final key in const [
        'id',
        'accountId',
        'accountCode',
        'userId',
        'uid',
      ]) {
        final value = map[key]?.toString().trim() ?? '';
        if (value.isNotEmpty) return value;
      }
      return '';
    }

    var accountId = pickId(source);
    if (accountId.isEmpty && accountMap != null) {
      accountId = pickId(session);
    }
    if (accountId.isEmpty) {
      accountId = ((await AuthSession.getAccountId()) ?? '').trim();
    }
    if (accountId.isEmpty) return null;

    return applyForSignedInAccount(
      accountId: accountId,
      accountPreferredLanguage: preferredLanguageFromAccount(source),
    );
  }

  static String? preferredLanguageFromAccount(Map<String, dynamic>? account) {
    if (account == null) return null;
    for (final key in const [
      'preferredLanguage',
      'preferred_language',
      'language',
      'languageCode',
    ]) {
      final value = account[key];
      if (value == null) continue;
      final text = value.toString().trim();
      if (text.isNotEmpty) return text;
    }
    return null;
  }
}
