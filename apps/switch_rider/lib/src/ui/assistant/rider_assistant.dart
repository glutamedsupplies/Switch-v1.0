import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_core/switch_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../common.dart';
import '../earnings/cash_wallet_screen.dart';
import '../jobs/job_screen.dart';

typedef Json = Map<String, dynamic>;

class RiderAssistantEntry {
  const RiderAssistantEntry({required this.fromRider, required this.text, this.blocks = const []});

  final bool fromRider;
  final String text;
  final List<Json> blocks;
}

/// Conversation state for "Switch Rider AI". Every step it offers is a
/// confirmation the rider taps; the backend validates it against the job.
class RiderAssistantController extends ChangeNotifier {
  RiderAssistantController({required this.client, required this.onRiderRefresh});

  final SwitchApiClient client;
  final VoidCallback onRiderRefresh;

  static const _base = '/api/rider/assistant';

  final List<RiderAssistantEntry> entries = <RiderAssistantEntry>[];
  final Set<String> usedTokens = <String>{};
  List<String> suggestions = const <String>[];
  bool busy = false;
  bool loaded = false;
  bool enabled = true;
  String notice = '';

  Future<void> ensureLoaded() async {
    if (loaded || busy) return;
    busy = true;
    notifyListeners();
    try {
      final data = await client.getJson('$_base/session');
      enabled = data['enabled'] != false;
      notice = enabled ? '' : '${data['reason'] ?? 'The assistant is turned off right now.'}';
      entries.clear();
      final history = data['messages'];
      if (history is List && history.isNotEmpty) {
        for (final raw in history.whereType<Map>()) {
          entries.add(RiderAssistantEntry(
            fromRider: raw['author'] == 'user',
            text: '${raw['text'] ?? ''}',
            blocks: _blocks(raw['blocks']),
          ));
        }
      } else if (enabled) {
        entries.add(RiderAssistantEntry(fromRider: false, text: '${data['greeting'] ?? "Hi! I'm Switch Rider AI."}'));
      }
      suggestions = _strings(data['suggestions']);
      loaded = true;
    } on SwitchApiException catch (error) {
      if (error.code == 'AI_ASSISTANT_DISABLED') enabled = false;
      notice = error.message;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> send(String text) async {
    final message = text.trim();
    if (message.isEmpty || busy || !enabled) return;
    entries.add(RiderAssistantEntry(fromRider: true, text: message.length > 1000 ? message.substring(0, 1000) : message));
    await _run(() => client.postJson('$_base/chat', {'message': message, 'context': {'page': 'rider'}}));
  }

  Future<void> runTool(String tool, Json args) =>
      _run(() => client.postJson('$_base/actions', {'tool': tool, 'args': args, 'context': {'page': 'rider'}}));

  Future<void> confirm(String token, {Map<String, String>? inputs, bool cancel = false}) {
    usedTokens.add(token);
    return _run(() => client.postJson('$_base/confirm', {'token': token, 'inputs': ?inputs, 'cancel': cancel}));
  }

  Future<void> reset() async {
    if (busy) return;
    try {
      await client.deleteJson('$_base/session');
    } on SwitchApiException {
      // Starting fresh locally is still fine.
    }
    entries.clear();
    usedTokens.clear();
    suggestions = const <String>[];
    loaded = false;
    await ensureLoaded();
  }

  Future<void> _run(Future<Json> Function() request) async {
    if (busy) return;
    busy = true;
    notifyListeners();
    try {
      final data = await request();
      entries.add(RiderAssistantEntry(fromRider: false, text: '${data['message'] ?? ''}', blocks: _blocks(data['blocks'])));
      final next = _strings(data['suggestions']);
      if (next.isNotEmpty) suggestions = next;
      final effects = data['clientEffects'];
      if (effects is Map && effects['riderRefresh'] == true) onRiderRefresh();
    } on SwitchApiException catch (error) {
      entries.add(RiderAssistantEntry(fromRider: false, text: '', blocks: [
        {'type': 'notice', 'tone': 'error', 'text': error.message},
      ]));
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  static List<Json> _blocks(Object? raw) =>
      raw is List ? raw.whereType<Map>().map((b) => Map<String, dynamic>.from(b)).toList(growable: false) : const <Json>[];

  static List<String> _strings(Object? raw) =>
      raw is List ? raw.map((e) => '$e').where((e) => e.isNotEmpty).toList(growable: false) : const <String>[];
}

Future<void> openRiderAssistant(BuildContext context, RiderAssistantController controller) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: SwitchBrand.surface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
    clipBehavior: Clip.antiAlias,
    builder: (sheetContext) => FractionallySizedBox(
      heightFactor: 0.9,
      child: _RiderAssistantPanel(controller: controller),
    ),
  );
}

class _RiderAssistantPanel extends StatefulWidget {
  const _RiderAssistantPanel({required this.controller});

  final RiderAssistantController controller;

  @override
  State<_RiderAssistantPanel> createState() => _RiderAssistantPanelState();
}

class _RiderAssistantPanelState extends State<_RiderAssistantPanel> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();
  int _lastCount = 0;

  RiderAssistantController get _c => widget.controller;

  @override
  void initState() {
    super.initState();
    _c.addListener(_onChanged);
    unawaited(_c.ensureLoaded());
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToEnd());
  }

  @override
  void dispose() {
    _c.removeListener(_onChanged);
    _input.dispose();
    _scroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged() {
    if (!mounted) return;
    setState(() {});
    if (_c.entries.length != _lastCount) {
      _lastCount = _c.entries.length;
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToEnd());
    }
  }

  void _scrollToEnd() {
    if (_scroll.hasClients) {
      _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 240), curve: Curves.easeOut);
    }
  }

