import 'dart:convert';

/// Device-local work in progress. A held deal never reserves inventory.
Map<String, dynamic> readSalesDrafts(String? raw) {
  if (raw == null) {
    return {'version': 1, 'revision': 0, 'active': null, 'drafts': <dynamic>[]};
  }
  if (raw.length > 2000000) {
    throw StateError('Saved deals are too large. Preserve this device data.');
  }
  final book = jsonDecode(raw);
  bool text(dynamic v, int max) => v is String && v.length <= max;
  bool number(dynamic v, int min, int max) => v is int && v >= min && v <= max;
  bool optionalText(dynamic v) => v == null || text(v, 4096);
  bool valid(dynamic d) {
    if (d is! Map ||
        !text(d['id'], 100) ||
        d['id'] == '' ||
        !text(d['storeName'], 120) ||
        !text(d['tax'], 30) ||
        !text(d['note'], 500) ||
        ![
          'Cash',
          'Card (external terminal)',
          'Bank / payment app',
          'Other',
        ].contains(d['method']) ||
        d['items'] is! List ||
        d['trades'] is! List ||
        d['customer'] is! Map) {
      return false;
    }
    final customer = d['customer'] as Map;
    if (!text(customer['name'], 120) ||
        !text(customer['email'], 254) ||
        !text(customer['phone'], 40) ||
        !text(customer['wants'], 1000) ||
        !text(customer['notes'], 2000) ||
        !optionalText(d['customerId'])) {
      return false;
    }
    final items = d['items'] as List, trades = d['trades'] as List;
    return items.length <= 50 &&
        trades.length <= 50 &&
        items.every(
          (l) =>
              l is Map &&
              text(l['description'], 200) &&
              number(l['unitMinor'], 1, 100000000) &&
              number(l['quantity'], 1, 999) &&
              optionalText(l['instanceId']) &&
              optionalText(l['gvviId']) &&
              optionalText(l['imageUrl']) &&
              optionalText(l['fallbackImageUrl']),
        ) &&
        trades.every(
          (t) =>
              t is Map &&
              text(t['description'], 200) &&
              number(t['valueMinor'], 1, 100000000) &&
              number(t['quantity'], 1, 999) &&
              number(t['rateBps'], 1, 10000) &&
              optionalText(t['cardId']) &&
              optionalText(t['printingId']) &&
              optionalText(t['condition']) &&
              t['addToVault'] is bool,
        );
  }

  if (book is! Map ||
      book['version'] != 1 ||
      !number(book['revision'], 0, 9007199254740990) ||
      book['drafts'] is! List) {
    throw StateError(
      'Saved deals could not be read. Preserve this device data.',
    );
  }
  final drafts = book['drafts'] as List;
  if (drafts.length > 20 ||
      !drafts.every(valid) ||
      drafts.map((d) => d['id']).toSet().length != drafts.length ||
      book['active'] != null && !drafts.any((d) => d['id'] == book['active'])) {
    throw StateError(
      'Saved deals could not be read. Preserve this device data.',
    );
  }
  return Map<String, dynamic>.from(book);
}

Map<String, dynamic> blankSalesDraft(String id, String storeName) => {
  'id': id,
  'storeName': storeName,
  'tax': '0.00',
  'method': 'Cash',
  'note': '',
  'items': <dynamic>[],
  'trades': <dynamic>[],
  'customerId': null,
  'customer': {'name': '', 'email': '', 'phone': '', 'wants': '', 'notes': ''},
};
