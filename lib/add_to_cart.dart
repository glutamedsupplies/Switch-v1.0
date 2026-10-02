import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/theme/product_layout.dart';
import 'package:switch_app/widgets/app_price_text.dart';

const Color kSwitchDarkSurfaceLight = Color(0xFF1C1C21);
const Color kSwitchDarkSurfaceDark = Color(0xFF0F0F13);
const Color _kSwitchLightGraySurface = Color(0xFFF8F9FB);
const double _kArcHeight = 26;
const Color _kSavedAmountColor = Color(0xFF2E7D32);
const double _kVolumeDragStep = 16;

const String _kStockBoxSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>'
    '<path d="m3.3 7 8.7 5 8.7-5"/>'
    '<path d="M12 22V12"/>'
    '</svg>';

const String _kAddToCartSvg =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M16 5h6"/><path d="M19 2v6"/>'
    '<path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/>'
    '<path d="M4.564 5H12"/>'
    '<path d="M6.25 14h12.712a2 2 0 0 0 1.991-1.57l.172-1.041"/>'
    '<circle cx="18" cy="20" r="2"/>'
    '<circle cx="8" cy="20" r="2"/>'
    '</svg>';

const List<double> _kGrayscaleMatrix = <double>[
  0.2126, 0.7152, 0.0722, 0, 0, //
  0.2126, 0.7152, 0.0722, 0, 0, //
  0.2126, 0.7152, 0.0722, 0, 0, //
  0, 0, 0, 1, 0, //
];

class AddToCartSelection {
  const AddToCartSelection({
    required this.quantity,
    required this.selectedVariant,
  });

  final int quantity;
  final ProductVariant? selectedVariant;
}

Future<AddToCartSelection?> showAddToCartModal(
  BuildContext context, {
  required Product product,
  List<Product> catalogProducts = const <Product>[],
  ProductVariant? selectedVariant,
  int? discountPercent,
  bool showsTopBrand = false,
  String submitButtonVerb = 'Add',
  Map<String, double> flashPricesByVariantId = const {},
}) {
  return showModalBottomSheet<AddToCartSelection>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: Colors.transparent,
    builder: (context) => _AddToCartSheet(
      product: product,
      catalogProducts: catalogProducts,
      selectedVariant: selectedVariant,
      discountPercent: discountPercent,
      showsTopBrand: showsTopBrand,
      submitButtonVerb: submitButtonVerb,
      flashPricesByVariantId: flashPricesByVariantId,
    ),
  );
}

class _AddToCartSheet extends StatefulWidget {
  const _AddToCartSheet({
    required this.product,
    required this.catalogProducts,
    required this.selectedVariant,
    required this.discountPercent,
    required this.showsTopBrand,
    required this.submitButtonVerb,
    required this.flashPricesByVariantId,
  });

  final Product product;
  final List<Product> catalogProducts;
  final ProductVariant? selectedVariant;
  final int? discountPercent;
  final bool showsTopBrand;
  final String submitButtonVerb;

  /// Live campaign price per variant id ('' for listings without variants).
  final Map<String, double> flashPricesByVariantId;

  @override
  State<_AddToCartSheet> createState() => _AddToCartSheetState();
}

class _AddToCartSheetState extends State<_AddToCartSheet> {
  int _quantity = 1;
  late ProductVariant? _selectedVariant;

  @override
  void initState() {
    super.initState();
    _selectedVariant =
        widget.selectedVariant ??
        (widget.product.variants.isNotEmpty
            ? widget.product.variants.first
            : null);
  }

  bool get _hasSalesPrice =>
      _salesPrice != null && _salesPrice! >= 0 && _salesPrice! < _originalPrice;

  double get _displayPrice => _hasSalesPrice ? _salesPrice! : _originalPrice;

  double get _originalPrice =>
      _selectedVariant?.originalPrice ?? widget.product.originalPrice;

  double? get _flashPrice {
    final price = widget.flashPricesByVariantId[_selectedVariant?.id ?? ''];
    return price != null && price >= 0 && price < _originalPrice ? price : null;
  }

