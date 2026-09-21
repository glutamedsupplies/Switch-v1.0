import 'dart:async';
import 'dart:convert';
import 'dart:html';

import 'package:switch_app/models/store_type_summary.dart';
import 'package:switch_app/services/store_type_repository_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration(seconds: 30);
String? _preferredBaseUrl;

StoreTypeRepository createStoreTypeRepository({String? baseUrl}) {
  return _WebStoreTypeRepository(baseUrls: _buildBaseUrls(baseUrl: baseUrl));
}

List<String> _buildBaseUrls({String? baseUrl}) {
  final urls = <String>[];
  void addUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty || urls.contains(trimmed)) return;
    urls.add(trimmed);
  }

  addUrl(baseUrl);
  addUrl(_environmentBaseUrl);
  addUrl(window.location.origin);
  addUrl('http://127.0.0.1:8080');
  addUrl('http://localhost:8080');
  return urls;
}

class _WebStoreTypeRepository implements StoreTypeRepository {
  _WebStoreTypeRepository({required this.baseUrls});

  final List<String> baseUrls;
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
      final response = await HttpRequest.request(
        '$baseUrl/api/store-types',
        method: 'GET',
        requestHeaders: const {'Accept': 'application/json'},
      ).timeout(_requestTimeout);
      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }
      _preferredBaseUrl = baseUrl;
      return _parse(response.responseText ?? '{}', baseUrl);
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
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
