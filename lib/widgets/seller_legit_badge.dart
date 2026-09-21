import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/widgets/horizontal_end_fade.dart';

/// Blue verified seal for paid-plan sellers (original products).
/// Sized to never shrink away when placed beside an ellipsized company name.
class SellerLegitBadge extends StatelessWidget {
  const SellerLegitBadge({
    super.key,
    this.compact = false,
  });

  final bool compact;

  double get size => compact ? 17.0 : 21.0;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Verified seller for original products',
      child: Semantics(
        label: 'Verified seller',
        child: SizedBox.square(
          dimension: size,
          child: Image.asset(
            'assets/images/verified-seller-3d-badge.png',
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
          ),
        ),
      ),
    );
  }
}

/// Company name + optional verified badge + optional "Ordered before".
/// Badge stays immediately beside the name. Long names swipe with a right fade;
/// badge and Ordered before stay fixed (not scrolled away).
class SellerCompanyNameWithLegitBadge extends StatelessWidget {
  const SellerCompanyNameWithLegitBadge({
    super.key,
    required this.name,
    required this.showLegitBadge,
    required this.style,
    this.maxLines = 1,
    this.compactBadge = false,
    this.showOrderedBefore = false,
  });

  final String name;
  final bool showLegitBadge;
  final TextStyle? style;
  final int maxLines;
  final bool compactBadge;
  final bool showOrderedBefore;

  static const double _badgeGap = 5;
  static const double _orderedGap = 6;
  static const double _orderedApproxWidth = 98;

  @override
  Widget build(BuildContext context) {
    final label = name.trim().isEmpty ? 'Company' : name.trim();
    final resolvedStyle = style;
    final badge = showLegitBadge
        ? SellerLegitBadge(compact: compactBadge)
        : null;
    final badgeWidth = badge == null ? 0.0 : _badgeGap + badge.size;
    final orderedWidth = showOrderedBefore ? _orderedGap + _orderedApproxWidth : 0.0;

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        final painter = TextPainter(
          text: TextSpan(text: label, style: resolvedStyle),
          maxLines: maxLines,
          textDirection: Directionality.of(context),
        )..layout(maxWidth: double.infinity);
        final textWidth = painter.width;

        final hasBoundedWidth = maxWidth.isFinite && maxWidth > 0;
        final nameMaxWidth = hasBoundedWidth
            ? (maxWidth - badgeWidth - orderedWidth).clamp(0.0, maxWidth)
            : textWidth;
        final overflows = hasBoundedWidth && textWidth > nameMaxWidth + 0.5;

        final nameText = Text(
          label,
          maxLines: maxLines,
          softWrap: false,
          overflow: TextOverflow.visible,
          style: resolvedStyle,
        );

        final Widget nameSlot;
        if (overflows) {
          nameSlot = SizedBox(
            width: nameMaxWidth,
            child: HorizontalEndFade(
              fadeStart: 0.82,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.only(right: 10),
                child: nameText,
              ),
            ),
          );
        } else {
          nameSlot = nameText;
        }

        return Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            nameSlot,
            if (badge != null) ...[
              const SizedBox(width: _badgeGap),
              badge,
            ],
            if (showOrderedBefore) ...[
              const SizedBox(width: _orderedGap),
              _OrderedBeforeIndicator(
                color: resolvedStyle?.color ??
                    Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.62),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _OrderedBeforeIndicator extends StatelessWidget {
  const _OrderedBeforeIndicator({required this.color});

  final Color color;

  static const String _iconSvg = '''
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
  <path d="M3 3v5h5"/>
  <path d="M12 7v5l4 2"/>
</svg>
''';

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Semantics(
        label: 'Ordered before',
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SvgPicture.string(
              _iconSvg,
              width: 13,
              height: 13,
              colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
            ),
            const SizedBox(width: 3),
            Text(
              'Ordered before',
              maxLines: 1,
              softWrap: false,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    height: 1,
                    letterSpacing: -0.15,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
