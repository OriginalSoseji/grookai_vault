import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final rootSource = File(
    'lib/screens/dex/grookai_dex_screen.dart',
  ).readAsStringSync();
  final speciesSource = File(
    'lib/screens/dex/grookai_dex_species_screen.dart',
  ).readAsStringSync();

  test(
    'Dex root supports full-catalog collection filters and useful sorts',
    () {
      expect(rootSource, contains('enum _DexSpeciesProgress'));
      expect(rootSource, contains('row.generation != _generationFilter'));
      expect(rootSource, contains('row.types.any'));
      expect(rootSource, contains('_DexSpeciesProgress.unstarted'));
      expect(rootSource, contains('_DexSpeciesProgress.inProgress'));
      expect(rootSource, contains('_DexSpeciesProgress.complete'));
      expect(rootSource, contains('_DexSpeciesSort.completionHigh'));
      expect(rootSource, contains('_DexSpeciesSort.biggestGaps'));
      expect(rootSource, contains('speciesPage?.allSpecies'));
    },
  );

  test('Dex root keeps every presentation virtualized', () {
    expect(rootSource, contains('_DexSpeciesPresentation.list'));
    expect(rootSource, contains('_DexSpeciesPresentation.grid'));
    expect(rootSource, contains('_DexSpeciesPresentation.compact'));
    expect(rootSource, contains('SliverGrid.builder'));
    expect(
      RegExp(r'SliverList\.builder').allMatches(rootSource).length,
      greaterThanOrEqualTo(2),
    );
  });

  test('species detail preserves semantic views and refines within them', () {
    expect(
      speciesSource,
      contains('_DexSpeciesView.collection => detail.completionCards'),
    );
    expect(
      speciesSource,
      contains('_DexSpeciesView.additional => detail.additionalCards'),
    );
    expect(
      speciesSource,
      contains('_DexSpeciesView.cameos => detail.cameoCards'),
    );
    expect(speciesSource, contains('_cardSetLabel(card)'));
    expect(speciesSource, contains('_cardRarityLabel(card)'));
    expect(speciesSource, contains('card.printings.any'));
    expect(speciesSource, contains('_DexCardOwnership.owned'));
    expect(speciesSource, contains('_DexCardOwnership.missing'));
  });

  test('species card layouts retain navigation and Vault actions', () {
    expect(speciesSource, contains('_DexCardPresentation.list'));
    expect(speciesSource, contains('_DexCardPresentation.grid'));
    expect(speciesSource, contains('_DexCardPresentation.compact'));
    expect(speciesSource, contains('SliverGrid.builder'));
    expect(speciesSource, contains('class _DexCardGridTile'));
    expect(speciesSource, contains('class _DexCardCompactTile'));
    expect(
      speciesSource,
      contains('onLongPress: () => _showCardActions(card)'),
    );
    expect(
      speciesSource,
      contains('card.isOwned ? _manageCard(card) : _addCard(card)'),
    );
  });
}
