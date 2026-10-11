import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grookai_vault/screens/account/price_alerts_screen.dart';
import 'package:grookai_vault/services/notifications/price_target_service.dart';

const owner = '00000000-0000-4000-8000-000000000001',
    printing = '00000000-0000-4000-8000-000000000004',
    card = '00000000-0000-4000-8000-000000000005';
void main() {
  testWidgets(
    'Real native editor recovers lost committed response without a duplicate target',
    (tester) async {
      var actor = owner;
      final changes = StreamController<String?>.broadcast(sync: true);
      final requests = <String>[];
      final targets = <Map<String, dynamic>>[];
      final service = PriceTargetService(
        ownerId: owner,
        baseUrl: 'http://127.0.0.1:36171',
        sessionReader: () => (ownerId: actor, token: 'test-token'),
        ownerChanges: changes.stream,
        httpClient: MockClient((r) async {
          if (r.url.path.endsWith('/catalog')) {
            return http.Response(
              jsonEncode({
                'ownerId': owner,
                'catalog': {
                  'more': false,
                  'cards': [
                    {
                      'id': card,
                      'name': 'Synthetic card',
                      'set_code': 'TEST',
                      'number': '1',
                      'gv_id': 'GV-PK-TEST',
                      'printings': [
                        {
                          'id': printing,
                          'printing_gv_id': 'GV-PK-TEST-HOLO',
                          'finish_label': 'Holofoil',
                        },
                      ],
                    },
                  ],
                },
              }),
              200,
            );
          }
          if (r.method == 'GET') {
            return http.Response(
              jsonEncode({
                'version': 1,
                'ownerId': owner,
                'editEnabled': true,
                'targets': targets,
              }),
              200,
            );
          }
          requests.add(r.body);
          final body = jsonDecode(r.body) as Map<String, dynamic>;
          if (requests.length == 1) {
            targets.add({
              'id': body['id'],
              'revision': '1',
              'printingId': printing,
              'cardPrintId': card,
              'name': 'Synthetic card',
              'printingGvId': 'GV-PK-TEST-HOLO',
              'finish': 'holo',
              'amount': body['amount'],
              'currency': 'USD',
              'direction': body['direction'],
              'enabled': true,
              'lastCheckedAt': null,
              'triggeredAt': null,
              'reference': null,
            });
            throw http.ClientException('lost committed response');
          }
          return http.Response(
            jsonEncode({'ownerId': owner, 'id': body['id'], 'revision': '1'}),
            200,
          );
        }),
      );
      tester.view.physicalSize = const Size(390, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(home: PriceAlertsScreen(service: service)),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Search card name or GV-ID'),
        'Synthetic',
      );
      await tester.ensureVisible(find.text('Find cards'));
      await tester.tap(find.text('Find cards'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Synthetic card'));
      await tester.tap(find.text('Synthetic card'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Choose a printing'));
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Holofoil · GV-PK-TEST-HOLO').last);
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.widgetWithText(TextField, 'Target amount (USD)'),
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Target amount (USD)'),
        '12.34000000000000000001',
      );
      await tester.ensureVisible(find.text('Save price target'));
      await tester.tap(find.text('Save price target'));
      await tester.pumpAndSettle();
      expect(requests.length, 1);
      await tester.ensureVisible(find.text('Retry the same save'));
      await tester.tap(find.text('Retry the same save'));
      await tester.pumpAndSettle();
      expect(requests.length, 2);
      expect(requests[0], requests[1]);
      expect(targets.length, 1);
      await tester.scrollUntilVisible(
        find.textContaining('USD 12.34000000000000000001'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(
        find.textContaining('USD 12.34000000000000000001'),
        findsOneWidget,
      );
      expect(tester.takeException(), null);
      actor = 'replacement';
      changes.add(actor);
      await tester.pumpAndSettle();
      expect(find.textContaining('USD 12.34000000000000000001'), findsNothing);
      expect(
        find.text('Your account changed. Reopen price alerts from Account.'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      service.dispose();
      await changes.close();
    },
  );
  for (final width in [320.0, 768.0]) {
    testWidgets('Default-off alerts fit $width without editable controls', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = PriceTargetService(
        ownerId: owner,
        baseUrl: 'http://127.0.0.1:36171',
        sessionReader: () => (ownerId: owner, token: 'token'),
        httpClient: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'version': 1,
              'ownerId': owner,
              'editEnabled': false,
              'targets': [],
            }),
            200,
          ),
        ),
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: PriceAlertsScreen(service: service),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Find cards'), findsNothing);
      expect(
        find.text(
          'Price alert editing is not available yet. Your saved targets remain visible.',
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), null);
      await tester.pumpWidget(const SizedBox.shrink());
      service.dispose();
    });
  }
}
