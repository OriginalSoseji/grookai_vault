import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/main.dart';
import 'package:grookai_vault/services/competitive/pokemon_playables_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'fixture',
      authOptions: const FlutterAuthClientOptions(
        detectSessionInUri: false,
        autoRefreshToken: false,
        localStorage: EmptyLocalStorage(),
      ),
      httpClient: MockClient(
        (request) async => http.Response(
          '[]',
          200,
          headers: {'content-type': 'application/json'},
          request: request,
        ),
      ),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  testWidgets(
    'expired playable search clears cards and retains the query and interpreted filter',
    (tester) async {
      const id = '11111111-1111-4111-8111-111111111111';
      final now = tester.binding.clock.now();
      var publications = 0, searches = 0;
      final service = PokemonPlayablesService(
        clock: tester.binding.clock.now,
        fetch: (_) async {
          publications++;
          return http.Response(
            jsonEncode(
              publications == 1
                  ? {
                      'ok': true,
                      'version': 'pokemon_playables_public:v1',
                      'game': 'pokemon',
                      'format': 'standard',
                      'platform': 'paper',
                      'state': 'ready',
                      'snapshot_id': 'a' * 64,
                      'as_of': now.toIso8601String(),
                      'valid_until': now
                          .add(const Duration(seconds: 2))
                          .toIso8601String(),
                      'rows': [
                        {
                          'card_print_id': id,
                          'gv_id': 'GV-PK-TEST-1',
                          'lists': 5,
                          'events': 2,
                        },
                      ],
                    }
                  : {},
            ),
            publications == 1 ? 200 : 503,
          );
        },
      );
      await http.runWithClient(
        () async {
          await tester.pumpWidget(
            MaterialApp(
              home: Scaffold(
                body: HomePage(initialQuery: 'playables', playables: service),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.text('Verified SIR'), findsWidgets);
          expect(find.text('Playable'), findsOneWidget);
          expect(searches, 1);
          await tester.pump(const Duration(seconds: 2));
          await tester.pump();
          expect(find.text('Verified SIR'), findsNothing);
          expect(find.text('Playable'), findsNothing);
          expect(
            find.textContaining(
              'Current playables are temporarily unavailable',
            ),
            findsOneWidget,
          );
          expect(find.text('Playable: Pokémon Standard'), findsOneWidget);
          expect(
            (tester.widget<TextField>(
              find.byType(TextField).first,
            )).controller!.text,
            'playables',
          );
          expect(
            searches,
            1,
            reason: 'Expiry cannot become an unrestricted fallback request',
          );
          await tester.pumpWidget(const SizedBox.shrink());
          service.dispose();
        },
        () => MockClient((request) async {
          searches++;
          expect(request.url.path, '/api/resolver/search');
          expect(request.url.queryParameters['q'], 'playables');
          return http.Response(
            jsonEncode({
              'source': 'web_ranked_resolver_v2',
              'rows': [
                {
                  'id': id,
                  'name': 'Verified SIR',
                  'set_code': 'test',
                  'rarity': 'Special Illustration Rare',
                },
              ],
              'smart_search': {
                'playable': true,
                'queryFilters': [
                  {'label': 'Playable: Pokémon Standard', 'queryWithout': ''},
                ],
              },
            }),
            200,
          );
        }),
      );
    },
  );
}
