import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'search and card browsers do not put marketing headers before content',
    () {
      final search = File('lib/main.dart').readAsStringSync();
      final sets = File(
        'lib/screens/sets/public_sets_screen.dart',
      ).readAsStringSync();
      final sales = File(
        'lib/screens/sales/sales_desk_screen.dart',
      ).readAsStringSync();
      final objects = File(
        'lib/screens/grookai_objects/grookai_objects_hub_screen.dart',
      ).readAsStringSync();

      expect(search, isNot(contains('_SearchIdentityHeader')));
      expect(search, isNot(contains('Find the exact card.')));
      expect(sets, contains('bool _showFilters = false;'));
      expect(sets, isNot(contains("title: 'Browse by era'")));
      expect(sales, isNot(contains('Your cards. Ready to sell.')));
      expect(sales, isNot(contains('Drop here to add')));
      expect(objects, isNot(contains('Build from your vault')));
    },
  );

  test('Vault and set detail render collectible cards before utilities', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final setDetail = File(
      'lib/screens/sets/public_set_detail_screen.dart',
    ).readAsStringSync();

    final vaultCards = vault.indexOf('...vaultContentSlivers');
    final sealedInventory = vault.indexOf('OwnedSealedPanel(', vaultCards);
    expect(vaultCards, greaterThanOrEqualTo(0));
    expect(sealedInventory, greaterThan(vaultCards));

    final setGrid = setDetail.indexOf('sliver: SliverLayoutBuilder(');
    final setUtilities = setDetail.indexOf(
      'SliverChildListDelegate(supplementaryChildren)',
      setGrid,
    );
    expect(setGrid, greaterThanOrEqualTo(0));
    expect(setUtilities, greaterThan(setGrid));
  });
}
