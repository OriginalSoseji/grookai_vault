import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/models/card_print.dart';

void main() {
  for (final guest in [false, true]) {
    test(
      'shared resolver keeps combined query and interpretation (guest=$guest)',
      () async {
        var databaseReads = 0;
        final client = SupabaseClient(
          'http://127.0.0.1:54321',
          'test-publishable',
          httpClient: MockClient((request) async {
            databaseReads++;
            throw StateError('Unexpected fallback database request');
          }),
        );
        final result = await http.runWithClient(
          () => CardPrintRepository.searchCardPrintsResolved(
            client: client,
            options: const CardSearchOptions(
              query: 'Yuka Morri Wurmple reverse holo',
              languageScope: 'ja',
              searchParameters: {
                'illustrator': 'Yuka Morii',
                'finish': 'reverse',
                'pagination': '1',
                'offset': '48',
              },
            ),
            publicPokemonBrowse: guest,
          ),
          () => MockClient((request) async {
            expect(request.url.path, '/api/resolver/search');
            expect(
              request.url.queryParameters['q'],
              'Yuka Morri Wurmple reverse holo',
            );
            expect(request.url.queryParameters['lang'], 'ja');
            expect(request.url.queryParameters['illustrator'], 'Yuka Morii');
            expect(request.url.queryParameters['finish'], 'reverse');
            expect(
              request.url.queryParameters.containsKey('pagination'),
              false,
            );
            expect(request.url.queryParameters.containsKey('offset'), false);
            return http.Response(
              jsonEncode({
                'ok': true,
                'rows': [],
                'provisional': [],
                'source': 'web_ranked_resolver_v2',
                'smart_search': {
                  'queryFilters': [
                    {
                      'label': 'Finish: Reverse Holo',
                      'queryWithout': 'Yuka Morri Wurmple',
                    },
                  ],
                  'artistCorrection': {
                    'original': 'Yuka Morri',
                    'corrected': 'Yuka Morii',
                  },
                  'originalSpellingQuery': '"Yuka Morri" Wurmple reverse holo',
                },
              }),
              200,
            );
          }),
        );
        expect(databaseReads, 0);
        expect(result.rows, isEmpty);
        expect(
          result.interpretation!.filters.single.query,
          'Yuka Morri Wurmple',
        );
        expect(
          result.interpretation!.originalSpellingQuery,
          '"Yuka Morri" Wurmple reverse holo',
        );
        await client.dispose();
      },
    );

    test(
      'resolver failure never silently replaces combined constraints (guest=$guest)',
      () async {
        var databaseReads = 0;
        final client = SupabaseClient(
          'http://127.0.0.1:54321',
          'test-publishable',
          httpClient: MockClient((request) async {
            databaseReads++;
            return http.Response('[]', 200);
          }),
        );
        await expectLater(
          http.runWithClient(
            () => CardPrintRepository.searchCardPrintsResolved(
              client: client,
              options: const CardSearchOptions(
                query: 'Yuka Morii Wurmple reverse holo',
              ),
              publicPokemonBrowse: guest,
            ),
            () => MockClient(
              (request) async => http.Response(
                '{"ok":false,"error":"Search unavailable"}',
                503,
              ),
            ),
          ),
          throwsA(isA<StateError>()),
        );
        expect(databaseReads, 0);
        await client.dispose();
      },
    );
  }
}
