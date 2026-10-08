import 'sales_payments.dart';

// Draft estimates and receipt verification only. The database commits purchases.
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _id(Object? value) => value is String && _uuid.hasMatch(value);
bool _integer(Object? value, int min, int max) =>
    value is int && value >= min && value <= max;
Never _fail(String message) => throw FormatException(message);
Map<String, dynamic> _keys(Object? value, List<String> keys) {
  if (value is! Map ||
      value.length != keys.length ||
      !keys.every(value.containsKey)) {
    _fail('Purchase fields need review.');
  }
  return Map<String, dynamic>.from(value);
}

String _text(Object? value, int max, [bool required = false]) {
  if (value is! String ||
      value.length > max ||
      required && value.trim().isEmpty ||
      RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]').hasMatch(value)) {
    _fail('Purchase details need review.');
  }
  return value.trim();
}

dynamic _freeze(dynamic value) {
  if (value is Map) {
    return Map<String, dynamic>.unmodifiable(
      value.map((key, child) => MapEntry(key as String, _freeze(child))),
    );
  }
  if (value is List) return List<dynamic>.unmodifiable(value.map(_freeze));
  return value;
}

const _lineKeys = [
  'description',
  'quantity',
  'unitMinor',
  'referenceMinor',
  'rateBps',
  'cardId',
  'printingId',
  'condition',
  'addToVault',
];

int purchaseOffer(Object? referenceMinor, Object? rateBps) {
  if (!_integer(referenceMinor, 1, 100000000) || !_integer(rateBps, 1, 10000)) {
    _fail('Enter a reference value and a percentage from 0.01 to 100.');
  }
  return ((BigInt.from(referenceMinor as int) * BigInt.from(rateBps as int) +
              BigInt.from(5000)) ~/
          BigInt.from(10000))
      .toInt();
}

Map<String, dynamic> _item(Object? value) {
  final row = _keys(value, _lineKeys),
      description = _text((value as Map)['description'], 200, true);
  final quantity = row['quantity'], amount = row['unitMinor'];
  if (!_integer(quantity, 1, 999) ||
      !_integer(amount, 0, 100000000) ||
      row['addToVault'] is! bool) {
    _fail('Purchase amount or quantity needs review.');
  }
  if (!_integer((quantity as int) * (amount as int), 0, 100000000)) {
    _fail('Purchase line amount needs review.');
  }
  if ((row['referenceMinor'] == null) != (row['rateBps'] == null)) {
    _fail('Reference value and percentage must be recorded together.');
  }
  if (row['referenceMinor'] != null) {
    purchaseOffer(row['referenceMinor'], row['rateBps']);
  }
  if (row['cardId'] == null) {
    if (row['printingId'] != null ||
        row['condition'] != null ||
        row['addToVault'] != false) {
      _fail('A quick purchase line cannot create inventory.');
    }
  } else if (!_id(row['cardId']) ||
      !_id(row['printingId']) ||
      !['NM', 'LP', 'MP', 'HP', 'DMG'].contains(row['condition']) ||
      quantity != 1) {
    _fail('Choose one exact printing and condition per copy.');
  }
  return {...row, 'description': description};
}

({List<Map<String, dynamic>> lines, int total}) _items(Object? values) {
  if (values is! List || values.isEmpty || values.length > 50) {
    _fail('Choose 1 to 50 purchase lines.');
  }
  final lines = values.map(_item).toList();
  final total = lines.fold<int>(
    0,
    (sum, line) => sum + (line['unitMinor'] as int) * (line['quantity'] as int),
  );
  if (!_integer(total, 1, 100000000)) {
    _fail('Purchase total must be from USD 0.01 to 1,000,000.00.');
  }
  return (lines: lines, total: total);
}

Map<String, dynamic> _customer(Object? value) {
  final row = _keys(value, ['name', 'email', 'phone', 'wants', 'notes']);
  final result = {
    'name': _text(row['name'], 120),
    'email': _text(row['email'], 254),
    'phone': _text(row['phone'], 40),
    'wants': _text(row['wants'], 1000),
    'notes': _text(row['notes'], 2000),
  };
  if (RegExp(r'[\r\n]').hasMatch(result['name']!) ||
      result['email']!.isNotEmpty &&
          !RegExp(
            r'^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$',
          ).hasMatch(result['email']!) ||
      result['phone']!.isNotEmpty &&
          !RegExp(r'^\+?[0-9 ()-]{7,40}$').hasMatch(result['phone']!)) {
    _fail('Seller contact details need review.');
  }
  return result;
}

