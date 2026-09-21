import 'package:switch_app/services/account_devices_service_base.dart';

AccountDevicesService createAccountDevicesService() =>
    const _UnsupportedAccountDevicesService();

class _UnsupportedAccountDevicesService implements AccountDevicesService {
  const _UnsupportedAccountDevicesService();

  Never get _unsupported =>
      throw Exception('Account devices are unavailable on this platform.');

  @override
  Future<Map<String, String>> collectCurrentDevicePayload() async =>
      _unsupported;

  @override
  Future<AccountDevicesResult> registerAndList({
    required String accountId,
    String email = '',
    bool reactivate = false,
  }) async =>
      _unsupported;

  @override
  Future<DeviceSessionStatus?> currentDeviceStatus({
    required String accountId,
    String email = '',
  }) async =>
      null;

  @override
  Future<AccountDevicesResult> listDevices({
    required String accountId,
  }) async =>
      _unsupported;

  @override
  Future<AccountDevicesResult> revokeDevice({
    required String accountId,
    required String deviceId,
    String deviceKey = '',
  }) async =>
      _unsupported;

  @override
  Future<AccountDevicesResult> revokeOtherDevices({
    required String accountId,
  }) async =>
      _unsupported;
}
