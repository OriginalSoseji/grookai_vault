import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_named_finish.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:http/http.dart' as http;
import 'collection_import_recovery_test.dart' show Fixture, cardA;

void main() {
  final cases =
      jsonDecode(
            File(
              'test/fixtures/collectr_named_finishes_v1.json',
            ).readAsStringSync(),
          )
          as List;
  for (final c in cases) {
    test('named finish parser: ${c['name']}', () {
      final result = collectrPokemonNamedFinish(c['name']);
      expect(result?.name, c['base']);
      expect(result?.finishKey, c['finish']);
    });
  }
  Future<CollectionImportPreview> preview(
    String name,
    String finish, {
    String variance = 'Holofoil',
    String grade = 'Ungraded',
    String domain = 'pokemon_eng_standard',
    bool duplicate = false,
    bool active = true,
    bool sourceAware = true,
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
        'name': 'Synthetic',
        'number': '7',
        'set_id': 'synthetic-set',
        'identity_domain': domain,
      },
    ];
    f.intercept = (request) {
      if (!request.url.path.endsWith('/get_public_card_printing_options_v1')) {
        return null;
      }
      final args = jsonDecode(request.body) as Map;
      final options = [
        {
          'id': '33333333-3333-4333-8333-333333333333',
          'card_print_id': cardA,
          'finish_key': finish,
          'finish_is_active': active,
        },
        {
          'id': '44444444-4444-4444-8444-444444444444',
          'card_print_id': cardA,
          'finish_key': duplicate ? finish : 'normal',
          'finish_is_active': true,
        },
      ];
      final offset = args['p_offset'] as int;
      return http.Response(
        jsonEncode(options.skip(offset).take(1).toList()),
        200,
        headers: {'content-type': 'application/json'},
        request: request,
      );
    };
    return CollectionImportService.buildPreview(
      client: f.client,
      sourceAware: sourceAware,
      csvText:
          'Category,Product Name,Set,Card Number,Quantity,Variance,Grade\nPokemon,$name,Synthetic Set,007/100,2,$variance,$grade',
    );
  }

  for (final c in cases.where((c) => c['finish'] != null)) {
    test(
      'native selects only governed ${c['name']} and retains raw source',
      () async {
        for (final variance in ['Holofoil', '']) {
          final p = await preview(c['name'], c['finish'], variance: variance),
              r = p.rows.single;
          expect(r.canImport, true);
          expect(r.cardPrintingId, '33333333-3333-4333-8333-333333333333');
          expect(r.desiredQuantity, 2);
          expect(r.row.finish, variance);
          expect(
            r.row.sourceRecords.single.sourceFields['Product Name'],
            c['name'],
          );
        }
        for (final p in [
          await preview(c['name'], 'holo'),
          await preview(c['name'], c['finish'], active: false),
          await preview(c['name'], c['finish'], duplicate: true),
          await preview(c['name'], c['finish'], variance: 'Reverse Holofoil'),
          await preview(c['name'], c['finish'], variance: 'Normal'),
          await preview(c['name'], c['finish'], grade: 'PSA 10'),
          await preview(c['name'], c['finish'], domain: 'pokemon_jpn_standard'),
          await preview(c['name'], c['finish'], sourceAware: false),
        ]) {
          expect(p.rows.single.canImport, false);
        }
      },
    );
  }
  for (final c in cases.where((c) => c['finish'] == null)) {
    test('native retains unknown or stacked finish: ${c['name']}', () async {
      expect((await preview(c['name'], 'holo')).rows.single.canImport, false);
    });
  }
}
