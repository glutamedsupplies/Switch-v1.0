import 'dart:async';

import 'package:flutter/material.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';

class NoMoreProductsIndicator extends StatefulWidget {
  const NoMoreProductsIndicator({
    super.key,
    required this.scrollController,
    required this.overscrollSignal,
    required this.primaryColor,
    required this.secondaryColor,
  });

  final ScrollController scrollController;
  final int overscrollSignal;
  final Color primaryColor;
  final Color secondaryColor;

  @override
  State<NoMoreProductsIndicator> createState() => _NoMoreProductsIndicatorState();
}

class _NoMoreProductsIndicatorState extends State<NoMoreProductsIndicator> {
  Timer? _noMoreProductsTimer;
  bool _showNoMoreProducts = false;

  @override
  void didUpdateWidget(covariant NoMoreProductsIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (widget.overscrollSignal != oldWidget.overscrollSignal) {
      _noMoreProductsTimer?.cancel();
      setState(() {
        _showNoMoreProducts = false;
      });
      _noMoreProductsTimer = Timer(const Duration(milliseconds: 650), () {
        if (!mounted) {
          return;
        }

        setState(() {
          _showNoMoreProducts = true;
        });
      });
    }
  }

  @override
  void dispose() {
    _noMoreProductsTimer?.cancel();
    super.dispose();
  }

  void _resetIfScrolledAwayFromBottom() {
    if (!_showNoMoreProducts && _noMoreProductsTimer == null) {
      return;
    }

    _noMoreProductsTimer?.cancel();
    _noMoreProductsTimer = null;
    if (mounted) {
      setState(() {
        _showNoMoreProducts = false;
      });
    }
  }

  ScrollPosition? _readablePosition(ScrollController controller) {
    if (!controller.hasClients) {
      return null;
    }

    // AnimatedSwitcher (and similar) can briefly keep two scrollables mounted
    // against the same controller; `.position` asserts on that.
    final positions = controller.positions;
    if (positions.isEmpty) {
      return null;
    }
    for (final position in positions) {
      if (position.hasContentDimensions) {
        return position;
      }
    }
    return positions.last;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.scrollController,
      builder: (context, child) {
        final position = _readablePosition(widget.scrollController);
        if (position == null || !position.hasContentDimensions) {
          return const SizedBox.shrink();
        }

        final remainingDistance = (position.maxScrollExtent - position.pixels)
            .clamp(0.0, double.infinity);
        final isNearBottom = remainingDistance <= 20;

        if (!isNearBottom) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              _resetIfScrolledAwayFromBottom();
            }
          });
        }

        return Center(
          child: AnimatedSwitcher(
            duration: appMotionFrames(13),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeOutCubic,
            child: _showNoMoreProducts && isNearBottom
                ? ConstrainedBox(
                    key: const ValueKey('no-more-products'),
                    constraints: const BoxConstraints(maxWidth: 280),
                    child: Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 1,
                            color: widget.secondaryColor.withOpacity(0.22),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'No more products',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: widget.secondaryColor,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            height: 1,
                            color: widget.secondaryColor.withOpacity(0.22),
                          ),
                        ),
                      ],
                    ),
                  )
                : const SizedBox.shrink(
                    key: ValueKey('no-bottom-status'),
                  ),
          ),
        );
      },
    );
  }
}