  void _submit([String? text]) {
    final value = (text ?? _input.text).trim();
    if (value.isEmpty) return;
    _input.clear();
    unawaited(_c.send(value));
  }

  Future<void> _handle(Json action) async {
    if (_c.busy) return;
    switch ('${action['kind'] ?? ''}') {
      case 'tool':
        final args = action['args'];
        await _c.runTool('${action['tool'] ?? ''}', args is Map ? Map<String, dynamic>.from(args) : <String, dynamic>{});
      case 'prompt':
        final text = '${action['text'] ?? action['label'] ?? ''}';
        if (text.endsWith(' ') || text.endsWith(':')) {
          _input.text = text;
          _input.selection = TextSelection.collapsed(offset: text.length);
          _focus.requestFocus();
        } else {
          _submit(text);
        }
      case 'confirm':
        final token = '${action['token'] ?? ''}';
        final inputs = action['inputs'];
        if (inputs is List && inputs.isNotEmpty) {
          final values = await _askInputs('${action['label'] ?? 'Confirm'}', inputs.whereType<Map>().toList());
          if (values == null) return;
          await _c.confirm(token, inputs: values);
        } else {
          await _c.confirm(token);
        }
      case 'cancel':
        await _c.confirm('${action['token'] ?? ''}', cancel: true);
      case 'open_url':
        final uri = Uri.tryParse('${action['url'] ?? ''}');
        if (uri != null && uri.scheme == 'https') {
          final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (!ok && mounted) context.showMessage('Unable to open maps.', error: true);
        }
      case 'call':
        await callNumber(context, '${action['phone'] ?? ''}');
      case 'navigate':
        final target = '${action['target'] ?? ''}';
        final navigator = Navigator.of(context);
        final Widget? screen = switch (target) {
          'rider_job' when '${action['deliveryId'] ?? ''}'.isNotEmpty => JobScreen(jobId: '${action['deliveryId']}'),
          'rider_wallet' => const CashWalletScreen(),
          _ => null,
        };
        if (screen == null) return;
        navigator.pop();
        await navigator.push(MaterialPageRoute<void>(builder: (_) => screen));
    }
  }

