import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('single-copy vault rows route directly to exact copy screen', () {
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
    expect(method, contains('VaultGvviScreen(gvviId: gvviId)'));
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
}
