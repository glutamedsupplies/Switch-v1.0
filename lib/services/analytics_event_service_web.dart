import 'dart:async';
import 'dart:convert';
import 'dart:html';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:switch_app/services/analytics_event_service_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 2);

AnalyticsEventService createAnalyticsEventService() =>
    _WebAnalyticsEventService();

class _WebAnalyticsEventService implements AnalyticsEventService {
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
      final bases = <String>{
        if (_environmentBaseUrl.trim().isNotEmpty) _environmentBaseUrl.trim(),
        window.location.origin,
      };
      for (final baseUrl in bases) {
        try {
          final response = await HttpRequest.request(
            '$baseUrl/api/analytics/events',
            method: 'POST',
            requestHeaders: const {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            sendData: payload,
            withCredentials: true,
          ).timeout(_requestTimeout);
          final status = response.status;
          if (status != null && status >= 200 && status < 300) {
            return;
          }
        } catch (_) {
          // Try the next configured origin.
        }
      }
    } catch (_) {
      // Analytics is best-effort and must never block shopping flows.
    }
  }
}
