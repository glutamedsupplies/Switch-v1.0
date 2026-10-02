import 'package:switch_app/services/switch_rider_service_base.dart';

import 'switch_rider_service_stub.dart'
    if (dart.library.io) 'switch_rider_service_io.dart'
    as service;

export 'switch_rider_service_base.dart';

SwitchRiderService createSwitchRiderService() =>
    service.createSwitchRiderService();
