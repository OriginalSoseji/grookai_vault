import 'package:supabase_flutter/supabase_flutter.dart';

class CardSoldComp {
  const CardSoldComp({
    required this.title,
    required this.price,
    required this.currency,
    required this.soldAt,
    this.condition,
    this.variant,
    this.language,
    this.quantity,
    this.shipping,
    this.totalPrice,
  });

  final String title;
  final double price;
  final String currency;
  final DateTime? soldAt;
  final String? condition;
  final String? variant;
  final String? language;
  final int? quantity;
  final double? shipping;
  final double? totalPrice;

  static CardSoldComp? fromJson(Map<String, dynamic> json) {
    final price = _number(json['price']);
    if (price == null || price <= 0) return null;
    return CardSoldComp(
      title: _text(json['title']) ?? 'Sold card',
      price: price,
      currency: _text(json['currency']) ?? 'USD',
      soldAt: DateTime.tryParse(_text(json['sold_at']) ?? ''),
      condition: _text(json['condition']),
      variant: _text(json['variant']),
      language: _text(json['language']),
      quantity: _integer(json['quantity']),
      shipping: _number(json['shipping']),
      totalPrice: _number(json['total_price']),
    );
  }
}

class CardSoldCompsResult {
  const CardSoldCompsResult({
    required this.productName,
    required this.productUrl,
    required this.sales,
    required this.totalSales,
    required this.salesHistoryStatus,
    required this.sampledAt,
    required this.matchCandidates,
  });

  final String productName;
  final Uri? productUrl;
  final List<CardSoldComp> sales;
  final int? totalSales;
  final String salesHistoryStatus;
  final DateTime? sampledAt;
  final List<String> matchCandidates;

  static CardSoldCompsResult fromJson(Map<String, dynamic> json) {
    final product = _map(json['product']);
    final salesJson = json['sales'];
    final sales = <CardSoldComp>[];
    if (salesJson is List) {
      for (final item in salesJson) {
        final row = _map(item);
        if (row == null) continue;
        final sale = CardSoldComp.fromJson(row);
        if (sale != null) sales.add(sale);
      }
    }
    final candidates = json['match_candidates'];
    return CardSoldCompsResult(
      productName: _text(product?['name']) ?? 'Unconfirmed TCGplayer match',
      productUrl: Uri.tryParse(_text(product?['url']) ?? ''),
      sales: List.unmodifiable(sales),
      totalSales: _integer(json['total_sales']),
      salesHistoryStatus: _text(json['sales_history_status']) ?? 'limited',
      sampledAt: DateTime.tryParse(_text(json['sampled_at']) ?? ''),
      matchCandidates: candidates is List
          ? List.unmodifiable(candidates.map((value) => '$value'))
          : const [],
    );
  }
}

class CardSoldCompsService {
  const CardSoldCompsService(this._client);

  final SupabaseClient _client;
  static final Map<String, _SoldCompsCacheEntry> _memoryCache = {};
  static const Duration _memoryCacheTtl = Duration(hours: 20);

  Future<CardSoldCompsResult> load({
    required String cardName,
    required String setName,
    required String collectorNumber,
    required String finish,
  }) async {
    final cacheKey = [
      cardName,
      setName,
      collectorNumber,
      finish,
    ].map((value) => value.trim().toLowerCase()).join('|');
    final now = DateTime.now();
    final cached = _memoryCache[cacheKey];
    if (cached != null && now.difference(cached.savedAt) < _memoryCacheTtl) {
      return cached.result;
    }
    final response = await _client.functions.invoke(
      'card-sold-comps-v1',
      body: {
        'card_name': cardName,
        'set_name': setName,
        'collector_number': collectorNumber,
        'finish': finish,
      },
    );
    if (response.status < 200 || response.status >= 300) {
      throw StateError('Sold comps are temporarily unavailable.');
    }
    final payload = _map(response.data);
    if (payload == null) {
      throw const FormatException('Invalid sold-comps response.');
    }
    final result = CardSoldCompsResult.fromJson(payload);
    _memoryCache[cacheKey] = _SoldCompsCacheEntry(result: result, savedAt: now);
    return result;
  }
}

class _SoldCompsCacheEntry {
  const _SoldCompsCacheEntry({required this.result, required this.savedAt});
  final CardSoldCompsResult result;
  final DateTime savedAt;
}

Map<String, dynamic>? _map(Object? value) =>
    value is Map ? value.map((key, value) => MapEntry('$key', value)) : null;

String? _text(Object? value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}

double? _number(Object? value) =>
    value is num ? value.toDouble() : double.tryParse(_text(value) ?? '');

int? _integer(Object? value) =>
    value is int ? value : int.tryParse(_text(value) ?? '');
