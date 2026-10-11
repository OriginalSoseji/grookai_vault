import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/event_journal.dart';

void main() {
  final fixture =
      jsonDecode(File('test/fixtures/event_journal_v1.json').readAsStringSync())
          as Map;
  for (final row in fixture['cases'] as List) {
    final c = row as Map;
    test('event journal: ${c['name']}', () {
      final before = jsonEncode(c);
      Map<String, dynamic> action() => changeEventJournal(
        c['current'],
        Map<String, dynamic>.from(c['change'] as Map),
      );
      if (c['valid'] == true) {
        expect(action(), c['expected']);
      } else {
        expect(action, throwsA(isA<FormatException>()));
      }
      expect(jsonEncode(c), before);
    });
  }
}
