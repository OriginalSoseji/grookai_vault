import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('vault delete archives immediately with optimistic UI removal', () {
    final source = File('lib/main_vault.dart').readAsStringSync();

    expect(source, contains('Future<bool> _delete'));
    expect(
      source,
      contains('List<Map<String, dynamic>> _removeVaultRowOptimistically'),
    );
    expect(
      source,
      contains('final previousItems = _removeVaultRowOptimistically(row);'),
    );
    expect(source, contains('VaultCardService.archiveAllVaultItems'));
    expect(
      source,
      contains('_restoreVaultRowsAfterFailedDelete(previousItems);'),
    );
    expect(source, isNot(contains('Future<void> _deleteWithUndo')));
    expect(source, isNot(contains('_restoreDeletedVaultRow')));
    expect(source, isNot(contains('_isLowRiskVaultDelete')));
    expect(source, contains("title: const Text('Delete item?')"));
  });

  test('memory archive defers server archive during undo window', () {
    final screen = File(
      'lib/screens/vault/vault_gvvi_screen.dart',
    ).readAsStringSync();
    final service = File(
      'lib/services/vault/collector_memory_service.dart',
    ).readAsStringSync();

    expect(screen, contains('_pendingMemoryArchiveTimers'));
    expect(screen, contains('Timer('));
    expect(screen, contains('Future<void> _commitPendingMemoryArchive'));
    expect(screen, contains("label: 'Undo'"));
    expect(screen, isNot(contains("title: const Text('Archive memory?')")));
    expect(
      screen,
      contains("title: Text(data.isGraded ? 'Remove slab?' : 'Remove copy?')"),
    );
    expect(service, contains('collector_memory_archive_v1'));
    expect(service, isNot(contains('collector_memory_unarchive_v1')));
    expect(service, isNot(contains(".from('collector_memories'")));
  });
}
