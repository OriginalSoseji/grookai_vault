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

  test('grouped card overview routes public management to exact copies', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();

    expect(screen, contains('void _openCopiesTab'));
    expect(
      screen,
      contains('_tabController.animateTo(_ManageCardTab.copies.index)'),
    );
    expect(screen, contains('Select private copies'));
    expect(screen, contains('Open copy controls'));
    expect(screen, contains('selectedCopyIds: hasPrivateCopies'));
    expect(screen, isNot(contains('Future<void> _saveIntent')));
    expect(screen, isNot(contains('VaultCardService.saveVaultItemIntent')));
    expect(
      service,
      isNot(contains('static Future<String> saveVaultItemIntent')),
    );
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

  test('grouped card copy rows expose exact-copy bulk controls', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('class _CopyBulkActionSurface'));
    expect(screen, contains('_selectedCopyIds'));
    expect(screen, contains('Future<void> _saveSelectedCopyIntent'));
    expect(screen, contains('Future<void> _bulkCopySectionMembership'));
    expect(screen, contains('Future<void> _removeSelectedCopies'));
    expect(
      screen,
      contains('VaultCardService.saveVaultItemInstancesIntentBulk'),
    );
    expect(screen, contains('VaultCardService.bulkCopySectionMembership'));
    expect(screen, contains('VaultGvviService.archiveExactCopy'));
    expect(screen, contains('Bulk actions'));
    expect(screen, contains('Add to section'));
    expect(screen, contains('Remove from section'));
    expect(screen, contains('Remove selected copies'));
    expect(
      screen,
      contains(
        'Mobile bulk copy management writes only exact-copy instance IDs',
      ),
    );
  });

  test('manage card copy loader falls back to active exact-copy rows', () {
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();

    expect(service, contains('_loadManageCardCopiesFromInstances'));
    expect(service, contains('required int fallbackOwnedCount'));
    expect(service, contains('copies.length >= fallbackOwnedCount'));
    expect(service, contains("from('vault_item_instances')"));
    expect(service, contains(".eq('card_print_id', normalizedCardPrintId)"));
    expect(service, contains(".filter('archived_at', 'is', null)"));
    expect(
      service,
      contains('Do not require legacy vault_items anchors for editing.'),
    );
    expect(service, contains('stale grouped anchors must not make the'));
    expect(service, contains('mobile Copies tab look empty'));
  });

  test('copy rows expose copy ID and removal controls', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screen, contains("'Copy ID'"));
    expect(screen, contains("gvviId.isEmpty ? 'Copy ID unavailable' : gvviId"));
    expect(screen, contains("label: const Text('Edit copy')"));
    expect(screen, contains("label: const Text('Remove')"));
    expect(screen, contains('Future<void> _removeExactCopy'));
    expect(screen, contains('onRemoveCopy'));
    expect(screen, contains('VaultGvviService.archiveExactCopy'));
    expect(screen, contains('Other copies of this card stay in your vault.'));
  });

  test('grouped card copy rows expose exact-copy public preview controls', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('class _CopyPublicPreviewSurface'));
    expect(screen, contains('canPreviewPublic'));
    expect(screen, contains('Public Preview'));
    expect(screen, contains('View Wall'));
    expect(screen, contains('View public copy'));
    expect(screen, contains('Share copy'));
    expect(screen, contains('Copy link'));
    expect(screen, contains('PublicGvviScreen(gvviId: gvviId)'));
    expect(screen, contains('PublicCollectorScreen('));
    expect(screen, contains('initialSectionId: section.id'));
    expect(screen, contains('SharePlus.instance.share'));
    expect(screen, contains('GrookaiWebRouteService.buildUri'));
    expect(
      screen,
      contains(
        'Grouped row public preview links are exact-copy read links only',
      ),
    );
  });

  test('copy-row intent writes are exact-copy scoped', () {
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final methodStart = service.indexOf(
      'static Future<String> saveVaultItemInstanceIntent',
    );
    final methodEnd = service.indexOf(
      'static Future<String> saveVaultItemInstancesIntentBulk',
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
      'static Future<void> _assertOwnedSectionTarget',
    );
    expect(assignStart, greaterThanOrEqualTo(0));
    expect(removeStart, greaterThan(assignStart));
    expect(boundary, greaterThan(removeStart));
    final sectionSource = service.substring(assignStart, boundary);

    expect(sectionSource, contains('vault_set_copy_section_memberships_v1'));
    expect(sectionSource, contains("'p_instance_ids': [normalizedInstanceId]"));
    expect(sectionSource, contains("'p_section_id': normalizedSectionId"));
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

  test('bulk copy writes are exact-copy scoped', () {
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final intentStart = service.indexOf(
      'static Future<String> saveVaultItemInstancesIntentBulk',
    );
    final sectionStart = service.indexOf(
      'static Future<void> bulkCopySectionMembership',
    );
    final boundary = service.indexOf(
      'static Future<void> _assertOwnedSectionTarget',
    );
    expect(intentStart, greaterThanOrEqualTo(0));
    expect(sectionStart, greaterThan(intentStart));
    expect(boundary, greaterThan(sectionStart));

    final bulkSource = service.substring(intentStart, boundary);
    expect(bulkSource, contains("from('vault_item_instances')"));
    expect(bulkSource, contains(".update({'intent': nextIntent})"));
    expect(bulkSource, contains(".inFilter('id', normalizedInstanceIds)"));
    expect(bulkSource, contains("from('wall_sections')"));
    expect(bulkSource, contains('vault_set_copy_section_memberships_v1'));
    expect(bulkSource, contains("'p_instance_ids': normalizedInstanceIds"));
    expect(
      bulkSource,
      contains('Bulk copy intent authority is exact-copy level'),
    );
    expect(
      bulkSource,
      contains('Bulk grouped-card section assignment is exact-copy only'),
    );
    expect(
      bulkSource,
      contains('Bulk grouped-card section removal is exact-copy only'),
    );
    expect(bulkSource, isNot(contains("from('vault_items')")));
    expect(bulkSource, isNot(contains("from('shared_cards')")));
    expect(bulkSource, isNot(contains('legacy_vault_item_id')));
  });

  test('mobile grouped shared-card mutation helpers stay removed', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();

    expect(screen, isNot(contains('_buildWallSettings')));
    expect(screen, isNot(contains('_publicNoteController')));
    expect(screen, isNot(contains('_manualPriceController')));
    expect(screen, isNot(contains('_saveWallCategory')));
    expect(screen, isNot(contains('_savePublicNote')));
    expect(screen, isNot(contains('_savePriceDisplay')));
    expect(screen, isNot(contains('FilteringTextInputFormatter')));
    expect(service, isNot(contains('saveSharedCardWallCategory')));
    expect(service, isNot(contains('saveSharedCardPublicNote')));
    expect(service, isNot(contains('saveSharedCardPriceDisplay')));
  });
}
