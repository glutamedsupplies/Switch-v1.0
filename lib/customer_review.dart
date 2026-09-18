import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:gms_shopping/widgets/horizontal_end_fade.dart';
import 'package:gms_shopping/models/product.dart';
import 'package:video_player/video_player.dart';
import 'package:gms_shopping/widgets/skeleton_loading.dart';

class CustomerReviewItem {
  const CustomerReviewItem({
    required this.reviewer,
    required this.title,
    required this.message,
    required this.rating,
    this.media = const <ProductReviewMedia>[],
    this.sellerReply,
  });

  final String reviewer;
  final String title;
  final String message;
  final double rating;
  final List<ProductReviewMedia> media;
  final ProductReviewSellerReply? sellerReply;
}

class CustomerReviewPage extends StatelessWidget {
  const CustomerReviewPage({
    super.key,
    required this.productName,
    required this.reviews,
    this.productCompanyName = '',
  });

  final String productName;
  final List<CustomerReviewItem> reviews;
  final String productCompanyName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    final title = productName.trim().isEmpty ? 'Product Reviews' : productName;

    return Scaffold(
      backgroundColor: theme.cardColor,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        backgroundColor:
            theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface,
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Customer Reviews',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: secondaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
      body: reviews.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'No customer reviews available yet for this product.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: secondaryColor,
                    height: 1.2,
                  ),
                ),
              ),
            )
          : SafeArea(
              top: false,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
                itemCount: reviews.length + 1,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Row(
                      children: [
                        Icon(
                          Icons.reviews_outlined,
                          color: primaryColor,
                          size: 22,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            '${reviews.length} review${reviews.length == 1 ? '' : 's'}',
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    );
                  }

                  return _CustomerReviewListCard(
                    review: reviews[index - 1],
                    fallbackCompanyName: productCompanyName,
                  );
                },
              ),
            ),
    );
  }
}

class CustomerReviewMediaStrip extends StatelessWidget {
  const CustomerReviewMediaStrip({
    super.key,
    required this.media,
    this.tileSize = 84,
  });

  final List<ProductReviewMedia> media;
  final double tileSize;

  @override
  Widget build(BuildContext context) {
    if (media.isEmpty) {
      return const SizedBox.shrink();
    }

    return HorizontalEndFade(
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.only(right: 18),
        child: Row(
          children: [
            for (var index = 0; index < media.length; index += 1) ...[
              if (index > 0) const SizedBox(width: 8),
              _CustomerReviewMediaTile(media: media[index], size: tileSize),
            ],
          ],
        ),
      ),
    );
  }
}

class _CustomerReviewMediaTile extends StatelessWidget {
  const _CustomerReviewMediaTile({required this.media, required this.size});

  final ProductReviewMedia media;
  final double size;

  void _openPreview(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) {
        if (media.isVideo) {
          return _CustomerReviewVideoDialog(media: media);
        }

        return Dialog(
          insetPadding: const EdgeInsets.all(18),
          backgroundColor: Colors.black,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: InteractiveViewer(
              minScale: 1,
              maxScale: 4,
              child: Image.network(
                media.url,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) {
                  return const SizedBox(
                    width: 260,
                    height: 220,
                    child: Icon(
                      Icons.broken_image_outlined,
                      color: Colors.white70,
                      size: 36,
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final thumbnailUrl = media.thumbnailUrl.trim();
    final tile = ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: size,
        height: size,
        child: media.isVideo
            ? _buildVideoPreview(context, thumbnailUrl)
            : _buildImagePreview(context, media.url),
      ),
    );

    return Semantics(
      button: true,
      label: media.isVideo ? 'Review video' : 'Review photo',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _openPreview(context),
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: theme.dividerColor.withOpacity(0.42)),
          ),
          child: tile,
        ),
      ),
    );
  }

  Widget _buildImagePreview(BuildContext context, String imageUrl) {
    final theme = Theme.of(context);

    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) {
        return ColoredBox(
          color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
          child: Icon(
            Icons.broken_image_outlined,
            color: theme.colorScheme.onSurface.withOpacity(0.45),
          ),
        );
      },
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) {
          return child;
        }

        return ColoredBox(
          color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
          child: Center(
            child: const SkeletonCircle(size: 18),
          ),
        );
      },
    );
  }

  Widget _buildVideoPreview(BuildContext context, String thumbnailUrl) {
    final theme = Theme.of(context);
    final preview = thumbnailUrl.isEmpty
        ? ColoredBox(
            color: Colors.black,
            child: Center(
              child: Icon(
                Icons.play_circle_fill_rounded,
                color: Colors.white.withOpacity(0.9),
                size: 34,
              ),
            ),
          )
        : Stack(
            fit: StackFit.expand,
            children: [
              _buildImagePreview(context, thumbnailUrl),
              ColoredBox(color: Colors.black.withOpacity(0.18)),
              Center(
                child: Icon(
                  Icons.play_circle_fill_rounded,
                  color: Colors.white.withOpacity(0.92),
                  size: 34,
                ),
              ),
            ],
          );

    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.onSurface.withOpacity(0.08),
      ),
      child: preview,
    );
  }
}

