import 'dart:convert';
import 'dart:io';

import 'package:gms_shopping/services/local_api_base_urls.dart';
import 'package:gms_shopping/utils/auth_session.dart';

const _requestTimeout = Duration(seconds: 8);
final _client = HttpClient()..connectionTimeout = _requestTimeout;

class BuyerFlashDeal {
  const BuyerFlashDeal({
    required this.id,
    required this.productId,
    required this.flashPrice,
    required this.originalPriceSnapshot,
    required this.dealStockRemaining,
    required this.startsAt,
    required this.endsAt,
    required this.status,
    this.platformId = '',
    this.productName = '',
    this.variantId = '',
    this.perBuyerLimit = 1,
    this.dealStockLimit = 0,
    this.serverNow,
  });

  final String id;
  final String productId;
  final double flashPrice;
  final double originalPriceSnapshot;
  final int dealStockRemaining;
  final DateTime startsAt;
  final DateTime endsAt;
  final String status;
  final String platformId;
  final String productName;
  final String variantId;
  final int perBuyerLimit;
  final int dealStockLimit;
  final DateTime? serverNow;

  bool get isLive => status.trim().toLowerCase() == 'live';

  bool get isAlmostGone {
    if (!isLive || dealStockRemaining <= 0) return false;
    if (dealStockRemaining <= 3) return true;
    if (dealStockLimit > 0) {
      return dealStockRemaining <= (dealStockLimit * 0.2).ceil();
    }
    return false;
  }

  bool matchesVariant(String? selectedVariantId) {
    final dealVariant = variantId.trim();
    if (dealVariant.isEmpty) return true;
    final selected = (selectedVariantId ?? '').trim();
    if (selected.isEmpty) return true;
    return dealVariant == selected;
  }

  double? get discountAmount {
    if (!(flashPrice >= 0) || !(originalPriceSnapshot > flashPrice)) {
      return null;
    }
    return originalPriceSnapshot - flashPrice;
  }

  int? get discountPercent {
    final amount = discountAmount;
    if (amount == null || originalPriceSnapshot <= 0) return null;
    final percent = ((amount / originalPriceSnapshot) * 100).round();
    return percent > 0 ? percent : null;
  }

  factory BuyerFlashDeal.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(Object? raw) {
      final value = DateTime.tryParse('${raw ?? ''}'.trim());
      return value ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
    }

    return BuyerFlashDeal(
      id: '${json['id'] ?? ''}'.trim(),
      productId: '${json['productId'] ?? ''}'.trim(),
      flashPrice: (json['flashPrice'] as num?)?.toDouble() ?? 0,
      originalPriceSnapshot:
          (json['originalPriceSnapshot'] as num?)?.toDouble() ?? 0,
      dealStockRemaining: (json['dealStockRemaining'] as num?)?.toInt() ?? 0,
      startsAt: parseDate(json['startsAt']),
      endsAt: parseDate(json['endsAt']),
      status: '${json['status'] ?? ''}'.trim().toLowerCase(),
      platformId: '${json['platformId'] ?? ''}'.trim(),
      productName: '${json['productName'] ?? ''}'.trim(),
      variantId: '${json['variantId'] ?? ''}'.trim(),
      perBuyerLimit: (json['perBuyerLimit'] as num?)?.toInt() ?? 1,
      dealStockLimit: (json['dealStockLimit'] as num?)?.toInt() ?? 0,
      serverNow: DateTime.tryParse('${json['serverNow'] ?? ''}'.trim()),
    );
  }
}

class FlashDealReservation {
  const FlashDealReservation({
    required this.id,
    required this.dealId,
    required this.productId,
    required this.lockedUnitPrice,
    required this.quantity,
    required this.expiresAt,
    this.variantId = '',
    this.status = 'held',
  });

  final String id;
  final String dealId;
  final String productId;
  final String variantId;
  final double lockedUnitPrice;
  final int quantity;
  final DateTime expiresAt;
  final String status;

  bool get isHeld => status.trim().toLowerCase() == 'held';

  bool get isExpired =>
      !isHeld || !expiresAt.isAfter(DateTime.now().toUtc());

