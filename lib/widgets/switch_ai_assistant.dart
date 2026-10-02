import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:switch_app/cart.dart';
import 'package:switch_app/models/product.dart';
import 'package:switch_app/order_store.dart';
import 'package:switch_app/product_details.dart';
import 'package:switch_app/select_address_page.dart';
import 'package:switch_app/services/ai_assistant_transport.dart';
import 'package:switch_app/services/product_repository.dart';
import 'package:switch_app/theme/app_snack_bar.dart';
import 'package:switch_app/utils/auth_session.dart';
import 'package:switch_app/utils/currency_format.dart';
import 'package:url_launcher/url_launcher.dart';

const _assistantName = 'Switch Shopping AI';
const _ink = Color(0xFF111827);
const _paper = Color(0xFFFBFAF7);
const _line = Color(0x17111827);
const _muted = Color(0xFF6B7587);
const _warn = Color(0xFFB7791F);
const _bad = Color(0xFFD93A3A);
const _good = Color(0xFF0F8A5F);
const _sidePanelBreakpoint = 900.0;

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

class AiChatEntry {
  const AiChatEntry({required this.fromUser, required this.text, this.blocks = const []});

  final bool fromUser;
  final String text;
  final List<Map<String, dynamic>> blocks;
}

/// Holds the buyer's assistant conversation so it survives closing the panel.
class SwitchAiAssistantController extends ChangeNotifier {
  SwitchAiAssistantController._() {
    AuthSession.accountRevision.addListener(_handleAccountChanged);
  }

  static final SwitchAiAssistantController instance = SwitchAiAssistantController._();

  AiAssistantTransport _transport = createAiAssistantTransport();

  @visibleForTesting
  set debugTransport(AiAssistantTransport transport) => _transport = transport;
  final List<AiChatEntry> entries = <AiChatEntry>[];
  final Set<String> usedTokens = <String>{};
  List<String> suggestions = const <String>[];
  bool busy = false;
  bool loaded = false;
  bool enabled = true;
  String notice = '';
  String _cartSignature = '';
  String page = 'shop';
  String productId = '';

  void _handleAccountChanged() {
    entries.clear();
    usedTokens.clear();
    suggestions = const <String>[];
    loaded = false;
    enabled = true;
    notice = '';
    _cartSignature = '';
    notifyListeners();
  }

  Map<String, dynamic> get _context => <String, dynamic>{
        'page': page,
        if (productId.isNotEmpty) 'productId': productId,
      };

  Future<Map<String, dynamic>> _call(String method, String path, [Map<String, dynamic>? body]) async {
    final result = await _transport.send(method, '/api/assistant$path', body: body);
    if (result.ok) return result.body;
    final message = result.body['message']?.toString().trim() ?? '';
    final code = result.body['code']?.toString() ?? '';
    if (result.status == 403 && code == 'AI_ASSISTANT_DISABLED') {
      enabled = false;
    }
    throw AiAssistantTransportException(
      result.status == 401
          ? 'Please sign in again to use the assistant.'
          : message.isNotEmpty
              ? message
              : 'Something went wrong. Please try again.',
    );
  }

  List<Map<String, dynamic>> _items() {
    if (CartStore.instance.activePlatformId != 'shop') return const [];
    return CartStore.instance.cartItemsNotifier.value
        .map((item) => <String, dynamic>{
              'productId': item.productId,
              'variantId': item.variantId,
              'quantity': item.quantity,
            })
        .toList(growable: false);
  }

  /// Pushes the app cart to the assistant so it reasons over the same items.
  Future<void> _syncCart() async {
    await CartStore.instance.ensureLoaded();
    final items = _items();
    final signature = items.map((i) => '${i['productId']}:${i['variantId']}:${i['quantity']}').join('|');
    if (signature == _cartSignature) return;
    try {
      await _call('POST', '/cart/sync', <String, dynamic>{'items': items});
      _cartSignature = signature;
    } catch (_) {
      // The assistant still works with its last known cart.
    }
  }

