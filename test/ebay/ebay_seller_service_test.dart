import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/ebay/ebay_seller_service.dart';

const owner = 'ee000000-0000-4000-8000-000000000001';
const otherOwner = 'ee000000-0000-4000-8000-000000000002';
Future<SupabaseClient> signedInClient({bool signIn = true}) async {
  final client = SupabaseClient(
    'https://auth.example.test',
    'public-fixture-key',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient(
      (request) async => http.Response(
        jsonEncode(
          request.url.path.endsWith('/logout')
              ? {}
              : {
                  'access_token': 'fixture-sdk-owner-session',
                  'refresh_token': 'fixture-sdk-refresh-session',
                  'token_type': 'bearer',
                  'expires_in': 3600,
                  'user': {
                    'id': owner,
                    'aud': 'authenticated',
                    'role': 'authenticated',
                    'email': 'seller-fixture@example.test',
                    'app_metadata': {},
                    'user_metadata': {},
                    'created_at': '2026-10-28T00:00:00Z',
                  },
                },
        ),
        200,
        headers: {'content-type': 'application/json'},
        request: request,
      ),
    ),
  );
  addTearDown(client.dispose);
  if (signIn) {
    await client.auth.signInWithPassword(
      email: 'seller-fixture@example.test',
      password: 'synthetic-test-only',
    );
  }
  return client;
}

void main() {
  test(
    'signed-out or different-owner screens never issue seller HTTP requests',
    () async {
      var requests = 0;
      for (final signedIn in [false, true]) {
        final client = await signedInClient(signIn: signedIn);
        final service = EbaySellerService(
          client,
          ownerId: signedIn ? otherOwner : owner,
          transport: MockClient((request) async {
            requests++;
            return http.Response('{}', 200);
          }),
        );
        addTearDown(service.dispose);
        await expectLater(service.workspace(), throwsStateError);
      }
      expect(requests, 0);
    },
  );
  test(
    'native API uses the SDK user session on the pinned HTTPS endpoint without redirects',
    () async {
      final client = await signedInClient();
      final service = EbaySellerService(
        client,
        ownerId: owner,
        transport: MockClient((request) async {
          expect(request.url.origin, 'https://grookaivault.com');
          expect(request.url.path, '/api/ebay/seller');
          expect(request.followRedirects, isFalse);
          expect(
            request.headers['Authorization'],
            'Bearer fixture-sdk-owner-session',
          );
          expect(jsonDecode(request.body), {
            'action': 'publish',
            'requestId': 'durable-operation',
          });
          return http.Response('{"status":"uncertain"}', 200, request: request);
        }),
      );
      addTearDown(service.dispose);
      expect(
        await service.call('publish', {'requestId': 'durable-operation'}),
        {'status': 'uncertain'},
      );
    },
  );
  test(
    'network failure is safe and leaves a stable explicit retry to the caller',
    () async {
      final client = await signedInClient();
      final bodies = <String>[];
      final service = EbaySellerService(
        client,
        ownerId: owner,
        transport: MockClient((request) async {
          bodies.add(request.body);
          if (bodies.length == 1) {
            throw http.ClientException('private-host.example');
          }
          return http.Response('{"status":"succeeded"}', 200, request: request);
        }),
      );
      addTearDown(service.dispose);
      const payload = {
        'requestId': 'retained-operation',
        'draftId': 'retained-draft',
        'revision': 3,
      };
      await expectLater(
        service.call('publish', payload),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'safe collector message',
            EbaySellerService.uncertainMessage,
          ),
        ),
      );
      expect(bodies.length, 1);
      expect(await service.call('publish', payload), {'status': 'succeeded'});
      expect(bodies[1], bodies[0]);
    },
  );
  test(
    'an account change during a request cannot return the previous owner data',
    () async {
      final client = await signedInClient();
      final service = EbaySellerService(
        client,
        ownerId: owner,
        transport: MockClient((request) async {
          await client.auth.signOut();
          return http.Response(
            '{"privateOwnerDraft":"should not be shown"}',
            200,
            request: request,
          );
        }),
      );
      addTearDown(service.dispose);
      await expectLater(
        service.workspace(),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'account boundary',
            contains('same grookai account'),
          ),
        ),
      );
    },
  );
  test(
    'malformed and oversized responses are never presented as a saved listing',
    () async {
      for (final response in ['not JSON', '[]', 'x' * (2 * 1024 * 1024 + 1)]) {
        final client = await signedInClient();
        final service = EbaySellerService(
          client,
          ownerId: owner,
          transport: MockClient(
            (request) async => http.Response(response, 200, request: request),
          ),
        );
        addTearDown(service.dispose);
        await expectLater(
          service.workspace(),
          throwsA(
            isA<StateError>().having(
              (e) => e.message,
              'unconfirmed',
              EbaySellerService.uncertainMessage,
            ),
          ),
        );
      }
    },
  );
  test(
    'large metadata dictionaries survive the native envelope without widening workspace reads',
    () async {
      final client = await signedInClient();
      final values = List.generate(
        50000,
        (i) => {'localizedValue': 'Collector card printing $i'},
      );
      final body = jsonEncode({
        'aspects': [
          {'localizedAspectName': 'Card Name', 'aspectValues': values},
        ],
      });
      expect(utf8.encode(body).length, greaterThan(2 * 1024 * 1024));
      final service = EbaySellerService(
        client,
        ownerId: owner,
        transport: MockClient(
          (request) async => http.Response(body, 200, request: request),
        ),
      );
      addTearDown(service.dispose);
      final result = await service.call('metadata', {
        'instanceId': 'exact-copy',
        'accountId': 'linked-account',
      });
      final aspects = result['aspects'] as List;
      expect((aspects.single['aspectValues'] as List).length, values.length);
      expect((aspects.single['aspectValues'] as List).last, values.last);
      await expectLater(service.workspace(), throwsStateError);
      await expectLater(
        service.call('publish', {'requestId': 'reviewed-operation'}),
        throwsStateError,
      );
    },
  );
  test('metadata keeps a finite 8 MiB response envelope', () async {
    final client = await signedInClient();
    final service = EbaySellerService(
      client,
      ownerId: owner,
      transport: MockClient(
        (request) async =>
            http.Response('x' * (8 * 1024 * 1024 + 1), 200, request: request),
      ),
    );
    addTearDown(service.dispose);
    await expectLater(
      service.call('metadata', {
        'instanceId': 'exact-copy',
        'accountId': 'linked-account',
      }),
      throwsA(
        isA<StateError>().having(
          (e) => e.message,
          'bounded metadata',
          EbaySellerService.uncertainMessage,
        ),
      ),
    );
  });
}
