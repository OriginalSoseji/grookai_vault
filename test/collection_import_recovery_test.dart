import 'dart:convert';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/screens/account/import_collection_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const cardA = '11111111-1111-4111-8111-111111111111';
const cardB = '22222222-2222-4222-8222-222222222222';

class Fixture {
  http.Response? Function(http.Request)? intercept;
  final requests = <http.Request>[];
  final saved = <String, int>{};
  String owner = 'owner';
  bool extraCandidate = false;
  bool loseResponse = false,
      paused = false,
      missingEndpoint = false,
      badReadback = false;
  int slabOnly = 0;
  List<Map<String, dynamic>>? catalogSets;
  List<Map<String, dynamic>>? catalogCards;
  int catalogPageSize = 500;
  bool failLaterCatalogPage = false;
  bool repeatCatalogPage = false;
  List<Map<String, dynamic>> catalogPage(
    http.Request request,
    List<Map<String, dynamic>> rows,
  ) {
    if (request.url.queryParameters.containsKey('id') && failLaterCatalogPage) {
      throw http.ClientException('catalog page unavailable');
    }
    var result = [...rows]
      ..sort((a, b) => (a['id'] as String).compareTo(b['id'] as String));
    final after = request.url.queryParameters['id']?.replaceFirst('gt.', '');
    if (after != null && !repeatCatalogPage) {
      result = result
          .where((row) => (row['id'] as String).compareTo(after) > 0)
          .toList();
    }
    final setFilter = request.url.queryParameters['set_id'];
    if (setFilter != null) {
      result = result
          .where((row) => setFilter.contains(row['set_id'] as String))
          .toList();
    }
    if (request.url.queryParameters['order']?.startsWith('id.desc') == true) {
      result = result.reversed.toList();
    }
    return result.take(catalogPageSize).toList();
  }

  late final client = SupabaseClient(
    'http://127.0.0.1:54321',
    'fixture-key',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient((request) async {
      dynamic body;
      int status = 200;
      if (request.url.path.contains('/auth/')) {
        final payload = base64Url
            .encode(utf8.encode(jsonEncode({'exp': 4000000000, 'sub': owner})))
            .replaceAll('=', '');
        body = {
          'access_token': 'e30.$payload.fixture',
          'refresh_token': 'fixture',
          'expires_in': 3600,
          'token_type': 'bearer',
          'user': {
            'id': owner,
            'email': 'fixture@example.test',
            'aud': 'authenticated',
            'created_at': '2026-09-27T00:00:00Z',
          },
        };
      } else {
        requests.add(request);
        final intercepted = intercept?.call(request);
        if (intercepted != null) return intercepted;
        if (request.url.path.endsWith('/vault-import-targets-v1')) {
          if (paused || missingEndpoint) {
            status = paused ? 503 : 404;
            body = {'error': paused ? 'vault_paused' : 'not_found'};
          } else {
            final rows = jsonDecode(request.body)['rows'] as List;
            int added = 0, entries = 0;
            for (final row in rows) {
              final id = row['cardId'] as String;
              final desired = row['desiredQuantity'] as int;
              final owned = (saved[id] ?? 0) + (id == cardA ? slabOnly : 0);
              if (desired > owned) {
                final delta = desired - owned;
                added += delta;
                entries++;
                saved[id] = (saved[id] ?? 0) + delta;
              }
            }
            if (loseResponse) {
              loseResponse = false;
              throw http.ClientException('response lost');
            }
            body = {
              'success': true,
              'importedCards': added,
              'importedEntries': entries,
              'targets': [
                for (final row in rows)
                  {
                    'cardPrintId': row['cardId'],
                    'expectedCount':
                        (saved[row['cardId']] ?? 0) +
                        (row['cardId'] == cardA ? slabOnly : 0),
                  },
              ],
            };
          }
        } else if (request.url.path.endsWith('/sets')) {
          body = catalogPage(
            request,
            catalogSets ??
                [
                  {'id': 'fixture-set', 'name': 'Set', 'code': 'TEST'},
                ],
          );
        } else if (request.url.path.endsWith('/card_prints')) {
          body = catalogPage(
            request,
            catalogCards ??
                [
                  {
                    'id': cardA,
                    'gv_id': 'GV-$cardA',
                    'name': 'Fixture',
                    'number': '1',
                    'set_id': 'fixture-set',
                    'sets': {'name': 'Set'},
                    'set_code': 'TEST',
                  },
                  if (extraCandidate)
                    {
                      'id': cardB,
                      'gv_id': 'GV-$cardB',
                      'name': 'Fixture',
                      'number': '1',
                      'set_id': 'fixture-set',
                      'sets': {'name': 'Set'},
                      'set_code': 'TEST',
                    },
                ],
          );
        } else if (request.url.path.endsWith('/vault_item_instances')) {
          final slab =
              request.url.queryParameters['card_print_id'] == 'is.null';
          body = slab
              ? [
                  for (var i = 0; i < slabOnly; i++) {'slab_cert_id': 'cert'},
                ]
              : [
                  if (!badReadback)
                    for (final entry in saved.entries)
                      for (var i = 0; i < entry.value; i++)
                        {'card_print_id': entry.key},
                ];
        } else if (request.url.path.endsWith('/slab_certs')) {
          body = [
            {'id': 'cert', 'card_print_id': cardA},
          ];
        } else if (request.url.path.endsWith(
          '/card_events_emit_vault_import_summary_v1',
        )) {
          body = null;
        } else {
          throw StateError('Unexpected request: ${request.url.path}');
        }
      }
      return http.Response(
        jsonEncode(body),
        status,
        headers: {'content-type': 'application/json'},
        request: request,
      );
    }),
  );
  Future<void> signIn() => client.auth
      .signInWithPassword(email: 'fixture@example.test', password: 'fixture')
      .then((_) {});
}

