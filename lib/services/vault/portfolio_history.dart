import 'dart:convert';

void _check(bool value) {
  if (!value) {
    throw const FormatException(
      'Collection history could not be verified. Keep any pending recording request.',
    );
  }
}

bool portfolioId(dynamic v) =>
    v is String &&
    RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    ).hasMatch(v);
bool portfolioFields(dynamic v, List<String> keys) =>
    v is Map && v.length == keys.length && keys.every(v.containsKey);
Map<String, dynamic> _copy(dynamic v) =>
    Map<String, dynamic>.from(jsonDecode(jsonEncode(v)) as Map);
bool portfolioSequence(dynamic v, {bool zero = false}) =>
    v is String &&
    RegExp(
      zero ? r'^(0|[1-9][0-9]{0,18})$' : r'^[1-9][0-9]{0,18}$',
    ).hasMatch(v) &&
    BigInt.parse(v) <= BigInt.parse('9223372036854775807');
void _day(dynamic v) {
  _check(
    v is String &&
        RegExp(r'^[0-9]{4}-[0-9]{2}-[0-9]{2}$').hasMatch(v) &&
        !v.startsWith('0000'),
  );
  final d = DateTime.tryParse('${v}T00:00:00.000Z');
  _check(d != null && d.toIso8601String().substring(0, 10) == v);
}

void _stamp(dynamic v) {
  _check(
    v is String &&
        RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$').hasMatch(v),
  );
  final d = DateTime.tryParse(v as String);
  _check(d != null && d.toIso8601String() == v);
  _day(v.substring(0, 10));
}

bool _count(dynamic v) => v is int && v >= 0 && v <= 20000;
bool _exact(dynamic v, {bool signed = false}) =>
    v is String &&
    v.length <= 1032 &&
    RegExp(
      signed
          ? r'^-?(0|[1-9][0-9]*)(\.[0-9]*[1-9])?$'
          : r'^(0|[1-9][0-9]*)(\.[0-9]*[1-9])?$',
    ).hasMatch(v) &&
    v != '-0';
bool _display(dynamic v, {bool signed = false}) =>
    v is String &&
    v.length <= 1035 &&
    RegExp(
      signed
          ? r'^-?(0|[1-9][0-9]*)\.[0-9]{2}$'
          : r'^(0|[1-9][0-9]*)\.[0-9]{2}$',
    ).hasMatch(v) &&
    v != '-0.00';
bool _sameKeys(Map a, Map b) =>
    a.length == b.length && a.keys.every(b.containsKey);
bool samePortfolioValue(dynamic a, dynamic b) {
  if (a is Map && b is Map) {
    return _sameKeys(a, b) &&
        a.keys.every((k) => samePortfolioValue(a[k], b[k]));
  }
  if (a is List && b is List) {
    return a.length == b.length &&
        List.generate(
          a.length,
          (i) => i,
        ).every((i) => samePortfolioValue(a[i], b[i]));
  }
  return a == b;
}

Map<String, dynamic> validatePortfolioRequest(dynamic v) {
  _check(
    portfolioFields(v, ['version', 'requestId', 'day']) &&
        v['version'] == 1 &&
        portfolioId(v['requestId']),
  );
  _day(v['day']);
  return _copy(v);
}

Map<String, dynamic> validatePortfolioCapabilities(dynamic v) {
  _check(
    portfolioFields(v, [
          'version',
          'enabled',
          'day',
          'maximumCopies',
          'cadence',
        ]) &&
        v['version'] == 1 &&
        v['enabled'] is bool &&
        v['maximumCopies'] == 20000 &&
        v['cadence'] == 'first_visit_utc_day',
  );
  _day(v['day']);
  return _copy(v);
}

