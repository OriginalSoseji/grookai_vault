import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Grookai Objects code does not reintroduce old shareable naming', () {
    final blocked = [
      _join('Shareable', 'Card'),
      _join('shareable', '_cards'),
      _join('shareable', '_card'),
      _join('Shareable', 'Memory'),
      _join('Shareable', 'Sale'),
      _join('Shareable', 'Lot'),
      _join('shareable', '_memory'),
      _join('shareable', '_sale'),
    ];
    final violations = <String>[];

    for (final root in ['lib', 'test']) {
      for (final entity in Directory(root).listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) {
          continue;
        }
        if (entity.path.endsWith('grookai_object_naming_guard_test.dart')) {
          continue;
        }
        final source = entity.readAsStringSync();
        for (final token in blocked) {
          if (source.contains(token)) {
            violations.add('${entity.path}: $token');
          }
        }
      }
    }

    expect(violations, isEmpty);
  });
}

String _join(String left, String right) => '$left$right';
