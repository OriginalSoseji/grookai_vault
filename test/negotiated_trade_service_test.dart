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
import 'package:grookai_vault/services/sales/negotiated_draft.dart';
import 'sales_purchase_drafts_test.dart' show samplePurchaseDraft;

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const pendingKey = 'grookai.pending-sale.v1.$ownerId';
const draftsKey = 'grookai.sales-drafts.v1.$ownerId';
const catalogKey = 'grookai.pending-sales-catalog.v1.$ownerId';
Map<String, dynamic> clone(Map source) =>
    Map<String, dynamic>.from(jsonDecode(jsonEncode(source)) as Map);
Map<String, dynamic> tradeExample(String name) {
  final rows =
      (jsonDecode(
                File(
                  'test/fixtures/negotiated_trade_web_v1.json',
                ).readAsStringSync(),
              )
              as Map)['cases']
          as List;
  return clone(
    rows.firstWhere((dynamic row) => row['name'] == name)['args'][0] as Map,
  );
}

Map<String, dynamic> acknowledgement() => {
  'version': 1,
  'request': tradeExample('request'),
  'receipt': tradeExample('receipt'),
};

class TradeHarness {
  bool cartAvailable = true;
  bool? capability = true;
  String owner = ownerId;
  final calls = <http.Request>[];
  Completer<void>? responseGate;
  Map<String, dynamic>? response = acknowledgement();
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
        if (path.endsWith('vendor_sales_negotiated_trade_available_v1') &&
            capability == null) {
          return http.Response(
            jsonEncode({'code': 'PGRST202', 'message': 'Missing'}),
            404,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        if (path.endsWith('vendor_sales_cart_complete_v5') ||
            path.endsWith('vendor_sales_cart_read_v2')) {
          await responseGate?.future;
          body = response;
        } else {
          body = switch (path) {
            '/rest/v1/rpc/vendor_sales_cart_available_v1' => cartAvailable,
            '/rest/v1/rpc/vendor_sales_trade_available_v1' => false,
            '/rest/v1/rpc/vendor_sales_payments_available_v1' => false,
            '/rest/v1/rpc/vendor_sales_negotiated_trade_available_v1' =>
              capability,
            '/rest/v1/rpc/vendor_sales_purchase_available_v1' => false,
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
      .where((r) => r.url.path.endsWith('vendor_sales_cart_complete_v5'))
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
  late TradeHarness h;
  late SharedPreferences prefs;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    prefs = await SharedPreferences.getInstance();
    h = TradeHarness();
  });
  tearDown(() async => h.client.dispose());
  for (final available in [true, false, null]) {
    test(
      'negotiated capability is explicit, missing defaults off: $available',
      () async {
        h.capability = available;
        await h.signIn();
        final data = await h.service.load();
        expect(data.negotiatedTradesAvailable, available == true);
        expect(data.withRows([]).negotiatedTradesAvailable, available == true);
        expect(
          data.withBook({
            'storeName': 'Shop',
            'customers': [],
            'receipts': [],
          }).negotiatedTradesAvailable,
          available == true,
        );
      },
    );
  }
  for (final acknowledge in [false, true]) {
    test(
      'storage failure or false success cannot authorize v5: $acknowledge',
      () async {
        await h.open();
        final previous = SharedPreferencesStorePlatform.instance;
        SharedPreferencesStorePlatform.instance = UnreliablePreferences(
          acknowledge: acknowledge,
        );
        addTearDown(() => SharedPreferencesStorePlatform.instance = previous);
        final request = tradeExample('request');
        await expectLater(h.service.stage(request), throwsStateError);
        await expectLater(h.service.complete(request), throwsStateError);
        expect(h.writes, isEmpty);
      },
    );
  }
  test('v3 draft upgrade retains old Sale and Buy, never downgrades', () async {
    await h.open();
    final trade = newNegotiatedDraft(
      '11111111-1111-4111-8111-111111111111',
      'Shop',
    );
    final sale = blankSalesDraft('old-sale', 'Shop'),
        buy = samplePurchaseDraft();
    await h.service.saveDrafts({
      'version': 1,
      'revision': 0,
      'active': trade['id'],
      'drafts': [sale, buy, trade],
    });
    final stored = readSalesDrafts(prefs.getString(draftsKey));
    expect(stored['version'], 3);
    expect(stored['drafts'], [sale, buy, trade]);
    await h.service.saveDrafts({
      'version': 1,
      'revision': 0,
      'active': sale['id'],
      'drafts': [sale],
    });
    expect(readSalesDrafts(prefs.getString(draftsKey))['version'], 3);
  });
  test(
    'v5 needs exact staged bytes, cannot replace pending or clear before confirmation',
    () async {
      await h.open();
      final request = tradeExample('request');
      await expectLater(h.service.complete(request), throwsStateError);
      await h.service.stage(request);
      final changed = clone(request);
      changed['cart']['note'] = 'changed';
      await expectLater(h.service.stage(changed), throwsStateError);
      await expectLater(h.service.complete(changed), throwsStateError);
      await expectLater(
        h.service.clearPending(request['id'] as String),
        throwsStateError,
      );
      await expectLater(
        h.service.saveDrafts(readSalesDrafts(null)),
        throwsStateError,
      );
      expect(h.writes, isEmpty);
      expect(prefs.getString(pendingKey), jsonEncode(request));
    },
  );
  test('bound completion unlocks held drafts and verified clear', () async {
    await h.open();
    final request = tradeExample('request');
    await h.service.stage(request);
    expect(await h.service.complete(request), tradeExample('receipt'));
    expect(h.writes.length, 1);
    expect(jsonDecode(h.writes.single.body), {
      'p_request_id': request['id'],
      'p_cart': request['cart'],
    });
    await h.service.saveDrafts(readSalesDrafts(null));
    await h.service.clearPending(request['id'] as String);
    expect(prefs.getString(pendingKey), isNull);
  });
  test(
    'restart and feature-off recovery uses bound read v2 with exact cart',
    () async {
      await h.open();
      final request = tradeExample('request');
      await h.service.stage(request);
      h.cartAvailable = false;
      final reopened = SalesCartService(client: h.client);
      final data = await reopened.load();
      expect(data.pending, request);
      expect(data.available, false);
      expect(
        await reopened.recover(request['id'] as String),
        tradeExample('receipt'),
      );
      expect(h.writes, isEmpty);
      final read = h.calls.last;
      expect(read.url.path, endsWith('vendor_sales_cart_read_v2'));
      expect(jsonDecode(read.body), {
        'p_request_id': request['id'],
        'p_cart': request['cart'],
      });
      await reopened.clearPending(request['id'] as String);
      expect(prefs.getString(pendingKey), isNull);
    },
  );
  for (final mismatch in ['copy', 'note', 'credit', 'receipt', 'envelope']) {
    test(
      'mismatched $mismatch cannot authorize clearing or draft edits',
      () async {
        await h.open();
        final request = tradeExample('request');
        await h.service.stage(request);
        switch (mismatch) {
          case 'copy':
            h.response!['request']['cart']['items'][0]['instanceId'] =
                '33333333-3333-4333-8333-333333333333';
            break;
          case 'note':
            h.response!['request']['cart']['note'] = 'different';
            break;
          case 'credit':
            h.response!['request']['cart']['trades'][0]['creditMinor'] = 651;
            break;
          case 'receipt':
            h.response!['receipt']['totalMinor'] = 999;
            break;
          case 'envelope':
            h.response = tradeExample('receipt');
            break;
        }
        await expectLater(
          h.service.complete(request),
          throwsA(anyOf(isA<FormatException>(), isA<StateError>())),
        );
        await expectLater(
          h.service.recover(request['id'] as String),
          throwsA(anyOf(isA<FormatException>(), isA<StateError>())),
        );
        await expectLater(
          h.service.clearPending(request['id'] as String),
          throwsStateError,
        );
        await expectLater(
          h.service.saveDrafts(readSalesDrafts(null)),
          throwsStateError,
        );
        expect(prefs.getString(pendingKey), jsonEncode(request));
      },
    );
  }
  test('unknown recovery stays pending and cannot be cleared', () async {
    await h.open();
    final request = tradeExample('request');
    await h.service.stage(request);
    h.response = null;
    expect(await h.service.recover(request['id'] as String), isNull);
    await expectLater(
      h.service.clearPending(request['id'] as String),
      throwsStateError,
    );
    expect(prefs.getString(pendingKey), jsonEncode(request));
    expect(h.writes, isEmpty);
  });
  for (final operation in ['complete', 'recover']) {
    for (final mutation in ['account', 'pending']) {
      test('$operation rejects late response after $mutation change', () async {
        await h.open();
        final request = tradeExample('request');
        await h.service.stage(request);
        h.responseGate = Completer<void>();
        final result = expectLater(
          operation == 'complete'
              ? h.service.complete(request)
              : h.service.recover(request['id'] as String),
          throwsStateError,
        );
        while (!h.calls.any(
          (r) => r.url.path.endsWith(
            operation == 'complete'
                ? 'vendor_sales_cart_complete_v5'
                : 'vendor_sales_cart_read_v2',
          ),
        )) {
          await Future<void>.delayed(Duration.zero);
        }
        if (mutation == 'account') {
          h.owner = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
          await h.signIn();
        } else {
          final changed = clone(request);
          changed['cart']['note'] = 'changed';
          await prefs.setString(pendingKey, jsonEncode(changed));
        }
        h.responseGate!.complete();
        await result;
        await expectLater(
          h.service.clearPending(request['id'] as String),
          throwsStateError,
        );
        expect(prefs.getString(pendingKey), isNotNull);
      });
    }
  }
  test(
    'confirmation cannot clear later changed bytes with the same request ID',
    () async {
      await h.open();
      final request = tradeExample('request');
      await h.service.stage(request);
      await h.service.complete(request);
      final changed = clone(request);
      changed['cart']['note'] = 'changed';
      await prefs.setString(pendingKey, jsonEncode(changed));
      await expectLater(
        h.service.clearPending(request['id'] as String),
        throwsStateError,
      );
      await expectLater(
        h.service.saveDrafts(readSalesDrafts(null)),
        throwsStateError,
      );
    },
  );
}
