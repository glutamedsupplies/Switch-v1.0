import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:switch_app/services/buyer_delivery_address_store.dart';

import 'home_sky_weather_stub.dart'
    if (dart.library.io) 'home_sky_weather_io.dart'
    as fetch;

/// QA override, e.g. `--dart-define=SWITCH_SKY_PREVIEW=night:rain`.
/// Phases: morning, afternoon, evening, night.
/// Weather: clear, partlyCloudy, cloudy, rain, storm.
const String _skyPreview = String.fromEnvironment('SWITCH_SKY_PREVIEW');

enum HomeSkyPhase { morning, afternoon, evening, night }

enum HomeSkyWeather { clear, partlyCloudy, cloudy, rain, storm }

HomeSkyPhase homeSkyPhaseFor(DateTime time) {
  final hour = time.hour;
  if (hour >= 5 && hour < 11) return HomeSkyPhase.morning;
  if (hour >= 11 && hour < 17) return HomeSkyPhase.afternoon;
  if (hour >= 17 && hour < 19) return HomeSkyPhase.evening;
  return HomeSkyPhase.night;
}

HomeSkyPhase? get homeSkyPreviewPhase {
  if (_skyPreview.isEmpty) return null;
  final key = _skyPreview.split(':').first.trim().toLowerCase();
  for (final phase in HomeSkyPhase.values) {
    if (phase.name.toLowerCase() == key) return phase;
  }
  return null;
}

HomeSkyWeather? get homeSkyPreviewWeather {
  final parts = _skyPreview.split(':');
  if (parts.length < 2) return null;
  final key = parts[1].trim().toLowerCase();
  for (final weather in HomeSkyWeather.values) {
    if (weather.name.toLowerCase() == key) return weather;
  }
  return null;
}

/// Shared time-of-day phase so the home sky and platform cards switch together.
class HomeSkyClock {
  HomeSkyClock._() {
    Timer.periodic(const Duration(minutes: 1), (_) => sync());
  }

  static final HomeSkyClock instance = HomeSkyClock._();

  final ValueNotifier<HomeSkyPhase> phase = ValueNotifier(_current());

  static HomeSkyPhase _current() =>
      homeSkyPreviewPhase ?? homeSkyPhaseFor(DateTime.now());

  void sync() => phase.value = _current();
}

/// Maps WMO weather interpretation codes (Open-Meteo `weather_code`).
HomeSkyWeather homeSkyWeatherFromWmo(int code) {
  if (code == 0) return HomeSkyWeather.clear;
  if (code == 1 || code == 2) return HomeSkyWeather.partlyCloudy;
  if (code >= 95) return HomeSkyWeather.storm;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return HomeSkyWeather.rain;
  }
  return HomeSkyWeather.cloudy;
}

typedef _Coords = ({double lat, double lng});

/// Current weather for the buyer home sky backdrop.
///
/// Location order: device GPS (asks permission once per session) → last known
/// GPS fix → selected delivery address → Metro Manila.
class HomeSkyWeatherService {
  HomeSkyWeatherService._();

  static final HomeSkyWeatherService instance = HomeSkyWeatherService._();

  static const String _cacheKey = 'home_sky_weather_v2';
  static const Duration _freshFor = Duration(minutes: 20);
  static const Duration _staleCacheLimit = Duration(hours: 3);
  static const Duration _requestTimeout = Duration(seconds: 8);
  static const Duration _gpsFreshFor = Duration(minutes: 5);
  static const Duration _gpsTimeout = Duration(seconds: 10);

  /// ~11 km; moving farther than this refetches weather immediately.
  static const double _moveThresholdDegrees = 0.1;
  static const _Coords _fallback = (lat: 14.5995, lng: 120.9842);

  final ValueNotifier<HomeSkyWeather> weather = ValueNotifier(
    HomeSkyWeather.partlyCloudy,
  );

  DateTime? _fetchedAt;
  _Coords? _fetchedFor;
  _Coords? _gpsCoords;
  DateTime? _gpsAt;
  bool _askedPermission = false;
  Future<void>? _inFlight;
  bool _restoredCache = false;
  bool _listeningToAddress = false;

