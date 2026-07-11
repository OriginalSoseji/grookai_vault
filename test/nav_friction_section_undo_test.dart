import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('exact copy section removal exposes undo restore on GVVI page', () {
    final source = File(
      'lib/screens/vault/vault_gvvi_screen.dart',
    ).readAsStringSync();

    expect(source, contains('void _showSectionRemovalUndo'));
    expect(source, contains('Future<void> _restoreSectionMembership'));
    expect(source, contains('duration: const Duration(seconds: 5)'));
    expect(source, contains("label: 'Undo'"));
    expect(source, contains('VaultGvviService.removeSectionMembership'));
    expect(source, contains('VaultGvviService.assignSectionMembership'));
    expect(source, contains("Removed from \${section.name}."));
    expect(source, contains("'Restored to section.'"));
  });

  test('manage card copy section removal exposes undo restore', () {
    final source = File(
      'lib/screens/vault/vault_manage_card_screen.dart',
    ).readAsStringSync();

    expect(source, contains('void _showCopySectionRemovalUndo'));
    expect(source, contains('Future<void> _restoreCopySectionMembership'));
    expect(source, contains('void _showBulkSectionRemovalUndo'));
    expect(source, contains('Future<void> _restoreBulkSectionMembership'));
    expect(source, contains('duration: const Duration(seconds: 5)'));
    expect(source, contains("label: 'Undo'"));
    expect(source, contains('VaultCardService.removeCopySectionMembership'));
    expect(source, contains('VaultCardService.assignCopySectionMembership'));
    expect(source, contains('VaultCardService.bulkCopySectionMembership'));
    expect(source, contains('add: true'));
    expect(source, contains("'Copy restored to section.'"));
  });
}
