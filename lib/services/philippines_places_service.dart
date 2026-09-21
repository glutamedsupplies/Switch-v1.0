import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:switch_app/services/local_api_base_urls.dart';

const _requestTimeout = Duration(seconds: 10);
const _nominatimUserAgent =
    'SwitchShopping/1.0 (philippines-address-search; contact=support@switch.local)';

final HttpClient _client = HttpClient()..connectionTimeout = _requestTimeout;

class PhilippinesPlace {
  const PhilippinesPlace({
    required this.id,
    required this.label,
    this.description = '',
    this.lat,
    this.lng,
    this.street = '',
    this.barangay = '',
    this.city = '',
    this.province = '',
    this.postal = '',
    this.provider = 'nominatim',
  });

  final String id;
  final String label;
  final String description;
  final double? lat;
  final double? lng;
  final String street;
  final String barangay;
  final String city;
  final String province;
  final String postal;
  final String provider;

  bool get hasCoordinates => lat != null && lng != null;

  /// Prefer explicit barangay; legacy payloads stuffed it into `street`.
  String get resolvedBarangay {
    final fromField = barangay.trim();
    if (fromField.isNotEmpty) return fromField;
    return street.trim();
  }

  String get mapQuery {
    if (hasCoordinates) {
      return '${lat!.toStringAsFixed(6)},${lng!.toStringAsFixed(6)}';
    }
    final parts = <String>[
      if (description.trim().isNotEmpty) description.trim(),
      if (label.trim().isNotEmpty) label.trim(),
      if (street.trim().isNotEmpty) street.trim(),
      if (barangay.trim().isNotEmpty) barangay.trim(),
      if (city.trim().isNotEmpty) city.trim(),
      if (province.trim().isNotEmpty) province.trim(),
      'Philippines',
    ];
    return parts.join(', ');
  }

  factory PhilippinesPlace.fromJson(Map<String, dynamic> json) {
    double? parseCoord(Object? value) {
      if (value is num) return value.toDouble();
      return double.tryParse('${value ?? ''}'.trim());
    }

    return PhilippinesPlace(
      id: '${json['id'] ?? ''}'.trim(),
      label: '${json['label'] ?? ''}'.trim(),
      description: '${json['description'] ?? ''}'.trim(),
      lat: parseCoord(json['lat']),
      lng: parseCoord(json['lng']),
      street: '${json['street'] ?? ''}'.trim(),
      barangay: '${json['barangay'] ?? ''}'.trim(),
      city: '${json['city'] ?? ''}'.trim(),
      province: '${json['province'] ?? ''}'.trim(),
      postal: '${json['postal'] ?? ''}'.trim(),
      provider: '${json['provider'] ?? 'nominatim'}'.trim(),
    );
  }
}

List<String> _baseUrls() {
  return buildLocalApiBaseUrls(isAndroid: !kIsWeb && Platform.isAndroid);
}

Future<T?> _tryEachBaseUrl<T>(Future<T?> Function(String baseUrl) work) async {
  for (final baseUrl in _baseUrls()) {
    try {
      final result = await work(baseUrl);
      if (result != null) {
        rememberWorkingLocalApiBaseUrl(baseUrl);
        return result;
      }
    } on SocketException {
      // Try next candidate.
    } on TimeoutException {
      // Try next candidate.
    } on HttpException {
      // Try next candidate.
    } catch (_) {
      // Try next candidate.
    }
  }
  return null;
}

Future<Map<String, dynamic>?> _getJson(
  Uri uri, {
  Map<String, String>? headers,
  Duration timeout = _requestTimeout,
}) async {
  final request = await _client.getUrl(uri).timeout(timeout);
  headers?.forEach(request.headers.set);
  final response = await request.close().timeout(timeout);
  final body = await response.transform(utf8.decoder).join();
  if (response.statusCode < 200 || response.statusCode >= 300) {
    return null;
  }
  final decoded = jsonDecode(body);
  if (decoded is Map<String, dynamic>) return decoded;
  if (decoded is Map) return Map<String, dynamic>.from(decoded);
  return null;
}

