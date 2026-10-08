import 'dart:convert';
import 'vendor_events.dart';
import 'sales_purchase.dart';
import 'negotiated_trade.dart';
import 'sales_payments.dart';
import 'sales_profit.dart';

String _amount(dynamic value) {
  if (value == null) return '';
  _check(value is String && RegExp(r'^-?(?:0|[1-9][0-9]*)$').hasMatch(value));
  final n = BigInt.parse(value as String), a = n.abs();
  return '${n.isNegative ? '-' : ''}${a ~/ BigInt.from(100)}.${(a % BigInt.from(100)).toString().padLeft(2, '0')}';
}

String _csvCell(dynamic value) {
  var s = value?.toString() ?? '';
  if (RegExp(r'^[\s\u0085]*[=+@\-\t\r]').hasMatch(s)) s = "'$s";
  return '"${s.replaceAll('"', '""')}"';
}

String eventReportCsv(Map report) {
  final rows = <List<dynamic>>[
    [
      'Record type',
      'Event',
      'ID',
      'Recorded at / incurred on',
      'Description',
      'Sales USD',
      'Tax USD',
      'Inventory purchases USD',
      'Trade credit USD',
      'Received USD',
      'Paid USD',
      'Operating expense USD',
      'Expense category',
      'Method',
      'Known cost lines / sale lines',
      'Known cost USD',
      'Known profit USD',
      'Receipt search',
      'Receipt payment filter',
    ],
  ];
  final details = {
    for (final d in report['profit']['details'] as List) d['receiptId']: d,
  };
  for (final r in report['rows'] as List) {
    final purchase = isPurchaseReceipt(r),
        balance = purchase
            ? -_integer(r['purchaseMinor'])
            : _integer(r['totalMinor']) -
                  _integer((r['tradeIn'] as Map?)?['totalCreditMinor'] ?? 0),
        profit = details[r['id']];
    rows.add([
      purchase
          ? 'Purchase'
          : r['tradeIn'] != null
          ? 'Trade'
          : 'Sale',
      report['event']['name'],
      r['id'],
      r['createdAt'],
      (r['items'] as List).map((i) => i['description']).join('; '),
      _amount(
        '${purchase ? BigInt.zero : _integer(r['subtotalMinor']) - _integer(r['discountMinor'] ?? 0)}',
      ),
      _amount('${purchase ? 0 : r['taxMinor']}'),
      _amount('${purchase ? r['purchaseMinor'] : 0}'),
      _amount('${(r['tradeIn'] as Map?)?['totalCreditMinor'] ?? 0}'),
      _amount('${balance > BigInt.zero ? balance : BigInt.zero}'),
      _amount('${balance < BigInt.zero ? -balance : BigInt.zero}'),
      '0.00',
      '',
      r['method'],
      profit != null ? '${profit['knownLines']}/${profit['totalLines']}' : '',
      _amount(profit?['knownCostMinor']),
      _amount(profit?['knownProfitMinor']),
      report['receiptFilter']['query'],
      report['receiptFilter']['method'],
    ]);
  }
  for (final e in report['expenses'] as List) {
    rows.add([
      'Expense',
      report['event']['name'],
      e['expenseId'],
      e['incurredOn'],
      e['description'],
      '0.00',
      '0.00',
      '0.00',
      '0.00',
      '0.00',
      '0.00',
      _amount(e['amountMinor']),
      e['category'],
      '',
      '',
      '',
      '',
      report['receiptFilter']['query'],
      report['receiptFilter']['method'],
    ]);
  }
  return rows.map((r) => r.map(_csvCell).join(',')).join('\r\n');
}

Never _fail() => throw const FormatException(
  'Event receipts need review before totals can be shown.',
);
void _check(bool value) {
  if (!value) _fail();
}

BigInt _integer(dynamic v) {
  _check(
    v is num &&
        v.isFinite &&
        v == v.truncate() &&
        v >= 0 &&
        v <= 9007199254740991,
  );
  return BigInt.from(v as num);
}

dynamic _stable(dynamic v) {
  if (v is List) return v.map(_stable).toList();
  if (v is Map) {
    final keys = v.keys.cast<String>().toList()..sort();
    return {for (final key in keys) key: _stable(v[key])};
  }
  return v;
}

