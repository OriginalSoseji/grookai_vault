import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/main.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  Future<http.Response> Function(http.Request)? databaseRequest;
  setUp(() => databaseRequest = null);
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'fixture',
      authOptions: const FlutterAuthClientOptions(
        autoRefreshToken: false,
        localStorage: EmptyLocalStorage(),
      ),
      httpClient: MockClient((request) async {
        final response = databaseRequest == null
            ? http.Response('[]', 200)
            : await databaseRequest!(request);
        return http.Response.bytes(
          response.bodyBytes,
          response.statusCode,
          headers: response.headers,
          request: request,
        );
      }),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());
  http.Response empty(String label) => http.Response(
    jsonEncode({
      'rows': [],
      'source': 'web_ranked_resolver_v2',
      'smart_search': {
        'queryFilters': [
          {'label': label, 'queryWithout': 'pika'},
        ],
      },
    }),
    200,
  );

  testWidgets(
    'visible printing details do not wait for stalled pricing and load more enriches only new cards',
    (tester) async {
      final pricing = Completer<http.Response>();
      final priceBatches = <List<dynamic>>[];
      final printingBatches = <List<dynamic>>[];
      databaseRequest = (request) async {
        if (request.url.path.endsWith('get_market_pricing_read_model_v1')) {
          priceBatches.add(
            jsonDecode(request.body)['p_card_print_ids'] as List<dynamic>,
          );
          return pricing.future;
        }
        if (request.url.path.endsWith('get_public_card_printing_options_v1')) {
          final ids =
              jsonDecode(request.body)['p_card_print_ids'] as List<dynamic>;
          printingBatches.add(ids);
          return http.Response(
            jsonEncode([
              for (final id in ids)
                for (final finish in ['normal', 'reverse'])
                  {
                    'id': '$id-$finish',
                    'card_print_id': id,
                    'finish_key': finish,
                  },
            ]),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          '[]',
          200,
          headers: {'content-type': 'application/json'},
        );
      };
      await http.runWithClient(
        () async {
          await tester.pumpWidget(
            const MaterialApp(
              home: Scaffold(body: HomePage(initialQuery: 'Pika')),
            ),
          );
          for (var i = 0; i < 8; i++) {
            await tester.pump();
          }
          expect(priceBatches.single.length, 24);
          expect(printingBatches.single.length, 24);
          final resultsScroll = find
              .descendant(
                of: find.byType(CustomScrollView),
                matching: find.byType(Scrollable),
              )
              .first;
          await tester.scrollUntilVisible(
            find.text('Pikachu 0'),
            300,
            scrollable: resultsScroll,
          );
          expect(find.textContaining('2 printings'), findsWidgets);
          expect(find.text('Retry search'), findsNothing);
          await tester.scrollUntilVisible(
            find.text('Load more'),
            500,
            scrollable: resultsScroll,
          );
          await tester.tap(find.text('Load more'));
          for (var i = 0; i < 5; i++) {
            await tester.pump();
          }
          expect(priceBatches.map((ids) => ids.length), [24, 6]);
          expect(printingBatches.map((ids) => ids.length), [24, 6]);
          expect(printingBatches.expand((ids) => ids).toSet().length, 30);
          // Invalidate before the delayed old prices complete.
          await tester.enterText(find.byType(TextField).first, 'different');
          pricing.complete(
            http.Response(
              '[]',
              200,
              headers: {'content-type': 'application/json'},
            ),
          );
          await tester.pump();
          expect(find.text('Retry search'), findsNothing);
          await tester.pumpWidget(const SizedBox.shrink());
        },
        () => MockClient(
          (request) async => http.Response(
            jsonEncode({
              'source': 'web_ranked_resolver_v2',
              'rows': List.generate(
                30,
                (i) => {
                  'id': 'card-$i',
                  'gv_id': 'GV-PK-TEST-$i',
                  'name': 'Pikachu $i',
                  'set_code': 'test',
                  'number': '$i',
                },
              ),
            }),
            200,
          ),
        ),
      );
    },
  );

  testWidgets(
    'typing immediately invalidates an older response; submit does not duplicate a pending request',
    (tester) async {
      final old = Completer<http.Response>(),
          current = Completer<http.Response>();
      final queries = <String>[];
      await http.runWithClient(
        () async {
          await tester.pumpWidget(
            const MaterialApp(
              home: Scaffold(
                body: HomePage(
                  signedOutBrowse: true,
                  initialQuery: 'Pika 30th',
                ),
              ),
            ),
          );
          expect(queries, ['Pika 30th']);
          await tester.enterText(find.byType(TextField).first, 'pika ascended');
          old.complete(empty('Set: old result'));
          await tester.pump(const Duration(milliseconds: 100));
          expect(find.text('Set: old result'), findsNothing);
          await tester.pump(const Duration(milliseconds: 200));
          expect(queries, ['Pika 30th', 'pika ascended']);
          await tester.testTextInput.receiveAction(TextInputAction.search);
          await tester.pump();
          expect(queries.length, 2);
          current.complete(empty('Set: ascended'));
          await tester.pump();
          await tester.pump();
          expect(find.text('Set: ascended'), findsOneWidget);
          await tester.pumpWidget(const SizedBox.shrink());
        },
        () => MockClient((r) {
          queries.add(r.url.queryParameters['q']!);
          return queries.length == 1 ? old.future : current.future;
        }),
      );
    },
  );

  testWidgets('late printing details cannot replace a newer search', (
    tester,
  ) async {
    final oldPrinting = Completer<http.Response>();
    var printingRequests = 0;
    var pricingRequests = 0;
    databaseRequest = (request) async {
      if (request.url.path.endsWith('get_market_pricing_read_model_v1')) {
        pricingRequests++;
      }
      if (request.url.path.endsWith('get_public_card_printing_options_v1')) {
        printingRequests++;
        if (printingRequests == 1) return oldPrinting.future;
        return http.Response(
          '[{"id":"new","card_print_id":"shared","finish_key":"normal"}]',
          200,
        );
      }
      return http.Response('[]', 200);
    };
    await http.runWithClient(
      () async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: HomePage(signedOutBrowse: true, initialQuery: 'Pika'),
            ),
          ),
        );
        for (var i = 0; i < 8; i++) {
          await tester.pump();
        }
        expect(printingRequests, 1);
        await tester.enterText(find.byType(TextField).first, 'Pika 30th');
        await tester.pump(const Duration(milliseconds: 300));
        for (var i = 0; i < 8; i++) {
          await tester.pump();
        }
        expect(printingRequests, 2);
        expect(pricingRequests, 0);
        oldPrinting.complete(
          http.Response(
            '[{"id":"old1","card_print_id":"shared","finish_key":"normal"},{"id":"old2","card_print_id":"shared","finish_key":"reverse"}]',
            200,
          ),
        );
        for (var i = 0; i < 8; i++) {
          await tester.pump();
        }
        expect(find.textContaining('2 printings'), findsNothing);
        expect(find.text('Pikachu'), findsWidgets);
        await tester.pumpWidget(const SizedBox.shrink());
      },
      () => MockClient(
        (_) async => http.Response(
          '{"source":"web_ranked_resolver_v2","rows":[{"id":"shared","name":"Pikachu","set_code":"test"}]}',
          200,
        ),
      ),
    );
  });

  testWidgets('failed request offers retry without claiming zero matches', (
    tester,
  ) async {
    var requests = 0;
    await http.runWithClient(
      () async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(
              body: HomePage(
                signedOutBrowse: true,
                initialQuery: 'pika ascended',
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump();
        expect(find.text('Retry search'), findsOneWidget);
        expect(find.text('No results yet'), findsNothing);
        await tester.tap(find.text('Retry search'));
        await tester.pump();
        await tester.pump();
        expect(requests, 2);
        expect(find.text('Retry search'), findsNothing);
        expect(find.text('Set: ascended'), findsOneWidget);
        await tester.pumpWidget(const SizedBox.shrink());
      },
      () => MockClient((r) async {
        expect(r.url.queryParameters['q'], 'pika ascended');
        requests++;
        return requests == 1
            ? http.Response('{"error":"Search unavailable"}', 500)
            : empty('Set: ascended');
      }),
    );
  });
}
