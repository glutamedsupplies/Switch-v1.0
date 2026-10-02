import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:switch_app/services/switch_rider_service.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:switch_app/widgets/switch_rider_live_map.dart';
import 'package:url_launcher/url_launcher.dart';

class SwitchRiderTrackingPage extends StatefulWidget {
  const SwitchRiderTrackingPage({
    super.key,
    required this.orderReference,
    this.orderLabel = '',
    this.destinationAddress = '',
  });

  /// Order group id or the order's createdAtEpochMs.
  final String orderReference;
  final String orderLabel;
  final String destinationAddress;

  @override
  State<SwitchRiderTrackingPage> createState() =>
      _SwitchRiderTrackingPageState();
}

class _SwitchRiderTrackingPageState extends State<SwitchRiderTrackingPage>
    with WidgetsBindingObserver {
  final SwitchRiderService _service = createSwitchRiderService();
  final TextEditingController _commentController = TextEditingController();
  SwitchRiderTracking? _tracking;
  bool _loading = true;
  bool _notFound = false;
  String _error = '';
  Timer? _pollTimer;
  bool _isForeground = true;
  int _selectedStars = 0;
  bool _submittingRating = false;
  String _photoPath = '';
  Uint8List? _photoBytes;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_refresh());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pollTimer?.cancel();
    _commentController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _isForeground = state == AppLifecycleState.resumed;
    if (_isForeground) {
      unawaited(_refresh());
    } else {
      _pollTimer?.cancel();
    }
  }

  Future<void> _refresh() async {
    _pollTimer?.cancel();
    try {
      final tracking = await _service.fetchTracking(widget.orderReference);
      if (!mounted) return;
      setState(() {
        _tracking = tracking;
        _notFound = tracking == null;
        _error = '';
        _loading = false;
      });
      if (tracking != null) unawaited(_loadRiderPhoto(tracking));
    } on SwitchRiderApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
    _schedulePoll();
  }

  void _schedulePoll() {
    final tracking = _tracking;
    if (!mounted || !_isForeground) return;
    if (tracking != null && tracking.isFinished && !tracking.canRate) return;
    final interval = tracking?.pollInterval ?? const Duration(seconds: 30);
    _pollTimer = Timer(interval, () => unawaited(_refresh()));
  }

  Future<void> _loadRiderPhoto(SwitchRiderTracking tracking) async {
    final path = tracking.rider?.photoUrl ?? '';
    if (path == _photoPath) return;
    _photoPath = path;
    final bytes = path.isEmpty ? null : await _service.fetchRiderPhoto(path);
    if (!mounted || _photoPath != path) return;
    setState(() => _photoBytes = bytes);
  }

  Future<void> _callRider(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    final launched = await launchUrl(uri);
    if (!launched && mounted) {
      AppSnackBar.showError(context, message: 'Unable to start a call.');
    }
  }

  Future<void> _openRiderLocation(SwitchRiderTracking tracking) async {
    final uri = Uri.https('www.google.com', '/maps/search/', <String, String>{
      'api': '1',
      'query': '${tracking.riderLatitude},${tracking.riderLongitude}',
    });
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      AppSnackBar.showError(context, message: 'Unable to open maps.');
    }
  }

  Future<void> _submitRating() async {
    if (_selectedStars < 1 || _submittingRating) return;
    setState(() => _submittingRating = true);
    try {
      await _service.rateRider(
        widget.orderReference,
        stars: _selectedStars,
        comment: _commentController.text,
      );
      if (!mounted) return;
      AppSnackBar.showSuccess(context, message: 'Thanks for rating your rider.');
      _commentController.clear();
      await _refresh();
    } on SwitchRiderApiException catch (error) {
      if (mounted) AppSnackBar.showError(context, message: error.message);
    } finally {
      if (mounted) setState(() => _submittingRating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Track delivery'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : () => unawaited(_refresh()),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: _buildContent(theme),
        ),
      ),
    );
  }

  List<Widget> _buildContent(ThemeData theme) {
    final tracking = _tracking;
    if (_loading && tracking == null) {
      return const [
        SizedBox(height: 160),
        Center(child: CircularProgressIndicator()),
      ];
    }
    if (tracking == null) {
      return [
        const SizedBox(height: 100),
        Icon(
          _notFound ? Icons.local_shipping_outlined : Icons.cloud_off_rounded,
          size: 48,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 12),
        Text(
          _notFound
              ? 'Switch Rider tracking is not available for this order yet.'
              : _error,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        Center(
          child: OutlinedButton(
            onPressed: () {
              setState(() => _loading = true);
              unawaited(_refresh());
            },
            child: const Text('Try again'),
          ),
        ),
      ];
    }

    return [
      if (_error.isNotEmpty)
        _Banner(
          icon: Icons.cloud_off_rounded,
          color: theme.colorScheme.error,
          message: 'Showing the last update. $_error',
        ),
      if (!tracking.isFinished &&
          !tracking.exception &&
          (tracking.route != null || tracking.hasLiveLocation))
        SwitchRiderLiveMap(tracking: tracking),
      _StatusCard(
        tracking: tracking,
        orderLabel: widget.orderLabel,
        destinationAddress: widget.destinationAddress,
      ),
      if (tracking.exception && tracking.exceptionMessage.isNotEmpty)
        _Banner(
          icon: Icons.error_outline_rounded,
          color: theme.colorScheme.error,
          message: tracking.exceptionMessage,
        ),
      if (tracking.deliveryPin.isNotEmpty) _PinCard(pin: tracking.deliveryPin),
      if (tracking.codAmount > 0 && !tracking.isFinished)
        _Banner(
          icon: Icons.payments_outlined,
          color: theme.colorScheme.primary,
          message:
              'Cash on delivery: prepare ${formatPesoCurrency(tracking.codAmount)} for your rider.',
        ),
      if (tracking.rider != null)
        _RiderCard(
          rider: tracking.rider!,
          photoBytes: _photoBytes,
          phone: tracking.riderPhone,
          locationUpdatedAt: tracking.hasLiveLocation
              ? tracking.locationUpdatedAt
              : null,
          onCall: tracking.riderPhone.isEmpty
              ? null
              : () => unawaited(_callRider(tracking.riderPhone)),
          onOpenLocation: tracking.hasLiveLocation
              ? () => unawaited(_openRiderLocation(tracking))
              : null,
        ),
      _TimelineCard(steps: tracking.timeline),
      if (tracking.canRate) _buildRatingCard(theme),
      if (tracking.rating != null)
        _Banner(
          icon: Icons.star_rounded,
          color: const Color(0xFFF9A825),
          message:
              'You rated this delivery ${tracking.rating!.stars} star${tracking.rating!.stars == 1 ? '' : 's'}.'
              '${tracking.rating!.comment.isEmpty ? '' : ' "${tracking.rating!.comment}"'}',
        ),
    ];
  }

  Widget _buildRatingCard(ThemeData theme) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Rate your rider',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var star = 1; star <= 5; star++)
                IconButton(
                  tooltip: '$star star${star == 1 ? '' : 's'}',
                  onPressed: _submittingRating
                      ? null
                      : () => setState(() => _selectedStars = star),
                  icon: Icon(
                    star <= _selectedStars
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    color: const Color(0xFFF9A825),
                    size: 30,
                  ),
                ),
            ],
          ),
          TextField(
            controller: _commentController,
            maxLength: 500,
            maxLines: 3,
            minLines: 1,
            enabled: !_submittingRating,
            decoration: const InputDecoration(
              hintText: 'Add a comment (optional)',
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _selectedStars < 1 || _submittingRating
                  ? null
                  : () => unawaited(_submitRating()),
              child: Text(_submittingRating ? 'Submitting...' : 'Submit rating'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.4)),
      ),
      child: child,
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.icon,
    required this.color,
    required this.message,
  });

  final IconData icon;
  final Color color;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.tracking,
    required this.orderLabel,
    required this.destinationAddress,
  });

  final SwitchRiderTracking tracking;
  final String orderLabel;
  final String destinationAddress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondary = theme.textTheme.bodySmall?.color?.withValues(alpha: 0.7);
    final liveEtaMinutes = (tracking.route?.etaSeconds ?? 0) > 0
        ? (tracking.route!.etaSeconds / 60).ceil()
        : 0;
    final showEstimate = liveEtaMinutes <= 0 &&
        tracking.estimatedMinutes > 0 &&
        !tracking.isFinished &&
        !tracking.exception;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.two_wheeler_rounded,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 8),
              Text(
                'Switch Rider',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              Text(
                tracking.deliveryCode,
                style: theme.textTheme.labelMedium?.copyWith(color: secondary),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            tracking.statusLabel,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          if (orderLabel.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              orderLabel.trim(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium?.copyWith(color: secondary),
            ),
          ],
          if (destinationAddress.trim().isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'To: ${destinationAddress.trim()}',
              style: theme.textTheme.bodySmall?.copyWith(color: secondary),
            ),
          ],
          if (liveEtaMinutes > 0 && !tracking.isFinished && !tracking.exception) ...[
            const SizedBox(height: 8),
            Text(
              'Arriving in about $liveEtaMinutes min. ${tracking.estimateNote}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          if (showEstimate) ...[
            const SizedBox(height: 8),
            Text(
              'About ${tracking.estimatedMinutes}–${tracking.estimatedMinutes + 20} min after pickup. ${tracking.estimateNote}',
              style: theme.textTheme.bodySmall?.copyWith(color: secondary),
            ),
          ],
        ],
      ),
    );
  }
}

