import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'copy_cost_journal.dart';
import 'copy_cost_models.dart';

abstract interface class CopyCostGateway {
  String? get ownerId;
  Stream<String?> get ownerChanges;
  Future<Object?> read(String instanceId);
  Future<Object?> recover(String requestId);
  Future<Object?> save(CopyCostRequest request);
}

class SupabaseCopyCostGateway implements CopyCostGateway {
  SupabaseCopyCostGateway(this.client);
  final SupabaseClient client;
  @override
  String? get ownerId => client.auth.currentUser?.id;
  @override
  Stream<String?> get ownerChanges =>
      client.auth.onAuthStateChange.map((event) => event.session?.user.id);
  @override
  Future<Object?> read(String instanceId) => client.rpc(
    'vault_copy_cost_read_v1',
    params: {
      'p_instance_ids': [instanceId],
    },
  );
  @override
  Future<Object?> recover(String requestId) => client.rpc(
    'vault_copy_cost_request_read_v1',
    params: {'p_request_id': requestId},
  );
  @override
  Future<Object?> save(CopyCostRequest request) =>
      client.rpc('vault_copy_cost_save_v1', params: request.rpcParams);
}

class CopyCostRead {
  const CopyCostRead({
    required this.cost,
    required this.archived,
    required this.editEnabled,
  });
  final CopyCostEvidence? cost;
  final bool archived, editEnabled;
}

class CopyCostOpen {
  const CopyCostOpen({
    required this.draft,
    required this.current,
    this.readError,
  });
  final CopyCostDraft? draft;
  final CopyCostRead? current;
  final String? readError;
  bool get needsReview =>
      draft?.needsReview == true ||
      (draft != null &&
          current?.cost != null &&
          (draft!.expectedAmount != current!.cost!.amount ||
              draft!.expectedCurrency != current!.cost!.currency));
}

enum CopyCostAttemptState { saved, unconfirmed, rejected }

class CopyCostAttempt {
  const CopyCostAttempt(this.state, this.draft, this.message);
  final CopyCostAttemptState state;
  final CopyCostDraft draft;
  final String message;
}

