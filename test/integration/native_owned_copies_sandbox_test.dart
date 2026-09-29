import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/vault/ownership_resolver_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:grookai_vault/services/grookai_objects/object_inventory_service.dart';

class ReadOnlyFixtureTransport extends http.BaseClient {
  final http.Client delegate = http.Client();
  final List<String> requests = [];
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    final url = request.url;
    if (url.origin != 'http://127.0.0.1:31021' ||
        (request.method != 'GET' &&
            ![
              '/auth/v1/token',
              '/rest/v1/rpc/vault_mobile_card_copies_v1',
              '/rest/v1/rpc/get_market_pricing_read_model_v1',
            ].contains(url.path))) {
      throw StateError(
        'Unexpected ownership test request: ${request.method} ${url.path}',
      );
    }
    requests.add('${request.method} ${url.path}');
    return delegate.send(request);
  }

  @override
  void close() => delegate.close();
}

void main() {
  final fixturePath = Platform.environment['GV_OWNED_COPY_FIXTURE'];
  test(
    'real Auth/RLS reads raw, slab and duplicate copies without reconciliation',
    () async {
      final fixture =
          jsonDecode(File(fixturePath!).readAsStringSync())
              as Map<String, dynamic>;
      expect(fixture['api'], 'http://127.0.0.1:31021');
      final transport = ReadOnlyFixtureTransport();
      final client = SupabaseClient(
        fixture['api'],
        fixture['anon'],
        authOptions: const AuthClientOptions(autoRefreshToken: false),
        httpClient: transport,
      );
      try {
        final owner = fixture['owner'];
        await client.auth.signInWithPassword(
          email: owner['email'],
          password: owner['password'],
        );
        expect(client.auth.currentUser!.id, owner['id']);
        final resolver = OwnershipResolverService(client: client);
        final states = await resolver.resolveMany(
          cardPrintIds: [fixture['raw'], fixture['slab'], fixture['foreign']],
        );
        expect(states[fixture['raw']]!.ownedCount, 206);
        expect(states[fixture['slab']]!.ownedCount, 1);
        expect(states[fixture['slab']]!.primaryVaultItemId, isNull);
        expect(states[fixture['slab']]!.hasExactCopy, isTrue);
        expect(states[fixture['foreign']]!.ownedCount, 0);
        final target = await VaultCardService.resolveLatestOwnedCopyTarget(
          client: client,
          cardPrintId: fixture['raw'],
        );
        expect(target!.instanceId, fixture['newest']);
        expect(target.vaultItemId, fixture['secondAnchor']);
        final rows = await const ObjectInventoryService().load(client);
        expect(rows.length, 207);
        expect(rows.map((r) => r['instance_id']).toSet().length, 207);
        expect(rows.where((r) => r['is_graded'] == true).length, 2);
        expect(rows.where((r) => r['card_id'] == fixture['foreign']), isEmpty);
        final foreign = await client
            .from('vault_item_instances')
            .select('id')
            .eq('user_id', fixture['other']['id']);
        expect(foreign, isEmpty);
        final other = fixture['other'];
        await client.auth.signInWithPassword(
          email: other['email'],
          password: other['password'],
        );
        expect(
          (await resolver.resolve(cardPrintId: fixture['raw'])).ownedCount,
          0,
        );
        expect((await const ObjectInventoryService().load(client)).length, 1);
        expect(
          transport.requests.any(
            (r) => r.contains('resolve_active_vault_anchor'),
          ),
          isFalse,
        );
        File(fixture['result']).writeAsStringSync(
          jsonEncode({
            'status': 'PASS',
            'ownedRows': 207,
            'rawAndMixedCopies': 206,
            'slabOnlyCopies': 1,
            'foreignRowsDenied': true,
            'accountSwitchIsolated': true,
            'requests': transport.requests,
          }),
        );
      } finally {
        await client.dispose();
        transport.close();
      }
    },
    skip: fixturePath == null,
    timeout: const Timeout(Duration(minutes: 2)),
  );
}
