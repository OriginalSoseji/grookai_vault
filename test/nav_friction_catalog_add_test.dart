import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'manual vault catalog add enters exact-copy review and retains add-more navigation',
    () {
      final source = File('lib/main_vault.dart').readAsStringSync();

      expect(source, contains("label: '+1 more'"));
      expect(source, contains('await showVaultAddReview('));
      expect(source, contains('printingId: cardPrintingId'));
      expect(source, contains('if (saved == null) return false;'));
      expect(source, isNot(contains("TextEditingController(text: '1')")));
      expect(source, isNot(contains("title: const Text('Add to Vault')")));
      expect(
        source,
        isNot(
          contains("decoration: const InputDecoration(labelText: 'Quantity')"),
        ),
      );
    },
  );
}
