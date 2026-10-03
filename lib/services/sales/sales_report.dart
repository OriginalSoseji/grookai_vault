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
      if (method != null && receipt['method'] != method) continue;
      final search =
          '${receipt['number']} ${receipt['customerName']} '
          '${(receipt['items'] as List).map((i) => i['description']).join(' ')}';
      if (!search.toLowerCase().contains(query.trim().toLowerCase())) continue;
      rows.add(receipt);
      final net =
          (receipt['subtotalMinor'] as int) -
          (receipt['discountMinor'] as int? ?? 0);
      salesMinor += net;
      taxMinor += receipt['taxMinor'] as int;
      totalMinor += receipt['totalMinor'] as int;
      discountMinor += receipt['discountMinor'] as int? ?? 0;
      for (final item in receipt['items'] as List) {
        units += item['quantity'] as int;
      }
      final hour = toLocal(date).hour;
      hourlySales[hour] += net;
      hourlyTransactions[hour]++;
      final payment = receipt['method'] as String;
      payments[payment] =
          (payments[payment] ?? 0) + (receipt['totalMinor'] as int);
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
      'Receipt,Recorded at,Customer,Payment method,Units,Sales USD,Discount USD,Tax USD,Total USD',
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
        ].map(cell).join(','),
      ),
    ].join('\r\n');
  }
}
