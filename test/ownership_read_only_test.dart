import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/ownership_state.dart';
import 'package:grookai_vault/services/vault/owned_copy_read_service.dart';
import 'package:grookai_vault/services/vault/ownership_resolver_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'support/owner_copy_fixture.dart';

void main() {
  test('a smaller server cap cannot truncate exact-copy ownership', () async {
    final f = OwnerCopyFixture()..rowCap = 2;
    f.copies['many'] = List.generate(5, (i) => ownedCopy('copy-$i'));
    await f.signIn();
    final state = await OwnershipResolverService(
      client: f.client,
    ).resolve(cardPrintId: 'many');
    expect(state.ownedCount, 5);
    expect(
      f.requests
          .where((r) => r.url.path.endsWith('/vault_mobile_card_copies_v1'))
          .map((r) => r.url.queryParameters['offset'] ?? '0'),
      ['0', '2', '4', '5'],
    );
    await f.client.dispose();
  });
  test(
    'Messages ownership resolves raw, slab-only, mixed and duplicate anchors with reads only',
    () async {
      final f = OwnerCopyFixture();
      f.copies['raw'] = [
        ownedCopy('raw-new', anchor: 'new-anchor', intent: 'sell'),
        ownedCopy('raw-old', anchor: 'old-anchor'),
      ];
      f.copies['slab'] = [ownedCopy('slab', slab: true)];
      f.copies['mixed'] = [
        ownedCopy('mixed-slab', slab: true),
        ownedCopy('mixed-raw'),
      ];
      await f.signIn();
      final states = await OwnershipResolverService(
        client: f.client,
      ).resolveMany(cardPrintIds: ['raw', 'slab', 'mixed', 'missing', 'raw']);
      expect(states.length, 4);
      expect(states['raw']!.ownedCount, 2);
      expect(states['raw']!.primaryGvviId, 'GVVI-raw-new');
      expect(states['raw']!.primaryVaultItemId, 'new-anchor');
      expect(states['raw']!.onWall, isTrue);
      expect(states['raw']!.inPlay, isTrue);
      expect(states['slab']!.ownedCount, 1);
      expect(states['slab']!.primaryVaultItemId, isNull);
      expect(states['slab']!.bestAction, OwnershipAction.viewYourCopy);
      expect(states['mixed']!.ownedCount, 2);
      expect(states['missing']!.bestAction, OwnershipAction.addToVault);
      expect(
        f.requests.every(
          (r) =>
              r.url.path.endsWith('/shared_cards') ||
              r.url.path.endsWith('/vault_mobile_card_copies_v1'),
        ),
        isTrue,
      );
      expect(f.copies['raw']!.length, 2);
      await f.client.dispose();
    },
  );
  test(
    'latest target keeps the selected copy legacy identity without reconciling anchors',
    () async {
      final f = OwnerCopyFixture();
      f.copies['raw'] = [
        ownedCopy('new', anchor: 'linked-old-anchor'),
        ownedCopy('old', anchor: 'other-anchor'),
      ];
      await f.signIn();
      final target = await VaultCardService.resolveLatestOwnedCopyTarget(
        client: f.client,
        cardPrintId: 'raw',
      );
      expect(target!.instanceId, 'new');
      expect(target.vaultItemId, 'linked-old-anchor');
      expect(f.requests.length, 2);
      expect(
        f.requests.first.url.queryParameters['order'],
        'created_at.desc.nullslast,instance_id.desc.nullslast',
      );
      await f.client.dispose();
    },
  );
  test('all pages contribute to counts and exact target selection', () async {
    final f = OwnerCopyFixture();
    f.copies['many'] = [
      ...List.generate(200, (i) => ownedCopy('copy-$i', hasGvvi: false)),
      ownedCopy('last'),
    ];
    await f.signIn();
    final state = await OwnershipResolverService(
      client: f.client,
    ).resolve(cardPrintId: 'many');
    expect(state.ownedCount, 201);
    expect(state.primaryGvviId, 'GVVI-last');
    expect(
      f.requests.where((r) => r.url.queryParameters['offset'] == '200').length,
      1,
    );
    await f.client.dispose();
  });
  test(
    'later page denial is surfaced instead of returning partial ownership',
    () async {
      final f = OwnerCopyFixture()..failOffset = 200;
      f.copies['many'] = List.generate(201, (i) => ownedCopy('copy-$i'));
      await f.signIn();
      await expectLater(
        OwnershipResolverService(client: f.client).resolve(cardPrintId: 'many'),
        throwsA(isA<PostgrestException>()),
      );
      await f.client.dispose();
    },
  );
  test('malformed reads remain failures, never an empty Vault', () async {
    final f = OwnerCopyFixture()..malformed = true;
    await f.signIn();
    await expectLater(
      OwnedCopyReadService.load(client: f.client, cardPrintId: 'raw'),
      throwsStateError,
    );
    await f.client.dispose();
  });
  test('guest and empty input never issue owner reads', () async {
    final f = OwnerCopyFixture();
    final state = await OwnershipResolverService(
      client: f.client,
    ).resolve(cardPrintId: 'raw');
    expect(state.owned, isFalse);
    expect(
      await VaultCardService.resolveLatestOwnedCopyTarget(
        client: f.client,
        cardPrintId: 'raw',
      ),
      isNull,
    );
    expect(
      await VaultCardService.resolveOwnedCardAnchor(
        client: f.client,
        cardPrintId: 'raw',
      ),
      isNull,
    );
    expect(f.requests, isEmpty);
    await f.client.dispose();
  });
  test('compatibility anchor lookup is a bounded owner-only SELECT', () async {
    final f = OwnerCopyFixture();
    await f.signIn();
    final anchor = await VaultCardService.resolveOwnedCardAnchor(
      client: f.client,
      cardPrintId: 'raw',
    );
    expect(anchor!.vaultItemId, 'newest-anchor');
    final request = f.requests.single;
    expect(request.method, 'GET');
    expect(request.url.queryParameters['user_id'], 'eq.owner');
    expect(request.url.queryParameters['card_id'], 'eq.raw');
    expect(request.url.queryParameters['archived_at'], 'is.null');
    expect(request.url.queryParameters['limit'], '1');
    await f.client.dispose();
  });
}
