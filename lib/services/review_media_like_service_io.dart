import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/review_media_like_service_base.dart';
import 'package:switch_app/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 12);

ReviewMediaLikeService createReviewMediaLikeService() =>
    _IoReviewMediaLikeService(
      buildLocalApiBaseUrls(isAndroid: Platform.isAndroid),
    );

class _IoReviewMediaLikeService implements ReviewMediaLikeService {
  _IoReviewMediaLikeService(this._baseUrls);

  final List<String> _baseUrls;
  final HttpClient _client = HttpClient();

  Future<void> _applyAuthHeaders(HttpHeaders headers) async {
    headers.set(HttpHeaders.acceptHeader, 'application/json');
    headers.contentType = ContentType.json;
    final sessionToken = (await AuthSession.getSessionToken())?.trim() ?? '';
    if (sessionToken.isNotEmpty) {
      headers.set('X-Switch-Session', sessionToken);
    }
  }

  Map<String, dynamic> _decode(String body) {
    if (body.isEmpty) {
      return const <String, dynamic>{};
    }
    final decoded = jsonDecode(body);
    return decoded is Map
        ? Map<String, dynamic>.from(decoded)
        : const <String, dynamic>{};
  }

  @override
  Future<Map<String, ReviewMediaLikeState>> fetchLikes(String productId) async {
    final trimmedProductId = productId.trim();
    if (trimmedProductId.isEmpty) {
      return const <String, ReviewMediaLikeState>{};
    }

    for (final baseUrl in _baseUrls) {
      try {
        final uri = Uri.parse(
          '$baseUrl/api/review-media-likes',
        ).replace(queryParameters: {'productId': trimmedProductId});
        final request = await _client.getUrl(uri).timeout(_requestTimeout);
        await _applyAuthHeaders(request.headers);
        final response = await request.close().timeout(_requestTimeout);
        final body = await response.transform(utf8.decoder).join();
        if (response.statusCode != HttpStatus.ok) {
          return const <String, ReviewMediaLikeState>{};
        }
        rememberWorkingLocalApiBaseUrl(baseUrl);
        final likes = _decode(body)['likes'];
        if (likes is! Map) {
          return const <String, ReviewMediaLikeState>{};
        }
        return {
          for (final entry in likes.entries)
            if (entry.value is Map)
              entry.key.toString(): ReviewMediaLikeState(
                count:
                    num.tryParse(
                      (entry.value as Map)['count']?.toString() ?? '',
                    )?.toInt() ??
                    0,
                liked: (entry.value as Map)['liked'] == true,
              ),
        };
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        return const <String, ReviewMediaLikeState>{};
      }
    }

    return const <String, ReviewMediaLikeState>{};
  }

  @override
  Future<ReviewMediaLikeResult> setLiked({
    required String productId,
    required String reviewId,
    required String mediaUrl,
    required bool liked,
  }) async {
    final payload = jsonEncode(<String, dynamic>{
      'productId': productId.trim(),
      'reviewId': reviewId.trim(),
      'mediaUrl': mediaUrl.trim(),
      'liked': liked,
    });

    for (final baseUrl in _baseUrls) {
      try {
        final request = await _client
            .postUrl(Uri.parse('$baseUrl/api/review-media-likes'))
            .timeout(_requestTimeout);
        await _applyAuthHeaders(request.headers);
        request.write(payload);
        final response = await request.close().timeout(_requestTimeout);
        final decoded = _decode(
          await response.transform(utf8.decoder).join(),
        );
        if (response.statusCode == HttpStatus.ok) {
          rememberWorkingLocalApiBaseUrl(baseUrl);
          return ReviewMediaLikeResult.success(
            ReviewMediaLikeState(
              count: num.tryParse(decoded['count']?.toString() ?? '')?.toInt() ??
                  0,
              liked: decoded['liked'] == true,
            ),
          );
        }
        final message = decoded['message']?.toString().trim() ?? '';
        return ReviewMediaLikeResult.failure(
          message.isNotEmpty ? message : 'Unable to update like.',
          requiresLogin: response.statusCode == HttpStatus.unauthorized,
        );
      } on SocketException {
        // Try the next local, emulator, or LAN address.
      } on TimeoutException {
        // Try the next address.
      } on HttpException {
        // Try the next address.
      } on FormatException {
        return ReviewMediaLikeResult.failure(
          'The server returned an invalid response.',
        );
      }
    }

    return ReviewMediaLikeResult.failure(
      'Cannot reach the backend. Check that it is running.',
    );
  }
}
