import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../rider_api.dart';
import '../runtime.dart';
import '../session.dart';

/// Gives screens access to the session and live runtime.
class RiderScope extends InheritedWidget {
  const RiderScope({super.key, required this.session, required this.runtime, required super.child});

  final RiderSession session;
  final RiderRuntime runtime;

  static RiderScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<RiderScope>();
    assert(scope != null, 'RiderScope missing');
    return scope!;
  }

  @override
  bool updateShouldNotify(RiderScope oldWidget) =>
      session != oldWidget.session || runtime != oldWidget.runtime;
}

extension RiderContext on BuildContext {
  RiderSession get session => RiderScope.of(this).session;
  RiderRuntime get runtime => RiderScope.of(this).runtime;
  RiderApi get api => RiderScope.of(this).session.api;

  void showMessage(String message, {bool error = false}) {
    final messenger = ScaffoldMessenger.maybeOf(this);
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: error ? SwitchBrand.danger : null,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }
}

String errorText(Object error) =>
    error is SwitchApiException ? error.message : 'Something went wrong. Please try again.';

const Map<String, String> jobStatusLabels = {
  'PREPARING': 'Preparing',
  'WAITING_FOR_RIDER': 'Finding rider',
  'OFFERED': 'Offered',
  'RIDER_ASSIGNED': 'Accepted',
  'RIDER_TO_PICKUP': 'Heading to pickup',
  'ARRIVED_AT_PICKUP': 'At pickup',
  'PICKED_UP': 'Picked up',
  'IN_TRANSIT': 'On the way',
  'ARRIVED_AT_DROPOFF': 'At drop-off',
  'DELIVERED': 'Delivered',
  'FAILED_DELIVERY': 'Delivery failed',
  'RETURN_REQUIRED': 'Return to seller',
  'RETURNING_TO_SELLER': 'Returning to seller',
  'RETURNED_TO_SELLER': 'Returned to seller',
  'CANCELLED': 'Cancelled',
};

const Map<String, String> riderStatusLabels = {
  'PENDING_VERIFICATION': 'Pending verification',
  'APPROVED': 'Approved',
  'REJECTED': 'Not approved',
  'ACTIVE': 'Active',
  'SUSPENDED': 'Suspended',
  'DEACTIVATED': 'Deactivated',
};

String vehicleLabel(String type) => switch (type) {
      'BICYCLE' => 'Bicycle',
      'MOTORCYCLE' => 'Motorcycle',
      'CAR' => 'Car',
      'VAN' => 'Van',
      _ => type,
    };

String methodLabel(String method) => switch (method) {
      'GCASH' => 'GCash',
      'BANK_TRANSFER' => 'Bank transfer',
      'CASH_AT_HUB' => 'Cash at hub',
      'MANUAL' => 'Manual',
      _ => method.replaceAll('_', ' '),
    };

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

String formatDateTime(DateTime? value) {
  if (value == null) return '';
  final hour = value.hour % 12 == 0 ? 12 : value.hour % 12;
  final minute = value.minute.toString().padLeft(2, '0');
  return '${_months[value.month - 1]} ${value.day}, $hour:$minute ${value.hour < 12 ? 'AM' : 'PM'}';
}

String formatKm(double km) => '${km.toStringAsFixed(km < 10 ? 1 : 0)} km';

String formatPercent(double? value) => value == null ? '—' : '${value.toStringAsFixed(value % 1 == 0 ? 0 : 1)}%';

Future<void> callNumber(BuildContext context, String phone) async {
  final cleaned = phone.replaceAll(RegExp(r'[^\d+]'), '');
  if (cleaned.isEmpty) return;
  final ok = await launchUrl(Uri(scheme: 'tel', path: cleaned));
  if (!ok && context.mounted) context.showMessage('Unable to open the phone app.', error: true);
}

Future<void> openNavigation(BuildContext context, {double? lat, double? lng, String address = ''}) async {
  final destination = lat != null && lng != null ? '$lat,$lng' : address;
  if (destination.isEmpty) return;
  final uri = Uri.https('www.google.com', '/maps/dir/', {'api': '1', 'destination': destination});
  final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok && context.mounted) context.showMessage('Unable to open maps.', error: true);
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key, this.color = SwitchBrand.teal});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, this.title, required this.child, this.trailing, this.padding});

  final String? title;
  final Widget child;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    Expanded(child: Text(title!, style: Theme.of(context).textTheme.titleMedium)),
                    ?trailing,
                  ],
                ),
              ),
            child,
          ],
        ),
      ),
    );
  }
}

class InfoRow extends StatelessWidget {
  const InfoRow(this.label, this.value, {super.key, this.emphasize = false});

  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: SwitchBrand.muted))),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(fontWeight: emphasize ? FontWeight.w800 : FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      child: Column(
        children: [
          Icon(icon, size: 48, color: SwitchBrand.muted),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: SwitchBrand.muted)),
        ],
      ),
    );
  }
}

/// Loads data once, shows loading/error states, and supports pull-to-refresh.
class AsyncList<T> extends StatefulWidget {
  const AsyncList({super.key, required this.load, required this.builder});

  final Future<T> Function() load;
  final Widget Function(BuildContext context, T data, Future<void> Function() reload) builder;

  @override
  State<AsyncList<T>> createState() => _AsyncListState<T>();
}

class _AsyncListState<T> extends State<AsyncList<T>> {
  T? _data;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    setState(() => _loading = _data == null);
    try {
      final data = await widget.load();
      if (!mounted) return;
      setState(() {
        _data = data;
        _error = null;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_data == null) {
      return ListView(
        children: [
          EmptyState(icon: Icons.cloud_off_outlined, message: errorText(_error ?? 'error')),
          Center(child: FilledButton.tonal(onPressed: _reload, child: const Text('Try again'))),
        ],
      );
    }
    return RefreshIndicator(onRefresh: _reload, child: widget.builder(context, _data as T, _reload));
  }
}

/// Button that disables itself and shows a spinner while [onPressed] runs.
class BusyButton extends StatefulWidget {
  const BusyButton({super.key, required this.label, required this.onPressed, this.icon, this.tonal = false, this.color});

  final String label;
  final Future<void> Function()? onPressed;
  final IconData? icon;
  final bool tonal;
  final Color? color;

  @override
  State<BusyButton> createState() => _BusyButtonState();
}

class _BusyButtonState extends State<BusyButton> {
  bool _busy = false;

  Future<void> _run() async {
    if (_busy || widget.onPressed == null) return;
    setState(() => _busy = true);
    try {
      await widget.onPressed!();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final child = _busy
        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4))
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (widget.icon != null) ...[Icon(widget.icon, size: 20), const SizedBox(width: 8)],
              Flexible(child: Text(widget.label, textAlign: TextAlign.center)),
            ],
          );
    final onPressed = widget.onPressed == null || _busy ? null : _run;
    final style = widget.color == null ? null : FilledButton.styleFrom(backgroundColor: widget.color);
    return SizedBox(
      height: 52,
      child: widget.tonal
          ? FilledButton.tonal(onPressed: onPressed, child: child)
          : FilledButton(onPressed: onPressed, style: style, child: child),
    );
  }
}
