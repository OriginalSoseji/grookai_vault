import 'sales_payments.dart';

// Exact agreed consideration and receipt verification; only the server commits.
const _limit = 100000000;
const _fields = [
  'description',
  'valueMinor',
  'rateBps',
  'quantity',
  'cardId',
  'printingId',
  'condition',
  'addToVault',
  'creditMinor',
];
const _recordedFields = [..._fields, 'printingGvId', 'instanceId', 'gvviId'];
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _id(Object? value) => value is String && _uuid.hasMatch(value);
bool _integer(Object? value, int min, int max) =>
    value is int && value >= min && value <= max;
Never _fail() => throw const FormatException(
  'Negotiated trade needs review. Preserve the original request or receipt.',
);
void _check(bool value) {
  if (!value) _fail();
}

Map<String, dynamic> _keys(Object? value, List<String> fields) {
  if (value is! Map ||
      value.length != fields.length ||
      !fields.every(value.containsKey)) {
    _fail();
  }
  return Map<String, dynamic>.from(value);
}

bool _text(Object? value, int max) =>
    value is String &&
    value.trim().isNotEmpty &&
    value.length <= max &&
    !RegExp(r'[\x00-\x1f\x7f]').hasMatch(value);
bool _detail(Object? value, int max, [bool required = false]) =>
    value is String &&
    value.length <= max &&
    (!required || value.trim().isNotEmpty) &&
    !RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]').hasMatch(value);
dynamic _freeze(dynamic value) {
  if (value is Map) {
    return Map<String, dynamic>.unmodifiable(
      value.map((key, child) => MapEntry(key as String, _freeze(child))),
    );
  }
  if (value is List) return List<dynamic>.unmodifiable(value.map(_freeze));
  return value;
}

bool _same(dynamic a, dynamic b) {
  if (a is Map && b is Map) {
    return a.length == b.length &&
        a.keys.every((key) => b.containsKey(key) && _same(a[key], b[key]));
  }
  if (a is List && b is List) {
    return a.length == b.length &&
        List.generate(a.length, (i) => i).every((i) => _same(a[i], b[i]));
  }
  return a == b;
}

Map<String, dynamic> validateNegotiatedTradeLine(
  Object? value, [
  bool recorded = false,
]) {
  final row = _keys(value, recorded ? _recordedFields : _fields);
  _check(
    _text(row['description'], 200) &&
        _integer(row['quantity'], 1, 999) &&
        _integer(row['creditMinor'], 0, _limit) &&
        row['addToVault'] is bool,
  );
  _check(
    row['valueMinor'] == null && row['rateBps'] == null ||
        _integer(row['valueMinor'], 1, _limit) &&
            _integer(row['rateBps'], 1, 10000) &&
            (row['valueMinor'] as int) * (row['quantity'] as int) <= _limit,
  );
  if (row['cardId'] == null) {
    _check(
      row['printingId'] == null &&
          row['condition'] == null &&
          row['addToVault'] == false,
    );
    if (recorded) _check(row['printingGvId'] == null);
  } else {
    _check(
      _id(row['cardId']) &&
          _id(row['printingId']) &&
          row['quantity'] == 1 &&
          ['NM', 'LP', 'MP', 'HP', 'DMG'].contains(row['condition']),
    );
    if (recorded) _check(_text(row['printingGvId'], 100));
  }
  if (recorded) {
    if (row['addToVault'] == true) {
      _check(
        _id(row['instanceId']) &&
            _text(row['gvviId'], 100) &&
            RegExp(r'^GVVI-[A-Z0-9-]+$').hasMatch(row['gvviId'] as String),
      );
    } else {
      _check(row['instanceId'] == null && row['gvviId'] == null);
    }
  }
  return _freeze(row) as Map<String, dynamic>;
}

