import 'dart:async';
import 'dart:convert';
import 'dart:html';

import 'package:switch_app/models/seller_summary.dart';
import 'package:switch_app/services/seller_repository_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration.zero;
String? _preferredBaseUrl;

SellerRepository createSellerRepository({String? baseUrl}) {
  return _WebSellerRepository(
    baseUrls: _buildBaseUrls(baseUrl: baseUrl),
  );
}

List<String> _buildBaseUrls({String? baseUrl}) {
  final urls = <String>[];

  void addUrl(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty || urls.contains(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  addUrl(baseUrl);
  addUrl(_environmentBaseUrl);
  addUrl(window.location.origin);
  addUrl('http://127.0.0.1:8080');
  addUrl('http://localhost:8080');

  return urls;
}

class _WebSellerRepository implements SellerRepository {
  _WebSellerRepository({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  Future<List<SellerSummary>>? _ongoingRequest;
  List<SellerSummary>? _cachedSellers;
  DateTime? _lastSuccessfulFetchAt;

  String _resolveImageUrl(String imageUrl, String baseUrl) {
    final trimmedImageUrl = imageUrl.trim();
    if (trimmedImageUrl.isEmpty ||
        trimmedImageUrl.toLowerCase().startsWith('data:image/')) {
      return trimmedImageUrl;
    }

    final parsed = Uri.tryParse(trimmedImageUrl);
    if (parsed != null && parsed.hasScheme) {
      return trimmedImageUrl;
    }

    return Uri.parse('$baseUrl/').resolve(trimmedImageUrl).toString();
  }

  SellerSummary _resolveSellerImageUrl(SellerSummary seller, String baseUrl) {
    return SellerSummary(
      adminId: seller.adminId,
      name: seller.name,
      companyName: seller.companyName,
      storeType: seller.storeType,
      companyPictureUrl: _resolveImageUrl(seller.companyPictureUrl, baseUrl),
      profileImageUrl: _resolveImageUrl(seller.profileImageUrl, baseUrl),
      createdAt: seller.createdAt,
    );
  }

  List<SellerSummary> _parseSellersResponse(String responseBody) {
    final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
    final items = (decoded['sellers'] as List<dynamic>? ?? const <dynamic>[]);

    return items
        .whereType<Map>()
        .map((entry) => SellerSummary.fromJson(Map<String, dynamic>.from(entry)))
        .where((seller) => seller.adminId.trim().isNotEmpty)
        .toList(growable: false);
  }

  Future<List<SellerSummary>> _fetchSellersFromBaseUrl(String baseUrl) async {
    try {
      final response = await HttpRequest.request(
        '$baseUrl/api/sellers',
        method: 'GET',
        requestHeaders: const {
          'Accept': 'application/json',
        },
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      final parsedSellers = _parseSellersResponse(
        response.responseText ?? '{}',
      );
      _preferredBaseUrl = baseUrl;

      return parsedSellers
          .map((seller) => _resolveSellerImageUrl(seller, baseUrl))
          .toList(growable: false);
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<List<SellerSummary>> _fetchSellersFromFallbackBaseUrls() {
    final failures = <String>[];
    final completer = Completer<List<SellerSummary>>();
    var remaining = baseUrls.length;

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          SellerRepositoryException(
            'Could not connect to the backend. Tried: ${baseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}. Make sure backend/server.js is running.',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      _fetchSellersFromBaseUrl(baseUrl).then((sellers) {
        if (!completer.isCompleted) {
          completer.complete(sellers);
        }
      }).catchError((Object error) {
        final failure = error is _BaseUrlAttemptFailure
            ? error.message
            : 'unknown error';
        completeFailure(baseUrl, failure);
      });
    }

    return completer.future;
  }

  bool get _hasFreshCache {
    if (_memoryCacheLifetime <= Duration.zero) {
      return false;
    }

    final lastSuccessfulFetchAt = _lastSuccessfulFetchAt;
    final cachedSellers = _cachedSellers;

    if (lastSuccessfulFetchAt == null || cachedSellers == null) {
      return false;
    }

    return DateTime.now().difference(lastSuccessfulFetchAt) <=
        _memoryCacheLifetime;
  }

  @override
  Future<List<SellerSummary>> fetchSellers({bool forceRefresh = false}) async {
    if (!forceRefresh && _hasFreshCache) {
      return _cachedSellers!;
    }

    final ongoingRequest = _ongoingRequest;
    if (ongoingRequest != null) {
      return ongoingRequest;
    }

    final request = () async {
      final preferredBaseUrl = _preferredBaseUrl;

      if (preferredBaseUrl != null) {
        try {
          return await _fetchSellersFromBaseUrl(preferredBaseUrl);
        } on _BaseUrlAttemptFailure {
          if (_preferredBaseUrl == preferredBaseUrl) {
            _preferredBaseUrl = null;
          }
        }
      }

      return _fetchSellersFromFallbackBaseUrls();
    }();

    _ongoingRequest = request;

    try {
      final sellers = await request;
      _cachedSellers = sellers;
      _lastSuccessfulFetchAt = DateTime.now();
      return sellers;
    } finally {
      if (identical(_ongoingRequest, request)) {
        _ongoingRequest = null;
      }
    }
  }
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message);

  final String message;
}