  Future<void> ensureLoaded() async {
    if (loaded || busy) return;
    busy = true;
    notifyListeners();
    try {
      await _syncCart();
      final data = await _call('GET', '/session?page=${Uri.encodeQueryComponent(page)}&productId=${Uri.encodeQueryComponent(productId)}');
      enabled = data['enabled'] != false;
      notice = enabled ? '' : (data['reason']?.toString() ?? 'The assistant is turned off right now.');
      entries.clear();
      final history = data['messages'];
      if (history is List && history.isNotEmpty) {
        for (final raw in history.whereType<Map>()) {
          entries.add(AiChatEntry(
            fromUser: raw['author'] == 'user',
            text: raw['text']?.toString() ?? '',
            blocks: _blocks(raw['blocks']),
          ));
        }
      } else if (enabled) {
        entries.add(AiChatEntry(fromUser: false, text: data['greeting']?.toString() ?? "Hi! I'm $_assistantName."));
      }
      suggestions = _strings(data['suggestions']);
      loaded = true;
    } on AiAssistantTransportException catch (error) {
      notice = error.message;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> send(String text) async {
    final message = text.trim();
    if (message.isEmpty || busy || !enabled) return;
    entries.add(AiChatEntry(fromUser: true, text: message.length > 1000 ? message.substring(0, 1000) : message));
    await _run(() async {
      await _syncCart();
      return _call('POST', '/chat', <String, dynamic>{'message': message, 'context': _context});
    });
  }

  Future<void> runTool(String tool, Map<String, dynamic> args) {
    return _run(() async {
      await _syncCart();
      return _call('POST', '/actions', <String, dynamic>{'tool': tool, 'args': args, 'context': _context});
    });
  }

  Future<void> confirm(String token, {Map<String, String>? inputs, bool cancel = false}) {
    usedTokens.add(token);
    return _run(() => _call('POST', '/confirm', <String, dynamic>{
          'token': token,
          'inputs': ?inputs,
          'cancel': cancel,
        }));
  }

  Future<void> reset() async {
    if (busy) return;
    try {
      await _call('DELETE', '/session');
    } catch (_) {}
    _handleAccountChanged();
    await ensureLoaded();
  }

  Future<void> _run(Future<Map<String, dynamic>> Function() request) async {
    if (busy) return;
    busy = true;
    notifyListeners();
    try {
      final data = await request();
      entries.add(AiChatEntry(fromUser: false, text: data['message']?.toString() ?? '', blocks: _blocks(data['blocks'])));
      final nextSuggestions = _strings(data['suggestions']);
      if (nextSuggestions.isNotEmpty) suggestions = nextSuggestions;
      final effects = data['clientEffects'];
      if (effects is Map) unawaited(_applyEffects(Map<String, dynamic>.from(effects)));
    } on AiAssistantTransportException catch (error) {
      entries.add(AiChatEntry(fromUser: false, text: '', blocks: [
        <String, dynamic>{'type': 'notice', 'tone': 'error', 'text': error.message},
      ]));
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  /// Mirrors assistant cart changes into the app cart and refreshes orders.
  Future<void> _applyEffects(Map<String, dynamic> effects) async {
    final ops = effects['cart'];
    if (ops is List && ops.isNotEmpty) {
      try {
        final products = await createProductRepository().fetchProducts();
        final byId = <String, Product>{for (final p in products) p.id.trim(): p};
        for (final raw in ops.whereType<Map>()) {
          final op = raw['op']?.toString() ?? '';
          final opProductId = raw['productId']?.toString() ?? '';
          final variantId = raw['variantId']?.toString() ?? '';
          final quantity = (raw['quantity'] as num?)?.toInt() ?? 1;
          final existing = CartStore.instance.cartItemsNotifier.value
              .where((item) => item.productId == opProductId && item.variantId == variantId)
              .toList(growable: false);
          if (op == 'add') {
            final product = byId[opProductId];
            if (product == null) continue;
            await CartStore.instance.addItem(
              product,
              quantity: quantity,
              selectedVariant: variantId.isEmpty ? null : findProductVariantById(product, variantId),
              catalogProducts: products,
              platformId: 'shop',
            );
          } else if (op == 'remove') {
            for (final item in existing) {
              await CartStore.instance.removeItem(item.entryKey);
            }
          } else if (op == 'set' && existing.isNotEmpty) {
            await CartStore.instance.updateQuantity(existing.first.entryKey, quantity);
          }
        }
        _cartSignature = _items().map((i) => '${i['productId']}:${i['variantId']}:${i['quantity']}').join('|');
      } catch (_) {
        // The assistant's own cart stays correct; the app cart catches up on next sync.
      }
    }
    if (effects['ordersChanged'] == true) {
      unawaited(OrderStore.instance.refreshFromRemote().catchError((_) {}));
    }
  }

  static List<Map<String, dynamic>> _blocks(Object? raw) => raw is List
      ? raw.whereType<Map>().map((b) => Map<String, dynamic>.from(b)).toList(growable: false)
      : const <Map<String, dynamic>>[];

  static List<String> _strings(Object? raw) =>
      raw is List ? raw.map((e) => e.toString()).where((e) => e.isNotEmpty).toList(growable: false) : const <String>[];
}

// ---------------------------------------------------------------------------
// Launcher
// ---------------------------------------------------------------------------

OverlayEntry? _sidePanelEntry;

/// Opens the assistant: a side panel on wide screens (page stays usable),
/// a bottom sheet on phones.
Future<void> openSwitchAiAssistant(
  BuildContext context, {
  String page = 'shop',
  String productId = '',
  VoidCallback? onOpenProfile,
}) async {
  final controller = SwitchAiAssistantController.instance
    ..page = page
    ..productId = productId;
  if (MediaQuery.sizeOf(context).width >= _sidePanelBreakpoint) {
    if (_sidePanelEntry != null) {
      _closeSidePanel();
      return;
    }
    final overlay = Overlay.of(context, rootOverlay: true);
    _sidePanelEntry = OverlayEntry(
      builder: (overlayContext) => Positioned(
        top: 12,
        right: 12,
        bottom: 12,
        width: 420,
        child: Material(
          elevation: 18,
          color: _paper,
          borderRadius: BorderRadius.circular(22),
          clipBehavior: Clip.antiAlias,
          child: _AssistantPanel(controller: controller, onClose: _closeSidePanel, onOpenProfile: onOpenProfile),
        ),
      ),
    );
    overlay.insert(_sidePanelEntry!);
    return;
  }
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: _paper,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
    clipBehavior: Clip.antiAlias,
    builder: (sheetContext) => FractionallySizedBox(
      heightFactor: 0.88,
      child: _AssistantPanel(
        controller: controller,
        onClose: () => Navigator.of(sheetContext).maybePop(),
        onOpenProfile: onOpenProfile,
      ),
    ),
  );
}

void _closeSidePanel() {
  _sidePanelEntry?.remove();
  _sidePanelEntry = null;
}

/// Floating "Ask Switch AI" button. Hidden when [visible] is false (guests).
class SwitchAiAssistantButton extends StatelessWidget {
  const SwitchAiAssistantButton({super.key, required this.visible, this.page = 'shop', this.onOpenProfile});

  final bool visible;
  final String page;
  final VoidCallback? onOpenProfile;

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= _sidePanelBreakpoint;
    return AnimatedScale(
      scale: visible ? 1 : 0,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutBack,
      child: IgnorePointer(
        ignoring: !visible,
        child: Semantics(
          button: true,
          label: 'Open $_assistantName',
          child: Material(
            color: _ink,
            elevation: 10,
            shadowColor: Colors.black45,
            shape: const StadiumBorder(),
            child: InkWell(
              customBorder: const StadiumBorder(),
              onTap: () => openSwitchAiAssistant(context, page: page, onOpenProfile: onOpenProfile),
              child: Padding(
                padding: EdgeInsets.fromLTRB(8, 8, wide ? 18 : 8, 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const _Orb(size: 36),
                    if (wide) ...[
                      const SizedBox(width: 10),
                      const Text('Ask Switch AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Orb extends StatelessWidget {
  const _Orb({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: SweepGradient(colors: [accent, const Color(0xFF22C1A4), const Color(0xFFF5B642), accent]),
      ),
      alignment: Alignment.center,
      child: Container(
        width: size * 0.42,
        height: size * 0.42,
        decoration: BoxDecoration(shape: BoxShape.circle, color: _ink.withValues(alpha: 0.55)),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

class _AssistantPanel extends StatefulWidget {
  const _AssistantPanel({required this.controller, required this.onClose, this.onOpenProfile});

  final SwitchAiAssistantController controller;
  final VoidCallback onClose;
  final VoidCallback? onOpenProfile;

  @override
  State<_AssistantPanel> createState() => _AssistantPanelState();
}

class _AssistantPanelState extends State<_AssistantPanel> {
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final FocusNode _focus = FocusNode();
  int _lastCount = 0;

  SwitchAiAssistantController get _c => widget.controller;

  @override
  void initState() {
    super.initState();
    _c.addListener(_onChanged);
    unawaited(_c.ensureLoaded());
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 260), curve: Curves.easeOut);
        }
      });
    }
  }

  void _submit([String? text]) {
    final value = (text ?? _input.text).trim();
    if (value.isEmpty) return;
    _input.clear();
    unawaited(_c.send(value));
  }

  Future<void> _handleAction(Map<String, dynamic> action) async {
    if (_c.busy) return;
    final kind = action['kind']?.toString() ?? '';
    switch (kind) {
      case 'tool':
        final args = action['args'];
        await _c.runTool(action['tool']?.toString() ?? '', args is Map ? Map<String, dynamic>.from(args) : <String, dynamic>{});
      case 'prompt':
        final text = action['text']?.toString() ?? action['label']?.toString() ?? '';
        if (text.endsWith(' ') || text.endsWith(':')) {
          _input.text = text;
          _input.selection = TextSelection.collapsed(offset: text.length);
          _focus.requestFocus();
        } else {
          _submit(text);
        }
      case 'confirm':
        final token = action['token']?.toString() ?? '';
        final inputs = action['inputs'];
        if (inputs is List && inputs.isNotEmpty) {
          final values = await _askInputs(action['label']?.toString() ?? 'Confirm', inputs.whereType<Map>().toList());
          if (values == null) return;
          await _c.confirm(token, inputs: values);
        } else {
          await _c.confirm(token);
        }
      case 'cancel':
        await _c.confirm(action['token']?.toString() ?? '', cancel: true);
      case 'open_url':
        final uri = Uri.tryParse(action['url']?.toString() ?? '');
        if (uri != null && uri.scheme == 'https') {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      case 'call':
        final phone = (action['phone']?.toString() ?? '').replaceAll(RegExp(r'[^\d+]'), '');
        if (phone.isNotEmpty) await launchUrl(Uri(scheme: 'tel', path: phone));
      case 'navigate':
        await _navigate(action);
    }
  }

  Future<void> _navigate(Map<String, dynamic> action) async {
    final target = action['target']?.toString() ?? '';
    final navigatorContext = Navigator.of(context, rootNavigator: true).context;
    final primary = Theme.of(context).colorScheme.primary;
    widget.onClose();
    if (target == 'product') {
      final id = action['productId']?.toString() ?? '';
      try {
        final products = await createProductRepository().fetchProducts();
        final product = products.where((p) => p.id == id).firstOrNull;
        if (product != null && navigatorContext.mounted) {
          await openProductDetailsPage(navigatorContext, product, platformId: 'shop');
        }
      } catch (_) {
        if (navigatorContext.mounted) {
          AppSnackBar.showError(navigatorContext, message: 'Unable to open product details right now.');
        }
      }
    } else if (target == 'cart') {
      if (navigatorContext.mounted) await openCartPage(navigatorContext, platformId: 'shop');
    } else if (target == 'addresses') {
      if (navigatorContext.mounted) await openSelectAddressPage(navigatorContext, primaryColor: primary);
    } else if (target == 'profile') {
      widget.onOpenProfile?.call();
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
          color: _ink,
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
          child: Row(
            children: [
              const _Orb(size: 34),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_assistantName, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
                    SizedBox(height: 2),
                    Text('Live prices & stock from Switch', style: TextStyle(color: Colors.white60, fontSize: 12)),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'New chat',
                onPressed: _c.busy ? null : () => unawaited(_c.reset()),
                icon: const Icon(Icons.refresh_rounded, color: Colors.white70, size: 20),
              ),
              IconButton(
                tooltip: 'Close',
                onPressed: widget.onClose,
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 8),
            children: [
              if (_c.notice.isNotEmpty) _NoticeView(tone: 'warning', text: _c.notice),
              for (final entry in _c.entries) _EntryView(entry: entry, usedTokens: _c.usedTokens, onAction: _handleAction),
              if (_c.busy) const _TypingDots(),
            ],
          ),
        ),
        if (_c.suggestions.isNotEmpty)
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(14, 4, 14, 8),
              itemCount: _c.suggestions.length.clamp(0, 6),
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, index) => ActionChip(
                label: Text(_c.suggestions[index], style: const TextStyle(fontSize: 12.5)),
                backgroundColor: Colors.white,
                side: const BorderSide(color: _line),
                shape: const StadiumBorder(),
                onPressed: _c.busy ? null : () => _submit(_c.suggestions[index]),
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: _line),
            ),
            padding: const EdgeInsets.fromLTRB(14, 2, 6, 2),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    focusNode: _focus,
                    enabled: _c.enabled,
                    minLines: 1,
                    maxLines: 4,
                    maxLength: 1000,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(
                      hintText: 'Ask for products, your cart, or an order…',
                      border: InputBorder.none,
                      counterText: '',
                    ),
                  ),
                ),
                IconButton.filled(
                  tooltip: 'Send',
                  style: IconButton.styleFrom(backgroundColor: _ink),
                  onPressed: _c.busy || !_c.enabled ? null : _submit,
                  icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 4, 16, 10),
          child: Text(
            'Never share card numbers, CVV, OTPs or passwords here.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: _muted),
          ),
        ),
        SizedBox(height: MediaQuery.viewInsetsOf(context).bottom),
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
            Navigator.of(context).pop(<String, String>{
              for (var i = 0; i < inputs.length; i++) '${inputs[i]['name']}': _controllers[i].text.trim(),
            });
          },
          child: const Text('Confirm'),
        ),
      ],
    );
  }
}

class _TypingDots extends StatelessWidget {
  const _TypingDots();

