import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/negotiated_trade.dart';
import 'package:grookai_vault/services/sales/sales_cart_service.dart';
import 'package:grookai_vault/services/sales/sales_report.dart';
import 'package:grookai_vault/services/sales/sales_profit.dart';

void main() {
  final rows =
      (jsonDecode(
                File(
                  'test/fixtures/negotiated_trade_web_v1.json',
                ).readAsStringSync(),
              )
              as Map)['cases']
          as List;
  Map<String, dynamic> receipt() => Map<String, dynamic>.from(
    jsonDecode(
          jsonEncode(rows.firstWhere((r) => r['name'] == 'receipt')['args'][0]),
        )
        as Map,
  );
  test(
    'native desk, reports and sharing retain unknown reference without inventing zero',
    () {
      final r = receipt();
      r['tradeIn']['items'][0]['valueMinor'] = null;
      r['tradeIn']['items'][0]['rateBps'] = null;
      r['tradeIn']['totalValueMinor'] = null;
      final book = {
        'storeName': 'Trade store',
        'customers': <dynamic>[],
        'receipts': [
          {'receipt': r, 'customerId': null},
        ],
      };
      final desk = SalesDeskData(
        available: false,
        rows: const [],
        storeName: '',
        customers: const [],
      ).withBook(book);
      expect(desk.receipts.single['tradeIn']['totalValueMinor'], isNull);
      final report = SalesReport(
        [r],
        start: DateTime.utc(2026, 10, 7),
        end: DateTime.utc(2026, 10, 9),
      );
      expect(report.salesMinor, 1000);
      expect(salesProfit([r], [])['knownProfitMinor'], isNull);
      final text = saleReceiptText(r);
      expect(text, contains('USD 6.50 agreed credit'));
      expect(text, isNot(contains('PRIVATE')));
    },
  );
  test('native readers reject malformed and future trade snapshots', () {
    for (final version in [2, 3]) {
      final r = receipt();
      r['tradeIn']['version'] = version;
      r['tradeIn']['totalValueMinor'] = null;
      expect(() => saleReceiptText(r), throwsFormatException);
      expect(
        () => SalesReport(
          [r],
          start: DateTime.utc(2026, 10, 7),
          end: DateTime.utc(2026, 10, 9),
        ),
        throwsFormatException,
      );
      expect(() => salesProfit([r], []), throwsFormatException);
    }
  });
  for (final row in rows) {
    test('negotiated trade parity: ${row['name']}', () {
      final args = row['args'] as List;
      dynamic call() => switch (row['fn']) {
        'validateNegotiatedTradeLine' => validateNegotiatedTradeLine(
          args[0],
          args.length > 1 ? args[1] as bool : false,
        ),
        'negotiatedTradeTotals' => negotiatedTradeTotals(
          args[0],
          args.length > 1 ? args[1] as bool : false,
        ),
        'validateNegotiatedTradeReceipt' => validateNegotiatedTradeReceipt(
          args[0],
          args[1],
        ),
        'validateNegotiatedTradeRequest' => validateNegotiatedTradeRequest(
          args[0],
        ),
        'validateNegotiatedSaleReceipt' => validateNegotiatedSaleReceipt(
          args[0],
        ),
        'confirmedNegotiatedTrade' => confirmedNegotiatedTrade(
          args[0],
          args[1],
        ),
        'negotiatedTradeCustomerView' => negotiatedTradeCustomerView(args[0]),
        _ => throw StateError('Unsupported vector'),
      };
      if (row['expected']['ok'] == true) {
        expect(call(), row['expected']['value']);
      } else {
        expect(call, throwsA(anyOf(isA<FormatException>(), isA<StateError>())));
      }
    });
  }
  test(
    'native receipt handoff omits private values and preserves exact amounts',
    () {
      final row = rows.firstWhere((row) => row['name'] == 'receipt');
      final input = jsonDecode(jsonEncode(row['args'][0])) as Map;
      final checked = validateNegotiatedSaleReceipt(input);
      final text = negotiatedTradeReceiptText(
        checked,
        (n) => 'USD ${(n / 100).toStringAsFixed(2)}',
      );
      expect(text, contains('USD 6.50 agreed credit'));
      expect(text, contains('Cash change: USD 1.50'));
      for (final value in [
        'PRIVATE',
        'Private buyer',
        'private@example.invalid',
        'valueMinor',
        'rateBps',
        'sourceDispositionId',
        'instanceId',
        'gvviId',
      ]) {
        expect(text, isNot(contains(value)));
      }
      input['note'] = 'changed';
      expect(checked['note'], 'PRIVATE NOTE');
      expect(
        () => (checked['tradeIn']['items'][0] as Map)['creditMinor'] = 900,
        throwsUnsupportedError,
      );
    },
  );
}
