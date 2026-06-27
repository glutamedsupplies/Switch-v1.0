import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class GuestSession {
  GuestSession._();

  static const String _guestModeKey = 'guest_mode';
  static final ValueNotifier<bool> isGuestNotifier = ValueNotifier<bool>(false);

  static bool get isGuest => isGuestNotifier.value;

  static Future<void> ensureLoaded() async {
    final preferences = await SharedPreferences.getInstance();
    final isGuest = preferences.getBool(_guestModeKey) ?? false;
    if (isGuestNotifier.value != isGuest) {
      isGuestNotifier.value = isGuest;
    }
  }

  static Future<void> continueAsGuest() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_guestModeKey, true);
    if (!isGuestNotifier.value) {
      isGuestNotifier.value = true;
    }
  }

  static Future<void> clear() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_guestModeKey, false);
    if (isGuestNotifier.value) {
      isGuestNotifier.value = false;
    }
  }
}
