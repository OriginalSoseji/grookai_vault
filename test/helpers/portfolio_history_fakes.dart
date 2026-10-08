import 'dart:async';
import 'dart:convert';
import 'package:grookai_vault/services/vault/portfolio_history_journal.dart';
import 'package:grookai_vault/services/vault/portfolio_history_journal_store.dart';
import 'package:grookai_vault/services/vault/portfolio_history_service.dart';

String portfolioTestId(int n) =>
    '00000000-0000-4000-8000-${n.toRadixString(16).padLeft(12, '0')}';
const portfolioTestDay = '2026-10-08';
dynamic portfolioCopy(dynamic v) => jsonDecode(jsonEncode(v));
Map<String, dynamic> portfolioTestPoint({int sequence = 1, int owned = 0}) => {
  'snapshotId': portfolioTestId(sequence + 1),
  'sequence': '$sequence',
  'capturedAt':
      '2026-10-${(7 + sequence).toString().padLeft(2, '0')}T12:00:00.000Z',
  'state': owned == 0 ? 'empty' : 'unpriced',
  'totals': <String, dynamic>{},
  'coverage': {
    'owned': owned,
    'priced': 0,
    'unpriced': owned,
    'byKind': {
      'raw': {'owned': owned, 'priced': 0, 'unpriced': owned},
      'slab': {'owned': 0, 'priced': 0, 'unpriced': 0},
      'sealed': {'owned': 0, 'priced': 0, 'unpriced': 0},
    },
    'byReason': {if (owned > 0) 'no_qualified_price': owned},
    'byCurrency': <String, dynamic>{},
  },
};

class PortfolioMemoryStore implements PortfolioJournalStore {
  Map<String, dynamic>? row;
  bool failStage = false, failAck = false;
  @override
  Future<Map<String, dynamic>?> read() async =>
      row == null ? null : Map<String, dynamic>.from(portfolioCopy(row) as Map);
  @override
  Future<Map<String, dynamic>> change(Map<String, dynamic> c) async {
    if (c['action'] == 'stage' && failStage ||
        c['action'] == 'acknowledge' && failAck) {
      throw StateError('Disk full');
    }
    row = changePortfolioJournal(row, c);
    return (await read())!;
  }
}

class PortfolioFakeGateway implements PortfolioGateway {
  @override
  String? ownerId = portfolioTestId(1);
  final changes = StreamController<String?>.broadcast(sync: true);
  @override
  Stream<String?> get ownerChanges => changes.stream;
  bool enabled = true, loseResponse = false, offline = false, failList = false;
  String? failure;
  int captures = 0, cancels = 0;
  Map<String, dynamic>? outcome;
  List<Map<String, dynamic>> points = [];
  Completer<Object?>? delayed;
  Future<Object?> Function(String, String?)? exportHandler;
  Object? comparison;
  @override
  Future<Object?> capabilities() async => {
    'version': 1,
    'enabled': enabled,
    'day': portfolioTestDay,
    'maximumCopies': 20000,
    'cadence': 'first_visit_utc_day',
  };
  @override
  Future<Object?> list(String? before, String? watermark, int limit) async {
    if (failList) throw StateError('History unavailable');
    return {
      'version': 1,
      'ownerId': ownerId,
      'watermark':
          watermark ?? (points.isEmpty ? '0' : points.first['sequence']),
      'points': portfolioCopy(points),
      'nextBefore': null,
    };
  }

  @override
  Future<Object?> compare(String beforeId, String afterId) async =>
      portfolioCopy(comparison);
  @override
  Future<Object?> export(String pointId, String? afterCopy) async =>
      exportHandler == null
      ? {
          'version': 1,
          'ownerId': ownerId,
          'point': portfolioTestPoint(),
          'rows': [],
          'nextAfterCopy': null,
        }
      : await exportHandler!(pointId, afterCopy);
  Map<String, dynamic> result(Map<String, dynamic> request, String status) => {
    'version': 1,
    'ownerId': ownerId,
    'request': portfolioCopy(request),
    'status': status,
    'pointId': status == 'captured' ? portfolioTestId(2) : null,
    'errorCode': status == 'failed' ? failure : null,
    'recordedAt': '${portfolioTestDay}T12:00:00.000Z',
    'summary': status == 'captured' ? portfolioTestPoint() : null,
  };
  @override
  Future<Object?> recover(Map<String, dynamic> request) async {
    if (offline) throw StateError('Offline');
    return delayed == null ? portfolioCopy(outcome) : await delayed!.future;
  }

  @override
  Future<Object?> capture(Map<String, dynamic> request) async {
    captures++;
    if (offline) throw StateError('Offline');
    outcome = result(request, failure == null ? 'captured' : 'failed');
    if (failure == null) points = [portfolioTestPoint()];
    if (loseResponse) throw StateError('Response lost');
    return portfolioCopy(outcome);
  }

  @override
  Future<Object?> cancel(Map<String, dynamic> request) async {
    cancels++;
    if (offline) throw StateError('Offline');
    outcome ??= result(request, 'cancelled');
    return portfolioCopy(outcome);
  }

  void switchOwner() {
    ownerId = portfolioTestId(9);
    changes.add(ownerId);
  }
}
