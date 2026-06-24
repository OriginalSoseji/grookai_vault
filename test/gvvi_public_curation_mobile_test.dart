import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mobile GVVI screen exposes exact-copy public visibility controls', () {
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
}
