import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:video_player/video_player.dart';

/// Square card side + 1/4 → width:height = 4:5.
const double kListingVideoCardAspectRatio = 4 / 5;

/// Picks one listing-card video to play: footer must be on-screen, then
/// highest on screen (smallest global Y) wins so uneven masonry still
/// plays in visual top-to-bottom order.
class ListingCardVideoPlaybackCoordinator {
  ListingCardVideoPlaybackCoordinator._();
  static final ListingCardVideoPlaybackCoordinator instance =
      ListingCardVideoPlaybackCoordinator._();

  final Map<String, _ListingVideoCandidate> _candidates = {};
  String? _activeId;
  Timer? _electTimer;

  void report({
    required String id,
    required bool footerVisible,
    required double topY,
    required double leftX,
    required VoidCallback onShouldPlay,
    required VoidCallback onShouldPause,
  }) {
    if (!footerVisible) {
      final removed = _candidates.remove(id);
      if (removed != null && _activeId == id) {
        _activeId = null;
        onShouldPause();
      }
      _scheduleElect();
      return;
    }

    _candidates[id] = _ListingVideoCandidate(
      id: id,
      topY: topY,
      leftX: leftX,
      onShouldPlay: onShouldPlay,
      onShouldPause: onShouldPause,
    );
    _scheduleElect();
  }

  void unregister(String id) {
    final removed = _candidates.remove(id);
    if (removed == null) return;
    if (_activeId == id) {
      _activeId = null;
      try {
        removed.onShouldPause();
      } catch (_) {}
    }
    _scheduleElect();
  }

  void _scheduleElect() {
    _electTimer?.cancel();
    _electTimer = Timer(const Duration(milliseconds: 48), _elect);
  }

  void _elect() {
    if (_candidates.isEmpty) {
      _activeId = null;
      return;
    }

    final ranked = _candidates.values.toList()
      ..sort((a, b) {
        final byTop = a.topY.compareTo(b.topY);
        if (byTop != 0) return byTop;
        return a.leftX.compareTo(b.leftX);
      });

    final winner = ranked.first;
    if (_activeId == winner.id) {
      winner.onShouldPlay();
      return;
    }

    final previousId = _activeId;
    _activeId = winner.id;
    if (previousId != null) {
      final previous = _candidates[previousId];
      previous?.onShouldPause();
    }
    winner.onShouldPlay();
  }
}

class _ListingVideoCandidate {
  const _ListingVideoCandidate({
    required this.id,
    required this.topY,
    required this.leftX,
    required this.onShouldPlay,
    required this.onShouldPause,
  });

  final String id;
  final double topY;
  final double leftX;
  final VoidCallback onShouldPlay;
  final VoidCallback onShouldPause;
}

/// Muted one-shot listing video; autoplays only when elected by
/// [ListingCardVideoPlaybackCoordinator].
class ListingCardVideo extends StatefulWidget {
  const ListingCardVideo({
    super.key,
    required this.productId,
    required this.videoUrl,
    this.thumbnailUrl = '',
    this.fallback,
  });

  final String productId;
  final String videoUrl;
  final String thumbnailUrl;
  final Widget? fallback;

  @override
  State<ListingCardVideo> createState() => _ListingCardVideoState();
}

