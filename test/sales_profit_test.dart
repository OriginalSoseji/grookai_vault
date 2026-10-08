import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_profit.dart';

void main() {
  final fixture =
      jsonDecode(
            File('test/fixtures/sales_profit_web_v1.json').readAsStringSync(),
          )
          as Map;
  for (final example in fixture['cases'] as List) {
    test('web/native profit parity: ${example['name']}', () {
      final receipts = example['receipts'] as List;
      final snapshots = example['snapshots'] as List;
      if (example['error'] == true) {
        expect(() => salesProfit(receipts, snapshots), throwsFormatException);
      } else {
        expect(salesProfit(receipts, snapshots), example['expected']);
      }
    });
  }
  test('money formatting is exact above the floating-point range', () {
    for (final example in fixture['money'] as List) {
      expect(profitMoney(example['minor'] as String), example['formatted']);
    }
    for (final invalid in ['1.1', 'NaN', 'Infinity', '', '+1']) {
      expect(() => profitMoney(invalid), throwsFormatException);
    }
  });
  test(
    'known profit and missing historical evidence have distinct outcomes',
    () {
      final first = (fixture['cases'] as List).first as Map;
      final receipts = first['receipts'] as List,
          snapshots = first['snapshots'] as List;
      final known = salesProfit(receipts, snapshots);
      expect(known['knownProfitMinor'], '800');
      expect(known['knownCostMinor'], '1200');
      expect(known['knownSalesMinor'], '2000');
      expect(known['coverageBps'], 10000);
      final missing = salesProfit(receipts, []);
      expect(missing['knownProfitMinor'], isNull);
      expect(missing['unknownSalesMinor'], '2000');
    },
  );
  test(
    'inputs remain unchanged and returned summaries cannot alter later calculations',
    () {
      final first = (fixture['cases'] as List).first as Map;
      final receipts = first['receipts'] as List,
          snapshots = first['snapshots'] as List;
      final before = jsonEncode([receipts, snapshots]);
      final result = salesProfit(receipts, snapshots);
      (result['details'] as List).clear();
      expect(jsonEncode([receipts, snapshots]), before);
      expect((salesProfit(receipts, snapshots)['details'] as List).length, 1);
    },
  );
  test(
    'non-finite and fractional recorded prices reject instead of rounding',
    () {
      for (final invalid in [double.nan, double.infinity, 0.1, -1]) {
        final first =
            jsonDecode(jsonEncode((fixture['cases'] as List).first)) as Map;
        first['receipts'][0]['items'][0]['unitMinor'] = invalid;
        expect(
          () => salesProfit(
            first['receipts'] as List,
            first['snapshots'] as List,
          ),
          throwsFormatException,
        );
      }
    },
  );
}
