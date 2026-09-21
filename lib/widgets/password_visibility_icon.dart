import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:switch_app/theme/app_theme.dart';

/// Lucide eye / eye-closed icons for password visibility toggles.
///
/// [obscured] true = password hidden → eye
/// [obscured] false = password visible → eye-closed
class PasswordVisibilityIcon extends StatelessWidget {
  const PasswordVisibilityIcon({
    super.key,
    required this.obscured,
    this.color,
    this.size = 22,
  });

  final bool obscured;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iconColor =
        color ?? appIconColorForBrightness(theme.brightness);

    return SvgPicture.asset(
      obscured ? 'assets/icons/eye.svg' : 'assets/icons/eye-closed.svg',
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
    );
  }
}
