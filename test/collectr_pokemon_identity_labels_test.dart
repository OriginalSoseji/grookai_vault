import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:http/http.dart' as http;
import 'collection_import_recovery_test.dart' show Fixture, cardA;

void main() {
  final cases =
      jsonDecode(
            File(
              'test/fixtures/collectr_pokemon_identity_labels_v1.json',
            ).readAsStringSync(),
          )
          as List;
  Future<CollectionImportPreview> preview(
    Map c, {
    bool active = true,
    bool duplicate = false,
    bool sourceAware = true,
    String? finish,
    String grade = 'Ungraded',
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
        'set_id': 'synthetic-set',
        ...Map<String, dynamic>.from(c['card']),
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
          'finish_key': finish ?? c['finish'],
          'finish_is_active': active,
        },
        if (duplicate)
          {
            'id': '44444444-4444-4444-8444-444444444444',
            'card_print_id': cardA,
            'finish_key': finish ?? c['finish'],
            'finish_is_active': active,
          },
      ];
      return http.Response(
        jsonEncode(options.skip(args['p_offset'] as int).take(1).toList()),
        200,
        headers: {'content-type': 'application/json'},
        request: request,
      );
    };
    return CollectionImportService.buildPreview(
      client: f.client,
      sourceAware: sourceAware,
      csvText:
          'Category,Product Name,Set,Card Number,Quantity,Variance,Grade,Average Cost Paid\nPokemon,${c['sourceName']},Synthetic Set,${c['sourceNumber']},2,${c['variance']},$grade,4.25',
    );
  }

  for (final c in cases) {
    test('native identity label: ${c['label']}', () async {
      final p = await preview(c);
      final r = p.rows.single;
      expect(r.canImport, c['expected']);
      expect(
        r.row.sourceRecords.single.sourceFields['Product Name'],
        c['sourceName'],
      );
      expect(
        r.row.sourceRecords.single.sourceFields['Average Cost Paid'],
        '4.25',
      );
      if (c['expected'] != true) return;
      expect(r.cardPrintingId, '33333333-3333-4333-8333-333333333333');
      expect(r.desiredQuantity, 2);
      for (final held in [
        await preview(c, active: false),
        await preview(c, duplicate: true),
        await preview(c, finish: c['finish'] == 'holo' ? 'normal' : 'holo'),
        await preview(c, sourceAware: false),
        await preview(c, grade: 'PSA 10'),
      ]) {
        expect(held.rows.single.canImport, false);
      }
    });
  }
}
