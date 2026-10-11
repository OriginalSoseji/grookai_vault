import 'dart:convert';

// Transport contracts only. The server owns membership, timezone and state checks.
const eventExpenseCategories = [
  'booth',
  'travel',
  'lodging',
  'meals',
  'supplies',
  'fees',
  'other',
];
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
);
final _maxRevision = BigInt.parse('9223372036854775807');
Never _invalid() => throw const FormatException(
  'Event data needs review. Refresh before trying again.',
);
void _check(bool value) {
  if (!value) {
    _invalid();
  }
}

Map<String, dynamic> _fields(dynamic value, List<String> keys) {
  _check(value is Map && value.keys.every((key) => key is String));
  final map = Map<String, dynamic>.from(value as Map);
  _check(map.length == keys.length && keys.every(map.containsKey));
  return map;
}

void _id(dynamic value, {bool nullable = false}) {
  if (nullable && value == null) {
    return;
  }
  _check(value is String && value.length == 36 && _uuid.hasMatch(value));
}

bool _wellFormed(String value) {
  final units = value.codeUnits;
  for (var i = 0; i < units.length; i++) {
    final unit = units[i];
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (++i >= units.length || units[i] < 0xdc00 || units[i] > 0xdfff) {
        return false;
      }
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

void _text(dynamic value, int min, int max, {bool multiline = false}) {
  _check(value is String);
  final v = value as String;
  _check(
    _wellFormed(v) &&
        v.runes.length <= max &&
        v.replaceAll(RegExp(r'^[\s\u0085]+|[\s\u0085]+$'), '').runes.length >=
            min &&
        !RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]').hasMatch(v) &&
        (multiline || !RegExp(r'[\r\n\t\u0085\u2028\u2029]').hasMatch(v)),
  );
}

BigInt _decimal(dynamic value, BigInt max) {
  _check(
    value is String && RegExp(r'^(?:0|[1-9][0-9]{0,18})$').hasMatch(value),
  );
  final parsed = BigInt.parse(value as String);
  _check(parsed <= max && parsed.toString() == value);
  return parsed;
}

void _date(dynamic value) {
  _check(
    value is String &&
        RegExp(r'^[0-9]{4}-[0-9]{2}-[0-9]{2}$').hasMatch(value) &&
        !value.startsWith('0000'),
  );
  final v = value as String;
  final date = DateTime.tryParse('${v}T00:00:00.000Z');
  _check(date != null && date.toIso8601String().substring(0, 10) == v);
}

Map<String, dynamic> _copy(Map value) =>
    Map<String, dynamic>.from(jsonDecode(jsonEncode(value)) as Map);

Map<String, dynamic> validateEventOperation(dynamic value) {
  _check(value is Map);
  final v = Map<String, dynamic>.from(value as Map);
  switch (v['type']) {
    case 'event_create':
    case 'event_update':
      _fields(v, [
        'type',
        'eventId',
        'name',
        'startDate',
        'endDate',
        'timeZone',
        'currency',
        'notes',
      ]);
      _id(v['eventId']);
      _text(v['name'], 1, 120);
      _text(v['notes'], 0, 1000, multiline: true);
      _date(v['startDate']);
      _date(v['endDate']);
      _check((v['startDate'] as String).compareTo(v['endDate'] as String) <= 0);
      _check(
        v['timeZone'] is String &&
            (v['timeZone'] as String).length <= 64 &&
            RegExp(r'^[A-Za-z]').hasMatch(v['timeZone'] as String) &&
            !RegExp(r'[^A-Za-z0-9_+./-]').hasMatch(v['timeZone'] as String) &&
            !(v['timeZone'] as String).contains('..'),
      );
      _check(v['currency'] == 'USD');
    case 'event_close':
    case 'event_reopen':
      _fields(v, ['type', 'eventId', 'reason']);
      _id(v['eventId']);
      _text(v['reason'], 1, 240);
    case 'expense_create':
    case 'expense_update':
      _fields(v, [
        'type',
        'eventId',
        'expenseId',
        'category',
        'description',
        'amountMinor',
        'currency',
        'incurredOn',
        if (v['type'] == 'expense_update') 'reason',
      ]);
      _id(v['eventId']);
      _id(v['expenseId']);
      _check(eventExpenseCategories.contains(v['category']));
      _text(v['description'], 1, 160);
      _decimal(v['amountMinor'], BigInt.parse('999999999999'));
      _check(v['currency'] == 'USD');
      _date(v['incurredOn']);
      if (v['type'] == 'expense_update') {
        _text(v['reason'], 1, 240);
      }
    case 'expense_void':
      _fields(v, ['type', 'eventId', 'expenseId', 'reason']);
      _id(v['eventId']);
      _id(v['expenseId']);
      _text(v['reason'], 1, 240);
    case 'receipts_assign':
      _fields(v, ['type', 'eventId', 'receipts']);
      _id(v['eventId'], nullable: true);
      _check(
        v['receipts'] is List &&
            (v['receipts'] as List).isNotEmpty &&
            (v['receipts'] as List).length <= 100,
      );
      var previous = '';
      for (final entry in v['receipts'] as List) {
        final r = _fields(entry, ['receiptId', 'previousEventId']);
        _id(r['receiptId']);
        _id(r['previousEventId'], nullable: true);
        _check(
          (r['receiptId'] as String).compareTo(previous) > 0 &&
              r['previousEventId'] != v['eventId'],
        );
        previous = r['receiptId'] as String;
      }
    default:
      _invalid();
  }
  return _copy(v);
}

Map<String, dynamic> validateEventRequest(dynamic value) {
  final v = _fields(value, [
    'version',
    'requestId',
    'expectedRevision',
    'operation',
  ]);
  _check(v['version'] == 1);
  _id(v['requestId']);
  _decimal(v['expectedRevision'], _maxRevision);
  validateEventOperation(v['operation']);
  _check(utf8.encode(jsonEncode(v)).length <= 65536);
  return _copy(v);
}

dynamic _stable(dynamic value) {
  if (value is List) {
    return value.map(_stable).toList();
  }
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return {for (final key in keys) key: _stable(value[key])};
  }
  return value;
}

