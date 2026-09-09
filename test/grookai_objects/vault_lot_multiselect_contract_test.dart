import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('sealed Wall does not claim card-only counts or emptiness', () {
    final wall = File(
      'lib/screens/public_collector/public_collector_screen.dart',
    ).readAsStringSync();
    final panel = File(
      'lib/widgets/vault/owned_sealed_panel.dart',
    ).readAsStringSync();
    expect(wall, contains('wallCount: includesSealed ? null :'));
    expect(wall, contains('_activeCards.isNotEmpty || !includesSealed'));
    expect(wall, contains('onInventoryChanged: widget.onWallChanged'));
    expect(panel, contains('removed > 0'));
    expect(panel, contains('await widget.onInventoryChanged?.call()'));
  });
  test(
    'sealed selection identifies the exact owned copy for accessibility',
    () {
      final panel = File(
        'lib/widgets/vault/owned_sealed_panel.dart',
      ).readAsStringSync();
      expect(panel, contains('semanticLabel:'));
      expect(
        panel,
        contains("'Select \${row.identity} \${row.text('gv_vi_id')}'"),
      );
    },
  );
  test(
    'mixed selection does not present card-only counts as all inventory',
    () {
      final vault = File('lib/main_vault.dart').readAsStringSync();
      expect(vault, contains("'\$selectedCount selected'"));
      expect(vault, isNot(contains('\$visibleCount shown')));
      expect(
        vault,
        contains("allVisibleSelected ? 'Clear all' : 'Select cards'"),
      );
      expect(
        vault,
        contains('busy || (!allVisibleSelected && visibleCount == 0)'),
      );
    },
  );

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
