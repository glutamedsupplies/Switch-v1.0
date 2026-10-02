import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:switch_app/services/home_sky_weather.dart';

typedef _SkyScene = ({HomeSkyPhase phase, HomeSkyWeather weather, bool dark});

/// Animated sky (time of day + live weather) drawn over the buyer home wash.
class HomeSkyBackdrop extends StatefulWidget {
  const HomeSkyBackdrop({super.key, this.visible = true});

  /// Fades the sky out (and pauses animation) e.g. while search is open.
  final bool visible;

  @override
  State<HomeSkyBackdrop> createState() => _HomeSkyBackdropState();
}

class _HomeSkyBackdropState extends State<HomeSkyBackdrop>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  static const Duration _loop = Duration(seconds: 90);

  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: _loop,
  );
  final HomeSkyWeatherService _service = HomeSkyWeatherService.instance;
  Timer? _clock;
  bool _appActive = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _service.weather.addListener(_onWeatherChanged);
    HomeSkyClock.instance.phase.addListener(_onWeatherChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      HomeSkyClock.instance.sync();
    });
    unawaited(_service.refresh());
    _clock = Timer.periodic(const Duration(minutes: 1), (_) => _tick());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant HomeSkyBackdrop oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.visible != widget.visible) _syncAnimation();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appActive = state == AppLifecycleState.resumed;
    if (_appActive) _tick();
    if (mounted) _syncAnimation();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _service.weather.removeListener(_onWeatherChanged);
    HomeSkyClock.instance.phase.removeListener(_onWeatherChanged);
    _clock?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onWeatherChanged() {
    if (mounted) setState(() {});
  }

  void _tick() {
    HomeSkyClock.instance.sync();
    unawaited(_service.refresh());
  }

  void _syncAnimation() {
    final reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final shouldRun = widget.visible && _appActive && !reduceMotion;
    if (shouldRun && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!shouldRun && _controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final _SkyScene scene = (
      phase: HomeSkyClock.instance.phase.value,
      weather: homeSkyPreviewWeather ?? _service.weather.value,
      dark: Theme.of(context).brightness == Brightness.dark,
    );
    final topInset = MediaQuery.paddingOf(context).top;

    return IgnorePointer(
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
        opacity: widget.visible ? 1 : 0,
        child: RepaintBoundary(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 900),
            layoutBuilder: (current, previous) =>
                Stack(fit: StackFit.expand, children: [...previous, ?current]),
            child: CustomPaint(
              key: ValueKey<_SkyScene>(scene),
              size: Size.infinite,
              painter: _SkyPainter(
                scene: scene,
                animation: _controller,
                topInset: topInset,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Approximate color the home sky leaves behind the title + search row
/// (about halfway down the painted sky), composited over [pageBackground].
///
/// Lets foreground chrome keep contrast as the time of day and weather change.
Color homeSkyToneBehindSearch({
  required HomeSkyPhase phase,
  required HomeSkyWeather weather,
  required bool dark,
  required Color pageBackground,
}) {
  final palette = _SkyPalette((phase: phase, weather: weather, dark: dark));
  final sky = Color.lerp(
    palette.mix(palette.skyTop),
    palette.mix(palette.skyHorizon),
    0.8,
  )!;
  final cloudCover = switch (weather) {
    HomeSkyWeather.clear => 0.1,
    HomeSkyWeather.partlyCloudy => 0.2,
    HomeSkyWeather.cloudy => 0.4,
    HomeSkyWeather.rain || HomeSkyWeather.storm => 0.55,
  };
  final withClouds = Color.lerp(sky, palette.cloudColor, cloudCover)!;
  return Color.alphaBlend(withClouds.withValues(alpha: 0.7), pageBackground);
}

class _SkyPalette {
  const _SkyPalette(this.scene);

  final _SkyScene scene;

  bool get night => scene.phase == HomeSkyPhase.night;
  bool get dark => scene.dark;
  bool get wet =>
      scene.weather == HomeSkyWeather.rain ||
      scene.weather == HomeSkyWeather.storm;

  double get overcast => switch (scene.weather) {
    HomeSkyWeather.clear => 0,
    HomeSkyWeather.partlyCloudy => 0.1,
    HomeSkyWeather.cloudy => 0.45,
    HomeSkyWeather.rain => 0.62,
    HomeSkyWeather.storm => 0.78,
  };

  Color get overcastTarget => dark
      ? (night ? const Color(0xFF1B2030) : const Color(0xFF2B3342))
      : (night ? const Color(0xFF8A92B2) : const Color(0xFFAEB8C6));

  Color get skyTop => switch (scene.phase) {
    HomeSkyPhase.morning =>
      dark ? const Color(0xFF1D3B5C) : const Color(0xFFBFE3FF),
    HomeSkyPhase.afternoon =>
      dark ? const Color(0xFF17406B) : const Color(0xFF8FD0FF),
    HomeSkyPhase.evening =>
      dark ? const Color(0xFF2A2350) : const Color(0xFFB7A4EE),
    HomeSkyPhase.night =>
      dark ? const Color(0xFF0B1230) : const Color(0xFF8E9BE8),
  };

  Color get skyHorizon => switch (scene.phase) {
    HomeSkyPhase.morning =>
      dark ? const Color(0xFF3B3A52) : const Color(0xFFFFEBD2),
    HomeSkyPhase.afternoon =>
      dark ? const Color(0xFF1E3550) : const Color(0xFFD6EFFF),
    HomeSkyPhase.evening =>
      dark ? const Color(0xFF5A3140) : const Color(0xFFFFC49A),
    HomeSkyPhase.night =>
      dark ? const Color(0xFF171D3C) : const Color(0xFFCBD3F7),
  };

  Color get cloudColor {
    if (dark) {
      if (wet) {
        return night ? const Color(0xFF2A3148) : const Color(0xFF3A4458);
      }
      return night ? const Color(0xFF2C3452) : const Color(0xFF56657E);
    }
    return switch (scene.weather) {
      HomeSkyWeather.storm =>
        night ? const Color(0xFF4F5776) : const Color(0xFF7F8A9B),
      HomeSkyWeather.rain =>
        night ? const Color(0xFF626B8E) : const Color(0xFF9CA7B6),
      HomeSkyWeather.cloudy =>
        night ? const Color(0xFFB9C0DE) : const Color(0xFFF2F5F9),
      _ => night ? const Color(0xFFDDE2FA) : Colors.white,
    };
  }

  Color mix(Color color) => Color.lerp(color, overcastTarget, overcast)!;
}

class _Cloud {
  const _Cloud(this.x, this.y, this.scale, this.cycles, this.near);

  final double x;
  final double y;
  final double scale;
  final int cycles;
  final bool near;
}

class _Drop {
  const _Drop(this.x, this.phase, this.length, this.cycles);

  final double x;
  final double phase;
  final double length;
  final int cycles;
}

class _Star {
  const _Star(this.x, this.y, this.radius, this.phase, this.cycles);

  final double x;
  final double y;
  final double radius;
  final double phase;
  final int cycles;
}

class _SkyPainter extends CustomPainter {
  _SkyPainter({
    required this.scene,
    required this.animation,
    required this.topInset,
  }) : super(repaint: animation);

  final _SkyScene scene;
  final Animation<double> animation;
  final double topInset;

  static const double _moonRadius = 12;
  static const List<double> _lightningAt = [0.18, 0.205, 0.61, 0.83, 0.846];

  static final Path _cloudShape = Path()
    ..addRRect(RRect.fromLTRBR(0, 38, 100, 62, const Radius.circular(12)))
    ..addOval(Rect.fromCircle(center: const Offset(24, 40), radius: 17))
    ..addOval(Rect.fromCircle(center: const Offset(47, 30), radius: 24))
    ..addOval(Rect.fromCircle(center: const Offset(72, 37), radius: 18))
    ..addOval(Rect.fromCircle(center: const Offset(88, 48), radius: 12));

  static final Path _moonShape = Path.combine(
    PathOperation.difference,
    Path()..addOval(Rect.fromCircle(center: Offset.zero, radius: _moonRadius)),
    Path()..addOval(
      Rect.fromCircle(
        center: const Offset(_moonRadius * 0.45, -_moonRadius * 0.28),
        radius: _moonRadius * 0.86,
      ),
    ),
  );

  static final List<_Cloud> _clouds = () {
    final random = math.Random(11);
    return List<_Cloud>.generate(9, (i) {
      final near = i.isOdd;
      return _Cloud(
        i / 9 + random.nextDouble() * 0.08,
        0.12 + random.nextDouble() * 0.78,
        near
            ? 1.1 + random.nextDouble() * 0.6
            : 0.7 + random.nextDouble() * 0.4,
        near ? 2 : 1,
        near,
      );
    }, growable: false);
  }();

  static final List<_Drop> _drops = () {
    final random = math.Random(23);
    return List<_Drop>.generate(
      140,
      (_) => _Drop(
        random.nextDouble(),
        random.nextDouble(),
        9 + random.nextDouble() * 10,
        50 + random.nextInt(26),
      ),
      growable: false,
    );
  }();

  static final List<_Star> _stars = () {
    final random = math.Random(7);
    return List<_Star>.generate(
      38,
      (_) => _Star(
        random.nextDouble(),
        random.nextDouble(),
        0.6 + random.nextDouble() * 1.1,
        random.nextDouble(),
        6 + random.nextInt(14),
      ),
      growable: false,
    );
  }();

  late final _SkyPalette _palette = _SkyPalette(scene);

  bool get _night => _palette.night;
  bool get _dark => _palette.dark;
  bool get _wet => _palette.wet;
  Color get _skyTop => _palette.skyTop;
  Color get _skyHorizon => _palette.skyHorizon;
  Color get _cloudColor => _palette.cloudColor;

  int get _cloudCount => switch (scene.weather) {
    HomeSkyWeather.clear => 3,
    HomeSkyWeather.partlyCloudy => 5,
    HomeSkyWeather.cloudy => 7,
    HomeSkyWeather.rain || HomeSkyWeather.storm => 9,
  };

  Color _mix(Color color) => _palette.mix(color);

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final t = animation.value;
    final skyHeight = (size.height * 0.46).clamp(
      topInset + 220,
      math.max(topInset + 220, topInset + 380),
    );
    final sky = Rect.fromLTWH(0, 0, size.width, skyHeight.toDouble());

    _paintSky(canvas, sky);
    if (_night &&
        (scene.weather == HomeSkyWeather.clear ||
            scene.weather == HomeSkyWeather.partlyCloudy)) {
      _paintStars(canvas, sky, t);
    }
    if (!_wet) _paintCelestial(canvas, sky, t);
    _paintClouds(canvas, sky, t);
    if (_wet) _paintRain(canvas, sky, t);
    if (scene.weather == HomeSkyWeather.storm) _paintLightning(canvas, sky, t);
  }

  void _paintSky(Canvas canvas, Rect sky) {
    final top = _mix(_skyTop);
    final horizon = _mix(_skyHorizon);
    canvas.drawRect(
      sky,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            top.withValues(alpha: 0.9),
            horizon.withValues(alpha: 0.65),
            horizon.withValues(alpha: 0),
          ],
          stops: const [0, 0.6, 1],
        ).createShader(sky),
    );
  }

  void _paintStars(Canvas canvas, Rect sky, double t) {
    final paint = Paint();
    final band = sky.height * 0.6;
    for (final star in _stars) {
      final twinkle =
          0.5 + 0.5 * math.sin((t * star.cycles + star.phase) * 2 * math.pi);
      final y = topInset * 0.4 + star.y * band;
      final fade = (1 - y / sky.height).clamp(0.0, 1.0);
      paint.color = Colors.white.withValues(
        alpha: (0.3 + 0.7 * twinkle) * fade * (_dark ? 0.9 : 0.8),
      );
      canvas.drawCircle(Offset(star.x * sky.width, y), star.radius, paint);
    }
  }

  void _paintCelestial(Canvas canvas, Rect sky, double t) {
    final dim = scene.weather == HomeSkyWeather.cloudy ? 0.45 : 1.0;
    final pulse = 0.5 + 0.5 * math.sin(t * 2 * math.pi * 6);
    final w = sky.width;
    switch (scene.phase) {
      case HomeSkyPhase.morning:
        _paintSun(
          canvas,
          Offset(w * 0.02, topInset + 96),
          26,
          core: const Color(0xFFFFE08A),
          glow: const Color(0xFFFFCF73),
          dim: dim,
          pulse: pulse,
        );
      case HomeSkyPhase.afternoon:
        _paintSun(
          canvas,
          Offset(w * 0.58, topInset + 28),
          18,
          core: const Color(0xFFFFF4B8),
          glow: const Color(0xFFFFE58F),
          dim: dim,
          pulse: pulse,
        );
      case HomeSkyPhase.evening:
        _paintSun(
          canvas,
          Offset(w * 0.97, sky.height * 0.55),
          30,
          core: const Color(0xFFFF9E5E),
          glow: const Color(0xFFFF8A4C),
          dim: dim,
          pulse: pulse,
        );
      case HomeSkyPhase.night:
        _paintMoon(canvas, Offset(w * 0.56, topInset + 30), dim, pulse);
    }
  }

  void _paintSun(
    Canvas canvas,
    Offset center,
    double radius, {
    required Color core,
    required Color glow,
    required double dim,
    required double pulse,
  }) {
    final glowRadius = radius * (3.2 + 0.3 * pulse);
    canvas.drawCircle(
      center,
      glowRadius,
      Paint()
        ..shader = RadialGradient(
          colors: [
            glow.withValues(alpha: 0.55 * dim),
            glow.withValues(alpha: 0),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: glowRadius)),
    );
    canvas.drawCircle(
      center,
      radius,
      Paint()..color = core.withValues(alpha: 0.95 * dim),
    );
  }

  void _paintMoon(Canvas canvas, Offset center, double dim, double pulse) {
    const moonColor = Color(0xFFFFF4D6);
    final glowRadius = _moonRadius * (3 + 0.3 * pulse);
    canvas.drawCircle(
      center,
      glowRadius,
      Paint()
        ..shader = RadialGradient(
          colors: [
            moonColor.withValues(alpha: 0.35 * dim),
            moonColor.withValues(alpha: 0),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: glowRadius)),
    );
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.drawPath(
      _moonShape,
      Paint()..color = moonColor.withValues(alpha: 0.95 * dim),
    );
    canvas.restore();
  }

  void _paintClouds(Canvas canvas, Rect sky, double t) {
    final base = _cloudColor;
    final shade = Color.lerp(base, Colors.black, _dark ? 0.2 : 0.1)!;
    final sizeBoost = _wet ? 1.25 : 1.0;
    final nightDim = _night && !_wet ? 0.6 : 1.0;
    final band = sky.height * 0.52;
    final mainPaint = Paint();
    final shadePaint = Paint();

    for (var i = 0; i < _cloudCount; i++) {
      final cloud = _clouds[i];
      final scale = cloud.scale * sizeBoost;
      final width = 100 * scale;
      final travel = sky.width + width * 2;
      final x = ((cloud.x + t * cloud.cycles) % 1.0) * travel - width;
      final y = topInset * 0.5 + cloud.y * band;
      final alpha = (cloud.near ? 0.9 : 0.6) * nightDim;
      mainPaint.color = base.withValues(alpha: alpha);
      shadePaint.color = shade.withValues(alpha: alpha * 0.55);

      canvas.save();
      canvas.translate(x, y);
      canvas.scale(scale);
      canvas.save();
      canvas.translate(0, 3);
      canvas.drawPath(_cloudShape, shadePaint);
      canvas.restore();
      canvas.drawPath(_cloudShape, mainPaint);
      canvas.restore();
    }
  }

  void _paintRain(Canvas canvas, Rect sky, double t) {
    final count = scene.weather == HomeSkyWeather.storm ? 140 : 85;
    final color = _dark
        ? const Color(0xFFB8C7E0)
        : (_night ? const Color(0xFF46558A) : const Color(0xFF55708F));
    final fall = sky.height * 1.05;
    final paint = Paint()
      ..strokeWidth = 1.3
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < count; i++) {
      final drop = _drops[i];
      final y =
          ((drop.phase + t * drop.cycles) % 1.0) * (fall + drop.length) -
          drop.length;
      final x = drop.x * (sky.width + 60) - y * 0.22;
      final fade = (1 - y / fall).clamp(0.0, 1.0);
      paint.color = color.withValues(alpha: 0.55 * fade);
      canvas.drawLine(
        Offset(x, y),
        Offset(x - drop.length * 0.22, y + drop.length),
        paint,
      );
    }
  }

  void _paintLightning(Canvas canvas, Rect sky, double t) {
    const flashLength = 0.006;
    var flash = 0.0;
    for (final at in _lightningAt) {
      final delta = t - at;
      if (delta >= 0 && delta < flashLength) {
        flash = math.max(flash, 1 - delta / flashLength);
      }
    }
    if (flash <= 0) return;
    canvas.drawRect(
      sky,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: 0.4 * flash),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(sky),
    );
  }

  @override
  bool shouldRepaint(covariant _SkyPainter oldDelegate) =>
      oldDelegate.scene != scene || oldDelegate.topInset != topInset;
}
