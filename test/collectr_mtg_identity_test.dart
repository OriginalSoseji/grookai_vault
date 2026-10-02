import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_mtg_identity.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:http/http.dart' as http;
import 'collection_import_recovery_test.dart' show Fixture, cardA, cardB;

void main() {
  final cases =
      jsonDecode(
            File(
              'test/fixtures/collectr_mtg_identity_v1.json',
            ).readAsStringSync(),
          )
          as List;
  for (final testCase in cases) {
    test(testCase['label'] as String, () {
      final input = testCase['input'] as Map;
      expect(
        matchesCollectrMtgIdentity(
          sourceName: input['sourceName'] as String,
          sourceNumber: input['sourceNumber'] as String,
          game: input['game'] as String,
          card: Map<String, dynamic>.from(input['card'] as Map),
          identities: (input['identities'] as List)
              .map((r) => Map<String, dynamic>.from(r as Map))
              .toList(),
        ),
        testCase['expected'],
      );
    });
  }

  Future<Fixture> fixture([Map? override, String finish = 'foil']) async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    final input = override ?? cases.first['input'] as Map;
    f.catalogSets = [
      {
        'id': 'synthetic-set',
        'name': 'Synthetic Set',
        'code': (input['card'] as Map)['set_code'],
        'game': 'mtg',
      },
    ];
    f.catalogCards = [
      {
        ...Map<String, dynamic>.from(input['card'] as Map),
        'set_id': 'synthetic-set',
        'gv_id': 'GV-TEST',
      },
    ];
    f.catalogIdentities = (input['identities'] as List)
        .map((r) => Map<String, dynamic>.from(r as Map))
        .toList();
    f.intercept = (request) {
      if (!request.url.path.endsWith('/get_public_card_printing_options_v1')) {
        return null;
      }
      final args = jsonDecode(request.body) as Map;
      return http.Response(
        jsonEncode(
          args['p_offset'] == 0
              ? [
                  {
                    'id': '33333333-3333-4333-8333-333333333333',
                    'card_print_id': cardA,
                    'finish_key': finish,
                    'finish_is_active': true,
                  },
                ]
              : [],
        ),
        200,
        headers: {'content-type': 'application/json'},
        request: request,
      );
    };
    return f;
  }

  const csv =
      'Category,Set,Product Name,Card Number,Variance,Quantity\nMTG,Synthetic Set,Fixture Mage (Extended Art),00373,Foil,2';
  for (final finish in ['normal', 'foil']) {
    test(
      'FCA preview preserves $finish and holds grades and special foils',
      () async {
        final input =
            cases.firstWhere(
                  (c) => c['label'] == 'FCA official pair 4',
                )['input']
                as Map;
        final f = await fixture(input, finish);
        final name = input['sourceName'] as String;
        final variance = finish == 'foil' ? 'Foil' : 'Normal';
        final export =
            'Category,Set,Product Name,Card Number,Variance,Quantity,Grade\n'
            'MTG,Synthetic Set,$name,4,$variance,2,Ungraded\n'
            'MTG,Synthetic Set,$name,4,$variance,1,PSA 10\n'
            'MTG,Synthetic Set,$name,4,Surge Foil,1,Ungraded';
        final preview = await CollectionImportService.buildPreview(
          client: f.client,
          csvText: export,
          sourceAware: true,
        );
        expect(preview.rows.length, 3);
        expect(preview.rows.first.canImport, true);
        expect(preview.rows.first.cardPrintingFinishKey, finish);
        expect(preview.rows.first.desiredQuantity, 2);
        expect(preview.rows.first.row.sourceFields['Product Name'], name);
        expect(preview.rows.skip(1).every((r) => !r.canImport), true);
        expect(f.saved, isEmpty);
      },
    );
  }
  test(
    'source-aware preview resolves governed art and preserves original details',
    () async {
      final f = await fixture();
      final p = await CollectionImportService.buildPreview(
        client: f.client,
        csvText: csv,
        sourceAware: true,
      );
      expect(p.rows.single.canImport, true);
      expect(p.rows.single.match!.cardId, cardA);
      expect(p.rows.single.cardPrintingFinishKey, 'foil');
      expect(
        p.rows.single.row.sourceFields['Product Name'],
        'Fixture Mage (Extended Art)',
      );
      expect(p.rows.single.desiredQuantity, 2);
      expect(
        f.requests
            .where((r) => r.url.path.endsWith('/card_print_identity'))
            .length,
        2,
      );
      expect(f.saved, isEmpty);
    },
  );
  test('legacy preview never uses the new fallback', () async {
    final f = await fixture();
    final p = await CollectionImportService.buildPreview(
      client: f.client,
      csvText: csv,
    );
    expect(p.rows.single.match, isNull);
    expect(
      f.requests.where((r) => r.url.path.endsWith('/card_print_identity')),
      isEmpty,
    );
  });
  test(
    'two proven parent identities remain ambiguous across capped pages',
    () async {
      final f = await fixture();
      f.catalogPageSize = 1;
      f.catalogCards!.add({
        ...f.catalogCards!.single,
        'id': cardB,
        'gv_id': 'GV-OTHER',
      });
      f.catalogIdentities.add({
        ...f.catalogIdentities.single,
        'id': '55555555-5555-4555-8555-555555555555',
        'card_print_id': cardB,
      });
      final p = await CollectionImportService.buildPreview(
        client: f.client,
        csvText: csv,
        sourceAware: true,
      );
      expect(p.rows.single.status, CollectionImportMatchStatus.multiple);
      expect(p.rows.single.canImport, false);
      expect(p.rows.single.matches.length, 2);
      expect(
        f.requests
            .where((r) => r.url.path.endsWith('/card_print_identity'))
            .length,
        3,
      );
    },
  );
  for (final mode in ['missing', 'duplicate', 'wrong-set', 'wrong-game']) {
    test('$mode evidence cannot create a ready row', () async {
      final f = await fixture();
      if (mode == 'missing') f.catalogIdentities.clear();
      if (mode == 'duplicate') {
        f.catalogIdentities.add({
          ...f.catalogIdentities.single,
          'id': '55555555-5555-4555-8555-555555555555',
        });
      }
      if (mode == 'wrong-set') f.catalogSets!.single['name'] = 'Different Set';
      if (mode == 'wrong-game') f.catalogSets!.single['game'] = 'pokemon';
      final p = await CollectionImportService.buildPreview(
        client: f.client,
        csvText: csv,
        sourceAware: true,
      );
      expect(p.rows.single.canImport, false);
      expect(p.rows.single.match, isNull);
    });
  }
  for (final mode in ['failed', 'repeated', 'late-failure']) {
    test('$mode identity page aborts the entire preview', () async {
      final f = await fixture();
      f.intercept = (request) {
        if (!request.url.path.endsWith('/card_print_identity')) return null;
        if (mode == 'failed' ||
            (mode == 'late-failure' &&
                request.url.queryParameters.containsKey('id'))) {
          throw http.ClientException('identity unavailable');
        }
        return http.Response(
          jsonEncode(f.catalogIdentities),
          200,
          headers: {'content-type': 'application/json'},
          request: request,
        );
      };
      await expectLater(
        CollectionImportService.buildPreview(
          client: f.client,
          csvText: csv,
          sourceAware: true,
        ),
        throwsA(anything),
      );
      expect(f.saved, isEmpty);
    });
  }
}
