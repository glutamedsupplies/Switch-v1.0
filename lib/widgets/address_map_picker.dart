import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:switch_app/services/philippines_places_service.dart';

/// Called when a map location is committed (Save, or the initial auto-fill).
typedef AddressMapPlaceChanged =
    void Function(PhilippinesPlace? place, double lat, double lng);

/// Google Map with a fixed center pin (same feel as Select Address).
///
/// The map is locked until the user taps Edit. While editing, dragging the
/// map shows the resolved address live on the pin label; Save commits it via
/// [onPlaceChanged], Cancel returns to the last saved spot.
class AddressMapPicker extends StatefulWidget {
  const AddressMapPicker({
    super.key,
    this.initialLat,
    this.initialLng,
    this.initialLabel = '',
    this.resolveOnStart = false,
    this.borderRadius = 8,
    this.primaryColor,
    this.onPlaceChanged,
    this.onEditingChanged,
    this.onError,
  });

  final double? initialLat;
  final double? initialLng;
  final String initialLabel;

  /// Reverse-geocode and commit the initial center once the map is ready.
  final bool resolveOnStart;
  final double borderRadius;
  final Color? primaryColor;
  final AddressMapPlaceChanged? onPlaceChanged;

  /// Lets the parent stop its own scrolling while the map is being dragged.
  final ValueChanged<bool>? onEditingChanged;
  final ValueChanged<String>? onError;

  @override
  State<AddressMapPicker> createState() => AddressMapPickerState();
}

class AddressMapPickerState extends State<AddressMapPicker> {
  static const LatLng _philippinesCenter = LatLng(12.8797, 121.7740);
  static const double _pinnedZoom = 16.5;

  GoogleMapController? _mapController;
  Timer? _resolveDebounce;
  late LatLng _center;
  late LatLng _committedCenter;
  String _committedLabel = '';
  PhilippinesPlace? _pendingPlace;
  int _resolveRequestId = 0;
  bool _mapReady = false;
  bool _hasTarget = false;
  bool _userGesture = false;
  bool _pinLifted = false;
  bool _resolving = false;
  bool _locating = false;
  bool _editing = false;
  bool _moved = false;
  bool _saving = false;
  String _label = '';

  bool get _mapsSupported {
    if (kIsWeb) return true;
    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
  }

  bool get _hasInitialTarget =>
      widget.initialLat != null && widget.initialLng != null;

  @override
  void initState() {
    super.initState();
    _center = _hasInitialTarget
        ? LatLng(widget.initialLat!, widget.initialLng!)
        : _philippinesCenter;
    _committedCenter = _center;
    _hasTarget = _hasInitialTarget;
    _label = widget.initialLabel.trim();
    _committedLabel = _label;
  }

  @override
  void dispose() {
    _resolveDebounce?.cancel();
    _mapController = null;
    super.dispose();
  }

  /// Moves the map without overwriting the address fields (used when the
  /// address is typed elsewhere). Ignored while the user is editing the map.
  Future<void> moveTo(double lat, double lng, {String label = ''}) async {
    if (_editing) return;
    _center = LatLng(lat, lng);
    _committedCenter = _center;
    _hasTarget = true;
    if (label.trim().isNotEmpty && mounted) {
      setState(() {
        _label = label.trim();
        _committedLabel = _label;
      });
    }
    await _animateTo(_center);
  }