  Future<void> refresh({bool force = false}) {
    _listenToAddressChanges();
    return _inFlight ??= _refresh(force: force).whenComplete(() {
      _inFlight = null;
    });
  }

  void _listenToAddressChanges() {
    if (_listeningToAddress) return;
    _listeningToAddress = true;
    BuyerDeliveryAddressStore.instance.addListener(() {
      unawaited(refresh());
    });
  }

  Future<void> _refresh({required bool force}) async {
    await _restoreCache();
    final coords = await _resolveCoords();
    final last = _fetchedFor;
    final fetchedAt = _fetchedAt;
    final moved =
        last == null ||
        (coords.lat - last.lat).abs() > _moveThresholdDegrees ||
        (coords.lng - last.lng).abs() > _moveThresholdDegrees;
    final stale =
        fetchedAt == null || DateTime.now().difference(fetchedAt) >= _freshFor;
    if (!force && !moved && !stale) return;

    final code = await fetch.fetchCurrentWeatherCode(
      lat: coords.lat,
      lng: coords.lng,
      timeout: _requestTimeout,
    );
    if (code == null) return;

    final now = DateTime.now();
    weather.value = homeSkyWeatherFromWmo(code);
    _fetchedAt = now;
    _fetchedFor = coords;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _cacheKey,
        '$code|${now.millisecondsSinceEpoch}|${coords.lat}|${coords.lng}',
      );
    } catch (_) {
      // Cache is best-effort.
    }
  }

  Future<void> _restoreCache() async {
    if (_restoredCache) return;
    _restoredCache = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final parts = (prefs.getString(_cacheKey) ?? '').split('|');
      if (parts.length != 4) return;
      final code = int.tryParse(parts[0]);
      final millis = int.tryParse(parts[1]);
      final lat = double.tryParse(parts[2]);
      final lng = double.tryParse(parts[3]);
      if (code == null || millis == null || lat == null || lng == null) {
        return;
      }
      final at = DateTime.fromMillisecondsSinceEpoch(millis);
      if (DateTime.now().difference(at) > _staleCacheLimit) return;
      weather.value = homeSkyWeatherFromWmo(code);
      _fetchedAt = at;
      _fetchedFor = (lat: lat, lng: lng);
    } catch (_) {
      // Fall through to a network fetch.
    }
  }

  Future<_Coords> _resolveCoords() async {
    return await _deviceCoords() ?? _addressCoords() ?? _fallback;
  }

  _Coords? _addressCoords() {
    final address = BuyerDeliveryAddressStore.instance.selectedAddress;
    final lat = address?.lat;
    final lng = address?.lng;
    if (lat == null || lng == null) return null;
    return (lat: lat, lng: lng);
  }

  Future<_Coords?> _deviceCoords() async {
    final cachedAt = _gpsAt;
    if (_gpsCoords != null &&
        cachedAt != null &&
        DateTime.now().difference(cachedAt) < _gpsFreshFor) {
      return _gpsCoords;
    }
    if (kIsWeb) return null;

    try {
      if (!await Geolocator.isLocationServiceEnabled()) return _lastKnown();

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied && !_askedPermission) {
        _askedPermission = true;
        permission = await Geolocator.requestPermission();
      }
      if (permission != LocationPermission.always &&
          permission != LocationPermission.whileInUse) {
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.low,
          timeLimit: _gpsTimeout,
        ),
      );
      return _rememberGps(position);
    } catch (_) {
      return _lastKnown();
    }
  }

  Future<_Coords?> _lastKnown() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission != LocationPermission.always &&
          permission != LocationPermission.whileInUse) {
        return null;
      }
      final position = await Geolocator.getLastKnownPosition();
      return position == null ? null : _rememberGps(position);
    } catch (_) {
      return null;
    }
  }

  _Coords _rememberGps(Position position) {
    final coords = (lat: position.latitude, lng: position.longitude);
    _gpsCoords = coords;
    _gpsAt = DateTime.now();
    return coords;
  }
}
