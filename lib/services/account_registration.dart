import 'package:gms_shopping/services/account_registration_base.dart';

import 'account_registration_stub.dart'
    if (dart.library.io) 'account_registration_io.dart'
    if (dart.library.html) 'account_registration_web.dart' as registration;

export 'account_registration_base.dart';

AccountRegistrationService createAccountRegistrationService({String? baseUrl}) {
  return registration.createAccountRegistrationService(baseUrl: baseUrl);
}
