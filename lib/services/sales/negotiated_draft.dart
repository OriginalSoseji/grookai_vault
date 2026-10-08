// Negotiated entry preserves explicit agreements and legacy journal semantics.
import './negotiated_trade.dart';
import './sales_payments.dart';

final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _id(Object? v) => v is String && _uuid.hasMatch(v);
bool _text(Object? v, int n) => v is String && v.length <= n;
bool _integer(Object? v, int min, int max) => v is int && v >= min && v <= max;
void _check(bool v) {
  if (!v) {
    throw FormatException(
      'Saved trade needs review. Preserve this device data.',
    );
  }
}

bool isNegotiatedDraft(Object? v) =>
    v is Map && v['kind'] == 'negotiated-trade';
const _fields = [
  'kind',
  'id',
  'label',
  'storeName',
  'items',
  'trades',
  'taxMinor',
  'method',
  'note',
  'customerId',
  'customer',
];
Map<String, int> _amounts(Map draft) {
  final subtotal = (draft['items'] as List).fold<int>(
    0,
    (sum, line) => sum + (line['quantity'] as int) * (line['unitMinor'] as int),
  );
  final credit = (draft['trades'] as List).fold<int>(
    0,
    (sum, line) => sum + (line['creditMinor'] as int),
  );
  final total = subtotal + (draft['taxMinor'] as int);
  return {
    'subtotal': subtotal,
    'credit': credit,
    'total': total,
    'balance': total - credit,
  };
}

Map<String, dynamic> validateNegotiatedDraft(Object? value) {
  _check(
    value is Map &&
        isNegotiatedDraft(value) &&
        _fields.every(value.containsKey) &&
        value.keys.every([..._fields, 'payments'].contains) &&
        _id(value['id']) &&
        _text(value['label'], 120) &&
        _text(value['storeName'], 120) &&
        _text(value['note'], 350) &&
        _integer(value['taxMinor'], 0, 100000000) &&
        salesTenderMethods.contains(value['method']) &&
        (value['customerId'] == null || _id(value['customerId'])) &&
        value['items'] is List &&
        (value['items'] as List).length <= 50 &&
        value['trades'] is List &&
        (value['trades'] as List).length <= 50,
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
          _integer(line['unitMinor'], 1, 100000000),
    );
    final item = line as Map;
    if (item['instanceId'] != null) {
      _check(
        _id(item['instanceId']) &&
            item['quantity'] == 1 &&
            !seen.contains((item['instanceId'] as String).toLowerCase()),
      );
      seen.add((item['instanceId'] as String).toLowerCase());
    }
    _check(!item.containsKey('gvviId') || _text(item['gvviId'], 100));
    _check(item['image'] == null || _text(item['image'], 4096));
    _check(
      item['askingMinor'] == null ||
          _integer(item['askingMinor'], 0, 100000000),
    );
  }
  if ((row['trades'] as List).isNotEmpty) negotiatedTradeTotals(row['trades']);
  final total = _amounts(row);
  _check(
    _integer(total['total'], 0, 100000000) &&
        _integer(total['credit'], 0, 100000000),
  );
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
                  'amountMinor',
                  'method',
                  'tenderedMinor',
                ].every(e.containsKey) &&
                salesTenderMethods.contains(e['method']) &&
                _integer(e['amountMinor'], 0, 100000000) &&
                _integer(e['tenderedMinor'], 0, 100000000),
          ),
    );
  }
  return row;
}

Map<String, dynamic> newNegotiatedDraft(String id, [String storeName = '']) =>
    validateNegotiatedDraft({
      'kind': 'negotiated-trade',
      'id': id,
      'label': 'Walk-up trader',
      'storeName': storeName,
      'items': <dynamic>[],
      'trades': <dynamic>[],
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
Map<String, int> negotiatedDraftTotals(Object? draft) =>
    _amounts(validateNegotiatedDraft(draft));
Map<String, dynamic> addNegotiatedTrade(Object? draft, Object? line) {
  final row = validateNegotiatedDraft(draft);
  return validateNegotiatedDraft({
    ...row,
    'trades': [...row['trades'] as List, validateNegotiatedTradeLine(line)],
  });
}

Map<String, dynamic> negotiatedDraftRequest(
  Object? draft,
  String id,
  bool confirmed,
) {
  final row = validateNegotiatedDraft(draft);
  _check(confirmed);
  final balance = _amounts(row)['balance']!;
  final entries =
      row['payments'] as List? ??
      (balance == 0
          ? <dynamic>[]
          : [
              {
                'method': row['method'],
                'amountMinor': balance.abs(),
                'tenderedMinor': balance.abs(),
              },
            ]);
  final payments = salesPaymentSnapshot(
    entries.map((e) => Map<String, dynamic>.from(e as Map)).toList(),
    balance,
  );
  return validateNegotiatedTradeRequest({
    'id': id,
    'cart': {
      'version': 5,
      'storeName': (row['storeName'] as String).trim(),
      'method': salesPaymentMethod(
        (payments['entries'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
      ),
      'items': (row['items'] as List)
          .map(
            (line) => {
              'instanceId': line['instanceId'],
              'description': (line['description'] as String).trim(),
              'quantity': line['quantity'],
              'unitMinor': line['unitMinor'],
            },
          )
          .toList(),
      'trades': (row['trades'] as List)
          .map(
            (line) => {
              ...line as Map,
              'description': (line['description'] as String).trim(),
            },
          )
          .toList(),
      'taxMinor': row['taxMinor'],
      'note': row['note'],
      'customerId': row['customerId'],
      'customer': {...row['customer'] as Map},
      'payments': payments['entries'],
    },
  });
}

Map<String, dynamic> negotiatedDraftCustomerView(Object? draft) {
  final row = validateNegotiatedDraft(draft);
  return {
    'storeName': row['storeName'],
    'items': (row['items'] as List)
        .map(
          (line) => {
            'description': line['description'],
            'quantity': line['quantity'],
            'unitMinor': line['unitMinor'],
          },
        )
        .toList(),
    'trades': (row['trades'] as List)
        .map(
          (line) => {
            'description': line['description'],
            'quantity': line['quantity'],
            'creditMinor': line['creditMinor'],
          },
        )
        .toList(),
    'taxMinor': row['taxMinor'],
    ..._amounts(row),
  };
}