Map<String, dynamic> confirmedEventRequest(
  dynamic request,
  dynamic result,
  String ownerId,
) {
  final r = validateEventRequest(request);
  _id(ownerId);
  final response = _fields(result, [
    'version',
    'ownerId',
    'requestId',
    'previousRevision',
    'revision',
    'operation',
  ]);
  _check(
    response['version'] == 1 &&
        response['ownerId'] == ownerId &&
        response['requestId'] == r['requestId'] &&
        response['previousRevision'] == r['expectedRevision'],
  );
  _check(
    _decimal(response['revision'], _maxRevision) ==
        BigInt.parse(r['expectedRevision'] as String) + BigInt.one,
  );
  validateEventOperation(response['operation']);
  _check(
    jsonEncode(_stable(response['operation'])) ==
        jsonEncode(_stable(r['operation'])),
  );
  return _copy(response);
}

Map<String, dynamic> eventRequestParams(dynamic request) {
  return {'p_request': validateEventRequest(request)};
}

String? eventMoneyInput(String value){final text=value.trim();if(!RegExp(r'^\d{1,10}(?:\.\d{1,2})?$').hasMatch(text))return null;final parts=text.split('.'),minor=BigInt.parse(parts[0])*BigInt.from(100)+BigInt.parse((parts.length==1?'':parts[1]).padRight(2,'0'));return minor<=BigInt.parse('999999999999')?'$minor':null;}
String eventMoneyText(String minor){final value=_decimal(minor,BigInt.parse('999999999999'));return '${value~/BigInt.from(100)}.${(value%BigInt.from(100)).toString().padLeft(2,'0')}';}

