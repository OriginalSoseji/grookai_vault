import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sale_discount.dart';

void main() {
  final rows =
      jsonDecode(File('test/fixtures/sale_discount_v1.json').readAsStringSync())
          as List;
  for (final row in rows) {
    test('discount: ${row['name']}', () {
      if (row['expected'] == null) {
        expect(
          () => saleDiscountAllocation(row['items'], row['discountMinor']),
          throwsFormatException,
        );
        return;
      }
      final result = saleDiscountAllocation(row['items'], row['discountMinor']);
      final lines = result['lines'] as List;
      expect(lines.map((l) => l['discountMinor']).toList(), row['expected']);
      expect(
        validateSaleDiscountAllocation(
          jsonDecode(jsonEncode(result)),
          row['items'],
          row['discountMinor'],
        ),
        result,
      );
      expect(
        lines.fold(
          BigInt.zero,
          (sum, l) => sum + BigInt.parse(l['netMinor'] as String),
        ),
        BigInt.parse(result['netSalesMinor'] as String),
      );
      expect(() => result['method'] = 'changed', throwsUnsupportedError);
    });
  }
  test('altered allocation and reordered ties cannot qualify history', () {
    final items = [
      {'quantity': 1, 'unitMinor': 100},
      {'quantity': 1, 'unitMinor': 100},
    ];
    final original = saleDiscountAllocation(items, 1);
    final changes = <void Function(dynamic)>[
      (v) => v['version'] = 2,
      (v) => v['method'] = 'other',
      (v) => v['extra'] = 1,
      (v) => v['lines'][0]['extra'] = 1,
      (v) => v['lines'] = (v['lines'] as List).reversed.toList(),
      (v) => v['subtotalMinor'] = '0200',
      (v) => v['lines'][0]['netMinor'] = 99,
      (v) {
        v['lines'][0]['discountMinor'] = '0';
        v['lines'][0]['netMinor'] = '100';
        v['lines'][1]['discountMinor'] = '1';
        v['lines'][1]['netMinor'] = '99';
      },
      (v) => (v['lines'] as List).removeLast(),
      (v) => v['discountMinor'] = '0',
    ];
    for (final change in changes) {
      final altered = jsonDecode(jsonEncode(original));
      change(altered);
      expect(
        () => validateSaleDiscountAllocation(altered, items, 1),
        throwsFormatException,
      );
    }
  });
}
