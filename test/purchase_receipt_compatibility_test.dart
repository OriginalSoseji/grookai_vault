import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_payments.dart';
import 'package:grookai_vault/services/sales/sales_profit.dart';
import 'package:grookai_vault/services/sales/sales_report.dart';
import 'package:grookai_vault/services/sales/sales_trade.dart';

Map<String, dynamic> purchase() {
  final fixture = jsonDecode(
    File('test/fixtures/sales_purchase_web_v1.json').readAsStringSync(),
  );
  return Map<String, dynamic>.from(
    (fixture['cases'] as List).firstWhere(
          (row) => row['name'] == 'exact receipt',
        )['args'][0]
        as Map,
  );
}

Map<String, dynamic> sale() => {
  'id': '22222222-2222-4222-8222-222222222222',
  'number': 'GV-SAMPLE',
  'createdAt': '2026-10-07T12:00:00.000Z',
  'customerName': 'Sample buyer',
  'method': 'Cash',
  'subtotalMinor': 1000,
  'discountMinor': 0,
  'taxMinor': 0,
  'totalMinor': 1000,
  'items': [
    {'description': 'Sold card', 'quantity': 1, 'unitMinor': 1000},
  ],
};

SalesReport report(
  List<Map<String, dynamic>> rows, {
  String? method,
  String query = '',
}) => SalesReport(
  rows,
  start: DateTime.utc(2026, 10, 7),
  end: DateTime.utc(2026, 10, 8),
  method: method,
  query: query,
  localize: (date) => date.toUtc(),
);

void main() {
  test(
    'purchase sharing excludes private evidence and identifies the seller payout',
    () {
      final receipt = purchase(), text = saleReceiptText(purchase());
      expect(text, contains('PURCHASE RECEIPT'));
        expect(text, contains('Total paid to seller: USD 6.50'));
      expect(text, contains('Grookai did not move money'));
      expect(text, isNot(contains(receipt['note'])));
      expect(text, isNot(contains('Subtotal:')));
      expect(receiptBalance(receipt), -650);
      expect(receiptTenders(receipt).single['amountMinor'], 650);
    },
  );
  test(
    'mixed sales and purchases keep revenue, coverage and cash movement separate',
    () {
      final data = report([sale(), purchase()]);
      expect(data.transactions, 2);
      expect(data.saleTransactions, 1);
      expect(data.salesMinor, 1000);
      expect(data.taxMinor, 0);
      expect(data.units, 1);
      expect(data.averageMinor, 1000);
      expect(data.purchases, 1);
      expect(data.purchasedUnits, 1);
      expect(data.purchaseMinor, 650);
      expect(data.totalMinor, 1000);
      expect(data.paidToCustomerMinor, 0);
      expect(data.paidToSellerMinor, 650);
      expect(data.paidOutMinor, 650);
      expect(data.payments['Cash'], 350);
      expect(data.hourlySales[12], 1000);
      expect(data.hourlyTransactions[12], 1);
      expect(salesProfit([sale(), purchase()], []), salesProfit([sale()], []));
    },
  );
  test('purchase-only reports have no sale or false zero-profit claim', () {
    final data = report([purchase()]);
    expect(data.salesMinor, 0);
    expect(data.units, 0);
    expect(data.averageMinor, 0);
    expect(data.totalMinor, 0);
    expect(data.paidOutMinor, 650);
    final profit = salesProfit([purchase()], []);
    expect(profit['receipts'], 0);
    expect(profit['totalLines'], 0);
    expect(profit['knownProfitMinor'], null);
  });
  test('malformed purchase evidence rejects in reports, profit and share', () {
    final receipt = purchase();
    receipt['purchaseMinor'] = 651;
    expect(() => report([receipt]), throwsFormatException);
    expect(() => salesProfit([receipt], []), throwsFormatException);
    expect(() => saleReceiptText(receipt), throwsFormatException);
  });
  test(
    'purchase CSV preserves customer payouts and adds explicit seller payouts',
    () {
      final receipt = purchase();
      receipt['customerName'] = '=FORMULA()';
      final lines = report([receipt]).csv().split('\r\n');
      final headers = lines.first.split(','),
          values = lines.last
              .split(',')
              .map((cell) => cell.replaceAll(RegExp(r'^"|"$'), ''))
              .toList();
      expect(values[headers.indexOf('Units')], '0');
      expect(values[headers.indexOf('Sales USD')], '0.00');
      expect(values[headers.indexOf('Paid to customer USD')], '0.00');
      expect(values[headers.indexOf('Paid to seller USD')], '6.50');
      expect(values[headers.indexOf('Transaction kind')], 'Purchase');
      expect(values[headers.indexOf('Units purchased')], '1');
      expect(values[headers.indexOf('Customer')], "'=FORMULA()");
    },
  );
  test(
    'mixed tender filtering and duplicate receipts preserve purchase scope',
    () {
      final receipt = purchase();
      receipt['method'] = 'Split payment';
      receipt['payments']['entries'] = [
        {'method': 'Cash', 'amountMinor': 250, 'tenderedMinor': 250},
        {'method': 'Other', 'amountMinor': 400, 'tenderedMinor': 400},
      ];
      expect(report([sale(), receipt, receipt], method: 'Other').purchases, 1);
      expect(report([sale(), receipt], query: 'GVB-').salesMinor, 0);
    },
  );
}