  @override
  Widget build(BuildContext context) {
    return const Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: SizedBox(width: 48, height: 24, child: LinearProgressIndicator(minHeight: 3, color: _muted, backgroundColor: _line)),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Messages and blocks
// ---------------------------------------------------------------------------

typedef _ActionHandler = Future<void> Function(Map<String, dynamic> action);

String _peso(Object? value) {
  final amount = value is num ? value.toDouble() : double.tryParse('$value');
  return amount == null ? '' : formatPesoCurrency(amount);
}

List<Map<String, dynamic>> _maps(Object? raw) =>
    raw is List ? raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList(growable: false) : const [];

class _EntryView extends StatelessWidget {
  const _EntryView({required this.entry, required this.usedTokens, required this.onAction});

  final AiChatEntry entry;
  final Set<String> usedTokens;
  final _ActionHandler onAction;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: entry.fromUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (entry.text.isNotEmpty)
            Container(
              constraints: const BoxConstraints(maxWidth: 340),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: entry.fromUser ? accent : Colors.white,
                border: entry.fromUser ? null : Border.all(color: _line),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(entry.fromUser ? 16 : 4),
                  bottomRight: Radius.circular(entry.fromUser ? 4 : 16),
                ),
              ),
              child: Text(entry.text, style: TextStyle(color: entry.fromUser ? Colors.white : _ink, fontSize: 14, height: 1.45)),
            ),
          for (final block in entry.blocks)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: _BlockView(block: block, usedTokens: usedTokens, onAction: onAction),
            ),
        ],
      ),
    );
  }
}