  double? get _salesPrice =>
      _flashPrice ?? _selectedVariant?.salesPrice ?? widget.product.salesPrice;

  int _resolveAvailableStock(ProductVariant? variant) {
    return resolveProductAvailableStock(
      widget.product,
      variant: variant,
      catalogProducts: widget.catalogProducts,
    );
  }

  int _maxQuantityFor(ProductVariant? variant) {
    final stock = _resolveAvailableStock(variant);
    if (stock <= 0) {
      return 1;
    }

    return stock > 99 ? 99 : stock;
  }

  int get _maxQuantity => _maxQuantityFor(_selectedVariant);

  double get _quantityAdjustedPrice => _displayPrice * _quantity;

  bool get _hasInventoryContext => widget.catalogProducts.isNotEmpty;

  bool _hasRequiredAddOnStock(ProductVariant? variant) {
    if (variant == null) {
      return true;
    }

    if (variant.addOns.isEmpty || !_hasInventoryContext) {
      return true;
    }

    return _resolveAvailableStock(variant) > 0;
  }

  bool get _selectedVariantHasAvailableAddOns =>
      _hasRequiredAddOnStock(_selectedVariant);

  int? get _discountPercent {
    final salesPrice = _salesPrice;
    if (salesPrice == null || _originalPrice <= 0) {
      return null;
    }

    final discountAmount = _originalPrice - salesPrice;
    if (discountAmount <= 0) {
      return null;
    }

    final percent = ((discountAmount / _originalPrice) * 100).round();
    return percent > 0 ? percent : null;
  }

  String get _productName => widget.product.name.trim().isEmpty
      ? 'Unnamed Product'
      : widget.product.name.trim();

  String get _fallbackInitial => widget.product.name.trim().isEmpty
      ? '?'
      : widget.product.name.trim()[0].toUpperCase();

  String get _productImageUrl {
    final buyModalImage = widget.product.buyModalDisplayImageUrl.trim();
    return buyModalImage.isNotEmpty
        ? buyModalImage
        : widget.product.imageUrl.trim();
  }

  String _variantImageUrl(ProductVariant? variant) {
    final variantImage = variant?.imageUrl.trim() ?? '';
    return variantImage.isNotEmpty ? variantImage : _productImageUrl;
  }

  String _variantLabel(ProductVariant variant) =>
      variant.name.trim().isEmpty ? 'Variant' : variant.name.trim();

  String get _submitLabel {
    final verb = widget.submitButtonVerb.trim();
    if (verb.toLowerCase() == 'add') {
      return 'Add to Cart';
    }
    return '$verb Now';
  }

  bool get _isAddToCartAction =>
      widget.submitButtonVerb.trim().toLowerCase() == 'add';

  void _updateQuantity(int nextQuantity) {
    final clampedQuantity = nextQuantity.clamp(1, _maxQuantity).toInt();
    if (clampedQuantity == _quantity) {
      return;
    }

    HapticFeedback.selectionClick();
    setState(() {
      _quantity = clampedQuantity;
    });
  }

  void _handleVariantSelected(ProductVariant variant) {
    if (_selectedVariant?.id == variant.id) {
      return;
    }

    HapticFeedback.lightImpact();
    setState(() {
      _selectedVariant = variant;
      _quantity = _quantity.clamp(1, _maxQuantityFor(variant)).toInt();
    });
  }

