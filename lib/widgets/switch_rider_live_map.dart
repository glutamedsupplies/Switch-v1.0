import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:switch_app/services/switch_rider_service.dart';

/// Live Switch Rider map: store, buyer and rider markers with the road route
/// (rider → store → buyer before pickup, rider → buyer after pickup).
class SwitchRiderLiveMap extends StatefulWidget {
  const SwitchRiderLiveMap({
    super.key,
    required this.tracking,
    this.height = 300,
    this.borderRadius = 12,
  });

  final SwitchRiderTracking tracking;
  final double height;
  final double borderRadius;

  @override
  State<SwitchRiderLiveMap> createState() => _SwitchRiderLiveMapState();
}

class _SwitchRiderLiveMapState extends State<SwitchRiderLiveMap> {
  static const Duration _riderGlideDuration = Duration(milliseconds: 1200);
  static const int _riderGlideSteps = 20;

  GoogleMapController? _controller;
  String _fittedPhase = '';
  LatLng? _riderShown;
  Timer? _glideTimer;

  bool get _mapsSupported {
    if (kIsWeb) return true;
    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
  }

  @override
  void initState() {
    super.initState();
    _riderShown = _toLatLng(widget.tracking.riderPoint);
  }

  @override
  void didUpdateWidget(covariant SwitchRiderLiveMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = _toLatLng(widget.tracking.riderPoint);
    if (next == null) {
      _glideTimer?.cancel();
      _riderShown = null;
    } else if (_riderShown == null) {
      _riderShown = next;
    } else if (next != _riderShown) {
      _glideRiderTo(next);
    }
    if (_phaseKey(widget.tracking) != _fittedPhase) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitCamera());
    }
  }

  @override
  void dispose() {
    _glideTimer?.cancel();
    _controller = null;
    super.dispose();
  }

  void _glideRiderTo(LatLng target) {
    _glideTimer?.cancel();
    final start = _riderShown ?? target;
    var step = 0;
    _glideTimer = Timer.periodic(
      Duration(
        milliseconds: _riderGlideDuration.inMilliseconds ~/ _riderGlideSteps,
      ),
      (timer) {
        step += 1;
        final t = Curves.easeInOut.transform(step / _riderGlideSteps);
        if (!mounted) {
          timer.cancel();
          return;
        }
        setState(() {
          _riderShown = LatLng(
            start.latitude + (target.latitude - start.latitude) * t,
            start.longitude + (target.longitude - start.longitude) * t,
          );
        });
        if (step >= _riderGlideSteps) timer.cancel();
      },
    );
  }

  static LatLng? _toLatLng(SwitchRiderMapPoint? point) =>
      point == null ? null : LatLng(point.lat, point.lng);

  static String _phaseKey(SwitchRiderTracking tracking) =>
      '${tracking.route?.phase ?? 'NONE'}|${tracking.hasLiveLocation}';

  List<LatLng> _boundsPoints() {
    final tracking = widget.tracking;
    final points = <LatLng>[
      ?_toLatLng(tracking.pickup),
      ?_toLatLng(tracking.dropoff),
      ?_riderShown,
    ];
    for (final segment in tracking.route?.segments ?? const []) {
      for (final point in segment.points) {
        points.add(LatLng(point.lat, point.lng));
      }
    }
    return points;
  }

  Future<void> _fitCamera() async {
    final controller = _controller;
    if (controller == null || !mounted) return;
    final points = _boundsPoints();
    if (points.isEmpty) return;
    _fittedPhase = _phaseKey(widget.tracking);
    if (points.length == 1) {
      await controller.animateCamera(CameraUpdate.newLatLngZoom(points.first, 16));
      return;
    }
    var south = points.first.latitude;
    var north = points.first.latitude;
    var west = points.first.longitude;
    var east = points.first.longitude;
    for (final point in points) {
      south = math.min(south, point.latitude);
      north = math.max(north, point.latitude);
      west = math.min(west, point.longitude);
      east = math.max(east, point.longitude);
    }
    if ((north - south).abs() < 0.0005 && (east - west).abs() < 0.0005) {
      await controller.animateCamera(
        CameraUpdate.newLatLngZoom(LatLng((north + south) / 2, (east + west) / 2), 16),
      );
      return;
    }
    try {
      await controller.animateCamera(
        CameraUpdate.newLatLngBounds(
          LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
          56,
        ),
      );
    } catch (_) {
      // Bounds can fail before the map has a size; the next update refits.
      _fittedPhase = '';
    }
  }

  Set<Marker> _markers() {
    final tracking = widget.tracking;
    final pickup = _toLatLng(tracking.pickup);
    final dropoff = _toLatLng(tracking.dropoff);
    final rider = _riderShown;
    return <Marker>{
      if (pickup != null)
        Marker(
          markerId: const MarkerId('store'),
          position: pickup,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: InfoWindow(
            title: tracking.pickupName.isEmpty ? 'Store' : tracking.pickupName,
            snippet: 'Pickup',
          ),
        ),
      if (dropoff != null)
        Marker(
          markerId: const MarkerId('buyer'),
          position: dropoff,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: 'You', snippet: 'Drop-off'),
        ),
      if (rider != null)
        Marker(
          markerId: const MarkerId('rider'),
          position: rider,
          zIndexInt: 2,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: InfoWindow(
            title: tracking.rider?.firstName.isNotEmpty == true
                ? tracking.rider!.firstName
                : 'Your rider',
            snippet: tracking.rider?.plateNumber,
          ),
        ),
    };
  }

  Set<Polyline> _polylines(Color primary) {
    final route = widget.tracking.route;
    if (route == null) return const <Polyline>{};
    final hasLiveLeg = route.segments.any((segment) => segment.isLive);
    final polylines = <Polyline>{};
    for (var i = 0; i < route.segments.length; i++) {
      final segment = route.segments[i];
      final points = segment.points
          .map((point) => LatLng(point.lat, point.lng))
          .toList(growable: false);
      final live = segment.isLive;
      polylines.add(
        Polyline(
          polylineId: PolylineId('${segment.kind}_$i'),
          points: points,
          width: live ? 6 : 4,
          color: live
              ? primary
              : (hasLiveLeg ? const Color(0xFF9AA5B1) : primary.withValues(alpha: 0.75)),
          zIndex: live ? 2 : 1,
          patterns: live || !hasLiveLeg
              ? const <PatternItem>[]
              : <PatternItem>[PatternItem.dash(18), PatternItem.gap(10)],
          geodesic: segment.isEstimate,
        ),
      );
    }
    return polylines;
  }

  String _etaLabel() {
    final tracking = widget.tracking;
    final route = tracking.route;
    if (route == null) return '';
    final minutes = (route.etaSeconds / 60).ceil();
    final eta = minutes <= 0 ? '' : ' · ~$minutes min';
    switch (route.phase) {
      case 'TO_PICKUP':
        return 'Rider heading to the store$eta';
      case 'TO_DROPOFF':
        return 'Rider on the way to you$eta';
      default:
        final km = route.segments.first.distanceMeters / 1000;
        return km > 0
            ? 'Store → you · ${km.toStringAsFixed(km < 10 ? 1 : 0)} km'
            : 'Store → you';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;
    final tracking = widget.tracking;
    final initialTarget = _riderShown ??
        _toLatLng(tracking.pickup) ??
        _toLatLng(tracking.dropoff) ??
        const LatLng(12.8797, 121.7740);
    final label = _etaLabel();
    final hasEstimate =
        tracking.route?.segments.any((segment) => segment.isEstimate) ?? false;

    return Container(
      height: widget.height,
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFFE8EEF5),
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.4)),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: _mapsSupported
                ? GoogleMap(
                    initialCameraPosition: CameraPosition(target: initialTarget, zoom: 14),
                    markers: _markers(),
                    polylines: _polylines(primary),
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                    mapToolbarEnabled: false,
                    compassEnabled: false,
                    gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                      Factory<OneSequenceGestureRecognizer>(EagerGestureRecognizer.new),
                    },
                    onMapCreated: (controller) {
                      _controller = controller;
                      WidgetsBinding.instance.addPostFrameCallback((_) => _fitCamera());
                    },
                  )
                : Center(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(
                        'Open Switch on your phone to see the live map.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ),
          ),
          if (label.isNotEmpty)
            Positioned(
              left: 10,
              top: 10,
              right: 64,
              child: Align(
                alignment: Alignment.centerLeft,
                child: Material(
                  color: theme.cardColor,
                  elevation: 3,
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.route_rounded, size: 16, color: primary),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          if (_mapsSupported)
            Positioned(
              right: 10,
              top: 10,
              child: Material(
                color: theme.cardColor,
                shape: const CircleBorder(),
                elevation: 3,
                child: IconButton(
                  tooltip: 'Show whole route',
                  onPressed: () => unawaited(_fitCamera()),
                  icon: Icon(Icons.center_focus_strong_rounded, color: primary),
                ),
              ),
            ),
          Positioned(
            left: 10,
            bottom: 10,
            child: _Legend(primary: primary, showRider: _riderShown != null),
          ),
          if (hasEstimate)
            Positioned(
              right: 10,
              bottom: 10,
              child: Text(
                'Approximate route',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: Colors.black54,
                  backgroundColor: Colors.white70,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.primary, required this.showRider});

  final Color primary;
  final bool showRider;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
        );
    Widget item(Color color, String label) => Padding(
          padding: const EdgeInsets.only(right: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_on_rounded, size: 14, color: color),
              const SizedBox(width: 2),
              Text(label, style: style),
            ],
          ),
        );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showRider) item(const Color(0xFF2E7D32), 'Rider'),
          item(const Color(0xFFEF6C00), 'Store'),
          item(const Color(0xFFD32F2F), 'You'),
        ],
      ),
    );
  }
}
