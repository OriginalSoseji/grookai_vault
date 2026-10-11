import 'discounted_sale.dart';
import 'sales_payments.dart';

const _limit = 100000000;
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _id(dynamic v) => v is String && _uuid.hasMatch(v);
bool _text(dynamic v, int n) => v is String && v.length <= n;
bool _integer(dynamic v, int a, int b) => v is int && v >= a && v <= b;
void _check(bool v) {
  if (!v) {
    throw const FormatException(
      'Saved discounted sale needs review. Preserve this device data.',
    );
  }
}

const _fields = [
  'kind',
  'id',
  'label',
  'storeName',
  'items',
  'trades',
  'discountMinor',
  'taxMinor',
  'method',
  'note',
  'customerId',
  'customer',
];
bool isDiscountedDraft(Object? v) => v is Map && v['kind'] == 'discounted-sale';
Map<String, int> _amounts(Map d) {
  final subtotal = (d['items'] as List).fold<int>(
    0,
    (n, i) => n + (i['quantity'] as int) * (i['unitMinor'] as int),
  );
  final total = subtotal - (d['discountMinor'] as int) + (d['taxMinor'] as int);
  return {
    'subtotal': subtotal,
    'discount': d['discountMinor'] as int,
    'credit': 0,
    'total': total,
    'balance': total,
  };
}

// Incomplete discount and split reconciliation remains editable, never clamped.
Map<String, dynamic> validateDiscountedDraft(Object? value) {
  _check(
    value is Map &&
        isDiscountedDraft(value) &&
        _fields.every(value.containsKey) &&
        value.keys.every([..._fields, 'payments'].contains) &&
        _id(value['id']) &&
        _text(value['label'], 120) &&
        _text(value['storeName'], 120) &&
        _text(value['note'], 500) &&
        _integer(value['discountMinor'], 0, _limit) &&
        _integer(value['taxMinor'], 0, _limit) &&
        salesTenderMethods.contains(value['method']) &&
        (value['customerId'] == null || _id(value['customerId'])) &&
        value['items'] is List &&
        (value['items'] as List).length <= 50 &&
        value['trades'] is List &&
        (value['trades'] as List).isEmpty,
  );
  final row = Map<String, dynamic>.from(value as Map),
      customer = row['customer'];
  const limits = {
    'name': 120,
    'email': 254,
    'phone': 40,
    'wants': 1000,
    'notes': 2000,
  };
  _check(
    customer is Map &&
        customer.length == 5 &&
        limits.entries.every((e) => _text(customer[e.key], e.value)),
  );
  final seen = <String>{};
  for (final line in row['items'] as List) {
    _check(
      line is Map &&
          line.keys.every(
            [
              'instanceId',
              'gvviId',
              'description',
              'quantity',
              'unitMinor',
              'askingMinor',
              'image',
            ].contains,
          ) &&
          _text(line['description'], 200) &&
          (line['description'] as String).trim().isNotEmpty &&
          _integer(line['quantity'], 1, 999) &&
          _integer(line['unitMinor'], 1, _limit),
    );
    final item = line as Map;
    if (item['instanceId'] != null) {
      _check(
        _id(item['instanceId']) &&
            item['quantity'] == 1 &&
            seen.add((item['instanceId'] as String).toLowerCase()),
      );
    }
    _check(!item.containsKey('gvviId') || _text(item['gvviId'], 100));
    _check(item['image'] == null || _text(item['image'], 4096));
    _check(
      item['askingMinor'] == null || _integer(item['askingMinor'], 0, _limit),
    );
  }
  _check(_integer(_amounts(row)['subtotal'], 0, _limit));
  if (row.containsKey('payments')) {
    final payments = row['payments'];
    _check(
      payments is List &&
          payments.length <= 4 &&
          payments.every(
            (e) =>
                e is Map &&
                e.length == 3 &&
                [
                  'method',
                  'amountMinor',
                  'tenderedMinor',
                ].every(e.containsKey) &&
                salesTenderMethods.contains(e['method']) &&
                _integer(e['amountMinor'], 0, _limit) &&
                _integer(e['tenderedMinor'], 0, _limit),
          ),
    );
  }
  return row;
}

Map<String, dynamic> newDiscountedDraft(String id, [String storeName = '']) =>
    validateDiscountedDraft({
      'kind': 'discounted-sale',
      'id': id,
      'label': 'Walk-up customer',
      'storeName': storeName,
      'items': <dynamic>[],
      'trades': <dynamic>[],
      'discountMinor': 0,
      'taxMinor': 0,
      'method': 'Cash',
      'note': '',
      'customerId': null,
      'customer': {
        'name': '',
        'email': '',
        'phone': '',
        'wants': '',
        'notes': '',
      },
    });
Map<String, int> discountedDraftTotals(Object? value) =>
    _amounts(validateDiscountedDraft(value));
Map<String, dynamic> discountedDraftRequest(
  Object? value,
  String id,
  bool confirmed,
) {
  final d = validateDiscountedDraft(value),
      amounts = _amounts(d),
      balance = amounts['balance']!;
  _check(
    confirmed &&
        balance > 0 &&
        balance <= _limit &&
        (d['discountMinor'] as int) <= amounts['subtotal']!,
  );
  final entries =
      d['payments'] as List? ??
      [
        {
          'method': d['method'],
          'amountMinor': balance,
          'tenderedMinor': balance,
        },
      ];
  final payments = salesPaymentSnapshot(
    entries.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
    balance,
  );
  return validateDiscountedSaleRequest({
    'id': id,
    'cart': {
      'version': 6,
      'storeName': (d['storeName'] as String).trim(),
      'method': salesPaymentMethod(
        (payments['entries'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
      ),
      'items': (d['items'] as List)
          .map(
            (i) => {
              'instanceId': i['instanceId'],
              'description': (i['description'] as String).trim(),
              'quantity': i['quantity'],
              'unitMinor': i['unitMinor'],
            },
          )
          .toList(),
      'discountMinor': d['discountMinor'],
      'taxMinor': d['taxMinor'],
      'note': d['note'],
      'customerId': d['customerId'],
      'customer': {...d['customer'] as Map},
      'payments': payments['entries'],
    },
  });
}

Map<String, dynamic> discountedDraftCustomerView(Object? value) {
  final d = validateDiscountedDraft(value);
  return {
    'storeName': d['storeName'],
    'items': (d['items'] as List)
        .map(
          (i) => {
            'description': i['description'],
            'quantity': i['quantity'],
            'unitMinor': i['unitMinor'],
          },
        )
        .toList(),
    'trades': <dynamic>[],
    'taxMinor': d['taxMinor'],
    ..._amounts(d),
  };
}
