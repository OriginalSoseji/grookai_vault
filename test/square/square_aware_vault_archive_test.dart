import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/square/square_service.dart';
import 'package:grookai_vault/services/vault/square_aware_vault_archive.dart';

const owner = 'ee000000-0000-4000-8000-000000000001';
const instance = 'ee000000-0000-4000-8000-000000000002';
const gvvi = 'GVVI-EE000000-000001';
PostgrestException reserved(String id) => PostgrestException(
  message: 'square_stock_reserved',
  code: '55000',
  details: jsonEncode({
    'kind': 'square_vault_removal_v1',
    'instanceId': id,
    'gvvi': gvvi,
  }),
);
Future<SupabaseClient> localClient() async {
  final client = SupabaseClient(
    'https://auth.fixture.invalid',
    'public-fixture-key',
    authOptions: const AuthClientOptions(autoRefreshToken: false),
    httpClient: MockClient(
      (_) async => http.Response(
        jsonEncode({
          'access_token': 'local-sdk-session-only',
          'refresh_token': 'local-sdk-refresh-only',
          'token_type': 'bearer',
          'expires_in': 3600,
          'user': {
            'id': owner,
            'aud': 'authenticated',
            'role': 'authenticated',
            'email': 'removal@fixture.invalid',
            'app_metadata': {},
            'user_metadata': {},
            'created_at': '2026-11-14T00:00:00Z',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      ),
    ),
  );
  addTearDown(client.dispose);
  await client.auth.signInWithPassword(
    email: 'removal@fixture.invalid',
    password: 'synthetic-local-only',
  );
  return client;
}

class Gateway implements SquareGateway {
  final calls = <String>[];
  Future<Map<String, dynamic>> Function(String)? prepare;
  @override
  Future<Map<String, dynamic>> call(
    String action,
    Map<String, dynamic> data,
  ) async {
    expect(action, 'prepareRemoval');
    expect(data.keys, ['instanceId']);
    final id = data['instanceId'] as String;
    calls.add(id);
    return prepare == null
        ? {'status': 'ready_to_archive', 'instanceId': id, 'gvvi': gvvi}
        : prepare!(id);
  }

  @override
  Future<Map<String, dynamic>> workspace() async => throw UnimplementedError();
  @override
  void dispose() {}
}

void main() {
  test(
    'ordinary owner archive returns its original receipt without Square',
    () async {
      final client = await localClient();
      final gateway = Gateway();
      final receipt = await squareAwareVaultArchive(
        client: client,
        gateway: gateway,
        archive: () async => {'archived': instance},
      );
      expect(receipt, {'archived': instance});
      expect(gateway.calls, isEmpty);
    },
  );
  test(
    'known rollback prepares only the exact copy and retries the unchanged archive',
    () async {
      final client = await localClient();
      final gateway = Gateway();
      var calls = 0;
      final receipt = await squareAwareVaultArchive(
        client: client,
        gateway: gateway,
        archive: () async {
          if (++calls == 1) throw reserved(instance);
          return {'archived': instance};
        },
      );
      expect(receipt, {'archived': instance});
      expect(calls, 2);
      expect(gateway.calls, [instance]);
    },
  );
  test(
    'bulk callback remains atomic while each encountered exact-copy claim is prepared',
    () async {
      final client = await localClient();
      final gateway = Gateway();
      var calls = 0;
      const second = 'ee000000-0000-4000-8000-000000000003';
      final value = await squareAwareVaultArchive(
        client: client,
        gateway: gateway,
        archive: () async {
          calls++;
          if (calls < 3) throw reserved(calls == 1 ? instance : second);
          return 2;
        },
      );
      expect(value, 2);
      expect(gateway.calls, [instance, second]);
    },
  );
  test(
    'malformed targets, unrelated reservations and lock contention never withdraw a copy',
    () async {
      final client = await localClient();
      final gateway = Gateway();
      for (final error in [
        const PostgrestException(
          message: 'square_stock_reserved',
          code: '55000',
          details: 'Internal Server Error',
        ),
        const PostgrestException(message: 'ebay_stock_reserved', code: '55000'),
        const PostgrestException(message: 'square_removal_busy', code: '55000'),
      ]) {
        await expectLater(
          squareAwareVaultArchive(
            client: client,
            gateway: gateway,
            archive: () async => throw error,
          ),
          throwsA(isA<Exception>()),
        );
      }
      expect(gateway.calls, isEmpty);
      expect(
        squareArchiveRecoveryTarget(reserved('bad-target').details),
        isNull,
      );
    },
  );
  test('uncertain transport is not a retryable archive result', () async {
    final client = await localClient();
    final gateway = Gateway();
    var calls = 0;
    await expectLater(
      squareAwareVaultArchive(
        client: client,
        gateway: gateway,
        archive: () async {
          calls++;
          throw Exception('uncertain owner transport');
        },
      ),
      throwsException,
    );
    expect(calls, 1);
    expect(gateway.calls, isEmpty);
    gateway.prepare = (_) async =>
        throw StateError('provider result unconfirmed');
    calls = 0;
    await expectLater(
      squareAwareVaultArchive(
        client: client,
        gateway: gateway,
        archive: () async {
          calls++;
          throw reserved(instance);
        },
      ),
      throwsException,
    );
    expect(calls, 1);
    expect(gateway.calls, [instance]);
  });
  test(
    'mismatched readback and repeated failed guard stop before another withdrawal',
    () async {
      final client = await localClient();
      final wrong = Gateway()
        ..prepare = (_) async => {
          'status': 'ready_to_archive',
          'instanceId': owner,
          'gvvi': gvvi,
        };
      var calls = 0;
      await expectLater(
        squareAwareVaultArchive(
          client: client,
          gateway: wrong,
          archive: () async {
            calls++;
            throw reserved(instance);
          },
        ),
        throwsException,
      );
      expect(calls, 1);
      final repeated = Gateway();
      calls = 0;
      await expectLater(
        squareAwareVaultArchive(
          client: client,
          gateway: repeated,
          archive: () async {
            calls++;
            throw reserved(instance);
          },
        ),
        throwsException,
      );
      expect(calls, 2);
      expect(repeated.calls, [instance]);
    },
  );
  test(
    'owner logout during preparation prevents the second archive request',
    () async {
      final client = await localClient();
      final gateway = Gateway();
      var calls = 0;
      gateway.prepare = (id) async {
        await client.auth.signOut(scope: SignOutScope.local);
        return {'status': 'ready_to_archive', 'instanceId': id, 'gvvi': gvvi};
      };
      await expectLater(
        squareAwareVaultArchive(
          client: client,
          gateway: gateway,
          archive: () async {
            calls++;
            throw reserved(instance);
          },
        ),
        throwsException,
      );
      expect(calls, 1);
    },
  );
}
