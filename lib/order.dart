import 'dart:async';

import 'package:switch_app/comment_rate.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/order_store.dart';
import 'package:switch_app/place_order.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/tacking.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/widgets/horizontal_end_fade.dart';

class OrderPage extends StatefulWidget {
  const OrderPage({
    super.key,
    this.initialStageIndex = 0,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.primaryColor,
  });

  final int initialStageIndex;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color primaryColor;

  @override
  State<OrderPage> createState() => _OrderPageState();
}

class _OrderPageState extends State<OrderPage> {
  static const Duration _refreshIndicatorDelay = Duration(milliseconds: 650);
  static const Duration _orderAutoRefreshInterval = Duration(seconds: 8);
  late int _selectedStageIndex;
  bool _isRefreshingOrders = false;
  Timer? _orderAutoRefreshTimer;

  void _syncPackingQueueOrdersIfNeeded([int? _]) {
    // Place Order now pushes directly to the backend, so To Prepare no longer
    // needs to trigger queue syncs on screen open.
  }

  @override
  void initState() {
    super.initState();
    _selectedStageIndex = _normalizeStageIndex(widget.initialStageIndex);
    unawaited(OrderStore.instance.refreshFromRemote());
    _startOrderAutoRefresh();
    _syncPackingQueueOrdersIfNeeded();
  }

  @override
  void didUpdateWidget(covariant OrderPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextStageIndex = _normalizeStageIndex(widget.initialStageIndex);
    if (oldWidget.initialStageIndex != widget.initialStageIndex &&
        nextStageIndex != _selectedStageIndex) {
      setState(() {
        _selectedStageIndex = nextStageIndex;
      });
      _syncPackingQueueOrdersIfNeeded(nextStageIndex);
    }
  }

  @override
  void dispose() {
    _orderAutoRefreshTimer?.cancel();
    super.dispose();
  }

  void _startOrderAutoRefresh() {
    _orderAutoRefreshTimer?.cancel();
    _orderAutoRefreshTimer = Timer.periodic(
      _orderAutoRefreshInterval,
      (_) => unawaited(OrderStore.instance.refreshFromRemote()),
    );
  }

  static const List<_OrderStage> _stages = <_OrderStage>[
    _OrderStage(
      label: 'To Pay',
      icon: Icons.payments_outlined,
      emptyTitle: 'No pending payments',
      emptyMessage: 'Orders waiting for payment confirmation will appear here.',
      stageKey: OrderStageKey.toPay,
    ),
    _OrderStage(
      label: 'To Prepare',
      icon: Icons.move_to_inbox_outlined,
      emptyTitle: 'Nothing to prepare yet',
      emptyMessage:
          'Confirmed orders that are being prepared will appear here.',
      stageKey: OrderStageKey.toPrepare,
    ),
    _OrderStage(
      label: 'To Ship',
      icon: Icons.local_shipping_outlined,
      emptyTitle: 'Nothing to ship yet',
      emptyMessage:
          'Prepared orders that are ready to be handed over for shipment will appear here.',
      stageKey: OrderStageKey.toShip,
    ),
    _OrderStage(
      label: 'To Receive',
      icon: Icons.inventory_2_outlined,
      emptyTitle: 'No incoming deliveries',
      emptyMessage: 'Orders already on the way will appear here.',
      stageKey: OrderStageKey.toReceive,
    ),
    _OrderStage(
      label: 'To Review',
      icon: Icons.stars_outlined,
      emptyTitle: 'No items to review',
      emptyMessage:
          'Completed orders waiting for your feedback will appear here.',
      showsFiveStars: true,
      stageKey: OrderStageKey.toReview,
    ),
    _OrderStage(
      label: 'Return',
      icon: Icons.assignment_returned_outlined,
      emptyTitle: 'No return requests',
      emptyMessage: 'Return or refund requests will appear here.',
      stageKey: OrderStageKey.returnRequest,
    ),
  ];

