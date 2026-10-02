import 'dart:typed_data';

import 'package:switch_core/switch_core.dart';

import 'models.dart';

class RiderAuthResult {
  const RiderAuthResult({required this.rider, required this.sessionToken});

  final RiderProfile rider;
  final String sessionToken;
}

class RiderVerificationSendResult {
  const RiderVerificationSendResult({required this.resendCooldownSeconds});

  final int resendCooldownSeconds;
}

class RiderVerificationResult {
  const RiderVerificationResult({required this.verificationToken});

  final String verificationToken;
}

class RiderSocialCredential {
  const RiderSocialCredential({
    required this.provider,
    this.idToken = '',
    this.accessToken = '',
  });

  final String provider;
  final String idToken;
  final String accessToken;

  Map<String, dynamic> toJson() => {
    'provider': provider,
    if (idToken.isNotEmpty) 'idToken': idToken,
    if (accessToken.isNotEmpty) 'accessToken': accessToken,
  };
}

class RiderSocialProfile {
  const RiderSocialProfile({
    required this.provider,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.displayName = '',
    this.picture = '',
  });

  factory RiderSocialProfile.fromJson(Json json) => RiderSocialProfile(
    provider: '${json['provider'] ?? ''}',
    email: '${json['email'] ?? ''}',
    firstName: '${json['firstName'] ?? ''}',
    lastName: '${json['lastName'] ?? ''}',
    displayName: '${json['displayName'] ?? ''}',
    picture: '${json['picture'] ?? ''}',
  );

  final String provider;
  final String email;
  final String firstName;
  final String lastName;
  final String displayName;
  final String picture;
}

class RiderSocialAuthResult {
  const RiderSocialAuthResult({
    required this.requiresApplication,
    this.auth,
    this.profile,
  });

  final bool requiresApplication;
  final RiderAuthResult? auth;
  final RiderSocialProfile? profile;
}

class RiderLocationResult {
  const RiderLocationResult({
    required this.accepted,
    required this.nextUpdateInSeconds,
  });

  final bool accepted;
  final int nextUpdateInSeconds;
}

/// Typed wrapper for the rider-only `/api/rider/*` endpoints.
class RiderApi {
  RiderApi(this.client);

  final SwitchApiClient client;

  static const _base = '/api/rider';

  RiderProfile _rider(Json body) => RiderProfile.fromJson(
    body['rider'] as Json? ?? const <String, dynamic>{},
  );

  Future<RiderMeta> meta() async =>
      RiderMeta.fromJson(await client.getJson('$_base/meta'));

  Future<RiderAuthResult> login({
    required String mobileNumber,
    required String password,
  }) async {
    final body = await client.postJson('$_base/auth/login', {
      'countryCode': '+63',
      'mobileNumber': mobileNumber,
      'password': password,
    });
    return RiderAuthResult(
      rider: _rider(body),
      sessionToken: '${body['sessionToken'] ?? ''}',
    );
  }

  Future<RiderAuthResult> register(Map<String, dynamic> payload) async {
    final body = await client.postJson('$_base/auth/register', payload);
    return RiderAuthResult(
      rider: _rider(body),
      sessionToken: '${body['sessionToken'] ?? ''}',
    );
  }

  Future<RiderSocialAuthResult> socialAuth(
    RiderSocialCredential credential,
  ) async {
    final body = await client.postJson(
      '$_base/auth/social',
      credential.toJson(),
    );
    final requiresApplication = body['requiresApplication'] == true;
    if (requiresApplication) {
      return RiderSocialAuthResult(
        requiresApplication: true,
        profile: RiderSocialProfile.fromJson(
          body['profile'] as Json? ?? const <String, dynamic>{},
        ),
      );
    }
    return RiderSocialAuthResult(
      requiresApplication: false,
      auth: RiderAuthResult(
        rider: _rider(body),
        sessionToken: '${body['sessionToken'] ?? ''}',
      ),
    );
  }

