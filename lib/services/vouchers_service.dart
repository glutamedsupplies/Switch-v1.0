import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:switch_app/services/local_api_base_urls.dart';

const _requestTimeout = Duration(seconds: 8);
final _client = HttpClient()..connectionTimeout = _requestTimeout;

class BuyerVoucherItem {
  const BuyerVoucherItem({
    required this.status,
    required this.title,
    required this.subtitle,
    required this.minimumSpend,
    required this.code,
    required this.badge,
    required this.dateLabel,
    required this.actionLabel,
    required this.note,
    required this.icon,
    this.kind = 'ticket',
    this.discountType = 'percent',
    this.discountValue = '',
    this.freeShipping = false,
    this.platformId = 'all',
    this.sellerAdminId = '',
    this.passive = false,
    this.statusAt,
    this.rawDate = '',
  });

  final String status;
  final String title;
  final String subtitle;
  final String minimumSpend;
  final String code;
  final String badge;
  final String dateLabel;
  final String actionLabel;
  final String note;
  final IconData icon;
  final String kind;
  final String discountType;
  final String discountValue;
  final bool freeShipping;
  final String platformId;
  final String sellerAdminId;
  final bool passive;
  final DateTime? statusAt;
  final String rawDate;

  static const retention = Duration(days: 30);

  int get minimumSpendAmount {
    final digits = minimumSpend.replaceAll(RegExp(r'[^\d]'), '');
    return int.tryParse(digits) ?? 0;
  }

  int get discountValueAmount {
    final digits = discountValue.replaceAll(RegExp(r'[^\d]'), '');
    return int.tryParse(digits) ?? 0;
  }

  bool get isPercentDiscount =>
      discountType.trim().toLowerCase() != 'fixed';

  bool get isFixedDiscount => !isPercentDiscount;

  /// Discount amount against [totalPurchase]. Percent uses % of total;
  /// fixed uses a peso amount capped at the total.
  double discountForTotal(double totalPurchase) {
    if (totalPurchase <= 0 || discountValueAmount <= 0) return 0;
    if (isFixedDiscount) {
      final amount = discountValueAmount.toDouble();
      return amount > totalPurchase ? totalPurchase : amount;
    }
    final pct = discountValueAmount.clamp(0, 100);
    return totalPurchase * (pct / 100);
  }

  bool get isActive => status.trim().toLowerCase() == 'active';

  bool get isUsed => status.trim().toLowerCase() == 'used';

  /// Parsed expiry instant for active vouchers (`date` / ISO). Date-only
  /// display strings ("Dec 31, 2026") resolve to end of that local day.
  DateTime? get expiresAt {
    final fromIso = DateTime.tryParse(rawDate.trim());
    if (fromIso != null) return fromIso;
    return _parseDisplayExpiryDate(rawDate);
  }

  static const Map<String, int> _monthNameToNumber = {
    'jan': 1,
    'feb': 2,
    'mar': 3,
    'apr': 4,
    'may': 5,
    'jun': 6,
    'jul': 7,
    'aug': 8,
    'sep': 9,
    'oct': 10,
    'nov': 11,
    'dec': 12,
  };

  static DateTime? _parseDisplayExpiryDate(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    final match = RegExp(
      r'^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$',
    ).firstMatch(trimmed);
    if (match == null) return null;
    final month = _monthNameToNumber[match.group(1)!.toLowerCase()];
    final day = int.tryParse(match.group(2)!);
    final year = int.tryParse(match.group(3)!);
    if (month == null || day == null || year == null) return null;
    if (day < 1 || day > 31 || year < 1970) return null;
    return DateTime(year, month, day, 23, 59, 59);
  }

  bool isUnlockedForSpend(double spend) {
    if (!isActive) return false;
    return spend + 0.009 >= minimumSpendAmount;
  }

  bool get isWithinRetention {
    if (status == 'active') return true;
    final anchor =
        statusAt ?? DateTime.tryParse(rawDate) ?? _parseDisplayDate(rawDate);
    if (anchor == null) return true;
    return DateTime.now().difference(anchor) < retention;
  }

  bool appliesToSeller(String adminId) {
    final wanted = adminId.trim().toLowerCase();
    final scoped = sellerAdminId.trim().toLowerCase();
    if (scoped.isEmpty) return true;
    if (wanted.isEmpty || wanted == 'admin') return false;
    return scoped == wanted;
  }

