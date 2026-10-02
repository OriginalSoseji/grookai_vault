import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_pokemon_name.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:http/http.dart' as http;
import 'collection_import_recovery_test.dart' show Fixture, cardA;

void main() {
  final cases =
      jsonDecode(
            File(
              'test/fixtures/collectr_pokemon_art_labels_v1.json',
            ).readAsStringSync(),
          )
          as List;
  Future<CollectionImportPreview> preview(
    Map c, {
    bool active = true,
    bool sourceAware = true,
    String grade = 'Ungraded',
    Map<String, dynamic> changes = const {},
  }) async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.catalogPageSize = 1;
    f.catalogSets = [
      {'id': 'synthetic-set', 'name': 'Synthetic Set', 'game': 'pokemon'},
    ];
    f.catalogCards = [
      {
        'id': cardA,
        'gv_id': 'GV-$cardA',
        'name': 'Synthetic-EX',
        'number': '7',
        'set_id': 'synthetic-set',
        'identity_domain': 'pokemon_eng_standard',
        'rarity': c['rarity'],
        'variant_key': c['variant'],
        ...changes,
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
                    'finish_is_active': active,
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
          'Category,Product Name,Set,Card Number,Quantity,Variance,Grade\nPokemon,${c['name']},Synthetic Set,007/100,2,Holofoil,$grade',
    );
  }

  for (final c in cases) {
    test('native art evidence: ${c['label']}', () async {
      final card = <String, dynamic>{
        'name': 'Synthetic-EX',
        'number': '7',
        'identity_domain': 'pokemon_eng_standard',
        'rarity': c['rarity'],
        'variant_key': c['variant'],
      };
      expect(
        matchesCollectrPokemonName(
          sourceName: c['name'],
          sourceNumber: '007/100',
          game: 'pokemon',
          card: card,
        ),
        c['expected'],
      );
      final p = await preview(c);
      expect(p.rows.single.canImport, c['expected']);
      expect(
        p.rows.single.row.sourceRecords.single.sourceFields['Product Name'],
        c['name'],
      );
      if (c['expected'] != true) {
        return;
      }
      expect(
        p.rows.single.cardPrintingId,
        '33333333-3333-4333-8333-333333333333',
      );
      expect(p.rows.single.desiredQuantity, 2);
      for (final held in [
        await preview(c, active: false),
        await preview(c, sourceAware: false),
        await preview(c, grade: 'PSA 10'),
        await preview(c, changes: {'rarity': null}),
        await preview(c, changes: {'printed_identity_modifier': 'stamp'}),
        await preview(c, changes: {'identity_domain': 'pokemon_jpn_standard'}),
      ]) {
        expect(held.rows.single.canImport, false);
      }
    });
  }
}