  Future<Map<String, String>?> _askInputs(String label, List<Map> inputs) {
    return showDialog<Map<String, String>>(
      context: context,
      builder: (_) => _InputsDialog(label: label, inputs: inputs),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          color: SwitchBrand.ink,
          padding: const EdgeInsets.fromLTRB(16, 12, 6, 12),
          child: Row(
            children: [
              const CircleAvatar(
                radius: 17,
                backgroundColor: SwitchBrand.teal,
                child: Icon(Icons.auto_awesome, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Switch Rider AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                    Text('Live from your jobs · you confirm every step',
                        style: TextStyle(color: Colors.white60, fontSize: 12)),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'New chat',
                onPressed: _c.busy ? null : () => unawaited(_c.reset()),
                icon: const Icon(Icons.refresh, color: Colors.white70),
              ),
              IconButton(
                tooltip: 'Close',
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.close, color: Colors.white),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(12, 14, 12, 8),
            children: [
              if (_c.notice.isNotEmpty) _Notice(tone: 'warning', text: _c.notice),
              for (final entry in _c.entries) _Entry(entry: entry, usedTokens: _c.usedTokens, onAction: _handle),
              if (_c.busy)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4)),
                  ),
                ),
            ],
          ),
        ),
        if (_c.suggestions.isNotEmpty)
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              itemCount: _c.suggestions.length.clamp(0, 6),
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, index) => ActionChip(
                label: Text(_c.suggestions[index]),
                onPressed: _c.busy ? null : () => _submit(_c.suggestions[index]),
              ),
            ),
          ),
        Padding(
          padding: EdgeInsets.fromLTRB(12, 0, 12, 10 + MediaQuery.viewInsetsOf(context).bottom),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _input,
                  focusNode: _focus,
                  enabled: _c.enabled,
                  minLines: 1,
                  maxLines: 3,
                  maxLength: 1000,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _submit(),
                  decoration: const InputDecoration(
                    hintText: 'e.g. "Nasa pickup na ako" or "Customer not answering"',
                    counterText: '',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                tooltip: 'Send',
                onPressed: _c.busy || !_c.enabled ? null : _submit,
                icon: const Icon(Icons.send),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Collects PINs for a confirmation. Values go only to `/confirm`, never to chat.
class _InputsDialog extends StatefulWidget {
  const _InputsDialog({required this.label, required this.inputs});

  final String label;
  final List<Map> inputs;

  @override
  State<_InputsDialog> createState() => _InputsDialogState();
}

class _InputsDialogState extends State<_InputsDialog> {
  final _formKey = GlobalKey<FormState>();
  late final List<TextEditingController> _controllers = [for (final _ in widget.inputs) TextEditingController()];

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inputs = widget.inputs;
    return AlertDialog(
      title: Text(widget.label),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < inputs.length; i++)
              TextFormField(
                controller: _controllers[i],
                autofocus: i == 0,
                obscureText: inputs[i]['type'] == 'pin',
                keyboardType: inputs[i]['type'] == 'pin' ? TextInputType.number : TextInputType.text,
                inputFormatters: inputs[i]['type'] == 'pin'
                    ? [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(8)]
                    : null,
                decoration: InputDecoration(labelText: '${inputs[i]['label'] ?? inputs[i]['name']}'),
                validator: (value) => inputs[i]['required'] == true && (value ?? '').trim().isEmpty ? 'Required' : null,
              ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            if (!(_formKey.currentState?.validate() ?? false)) return;
            Navigator.of(context).pop({
              for (var i = 0; i < inputs.length; i++) '${inputs[i]['name']}': _controllers[i].text.trim(),
            });
          },
          child: const Text('Confirm'),
        ),
      ],
    );
  }
}

typedef _ActionHandler = Future<void> Function(Json action);

List<Json> _maps(Object? raw) =>
    raw is List ? raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList(growable: false) : const <Json>[];

class _Entry extends StatelessWidget {
  const _Entry({required this.entry, required this.usedTokens, required this.onAction});

