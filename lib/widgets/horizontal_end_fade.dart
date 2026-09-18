import 'package:flutter/material.dart';

/// Gives horizontally scrollable content the same trailing-edge cue used by
/// the search voucher carousel.
class HorizontalEndFade extends StatelessWidget {
  const HorizontalEndFade({
    super.key,
    required this.child,
    this.fadeStart = 0.88,
  }) : assert(fadeStart >= 0 && fadeStart <= 1);

  final Widget child;
  final double fadeStart;

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      blendMode: BlendMode.dstIn,
      shaderCallback: (bounds) => LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        colors: const [Colors.white, Colors.white, Colors.transparent],
        stops: [0, fadeStart, 1],
      ).createShader(bounds),
      child: child,
    );
  }
}
