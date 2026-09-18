import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:gms_shopping/order_store.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/utils/currency_format.dart';
import 'package:gms_shopping/widgets/buyer_right_panel_host.dart';
import 'package:google_fonts/google_fonts.dart';

/// Grouped order row used by the platform activity list.
class BuyerPlatformActivityItem {
  const BuyerPlatformActivityItem({
    required this.orderId,
    required this.title,
    required this.subtitle,
    required this.stageLabel,
    required this.createdAtEpochMs,
    required this.isHistory,
    required this.imageUrl,
    required this.amountLabel,
    this.stageIndex = 0,
  });

  final String orderId;
  final String title;
  final String subtitle;
  final String stageLabel;
  final int createdAtEpochMs;
  final bool isHistory;
  final String imageUrl;
  final String amountLabel;
  final int stageIndex;
}

String buyerOrderStageLabel(OrderStageKey stage) {
  switch (stage) {
    case OrderStageKey.toPay:
      return 'To Pay';
    case OrderStageKey.toPrepare:
      return 'To Prepare';
    case OrderStageKey.toShip:
      return 'To Ship';
    case OrderStageKey.toReceive:
      return 'To Receive';
    case OrderStageKey.toReview:
      return 'To Review';
    case OrderStageKey.returnRequest:
      return 'Return';
    case OrderStageKey.cancelled:
      return 'Cancelled';
  }
}

int buyerOrderStageNavIndex(OrderStageKey stage) {
  switch (stage) {
    case OrderStageKey.toPay:
      return 0;
    case OrderStageKey.toPrepare:
      return 1;
    case OrderStageKey.toShip:
      return 2;
    case OrderStageKey.toReceive:
      return 3;
    case OrderStageKey.toReview:
      return 4;
    case OrderStageKey.returnRequest:
      return 5;
    case OrderStageKey.cancelled:
      return 5;
  }
}

bool _isHistoryEntry(OrderEntryData entry) {
  if (entry.stage == OrderStageKey.cancelled) return true;
  if (entry.hidesFromToReviewAfterSubmit) return true;
  if (entry.stage == OrderStageKey.toReview && entry.hasProductReviewRating) {
    return true;
  }
  return false;
}

/// Builds newest-first activity rows from [orders] for a buyer platform.
List<BuyerPlatformActivityItem> buildBuyerPlatformActivityItems(
  List<OrderEntryData> orders, {
  int limit = 40,
}) {
  final grouped = <String, List<OrderEntryData>>{};
  for (final entry in orders) {
    final key = entry.id.trim().isNotEmpty
        ? entry.id.trim()
        : '${entry.createdAtEpochMs}-${entry.productId}';
    grouped.putIfAbsent(key, () => <OrderEntryData>[]).add(entry);
  }

  final items = <BuyerPlatformActivityItem>[];
  for (final entries in grouped.values) {
    if (entries.isEmpty) continue;
    entries.sort(
      (left, right) => right.createdAtEpochMs.compareTo(left.createdAtEpochMs),
    );
    final first = entries.first;
    final total = entries.fold<double>(0, (sum, e) => sum + e.totalPrice);
    final grand = first.grandTotalAmount > 0 ? first.grandTotalAmount : total;
    final productNames = entries
        .map((e) => e.productName.trim())
        .where((name) => name.isNotEmpty)
        .toSet()
        .toList();
    final title = productNames.isEmpty
        ? 'Order'
        : productNames.length == 1
        ? productNames.first
        : '${productNames.first} +${productNames.length - 1}';
    final qty = entries.fold<int>(0, (sum, e) => sum + e.quantity);
    items.add(
      BuyerPlatformActivityItem(
        orderId: first.id,
        title: title,
        subtitle: qty <= 1 ? '1 item' : '$qty items',
        stageLabel: buyerOrderStageLabel(first.stage),
        createdAtEpochMs: first.createdAtEpochMs,
        isHistory: _isHistoryEntry(first),
        imageUrl: first.productImageUrl.trim(),
        amountLabel: formatPesoCurrency(grand),
        stageIndex: buyerOrderStageNavIndex(first.stage),
      ),
    );
  }

  items.sort((left, right) {
    final byTime = right.createdAtEpochMs.compareTo(left.createdAtEpochMs);
    if (byTime != 0) return byTime;
    return left.title.toLowerCase().compareTo(right.title.toLowerCase());
  });

  if (items.length <= limit) return items;
  return items.take(limit).toList(growable: false);
}

