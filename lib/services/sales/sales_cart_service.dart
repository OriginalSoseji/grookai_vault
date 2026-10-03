import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../gvvi/vendor_pricing_workspace_service.dart';

/// Display/input amounts only. The server validates and computes sale totals.
int? saleMoneyInput(String value) {
  final match = RegExp(r'^(\d{1,7})(?:\.(\d{1,2}))?$').firstMatch(value.trim());
  if (match == null) return null;
  final cents =
      int.parse(match[1]!) * 100 + int.parse((match[2] ?? '').padRight(2, '0'));
  return cents <= 100000000 ? cents : null;
}

String saleMoney(int minor) =>
    '${minor ~/ 100}.${(minor % 100).toString().padLeft(2, '0')}';

String newSaleId() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

class SalesCartLine {
  const SalesCartLine({
    required this.description,
    required this.unitMinor,
    this.quantity = 1,
    this.instanceId,
    this.gvviId,
    this.imageUrl,
    this.fallbackImageUrl,
  });
  final String description;
  final int unitMinor;
  final int quantity;
  final String? instanceId, gvviId, imageUrl, fallbackImageUrl;
  Map<String, dynamic> toJson() => {
    'instanceId': instanceId,
    'description': description,
    'quantity': quantity,
    'unitMinor': unitMinor,
  };
}

class SalesDeskData {
  const SalesDeskData({
    required this.available,
    required this.rows,
    required this.storeName,
    required this.customers,
    this.pending,
  });
  final bool available;
  final List<VendorPricingWorkspaceRow> rows;
  final String storeName;
  final List<Map<String, dynamic>> customers;
  final Map<String, dynamic>? pending;
}

class SalesCartService {
  SalesCartService({SupabaseClient? client}) : _client = client;
  final SupabaseClient? _client;
  String? _owner;
  SupabaseClient get client => _client ?? Supabase.instance.client;
  Stream<void> get accountChanges => client.auth.onAuthStateChange
      .where((event) => _owner != null && event.session?.user.id != _owner)
      .map((_) {});
  String get _key => 'grookai.pending-sale.v1.${_owner!}';

  void _checkOwner() {
    if (_owner == null || client.auth.currentUser?.id != _owner) {
      throw StateError('Your account changed. Reopen the sales desk.');
    }
  }

  Future<SalesDeskData> load() async {
    final owner = client.auth.currentUser?.id;
    if (owner == null) throw StateError('Sign in to use the sales desk.');
    _owner ??= owner;
    _checkOwner();
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    _checkOwner();
    final raw = preferences.getString(_key);
    final pending = raw == null
        ? null
        : Map<String, dynamic>.from(jsonDecode(raw) as Map);
    bool available;
    try {
      available = await client.rpc('vendor_sales_cart_available_v1') == true;
    } on PostgrestException catch (error) {
      if (error.code != 'PGRST202') rethrow;
      available = false;
    }
    if (!available) {
      return SalesDeskData(
        available: false,
        rows: const [],
        storeName: '',
        customers: const [],
        pending: pending,
      );
    }
    final workspace = await VendorPricingWorkspaceService(
      client: client,
      includeSections: false,
      toleratePriceFailure: true,
    ).load();
    final result = Map<String, dynamic>.from(
      await client.rpc('vendor_receipt_book_read_v1') as Map,
    );
    final book = Map<String, dynamic>.from(result['book'] as Map);
    _checkOwner();
    return SalesDeskData(
      available: true,
      rows: workspace.rows,
      storeName: book['storeName'] as String,
      customers: (book['customers'] as List)
          .map((c) => Map<String, dynamic>.from(c as Map))
          .toList(),
      pending: pending,
    );
  }

  Future<void> stage(Map<String, dynamic> request) async {
    _checkOwner();
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    _checkOwner();
    final existing = preferences.getString(_key);
    final encoded = jsonEncode(request);
    if (existing != null && existing != encoded) {
      throw StateError('Recover the pending sale before starting another.');
    }
    if (!await preferences.setString(_key, encoded)) {
      throw StateError('Could not preserve this sale for recovery.');
    }
    _checkOwner();
  }

  Future<Map<String, dynamic>?> recover(String requestId) async {
    _checkOwner();
    final receipt = await client.rpc(
      'vendor_sales_cart_read_v1',
      params: {'p_request_id': requestId},
    );
    _checkOwner();
    return receipt == null ? null : Map<String, dynamic>.from(receipt as Map);
  }

  Future<Map<String, dynamic>> complete(Map<String, dynamic> request) async {
    _checkOwner();
    final receipt = await client.rpc(
      'vendor_sales_cart_complete_v1',
      params: {'p_request_id': request['id'], 'p_cart': request['cart']},
    );
    _checkOwner();
    final result = Map<String, dynamic>.from(receipt as Map);
    if (result['id'] != request['id']) {
      throw StateError('Sale response could not be verified. Retry this sale.');
    }
    return result;
  }

  Future<void> clearPending(String requestId) async {
    _checkOwner();
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    _checkOwner();
    final raw = preferences.getString(_key);
    if (raw != null && (jsonDecode(raw) as Map)['id'] == requestId) {
      if (!await preferences.remove(_key)) {
        throw StateError('Could not clear the recovered draft.');
      }
    }
  }
}

String saleReceiptText(Map<String, dynamic> receipt) {
  final items = (receipt['items'] as List).cast<Map>();
  return '${receipt['storeName']}\nReceipt ${receipt['number']}\n${receipt['createdAt']}\n'
      '${receipt['customerName'] == '' ? '' : 'Customer: ${receipt['customerName']}\n'}\n'
      '${items.map((i) => '${i['quantity']} × ${i['description']} — USD ${saleMoney(i['lineMinor'] as int)}').join('\n')}\n\n'
      'Subtotal: USD ${saleMoney(receipt['subtotalMinor'] as int)}\n'
      'Tax collected: USD ${saleMoney(receipt['taxMinor'] as int)}\n'
      'Total received: USD ${saleMoney(receipt['totalMinor'] as int)}\n'
      '${receipt['method']} · Recorded by vendor\n${receipt['note']}';
}