  factory FlashDealReservation.fromJson(Map<String, dynamic> json) {
    return FlashDealReservation(
      id: '${json['id'] ?? ''}'.trim(),
      dealId: '${json['dealId'] ?? ''}'.trim(),
      productId: '${json['productId'] ?? ''}'.trim(),
      variantId: '${json['variantId'] ?? ''}'.trim(),
      lockedUnitPrice: (json['lockedUnitPrice'] as num?)?.toDouble() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      expiresAt: DateTime.tryParse('${json['expiresAt'] ?? ''}'.trim()) ??
          DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
      status: '${json['status'] ?? 'held'}'.trim().toLowerCase(),
    );
  }
}

class FlashDealReserveException implements Exception {
  FlashDealReserveException(this.message);
  final String message;

  @override
  String toString() => message;
}

Future<T?> _tryEachBaseUrl<T>(Future<T?> Function(String baseUrl) work) async {
  for (final baseUrl in buildLocalApiBaseUrls(isAndroid: Platform.isAndroid)) {
    try {
      final result = await work(baseUrl);
      if (result != null) {
        rememberWorkingLocalApiBaseUrl(baseUrl);
        return result;
      }
    } catch (_) {
      // try next
    }
  }
  return null;
}

Future<void> _setAccountHeaders(HttpHeaders headers) async {
  final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
  final accountEmail = (await AuthSession.getAccountEmail())?.trim() ?? '';
  final requestAccountId = accountId.isNotEmpty ? accountId : accountEmail;
  if (requestAccountId.isNotEmpty) {
    headers.set('X-GMS-Account-ID', requestAccountId);
  }
  if (accountEmail.isNotEmpty) {
    headers.set('X-GMS-Account-Email', accountEmail);
  }
}

Future<Map<String, dynamic>?> _postJson(
  String path, {
  Map<String, dynamic>? body,
}) async {
  return _tryEachBaseUrl((baseUrl) async {
    final uri = Uri.parse('$baseUrl$path');
    final request = await _client.postUrl(uri);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    request.headers.set(HttpHeaders.contentTypeHeader, 'application/json');
    await _setAccountHeaders(request.headers);
    request.write(jsonEncode(body ?? const <String, dynamic>{}));
    final response = await request.close().timeout(_requestTimeout);
    final raw = await response.transform(utf8.decoder).join();
    Map<String, dynamic>? decoded;
    try {
      final parsed = jsonDecode(raw);
      if (parsed is Map) {
        decoded = Map<String, dynamic>.from(parsed);
      }
    } catch (_) {
      decoded = null;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = '${decoded?['message'] ?? 'Request failed (${response.statusCode}).'}'
          .trim();
      throw FlashDealReserveException(
        message.isEmpty ? 'Flash Deal request failed.' : message,
      );
    }
    return decoded;
  });
}

Future<Map<String, BuyerFlashDeal>>? _liveFlashDealsSourceCache;
String _liveFlashDealsSourcePlatform = '';

void clearBuyerFlashDealsCache() {
  _liveFlashDealsSourceCache = null;
  _liveFlashDealsSourcePlatform = '';
}

Future<List<BuyerFlashDeal>> fetchLiveBuyerFlashDeals({
  String platformId = '',
}) async {
  final scopedPlatform = platformId.trim().toLowerCase();
  final result = await _tryEachBaseUrl((baseUrl) async {
    final query = <String, String>{'status': 'live'};
    if (scopedPlatform.isNotEmpty) {
      query['platformId'] = scopedPlatform;
    }
    final uri = Uri.parse(
      '$baseUrl/api/flash-deals',
    ).replace(queryParameters: query);
    final request = await _client.getUrl(uri);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    final response = await request.close().timeout(_requestTimeout);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }
    final body = await response.transform(utf8.decoder).join();
    final decoded = jsonDecode(body);
    if (decoded is! Map) return null;
    final raw = decoded['deals'];
    if (raw is! List) return const <BuyerFlashDeal>[];
    return raw
        .whereType<Map>()
        .map(
          (entry) =>
              BuyerFlashDeal.fromJson(Map<String, dynamic>.from(entry)),
        )
        .where((deal) => deal.isLive && deal.productId.isNotEmpty)
        .toList(growable: false);
  });
  return result ?? const <BuyerFlashDeal>[];
}

