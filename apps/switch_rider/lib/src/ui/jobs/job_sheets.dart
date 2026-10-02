import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_core/switch_core.dart';

import '../../models.dart';

/// Asks for a 6-digit PIN. Returns null when cancelled.
Future<String?> showPinDialog(
  BuildContext context, {
  required String title,
  required String helper,
  required int attemptsLeft,
}) {
  return showDialog<String>(
    context: context,
    builder: (context) => _PinDialog(title: title, helper: helper, attemptsLeft: attemptsLeft),
  );
}

class _PinDialog extends StatefulWidget {
  const _PinDialog({required this.title, required this.helper, required this.attemptsLeft});

  final String title;
  final String helper;
  final int attemptsLeft;

  @override
  State<_PinDialog> createState() => _PinDialogState();
}

class _PinDialogState extends State<_PinDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final error = SwitchValidators.pin(_controller.text);
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    Navigator.pop(context, _controller.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final locked = widget.attemptsLeft <= 0;
    return AlertDialog(
      title: Text(widget.title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.helper),
          const SizedBox(height: 12),
          if (locked)
            const Text(
              'Too many wrong attempts. Contact Switch support to continue.',
              style: TextStyle(color: SwitchBrand.danger, fontWeight: FontWeight.w600),
            )
          else ...[
            TextField(
              controller: _controller,
              autofocus: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 28, letterSpacing: 10, fontWeight: FontWeight.w800),
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(counterText: '', errorText: _error),
              onSubmitted: (_) => _submit(),
            ),
            Text(
              '${widget.attemptsLeft} attempt${widget.attemptsLeft == 1 ? '' : 's'} left',
              style: const TextStyle(color: SwitchBrand.muted, fontSize: 12),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        if (!locked) FilledButton(onPressed: _submit, child: const Text('Verify')),
      ],
    );
  }
}

class ReasonResult {
  const ReasonResult({required this.reason, required this.note, this.evidenceRequired = false});

  final String reason;
  final String note;
  final bool evidenceRequired;
}

Future<ReasonResult?> showFailDeliverySheet(BuildContext context, {required List<LabeledCode> reasons}) {
  return showModalBottomSheet<ReasonResult>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => _ReasonSheet(
      title: 'Why did the delivery fail?',
      description: 'The parcel will be returned to the seller. Some reasons need a photo as evidence.',
      reasons: reasons,
      confirmLabel: 'Report failed delivery',
      showsEvidence: true,
    ),
  );
}

Future<ReasonResult?> showReleaseSheet(BuildContext context, {required List<LabeledCode> reasons}) {
  return showModalBottomSheet<ReasonResult>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => _ReasonSheet(
      title: 'Hand back this job?',
      description: 'Only do this if you truly cannot continue. Handing back jobs lowers your completion rate.',
      reasons: reasons,
      confirmLabel: 'Hand back job',
      showsEvidence: false,
    ),
  );
}

class _ReasonSheet extends StatefulWidget {
  const _ReasonSheet({
    required this.title,
    required this.description,
    required this.reasons,
    required this.confirmLabel,
    required this.showsEvidence,
  });

  final String title;
  final String description;
  final List<LabeledCode> reasons;
  final String confirmLabel;
  final bool showsEvidence;

  @override
  State<_ReasonSheet> createState() => _ReasonSheetState();
}

class _ReasonSheetState extends State<_ReasonSheet> {
  final _note = TextEditingController();
  LabeledCode? _selected;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _confirm() {
    final selected = _selected;
    if (selected == null) {
      setState(() => _error = 'Choose a reason.');
      return;
    }
    if (selected.code == 'OTHER' && _note.text.trim().isEmpty) {
      setState(() => _error = 'Describe what happened.');
      return;
    }
    Navigator.pop(
      context,
      ReasonResult(
        reason: selected.code,
        note: _note.text.trim(),
        evidenceRequired: widget.showsEvidence && selected.flag,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(widget.description, style: const TextStyle(color: SwitchBrand.muted)),
            const SizedBox(height: 8),
            if (widget.reasons.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Reasons could not be loaded. Check your connection and try again.'),
              ),
            RadioGroup<String>(
              groupValue: _selected?.code,
              onChanged: (code) => setState(() {
                _selected = widget.reasons.firstWhere((reason) => reason.code == code);
                _error = null;
              }),
              child: Column(
                children: [
                  for (final reason in widget.reasons)
                    RadioListTile<String>(
                      value: reason.code,
                      contentPadding: EdgeInsets.zero,
                      title: Text(reason.label),
                      subtitle: widget.showsEvidence && reason.flag ? const Text('Photo evidence required') : null,
                    ),
                ],
              ),
            ),
            TextField(
              controller: _note,
              maxLength: 300,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Details (required for "Other")'),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(_error!, style: const TextStyle(color: SwitchBrand.danger)),
              ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: SwitchBrand.danger, minimumSize: const Size.fromHeight(50)),
              onPressed: widget.reasons.isEmpty ? null : _confirm,
              child: Text(
                widget.showsEvidence && (_selected?.flag ?? false) ? 'Take photo & report' : widget.confirmLabel,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
