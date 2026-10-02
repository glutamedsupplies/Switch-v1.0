import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';

class CashWalletScreen extends StatefulWidget {
  const CashWalletScreen({super.key});

  @override
  State<CashWalletScreen> createState() => _CashWalletScreenState();
}

class _CashWalletScreenState extends State<CashWalletScreen> {
  int _version = 0;

  Future<void> _remit(CashWallet wallet) async {
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _RemitSheet(outstanding: wallet.outstanding),
    );
    if (submitted == true && mounted) {
      setState(() => _version++);
      context.runtime.refresh();
      context.showMessage('Remittance submitted. Switch will verify it.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('COD cash wallet')),
      body: AsyncList<CashWallet>(
        key: ValueKey(_version),
        load: context.api.cashWallet,
        builder: (context, wallet, reload) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            SectionCard(
              child: Column(
                children: [
                  const Text('Cash to remit', style: TextStyle(color: SwitchBrand.muted)),
                  const SizedBox(height: 4),
                  Text(
                    formatPeso(wallet.outstanding),
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: SwitchBrand.warning),
                  ),
                  const SizedBox(height: 12),
                  InfoRow('Total COD collected', formatPeso(wallet.collected)),
                  InfoRow('Remitted, awaiting verification', formatPeso(wallet.remittedAwaitingVerification)),
                  InfoRow('Verified by Switch', formatPeso(wallet.verified)),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: wallet.outstanding > 0 ? () => _remit(wallet) : null,
                      icon: const Icon(Icons.send),
                      label: const Text('Remit cash'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'COD cash belongs to the seller. It is tracked separately from your earnings.',
                    style: TextStyle(color: SwitchBrand.muted, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            SectionCard(
              title: 'Remittances',
              child: wallet.remittances.isEmpty
                  ? const Text('No remittances yet.', style: TextStyle(color: SwitchBrand.muted))
                  : Column(
                      children: [
                        for (final remittance in wallet.remittances)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(formatPeso(remittance.amount), style: const TextStyle(fontWeight: FontWeight.w700)),
                            subtitle: Text(
                              '${methodLabel(remittance.method)}'
                              '${remittance.reference.isEmpty ? '' : ' · Ref ${remittance.reference}'}\n'
                              '${formatDateTime(remittance.createdAt)}'
                              '${remittance.status == 'REJECTED' && remittance.note.isNotEmpty ? '\n${remittance.note}' : ''}',
                            ),
                            isThreeLine: true,
                            trailing: _remittanceChip(remittance.status),
                          ),
                      ],
                    ),
            ),
            SectionCard(
              title: 'COD collections',
              child: wallet.collections.isEmpty
                  ? const Text('No cash collected yet.', style: TextStyle(color: SwitchBrand.muted))
                  : Column(
                      children: [
                        for (final cod in wallet.collections)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(cod.deliveryCode),
                            subtitle: Text(formatDateTime(cod.collectedAt)),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(formatPeso(cod.amount), style: const TextStyle(fontWeight: FontWeight.w700)),
                                Text(
                                  switch (cod.status) {
                                    'PENDING_REMITTANCE' => 'To remit',
                                    'REMITTED' => 'Remitted',
                                    'VERIFIED' => 'Verified',
                                    _ => cod.status,
                                  },
                                  style: const TextStyle(color: SwitchBrand.muted, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _remittanceChip(String status) => switch (status) {
        'VERIFIED' => const StatusChip('Verified', color: SwitchBrand.success),
        'REJECTED' => const StatusChip('Rejected', color: SwitchBrand.danger),
        _ => const StatusChip('Awaiting check', color: SwitchBrand.warning),
      };
}

class _RemitSheet extends StatefulWidget {
  const _RemitSheet({required this.outstanding});

  final double outstanding;

  @override
  State<_RemitSheet> createState() => _RemitSheetState();
}

class _RemitSheetState extends State<_RemitSheet> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _amount = TextEditingController(text: widget.outstanding.toStringAsFixed(2));
  final _reference = TextEditingController();
  final _note = TextEditingController();
  String _method = 'GCASH';
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    _reference.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_form.currentState!.validate()) return;
    try {
      await context.api.submitRemittance(
        amount: double.parse(_amount.text.trim()),
        method: _method,
        reference: _reference.text.trim(),
        note: _note.text.trim(),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) setState(() => _error = errorText(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
      child: Form(
        key: _form,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Remit COD cash', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 6),
              Text('Outstanding: ${formatPeso(widget.outstanding)}', style: const TextStyle(color: SwitchBrand.muted)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _method,
                decoration: const InputDecoration(labelText: 'Method'),
                items: const [
                  DropdownMenuItem(value: 'GCASH', child: Text('GCash')),
                  DropdownMenuItem(value: 'BANK_TRANSFER', child: Text('Bank transfer')),
                  DropdownMenuItem(value: 'CASH_AT_HUB', child: Text('Cash at Switch hub')),
                ],
                onChanged: (value) => setState(() => _method = value ?? _method),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _amount,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                decoration: const InputDecoration(labelText: 'Amount', prefixText: '₱ '),
                validator: (value) {
                  final amount = double.tryParse((value ?? '').trim());
                  if (amount == null || amount <= 0) return 'Enter an amount.';
                  if (amount > widget.outstanding + 0.001) return 'You only have ${formatPeso(widget.outstanding)} to remit.';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _reference,
                decoration: InputDecoration(
                  labelText: _method == 'CASH_AT_HUB' ? 'Receipt number (optional)' : 'Reference number',
                ),
                validator: (value) => _method != 'CASH_AT_HUB' && (value ?? '').trim().isEmpty
                    ? 'Enter the transfer reference number.'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _note,
                maxLength: 300,
                decoration: const InputDecoration(labelText: 'Note (optional)'),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(_error!, style: const TextStyle(color: SwitchBrand.danger)),
                ),
              BusyButton(label: 'Submit remittance', onPressed: _submit),
            ],
          ),
        ),
      ),
    );
  }
}
