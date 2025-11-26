class CardPrintPriceCurve {
  final String cardPrintId;
  final double? nmMedian;
  final double? lpMedian;
  final int? listingCount;
  final double? confidence;
  final DateTime? createdAt;

  CardPrintPriceCurve({
    required this.cardPrintId,
    this.nmMedian,
    this.lpMedian,
    this.listingCount,
    this.confidence,
    this.createdAt,
  });

  factory CardPrintPriceCurve.fromJson(Map<String, dynamic> json) {
    return CardPrintPriceCurve(
      cardPrintId: (json['card_print_id'] ?? '').toString(),
      nmMedian: (json['nm_median'] as num?)?.toDouble(),
      lpMedian: (json['lp_median'] as num?)?.toDouble(),
      listingCount: json['listing_count'] as int?,
      confidence: (json['confidence'] as num?)?.toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }
}
