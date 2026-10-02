import 'dart:async';

import 'package:flutter/widgets.dart';

/// Drops a pop-up (bottom sheet, dialog, menu) that lands on top of an
/// identical pop-up opened moments earlier, so rapid repeated taps on the
/// same trigger only ever show one modal. Different pop-ups stacked on purpose
/// (a confirm dialog over a sheet) and later re-opens are untouched.
class SingleModalGuardObserver extends NavigatorObserver {
  SingleModalGuardObserver({
    this.duplicateWindow = const Duration(milliseconds: 700),
  });

  final Duration duplicateWindow;
  final Expando<DateTime> _pushedAt = Expando<DateTime>('modalPushedAt');

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    if (route is! PopupRoute) return;

    final now = DateTime.now();
    final previousPushedAt = previousRoute == null
        ? null
        : _pushedAt[previousRoute];
    final isDuplicate =
        previousRoute is PopupRoute &&
        previousRoute.runtimeType == route.runtimeType &&
        previousPushedAt != null &&
        now.difference(previousPushedAt) < duplicateWindow;

    if (!isDuplicate) {
      _pushedAt[route] = now;
      return;
    }

    scheduleMicrotask(() {
      final navigator = route.navigator;
      if (navigator == null || !route.isActive) return;
      navigator.removeRoute(route);
    });
  }
}
