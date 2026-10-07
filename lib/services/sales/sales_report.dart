import 'sales_trade.dart';
import 'sales_payments.dart';

/// A receipt is a transaction, regardless of how many physical copies it holds.
/// These are vendor-recorded receipts, not a Stripe settlement or profit ledger.
class SalesReport {
  SalesReport(
    Iterable<Map<String, dynamic>> receipts, {
    required this.start,
    required this.end,
    this.query = '',
    this.method,
    DateTime Function(DateTime)? localize,
  }) {
    final seen = <String>{};
    final toLocal = localize ?? (date) => date.toLocal();
    for (final receipt in receipts) {
      final id = receipt['id'] as String;
      if (!seen.add(id)) continue;
      final date = DateTime.parse(receipt['createdAt'] as String);
      if (date.isBefore(start) || !date.isBefore(end)) continue;
      final tenders = receiptTenders(receipt);
      if (method != null &&
          receipt['method'] != method &&
          !tenders.any((e) => e['method'] == method)) {
        continue;
      }
      final search =
          '${receipt['number']} ${receipt['customerName']} '
          '${(receipt['items'] as List).map((i) => i['description']).join(' ')} '
          '${((receipt['tradeIn'] as Map?)?['items'] as List? ?? []).map((i) => i['description']).join(' ')}';
      if (!search.toLowerCase().contains(query.trim().toLowerCase())) continue;
      rows.add(receipt);
      final net =
          (receipt['subtotalMinor'] as int) -
          (receipt['discountMinor'] as int? ?? 0);
      salesMinor += net;
      taxMinor += receipt['taxMinor'] as int;
      final balance = receiptBalance(receipt);
      totalMinor += balance > 0 ? balance : 0;
      paidToCustomerMinor += balance < 0 ? -balance : 0;
      tradeCreditMinor +=
          (receipt['tradeIn'] as Map?)?['totalCreditMinor'] as int? ?? 0;
      discountMinor += receipt['discountMinor'] as int? ?? 0;
      for (final item in receipt['items'] as List) {
        units += item['quantity'] as int;
      }
      final hour = toLocal(date).hour;
      hourlySales[hour] += net;
      hourlyTransactions[hour]++;
      for (final e in tenders) {
        final payment = e['method'] as String;
        payments[payment] =
            (payments[payment] ?? 0) + balance.sign * (e['amountMinor'] as int);
      }
    }
    rows.sort(
      (a, b) => DateTime.parse(
        b['createdAt'] as String,
      ).compareTo(DateTime.parse(a['createdAt'] as String)),
    );
  }

  final DateTime start, end;
  final String query;
  final String? method;
  final rows = <Map<String, dynamic>>[];
  final hourlySales = List<int>.filled(24, 0);
  final hourlyTransactions = List<int>.filled(24, 0);
  final payments = <String, int>{};
  int salesMinor = 0,
      taxMinor = 0,
      totalMinor = 0,
      tradeCreditMinor = 0,
      paidToCustomerMinor = 0,
      units = 0,
      discountMinor = 0;
  int get transactions => rows.length;
  int get averageMinor =>
      transactions == 0 ? 0 : (salesMinor / transactions).round();

  String csv() {
    // Prevent spreadsheet formulas from customer-controlled text on export.
    String cell(Object? value) {
      var text = '$value';
      if (RegExp(r'^\s*[=+@\-\t\r]').hasMatch(text)) text = "'$text";
      return '"${text.replaceAll('"', '""')}"';
    }

    String amount(int n) => (n / 100).toStringAsFixed(2);
    return [
      'Receipt,Recorded at,Customer,Payment method,Units,Sales USD,Discount USD,Tax USD,Purchase total USD,Trade credit USD,Received USD,Paid to customer USD,Payment breakdown USD,Cash tendered USD,Cash change USD',
      ...rows.map(
        (r) => [
          r['number'],
          r['createdAt'],
          r['customerName'],
          r['method'],
          (r['items'] as List).fold<int>(
            0,
            (n, i) => n + (i['quantity'] as int),
          ),
          amount(
            (r['subtotalMinor'] as int) - (r['discountMinor'] as int? ?? 0),
          ),
          amount(r['discountMinor'] as int? ?? 0),
          amount(r['taxMinor'] as int),
          amount(r['totalMinor'] as int),
          amount((r['tradeIn'] as Map?)?['totalCreditMinor'] as int? ?? 0),
          amount(receiptBalance(r) > 0 ? receiptBalance(r) : 0),
          amount(receiptBalance(r) < 0 ? -receiptBalance(r) : 0),
          receiptTenders(r)
              .map((e) => '${e['method']}: ${amount(e['amountMinor'] as int)}')
              .join('; '),
          r['payments'] == null
              ? ''
              : amount(
                  receiptTenders(r)
                      .where((e) => e['method'] == 'Cash')
                      .fold<int>(0, (n, e) => n + (e['tenderedMinor'] as int)),
                ),
          r['payments'] == null
              ? ''
              : amount(r['payments']['changeMinor'] as int),
        ].map(cell).join(','),
      ),
    ].join('\r\n');
  }
}
