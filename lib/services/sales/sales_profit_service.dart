import 'dart:async';
import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';

abstract interface class SalesProfitGateway {
  String? get ownerId;
  Stream<String?> get ownerChanges;
  Future<Object?> read(List<String> receiptIds);
}

class SupabaseSalesProfitGateway implements SalesProfitGateway {
  SupabaseSalesProfitGateway(this.client);
  final SupabaseClient client;
  @override
  String? get ownerId => client.auth.currentUser?.id;
  @override
  Stream<String?> get ownerChanges =>
      client.auth.onAuthStateChange.map((event) => event.session?.user.id);
  @override
  Future<Object?> read(List<String> receiptIds) => client.rpc(
    'vendor_sale_cost_read_v1',
    params: {'p_request_ids': receiptIds},
  );
}

class SalesProfitUnavailable implements Exception {
  const SalesProfitUnavailable();
  @override
  String toString() =>
      'Private cost history could not load. Profit is unavailable until it can refresh.';
}

/// An all-or-nothing, owner-bound read. It never writes receipts or costs and
/// cannot replace a failed batch with missing historical evidence.
class SalesProfitService {
  SalesProfitService({required this.gateway})
    : ownerId = gateway.ownerId ?? '' {
    if (!_uuid.hasMatch(ownerId)) throw const SalesProfitUnavailable();
    _subscription = gateway.ownerChanges.listen((owner) {
      if (owner != ownerId) _invalidate();
    }, onError: (Object _) => _invalidate());
  }
  final SalesProfitGateway gateway;
  final String ownerId;
  late final StreamSubscription<String?> _subscription;
  final _changes = StreamController<void>.broadcast(sync: true);
  bool _invalid = false, _disposed = false;
  static final _uuid = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    caseSensitive: false,
  );
  Stream<void> get accountChanges => _changes.stream;
  bool get isValid {
    if (!_disposed && gateway.ownerId != ownerId) _invalidate();
    return !_disposed && !_invalid;
  }

  void _invalidate() {
    if (_invalid || _disposed) return;
    _invalid = true;
    _changes.add(null);
  }

  void _checkOwner() {
    if (!isValid) throw const SalesProfitUnavailable();
  }

  Future<List<Map<String, dynamic>>> read(
    List<String> receiptIds, {
    bool Function()? isCurrent,
  }) async {
    void check() {
      _checkOwner();
      if (isCurrent != null && !isCurrent()) {
        throw const SalesProfitUnavailable();
      }
    }

    check();
    if (receiptIds.length > 10000 ||
        receiptIds.any((id) => !_uuid.hasMatch(id))) {
      throw const SalesProfitUnavailable();
    }
    final ids = receiptIds
        .map((id) => id.toLowerCase())
        .toList(growable: false);
    if (ids.toSet().length != ids.length) throw const SalesProfitUnavailable();
    final snapshots = <Map<String, dynamic>>[];
    try {
      for (var offset = 0; offset < ids.length; offset += 100) {
        check();
        final end = offset + 100 < ids.length ? offset + 100 : ids.length;
        final batch = List<String>.unmodifiable(ids.sublist(offset, end));
        final data = await gateway
            .read(batch)
            .timeout(const Duration(seconds: 15));
        check();
        if (data is! Map ||
            data['ownerId'] != ownerId ||
            data['snapshots'] is! List) {
          throw const SalesProfitUnavailable();
        }
        final rows = data['snapshots'] as List, allowed = batch.toSet();
        if (rows.length > batch.length) throw const SalesProfitUnavailable();
        final seen = <String>{};
        for (final row in rows) {
          if (row is! Map ||
              row['receiptId'] is! String ||
              !allowed.contains(row['receiptId']) ||
              !seen.add(row['receiptId'] as String)) {
            throw const SalesProfitUnavailable();
          }
          // Do not let transport-owned maps change after successful validation.
          snapshots.add(
            Map<String, dynamic>.unmodifiable(
              jsonDecode(jsonEncode(row)) as Map<String, dynamic>,
            ),
          );
        }
      }
      check();
      return List<Map<String, dynamic>>.unmodifiable(snapshots);
    } catch (_) {
      throw const SalesProfitUnavailable();
    }
  }

  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    await _subscription.cancel();
    await _changes.close();
  }
}
