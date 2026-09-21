import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:switch_app/widgets/skeleton_loading.dart';
import 'package:switch_app/login_redirect.dart';
import 'package:switch_app/services/platform_feedback_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:image_picker/image_picker.dart';

const int _maxFeedbackPhotos = 8;
const int _maxFeedbackVideos = 3;
const int _maxFeedbackVideoBytes = 50 * 1024 * 1024;

class FeedbackPage extends StatefulWidget {
  const FeedbackPage({
    super.key,
    this.themeModeNotifier,
    this.embedded = false,
  });

  final ValueNotifier<ThemeMode>? themeModeNotifier;

  /// When true, renders form content only (for the account right sidebar).
  final bool embedded;

  @override
  State<FeedbackPage> createState() => _FeedbackPageState();
}

class _FeedbackPageState extends State<FeedbackPage> {
  final TextEditingController _messageController = TextEditingController();
  final PlatformFeedbackService _service = createPlatformFeedbackService();
  final ImagePicker _imagePicker = ImagePicker();
  final List<_PendingFeedbackMedia> _photos = <_PendingFeedbackMedia>[];
  final List<_PendingFeedbackMedia> _videos = <_PendingFeedbackMedia>[];

  int _rating = 0;
  bool _submitting = false;
  bool _checkingAuth = true;
  bool _pickingMedia = false;

  @override
  void initState() {
    super.initState();
    _ensureAccount();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _ensureAccount() async {
    await AuthSession.ensureLoaded();
    if (!mounted) {
      return;
    }
    if (!AuthSession.isLoggedInSync) {
      await redirectGuestToLogin(
        context,
        themeModeNotifier: widget.themeModeNotifier,
      );
      return;
    }
    setState(() => _checkingAuth = false);
  }

  Future<void> _submit() async {
    if (_submitting) {
      return;
    }
    if (_rating < 1) {
      AppSnackBar.showError(context, message: 'Choose a rating from 1 to 5 stars.');
      return;
    }

    final message = _messageController.text.trim();
    if (message.isEmpty) {
      AppSnackBar.showError(context, message: 'Please describe your concern.');
      return;
    }

    final accountId = (await AuthSession.getAccountId())?.trim() ?? '';
    final email = (await AuthSession.getAccountEmail())?.trim() ?? '';
    if (accountId.isEmpty) {
      await redirectGuestToLogin(
        context,
        themeModeNotifier: widget.themeModeNotifier,
      );
      return;
    }

    setState(() => _submitting = true);
    final result = await _service.submitUserFeedback(
      accountId: accountId,
      email: email,
      rating: _rating,
      message: message,
      attachments: <PlatformFeedbackAttachmentUpload>[
        ..._photos.map((media) => media.toUpload()),
        ..._videos.map((media) => media.toUpload()),
      ],
    );

    if (!mounted) {
      return;
    }
    setState(() => _submitting = false);
    if (result.ok) {
      AppSnackBar.showSuccess(context, message: result.message);
      Navigator.of(context).maybePop();
      return;
    }
    AppSnackBar.showError(context, message: result.message);
  }

  Future<void> _pickPhotos() async {
    if (_submitting || _pickingMedia) {
      return;
    }
    final remaining = _maxFeedbackPhotos - _photos.length;
    if (remaining <= 0) {
      AppSnackBar.showError(context, message: 'You can attach up to 8 photos.');
      return;
    }

    setState(() => _pickingMedia = true);
    try {
      final picked = await _imagePicker.pickMultiImage(imageQuality: 88);
      if (!mounted || picked.isEmpty) {
        return;
      }
      final accepted = picked.take(remaining).toList();
      final media = <_PendingFeedbackMedia>[];
      for (final file in accepted) {
        media.add(
          _PendingFeedbackMedia(
            file: file,
            kind: 'image',
            contentType: _feedbackMediaContentType(file, 'image'),
            sizeBytes: await file.length(),
            previewBytes: await file.readAsBytes(),
          ),
        );
      }
      if (!mounted) {
        return;
      }
      setState(() => _photos.addAll(media));
      if (picked.length > remaining) {
        AppSnackBar.showError(
          context,
          message: 'Only the first $remaining photo${remaining == 1 ? '' : 's'} were added. Maximum is 8.',
        );
      }
    } catch (_) {
      if (mounted) {
        AppSnackBar.showError(context, message: 'Unable to select photos.');
      }
    } finally {
      if (mounted) {
        setState(() => _pickingMedia = false);
      }
    }
  }

  Future<void> _pickVideo() async {
    if (_submitting || _pickingMedia) {
      return;
    }
    if (_videos.length >= _maxFeedbackVideos) {
      AppSnackBar.showError(context, message: 'You can attach up to 3 videos.');
      return;
    }

    setState(() => _pickingMedia = true);
    try {
      final file = await _imagePicker.pickVideo(source: ImageSource.gallery);
      if (!mounted || file == null) {
        return;
      }
      final sizeBytes = await file.length();
      if (sizeBytes > _maxFeedbackVideoBytes) {
        if (mounted) {
          AppSnackBar.showError(
            context,
            message: 'Each video must be 50 MB or smaller.',
          );
        }
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _videos.add(
          _PendingFeedbackMedia(
            file: file,
            kind: 'video',
            contentType: _feedbackMediaContentType(file, 'video'),
            sizeBytes: sizeBytes,
            previewBytes: null,
          ),
        );
      });
    } catch (_) {
      if (mounted) {
        AppSnackBar.showError(context, message: 'Unable to select a video.');
      }
    } finally {
      if (mounted) {
        setState(() => _pickingMedia = false);
      }
    }
  }