  final RiderAssistantEntry entry;
  final Set<String> usedTokens;
  final _ActionHandler onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: entry.fromRider ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (entry.text.isNotEmpty)
            Container(
              constraints: const BoxConstraints(maxWidth: 330),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: entry.fromRider ? SwitchBrand.teal : Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(entry.text, style: TextStyle(color: entry.fromRider ? Colors.white : SwitchBrand.ink, height: 1.4)),
            ),
          for (final block in entry.blocks)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: _Block(block: block, usedTokens: usedTokens, onAction: onAction),
            ),
        ],
      ),
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({required this.block, required this.usedTokens, required this.onAction});

  final Json block;
  final Set<String> usedTokens;
  final _ActionHandler onAction;

  Widget _actions(Object? raw) => _Actions(actions: _maps(raw), usedTokens: usedTokens, onAction: onAction);

  List<Widget> _rows(Object? raw) => [
        for (final row in _maps(raw))
          if ('${row['value'] ?? ''}'.isNotEmpty) InfoRow('${row['label'] ?? ''}', '${row['value']}', emphasize: row['emphasis'] == true),
      ];

  @override
  Widget build(BuildContext context) {
    final b = block;
    switch (b['type']) {
      case 'notice':
        return _Notice(tone: '${b['tone'] ?? 'info'}', text: '${b['text'] ?? ''}', actions: _actions(b['actions']));
      case 'delivery_card':
        final pickup = Map<String, dynamic>.from(b['pickup'] as Map? ?? const {});
        final dropoff = Map<String, dynamic>.from(b['dropoff'] as Map? ?? const {});
        final payment = Map<String, dynamic>.from(b['payment'] as Map? ?? const {});
        String place(Json point) => [point['name'], point['address'] ?? point['area']]
            .where((v) => v != null && '$v'.isNotEmpty)
            .join(' · ');
        final isCod = payment['method'] == 'COD';
        return _Card(
          title: '${b['code'] ?? 'Delivery'}',
          trailing: StatusChip('${b['statusLabel'] ?? ''}', color: b['variant'] == 'offer' ? SwitchBrand.warning : SwitchBrand.teal),
          children: [
            if (place(pickup).isNotEmpty) InfoRow('Pickup', place(pickup)),
            if (place(dropoff).isNotEmpty) InfoRow('Drop-off', place(dropoff)),
            if (b['distanceKm'] is num) InfoRow('Distance', formatKm((b['distanceKm'] as num).toDouble())),
            if (isCod)
              InfoRow(
                'Collect (COD)',
                '${formatPeso(readAmount(payment['codAmount']))}${payment['codCollected'] == true ? ' ✓' : ''}',
                emphasize: true,
              ),
            if (readAmount(b['earning']) > 0) InfoRow('Your earning', formatPeso(readAmount(b['earning']))),
            if ('${b['nextStep'] ?? ''}'.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('${b['nextStep']}', style: const TextStyle(color: SwitchBrand.muted, fontSize: 13)),
              ),
            const SizedBox(height: 10),
            _actions(b['actions']),
          ],
        );
      case 'earnings_summary':
        return _Card(
          title: 'Earnings',
          children: [
            ..._rows(b['earnings']),
            ..._rows(b['items']),
            if (_maps(b['cash']).isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.only(top: 10, bottom: 2),
                child: Text('COD cash (not your pay)', style: TextStyle(color: SwitchBrand.muted, fontWeight: FontWeight.w700, fontSize: 12)),
              ),
              ..._rows(b['cash']),
            ],
            if ('${b['footnote'] ?? ''}'.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('${b['footnote']}', style: const TextStyle(color: SwitchBrand.muted, fontSize: 12)),
              ),
            const SizedBox(height: 10),
            _actions(b['actions']),
          ],
        );
      case 'confirmation':
        final token = '${b['token'] ?? ''}';
        final actions = _maps(b['actions']).isNotEmpty
            ? _maps(b['actions'])
            : token.isEmpty
                ? const <Json>[]
                : [
                    {'label': b['confirmLabel'] ?? 'Confirm', 'kind': 'confirm', 'token': token, 'expiresAt': b['expiresAt'], 'style': 'primary', 'inputs': b['inputs']},
                    {'label': b['cancelLabel'] ?? 'Cancel', 'kind': 'cancel', 'token': token, 'expiresAt': b['expiresAt'], 'style': 'ghost'},
                  ];
        return _Card(
          title: '${b['title'] ?? 'Please confirm'}',
          children: [
            ..._rows(b['lines']),
            if ('${b['warning'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: _Notice(tone: 'warning', text: '${b['warning']}')),
            const SizedBox(height: 10),
            _Actions(actions: actions, usedTokens: usedTokens, onAction: onAction),
          ],
        );
      case 'inventory_table':
        final columns = (b['columns'] as List? ?? const []).map((c) => '$c').toList();
        final rows = (b['rows'] as List? ?? const []).map((r) => r is List ? r : (r is Map ? (r['cells'] as List? ?? const []) : const [])).toList();
        return _Card(
          title: '${b['title'] ?? ''}',
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                horizontalMargin: 0,
                columnSpacing: 16,
                headingRowHeight: 34,
                dataRowMinHeight: 32,
                dataRowMaxHeight: 44,
                columns: [for (final c in columns) DataColumn(label: Text(c))],
                rows: [
                  for (final r in rows)
                    DataRow(cells: [for (var i = 0; i < columns.length; i++) DataCell(Text(i < r.length ? '${r[i]}' : ''))]),
                ],
              ),
            ),
          ],
        );
      case 'choice_list':
        return _Card(
          title: '${b['title'] ?? ''}',
          children: [
            for (final option in _maps(b['options']))
              Builder(builder: (context) {
                final action = option['kind'] != null ? option : Map<String, dynamic>.from(option['action'] as Map? ?? const {});
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: Text('${option['label'] ?? action['label'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: action.isEmpty ? null : () => onAction(action),
                );
              }),
            _actions(b['actions']),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.title, required this.children, this.trailing});

  final String title;
  final List<Widget> children;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title.isNotEmpty || trailing != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800))),
                  ?trailing,
                ],
              ),
            ),
          ...children,
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.tone, required this.text, this.actions});

  final String tone;
  final String text;
  final Widget? actions;

  @override
  Widget build(BuildContext context) {
    final color = switch (tone) {
      'warning' => SwitchBrand.warning,
      'error' => SwitchBrand.danger,
      'success' => SwitchBrand.success,
      _ => SwitchBrand.teal,
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(text, style: const TextStyle(height: 1.4)),
          if (actions != null) Padding(padding: const EdgeInsets.only(top: 8), child: actions),
        ],
      ),
    );
  }
}

