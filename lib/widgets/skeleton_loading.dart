import 'dart:async';

import 'package:flutter/material.dart';

/// Minimum time skeleton stays visible when content switches or loads.
const Duration kContentSwitchSkeletonMinDuration = Duration(seconds: 1);

/// Soft gray base used across buyer skeletons.
const Color kSkeletonBaseColor = Color(0xFFEFF2F6);

/// Holds skeleton visible for at least [minimumDuration] after [switchKey]
/// changes or while [ready] is false.
class MinimumSkeletonReveal extends StatefulWidget {
  const MinimumSkeletonReveal({
    super.key,
    required this.switchKey,
    required this.ready,
    required this.skeleton,
    required this.child,
    this.minimumDuration = kContentSwitchSkeletonMinDuration,
    this.switchDuration = const Duration(milliseconds: 280),
  });

  final Object switchKey;
  final bool ready;
  final Widget skeleton;
  final Widget child;
  final Duration minimumDuration;
  final Duration switchDuration;

  @override
  State<MinimumSkeletonReveal> createState() => _MinimumSkeletonRevealState();
}

class _MinimumSkeletonRevealState extends State<MinimumSkeletonReveal> {
  Timer? _timer;
  late DateTime _skeletonStartedAt;
  bool _minDelaySatisfied = false;

  @override
  void initState() {
    super.initState();
    _skeletonStartedAt = DateTime.now();
    _minDelaySatisfied = false;
    if (widget.ready) {
      _scheduleMinDelayFinish();
    }
  }

  @override
  void didUpdateWidget(MinimumSkeletonReveal oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.switchKey != widget.switchKey) {
      _restartSkeletonHold();
      return;
    }
    if (!oldWidget.ready && widget.ready) {
      _scheduleMinDelayFinish();
      return;
    }
    if (oldWidget.ready && !widget.ready) {
      _restartSkeletonHold();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _restartSkeletonHold() {
    _timer?.cancel();
    _skeletonStartedAt = DateTime.now();
    setState(() => _minDelaySatisfied = false);
    if (widget.ready) {
      _scheduleMinDelayFinish();
    }
  }

  void _scheduleMinDelayFinish() {
    _timer?.cancel();
    final elapsed = DateTime.now().difference(_skeletonStartedAt);
    final remaining = widget.minimumDuration - elapsed;
    if (remaining <= Duration.zero) {
      if (mounted) setState(() => _minDelaySatisfied = true);
      return;
    }
    _timer = Timer(remaining, () {
      if (!mounted || !widget.ready) return;
      setState(() => _minDelaySatisfied = true);
    });
  }

  bool get _showSkeleton => !widget.ready || !_minDelaySatisfied;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: widget.switchDuration,
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) {
        return FadeTransition(opacity: animation, child: child);
      },
      child: _showSkeleton
          ? KeyedSubtree(
              key: ValueKey('skeleton-${widget.switchKey}'),
              child: widget.skeleton,
            )
          : KeyedSubtree(
              key: ValueKey('content-${widget.switchKey}'),
              child: widget.child,
            ),
    );
  }
}

class SkeletonShimmer extends StatefulWidget {
  const SkeletonShimmer({super.key, this.baseColor = kSkeletonBaseColor});

  final Color baseColor;

  @override
  State<SkeletonShimmer> createState() => _SkeletonShimmerState();
}

class _SkeletonShimmerState extends State<SkeletonShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1150),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final travel = -1.8 + (_controller.value * 3.6);
        return DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(travel - 1, -0.15),
              end: Alignment(travel + 1, 0.15),
              colors: [
                widget.baseColor,
                widget.baseColor,
                Colors.white.withValues(alpha: 0.92),
                widget.baseColor,
                widget.baseColor,
              ],
              stops: const [0, 0.34, 0.5, 0.66, 1],
            ),
          ),
          child: child,
        );
      },
    );
  }
}

class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8,
    this.baseColor = kSkeletonBaseColor,
  });

  final double? width;
  final double height;
  final double borderRadius;
  final Color baseColor;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        width: width,
        height: height,
        child: SkeletonShimmer(baseColor: baseColor),
      ),
    );
  }
}

class SkeletonCircle extends StatelessWidget {
  const SkeletonCircle({
    super.key,
    required this.size,
    this.baseColor = kSkeletonBaseColor,
  });

  final double size;
  final Color baseColor;

  @override
  Widget build(BuildContext context) {
    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: SkeletonShimmer(baseColor: baseColor),
      ),
    );
  }
}

/// Horizontal pill chips (categories, top searches).
class SkeletonHorizontalChips extends StatelessWidget {
  const SkeletonHorizontalChips({
    super.key,
    this.heights = 36,
    this.count = 5,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
  });

  final double heights;
  final int count;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: heights + 8,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: padding,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: count,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final widths = <double>[88, 104, 72, 96, 80];
          return SkeletonBox(
            width: widths[index % widths.length],
            height: heights,
            borderRadius: 999,
          );
        },
      ),
    );
  }
}

