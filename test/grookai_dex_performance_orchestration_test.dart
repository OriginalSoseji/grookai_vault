import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/grookai_dex/grookai_dex_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _userId = '00000000-0000-0000-0000-000000000001';
const _speciesId = '10000000-0000-0000-0000-000000000001';
const _cardPrintId = '20000000-0000-0000-0000-000000000001';
const _printingId = '30000000-0000-0000-0000-000000000001';
const _rc5CardPrintId = 'efa15a49-a1f9-46b0-bd69-85111388328e';
const _rc5PrintingId = '40000000-0000-0000-0000-000000000001';

void main() {
  group('Dex paged reads', () {
    test('starts a two-page window together and merges by offset', () async {
      final calls = <int>[];
      final firstPage = Completer<List<int>>();
      final secondPage = Completer<List<int>>();

      final rowsFuture = fetchDexPagedRowsInWindows<int>(
        pageSize: 2,
        windowSize: 2,
        readPage: (offset, _) {
          calls.add(offset);
          return switch (offset) {
            0 => firstPage.future,
            2 => secondPage.future,
            _ => fail('Unexpected page offset: $offset'),
          };
        },
      );

      await Future<void>.delayed(Duration.zero);
      expect(calls, <int>[0, 2]);

      secondPage.complete(<int>[2]);
      await Future<void>.delayed(Duration.zero);
      firstPage.complete(<int>[0, 1]);

      expect(await rowsFuture, <int>[0, 1, 2]);
    });

    test(
      'continues in bounded windows and stops at the first short page',
      () async {
        final calls = <int>[];

        final rows = await fetchDexPagedRowsInWindows<int>(
          pageSize: 2,
          windowSize: 2,
          readPage: (offset, _) async {
            calls.add(offset);
            return switch (offset) {
              0 => <int>[0, 1],
              2 => <int>[2, 3],
              4 => <int>[4],
              6 => <int>[6, 7],
              _ => fail('Unexpected page offset: $offset'),
            };
          },
        );
        expect(rows, <int>[0, 1, 2, 3, 4]);
        expect(calls, <int>[0, 2, 4, 6]);
      },
    );
  });

  test(
    'root starts catalog, direct ownership, and slab ownership together',
    () async {
      final requests = <http.Request>[];
      final releaseInitialReads = Completer<void>();
      final initialReadsStarted = Completer<void>();

      void recordRequest(http.Request request) {
        requests.add(request);
        final catalogCount = requests
            .where(
              (value) => value.url.path == '/rest/v1/v_grookai_dex_species_v1',
            )
            .length;
        final hasDirectOwnership = requests.any(
          (value) => value.url.path == '/rest/v1/rpc/vault_owned_counts_v1',
        );
        final hasSlabOwnership = requests.any(
          (value) => value.url.path == '/rest/v1/vault_item_instances',
        );
        if (catalogCount == 2 &&
            hasDirectOwnership &&
            hasSlabOwnership &&
            !initialReadsStarted.isCompleted) {
          initialReadsStarted.complete();
        }
      }

      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          recordRequest(request);
          final isInitialRead =
              request.url.path == '/rest/v1/v_grookai_dex_species_v1' ||
              request.url.path == '/rest/v1/rpc/vault_owned_counts_v1' ||
              request.url.path == '/rest/v1/vault_item_instances';
          if (isInitialRead) {
            await releaseInitialReads.future;
          }

          final Object body;
          switch (request.url.path) {
            case '/rest/v1/v_grookai_dex_species_v1':
              final offset = request.url.queryParameters['offset'];
              body = offset == '0'
                  ? <Map<String, dynamic>>[_speciesSummaryRow()]
                  : <Map<String, dynamic>>[];
            case '/rest/v1/rpc/vault_owned_counts_v1':
              body = <Map<String, dynamic>>[
                <String, dynamic>{
                  'card_print_id': _cardPrintId,
                  'owned_count': 2,
                },
              ];
            case '/rest/v1/vault_item_instances':
              body = <Map<String, dynamic>>[];
            case '/rest/v1/card_print_species':
              body = <Map<String, dynamic>>[
                <String, dynamic>{
                  'id': '50000000-0000-0000-0000-000000000001',
                  'species_id': _speciesId,
                  'card_print_id': _cardPrintId,
                },
              ];
            default:
              fail('Unexpected request: ${request.url}');
          }
          return _jsonResponse(request, body);
        }),
      );
      addTearDown(client.dispose);
      await _authenticate(client);

      final pageFuture = GrookaiDexService.fetchSpeciesPage(client: client);
      await initialReadsStarted.future.timeout(const Duration(seconds: 2));

      final catalogRequests = requests
          .where(
            (request) =>
                request.url.path == '/rest/v1/v_grookai_dex_species_v1',
          )
          .toList(growable: false);
      expect(catalogRequests, hasLength(2));
      expect(
        catalogRequests
            .map((request) => request.url.queryParameters['offset'])
            .toSet(),
        <String?>{'0', '1000'},
      );

      releaseInitialReads.complete();
      final page = await pageFuture;

      expect(page.allSpecies, hasLength(1));
      expect(page.allSpecies.single.ownedPrintCount, 1);
      expect(page.allSpecies.single.ownedCopyCount, 2);
      final mappingRequest = requests.singleWhere(
        (request) => request.url.path == '/rest/v1/card_print_species',
      );
      expect(mappingRequest.url.queryParameters['active'], 'eq.true');
      expect(
        mappingRequest.url.queryParameters['counts_for_completion'],
        'eq.true',
      );
      expect(
        requests.where(
          (request) =>
              request.url.path == '/rest/v1/v_grookai_dex_card_prints_v1',
        ),
        isEmpty,
      );
    },
  );

  test(
    'species detail reads finish options and child images in one pass',
    () async {
      final requests = <http.Request>[];
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          requests.add(request);
          final Object body;
          switch (request.url.path) {
            case '/rest/v1/v_grookai_dex_card_prints_v1':
              body = <Map<String, dynamic>>[
                _speciesDetailRow(
                  cardPrintId: _cardPrintId,
                  name: 'Pikachu',
                  setName: 'Alpha Set',
                  number: '25',
                ),
                _speciesDetailRow(
                  cardPrintId: _rc5CardPrintId,
                  name: 'Torchic',
                  setName: 'Legendary Treasures',
                  number: 'RC5',
                ),
              ];
            case '/rest/v1/card_prints':
              body = <Map<String, dynamic>>[
                _parentImageRow(_cardPrintId),
                _parentImageRow(_rc5CardPrintId),
              ];
            case '/rest/v1/card_printings':
              body = <Map<String, dynamic>>[
                <String, dynamic>{
                  'id': _printingId,
                  'card_print_id': _cardPrintId,
                  'printing_gv_id': 'GV-PK-TEST-025-R',
                  'finish_key': 'reverse',
                  'finish_keys': <String, dynamic>{
                    'label': 'Reverse Holo',
                    'sort_order': 3,
                  },
                  'image_path': null,
                  'image_url': 'https://provider.example/pikachu-reverse.png',
                  'image_alt_url': null,
                  'image_status': 'exact',
                  'image_note': null,
                },
                <String, dynamic>{
                  'id': _rc5PrintingId,
                  'card_print_id': _rc5CardPrintId,
                  'printing_gv_id': 'GV-PK-LTR-RC5-N',
                  'finish_key': 'normal',
                  'finish_keys': <String, dynamic>{
                    'label': 'Normal',
                    'sort_order': 1,
                  },
                  'image_path': null,
                  'image_url': 'https://images.pokemontcg.io/bw11/5_hires.png',
                  'image_alt_url': null,
                  'image_status': 'exact',
                  'image_note': null,
                },
              ];
            case '/rest/v1/vault_item_instances':
              body = request.url.queryParameters['card_print_id'] == 'is.null'
                  ? <Map<String, dynamic>>[]
                  : <Map<String, dynamic>>[
                      <String, dynamic>{
                        'card_print_id': _cardPrintId,
                        'card_printing_id': _printingId,
                      },
                    ];
            default:
              fail('Unexpected request: ${request.url}');
          }
          return _jsonResponse(request, body);
        }),
      );
      addTearDown(client.dispose);
      await _authenticate(client);

      final detail = await GrookaiDexService.fetchSpeciesDetail(
        client: client,
        speciesSlug: 'pikachu',
      );

      expect(detail, isNotNull);
      final pikachu = detail!.cards.singleWhere(
        (card) => card.cardPrintId == _cardPrintId,
      );
      final rc5 = detail.cards.singleWhere(
        (card) => card.cardPrintId == _rc5CardPrintId,
      );
      expect(pikachu.printings.single.finishName, 'Reverse Holo');
      expect(pikachu.printings.single.ownedCount, 1);
      expect(pikachu.ownedCount, 1);
      expect(pikachu.unassignedPrintingCount, 0);
      expect(pikachu.imageUrl, 'https://provider.example/pikachu-reverse.png');
      expect(rc5.printings.single.finishName, 'Normal');
      expect(rc5.imageUrl, isNull);

      final printingRequests = requests
          .where((request) => request.url.path == '/rest/v1/card_printings')
          .toList(growable: false);
      expect(printingRequests, hasLength(1));
      final select = printingRequests.single.url.queryParameters['select'];
      expect(select, contains('finish_keys(label,sort_order)'));
      expect(select, contains('image_path'));
      expect(select, contains('image_status'));
    },
  );

  test('combined printing read retains the finish-key fallback', () async {
    final requests = <http.Request>[];
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        requests.add(request);
        switch (request.url.path) {
          case '/rest/v1/v_grookai_dex_card_prints_v1':
            return _jsonResponse(request, <Map<String, dynamic>>[
              _speciesDetailRow(
                cardPrintId: _cardPrintId,
                name: 'Pikachu',
                setName: 'Test Set',
                number: '25',
              ),
            ]);
          case '/rest/v1/card_prints':
            return _jsonResponse(request, <Map<String, dynamic>>[
              _parentImageRow(_cardPrintId),
            ]);
          case '/rest/v1/card_printings':
            final select = request.url.queryParameters['select'] ?? '';
            if (select.contains('finish_keys(')) {
              return http.Response(
                jsonEncode(<String, dynamic>{
                  'code': 'PGRST200',
                  'message': 'Relationship unavailable',
                  'details': null,
                  'hint': null,
                }),
                400,
                request: request,
                headers: const <String, String>{
                  'content-type': 'application/json',
                },
              );
            }
            return _jsonResponse(request, <Map<String, dynamic>>[
              <String, dynamic>{
                'id': _printingId,
                'card_print_id': _cardPrintId,
                'printing_gv_id': 'GV-PK-TEST-025-R',
                'finish_key': 'reverse',
                'image_path': null,
                'image_url': 'https://provider.example/fallback.png',
                'image_alt_url': null,
                'image_status': 'exact',
                'image_note': null,
              },
            ]);
          default:
            fail('Unexpected request: ${request.url}');
        }
      }),
    );
    addTearDown(client.dispose);

    final detail = await GrookaiDexService.fetchSpeciesDetail(
      client: client,
      speciesSlug: 'pikachu',
    );

    expect(detail, isNotNull);
    expect(detail!.cards.single.printings.single.finishName, 'Reverse Holo');
    expect(
      detail.cards.single.imageUrl,
      'https://provider.example/fallback.png',
    );
    final printingRequests = requests
        .where((request) => request.url.path == '/rest/v1/card_printings')
        .toList(growable: false);
    expect(printingRequests, hasLength(2));
    expect(
      printingRequests.last.url.queryParameters['select'],
      isNot(contains('finish_keys(')),
    );
  });
}

