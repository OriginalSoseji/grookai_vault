import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grookai_vault/services/notifications/price_targets.dart';
import 'package:grookai_vault/services/notifications/price_target_service.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';

const owner = '00000000-0000-4000-8000-000000000001',
    other = '00000000-0000-4000-8000-000000000002',
    id = '00000000-0000-4000-8000-000000000003',
    printing = '00000000-0000-4000-8000-000000000004';
Map<String, dynamic> target() => {
  'id': id,
  'revision': '1',
  'printingId': printing,
  'cardPrintId': id,
  'name': 'Private target',
  'printingGvId': 'GV-PK-TARGET',
  'finish': 'normal',
  'amount': '12.34000000000000000001',
  'currency': 'USD',
  'direction': 'at_or_below',
  'enabled': true,
  'lastCheckedAt': null,
  'triggeredAt': null,
  'reference': null,
};
Map<String, dynamic> document() => {
  'version': 1,
  'ownerId': owner,
  'editEnabled': true,
  'targets': [target()],
};
Map<String, dynamic> request() => {
  'requestId': id,
  'id': id,
  'expectedRevision': '0',
  'printingId': printing,
  'direction': 'at_or_below',
  'amount': '12.34000000000000000001',
  'currency': 'USD',
  'enabled': true,
};
void main() {
  test('Exact decimals survive parsing and normalization', () {
    expect(
      priceTargetAmount('0.0000000000000000000100'),
      '0.00000000000000000001',
    );
    expect(priceTargetAmount('100'), '100');
    expect(
      PriceTargets.fromJson(owner, document()).targets.single.amount,
      '12.34000000000000000001',
    );
  });
  for (final value in <Object?>[
    '0',
    '-1',
    'NaN',
    'Infinity',
    '1e2',
    '01',
    '1.',
    ' 1',
    '1,23',
    12.34,
    null,
  ]) {
    test(
      'Reject invalid price $value',
      () => expect(() => priceTargetAmount(value), throwsFormatException),
    );
  }
  test('Reject wrong owner, duplicate targets and numeric revisions', () {
    expect(
      () => PriceTargets.fromJson(other, document()),
      throwsFormatException,
    );
    final v = document();
    v['targets'] = [target(), target()];
    expect(() => PriceTargets.fromJson(owner, v), throwsFormatException);
    expect(
      () => PriceTarget.fromJson({...target(), 'revision': 1}),
      throwsFormatException,
    );
  });
  test(
    'Fixed bearer and exact request bytes are used on explicit retry',
    () async {
      final seen = <http.Request>[];
      final service = PriceTargetService(
        ownerId: owner,
        baseUrl: 'http://127.0.0.1:36171',
        sessionReader: () => (ownerId: owner, token: 'first'),
        httpClient: MockClient((req) async {
          seen.add(req);
          if (seen.length == 1) {
            throw http.ClientException('private failure');
          }
          return http.Response(
            jsonEncode({'ownerId': owner, 'id': id, 'revision': '1'}),
            200,
          );
        }),
      );
      final body = request();
      await expectLater(
        service.save(body),
        throwsA(
          isA<PriceTargetFailure>()
              .having((e) => e.definitive, 'uncertain', false)
              .having((e) => e.message.contains('private'), 'sanitized', false),
        ),
      );
      expect(seen.length, 1);
      await service.save(body);
      expect(seen[0].body, seen[1].body);
      expect(seen[0].headers['authorization'], 'Bearer first');
      expect(jsonDecode(seen[0].body)['amount'], '12.34000000000000000001');
      service.dispose();
    },
  );
  test(
    'Owner replacement before handoff prevents requests and permanently closes',
    () async {
      var actor = owner, calls = 0;
      final changes = StreamController<String?>.broadcast(sync: true);
      final service = PriceTargetService(
        ownerId: owner,
        baseUrl: 'http://127.0.0.1:36171',
        ownerChanges: changes.stream,
        sessionReader: () => (ownerId: actor, token: 'token'),
        httpClient: MockClient((_) async {
          calls++;
          return http.Response(jsonEncode(document()), 200);
        }),
      );
      actor = other;
      changes.add(other);
      await expectLater(service.read(), throwsA(isA<PriceTargetFailure>()));
      actor = owner;
      changes.add(owner);
      await expectLater(service.read(), throwsA(isA<PriceTargetFailure>()));
      expect(calls, 0);
      expect(service.closed, true);
      service.dispose();
      await changes.close();
    },
  );
  test(
    'Delayed original mutation cannot retarget or return after logout',
    () async {
      var actor = owner;
      final ready = Completer<void>(), release = Completer<void>();
      final seen = <http.Request>[];
      final service = PriceTargetService(
        ownerId: owner,
        baseUrl: 'http://127.0.0.1:36171',
        sessionReader: () => (
          ownerId: actor,
          token: actor == owner ? 'original' : 'replacement',
        ),
        httpClient: MockClient((r) async {
          seen.add(r);
          ready.complete();
          await release.future;
          return http.Response(
            jsonEncode({'ownerId': owner, 'id': id, 'revision': '1'}),
            200,
          );
        }),
      );
      final pending = service.save(request());
      await ready.future;
      actor = other;
      release.complete();
      await expectLater(pending, throwsA(isA<PriceTargetFailure>()));
      expect(seen.length, 1);
      expect(seen.single.headers['authorization'], 'Bearer original');
      expect(service.closed, true);
      service.dispose();
    },
  );
  test('Delayed read after disposal cannot return private values', () async {
    final ready = Completer<void>(), release = Completer<void>();
    final service = PriceTargetService(
      ownerId: owner,
      baseUrl: 'http://127.0.0.1:36171',
      sessionReader: () => (ownerId: owner, token: 'original'),
      httpClient: MockClient((r) async {
        ready.complete();
        await release.future;
        return http.Response(jsonEncode(document()), 200);
      }),
    );
    final pending = service.read();
    await ready.future;
    service.dispose();
    release.complete();
    await expectLater(pending, throwsA(isA<PriceTargetFailure>()));
  });
  test(
    'Definitive stale target rejection differs from uncertain transport',
    () async {
      final service = PriceTargetService(
        ownerId: owner,
        baseUrl: 'http://127.0.0.1:36171',
        sessionReader: () => (ownerId: owner, token: 'token'),
        httpClient: MockClient(
          (_) async => http.Response(
            jsonEncode({'error': 'Reload alerts.', 'definitive': true}),
            409,
          ),
        ),
      );
      await expectLater(
        service.save(request()),
        throwsA(
          isA<PriceTargetFailure>().having(
            (e) => e.definitive,
            'definitive',
            true,
          ),
        ),
      );
      service.dispose();
    },
  );
  test(
    'An owner mismatch in a successful response closes the service',
    () async {
      final service = PriceTargetService(
        ownerId: owner,
        baseUrl: 'http://127.0.0.1:36171',
        sessionReader: () => (ownerId: owner, token: 'token'),
        httpClient: MockClient(
          (_) async =>
              http.Response(jsonEncode({...document(), 'ownerId': other}), 200),
        ),
      );
      await expectLater(service.read(), throwsA(isA<PriceTargetFailure>()));
      expect(service.closed, true);
      service.dispose();
    },
  );
  for (final url in [
    'grookai://price-alerts?target=$id',
    'https://grookaivault.com/account/price-alerts?target=$id',
    '/account/price-alerts?target=$id',
  ]) {
    test('Target notification opens owner-private route $url', () {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(url));
      expect(route?.kind, GrookaiCanonicalRouteKind.priceAlerts);
      expect(route?.value, id);
    });
  }
  for (final url in [
    'grookai://price-alerts/private?target=$id',
    'https://other.invalid/account/price-alerts?target=$id',
    'grookai://price-alerts?target=not-a-target',
  ]) {
    test(
      'Reject unrelated or malformed target link $url',
      () => expect(
        GrookaiWebRouteService.parseCanonicalUri(Uri.parse(url)),
        null,
      ),
    );
  }
}