  bool appliesToPlatform(String platformId) {
    final wanted = platformId.trim().toLowerCase();
    final scoped = this.platformId.trim().toLowerCase();
    if (wanted.isEmpty || wanted == 'none' || wanted == 'all') return true;
    if (scoped.isEmpty || scoped == 'all') return true;
    return scoped == wanted;
  }

  /// Passive vouchers are promoted automatically. Vouchers scoped to all
  /// platforms are promoted as general offers even when Passive is off.
  bool get appearsInSearchResults {
    final scoped = platformId.trim().toLowerCase();
    return isActive && (passive || scoped.isEmpty || scoped == 'all');
  }

  String get platformLabel {
    final id = platformId.trim().toLowerCase();
    if (id.isEmpty || id == 'all') return 'All platforms';
    if (id == 'shop') return 'Shop';
    if (id == 'food') return 'Food';
    if (id == 'hotels') return 'Hotel';
    if (id == 'resort') return 'Resort';
    return id[0].toUpperCase() + id.substring(1);
  }

  static DateTime? _parseDisplayDate(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    return DateTime.tryParse(trimmed);
  }

  static IconData iconForKind(String kind) {
    switch (kind) {
      case 'percent':
        return Icons.percent_rounded;
      case 'gift':
        return Icons.redeem_rounded;
      case 'shipping':
        return Icons.local_shipping_rounded;
      case 'shopping':
        return Icons.shopping_bag_rounded;
      case 'loyalty':
        return Icons.loyalty_rounded;
      default:
        return Icons.confirmation_number_rounded;
    }
  }

  static String actionLabelFor(String action, String status) {
    switch (action) {
      case 'apply':
        return 'Apply';
      case 'used':
        return 'Used';
      case 'expired':
        return 'Expired';
      case 'useNow':
        return 'Use Now';
      default:
        if (status == 'used') return 'Used';
        if (status == 'expired') return 'Expired';
        return 'Use Now';
    }
  }

  factory BuyerVoucherItem.fromJson(Map<String, dynamic> json) {
    final status = (json['status'] ?? 'active').toString();
    final kind = (json['kind'] ?? 'ticket').toString();
    final action = (json['action'] ?? '').toString();
    final minSpendRaw = (json['minimumSpend'] ?? '0').toString().replaceAll(
      RegExp(r'[^\d]'),
      '',
    );
    final minSpend = minSpendRaw.isEmpty ? '0' : minSpendRaw;
    final date = (json['date'] ?? '').toString().trim();
    final dateLabel = status == 'active'
        ? 'Expires ${date.isEmpty ? '—' : date}'
        : status == 'used'
        ? 'Used ${date.isEmpty ? '—' : date}'
        : 'Expired ${date.isEmpty ? '—' : date}';
    final statusAtRaw = (json['statusAt'] ?? '').toString().trim();
    final platformId = (json['platformId'] ?? json['platform'] ?? 'all')
        .toString()
        .trim()
        .toLowerCase();
    final sellerAdminId = (json['sellerAdminId'] ?? json['adminId'] ?? '')
        .toString()
        .trim()
        .toLowerCase();
    final passiveRaw = json['passive'] ?? json['isPassive'] ?? false;
    final passive =
        passiveRaw == true ||
        passiveRaw.toString().trim().toLowerCase() == 'true' ||
        passiveRaw.toString().trim() == '1';
    final discountTypeRaw =
        (json['discountType'] ?? '').toString().trim().toLowerCase();
    final discountType = discountTypeRaw == 'fixed'
        ? 'fixed'
        : (kind == 'gift' ? 'fixed' : 'percent');
    final discountValue = (json['discountValue'] ?? '')
        .toString()
        .replaceAll(RegExp(r'[^\d]'), '');
    final freeShippingRaw =
        json['freeShipping'] ?? json['isFreeShipping'] ?? kind == 'shipping';
    final freeShipping =
        freeShippingRaw == true ||
        freeShippingRaw.toString().trim().toLowerCase() == 'true' ||
        freeShippingRaw.toString().trim() == '1';
    final storedTitle = (json['title'] ?? '').toString().trim();
    final derivedTitle = discountValue.isNotEmpty
        ? (discountType == 'fixed'
              ? '\u20B1$discountValue OFF'
              : '$discountValue% OFF')
        : (freeShipping ? 'Free Shipping' : '');
    final title = storedTitle.isNotEmpty ? storedTitle : derivedTitle;

    return BuyerVoucherItem(
      status: status,
      title: title,
      subtitle: (json['subtitle'] ?? '').toString(),
      minimumSpend: '\u20B1$minSpend',
      code: (json['code'] ?? '').toString().trim().toUpperCase(),
      badge: (json['badge'] ?? 'Sitewide').toString(),
      dateLabel: dateLabel,
      actionLabel: actionLabelFor(action, status),
      note: (json['note'] ?? 'A deal\nfor you!').toString().replaceAll(
        RegExp(r'<br\s*/?>', caseSensitive: false),
        '\n',
      ),
      icon: iconForKind(kind),
      kind: kind,
      discountType: discountType,
      discountValue: discountValue,
      freeShipping: freeShipping,
      platformId: platformId.isEmpty ? 'all' : platformId,
      sellerAdminId: sellerAdminId,
      passive: passive,
      statusAt: DateTime.tryParse(statusAtRaw),
      rawDate: date,
    );
  }
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
      // try next base url
    }
  }
  return null;
}

