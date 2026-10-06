import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/screens/sales/sales_catalog_dialog.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_search_cache.dart';
import 'sales_catalog_dialog_test.dart' show CatalogService;
import 'sales_desk_screen_test.dart' show FakeSalesService, open;

class BatchCatalog extends CatalogService {
  final ids = <String>[];
  bool moreFailed = false;
  @override
  Future<Map<String, dynamic>> completeCatalogAdd(
    Map<String, dynamic> request,
  ) async {
    ids.add(request['id'] as String);
    submits.add(request);
    return {
      'instanceId': 'copy-${ids.length}',
      'gvviId': 'GVVI-BATCH-${ids.length}',
    };
  }

  @override
  Future<SalesCatalogPage> searchCatalogPage(
    String query,
    String game, {
    int offset = 0,
  }) async {
    if (offset == 1 && !moreFailed) {
      moreFailed = true;
      throw StateError('network');
    }
    return SalesCatalogPage(
      [
        CardPrint(
          id: 'canonical-$offset',
          name: 'Catalog card $offset',
          gvId: 'GV-PK-TEST-00$offset',
          setCode: 'TEST',
        ),
      ],
      pagination: CardSearchPagination(
        total: 2,
        offset: offset,
        nextOffset: offset == 0 ? 1 : null,
      ),
    );
  }
}

Future<void> chooseAndPrice(WidgetTester tester, String price) async {
  final dialog = find.byType(SalesCatalogDialog);
  final scrollable = find
      .descendant(of: dialog, matching: find.byType(Scrollable))
      .last;
  await tester.scrollUntilVisible(
    find.byKey(const ValueKey('canonical-0')),
    120,
    scrollable: scrollable,
  );
  await Scrollable.ensureVisible(
    tester.element(find.byKey(const ValueKey('canonical-0'))),
    alignment: .25,
  );
  await tester.pumpAndSettle();
  await tester.tap(
    find
        .descendant(
          of: dialog,
          matching: find.byType(DropdownButtonFormField<String>),
        )
        .first,
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('Holo · GV-PK-TEST-001-HOLO').last);
  await tester.pumpAndSettle();
  final field = find.widgetWithText(TextField, 'Actual sale price (USD)');
  await tester.scrollUntilVisible(field, 120, scrollable: scrollable);
  expect(tester.widget<TextField>(field).controller!.text, '');
  await tester.enterText(field, price);
  await tester.tap(find.text('Add copy to Vault & cart'));
  await tester.pumpAndSettle();
}

