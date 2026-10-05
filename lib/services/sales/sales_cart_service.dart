import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../gvvi/vendor_pricing_workspace_service.dart';
import '../../models/card_print.dart';
import '../public/public_card_printing_options_service.dart';
import 'sales_trade.dart';
import 'sales_search_cache.dart';

/// Display/input amounts only. The server validates and computes sale totals.
int? saleMoneyInput(String value) {
  final match = RegExp(r'^(\d{1,7})(?:\.(\d{1,2}))?$').firstMatch(value.trim());
  if (match == null) return null;
  final cents =
      int.parse(match[1]!) * 100 + int.parse((match[2] ?? '').padRight(2, '0'));
  return cents <= 100000000 ? cents : null;
}

String saleMoney(int minor) =>
    '${minor < 0 ? '-' : ''}${minor.abs() ~/ 100}.${(minor.abs() % 100).toString().padLeft(2, '0')}';

bool salesCopyMatches(VendorPricingWorkspaceRow row, String query) {
  String normalize(String value) => value
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\u00c0-\uffff]+'), ' ')
      .trim();
  final words = normalize(
    query,
  ).split(RegExp(r'\s+')).where((word) => word.isNotEmpty);
  final text = normalize(
    '${row.displayName} ${row.gvId} ${row.gvviId} ${row.setName ?? ''} ${row.setCode ?? ''} ${row.number} ${row.printingLabel} ${row.conditionLabel}',
  );
  return words.every(text.contains);
}

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
    this.receipts = const [],
    this.tradesAvailable = false,
    this.pending,
  });
  final bool available;
  final bool tradesAvailable;
  final List<VendorPricingWorkspaceRow> rows;
  final String storeName;
  final List<Map<String, dynamic>> customers;
  final List<Map<String, dynamic>> receipts;
  final Map<String, dynamic>? pending;

  SalesDeskData withRows(List<VendorPricingWorkspaceRow> value) =>
      SalesDeskData(
        available: available,
        rows: value,
        storeName: storeName,
        customers: customers,
        receipts: receipts,
        tradesAvailable: tradesAvailable,
        pending: pending,
      );
}

class SalesCatalogPage {
  const SalesCatalogPage(this.cards, {this.pagination});
  final List<CardPrint> cards;
  final CardSearchPagination? pagination;
}

class SalesCartService {
  SalesCartService({SupabaseClient? client}) : _client = client;
  final SupabaseClient? _client;
  String? _owner;
  final _searchCache = SalesSearchCache<SalesCatalogPage>();
  SupabaseClient get client => _client ?? Supabase.instance.client;
  Stream<void> get accountChanges => client.auth.onAuthStateChange
      .where((event) => _owner != null && event.session?.user.id != _owner)
      .map((_) {});
  String get _key => 'grookai.pending-sale.v1.${_owner!}';

