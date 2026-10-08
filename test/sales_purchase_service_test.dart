import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_platform_interface.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_drafts.dart';
import 'sales_purchase_drafts_test.dart' show samplePurchaseDraft;

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const pendingKey = 'grookai.pending-sale.v1.$ownerId';
const draftsKey = 'grookai.sales-drafts.v1.$ownerId';
const catalogKey = 'grookai.pending-sales-catalog.v1.$ownerId';
Map<String, dynamic> clone(Map source) =>
    Map<String, dynamic>.from(jsonDecode(jsonEncode(source)) as Map);
Map<String, dynamic> purchaseExample(String name) {
  final fixture =
      jsonDecode(
            File('test/fixtures/sales_purchase_web_v1.json').readAsStringSync(),
          )
          as Map;
  final row = (fixture['cases'] as List).firstWhere(
    (dynamic row) => row['name'] == name,
  );
  return clone(
    name == 'canonical request'
        ? row['expected']['value'] as Map
        : row['args'][0] as Map,
  );
}

class PurchaseHarness {
  bool cartAvailable = true;
  bool? capability = true;
  String owner = ownerId;
  final calls = <http.Request>[];
  Completer<void>? responseGate;
  Map<String, dynamic>? response = purchaseExample('exact receipt');
  late final client = SupabaseClient(
    'http://127.0.0.1:1',
    'fixture',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient((request) async {
      dynamic body;
      if (request.url.path.contains('/auth/')) {
        final payload = base64Url
            .encode(utf8.encode(jsonEncode({'exp': 4000000000, 'sub': owner})))
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
            'created_at': '2026-10-07T00:00:00Z',
          },
        };
      } else {
        calls.add(request);
        final path = request.url.path;
        if (path.endsWith('vendor_sales_purchase_available_v1') &&
            capability == null) {
          return http.Response(
            jsonEncode({'code': 'PGRST202', 'message': 'Missing'}),
            404,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.endsWith('vendor_sales_cart_complete_v4') ||
            path.endsWith('vendor_sales_cart_read_v1')) {
          await responseGate?.future;
          body = response;
        } else {
          body = switch (path) {
            '/rest/v1/rpc/vendor_sales_cart_available_v1' => cartAvailable,
            '/rest/v1/rpc/vendor_sales_trade_available_v1' => false,
            '/rest/v1/rpc/vendor_sales_payments_available_v1' => false,
            '/rest/v1/rpc/vendor_sales_purchase_available_v1' => capability,
            _ => throw StateError('Unexpected fixture route $path'),
          };
        }
      }
      return http.Response(
        jsonEncode(body),
        200,
        request: request,
        headers: {'content-type': 'application/json'},
      );
    }),
  );
  late final service = SalesCartService(client: client);
  Future<void> signIn() => client.auth
      .signInWithPassword(email: 'fixture@example.test', password: 'fixture')
      .then((_) {});
  Future<void> open() async {
    await signIn();
    await service.load();
  }

  List<http.Request> get writes => calls
      .where((r) => r.url.path.endsWith('vendor_sales_cart_complete_v4'))
      .toList();
}

