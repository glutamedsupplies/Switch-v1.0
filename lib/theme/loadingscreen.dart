import 'dart:async';

import 'package:flutter/material.dart';
import 'package:gms_shopping/utils/app_keyboard.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:lottie/lottie.dart';

class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});

  /// Lottie converted from the Switch mark — steady logo, stroke trim loading.
  static const String logoLottiePath =
      'assets/animations/switch_logo_loading.json';

  static Future<T> showWhile<T>(
    BuildContext context,
    FutureOr<T> Function() action, {
    Duration minimumDuration = const Duration(milliseconds: 450),
  }) async {
    dismissAppKeyboard();
    final navigator = Navigator.of(context, rootNavigator: true);
    final theme = Theme.of(context);
    final barrierColor = theme.colorScheme.scrim.withValues(
      alpha: theme.brightness == Brightness.dark ? 0.52 : 0.28,
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
    return const PopScope(
      canPop: false,
      child: _SwitchLottieLoader(),
    );
  }
}

class _SwitchLottieLoader extends StatelessWidget {
  const _SwitchLottieLoader();

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: Center(
        child: SizedBox(
          width: 92,
          height: 92,
          child: Lottie.asset(
            LoadingScreen.logoLottiePath,
            frameRate: appLottieFrameRate,
            repeat: true,
            animate: true,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
