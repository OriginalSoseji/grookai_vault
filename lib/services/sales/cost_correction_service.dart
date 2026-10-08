import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:math';
import 'sale_cost_corrections.dart';
import 'cost_correction_journal.dart';
import 'cost_correction_journal_store.dart';

String newCostCorrectionId() {
  final random = Random.secure(),
      bytes = List.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

abstract interface class CostCorrectionGateway {
  String? get ownerId;
  Stream<String?> get ownerChanges;
  Future<Object?> available();
  Future<Object?> read(List<String> ids);
  Future<Object?> history(
    String receiptId,
    int lineIndex,
    String? beforeRevision,
  );
  Future<Object?> recover(Map<String, dynamic> request);
  Future<Object?> apply(Map<String, dynamic> request);
  Future<Object?> cancel(Map<String, dynamic> request);
}

class SupabaseCostCorrectionGateway implements CostCorrectionGateway {
  SupabaseCostCorrectionGateway(this.client);
  final SupabaseClient client;
  @override
  String? get ownerId => client.auth.currentUser?.id;
  @override
  Stream<String?> get ownerChanges =>
      client.auth.onAuthStateChange.map((e) => e.session?.user.id);
  Future<Object?> _rpc(String name, [Map<String, dynamic> params = const {}]) =>
      client.rpc(name, params: params).timeout(const Duration(seconds: 20));
  @override
  Future<Object?> available() =>
      _rpc('vendor_sale_cost_correction_available_v1');
  @override
  Future<Object?> read(List<String> ids) =>
      _rpc('vendor_sale_cost_correction_read_v1', {'p_receipt_ids': ids});
  @override
  Future<Object?> history(
    String receiptId,
    int lineIndex,
    String? beforeRevision,
  ) => _rpc('vendor_sale_cost_correction_history_v1', {
    'p_receipt_id': receiptId,
    'p_line_index': lineIndex,
    'p_before_revision': beforeRevision,
  });
  @override
  Future<Object?> recover(Map<String, dynamic> request) =>
      _rpc('vendor_sale_cost_correction_recover_v1', {'p_request': request});
  @override
  Future<Object?> apply(Map<String, dynamic> request) =>
      _rpc('vendor_sale_cost_correction_apply_v1', {'p_request': request});
  @override
  Future<Object?> cancel(Map<String, dynamic> request) =>
      _rpc('vendor_sale_cost_correction_cancel_v1', {'p_request': request});
}

class CostCorrectionAttempt {
  const CostCorrectionAttempt(
    this.status,
    this.journal, {
    this.acknowledgement,
    this.code,
    this.message,
  });
  final String status;
  final Map<String, dynamic>? journal, acknowledgement;
  final String? code, message;
}

class CostCorrectionService {
  CostCorrectionService({
    required this.gateway,
    CostCorrectionJournalStore? store,
    String Function()? newId,
  }) : ownerId = gateway.ownerId ?? '',
       _providedStore = store,
       _newId = newId ?? newCostCorrectionId {
    validateCostCorrectionJournal(null, ownerId);
    _subscription = gateway.ownerChanges.listen((owner) {
      if (owner != ownerId) _invalidate();
    }, onError: (Object _) => _invalidate());
  }
  factory CostCorrectionService.supabase(SupabaseClient client) =>
      CostCorrectionService(gateway: SupabaseCostCorrectionGateway(client));
  final CostCorrectionGateway gateway;
  final String ownerId;
  final CostCorrectionJournalStore? _providedStore;
  final String Function() _newId;
  late final CostCorrectionJournalStore _store =
      _providedStore ??
      SqliteCostCorrectionJournalStore(
        ownerId: ownerId,
        checkOwner: checkOwner,
      );
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
    if (_invalid) throw StateError('Your account changed. Reopen Reports.');
  }

  void dispose() {
    _invalidate();
    unawaited(_subscription.cancel());
    unawaited(_changes.close());
  }

  Future<bool> available() async {
    checkOwner();
    final result = await gateway.available();
    checkOwner();
    if (result is! bool) {
      throw StateError('Cost correction availability could not load.');
    }
    return result;
  }

  Future<List<dynamic>> read(List<String> receiptIds) async {
    final ids = List<String>.of(receiptIds);
    checkOwner();
    final result = <dynamic>[];
    validateSaleCostCorrectionStates(
      ids
          .map(
            (id) => {
              'version': 1,
              'ownerId': ownerId,
              'receiptId': id.toLowerCase(),
              'receipt': null,
              'source': null,
              'lines': <dynamic>[],
            },
          )
          .toList(),
      ownerId,
      ids,
    );
    for (var index = 0; index < ids.length; index += 100) {
      final end = index + 100 < ids.length ? index + 100 : ids.length,
          batch = ids.sublist(index, end);
      checkOwner();
      final rows = await gateway.read(batch);
      checkOwner();
      result.addAll(validateSaleCostCorrectionStates(rows, ownerId, batch));
    }
    return validateSaleCostCorrectionStates(result, ownerId, ids);
  }

  Future<List<dynamic>> history(
    String receiptId,
    int lineIndex, {
    String? beforeRevision,
  }) async {
    checkOwner();
    final rows = await gateway.history(receiptId, lineIndex, beforeRevision);
    checkOwner();
    return validateSaleCostCorrectionHistory(
      rows,
      ownerId,
      receiptId,
      lineIndex,
      beforeRevision: beforeRevision,
    );
  }

  Future<Map<String, dynamic>?> journal() async {
    checkOwner();
    final row = await _store.read();
    checkOwner();
    return validateCostCorrectionJournal(row, ownerId);
  }

  Future<T> _exclusive<T>(Future<T> Function() action) async {
    checkOwner();
    if (_busy) throw StateError('A cost correction is already being checked.');
    _busy = true;
    try {
      return await action();
    } finally {
      _busy = false;
    }
  }

  Future<CostCorrectionAttempt> begin(
    Map<String, dynamic> value,
    String? expectedLocalRevision,
  ) {
    final request = validateSaleCostCorrectionRequest(value);
    return _exclusive(() async {
      final row = await _store.change({
        'ownerId': ownerId,
        'expectedLocalRevision': expectedLocalRevision,
        'nextLocalRevision': _newId(),
        'action': 'stage',
        'request': request,
      });
      checkOwner();
      return _resolveRow(row, 'apply');
    });
  }

  Future<CostCorrectionAttempt> recover() => _resume('recover');
  Future<CostCorrectionAttempt> retry() => _resume('apply');
  Future<CostCorrectionAttempt> cancel() => _resume('cancel');
  Future<CostCorrectionAttempt> _resume(String mode) => _exclusive(() async {
    final row = await journal();
    return row?['pending'] != null
        ? _resolveRow(row!, mode)
        : CostCorrectionAttempt('empty', row);
  });
  Future<CostCorrectionAttempt> _resolveRow(
    Map<String, dynamic> row,
    String mode,
  ) async {
    final pending =
        validateCostCorrectionJournal(row, ownerId)!['pending']
            as Map<String, dynamic>;
    CostCorrectionAttempt uncertain([String? code]) => CostCorrectionAttempt(
      'unconfirmed',
      row,
      code: code,
      message:
          'The outcome is not confirmed. The exact correction is retained. Check it again or cancel this request before editing.',
    );
    try {
      checkOwner();
      var outcome = await gateway.recover(pending);
      checkOwner();
      if (outcome == null && mode != 'recover') {
        outcome = mode == 'cancel'
            ? await gateway.cancel(pending)
            : await gateway.apply(pending);
        checkOwner();
      }
      if (outcome == null) return uncertain();
      final acknowledgement = confirmedSaleCostCorrection(
        pending,
        outcome,
        ownerId,
      );
      final saved = await _store.change({
        'ownerId': ownerId,
        'expectedLocalRevision': row['localRevision'],
        'nextLocalRevision': _newId(),
        'action': 'acknowledge',
        'request': pending,
        'acknowledgement': acknowledgement,
      });
      checkOwner();
      return CostCorrectionAttempt(
        acknowledgement['status'] as String,
        saved,
        acknowledgement: acknowledgement,
      );
    } catch (error) {
      checkOwner();
      return uncertain(error is PostgrestException ? error.code : null);
    }
  }
}
