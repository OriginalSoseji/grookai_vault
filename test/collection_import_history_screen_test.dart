import 'dart:async';
import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:grookai_vault/screens/account/import_collection_history_screen.dart';
import 'package:grookai_vault/screens/account/import_collection_screen.dart';
import 'collectr_import_source_session_test.dart' show SourceFixture, sourceCsv;
import 'collection_import_recovery_test.dart' show FixturePicker;

Future<void> settle(WidgetTester tester, Finder finder) async {
  for (var i = 0; i < 500; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 10)),
    );
    await tester.pump(const Duration(milliseconds: 50));
    if (finder.evaluate().isNotEmpty) return;
  }
  fail(
    'Expected $finder; visible=${tester.widgetList<Text>(find.byType(Text)).map((w) => w.data).toList()}',
  );
}

Future<SourceFixture> seeded(WidgetTester tester) async {
  final fixture = SourceFixture();
  addTearDown(() => tester.runAsync(fixture.f.client.dispose));
  await tester.runAsync(() async {
    await fixture.f.signIn();
    final session = await fixture.prepare();
    await session.save(fixture.f.client);
  });
  return fixture;
}

void main() {
  testWidgets(
    'archived copies remain historical; source download keeps unsupported fields',
    (tester) async {
      final s = await seeded(tester);
      for (final copy in s.copies) {
        copy['archived_at'] = '2026-10-08T00:00:00Z';
      }
      String? downloaded;
      await tester.pumpWidget(
        MaterialApp(
          home: ImportCollectionHistoryScreen(
            client: s.f.client,
            sourceSha256: s.sourceHash,
            shareSource: (contents, filename, origin) async {
              downloaded = contents;
              expect(filename, endsWith('.json'));
            },
          ),
        ),
      );
      await settle(tester, find.text('Needs review (1)'));
      expect(
        find.textContaining(
          '3 source rows · 2 previously reconciled · 1 need review',
        ),
        findsOneWidget,
      );
      expect(
        find.textContaining('Historical mappings: 3 card copies'),
        findsOneWidget,
      );
      await tester.tap(find.text('Download source and retry options'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Save source JSON'));
      await tester.tap(find.text('Save source JSON'));
      await tester.pumpAndSettle();
      expect(downloaded, isNotNull);
      expect((jsonDecode(downloaded!) as Map)['sourceRows'], s.source);
      expect(downloaded, contains('PSA 10'));
      expect(tester.takeException(), isNull);
    },
  );

  for (final detail in [false, true]) {
    testWidgets(
      'account replacement clears ${detail ? 'detail' : 'list'} and stays closed',
      (tester) async {
        final s = await seeded(tester);
        await tester.pumpWidget(
          MaterialApp(
            home: ImportCollectionHistoryScreen(
              client: s.f.client,
              sourceSha256: detail ? s.sourceHash : null,
            ),
          ),
        );
        await settle(
          tester,
          detail
              ? find.text('Needs review (1)')
              : find.text('Imported 2026-09-30'),
        );
        await tester.runAsync(() async {
          s.f.owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
          await s.f.signIn();
        });
        await tester.pumpAndSettle();
        expect(
          find.text('Your account changed. Reopen saved imports.'),
          findsOneWidget,
        );
        expect(find.text('Imported 2026-09-30'), findsNothing);
        expect(find.text('Save source JSON'), findsNothing);
        expect(find.textContaining('3 source rows'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final dispose in [false, true]) {
    testWidgets(
      '${dispose ? 'disposal' : 'account replacement'} rejects a late group response',
      (tester) async {
        final s = await seeded(tester),
            started = Completer<void>(),
            release = Completer<void>();
        s.f.beforeResponse = (request) async {
          if (request.url.path.endsWith('/vault_collection_import_groups_v2') &&
              !started.isCompleted) {
            started.complete();
            await release.future;
          }
        };
        await tester.pumpWidget(
          MaterialApp(
            home: ImportCollectionHistoryScreen(
              client: s.f.client,
              sourceSha256: s.sourceHash,
            ),
          ),
        );
        await tester.runAsync(
          () => started.future.timeout(const Duration(seconds: 5)),
        );
        if (dispose) {
          await tester.pumpWidget(
            const MaterialApp(home: Text('Other screen')),
          );
        } else {
          await tester.runAsync(() async {
            s.f.owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
            await s.f.signIn();
          });
        }
        release.complete();
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 30)),
        );
        await tester.pumpAndSettle();
        expect(find.text('Save source JSON'), findsNothing);
        expect(find.textContaining('3 source rows'), findsNothing);
        expect(
          find.text(
            dispose
                ? 'Other screen'
                : 'Your account changed. Reopen saved imports.',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'failed later group page never shows a partial reconciliation; retry reloads all',
    (tester) async {
      final s = await seeded(tester);
      var failPage = true;
      s.f.beforeResponse = (request) async {
        if (failPage &&
            request.url.path.endsWith('/vault_collection_import_groups_v2') &&
            request.url.queryParameters.containsKey('group_key')) {
          throw http.ClientException('late page failed');
        }
      };
      await tester.pumpWidget(
        MaterialApp(
          home: ImportCollectionHistoryScreen(
            client: s.f.client,
            sourceSha256: s.sourceHash,
          ),
        ),
      );
      await settle(tester, find.text('Retry loading'));
      expect(find.text('Save source JSON'), findsNothing);
      expect(find.textContaining('3 source rows'), findsNothing);
      failPage = false;
      await tester.tap(find.text('Retry loading'));
      await settle(tester, find.text('Needs review (1)'));
      expect(
        find.textContaining('3 source rows · 2 previously reconciled'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'account replacement clears a private import preview before saving',
    (tester) async {
      final s = SourceFixture();
      FilePicker.platform = FixturePicker(csv: sourceCsv);
      final priorPicker = FilePicker.platform;
      addTearDown(() {
        FilePicker.platform = priorPicker;
      });
      addTearDown(() => tester.runAsync(s.f.client.dispose));
      await tester.runAsync(s.f.signIn);
      FilePicker.platform = FixturePicker(csv: sourceCsv);
      await tester.pumpWidget(
        MaterialApp(home: ImportCollectionScreen(client: s.f.client)),
      );
      await tester.tap(find.text('Choose CSV'));
      await settle(tester, find.textContaining('Ready 2'));
      await tester.runAsync(() async {
        s.f.owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        await s.f.signIn();
      });
      await tester.pumpAndSettle();
      expect(
        find.text('Your account changed. Reopen Import Collection.'),
        findsOneWidget,
      );
      expect(find.text('Import to Vault'), findsNothing);
      expect(find.textContaining('Ready 2'), findsNothing);
      expect(s.attempts, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
}
