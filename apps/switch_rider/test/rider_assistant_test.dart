import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:switch_core/switch_core.dart';
import 'package:switch_rider/src/ui/assistant/rider_assistant.dart';

Map<String, dynamic> _deliveryCard(String token) => {
      'type': 'delivery_card',
      'deliveryId': 'job-1',
      'code': 'SR-000777',
      'status': 'ARRIVED_AT_DROPOFF',
      'statusLabel': 'At drop-off',
      'nextStep': 'Enter the customer PIN to complete.',
      'pickup': {'name': 'Street Shop', 'area': 'Makati'},
      'dropoff': {'name': 'Ana', 'area': 'Taguig'},
      'payment': {'method': 'COD', 'codAmount': 1300, 'codCollected': true},
      'earning': 85,
      'actions': [
        {
          'label': 'Complete delivery',
          'kind': 'confirm',
          'token': token,
          'expiresAt': DateTime.now().add(const Duration(minutes: 10)).toUtc().toIso8601String(),
          'style': 'primary',
          'inputs': [
            {'name': 'pin', 'label': 'Customer PIN', 'type': 'pin', 'required': true},
          ],
        },
      ],
    };

void main() {
  testWidgets('delivery step needs a tap and PIN, then refreshes the rider app', (tester) async {
    final requests = <http.Request>[];
    var refreshes = 0;
    final client = SwitchApiClient(
      baseUrl: 'http://rider.test',
      readSessionToken: () => 'rider-token',
      httpClient: MockClient((request) async {
        requests.add(request);
        final path = request.url.path;
        Map<String, dynamic> body;
        if (path.endsWith('/session')) {
          body = {
            'enabled': true,
            'greeting': 'Hi rider',
            'messages': [],
            'suggestions': ['Next step'],
          };
        } else if (path.endsWith('/chat')) {
          body = {
            'message': 'Tap "Complete delivery" to confirm and enter the PIN.',
            'blocks': [_deliveryCard('tok-complete')],
          };
        } else if (path.endsWith('/confirm')) {
          body = {
            'message': 'Delivered. Nice work!',
            'blocks': [
              {'type': 'notice', 'tone': 'success', 'text': 'SR-000777 delivered.'},
            ],
            'clientEffects': {'riderRefresh': true},
          };
        } else {
          return http.Response(jsonEncode({'message': 'Not found'}), 404);
        }
        return http.Response(jsonEncode(body), 200, headers: {'content-type': 'application/json'});
      }),
    );
    final controller = RiderAssistantController(client: client, onRiderRefresh: () => refreshes++);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => Center(
            child: TextButton(onPressed: () => openRiderAssistant(context, controller), child: const Text('open')),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('Hi rider'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'tapos na');
    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();

    expect(find.text('SR-000777'), findsOneWidget);
    expect(find.text('₱1,300.00 ✓'), findsOneWidget);
    expect(requests.where((r) => r.url.path.endsWith('/confirm')), isEmpty);

    await tester.tap(find.widgetWithText(FilledButton, 'Complete delivery'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm'));
    await tester.pumpAndSettle();
    expect(find.text('Required'), findsOneWidget);
    expect(requests.where((r) => r.url.path.endsWith('/confirm')), isEmpty);

    await tester.enterText(find.widgetWithText(TextFormField, 'Customer PIN'), '8765');
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm'));
    await tester.pumpAndSettle();

    final confirm = requests.singleWhere((r) => r.url.path.endsWith('/confirm'));
    expect(confirm.url.path, '/api/rider/assistant/confirm');
    expect(confirm.headers['X-Switch-Session'], 'rider-token');
    expect(jsonDecode(confirm.body), {'token': 'tok-complete', 'inputs': {'pin': '8765'}, 'cancel': false});
    expect(refreshes, 1);
    expect(find.text('SR-000777 delivered.'), findsOneWidget);

    final spent = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Complete delivery'));
    expect(spent.onPressed, isNull);
  });
}
