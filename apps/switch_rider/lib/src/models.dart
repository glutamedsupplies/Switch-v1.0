import 'package:switch_core/switch_core.dart';

typedef Json = Map<String, dynamic>;

Json _map(Object? value) =>
    value is Map<String, dynamic> ? value : const <String, dynamic>{};
List<Json> _list(Object? value) => value is List
    ? value.whereType<Map<String, dynamic>>().toList(growable: false)
    : const <Json>[];
String _str(Object? value) => value == null ? '' : '$value';
int _int(Object? value) =>
    value is num ? value.toInt() : int.tryParse('${value ?? ''}') ?? 0;
bool _bool(Object? value) => value == true;
DateTime? _date(Object? value) =>
    value == null ? null : DateTime.tryParse('$value')?.toLocal();
double? _optionalDouble(Object? value) =>
    value == null ? null : readAmount(value);

class LabeledCode {
  const LabeledCode({
    required this.code,
    required this.label,
    this.flag = false,
  });

  final String code;
  final String label;

  /// `evidenceRequired` for failure reasons, `safety` for incident categories.
  final bool flag;
}

class SupportContacts {
  const SupportContacts({
    required this.hotline,
    required this.email,
    required this.emergencyNumber,
    required this.emergencyNote,
  });

  factory SupportContacts.fromJson(Json json) => SupportContacts(
    hotline: _str(json['hotline']),
    email: _str(json['email']),
    emergencyNumber: _str(json['emergencyNumber']).isEmpty
        ? '911'
        : _str(json['emergencyNumber']),
    emergencyNote: _str(json['emergencyNote']),
  );

  final String hotline;
  final String email;
  final String emergencyNumber;
  final String emergencyNote;
}

/// Reference data from `GET /api/rider/meta` (reasons, categories, documents).
class RiderMeta {
  const RiderMeta({
    required this.vehicleTypes,
    required this.documentLabels,
    required this.requiredDocuments,
    required this.failureReasons,
    required this.releaseReasons,
    required this.incidentCategories,
    required this.support,
    required this.maxUploadBytes,
  });

  factory RiderMeta.fromJson(Json json) {
    final required = <String, List<String>>{};
    _map(json['requiredDocuments']).forEach((key, value) {
      required[key] = value is List
          ? value.map(_str).toList()
          : const <String>[];
    });
    return RiderMeta(
      vehicleTypes: (json['vehicleTypes'] as List? ?? const [])
          .map(_str)
          .toList(),
      documentLabels: {
        for (final doc in _list(json['documentTypes']))
          _str(doc['type']): _str(doc['label']),
      },
      requiredDocuments: required,
      failureReasons: _list(json['failureReasons'])
          .map(
            (r) => LabeledCode(
              code: _str(r['code']),
              label: _str(r['label']),
              flag: _bool(r['evidenceRequired']),
            ),
          )
          .toList(),
      releaseReasons: _list(json['releaseReasons'])
          .map(
            (r) => LabeledCode(code: _str(r['code']), label: _str(r['label'])),
          )
          .toList(),
      incidentCategories: _list(json['incidentCategories'])
          .map(
            (r) => LabeledCode(
              code: _str(r['code']),
              label: _str(r['label']),
              flag: _bool(r['safety']),
            ),
          )
          .toList(),
      support: SupportContacts.fromJson(_map(json['support'])),
      maxUploadBytes: _int(json['maxUploadBytes']),
    );
  }

  final List<String> vehicleTypes;
  final Map<String, String> documentLabels;
  final Map<String, List<String>> requiredDocuments;
  final List<LabeledCode> failureReasons;
  final List<LabeledCode> releaseReasons;
  final List<LabeledCode> incidentCategories;
  final SupportContacts support;
  final int maxUploadBytes;

  String documentLabel(String type) => documentLabels[type] ?? type;
}

class RiderProfile {
  const RiderProfile({
    required this.id,
    required this.riderCode,
    required this.firstName,
    required this.lastName,
    required this.fullName,
    required this.mobileNumber,
    required this.countryCode,
    required this.email,
    required this.birthday,
    required this.status,
    required this.statusReason,
    required this.availabilityStatus,
    required this.vehicleType,
    required this.plateNumber,
    required this.vehicleModel,
    required this.vehicleColor,
    required this.emergencyName,
    required this.emergencyPhone,
    required this.emergencyRelationship,
    required this.ratingAverage,
    required this.ratingCount,
    required this.requiredDocuments,
    required this.missingDocuments,
    required this.canGoOnline,
    required this.currentDeliveryId,
  });

