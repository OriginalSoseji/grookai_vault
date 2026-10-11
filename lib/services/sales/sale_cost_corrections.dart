import 'dart:convert';

final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);
final _maxRevision = BigInt.parse('9223372036854775807');
Never _fail() => throw const FormatException(
  'Historical cost data needs review. Preserve any pending correction.',
);
void _check(bool v) {
  if (!v) _fail();
}

dynamic _copy(dynamic v) => jsonDecode(jsonEncode(v));
dynamic _stable(dynamic v) {
  if (v is List) return v.map(_stable).toList();
  if (v is Map) {
    final keys = v.keys.cast<String>().toList()..sort();
    return {for (final k in keys) k: _stable(v[k])};
  }
  return v;
}

bool sameCostEvidence(dynamic a, dynamic b) =>
    jsonEncode(_stable(a)) == jsonEncode(_stable(b));
Map<String, dynamic> _fields(dynamic v, List<String> keys) {
  if (v is! Map || v.length != keys.length || !keys.every(v.containsKey)) {
    _fail();
  }
  return Map<String, dynamic>.from(v);
}

void _id(dynamic v, {bool legacy = false}) {
  _check(
    v is String &&
        v.length == 36 &&
        _uuid.hasMatch(legacy ? v.toLowerCase() : v),
  );
}

BigInt _decimal(dynamic v, BigInt maximum) {
  if (v is! String || !RegExp(r'^(0|[1-9][0-9]{0,18})$').hasMatch(v)) _fail();
  final n = BigInt.parse(v);
  _check(n <= maximum);
  return n;
}

void _receipt(dynamic v) {
  if (v is! Map || v['version'] != 1) _fail();
  _id(v['id'], legacy: true);
  _check(
    v['items'] is List &&
        (v['items'] as List).isNotEmpty &&
        (v['items'] as List).length <= 50,
  );
}

void _stamp(dynamic v) {
  if (v is! String || v.length > 40) _fail();
  final m = RegExp(
    r'^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-](\d{2}):(\d{2}))$',
  ).firstMatch(v);
  if (m == null) _fail();
  _check(
    !m[1]!.startsWith('0000') &&
        int.parse(m[2]!) < 24 &&
        int.parse(m[3]!) < 60 &&
        int.parse(m[4]!) < 60 &&
        (m[6] == 'Z' || int.parse(m[7]!) < 24 && int.parse(m[8]!) < 60) &&
        DateTime.tryParse(v) != null,
  );
  final d = DateTime.tryParse('${m[1]}T00:00:00Z');
  _check(d != null && d.toIso8601String().substring(0, 10) == m[1]);
}

Map<String, dynamic> validateSaleCostCorrectionRequest(dynamic value) {
  final v = _fields(value, [
    'version',
    'requestId',
    'receipt',
    'lineIndex',
    'expectedRevision',
    'action',
    'cost',
    'reason',
  ]);
  _check(v['version'] == 1);
  _id(v['requestId']);
  _receipt(v['receipt']);
  _check(
    v['lineIndex'] is int &&
        v['lineIndex'] >= 0 &&
        v['lineIndex'] < (v['receipt']['items'] as List).length,
  );
  _decimal(v['expectedRevision'], _maxRevision - BigInt.one);
  final reason = v['reason'];
  _check(
    reason is String &&
        reason.runes.length <= 500 &&
        reason
            .replaceAll(RegExp(r'^[\s\u0085\uFEFF]+|[\s\u0085\uFEFF]+$'), '')
            .isNotEmpty &&
        !reason.runes.any((c) => c >= 0xd800 && c <= 0xdfff) &&
        !RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]').hasMatch(reason),
  );
  if (v['action'] == 'set') {
    final cost = _fields(v['cost'], ['minor', 'currency']);
    _decimal(cost['minor'], BigInt.from(999999999999));
    _check(
      cost['currency'] is String &&
          RegExp(r'^[A-Z]{3}$').hasMatch(cost['currency']),
    );
  } else {
    _check(v['action'] == 'restore' && v['cost'] == null);
  }
  _check(utf8.encode(jsonEncode(v)).length <= 65536);
  return Map<String, dynamic>.from(_copy(v) as Map);
}

