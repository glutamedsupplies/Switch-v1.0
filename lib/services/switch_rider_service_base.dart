import 'dart:typed_data';

const String switchRiderPartnerId = 'switch-rider';
const String switchRiderPartnerName = 'Switch Rider';

bool isSwitchRiderPartnerName(String value) {
  return value.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ') ==
      switchRiderPartnerName.toLowerCase();
}

double _toDouble(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse('${value ?? ''}') ?? 0;
}

int _toInt(Object? value) {
  if (value is num) return value.toInt();
  return int.tryParse('${value ?? ''}') ?? 0;
}

String _toText(Object? value) => (value?.toString() ?? '').trim();

Map<String, dynamic>? _toMap(Object? value) {
  return value is Map ? Map<String, dynamic>.from(value) : null;
}

class SwitchRiderApiException implements Exception {
  const SwitchRiderApiException(
    this.message, {
    this.code = '',
    this.statusCode = 0,
  });

  final String message;
  final String code;
  final int statusCode;

  bool get isNetworkError => statusCode == 0;

  @override
  String toString() => message;
}

class SwitchRiderQuote {
  const SwitchRiderQuote({
    required this.available,
    required this.code,
    required this.message,
    required this.deliveryFee,
    required this.distanceKm,
    required this.estimatedMinutes,
    required this.estimateLabel,
    required this.quoteToken,
    required this.expiresAt,
  });

  factory SwitchRiderQuote.fromJson(Map<String, dynamic> json) {
    return SwitchRiderQuote(
      available: json['available'] == true,
      code: _toText(json['code']),
      message: _toText(json['message']),
      deliveryFee: _toDouble(json['deliveryFee']),
      distanceKm: _toDouble(json['distanceKm']),
      estimatedMinutes: _toInt(json['estimatedMinutes']),
      estimateLabel: _toText(json['estimateLabel']),
      quoteToken: _toText(json['quoteToken']),
      expiresAt: DateTime.tryParse(_toText(json['expiresAt'])),
    );
  }

  final bool available;
  final String code;
  final String message;
  final double deliveryFee;
  final double distanceKm;
  final int estimatedMinutes;
  final String estimateLabel;
  final String quoteToken;
  final DateTime? expiresAt;

  bool get isUsable => available && quoteToken.isNotEmpty;

  bool expiresWithin(Duration margin) {
    final expiry = expiresAt;
    if (expiry == null) return true;
    return DateTime.now().add(margin).isAfter(expiry);
  }
}

class SwitchRiderTimelineStep {
  const SwitchRiderTimelineStep({
    required this.key,
    required this.label,
    required this.done,
    required this.active,
    required this.at,
  });

  factory SwitchRiderTimelineStep.fromJson(Map<String, dynamic> json) {
    return SwitchRiderTimelineStep(
      key: _toText(json['key']),
      label: _toText(json['label']),
      done: json['done'] == true,
      active: json['active'] == true,
      at: DateTime.tryParse(_toText(json['at']))?.toLocal(),
    );
  }

  final String key;
  final String label;
  final bool done;
  final bool active;
  final DateTime? at;
}

class SwitchRiderPublicRider {
  const SwitchRiderPublicRider({
    required this.firstName,
    required this.photoUrl,
    required this.vehicleType,
    required this.vehicleModel,
    required this.vehicleColor,
    required this.plateNumber,
    required this.ratingAverage,
    required this.ratingCount,
  });

  factory SwitchRiderPublicRider.fromJson(Map<String, dynamic> json) {
    return SwitchRiderPublicRider(
      firstName: _toText(json['firstName']),
      photoUrl: _toText(json['photoUrl']),
      vehicleType: _toText(json['vehicleType']),
      vehicleModel: _toText(json['vehicleModel']),
      vehicleColor: _toText(json['vehicleColor']),
      plateNumber: _toText(json['plateNumber']),
      ratingAverage: _toDouble(json['ratingAverage']),
      ratingCount: _toInt(json['ratingCount']),
    );
  }

  final String firstName;
  final String photoUrl;
  final String vehicleType;
  final String vehicleModel;
  final String vehicleColor;
  final String plateNumber;
  final double ratingAverage;
  final int ratingCount;

  String get vehicleLabel {
    final parts = <String>[
      vehicleColor,
      vehicleModel,
      switch (vehicleType.toUpperCase()) {
        'MOTORCYCLE' => 'Motorcycle',
        'BICYCLE' => 'Bicycle',
        'CAR' => 'Car',
        'VAN' => 'Van',
        _ => vehicleType,
      },
    ].where((part) => part.trim().isNotEmpty);
    return parts.join(' ');
  }
}