  factory RiderProfile.fromJson(Json json) {
    final vehicle = _map(json['vehicle']);
    final emergency = _map(json['emergencyContact']);
    return RiderProfile(
      id: _str(json['id']),
      riderCode: _str(json['riderCode']),
      firstName: _str(json['firstName']),
      lastName: _str(json['lastName']),
      fullName: _str(json['fullName']),
      mobileNumber: _str(json['mobileNumber']),
      countryCode: _str(json['countryCode']),
      email: _str(json['email']),
      birthday: _str(json['birthday']),
      status: _str(json['status']),
      statusReason: _str(json['statusReason']),
      availabilityStatus: _str(json['availabilityStatus']),
      vehicleType: _str(vehicle['type']),
      plateNumber: _str(vehicle['plateNumber']),
      vehicleModel: _str(vehicle['model']),
      vehicleColor: _str(vehicle['color']),
      emergencyName: _str(emergency['name']),
      emergencyPhone: _str(emergency['phone']),
      emergencyRelationship: _str(emergency['relationship']),
      ratingAverage: readAmount(json['ratingAverage']),
      ratingCount: _int(json['ratingCount']),
      requiredDocuments: (json['requiredDocuments'] as List? ?? const [])
          .map(_str)
          .toList(),
      missingDocuments: (json['missingDocuments'] as List? ?? const [])
          .map(_str)
          .toList(),
      canGoOnline: _bool(json['canGoOnline']),
      currentDeliveryId: _str(json['currentDeliveryId']),
    );
  }

  final String id;
  final String riderCode;
  final String firstName;
  final String lastName;
  final String fullName;
  final String mobileNumber;
  final String countryCode;
  final String email;
  final String birthday;
  final String status;
  final String statusReason;
  final String availabilityStatus;
  final String vehicleType;
  final String plateNumber;
  final String vehicleModel;
  final String vehicleColor;
  final String emergencyName;
  final String emergencyPhone;
  final String emergencyRelationship;
  final double ratingAverage;
  final int ratingCount;
  final List<String> requiredDocuments;
  final List<String> missingDocuments;
  final bool canGoOnline;
  final String currentDeliveryId;

  bool get isOnline => availabilityStatus != 'OFFLINE';
  bool get isOperational => status == 'APPROVED' || status == 'ACTIVE';
}

class RiderDocument {
  const RiderDocument({
    required this.id,
    required this.docType,
    required this.label,
    required this.reviewStatus,
    required this.reviewNote,
    required this.uploadedAt,
  });

  factory RiderDocument.fromJson(Json json) => RiderDocument(
    id: _str(json['id']),
    docType: _str(json['docType']),
    label: _str(json['label']),
    reviewStatus: _str(json['reviewStatus']),
    reviewNote: _str(json['reviewNote']),
    uploadedAt: _date(json['uploadedAt']),
  );

  final String id;
  final String docType;
  final String label;
  final String reviewStatus;
  final String reviewNote;
  final DateTime? uploadedAt;
}

class JobStop {
  const JobStop({
    required this.name,
    required this.address,
    required this.area,
    required this.phone,
    required this.lat,
    required this.lng,
  });

  factory JobStop.fromJson(Json json) => JobStop(
    name: _str(json['name']),
    address: _str(json['address']),
    area: _str(json['area']),
    phone: _str(json['phone']),
    lat: _optionalDouble(json['lat']),
    lng: _optionalDouble(json['lng']),
  );

  final String name;
  final String address;
  final String area;
  final String phone;
  final double? lat;
  final double? lng;

  bool get hasCoordinates =>
      lat != null && lng != null && (lat != 0 || lng != 0);
}

class RiderRoutePoint {
  const RiderRoutePoint({
    required this.kind,
    required this.label,
    required this.lat,
    required this.lng,
  });

