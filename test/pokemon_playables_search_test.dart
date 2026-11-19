import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/models/card_print.dart';

void main() {
  for (final guest in [false, true]) {
    test(
      'explicit playable parameter survives native routing (guest=$guest)',
      () async {
        final client = SupabaseClient(
          'http://127.0.0.1:54321',
          'fixture',
          httpClient: MockClient(
            (_) async => throw StateError('No database fallback'),
          ),
        );
        var requests = 0;
        final result = await http.runWithClient(
          () => CardPrintRepository.searchCardPrintsResolved(
            client: client,
            publicPokemonBrowse: guest,
            options: const CardSearchOptions(
              searchParameters: {'playable': '1'},
              pageOffset: 1,
            ),
          ),
          () => MockClient((request) async {
            requests++;
            expect(request.url.path, '/api/resolver/search');
            expect(request.url.queryParameters['playable'], '1');
            expect(request.url.queryParameters['offset'], '1');
            return http.Response(
              jsonEncode({
                'rows': [],
                'smart_search': {'playable': true},
              }),
              200,
            );
          }),
        );
        expect(result.interpretation?.hasPlayableFilter, isTrue);
        expect(requests, 1);
        await client.dispose();
      },
    );
  }

  for (final status in [200, 400, 503]) {
    test(
      'playables common keeps its constraint when empty or unavailable ($status)',
      () async {
        final client = SupabaseClient(
          'http://127.0.0.1:54321',
          'fixture',
          httpClient: MockClient(
            (_) async => throw StateError('No database fallback'),
          ),
        );
        var requests = 0;
        final work = http.runWithClient(
          () => CardPrintRepository.searchCardPrintsResolved(
            client: client,
            options: const CardSearchOptions(query: 'playables common'),
          ),
          () => MockClient((request) async {
            requests++;
            expect(request.url.queryParameters['q'], 'playables common');
            return http.Response(
              jsonEncode({
                'rows': [],
                'smart_search': {'playable': true},
                if (status != 200) 'error': 'Current playables unavailable',
              }),
              status,
            );
          }),
        );
        if (status == 200) {
          expect((await work).rows, isEmpty);
        } else {
          await expectLater(work, throwsStateError);
        }
        // 503 receives the existing transport retry, with the exact same URI.
        expect(requests, status == 503 ? 2 : 1);
        await client.dispose();
      },
    );
  }
}
