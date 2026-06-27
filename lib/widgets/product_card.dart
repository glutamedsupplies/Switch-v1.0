import 'package:flutter/material.dart';
import 'package:gms_shopping/models/product.dart';
import 'package:gms_shopping/utils/currency_format.dart';
import 'package:gms_shopping/utils/session_image_cache.dart';
import 'package:gms_shopping/widgets/bouncing_dots_loader.dart';
import 'package:gms_shopping/widgets/product_company_identity.dart';
import 'package:gms_shopping/widgets/product_card_tap_lift.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.p,
    this.onTap,
    this.showCompanyIdentity = true,
    this.showFavoriteButton = false,
    this.isFavorite = false,
    this.onFavoriteToggle,
    this.onTapWithHero,
    this.showTopSellerBadge = false,
  });

  final Product p;
  final VoidCallback? onTap;
  final bool showCompanyIdentity;
  final bool showFavoriteButton;
  final bool isFavorite;
  final VoidCallback? onFavoriteToggle;
  final ProductCardHeroTapCallback? onTapWithHero;
  final bool showTopSellerBadge;

  static const double _borderRadius = 8;
  static const double _imageHeight = 180;
  static const Duration _newProductPostDuration = Duration(days: 30);

  bool get _hasSalesPrice => p.salesPrice != null && p.salesPrice! >= 0;

  bool get _showsOriginalPrice =>
      _hasSalesPrice && p.salesPrice! < p.originalPrice;

  double get _displayPrice => _hasSalesPrice ? p.salesPrice! : p.originalPrice;

  int? get _discountPercentValue => _discountPercent(p);

  bool get _showsTopRatedBadge => p.rating >= 4.5 && p.rating <= 5;

  bool get _showsFavoriteButton => showFavoriteButton || onFavoriteToggle != null;

  bool get _showsNewBadge {
    if (p.createdAt.millisecondsSinceEpoch <= 0) {
      return false;
    }

    final cutoffDate = DateTime.now().subtract(_newProductPostDuration);
    return !p.createdAt.isBefore(cutoffDate);
  }

  TextStyle _inlineBadgeTextStyle(BuildContext context) {
    return Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
          height: 1,
        ) ??
        const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0,
          height: 1,
        );
  }

  Widget _buildInlineBadge(
    BuildContext context, {
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: _inlineBadgeTextStyle(context),
      ),
    );
  }

  Widget _buildInlineIconBadge({
    required IconData icon,
    required Color color,
    required String tooltip,
  }) {
    return Tooltip(
      message: tooltip,
      child: Container(
        width: 15,
        height: 15,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 11,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildSecondaryRowBadge(
    BuildContext context, {
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2.3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: _inlineBadgeTextStyle(context).copyWith(fontSize: 9.4),
      ),
    );
  }

  Widget _buildSecondaryRowIconBadge({
    required IconData icon,
    required Color color,
    required String tooltip,
  }) {
    return Tooltip(
      message: tooltip,
      child: Container(
        width: 14,
        height: 14,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 9,
          color: Colors.white,
        ),
      ),
    );
  }

  double _measureInlineBadgeWidth(
    BuildContext context, {
    required String label,
  }) {
    final labelStyle = _inlineBadgeTextStyle(context);
    final painter = TextPainter(
      text: TextSpan(text: label, style: labelStyle),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();

    return painter.width + 12;
  }

  bool _shouldUseCompactTopBadges(
    BuildContext context, {
    required TextStyle style,
    required double maxWidth,
  }) {
    if ((!showTopSellerBadge &&
            !_showsTopRatedBadge &&
            _discountPercentValue == null) ||
        !maxWidth.isFinite ||
        maxWidth <= 0) {
      return false;
    }

    final painter = TextPainter(
      text: TextSpan(text: p.name, style: style),
      maxLines: 2,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout(maxWidth: maxWidth);

    if (painter.didExceedMaxLines) {
      return true;
    }

    final lineMetrics = painter.computeLineMetrics();
    if (lineMetrics.isEmpty) {
      return false;
    }

    final badgeWidths = <double>[
      if (_discountPercentValue != null)
        _measureInlineBadgeWidth(context, label: '-$_discountPercentValue%'),
      if (showTopSellerBadge) 15,
      if (_showsTopRatedBadge) 15,
    ];
    var usedLineCount = lineMetrics.length;
    var currentLineWidth = lineMetrics.last.width;

    for (final badgeWidth in badgeWidths) {
      if (currentLineWidth + badgeWidth <= maxWidth) {
        currentLineWidth += badgeWidth;
        continue;
      }

      if (usedLineCount >= 2 || badgeWidth > maxWidth) {
        return true;
      }

      usedLineCount++;
      currentLineWidth = badgeWidth;
    }

    return false;
  }

  Widget _buildProductMedia({
    required Color primaryColor,
  }) {
    return Stack(
      children: [
        _ProductCardImage(
          product: p,
          primaryColor: primaryColor,
          height: _imageHeight,
        ),
        if (_showsNewBadge)
          Positioned(
            top: 0,
            right: 0,
            child: const _NewBadge(),
          ),
      ],
    );
  }

  Widget _buildNameAndBadges(
    BuildContext context, {
    required Color titleColor,
    required Color primaryColor,
    required double maxWidth,
  }) {
    final productNameStyle = Theme.of(context).textTheme.titleSmall?.copyWith(
          fontSize: 15,
          color: titleColor,
          fontWeight: FontWeight.w500,
          letterSpacing: 0,
          height: 1,
        );
    final useCompactTopBadges = _shouldUseCompactTopBadges(
      context,
      style: productNameStyle ?? const TextStyle(),
      maxWidth: maxWidth,
    );
    final nameBadgeSpans = <InlineSpan>[
      if (_discountPercentValue != null && !useCompactTopBadges)
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Padding(
            padding: const EdgeInsets.only(left: 2),
            child: _buildInlineBadge(
              context,
              label: '-$_discountPercentValue%',
              color: const Color(0xFFD32F2F),
            ),
          ),
        ),
      if (showTopSellerBadge && !useCompactTopBadges)
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Padding(
            padding: const EdgeInsets.only(left: 2),
            child: _buildInlineIconBadge(
              icon: Icons.emoji_events_rounded,
              color: const Color(0xFF00897B),
              tooltip: 'Top Seller',
            ),
          ),
        ),
      if (_showsTopRatedBadge && !useCompactTopBadges)
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Padding(
            padding: const EdgeInsets.only(left: 2),
            child: _buildInlineIconBadge(
              icon: Icons.workspace_premium_rounded,
              color: const Color(0xFFF9A825),
              tooltip: 'Top Rating',
            ),
          ),
        ),
    ];
    final productNameWidget = nameBadgeSpans.isNotEmpty
        ? Text.rich(
            TextSpan(
              style: productNameStyle,
              children: [
                TextSpan(text: p.name),
                ...nameBadgeSpans,
              ],
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          )
        : Text(
            p.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: productNameStyle,
          );
    final showsCompactBadgeRow = useCompactTopBadges &&
        (showTopSellerBadge ||
            _discountPercentValue != null ||
            _showsTopRatedBadge);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        productNameWidget,
        if (showsCompactBadgeRow) ...[
          const SizedBox(height: 4),
          Wrap(
            spacing: 1,
            runSpacing: 1,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (_discountPercentValue != null)
                _buildSecondaryRowBadge(
                  context,
                  label: '-$_discountPercentValue%',
                  color: const Color(0xFFD32F2F),
                ),
              if (showTopSellerBadge)
                _buildSecondaryRowIconBadge(
                  icon: Icons.emoji_events_rounded,
                  color: const Color(0xFF00897B),
                  tooltip: 'Top Seller',
                ),
              if (_showsTopRatedBadge)
                _buildSecondaryRowIconBadge(
                  icon: Icons.workspace_premium_rounded,
                  color: const Color(0xFFF9A825),
                  tooltip: 'Top Rating',
                ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildProductDetails(
    BuildContext context, {
    required Color titleColor,
    required Color secondaryColor,
    required Color primaryColor,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final reservedFavoriteWidth = _showsFavoriteButton ? 36.0 : 0.0;
        final availableNameWidth = constraints.maxWidth - reservedFavoriteWidth;
        final nameAndBadges = _buildNameAndBadges(
          context,
          titleColor: titleColor,
          primaryColor: primaryColor,
          maxWidth: availableNameWidth,
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              p.category,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: primaryColor,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0,
                    height: 1.15,
                  ),
            ),
            if (_showsFavoriteButton)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: nameAndBadges),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 28,
                    height: 28,
                    child: IconButton(
                      onPressed: onFavoriteToggle,
                      tooltip:
                          isFavorite ? 'Remove from favorites' : 'Add to favorites',
                      padding: EdgeInsets.zero,
                      splashRadius: 18,
                      icon: Icon(
                        isFavorite
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        size: 20,
                        color: isFavorite
                            ? const Color(0xFFD32F2F)
                            : secondaryColor,
                      ),
                    ),
                  ),
                ],
              )
            else
              nameAndBadges,
            const SizedBox(height: 2),
            Wrap(
              spacing: 8,
              runSpacing: 2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                _PriceText(
                  amount: _displayPrice,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 16,
                        color: primaryColor,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0,
                      ),
                ),
                if (_showsOriginalPrice)
                  _PriceText(
                    amount: p.originalPrice,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontSize: 11,
                          color: secondaryColor.withOpacity(0.72),
                          decoration: TextDecoration.lineThrough,
                          letterSpacing: 0,
                        ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            _ProductStatsRow(
              product: p,
              iconColor: const Color(0xFFF9A825),
              textStyle: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: secondaryColor,
                    fontWeight: FontWeight.w200,
                    letterSpacing: 0,
                    height: 1,
                  ),
            ),
            if (showCompanyIdentity && p.hasCompanyIdentity) ...[
              const SizedBox(height: 4),
              Transform.translate(
                offset: const Offset(0, -2),
                child: ProductCompanyIdentity(
                  product: p,
                  textColor: secondaryColor,
                  fallbackColor: primaryColor,
                  avatarSize: 18,
                  fontSize: 11,
                ),
              ),
            ],
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final titleColor =
        Theme.of(context).textTheme.titleSmall?.color ?? colorScheme.onSurface;
    final secondaryColor = Theme.of(context).textTheme.bodySmall?.color ??
        colorScheme.onSurface.withOpacity(0.68);
    final primaryColor = colorScheme.primary;
    final surfaceColor = colorScheme.surface;

    return ProductCardTapLift(
      onTap: onTap,
      onTapWithHero: onTapWithHero,
      builder: (context, liftValue, handleTap, heroTag) {
        return Material(
          color: surfaceColor,
          borderRadius: BorderRadius.circular(_borderRadius),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: handleTap,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ProductCardTapLift.liftImage(
                  liftValue: liftValue,
                  child: Hero(
                    tag: heroTag,
                    child: _buildProductMedia(primaryColor: primaryColor),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
                  child: _buildProductDetails(
                    context,
                    titleColor: titleColor,
                    secondaryColor: secondaryColor,
                    primaryColor: primaryColor,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ProductCardImage extends StatelessWidget {
  const _ProductCardImage({
    required this.product,
    required this.primaryColor,
    required this.height,
  });

  final Product product;
  final Color primaryColor;
  final double height;

  String get _initial {
    if (product.name.trim().isEmpty) {
      return '?';
    }

    return product.name.trim()[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final displayImageUrl = product.cardDisplayImageUrl;
    final hasImage = displayImageUrl.isNotEmpty;

    return SizedBox(
      height: height,
      width: double.infinity,
      child: hasImage
          ? Image.network(
              displayImageUrl,
              fit: BoxFit.cover,
              alignment: product.hasSavedCardImageCrop
                  ? Alignment.center
                  : Alignment(
                      product.cardImageAlignmentX,
                      product.cardImageAlignmentY,
                    ),
              errorBuilder: (context, error, stackTrace) {
                return _ProductImageFallback(
                  initial: _initial,
                  primaryColor: primaryColor,
                );
              },
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) {
                  SessionImageCache.markLoaded(displayImageUrl);
                  return child;
                }

                if (SessionImageCache.wasLoaded(displayImageUrl)) {
                  return child;
                }

                return Center(
                  child: BouncingDotsLoader(
                    activeColor: primaryColor,
                    inactiveColor: primaryColor.withOpacity(0.24),
                  ),
                );
              },
            )
          : _ProductImageFallback(
              initial: _initial,
              primaryColor: primaryColor,
            ),
    );
  }
}

class _ProductImageFallback extends StatelessWidget {
  const _ProductImageFallback({
    required this.initial,
    required this.primaryColor,
  });

  final String initial;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        initial,
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: primaryColor,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _NewBadge extends StatelessWidget {
  const _NewBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: const BoxDecoration(
        color: Color(0xFF1976D2),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(8),
        ),
      ),
      child: Text(
        'New',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _ProductStatsRow extends StatelessWidget {
  const _ProductStatsRow({
    required this.product,
    required this.iconColor,
    this.textStyle,
  });

  final Product product;
  final Color iconColor;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    final commentIconColor =
        textStyle?.color ?? Theme.of(context).colorScheme.primary;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.star_rounded,
          size: 16,
          color: iconColor,
        ),
        const SizedBox(width: 4),
        Text(
          _formatProductRating(product.rating),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: textStyle,
        ),
        const SizedBox(width: 10),
        Icon(
          Icons.mode_comment_outlined,
          size: 15,
          color: commentIconColor,
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            _formatProductCommentCount(product.commentCount),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textStyle,
          ),
        ),
      ],
    );
  }
}

class _PriceText extends StatelessWidget {
  const _PriceText({
    required this.amount,
    this.style,
  });

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final resolvedStyle =
        DefaultTextStyle.of(context).style.merge(style).copyWith(
              letterSpacing: 0,
              height: 1,
            );
    final symbolFontSize = (resolvedStyle.fontSize ?? 14) * 0.75;

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '\u20B1',
            style: resolvedStyle.copyWith(fontSize: symbolFontSize),
          ),
          TextSpan(
            text: formatCurrencyAmount(amount),
            style: resolvedStyle,
          ),
        ],
      ),
    );
  }
}

int? _discountPercent(Product product) {
  final salesPrice = product.salesPrice;
  if (salesPrice == null || product.originalPrice <= 0) {
    return null;
  }

  final discountAmount = product.originalPrice - salesPrice;
  if (discountAmount <= 0) {
    return null;
  }

  final percent = ((discountAmount / product.originalPrice) * 100).round();
  if (percent <= 0) {
    return null;
  }

  return percent;
}

String _formatProductRating(double rating) => rating.toStringAsFixed(1);

String _formatProductCommentCount(int commentCount) {
  final normalizedCount = commentCount < 0 ? 0 : commentCount;
  final label = normalizedCount == 1 ? 'comment' : 'comments';
  return '${_formatCompactCount(normalizedCount)} $label';
}

String _formatCompactCount(int count) {
  if (count < 1000) {
    return count.toString();
  }

  final thousands = count ~/ 1000;
  final suffix = count % 1000 == 0 ? 'K' : 'K+';
  return '$thousands$suffix';
}
