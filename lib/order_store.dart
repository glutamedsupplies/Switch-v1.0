import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:gms_shopping/services/order_sync.dart';
import 'package:gms_shopping/utils/auth_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum OrderStageKey {
  toPay,
  toPrepare,
  toShip,
  toReceive,
  toReview,
  returnRequest,
  cancelled,
}

const Duration _highRatingReviewLockDuration = Duration(days: 30);

class OrderItemAddOn {
  const OrderItemAddOn({
    required this.id,
    required this.name,
    this.quantity = 1,
  });

  final String id;
  final String name;
  final int quantity;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'quantity': quantity,
    };
  }

  factory OrderItemAddOn.fromJson(Map<String, dynamic> json) {
    return OrderItemAddOn(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
    );
  }
}

enum OrderReviewMediaType {
  image,
  video,
}

class OrderReviewMedia {
  const OrderReviewMedia({
    required this.type,
    required this.url,
    this.id = '',
    this.fileName = '',
    this.contentType = '',
    this.sizeBytes = 0,
    this.uploadedAtEpochMs = 0,
  });

  final OrderReviewMediaType type;
  final String url;
  final String id;
  final String fileName;
  final String contentType;
  final int sizeBytes;
  final int uploadedAtEpochMs;

  bool get isVideo => type == OrderReviewMediaType.video;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'type': type.name,
      'url': url,
      'mediaUrl': url,
      'imageUrl': isVideo ? '' : url,
      'videoUrl': isVideo ? url : '',
      'fileName': fileName,
      'contentType': contentType,
      'sizeBytes': sizeBytes,
      'uploadedAtEpochMs': uploadedAtEpochMs,
    };
  }

  static OrderReviewMedia? fromJson(Object? value) {
    if (value is OrderReviewMedia) {
      return value;
    }

    if (value is String) {
      final url = value.trim();
      if (url.isEmpty) {
        return null;
      }
      return OrderReviewMedia(
        type: _inferOrderReviewMediaType(url: url),
        url: url,
      );
    }

    if (value is! Map) {
      return null;
    }

    final json = Map<String, dynamic>.from(value);
    final url = _firstNonEmptyString(<Object?>[
      json['url'],
      json['mediaUrl'],
      json['src'],
      json['imageUrl'],
      json['videoUrl'],
    ]);
    if (url.isEmpty) {
      return null;
    }

    final contentType = json['contentType']?.toString().trim() ?? '';
    return OrderReviewMedia(
      type: _inferOrderReviewMediaType(
        url: url,
        type: json['type'] ?? json['mediaType'] ?? json['kind'],
        contentType: contentType,
      ),
      url: url,
      id: json['id']?.toString().trim() ?? '',
      fileName: json['fileName']?.toString().trim() ??
          json['name']?.toString().trim() ??
          '',
      contentType: contentType,
      sizeBytes: _normalizeNonNegativeInt(json['sizeBytes'] ?? json['size']),
      uploadedAtEpochMs:
          _normalizeNonNegativeInt(json['uploadedAtEpochMs'] ?? json['createdAtEpochMs']),
    );
  }
}

class OrderEntryData {
  const OrderEntryData({
    required this.id,
    this.adminId = '',
    this.accountId = '',
    required this.productId,
    required this.productName,
    required this.productImageUrl,
    required this.variantId,
    required this.variantName,
    this.addOns = const <OrderItemAddOn>[],
    required this.quantity,
    required this.unitPrice,
    this.flashDealId = '',
    this.flashReservationId = '',
    required this.stage,
    required this.createdAtEpochMs,
    this.grandTotalAmount = 0,
    this.amountToPayAmount = 0,
    this.remainingBalanceAmount = 0,
    this.shippingFeeAmount = 0,
    this.paymentOptionLabel = '',
    this.paymentPartnerName = '',
    this.paymentPartnerImageUrl = '',
    this.deliveryPartnerName = '',
    this.deliveryPartnerImageUrl = '',
    this.clientName = '',
    this.clientContactNumber = '',
    this.clientAddress = '',
    this.skipRemoteSync = false,
    this.cancelRequestStatus = '',
    this.cancelRequestReason = '',
    this.cancelRequestSubmittedAtEpochMs = 0,
    this.cancelRequestResolvedAtEpochMs = 0,
    this.inventoryDeducted = false,
    this.inventoryDeductedAtEpochMs = 0,
    this.inventoryRestoredAtEpochMs = 0,
    this.inventoryMovements = const <Map<String, dynamic>>[],
    this.customerReceivedAtEpochMs = 0,
    this.productRating = 0,
    this.productReviewRating = 0,
    this.productRatedAtEpochMs = 0,
    this.productReviewComment = '',
    this.productReviewMedia = const <OrderReviewMedia>[],
  });

  final String id;
  final String adminId;
  final String accountId;
  final String productId;
  final String productName;
  final String productImageUrl;
  final String variantId;
  final String variantName;
  final List<OrderItemAddOn> addOns;
  final int quantity;
  final double unitPrice;
  final String flashDealId;
  final String flashReservationId;
  final OrderStageKey stage;
  final int createdAtEpochMs;
  final double grandTotalAmount;
  final double amountToPayAmount;
  final double remainingBalanceAmount;
  final double shippingFeeAmount;
  final String paymentOptionLabel;
  final String paymentPartnerName;
  final String paymentPartnerImageUrl;
  final String deliveryPartnerName;
  final String deliveryPartnerImageUrl;
  final String clientName;
  final String clientContactNumber;
  final String clientAddress;
  final bool skipRemoteSync;
  final String cancelRequestStatus;
  final String cancelRequestReason;
  final int cancelRequestSubmittedAtEpochMs;
  final int cancelRequestResolvedAtEpochMs;
  final bool inventoryDeducted;
  final int inventoryDeductedAtEpochMs;
  final int inventoryRestoredAtEpochMs;
  final List<Map<String, dynamic>> inventoryMovements;
  final int customerReceivedAtEpochMs;
  final double productRating;
  final double productReviewRating;
  final int productRatedAtEpochMs;
  final String productReviewComment;
  final List<OrderReviewMedia> productReviewMedia;

  double get totalPrice => unitPrice * quantity;

  bool get hasProductRating => productRating > 0.009;
  bool get hasProductReviewRating => productReviewRating > 0.009;
  bool get hasCustomerConfirmedReceipt => customerReceivedAtEpochMs > 0;
  bool get hidesFromToReviewAfterSubmit => productReviewRating >= 4;
  bool get isHighRatingReviewLocked =>
      productReviewRating >= 4 &&
      productRatedAtEpochMs > 0 &&
      DateTime.now().millisecondsSinceEpoch <
          productRatedAtEpochMs + _highRatingReviewLockDuration.inMilliseconds;

  double get outstandingAmount {
    if (amountToPayAmount > 0) {
      return amountToPayAmount;
    }
    if (remainingBalanceAmount > 0) {
      return remainingBalanceAmount;
    }
    if (stage == OrderStageKey.toPay && grandTotalAmount > 0) {
      return grandTotalAmount;
    }
    return 0;
  }

