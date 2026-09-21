import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:switch_app/services/local_api_base_urls.dart';
import 'package:switch_app/services/philippines_places_service.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:shared_preferences/shared_preferences.dart';

const String kBuyerCurrentLocationAddressId = 'current-location';
const String kBuyerSavedLocationLabel = 'Saved location';
const Duration _addressSyncTimeout = Duration(seconds: 8);

/// Material Symbols Rounded `distance` (FILL=1) for saved delivery addresses.
const String kMaterialDistanceIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" '
    'fill="currentColor">'
    '<path d="M480-80q-106 0-173-31t-67-79q0-22 15.5-41.5T300-266q11-5 22.5-2t16.5 14q5 11 2 22.5T327-215q-8 6-15 12.5T299-190q17 20 70.5 35T480-140q57 0 110.5-15t70.5-35q-6-6-13-12.5T633-215q-11-5-14-16.5t2-22.5q5-11 16.5-14t22.5 2q29 15 44.5 34.5T720-190q0 48-67 79T480-80Zm-18-137q-9-3-17-9-123-97-184-188.5T200-594q0-71 25.5-124.5t66-89.5q40.5-36 90-54t98.5-18q49 0 99 18t90 54q40 36 65.5 89.5T760-594q0 88-61 179.5T514-226q-8 6-16.5 9t-17.5 3q-9 0-18-3Zm18-303q33 0 56.5-23.5T560-600q0-33-23.5-56.5T480-680q-33 0-56.5 23.5T400-600q0 33 23.5 56.5T480-520Z"/>'
    '</svg>';

class BuyerDeliveryAddress {
  const BuyerDeliveryAddress({
    required this.id,
    this.search = '',
    this.unit = '',
    this.street = '',
    this.city = '',
    this.province = '',
    this.postal = '',
    this.label = kBuyerSavedLocationLabel,
    this.lat,
    this.lng,
  });

  final String id;
  final String search;
  final String unit;
  final String street;
  final String city;
  final String province;
  final String postal;
  final String label;
  final double? lat;
  final double? lng;

  bool get isCurrentLocation => id == kBuyerCurrentLocationAddressId;

  /// Normalizes legacy Home/Work/Other labels to [kBuyerSavedLocationLabel].
  static String normalizeLabel(String? raw) {
    final label = (raw ?? '').trim();
    if (label == 'Current') return 'Current';
    return kBuyerSavedLocationLabel;
  }

  /// User-facing title for address rows (modal, lists, account).
  static String displayTitle(String? raw) {
    final label = normalizeLabel(raw);
    if (label == 'Current') return 'Current Location';
    return kBuyerSavedLocationLabel;
  }

  String get summaryLine {
    final parts = <String>[
      if (unit.trim().isNotEmpty) unit.trim(),
      if (street.trim().isNotEmpty) street.trim(),
      if (city.trim().isNotEmpty) city.trim(),
      if (province.trim().isNotEmpty) province.trim(),
      if (postal.trim().isNotEmpty) postal.trim(),
    ];
    if (parts.isNotEmpty) return parts.join(', ');
    if (search.trim().isNotEmpty) return search.trim();
    return 'Saved address';
  }

  /// Prefers the reverse-geocoded / search description when it is fuller
  /// (typical for "Use current location").
  String get fullAddressLine {
    final searchText = search.trim();
    final composed = summaryLine;
    if (searchText.isEmpty) return composed;
    if (composed == 'Saved address') return searchText;
    if (isCurrentLocation) return searchText;
    if (searchText.length > composed.length) return searchText;
    return composed;
  }

  factory BuyerDeliveryAddress.fromJson(Map<String, dynamic> json) {
    double? parseCoord(Object? value) {
      if (value is num) return value.toDouble();
      return double.tryParse('${value ?? ''}'.trim());
    }

    final label = '${json['label'] ?? ''}'.trim();
    return BuyerDeliveryAddress(
      id: '${json['id'] ?? ''}'.trim().isNotEmpty
          ? '${json['id']}'.trim()
          : 'addr_${DateTime.now().millisecondsSinceEpoch}',
      search: '${json['search'] ?? ''}'.trim(),
      unit: '${json['unit'] ?? ''}'.trim(),
      street: '${json['street'] ?? ''}'.trim(),
      city: '${json['city'] ?? ''}'.trim(),
      province: '${json['province'] ?? ''}'.trim(),
      postal: '${json['postal'] ?? ''}'.trim(),
      label: BuyerDeliveryAddress.normalizeLabel(label),
      lat: parseCoord(json['lat']),
      lng: parseCoord(json['lng']),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'search': search,
      'unit': unit,
      'street': street,
      'city': city,
      'province': province,
      'postal': postal,
      'label': label,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    };
  }
}