class _PinCard extends StatelessWidget {
  const _PinCard({required this.pin});

  final String pin;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Delivery PIN',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            pin,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              letterSpacing: 8,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Give this PIN to your rider only after you have the parcel in hand. Switch staff will never ask for it.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _RiderCard extends StatelessWidget {
  const _RiderCard({
    required this.rider,
    required this.photoBytes,
    required this.phone,
    required this.locationUpdatedAt,
    required this.onCall,
    required this.onOpenLocation,
  });

  final SwitchRiderPublicRider rider;
  final Uint8List? photoBytes;
  final String phone;
  final DateTime? locationUpdatedAt;
  final VoidCallback? onCall;
  final VoidCallback? onOpenLocation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final secondary = theme.textTheme.bodySmall?.color?.withValues(alpha: 0.7);
    final bytes = photoBytes;
    final updatedAt = locationUpdatedAt;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: theme.colorScheme.primary.withValues(
                  alpha: 0.12,
                ),
                backgroundImage: bytes == null ? null : MemoryImage(bytes),
                child: bytes == null
                    ? Icon(
                        Icons.person_rounded,
                        color: theme.colorScheme.primary,
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rider.firstName.isEmpty ? 'Your rider' : rider.firstName,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        rider.vehicleLabel,
                        rider.plateNumber,
                      ].where((part) => part.isNotEmpty).join(' · '),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: secondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          Icons.star_rounded,
                          size: 15,
                          color: Color(0xFFF9A825),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          rider.ratingCount == 0
                              ? 'New rider'
                              : '${rider.ratingAverage.toStringAsFixed(1)} (${rider.ratingCount})',
                          style: theme.textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (onCall != null)
                IconButton.filledTonal(
                  tooltip: 'Call rider',
                  onPressed: onCall,
                  icon: const Icon(Icons.call_rounded),
                ),
            ],
          ),
          if (onOpenLocation != null) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: onOpenLocation,
              icon: const Icon(Icons.map_outlined),
              label: Text(
                updatedAt == null
                    ? 'Open in Google Maps'
                    : 'Open in Google Maps · updated ${_relativeTime(updatedAt)}',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.steps});

  final List<SwitchRiderTimelineStep> steps;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;
    final muted = theme.disabledColor;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Delivery progress',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          for (final step in steps)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  Icon(
                    step.done
                        ? Icons.check_circle_rounded
                        : step.active
                        ? Icons.radio_button_checked_rounded
                        : Icons.radio_button_unchecked_rounded,
                    size: 20,
                    color: step.done || step.active ? primary : muted,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      step.label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: step.active
                            ? FontWeight.w800
                            : FontWeight.w500,
                        color: step.done || step.active ? null : muted,
                      ),
                    ),
                  ),
                  if (step.at != null)
                    Text(
                      _clockTime(step.at!),
                      style: theme.textTheme.labelSmall?.copyWith(color: muted),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

String _clockTime(DateTime value) {
  final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
  final minute = value.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${value.hour >= 12 ? 'PM' : 'AM'}';
}

String _relativeTime(DateTime value) {
  final elapsed = DateTime.now().difference(value);
  if (elapsed.inSeconds < 60) return 'just now';
  if (elapsed.inMinutes < 60) return '${elapsed.inMinutes} min ago';
  return _clockTime(value);
}
