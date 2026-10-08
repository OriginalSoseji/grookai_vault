import 'dart:convert';
import 'sales_purchase.dart';
import 'negotiated_trade.dart';

// Private, immutable cost-at-sale evidence. Current inventory cost is not an input.
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
const _unknownStatuses = {
  'missing_amount',
  'missing_currency',
  'invalid_amount',
  'invalid_currency',
  'oversized_legacy_value',
};
Never _invalid() => throw const FormatException(
  'Recorded sales need review before profit can be calculated.',
);
BigInt _integer(dynamic value, {bool positive = false}) {
  if (value is! num ||
      !value.isFinite ||
      value != value.truncate() ||
      value < (positive ? 1 : 0) ||
      value > 9007199254740991) {
    _invalid();
  }
  return BigInt.from(value);
}

Object? _stable(Object? value) {
  if (value is List) return value.map(_stable).toList();
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return {for (final key in keys) key: _stable(value[key])};
  }
  return value;
}

Map<String, Map> _unique(List<dynamic> rows, String key, String label) {
  if (rows.length > 10000) _invalid();
  final result = <String, Map>{};
  for (final row in rows) {
    if (row is! Map ||
        row[key] is! String ||
        (row[key] as String).isEmpty ||
        (row[key] as String).length > 200) {
      _invalid();
    }
    final id = row[key] as String;
    final previous = result[id];
    if (previous != null &&
        jsonEncode(_stable(previous)) != jsonEncode(_stable(row))) {
      throw FormatException('Conflicting $label history needs review.');
    }
    result[id] = row;
  }
  return result;
}

int? _date(dynamic value) =>
    value is String ? DateTime.tryParse(value)?.millisecondsSinceEpoch : null;
BigInt? _qualifiedMinor(dynamic cost) {
  if (cost is! Map ||
      cost['status'] != 'known' ||
      cost['amount'] is! String ||
      (cost['amount'] as String).length > 1500 ||
      !RegExp(r'^\d+(?:\.\d+)?$').hasMatch(cost['amount'] as String) ||
      cost['currency'] is! String ||
      !RegExp(r'^[A-Z]{3}$').hasMatch(cost['currency'] as String) ||
      cost['minor'] is! String ||
      !RegExp(r'^\d{1,12}$').hasMatch(cost['minor'] as String)) {
    return null;
  }
  final parts = (cost['amount'] as String).split('.');
  final fraction = parts.length == 2 ? parts[1] : '';
  if (fraction.length > 2 && RegExp(r'[1-9]').hasMatch(fraction.substring(2))) {
    return null;
  }
  final cents = fraction.padRight(2, '0').substring(0, 2);
  final minor = BigInt.parse(parts[0]) * BigInt.from(100) + BigInt.parse(cents);
  return minor <= BigInt.from(999999999999) &&
          minor == BigInt.parse(cost['minor'] as String)
      ? minor
      : null;
}

bool _aligned(
  Map? snapshot,
  Map receipt,
  List<({BigInt units, BigInt sales})> items,
) {
  if (snapshot == null ||
      snapshot['version'] != 1 ||
      snapshot['receiptId'] != receipt['id'] ||
      snapshot['salesCurrency'] != 'USD' ||
      _date(snapshot['soldAt']) == null ||
      _date(snapshot['soldAt']) != _date(receipt['createdAt']) ||
      snapshot['lines'] is! List ||
      (snapshot['lines'] as List).length != items.length) {
    return false;
  }
  final copies = <String>{};
  for (var index = 0; index < items.length; index++) {
    final line = (snapshot['lines'] as List)[index];
    if (line is! Map ||
        line['index'] != index ||
        line['quantity'] != (receipt['items'] as List)[index]['quantity'] ||
        line['salesMinor'] is! String ||
        (line['salesMinor'] as String).length > 32 ||
        !RegExp(r'^\d+$').hasMatch(line['salesMinor'] as String) ||
        BigInt.parse(line['salesMinor'] as String) != items[index].sales ||
        line['cost'] is! Map) {
      return false;
    }
    final cost = line['cost'] as Map;
    if (line['instanceId'] == null) {
      if (line['status'] != 'unlinked' ||
          cost['status'] != 'missing_amount' ||
          cost['amount'] != null ||
          cost['currency'] != null ||
          cost['minor'] != null) {
        return false;
      }
      continue;
    }
    if (line['instanceId'] is! String ||
        !_uuid.hasMatch(line['instanceId'] as String) ||
        !copies.add(line['instanceId'] as String) ||
        line['quantity'] != 1) {
      return false;
    }
    if (line['status'] == 'known' || line['status'] == 'foreign_currency') {
      if (_qualifiedMinor(cost) == null ||
          (line['status'] == 'known'
              ? cost['currency'] != 'USD'
              : cost['currency'] == 'USD')) {
        return false;
      }
    } else if (!_unknownStatuses.contains(line['status']) ||
        cost['status'] != line['status'] ||
        cost['minor'] != null) {
      return false;
    }
  }
  return true;
}