Future<Map<String, BuyerFlashDeal>> loadLiveFlashDealsByProductId({
  String platformId = '',
}) {
  final scopedPlatform = platformId.trim().toLowerCase();
  if (_liveFlashDealsSourceCache != null &&
      _liveFlashDealsSourcePlatform == scopedPlatform) {
    return _liveFlashDealsSourceCache!;
  }
  _liveFlashDealsSourcePlatform = scopedPlatform;
  _liveFlashDealsSourceCache = () async {
    final deals = await fetchLiveBuyerFlashDeals(platformId: scopedPlatform);
    final map = <String, BuyerFlashDeal>{};
    for (final deal in deals) {
      final existing = map[deal.productId];
      if (existing == null) {
        map[deal.productId] = deal;
        continue;
      }
      // Prefer deepest discount, then soonest expiry.
      final existingPct = existing.discountPercent ?? 0;
      final nextPct = deal.discountPercent ?? 0;
      if (nextPct > existingPct ||
          (nextPct == existingPct && deal.endsAt.isBefore(existing.endsAt))) {
        map[deal.productId] = deal;
      }
    }
    return map;
  }();
  return _liveFlashDealsSourceCache!;
}

Future<BuyerFlashDeal?> productLiveFlashDeal({
  required String productId,
  String platformId = '',
  String? variantId,
}) async {
  final id = productId.trim();
  if (id.isEmpty) return null;
  final map = await loadLiveFlashDealsByProductId(platformId: platformId);
  final deal = map[id];
  if (deal == null) return null;
  if (!deal.matchesVariant(variantId)) return null;
  return deal;
}

Future<FlashDealReservation> reserveFlashDealStock({
  required String dealId,
  required int quantity,
  String variantId = '',
  String replaceReservationId = '',
}) async {
  final id = dealId.trim();
  if (id.isEmpty) {
    throw FlashDealReserveException('Flash Deal id is required.');
  }
  final decoded = await _postJson(
    '/api/flash-deals/${Uri.encodeComponent(id)}/reserve',
    body: <String, dynamic>{
      'quantity': quantity < 1 ? 1 : quantity,
      if (variantId.trim().isNotEmpty) 'variantId': variantId.trim(),
      if (replaceReservationId.trim().isNotEmpty)
        'replaceReservationId': replaceReservationId.trim(),
    },
  );
  if (decoded == null) {
    throw FlashDealReserveException(
      'Unable to lock Flash Deal price right now.',
    );
  }
  final reservationRaw = decoded['reservation'];
  if (reservationRaw is! Map) {
    throw FlashDealReserveException('Invalid Flash Deal reservation response.');
  }
  final reservation = FlashDealReservation.fromJson(
    Map<String, dynamic>.from(reservationRaw),
  );
  if (reservation.id.isEmpty) {
    throw FlashDealReserveException('Invalid Flash Deal reservation response.');
  }
  clearBuyerFlashDealsCache();
  return reservation;
}

Future<FlashDealReservation?> extendFlashDealReservation(
  String reservationId,
) async {
  final id = reservationId.trim();
  if (id.isEmpty) return null;
  try {
    final decoded = await _postJson(
      '/api/flash-deals/reservations/${Uri.encodeComponent(id)}/extend',
    );
    final reservationRaw = decoded?['reservation'];
    if (reservationRaw is! Map) return null;
    return FlashDealReservation.fromJson(
      Map<String, dynamic>.from(reservationRaw),
    );
  } on FlashDealReserveException {
    return null;
  }
}

Future<void> releaseFlashDealReservation(String reservationId) async {
  final id = reservationId.trim();
  if (id.isEmpty) return;
  try {
    await _postJson(
      '/api/flash-deals/reservations/${Uri.encodeComponent(id)}/release',
    );
    clearBuyerFlashDealsCache();
  } catch (_) {
    // Best-effort release; TTL expire covers leftovers.
  }
}

Future<void> convertFlashDealReservations(List<String> reservationIds) async {
  final ids = reservationIds
      .map((value) => value.trim())
      .where((value) => value.isNotEmpty)
      .toList(growable: false);
  if (ids.isEmpty) return;
  await _postJson(
    '/api/flash-deals/reservations/convert',
    body: <String, dynamic>{'reservationIds': ids},
  );
  clearBuyerFlashDealsCache();
}
