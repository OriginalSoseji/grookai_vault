import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_report.dart';

Map<String, dynamic> receipt(
  String id,
  String date, {
  String customer = 'Buyer',
  String method = 'Cash',
}) => {
  'id': id,
  'createdAt': date,
  'number': 'GV-$id',
  'customerName': customer,
  'method': method,
  'subtotalMinor': 3500,
  'discountMinor': 500,
  'taxMinor': 247,
  'totalMinor': 3247,
  'items': [
    {'description': 'Pikachu', 'quantity': 2},
    {'description': 'Charizard', 'quantity': 1},
  ],
};
void main() {
  test(
    'counts multi-copy receipts once; discounts, tax, boundaries and local hours stay separate',
    () {
      final sale = receipt('one', '2026-10-03T06:00:00Z');
      final report = SalesReport(
        [
          sale,
          sale,
          receipt('two', '2026-10-04T05:59:59Z'),
          receipt('before', '2026-10-03T05:59:59Z'),
          receipt('after', '2026-10-04T06:00:00Z'),
        ],
        start: DateTime.utc(2026, 10, 3, 6),
        end: DateTime.utc(2026, 10, 4, 6),
        localize: (date) => date.subtract(const Duration(hours: 6)),
      );
      expect(report.transactions, 2);
      expect(report.units, 6);
      expect(report.salesMinor, 6000);
      expect(report.totalMinor, 6494);
      expect(report.taxMinor, 494);
      expect(report.discountMinor, 1000);
      expect(report.averageMinor, 3000);
      expect(report.hourlySales[0], 3000);
      expect(report.hourlySales[23], 3000);
      expect(report.payments['Cash'], 6494);
      expect(report.rows.first['id'], 'two');
    },
  );
  test(
    'search and payment filter apply consistently to totals and export; text cannot create spreadsheet formulas',
    () {
      final report = SalesReport(
        [
          receipt('one', '2026-10-03T12:00:00Z', customer: '=HYPERLINK("bad")'),
          receipt('two', '2026-10-03T12:00:00Z', method: 'Other'),
        ],
        start: DateTime.utc(2026),
        end: DateTime.utc(2027),
        query: 'pika',
        method: 'Cash',
      );
      expect(report.transactions, 1);
      expect(report.csv(), contains("'=HYPERLINK"));
      expect(report.csv().split('\r\n'), hasLength(2));
      final empty = SalesReport([], start: DateTime(2026), end: DateTime(2027));
      expect(empty.averageMinor, 0);
      expect(empty.hourlySales.every((n) => n == 0), true);
    },
  );
  test(
    'both occurrences of a repeated daylight saving hour remain transactions',
    () {
      final report = SalesReport(
        [
          receipt('one', '2026-11-01T07:30:00Z'),
          receipt('two', '2026-11-01T08:30:00Z'),
        ],
        start: DateTime.utc(2026, 11, 1, 6),
        end: DateTime.utc(2026, 11, 2, 7),
        localize: (_) => DateTime(2026, 11, 1, 1, 30),
      );
      expect(report.hourlyTransactions[1], 2);
      expect(report.salesMinor, 6000);
    },
  );
}
