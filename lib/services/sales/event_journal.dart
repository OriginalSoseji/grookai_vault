import 'dart:convert';
import 'vendor_events.dart';

bool _id(dynamic v) =>
    v is String &&
    v.length == 36 &&
    RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    ).hasMatch(v);
void _check(bool v) {
  if (!v) {
    throw const FormatException(
      'Saved event edit changed or needs review. Its request has been retained.',
    );
  }
}

const _refusals = ['PT409', '22023', '42501'];
dynamic _stable(dynamic v) {
  if (v is List) return v.map(_stable).toList();
  if (v is Map) {
    final keys = v.keys.cast<String>().toList()..sort();
    return {for (final key in keys) key: _stable(v[key])};
  }
  return v;
}

Map<String, dynamic>? validateEventJournal(dynamic value, String ownerId) {
  _check(_id(ownerId));
  if (value == null) return null;
  const keys = ['version', 'ownerId', 'localRevision', 'pending', 'rejection'];
  _check(
    value is Map &&
        value.length == keys.length &&
        keys.every(value.containsKey),
  );
  final v = Map<String, dynamic>.from(value as Map);
  _check(
    v['version'] == 1 && v['ownerId'] == ownerId && _id(v['localRevision']),
  );
  if (v['pending'] != null) validateEventRequest(v['pending']);
  _check(
    v['rejection'] == null ||
        (v['pending'] != null && _refusals.contains(v['rejection'])),
  );
  return Map<String, dynamic>.from(jsonDecode(jsonEncode(v)) as Map);
}

Map<String, dynamic> changeEventJournal(
  dynamic current,
  Map<String, dynamic> change,
) {
  final owner = change['ownerId'];
  _check(_id(owner));
  final old = validateEventJournal(current, owner as String),
      nextRevision = change['nextLocalRevision'];
  _check(
    change['expectedLocalRevision'] == old?['localRevision'] &&
        _id(nextRevision) &&
        nextRevision != old?['localRevision'],
  );
  final next =
      old ??
      {
        'version': 1,
        'ownerId': owner,
        'localRevision': nextRevision,
        'pending': null,
        'rejection': null,
      };
  next['localRevision'] = nextRevision;
  final action = change['action'];
  if (action == 'stage') {
    _check(next['pending'] == null);
    next['pending'] = validateEventRequest(change['request']);
    next['rejection'] = null;
  } else if (action == 'acknowledge' || action == 'reject') {
    _check(
      next['pending'] != null &&
          jsonEncode(_stable(validateEventRequest(change['request']))) ==
              jsonEncode(_stable(next['pending'])),
    );
    if (action == 'acknowledge') {
      confirmedEventRequest(next['pending'], change['acknowledgement'], owner);
      next['pending'] = null;
      next['rejection'] = null;
    } else {
      _check(_refusals.contains(change['code']));
      next['rejection'] = change['code'];
    }
  } else if (action == 'discardRejected') {
    _check(next['pending'] != null && next['rejection'] != null);
    next['pending'] = null;
    next['rejection'] = null;
  } else {
    _check(false);
  }
  return validateEventJournal(next, owner)!;
}