  factory RiderRoutePoint.fromJson(Json json) => RiderRoutePoint(
    kind: _str(json['kind']),
    label: _str(json['label']),
    lat: readAmount(json['lat']),
    lng: readAmount(json['lng']),
  );

  final String kind;
  final String label;
  final double lat;
  final double lng;
}

class RiderRouteView {
  const RiderRouteView({
    required this.deliveryId,
    required this.deliveryCode,
    required this.status,
    required this.phase,
    required this.origin,
    required this.destination,
    required this.encodedPolyline,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.source,
    required this.updatedAt,
  });

  factory RiderRouteView.fromJson(Json json) => RiderRouteView(
    deliveryId: _str(json['deliveryId']),
    deliveryCode: _str(json['deliveryCode']),
    status: _str(json['status']),
    phase: _str(json['phase']),
    origin: json['origin'] is Json
        ? RiderRoutePoint.fromJson(json['origin'] as Json)
        : null,
    destination: json['destination'] is Json
        ? RiderRoutePoint.fromJson(json['destination'] as Json)
        : null,
    encodedPolyline: _str(json['encodedPolyline']),
    distanceMeters: _int(json['distanceMeters']),
    durationSeconds: _int(json['durationSeconds']),
    source: _str(json['source']),
    updatedAt: _date(json['updatedAt']),
  );

  final String deliveryId;
  final String deliveryCode;
  final String status;
  final String phase;
  final RiderRoutePoint? origin;
  final RiderRoutePoint? destination;
  final String encodedPolyline;
  final int distanceMeters;
  final int durationSeconds;
  final String source;
  final DateTime? updatedAt;

  bool get hasRoute => origin != null && destination != null;
}

class JobHistoryEntry {
  const JobHistoryEntry({
    required this.toStatus,
    required this.note,
    required this.at,
  });

  factory JobHistoryEntry.fromJson(Json json) => JobHistoryEntry(
    toStatus: _str(json['toStatus']),
    note: _str(json['note']),
    at: _date(json['at']),
  );

  final String toStatus;
  final String note;
  final DateTime? at;
}

class RiderJob {
  const RiderJob({
    required this.id,
    required this.deliveryCode,
    required this.orderReference,
    required this.status,
    required this.pickup,
    required this.dropoff,
    required this.packageCount,
    required this.packageNotes,
    required this.distanceKm,
    required this.estimatedMinutes,
    required this.riderEarning,
    required this.paymentMethod,
    required this.codAmount,
    required this.codCollected,
    required this.hasDeliveryProof,
    required this.hasFailedAttemptProof,
    required this.pickupPinAttemptsRemaining,
    required this.deliveryPinAttemptsRemaining,
    required this.returnPinAttemptsRemaining,
    required this.history,
  });

  factory RiderJob.fromJson(Json json) => RiderJob(
    id: _str(json['id']),
    deliveryCode: _str(json['deliveryCode']),
    orderReference: _str(json['orderReference']),
    status: _str(json['status']),
    pickup: JobStop.fromJson(_map(json['pickup'])),
    dropoff: JobStop.fromJson(_map(json['dropoff'])),
    packageCount: _int(json['packageCount']),
    packageNotes: _str(json['packageNotes']),
    distanceKm: readAmount(json['distanceKm']),
    estimatedMinutes: _int(json['estimatedMinutes']),
    riderEarning: readAmount(json['riderEarning']),
    paymentMethod: _str(json['paymentMethod']),
    codAmount: readAmount(json['codAmount']),
    codCollected: _bool(json['codCollected']),
    hasDeliveryProof: _bool(json['hasDeliveryProof']),
    hasFailedAttemptProof: _bool(json['hasFailedAttemptProof']),
    pickupPinAttemptsRemaining: _int(json['pickupPinAttemptsRemaining'] ?? 5),
    deliveryPinAttemptsRemaining: _int(
      json['deliveryPinAttemptsRemaining'] ?? 5,
    ),
    returnPinAttemptsRemaining: _int(json['returnPinAttemptsRemaining'] ?? 5),
    history: _list(json['history']).map(JobHistoryEntry.fromJson).toList(),
  );

