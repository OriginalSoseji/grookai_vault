import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/discounted_sale.dart';

void main() {
  final rows =
      jsonDecode(
            File(
              'test/fixtures/discount_cancellation_v1.json',
            ).readAsStringSync(),
          )
          as List;
  for (final row in rows) {
    test('discount cancellation: ${row['name']}', () {
      final before = jsonEncode(row);
      Map<String, dynamic> run() =>
          confirmedDiscountedSaleCancellation(row['value'], row['pending']);
      if (row['valid'] == true) {
        final result = run();
        expect(result['status'], 'cancelled');
        expect(() => result['extra'] = 1, throwsUnsupportedError);
        expect(
          () =>
              result['request']['cart']['items'][0]['description'] = 'changed',
          throwsUnsupportedError,
        );
      } else {
        expect(run, throwsA(anything));
      }
      expect(jsonEncode(row), before);
    });
  }
}
