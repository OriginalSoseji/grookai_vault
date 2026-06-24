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

  test('grouped card copy rows expose exact-copy section controls', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('Future<void> _toggleCopySectionMembership'));
    expect(screen, contains('VaultCardService.loadCopySectionMemberships'));
    expect(screen, contains('VaultCardService.assignCopySectionMembership'));
    expect(screen, contains('VaultCardService.removeCopySectionMembership'));
    expect(screen, contains('onToggleSection'));
    expect(screen, contains('FilterChip'));
    expect(screen, contains('Copy added to section.'));
    expect(screen, contains('Copy removed from section.'));
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

  test('copy-row section writes are exact-copy scoped', () {
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final assignStart = service.indexOf(
      'static Future<void> assignCopySectionMembership',
    );
    final removeStart = service.indexOf(
      'static Future<void> removeCopySectionMembership',
    );
    final boundary = service.indexOf(
      'static Future<String?> saveSharedCardWallCategory',
    );
    expect(assignStart, greaterThanOrEqualTo(0));
    expect(removeStart, greaterThan(assignStart));
    expect(boundary, greaterThan(removeStart));
    final sectionSource = service.substring(assignStart, boundary);

    expect(sectionSource, contains("from('wall_section_memberships')"));
    expect(
      sectionSource,
      contains("'vault_item_instance_id': normalizedInstanceId"),
    );
    expect(
      sectionSource,
      contains(".eq('vault_item_instance_id', normalizedInstanceId)"),
    );
    expect(
      sectionSource,
      contains('Grouped card row section assignment is exact-copy only'),
    );
    expect(
      sectionSource,
      contains('Grouped card row section removal is exact-copy only'),
    );
    expect(sectionSource, isNot(contains("from('vault_items')")));
    expect(sectionSource, isNot(contains("from('shared_cards')")));
    expect(sectionSource, isNot(contains('legacy_vault_item_id')));
    expect(service, contains('static Future<void> _assertOwnedSectionTarget'));
    expect(service, contains("from('vault_item_instances')"));
    expect(service, contains("from('wall_sections')"));
    expect(service, contains(".eq('id', instanceId)"));
    expect(service, contains(".eq('user_id', userId)"));
    expect(service, contains(".filter('archived_at', 'is', null)"));
  });
}
