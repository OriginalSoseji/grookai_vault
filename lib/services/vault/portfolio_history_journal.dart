import 'dart:convert';
import 'portfolio_history.dart';

void _check(bool value) {
  if (!value) {
    throw const FormatException(
      'Saved collection recording changed. Its request has been retained.',
    );
  }
}

Map<String, dynamic>? validatePortfolioJournal(dynamic v, String ownerId) {
  _check(portfolioId(ownerId));
  if (v == null) return null;
  _check(
    portfolioFields(v, [
          'version',
          'ownerId',
          'localRevision',
          'pending',
          'lastOutcome',
        ]) &&
        v['version'] == 1 &&
        v['ownerId'] == ownerId &&
        portfolioId(v['localRevision']),
  );
  if (v['pending'] != null) validatePortfolioRequest(v['pending']);
  if (v['lastOutcome'] != null) {
    confirmedPortfolioOutcome(
      Map<String, dynamic>.from(v['lastOutcome']['request'] as Map),
      v['lastOutcome'],
      ownerId,
    );
  }
  return Map<String, dynamic>.from(jsonDecode(jsonEncode(v)) as Map);
}

Map<String, dynamic> changePortfolioJournal(
  dynamic current,
  Map<String, dynamic> change,
) {
  final owner = change['ownerId'];
  _check(portfolioId(owner));
  final old = validatePortfolioJournal(current, owner as String),
      revision = change['nextLocalRevision'];
  _check(
    change['expectedLocalRevision'] == old?['localRevision'] &&
        portfolioId(revision) &&
        revision != old?['localRevision'],
  );
  final next =
      old ??
      {
        'version': 1,
        'ownerId': owner,
        'localRevision': revision,
        'pending': null,
        'lastOutcome': null,
      };
  next['localRevision'] = revision;
  if (change['action'] == 'stage') {
    _check(next['pending'] == null);
    next['pending'] = validatePortfolioRequest(change['request']);
  } else if (change['action'] == 'acknowledge') {
    _check(
      next['pending'] != null &&
          samePortfolioValue(
            validatePortfolioRequest(change['request']),
            next['pending'],
          ),
    );
    next['lastOutcome'] = confirmedPortfolioOutcome(
      Map<String, dynamic>.from(next['pending'] as Map),
      change['acknowledgement'],
      owner,
    );
    next['pending'] = null;
  } else {
    _check(false);
  }
  return validatePortfolioJournal(next, owner)!;
}