  void _removeMedia(_PendingFeedbackMedia media) {
    if (_submitting) {
      return;
    }
    setState(() {
      _photos.remove(media);
      _videos.remove(media);
    });
  }

  Widget _buildForm(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;
    final compact = widget.embedded;

    return ListView(
      padding: EdgeInsets.fromLTRB(
        compact ? 18 : 16,
        compact ? 16 : 18,
        compact ? 18 : 16,
        24,
      ),
      children: [
        Text(
          'Tell us your concern',
          style: (compact
                  ? theme.textTheme.titleSmall
                  : theme.textTheme.titleMedium)
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Text(
          'Describe the full concern and attach supporting photos or videos. Everything is sent to Super Admin.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.textTheme.bodyMedium?.color?.withOpacity(0.72),
            height: 1.4,
            fontSize: compact ? 12 : null,
          ),
        ),
        SizedBox(height: compact ? 14 : 18),
        Row(
          children: List.generate(5, (index) {
            final value = index + 1;
            final isActive = value <= _rating;
            return IconButton(
              onPressed:
                  _submitting ? null : () => setState(() => _rating = value),
              padding: compact ? EdgeInsets.zero : null,
              constraints: compact
                  ? const BoxConstraints(minWidth: 40, minHeight: 40)
                  : null,
              icon: Icon(
                isActive ? Icons.star_rounded : Icons.star_border_rounded,
                color: isActive ? const Color(0xFFF59E0B) : primary,
                size: compact ? 28 : 34,
              ),
            );
          }),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _messageController,
          enabled: !_submitting,
          minLines: compact ? 4 : 5,
          maxLines: compact ? 7 : 9,
          maxLength: 1000,
          decoration: InputDecoration(
            labelText: 'Your concern',
            alignLabelWithHint: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(compact ? 12 : 10),
            ),
          ),
        ),
        const SizedBox(height: 16),
        _FeedbackAttachmentComposer(
          photos: _photos,
          videos: _videos,
          enabled: !_submitting && !_pickingMedia,
          picking: _pickingMedia,
          onAddPhotos: _pickPhotos,
          onAddVideo: _pickVideo,
          onRemove: _removeMedia,
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _submitting ? null : _submit,
          style: FilledButton.styleFrom(
            minimumSize: Size.fromHeight(compact ? 42 : 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(compact ? 12 : 10),
            ),
          ),
          child: Text(
            _submitting ? 'Uploading and sending…' : 'Send concern',
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_checkingAuth) {
      if (widget.embedded) {
        return const SkeletonFormPanel();
      }
      return Scaffold(
        appBar: AppBar(title: const Text('Feedback'), centerTitle: true),
        body: const SkeletonFormPanel(),
      );
    }

    final form = _buildForm(context);
    if (widget.embedded) {
      return form;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Feedback'), centerTitle: true),
      body: SafeArea(child: form),
    );
  }
}

class _FeedbackAttachmentComposer extends StatelessWidget {
  const _FeedbackAttachmentComposer({
    required this.photos,
    required this.videos,
    required this.enabled,
    required this.picking,
    required this.onAddPhotos,
    required this.onAddVideo,
    required this.onRemove,
  });

  final List<_PendingFeedbackMedia> photos;
  final List<_PendingFeedbackMedia> videos;
  final bool enabled;
  final bool picking;
  final VoidCallback onAddPhotos;
  final VoidCallback onAddVideo;
  final ValueChanged<_PendingFeedbackMedia> onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border.all(color: theme.dividerColor.withOpacity(0.7)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Photos and videos',
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                '${photos.length}/8 · ${videos.length}/3',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.62),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Add proof or context. Each video can be up to 50 MB.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withOpacity(0.64),
            ),
          ),
          if (photos.isNotEmpty || videos.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final media in [...photos, ...videos])
                  _FeedbackMediaTile(
                    key: ObjectKey(media),
                    media: media,
                    enabled: enabled,
                    onRemove: () => onRemove(media),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: enabled && photos.length < _maxFeedbackPhotos ? onAddPhotos : null,
                  icon: const Icon(Icons.add_photo_alternate_outlined),
                  label: const Text('Add photos'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: enabled && videos.length < _maxFeedbackVideos ? onAddVideo : null,
                  icon: const Icon(Icons.video_library_outlined),
                  label: const Text('Add video'),
                ),
              ),
            ],
          ),
          if (picking) ...[
            const SizedBox(height: 10),
            LinearProgressIndicator(
              minHeight: 3,
              color: primary,
              backgroundColor: primary.withOpacity(0.12),
            ),
          ],
        ],
      ),
    );
  }
}

