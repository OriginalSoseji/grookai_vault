import 'dart:convert';
import 'offer_presets.dart';

const _maxMinor = 100000000;
const _conditions = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const _sources = ['manual', 'tcgplayer_market'];
final _id = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);
bool _uuid(dynamic value) => value is String && _id.hasMatch(value);
bool _integer(dynamic value, int min, int max) =>
    value is int && value >= min && value <= max;
bool _keys(dynamic value, List<String> fields) =>
    value is Map &&
    value.length == fields.length &&
    value.keys.every(fields.contains);
Never _fail() => throw const FormatException(
  'Offer policies need review. Your saved settings have been kept.',
);
Map<String, dynamic> _frozen(Map<String, dynamic> value) =>
    Map<String, dynamic>.unmodifiable(value);

Map<String, dynamic> validateOfferPolicy(dynamic value) {
  if (!_keys(value, [
        'id',
        'name',
        'intent',
        'rateBps',
        'source',
        'conditionBasis',
        'rounding',
        'lowValueTier',
      ]) ||
      !_uuid(value['id']) ||
      value['name'] is! String ||
      (value['name'] as String).trim().isEmpty ||
      (value['name'] as String).trim().length > 80 ||
      RegExp(r'[\x00-\x1f\x7f]').hasMatch(value['name'] as String) ||
      !['cash', 'trade'].contains(value['intent']) ||
      !_integer(value['rateBps'], 1, 10000) ||
      !_sources.contains(value['source']) ||
      ![
        'selected',
        'unspecified',
        ..._conditions,
      ].contains(value['conditionBasis']) ||
      !_keys(value['rounding'], ['incrementMinor', 'mode']) ||
      ![1, 5, 10, 25, 50, 100].contains(value['rounding']['incrementMinor']) ||
      !['nearest', 'down'].contains(value['rounding']['mode'])) {
    _fail();
  }
  final dynamic tier = value['lowValueTier'];
  if (tier != null &&
      (!_keys(tier, ['ceilingMinor', 'rateBps']) ||
          !_integer(tier['ceilingMinor'], 1, _maxMinor) ||
          !_integer(tier['rateBps'], 1, 10000))) {
    _fail();
  }
  return _frozen({
    'id': (value['id'] as String).toLowerCase(),
    'name': (value['name'] as String).trim(),
    'intent': value['intent'],
    'rateBps': value['rateBps'],
    'source': value['source'],
    'conditionBasis': value['conditionBasis'],
    'rounding': _frozen(Map<String, dynamic>.from(value['rounding'] as Map)),
    'lowValueTier': tier == null
        ? null
        : _frozen(Map<String, dynamic>.from(tier as Map)),
  });
}

Map<String, dynamic> validateOfferPolicies(dynamic value) {
  if (value is Map && value['version'] == 1) {
    final old = validateOfferPresets(value);
    return validateOfferPolicies({
      'version': 2,
      'revision': old['revision'],
      'defaults': {'cash': null, 'trade': null},
      'presets': (old['presets'] as List)
          .map(
            (dynamic preset) => {
              ...preset as Map,
              'intent': 'cash',
              'source': 'manual',
              'conditionBasis': 'unspecified',
              'rounding': {'incrementMinor': 1, 'mode': 'nearest'},
              'lowValueTier': null,
            },
          )
          .toList(),
    });
  }
  if (!_keys(value, ['version', 'revision', 'presets', 'defaults']) ||
      value['version'] != 2 ||
      !_integer(value['revision'], 0, 1000000000) ||
      value['presets'] is! List ||
      value['presets'].length > 20 ||
      !_keys(value['defaults'], ['cash', 'trade'])) {
    _fail();
  }
  final presets = (value['presets'] as List).map(validateOfferPolicy).toList();
  if (presets.map((policy) => policy['id']).toSet().length != presets.length) {
    _fail();
  }
  final defaults = <String, dynamic>{};
  for (final intent in ['cash', 'trade']) {
    final dynamic id = value['defaults'][intent];
    if (id != null &&
        (!_uuid(id) ||
            !presets.any(
              (policy) =>
                  policy['id'] == (id as String).toLowerCase() &&
                  policy['intent'] == intent,
            ))) {
      _fail();
    }
    defaults[intent] = id == null ? null : (id as String).toLowerCase();
  }
  return _frozen({
    'version': 2,
    'revision': value['revision'],
    'presets': List<Map<String, dynamic>>.unmodifiable(presets),
    'defaults': _frozen(defaults),
  });
}

Map<String, dynamic> readOfferPolicies(String? raw) {
  if (raw == null) {
    return validateOfferPolicies({
      'version': 2,
      'revision': 0,
      'presets': [],
      'defaults': {'cash': null, 'trade': null},
    });
  }
  if (raw.length > 20000) {
    _fail();
  }
  return validateOfferPolicies(jsonDecode(raw));
}

