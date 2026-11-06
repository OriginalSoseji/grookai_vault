import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/public/public_card_printing_options_service.dart';
import 'package:grookai_vault/services/vault/vault_gvvi_service.dart';
import 'support/collector_refinement/main.dart';
import 'support/collector_refinement/catalog.dart';

void main() {
  test(
    'Binder fixture provides bounded reads and rejects every write',
    () async {
      final repository = PreviewBinderRepository();
      expect(repository.currentUserId, isNull);
      final cards = await repository.searchCustomCards(query: 'Eevee 173');
      expect(cards.single.cardPrintId, previewCatalog.first['id']);
      final finishes = await repository.loadCardFinishOptions(
        cards.single.cardPrintId,
      );
      expect(finishes.map((option) => option.cardPrintingId), [
        null,
        previewPrintingId,
      ]);
      expect(
        await repository.searchCustomCards(query: 'not in sample catalog'),
        isEmpty,
      );
      await expectLater(
        repository.loadCardFinishOptions('outside-fixture'),
        throwsException,
      );
      expect(
        () =>
            repository.deleteBinder(publicId: 'sample', confirmation: 'sample'),
        throwsUnsupportedError,
      );
    },
  );
  test(
    'comment preview reads only its sample card and rejects posting',
    () async {
      final uri = Uri.parse('http://127.0.0.1:54321/rest/v1/card_comments')
          .replace(
            queryParameters: {
              'card_print_id': 'eq.${previewCatalog.first['id']}',
            },
          );
      final response = await previewRequest(http.Request('GET', uri));
      expect(jsonDecode(response.body), hasLength(2));
      expect((await previewRequest(http.Request('POST', uri))).statusCode, 403);
      expect(
        (await previewRequest(
          http.Request(
            'GET',
            uri.replace(queryParameters: {'card_print_id': 'eq.another-card'}),
          ),
        )).statusCode,
        403,
      );
    },
  );
  test(
    'copy review loads its exact sample and rejects another copy or inventory write',
    () async {
      final client = SupabaseClient(
        'http://127.0.0.1:54321',
        'local-preview-test',
        httpClient: MockClient(previewRequest),
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );
      addTearDown(client.dispose);
      final copy = await VaultGvviService.loadPrivate(
        client: client,
        gvviId: previewGvviId,
      );
      expect(copy?.cardPrintingId, previewPrintingId);
      expect(copy?.conditionLabel, 'LP');
      expect(copy?.marketReferencePrice, 8.37);
      expect(copy?.marketReferenceSource, 'tcgplayer');
      for (final path in [
        '/rest/v1/rpc/vault_mobile_instance_detail_v1',
        '/rest/v1/rpc/vault_mobile_instance_pricing_target_v1',
        '/rest/v1/rpc/vault_set_copy_intent_v1',
      ]) {
        final request = http.Request(
          'POST',
          Uri.parse('http://127.0.0.1:54321$path'),
        )..body = jsonEncode({'p_gv_vi_id': 'GVVI-ANOTHER'});
        expect((await previewRequest(request)).statusCode, 403);
      }
    },
  );
  test(
    'real detail catalog reads resolve the fixture exact printing',
    () async {
      final client = SupabaseClient(
        'http://127.0.0.1:54321',
        'local-preview-test',
        httpClient: MockClient(previewRequest),
        authOptions: const AuthClientOptions(autoRefreshToken: false),
      );
      addTearDown(client.dispose);
      final card = await client
          .from('card_prints')
          .select()
          .eq('id', previewCatalog.first['id']!)
          .maybeSingle();
      expect(card?['id'], previewCatalog.first['id']);
      final related = await client
          .from('card_prints')
          .select()
          .eq('name', 'Eevee')
          .neq('id', previewCatalog.first['id']!);
      expect(related, isEmpty);
      final printings = await PublicCardPrintingOptionsService.fetch(
        client: client,
        cardPrintIds: [card!['id'] as String],
      );
      expect(printings.single['id'], previewPrintingId);
    },
  );
  test(
    'preview refuses remote targets and all account or inventory writes',
    () async {
      await expectLater(
        previewRequest(
          http.Request(
            'GET',
            Uri.parse('https://example.com/rest/v1/card_prints'),
          ),
        ),
        throwsStateError,
      );
      for (final path in [
        '/auth/v1/token',
        '/rest/v1/vault_item_instances',
        '/functions/v1/vault-intake-v1',
      ]) {
        final response = await previewRequest(
          http.Request('POST', Uri.parse('http://127.0.0.1:54321$path')),
        );
        expect(response.statusCode, 403);
        expect(jsonDecode(response.body)['code'], 'preview_read_only');
      }
    },
  );
  test(
    'preview only exposes the recorded Eevee product for its exact printing',
    () async {
      for (final valid in [true, false]) {
        final request =
            http.Request(
                'POST',
                Uri.parse(
                  'http://127.0.0.1:54321/functions/v1/card-marketplace-links-v1',
                ),
              )
              ..body = jsonEncode({
                'card_print_id': previewCatalog.first['id'],
                'card_printing_id': valid
                    ? previewPrintingId
                    : 'wrong-printing',
              });
        final link = jsonDecode((await previewRequest(request)).body)['link'];
        if (!valid) {
          expect(link, isNull);
          continue;
        }
        expect(link['conditions'], hasLength(5));
        for (final condition in link['conditions']) {
          final uri = Uri.parse(condition['url']);
          expect(uri.host, 'www.tcgplayer.com');
          expect(uri.path, '/product/610758');
          expect(uri.queryParameters['Printing'], 'Holofoil');
          expect(uri.queryParameters['Condition'], condition['label']);
        }
      }
    },
  );
}