String _relativeActivityTime(int epochMs) {
  if (epochMs <= 0) return '';
  final created = DateTime.fromMillisecondsSinceEpoch(epochMs);
  final diff = DateTime.now().difference(created);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  final month = created.month.toString().padLeft(2, '0');
  final day = created.day.toString().padLeft(2, '0');
  return '${created.year}-$month-$day';
}

/// Compact list-view of platform recent activity (process + history).
class BuyerPlatformActivityList extends StatelessWidget {
  const BuyerPlatformActivityList({
    super.key,
    required this.platformLabel,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
    this.onOpenItem,
    this.padding = const EdgeInsets.fromLTRB(12, 8, 12, 20),
    this.emptyMessage,
  });

  final String platformLabel;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;
  final ValueChanged<BuyerPlatformActivityItem>? onOpenItem;
  final EdgeInsetsGeometry padding;
  final String? emptyMessage;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<List<OrderEntryData>>(
      valueListenable: OrderStore.instance.ordersNotifier,
      builder: (context, orders, _) {
        final items = buildBuyerPlatformActivityItems(orders);
        final active = items.where((item) => !item.isHistory).toList();
        final history = items.where((item) => item.isHistory).toList();

        if (items.isEmpty) {
          return Padding(
            padding: padding,
            child: _EmptyState(
              titleColor: titleColor,
              secondaryColor: secondaryColor,
              message:
                  emptyMessage ??
                  'No recent activity in $platformLabel yet. Orders and history will appear here.',
            ),
          );
        }

        return ListView(
          padding: padding,
          children: [
            if (active.isNotEmpty) ...[
              _SectionHeader(
                label: 'In progress',
                count: active.length,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
              ),
              const SizedBox(height: 6),
              for (final item in active)
                _ActivityRow(
                  item: item,
                  primaryColor: primaryColor,
                  titleColor: titleColor,
                  secondaryColor: secondaryColor,
                  surfaceColor: surfaceColor,
                  onTap: onOpenItem == null ? null : () => onOpenItem!(item),
                ),
              const SizedBox(height: 14),
            ],
            if (history.isNotEmpty) ...[
              _SectionHeader(
                label: 'History',
                count: history.length,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
              ),
              const SizedBox(height: 6),
              for (final item in history)
                _ActivityRow(
                  item: item,
                  primaryColor: primaryColor,
                  titleColor: titleColor,
                  secondaryColor: secondaryColor,
                  surfaceColor: surfaceColor,
                  onTap: onOpenItem == null ? null : () => onOpenItem!(item),
                ),
            ],
          ],
        );
      },
    );
  }
}

/// Right-side panel host for platform recent activity.
class BuyerPlatformActivityPanel extends StatelessWidget {
  const BuyerPlatformActivityPanel({
    super.key,
    required this.platformLabel,
    required this.primaryColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    this.onOpenItem,
    this.headerBuilder,
  });

  final String platformLabel;
  final Color primaryColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final ValueChanged<BuyerPlatformActivityItem>? onOpenItem;
  final WidgetBuilder? headerBuilder;

