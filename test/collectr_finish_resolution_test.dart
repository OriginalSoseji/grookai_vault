import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'collection_import_recovery_test.dart' show Fixture, cardA, cardB;

const normalPrinting = '33333333-3333-4333-8333-333333333333';
const specialPrinting = '44444444-4444-4444-8444-444444444444';

void main() {
  Future<CollectionImportPreview> preview({
    String finish = 'Normal',
    String grade = 'Ungraded',
    String edition = 'Set',
    bool sourceAware = true,
    bool reverseOrder = false,
    bool duplicateFinish = false,
    String firstFinish = 'normal',
    String? secondFinish = 'holo',
    bool secondActive = true,
    bool failLastPage = false,
    bool repeatPage = false,
    bool unrelatedPage = false,
  }) async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.catalogPageSize = 1;
    f.catalogSets = [
      {'id': 'set', 'name': 'Set', 'game': 'pokemon'},
    ];
    f.catalogCards = [
      for (final id in [cardA, cardB])
        {
          'id': id,
          'gv_id': 'GV-$id',
          'name': 'Fixture',
          'number': '7',
          'set_id': 'set',
          'identity_domain': 'pokemon_eng_standard',
          'variant_key': id == cardB ? 'event_stamp' : '',
        },
    ];
    final options = [
      {
        'id': normalPrinting,
        'card_print_id': unrelatedPage ? 'unrelated-parent' : cardA,
        'finish_key': firstFinish,
        'finish_is_active': true,
      },
      if (secondFinish != null)
        {
          'id': specialPrinting,
          'card_print_id': cardB,
          'finish_key': secondFinish,
          'finish_is_active': secondActive,
        },
      if (duplicateFinish)
        {
          'id': '55555555-5555-4555-8555-555555555555',
          'card_print_id': cardA,
          'finish_key': firstFinish,
          'finish_is_active': true,
        },
    ];
    final ordered = reverseOrder ? options.reversed.toList() : options;
    f.intercept = (request) {
      if (!request.url.path.endsWith('/get_public_card_printing_options_v1')) {
        return null;
      }
      final args = jsonDecode(request.body) as Map;
      expect(args['p_card_print_ids'], containsAll([cardA, cardB]));
      final offset = args['p_offset'] as int;
      if (failLastPage && offset >= ordered.length) {
        return http.Response('{"message":"unavailable"}', 503, request: request);
      }
      return http.Response(
        jsonEncode(ordered.skip(repeatPage ? 0 : offset).take(1).toList()),
        200,
        headers: {'content-type': 'application/json'},
        request: request,
      );
    };
    final result = await CollectionImportService.buildPreview(
      client: f.client,
      sourceAware: sourceAware,
      csvText:
          'Category,Product Name,Set,Card Number,Quantity,Variance,Grade,Average Cost Paid,Notes\n'
          'Pokemon,Fixture,$edition,007/100,3,$finish,$grade,4.25,Original note',
    );
    expect(f.saved, isEmpty);
    return result;
  }

  test(
    'explicit finish resolves a parent across capped printing pages',
    () async {
      final result = await preview();
      final row = result.rows.single;
      expect(row.canImport, true);
      expect(row.match!.cardId, cardA);
      expect(row.cardPrintingId, normalPrinting);
      expect(row.cardPrintingFinishKey, 'normal');
      expect(row.desiredQuantity, 3);
      expect(row.row.cost, 4.25);
      expect(row.row.notes, 'Original note');
      expect(row.row.sourceRecords.single.rawNumber, '007/100');
      expect(result.summary.matchedRows, 1);
      expect(result.summary.multipleRows, 0);
    },
  );
  test(
    'finish can select the stamped parent without a default preference',
    () async {
      final result = await preview(finish: 'Holofoil', reverseOrder: true);
      expect(result.rows.single.canImport, true);
      expect(result.rows.single.match!.cardId, cardB);
      expect(result.rows.single.cardPrintingId, specialPrinting);
    },
  );
  test('reverse holo remains distinct from holo', () async {
    final result = await preview(
      finish: 'Reverse Holofoil',
      firstFinish: 'reverse',
    );
    expect(result.rows.single.canImport, true);
    expect(result.rows.single.cardPrintingId, normalPrinting);
  });
  test('same finish on both identities stays ambiguous', () async {
    final result = await preview(secondFinish: 'normal');
    expect(result.rows.single.canImport, false);
    expect(result.rows.single.matches.length, 2);
  });
  for (final finish in ['', '1st Edition', 'Unknown Finish']) {
    test('unspecified or unsupported finish stays held: $finish', () async {
      final result = await preview(finish: finish);
      expect(result.rows.single.canImport, false);
      expect(result.rows.single.matches.length, 2);
    });
  }
  test(
    'missing competitor printing evidence cannot be treated as exclusion',
    () async {
      final result = await preview(secondFinish: null);
      expect(result.rows.single.canImport, false);
      expect(result.rows.single.matches.length, 2);
    },
  );
  test(
    'inactive competitor printing evidence cannot remove uncertainty',
    () async {
      final result = await preview(secondActive: false);
      expect(result.rows.single.canImport, false);
      expect(result.rows.single.matches.length, 2);
    },
  );
  test('two children with the requested finish remain held', () async {
    final result = await preview(duplicateFinish: true);
    expect(result.rows.single.canImport, false);
    expect(result.rows.single.cardPrintingId, isNull);
    expect(
      result.rows.single.reviewReasons.join(' '),
      contains('More than one printing'),
    );
  });
  test('no matching finish retains candidates for review', () async {
    final result = await preview(finish: 'Reverse Holofoil');
    expect(result.rows.single.canImport, false);
    expect(result.rows.single.matches.length, 2);
  });
  test('grade guard remains after finish narrows the parent', () async {
    final result = await preview(grade: 'PSA 10');
    expect(result.rows.single.match!.cardId, cardA);
    expect(result.rows.single.canImport, false);
    expect(result.rows.single.row.grade, 'PSA 10');
    expect(
      result.rows.single.reviewReasons.join(' '),
      contains('Grade: PSA 10'),
    );
  });
  test('legacy writer does not use finish disambiguation', () async {
    final result = await preview(sourceAware: false);
    expect(result.rows.single.canImport, false);
    expect(result.rows.single.matches.length, 2);
  });
  test('failed final printing page fails the whole preview', () async {
    await expectLater(preview(failLastPage: true), throwsA(anything));
  });
  test('repeated printing page fails the whole preview', () async {
    await expectLater(
      preview(repeatPage: true),
      throwsA(isA<CollectionImportFailure>()),
    );
  });
  test('unrelated printing page fails the whole preview', () async {
    await expectLater(
      preview(unrelatedPage: true),
      throwsA(isA<CollectionImportFailure>()),
    );
  });
}
