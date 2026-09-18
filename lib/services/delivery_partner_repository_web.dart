import 'dart:async';
import 'dart:convert';
import 'dart:html';

import 'package:gms_shopping/models/delivery_partner.dart';
import 'package:gms_shopping/services/delivery_partner_repository_base.dart';

const _environmentBaseUrl = String.fromEnvironment('API_BASE_URL');
const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration(seconds: 15);
String? _preferredBaseUrl;

DeliveryPartnerRepository createDeliveryPartnerRepository({String? baseUrl}) {
  return _WebDeliveryPartnerRepository(
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

class _WebDeliveryPartnerRepository implements DeliveryPartnerRepository {
  _WebDeliveryPartnerRepository({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  Future<List<DeliveryPartner>>? _ongoingRequest;
  List<DeliveryPartner>? _cachedPartners;
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

  DeliveryPartner _resolvePartnerImageUrl(
    DeliveryPartner partner,
    String baseUrl,
  ) {
    return partner.copyWith(
      imageUrl: _resolveImageUrl(partner.imageUrl, baseUrl),
    );
  }

  Future<List<DeliveryPartner>> _fetchPartnersFromBaseUrl(String baseUrl) async {
    try {
      final response = await HttpRequest.request(
        '$baseUrl/api/delivery-partners?productOptions=1',
        method: 'GET',
        requestHeaders: const {
          'Accept': 'application/json',
        },
      ).timeout(_requestTimeout);

      if (response.status != 200) {
        throw _BaseUrlAttemptFailure('${response.status}');
      }

      final decoded =
          jsonDecode(response.responseText ?? '{}') as Map<String, dynamic>;
      final items = (decoded['partners'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>();

      _preferredBaseUrl = baseUrl;

      final seenPartnerIds = <String>{};
      return items
          .map(DeliveryPartner.fromJson)
          .map((partner) => _resolvePartnerImageUrl(partner, baseUrl))
          .where((partner) {
            final partnerId = partner.id.trim();
            final partnerKey = partnerId.toLowerCase();
            if (partnerId.isEmpty ||
                !partner.isEnabled ||
                seenPartnerIds.contains(partnerKey)) {
              return false;
            }
            seenPartnerIds.add(partnerKey);
            return true;
          })
          .toList(growable: false);
    } on TimeoutException {
      throw const _BaseUrlAttemptFailure('timeout');
    } catch (_) {
      throw const _BaseUrlAttemptFailure('connection failed');
    }
  }

  Future<List<DeliveryPartner>> _fetchPartnersFromFallbackBaseUrls() {
    final failures = <String>[];
    final completer = Completer<List<DeliveryPartner>>();
    var remaining = baseUrls.length;

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          DeliveryPartnerRepositoryException(
            'Could not connect to backend delivery partners. Tried: ${baseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}. Make sure backend/server.js is running.',
          ),
        );
      }
    }

    for (final baseUrl in baseUrls) {
      _fetchPartnersFromBaseUrl(baseUrl).then((partners) {
        if (!completer.isCompleted) {
          completer.complete(partners);
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
    final cachedPartners = _cachedPartners;

    if (lastSuccessfulFetchAt == null || cachedPartners == null) {
      return false;
    }

    return DateTime.now().difference(lastSuccessfulFetchAt) <=
        _memoryCacheLifetime;
  }

  @override
  Future<List<DeliveryPartner>> fetchDeliveryPartners({
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh && _hasFreshCache) {
      return _cachedPartners!;
    }

    final ongoingRequest = _ongoingRequest;
    if (ongoingRequest != null) {
      return ongoingRequest;
    }

    final request = () async {
      final preferredBaseUrl = _preferredBaseUrl;

      if (preferredBaseUrl != null) {
        try {
          return await _fetchPartnersFromBaseUrl(preferredBaseUrl);
        } on _BaseUrlAttemptFailure {
          if (_preferredBaseUrl == preferredBaseUrl) {
            _preferredBaseUrl = null;
          }
        }
      }

      return _fetchPartnersFromFallbackBaseUrls();
    }();

    _ongoingRequest = request;

    try {
      final partners = await request;
      _cachedPartners = partners;
      _lastSuccessfulFetchAt = DateTime.now();
      return partners;
    } finally {
      if (identical(_ongoingRequest, request)) {
        _ongoingRequest = null;
      }
    }
  }
}

class DeliveryPartnerRepositoryException implements Exception {
  const DeliveryPartnerRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message);

  final String message;
}
