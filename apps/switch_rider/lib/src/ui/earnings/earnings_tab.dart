import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';
import 'cash_wallet_screen.dart';

class EarningsTab extends StatelessWidget {
  const EarningsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: ListenableBuilder(
        listenable: context.runtime,
        builder: (context, _) => AsyncList<EarningsSummary>(
          key: ValueKey(context.runtime.dashboard?.completedToday),
          load: context.api.earnings,
          builder: (context, summary, reload) => ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SectionCard(
                child: Row(
                  children: [
                    _Period('Today', summary.today, '${summary.todayDeliveries} deliveries'),
                    _Period('This week', summary.week, 'Mon–Sun'),
                    _Period('This month', summary.month, ''),
                  ],
                ),
              ),
              SectionCard(
                title: 'Wallet',
                child: Column(
                  children: [
                    InfoRow('Pending (on hold)', formatPeso(summary.pending)),
                    InfoRow('Available for payout', formatPeso(summary.available), emphasize: true),
                    InfoRow('Paid out', formatPeso(summary.paid)),
                    const SizedBox(height: 8),
                    const Text(
                      'New earnings stay pending for a short hold period, then become available. '
                      'Switch sends payouts from your available balance. Cash you collect for COD orders is not '
                      'your earning — it belongs to the seller and must be remitted.',
                      style: TextStyle(color: SwitchBrand.muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: const Icon(Icons.money, color: SwitchBrand.warning),
                  title: const Text('COD cash wallet'),
                  subtitle: const Text('Cash on hand and remittances'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const CashWalletScreen()),
                  ),
                ),
              ),
              SectionCard(
                title: 'Recent earnings',
                child: summary.earnings.isEmpty
                    ? const Text('No earnings yet.', style: TextStyle(color: SwitchBrand.muted))
                    : Column(children: [for (final line in summary.earnings) _EarningTile(line: line)]),
              ),
              SectionCard(
                title: 'Payouts',
                child: summary.payouts.isEmpty
                    ? const Text('No payouts yet.', style: TextStyle(color: SwitchBrand.muted))
                    : Column(
                        children: [
                          for (final payout in summary.payouts)
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(formatPeso(payout.amount), style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(
                                '${methodLabel(payout.method)}${payout.reference.isEmpty ? '' : ' · Ref ${payout.reference}'}\n'
                                '${formatDateTime(payout.createdAt)}',
                              ),
                              isThreeLine: true,
                            ),
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

class _Period extends StatelessWidget {
  const _Period(this.label, this.amount, this.caption);

  final String label;
  final double amount;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(label, style: const TextStyle(color: SwitchBrand.muted, fontSize: 12)),
          const SizedBox(height: 4),
          FittedBox(
            child: Text(formatPeso(amount), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
          ),
          if (caption.isNotEmpty) Text(caption, style: const TextStyle(color: SwitchBrand.muted, fontSize: 11)),
        ],
      ),
    );
  }
}

class _EarningTile extends StatelessWidget {
  const _EarningTile({required this.line});

  final EarningLine line;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (line.status) {
      'PENDING' => ('Pending', SwitchBrand.warning),
      'AVAILABLE' => ('Available', SwitchBrand.success),
      'PAID' => ('Paid', SwitchBrand.teal),
      'VOID' => ('Void', SwitchBrand.muted),
      _ => (line.status, SwitchBrand.muted),
    };
    final breakdown = [
      'Base ${formatPeso(line.baseFee)}',
      if (line.distanceFee > 0) 'Distance ${formatPeso(line.distanceFee)}',
      if (line.bonus > 0) 'Bonus ${formatPeso(line.bonus)}',
      if (line.tip > 0) 'Tip ${formatPeso(line.tip)}',
      if (line.adjustment != 0) 'Adj. ${formatPeso(line.adjustment)}',
    ].join(' · ');
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text('${line.deliveryCode}${line.type == 'FAILED_ATTEMPT' ? ' (failed attempt)' : ''}'),
      subtitle: Text('${line.route}\n$breakdown'),
      isThreeLine: true,
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(formatPeso(line.total), style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          StatusChip(label, color: color),
        ],
      ),
    );
  }
}
