import 'package:gms_shopping/services/account_devices_service_base.dart';

import 'account_devices_service_stub.dart'
    if (dart.library.io) 'account_devices_service_io.dart' as service;

export 'account_devices_service_base.dart';

AccountDevicesService createAccountDevicesService() =>
    service.createAccountDevicesService();
