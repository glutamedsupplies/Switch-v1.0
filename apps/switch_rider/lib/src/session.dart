import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:switch_core/switch_core.dart';

import 'models.dart';
import 'rider_api.dart';

enum SessionPhase { loading, signedOut, signedIn }

/// Owns the rider session token (kept in secure storage) and the rider profile.
class RiderSession extends ChangeNotifier {
  RiderSession({String? baseUrl, FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage() {
    api = RiderApi(
      SwitchApiClient(
        baseUrl: baseUrl ?? resolveSwitchApiBaseUrl(),
        readSessionToken: () => _token,
        onUnauthorized: (_) => _expire(),
      ),
    );
  }

  static const _tokenKey = 'switch_rider_session';

  final FlutterSecureStorage _storage;
  late final RiderApi api;

  SessionPhase phase = SessionPhase.loading;
  RiderProfile? profile;
  RiderMeta? meta;
  String? notice;
  String? _token;

  Future<void> init() async {
    unawaited(loadMeta());
    try {
      _token = await _storage.read(key: _tokenKey);
    } catch (_) {
      _token = null;
    }
    if (_token == null || _token!.isEmpty) {
      _setPhase(SessionPhase.signedOut);
      return;
    }
    try {
      profile = await api.me();
      _setPhase(SessionPhase.signedIn);
    } on SwitchApiException catch (error) {
      if (error.isUnauthorized || error.statusCode == 403) {
        await _clear();
        _setPhase(SessionPhase.signedOut);
      } else {
        // Keep the token when offline; the home screen retries.
        notice = error.message;
        _setPhase(SessionPhase.signedOut);
      }
    }
  }

  Future<RiderMeta?> loadMeta() async {
    if (meta != null) return meta;
    try {
      meta = await api.meta();
      notifyListeners();
    } on SwitchApiException {
      meta = null;
    }
    return meta;
  }

  Future<void> login(String mobileNumber, String password) async {
    final result = await api.login(
      mobileNumber: mobileNumber,
      password: password,
    );
    await _start(result);
  }

  Future<void> register(Map<String, dynamic> payload) async {
    final result = await api.register(payload);
    await _start(result);
  }

  Future<RiderSocialAuthResult> continueWithSocial(
    RiderSocialCredential credential,
  ) async {
    final result = await api.socialAuth(credential);
    if (result.auth != null) await _start(result.auth!);
    return result;
  }

  Future<void> _start(RiderAuthResult result) async {
    _token = result.sessionToken;
    await _storage.write(key: _tokenKey, value: _token);
    profile = result.rider;
    notice = null;
    unawaited(loadMeta());
    _setPhase(SessionPhase.signedIn);
  }

  Future<RiderProfile?> refreshProfile() async {
    if (phase != SessionPhase.signedIn) return null;
    try {
      profile = await api.me();
      notifyListeners();
    } on SwitchApiException catch (error) {
      if (error.statusCode == 403) {
        notice = error.message;
        await _clear();
        _setPhase(SessionPhase.signedOut);
      }
    }
    return profile;
  }

  void updateProfile(RiderProfile next) {
    profile = next;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await api.logout();
    } on SwitchApiException {
      // Signing out locally is enough; the token expires on its own.
    }
    await _clear();
    _setPhase(SessionPhase.signedOut);
  }

  void _expire() {
    if (phase != SessionPhase.signedIn) return;
    notice = 'Your session expired. Please sign in again.';
    _clear();
    _setPhase(SessionPhase.signedOut);
  }

  Future<void> _clear() async {
    _token = null;
    profile = null;
    try {
      await _storage.delete(key: _tokenKey);
    } catch (_) {
      // Storage failures shouldn't block sign-out.
    }
  }

  void _setPhase(SessionPhase next) {
    phase = next;
    notifyListeners();
  }
}
