import 'sales_payments.dart';
import 'sales_purchase.dart';

bool isPurchaseDraft(Object? value) =>
    value is Map && value['kind'] == 'purchase';
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _id(Object? value) => value is String && _uuid.hasMatch(value);
bool _text(Object? value, int limit) =>
    value is String && value.length <= limit;
bool _integer(Object? value, int min, int max) =>
    value is int && value >= min && value <= max;

/// Editing may be incomplete; the purchase request applies final contact/payment validation.
Map<String, dynamic> validatePurchaseDraft(Object? value) {
  Never fail() => throw FormatException(
    'Saved purchase needs review. Preserve this device data.',
  );
  const fields = [
    'kind',
    'id',
    'label',
    'storeName',
    'items',
    'method',
    'note',
    'customerId',
    'customer',
  ];
  if (value is! Map ||
      value['kind'] != 'purchase' ||
      !fields.every(value.containsKey) ||
      value.keys.any((key) => ![...fields, 'payments'].contains(key)) ||
      !_id(value['id']) ||
      !_text(value['label'], 120) ||
      !_text(value['storeName'], 120) ||
      !_text(value['note'], 500) ||
      !salesTenderMethods.contains(value['method']) ||
      value['customerId'] != null && !_id(value['customerId']) ||
      value['items'] is! List ||
      (value['items'] as List).length > 50) {
    fail();
  }
  final customer = value['customer'];
  const limits = {
    'name': 120,
    'email': 254,
    'phone': 40,
    'wants': 1000,
    'notes': 2000,
  };
  if (customer is! Map ||
      customer.length != 5 ||
      !limits.entries.every(
        (entry) => _text(customer[entry.key], entry.value),
      )) {
    fail();
  }
  for (final line in value['items'] as List) {
    validatePurchaseItem(line);
  }
  final draft = Map<String, dynamic>.from(value);
  if (!_integer(purchaseDraftTotal(draft), 0, 100000000)) fail();
  if (value.containsKey('payments')) {
    final payments = value['payments'];
    if (payments is! List ||
        payments.length > 4 ||
        !payments.every(
          (entry) =>
              entry is Map &&
              entry.length == 3 &&
              [
                'method',
                'amountMinor',
                'tenderedMinor',
              ].every(entry.containsKey) &&
              salesTenderMethods.contains(entry['method']) &&
              _integer(entry['amountMinor'], 0, 100000000) &&
              _integer(entry['tenderedMinor'], 0, 100000000),
        )) {
      fail();
    }
  }
  return draft;
}

int purchaseDraftTotal(Map<String, dynamic> draft) =>
    (draft['items'] as List).fold<int>(
      0,
      (total, dynamic line) =>
          total + (line['unitMinor'] as int) * (line['quantity'] as int),
    );

Map<String, dynamic> blankPurchaseDraft(String id, String storeName) =>
    validatePurchaseDraft({
      'kind': 'purchase',
      'id': id,
      'label': 'Walk-up seller',
      'storeName': storeName,
      'items': <dynamic>[],
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

Map<String, dynamic> addPurchaseItem(Map<String, dynamic> draft, Object? line) {
  validatePurchaseDraft(draft);
  return validatePurchaseDraft({
    ...draft,
    'items': [...draft['items'] as List, validatePurchaseItem(line)],
  });
}

Map<String, dynamic> purchaseDraftRequest(
  Map<String, dynamic> draft,
  String id, {
  required bool confirmed,
}) {
  validatePurchaseDraft(draft);
  final total = purchaseDraftTotal(draft);
  return purchaseRequest({
    'storeName': draft['storeName'],
    'items': draft['items'],
    'payments':
        draft['payments'] ??
        [
          {
            'method': draft['method'],
            'amountMinor': total,
            'tenderedMinor': total,
          },
        ],
    'note': draft['note'],
    'customerId': draft['customerId'],
    'customer': draft['customer'],
    'confirmed': confirmed,
  }, id);
}

/// An offer preview has no receipt identity, private reference values or seller contacts.
Map<String, dynamic> purchaseOfferView(Map<String, dynamic> draft) {
  validatePurchaseDraft(draft);
  return {
    'kind': 'purchase',
    'storeName': draft['storeName'],
    'purchaseMinor': purchaseDraftTotal(draft),
    'items': (draft['items'] as List)
        .map(
          (dynamic line) => {
            'description': line['description'],
            'quantity': line['quantity'],
            'unitMinor': line['unitMinor'],
          },
        )
        .toList(),
  };
}
