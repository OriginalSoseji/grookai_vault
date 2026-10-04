import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/public/public_sets_service.dart';
import 'package:grookai_vault/services/public/jungle_edition_resolution_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';

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
  final cards =
      [
            {'id': legacy, 'gv_id': 'GV-PK-JU-1'},
            for (final option in options)
              {'id': option['card_print_id'], 'gv_id': option['gv_id']},
          ]
          .map(
            (row) => {
              ...row,
              'name': 'Clefable',
              'number': '1',
              'number_plain': '1',
              'set_code': 'base2',
            },
          )
          .toList();
  late List<http.Request> requests;
  SupabaseClient client({bool failed = false, Object? exclusions}) {
    requests = [];
    final client = SupabaseClient(
      'http://127.0.0.1:54321',
      'fixture-public-key',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient((request) async {
        requests.add(request);
        final name = request.url.path.split('/').last;
        Object? data;
        var status = 200;
        if (name == 'get_jungle_edition_discovery_exclusions_v1') {
          data = failed
              ? {'code': '57014', 'message': 'timeout'}
              : exclusions ?? [legacy];
          if (failed) status = 503;
        } else if (name == 'sets') {
          data = [
            {'code': 'base2'},
          ];
        } else if (name == 'card_prints') {
          var rows = cards
              .where(
                (row) =>
                    request.url.queryParameters['id']?.startsWith('not.in.') !=
                        true ||
                    row['id'] != legacy,
              )
              .toList();
          final offset =
              int.tryParse(request.url.queryParameters['offset'] ?? '') ?? 0;
          final limit =
              int.tryParse(request.url.queryParameters['limit'] ?? '') ?? 1000;
          data = rows.skip(offset).take(limit).toList();
        } else if (name == 'card_printings') {
          final filter = request.url.queryParameters['card_print_id']!;
          expect(filter, isNot(contains(legacy)));
          data = [
            for (final option in options)
              if (filter.contains(option['card_print_id']))
                {
                  'id': option['card_printing_id'],
                  'card_print_id': option['card_print_id'],
                },
          ];
        } else if (name == 'vault_item_instances') {
          expect(
            request.url.queryParameters['card_print_id'],
            contains(legacy),
          );
          data = [
            for (var i = 0; i < 5; i++)
              {
                'id': 'legacy-copy-$i',
                'card_print_id': legacy,
                'card_printing_id': 'old-child',
              },
            {
              'id': 'selected-edition-copy',
              'card_print_id': options[0]['card_print_id'],
              'card_printing_id': options[0]['card_printing_id'],
            },
          ];
        } else if ([
          'get_market_pricing_read_model_v1',
          'get_public_card_printing_options_v1',
        ].contains(name)) {
          data = [];
        } else {
          throw StateError('Unexpected request $name');
        }
        return http.Response(
          jsonEncode(data),
          status,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(client.dispose);
    return client;
  }

  test(
    'native set filtering precedes pagination and retains both edition pages',
    () async {
      final c = client();
      final first = await PublicSetsService.fetchSetCards(
        client: c,
        setCode: 'base2',
        limit: 1,
      );
      final second = await PublicSetsService.fetchSetCards(
        client: c,
        setCode: 'base2',
        offset: 1,
        limit: 1,
      );
      expect([
        first.single.cardPrintId,
        second.single.cardPrintId,
      ], options.map((o) => o['card_print_id']).toList());
      expect(
        requests
            .where((r) => r.url.path.endsWith('/card_prints'))
            .every((r) => r.url.queryParameters['id'] == 'not.in.($legacy)'),
        true,
      );
    },
  );
  test(
    'native completion reads retained copies but credits only their exact edition',
    () async {
      final result = await VaultCardService.fetchSetCompletionSnapshot(
        client: client(),
        userId: 'fixture-owner',
        setId: 'fixture-set',
        ownerSlabOnlyCopies: [],
      );
      expect(result.variantOptionCount, 2);
      expect(result.ownedVariantOptionCount, 1);
      expect(result.optionKeys.any((key) => key.startsWith(legacy)), false);
    },
  );
  test('discovery outage stops the set page before any card fetch', () async {
    await expectLater(
      PublicSetsService.fetchSetCards(
        client: client(failed: true),
        setCode: 'base2',
      ),
      throwsA(isA<PostgrestException>()),
    );
    expect(requests.where((r) => r.url.path.endsWith('/card_prints')), isEmpty);
  });
  for (final value in [
    ['bad'],
    [legacy, legacy],
    {'unexpected': true},
  ]) {
    test('malformed discovery DTO fails closed: $value', () async {
      await expectLater(
        getJungleDiscoveryExclusions(client(exclusions: value)),
        throwsFormatException,
      );
    });
  }
}
