import 'dart:async';
import 'dart:convert';
import 'dart:html';

import 'package:gms_shopping/models/buyer_platform_summary.dart';
import 'package:gms_shopping/services/platform_repository_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration(seconds: 30);
String? _preferredBaseUrl;

PlatformRepository createPlatformRepository({String? baseUrl}) {
  return _WebPlatformRepository(baseUrls: _buildBaseUrls(baseUrl: baseUrl));
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

class _WebPlatformRepository implements PlatformRepository {
  _WebPlatformRepository({required this.baseUrls});

  final List<String> baseUrls;
  Future<List<BuyerPlatformSummary>>? _ongoingRequest;
  List<BuyerPlatformSummary>? _cachedPlatforms;
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

  List<BuyerPlatformSummary> _parse(String responseBody, String baseUrl) {
    final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
    final items =
        (decoded['platformDetails'] as List<dynamic>? ?? const <dynamic>[]);
    final platforms = items
        .whereType<Map>()
        .map((entry) => BuyerPlatformSummary.fromJson(Map<String, dynamic>.from(entry)))
        .where((item) => item.id.trim().isNotEmpty)
        .map(
          (item) => BuyerPlatformSummary(
            id: item.id,
            name: item.name,
            status: item.status,
            sortOrder: item.sortOrder,
            comingSoon: item.comingSoon,
            iconName: item.iconName,
            iconImageUrl: _resolveImageUrl(item.iconImageUrl, baseUrl),
            heroImageUrl: _resolveImageUrl(item.heroImageUrl, baseUrl),
            primaryColor: item.primaryColor,
            secondaryColor: item.secondaryColor,
          ),
        )
        .toList(growable: false);
    platforms.sort((left, right) {
      if (left.sortOrder != right.sortOrder) {
        return left.sortOrder.compareTo(right.sortOrder);
      }
      return left.name.toLowerCase().compareTo(right.name.toLowerCase());
    });
    return platforms;
  }

  Future<List<BuyerPlatformSummary>> _fetchFromBaseUrl(String baseUrl) async {
    try {
      final response = await HttpRequest.request(
        '$baseUrl/api/platforms',
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
    } on FormatException {
      throw const _BaseUrlAttemptFailure('invalid JSON');
    } catch (error) {
      if (error is _BaseUrlAttemptFailure) rethrow;
      throw _BaseUrlAttemptFailure(error.toString());
    }
  }

  Future<List<BuyerPlatformSummary>> _fetchFallback() {
    final completer = Completer<List<BuyerPlatformSummary>>();
    var remaining = baseUrls.length;

    void fail() {
      remaining -= 1;
      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          PlatformRepositoryException(
            'Platforms unavailable. Tried: ${baseUrls.join(', ')}.',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      _fetchFromBaseUrl(baseUrl).then((items) {
        if (!completer.isCompleted) completer.complete(items);
      }).catchError((Object error) {
        fail();
      });
    }
    return completer.future;
  }

  @override
  Future<List<BuyerPlatformSummary>> fetchPlatforms({
    bool forceRefresh = false,
  }) async {
    final cached = _cachedPlatforms;
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
      _cachedPlatforms = items;
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