class UnreliablePreferences extends InMemorySharedPreferencesStore {
  UnreliablePreferences({required this.acknowledge}) : super.empty();
  final bool acknowledge;
  @override
  Future<bool> setValue(String valueType, String key, Object value) async =>
      acknowledge;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late PurchaseHarness h;
  late SharedPreferences prefs;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    h = PurchaseHarness();
  });
  tearDown(() async => h.client.dispose());
  for (final acknowledge in [false, true]) {
    test(
      'storage ${acknowledge ? 'false success' : 'failure'} cannot stage or save a purchase',
      () async {
        await h.open();
        final previous = SharedPreferencesStorePlatform.instance;
        SharedPreferencesStorePlatform.instance = UnreliablePreferences(
          acknowledge: acknowledge,
        );
        addTearDown(() => SharedPreferencesStorePlatform.instance = previous);
        final request = purchaseExample('canonical request');
        await expectLater(h.service.stage(request), throwsStateError);
        await expectLater(h.service.complete(request), throwsStateError);
        final draft = samplePurchaseDraft();
        await expectLater(
          h.service.saveDrafts({
            'version': 2,
            'revision': 0,
            'active': draft['id'],
            'drafts': [draft],
          }),
          throwsStateError,
        );
        expect(h.writes, isEmpty);
        await prefs.reload();
        expect(prefs.getString(pendingKey), isNull);
        expect(prefs.getString(draftsKey), isNull);
      },
    );
  }
  test('another desk cannot overwrite a later draft revision', () async {
    await h.open();
    final other = SalesCartService(client: h.client);
    await other.load();
    final draft = samplePurchaseDraft();
    final book = {
      'version': 2,
      'revision': 0,
      'active': draft['id'],
      'drafts': [draft],
    };
    await h.service.saveDrafts(book);
    final retained = prefs.getString(draftsKey);
    await expectLater(other.saveDrafts(book), throwsStateError);
    expect(prefs.getString(draftsKey), retained);
  });
  for (final available in [true, false, null]) {
    test(
      'purchase capability is explicit and missing defaults off: $available',
      () async {
        h.capability = available;
        await h.signIn();
        final data = await h.service.load();
        expect(data.purchasesAvailable, available == true);
        expect(data.withRows([]).purchasesAvailable, available == true);
        expect(
          data.withBook({
            'storeName': '',
            'customers': [],
            'receipts': [],
          }).purchasesAvailable,
          available == true,
        );
      },
    );
  }
  test(
    'completion requires durable exact stage and only dispatches v4',
    () async {
      await h.open();
      final request = {
        ...purchaseExample('canonical request'),
        'draftId': samplePurchaseDraft()['id'],
      };
      await expectLater(h.service.complete(request), throwsStateError);
      expect(h.writes, isEmpty);
      await h.service.stage(request);
      expect(prefs.getString(pendingKey), jsonEncode(request));
      expect(
        await h.service.complete(request),
        purchaseExample('exact receipt'),
      );
      expect(jsonDecode(h.writes.single.body), {
        'p_request_id': request['id'],
        'p_cart': request['cart'],
      });
      expect(prefs.getString(pendingKey), jsonEncode(request));
    },
  );
  test(
    'concurrent differing stages retain one exact request and identical retry succeeds',
    () async {
      await h.open();
      final first = purchaseExample('canonical request');
      final second = {
        ...clone(first),
        'id': 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      };
      final a = h.service.stage(first);
      final b = expectLater(h.service.stage(second), throwsStateError);
      await a;
      await b;
      await h.service.stage(first);
      expect(prefs.getString(pendingKey), jsonEncode(first));
    },
  );
  for (final catalogFirst in [true, false]) {
    test(
      'catalog and purchase staging are mutually exclusive: catalog first $catalogFirst',
      () async {
        await h.open();
        final buy = purchaseExample('canonical request');
        final catalog = {'id': 'catalog', 'card': {}};
        if (catalogFirst) {
          final first = h.service.stageCatalogAdd(catalog);
          final rejected = expectLater(h.service.stage(buy), throwsStateError);
          await first;
          await rejected;
          expect(prefs.getString(pendingKey), isNull);
        } else {
          final first = h.service.stage(buy);
          final rejected = expectLater(
            h.service.stageCatalogAdd(catalog),
            throwsStateError,
          );
          await first;
          await rejected;
          expect(prefs.getString(catalogKey), isNull);
        }
        expect(h.writes, isEmpty);
      },
    );
  }
  test(
    'draft upgrade preserves legacy sale; pending blocks edits until bound recovery',
    () async {
      await h.open();
      final draft = samplePurchaseDraft(),
          sale = blankSalesDraft('old-sale', 'Shop');
      final book = {
        'version': 1,
        'revision': 0,
        'active': draft['id'],
        'drafts': [sale, draft],
      };
      await h.service.saveDrafts(book);
      var stored = readSalesDrafts(prefs.getString(draftsKey));
      expect(stored['version'], 2);
      expect(stored['drafts'][0], sale);
      final preserved = prefs.getString(draftsKey);
      await h.service.stage(purchaseExample('canonical request'));
      await expectLater(h.service.saveDrafts(book), throwsStateError);
      expect(prefs.getString(draftsKey), preserved);
      await h.service.recover(
        purchaseExample('canonical request')['id'] as String,
      );
      await h.service.saveDrafts({
        'version': 1,
        'revision': 0,
        'active': sale['id'],
        'drafts': [sale],
      });
      stored = readSalesDrafts(prefs.getString(draftsKey));
      expect(stored['version'], 2);
      expect(stored['drafts'], [sale]);
    },
  );
  test(
    'restart and disabled features recover without another completion',
    () async {
      await h.open();
      final request = purchaseExample('canonical request');
      await h.service.stage(request);
      h.cartAvailable = false;
      final reopened = SalesCartService(client: h.client);
      final data = await reopened.load();
      expect(data.available, false);
      expect(data.pending, request);
      expect(
        await reopened.recover(request['id'] as String),
        purchaseExample('exact receipt'),
      );
      expect(h.writes, isEmpty);
    },
  );
  for (final mismatch in ['amount', 'sale-kind']) {
    test(
      'unbound $mismatch receipt never unlocks drafts or clears pending',
      () async {
        await h.open();
        final request = purchaseExample('canonical request');
        await h.service.stage(request);
        if (mismatch == 'amount') {
          h.response!['purchaseMinor'] = 651;
        } else {
          h.response!['kind'] = 'sale';
        }
        await expectLater(h.service.complete(request), throwsFormatException);
        await expectLater(
          h.service.recover(request['id'] as String),
          throwsFormatException,
        );
        await expectLater(
          h.service.saveDrafts(readSalesDrafts(null)),
          throwsStateError,
        );
        expect(prefs.getString(pendingKey), jsonEncode(request));
      },
    );
  }
  test(
    'late response after owner change is rejected and original journal retained',
    () async {
      await h.open();
      final request = purchaseExample('canonical request');
      await h.service.stage(request);
      h.responseGate = Completer<void>();
      final result = expectLater(h.service.complete(request), throwsStateError);
      while (h.writes.isEmpty) {
        await Future<void>.delayed(Duration.zero);
      }
      h.owner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      await h.signIn();
      h.responseGate!.complete();
      await result;
      expect(prefs.getString(pendingKey), jsonEncode(request));
      await expectLater(
        h.service.clearPending(request['id'] as String),
        throwsStateError,
      );
    },
  );
}
