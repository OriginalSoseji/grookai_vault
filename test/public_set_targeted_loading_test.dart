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
          return http.Response(
            jsonEncode({
              'code': 'cel25',
              'name': 'Celebrations',
              'hero_image_url': 'https://example.test/cel25.png',
              'printed_set_abbrev': 'cel',
              'printed_total': 25,
              'release_date': '2021-10-08',
              'created_at': '2021-10-08T00:00:00Z',
              'card_prints': [
                {'count': 25},
              ],
            }),
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
      expect(requests, hasLength(1));

      final request = requests.single;
      expect(request.url.path, '/rest/v1/sets');
      expect(request.url.queryParameters['code'], 'eq.cel25');
      expect(request.url.queryParameters['limit'], '1');
      expect(
        request.url.queryParameters['select'],
        contains('card_prints(count)'),
      );
      expect(request.url.queryParameters['card_prints.gv_id'], 'not.is.null');
    },
  );

  test('set index gets aggregate counts without scanning card rows', () async {
    final requests = <http.Request>[];
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        requests.add(request);
        return http.Response(
          jsonEncode([
            {
              'code': 'duplicate-short',
              'name': 'Duplicate Set',
              'release_date': '2020-01-01',
              'created_at': '2020-01-01T00:00:00Z',
              'card_prints': [
                {'count': 10},
              ],
            },
            {
              'code': 'duplicate-complete',
              'name': 'Duplicate Set',
              'release_date': '2020-01-01',
              'created_at': '2020-01-01T00:00:00Z',
              'card_prints': [
                {'count': 12},
              ],
            },
            {
              'code': 'empty',
              'name': 'Empty Set',
              'card_prints': [
                {'count': 0},
              ],
            },
          ]),
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(client.dispose);

    final sets = await PublicSetsService.fetchSets(client: client);

    expect(sets, hasLength(1));
    expect(sets.single.code, 'duplicate-complete');
    expect(sets.single.cardCount, 12);
    expect(requests, hasLength(1));
    expect(requests.single.url.path, '/rest/v1/sets');
    expect(
      requests.single.url.queryParameters['select'],
      contains('card_prints(count)'),
    );
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
