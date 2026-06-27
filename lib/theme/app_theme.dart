import 'package:flutter/material.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';
import 'package:gms_shopping/theme/default_font.dart';
import 'package:google_fonts/google_fonts.dart';

const Color appPrimaryColor = Color(0xFFFB3897);
const Color appLightDashboardColor = Colors.white;
const Color appInputErrorColor = Color(0xFFE53935);

const Color appDarkPrimaryColor = Color(0xFFE4F75D);
const Color appDarkScaffoldColor = Colors.black;
const Color appDarkCardColor = Colors.black;
const Color appDarkDashboardColor = Colors.black;
const double appButtonRadius = 8;

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

  return [
    backgroundAccent.withOpacity(0.55),
    theme.scaffoldBackgroundColor,
  ];
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
    );
  });
}

const SnackBarThemeData _appSnackBarTheme = SnackBarThemeData(
  behavior: SnackBarBehavior.fixed,
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

OutlineInputBorder _appInputBorder({
  required Color color,
  double width = 1.2,
}) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(16),
    borderSide: BorderSide(
      color: color,
      width: width,
    ),
  );
}

OutlineInputBorder _appInputBorderNone() {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(16),
    borderSide: BorderSide.none,
  );
}

class _CascadePageTransitionsBuilder extends PageTransitionsBuilder {
  const _CascadePageTransitionsBuilder();

  @override
  Duration get transitionDuration => appMotionFrames(8);

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

ThemeData get appLightTheme {
  const colorScheme = ColorScheme.light(
    primary: appPrimaryColor,
    onPrimary: Colors.white,
    surface: Colors.white,
    onSurface: Colors.black,
  );
  final textTheme = GoogleFonts.getTextTheme(
    defaultFontFamily,
    Typography.material2021().black,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    fontFamily: defaultFontFamily,
    textTheme: textTheme,
    primaryTextTheme: textTheme,
    primaryColor: appPrimaryColor,
    colorScheme: colorScheme,
    splashFactory: NoSplash.splashFactory,
    splashColor: Colors.transparent,
    highlightColor: Colors.transparent,
    hoverColor: Colors.transparent,
    focusColor: Colors.transparent,
    pageTransitionsTheme: _appPageTransitionsTheme,
    snackBarTheme: _appSnackBarTheme,
    checkboxTheme: _appCheckboxTheme(
      activeColor: appPrimaryColor,
      foregroundColor: appLightDashboardColor,
    ),
    scaffoldBackgroundColor: Colors.white,
    cardColor: appLightDashboardColor,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 18,
        vertical: 16,
      ),
      hintStyle: const TextStyle(color: Colors.black45),
      labelStyle: const TextStyle(color: Colors.black54),
      errorStyle: const TextStyle(
        color: Colors.transparent,
        fontSize: 0,
        height: 0,
      ),
      prefixIconColor: appPrimaryColor,
      border: _appInputBorderNone(),
      enabledBorder: _appInputBorderNone(),
      disabledBorder: _appInputBorderNone(),
      focusedBorder: _appInputBorderNone(),
      errorBorder: _appInputBorder(
        color: appInputErrorColor,
        width: 1.35,
      ),
      focusedErrorBorder: _appInputBorder(
        color: appInputErrorColor,
        width: 1.6,
      ),
      errorMaxLines: 2,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: _appButtonStyle(
        backgroundColor: appPrimaryColor,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(appButtonRadius),
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: _appButtonStyle(),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: _appButtonStyle(),
    ),
    textButtonTheme: TextButtonThemeData(
      style: _appButtonStyle(
        foregroundColor: appPrimaryColor,
        textStyle: _pressedTextButtonStyle(
          fontWeight: FontWeight.w500,
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: _appButtonStyle(),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: appPrimaryColor,
      foregroundColor: Colors.white,
    ),
  );
}

ThemeData get appDarkTheme {
  const colorScheme = ColorScheme.dark(
    primary: appDarkPrimaryColor,
    onPrimary: Colors.black,
    surface: Colors.black,
    onSurface: Colors.white,
  );
  final textTheme = GoogleFonts.getTextTheme(
    defaultFontFamily,
    Typography.material2021().white,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    fontFamily: defaultFontFamily,
    textTheme: textTheme,
    primaryTextTheme: textTheme,
    primaryColor: appDarkPrimaryColor,
    colorScheme: colorScheme,
    splashFactory: NoSplash.splashFactory,
    splashColor: Colors.transparent,
    highlightColor: Colors.transparent,
    hoverColor: Colors.transparent,
    focusColor: Colors.transparent,
    pageTransitionsTheme: _appPageTransitionsTheme,
    snackBarTheme: _appSnackBarTheme,
    checkboxTheme: _appCheckboxTheme(
      activeColor: appDarkPrimaryColor,
      foregroundColor: appDarkCardColor,
    ),
    scaffoldBackgroundColor: appDarkScaffoldColor,
    cardColor: appDarkCardColor,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.black,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 18,
        vertical: 16,
      ),
      hintStyle: const TextStyle(color: Colors.white54),
      labelStyle: const TextStyle(color: Colors.white70),
      errorStyle: const TextStyle(
        color: Colors.transparent,
        fontSize: 0,
        height: 0,
      ),
      prefixIconColor: appDarkPrimaryColor,
      border: _appInputBorderNone(),
      enabledBorder: _appInputBorderNone(),
      disabledBorder: _appInputBorderNone(),
      focusedBorder: _appInputBorderNone(),
      errorBorder: _appInputBorder(
        color: appInputErrorColor,
        width: 1.35,
      ),
      focusedErrorBorder: _appInputBorder(
        color: appInputErrorColor,
        width: 1.55,
      ),
      errorMaxLines: 2,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: _appButtonStyle(
        backgroundColor: appDarkPrimaryColor,
        foregroundColor: Colors.black,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(appButtonRadius),
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: _appButtonStyle(
        foregroundColor: appDarkCardColor,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: _appButtonStyle(),
    ),
    textButtonTheme: TextButtonThemeData(
      style: _appButtonStyle(
        foregroundColor: appDarkPrimaryColor,
        textStyle: _pressedTextButtonStyle(
          fontWeight: FontWeight.w500,
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: _appButtonStyle(),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: appDarkPrimaryColor,
      foregroundColor: Colors.white,
    ),
  );
}
