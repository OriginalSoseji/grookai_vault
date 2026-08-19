import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('vault exposes explicit multi-select, lot pricing, and removal', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final main = File('lib/main.dart').readAsStringSync();

    expect(vault, contains('_selectedCardPrintIds'));
    expect(vault, contains("label: Text(_selectionMode ? 'Done' : 'Select')"));
    expect(
      vault,
      contains(
        'onLongPress: _selectionMode\n'
        '          ? () => _toggleSelection(row)\n'
        '          : () => _showVaultRowQuickActions(row)',
      ),
    );
    expect(vault, contains('Future<void> _showVaultRowQuickActions'));
    expect(vault, contains('_VaultSelectionBar'));
    expect(vault, contains("tooltip: 'List selected as a lot'"));
    expect(vault, contains("tooltip: 'Remove selected'"));
    expect(vault, contains('VaultCardService.archiveSelectedVaultCards'));
    expect(vault, contains('LotPricingScreen'));
    expect(main, contains("screens/grookai_objects/lot_pricing_screen.dart"));
  });
}
