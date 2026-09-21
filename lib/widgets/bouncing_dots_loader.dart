import 'package:flutter/material.dart';
import 'package:switch_app/utils/motion_60fps.dart';

class BouncingDotsLoader extends StatefulWidget {
  const BouncingDotsLoader({
    super.key,
    required this.activeColor,
    required this.inactiveColor,
    this.dotSize = 6,
    this.dotSpacing = 3,
    this.bounceHeight = 3,
  });

  final Color activeColor;
  final Color inactiveColor;
  final double dotSize;
  final double dotSpacing;
  final double bounceHeight;

  @override
  State<BouncingDotsLoader> createState() => _BouncingDotsLoaderState();
}

class _BouncingDotsLoaderState extends State<BouncingDotsLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: appMotionFrames(54),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double _dotEmphasis(int index) {
    final phaseShift = index * 0.16;
    final rawValue = (_controller.value - phaseShift) % 1.0;
    final mirrored = 1 - ((rawValue - 0.5).abs() * 2);
    return Curves.easeInOut.transform(mirrored.clamp(0.0, 1.0));
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final emphasis = _dotEmphasis(index);
            final dotColor = Color.lerp(
              widget.inactiveColor,
              widget.activeColor,
              emphasis,
            );

            return Padding(
              padding: EdgeInsets.symmetric(horizontal: widget.dotSpacing),
              child: Transform.translate(
                offset: Offset(0, -widget.bounceHeight * emphasis),
                child: Container(
                  width: widget.dotSize,
                  height: widget.dotSize,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