CollectionImportPreview preview({String owner = 'owner'}) =>
    CollectionImportPreview(
      ownerUserId: owner,
      rows: [
        for (final id in [cardA, cardB])
          CollectionImportPreviewRow(
            row: CollectionImportService.normalizeRow(
              CollectionImportParsedRow(
                sourceRow: 2,
                rawName: 'Fixture',
                rawSet: 'Set',
                rawNumber: '1',
                rawQuantity: '3',
                rawCondition: 'LP',
                rawCost: '4.25',
                rawDate: '2026-01-01',
                rawNotes: 'Keep notes',
              ),
            ),
            status: CollectionImportMatchStatus.matched,
            compareKey: id,
            desiredQuantity: 3,
            importQuantity: 1,
            match: CollectionImportCardMatch(
              cardId: id,
              gvId: 'GV-$id',
              name: 'Fixture',
              setName: 'Set',
              number: '1',
            ),
          ),
      ],
      summary: const CollectionImportPreviewSummary(
        totalRows: 2,
        matchedRows: 2,
        multipleRows: 0,
        unmatchedRows: 0,
      ),
      report: const CollectionImportReport(
        rowsRead: 2,
        rowsCollapsed: 2,
        rowsValid: 2,
        rowsInvalid: 0,
        rowsMatched: 2,
        rowsMissing: 0,
      ),
    );

class FixturePicker extends FilePicker {
  FixturePicker({
    this.csv = 'Product Name,Set,Card Number,Quantity\nFixture,Set,1,3',
  });
  final String csv;
  @override
  Future<FilePickerResult?> pickFiles({
    String? dialogTitle,
    String? initialDirectory,
    FileType type = FileType.any,
    List<String>? allowedExtensions,
    Function(FilePickerStatus)? onFileLoading,
    bool allowCompression = true,
    int compressionQuality = 30,
    bool allowMultiple = false,
    bool withData = false,
    bool withReadStream = false,
    bool lockParentWindow = false,
    bool readSequential = false,
  }) async {
    final bytes = Uint8List.fromList(utf8.encode(csv));
    return FilePickerResult([
      PlatformFile(name: 'recovery.csv', size: bytes.length, bytes: bytes),
    ]);
  }
}

