import 'sale_discount.dart';
import 'sales_payments.dart';

const _limit = 100000000;
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _id(dynamic v) => v is String && _uuid.hasMatch(v);
bool _integer(dynamic v, int min, int max) => v is int && v >= min && v <= max;
bool _detail(dynamic v, int max, [bool required = false]) =>
    v is String &&
    v.length <= max &&
    (!required || v.trim().isNotEmpty) &&
    !RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]').hasMatch(v);
Never _fail() => throw const FormatException(
  'Discounted sale needs review. Preserve the original request or receipt.',
);
void _check(bool v) {
  if (!v) _fail();
}

Map<String, dynamic> _keys(dynamic v, List<String> fields) {
  if (v is! Map || v.length != fields.length || !fields.every(v.containsKey)) {
    _fail();
  }
  return Map<String, dynamic>.from(v);
}

dynamic _freeze(dynamic v) {
  if (v is Map) {
    return Map<String, dynamic>.unmodifiable(
      v.map((k, c) => MapEntry(k as String, _freeze(c))),
    );
  }
  if (v is List) return List<dynamic>.unmodifiable(v.map(_freeze));
  return v;
}

bool _same(dynamic a, dynamic b) {
  if (a == b) return true;
  if (a is List && b is List) {
    return a.length == b.length &&
        List.generate(a.length, (i) => _same(a[i], b[i])).every((v) => v);
  }
  if (a is Map && b is Map) {
    return a.length == b.length &&
        a.keys.every((k) => b.containsKey(k) && _same(a[k], b[k]));
  }
  return false;
}

const _cartFields = [
  'version',
  'storeName',
  'method',
  'items',
  'discountMinor',
  'taxMinor',
  'note',
  'customer',
  'customerId',
  'payments',
];
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
  'payments',
];
List<Map<String, dynamic>> _entries(dynamic v) {
  if (v is! List) _fail();
  return v
      .map((e) => _keys(e, ['method', 'amountMinor', 'tenderedMinor']))
      .toList();
}

List<Map<String, dynamic>> _lines(dynamic value, bool recorded) {
  if (value is! List || value.isEmpty || value.length > 50) _fail();
  final seen = <String>{};
  return value.map((v) {
    final i = _keys(
      v,
      recorded
          ? ['description', 'quantity', 'unitMinor', 'lineMinor']
          : ['instanceId', 'description', 'quantity', 'unitMinor'],
    );
    _check(
      _detail(i['description'], 200, true) &&
          _integer(i['quantity'], 1, 999) &&
          _integer(i['unitMinor'], 1, _limit),
    );
    if (recorded) {
      _check(
        i['lineMinor'] == (i['quantity'] as int) * (i['unitMinor'] as int),
      );
    } else if (i['instanceId'] != null) {
      _check(
        _id(i['instanceId']) &&
            i['quantity'] == 1 &&
            seen.add((i['instanceId'] as String).toLowerCase()),
      );
    }
    return i;
  }).toList();
}