  Future<void> _openImagePreview() async {
    final variant = _selectedVariant;
    await showDialog<void>(
      context: context,
      barrierColor: Colors.black.withOpacity(0.88),
      builder: (context) {
        return _AddToCartVariantImagePreviewDialog(
          imageUrl: _variantImageUrl(variant),
          productName: _productName,
          variantName: variant == null ? '' : _variantLabel(variant),
          primaryColor: Theme.of(context).colorScheme.primary,
          fallbackInitial: _fallbackInitial,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final isDarkMode = theme.brightness == Brightness.dark;
    final sheetSurface = isDarkMode
        ? kSwitchDarkSurfaceDark
        : _kSwitchLightGraySurface;
    final variantStock = _resolveAvailableStock(_selectedVariant);
    final hasStock = variantStock > 0 && _selectedVariantHasAvailableAddOns;
    final selectedVariantIsSoldOut = _selectedVariant != null && !hasStock;

    return SafeArea(
      top: false,
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Container(
            constraints: BoxConstraints(maxHeight: constraints.maxHeight),
            decoration: BoxDecoration(
              color: sheetSurface,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(28),
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  fit: FlexFit.loose,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const SizedBox(height: 10),
                        Center(
                          child: Container(
                            width: 44,
                            height: 4,
                            decoration: BoxDecoration(
                              color: isDarkMode
                                  ? Colors.white.withOpacity(0.28)
                                  : const Color(0xFF0F172A).withOpacity(0.16),
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                        ),
                        _buildHeader(theme, primaryColor),
                        _buildHeroRow(
                          primaryColor: primaryColor,
                          hasStock: hasStock,
                          isSoldOut: selectedVariantIsSoldOut,
                        ),
                        if (widget.product.variants.isNotEmpty)
                          _buildVariantSelector(theme, primaryColor),
                        const SizedBox(height: 24),
                        _buildArcDivider(theme),
                      ],
                    ),
                  ),
                ),
                _buildBottomBar(
                  theme,
                  primaryColor: primaryColor,
                  isDarkMode: isDarkMode,
                  hasStock: hasStock,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, Color primaryColor) {
    final isDarkMode = theme.brightness == Brightness.dark;
    final foregroundColor = isDarkMode ? Colors.white : const Color(0xFF111827);
    final selectedVariant = _selectedVariant;
    final subtitle = selectedVariant != null
        ? _variantLabel(selectedVariant)
        : widget.product.category.trim();

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        kProductContentSidePadding,
        16,
        kProductContentSidePadding,
        4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _productName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.headlineSmall?.copyWith(
              color: foregroundColor,
              fontWeight: FontWeight.w700,
              fontSize: 26,
              height: 1.15,
            ),
          ),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: 4),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: Text(
                subtitle,
                key: ValueKey<String>(subtitle),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: foregroundColor.withOpacity(0.68),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 10,
            runSpacing: 6,
            children: [
              _AddToCartPriceText(
                amount: _displayPrice,
                color: foregroundColor,
                fontWeight: FontWeight.w700,
                fontSize: 38,
              ),
              if (_hasSalesPrice)
                _AddToCartPriceText(
                  amount: _originalPrice,
                  color: foregroundColor.withOpacity(0.48),
                  fontWeight: FontWeight.w500,
                  fontSize: 15,
                  decoration: TextDecoration.lineThrough,
                ),
              if (_discountPercent != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD32F2F),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '-$_discountPercent%',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeroRow({
    required Color primaryColor,
    required bool hasStock,
    required bool isSoldOut,
  }) {
    final imageUrl = _variantImageUrl(_selectedVariant);

    return Padding(
      padding: const EdgeInsets.fromLTRB(kProductContentSidePadding, 8, 16, 8),
      child: SizedBox(
        height: 236,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _AddToCartVolumeQuantity(
                  quantity: _quantity,
                  maxQuantity: _maxQuantity,
                  enabled: hasStock,
                  isDarkMode: Theme.of(context).brightness == Brightness.dark,
                  accentColor: primaryColor,
                  onChanged: _updateQuantity,
                ),
                const SizedBox(height: 8),
                _buildStockLabel(Theme.of(context), hasStock: hasStock),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final size = constraints.biggest.shortestSide.clamp(
                    120.0,
                    210.0,
                  );
                  return Center(
                    child: GestureDetector(
                      onTap: _openImagePreview,
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 460),
                        switchInCurve: Curves.easeOutBack,
                        switchOutCurve: Curves.easeIn,
                        transitionBuilder: (child, animation) {
                          return FadeTransition(
                            opacity: animation,
                            child: ScaleTransition(
                              scale: Tween<double>(
                                begin: 0.78,
                                end: 1,
                              ).animate(animation),
                              child: RotationTransition(
                                turns: Tween<double>(
                                  begin: -0.06,
                                  end: 0,
                                ).animate(animation),
                                child: child,
                              ),
                            ),
                          );
                        },
                        child: _AddToCartHeroImage(
                          key: ValueKey<String>(
                            '${_selectedVariant?.id ?? ''}|$imageUrl',
                          ),
                          imageUrl: imageUrl,
                          size: size,
                          primaryColor: primaryColor,
                          fallbackInitial: _fallbackInitial,
                          isSoldOut: isSoldOut,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVariantSelector(ThemeData theme, Color primaryColor) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const horizontalPadding = 16.0;
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(
            horizontalPadding,
            6,
            horizontalPadding,
            0,
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minWidth: constraints.maxWidth - (horizontalPadding * 2),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final variant in widget.product.variants)
                  SwitchVariantBubble(
                    label: _variantLabel(variant),
                    imageUrl: _variantImageUrl(variant),
                    isSelected: _selectedVariant?.id == variant.id,
                    isSoldOut:
                        _resolveAvailableStock(variant) <= 0 ||
                        !_hasRequiredAddOnStock(variant),
                    accentColor: primaryColor,
                    fallbackInitial: _fallbackInitial,
                    onTap: () => _handleVariantSelected(variant),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStockLabel(ThemeData theme, {required bool hasStock}) {
    final titleColor = theme.colorScheme.onSurface;
    final secondaryColor = theme.colorScheme.onSurface.withOpacity(0.62);
    const soldOutColor = Color(0xFFC62828);

    return SwitchMetaItem(
      leading: _AddToCartLucideIcon(
        svg: _kStockBoxSvg,
        size: 14,
        color: hasStock ? secondaryColor : soldOutColor,
      ),
      iconColor: hasStock ? secondaryColor : soldOutColor,
      label: hasStock
          ? 'Stock: ${_resolveAvailableStock(_selectedVariant)}'
          : 'Sold out',
      color: hasStock ? titleColor : soldOutColor,
    );
  }

  Widget _buildArcDivider(ThemeData theme) {
    return ClipPath(
      clipper: const SwitchArcClipper(arcHeight: _kArcHeight),
      child: Container(height: _kArcHeight + 10, color: theme.cardColor),
    );
  }

  Widget _buildBottomBar(
    ThemeData theme, {
    required Color primaryColor,
    required bool isDarkMode,
    required bool hasStock,
  }) {
    final onPrimary = theme.colorScheme.onPrimary;
    final onSurface = theme.colorScheme.onSurface;
    final disabledForeground = onSurface.withOpacity(0.45);
    const buttonHeight = 48.0;

    return Container(
      color: theme.cardColor,
      padding: const EdgeInsets.fromLTRB(
        kProductContentSidePadding,
        10,
        kProductContentSidePadding,
        16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                '$_quantity Item${_quantity > 1 ? 's' : ''} Selected',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: onSurface.withOpacity(0.62),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      _AddToCartPriceText(
                        amount: _quantityAdjustedPrice,
                        color: primaryColor,
                        fontWeight: FontWeight.w800,
                        fontSize: 20,
                      ),
                      if (_hasSalesPrice) ...[
                        const SizedBox(width: 6),
                        _AddToCartPriceText(
                          amount: _originalPrice * _quantity,
                          color: onSurface.withOpacity(0.48),
                          fontWeight: FontWeight.w500,
                          fontSize: 13,
                          decoration: TextDecoration.lineThrough,
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: _kSavedAmountColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Saved: ',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: _kSavedAmountColor,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                              _AddToCartPriceText(
                                amount:
                                    (_originalPrice - _displayPrice) *
                                    _quantity,
                                color: _kSavedAmountColor,
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: buttonHeight,
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      shape: const StadiumBorder(),
                      side: BorderSide(color: onSurface.withOpacity(0.18)),
                      foregroundColor: onSurface,
                      textStyle: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Material(
                  color: hasStock ? primaryColor : onSurface.withOpacity(0.12),
                  shape: const StadiumBorder(),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: hasStock
                        ? () => Navigator.of(context).pop(
                            AddToCartSelection(
                              quantity: _quantity,
                              selectedVariant: _selectedVariant,
                            ),
                          )
                        : null,
                    child: SizedBox(
                      height: buttonHeight,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (!hasStock)
                                Icon(
                                  Icons.block_rounded,
                                  size: 20,
                                  color: disabledForeground,
                                )
                              else if (_isAddToCartAction)
                                _AddToCartLucideIcon(
                                  svg: _kAddToCartSvg,
                                  size: 20,
                                  color: onPrimary,
                                )
                              else
                                Icon(
                                  Icons.shopping_bag_outlined,
                                  size: 20,
                                  color: onPrimary,
                                ),
                              const SizedBox(width: 6),
                              Text(
                                hasStock ? _submitLabel : 'Sold out',
                                style: theme.textTheme.labelLarge?.copyWith(
                                  color: hasStock
                                      ? onPrimary
                                      : disabledForeground,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Vertical "volume" style quantity control: tap +/- or drag up/down.
class _AddToCartVolumeQuantity extends StatefulWidget {
  const _AddToCartVolumeQuantity({
    required this.quantity,
    required this.maxQuantity,
    required this.enabled,
    required this.isDarkMode,
    required this.accentColor,
    required this.onChanged,
  });

  final int quantity;
  final int maxQuantity;
  final bool enabled;
  final bool isDarkMode;
  final Color accentColor;
  final ValueChanged<int> onChanged;

  @override
  State<_AddToCartVolumeQuantity> createState() =>
      _AddToCartVolumeQuantityState();
}

class _AddToCartVolumeQuantityState extends State<_AddToCartVolumeQuantity> {
  double _dragAccumulator = 0;
  int _dragQuantity = 1;

  void _handleDragStart(DragStartDetails details) {
    _dragAccumulator = 0;
    _dragQuantity = widget.quantity;
  }

  void _handleDragUpdate(DragUpdateDetails details) {
    _dragAccumulator -= details.delta.dy;
    final steps = (_dragAccumulator / _kVolumeDragStep).truncate();
    if (steps == 0) {
      return;
    }

    _dragAccumulator -= steps * _kVolumeDragStep;
    final next = (_dragQuantity + steps).clamp(1, widget.maxQuantity).toInt();
    if (next != _dragQuantity) {
      _dragQuantity = next;
      widget.onChanged(next);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final foregroundColor = widget.isDarkMode
        ? Colors.white
        : const Color(0xFF111827);
    final enabled = widget.enabled;
    final fill = enabled && widget.maxQuantity > 0
        ? (widget.quantity / widget.maxQuantity).clamp(0.0, 1.0)
        : 0.0;
    final canDecrease = enabled && widget.quantity > 1;
    final canIncrease = enabled && widget.quantity < widget.maxQuantity;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragStart: enabled ? _handleDragStart : null,
      onVerticalDragUpdate: enabled ? _handleDragUpdate : null,
      child: Container(
        width: 64,
        height: 204,
        decoration: BoxDecoration(
          color: widget.isDarkMode
              ? Colors.white.withOpacity(0.08)
              : Colors.white.withOpacity(0.9),
          borderRadius: BorderRadius.circular(999),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            Positioned.fill(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: AnimatedFractionallySizedBox(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOutCubic,
                  widthFactor: 1,
                  heightFactor: fill,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          widget.accentColor.withOpacity(0.55),
                          widget.accentColor.withOpacity(0.18),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _AddToCartVolumeButton(
                    icon: Icons.add_rounded,
                    backgroundColor: widget.accentColor,
                    iconColor: theme.colorScheme.onPrimary,
                    onTap: canIncrease
                        ? () => widget.onChanged(widget.quantity + 1)
                        : null,
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 160),
                        transitionBuilder: (child, animation) =>
                            ScaleTransition(scale: animation, child: child),
                        child: Text(
                          widget.quantity.toString().padLeft(2, '0'),
                          key: ValueKey<int>(widget.quantity),
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: enabled
                                ? foregroundColor
                                : foregroundColor.withOpacity(0.4),
                            fontWeight: FontWeight.w800,
                            fontSize: 20,
                          ),
                        ),
                      ),
                      Text(
                        'QTY',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: foregroundColor.withOpacity(0.5),
                          fontWeight: FontWeight.w700,
                          fontSize: 9,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                  _AddToCartVolumeButton(
                    icon: Icons.remove_rounded,
                    backgroundColor: Colors.white,
                    iconColor: kSwitchDarkSurfaceLight,
                    onTap: canDecrease
                        ? () => widget.onChanged(widget.quantity - 1)
                        : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddToCartVolumeButton extends StatelessWidget {
  const _AddToCartVolumeButton({
    required this.icon,
    required this.backgroundColor,
    required this.iconColor,
    required this.onTap,
  });

  final IconData icon;
  final Color backgroundColor;
  final Color iconColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isEnabled = onTap != null;
    return Material(
      color: isEnabled ? backgroundColor : backgroundColor.withOpacity(0.3),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(
            icon,
            size: 22,
            color: isEnabled ? iconColor : iconColor.withOpacity(0.5),
          ),
        ),
      ),
    );
  }
}

class _AddToCartHeroImage extends StatelessWidget {
  const _AddToCartHeroImage({
    super.key,
    required this.imageUrl,
    required this.size,
    required this.primaryColor,
    required this.fallbackInitial,
    required this.isSoldOut,
  });

  final String imageUrl;
  final double size;
  final Color primaryColor;
  final String fallbackInitial;
  final bool isSoldOut;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
            ),
            clipBehavior: Clip.antiAlias,
            child: _AddToCartNetworkImage(
              imageUrl: imageUrl,
              primaryColor: primaryColor,
              fallbackInitial: fallbackInitial,
              grayscale: isSoldOut,
            ),
          ),
          if (isSoldOut)
            Positioned.fill(
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'Sold out',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Circular variant picker item; the selected item lifts up.
class SwitchVariantBubble extends StatelessWidget {
  const SwitchVariantBubble({
    super.key,
    required this.label,
    required this.imageUrl,
    required this.isSelected,
    required this.isSoldOut,
    required this.accentColor,
    required this.fallbackInitial,
    required this.onTap,
  });

  final String label;
  final String imageUrl;
  final bool isSelected;
  final bool isSoldOut;
  final Color accentColor;
  final String fallbackInitial;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDarkMode = theme.brightness == Brightness.dark;
    final foregroundColor = isDarkMode ? Colors.white : const Color(0xFF111827);
    final bubbleSize = isSelected ? 70.0 : 52.0;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedPadding(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.fromLTRB(8, isSelected ? 0 : 18, 8, 0),
        child: Opacity(
          opacity: isSoldOut && !isSelected ? 0.5 : 1,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                width: bubbleSize,
                height: bubbleSize,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: accentColor.withValues(
                        alpha: isSelected ? 0.32 : 0.14,
                      ),
                      blurRadius: isSelected ? 14 : 8,
                      spreadRadius: isSelected ? 1 : 0,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: _AddToCartNetworkImage(
                  imageUrl: imageUrl,
                  primaryColor: accentColor,
                  fallbackInitial: fallbackInitial,
                  grayscale: isSoldOut,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: 78,
                child: Text(
                  isSoldOut ? '$label · Sold out' : label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: isSelected
                        ? foregroundColor
                        : foregroundColor.withOpacity(0.68),
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              AnimatedContainer(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                width: isSelected ? 24 : 0,
                height: 4,
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddToCartLucideIcon extends StatelessWidget {
  const _AddToCartLucideIcon({
    required this.svg,
    required this.size,
    required this.color,
  });

  final String svg;
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      svg,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
    );
  }
}

/// Icon + label pair used in the Switch dark-header / arc-section pattern.
class SwitchMetaItem extends StatelessWidget {
  const SwitchMetaItem({
    super.key,
    this.icon,
    this.leading,
    required this.iconColor,
    required this.label,
    required this.color,
  }) : assert(icon != null || leading != null);

  final IconData? icon;
  final Widget? leading;
  final Color iconColor;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 160),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          leading ?? Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: color,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Solid stadium badge used in the Switch dark-header / arc-section pattern.
class SwitchPillBadge extends StatelessWidget {
  const SwitchPillBadge({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

/// Convex arc top edge that separates the dark header from the light body.
class SwitchArcClipper extends CustomClipper<Path> {
  const SwitchArcClipper({required this.arcHeight});

  final double arcHeight;

  @override
  Path getClip(Size size) {
    return Path()
      ..moveTo(0, arcHeight)
      ..quadraticBezierTo(size.width / 2, -arcHeight, size.width, arcHeight)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
  }

  @override
  bool shouldReclip(covariant SwitchArcClipper oldClipper) =>
      oldClipper.arcHeight != arcHeight;
}

class _AddToCartNetworkImage extends StatelessWidget {
  const _AddToCartNetworkImage({
    required this.imageUrl,
    required this.primaryColor,
    required this.fallbackInitial,
    this.grayscale = false,
  });

  final String imageUrl;
  final Color primaryColor;
  final String fallbackInitial;
  final bool grayscale;

  @override
  Widget build(BuildContext context) {
    final trimmedImageUrl = imageUrl.trim();
    final fallback = _AddToCartImageFallback(
      primaryColor: primaryColor,
      initial: fallbackInitial,
    );
    final Widget image = trimmedImageUrl.isEmpty
        ? fallback
        : Image.network(
            trimmedImageUrl,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
            errorBuilder: (context, error, stackTrace) => fallback,
          );

    if (!grayscale) {
      return image;
    }

    return ColorFiltered(
      colorFilter: const ColorFilter.matrix(_kGrayscaleMatrix),
      child: image,
    );
  }
}

class _AddToCartImageFallback extends StatelessWidget {
  const _AddToCartImageFallback({
    required this.primaryColor,
    required this.initial,
  });

  final Color primaryColor;
  final String initial;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            primaryColor.withOpacity(0.24),
            primaryColor.withOpacity(0.08),
          ],
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: primaryColor,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _AddToCartVariantImagePreviewDialog extends StatelessWidget {
  const _AddToCartVariantImagePreviewDialog({
    required this.imageUrl,
    required this.productName,
    required this.variantName,
    required this.primaryColor,
    required this.fallbackInitial,
  });

  final String imageUrl;
  final String productName;
  final String variantName;
  final Color primaryColor;
  final String fallbackInitial;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog.fullscreen(
      backgroundColor: Colors.black.withOpacity(0.94),
      child: Stack(
        children: [
          Positioned.fill(
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 4,
              child: Center(
                child: imageUrl.trim().isEmpty
                    ? _AddToCartImageFallback(
                        primaryColor: primaryColor,
                        initial: fallbackInitial,
                      )
                    : ColoredBox(
                        color: Colors.white,
                        child: Image.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return _AddToCartImageFallback(
                              primaryColor: primaryColor,
                              initial: fallbackInitial,
                            );
                          },
                        ),
                      ),
              ),
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      tooltip: 'Close',
                      icon: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                      ),
                    ),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            productName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (variantName.isNotEmpty)
                            Text(
                              variantName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: Colors.white.withOpacity(0.78),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                child: Text(
                  'Pinch to zoom',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.white.withOpacity(0.78),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddToCartPriceText extends StatelessWidget {
  const _AddToCartPriceText({
    required this.amount,
    required this.color,
    required this.fontWeight,
    required this.fontSize,
    this.decoration,
  });

  final double amount;
  final Color color;
  final FontWeight fontWeight;
  final double fontSize;
  final TextDecoration? decoration;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(
      amount: amount,
      color: color,
      fontWeight: fontWeight,
      fontSize: fontSize,
      decoration: decoration,
    );
  }
}