/// Loads every voucher for the buyer account wallet (right panel).
/// Platform scoping is enforced at use/checkout time, not by hiding inventory.
Future<List<BuyerVoucherItem>> fetchBuyerVouchers({
  String platformId = '',
  String sellerAdminId = '',
}) async {
  final result = await _tryEachBaseUrl((baseUrl) async {
    final query = <String, String>{};
    final sellerScope = sellerAdminId.trim();
    if (sellerScope.isNotEmpty) {
      query['sellerAdminId'] = sellerScope;
    }
    final uri = Uri.parse('$baseUrl/api/vouchers').replace(queryParameters: query);
    final request = await _client.getUrl(uri).timeout(_requestTimeout);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    final response = await request.close().timeout(_requestTimeout);
    final body = await response.transform(utf8.decoder).join();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }
    final decoded = body.isEmpty
        ? const <String, dynamic>{}
        : jsonDecode(body) as Map<String, dynamic>;
    final raw = decoded['vouchers'];
    if (raw is! List) {
      return const <BuyerVoucherItem>[];
    }
    final items = raw
        .whereType<Map>()
        .map(
          (item) => BuyerVoucherItem.fromJson(Map<String, dynamic>.from(item)),
        )
        .where(
          (item) =>
              item.code.isNotEmpty &&
              item.title.isNotEmpty &&
              item.isWithinRetention,
        )
        .toList(growable: false);
    // Keep the account wallet complete; callers can check [appliesToPlatform].
    final wanted = platformId.trim().toLowerCase();
    if (wanted.isEmpty || wanted == 'none' || wanted == 'all') {
      return items;
    }
    return items;
  });
  return result ?? const <BuyerVoucherItem>[];
}

const _sellerVoucherAdminCacheDuration = Duration(seconds: 30);
final Map<String, Future<Set<String>>> _sellerVoucherAdminIdsCache =
    <String, Future<Set<String>>>{};
DateTime? _sellerVoucherAdminIdsCacheStartedAt;

/// Admin IDs that currently have an active seller-created voucher
/// (excludes sitewide vouchers with empty [BuyerVoucherItem.sellerAdminId]).
Future<Set<String>> activeSellerVoucherAdminIds({
  String platformId = '',
  bool forceRefresh = false,
}) {
  final now = DateTime.now();
  final cacheIsFresh =
      _sellerVoucherAdminIdsCacheStartedAt != null &&
      now.difference(_sellerVoucherAdminIdsCacheStartedAt!) <
          _sellerVoucherAdminCacheDuration;
  if (forceRefresh || !cacheIsFresh) {
    _sellerVoucherAdminIdsCacheStartedAt = now;
    _sellerVoucherAdminIdsCache.clear();
  }

  final platformScope = platformId.trim().toLowerCase();
  return _sellerVoucherAdminIdsCache.putIfAbsent(platformScope, () async {
    final vouchers = await fetchBuyerVouchers();
    final ids = <String>{};
    for (final voucher in vouchers) {
      if (!voucher.isActive) continue;
      final seller = voucher.sellerAdminId.trim().toLowerCase();
      if (seller.isEmpty || seller == 'admin') continue;
      if (!voucher.appliesToPlatform(platformScope)) continue;
      ids.add(seller);
    }
    return ids;
  });
}

Future<bool> productHasSellerCreatedVoucher({
  required String sellerAdminId,
  String platformId = '',
  bool forceRefresh = false,
}) async {
  final admin = sellerAdminId.trim().toLowerCase();
  if (admin.isEmpty || admin == 'admin') return false;
  final ids = await activeSellerVoucherAdminIds(
    platformId: platformId,
    forceRefresh: forceRefresh,
  );
  return ids.contains(admin);
}

