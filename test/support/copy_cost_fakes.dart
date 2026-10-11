import 'dart:async';

import 'package:grookai_vault/services/vault/copy_cost_models.dart';
import 'package:grookai_vault/services/vault/copy_cost_journal.dart';
import 'package:grookai_vault/services/vault/copy_cost_service.dart';

const owner = '11111111-1111-4111-8111-111111111111';
const instance = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const other = '44444444-4444-4444-8444-444444444444';
const unknown = CopyCostEvidence(
  amount: null,
  currency: null,
  minor: null,
  status: 'missing_amount',
);

class MemoryCostStore implements CopyCostStore {
  CopyCostDraft? value;
  bool fail = false;
  int writes = 0;
  Completer<void>? hold;
  final List<String> events;
  MemoryCostStore(this.events);
  @override
  Future<CopyCostDraft?> read(String id) async => value;
  @override
  Future<int> pendingCount() async => value?.pending == null ? 0 : 1;
  @override
  Future<List<CopyCostDraft>> pending({String? after, int limit = 50}) async =>
      value?.pending == null ? [] : [value!];
  @override
  Future<CopyCostDraft> save(
    CopyCostDraft proposed, {
    CopyCostRequest? resolving,
  }) async {
    if (hold != null) await hold!.future;
    if (fail) throw StateError('Synthetic disk failure');
    if (proposed.revision != (value?.revision ?? 0)) {
      throw StateError('Synthetic competing editor');
    }
    events.add('persist');
    writes++;
    return value = proposed.withValues({'revision': proposed.revision + 1});
  }
}

class FakeCostGateway implements CopyCostGateway {
  @override
  String? ownerId = owner;
  final changes = StreamController<String?>.broadcast(sync: true);
  @override
  Stream<String?> get ownerChanges => changes.stream;
  final List<String> events;
  final requests = <Map<String, dynamic>>[];
  Object? recorded;
  Object? error;
  bool loseResponse = false,
      failRead = false,
      failRecovery = false,
      wrongResult = false;
  bool archived = false, editEnabled = true, updateCost = false;
  CopyCostEvidence cost = unknown;
  Completer<void>? hold;
  void Function()? afterWrite;
  FakeCostGateway(this.events);
  @override
  Future<Object?> read(String id) async {
    if (failRead) throw StateError('Synthetic read failure');
    return {
      'ownerId': ownerId,
      'editEnabled': editEnabled,
      'copies': [
        {
          'instanceId': id,
          'archived': archived,
          'cost': {
            'amount': cost.amount,
            'currency': cost.currency,
            'minor': cost.minor,
            'status': cost.status,
          },
        },
      ],
    };
  }

  @override
  Future<Object?> recover(String id) async {
    if (failRecovery) throw StateError('Synthetic read failure');
    return recorded;
  }

  @override
  Future<Object?> save(CopyCostRequest request) async {
    events.add('write');
    requests.add(request.toJson());
    if (hold != null) await hold!.future;
    if (error != null) throw error!;
    final input = CopyCostInput.parse(
      request.amount ?? '',
      request.currency ?? '',
    );
    recorded = {
      'ownerId': wrongResult ? other : owner,
      'instanceId': instance,
      'requestId': request.requestId,
      'cost': {
        'amount': input.amount,
        'currency': input.currency,
        'minor': input.minor,
        'status': input.amount == null ? 'missing_amount' : 'known',
      },
    };
    afterWrite?.call();
    if (updateCost) cost = CopyCostEvidence.fromJson((recorded as Map)['cost']);
    if (loseResponse) throw StateError('Synthetic lost committed response');
    return recorded;
  }
}