Map<String, dynamic> validateEventState(
  dynamic value,
  String ownerId, [
  String? selectedId,
]) {
  _id(ownerId);
  _id(selectedId, nullable: true);
  final v = _fields(value, [
    'version',
    'ownerId',
    'revision',
    'entryEnabled',
    'receiptAccess',
    'events',
    'selected',
  ]);
  _check(
    v['version'] == 1 &&
        v['ownerId'] == ownerId &&
        v['entryEnabled'] is bool &&
        v['receiptAccess'] is bool &&
        (v['entryEnabled'] != true || v['receiptAccess'] == true),
  );
  final revision = _decimal(v['revision'], _maxRevision),
      events = <String, Map<String, dynamic>>{};
  void rowRevision(dynamic r) {
    final parsed = _decimal(r, _maxRevision);
    _check(parsed > BigInt.zero && parsed <= revision);
  }

  DateTime stamp(dynamic s) {
    _check(s is String && s.length <= 40);
    final m = RegExp(
      r'^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-](\d{2}):(\d{2}))$',
    ).firstMatch(s as String);
    _check(m != null);
    _date(m![1]);
    _check(
      int.parse(m[2]!) < 24 &&
          int.parse(m[3]!) < 60 &&
          int.parse(m[4]!) < 60 &&
          (m[6] == 'Z' || (int.parse(m[7]!) < 24 && int.parse(m[8]!) < 60)),
    );
    final parsed = DateTime.tryParse(s);
    _check(parsed != null);
    return parsed!;
  }

  List ordered(dynamic rows, String? key, int max) {
    _check(rows is List && rows.length <= max);
    var prior = '';
    for (final row in rows as List) {
      final id = key == null
          ? row
          : row is Map
          ? row[key]
          : null;
      _id(id);
      _check((id as String).compareTo(prior) > 0);
      prior = id;
    }
    return rows;
  }

  for (final row in ordered(v['events'], 'eventId', 500)) {
    final e = _fields(row, [
      'eventId',
      'name',
      'startDate',
      'endDate',
      'timeZone',
      'currency',
      'notes',
      'status',
      'stateReason',
      'revision',
      'createdAt',
      'updatedAt',
    ]);
    validateEventOperation({
      'type': 'event_create',
      for (final key in [
        'eventId',
        'name',
        'startDate',
        'endDate',
        'timeZone',
        'currency',
        'notes',
      ])
        key: e[key],
    });
    _check(e['status'] == 'open' || e['status'] == 'closed');
    _text(e['stateReason'], e['status'] == 'closed' ? 1 : 0, 240);
    rowRevision(e['revision']);
    _check(!stamp(e['updatedAt']).isBefore(stamp(e['createdAt'])));
    events[e['eventId'] as String] = e;
  }
  if (selectedId == null) {
    _check(v['selected'] == null);
  } else {
    final e = events[selectedId];
    _check(e != null);
    final s = _fields(v['selected'], [
      'eventId',
      'expenses',
      'assignments',
      'candidates',
      'receiptIdentityConflicts',
      'bookRevision',
    ]);
    _check(s['eventId'] == selectedId);
    for (final row in ordered(s['expenses'], 'expenseId', 1000)) {
      final x = _fields(row, [
        'expenseId',
        'eventId',
        'category',
        'description',
        'amountMinor',
        'currency',
        'incurredOn',
        'voided',
        'lastReason',
        'revision',
        'createdAt',
        'updatedAt',
      ]);
      validateEventOperation({
        'type': 'expense_create',
        for (final key in [
          'eventId',
          'expenseId',
          'category',
          'description',
          'amountMinor',
          'currency',
          'incurredOn',
        ])
          key: x[key],
      });
      _check(x['eventId'] == selectedId && x['voided'] is bool);
      _text(x['lastReason'], x['voided'] == true ? 1 : 0, 240);
      rowRevision(x['revision']);
      _check(!stamp(x['updatedAt']).isBefore(stamp(x['createdAt'])));
    }
    final assigned = <String, String?>{};
    for (final row in ordered(s['assignments'], 'receiptId', 10000)) {
      final a = _fields(row, ['receiptId', 'eventId', 'revision']);
      _id(a['eventId'], nullable: true);
      _check(a['eventId'] == null || events.containsKey(a['eventId']));
      rowRevision(a['revision']);
      assigned[a['receiptId'] as String] = a['eventId'] as String?;
    }
    final conflicts = ordered(
      s['receiptIdentityConflicts'],
      null,
      10000,
    ).toSet();
    if (v['receiptAccess'] == false) {
      _check(
        s['candidates'] == null &&
            s['bookRevision'] == null &&
            conflicts.isEmpty,
      );
    } else {
      _decimal(s['bookRevision'], _maxRevision);
      for (final row in ordered(s['candidates'], 'receiptId', 10000)) {
        final c = _fields(row, ['receiptId', 'localDate', 'previousEventId']);
        _date(c['localDate']);
        _id(c['previousEventId'], nullable: true);
        _check(
          (c['localDate'] as String).compareTo(e!['startDate'] as String) >=
                  0 &&
              (c['localDate'] as String).compareTo(e['endDate'] as String) <=
                  0 &&
              !conflicts.contains(c['receiptId']) &&
              c['previousEventId'] == assigned[c['receiptId']],
        );
      }
    }
  }
  _check(utf8.encode(jsonEncode(v)).length <= 10000000);
  return _copy(v);
}

