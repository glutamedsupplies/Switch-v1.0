import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:webview_flutter/webview_flutter.dart';

String _trackingMapQuery(String destinationAddress) {
  final trimmedAddress = destinationAddress.trim();
  return trimmedAddress.isEmpty
      ? 'City of Catbalogan, Samar, Philippines'
      : trimmedAddress.toLowerCase().contains('philippines')
          ? trimmedAddress
          : '$trimmedAddress, Philippines';
}

String _trackingMapEmbedUrl(String destinationAddress) {
  return Uri.https(
    'www.google.com',
    '/maps',
    <String, String>{
      'q': _trackingMapQuery(destinationAddress),
      'z': destinationAddress.trim().isEmpty ? '14' : '16',
      'output': 'embed',
    },
  ).toString();
}

String _trackingMapHtml(String mapUrl) {
  final escapedMapUrl =
      const HtmlEscape(HtmlEscapeMode.attribute).convert(mapUrl);

  return '''
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #eef2f7;
      }

      iframe {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: #eef2f7;
      }
    </style>
  </head>
  <body>
    <iframe
      src="$escapedMapUrl"
      title="Order tracking map"
      loading="eager"
      allowfullscreen
      referrerpolicy="no-referrer-when-downgrade">
    </iframe>
  </body>
</html>
''';
}

String _formatTrackingPlacedTime(int epochMs) {
  if (epochMs <= 0) {
    return '';
  }

  final dateTime = DateTime.fromMillisecondsSinceEpoch(epochMs);
  final hour = dateTime.hour % 12 == 0 ? 12 : dateTime.hour % 12;
  final minute = dateTime.minute.toString().padLeft(2, '0');
  final suffix = dateTime.hour >= 12 ? 'PM' : 'AM';
  return '$hour:$minute $suffix';
}

