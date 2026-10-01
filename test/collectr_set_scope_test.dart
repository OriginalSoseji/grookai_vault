import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:grookai_vault/services/import/collection_import_set_scope.dart';
import 'collection_import_recovery_test.dart' show Fixture, cardA, cardB;

void main() {
  final cases =
      jsonDecode(
            File(
              'test/fixtures/collectr_set_scopes_v1.json',
            ).readAsStringSync(),
          )
          as List;
  Future<CollectionImportPreview> preview(
    Map scope,
    String target, {
    String? sourceSet,
    String? sourceNumber,
    String? catalogNumber,
    String? game,
    String grade = 'Ungraded',
    String finish = 'Normal',
    String name = 'Synthetic card',
    bool competingDeck = false,
    bool sourceAware = true,
  }) async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.catalogPageSize = 1;
    final number = scope['numberPrefix'] == 'RC' ? 'RC7' : '7';
    f.catalogSets = [
      {'id': 'a', 'name': target, 'game': scope['game']},
      if (competingDeck)
        {
          'id': 'b',
          'name': (scope['catalog'] as List).last,
          'game': scope['game'],
        },
    ];
    f.catalogCards = [
      for (final e in {cardA: 'a', if (competingDeck) cardB: 'b'}.entries)
        {
          'id': e.key,
          'gv_id': 'GV-${e.key}',
          'name': 'Synthetic card',
          'number': catalogNumber ?? number,
          'set_id': e.value,
        },
    ];
    f.intercept = (request) {
      if (!request.url.path.endsWith('/get_public_card_printing_options_v1')) {
        return null;
      }
      final args = jsonDecode(request.body) as Map;
      final options = [
        for (final id in [cardA, if (competingDeck) cardB])
          {
            'id': id == cardA
                ? '33333333-3333-4333-8333-333333333333'
                : '44444444-4444-4444-8444-444444444444',
            'card_print_id': id,
            'finish_key': 'normal',
            'finish_is_active': true,
          },
      ];
      return http.Response(
        jsonEncode(options.skip(args['p_offset'] as int).take(1).toList()),
        200,
        request: request,
        headers: {'content-type': 'application/json'},
      );
    };
    return CollectionImportService.buildPreview(
      client: f.client,
      sourceAware: sourceAware,
      csvText:
          'Category,Product Name,Set,Card Number,Quantity,Variance,Grade\n'
          '${game ?? scope['game']},$name,${sourceSet ?? scope['source']},${sourceNumber ?? number},2,$finish,$grade',
    );
  }

  for (final scope in cases) {
    for (final target in scope['catalog'] as List) {
      test(
        '${scope['source']} includes $target with exact source and printing',
        () async {
          final p = await preview(scope, target);
          expect(p.rows.single.canImport, true);
          expect(p.rows.single.match!.cardId, cardA);
          expect(
            p.rows.single.cardPrintingId,
            '33333333-3333-4333-8333-333333333333',
          );
          expect(
            p.rows.single.row.sourceRecords.single.sourceFields['Set'],
            scope['source'],
          );
          expect(p.rows.single.desiredQuantity, 2);
        },
      );
    }
    test(
      '${scope['source']} does not broaden game, edition, grade, finish or name',
      () async {
        final target = (scope['catalog'] as List).first as String;
        for (final result in [
          await preview(scope, target, game: 'yugioh'),
          await preview(
            scope,
            target,
            sourceSet: '${scope['source']} (Japanese)',
          ),
          await preview(
            scope,
            target,
            sourceSet: '${scope['source']} (1st Edition)',
          ),
          await preview(scope, target, grade: 'PSA 10'),
          await preview(scope, target, finish: 'Holofoil'),
          await preview(scope, target, name: 'Synthetic card (Full Art)'),
          await preview(scope, target, sourceAware: false),
        ]) {
          expect(result.rows.single.canImport, false);
        }
        expect(collectrSetTargets(scope['source'], 'pokemon_jpn', 'RC7'), [
          scope['source'].toString().toLowerCase(),
        ]);
      },
    );
    if (scope['numberPrefix'] == 'RC') {
      test('${scope['source']} cannot select the main numbered set', () async {
        final p = await preview(
          scope,
          scope['catalog'][0],
          sourceNumber: '7',
          catalogNumber: '7',
        );
        expect(p.rows.single.matches, isEmpty);
        expect(p.rows.single.canImport, false);
      });
    }
    if ((scope['catalog'] as List).length > 1) {
      test(
        '${scope['source']} preserves ambiguity across constituent decks',
        () async {
          final p = await preview(
            scope,
            scope['catalog'][0],
            competingDeck: true,
          );
          expect(p.rows.single.matches.length, 2);
          expect(p.rows.single.canImport, false);
        },
      );
      test('${scope['source']} does not broaden a single deck label', () async {
        final p = await preview(
          scope,
          (scope['catalog'] as List).last,
          sourceSet: scope['catalog'][0],
        );
        expect(p.rows.single.matches, isEmpty);
      });
    }
  }
}