  final String id;
  final String deliveryCode;
  final String orderReference;
  final String status;
  final JobStop pickup;
  final JobStop dropoff;
  final int packageCount;
  final String packageNotes;
  final double distanceKm;
  final int estimatedMinutes;
  final double riderEarning;
  final String paymentMethod;
  final double codAmount;
  final bool codCollected;
  final bool hasDeliveryProof;
  final bool hasFailedAttemptProof;
  final int pickupPinAttemptsRemaining;
  final int deliveryPinAttemptsRemaining;
  final int returnPinAttemptsRemaining;
  final List<JobHistoryEntry> history;

  bool get isCod => paymentMethod == 'COD' && codAmount > 0;
  bool get isBeforePickup => const {
    'RIDER_ASSIGNED',
    'RIDER_TO_PICKUP',
    'ARRIVED_AT_PICKUP',
  }.contains(status);
  bool get isReturning =>
      status == 'RETURN_REQUIRED' || status == 'RETURNING_TO_SELLER';
}

class RiderOffer {
  const RiderOffer({
    required this.offerId,
    required this.deliveryId,
    required this.deliveryCode,
    required this.expiresAt,
    required this.secondsRemaining,
    required this.pickupArea,
    required this.dropoffArea,
    required this.distanceKm,
    required this.distanceToPickupKm,
    required this.estimatedMinutes,
    required this.riderEarning,
    required this.isCod,
    required this.codAmount,
    required this.vehicleTypeRequired,
    required this.packageCount,
    required this.packageNotes,
  });

  factory RiderOffer.fromJson(Json json) => RiderOffer(
    offerId: _str(json['offerId']),
    deliveryId: _str(json['deliveryId']),
    deliveryCode: _str(json['deliveryCode']),
    expiresAt: _date(json['expiresAt']),
    secondsRemaining: _int(json['secondsRemaining']),
    pickupArea: _str(json['pickupArea']),
    dropoffArea: _str(json['dropoffArea']),
    distanceKm: readAmount(json['distanceKm']),
    distanceToPickupKm: readAmount(json['distanceToPickupKm']),
    estimatedMinutes: _int(json['estimatedMinutes']),
    riderEarning: readAmount(json['riderEarning']),
    isCod: _bool(json['isCod']),
    codAmount: readAmount(json['codAmount']),
    vehicleTypeRequired: _str(json['vehicleTypeRequired']),
    packageCount: _int(json['packageCount']),
    packageNotes: _str(json['packageNotes']),
  );

  final String offerId;
  final String deliveryId;
  final String deliveryCode;
  final DateTime? expiresAt;
  final int secondsRemaining;
  final String pickupArea;
  final String dropoffArea;
  final double distanceKm;
  final double distanceToPickupKm;
  final int estimatedMinutes;
  final double riderEarning;
  final bool isCod;
  final double codAmount;
  final String vehicleTypeRequired;
  final int packageCount;
  final String packageNotes;
}

class RiderDashboard {
  const RiderDashboard({
    required this.riderStatus,
    required this.availabilityStatus,
    required this.statusLabel,
    required this.todayEarnings,
    required this.completedToday,
    required this.pendingEarnings,
    required this.availableEarnings,
    required this.cashOnHand,
    required this.currentDelivery,
    required this.activeDeliveryCount,
    required this.unreadNotifications,
  });

  factory RiderDashboard.fromJson(Json json) {
    final current = json['currentDelivery'];
    return RiderDashboard(
      riderStatus: _str(json['riderStatus']),
      availabilityStatus: _str(json['availabilityStatus']),
      statusLabel: _str(json['statusLabel']),
      todayEarnings: readAmount(json['todayEarnings']),
      completedToday: _int(json['completedToday']),
      pendingEarnings: readAmount(json['pendingEarnings']),
      availableEarnings: readAmount(json['availableEarnings']),
      cashOnHand: readAmount(json['cashOnHand']),
      currentDelivery: current is Map<String, dynamic>
          ? RiderJob.fromJson(current)
          : null,
      activeDeliveryCount: _int(json['activeDeliveryCount']),
      unreadNotifications: _int(json['unreadNotifications']),
    );
  }

  final String riderStatus;
  final String availabilityStatus;
  final String statusLabel;
  final double todayEarnings;
  final int completedToday;
  final double pendingEarnings;
  final double availableEarnings;
  final double cashOnHand;
  final RiderJob? currentDelivery;
  final int activeDeliveryCount;
  final int unreadNotifications;
}

