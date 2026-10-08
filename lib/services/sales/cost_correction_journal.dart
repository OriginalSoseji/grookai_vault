import 'dart:convert';
import 'sale_cost_corrections.dart';

bool _id(dynamic v) =>
    v is String &&
    v.length == 36 &&
    RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    ).hasMatch(v);
void _check(bool v) {
  if (!v) {
    throw const FormatException(
      'Saved cost correction changed or needs review. Its request has been retained.',
    );
  }
}

Map<String, dynamic>? validateCostCorrectionJournal(
  dynamic value,
  String ownerId,
) {
  _check(_id(ownerId));
  if (value == null) return null;
  const keys = ['version', 'ownerId', 'localRevision', 'pending'];
  _check(
    value is Map &&
        value.length == keys.length &&
        keys.every(value.containsKey),
  );
  final v = Map<String, dynamic>.from(value as Map);
  _check(
    v['version'] == 1 && v['ownerId'] == ownerId && _id(v['localRevision']),
  );
  if (v['pending'] != null) validateSaleCostCorrectionRequest(v['pending']);
  return Map<String, dynamic>.from(jsonDecode(jsonEncode(v)) as Map);
}

Map<String, dynamic> changeCostCorrectionJournal(
  dynamic current,
  Map<String, dynamic> change,
) {
  final owner = change['ownerId'];
  _check(_id(owner));
  final old = validateCostCorrectionJournal(current, owner as String),
      revision = change['nextLocalRevision'];
  _check(
    change['expectedLocalRevision'] == old?['localRevision'] &&
        _id(revision) &&
        revision != old?['localRevision'],
  );
  final next =
      old ??
      {
        'version': 1,
        'ownerId': owner,
        'localRevision': revision,
        'pending': null,
      };
  next['localRevision'] = revision;
  if (change['action'] == 'stage') {
    _check(next['pending'] == null);
    next['pending'] = validateSaleCostCorrectionRequest(change['request']);
  } else if (change['action'] == 'acknowledge') {
    _check(
      next['pending'] != null &&
          sameCostEvidence(
            validateSaleCostCorrectionRequest(change['request']),
            next['pending'],
          ),
    );
    confirmedSaleCostCorrection(
      next['pending'],
      change['acknowledgement'],
      owner,
    );
    next['pending'] = null;
  } else {
    _check(false);
  }
  return validateCostCorrectionJournal(next, owner)!;
}