Map<String, dynamic> removeOfferPolicy(Map<String, dynamic> book, String id) {
  final value = validateOfferPolicies(book);
  if (!_uuid(id)) {
    _fail();
  }
  id = id.toLowerCase();
  return validateOfferPolicies({
    ...value,
    'presets': (value['presets'] as List)
        .where((dynamic policy) => policy['id'] != id)
        .toList(),
    'defaults': (value['defaults'] as Map).map(
      (dynamic intent, dynamic selected) =>
          MapEntry(intent, selected == id ? null : selected),
    ),
  });
}

Map<String, dynamic> _unavailable(String reason) =>
    _frozen({'status': 'unavailable', 'reason': reason});
BigInt? _timestamp(dynamic value) {
  if (value is! String) return null;
  final match = RegExp(
    r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$',
  ).firstMatch(value);
  if (match == null) return null;
  final hours = match[3] == 'Z' ? 0 : int.parse(match[5]!);
  final minutes = match[3] == 'Z' ? 0 : int.parse(match[6]!);
  if (hours > 23 || minutes > 59) return null;
  final offset = (hours * 60 + minutes) * (match[4] == '-' ? -1 : 1);
  final date = DateTime.tryParse(value);
  return date != null &&
          date
                  .toUtc()
                  .add(Duration(minutes: offset))
                  .toIso8601String()
                  .substring(0, 19) ==
              match[1]
      ? BigInt.from(date.microsecondsSinceEpoch)
      : null;
}

dynamic _identity(dynamic value) => value == null
    ? null
    : value is String
    ? value.toLowerCase()
    : false;

/// Draft proposal only; the transaction writer owns agreed-amount validation.
Map<String, dynamic> quoteOfferPolicy(
  dynamic input,
  dynamic context,
  dynamic reference,
  int now,
) {
  final policy = validateOfferPolicy(input);
  if (!_keys(context, [
        'intent',
        'quantity',
        'cardId',
        'printingId',
        'condition',
      ]) ||
      !['cash', 'trade'].contains(context['intent']) ||
      !_integer(context['quantity'], 1, 999) ||
      context['condition'] != null &&
          !_conditions.contains(context['condition']) ||
      context['cardId'] == null && context['printingId'] != null ||
      context['cardId'] != null &&
          (!_uuid(context['cardId']) || !_uuid(context['printingId']))) {
    _fail();
  }
  if (context['intent'] != policy['intent']) {
    return _unavailable('wrong_intent');
  }
  if (reference == null) {
    return _unavailable('reference_missing');
  }
  if (!_keys(reference, [
        'source',
        'amountMinor',
        'currency',
        'cardId',
        'printingId',
        'condition',
        'observedAt',
        'publishedAt',
        'provenanceId',
      ]) ||
      !_sources.contains(reference['source']) ||
      !_integer(reference['amountMinor'], 1, _maxMinor) ||
      reference['condition'] != null &&
          !_conditions.contains(reference['condition'])) {
    return _unavailable('reference_invalid');
  }
  if (reference['currency'] != 'USD') {
    return _unavailable('currency_unsupported');
  }
  if (reference['source'] != policy['source']) {
    return _unavailable('source_mismatch');
  }
  if (_identity(reference['cardId']) != _identity(context['cardId']) ||
      _identity(reference['printingId']) != _identity(context['printingId'])) {
    return _unavailable('printing_mismatch');
  }
  if (reference['source'] == 'tcgplayer_market') {
    if (context['cardId'] == null ||
        !_uuid(reference['provenanceId']) ||
        reference['condition'] != null) {
      return _unavailable('reference_unqualified');
    }
    final observed = _timestamp(reference['observedAt']),
        published = _timestamp(reference['publishedAt']);
    if (!_integer(now, 0, 8640000000000000) ||
        observed == null ||
        published == null) {
      return _unavailable('timestamp_invalid');
    }
    final nowMicros = BigInt.from(now) * BigInt.from(1000);
    if (observed > published || published > nowMicros || observed > nowMicros) {
      return _unavailable('timestamp_invalid');
    }
    if (nowMicros - observed > BigInt.from(129600000000)) {
      return _unavailable('reference_stale');
    }
  } else if (reference['observedAt'] != null ||
      reference['publishedAt'] != null ||
      reference['provenanceId'] != null) {
    return _unavailable('manual_provenance_invalid');
  }
  final basis = policy['conditionBasis'] == 'selected'
      ? context['condition']
      : policy['conditionBasis'] == 'unspecified'
      ? null
      : policy['conditionBasis'];
  if (policy['conditionBasis'] == 'selected' && basis == null) {
    return _unavailable('condition_unknown');
  }
  if (reference['condition'] != basis) {
    return _unavailable('condition_mismatch');
  }
  final tierApplied =
      policy['lowValueTier'] != null &&
      reference['amountMinor'] <= policy['lowValueTier']['ceilingMinor'];
  final rate =
      (tierApplied ? policy['lowValueTier']['rateBps'] : policy['rateBps'])
          as int;
  final units = policy['intent'] == 'trade' ? context['quantity'] as int : 1;
  if (reference['amountMinor'] * units > _maxMinor) {
    return _unavailable('amount_limit');
  }
  final numerator =
      BigInt.from(reference['amountMinor'] as int) *
      BigInt.from(units) *
      BigInt.from(rate);
  final increment = policy['rounding']['incrementMinor'] as int;
  final denominator = BigInt.from(10000 * increment);
  final calculated = ((numerator + BigInt.from(5000)) ~/ BigInt.from(10000))
      .toInt();
  final suggested =
      ((numerator +
                  (policy['rounding']['mode'] == 'nearest'
                      ? denominator ~/ BigInt.two
                      : BigInt.zero)) ~/
              denominator)
          .toInt() *
      increment;
  final line =
      suggested * (policy['intent'] == 'cash' ? context['quantity'] as int : 1);
  if (!_integer(line, 0, _maxMinor)) {
    return _unavailable('amount_limit');
  }
  return _frozen({
    'status': 'available',
    'policyId': policy['id'],
    'intent': policy['intent'],
    'source': reference['source'],
    'referenceMinor': reference['amountMinor'],
    'basisCondition': basis,
    'requiresConditionReview': basis != context['condition'],
    'rateBps': rate,
    'tierApplied': tierApplied,
    'scope': policy['intent'] == 'cash' ? 'unit' : 'line',
    'quantity': context['quantity'],
    'calculatedMinor': calculated,
    'suggestedMinor': suggested,
    'lineMinor': line,
    'rounding': policy['rounding'],
  });
}

