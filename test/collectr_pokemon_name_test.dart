import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_pokemon_name.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:http/http.dart' as http;
import 'collection_import_recovery_test.dart' show Fixture, cardA, cardB;

void main() {
  final cases =
      jsonDecode(
            File(
              'test/fixtures/collectr_pokemon_name_v1.json',
            ).readAsStringSync(),
          )
          as List;
  for (final c in cases) {
    test(c['label'] as String, () {
      final input = c['input'] as Map;
      expect(
        matchesCollectrPokemonName(
          sourceName: input['sourceName'],
          sourceNumber: input['sourceNumber'],
          game: input['game'],
          card: Map<String, dynamic>.from(input['card'] as Map),
        ),
        c['expected'],
      );
    });
  }
  Future<CollectionImportPreview> preview({
    bool duplicate = false,
    bool sourceAware = true,
    String grade = 'Ungraded',
    String finish = 'Holofoil',
    String set = 'Synthetic Set',
    String number = '007/100',
    String name = 'Synthetic EX (7)',
    bool exactCompetitor = false,
  }) async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.catalogPageSize = 1;
    f.catalogSets = [
      {'id': 'synthetic-set', 'name': 'Synthetic Set', 'game': 'pokemon'},
    ];
    f.catalogCards = [
      for (final id in [cardA, if (duplicate || exactCompetitor) cardB])
        {
          'id': id,
          'gv_id': 'GV-$id',
          'name': exactCompetitor && id == cardB ? name : 'Synthetic-EX',
          'number': '7',
          'set_id': 'synthetic-set',
          'identity_domain': 'pokemon_eng_standard',
          'language': null,
        },
    ];
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
                    'finish_key': 'holo',
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
    return CollectionImportService.buildPreview(
      client: f.client,
      sourceAware: sourceAware,
      csvText:
          'Category,Product Name,Set,Card Number,Quantity,Variance,Grade\nPokemon,$name,$set,$number,2,$finish,$grade',
    );
  }

  test(
    'preview preserves exact child, quantity and original decorated source',
    () async {
      final p = await preview();
      final row = p.rows.single;
      expect(row.canImport, true);
      expect(row.match!.cardId, cardA);
      expect(row.cardPrintingId, '33333333-3333-4333-8333-333333333333');
      expect(row.desiredQuantity, 2);
      expect(
        row.row.sourceRecords.single.sourceFields['Product Name'],
        'Synthetic EX (7)',
      );
    },
  );
  test('both formatted candidates stay ambiguous across pages', () async {
    final p = await preview(duplicate: true);
    expect(p.rows.single.canImport, false);
    expect(p.rows.single.matches.length, 2);
  });
  test(
    'exact candidate does not hide a second formatting equivalent',
    () async {
      final p = await preview(exactCompetitor: true);
      expect(p.rows.single.canImport, false);
      expect(p.rows.single.matches.length, 2);
    },
  );
  test('legacy V1 matching stays unchanged', () async {
    expect((await preview(sourceAware: false)).rows.single.canImport, false);
  });
  test(
    'grade, finish, set, number and artwork remain independent requirements',
    () async {
      for (final p in [
        await preview(grade: 'PSA 10'),
        await preview(finish: 'Reverse Holofoil'),
        await preview(set: 'Different Set'),
        await preview(number: '8'),
        await preview(name: 'Synthetic EX (Full Art)'),
      ]) {
        expect(p.rows.single.canImport, false);
      }
    },
  );
}