class HistoryItem {
  const HistoryItem({
    required this.deliveryId,
    required this.deliveryCode,
    required this.status,
    required this.statusLabel,
    required this.route,
    required this.distanceKm,
    required this.paymentMethod,
    required this.codAmount,
    required this.earning,
    required this.earningStatus,
    required this.rating,
    required this.finishedAt,
  });

  factory HistoryItem.fromJson(Json json) => HistoryItem(
    deliveryId: _str(json['deliveryId']),
    deliveryCode: _str(json['deliveryCode']),
    status: _str(json['status']),
    statusLabel: _str(json['statusLabel']),
    route: _str(json['route']),
    distanceKm: readAmount(json['distanceKm']),
    paymentMethod: _str(json['paymentMethod']),
    codAmount: readAmount(json['codAmount']),
    earning: readAmount(json['earning']),
    earningStatus: _str(json['earningStatus']),
    rating: json['rating'] == null ? null : _int(json['rating']),
    finishedAt: _date(json['finishedAt']),
  );

  final String deliveryId;
  final String deliveryCode;
  final String status;
  final String statusLabel;
  final String route;
  final double distanceKm;
  final String paymentMethod;
  final double codAmount;
  final double earning;
  final String earningStatus;
  final int? rating;
  final DateTime? finishedAt;
}

class EarningLine {
  const EarningLine({
    required this.id,
    required this.deliveryCode,
    required this.route,
    required this.type,
    required this.baseFee,
    required this.distanceFee,
    required this.bonus,
    required this.tip,
    required this.adjustment,
    required this.total,
    required this.status,
    required this.availableAt,
    required this.createdAt,
  });

  factory EarningLine.fromJson(Json json) => EarningLine(
    id: _str(json['id']),
    deliveryCode: _str(json['deliveryCode']),
    route: _str(json['route']),
    type: _str(json['type']),
    baseFee: readAmount(json['baseFee']),
    distanceFee: readAmount(json['distanceFee']),
    bonus: readAmount(json['bonus']),
    tip: readAmount(json['tip']),
    adjustment: readAmount(json['adjustment']),
    total: readAmount(json['total']),
    status: _str(json['status']),
    availableAt: _date(json['availableAt']),
    createdAt: _date(json['createdAt']),
  );

  final String id;
  final String deliveryCode;
  final String route;
  final String type;
  final double baseFee;
  final double distanceFee;
  final double bonus;
  final double tip;
  final double adjustment;
  final double total;
  final String status;
  final DateTime? availableAt;
  final DateTime? createdAt;
}

class MoneyMovement {
  const MoneyMovement({
    required this.id,
    required this.amount,
    required this.method,
    required this.reference,
    required this.status,
    required this.note,
    required this.createdAt,
  });

  factory MoneyMovement.fromJson(Json json) => MoneyMovement(
    id: _str(json['id']),
    amount: readAmount(json['amount']),
    method: _str(json['method']),
    reference: _str(json['reference']),
    status: _str(json['status']),
    note: _str(json['note']),
    createdAt: _date(json['createdAt']),
  );

  final String id;
  final double amount;
  final String method;
  final String reference;
  final String status;
  final String note;
  final DateTime? createdAt;
}

class EarningsSummary {
  const EarningsSummary({
    required this.today,
    required this.week,
    required this.month,
    required this.todayDeliveries,
    required this.pending,
    required this.available,
    required this.paid,
    required this.earnings,
    required this.payouts,
  });

  factory EarningsSummary.fromJson(Json json) {
    final balances = _map(json['balances']);
    return EarningsSummary(
      today: readAmount(json['today']),
      week: readAmount(json['week']),
      month: readAmount(json['month']),
      todayDeliveries: _int(json['todayDeliveries']),
      pending: readAmount(balances['pending']),
      available: readAmount(balances['available']),
      paid: readAmount(balances['paid']),
      earnings: _list(json['earnings']).map(EarningLine.fromJson).toList(),
      payouts: _list(json['payouts']).map(MoneyMovement.fromJson).toList(),
    );
  }

