import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  final fixture =
      jsonDecode(
            File(
              'tests/fixtures/jungle_edition_resolution_v1.json',
            ).readAsStringSync(),
          )
          as Map;
  final legacy = fixture['legacy_card_print_id'] as String;
  final options = (fixture['options'] as List).cast<Map>();
  final rows =
      [
            {'id': legacy, 'gv_id': 'GV-PK-JU-1'},
            for (final option in options)
              {'id': option['card_print_id'], 'gv_id': option['gv_id']},
          ]
          .map(
            (r) => {
              ...r,
              'name': 'Clefable',
              'number': '1',
              'set_code': 'base2',
            },
          )
          .toList();
  late List<http.Request> requests;
  SupabaseClient client({bool failed = false}) {
    requests = [];
    final c = SupabaseClient(
      'http://127.0.0.1:54321',
      'fixture-key',
      httpClient: MockClient((request) async {
        requests.add(request);
        final discovery = request.url.path.endsWith(
          '/v_card_prints_discovery_v1',
        );
        if (discovery && failed) {
          return http.Response(
            jsonEncode({'message': 'Discovery unavailable'}),
            503,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        var data = rows
            .where((row) => !discovery || row['id'] != legacy)
            .toList();
        final exact = request.url.queryParameters['gv_id'];
        if (exact?.startsWith('eq.') == true) {
          data = data
              .where((row) => row['gv_id'] == exact!.substring(3))
              .toList();
        }
        final limit =
            int.tryParse(request.url.queryParameters['limit'] ?? '') ?? 1000;
        data = data.take(limit).toList();
        return http.Response(
          jsonEncode(exact != null ? data.first : data),
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(c.dispose);
    return c;
  }

  test(
    'native name and set discovery apply the view before result limit',
    () async {
      final c = client();
      final named = await CardPrintRepository.fetchByNameLike(
        client: c,
        name: 'Clefable',
        limit: 1,
      );
      final set = await CardPrintRepository.fetchBySetCode(
        client: c,
        setCode: 'base2',
        limit: 2,
      );
      expect(named.single.id, options[0]['card_print_id']);
      expect(
        set.map((r) => r.id).toList(),
        options.map((o) => o['card_print_id']).toList(),
      );
      expect(
        requests.every(
          (r) => r.url.path.endsWith('/v_card_prints_discovery_v1'),
        ),
        true,
      );
    },
  );
  test('native exact and owned lookups retain the unresolved record', () async {
    final c = client();
    final exact = await CardPrintRepository.getCardPrintByGvId(
      client: c,
      gvId: 'GV-PK-JU-1',
    );
    final owned = await CardPrintRepository.fetchByIds(
      client: c,
      ids: rows.map((r) => r['id'] as String),
    );
    expect(exact!.id, legacy);
    expect(owned.map((r) => r.id), contains(legacy));
    expect(requests.every((r) => r.url.path.endsWith('/card_prints')), true);
  });
  test(
    'native discovery outage does not restore a raw-table fallback',
    () async {
      await expectLater(
        CardPrintRepository.fetchBySetCode(
          client: client(failed: true),
          setCode: 'base2',
        ),
        throwsA(isA<PostgrestException>()),
      );
      expect(requests, isNotEmpty);
      expect(
        requests.every(
          (r) => r.url.path.endsWith('/v_card_prints_discovery_v1'),
        ),
        true,
      );
    },
  );
}
