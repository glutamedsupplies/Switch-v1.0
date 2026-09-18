import 'dart:async';

import 'package:flutter/material.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'workspace_theme_sync_stub.dart'
    if (dart.library.io) 'workspace_theme_sync_io.dart' as fetch;

/// Keeps the Flutter light-mode primary color in sync with Super Admin's
/// `/api/workspace-theme` workspace color picker.
class WorkspaceThemeSync {
  WorkspaceThemeSync._();

  static final WorkspaceThemeSync instance = WorkspaceThemeSync._();

  static const String _cacheKey = 'gms_workspace_color';
  static const Duration _pollInterval = Duration(seconds: 2);
  static const Duration _requestTimeout = Duration(seconds: 6);

  final ValueNotifier<Color> primaryColor = ValueNotifier(appPrimaryColor);

  Timer? _pollTimer;
  bool _started = false;
  bool _fetchInFlight = false;
  String _lastHex = '';

  Color get color => primaryColor.value;

  Future<void> ensureStarted() async {
    if (_started) {
      return;
    }
    _started = true;
    await _restoreCachedColor();
    unawaited(refresh(force: true));
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      unawaited(refresh());
    });
  }

  void stop() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _started = false;
  }

  Future<void> refresh({bool force = false}) async {
    if (_fetchInFlight && !force) {
      return;
    }
    _fetchInFlight = true;
    try {
      final hex = await fetch.fetchWorkspaceColorHex(
        timeout: _requestTimeout,
      );
      if (hex == null || hex.isEmpty) {
        return;
      }
      await _applyHex(hex);
    } catch (error, stackTrace) {
      debugPrint('WorkspaceThemeSync refresh failed: $error\n$stackTrace');
    } finally {
      _fetchInFlight = false;
    }
  }

  Future<void> _restoreCachedColor() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(_cacheKey);
      if (cached == null || cached.isEmpty) {
        return;
      }
      await _applyHex(cached, persist: false);
    } catch (_) {
      // Keep the default primary until the server responds.
    }
  }

  Future<void> _applyHex(String raw, {bool persist = true}) async {
    final hex = normalizeWorkspaceColorHex(raw);
    if (hex == null) {
      return;
    }
    if (hex == _lastHex) {
      return;
    }

    final color = colorFromWorkspaceHex(hex);
    if (color == null) {
      return;
    }

    _lastHex = hex;
    if (primaryColor.value != color) {
      primaryColor.value = color;
    }

    if (!persist) {
      return;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, hex);
    } catch (_) {
      // Color is still applied for this session.
    }
  }
}

String? normalizeWorkspaceColorHex(String? value) {
  final normalized = (value ?? '').trim().toLowerCase();
  if (RegExp(r'^#[0-9a-f]{6}$').hasMatch(normalized)) {
    return normalized;
  }
  if (RegExp(r'^[0-9a-f]{6}$').hasMatch(normalized)) {
    return '#$normalized';
  }
  return null;
}

Color? colorFromWorkspaceHex(String? value) {
  final hex = normalizeWorkspaceColorHex(value);
  if (hex == null) {
    return null;
  }
  final encoded = int.tryParse(hex.substring(1), radix: 16);
  if (encoded == null) {
    return null;
  }
  return Color(0xFF000000 | encoded);
}
