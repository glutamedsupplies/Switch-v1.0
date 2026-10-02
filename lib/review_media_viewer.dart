import 'dart:async';

import 'package:flutter/material.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/services/review_media_like_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:video_player/video_player.dart';

/// One photo or video in the review media feed, with the review it came from.
class ReviewMediaFeedEntry {
  const ReviewMediaFeedEntry({
    required this.reviewId,
    required this.reviewer,
    required this.rating,
    required this.message,
    required this.media,
  });

  final String reviewId;
  final String reviewer;
  final double rating;
  final String message;
  final ProductReviewMedia media;

  String get likeKey => reviewMediaLikeKey(reviewId, media.url);
}

/// Flattens reviews into a feed of their photos and videos, in review order.
List<ReviewMediaFeedEntry> buildReviewMediaFeed(
  Iterable<
    ({
      String id,
      String reviewer,
      double rating,
      String message,
      List<ProductReviewMedia> media,
    })
  >
  reviews,
) {
  return [
    for (final review in reviews)
      for (final media in review.media)
        if (media.url.trim().isNotEmpty)
          ReviewMediaFeedEntry(
            reviewId: review.id,
            reviewer: review.reviewer,
            rating: review.rating,
            message: review.message,
            media: media,
          ),
  ];
}

Future<void> openReviewMediaViewer(
  BuildContext context, {
  required String productId,
  required List<ReviewMediaFeedEntry> entries,
  int initialIndex = 0,
}) {
  if (entries.isEmpty) {
    return Future<void>.value();
  }

  return Navigator.of(context).push(
    PageRouteBuilder<void>(
      opaque: true,
      transitionDuration: const Duration(milliseconds: 220),
      reverseTransitionDuration: const Duration(milliseconds: 180),
      pageBuilder: (_, _, _) => ReviewMediaViewerPage(
        productId: productId,
        entries: entries,
        initialIndex: initialIndex.clamp(0, entries.length - 1).toInt(),
      ),
      transitionsBuilder: (_, animation, _, child) =>
          FadeTransition(opacity: animation, child: child),
    ),
  );
}

class ReviewMediaViewerPage extends StatefulWidget {
  const ReviewMediaViewerPage({
    super.key,
    required this.productId,
    required this.entries,
    this.initialIndex = 0,
  });

  final String productId;
  final List<ReviewMediaFeedEntry> entries;
  final int initialIndex;

  @override
  State<ReviewMediaViewerPage> createState() => _ReviewMediaViewerPageState();
}

class _ReviewMediaViewerPageState extends State<ReviewMediaViewerPage> {
  final ReviewMediaLikeService _likeService = createReviewMediaLikeService();
  final Map<String, ReviewMediaLikeState> _likes = {};
  final Set<String> _pendingLikeKeys = {};
  late final PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
    unawaited(_loadLikes());
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadLikes() async {
    final likes = await _likeService.fetchLikes(widget.productId);
    if (!mounted || likes.isEmpty) {
      return;
    }
    setState(() {
      for (final entry in likes.entries) {
        if (!_pendingLikeKeys.contains(entry.key)) {
          _likes[entry.key] = entry.value;
        }
      }
    });
  }

  bool _isLiked(ReviewMediaFeedEntry entry) =>
      _likes[entry.likeKey]?.liked ?? false;

  int _likeCount(ReviewMediaFeedEntry entry) =>
      entry.media.likeCount + (_likes[entry.likeKey]?.count ?? 0);

