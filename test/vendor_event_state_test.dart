import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/vendor_events.dart';

void main() {
  final fixture =
      jsonDecode(
            File('test/fixtures/vendor_event_state_v1.json').readAsStringSync(),
          )
          as Map;
  for (final row in fixture['cases'] as List) {
    final c = row as Map;
    test('event read: ${c['name']}', () {
      Map<String, dynamic> action() => validateEventState(
        c['value'],
        c['ownerId'] as String,
        c['selectedId'] as String?,
      );
      if (c['valid'] == true) {
        final result = action();
        expect(result, c['value']);
        expect(identical(result, c['value']), false);
      } else {
        expect(action, throwsA(isA<FormatException>()));
      }
    });
  }
}