class _CustomerReviewVideoDialog extends StatefulWidget {
  const _CustomerReviewVideoDialog({required this.media});

  final ProductReviewMedia media;

  @override
  State<_CustomerReviewVideoDialog> createState() =>
      _CustomerReviewVideoDialogState();
}

class _CustomerReviewVideoDialogState
    extends State<_CustomerReviewVideoDialog> {
  late final VideoPlayerController _controller;
  late final Future<void> _initializeVideo;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.media.url));
    _initializeVideo = _controller.initialize().then((_) {
      _controller
        ..setLooping(true)
        ..play();
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(18),
      backgroundColor: Colors.black,
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: FutureBuilder<void>(
              future: _initializeVideo,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return const SizedBox(
                    width: 280,
                    height: 220,
                    child: Center(
                      child: Icon(
                        Icons.videocam_off_outlined,
                        color: Colors.white70,
                        size: 36,
                      ),
                    ),
                  );
                }

                if (snapshot.connectionState == ConnectionState.done &&
                    _controller.value.isInitialized) {
                  return AspectRatio(
                    aspectRatio: _controller.value.aspectRatio,
                    child: VideoPlayer(_controller),
                  );
                }

                return const SizedBox(
                  width: 280,
                  height: 220,
                  child: SkeletonShimmer(baseColor: kSkeletonBaseColor),
                );
              },
            ),
          ),
          Positioned(
            top: 4,
            right: 4,
            child: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close_rounded),
              color: Colors.white,
              tooltip: 'Close',
            ),
          ),
        ],
      ),
    );
  }
}

class CustomerReviewSellerReplyBlock extends StatefulWidget {
  const CustomerReviewSellerReplyBlock({
    super.key,
    required this.reply,
    this.fallbackCompanyName = '',
  });

  final ProductReviewSellerReply reply;
  final String fallbackCompanyName;

  @override
  State<CustomerReviewSellerReplyBlock> createState() =>
      _CustomerReviewSellerReplyBlockState();
}