  static Future<void> show(
    BuildContext context, {
    required String platformLabel,
    required Color primaryColor,
    required Color surfaceColor,
    required Color titleColor,
    required Color secondaryColor,
    ValueChanged<BuyerPlatformActivityItem>? onOpenItem,
    WidgetBuilder? headerBuilder,
  }) {
    // Full-screen home-dashboard layout (not a narrow right sidebar).
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final overlayStyle = BuyerRightPanelHost.transparentOverlayStyle(
      isDark: isDark,
    );

    return Navigator.of(context).push<void>(
      PageRouteBuilder<void>(
        opaque: true,
        transitionDuration: appPageTransitionDuration,
        reverseTransitionDuration: appPageTransitionDuration,
        pageBuilder: (context, animation, secondaryAnimation) {
          return AnnotatedRegion<SystemUiOverlayStyle>(
            value: overlayStyle,
            child: BuyerPlatformActivityPanel(
              platformLabel: platformLabel,
              primaryColor: primaryColor,
              surfaceColor: surfaceColor,
              titleColor: titleColor,
              secondaryColor: secondaryColor,
              onOpenItem: onOpenItem,
              headerBuilder: headerBuilder,
            ),
          );
        },
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          final primaryAnimation = CurvedAnimation(
            parent: animation,
            curve: Curves.easeInOutCubic,
            reverseCurve: Curves.easeInOutCubic,
          );
          final secondaryRouteAnimation = CurvedAnimation(
            parent: secondaryAnimation,
            curve: Curves.easeInOutCubic,
            reverseCurve: Curves.easeInOutCubic,
          );
          // Same cascade slide as main platform / product details.
          return ClipRect(
            child: SlideTransition(
              position: Tween<Offset>(
                begin: Offset.zero,
                end: const Offset(-1, 0),
              ).animate(secondaryRouteAnimation),
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(1, 0),
                  end: Offset.zero,
                ).animate(primaryAnimation),
                child: child,
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Match Home scaffold: solid dashboard surface, full-bleed body.
    return Scaffold(
      backgroundColor: surfaceColor,
      body: ColoredBox(
        color: surfaceColor,
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (headerBuilder != null)
                headerBuilder!(context)
              else
                BuyerRightPanelHeader(
                  title: 'Recent activity',
                  titleColor: titleColor,
                  onBack: () => Navigator.of(context).maybePop(),
                ),
              Padding(
                padding: EdgeInsets.fromLTRB(
                  16,
                  headerBuilder == null ? 4 : 10,
                  16,
                  8,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (headerBuilder != null) ...[
                      Text(
                        'Recent activity',
                        style: TextStyle(
                          color: titleColor,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                    ],
                    Text(
                      platformLabel,
                      style: TextStyle(
                        color: secondaryColor,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ColoredBox(
                  color: surfaceColor,
                  child: BuyerPlatformActivityList(
                    platformLabel: platformLabel,
                    primaryColor: primaryColor,
                    titleColor: titleColor,
                    secondaryColor: secondaryColor,
                    surfaceColor: surfaceColor,
                    onOpenItem: (item) {
                      Navigator.of(context).maybePop();
                      onOpenItem?.call(item);
                    },
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

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.label,
    required this.count,
    required this.titleColor,
    required this.secondaryColor,
  });

  final String label;
  final int count;
  final Color titleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          label,
          style: TextStyle(
            color: titleColor,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '$count',
          style: TextStyle(
            color: secondaryColor,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _ActivityRow extends StatelessWidget {
  const _ActivityRow({
    required this.item,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
    this.onTap,
  });

  final BuyerPlatformActivityItem item;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final timeLabel = _relativeActivityTime(item.createdAtEpochMs);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: titleColor.withOpacity(0.08)),
              color: Color.lerp(surfaceColor, titleColor, 0.02),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 12, 10),
              child: Row(
                children: [
                  _Thumb(imageUrl: item.imageUrl, primaryColor: primaryColor),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: titleColor,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          [
                            item.stageLabel,
                            item.subtitle,
                            if (timeLabel.isNotEmpty) timeLabel,
                          ].join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: secondaryColor,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    item.amountLabel,
                    style: GoogleFonts.roboto(
                      color: titleColor,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      height: 1,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.imageUrl, required this.primaryColor});

  final String imageUrl;
  final Color primaryColor;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 44,
        height: 44,
        child: imageUrl.isEmpty
            ? ColoredBox(
                color: primaryColor.withOpacity(0.12),
                child: Icon(
                  Icons.shopping_bag_outlined,
                  color: primaryColor,
                  size: 20,
                ),
              )
            : Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => ColoredBox(
                  color: primaryColor.withOpacity(0.12),
                  child: Icon(
                    Icons.shopping_bag_outlined,
                    color: primaryColor,
                    size: 20,
                  ),
                ),
              ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.titleColor,
    required this.secondaryColor,
    required this.message,
  });

  final Color titleColor;
  final Color secondaryColor;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.history_rounded, size: 36, color: secondaryColor),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: secondaryColor,
                fontSize: 13.5,
                height: 1.45,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Persistent right rail used on wide platform storefronts.
class BuyerPlatformActivityRail extends StatelessWidget {
  const BuyerPlatformActivityRail({
    super.key,
    required this.platformLabel,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
    this.onOpenItem,
    this.width = 320,
  });

  final String platformLabel;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;
  final ValueChanged<BuyerPlatformActivityItem>? onOpenItem;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: surfaceColor,
          border: Border(left: BorderSide(color: titleColor.withOpacity(0.08))),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 4),
              child: Text(
                'Recent activity',
                style: TextStyle(
                  color: titleColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                platformLabel,
                style: TextStyle(
                  color: secondaryColor,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Expanded(
              child: BuyerPlatformActivityList(
                platformLabel: platformLabel,
                primaryColor: primaryColor,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
                surfaceColor: surfaceColor,
                onOpenItem: onOpenItem,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// True when the viewport is wide enough for a persistent activity rail.
bool buyerPlatformActivityRailVisible(BuildContext context) {
  return MediaQuery.sizeOf(context).width >= 1100;
}