void main() {
  const csv = 'Product Name,Set,Card Number,Quantity\nFixture,Set,1,3';
  test(
    'preview subtracts existing copies with the same normalized identity key',
    () async {
      final f = Fixture();
      addTearDown(f.client.dispose);
      await f.signIn();
      f.saved[cardA] = 2;
      final result = await CollectionImportService.buildPreview(
        client: f.client,
        csvText: csv,
      );
      expect(result.rows.single.importQuantity, 1);
      expect(result.rows.single.desiredQuantity, 3);
      f.saved[cardA] = 3;
      expect(
        (await CollectionImportService.buildPreview(
          client: f.client,
          csvText: csv,
        )).rows,
        isEmpty,
      );
    },
  );
  test('already owned candidate cannot hide an ambiguous printing', () async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.saved[cardA] = 3;
    f.extraCandidate = true;
    final result = await CollectionImportService.buildPreview(
      client: f.client,
      csvText: csv,
    );
    expect(result.rows.single.status, CollectionImportMatchStatus.multiple);
    expect(result.rows.single.matches.length, 2);
  });

  testWidgets(
    'screen retains CSV after interruption and retry reaches verified success',
    (tester) async {
      final f = Fixture();
      addTearDown(() => tester.runAsync(f.client.dispose));
      await tester.binding.setSurfaceSize(const Size(800, 1200));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.runAsync(f.signIn);
      Future<void> settleUntil(Finder finder) async {
        for (var i = 0; i < 100; i++) {
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 10)),
          );
          await tester.pumpAndSettle();
          if (finder.evaluate().isNotEmpty) return;
        }
        fail(
          'Missing $finder; requests: ${f.requests.map((r) => r.url.path).toList()}',
        );
      }

      f.loseResponse = true;
      FilePicker.platform = FixturePicker();
      await tester.pumpWidget(
        MaterialApp(
          home: ImportCollectionScreen(
            client: f.client,
            sourceAwareImport: false,
          ),
        ),
      );
      await tester.tap(find.text('Choose CSV'));
      await settleUntil(find.text('File: recovery.csv'));
      expect(find.text('File: recovery.csv'), findsOneWidget);
      await tester.ensureVisible(find.text('Import to Vault'));
      await tester.tap(find.text('Import to Vault'));
      await settleUntil(find.text('Retry import'));
      expect(f.saved[cardA], 3);
      expect(
        find.textContaining('Some cards may already be saved'),
        findsOneWidget,
      );
      expect(find.text('File: recovery.csv'), findsOneWidget);
      await tester.ensureVisible(find.text('Retry import'));
      await tester.tap(find.text('Retry import'));
      await settleUntil(find.textContaining('Imported 0 cards'));
      expect(find.textContaining('Imported 0 cards'), findsOneWidget);
      expect(f.saved[cardA], 3);
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Import to Vault'),
            )
            .onPressed,
        isNull,
      );
    },
  );
  test(
    'one batch sends desired totals and metadata, verifies copies before success',
    () async {
      final f = Fixture();
      addTearDown(f.client.dispose);
      await f.signIn();
      f.saved[cardA] = 2;
      final result = await CollectionImportService.importPreview(
        client: f.client,
        preview: preview(),
      );
      expect(result.importedCards, 4);
      expect(result.importedEntries, 2);
      final writes = f.requests
          .where((r) => r.url.path.contains('/functions/'))
          .toList();
      expect(writes.length, 1);
      final rows = jsonDecode(writes.single.body)['rows'] as List;
      expect(rows.first['desiredQuantity'], 3);
      expect(rows.first['acquisitionCost'], 4.25);
      expect(rows.first['notes'], 'Keep notes');
      expect(rows.first['createdAt'], isNotNull);
      expect(f.saved, {cardA: 3, cardB: 3});
    },
  );
  test(
    'response lost after commit retries totals without duplicate copies',
    () async {
      final f = Fixture();
      addTearDown(f.client.dispose);
      await f.signIn();
      f.loseResponse = true;
      await expectLater(
        CollectionImportService.importPreview(
          client: f.client,
          preview: preview(),
        ),
        throwsA(isA<CollectionImportFailure>()),
      );
      expect(f.saved, {cardA: 3, cardB: 3});
      final result = await CollectionImportService.importPreview(
        client: f.client,
        preview: preview(),
      );
      expect(result.importedCards, 0);
      expect(f.saved, {cardA: 3, cardB: 3});
      expect(f.requests.where((r) => r.url.path.contains('summary')), isEmpty);
    },
  );
  test('slab-only ownership participates in readback', () async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.slabOnly = 2;
    final result = await CollectionImportService.importPreview(
      client: f.client,
      preview: preview(),
    );
    expect(result.importedCards, 4);
    expect(f.saved[cardA], 1);
  });
  test(
    'maintenance preserves preview for retry with no delta fallback',
    () async {
      final f = Fixture();
      addTearDown(f.client.dispose);
      await f.signIn();
      f.paused = true;
      await expectLater(
        CollectionImportService.importPreview(
          client: f.client,
          preview: preview(),
        ),
        throwsA(predicate((e) => e.toString().contains('temporarily paused'))),
      );
      expect(f.saved, isEmpty);
      f.paused = false;
      expect(
        (await CollectionImportService.importPreview(
          client: f.client,
          preview: preview(),
        )).importedCards,
        6,
      );
      expect(
        f.requests.where((r) => r.url.path.contains('vault-add')),
        isEmpty,
      );
    },
  );
  test('missing endpoint fails closed; never uses additive writer', () async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.missingEndpoint = true;
    await expectLater(
      CollectionImportService.importPreview(
        client: f.client,
        preview: preview(),
      ),
      throwsA(isA<CollectionImportFailure>()),
    );
    expect(f.saved, isEmpty);
    expect(f.requests.length, 1);
  });
  test('bad saved-count readback does not report success', () async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.badReadback = true;
    await expectLater(
      CollectionImportService.importPreview(
        client: f.client,
        preview: preview(),
      ),
      throwsA(isA<CollectionImportFailure>()),
    );
    expect(f.requests.where((r) => r.url.path.contains('summary')), isEmpty);
  });
  test('changed account cannot reuse another owner preview', () async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    f.owner = 'other';
    await f.signIn();
    await expectLater(
      CollectionImportService.importPreview(
        client: f.client,
        preview: preview(),
      ),
      throwsA(predicate((e) => e.toString().contains('account changed'))),
    );
    expect(f.requests, isEmpty);
  });
  test('signed-out preview does not read catalog or write', () async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await expectLater(
      CollectionImportService.buildPreview(client: f.client, csvText: 'unused'),
      throwsA(isA<CollectionImportFailure>()),
    );
    expect(f.requests, isEmpty);
  });
}