class _BlockView extends StatelessWidget {
  const _BlockView({required this.block, required this.usedTokens, required this.onAction});

  final Map<String, dynamic> block;
  final Set<String> usedTokens;
  final _ActionHandler onAction;

  Widget _actions(Object? raw) => _ActionBar(actions: _maps(raw), usedTokens: usedTokens, onAction: onAction);

  @override
  Widget build(BuildContext context) {
    final b = block;
    switch (b['type']) {
      case 'notice':
        return _NoticeView(tone: b['tone']?.toString() ?? 'info', text: b['text']?.toString() ?? '', actions: _actions(b['actions']));
      case 'product_carousel':
        final products = _maps(b['products']);
        return _Card(
          title: b['title']?.toString() ?? 'Results',
          meta: b['total'] != null ? '${b['total']} found' : null,
          child: SizedBox(
            height: 250,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
              itemCount: products.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (_, i) => SizedBox(width: 176, child: _ProductTile(product: products[i], index: i, actions: _actions(products[i]['actions']))),
            ),
          ),
        );
      case 'product_card':
        final p = Map<String, dynamic>.from(b['product'] as Map? ?? const {});
        final variants = _maps(p['variants']);
        return _Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ProductHeadline(product: p),
                if ((p['description']?.toString() ?? '').isNotEmpty)
                  Padding(padding: const EdgeInsets.only(top: 8), child: Text(p['description'].toString(), style: const TextStyle(fontSize: 12.5, color: _muted, height: 1.45))),
                if (variants.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Wrap(spacing: 6, runSpacing: 6, children: [
                      for (final v in variants)
                        _Pill(text: (v['stock'] as num? ?? 0) <= 0 ? '${v['name']} · sold out' : '${v['name']}', tone: (v['stock'] as num? ?? 0) <= 0 ? 'bad' : 'plain'),
                    ]),
                  ),
                const SizedBox(height: 10),
                _actions(p['actions']),
              ],
            ),
          ),
        );
      case 'comparison':
        final products = _maps(b['products']);
        return _Card(
          title: 'Comparison',
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: DataTable(
              headingRowHeight: 36,
              dataRowMinHeight: 32,
              dataRowMaxHeight: 48,
              columnSpacing: 16,
              horizontalMargin: 0,
              columns: [const DataColumn(label: Text('')), for (final p in products) DataColumn(label: Text(p['name']?.toString() ?? ''))],
              rows: [
                for (final row in _maps(b['rows']))
                  DataRow(cells: [
                    DataCell(Text(row['label']?.toString() ?? '', style: const TextStyle(color: _muted))),
                    for (final value in (row['values'] as List? ?? const [])) DataCell(Text('$value')),
                  ]),
              ],
            ),
          ),
        );
      case 'cart_summary':
        return _Card(
          title: 'Your cart',
          meta: '${b['itemCount'] ?? 0} item(s)',
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final item in _maps(b['items']))
                  _ListRow(
                    title: '${item['name']}${(item['variantName'] ?? '').toString().isNotEmpty ? ' (${item['variantName']})' : ''}',
                    trailing: _peso(item['lineTotal']),
                    subtitle: '${item['quantity']} × ${_peso(item['unitPrice'])}${(item['seller'] ?? '').toString().isNotEmpty ? ' · ${item['seller']}' : ''}',
                    warning: item['issue']?.toString(),
                    actions: _actions(item['actions']),
                  ),
                _Rows(rows: [<String, dynamic>{'label': 'Subtotal', 'value': _peso(b['subtotal']), 'emphasis': true}]),
                const SizedBox(height: 10),
                _actions(b['actions']),
              ],
            ),
          ),
        );
      case 'checkout_summary':
        final t = Map<String, dynamic>.from(b['totals'] as Map? ?? const {});
        final payment = b['payment'] is Map ? Map<String, dynamic>.from(b['payment'] as Map) : null;
        final rows = <Map<String, dynamic>>[
          for (final item in _maps(b['items']))
            {'label': '${item['name']}${(item['variantName'] ?? '').toString().isNotEmpty ? ' (${item['variantName']})' : ''} × ${item['quantity']}', 'value': _peso(item['lineTotal'])},
          {'label': 'Subtotal', 'value': _peso(t['subtotal'])},
          if ((t['merchandiseDiscount'] as num? ?? 0) > 0) {'label': 'Voucher', 'value': '−${_peso(t['merchandiseDiscount'])}'},
          {'label': 'Shipping${b['delivery'] is Map ? ' (${(b['delivery'] as Map)['name']})' : ''}', 'value': (t['shippingFee'] as num? ?? 0) > 0 ? _peso(t['shippingFee']) : 'Free'},
          if ((t['shippingDiscount'] as num? ?? 0) > 0) {'label': 'Shipping discount', 'value': '−${_peso(t['shippingDiscount'])}'},
          {'label': 'Deliver to', 'value': b['address'] is Map ? (b['address'] as Map)['text']?.toString() ?? '' : 'Not set'},
          {'label': 'Payment', 'value': payment == null ? 'Not chosen' : '${payment['name']} · ${payment['modeLabel']}'},
          if (payment?['mode'] == 'cod') {'label': 'Pay now (deposit)', 'value': _peso(t['dueNow'])},
          {'label': 'Total', 'value': _peso(t['total']), 'emphasis': true},
        ];
        return _Card(
          title: 'Checkout review',
          meta: b['seller'] is Map ? (b['seller'] as Map)['name']?.toString() : null,
          receipt: true,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Rows(rows: rows),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final m in (b['missing'] as List? ?? const [])) _Pill(text: 'Needs $m', tone: 'warn'),
                  for (final w in (b['warnings'] as List? ?? const [])) _Pill(text: '$w', tone: 'warn'),
                  if (b['ready'] == true) const _Pill(text: 'Ready to place', tone: 'good'),
                ]),
                const SizedBox(height: 10),
                _actions(b['actions']),
              ],
            ),
          ),
        );
      case 'payment_options':
        return _Card(
          title: 'Payment method',
          meta: 'Secure payment page',
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final option in _maps(b['options']))
                  _ListRow(title: option['label']?.toString() ?? '', trailing: option['selected'] == true ? 'Selected' : '', actions: _actions(option['actions'])),
                for (final note in (b['notes'] as List? ?? const []))
                  Padding(padding: const EdgeInsets.only(top: 6), child: Text('$note', style: const TextStyle(fontSize: 11.5, color: _muted))),
              ],
            ),
          ),
        );
      case 'order_status':
        return _Card(
          title: 'Orders',
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Column(
              children: [
                for (final order in _maps(b['orders']))
                  _ListRow(
                    title: '#${order['reference']}',
                    trailing: order['stageLabel']?.toString() ?? '',
                    subtitle: [
                      _maps(order['items']).map((i) => '${i['name']} × ${i['quantity']}').join(', '),
                      [order['placedAt'], _peso(order['total']), order['paymentOption']].where((v) => v != null && '$v'.isNotEmpty).join(' · '),
                      if (order['tracking'] is Map && ((order['tracking'] as Map)['statusLabel'] ?? '').toString().isNotEmpty)
                        'Delivery: ${(order['tracking'] as Map)['statusLabel']}',
                    ].where((s) => s.isNotEmpty).join('\n'),
                    warning: (order['amountDue'] as num? ?? 0) > 0 ? '${_peso(order['amountDue'])} to pay' : null,
                    actions: _actions(order['actions']),
                  ),
              ],
            ),
          ),
        );
      case 'confirmation':
        final token = b['token']?.toString() ?? '';
        final actions = _maps(b['actions']).isNotEmpty
            ? _maps(b['actions'])
            : token.isEmpty
                ? const <Map<String, dynamic>>[]
                : [
                    {'label': b['confirmLabel'] ?? 'Confirm', 'kind': 'confirm', 'token': token, 'expiresAt': b['expiresAt'], 'style': 'primary', 'inputs': b['inputs']},
                    {'label': b['cancelLabel'] ?? 'Cancel', 'kind': 'cancel', 'token': token, 'expiresAt': b['expiresAt'], 'style': 'ghost'},
                  ];
        return _Card(
          title: b['title']?.toString() ?? 'Please confirm',
          meta: b['risk'] == 'high' ? 'Needs your tap' : null,
          receipt: true,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Rows(rows: _maps(b['lines'])),
                if ((b['warning']?.toString() ?? '').isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: _NoticeView(tone: 'warning', text: b['warning'].toString())),
                const SizedBox(height: 10),
                _ActionBar(actions: actions, usedTokens: usedTokens, onAction: onAction),
              ],
            ),
          ),
        );
      case 'payment_handoff':
        return _Card(
          title: 'Complete payment',
          meta: b['provider'] == 'paymongo' ? 'via PayMongo' : null,
          receipt: true,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("You'll finish on the secure payment page. Switch never asks for card numbers, CVV or OTPs in chat.", style: TextStyle(fontSize: 12, color: _muted)),
                const SizedBox(height: 10),
                _actions(b['actions']),
              ],
            ),
          ),
        );
      case 'choice_list':
        return _Card(
          title: b['title']?.toString(),
          child: Column(
            children: [
              for (final option in _maps(b['options']))
                Builder(builder: (context) {
                  final action = option['kind'] != null ? option : Map<String, dynamic>.from(option['action'] as Map? ?? const {});
                  return ListTile(
                    dense: true,
                    title: Text(option['label']?.toString() ?? action['label']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: (option['description']?.toString() ?? '').isEmpty ? null : Text(option['description'].toString()),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: action.isEmpty ? null : () => onAction(action),
                  );
                }),
              Padding(padding: const EdgeInsets.fromLTRB(14, 0, 14, 10), child: _actions(b['actions'])),
            ],
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

class _Card extends StatelessWidget {
  const _Card({this.title, this.meta, required this.child, this.receipt = false});

  final String? title;
  final String? meta;
  final Widget child;
  final bool receipt;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: receipt ? accent.withValues(alpha: 0.3) : _line),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (receipt) Container(height: 4, color: accent),
          if ((title ?? '').isNotEmpty || (meta ?? '').isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
              child: Row(
                children: [
                  Expanded(child: Text(title ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                  if ((meta ?? '').isNotEmpty) Text(meta!, style: const TextStyle(fontSize: 11.5, color: _muted)),
                ],
              ),
            ),
          child,
        ],
      ),
    );
  }
}

