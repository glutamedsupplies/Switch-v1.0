import 'package:flutter/material.dart';

typedef ProductCardTapLiftBuilder = Widget Function(
  BuildContext context,
  double liftValue,
  VoidCallback? onTap,
  Object heroTag,
);

typedef ProductCardHeroTapCallback = void Function(Object heroTag);

class ProductCardTapLift extends StatefulWidget {
  const ProductCardTapLift({
    super.key,
    required this.builder,
    this.onTap,
    this.onTapWithHero,
    this.liftOffset = 14,
  });

  final ProductCardTapLiftBuilder builder;
  final VoidCallback? onTap;
  final ProductCardHeroTapCallback? onTapWithHero;
  final double liftOffset;

  @override
  State<ProductCardTapLift> createState() => _ProductCardTapLiftState();

  static Widget liftImage({
    required double liftValue,
    required Widget child,
    double liftOffset = 14,
  }) {
    return child;
  }
}

class _ProductCardTapLiftState extends State<ProductCardTapLift> {
  late final Object _heroTag = Object();
  bool _isOpening = false;

  Future<void> _handleTap() async {
    final onTap = widget.onTap;
    final onTapWithHero = widget.onTapWithHero;
    if ((onTap == null && onTapWithHero == null) || _isOpening) {
      return;
    }

    _isOpening = true;
    try {
      if (onTapWithHero != null) {
        onTapWithHero(_heroTag);
      } else {
        onTap?.call();
      }
      await Future<void>.delayed(Duration.zero);
    } finally {
      _isOpening = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.builder(
      context,
      0,
      widget.onTap == null && widget.onTapWithHero == null ? null : _handleTap,
      _heroTag,
    );
  }
}
