import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mobile owner copy screen exposes public visibility controls', () {
    final screen = File(
      'lib/screens/vault/vault_gvvi_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('class _VaultIntentQuickSurface'));
    expect(screen, contains('Make this copy public'));
    expect(screen, contains('Public on your Wall'));
    expect(screen, contains("value: 'hold', label: 'Private'"));
    expect(screen, contains("value: 'showcase', label: 'Showcase'"));
    expect(screen, contains("value: 'trade', label: 'Trade'"));
    expect(screen, contains("value: 'sell', label: 'Sell'"));
    expect(screen, contains('VaultGvviService.saveIntent'));
    expect(screen, isNot(contains('VaultCardService.saveVaultItemIntent')));
  });

  test('mobile owner copy screen exposes public preview links', () {
    final screen = File(
      'lib/screens/vault/vault_gvvi_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('class _VaultPublicPreviewSurface'));
    expect(screen, contains('Public Preview'));
    expect(screen, contains('View Wall'));
    expect(screen, contains('View public copy'));
    expect(screen, contains('Share copy'));
    expect(screen, contains('Copy link'));
    expect(screen, contains('assignedSections'));
    expect(screen, contains('PublicCollectorScreen('));
    expect(screen, contains('initialSectionId: section.id'));
    expect(screen, contains('SharePlus.instance.share'));
    expect(screen, contains('GrookaiWebRouteService.buildUri'));
    expect(
      screen,
      contains(
        'Mobile owner preview links are derived from exact-copy public read',
      ),
    );
  });

  test('mobile GVVI intent write is exact-copy scoped', () {
    final service = File(
      'lib/services/vault/vault_gvvi_service.dart',
    ).readAsStringSync();

    expect(service, contains('static Future<String> saveIntent'));
    expect(service, contains("from('vault_item_instances')"));
    expect(service, contains(".update({'intent': nextIntent})"));
    expect(service, contains(".eq('id', normalizedInstanceId)"));
    expect(service, contains(".eq('user_id', userId)"));
    expect(service, contains(".filter('archived_at', 'is', null)"));
    expect(service, contains('Intent authority is exact-copy level'));
    expect(
      service,
      isNot(contains(".from('vault_items')\n        .update({'intent'")),
    );
  });

  test('mobile owner copy screen can create a Wall section for this copy', () {
    final screen = File(
      'lib/screens/vault/vault_gvvi_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('Future<void> _createAndAssignSection()'));
    expect(screen, contains('Create section'));
    expect(screen, contains('Section name'));
    expect(screen, contains('VaultGvviService.createSection'));
    expect(screen, contains('VaultGvviService.assignSectionMembership'));
    expect(screen, contains('Section created and copy added.'));
    expect(screen, contains('creatingSection'));
    expect(
      screen,
      isNot(contains('PublicCollectorService.createOwnerWallSection')),
    );
  });

  test('mobile GVVI section creation writes owner sections only', () {
    final service = File(
      'lib/services/vault/vault_gvvi_service.dart',
    ).readAsStringSync();

    expect(
      service,
      contains('static Future<VaultGvviSectionMembership> createSection'),
    );
    expect(service, contains("from('wall_sections')"));
    expect(service, contains(".insert({"));
    expect(service, contains("'user_id': userId"));
    expect(service, contains("'is_active': true"));
    expect(service, contains("'is_public': true"));
    expect(service, contains('Section name is required.'));
    expect(service, contains('Wall is managed automatically.'));
    expect(service, contains('You already have a section with that name.'));
    expect(service, isNot(contains(".from('shared_cards').insert")));
    expect(service, isNot(contains(".from('vault_items').insert")));
  });
}