class _Rows extends StatelessWidget {
  const _Rows({required this.rows});

  final List<Map<String, dynamic>> rows;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final row in rows)
          if ((row['value']?.toString() ?? '').isNotEmpty)
            Container(
              padding: EdgeInsets.only(top: row['emphasis'] == true ? 8 : 3, bottom: 3),
              margin: EdgeInsets.only(top: row['emphasis'] == true ? 4 : 0),
              decoration: row['emphasis'] == true ? const BoxDecoration(border: Border(top: BorderSide(color: _line))) : null,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: Text(row['label']?.toString() ?? '', style: TextStyle(fontSize: row['emphasis'] == true ? 15 : 13, color: const Color(0xFF3B4658)))),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      row['value'].toString(),
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontSize: row['emphasis'] == true ? 15 : 13,
                        fontWeight: row['emphasis'] == true ? FontWeight.w700 : FontWeight.w500,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

class _ListRow extends StatelessWidget {
  const _ListRow({required this.title, this.trailing = '', this.subtitle = '', this.warning, required this.actions});

  final String title;
  final String trailing;
  final String subtitle;
  final String? warning;
  final Widget actions;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
              if (trailing.isNotEmpty) Text(trailing, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5)),
            ],
          ),
          if (subtitle.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text(subtitle, style: const TextStyle(fontSize: 12, color: _muted, height: 1.4))),
          if ((warning ?? '').isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: _Pill(text: warning!, tone: 'warn')),
          Padding(padding: const EdgeInsets.only(top: 8), child: actions),
        ],
      ),
    );
  }
}

