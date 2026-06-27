import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/login_service_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _defaultCurrentWifiBaseUrl = 'http://192.168.100.225:8080';
const _defaultAndroidUsbBaseUrl = 'http://127.0.0.1:8080';
const _defaultDesktopBaseUrl = 'http://127.0.0.1:8080';

LoginService createLoginService() {
  return _HttpLoginService(
    baseUrls: _buildBaseUrls(),
  );
}

List<String> _buildBaseUrls() {
  final urls = <String>[];

  void addUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty || urls.contains(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  // Priority: environment variable > WiFi IP > other fallbacks
  addUrl(_environmentBaseUrl);

  if (Platform.isAndroid) {
    addUrl(_defaultCurrentWifiBaseUrl);
    addUrl(_defaultAndroidUsbBaseUrl);
    addUrl(_defaultDesktopBaseUrl);
    addUrl('http://localhost:8080');
  } else {
    addUrl(_defaultDesktopBaseUrl);
    addUrl('http://localhost:8080');
  }

  return urls;
}

class _HttpLoginService implements LoginService {
  _HttpLoginService({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  final HttpClient _client = HttpClient();

  @override
  Future<LoginResult> loginWithEmail({
    required String email,
    required String password,
  }) async {
    final payload = jsonEncode(<String, dynamic>{
      'email': email.trim(),
      'password': password.trim(),
    });
    final failures = <String>[];

    for (final baseUrl in baseUrls) {
      try {
        final request = await _client.postUrl(
          Uri.parse('$baseUrl/api/accounts/login'),
        );
        request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        request.write(payload);

        final response = await request.close();
        final responseBody = await response.transform(utf8.decoder).join();
        final decoded = responseBody.isEmpty
            ? <String, dynamic>{}
            : jsonDecode(responseBody) as Map<String, dynamic>;

        if (response.statusCode == HttpStatus.ok) {
          // Parse account data from response
          final account = decoded['account'] as Map<String, dynamic>?;
          return LoginResult.success(account);
        }

        final message = decoded['message']?.toString() ?? 'Login failed.';
        failures.add('$baseUrl -> ${response.statusCode}: $message');
      } on SocketException {
        failures.add('$baseUrl -> SocketException');
      } on HttpException catch (e) {
        failures.add('$baseUrl -> HttpException: ${e.message}');
      } catch (e) {
        failures.add('$baseUrl -> $e');
      }
    }

    final lastFailure = failures.isNotEmpty ? failures.last : 'Connection failed.';
    return LoginResult.failure(
      lastFailure.replaceFirst(RegExp(r'^.*?-> '), ''),
    );
  }
}