PhilippinesPlace? _placeFromNominatimRow(Map<String, dynamic> row) {
  final address = row['address'] is Map
      ? Map<String, dynamic>.from(row['address'] as Map)
      : <String, dynamic>{};
  final displayName = '${row['display_name'] ?? ''}'.trim();
  String pick(List<Object?> values) {
    for (final value in values) {
      final text = '${value ?? ''}'.trim();
      if (text.isNotEmpty) return text;
    }
    return '';
  }

  final house = '${address['house_number'] ?? ''}'.trim();
  final road = pick([
    address['road'],
    address['pedestrian'],
    address['path'],
  ]);
  final street = pick([
    [house, road].where((part) => part.trim().isNotEmpty).join(' '),
    displayName.split(',').first,
  ]);
  final barangay = pick([
    address['suburb'],
    address['neighbourhood'],
    address['quarter'],
    address['village'],
  ]);
  final city = pick([
    address['city'],
    address['town'],
    address['municipality'],
    address['village'],
    address['city_district'],
    address['county'],
  ]);
  final province = pick([
    address['state'],
    address['province'],
    address['region'],
  ]);
  final postal = '${address['postcode'] ?? ''}'.trim();
  final lat = double.tryParse('${row['lat'] ?? ''}');
  final lng = double.tryParse('${row['lon'] ?? ''}');
  final osmType = '${row['osm_type'] ?? 'n'}'.trim();
  final osmId = '${row['osm_id'] ?? row['place_id'] ?? ''}'.trim();
  return PhilippinesPlace(
    id: 'osm:$osmType:$osmId',
    label: pick([row['name'], street, barangay, displayName]),
    description: displayName,
    lat: lat,
    lng: lng,
    street: street,
    barangay: barangay,
    city: city,
    province: province,
    postal: postal,
  );
}

Future<List<PhilippinesPlace>> _searchNominatimDirect(String query) async {
  final uri = Uri.https('nominatim.openstreetmap.org', '/search', <String, String>{
    'q': query,
    'countrycodes': 'ph',
    'format': 'jsonv2',
    'addressdetails': '1',
    'limit': '10',
    'dedupe': '1',
  });
  final request = await _client.getUrl(uri).timeout(_requestTimeout);
  request.headers.set(HttpHeaders.userAgentHeader, _nominatimUserAgent);
  request.headers.set(HttpHeaders.acceptHeader, 'application/json');
  final response = await request.close().timeout(_requestTimeout);
  final body = await response.transform(utf8.decoder).join();
  if (response.statusCode < 200 || response.statusCode >= 300) {
    return const <PhilippinesPlace>[];
  }
  final decoded = jsonDecode(body);
  if (decoded is! List) return const <PhilippinesPlace>[];
  return decoded
      .whereType<Map>()
      .map((row) => _placeFromNominatimRow(Map<String, dynamic>.from(row)))
      .whereType<PhilippinesPlace>()
      .toList(growable: false);
}

Future<PhilippinesPlace?> _reverseNominatimDirect(double lat, double lng) async {
  final uri = Uri.https('nominatim.openstreetmap.org', '/reverse', <String, String>{
    'lat': lat.toString(),
    'lon': lng.toString(),
    'format': 'jsonv2',
    'addressdetails': '1',
    'zoom': '18',
  });
  final request = await _client.getUrl(uri).timeout(_requestTimeout);
  request.headers.set(HttpHeaders.userAgentHeader, _nominatimUserAgent);
  request.headers.set(HttpHeaders.acceptHeader, 'application/json');
  final response = await request.close().timeout(_requestTimeout);
  final body = await response.transform(utf8.decoder).join();
  if (response.statusCode < 200 || response.statusCode >= 300) {
    return null;
  }
  final decoded = jsonDecode(body);
  if (decoded is! Map) return null;
  final row = Map<String, dynamic>.from(decoded);
  final countryCode = '${(row['address'] is Map) ? (row['address'] as Map)['country_code'] : ''}'
      .trim()
      .toLowerCase();
  if (countryCode.isNotEmpty && countryCode != 'ph') {
    return null;
  }
  return _placeFromNominatimRow(row);
}

Future<List<PhilippinesPlace>> searchPhilippinesPlaces(String query) async {
  final trimmed = query.trim();
  if (trimmed.length < 2) return const <PhilippinesPlace>[];

  final fromApi = await _tryEachBaseUrl<List<PhilippinesPlace>>((baseUrl) async {
    final uri = Uri.parse('$baseUrl/api/maps/places/autocomplete').replace(
      queryParameters: <String, String>{'q': trimmed},
    );
    final json = await _getJson(uri);
    if (json == null) return null;
    final places = json['places'];
    if (places is! List) return const <PhilippinesPlace>[];
    return places
        .whereType<Map>()
        .map((row) => PhilippinesPlace.fromJson(Map<String, dynamic>.from(row)))
        .toList(growable: false);
  });
  if (fromApi != null) return fromApi;

  try {
    return await _searchNominatimDirect(trimmed);
  } catch (_) {
    return const <PhilippinesPlace>[];
  }
}