/// List rows with leading circle + two lines (search, account, notifications).
class SkeletonListRows extends StatelessWidget {
  const SkeletonListRows({
    super.key,
    this.count = 6,
    this.padding = const EdgeInsets.fromLTRB(16, 8, 16, 24),
  });

  final int count;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: padding,
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: 14),
      itemBuilder: (context, index) {
        return Row(
          children: [
            const SkeletonCircle(size: 36),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(
                    width: index.isEven ? double.infinity : 220,
                    height: 14,
                    borderRadius: 6,
                  ),
                  const SizedBox(height: 8),
                  SkeletonBox(
                    width: index.isEven ? 160 : double.infinity,
                    height: 12,
                    borderRadius: 6,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Top searches panel: heading placeholders + chips + recent rows.
class SkeletonSearchSuggestionsPanel extends StatelessWidget {
  const SkeletonSearchSuggestionsPanel({super.key, this.padding});

  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding:
          padding ?? const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        Row(
          children: [
            const SkeletonCircle(size: 22),
            const SizedBox(width: 8),
            const SkeletonBox(width: 120, height: 18, borderRadius: 6),
            const Spacer(),
            const SkeletonBox(width: 52, height: 14, borderRadius: 6),
          ],
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: List.generate(6, (index) {
            return SkeletonBox(
              width: 72 + (index % 3) * 18,
              height: 34,
              borderRadius: 999,
            );
          }),
        ),
        const SizedBox(height: 22),
        Row(
          children: [
            const SkeletonCircle(size: 22),
            const SizedBox(width: 8),
            const SkeletonBox(width: 130, height: 18, borderRadius: 6),
          ],
        ),
        const SizedBox(height: 12),
        const SkeletonListRows(count: 4, padding: EdgeInsets.zero),
      ],
    );
  }
}

/// Product grid placeholder (2 columns).
/// Shop dashboard "Most Popular": title + 2×5 circular company slots + dots.
class SkeletonMostPopularCompanies extends StatelessWidget {
  const SkeletonMostPopularCompanies({
    super.key,
    this.columnsPerRow = 5,
    this.rowsPerPage = 2,
    this.avatarSize = 56,
    this.padding = const EdgeInsets.fromLTRB(0, 2, 0, 10),
  });

  final int columnsPerRow;
  final int rowsPerPage;
  final double avatarSize;
  final EdgeInsetsGeometry padding;

  Widget _buildRow(int rowIndex) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(columnsPerRow, (col) {
        final index = (rowIndex * columnsPerRow) + col;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SkeletonCircle(size: avatarSize),
                const SizedBox(height: 4),
                SkeletonBox(
                  width: 44 + (index % 3) * 4,
                  height: 11,
                  borderRadius: 5,
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(14, 0, 14, 10),
            child: SkeletonBox(width: 110, height: 16, borderRadius: 6),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Column(
              children: [
                for (var row = 0; row < rowsPerPage; row++) ...[
                  _buildRow(row),
                ],
              ],
            ),
          ),
          const SizedBox(height: 10),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SkeletonBox(width: 16, height: 6, borderRadius: 999),
              SizedBox(width: 6),
              SkeletonBox(width: 6, height: 6, borderRadius: 999),
            ],
          ),
        ],
      ),
    );
  }
}

/// Horizontal categories strip on shop All tab (above New Post).
class SkeletonHomeCategoriesCarousel extends StatelessWidget {
  const SkeletonHomeCategoriesCarousel({
    super.key,
    this.tileCount = 6,
    this.tileWidth = 88,
    this.imageHeight = 72,
    this.listHeight = 108,
    this.padding = const EdgeInsets.fromLTRB(0, 2, 0, 6),
  });

