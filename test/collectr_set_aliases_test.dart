import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:http/http.dart' as http;
import 'collection_import_recovery_test.dart' show Fixture, cardA, cardB;

void main() {
  final cases =
      jsonDecode(
            File(
              'test/fixtures/collectr_set_aliases_v1.json',
            ).readAsStringSync(),
          )
          as List;
  Future<CollectionImportPreview> preview(
    Map alias, {
    String game = 'Pokemon',
    String? sourceSet,
    String grade = 'Ungraded',
    String finish = 'Reverse Holofoil',
    String name = 'Synthetic card',
    String number = '0007/100',
    bool duplicate = false,
  }) async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.catalogPageSize = 1;
    f.catalogSets = [
      {'id': 'a', 'name': alias['catalog'], 'game': 'pokemon'},
      if (duplicate) {'id': 'b', 'name': alias['catalog'], 'game': 'pokemon'},
    ];
    f.catalogCards = [
      for (final entry in {cardA: 'a', if (duplicate) cardB: 'b'}.entries)
        {
          'id': entry.key,
          'gv_id': 'GV-${entry.key}',
          'name': 'Synthetic card',
          'number': '7',
          'set_id': entry.value,
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
                    'finish_key': 'reverse',
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
      sourceAware: true,
      csvText:
          'Category,Product Name,Set,Card Number,Quantity,Variance,Grade\n'
          '$game,$name,${sourceSet ?? alias['source']},$number,2,$finish,$grade',
    );
  }

  for (final alias in cases) {
    test(
      '${alias['source']} resolves exact parent and child without rewriting source',
      () async {
        final p = await preview(alias);
        final row = p.rows.single;
        expect(row.canImport, true);
        expect(row.match!.cardId, cardA);
        expect(row.cardPrintingId, '33333333-3333-4333-8333-333333333333');
        expect(row.desiredQuantity, 2);
        expect(
          row.row.sourceRecords.single.sourceFields['Set'],
          alias['source'],
        );
        expect(row.row.finish, 'Reverse Holofoil');
        expect(
          CollectionImportService.normalizeImportSetForCompare(
            '  ${alias['source'].toUpperCase()}  ',
            gameCode: 'pokemon',
          ),
          alias['catalog'].toLowerCase(),
        );
        for (final game in ['mtg', 'pokemon_jpn', '']) {
          expect(
            CollectionImportService.normalizeImportSetForCompare(
              alias['source'],
              gameCode: game,
            ),
            alias['source'].toLowerCase(),
          );
        }
      },
    );
  }

  test('duplicate catalog sets remain ambiguous across capped pages', () async {
    final p = await preview(cases[8], duplicate: true);
    expect(p.rows.single.matches.length, 2);
    expect(p.rows.single.canImport, false);
  });
  test(
    'aliases preserve grade, finish, identity and game constraints',
    () async {
      final a = cases[1];
      for (final p in [
        await preview(a, grade: 'PSA 10'),
        await preview(a, finish: 'Holofoil'),
        await preview(a, game: 'MTG'),
        await preview(a, number: '8'),
        await preview(a, name: 'Synthetic card (Stamped)'),
      ]) {
        expect(p.rows.single.canImport, false);
      }
      for (final label in [
        'EX Emerald (JP)',
        'EX Emerald (1st Edition)',
        'EX Emeral',
        'EX Emerald Deck Exclusives',
      ]) {
        final p = await preview(a, sourceSet: label);
        expect(p.rows.single.matches, isEmpty);
        expect(p.rows.single.canImport, false);
        expect(
          p.rows.single.row.sourceRecords.single.sourceFields['Set'],
          label,
        );
      }
    },
  );
}
