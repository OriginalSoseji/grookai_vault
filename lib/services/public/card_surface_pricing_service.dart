import 'package:supabase_flutter/supabase_flutter.dart';

class CardSurfacePricingData {
  const CardSurfacePricingData({
    required this.cardPrintId,
    this.marketClose,
    this.primarySource,
    this.sourceLabel,
    this.observedAt,
  });

  final String cardPrintId;
  final double? marketClose;
  final String? primarySource;
  final String? sourceLabel;
  final DateTime? observedAt;

  double? get visibleValue => marketClose;

  String get compactLabel => 'Market';

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
      final rows = await client.rpc(
        'get_market_pricing_read_model_v1',
        params: {'p_card_print_ids': chunk, 'p_card_printing_ids': null},
      );

      for (final rawRow in rows as List<dynamic>) {
        final row = Map<String, dynamic>.from(rawRow as Map);
        if ((row['pricing_scope'] ?? '').toString() != 'parent') {
          continue;
        }
        final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
        if (cardPrintId.isEmpty) {
          continue;
        }

        pricingById[cardPrintId] = CardSurfacePricingData(
          cardPrintId: cardPrintId,
          marketClose: _toDouble(row['market_close']),
          primarySource: _normalizeSource(row['source_name']),
          sourceLabel: (row['source_label'] ?? '').toString().trim(),
          observedAt: DateTime.tryParse((row['observed_at'] ?? '').toString()),
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
    if (normalized == 'tcgplayer') {
      return normalized;
    }
    return null;
  }
}
