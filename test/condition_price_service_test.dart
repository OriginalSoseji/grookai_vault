import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grookai_vault/services/pricing/condition_price_service.dart';

const _printing = '00000000-0000-4000-8000-000000000001';
Map<String, dynamic> _body({String condition = 'NM', double? amount = 2.51}) =>
    {
      'ok': true,
      'pricing': {
        'version': 'CONDITION_PRICE_READ_MODEL_V1',
        'card_printing_id': _printing,
        'condition': condition,
        'status': amount == null ? 'unavailable' : 'available',
        'confidence': amount == null ? 'unavailable' : 'medium',
        'amount': amount,
        'currency': null,
        'currency_hint': 'USD',
        'currency_verified': false,
        'source_label': 'TCGplayer condition price via TCGTracking',
        'provider_updated_at': '2026-11-17T13:36:40-05:00',
        'pricing_lane': 'reference',
      },
    };

ConditionPriceService _service(
  http.Client client, {
  Uri? origin,
  ConditionPriceSession? Function()? session,
}) => ConditionPriceService(
  transport: client,
  origin: origin ?? Uri.parse('http://127.0.0.1:65310'),
  session: session ?? () => (owner: 'fixture-owner', token: 'fixture-token'),
);

void main() {
  test(
    'exact GET uses SDK session bearer, disables redirects and preserves amount',
    () async {
      final service = _service(
        MockClient((request) async {
          expect(request.method, 'GET');
          expect(request.url.path, '/api/condition-pricing/v1');
          expect(request.url.queryParameters, {
            'card_printing_id': _printing,
            'condition': 'LP',
          });
          expect(request.headers['Authorization'], 'Bearer fixture-token');
          expect(request.headers['Cache-Control'], 'no-store');
          expect(request.followRedirects, false);
          return http.Response(
            jsonEncode(_body(condition: 'LP', amount: 1.16789123)),
            200,
          );
        }),
      );
      addTearDown(service.dispose);
      final price = await service.read(_printing, 'LP');
      expect(price.amount, 1.16789123);
      expect(price.condition, 'LP');
    },
  );

  test(
    'missing condition stays unavailable and never substitutes NM',
    () async {
      final service = _service(
        MockClient(
          (_) async => http.Response(
            jsonEncode(_body(condition: 'DMG', amount: null)),
            200,
          ),
        ),
      );
      addTearDown(service.dispose);
      expect((await service.read(_printing, 'DMG')).amount, isNull);
    },
  );

  test(
    'mismatched identity, reference authority, currency and malformed values fail closed',
    () {
      for (final change in <Map<String, dynamic>>[
        {'card_printing_id': 'another-printing'},
        {'condition': 'LP'},
        {'version': 'future-version'},
        {'pricing_lane': 'market'},
        {'currency': 'USD'},
        {'currency_verified': true},
        {'currency_hint': 'EUR'},
        {'source_label': 'another provider'},
        {'confidence': 'high'},
        {'amount': '2.51'},
        {'amount': 0},
        {'amount': -1},
        {'amount': double.nan},
        {'provider_updated_at': 'bad-date'},
        {'status': 'unavailable', 'amount': 2.51},
      ]) {
        final body = _body();
        (body['pricing'] as Map<String, dynamic>).addAll(change);
        expect(
          () => ConditionPriceReference.fromResponse(
            body,
            printingId: _printing,
            condition: 'NM',
          ),
          throwsFormatException,
          reason: change.keys.join(','),
        );
      }
    },
  );

  test('unknown selections and missing auth never send requests', () async {
    var requests = 0;
    final service = _service(
      MockClient((_) async {
        requests++;
        return http.Response('{}', 200);
      }),
      session: () => null,
    );
    addTearDown(service.dispose);
    for (final selection in [
      (_printing, 'Unspecified'),
      ('parent-id', 'NM'),
      (_printing, 'NM'),
    ]) {
      await expectLater(
        service.read(selection.$1, selection.$2),
        throwsStateError,
      );
    }
    expect(requests, 0);
  });

  test(
    'untrusted routes and production-backed debug requests never receive bearer',
    () async {
      var requests = 0;
      for (final url in [
        'https://elsewhere.example',
        'https://grookaivault.com',
        'http://127.0.0.1:65310/other',
        'http://user:pass@127.0.0.1:65310',
        'http://127.0.0.1:65310?redirect=elsewhere',
      ]) {
        final service = _service(
          MockClient((_) async {
            requests++;
            return http.Response('{}', 200);
          }),
          origin: Uri.parse(url),
        );
        await expectLater(service.read(_printing, 'NM'), throwsStateError);
        service.dispose();
      }
      expect(requests, 0);
    },
  );

  test('account change during a request discards its result', () async {
    var owner = 'first';
    final ready = Completer<void>();
    final service = _service(
      MockClient((_) async {
        await ready.future;
        return http.Response(jsonEncode(_body()), 200);
      }),
      session: () => (owner: owner, token: 'fixture-token'),
    );
    addTearDown(service.dispose);
    final pending = service.read(_printing, 'NM');
    final rejected = expectLater(pending, throwsStateError);
    owner = 'second';
    ready.complete();
    await rejected;
  });

  test(
    'unauthorized, unavailable, redirect, oversized and invalid JSON responses never produce a price',
    () async {
      for (final response in [
        http.Response('{}', 401),
        http.Response('{}', 503),
        http.Response('{}', 302),
        http.Response('x' * (32 * 1024 + 1), 200),
        http.Response('bad-json', 200),
      ]) {
        final service = _service(MockClient((_) async => response));
        await expectLater(service.read(_printing, 'NM'), throwsA(anything));
        service.dispose();
      }
    },
  );
}
