import 'dart:convert';

import 'variant_origin_public_copy_generated.dart' as generated;

class VariantOriginPublicCopy {
  const VariantOriginPublicCopy({
    required this.cardPrintId,
    required this.gvId,
    required this.originFamilyKey,
    required this.variantKey,
    required this.printedIdentityModifier,
    required this.familyKey,
    required this.familyLabel,
    required this.variantCategory,
    required this.confidence,
    required this.whyItExists,
    required this.whyCollectorsCare,
    required this.howToIdentify,
    required this.grookaiRule,
    required this.sourceUrls,
  });

  final String cardPrintId;
  final String gvId;
  final String originFamilyKey;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String familyKey;
  final String familyLabel;
  final String variantCategory;
  final String confidence;
  final String whyItExists;
  final String whyCollectorsCare;
  final String howToIdentify;
  final String grookaiRule;
  final List<String> sourceUrls;
}

String _cleanVariantOriginText(Object? value) => (value ?? '').toString().trim();

String? _optionalVariantOriginText(Object? value) {
  final cleaned = _cleanVariantOriginText(value);
  return cleaned.isEmpty ? null : cleaned;
}

List<String> _stringList(Object? value) {
  if (value is! List) {
    return const <String>[];
  }

  return value
      .map((item) => item?.toString().trim() ?? '')
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}

Map<String, dynamic>? _variantOriginDataCache;

Map<String, dynamic> get _variantOriginData {
  final cached = _variantOriginDataCache;
  if (cached != null) {
    return cached;
  }

  final decoded = jsonDecode(generated.variantOriginPublicCopyJson);
  if (decoded is! Map<String, dynamic>) {
    return _variantOriginDataCache = <String, dynamic>{};
  }
  return _variantOriginDataCache = decoded;
}

Map<String, Object?>? _lookupNestedMap(String key, String lookupKey) {
  final bucket = _variantOriginData[key];
  if (bucket is! Map) {
    return null;
  }

  final value = bucket[lookupKey];
  if (value is! Map) {
    return null;
  }

  return value.map(
    (nestedKey, nestedValue) => MapEntry(nestedKey.toString(), nestedValue),
  );
}

VariantOriginPublicCopy? getVariantOriginPublicCopy({
  String? cardPrintId,
  String? gvId,
}) {
  final normalizedCardPrintId = _cleanVariantOriginText(cardPrintId);
  final normalizedGvId = _cleanVariantOriginText(gvId).toUpperCase();

  final row = normalizedCardPrintId.isNotEmpty
      ? _lookupNestedMap('by_card_print_id', normalizedCardPrintId)
      : null;
  final resolvedRow = row ?? _lookupNestedMap('by_gv_id', normalizedGvId);
  if (resolvedRow == null) {
    return null;
  }

  final familyKey = _cleanVariantOriginText(resolvedRow['origin_family_key']);
  if (familyKey.isEmpty) {
    return null;
  }

  final family = _lookupNestedMap('families', familyKey);
  if (family == null) {
    return null;
  }

  return VariantOriginPublicCopy(
    cardPrintId: _cleanVariantOriginText(resolvedRow['card_print_id']),
    gvId: _cleanVariantOriginText(resolvedRow['gv_id']),
    originFamilyKey: familyKey,
    variantKey: _optionalVariantOriginText(resolvedRow['variant_key']),
    printedIdentityModifier: _optionalVariantOriginText(
      resolvedRow['printed_identity_modifier'],
    ),
    familyKey: _cleanVariantOriginText(family['family_key']),
    familyLabel: _cleanVariantOriginText(family['family_label']),
    variantCategory: _cleanVariantOriginText(family['variant_category']),
    confidence: _cleanVariantOriginText(family['confidence']),
    whyItExists: _cleanVariantOriginText(family['why_it_exists']),
    whyCollectorsCare: _cleanVariantOriginText(family['why_collectors_care']),
    howToIdentify: _cleanVariantOriginText(family['how_to_identify']),
    grookaiRule: _cleanVariantOriginText(family['grookai_rule']),
    sourceUrls: _stringList(family['source_urls']),
  );
}
