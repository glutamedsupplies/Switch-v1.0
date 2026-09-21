import 'package:flutter/material.dart';
import 'package:switch_app/utils/motion_60fps.dart';
import 'package:switch_app/theme/default_font.dart';
import 'package:google_fonts/google_fonts.dart';

// Default light accent matches Super Admin default (--accent rgb(37, 99, 235)).
// Live workspace color from Super Admin overrides this via WorkspaceThemeSync.
const Color appPrimaryColor = Color(0xFF2563EB);
const Color appLightTextPrimary = Color(0xFF162033); // --text-primary
const Color appLightTextSecondary = Color(0xFF52607A); // --text-secondary
const Color appLightDashboardColor = Color(0xFFFFFFFF); // --surface
const Color appInputErrorColor = Color(0xFFE53935);

/// Default icon stroke/fill for light mode (not pure black).
const Color appIconColor = Color(0xFF6B7280);

/// Default icon stroke/fill for dark mode.
const Color appDarkIconColor = Color(0xFF9CA3AF);

Color appIconColorForBrightness(Brightness brightness) {
  return brightness == Brightness.dark ? appDarkIconColor : appIconColor;
}

/// Hides error message text while still enabling the red error border.
const TextStyle appInputBorderOnlyErrorStyle = TextStyle(
  color: Colors.transparent,
  fontSize: 0,
  height: 0,
);

int _mixWithWhite(int channel, double amount) {
  return (channel + (255 - channel) * amount).round().clamp(0, 255);
}

int _mixWithBlack(int channel, double amount) {
  return (channel * (1 - amount)).round().clamp(0, 255);
}

Color _mixColorWithWhite(Color color, double amount) {
  final r = (color.r * 255.0).round();
  final g = (color.g * 255.0).round();
  final b = (color.b * 255.0).round();
  return Color.fromARGB(
    255,
    _mixWithWhite(r, amount),
    _mixWithWhite(g, amount),
    _mixWithWhite(b, amount),
  );
}

Color _mixColorWithBlack(Color color, double amount) {
  final r = (color.r * 255.0).round();
  final g = (color.g * 255.0).round();
  final b = (color.b * 255.0).round();
  return Color.fromARGB(
    255,
    _mixWithBlack(r, amount),
    _mixWithBlack(g, amount),
    _mixWithBlack(b, amount),
  );
}

Color _onAccentColor(Color accent) {
  return accent.computeLuminance() > 0.58 ? Colors.black : Colors.white;
}

const Color appDarkPrimaryColor = Color(0xFFE4F75D);
const Color appDarkScaffoldColor = Colors.black;
const Color appDarkCardColor = Colors.black;
const Color appDarkDashboardColor = Colors.black;
const double appButtonRadius = 999;

/// Global default letter spacing for all theme text styles.
/// Change this once — local `letterSpacing` overrides should stay rare
/// (e.g. bottom nav bar).
const double appLetterSpacing = -0.35;

TextTheme applyAppLetterSpacing(TextTheme base) {
  TextStyle? spaced(TextStyle? style) {
    return style?.copyWith(letterSpacing: appLetterSpacing);
  }

  return base.copyWith(
    displayLarge: spaced(base.displayLarge),
    displayMedium: spaced(base.displayMedium),
    displaySmall: spaced(base.displaySmall),
    headlineLarge: spaced(base.headlineLarge),
    headlineMedium: spaced(base.headlineMedium),
    headlineSmall: spaced(base.headlineSmall),
    titleLarge: spaced(base.titleLarge),
    titleMedium: spaced(base.titleMedium),
    titleSmall: spaced(base.titleSmall),
    bodyLarge: spaced(base.bodyLarge),
    bodyMedium: spaced(base.bodyMedium),
    bodySmall: spaced(base.bodySmall),
    labelLarge: spaced(base.labelLarge),
    labelMedium: spaced(base.labelMedium),
    labelSmall: spaced(base.labelSmall),
  );
}

/// Shared app-page motion used by normal routes (including Cart) and the
/// in-place platform navigation on the Home screen.
final Duration appPageTransitionDuration = appMotionFrames(20);

