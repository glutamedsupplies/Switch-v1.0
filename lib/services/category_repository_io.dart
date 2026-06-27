import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/admin_scope.dart';
import 'package:gms_shopping/services/category_repository_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _defaultDesktopBaseUrl = 'http://127.0.0.1:8080';
const _defaultAndroidEmulatorBaseUrl = 'http://10.0.2.2:8080';
const _defaultAndroidUsbBaseUrl = 'http://127.0.0.1:8080';
const _defaultCurrentWifiBaseUrl = 'http://192.168.100.225:8080';
const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration(seconds: 15);
String? _preferredBaseUrl;

CategoryRepository createCategoryRepository({String? baseUrl}) {
  return _HttpCategoryRepository(
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

  if (Platform.isAndroid) {
    addUrl(_defaultAndroidEmulatorBaseUrl);
    addUrl(_defaultAndroidUsbBaseUrl);
    addUrl(_defaultCurrentWifiBaseUrl);
    addUrl('http://localhost:8080');
  } else {
    addUrl(_defaultDesktopBaseUrl);
    addUrl('http://localhost:8080');
  }

  return urls;
}

class _HttpCategoryRepository implements CategoryRepository {
  _HttpCategoryRepository({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  final HttpClient _client = HttpClient();
  Future<List<String>>? _ongoingRequest;
  List<String>? _cachedCategories;
  DateTime? _lastSuccessfulFetchAt;

  List<String> _parseCategories(String responseBody) {
    final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
    final items = (decoded['categories'] as List<dynamic>? ?? const []);

    return items
        .map((category) => category.toString().trim())
        .where((category) => category.isNotEmpty)
        .toList();
  }

  Future<List<String>> _fetchCategoriesFromBaseUrl(String baseUrl) async {
    try {
      final request = await _client
          .getUrl(withAdminScopeUri(Uri.parse('$baseUrl/api/categories')))
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final adminId = activeAdminId;
      if (adminId.isNotEmpty) {
        request.headers.set('X-GMS-Admin-ID', adminId);
      }

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      _preferredBaseUrl = baseUrl;
      return _parseCategories(responseBody);
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

  Future<List<String>> _fetchCategoriesFromFallbackBaseUrls() {
    final failures = <String>[];
    final completer = Completer<List<String>>();
    var remaining = baseUrls.length;

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          CategoryRepositoryException(
            'Backend categories not connected. Tried: ${baseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}.',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      _fetchCategoriesFromBaseUrl(baseUrl).then((categories) {
        if (!completer.isCompleted) {
          completer.complete(categories);
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
    final lastSuccessfulFetchAt = _lastSuccessfulFetchAt;
    final cachedCategories = _cachedCategories;

    if (lastSuccessfulFetchAt == null || cachedCategories == null) {
      return false;
    }

    return DateTime.now().difference(lastSuccessfulFetchAt) <=
        _memoryCacheLifetime;
  }

  @override
  Future<List<String>> fetchCategories({bool forceRefresh = false}) async {
    if (!forceRefresh && _hasFreshCache) {
      return _cachedCategories!;
    }

    final ongoingRequest = _ongoingRequest;
    if (ongoingRequest != null) {
      return ongoingRequest;
    }

    final request = () async {
      final preferredBaseUrl = _preferredBaseUrl;

      if (preferredBaseUrl != null) {
        try {
          return await _fetchCategoriesFromBaseUrl(preferredBaseUrl);
        } on _BaseUrlAttemptFailure {
          if (_preferredBaseUrl == preferredBaseUrl) {
            _preferredBaseUrl = null;
          }
        }
      }

      return _fetchCategoriesFromFallbackBaseUrls();
    }();

    _ongoingRequest = request;

    try {
      final categories = await request;
      _cachedCategories = categories;
      _lastSuccessfulFetchAt = DateTime.now();
      return categories;
    } finally {
      if (identical(_ongoingRequest, request)) {
        _ongoingRequest = null;
      }
    }
  }
}

class CategoryRepositoryException implements Exception {
  const CategoryRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message);

  final String message;
}