bool _id(dynamic v) =>
    v is String &&
    v.length == 36 &&
    RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      caseSensitive: false,
    ).hasMatch(v);
void _text(dynamic v, int max, {bool required = false}) {
  _check(v is String);
  final s = (v as String).trim();
  _check(
    s.length <= max &&
        (!required || s.isNotEmpty) &&
        !RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f]').hasMatch(s),
  );
}

// Legacy receipts have no native backup parser. Validate their original arithmetic
// before any event filtering; modern versions use the qualified shared readers.
void _receipt(Map<String, dynamic> r) {
  _check(_id(r['id']));
  if (isPurchaseReceipt(r)) {
    validatePurchaseReceipt(r);
    return;
  }
  if (r['tradeIn'] is Map && r['tradeIn']['version'] == 2) {
    validateNegotiatedSaleReceipt(r);
    return;
  }
  _check(
    r['version'] == 1 &&
        r['createdAt'] is String &&
        DateTime.tryParse(r['createdAt'] as String) != null,
  );
  final stamp = r['createdAt'] as String;
  _check(
    stamp.length >= 10 &&
        r['number'] ==
            'GV-${stamp.substring(0, 10).replaceAll('-', '')}-${(r['id'] as String).substring(0, 8).toUpperCase()}',
  );
  _text(r['storeName'], 120, required: true);
  _text(r['customerName'], 120);
  _check(!RegExp(r'[\r\n]').hasMatch(r['customerName'] as String));
  _text(r['note'], 500);
  _check(
    r['items'] is List &&
        (r['items'] as List).isNotEmpty &&
        (r['items'] as List).length <= 50,
  );
  var subtotal = BigInt.zero;
  for (final item in r['items'] as List) {
    _check(item is Map);
    _text(item['description'], 200, required: true);
    final quantity = _integer(item['quantity']),
        unit = _integer(item['unitMinor']);
    _check(
      quantity >= BigInt.one &&
          quantity <= BigInt.from(999) &&
          unit <= BigInt.from(100000000),
    );
    final line = quantity * unit;
    _check(_integer(item['lineMinor']) == line);
    subtotal += line;
  }
  final discount = _integer(r['discountMinor']),
      tax = _integer(r['taxMinor']),
      total = _integer(r['totalMinor']);
  _check(
    _integer(r['subtotalMinor']) == subtotal &&
        discount <= subtotal &&
        discount <= BigInt.from(999999999) &&
        tax <= BigInt.from(999999999) &&
        total == subtotal - discount + tax &&
        total > BigInt.zero &&
        total <= BigInt.from(100000000),
  );
  const methods = [
    'Cash',
    'Card (external terminal)',
    'Bank / payment app',
    'Other',
  ];
  _check(
    methods.contains(r['method']) ||
        (r['method'] == 'Split payment' && r['payments'] is Map),
  );
  if (r.containsKey('tradeIn')) {
    final t = r['tradeIn'];
    _check(
      t is Map &&
          t.length == 5 &&
          t['version'] == 1 &&
          t['items'] is List &&
          (t['items'] as List).isNotEmpty &&
          (t['items'] as List).length <= 50,
    );
    var value = BigInt.zero, credit = BigInt.zero;
    const keys = [
      'description',
      'quantity',
      'valueMinor',
      'rateBps',
      'creditMinor',
      'cardId',
      'printingId',
      'condition',
      'addToVault',
      'printingGvId',
      'instanceId',
      'gvviId',
    ];
    for (final x in t['items'] as List) {
      _check(x is Map && x.length == keys.length && keys.every(x.containsKey));
      _text(x['description'], 200, required: true);
      final qty = _integer(x['quantity']),
          minor = _integer(x['valueMinor']),
          rate = _integer(x['rateBps']);
      _check(
        qty >= BigInt.one &&
            qty <= BigInt.from(999) &&
            minor >= BigInt.one &&
            minor <= BigInt.from(100000000) &&
            rate >= BigInt.one &&
            rate <= BigInt.from(10000) &&
            x['addToVault'] is bool,
      );
      final agreed =
          (minor * qty * rate + BigInt.from(5000)) ~/ BigInt.from(10000);
      _check(_integer(x['creditMinor']) == agreed);
      if (x['cardId'] == null) {
        _check(
          x['printingId'] == null &&
              x['condition'] == null &&
              x['printingGvId'] == null &&
              x['addToVault'] == false,
        );
      } else {
        _check(
          _id(x['cardId']) &&
              _id(x['printingId']) &&
              qty == BigInt.one &&
              ['NM', 'LP', 'MP', 'HP', 'DMG'].contains(x['condition']),
        );
        _text(x['printingGvId'], 100, required: true);
      }
      if (x['addToVault'] == true) {
        _check(x['cardId'] != null && _id(x['instanceId']));
        _text(x['gvviId'], 100, required: true);
      } else {
        _check(x['instanceId'] == null && x['gvviId'] == null);
      }
      value += minor * qty;
      credit += agreed;
    }
    _check(
      value <= BigInt.from(100000000) &&
          credit <= BigInt.from(100000000) &&
          _integer(t['totalValueMinor']) == value &&
          _integer(t['totalCreditMinor']) == credit &&
          t['balanceMinor'] is num &&
          BigInt.from(t['balanceMinor'] as num) == total - credit,
    );
  }
  receiptTenders(r);
}

