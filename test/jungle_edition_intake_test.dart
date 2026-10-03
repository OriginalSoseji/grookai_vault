import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:grookai_vault/services/import/collection_import_service.dart';
import 'package:grookai_vault/services/import/collection_import_source_session.dart';
import 'package:grookai_vault/services/public/jungle_edition_resolution_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:grookai_vault/screens/scanner/jungle_edition_scan_review.dart';
import 'package:grookai_vault/card_detail_screen.dart';
import 'collection_import_recovery_test.dart' show Fixture, cardA;
import 'collectr_import_source_session_test.dart' show SourceFixture;

Map<String, dynamic> editionFixture() =>
    jsonDecode(
          File(
            'tests/fixtures/jungle_edition_resolution_v1.json',
          ).readAsStringSync(),
        )
        as Map<String, dynamic>;

class EditionNavigationObserver extends NavigatorObserver {
  Route<dynamic>? lastRoute;
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    lastRoute = route;
  }
}

void main() {
  testWidgets(
    'scanner edition tap routes exact IDs without inheriting its image or auto-add intent',
    (tester) async {
      final observer = EditionNavigationObserver();
      late BuildContext hostContext;
      await tester.pumpWidget(
        MaterialApp(
          navigatorObservers: [observer],
          home: Builder(
            builder: (context) {
              hostContext = context;
              return Scaffold(
                body: TextButton(
                  onPressed: () => reviewScannedJungleEdition(
                    context,
                    JungleEditionResolution.fromJson(editionFixture()),
                  ),
                  child: const Text('Review scan'),
                ),
              );
            },
          ),
        ),
      );
      await tester.tap(find.text('Review scan'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Unlimited · Holo'));
      await tester.idle();
      final route = observer.lastRoute as MaterialPageRoute<void>;
      final destination = route.builder(hostContext) as CardDetailScreen;
      final expected = editionFixture()['options'][1];
      expect(destination.cardPrintId, expected['card_print_id']);
      expect(destination.gvId, expected['gv_id']);
      expect(destination.selectedPrintingGvId, expected['printing_gv_id']);
      expect(destination.imageUrl, isNull);
      expect(destination.fallbackImageUrl, isNull);
      expect(destination.initialPersonalAction, isNull);
      // Inspect the real route without mounting the network-backed card page.
      await tester.pumpWidget(const SizedBox.shrink());
      expect(tester.takeException(), isNull);
    },
  );
  test(
    'source-aware save retains the Jungle CSV and review row without creating copies',
    () async {
      final s = SourceFixture();
      addTearDown(s.f.client.dispose);
      await s.f.signIn();
      s.f.catalogSets = [
        {'id': 'jungle', 'name': 'Jungle', 'code': 'base2', 'game': 'pokemon'},
      ];
      s.f.catalogCards = [
        {
          'id': cardA,
          'gv_id': 'GV-PK-JU-1',
          'name': 'Clefable',
          'number': '1',
          'set_id': 'jungle',
          'set_code': 'base2',
        },
      ];
      final original = s.f.intercept!;
      s.f.intercept = (request) =>
          request.url.path.endsWith('/get_jungle_edition_resolution_v1')
          ? http.Response(
              jsonEncode(editionFixture()),
              200,
              headers: {'content-type': 'application/json'},
              request: request,
            )
          : original(request);
      const csv =
          'Product Name,Category,Set,Card Number,Quantity,Notes,Portfolio Name\nClefable,Pokemon,Jungle,1,2,Keep my note,Main';
      final session = await CollectionImportSourceSession.prepare(
        client: s.f.client,
        csvText: csv,
      );
      expect(session.preview.rows.single.canImport, false);
      for (var i = 0; i < 2; i++) {
        final result = await session.save(s.f.client);
        expect(result.importedCards, 0);
        expect(result.needsManualMatch, 1);
      }
      expect(s.attempts.toSet().length, 1);
      expect(s.copies, isEmpty);
      expect(s.groups, isEmpty);
      expect(s.source.single['Notes'], 'Keep my note');
      expect(s.source.single['Quantity'], '2');
      expect(s.source.single['Portfolio Name'], 'Main');
      final sent = s.f.requests.where(
        (r) => r.url.path.endsWith('/vault-import-collection-v2'),
      );
      for (final request in sent) {
        expect(jsonDecode(request.body)['targets'], isEmpty);
        expect(jsonDecode(request.body)['csvText'], csv);
      }
    },
  );
  Future<Fixture> fixture({
    String status = 'selection_required',
    bool fail = false,
  }) async {
    final f = Fixture();
    addTearDown(f.client.dispose);
    await f.signIn();
    f.catalogSets = [
      {'id': 'jungle', 'name': 'Jungle', 'code': 'base2', 'game': 'pokemon'},
    ];
    f.catalogCards = [
      {
        'id': cardA,
        'gv_id': 'GV-PK-JU-1',
        'name': 'Clefable',
        'number': '1',
        'set_id': 'jungle',
        'set_code': 'base2',
      },
    ];
    f.intercept = (request) {
      if (!request.url.path.endsWith('/get_jungle_edition_resolution_v1')) {
        return null;
      }
      return http.Response(
        jsonEncode(
          fail
              ? {'code': '57014', 'message': 'private detail'}
              : {
                  ...editionFixture(),
                  'status': status,
                  if (status == 'not_applicable') 'options': [],
                },
        ),
        fail ? 503 : 200,
        headers: {'content-type': 'application/json'},
        request: request,
      );
    };
    return f;
  }

  for (final sourceAware in [false, true]) {
    for (final status in ['selection_required', 'ready', 'unavailable']) {
      test('$status stays in import review; sourceAware=$sourceAware', () async {
        final f = await fixture(status: status);
        f.saved[cardA] = 10;
        final preview = await CollectionImportService.buildPreview(
          client: f.client,
          sourceAware: sourceAware,
          csvText:
              'Product Name,Category,Set,Card Number,Quantity,Notes\nClefable,Pokemon,Jungle,1,2,Keep my note',
        );
        final row = preview.rows.single;
        expect(row.canImport, false);
        expect(row.reviewReasons.join(), contains('review'));
        expect(row.importQuantity, 2);
        expect(row.row.notes, 'Keep my note');
        expect(row.row.sourceRows, [2]);
        expect(preview.summary.matchedRows, 0);
        expect(preview.report.rowsAlreadyOwned, 0);
        expect(
          f.requests.where((r) => r.url.path.contains('/functions/')),
          isEmpty,
        );
        expect(f.saved[cardA], 10);
      });
    }
  }
  test('lookup outage holds the import row with safe retry copy', () async {
    final f = await fixture(fail: true);
    final preview = await CollectionImportService.buildPreview(
      client: f.client,
      csvText:
          'Product Name,Category,Set,Card Number\nClefable,Pokemon,Jungle,1',
    );
    expect(preview.rows.single.canImport, false);
    expect(
      preview.rows.single.reviewReasons.join(),
      contains('could not be checked'),
    );
    expect(
      preview.rows.single.reviewReasons.join(),
      isNot(contains('private detail')),
    );
  });
  for (final status in ['selection_required', 'ready', 'unavailable']) {
    test(
      'scanner common add stops before ownership writes for $status',
      () async {
        final f = await fixture(status: status);
        await expectLater(
          VaultCardService.addOrIncrementVaultItem(
            client: f.client,
            userId: f.owner,
            cardId: cardA,
          ),
          throwsA(isA<JungleEditionSelectionRequired>()),
        );
        expect(f.requests.length, 1);
        expect(
          f.requests.single.url.path,
          endsWith('/get_jungle_edition_resolution_v1'),
        );
        expect(f.saved, isEmpty);
      },
    );
  }
  testWidgets('cancel scanner edition review without navigation or writes', (
    tester,
  ) async {
    var returned = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                await reviewScannedJungleEdition(
                  context,
                  JungleEditionResolution.fromJson(editionFixture()),
                );
                returned = true;
              },
              child: const Text('Review scan'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Review scan'));
    await tester.pumpAndSettle();
    expect(find.text('First Edition · Holo'), findsOneWidget);
    expect(find.text('Unlimited · Holo'), findsOneWidget);
    expect(returned, false);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(returned, true);
    expect(find.text('Review scan'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