  List<_StoredOrderGroup> _ordersForStage(
    List<OrderEntryData> entries,
    OrderStageKey? stageKey,
  ) {
    if (stageKey == null) {
      return const <_StoredOrderGroup>[];
    }

    _StoredOrderGroup buildStoredOrderGroup(
      List<OrderEntryData> orderEntries, {
      required int createdAtEpochMs,
      required OrderStageKey resolvedStage,
      required bool showsCancelledState,
      required int cancelDisplayExpiresAtEpochMs,
    }) {
      final firstEntry = orderEntries.first;
      final subtotal = orderEntries.fold<double>(
        0,
        (total, entry) => total + entry.totalPrice,
      );
      final double shippingFee = firstEntry.shippingFeeAmount > 0
          ? firstEntry.shippingFeeAmount
          : 0.0;
      final double grandTotal = firstEntry.grandTotalAmount > 0
          ? firstEntry.grandTotalAmount
          : subtotal + shippingFee;
      final double amountToPay = firstEntry.amountToPayAmount > 0
          ? firstEntry.amountToPayAmount
          : grandTotal;
      final double computedRemaining = grandTotal - amountToPay;
      final double remainingBalance = firstEntry.remainingBalanceAmount > 0
          ? firstEntry.remainingBalanceAmount
          : (computedRemaining > 0 ? computedRemaining : 0.0);

      return _StoredOrderGroup(
        createdAtEpochMs: createdAtEpochMs,
        entries: List<OrderEntryData>.unmodifiable(orderEntries),
        stage: resolvedStage,
        subtotalAmount: subtotal,
        shippingFeeAmount: shippingFee,
        grandTotalAmount: grandTotal,
        amountToPayAmount: amountToPay,
        remainingBalanceAmount: remainingBalance,
        paymentOptionLabel: firstEntry.paymentOptionLabel.trim(),
        paymentPartnerName: firstEntry.paymentPartnerName.trim(),
        paymentPartnerImageUrl: firstEntry.paymentPartnerImageUrl.trim(),
        deliveryPartnerName: firstEntry.deliveryPartnerName.trim(),
        deliveryPartnerImageUrl: firstEntry.deliveryPartnerImageUrl.trim(),
        clientName: firstEntry.clientName.trim(),
        clientContactNumber: firstEntry.clientContactNumber.trim(),
        clientAddress: firstEntry.clientAddress.trim(),
        cancelRequestStatus: firstEntry.cancelRequestStatus.trim(),
        cancelRequestReason: firstEntry.cancelRequestReason.trim(),
        cancelRequestSubmittedAtEpochMs:
            firstEntry.cancelRequestSubmittedAtEpochMs,
        cancelRequestResolvedAtEpochMs:
            firstEntry.cancelRequestResolvedAtEpochMs,
        showsCancelledState: showsCancelledState,
        cancelDisplayExpiresAtEpochMs: cancelDisplayExpiresAtEpochMs,
      );
    }

    if (stageKey == OrderStageKey.toReview) {
      final latestReviewEntryByProductId = <String, OrderEntryData>{};
      for (final entry in entries) {
        final isVisibleInToReview =
            entry.stage == stageKey ||
            (entry.stage == OrderStageKey.toReceive &&
                entry.hasCustomerConfirmedReceipt);
        if (!isVisibleInToReview || entry.hidesFromToReviewAfterSubmit) {
          continue;
        }

        final normalizedProductId = entry.productId.trim();
        if (normalizedProductId.isEmpty) {
          continue;
        }

        final existingEntry = latestReviewEntryByProductId[normalizedProductId];
        if (existingEntry == null ||
            entry.createdAtEpochMs > existingEntry.createdAtEpochMs ||
            (entry.createdAtEpochMs == existingEntry.createdAtEpochMs &&
                entry.id.compareTo(existingEntry.id) > 0)) {
          latestReviewEntryByProductId[normalizedProductId] = entry;
        }
      }

      final reviewOrders =
          <_StoredOrderGroup>[
            for (final entry in latestReviewEntryByProductId.values)
              buildStoredOrderGroup(
                <OrderEntryData>[entry],
                createdAtEpochMs: entry.createdAtEpochMs,
                resolvedStage: OrderStageKey.toReview,
                showsCancelledState: false,
                cancelDisplayExpiresAtEpochMs: 0,
              ),
          ]..sort(
            (left, right) =>
                right.createdAtEpochMs.compareTo(left.createdAtEpochMs),
          );

      return List<_StoredOrderGroup>.unmodifiable(reviewOrders);
    }

    final groupedEntries = <int, List<OrderEntryData>>{};
    final nowEpochMs = DateTime.now().millisecondsSinceEpoch;
    for (final entry in entries) {
      final shouldIncludeEntry =
          entry.stage == stageKey ||
          (stageKey == OrderStageKey.toPrepare &&
              _isCancelledPrepareEntryVisible(entry, nowEpochMs: nowEpochMs));
      if (!shouldIncludeEntry) {
        continue;
      }
      groupedEntries
          .putIfAbsent(entry.createdAtEpochMs, () => <OrderEntryData>[])
          .add(entry);
    }

    final orders =
        groupedEntries.entries
            .map((bucket) {
              final orderEntries = bucket.value;
              final firstEntry = orderEntries.first;
              final showsCancelledState =
                  stageKey == OrderStageKey.toPrepare &&
                  _isCancelledPrepareEntryVisible(
                    firstEntry,
                    nowEpochMs: nowEpochMs,
                  );

              return buildStoredOrderGroup(
                orderEntries,
                createdAtEpochMs: bucket.key,
                resolvedStage: showsCancelledState
                    ? OrderStageKey.toPrepare
                    : firstEntry.stage,
                showsCancelledState: showsCancelledState,
                cancelDisplayExpiresAtEpochMs: showsCancelledState
                    ? _cancelledPrepareExpiryEpochMs(firstEntry)
                    : 0,
              );
            })
            .toList(growable: false)
          ..sort((left, right) {
            final cancelledStateCompare = (left.showsCancelledState ? 1 : 0)
                .compareTo(right.showsCancelledState ? 1 : 0);
            if (cancelledStateCompare != 0) {
              return cancelledStateCompare;
            }

            return right.createdAtEpochMs.compareTo(left.createdAtEpochMs);
          });

    return orders;
  }

  List<List<_StoredOrderGroup>> _ordersForStages(List<OrderEntryData> entries) {
    return <List<_StoredOrderGroup>>[
      for (final stage in _stages) _ordersForStage(entries, stage.stageKey),
    ];
  }