Map<String, dynamic> negotiatedTradeTotals(
  Object? values, [
  bool recorded = false,
]) {
  if (values is! List || values.isEmpty || values.length > 50) _fail();
  var reference = 0, credit = 0, allKnown = true;
  final ids = <String>{}, labels = <String>{};
  final items = values.map((value) {
    final item = validateNegotiatedTradeLine(value, recorded);
    credit += item['creditMinor'] as int;
    if (item['valueMinor'] == null) {
      allKnown = false;
    } else {
      reference += (item['valueMinor'] as int) * (item['quantity'] as int);
    }
    _check(credit <= _limit && reference <= _limit);
    if (recorded && item['addToVault'] == true) {
      _check(
        ids.add((item['instanceId'] as String).toLowerCase()) &&
            labels.add(item['gvviId'] as String),
      );
    }
    return item;
  }).toList();
  return _freeze({
        'items': items,
        'totalValueMinor': allKnown ? reference : null,
        'totalCreditMinor': credit,
      })
      as Map<String, dynamic>;
}

Map<String, dynamic> validateNegotiatedTradeReceipt(
  Object? value,
  Object? saleTotal,
) {
  final row = _keys(value, [
    'version',
    'items',
    'totalValueMinor',
    'totalCreditMinor',
    'balanceMinor',
  ]);
  _check(row['version'] == 2 && _integer(saleTotal, 1, _limit));
  final totals = negotiatedTradeTotals(row['items'], true);
  final balance = (saleTotal as int) - (totals['totalCreditMinor'] as int);
  _check(
    row['totalValueMinor'] == totals['totalValueMinor'] &&
        row['totalCreditMinor'] == totals['totalCreditMinor'] &&
        row['balanceMinor'] == balance,
  );
  return _freeze({'version': 2, ...totals, 'balanceMinor': balance})
      as Map<String, dynamic>;
}

const _cartFields = [
  'version',
  'storeName',
  'method',
  'items',
  'taxMinor',
  'note',
  'customer',
  'customerId',
  'trades',
  'payments',
];
const _saleFields = ['instanceId', 'description', 'quantity', 'unitMinor'];
const _receiptFields = [
  'version',
  'id',
  'number',
  'createdAt',
  'storeName',
  'customerName',
  'method',
  'items',
  'subtotalMinor',
  'discountMinor',
  'taxMinor',
  'totalMinor',
  'note',
  'sourceDispositionId',
  'tradeIn',
  'payments',
];
List<Map<String, dynamic>> _entries(Object? value) {
  if (value is! List) _fail();
  return value
      .map((entry) => _keys(entry, ['method', 'amountMinor', 'tenderedMinor']))
      .toList();
}

Map<String, dynamic> validateNegotiatedTradeRequest(Object? value) {
  final row = _keys(value, ['id', 'cart']),
      cart = _keys(row['cart'], _cartFields);
  _check(
    _id(row['id']) &&
        cart['version'] == 5 &&
        _detail(cart['storeName'], 120, true) &&
        _detail(cart['note'], 350) &&
        _integer(cart['taxMinor'], 0, _limit) &&
        (cart['customerId'] == null || _id(cart['customerId'])),
  );
  final customer = _keys(cart['customer'], [
    'name',
    'email',
    'phone',
    'wants',
    'notes',
  ]);
  for (final entry in {
    'name': 120,
    'email': 254,
    'phone': 40,
    'wants': 1000,
    'notes': 2000,
  }.entries) {
    _check(_detail(customer[entry.key], entry.value));
  }
  _check(
    !RegExp(r'[\r\n]').hasMatch(customer['name'] as String) &&
        ((customer['email'] as String).isEmpty ||
            RegExp(
              r'^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$',
            ).hasMatch(customer['email'] as String)) &&
        ((customer['phone'] as String).isEmpty ||
            RegExp(
              r'^\+?[0-9 ()-]{7,40}$',
            ).hasMatch(customer['phone'] as String)),
  );
  final source = cart['items'];
  if (source is! List || source.isEmpty || source.length > 50) _fail();
  var subtotal = 0;
  final seen = <String>{};
  final items = source.map((value) {
    final item = _keys(value, _saleFields);
    _check(
      _detail(item['description'], 200, true) &&
          _integer(item['quantity'], 1, 999) &&
          _integer(item['unitMinor'], 1, _limit),
    );
    if (item['instanceId'] != null) {
      _check(
        _id(item['instanceId']) &&
            item['quantity'] == 1 &&
            seen.add((item['instanceId'] as String).toLowerCase()),
      );
    }
    subtotal += (item['quantity'] as int) * (item['unitMinor'] as int);
    _check(subtotal + (cart['taxMinor'] as int) <= _limit);
    return item;
  }).toList();
  final trades = negotiatedTradeTotals(cart['trades']);
  final payments = salesPaymentSnapshot(
    _entries(cart['payments']),
    subtotal + (cart['taxMinor'] as int) - (trades['totalCreditMinor'] as int),
  );
  _check(cart['method'] == salesPaymentMethod(_entries(payments['entries'])));
  return _freeze({
        'id': row['id'],
        'cart': {
          ...cart,
          'items': items,
          'trades': trades['items'],
          'payments': payments['entries'],
          'customer': customer,
        },
      })
      as Map<String, dynamic>;
}

