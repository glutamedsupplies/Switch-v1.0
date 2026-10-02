import 'dart:async';

import 'package:geolocator/geolocator.dart';
import 'package:switch_core/switch_core.dart';

import 'rider_api.dart';

/// Returns null when location can be used, otherwise a message for the rider.
Future<String?> ensureLocationAccess() async {
  if (!await Geolocator.isLocationServiceEnabled()) {
    return 'Turn on location services to go online.';
  }
  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied) {
    return 'Allow location access so Switch can send you nearby jobs.';
  }
  if (permission == LocationPermission.deniedForever) {
    return 'Location access is blocked. Enable it for Switch Rider in your phone settings.';
  }
  return null;
}

Future<Position?> currentPosition() async {
  try {
    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 12)),
    );
  } catch (_) {
    return Geolocator.getLastKnownPosition();
  }
}

/// Shares the rider's position only while they are online or delivering.
/// The server sets the pace (`nextUpdateInSeconds`) and rate-limits extras.
class LocationReporter {
  LocationReporter(this.api, {this.onOfflineDetected});

  final RiderApi api;
  final void Function()? onOfflineDetected;

  Timer? _timer;
  int _intervalSeconds = 15;
  bool _sending = false;
  DateTime? lastSentAt;

  bool get isRunning => _timer != null;

  void start() {
    if (_timer != null) return;
    _schedule(const Duration(seconds: 1));
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  void _schedule(Duration delay) {
    _timer?.cancel();
    _timer = Timer(delay, _tick);
  }

  Future<void> _tick() async {
    if (_timer == null || _sending) return;
    _sending = true;
    var next = Duration(seconds: _intervalSeconds);
    try {
      final position = await currentPosition();
      if (position != null) {
        final result = await api.sendLocation(
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy,
        );
        _intervalSeconds = result.nextUpdateInSeconds.clamp(5, 120);
        next = Duration(seconds: _intervalSeconds);
        lastSentAt = DateTime.now();
      }
    } on SwitchApiException catch (error) {
      if (error.statusCode == 429) {
        final retry = (error.details['retryAfterSeconds'] as num?)?.toInt() ?? _intervalSeconds;
        next = Duration(seconds: retry.clamp(1, 120));
      } else if (error.code == 'RIDER_OFFLINE') {
        stop();
        onOfflineDetected?.call();
        return;
      }
    } finally {
      _sending = false;
    }
    if (_timer != null) _schedule(next);
  }
}
