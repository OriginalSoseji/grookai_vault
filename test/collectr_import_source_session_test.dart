import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:grookai_vault/services/import/collection_import_source_session.dart';
import 'package:grookai_vault/screens/account/import_collection_screen.dart';
import 'package:grookai_vault/screens/account/import_collection_history_screen.dart';
import 'collection_import_recovery_test.dart'
    show Fixture, FixturePicker, cardA;

const reverseId = '33333333-3333-4333-8333-333333333333';
const holoId = '44444444-4444-4444-8444-444444444444';
const sourceCsv =
    'Product Name,Category,Set,Card Number,Variance,Grade,Card Condition,Quantity,Average Cost Paid,Portfolio Name,Notes\n'
    'Fixture,Pokemon,Set,1,Reverse Holofoil,Ungraded,LP,2,4.25,Main,Reverse note\n'
    'Fixture,Pokemon,Set,1,Holofoil,Ungraded,NM,1,9,Display,Holo note\n'
    'Fixture,Pokemon,Set,1,Holofoil,PSA 10,NM,1,99,Slabs,Grade retained';

class SourceFixture {
  final f = Fixture();
  final receipts = <String, Map<String, dynamic>>{};
  final copies = <Map<String, dynamic>>[];
  final groups = <Map<String, dynamic>>[];
  List<Map<String, String>> source = [];
  final attempts = <String>[];
  bool loseResponse = false, badReadback = false, missingEndpoint = false;
  bool failPrintingPage = false, ambiguousPrinting = false;
  int terminalFailures = 0;
  SourceFixture() {
    f.catalogSets = [
      {'id': 'fixture-set', 'name': 'Set', 'game': 'pokemon'},
    ];
    f.intercept = (request) {
      Object? result;
      var status = 200;
      if (request.url.path.endsWith('/get_public_card_printing_options_v1')) {
        final offset = jsonDecode(request.body)['p_offset'] as int;
        if (failPrintingPage && offset > 0) {
          throw http.ClientException('late printing failure');
        }
        final printings = [
          {
            'id': reverseId,
            'card_print_id': cardA,
            'finish_key': 'reverse',
            'finish_is_active': true,
          },
          {
            'id': holoId,
            'card_print_id': cardA,
            'finish_key': 'holo',
            'finish_is_active': true,
          },
          if (ambiguousPrinting)
            {
              'id': '55555555-5555-4555-8555-555555555555',
              'card_print_id': cardA,
              'finish_key': 'reverse',
              'finish_is_active': true,
            },
        ];
        // Exercise a server cap below the requested size.
        result = printings.skip(offset).take(1).toList();
      } else if (request.url.path.endsWith('/vault-import-collection-v2')) {
        final body = jsonDecode(request.body) as Map;
        final attempt = body['requestId'] as String;
        attempts.add(attempt);
        if (missingEndpoint) {
          status = 404;
          result = {'error': 'not_found'};
        } else if (terminalFailures > 0) {
          terminalFailures--;
          status = 422;
          result = {'error': 'vault_paused', 'requestId': attempt};
        } else {
          if (!receipts.containsKey(attempt)) {
            final parsed = CollectionImportService.parseCollectrCsv(
              body['csvText'] as String,
            );
            source = parsed.map((r) => r.sourceFields).toList();
            final returned = <Map<String, dynamic>>[];
            var added = 0, entries = 0;
            for (final selection in body['targets'] as List) {
              final indices = (selection['sourceIndices'] as List).cast<int>();
              final existing = groups
                  .where(
                    (g) =>
                        jsonEncode(g['source_indices']) == jsonEncode(indices),
                  )
                  .firstOrNull;
              final row = CollectionImportService.normalizeRow(
                parsed[indices.first],
              );
              final quantity = indices.fold(
                0,
                (n, i) =>
                    n +
                    CollectionImportService.normalizeRow(parsed[i]).quantity,
              );
              final ids = existing == null
                  ? <String>[]
                  : (existing['instance_ids'] as List).cast<String>();
              if (existing == null) {
                for (var i = 0; i < quantity; i++) {
                  final id =
                      '${(copies.length + 1).toString().padLeft(8, '0')}-1111-4111-8111-111111111111';
                  copies.add({
                    'id': id,
                    'card_print_id': selection['cardId'],
                    'card_printing_id': selection['cardPrintingId'],
                    'condition_label': row.condition,
                    'acquisition_cost': row.cost,
                    'notes': row.notes,
                    'created_at': row.added ?? '2026-01-01T00:00:00Z',
                    'is_graded': false,
                  });
                  ids.add(id);
                  added++;
                }
                entries++;
                groups.add({
                  'group_key': groups.length.toString().padLeft(64, '0'),
                  'source_indices': indices,
                  'instance_ids': ids,
                  'target': selection,
                });
              }
              returned.add({
                ...Map<String, dynamic>.from(selection as Map),
                'instanceIds': ids,
              });
            }
            receipts[attempt] = {
              'success': true,
              'requestId': attempt,
              'sourceSha256': sha256
                  .convert(utf8.encode(body['csvText'] as String))
                  .toString(),
              'sourceRows': source.length,
              'reviewRows':
                  source.length -
                  groups.fold<int>(
                    0,
                    (n, g) => n + (g['source_indices'] as List).length,
                  ),
              'importedCards': added,
              'importedEntries': entries,
              'targets': returned,
            };
          }
          result = receipts[attempt];
          if (loseResponse) {
            loseResponse = false;
            throw http.ClientException('response lost');
          }
        }
      } else if (request.url.path.endsWith(
        '/vault_collection_import_documents_v2',
      )) {
        result = request.url.queryParameters['select']!.contains('source_rows')
            ? {'source_rows': source}
            : [
                {
                  'source_sha256': '0' * 64,
                  'created_at': '2026-09-30T00:00:00Z',
                },
              ];
      } else if (request.url.path.endsWith(
        '/vault_collection_import_groups_v2',
      )) {
        final after = request.url.queryParameters['group_key']?.replaceFirst(
          'gt.',
          '',
        );
        final matching = groups
            .where(
              (g) =>
                  after == null ||
                  (g['group_key'] as String).compareTo(after) > 0,
            )
            .toList();
        matching.sort(
          (a, b) =>
              (a['group_key'] as String).compareTo(b['group_key'] as String),
        );
        result =
            (request.url.queryParameters['order']?.startsWith(
                          'group_key.desc',
                        ) ==
                        true
                    ? matching.reversed
                    : matching)
                .take(1)
                .toList();
      } else if (request.url.path.endsWith('/vault_item_instances')) {
        result = badReadback ? [] : copies;
      } else {
        return null;
      }
      return http.Response(
        jsonEncode(result),
        status,
        headers: {'content-type': 'application/json'},
        request: request,
      );
    };
  }
  Future<CollectionImportSourceSession> prepare() =>
      CollectionImportSourceSession.prepare(
        client: f.client,
        csvText: sourceCsv,
      );
}

