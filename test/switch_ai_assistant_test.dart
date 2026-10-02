import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:switch_app/services/ai_assistant_transport_base.dart';
import 'package:switch_app/widgets/switch_ai_assistant.dart';

class _FakeTransport implements AiAssistantTransport {
  final List<(String, String, Map<String, dynamic>?)> calls = [];

  @override
  Future<AiAssistantHttpResult> send(String method, String path, {Map<String, dynamic>? body}) async {
    calls.add((method, path, body));
    if (path.startsWith('/api/assistant/session')) {
      return const AiAssistantHttpResult(200, {
        'enabled': true,
        'greeting': 'Hi! What are you shopping for?',
        'messages': [],
        'suggestions': ['Running shoes under ₱1,500'],
      });
    }
    if (path == '/api/assistant/chat') {
      return AiAssistantHttpResult(200, {
        'message': 'Here is your order to review.',
        'blocks': [
          {
            'type': 'confirmation',
            'title': 'Place this order?',
            'risk': 'high',
            'token': 'tok-order',
            'expiresAt': DateTime.now().add(const Duration(minutes: 10)).toUtc().toIso8601String(),
            'lines': [
              {'label': 'Street Black Shoes (M) × 1', 'value': '₱1,250'},
              {'label': 'Total', 'value': '₱1,309', 'emphasis': true},
            ],
            'confirmLabel': 'Place order',
          },
        ],
      });
    }
    if (path == '/api/assistant/confirm') {
      return const AiAssistantHttpResult(200, {
        'message': 'Order placed.',
        'blocks': [
          {'type': 'notice', 'tone': 'success', 'text': 'Order #AB12CD placed.'},
        ],
      });
    }
    return const AiAssistantHttpResult(404, {'message': 'Not found'});
  }
}

void main() {
  testWidgets('orders are only placed from the confirmation tap, and the token is spent once', (tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final transport = _FakeTransport();
    SwitchAiAssistantController.instance.debugTransport = transport;

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => Center(
            child: TextButton(onPressed: () => openSwitchAiAssistant(context), child: const Text('open')),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('Hi! What are you shopping for?'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'checkout na, yes');
    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();

    expect(find.text('Place this order?'), findsOneWidget);
    expect(find.text('₱1,309'), findsOneWidget);
    expect(transport.calls.where((c) => c.$2 == '/api/assistant/confirm'), isEmpty);

    await tester.tap(find.widgetWithText(FilledButton, 'Place order'));
    await tester.pumpAndSettle();

    final confirms = transport.calls.where((c) => c.$2 == '/api/assistant/confirm').toList();
    expect(confirms, hasLength(1));
    expect(confirms.single.$3, {'token': 'tok-order', 'cancel': false});
    expect(find.text('Order #AB12CD placed.'), findsOneWidget);

    final spent = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Place order'));
    expect(spent.onPressed, isNull);
  });

  testWidgets('wide screens get a side panel that leaves the page usable', (tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    SwitchAiAssistantController.instance.debugTransport = _FakeTransport();

    var pageTaps = 0;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => Row(
            children: [
              TextButton(onPressed: () => openSwitchAiAssistant(context), child: const Text('open')),
              TextButton(onPressed: () => pageTaps++, child: const Text('page action')),
            ],
          ),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('Switch Shopping AI'), findsOneWidget);

    await tester.tap(find.text('page action'));
    expect(pageTaps, 1);

    await tester.tap(find.byTooltip('Close'));
    await tester.pumpAndSettle();
    expect(find.text('Switch Shopping AI'), findsNothing);
  });
}
