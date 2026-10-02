import 'package:switch_app/services/ai_assistant_transport_base.dart';

import 'ai_assistant_transport_stub.dart'
    if (dart.library.io) 'ai_assistant_transport_io.dart'
    if (dart.library.html) 'ai_assistant_transport_web.dart' as transport;

export 'ai_assistant_transport_base.dart';

AiAssistantTransport createAiAssistantTransport() =>
    transport.createAiAssistantTransport();
