import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('search result action sheet scrolls instead of overflowing', () {
    final source = File('lib/main.dart').readAsStringSync();
    final start = source.indexOf('class _SearchResultActionSheet');
    final end = source.indexOf('class _ActionSheetSecondaryButton', start);

    expect(start, greaterThanOrEqualTo(0));
    expect(end, greaterThan(start));

    final actionSheet = source.substring(start, end);
    expect(actionSheet, contains('child: SingleChildScrollView('));
    expect(actionSheet, contains("'Choose the exact printing'"));
    expect(actionSheet, contains("label: 'View card'"));
    expect(actionSheet, contains("label: 'Share'"));
    expect(actionSheet, contains("'Remove from Vault'"));
  });
}
