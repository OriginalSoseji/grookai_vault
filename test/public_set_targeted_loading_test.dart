import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:grookai_vault/services/public/public_sets_service.dart';

void main() {
  test(
    'set detail resolves one exact set with an embedded card count',
    () async {
      final requests = <http.Request>[];
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          requests.add(request);
          if (request.url.path ==
              '/rest/v1/rpc/get_public_set_card_counts_v1') {
            return http.Response(
              jsonEncode([
                {'set_code': 'cel25', 'card_count': 25},
              ]),
              200,
              request: request,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode([
              {
                'code': 'cel25',
                'name': 'Celebrations',
                'hero_image_url': 'https://example.test/cel25.png',
                'printed_set_abbrev': 'cel',
                'printed_total': 25,
                'release_date': '2021-10-08',
                'created_at': '2021-10-08T00:00:00Z',
              },
            ]),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);

      final summary = await PublicSetsService.fetchSetByCode(
        client: client,
        setCode: '  CEL25  ',
      );

      expect(summary?.code, 'cel25');
      expect(summary?.name, 'Celebrations');
      expect(summary?.cardCount, 25);
      expect(summary?.printedSetAbbrev, 'CEL');
      expect(requests, hasLength(2));

      final request = requests.first;
      expect(request.url.path, '/rest/v1/sets');
      expect(request.url.queryParameters['code'], 'ilike.cel25');
      expect(request.url.queryParameters.containsKey('limit'), isFalse);
      expect(
        request.url.queryParameters['select'],
        isNot(contains('card_prints(count)')),
      );
      expect(
        requests.last.url.path,
        '/rest/v1/rpc/get_public_set_card_counts_v1',
      );
    },
  );

  test(
    'set detail merges case-equivalent lanes and prefers descriptive metadata',
    () async {
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          if (request.url.path ==
              '/rest/v1/rpc/get_public_set_card_counts_v1') {
            return http.Response(
              jsonEncode([
                {'set_code': 'jpn-s8b', 'card_count': 261},
                {'set_code': 'jpn-S8b', 'card_count': 26},
              ]),
              200,
              request: request,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode([
              {
                'code': 'jpn-s8b',
                'name': 'Japanese S8b',
                'release_date': '2021-12-03',
              },
              {
                'code': 'jpn-S8b',
                'name': 'VMAX Climax',
                'release_date': '2021-12-03',
              },
            ]),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);

      final summary = await PublicSetsService.fetchSetByCode(
        client: client,
        setCode: 'JPN-S8B',
      );

      expect(summary?.code, 'jpn-s8b');
      expect(summary?.name, 'VMAX Climax');
      expect(summary?.cardCount, 287);
    },
  );

  test(
    'set index uses the bounded populated catalog RPC and caches it',
    () async {
      final requests = <http.Request>[];
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          requests.add(request);
          final params = jsonDecode(request.body) as Map<String, dynamic>;
          final gameCode = params['p_game_code'];
          return http.Response(
            jsonEncode(
              gameCode == 'pokemon'
                  ? [
                      {
                        'id': '10000000-0000-0000-0000-000000000001',
                        'game': 'pokemon',
                        'code': 'duplicate-short',
                        'name': 'Duplicate Set',
                        'release_date': '2020-01-01',
                        'created_at': '2020-01-01T00:00:00Z',
                        'card_count': 10,
                      },
                      {
                        'id': '10000000-0000-0000-0000-000000000002',
                        'game': 'pokemon',
                        'code': 'duplicate-complete',
                        'name': 'Duplicate Set',
                        'release_date': '2020-01-01',
                        'created_at': '2020-01-01T00:00:00Z',
                        'card_count': 12,
                      },
                    ]
                  : const [],
            ),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);

      final sets = await PublicSetsService.fetchSets(client: client);
      final cachedSets = await PublicSetsService.fetchSets(client: client);

      expect(sets, hasLength(1));
      expect(sets.single.code, 'duplicate-complete');
      expect(sets.single.cardCount, 12);
      expect(identical(sets, cachedSets), isTrue);
      expect(requests, hasLength(3));
      expect(
        requests.every(
          (request) =>
              request.url.path == '/rest/v1/rpc/get_public_catalog_sets_v2',
        ),
        isTrue,
      );
      expect(
        requests
            .map(
              (request) =>
                  (jsonDecode(request.body)
                      as Map<String, dynamic>)['p_game_code'],
            )
            .toSet(),
        {'pokemon', 'one_piece', 'mtg'},
      );

      await PublicSetsService.fetchSets(client: client, forceRefresh: true);
      expect(requests, hasLength(6));
    },
  );

  test('set index can load and cache only the selected game', () async {
    final requests = <http.Request>[];
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        requests.add(request);
        final params = jsonDecode(request.body) as Map<String, dynamic>;
        final gameCode = params['p_game_code'];
        return http.Response(
          jsonEncode(
            gameCode == 'mtg'
                ? [
                    {
                      'id': '10000000-0000-0000-0000-000000000003',
                      'game': 'mtg',
                      'code': 'lea',
                      'name': 'Limited Edition Alpha',
                      'release_date': '1993-08-05',
                      'created_at': '1993-08-05T00:00:00Z',
                      'card_count': 295,
                    },
                  ]
                : const [],
          ),
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(client.dispose);

    final sets = await PublicSetsService.fetchSets(
      client: client,
      game: PublicCatalogGame.mtg,
    );
    final cachedSets = await PublicSetsService.fetchSets(
      client: client,
      game: PublicCatalogGame.mtg,
    );

    expect(sets, hasLength(1));
    expect(sets.single.game, PublicCatalogGame.mtg);
    expect(identical(sets, cachedSets), isTrue);
    expect(requests, hasLength(1));
    expect(jsonDecode(requests.single.body), {'p_game_code': 'mtg'});

    await PublicSetsService.fetchSets(
      client: client,
      game: PublicCatalogGame.mtg,
      forceRefresh: true,
    );
    expect(requests, hasLength(2));
  });

  test(
    'set index bounds public count RPC batches and request concurrency',
    () async {
      final rows = List<Map<String, Object?>>.generate(
        51,
        (index) => {
          'game': 'pokemon',
          'code': 'set-$index',
          'name': 'Set $index',
          'release_date': '2020-01-01',
        },
      );
      var inFlight = 0;
      var maxInFlight = 0;
      final batchSizes = <int>[];
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          if (request.url.path ==
              '/rest/v1/rpc/get_public_set_card_counts_v1') {
            final codes =
                (jsonDecode(request.body)
                        as Map<String, dynamic>)['p_set_codes']
                    as List<dynamic>;
            batchSizes.add(codes.length);
            inFlight += 1;
            if (inFlight > maxInFlight) maxInFlight = inFlight;
            await Future<void>.delayed(const Duration(milliseconds: 10));
            inFlight -= 1;
            return http.Response(
              jsonEncode([
                for (final code in codes) {'set_code': code, 'card_count': 1},
              ]),
              200,
              request: request,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode(rows),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);

      final sets = await PublicSetsService.fetchSets(client: client);

      expect(sets, hasLength(51));
      expect(batchSizes, [50, 1]);
      expect(maxInFlight, 2);
    },
  );

  test('set index can load one game without counting other games', () async {
    final requests = <http.Request>[];
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        requests.add(request);
        if (request.url.path == '/rest/v1/rpc/get_public_set_card_counts_v1') {
          final codes =
              (jsonDecode(request.body) as Map<String, dynamic>)['p_set_codes']
                  as List<dynamic>;
          return http.Response(
            jsonEncode([
              for (final code in codes) {'set_code': code, 'card_count': 1},
            ]),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode([
            {'game': 'pokemon', 'code': 'pokemon-one', 'name': 'Pokemon One'},
          ]),
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(client.dispose);

    final sets = await PublicSetsService.fetchSets(
      client: client,
      game: PublicCatalogGame.pokemon,
    );

    expect(sets, hasLength(1));
    expect(sets.single.game, PublicCatalogGame.pokemon);
    expect(requests.first.url.queryParameters['game'], 'eq.pokemon');
    expect(requests, hasLength(2));
  });

  test('timed-out set count batches retry as smaller read requests', () async {
    final setRows = List<Map<String, Object?>>.generate(
      50,
      (index) => {
        'game': 'pokemon',
        'code': 'retry-$index',
        'name': 'Retry Set $index',
      },
    );
    final batchSizes = <int>[];
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        if (request.url.path == '/rest/v1/rpc/get_public_set_card_counts_v1') {
          final codes =
              (jsonDecode(request.body) as Map<String, dynamic>)['p_set_codes']
                  as List<dynamic>;
          batchSizes.add(codes.length);
          if (codes.length > 25) {
            return http.Response(
              jsonEncode({
                'code': '57014',
                'message': 'canceling statement due to statement timeout',
              }),
              500,
              request: request,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode([
              for (final code in codes) {'set_code': code, 'card_count': 1},
            ]),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode(setRows),
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(client.dispose);

    final sets = await PublicSetsService.fetchSets(client: client);

    expect(sets, hasLength(50));
    expect(batchSizes, [50, 25, 25]);
  });

  test('set route aliases resolve to their canonical codes', () {
    expect(PublicSetsService.resolveSetRouteCode('Shiny Vault'), 'sma');
    expect(PublicSetsService.resolveSetRouteCode('SV3PT5'), 'sv03.5');
    expect(
      PublicSetsService.resolveSetRouteCode('  Base   Set First Edition  '),
      'base1-first-edition',
    );
    expect(PublicSetsService.resolveSetRouteCode('CEL25'), 'cel25');
  });

  test('set display names remove source presentation markup', () async {
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        final payload =
            request.url.path == '/rest/v1/rpc/get_public_set_card_counts_v1'
            ? [
                {'set_code': 'jpn-product-test', 'card_count': 25},
              ]
            : [
                {
                  'code': 'jpn-product-test',
                  'name': 'Trainer Box <big>ex</big>',
                },
              ];
        return http.Response(
          jsonEncode(payload),
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(client.dispose);

    final summary = await PublicSetsService.fetchSetByCode(
      client: client,
      setCode: 'jpn-product-test',
    );

    expect(summary?.name, 'Trainer Box ex');
  });

  test('empty set routes fail closed without a database request', () async {
    var requestCount = 0;
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        requestCount += 1;
        return http.Response('{}', 200);
      }),
    );
    addTearDown(client.dispose);

    final summary = await PublicSetsService.fetchSetByCode(
      client: client,
      setCode: '   ',
    );

    expect(summary, isNull);
    expect(requestCount, 0);
  });
}
