import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'copy_cost_models.dart';

abstract interface class CopyCostReviewGateway {
  String? get ownerId;
  Stream<String?> get ownerChanges;
  Future<Object?> read(List<String> instanceIds);
}

class SupabaseCopyCostReviewGateway implements CopyCostReviewGateway {
  SupabaseCopyCostReviewGateway(this.client);
  final SupabaseClient client;
  @override
  String? get ownerId => client.auth.currentUser?.id;
  @override
  Stream<String?> get ownerChanges =>
      client.auth.onAuthStateChange.map((event) => event.session?.user.id);
  @override
  Future<Object?> read(List<String> instanceIds) => client.rpc(
    'vault_copy_cost_read_v1',
    params: {'p_instance_ids': instanceIds},
  );
}

enum CopyCostReviewState {
  missingAmount,
  missingCurrency,
  needsReview,
  known,
  unavailable,
}

class CopyCostReviewRow {
  const CopyCostReviewRow(this.instanceId, this.state, this.cost);
  final String instanceId;
  final CopyCostReviewState state;
  final CopyCostEvidence? cost;
  bool get needsAttention => const {
    CopyCostReviewState.missingAmount,
    CopyCostReviewState.missingCurrency,
    CopyCostReviewState.needsReview,
  }.contains(state);
  String get label => switch (state) {
    CopyCostReviewState.missingAmount => 'Cost unknown',
    CopyCostReviewState.missingCurrency => 'Currency needed',
    CopyCostReviewState.needsReview => 'Cost needs review',
    CopyCostReviewState.known => cost!.label,
    CopyCostReviewState.unavailable => 'Copy no longer available',
  };
}

/// Owner-only, complete reads of an explicitly selected set of inventory copies.
/// Absent/archived copies remain unavailable, never missing-cost suggestions.
class CopyCostReviewService {
  CopyCostReviewService(this.gateway)
    : ownerId = gateway.ownerId ?? (throw StateError('Sign in required.')) {
    if (!isCopyCostId(ownerId)) throw StateError('Sign in required.');
    _subscription = gateway.ownerChanges.listen((owner) {
      if (owner != ownerId) _invalidate();
    });
  }
  factory CopyCostReviewService.supabase(SupabaseClient client) =>
      CopyCostReviewService(SupabaseCopyCostReviewGateway(client));
  final CopyCostReviewGateway gateway;
  final String ownerId;
  late final StreamSubscription<String?> _subscription;
  final _changes = StreamController<void>.broadcast(sync: true);
  bool _closed = false;
  Stream<void> get accountChanges => _changes.stream;
  void _invalidate() {
    if (_closed) return;
    _closed = true;
    _changes.add(null);
  }

  void checkOwner() {
    if (gateway.ownerId != ownerId) _invalidate();
    if (_closed) throw StateError('Your account changed. Reopen cost review.');
  }

  void dispose() {
    _closed = true;
    unawaited(_subscription.cancel());
    unawaited(_changes.close());
  }

  Future<List<CopyCostReviewRow>> read(
    Iterable<String> instanceIds, {
    bool Function()? isCurrent,
  }) async {
    void current() {
      checkOwner();
      if (isCurrent != null && !isCurrent()) {
        throw StateError('Review changed.');
      }
    }

    current();
    final ids = <String>{};
    for (final id in instanceIds) {
      if (!isCopyCostId(id)) {
        throw const FormatException('Invalid copy identity.');
      }
      ids.add(id.toLowerCase());
      if (ids.length > 10000) {
        throw const FormatException('Review at most 10,000 copies at a time.');
      }
    }
    final ordered = ids.toList(growable: false);
    final result = <CopyCostReviewRow>[];
    for (var offset = 0; offset < ordered.length; offset += 100) {
      current();
      final batch = ordered.skip(offset).take(100).toList(growable: false);
      final value = await gateway
          .read(batch)
          .timeout(const Duration(seconds: 15));
      current();
      if (value is! Map ||
          value['ownerId'] != ownerId ||
          value['editEnabled'] is! bool ||
          value['copies'] is! List) {
        throw const FormatException('Cost review could not be verified.');
      }
      final byId = <String, CopyCostReviewRow>{};
      for (final row in value['copies'] as List) {
        if (row is! Map ||
            row['instanceId'] is! String ||
            !batch.contains(row['instanceId']) ||
            byId.containsKey(row['instanceId']) ||
            row['archived'] is! bool) {
          throw const FormatException(
            'Cost review includes an unexpected copy.',
          );
        }
        final id = row['instanceId'] as String;
        if (row['archived'] == true) {
          byId[id] = CopyCostReviewRow(
            id,
            CopyCostReviewState.unavailable,
            null,
          );
          continue;
        }
        final cost = CopyCostEvidence.fromJson(row['cost']);
        final state = switch (cost.status) {
          'missing_amount' when cost.amount == null && cost.minor == null =>
            CopyCostReviewState.missingAmount,
          'missing_currency'
              when cost.amount != null &&
                  (cost.currency == null || cost.currency!.trim().isEmpty) &&
                  cost.minor == null =>
            CopyCostReviewState.missingCurrency,
          'known'
              when RegExp(r'^[A-Z]{3}$').hasMatch(cost.currency ?? '') &&
                  cost.label != 'Cost needs review' =>
            CopyCostReviewState.known,
          _ => CopyCostReviewState.needsReview,
        };
        byId[id] = CopyCostReviewRow(id, state, cost);
      }
      for (final id in batch) {
        result.add(
          byId[id] ??
              CopyCostReviewRow(id, CopyCostReviewState.unavailable, null),
        );
      }
    }
    current();
    return List.unmodifiable(result);
  }
}
