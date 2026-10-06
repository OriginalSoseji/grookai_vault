import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'sales reads omit market prices; targeted copy read keeps owner and active constraints',
    () async {
      SharedPreferences.setMockInitialValues({});
      final requests = <http.Request>[];
      var owner = '11111111-1111-4111-8111-111111111111';
      final client = SupabaseClient(
        'http://127.0.0.1:1',
        'fixture',
        authOptions: const AuthClientOptions(autoRefreshToken: false),
        httpClient: MockClient((request) async {
          dynamic body;
          if (request.url.path.contains('/auth/')) {
            final payload = base64Url
                .encode(
                  utf8.encode(jsonEncode({'exp': 4000000000, 'sub': owner})),
                )
                .replaceAll('=', '');
            body = {
              'access_token': 'e30.$payload.fixture',
              'refresh_token': 'fixture',
              'expires_in': 3600,
              'token_type': 'bearer',
              'user': {
                'id': owner,
                'email': 'fixture@example.test',
                'aud': 'authenticated',
                'created_at': '2026-10-05T00:00:00Z',
              },
            };
          } else {
            requests.add(request);
            body = switch (request.url.path) {
              '/rest/v1/rpc/vendor_sales_cart_available_v1' => true,
              '/rest/v1/rpc/vendor_sales_trade_available_v1' => true,
              '/rest/v1/rpc/vendor_receipt_book_read_v1' => {
                'book': {
                  'storeName': 'Fixture',
                  'customers': [],
                  'receipts': [],
                },
              },
              '/rest/v1/vault_item_instances' => [
                {
                  'id': 'copy',
                  'gv_vi_id': 'GVVI-TEST-000001',
                  'card_print_id': 'card',
                  'card_printing_id': 'printing',
                  'condition_label': 'NM',
                  'intent': 'sell',
                  'pricing_mode': 'asking',
                  'asking_price_amount': 12.34,
                  'asking_price_currency': 'USD',
                },
              ],
              '/rest/v1/card_prints' => [
                {
                  'id': 'card',
                  'gv_id': 'GV-PK-TEST-001',
                  'name': 'Pikachu',
                  'number': '1',
                  'set_code': 'TEST',
                },
              ],
              '/rest/v1/card_printings' => [
                {
                  'id': 'printing',
                  'card_print_id': 'card',
                  'printing_gv_id': 'GV-PK-TEST-001-HOLO',
                },
              ],
              '/rest/v1/rpc/get_market_pricing_read_model_v1' => [],
              _ => throw StateError('Unexpected request ${request.url.path}'),
            };
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
      await client.auth.signInWithPassword(
        email: 'fixture@example.test',
        password: 'fixture',
      );
      final service = SalesCartService(client: client);
      final data = await service.load();
      expect(data.needsHydration, true);
      expect(data.rows, isEmpty);
      expect(
        requests.any(
          (r) =>
              r.url.path.contains('vault_item') ||
              r.url.path.contains('receipt_book'),
        ),
        false,
      );
      expect((await service.loadInventory()).single.askingPrice, 12.34);
      expect((await service.loadBook())['storeName'], 'Fixture');
      expect(requests.any((r) => r.url.path.contains('market_pricing')), false);
      final otherScreen = SalesCartService(client: client);
      await otherScreen.load();
      final draft = blankSalesDraft(newSaleId(), 'Fixture');
      final draftBook = {
        'version': 1,
        'revision': 0,
        'active': draft['id'],
        'drafts': [draft],
      };
      await service.saveDrafts(draftBook);
      await expectLater(otherScreen.saveDrafts(draftBook), throwsStateError);
      final preferences = await SharedPreferences.getInstance();
      expect(
        readSalesDrafts(
          preferences.getString('grookai.sales-drafts.v1.$owner'),
        )['revision'],
        1,
      );
      requests.clear();
      expect((await service.loadAddedCopy('copy')).single.instanceId, 'copy');
      final request = requests.singleWhere(
        (r) => r.url.path.endsWith('/vault_item_instances'),
      );
      expect(request.url.queryParameters['user_id'], 'eq.$owner');
      expect(request.url.queryParameters['archived_at'], 'is.null');
      expect(request.url.queryParameters['id'], 'in.("copy")');
      expect(
        requests.any(
          (r) =>
              r.url.path.contains('receipt') ||
              r.url.path.contains('market_pricing'),
        ),
        false,
      );
      requests.clear();
      await VendorPricingWorkspaceService(
        client: client,
        includeSections: false,
      ).load();
      expect(requests.any((r) => r.url.path.contains('market_pricing')), true);

      var resolverReads = 0;
      await http.runWithClient(
        () async {
          await service.searchCatalogPage('Pikachu', 'pokemon');
          await service.searchCatalogPage('Pikachu', 'pokemon');
          expect(resolverReads, 1);
          owner = '22222222-2222-4222-8222-222222222222';
          await client.auth.signInWithPassword(
            email: 'other@example.test',
            password: 'fixture',
          );
          await expectLater(
            service.searchCatalogPage('Pikachu', 'pokemon'),
            throwsStateError,
          );
          await expectLater(service.loadAddedCopy('copy'), throwsStateError);
          expect(() => service.saveDrafts(draftBook), throwsStateError);
          expect(
            readSalesDrafts(
              preferences.getString(
                'grookai.sales-drafts.v1.11111111-1111-4111-8111-111111111111',
              ),
            )['drafts'],
            hasLength(1),
          );
          expect(resolverReads, 1);
        },
        () => MockClient((request) async {
          resolverReads++;
          expect(request.headers['Authorization'], startsWith('Bearer '));
          expect(request.url.queryParameters['limit'], '64');
          return http.Response(
            jsonEncode({
              'rows': [],
              'source': 'fixture',
              'pagination': {
                'total_count': 0,
                'offset': 0,
                'next_offset': null,
                'has_more': false,
              },
            }),
            200,
          );
        }),
      );
    },
  );
}
