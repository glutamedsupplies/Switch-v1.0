/// HTTP transport for the Switch AI assistant (`/api/assistant/*`).
class AiAssistantHttpResult {
  const AiAssistantHttpResult(this.status, this.body);

  final int status;
  final Map<String, dynamic> body;

  bool get ok => status >= 200 && status < 300;
}

abstract class AiAssistantTransport {
  Future<AiAssistantHttpResult> send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  });
}

class AiAssistantTransportException implements Exception {
  const AiAssistantTransportException(this.message);

  final String message;

  @override
  String toString() => message;
}
