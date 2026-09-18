import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';

const String _buyerRightPanelChevronLeftSvg =
    '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>''';

/// Shared header for every buyer right-side panel and account sub-view.
/// Its geometry intentionally matches the centered Invite Friends header.
class BuyerRightPanelHeader extends StatelessWidget {
  const BuyerRightPanelHeader({
    super.key,
    required this.title,
    required this.titleColor,
    required this.onBack,
    this.trailing,
  });

  final String title;
  final Color titleColor;
  final VoidCallback onBack;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
      child: SizedBox(
        height: 40,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                tooltip: 'Back',
                onPressed: onBack,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints.tightFor(
                  width: 36,
                  height: 40,
                ),
                icon: SvgPicture.string(
                  _buyerRightPanelChevronLeftSvg,
                  width: 24,
                  height: 24,
                  colorFilter: ColorFilter.mode(titleColor, BlendMode.srcIn),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 48),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  title,
                  maxLines: 1,
                  softWrap: false,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: titleColor,
                    fontSize: 26,
                    height: 1,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            if (trailing != null)
              Align(
                alignment: Alignment.centerRight,
                child: SizedBox(width: 36, height: 40, child: trailing),
              ),
          ],
        ),
      ),
    );
  }
}

/// Keeps the real system status/nav bars transparent.
/// Only while the sidebar is open, paints white (status) + gray (nav) strips
/// above the panel — those overlays are inactive when the sidebar is closed.
abstract final class BuyerRightPanelHost {
  static const Color statusBarOverlayColor = Colors.white;
  static const Color navigationBarOverlayColor = Color(0xFFD1D5DB);

  /// App default: transparent system bars (unchanged when sidebar is closed).
  static SystemUiOverlayStyle transparentOverlayStyle({required bool isDark}) {
    return SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: isDark
          ? Brightness.light
          : Brightness.dark,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarContrastEnforced: false,
    );
  }

  static Future<void> show({
    required BuildContext context,
    required String barrierLabel,
    required Widget panel,
  }) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final transparentStyle = transparentOverlayStyle(isDark: isDark);

    // System bars stay transparent; only Flutter overlays show white/gray.
    SystemChrome.setSystemUIOverlayStyle(transparentStyle);

    try {
      await showGeneralDialog<void>(
        context: context,
        barrierDismissible: true,
        barrierLabel: barrierLabel,
        barrierColor: Colors.transparent,
        transitionDuration: appMotionFrames(14),
        pageBuilder: (context, animation, secondaryAnimation) {
          final padding = MediaQuery.paddingOf(context);
          final curved = CurvedAnimation(
            parent: animation,
            curve: Curves.easeOutCubic,
            reverseCurve: Curves.easeInCubic,
          );

          return AnnotatedRegion<SystemUiOverlayStyle>(
            value: transparentStyle,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Scrim: tap outside the sidebar closes the whole panel
                // (bypasses nested PopScope history).
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    Navigator.of(context).maybePop();
                  },
                  child: FadeTransition(
                    opacity: curved,
                    child: const ColoredBox(color: Color(0x47000000)),
                  ),
                ),
                SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(1, 0),
                    end: Offset.zero,
                  ).animate(curved),
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: Padding(
                      padding: EdgeInsets.only(
                        top: padding.top,
                        bottom: padding.bottom,
                      ),
                      child: panel,
                    ),
                  ),
                ),
                // Active only while this dialog is open.
                if (padding.top > 0)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: padding.top,
                    child: const ColoredBox(color: statusBarOverlayColor),
                  ),
                if (padding.bottom > 0)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: padding.bottom,
                    child: const ColoredBox(color: navigationBarOverlayColor),
                  ),
              ],
            ),
          );
        },
        transitionBuilder: (context, animation, secondaryAnimation, child) {
          return child;
        },
      );
    } finally {
      // Sidebar closed → overlays gone; system bars stay transparent.
      SystemChrome.setSystemUIOverlayStyle(transparentStyle);
    }
  }
}
