import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/vendor_events.dart';

void main() {
  final fixtures =
      jsonDecode(File('test/fixtures/vendor_events_v1.json').readAsStringSync())
          as Map;
  for (final c in fixtures['requestCases'] as List) {
    test('event request: ${c['name']}', () {
      if (c['valid'] != true) {
        expect(() => validateEventRequest(c['request']), throwsA(anything));
        return;
      }
      final r = validateEventRequest(c['request']);
      expect(r, c['request']);
      expect(identical(r, c['request']), isFalse);
      expect(identical(r['operation'], c['request']['operation']), isFalse);
      expect(eventRequestParams(r), {'p_request': r});
    });
  }
  for (final c in fixtures['ackCases'] as List) {
    test('event acknowledgement: ${c['name']}', () {
      if (c['valid'] == true) {
        expect(
          confirmedEventRequest(
            c['request'],
            c['result'],
            c['ownerId'] as String,
          ),
          c['result'],
        );
      } else {
        expect(
          () => confirmedEventRequest(
            c['request'],
            c['result'],
            c['ownerId'] as String,
          ),
          throwsA(anything),
        );
      }
    });
  }
  test('event text refuses unpaired Unicode before JSON dispatch', () {
    for (final code in [0xd800, 0xdc00]) {
      final r =
          jsonDecode(jsonEncode(fixtures['requestCases'][0]['request'])) as Map;
      r['operation']['name'] = String.fromCharCode(code);
      expect(() => validateEventRequest(r), throwsA(anything));
    }
  });
  test('acknowledgement ignores object-key order', () {
    final c = jsonDecode(jsonEncode(fixtures['ackCases'][0])) as Map;
    final operation = c['result']['operation'] as Map;
    c['result']['operation'] = Map.fromEntries(
      operation.entries.toList().reversed,
    );
    expect(
      confirmedEventRequest(c['request'], c['result'], c['ownerId'] as String),
      c['result'],
    );
  });
}