class _FeedbackMediaTile extends StatelessWidget {
  const _FeedbackMediaTile({
    super.key,
    required this.media,
    required this.enabled,
    required this.onRemove,
  });

  final _PendingFeedbackMedia media;
  final bool enabled;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final isVideo = media.kind == 'video';
    return SizedBox(
      width: 92,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            height: 92,
            child: Stack(
              children: [
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: isVideo
                        ? ColoredBox(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            child: const Center(
                              child: Icon(Icons.play_circle_outline_rounded, size: 38),
                            ),
                          )
                        : Image.memory(
                            media.previewBytes ?? Uint8List(0),
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const Center(
                              child: Icon(Icons.broken_image_outlined),
                            ),
                          ),
                  ),
                ),
                Positioned(
                  right: 4,
                  top: 4,
                  child: Material(
                    color: Colors.black.withOpacity(0.66),
                    shape: const CircleBorder(),
                    child: InkWell(
                      onTap: enabled ? onRemove : null,
                      customBorder: const CircleBorder(),
                      child: const SizedBox(
                        width: 25,
                        height: 25,
                        child: Icon(Icons.close_rounded, size: 16, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            media.file.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}

class _PendingFeedbackMedia {
  const _PendingFeedbackMedia({
    required this.file,
    required this.kind,
    required this.contentType,
    required this.sizeBytes,
    required this.previewBytes,
  });

  final XFile file;
  final String kind;
  final String contentType;
  final int sizeBytes;
  final Uint8List? previewBytes;

  PlatformFeedbackAttachmentUpload toUpload() {
    return PlatformFeedbackAttachmentUpload(
      path: file.path,
      name: file.name.trim().isEmpty
          ? (kind == 'video' ? 'feedback-video.mp4' : 'feedback-photo.jpg')
          : file.name.trim(),
      contentType: contentType,
      kind: kind,
      sizeBytes: sizeBytes,
    );
  }
}

String _feedbackMediaContentType(XFile file, String kind) {
  final mimeType = file.mimeType?.trim() ?? '';
  if (mimeType.contains('/')) {
    return mimeType;
  }
  final extension = file.name.toLowerCase().split('.').last;
  const types = <String, String>{
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'mov': 'video/quicktime',
    'm4v': 'video/x-m4v',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    '3gp': 'video/3gpp',
    'mp4': 'video/mp4',
  };
  return types[extension] ?? (kind == 'video' ? 'video/mp4' : 'image/jpeg');
}
