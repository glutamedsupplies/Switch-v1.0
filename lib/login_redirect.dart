import 'package:flutter/material.dart';
import 'package:switch_app/guest_session.dart';
import 'package:switch_app/login.dart';
import 'package:switch_app/platform_login_redirect.dart';

Future<void> redirectGuestToLogin(
  BuildContext context, {
  ValueNotifier<ThemeMode>? themeModeNotifier,
}) async {
  await GuestSession.clear();

  if (redirectToLoginHtmlIfSupported()) {
    return;
  }

  final resolvedThemeModeNotifier =
      themeModeNotifier ?? ValueNotifier<ThemeMode>(ThemeMode.system);

  if (!context.mounted) {
    return;
  }

  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute<void>(
      builder: (_) => LoginPage(
        themeModeNotifier: resolvedThemeModeNotifier,
      ),
    ),
    (route) => false,
  );
}