Map<String, dynamic> validateSaleCostCorrectionOutcome(
  dynamic value,
  String ownerId,
) {
  _id(ownerId);
  final v = _fields(value, [
    'version',
    'ownerId',
    'request',
    'status',
    'revision',
    'source',
    'recordedAt',
  ]);
  _check(v['version'] == 1 && v['ownerId'] == ownerId);
  final r = validateSaleCostCorrectionRequest(v['request']);
  _stamp(v['recordedAt']);
  if (v['status'] == 'applied') {
    _check(['canonical', 'legacy'].contains(v['source']));
    _check(
      _decimal(v['revision'], _maxRevision) ==
          BigInt.parse(r['expectedRevision'] as String) + BigInt.one,
    );
  } else {
    _check(
      v['status'] == 'cancelled' &&
          v['revision'] == null &&
          v['source'] == null,
    );
  }
  return Map<String, dynamic>.from(_copy(v) as Map);
}

Map<String, dynamic> confirmedSaleCostCorrection(
  dynamic request,
  dynamic outcome,
  String ownerId,
) {
  final r = validateSaleCostCorrectionRequest(request),
      o = validateSaleCostCorrectionOutcome(outcome, ownerId);
  _check(sameCostEvidence(r, o['request']));
  return o;
}

List<dynamic> validateSaleCostCorrectionStates(
  dynamic value,
  String ownerId,
  List<dynamic> receiptIds,
) {
  _id(ownerId);
  _check(receiptIds.length <= 10000);
  final ids = <String>{};
  for (final v in receiptIds) {
    _id(v, legacy: true);
    _check(ids.add((v as String).toLowerCase()));
  }
  if (value is! List || value.length != ids.length) _fail();
  final seen = <String>{};
  for (final raw in value) {
    final s = _fields(raw, [
      'version',
      'ownerId',
      'receiptId',
      'receipt',
      'source',
      'lines',
    ]);
    _id(s['receiptId']);
    _check(
      s['version'] == 1 &&
          s['ownerId'] == ownerId &&
          ids.contains(s['receiptId']) &&
          seen.add(s['receiptId'] as String),
    );
    if (s['source'] == null) {
      _check(s['receipt'] == null);
    } else {
      _check(['canonical', 'legacy'].contains(s['source']));
      _receipt(s['receipt']);
      _check((s['receipt']['id'] as String).toLowerCase() == s['receiptId']);
    }
    _check(s['lines'] is List && (s['lines'] as List).length <= 50);
    var previous = -1;
    final requests = <String>{};
    for (final raw in s['lines'] as List) {
      final o = validateSaleCostCorrectionOutcome(raw, ownerId),
          r = o['request'] as Map;
      _check(
        o['status'] == 'applied' &&
            (r['receipt']['id'] as String).toLowerCase() == s['receiptId'] &&
            r['lineIndex'] > previous &&
            requests.add(r['requestId'] as String),
      );
      previous = r['lineIndex'] as int;
    }
  }
  return _copy(value) as List;
}

List<dynamic> validateSaleCostCorrectionHistory(
  dynamic value,
  String ownerId,
  String receiptId,
  int lineIndex, {
  String? beforeRevision,
}) {
  _id(receiptId, legacy: true);
  if (lineIndex < 0 || lineIndex >= 50 || value is! List || value.length > 50) {
    _fail();
  }
  var previous = beforeRevision == null
      ? _maxRevision + BigInt.one
      : _decimal(beforeRevision, _maxRevision);
  final seen = <String>{};
  for (final raw in value) {
    final o = validateSaleCostCorrectionOutcome(raw, ownerId),
        r = o['request'] as Map;
    _check(
      o['status'] == 'applied' &&
          (r['receipt']['id'] as String).toLowerCase() ==
              receiptId.toLowerCase() &&
          r['lineIndex'] == lineIndex &&
          BigInt.parse(o['revision'] as String) < previous &&
          seen.add(r['requestId'] as String),
    );
    previous = BigInt.parse(o['revision'] as String);
  }
  return _copy(value) as List;
}
