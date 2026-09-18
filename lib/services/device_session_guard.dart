import 'dart:async';

import 'package:gms_shopping/chat_support.dart';
import 'package:gms_shopping/favorite_products_store.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/order_store.dart';
import 'package:gms_shopping/services/account_devices_service.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:gms_shopping/cart.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Logs this phone, computer, or Apple device out when it is signed out
/// from another trusted device, and clears the saved sign-in.
class DeviceSessionGuard {
  DeviceSessionGuard._();

  static Timer? _timer;
  static bool _checking = false;
  static Future<void> Function()? _onSignedOut;

  static void start({required Future<void> Function() onSignedOut}) {
    _onSignedOut = onSignedOut;
    _timer?.cancel();
    unawaited(checkOnce());
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      unawaited(checkOnce());
    });
  }

  static void stop() {
    _timer?.cancel();
    _timer = null;
    _onSignedOut = null;
  }

  static Future<bool> checkOnce() async {
    if (_checking) return false;
    _checking = true;
    try {
      if (!await AuthSession.isLoggedIn()) return false;
      final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
      final email = (await AuthSession.getAccountEmail())?.trim() ?? '';
      if (accountId.isEmpty && email.isEmpty) return false;

      final status = await createAccountDevicesService().currentDeviceStatus(
        accountId: accountId,
        email: email,
      );
      if (status == null || !status.known || status.active) return false;

      await _forgetLocalLogin();
      final callback = _onSignedOut;
      if (callback != null) {
        await callback();
      }
      return true;
    } catch (_) {
      return false;
    } finally {
      _checking = false;
    }
  }

  static Future<void> _forgetLocalLogin() async {
    await ChatSupportStore.instance.clearForLogout();
    await AuthSession.clearSession();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('profile_first_name');
    await prefs.remove('profile_last_name');
    await prefs.remove('profile_email');
    await GuestSession.continueAsGuest();
    await CartStore.instance.reloadForCurrentAccount();
    await FavoriteProductsStore.instance.reloadForCurrentAccount();
    await OrderStore.instance.reloadForCurrentAccount();
  }
}