class SwitchRiderRating {
  const SwitchRiderRating({required this.stars, required this.comment});

  factory SwitchRiderRating.fromJson(Map<String, dynamic> json) {
    return SwitchRiderRating(
      stars: _toInt(json['stars']),
      comment: _toText(json['comment']),
    );
  }

  final int stars;
  final String comment;
}

class SwitchRiderMapPoint {
  const SwitchRiderMapPoint(this.lat, this.lng);

  static SwitchRiderMapPoint? fromJson(Map<String, dynamic>? json) {
    if (json == null || json['lat'] == null || json['lng'] == null) return null;
    final lat = _toDouble(json['lat']);
    final lng = _toDouble(json['lng']);
    if (lat == 0 && lng == 0) return null;
    return SwitchRiderMapPoint(lat, lng);
  }

  final double lat;
  final double lng;
}

/// Decodes a Google encoded polyline (precision 5).
List<SwitchRiderMapPoint> decodeSwitchRiderPolyline(String encoded) {
  final points = <SwitchRiderMapPoint>[];
  var index = 0;
  var lat = 0;
  var lng = 0;
  int nextValue() {
    var result = 0;
    var shift = 0;
    int byte;
    do {
      if (index >= encoded.length) return 0;
      byte = encoded.codeUnitAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return (result & 1) != 0 ? ~(result >> 1) : result >> 1;
  }

  while (index < encoded.length) {
    lat += nextValue();
    lng += nextValue();
    points.add(SwitchRiderMapPoint(lat / 1e5, lng / 1e5));
  }
  return points;
}

class SwitchRiderRouteSegment {
  const SwitchRiderRouteSegment({
    required this.kind,
    required this.points,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.isEstimate,
  });

  factory SwitchRiderRouteSegment.fromJson(Map<String, dynamic> json) {
    return SwitchRiderRouteSegment(
      kind: _toText(json['kind']).toUpperCase(),
      points: decodeSwitchRiderPolyline(_toText(json['encodedPolyline'])),
      distanceMeters: _toInt(json['distanceMeters']),
      durationSeconds: _toInt(json['durationSeconds']),
      isEstimate: _toText(json['source']) != 'google',
    );
  }

  /// TO_PICKUP (rider → store), TO_DROPOFF (rider → buyer), PLANNED (store → buyer).
  final String kind;
  final List<SwitchRiderMapPoint> points;
  final int distanceMeters;
  final int durationSeconds;
  final bool isEstimate;

  bool get isLive => kind == 'TO_PICKUP' || kind == 'TO_DROPOFF';
}

class SwitchRiderRoute {
  const SwitchRiderRoute({
    required this.phase,
    required this.segments,
    required this.etaSeconds,
  });

  static SwitchRiderRoute? fromJson(Map<String, dynamic>? json) {
    if (json == null) return null;
    final segments = (json['segments'] is List ? json['segments'] as List : const [])
        .map(_toMap)
        .whereType<Map<String, dynamic>>()
        .map(SwitchRiderRouteSegment.fromJson)
        .where((segment) => segment.points.length >= 2)
        .toList(growable: false);
    if (segments.isEmpty) return null;
    return SwitchRiderRoute(
      phase: _toText(json['phase']).toUpperCase(),
      segments: segments,
      etaSeconds: _toInt(json['etaSeconds']),
    );
  }

  /// PLANNED, TO_PICKUP or TO_DROPOFF.
  final String phase;
  final List<SwitchRiderRouteSegment> segments;
  final int etaSeconds;
}

class SwitchRiderTracking {
  const SwitchRiderTracking({
    required this.deliveryId,
    required this.deliveryCode,
    required this.status,
    required this.statusLabel,
    required this.exception,
    required this.exceptionMessage,
    required this.timeline,
    required this.rider,
    required this.riderPhone,
    required this.deliveryPin,
    required this.riderLatitude,
    required this.riderLongitude,
    required this.locationUpdatedAt,
    required this.pickup,
    required this.pickupName,
    required this.dropoff,
    required this.route,
    required this.estimatedMinutes,
    required this.estimateNote,
    required this.paymentMethod,
    required this.codAmount,
    required this.deliveryFee,
    required this.canRate,
    required this.rating,
    required this.pollIntervalSeconds,
  });

  factory SwitchRiderTracking.fromJson(Map<String, dynamic> json) {
    final riderJson = _toMap(json['rider']);
    final ratingJson = _toMap(json['rating']);
    final locationJson = _toMap(json['riderLocation']);
    final pickupJson = _toMap(json['pickup']);
    return SwitchRiderTracking(
      deliveryId: _toText(json['deliveryId']),
      deliveryCode: _toText(json['deliveryCode']),
      status: _toText(json['status']),
      statusLabel: _toText(json['statusLabel']),
      exception: json['exception'] == true,
      exceptionMessage: _toText(json['exceptionMessage']),
      timeline: (json['timeline'] is List ? json['timeline'] as List : const [])
          .map(_toMap)
          .whereType<Map<String, dynamic>>()
          .map(SwitchRiderTimelineStep.fromJson)
          .toList(growable: false),
      rider: riderJson == null
          ? null
          : SwitchRiderPublicRider.fromJson(riderJson),
      riderPhone: _toText(json['riderPhone']),
      deliveryPin: _toText(json['deliveryPin']),
      riderLatitude: locationJson == null
          ? null
          : _toDouble(locationJson['lat']),
      riderLongitude: locationJson == null
          ? null
          : _toDouble(locationJson['lng']),
      locationUpdatedAt: DateTime.tryParse(
        _toText(locationJson?['updatedAt']),
      )?.toLocal(),
      pickup: SwitchRiderMapPoint.fromJson(pickupJson),
      pickupName: _toText(pickupJson?['name']),
      dropoff: SwitchRiderMapPoint.fromJson(_toMap(json['dropoff'])),
      route: SwitchRiderRoute.fromJson(_toMap(json['route'])),
      estimatedMinutes: _toInt(json['estimatedMinutes']),
      estimateNote: _toText(json['estimateNote']),
      paymentMethod: _toText(json['paymentMethod']),
      codAmount: _toDouble(json['codAmount']),
      deliveryFee: _toDouble(json['deliveryFee']),
      canRate: json['canRate'] == true,
      rating: ratingJson == null ? null : SwitchRiderRating.fromJson(ratingJson),
      pollIntervalSeconds: _toInt(json['pollIntervalSeconds']),
    );
  }

  final String deliveryId;
  final String deliveryCode;
  final String status;
  final String statusLabel;
  final bool exception;
  final String exceptionMessage;
  final List<SwitchRiderTimelineStep> timeline;
  final SwitchRiderPublicRider? rider;
  final String riderPhone;
  final String deliveryPin;
  final double? riderLatitude;
  final double? riderLongitude;
  final DateTime? locationUpdatedAt;

  bool get hasLiveLocation => riderLatitude != null && riderLongitude != null;
  SwitchRiderMapPoint? get riderPoint => hasLiveLocation
      ? SwitchRiderMapPoint(riderLatitude!, riderLongitude!)
      : null;
  final SwitchRiderMapPoint? pickup;
  final String pickupName;
  final SwitchRiderMapPoint? dropoff;
  final SwitchRiderRoute? route;
  final int estimatedMinutes;
  final String estimateNote;
  final String paymentMethod;
  final double codAmount;
  final double deliveryFee;
  final bool canRate;
  final SwitchRiderRating? rating;
  final int pollIntervalSeconds;

  bool get isFinished =>
      status == 'DELIVERED' ||
      status == 'CANCELLED' ||
      status == 'RETURNED_TO_SELLER';

  Duration get pollInterval {
    final seconds = pollIntervalSeconds <= 0 ? 30 : pollIntervalSeconds;
    return Duration(seconds: seconds.clamp(10, 120));
  }
}

class SwitchRiderBuyerNotification {
  const SwitchRiderBuyerNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.orderGroupId,
    required this.createdAt,
  });

  factory SwitchRiderBuyerNotification.fromJson(Map<String, dynamic> json) {
    return SwitchRiderBuyerNotification(
      id: _toText(json['id']),
      title: _toText(json['title']),
      body: _toText(json['body']),
      orderGroupId: _toText(json['orderGroupId']),
      createdAt: DateTime.tryParse(_toText(json['createdAt']))?.toLocal(),
    );
  }

  final String id;
  final String title;
  final String body;
  final String orderGroupId;
  final DateTime? createdAt;
}

abstract class SwitchRiderService {
  /// Delivery updates for the signed-in buyer, newest first.
  Future<List<SwitchRiderBuyerNotification>> fetchBuyerNotifications();

  /// Server-side delivery quote for one seller and the buyer's pinned address.
  Future<SwitchRiderQuote> fetchQuote({
    required String sellerAdminId,
    required double latitude,
    required double longitude,
  });

  /// Returns null when the order has no Switch Rider delivery.
  Future<SwitchRiderTracking?> fetchTracking(String orderReference);

  Future<SwitchRiderRating> rateRider(
    String orderReference, {
    required int stars,
    String comment = '',
  });

  /// Rider photos are private; they are only served to the order's buyer.
  Future<Uint8List?> fetchRiderPhoto(String photoPath);
}
