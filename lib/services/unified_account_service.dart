import 'package:gms_shopping/services/unified_account_service_base.dart';

import 'unified_account_service_stub.dart'
    if (dart.library.io) 'unified_account_service_io.dart' as service;

export 'unified_account_service_base.dart';

UnifiedAccountService createUnifiedAccountService() =>
    service.createUnifiedAccountService();
