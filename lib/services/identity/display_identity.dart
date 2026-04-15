import '../../models/card_print.dart';

class ResolvedDisplayIdentity {
  const ResolvedDisplayIdentity({
    required this.displayName,
    required this.baseName,
    required this.suffix,
  });

  final String displayName;
  final String baseName;
  final String? suffix;
}

const Map<String, String> _variantKeyMap = <String, String>{
  'pokemon_together_stamp': 'Pokémon Together Stamp',
  'prerelease': 'Prerelease',
  'staff': 'Staff',
  'alt': 'Alternate Art',
  'tg': 'Trainer Gallery',
  'rc': 'Radiant Collection',
  'cc': 'Classic Collection',
};

const Map<String, String> _printedIdentityModifierMap = <String, String>{
  'delta_species': 'δ Delta Species',
};

const Set<String> _nonMeaningfulVariantKeys = <String>{
  '',
  'base',
  'default',
  'normal',
  'standard',
  'none',
};

String _normalizeToken(String? value) {
  return (value ?? '').trim().toLowerCase().replaceAll(RegExp(r'[\s-]+'), '_');
}

String _toTitleCaseToken(String token) {
  final normalized = token.trim().toLowerCase();
  if (normalized.isEmpty) {
    return '';
  }

  if (normalized == 'pokemon') {
    return 'Pokémon';
  }

  if (normalized.length <= 2 && RegExp(r'^[a-z0-9]+$').hasMatch(normalized)) {
    return normalized.toUpperCase();
  }

  return '${normalized[0].toUpperCase()}${normalized.substring(1)}';
}

String? formatVariantKey(String? value) {
  final normalized = _normalizeToken(value);
  if (_nonMeaningfulVariantKeys.contains(normalized)) {
    return null;
  }

  final mapped = _variantKeyMap[normalized];
  if (mapped != null) {
    return mapped;
  }

  final humanized = normalized
      .split('_')
      .where((segment) => segment.isNotEmpty)
      .map(_toTitleCaseToken)
      .join(' ')
      .trim();

  return humanized.isEmpty ? null : humanized;
}

String? formatPrintedIdentityModifier(String? value) {
  final normalized = _normalizeToken(value);
  if (normalized.isEmpty) {
    return null;
  }

  final mapped = _printedIdentityModifierMap[normalized];
  if (mapped != null) {
    return mapped;
  }

  final humanized = normalized
      .split('_')
      .where((segment) => segment.isNotEmpty)
      .map(_toTitleCaseToken)
      .join(' ')
      .trim();

  return humanized.isEmpty ? null : humanized;
}

ResolvedDisplayIdentity resolveDisplayIdentityFromFields({
  required String? name,
  String? variantKey,
  String? printedIdentityModifier,
  String? setIdentityModel,
  String? setCode,
  String? number,
  Map<String, String?>? externalIds,
}) {
  final baseName = (name ?? '').trim().isEmpty ? 'Unknown card' : name!.trim();

  var suffix = formatVariantKey(variantKey);
  suffix ??= formatPrintedIdentityModifier(printedIdentityModifier);

  if (suffix == null &&
      _normalizeToken(setIdentityModel) == 'reprint_anthology') {
    suffix = 'Classic Collection';
  }

  return ResolvedDisplayIdentity(
    displayName: suffix == null ? baseName : '$baseName · $suffix',
    baseName: baseName,
    suffix: suffix,
  );
}

ResolvedDisplayIdentity resolveCardPrintDisplayIdentity(CardPrint card) {
  return resolveDisplayIdentityFromFields(
    name: card.name,
    variantKey: card.variantKey,
    printedIdentityModifier: card.printedIdentityModifier,
    setIdentityModel: card.setIdentityModel,
    setCode: card.setCode,
    number: card.number,
    externalIds: card.externalIds,
  );
}

String resolveDisplayName(CardPrint card) {
  return resolveCardPrintDisplayIdentity(card).displayName;
}