bool isNegotiatedTradeReceipt(Object? value) =>
    value is Map &&
    value['version'] == 1 &&
    value['tradeIn'] is Map &&
    value['tradeIn']['version'] == 2;
Map<String, dynamic> validateNegotiatedSaleReceipt(Object? value) {
  final row = _keys(value, _receiptFields);
  _check(
    isNegotiatedTradeReceipt(row) &&
        _id(row['id']) &&
        _detail(row['storeName'], 120, true) &&
        _detail(row['customerName'], 120) &&
        _detail(row['note'], 350),
  );
  final stamp = row['createdAt'],
      date = row['createdAt'] is String
          ? DateTime.tryParse(row['createdAt'] as String)
          : null;
  _check(
    stamp is String &&
        RegExp(
          r'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$',
        ).hasMatch(stamp) &&
        !stamp.startsWith('0000-') &&
        date != null &&
        date.toUtc().toIso8601String() == stamp &&
        date.microsecond == 0,
  );
  _check(
    row['number'] ==
        'GV-${(stamp as String).substring(0, 10).replaceAll('-', '')}-${(row['id'] as String).substring(0, 8).toUpperCase()}',
  );
  final source = row['items'];
  if (source is! List || source.isEmpty || source.length > 50) _fail();
  var subtotal = 0;
  final items = source.map((value) {
    final item = _keys(value, [
      'description',
      'quantity',
      'unitMinor',
      'lineMinor',
    ]);
    _check(
      _detail(item['description'], 200, true) &&
          _integer(item['quantity'], 1, 999) &&
          _integer(item['unitMinor'], 1, _limit),
    );
    final extended = (item['quantity'] as int) * (item['unitMinor'] as int);
    _check(item['lineMinor'] == extended);
    subtotal += extended;
    return item;
  }).toList();
  _check(
    row['subtotalMinor'] == subtotal &&
        row['discountMinor'] == 0 &&
        _integer(row['taxMinor'], 0, _limit) &&
        row['totalMinor'] == subtotal + (row['taxMinor'] as int) &&
        _integer(row['totalMinor'], 1, _limit) &&
        (row['sourceDispositionId'] == null || _id(row['sourceDispositionId'])),
  );
  final trade = validateNegotiatedTradeReceipt(
    row['tradeIn'],
    row['totalMinor'],
  );
  final stored = _keys(row['payments'], [
    'version',
    'balanceMinor',
    'entries',
    'changeMinor',
  ]);
  final payments = salesPaymentSnapshot(
    _entries(stored['entries']),
    trade['balanceMinor'] as int,
  );
  _check(
    _same(stored, payments) &&
        row['method'] == salesPaymentMethod(_entries(payments['entries'])),
  );
  return _freeze({
        ...row,
        'items': items,
        'tradeIn': trade,
        'payments': payments,
      })
      as Map<String, dynamic>;
}