  Future<void> _animateTo(LatLng target) async {
    final controller = _mapController;
    if (controller == null || !_mapReady) return;
    await controller.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: _pinnedZoom),
      ),
    );
  }

  void _setEditing(bool editing) {
    setState(() {
      _editing = editing;
      _pinLifted = false;
    });
    widget.onEditingChanged?.call(editing);
  }

  void _startEditing() {
    _moved = false;
    _pendingPlace = null;
    _setEditing(true);
  }

  Future<void> _cancelEditing() async {
    _resolveDebounce?.cancel();
    _resolveRequestId++;
    _userGesture = false;
    setState(() {
      _resolving = false;
      _label = _committedLabel;
    });
    _setEditing(false);
    _center = _committedCenter;
    await _animateTo(_committedCenter);
  }

  Future<void> _saveEditing() async {
    if (_saving) return;
    if (!_moved) {
      _setEditing(false);
      return;
    }
    setState(() => _saving = true);
    try {
      final pendingResolve = _resolveDebounce?.isActive ?? false;
      _resolveDebounce?.cancel();
      if (pendingResolve || _resolving || _pendingPlace == null) {
        await _resolveCenter(_center);
      }
      if (!mounted) return;
      _committedCenter = _center;
      _committedLabel = _label;
      _hasTarget = true;
      widget.onPlaceChanged?.call(
        _pendingPlace,
        _center.latitude,
        _center.longitude,
      );
      _setEditing(false);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _scheduleResolve() {
    _resolveDebounce?.cancel();
    _resolveDebounce = Timer(const Duration(milliseconds: 350), () {
      unawaited(_resolveCenter(_center));
    });
  }

  Future<void> _resolveCenter(LatLng center) async {
    final requestId = ++_resolveRequestId;
    if (mounted) setState(() => _resolving = true);
    final place = await reverseGeocodePhilippines(
      lat: center.latitude,
      lng: center.longitude,
    );
    if (!mounted || requestId != _resolveRequestId) return;
    final line = place == null
        ? ''
        : (place.description.isNotEmpty ? place.description : place.label);
    setState(() {
      _resolving = false;
      _pendingPlace = place;
      if (line.isNotEmpty) _label = line;
    });
  }

  Future<void> _commitInitialCenter() async {
    await _resolveCenter(_center);
    if (!mounted || _editing) return;
    _committedCenter = _center;
    _committedLabel = _label;
    widget.onPlaceChanged?.call(
      _pendingPlace,
      _center.latitude,
      _center.longitude,
    );
  }

  Future<void> _useMyLocation() async {
    if (_locating) return;
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        widget.onError?.call('Turn on location services, then try again.');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        widget.onError?.call('Allow location access to pin your address.');
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      if (!mounted || !_editing) return;
      _center = LatLng(position.latitude, position.longitude);
      _moved = true;
      await _animateTo(_center);
      await _resolveCenter(_center);
    } catch (_) {
      widget.onError?.call('Unable to get your current location.');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary =
        widget.primaryColor ?? Theme.of(context).colorScheme.primary;
    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: ColoredBox(
        color: const Color(0xFFE8EEF5),
        child: _mapsSupported
            ? Stack(
                children: [
                  Positioned.fill(child: _buildMap()),
                  _buildCenterPin(primary),
                  if (_editing) ...[
                    Positioned(
                      right: 10,
                      bottom: 64,
                      child: _buildMyLocationButton(primary),
                    ),
                    Positioned(
                      left: 10,
                      right: 10,
                      bottom: 10,
                      child: _buildEditActions(primary),
                    ),
                  ] else
                    Positioned(
                      top: 10,
                      right: 10,
                      child: _buildEditButton(primary),
                    ),
                ],
              )
            : Center(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    _label.isEmpty ? 'Map unavailable on this device' : _label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildMap() {
    return Listener(
      onPointerDown: (_) {
        if (_editing) _userGesture = true;
      },
      child: GoogleMap(
        initialCameraPosition: CameraPosition(
          target: _center,
          zoom: _hasInitialTarget ? _pinnedZoom : 5.5,
        ),
        myLocationEnabled: true,
        myLocationButtonEnabled: false,
        zoomControlsEnabled: false,
        mapToolbarEnabled: false,
        compassEnabled: false,
        rotateGesturesEnabled: false,
        tiltGesturesEnabled: false,
        scrollGesturesEnabled: _editing,
        zoomGesturesEnabled: _editing,
        markers: const <Marker>{},
        gestureRecognizers: _editing
            ? <Factory<OneSequenceGestureRecognizer>>{
                Factory<OneSequenceGestureRecognizer>(
                  EagerGestureRecognizer.new,
                ),
              }
            : const <Factory<OneSequenceGestureRecognizer>>{},
        onMapCreated: (controller) {
          _mapController = controller;
          _mapReady = true;
          if (_hasTarget) {
            unawaited(
              controller.moveCamera(
                CameraUpdate.newCameraPosition(
                  CameraPosition(target: _center, zoom: _pinnedZoom),
                ),
              ),
            );
          }
          if (widget.resolveOnStart && _hasInitialTarget) {
            unawaited(_commitInitialCenter());
          }
        },
        onCameraMove: (position) {
          if (!_editing) return;
          _center = position.target;
          if (!_userGesture || _pinLifted) return;
          setState(() => _pinLifted = true);
        },
        onCameraIdle: () {
          if (_pinLifted && mounted) {
            setState(() => _pinLifted = false);
          }
          if (!_editing || !_userGesture) return;
          _userGesture = false;
          _moved = true;
          _scheduleResolve();
        },
      ),
    );
  }

  Widget _buildCenterPin(Color primary) {
    final lifted = _pinLifted;
    final String label;
    if (_resolving) {
      label = 'Finding address...';
    } else if (_editing && !_moved) {
      label = 'Drag map to match your location';
    } else if (_label.isNotEmpty) {
      label = _label;
    } else {
      label = 'Tap Edit to set your location';
    }
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
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  constraints: const BoxConstraints(maxWidth: 240),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x33000000),
                        blurRadius: 8,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFF202124),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      height: 1.25,
                    ),
                  ),
                ),
              ),
              SizedBox(
                width: 52,
                height: 56,
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.bottomCenter,
                  children: [
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
                        ),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: lifted ? 12 : 2,
                      child: Icon(
                        Icons.location_on_rounded,
                        size: 52,
                        color: primary,
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

  Widget _buildEditButton(Color primary) {
    return Material(
      color: Colors.white,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.16),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: _startEditing,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.edit_location_alt_rounded, color: primary, size: 18),
              const SizedBox(width: 6),
              Text(
                'Edit',
                style: TextStyle(
                  color: primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEditActions(Color primary) {
    return Row(
      children: [
        Expanded(
          child: SizedBox(
            height: 42,
            child: OutlinedButton(
              onPressed: _saving ? null : () => unawaited(_cancelEditing()),
              style: OutlinedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF3C4043),
                side: const BorderSide(color: Color(0xFFDADCE0)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Cancel',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: SizedBox(
            height: 42,
            child: FilledButton(
              onPressed: _saving ? null : () => unawaited(_saveEditing()),
              style: FilledButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: primary.withValues(alpha: 0.6),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Save',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMyLocationButton(Color primary) {
    return Material(
      color: Colors.white,
      elevation: 3,
      shadowColor: Colors.black.withValues(alpha: 0.16),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: _locating ? null : () => unawaited(_useMyLocation()),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Center(
            child: _locating
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: primary,
                    ),
                  )
                : Icon(Icons.my_location_rounded, color: primary, size: 20),
          ),
        ),
      ),
    );
  }
}