const PageTransitionsTheme _appPageTransitionsTheme = PageTransitionsTheme(
  builders: {
    TargetPlatform.android: _CascadePageTransitionsBuilder(),
    TargetPlatform.iOS: _CascadePageTransitionsBuilder(),
    TargetPlatform.linux: _CascadePageTransitionsBuilder(),
    TargetPlatform.macOS: _CascadePageTransitionsBuilder(),
    TargetPlatform.windows: _CascadePageTransitionsBuilder(),
    TargetPlatform.fuchsia: _CascadePageTransitionsBuilder(),
  },
);

const WidgetStateProperty<Color?> _transparentOverlayColor =
    WidgetStatePropertyAll(Colors.transparent);

ButtonStyle _appButtonStyle({
  Color? foregroundColor,
  Color? backgroundColor,
  EdgeInsetsGeometry? padding,
  OutlinedBorder? shape,
  WidgetStateProperty<TextStyle?>? textStyle,
}) {
  return ButtonStyle(
    foregroundColor: foregroundColor == null
        ? null
        : WidgetStatePropertyAll(foregroundColor),
    backgroundColor: backgroundColor == null
        ? null
        : WidgetStatePropertyAll(backgroundColor),
    padding: padding == null ? null : WidgetStatePropertyAll(padding),
    shape: WidgetStatePropertyAll(
      shape ??
          RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(appButtonRadius),
          ),
    ),
    overlayColor: _transparentOverlayColor,
    splashFactory: NoSplash.splashFactory,
    textStyle: textStyle,
  );
}

List<Color> appLoginBackgroundColors({
  required ThemeData theme,
  required bool isDark,
}) {
  final backgroundAccent = isDark ? appDarkCardColor : appLightDashboardColor;

  return [backgroundAccent.withOpacity(0.55), theme.scaffoldBackgroundColor];
}

WidgetStateProperty<TextStyle?> _pressedTextButtonStyle({
  required FontWeight fontWeight,
}) {
  return WidgetStateProperty.resolveWith((states) {
    final isPressed = states.contains(WidgetState.pressed);

    return GoogleFonts.getFont(
      defaultFontFamily,
      fontSize: isPressed ? 13 : 14,
      fontWeight: fontWeight,
      letterSpacing: appLetterSpacing,
    );
  });
}

const SnackBarThemeData _appSnackBarTheme = SnackBarThemeData(
  behavior: SnackBarBehavior.floating,
  elevation: 8,
  insetPadding: EdgeInsets.fromLTRB(16, 0, 16, 72),
);

CheckboxThemeData _appCheckboxTheme({
  required Color activeColor,
  required Color foregroundColor,
}) {
  return CheckboxThemeData(
    fillColor: WidgetStateProperty.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return activeColor;
      }

      return Colors.transparent;
    }),
    checkColor: WidgetStatePropertyAll(foregroundColor),
    overlayColor: const WidgetStatePropertyAll(Colors.transparent),
  );
}

OutlineInputBorder _appInputBorder({required Color color, double width = 1.0}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(16),
    borderSide: BorderSide(color: color, width: width),
  );
}

class _CascadePageTransitionsBuilder extends PageTransitionsBuilder {
  const _CascadePageTransitionsBuilder();

  @override
  Duration get transitionDuration => appPageTransitionDuration;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final primaryAnimation = CurvedAnimation(
      parent: animation,
      curve: Curves.easeInOutCubic,
      reverseCurve: Curves.easeInOutCubic,
    );
    final secondaryRouteAnimation = CurvedAnimation(
      parent: secondaryAnimation,
      curve: Curves.easeInOutCubic,
      reverseCurve: Curves.easeInOutCubic,
    );

    return ClipRect(
      child: SlideTransition(
        position: Tween<Offset>(
          begin: Offset.zero,
          end: const Offset(-1, 0),
        ).animate(secondaryRouteAnimation),
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(1, 0),
            end: Offset.zero,
          ).animate(primaryAnimation),
          child: child,
        ),
      ),
    );
  }
}

ThemeData get appLightTheme => buildAppLightTheme();

