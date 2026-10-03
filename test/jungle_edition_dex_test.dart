import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/grookai_dex/grookai_dex_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const speciesId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
  final parents = [legacy, ...options.map((o) => o['card_print_id'] as String)];
  late List<http.Request> requests;

  Future<SupabaseClient> client({
    bool owner = true,
    bool failed = false,
    bool missing = false,
    bool explicitMappings = true,
    List<String>? excluded,
    bool manyMappings = false,
    bool forAdd = false,
  }) async {
    requests = [];
    final mappedIds = explicitMappings ? parents : [legacy];
    final counts = <String, int>{legacy: 5, parents[1]: 1};
    final c = SupabaseClient(
      'http://127.0.0.1:54321',
      'fixture-public-key',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient((request) async {
        requests.add(request);
        final name = request.url.path.split('/').last;
        Object data;
        var status = 200;
        switch (name) {
          case 'get_jungle_edition_resolution_v1':
            data = {...fixture, 'status': 'ready'};
          case 'vault-add-card-instance-v1':
            data = {
              'result': {'gv_vi_id': 'fixture-copy'},
            };
          case 'card_events_emit_completion_crossings_v1':
            data = {};
          case 'pokemon_species':
            data = [
              {'id': speciesId, 'slug': 'clefable', 'display_name': 'Clefable'},
            ];
          case 'get_jungle_edition_discovery_exclusions_v1':
            data = failed || missing
                ? {
                    'code': missing ? 'PGRST202' : '57014',
                    'message': missing
                        ? 'get_jungle_edition_discovery_exclusions_v1 missing'
                        : 'timeout',
                  }
                : excluded ?? [legacy];
            if (failed || missing) status = missing ? 404 : 503;
          case 'v_grookai_dex_species_v1':
            data = request.url.queryParameters['offset'] == '0'
                ? [
                    {
                      'species_id': speciesId,
                      'national_dex_number': 36,
                      'display_name': 'Clefable',
                      'slug': 'clefable',
                      'types': ['fairy'],
                      'total_print_count': mappedIds.length,
                    },
                  ]
                : [];
          case 'card_print_species':
            final rows = [
              for (final id in mappedIds)
                {'id': id, 'species_id': speciesId, 'card_print_id': id},
              for (var i = 0; i < (manyMappings ? 1001 : 1); i++)
                {
                  'id': 'duplicate-$i',
                  'species_id': speciesId,
                  'card_print_id': legacy,
                },
            ];
            expect(request.url.queryParameters['active'], 'eq.true');
            expect(
              request.url.queryParameters['counts_for_completion'],
              'eq.true',
            );
            final offset = int.parse(
              request.url.queryParameters['offset'] ?? '0',
            );
            final limit = int.parse(
              request.url.queryParameters['limit'] ?? '1000',
            );
            data = rows
                .where(
                  (row) => request.url.queryParameters['card_print_id']!
                      .contains(row['card_print_id']!),
                )
                .skip(offset)
                .take(limit)
                .toList();
          case 'v_grookai_dex_card_prints_v1':
            data = [
              for (final id in mappedIds)
                {
                  'species_id': speciesId,
                  'species_slug': 'clefable',
                  'species_display_name': 'Clefable',
                  'national_dex_number': 36,
                  'card_print_id': id,
                  'gv_id': id == legacy
                      ? 'GV-PK-JU-1'
                      : options.firstWhere(
                          (o) => o['card_print_id'] == id,
                        )['gv_id'],
                  'name': 'Clefable',
                  'set_code': 'base2',
                  'set_name': 'Jungle',
                  'number': '1',
                  'counts_for_completion': true,
                  'mapping_active': true,
                  'role': 'primary',
                  'image_url': id == legacy
                      ? 'https://example.com/legacy-first-edition.png'
                      : null,
                },
            ];
          case 'card_prints':
            data = forAdd
                ? {'set_id': null}
                : [
                    for (final id in mappedIds)
                      {
                        'id': id,
                        'printed_identity_modifier': id == legacy
                            ? null
                            : 'edition:${options.firstWhere((o) => o['card_print_id'] == id)['edition']}',
                      },
                  ];
          case 'vault_owned_counts_v1':
            data = [
              for (final entry in counts.entries)
                if (!forAdd || entry.key == legacy)
                  {'card_print_id': entry.key, 'owned_count': entry.value},
            ];
          case 'vault_item_instances':
            if (forAdd ||
                request.url.queryParameters['card_print_id'] == 'is.null') {
              data = [];
            } else {
              expect(
                request.url.queryParameters['card_print_id'],
                contains(legacy),
              );
              data = [
                for (var i = 0; i < 5; i++)
                  {
                    'id': 'legacy-$i',
                    'card_print_id': legacy,
                    'card_printing_id': 'old-printing',
                  },
                if (explicitMappings)
                  {
                    'id': 'owned-edition',
                    'card_print_id': parents[1],
                    'card_printing_id': options[0]['card_printing_id'],
                  },
              ];
            }
          case 'get_public_card_printing_options_v1':
            final ids =
                (jsonDecode(request.body) as Map)['p_card_print_ids'] as List;
            if (!missing) expect(ids, isNot(contains(legacy)));
            data = [
              for (final option in options)
                if (ids.contains(option['card_print_id']))
                  {
                    'id': option['card_printing_id'],
                    'card_print_id': option['card_print_id'],
                    'printing_gv_id': option['printing_gv_id'],
                    'finish_key': option['finish_key'],
                    'finish_label': 'Holo',
                    'finish_is_active': true,
                  },
            ];
          default:
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
    addTearDown(c.dispose);
    if (owner) {
      await c.auth.setInitialSession(
        jsonEncode(
          Session(
            accessToken: 'header.payload.signature',
            tokenType: 'bearer',
            user: const User(
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              appMetadata: {},
              userMetadata: {},
              aud: 'authenticated',
              createdAt: '2026-10-01T00:00:00Z',
            ),
          ).toJson(),
        ),
      );
    }
    return c;
  }

  test(
    'native add emits 0-to-50 percent from the two editions, without legacy credit',
    () async {
      final c = await client(forAdd: true);
      final result = await VaultCardService.addOrIncrementVaultItem(
        client: c,
        userId: c.auth.currentUser!.id,
        cardId: parents[1],
        cardPrintingId: options[0]['card_printing_id'] as String,
      );
      expect(result, 'fixture-copy');
      final emitted = requests.singleWhere(
        (r) => r.url.path.endsWith('/card_events_emit_completion_crossings_v1'),
      );
      final payload = jsonDecode(emitted.body) as Map;
      expect(payload['p_subject_type'], 'character');
      expect(payload['p_previous_percent'], 0);
      expect(payload['p_next_percent'], 50);
      expect((payload['p_payload'] as Map)['card_print_id'], parents[1]);
    },
  );

  test(
    'native Dex uses distinct existing mappings across pages and preserves copy totals',
    () async {
      final result = await GrookaiDexService.fetchSpeciesPage(
        client: await client(manyMappings: true),
      );
      final row = result.allSpecies.single;
      expect(row.totalPrintCount, 2);
      expect(row.ownedPrintCount, 1);
      expect(row.ownedCopyCount, 6);
      expect(row.completionPercent, 50);
      expect(
        requests.any(
          (r) =>
              r.url.path.endsWith('/card_print_species') &&
              r.url.queryParameters['offset'] == '1000',
        ),
        true,
      );
    },
  );
  test(
    'native public Dex excludes unresolved reference without ownership requests',
    () async {
      final result = await GrookaiDexService.fetchSpeciesPage(
        client: await client(owner: false),
      );
      expect(result.allSpecies.single.totalPrintCount, 2);
      expect(result.allSpecies.single.ownedPrintCount, 0);
      expect(requests.any((r) => r.url.path.contains('vault_')), false);
    },
  );
  test(
    'native detail retains unresolved copies as additional and never clones their image',
    () async {
      final result = (await GrookaiDexService.fetchSpeciesDetail(
        client: await client(),
        speciesSlug: 'clefable',
      ))!;
      expect(result.totalPrintCount, 2);
      expect(result.ownedPrintCount, 1);
      expect(result.ownedCopyCount, 6);
      expect(result.variantOptionCount, 2);
      expect(result.ownedVariantOptionCount, 1);
      final held = result.additionalCards.single;
      expect(held.cardPrintId, legacy);
      expect(held.editionReviewRequired, true);
      expect(held.ownedCount, 5);
      expect(held.totalOptionCount, 0);
      expect(held.ownedOptionCount, 0);
      expect(held.needsPrintingSelection, false);
      expect(
        result.completionCards.every((card) => card.imageUrl == null),
        true,
      );
    },
  );
  test(
    'native public detail presents only the two reviewed editions',
    () async {
      final result = (await GrookaiDexService.fetchSpeciesDetail(
        client: await client(owner: false),
        speciesSlug: 'clefable',
      ))!;
      expect(result.cards.length, 2);
      expect(result.additionalCards, isEmpty);
      expect(requests.any((r) => r.url.path.contains('vault_')), false);
    },
  );
  test(
    'native Dex never derives new species mappings from an edition link',
    () async {
      final c = await client(explicitMappings: false);
      final page = await GrookaiDexService.fetchSpeciesPage(client: c);
      final detail = (await GrookaiDexService.fetchSpeciesDetail(
        client: c,
        speciesSlug: 'clefable',
      ))!;
      expect(page.allSpecies.single.totalPrintCount, 0);
      expect(page.allSpecies.single.ownedPrintCount, 0);
      expect(detail.totalPrintCount, 0);
      expect(detail.ownedCopyCount, 5);
    },
  );
  test(
    'native partial pair remains held and all saved identities stay available',
    () async {
      final c = await client(excluded: parents);
      final page = await GrookaiDexService.fetchSpeciesPage(client: c);
      final detail = (await GrookaiDexService.fetchSpeciesDetail(
        client: c,
        speciesSlug: 'clefable',
      ))!;
      expect(page.allSpecies.single.totalPrintCount, 0);
      expect(page.allSpecies.single.ownedPrintCount, 0);
      expect(detail.variantOptionCount, 0);
      expect(detail.additionalCards.length, 2);
      expect(detail.ownedCopyCount, 6);
    },
  );
  test(
    'native Dex propagates discovery outage instead of inventing completion',
    () async {
      final c = await client(failed: true);
      await expectLater(
        GrookaiDexService.fetchSpeciesPage(client: c),
        throwsA(isA<PostgrestException>()),
      );
      await expectLater(
        GrookaiDexService.fetchSpeciesDetail(
          client: c,
          speciesSlug: 'clefable',
        ),
        throwsA(isA<PostgrestException>()),
      );
    },
  );
  test('native Dex supports exact missing-RPC compatibility', () async {
    final c = await client(missing: true);
    expect(
      (await GrookaiDexService.fetchSpeciesPage(
        client: c,
      )).allSpecies.single.totalPrintCount,
      3,
    );
    expect(
      (await GrookaiDexService.fetchSpeciesDetail(
        client: c,
        speciesSlug: 'clefable',
      ))!.totalPrintCount,
      3,
    );
  });
  test(
    'owned species filter retains unresolved IDs and does not become discovery',
    () async {
      final result = await GrookaiDexService.fetchCardPrintIdsForSpecies(
        client: await client(),
        speciesSlug: 'clefable',
      );
      expect(result, contains(legacy));
      expect(
        requests.any(
          (r) => r.url.path.contains('get_jungle_edition_discovery'),
        ),
        false,
      );
    },
  );
}
