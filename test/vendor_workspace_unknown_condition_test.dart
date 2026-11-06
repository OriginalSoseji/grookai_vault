import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'SDK workspace loading preserves null condition without inventing NM',
    () async {
      const owner = '00000000-0000-4000-8000-000000000001';
      const parent = '00000000-0000-4000-8000-000000000002';
      const child = '00000000-0000-4000-8000-000000000003';
      final client = SupabaseClient(
        'http://127.0.0.1:54321',
        'fixture-key',
        authOptions: const AuthClientOptions(autoRefreshToken: false),
        httpClient: MockClient((request) async {
          Object response;
          switch (request.url.path) {
            case '/auth/v1/token':
              response = {
                'access_token': 'fixture-token',
                'refresh_token': 'fixture-refresh',
                'expires_in': 3600,
                'token_type': 'bearer',
                'user': {
                  'id': owner,
                  'aud': 'authenticated',
                  'created_at': '2026-10-28T00:00:00Z',
                },
              };
            case '/rest/v1/vault_item_instances':
              expect(request.url.queryParameters['user_id'], 'eq.$owner');
              expect(request.url.queryParameters['archived_at'], 'is.null');
              response = [
                for (final condition in [null, 'LP'])
                  {
                    'id': condition == null ? 'unknown-copy' : 'known-copy',
                    'gv_vi_id': condition == null
                        ? 'GVVI-UNKNOWN'
                        : 'GVVI-KNOWN',
                    'card_print_id': parent,
                    'card_printing_id': child,
                    'condition_label': condition,
                    'intent': 'hold',
                  },
              ];
            case '/rest/v1/card_prints':
              response = [
                {
                  'id': parent,
                  'gv_id': 'GV-PK-PR-SV-173',
                  'name': 'Eevee',
                  'number': '173',
                  'set_code': 'svp',
                  'set': {
                    'name': 'Scarlet & Violet Black Star Promos',
                    'code': 'svp',
                  },
                },
              ];
            case '/rest/v1/card_printings':
              response = [
                {
                  'id': child,
                  'card_print_id': parent,
                  'finish_key': 'holo',
                  'finish_keys': {
                    'label': 'Holo',
                    'sort_order': 0,
                    'is_active': true,
                  },
                },
              ];
            default:
              throw StateError(
                'Unexpected fixture request ${request.url.path}',
              );
          }
          return http.Response(
            jsonEncode(response),
            200,
            headers: {'content-type': 'application/json'},
          request: request,
          );
        }),
      );
      addTearDown(client.dispose);
      await client.auth.signInWithPassword(
        email: 'fixture@example.test',
        password: 'fixture',
      );
      final data = await VendorPricingWorkspaceService(
        client: client,
        includeSections: false,
        includeMarketPrices: false,
      ).load();
      expect(data.rows, hasLength(2));
      expect(
        data.rows
            .firstWhere((row) => row.instanceId == 'unknown-copy')
            .conditionLabel,
        'Unknown',
      );
      expect(
        data.rows
            .firstWhere((row) => row.instanceId == 'known-copy')
            .conditionLabel,
        'LP',
      );
      expect(data.rows.every((row) => row.cardPrintingId == child), isTrue);
    },
  );
}
