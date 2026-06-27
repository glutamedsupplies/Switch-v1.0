import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeModeStorage {
  static const String _themeModeKey = 'theme_mode';

  static Future<ThemeMode> loadThemeMode() async {
    return ThemeMode.system;
  }

  static Future<void> saveThemeMode(ThemeMode _) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_themeModeKey);
  }
}
