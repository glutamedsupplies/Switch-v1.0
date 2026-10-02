import 'package:flutter/foundation.dart';

const String _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');

/// Resolves the Switch backend URL.
///
/// Release builds must pass `--dart-define=API_BASE_URL=https://api.example.com`.
/// Debug builds fall back to the local backend (Android emulators reach the
/// host machine through 10.0.2.2).
String resolveSwitchApiBaseUrl() {
  final configured = _environmentBaseUrl.trim();
  if (configured.isNotEmpty) {
    return configured.endsWith('/')
        ? configured.substring(0, configured.length - 1)
        : configured;
  }
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:8080';
  }
  return 'http://127.0.0.1:8080';
}
