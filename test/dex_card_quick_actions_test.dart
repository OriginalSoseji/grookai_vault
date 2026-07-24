import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Dex card rows expose visible and long-press actions', () {
    final source = File(
      'lib/screens/dex/grookai_dex_species_screen.dart',
    ).readAsStringSync();

    expect(source, contains('onLongPress: onLongPress'));
    expect(source, contains("label: 'View card'"));
    expect(source, contains("'Manage Vault copies'"));
    expect(source, contains("'Add to Vault'"));
    expect(source, contains("'Want this card'"));
    expect(source, contains("'Remove Want'"));
    expect(source, contains("'Remove from Compare'"));
    expect(source, contains("label: 'Scan a card'"));
    expect(source, contains("label: 'Share'"));
  });

  test('Dex add requires an exact choice for multi-finish cards', () {
    final source = File(
      'lib/screens/dex/grookai_dex_species_screen.dart',
    ).readAsStringSync();

    final multiFinishIndex = source.indexOf('if (card.printings.length > 1)');
    final pickerIndex = source.indexOf(
      'showModalBottomSheet<GrookaiDexPrintingOption>',
    );
    final writeIndex = source.indexOf(
      'VaultCardService.addOrIncrementVaultItem',
    );

    expect(multiFinishIndex, greaterThanOrEqualTo(0));
    expect(pickerIndex, greaterThan(multiFinishIndex));
    expect(writeIndex, greaterThan(pickerIndex));
    expect(source, contains('cardPrintingId: selectedPrinting?.id'));
    expect(source, contains("'Choose the exact finish'"));
  });

  test('Dex to Vault filter uses canonical mappings, never name inference', () {
    final service = File(
      'lib/services/grookai_dex/grookai_dex_service.dart',
    ).readAsStringSync();
    final vault = File('lib/main_vault.dart').readAsStringSync();

    expect(service, contains('fetchCardPrintIdsForSpecies'));
    expect(service, contains("'v_grookai_dex_card_prints_v1'"));
    expect(service, contains(".eq('species_slug', slug)"));
    expect(vault, contains('openSpeciesFilter'));
    expect(vault, contains('_canonicalSpeciesCardPrintIds.contains'));
    expect(vault, contains('Exact species'));
  });
}
