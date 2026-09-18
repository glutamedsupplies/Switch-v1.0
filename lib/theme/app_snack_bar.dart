import 'dart:async';

import 'package:flutter/material.dart';

class AppSnackBar {
  static const Duration _defaultDuration = Duration(seconds: 3);

  static OverlayEntry? _entry;
  static Timer? _timer;

  static void showSuccess(
    BuildContext context, {
    required String message,
    IconData icon = Icons.check_circle_outline_rounded,
    Color iconColor = Colors.green,
    Duration duration = _defaultDuration,
  }) {
    _show(context, message: message, duration: duration);
  }

  static void showError(
    BuildContext context, {
    required String message,
    IconData icon = Icons.error_outline_rounded,
    Color iconColor = Colors.red,
    Duration duration = _defaultDuration,
  }) {
    _show(context, message: message, duration: duration);
  }

  static void showInfo(
    BuildContext context, {
    required String message,
    IconData icon = Icons.info_outline_rounded,
    Color iconColor = Colors.blue,
    Duration duration = _defaultDuration,
  }) {
    _show(context, message: message, duration: duration);
  }

  static void _dismiss() {
    _timer?.cancel();
    _timer = null;
    _entry?.remove();
    _entry = null;
  }

  static void _show(
    BuildContext context, {
    required String message,
    required Duration duration,
  }) {
    // Present after the current frame so toasts still show when called
    // right after a loading dialog / sheet closes.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;

      final overlay = Overlay.maybeOf(context, rootOverlay: true);
      if (overlay == null) return;

      _dismiss();

      final media = MediaQuery.maybeOf(context);
      final bottomInset = media?.viewPadding.bottom ?? 0;
      // Keep clear of system gesture bar + common bottom nav height.
      final bottom = bottomInset + 72;

      late final OverlayEntry entry;
      entry = OverlayEntry(
        builder: (overlayContext) {
          return IgnorePointer(
            ignoring: true,
            child: Stack(
              children: [
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: bottom,
                  child: Material(
                    color: Colors.transparent,
                    child: SafeArea(
                      top: false,
                      bottom: false,
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 560),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: const Color(0xFF323232),
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x33000000),
                                  blurRadius: 18,
                                  offset: Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              child: DefaultTextStyle(
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  height: 1.3,
                                  fontWeight: FontWeight.w500,
                                ),
                                child: Text(message),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      );

      _entry = entry;
      overlay.insert(entry);
      _timer = Timer(duration, _dismiss);
    });
  }
}