  Future<void> _refreshOrders() async {
    if (_isRefreshingOrders) {
      return;
    }

    _isRefreshingOrders = true;
    try {
      await OrderStore.instance.refreshFromRemote();
      await Future<void>.delayed(_refreshIndicatorDelay);
    } finally {
      _isRefreshingOrders = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedStage = _stages[_selectedStageIndex];
    final usesFullWidthStageLayout = _usesFullWidthOrderStageLayout(
      selectedStage.stageKey,
    );
    final usesEdgeToEdgeStageShell = _usesEdgeToEdgeOrderStageShell(
      selectedStage.stageKey,
    );
    final contentPadding = usesEdgeToEdgeStageShell
        ? const EdgeInsets.fromLTRB(0, 0, 0, 0)
        : const EdgeInsets.fromLTRB(10, 0, 10, 0);
    final listPadding = usesEdgeToEdgeStageShell
        ? const EdgeInsets.only(top: 12)
        : EdgeInsets.zero;

    return ValueListenableBuilder<List<OrderEntryData>>(
      valueListenable: OrderStore.instance.ordersNotifier,
      builder: (context, orders, _) {
        final stageOrderGroups = _ordersForStages(orders);
        final stageCounts = <int>[
          for (final stageOrders in stageOrderGroups) stageOrders.length,
        ];
        final stageOrders = stageOrderGroups[_selectedStageIndex];

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _OrderStagesCarousel(
              stages: _stages,
              stageCounts: stageCounts,
              selectedIndex: _selectedStageIndex,
              backgroundColor: widget.surfaceColor,
              activeColor: widget.primaryColor,
              inactiveColor: widget.secondaryColor,
              onTap: (index) {
                setState(() {
                  _selectedStageIndex = index;
                });
                _syncPackingQueueOrdersIfNeeded(index);
              },
            ),
            Expanded(
              child: Padding(
                padding: contentPadding,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return RefreshIndicator(
                      onRefresh: _refreshOrders,
                      color: widget.primaryColor,
                      backgroundColor: widget.backgroundColor,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: ColoredBox(
                          color: widget.backgroundColor,
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              minHeight: constraints.maxHeight,
                            ),
                            child: AnimatedSwitcher(
                              duration: appMotionFrames(13),
                              switchInCurve: Curves.easeOutCubic,
                              switchOutCurve: Curves.easeInCubic,
                              layoutBuilder:
                                  (
                                    Widget? currentChild,
                                    List<Widget> previousChildren,
                                  ) {
                                    return Stack(
                                      alignment: Alignment.topCenter,
                                      children: <Widget>[
                                        ...previousChildren,
                                        ?currentChild,
                                      ],
                                    );
                                  },
                              child: stageOrders.isEmpty
                                  ? SizedBox(
                                      key: ValueKey<String>(
                                        '${selectedStage.label}-empty',
                                      ),
                                      width: double.infinity,
                                      height: constraints.maxHeight,
                                      child: _OrderEmptyState(
                                        stage: selectedStage,
                                        primaryColor: widget.primaryColor,
                                        titleColor: widget.titleColor,
                                        secondaryColor: widget.secondaryColor,
                                      ),
                                    )
                                  : Padding(
                                      key: ValueKey<String>(
                                        '${selectedStage.label}-${stageOrders.length}',
                                      ),
                                      padding: listPadding,
                                      child: Column(
                                        children: [
                                          for (
                                            var index = 0;
                                            index < stageOrders.length;
                                            index++
                                          ) ...[
                                            if (index > 0)
                                              const SizedBox(height: 12),
                                            _OrderSummaryCard(
                                              key: ValueKey<String>(
                                                stageOrders[index].viewKey,
                                              ),
                                              order: stageOrders[index],
                                              stageLabel: selectedStage.label,
                                              primaryColor: widget.primaryColor,
                                              titleColor: widget.titleColor,
                                              secondaryColor:
                                                  widget.secondaryColor,
                                              surfaceColor: widget.surfaceColor,
                                            ),
                                          ],
                                          if (stageOrders.length > 1)
                                            const SizedBox(height: 12),
                                        ],
                                      ),
                                    ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

int _normalizeStageIndex(int index) {
  if (index < 0) {
    return 0;
  }
  if (index >= _OrderPageState._stages.length) {
    return _OrderPageState._stages.length - 1;
  }
  return index;
}

const Duration _cancelledPrepareRetentionDuration = Duration(days: 1);

int _cancelDecisionAnchorEpochMs(OrderEntryData entry) {
  if (entry.cancelRequestResolvedAtEpochMs > 0) {
    return entry.cancelRequestResolvedAtEpochMs;
  }
  return entry.cancelRequestSubmittedAtEpochMs;
}

int _cancelledPrepareExpiryEpochMs(OrderEntryData entry) {
  final anchorEpochMs = _cancelDecisionAnchorEpochMs(entry);
  if (anchorEpochMs <= 0) {
    return 0;
  }
  return anchorEpochMs + _cancelledPrepareRetentionDuration.inMilliseconds;
}

bool _isCancelledPrepareEntryVisible(OrderEntryData entry, {int? nowEpochMs}) {
  if (entry.stage != OrderStageKey.cancelled) {
    return false;
  }
  if (entry.cancelRequestStatus.trim().toLowerCase() != 'accepted') {
    return false;
  }

  final expiresAtEpochMs = _cancelledPrepareExpiryEpochMs(entry);
  if (expiresAtEpochMs <= 0) {
    return false;
  }

  final now = nowEpochMs ?? DateTime.now().millisecondsSinceEpoch;
  return now < expiresAtEpochMs;
}

class _OrderStage {
  const _OrderStage({
    required this.label,
    required this.icon,
    required this.emptyTitle,
    required this.emptyMessage,
    this.showsFiveStars = false,
    this.stageKey,
  });

  final String label;
  final IconData icon;
  final String emptyTitle;
  final String emptyMessage;
  final bool showsFiveStars;
  final OrderStageKey? stageKey;
}

class _StoredOrderGroup {
  const _StoredOrderGroup({
    required this.createdAtEpochMs,
    required this.entries,
    required this.stage,
    required this.subtotalAmount,
    required this.shippingFeeAmount,
    required this.grandTotalAmount,
    required this.amountToPayAmount,
    required this.remainingBalanceAmount,
    required this.paymentOptionLabel,
    required this.paymentPartnerName,
    required this.paymentPartnerImageUrl,
    required this.deliveryPartnerName,
    required this.deliveryPartnerImageUrl,
    required this.clientName,
    required this.clientContactNumber,
    required this.clientAddress,
    required this.cancelRequestStatus,
    required this.cancelRequestReason,
    required this.cancelRequestSubmittedAtEpochMs,
    required this.cancelRequestResolvedAtEpochMs,
    required this.showsCancelledState,
    required this.cancelDisplayExpiresAtEpochMs,
  });

  final int createdAtEpochMs;
  final List<OrderEntryData> entries;
  final OrderStageKey stage;
  final double subtotalAmount;
  final double shippingFeeAmount;
  final double grandTotalAmount;
  final double amountToPayAmount;
  final double remainingBalanceAmount;
  final String paymentOptionLabel;
  final String paymentPartnerName;
  final String paymentPartnerImageUrl;
  final String deliveryPartnerName;
  final String deliveryPartnerImageUrl;
  final String clientName;
  final String clientContactNumber;
  final String clientAddress;
  final String cancelRequestStatus;
  final String cancelRequestReason;
  final int cancelRequestSubmittedAtEpochMs;
  final int cancelRequestResolvedAtEpochMs;
  final bool showsCancelledState;
  final int cancelDisplayExpiresAtEpochMs;

  String get viewKey {
    final firstEntryId = entries.isEmpty ? '' : entries.first.id.trim();
    return '$createdAtEpochMs-${stage.name}-$firstEntryId';
  }

  int get itemCount =>
      entries.fold<int>(0, (total, entry) => total + entry.quantity);

  bool get hasOutstandingBalance => remainingBalanceAmount > 0.009;

  bool get isCodOrder =>
      paymentOptionLabel.trim().toLowerCase().startsWith('cod');

  bool get isCancelRequestPending =>
      cancelRequestStatus.trim().toLowerCase() == 'pending';

  bool get hasCustomerConfirmedReceipt =>
      entries.any((entry) => entry.hasCustomerConfirmedReceipt);

  double get requiredAmountToProceed {
    if (!isCodOrder) {
      return grandTotalAmount;
    }
    return _requiredCodDeposit(grandTotalAmount);
  }

  double get amountNeededToProceed {
    if (isCodOrder) {
      final shortfall = requiredAmountToProceed - paidAmount;
      return shortfall > 0 ? shortfall : 0;
    }
    return remainingBalanceAmount > 0 ? remainingBalanceAmount : 0;
  }

  double get paidAmount {
    final amountPaid = grandTotalAmount - remainingBalanceAmount;
    return amountPaid > 0 ? amountPaid : 0;
  }

  String get headline {
    if (entries.isEmpty) {
      return 'Order';
    }
    if (entries.length == 1) {
      return entries.first.productName;
    }
    return '${entries.first.productName} +${entries.length - 1} more';
  }
}

class _OrderEmptyState extends StatelessWidget {
  const _OrderEmptyState({
    required this.stage,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
  });

  final _OrderStage stage;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isTopAlignedStage = stage.stageKey == OrderStageKey.toShip;

    return SizedBox(
      width: double.infinity,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 22, 18, 22),
        child: Align(
          alignment: isTopAlignedStage ? Alignment.topCenter : Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              stage.showsFiveStars
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List<Widget>.generate(5, (index) {
                        return Padding(
                          padding: EdgeInsets.only(right: index == 4 ? 0 : 4),
                          child: Icon(
                            Icons.star_rounded,
                            size: 22,
                            color: primaryColor,
                          ),
                        );
                      }),
                    )
                  : Icon(stage.icon, size: 34, color: primaryColor),
              const SizedBox(height: 18),
              Text(
                stage.emptyTitle,
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  color: titleColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 320),
                child: Text(
                  stage.emptyMessage,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: secondaryColor,
                    height: 1.45,
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

class _OrderSummaryCard extends StatefulWidget {
  const _OrderSummaryCard({
    super.key,
    required this.order,
    required this.stageLabel,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.surfaceColor,
  });

  final _StoredOrderGroup order;
  final String stageLabel;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color surfaceColor;

  @override
  State<_OrderSummaryCard> createState() => _OrderSummaryCardState();
}

class _OrderSummaryCardState extends State<_OrderSummaryCard> {
  bool _showsAllOrderItems = false;

  _StoredOrderGroup get order => widget.order;
  String get stageLabel => widget.stageLabel;
  Color get primaryColor => widget.primaryColor;
  Color get titleColor => widget.titleColor;
  Color get secondaryColor => widget.secondaryColor;
  Color get surfaceColor => widget.surfaceColor;

  @override
  void didUpdateWidget(covariant _OrderSummaryCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.order.createdAtEpochMs != widget.order.createdAtEpochMs) {
      _showsAllOrderItems = false;
    }
  }

  bool get _usesProductPreviewList =>
      order.stage == OrderStageKey.toPay ||
      order.stage == OrderStageKey.toReceive ||
      order.stage == OrderStageKey.toPrepare ||
      order.stage == OrderStageKey.toShip ||
      order.stage == OrderStageKey.toReview ||
      order.stage == OrderStageKey.returnRequest;

  bool get _canToggleOrderItems =>
      _usesProductPreviewList && order.entries.length > 1;

  int get _ratedOrderEntryCount =>
      order.entries.where((entry) => entry.hasProductReviewRating).length;

  String get _rateButtonLabel {
    if (_ratedOrderEntryCount == 0) {
      return 'Rate';
    }
    if (order.entries.length == 1 &&
        order.entries.first.isHighRatingReviewLocked) {
      return 'Rated';
    }
    if (_ratedOrderEntryCount >= order.entries.length) {
      return 'Edit Rating';
    }
    return 'Continue Rating';
  }

  List<OrderEntryData> get _visibleOrderEntries {
    if (!_usesProductPreviewList ||
        _showsAllOrderItems ||
        order.entries.length <= 1) {
      return order.entries;
    }
    return order.entries.take(1).toList(growable: false);
  }

  Widget _buildShowAllItemsButton(BuildContext context) {
    final theme = Theme.of(context);

    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton(
        onPressed: () {
          setState(() {
            _showsAllOrderItems = !_showsAllOrderItems;
          });
        },
        style: TextButton.styleFrom(
          foregroundColor: primaryColor,
          padding: EdgeInsets.zero,
          minimumSize: const Size(0, 32),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: Text(
          _showsAllOrderItems
              ? 'Show less'
              : 'Show all (${order.entries.length})',
          style: theme.textTheme.labelLarge?.copyWith(
            color: primaryColor,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Future<void> _handleCancelOrder(BuildContext context) async {
    final theme = Theme.of(context);
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final otherReasonController = TextEditingController();
    String selectedReason = _cancelOrderReasonOptions.first;
    final isPrepareStage = order.stage == OrderStageKey.toPrepare;

    final cancelReason = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: theme.cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            final isOtherReason =
                selectedReason == _cancelOrderOtherReasonOption;
            final normalizedOtherReason = otherReasonController.text.trim();
            final canConfirm =
                !isOtherReason || normalizedOtherReason.isNotEmpty;

            return SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  16,
                  12,
                  16,
                  16 + MediaQuery.of(dialogContext).viewInsets.bottom,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 42,
                        height: 4,
                        decoration: BoxDecoration(
                          color: theme.dividerColor.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Cancel Order',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      isPrepareStage
                          ? 'Choose a reason for requesting cancellation from $stageLabel.'
                          : 'Choose a reason for cancelling this order from $stageLabel.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: secondaryColor,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight:
                            MediaQuery.sizeOf(dialogContext).height * 0.45,
                      ),
                      child: SingleChildScrollView(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (final reason in _cancelOrderReasonOptions)
                              Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    setDialogState(() {
                                      selectedReason = reason;
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(18),
                                  child: Ink(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 10,
                                    ),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: Row(
                                      children: [
                                        Radio<String>(
                                          value: reason,
                                          groupValue: selectedReason,
                                          materialTapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                          visualDensity: const VisualDensity(
                                            horizontal: -4,
                                            vertical: -4,
                                          ),
                                          onChanged: (value) {
                                            if (value == null) {
                                              return;
                                            }
                                            setDialogState(() {
                                              selectedReason = value;
                                            });
                                          },
                                        ),
                                        Expanded(
                                          child: Text(
                                            reason,
                                            style: theme.textTheme.titleSmall
                                                ?.copyWith(
                                                  fontWeight: FontWeight.w700,
                                                ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            if (isOtherReason) ...[
                              const SizedBox(height: 8),
                              TextField(
                                controller: otherReasonController,
                                minLines: 2,
                                maxLines: 4,
                                onChanged: (_) => setDialogState(() {}),
                                decoration: const InputDecoration(
                                  labelText: 'Other reason',
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isPrepareStage
                          ? 'This request will be reviewed first in the employee dashboard before the order is cancelled.'
                          : 'This will remove the order from your $stageLabel list.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: secondaryColor,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 44,
                            child: OutlinedButton(
                              onPressed: () =>
                                  Navigator.of(dialogContext).pop(),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: theme.colorScheme.primary,
                                side: BorderSide(
                                  color: theme.colorScheme.primary,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              child: const Text('Keep'),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: SizedBox(
                            height: 44,
                            child: FilledButton(
                              onPressed: canConfirm
                                  ? () {
                                      Navigator.of(dialogContext).pop(
                                        isOtherReason
                                            ? normalizedOtherReason
                                            : selectedReason,
                                      );
                                    }
                                  : null,
                              style: FilledButton.styleFrom(
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              child: Text(
                                isPrepareStage
                                    ? 'Send Request'
                                    : 'Cancel Order',
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    otherReasonController.dispose();

    if (cancelReason == null) {
      return;
    }

    if (order.stage == OrderStageKey.toPrepare) {
      await OrderStore.instance.requestOrderGroupCancellation(
        order.createdAtEpochMs,
        cancelReason,
      );
    } else {
      await OrderStore.instance.removeOrderGroup(order.createdAtEpochMs);
    }
    if (!context.mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message: order.stage == OrderStageKey.toPrepare
          ? 'Cancellation request sent. Reason: $cancelReason'
          : 'Order cancelled. Reason: $cancelReason',
    );
  }

  Future<void> _handlePayFullAmount(BuildContext context) async {
    await OrderStore.instance.recordPaymentForOrderGroup(
      order.createdAtEpochMs,
      order.amountNeededToProceed,
    );
    if (!context.mounted) {
      return;
    }

    AppSnackBar.showSuccess(context, message: 'Payment recorded.');
  }

  Future<void> _handleReorder(BuildContext context) async {
    try {
      final catalogProducts = await createProductRepository().fetchProducts();
      final productsById = <String, Product>{
        for (final product in catalogProducts)
          product.id.trim().toLowerCase(): product,
      };

      final reorderItems = <BookingLineItem>[];
      var skippedEntryCount = 0;

      for (final entry in order.entries) {
        final product = productsById[entry.productId.trim().toLowerCase()];
        if (product == null) {
          skippedEntryCount += 1;
          continue;
        }

        final variant = _resolveReorderVariant(product, entry);
        final requiresVariant =
            entry.variantId.trim().isNotEmpty ||
            entry.variantName.trim().isNotEmpty;
        if (requiresVariant && variant == null) {
          skippedEntryCount += 1;
          continue;
        }

        final availableStock = resolveProductAvailableStock(
          product,
          variant: variant,
          catalogProducts: catalogProducts,
        );
        if (availableStock <= 0) {
          skippedEntryCount += 1;
          continue;
        }

        reorderItems.add(
          BookingLineItem.fromProduct(
            product: product,
            quantity: entry.quantity,
            selectedVariant: variant,
            availableStock: availableStock,
          ),
        );
      }

      if (!context.mounted) {
        return;
      }

      if (reorderItems.isEmpty) {
        AppSnackBar.showError(
          context,
          message: 'No available items could be reordered right now.',
        );
        return;
      }

      await openBookingPage(
        context,
        items: reorderItems,
        source: BookingFlowSource.directBuy,
      );

      if (!context.mounted) {
        return;
      }

      if (skippedEntryCount > 0) {
        AppSnackBar.showInfo(
          context,
          message:
              '$skippedEntryCount item${skippedEntryCount == 1 ? '' : 's'} could not be included in reorder.',
        );
      }
    } catch (_) {
      if (!context.mounted) {
        return;
      }

      AppSnackBar.showError(
        context,
        message: 'Unable to open reorder right now.',
      );
    }
  }

  Future<void> _handleOrderReceived(BuildContext context) async {
    await OrderStore.instance.markOrderGroupReceived(order.createdAtEpochMs);

    if (!context.mounted) {
      return;
    }

    AppSnackBar.showSuccess(
      context,
      message:
          'Order received confirmed. This stays in To Receive as your record.',
    );
  }

  void _handleTrackOrder(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => TackingPage(
          destinationAddress: order.clientAddress,
          customerName: order.clientName,
          deliveryPartnerName: order.deliveryPartnerName,
          orderLabel: order.headline,
          placedAtEpochMs: order.createdAtEpochMs,
        ),
      ),
    );
  }

  Future<void> _handleRateOrder(BuildContext context) async {
    if (order.entries.isEmpty) {
      return;
    }

    final didSaveReview = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => CommentRatePage(entry: order.entries.first),
      ),
    );

    if (!context.mounted || didSaveReview != true) {
      return;
    }

    AppSnackBar.showSuccess(context, message: 'Product review saved.');
  }

  Widget _buildToReceiveCard(BuildContext context) {
    final theme = Theme.of(context);
    final actionForegroundColor = theme.brightness == Brightness.dark
        ? Colors.black
        : Colors.white;
    final hasConfirmedReceipt = order.hasCustomerConfirmedReceipt;
    final paymentStageBadgeLabel = hasConfirmedReceipt
        ? 'Completed'
        : order.paymentOptionLabel.trim().isNotEmpty
        ? '${order.paymentOptionLabel.trim()} | $stageLabel'
        : stageLabel;
    final paymentStageBadgeColor = hasConfirmedReceipt
        ? const Color(0xFF2F7D4F)
        : primaryColor;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.zero,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      _formatOrderTimestamp(order.createdAtEpochMs),
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  _OrderStageBadge(
                    label: paymentStageBadgeLabel,
                    color: paymentStageBadgeColor,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, thickness: 0.2),
          const SizedBox(height: 14),
          Text(
            'Items (${order.itemCount} ${order.itemCount == 1 ? 'item' : 'items'})',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: secondaryColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          for (var index = 0; index < _visibleOrderEntries.length; index++) ...[
            _OrderProductItemTile(
              entry: _visibleOrderEntries[index],
              primaryColor: primaryColor,
              titleColor: titleColor,
              secondaryColor: secondaryColor,
            ),
            if (index < _visibleOrderEntries.length - 1)
              const SizedBox(height: 10),
          ],
          if (_canToggleOrderItems) ...[
            const SizedBox(height: 2),
            _buildShowAllItemsButton(context),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1, thickness: 0.2),
          const SizedBox(height: 10),
          _OrderDetailRow(
            label: 'Grand total',
            amount: order.grandTotalAmount,
            emphasizesValue: true,
            valueColor: titleColor,
          ),
          const SizedBox(height: 8),
          _OrderDetailRow(
            label: 'Remaining balance',
            amount: order.remainingBalanceAmount,
            emphasizesValue: true,
            valueColor: primaryColor,
          ),
          const SizedBox(height: 14),
          if (hasConfirmedReceipt) ...[
            Text(
              'This completed order stays here as your record.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: secondaryColor,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton(
                onPressed: () => _handleReorder(context),
                style: OutlinedButton.styleFrom(
                  foregroundColor: primaryColor,
                  side: BorderSide(color: primaryColor.withOpacity(0.28)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text('Reorder'),
                ),
              ),
            ),
          ] else
            SizedBox(
              width: double.infinity,
              height: 44,
              child: FilledButton(
                onPressed: () => _handleOrderReceived(context),
                style: FilledButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: actionForegroundColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text('Order Received'),
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (order.stage == OrderStageKey.toReceive) {
      return _buildToReceiveCard(context);
    }

    final errorColor = theme.colorScheme.error;
    final usesToReceiveHeaderFormat = true;
    final usesFullWidthStageLayout = _usesFullWidthOrderStageLayout(
      order.stage,
    );
    final usesEdgeToEdgeStageShell = _usesEdgeToEdgeOrderStageShell(
      order.stage,
    );
    final payButtonForegroundColor = theme.brightness == Brightness.dark
        ? Colors.black
        : Colors.white;
    const completedColor = Color(0xFF2F7D4F);
    final payButtonTextStyle = theme.textTheme.labelMedium?.copyWith(
      color: payButtonForegroundColor,
      fontWeight: FontWeight.w800,
    );
    final headerMetaStyle = theme.textTheme.titleMedium?.copyWith(
      color: secondaryColor,
      fontWeight: FontWeight.w600,
    );
    final displayedPaymentOptionLabel = order.paymentOptionLabel;
    final displayedOrderTotalAmount =
        order.stage == OrderStageKey.toPrepare ||
            order.stage == OrderStageKey.toShip
        ? order.remainingBalanceAmount
        : order.grandTotalAmount;
    final isCancelledInPrepareGracePeriod = order.showsCancelledState;
    final paymentStagePrefixLabel = displayedPaymentOptionLabel.trim();
    final headerTitle = usesToReceiveHeaderFormat
        ? _formatOrderTimestamp(order.createdAtEpochMs)
        : order.headline;
    final String? headerSubtitle = usesToReceiveHeaderFormat
        ? null
        : _formatOrderTimestamp(order.createdAtEpochMs);
    final cancelVisibilityUntilLabel = order.cancelDisplayExpiresAtEpochMs > 0
        ? _formatOrderTimestamp(order.cancelDisplayExpiresAtEpochMs)
        : '';
    final headerBadgeLabel = isCancelledInPrepareGracePeriod
        ? 'Cancelled'
        : order.stage == OrderStageKey.toReview
        ? 'Completed'
        : paymentStagePrefixLabel.isNotEmpty
        ? '$paymentStagePrefixLabel | $stageLabel'
        : stageLabel;
    final headerBadgeColor = isCancelledInPrepareGracePeriod
        ? errorColor
        : order.stage == OrderStageKey.toReview
        ? completedColor
        : primaryColor;

    return Container(
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: usesEdgeToEdgeStageShell
            ? BorderRadius.zero
            : BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (usesToReceiveHeaderFormat)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        headerTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: titleColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    _OrderStageBadge(
                      label: headerBadgeLabel,
                      color: headerBadgeColor,
                    ),
                  ],
                ),
              ],
            )
          else
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        headerTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: titleColor,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if (headerSubtitle != null) ...[
                        const SizedBox(height: 4),
                        Text(headerSubtitle, style: headerMetaStyle),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                _OrderStageBadge(
                  label: headerBadgeLabel,
                  color: headerBadgeColor,
                ),
              ],
            ),
          if (usesToReceiveHeaderFormat) ...[
            const SizedBox(height: 14),
            const Divider(height: 1, thickness: 0.2),
            const SizedBox(height: 14),
          ] else if (usesFullWidthStageLayout) ...[
            const SizedBox(height: 12),
            const Divider(height: 1, thickness: 0.2),
            const SizedBox(height: 14),
          ] else
            const SizedBox(height: 14),
          Text(
            'Items (${order.itemCount} ${order.itemCount == 1 ? 'item' : 'items'})',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: secondaryColor,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          for (var index = 0; index < _visibleOrderEntries.length; index++) ...[
            _OrderProductItemTile(
              entry: _visibleOrderEntries[index],
              primaryColor: primaryColor,
              titleColor: titleColor,
              secondaryColor: secondaryColor,
            ),
            if (index < _visibleOrderEntries.length - 1)
              const SizedBox(height: 10),
          ],
          if (_canToggleOrderItems) ...[
            const SizedBox(height: 2),
            _buildShowAllItemsButton(context),
          ],
          const Divider(height: 1, thickness: 0.2),
          if (order.stage == OrderStageKey.toPay) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 42,
                    child: OutlinedButton(
                      onPressed: () => _handleCancelOrder(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        side: BorderSide(color: errorColor.withOpacity(0.35)),
                        foregroundColor: errorColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text('Cancel'),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: 42,
                    child: FilledButton(
                      onPressed: () => _handlePayFullAmount(context),
                      style: FilledButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: payButtonForegroundColor,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(text: 'Pay ', style: payButtonTextStyle),
                              TextSpan(
                                text: formatPesoCurrency(
                                  order.amountNeededToProceed,
                                ),
                                style: GoogleFonts.roboto(
                                  color: payButtonTextStyle?.color,
                                  fontSize: payButtonTextStyle?.fontSize,
                                  fontWeight: payButtonTextStyle?.fontWeight,
                                  height: payButtonTextStyle?.height ?? 1,
                                ),
                              ),
                            ],
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ] else if (order.stage == OrderStageKey.toPrepare) ...[
            if (isCancelledInPrepareGracePeriod) ...[
              const SizedBox(height: 8),
              Text(
                cancelVisibilityUntilLabel.isNotEmpty
                    ? 'This cancelled order stays here until $cancelVisibilityUntilLabel. Reorder is available before it disappears from To Prepare.'
                    : 'This cancelled order will stay here for 1 day. Reorder is available until it disappears from To Prepare.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: secondaryColor,
                  height: 1.4,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: SizedBox(
                width: 180,
                height: 42,
                child: OutlinedButton(
                  onPressed: isCancelledInPrepareGracePeriod
                      ? () => _handleReorder(context)
                      : order.isCancelRequestPending
                      ? null
                      : () => _handleCancelOrder(context),
                  style: ButtonStyle(
                    padding: const WidgetStatePropertyAll(
                      EdgeInsets.symmetric(horizontal: 10),
                    ),
                    foregroundColor: WidgetStateProperty.resolveWith((states) {
                      if (states.contains(WidgetState.disabled)) {
                        return primaryColor.withOpacity(0.82);
                      }
                      return primaryColor;
                    }),
                    backgroundColor: WidgetStateProperty.resolveWith((states) {
                      if (states.contains(WidgetState.disabled)) {
                        return primaryColor.withOpacity(0.06);
                      }
                      return Colors.transparent;
                    }),
                    side: WidgetStateProperty.resolveWith((states) {
                      if (states.contains(WidgetState.disabled)) {
                        return BorderSide(
                          color: primaryColor.withOpacity(0.38),
                        );
                      }
                      return BorderSide(color: primaryColor);
                    }),
                    shape: WidgetStatePropertyAll(
                      RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      isCancelledInPrepareGracePeriod
                          ? 'Reorder'
                          : order.isCancelRequestPending
                          ? 'Processing..'
                          : 'Cancel Order',
                    ),
                  ),
                ),
              ),
            ),
          ] else if (order.stage == OrderStageKey.toShip) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: SizedBox(
                width: 180,
                height: 42,
                child: FilledButton(
                  onPressed: () => _handleTrackOrder(context),
                  style: FilledButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: payButtonForegroundColor,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text('Track'),
                  ),
                ),
              ),
            ),
          ] else if (order.stage == OrderStageKey.toReview) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: SizedBox(
                width: 180,
                height: 42,
                child: FilledButton(
                  onPressed:
                      order.entries.length == 1 &&
                          order.entries.first.isHighRatingReviewLocked
                      ? null
                      : () => _handleRateOrder(context),
                  style: FilledButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: payButtonForegroundColor,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(_rateButtonLabel),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

const List<String> _cancelOrderReasonOptions = <String>[
  'Changed my mind',
  'Wrong item or order details',
  'Need to update delivery details',
  'Found a better option',
  'Other',
];

const String _cancelOrderOtherReasonOption = 'Other';

bool _usesFullWidthOrderStageLayout(OrderStageKey? stageKey) {
  return stageKey == OrderStageKey.toPay || stageKey == OrderStageKey.toPrepare;
}

bool _usesEdgeToEdgeOrderStageShell(OrderStageKey? stageKey) {
  return _usesFullWidthOrderStageLayout(stageKey) ||
      stageKey == OrderStageKey.toShip ||
      stageKey == OrderStageKey.toReceive ||
      stageKey == OrderStageKey.toReview ||
      stageKey == OrderStageKey.returnRequest;
}

class _OrderStageBadge extends StatelessWidget {
  const _OrderStageBadge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _OrderProductItemTile extends StatelessWidget {
  const _OrderProductItemTile({
    required this.entry,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
  });

  final OrderEntryData entry;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final imageUrl = entry.productImageUrl.trim();

    return DecoratedBox(
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 54,
                height: 54,
                child: imageUrl.isNotEmpty
                    ? ColoredBox(
                        color: Colors.white,
                        child: Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return DecoratedBox(
                              decoration: BoxDecoration(
                                color: primaryColor.withOpacity(0.14),
                              ),
                              child: Icon(
                                Icons.inventory_2_outlined,
                                color: primaryColor,
                                size: 20,
                              ),
                            );
                          },
                        ),
                      )
                    : DecoratedBox(
                        decoration: BoxDecoration(
                          color: primaryColor.withOpacity(0.14),
                        ),
                        child: Icon(
                          Icons.inventory_2_outlined,
                          color: primaryColor,
                          size: 20,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.productName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: titleColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    [
                      if (entry.variantName.trim().isNotEmpty)
                        entry.variantName.trim(),
                      'Qty ${entry.quantity}',
                    ].join(' | '),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: secondaryColor,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            _OrderPriceText(
              amount: entry.totalPrice,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: titleColor,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderDetailRow extends StatelessWidget {
  const _OrderDetailRow({
    required this.label,
    this.value,
    this.amount,
    this.emphasizesValue = false,
    this.valueColor,
  }) : assert(
         (value == null) != (amount == null),
         'Provide either value or amount.',
       );

  final String label;
  final String? value;
  final double? amount;
  final bool emphasizesValue;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);
    final resolvedValueStyle = theme.textTheme.bodyMedium?.copyWith(
      color: valueColor,
      fontWeight: emphasizesValue ? FontWeight.w800 : FontWeight.w700,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: emphasizesValue ? null : secondaryColor,
                fontWeight: emphasizesValue ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: amount != null
                ? Align(
                    alignment: Alignment.centerRight,
                    child: _OrderPriceText(
                      amount: amount!,
                      style: resolvedValueStyle,
                    ),
                  )
                : Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      value!,
                      textAlign: TextAlign.right,
                      style: resolvedValueStyle,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _OrderStagesCarousel extends StatelessWidget {
  const _OrderStagesCarousel({
    required this.stages,
    required this.stageCounts,
    required this.selectedIndex,
    required this.backgroundColor,
    required this.activeColor,
    required this.inactiveColor,
    required this.onTap,
  });

  static const double height = 38;

  final List<_OrderStage> stages;
  final List<int> stageCounts;
  final int selectedIndex;
  final Color backgroundColor;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<int> onTap;

  int _countForIndex(int index) {
    if (index < 0 || index >= stageCounts.length) {
      return 0;
    }
    return stageCounts[index];
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            offset: const Offset(0, 10),
            blurRadius: 18,
            spreadRadius: -4,
          ),
        ],
      ),
      child: SizedBox(
        height: height,
        child: HorizontalEndFade(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 0, 24, 0),
            scrollDirection: Axis.horizontal,
            itemCount: stages.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final isActive = selectedIndex == index;
              final stageCount = _countForIndex(index);
              final foregroundColor = isActive ? activeColor : inactiveColor;
              final badgeBackgroundColor = isActive
                  ? activeColor.withOpacity(0.14)
                  : inactiveColor.withOpacity(0.12);

              return InkWell(
                onTap: () => onTap(index),
                borderRadius: BorderRadius.circular(4),
                overlayColor: const WidgetStatePropertyAll(Colors.transparent),
                splashFactory: NoSplash.splashFactory,
                highlightColor: Colors.transparent,
                splashColor: Colors.transparent,
                hoverColor: Colors.transparent,
                focusColor: Colors.transparent,
                child: AnimatedContainer(
                  duration: appMotionFrames(11),
                  padding: const EdgeInsets.fromLTRB(4, 6, 4, 8),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: isActive ? activeColor : Colors.transparent,
                        width: 2,
                      ),
                    ),
                  ),
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          stages[index].label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textHeightBehavior: const TextHeightBehavior(
                            applyHeightToFirstAscent: false,
                            applyHeightToLastDescent: false,
                          ),
                          style: Theme.of(context).textTheme.labelMedium
                              ?.copyWith(
                                color: foregroundColor,
                                fontWeight: FontWeight.w700,
                                height: 1,
                              ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          constraints: const BoxConstraints(minWidth: 18),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: badgeBackgroundColor,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '$stageCount',
                            textAlign: TextAlign.center,
                            textHeightBehavior: const TextHeightBehavior(
                              applyHeightToFirstAscent: false,
                              applyHeightToLastDescent: false,
                            ),
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(
                                  color: foregroundColor,
                                  fontWeight: FontWeight.w800,
                                  height: 1,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _OrderPriceText extends StatelessWidget {
  const _OrderPriceText({required this.amount, this.style});

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(amount: amount, style: style);
  }
}

String _formatOrderTimestamp(int epochMs) {
  final dateTime = DateTime.fromMillisecondsSinceEpoch(epochMs);
  const months = <String>[
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final hour = dateTime.hour % 12 == 0 ? 12 : dateTime.hour % 12;
  final minute = dateTime.minute.toString().padLeft(2, '0');
  final suffix = dateTime.hour >= 12 ? 'PM' : 'AM';

  return '${months[dateTime.month - 1]} ${dateTime.day}, ${dateTime.year} - $hour:$minute $suffix';
}

ProductVariant? _resolveReorderVariant(Product product, OrderEntryData entry) {
  final variantFromId = findProductVariantById(product, entry.variantId);
  if (variantFromId != null) {
    return variantFromId;
  }

  final normalizedVariantName = entry.variantName.trim().toLowerCase();
  if (normalizedVariantName.isEmpty) {
    return null;
  }

  for (final variant in product.variants) {
    if (variant.name.trim().toLowerCase() == normalizedVariantName) {
      return variant;
    }
  }

  return null;
}

double _requiredCodDeposit(double grandTotalAmount) {
  final tenPercent = grandTotalAmount * 0.10;
  final minimumDeposit = tenPercent < 500 ? 500.0 : tenPercent;
  return grandTotalAmount < minimumDeposit ? grandTotalAmount : minimumDeposit;
}
