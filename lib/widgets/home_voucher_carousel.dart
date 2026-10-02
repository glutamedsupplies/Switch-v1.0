import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/models/buyer_platform_summary.dart';
import 'package:switch_app/services/platform_repository.dart';
import 'package:switch_app/services/vouchers_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';

class HomeVoucherCarousel extends StatefulWidget {
  const HomeVoucherCarousel({
    super.key,
    required this.platformId,
    required this.backgroundColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
    this.sellerAdminId = '',
    this.title = 'Vouchers',
    this.includePlatformVouchers = false,
    this.productId = '',
    this.categoryIds = const <String>[],
    this.businessTypeIds = const <String>[],
    this.brandIds = const <String>[],
    this.variantIds = const <String>[],
    this.horizontalPadding = 14,
    this.contentTopPadding = 4,
  });

  final String platformId;
  final Color backgroundColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;
  final String sellerAdminId;
  final String title;
  final bool includePlatformVouchers;
  final String productId;
  final List<String> categoryIds;
  final List<String> businessTypeIds;
  final List<String> brandIds;
  final List<String> variantIds;
  final double horizontalPadding;
  final double contentTopPadding;

  @override
  State<HomeVoucherCarousel> createState() => _HomeVoucherCarouselState();
}

class _HomeVoucherCarouselState extends State<HomeVoucherCarousel> {
  late Future<_HomeVoucherCarouselData> _contentFuture;

  @override
  void initState() {
    super.initState();
    _contentFuture = _loadContent();
  }

