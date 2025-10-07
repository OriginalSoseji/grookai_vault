class VaultItemExt {
  final String id;
  final String cardId;
  final String name;
  final String setCode;
  final String number;
  final double? price;               // base price from v_vault_items
  final String? conditionLabel;
  final bool isGraded;
  final String? gradeCompany;
  final double? gradeValue;
  final String? gradeLabel;

  // computed fields from v_vault_items_ext
  final String? effectiveMode;       // graded | condition | derived | base
  final String? effectiveSource;     // e.g., graded.market
  final double? effectivePrice;

  final DateTime? createdAt;         // optional (if you selected it)

  VaultItemExt({
    required this.id,
    required this.cardId,
    required this.name,
    required this.setCode,
    required this.number,
    required this.price,
    required this.conditionLabel,
    required this.isGraded,
    required this.gradeCompany,
    required this.gradeValue,
    required this.gradeLabel,
    required this.effectiveMode,
    required this.effectiveSource,
    required this.effectivePrice,
    required this.createdAt,
  });

  factory VaultItemExt.fromJson(Map<String, dynamic> j) => VaultItemExt(
        id: j['id'] as String,
        cardId: j['card_id'] as String,
        name: j['name'] as String,
        setCode: j['set_code'] as String,
        number: j['number'] as String,
        price: (j['price'] as num?)?.toDouble(),
        conditionLabel: j['condition_label'] as String?,
        isGraded: (j['is_graded'] as bool?) ?? false,
        gradeCompany: j['grade_company'] as String?,
        gradeValue: (j['grade_value'] as num?)?.toDouble(),
        gradeLabel: j['grade_label'] as String?,
        effectiveMode: j['effective_mode'] as String?,
        effectiveSource: j['effective_source'] as String?,
        effectivePrice: (j['effective_price'] as num?)?.toDouble(),
        createdAt: j['created_at'] != null ? DateTime.parse(j['created_at']) : null,
      );
}