  void _checkOwner() {
    if (_owner == null || client.auth.currentUser?.id != _owner) {
      _searchCache.clear();
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
    final results = await Future.wait<Object>([
      _tradesAvailable(),
      _workspace.load(),
      client.rpc('vendor_receipt_book_read_v1'),
    ]);
    final tradesAvailable = results[0] as bool;
    final workspace = results[1] as VendorPricingWorkspaceData;
    final result = Map<String, dynamic>.from(results[2] as Map);
    final book = Map<String, dynamic>.from(result['book'] as Map);
    _checkOwner();
    return SalesDeskData(
      available: true,
      tradesAvailable: tradesAvailable,
      rows: workspace.rows,
      storeName: book['storeName'] as String,
      customers: (book['customers'] as List)
          .map((c) => Map<String, dynamic>.from(c as Map))
          .toList(),
      pending: pending,
      receipts: (book['receipts'] as List)
          .map((r) => Map<String, dynamic>.from(r['receipt'] as Map))
          .toList(),
    );
  }

  Future<bool> _tradesAvailable() async {
    try {
      return await client.rpc('vendor_sales_trade_available_v1') == true;
    } on PostgrestException catch (error) {
      if (error.code != 'PGRST202') rethrow;
    }
    return false;
  }

  VendorPricingWorkspaceService get _workspace => VendorPricingWorkspaceService(
    client: client,
    includeSections: false,
    includeMarketPrices: false,
    toleratePriceFailure: true,
  );

  Future<List<VendorPricingWorkspaceRow>> loadAddedCopy(
    String instanceId,
  ) async {
    _checkOwner();
    final data = await _workspace.loadCopies({instanceId});
    _checkOwner();
    return data.rows;
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

  Future<List<CardPrint>> searchCatalog(String query, String game) async {
    // Existing trade search presents one list, so retain its complete-result
    // behavior while the catalog entry dialog consumes bounded pages.
    var page = await searchCatalogPage(query, game);
    final cards = [...page.cards];
    final seen = cards.map((card) => card.id).toSet();
    while (page.pagination?.nextOffset != null) {
      page = await searchCatalogPage(
        query,
        game,
        offset: page.pagination!.nextOffset!,
      );
      cards.addAll(page.cards.where((card) => seen.add(card.id)));
    }
    return cards;
  }

  Future<SalesCatalogPage> searchCatalogPage(
    String query,
    String game, {
    int offset = 0,
  }) async {
    _checkOwner();
    if (query.trim().length < 2) return const SalesCatalogPage([]);
    if (offset < 0 || offset > 10000) throw ArgumentError.value(offset);
    final page = await _searchCache.get(
      jsonEncode([query.trim(), game, offset]),
      () async {
        final result = await CardPrintRepository.searchCardPrintsResolved(
          client: client,
          options: CardSearchOptions(
            query: query.trim(),
            gameScope: game,
            limit: 64,
            pageOffset: offset,
          ),
          searchLimit: 64,
        );
        _checkOwner();
        if (result.pagination != null && result.pagination!.offset != offset ||
            offset > 0 && result.pagination == null) {
          throw StateError('Search pagination changed. Search again.');
        }
        final seen = <String>{};
        return SalesCatalogPage(
          List.unmodifiable(
            result.rows
                .where(
                  (card) => (card.gvId ?? '').isNotEmpty && seen.add(card.id),
                )
                .toList(),
          ),
          pagination: result.pagination,
        );
      },
    );
    _checkOwner();
    return page;
  }

  Future<List<Map<String, dynamic>>> catalogPrintings(String cardId) async {
    _checkOwner();
    final rows = await PublicCardPrintingOptionsService.fetch(
      client: client,
      cardPrintIds: [cardId],
    );
    _checkOwner();
    return rows
        .where(
          (p) =>
              p['card_print_id'] == cardId &&
              (p['printing_gv_id'] as String? ?? '').isNotEmpty,
        )
        .toList();
  }

  String get _catalogKey => 'grookai.pending-sales-catalog.v1.${_owner!}';
  Future<Map<String, dynamic>?> pendingCatalogAdd() async {
    _checkOwner();
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    _checkOwner();
    final raw = preferences.getString(_catalogKey);
    return raw == null
        ? null
        : Map<String, dynamic>.from(jsonDecode(raw) as Map);
  }

  Future<void> stageCatalogAdd(Map<String, dynamic> request) async {
    _checkOwner();
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    _checkOwner();
    final raw = preferences.getString(_catalogKey),
        encoded = jsonEncode(request);
    if (raw != null && raw != encoded) {
      throw StateError('Recover the previous catalog add first.');
    }
    if (!await preferences.setString(_catalogKey, encoded)) {
      throw StateError('Could not preserve the card request.');
    }
    _checkOwner();
  }

  Future<Map<String, dynamic>> completeCatalogAdd(
    Map<String, dynamic> request,
  ) async {
    _checkOwner();
    final result = Map<String, dynamic>.from(
      await client.rpc(
            'vendor_sales_catalog_add_v1',
            params: {'p_request_id': request['id'], 'p_card': request['card']},
          )
          as Map,
    );
    _checkOwner();
    if (result['requestId'] != request['id'] ||
        result['cardId'] != request['card']['cardId'] ||
        result['printingId'] != request['card']['printingId']) {
      throw StateError(
        'Card response could not be verified. Recover the saved request.',
      );
    }
    return result;
  }

  Future<void> clearCatalogAdd(String requestId) async {
    _checkOwner();
    final preferences = await SharedPreferences.getInstance();
    await preferences.reload();
    _checkOwner();
    final raw = preferences.getString(_catalogKey);
    if (raw != null &&
        (jsonDecode(raw) as Map)['id'] == requestId &&
        !await preferences.remove(_catalogKey)) {
      throw StateError('Could not clear the recovered card request.');
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
      request['cart']['version'] == 2
          ? 'vendor_sales_cart_complete_v2'
          : 'vendor_sales_cart_complete_v1',
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
  final trade = receipt['tradeIn'] as Map?;
  final balance = receiptBalance(receipt);
  final tradeText = trade == null
      ? ''
      : '\nTRADE-INS\n'
            '${(trade['items'] as List).map((t) => '${t['description']}\n${t['quantity']} × USD ${saleMoney(t['valueMinor'] as int)} × ${tradeRate(t['rateBps'] as int)}% = USD ${saleMoney(t['creditMinor'] as int)} credit').join('\n')}\n'
            'Total trade credit: USD ${saleMoney(trade['totalCreditMinor'] as int)}\n'
            '${balance < 0
                ? 'Paid to customer'
                : balance == 0
                ? 'Even trade · money due'
                : 'Payment received'}: USD ${saleMoney(balance.abs())}\n';
  return '${receipt['storeName']}\nReceipt ${receipt['number']}\n${receipt['createdAt']}\n'
      '${receipt['customerName'] == '' ? '' : 'Customer: ${receipt['customerName']}\n'}\n'
      '${items.map((i) => '${i['quantity']} × ${i['description']} — USD ${saleMoney(i['lineMinor'] as int)}').join('\n')}\n\n'
      'Subtotal: USD ${saleMoney(receipt['subtotalMinor'] as int)}\n'
      'Discount: USD ${saleMoney(receipt['discountMinor'] as int? ?? 0)}\n'
      'Tax collected: USD ${saleMoney(receipt['taxMinor'] as int)}\n'
      '${trade == null ? 'Total received' : 'Purchase total'}: USD ${saleMoney(receipt['totalMinor'] as int)}\n'
      '$tradeText'
      '${receipt['method']} · Recorded by vendor\n${receipt['note']}';
}
