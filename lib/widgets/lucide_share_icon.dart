import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

const String _kLucideShare2Svg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<circle cx="18" cy="5" r="3"/>'
    '<circle cx="6" cy="12" r="3"/>'
    '<circle cx="18" cy="19" r="3"/>'
    '<line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>'
    '<line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>'
    '</svg>';

/// App-wide share icon (Lucide `share-2`).
///
/// Falls back to the ambient [IconTheme] size and color so it can replace an
/// [Icon] inside buttons that style their icons.
class LucideShareIcon extends StatelessWidget {
  const LucideShareIcon({super.key, this.size, this.color});

  final double? size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final iconTheme = IconTheme.of(context);
    final resolvedSize = size ?? iconTheme.size ?? 24;
    final resolvedColor =
        color ?? iconTheme.color ?? Theme.of(context).colorScheme.onSurface;
    return SvgPicture.string(
      _kLucideShare2Svg,
      width: resolvedSize,
      height: resolvedSize,
      colorFilter: ColorFilter.mode(resolvedColor, BlendMode.srcIn),
    );
  }
}