void main() {
  test(
    'cache coalesces reads, expires, evicts, retries failures and isolates cleared sessions',
    () async {
      var now = DateTime.utc(2026);
      var reads = 0;
      final cache = SalesSearchCache<int>(capacity: 2, now: () => now);
      final first = Completer<int>();
      final a = cache.get('a', () {
        reads++;
        return first.future;
      });
      final b = cache.get('a', () async {
        reads++;
        return 2;
      });
      first.complete(1);
      expect(await a, 1);
      expect(await b, 1);
      expect(reads, 1);
      expect(await cache.get('a', () async => 3), 1);
      now = now.add(const Duration(seconds: 31));
      expect(await cache.get('a', () async => 3), 3);
      await cache.get('b', () async => 4);
      await cache.get('c', () async => 5);
      expect(await cache.get('a', () async => 6), 6);
      await expectLater(
        cache.get('bad', () async => throw StateError('offline')),
        throwsStateError,
      );
      expect(await cache.get('bad', () async => 7), 7);
      final old = Completer<int>();
      final oldRead = cache.get('old', () => old.future);
      cache.clear();
      expect(await cache.get('old', () async => 9), 9);
      old.complete(8);
      await oldRead;
      expect(await cache.get('old', () async => 10), 9);
    },
  );

  test(
    'owned search matches unordered name, number, finish and ID tokens',
    () async {
      final row = (await FakeSalesService().load()).rows.single;
      for (final text in [
        '1 Pikachu',
        'holo pikachu',
        'GV-PK-FIXTURE-001',
        'NM 1',
        '',
      ]) {
        expect(salesCopyMatches(row, text), true, reason: text);
      }
      expect(salesCopyMatches(row, 'Pikachu reverse'), false);
      expect(salesCopyMatches(row, '999'), false);
    },
  );

  test(
    'explicit resolver paging retains constraints and validates metadata',
    () async {
      final client = SupabaseClient(
        'http://127.0.0.1:1',
        'fixture',
        httpClient: MockClient(
          (_) async => throw StateError('No database fallback'),
        ),
      );
      addTearDown(client.dispose);
      final result = await http.runWithClient(
        () => CardPrintRepository.searchCardPrintsResolved(
          client: client,
          options: const CardSearchOptions(
            query: 'Pikachu holo',
            gameScope: 'pokemon',
            limit: 64,
            pageOffset: 64,
            searchParameters: {'finish': 'holo'},
          ),
        ),
        () => MockClient((request) async {
          expect(request.url.queryParameters['pagination'], '1');
          expect(request.url.queryParameters['offset'], '64');
          expect(request.url.queryParameters['finish'], 'holo');
          expect(request.url.queryParameters['q'], 'Pikachu holo');
          return http.Response(
            jsonEncode({
              'rows': [],
              'source': 'fixture',
              'pagination': {
                'total_count': 65,
                'offset': 64,
                'next_offset': null,
                'has_more': false,
              },
            }),
            200,
          );
        }),
      );
      expect(result.pagination!.total, 65);
      expect(result.pagination!.offset, 64);
      for (final next in [0, -1, 65, '64', null]) {
        expect(
          () => CardSearchPagination.fromJson({
            'total_count': 65,
            'offset': 0,
            'next_offset': next,
            'has_more': true,
          }),
          throwsFormatException,
        );
      }
    },
  );

  for (final size in [const Size(1194, 834), const Size(390, 844)]) {
    testWidgets(
      'continuous adds preserve search, use distinct requests and never reload the desk $size',
      (tester) async {
        final service = BatchCatalog();
        addTearDown(service.changes.close);
        await open(tester, service, size);
        await tester.enterText(
          find.widgetWithText(TextField, 'Find a card, GV-ID or copy ID'),
          'Pikachu',
        );
        await tester.tap(find.text('Catalog'));
        await tester.pumpAndSettle();
        await tester.pump(const Duration(milliseconds: 400));
        await tester.pumpAndSettle();
        expect(find.text('1 of 2 results'), findsOneWidget);
        await tester.tap(
          find
              .descendant(
                of: find.byType(SalesCatalogDialog),
                matching: find.text('Catalog card 0'),
              )
              .last,
        );
        await tester.pumpAndSettle();
        await chooseAndPrice(tester, '20');
        expect(find.byType(SalesCatalogDialog), findsOneWidget);
        expect(find.textContaining('1 copy added'), findsOneWidget);
        expect(
          tester
              .widget<TextField>(
                find.widgetWithText(TextField, 'Name, card number or GV-ID'),
              )
              .controller!
              .text,
          'Pikachu',
        );
        await tester.tap(
          find
              .descendant(
                of: find.byType(SalesCatalogDialog),
                matching: find.text('Catalog card 0'),
              )
              .last,
        );
        await tester.pumpAndSettle();
        await chooseAndPrice(tester, '25');
        expect(service.ids.toSet(), hasLength(2));
        expect(service.loads, 1);
        expect(service.refreshed, ['copy-1', 'copy-2']);
        await tester.tap(find.byTooltip('Close catalog'));
        await tester.pumpAndSettle();
        if (size.width < 900) {
          await tester.tap(find.textContaining('Cart ('));
          await tester.pumpAndSettle();
        }
        expect(find.text('Checkout: 1 × USD 20.00'), findsOneWidget);
        expect(find.text('Checkout: 1 × USD 25.00'), findsOneWidget);
        expect(service.calls, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('load-more failure keeps the first page and permits retry', (
    tester,
  ) async {
    final service = BatchCatalog();
    addTearDown(service.changes.close);
    await open(tester, service, const Size(1194, 834));
    await tester.tap(find.text('Catalog'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Name, card number or GV-ID'),
      'Pikachu',
    );
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Load more'));
    await tester.pumpAndSettle();
    expect(find.text('Catalog card 0'), findsWidgets);
    expect(find.textContaining('More results could not load'), findsOneWidget);
    await tester.tap(find.text('Load more'));
    await tester.pumpAndSettle();
    expect(find.text('2 of 2 results'), findsOneWidget);
    expect(find.text('Catalog card 1'), findsWidgets);
    expect(find.text('Load more'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