List<Map<String, dynamic>> _entries(Object? values) {
  if (values is! List) _fail('Purchase payouts need review.');
  return values
      .map((value) => _keys(value, ['method', 'amountMinor', 'tenderedMinor']))
      .toList();
}

Map<String, dynamic> purchaseRequest(Object? input, Object? id) {
  if (!_id(id)) _fail('Purchase request identity needs review.');
  final row = _keys(input, [
    'storeName',
    'items',
    'payments',
    'note',
    'customerId',
    'customer',
    'confirmed',
  ]);
  if (row['confirmed'] != true) {
    _fail('Confirm that the exchange and payout are complete.');
  }
  if (row['customerId'] != null && !_id(row['customerId'])) {
    _fail('Seller identity needs review.');
  }
  final batch = _items(row['items']);
  final payments = salesPaymentSnapshot(
    _entries(row['payments']),
    -batch.total,
  );
  return _freeze({
        'id': id,
        'cart': {
          'version': 4,
          'kind': 'purchase',
          'storeName': _text(row['storeName'], 120, true),
          'items': batch.lines,
          'payments': payments['entries'],
          'note': _text(row['note'], 500),
          'customerId': row['customerId'],
          'customer': _customer(row['customer']),
        },
      })
      as Map<String, dynamic>;
}

const _receiptKeys = [
  'version',
  'kind',
  'id',
  'number',
  'createdAt',
  'storeName',
  'customerName',
  'currency',
  'items',
  'purchaseMinor',
  'method',
  'payments',
  'note',
];
bool isPurchaseReceipt(Object? value) =>
    value is Map && value['version'] == 2 && value['kind'] == 'purchase';
const _recordedLineKeys = [
  ..._lineKeys,
  'lineMinor',
  'printingGvId',
  'instanceId',
  'gvviId',
];
Map<String, dynamic> validatePurchaseReceipt(Object? value) {
  final row = _keys(value, _receiptKeys);
  if (row['version'] != 2 ||
      row['kind'] != 'purchase' ||
      !_id(row['id']) ||
      row['currency'] != 'USD') {
    _fail('Unsupported purchase receipt.');
  }
  final stamp = row['createdAt'];
  final date = stamp is String ? DateTime.tryParse(stamp) : null;
  if (date == null ||
      date.microsecond != 0 ||
      date.toUtc().toIso8601String() != stamp) {
    _fail('Purchase date needs review.');
  }
  if (row['number'] !=
      'GVB-${(stamp as String).substring(0, 10).replaceAll('-', '')}-${(row['id'] as String).substring(0, 8).toUpperCase()}') {
    _fail('Purchase number needs review.');
  }
  if (row['items'] is! List) _fail('Purchase items need review.');
  final source = (row['items'] as List)
      .map((line) => _keys(line, _recordedLineKeys))
      .toList();
  final expected = _items(
    source
        .map((line) => {for (final key in _lineKeys) key: line[key]})
        .toList(),
  );
  if (row['purchaseMinor'] != expected.total) {
    _fail('Purchase total does not match its items.');
  }
  final seen = <String>{}, labels = <String>{};
  final lines = <Map<String, dynamic>>[];
  for (var i = 0; i < source.length; i++) {
    final line = source[i];
    if (line['lineMinor'] !=
        (line['quantity'] as int) * (line['unitMinor'] as int)) {
      _fail('Purchase line amount does not reconcile.');
    }
    if (line['cardId'] == null) {
      if (line['printingGvId'] != null) {
        _fail('Quick purchase has unexpected identity.');
      }
    } else {
      _text(line['printingGvId'], 100, true);
    }
    if (line['addToVault'] == true) {
      final instance = line['instanceId'], gvvi = line['gvviId'];
      if (!_id(instance) ||
          !seen.add((instance as String).toLowerCase()) ||
          gvvi is! String ||
          gvvi.length > 200 ||
          !RegExp(r'^GVVI-[A-Z0-9-]+$').hasMatch(gvvi) ||
          !labels.add(gvvi)) {
        _fail('Purchase copy evidence needs review.');
      }
    } else if (line['instanceId'] != null || line['gvviId'] != null) {
      _fail('Unexpected purchase copy.');
    }
    lines.add({
      ...expected.lines[i],
      'lineMinor': line['lineMinor'],
      'printingGvId': line['printingGvId'],
      'instanceId': line['instanceId'],
      'gvviId': line['gvviId'],
    });
  }
  final stored = _keys(row['payments'], [
    'version',
    'balanceMinor',
    'entries',
    'changeMinor',
  ]);
  final entries = _entries(stored['entries']);
  final payments = salesPaymentSnapshot(entries, -expected.total);
  if (stored['version'] != 1 ||
      stored['balanceMinor'] != -expected.total ||
      stored['changeMinor'] != payments['changeMinor'] ||
      row['method'] != salesPaymentMethod(entries)) {
    _fail('Payment totals do not match.');
  }
  return _freeze({
        ...row,
        'storeName': _text(row['storeName'], 120, true),
        'customerName': _text(row['customerName'], 120),
        'note': _text(row['note'], 500),
        'items': lines,
        'payments': payments,
      })
      as Map<String, dynamic>;
}