Map<String, dynamic> validatePortfolioSummary(dynamic v) {
  _check(
    portfolioFields(v, [
          'snapshotId',
          'sequence',
          'capturedAt',
          'state',
          'coverage',
          'totals',
        ]) &&
        portfolioId(v['snapshotId']) &&
        portfolioSequence(v['sequence']),
  );
  _stamp(v['capturedAt']);
  final dynamic c = v['coverage'];
  _check(
    portfolioFields(c, [
          'owned',
          'priced',
          'unpriced',
          'byKind',
          'byReason',
          'byCurrency',
        ]) &&
        _count(c['owned']) &&
        _count(c['priced']) &&
        _count(c['unpriced']) &&
        c['priced'] + c['unpriced'] == c['owned'],
  );
  _check(portfolioFields(c['byKind'], ['raw', 'slab', 'sealed']));
  var owned = 0, priced = 0, unpriced = 0;
  for (final dynamic k in (c['byKind'] as Map).values) {
    _check(
      portfolioFields(k, ['owned', 'priced', 'unpriced']) &&
          _count(k['owned']) &&
          _count(k['priced']) &&
          _count(k['unpriced']) &&
          k['priced'] + k['unpriced'] == k['owned'],
    );
    owned += k['owned'] as int;
    priced += k['priced'] as int;
    unpriced += k['unpriced'] as int;
  }
  _check(
    owned == c['owned'] &&
        priced == c['priced'] &&
        unpriced == c['unpriced'] &&
        c['byKind']['slab']['priced'] == 0,
  );
  const reasons = [
    'no_qualified_price',
    'unsupported_slab',
    'ineligible_seal_state',
    'ineligible_package_condition',
    'identity_unresolved',
    'unsupported_currency',
    'invalid_reference',
  ];
  _check(
    c['byReason'] is Map &&
        (c['byReason'] as Map).entries.every(
          (e) => reasons.contains(e.key) && _count(e.value) && e.value > 0,
        ),
  );
  _check(
    (c['byReason'] as Map).values.fold<int>(0, (a, b) => a + (b as int)) ==
        unpriced,
  );
  _check(
    c['byCurrency'] is Map &&
        (c['byCurrency'] as Map).entries.every(
          (e) =>
              e.key is String &&
              RegExp(r'^[A-Z]{3}$').hasMatch(e.key as String) &&
              _count(e.value) &&
              e.value > 0,
        ),
  );
  _check(
    (c['byCurrency'] as Map).values.fold<int>(0, (a, b) => a + (b as int)) ==
        priced,
  );
  _check(
    v['state'] ==
        (owned == 0
            ? 'empty'
            : priced == 0
            ? 'unpriced'
            : priced == owned
            ? 'priced'
            : 'partially_priced'),
  );
  _check(
    v['totals'] is Map && _sameKeys(v['totals'] as Map, c['byCurrency'] as Map),
  );
  for (final dynamic t in (v['totals'] as Map).values) {
    _check(
      portfolioFields(t, ['exact', 'display']) &&
          _exact(t['exact']) &&
          t['exact'] != '0' &&
          _display(t['display']),
    );
  }
  return _copy(v);
}

Map<String, dynamic> confirmedPortfolioOutcome(
  Map<String, dynamic> request,
  dynamic v,
  String ownerId,
) {
  _check(
    portfolioId(ownerId) &&
        portfolioFields(v, [
          'version',
          'ownerId',
          'request',
          'status',
          'pointId',
          'errorCode',
          'recordedAt',
          'summary',
        ]) &&
        v['version'] == 1 &&
        v['ownerId'] == ownerId &&
        samePortfolioValue(
          validatePortfolioRequest(request),
          validatePortfolioRequest(v['request']),
        ),
  );
  _stamp(v['recordedAt']);
  if (['captured', 'reused'].contains(v['status'])) {
    _check(portfolioId(v['pointId']) && v['errorCode'] == null);
    validatePortfolioSummary(v['summary']);
    _check(
      v['summary']['snapshotId'] == v['pointId'] &&
          (v['summary']['capturedAt'] as String).substring(0, 10) ==
              request['day'],
    );
  } else {
    _check(v['pointId'] == null && v['summary'] == null);
    if (v['status'] == 'cancelled') {
      _check(v['errorCode'] == null);
    } else {
      _check(
        v['status'] == 'failed' &&
            [
              'day_expired',
              'capacity_reached',
              'too_many_copies',
              'observation_too_large',
              'pricing_unavailable',
              'invalid_reference',
              'clock_changed',
              'capture_failed',
            ].contains(v['errorCode']),
      );
    }
  }
  return _copy(v);
}

