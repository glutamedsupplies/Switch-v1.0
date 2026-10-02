import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:switch_core/switch_core.dart';

import '../../location_reporter.dart';
import '../../models.dart';
import '../common.dart';

class RiderRouteScreen extends StatefulWidget {
  const RiderRouteScreen.forOffer({
    super.key,
    required this.offerId,
    required this.deliveryCode,
  }) : jobId = '';

  const RiderRouteScreen.forJob({
    super.key,
    required this.jobId,
    required this.deliveryCode,
  }) : offerId = '';

  final String offerId;
  final String jobId;
  final String deliveryCode;

  bool get isOffer => offerId.isNotEmpty;

  @override
  State<RiderRouteScreen> createState() => _RiderRouteScreenState();
}

class _RiderRouteScreenState extends State<RiderRouteScreen> {
  GoogleMapController? _mapController;
  RiderRouteView? _route;
  Object? _error;
  Timer? _poll;
  bool _loading = true;
  bool _refreshingLocation = false;
  String? _locationWarning;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(_load(updateLocation: !widget.isOffer));
      if (!widget.isOffer) {
        _poll = Timer.periodic(
          const Duration(seconds: 15),
          (_) => unawaited(_load(updateLocation: true, silent: true)),
        );
      }
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _load({bool updateLocation = false, bool silent = false}) async {
    if (!silent && mounted) setState(() => _loading = true);
    final isOffer = widget.isOffer;
    final offerId = widget.offerId;
    final jobId = widget.jobId;
    double? deviceLat;
    double? deviceLng;
    try {
      final api = context.api;
      if (updateLocation && !_refreshingLocation) {
        _refreshingLocation = true;
        try {
          final locationProblem = await ensureLocationAccess();
          if (locationProblem != null) {
            _locationWarning = locationProblem;
          } else {
            final position = await currentPosition();
            if (position == null) {
              _locationWarning =
                  'GPS location is unavailable. Move to an open area and refresh.';
            } else {
              deviceLat = position.latitude;
              deviceLng = position.longitude;
              _locationWarning = null;
              // Persist the point for dispatch/buyer tracking. Navigation below
              // also receives the GPS point directly, so a rate-limited update
              // never sends the map back to an old or mock location.
              await api.sendLocation(
                lat: position.latitude,
                lng: position.longitude,
                accuracy: position.accuracy,
                recordedAt: position.timestamp,
              );
            }
          }
        } catch (_) {
          // The server can still route from the latest accepted location.
        } finally {
          _refreshingLocation = false;
        }
      }

      final next =
          await (isOffer
                  ? api.offerRoute(offerId)
                  : api.jobRoute(jobId, lat: deviceLat, lng: deviceLng))
              .timeout(const Duration(seconds: 15));
      if (!mounted) return;
      setState(() {
        _route = next;
        _error = null;
        _loading = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitRoute());
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  List<LatLng> get _routePoints {
    final route = _route;
    if (route == null) return const [];
    final decoded = _decodePolyline(route.encodedPolyline);
    if (decoded.isNotEmpty) return decoded;
    return [
      if (route.origin != null) LatLng(route.origin!.lat, route.origin!.lng),
      if (route.destination != null)
        LatLng(route.destination!.lat, route.destination!.lng),
    ];
  }

  Future<void> _fitRoute() async {
    final controller = _mapController;
    final points = _routePoints;
    if (controller == null || points.isEmpty || !mounted) return;
    if (points.length == 1) {
      await controller.animateCamera(
        CameraUpdate.newLatLngZoom(points.first, 16),
      );
      return;
    }
    var south = points.first.latitude;
    var north = points.first.latitude;
    var west = points.first.longitude;
    var east = points.first.longitude;
    for (final point in points.skip(1)) {
      south = math.min(south, point.latitude);
      north = math.max(north, point.latitude);
      west = math.min(west, point.longitude);
      east = math.max(east, point.longitude);
    }
    if ((north - south).abs() < 0.0005 && (east - west).abs() < 0.0005) {
      await controller.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng((north + south) / 2, (east + west) / 2),
          16,
        ),
      );
      return;
    }
    try {
      await controller.animateCamera(
        CameraUpdate.newLatLngBounds(
          LatLngBounds(
            southwest: LatLng(south, west),
            northeast: LatLng(north, east),
          ),
          64,
        ),
      );
    } catch (_) {
      // The map may not have its final size yet; the center button retries.
    }
  }

  Set<Marker> _markers(RiderRouteView route) {
    Marker marker(RiderRoutePoint point) {
      final hue = switch (point.kind) {
        'RIDER' => BitmapDescriptor.hueGreen,
        'PICKUP' => BitmapDescriptor.hueOrange,
        _ => BitmapDescriptor.hueRed,
      };
      final title = switch (point.kind) {
        'RIDER' => 'Your location',
        'PICKUP' => 'Pickup',
        _ => 'Drop-off',
      };
      return Marker(
        markerId: MarkerId(point.kind.toLowerCase()),
        position: LatLng(point.lat, point.lng),
        icon: BitmapDescriptor.defaultMarkerWithHue(hue),
        infoWindow: InfoWindow(title: title, snippet: point.label),
      );
    }

    return {
      if (route.origin != null) marker(route.origin!),
      if (route.destination != null) marker(route.destination!),
    };
  }

  @override
  Widget build(BuildContext context) {
    final route = _route;
    final points = _routePoints;
    final hasRoadRoute = route?.source == 'google' && points.length >= 2;
    final initialTarget = points.isNotEmpty
        ? points.first
        : const LatLng(12.8797, 121.7740);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.deliveryCode.isEmpty ? 'Delivery route' : widget.deliveryCode,
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh route',
            onPressed: _loading
                ? null
                : () => _load(updateLocation: !widget.isOffer),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: route == null
                ? const ColoredBox(color: Color(0xFFE8EEF2))
                : GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: initialTarget,
                      zoom: 13,
                    ),
                    markers: _markers(route),
                    polylines: {
                      if (hasRoadRoute)
                        Polyline(
                          polylineId: const PolylineId('active_route_outline'),
                          points: points,
                          width: 12,
                          color: const Color(0xEFFFFFFF),
                          startCap: Cap.roundCap,
                          endCap: Cap.roundCap,
                          jointType: JointType.round,
                          zIndex: 1,
                        ),
                      if (hasRoadRoute)
                        Polyline(
                          polylineId: const PolylineId('active_route'),
                          points: points,
                          width: 7,
                          color: SwitchBrand.teal,
                          startCap: Cap.roundCap,
                          endCap: Cap.roundCap,
                          jointType: JointType.round,
                          zIndex: 2,
                        ),
                    },
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                    mapToolbarEnabled: false,
                    onMapCreated: (controller) {
                      _mapController = controller;
                      WidgetsBinding.instance.addPostFrameCallback(
                        (_) => _fitRoute(),
                      );
                    },
                  ),
          ),
          if (route != null) ...[
            Positioned(
              top: 14,
              right: 14,
              child: FloatingActionButton.small(
                heroTag: 'fit_route',
                tooltip: 'Show whole route',
                backgroundColor: Colors.white,
                foregroundColor: SwitchBrand.tealDark,
                onPressed: _fitRoute,
                child: const Icon(Icons.center_focus_strong),
              ),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 14,
              child: _RouteSummary(
                route: route,
                locationWarning: widget.isOffer ? null : _locationWarning,
              ),
            ),
          ],
          if (_loading)
            const Positioned.fill(
              child: ColoredBox(
                color: Color(0x55FFFFFF),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          if (_error != null && !_loading)
            Positioned.fill(
              child: ColoredBox(
                color: const Color(0xFFF4F7F8),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      EmptyState(
                        icon: Icons.route_outlined,
                        message: errorText(_error!),
                      ),
                      FilledButton.icon(
                        onPressed: () => _load(updateLocation: !widget.isOffer),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Try again'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _RouteSummary extends StatelessWidget {
  const _RouteSummary({required this.route, this.locationWarning});

  final RiderRouteView route;
  final String? locationWarning;

  @override
  Widget build(BuildContext context) {
    final distanceKm = route.distanceMeters / 1000;
    final minutes = (route.durationSeconds / 60).ceil();
    final (title, icon) = switch (route.phase) {
      'TO_PICKUP' => ('Route to pickup', Icons.storefront),
      'TO_DROPOFF' => ('Route to customer', Icons.location_on),
      'TO_RETURN' => ('Return route to seller', Icons.assignment_return),
      _ => ('Pickup to drop-off', Icons.route),
    };
    return Material(
      elevation: 8,
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: SwitchBrand.teal),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 17,
                    ),
                  ),
                ),
                if (route.source == 'estimate')
                  const Icon(
                    Icons.cloud_off_outlined,
                    color: Color(0xFFC47B1B),
                    size: 20,
                  ),
              ],
            ),
            if (route.source == 'estimate') ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Color(0xFFFFF7E8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Road route is reconnecting. Pickup and drop-off pins are shown; tap refresh shortly.',
                  style: TextStyle(
                    color: Color(0xFF8A5717),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
            if (locationWarning != null) ...[
              const SizedBox(height: 10),
              Text(
                locationWarning!,
                style: const TextStyle(
                  color: Color(0xFF8A5717),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 10),
            Text(
              '${route.origin?.label ?? 'Current location'} to ${route.destination?.label ?? 'Destination'}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                StatusChip(
                  distanceKm < 10
                      ? '${distanceKm.toStringAsFixed(1)} km'
                      : '${distanceKm.toStringAsFixed(0)} km',
                ),
                if (minutes > 0) StatusChip('~$minutes min'),
                StatusChip(
                  route.phase == 'OVERVIEW' ? 'Trip overview' : 'Live route',
                  color: route.phase == 'OVERVIEW'
                      ? SwitchBrand.muted
                      : SwitchBrand.success,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

List<LatLng> _decodePolyline(String encoded) {
  if (encoded.isEmpty) return const [];
  final points = <LatLng>[];
  var index = 0;
  var latitude = 0;
  var longitude = 0;
  while (index < encoded.length) {
    int decodeValue() {
      var result = 0;
      var shift = 0;
      int byte;
      do {
        if (index >= encoded.length) return 0;
        byte = encoded.codeUnitAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      return (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    }

    latitude += decodeValue();
    longitude += decodeValue();
    points.add(LatLng(latitude / 1e5, longitude / 1e5));
  }
  return points;
}