Map<String, dynamic> eventReport({
  required dynamic state,
  required String ownerId,
  required String eventId,
  required String bookRevision,
  required List<dynamic> receipts,
  required List<dynamic> snapshots,
  String query = '',
  String method = '',
}) {
  final loaded = validateEventState(state, ownerId, eventId),
      selected = loaded['selected'] as Map;
  _check(
    loaded['receiptAccess'] == true &&
        selected['bookRevision'] == bookRevision &&
        query.length <= 500 &&
        method.length <= 100 &&
        receipts.length <= 10000,
  );
  final unique = <String, Map<String, dynamic>>{}, sources = <String>{};
  for (final value in receipts) {
    _check(value is Map);
    final r = Map<String, dynamic>.from(value as Map);
    _check(_id(r['id']));
    final key = (r['id'] as String).toLowerCase(), prior = unique[key];
    if (prior != null) {
      _check(jsonEncode(_stable(prior)) == jsonEncode(_stable(r)));
    }
    unique[key] = r;
  }
  for (final r in unique.values) {
    _receipt(r);
    for (final item in r['items'] as List) {
      _check(
        _integer(item['lineMinor']) ==
            _integer(item['quantity']) * _integer(item['unitMinor']),
      );
    }
    if (r['sourceDispositionId'] != null) {
      _check(sources.add(r['sourceDispositionId'] as String));
    }
  }
  _check(
    jsonEncode({
          'version': 1,
          'storeName': '',
          'customers': [],
          'receipts': unique.values
              .map((r) => {'receipt': r, 'customerId': null})
              .toList(),
        }).length <=
        10000000,
  );
  final assigned = (selected['assignments'] as List)
      .where((a) => a['eventId'] == eventId)
      .map((a) => a['receiptId'] as String)
      .toList();
  for (final id in assigned) {
    _check(
      unique.containsKey(id) &&
          !(selected['receiptIdentityConflicts'] as List).contains(id),
    );
  }
  final search = query.trim().toLowerCase(),
      rows = <Map<String, dynamic>>[],
      payments = <String, BigInt>{};
  var sales = BigInt.zero,
      tax = BigInt.zero,
      received = BigInt.zero,
      paid = BigInt.zero,
      credit = BigInt.zero,
      units = BigInt.zero,
      purchasedUnits = BigInt.zero,
      purchases = BigInt.zero,
      cashReceived = BigInt.zero,
      cashPaid = BigInt.zero,
      tendered = BigInt.zero,
      change = BigInt.zero;
  var saleTransactions = 0, purchaseTransactions = 0, unknownCashTender = 0;
  for (final id in assigned) {
    final r = unique[id]!, tenders = receiptTenders(r);
    if (method.isNotEmpty &&
        r['method'] != method &&
        !tenders.any((t) => t['method'] == method)) {
      continue;
    }
    final searchable = [
      r['number'],
      r['customerName'],
      ...(r['items'] as List).map((i) => i['description']),
      ...((r['tradeIn'] as Map?)?['items'] as List? ?? []).map(
        (i) => i['description'],
      ),
    ].join(' ').toLowerCase();
    if (!searchable.contains(search)) continue;
    rows.add(r);
    final purchase = isPurchaseReceipt(r),
        quantity = (r['items'] as List).fold(
          BigInt.zero,
          (n, i) => n + _integer(i['quantity']),
        );
    final balance = purchase
        ? -_integer(r['purchaseMinor'])
        : _integer(r['totalMinor']) -
              _integer((r['tradeIn'] as Map?)?['totalCreditMinor'] ?? 0);
    if (balance > BigInt.zero) {
      received += balance;
    } else {
      paid -= balance;
    }
    if (purchase) {
      purchases += _integer(r['purchaseMinor']);
      purchasedUnits += quantity;
      purchaseTransactions++;
    } else {
      sales += _integer(r['subtotalMinor']) - _integer(r['discountMinor'] ?? 0);
      tax += _integer(r['taxMinor']);
      credit += _integer((r['tradeIn'] as Map?)?['totalCreditMinor'] ?? 0);
      units += quantity;
      saleTransactions++;
    }
    for (final t in tenders) {
      final amount = _integer(t['amountMinor']),
          signed = balance < BigInt.zero ? -amount : amount,
          key = t['method'] as String;
      payments[key] = (payments[key] ?? BigInt.zero) + signed;
      if (key == 'Cash') {
        if (balance >= BigInt.zero) {
          cashReceived += amount;
        } else {
          cashPaid += amount;
        }
        if (balance > BigInt.zero) {
          if (r['payments'] != null) {
            tendered += _integer(t['tenderedMinor']);
            change += _integer(t['tenderedMinor']) - amount;
          } else {
            unknownCashTender++;
          }
        }
      }
    }
  }
  rows.sort((a, b) {
    final time = DateTime.parse(
      b['createdAt'] as String,
    ).compareTo(DateTime.parse(a['createdAt'] as String));
    return time != 0 ? time : (a['id'] as String).compareTo(b['id'] as String);
  });
  final expenses = (selected['expenses'] as List)
          .where((e) => e['voided'] == false)
          .toList(),
      operating = expenses.fold(
        BigInt.zero,
        (n, e) => n + BigInt.parse(e['amountMinor'] as String),
      ),
      profit = salesProfit(rows, snapshots),
      paymentKeys = payments.keys.toList()..sort();
  return {
    'version': 1,
    'currency': 'USD',
    'event': (loaded['events'] as List).firstWhere(
      (e) => e['eventId'] == eventId,
    ),
    'eventRevision': loaded['revision'],
    'bookRevision': bookRevision,
    'rows': rows,
    'expenses': expenses,
    'receiptFilter': {'query': query, 'method': method},
    'receiptsFiltered': search.isNotEmpty || method.isNotEmpty,
    'assignedReceipts': assigned.length,
    'transactions': rows.length,
    'saleTransactions': saleTransactions,
    'purchaseTransactions': purchaseTransactions,
    'salesMinor': '$sales',
    'taxMinor': '$tax',
    'receivedMinor': '$received',
    'paidMinor': '$paid',
    'tradeCreditMinor': '$credit',
    'units': '$units',
    'purchasedUnits': '$purchasedUnits',
    'inventoryPurchaseMinor': '$purchases',
    'cashReceivedMinor': '$cashReceived',
    'cashPaidMinor': '$cashPaid',
    'knownCashTenderedMinor': '$tendered',
    'knownCashChangeMinor': '$change',
    'unknownCashTenderReceipts': unknownCashTender,
    'payments': {for (final key in paymentKeys) key: '${payments[key]}'},
    'operatingExpenseMinor': '$operating',
    'voidedExpenseCount':
        (selected['expenses'] as List).length - expenses.length,
    'profit': profit,
    'knownCostEventSubtotalMinor': profit['knownProfitMinor'] == null
        ? null
        : '${BigInt.parse(profit['knownProfitMinor'] as String) - operating}',
  };
}
