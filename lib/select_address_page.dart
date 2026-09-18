import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:gms_shopping/search_bar.dart';
import 'package:gms_shopping/services/buyer_delivery_address_store.dart';
import 'package:gms_shopping/services/philippines_places_service.dart';
import 'package:gms_shopping/theme/app_snack_bar.dart';
import 'package:gms_shopping/utils/app_keyboard.dart';
import 'package:gms_shopping/widgets/skeleton_loading.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

const String _lucideMapPinIconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" '
    'viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>'
    '<circle cx="12" cy="10" r="3"/>'
    '</svg>';

/// Google Places–backed province / city / barangay row.
class RegionLocation {
  const RegionLocation({
    required this.code,
    required this.name,
    this.description = '',
  });

  /// Google `place_id`, or `name:...` when hydrated from reverse geocode.
  final String code;
  final String name;
  final String description;

  factory RegionLocation.fromPlace(PhilippinesPlace place) {
    final label = place.label.trim().isNotEmpty
        ? place.label.trim()
        : place.description.trim();
    return RegionLocation(
      code: place.id.trim().isNotEmpty ? place.id.trim() : 'name:$label',
      name: label,
      description: place.description.trim(),
    );
  }

  factory RegionLocation.named(String name) {
    final trimmed = name.trim();
    return RegionLocation(code: 'name:$trimmed', name: trimmed);
  }

  bool get hasGooglePlaceId {
    final trimmed = code.trim();
    return trimmed.isNotEmpty &&
        !trimmed.startsWith('name:') &&
        !trimmed.startsWith('seed:');
  }
}

/// Full-screen Select Address experience (map + bottom sheet).
Future<bool?> openSelectAddressPage(
  BuildContext context, {
  required Color primaryColor,
  String? initialEditAddressId,
  bool openEditor = false,
  String initialLabel = kBuyerSavedLocationLabel,
}) {
  return Navigator.of(context).push<bool>(
    MaterialPageRoute<bool>(
      builder: (_) => SelectAddressPage(
        primaryColor: primaryColor,
        initialEditAddressId: initialEditAddressId,
        openEditor: openEditor,
        initialLabel: initialLabel,
      ),
    ),
  );
}

class SelectAddressPage extends StatefulWidget {
  const SelectAddressPage({
    super.key,
    required this.primaryColor,
    this.initialEditAddressId,
    this.openEditor = false,
    this.initialLabel = 'Home',
  });

  final Color primaryColor;
  final String? initialEditAddressId;
  final bool openEditor;
  final String initialLabel;

  @override
  State<SelectAddressPage> createState() => _SelectAddressPageState();
}

class _SelectAddressPageState extends State<SelectAddressPage> {
  static const LatLng _philippinesCenter = LatLng(12.8797, 121.7740);
  static const Color _titleColor = Color(0xFF151B27);
  static const Color _secondaryColor = Color(0xFF687386);
  static const Color _cardBorder = Color(0xFFE6EBF1);
  static const Color _detailsFill = Color(0xFFF4F6F8);

  /// Classic Google Maps FAB accent.
  static const Color _googleMapsBlue = Color(0xFF1A73E8);

  final BuyerDeliveryAddressStore _store = BuyerDeliveryAddressStore.instance;
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  final GlobalKey _searchBarKey = GlobalKey();

  GoogleMapController? _mapController;
  Timer? _searchDebounce;
  Timer? _cameraIdleDebounce;
  int _searchRequestId = 0;
  int _reverseRequestId = 0;

  bool _editorOpen = true;
  bool _saving = false;
  bool _locating = false;
  bool _searching = false;
  bool _reverseGeocoding = false;
  bool _mapReady = false;
  bool _ignoreCameraIdle = false;
  bool _confirming = false;
  bool _pinLifted = false;

  /// After Region pick, keep selection until the user drags the map.
  bool _lockRegionFromPicker = false;
  bool _searchMode = false;
  MapType _mapType = MapType.normal;

  /// Resting bottom panel height (fraction of screen).
  static const double _sheetExtent = 0.42;

  /// Approximate footer height (Region + Confirm) above safe area.
  static const double _sheetFooterChrome = 168;

  bool _loadingProvinces = false;
  String? _regionLoadError;

  List<RegionLocation> _provinces = const <RegionLocation>[];
  RegionLocation? _selectedProvince;
  RegionLocation? _selectedCity;
  RegionLocation? _selectedBarangay;

  String? _editingAddressId;
  String _pendingLabel = kBuyerSavedLocationLabel;
  String? _pendingId;
  double? _lat;
  double? _lng;
  String _detailsLine = '';
  String _draftProvince = '';
  String _draftCity = '';
  String _draftBarangay = '';
  List<PhilippinesPlace> _suggestions = const <PhilippinesPlace>[];

  bool get _mapsSupported {
    if (kIsWeb) return true;
    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
  }

  Color get _primary => widget.primaryColor;

  List<BuyerDeliveryAddress> get _savedEntries {
    return _store.entries
        .where((e) => e.id != kBuyerCurrentLocationAddressId)
        .toList(growable: false);
  }

  BuyerDeliveryAddress? _slotForLabel(String label) {
    final normalized = label.trim().toLowerCase();
    for (final entry in _savedEntries) {
      if (entry.label.trim().toLowerCase() == normalized) return entry;
    }
    return null;
  }

