import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('set results remain viewport-lazy', () {
    final source = File(
      'lib/screens/sets/public_sets_screen.dart',
    ).readAsStringSync();

    expect(source, contains('CustomScrollView('));
    expect(source, contains('SliverGrid('));
    expect(source, isNot(contains('GridView.builder(')));
    expect(source, isNot(contains('shrinkWrap: true')));
  });
}
