import 'package:switch_app/services/ai_assistant_transport_base.dart';

AiAssistantTransport createAiAssistantTransport() =>
    _UnsupportedAiAssistantTransport();

class _UnsupportedAiAssistantTransport implements AiAssistantTransport {
  @override
  Future<AiAssistantHttpResult> send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    throw const AiAssistantTransportException(
      'The assistant is not available on this platform.',
    );
  }
}
