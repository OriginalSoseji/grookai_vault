import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'portfolio_history.dart';
import 'portfolio_history_journal.dart';
import 'portfolio_history_journal_store.dart';

const kPortfolioHistoryConfigured =
    String.fromEnvironment('GV_PORTFOLIO_HISTORY_V1') != '';
const kPortfolioHistoryEnabled = bool.fromEnvironment(
  'GV_PORTFOLIO_HISTORY_V1',
);
String newPortfolioId() {
  final random = Random.secure(),
      bytes = List.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final h = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

abstract interface class PortfolioGateway {
  String? get ownerId;
  Stream<String?> get ownerChanges;
  Future<Object?> capabilities();
  Future<Object?> list(String? before, String? watermark, int limit);
  Future<Object?> compare(String beforeId, String afterId);
  Future<Object?> export(String pointId, String? afterCopy);
  Future<Object?> capture(Map<String, dynamic> request);
  Future<Object?> recover(Map<String, dynamic> request);
  Future<Object?> cancel(Map<String, dynamic> request);
}

class SupabasePortfolioGateway implements PortfolioGateway {
  SupabasePortfolioGateway(this.client);
  final SupabaseClient client;
  @override
  String? get ownerId => client.auth.currentUser?.id;
  @override
  Stream<String?> get ownerChanges =>
      client.auth.onAuthStateChange.map((event) => event.session?.user.id);
  Future<Object?> _rpc(String mode, [Map<String, dynamic> params = const {}]) =>
      client
          .rpc('portfolio_history_${mode}_v1', params: params)
          .timeout(Duration(seconds: mode == 'capture' ? 60 : 20));
  @override
  Future<Object?> capabilities() => _rpc('capabilities');
  @override
  Future<Object?> list(String? before, String? watermark, int limit) => _rpc(
    'list',
    {'p_before': before, 'p_watermark': watermark, 'p_limit': limit},
  );
  @override
  Future<Object?> compare(String beforeId, String afterId) =>
      _rpc('compare', {'p_before_id': beforeId, 'p_after_id': afterId});
  @override
  Future<Object?> export(String pointId, String? afterCopy) => _rpc('export', {
    'p_point_id': pointId,
    'p_after_copy': afterCopy,
    'p_limit': 100,
  });
  @override
  Future<Object?> capture(Map<String, dynamic> request) =>
      _rpc('capture', {'p_request': request});
  @override
  Future<Object?> recover(Map<String, dynamic> request) =>
      _rpc('recover', {'p_request': request});
  @override
  Future<Object?> cancel(Map<String, dynamic> request) =>
      _rpc('cancel', {'p_request': request});
}

class PortfolioAttempt {
  const PortfolioAttempt(
    this.status,
    this.journal, {
    this.acknowledgement,
    this.code,
  });
  final String status;
  final Map<String, dynamic>? journal, acknowledgement;
  final String? code;
}

class PortfolioHistoryService {
  PortfolioHistoryService({
    required this.gateway,
    PortfolioJournalStore? store,
    String Function()? newId,
    this.allowNewRecordings = kPortfolioHistoryEnabled,
  }) : ownerId = gateway.ownerId ?? '',
       _providedStore = store,
       _newId = newId ?? newPortfolioId {
    validatePortfolioJournal(null, ownerId);
    _subscription = gateway.ownerChanges.listen((owner) {
      if (owner != ownerId) _invalidate();
    }, onError: (Object _) => _invalidate());
  }
  factory PortfolioHistoryService.supabase(SupabaseClient client) =>
      PortfolioHistoryService(gateway: SupabasePortfolioGateway(client));
  final PortfolioGateway gateway;
  final String ownerId;
  final bool allowNewRecordings;
  final PortfolioJournalStore? _providedStore;
  final String Function() _newId;
  late final PortfolioJournalStore _store =
      _providedStore ??
      SqlitePortfolioJournalStore(ownerId: ownerId, checkOwner: checkOwner);
  late final StreamSubscription<String?> _subscription;
  final _changes = StreamController<void>.broadcast(sync: true);
  bool _invalid = false, _busy = false;
  Stream<void> get accountChanges => _changes.stream;
  void _invalidate() {
    if (_invalid) return;
    _invalid = true;
    if (!_changes.isClosed) _changes.add(null);
  }

  void checkOwner() {
    if (gateway.ownerId != ownerId) _invalidate();
    if (_invalid) throw StateError('Your account changed. Reopen Vault.');
  }

  void dispose() {
    _invalidate();
    unawaited(_subscription.cancel());
    unawaited(_changes.close());
  }

  Future<Map<String, dynamic>> capabilities() async {
    checkOwner();
    final v = await gateway.capabilities();
    checkOwner();
    final result = validatePortfolioCapabilities(v);
    result['enabled'] = result['enabled'] == true && allowNewRecordings;
    return result;
  }

  Future<Map<String, dynamic>?> journal() async {
    checkOwner();
    final row = await _store.read();
    checkOwner();
    return validatePortfolioJournal(row, ownerId);
  }

  Future<Map<String, dynamic>> list({
    String? before,
    String? watermark,
    int limit = 30,
  }) async {
    checkOwner();
    final v = await gateway.list(before, watermark, limit);
    checkOwner();
    return validatePortfolioPage(
      v,
      ownerId,
      before: before,
      watermark: watermark,
      limit: limit,
    );
  }

  Future<Map<String, dynamic>> compare(String beforeId, String afterId) async {
    if (!portfolioId(beforeId) ||
        !portfolioId(afterId) ||
        beforeId == afterId) {
      throw const FormatException('Choose two different observations.');
    }
    checkOwner();
    final v = await gateway.compare(beforeId, afterId);
    checkOwner();
    return validatePortfolioComparison(v, beforeId, afterId);
  }

  Future<T> _exclusive<T>(Future<T> Function() action) async {
    checkOwner();
    if (_busy) throw StateError('A recording is already being checked.');
    _busy = true;
    try {
      return await action();
    } finally {
      _busy = false;
    }
  }

  Future<PortfolioAttempt> begin(String day, String? expectedLocalRevision) {
    if (!allowNewRecordings) {
      throw StateError('New recordings are unavailable.');
    }
    final request = validatePortfolioRequest({
      'version': 1,
      'requestId': _newId(),
      'day': day,
    });
    return _exclusive(() async {
      final row = await _store.change({
        'ownerId': ownerId,
        'expectedLocalRevision': expectedLocalRevision,
        'nextLocalRevision': _newId(),
        'action': 'stage',
        'request': request,
      });
      checkOwner();
      return _resolveRow(row, 'capture');
    });
  }

  Future<PortfolioAttempt> recover() => _resume('recover');
  Future<PortfolioAttempt> retry() => _resume('capture');
  Future<PortfolioAttempt> cancel() => _resume('cancel');
  Future<PortfolioAttempt> _resume(String mode) => _exclusive(() async {
    final row = await journal();
    return row?['pending'] != null
        ? _resolveRow(row!, mode)
        : PortfolioAttempt('empty', row);
  });
  Future<PortfolioAttempt> _resolveRow(
    Map<String, dynamic> row,
    String mode,
  ) async {
    final pending =
        validatePortfolioJournal(row, ownerId)!['pending']
            as Map<String, dynamic>;
    PortfolioAttempt uncertain([String? code]) =>
        PortfolioAttempt('unconfirmed', row, code: code);
    try {
      checkOwner();
      var outcome = await gateway.recover(pending);
      checkOwner();
      if (outcome == null && mode != 'recover') {
        if (mode == 'capture' && !allowNewRecordings) return uncertain('55000');
        outcome = mode == 'cancel'
            ? await gateway.cancel(pending)
            : await gateway.capture(pending);
        checkOwner();
      }
      if (outcome == null) return uncertain();
      final ack = confirmedPortfolioOutcome(pending, outcome, ownerId);
      final saved = await _store.change({
        'ownerId': ownerId,
        'expectedLocalRevision': row['localRevision'],
        'nextLocalRevision': _newId(),
        'action': 'acknowledge',
        'request': pending,
        'acknowledgement': ack,
      });
      checkOwner();
      return PortfolioAttempt(
        ack['status'] as String,
        saved,
        acknowledgement: ack,
      );
    } catch (error) {
      checkOwner();
      return uncertain(error is PostgrestException ? error.code : null);
    }
  }

  Future<Map<String, dynamic>> export(String pointId) async {
    if (!portfolioId(pointId)) {
      throw const FormatException('Choose a recorded observation.');
    }
    String? afterCopy;
    Map<String, dynamic>? point;
    final rows = <Map<String, dynamic>>[];
    while (true) {
      checkOwner();
      final dynamic v = await gateway.export(pointId, afterCopy);
      checkOwner();
      if (!portfolioFields(v, [
            'version',
            'ownerId',
            'point',
            'rows',
            'nextAfterCopy',
          ]) ||
          v['version'] != 1 ||
          v['ownerId'] != ownerId ||
          v['point']?['snapshotId'] != pointId ||
          v['rows'] is! List ||
          (v['rows'] as List).length > 100) {
        throw const FormatException('History export could not be verified.');
      }
      final summary = validatePortfolioSummary(v['point']);
      if (point != null && !samePortfolioValue(summary, point)) {
        throw const FormatException('History export changed.');
      }
      point = summary;
      for (final dynamic row in v['rows'] as List) {
        if (!portfolioFields(row, ['copy', 'evidence']) ||
            !portfolioId(row['copy']?['copyId']) ||
            row['evidence']?['copyId'] != row['copy']['copyId'] ||
            (afterCopy != null &&
                (row['copy']['copyId'] as String).compareTo(afterCopy) <= 0)) {
          throw const FormatException('History export ordering changed.');
        }
        afterCopy = row['copy']['copyId'] as String;
        rows.add(Map<String, dynamic>.from(jsonDecode(jsonEncode(row)) as Map));
      }
      if (rows.length > (point['coverage']['owned'] as int)) {
        throw const FormatException('History export contains extra copies.');
      }
      if (v['nextAfterCopy'] == null) break;
      if ((v['rows'] as List).length != 100 ||
          v['nextAfterCopy'] != afterCopy ||
          rows.length >= (point['coverage']['owned'] as int)) {
        throw const FormatException('History export cursor is invalid.');
      }
    }
    if (rows.length != point['coverage']['owned']) {
      throw const FormatException('History export is incomplete. Try again.');
    }
    checkOwner();
    return {'version': 1, 'ownerId': ownerId, 'point': point, 'rows': rows};
  }
}
