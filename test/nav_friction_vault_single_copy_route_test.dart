import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('single-copy vault rows route to unified ownership screen', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final method = RegExp(
      r'Future<void> _openManageCardRow[\s\S]*?\n  bool _canOpenVaultRow',
    ).firstMatch(vault)!.group(0)!;

    expect(
      method,
      contains(
        "if ((vaultItemId.isEmpty || cardPrintId.isEmpty) && gvviId.isEmpty)",
      ),
    );
    expect(method, contains("if (vaultItemId.isEmpty || cardPrintId.isEmpty)"));
    expect(method, contains("final ownedCount = _ownedCountForRow(row);"));
    expect(
      method,
      contains("final gvviId = (row['gv_vi_id'] ?? '').toString().trim();"),
    );
    expect(method, contains('if (ownedCount == 1 && gvviId.isNotEmpty)'));
    expect(method, contains('VaultManageCardScreen(gvviId: gvviId)'));
    expect(method, contains('await reload();'));
    expect(method, contains('return;'));
    expect(method, contains('VaultManageCardScreen('));
    expect(method, contains('ownedCount: ownedCount'));
    expect(method, contains('gvviId: gvviId'));
  });

  test('vault row surfaces share the centralized routing function', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();

    expect(vault, contains('bool _canOpenVaultRow'));
    expect(
      vault,
      contains('return cardPrintId.isNotEmpty || gvviId.isNotEmpty;'),
    );
    expect(vault, contains('Widget _buildVaultTile'));
    expect(vault, contains('Widget _buildVaultGridTile'));
    expect(vault, contains('Widget _buildRecentVaultStrip'));
    expect(vault, contains('final canOpen = _canOpenVaultRow(row);'));
    expect(vault, contains('() => _openManageCardRow(row)'));
  });

  test('unified ownership screen handles gvvi-only and single-copy overview', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('this.vaultItemId = \'\','));
    expect(screen, contains('Future<_ManageCardBootstrapContext>'));
    expect(screen, contains('VaultGvviService.loadPrivate'));
    expect(
      screen,
      contains('final showCopiesTab = data != null && data.copies.length > 1;'),
    );
    expect(screen, contains('if (showCopiesTab) ...['));
    expect(
      screen,
      contains(
        "_buildTabListView(\n                                  storageKey: 'overview-single'",
      ),
    );
    expect(screen, contains('_buildSingleCopyControls'));
    expect(screen, isNot(contains("AppBar(title: const Text('Manage Card'))")));
  });
}