  final int tileCount;
  final double tileWidth;
  final double imageHeight;
  final double listHeight;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(14, 0, 14, 8),
            child: Row(
              children: [
                SkeletonBox(width: 96, height: 16, borderRadius: 6),
                Spacer(),
                SkeletonBox(width: 56, height: 14, borderRadius: 6),
              ],
            ),
          ),
          SizedBox(
            height: listHeight,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(14, 0, 22, 0),
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: tileCount,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                return SizedBox(
                  width: tileWidth,
                  child: Column(
                    children: [
                      SkeletonBox(
                        width: tileWidth,
                        height: imageHeight,
                        borderRadius: 14,
                      ),
                      const SizedBox(height: 6),
                      SkeletonBox(
                        width: 56 + (index % 3) * 6,
                        height: 11,
                        borderRadius: 5,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Horizontal new-post carousel (search listing card style) on shop All tab.
class SkeletonNewPostHomeCarousel extends StatelessWidget {
  const SkeletonNewPostHomeCarousel({
    super.key,
    this.cardCount = 4,
    this.cardWidth = 96,
    this.listHeight = 170,
    this.padding = EdgeInsets.zero,
  });

  final int cardCount;
  final double cardWidth;
  final double listHeight;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(14, 0, 14, 0),
            child: Row(
              children: [
                SkeletonBox(width: 28, height: 28, borderRadius: 8),
                SizedBox(width: 8),
                SkeletonBox(width: 88, height: 16, borderRadius: 6),
                Spacer(),
                SkeletonBox(width: 56, height: 14, borderRadius: 6),
              ],
            ),
          ),
          SizedBox(
            height: listHeight,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(10, 0, 22, 0),
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: cardCount,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                return SizedBox(
                  width: cardWidth,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(
                        width: cardWidth,
                        height: cardWidth,
                        borderRadius: 14,
                      ),
                      const SizedBox(height: 7),
                      SkeletonBox(
                        width: cardWidth * 0.7,
                        height: 14,
                        borderRadius: 6,
                      ),
                      const SizedBox(height: 4),
                      SkeletonBox(
                        width: cardWidth,
                        height: 12,
                        borderRadius: 6,
                      ),
                      const SizedBox(height: 4),
                      SkeletonBox(
                        width: cardWidth * 0.85,
                        height: 12,
                        borderRadius: 6,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Home live search: "Showing results for…" + platform sections + company rows.
class SkeletonLiveSearchResultsPanel extends StatelessWidget {
  const SkeletonLiveSearchResultsPanel({
    super.key,
    this.padding = const EdgeInsets.fromLTRB(10, 0, 10, 16),
  });

  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: padding,
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      children: const [
        Padding(
          padding: EdgeInsets.fromLTRB(2, 2, 2, 16),
          child: Row(
            children: [
              Expanded(
                child: SkeletonBox(
                  width: double.infinity,
                  height: 14,
                  borderRadius: 6,
                ),
              ),
              SizedBox(width: 12),
              SkeletonBox(width: 56, height: 12, borderRadius: 6),
            ],
          ),
        ),
        _SkeletonLiveSearchPlatformSection(),
        SizedBox(height: 8),
        _SkeletonLiveSearchPlatformSection(),
        SizedBox(height: 8),
      ],
    );
  }
}

class _SkeletonLiveSearchPlatformSection extends StatelessWidget {
  const _SkeletonLiveSearchPlatformSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: const [
        Row(
          children: [
            SkeletonCircle(size: 28),
            SizedBox(width: 10),
            SkeletonBox(width: 72, height: 16, borderRadius: 6),
          ],
        ),
        SizedBox(height: 12),
        _SkeletonLiveSearchCompanyBlock(),
        SizedBox(height: 10),
      ],
    );
  }
}

class _SkeletonLiveSearchCompanyBlock extends StatelessWidget {
  const _SkeletonLiveSearchCompanyBlock();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonCircle(size: 44),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: double.infinity, height: 14, borderRadius: 6),
                  SizedBox(height: 6),
                  SkeletonBox(width: 120, height: 11, borderRadius: 6),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 96,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: 4,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              return ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: const SizedBox(
                  width: 96,
                  height: 96,
                  child: SkeletonShimmer(baseColor: kSkeletonBaseColor),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class SkeletonProductGrid extends StatelessWidget {
  const SkeletonProductGrid({
    super.key,
    this.count = 6,
    this.padding = const EdgeInsets.fromLTRB(12, 8, 12, 24),
    this.crossAxisCount = 2,
  });

  final int count;
  final EdgeInsetsGeometry padding;
  final int crossAxisCount;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: padding,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 3 / 4,
      ),
      itemCount: count,
      itemBuilder: (context, index) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: SkeletonShimmer(),
              ),
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    SkeletonBox(width: double.infinity, height: 12),
                    SizedBox(height: 6),
                    SkeletonBox(width: 80, height: 10),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class SkeletonShowcaseBanner extends StatelessWidget {
  const SkeletonShowcaseBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 64, 20, 20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          SkeletonBox(width: 200, height: 22, borderRadius: 8),
          SizedBox(height: 10),
          SkeletonBox(width: double.infinity, height: 14, borderRadius: 6),
          SizedBox(height: 6),
          SkeletonBox(width: 260, height: 14, borderRadius: 6),
          SizedBox(height: 18),
          SkeletonBox(width: 48, height: 48, borderRadius: 12),
        ],
      ),
    );
  }
}

class SkeletonFormPanel extends StatelessWidget {
  const SkeletonFormPanel({super.key, this.padding});

  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding:
          padding ?? const EdgeInsets.fromLTRB(20, 20, 20, 32),
      children: const [
        SkeletonBox(width: 140, height: 22, borderRadius: 8),
        SizedBox(height: 20),
        SkeletonBox(width: double.infinity, height: 48, borderRadius: 12),
        SizedBox(height: 14),
        SkeletonBox(width: double.infinity, height: 48, borderRadius: 12),
        SizedBox(height: 14),
        SkeletonBox(width: double.infinity, height: 120, borderRadius: 12),
        SizedBox(height: 20),
        SkeletonBox(width: double.infinity, height: 44, borderRadius: 999),
      ],
    );
  }
}

class SkeletonCenteredPanel extends StatelessWidget {
  const SkeletonCenteredPanel({super.key, this.minHeight});

  final double? minHeight;

  @override
  Widget build(BuildContext context) {
    final panel = const SkeletonListRows(count: 5);
    if (minHeight == null) return panel;
    return SizedBox(
      height: minHeight,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: panel,
      ),
    );
  }
}
