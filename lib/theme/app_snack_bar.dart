import 'package:flutter/material.dart';

class AppSnackBar {
  static const Duration _defaultDuration = Duration(seconds: 3);

  static void showSuccess(
    BuildContext context, {
    required String message,
    IconData icon = Icons.check_circle_outline_rounded,
    Color iconColor = Colors.green,
    Duration duration = _defaultDuration,
  }) {
    _show(
      context,
      message: message,
      duration: duration,
    );
  }

  static void showError(
    BuildContext context, {
    required String message,
    IconData icon = Icons.error_outline_rounded,
    Color iconColor = Colors.red,
    Duration duration = _defaultDuration,
  }) {
    _show(
      context,
      message: message,
      duration: duration,
    );
  }

  static void showInfo(
    BuildContext context, {
    required String message,
    IconData icon = Icons.info_outline_rounded,
    Color iconColor = Colors.blue,
    Duration duration = _defaultDuration,
  }) {
    _show(
      context,
      message: message,
      duration: duration,
    );
  }

  static void _show(
    BuildContext context, {
    required String message,
    required Duration duration,
  }) {
    final messenger = ScaffoldMessenger.maybeOf(context);
    if (messenger == null) {
      return;
    }

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          duration: duration,
          behavior: SnackBarBehavior.fixed,
        ),
      );
  }
}