Map<String, dynamic> _speciesSummaryRow() {
  return <String, dynamic>{
    'species_id': _speciesId,
    'national_dex_number': 25,
    'display_name': 'Pikachu',
    'slug': 'pikachu',
    'types': <String>['electric'],
    'generation': 1,
    'total_print_count': 1,
    'active': true,
  };
}

Map<String, dynamic> _speciesDetailRow({
  required String cardPrintId,
  required String name,
  required String setName,
  required String number,
}) {
  return <String, dynamic>{
    'species_id': _speciesId,
    'species_slug': 'pikachu',
    'species_display_name': 'Pikachu',
    'national_dex_number': 25,
    'card_print_id': cardPrintId,
    'gv_id': null,
    'name': name,
    'set_code': 'TST',
    'set_name': setName,
    'number': number,
    'rarity': 'Rare',
    'variant_key': null,
    'image_url': null,
    'image_alt_url': null,
    'representative_image_url': null,
    'role': 'primary',
    'counts_for_completion': true,
    'mapping_active': true,
  };
}

Map<String, dynamic> _parentImageRow(String cardPrintId) {
  return <String, dynamic>{
    'id': cardPrintId,
    'printed_identity_modifier': null,
    'image_url': null,
    'representative_image_url': null,
    'image_status': null,
    'image_note': null,
  };
}

http.Response _jsonResponse(http.Request request, Object body) {
  return http.Response(
    jsonEncode(body),
    200,
    request: request,
    headers: const <String, String>{'content-type': 'application/json'},
  );
}

Future<void> _authenticate(SupabaseClient client) {
  return client.auth.setInitialSession(
    jsonEncode(
      Session(
        accessToken: 'header.payload.signature',
        tokenType: 'bearer',
        user: const User(
          id: _userId,
          appMetadata: <String, dynamic>{},
          userMetadata: <String, dynamic>{},
          aud: 'authenticated',
          createdAt: '2026-07-23T00:00:00Z',
        ),
      ).toJson(),
    ),
  );
}
