class CardVariant {
  final String variantTag; // e.g., 'WINNERS_2025', 'PRERELEASE', 'NONE'
  final bool hasOverlay; // true if embossed/ghost overlay detected
  final double? stampConfidence; // 0.0–1.0

  const CardVariant({
    required this.variantTag,
    this.hasOverlay = false,
    this.stampConfidence,
  });

  CardVariant copyWith({
    String? variantTag,
    bool? hasOverlay,
    double? stampConfidence,
  }) {
    return CardVariant(
      variantTag: variantTag ?? this.variantTag,
      hasOverlay: hasOverlay ?? this.hasOverlay,
      stampConfidence: stampConfidence ?? this.stampConfidence,
    );
  }

  Map<String, dynamic> toJson() => {
        'variant_tag': variantTag,
        'has_overlay': hasOverlay,
        'stamp_confidence': stampConfidence,
      };

  factory CardVariant.fromJson(Map<String, dynamic> json) {
    return CardVariant(
      variantTag: (json['variant_tag'] as String?)?.toUpperCase() ?? 'NONE',
      hasOverlay: json['has_overlay'] as bool? ?? false,
      stampConfidence: (json['stamp_confidence'] as num?)?.toDouble(),
    );
  }
}

