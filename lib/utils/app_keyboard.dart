import 'package:flutter/material.dart';

void dismissAppKeyboard() {
  FocusManager.instance.primaryFocus?.unfocus();
}

class AppKeyboardDismissObserver extends NavigatorObserver {
  void _dismissKeyboard() {
    dismissAppKeyboard();
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _dismissKeyboard();
    super.didPush(route, previousRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _dismissKeyboard();
    super.didPop(route, previousRoute);
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _dismissKeyboard();
    super.didRemove(route, previousRoute);
  }

  @override
  void didReplace({
    Route<dynamic>? newRoute,
    Route<dynamic>? oldRoute,
  }) {
    _dismissKeyboard();
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
  }

  @override
  void didStartUserGesture(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _dismissKeyboard();
    super.didStartUserGesture(route, previousRoute);
  }
}
