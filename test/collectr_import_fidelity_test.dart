import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/account/import_collection_screen.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'collection_import_recovery_test.dart'
    show Fixture, FixturePicker, cardA, cardB;

const header =
    'Portfolio Name,Category,Set,Product Name,Card Number,Variance,Grade,Card Condition,Average Cost Paid,Quantity,Watchlist,Date Added,Notes';
Map<String, dynamic> card(String id, String set, {String number = '1'}) => {
  'id': id,
  'gv_id': 'GV-$id',
  'name': 'Fixture',
  'number': number,
  'set_id': set,
  'set_code': 'TEST',
};

void main() {
  Future<Fixture> fixture() async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    return f;
  }

  test(
    'reads through server-capped pages and normalizes both collector numbers',
    () async {
      final f = await fixture();
      f.catalogPageSize = 1;
      f.catalogSets = [
        {'id': 'a', 'name': 'Another set', 'game': 'pokemon'},
        {'id': 'b', 'name': 'Set', 'game': 'pokemon'},
      ];
      f.catalogCards = [
        card(cardA, 'b', number: '2'),
        card(cardB, 'b', number: '065/165'),
      ];
      final preview = await CollectionImportService.buildPreview(
        client: f.client,
        csvText:
            'Category,Product Name,Set,Card Number,Quantity\nPokemon,Fixture,Set,00065,2',
      );
      expect(preview.rows.single.match!.cardId, cardB);
      expect(preview.rows.single.canImport, true);
      expect(f.requests.where((r) => r.url.path.endsWith('/sets')).length, 3);
      expect(
        f.requests.where((r) => r.url.path.endsWith('/card_prints')).length,
        3,
      );
      expect(
        f.requests.any((r) => r.url.queryParameters.containsKey('number')),
        false,
      );
    },
  );

  test(
    'game scopes same-named sets; no-category ambiguity remains reviewable',
    () async {
      final f = await fixture();
      f.catalogSets = [
        {'id': 'a', 'name': 'Set', 'game': 'mtg'},
        {'id': 'b', 'name': 'Set', 'game': 'pokemon'},
      ];
      f.catalogCards = [card(cardA, 'a'), card(cardB, 'b')];
      final scoped = await CollectionImportService.buildPreview(
        client: f.client,
        csvText: 'Category,Product Name,Set,Card Number\nPokemon,Fixture,Set,1',
      );
      expect(scoped.rows.single.match!.cardId, cardB);
      final ambiguous = await CollectionImportService.buildPreview(
        client: f.client,
        csvText: 'Product Name,Set,Card Number\nFixture,Set,1',
      );
      expect(ambiguous.rows.single.matches.length, 2);
      expect(ambiguous.rows.single.canImport, false);
    },
  );

  test(
    'finishes, grades, costs and portfolios stay separate and cannot use the lossy writer',
    () async {
      final f = await fixture();
      f.catalogSets = [
        {'id': 'fixture-set', 'name': 'Set', 'game': 'pokemon'},
      ];
      final preview = await CollectionImportService.buildPreview(
        client: f.client,
        csvText:
            '$header\nMain,Pokemon,Set,Fixture,1,Holofoil,Ungraded,Near Mint,5,2,false,2026-09-01,First\n'
            'Display,Pokemon,Set,Fixture,1,Reverse Holofoil,PSA 10,Near Mint,70,1,false,2026-09-02,Second',
      );
      expect(preview.report.rowsRead, 2);
      expect(preview.report.sourceQuantity, 3);
      expect(preview.rows.length, 2);
      expect(preview.rows.map((r) => r.row.finish), [
        'Holofoil',
        'Reverse Holofoil',
      ]);
      expect(preview.rows.map((r) => r.row.grade), ['Ungraded', 'PSA 10']);
      expect(preview.rows.map((r) => r.row.cost), [5, 70]);
      expect(preview.rows.map((r) => r.row.portfolio), ['Main', 'Display']);
      expect(preview.rows.every((r) => !r.canImport), true);
      expect(preview.rows.expand((r) => r.row.sourceRows), [2, 3]);
      final result = await CollectionImportService.importPreview(
        client: f.client,
        preview: preview,
      );
      expect(result.importedCards, 0);
      expect(result.needsManualMatch, 2);
      expect(
        f.requests.where((r) => r.url.path.contains('/functions/')),
        isEmpty,
      );
    },
  );

  test(
    'numberless, unsupported games, watchlist and malformed values are visible',
    () async {
      final f = await fixture();
      final preview = await CollectionImportService.buildPreview(
        client: f.client,
        csvText:
            '$header\nSealed,Pokemon,Set,Box,,,Ungraded,,20,3,false,,\n'
            'Main,Unsupported Game,Set,Fixture,1,Normal,Ungraded,NM,3,1,false,,\n'
            'Main,Pokemon,Set,Fixture,1,Normal,Ungraded,NM,3,1,true,,\n'
            'Main,Pokemon,Set,Fixture,1,Normal,Ungraded,unknown,NaN,0,false,2026-02-30,',
      );
      expect(preview.rows.length, 4);
      expect(preview.report.rowsInvalid, 4);
      expect(preview.rows.every((r) => !r.canImport), true);
      expect(preview.rows.first.row.sourceFields['Product Name'], 'Box');
      expect(
        preview.rows[2].reviewReasons.join(' '),
        contains('not counted as owned'),
      );
      expect(
        preview.rows.last.reviewReasons.join(' '),
        contains('positive whole number'),
      );
      expect(preview.rows.last.row.added, isNull);
    },
  );

  test(
    'byte-identical duplicates retain source references and summed quantities',
    () async {
      final f = await fixture();
      final p = await CollectionImportService.buildPreview(
        client: f.client,
        csvText:
            'Product Name,Set,Card Number,Quantity,Notes\nFixture,Set,1,2,"line 1\nline 2"\nFixture,Set,1,3,"line 1\nline 2"',
      );
      expect(p.rows.single.desiredQuantity, 5);
      expect(p.rows.single.row.sourceRows, [2, 3]);
      expect(p.rows.single.row.sourceRecords.map((r) => r.rawQuantity), [
        '2',
        '3',
      ]);
      expect(p.rows.single.row.notes, 'line 1\nline 2');
    },
  );

  test(
    'distinct purchase metadata and unknown populated columns need review',
    () async {
      final f = await fixture();
      final p = await CollectionImportService.buildPreview(
        client: f.client,
        csvText:
            'Product Name,Set,Card Number,Quantity,Cost,Notes\nFixture,Set,1,2,5,First purchase\nFixture,Set,1,1,7,Second purchase',
      );
      expect(p.rows.length, 2);
      expect(p.rows.map((r) => r.row.cost), [5, 7]);
      expect(p.rows.every((r) => !r.canImport), true);
      final unknown = await CollectionImportService.buildPreview(
        client: f.client,
        csvText:
            'Product Name,Set,Card Number,Certificate Number\nFixture,Set,1,01234567',
      );
      expect(unknown.rows.single.canImport, false);
      expect(
        unknown.rows.single.row.sourceFields['Certificate Number'],
        '01234567',
      );
      expect(
        unknown.rows.single.reviewReasons.join(' '),
        contains('Certificate Number'),
      );
      expect(f.saved, isEmpty);
    },
  );

  test(
    'late catalog failures and repeating pages never return a partial preview',
    () async {
      final f = await fixture();
      f.failLaterCatalogPage = true;
      const csv = 'Product Name,Set,Card Number\nFixture,Set,1';
      await expectLater(
        CollectionImportService.buildPreview(client: f.client, csvText: csv),
        throwsException,
      );
      f.failLaterCatalogPage = false;
      f.repeatCatalogPage = true;
      await expectLater(
        CollectionImportService.buildPreview(client: f.client, csvText: csv),
        throwsA(isA<CollectionImportFailure>()),
      );
      expect(f.saved, isEmpty);
    },
  );

  test(
    'rejects malformed CSV without discarding fields; accepts BOM and escaped quotes',
    () {
      for (final csv in [
        'Product Name,Set,Card Number,Notes,Notes\nA,B,1,x,y',
        'Product Name,Set,Card Number\nA,B,1,extra',
        'Product Name,Set,Card Number\n"A,B,1',
        'Product Name,Set,Card Number\nA"B",C,1',
        'Product Name,Set,Card Number\n"A"B,C,1',
      ]) {
        expect(
          () => CollectionImportService.parseCollectrCsv(csv),
          throwsA(isA<CollectionImportFailure>()),
        );
      }
      final row = CollectionImportService.parseCollectrCsv(
        '\ufeffProduct Name,Set,Card Number,Notes\nA,B,1,"A ""quoted"" note"',
      ).single;
      expect(row.rawNotes, 'A "quoted" note');
    },
  );

  test(
    'aliases stay game-scoped and physical name distinctions are retained',
    () {
      expect(
        CollectionImportService.normalizeImportSetForCompare(
          'SV: 151',
          gameCode: 'pokemon',
        ),
        '151',
      );
      expect(
        CollectionImportService.normalizeImportSetForCompare(
          'SV: 151',
          gameCode: 'mtg',
        ),
        'sv: 151',
      );
      expect(
        CollectionImportService.normalizeImportNameForCompare(
          'Pikachu (Red Cheeks)',
        ),
        'pikachu (red cheeks)',
      );
      expect(
        CollectionImportService.normalizeImportNameForCompare(
          'Fixture (Full Art)',
        ),
        'fixture (full art)',
      );
      expect(
        CollectionImportService.normalizeImportNumberForCompare('swsh0001'),
        'SWSH1',
      );
      expect(
        CollectionImportService.normalizeImportNumberForCompare('TG01/TG30'),
        'TG1',
      );
    },
  );

  testWidgets(
    'phone preview shows finish, grade and review reason with no enabled save',
    (tester) async {
      final f = Fixture();
      addTearDown(() => tester.runAsync(f.client.dispose));
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.runAsync(f.signIn);
      f.catalogSets = [
        {'id': 'fixture-set', 'name': 'Set', 'game': 'pokemon'},
      ];
      final fontPath = Platform.environment['GV_COLLECTR_TEST_FONT'];
      if (fontPath != null) {
        await tester.runAsync(() async {
          final bytes = File(fontPath).readAsBytesSync();
          await (FontLoader(
            'CollectrTest',
          )..addFont(Future.value(ByteData.sublistView(bytes)))).load();
        });
      }
      FilePicker.platform = FixturePicker(
        csv:
            '$header\nMain,Pokemon,Set,Fixture,1,Reverse Holofoil,PSA 10,NM,50,1,false,,',
      );
      const captureKey = ValueKey('collectr-fidelity-capture');
      await tester.pumpWidget(
        RepaintBoundary(
          key: captureKey,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              fontFamily: fontPath == null ? null : 'CollectrTest',
            ),
            home: ImportCollectionScreen(
              client: f.client,
              sourceAwareImport: false,
            ),
          ),
        ),
      );
      await tester.tap(find.text('Choose CSV'));
      for (var i = 0; i < 80; i++) {
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 10)),
        );
        await tester.pumpAndSettle();
        if (find.text('Ready 0').evaluate().isNotEmpty) break;
      }
      expect(find.text('Ready 0'), findsOneWidget);
      expect(find.textContaining('Reverse Holofoil'), findsWidgets);
      expect(find.textContaining('PSA 10'), findsWidgets);
      await tester.ensureVisible(find.text('Import to Vault'));
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Import to Vault'),
            )
            .onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
      final captureRoot = Platform.environment['GV_COLLECTR_PRIVATE_FIXTURE'];
      if (captureRoot != null) {
        await tester.pumpAndSettle();
        await tester.runAsync(() async {
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(captureKey),
          );
          final picture = await boundary.toImage(pixelRatio: 2);
          final png = await picture.toByteData(format: ui.ImageByteFormat.png);
          File(
            '$captureRoot/repair-widget-preview.png',
          ).writeAsBytesSync(png!.buffer.asUint8List());
          picture.dispose();
        });
      }
    },
  );

  // Opt-in private, offline replay. Neither CSV nor catalog snapshot is checked in.
  final privateRoot = Platform.environment['GV_COLLECTR_PRIVATE_FIXTURE'];
  test(
    'private export retains every source row, quantity and field',
    () async {
      final f = await fixture();
      final root = privateRoot!;
      final source = File('$root/source-rows.private.json');
      final original = jsonDecode(source.readAsStringSync()) as List;
      final baseline =
          jsonDecode(
                File(
                  '$root/catalog-baseline-v2.private.json',
                ).readAsStringSync(),
              )
              as Map;
      f.catalogSets = (baseline['sets'] as List)
          .map((r) => Map<String, dynamic>.from(r as Map))
          .toList();
      f.catalogCards =
          (jsonDecode(
                    File(
                      '$root/catalog-cards-v2.private.json',
                    ).readAsStringSync(),
                  )
                  as List)
              .where((r) => r['catalog_visible'] == true)
              .map((r) => Map<String, dynamic>.from(r as Map))
              .toList();
      f.catalogPageSize = 137;
      final identityFile = File('$root/catalog-identities.private.json');
      if (identityFile.existsSync()) {
        f.catalogIdentities =
            (jsonDecode(identityFile.readAsStringSync()) as List)
                .map((row) => Map<String, dynamic>.from(row as Map))
                .toList();
      }
      final text = File(
        Platform.environment['GV_COLLECTR_PRIVATE_CSV']!,
      ).readAsStringSync();
      final p = await CollectionImportService.buildPreview(
        client: f.client,
        csvText: text,
      );
      final sourceRows = p.rows.expand((r) => r.row.sourceRows).toList()
        ..sort();
      expect(sourceRows, List.generate(original.length, (i) => i + 2));
      expect(p.report.rowsRead, original.length);
      expect(
        p.report.sourceQuantity,
        original.fold<int>(0, (sum, row) => sum + int.parse(row['Quantity'])),
      );
      for (final row in p.rows) {
        for (final record in row.row.sourceRecords) {
          final a = Map<String, dynamic>.from(
            original[record.sourceRow - 2] as Map,
          );
          expect(
            record.sourceFields,
            a,
            reason: 'Source row ${record.sourceRow} changed',
          );
        }
      }
      expect(f.saved, isEmpty);
      File('$root/catalog-matched-parent-ids.private.json').writeAsStringSync(
        jsonEncode(
          p.rows
              .where((r) => r.match != null)
              .map((r) => r.match!.cardId)
              .toSet()
              .toList()
            ..sort(),
        ),
      );
      final result = <String, dynamic>{
        'status': 'PASS_OFFLINE_PRIVATE_REPLAY',
        'sourceRows': p.report.rowsRead,
        'sourceQuantity': p.report.sourceQuantity,
        'previewGroups': p.rows.length,
        'uniqueCatalogMatches': p.rows.where((r) => r.match != null).length,
        'readyToSaveWithLegacyWriter': p.summary.matchedRows,
        'gradedGroupsRetained': p.rows
            .where((r) => r.row.grade.isNotEmpty && r.row.grade != 'Ungraded')
            .length,
        'numberlessGroupsRetained': p.rows
            .where((r) => r.row.number.isEmpty)
            .length,
        'everySourceFieldPreserved': true,
        'productionWrites': 0,
        'savedCopies': 0,
      };
      File(
        '$root/repair-offline-replay.json',
      ).writeAsStringSync(const JsonEncoder.withIndent('  ').convert(result));
      final printingFile = File('$root/catalog-printings-v2.private.json');
      if (printingFile.existsSync()) {
        final printings = jsonDecode(printingFile.readAsStringSync()) as List;
        f.intercept = (request) {
          if (!request.url.path.endsWith(
            '/get_public_card_printing_options_v1',
          )) {
            return null;
          }
          final args = jsonDecode(request.body) as Map;
          final ids = args['p_card_print_ids'] as List;
          final page = printings
              .where((p) => ids.contains(p['card_print_id']))
              .skip(args['p_offset'] as int)
              .take(137)
              .toList();
          return http.Response(
            jsonEncode(page),
            200,
            headers: {'content-type': 'application/json'},
            request: request,
          );
        };
        final v2 = await CollectionImportService.buildPreview(
          client: f.client,
          csvText: text,
          sourceAware: true,
        );
        File('$root/preview-ledger.private.json').writeAsStringSync(
          const JsonEncoder.withIndent('  ').convert([
            for (final entry in v2.rows)
              {
                'sourceRows': entry.row.sourceRows,
                'game': entry.row.gameCode,
                'name': entry.row.displayName,
                'set': entry.row.displaySet,
                'number': entry.row.displayNumber,
                'compareSet': entry.row.compareSet,
                'compareName': entry.row.compareName,
                'compareNumber': entry.row.compareNumber,
                'quantity': entry.desiredQuantity,
                'finish': entry.row.finish,
                'grade': entry.row.grade,
                'ready': entry.canImport,
                'status': entry.status.name,
                'reasons': entry.reviewReasons,
                'cardId': entry.match?.cardId,
                'printingId': entry.cardPrintingId,
                'matches': entry.matches.map((match) => match.cardId).toList(),
              },
          ]),
        );
        expect(v2.report.rowsRead, original.length);
        expect(
          v2.summary.matchedRows,
          greaterThan(0),
          reason:
              'The real export must have usable verified matches, not merely retained review rows.',
        );
        expect(
          v2.rows.expand((r) => r.row.sourceRecords).length,
          original.length,
        );
        expect(
          v2.rows
              .where((r) => r.canImport)
              .every((r) => r.row.grade == 'Ungraded' || r.row.grade.isEmpty),
          true,
        );
        expect(
          v2.rows
              .where((r) => r.canImport && r.row.finish.isNotEmpty)
              .every((r) => r.cardPrintingId != null),
          true,
        );
        expect(f.saved, isEmpty);
        File('$root/repair-source-aware-offline-replay.json').writeAsStringSync(
          const JsonEncoder.withIndent('  ').convert({
            'status': 'PASS_OFFLINE_SOURCE_AWARE_PREVIEW',
            'sourceRows': v2.report.rowsRead,
            'sourceQuantity': v2.report.sourceQuantity,
            'readyGroups': v2.summary.matchedRows,
            'readyQuantity': v2.rows
                .where((r) => r.canImport)
                .fold<int>(0, (n, r) => n + r.desiredQuantity),
            'reviewGroups': v2.rows.where((r) => !r.canImport).length,
            'gradedRowsRetainedForReview': v2.rows
                .where(
                  (r) =>
                      r.row.grade.isNotEmpty &&
                      r.row.grade != 'Ungraded' &&
                      !r.canImport,
                )
                .length,
            'productionWrites': 0,
            'savedCopies': 0,
          }),
        );
      }
    },
    skip: privateRoot == null
        ? 'Private export is opt-in and stays outside the repository.'
        : false,
  );
}
