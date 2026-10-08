// Display/validation parity only. The authenticated writer records authority.
const discountAllocationMethod = 'proportional_largest_remainder_v1';
const _limit = 100000000;
bool _integer(dynamic value, int min, int max) =>
    value is num &&
    value.isFinite &&
    value == value.truncate() &&
    value >= min &&
    value <= max;
void _check(bool value) {
  if (!value) {
    throw const FormatException(
      'Recorded discount needs review. Preserve the original sale.',
    );
  }
}

bool _keys(dynamic value, List<String> keys) =>
    value is Map &&
    value.length == keys.length &&
    keys.every(value.containsKey);

Map<String, dynamic> saleDiscountAllocation(
  dynamic items,
  dynamic discountMinor,
) {
  _check(
    items is List &&
        items.isNotEmpty &&
        items.length <= 50 &&
        _integer(discountMinor, 0, _limit),
  );
  final gross = <BigInt>[];
  for (final item in items as List) {
    _check(
      item is Map &&
          _integer(item['quantity'], 1, 999) &&
          _integer(item['unitMinor'], 1, _limit),
    );
    gross.add(
      BigInt.from(item['quantity'] as num) *
          BigInt.from(item['unitMinor'] as num),
    );
  }
  final subtotal = gross.fold(BigInt.zero, (a, b) => a + b),
      discount = BigInt.from(discountMinor as num);
  _check(subtotal <= BigInt.from(_limit) && discount <= subtotal);
  final shares = [for (final g in gross) g * discount ~/ subtotal];
  final remainders = [for (final g in gross) g * discount % subtotal];
  final ranked = List<int>.generate(gross.length, (i) => i)
    ..sort(
      (a, b) => remainders[a] == remainders[b]
          ? a.compareTo(b)
          : remainders[b].compareTo(remainders[a]),
    );
  var remaining = discount - shares.fold(BigInt.zero, (a, b) => a + b);
  for (final i in ranked) {
    if (remaining == BigInt.zero) {
      break;
    }
    shares[i] += BigInt.one;
    remaining -= BigInt.one;
  }
  _check(remaining == BigInt.zero);
  return Map<String, dynamic>.unmodifiable({
    'version': 1,
    'method': discountAllocationMethod,
    'subtotalMinor': '$subtotal',
    'discountMinor': '$discount',
    'netSalesMinor': '${subtotal - discount}',
    'lines': List<Map<String, dynamic>>.unmodifiable([
      for (var i = 0; i < gross.length; i++)
        Map<String, dynamic>.unmodifiable({
          'index': i,
          'grossMinor': '${gross[i]}',
          'discountMinor': '${shares[i]}',
          'netMinor': '${gross[i] - shares[i]}',
        }),
    ]),
  });
}

Map<String, dynamic> validateSaleDiscountAllocation(
  dynamic value,
  dynamic items,
  dynamic discountMinor,
) {
  final expected = saleDiscountAllocation(items, discountMinor);
  _check(
    _keys(value, [
      'version',
      'method',
      'subtotalMinor',
      'discountMinor',
      'netSalesMinor',
      'lines',
    ]),
  );
  for (final name in [
    'version',
    'method',
    'subtotalMinor',
    'discountMinor',
    'netSalesMinor',
  ]) {
    _check(value[name] == expected[name]);
  }
  _check(
    value['lines'] is List &&
        (value['lines'] as List).length == (expected['lines'] as List).length,
  );
  for (var i = 0; i < (expected['lines'] as List).length; i++) {
    final line = value['lines'][i];
    _check(_keys(line, ['index', 'grossMinor', 'discountMinor', 'netMinor']));
    for (final name in ['index', 'grossMinor', 'discountMinor', 'netMinor']) {
      _check(line[name] == expected['lines'][i][name]);
    }
  }
  return expected;
}
