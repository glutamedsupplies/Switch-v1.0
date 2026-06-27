import 'dart:async';

import 'package:flutter/material.dart';
import 'package:gms_shopping/utils/app_keyboard.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';

class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});

  static Future<T> showWhile<T>(
    BuildContext context,
    FutureOr<T> Function() action, {
    Duration minimumDuration = const Duration(milliseconds: 750),
  }) async {
    dismissAppKeyboard();
    final navigator = Navigator.of(context, rootNavigator: true);
    final theme = Theme.of(context);
    final barrierColor = theme.colorScheme.scrim.withOpacity(
      theme.brightness == Brightness.dark ? 0.48 : 0.22,
    );
    var isDialogOpen = true;

    unawaited(
      showGeneralDialog<void>(
        context: context,
        barrierDismissible: false,
        barrierLabel: 'Loading',
        barrierColor: barrierColor,
        transitionDuration: appMotionFrames(7),
        pageBuilder: (context, animation, secondaryAnimation) =>
            const LoadingScreen(),
        transitionBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
      ).then((_) {
        isDialogOpen = false;
      }),
    );

    await Future<void>.delayed(Duration.zero);
    final stopwatch = Stopwatch()..start();

    try {
      final result = await action();
      final remainingDuration = minimumDuration - stopwatch.elapsed;

      if (remainingDuration > Duration.zero) {
        await Future<void>.delayed(remainingDuration);
      }

      return result;
    } finally {
      if (isDialogOpen && navigator.mounted) {
        navigator.pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return const WillPopScope(
      onWillPop: _preventPop,
      child: _LoadingModalBody(),
    );
  }

  static Future<bool> _preventPop() async => false;
}

class _LoadingModalBody extends StatelessWidget {
  const _LoadingModalBody();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      type: MaterialType.transparency,
      child: Center(
        child: SizedBox(
          width: 34,
          height: 34,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            color: theme.colorScheme.primary,
          ),
        ),
      ),
    );
  }
}
