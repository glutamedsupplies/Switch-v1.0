import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../common.dart';
import 'documents_screen.dart';
import 'notifications_screen.dart';
import 'performance_screen.dart';
import 'profile_screens.dart';
import 'safety_screen.dart';
import 'support_screen.dart';

class AccountTab extends StatelessWidget {
  const AccountTab({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.session;
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListenableBuilder(
        listenable: session,
        builder: (context, _) {
          final profile = session.profile;
          if (profile == null) return const Center(child: CircularProgressIndicator());
          final statusColor = profile.isOperational
              ? SwitchBrand.success
              : profile.status == 'PENDING_VERIFICATION'
                  ? SwitchBrand.warning
                  : SwitchBrand.danger;
          Future<void> open(Widget screen) =>
              Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));

          return RefreshIndicator(
            onRefresh: () async => session.refreshProfile(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                SectionCard(
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: SwitchBrand.tealSoft,
                        child: Text(
                          profile.firstName.isEmpty ? '?' : profile.firstName[0].toUpperCase(),
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: SwitchBrand.tealDark),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(profile.fullName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                            Text(profile.riderCode, style: const TextStyle(color: SwitchBrand.muted)),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                StatusChip(riderStatusLabels[profile.status] ?? profile.status, color: statusColor),
                                const SizedBox(width: 8),
                                const Icon(Icons.star, size: 16, color: Colors.amber),
                                Text(
                                  profile.ratingCount == 0
                                      ? ' New'
                                      : ' ${profile.ratingAverage.toStringAsFixed(1)} (${profile.ratingCount})',
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                SectionCard(
                  title: 'Vehicle',
                  child: Column(
                    children: [
                      InfoRow('Type', vehicleLabel(profile.vehicleType)),
                      if (profile.plateNumber.isNotEmpty) InfoRow('Plate', profile.plateNumber),
                      if (profile.vehicleModel.isNotEmpty)
                        InfoRow('Model', '${profile.vehicleModel} · ${profile.vehicleColor}'),
                      const SizedBox(height: 4),
                      const Text(
                        'To change your vehicle, contact support so we can re-verify your documents.',
                        style: TextStyle(color: SwitchBrand.muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Card(
                  child: Column(
                    children: [
                      _MenuTile(
                        icon: Icons.badge_outlined,
                        label: 'Documents',
                        badge: profile.missingDocuments.isEmpty ? null : '${profile.missingDocuments.length} missing',
                        onTap: () async {
                          await open(const DocumentsScreen());
                          await session.refreshProfile();
                        },
                      ),
                      _MenuTile(icon: Icons.insights_outlined, label: 'Performance', onTap: () => open(const PerformanceScreen())),
                      _MenuTile(
                        icon: Icons.notifications_outlined,
                        label: 'Notifications',
                        onTap: () => open(const NotificationsScreen()),
                      ),
                      _MenuTile(icon: Icons.support_agent, label: 'Help & support', onTap: () => open(const SupportScreen())),
                      _MenuTile(
                        icon: Icons.health_and_safety_outlined,
                        label: 'Safety',
                        onTap: () => open(const SafetyScreen()),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Card(
                  child: Column(
                    children: [
                      _MenuTile(
                        icon: Icons.contact_phone_outlined,
                        label: 'Email & emergency contact',
                        onTap: () => open(const EditProfileScreen()),
                      ),
                      _MenuTile(icon: Icons.lock_outline, label: 'Change password', onTap: () => open(const ChangePasswordScreen())),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: SwitchBrand.danger,
                    minimumSize: const Size.fromHeight(50),
                  ),
                  onPressed: () => _confirmSignOut(context),
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign out'),
                ),
                const SizedBox(height: 12),
                Center(
                  child: Text(
                    '+63 ${profile.mobileNumber}',
                    style: const TextStyle(color: SwitchBrand.muted, fontSize: 12),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _confirmSignOut(BuildContext context) async {
    final runtime = context.runtime;
    final session = context.session;
    if (runtime.hasActiveDelivery) {
      context.showMessage('Finish your current delivery before signing out.', error: true);
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will go offline and stop receiving delivery offers.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed != true) return;
    if (runtime.isOnline) {
      final problem = await runtime.goOffline();
      if (problem != null) {
        if (context.mounted) context.showMessage(problem, error: true);
        return;
      }
    }
    await session.logout();
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.icon, required this.label, required this.onTap, this.badge});

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: SwitchBrand.teal),
      title: Text(label),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (badge != null) StatusChip(badge!, color: SwitchBrand.warning),
          const Icon(Icons.chevron_right),
        ],
      ),
      onTap: onTap,
    );
  }
}
