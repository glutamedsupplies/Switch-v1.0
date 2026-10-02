import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';
import 'job_screen.dart';

class JobsTab extends StatelessWidget {
  const JobsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Active jobs')),
      body: ListenableBuilder(
        listenable: context.runtime,
        builder: (context, _) => AsyncList<List<RiderJob>>(
          // Re-fetch whenever the number of active deliveries changes.
          key: ValueKey(context.runtime.dashboard?.activeDeliveryCount),
          load: context.api.activeJobs,
          builder: (context, jobs, reload) {
            if (jobs.isEmpty) {
              return ListView(
                children: const [
                  EmptyState(
                    icon: Icons.local_shipping_outlined,
                    message: 'No active jobs. Go online on the Home tab to receive delivery offers.',
                  ),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: jobs.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final job = jobs[index];
                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    title: Text(job.deliveryCode, style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text(
                      '${job.pickup.area.isEmpty ? 'Pickup' : job.pickup.area} → '
                      '${job.dropoff.area.isEmpty ? 'Drop-off' : job.dropoff.area}\n'
                      '${job.isCod ? 'COD ${formatPeso(job.codAmount)}' : 'Prepaid'} · ${formatKm(job.distanceKm)}',
                    ),
                    isThreeLine: true,
                    trailing: StatusChip(jobStatusLabels[job.status] ?? job.status, color: SwitchBrand.warning),
                    onTap: () async {
                      await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => JobScreen(jobId: job.id)));
                      await reload();
                    },
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
