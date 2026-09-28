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
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'fixture',
      authOptions: const FlutterAuthClientOptions(
        autoRefreshToken: false,
        localStorage: EmptyLocalStorage(),
      ),
      httpClient: MockClient((_) async => http.Response('[]', 200)),
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
