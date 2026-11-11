import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/square/square_service.dart';

const owner = 'ee000000-0000-4000-8000-000000000001';
Future<SupabaseClient> authClient() async {
  final client = SupabaseClient(
    'https://auth.example.test',
    'public-fixture-key',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient(
      (request) async => http.Response(
        jsonEncode({
          'access_token': 'fixture-sdk-square-owner',
          'refresh_token': 'fixture-sdk-square-refresh',
          'token_type': 'bearer',
          'expires_in': 3600,
          'user': {
            'id': owner,
            'aud': 'authenticated',
            'role': 'authenticated',
            'email': 'square@fixture.invalid',
            'app_metadata': {},
            'user_metadata': {},
            'created_at': '2026-11-11T00:00:00Z',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      ),
    ),
  );
  addTearDown(client.dispose);
  await client.auth.signInWithPassword(
    email: 'square@fixture.invalid',
    password: 'synthetic-test-only',
  );
  return client;
}

void main() {
  test(
    'native Square transport uses the verified SDK owner, fixed HTTPS origin and no redirects',
    () async {
      final client = await authClient();
      final service = SquareService(
        client,
        ownerId: owner,
        transport: MockClient((request) async {
          expect(request.url.origin, 'https://grookaivault.com');
          expect(request.url.path, '/api/square');
          expect(request.followRedirects, isFalse);
          expect(
            request.headers['Authorization'],
            'Bearer fixture-sdk-square-owner',
          );
          expect(jsonDecode(request.body), {
            'action': 'preferences',
            'connectionId': 'fixture',
            'autoEnroll': true,
          });
          return http.Response('{"saved":true}', 200);
        }),
      );
      addTearDown(service.dispose);
      expect(
        await service.call('preferences', {
          'connectionId': 'fixture',
          'autoEnroll': true,
        }),
        {'saved': true},
      );
    },
  );
  test('different-owner native screens never issue Square requests', () async {
    final client = await authClient();
    var calls = 0;
    final service = SquareService(
      client,
      ownerId: 'another-owner',
      transport: MockClient((request) async {
        calls++;
        return http.Response('{}', 200);
      }),
    );
    addTearDown(service.dispose);
    await expectLater(service.workspace(), throwsStateError);
    expect(calls, 0);
  });
  test(
    'post-save notification uses the owner endpoint; malformed provider responses do not become success',
    () async {
      final client = await authClient();
      var calls = 0;
      final service = SquareService(
        client,
        ownerId: owner,
        transport: MockClient((request) async {
          expect(request.url.path, '/api/square/notify');
          calls++;
          return calls == 1
              ? http.Response('{"status":"pending"}', 200)
              : http.Response('not-json', 502);
        }),
      );
      addTearDown(service.dispose);
      expect((await service.notifyOffer('copy'))['status'], 'pending');
      await expectLater(service.notifyOffer('copy'), throwsStateError);
    },
  );
}