String _trackingTileMapHtml(String destinationAddress) {
  final encodedQuery = jsonEncode(_trackingMapQuery(destinationAddress));

  return '''
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #eef2f7;
        touch-action: none;
        overscroll-behavior: none;
        user-select: none;
      }

      #map,
      #tiles {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      #tiles img {
        position: absolute;
        width: 256px;
        height: 256px;
        pointer-events: none;
        user-select: none;
      }

      .pin {
        position: fixed;
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        background: #B000E8;
        box-shadow: 0 8px 18px rgba(80, 0, 120, 0.26);
        transform: translate(-50%, -100%) rotate(-45deg);
        transform-origin: 50% 100%;
        pointer-events: none;
      }

      .pin::after {
        content: "";
        position: absolute;
        width: 8px;
        height: 8px;
        left: 8px;
        top: 8px;
        border-radius: 50%;
        background: #fff;
      }

      .zoom {
        position: fixed;
        top: calc(env(safe-area-inset-top) + 12px);
        right: 12px;
        display: grid;
        gap: 8px;
        z-index: 3;
      }

      .zoom button {
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.94);
        color: #202124;
        font: 700 24px/1 Arial, sans-serif;
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.18);
      }

      .attribution {
        position: fixed;
        left: 8px;
        bottom: 8px;
        z-index: 2;
        padding: 3px 6px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.86);
        color: #475569;
        font: 600 10px/1.2 Arial, sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="map">
      <div id="tiles"></div>
      <div class="pin" id="pin" aria-hidden="true"></div>
      <div class="zoom" aria-label="Map zoom controls">
        <button id="zoomIn" type="button" aria-label="Zoom in">+</button>
        <button id="zoomOut" type="button" aria-label="Zoom out">-</button>
      </div>
      <div class="attribution">Map data (c) OpenStreetMap</div>
    </div>
    <script>
      const query = $encodedQuery;
      const map = document.getElementById('map');
      const tiles = document.getElementById('tiles');
      const pin = document.getElementById('pin');
      const tileSize = 256;
      const minZoom = 5;
      const maxZoom = 19;

      let zoom = query.includes('City of Catbalogan') ? 14 : 16;
      let centerLat = 11.7753;
      let centerLon = 124.8861;
      let markerLat = centerLat;
      let markerLon = centerLon;
      let renderQueued = false;
      let dragStart = null;
      let pinchStart = null;
      const pointers = new Map();

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function normalizeTileX(x, tileCount) {
        return ((x % tileCount) + tileCount) % tileCount;
      }

      function project(lat, lon, z) {
        const sinLat = Math.sin((lat * Math.PI) / 180);
        const worldSize = tileSize * Math.pow(2, z);
        return {
          x: ((lon + 180) / 360) * worldSize,
          y:
            (0.5 -
              Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
            worldSize,
        };
      }

      function unproject(x, y, z) {
        const worldSize = tileSize * Math.pow(2, z);
        const lon = (x / worldSize) * 360 - 180;
        const n = Math.PI - (2 * Math.PI * y) / worldSize;
        const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
        return { lat, lon };
      }

      function setCenterFromWorld(x, y) {
        const worldSize = tileSize * Math.pow(2, zoom);
        const next = unproject(
          x,
          clamp(y, 0, worldSize),
          zoom,
        );
        centerLat = clamp(next.lat, -85, 85);
        centerLon = next.lon;
      }

      function scheduleRender() {
        if (renderQueued) {
          return;
        }
        renderQueued = true;
        requestAnimationFrame(() => {
          renderQueued = false;
          render();
        });
      }

      function render() {
        const rect = map.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        const tileCount = Math.pow(2, zoom);
        const center = project(centerLat, centerLon, zoom);
        const topLeftX = center.x - rect.width / 2;
        const topLeftY = center.y - rect.height / 2;
        const startX = Math.floor(topLeftX / tileSize);
        const endX = Math.floor((topLeftX + rect.width) / tileSize);
        const startY = Math.max(0, Math.floor(topLeftY / tileSize));
        const endY = Math.min(
          tileCount - 1,
          Math.floor((topLeftY + rect.height) / tileSize),
        );

        tiles.replaceChildren();
        for (let x = startX; x <= endX; x += 1) {
          for (let y = startY; y <= endY; y += 1) {
            const img = document.createElement('img');
            img.draggable = false;
            img.alt = '';
            img.src =
              'https://tile.openstreetmap.org/' +
              zoom +
              '/' +
              normalizeTileX(x, tileCount) +
              '/' +
              y +
              '.png';
            img.style.left = x * tileSize - topLeftX + 'px';
            img.style.top = y * tileSize - topLeftY + 'px';
            tiles.appendChild(img);
          }
        }

        const marker = project(markerLat, markerLon, zoom);
        pin.style.left = marker.x - topLeftX + 'px';
        pin.style.top = marker.y - topLeftY + 'px';
      }

      function setZoom(nextZoom) {
        const normalizedZoom = clamp(Math.round(nextZoom), minZoom, maxZoom);
        if (normalizedZoom === zoom) {
          return;
        }
        zoom = normalizedZoom;
        scheduleRender();
      }

      function pointerDistance(items) {
        const first = items[0];
        const second = items[1];
        return Math.hypot(first.x - second.x, first.y - second.y);
      }

      function resetDragFromPointer(pointer) {
        const center = project(centerLat, centerLon, zoom);
        dragStart = {
          x: pointer.x,
          y: pointer.y,
          centerX: center.x,
          centerY: center.y,
        };
      }

      map.addEventListener('pointerdown', (event) => {
        map.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        if (pointers.size === 1) {
          resetDragFromPointer({ x: event.clientX, y: event.clientY });
        } else if (pointers.size === 2) {
          pinchStart = {
            distance: pointerDistance(Array.from(pointers.values())),
          };
        }
        event.preventDefault();
      });

      map.addEventListener('pointermove', (event) => {
        if (!pointers.has(event.pointerId)) {
          return;
        }
        pointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });

        if (pointers.size === 1 && dragStart) {
          const dx = event.clientX - dragStart.x;
          const dy = event.clientY - dragStart.y;
          setCenterFromWorld(dragStart.centerX - dx, dragStart.centerY - dy);
          scheduleRender();
        } else if (pointers.size === 2 && pinchStart) {
          const values = Array.from(pointers.values());
          const distance = pointerDistance(values);
          if (distance > pinchStart.distance * 1.18) {
            setZoom(zoom + 1);
            pinchStart.distance = distance;
          } else if (distance < pinchStart.distance * 0.84) {
            setZoom(zoom - 1);
            pinchStart.distance = distance;
          }
        }
        event.preventDefault();
      });

      function endPointer(event) {
        pointers.delete(event.pointerId);
        if (pointers.size === 1) {
          resetDragFromPointer(Array.from(pointers.values())[0]);
          pinchStart = null;
        } else {
          dragStart = null;
          pinchStart = null;
        }
      }

      map.addEventListener('pointerup', endPointer);
      map.addEventListener('pointercancel', endPointer);
      map.addEventListener('dblclick', (event) => event.preventDefault());
      map.addEventListener(
        'wheel',
        (event) => {
          event.preventDefault();
          setZoom(zoom + (event.deltaY < 0 ? 1 : -1));
        },
        { passive: false },
      );

      document.getElementById('zoomIn').addEventListener('click', (event) => {
        event.stopPropagation();
        setZoom(zoom + 1);
      });
      document.getElementById('zoomOut').addEventListener('click', (event) => {
        event.stopPropagation();
        setZoom(zoom - 1);
      });

      async function geocodeInitialQuery() {
        if (!query || query.includes('City of Catbalogan')) {
          render();
          return;
        }

        try {
          const url = new URL('https://nominatim.openstreetmap.org/search');
          url.searchParams.set('format', 'jsonv2');
          url.searchParams.set('limit', '1');
          url.searchParams.set('countrycodes', 'ph');
          url.searchParams.set('q', query);
          const response = await fetch(url.toString());
          const data = await response.json();
          if (Array.isArray(data) && data.length) {
            centerLat = Number(data[0].lat);
            centerLon = Number(data[0].lon);
            markerLat = centerLat;
            markerLon = centerLon;
          }
        } catch (_) {}
        render();
      }

      window.addEventListener('resize', scheduleRender);
      geocodeInitialQuery();
    </script>
  </body>
</html>
''';
}

