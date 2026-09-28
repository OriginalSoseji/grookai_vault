import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:grookai_vault/services/search/resolver_transport.dart';

void main() {
  final uri = Uri.https('example.invalid', '/api/resolver/search', {
    'q': 'Yuka Morii Wurmple reverse holo',
    'lang': 'ja',
    'set': 'pl1',
  });
  const headers = {
    'Authorization': 'Bearer fixture',
    'Accept': 'application/json',
  };

  testWidgets('a slow valid response is not rejected at ten seconds', (
    tester,
  ) async {
    var completed = false;
    final future = http.runWithClient(
      () => getSearchResolver(uri, headers: headers).then((r) {
        completed = true;
        return r;
      }),
      () => MockClient((_) async {
        await Future<void>.delayed(const Duration(seconds: 12));
        return http.Response('{"rows":[]}', 200);
      }),
    );
    await tester.pump(const Duration(seconds: 11));
    expect(completed, false);
    await tester.pump(const Duration(seconds: 1));
    expect((await future).statusCode, 200);
  });

  for (final status in [502, 503, 504]) {
    test(
      'transient $status retries exactly the same query and account',
      () async {
        final requests = <http.Request>[];
        final result = await http.runWithClient(
          () => getSearchResolver(
            uri,
            headers: headers,
            retryDelay: Duration.zero,
          ),
          () => MockClient((r) async {
            requests.add(r);
            return http.Response('{}', requests.length == 1 ? status : 200);
          }),
        );
        expect(result.statusCode, 200);
        expect(requests.length, 2);
        for (final r in requests) {
          expect(r.url, uri);
          expect(r.headers['Authorization'], 'Bearer fixture');
        }
      },
    );
  }
  for (final status in [400, 401, 403, 429]) {
    test('$status is surfaced without automatic retry', () async {
      var calls = 0;
      final result = await http.runWithClient(
        () =>
            getSearchResolver(uri, headers: headers, retryDelay: Duration.zero),
        () => MockClient((_) async {
          calls++;
          return http.Response('{}', status);
        }),
      );
      expect(result.statusCode, status);
      expect(calls, 1);
    });
  }
  test('network retry is bounded and does not change constraints', () async {
    var calls = 0;
    await expectLater(
      http.runWithClient(
        () =>
            getSearchResolver(uri, headers: headers, retryDelay: Duration.zero),
        () => MockClient((r) async {
          calls++;
          expect(r.url, uri);
          throw http.ClientException('offline');
        }),
      ),
      throwsA(isA<http.ClientException>()),
    );
    expect(calls, 2);
  });
  testWidgets('timeouts stop after one retry', (tester) async {
    var calls = 0;
    final future = http.runWithClient(
      () => getSearchResolver(uri, headers: headers, retryDelay: Duration.zero),
      () => MockClient((_) {
        calls++;
        return Completer<http.Response>().future;
      }),
    );
    final assertion = expectLater(future, throwsA(isA<TimeoutException>()));
    await tester.pump(const Duration(seconds: 20));
    await tester.pump();
    await tester.pump(const Duration(seconds: 20));
    await assertion;
    expect(calls, 2);
  });
}
