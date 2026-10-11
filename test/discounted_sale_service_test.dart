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
import 'package:grookai_vault/services/sales/discounted_draft.dart';
import 'package:grookai_vault/services/sales/negotiated_draft.dart';
import 'sales_purchase_drafts_test.dart' show samplePurchaseDraft;

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const pendingKey = 'grookai.pending-sale.v1.$ownerId';
const draftsKey = 'grookai.sales-drafts.v1.$ownerId';
Map<String, dynamic> clone(Map v) =>
    Map<String, dynamic>.from(jsonDecode(jsonEncode(v)) as Map);
final examples =
    jsonDecode(File('test/fixtures/discounted_sale_v1.json').readAsStringSync())
        as List;
Map<String, dynamic> request() => clone(examples.first['value'] as Map);
Map<String, dynamic> acknowledgement() => clone(
  examples.firstWhere((r) => r['kind'] == 'ack' && r['valid'] == true)['value']
      as Map,
);
Map<String, dynamic> cancellation() => {
  'version': 1,
  'request': request(),
  'status': 'cancelled',
};

class Harness {
  bool available = true;
  bool? capability = true;
  String owner = ownerId;
  final calls = <http.Request>[];
  Completer<void>? responseGate;
  Completer<void>? dispatched;
  dynamic response = acknowledgement();
  late final client = SupabaseClient(
    'http://127.0.0.1:1',
    'fixture',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient((r) async {
      dynamic body;
      if (r.url.path.contains('/auth/')) {
        // Isolated HTTP mock only; actual acceptance uses Supabase Auth in local labs.
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
            'created_at': '2026-10-08T00:00:00Z',
          },
        };
      } else {
        calls.add(r);
        final path = r.url.path;
        if (path.endsWith('vendor_sales_discount_entry_available_v1') &&
            capability == null) {
          return http.Response(
            jsonEncode({'code': 'PGRST202', 'message': 'Missing'}),
            404,
            headers: {'content-type': 'application/json'},
            request: r,
          );
        }
        if ([
          'vendor_sales_cart_complete_v6',
          'vendor_sales_cart_read_v3',
          'vendor_sales_cart_cancel_v1',
        ].any(path.endsWith)) {
          if (dispatched?.isCompleted == false) dispatched!.complete();
          await responseGate?.future;
          body = response;
        } else {
          body = switch (path) {
            '/rest/v1/rpc/vendor_sales_cart_available_v1' => available,
            '/rest/v1/rpc/vendor_sales_payments_available_v1' => true,
            '/rest/v1/rpc/vendor_sales_discount_entry_available_v1' =>
              capability,
            '/rest/v1/rpc/vendor_sales_trade_available_v1' => false,
            '/rest/v1/rpc/vendor_sales_purchase_available_v1' => false,
            '/rest/v1/rpc/vendor_sales_negotiated_trade_available_v1' => false,
            _ => throw StateError('Unexpected route $path'),
          };
        }
      }
      return http.Response(
        jsonEncode(body),
        200,
        headers: {'content-type': 'application/json'},
        request: r,
      );
    }),
  );
  late final service = SalesCartService(client: client);
  Future<void> signIn() async {
    await client.auth.signInWithPassword(
      email: 'fixture@example.test',
      password: 'fixture',
    );
  }

  Future<void> open() async {
    await signIn();
    await service.load();
  }
}

