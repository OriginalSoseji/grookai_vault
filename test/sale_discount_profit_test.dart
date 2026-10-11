import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_profit.dart';

void main() {
  final rows =
      jsonDecode(
            File(
              'test/fixtures/sale_discount_profit_v1.json',
            ).readAsStringSync(),
          )
          as List;
  for (final row in rows) {
    test('discount profit: ${row['name']}', () {
      final before = jsonEncode(row),
          report = salesProfit([row['receipt']], [row['snapshot']]);
      for (final entry in (row['want'] as Map).entries) {
        expect(report[entry.key], entry.value, reason: entry.key as String);
      }
      expect(
        (report['reasons'] as List).map((r) => r['reason']).toList(),
        row['reasons'],
      );
      expect(
        (report['reasons'] as List).fold(
          BigInt.zero,
          (n, r) => n + BigInt.parse(r['salesMinor'] as String),
        ),
        BigInt.parse(report['unknownSalesMinor'] as String),
      );
      expect(jsonEncode(row), before);
    });
  }
  test('mixed original and discounted history remains deduplicated', () {
    final first = rows[0],
        second = jsonDecode(
          jsonEncode(
            rows.firstWhere(
              (r) => r['name'] == 'original version1 remains compatible',
            ),
          ),
        );
    second['receipt']['id'] = 'a1000000-0000-4000-8000-000000000002';
    second['snapshot']['receiptId'] = second['receipt']['id'];
    final result = salesProfit(
      [
        first['receipt'],
        second['receipt'],
        jsonDecode(jsonEncode(first['receipt'])),
      ],
      [first['snapshot'], second['snapshot']],
    );
    expect(result['receipts'], 2);
    expect(result['knownProfitMinor'], '7000');
    expect(result['itemSalesMinor'], '28500');
    expect(result['unknownSalesMinor'], '9500');
  });
}
