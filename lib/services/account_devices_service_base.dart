class AccountDevice {
  const AccountDevice({
    required this.id,
    required this.deviceKey,
    required this.deviceType,
    required this.deviceName,
    required this.osName,
    required this.clientName,
    required this.clientKind,
    this.locationLabel = '',
    this.lastActiveAt,
    this.createdAt,
    this.isCurrent = false,
  });

  final String id;
  final String deviceKey;
  final String deviceType;
  final String deviceName;
  final String osName;
  final String clientName;
  final String clientKind;
  final String locationLabel;
  final String? lastActiveAt;
  final String? createdAt;
  final bool isCurrent;

  bool get isPhone => deviceType == 'phone';
  bool get isTablet => deviceType == 'tablet';
  bool get isComputer => deviceType == 'computer' || (!isPhone && !isTablet);
  bool get isApp => clientKind == 'app';

  String get subtitle {
    final parts = <String>[];
    if (clientName.trim().isNotEmpty) parts.add(clientName.trim());
    if (osName.trim().isNotEmpty &&
        osName.trim().toLowerCase() != deviceName.trim().toLowerCase()) {
      parts.add(osName.trim());
    }
    return parts.join(' · ');
  }

  factory AccountDevice.fromJson(Map<String, dynamic> json) {
    return AccountDevice(
      id: (json['id'] ?? '').toString(),
      deviceKey: (json['deviceKey'] ?? '').toString(),
      deviceType: (json['deviceType'] ?? 'computer').toString(),
      deviceName: (json['deviceName'] ?? 'Device').toString(),
      osName: (json['osName'] ?? '').toString(),
      clientName: (json['clientName'] ?? 'Unknown').toString(),
      clientKind: (json['clientKind'] ?? 'browser').toString(),
      locationLabel: (json['locationLabel'] ?? '').toString(),
      lastActiveAt: json['lastActiveAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
      isCurrent: json['isCurrent'] == true,
    );
  }
}

class DeviceSessionStatus {
  const DeviceSessionStatus({
    required this.active,
    required this.known,
    this.forgetRemember = false,
  });

  final bool active;
  final bool known;
  final bool forgetRemember;

  factory DeviceSessionStatus.fromJson(Map<String, dynamic> json) {
    return DeviceSessionStatus(
      active: json['active'] != false,
      known: json['known'] == true,
      forgetRemember: json['forgetRemember'] == true,
    );
  }
}

class AccountDevicesResult {
  const AccountDevicesResult({
    required this.devices,
    this.message = '',
    this.currentDevice,
  });

  final List<AccountDevice> devices;
  final String message;
  final AccountDevice? currentDevice;
}

abstract class AccountDevicesService {
  Future<Map<String, String>> collectCurrentDevicePayload();

  Future<AccountDevicesResult> registerAndList({
    required String accountId,
    String email = '',
    bool reactivate = false,
  });

  Future<DeviceSessionStatus?> currentDeviceStatus({
    required String accountId,
    String email = '',
  });

  Future<AccountDevicesResult> listDevices({
    required String accountId,
  });

  Future<AccountDevicesResult> revokeDevice({
    required String accountId,
    required String deviceId,
    String deviceKey = '',
  });

  Future<AccountDevicesResult> revokeOtherDevices({
    required String accountId,
  });
}
