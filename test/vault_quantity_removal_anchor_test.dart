import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('vault quantity removal can archive by card id without anchor', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();
    final manage = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();

    final incQty = RegExp(
      r'Future<void> _incQty[\s\S]*?\n  Future<bool> _delete',
    ).firstMatch(vault)!.group(0)!;
    final delete = RegExp(
      r'Future<bool> _delete[\s\S]*?\n  Future<void> _restoreDeletedVaultRow',
    ).firstMatch(vault)!.group(0)!;

    expect(
      incQty,
      contains("final cardId = (row['card_id'] ?? '').toString().trim();"),
    );
    expect(incQty, contains('if (_uid == null || cardId.isEmpty)'));
    expect(incQty, isNot(contains('vaultItemId.isEmpty || cardId.isEmpty')));
    expect(incQty, contains('VaultCardService.archiveOneVaultItem'));
    expect(
      incQty,
      contains(
        "_showVaultMutationError('Unable to update this card. Try again.')",
      ),
    );

    expect(
      delete,
      contains("final cardId = (row['card_id'] ?? '').toString().trim();"),
    );
    expect(delete, contains('if (_uid == null || cardId.isEmpty)'));
    expect(delete, isNot(contains('vaultItemId.isEmpty || cardId.isEmpty')));
    expect(delete, contains('VaultCardService.archiveAllVaultItems'));
    expect(delete, contains('return true;'));
    expect(delete, contains('return false;'));
    expect(
      delete,
      contains(
        "_showVaultMutationError('Unable to remove this card. Try again.')",
      ),
    );

    expect(service, contains("'p_vault_item_id': _trimmedOrNull(vaultItemId)"));
    expect(manage, contains('Future<void> _removeAllCopies'));
    expect(manage, contains("title: const Text('Remove all copies?')"));
    expect(manage, contains('VaultCardService.archiveAllVaultItems'));
    expect(manage, contains("data.totalCopies > 1 ? 'Remove all copies'"));
    expect(manage, contains('Navigator.of(context).pop(true);'));
  });
}
