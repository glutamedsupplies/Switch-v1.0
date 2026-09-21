import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:switch_app/services/analytics_event_service_base.dart';
import 'package:switch_app/services/local_api_base_urls.dart';

const _requestTimeout = Duration(seconds: 2);

AnalyticsEventService createAnalyticsEventService() => _IoAnalyticsEventService(
  buildLocalApiBaseUrls(isAndroid: Platform.isAndroid),
);

class _IoAnalyticsEventService implements AnalyticsEventService {
  _IoAnalyticsEventService(this._baseUrls);

  final List<String> _baseUrls;
  final HttpClient _client = HttpClient()..connectionTimeout = _requestTimeout;

  String _randomId(String prefix) {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return '$prefix${bytes.map((value) => value.toRadixString(16).padLeft(2, '0')).join()}';
  }

  Future<({String anonymousId, String sessionId})> _identity() async {
    final preferences = await SharedPreferences.getInstance();
    var anonymousId = preferences.getString('analytics_anonymous_id') ?? '';
    var sessionId = preferences.getString('analytics_session_id') ?? '';
    if (anonymousId.length < 8) {
      anonymousId = _randomId('anon_');
      await preferences.setString('analytics_anonymous_id', anonymousId);
    }
    if (sessionId.length < 8) {
      sessionId = _randomId('sess_');
      await preferences.setString('analytics_session_id', sessionId);
    }
    return (anonymousId: anonymousId, sessionId: sessionId);
  }

  @override
  Future<void> record({
    required String eventName,
    required String productId,
    String platformId = '',
    String source = 'buyer_app',
    Map<String, dynamic> properties = const <String, dynamic>{},
  }) async {
    if (eventName.trim().isEmpty || productId.trim().isEmpty) return;
    try {
      final identity = await _identity();
      final payload = jsonEncode(<String, dynamic>{
        'eventId': _randomId('evt_'),
        'eventName': eventName.trim(),
        'occurredAt': DateTime.now().toUtc().toIso8601String(),
        'anonymousId': identity.anonymousId,
        'sessionId': identity.sessionId,
        'productId': productId.trim(),
        'platformId': platformId.trim(),
        'source': source.trim(),
        'properties': properties,
      });
      for (final baseUrl in _baseUrls) {
        try {
          final request = await _client
              .postUrl(Uri.parse('$baseUrl/api/analytics/events'))
              .timeout(_requestTimeout);
          request.headers.contentType = ContentType.json;
          request.headers.set(HttpHeaders.acceptHeader, 'application/json');
          request.write(payload);
          final response = await request.close().timeout(_requestTimeout);
          await response.drain<void>().timeout(_requestTimeout);
          if (response.statusCode >= 200 && response.statusCode < 300) {
            rememberWorkingLocalApiBaseUrl(baseUrl);
            return;
          }
        } catch (_) {
          // Analytics is best-effort and must never block shopping flows.
        }
      }
    } catch (_) {
      // Analytics is best-effort and must never block shopping flows.
    }
  }
}