/// Receipts must be the same filtered set displayed by Reports. A failed snapshot
/// read must be shown as unavailable, never passed here as an empty successful read.
Map<String, Object?> salesProfit(
  List<dynamic> receipts,
  List<dynamic> snapshots,
) {
  final rows = _unique(receipts, 'id', 'receipt');
  final evidence = _unique(snapshots, 'receiptId', 'cost');
  var sales = BigInt.zero, knownSales = BigInt.zero, costs = BigInt.zero;
  var units = BigInt.zero, knownUnits = BigInt.zero;
  var lines = 0, knownLines = 0, purchases = 0;
  final reasons = <String, _Gap>{};
  final details = <Map<String, Object?>>[];
  void excluded(
    String reason,
    String receiptId,
    int count,
    BigInt quantity,
    BigInt amount,
  ) {
    final gap = reasons.putIfAbsent(reason, _Gap.new);
    gap.receipts.add(receiptId);
    gap.lines += count;
    gap.units += quantity;
    gap.sales += amount;
  }

  for (final receipt in rows.values) {
    if (isPurchaseReceipt(receipt)) {
      validatePurchaseReceipt(receipt);
      purchases++;
      continue;
    }
    if (receipt['tradeIn'] is Map &&
        receipt['tradeIn']['version'] != null &&
        receipt['tradeIn']['version'] != 1) {
      validateNegotiatedSaleReceipt(receipt);
    }
    if (_date(receipt['createdAt']) == null ||
        receipt['items'] is! List ||
        (receipt['items'] as List).isEmpty ||
        (receipt['items'] as List).length > 1000) {
      _invalid();
    }
    final items = (receipt['items'] as List).map((item) {
      if (item is! Map) _invalid();
      final quantity = _integer(item['quantity'], positive: true);
      return (units: quantity, sales: quantity * _integer(item['unitMinor']));
    }).toList();
    final subtotal = items.fold(BigInt.zero, (sum, item) => sum + item.sales);
    final quantity = items.fold(BigInt.zero, (sum, item) => sum + item.units);
    final discount = _integer(receipt['discountMinor'] ?? 0),
        tax = _integer(receipt['taxMinor']);
    if (subtotal != _integer(receipt['subtotalMinor']) ||
        discount > subtotal ||
        subtotal - discount + tax != _integer(receipt['totalMinor'])) {
      throw const FormatException(
        'Recorded sales do not reconcile. Profit is unavailable until they are reviewed.',
      );
    }
    final net = subtotal - discount, id = receipt['id'] as String;
    sales += net;
    units += quantity;
    lines += items.length;
    final snapshot = evidence[id];
    final reason = snapshot == null
        ? 'missing_snapshot'
        : !_aligned(snapshot, receipt, items)
        ? 'snapshot_mismatch'
        : discount > BigInt.zero
        ? 'discount_allocation_missing'
        : null;
    if (reason != null) {
      excluded(reason, id, items.length, quantity, net);
      details.add({
        'receiptId': id,
        'knownLines': 0,
        'totalLines': items.length,
        'knownSalesMinor': '0',
        'knownCostMinor': '0',
        'knownProfitMinor': null,
        'reasons': [reason],
      });
      continue;
    }
    var coveredSales = BigInt.zero, coveredCost = BigInt.zero, coveredLines = 0;
    final receiptReasons = <String>{};
    for (var index = 0; index < items.length; index++) {
      final line = (snapshot!['lines'] as List)[index] as Map;
      final item = items[index];
      if (line['status'] == 'known') {
        coveredSales += item.sales;
        coveredCost += _qualifiedMinor(line['cost'])!;
        coveredLines++;
        knownUnits += item.units;
      } else {
        excluded(line['status'] as String, id, 1, item.units, item.sales);
        receiptReasons.add(line['status'] as String);
      }
    }
    knownSales += coveredSales;
    costs += coveredCost;
    knownLines += coveredLines;
    details.add({
      'receiptId': id,
      'knownLines': coveredLines,
      'totalLines': items.length,
      'knownSalesMinor': '$coveredSales',
      'knownCostMinor': '$coveredCost',
      'knownProfitMinor': coveredLines > 0
          ? '${coveredSales - coveredCost}'
          : null,
      'reasons': receiptReasons.toList()..sort(),
    });
  }
  final reasonKeys = reasons.keys.toList()..sort();
  return {
    'currency': 'USD',
    'receipts': rows.length - purchases,
    'totalLines': lines,
    'knownLines': knownLines,
    'totalUnits': '$units',
    'knownUnits': '$knownUnits',
    'itemSalesMinor': '$sales',
    'knownSalesMinor': '$knownSales',
    'unknownSalesMinor': '${sales - knownSales}',
    'knownCostMinor': '$costs',
    'knownProfitMinor': knownLines > 0 ? '${knownSales - costs}' : null,
    'coverageBps': lines > 0 ? knownLines * 10000 ~/ lines : null,
    'reasons': [
      for (final reason in reasonKeys)
        {
          'reason': reason,
          'receipts': reasons[reason]!.receipts.length,
          'lines': reasons[reason]!.lines,
          'units': '${reasons[reason]!.units}',
          'salesMinor': '${reasons[reason]!.sales}',
        },
    ],
    'details': details,
  };
}

class _Gap {
  final receipts = <String>{};
  int lines = 0;
  BigInt units = BigInt.zero, sales = BigInt.zero;
}

String profitMoney(String minor) {
  if (!RegExp(r'^-?\d+$').hasMatch(minor)) {
    throw const FormatException('Invalid money amount.');
  }
  final amount = BigInt.parse(minor), hundred = BigInt.from(100);
  final absolute = amount.abs();
  final whole = (absolute ~/ hundred).toString().replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  return '${amount.isNegative ? '-' : ''}\$$whole.${(absolute % hundred).toString().padLeft(2, '0')}';
}

String costGapLabel(String reason) =>
    const {
      'missing_snapshot': 'No cost recorded at sale',
      'snapshot_mismatch': 'Cost evidence needs review',
      'discount_allocation_missing': 'Discount allocation not recorded',
      'unlinked': 'Item not linked to an exact copy',
      'missing_amount': 'Cost amount missing',
      'missing_currency': 'Cost currency missing',
      'invalid_amount': 'Cost amount needs review',
      'invalid_currency': 'Cost currency needs review',
      'oversized_legacy_value': 'Legacy cost needs review',
      'foreign_currency': 'Cost recorded in another currency',
    }[reason] ??
    'Cost evidence needs review';
