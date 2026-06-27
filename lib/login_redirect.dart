import 'package:flutter/material.dart';
import 'package:gms_shopping/guest_session.dart';
import 'package:gms_shopping/login.dart';
import 'package:gms_shopping/platform_login_redirect.dart';

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
