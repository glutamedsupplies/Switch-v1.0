import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/widgets/app_price_text.dart';

const double _kAddToCartVariantCardHeight = 146;

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
  });

  final Product product;
  final List<Product> catalogProducts;
  final ProductVariant? selectedVariant;
  final int? discountPercent;
  final bool showsTopBrand;
  final String submitButtonVerb;

  @override
  State<_AddToCartSheet> createState() => _AddToCartSheetState();
}

class _AddToCartSheetState extends State<_AddToCartSheet> {
  int _quantity = 1;
  late ProductVariant? _selectedVariant;
  late final TextEditingController _quantityController;
  late final FocusNode _quantityFocusNode;
  bool _showsVariants = true;

  @override
  void initState() {
    super.initState();
    _selectedVariant =
        widget.selectedVariant ??
        (widget.product.variants.isNotEmpty
            ? widget.product.variants.first
            : null);
    _quantityController = TextEditingController(text: '$_quantity');
    _quantityFocusNode = FocusNode();
    _quantityFocusNode.addListener(() {
      if (mounted) {
        setState(() {
          _showsVariants = !_quantityFocusNode.hasFocus;
        });
      }
      if (!_quantityFocusNode.hasFocus) {
        _commitTypedQuantity();
      }
    });
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _quantityFocusNode.dispose();
    super.dispose();
  }

  bool get _hasSalesPrice =>
      _salesPrice != null && _salesPrice! >= 0 && _salesPrice! < _originalPrice;

  double get _displayPrice => _hasSalesPrice ? _salesPrice! : _originalPrice;

  double get _originalPrice =>
      _selectedVariant?.originalPrice ?? widget.product.originalPrice;

  double? get _salesPrice =>
      _selectedVariant?.salesPrice ?? widget.product.salesPrice;

  int _resolveAvailableStock(ProductVariant? variant) {
    return resolveProductAvailableStock(
      widget.product,
      variant: variant,
      catalogProducts: widget.catalogProducts,
    );
  }

  int get _maxQuantity {
    final stock = _resolveAvailableStock(_selectedVariant);
    if (stock <= 0) {
      return 1;
    }

    return stock > 99 ? 99 : stock;
  }

  double get _quantityAdjustedPrice => _displayPrice * _quantity;

  double get _quantityAdjustedOriginalPrice => _originalPrice * _quantity;

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

  bool get _showsTopReviewsChip =>
      widget.product.rating >= 4.5 && widget.product.rating <= 5;

  void _updateQuantity(int nextQuantity) {
    final clampedQuantity = nextQuantity.clamp(1, _maxQuantity).toInt();
    if (clampedQuantity != _quantity) {
      setState(() {
        _quantity = clampedQuantity;
      });
    }
    _syncQuantityField();
  }

  void _syncQuantityField() {
    final nextText = '$_quantity';
    if (_quantityController.text == nextText) {
      return;
    }

    _quantityController.value = _quantityController.value.copyWith(
      text: nextText,
      selection: TextSelection.collapsed(offset: nextText.length),
      composing: TextRange.empty,
    );
  }

  void _commitTypedQuantity({bool unfocus = false}) {
    final parsedQuantity = int.tryParse(_quantityController.text);
    _updateQuantity(parsedQuantity ?? _quantity);
    if (unfocus) {
      _quantityFocusNode.unfocus();
    }
  }

  void _handleVariantSelected(ProductVariant variant) {
    if (_selectedVariant?.id == variant.id) {
      return;
    }

    setState(() {
      _selectedVariant = variant;
    });
  }