  Future<RiderVerificationSendResult> sendRegistrationCode(String email) async {
    final body = await client.postJson('/api/auth/verification/send', {
      'purpose': 'rider_registration',
      'channel': 'email',
      'email': email,
      'target': email,
    });
    return RiderVerificationSendResult(
      resendCooldownSeconds:
          (body['resendCooldownSeconds'] as num?)?.toInt() ?? 60,
    );
  }

  Future<RiderVerificationResult> verifyRegistrationCode({
    required String email,
    required String code,
  }) async {
    final body = await client.postJson('/api/auth/verification/verify', {
      'purpose': 'rider_registration',
      'channel': 'email',
      'email': email,
      'target': email,
      'code': code,
    });
    return RiderVerificationResult(
      verificationToken: '${body['verificationToken'] ?? ''}',
    );
  }

  Future<void> logout() => client.postJson('$_base/auth/logout');

  Future<RiderProfile> me() async => _rider(await client.getJson('$_base/me'));

  Future<RiderProfile> updateProfile(Map<String, dynamic> changes) async =>
      _rider(await client.patchJson('$_base/me', changes));

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) => client.postJson('$_base/me/password', {
    'currentPassword': currentPassword,
    'newPassword': newPassword,
  });

  Future<List<RiderDocument>> documents() async {
    final body = await client.getJson('$_base/documents');
    return (body['documents'] as List? ?? const [])
        .whereType<Json>()
        .map(RiderDocument.fromJson)
        .toList();
  }

  Future<RiderProfile> uploadDocument(
    String type,
    Uint8List bytes,
    String contentType,
  ) async {
    final body = await client.postBytes(
      '$_base/documents',
      bytes,
      contentType: contentType,
      query: {'type': type},
    );
    return _rider(body);
  }

  Future<RiderDashboard> dashboard() async {
    final body = await client.getJson('$_base/dashboard');
    return RiderDashboard.fromJson(
      body['dashboard'] as Json? ?? const <String, dynamic>{},
    );
  }

  Future<RiderProfile> setAvailability({
    required bool online,
    double? lat,
    double? lng,
    double? accuracy,
  }) async {
    final body = await client.postJson('$_base/availability', {
      'online': online,
      if (online && lat != null && lng != null)
        'location': {'lat': lat, 'lng': lng, 'accuracy': accuracy ?? 0},
    });
    return _rider(body);
  }

  Future<RiderLocationResult> sendLocation({
    required double lat,
    required double lng,
    required double accuracy,
    DateTime? recordedAt,
  }) async {
    final body = await client.postJson('$_base/location', {
      'lat': lat,
      'lng': lng,
      'accuracy': accuracy,
      if (recordedAt != null)
        'recordedAt': recordedAt.toUtc().toIso8601String(),
    });
    return RiderLocationResult(
      accepted: body['accepted'] == true,
      nextUpdateInSeconds: (body['nextUpdateInSeconds'] as num?)?.toInt() ?? 15,
    );
  }

  Future<RiderOffer?> currentOffer() async {
    final body = await client.getJson('$_base/offers/current');
    final offer = body['offer'];
    return offer is Json ? RiderOffer.fromJson(offer) : null;
  }

  Future<RiderRouteView> offerRoute(String offerId) async {
    final body = await client.getJson(
      '$_base/offers/${Uri.encodeComponent(offerId)}/route',
    );
    return RiderRouteView.fromJson(body['route'] as Json);
  }

  /// Returns the accepted job, or null when the offer was declined.
  Future<RiderJob?> respondToOffer(
    String offerId, {
    required bool accept,
    String reason = '',
  }) async {
    final body = await client.postJson(
      '$_base/offers/${Uri.encodeComponent(offerId)}/${accept ? 'accept' : 'decline'}',
      {'reason': reason},
    );
    final job = body['job'];
    return job is Json ? RiderJob.fromJson(job) : null;
  }

  Future<List<RiderJob>> activeJobs() async {
    final body = await client.getJson('$_base/jobs');
    return (body['jobs'] as List? ?? const [])
        .whereType<Json>()
        .map(RiderJob.fromJson)
        .toList();
  }

  Future<RiderJob> job(String jobId) async {
    final body = await client.getJson(
      '$_base/jobs/${Uri.encodeComponent(jobId)}',
    );
    return RiderJob.fromJson(body['job'] as Json);
  }

  Future<RiderRouteView> jobRoute(
    String jobId, {
    double? lat,
    double? lng,
  }) async {
    final body = await client.getJson(
      '$_base/jobs/${Uri.encodeComponent(jobId)}/route',
      query: {
        if (lat != null) 'lat': lat.toStringAsFixed(7),
        if (lng != null) 'lng': lng.toStringAsFixed(7),
      },
    );
    return RiderRouteView.fromJson(body['route'] as Json);
  }

  /// Runs a workflow step (start-pickup, confirm-pickup, complete, ...).
  /// Returns the refreshed job, or null when the rider handed the job back.
  Future<RiderJob?> jobStep(
    String jobId,
    String step, [
    Map<String, dynamic>? payload,
  ]) async {
    final body = await client.postJson(
      '$_base/jobs/${Uri.encodeComponent(jobId)}/$step',
      payload,
    );
    final job = body['job'];
    return job is Json ? RiderJob.fromJson(job) : null;
  }

  /// Uploads a DELIVERY or FAILED_ATTEMPT photo and returns its proof id.
  Future<String> uploadProof(
    String jobId,
    String type,
    Uint8List bytes,
    String contentType,
  ) async {
    final body = await client.postBytes(
      '$_base/jobs/${Uri.encodeComponent(jobId)}/proofs',
      bytes,
      contentType: contentType,
      query: {'type': type},
    );
    return '${(body['proof'] as Json? ?? const {})['proofId'] ?? ''}';
  }

  Future<List<HistoryItem>> history({int limit = 30, int offset = 0}) async {
    final body = await client.getJson(
      '$_base/history',
      query: {'limit': '$limit', 'offset': '$offset'},
    );
    return (body['history'] as List? ?? const [])
        .whereType<Json>()
        .map(HistoryItem.fromJson)
        .toList();
  }

  Future<RiderPerformance> performance() async => RiderPerformance.fromJson(
    (await client.getJson('$_base/performance'))['performance'] as Json,
  );

  Future<EarningsSummary> earnings() async => EarningsSummary.fromJson(
    (await client.getJson('$_base/earnings'))['earnings'] as Json,
  );

  Future<CashWallet> cashWallet() async => CashWallet.fromJson(
    (await client.getJson('$_base/cash'))['cash'] as Json,
  );

  Future<CashWallet> submitRemittance({
    required double amount,
    required String method,
    required String reference,
    String note = '',
  }) async {
    final body = await client.postJson('$_base/cash/remittances', {
      'amount': amount,
      'method': method,
      'reference': reference,
      'note': note,
    });
    return CashWallet.fromJson(body['cash'] as Json);
  }

  Future<(int, List<RiderNotification>)> notifications() async {
    final body = await client.getJson('$_base/notifications');
    final items = (body['notifications'] as List? ?? const [])
        .whereType<Json>()
        .map(RiderNotification.fromJson)
        .toList();
    return ((body['unreadCount'] as num?)?.toInt() ?? 0, items);
  }

  Future<void> markNotificationsRead([List<String>? ids]) =>
      client.postJson('$_base/notifications/read', {'ids': ?ids});

  Future<List<SupportTicket>> supportTickets() async {
    final body = await client.getJson('$_base/support/tickets');
    return (body['tickets'] as List? ?? const [])
        .whereType<Json>()
        .map(SupportTicket.fromJson)
        .toList();
  }

  Future<SupportTicket> createSupportTicket({
    required String category,
    String description = '',
    String deliveryId = '',
  }) async {
    final body = await client.postJson('$_base/support/tickets', {
      'category': category,
      'description': description,
      'deliveryId': deliveryId,
    });
    return SupportTicket.fromJson(body['ticket'] as Json);
  }
}
