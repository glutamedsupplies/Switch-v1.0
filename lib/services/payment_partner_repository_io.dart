import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/models/payment_partner.dart';
import 'package:gms_shopping/services/local_api_base_urls.dart';
import 'package:gms_shopping/services/payment_partner_repository_base.dart';

const _requestTimeout = Duration(seconds: 3);
const _memoryCacheLifetime = Duration(seconds: 15);
String? _preferredBaseUrl;

PaymentPartnerRepository createPaymentPartnerRepository({String? baseUrl}) {
  return _HttpPaymentPartnerRepository(
    baseUrls: _buildBaseUrls(baseUrl: baseUrl),
  );
}

List<String> _buildBaseUrls({String? baseUrl}) {
  return buildLocalApiBaseUrls(
    baseUrl: baseUrl,
    isAndroid: Platform.isAndroid,
  );
}

class _HttpPaymentPartnerRepository implements PaymentPartnerRepository {
  _HttpPaymentPartnerRepository({
    required this.baseUrls,
  });

  final List<String> baseUrls;
  final HttpClient _client = HttpClient();
  Future<List<PaymentPartner>>? _ongoingRequest;
  List<PaymentPartner>? _cachedPartners;
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

  PaymentPartner _resolvePartnerImageUrl(
    PaymentPartner partner,
    String baseUrl,
  ) {
    return partner.copyWith(
      imageUrl: _resolveImageUrl(partner.imageUrl, baseUrl),
    );
  }

  Future<List<PaymentPartner>> _fetchPartnersFromBaseUrl(String baseUrl) async {
    try {
      final request = await _client
          .getUrl(Uri.parse('$baseUrl/api/payment-partners'))
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

      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final items = (decoded['partners'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>();

      _preferredBaseUrl = baseUrl;

      final seenPartnerIds = <String>{};
      return items
          .map(PaymentPartner.fromJson)
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

  Future<List<PaymentPartner>> _fetchPartnersFromFallbackBaseUrls() {
    final failures = <String>[];
    final completer = Completer<List<PaymentPartner>>();
    var remaining = baseUrls.length;

    void completeFailure(String baseUrl, String message) {
      failures.add('$baseUrl -> $message');
      remaining -= 1;

      if (remaining == 0 && !completer.isCompleted) {
        completer.completeError(
          PaymentPartnerRepositoryException(
            'Backend payment partners not connected. Tried: ${baseUrls.join(', ')}. '
            'Failed results: ${failures.join(' | ')}. '
            'If you use a real phone, connect by USB then run: adb reverse tcp:8080 tcp:8080',
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
  Future<List<PaymentPartner>> fetchPaymentPartners({
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

class PaymentPartnerRepositoryException implements Exception {
  const PaymentPartnerRepositoryException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _BaseUrlAttemptFailure implements Exception {
  const _BaseUrlAttemptFailure(this.message);

  final String message;
}