Map<String, dynamic> confirmedNegotiatedTrade(Object? value, Object? pending) {
  final request = validateNegotiatedTradeRequest(pending),
      ack = _keys(value, ['version', 'request', 'receipt']),
      echoed = validateNegotiatedTradeRequest(ack['request']);
  _check(
    ack['version'] == 1 &&
        (echoed['id'] as String).toLowerCase() ==
            (request['id'] as String).toLowerCase() &&
        _same(echoed['cart'], request['cart']),
  );
  final receipt = validateNegotiatedSaleReceipt(ack['receipt']),
      cart = request['cart'] as Map;
  final items = receipt['items'] as List,
      trades = receipt['tradeIn']['items'] as List,
      expectedItems = cart['items'] as List,
      expectedTrades = cart['trades'] as List;
  _check(
    (receipt['id'] as String).toLowerCase() ==
            (request['id'] as String).toLowerCase() &&
        receipt['storeName'] == (cart['storeName'] as String).trim() &&
        receipt['note'] == cart['note'] &&
        receipt['taxMinor'] == cart['taxMinor'] &&
        receipt['method'] == cart['method'] &&
        _same(receipt['payments']['entries'], cart['payments']) &&
        items.length == expectedItems.length &&
        trades.length == expectedTrades.length &&
        (cart['customerId'] != null ||
            receipt['customerName'] == cart['customer']['name']) &&
        (receipt['sourceDispositionId'] != null) ==
            expectedItems.any((item) => item['instanceId'] != null),
  );
  for (var i = 0; i < items.length; i++) {
    final item = items[i] as Map, expected = expectedItems[i] as Map;
    _check(
      item['description'] == (expected['description'] as String).trim() &&
          item['quantity'] == expected['quantity'] &&
          item['unitMinor'] == expected['unitMinor'],
    );
  }
  for (var i = 0; i < trades.length; i++) {
    final item = trades[i] as Map, expected = expectedTrades[i] as Map;
    for (final field in _fields) {
      if (field == 'description') {
        if (expected['cardId'] == null) {
          _check(item[field] == (expected[field] as String).trim());
        }
      } else if (['cardId', 'printingId'].contains(field) &&
          expected[field] != null) {
        _check(
          (item[field] as String).toLowerCase() ==
              (expected[field] as String).toLowerCase(),
        );
      } else {
        _check(item[field] == expected[field]);
      }
    }
  }
  return receipt;
}

Map<String, dynamic> negotiatedTradeCustomerView(Object? value) {
  final receipt = validateNegotiatedSaleReceipt(value),
      trade = receipt['tradeIn'] as Map;
  return _freeze({
        'number': receipt['number'],
        'createdAt': receipt['createdAt'],
        'storeName': receipt['storeName'],
        'items': receipt['items'],
        'subtotalMinor': receipt['subtotalMinor'],
        'taxMinor': receipt['taxMinor'],
        'totalMinor': receipt['totalMinor'],
        'trades': (trade['items'] as List)
            .map(
              (item) => {
                'description': item['description'],
                'quantity': item['quantity'],
                'creditMinor': item['creditMinor'],
              },
            )
            .toList(),
        'totalCreditMinor': trade['totalCreditMinor'],
        'balanceMinor': trade['balanceMinor'],
        'method': receipt['method'],
        'payments': receipt['payments'],
      })
      as Map<String, dynamic>;
}

String negotiatedTradeReceiptText(Object? value, String Function(int) money) {
  final receipt = negotiatedTradeCustomerView(value);
  return [
    receipt['storeName'],
    'SALES RECEIPT',
    receipt['number'],
    receipt['createdAt'],
    ...(receipt['items'] as List).map(
      (item) =>
          '${item['quantity']} × ${item['description']} @ ${money(item['unitMinor'] as int)} — ${money(item['lineMinor'] as int)}',
    ),
    'Subtotal: ${money(receipt['subtotalMinor'] as int)}',
    'Tax recorded: ${money(receipt['taxMinor'] as int)}',
    'TOTAL: ${money(receipt['totalMinor'] as int)}',
    'TRADE-INS',
    ...(receipt['trades'] as List).map(
      (item) =>
          '${item['quantity']} × ${item['description']} — ${money(item['creditMinor'] as int)} agreed credit',
    ),
    'Total trade credit: ${money(receipt['totalCreditMinor'] as int)}',
    ...salesPaymentLines({
      'totalMinor': receipt['totalMinor'],
      'tradeIn': {'balanceMinor': receipt['balanceMinor']},
      'method': receipt['method'],
      'payments': receipt['payments'],
    }, money),
    'Exchange completed and recorded by the vendor. Grookai did not move money.',
  ].join('\n');
}
