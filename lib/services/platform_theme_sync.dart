import 'package:flutter/material.dart';
import 'package:gms_shopping/services/workspace_theme_sync.dart';

/// Overrides the global workspace accent while a buyer platform is open.
class PlatformThemeSync {
  PlatformThemeSync._();

  static final PlatformThemeSync instance = PlatformThemeSync._();

  final ValueNotifier<Color?> primaryOverride = ValueNotifier<Color?>(null);

  void setPlatformPrimaryHex(String? hex) {
    final color = colorFromWorkspaceHex(hex);
    if (primaryOverride.value == color) {
      return;
    }
    primaryOverride.value = color;
  }

  void clear() {
    if (primaryOverride.value == null) {
      return;
    }
    primaryOverride.value = null;
  }
}
