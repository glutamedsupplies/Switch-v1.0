import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:switch_core/switch_core.dart';

import 'location_reporter.dart';
import 'models.dart';
import 'session.dart';

/// Live rider state: dashboard, the current offer, and availability.
///
/// Polls the backend (offers every few seconds while idle and online) and runs
/// the location reporter only while the rider is online or on a delivery.
class RiderRuntime extends ChangeNotifier {
  RiderRuntime(this.session) {
    location = LocationReporter(session.api, onOfflineDetected: refresh);
  }

  final RiderSession session;
  late final LocationReporter location;

  static const _offerPollInterval = Duration(seconds: 5);
  static const _dashboardEveryTicks = 3;

  RiderDashboard? dashboard;
  RiderOffer? offer;
  String? error;
  bool togglingAvailability = false;

  Timer? _timer;
  int _tick = 0;
  bool _polling = false;
  final Set<String> _dismissedOffers = <String>{};

  bool get isOnline => (dashboard?.availabilityStatus ?? session.profile?.availabilityStatus ?? 'OFFLINE') != 'OFFLINE';
  bool get hasActiveDelivery => (dashboard?.activeDeliveryCount ?? 0) > 0;

  void start() {
    _timer ??= Timer.periodic(_offerPollInterval, (_) => _poll());
    refresh();
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    location.stop();
    dashboard = null;
    offer = null;
    _dismissedOffers.clear();
  }

  Future<void> refresh() async {
    await _loadDashboard();
    await _loadOffer();
  }

  Future<void> _poll() async {
    if (_polling) return;
    _polling = true;
    try {
      _tick++;
      if (_tick % _dashboardEveryTicks == 0 || dashboard == null) await _loadDashboard();
      if (isOnline && !hasActiveDelivery) {
        await _loadOffer();
      } else if (offer != null) {
        offer = null;
        notifyListeners();
      }
    } finally {
      _polling = false;
    }
  }

  Future<void> _loadDashboard() async {
    try {
      dashboard = await session.api.dashboard();
      error = null;
      _syncLocation();
    } on SwitchApiException catch (e) {
      error = e.message;
    }
    notifyListeners();
  }

  Future<void> _loadOffer() async {
    if (!isOnline || hasActiveDelivery) return;
    try {
      final next = await session.api.currentOffer();
      offer = next != null && !_dismissedOffers.contains(next.offerId) ? next : null;
    } on SwitchApiException catch (e) {
      if (!e.isUnauthorized) error = e.message;
    }
    notifyListeners();
  }

  void _syncLocation() {
    if (isOnline || hasActiveDelivery) {
      location.start();
    } else {
      location.stop();
    }
  }

  /// Goes online after confirming location access. Returns an error message or null.
  Future<String?> goOnline() async {
    togglingAvailability = true;
    notifyListeners();
    try {
      final problem = await ensureLocationAccess();
      if (problem != null) return problem;
      final position = await currentPosition();
      if (position == null) return 'We could not get your location. Move to an open area and try again.';
      final rider = await session.api.setAvailability(
        online: true,
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
      );
      session.updateProfile(rider);
      await refresh();
      return null;
    } on SwitchApiException catch (e) {
      return e.message;
    } finally {
      togglingAvailability = false;
      notifyListeners();
    }
  }

  Future<String?> goOffline() async {
    togglingAvailability = true;
    notifyListeners();
    try {
      final rider = await session.api.setAvailability(online: false);
      session.updateProfile(rider);
      offer = null;
      await _loadDashboard();
      return null;
    } on SwitchApiException catch (e) {
      return e.message;
    } finally {
      togglingAvailability = false;
      notifyListeners();
    }
  }

  /// Accepts the offer. Returns the job on success; throws [SwitchApiException] otherwise.
  Future<RiderJob?> acceptOffer(RiderOffer target) async {
    try {
      final job = await session.api.respondToOffer(target.offerId, accept: true);
      offer = null;
      await _loadDashboard();
      return job;
    } on SwitchApiException {
      _dismissedOffers.add(target.offerId);
      offer = null;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> declineOffer(RiderOffer target, {String reason = ''}) async {
    _dismissedOffers.add(target.offerId);
    offer = null;
    notifyListeners();
    try {
      await session.api.respondToOffer(target.offerId, accept: false, reason: reason);
    } on SwitchApiException {
      // Already expired or taken: nothing else to do.
    }
  }

  /// Hides an offer locally once its countdown hits zero (the server expires it too).
  void expireOffer(RiderOffer target) {
    _dismissedOffers.add(target.offerId);
    if (offer?.offerId == target.offerId) {
      offer = null;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    stop();
    super.dispose();
  }
}