  Future<void> _openVariantImagePreview(ProductVariant variant) async {
    if (!_hasRequiredAddOnStock(variant)) {
      return;
    }

    final imageUrl = variant.imageUrl.trim().isEmpty
        ? widget.product.imageUrl
        : variant.imageUrl;
    final productName = widget.product.name.trim().isEmpty
        ? 'Unnamed Product'
        : widget.product.name;
    final fallbackInitial = widget.product.name.trim().isEmpty
        ? '?'
        : widget.product.name.trim()[0].toUpperCase();

    await showDialog<void>(
      context: context,
      barrierColor: Colors.black.withOpacity(0.88),
      builder: (context) {
        return _AddToCartVariantImagePreviewDialog(
          imageUrl: imageUrl,
          productName: productName,
          variantName: variant.name.trim().isEmpty ? 'Variant' : variant.name,
          primaryColor: Theme.of(context).colorScheme.primary,
          fallbackInitial: fallbackInitial,
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    final titleColor = theme.colorScheme.onSurface;
    final isDarkMode = theme.brightness == Brightness.dark;
    final filledButtonForegroundColor = isDarkMode
        ? theme.cardColor
        : Colors.white;
    final filledButtonPriceColor = isDarkMode
        ? theme.cardColor.withOpacity(0.84)
        : Colors.white.withOpacity(0.92);
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final productName = widget.product.name.trim().isEmpty
        ? 'Unnamed Product'
        : widget.product.name;
    final variantStock = _resolveAvailableStock(_selectedVariant);
    final hasStock = variantStock > 0 && _selectedVariantHasAvailableAddOns;

    return SafeArea(
      top: false,
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Container(
            constraints: BoxConstraints(maxHeight: constraints.maxHeight),
            decoration: BoxDecoration(
              color: theme.cardColor,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(8),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.14),
                  blurRadius: 28,
                  offset: const Offset(0, -10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  fit: FlexFit.loose,
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: EdgeInsets.fromLTRB(
                      12,
                      12,
                      12,
                      bottomInset > 0 ? bottomInset + 12 : 12,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            color: surfaceColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: IntrinsicHeight(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                SizedBox(
                                  width: 112,
                                  child: _AddToCartProductImage(
                                    product: widget.product,
                                    primaryColor: primaryColor,
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(8),
                                      bottomLeft: Radius.circular(8),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      14,
                                      14,
                                      14,
                                      14,
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            _AddToCartPriceText(
                                              amount: _quantityAdjustedPrice,
                                              color: primaryColor,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 30,
                                            ),
                                            if (_hasSalesPrice) ...[
                                              const SizedBox(height: 2),
                                              _AddToCartPriceText(
                                                amount:
                                                    _quantityAdjustedOriginalPrice,
                                                color: secondaryColor,
                                                fontWeight:
                                                    theme
                                                        .textTheme
                                                        .bodySmall
                                                        ?.fontWeight ??
                                                    FontWeight.w400,
                                                fontSize:
                                                    theme
                                                        .textTheme
                                                        .bodySmall
                                                        ?.fontSize ??
                                                    12,
                                                decoration:
                                                    TextDecoration.lineThrough,
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        SizedBox(
                                          width: double.infinity,
                                          child: FittedBox(
                                            alignment: Alignment.centerLeft,
                                            fit: BoxFit.scaleDown,
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                if (_discountPercent !=
                                                    null) ...[
                                                  _AddToCartChip(
                                                    icon: Icons
                                                        .local_offer_outlined,
                                                    label:
                                                        '-$_discountPercent%',
                                                    color: const Color(
                                                      0xFFC62828,
                                                    ),
                                                    backgroundColor:
                                                        const Color(0xFFD32F2F),
                                                    labelColor: Colors.white,
                                                    iconColor: Colors.white,
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 6,
                                                          vertical: 4,
                                                        ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          8,
                                                        ),
                                                    labelStyle: theme
                                                        .textTheme
                                                        .labelSmall
                                                        ?.copyWith(
                                                          color: Colors.white,
                                                          fontWeight:
                                                              FontWeight.w800,
                                                          fontSize: 9,
                                                        ),
                                                  ),
                                                ],
                                                if (widget.showsTopBrand) ...[
                                                  if (_discountPercent != null)
                                                    const SizedBox(width: 6),
                                                  _AddToCartChip(
                                                    icon: Icons
                                                        .workspace_premium_outlined,
                                                    label: 'Top Selling',
                                                    color: const Color.fromARGB(
                                                      255,
                                                      15,
                                                      194,
                                                      176,
                                                    ),
                                                    backgroundColor:
                                                        const Color.fromARGB(
                                                          255,
                                                          15,
                                                          194,
                                                          176,
                                                        ),
                                                    labelColor: Colors.white,
                                                    iconColor: Colors.white,
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 6,
                                                          vertical: 4,
                                                        ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          8,
                                                        ),
                                                    labelStyle: theme
                                                        .textTheme
                                                        .labelSmall
                                                        ?.copyWith(
                                                          color: Colors.white,
                                                          fontWeight:
                                                              FontWeight.w800,
                                                          fontSize: 9,
                                                        ),
                                                  ),
                                                ],
                                                if (_showsTopReviewsChip) ...[
                                                  if (_discountPercent !=
                                                          null ||
                                                      widget.showsTopBrand)
                                                    const SizedBox(width: 6),
                                                  _AddToCartChip(
                                                    icon: Icons
                                                        .star_outline_rounded,
                                                    label: 'Top Rating',
                                                    color: const Color(
                                                      0xFFF9A825,
                                                    ),
                                                    backgroundColor:
                                                        const Color(0xFFF9A825),
                                                    labelColor: Colors.white,
                                                    iconColor: Colors.white,
                                                    padding:
                                                        const EdgeInsets.symmetric(
                                                          horizontal: 6,
                                                          vertical: 4,
                                                        ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          8,
                                                        ),
                                                    labelStyle: theme
                                                        .textTheme
                                                        .labelSmall
                                                        ?.copyWith(
                                                          color: Colors.white,
                                                          fontWeight:
                                                              FontWeight.w800,
                                                          fontSize: 9,
                                                        ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            Icon(
                                              Icons.inventory_2_outlined,
                                              size: 15,
                                              color: hasStock
                                                  ? secondaryColor
                                                  : const Color(0xFFC62828),
                                            ),
                                            const SizedBox(width: 5),
                                            Text(
                                              hasStock
                                                  ? 'Stock: $variantStock'
                                                  : 'Sold out',
                                              style: theme.textTheme.bodySmall
                                                  ?.copyWith(
                                                    color: hasStock
                                                        ? secondaryColor
                                                        : const Color(
                                                            0xFFC62828,
                                                          ),
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                            ),
                                          ],
                                        ),
                                        if (hasStock) ...[
                                          const SizedBox(height: 6),
                                          Row(
                                            children: [
                                              Icon(
                                                Icons.local_shipping_outlined,
                                                size: 15,
                                                color: secondaryColor,
                                              ),
                                              const SizedBox(width: 5),
                                              Text(
                                                'Same Day Delivery',
                                                style: theme.textTheme.bodySmall
                                                    ?.copyWith(
                                                      color: secondaryColor,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (widget.product.variants.isNotEmpty &&
                            _showsVariants) ...[
                          const SizedBox(height: 18),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Variants',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  color: titleColor,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 10),
                              LayoutBuilder(
                                builder: (context, constraints) {
                                  const spacing = 12.0;
                                  const columns = 3;
                                  final itemWidth =
                                      (constraints.maxWidth -
                                          (spacing * (columns - 1))) /
                                      columns;
                                  final rowCount =
                                      (widget.product.variants.length / columns)
                                          .ceil();

                                  final variantGrid = Wrap(
                                    spacing: spacing,
                                    runSpacing: spacing,
                                    children: [
                                      for (final variant
                                          in widget.product.variants)
                                        Builder(
                                          builder: (context) {
                                            final variantAvailableStock =
                                                _resolveAvailableStock(variant);
                                            return SizedBox(
                                              width: itemWidth,
                                              child: _AddToCartVariantOptionChip(
                                                variant: variant,
                                                isSelected:
                                                    _selectedVariant?.id ==
                                                    variant.id,
                                                isSoldOut:
                                                    variantAvailableStock <= 0,
                                                primaryColor: primaryColor,
                                                secondaryColor: secondaryColor,
                                                fallbackImageUrl:
                                                    widget.product.imageUrl,
                                                fallbackInitial:
                                                    productName.trim().isEmpty
                                                    ? '?'
                                                    : productName
                                                          .trim()[0]
                                                          .toUpperCase(),
                                                onImageTap: () =>
                                                    _openVariantImagePreview(
                                                      variant,
                                                    ),
                                                onTap: () =>
                                                    _handleVariantSelected(
                                                      variant,
                                                    ),
                                              ),
                                            );
                                          },
                                        ),
                                    ],
                                  );

                                  if (rowCount <= 2) {
                                    return variantGrid;
                                  }

                                  return SizedBox(
                                    height:
                                        (_kAddToCartVariantCardHeight * 2) +
                                        spacing,
                                    child: SingleChildScrollView(
                                      child: variantGrid,
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 18),
                        Row(
                          children: [
                            Text(
                              'Quantity',
                              style: theme.textTheme.titleSmall?.copyWith(
                                color: titleColor,
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: surfaceColor,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _AddToCartQuantityButton(
                                    icon: Icons.remove_rounded,
                                    onTap: hasStock
                                        ? () => _updateQuantity(_quantity - 1)
                                        : null,
                                  ),
                                  SizedBox(
                                    width: 34,
                                    child: Center(
                                      child: TextField(
                                        controller: _quantityController,
                                        focusNode: _quantityFocusNode,
                                        enabled: hasStock,
                                        textAlign: TextAlign.center,
                                        keyboardType: TextInputType.number,
                                        inputFormatters: [
                                          FilteringTextInputFormatter
                                              .digitsOnly,
                                          LengthLimitingTextInputFormatter(2),
                                        ],
                                        style: theme.textTheme.titleMedium
                                            ?.copyWith(
                                              color: titleColor,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 14,
                                            ),
                                        decoration: const InputDecoration(
                                          isDense: true,
                                          border: InputBorder.none,
                                          counterText: '',
                                          contentPadding: EdgeInsets.zero,
                                        ),
                                        onTap: () {
                                          _quantityController
                                              .selection = TextSelection(
                                            baseOffset: 0,
                                            extentOffset:
                                                _quantityController.text.length,
                                          );
                                        },
                                        onChanged: (value) {
                                          if (value.isEmpty) {
                                            return;
                                          }
                                          _updateQuantity(
                                            int.tryParse(value) ?? _quantity,
                                          );
                                        },
                                        onSubmitted: (_) =>
                                            _commitTypedQuantity(unfocus: true),
                                      ),
                                    ),
                                  ),
                                  _AddToCartQuantityButton(
                                    icon: Icons.add_rounded,
                                    onTap: hasStock
                                        ? () => _updateQuantity(_quantity + 1)
                                        : null,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.of(context).maybePop(),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                            side: BorderSide(
                              color: secondaryColor.withOpacity(0.28),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            foregroundColor: titleColor,
                          ),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SizedBox(
                          height: 52,
                          child: FilledButton(
                            onPressed: hasStock
                                ? () => Navigator.of(context).pop(
                                    AddToCartSelection(
                                      quantity: _quantity,
                                      selectedVariant: _selectedVariant,
                                    ),
                                  )
                                : null,
                            style: FilledButton.styleFrom(
                              backgroundColor: primaryColor,
                              foregroundColor: filledButtonForegroundColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              textStyle: theme.textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            child: hasStock
                                ? FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          '${widget.submitButtonVerb} $_quantity Item${_quantity > 1 ? 's' : ''}',
                                          style: theme.textTheme.labelLarge
                                              ?.copyWith(
                                                color:
                                                    filledButtonForegroundColor,
                                                fontWeight: FontWeight.w800,
                                              ),
                                        ),
                                        const SizedBox(height: 1),
                                        _AddToCartPriceText(
                                          amount: _quantityAdjustedPrice,
                                          color: filledButtonPriceColor,
                                          fontWeight: FontWeight.w800,
                                          fontSize:
                                              theme
                                                  .textTheme
                                                  .titleMedium
                                                  ?.fontSize ??
                                              16,
                                          height: 1,
                                        ),
                                      ],
                                    ),
                                  )
                                : Text(
                                    'Sold out',
                                    style: theme.textTheme.labelLarge?.copyWith(
                                      color: filledButtonForegroundColor,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _AddToCartVariantOptionChip extends StatelessWidget {
  const _AddToCartVariantOptionChip({
    required this.variant,
    required this.isSelected,
    required this.isSoldOut,
    required this.primaryColor,
    required this.secondaryColor,
    required this.fallbackImageUrl,
    required this.fallbackInitial,
    required this.onImageTap,
    required this.onTap,
  });

  final ProductVariant variant;
  final bool isSelected;
  final bool isSoldOut;
  final Color primaryColor;
  final Color secondaryColor;
  final String fallbackImageUrl;
  final String fallbackInitial;
  final VoidCallback onImageTap;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final surfaceColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    return Material(
      color: surfaceColor,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          height: _kAddToCartVariantCardHeight,
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _AddToCartVariantImage(
                    imageUrl: variant.imageUrl.trim().isEmpty
                        ? fallbackImageUrl
                        : variant.imageUrl,
                    primaryColor: primaryColor,
                    fallbackInitial: fallbackInitial,
                    height: 112,
                    isSoldOut: isSoldOut,
                    onTap: isSoldOut ? null : onImageTap,
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
                    child: SizedBox(
                      width: double.infinity,
                      child: _AddToCartAutoSizeText(
                        variant.name.trim().isEmpty ? 'Variant' : variant.name,
                        minFontSize: 7,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontSize: 13,
                          color: isSelected
                              ? primaryColor
                              : theme.colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (isSelected)
                Positioned.fill(
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: primaryColor.withOpacity(0.56),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddToCartAutoSizeText extends StatelessWidget {
  const _AddToCartAutoSizeText(
    this.text, {
    required this.style,
    required this.minFontSize,
  });

  final String text;
  final TextStyle? style;
  final double minFontSize;

  @override
  Widget build(BuildContext context) {
    final baseStyle = DefaultTextStyle.of(context).style.merge(style);

    return LayoutBuilder(
      builder: (context, constraints) {
        final textDirection = Directionality.of(context);
        final textScaler = MediaQuery.textScalerOf(context);
        final baseFontSize = baseStyle.fontSize ?? 13;
        final normalizedText = text.trim();
        final normalizedLength = normalizedText.length;
        final hasMultipleWords = normalizedText.contains(' ');

        if (!hasMultipleWords && normalizedLength <= 8) {
          return Text(
            text,
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: baseStyle.copyWith(fontSize: baseFontSize),
          );
        }

        final lengthAdjustedFontSize = normalizedLength >= 20
            ? baseFontSize - 3.5
            : normalizedLength >= 14
            ? baseFontSize - 2
            : normalizedLength >= 9
            ? baseFontSize - 1
            : hasMultipleWords
            ? baseFontSize - 0.8
            : baseFontSize;
        var resolvedFontSize = lengthAdjustedFontSize;

        if (constraints.maxWidth.isFinite) {
          while (resolvedFontSize > minFontSize) {
            final painter = TextPainter(
              text: TextSpan(
                text: text,
                style: baseStyle.copyWith(fontSize: resolvedFontSize),
              ),
              maxLines: 1,
              textDirection: textDirection,
              textScaler: textScaler,
            )..layout(maxWidth: constraints.maxWidth);

            if (!painter.didExceedMaxLines &&
                painter.width <= constraints.maxWidth) {
              break;
            }

            resolvedFontSize -= 0.5;
          }
        }

        return Text(
          text,
          maxLines: 1,
          softWrap: false,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: baseStyle.copyWith(fontSize: resolvedFontSize),
        );
      },
    );
  }
}

class _AddToCartVariantImage extends StatelessWidget {
  const _AddToCartVariantImage({
    required this.imageUrl,
    required this.primaryColor,
    required this.fallbackInitial,
    required this.height,
    required this.isSoldOut,
    required this.onTap,
  });

  final String imageUrl;
  final Color primaryColor;
  final String fallbackInitial;
  final double height;
  final bool isSoldOut;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final trimmedImageUrl = imageUrl.trim();

    final imageChild = trimmedImageUrl.isEmpty
        ? _AddToCartImageFallback(
            primaryColor: primaryColor,
            initial: fallbackInitial,
          )
        : ColoredBox(
            color: Colors.white,
            child: Image.network(
              trimmedImageUrl,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return _AddToCartImageFallback(
                  primaryColor: primaryColor,
                  initial: fallbackInitial,
                );
              },
            ),
          );

    return Stack(
      children: [
        Container(
          height: height,
          width: double.infinity,
          decoration: BoxDecoration(color: primaryColor.withOpacity(0.12)),
          clipBehavior: Clip.antiAlias,
          child: isSoldOut
              ? ColorFiltered(
                  colorFilter: const ColorFilter.matrix(<double>[
                    0.2126,
                    0.7152,
                    0.0722,
                    0,
                    0,
                    0.2126,
                    0.7152,
                    0.0722,
                    0,
                    0,
                    0.2126,
                    0.7152,
                    0.0722,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                  ]),
                  child: imageChild,
                )
              : imageChild,
        ),
        if (!isSoldOut)
          Positioned(
            top: 8,
            right: 8,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onTap,
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.38),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Icon(
                    Icons.zoom_in_rounded,
                    size: 15,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        if (isSoldOut)
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(color: Colors.black.withOpacity(0.18)),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.55),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Sold out',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 10,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _AddToCartChip extends StatelessWidget {
  const _AddToCartChip({
    required this.label,
    required this.color,
    this.icon,
    this.backgroundColor,
    this.labelColor,
    this.iconColor,
    this.padding,
    this.borderRadius,
    this.labelStyle,
  });

  final IconData? icon;
  final String label;
  final Color color;
  final Color? backgroundColor;
  final Color? labelColor;
  final Color? iconColor;
  final EdgeInsetsGeometry? padding;
  final BorderRadiusGeometry? borderRadius;
  final TextStyle? labelStyle;

  @override
  Widget build(BuildContext context) {
    final resolvedBackgroundColor = backgroundColor ?? color.withOpacity(0.1);
    final resolvedLabelColor = labelColor ?? color;
    final resolvedIconColor = iconColor ?? resolvedLabelColor;
    final resolvedLabelStyle =
        (Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: resolvedLabelColor,
                  fontWeight: FontWeight.w700,
                ) ??
                TextStyle(
                  color: resolvedLabelColor,
                  fontWeight: FontWeight.w700,
                ))
            .merge(labelStyle)
            .copyWith(color: resolvedLabelColor);

    return Container(
      padding:
          padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: resolvedBackgroundColor,
        borderRadius: borderRadius ?? BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: resolvedIconColor),
            const SizedBox(width: 6),
          ],
          Text(label, style: resolvedLabelStyle),
        ],
      ),
    );
  }
}

class _AddToCartProductImage extends StatelessWidget {
  const _AddToCartProductImage({
    required this.product,
    required this.primaryColor,
    this.borderRadius,
  });

  final Product product;
  final Color primaryColor;
  final BorderRadiusGeometry? borderRadius;

  @override
  Widget build(BuildContext context) {
    final imageUrl = product.buyModalDisplayImageUrl.trim();
    final productName = product.name.trim().isEmpty
        ? '?'
        : product.name.trim()[0];

    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.circular(8),
      child: DecoratedBox(
        decoration: BoxDecoration(color: primaryColor.withOpacity(0.12)),
        child: imageUrl.isEmpty
            ? _AddToCartImageFallback(
                primaryColor: primaryColor,
                initial: productName.toUpperCase(),
              )
            : ColoredBox(
                color: Colors.white,
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return _AddToCartImageFallback(
                      primaryColor: primaryColor,
                      initial: productName.toUpperCase(),
                    );
                  },
                ),
              ),
      ),
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

class _AddToCartQuantityButton extends StatelessWidget {
  const _AddToCartQuantityButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 24,
          height: 24,
          child: Icon(
            icon,
            size: 16,
            color: onTap == null
                ? primaryColor.withOpacity(0.38)
                : primaryColor,
          ),
        ),
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
    this.height,
  });

  final double amount;
  final Color color;
  final FontWeight fontWeight;
  final double fontSize;
  final TextDecoration? decoration;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(
      amount: amount,
      color: color,
      fontWeight: fontWeight,
      fontSize: fontSize,
      decoration: decoration,
      height: height,
    );
  }
}
