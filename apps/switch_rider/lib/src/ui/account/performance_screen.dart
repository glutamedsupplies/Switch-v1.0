import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';

class PerformanceScreen extends StatelessWidget {
  const PerformanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Performance')),
      body: AsyncList<RiderPerformance>(
        load: context.api.performance,
        builder: (context, performance, reload) {
          Widget metric(String key, String label, double? value) => SectionCard(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(
                            performance.definitions[key] ?? '',
                            style: const TextStyle(color: SwitchBrand.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(formatPercent(value), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
                  ],
                ),
              );
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SectionCard(
                child: Row(
                  children: [
                    const Icon(Icons.star, color: Colors.amber, size: 36),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        performance.ratingCount == 0
                            ? 'No ratings yet'
                            : '${performance.ratingAverage.toStringAsFixed(2)} from ${performance.ratingCount} ratings',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Last 30 days · ${performance.deliveredCount} delivered · ${performance.offersReceived} offers',
                  style: const TextStyle(color: SwitchBrand.muted),
                ),
              ),
              metric('acceptanceRate', 'Acceptance rate', performance.acceptanceRate),
              metric('completionRate', 'Completion rate', performance.completionRate),
              metric('cancellationRate', 'Hand-back rate', performance.cancellationRate),
              metric('onTimeRate', 'On-time rate', performance.onTimeRate),
            ],
          );
        },
      ),
    );
  }
}
