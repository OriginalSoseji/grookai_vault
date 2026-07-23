import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';

void main() {
  const options = <VaultSetCompletionOption>[
    VaultSetCompletionOption(cardPrintId: 'card-a', cardPrintingId: 'a-holo'),
    VaultSetCompletionOption(
      cardPrintId: 'card-a',
      cardPrintingId: 'a-reverse',
    ),
    VaultSetCompletionOption(cardPrintId: 'card-b'),
  ];

  test('slab-only ownership counts the exact assigned finish', () {
    final snapshot = calculateVaultSetCompletionSnapshot(
      options: options,
      copies: const <VaultSetCompletionCopy>[
        VaultSetCompletionCopy(
          instanceId: 'slab-only-holo',
          slabCardPrintId: 'card-a',
          cardPrintingId: 'a-holo',
        ),
      ],
    );

    expect(snapshot.variantOptionCount, 3);
    expect(snapshot.ownedVariantOptionCount, 1);
  });

  test('direct ownership counts its exact finish and fallback parent', () {
    final snapshot = calculateVaultSetCompletionSnapshot(
      options: options,
      copies: const <VaultSetCompletionCopy>[
        VaultSetCompletionCopy(
          instanceId: 'direct-reverse',
          directCardPrintId: 'card-a',
          cardPrintingId: 'a-reverse',
        ),
        VaultSetCompletionCopy(
          instanceId: 'direct-parent',
          directCardPrintId: 'card-b',
        ),
      ],
    );

    expect(snapshot.ownedVariantOptionCount, 2);
  });

  test('dual-anchored copies count once through the direct identity', () {
    final snapshot = calculateVaultSetCompletionSnapshot(
      options: options,
      copies: const <VaultSetCompletionCopy>[
        VaultSetCompletionCopy(
          instanceId: 'dual-copy',
          directCardPrintId: 'card-a',
          slabCardPrintId: 'card-b',
          cardPrintingId: 'a-holo',
        ),
        // Repeated transport rows for the same physical instance are ignored.
        VaultSetCompletionCopy(
          instanceId: 'dual-copy',
          slabCardPrintId: 'card-b',
        ),
      ],
    );

    expect(snapshot.ownedVariantOptionCount, 1);
  });

  test('unassigned copies never infer a finish when finish options exist', () {
    final snapshot = calculateVaultSetCompletionSnapshot(
      options: options,
      copies: const <VaultSetCompletionCopy>[
        VaultSetCompletionCopy(
          instanceId: 'slab-unassigned',
          slabCardPrintId: 'card-a',
        ),
      ],
    );

    expect(snapshot.ownedVariantOptionCount, 0);
  });

  test('Projects and completion crossings use the slab-aware owner read', () {
    final projectSource = File(
      'lib/services/vault/collection_project_service.dart',
    ).readAsStringSync();
    final vaultSource = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final dexSource = File(
      'lib/services/grookai_dex/grookai_dex_service.dart',
    ).readAsStringSync();
    final publicSetsSource = File(
      'lib/services/public/public_sets_service.dart',
    ).readAsStringSync();

    expect(projectSource, contains('fetchSetCompletionSnapshot('));
    expect(vaultSource, contains('getOwnedCountsIncludingSlabs('));
    expect(
      vaultSource,
      contains('final slabInstanceCounts = <String, int>{};'),
    );
    expect(vaultSource, contains(".inFilter('id', chunk)"));
    expect(
      vaultSource,
      isNot(
        contains(
          ".from('slab_certs')\n          .select('id,card_print_id')\n          .inFilter('card_print_id', chunk)",
        ),
      ),
    );
    expect(vaultSource, contains(".filter('card_print_id', 'is', null)"));
    expect(vaultSource, contains('calculateVaultSetCompletionSnapshot('));
    expect(dexSource, contains(".filter('card_print_id', 'is', null)"));
    expect(
      publicSetsSource,
      contains('VaultCardService.getOwnedCardTruthIncludingSlabs('),
    );
    expect(publicSetsSource, isNot(contains('_fetchOwnedPrintingCounts(')));
  });
}