Map<String, dynamic> validateEventHistory(
  dynamic value,
  String ownerId,
  String eventId, {
  String? beforeRevision,
  int limit = 50,
}) {
  _id(ownerId);
  _id(eventId);
  _check(limit >= 1 && limit <= 100);
  var previous = beforeRevision == null
      ? _maxRevision + BigInt.one
      : _decimal(beforeRevision, _maxRevision);
  final v = _fields(value, [
    'version',
    'ownerId',
    'eventId',
    'rows',
    'nextRevision',
  ]);
  _check(
    v['version'] == 1 &&
        v['ownerId'] == ownerId &&
        v['eventId'] == eventId &&
        v['rows'] is List &&
        (v['rows'] as List).length <= limit,
  );
  final requests = <String>{}, rows = <Map<String, dynamic>>[];
  for (final value in v['rows'] as List) {
    final row = _fields(value, [
      'requestId',
      'revision',
      'createdAt',
      'operation',
      'before',
      'after',
    ]);
    _id(row['requestId']);
    _check(requests.add(row['requestId'] as String));
    final revision = _decimal(row['revision'], _maxRevision);
    _check(revision > BigInt.zero && revision < previous);
    previous = revision;
    _check(
      row['createdAt'] is String &&
          (row['createdAt'] as String).length <= 40 &&
          RegExp(r'^\d{4}-\d{2}-\d{2}T').hasMatch(row['createdAt'] as String) &&
          DateTime.tryParse(row['createdAt'] as String) != null,
    );
    final operation = validateEventOperation(row['operation']);
    _check(
      operation['eventId'] == eventId ||
          (operation['type'] == 'receipts_assign' &&
              (operation['receipts'] as List).any(
                (r) => r['previousEventId'] == eventId,
              )),
    );
    for (final states in [row['before'], row['after']]) {
      _check(states is List && states.length <= 100);
      for (final state in states as List) {
        _check(
          state is Map &&
              (!state.containsKey('owner_id') || state['owner_id'] == ownerId),
        );
      }
    }
    rows.add({
      'requestId': row['requestId'],
      'revision': row['revision'],
      'createdAt': row['createdAt'],
      'operation': operation,
    });
  }
  if (v['nextRevision'] != null) {
    _decimal(v['nextRevision'], _maxRevision);
    _check(rows.length == limit && v['nextRevision'] == rows.last['revision']);
  }
  _check(utf8.encode(jsonEncode(v)).length <= 10000000);
  return {
    'version': 1,
    'ownerId': ownerId,
    'eventId': eventId,
    'rows': rows,
    'nextRevision': v['nextRevision'],
  };
}