/// Shared buyer delivery destination (same prefs key as account Address).
/// Syncs to `/api/account/delivery-addresses` so app + web stay connected.
class BuyerDeliveryAddressStore extends ChangeNotifier {
  BuyerDeliveryAddressStore._();

  static final BuyerDeliveryAddressStore instance =
      BuyerDeliveryAddressStore._();

  static final HttpClient _client = HttpClient()
    ..connectionTimeout = _addressSyncTimeout;

  List<BuyerDeliveryAddress> _entries = const <BuyerDeliveryAddress>[];
  String? _selectedId;
  bool _useCurrentLocation = false;
  bool _loaded = false;
  bool _locating = false;
  String _updatedAt = '';
  Future<void>? _syncInFlight;

  List<BuyerDeliveryAddress> get entries => _entries;
  String? get selectedId => _selectedId;
  bool get useCurrentLocation => _useCurrentLocation;
  bool get locating => _locating;
  bool get isLoaded => _loaded;

  BuyerDeliveryAddress? get selectedAddress {
    if (_useCurrentLocation || _selectedId == kBuyerCurrentLocationAddressId) {
      for (final entry in _entries) {
        if (entry.id == kBuyerCurrentLocationAddressId) return entry;
      }
    }
    final id = _selectedId;
    if (id == null) return null;
    for (final entry in _entries) {
      if (entry.id == id) return entry;
    }
    return null;
  }

  String get headerLocationLabel {
    final selected = selectedAddress;
    if (selected != null) {
      final full = selected.fullAddressLine.trim();
      if (full.isNotEmpty && full != 'Saved address') return full;
    }
    if (_locating) return 'Finding your location...';
    return 'Set your delivery address';
  }

  Future<({String accountId, String email, String accountKey})>
      _identity() async {
    final accountId = (await AuthSession.getAccountId() ?? '').trim();
    final email = (await AuthSession.getAccountEmail() ?? '')
        .trim()
        .toLowerCase();
    final accountKey = accountId.isNotEmpty
        ? accountId.toLowerCase()
        : (email.isNotEmpty ? email : 'buyer');
    return (accountId: accountId, email: email, accountKey: accountKey);
  }

  Future<String> _prefsKey() async {
    final identity = await _identity();
    return 'gms-buyer-address:${identity.accountKey}';
  }

  Map<String, Object?> _bookPayload() {
    return <String, Object?>{
      'version': 2,
      'selectedId': _selectedId ?? '',
      'useCurrentLocation': _useCurrentLocation,
      'entries': _entries.map((e) => e.toJson()).toList(growable: false),
      if (_updatedAt.isNotEmpty) 'updatedAt': _updatedAt,
    };
  }

  void _applyBook(Map<String, dynamic> decoded) {
    final next = <BuyerDeliveryAddress>[];
    final rawEntries = decoded['entries'];
    if (rawEntries is List) {
      for (final item in rawEntries) {
        if (item is Map) {
          final entry = BuyerDeliveryAddress.fromJson(
            Map<String, dynamic>.from(item),
          );
          if (entry.street.isNotEmpty ||
              entry.city.isNotEmpty ||
              entry.search.isNotEmpty) {
            next.add(entry);
          }
        }
      }
    }

    var selectedId = '${decoded['selectedId'] ?? ''}'.trim();
    final useCurrent = decoded['useCurrentLocation'] == true;
    if (selectedId.isEmpty && next.isNotEmpty) {
      selectedId = next.first.id;
    }
    if (selectedId.isNotEmpty && !next.any((entry) => entry.id == selectedId)) {
      selectedId = next.isEmpty ? '' : next.first.id;
    }

    _entries = next;
    _selectedId = selectedId.isEmpty ? null : selectedId;
    _useCurrentLocation = useCurrent;
    _updatedAt = '${decoded['updatedAt'] ?? ''}'.trim();
  }

