import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:gms_shopping/services/philippines_places_service.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:gms_shopping/widgets/skeleton_loading.dart';

/// Native Google Maps preview used by Add Address and similar pickers.
class GoogleMapsEmbedPreview extends StatefulWidget {
  const GoogleMapsEmbedPreview({
    super.key,
    this.address = '',
    this.lat,
    this.lng,
    this.borderRadius = 15,
    this.height = 180,
    this.primaryColor,
  });

  final String address;
  final double? lat;
  final double? lng;
  final double borderRadius;
  /// Fixed height. Pass `null` to expand and fill the parent constraints.
  final double? height;
  final Color? primaryColor;

  @override
  State<GoogleMapsEmbedPreview> createState() => _GoogleMapsEmbedPreviewState();
}

class _GoogleMapsEmbedPreviewState extends State<GoogleMapsEmbedPreview> {
  static const LatLng _philippinesCenter = LatLng(12.8797, 121.7740);

  GoogleMapController? _mapController;
  Timer? _reloadTimer;
  int _resolveToken = 0;
  LatLng _target = _philippinesCenter;
  double _zoom = 5.5;
  bool _hasPin = false;
  bool _isResolving = false;
  bool _hasError = false;
  bool _mapReady = false;

  bool get _mapsSupported {
    if (kIsWeb) return true;
    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
  }

  @override
  void initState() {
    super.initState();
    unawaited(_resolveTarget());
  }

  @override
  void didUpdateWidget(covariant GoogleMapsEmbedPreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    final addressChanged =
        oldWidget.address.trim() != widget.address.trim();
    final coordsChanged =
        oldWidget.lat != widget.lat || oldWidget.lng != widget.lng;
    if (addressChanged || coordsChanged) {
      _scheduleResolve();
    }
  }

  @override
  void dispose() {
    _reloadTimer?.cancel();
    _mapController = null;
    super.dispose();
  }

  void _scheduleResolve() {
    _reloadTimer?.cancel();
    _reloadTimer = Timer(const Duration(milliseconds: 350), () {
      if (mounted) unawaited(_resolveTarget());
    });
  }

  Future<void> _resolveTarget() async {
    final token = ++_resolveToken;
    final lat = widget.lat;
    final lng = widget.lng;
    if (lat != null && lng != null) {
      _applyTarget(
        LatLng(lat, lng),
        zoom: 16.5,
        hasPin: true,
        hasError: false,
        resolving: false,
      );
      return;
    }

    final address = widget.address.trim();
    if (address.isEmpty ||
        address.toLowerCase() == 'philippines') {
      _applyTarget(
        _philippinesCenter,
        zoom: 5.5,
        hasPin: false,
        hasError: false,
        resolving: false,
      );
      return;
    }

    if (mounted) {
      setState(() {
        _isResolving = true;
        _hasError = false;
      });
    }

    try {
      final place = await geocodePhilippinesAddress(address);
      if (!mounted || token != _resolveToken) return;
      if (place?.lat != null && place?.lng != null) {
        _applyTarget(
          LatLng(place!.lat!, place.lng!),
          zoom: 16.5,
          hasPin: true,
          hasError: false,
          resolving: false,
        );
      } else {
        _applyTarget(
          _philippinesCenter,
          zoom: 5.5,
          hasPin: false,
          hasError: true,
          resolving: false,
        );
      }
    } catch (_) {
      if (!mounted || token != _resolveToken) return;
      _applyTarget(
        _philippinesCenter,
        zoom: 5.5,
        hasPin: false,
        hasError: true,
        resolving: false,
      );
    }
  }

  void _applyTarget(
    LatLng target, {
    required double zoom,
    required bool hasPin,
    required bool hasError,
    required bool resolving,
  }) {
    setState(() {
      _target = target;
      _zoom = zoom;
      _hasPin = hasPin;
      _hasError = hasError;
      _isResolving = resolving;
    });
    final controller = _mapController;
    if (controller == null || !_mapReady) return;
    unawaited(
      controller.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(target: target, zoom: zoom),
        ),
      ),
    );
  }

  Set<Marker> get _markers {
    if (!_hasPin) return const <Marker>{};
    return <Marker>{
      Marker(
        markerId: const MarkerId('selected_address'),
        position: _target,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final primary =
        widget.primaryColor ?? Theme.of(context).colorScheme.primary;
    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        child: Stack(
          children: [
            Positioned.fill(
              child: ColoredBox(
                color: const Color(0xFFE8EEF5),
                child: _mapsSupported
                    ? GoogleMap(
                        initialCameraPosition: CameraPosition(
                          target: _target,
                          zoom: _zoom,
                        ),
                        markers: _markers,
                        myLocationButtonEnabled: false,
                        zoomControlsEnabled: false,
                        mapToolbarEnabled: false,
                        compassEnabled: false,
                        gestureRecognizers:
                            <Factory<OneSequenceGestureRecognizer>>{
                          Factory<OneSequenceGestureRecognizer>(
                            EagerGestureRecognizer.new,
                          ),
                        },
                        onMapCreated: (controller) {
                          _mapController = controller;
                          _mapReady = true;
                          unawaited(
                            controller.moveCamera(
                              CameraUpdate.newCameraPosition(
                                CameraPosition(target: _target, zoom: _zoom),
                              ),
                            ),
                          );
                        },
                      )
                    : _UnsupportedMapPlaceholder(
                        address: widget.address,
                        primaryColor: primary,
                      ),
              ),
            ),
            if (_isResolving)
              const Positioned.fill(
                child: ColoredBox(
                  color: Color(0xCCE8EEF5),
                  child: Center(
                    child: const SkeletonBox(
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                    ),
                  ),
                ),
              ),
            if (_hasError && !_isResolving)
              Positioned.fill(
                child: ColoredBox(
                  color: const Color(0xF2E8EEF5),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Map unavailable',
                          style: TextStyle(
                            color: primary,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        IconButton(
                          onPressed: () => unawaited(_resolveTarget()),
                          tooltip: 'Reload map',
                          icon: Icon(Icons.refresh_rounded, color: primary),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _UnsupportedMapPlaceholder extends StatelessWidget {
  const _UnsupportedMapPlaceholder({
    required this.address,
    required this.primaryColor,
  });

  final String address;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    final label = address.trim().isEmpty ? 'Philippines' : address.trim();
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.map_outlined, color: primaryColor, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: primaryColor.withValues(alpha: 0.9),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
