import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_app/search_bar.dart';
import 'package:switch_app/services/buyer_delivery_address_store.dart';
import 'package:switch_app/services/philippines_places_service.dart';
import 'package:switch_app/services/philippines_psgc_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Full-screen Select Address experience (map + bottom sheet).
Future<bool?> openSelectAddressPage(
  BuildContext context, {
  required Color primaryColor,
  String? initialEditAddressId,
  bool openEditor = false,
  String initialLabel = 'Home',
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
  static const Color _sheetHandle = Color(0xFFCBD2DA);
  static const Color _cardBorder = Color(0xFFE6EBF1);
  static const Color _detailsFill = Color(0xFFF4F6F8);

  final BuyerDeliveryAddressStore _store = BuyerDeliveryAddressStore.instance;
  final PhilippinesPsgcService _psgc = PhilippinesPsgcService.instance;
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  final DraggableScrollableController _sheetController =
      DraggableScrollableController();

  GoogleMapController? _mapController;
  Timer? _searchDebounce;
  Timer? _cameraIdleDebounce;
  int _searchRequestId = 0;
  int _reverseRequestId = 0;

  bool _editorOpen = false;
  bool _saving = false;
  bool _locating = false;
  bool _searching = false;
  bool _reverseGeocoding = false;
  bool _mapReady = false;
  bool _ignoreCameraIdle = false;
  bool _confirming = false;
  double _sheetExtent = 0.46;

  bool _loadingProvinces = false;
  bool _loadingCities = false;
  bool _loadingBarangays = false;
  String? _regionLoadError;

  List<PsgcLocation> _provinces = const <PsgcLocation>[];
  List<PsgcLocation> _cities = const <PsgcLocation>[];
  List<PsgcLocation> _barangays = const <PsgcLocation>[];
  PsgcLocation? _selectedProvince;
  PsgcLocation? _selectedCity;
  PsgcLocation? _selectedBarangay;

  String? _editingAddressId;
  String _pendingLabel = 'Home';
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
    _pendingLabel = const <String>['Home', 'Work', 'Other']
            .contains(widget.initialLabel)
        ? widget.initialLabel
        : 'Home';
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
      final home = _slotForLabel('Home');
      if (home != null) {
        _applyAddressToMap(home, animate: false);
        setState(() {
          _pendingId = home.id;
          _pendingLabel = 'Home';
        });
      }
    }

    if (widget.openEditor && editId.isEmpty) {
      _openEditor(label: _pendingLabel);
    }
  }

  @override
  void dispose() {
    _store.removeListener(_onStoreChanged);
    _searchDebounce?.cancel();
    _cameraIdleDebounce?.cancel();
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    _searchFocusNode.dispose();
    _sheetController.dispose();
    _mapController = null;
    super.dispose();
  }

  void _onStoreChanged() {
    if (mounted) setState(() {});
  }

  void _onSearchChanged() {
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
    if (mounted) setState(() {});
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
      if (entry.search.trim().isNotEmpty) {
        _searchController.text = entry.search.trim();
      }
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
    if (_ignoreCameraIdle || _editorOpen) return;
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
    setState(() {
      _lat = place.lat ?? center.latitude;
      _lng = place.lng ?? center.longitude;
      _detailsLine = line;
      if (place.province.isNotEmpty) _draftProvince = place.province;
      if (place.city.isNotEmpty) _draftCity = place.city;
      if (place.street.isNotEmpty) _draftBarangay = place.street;
      _reverseGeocoding = false;
      if (!_editorOpen) {
        _searchController.removeListener(_onSearchChanged);
        _searchController.text = line;
        _searchController.addListener(_onSearchChanged);
      }
    });
  }

  Future<void> _selectSuggestion(PhilippinesPlace suggestion) async {
    FocusScope.of(context).unfocus();
    setState(() {
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
      _searchController.removeListener(_onSearchChanged);
      _searchController.text = line;
      _searchController.addListener(_onSearchChanged);
      if (resolved.province.isNotEmpty) _draftProvince = resolved.province;
      if (resolved.city.isNotEmpty) _draftCity = resolved.city;
      if (resolved.street.isNotEmpty) _draftBarangay = resolved.street;
      _lat = resolved.lat;
      _lng = resolved.lng;
      _detailsLine = line;
      _searching = false;
      _pendingId = null;
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

  void _resetRegionSelections() {
    _selectedProvince = null;
    _selectedCity = null;
    _selectedBarangay = null;
    _cities = const <PsgcLocation>[];
    _barangays = const <PsgcLocation>[];
    _regionLoadError = null;
  }

  Future<void> _ensureProvincesLoaded() async {
    if (_provinces.isNotEmpty || _loadingProvinces) return;
    setState(() {
      _loadingProvinces = true;
      _regionLoadError = null;
    });
    try {
      final list = await _psgc.fetchProvinces();
      if (!mounted) return;
      setState(() {
        _provinces = list;
        _loadingProvinces = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingProvinces = false;
        _regionLoadError = 'Unable to load provinces. Check your connection.';
      });
    }
  }

  Future<void> _onProvinceSelected(PsgcLocation? province) async {
    setState(() {
      _selectedProvince = province;
      _selectedCity = null;
      _selectedBarangay = null;
      _cities = const <PsgcLocation>[];
      _barangays = const <PsgcLocation>[];
      _loadingCities = province != null;
      _regionLoadError = null;
    });
    if (province == null) return;
    try {
      final cities = await _psgc.fetchCitiesMunicipalities(province.code);
      if (!mounted) return;
      setState(() {
        _cities = cities;
        _loadingCities = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingCities = false;
        _regionLoadError = 'Unable to load municipalities.';
      });
    }
  }

  Future<void> _onCitySelected(PsgcLocation? city) async {
    setState(() {
      _selectedCity = city;
      _selectedBarangay = null;
      _barangays = const <PsgcLocation>[];
      _loadingBarangays = city != null;
      _regionLoadError = null;
    });
    if (city == null) return;
    try {
      final barangays = await _psgc.fetchBarangays(city.code);
      if (!mounted) return;
      setState(() {
        _barangays = barangays;
        _loadingBarangays = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingBarangays = false;
        _regionLoadError = 'Unable to load barangays.';
      });
    }
  }

  void _onBarangaySelected(PsgcLocation? barangay) {
    setState(() => _selectedBarangay = barangay);
  }

  String get _composedRegionLine {
    final parts = <String>[
      if (_selectedBarangay != null) _selectedBarangay!.name,
      if (_selectedCity != null) _selectedCity!.name,
      if (_selectedProvince != null) _selectedProvince!.name,
    ];
    return parts.join(', ');
  }

  Future<void> _hydrateRegionSelectors({
    required String provinceName,
    required String cityName,
    required String barangayName,
  }) async {
    await _ensureProvincesLoaded();
    if (!mounted) return;
    try {
      final matched = await _psgc.matchSavedAddress(
        provinceName: provinceName,
        cityName: cityName,
        barangayName: barangayName,
      );
      if (!mounted) return;
      if (matched.province != null) {
        await _onProvinceSelected(matched.province);
      }
      if (!mounted) return;
      if (matched.city != null) {
        await _onCitySelected(matched.city);
      }
      if (!mounted) return;
      if (matched.barangay != null) {
        _onBarangaySelected(matched.barangay);
      }
    } catch (_) {
      // Keep selectors empty if matching fails.
    }
  }

  void _openEditor({BuyerDeliveryAddress? existing, String? label}) {
    final targetLabel = existing?.label ?? label ?? _pendingLabel;
    setState(() {
      _editorOpen = true;
      _editingAddressId = existing?.id;
      _pendingLabel = const <String>['Home', 'Work', 'Other'].contains(targetLabel)
          ? targetLabel
          : 'Home';
      _suggestions = const <PhilippinesPlace>[];
      _resetRegionSelections();
      if (existing != null) {
        _searchController.removeListener(_onSearchChanged);
        _searchController.text = existing.search.isNotEmpty
            ? existing.search
            : existing.fullAddressLine;
        _searchController.addListener(_onSearchChanged);
        _lat = existing.lat;
        _lng = existing.lng;
        _detailsLine = existing.fullAddressLine;
        _draftProvince = existing.province;
        _draftCity = existing.city;
        _draftBarangay = existing.street;
      }
    });
    if (_sheetController.isAttached) {
      unawaited(
        _sheetController.animateTo(
          0.72,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
        ),
      );
    }
    unawaited(
      _hydrateRegionSelectors(
        provinceName: existing?.province ?? _draftProvince,
        cityName: existing?.city ?? _draftCity,
        barangayName: existing?.street ?? _draftBarangay,
      ),
    );
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
      final composed = _composedRegionLine;
      final id = (_editingAddressId ?? '').trim().isNotEmpty
          ? _editingAddressId!.trim()
          : 'addr_${DateTime.now().millisecondsSinceEpoch}';
      final entry = BuyerDeliveryAddress(
        id: id,
        search: _searchController.text.trim().isNotEmpty
            ? _searchController.text.trim()
            : composed,
        unit: '',
        street: barangay,
        city: city,
        province: province,
        postal: '',
        label: _pendingLabel,
        lat: _lat,
        lng: _lng,
      );
      await _store.upsertSaved(entry, select: true);
      if (!mounted) return;
      setState(() {
        _pendingId = entry.id;
        _detailsLine = entry.fullAddressLine;
        _draftProvince = province;
        _draftCity = city;
        _draftBarangay = barangay;
        _editorOpen = false;
        _editingAddressId = null;
      });
      AppSnackBar.showSuccess(context, message: 'Address saved.');
    } catch (_) {
      if (!mounted) return;
      AppSnackBar.showError(context, message: 'Unable to save address.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _selectSlot(String label) async {
    final existing = _slotForLabel(label);
    if (existing == null) {
      _openEditor(label: label);
      return;
    }
    setState(() {
      _pendingId = existing.id;
      _pendingLabel = label;
      _editorOpen = false;
    });
    _applyAddressToMap(existing);
    await _store.selectSaved(existing);
  }

  Future<void> _confirmAddress() async {
    if (_confirming) return;
    if (_editorOpen) {
      await _saveEditor();
      return;
    }
    setState(() => _confirming = true);
    try {
      final active = _activeAddress;
      if (active != null) {
        await _store.selectSaved(active);
        if (!mounted) return;
        Navigator.of(context).pop(true);
        return;
      }

      if (_selectedProvince == null ||
          _selectedCity == null ||
          _selectedBarangay == null) {
        _openEditor(label: _pendingLabel);
        AppSnackBar.showInfo(
          context,
          message: 'Select province, municipality, and barangay to continue.',
        );
        return;
      }

      final composed = _composedRegionLine;
      final entry = BuyerDeliveryAddress(
        id: 'addr_${DateTime.now().millisecondsSinceEpoch}',
        search: _searchController.text.trim().isNotEmpty
            ? _searchController.text.trim()
            : composed,
        unit: '',
        street: _selectedBarangay!.name,
        city: _selectedCity!.name,
        province: _selectedProvince!.name,
        postal: '',
        label: _pendingLabel,
        lat: _lat,
        lng: _lng,
      );
      await _store.upsertSaved(entry, select: true);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFE8EEF5),
        resizeToAvoidBottomInset: true,
        body: Stack(
          children: [
            Positioned.fill(child: _buildMap()),
            if (_mapsSupported) _buildCenterPin(),
            Positioned(
              left: 14,
              right: 14,
              top: topInset + 10,
              child: _buildSearchHeader(),
            ),
            if (_suggestions.isNotEmpty || _searching)
              Positioned(
                left: 14,
                right: 14,
                top: topInset + 66,
                child: _buildSuggestionsOverlay(),
              ),
            NotificationListener<DraggableScrollableNotification>(
              onNotification: (notification) {
                if (!mounted) return false;
                setState(() => _sheetExtent = notification.extent);
                return false;
              },
              child: DraggableScrollableSheet(
                controller: _sheetController,
                initialChildSize: 0.46,
                minChildSize: 0.34,
                maxChildSize: 0.88,
                snap: true,
                snapSizes: const <double>[0.34, 0.46, 0.72],
                builder: (context, scrollController) {
                  return Material(
                    color: Colors.white,
                    elevation: 12,
                    shadowColor: Colors.black.withValues(alpha: 0.18),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(28),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        const SizedBox(height: 10),
                        Container(
                          width: 42,
                          height: 4,
                          decoration: BoxDecoration(
                            color: _sheetHandle,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        Expanded(
                          child: ListView(
                            controller: scrollController,
                            padding: EdgeInsets.fromLTRB(
                              18,
                              14,
                              18,
                              18 + bottomInset,
                            ),
                            children: [
                              if (_editorOpen)
                                ..._buildEditorContent()
                              else
                                ..._buildSelectContent(),
                              const SizedBox(height: 18),
                              _buildConfirmButton(),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Positioned(
              right: 16,
              bottom:
                  (MediaQuery.sizeOf(context).height * _sheetExtent) + 12,
              child: _buildMyLocationFab(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMap() {
    if (!_mapsSupported) {
      return ColoredBox(
        color: const Color(0xFFE8EEF5),
        child: Center(
          child: Text(
            _detailsLine.isEmpty ? 'Map unavailable on this device' : _detailsLine,
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
      compassEnabled: false,
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
      onCameraIdle: () => unawaited(_onCameraIdle()),
    );
  }

  Widget _buildCenterPin() {
    return IgnorePointer(
      child: Center(
        child: Transform.translate(
          offset: const Offset(0, -18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _primary.withValues(alpha: 0.14),
                    ),
                  ),
                  Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _primary.withValues(alpha: 0.22),
                    ),
                  ),
                  Icon(Icons.location_on_rounded, size: 44, color: _primary),
                ],
              ),
              if (_reverseGeocoding || _locating)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _primary,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        IconButton(
          onPressed: () {
            if (_editorOpen) {
              _closeEditor();
              return;
            }
            Navigator.of(context).maybePop();
          },
          tooltip: 'Back',
          color: _titleColor,
          iconSize: 26,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints.tightFor(width: 36, height: 48),
          icon: const Icon(Icons.chevron_left_rounded),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: ProductSearchBar(
            controller: _searchController,
            focusNode: _searchFocusNode,
            iconColor: _secondaryColor,
            textColor: _titleColor,
            backgroundColor: Colors.white,
            pillStyle: true,
            alwaysUseFocusedStyle: true,
            hintText: 'Search location, area or landmark...',
            onChanged: (_) => setState(() {}),
            onClear: () {
              _searchController.clear();
              setState(() {
                _suggestions = const <PhilippinesPlace>[];
                _searching = false;
              });
              if (!_searchFocusNode.hasFocus) {
                _searchFocusNode.requestFocus();
              }
            },
            onTapOutside: (_) {
              // Keep suggestions open while picking a place.
            },
          ),
        ),
        if (_searching) ...[
          const SizedBox(width: 10),
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _primary,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSuggestionsOverlay() {
    return Material(
      color: Colors.white,
      elevation: 4,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(14),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 240),
        child: _searching && _suggestions.isEmpty
            ? Padding(
                padding: const EdgeInsets.symmetric(vertical: 18),
                child: Center(
                  child: SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _primary,
                    ),
                  ),
                ),
              )
            : ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 4),
                itemCount: _suggestions.length,
                separatorBuilder: (_, _) =>
                    const Divider(height: 1, color: _cardBorder),
                itemBuilder: (context, index) {
                  final place = _suggestions[index];
                  return ListTile(
                    dense: true,
                    leading: Icon(
                      Icons.place_outlined,
                      color: _primary,
                      size: 20,
                    ),
                    title: Text(
                      place.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _titleColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Text(
                      place.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _secondaryColor,
                        fontSize: 11.5,
                      ),
                    ),
                    onTap: () => unawaited(_selectSuggestion(place)),
                  );
                },
              ),
      ),
    );
  }

  Widget _buildMyLocationFab() {
    return Material(
      color: Colors.white,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.16),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: _locating
            ? null
            : () => unawaited(_useCurrentLocation(selectOnly: false)),
        child: SizedBox(
          width: 46,
          height: 46,
          child: Center(
            child: _locating
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      color: _primary,
                    ),
                  )
                : Icon(Icons.my_location_rounded, color: _primary, size: 22),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSelectContent() {
    final details = _detailsLine.trim().isNotEmpty
        ? _detailsLine.trim()
        : (_activeAddress?.fullAddressLine.trim() ??
            'Move the map or search to set an address.');

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
            style: TextButton.styleFrom(
              foregroundColor: _primary,
              visualDensity: VisualDensity.compact,
              padding: const EdgeInsets.symmetric(horizontal: 6),
            ),
            icon: Icon(
              Icons.near_me_rounded,
              size: 16,
              color: _primary,
            ),
            label: Text(
              _locating ? 'Locating...' : 'Use current location',
              style: TextStyle(
                color: _primary,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 8),
      _buildSlotCard(
        label: 'Home',
        icon: Icons.home_rounded,
        entry: _slotForLabel('Home'),
      ),
      const SizedBox(height: 10),
      _buildSlotCard(
        label: 'Work',
        icon: Icons.work_outline_rounded,
        entry: _slotForLabel('Work'),
      ),
      const SizedBox(height: 10),
      _buildSlotCard(
        label: 'Other',
        icon: Icons.more_horiz_rounded,
        entry: _slotForLabel('Other'),
      ),
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
      Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        decoration: BoxDecoration(
          color: _detailsFill,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.location_on_rounded, color: _primary, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                details,
                style: const TextStyle(
                  color: _titleColor,
                  fontSize: 13,
                  height: 1.4,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    ];
  }

  Widget _buildSlotCard({
    required String label,
    required IconData icon,
    required BuyerDeliveryAddress? entry,
  }) {
    final selected = entry != null &&
        _pendingId == entry.id &&
        !_store.useCurrentLocation;
    final empty = entry == null;
    final line1 = empty
        ? 'No $label address yet'
        : (entry.street.trim().isNotEmpty
            ? entry.street.trim()
            : entry.fullAddressLine);
    final line2 = empty
        ? 'Tap to add'
        : <String>[
            if (entry.city.trim().isNotEmpty) entry.city.trim(),
            if (entry.province.trim().isNotEmpty) entry.province.trim(),
            if (entry.postal.trim().isNotEmpty) entry.postal.trim(),
          ].join(', ');

    return Material(
      color: selected ? _primary.withValues(alpha: 0.08) : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => unawaited(_selectSlot(label)),
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? _primary : _cardBorder,
              width: selected ? 1.4 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: selected
                      ? _primary.withValues(alpha: 0.14)
                      : const Color(0xFFF3F5F8),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: selected ? _primary : _secondaryColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        color: _titleColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      line1,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _secondaryColor,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
                    if (line2.isNotEmpty)
                      Text(
                        line2,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: _secondaryColor.withValues(alpha: 0.9),
                          fontSize: 11.5,
                          height: 1.3,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: selected ? _primary : const Color(0xFFC5CDD6),
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildEditorContent() {
    return <Widget>[
      Row(
        children: [
          Expanded(
            child: Text(
              _editingAddressId == null ? 'Add Address' : 'Edit Address',
              style: const TextStyle(
                color: _titleColor,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          TextButton(
            onPressed: _closeEditor,
            child: const Text(
              'Cancel',
              style: TextStyle(
                color: _secondaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 6),
      const Text(
        'Address label',
        style: TextStyle(
          color: _titleColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          _labelChip('Home', Icons.home_rounded),
          const SizedBox(width: 8),
          _labelChip('Work', Icons.work_outline_rounded),
          const SizedBox(width: 8),
          _labelChip('Other', Icons.more_horiz_rounded),
        ],
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
      _regionDropdown(
        label: 'Select province',
        value: _selectedProvince,
        items: _provinces,
        loading: _loadingProvinces,
        enabled: !_loadingProvinces,
        onChanged: (value) => unawaited(_onProvinceSelected(value)),
      ),
      const SizedBox(height: 10),
      _regionDropdown(
        label: 'Select municipality',
        value: _selectedCity,
        items: _cities,
        loading: _loadingCities,
        enabled: _selectedProvince != null && !_loadingCities,
        onChanged: (value) => unawaited(_onCitySelected(value)),
      ),
      const SizedBox(height: 10),
      _regionDropdown(
        label: 'Select barangay',
        value: _selectedBarangay,
        items: _barangays,
        loading: _loadingBarangays,
        enabled: _selectedCity != null && !_loadingBarangays,
        onChanged: _onBarangaySelected,
      ),
      if (_regionLoadError != null) ...[
        const SizedBox(height: 10),
        Text(
          _regionLoadError!,
          style: const TextStyle(
            color: Color(0xFFDC2626),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        TextButton(
          onPressed: () => unawaited(
            _hydrateRegionSelectors(
              provinceName: _draftProvince,
              cityName: _draftCity,
              barangayName: _draftBarangay,
            ),
          ),
          child: Text(
            'Retry',
            style: TextStyle(color: _primary, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    ];
  }

  Widget _regionDropdown({
    required String label,
    required PsgcLocation? value,
    required List<PsgcLocation> items,
    required bool loading,
    required bool enabled,
    required ValueChanged<PsgcLocation?> onChanged,
  }) {
    return InputDecorator(
      decoration: InputDecoration(
        filled: true,
        fillColor: enabled ? Colors.white : const Color(0xFFF5F7FA),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _primary, width: 1.3),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _cardBorder),
        ),
        suffixIcon: loading
            ? Padding(
                padding: const EdgeInsets.all(12),
                child: SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: _primary,
                  ),
                ),
              )
            : null,
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<PsgcLocation>(
          isExpanded: true,
          value: value != null && items.any((item) => item.code == value.code)
              ? items.firstWhere((item) => item.code == value.code)
              : null,
          hint: Text(
            label,
            style: TextStyle(
              color: _secondaryColor.withValues(alpha: 0.85),
              fontSize: 13.5,
            ),
          ),
          icon: Icon(
            Icons.keyboard_arrow_down_rounded,
            color: enabled ? _secondaryColor : _secondaryColor.withValues(alpha: 0.4),
          ),
          items: items
              .map(
                (item) => DropdownMenuItem<PsgcLocation>(
                  value: item,
                  child: Text(
                    item.name,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _titleColor,
                      fontSize: 13.5,
                    ),
                  ),
                ),
              )
              .toList(growable: false),
          onChanged: enabled && !loading ? onChanged : null,
        ),
      ),
    );
  }

  Widget _labelChip(String label, IconData icon) {
    final selected = _pendingLabel == label;
    return Expanded(
      child: Material(
        color: selected ? _primary.withValues(alpha: 0.12) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => setState(() => _pendingLabel = label),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? _primary : _cardBorder,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected ? _primary : _secondaryColor,
                ),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: TextStyle(
                    color: selected ? _primary : _titleColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
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
      height: 54,
      width: double.infinity,
      child: FilledButton(
        onPressed: busy ? null : () => unawaited(_confirmAddress()),
        style: FilledButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: _primary.withValues(alpha: 0.55),
          elevation: 0,
          shape: const StadiumBorder(),
        ),
        child: busy
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: Colors.white,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, size: 20),
                ],
              ),
      ),
    );
  }
}
