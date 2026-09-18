import 'dart:io';

import 'package:image/image.dart' as img;

void main() {
  final src = img.decodeImage(
    File('assets/images/switch-logo.png').readAsBytesSync(),
  );
  if (src == null) {
    throw StateError('Could not decode switch-logo.png');
  }

  // Treat near-black pixels as transparent, keep teal logo.
  final cutout = img.Image(
    width: src.width,
    height: src.height,
    numChannels: 4,
  );
  for (final p in src) {
    final isBlackBg = p.r < 40 && p.g < 40 && p.b < 40;
    cutout.setPixelRgba(
      p.x,
      p.y,
      p.r.toInt(),
      p.g.toInt(),
      p.b.toInt(),
      isBlackBg ? 0 : 255,
    );
  }

  // Square white canvas for launcher icons.
  const size = 1024;
  final canvas = img.Image(width: size, height: size, numChannels: 4);
  img.fill(canvas, color: img.ColorRgba8(255, 255, 255, 255));

  // Fit logo with padding so adaptive icon safe zone looks good.
  final target = (size * 0.72).round();
  final resized = img.copyResize(
    cutout,
    width: target,
    height: target,
    interpolation: img.Interpolation.average,
  );
  final ox = ((size - resized.width) / 2).round();
  final oy = ((size - resized.height) / 2).round();
  img.compositeImage(canvas, resized, dstX: ox, dstY: oy);

  File('assets/images/switch-logo-launcher.png')
    ..createSync(recursive: true)
    ..writeAsBytesSync(img.encodePng(canvas));

  // Foreground with transparent bg (for adaptive icon).
  final fg = img.Image(width: size, height: size, numChannels: 4);
  img.fill(fg, color: img.ColorRgba8(0, 0, 0, 0));
  img.compositeImage(fg, resized, dstX: ox, dstY: oy);
  File('assets/images/switch-logo-launcher-fg.png')
      .writeAsBytesSync(img.encodePng(fg));

  stdout.writeln('Wrote launcher assets ${size}x$size');
}
