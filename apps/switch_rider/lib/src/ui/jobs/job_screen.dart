import 'dart:async';

import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../../photo_picker.dart';
import '../account/support_screen.dart';
import '../common.dart';
import '../maps/rider_route_screen.dart';
import 'job_sheets.dart';

const _progressSteps = <(String, String)>[
  ('RIDER_ASSIGNED', 'Accepted'),
  ('RIDER_TO_PICKUP', 'Heading to pickup'),
  ('ARRIVED_AT_PICKUP', 'At pickup'),
  ('PICKED_UP', 'Picked up'),
  ('IN_TRANSIT', 'On the way'),
  ('ARRIVED_AT_DROPOFF', 'At drop-off'),
  ('DELIVERED', 'Delivered'),
];

class JobScreen extends StatefulWidget {
  const JobScreen({super.key, required this.jobId});

  final String jobId;

  @override
  State<JobScreen> createState() => _JobScreenState();
}

class _JobScreenState extends State<JobScreen> {
  RiderJob? _job;
  Object? _loadError;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final job = await context.api.job(widget.jobId);
      if (!mounted) return;
      setState(() {
        _job = job;
        _loadError = null;
      });
    } catch (error) {
      if (!mounted) return;
      if (!silent || _job == null) setState(() => _loadError = error);
    }
  }

  /// Runs a workflow step and refreshes; errors are shown, never swallowed.
  Future<bool> _step(
    String step, [
    Map<String, dynamic>? payload,
    String? success,
  ]) async {
    try {
      final job = await context.api.jobStep(widget.jobId, step, payload);
      if (!mounted) return true;
      if (job != null) setState(() => _job = job);
      if (success != null) context.showMessage(success);
      context.runtime.refresh();
      return true;
    } catch (error) {
      if (!mounted) return false;
      context.showMessage(errorText(error), error: true);
      await _load(silent: true);
      return false;
    }
  }

  Future<void> _confirmWithPin({
    required String step,
    required String title,
    required String helper,
    required int attemptsLeft,
  }) async {
    final pin = await showPinDialog(
      context,
      title: title,
      helper: helper,
      attemptsLeft: attemptsLeft,
    );
    if (pin == null || !mounted) return;
    await _step(step, {'pin': pin}, 'PIN verified.');
  }

  Future<void> _collectCod(RiderJob job) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm cash collected'),
        content: Text(
          'Collect exactly ${formatPeso(job.codAmount)} from the customer.\n\n'
          'The amount is set by Switch and cannot be changed. If the customer cannot pay this amount, '
          'report a failed delivery instead.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Not yet'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('I received ${formatPeso(job.codAmount)}'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await _step('collect-cod', {
      'amount': job.codAmount,
    }, 'Cash collection recorded.');
  }

  Future<void> _completeWithPhoto(RiderJob job) async {
    var leftAtDoor = false;
    final proceed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Photo proof of delivery'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Take a clear photo showing the parcel at the delivery location.',
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: leftAtDoor,
                onChanged: job.isCod
                    ? null
                    : (value) =>
                          setDialogState(() => leftAtDoor = value ?? false),
                title: const Text('Left at the door (customer not present)'),
                subtitle: job.isCod
                    ? const Text('COD parcels must be handed to the customer.')
                    : null,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton.icon(
              onPressed: () => Navigator.pop(context, true),
              icon: const Icon(Icons.photo_camera),
              label: const Text('Take photo'),
            ),
          ],
        ),
      ),
    );
    if (proceed != true || !mounted) return;
    final photo = await pickPhoto(context, cameraOnly: true);
    if (photo == null || !mounted) return;
    try {
      final proofId = await context.api.uploadProof(
        job.id,
        'DELIVERY',
        photo.bytes,
        photo.contentType,
      );
      if (!mounted) return;
      await _step('complete', {
        'method': 'PHOTO',
        'proofId': proofId,
        'leftAtDoor': leftAtDoor,
      }, 'Delivery completed.');
    } catch (error) {
      if (mounted) context.showMessage(errorText(error), error: true);
    }
  }

  Future<void> _reportFailed(RiderJob job) async {
    final reasons =
        context.session.meta?.failureReasons ?? const <LabeledCode>[];
    final result = await showFailDeliverySheet(context, reasons: reasons);
    if (result == null || !mounted) return;
    String proofId = '';
    if (result.evidenceRequired) {
      final photo = await pickPhoto(context, cameraOnly: true);
      if (photo == null || !mounted) return;
      try {
        proofId = await context.api.uploadProof(
          job.id,
          'FAILED_ATTEMPT',
          photo.bytes,
          photo.contentType,
        );
      } catch (error) {
        if (mounted) context.showMessage(errorText(error), error: true);
        return;
      }
      if (!mounted) return;
    }
    await _step('fail', {
      'reason': result.reason,
      'note': result.note,
      'proofId': proofId,
    }, 'Failed delivery reported. Return the parcel to the seller.');
  }

  Future<void> _release() async {
    final reasons =
        context.session.meta?.releaseReasons ?? const <LabeledCode>[];
    final result = await showReleaseSheet(context, reasons: reasons);
    if (result == null || !mounted) return;
    try {
      await context.api.jobStep(widget.jobId, 'release', {
        'reason': result.reason,
        'note': result.note,
      });
      if (!mounted) return;
      context.runtime.refresh();
      context.showMessage('Job handed back. Switch will find another rider.');
      Navigator.of(context).pop();
    } catch (error) {
      if (mounted) context.showMessage(errorText(error), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = _job;
    return Scaffold(
      appBar: AppBar(
        title: Text(job?.deliveryCode ?? 'Delivery'),
        actions: [
          if (job != null)
            IconButton(
              tooltip: 'Get help',
              icon: const Icon(Icons.support_agent),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => NewTicketScreen(
                    deliveryId: job.id,
                    deliveryCode: job.deliveryCode,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: job == null
          ? (_loadError == null
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    children: [
                      EmptyState(
                        icon: Icons.error_outline,
                        message: errorText(_loadError!),
                      ),
                      Center(
                        child: FilledButton.tonal(
                          onPressed: _load,
                          child: const Text('Try again'),
                        ),
                      ),
                    ],
                  ))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _Header(job: job),
                  _Progress(job: job),
                  if (!const {
                    'DELIVERED',
                    'RETURNED_TO_SELLER',
                    'CANCELLED',
                  }.contains(job.status))
                    _RouteCard(job: job),
                  ..._stops(job),
                  _PackageCard(job: job),
                  const SizedBox(height: 4),
                  ..._actions(job),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  List<Widget> _stops(RiderJob job) {
    final towardsSeller = job.isBeforePickup || job.isReturning;
    return [
      _StopCard(
        title: job.isReturning ? 'Return to seller' : 'Pickup',
        icon: Icons.storefront,
        stop: job.pickup,
        highlight: towardsSeller,
      ),
      if (!job.isReturning)
        _StopCard(
          title: 'Drop-off',
          icon: Icons.place,
          stop: job.dropoff,
          highlight: !towardsSeller,
        ),
    ];
  }

  List<Widget> _actions(RiderJob job) {
    final widgets = <Widget>[];
    void primary(
      String label,
      Future<void> Function() action, {
      IconData? icon,
      Color? color,
    }) {
      widgets
        ..add(
          BusyButton(label: label, onPressed: action, icon: icon, color: color),
        )
        ..add(const SizedBox(height: 10));
    }

    void secondary(
      String label,
      Future<void> Function() action, {
      IconData? icon,
    }) {
      widgets
        ..add(
          BusyButton(label: label, onPressed: action, icon: icon, tonal: true),
        )
        ..add(const SizedBox(height: 10));
    }

    switch (job.status) {
      case 'RIDER_ASSIGNED':
        primary(
          'Start heading to pickup',
          () => _step('start-pickup'),
          icon: Icons.navigation,
        );
      case 'RIDER_TO_PICKUP':
        primary(
          "I've arrived at pickup",
          () => _step('arrived-pickup'),
          icon: Icons.storefront,
        );
      case 'ARRIVED_AT_PICKUP':
        primary(
          'Enter pickup PIN',
          () => _confirmWithPin(
            step: 'confirm-pickup',
            title: 'Pickup PIN',
            helper:
                'Ask the seller for the 6-digit pickup PIN after checking the parcel.',
            attemptsLeft: job.pickupPinAttemptsRemaining,
          ),
          icon: Icons.pin,
        );
      case 'PICKED_UP':
        primary(
          'Start delivery',
          () => _step('start-delivery'),
          icon: Icons.delivery_dining,
        );
      case 'IN_TRANSIT':
        primary(
          "I've arrived at drop-off",
          () => _step('arrived-dropoff'),
          icon: Icons.place,
        );
      case 'ARRIVED_AT_DROPOFF':
        if (job.isCod && !job.codCollected) {
          primary(
            'Collect ${formatPeso(job.codAmount)} cash',
            () => _collectCod(job),
            icon: Icons.payments,
            color: SwitchBrand.warning,
          );
        } else {
          primary(
            'Complete with delivery PIN',
            () => _completeWithPin(job),
            icon: Icons.pin,
          );
          secondary(
            'Complete with photo proof',
            () => _completeWithPhoto(job),
            icon: Icons.photo_camera,
          );
        }
      case 'RETURN_REQUIRED':
        primary(
          'Start return to seller',
          () => _step('start-return'),
          icon: Icons.keyboard_return,
        );
      case 'RETURNING_TO_SELLER':
        primary(
          'Enter return PIN',
          () => _confirmWithPin(
            step: 'confirm-return',
            title: 'Return PIN',
            helper:
                'Hand the parcel back and ask the seller for their 6-digit return PIN.',
            attemptsLeft: job.returnPinAttemptsRemaining,
          ),
          icon: Icons.pin,
        );
      case 'DELIVERED':
      case 'RETURNED_TO_SELLER':
      case 'CANCELLED':
        widgets.add(_FinishedCard(job: job));
    }

    if (const {
          'PICKED_UP',
          'IN_TRANSIT',
          'ARRIVED_AT_DROPOFF',
        }.contains(job.status) &&
        !job.codCollected) {
      widgets.add(
        TextButton.icon(
          onPressed: () => _reportFailed(job),
          icon: const Icon(
            Icons.report_problem_outlined,
            color: SwitchBrand.danger,
          ),
          label: const Text(
            'Report failed delivery',
            style: TextStyle(color: SwitchBrand.danger),
          ),
        ),
      );
    }
    if (job.isBeforePickup) {
      widgets.add(
        TextButton.icon(
          onPressed: _release,
          icon: const Icon(Icons.undo),
          label: const Text("Hand back this job (can't continue)"),
        ),
      );
    }
    return widgets;
  }

  Future<void> _completeWithPin(RiderJob job) async {
    final pin = await showPinDialog(
      context,
      title: 'Delivery PIN',
      helper:
          'Ask the customer for the 6-digit delivery PIN shown in their Switch app.',
      attemptsLeft: job.deliveryPinAttemptsRemaining,
    );
    if (pin == null || !mounted) return;
    await _step('complete', {
      'method': 'PIN',
      'pin': pin,
    }, 'Delivery completed.');
  }
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({required this.job});

  final RiderJob job;

  @override
  Widget build(BuildContext context) {
    final (title, helper) = switch (job.status) {
      'PICKED_UP' || 'IN_TRANSIT' || 'ARRIVED_AT_DROPOFF' => (
        'Route to customer',
        'Your live location to the drop-off point.',
      ),
      'RETURN_REQUIRED' || 'RETURNING_TO_SELLER' || 'FAILED_DELIVERY' => (
        'Return route',
        'Your live location back to the seller.',
      ),
      _ => (
        'Route to pickup',
        'Your live location to the seller pickup point.',
      ),
    };
    return SectionCard(
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: SwitchBrand.teal.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.route, color: SwitchBrand.teal),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  helper,
                  style: const TextStyle(
                    color: SwitchBrand.muted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton.tonal(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => RiderRouteScreen.forJob(
                  jobId: job.id,
                  deliveryCode: job.deliveryCode,
                ),
              ),
            ),
            child: const Text('View'),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.job});

  final RiderJob job;

  @override
  Widget build(BuildContext context) {
    final finished = const {
      'DELIVERED',
      'RETURNED_TO_SELLER',
      'CANCELLED',
    }.contains(job.status);
    return SectionCard(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  jobStatusLabels[job.status] ?? job.status,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Order #${job.orderReference} · ${formatKm(job.distanceKm)}',
                  style: const TextStyle(color: SwitchBrand.muted),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatPeso(job.riderEarning),
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: SwitchBrand.tealDark,
                ),
              ),
              Text(
                finished ? 'Earning' : 'You earn',
                style: const TextStyle(color: SwitchBrand.muted, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.job});

  final RiderJob job;

  @override
  Widget build(BuildContext context) {
    if (job.isReturning ||
        job.status == 'RETURNED_TO_SELLER' ||
        job.status == 'CANCELLED') {
      return const SizedBox.shrink();
    }
    final current = _progressSteps.indexWhere((step) => step.$1 == job.status);
    return SectionCard(
      child: Row(
        children: [
          for (var i = 0; i < _progressSteps.length; i++)
            Expanded(
              child: Tooltip(
                message: _progressSteps[i].$2,
                child: Container(
                  height: 6,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: i <= current
                        ? SwitchBrand.teal
                        : SwitchBrand.tealSoft,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StopCard extends StatelessWidget {
  const _StopCard({
    required this.title,
    required this.icon,
    required this.stop,
    required this.highlight,
  });

  final String title;
  final IconData icon;
  final JobStop stop;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final hasDetails = stop.address.isNotEmpty;
    return SectionCard(
      title: title,
      trailing: Icon(
        icon,
        color: highlight ? SwitchBrand.teal : SwitchBrand.muted,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (stop.name.isNotEmpty)
            Text(
              stop.name,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          Text(
            hasDetails
                ? stop.address
                : (stop.area.isEmpty
                      ? 'Details appear when you need them.'
                      : stop.area),
          ),
          if (highlight && (stop.phone.isNotEmpty || hasDetails)) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                if (stop.phone.isNotEmpty)
                  OutlinedButton.icon(
                    onPressed: () => callNumber(context, stop.phone),
                    icon: const Icon(Icons.call),
                    label: const Text('Call'),
                  ),
                if (hasDetails)
                  OutlinedButton.icon(
                    onPressed: () => openNavigation(
                      context,
                      lat: stop.hasCoordinates ? stop.lat : null,
                      lng: stop.hasCoordinates ? stop.lng : null,
                      address: stop.address,
                    ),
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Navigate'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _PackageCard extends StatelessWidget {
  const _PackageCard({required this.job});

  final RiderJob job;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: 'Parcel & payment',
      child: Column(
        children: [
          InfoRow('Parcels', '${job.packageCount}'),
          if (job.packageNotes.isNotEmpty) InfoRow('Notes', job.packageNotes),
          if (job.isCod) ...[
            InfoRow(
              'Cash to collect',
              formatPeso(job.codAmount),
              emphasize: true,
            ),
            InfoRow(
              'Cash status',
              job.codCollected ? 'Collected' : 'Not yet collected',
            ),
          ] else
            const InfoRow('Payment', 'Prepaid — do not collect cash'),
        ],
      ),
    );
  }
}

class _FinishedCard extends StatelessWidget {
  const _FinishedCard({required this.job});

  final RiderJob job;

  @override
  Widget build(BuildContext context) {
    final (icon, color, message) = switch (job.status) {
      'DELIVERED' => (
        Icons.check_circle,
        SwitchBrand.success,
        'Delivered. Your earning is now pending in your wallet.',
      ),
      'RETURNED_TO_SELLER' => (
        Icons.assignment_return,
        SwitchBrand.warning,
        'Parcel returned to the seller.',
      ),
      _ => (
        Icons.cancel,
        SwitchBrand.muted,
        'This delivery was cancelled. No further action is needed.',
      ),
    };
    return SectionCard(
      child: Column(
        children: [
          Icon(icon, size: 48, color: color),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Back to home'),
          ),
        ],
      ),
    );
  }
}
