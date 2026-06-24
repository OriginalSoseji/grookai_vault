import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('grouped card copy rows expose exact-copy intent controls', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('Future<void> _saveCopyIntent'));
    expect(screen, contains('VaultCardService.saveVaultItemInstanceIntent'));
    expect(screen, contains('onIntentSelected'));
    expect(screen, contains('intentSaving'));
    expect(screen, contains('Copy intent saved.'));
    expect(screen, contains('kVaultIntentOptions'));
    expect(screen, contains('Public copies'));
    expect(screen, contains('data.inPlayCount > 0'));
  });

  test('copy-row intent writes are exact-copy scoped', () {
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final methodStart = service.indexOf(
      'static Future<String> saveVaultItemInstanceIntent',
    );
    final methodEnd = service.indexOf(
      'static Future<String?> saveSharedCardWallCategory',
    );
    expect(methodStart, greaterThanOrEqualTo(0));
    expect(methodEnd, greaterThan(methodStart));
    final methodSource = service.substring(methodStart, methodEnd);

    expect(methodSource, contains("from('vault_item_instances')"));
    expect(methodSource, contains(".update({'intent': nextIntent})"));
    expect(methodSource, contains(".eq('id', normalizedInstanceId)"));
    expect(methodSource, contains(".eq('user_id', userId)"));
    expect(methodSource, contains(".filter('archived_at', 'is', null)"));
    expect(methodSource, contains('Copy intent authority is exact-copy level'));
    expect(methodSource, contains('Do not write grouped vault_items'));
    expect(methodSource, isNot(contains("from('vault_items')")));
    expect(methodSource, isNot(contains("from('shared_cards')")));
    expect(methodSource, isNot(contains('legacy_vault_item_id')));
  });
}