class _ListingCardVideoState extends State<ListingCardVideo>
    with WidgetsBindingObserver {
  VideoPlayerController? _controller;
  ScrollPosition? _scrollPosition;
  bool _initializing = false;
  bool _wantsPlay = false;
  bool _hasError = false;
  bool _appResumed = true;
  bool _hasCompletedPlayback = false;
  int _remainingSeconds = 0;

  String get _slotId => widget.productId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SchedulerBinding.instance.addPostFrameCallback((_) => _measureAndReport());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final position = Scrollable.maybeOf(context)?.position;
    if (!identical(position, _scrollPosition)) {
      _scrollPosition?.removeListener(_measureAndReport);
      _scrollPosition = position;
      _scrollPosition?.addListener(_measureAndReport);
    }
  }

  @override
  void didUpdateWidget(covariant ListingCardVideo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.videoUrl != widget.videoUrl ||
        oldWidget.productId != widget.productId) {
      ListingCardVideoPlaybackCoordinator.instance.unregister(oldWidget.productId);
      unawaited(_disposeController());
      _hasError = false;
      _wantsPlay = false;
      _hasCompletedPlayback = false;
      _remainingSeconds = 0;
      SchedulerBinding.instance.addPostFrameCallback((_) => _measureAndReport());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appResumed = state == AppLifecycleState.resumed;
    if (!_appResumed) {
      _pausePlayback();
    } else {
      _measureAndReport();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scrollPosition?.removeListener(_measureAndReport);
    ListingCardVideoPlaybackCoordinator.instance.unregister(_slotId);
    unawaited(_disposeController());
    super.dispose();
  }

  Future<void> _disposeController() async {
    final controller = _controller;
    _controller = null;
    if (controller == null) return;
    controller.removeListener(_handlePlaybackProgress);
    try {
      await controller.pause();
    } catch (_) {}
    await controller.dispose();
  }

  void _handlePlaybackProgress() {
    final controller = _controller;
    if (!mounted || controller == null || !controller.value.isInitialized) {
      return;
    }

    final duration = controller.value.duration;
    final position = controller.value.position;
    if (duration <= Duration.zero) return;

    final remaining = duration - position;
    final nextRemainingSeconds = remaining <= Duration.zero
        ? 0
        : (remaining.inMilliseconds / Duration.millisecondsPerSecond).ceil();
    final hasCompleted = position >= duration;

    final hasJustCompleted = hasCompleted && !_hasCompletedPlayback;
    if (hasJustCompleted) {
      _hasCompletedPlayback = true;
      _wantsPlay = false;
      unawaited(controller.pause());
    }

    if (nextRemainingSeconds != _remainingSeconds || hasJustCompleted) {
      setState(() {
        _remainingSeconds = nextRemainingSeconds;
      });
    }
  }

  String get _countdownLabel {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds.remainder(60);
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  bool _isFooterVisible(RenderBox box) {
    final topLeft = box.localToGlobal(Offset.zero);
    final bottom = topLeft.dy + box.size.height;
    final viewHeight = MediaQuery.sizeOf(context).height;
    // Start only once the video footer has entered the viewport.
    final footerOnScreen = bottom <= viewHeight && bottom >= 0;
    final overlapsViewport = bottom > 0 && topLeft.dy < viewHeight;
    return footerOnScreen && overlapsViewport;
  }

  void _measureAndReport() {
    if (!mounted || !_appResumed) return;
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize || !box.attached) return;

    final topLeft = box.localToGlobal(Offset.zero);
    final footerVisible = _isFooterVisible(box);

    ListingCardVideoPlaybackCoordinator.instance.report(
      id: _slotId,
      footerVisible: footerVisible,
      topY: topLeft.dy,
      leftX: topLeft.dx,
      onShouldPlay: _requestPlay,
      onShouldPause: _pausePlayback,
    );
  }

  void _requestPlay() {
    if (!mounted || !_appResumed || _hasCompletedPlayback) return;
    final wasWantingPlay = _wantsPlay;
    _wantsPlay = true;
    if (!wasWantingPlay && mounted) {
      setState(() {});
    }
    final controller = _controller;
    if (controller != null && controller.value.isInitialized) {
      if (!controller.value.isPlaying) {
        unawaited(controller.play());
      }
      return;
    }
    unawaited(_ensureControllerAndPlay());
  }

  void _pausePlayback() {
    final wasWantingPlay = _wantsPlay;
    _wantsPlay = false;
    if (wasWantingPlay && mounted) {
      setState(() {});
    }
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (controller.value.isPlaying) {
      unawaited(controller.pause());
    }
  }

  Future<void> _ensureControllerAndPlay() async {
    if (_initializing || _hasError) return;
    final url = widget.videoUrl.trim();
    if (url.isEmpty) {
      _hasError = true;
      if (mounted) setState(() {});
      return;
    }

    _initializing = true;
    try {
      final controller = VideoPlayerController.networkUrl(Uri.parse(url));
      await controller.initialize();
      await controller.setLooping(false);
      await controller.setVolume(0);
      if (!mounted || widget.videoUrl.trim() != url) {
        await controller.dispose();
        return;
      }
      await _disposeController();
      _controller = controller;
      _remainingSeconds =
          (controller.value.duration.inMilliseconds /
                  Duration.millisecondsPerSecond)
              .ceil();
      controller.addListener(_handlePlaybackProgress);
      if (_wantsPlay && _appResumed) {
        await controller.play();
      } else {
        await controller.pause();
      }
      if (mounted) setState(() {});
    } catch (_) {
      _hasError = true;
      if (mounted) setState(() {});
    } finally {
      _initializing = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    final thumbnail = widget.thumbnailUrl.trim();
    final showVideo =
        controller != null && controller.value.isInitialized && !_hasError;

    return NotificationListener<SizeChangedLayoutNotification>(
      onNotification: (_) {
        SchedulerBinding.instance.addPostFrameCallback((_) => _measureAndReport());
        return false;
      },
      child: SizeChangedLayoutNotifier(
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (thumbnail.isNotEmpty)
              CachedNetworkImage(
                imageUrl: thumbnail,
                fit: BoxFit.cover,
                fadeInDuration: Duration.zero,
                fadeOutDuration: Duration.zero,
                errorWidget: (_, _, _) =>
                    widget.fallback ?? const ColoredBox(color: Color(0xFFE8EAED)),
              )
            else if (widget.fallback != null)
              widget.fallback!
            else
              const ColoredBox(color: Color(0xFFE8EAED)),
            // Show live video only while this card is the elected autoplay target.
            // When paused/off-screen, keep the video cover visible (not the main photo).
            if (showVideo && _wantsPlay)
              ClipRect(
                child: FittedBox(
                  fit: BoxFit.cover,
                  child: SizedBox(
                    width: controller.value.size.width,
                    height: controller.value.size.height,
                    child: VideoPlayer(controller),
                  ),
                ),
              ),
            if (showVideo)
              Positioned(
                top: 8,
                left: 8,
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: const Color(0xB3000000),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 4,
                      ),
                      child: Text(
                        _countdownLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          height: 1,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
