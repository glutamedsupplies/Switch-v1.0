import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:switch_app/models/store_type_summary.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/store_type_repository_base.dart';

const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration(seconds: 30);
String? _preferredBaseUrl;

StoreTypeRepository createStoreTypeRepository({String? baseUrl}) {
  return _HttpStoreTypeRepository(
    baseUrls: buildLocalApiBaseUrls(
      baseUrl: baseUrl,
      isAndroid: Platform.isAndroid,
    ),
  );
}

class _HttpStoreTypeRepository implements StoreTypeRepository {
  _HttpStoreTypeRepository({required this.baseUrls});

  final List<String> baseUrls;
  final HttpClient _client = HttpClient();
  Future<List<StoreTypeSummary>>? _ongoingRequest;
  List<StoreTypeSummary>? _cachedStoreTypes;
  DateTime? _lastSuccessfulFetchAt;

  String _resolveImageUrl(String imageUrl, String baseUrl) {
    final trimmed = imageUrl.trim();
    if (trimmed.isEmpty || trimmed.toLowerCase().startsWith('data:image/')) {
      return trimmed;
    }
    final parsed = Uri.tryParse(trimmed);
    if (parsed != null && parsed.hasScheme) return trimmed;
    return Uri.parse('$baseUrl/').resolve(trimmed).toString();
  }

  List<StoreTypeSummary> _parse(String responseBody, String baseUrl) {
    final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
    final items =
        (decoded['storeTypeDetails'] as List<dynamic>? ?? const <dynamic>[]);
    return items
        .whereType<Map>()
        .map((entry) => StoreTypeSummary.fromJson(Map<String, dynamic>.from(entry)))
        .where((item) => item.name.trim().isNotEmpty && item.status != 'inactive')
        .map(
          (item) => StoreTypeSummary(
            name: item.name,
            platformId: item.platformId,
            categories: item.categories,
            categoryDetails: item.categoryDetails
                .map(
                  (detail) => StoreTypeCategoryDetail(
                    name: detail.name,
                    iconName: detail.iconName,
                    iconImageUrl: _resolveImageUrl(detail.iconImageUrl, baseUrl),
                    imageUrl: _resolveImageUrl(detail.imageUrl, baseUrl),
                    status: detail.status,
                  ),
                )
                .toList(growable: false),
            iconImageUrl: _resolveImageUrl(item.iconImageUrl, baseUrl),
            iconName: item.iconName,
            heroImageUrl: _resolveImageUrl(item.heroImageUrl, baseUrl),
            status: item.status,
          ),
        )
        .toList(growable: false);
  }

  Future<List<StoreTypeSummary>> _fetchFromBaseUrl(String baseUrl) async {
    try {
      final request = await _client
          .getUrl(Uri.parse('$baseUrl/api/store-types'))
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final response = await request.close().timeout(_requestTimeout);
      final body =
          await response.transform(utf8.decoder).join().timeout(_requestTimeout);
      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }
      _preferredBaseUrl = baseUrl;
      return _parse(body, baseUrl);
    } on SocketException {
      throw const _BaseUrlAttemptFailure('socket error');
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } on HttpException catch (error) {
      throw _BaseUrlAttemptFailure(error.message);
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    }
  }

  Future<List<StoreTypeSummary>> _fetchFallback() {
    final failures = <String>[];
    final completer = Completer<List<StoreTypeSummary>>();
    var remaining = baseUrls.length;

    void fail(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;
      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          StoreTypeRepositoryException(
            'Business types unavailable. Tried: ${baseUrls.join(', ')}.',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      _fetchFromBaseUrl(baseUrl).then((items) {
        if (!completer.isCompleted) completer.complete(items);
      }).catchError((Object error) {
        fail(
          baseUrl,
          error is _BaseUrlAttemptFailure ? error.message : 'unknown error',
        );
      });
    }
    return completer.future;
  }

  @override
  Future<List<StoreTypeSummary>> fetchStoreTypes({
    bool forceRefresh = false,
  }) async {
    final cached = _cachedStoreTypes;
    final fetchedAt = _lastSuccessfulFetchAt;
    if (!forceRefresh &&
        cached != null &&
        fetchedAt != null &&
        DateTime.now().difference(fetchedAt) <= _memoryCacheLifetime) {
      return cached;
    }

    final ongoing = _ongoingRequest;
    if (ongoing != null) return ongoing;

    final request = () async {
      final preferred = _preferredBaseUrl;
      if (preferred != null) {
        try {
          return await _fetchFromBaseUrl(preferred);
        } on _BaseUrlAttemptFailure {
          if (_preferredBaseUrl == preferred) _preferredBaseUrl = null;
        }
      }
      return _fetchFallback();
    }();

    _ongoingRequest = request;
    try {
      final items = await request;
      _cachedStoreTypes = items;
      _lastSuccessfulFetchAt = DateTime.now();
      return items;
    } finally {
      if (identical(_ongoingRequest, request)) _ongoingRequest = null;
    }
  }
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message);
  final String message;
}