class _Actions extends StatelessWidget {
  const _Actions({required this.actions, required this.usedTokens, required this.onAction});

  final List<Json> actions;
  final Set<String> usedTokens;
  final _ActionHandler onAction;

  @override
  Widget build(BuildContext context) {
    final list = actions.where((a) => '${a['label'] ?? ''}'.isNotEmpty).toList(growable: false);
    if (list.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final action in list)
          Builder(builder: (context) {
            final kind = '${action['kind'] ?? ''}';
            final token = '${action['token'] ?? ''}';
            final expiresAt = DateTime.tryParse('${action['expiresAt'] ?? ''}');
            final expired = (kind == 'confirm' || kind == 'cancel') && expiresAt != null && expiresAt.isBefore(DateTime.now());
            final disabled = expired || (token.isNotEmpty && usedTokens.contains(token));
            final label = expired ? '${action['label']} (expired)' : '${action['label']}';
            final onPressed = disabled ? null : () => onAction(action);
            final icon = switch (kind) {
              'call' => Icons.call,
              'open_url' => Icons.navigation_outlined,
              _ => null,
            };
            final child = icon == null
                ? Text(label)
                : Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 18), const SizedBox(width: 6), Text(label)]);
            return switch ('${action['style'] ?? 'secondary'}') {
              'primary' => FilledButton(onPressed: onPressed, child: child),
              'danger' => FilledButton(style: FilledButton.styleFrom(backgroundColor: SwitchBrand.danger), onPressed: onPressed, child: child),
              'ghost' => TextButton(onPressed: onPressed, child: child),
              _ => OutlinedButton(onPressed: onPressed, child: child),
            };
          }),
      ],
    );
  }
}