/// Builds the light ThemeData from Super Admin workspace accent (same mix
/// formulas as backend `theme.js` applyTheme).
ThemeData buildAppLightTheme({Color primary = appPrimaryColor}) {
  final strong = _mixColorWithBlack(primary, 0.18);
  final soft = _mixColorWithWhite(primary, 0.84);
  final muted = _mixColorWithWhite(primary, 0.92);
  final pageBackground = _mixColorWithWhite(primary, 0.94);
  final surfaceSoft = _mixColorWithWhite(primary, 0.965);
  final border = _mixColorWithWhite(primary, 0.78);
  final onPrimary = _onAccentColor(primary);

  final colorScheme = ColorScheme.light(
    primary: primary,
    onPrimary: onPrimary,
    primaryContainer: soft,
    onPrimaryContainer: strong,
    secondary: strong,
    onSecondary: onPrimary,
    secondaryContainer: muted,
    onSecondaryContainer: appLightTextPrimary,
    surface: appLightDashboardColor,
    onSurface: appLightTextPrimary,
    onSurfaceVariant: appLightTextSecondary,
    outline: border,
    surfaceContainerHighest: surfaceSoft,
  );
  final textTheme = applyAppLetterSpacing(
    GoogleFonts.getTextTheme(
      defaultFontFamily,
      Typography.material2021().black.apply(
        bodyColor: appLightTextPrimary,
        displayColor: appLightTextPrimary,
      ),
    ),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    fontFamily: defaultFontFamily,
    textTheme: textTheme,
    primaryTextTheme: textTheme,
    primaryColor: primary,
    colorScheme: colorScheme,
    splashFactory: NoSplash.splashFactory,
    splashColor: Colors.transparent,
    highlightColor: Colors.transparent,
    hoverColor: Colors.transparent,
    focusColor: Colors.transparent,
    pageTransitionsTheme: _appPageTransitionsTheme,
    snackBarTheme: _appSnackBarTheme,
    checkboxTheme: _appCheckboxTheme(
      activeColor: primary,
      foregroundColor: onPrimary,
    ),
    scaffoldBackgroundColor: pageBackground,
    cardColor: appLightDashboardColor,
    dividerColor: border,
    iconTheme: const IconThemeData(color: appIconColor),
    primaryIconTheme: const IconThemeData(color: appIconColor),
    appBarTheme: AppBarTheme(
      backgroundColor: appLightDashboardColor,
      foregroundColor: appLightTextPrimary,
      iconTheme: const IconThemeData(color: appIconColor),
      actionsIconTheme: const IconThemeData(color: appIconColor),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.transparent,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      hintStyle: const TextStyle(
        color: appLightTextSecondary,
        letterSpacing: appLetterSpacing,
      ),
      labelStyle: const TextStyle(
        color: appLightTextSecondary,
        letterSpacing: appLetterSpacing,
      ),
      floatingLabelStyle: WidgetStateTextStyle.resolveWith((states) {
        if (states.contains(WidgetState.error)) {
          return const TextStyle(
            color: appInputErrorColor,
            letterSpacing: appLetterSpacing,
          );
        }
        if (states.contains(WidgetState.focused)) {
          return const TextStyle(
            color: Colors.black,
            letterSpacing: appLetterSpacing,
          );
        }
        return const TextStyle(
          color: appLightTextSecondary,
          letterSpacing: appLetterSpacing,
        );
      }),
      errorStyle: appInputBorderOnlyErrorStyle,
      prefixIconColor: appIconColor,
      suffixIconColor: appIconColor,
      border: _appInputBorder(color: const Color.fromARGB(255, 202, 203, 204)),
      enabledBorder: _appInputBorder(
        color: const Color.fromARGB(255, 204, 204, 204),
      ),
      disabledBorder: _appInputBorder(color: const Color(0xFFD0D4DC)),
      focusedBorder: _appInputBorder(color: Colors.black, width: 1.25),
      errorBorder: _appInputBorder(color: appInputErrorColor, width: 1.35),
      focusedErrorBorder: _appInputBorder(
        color: appInputErrorColor,
        width: 1.55,
      ),
      errorMaxLines: 2,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: _appButtonStyle(
        backgroundColor: primary,
        foregroundColor: onPrimary,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(appButtonRadius),
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(style: _appButtonStyle()),
    outlinedButtonTheme: OutlinedButtonThemeData(style: _appButtonStyle()),
    textButtonTheme: TextButtonThemeData(
      style: _appButtonStyle(
        foregroundColor: primary,
        textStyle: _pressedTextButtonStyle(fontWeight: FontWeight.w500),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(style: _appButtonStyle()),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: primary,
      foregroundColor: onPrimary,
    ),
  );
}

ThemeData get appDarkTheme => buildAppDarkTheme();

/// Keeps the selected platform accent on buttons and controls in dark mode.
ThemeData buildAppDarkTheme({Color primary = appDarkPrimaryColor}) {
  final onPrimary = _onAccentColor(primary);
  final colorScheme = ColorScheme.dark(
    primary: primary,
    onPrimary: onPrimary,
    surface: Colors.black,
    onSurface: Colors.white,
  );
  final textTheme = applyAppLetterSpacing(
    GoogleFonts.getTextTheme(
      defaultFontFamily,
      Typography.material2021().white,
    ),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    fontFamily: defaultFontFamily,
    textTheme: textTheme,
    primaryTextTheme: textTheme,
    primaryColor: primary,
    colorScheme: colorScheme,
    splashFactory: NoSplash.splashFactory,
    splashColor: Colors.transparent,
    highlightColor: Colors.transparent,
    hoverColor: Colors.transparent,
    focusColor: Colors.transparent,
    pageTransitionsTheme: _appPageTransitionsTheme,
    snackBarTheme: _appSnackBarTheme,
    checkboxTheme: _appCheckboxTheme(
      activeColor: primary,
      foregroundColor: onPrimary,
    ),
    scaffoldBackgroundColor: appDarkScaffoldColor,
    cardColor: appDarkCardColor,
    iconTheme: const IconThemeData(color: appDarkIconColor),
    primaryIconTheme: const IconThemeData(color: appDarkIconColor),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      iconTheme: IconThemeData(color: appDarkIconColor),
      actionsIconTheme: IconThemeData(color: appDarkIconColor),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.transparent,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      hintStyle: const TextStyle(
        color: Colors.white54,
        letterSpacing: appLetterSpacing,
      ),
      labelStyle: const TextStyle(
        color: Colors.white70,
        letterSpacing: appLetterSpacing,
      ),
      floatingLabelStyle: WidgetStateTextStyle.resolveWith((states) {
        if (states.contains(WidgetState.error)) {
          return const TextStyle(
            color: appInputErrorColor,
            letterSpacing: appLetterSpacing,
          );
        }
        if (states.contains(WidgetState.focused)) {
          return const TextStyle(
            color: Colors.white,
            letterSpacing: appLetterSpacing,
          );
        }
        return const TextStyle(
          color: Colors.white70,
          letterSpacing: appLetterSpacing,
        );
      }),
      errorStyle: appInputBorderOnlyErrorStyle,
      prefixIconColor: appDarkIconColor,
      suffixIconColor: appDarkIconColor,
      border: _appInputBorder(color: const Color(0xFF9AA0A6)),
      enabledBorder: _appInputBorder(color: const Color(0xFF9AA0A6)),
      disabledBorder: _appInputBorder(color: const Color(0xFF555555)),
      focusedBorder: _appInputBorder(color: Colors.white, width: 1.25),
      errorBorder: _appInputBorder(color: appInputErrorColor, width: 1.35),
      focusedErrorBorder: _appInputBorder(
        color: appInputErrorColor,
        width: 1.55,
      ),
      errorMaxLines: 2,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: _appButtonStyle(
        backgroundColor: primary,
        foregroundColor: onPrimary,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(appButtonRadius),
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: _appButtonStyle(foregroundColor: onPrimary),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(style: _appButtonStyle()),
    textButtonTheme: TextButtonThemeData(
      style: _appButtonStyle(
        foregroundColor: primary,
        textStyle: _pressedTextButtonStyle(fontWeight: FontWeight.w500),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(style: _appButtonStyle()),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: primary,
      foregroundColor: onPrimary,
    ),
  );
}
