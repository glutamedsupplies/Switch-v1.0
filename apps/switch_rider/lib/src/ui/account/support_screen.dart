import 'package:flutter/material.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';
import '../common.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  int _version = 0;

  Future<void> _newTicket() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const NewTicketScreen()),
    );
    if (created == true && mounted) setState(() => _version++);
  }

  @override
  Widget build(BuildContext context) {
    final support = context.session.meta?.support;
    return Scaffold(
      appBar: AppBar(title: const Text('Help & support')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _newTicket,
        icon: const Icon(Icons.add),
        label: const Text('New ticket'),
      ),
      body: AsyncList<List<SupportTicket>>(
        key: ValueKey(_version),
        load: context.api.supportTickets,
        builder: (context, tickets, reload) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            if (support != null && (support.hotline.isNotEmpty || support.email.isNotEmpty))
              SectionCard(
                title: 'Contact Switch Rider support',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (support.hotline.isNotEmpty)
                      OutlinedButton.icon(
                        onPressed: () => callNumber(context, support.hotline),
                        icon: const Icon(Icons.call),
                        label: Text('Call ${support.hotline}'),
                      ),
                    if (support.email.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: SelectableText('Email: ${support.email}'),
                      ),
                  ],
                ),
              ),
            Text('Your tickets', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (tickets.isEmpty)
              const EmptyState(icon: Icons.support_agent, message: 'No tickets yet. Tap "New ticket" if you need help.'),
            for (final ticket in tickets)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(
                    '${ticket.categoryLabel}${ticket.deliveryCode.isEmpty ? '' : ' · ${ticket.deliveryCode}'}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    [
                      if (ticket.description.isNotEmpty) ticket.description,
                      if (ticket.resolution.isNotEmpty) 'Resolution: ${ticket.resolution}',
                      formatDateTime(ticket.createdAt),
                    ].join('\n'),
                  ),
                  isThreeLine: true,
                  trailing: StatusChip(
                    switch (ticket.status) {
                      'OPEN' => 'Open',
                      'IN_REVIEW' => 'In review',
                      'RESOLVED' => 'Resolved',
                      _ => ticket.status,
                    },
                    color: ticket.status == 'RESOLVED'
                        ? SwitchBrand.success
                        : ticket.isSafety
                            ? SwitchBrand.danger
                            : SwitchBrand.warning,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Creates a support ticket, optionally linked to a delivery or preset to a category.
class NewTicketScreen extends StatefulWidget {
  const NewTicketScreen({super.key, this.deliveryId = '', this.deliveryCode = '', this.initialCategory});

  final String deliveryId;
  final String deliveryCode;
  final String? initialCategory;

  @override
  State<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends State<NewTicketScreen> {
  final _description = TextEditingController();
  String? _category;
  String? _error;

  @override
  void initState() {
    super.initState();
    _category = widget.initialCategory;
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit(List<LabeledCode> categories) async {
    final category = categories.where((c) => c.code == _category).firstOrNull;
    if (category == null) {
      setState(() => _error = 'Choose what you need help with.');
      return;
    }
    if (!category.flag && _description.text.trim().isEmpty) {
      setState(() => _error = 'Describe the issue.');
      return;
    }
    setState(() => _error = null);
    try {
      await context.api.createSupportTicket(
        category: category.code,
        description: _description.text.trim(),
        deliveryId: widget.deliveryId,
      );
      if (!mounted) return;
      context.showMessage(category.flag
          ? 'Switch support has been alerted. If you are in danger, call 911 first.'
          : 'Ticket sent. Switch support will get back to you.');
      Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) setState(() => _error = errorText(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = context.session.meta?.incidentCategories ?? const <LabeledCode>[];
    return Scaffold(
      appBar: AppBar(title: const Text('Get help')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (widget.deliveryCode.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text('About delivery ${widget.deliveryCode}', style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          if (categories.isEmpty)
            const Text('Help topics could not be loaded. Check your connection and try again.')
          else
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'What do you need help with?'),
              items: [
                for (final category in categories)
                  DropdownMenuItem(value: category.code, child: Text(category.label)),
              ],
              onChanged: (value) => setState(() => _category = value),
            ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            maxLines: 5,
            maxLength: 1000,
            decoration: const InputDecoration(labelText: 'Describe the issue', alignLabelWithHint: true),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(_error!, style: const TextStyle(color: SwitchBrand.danger)),
            ),
          BusyButton(label: 'Send to support', onPressed: categories.isEmpty ? null : () => _submit(categories)),
        ],
      ),
    );
  }
}
