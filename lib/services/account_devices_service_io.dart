import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:switch_app/services/account_devices_service_base.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _deviceKeyPrefs = 'gms_account_device_key';
const _requestTimeout = Duration(seconds: 10);

AccountDevicesService createAccountDevicesService() =>
    const _IoAccountDevicesService();

class _IoAccountDevicesService implements AccountDevicesService {
  const _IoAccountDevicesService();

  String _timeZoneLabel() {
    final now = DateTime.now();
    final offset = now.timeZoneOffset;
    final sign = offset.isNegative ? '-' : '+';
    final hours = offset.inHours.abs().toString().padLeft(2, '0');
    final minutes = (offset.inMinutes.abs() % 60).toString().padLeft(2, '0');
    final zone = now.timeZoneName.trim();
    final utc = 'UTC$sign$hours:$minutes';
    return zone.isEmpty || zone.toUpperCase() == 'UTC' ? utc : '$zone ($utc)';
  }

  Future<String> _deviceKey() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_deviceKeyPrefs)?.trim() ?? '';
    if (existing.isNotEmpty) return existing;
    final seed = Random.secure().nextInt(1 << 32).toRadixString(16);
    final generated = 'app_${DateTime.now().millisecondsSinceEpoch}_$seed';
    await prefs.setString(_deviceKeyPrefs, generated);
    return generated;
  }

  Future<Map<String, String>> _platformDeviceInfo() async {
    final plugin = DeviceInfoPlugin();
    if (Platform.isAndroid) {
      final info = await plugin.androidInfo;
      final brand = info.brand.trim();
      final model = info.model.trim();
      final manufacturer = info.manufacturer.trim();
      String deviceName = '';
      if (brand.isNotEmpty &&
          model.isNotEmpty &&
          !model.toLowerCase().startsWith(brand.toLowerCase())) {
        deviceName = '$brand $model';
      } else if (model.isNotEmpty) {
        deviceName = model;
      } else if (brand.isNotEmpty) {
        deviceName = brand;
      } else if (manufacturer.isNotEmpty) {
        deviceName = manufacturer;
      }
      return {
        'deviceType': 'phone',
        'deviceName': deviceName.isEmpty ? 'Android phone' : deviceName,
        'osName': 'Android',
        'clientName': 'Switch App',
        'clientKind': 'app',
      };
    }
    if (Platform.isIOS) {
      final info = await plugin.iosInfo;
      final model = info.utsname.machine.trim();
      final name = info.name.trim();
      final isPad = info.model.toLowerCase().contains('ipad');
      return {
        'deviceType': isPad ? 'tablet' : 'phone',
        'deviceName': name.isNotEmpty
            ? name
            : (isPad ? 'iPad' : (model.isNotEmpty ? model : 'iPhone')),
        'osName': 'iOS',
        'clientName': 'Switch App',
        'clientKind': 'app',
      };
    }
    if (Platform.isWindows) {
      return {
        'deviceType': 'computer',
        'deviceName': 'Windows PC',
        'osName': 'Windows',
        'clientName': 'Switch App',
        'clientKind': 'app',
      };
    }
    if (Platform.isMacOS) {
      return {
        'deviceType': 'computer',
        'deviceName': 'Mac',
        'osName': 'macOS',
        'clientName': 'Switch App',
        'clientKind': 'app',
      };
    }
    if (Platform.isLinux) {
      return {
        'deviceType': 'computer',
        'deviceName': 'Linux PC',
        'osName': 'Linux',
        'clientName': 'Switch App',
        'clientKind': 'app',
      };
    }
    return {
      'deviceType': 'phone',
      'deviceName': 'Mobile device',
      'osName': Platform.operatingSystem,
      'clientName': 'Switch App',
      'clientKind': 'app',
    };
  }

  @override
  Future<Map<String, String>> collectCurrentDevicePayload() async {
    final info = await _platformDeviceInfo();
    final deviceKey = await _deviceKey();
    return {...info, 'deviceKey': deviceKey, 'locationLabel': _timeZoneLabel()};
  }

  Future<Map<String, dynamic>> _request({
    required String method,
    required String path,
    Map<String, dynamic>? payload,
    Map<String, String>? query,
  }) async {
    Object? lastError;
    for (final baseUrl in buildLocalApiBaseUrls(
      isAndroid: Platform.isAndroid,
    )) {
      HttpClientRequest? request;
      try {
        final uri = Uri.parse(
          '$baseUrl$path',
        ).replace(queryParameters: query?.isNotEmpty == true ? query : null);
        final client = HttpClient()..connectionTimeout = _requestTimeout;
        request = method == 'GET'
            ? await client.getUrl(uri).timeout(_requestTimeout)
            : await client.postUrl(uri).timeout(_requestTimeout);
        request.headers.set(HttpHeaders.acceptHeader, 'application/json');
        if (method != 'GET') {
          request.headers.set(
            HttpHeaders.contentTypeHeader,
            'application/json; charset=utf-8',
          );
          request.add(
            utf8.encode(jsonEncode(payload ?? const <String, dynamic>{})),
          );
        }
        final response = await request.close().timeout(_requestTimeout);
        final body = await response.transform(utf8.decoder).join();
        client.close(force: true);
        final decoded = body.trim().isEmpty
            ? <String, dynamic>{}
            : jsonDecode(body) as Map<String, dynamic>;
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw Exception(
            decoded['message']?.toString() ??
                'Request failed (${response.statusCode}).',
          );
        }
        rememberWorkingLocalApiBaseUrl(baseUrl);
        return decoded;
      } catch (error) {
        lastError = error;
        try {
          request?.abort();
        } catch (_) {}
      }
    }
    throw Exception(
      lastError?.toString() ?? 'Unable to reach account devices service.',
    );
  }

  AccountDevicesResult _parseResult(Map<String, dynamic> decoded) {
    final raw = decoded['devices'];
    final devices = <AccountDevice>[];
    if (raw is List) {
      for (final item in raw) {
        if (item is Map) {
          devices.add(AccountDevice.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }
    AccountDevice? current;
    final currentRaw = decoded['device'];
    if (currentRaw is Map) {
      current = AccountDevice.fromJson(Map<String, dynamic>.from(currentRaw));
    } else {
      for (final device in devices) {
        if (device.isCurrent) {
          current = device;
          break;
        }
      }
    }
    return AccountDevicesResult(
      devices: devices,
      message: decoded['message']?.toString() ?? '',
      currentDevice: current,
    );
  }

  @override
  Future<AccountDevicesResult> registerAndList({
    required String accountId,
    String email = '',
    bool reactivate = false,
  }) async {
    final payload = await collectCurrentDevicePayload();
    final decoded = await _request(
      method: 'POST',
      path: '/api/account/devices/register',
      payload: {
        'accountId': accountId.trim(),
        if (email.trim().isNotEmpty) 'email': email.trim(),
        if (reactivate) 'reactivate': true,
        ...payload,
      },
    );
    return _parseResult(decoded);
  }

  @override
  Future<DeviceSessionStatus?> currentDeviceStatus({
    required String accountId,
    String email = '',
  }) async {
    final deviceKey = await _deviceKey();
    if (deviceKey.trim().isEmpty) return null;
    try {
      final decoded = await _request(
        method: 'GET',
        path: '/api/account/devices/status',
        query: {
          'deviceKey': deviceKey,
          if (accountId.trim().isNotEmpty) 'accountId': accountId.trim(),
          if (email.trim().isNotEmpty) 'email': email.trim(),
        },
      );
      return DeviceSessionStatus.fromJson(decoded);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<AccountDevicesResult> listDevices({required String accountId}) async {
    final deviceKey = await _deviceKey();
    final decoded = await _request(
      method: 'GET',
      path: '/api/account/devices',
      query: {'accountId': accountId.trim(), 'deviceKey': deviceKey},
    );
    return _parseResult(decoded);
  }

  @override
  Future<AccountDevicesResult> revokeDevice({
    required String accountId,
    required String deviceId,
    String deviceKey = '',
  }) async {
    final currentKey = await _deviceKey();
    final decoded = await _request(
      method: 'POST',
      path: '/api/account/devices/revoke',
      payload: {
        'accountId': accountId.trim(),
        'deviceId': deviceId.trim(),
        if (deviceKey.trim().isNotEmpty) 'deviceKey': deviceKey.trim(),
        'keepDeviceKey': currentKey,
      },
    );
    return _parseResult(decoded);
  }

  @override
  Future<AccountDevicesResult> revokeOtherDevices({
    required String accountId,
  }) async {
    final currentKey = await _deviceKey();
    final decoded = await _request(
      method: 'POST',
      path: '/api/account/devices/revoke',
      payload: {
        'accountId': accountId.trim(),
        'revokeOthers': true,
        'keepDeviceKey': currentKey,
        'currentDeviceKey': currentKey,
      },
    );
    return _parseResult(decoded);
  }
}