class _ProductHeadline extends StatelessWidget {
  const _ProductHeadline({required this.product});

  final Map<String, dynamic> product;

  @override
  Widget build(BuildContext context) {
    final p = product;
    final price = p['price'] as num? ?? 0;
    final original = p['originalPrice'] as num? ?? 0;
    final stock = p['stock'] as num? ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(p['name']?.toString() ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
        const SizedBox(height: 2),
        Text(
          [p['seller'], if ((p['rating'] as num? ?? 0) > 0) '★ ${p['rating']}'].where((v) => v != null && '$v'.isNotEmpty).join(' · '),
          style: const TextStyle(fontSize: 11.5, color: _muted),
        ),
        const SizedBox(height: 6),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.end,
          spacing: 6,
          children: [
            Text('${p['priceFrom'] == true ? 'from ' : ''}${_peso(price)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            if (original > price) Text(_peso(original), style: const TextStyle(fontSize: 12, color: _muted, decoration: TextDecoration.lineThrough)),
            if ((p['discountPercent'] as num? ?? 0) > 0) Text('−${p['discountPercent']}%', style: const TextStyle(fontSize: 11.5, color: _bad, fontWeight: FontWeight.w600)),
          ],
        ),
        if ((p['stockLabel']?.toString() ?? '').isNotEmpty)
          Padding(padding: const EdgeInsets.only(top: 6), child: _Pill(text: p['stockLabel'].toString(), tone: stock <= 0 ? 'bad' : stock <= 5 ? 'warn' : 'good')),
      ],
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.index, required this.actions});

  final Map<String, dynamic> product;
  final int index;
  final Widget actions;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final image = product['imageUrl']?.toString() ?? '';
    final name = product['name']?.toString() ?? '?';
    return Container(
      decoration: BoxDecoration(color: _paper, borderRadius: BorderRadius.circular(14), border: Border.all(color: _line)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 84,
            width: double.infinity,
            child: image.startsWith('http')
                ? Image.network(image, fit: BoxFit.cover, errorBuilder: (_, _, _) => _Initial(name: name, color: accent))
                : _Initial(name: name, color: accent),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('#${index + 1}', style: const TextStyle(fontSize: 10.5, color: _muted, fontWeight: FontWeight.w600)),
                  _ProductHeadline(product: product),
                  const Spacer(),
                  actions,
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Initial extends StatelessWidget {
  const _Initial({required this.name, required this.color});

  final String name;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: color.withValues(alpha: 0.1),
      alignment: Alignment.center,
      child: Text(name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase(), style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w700)),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, this.tone = 'plain'});

  final String text;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final color = switch (tone) {
      'warn' => _warn,
      'bad' => _bad,
      'good' => _good,
      _ => const Color(0xFF3B4658),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(999)),
      child: Text(text, style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.w500)),
    );
  }
}