String _newRequestId() {
  final random = Random.secure();
  final bytes = List.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

class CopyCostService {
  CopyCostService({
    required this.gateway,
    CopyCostStore? store,
    String Function()? newRequestId,
  }) : ownerId =
           gateway.ownerId ??
           (throw StateError('Sign in to edit private costs.')),
       _providedStore = store,
       _newId = newRequestId ?? _newRequestId {
    if (!isCopyCostId(ownerId)) {
      throw StateError('Sign in to edit private costs.');
    }
    _subscription = gateway.ownerChanges.listen((owner) {
      if (owner != ownerId) {
        _invalidate();
      }
    });
  }
  factory CopyCostService.supabase(SupabaseClient client) =>
      CopyCostService(gateway: SupabaseCopyCostGateway(client));
  final String ownerId;
  final CopyCostGateway gateway;
  final CopyCostStore? _providedStore;
  final String Function() _newId;
  late final CopyCostStore _store =
      _providedStore ??
      SqliteCopyCostStore(ownerId: ownerId, checkOwner: checkOwner);
  late final StreamSubscription<String?> _subscription;
  final _changes = StreamController<void>.broadcast(sync: true);
  bool _closed = false;
  Stream<void> get accountChanges => _changes.stream;
  void _invalidate() {
    if (_closed) return;
    _closed = true;
    if (!_changes.isClosed) _changes.add(null);
  }

  void checkOwner() {
    if (gateway.ownerId != ownerId) _invalidate();
    if (_closed) {
      throw StateError('Your account changed. Reopen private costs.');
    }
  }

  void dispose() {
    _closed = true;
    unawaited(_subscription.cancel());
    unawaited(_changes.close());
  }

  void _draftOwner(CopyCostDraft draft) {
    checkOwner();
    if (draft.ownerId != ownerId) {
      throw StateError('This edit belongs to another account.');
    }
  }

  Future<CopyCostRead> read(String instanceId) async {
    checkOwner();
    if (!isCopyCostId(instanceId)) {
      throw const FormatException('Invalid copy identity.');
    }
    final value = await gateway
        .read(instanceId)
        .timeout(const Duration(seconds: 15));
    checkOwner();
    if (value is! Map ||
        value['ownerId'] != ownerId ||
        value['editEnabled'] is! bool ||
        value['copies'] is! List) {
      throw const FormatException('Private cost could not be verified.');
    }
    final rows = value['copies'] as List;
    if (rows.isEmpty) {
      return const CopyCostRead(cost: null, archived: true, editEnabled: false);
    }
    if (rows.length != 1 ||
        rows.single is! Map ||
        rows.single['instanceId'] != instanceId ||
        rows.single['archived'] is! bool) {
      throw const FormatException('Private cost belongs to a different copy.');
    }
    return CopyCostRead(
      cost: CopyCostEvidence.fromJson(rows.single['cost']),
      archived: rows.single['archived'] as bool,
      editEnabled: value['editEnabled'] as bool,
    );
  }

  Future<CopyCostOpen> open({
    required String instanceId,
    required String gvviId,
    required String title,
  }) async {
    checkOwner();
    final saved = await _store.read(instanceId);
    checkOwner();
    try {
      final current = await read(instanceId);
      final draft =
          saved ??
          (current.cost == null
              ? null
              : CopyCostDraft.create(
                  ownerId: ownerId,
                  instanceId: instanceId,
                  gvviId: gvviId,
                  title: title,
                  cost: current.cost!,
                ));
      return CopyCostOpen(draft: draft, current: current);
    } catch (_) {
      checkOwner();
      return CopyCostOpen(
        draft: saved,
        current: null,
        readError:
            'Current cost could not load. Retry the read; your saved proposal has not changed.',
      );
    }
  }

  Future<CopyCostDraft> edit(
    CopyCostDraft draft,
    String amount,
    String currency,
  ) async {
    _draftOwner(draft);
    if (draft.pending != null) {
      throw StateError('Recover the pending save before editing again.');
    }
    final next = await _store.save(
      draft.withValues({'amountText': amount, 'currencyText': currency}),
    );
    checkOwner();
    return next;
  }

  Future<CopyCostDraft> reviewCurrent(CopyCostDraft draft) async {
    _draftOwner(draft);
    if (draft.pending != null) {
      throw StateError(
        'Recover the pending save before reviewing another cost.',
      );
    }
    final current = await read(draft.instanceId);
    if (current.cost == null || current.archived) {
      throw StateError('This copy is no longer editable.');
    }
    final next = await _store.save(
      draft.withValues({
        'expectedAmount': current.cost!.amount,
        'expectedCurrency': current.cost!.currency,
        'needsReview': false,
      }),
    );
    checkOwner();
    return next;
  }

  Future<int> pendingCount() async {
    checkOwner();
    final count = await _store.pendingCount();
    checkOwner();
    return count;
  }

  Future<List<CopyCostDraft>> pending({String? after}) async {
    checkOwner();
    final rows = await _store.pending(after: after);
    checkOwner();
    return rows;
  }

  Future<CopyCostAttempt> beginSave(CopyCostDraft draft) async {
    _draftOwner(draft);
    if (draft.pending != null) {
      throw StateError('Retry the existing save instead.');
    }
    if (draft.needsReview) {
      throw StateError('Review the current cost before saving again.');
    }
    final input = CopyCostInput.parse(draft.amountText, draft.currencyText);
    final request = CopyCostRequest(
      ownerId: ownerId,
      instanceId: draft.instanceId,
      requestId: _newId(),
      expectedAmount: draft.expectedAmount,
      expectedCurrency: draft.expectedCurrency,
      amount: input.amount,
      currency: input.currency,
    );
    // No network write is reachable until this transaction has committed.
    final prepared = await _store.save(
      draft.withValues({'pending': request.toJson()}),
    );
    checkOwner();
    return _send(prepared);
  }

  Future<CopyCostAttempt> retry(String instanceId) async {
    checkOwner();
    final current = await _store.read(instanceId);
    checkOwner();
    if (current?.pending == null) {
      throw StateError('No pending cost save remains. Refresh this copy.');
    }
    return _send(current!);
  }

  Future<CopyCostAttempt?> recover(String instanceId) async {
    checkOwner();
    final draft = await _store.read(instanceId);
    checkOwner();
    final request = draft?.pending;
    if (request == null) return null;
    try {
      final result = await gateway
          .recover(request.requestId)
          .timeout(const Duration(seconds: 15));
      checkOwner();
      if (result != null && request.confirms(result)) {
        return await _confirmed(draft!, request, result);
      }
    } catch (_) {
      checkOwner();
    }
    return CopyCostAttempt(
      CopyCostAttemptState.unconfirmed,
      draft!,
      'This save is not confirmed. Retry the same save; its request will not change.',
    );
  }

  Future<CopyCostAttempt> _send(CopyCostDraft draft) async {
    _draftOwner(draft);
    final request = draft.pending!;
    // Reread durable authority immediately before dispatch, including retries.
    final durable = await _store.read(draft.instanceId);
    checkOwner();
    if (durable?.pending == null ||
        jsonEncode(durable!.pending!.toJson()) !=
            jsonEncode(request.toJson())) {
      throw StateError(
        'The pending save changed in another screen. Reopen this copy.',
      );
    }
    try {
      final result = await gateway
          .save(request)
          .timeout(const Duration(seconds: 15));
      checkOwner();
      if (request.confirms(result)) {
        return await _confirmed(durable, request, result);
      }
    } on PostgrestException catch (error) {
      checkOwner();
      final definitive =
          (error.code == 'PT409' &&
              (error.message == 'Copy unavailable' ||
                  error.message == 'Cost changed; review the current value')) ||
          (error.code == '42501' &&
              error.message == 'Cost editing unavailable') ||
          (error.code == '22023' &&
              error.message ==
                  'Enter a nonnegative cost with at most two decimals and its currency');
      if (definitive) {
        final current = await _store.read(draft.instanceId);
        checkOwner();
        if (current?.pending?.requestId == request.requestId) {
          final rejected = await _store.save(
            current!.withValues({'pending': null, 'needsReview': true}),
            resolving: request,
          );
          checkOwner();
          return CopyCostAttempt(
            CopyCostAttemptState.rejected,
            rejected,
            'The save was rejected. Your proposal is retained. Review the current cost before trying again.',
          );
        }
      }
    } catch (_) {
      checkOwner();
    }
    return CopyCostAttempt(
      CopyCostAttemptState.unconfirmed,
      durable,
      'The save is not confirmed. Its request is saved on this device. Retry the same save.',
    );
  }

  Future<CopyCostAttempt> _confirmed(
    CopyCostDraft draft,
    CopyCostRequest request,
    Object? result,
  ) async {
    checkOwner();
    if (!request.confirms(result)) {
      throw StateError('The save result could not be verified.');
    }
    final current = await _store.read(draft.instanceId);
    checkOwner();
    if (current == null) {
      throw StateError('The saved request could not be found.');
    }
    if (current.pending == null) {
      return CopyCostAttempt(
        CopyCostAttemptState.saved,
        current,
        'Cost saved.',
      );
    }
    if (current.pending!.requestId != request.requestId) {
      throw StateError('Another cost save needs recovery.');
    }
    final cost = CopyCostEvidence.fromJson((result as Map)['cost']);
    final settled = await _store.save(
      current.withValues({
        'pending': null,
        'expectedAmount': cost.amount,
        'expectedCurrency': cost.currency,
        'needsReview': false,
      }),
      resolving: request,
    );
    checkOwner();
    return CopyCostAttempt(CopyCostAttemptState.saved, settled, 'Cost saved.');
  }
}
