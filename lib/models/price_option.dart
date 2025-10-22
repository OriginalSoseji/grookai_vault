class PriceOption {
  final String type; // base | condition | graded | derived
  final String? detail; // e.g., LP or "PSA 10 Gem Mint"
  final double? price;
  final String? source;
  final DateTime? ts;

  PriceOption({
    required this.type,
    this.detail,
    this.price,
    this.source,
    this.ts,
  });

  factory PriceOption.fromJson(Map<String, dynamic> j) => PriceOption(
    type: j['type'] as String,
    detail: j['detail'] as String?,
    price: (j['price'] as num?)?.toDouble(),
    source: j['source'] as String?,
    ts: j['ts'] != null ? DateTime.parse(j['ts']) : null,
  );
}