/// Project one exact governed RPC result, never a parent or asking price.
Map<String, dynamic> projectOfferMarketReference(
  dynamic rows,
  String cardId,
  String printingId,
  int now,
) {
  if (!_uuid(cardId) || !_uuid(printingId)) _fail();
  if (rows is! List || rows.length != 1 || rows[0] is! Map) {
    return _unavailable('reference_missing_or_ambiguous');
  }
  final row = rows[0] as Map;
  if (row['pricing_scope'] != 'card_printing' ||
      row['status'] != 'available' ||
      row['currency'] != 'USD' ||
      row['source_name'] != 'tcgplayer' ||
      row['source_label'] != 'TCGPlayer Market' ||
      row['freshness'] != 'fresh' ||
      row['is_from_price'] != false ||
      row['unavailable_reason'] != null) {
    return _unavailable('reference_unqualified');
  }
  final amount = row['market_close'];
  final decimal = amount is num && amount.isFinite ? amount.toString() : '';
  final match = RegExp(r'^(\d+)(?:\.(\d{1,2}))?$').firstMatch(decimal);
  if (match == null) return _unavailable('reference_amount_invalid');
  final cents =
      BigInt.parse(match[1]!) * BigInt.from(100) +
      BigInt.parse((match[2] ?? '').padRight(2, '0'));
  if (cents < BigInt.one || cents > BigInt.from(_maxMinor)) {
    return _unavailable('reference_amount_invalid');
  }
  final reference = <String, dynamic>{
    'source': 'tcgplayer_market',
    'amountMinor': cents.toInt(),
    'currency': row['currency'],
    'cardId': row['card_print_id'],
    'printingId': row['card_printing_id'],
    'condition': null,
    'observedAt': row['observed_at'],
    'publishedAt': row['published_at'],
    'provenanceId': row['provenance_id'],
  };
  final result = quoteOfferPolicy(
    {
      'id': printingId,
      'name': 'Market reference validation',
      'intent': 'cash',
      'rateBps': 10000,
      'source': 'tcgplayer_market',
      'conditionBasis': 'unspecified',
      'rounding': {'incrementMinor': 1, 'mode': 'nearest'},
      'lowValueTier': null,
    },
    {
      'intent': 'cash',
      'quantity': 1,
      'cardId': cardId,
      'printingId': printingId,
      'condition': null,
    },
    reference,
    now,
  );
  if (result['status'] != 'available') return result;
  return _frozen({
    'status': 'available',
    'reference': _frozen({
      ...reference,
      'cardId': cardId.toLowerCase(),
      'printingId': printingId.toLowerCase(),
      'provenanceId': (reference['provenanceId'] as String).toLowerCase(),
    }),
  });
}
