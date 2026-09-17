import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:grookai_vault/widgets/vault/confirm_unassigned_printing.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const cardId = '10000000-0000-4000-8000-000000000001';
const printingId = '20000000-0000-4000-8000-000000000001';

void main() {
  for (final confirm in [false, true]) {
    testWidgets('unassigned dialog requires explicit choice: $confirm', (
      tester,
    ) async {
      bool? choice;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              return TextButton(
                onPressed: () async {
                  choice = await confirmUnassignedVaultPrinting(context);
                },
                child: const Text('Add'),
              );
            },
          ),
        ),
      );
      await tester.tap(find.text('Add'));
      await tester.pumpAndSettle();
      expect(choice, isNull);
      expect(
        find.textContaining('without an exact finish or market value'),
        findsOneWidget,
      );
      await tester.tap(find.text(confirm ? 'Add unassigned copy' : 'Cancel'));
      await tester.pumpAndSettle();
      expect(choice, confirm);
    });
  }

  for (final scenario in ['empty', 'known', 'failed', 'malformed', 'conflicting']) {
    test('unassigned add rechecks governed options: $scenario', () async {
      final writes = <Map<String, dynamic>>[];
      var printingReads = 0;
      final client = SupabaseClient(
        'http://localhost:54321',
        'local-test-key',
        httpClient: MockClient((request) async {
          Object? data;
          var status = 200;
          if (request.url.path.endsWith(
            'get_public_card_printing_options_v1',
          )) {
            printingReads++;
            if (scenario == 'failed') {
              status = 503;
              data = {'message': 'Printing lookup unavailable'};
            } else if (scenario == 'malformed') {
              data = {'unexpected': 'not a printing list'};
            } else {
              data = scenario == 'known'
                  ? [
                      {'id': printingId, 'card_print_id': cardId},
                    ]
                  : [];
            }
          } else if (request.url.path.endsWith('vault-add-card-instance-v1')) {
            writes.add(jsonDecode(request.body) as Map<String, dynamic>);
            data = {
              'success': true,
              'result': {'gv_vi_id': 'GVVI-TEST-1'},
            };
          } else if (request.url.path.endsWith('card_prints')) {
            data = <String, dynamic>{};
          } else {
            data = [];
          }
          return http.Response(
            jsonEncode(data),
            status,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);
      final add = VaultCardService.addOrIncrementVaultItem(
        client: client,
        userId: '30000000-0000-4000-8000-000000000001',
        cardId: cardId,
        cardPrintingId: scenario == 'conflicting' ? printingId : null,
        unassignedPrintingConfirmed: true,
      );
      if (scenario == 'empty') {
        expect(await add, 'GVVI-TEST-1');
        expect(writes, hasLength(1));
        expect(writes.single['card_print_id'], cardId);
        expect(writes.single.containsKey('card_printing_id'), isFalse);
        expect(writes.single.containsKey('market_price'), isFalse);
      } else {
        await expectLater(add, throwsA(anything));
        expect(writes, isEmpty);
      }
      expect(printingReads, scenario == 'conflicting' ? 0 : 1);
    });
  }
}
