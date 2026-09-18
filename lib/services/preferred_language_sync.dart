import 'preferred_language_sync_stub.dart'
    if (dart.library.io) 'preferred_language_sync_io.dart'
    if (dart.library.html) 'preferred_language_sync_web.dart' as sync;

abstract final class PreferredLanguageSync {
  static Future<void> update({
    required String accountId,
    required String preferredLanguage,
  }) {
    return sync.updatePreferredLanguage(
      accountId: accountId,
      preferredLanguage: preferredLanguage,
    );
  }
}
