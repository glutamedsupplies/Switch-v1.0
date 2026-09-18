import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Philippine Standard Geographic Code (PSGC) cascading location lists.
/// Source: https://psgc.gitlab.io/api
class PsgcLocation {
  const PsgcLocation({
    required this.code,
    required this.name,
  });

  final String code;
  final String name;

  factory PsgcLocation.fromJson(Map<String, dynamic> json) {
    return PsgcLocation(
      code: '${json['code'] ?? ''}'.trim(),
      name: '${json['name'] ?? ''}'.trim(),
    );
  }
}

class PhilippinesPsgcService {
  PhilippinesPsgcService._();

  static final PhilippinesPsgcService instance = PhilippinesPsgcService._();

  static const String _baseUrl = 'https://psgc.gitlab.io/api';
  static const String ncrProvinceCode = 'NCR';
  static const String ncrRegionCode = '130000000';
  static const Duration _timeout = Duration(seconds: 12);

  static final HttpClient _client = HttpClient()..connectionTimeout = _timeout;

  List<PsgcLocation>? _provincesCache;
  final Map<String, List<PsgcLocation>> _citiesCache =
      <String, List<PsgcLocation>>{};
  final Map<String, List<PsgcLocation>> _barangaysCache =
      <String, List<PsgcLocation>>{};

  Future<List<dynamic>> _getJsonList(String path) async {
    final uri = Uri.parse('$_baseUrl$path');
    final request = await _client.getUrl(uri).timeout(_timeout);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    final response = await request.close().timeout(_timeout);
    final body = await response.transform(utf8.decoder).join();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException('PSGC ${response.statusCode}', uri: uri);
    }
    final decoded = jsonDecode(body);
    if (decoded is! List) return const <dynamic>[];
    return decoded;
  }

  Future<List<PsgcLocation>> fetchProvinces() async {
    final cached = _provincesCache;
    if (cached != null) return cached;

    final raw = await _getJsonList('/provinces.json');
    final list = raw
        .whereType<Map>()
        .map((item) => PsgcLocation.fromJson(Map<String, dynamic>.from(item)))
        .where((item) => item.code.isNotEmpty && item.name.isNotEmpty)
        .toList(growable: true);

    // NCR is a region (not a province) in PSGC — surface it as Metro Manila.
    list.add(
      const PsgcLocation(code: ncrProvinceCode, name: 'Metro Manila'),
    );
    list.sort(
      (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
    );
    _provincesCache = list;
    return list;
  }

  Future<List<PsgcLocation>> fetchCitiesMunicipalities(String provinceCode) async {
    final code = provinceCode.trim();
    if (code.isEmpty) return const <PsgcLocation>[];
    final cached = _citiesCache[code];
    if (cached != null) return cached;

    final path = code == ncrProvinceCode
        ? '/regions/$ncrRegionCode/cities-municipalities.json'
        : '/provinces/$code/cities-municipalities.json';
    final raw = await _getJsonList(path);
    final list = raw
        .whereType<Map>()
        .map((item) => PsgcLocation.fromJson(Map<String, dynamic>.from(item)))
        .where((item) => item.code.isNotEmpty && item.name.isNotEmpty)
        .toList(growable: true)
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    _citiesCache[code] = list;
    return list;
  }

  Future<List<PsgcLocation>> fetchBarangays(String cityMunicipalityCode) async {
    final code = cityMunicipalityCode.trim();
    if (code.isEmpty) return const <PsgcLocation>[];
    final cached = _barangaysCache[code];
    if (cached != null) return cached;

    final raw = await _getJsonList(
      '/cities-municipalities/$code/barangays.json',
    );
    final list = raw
        .whereType<Map>()
        .map((item) => PsgcLocation.fromJson(Map<String, dynamic>.from(item)))
        .where((item) => item.code.isNotEmpty && item.name.isNotEmpty)
        .toList(growable: true)
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    _barangaysCache[code] = list;
    return list;
  }

  /// Best-effort match of saved province/city/barangay names when editing.
  Future<({PsgcLocation? province, PsgcLocation? city, PsgcLocation? barangay})>
      matchSavedAddress({
    required String provinceName,
    required String cityName,
    required String barangayName,
  }) async {
    final provinces = await fetchProvinces();
    final province = _bestMatch(provinces, provinceName) ??
        _bestMatch(provinces, 'Metro Manila');
    if (province == null) {
      return (province: null, city: null, barangay: null);
    }

    final cities = await fetchCitiesMunicipalities(province.code);
    final city = _bestMatch(cities, cityName);
    if (city == null) {
      return (province: province, city: null, barangay: null);
    }

    final barangays = await fetchBarangays(city.code);
    final barangay = _bestMatch(barangays, barangayName);
    return (province: province, city: city, barangay: barangay);
  }

  PsgcLocation? _bestMatch(List<PsgcLocation> items, String raw) {
    final query = _normalize(raw);
    if (query.isEmpty) return null;
    for (final item in items) {
      if (_normalize(item.name) == query) return item;
    }
    for (final item in items) {
      final name = _normalize(item.name);
      if (name.contains(query) || query.contains(name)) return item;
    }
    return null;
  }

  String _normalize(String value) {
    var text = value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'\bcity of\b'), '')
        .replaceAll(RegExp(r'\bcity\b'), '')
        .replaceAll(RegExp(r'\bmunicipality of\b'), '')
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .trim();
    // Common Google / user aliases for NCR.
    if (text == 'metro manila' ||
        text == 'ncr' ||
        text == 'national capital region' ||
        text == 'national capital region ncr') {
      text = 'national capital region ncr';
    }
    return text;
  }
}