  BuyerDeliveryAddress? get _activeAddress {
    final id = _pendingId;
    if (id == null || id.isEmpty) return null;
    if (id == kBuyerCurrentLocationAddressId) {
      for (final entry in _store.entries) {
        if (entry.id == kBuyerCurrentLocationAddressId) return entry;
      }
      return null;
    }
    for (final entry in _savedEntries) {
      if (entry.id == id) return entry;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _store.addListener(_onStoreChanged);
    _searchController.addListener(_onSearchChanged);
    _searchFocusNode.addListener(_onSearchFocusChanged);
    _pendingLabel = kBuyerSavedLocationLabel;
    unawaited(_bootstrap());
  }

  Future<void> _bootstrap() async {
    await _store.ensureLoaded();
    if (!mounted) return;
    final editId = (widget.initialEditAddressId ?? '').trim();
    if (editId.isNotEmpty) {
      BuyerDeliveryAddress? match;
      for (final entry in _savedEntries) {
        if (entry.id == editId) {
          match = entry;
          break;
        }
      }
      if (match != null) {
        _applyAddressToMap(match, animate: false);
        setState(() {
          _pendingId = match!.id;
          _pendingLabel = match.label;
        });
        if (widget.openEditor || editId.isNotEmpty) {
          _openEditor(existing: match);
        }
        return;
      }
    }

    final selected = _store.selectedAddress;
    if (selected != null &&
        selected.id != kBuyerCurrentLocationAddressId &&
        selected.fullAddressLine.trim().isNotEmpty) {
      _applyAddressToMap(selected, animate: false);
      setState(() {
        _pendingId = selected.id;
        _pendingLabel = selected.label;
      });
    } else if (selected != null &&
        selected.id == kBuyerCurrentLocationAddressId &&
        selected.lat != null &&
        selected.lng != null) {
      _applyAddressToMap(selected, animate: false);
      setState(() => _pendingId = kBuyerCurrentLocationAddressId);
    } else {
      final saved = _savedEntries.isNotEmpty ? _savedEntries.first : null;
      if (saved != null) {
        _applyAddressToMap(saved, animate: false);
        setState(() {
          _pendingId = saved.id;
          _pendingLabel = kBuyerSavedLocationLabel;
        });
      }
    }

    // Always Add/Edit Address — no Set Default / Address Details screen.
    _openEditor(label: _pendingLabel);
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    _searchDebounce?.cancel();
    _cameraIdleDebounce?.cancel();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _searchFocusNode.removeListener(_onSearchFocusChanged);
    _searchFocusNode.dispose();
    _mapController = null;
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  void _onSearchFocusChanged() {
    if (!_searchFocusNode.hasFocus) {
      if (mounted) setState(() {});
      return;
    }
    // Entering search from the map field — keep this same TextField mounted.
    _searchDebounce?.cancel();
    _searchController.removeListener(_onSearchChanged);
    _searchController.clear();
    _searchController.addListener(_onSearchChanged);
    if (!_searchMode) {
      setState(() {
        _searchMode = true;
        _suggestions = const <PhilippinesPlace>[];
        _searching = false;
      });
    } else if (mounted) {
      setState(() {});
    }
  }

  void _exitSearchMode() {
    _searchDebounce?.cancel();
    _searchFocusNode.unfocus();
    FocusManager.instance.primaryFocus?.unfocus();
    if (!mounted) return;
    setState(() {
      _searchMode = false;
      _suggestions = const <PhilippinesPlace>[];
      _searching = false;
      // Map search field stays empty on add/edit — details live in the sheet.
      _searchController.removeListener(_onSearchChanged);
      _searchController.clear();
      _searchController.addListener(_onSearchChanged);
    });
  }

  void _onSearchChanged() {
    // Ignore programmatic fills (map reverse-geocode / saved address).
    if (!_searchMode && !_searchFocusNode.hasFocus) {
      return;
    }
    _searchDebounce?.cancel();
    final query = _searchController.text.trim();
    if (query.length < 2) {
      if (!mounted) return;
      setState(() {
        _suggestions = const <PhilippinesPlace>[];
        _searching = false;
      });
      return;
    }
    if (!_searchMode && mounted) {
      setState(() => _searchMode = true);
    } else if (mounted) {
      setState(() {});
    }
    _searchDebounce = Timer(const Duration(milliseconds: 380), () {
      unawaited(_runSearch(query));
    });
  }

  Future<void> _runSearch(String query) async {
    final requestId = ++_searchRequestId;
    if (mounted) setState(() => _searching = true);
    final places = await searchPhilippinesPlaces(query);
    if (!mounted || requestId != _searchRequestId) return;
    setState(() {
      _suggestions = places;
      _searching = false;
    });
  }

  void _applyAddressToMap(BuyerDeliveryAddress entry, {bool animate = true}) {
    final lat = entry.lat;
    final lng = entry.lng;
    final line = entry.fullAddressLine.trim();
    setState(() {
      _lat = lat;
      _lng = lng;
      _detailsLine = line.isEmpty || line == 'Saved address' ? '' : line;
      // Keep map search bar empty on add/edit.
      _searchController.removeListener(_onSearchChanged);
      _searchController.clear();
      _searchController.addListener(_onSearchChanged);
    });
    if (lat != null && lng != null) {
      unawaited(_moveCamera(LatLng(lat, lng), animate: animate));
    }
  }

  Future<void> _moveCamera(LatLng target, {bool animate = true}) async {
    final controller = _mapController;
    if (controller == null || !_mapReady) return;
    _ignoreCameraIdle = true;
    final update = CameraUpdate.newCameraPosition(
      CameraPosition(target: target, zoom: 16.5),
    );
    if (animate) {
      await controller.animateCamera(update);
    } else {
      await controller.moveCamera(update);
    }
    await Future<void>.delayed(const Duration(milliseconds: 280));
    _ignoreCameraIdle = false;
  }

  Future<void> _onCameraIdle() async {
    if (_ignoreCameraIdle || _searchMode) return;
    final controller = _mapController;
    if (controller == null) return;
    _cameraIdleDebounce?.cancel();
    _cameraIdleDebounce = Timer(const Duration(milliseconds: 420), () {
      unawaited(_reverseGeocodeCameraCenter());
    });
  }

  Future<void> _reverseGeocodeCameraCenter() async {
    final controller = _mapController;
    if (controller == null || !mounted) return;
    LatLngBounds bounds;
    try {
      bounds = await controller.getVisibleRegion();
    } catch (_) {
      return;
    }
    final center = LatLng(
      (bounds.northeast.latitude + bounds.southwest.latitude) / 2,
      (bounds.northeast.longitude + bounds.southwest.longitude) / 2,
    );
    final requestId = ++_reverseRequestId;
    if (mounted) setState(() => _reverseGeocoding = true);
    final place = await reverseGeocodePhilippines(
      lat: center.latitude,
      lng: center.longitude,
    );
    if (!mounted || requestId != _reverseRequestId) return;
    if (place == null) {
      setState(() {
        _lat = center.latitude;
        _lng = center.longitude;
        _reverseGeocoding = false;
      });
      return;
    }
    final line = place.description.isNotEmpty ? place.description : place.label;
    final province = place.province.trim();
    final city = place.city.trim();
    final barangay = place.resolvedBarangay;
    setState(() {
      _lat = place.lat ?? center.latitude;
      _lng = place.lng ?? center.longitude;
      _detailsLine = line;
      if (!_lockRegionFromPicker) {
        if (province.isNotEmpty) _draftProvince = province;
        if (city.isNotEmpty) _draftCity = city;
        if (barangay.isNotEmpty) _draftBarangay = barangay;
      }
      _reverseGeocoding = false;
    });
    if (_lockRegionFromPicker) return;
    if (_editorOpen &&
        (province.isNotEmpty || city.isNotEmpty || barangay.isNotEmpty)) {
      _hydrateRegionSelectors(
        provinceName: province.isNotEmpty ? province : _draftProvince,
        cityName: city.isNotEmpty ? city : _draftCity,
        barangayName: barangay.isNotEmpty ? barangay : _draftBarangay,
      );
    }
  }

  Future<void> _selectSuggestion(PhilippinesPlace suggestion) async {
    FocusScope.of(context).unfocus();
    setState(() {
      _searchMode = false;
      _searching = true;
      _suggestions = const <PhilippinesPlace>[];
    });
    final place = await resolvePhilippinesPlaceDetails(suggestion);
    if (!mounted) return;
    final resolved = place ?? suggestion;
    final line = resolved.description.isNotEmpty
        ? resolved.description
        : resolved.label;
    setState(() {
      // Back on the map: keep search bar clear; address shows in the sheet.
      _searchController.removeListener(_onSearchChanged);
      _searchController.clear();
      _searchController.addListener(_onSearchChanged);
      if (resolved.province.isNotEmpty) _draftProvince = resolved.province;
      if (resolved.city.isNotEmpty) _draftCity = resolved.city;
      if (resolved.resolvedBarangay.isNotEmpty) {
        _draftBarangay = resolved.resolvedBarangay;
      }
      _lat = resolved.lat;
      _lng = resolved.lng;
      _detailsLine = line;
      _searching = false;
      _pendingId = null;
      _lockRegionFromPicker = false;
    });
    if (resolved.lat != null && resolved.lng != null) {
      await _moveCamera(LatLng(resolved.lat!, resolved.lng!));
    }
  }

  Future<void> _useCurrentLocation({bool selectOnly = false}) async {
    if (_locating) return;
    setState(() => _locating = true);
    try {
      final error = await _store.pinCurrentLocation(select: selectOnly);
      if (!mounted) return;
      if (error != null) {
        AppSnackBar.showError(context, message: error);
        return;
      }
      BuyerDeliveryAddress? current;
      for (final entry in _store.entries) {
        if (entry.id == kBuyerCurrentLocationAddressId) {
          current = entry;
          break;
        }
      }
      if (current == null) return;
      _applyAddressToMap(current);
      setState(() {
        _pendingId = kBuyerCurrentLocationAddressId;
        if (current!.province.isNotEmpty) _draftProvince = current.province;
        if (current.city.isNotEmpty) _draftCity = current.city;
        if (current.street.isNotEmpty) _draftBarangay = current.street;
      });
      if (selectOnly) {
        AppSnackBar.showSuccess(
          context,
          message: 'Using your current location.',
        );
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _useCurrentLocationFromSearch() async {
    await _useCurrentLocation(selectOnly: false);
    if (!mounted) return;
    if (_lat != null && _lng != null) {
      _exitSearchMode();
    }
  }

  void _resetRegionSelections() {
    _selectedProvince = null;
    _selectedCity = null;
    _selectedBarangay = null;
    _regionLoadError = null;
  }

  Future<void> _ensureProvincesLoaded() async {
    if (_provinces.isNotEmpty || _loadingProvinces) return;
    setState(() {
      _loadingProvinces = true;
      _regionLoadError = null;
    });
    try {
      final places = await searchGoogleRegions(level: 'province');
      if (!mounted) return;
      setState(() {
        _provinces = places.map(RegionLocation.fromPlace).toList(growable: false);
        _loadingProvinces = false;
        if (_provinces.isEmpty) {
          _regionLoadError =
              'Unable to load provinces from Google Maps. Check your connection.';
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingProvinces = false;
        _regionLoadError =
            'Unable to load provinces from Google Maps. Check your connection.';
      });
    }
  }

  /// Geocode the selected Google region and move the map pin there.
  Future<void> _locateMapFromSelectedRegion() async {
    final province = _selectedProvince?.name.trim() ?? '';
    final city = _selectedCity?.name.trim() ?? '';
    final barangay = _selectedBarangay?.name.trim() ?? '';
    final query = _formatRegionLine(
      province: province,
      city: city,
      barangay: barangay,
    );
    if (query.isEmpty) return;

    PhilippinesPlace? place;
    for (final selected in <RegionLocation?>[
      _selectedBarangay,
      _selectedCity,
      _selectedProvince,
    ]) {
      final code = selected?.code.trim() ?? '';
      if (selected == null || !selected.hasGooglePlaceId) continue;
      place = await resolvePhilippinesPlaceDetails(
        PhilippinesPlace(
          id: code,
          label: selected.name,
          description: selected.description,
        ),
      );
      if (place != null && place.hasCoordinates) break;
      place = null;
    }

    if (place == null || !place.hasCoordinates) {
      final candidates = <String>[
        if (barangay.isNotEmpty && city.isNotEmpty)
          '$barangay, $city, Philippines',
        if (query.isNotEmpty) '$query, Philippines',
        if (city.isNotEmpty && province.isNotEmpty)
          '$city, $province, Philippines',
      ];
      for (final candidate in candidates) {
        place = await geocodePhilippinesAddress(candidate);
        if (place != null && place.hasCoordinates) break;
        place = null;
      }
    }
    if (!mounted || place == null || !place.hasCoordinates) return;

    final line = place.description.trim().isNotEmpty
        ? place.description.trim()
        : query;
    setState(() {
      _lat = place!.lat;
      _lng = place.lng;
      _detailsLine = line;
      _draftProvince = province;
      _draftCity = city;
      _draftBarangay = barangay;
      _lockRegionFromPicker = true;
    });
    await _moveCamera(LatLng(place.lat!, place.lng!));
  }

  String get _composedRegionLine {
    return _formatRegionLine(
      province: _selectedProvince?.name,
      city: _selectedCity?.name,
      barangay: _selectedBarangay?.name,
    );
  }

  String _formatRegionLine({String? province, String? city, String? barangay}) {
    return <String>[
      if ((province ?? '').trim().isNotEmpty) province!.trim(),
      if ((city ?? '').trim().isNotEmpty) city!.trim(),
      if ((barangay ?? '').trim().isNotEmpty) barangay!.trim(),
    ].join(', ');
  }

  String _regionLineForEntry(BuyerDeliveryAddress? entry) {
    if (entry == null) return '';
    return _formatRegionLine(
      province: entry.province,
      city: entry.city,
      barangay: entry.street,
    );
  }

  /// Map / place description only — never the PSGC region line.
  String _locationLineForEntry(BuyerDeliveryAddress? entry) {
    if (entry == null) {
      final details = _detailsLine.trim();
      if (details.isNotEmpty) return details;
      return '';
    }
    final region = _regionLineForEntry(entry);
    final search = entry.search.trim();
    if (search.isNotEmpty && search != 'Saved address') {
      // Prefer map/search text. Legacy saves may store region in `search`.
      return search;
    }
    final summary = entry.summaryLine.trim();
    if (summary.isNotEmpty && summary != 'Saved address' && summary != region) {
      return summary;
    }
    return '';
  }

  String get _activeLocationLine {
    final fromActive = _locationLineForEntry(_activeAddress);
    if (fromActive.isNotEmpty) return fromActive;
    final details = _detailsLine.trim();
    if (details.isNotEmpty) {
      final region = _activeRegionLine;
      if (region.isEmpty || details != region) return details;
    }
    return '';
  }

  String get _activeRegionLine {
    final fromActive = _regionLineForEntry(_activeAddress);
    if (fromActive.isNotEmpty) return fromActive;
    return _composedRegionLine;
  }

  void _hydrateRegionSelectors({
    required String provinceName,
    required String cityName,
    required String barangayName,
  }) {
    final province = provinceName.trim();
    final city = cityName.trim();
    final barangay = barangayName.trim();
    setState(() {
      _selectedProvince =
          province.isEmpty ? null : RegionLocation.named(province);
      _selectedCity = city.isEmpty ? null : RegionLocation.named(city);
      _selectedBarangay =
          barangay.isEmpty ? null : RegionLocation.named(barangay);
      _regionLoadError = null;
    });
  }

  void _openEditor({BuyerDeliveryAddress? existing, String? label}) {
    setState(() {
      _editorOpen = true;
      _editingAddressId = existing?.id;
      _pendingLabel = kBuyerSavedLocationLabel;
      _suggestions = const <PhilippinesPlace>[];
      _resetRegionSelections();
      // Map search bar stays empty while adding/editing.
      _searchController.removeListener(_onSearchChanged);
      _searchController.clear();
      _searchController.addListener(_onSearchChanged);
      if (existing != null) {
        _lat = existing.lat;
        _lng = existing.lng;
        _detailsLine = existing.fullAddressLine;
        _draftProvince = existing.province;
        _draftCity = existing.city;
        _draftBarangay = existing.street;
      }
    });
    _hydrateRegionSelectors(
      provinceName: existing?.province ?? _draftProvince,
      cityName: existing?.city ?? _draftCity,
      barangayName: existing?.street ?? _draftBarangay,
    );
    // Keep the location card in sync with the pin when opening Add Address.
    if (existing == null) {
      unawaited(_reverseGeocodeCameraCenter());
    }
  }

  void _closeEditor() {
    setState(() {
      _editorOpen = false;
      _editingAddressId = null;
      _suggestions = const <PhilippinesPlace>[];
      _resetRegionSelections();
    });
  }

  Future<void> _saveEditor() async {
    if (_saving) return;
    final province = _selectedProvince?.name.trim() ?? '';
    final city = _selectedCity?.name.trim() ?? '';
    final barangay = _selectedBarangay?.name.trim() ?? '';
    if (province.isEmpty || city.isEmpty || barangay.isEmpty) {
      AppSnackBar.showError(
        context,
        message: 'Select province, municipality, and barangay before saving.',
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final locationLine = _detailsLine.trim().isNotEmpty
          ? _detailsLine.trim()
          : _searchController.text.trim();
      final searchLine = locationLine;
      final id = (_editingAddressId ?? '').trim().isNotEmpty
          ? _editingAddressId!.trim()
          : 'addr_${DateTime.now().millisecondsSinceEpoch}';
      final entry = BuyerDeliveryAddress(
        id: id,
        search: searchLine,
        unit: '',
        street: barangay,
        city: city,
        province: province,
        postal: '',
        label: kBuyerSavedLocationLabel,
        lat: _lat,
        lng: _lng,
      );
      await _store.upsertSaved(entry, select: true);
      if (!mounted) return;
      AppSnackBar.showSuccess(context, message: 'Address saved.');
      Navigator.of(context).pop(true);
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: 'Unable to save address.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _selectSavedEntry(BuyerDeliveryAddress entry) async {
    _applyAddressToMap(entry);
    setState(() {
      _pendingId = entry.id;
      _pendingLabel = kBuyerSavedLocationLabel;
      _draftProvince = entry.province;
      _draftCity = entry.city;
      _draftBarangay = entry.street;
    });
    _hydrateRegionSelectors(
      provinceName: entry.province,
      cityName: entry.city,
      barangayName: entry.street,
    );
    await _store.selectSaved(entry);
  }

  Future<void> _confirmAddress() async {
    if (_confirming || _saving) return;
    await _saveEditor();
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final screenHeight = MediaQuery.sizeOf(context).height;
    final mapSheetHeight = screenHeight * _sheetExtent;
    final footerHeight = _sheetFooterChrome + bottomInset;
    final bodyHeight = (mapSheetHeight - footerHeight).clamp(
      120.0,
      screenHeight,
    );
    // Side FABs stay above the fixed address sheet (no collapse on drag).
    final sideControlsBottom = mapSheetHeight + 14;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFE8EEF5),
        resizeToAvoidBottomInset: true,
        body: Stack(
          children: [
            Positioned.fill(child: _buildMap(sheetHeight: mapSheetHeight)),
            if (_mapsSupported && !_searchMode)
              Positioned.fill(
                child: Padding(
                  // Keep pin on the padded map center (above the sheet),
                  // matching Google Maps “choose on map” behavior.
                  padding: EdgeInsets.only(bottom: mapSheetHeight),
                  child: _buildCenterPin(),
                ),
              ),
            // Address sheet stays fixed while the map is dragged.
            if (!_searchMode)
              Align(
                alignment: Alignment.bottomCenter,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      height: bodyHeight,
                      width: double.infinity,
                      child: Material(
                        color: Colors.white,
                        elevation: 12,
                        shadowColor: Colors.black.withValues(alpha: 0.18),
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(28),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: ListView(
                          physics: const ClampingScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
                          children: _buildEditorContent(),
                        ),
                      ),
                    ),
                    Material(
                      color: Colors.white,
                      elevation: 8,
                      shadowColor: Colors.black.withValues(alpha: 0.08),
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          18,
                          10,
                          18,
                          12 + bottomInset,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Region',
                              style: TextStyle(
                                color: _titleColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildRegionField(
                              regionLine: _composedRegionLine,
                              onTap: () => unawaited(_openRegionPickerPanel()),
                            ),
                            if (_regionLoadError != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                _regionLoadError!,
                                style: const TextStyle(
                                  color: Color(0xFFDC2626),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              TextButton(
                                onPressed: () {
                                  _hydrateRegionSelectors(
                                    provinceName: _draftProvince,
                                    cityName: _draftCity,
                                    barangayName: _draftBarangay,
                                  );
                                  unawaited(_ensureProvincesLoaded());
                                },
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: const Size(0, 32),
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  'Retry',
                                  style: TextStyle(
                                    color: _primary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            _buildConfirmButton(),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            if (!_searchMode)
              Positioned(
                right: 14,
                bottom: mapSheetHeight + 14,
                child: _buildMapSideControls(),
              ),
            // Search results fill under the bar — do NOT remount the search field.
            if (_searchMode) ...[
              Positioned(
                left: 0,
                right: 0,
                top: topInset + 72,
                child: const Divider(height: 1, color: Color(0xFFE8EAED)),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: topInset + 73,
                bottom: 0,
                child: ColoredBox(
                  color: Colors.white,
                  child: wrapSearchKeyboardDismiss(
                    child: _buildSearchResultsContent(),
                  ),
                ),
              ),
            ],
            // One stable search header for map + search mode (keeps keyboard focus).
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              height: topInset + (_searchMode ? 72 : 56),
              child: ColoredBox(
                color: _searchMode ? Colors.white : Colors.transparent,
                child: _buildSearchHeader(topInset: topInset),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMap({required double sheetHeight}) {
    if (!_mapsSupported) {
      return ColoredBox(
        color: const Color(0xFFE8EEF5),
        child: Center(
          child: Text(
            _detailsLine.isEmpty
                ? 'Map unavailable on this device'
                : _detailsLine,
            textAlign: TextAlign.center,
            style: TextStyle(color: _primary, fontWeight: FontWeight.w600),
          ),
        ),
      );
    }

    final target = (_lat != null && _lng != null)
        ? LatLng(_lat!, _lng!)
        : _philippinesCenter;
    final zoom = (_lat != null && _lng != null) ? 16.5 : 5.5;

    return GoogleMap(
      initialCameraPosition: CameraPosition(target: target, zoom: zoom),
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      compassEnabled: true,
      rotateGesturesEnabled: true,
      tiltGesturesEnabled: true,
      scrollGesturesEnabled: true,
      zoomGesturesEnabled: true,
      buildingsEnabled: true,
      indoorViewEnabled: true,
      trafficEnabled: false,
      liteModeEnabled: false,
      mapType: _mapType,
      padding: EdgeInsets.only(bottom: sheetHeight),
      markers: const <Marker>{},
      gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
        Factory<OneSequenceGestureRecognizer>(EagerGestureRecognizer.new),
      },
      onMapCreated: (controller) {
        _mapController = controller;
        _mapReady = true;
        if (_lat != null && _lng != null) {
          unawaited(_moveCamera(LatLng(_lat!, _lng!), animate: false));
        }
      },
      onCameraMove: (_) {
        if (_ignoreCameraIdle) return;
        if (_lockRegionFromPicker) {
          _lockRegionFromPicker = false;
        }
        if (_pinLifted) return;
        setState(() => _pinLifted = true);
      },
      onCameraIdle: () {
        if (_pinLifted && mounted) {
          setState(() => _pinLifted = false);
        }
        unawaited(_onCameraIdle());
      },
    );
  }

  Widget _buildCenterPin() {
    final lifted = _pinLifted;
    return IgnorePointer(
      child: Center(
        child: Transform.translate(
          // Tip of the pin sits on the map center.
          offset: const Offset(0, -39),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedOpacity(
                duration: const Duration(milliseconds: 160),
                opacity: lifted ? 0 : 1,
                child: AnimatedSlide(
                  duration: const Duration(milliseconds: 160),
                  curve: Curves.easeOut,
                  offset: lifted ? const Offset(0, 0.25) : Offset.zero,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x33000000),
                          blurRadius: 8,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Text(
                      'Drag map to match your location',
                      style: TextStyle(
                        color: Color(0xFF202124),
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        height: 1.2,
                      ),
                    ),
                  ),
                ),
              ),
              // Bounce / lift while dragging — shadow stays under the pin tip.
              SizedBox(
                width: 52,
                height: 56,
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.bottomCenter,
                  children: [
                    // Round ground shadow — lower drop when not held.
                    Positioned(
                      bottom: lifted ? 2 : -1,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 140),
                        curve: Curves.easeOut,
                        width: lifted ? 8 : 14,
                        height: lifted ? 8 : 14,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(
                            alpha: lifted ? 0.10 : 0.26,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(
                                alpha: lifted ? 0.08 : 0.16,
                              ),
                              blurRadius: lifted ? 2 : 4,
                              spreadRadius: 0,
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Pin tip sits on the shadow; lifts up while dragging.
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: lifted ? 12 : 2,
                      child: AnimatedSlide(
                        duration: const Duration(milliseconds: 160),
                        curve: Curves.easeOut,
                        offset: lifted ? const Offset(0, -0.12) : Offset.zero,
                        child: Icon(
                          Icons.location_on_rounded,
                          size: 52,
                          color: _primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMapSideControls() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildMapRoundButton(
          tooltip: 'Map type',
          onTap: _cycleMapType,
          child: Icon(
            _mapType == MapType.normal
                ? Icons.layers_outlined
                : Icons.layers_rounded,
            color: const Color(0xFF3C4043),
            size: 22,
          ),
        ),
        const SizedBox(height: 10),
        _buildMyLocationFab(),
      ],
    );
  }

  void _cycleMapType() {
    setState(() {
      switch (_mapType) {
        case MapType.normal:
          _mapType = MapType.hybrid;
        case MapType.hybrid:
          _mapType = MapType.satellite;
        case MapType.satellite:
          _mapType = MapType.terrain;
        case MapType.terrain:
        case MapType.none:
          _mapType = MapType.normal;
      }
    });
  }

  Widget _buildMapRoundButton({
    required String tooltip,
    required VoidCallback? onTap,
    required Widget child,
  }) {
    return Material(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.22),
      shape: const CircleBorder(),
      child: Tooltip(
        message: tooltip,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(width: 48, height: 48, child: Center(child: child)),
        ),
      ),
    );
  }

  /// Shared map + search-mode field. Kept mounted so focus is not lost.
  Widget _buildSearchHeader({required double topInset}) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          top: topInset + 6,
          left: 48,
          right: 10,
          child: Align(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: ProductSearchBar(
                key: _searchBarKey,
                controller: _searchController,
                focusNode: _searchFocusNode,
                iconColor: const Color(0xFF6B7280),
                textColor: const Color(0xFF162033),
                backgroundColor: Colors.white,
                pillStyle: true,
                alwaysUseFocusedStyle: true,
                hintText: 'Search location, area or landmark...',
                onTap: () {
                  if (!_searchMode) {
                    setState(() {
                      _searchMode = true;
                      _suggestions = const <PhilippinesPlace>[];
                      _searching = false;
                    });
                  }
                  if (!_searchFocusNode.hasFocus) {
                    _searchFocusNode.requestFocus();
                  }
                },
                onChanged: (_) {
                  if (!_searchMode) {
                    setState(() => _searchMode = true);
                  } else {
                    setState(() {});
                  }
                },
                onClear: () {
                  _searchController.clear();
                  setState(() {
                    _searchMode = true;
                    _suggestions = const <PhilippinesPlace>[];
                    _searching = false;
                  });
                  if (!_searchFocusNode.hasFocus) {
                    _searchFocusNode.requestFocus();
                  }
                },
                onTapOutside: dismissSearchKeyboardOnTapOutside,
              ),
            ),
          ),
        ),
        Positioned(
          top: topInset + 2,
          left: 0,
          child: IconButton(
            onPressed: () {
              if (_searchMode) {
                _exitSearchMode();
                return;
              }
              Navigator.of(context).maybePop();
            },
            tooltip: 'Back',
            color: const Color(0xFF162033),
            iconSize: 26,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints.tightFor(width: 48, height: 48),
            icon: const Icon(Icons.chevron_left_rounded),
          ),
        ),
      ],
    );
  }

  Widget _buildSearchResultsContent() {
    final query = _searchController.text.trim();
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    if (_searching) {
      return const SkeletonListRows(
        count: 5,
        padding: EdgeInsets.fromLTRB(14, 16, 14, 16),
      );
    }

    if (query.length < 2) {
      return ListView(
        padding: EdgeInsets.fromLTRB(14, 10, 14, 16 + bottomInset),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextButton.icon(
                onPressed: _locating
                    ? null
                    : () => unawaited(_useCurrentLocationFromSearch()),
                style: TextButton.styleFrom(foregroundColor: _primary),
                icon: const Icon(Icons.my_location_rounded, size: 18),
                label: const Text(
                  'Use current location',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (_locating) ...[
                const Text(
                  'Finding your location...',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: _secondaryColor,
                    fontSize: 11.5,
                    height: 1.25,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(0, 6, 0, 4),
                  child: SizedBox(
                    width: double.infinity,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        minHeight: 2,
                        backgroundColor: _primary.withValues(alpha: 0.12),
                        color: _primary,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(8, 16, 8, 8),
            child: Text(
              'Search for a street, barangay, city, or landmark',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF9AA3AF),
                fontSize: 12.5,
                height: 1.35,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      );
    }

    if (_suggestions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/images/location-not-found-art.png',
                width: 220,
                height: 184,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const SizedBox(
                  width: 176,
                  height: 142,
                  child: Icon(
                    Icons.location_off_rounded,
                    size: 86,
                    color: Color(0xFFB8C0CA),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Location not found',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _titleColor,
                  fontSize: 18,
                  height: 1.2,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'No locations found for "$query"',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF5F6368),
                  fontSize: 14,
                  height: 1.35,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Try another street, barangay, city, or landmark.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _secondaryColor,
                  fontSize: 12.5,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: EdgeInsets.fromLTRB(0, 4, 0, 16 + bottomInset),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      itemCount: _suggestions.length,
      separatorBuilder: (_, _) =>
          const Divider(height: 1, indent: 54, color: Color(0xFFE8EAED)),
      itemBuilder: (context, index) {
        final place = _suggestions[index];
        return InkWell(
          onTap: () => unawaited(_selectSuggestion(place)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: SvgPicture.string(
                    _lucideMapPinIconSvg,
                    width: 22,
                    height: 22,
                    colorFilter: ColorFilter.mode(
                      _primary,
                      BlendMode.srcIn,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        place.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF202124),
                          fontSize: 15.5,
                          fontWeight: FontWeight.w500,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        place.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF5F6368),
                          fontSize: 13.5,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMyLocationFab() {
    return Material(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.22),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: _locating
            ? null
            : () => unawaited(_useCurrentLocation(selectOnly: false)),
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: _locating
                ? const SkeletonCircle(size: 20)
                : const Icon(
                    Icons.my_location,
                    color: _googleMapsBlue,
                    size: 22,
                  ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSelectContent() {
    return <Widget>[
      Row(
        children: [
          const Expanded(
            child: Text(
              'Set Default',
              style: TextStyle(
                color: _titleColor,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: _locating
                ? null
                : () => unawaited(_useCurrentLocation(selectOnly: true)),
            style: TextButton.styleFrom(foregroundColor: _primary),
            icon: const Icon(Icons.my_location_rounded, size: 18),
            label: Text(
              _locating ? 'Locating...' : 'Use current location',
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 8),
      if (_savedEntries.isEmpty)
        _buildSlotCard(
          label: 'Location',
          entry: null,
          onTap: () => _openEditor(label: kBuyerSavedLocationLabel),
        )
      else
        for (var i = 0; i < _savedEntries.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _buildSlotCard(
            label: 'Location',
            entry: _savedEntries[i],
            onTap: () => unawaited(_selectSavedEntry(_savedEntries[i])),
          ),
        ],
      const SizedBox(height: 18),
      Row(
        children: [
          const Expanded(
            child: Text(
              'Address Details',
              style: TextStyle(
                color: _titleColor,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          TextButton.icon(
            onPressed: () {
              final active = _activeAddress;
              if (active != null &&
                  active.id != kBuyerCurrentLocationAddressId) {
                _openEditor(existing: active);
              } else {
                _openEditor(label: _pendingLabel);
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: _primary,
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 6),
            ),
            icon: Icon(Icons.edit_outlined, size: 15, color: _primary),
            label: Text(
              'Edit',
              style: TextStyle(
                color: _primary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 8),
      _buildAddressDetailsLocationCard(
        locationLine: _activeLocationLine.isNotEmpty
            ? _activeLocationLine
            : 'Move the map or search to set an address.',
      ),
      const SizedBox(height: 16),
      const Text(
        'Region',
        style: TextStyle(
          color: _titleColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      const SizedBox(height: 8),
      _buildRegionField(
        regionLine: _activeRegionLine,
        onTap: () {
          final active = _activeAddress;
          if (active != null && active.id != kBuyerCurrentLocationAddressId) {
            _openEditor(existing: active);
          } else {
            _openEditor(label: _pendingLabel);
          }
        },
      ),
    ];
  }

  Widget _buildSlotCard({
    required String label,
    required BuyerDeliveryAddress? entry,
    required VoidCallback onTap,
  }) {
    final selected =
        entry != null && _pendingId == entry.id && !_store.useCurrentLocation;
    final empty = entry == null;
    final locationLine = empty
        ? 'Tap to add a delivery address'
        : () {
            final location = _locationLineForEntry(entry);
            if (location.isNotEmpty) return location;
            final region = _regionLineForEntry(entry);
            return region.isNotEmpty ? region : 'Saved address';
          }();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C0F172A),
            blurRadius: 13,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(13, 13, 10, 13),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 34,
                  height: 42,
                  child: Center(
                    child: SvgPicture.string(
                      kMaterialDistanceIconSvg,
                      width: 24,
                      height: 24,
                      colorFilter: ColorFilter.mode(
                        selected ? _primary : const Color(0xFF0F9F88),
                        BlendMode.srcIn,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Location',
                        style: TextStyle(
                          color: _titleColor,
                          fontSize: 14,
                          height: 1.1,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        locationLine,
                        style: TextStyle(
                          color: empty
                              ? _secondaryColor.withValues(alpha: 0.85)
                              : _secondaryColor,
                          fontSize: 11.5,
                          height: 1.25,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(
                    selected
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_off_rounded,
                    color: selected ? _primary : const Color(0xFFC5CDD6),
                    size: 22,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildEditorContent() {
    return <Widget>[
      Text(
        _editingAddressId == null ? 'Add Address' : 'Edit Address',
        style: const TextStyle(
          color: _titleColor,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 12),
      _buildLiveMapLocationCard(),
    ];
  }

  Widget _buildRegionField({
    required String regionLine,
    required VoidCallback onTap,
  }) {
    final hasRegion = regionLine.trim().isNotEmpty;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: double.infinity,
          // Fixed single-line height — only Location wraps when long.
          padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: hasRegion ? _primary.withValues(alpha: 0.45) : _cardBorder,
              width: hasRegion ? 1.2 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  hasRegion ? regionLine : 'Select region',
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: hasRegion
                        ? _titleColor
                        : _secondaryColor.withValues(alpha: 0.85),
                    fontSize: 13.5,
                    height: 1.2,
                    fontWeight: hasRegion ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
              Icon(
                Icons.keyboard_arrow_up_rounded,
                color: _secondaryColor,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAddressDetailsLocationCard({required String locationLine}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C0F172A),
            blurRadius: 13,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(13, 13, 10, 13),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 34,
              height: 42,
              child: Center(
                child: SvgPicture.string(
                  kMaterialDistanceIconSvg,
                  width: 24,
                  height: 24,
                  colorFilter: const ColorFilter.mode(
                    Color(0xFF0F9F88),
                    BlendMode.srcIn,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Location',
                    style: TextStyle(
                      color: _titleColor,
                      fontSize: 14,
                      height: 1.1,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    locationLine,
                    style: const TextStyle(
                      color: _secondaryColor,
                      fontSize: 11.5,
                      height: 1.25,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openRegionPickerPanel() async {
    await _ensureProvincesLoaded();
    if (!mounted) return;

    final result = await showModalBottomSheet<_RegionPickResult>(
      context: context,
      isScrollControlled: true,
      // Keep sheet fixed while scrolling the province/city list.
      enableDrag: false,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.34),
      builder: (context) {
        return _RegionPickerPanel(
          primaryColor: _primary,
          initialProvinces: _provinces,
          initialProvince: _selectedProvince,
          initialCity: _selectedCity,
          initialBarangay: _selectedBarangay,
        );
      },
    );

    if (!mounted || result == null) return;
    setState(() {
      _selectedProvince = result.province;
      _selectedCity = result.city;
      _selectedBarangay = result.barangay;
      _draftProvince = result.province.name;
      _draftCity = result.city.name;
      _draftBarangay = result.barangay.name;
      _regionLoadError = null;
    });
    await _locateMapFromSelectedRegion();
  }

  Widget _buildLiveMapLocationCard() {
    final fullAddress = () {
      final details = _detailsLine.trim();
      if (details.isNotEmpty) return details;
      final region = _composedRegionLine;
      if (region.isNotEmpty) return region;
      if (_reverseGeocoding) return 'Finding address at pin...';
      return 'Move the map to set your location';
    }();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C0F172A),
            blurRadius: 13,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(13, 13, 10, 13),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 34,
              height: 42,
              child: Center(
                child: SvgPicture.string(
                  kMaterialDistanceIconSvg,
                  width: 24,
                  height: 24,
                  colorFilter: const ColorFilter.mode(
                    Color(0xFF0F9F88),
                    BlendMode.srcIn,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Location',
                    style: TextStyle(
                      color: _titleColor,
                      fontSize: 14,
                      height: 1.1,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    fullAddress,
                    style: const TextStyle(
                      color: _secondaryColor,
                      fontSize: 11.5,
                      height: 1.25,
                    ),
                  ),
                  if (_reverseGeocoding) ...[
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        minHeight: 2,
                        backgroundColor: _primary.withValues(alpha: 0.12),
                        color: _primary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConfirmButton() {
    final busy = _confirming || _saving;
    final label = _editorOpen
        ? (_editingAddressId == null ? 'Save Address' : 'Update Address')
        : 'Confirm Address';
    return SizedBox(
      height: 48,
      width: double.infinity,
      child: FilledButton(
        onPressed: busy ? null : () => unawaited(_confirmAddress()),
        style: FilledButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: _primary.withValues(alpha: 0.55),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(13),
          ),
        ),
        child: busy
            ? const SkeletonCircle(size: 20)
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    );
  }
}

class _RegionPickResult {
  const _RegionPickResult({
    required this.province,
    required this.city,
    required this.barangay,
  });

  final RegionLocation province;
  final RegionLocation city;
  final RegionLocation barangay;
}

/// Rising panel for province → city → barangay (Google Places).
class _RegionPickerPanel extends StatefulWidget {
  const _RegionPickerPanel({
    required this.primaryColor,
    required this.initialProvinces,
    this.initialProvince,
    this.initialCity,
    this.initialBarangay,
  });

  final Color primaryColor;
  final List<RegionLocation> initialProvinces;
  final RegionLocation? initialProvince;
  final RegionLocation? initialCity;
  final RegionLocation? initialBarangay;

  @override
  State<_RegionPickerPanel> createState() => _RegionPickerPanelState();
}

class _RegionPickerPanelState extends State<_RegionPickerPanel> {
  static const Color _titleColor = Color(0xFF151B27);
  static const Color _secondaryColor = Color(0xFF687386);

  /// 0 = province, 1 = city, 2 = barangay
  int _step = 0;
  bool _loading = false;
  String? _error;

  late List<RegionLocation> _provinces;
  List<RegionLocation> _cities = const <RegionLocation>[];
  List<RegionLocation> _barangays = const <RegionLocation>[];

  RegionLocation? _province;
  RegionLocation? _city;
  RegionLocation? _barangay;

  final Map<String, GlobalKey> _letterKeys = <String, GlobalKey>{};
  final GlobalKey _listViewportKey = GlobalKey();
  final GlobalKey _alphabetColumnKey = GlobalKey();
  final ScrollController _listScrollController = ScrollController();
  final Map<String, double> _letterOffsets = <String, double>{};
  String? _activeLetter;
  String? _lastScrubLetter;
  bool _scrubbingAlphabet = false;

  static const List<String> _alphabet = <String>[
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
  ];
  static const double _alphabetSlotH = 20;

  /// padding 12+10 + fontSize 22 (height: 1)
  static const double _letterHeaderH = 44;

  /// ListTile min height 56 + Divider 1
  static const double _letterItemH = 57;

  @override
  void initState() {
    super.initState();
    _provinces = widget.initialProvinces;
    _province = widget.initialProvince;
    _city = widget.initialCity;
    _barangay = widget.initialBarangay;
    if (_province != null) {
      _step = widget.initialCity != null ? 2 : 1;
    }
    unawaited(_loadStepLists());
  }

  @override
  void dispose() {
    _listScrollController.dispose();
    super.dispose();
  }

  String _letterForName(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '#';
    final ch = trimmed[0].toUpperCase();
    if (ch.compareTo('A') >= 0 && ch.compareTo('Z') <= 0) return ch;
    return '#';
  }

  List<RegionLocation> get _sortedItems {
    final items = List<RegionLocation>.from(_items);
    items.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return items;
  }

  Set<String> get _availableLetters {
    return _sortedItems.map((e) => _letterForName(e.name)).toSet();
  }

  List<String> get _orderedLetters {
    final available = _availableLetters;
    final ordered = _alphabet.where(available.contains).toList(growable: true);
    if (available.contains('#')) ordered.add('#');
    return ordered;
  }

  void _syncActiveLetter() {
    if (_scrubbingAlphabet) return;
    final ordered = _orderedLetters;
    if (ordered.isEmpty) {
      if (_activeLetter != null) {
        setState(() => _activeLetter = null);
      }
      return;
    }

    final listCtx = _listViewportKey.currentContext;
    final listBox = listCtx?.findRenderObject() as RenderBox?;
    if (listBox == null || !listBox.hasSize) return;

    // Last built header that has reached / passed the top band.
    // Skip unbuilt (lazy) letters — never fall back to "A" just because
    // mid-list headers aren't mounted yet.
    String? active;
    String? firstVisible;
    for (final letter in ordered) {
      final ctx = _letterKeys[letter]?.currentContext;
      final box = ctx?.findRenderObject() as RenderBox?;
      if (box == null || !box.hasSize) continue;
      final top = box.localToGlobal(Offset.zero, ancestor: listBox).dy;
      firstVisible ??= letter;
      if (top <= 24) {
        active = letter;
      } else if (active != null) {
        break;
      }
    }
    active ??= firstVisible ?? _activeLetter;
    if (active == null) return;

    if (active != _activeLetter && mounted) {
      setState(() => _activeLetter = active);
    }
  }

  void _scrollToLetter(String letter, {bool fromScrub = false}) {
    final available = _availableLetters;
    if (available.isEmpty || !available.contains(letter)) return;

    // While scrubbing, skip duplicate work for the same letter under the finger.
    if (fromScrub && _lastScrubLetter == letter) return;
    _lastScrubLetter = letter;

    final letterChanged = _activeLetter != letter;
    if (letterChanged && mounted) {
      setState(() => _activeLetter = letter);
      HapticFeedback.selectionClick();
    }

    void jump() {
      if (!_listScrollController.hasClients) return;
      final offset = _letterOffsets[letter];
      if (offset == null) return;
      final position = _listScrollController.position;
      if (!position.hasContentDimensions) return;
      final max = position.maxScrollExtent;
      final target = offset.clamp(0.0, max);
      // Instant jump — animateTo stacks/cancels during A–Z drag and feels stuck.
      _listScrollController.jumpTo(target);

      // After the target row mounts, pin the header flush to the top so
      // estimated row heights never leave B/C/… sitting mid-list.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_listScrollController.hasClients) return;
        if (fromScrub && _lastScrubLetter != letter) return;
        final ctx = _letterKeys[letter]?.currentContext;
        final listCtx = _listViewportKey.currentContext;
        final listBox = listCtx?.findRenderObject() as RenderBox?;
        final box = ctx?.findRenderObject() as RenderBox?;
        if (listBox == null ||
            box == null ||
            !listBox.hasSize ||
            !box.hasSize) {
          return;
        }
        final top = box.localToGlobal(Offset.zero, ancestor: listBox).dy;
        if (top.abs() < 1) return;
        final corrected = (_listScrollController.offset + top).clamp(
          0.0,
          _listScrollController.position.maxScrollExtent,
        );
        if ((corrected - _listScrollController.offset).abs() > 0.5) {
          _listScrollController.jumpTo(corrected);
        }
      });
    }

    if (_listScrollController.hasClients &&
        _listScrollController.position.hasContentDimensions) {
      jump();
      return;
    }

    // List not attached yet (step change / first frame).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      jump();
    });
  }

  void _selectAlphabetLetterAtGlobal(
    Offset globalPosition,
    List<String> letters,
  ) {
    if (letters.isEmpty) return;
    final columnCtx = _alphabetColumnKey.currentContext;
    final box = columnCtx?.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize) return;
    final localY = box.globalToLocal(globalPosition).dy;
    final index = (localY / _alphabetSlotH).floor().clamp(
      0,
      letters.length - 1,
    );
    _scrollToLetter(letters[index], fromScrub: true);
  }

  Future<void> _loadStepLists() async {
    if (_step == 0) {
      final source = widget.initialProvinces.isNotEmpty
          ? widget.initialProvinces
          : _provinces;
      setState(() {
        _loading = true;
        _error = null;
      });
      try {
        List<RegionLocation> list;
        if (source.isNotEmpty) {
          list = source;
        } else {
          final places = await searchGoogleRegions(level: 'province');
          list = places.map(RegionLocation.fromPlace).toList(growable: false);
        }
        if (!mounted) return;
        setState(() {
          _provinces = list;
          _loading = false;
          if (list.isEmpty) {
            _error = 'Unable to load provinces from Google Maps.';
          }
        });
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _error = 'Unable to load provinces from Google Maps.';
        });
      }
      return;
    }

    if (_step == 1 && _province != null) {
      setState(() {
        _loading = true;
        _error = null;
      });
      try {
        final places = await searchGoogleRegions(
          level: 'city',
          province: _province!.name,
          provincePlaceId: _province!.hasGooglePlaceId ? _province!.code : '',
        );
        if (!mounted) return;
        setState(() {
          _cities = places.map(RegionLocation.fromPlace).toList(growable: false);
          _loading = false;
          if (_cities.isEmpty) {
            _error = 'Unable to load municipalities.';
          }
        });
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _error = 'Unable to load municipalities from Google Maps.';
        });
      }
      return;
    }

    if (_step == 2 && _city != null) {
      setState(() {
        _loading = true;
        _error = null;
      });
      try {
        final places = await searchGoogleRegions(
          level: 'barangay',
          province: _province?.name ?? '',
          provincePlaceId:
              _province?.hasGooglePlaceId == true ? (_province?.code ?? '') : '',
          city: _city!.name,
          cityPlaceId: _city!.hasGooglePlaceId ? _city!.code : '',
        );
        if (!mounted) return;
        setState(() {
          _barangays =
              places.map(RegionLocation.fromPlace).toList(growable: false);
          _loading = false;
          if (_barangays.isEmpty) {
            _error = 'Unable to load barangays.';
          }
        });
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _error = 'Unable to load barangays from Google Maps.';
        });
      }
    }
  }

  String get _title {
    switch (_step) {
      case 1:
        return 'Select municipality';
      case 2:
        return 'Select barangay';
      default:
        return 'Select province';
    }
  }

  List<RegionLocation> get _items {
    switch (_step) {
      case 1:
        return _cities;
      case 2:
        return _barangays;
      default:
        return _provinces;
    }
  }

  void _onBack() {
    if (_step == 0) {
      Navigator.of(context).maybePop();
      return;
    }
    unawaited(_jumpToStep(_step - 1));
  }

  /// Jump back to an earlier step while keeping existing picks tappable.
  Future<void> _jumpToStep(int step) async {
    if (step < 0 || step > 2 || step == _step) return;
    if (step >= 1 && _province == null) return;
    if (step >= 2 && _city == null) return;
    setState(() {
      _letterKeys.clear();
      _letterOffsets.clear();
      _activeLetter = null;
      _lastScrubLetter = null;
      _step = step;
      _error = null;
    });
    _resetListScroll();
    await _loadStepLists();
  }

  void _resetListScroll() {
    if (_listScrollController.hasClients) {
      _listScrollController.jumpTo(0);
    }
  }

  Future<void> _onSelect(RegionLocation item) async {
    if (_step == 0) {
      final sameProvince = _province?.code == item.code;
      setState(() {
        _province = item;
        if (!sameProvince) {
          _city = null;
          _barangay = null;
          _cities = const <RegionLocation>[];
          _barangays = const <RegionLocation>[];
        }
        _letterKeys.clear();
        _letterOffsets.clear();
        _activeLetter = null;
        _lastScrubLetter = null;
        _step = 1;
        _error = null;
      });
      _resetListScroll();
      await _loadStepLists();
      return;
    }
    if (_step == 1) {
      final sameCity = _city?.code == item.code;
      setState(() {
        _city = item;
        if (!sameCity) {
          _barangay = null;
          _barangays = const <RegionLocation>[];
        }
        _letterKeys.clear();
        _letterOffsets.clear();
        _activeLetter = null;
        _lastScrubLetter = null;
        _step = 2;
        _error = null;
      });
      _resetListScroll();
      await _loadStepLists();
      return;
    }

    final province = _province;
    final city = _city;
    if (province == null || city == null) return;
    Navigator.of(
      context,
    ).pop(_RegionPickResult(province: province, city: city, barangay: item));
  }

  /// Same simple fade for every step change (forward and back).
  Widget _stepTransition(Widget child, Animation<double> animation) {
    return FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
      child: child,
    );
  }

  Widget _buildAlphabetIndex({required List<String> letters}) {
    if (letters.isEmpty) return const SizedBox.shrink();
    return Positioned(
      right: 0,
      top: 0,
      bottom: 0,
      width: 40,
      // Full-height strip: claim vertical drag so the bottom sheet never moves
      // while scrubbing A–Z (Listener alone does not win the gesture arena).
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onVerticalDragStart: (_) {},
        onVerticalDragUpdate: (_) {},
        onVerticalDragEnd: (_) {},
        onVerticalDragCancel: () {},
        child: Listener(
          behavior: HitTestBehavior.opaque,
          onPointerDown: (event) {
            _scrubbingAlphabet = true;
            _lastScrubLetter = null;
            _selectAlphabetLetterAtGlobal(event.position, letters);
          },
          onPointerMove: (event) {
            if (event.buttons == 0) return;
            _scrubbingAlphabet = true;
            _selectAlphabetLetterAtGlobal(event.position, letters);
          },
          onPointerUp: (_) {
            _scrubbingAlphabet = false;
            _lastScrubLetter = null;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) _syncActiveLetter();
            });
          },
          onPointerCancel: (_) {
            _scrubbingAlphabet = false;
            _lastScrubLetter = null;
          },
          child: ColoredBox(
            color: Colors.transparent,
            child: Center(
              child: Column(
                key: _alphabetColumnKey,
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final letter in letters)
                    SizedBox(
                      height: _alphabetSlotH,
                      width: 40,
                      child: Center(child: _buildAlphabetScrubLetter(letter)),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAlphabetScrubLetter(String letter) {
    final active = _activeLetter == letter;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 100),
      curve: Curves.easeOut,
      width: active ? 35 : 25,
      height: active ? 35 : 25,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: active ? widget.primaryColor : Colors.transparent,
      ),
      child: Text(
        letter,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: active ? Colors.white : _secondaryColor,
          fontSize: active ? 15 : 12,
          fontWeight: FontWeight.w800,
          height: 1,
        ),
      ),
    );
  }

  Widget _buildLetterHeader(String letter) {
    final key = _letterKeys.putIfAbsent(letter, GlobalKey.new);
    return Container(
      key: key,
      width: double.infinity,
      height: double.infinity,
      color: Colors.transparent,
      padding: const EdgeInsets.fromLTRB(16, 12, 36, 10),
      alignment: Alignment.centerLeft,
      child: Text(
        letter,
        style: TextStyle(
          color: widget.primaryColor,
          fontSize: 22,
          fontWeight: FontWeight.w800,
          height: 1,
        ),
      ),
    );
  }

  Widget _buildIndexedList({required double bottomInset}) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final items = _sortedItems;
        final orderedLetters = _orderedLetters;
        _letterKeys.removeWhere((key, _) => !orderedLetters.contains(key));
        _letterOffsets
          ..clear()
          ..addEntries(orderedLetters.map((letter) => MapEntry(letter, 0)));

        final rows = <Widget>[];
        String? lastLetter;
        // Match ListView top padding so jump lands on the letter header.
        const topPad = 6.0;
        var y = topPad;
        for (final item in items) {
          final letter = _letterForName(item.name);
          if (letter != lastLetter) {
            lastLetter = letter;
            _letterOffsets[letter] = y;
            // Fixed height keeps scrub offsets + pin math exact.
            rows.add(
              SizedBox(
                height: _letterHeaderH,
                child: _buildLetterHeader(letter),
              ),
            );
            y += _letterHeaderH;
          }

          final selected =
              (_step == 0 && _province?.code == item.code) ||
              (_step == 1 && _city?.code == item.code) ||
              (_step == 2 && _barangay?.code == item.code);
          rows.add(
            SizedBox(
              height: _letterItemH,
              child: Column(
                children: [
                  Expanded(
                    child: ListTile(
                      onTap: () => unawaited(_onSelect(item)),
                      contentPadding: const EdgeInsets.fromLTRB(16, 0, 28, 0),
                      dense: true,
                      visualDensity: VisualDensity.compact,
                      title: Text(
                        item.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.left,
                        style: TextStyle(
                          color: selected ? widget.primaryColor : _titleColor,
                          fontSize: 15,
                          fontWeight:
                              selected ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const Divider(
                    height: 1,
                    thickness: 1,
                    indent: 16,
                    endIndent: 28,
                    color: Color(0xFFE8EAED),
                  ),
                ],
              ),
            ),
          );
          y += _letterItemH;
        }

        // Pad only enough for the LAST letter header to pin at the top.
        // Short Z (e.g. 4 rows): clamps there — no empty overscroll.
        // Tall Z: pad = 0, scroll through items to the real end.
        final viewportH = constraints.maxHeight.isFinite
            ? constraints.maxHeight
            : 0.0;
        final lastLetterOffset = lastLetter == null
            ? topPad
            : (_letterOffsets[lastLetter] ?? topPad);
        final lastSectionHeight = y - lastLetterOffset;
        final letterPinPad = viewportH > lastSectionHeight
            ? viewportH - lastSectionHeight
            : 0.0;
        // When the last section already fills the viewport, keep a small end
        // inset only — never add a full-screen dead zone past the pin.
        // Sheet already clears system nav; keep bottomInset only for the
        // non-pin (tall last section) case.
        final listBottomPad =
            letterPinPad > 0 ? letterPinPad : 16.0 + bottomInset;

        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _syncActiveLetter();
        });

        return Stack(
          key: _listViewportKey,
          children: [
            NotificationListener<ScrollNotification>(
              onNotification: (notification) {
                if (notification is ScrollUpdateNotification ||
                    notification is ScrollEndNotification) {
                  _syncActiveLetter();
                }
                return false;
              },
              child: ListView(
                controller: _listScrollController,
                physics: const ClampingScrollPhysics(),
                padding: EdgeInsets.fromLTRB(0, topPad, 0, listBottomPad),
                children: rows,
              ),
            ),
            _buildAlphabetIndex(letters: orderedLetters),
          ],
        );
      },
    );
  }

  Widget _buildStepContent({required double bottomInset}) {
    if (_loading) {
      return const SkeletonListRows(count: 6);
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFFDC2626),
                  fontWeight: FontWeight.w600,
                ),
              ),
              TextButton(
                onPressed: () => unawaited(_loadStepLists()),
                child: Text(
                  'Retry',
                  style: TextStyle(
                    color: widget.primaryColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return _buildIndexedList(bottomInset: bottomInset);
  }

  Widget _buildCrumb({
    required String label,
    required int step,
    required bool isLast,
    required bool isPlaceholder,
  }) {
    final isCurrent = _step == step;
    final canTap =
        step == 0 ||
        (step == 1 && _province != null) ||
        (step == 2 && _city != null);
    final color = isPlaceholder
        ? _secondaryColor
        : (isCurrent ? widget.primaryColor : _titleColor);

    return Padding(
      padding: EdgeInsets.only(right: isLast ? 0 : 20),
      child: InkWell(
        onTap: canTap ? () => unawaited(_jumpToStep(step)) : null,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: isCurrent ? widget.primaryColor : Colors.transparent,
                  width: 2.5,
                ),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: color,
                  fontSize: 15.5,
                  fontWeight: isCurrent
                      ? FontWeight.w700
                      : (isPlaceholder ? FontWeight.w500 : FontWeight.w600),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSelectionTrail() {
    final provinceLabel = _province?.name.trim();
    final cityLabel = _city?.name.trim();
    final barangayLabel = _barangay?.name.trim();

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
      child: Align(
        alignment: Alignment.centerLeft,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              _buildCrumb(
                label: (provinceLabel != null && provinceLabel.isNotEmpty)
                    ? provinceLabel
                    : 'Province',
                step: 0,
                isLast: false,
                isPlaceholder: provinceLabel == null || provinceLabel.isEmpty,
              ),
              _buildCrumb(
                label: (cityLabel != null && cityLabel.isNotEmpty)
                    ? cityLabel
                    : 'Municipality',
                step: 1,
                isLast: false,
                isPlaceholder: cityLabel == null || cityLabel.isEmpty,
              ),
              _buildCrumb(
                label: (barangayLabel != null && barangayLabel.isNotEmpty)
                    ? barangayLabel
                    : 'Barangay',
                step: 2,
                isLast: true,
                isPlaceholder: barangayLabel == null || barangayLabel.isEmpty,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    // Keep modal content above the system navigation / gesture bar.
    final bottomInset = media.viewPadding.bottom;
    final availableHeight = media.size.height - bottomInset;
    final height = availableHeight * 0.72;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Material(
        color: Colors.white,
        elevation: 12,
        shadowColor: Colors.black.withValues(alpha: 0.18),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        clipBehavior: Clip.antiAlias,
        child: SizedBox(
          height: height,
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD2DA),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 14, 4),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _onBack,
                      tooltip: 'Back',
                      icon: Icon(
                        _step == 0
                            ? Icons.close_rounded
                            : Icons.arrow_back_ios_new_rounded,
                        size: _step == 0 ? 22 : 18,
                        color: _titleColor,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        _title,
                        textAlign: TextAlign.left,
                        style: const TextStyle(
                          color: _titleColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              _buildSelectionTrail(),
              const Divider(height: 1, color: Color(0xFFE8EAED)),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  switchInCurve: Curves.easeOut,
                  switchOutCurve: Curves.easeIn,
                  transitionBuilder: _stepTransition,
                  child: KeyedSubtree(
                    key: ValueKey<int>(_step),
                    child: _buildStepContent(bottomInset: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
