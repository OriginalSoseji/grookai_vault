const salesTenderMethods = [
  'Cash',
  'Card (external terminal)',
  'Bank / payment app',
  'Other',
];

/// UI estimate and receipt verification. The database recomputes the final snapshot.
Map<String, dynamic> salesPaymentSnapshot(
  List<Map<String, dynamic>> entries,
  int balance,
) {
  Never fail() => throw StateError(
    'Payments must cover the exact balance. Only incoming cash can include change.',
  );
  if (balance.abs() > 100000000 || entries.length > 4) fail();
  final seen = <String>{};
  var applied = 0, change = 0;
  for (final e in entries) {
    final amount = e['amountMinor'],
        tendered = e['tenderedMinor'],
        method = e['method'];
    if (e.length != 3 ||
        !salesTenderMethods.contains(method) ||
        !seen.add(method as String) ||
        amount is! int ||
        amount < 1 ||
        amount > 100000000 ||
        tendered is! int ||
        tendered < amount ||
        tendered > 100000000 ||
        (method != 'Cash' || balance <= 0) && amount != tendered) {
      fail();
    }
    applied += amount;
    change += tendered - amount;
  }
  if (applied != balance.abs() || balance == 0 && entries.isNotEmpty) fail();
  return {
    'version': 1,
    'balanceMinor': balance,
    'entries': entries.map((e) => Map<String, dynamic>.from(e)).toList(),
    'changeMinor': change,
  };
}

String salesPaymentMethod(List<Map<String, dynamic>> entries) =>
    entries.length > 1
    ? 'Split payment'
    : entries.isEmpty
    ? 'Other'
    : entries.single['method'] as String;

List<Map<String, dynamic>> receiptTenders(Map<String, dynamic> receipt) {
  final balance =
      (receipt['tradeIn'] as Map?)?['balanceMinor'] as int? ??
      receipt['totalMinor'] as int;
  final p = receipt['payments'];
  if (p == null) {
    return [
      {
        'method': receipt['method'],
        'amountMinor': balance.abs(),
        'tenderedMinor': balance.abs(),
      },
    ];
  }
  if (p is! Map ||
      p.length != 4 ||
      p['version'] != 1 ||
      p['balanceMinor'] != balance ||
      p['entries'] is! List) {
    throw StateError('Invalid payment snapshot.');
  }
  final entries = (p['entries'] as List)
      .map((e) => Map<String, dynamic>.from(e as Map))
      .toList();
  final expected = salesPaymentSnapshot(entries, balance);
  if (p['changeMinor'] != expected['changeMinor'] ||
      receipt['method'] != salesPaymentMethod(entries)) {
    throw StateError('Payment totals do not match.');
  }
  return entries;
}

List<String> salesPaymentLines(
  Map<String, dynamic> receipt,
  String Function(int) money,
) {
  if (receipt['payments'] == null) return [];
  final entries = receiptTenders(receipt), p = receipt['payments'] as Map;
  final balance = p['balanceMinor'] as int, change = p['changeMinor'] as int;
  return [
    balance < 0
        ? 'Paid to customer:'
        : balance == 0
        ? 'Even trade — no money exchanged.'
        : 'Payment received:',
    ...entries.map((e) => '${e['method']}: ${money(e['amountMinor'] as int)}'),
    if (change > 0) ...[
      'Cash tendered: ${money(entries.firstWhere((e) => e['method'] == 'Cash')['tenderedMinor'] as int)}',
      'Cash change: ${money(change)}',
    ],
  ];
}
