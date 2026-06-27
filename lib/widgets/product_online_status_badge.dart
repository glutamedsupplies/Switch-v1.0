import 'package:flutter/material.dart';

bool isProductOnlineNow([DateTime? now]) {
  final localNow = (now ?? DateTime.now()).toLocal();
  final totalMinutes = (localNow.hour * 60) + localNow.minute;
  const onlineStartMinutes = 9 * 60;
  const onlineEndMinutes = (18 * 60);

  return totalMinutes >= onlineStartMinutes &&
      totalMinutes <= onlineEndMinutes;
}

class ProductOnlineStatusBadge extends StatelessWidget {
  const ProductOnlineStatusBadge({
    super.key,
    this.compact = false,
    this.size,
  });

  final bool compact;
  final double? size;

  @override
  Widget build(BuildContext context) {
    final isOnline = isProductOnlineNow();
    final dotColor = isOnline
        ? const Color(0xFF4CAF50)
        : const Color(0xFFCFD8DC);
    final dotSize = size ?? (compact ? 14.0 : 16.0);

    return IgnorePointer(
      child: Container(
        width: dotSize,
        height: dotSize,
        decoration: BoxDecoration(
          color: dotColor,
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}
