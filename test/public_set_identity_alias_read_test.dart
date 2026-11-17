import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:grookai_vault/services/public/public_sets_service.dart';

void main() {
  test(
    'legacy set detail uses the backend canonical destination and count',
    () async {
      final requests = <http.Request>[];
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          requests.add(request);
          Object body;
          switch (request.url.path) {
            case '/rest/v1/rpc/resolve_visible_set_references_v1':
              expect(jsonDecode(request.body)['code_in'], 'sv08.5');
              body = [
                {
                  'id': '10000000-0000-0000-0000-000000000001',
                  'code': 'sv8pt5',
                },
              ];
            case '/rest/v1/sets':
              expect(request.url.queryParameters['code'], 'in.("sv8pt5")');
              body = [
                {
                  'code': 'sv8pt5',
                  'game': 'pokemon',
                  'name': 'Prismatic Evolutions',
                  'printed_total': 131,
                },
              ];
            case '/rest/v1/rpc/get_public_set_card_counts_v1':
              expect(jsonDecode(request.body)['p_set_codes'], ['sv8pt5']);
              body = [
                {'set_code': 'sv8pt5', 'card_count': 194},
              ];
            default:
              fail('Unexpected request: ${request.url.path}');
          }
          return http.Response(
            jsonEncode(body),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);

      final summary = await PublicSetsService.fetchSetByCode(
        client: client,
        setCode: ' SV08.5 ',
      );
      expect(summary?.code, 'sv8pt5');
      expect(summary?.name, 'Prismatic Evolutions');
      expect(summary?.cardCount, 194);
      expect(requests, hasLength(3));
    },
  );

  test(
    'an empty backend reference does not guess another set or read its cards',
    () async {
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          expect(
            request.url.path,
            '/rest/v1/rpc/resolve_visible_set_references_v1',
          );
          return http.Response(
            '[]',
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);
      expect(
        await PublicSetsService.fetchSetByCode(
          client: client,
          setCode: 'sv08.5',
        ),
        isNull,
      );
    },
  );
}