class _NoticeView extends StatelessWidget {
  const _NoticeView({required this.tone, required this.text, this.actions});

  final String tone;
  final String text;
  final Widget? actions;

  @override
  Widget build(BuildContext context) {
    final color = switch (tone) {
      'warning' => _warn,
      'error' => _bad,
      'success' => _good,
      _ => Theme.of(context).colorScheme.primary,
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
          Text(text, style: const TextStyle(fontSize: 12.5, height: 1.45, color: Color(0xFF3B4658))),
          if (actions != null) Padding(padding: const EdgeInsets.only(top: 8), child: actions),
        ],
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({required this.actions, required this.usedTokens, required this.onAction});

  final List<Map<String, dynamic>> actions;
  final Set<String> usedTokens;
  final _ActionHandler onAction;

  @override
  Widget build(BuildContext context) {
    final list = actions.where((a) => (a['label']?.toString() ?? '').isNotEmpty).toList(growable: false);
    if (list.isEmpty) return const SizedBox.shrink();
    final accent = Theme.of(context).colorScheme.primary;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final action in list)
          Builder(builder: (context) {
            final kind = action['kind']?.toString() ?? '';
            final token = action['token']?.toString() ?? '';
            final expiresAt = DateTime.tryParse(action['expiresAt']?.toString() ?? '');
            final expired = (kind == 'confirm' || kind == 'cancel') && expiresAt != null && expiresAt.isBefore(DateTime.now());
            final used = token.isNotEmpty && usedTokens.contains(token);
            final disabled = expired || used;
            final label = expired ? '${action['label']} (expired)' : action['label'].toString();
            final style = action['style']?.toString() ?? 'secondary';
            final onPressed = disabled ? null : () => onAction(action);
            if (style == 'primary') {
              return FilledButton(
                style: FilledButton.styleFrom(backgroundColor: accent, visualDensity: VisualDensity.compact, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                onPressed: onPressed,
                child: Text(label, style: const TextStyle(fontSize: 12.5)),
              );
            }
            if (style == 'ghost') {
              return TextButton(onPressed: onPressed, child: Text(label, style: const TextStyle(fontSize: 12.5, color: _muted)));
            }
            return OutlinedButton(
              style: OutlinedButton.styleFrom(
                visualDensity: VisualDensity.compact,
                foregroundColor: style == 'danger' ? _bad : _ink,
                side: BorderSide(color: style == 'danger' ? _bad.withValues(alpha: 0.4) : _line),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: onPressed,
              child: Text(label, style: const TextStyle(fontSize: 12.5)),
            );
          }),
      ],
    );
  }
}