  Future<T?> _tryEachBaseUrl<T>(Future<T?> Function(String baseUrl) work) async {
    for (final baseUrl in buildLocalApiBaseUrls(isAndroid: Platform.isAndroid)) {
      try {
        final result = await work(baseUrl);
        if (result != null) {
          rememberWorkingLocalApiBaseUrl(baseUrl);
          return result;
        }
      } on SocketException {
        // Try next base URL.
      } on TimeoutException {
        // Try next base URL.
      } on HttpException {
        // Try next base URL.
      } catch (_) {
        // Try next base URL.
      }
    }
    return null;
  }

  Future<Map<String, dynamic>?> _fetchRemoteBook({
    required String accountId,
    required String email,
  }) async {
    if (accountId.isEmpty && email.isEmpty) return null;
    return _tryEachBaseUrl((baseUrl) async {
      final uri = Uri.parse('$baseUrl/api/account/delivery-addresses').replace(
        queryParameters: <String, String>{
          if (accountId.isNotEmpty) 'accountId': accountId,
          if (email.isNotEmpty) 'email': email,
        },
      );
      final request = await _client.getUrl(uri).timeout(_addressSyncTimeout);
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      final response = await request.close().timeout(_addressSyncTimeout);
      final body = await response.transform(utf8.decoder).join();
      if (response.statusCode != HttpStatus.ok) return null;
      final decoded = body.isEmpty
          ? const <String, dynamic>{}
          : jsonDecode(body) as Map<String, dynamic>;
      final bookRaw = decoded['book'];
      if (bookRaw is Map<String, dynamic>) return bookRaw;
      if (bookRaw is Map) return Map<String, dynamic>.from(bookRaw);
      return null;
    });
  }

  Future<bool> _pushRemoteBook({
    required String accountId,
    required String email,
  }) async {
    if (accountId.isEmpty && email.isEmpty) return false;
    final payload = <String, Object?>{
      if (accountId.isNotEmpty) 'accountId': accountId,
      if (email.isNotEmpty) 'email': email,
      'book': _bookPayload(),
    };
    final ok = await _tryEachBaseUrl<bool>((baseUrl) async {
      final uri = Uri.parse('$baseUrl/api/account/delivery-addresses');
      final request = await _client.putUrl(uri).timeout(_addressSyncTimeout);
      request.headers.contentType = ContentType.json;
      request.headers.set(HttpHeaders.acceptHeader, 'application/json');
      request.write(jsonEncode(payload));
      final response = await request.close().timeout(_addressSyncTimeout);
      final body = await response.transform(utf8.decoder).join();
      if (response.statusCode != HttpStatus.ok) return null;
      final decoded = body.isEmpty
          ? const <String, dynamic>{}
          : jsonDecode(body) as Map<String, dynamic>;
      final bookRaw = decoded['book'];
      if (bookRaw is Map) {
        _updatedAt = '${bookRaw['updatedAt'] ?? _updatedAt}'.trim();
      }
      return true;
    });
    return ok == true;
  }

  int _regularCount(List<BuyerDeliveryAddress> entries) {
    return entries
        .where((entry) => entry.id != kBuyerCurrentLocationAddressId)
        .length;
  }

  Future<void> ensureLoaded() async {
    if (_loaded) return;
    await reload();
  }

