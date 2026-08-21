import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('vault grid exposes long-press lot multi-select and pricing route', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final main = File('lib/main.dart').readAsStringSync();

    expect(vault, contains('_selectedLotCardPrintIds'));
    expect(
      vault,
      contains(
        'onLongPress: selectionMode\n'
        '          ? () => _toggleLotSelection(row)\n'
        '          : () => _showVaultRowQuickActions(row)',
      ),
    );
    expect(vault, contains('Future<void> _showVaultRowQuickActions'));
    expect(vault, contains('_VaultLotSelectionBar'));
    expect(vault, contains('List \$selectedCount as Lot'));
    expect(vault, contains('LotPricingScreen'));
    expect(main, contains("screens/grookai_objects/lot_pricing_screen.dart"));
  });

  test(
    'lot entry points seed market price from the governed visible value',
    () {
      final vault = File('lib/main_vault.dart').readAsStringSync();
      final objectsHub = File(
        'lib/screens/grookai_objects/grookai_objects_hub_screen.dart',
      ).readAsStringSync();
      const governedPriceRead =
          '_pricingByCardPrintId[cardPrintId]?.visibleValue';

      expect(vault, contains(governedPriceRead));
      expect(objectsHub, contains(governedPriceRead));
      expect(
        vault,
        isNot(contains('_pricingByCardPrintId[cardPrintId]?.primaryPrice')),
      );
      expect(
        objectsHub,
        isNot(contains('_pricingByCardPrintId[cardPrintId]?.primaryPrice')),
      );
    },
  );
}
