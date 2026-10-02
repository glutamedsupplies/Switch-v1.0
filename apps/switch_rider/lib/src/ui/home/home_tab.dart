import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../account/documents_screen.dart';
import '../account/notifications_screen.dart';
import '../account/safety_screen.dart';
import '../common.dart';
import '../earnings/cash_wallet_screen.dart';
import '../jobs/job_screen.dart';
import 'offer_card.dart';

class HomeTab extends StatelessWidget {
  const HomeTab({super.key, required this.onOpenTab});

  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context) {
    final runtime = context.runtime;
    final session = context.session;
    return ListenableBuilder(
      listenable: Listenable.merge([runtime, session]),
      builder: (context, _) {
        final profile = session.profile;
        final dashboard = runtime.dashboard;
        final unread = dashboard?.unreadNotifications ?? 0;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Switch Rider'),
            actions: [
              IconButton(
                tooltip: 'Safety',
                icon: const Icon(Icons.health_and_safety_outlined),
                onPressed: () => _push(context, const SafetyScreen()),
              ),
              IconButton(
                tooltip: 'Notifications',
                icon: Badge(
                  isLabelVisible: unread > 0,
                  label: Text(unread > 99 ? '99+' : '$unread'),
                  child: const Icon(Icons.notifications_outlined),
                ),
                onPressed: () async {
                  await _push(context, const NotificationsScreen());
                  if (context.mounted) context.runtime.refresh();
                },
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              await Future.wait([runtime.refresh(), session.refreshProfile()]);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (profile != null && !profile.isOperational) _AccountStatusCard(profile: profile),
                if (runtime.error != null && dashboard == null)
                  SectionCard(child: Text(runtime.error!, style: const TextStyle(color: SwitchBrand.danger))),
                _AvailabilityCard(profile: profile),
                if (runtime.offer != null)
                  OfferCard(
                    key: ValueKey(runtime.offer!.offerId),
                    offer: runtime.offer!,
                    onAccepted: (job) => _push(context, JobScreen(jobId: job.id)),
                  ),
                if (dashboard?.currentDelivery != null) _CurrentDeliveryCard(job: dashboard!.currentDelivery!),
                if (dashboard != null &&
                    runtime.isOnline &&
                    runtime.offer == null &&
                    dashboard.currentDelivery == null)
                  const _WaitingCard(),
                if (dashboard != null) _StatsGrid(dashboard: dashboard, onOpenEarnings: () => onOpenTab(2)),
              ],
            ),
          ),
        );
      },
    );
  }
}

Future<void> _push(BuildContext context, Widget screen) =>
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));

class _AccountStatusCard extends StatelessWidget {
  const _AccountStatusCard({required this.profile});

  final RiderProfile profile;

