import 'package:switch_app/services/google_auth_service_base.dart';

import 'google_auth_service_stub.dart'
    if (dart.library.io) 'google_auth_service_io.dart' as google_auth;

export 'google_auth_service_base.dart';

GoogleAuthService createGoogleAuthService({String? baseUrl}) {
  return google_auth.createGoogleAuthService(baseUrl: baseUrl);
}
