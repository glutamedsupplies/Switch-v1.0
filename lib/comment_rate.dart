import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:switch_app/order_store.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/widgets/app_price_text.dart';
import 'package:image_picker/image_picker.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';

const int _maxReviewVideoBytes = 50 * 1024 * 1024;
const double _reviewMediaTileSize = 86;

class CommentRatePage extends StatefulWidget {
  const CommentRatePage({
    super.key,
    required this.entry,
  });

  final OrderEntryData entry;

  @override
  State<CommentRatePage> createState() => _CommentRatePageState();
}

class _CommentRatePageState extends State<CommentRatePage> {
  final ImagePicker _imagePicker = ImagePicker();
  late final TextEditingController _commentController;
  late List<OrderReviewMedia> _savedMedia;
  final List<_PendingReviewMedia> _pendingMedia = <_PendingReviewMedia>[];
  late int _selectedRating;
  bool _isSaving = false;
  bool _isPickingMedia = false;
  double? _serverProductRating;

  OrderEntryData get entry => widget.entry;

  bool get _isRatingLocked => entry.isHighRatingReviewLocked;

  bool get _canSave => !_isSaving && !_isRatingLocked && _selectedRating > 0;
  bool get _canEditMedia => !_isSaving && !_isRatingLocked && !_isPickingMedia;

  double get _displayProductRating => _serverProductRating ?? entry.productRating;

  @override
  void initState() {
    super.initState();
    _selectedRating = entry.hasProductReviewRating
        ? entry.productReviewRating.round()
        : 0;
    _commentController = TextEditingController(
      text: entry.productReviewComment,
    )..addListener(_handleCommentChanged);
    _savedMedia = List<OrderReviewMedia>.of(entry.productReviewMedia);
    _loadProductRatingFromServer();
  }

  @override
  void dispose() {
    _commentController
      ..removeListener(_handleCommentChanged)
      ..dispose();
    super.dispose();
  }

  void _handleCommentChanged() {
    setState(() {});
  }

  Future<void> _loadProductRatingFromServer() async {
    final normalizedProductId = entry.productId.trim();
    if (normalizedProductId.isEmpty) {
      return;
    }

    try {
      final products = await createProductRepository().fetchProducts();
      if (!mounted) {
        return;
      }

      for (final product in products) {
        if (product.id.trim() == normalizedProductId) {
          setState(() {
            _serverProductRating = product.rating;
          });
          return;
        }
      }
    } catch (_) {
      // Keep the local order copy as fallback when the product list
      // is temporarily unavailable.
    }
  }