/// Active seller-store voucher for a listing, with the soonest expiry when set.
class SellerVoucherOffer {
  const SellerVoucherOffer({
    required this.available,
    this.expiresAt,
    this.freeShipping = false,
  });

  final bool available;
  final DateTime? expiresAt;
  final bool freeShipping;

  static const none = SellerVoucherOffer(available: false);
}

const _sellerVoucherOfferCacheDuration = Duration(seconds: 30);
Future<List<BuyerVoucherItem>>? _sellerVoucherOfferSourceCache;
DateTime? _sellerVoucherOfferCacheStartedAt;
final Map<String, Future<SellerVoucherOffer>> _sellerVoucherOfferCache =
    <String, Future<SellerVoucherOffer>>{};

Future<SellerVoucherOffer> productSellerVoucherOffer({
  required String sellerAdminId,
  String platformId = '',
  bool forceRefresh = false,
}) {
  final admin = sellerAdminId.trim().toLowerCase();
  if (admin.isEmpty || admin == 'admin') {
    return Future.value(SellerVoucherOffer.none);
  }

  final now = DateTime.now();
  final cacheIsFresh =
      _sellerVoucherOfferSourceCache != null &&
      _sellerVoucherOfferCacheStartedAt != null &&
      now.difference(_sellerVoucherOfferCacheStartedAt!) <
          _sellerVoucherOfferCacheDuration;
  if (forceRefresh || !cacheIsFresh) {
    _sellerVoucherOfferCacheStartedAt = now;
    _sellerVoucherOfferSourceCache = fetchBuyerVouchers();
    _sellerVoucherOfferCache.clear();
  }

  final platformScope = platformId.trim().toLowerCase();
  final cacheKey = '$platformScope|$admin';
  return _sellerVoucherOfferCache.putIfAbsent(cacheKey, () async {
    final vouchers =
        await (_sellerVoucherOfferSourceCache ?? fetchBuyerVouchers());
    var available = false;
    var freeShipping = false;
    DateTime? earliest;
    for (final voucher in vouchers) {
      if (!voucher.isActive) continue;
      final seller = voucher.sellerAdminId.trim().toLowerCase();
      if (seller.isEmpty || seller == 'admin' || seller != admin) continue;
      if (!voucher.appliesToPlatform(platformScope)) continue;
      available = true;
      if (voucher.freeShipping ||
          voucher.kind.trim().toLowerCase() == 'shipping') {
        freeShipping = true;
      }
      final expiry = voucher.expiresAt;
      if (expiry == null) continue;
      if (earliest == null || expiry.isBefore(earliest)) {
        earliest = expiry;
      }
    }
    return available
        ? SellerVoucherOffer(
            available: true,
            expiresAt: earliest,
            freeShipping: freeShipping,
          )
        : SellerVoucherOffer.none;
  });
}

const _searchVoucherCacheDuration = Duration(seconds: 15);
Future<List<BuyerVoucherItem>>? _searchVoucherSourceCache;
final Map<String, Future<List<BuyerVoucherItem>>> _searchVoucherPlatformCache =
    <String, Future<List<BuyerVoucherItem>>>{};
DateTime? _searchVoucherCacheStartedAt;

/// Loads the general/passive offers shown below company delivery information.
/// Search result cards share one short-lived backend request, then filter by
/// platform and the company [sellerAdminId] so store vouchers only appear on
/// that seller's card.
Future<List<BuyerVoucherItem>> fetchSearchResultVouchers({
  String platformId = '',
  String sellerAdminId = '',
  bool forceRefresh = false,
}) {
  final now = DateTime.now();
  final cacheIsFresh =
      _searchVoucherSourceCache != null &&
      _searchVoucherCacheStartedAt != null &&
      now.difference(_searchVoucherCacheStartedAt!) <
          _searchVoucherCacheDuration;
  if (forceRefresh || !cacheIsFresh) {
    _searchVoucherCacheStartedAt = now;
    _searchVoucherSourceCache = fetchBuyerVouchers();
    _searchVoucherPlatformCache.clear();
  }

  final platformScope = platformId.trim().toLowerCase();
  final sellerScope = sellerAdminId.trim().toLowerCase();
  final cacheKey = '$platformScope|$sellerScope';
  return _searchVoucherPlatformCache.putIfAbsent(cacheKey, () async {
    final vouchers = await (_searchVoucherSourceCache ?? fetchBuyerVouchers());
    return vouchers
        .where(
          (voucher) =>
              voucher.appearsInSearchResults &&
              voucher.appliesToPlatform(platformScope) &&
              voucher.appliesToSeller(sellerScope),
        )
        .toList(growable: false);
  });
}
