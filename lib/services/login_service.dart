import 'package:switch_app/services/login_service_base.dart';

import 'login_service_stub.dart'
    if (dart.library.io) 'login_service_io.dart' as service;

export 'login_service_base.dart';

/// Creates the login client for the current platform.
LoginService createLoginService() => service.createLoginService();
