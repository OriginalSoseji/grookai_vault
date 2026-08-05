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

    final rows = <Map<String, dynamic>>[];
    for (var start = 0; start < normalizedIds.length; start += _chunkSize) {
      final end = (start + _chunkSize) > normalizedIds.length
          ? normalizedIds.length
          : start + _chunkSize;
      final chunk = normalizedIds.sublist(start, end);
      final rowsResponse = await client.rpc(
        'get_market_pricing_read_model_v1',
        params: {'p_card_print_ids': chunk, 'p_card_printing_ids': null},
      );

      rows.addAll(
        (rowsResponse as List<dynamic>).map(
          (rawRow) => Map<String, dynamic>.from(rawRow as Map),
        ),
      );
    }

    return indexCardSurfacePricingRows(
      rows: rows,
      pricingScope: 'parent',
      requestedIds: normalizedIds,
    );
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

    final rows = <Map<String, dynamic>>[];
    for (var start = 0; start < normalizedIds.length; start += _chunkSize) {
      final end = (start + _chunkSize) > normalizedIds.length
          ? normalizedIds.length
          : start + _chunkSize;
      final chunk = normalizedIds.sublist(start, end);
      final rowsResponse = await client.rpc(
        'get_market_pricing_read_model_v1',
        params: {'p_card_print_ids': null, 'p_card_printing_ids': chunk},
      );

      rows.addAll(
        (rowsResponse as List<dynamic>).map(
          (rawRow) => Map<String, dynamic>.from(rawRow as Map),
        ),
      );
    }

    return indexCardSurfacePricingRows(
      rows: rows,
      pricingScope: 'card_printing',
      requestedIds: normalizedIds,
    );
  }
}

Map<String, CardSurfacePricingData> indexCardSurfacePricingRows({
  required Iterable<Map<String, dynamic>> rows,
  required String pricingScope,
  required Iterable<String> requestedIds,
}) {
  final requested = requestedIds.toSet();
  final indexed = <String, CardSurfacePricingData>{};
  final ambiguous = <String>{};

  for (final row in rows) {
    if ((row['pricing_scope'] ?? '').toString() != pricingScope) {
      continue;
    }
    final pricing = cardSurfacePricingDataFromReadModelRow(row);
    final identity = pricingScope == 'card_printing'
        ? pricing?.cardPrintingId
        : pricing?.cardPrintId;
    if (pricing == null || identity == null || !requested.contains(identity)) {
      continue;
    }
    if (ambiguous.contains(identity)) {
      continue;
    }
    if (indexed.containsKey(identity)) {
      indexed.remove(identity);
      ambiguous.add(identity);
      continue;
    }
    indexed[identity] = pricing;
  }

  return indexed;
}

CardSurfacePricingData? cardSurfacePricingDataFromReadModelRow(
  Map<String, dynamic> row,
) {
  final cardPrintId = _cleanPricingValue(row['card_print_id']);
  final pricingScope = _cleanPricingValue(row['pricing_scope']);
  final cardPrintingId = _cleanPricingValue(row['card_printing_id']);
  final marketClose = _pricingDouble(row['market_close']);
  final observedAt = DateTime.tryParse((row['observed_at'] ?? '').toString());
  final publishedAt = DateTime.tryParse((row['published_at'] ?? '').toString());
  final provenanceId = _cleanPricingValue(row['provenance_id']);
  final isFromPrice = row['is_from_price'] == true;
  final expectedSourceLabel = isFromPrice
      ? 'From TCGPlayer Market'
      : 'TCGPlayer Market';

  if (cardPrintId == null ||
      (pricingScope != 'parent' && pricingScope != 'card_printing') ||
      (pricingScope == 'card_printing' && cardPrintingId == null) ||
      marketClose == null ||
      marketClose <= 0 ||
      row['status'] != 'available' ||
      row['currency'] != 'USD' ||
      row['freshness'] != 'fresh' ||
      (row['source_name'] ?? '').toString().trim().toLowerCase() !=
          'tcgplayer' ||
      _cleanPricingValue(row['source_label']) != expectedSourceLabel ||
      observedAt == null ||
      publishedAt == null ||
      provenanceId == null ||
      (pricingScope == 'card_printing' && isFromPrice)) {
    return null;
  }

  return CardSurfacePricingData(
    cardPrintId: cardPrintId,
    pricingScope: pricingScope!,
    cardPrintingId: cardPrintingId,
    printingGvId: _cleanPricingValue(row['printing_gv_id']),
    finishKey: _cleanPricingValue(row['finish_key']),
    isFromPrice: isFromPrice,
    marketClose: marketClose,
    primarySource: 'tcgplayer',
    sourceLabel: expectedSourceLabel,
    observedAt: observedAt,
    publishedAt: publishedAt,
    provenanceId: provenanceId,
  );
}

double? _pricingDouble(dynamic value) {
  if (value is num) {
    final doubleValue = value.toDouble();
    if (doubleValue.isFinite) {
      return doubleValue;
    }
  }
  return null;
}

String? _cleanPricingValue(dynamic value) {
  final normalized = (value ?? '').toString().trim();
  return normalized.isEmpty ? null : normalized;
}