  Future<void> _pickReviewPhotos() async {
    if (!_canEditMedia) {
      return;
    }

    setState(() {
      _isPickingMedia = true;
    });

    try {
      final pickedFiles = await _imagePicker.pickMultiImage(
        imageQuality: 88,
      );
      if (!mounted || pickedFiles.isEmpty) {
        return;
      }

      final nextMedia = <_PendingReviewMedia>[];
      for (final file in pickedFiles) {
        final sizeBytes = await file.length();
        nextMedia.add(
          _PendingReviewMedia(
            file: file,
            type: OrderReviewMediaType.image,
            fileName: _normalizePickedFileName(file.name, 'review-photo.jpg'),
            contentType: _resolvePickedMediaContentType(
              file,
              OrderReviewMediaType.image,
            ),
            sizeBytes: sizeBytes,
          ),
        );
      }

      if (!mounted || nextMedia.isEmpty) {
        return;
      }

      setState(() {
        _pendingMedia.addAll(nextMedia);
      });
    } catch (_) {
      if (mounted) {
        _showReviewMediaError('Unable to select review photos.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isPickingMedia = false;
        });
      }
    }
  }

  Future<void> _pickReviewVideo() async {
    if (!_canEditMedia) {
      return;
    }

    setState(() {
      _isPickingMedia = true;
    });

    try {
      final pickedFile = await _imagePicker.pickVideo(
        source: ImageSource.gallery,
      );
      if (!mounted || pickedFile == null) {
        return;
      }

      final sizeBytes = await pickedFile.length();
      if (sizeBytes > _maxReviewVideoBytes) {
        if (mounted) {
          _showReviewMediaError('Videos must be 50MB or smaller.');
        }
        return;
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _pendingMedia.add(
          _PendingReviewMedia(
            file: pickedFile,
            type: OrderReviewMediaType.video,
            fileName: _normalizePickedFileName(pickedFile.name, 'review-video.mp4'),
            contentType: _resolvePickedMediaContentType(
              pickedFile,
              OrderReviewMediaType.video,
            ),
            sizeBytes: sizeBytes,
          ),
        );
      });
    } catch (_) {
      if (mounted) {
        _showReviewMediaError('Unable to select a review video.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isPickingMedia = false;
        });
      }
    }
  }

  void _removeSavedMedia(OrderReviewMedia media) {
    if (!_canEditMedia) {
      return;
    }

    setState(() {
      _savedMedia = _savedMedia.where((item) => item.url != media.url).toList();
    });
  }

  void _removePendingMedia(_PendingReviewMedia media) {
    if (!_canEditMedia) {
      return;
    }

    setState(() {
      _pendingMedia.remove(media);
    });
  }

  void _showReviewMediaError(String message) {
    AppSnackBar.showError(context, message: message);
  }

  Future<void> _openReviewMediaUploadModal() async {
    if (!_canEditMedia) {
      return;
    }

    final selectedType = await showModalBottomSheet<OrderReviewMediaType>(
      context: context,
      useSafeArea: true,
      showDragHandle: false,
      backgroundColor:
          Theme.of(context).inputDecorationTheme.fillColor ??
          Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
      ),
      builder: (context) {
        return _ReviewMediaUploadModal(
          onPickPhotos: () =>
              Navigator.of(context).pop(OrderReviewMediaType.image),
          onPickVideo: () =>
              Navigator.of(context).pop(OrderReviewMediaType.video),
        );
      },
    );

    if (!mounted || selectedType == null) {
      return;
    }

    if (selectedType == OrderReviewMediaType.video) {
      await _pickReviewVideo();
      return;
    }

    await _pickReviewPhotos();
  }

  Future<void> _handleSave() async {
    if (!_canSave) {
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final uploadedMedia = <OrderReviewMedia>[
        ..._savedMedia,
      ];
      for (final media in _pendingMedia) {
        final bytes = await media.file.readAsBytes();
        final mediaUrl = await OrderStore.instance.uploadReviewMedia(
          bytes: bytes,
          fileName: media.fileName,
          contentType: media.contentType,
        );
        uploadedMedia.add(
          OrderReviewMedia(
            type: media.type,
            url: mediaUrl,
            fileName: media.fileName,
            contentType: media.contentType,
            sizeBytes: media.sizeBytes,
            uploadedAtEpochMs: DateTime.now().millisecondsSinceEpoch,
          ),
        );
      }

      await OrderStore.instance.saveProductReview(
        entryId: entry.id,
        rating: _selectedRating,
        comment: _commentController.text,
        media: uploadedMedia,
        syncImmediately: true,
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isSaving = false;
      });
      _showReviewMediaError('Unable to save product review.');
      return;
    }

    if (!mounted) {
      return;
    }

    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final titleColor = theme.colorScheme.onSurface;
    final shellColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;
    final secondaryColor =
        theme.textTheme.bodyMedium?.color?.withOpacity(0.68) ??
        theme.colorScheme.onSurface.withOpacity(0.68);

    return Scaffold(
      backgroundColor: theme.cardColor,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: shellColor,
        title: Text(
          'Rate Product',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          decoration: BoxDecoration(
            color: shellColor,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                offset: const Offset(0, -4),
                blurRadius: 12,
              ),
            ],
          ),
          child: SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: _canSave ? _handleSave : null,
              style: FilledButton.styleFrom(
                backgroundColor: primaryColor,
                foregroundColor:
                    theme.brightness == Brightness.dark
                    ? Colors.black
                    : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: _isSaving
                  ? const SkeletonCircle(size: 18)
                  : Text(
                      entry.hasProductReviewRating
                          ? 'Update Review'
                          : 'Submit Review',
                    ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(0, 16, 0, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CommentRateProductCard(
                entry: entry,
                displayRating: _displayProductRating,
                primaryColor: primaryColor,
                titleColor: titleColor,
                secondaryColor: secondaryColor,
                shellColor: shellColor,
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 18),
                    Text(
                      'Your rating',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: List<Widget>.generate(5, (index) {
                        final starValue = index + 1;
                        final isSelected = _selectedRating >= starValue;

                        return Expanded(
                          child: Center(
                            child: InkWell(
                              onTap: _isSaving
                                  || _isRatingLocked
                                  ? null
                                  : () {
                                      setState(() {
                                        _selectedRating = starValue;
                                      });
                                    },
                              splashFactory: NoSplash.splashFactory,
                              splashColor: Colors.transparent,
                              highlightColor: Colors.transparent,
                              hoverColor: Colors.transparent,
                              focusColor: Colors.transparent,
                              borderRadius: BorderRadius.circular(999),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Icon(
                                  isSelected
                                      ? Icons.star_rounded
                                      : Icons.star_outline_rounded,
                                  color: isSelected
                                      ? const Color(0xFFF9A825)
                                      : secondaryColor.withOpacity(0.55),
                                  size: 34,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _ratingIndicatorLabel(_selectedRating),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: _selectedRating > 0
                            ? primaryColor
                            : secondaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (_isRatingLocked) ...[
                      const SizedBox(height: 6),
                      Text(
                        'This 4 or 5-star rating is locked for 1 month.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: secondaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    Text(
                      'Comment (Optional)',
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: titleColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _ReviewCommentInputPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _commentController,
                            enabled: !_isSaving && !_isRatingLocked,
                            minLines: 1,
                            maxLines: 4,
                            maxLength: 300,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              height: 1.4,
                            ),
                            decoration: const InputDecoration(
                              counterText: '',
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              disabledBorder: InputBorder.none,
                              errorBorder: InputBorder.none,
                              focusedErrorBorder: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _ReviewMediaPicker(
                            savedMedia: _savedMedia,
                            pendingMedia: _pendingMedia,
                            enabled: _canEditMedia,
                            isPicking: _isPickingMedia,
                            onOpenUploadModal: _openReviewMediaUploadModal,
                            onRemoveSaved: _removeSavedMedia,
                            onRemovePending: _removePendingMedia,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _ratingIndicatorLabel(int rating) {
  switch (rating) {
    case 5:
      return 'Excellent';
    case 4:
      return 'Very Good';
    case 3:
      return 'Good';
    case 2:
      return 'Bad';
    case 1:
      return 'Very Bad';
    default:
      return 'Select your rating first.';
  }
}

class _CommentRateProductCard extends StatelessWidget {
  const _CommentRateProductCard({
    required this.entry,
    required this.displayRating,
    required this.primaryColor,
    required this.titleColor,
    required this.secondaryColor,
    required this.shellColor,
  });

  final OrderEntryData entry;
  final double displayRating;
  final Color primaryColor;
  final Color titleColor;
  final Color secondaryColor;
  final Color shellColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final itemContainerColor = theme.brightness == Brightness.dark
        ? shellColor
        : Colors.white;
    final imageUrl = entry.productImageUrl.trim();
    final variantName = entry.variantName.trim();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: itemContainerColor,
        borderRadius: BorderRadius.zero,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              width: 112,
              height: 112,
              child: imageUrl.isEmpty
                  ? _CommentRateImageFallback(
                      primaryColor: primaryColor,
                      initial: entry.productName.isEmpty
                          ? '?'
                          : entry.productName[0].toUpperCase(),
                    )
                  : Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _CommentRateImageFallback(
                          primaryColor: primaryColor,
                          initial: entry.productName.isEmpty
                              ? '?'
                              : entry.productName[0].toUpperCase(),
                        );
                      },
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.productName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: titleColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (variantName.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    variantName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: secondaryColor,
                      fontWeight: FontWeight.w500,
                      height: 1.2,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                _CommentRatePriceText(
                  amount: entry.totalPrice,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: primaryColor,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.star_rounded,
                      size: 16,
                      color: Color(0xFFF9A825),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      displayRating > 0
                          ? displayRating.toStringAsFixed(1)
                          : 'No rating yet',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: displayRating > 0 ? titleColor : secondaryColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentRateImageFallback extends StatelessWidget {
  const _CommentRateImageFallback({
    required this.primaryColor,
    required this.initial,
  });

  final Color primaryColor;
  final String initial;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: primaryColor.withOpacity(0.14),
      ),
      child: Center(
        child: Text(
          initial,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: primaryColor,
                fontWeight: FontWeight.w800,
              ),
        ),
      ),
    );
  }
}

class _CommentRatePriceText extends StatelessWidget {
  const _CommentRatePriceText({
    required this.amount,
    this.style,
  });

  final double amount;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return AppPriceText(amount: amount, style: style);
  }
}

class _ReviewCommentInputPanel extends StatelessWidget {
  const _ReviewCommentInputPanel({
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fillColor =
        theme.inputDecorationTheme.fillColor ?? theme.colorScheme.surface;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: fillColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: child,
    );
  }
}

class _ReviewMediaPicker extends StatelessWidget {
  const _ReviewMediaPicker({
    required this.savedMedia,
    required this.pendingMedia,
    required this.enabled,
    required this.isPicking,
    required this.onOpenUploadModal,
    required this.onRemoveSaved,
    required this.onRemovePending,
  });

  final List<OrderReviewMedia> savedMedia;
  final List<_PendingReviewMedia> pendingMedia;
  final bool enabled;
  final bool isPicking;
  final VoidCallback onOpenUploadModal;
  final ValueChanged<OrderReviewMedia> onRemoveSaved;
  final ValueChanged<_PendingReviewMedia> onRemovePending;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mediaTiles = <Widget>[
      for (final media in savedMedia)
        _ReviewMediaTile(
          key: ValueKey('saved-${media.url}'),
          media: media,
          enabled: enabled,
          onRemove: () => onRemoveSaved(media),
        ),
      for (final media in pendingMedia)
        _PendingReviewMediaTile(
          key: ObjectKey(media),
          media: media,
          enabled: enabled,
          onRemove: () => onRemovePending(media),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            ...mediaTiles,
            _ReviewUploadIconTile(
              enabled: enabled,
              onTap: onOpenUploadModal,
            ),
          ],
        ),
        if (isPicking) ...[
          const SizedBox(height: 12),
          LinearProgressIndicator(
            minHeight: 3,
            color: theme.colorScheme.primary,
            backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
          ),
        ],
      ],
    );
  }
}

class _ReviewUploadIconTile extends StatelessWidget {
  const _ReviewUploadIconTile({
    required this.enabled,
    required this.onTap,
  });

  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final disabledColor = theme.colorScheme.onSurface.withOpacity(0.34);
    final foregroundColor = enabled ? primaryColor : disabledColor;
    final backgroundColor = enabled
        ? primaryColor.withOpacity(0.045)
        : theme.colorScheme.onSurface.withOpacity(0.035);

    return Semantics(
      button: true,
      label: 'Upload review media',
      child: CustomPaint(
        painter: _DashedOutlinePainter(
          color: foregroundColor.withOpacity(enabled ? 0.72 : 0.38),
          radius: 8,
        ),
        child: SizedBox(
          width: _reviewMediaTileSize,
          height: _reviewMediaTileSize,
          child: Material(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(8),
            child: InkWell(
              onTap: enabled ? onTap : null,
              borderRadius: BorderRadius.circular(8),
              child: Center(
                child: Icon(
                  Icons.upload_file_outlined,
                  color: foregroundColor,
                  size: 30,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ReviewMediaUploadModal extends StatelessWidget {
  const _ReviewMediaUploadModal({
    required this.onPickPhotos,
    required this.onPickVideo,
  });

  final VoidCallback onPickPhotos;
  final VoidCallback onPickVideo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomPadding = MediaQuery.viewPaddingOf(context).bottom + 4;

    return SafeArea(
      top: false,
      child: ListView(
        shrinkWrap: true,
        padding: EdgeInsets.fromLTRB(0, 10, 0, bottomPadding),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 4, 18, 6),
            child: Text(
              'Add Media',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          ListTile(
            dense: true,
            title: Text(
              'Add Photo',
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            onTap: onPickPhotos,
          ),
          ListTile(
            dense: true,
            title: Text(
              'Upload Video',
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            onTap: onPickVideo,
          ),
        ],
      ),
    );
  }
}

class _DashedOutlinePainter extends CustomPainter {
  const _DashedOutlinePainter({
    required this.color,
    required this.radius,
  });

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          rect.deflate(1),
          Radius.circular(radius),
        ),
      );
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;

    const dashWidth = 8.0;
    const dashGap = 6.0;
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final nextDistance = math.min(distance + dashWidth, metric.length);
        canvas.drawPath(metric.extractPath(distance, nextDistance), paint);
        distance += dashWidth + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedOutlinePainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.radius != radius;
  }
}

class _ReviewMediaTile extends StatelessWidget {
  const _ReviewMediaTile({
    super.key,
    required this.media,
    required this.enabled,
    required this.onRemove,
  });

  final OrderReviewMedia media;
  final bool enabled;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return _ReviewMediaTileShell(
      enabled: enabled,
      onRemove: onRemove,
      child: media.isVideo
          ? const _ReviewVideoPlaceholder()
          : Image.network(
              media.url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const _ReviewImagePlaceholder(),
            ),
    );
  }
}

class _PendingReviewMediaTile extends StatelessWidget {
  const _PendingReviewMediaTile({
    super.key,
    required this.media,
    required this.enabled,
    required this.onRemove,
  });

  final _PendingReviewMedia media;
  final bool enabled;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return _ReviewMediaTileShell(
      enabled: enabled,
      onRemove: onRemove,
      child: media.type == OrderReviewMediaType.video
          ? const _ReviewVideoPlaceholder()
          : FutureBuilder<Uint8List>(
              future: media.file.readAsBytes(),
              builder: (context, snapshot) {
                final bytes = snapshot.data;
                if (bytes == null || bytes.isEmpty) {
                  return const _ReviewImagePlaceholder();
                }
                return Image.memory(
                  bytes,
                  fit: BoxFit.cover,
                  gaplessPlayback: true,
                );
              },
            ),
    );
  }
}

class _ReviewMediaTileShell extends StatelessWidget {
  const _ReviewMediaTileShell({
    required this.child,
    required this.enabled,
    required this.onRemove,
  });

  final Widget child;
  final bool enabled;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: _reviewMediaTileSize,
      height: _reviewMediaTileSize,
      child: Stack(
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                ),
                child: child,
              ),
            ),
          ),
          Positioned(
            right: 4,
            top: 4,
            child: Material(
              color: Colors.black.withOpacity(0.62),
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: enabled ? onRemove : null,
                child: const SizedBox(
                  width: 26,
                  height: 26,
                  child: Icon(
                    Icons.close_rounded,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewImagePlaceholder extends StatelessWidget {
  const _ReviewImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Icon(
      Icons.image_outlined,
      color: Theme.of(context).colorScheme.onSurface.withOpacity(0.45),
      size: 28,
    );
  }
}

class _ReviewVideoPlaceholder extends StatelessWidget {
  const _ReviewVideoPlaceholder();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.onSurface.withOpacity(0.08),
      ),
      child: Center(
        child: Icon(
          Icons.play_circle_outline_rounded,
          color: theme.colorScheme.onSurface.withOpacity(0.58),
          size: 34,
        ),
      ),
    );
  }
}

class _PendingReviewMedia {
  const _PendingReviewMedia({
    required this.file,
    required this.type,
    required this.fileName,
    required this.contentType,
    required this.sizeBytes,
  });

  final XFile file;
  final OrderReviewMediaType type;
  final String fileName;
  final String contentType;
  final int sizeBytes;
}

String _normalizePickedFileName(String value, String fallback) {
  final normalized = value.trim();
  return normalized.isEmpty ? fallback : normalized;
}

String _resolvePickedMediaContentType(
  XFile file,
  OrderReviewMediaType mediaType,
) {
  final mimeType = file.mimeType?.trim() ?? '';
  if (mimeType.contains('/')) {
    return mimeType;
  }

  final fileName = file.name.trim().toLowerCase();
  final fileNameParts = fileName.split('.');
  final extension = fileNameParts.length > 1 ? fileNameParts.last : '';
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    case 'webm':
      return 'video/webm';
    case 'avi':
      return 'video/x-msvideo';
    case 'mkv':
      return 'video/x-matroska';
    case '3gp':
      return 'video/3gpp';
    case 'mp4':
      return 'video/mp4';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return mediaType == OrderReviewMediaType.video
          ? 'video/mp4'
          : 'image/jpeg';
  }
}
