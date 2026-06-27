import 'package:gms_shopping/services/order_sync_base.dart';

import 'order_sync_stub.dart'
    if (dart.library.io) 'order_sync_io.dart'
    if (dart.library.html) 'order_sync_web.dart' as service;

export 'order_sync_base.dart';

OrderSyncService createOrderSyncService({String? baseUrl}) {
  return service.createOrderSyncService(baseUrl: baseUrl);
}
