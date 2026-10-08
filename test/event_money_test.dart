import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/vendor_events.dart';

void main() {
  final cases =
      jsonDecode(File('test/fixtures/event_money_v1.json').readAsStringSync())
          as Map;
  test(
    'event money editor accepts exact cents and refuses ambiguous formats',
    () {
      for (final c in cases['inputs'] as List) {
        expect(eventMoneyInput(c[0] as String), c[1], reason: c[0] as String);
      }
    },
  );
  test('event money editor restores exact saved expenses', () {
    for (final c in cases['outputs'] as List) {
      expect(eventMoneyText(c[0] as String), c[1]);
      expect(eventMoneyInput(c[1] as String), c[0]);
    }
    for (final c in cases['invalidOutputs'] as List) {
      expect(() => eventMoneyText(c as String), throwsA(anything));
    }
  });
}
