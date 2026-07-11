import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'low-risk vault delete uses undo snackbar and keeps high-risk dialog',
    () {
      final source = File('lib/main_vault.dart').readAsStringSync();

      expect(source, contains('Future<void> _deleteWithUndo'));
      expect(source, contains("label: 'Undo'"));
      expect(source, contains('duration: const Duration(seconds: 5)'));
      expect(source, contains('manageData.slabCount == 0'));
      expect(source, contains('manageData.inPlayCount == 0'));
      expect(source, contains('!manageData.isShared'));
      expect(source, contains("title: const Text('Delete item?')"));
    },
  );

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