/// Province / city / barangay lists powered by Google Places (via backend).
Future<List<PhilippinesPlace>> searchGoogleRegions({
  required String level,
  String query = '',
  String province = '',
  String provincePlaceId = '',
  String city = '',
  String cityPlaceId = '',
  double? lat,
  double? lng,
}) async {
  final normalizedLevel = level.trim().toLowerCase();
  if (normalizedLevel.isEmpty) return const <PhilippinesPlace>[];

  final fromApi = await _tryEachBaseUrl<List<PhilippinesPlace>>((baseUrl) async {
    final params = <String, String>{
      'level': normalizedLevel,
      if (query.trim().isNotEmpty) 'q': query.trim(),
      if (province.trim().isNotEmpty) 'province': province.trim(),
      if (provincePlaceId.trim().isNotEmpty)
        'provincePlaceId': provincePlaceId.trim(),
      if (city.trim().isNotEmpty) 'city': city.trim(),
      if (cityPlaceId.trim().isNotEmpty) 'cityPlaceId': cityPlaceId.trim(),
      if (lat != null) 'lat': lat.toString(),
      if (lng != null) 'lng': lng.toString(),
    };
    final uri = Uri.parse('$baseUrl/api/maps/regions/autocomplete').replace(
      queryParameters: params,
    );
    final json = await _getJson(uri, timeout: const Duration(seconds: 45));
    if (json == null) return null;
    final places = json['places'];
    if (places is! List) return const <PhilippinesPlace>[];
    return places
        .whereType<Map>()
        .map((row) => PhilippinesPlace.fromJson(Map<String, dynamic>.from(row)))
        .toList(growable: false);
  });
  return fromApi ?? const <PhilippinesPlace>[];
}

Future<PhilippinesPlace?> resolvePhilippinesPlaceDetails(
  PhilippinesPlace place,
) async {
  if (place.hasCoordinates &&
      place.resolvedBarangay.isNotEmpty &&
      place.city.isNotEmpty &&
      place.province.isNotEmpty) {
    return place;
  }
  if (!place.id.startsWith('osm:') && place.id.isNotEmpty) {
    final detailed = await _tryEachBaseUrl<PhilippinesPlace>((baseUrl) async {
      final uri = Uri.parse('$baseUrl/api/maps/places/details').replace(
        queryParameters: <String, String>{'placeId': place.id},
      );
      final json = await _getJson(uri);
      final payload = json?['place'];
      if (payload is! Map) return null;
      return PhilippinesPlace.fromJson(Map<String, dynamic>.from(payload));
    });
    if (detailed != null) return detailed;
  }
  if (place.description.trim().length >= 2) {
    final matches = await searchPhilippinesPlaces(place.description);
    if (matches.isNotEmpty) return matches.first;
  }
  return place;
}

Future<PhilippinesPlace?> reverseGeocodePhilippines({
  required double lat,
  required double lng,
}) async {
  if (lat < 4.2 || lat > 21.5 || lng < 116 || lng > 127.5) {
    return null;
  }

  final fromApi = await _tryEachBaseUrl<PhilippinesPlace>((baseUrl) async {
    final uri = Uri.parse('$baseUrl/api/maps/geocode/reverse').replace(
      queryParameters: <String, String>{
        'lat': lat.toString(),
        'lng': lng.toString(),
      },
    );
    final json = await _getJson(uri);
    final payload = json?['place'];
    if (payload is! Map) return null;
    return PhilippinesPlace.fromJson(Map<String, dynamic>.from(payload));
  });
  if (fromApi != null) return fromApi;

  try {
    return await _reverseNominatimDirect(lat, lng);
  } catch (_) {
    return null;
  }
}

/// Resolves an address string to coordinates for native map previews.
Future<PhilippinesPlace?> geocodePhilippinesAddress(String address) async {
  final trimmed = address.trim();
  if (trimmed.length < 2) return null;

  final query = trimmed.toLowerCase().contains('philippines')
      ? trimmed
      : '$trimmed, Philippines';
  final matches = await searchPhilippinesPlaces(query);
  for (final match in matches) {
    if (match.hasCoordinates) return match;
    final resolved = await resolvePhilippinesPlaceDetails(match);
    if (resolved != null && resolved.hasCoordinates) return resolved;
  }
  return null;
}
