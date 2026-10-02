import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/painting.dart';

/// Luminance above which dark foregrounds read better than white ones.
const double kLightBackdropLuminance = 0.42;

final Map<String, double> _luminanceCache = <String, double>{};

/// Average relative luminance (0 = black, 1 = white) of [region] inside a
/// [boxSize] box that paints [provider] with [BoxFit.cover].
///
/// Transparent pixels are treated as white because product media sits on a
/// white box. Returns null when the image can't be resolved.
Future<double?> sampleCoverImageLuminance({
  required ImageProvider provider,
  required String cacheKey,
  required Size boxSize,
  required Rect region,
  Duration timeout = const Duration(seconds: 8),
}) async {
  if (boxSize.isEmpty || region.isEmpty) {
    return null;
  }
  final key =
      '$cacheKey|${boxSize.width.round()}x${boxSize.height.round()}'
      '|${region.left.round()},${region.top.round()},'
      '${region.width.round()},${region.height.round()}';
  final cached = _luminanceCache[key];
  if (cached != null) {
    return cached;
  }

  final image = await _resolveImage(provider, timeout);
  if (image == null) {
    return null;
  }
  try {
    final luminance = await _averageCoverLuminance(image, boxSize, region);
    if (luminance != null) {
      _luminanceCache[key] = luminance;
    }
    return luminance;
  } catch (_) {
    return null;
  } finally {
    image.dispose();
  }
}

Future<ui.Image?> _resolveImage(ImageProvider provider, Duration timeout) {
  final completer = Completer<ui.Image?>();
  final stream = provider.resolve(ImageConfiguration.empty);

  void finish(ui.Image? image) {
    if (completer.isCompleted) {
      image?.dispose();
      return;
    }
    completer.complete(image);
  }

  final listener = ImageStreamListener(
    (info, _) {
      finish(info.image.clone());
      info.dispose();
    },
    onError: (_, _) => finish(null),
  );
  stream.addListener(listener);

  return completer.future
      .timeout(timeout, onTimeout: () => null)
      .whenComplete(() => stream.removeListener(listener));
}

Future<double?> _averageCoverLuminance(
  ui.Image image,
  Size boxSize,
  Rect region,
) async {
  final imageWidth = image.width.toDouble();
  final imageHeight = image.height.toDouble();
  if (imageWidth <= 0 || imageHeight <= 0) {
    return null;
  }

  final scale = math.max(
    boxSize.width / imageWidth,
    boxSize.height / imageHeight,
  );
  final visibleLeft = (imageWidth - boxSize.width / scale) / 2;
  final visibleTop = (imageHeight - boxSize.height / scale) / 2;
  final source = Rect.fromLTWH(
    visibleLeft + region.left / scale,
    visibleTop + region.top / scale,
    region.width / scale,
    region.height / scale,
  ).intersect(Rect.fromLTWH(0, 0, imageWidth, imageHeight));
  if (source.isEmpty) {
    return null;
  }

  const sampleWidth = 24;
  const sampleHeight = 6;
  final recorder = ui.PictureRecorder();
  Canvas(recorder).drawImageRect(
    image,
    source,
    const Rect.fromLTWH(0, 0, sampleWidth + 0.0, sampleHeight + 0.0),
    Paint()..filterQuality = FilterQuality.medium,
  );
  final picture = recorder.endRecording();
  final thumbnail = await picture.toImage(sampleWidth, sampleHeight);
  picture.dispose();
  final bytes = await thumbnail.toByteData(format: ui.ImageByteFormat.rawRgba);
  thumbnail.dispose();
  if (bytes == null || bytes.lengthInBytes < 4) {
    return null;
  }

  var total = 0.0;
  var count = 0;
  for (var offset = 0; offset + 3 < bytes.lengthInBytes; offset += 4) {
    final alpha = bytes.getUint8(offset + 3) / 255;
    int overWhite(int channel) =>
        (channel * alpha + 255 * (1 - alpha)).round().clamp(0, 255);
    total += Color.fromARGB(
      255,
      overWhite(bytes.getUint8(offset)),
      overWhite(bytes.getUint8(offset + 1)),
      overWhite(bytes.getUint8(offset + 2)),
    ).computeLuminance();
    count++;
  }
  return count == 0 ? null : total / count;
}