class _CustomerReviewSellerReplyBlockState
    extends State<CustomerReviewSellerReplyBlock> {
  late final TapGestureRecognizer _readMoreRecognizer;

  @override
  void initState() {
    super.initState();
    _readMoreRecognizer = TapGestureRecognizer()..onTap = _showFullReply;
  }

  @override
  void dispose() {
    _readMoreRecognizer.dispose();
    super.dispose();
  }

  String get _message => widget.reply.message.trim();

  String get _sellerName {
    return [
          widget.reply.companyName,
          widget.reply.author,
          widget.fallbackCompanyName,
        ]
        .map((candidate) => candidate.trim())
        .firstWhere(
          (candidate) => candidate.isNotEmpty,
          orElse: () => 'Seller',
        );
  }

  void _showFullReply() {
    final message = _message;
    if (message.isEmpty) {
      return;
    }

    showDialog<void>(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        final titleColor = theme.colorScheme.onSurface;
        final secondaryColor =
            theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
            theme.colorScheme.onSurface.withOpacity(0.72);

        return AlertDialog(
          title: const Text('Seller Reply'),
          content: SingleChildScrollView(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: '$_sellerName: ',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: titleColor,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                    ),
                  ),
                  TextSpan(
                    text: message,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: secondaryColor,
                      height: 1.25,
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  TextSpan _buildReplyTextSpan({
    required TextStyle sellerStyle,
    required TextStyle messageStyle,
    required TextStyle readMoreStyle,
    required String message,
    bool showReadMore = false,
  }) {
    return TextSpan(
      children: [
        TextSpan(text: '$_sellerName: ', style: sellerStyle),
        TextSpan(text: message, style: messageStyle),
        if (showReadMore)
          TextSpan(
            text: ' Read more',
            style: readMoreStyle,
            recognizer: _readMoreRecognizer,
          ),
      ],
    );
  }

  String _buildPreviewMessage({
    required BuildContext context,
    required double maxWidth,
    required TextStyle sellerStyle,
    required TextStyle messageStyle,
    required TextStyle readMoreStyle,
    required String message,
  }) {
    final textDirection = Directionality.of(context);

    bool fits(String candidate, {required bool showReadMore}) {
      final painter = TextPainter(
        text: _buildReplyTextSpan(
          sellerStyle: sellerStyle,
          messageStyle: messageStyle,
          readMoreStyle: readMoreStyle,
          message: candidate,
          showReadMore: showReadMore,
        ),
        maxLines: 2,
        textDirection: textDirection,
      )..layout(maxWidth: maxWidth);

      return !painter.didExceedMaxLines;
    }

    if (fits(message, showReadMore: false)) {
      return message;
    }

    var low = 0;
    var high = message.length;
    var best = '';
    while (low <= high) {
      final mid = (low + high) ~/ 2;
      final candidate = '${message.substring(0, mid).trimRight()}...';
      if (fits(candidate, showReadMore: true)) {
        best = candidate;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return best.isEmpty ? '...' : best;
  }

  @override
  Widget build(BuildContext context) {
    final message = _message;
    if (message.isEmpty) {
      return const SizedBox.shrink();
    }

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final replyBackgroundColor = isDark
        ? const Color(0xFF2A2A2A)
        : const Color(0xFFFAFAFA);
    final titleColor = theme.colorScheme.onSurface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);
    final sellerStyle =
        theme.textTheme.bodyMedium?.copyWith(
          color: titleColor,
          fontWeight: FontWeight.w800,
          height: 1.2,
        ) ??
        TextStyle(color: titleColor, fontWeight: FontWeight.w800, height: 1.2);
    final messageStyle =
        theme.textTheme.bodyMedium?.copyWith(
          color: secondaryColor,
          height: 1.2,
        ) ??
        TextStyle(color: secondaryColor, height: 1.2);
    final readMoreStyle =
        theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w800,
          height: 1.2,
        ) ??
        TextStyle(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w800,
          height: 1.2,
        );

    return LayoutBuilder(
      builder: (context, constraints) {
        const horizontalPadding = 24.0;
        final contentMaxWidth = constraints.maxWidth.isFinite
            ? (constraints.maxWidth - horizontalPadding)
                  .clamp(0.0, constraints.maxWidth)
                  .toDouble()
            : constraints.maxWidth;
        final previewMessage = _buildPreviewMessage(
          context: context,
          maxWidth: contentMaxWidth,
          sellerStyle: sellerStyle,
          messageStyle: messageStyle,
          readMoreStyle: readMoreStyle,
          message: message,
        );
        final isTruncated = previewMessage != message;

        return DecoratedBox(
          decoration: BoxDecoration(
            color: replyBackgroundColor,
            borderRadius: const BorderRadius.all(Radius.circular(8)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Text.rich(
              _buildReplyTextSpan(
                sellerStyle: sellerStyle,
                messageStyle: messageStyle,
                readMoreStyle: readMoreStyle,
                message: previewMessage,
                showReadMore: isTruncated,
              ),
              maxLines: 2,
              overflow: TextOverflow.clip,
            ),
          ),
        );
      },
    );
  }
}

class _CustomerReviewListCard extends StatelessWidget {
  const _CustomerReviewListCard({
    required this.review,
    required this.fallbackCompanyName,
  });

  final CustomerReviewItem review;
  final String fallbackCompanyName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final titleColor = theme.colorScheme.onSurface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.72) ??
        theme.colorScheme.onSurface.withOpacity(0.72);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: titleColor.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                review.reviewer.isEmpty ? '?' : review.reviewer[0],
                style: theme.textTheme.titleSmall?.copyWith(
                  color: titleColor,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    review.reviewer,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: titleColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: List.generate(
                      5,
                      (index) => const Padding(
                        padding: EdgeInsets.only(right: 2),
                        child: Icon(
                          Icons.star_rounded,
                          size: 14,
                          color: Color(0xFFF9A825),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        if (review.message.trim().isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(
            review.message,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: secondaryColor,
              height: 1.15,
            ),
          ),
        ],
        if (review.media.isNotEmpty) ...[
          const SizedBox(height: 10),
          CustomerReviewMediaStrip(media: review.media),
        ],
        if (review.sellerReply != null) ...[
          const SizedBox(height: 12),
          CustomerReviewSellerReplyBlock(
            reply: review.sellerReply!,
            fallbackCompanyName: fallbackCompanyName,
          ),
        ],
      ],
    );
  }
}
