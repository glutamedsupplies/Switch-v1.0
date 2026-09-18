import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show compute;
import 'package:gms_shopping/models/product.dart';
import 'package:gms_shopping/services/admin_scope.dart';
import 'package:gms_shopping/services/local_api_base_urls.dart';
import 'package:gms_shopping/services/product_repository_base.dart';

const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration.zero;
String? _preferredBaseUrl;

Future<List<Product>> _decodeProductsInBackground(String responseBody) {
  return compute(_parseProductsResponse, responseBody);
}

List<Product> _parseProductsResponse(String responseBody) {
  final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
  final items = (decoded['products'] as List<dynamic>? ?? const <dynamic>[]);

  return items
      .whereType<Map>()
      .map((entry) => Product.fromJson(Map<String, dynamic>.from(entry)))
      .toList(growable: false);
}

ProductRepository createProductRepository({String? baseUrl}) {
  return _HttpProductRepository(
    baseUrls: _buildBaseUrls(baseUrl: baseUrl),
  );
}

List<String> _buildBaseUrls({String? baseUrl}) {
  return buildLocalApiBaseUrls(
    baseUrl: baseUrl,
    isAndroid: Platform.isAndroid,
  );
}

class _HttpProductRepository implements ProductRepository {
  _HttpProductRepository({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  final HttpClient _client = HttpClient();
  Future<List<Product>>? _ongoingRequest;
  List<Product>? _cachedProducts;
  DateTime? _lastSuccessfulFetchAt;

  String _resolveImageUrl(String imageUrl, String baseUrl) {
    final trimmedImageUrl = imageUrl.trim();
    if (trimmedImageUrl.isEmpty) {
      return '';
    }

    final parsed = Uri.tryParse(trimmedImageUrl);
    if (parsed != null && parsed.hasScheme) {
      return trimmedImageUrl;
    }

    return Uri.parse('$baseUrl/').resolve(trimmedImageUrl).toString();
  }

  Product _resolveProductImageUrl(Product product, String baseUrl) {
    final resolvedGalleryImageUrls = product.galleryImageUrls
        .map((imageUrl) => _resolveImageUrl(imageUrl, baseUrl))
        .where((imageUrl) => imageUrl.isNotEmpty)
        .toList(growable: false);
    final resolvedDescriptionImageUrls = product.descriptionImageUrls
        .map((imageUrl) => _resolveImageUrl(imageUrl, baseUrl))
        .where((imageUrl) => imageUrl.isNotEmpty)
        .toList(growable: false);
    final resolvedVariants = product.variants
        .map(
          (variant) => variant.copyWith(
            imageUrl: _resolveImageUrl(variant.imageUrl, baseUrl),
          ),
        )
        .toList(growable: false);
    final resolvedMainImageIndex = resolvedGalleryImageUrls.isEmpty
        ? 0
        : product.resolvedMainImageIndex.clamp(
            0,
            resolvedGalleryImageUrls.length - 1,
          ).toInt();
    final resolvedMainImageUrl = resolvedGalleryImageUrls.isEmpty
        ? _resolveImageUrl(product.imageUrl, baseUrl)
        : resolvedGalleryImageUrls[resolvedMainImageIndex];
    final resolvedCardImageSourceUrl = _resolveImageUrl(
      product.cardImageSourceUrl,
      baseUrl,
    );
    final resolvedCardImageUrl = _resolveImageUrl(product.cardImageUrl, baseUrl);
    final resolvedDetailsVideoSourceUrl = _resolveImageUrl(
      product.detailsVideoSourceUrl,
      baseUrl,
    );
    final resolvedVisualSearchImageUrl = _resolveImageUrl(
      product.visualSearchImageUrl,
      baseUrl,
    );
    final resolvedModel3dUrl = _resolveImageUrl(product.model3dUrl, baseUrl);
    final resolvedModel3dScanImageUrls = product.model3dScanImageUrls
        .map((imageUrl) => _resolveImageUrl(imageUrl, baseUrl))
        .where((imageUrl) => imageUrl.isNotEmpty)
        .toList(growable: false);
    final resolvedVideoUrls = product.galleryVideoUrls
        .map((videoUrl) => _resolveImageUrl(videoUrl, baseUrl))
        .where((videoUrl) => videoUrl.isNotEmpty)
        .toList(growable: false);
    final resolvedVideoThumbnailUrls = product.galleryVideoThumbnailUrls
        .map((thumbnailUrl) => _resolveImageUrl(thumbnailUrl, baseUrl))
        .toList(growable: false);
    final resolvedDetailsImageCrops = product.detailsImageCrops
        .map(
          (crop) => crop.copyWith(
            sourceUrl: _resolveImageUrl(crop.sourceUrl, baseUrl),
            croppedImageUrl: _resolveImageUrl(crop.croppedImageUrl, baseUrl),
          ),
        )
        .toList(growable: false);

    return product.copyWith(
      imageUrl: resolvedMainImageUrl,
      imageUrls: resolvedGalleryImageUrls,
      descriptionImageUrls: resolvedDescriptionImageUrls,
      cardImageUrl: resolvedCardImageUrl,
      cardImageSourceUrl: resolvedCardImageSourceUrl,
      detailsVideoSourceUrl: resolvedDetailsVideoSourceUrl,
      visualSearchImageUrl: resolvedVisualSearchImageUrl,
      model3dUrl: resolvedModel3dUrl,
      model3dScanImageUrls: resolvedModel3dScanImageUrls,
      companyPictureUrl: _resolveImageUrl(product.companyPictureUrl, baseUrl),
      detailsImageCrops: resolvedDetailsImageCrops,
      videoUrl: resolvedVideoUrls.isNotEmpty
          ? resolvedVideoUrls.first
          : _resolveImageUrl(product.videoUrl, baseUrl),
      videoUrls: resolvedVideoUrls,
      videoThumbnailUrl: resolvedVideoThumbnailUrls.isNotEmpty
          ? resolvedVideoThumbnailUrls.first
          : _resolveImageUrl(product.videoThumbnailUrl, baseUrl),
      videoThumbnailUrls: resolvedVideoThumbnailUrls,
      variants: resolvedVariants,
      mainImageIndex: resolvedMainImageIndex,
    );
  }

  bool _isVisibleInApp(Product product) =>
      product.name.trim().isNotEmpty && isProductVisibleToUsers(product);

  Future<List<Product>> _fetchProductsFromBaseUrl(String baseUrl) async {
    try {
      final request = await _client
          .getUrl(Uri.parse('$baseUrl/api/products?approvalStatus=approved'))
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      final parsedProducts = await _decodeProductsInBackground(responseBody);

      _preferredBaseUrl = baseUrl;

      return parsedProducts
          .where(_isVisibleInApp)
          .map((product) => _resolveProductImageUrl(product, baseUrl))
          .toList(growable: false);
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

  Future<List<Product>> _fetchProductsFromFallbackBaseUrls() {
    final failures = <String>[];
    final completer = Completer<List<Product>>();
    var remaining = baseUrls.length;

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          ProductRepositoryException(
            'Backend not connected. Tried: ${baseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}. '
            'If you use a real phone, connect by USB then run: adb reverse tcp:8080 tcp:8080',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      _fetchProductsFromBaseUrl(baseUrl).then((products) {
        if (!completer.isCompleted) {
          completer.complete(products);
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

  Future<List<Product>> _searchProductsByImageFromBaseUrl(
    String baseUrl, {
    required Uint8List imageBytes,
    required String filename,
  }) async {
    try {
      final request = await _client
          .postUrl(withAdminScopeUri(Uri.parse('$baseUrl/api/products/visual-search')))
          .timeout(_requestTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.headers.set(HttpHeaders.contentTypeHeader, 'image/jpeg');
      request.headers.set('X-File-Name', filename.trim().isEmpty ? 'camera.jpg' : filename);
      final adminId = activeAdminId;
      if (adminId.isNotEmpty) {
        request.headers.set('X-GMS-Admin-ID', adminId);
      }
      request.contentLength = imageBytes.length;
      request.add(imageBytes);

      final response = await request.close().timeout(_requestTimeout);
      final responseBody = await response
          .transform(utf8.decoder)
          .join()
          .timeout(_requestTimeout);

      if (response.statusCode != HttpStatus.ok) {
        throw _BaseUrlAttemptFailure('${response.statusCode}');
      }

      final parsedProducts = await _decodeProductsInBackground(responseBody);

      _preferredBaseUrl = baseUrl;

      return parsedProducts
          .where(_isVisibleInApp)
          .map((product) => _resolveProductImageUrl(product, baseUrl))
          .toList(growable: false);
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

  Future<List<Product>> _searchProductsByImageFromFallbackBaseUrls({
    required Uint8List imageBytes,
    required String filename,
  }) {
    final failures = <String>[];
    final completer = Completer<List<Product>>();
    var remaining = baseUrls.length;

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          ProductRepositoryException(
            'Backend not connected for visual search. Tried: ${baseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}.',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      _searchProductsByImageFromBaseUrl(
        baseUrl,
        imageBytes: imageBytes,
        filename: filename,
      ).then((products) {
        if (!completer.isCompleted) {
          completer.complete(products);
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
    final cachedProducts = _cachedProducts;

    if (lastSuccessfulFetchAt == null || cachedProducts == null) {
      return false;
    }

    return DateTime.now().difference(lastSuccessfulFetchAt) <=
        _memoryCacheLifetime;
  }

  @override
  Future<List<Product>> fetchProducts({bool forceRefresh = false}) async {
    if (!forceRefresh && _hasFreshCache) {
      return _cachedProducts!;
    }

    final ongoingRequest = _ongoingRequest;
    if (ongoingRequest != null) {
      return ongoingRequest;
    }

    final request = () async {
      final preferredBaseUrl = _preferredBaseUrl;

      if (preferredBaseUrl != null) {
        try {
          return await _fetchProductsFromBaseUrl(preferredBaseUrl);
        } on _BaseUrlAttemptFailure {
          if (_preferredBaseUrl == preferredBaseUrl) {
            _preferredBaseUrl = null;
          }
        }
      }

      return _fetchProductsFromFallbackBaseUrls();
    }();

    _ongoingRequest = request;

    try {
      final products = await request;
      _cachedProducts = products;
      _lastSuccessfulFetchAt = DateTime.now();
      return products;
    } finally {
      if (identical(_ongoingRequest, request)) {
        _ongoingRequest = null;
      }
    }
  }

  @override
  Future<List<Product>> searchProductsByImage({
    required Uint8List imageBytes,
    required String filename,
  }) async {
    if (imageBytes.isEmpty) {
      return const <Product>[];
    }

    final preferredBaseUrl = _preferredBaseUrl;

    if (preferredBaseUrl != null) {
      try {
        return await _searchProductsByImageFromBaseUrl(
          preferredBaseUrl,
          imageBytes: imageBytes,
          filename: filename,
        );
      } on _BaseUrlAttemptFailure {
        if (_preferredBaseUrl == preferredBaseUrl) {
          _preferredBaseUrl = null;
        }
      }
    }

    return _searchProductsByImageFromFallbackBaseUrls(
      imageBytes: imageBytes,
      filename: filename,
    );
  }
}

class ProductRepositoryException implements Exception {
  const ProductRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message);

  final String message;
}
