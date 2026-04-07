import 'package:supabase_flutter/supabase_flutter.dart';

class CardSurfacePricingData {
  const CardSurfacePricingData({
    required this.cardPrintId,
    this.grookaiValue,
    this.primaryPrice,
    this.primarySource,
  });

  final String cardPrintId;
  final double? grookaiValue;
  final double? primaryPrice;
  final String? primarySource;

  double? get visibleValue => grookaiValue ?? primaryPrice;

  String get compactLabel => grookaiValue != null ? 'Value' : 'Market';

  bool get hasVisibleValue => visibleValue != null;
}

class CardSurfacePricingService {
  static const int _chunkSize = 150;

  static Future<Map<String, CardSurfacePricingData>> fetchByCardPrintIds({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final normalizedIds = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (normalizedIds.isEmpty) {
      return const <String, CardSurfacePricingData>{};
    }

    final pricingById = <String, CardSurfacePricingData>{};
    for (var start = 0; start < normalizedIds.length; start += _chunkSize) {
      final end = (start + _chunkSize) > normalizedIds.length
          ? normalizedIds.length
          : start + _chunkSize;
      final chunk = normalizedIds.sublist(start, end);
      final rows = await client
          .from('v_card_pricing_ui_v1')
          .select('card_print_id,grookai_value,primary_price,primary_source')
          .inFilter('card_print_id', chunk);

      for (final rawRow in rows as List<dynamic>) {
        final row = Map<String, dynamic>.from(rawRow as Map);
        final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
        if (cardPrintId.isEmpty) {
          continue;
        }

        pricingById[cardPrintId] = CardSurfacePricingData(
          cardPrintId: cardPrintId,
          grookaiValue: _toDouble(row['grookai_value']),
          primaryPrice: _toDouble(row['primary_price']),
          primarySource: _normalizeSource(row['primary_source']),
        );
      }
    }

    return pricingById;
  }

  static double? _toDouble(dynamic value) {
    if (value is num) {
      final doubleValue = value.toDouble();
      if (doubleValue.isFinite) {
        return doubleValue;
      }
    }
    return null;
  }

  static String? _normalizeSource(dynamic value) {
    final normalized = (value ?? '').toString().trim().toLowerCase();
    if (normalized == 'justtcg' || normalized == 'ebay') {
      return normalized;
    }
    return null;
  }
}