class TackingPage extends StatelessWidget {
  const TackingPage({
    super.key,
    required this.destinationAddress,
    this.customerName = '',
    this.deliveryPartnerName = '',
    this.orderLabel = '',
    this.placedAtEpochMs = 0,
  });

  final String destinationAddress;
  final String customerName;
  final String deliveryPartnerName;
  final String orderLabel;
  final int placedAtEpochMs;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final homeHeaderBackgroundColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final isLightMode = theme.brightness == Brightness.light;
    final homeDashboardBackgroundColor =
        isLightMode ? Colors.white : theme.cardColor;
    final lineStrokeBackgroundColor =
        isLightMode ? const Color(0xFFE5E7EB) : homeHeaderBackgroundColor;
    final surfaceColor = homeHeaderBackgroundColor;
    final primaryColor = theme.colorScheme.primary;
    final placedTimeLabel = _formatTrackingPlacedTime(placedAtEpochMs);
    final destinationTitle = destinationAddress.trim().isEmpty
        ? 'City of Catbalogan'
        : destinationAddress.trim();
    final destinationSubtitle = customerName.trim().isEmpty
        ? 'Customer house'
        : customerName.trim();
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
            theme.colorScheme.onSurface.withOpacity(0.68);
    final riderLabel = deliveryPartnerName.trim().isEmpty
        ? 'Rider'
        : deliveryPartnerName.trim();
    final modalHeight = placedTimeLabel.isEmpty ? 212.0 : 236.0;
    final overlayIconBrightness =
        isLightMode ? Brightness.dark : Brightness.light;
    final systemOverlayStyle = SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: overlayIconBrightness,
      statusBarBrightness: isLightMode ? Brightness.light : Brightness.dark,
      systemNavigationBarColor: homeDashboardBackgroundColor,
      systemNavigationBarIconBrightness: overlayIconBrightness,
    );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: systemOverlayStyle,
      child: Scaffold(
        extendBodyBehindAppBar: true,
        backgroundColor: theme.cardColor,
        body: Stack(
          children: [
            Positioned.fill(
              child: _TrackingMapPreview(
                destinationAddress: destinationAddress,
                primaryColor: primaryColor,
                surfaceColor: surfaceColor,
                expands: true,
              ),
            ),
            Positioned(
              left: 12,
              top: 0,
              child: SafeArea(
                bottom: false,
                child: Material(
                  color: homeDashboardBackgroundColor,
                  shape: const CircleBorder(),
                  elevation: 6,
                  shadowColor: Colors.black.withOpacity(0.18),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () => Navigator.of(context).maybePop(),
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: Icon(
                        Icons.arrow_back_rounded,
                        color: theme.colorScheme.onSurface,
                        size: 23,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Material(
                color: homeDashboardBackgroundColor,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(8),
                ),
                elevation: 12,
                shadowColor: Colors.black.withOpacity(0.22),
                child: SafeArea(
                  top: false,
                  child: SizedBox(
                    height: modalHeight,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 10,
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (placedTimeLabel.isNotEmpty) ...[
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  placedTimeLabel,
                                  style: theme.textTheme.labelLarge?.copyWith(
                                    color: theme.colorScheme.onSurface,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                            _TrackingProgressHeader(
                              activeColor: primaryColor,
                              inactiveColor: lineStrokeBackgroundColor,
                              iconColor: const Color(0xFF5F6675),
                            ),
                            const SizedBox(height: 16),
                            _TrackingRouteSummary(
                              originTitle: 'GMS Packing Hub',
                              originSubtitle: deliveryPartnerName.trim().isEmpty
                                  ? 'Hub'
                                  : deliveryPartnerName.trim(),
                              destinationTitle: destinationTitle,
                              destinationSubtitle: destinationSubtitle,
                              primaryColor: primaryColor,
                              titleColor: theme.colorScheme.onSurface,
                              secondaryColor: secondaryColor,
                            ),
                            const SizedBox(height: 12),
                            _TrackingRiderInfo(
                              riderLabel: riderLabel,
                              primaryColor: primaryColor,
                              titleColor: theme.colorScheme.onSurface,
                              secondaryColor: secondaryColor,
                            ),
                          ],
                        ),
                      ),
                    ),
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

class _TrackingProgressHeader extends StatefulWidget {
  const _TrackingProgressHeader({
    required this.activeColor,
    required this.inactiveColor,
    required this.iconColor,
  });

  final Color activeColor;
  final Color inactiveColor;
  final Color iconColor;

  @override
  State<_TrackingProgressHeader> createState() =>
      _TrackingProgressHeaderState();
}

class _TrackingProgressHeaderState extends State<_TrackingProgressHeader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _flowController;

  @override
  void initState() {
    super.initState();
    _flowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _flowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final disablesAnimations = MediaQuery.disableAnimationsOf(context);

    return AnimatedBuilder(
      animation: _flowController,
      builder: (context, child) {
        final flowProgress = disablesAnimations ? 1.0 : _flowController.value;

        return Row(
          children: [
            Icon(
              Icons.inventory_2_outlined,
              color: widget.activeColor,
              size: 16,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _TrackingProgressLine(color: widget.activeColor),
            ),
            const SizedBox(width: 8),
            _TrackingActiveIcon(
              icon: Icons.local_shipping_outlined,
              color: widget.activeColor,
              size: 17,
              progress: flowProgress,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _TrackingProgressLine(
                color: widget.inactiveColor,
                highlightColor: widget.activeColor,
                flowProgress: flowProgress,
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.route_outlined,
              color: widget.iconColor,
              size: 17,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _TrackingProgressLine(color: widget.inactiveColor),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.check_rounded,
              color: widget.iconColor,
              size: 17,
            ),
          ],
        );
      },
    );
  }
}

class _TrackingProgressLine extends StatelessWidget {
  const _TrackingProgressLine({
    required this.color,
    this.highlightColor,
    this.flowProgress = 0,
  });

  final Color color;
  final Color? highlightColor;
  final double flowProgress;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 5,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final highlight = highlightColor;
            if (highlight == null) {
              return ColoredBox(color: color);
            }

            final width = constraints.maxWidth;
            final highlightWidth = width * 0.42;
            final left = ((width + highlightWidth * 2) *
                    flowProgress.clamp(0.0, 1.0)) -
                (highlightWidth * 1.2);

            return Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(color: color),
                Positioned(
                  left: left,
                  top: 0,
                  bottom: 0,
                  width: highlightWidth,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          highlight.withOpacity(0),
                          highlight.withOpacity(0.42),
                          highlight,
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TrackingActiveIcon extends StatelessWidget {
  const _TrackingActiveIcon({
    required this.icon,
    required this.color,
    required this.size,
    required this.progress,
  });

  final IconData icon;
  final Color color;
  final double size;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final pulse = 0.94 + (0.06 * (1 - ((progress * 2) - 1).abs()));

    return Transform.scale(
      scale: pulse,
      child: Icon(
        icon,
        color: color,
        size: size,
      ),
    );
  }
}

class _TrackingRouteSummary extends StatelessWidget {
  const _TrackingRouteSummary({
    required this.originTitle,
    required this.originSubtitle,
    required this.destinationTitle,
    required this.destinationSubtitle,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
  });

  final String originTitle;
  final String originSubtitle;
  final String destinationTitle;
  final String destinationSubtitle;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 16,
          child: Column(
            children: [
              _TrackingRouteDot(
                color: primaryColor,
              ),
              Container(
                width: 2,
                height: 28,
                margin: const EdgeInsets.symmetric(vertical: 4),
                color: primaryColor.withOpacity(0.16),
              ),
              const _TrackingRouteDot(
                color: Color(0xFFFF4061),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _TrackingAddressBlock(
                title: originTitle,
                subtitle: originSubtitle,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
              ),
              const SizedBox(height: 14),
              _TrackingAddressBlock(
                title: destinationTitle,
                subtitle: destinationSubtitle,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TrackingRouteDot extends StatelessWidget {
  const _TrackingRouteDot({
    required this.color,
  });

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );
  }
}

class _TrackingAddressBlock extends StatelessWidget {
  const _TrackingAddressBlock({
    required this.title,
    required this.subtitle,
    required this.titleColor,
    required this.secondaryColor,
  });

  final String title;
  final String subtitle;
  final Color titleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: titleColor,
            fontWeight: FontWeight.w800,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.bodySmall?.copyWith(
            color: secondaryColor,
            fontWeight: FontWeight.w600,
            height: 1.2,
          ),
        ),
      ],
    );
  }
}

class _TrackingRiderInfo extends StatelessWidget {
  const _TrackingRiderInfo({
    required this.riderLabel,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
  });

  final String riderLabel;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: secondaryColor.withOpacity(0.22),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.person_outline_rounded,
            size: 28,
            color: primaryColor,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  riderLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.star_rounded,
                      size: 15,
                      color: const Color(0xFFF9A825),
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '4.8',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        'Rider',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: secondaryColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _TrackingRiderActionButton(
            icon: Icons.chat_bubble_outline_rounded,
            tooltip: 'Message rider',
            color: primaryColor,
            onPressed: () {
              AppSnackBar.showInfo(
                context,
                message: 'Rider messaging will be available soon.',
              );
            },
          ),
          const SizedBox(width: 6),
          _TrackingRiderActionButton(
            icon: Icons.call_outlined,
            tooltip: 'Call rider',
            color: primaryColor,
            onPressed: () {
              AppSnackBar.showInfo(
                context,
                message: 'Rider call will be available soon.',
              );
            },
          ),
        ],
      ),
    );
  }
}

class _TrackingRiderActionButton extends StatelessWidget {
  const _TrackingRiderActionButton({
    required this.icon,
    required this.tooltip,
    required this.color,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(icon),
        color: color,
        iconSize: 19,
        tooltip: tooltip,
        constraints: const BoxConstraints.tightFor(
          width: 38,
          height: 38,
        ),
        padding: EdgeInsets.zero,
      ),
    );
  }
}

class _TrackingMapPreview extends StatefulWidget {
  const _TrackingMapPreview({
    required this.destinationAddress,
    required this.primaryColor,
    required this.surfaceColor,
    this.expands = false,
  });

  final String destinationAddress;
  final Color primaryColor;
  final Color surfaceColor;
  final bool expands;

  @override
  State<_TrackingMapPreview> createState() => _TrackingMapPreviewState();
}

class _TrackingMapPreviewState extends State<_TrackingMapPreview> {
  late final WebViewController _controller;
  Timer? _loadingFallbackTimer;
  String _loadedMapUrl = '';
  int _loadProgress = 0;
  bool _hasMapError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) {
              return;
            }
            setState(() {
              _loadProgress = progress;
            });
          },
          onPageStarted: (_) {
            _loadingFallbackTimer?.cancel();
            if (!mounted) {
              return;
            }
            setState(() {
              _loadProgress = 0;
              _hasMapError = false;
            });
          },
          onPageFinished: (_) {
            _loadingFallbackTimer?.cancel();
            if (!mounted) {
              return;
            }
            setState(() {
              _loadProgress = 100;
            });
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame == false || !mounted) {
              return;
            }
            setState(() {
              _hasMapError = true;
            });
          },
        ),
      );
    _loadMap();
  }

  @override
  void didUpdateWidget(covariant _TrackingMapPreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.destinationAddress.trim() !=
        widget.destinationAddress.trim()) {
      _loadMap();
    }
  }

  @override
  void dispose() {
    _loadingFallbackTimer?.cancel();
    super.dispose();
  }

  void _loadMap() {
    final nextMapUrl = _trackingMapEmbedUrl(widget.destinationAddress);
    if (_loadedMapUrl == nextMapUrl) {
      return;
    }

    _loadedMapUrl = nextMapUrl;
    if (mounted) {
      setState(() {
        _loadProgress = 0;
        _hasMapError = false;
      });
    }

    _loadingFallbackTimer?.cancel();
    _loadingFallbackTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted || _loadProgress >= 100) {
        return;
      }
      setState(() {
        _loadProgress = 100;
      });
    });

    unawaited(
      _controller.loadHtmlString(
        _trackingMapHtml(nextMapUrl),
        baseUrl: 'https://www.google.com',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mapHeight = MediaQuery.sizeOf(context).height * 0.56;

    final map = Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: widget.surfaceColor,
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: WebViewWidget(
                controller: _controller,
                gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                  Factory<OneSequenceGestureRecognizer>(
                    () => EagerGestureRecognizer(),
                  ),
                },
              ),
            ),
            if (_loadProgress < 100 && !_hasMapError)
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                child: LinearProgressIndicator(
                  minHeight: 3,
                  value: _loadProgress <= 0 ? null : _loadProgress / 100,
                  color: widget.primaryColor,
                  backgroundColor: widget.primaryColor.withOpacity(0.12),
                ),
              ),
            if (_hasMapError)
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: widget.surfaceColor.withOpacity(0.94),
                  ),
                  child: Center(
                    child: IconButton(
                      onPressed: _loadMap,
                      icon: Icon(
                        Icons.refresh_rounded,
                        color: widget.primaryColor,
                      ),
                      tooltip: 'Reload map',
                    ),
                  ),
                ),
              ),
          ],
        ),
      );

    if (widget.expands) {
      return SizedBox.expand(child: map);
    }

    return SizedBox(
      width: double.infinity,
      height: mapHeight,
      child: map,
    );
  }
}
