import 'package:flutter/foundation.dart';

class OrderTabNavigationRequest {
  const OrderTabNavigationRequest({
    required this.requestId,
    required this.orderStageIndex,
  });

  final int requestId;
  final int orderStageIndex;
}

class OrderTabNavigation {
  OrderTabNavigation._();

  static final OrderTabNavigation instance = OrderTabNavigation._();

  final ValueNotifier<OrderTabNavigationRequest> requestNotifier =
      ValueNotifier<OrderTabNavigationRequest>(
    const OrderTabNavigationRequest(
      requestId: 0,
      orderStageIndex: 0,
    ),
  );

  void openToPay() {
    _openStage(0);
  }

  void openToPrepare() {
    _openStage(1);
  }

  void openToReceive() {
    _openStage(3);
  }

  void openToReview() {
    _openStage(4);
  }

  void _openStage(int orderStageIndex) {
    final currentRequest = requestNotifier.value;
    requestNotifier.value = OrderTabNavigationRequest(
      requestId: currentRequest.requestId + 1,
      orderStageIndex: orderStageIndex,
    );
  }
}
