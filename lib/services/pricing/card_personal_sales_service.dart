import 'package:supabase_flutter/supabase_flutter.dart';

class CardPersonalSaleRecord {
  const CardPersonalSaleRecord({
    required this.id,
    required this.soldAt,
    required this.price,
    required this.currency,
    this.condition,
    this.askingPrice,
    this.askingPriceCurrency,
  });

  final String id;
  final DateTime soldAt;
  final double price;
  final String currency;
  final String? condition;
  final double? askingPrice;
  final String? askingPriceCurrency;

  static CardPersonalSaleRecord? fromJson(Map<String, dynamic> json) {
    final id = _text(json['id']);
    final soldAt = DateTime.tryParse(_text(json['created_at']) ?? '');
    final price = _number(json['sale_price_amount']);
    final currency = _text(json['sale_price_currency'])?.toUpperCase();
    if (id == null ||
        soldAt == null ||
        price == null ||
        price <= 0 ||
        currency == null ||
        currency.length != 3) {
      return null;
    }
    final askingCurrency = _text(json['asking_price_currency'])?.toUpperCase();
    final askingPrice = _number(json['asking_price_amount']);
    return CardPersonalSaleRecord(
      id: id,
      soldAt: soldAt.toLocal(),
      price: price,
      currency: currency,
      condition: _text(json['condition_label']),
      askingPrice: askingCurrency == currency ? askingPrice : null,
      askingPriceCurrency: askingCurrency == currency ? askingCurrency : null,
    );
  }
}

class CardPersonalSalesService {
  const CardPersonalSalesService(this._client);

  final SupabaseClient _client;

  Future<List<CardPersonalSaleRecord>> loadForPrinting(
    String cardPrintingId, {
    int limit = 20,
  }) async {
    final userId = (_client.auth.currentUser?.id ?? '').trim();
    final printingId = cardPrintingId.trim();
    if (userId.isEmpty || printingId.isEmpty) {
      return const [];
    }
    final boundedLimit = limit.clamp(1, 50).toInt();

    final rows = await _client
        .from('vault_item_instance_dispositions')
        .select(
          'id,created_at,sale_price_amount,sale_price_currency,'
          'condition_label,asking_price_amount,asking_price_currency',
        )
        .eq('user_id', userId)
        .eq('card_printing_id', printingId)
        .eq('disposition_type', 'sale')
        .order('created_at', ascending: false)
        .limit(boundedLimit);
    return rows
        .whereType<Map>()
        .map(
          (row) => CardPersonalSaleRecord.fromJson(
            row.map((key, value) => MapEntry('$key', value)),
          ),
        )
        .whereType<CardPersonalSaleRecord>()
        .toList(growable: false);
  }
}

String? _text(Object? value) {
  final text = value?.toString().trim() ?? '';
  return text.isEmpty ? null : text;
}

double? _number(Object? value) {
  final number = value is num ? value.toDouble() : double.tryParse('$value');
  return number != null && number.isFinite ? number : null;
}
