import 'package:switch_app/services/verification_service_base.dart';

import 'verification_service_stub.dart'
    if (dart.library.io) 'verification_service_io.dart' as verification;

export 'verification_service_base.dart';

VerificationService createVerificationService({String? baseUrl}) {
  return verification.createVerificationService(baseUrl: baseUrl);
}