  final double today;
  final double week;
  final double month;
  final int todayDeliveries;
  final double pending;
  final double available;
  final double paid;
  final List<EarningLine> earnings;
  final List<MoneyMovement> payouts;
}

class CodCollection {
  const CodCollection({
    required this.id,
    required this.deliveryCode,
    required this.amount,
    required this.status,
    required this.collectedAt,
  });

  factory CodCollection.fromJson(Json json) => CodCollection(
    id: _str(json['id']),
    deliveryCode: _str(json['deliveryCode']),
    amount: readAmount(json['amount']),
    status: _str(json['status']),
    collectedAt: _date(json['collectedAt']),
  );

  final String id;
  final String deliveryCode;
  final double amount;
  final String status;
  final DateTime? collectedAt;
}

class CashWallet {
  const CashWallet({
    required this.collected,
    required this.remittedAwaitingVerification,
    required this.verified,
    required this.outstanding,
    required this.collections,
    required this.remittances,
  });

  factory CashWallet.fromJson(Json json) => CashWallet(
    collected: readAmount(json['collected']),
    remittedAwaitingVerification: readAmount(
      json['remittedAwaitingVerification'],
    ),
    verified: readAmount(json['verified']),
    outstanding: readAmount(json['outstanding']),
    collections: _list(
      json['transactions'],
    ).map(CodCollection.fromJson).toList(),
    remittances: _list(
      json['remittances'],
    ).map(MoneyMovement.fromJson).toList(),
  );

  final double collected;
  final double remittedAwaitingVerification;
  final double verified;
  final double outstanding;
  final List<CodCollection> collections;
  final List<MoneyMovement> remittances;
}

class RiderNotification {
  const RiderNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.deliveryId,
    required this.read,
    required this.createdAt,
  });

  factory RiderNotification.fromJson(Json json) => RiderNotification(
    id: _str(json['id']),
    type: _str(json['type']),
    title: _str(json['title']),
    body: _str(json['body']),
    deliveryId: _str(json['deliveryId']),
    read: _bool(json['read']),
    createdAt: _date(json['createdAt']),
  );

  final String id;
  final String type;
  final String title;
  final String body;
  final String deliveryId;
  final bool read;
  final DateTime? createdAt;
}

class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.deliveryCode,
    required this.categoryLabel,
    required this.description,
    required this.isSafety,
    required this.status,
    required this.resolution,
    required this.createdAt,
  });

  factory SupportTicket.fromJson(Json json) => SupportTicket(
    id: _str(json['id']),
    deliveryCode: _str(json['deliveryCode']),
    categoryLabel: _str(json['categoryLabel']),
    description: _str(json['description']),
    isSafety: _bool(json['isSafety']),
    status: _str(json['status']),
    resolution: _str(json['resolution']),
    createdAt: _date(json['createdAt']),
  );

  final String id;
  final String deliveryCode;
  final String categoryLabel;
  final String description;
  final bool isSafety;
  final String status;
  final String resolution;
  final DateTime? createdAt;
}

class RiderPerformance {
  const RiderPerformance({
    required this.acceptanceRate,
    required this.completionRate,
    required this.cancellationRate,
    required this.onTimeRate,
    required this.deliveredCount,
    required this.offersReceived,
    required this.ratingAverage,
    required this.ratingCount,
    required this.definitions,
  });

  factory RiderPerformance.fromJson(Json json) => RiderPerformance(
    acceptanceRate: _optionalDouble(json['acceptanceRate']),
    completionRate: _optionalDouble(json['completionRate']),
    cancellationRate: _optionalDouble(json['cancellationRate']),
    onTimeRate: _optionalDouble(json['onTimeRate']),
    deliveredCount: _int(json['deliveredCount']),
    offersReceived: _int(json['offersReceived']),
    ratingAverage: readAmount(json['ratingAverage']),
    ratingCount: _int(json['ratingCount']),
    definitions: _map(
      json['definitions'],
    ).map((key, value) => MapEntry(key, _str(value))),
  );

  final double? acceptanceRate;
  final double? completionRate;
  final double? cancellationRate;
  final double? onTimeRate;
  final int deliveredCount;
  final int offersReceived;
  final double ratingAverage;
  final int ratingCount;
  final Map<String, String> definitions;
}