Map<String, dynamic> confirmedPurchaseReceipt(Object? value, Object? request) {
  final pending = _keys(request, ['id', 'cart']);
  final cart = _keys(pending['cart'], [
    'version',
    'kind',
    'storeName',
    'items',
    'payments',
    'note',
    'customerId',
    'customer',
  ]);
  if (cart['version'] != 4 || cart['kind'] != 'purchase') {
    _fail('Unexpected purchase request.');
  }
  final normalized =
      purchaseRequest({
            for (final key in [
              'storeName',
              'items',
              'payments',
              'note',
              'customerId',
              'customer',
            ])
              key: cart[key],
            'confirmed': true,
          }, pending['id'])['cart']
          as Map;
  final receipt = validatePurchaseReceipt(value),
      actualItems = receipt['items'] as List;
  final expectedItems = normalized['items'] as List,
      expectedPayments = normalized['payments'] as List;
  final actualPayments = (receipt['payments'] as Map)['entries'] as List;
  var samePayments = actualPayments.length == expectedPayments.length;
  if (samePayments) {
    for (var i = 0; i < actualPayments.length; i++) {
      for (final key in ['method', 'amountMinor', 'tenderedMinor']) {
        if ((actualPayments[i] as Map)[key] !=
            (expectedPayments[i] as Map)[key]) {
          samePayments = false;
        }
      }
    }
  }
  if ((receipt['id'] as String).toLowerCase() !=
          (pending['id'] as String).toLowerCase() ||
      receipt['storeName'] != normalized['storeName'] ||
      receipt['note'] != normalized['note'] ||
      actualItems.length != expectedItems.length ||
      normalized['customerId'] == null &&
          receipt['customerName'] != (normalized['customer'] as Map)['name'] ||
      !samePayments) {
    _fail('Purchase acknowledgement does not match the pending request.');
  }
  for (var i = 0; i < actualItems.length; i++) {
    final actual = actualItems[i] as Map, expected = expectedItems[i] as Map;
    for (final key in _lineKeys) {
      if (key == 'description' && expected['cardId'] != null) continue;
      final equal =
          ['cardId', 'printingId'].contains(key) && expected[key] != null
          ? (actual[key] as String?)?.toLowerCase() ==
                (expected[key] as String).toLowerCase()
          : actual[key] == expected[key];
      if (!equal) _fail('Purchase acknowledgement changed a pending line.');
    }
  }
  return receipt;
}

Map<String, dynamic> purchaseCustomerView(Object? value) {
  final receipt = validatePurchaseReceipt(value);
  return _freeze({
        'kind': 'purchase',
        'number': receipt['number'],
        'createdAt': receipt['createdAt'],
        'storeName': receipt['storeName'],
        'items': (receipt['items'] as List)
            .map(
              (line) => {
                for (final key in [
                  'description',
                  'quantity',
                  'unitMinor',
                  'lineMinor',
                ])
                  key: (line as Map)[key],
              },
            )
            .toList(),
        'currency': 'USD',
        'purchaseMinor': receipt['purchaseMinor'],
        'method': receipt['method'],
        'payments': receipt['payments'],
      })
      as Map<String, dynamic>;
}

String purchaseReceiptText(Object? value, String Function(int) money) {
  final receipt = purchaseCustomerView(value);
  return [
    receipt['storeName'],
    'PURCHASE RECEIPT',
    receipt['number'],
    receipt['createdAt'],
    ...(receipt['items'] as List).map(
      (line) =>
          '${line['quantity']} × ${line['description']} @ ${money(line['unitMinor'] as int)} — ${money(line['lineMinor'] as int)}',
    ),
    'Total paid to seller: ${money(receipt['purchaseMinor'] as int)}',
    ...((receipt['payments'] as Map)['entries'] as List).map(
      (entry) => '${entry['method']}: ${money(entry['amountMinor'] as int)}',
    ),
    'Purchase and external payout recorded by the vendor. Grookai did not move money.',
  ].join('\n');
}
