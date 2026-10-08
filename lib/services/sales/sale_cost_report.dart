import 'dart:convert';
import 'sales_profit.dart';
import 'sales_purchase.dart';

String _amount(dynamic v) {
  if (v == null) return '';
  final n = BigInt.parse(v as String), a = n.abs();
  return '${n.isNegative ? '-' : ''}${a ~/ BigInt.from(100)}.${(a % BigInt.from(100)).toString().padLeft(2, '0')}';
}

String _cell(dynamic v) {
  var s = v?.toString() ?? '';
  if (RegExp(r'^[\s\u0085]*[=+@\-\t\r]').hasMatch(s)) s = "'$s";
  return '"${s.replaceAll('"', '""')}"';
}

String saleCostReportCsv(
  List<dynamic> receipts,
  List<dynamic> snapshots, {
  String basis = 'original',
  List<dynamic> states = const [],
  String? ownerId,
}) {
  if (!['original', 'owner_corrected'].contains(basis)) {
    throw const FormatException('Choose the cost reporting basis.');
  }
  final report = basis == 'original'
      ? salesProfit(receipts, snapshots)
      : salesProfitCorrected(receipts, snapshots, states, ownerId ?? '');
  final details = {
        for (final d in report['details'] as List) d['receiptId']: d,
      },
      evidence = {for (final s in states) s['receiptId']: s};
  final rows = <List<dynamic>>[
    [
      'Receipt ID',
      'Receipt number',
      'Sold at',
      'Cost basis',
      'Covered sales USD',
      'Covered cost USD',
      'Covered profit USD',
      'Covered lines',
      'Total lines',
      'Coverage gaps',
      'Later owner revisions (private)',
    ],
  ];
  final unique = {for (final r in receipts) r['id']: r};
  for (final r in unique.values) {
    if (isPurchaseReceipt(r)) continue;
    final d = details[r['id']];
    final state = evidence[(r['id'] as String).toLowerCase()];
    final revisions = (state?['lines'] as List? ?? [])
        .map(
          (o) => {
            'line': o['request']['lineIndex'] + 1,
            'revision': o['revision'],
            'action': o['request']['action'],
            'cost': o['request']['cost'],
            'ownerId': o['ownerId'],
            'recordedAt': o['recordedAt'],
            'reason': o['request']['reason'],
          },
        )
        .toList();
    rows.add([
      r['id'],
      r['number'],
      r['createdAt'],
      basis == 'original' ? 'Original cost at sale' : 'Later owner corrections',
      _amount(d['knownSalesMinor']),
      _amount(d['knownCostMinor']),
      _amount(d['knownProfitMinor']),
      d['knownLines'],
      d['totalLines'],
      (d['reasons'] as List).join('; '),
      basis == 'original' ? '' : jsonEncode(revisions),
    ]);
  }
  return rows.map((r) => r.map(_cell).join(',')).join('\r\n');
}