void main() {
  Future<SourceFixture> setup() async {
    final s = SourceFixture();
    addTearDown(s.f.client.dispose);
    await s.f.signIn();
    return s;
  }

  test(
    'source preview resolves finishes independently and keeps grades for review',
    () async {
      final s = await setup();
      final session = await s.prepare();
      expect(session.preview.summary.matchedRows, 2);
      expect(session.preview.rows.map((r) => r.cardPrintingId), [
        reverseId,
        holoId,
        holoId,
      ]);
      expect(session.preview.rows.last.canImport, false);
      final result = await session.save(s.f.client);
      expect(result.importedCards, 3);
      expect(result.needsManualMatch, 1);
      expect(s.copies.map((r) => r['acquisition_cost']), [4.25, 4.25, 9]);
      expect(s.source.last['Grade'], 'PSA 10');
      expect(
        s.f.requests.any(
          (r) => r.url.path.endsWith('/vault-import-targets-v1'),
        ),
        false,
      );
    },
  );
  test(
    'lost response keeps the same request; reopening reconciles the same file',
    () async {
      final s = await setup();
      final session = await s.prepare();
      s.loseResponse = true;
      await expectLater(
        session.save(s.f.client),
        throwsA(isA<CollectionImportFailure>()),
      );
      final result = await session.save(s.f.client);
      expect(result.importedCards, 3);
      expect(s.attempts[0], s.attempts[1]);
      expect(s.copies.length, 3);
      final reopened = await s.prepare();
      expect((await reopened.save(s.f.client)).importedCards, 0);
      expect(s.copies.length, 3);
    },
  );
  test('confirmed failed receipt permits a new request on retry', () async {
    final s = await setup();
    final session = await s.prepare();
    s.terminalFailures = 1;
    await expectLater(
      session.save(s.f.client),
      throwsA(isA<CollectionImportFailure>()),
    );
    expect((await session.save(s.f.client)).importedCards, 3);
    expect(s.attempts[0], isNot(s.attempts[1]));
  });
  test(
    'missing endpoint and incomplete independent readback never use V1 fallback',
    () async {
      final s = await setup();
      final session = await s.prepare();
      s.missingEndpoint = true;
      await expectLater(
        session.save(s.f.client),
        throwsA(isA<CollectionImportFailure>()),
      );
      expect(s.copies, isEmpty);
      s.missingEndpoint = false;
      s.badReadback = true;
      await expectLater(
        session.save(s.f.client),
        throwsA(isA<CollectionImportFailure>()),
      );
      expect(
        s.f.requests.any(
          (r) => r.url.path.endsWith('/vault-import-targets-v1'),
        ),
        false,
      );
    },
  );
  test(
    'late printing failure and duplicate finish options cannot produce a ready match',
    () async {
      final s = await setup();
      s.failPrintingPage = true;
      await expectLater(s.prepare(), throwsA(anything));
      s.failPrintingPage = false;
      s.ambiguousPrinting = true;
      final session = await s.prepare();
      expect(session.preview.rows.first.canImport, false);
    },
  );
  testWidgets(
    'saved history exposes review source without counting it as owned',
    (tester) async {
      final s = SourceFixture();
      addTearDown(() => tester.runAsync(s.f.client.dispose));
      await tester.runAsync(() async {
        await s.f.signIn();
        final session = await s.prepare();
        await session.save(s.f.client);
      });
      await tester.pumpWidget(
        MaterialApp(home: ImportCollectionHistoryScreen(client: s.f.client)),
      );
      Future<void> settle(String text) async {
        for (var i = 0; i < 80; i++) {
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 10)),
          );
          await tester.pumpAndSettle();
          if (find.textContaining(text).evaluate().isNotEmpty) return;
        }
        fail('Missing $text');
      }

      await settle('Imported 2026-09-30');
      await tester.tap(find.text('Imported 2026-09-30'));
      await settle('Needs review (1)');
      expect(find.textContaining('Needs review; not owned'), findsOneWidget);
      await tester.tap(find.text('Fixture'));
      await tester.pumpAndSettle();
      expect(find.text('PSA 10'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'phone default importer retries source-aware save and retains review row',
    (tester) async {
      final s = SourceFixture();
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      addTearDown(() => tester.runAsync(s.f.client.dispose));
      await tester.runAsync(s.f.signIn);
      s.loseResponse = true;
      FilePicker.platform = FixturePicker(csv: sourceCsv);
      await tester.pumpWidget(
        MaterialApp(home: ImportCollectionScreen(client: s.f.client)),
      );
      Future<void> settle(String text) async {
        for (var i = 0; i < 100; i++) {
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 10)),
          );
          await tester.pumpAndSettle();
          if (find.textContaining(text).evaluate().isNotEmpty) return;
        }
        fail(
          'Missing $text; attempts=${s.attempts.length}; requests=${s.f.requests.map((r) => r.url.path).toList()}; visible=${tester.widgetList<Text>(find.byType(Text)).map((w) => w.data).toList()}',
        );
      }

      await tester.tap(find.text('Choose CSV'));
      await settle('Ready 2');
      await tester.ensureVisible(find.text('Import to Vault'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Import to Vault'));
      await settle('Retry import');
      await tester.ensureVisible(find.text('Retry import'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retry import'));
      await settle('Imported 3 cards');
      expect(s.copies.length, 3);
      expect(s.attempts[0], s.attempts[1]);
      expect(tester.takeException(), isNull);
    },
  );
}
