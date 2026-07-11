import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('manual vault catalog add is one tap with +1 more snackbar', () {
    final source = File('lib/main_vault.dart').readAsStringSync();

    expect(source, contains("label: '+1 more'"));
    expect(source, contains('deltaQty: 1'));
    expect(source, isNot(contains("TextEditingController(text: '1')")));
    expect(source, isNot(contains("title: const Text('Add to Vault')")));
    expect(
      source,
      isNot(
        contains("decoration: const InputDecoration(labelText: 'Quantity')"),
      ),
    );
  });
}