  Future<void> _setLiked(ReviewMediaFeedEntry entry, bool liked) async {
    if (!AuthSession.isLoggedInSync) {
      await redirectGuestToLogin(context);
      return;
    }

    final key = entry.likeKey;
    final previous =
        _likes[key] ?? const ReviewMediaLikeState(count: 0, liked: false);
    if (previous.liked == liked || _pendingLikeKeys.contains(key)) {
      return;
    }

    setState(() {
      _pendingLikeKeys.add(key);
      _likes[key] = ReviewMediaLikeState(
        count: (previous.count + (liked ? 1 : -1)).clamp(0, 1 << 31).toInt(),
        liked: liked,
      );
    });

    final result = await _likeService.setLiked(
      productId: widget.productId,
      reviewId: entry.reviewId,
      mediaUrl: entry.media.url,
      liked: liked,
    );
    if (!mounted) {
      return;
    }

    setState(() {
      _pendingLikeKeys.remove(key);
      _likes[key] = result.state ?? previous;
    });

    if (!result.ok) {
      if (result.requiresLogin) {
        await redirectGuestToLogin(context);
        return;
      }
      AppSnackBar.showError(context, message: result.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.entries.length;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.vertical,
            itemCount: total,
            onPageChanged: (index) => setState(() => _currentIndex = index),
            itemBuilder: (context, index) {
              final entry = widget.entries[index];
              return _ReviewMediaFeedPage(
                key: ValueKey('${entry.likeKey}#$index'),
                entry: entry,
                isActive: index == _currentIndex,
                liked: _isLiked(entry),
                likeCount: _likeCount(entry),
                onLikeToggle: () => _setLiked(entry, !_isLiked(entry)),
                onDoubleTapLike: () => _setLiked(entry, true),
              );
            },
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 16, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.close_rounded, size: 28),
                      color: Colors.white,
                      tooltip: 'Close',
                    ),
                    const SizedBox(width: 4),
                    const Expanded(
                      child: Text(
                        'Review photos & videos',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          shadows: [
                            Shadow(color: Colors.black54, blurRadius: 8),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewMediaFeedPage extends StatefulWidget {
  const _ReviewMediaFeedPage({
    super.key,
    required this.entry,
    required this.isActive,
    required this.liked,
    required this.likeCount,
    required this.onLikeToggle,
    required this.onDoubleTapLike,
  });

  final ReviewMediaFeedEntry entry;
  final bool isActive;
  final bool liked;
  final int likeCount;
  final VoidCallback onLikeToggle;
  final VoidCallback onDoubleTapLike;

  @override
  State<_ReviewMediaFeedPage> createState() => _ReviewMediaFeedPageState();
}

class _ReviewMediaFeedPageState extends State<_ReviewMediaFeedPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _heartController;
  Offset _heartPosition = Offset.zero;
  Offset _lastDoubleTapPosition = Offset.zero;
  bool _userPaused = false;

  @override
  void initState() {
    super.initState();
    _heartController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 750),
    );
  }

  @override
  void didUpdateWidget(covariant _ReviewMediaFeedPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isActive && !widget.isActive) {
      _userPaused = false;
    }
  }

  @override
  void dispose() {
    _heartController.dispose();
    super.dispose();
  }

  void _handleDoubleTap() {
    setState(() => _heartPosition = _lastDoubleTapPosition);
    _heartController.forward(from: 0);
    widget.onDoubleTapLike();
  }

  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    final media = entry.media;
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Stack(
      fit: StackFit.expand,
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: media.isVideo
              ? () => setState(() => _userPaused = !_userPaused)
              : null,
          onDoubleTapDown: (details) =>
              _lastDoubleTapPosition = details.localPosition,
          onDoubleTap: _handleDoubleTap,
          child: media.isVideo
              ? _ReviewFeedVideo(
                  url: media.url,
                  thumbnailUrl: media.thumbnailUrl,
                  playing: widget.isActive && !_userPaused,
                  showPausedIcon: widget.isActive && _userPaused,
                  bottomInset: bottomInset,
                )
              : _ReviewFeedPhoto(url: media.url),
        ),
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: [0, 0.16, 0.6, 1],
                colors: [
                  Color(0x88000000),
                  Color(0x00000000),
                  Color(0x00000000),
                  Color(0xAA000000),
                ],
              ),
            ),
          ),
        ),
        AnimatedBuilder(
          animation: _heartController,
          builder: (context, _) {
            if (!_heartController.isAnimating) {
              return const SizedBox.shrink();
            }
            final t = _heartController.value;
            final scale = t < 0.3 ? 0.6 + (t / 0.3) * 0.6 : 1.2 - (t - 0.3) * 0.3;
            final opacity = t < 0.7 ? 1.0 : (1 - (t - 0.7) / 0.3);
            return Positioned(
              left: _heartPosition.dx - 48,
              top: _heartPosition.dy - 48 - t * 40,
              child: IgnorePointer(
                child: Opacity(
                  opacity: opacity.clamp(0.0, 1.0),
                  child: Transform.scale(
                    scale: scale,
                    child: const Icon(
                      Icons.favorite_rounded,
                      size: 96,
                      color: Color(0xFFFF2D55),
                      shadows: [Shadow(color: Colors.black38, blurRadius: 16)],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
        Positioned(
          right: 10,
          bottom: 96 + bottomInset,
          child: _ReviewFeedLikeButton(
            liked: widget.liked,
            count: widget.likeCount,
            onTap: widget.onLikeToggle,
          ),
        ),
        Positioned(
          left: 16,
          right: 84,
          bottom: 28 + bottomInset,
          child: IgnorePointer(child: _ReviewFeedCaption(entry: entry)),
        ),
      ],
    );
  }
}

class _ReviewFeedPhoto extends StatelessWidget {
  const _ReviewFeedPhoto({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: BoxFit.contain,
      width: double.infinity,
      height: double.infinity,
      loadingBuilder: (context, child, progress) {
        if (progress == null) {
          return child;
        }
        return const Center(
          child: CircularProgressIndicator(color: Colors.white70),
        );
      },
      errorBuilder: (context, error, stackTrace) => const Center(
        child: Icon(
          Icons.broken_image_outlined,
          color: Colors.white54,
          size: 48,
        ),
      ),
    );
  }
}

class _ReviewFeedVideo extends StatefulWidget {
  const _ReviewFeedVideo({
    required this.url,
    required this.thumbnailUrl,
    required this.playing,
    required this.showPausedIcon,
    required this.bottomInset,
  });

  final String url;
  final String thumbnailUrl;
  final bool playing;
  final bool showPausedIcon;
  final double bottomInset;

  @override
  State<_ReviewFeedVideo> createState() => _ReviewFeedVideoState();
}

class _ReviewFeedVideoState extends State<_ReviewFeedVideo> {
  late final VideoPlayerController _controller;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    _controller
        .initialize()
        .then((_) {
          if (!mounted) {
            return;
          }
          _controller.setLooping(true);
          _syncPlayback();
          setState(() {});
        })
        .catchError((Object _) {
          if (mounted) {
            setState(() => _failed = true);
          }
        });
  }

  @override
  void didUpdateWidget(covariant _ReviewFeedVideo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.playing != widget.playing) {
      _syncPlayback();
    }
  }

  void _syncPlayback() {
    if (!_controller.value.isInitialized) {
      return;
    }
    if (widget.playing) {
      _controller.play();
    } else {
      _controller.pause();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return const Center(
        child: Icon(
          Icons.videocam_off_outlined,
          color: Colors.white54,
          size: 48,
        ),
      );
    }

    final value = _controller.value;
    final thumbnailUrl = widget.thumbnailUrl.trim();

    return Stack(
      fit: StackFit.expand,
      children: [
        if (value.isInitialized)
          Center(
            child: AspectRatio(
              aspectRatio: value.aspectRatio,
              child: VideoPlayer(_controller),
            ),
          )
        else ...[
          if (thumbnailUrl.isNotEmpty)
            Image.network(
              thumbnailUrl,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const SizedBox.shrink(),
            ),
          const Center(child: CircularProgressIndicator(color: Colors.white70)),
        ],
        if (widget.showPausedIcon)
          const IgnorePointer(
            child: Center(
              child: Icon(
                Icons.play_arrow_rounded,
                size: 84,
                color: Colors.white70,
              ),
            ),
          ),
        if (value.isInitialized)
          Positioned(
            left: 0,
            right: 0,
            bottom: widget.bottomInset,
            child: SizedBox(
              height: 14,
              child: Align(
                alignment: Alignment.bottomCenter,
                child: VideoProgressIndicator(
                  _controller,
                  allowScrubbing: true,
                  padding: const EdgeInsets.only(top: 10),
                  colors: VideoProgressColors(
                    playedColor: Colors.white,
                    bufferedColor: Colors.white.withValues(alpha: 0.35),
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ReviewFeedLikeButton extends StatelessWidget {
  const _ReviewFeedLikeButton({
    required this.liked,
    required this.count,
    required this.onTap,
  });

  final bool liked;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      toggled: liked,
      label: liked ? 'Unlike' : 'Like',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedScale(
                scale: liked ? 1.12 : 1,
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOutBack,
                child: Icon(
                  liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  size: 38,
                  color: liked ? const Color(0xFFFF2D55) : Colors.white,
                  shadows: const [Shadow(color: Colors.black45, blurRadius: 10)],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _formatLikeCount(count),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  shadows: [Shadow(color: Colors.black54, blurRadius: 8)],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReviewFeedCaption extends StatelessWidget {
  const _ReviewFeedCaption({required this.entry});

  final ReviewMediaFeedEntry entry;

  @override
  Widget build(BuildContext context) {
    const shadow = [Shadow(color: Colors.black54, blurRadius: 8)];
    final reviewer = entry.reviewer.trim().isEmpty
        ? 'Verified Buyer'
        : entry.reviewer.trim();
    final filledStars = entry.rating.round().clamp(0, 5);
    final message = entry.message.trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.white24,
              child: Text(
                reviewer[0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                reviewer,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  shadows: shadow,
                ),
              ),
            ),
            const SizedBox(width: 8),
            for (var star = 0; star < 5; star++)
              Icon(
                Icons.star_rounded,
                size: 14,
                color: star < filledStars
                    ? const Color(0xFFF9A825)
                    : Colors.white38,
              ),
          ],
        ),
        if (message.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            message,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              height: 1.3,
              shadows: shadow,
            ),
          ),
        ],
      ],
    );
  }
}

String _formatLikeCount(int count) {
  if (count >= 1000000) {
    return '${(count / 1000000).toStringAsFixed(count >= 10000000 ? 0 : 1)}M';
  }
  if (count >= 1000) {
    return '${(count / 1000).toStringAsFixed(count >= 10000 ? 0 : 1)}K';
  }
  return '$count';
}
