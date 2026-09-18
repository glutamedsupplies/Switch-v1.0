/// Local Switch backend URLs used by the Flutter app during development.
///
/// Supports both PC Wi-Fi and PC Ethernet (LAN) at the same time: the backend
/// rewrites [generatedLocalApiLanBaseUrls] on startup with every live IPv4.
///
/// On a USB-connected phone, `adb reverse tcp:8080 tcp:8080` makes
/// `http://127.0.0.1:8080` reach the PC. LAN/Wi-Fi IPs are extra fallbacks when
/// the phone shares that network with the PC.
import 'package:gms_shopping/services/generated_local_api_lan_urls.dart';

const localApiEnvironmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const localApiLoopbackBaseUrl = 'http://127.0.0.1:8080';
const localApiAndroidEmulatorBaseUrl = 'http://10.0.2.2:8080';

/// Manual fallbacks kept for older networks; live IPs come from generated file.
const localApiLanBaseUrls = <String>[
  'http://192.168.100.214:8080',
  'http://192.168.8.153:8080',
];

String? _preferredLocalApiBaseUrl;

/// Remembers the last backend URL that answered successfully so later calls
/// skip dead loopback/LAN candidates first.
void rememberWorkingLocalApiBaseUrl(String baseUrl) {
  final trimmed = baseUrl.trim();
  if (trimmed.isEmpty) {
    return;
  }
  _preferredLocalApiBaseUrl = trimmed;
}

Iterable<String> _environmentApiBaseUrls() {
  final raw = localApiEnvironmentBaseUrl.trim();
  if (raw.isEmpty) {
    return const <String>[];
  }
  // Allow: --dart-define=API_BASE_URL=http://a:8080,http://b:8080
  return raw
      .split(RegExp(r'[,;\s]+'))
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty);
}

List<String> buildLocalApiBaseUrls({
  String? baseUrl,
  required bool isAndroid,
}) {
  final urls = <String>[];

  void addUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty || urls.contains(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  addUrl(baseUrl);
  addUrl(_preferredLocalApiBaseUrl);
  for (final envUrl in _environmentApiBaseUrls()) {
    addUrl(envUrl);
  }

  addUrl(localApiLoopbackBaseUrl);
  if (isAndroid) {
    addUrl(localApiAndroidEmulatorBaseUrl);
  }

  // Wi-Fi + Ethernet (and any other live NIC) from last backend start.
  for (final lanUrl in generatedLocalApiLanBaseUrls) {
    addUrl(lanUrl);
  }
  for (final lanUrl in localApiLanBaseUrls) {
    addUrl(lanUrl);
  }

  addUrl('http://localhost:8080');

  return urls;
}
