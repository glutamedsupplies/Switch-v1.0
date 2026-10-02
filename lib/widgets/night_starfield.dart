import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// How much of the brand [accent] shows through each part of the night sky
/// (0 = pure night, 1 = pure brand color).
const double _accentTop = 0.12;
const double _accentMiddle = 0.25;
const double _accentCorner = 0.5;

/// Night-sky colors tinted with the brand [accent] so the palette still shows.
LinearGradient nightSkyGradient({Color? accent}) {
  Color tint(Color night, double amount) =>
      accent == null ? night : Color.lerp(night, accent, amount)!;
  return LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      tint(const Color(0xFF081133), _accentTop),
      tint(const Color(0xFF0E1638), _accentMiddle),
      tint(const Color(0xFF0B1230), _accentCorner),
    ],
    stops: const [0, 0.55, 1],
  );
}

/// Soft brand-colored glow rising from the bottom of a night surface.
class NightAccentGlow extends StatelessWidget {
  const NightAccentGlow({super.key, required this.accent});

  final Color accent;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: const Alignment(0.55, 1.1),
            radius: 1.1,
            colors: [
              accent.withValues(alpha: 0.45),
              accent.withValues(alpha: 0.12),
              accent.withValues(alpha: 0),
            ],
            stops: const [0, 0.45, 1],
          ),
        ),
      ),
    );
  }
}

/// Twinkling stars (and optional shooting stars) for dark surfaces.
/// Fills its parent and ignores taps.
class NightStarfield extends StatefulWidget {
  const NightStarfield({super.key, this.seed = 1, this.shootingStars = false});

  final int seed;
  final bool shootingStars;

  @override
  State<NightStarfield> createState() => _NightStarfieldState();
}

class _NightStarfieldState extends State<NightStarfield>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ticker = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 1),
  );
  final Stopwatch _clock = Stopwatch()..start();
  late List<_Star> _stars = _seedStars(widget.seed);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (reduceMotion) {
      _ticker.stop();
    } else if (!_ticker.isAnimating) {
      _ticker.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant NightStarfield oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.seed != widget.seed) _stars = _seedStars(widget.seed);
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  static List<_Star> _seedStars(int seed) {
    final random = math.Random(seed);
    const tints = [Colors.white, Color(0xFFD6E4FF), Color(0xFFFFF1D6)];
    return List<_Star>.generate(70, (i) {
      return _Star(
        x: random.nextDouble(),
        y: random.nextDouble(),
        radius: 0.45 + random.nextDouble() * 0.95,
        phase: random.nextDouble(),
        period: 2 + random.nextDouble() * 4,
        bright: i < 4,
        color: tints[random.nextInt(tints.length)],
      );
    }, growable: false);
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: RepaintBoundary(
        child: CustomPaint(
          size: Size.infinite,
          painter: _StarfieldPainter(
            stars: _stars,
            seed: widget.seed,
            shootingStars: widget.shootingStars,
            clock: _clock,
            repaint: _ticker,
          ),
        ),
      ),
    );
  }
}

class _Star {
  const _Star({
    required this.x,
    required this.y,
    required this.radius,
    required this.phase,
    required this.period,
    required this.bright,
    required this.color,
  });

  final double x;
  final double y;
  final double radius;
  final double phase;
  final double period;
  final bool bright;
  final Color color;
}

class _StarfieldPainter extends CustomPainter {
  _StarfieldPainter({
    required this.stars,
    required this.seed,
    required this.shootingStars,
    required this.clock,
    required Listenable repaint,
  }) : super(repaint: repaint);

  final List<_Star> stars;
  final int seed;
  final bool shootingStars;
  final Stopwatch clock;

  static const double _shootingPeriod = 4.5;
  static const double _shootingDuration = 0.9;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final seconds = clock.elapsedMilliseconds / 1000;
    _paintStars(canvas, size, seconds);
    if (shootingStars) _paintShootingStar(canvas, size, seconds);
  }

  void _paintStars(Canvas canvas, Size size, double seconds) {
    final count = (size.width * size.height / 900).round().clamp(
      12,
      stars.length,
    );
    final dot = Paint();
    final glint = Paint()
      ..strokeWidth = 0.8
      ..strokeCap = StrokeCap.round;

    for (var i = 0; i < count; i++) {
      final star = stars[i];
      final twinkle =
          0.5 +
          0.5 * math.sin((seconds / star.period + star.phase) * 2 * math.pi);
      final alpha = 0.25 + 0.75 * twinkle;
      final center = Offset(star.x * size.width, star.y * size.height);

      if (star.bright) {
        final r = star.radius + 0.6;
        dot.color = star.color.withValues(alpha: 0.18 * alpha);
        canvas.drawCircle(center, r * 3.2, dot);
        glint.color = star.color.withValues(alpha: 0.75 * alpha);
        final arm = r * (3 + 1.5 * twinkle);
        canvas.drawLine(
          center.translate(-arm, 0),
          center.translate(arm, 0),
          glint,
        );
        canvas.drawLine(
          center.translate(0, -arm),
          center.translate(0, arm),
          glint,
        );
        dot.color = star.color.withValues(alpha: alpha);
        canvas.drawCircle(center, r, dot);
      } else {
        dot.color = star.color.withValues(alpha: alpha * 0.9);
        canvas.drawCircle(center, star.radius, dot);
      }
    }
  }

  void _paintShootingStar(Canvas canvas, Size size, double seconds) {
    final event = (seconds / _shootingPeriod).floor();
    final random = math.Random(seed * 7919 + event);
    if (random.nextDouble() > 0.75) return;

    final start =
        random.nextDouble() * (_shootingPeriod - _shootingDuration - 0.2);
    final local = seconds - event * _shootingPeriod - start;
    if (local < 0 || local > _shootingDuration) return;
    final progress = local / _shootingDuration;

    final origin = Offset(
      size.width * (0.35 + random.nextDouble() * 0.6),
      size.height * random.nextDouble() * 0.4,
    );
    final angle = (150 + random.nextDouble() * 25) * math.pi / 180;
    final direction = Offset(math.cos(angle), math.sin(angle));
    final travel = size.width * (0.35 + random.nextDouble() * 0.2);
    final eased = Curves.easeOutCubic.transform(progress);
    final head = origin + direction * (travel * eased);
    final tailLength = 70 * math.sin(math.pi * progress) + 8;
    final tail = head - direction * tailLength;
    final fade = math.sin(math.pi * progress);

    canvas.drawLine(
      tail,
      head,
      Paint()
        ..strokeWidth = 1.8
        ..strokeCap = StrokeCap.round
        ..shader = ui.Gradient.linear(tail, head, [
          Colors.white.withValues(alpha: 0),
          Colors.white.withValues(alpha: 0.95 * fade),
        ]),
    );
    canvas.drawCircle(
      head,
      5,
      Paint()..color = const Color(0xFFD6E4FF).withValues(alpha: 0.25 * fade),
    );
    canvas.drawCircle(
      head,
      1.6,
      Paint()..color = Colors.white.withValues(alpha: fade),
    );
  }

  @override
  bool shouldRepaint(covariant _StarfieldPainter oldDelegate) =>
      oldDelegate.stars != stars || oldDelegate.shootingStars != shootingStars;
}
