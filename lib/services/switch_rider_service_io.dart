import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/switch_rider_service_base.dart';
import 'package:switch_app/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 12);

SwitchRiderService createSwitchRiderService() => _IoSwitchRiderService();

class _IoSwitchRiderService implements SwitchRiderService {
  final HttpClient _client = HttpClient();

  List<String> get _baseUrls =>
      buildLocalApiBaseUrls(isAndroid: Platform.isAndroid);

  Future<void> _applyAuthHeaders(HttpHeaders headers) async {
    headers.set(HttpHeaders.acceptHeader, 'application/json');
    final sessionToken = (await AuthSession.getSessionToken())?.trim() ?? '';
    if (sessionToken.isNotEmpty) {
      headers.set('X-Switch-Session', sessionToken);
    }
  }

  Future<HttpClientResponse> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    for (final baseUrl in _baseUrls) {
      try {
        final request = await _client
            .openUrl(method, Uri.parse('$baseUrl$path'))
            .timeout(_requestTimeout);
        await _applyAuthHeaders(request.headers);
        if (body != null) {
          request.headers.contentType = ContentType.json;
          request.write(jsonEncode(body));
        }
        final response = await request.close().timeout(_requestTimeout);
        rememberWorkingLocalApiBaseUrl(baseUrl);
        return response;
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      }
    }
    throw const SwitchRiderApiException(
      'Cannot reach Switch right now. Check your connection and try again.',
    );
  }

  Future<Map<String, dynamic>> _requestJson(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _send(method, path, body: body);
    final text = await response
        .transform(utf8.decoder)
        .join()
        .timeout(_requestTimeout);
    Map<String, dynamic> decoded;
    try {
      final parsed = text.trim().isEmpty ? null : jsonDecode(text);
      decoded = parsed is Map
          ? Map<String, dynamic>.from(parsed)
          : <String, dynamic>{};
    } on FormatException {
      decoded = <String, dynamic>{};
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = (decoded['message']?.toString() ?? '').trim();
      throw SwitchRiderApiException(
        message.isNotEmpty
            ? message
            : 'Switch Rider request failed (${response.statusCode}).',
        code: (decoded['code']?.toString() ?? '').trim(),
        statusCode: response.statusCode,
      );
    }
    return decoded;
  }

  @override
  Future<SwitchRiderQuote> fetchQuote({
    required String sellerAdminId,
    required double latitude,
    required double longitude,
  }) async {
    final decoded = await _requestJson(
      'POST',
      '/api/switch-rider/quote',
      body: <String, dynamic>{
        'sellerAdminId': sellerAdminId.trim(),
        'lat': latitude,
        'lng': longitude,
        'packageCount': 1,
      },
    );
    final quote = decoded['quote'];
    if (quote is! Map) {
      throw const SwitchRiderApiException(
        'Switch Rider returned an invalid quote.',
      );
    }
    return SwitchRiderQuote.fromJson(Map<String, dynamic>.from(quote));
  }

  @override
  Future<List<SwitchRiderBuyerNotification>> fetchBuyerNotifications() async {
    final decoded = await _requestJson(
      'GET',
      '/api/switch-rider/buyer/notifications',
    );
    final items = decoded['notifications'];
    if (items is! List) return const <SwitchRiderBuyerNotification>[];
    return items
        .whereType<Map>()
        .map(
          (item) => SwitchRiderBuyerNotification.fromJson(
            Map<String, dynamic>.from(item),
          ),
        )
        .where((item) => item.id.isNotEmpty)
        .toList(growable: false);
  }

  @override
  Future<SwitchRiderTracking?> fetchTracking(String orderReference) async {
    final decoded = await _requestJson(
      'GET',
      '/api/switch-rider/tracking/${Uri.encodeComponent(orderReference.trim())}',
    );
    final tracking = decoded['tracking'];
    if (tracking is! Map) return null;
    return SwitchRiderTracking.fromJson(Map<String, dynamic>.from(tracking));
  }

  @override
  Future<SwitchRiderRating> rateRider(
    String orderReference, {
    required int stars,
    String comment = '',
  }) async {
    final decoded = await _requestJson(
      'POST',
      '/api/switch-rider/tracking/${Uri.encodeComponent(orderReference.trim())}/rating',
      body: <String, dynamic>{'stars': stars, 'comment': comment.trim()},
    );
    final rating = decoded['rating'];
    return rating is Map
        ? SwitchRiderRating.fromJson(Map<String, dynamic>.from(rating))
        : SwitchRiderRating(stars: stars, comment: comment.trim());
  }

  @override
  Future<Uint8List?> fetchRiderPhoto(String photoPath) async {
    final path = photoPath.trim();
    if (!path.startsWith('/api/switch-rider/')) return null;
    try {
      final response = await _send('GET', path);
      if (response.statusCode != HttpStatus.ok) {
        await response.drain<void>();
        return null;
      }
      final builder = BytesBuilder(copy: false);
      await for (final chunk in response.timeout(_requestTimeout)) {
        builder.add(chunk);
      }
      return builder.takeBytes();
    } on SwitchRiderApiException {
      return null;
    } on TimeoutException {
      return null;
    }
  }
}
