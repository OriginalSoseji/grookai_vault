import 'package:supabase_flutter/supabase_flutter.dart';

/// Native client for the exact-copy acquisition and profitability ledger.
/// All monetary writes are sent to guarded Postgres functions; this class only
/// prepares and verifies the request envelope.
class InventoryEconomicsService {
  InventoryEconomicsService({SupabaseClient? client})
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  SupabaseClient get client => _client;

  void _requireUser() {
    if (_client.auth.currentUser == null) {
      throw StateError('Sign in to use inventory economics.');
    }
  }

  Future<bool> purchaseAvailable() async {
    _requireUser();
    try {
      return await _client.rpc('vendor_sales_purchase_available_v1') == true;
    } on PostgrestException catch (error) {
      if (error.code == 'PGRST202') return false;
      rethrow;
    }
  }

  Future<Map<String, dynamic>> completePurchase(
    Map<String, dynamic> request,
  ) async {
    _requireUser();
    final result = Map<String, dynamic>.from(
      await _client.rpc(
            'vendor_sales_cart_complete_v4',
            params: {'p_request_id': request['id'], 'p_cart': request['cart']},
          )
          as Map,
    );
    if (result['id'] != request['id']) {
      throw StateError('Purchase response could not be verified.');
    }
    return result;
  }

  Future<Map<String, dynamic>> readInventory({
    DateTime? from,
    DateTime? to,
    String sort = 'oldest',
    int limit = 500,
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_acquisition_batches_read_v1',
            params: {
              'p_from': from?.toUtc().toIso8601String(),
              'p_to': to?.toUtc().toIso8601String(),
              'p_sort': sort,
              'p_limit': limit,
            },
          )
          as Map,
    );
  }

  Future<Map<String, dynamic>> readBatchReport({
    DateTime? from,
    DateTime? to,
    int limit = 100,
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_acquisition_batch_report_v1',
            params: {
              'p_from': from?.toUtc().toIso8601String(),
              'p_to': to?.toUtc().toIso8601String(),
              'p_limit': limit,
            },
          )
          as Map,
    );
  }

  Future<Map<String, dynamic>> readProfitSettings() async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc('inventory_profit_settings_read_v1') as Map,
    );
  }

  Future<Map<String, dynamic>> saveProfitSettings({
    required int incomeTaxBps,
    required String salesTaxMode,
    required int salesTaxRateBps,
    required int sellingFeeBps,
    required int sellingFeeFixedMinor,
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_profit_settings_save_v2',
            params: {
              'p_income_tax_bps': incomeTaxBps,
              'p_sales_tax_mode': salesTaxMode,
              'p_sales_tax_rate_bps': salesTaxRateBps,
              'p_selling_fee_bps': sellingFeeBps,
              'p_selling_fee_fixed_minor': sellingFeeFixedMinor,
            },
          )
          as Map,
    );
  }

  Future<Map<String, dynamic>> readPnl({
    DateTime? from,
    DateTime? to,
    required String dateBasis,
    required int incomeTaxBps,
    required String salesTaxMode,
    int limit = 1000,
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_card_profitability_read_v2',
            params: {
              'p_from': from?.toUtc().toIso8601String(),
              'p_to': to?.toUtc().toIso8601String(),
              'p_date_basis': dateBasis,
              'p_income_tax_bps': incomeTaxBps,
              'p_sales_tax_mode': salesTaxMode,
              'p_limit': limit,
            },
          )
          as Map,
    );
  }

  Future<Map<String, dynamic>> saveAcquisitionBatch({
    required String batchId,
    required DateTime purchasedAt,
    required int totalPaidMinor,
    required String allocationMethod,
    required List<Map<String, dynamic>> lines,
    String? sourceReceiptId,
    String note = '',
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_acquisition_batch_save_v1',
            params: {
              'p_batch_id': batchId,
              'p_source_receipt_id': sourceReceiptId,
              'p_purchased_at': purchasedAt.toUtc().toIso8601String(),
              'p_total_paid_minor': totalPaidMinor,
              'p_allocation_method': allocationMethod,
              'p_lines': lines,
              'p_note': note,
            },
          )
          as Map,
    );
  }

  Future<Map<String, dynamic>> backfillSoldCog({
    required String instanceId,
    required String gvviId,
    required DateTime paidAt,
    required int costMinor,
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_sold_cog_backfill_v1',
            params: {
              'p_instance_id': instanceId,
              'p_gvvi_id': gvviId,
              'p_paid_at': paidAt.toUtc().toIso8601String(),
              'p_cost_minor': costMinor,
            },
          )
          as Map,
    );
  }

  Future<Map<String, dynamic>> backfillSoldCogBatch({
    required String batchId,
    required DateTime paidAt,
    required int totalPaidMinor,
    required List<Map<String, dynamic>> lines,
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_sold_cog_batch_backfill_v1',
            params: {
              'p_batch_id': batchId,
              'p_paid_at': paidAt.toUtc().toIso8601String(),
              'p_total_paid_minor': totalPaidMinor,
              'p_lines': lines,
            },
          )
          as Map,
    );
  }

  Future<Map<String, dynamic>> backfillSellingFee({
    required String requestId,
    required int sellingFeeBps,
    required int sellingFeeFixedMinor,
  }) async {
    _requireUser();
    return Map<String, dynamic>.from(
      await _client.rpc(
            'inventory_sale_fee_snapshot_backfill_v1',
            params: {
              'p_request_id': requestId,
              'p_selling_fee_bps': sellingFeeBps,
              'p_selling_fee_fixed_minor': sellingFeeFixedMinor,
            },
          )
          as Map,
    );
  }
}

int? inventoryMoneyInput(String value) {
  final match = RegExp(r'^(\d{1,9})(?:\.(\d{1,2}))?$').firstMatch(value.trim());
  if (match == null) return null;
  final minor =
      int.parse(match[1]!) * 100 + int.parse((match[2] ?? '').padRight(2, '0'));
  return minor <= 100000000000 ? minor : null;
}

String inventoryMoney(int minor) =>
    '${minor < 0 ? '-' : ''}${minor.abs() ~/ 100}.${(minor.abs() % 100).toString().padLeft(2, '0')}';

List<int> equalInventorySplit(int totalMinor, int count) {
  if (count < 1 || totalMinor < 0) return const [];
  final base = totalMinor ~/ count;
  final remainder = totalMinor % count;
  return List<int>.generate(
    count,
    (index) => base + (index < remainder ? 1 : 0),
  );
}

List<int> weightedInventorySplit(int totalMinor, List<int> weights) {
  if (weights.isEmpty || totalMinor < 0 || weights.any((value) => value < 0)) {
    return const [];
  }
  final totalWeight = weights.fold<int>(0, (sum, value) => sum + value);
  if (totalWeight == 0) return equalInventorySplit(totalMinor, weights.length);
  final values = weights
      .map((weight) => totalMinor * weight ~/ totalWeight)
      .toList();
  var remainder = totalMinor - values.fold<int>(0, (sum, value) => sum + value);
  for (var index = 0; remainder > 0; index = (index + 1) % values.length) {
    values[index]++;
    remainder--;
  }
  return values;
}

List<int> inventoryAllocationPreview({
  required int totalMinor,
  required List<int> referenceMinor,
  required List<int> manualMinor,
  required String mode,
}) {
  switch (mode) {
    case 'weighted_reference':
      return weightedInventorySplit(totalMinor, referenceMinor);
    case 'manual':
      return List<int>.from(manualMinor);
    default:
      return equalInventorySplit(totalMinor, referenceMinor.length);
  }
}
