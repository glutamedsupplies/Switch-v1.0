import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Current WMO weather code from Open-Meteo (free, no API key).
Future<int?> fetchCurrentWeatherCode({
  required double lat,
  required double lng,
  required Duration timeout,
}) async {
  final client = HttpClient()..connectionTimeout = timeout;
  try {
    final uri = Uri.https('api.open-meteo.com', '/v1/forecast', {
      'latitude': lat.toStringAsFixed(3),
      'longitude': lng.toStringAsFixed(3),
      'current': 'weather_code',
      'timezone': 'auto',
    });
    final request = await client.getUrl(uri).timeout(timeout);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    final response = await request.close().timeout(timeout);
    final body = await response.transform(utf8.decoder).join();
    if (response.statusCode != HttpStatus.ok || body.isEmpty) return null;
    final decoded = jsonDecode(body);
    if (decoded is! Map) return null;
    final current = decoded['current'];
    if (current is! Map) return null;
    final code = current['weather_code'];
    if (code is num) return code.toInt();
    return int.tryParse('${code ?? ''}');
  } on SocketException {
    return null;
  } on TimeoutException {
    return null;
  } on HttpException {
    return null;
  } on FormatException {
    return null;
  } finally {
    client.close(force: true);
  }
}