  OrderEntryData copyWith({
    String? id,
    String? adminId,
    String? accountId,
    String? productId,
    String? productName,
    String? productImageUrl,
    String? variantId,
    String? variantName,
    List<OrderItemAddOn>? addOns,
    int? quantity,
    double? unitPrice,
    String? flashDealId,
    String? flashReservationId,
    OrderStageKey? stage,
    int? createdAtEpochMs,
    double? grandTotalAmount,
    double? amountToPayAmount,
    double? remainingBalanceAmount,
    double? shippingFeeAmount,
    String? paymentOptionLabel,
    String? paymentPartnerName,
    String? paymentPartnerImageUrl,
    String? deliveryPartnerName,
    String? deliveryPartnerImageUrl,
    String? clientName,
    String? clientContactNumber,
    String? clientAddress,
    bool? skipRemoteSync,
    String? cancelRequestStatus,
    String? cancelRequestReason,
    int? cancelRequestSubmittedAtEpochMs,
    int? cancelRequestResolvedAtEpochMs,
    bool? inventoryDeducted,
    int? inventoryDeductedAtEpochMs,
    int? inventoryRestoredAtEpochMs,
    List<Map<String, dynamic>>? inventoryMovements,
    int? customerReceivedAtEpochMs,
    double? productRating,
    double? productReviewRating,
    int? productRatedAtEpochMs,
    String? productReviewComment,
    List<OrderReviewMedia>? productReviewMedia,
  }) {
    return OrderEntryData(
      id: id ?? this.id,
      adminId: adminId ?? this.adminId,
      accountId: accountId ?? this.accountId,
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      productImageUrl: productImageUrl ?? this.productImageUrl,
      variantId: variantId ?? this.variantId,
      variantName: variantName ?? this.variantName,
      addOns: addOns ?? this.addOns,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      flashDealId: flashDealId ?? this.flashDealId,
      flashReservationId: flashReservationId ?? this.flashReservationId,
      stage: stage ?? this.stage,
      createdAtEpochMs: createdAtEpochMs ?? this.createdAtEpochMs,
      grandTotalAmount: grandTotalAmount ?? this.grandTotalAmount,
      amountToPayAmount: amountToPayAmount ?? this.amountToPayAmount,
      remainingBalanceAmount:
          remainingBalanceAmount ?? this.remainingBalanceAmount,
      shippingFeeAmount: shippingFeeAmount ?? this.shippingFeeAmount,
      paymentOptionLabel: paymentOptionLabel ?? this.paymentOptionLabel,
      paymentPartnerName: paymentPartnerName ?? this.paymentPartnerName,
      paymentPartnerImageUrl:
          paymentPartnerImageUrl ?? this.paymentPartnerImageUrl,
      deliveryPartnerName: deliveryPartnerName ?? this.deliveryPartnerName,
      deliveryPartnerImageUrl:
          deliveryPartnerImageUrl ?? this.deliveryPartnerImageUrl,
      clientName: clientName ?? this.clientName,
      clientContactNumber:
          clientContactNumber ?? this.clientContactNumber,
      clientAddress: clientAddress ?? this.clientAddress,
      skipRemoteSync: skipRemoteSync ?? this.skipRemoteSync,
      cancelRequestStatus: cancelRequestStatus ?? this.cancelRequestStatus,
      cancelRequestReason: cancelRequestReason ?? this.cancelRequestReason,
      cancelRequestSubmittedAtEpochMs:
          cancelRequestSubmittedAtEpochMs ?? this.cancelRequestSubmittedAtEpochMs,
      cancelRequestResolvedAtEpochMs:
          cancelRequestResolvedAtEpochMs ?? this.cancelRequestResolvedAtEpochMs,
      inventoryDeducted: inventoryDeducted ?? this.inventoryDeducted,
      inventoryDeductedAtEpochMs:
          inventoryDeductedAtEpochMs ?? this.inventoryDeductedAtEpochMs,
      inventoryRestoredAtEpochMs:
          inventoryRestoredAtEpochMs ?? this.inventoryRestoredAtEpochMs,
      inventoryMovements: inventoryMovements ?? this.inventoryMovements,
      customerReceivedAtEpochMs:
          customerReceivedAtEpochMs ?? this.customerReceivedAtEpochMs,
      productRating: productRating ?? this.productRating,
      productReviewRating: productReviewRating ?? this.productReviewRating,
      productRatedAtEpochMs:
          productRatedAtEpochMs ?? this.productRatedAtEpochMs,
      productReviewComment:
          productReviewComment ?? this.productReviewComment,
      productReviewMedia: productReviewMedia ?? this.productReviewMedia,
    );
  }

  Map<String, dynamic> toJson() {
    final normalizedPaymentLabel = paymentOptionLabel.trim().isNotEmpty
        ? paymentOptionLabel.trim()
        : paymentPartnerName.trim();
    final normalizedPaymentMethod = paymentPartnerName.trim().isNotEmpty
        ? paymentPartnerName.trim()
        : normalizedPaymentLabel;
    final createdAtIso = createdAtEpochMs > 0
        ? DateTime.fromMillisecondsSinceEpoch(
            createdAtEpochMs,
          ).toIso8601String()
        : '';
    return <String, dynamic>{
      'id': id,
      'adminId': adminId,
      'accountId': accountId,
      'productId': productId,
      'productName': productName,
      'productImageUrl': productImageUrl,
      'variantId': variantId,
      'variantName': variantName,
      'addOns': addOns.map((addOn) => addOn.toJson()).toList(growable: false),
      'quantity': quantity,
      'unitPrice': unitPrice,
      'flashDealId': flashDealId,
      'flashReservationId': flashReservationId,
      'stage': stage.name,
      'createdAtEpochMs': createdAtEpochMs,
      'grandTotalAmount': grandTotalAmount,
      'amountToPayAmount': amountToPayAmount,
      'remainingBalanceAmount': remainingBalanceAmount,
      'shippingFeeAmount': shippingFeeAmount,
      'paymentOptionLabel': paymentOptionLabel,
      'paymentPartnerName': paymentPartnerName,
      'paymentPartnerImageUrl': paymentPartnerImageUrl,
      'deliveryPartnerName': deliveryPartnerName,
      'deliveryPartnerImageUrl': deliveryPartnerImageUrl,
      'clientName': clientName,
      'clientContactNumber': clientContactNumber,
      'clientAddress': clientAddress,
      'skipRemoteSync': skipRemoteSync,
      'cancelRequestStatus': cancelRequestStatus,
      'cancelRequestReason': cancelRequestReason,
      'cancelRequestSubmittedAtEpochMs': cancelRequestSubmittedAtEpochMs,
      'cancelRequestResolvedAtEpochMs': cancelRequestResolvedAtEpochMs,
      'inventoryDeducted': inventoryDeducted,
      'inventoryDeductedAtEpochMs': inventoryDeductedAtEpochMs,
      'inventoryRestoredAtEpochMs': inventoryRestoredAtEpochMs,
      'inventoryMovements': inventoryMovements,
      'customerReceivedAtEpochMs': customerReceivedAtEpochMs,
      'productRating': productRating,
      'productReviewRating': productReviewRating,
      'productRatedAtEpochMs': productRatedAtEpochMs,
      'productReviewComment': productReviewComment,
      'productReviewMedia':
          productReviewMedia.map((media) => media.toJson()).toList(growable: false),
      'customerName': clientName,
      'contactNumber': clientContactNumber,
      'address': clientAddress,
      'courier': deliveryPartnerName,
      'deliveryProvider': deliveryPartnerName,
      'payment': normalizedPaymentLabel,
      'paymentMethod': normalizedPaymentMethod,
      'amount': grandTotalAmount,
      'total': grandTotalAmount,
      'price': grandTotalAmount,
      'status': stage.name,
      'createdAt': createdAtIso,
    };
  }

