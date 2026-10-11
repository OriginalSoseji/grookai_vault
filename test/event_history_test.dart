import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/vendor_events.dart';

void main() {
  final fixture =
      jsonDecode(File('test/fixtures/event_history_v1.json').readAsStringSync())
          as Map;
  for (final row in fixture['cases'] as List) {
    final c = row as Map;
    test('event history: ${c['name']}', () {
      Map<String, dynamic> action() => validateEventHistory(
        c['value'],
        c['ownerId'] as String,
        c['eventId'] as String,
        beforeRevision: c['beforeRevision'] as String?,
        limit: c['limit'] as int,
      );
      if (c['valid'] == true) {
        expect(action(), c['expected']);
      } else {
        expect(action, throwsA(isA<FormatException>()));
      }
    });
  }
}
