import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/discounted_sale.dart';

void main() {
  final rows =
      jsonDecode(
            File('test/fixtures/discounted_sale_v1.json').readAsStringSync(),
          )
          as List;
  for (final row in rows) {
    test('discounted sale: ${row['name']}', () {
      final before = jsonEncode(row);
      Map<String, dynamic> run() => row['kind'] == 'request'
          ? validateDiscountedSaleRequest(row['value'])
          : row['kind'] == 'receipt'
          ? validateDiscountedSaleReceipt(row['value'])
          : confirmedDiscountedSale(row['value'], row['pending']);
      if (row['valid'] == true) {
        final result = run();
        expect(() => result['extra'] = 1, throwsUnsupportedError);
      } else {
        expect(run, throwsA(anything));
      }
      expect(jsonEncode(row), before);
    });
  }
  test(
    'customer view and receipt text retain discount but hide private data',
    () {
      final receipt = rows.firstWhere(
        (r) => r['kind'] == 'receipt' && r['valid'] == true,
      )['value'];
      final view = discountedSaleCustomerView(receipt),
          text = discountedSaleReceiptText(
            receipt,
            (n) => (n / 100).toStringAsFixed(2),
          );
      expect(view['discountMinor'], 20);
      expect(text, contains('Discount: 0.20'));
      expect(text, contains('TOTAL: 1.85'));
      for (final secret in [
        'PRIVATE_NOTE',
        'PRIVATE_WANTS',
        'PRIVATE_CUSTOMER_NOTE',
        'private@example.invalid',
        'b2000000-0000-4000-8000-000000000001',
        receipt['sourceDispositionId'],
      ]) {
        expect(jsonEncode(view), isNot(contains(secret)));
        expect(text, isNot(contains(secret)));
      }
      expect(view.containsKey('customerName'), false);
      expect(view.containsKey('id'), false);
    },
  );
}
