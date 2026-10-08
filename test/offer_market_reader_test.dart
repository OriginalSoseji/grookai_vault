import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const card = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const printing = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

class ReferenceHarness {
  String activeOwner = owner;
  String? errorAt;
  String? gateAt;
  final entered = Completer<void>(), release = Completer<void>();
  final calls = <http.Request>[];
  List<Map<String, dynamic>> options = [
    {
      'id': printing,
      'card_print_id': card,
      'printing_gv_id': 'GV-P-TEST',
      'finish_is_active': true,
    },
  ];
  List<Map<String, dynamic>> rows = [
    {
      'pricing_scope': 'card_printing',
      'card_print_id': card,
      'card_printing_id': printing,
      'status': 'available',
      'currency': 'USD',
      'market_close': 0.29,
      'source_name': 'tcgplayer',
      'source_label': 'TCGPlayer Market',
      'freshness': 'fresh',
      'is_from_price': false,
      'unavailable_reason': null,
      'observed_at': DateTime.now()
          .toUtc()
          .subtract(const Duration(minutes: 2))
          .toIso8601String(),
      'published_at': DateTime.now()
          .toUtc()
          .subtract(const Duration(minutes: 1))
          .toIso8601String(),
      'provenance_id': owner,
    },
  ];
  late final client = SupabaseClient(
    'http://127.0.0.1:1',
    'fixture',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient((request) async {
      dynamic body;
      if (request.url.path.contains('/auth/')) {
        final payload = base64Url
            .encode(
              utf8.encode(jsonEncode({'exp': 4000000000, 'sub': activeOwner})),
            )
            .replaceAll('=', '');
        body = {
          'access_token': 'e30.$payload.fixture',
          'refresh_token': 'fixture',
          'expires_in': 3600,
          'token_type': 'bearer',
          'user': {
            'id': activeOwner,
            'email': 'fixture@example.test',
            'aud': 'authenticated',
            'created_at': '2026-10-07T00:00:00Z',
          },
        };
      } else {
        calls.add(request);
        final name = request.url.pathSegments.last;
        if (name == gateAt) {
          entered.complete();
          await release.future;
        }
        if (name == errorAt) {
          return http.Response(
            jsonEncode({'code': 'PGRST202', 'message': 'unavailable'}),
            404,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }
        body = switch (name) {
          'get_public_card_printing_options_v1' => options,
          'get_market_pricing_read_model_v1' => rows,
          'vendor_sales_cart_available_v1' ||
          'vendor_sales_trade_available_v1' ||
          'vendor_sales_payments_available_v1' ||
          'vendor_sales_purchase_available_v1' => false,
          _ => throw StateError('Unexpected route $name'),
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
    calls.clear();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late ReferenceHarness h;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    h = ReferenceHarness();
    await h.open();
  });
  tearDown(() async {
    await h.client.dispose();
  });
  test(
    'exact reference uses only governed reads with entry controls off',
    () async {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        'grookai.pending-sale.v1.$owner',
        'retained request',
      );
      final result = await h.service.offerMarketReference(card, printing);
      expect(result['status'], 'available');
      expect(result['reference']['amountMinor'], 29);
      expect(result['reference']['condition'], isNull);
      expect(h.calls.map((r) => r.url.pathSegments.last), [
        'get_public_card_printing_options_v1',
        'get_market_pricing_read_model_v1',
      ]);
      expect(jsonDecode(h.calls.last.body), {
        'p_card_print_ids': null,
        'p_card_printing_ids': [printing],
      });
      expect(
        prefs.getString('grookai.pending-sale.v1.$owner'),
        'retained request',
      );
    },
  );
  test('invalid input stops before reads', () async {
    await expectLater(
      h.service.offerMarketReference('bad', printing),
      throwsFormatException,
    );
    expect(h.calls, isEmpty);
  });
  test('uppercase identity is normalized', () async {
    expect(
      (await h.service.offerMarketReference(
        card.toUpperCase(),
        printing.toUpperCase(),
      ))['status'],
      'available',
    );
  });
  for (final problem in [
    'missing',
    'duplicate',
    'wrong-parent',
    'inactive',
    'unidentified',
  ]) {
    test('ineligible $problem printing stops before market', () async {
      if (problem == 'missing') h.options = [];
      if (problem == 'duplicate') h.options.add({...h.options.first});
      if (problem == 'wrong-parent') h.options.first['card_print_id'] = owner;
      if (problem == 'inactive') h.options.first['finish_is_active'] = false;
      if (problem == 'unidentified') h.options.first['printing_gv_id'] = null;
      expect(
        (await h.service.offerMarketReference(card, printing))['reason'],
        'printing_unavailable',
      );
      expect(h.calls.length, 1);
    });
  }
  for (final rpc in [
    'get_public_card_printing_options_v1',
    'get_market_pricing_read_model_v1',
  ]) {
    test('account change during $rpc rejects late result', () async {
      h.gateAt = rpc;
      final operation = h.service.offerMarketReference(card, printing);
      final assertion = expectLater(operation, throwsStateError);
      await h.entered.future;
      h.activeOwner = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
      await h.signIn();
      h.release.complete();
      await assertion;
      expect(
        h.calls.length,
        rpc == 'get_public_card_printing_options_v1' ? 1 : 2,
      );
    });
    test('failure in $rpc never becomes manual fallback', () async {
      h.errorAt = rpc;
      await expectLater(
        h.service.offerMarketReference(card, printing),
        throwsA(isA<PostgrestException>()),
      );
    });
  }
  test('ambiguous market rows are unavailable', () async {
    h.rows.add({...h.rows.first, 'market_close': 99});
    expect(
      (await h.service.offerMarketReference(card, printing))['reason'],
      'reference_missing_or_ambiguous',
    );
  });
  test('expired observation overrides fresh marker', () async {
    h.rows.first['observed_at'] = DateTime.now()
        .toUtc()
        .subtract(const Duration(hours: 37))
        .toIso8601String();
    expect(
      (await h.service.offerMarketReference(card, printing))['reason'],
      'reference_stale',
    );
  });
}
