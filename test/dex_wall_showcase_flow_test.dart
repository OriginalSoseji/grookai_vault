import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/grookai_dex/dex_wall_showcase_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  group('Dex Wall showcase selection', () {
    test('starts with zero exact copies selected', () {
      final selection = DexWallShowcaseSelection.initial([
        _copy(instanceId: 'copy-showcase', intent: 'showcase'),
        _copy(instanceId: 'copy-trade', intent: 'trade'),
      ]);

      expect(selection.selectedInstanceIds, isEmpty);
      expect(selection.selectedCopies, isEmpty);
    });

    test('only explicitly toggles already-discoverable copies', () {
      var selection = DexWallShowcaseSelection.initial([
        _copy(instanceId: 'copy-showcase', intent: 'showcase'),
        _copy(instanceId: 'copy-sell', intent: 'sell'),
        _copy(instanceId: 'copy-hold', intent: 'hold'),
      ]);

      selection = selection.toggle('copy-hold');
      expect(selection.selectedInstanceIds, isEmpty);

      selection = selection.toggle('copy-showcase');
      selection = selection.toggle('copy-sell');
      expect(
        selection.selectedInstanceIds,
        unorderedEquals(<String>['copy-showcase', 'copy-sell']),
      );

      selection = selection.toggle('copy-showcase');
      expect(selection.selectedInstanceIds, <String>{'copy-sell'});
    });

    test('exposes finish and exact copy identity for review', () {
      final copy = DexWallShowcaseCopy(
        instanceId: '11111111-2222-3333-4444-555555555555',
        gvviId: 'GV-VI-EXACT-42',
        cardPrintId: 'card-1',
        cardName: 'Pikachu',
        setName: 'Test Set',
        cardPrintingId: 'printing-1',
        finishLabel: 'Reverse Holo',
        intent: 'showcase',
        isSlab: true,
        certNumber: '12345678',
      );

      expect(copy.finishDisplayLabel, 'Reverse Holo');
      expect(copy.copyIdentityLabel, 'GV-VI-EXACT-42');
      expect(copy.certNumber, '12345678');
    });
  });

  group('Dex Wall public settings gate', () {
    test('requires both public profile and Vault sharing', () {
      expect(
        const DexWallShowcaseProfileGate(
          publicProfileEnabled: true,
          vaultSharingEnabled: true,
        ).canPublish,
        isTrue,
      );
      expect(
        const DexWallShowcaseProfileGate(
          publicProfileEnabled: true,
          vaultSharingEnabled: false,
        ).canPublish,
        isFalse,
      );
      expect(
        const DexWallShowcaseProfileGate(
          publicProfileEnabled: false,
          vaultSharingEnabled: true,
        ).canPublish,
        isFalse,
      );
    });
  });

  test(
    'load scopes direct and slab copies and resolves exact finish',
    () async {
      const userId = '00000000-0000-0000-0000-000000000001';
      const cardPrintId = '10000000-0000-0000-0000-000000000001';
      const cardPrintingId = '20000000-0000-0000-0000-000000000001';
      const slabCertId = '30000000-0000-0000-0000-000000000001';
      final requests = <http.Request>[];
      final client = SupabaseClient(
        'https://example.supabase.co',
        'public-anon-key',
        httpClient: MockClient((request) async {
          requests.add(request);
          Object body;
          switch (request.url.path) {
            case '/rest/v1/public_profiles':
              body = <String, dynamic>{
                'public_profile_enabled': true,
                'vault_sharing_enabled': true,
              };
            case '/rest/v1/wall_sections':
              body = <Map<String, dynamic>>[
                <String, dynamic>{
                  'id': '40000000-0000-0000-0000-000000000001',
                  'name': 'Pikachu Favorites',
                  'position': 0,
                  'is_active': true,
                  'is_public': true,
                },
              ];
            case '/rest/v1/slab_certs':
              body = <Map<String, dynamic>>[
                <String, dynamic>{
                  'id': slabCertId,
                  'card_print_id': cardPrintId,
                  'grader': 'PSA',
                  'grade': 10,
                  'cert_number': '12345678',
                },
              ];
            case '/rest/v1/vault_item_instances':
              final isSlabQuery =
                  request.url.queryParameters['card_print_id'] == 'is.null';
              body = isSlabQuery
                  ? <Map<String, dynamic>>[
                      <String, dynamic>{
                        'id': '50000000-0000-0000-0000-000000000002',
                        'gv_vi_id': 'GV-VI-SLAB-2',
                        'card_print_id': null,
                        'card_printing_id': null,
                        'slab_cert_id': slabCertId,
                        'intent': 'hold',
                        'condition_label': null,
                        'grade_company': null,
                        'grade_value': null,
                        'grade_label': null,
                      },
                    ]
                  : <Map<String, dynamic>>[
                      <String, dynamic>{
                        'id': '50000000-0000-0000-0000-000000000001',
                        'gv_vi_id': 'GV-VI-RAW-1',
                        'card_print_id': cardPrintId,
                        'card_printing_id': cardPrintingId,
                        'slab_cert_id': null,
                        'intent': 'showcase',
                        'condition_label': 'NM',
                        'grade_company': null,
                        'grade_value': null,
                        'grade_label': null,
                      },
                    ];
            case '/rest/v1/card_prints':
              body = <Map<String, dynamic>>[
                <String, dynamic>{
                  'id': cardPrintId,
                  'gv_id': 'GV-PK-TEST-25',
                  'name': 'Pikachu',
                  'set_code': 'TST',
                  'number': '25',
                  'image_url': 'https://provider.example/pikachu.png',
                  'image_alt_url': null,
                  'representative_image_url': null,
                  'sets': <String, dynamic>{'name': 'Test Set'},
                },
              ];
            case '/rest/v1/card_printings':
              body = <Map<String, dynamic>>[
                <String, dynamic>{
                  'id': cardPrintingId,
                  'finish_key': 'reverse',
                  'finish_keys': <String, dynamic>{'label': 'Reverse Holo'},
                },
              ];
            default:
              fail('Unexpected request: ${request.url}');
          }
          return http.Response(
            jsonEncode(body),
            200,
            request: request,
            headers: const <String, String>{'content-type': 'application/json'},
          );
        }),
      );
      addTearDown(client.dispose);
      await client.auth.setInitialSession(
        jsonEncode(
          Session(
            accessToken: 'header.payload.signature',
            tokenType: 'bearer',
            user: const User(
              id: userId,
              appMetadata: <String, dynamic>{},
              userMetadata: <String, dynamic>{},
              aud: 'authenticated',
              createdAt: '2026-07-23T00:00:00Z',
            ),
          ).toJson(),
        ),
      );

      final data = await DexWallShowcaseService.load(
        client: client,
        canonicalCardPrintIds: const <String>{cardPrintId},
      );

      expect(data.profileGate.canPublish, isTrue);
      expect(data.sections.single.name, 'Pikachu Favorites');
      expect(data.copies, hasLength(2));
      final direct = data.copies.singleWhere(
        (copy) => copy.gvviId == 'GV-VI-RAW-1',
      );
      final slab = data.copies.singleWhere(
        (copy) => copy.gvviId == 'GV-VI-SLAB-2',
      );
      expect(direct.finishDisplayLabel, 'Reverse Holo');
      expect(direct.isEligible, isTrue);
      expect(direct.hostedImageUrl, contains('/api/canon/cards/'));
      expect(slab.isSlab, isTrue);
      expect(slab.certNumber, '12345678');
      expect(slab.isEligible, isFalse);

      final slabLookup = requests.singleWhere(
        (request) => request.url.path == '/rest/v1/slab_certs',
      );
      expect(slabLookup.url.queryParameters['id'], contains(slabCertId));
      final slabInstanceLookup = requests.singleWhere(
        (request) =>
            request.url.path == '/rest/v1/vault_item_instances' &&
            request.url.queryParameters['card_print_id'] == 'is.null',
      );
      expect(
        slabInstanceLookup.url.queryParameters['user_id'],
        contains(userId),
      );
    },
  );

  group('Dex Wall assignment request', () {
    test('requires final confirmation and exact copy IDs', () {
      final unconfirmed = DexWallShowcaseAssignmentRequest(
        canonicalCardPrintIds: const <String>{'card-1'},
        selectedInstanceIds: const <String>{'instance-1'},
        existingSectionId: 'section-1',
        confirmed: false,
      );
      expect(unconfirmed.validate, throwsStateError);

      final confirmed = DexWallShowcaseAssignmentRequest(
        canonicalCardPrintIds: const <String>{'card-1'},
        selectedInstanceIds: const <String>{'instance-1', 'instance-2'},
        existingSectionId: 'section-1',
        confirmed: true,
      );
      expect(confirmed.validate, returnsNormally);
      expect(confirmed.selectedInstanceIds, <String>{
        'instance-1',
        'instance-2',
      });
    });

    test('accepts exactly one explicit section target', () {
      expect(
        DexWallShowcaseAssignmentRequest(
          canonicalCardPrintIds: const <String>{'card-1'},
          selectedInstanceIds: const <String>{'instance-1'},
          existingSectionId: 'section-1',
          newSectionName: 'Also New',
          confirmed: true,
        ).validate,
        throwsStateError,
      );
      expect(
        DexWallShowcaseAssignmentRequest(
          canonicalCardPrintIds: const <String>{'card-1'},
          selectedInstanceIds: const <String>{'instance-1'},
          newSectionName: '  Favorite   Pikachu  ',
          confirmed: true,
        ).validate,
        returnsNormally,
      );
    });
  });

  group('Dex Wall source safety contract', () {
    final serviceSource = File(
      'lib/services/grookai_dex/dex_wall_showcase_service.dart',
    ).readAsStringSync();
    final screenSource = File(
      'lib/screens/dex/dex_wall_showcase_screen.dart',
    ).readAsStringSync();
    final speciesSource = File(
      'lib/screens/dex/grookai_dex_species_screen.dart',
    ).readAsStringSync();

    test('rechecks both public settings without enabling them', () {
      expect(serviceSource, contains(".from('public_profiles')"));
      expect(serviceSource, contains('public_profile_enabled'));
      expect(serviceSource, contains('vault_sharing_enabled'));
      expect(serviceSource, isNot(contains('.update(')));
      expect(screenSource, contains('Public sharing is off'));
      expect(screenSource, contains('Review Account settings'));
    });

    test('loads direct and slab-only exact owned instances', () {
      expect(serviceSource, contains(".from('vault_item_instances')"));
      expect(serviceSource, contains(".from('slab_certs')"));
      expect(serviceSource, contains("filter('card_print_id', 'is', null)"));
      expect(serviceSource, contains("_loadOwnerSlabOnlyInstanceRows("));
      expect(serviceSource, contains("_loadOwnedSlabMetadata("));
      expect(serviceSource, contains("inFilter('id', chunk)"));
      expect(
        serviceSource,
        contains('canonicalCardPrintIds.contains(slab.cardPrintId)'),
      );
    });

    test('uses exact-copy membership RPC after explicit confirmation', () {
      expect(
        serviceSource,
        contains("'vault_set_copy_section_memberships_v1'"),
      );
      expect(serviceSource, contains("'p_instance_ids': selectedIds"));
      expect(serviceSource, contains("'p_add': true"));
      expect(serviceSource, contains(".from('wall_section_memberships')"));
      expect(screenSource, contains('Confirm public Wall update'));
      expect(screenSource, contains('Confirm & add to Wall'));
      expect(screenSource, contains('confirmed: true'));
    });

    test('shows finish, copy identity, and slab certificate in review', () {
      expect(serviceSource, contains('card_printing_id'));
      expect(serviceSource, contains(".from('card_printings')"));
      expect(serviceSource, contains('finish_keys(label)'));
      expect(screenSource, contains('copy.finishDisplayLabel'));
      expect(screenSource, contains('copy.copyIdentityLabel'));
      expect(screenSource, contains("'Cert \${copy.certNumber}'"));
    });

    test('does not imply that Hold removes existing section membership', () {
      expect(
        screenSource,
        contains('to Hold later does not remove it from this public section'),
      );
      expect(
        serviceSource,
        contains('remove that section membership in Vault to hide it'),
      );
      expect(screenSource, isNot(contains('private Hold copies stay private')));
    });

    test('starts empty and never mutates intent or compatibility state', () {
      expect(screenSource, contains('DexWallShowcaseSelection.initial('));
      expect(screenSource, contains('const <DexWallShowcaseCopy>[]'));
      expect(serviceSource, isNot(contains(".from('shared_cards')")));
      expect(serviceSource, isNot(contains(".from('vault_items')")));
      expect(serviceSource, isNot(contains(".from('user_card_intents')")));
      expect(serviceSource, isNot(contains('SharedPreferences')));
      expect(serviceSource, isNot(contains("'intent':")));
    });

    test('creates only explicitly named public sections', () {
      expect(serviceSource, contains(".from('wall_sections')"));
      expect(serviceSource, contains("'is_active': true"));
      expect(serviceSource, contains("'is_public': true"));
      expect(screenSource, contains('Create a new public section'));
      expect(screenSource, contains('Public section name'));
    });

    test('matches fail-safe section limits and rolls back empty creation', () {
      expect(serviceSource, contains('kDexWallFreeActiveSectionLimit = 3'));
      expect(serviceSource, contains('kDexWallStoredSectionLimit = 20'));
      expect(
        serviceSource,
        contains("You've reached the section limit for your plan."),
      );
      expect(serviceSource, contains('You can store up to 20 sections.'));
      expect(serviceSource, contains('_rollbackEmptyCreatedSection('));
      expect(serviceSource, contains(".from('wall_sections')"));
      expect(serviceSource, contains('.delete()'));
    });

    test('renders Grookai-hosted artwork as the primary image', () {
      expect(serviceSource, contains('resolveCatalogArtwork('));
      expect(screenSource, contains('imageUrl: copy.hostedImageUrl'));
      expect(screenSource, contains('fallbackImageUrl: copy.fallbackImageUrl'));
    });

    test('species actions open the explicit showcase review flow', () {
      expect(speciesSource, contains('DexWallShowcaseScreen('));
      expect(speciesSource, contains("'Curate Wall showcase'"));
      expect(speciesSource, contains('canonicalCardPrintIds: detail.cards'));
      expect(speciesSource, contains('onOpenSharingSettings: () async'));
      expect(speciesSource, contains('const AccountScreen()'));
    });
  });
}

DexWallShowcaseCopy _copy({
  required String instanceId,
  required String intent,
}) {
  return DexWallShowcaseCopy(
    instanceId: instanceId,
    cardPrintId: 'card-1',
    cardName: 'Pikachu',
    setName: 'Test Set',
    intent: intent,
    isSlab: false,
  );
}