  Future<void> reload({bool syncRemote = true}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = (prefs.getString(await _prefsKey()) ?? '').trim();
      if (raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          _applyBook(Map<String, dynamic>.from(decoded));
        }
      } else {
        _entries = const <BuyerDeliveryAddress>[];
        _selectedId = null;
        _useCurrentLocation = false;
        _updatedAt = '';
      }
      _loaded = true;
      notifyListeners();
    } catch (_) {
      _loaded = true;
      notifyListeners();
    }

    if (syncRemote) {
      await syncWithServer();
    }
  }

  Future<void> syncWithServer() async {
    final inFlight = _syncInFlight;
    if (inFlight != null) {
      await inFlight;
      return;
    }
    final future = _syncWithServerInternal();
    _syncInFlight = future;
    try {
      await future;
    } finally {
      if (identical(_syncInFlight, future)) {
        _syncInFlight = null;
      }
    }
  }

  Future<void> _syncWithServerInternal() async {
    final identity = await _identity();
    if (identity.accountId.isEmpty && identity.email.isEmpty) return;

    final remote = await _fetchRemoteBook(
      accountId: identity.accountId,
      email: identity.email,
    );

    final localRegular = _regularCount(_entries);
    if (remote == null) {
      if (localRegular > 0 || _entries.isNotEmpty) {
        await _pushRemoteBook(
          accountId: identity.accountId,
          email: identity.email,
        );
      }
      return;
    }

    final remoteEntries = <BuyerDeliveryAddress>[];
    final rawEntries = remote['entries'];
    if (rawEntries is List) {
      for (final item in rawEntries) {
        if (item is Map) {
          remoteEntries.add(
            BuyerDeliveryAddress.fromJson(Map<String, dynamic>.from(item)),
          );
        }
      }
    }
    final remoteRegular = _regularCount(remoteEntries);
    final remoteUpdatedAt = '${remote['updatedAt'] ?? ''}'.trim();
    final localUpdatedAt = _updatedAt;
    final remoteIsNewer =
        remoteUpdatedAt.isNotEmpty &&
        (localUpdatedAt.isEmpty ||
            remoteUpdatedAt.compareTo(localUpdatedAt) >= 0);

    if (remoteRegular > 0 || remoteEntries.isNotEmpty) {
      if (remoteIsNewer || localRegular == 0) {
        _applyBook(remote);
        await _persist(localOnly: true);
        notifyListeners();
        return;
      }
    }

    if (localRegular > 0 || _entries.isNotEmpty) {
      await _pushRemoteBook(
        accountId: identity.accountId,
        email: identity.email,
      );
      await _persist(localOnly: true);
    }
  }

  Future<void> _persist({bool localOnly = false}) async {
    final prefs = await SharedPreferences.getInstance();
    if (_updatedAt.isEmpty) {
      _updatedAt = DateTime.now().toUtc().toIso8601String();
    }
    await prefs.setString(await _prefsKey(), jsonEncode(_bookPayload()));
    if (localOnly) return;
    final identity = await _identity();
    if (identity.accountId.isEmpty && identity.email.isEmpty) return;
    unawaited(
      _pushRemoteBook(
        accountId: identity.accountId,
        email: identity.email,
      ),
    );
  }

  Future<void> selectSaved(BuyerDeliveryAddress entry) async {
    _selectedId = entry.id;
    _useCurrentLocation = entry.id == kBuyerCurrentLocationAddressId;
    _updatedAt = DateTime.now().toUtc().toIso8601String();
    notifyListeners();
    await _persist();
  }

  /// Insert or update a saved delivery address (not current-location).
  Future<void> upsertSaved(BuyerDeliveryAddress entry, {bool select = true}) async {
    final id = entry.id.trim();
    if (id.isEmpty || id == kBuyerCurrentLocationAddressId) return;

    final normalizedLabel = BuyerDeliveryAddress.normalizeLabel(entry.label);
    final saved = BuyerDeliveryAddress(
      id: id,
      search: entry.search,
      unit: entry.unit,
      street: entry.street,
      city: entry.city,
      province: entry.province,
      postal: entry.postal,
      label: normalizedLabel,
      lat: entry.lat,
      lng: entry.lng,
    );

    final next = List<BuyerDeliveryAddress>.from(_entries);
    final existingIndex = next.indexWhere((item) => item.id == id);
    if (existingIndex >= 0) {
      next[existingIndex] = saved;
    } else {
      next.add(saved);
    }
    _entries = next;
    if (select) {
      _selectedId = saved.id;
      _useCurrentLocation = false;
    }
    _updatedAt = DateTime.now().toUtc().toIso8601String();
    notifyListeners();
    await _persist();
  }

  Future<void> deleteSaved(String addressId) async {
    final id = addressId.trim();
    if (id.isEmpty || id == kBuyerCurrentLocationAddressId) return;

    final next = _entries.where((entry) => entry.id != id).toList(growable: false);
    var selectedId = _selectedId;
    var useCurrent = _useCurrentLocation;
    if (selectedId == id) {
      selectedId = next.isEmpty ? null : next.first.id;
      useCurrent = selectedId == kBuyerCurrentLocationAddressId;
    }
    _entries = next;
    _selectedId = selectedId;
    _useCurrentLocation = useCurrent;
    _updatedAt = DateTime.now().toUtc().toIso8601String();
    notifyListeners();
    await _persist();
  }

  /// Copies the pinned current-location entry into a regular saved address.
  Future<String?> saveCurrentAsSaved({
    String label = kBuyerSavedLocationLabel,
  }) async {
    BuyerDeliveryAddress? current;
    for (final entry in _entries) {
      if (entry.id == kBuyerCurrentLocationAddressId) {
        current = entry;
        break;
      }
    }
    if (current == null) {
      return 'Pin your current location first.';
    }
    final full = current.fullAddressLine.trim();
    if (full.isEmpty ||
        full == 'Saved address' ||
        full == 'Use your device location') {
      return 'Pin your current location first.';
    }
    if (isCurrentAlreadySaved(current)) {
      return 'Location is already saved.';
    }

    final normalizedLabel = BuyerDeliveryAddress.normalizeLabel(label);
    final saved = BuyerDeliveryAddress(
      id: 'addr_${DateTime.now().millisecondsSinceEpoch}',
      search: current.search,
      unit: current.unit,
      street: current.street,
      city: current.city,
      province: current.province,
      postal: current.postal,
      label: normalizedLabel,
      lat: current.lat,
      lng: current.lng,
    );
    final next = List<BuyerDeliveryAddress>.from(_entries)
      ..add(saved);
    _entries = next;
    _selectedId = saved.id;
    _useCurrentLocation = false;
    _updatedAt = DateTime.now().toUtc().toIso8601String();
    notifyListeners();
    await _persist();
    return null;
  }

  /// Whether [current] already exists as a non-current saved address.
  bool isCurrentAlreadySaved([BuyerDeliveryAddress? current]) {
    BuyerDeliveryAddress? pinned = current;
    if (pinned == null) {
      for (final entry in _entries) {
        if (entry.id == kBuyerCurrentLocationAddressId) {
          pinned = entry;
          break;
        }
      }
    }
    if (pinned == null) return false;
    final key = _addressMatchKey(pinned);
    if (key.isEmpty) return false;
    for (final entry in _entries) {
      if (entry.id == kBuyerCurrentLocationAddressId) continue;
      if (_addressMatchKey(entry) == key) return true;
      if (_sameCoordinates(pinned, entry)) return true;
    }
    return false;
  }

  static String _addressMatchKey(BuyerDeliveryAddress entry) {
    return entry.fullAddressLine
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), ' ');
  }

  static bool _sameCoordinates(
    BuyerDeliveryAddress a,
    BuyerDeliveryAddress b,
  ) {
    final aLat = a.lat;
    final aLng = a.lng;
    final bLat = b.lat;
    final bLng = b.lng;
    if (aLat == null || aLng == null || bLat == null || bLng == null) {
      return false;
    }
    return (aLat - bLat).abs() < 0.00015 && (aLng - bLng).abs() < 0.00015;
  }

  Future<String?> pinCurrentLocation({bool select = true}) async {
    if (_locating) return null;
    _locating = true;
    if (select) {
      _useCurrentLocation = true;
    }
    notifyListeners();
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return 'Turn on location services, then try again.';
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return 'Allow location access to pin your current address.';
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      final place = await reverseGeocodePhilippines(
        lat: position.latitude,
        lng: position.longitude,
      );
      if (place == null) {
        return 'Could not find a Philippine address for your location.';
      }

      final entry = BuyerDeliveryAddress(
        id: kBuyerCurrentLocationAddressId,
        search: place.description.isNotEmpty ? place.description : place.label,
        street: place.street.isNotEmpty ? place.street : place.label,
        city: place.city,
        province: place.province,
        postal: place.postal,
        label: 'Current',
        lat: place.lat ?? position.latitude,
        lng: place.lng ?? position.longitude,
      );
      final next = List<BuyerDeliveryAddress>.from(_entries);
      final existingIndex =
          next.indexWhere((item) => item.id == kBuyerCurrentLocationAddressId);
      if (existingIndex >= 0) {
        next[existingIndex] = entry;
      } else {
        next.insert(0, entry);
      }
      _entries = next;
      if (select) {
        _selectedId = entry.id;
        _useCurrentLocation = true;
      }
      _updatedAt = DateTime.now().toUtc().toIso8601String();
      await _persist();
      notifyListeners();
      return null;
    } on TimeoutException {
      return 'Location timed out. Try again.';
    } catch (_) {
      return 'Unable to get your current location.';
    } finally {
      _locating = false;
      notifyListeners();
    }
  }

  /// Lets account Address UI push/pull the same shared book.
  Future<void> replaceBook({
    required List<BuyerDeliveryAddress> entries,
    String? selectedId,
    bool useCurrentLocation = false,
  }) async {
    _entries = List<BuyerDeliveryAddress>.from(entries);
    _selectedId = selectedId;
    _useCurrentLocation = useCurrentLocation;
    _updatedAt = DateTime.now().toUtc().toIso8601String();
    _loaded = true;
    notifyListeners();
    await _persist();
  }
}
