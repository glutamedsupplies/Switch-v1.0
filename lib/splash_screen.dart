import 'package:flutter/material.dart';
import 'package:gms_shopping/theme/app_theme.dart';
import 'package:gms_shopping/utils/motion_60fps.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({
    super.key,
    this.nextScreen,
  });

  final Widget? nextScreen;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: appMotionFrames(108),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );
    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(
          begin: 0.55,
          end: 1.05,
        ).chain(
          CurveTween(curve: Curves.easeOutBack),
        ),
        weight: 70,
      ),
      TweenSequenceItem(
        tween: Tween<double>(
          begin: 1.05,
          end: 0.92,
        ).chain(
          CurveTween(curve: Curves.easeInOut),
        ),
        weight: 30,
      ),
    ]).animate(_controller);

    _controller.forward();
    _goToNextScreen();
  }

  Future<void> _goToNextScreen() async {
    await Future<void>.delayed(const Duration(seconds: 3));

    if (!mounted || widget.nextScreen == null) {
      return;
    }

    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (context) => widget.nextScreen!,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _buildLogo() {
    return SizedBox(
      width: 138,
      height: 138,
      child: Image.asset(
        'assets/images/gmslogo.png',
        fit: BoxFit.contain,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final theme = Theme.of(context);
        final isDark = theme.brightness == Brightness.dark;
        final targetColors = appLoginBackgroundColors(
          theme: theme,
          isDark: isDark,
        );
        final initialColor = isDark ? Colors.white : Colors.black;
        final topColor = Color.lerp(
          initialColor,
          targetColors.first,
          Curves.easeOutCubic.transform(_controller.value),
        )!;
        final bottomColor = Color.lerp(
          initialColor,
          targetColors.last,
          Curves.easeInOut.transform(_controller.value),
        )!;

        return Scaffold(
          backgroundColor: bottomColor,
          body: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [topColor, bottomColor],
              ),
            ),
            child: Center(
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: ScaleTransition(
                  scale: _scaleAnimation,
                  child: _buildLogo(),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
