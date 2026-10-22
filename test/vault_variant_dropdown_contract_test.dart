import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('owned raw copies expose a compact exact-variant dropdown', () {
    final screen = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(screen, contains('class _VariantDropdown extends StatelessWidget'));
    expect(screen, contains("tooltip: canOpen ? 'Change variant' : 'Variant'"));
    expect(screen, contains('options.isNotEmpty'));
    expect(screen, contains('Icons.keyboard_arrow_down_rounded'));
    expect(screen, contains('if (!copy.isGraded)'));
    expect(screen, contains('_saveCopyVariant(copy, variant)'));
    expect(screen, isNot(contains("label: 'Printing:")));
  });

  test('variant changes stay owner, copy, parent, and raw-card scoped', () {
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final methodStart = service.indexOf(
      'static Future<void> saveVaultItemInstanceVariant',
    );
    final methodEnd = service.indexOf(
      'static Future<String> saveVaultItemInstancesIntentBulk',
      methodStart,
    );
    expect(methodStart, greaterThanOrEqualTo(0));
    expect(methodEnd, greaterThan(methodStart));
    final method = service.substring(methodStart, methodEnd);

    expect(method, contains(".from('card_printings')"));
    expect(method, contains(".eq('card_print_id', normalizedCardPrintId)"));
    expect(method, contains(".eq('user_id', userId)"));
    expect(method, contains(".filter('slab_cert_id', 'is', null)"));
    expect(method, contains(".filter('archived_at', 'is', null)"));
    expect(method, contains("'card_printing_id': normalizedCardPrintingId"));
  });
}