Map<String, dynamic> validatePortfolioPage(
  dynamic v,
  String ownerId, {
  String? before,
  String? watermark,
  int limit = 30,
}) {
  _check(
    portfolioId(ownerId) &&
        portfolioFields(v, [
          'version',
          'ownerId',
          'watermark',
          'points',
          'nextBefore',
        ]) &&
        v['version'] == 1 &&
        v['ownerId'] == ownerId &&
        portfolioSequence(v['watermark'], zero: true),
  );
  _check(watermark == null || v['watermark'] == watermark);
  _check(before == null || portfolioSequence(before));
  _check(
    v['points'] is List &&
        (v['points'] as List).length <= limit &&
        limit >= 1 &&
        limit <= 100,
  );
  BigInt? prior = before == null ? null : BigInt.parse(before);
  String? priorTime;
  final ids = <String>{};
  for (final dynamic raw in v['points'] as List) {
    final p = validatePortfolioSummary(raw),
        sequence = BigInt.parse(p['sequence'] as String),
        time = p['capturedAt'] as String;
    _check(
      sequence <= BigInt.parse(v['watermark'] as String) &&
          (prior == null || sequence < prior) &&
          ids.add(p['snapshotId'] as String),
    );
    _check(priorTime == null || time.compareTo(priorTime) <= 0);
    prior = sequence;
    priorTime = time;
  }
  _check(
    v['nextBefore'] == null ||
        ((v['points'] as List).length == limit &&
            v['nextBefore'] == (v['points'] as List).last['sequence']),
  );
  return _copy(v);
}

Map<String, dynamic> validatePortfolioComparison(
  dynamic v,
  String beforeId,
  String afterId,
) {
  _check(
    portfolioFields(v, [
          'version',
          'scope',
          'before',
          'after',
          'counts',
          'currencies',
          'meaning',
          'isProfit',
          'isCashFlow',
        ]) &&
        v['version'] == 1 &&
        v['scope'] == 'all_active_owned_copies' &&
        v['meaning'] == 'reference_value_change' &&
        v['isProfit'] == false &&
        v['isCashFlow'] == false,
  );
  final b = validatePortfolioSummary(v['before']),
      a = validatePortfolioSummary(v['after']);
  _check(
    b['snapshotId'] == beforeId &&
        a['snapshotId'] == afterId &&
        beforeId != afterId &&
        BigInt.parse(b['sequence'] as String) <
            BigInt.parse(a['sequence'] as String) &&
        (b['capturedAt'] as String).compareTo(a['capturedAt'] as String) <= 0,
  );
  final dynamic c = v['counts'];
  _check(
    portfolioFields(c, [
          'addedCopies',
          'removedCopies',
          'basisChangedCopies',
          'newlyPricedCopies',
          'lostPricedCopies',
          'comparablePricedCopies',
          'unchangedUnpricedCopies',
        ]) &&
        (c as Map).values.every(_count),
  );
  _check(
    a['coverage']['owned'] ==
        b['coverage']['owned'] + c['addedCopies'] - c['removedCopies'],
  );
  _check(
    c['basisChangedCopies'] +
            c['newlyPricedCopies'] +
            c['lostPricedCopies'] +
            c['comparablePricedCopies'] +
            c['unchangedUnpricedCopies'] ==
        b['coverage']['owned'] - c['removedCopies'],
  );
  _check(
    v['currencies'] is Map &&
        _sameKeys(v['currencies'] as Map, {
          ...b['totals'] as Map,
          ...a['totals'] as Map,
        }),
  );
  const keys = [
    'marketMovement',
    'addedCopies',
    'removedCopies',
    'newPriceCoverage',
    'lostPriceCoverage',
    'basisChanges',
  ];
  for (final e in (v['currencies'] as Map).entries) {
    final dynamic d = e.value;
    _check(
      portfolioFields(d, [
            'before',
            'after',
            'difference',
            'components',
            'display',
          ]) &&
          _exact(d['before']) &&
          _exact(d['after']) &&
          _exact(d['difference'], signed: true),
    );
    _check(
      d['before'] == (b['totals'][e.key]?['exact'] ?? '0') &&
          d['after'] == (a['totals'][e.key]?['exact'] ?? '0'),
    );
    _check(
      portfolioFields(d['components'], keys) &&
          (d['components'] as Map).values.every((x) => _exact(x, signed: true)),
    );
    final dynamic display = d['display'];
    _check(
      portfolioFields(display, [
            'scale',
            'before',
            'after',
            'difference',
            'components',
            'roundingAdjustment',
          ]) &&
          display['scale'] == 2 &&
          _display(display['before']) &&
          _display(display['after']) &&
          _display(display['difference'], signed: true) &&
          _display(display['roundingAdjustment'], signed: true),
    );
    _check(
      display['before'] == (b['totals'][e.key]?['display'] ?? '0.00') &&
          display['after'] == (a['totals'][e.key]?['display'] ?? '0.00'),
    );
    _check(
      portfolioFields(display['components'], keys) &&
          (display['components'] as Map).values.every(
            (x) => _display(x, signed: true),
          ),
    );
  }
  return _copy(v);
}