class UnreliablePreferences extends InMemorySharedPreferencesStore {
  UnreliablePreferences(this.acknowledge) : super.empty();
  final bool acknowledge;
  @override
  Future<bool> setValue(String valueType, String key, Object value) async =>
      acknowledge;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Harness h;
  late SharedPreferences prefs;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    h = Harness();
  });
  tearDown(() async => h.client.dispose());
  for (final enabled in [true, false, null]) {
    test('entry compatibility capability defaults off: $enabled', () async {
      h.capability = enabled;
      await h.signIn();
      final data = await h.service.load();
      expect(data.discountsAvailable, enabled == true);
      expect(data.withRows([]).discountsAvailable, enabled == true);
      expect(
        data.withBook({
          'storeName': '',
          'customers': [],
          'receipts': [],
        }).discountsAvailable,
        enabled == true,
      );
    });
  }
  for (final success in [false, true]) {
    test(
      'missing durable storage prevents dispatch despite acknowledgement $success',
      () async {
        await h.open();
        final previous = SharedPreferencesStorePlatform.instance;
        SharedPreferencesStorePlatform.instance = UnreliablePreferences(
          success,
        );
        addTearDown(() => SharedPreferencesStorePlatform.instance = previous);
        await expectLater(h.service.stage(request()), throwsStateError);
        await expectLater(h.service.complete(request()), throwsStateError);
        expect(
          h.calls.where(
            (r) => r.url.path.endsWith('vendor_sales_cart_complete_v6'),
          ),
          isEmpty,
        );
      },
    );
  }
  test(
    'new draft book retains legacy sale, buy and negotiated trade',
    () async {
      await h.open();
      final sale = blankSalesDraft('old-sale', 'Shop'),
          buy = samplePurchaseDraft(),
          trade = newNegotiatedDraft(
            '33333333-3333-4333-8333-333333333333',
            'Shop',
          ),
          discount = newDiscountedDraft(
            '44444444-4444-4444-8444-444444444444',
            'Shop',
          );
      await h.service.saveDrafts({
        'version': 1,
        'revision': 0,
        'active': sale['id'],
        'drafts': [sale, buy, trade, discount],
      });
      final saved = readSalesDrafts(prefs.getString(draftsKey));
      expect(saved['version'], 4);
      expect(saved['drafts'], [sale, buy, trade, discount]);
      await h.service.saveDrafts({
        'version': 3,
        'revision': 1,
        'active': sale['id'],
        'drafts': [sale, buy, trade],
      });
      expect(readSalesDrafts(prefs.getString(draftsKey))['version'], 4);
    },
  );
  test('stage exact bytes, block changing pending and held drafts', () async {
    await h.open();
    final p = request();
    await h.service.stage(p);
    expect(prefs.getString(pendingKey), jsonEncode(p));
    final changed = clone(p);
    changed['cart']['note'] = 'changed';
    await expectLater(h.service.stage(changed), throwsStateError);
    await expectLater(
      h.service.clearPending(p['id'] as String),
      throwsStateError,
    );
    await expectLater(
      h.service.saveDrafts({
        'version': 4,
        'revision': 0,
        'active': null,
        'drafts': [],
      }),
      throwsStateError,
    );
    expect(prefs.getString(pendingKey), jsonEncode(p));
  });
  test('completion binds full acknowledgement before clearing', () async {
    await h.open();
    final p = request();
    await h.service.stage(p);
    expect((await h.service.complete(p))['id'], p['id']);
    expect(h.calls.last.url.path, endsWith('vendor_sales_cart_complete_v6'));
    await h.service.clearPending(p['id'] as String);
    expect(prefs.getString(pendingKey), null);
  });
  test(
    'reopened service recovers a cancellation with backend entry off',
    () async {
      await h.open();
      final p = request();
      await h.service.stage(p);
      h.available = false;
      h.response = cancellation();
      final reopened = SalesCartService(client: h.client);
      expect((await reopened.load()).available, false);
      expect(
        (await reopened.recover(p['id'] as String))!['status'],
        'cancelled',
      );
      expect(h.calls.last.url.path, endsWith('vendor_sales_cart_read_v3'));
      expect(jsonDecode(h.calls.last.body), {
        'p_request_id': p['id'],
        'p_cart': p['cart'],
      });
      await reopened.clearPending(p['id'] as String);
      expect(prefs.getString(pendingKey), null);
    },
  );
  for (final completed in [false, true]) {
    test(
      'cancel returns terminal server result when completion won: $completed',
      () async {
        await h.open();
        final p = request();
        await h.service.stage(p);
        h.response = completed ? acknowledgement() : cancellation();
        final result = await h.service.cancelDiscounted(p['id'] as String);
        expect(
          completed ? result['id'] : result['status'],
          completed ? p['id'] : 'cancelled',
        );
        expect(h.calls.last.url.path, endsWith('vendor_sales_cart_cancel_v1'));
        await h.service.clearPending(p['id'] as String);
        expect(prefs.getString(pendingKey), null);
      },
    );
  }
  test('missing recovery result never clears pending', () async {
    await h.open();
    final p = request();
    await h.service.stage(p);
    h.response = null;
    expect(await h.service.recover(p['id'] as String), null);
    await expectLater(
      h.service.clearPending(p['id'] as String),
      throwsStateError,
    );
    await expectLater(
      h.service.cancelDiscounted(p['id'] as String),
      throwsA(anything),
    );
    expect(prefs.getString(pendingKey), jsonEncode(p));
  });
  for (final method in ['complete', 'recover', 'cancel']) {
    test('same amounts with another physical copy reject $method', () async {
      await h.open();
      final p = request();
      await h.service.stage(p);
      h.response = method == 'cancel' ? cancellation() : acknowledgement();
      h.response['request']['cart']['items'][0]['instanceId'] =
          'b2000000-0000-4000-8000-000000000002';
      final result = method == 'complete'
          ? h.service.complete(p)
          : method == 'recover'
          ? h.service.recover(p['id'] as String)
          : h.service.cancelDiscounted(p['id'] as String);
      await expectLater(result, throwsA(anything));
      await expectLater(
        h.service.clearPending(p['id'] as String),
        throwsStateError,
      );
      expect(prefs.getString(pendingKey), jsonEncode(p));
    });
    test('changed saved bytes invalidate delayed $method response', () async {
      await h.open();
      final p = request();
      await h.service.stage(p);
      h.response = method == 'cancel' ? cancellation() : acknowledgement();
      h.responseGate = Completer<void>();
      h.dispatched = Completer<void>();
      final result = method == 'complete'
          ? h.service.complete(p)
          : method == 'recover'
          ? h.service.recover(p['id'] as String)
          : h.service.cancelDiscounted(p['id'] as String);
      final assertion = expectLater(result, throwsStateError);
      await h.dispatched!.future;
      final changed = clone(p);
      changed['cart']['note'] = 'changed elsewhere';
      await prefs.setString(pendingKey, jsonEncode(changed));
      h.responseGate!.complete();
      await assertion;
      await expectLater(
        h.service.clearPending(p['id'] as String),
        throwsStateError,
      );
    });
    test('changed account invalidates delayed $method response', () async {
      await h.open();
      final p = request();
      await h.service.stage(p);
      h.response = method == 'cancel' ? cancellation() : acknowledgement();
      h.responseGate = Completer<void>();
      h.dispatched = Completer<void>();
      final result = method == 'complete'
          ? h.service.complete(p)
          : method == 'recover'
          ? h.service.recover(p['id'] as String)
          : h.service.cancelDiscounted(p['id'] as String);
      final assertion = expectLater(result, throwsStateError);
      await h.dispatched!.future;
      h.owner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      await h.signIn();
      h.responseGate!.complete();
      await assertion;
      expect(prefs.getString(pendingKey), jsonEncode(p));
    });
  }
}
