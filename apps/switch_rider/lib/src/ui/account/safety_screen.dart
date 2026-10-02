import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../common.dart';
import 'support_screen.dart';

class SafetyScreen extends StatelessWidget {
  const SafetyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final support = context.session.meta?.support;
    final emergencyNumber = support?.emergencyNumber ?? '911';
    final deliveryId = context.runtime.dashboard?.currentDelivery?.id ?? '';
    final deliveryCode = context.runtime.dashboard?.currentDelivery?.deliveryCode ?? '';

    Future<void> report(String category) => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => NewTicketScreen(
              initialCategory: category,
              deliveryId: deliveryId,
              deliveryCode: deliveryCode,
            ),
          ),
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Safety')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: SwitchBrand.danger,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'In an emergency',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    support?.emergencyNote.isNotEmpty == true
                        ? support!.emergencyNote
                        : 'Switch is not an emergency service. In an emergency, call $emergencyNumber first.',
                    style: const TextStyle(color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: SwitchBrand.danger,
                      minimumSize: const Size.fromHeight(52),
                    ),
                    onPressed: () => callNumber(context, emergencyNumber),
                    icon: const Icon(Icons.emergency),
                    label: Text('Call $emergencyNumber'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          SectionCard(
            title: 'Tell Switch',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Our team is alerted right away. Your current delivery is attached automatically.'),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => report('ACCIDENT_EMERGENCY'),
                  icon: const Icon(Icons.car_crash_outlined),
                  label: const Text('Report an accident'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () => report('SAFETY_CONCERN'),
                  icon: const Icon(Icons.shield_outlined),
                  label: const Text('Report a safety concern'),
                ),
                if (support != null && support.hotline.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => callNumber(context, support.hotline),
                    icon: const Icon(Icons.support_agent),
                    label: Text('Call Switch Rider support (${support.hotline})'),
                  ),
                ],
              ],
            ),
          ),
          const SectionCard(
            title: 'Stay safe',
            child: Text(
              '• Never use your phone while driving — pull over first.\n'
              '• You can refuse a location that feels unsafe. Report it as a failed delivery.\n'
              '• Do not enter a customer\'s home.\n'
              '• Keep COD cash out of sight and remit it promptly.',
            ),
          ),
        ],
      ),
    );
  }
}