  @override
  void didUpdateWidget(covariant HomeVoucherCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.platformId.trim().toLowerCase() !=
            widget.platformId.trim().toLowerCase() ||
        oldWidget.sellerAdminId.trim().toLowerCase() !=
            widget.sellerAdminId.trim().toLowerCase() ||
        oldWidget.includePlatformVouchers != widget.includePlatformVouchers ||
        _listingScopeFingerprint(oldWidget) !=
            _listingScopeFingerprint(widget)) {
      _contentFuture = _loadContent();
    }
  }

  String _listingScopeFingerprint(HomeVoucherCarousel value) {
    String listKey(List<String> values) =>
        values.map((item) => item.trim().toLowerCase()).join('|');
    return <String>[
      value.productId.trim().toLowerCase(),
      listKey(value.categoryIds),
      listKey(value.businessTypeIds),
      listKey(value.brandIds),
      listKey(value.variantIds),
    ].join('::');
  }

  Future<_HomeVoucherCarouselData> _loadContent() async {
    final sellerScope = widget.sellerAdminId.trim().toLowerCase();
    final vouchersRequest = fetchBuyerVouchers(
      platformId: widget.platformId,
      sellerAdminId: widget.includePlatformVouchers ? '' : sellerScope,
    );
    final platformsRequest = createPlatformRepository().fetchPlatforms();
    final vouchers = await vouchersRequest;
    List<BuyerPlatformSummary> platforms = const <BuyerPlatformSummary>[];
    try {
      platforms = await platformsRequest;
    } catch (_) {
      // Built-in platform artwork remains available while offline.
    }
    final available = vouchers
        .where(
          (voucher) {
            final voucherSeller = voucher.sellerAdminId.trim().toLowerCase();
            final sellerMatches = sellerScope.isEmpty
                ? voucherSeller.isEmpty
                : voucherSeller == sellerScope ||
                      (widget.includePlatformVouchers && voucherSeller.isEmpty);
            final listingMatches = widget.productId.trim().isEmpty ||
                voucher.appliesToListing(
                  productId: widget.productId,
                  sellerAdminId: sellerScope,
                  categoryIds: widget.categoryIds,
                  businessTypeIds: widget.businessTypeIds,
                  brandIds: widget.brandIds,
                  variantIds: widget.variantIds,
                );
            return voucher.isActive &&
                voucher.code.isNotEmpty &&
                voucher.appliesToPlatform(widget.platformId) &&
                sellerMatches &&
                listingMatches;
          },
        )
        .toList(growable: false);
    available.sort((left, right) {
      final leftExpiry = left.expiresAt;
      final rightExpiry = right.expiresAt;
      if (leftExpiry == null && rightExpiry == null) return 0;
      if (leftExpiry == null) return 1;
      if (rightExpiry == null) return -1;
      return leftExpiry.compareTo(rightExpiry);
    });
    return _HomeVoucherCarouselData(
      vouchers: available,
      platforms: <String, BuyerPlatformSummary>{
        for (final platform in platforms)
          platform.id.trim().toLowerCase(): platform,
      },
    );
  }

  Future<void> _copyCode(BuyerVoucherItem voucher) async {
    await Clipboard.setData(ClipboardData(text: voucher.code));
    if (!mounted) return;
    AppSnackBar.showSuccess(
      context,
      message: '${voucher.code} copied. Use it at checkout.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_HomeVoucherCarouselData>(
      future: _contentFuture,
      builder: (context, snapshot) {
        final isLoading =
            snapshot.connectionState == ConnectionState.waiting &&
            !snapshot.hasData;
        return MinimumSkeletonReveal(
          switchKey: _contentFuture,
          ready: !isLoading,
          minimumDuration: const Duration(milliseconds: 600),
          skeleton: HomeVoucherCarouselSkeleton(
            backgroundColor: widget.backgroundColor,
          ),
          child: isLoading
              ? const SizedBox.shrink()
              : _buildContent(context, snapshot.data),
        );
      },
    );
  }

  Widget _buildContent(BuildContext context, _HomeVoucherCarouselData? data) {
    final vouchers = data?.vouchers ?? const <BuyerVoucherItem>[];
    if (vouchers.isEmpty) return const SizedBox.shrink();

    return Material(
      color: widget.backgroundColor,
      child: Padding(
        padding: EdgeInsets.fromLTRB(0, widget.contentTopPadding, 0, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(
                widget.horizontalPadding,
                0,
                widget.horizontalPadding,
                10,
              ),
              child: Text(
                widget.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: widget.titleColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 17,
                  height: 1.1,
                ),
              ),
            ),
            LayoutBuilder(
              builder: (context, constraints) {
                final leftPadding = widget.horizontalPadding;
                const itemGap = 10.0;
                final cardWidth =
                    (constraints.maxWidth - leftPadding - (itemGap * 2)) / 2.5;
                final safeCardWidth = cardWidth.clamp(96.0, 220.0).toDouble();
                final cardHeight = safeCardWidth * 1.28;
                return SizedBox(
                  height: cardHeight + 8,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      ListView.separated(
                        padding: EdgeInsets.fromLTRB(
                          widget.horizontalPadding,
                          2,
                          widget.horizontalPadding + 14,
                          6,
                        ),
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        itemCount: vouchers.length,
                        separatorBuilder: (_, _) =>
                            const SizedBox(width: itemGap),
                        itemBuilder: (context, index) {
                          final voucher = vouchers[index];
                          final markPlatformId = _voucherMarkPlatformId(
                            voucher,
                            widget.platformId,
                          );
                          return SizedBox(
                            width: safeCardWidth,
                            height: cardHeight,
                            child: _HomeVoucherMiniCard(
                              voucher: voucher,
                              markPlatformId: markPlatformId,
                              platform: data?.platforms[markPlatformId],
                              fallbackColor: widget.primaryColor,
                              onTap: () => _copyCode(voucher),
                            ),
                          );
                        },
                      ),
                      Positioned(
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: 34,
                        child: IgnorePointer(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                                colors: [
                                  widget.backgroundColor.withValues(alpha: 0),
                                  widget.backgroundColor,
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeVoucherCarouselData {
  const _HomeVoucherCarouselData({
    required this.vouchers,
    required this.platforms,
  });

  final List<BuyerVoucherItem> vouchers;
  final Map<String, BuyerPlatformSummary> platforms;
}

class HomeVoucherCarouselSkeleton extends StatelessWidget {
  const HomeVoucherCarouselSkeleton({
    super.key,
    this.backgroundColor = Colors.transparent,
  });

  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: backgroundColor,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 4, 0, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: SkeletonBox(width: 96, height: 16, borderRadius: 6),
            ),
            LayoutBuilder(
              builder: (context, constraints) {
                const leftPadding = 14.0;
                const itemGap = 10.0;
                final cardWidth =
                    ((constraints.maxWidth - leftPadding - (itemGap * 2)) / 2.5)
                        .clamp(96.0, 220.0)
                        .toDouble();
                final cardHeight = cardWidth * 1.28;
                return SizedBox(
                  height: cardHeight + 8,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(14, 2, 22, 6),
                    scrollDirection: Axis.horizontal,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: 4,
                    separatorBuilder: (_, _) => const SizedBox(width: itemGap),
                    itemBuilder: (_, _) => SkeletonBox(
                      width: cardWidth,
                      height: cardHeight,
                      borderRadius: 22,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeVoucherMiniCard extends StatelessWidget {
  const _HomeVoucherMiniCard({
    required this.voucher,
    required this.markPlatformId,
    required this.platform,
    required this.fallbackColor,
    required this.onTap,
  });

  final BuyerVoucherItem voucher;
  final String markPlatformId;
  final BuyerPlatformSummary? platform;
  final Color fallbackColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cardColor = _parseVoucherColor(voucher.cardColor, fallbackColor);
    final inkColor = _cardInk(cardColor);
    final offer = _voucherOffer(voucher);
    final isSwitchVoucher = voucher.sellerAdminId.trim().isEmpty;
    final brand = voucher.companyName.trim().isNotEmpty
        ? voucher.companyName.trim()
        : isSwitchVoucher
        ? 'Switch'
        : voucher.badge.trim().isNotEmpty
        ? voucher.badge.trim()
        : 'Store';
    final topColor = Color.alphaBlend(
      Colors.white.withValues(alpha: 0.20),
      cardColor,
    );
    final bottomColor = Color.alphaBlend(
      Colors.black.withValues(alpha: 0.14),
      cardColor,
    );

    return Semantics(
      button: true,
      label: 'Copy voucher code ${voucher.code}',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          customBorder: const _HomeVoucherTicketBorder(),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned.fill(
                child: IgnorePointer(
                  child: CustomPaint(
                    painter: _HomeVoucherTicketShadowPainter(
                      color: Colors.black.withValues(alpha: 0.18),
                    ),
                  ),
                ),
              ),
              Positioned.fill(
                child: PhysicalShape(
                  clipper: const _HomeVoucherTicketClipper(),
                  clipBehavior: Clip.antiAlias,
                  color: cardColor,
                  elevation: 0,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [topColor, cardColor, bottomColor],
                        stops: const [0, 0.42, 1],
                      ),
                    ),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final width = constraints.maxWidth;
                        final height = constraints.maxHeight;
                        final cutY = height * 0.66;
                        final logoSize = (width * 0.29)
                            .clamp(30.0, 46.0)
                            .toDouble();
                        return Stack(
                          children: [
                            Positioned.fill(
                              child: Center(
                                child: _VoucherPlatformWatermark(
                                  platformId: markPlatformId,
                                  platform: platform,
                                  color: inkColor,
                                  size: width * 0.78,
                                ),
                              ),
                            ),
                            Positioned(
                              left: 10,
                              right: 10,
                              top: height * 0.075,
                              child: Text(
                                brand,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: inkColor,
                                  fontSize: (width * 0.09)
                                      .clamp(10.0, 14.0)
                                      .toDouble(),
                                  fontWeight: FontWeight.w500,
                                  height: 1,
                                ),
                              ),
                            ),
                            Positioned(
                              left: 8,
                              right: 8,
                              top: height * 0.22,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Text(
                                      offer.amount,
                                      maxLines: 1,
                                      style: TextStyle(
                                        color: inkColor,
                                        fontSize: (width * 0.31)
                                            .clamp(28.0, 46.0)
                                            .toDouble(),
                                        fontWeight: FontWeight.w500,
                                        height: 0.92,
                                        letterSpacing: -1,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    offer.unit,
                                    maxLines: 1,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: inkColor,
                                      fontSize: (width * 0.17)
                                          .clamp(15.0, 27.0)
                                          .toDouble(),
                                      fontWeight: FontWeight.w200,
                                      height: 0.95,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Positioned(
                              left: 0,
                              right: 0,
                              top: cutY - 1,
                              child: SizedBox(
                                height: 2,
                                child: CustomPaint(
                                  painter: _HomeVoucherPerforationPainter(
                                    color: inkColor.withValues(alpha: 0.55),
                                    centerGap: logoSize + 10,
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              left: (width - logoSize) / 2,
                              top: cutY - (logoSize / 2),
                              child: _VoucherBrandLogo(
                                size: logoSize,
                                imageUrl: voucher.companyLogoUrl,
                                companyName: brand,
                                isSwitch: isSwitchVoucher,
                                inkColor: inkColor,
                              ),
                            ),
                            Positioned(
                              left: 10,
                              right: 10,
                              bottom: height * 0.075,
                              child: Center(
                                child: Container(
                                  constraints: BoxConstraints(
                                    maxWidth: width - 20,
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    voucher.code,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: const Color(0xFF111827),
                                      fontSize: (width * 0.075)
                                          .clamp(8.0, 11.0)
                                          .toDouble(),
                                      fontWeight: FontWeight.w600,
                                      height: 1,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
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

class _VoucherBrandLogo extends StatelessWidget {
  const _VoucherBrandLogo({
    required this.size,
    required this.imageUrl,
    required this.companyName,
    required this.isSwitch,
    required this.inkColor,
  });

  final double size;
  final String imageUrl;
  final String companyName;
  final bool isSwitch;
  final Color inkColor;

  @override
  Widget build(BuildContext context) {
    if (isSwitch || imageUrl.trim().isEmpty) {
      if (isSwitch) {
        return SizedBox.square(
          dimension: size,
          child: Padding(
            padding: const EdgeInsets.all(2),
            child: SvgPicture.asset(
              'assets/images/switch-logo.svg',
              fit: BoxFit.contain,
              colorFilter: ColorFilter.mode(inkColor, BlendMode.srcIn),
            ),
          ),
        );
      }
      return _CompanyInitialsLogo(size: size, companyName: companyName);
    }

    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
      ),
      clipBehavior: Clip.antiAlias,
      child: CachedNetworkImage(
        imageUrl: imageUrl.trim(),
        fit: BoxFit.cover,
        fadeInDuration: const Duration(milliseconds: 120),
        placeholder: (_, _) => const ColoredBox(color: Colors.white),
        errorWidget: (_, _, _) =>
            _CompanyInitialsLogo(size: size, companyName: companyName),
      ),
    );
  }
}

class _CompanyInitialsLogo extends StatelessWidget {
  const _CompanyInitialsLogo({required this.size, required this.companyName});

  final double size;
  final String companyName;

  @override
  Widget build(BuildContext context) {
    final words = companyName
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .take(2);
    final initials = words.map((word) => word[0].toUpperCase()).join();
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
      ),
      child: Text(
        initials.isEmpty ? 'S' : initials,
        style: TextStyle(
          color: const Color(0xFF111827),
          fontSize: size * 0.35,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

({String amount, String unit}) _voucherOffer(BuyerVoucherItem voucher) {
  if (voucher.freeShipping) {
    return (amount: 'FREE', unit: 'SHIPPING');
  }
  final value = voucher.discountValue.trim();
  if (value.isNotEmpty) {
    return (
      amount: voucher.isFixedDiscount ? '\u20B1$value' : '$value%',
      unit: 'OFF',
    );
  }
  final title = voucher.title.trim().toUpperCase();
  final match = RegExp(r'^(.+?)\s+OFF$').firstMatch(title);
  if (match != null) {
    return (amount: match.group(1) ?? title, unit: 'OFF');
  }
  return (amount: title, unit: 'VOUCHER');
}

Color _parseVoucherColor(String value, Color fallback) {
  var hex = value.trim().replaceFirst('#', '');
  if (hex.length == 3) {
    hex = hex.split('').map((digit) => '$digit$digit').join();
  }
  if (!RegExp(r'^[0-9a-fA-F]{6}$').hasMatch(hex)) return fallback;
  return Color(int.parse('FF$hex', radix: 16));
}

Color _cardInk(Color color) {
  return color.computeLuminance() > 0.58
      ? const Color(0xFF111827)
      : Colors.white;
}

String _voucherMarkPlatformId(
  BuyerVoucherItem voucher,
  String currentPlatformId,
) {
  final sellerPlatform = voucher.sellerPlatformId.trim().toLowerCase();
  if (sellerPlatform.isNotEmpty && sellerPlatform != 'all') {
    return sellerPlatform;
  }
  final voucherPlatform = voucher.platformId.trim().toLowerCase();
  if (voucherPlatform.isNotEmpty && voucherPlatform != 'all') {
    return voucherPlatform;
  }
  if (voucher.sellerAdminId.trim().isNotEmpty) {
    final current = currentPlatformId.trim().toLowerCase();
    if (current.isNotEmpty && current != 'all') return current;
  }
  return 'all';
}

String? _builtInPlatformMarkAsset(String platformId) {
  return switch (platformId.trim().toLowerCase()) {
    'shop' => 'backend/public/assets/platform-shop-art.png',
    'food' => 'backend/public/assets/platform-food-art.png',
    _ => null,
  };
}

String _platformIconSvg(String iconName) {
  final normalized = iconName.trim().toLowerCase().replaceFirst(
    RegExp(r'^(lucide:|tabler:)'),
    '',
  );
  final paths = switch (normalized) {
    'store' =>
      '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    'utensils' =>
      '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    'hotel' =>
      '<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>',
    'shopping-basket' =>
      '<path d="m5 11 4-7"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4"/><path d="m9 11 1 9"/><path d="M4.5 15.5h15"/><path d="m15 11-1 9"/>',
    'croissant' =>
      '<path d="M4.4 14.9A7 7 0 0 1 12 4.6a7 7 0 0 1 7.6 10.3"/><path d="M12 4.6a7 7 0 0 0 0 14.8"/><path d="M12 19.4a7 7 0 0 0 0-14.8"/><path d="M4.4 14.9c1.5 2.8 4.3 4.5 7.6 4.5s6.1-1.7 7.6-4.5"/>',
    'coffee' =>
      '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
    _ => '',
  };
  if (paths.isEmpty) return '';
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">$paths</svg>';
}

String _fallbackPlatformIconName(
  String platformId,
  BuyerPlatformSummary? platform,
) {
  final configured = platform?.iconName.trim() ?? '';
  if (configured.isNotEmpty) return configured;
  return switch (platformId.trim().toLowerCase()) {
    'hotels' || 'hotel' || 'resort' => 'hotel',
    'food' => 'utensils',
    'groceries' => 'shopping-basket',
    'shop' => 'store',
    _ => '',
  };
}

bool _isSvgImageUrl(String value) {
  final normalized = value.trim().toLowerCase();
  final path = Uri.tryParse(normalized)?.path.toLowerCase() ?? normalized;
  return path.endsWith('.svg') ||
      normalized.contains('image/svg') ||
      normalized.contains('format=svg');
}

class _VoucherPlatformWatermark extends StatelessWidget {
  const _VoucherPlatformWatermark({
    required this.platformId,
    required this.platform,
    required this.color,
    required this.size,
  });

  final String platformId;
  final BuyerPlatformSummary? platform;
  final Color color;
  final double size;

  Widget _fallback(String normalized) {
    final builtInAsset = _builtInPlatformMarkAsset(normalized);
    if (builtInAsset != null) {
      return Opacity(
        opacity: 0.34,
        child: Image.asset(
          builtInAsset,
          width: size,
          height: size,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          isAntiAlias: true,
        ),
      );
    }
    final svg = _platformIconSvg(
      _fallbackPlatformIconName(normalized, platform),
    );
    if (svg.isEmpty) return SizedBox.square(dimension: size);
    return Opacity(
      opacity: 0.28,
      child: SvgPicture.string(
        svg,
        width: size,
        height: size,
        fit: BoxFit.contain,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final normalized = platformId.trim().toLowerCase();
    if (normalized.isEmpty || normalized == 'all') {
      return Opacity(
        opacity: 0.4,
        child: Image.asset(
          'backend/public/assets/switch-all-platform-3d-clear.png',
          width: size / 0.78,
          height: size / 0.78,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          isAntiAlias: true,
        ),
      );
    }
    final iconUrl = platform?.iconImageUrl.trim() ?? '';
    if (iconUrl.isEmpty) return _fallback(normalized);
    return Opacity(
      opacity: 0.34,
      child: _isSvgImageUrl(iconUrl)
          ? SvgPicture.network(
              iconUrl,
              width: size,
              height: size,
              fit: BoxFit.contain,
              placeholderBuilder: (_) => _fallback(normalized),
              errorBuilder: (_, _, _) => _fallback(normalized),
            )
          : CachedNetworkImage(
              imageUrl: iconUrl,
              width: size,
              height: size,
              fit: BoxFit.contain,
              fadeInDuration: const Duration(milliseconds: 120),
              placeholder: (_, _) => _fallback(normalized),
              errorWidget: (_, _, _) => _fallback(normalized),
            ),
    );
  }
}

class _HomeVoucherTicketBorder extends ShapeBorder {
  const _HomeVoucherTicketBorder();

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      getOuterPath(rect, textDirection: textDirection);

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    return const _HomeVoucherTicketClipper()
        .getClip(rect.size)
        .shift(rect.topLeft);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {}

  @override
  ShapeBorder scale(double t) => this;
}

class _HomeVoucherTicketClipper extends CustomClipper<Path> {
  const _HomeVoucherTicketClipper();

  @override
  Path getClip(Size size) {
    final radius = (size.width * 0.10).clamp(10.0, 18.0).toDouble();
    final ticket = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)),
      );
    final cutY = size.height * 0.66;
    final notchRadius = (size.width * 0.105).clamp(9.0, 16.0).toDouble();
    final notches = Path()
      ..addOval(Rect.fromCircle(center: Offset(0, cutY), radius: notchRadius))
      ..addOval(
        Rect.fromCircle(center: Offset(size.width, cutY), radius: notchRadius),
      );
    return Path.combine(PathOperation.difference, ticket, notches);
  }

  @override
  bool shouldReclip(covariant _HomeVoucherTicketClipper oldClipper) => false;
}

class _HomeVoucherTicketShadowPainter extends CustomPainter {
  const _HomeVoucherTicketShadowPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final path = const _HomeVoucherTicketClipper().getClip(size);
    canvas.drawShadow(path, color, 5, false);
  }

  @override
  bool shouldRepaint(covariant _HomeVoucherTicketShadowPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

class _HomeVoucherPerforationPainter extends CustomPainter {
  const _HomeVoucherPerforationPainter({
    required this.color,
    required this.centerGap,
  });

  final Color color;
  final double centerGap;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1
      ..strokeCap = StrokeCap.round;
    const dash = 2.2;
    const gap = 2.0;
    final center = size.width / 2;
    final leftEnd = center - (centerGap / 2);
    final rightStart = center + (centerGap / 2);

    void drawSegment(double start, double end) {
      for (var x = start; x < end; x += dash + gap) {
        canvas.drawLine(
          Offset(x, size.height / 2),
          Offset((x + dash).clamp(start, end).toDouble(), size.height / 2),
          paint,
        );
      }
    }

    drawSegment(0, leftEnd);
    drawSegment(rightStart, size.width);
  }

  @override
  bool shouldRepaint(covariant _HomeVoucherPerforationPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.centerGap != centerGap;
  }
}