  @override
  Widget build(BuildContext context) {
    final missing = profile.missingDocuments;
    final (title, message, color) = switch (profile.status) {
      'PENDING_VERIFICATION' when missing.isNotEmpty => (
          'Upload your documents',
          'Switch needs your documents before we can verify your account.',
          SwitchBrand.warning,
        ),
      'PENDING_VERIFICATION' => (
          'Verification in progress',
          'Your documents are with our team. We will notify you once your account is approved.',
          SwitchBrand.warning,
        ),
      'REJECTED' => (
          'Application not approved',
          profile.statusReason.isNotEmpty
              ? profile.statusReason
              : 'Check your documents and upload new photos to apply again.',
          SwitchBrand.danger,
        ),
      'SUSPENDED' => (
          'Account suspended',
          profile.statusReason.isNotEmpty ? profile.statusReason : 'Contact Switch Rider support for help.',
          SwitchBrand.danger,
        ),
      _ => ('Account unavailable', 'Contact Switch Rider support for help.', SwitchBrand.danger),
    };
    final documentsLabel = context.session.meta;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.verified_user_outlined, color: color),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: TextStyle(fontWeight: FontWeight.w800, color: color, fontSize: 16))),
            ],
          ),
          const SizedBox(height: 8),
          Text(message),
          if (missing.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Missing: ${missing.map((type) => documentsLabel?.documentLabel(type) ?? type).join(', ')}',
              style: const TextStyle(color: SwitchBrand.muted),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (profile.status != 'SUSPENDED')
                FilledButton.icon(
                  onPressed: () async {
                    await _push(context, const DocumentsScreen());
                    if (context.mounted) await context.session.refreshProfile();
                  },
                  icon: const Icon(Icons.upload_file),
                  label: const Text('Documents'),
                ),
              OutlinedButton.icon(
                onPressed: () => context.session.refreshProfile(),
                icon: const Icon(Icons.refresh),
                label: const Text('Check status'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AvailabilityCard extends StatelessWidget {
  const _AvailabilityCard({required this.profile});

  final RiderProfile? profile;

  Future<void> _toggle(BuildContext context, bool online) async {
    final runtime = context.runtime;
    final problem = online ? await runtime.goOnline() : await runtime.goOffline();
    if (problem != null && context.mounted) context.showMessage(problem, error: true);
  }

  @override
  Widget build(BuildContext context) {
    final runtime = context.runtime;
    final dashboard = runtime.dashboard;
    final label = dashboard?.statusLabel ?? (runtime.isOnline ? 'ONLINE' : 'OFFLINE');
    final color = switch (label) {
      'ON DELIVERY' => SwitchBrand.warning,
      'ONLINE' => SwitchBrand.success,
      _ => SwitchBrand.muted,
    };
    final operational = profile?.isOperational ?? false;
    final lockedOnline = runtime.hasActiveDelivery;
    final hint = !operational
        ? 'You can go online once your account is approved.'
        : lockedOnline
            ? 'You stay online while carrying a parcel.'
            : runtime.isOnline
                ? 'You are receiving delivery offers near you.'
                : 'Go online to start receiving delivery offers.';

    return SectionCard(
      child: Row(
        children: [
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: color)),
                const SizedBox(height: 2),
                Text(hint, style: const TextStyle(color: SwitchBrand.muted)),
              ],
            ),
          ),
          if (runtime.togglingAvailability)
            const Padding(
              padding: EdgeInsets.all(12),
              child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5)),
            )
          else
            Switch(
              value: runtime.isOnline,
              onChanged: !operational || lockedOnline ? null : (value) => _toggle(context, value),
            ),
        ],
      ),
    );
  }
}

class _CurrentDeliveryCard extends StatelessWidget {
  const _CurrentDeliveryCard({required this.job});

  final RiderJob job;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: 'Current delivery',
      trailing: StatusChip(jobStatusLabels[job.status] ?? job.status, color: SwitchBrand.warning),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(job.deliveryCode, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('${job.pickup.area.isEmpty ? 'Pickup' : job.pickup.area} → ${job.dropoff.area.isEmpty ? 'Drop-off' : job.dropoff.area}'),
          if (job.isCod)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Collect ${formatPeso(job.codAmount)} cash', style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () async {
              await _push(context, JobScreen(jobId: job.id));
              if (context.mounted) context.runtime.refresh();
            },
            child: const Text('Open delivery'),
          ),
        ],
      ),
    );
  }
}

class _WaitingCard extends StatelessWidget {
  const _WaitingCard();

  @override
  Widget build(BuildContext context) {
    return const SectionCard(
      child: Row(
        children: [
          SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4)),
          SizedBox(width: 14),
          Expanded(child: Text('Looking for deliveries near you. Keep the app open.')),
        ],
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.dashboard, required this.onOpenEarnings});

  final RiderDashboard dashboard;
  final VoidCallback onOpenEarnings;

  @override
  Widget build(BuildContext context) {
    Widget tile(String label, String value, IconData icon, VoidCallback onTap) => Expanded(
          child: Card(
            margin: const EdgeInsets.all(4),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: SwitchBrand.teal),
                    const SizedBox(height: 8),
                    Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
                    Text(label, style: const TextStyle(color: SwitchBrand.muted, fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        );
    void openCash() => _push(context, const CashWalletScreen());
    return Column(
      children: [
        Row(
          children: [
            tile('Earned today', formatPeso(dashboard.todayEarnings), Icons.payments_outlined, onOpenEarnings),
            tile('Delivered today', '${dashboard.completedToday}', Icons.check_circle_outline, onOpenEarnings),
          ],
        ),
        Row(
          children: [
            tile('Available to pay out', formatPeso(dashboard.availableEarnings), Icons.savings_outlined, onOpenEarnings),
            tile('COD cash on hand', formatPeso(dashboard.cashOnHand), Icons.money, openCash),
          ],
        ),
      ],
    );
  }
}
