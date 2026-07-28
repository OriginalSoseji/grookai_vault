import 'package:supabase_flutter/supabase_flutter.dart';

class CardSurfacePricingData {
  const CardSurfacePricingData({
    required this.cardPrintId,
    required this.pricingScope,
    this.marketClose,
    this.cardPrintingId,
    this.printingGvId,
    this.finishKey,
    this.isFromPrice = false,
    this.primarySource,
    this.sourceLabel,
    this.observedAt,
    this.publishedAt,
    this.provenanceId,
    this.proofPricedCopyCount,
    this.proofUnpricedCopyCount,
  });

  final String cardPrintId;
  final String pricingScope;
  final double? marketClose;
  final String? cardPrintingId;
  final String? printingGvId;
  final String? finishKey;
  final bool isFromPrice;
  final String? primarySource;
  final String? sourceLabel;
  final DateTime? observedAt;
  final DateTime? publishedAt;
  final String? provenanceId;
  final int? proofPricedCopyCount;
  final int? proofUnpricedCopyCount;

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
        final pricing = _fromRow(row);
        if (pricing == null) {
          continue;
        }

        pricingById[pricing.cardPrintId] = pricing;
      }
    }

    return pricingById;
  }

  static Future<Map<String, CardSurfacePricingData>> fetchByCardPrintingIds({
    required SupabaseClient client,
    required Iterable<String> cardPrintingIds,
  }) async {
    final normalizedIds = cardPrintingIds
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
        params: {'p_card_print_ids': null, 'p_card_printing_ids': chunk},
      );

      for (final rawRow in rows as List<dynamic>) {
        final row = Map<String, dynamic>.from(rawRow as Map);
        if ((row['pricing_scope'] ?? '').toString() != 'card_printing') {
          continue;
        }
        final pricing = _fromRow(row);
        final cardPrintingId = pricing?.cardPrintingId;
        if (pricing == null ||
            cardPrintingId == null ||
            !normalizedIds.contains(cardPrintingId)) {
          continue;
        }
        pricingById[cardPrintingId] = pricing;
      }
    }

    return pricingById;
  }

  static CardSurfacePricingData? _fromRow(Map<String, dynamic> row) {
    final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
    final pricingScope = (row['pricing_scope'] ?? '').toString().trim();
    if (cardPrintId.isEmpty ||
        (pricingScope != 'parent' && pricingScope != 'card_printing')) {
      return null;
    }

    return CardSurfacePricingData(
      cardPrintId: cardPrintId,
      pricingScope: pricingScope,
      cardPrintingId: _clean(row['card_printing_id']),
      printingGvId: _clean(row['printing_gv_id']),
      finishKey: _clean(row['finish_key']),
      isFromPrice: row['is_from_price'] == true,
      marketClose: _toDouble(row['market_close']),
      primarySource: _normalizeSource(row['source_name']),
      sourceLabel: _clean(row['source_label']),
      observedAt: DateTime.tryParse((row['observed_at'] ?? '').toString()),
      publishedAt: DateTime.tryParse((row['published_at'] ?? '').toString()),
      provenanceId: _clean(row['provenance_id']),
    );
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

  static String? _clean(dynamic value) {
    final normalized = (value ?? '').toString().trim();
    return normalized.isEmpty ? null : normalized;
  }
}