  factory OrderEntryData.fromJson(Map<String, dynamic> json) {
    final paymentPartnerImageUrl = _firstNonEmptyString(<Object?>[
      json['paymentPartnerImageUrl'],
      json['paymentPartnerImage'],
      json['paymentMethodImageUrl'],
      json['paymentProviderImageUrl'],
      json['paymentImageUrl'],
      json['paymentLogoUrl'],
      json['paymentLogo'],
    ]);
    final deliveryPartnerName = _firstNonEmptyString(<Object?>[
      json['deliveryPartnerName'],
      json['deliveryPartner'],
      json['deliveryMethod'],
      json['deliveryProvider'],
      json['courier'],
    ]);
    final deliveryPartnerImageUrl = _firstNonEmptyString(<Object?>[
      json['deliveryPartnerImageUrl'],
      json['deliveryPartnerImage'],
      json['deliveryMethodImageUrl'],
      json['deliveryProviderImageUrl'],
      json['courierImageUrl'],
      json['courierLogoUrl'],
      json['courierLogo'],
      json['courierImage'],
    ]);
    final clientName = _firstNonEmptyString(<Object?>[
      json['clientName'],
      json['name'],
    ]);
    final clientContactNumber = _firstNonEmptyString(<Object?>[
      json['clientContactNumber'],
      json['contactNumber'],
      json['clientContact'],
    ]);
    final clientAddress = _firstNonEmptyString(<Object?>[
      json['clientAddress'],
      json['address'],
      json['deliveryAddress'],
    ]);

    final productRating = (json['productRating'] as num?)?.toDouble() ?? 0;
    final productRatedAtEpochMs =
        (json['productRatedAtEpochMs'] as num?)?.toInt() ?? 0;
    final productReviewComment =
        json['productReviewComment']?.toString().trim() ?? '';
    final productReviewMedia = _normalizeOrderReviewMediaList(<Object?>[
      json['productReviewMedia'],
      json['reviewMedia'],
      json['reviewMediaItems'],
      json['reviewAttachments'],
      json['productReviewAttachments'],
      json['productReviewMediaUrls'],
    ]);
    final productReviewRating = (json['productReviewRating'] as num?)?.toDouble() ??
        ((productRatedAtEpochMs > 0 ||
                productReviewComment.isNotEmpty ||
                productReviewMedia.isNotEmpty)
            ? productRating
            : 0);
    final customerReceivedAtEpochMs = _firstNonEmptyString(<Object?>[
      json['customerReceivedAtEpochMs'],
      json['orderReceivedAtEpochMs'],
      json['receivedAtEpochMs'],
    ]);
    final inventoryMovements =
        (json['inventoryMovements'] as List<dynamic>? ?? const <dynamic>[])
            .whereType<Map>()
            .map((entry) => Map<String, dynamic>.from(entry))
            .toList(growable: false);
    final inventoryDeductedAtEpochMs =
        (json['inventoryDeductedAtEpochMs'] as num?)?.toInt() ?? 0;
    final inventoryRestoredAtEpochMs =
        (json['inventoryRestoredAtEpochMs'] as num?)?.toInt() ?? 0;

    return OrderEntryData(
      id: json['id']?.toString() ?? '',
      adminId: json['adminId']?.toString() ??
          json['tenantId']?.toString() ??
          json['ownerAdminId']?.toString() ??
          '',
      accountId: json['accountId']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      productName: json['productName']?.toString() ?? '',
      productImageUrl: json['productImageUrl']?.toString() ?? '',
      variantId: json['variantId']?.toString() ?? '',
      variantName: json['variantName']?.toString() ?? '',
      addOns: (json['addOns'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((entry) => OrderItemAddOn.fromJson(Map<String, dynamic>.from(entry)))
          .where((addOn) => addOn.id.trim().isNotEmpty && addOn.name.trim().isNotEmpty)
          .toList(growable: false),
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      flashDealId: json['flashDealId']?.toString() ?? '',
      flashReservationId:
          json['flashReservationId']?.toString() ??
          json['reservationId']?.toString() ??
          '',
      stage: _orderStageKeyFromString(json['stage']?.toString()),
      createdAtEpochMs: (json['createdAtEpochMs'] as num?)?.toInt() ?? 0,
      grandTotalAmount: (json['grandTotalAmount'] as num?)?.toDouble() ?? 0,
      amountToPayAmount: (json['amountToPayAmount'] as num?)?.toDouble() ?? 0,
      remainingBalanceAmount:
          (json['remainingBalanceAmount'] as num?)?.toDouble() ?? 0,
      shippingFeeAmount: (json['shippingFeeAmount'] as num?)?.toDouble() ?? 0,
      paymentOptionLabel: _firstNonEmptyString(<Object?>[
        json['paymentOptionLabel'],
        json['payment'],
        json['paymentMethod'],
      ]),
      paymentPartnerName: _firstNonEmptyString(<Object?>[
        json['paymentPartnerName'],
        json['paymentMethod'],
        json['paymentProvider'],
      ]),
      paymentPartnerImageUrl: paymentPartnerImageUrl,
      deliveryPartnerName: deliveryPartnerName,
      deliveryPartnerImageUrl: deliveryPartnerImageUrl,
      clientName: clientName.isNotEmpty
          ? clientName
          : _firstNonEmptyString(<Object?>[
              json['customerName'],
              json['customer'],
            ]),
      clientContactNumber: clientContactNumber,
      clientAddress: clientAddress,
      skipRemoteSync: json['skipRemoteSync'] == true,
      cancelRequestStatus:
          json['cancelRequestStatus']?.toString().trim() ?? '',
      cancelRequestReason: json['cancelRequestReason']?.toString().trim() ?? '',
      cancelRequestSubmittedAtEpochMs:
          (json['cancelRequestSubmittedAtEpochMs'] as num?)?.toInt() ?? 0,
      cancelRequestResolvedAtEpochMs:
          (json['cancelRequestResolvedAtEpochMs'] as num?)?.toInt() ?? 0,
      inventoryDeducted:
          inventoryRestoredAtEpochMs > 0
              ? false
              : json['inventoryDeducted'] == true ||
                    inventoryDeductedAtEpochMs > 0,
      inventoryDeductedAtEpochMs: inventoryDeductedAtEpochMs,
      inventoryRestoredAtEpochMs: inventoryRestoredAtEpochMs,
      inventoryMovements: inventoryMovements,
      customerReceivedAtEpochMs:
          int.tryParse(customerReceivedAtEpochMs) ??
          (json['customerReceivedAtEpochMs'] as num?)?.toInt() ??
          (json['orderReceivedAtEpochMs'] as num?)?.toInt() ??
          (json['receivedAtEpochMs'] as num?)?.toInt() ??
          0,
      productRating: productRating,
      productReviewRating: productReviewRating,
      productRatedAtEpochMs: productRatedAtEpochMs,
      productReviewComment: productReviewComment,
      productReviewMedia: productReviewMedia,
    );
  }
}

OrderReviewMediaType _inferOrderReviewMediaType({
  required String url,
  Object? type,
  String contentType = '',
}) {
  final normalizedType = type?.toString().trim().toLowerCase() ?? '';
  if (normalizedType.contains('video')) {
    return OrderReviewMediaType.video;
  }
  if (normalizedType.contains('image') || normalizedType.contains('photo')) {
    return OrderReviewMediaType.image;
  }

  final normalizedContentType = contentType.trim().toLowerCase();
  if (normalizedContentType.startsWith('video/')) {
    return OrderReviewMediaType.video;
  }
  if (normalizedContentType.startsWith('image/')) {
    return OrderReviewMediaType.image;
  }

  final normalizedUrl = url.trim().toLowerCase().split('?').first;
  const videoExtensions = <String>{
    '.mp4',
    '.mov',
    '.m4v',
    '.webm',
    '.avi',
    '.mkv',
    '.3gp',
  };
  if (videoExtensions.any(normalizedUrl.endsWith)) {
    return OrderReviewMediaType.video;
  }

  return OrderReviewMediaType.image;
}

int _normalizeNonNegativeInt(Object? value) {
  final number = value is num ? value : num.tryParse(value?.toString() ?? '');
  if (number == null || !number.isFinite || number <= 0) {
    return 0;
  }
  return number.toInt();
}

List<OrderReviewMedia> _normalizeOrderReviewMediaList(Iterable<Object?> values) {
  final media = <OrderReviewMedia>[];
  final seenUrls = <String>{};

  void addCandidate(Object? value) {
    if (value is Iterable && value is! String) {
      for (final nestedValue in value) {
        addCandidate(nestedValue);
      }
      return;
    }

    final reviewMedia = OrderReviewMedia.fromJson(value);
    if (reviewMedia == null) {
      return;
    }

    final normalizedUrl = reviewMedia.url.trim();
    final key = normalizedUrl.toLowerCase();
    if (normalizedUrl.isEmpty || seenUrls.contains(key)) {
      return;
    }

    seenUrls.add(key);
    media.add(reviewMedia);
  }

  for (final value in values) {
    addCandidate(value);
  }

  return List<OrderReviewMedia>.unmodifiable(media);
}

String _firstNonEmptyString(Iterable<Object?> values) {
  for (final value in values) {
    final normalizedValue = value?.toString().trim() ?? '';
    if (normalizedValue.isNotEmpty) {
      return normalizedValue;
    }
  }
  return '';
}

OrderStageKey _orderStageKeyFromString(String? value) {
  switch (value?.trim()) {
    case 'toPrepare':
      return OrderStageKey.toPrepare;
    case 'toShip':
      return OrderStageKey.toShip;
    case 'toReceive':
      return OrderStageKey.toReceive;
    case 'toReview':
      return OrderStageKey.toReview;
    case 'returnRequest':
      return OrderStageKey.returnRequest;
    case 'cancelled':
      return OrderStageKey.cancelled;
    case 'toPay':
    default:
      return OrderStageKey.toPay;
  }
}

bool _isRealOrderAccountId(String? value) {
  final accountId = value?.trim() ?? '';
  if (accountId.isEmpty) {
    return false;
  }

  final normalizedAccountId = accountId.toLowerCase();
  return normalizedAccountId != 'guest' &&
      normalizedAccountId != 'anonymous' &&
      normalizedAccountId != 'unknown' &&
      normalizedAccountId != 'test' &&
      normalizedAccountId != 'sample' &&
      !normalizedAccountId.startsWith('guest_') &&
      !normalizedAccountId.startsWith('guest-') &&
      !normalizedAccountId.startsWith('test_') &&
      !normalizedAccountId.startsWith('test-') &&
      !normalizedAccountId.startsWith('sample_') &&
      !normalizedAccountId.startsWith('sample-') &&
      !normalizedAccountId.startsWith('anonymous_') &&
      !normalizedAccountId.startsWith('anonymous-') &&
      !normalizedAccountId.startsWith('unknown_') &&
      !normalizedAccountId.startsWith('unknown-');
}

bool _isOrderEntryForAccount(
  OrderEntryData entry,
  String accountId,
) {
  final entryAccountId = entry.accountId.trim();
  final currentAccountId = accountId.trim();
  if (!_isRealOrderAccountId(entryAccountId) ||
      !_isRealOrderAccountId(currentAccountId)) {
    return false;
  }
  return entryAccountId.toLowerCase() == currentAccountId.toLowerCase();
}

class OrderStore {
  OrderStore._();

  static final OrderStore instance = OrderStore._();

  final ValueNotifier<List<OrderEntryData>> ordersNotifier =
      ValueNotifier<List<OrderEntryData>>(const <OrderEntryData>[]);
  final OrderSyncService _orderSyncService = createOrderSyncService();

  bool _hasLoaded = false;
  String? _lastAccountId;
  String? _lastEmail;
  Future<void>? _ongoingRemoteRefresh;

  /// Force reload orders for the current account.
  /// Call this after login/logout to ensure correct orders are loaded.
  Future<void> reloadForCurrentAccount() async {
    _hasLoaded = false;
    _lastAccountId = null;
    _lastEmail = null;
    ordersNotifier.value = const <OrderEntryData>[];
    await ensureLoaded();
  }

  Future<String?> _resolveCurrentOrderAccountId() async {
    final accountId = await AuthSession.getAccountId();
    if (_isRealOrderAccountId(accountId)) {
      return accountId!.trim();
    }

    final email = await AuthSession.getAccountEmail();
    if (_isRealOrderAccountId(email)) {
      return email!.trim().toLowerCase();
    }

    return null;
  }

  String _ordersKeyForAccount(String accountId) => 'client_orders_$accountId';

  Future<void> _removeLegacyOrderKeys(SharedPreferences preferences) async {
    for (final key in preferences.getKeys().toList(growable: false)) {
      final normalizedKey = key.toLowerCase();
      final isLegacyOrderKey = normalizedKey == 'client_orders' ||
          normalizedKey == 'client_orders_guest' ||
          normalizedKey.startsWith('client_orders_guest_') ||
          normalizedKey.startsWith('client_orders_guest-') ||
          normalizedKey.startsWith('client_orders_test_') ||
          normalizedKey.startsWith('client_orders_sample_') ||
          normalizedKey.startsWith('client_orders_anonymous_') ||
          normalizedKey.startsWith('client_orders_unknown_');
      if (isLegacyOrderKey) {
        await preferences.remove(key);
      }
    }
  }

  Future<void> ensureLoaded() async {
    final currentAccountId = await _resolveCurrentOrderAccountId();
    final email = await AuthSession.getAccountEmail();
    final trimmedCurrentAccountId = currentAccountId?.trim();
    final trimmedEmail = email?.trim();
    final lastTrimmedAccountId = _lastAccountId?.trim();
    final lastTrimmedEmail = _lastEmail?.trim();

    // If the account changed, clear orders and reload with the new key.
    // This ensures each account has its own separate orders.
    // Handle null comparisons properly - different null states mean different users
    final accountChanged = trimmedCurrentAccountId != lastTrimmedAccountId ||
        (trimmedCurrentAccountId == null) != (lastTrimmedAccountId == null);
    final emailChanged = trimmedEmail != lastTrimmedEmail ||
        (trimmedEmail == null) != (lastTrimmedEmail == null);

    if (_hasLoaded && (accountChanged || emailChanged)) {
      // Clear in-memory orders first before reloading for new account
      ordersNotifier.value = const <OrderEntryData>[];
      _hasLoaded = false;
    }

    if (_hasLoaded) {
      return;
    }

    _lastAccountId = currentAccountId;
    _lastEmail = email;

    final preferences = await SharedPreferences.getInstance();
    await _removeLegacyOrderKeys(preferences);

    if (trimmedCurrentAccountId == null) {
      ordersNotifier.value = const <OrderEntryData>[];
      _hasLoaded = true;
      return;
    }

    final ordersKey = _ordersKeyForAccount(trimmedCurrentAccountId);
    final rawOrders = preferences.getString(ordersKey);

    if (rawOrders == null || rawOrders.trim().isEmpty) {
      ordersNotifier.value = const <OrderEntryData>[];
      _hasLoaded = true;
      return;
    }

    try {
      final decoded = jsonDecode(rawOrders) as List<dynamic>;
      final loadedOrders = decoded
          .whereType<Map<String, dynamic>>()
          .map(OrderEntryData.fromJson)
          .map(_normalizePendingOrderEntry)
          .where(
            (entry) =>
                entry.id.trim().isNotEmpty &&
                entry.productId.trim().isNotEmpty &&
                entry.productName.trim().isNotEmpty &&
                _isOrderEntryForAccount(entry, trimmedCurrentAccountId),
          )
          .toList(growable: false);
      ordersNotifier.value = List<OrderEntryData>.unmodifiable(loadedOrders);
      await preferences.setString(
        ordersKey,
        jsonEncode([
          for (final entry in loadedOrders) entry.toJson(),
        ]),
      );
    } catch (_) {
      ordersNotifier.value = const <OrderEntryData>[];
    }

    _hasLoaded = true;
  }

  Future<void> refreshFromRemote() async {
    await ensureLoaded();
    final currentAccountId = await _resolveCurrentOrderAccountId();
    if (currentAccountId == null) {
      return;
    }

    final ongoingRemoteRefresh = _ongoingRemoteRefresh;
    if (ongoingRemoteRefresh != null) {
      return ongoingRemoteRefresh;
    }

    final request = _refreshFromRemoteInternal();
    _ongoingRemoteRefresh = request;

    try {
      await request;
    } finally {
      if (identical(_ongoingRemoteRefresh, request)) {
        _ongoingRemoteRefresh = null;
      }
    }
  }

  Future<void> syncPackingQueueOrdersToRemote() async {
    await ensureLoaded();

    final currentEntries = List<OrderEntryData>.unmodifiable(ordersNotifier.value);
    final packingQueueEntries = currentEntries
        .where(
          (entry) => entry.stage == OrderStageKey.toPrepare,
        )
        .toList(growable: false);
    if (packingQueueEntries.isEmpty) {
      return;
    }

    await _pushEntriesToRemote(
      currentEntries,
      fallbackEntries: currentEntries,
    );
  }

  Future<void> syncFullPaymentQueueOrdersToRemote() async {
    await ensureLoaded();

    final currentEntries = List<OrderEntryData>.unmodifiable(ordersNotifier.value);
    final fullPaymentQueueEntries = currentEntries
        .where(
          (entry) =>
              entry.stage == OrderStageKey.toPrepare &&
              !_isCodPaymentOption(entry.paymentOptionLabel),
        )
        .toList(growable: false);
    if (fullPaymentQueueEntries.isEmpty) {
      return;
    }

    try {
      await _upsertToRemote(
        fullPaymentQueueEntries,
        rethrowOnFailure: true,
        includeSkipped: true,
      );
    } catch (_) {
      // Keep local full payment queue orders usable even if backend sync fails.
    }
  }

  Future<void> syncCodQueueOrdersToRemote() async {
    await ensureLoaded();

    final currentEntries = List<OrderEntryData>.unmodifiable(ordersNotifier.value);
    final codQueueEntries = currentEntries
        .where(
          (entry) =>
              entry.stage == OrderStageKey.toPrepare &&
              _isCodPaymentOption(entry.paymentOptionLabel),
        )
        .toList(growable: false);
    if (codQueueEntries.isEmpty) {
      return;
    }

    try {
      await _upsertToRemote(
        codQueueEntries,
        rethrowOnFailure: true,
        includeSkipped: true,
      );
    } catch (_) {
      // Keep local COD queue orders usable even if backend sync fails.
    }
  }

  Future<void> syncCodQueueOrderGroupToRemote(int createdAtEpochMs) async {
    await ensureLoaded();

    final currentEntries = List<OrderEntryData>.unmodifiable(ordersNotifier.value);
    final codQueueEntries = currentEntries
        .where(
          (entry) =>
              entry.createdAtEpochMs == createdAtEpochMs &&
              entry.stage == OrderStageKey.toPrepare &&
              _isCodPaymentOption(entry.paymentOptionLabel),
        )
        .toList(growable: false);
    if (codQueueEntries.isEmpty) {
      return;
    }

    await _pushEntriesToRemote(
      currentEntries,
      fallbackEntries: currentEntries,
    );
  }

  Future<void> addOrders(
    Iterable<OrderEntryData> entries, {
    bool syncToRemote = true,
  }) async {
    await ensureLoaded();
    final currentAccountId = await _resolveCurrentOrderAccountId();
    if (currentAccountId == null) {
      return;
    }

    final normalizedEntries = entries
        .where(
          (entry) =>
              entry.id.trim().isNotEmpty &&
                entry.productId.trim().isNotEmpty &&
                entry.productName.trim().isNotEmpty,
        )
        .map((entry) => entry.copyWith(accountId: currentAccountId))
        .map(_normalizePendingOrderEntry)
        .where((entry) => _isOrderEntryForAccount(entry, currentAccountId))
        .toList(growable: false);
    if (normalizedEntries.isEmpty) {
      return;
    }

    final previousOrders = List<OrderEntryData>.unmodifiable(
      ordersNotifier.value,
    );
    final nextOrders = <OrderEntryData>[
      ...normalizedEntries,
      ...previousOrders,
    ];
    final normalizedNextOrders = List<OrderEntryData>.unmodifiable(nextOrders);
    try {
      await _persistLocally(normalizedNextOrders);
    } catch (_) {
      await _refreshFromRemoteInternal();
      rethrow;
    }
    if (!syncToRemote) {
      return;
    }
    try {
      await _pushEntriesToRemote(
        normalizedEntries,
        fallbackEntries: normalizedNextOrders,
        rethrowOnFailure: true,
      );
    } catch (_) {
      try {
        await _persistLocally(previousOrders);
      } catch (_) {
        await _refreshFromRemoteInternal();
      }
      rethrow;
    }
  }

  Future<void> removeOrderGroup(int createdAtEpochMs) async {
    await ensureLoaded();
    final nextOrders = ordersNotifier.value
        .where((entry) => entry.createdAtEpochMs != createdAtEpochMs)
        .toList(growable: false);
    final normalizedNextOrders = List<OrderEntryData>.unmodifiable(nextOrders);
    await _persistLocally(normalizedNextOrders);
    unawaited(() async {
      try {
        await _orderSyncService.cancelOrderGroup(createdAtEpochMs);
      } catch (_) {
        try {
          await _syncToRemote(
            normalizedNextOrders,
            rethrowOnFailure: true,
          );
        } catch (_) {
          await _refreshFromRemoteInternal();
        }
      }
    }());
  }

  Future<void> requestOrderGroupCancellation(
    int createdAtEpochMs,
    String reason,
  ) async {
    await ensureLoaded();
    await _refreshFromRemoteInternal();

    final normalizedReason = reason.trim();
    if (normalizedReason.isEmpty) {
      return;
    }

    final requestSubmittedAtEpochMs = DateTime.now().millisecondsSinceEpoch;
    var didUpdate = false;
    final nextOrders = ordersNotifier.value.map((entry) {
      if (entry.createdAtEpochMs != createdAtEpochMs) {
        return entry;
      }

      didUpdate = true;
      return entry.copyWith(
        cancelRequestStatus: 'pending',
        cancelRequestReason: normalizedReason,
        cancelRequestSubmittedAtEpochMs: requestSubmittedAtEpochMs,
        cancelRequestResolvedAtEpochMs: 0,
      );
    }).toList(growable: false);

    if (!didUpdate) {
      return;
    }

    final updatedEntries = nextOrders
        .where((entry) => entry.createdAtEpochMs == createdAtEpochMs)
        .toList(growable: false);
    final normalizedNextOrders = List<OrderEntryData>.unmodifiable(nextOrders);

    await _persistLocally(normalizedNextOrders);
    await _pushEntriesToRemote(
      updatedEntries,
      fallbackEntries: normalizedNextOrders,
      rethrowOnFailure: true,
    );
  }

  Future<void> recordPaymentForOrderGroup(
    int createdAtEpochMs,
    double amount,
  ) async {
    await ensureLoaded();
    await _refreshFromRemoteInternal();

    if (amount.isNaN || amount.isInfinite || amount <= 0) {
      return;
    }

    final nextOrders = ordersNotifier.value.map((entry) {
      if (entry.createdAtEpochMs != createdAtEpochMs) {
        return entry;
      }

      final nextRemainingBalance = math.max(
        entry.remainingBalanceAmount - amount,
        0.0,
      );
      final isCodOrder = _isCodPaymentOption(entry.paymentOptionLabel);
      final nextAmountToPay = isCodOrder
          ? _codAmountStillNeededToProceed(
              entry,
              remainingBalanceAmount: nextRemainingBalance,
            )
          : nextRemainingBalance;
      final nextStage = nextAmountToPay > 0.009
          ? OrderStageKey.toPay
          : OrderStageKey.toPrepare;
      return entry.copyWith(
        stage: nextStage,
        amountToPayAmount: nextAmountToPay,
        remainingBalanceAmount: nextRemainingBalance,
      );
    }).toList(growable: false);
    final updatedEntries = nextOrders
        .where((entry) => entry.createdAtEpochMs == createdAtEpochMs)
        .toList(growable: false);

    final normalizedNextOrders = List<OrderEntryData>.unmodifiable(nextOrders);
    await _persistLocally(normalizedNextOrders);
    await _pushEntriesToRemote(
      updatedEntries,
      fallbackEntries: normalizedNextOrders,
    );
  }

  Future<void> markOrderGroupReceived(int createdAtEpochMs) async {
    await ensureLoaded();

    var didUpdate = false;
    final receivedAtEpochMs = DateTime.now().millisecondsSinceEpoch;
    final nextOrders = ordersNotifier.value.map((entry) {
      if (entry.createdAtEpochMs != createdAtEpochMs) {
        return entry;
      }

      didUpdate = true;
      return entry.copyWith(
        amountToPayAmount: 0,
        remainingBalanceAmount: 0,
        customerReceivedAtEpochMs:
            entry.customerReceivedAtEpochMs > 0
                ? entry.customerReceivedAtEpochMs
                : receivedAtEpochMs,
      );
    }).toList(growable: false);

    if (!didUpdate) {
      return;
    }

    final updatedEntries = nextOrders
        .where((entry) => entry.createdAtEpochMs == createdAtEpochMs)
        .toList(growable: false);
    final normalizedNextOrders = List<OrderEntryData>.unmodifiable(nextOrders);

    await _persistLocally(normalizedNextOrders);
    unawaited(() async {
      try {
        await _pushEntriesToRemote(
          updatedEntries,
          fallbackEntries: normalizedNextOrders,
          rethrowOnFailure: true,
        );
      } catch (_) {
        await _refreshFromRemoteInternal();
      }
    }());
  }

  Future<void> saveProductRatingsForOrderGroup(
    int createdAtEpochMs,
    Map<String, int> ratingsByEntryId,
  ) async {
    await ensureLoaded();

    final normalizedRatingsByEntryId = <String, int>{};
    ratingsByEntryId.forEach((entryId, rating) {
      final normalizedEntryId = entryId.trim();
      if (normalizedEntryId.isEmpty) {
        return;
      }

      final normalizedRating = rating.clamp(1, 5).toInt();
      normalizedRatingsByEntryId[normalizedEntryId] = normalizedRating;
    });

    if (normalizedRatingsByEntryId.isEmpty) {
      return;
    }

    final ratedAtEpochMs = DateTime.now().millisecondsSinceEpoch;
    var didUpdate = false;
    final nextOrders = ordersNotifier.value.map((entry) {
      if (entry.createdAtEpochMs != createdAtEpochMs) {
        return entry;
      }

      final nextRating = normalizedRatingsByEntryId[entry.id.trim()];
      if (nextRating == null) {
        return entry;
      }

      didUpdate = true;
      return entry.copyWith(
        productReviewRating: nextRating.toDouble(),
        productRatedAtEpochMs: ratedAtEpochMs,
      );
    }).toList(growable: false);

    if (!didUpdate) {
      return;
    }

    final updatedEntries = nextOrders
        .where((entry) => entry.createdAtEpochMs == createdAtEpochMs)
        .toList(growable: false);
    final normalizedNextOrders = List<OrderEntryData>.unmodifiable(nextOrders);

    await _persistLocally(normalizedNextOrders);
    unawaited(() async {
      try {
        await _pushEntriesToRemote(
          updatedEntries,
          fallbackEntries: normalizedNextOrders,
          rethrowOnFailure: true,
        );
      } catch (_) {
        await _refreshFromRemoteInternal();
      }
    }());
  }

  Future<void> saveProductReview({
    required String entryId,
    required int rating,
    required String comment,
    List<OrderReviewMedia> media = const <OrderReviewMedia>[],
    bool syncImmediately = false,
  }) async {
    await ensureLoaded();

    final normalizedEntryId = entryId.trim();
    final normalizedComment = comment.trim();
    final normalizedMedia = _normalizeOrderReviewMediaList(media);
    if (normalizedEntryId.isEmpty) {
      return;
    }

    final normalizedRating = rating.clamp(1, 5).toInt();

    final ratedAtEpochMs = DateTime.now().millisecondsSinceEpoch;
    var didUpdate = false;
    final nextOrders = ordersNotifier.value.map((entry) {
      if (entry.id.trim() != normalizedEntryId) {
        return entry;
      }

      if (entry.isHighRatingReviewLocked) {
        return entry;
      }

      didUpdate = true;
      return entry.copyWith(
        productReviewRating: normalizedRating.toDouble(),
        productRatedAtEpochMs: ratedAtEpochMs,
        productReviewComment: normalizedComment,
        productReviewMedia: normalizedMedia,
      );
    }).toList(growable: false);

    if (!didUpdate) {
      return;
    }

    final updatedEntries = nextOrders
        .where((entry) => entry.id.trim() == normalizedEntryId)
        .toList(growable: false);
    final normalizedNextOrders = List<OrderEntryData>.unmodifiable(nextOrders);

    await _persistLocally(normalizedNextOrders);
    Future<void> pushReviewUpdate() async {
      try {
        await _pushEntriesToRemote(
          updatedEntries,
          fallbackEntries: normalizedNextOrders,
          rethrowOnFailure: true,
        );
      } catch (_) {
        await _refreshFromRemoteInternal();
        if (syncImmediately) {
          rethrow;
        }
      }
    }

    if (syncImmediately) {
      await pushReviewUpdate();
    } else {
      unawaited(pushReviewUpdate());
    }
  }

  Future<String> uploadReviewMedia({
    required List<int> bytes,
    required String fileName,
    required String contentType,
  }) {
    return _orderSyncService.uploadReviewMedia(
      bytes: bytes,
      fileName: fileName,
      contentType: contentType,
    );
  }

  Future<void> _persist(
    List<OrderEntryData> entries, {
    bool rethrowOnSyncError = false,
  }) async {
    final normalizedEntries = List<OrderEntryData>.unmodifiable(entries);
    await _persistLocally(normalizedEntries);
    await _syncToRemote(
      normalizedEntries,
      rethrowOnFailure: rethrowOnSyncError,
    );
  }

  Future<void> _persistLocally(List<OrderEntryData> entries) async {
    final currentAccountId = await _resolveCurrentOrderAccountId();
    if (currentAccountId == null) {
      ordersNotifier.value = const <OrderEntryData>[];
      return;
    }

    final normalizedEntries = List<OrderEntryData>.unmodifiable(
      entries.where((entry) => _isOrderEntryForAccount(entry, currentAccountId)),
    );
    ordersNotifier.value = normalizedEntries;

    final preferences = await SharedPreferences.getInstance();
    await _removeLegacyOrderKeys(preferences);
    final ordersKey = _ordersKeyForAccount(currentAccountId);
    await preferences.setString(
      ordersKey,
      jsonEncode([
        for (final entry in normalizedEntries) entry.toJson(),
      ]),
    );
  }

  Future<void> _refreshFromRemoteInternal() async {
    final currentAccountId = await _resolveCurrentOrderAccountId();
    if (currentAccountId == null) {
      ordersNotifier.value = const <OrderEntryData>[];
      return;
    }

    try {
      final remoteOrders = await _orderSyncService.fetchOrders();
      final remoteEntries = remoteOrders
          .map(OrderEntryData.fromJson)
          .map(_normalizePendingOrderEntry)
          .where(
            (entry) =>
                entry.id.trim().isNotEmpty &&
                entry.productId.trim().isNotEmpty &&
                entry.productName.trim().isNotEmpty &&
                _isOrderEntryForAccount(entry, currentAccountId),
          )
          .toList(growable: false);

      final currentEntries = ordersNotifier.value
          .where((entry) => _isOrderEntryForAccount(entry, currentAccountId))
          .toList(growable: false);
      if (remoteEntries.isEmpty && currentEntries.isNotEmpty) {
        await _syncToRemote(currentEntries);
        return;
      }

      final mergedEntries = _mergeRemoteAndLocalOrderEntries(
        remoteEntries,
        currentEntries,
      );
      final entriesNeedingRemoteSync = _entriesNeedingRemoteSync(
        remoteEntries,
        currentEntries,
      );

      if (!_areOrderListsEqual(mergedEntries, currentEntries)) {
        await _persistLocally(mergedEntries);
      }

      if (entriesNeedingRemoteSync.isNotEmpty) {
        await _syncToRemote(mergedEntries);
      }
    } catch (_) {
      // Keep local orders usable even when the backend is unavailable.
    }
  }

  Future<void> _syncToRemote(
    List<OrderEntryData> entries, {
    bool rethrowOnFailure = false,
  }) async {
    final currentAccountId = await _resolveCurrentOrderAccountId();
    if (currentAccountId == null) {
      return;
    }

    final syncableEntries = entries
        .where(
          (entry) =>
              !entry.skipRemoteSync &&
              _isOrderEntryForAccount(entry, currentAccountId),
        )
        .toList(growable: false);
    if (syncableEntries.isEmpty) {
      return;
    }

    try {
      await _orderSyncService.replaceOrders([
        for (final entry in syncableEntries) entry.toJson(),
      ]);
    } catch (error) {
      try {
        await _orderSyncService.upsertOrders([
          for (final entry in syncableEntries) entry.toJson(),
        ]);
        return;
      } catch (_) {
        if (rethrowOnFailure) {
          rethrow;
        }
      }
      // Keep local changes even if backend sync is temporarily unavailable.
    }
  }

  Future<void> _pushEntriesToRemote(
    List<OrderEntryData> entries, {
    List<OrderEntryData>? fallbackEntries,
    bool rethrowOnFailure = false,
  }) async {
    if (entries.isEmpty) {
      return;
    }

    try {
      await _upsertToRemote(
        entries,
        rethrowOnFailure: true,
      );
      return;
    } catch (_) {
      try {
        await _syncToRemote(
          List<OrderEntryData>.unmodifiable(
            fallbackEntries ?? ordersNotifier.value,
          ),
          rethrowOnFailure: true,
        );
      } catch (_) {
        if (rethrowOnFailure) {
          rethrow;
        }
        // Keep local changes even if backend sync is temporarily unavailable.
      }
    }
  }

  Future<void> _upsertToRemote(
    List<OrderEntryData> entries, {
    bool rethrowOnFailure = false,
    bool includeSkipped = false,
  }) async {
    final currentAccountId = await _resolveCurrentOrderAccountId();
    if (currentAccountId == null) {
      return;
    }

    final syncableEntries = includeSkipped
        ? entries
            .where((entry) => _isOrderEntryForAccount(entry, currentAccountId))
            .toList(growable: false)
        : entries
            .where(
              (entry) =>
                  !entry.skipRemoteSync &&
                  _isOrderEntryForAccount(entry, currentAccountId),
            )
            .toList(growable: false);
    if (syncableEntries.isEmpty) {
      return;
    }

    try {
      await _orderSyncService.upsertOrders([
        for (final entry in syncableEntries) entry.toJson(),
      ]);
    } catch (error) {
      if (rethrowOnFailure) {
        rethrow;
      }
      // Keep local changes even if backend sync is temporarily unavailable.
    }
  }
}

bool _areOrderListsEqual(
  List<OrderEntryData> left,
  List<OrderEntryData> right,
) {
  if (left.length != right.length) {
    return false;
  }

  return jsonEncode([
        for (final entry in left) entry.toJson(),
      ]) ==
      jsonEncode([
        for (final entry in right) entry.toJson(),
      ]);
}

bool _isCodPaymentOption(String value) {
  return value.trim().toLowerCase().startsWith('cod');
}

const double _minimumCodProceedPayment = 500.0;

double _requiredCodProceedPaymentFor(double grandTotalAmount) {
  final normalizedGrandTotal = math.max(grandTotalAmount, 0.0);
  return math.min(
    normalizedGrandTotal,
    math.max(normalizedGrandTotal * 0.10, _minimumCodProceedPayment),
  );
}

double _codPaidAmountFor(
  OrderEntryData entry, {
  double? remainingBalanceAmount,
}) {
  final normalizedRemainingBalance = math.max(
    remainingBalanceAmount ?? entry.remainingBalanceAmount,
    0.0,
  );
  final normalizedGrandTotal = math.max(entry.grandTotalAmount, 0.0);
  return math.max(normalizedGrandTotal - normalizedRemainingBalance, 0.0);
}

double _codAmountStillNeededToProceed(
  OrderEntryData entry, {
  double? remainingBalanceAmount,
}) {
  final requiredProceedPayment =
      _requiredCodProceedPaymentFor(entry.grandTotalAmount);
  final paidAmount = _codPaidAmountFor(
    entry,
    remainingBalanceAmount: remainingBalanceAmount,
  );
  return math.max(requiredProceedPayment - paidAmount, 0.0);
}

OrderEntryData _normalizePendingOrderEntry(OrderEntryData entry) {
  if (entry.stage != OrderStageKey.toPay &&
      entry.stage != OrderStageKey.toPrepare) {
    return entry;
  }

  final nextRemainingBalance = math.max(entry.remainingBalanceAmount, 0.0);
  if (entry.stage == OrderStageKey.toPrepare) {
    return entry.copyWith(
      stage: OrderStageKey.toPrepare,
      amountToPayAmount: math.max(entry.amountToPayAmount, 0.0),
      remainingBalanceAmount: nextRemainingBalance,
    );
  }

  final isCodOrder = _isCodPaymentOption(entry.paymentOptionLabel);
  final nextAmountToPay = isCodOrder
      ? _codAmountStillNeededToProceed(
          entry,
          remainingBalanceAmount: nextRemainingBalance,
        )
      : math.max(entry.amountToPayAmount, 0.0) > 0.009
      ? math.max(entry.amountToPayAmount, 0.0)
      : nextRemainingBalance;
  final nextStage = nextAmountToPay > 0.009
      ? OrderStageKey.toPay
      : OrderStageKey.toPrepare;

  return entry.copyWith(
    stage: nextStage,
    amountToPayAmount: nextAmountToPay,
    remainingBalanceAmount: nextRemainingBalance,
  );
}

List<OrderEntryData> _mergeRemoteAndLocalOrderEntries(
  List<OrderEntryData> remoteEntries,
  List<OrderEntryData> localEntries,
) {
  final mergedById = <String, OrderEntryData>{};

  for (final entry in remoteEntries) {
    final normalizedId = entry.id.trim();
    if (normalizedId.isEmpty) {
      continue;
    }
    mergedById[normalizedId] = entry;
  }

  for (final entry in localEntries) {
    final normalizedId = entry.id.trim();
    if (normalizedId.isEmpty) {
      continue;
    }
    final remoteEntry = mergedById[normalizedId];
    if (remoteEntry != null && _hasRemoteCancellationDecision(remoteEntry)) {
      continue;
    }
    if (remoteEntry != null && _shouldPreferRemoteStage(remoteEntry, entry)) {
      continue;
    }
    mergedById[normalizedId] = entry;
  }

  return _sortOrderEntriesByNewest(mergedById.values);
}

List<OrderEntryData> _entriesNeedingRemoteSync(
  List<OrderEntryData> remoteEntries,
  List<OrderEntryData> localEntries,
) {
  final remoteById = <String, OrderEntryData>{
    for (final entry in remoteEntries)
      if (entry.id.trim().isNotEmpty) entry.id.trim(): entry,
  };

  return _sortOrderEntriesByNewest(
    localEntries.where((entry) {
      if (entry.skipRemoteSync) {
        return false;
      }

      final normalizedId = entry.id.trim();
      if (normalizedId.isEmpty) {
        return false;
      }

      final remoteEntry = remoteById[normalizedId];
      if (remoteEntry == null) {
        return true;
      }
      if (_hasRemoteCancellationDecision(remoteEntry)) {
        return false;
      }
      if (_shouldPreferRemoteStage(remoteEntry, entry)) {
        return false;
      }

      return !_areOrderEntriesEqual(entry, remoteEntry);
    }),
  );
}

bool _shouldPreferRemoteStage(
  OrderEntryData remoteEntry,
  OrderEntryData localEntry,
) {
  return _stageProgressRank(remoteEntry.stage) >
      _stageProgressRank(localEntry.stage);
}

int _stageProgressRank(OrderStageKey stage) {
  switch (stage) {
    case OrderStageKey.toPay:
      return 0;
    case OrderStageKey.toPrepare:
      return 1;
    case OrderStageKey.toShip:
      return 2;
    case OrderStageKey.toReceive:
      return 3;
    case OrderStageKey.toReview:
      return 4;
    case OrderStageKey.returnRequest:
      return 5;
    case OrderStageKey.cancelled:
      return 6;
  }
}

bool _hasRemoteCancellationDecision(OrderEntryData entry) {
  final status = entry.cancelRequestStatus.trim().toLowerCase();
  return status == 'accepted' || status == 'rejected';
}

bool _areOrderEntriesEqual(OrderEntryData left, OrderEntryData right) {
  return jsonEncode(left.toJson()) == jsonEncode(right.toJson());
}

List<OrderEntryData> _sortOrderEntriesByNewest(Iterable<OrderEntryData> entries) {
  final sortedEntries = entries.toList(growable: true)
    ..sort((left, right) {
      final createdAtDifference =
          right.createdAtEpochMs.compareTo(left.createdAtEpochMs);
      if (createdAtDifference != 0) {
        return createdAtDifference;
      }
      return left.id.compareTo(right.id);
    });
  return List<OrderEntryData>.unmodifiable(sortedEntries);
}