Map<String, dynamic> validateDiscountedSaleRequest(dynamic value) {
  final row = _keys(value, ['id', 'cart']), c = _keys(row['cart'], _cartFields);
  _check(
    _id(row['id']) &&
        c['version'] == 6 &&
        _detail(c['storeName'], 120, true) &&
        _detail(c['note'], 500) &&
        _integer(c['taxMinor'], 0, _limit) &&
        (c['customerId'] == null || _id(c['customerId'])),
  );
  final customer = _keys(c['customer'], [
    'name',
    'email',
    'phone',
    'wants',
    'notes',
  ]);
  for (final e in {
    'name': 120,
    'email': 254,
    'phone': 40,
    'wants': 1000,
    'notes': 2000,
  }.entries) {
    _check(_detail(customer[e.key], e.value));
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
  final items = _lines(c['items'], false),
      allocation = saleDiscountAllocation(items, c['discountMinor']);
  final total =
      int.parse(allocation['netSalesMinor'] as String) + (c['taxMinor'] as int);
  _check(_integer(total, 1, _limit));
  final payments = salesPaymentSnapshot(_entries(c['payments']), total);
  _check(c['method'] == salesPaymentMethod(_entries(payments['entries'])));
  return _freeze({
        'id': row['id'],
        'cart': {
          ...c,
          'items': items,
          'customer': customer,
          'payments': payments['entries'],
        },
      })
      as Map<String, dynamic>;
}

Map<String, dynamic> validateDiscountedSaleReceipt(dynamic value) {
  final r = _keys(value, _receiptFields);
  _check(
    r['version'] == 1 &&
        _id(r['id']) &&
        _detail(r['storeName'], 120, true) &&
        _detail(r['customerName'], 120) &&
        _detail(r['note'], 500),
  );
  final stamp = r['createdAt'];
  _check(
    stamp is String &&
        RegExp(
          r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$',
        ).hasMatch(stamp) &&
        !stamp.startsWith('0000-') &&
        DateTime.tryParse(stamp)?.toUtc().toIso8601String() == stamp,
  );
  _check(
    r['number'] ==
            'GV-${(stamp as String).substring(0, 10).replaceAll('-', '')}-${(r['id'] as String).substring(0, 8).toUpperCase()}' &&
        (r['sourceDispositionId'] == null || _id(r['sourceDispositionId'])),
  );
  final items = _lines(r['items'], true),
      allocation = saleDiscountAllocation(items, r['discountMinor']);
  _check(
    r['subtotalMinor'] == int.parse(allocation['subtotalMinor'] as String) &&
        _integer(r['taxMinor'], 0, _limit) &&
        r['totalMinor'] ==
            int.parse(allocation['netSalesMinor'] as String) +
                (r['taxMinor'] as int) &&
        _integer(r['totalMinor'], 1, _limit),
  );
  final p = _keys(r['payments'], [
        'version',
        'balanceMinor',
        'entries',
        'changeMinor',
      ]),
      payments = salesPaymentSnapshot(
        _entries(p['entries']),
        r['totalMinor'] as int,
      );
  _check(
    _same(p, payments) &&
        r['method'] == salesPaymentMethod(_entries(payments['entries'])),
  );
  return _freeze({...r, 'items': items, 'payments': payments})
      as Map<String, dynamic>;
}

Map<String, dynamic> confirmedDiscountedSale(dynamic value, dynamic pending) {
  final request = validateDiscountedSaleRequest(pending),
      v = _keys(value, ['version', 'request', 'receipt']);
  _check(v['version'] == 1);
  final echo = validateDiscountedSaleRequest(v['request']);
  _check(
    (echo['id'] as String).toLowerCase() ==
            (request['id'] as String).toLowerCase() &&
        _same(echo['cart'], request['cart']),
  );
  final r = validateDiscountedSaleReceipt(v['receipt']),
      c = request['cart'] as Map;
  _check(
    (r['id'] as String).toLowerCase() ==
            (request['id'] as String).toLowerCase() &&
        r['storeName'] == (c['storeName'] as String).trim() &&
        r['note'] == c['note'] &&
        r['discountMinor'] == c['discountMinor'] &&
        r['taxMinor'] == c['taxMinor'] &&
        r['method'] == c['method'] &&
        _same(r['payments']['entries'], c['payments']) &&
        (r['items'] as List).length == (c['items'] as List).length &&
        (c['customerId'] != null ||
            r['customerName'] == c['customer']['name']) &&
        (r['sourceDispositionId'] != null) ==
            (c['items'] as List).any((i) => i['instanceId'] != null),
  );
  for (var i = 0; i < (r['items'] as List).length; i++) {
    final actual = r['items'][i], expected = c['items'][i];
    _check(
      actual['description'] == (expected['description'] as String).trim() &&
          actual['quantity'] == expected['quantity'] &&
          actual['unitMinor'] == expected['unitMinor'],
    );
  }
  return r;
}

// A missing receipt or a network error cannot authorize clearing a pending sale.
Map<String, dynamic> confirmedDiscountedSaleCancellation(
  dynamic value,
  dynamic pending,
) {
  final request = validateDiscountedSaleRequest(pending),
      v = _keys(value, ['version', 'request', 'status']);
  _check(v['version'] == 1 && v['status'] == 'cancelled');
  final echo = validateDiscountedSaleRequest(v['request']);
  _check(
    (echo['id'] as String).toLowerCase() ==
            (request['id'] as String).toLowerCase() &&
        _same(echo['cart'], request['cart']),
  );
  return _freeze({'version': 1, 'request': echo, 'status': 'cancelled'})
      as Map<String, dynamic>;
}

Map<String, dynamic> discountedSaleCustomerView(dynamic value) {
  final r = validateDiscountedSaleReceipt(value);
  return _freeze({
        for (final k in [
          'number',
          'createdAt',
          'storeName',
          'items',
          'subtotalMinor',
          'discountMinor',
          'taxMinor',
          'totalMinor',
          'method',
          'payments',
        ])
          k: r[k],
      })
      as Map<String, dynamic>;
}

String discountedSaleReceiptText(dynamic value, String Function(int) money) {
  final r = discountedSaleCustomerView(value);
  return [
    r['storeName'],
    'SALES RECEIPT',
    r['number'],
    r['createdAt'],
    for (final i in r['items'] as List)
      '${i['quantity']} × ${i['description']} @ ${money(i['unitMinor'] as int)} — ${money(i['lineMinor'] as int)}',
    'Subtotal: ${money(r['subtotalMinor'] as int)}',
    'Discount: ${money(r['discountMinor'] as int)}',
    'Tax recorded: ${money(r['taxMinor'] as int)}',
    'TOTAL: ${money(r['totalMinor'] as int)}',
    ...salesPaymentLines(r, money),
    'Exchange completed and recorded by the vendor. Grookai did not move money.',
  ].join('\n');
}
