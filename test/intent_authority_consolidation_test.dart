import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Flutter grouped intent control is removed from active management', () {
    final serviceSource = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final screenSource = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screenSource, contains('Select private copies'));
    expect(screenSource, contains('Open copy controls'));
    expect(
      screenSource,
      contains('VaultCardService.saveVaultItemInstanceIntent'),
    );
    expect(
      screenSource,
      contains('VaultCardService.saveVaultItemInstancesIntentBulk'),
    );
    expect(screenSource, isNot(contains('Future<void> _saveIntent')));
    expect(
      screenSource,
      isNot(contains('VaultCardService.saveVaultItemIntent')),
    );
    expect(serviceSource, contains(".from('vault_item_instances')"));
    expect(
      serviceSource,
      isNot(contains('static Future<String> saveVaultItemIntent')),
    );
    expect(serviceSource, isNot(contains('Do not write grouped intent')));
    expect(serviceSource, isNot(contains('storedIntent')));
  });

  test('web grouped intent action is fail-closed compatibility only', () {
    final source = File(
      'apps/web/src/lib/network/saveVaultItemIntentAction.ts',
    ).readAsStringSync();

    expect(source, contains('Grouped vault intent is legacy'));
    expect(source, contains('Intent authority is vault_item_instances.intent'));
    expect(source, isNot(contains('.from("vault_items")')));
    expect(source, isNot(contains('.update({')));
  });

  test('web exact-copy action writes instance intent', () {
    final source = File(
      'apps/web/src/lib/network/saveVaultItemInstanceIntentAction.ts',
    ).readAsStringSync();

    expect(source, contains('.from("vault_item_instances")'));
    expect(source, contains('.update({'));
    expect(source, contains('intent: nextIntent'));
    expect(source, isNot(contains('.from("vault_items")')));
  });

  test('public network read models use instance intent', () {
    final streamView = File(
      'supabase/migrations/20260324173000_fix_card_stream_slab_identity_resolution_v1.sql',
    ).readAsStringSync();
    final contactView = File(
      'supabase/migrations/20260324174000_add_card_contact_targets_view_v1.sql',
    ).readAsStringSync();

    expect(streamView, contains('vii.intent'));
    expect(streamView, contains("vii.intent in ('trade', 'sell', 'showcase')"));
    expect(contactView, contains('vii.intent'));
    expect(
      contactView,
      contains("vii.intent in ('trade', 'sell', 'showcase')"),
    );
  });
}
