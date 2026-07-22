import '../../models/card_print.dart';
import 'pokemon_japanese_name_map.dart';

class ResolvedDisplayIdentity {
  const ResolvedDisplayIdentity({
    required this.displayName,
    required this.baseName,
    required this.printedName,
    required this.suffix,
  });

  final String displayName;
  final String baseName;
  final String? printedName;
  final String? suffix;
}

const Map<String, String> _variantKeyMap = <String, String>{
  'pokemon_together_stamp': 'Pokémon Together',
  'prerelease': 'Prerelease Stamp',
  'prerelease_stamp': 'Prerelease Stamp',
  'staff': 'Staff Stamp',
  'staff_stamp': 'Staff Stamp',
  'staff_prerelease_stamp': 'Staff Prerelease Stamp',
  'play_pokemon_stamp': 'Play Pokémon Stamp',
  'player_rewards_crosshatch_stamp': 'Player Rewards Crosshatch Stamp',
  'e_league_stamp': 'E-League Stamp',
  'e_league_winner_stamp': 'E-League Winner Stamp',
  'wotc_stamp': 'WOTC Stamp',
  'alt': 'Alternate Art',
  'tg': 'Trainer Gallery',
  'rc': 'Radiant Collection',
  'cc': 'Classic Collection',
  'illustration_rare': 'Illustration Rare',
  'shiny_rare': 'Shiny Rare',
};

const Map<String, String> _printedIdentityModifierMap = <String, String>{
  'delta_species': 'δ Delta Species',
  'first_edition': 'First Edition',
  'gamestop_stamp': 'GameStop Stamp',
  'league_stamp': 'League Stamp',
  'pikachu_jack_o_lantern_stamp': 'Pikachu Jack-o\'-Lantern Stamp',
  'pikachu_pumpkin_stamp': 'Pikachu Pumpkin Stamp',
  'pokemon_center_stamp': 'Pokémon Center Stamp',
  'platinum_stamped_burger_king_2009': 'Burger King Platinum Stamp',
  'prize_pack_stamp': 'Prize Pack Stamp',
  'professor_program_stamp': 'Professor Program Stamp',
  'regional_championships_stamp': 'Regional Championships Stamp',
  'toys_r_us_stamp': 'Toys R Us Stamp',
  'winner_stamp': 'Winner Stamp',
  'stamp:build_a_bear_workshop': 'Build-A-Bear Workshop Stamp',
  'stamp:burger_king': 'Burger King Stamp',
  'stamp:championship': 'Championship Stamp',
  'stamp:championship_staff': 'Championship Staff Stamp',
  'stamp:dragon_vault': 'Dragon Vault Stamp',
  'stamp:e3_red_cheeks': 'E3 Stamp Red Cheeks',
  'stamp:e3_yellow_cheeks': 'E3 Stamp Yellow Cheeks',
  'stamp:gamestop': 'GameStop Stamp',
  'stamp:inverted_wb_kids': 'Inverted WB Kids Stamp',
  'stamp:league': 'League Stamp',
  'stamp:missing_wb_kids': 'Missing WB Kids Stamp',
  'stamp:pikachu_jack_o_lantern': 'Pikachu Jack-o\'-Lantern Stamp',
  'stamp:pikachu_pumpkin': 'Pikachu Pumpkin Stamp',
  'stamp:pokemon_center': 'Pokémon Center Stamp',
  'stamp:player_rewards_crosshatch': 'Player Rewards Crosshatch Stamp',
  'stamp:prize_pack': 'Prize Pack Stamp',
  'stamp:professor_program': 'Professor Program Stamp',
  'stamp:regional_championships': 'Regional Championships Stamp',
  'stamp:toys_r_us': 'Toys R Us Stamp',
  'stamp:wb_kids': 'WB Kids Stamp',
  'stamp:winner': 'Winner Stamp',
  'stamp:wotc': 'WOTC Stamp',
};

const Map<String, String> _finishKeyMap = <String, String>{
  'normal': 'Normal',
  'holo': 'Holo',
  'reverse': 'Reverse Holo',
  'pokeball': 'Poké Ball',
  'masterball': 'Master Ball',
  'cosmos': 'Cosmos Holo',
  'cracked_ice': 'Cracked Ice Holo',
  'rocket_reverse': 'Rocket Reverse Holo',
};

const Set<String> _nonMeaningfulVariantKeys = <String>{
  '',
  'base',
  'default',
  'normal',
  'standard',
  'none',
};

final List<MapEntry<String, String>> _japanesePokemonNameRules =
    japanesePokemonNameToEnglish.entries.toList(growable: false)
      ..sort((left, right) => right.key.length.compareTo(left.key.length));

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

String? formatFinishLabel({String? finishKey, String? finishLabel}) {
  final mapped = _finishKeyMap[_normalizeToken(finishKey)];
  if (mapped != null) {
    return mapped;
  }

  final normalizedLabel = (finishLabel ?? '').trim();
  return normalizedLabel.isEmpty ? null : normalizedLabel;
}

String? formatSearchContextLabel(String? value) {
  final normalized = (value ?? '').trim();
  if (normalized.startsWith('Cameo:') ||
      normalized.startsWith('Cameo trainer:')) {
    return normalized;
  }

  return null;
}

bool _containsJapaneseText(String value) {
  return RegExp(r'[\u3040-\u30ff\u3400-\u9fff]').hasMatch(value);
}

String _normalizeTrailingPrintedSuffix(String value) {
  final suffix = value.trim().replaceAll(RegExp(r'\s+'), '');
  if (suffix.isEmpty) {
    return '';
  }
  if (suffix == '（デルタ種）') {
    return 'Delta Species';
  }
  return RegExp(
        r'^[a-z0-9][a-z0-9.+-]*$',
        caseSensitive: false,
      ).hasMatch(suffix)
      ? suffix
      : '';
}

String? _resolveEnglishPrimaryNameForJapanesePrintedName(String value) {
  final normalized = value.trim();
  final specialPikachuRules = <MapEntry<String, String>>[
    const MapEntry('そらをとぶピカチュウ', 'Flying Pikachu'),
    const MapEntry('なみのりピカチュウ', 'Surfing Pikachu'),
    const MapEntry('ピカチュウ', 'Pikachu'),
  ];

  for (final rule in specialPikachuRules) {
    if (!normalized.startsWith(rule.key)) {
      continue;
    }
    final suffix = _normalizeTrailingPrintedSuffix(
      normalized.substring(rule.key.length),
    );
    return suffix.isEmpty ? rule.value : '${rule.value} $suffix';
  }

  if (!_containsJapaneseText(normalized)) {
    return null;
  }

  for (final rule in _japanesePokemonNameRules) {
    if (!normalized.startsWith(rule.key)) {
      continue;
    }
    final suffix = _normalizeTrailingPrintedSuffix(
      normalized.substring(rule.key.length),
    );
    return suffix.isEmpty ? rule.value : '${rule.value} $suffix';
  }

  return null;
}

ResolvedDisplayIdentity resolveDisplayIdentityFromFields({
  required String? name,
  String? variantKey,
  String? printedIdentityModifier,
  String? finishKey,
  String? finishLabel,
  String? displayDiscriminator,
  String? searchObjectType,
  String? setIdentityModel,
  String? setCode,
  String? number,
  Map<String, String?>? externalIds,
}) {
  final rawBaseName = (name ?? '').trim().isEmpty
      ? 'Unknown card'
      : name!.trim();
  final englishPrimaryName = _resolveEnglishPrimaryNameForJapanesePrintedName(
    rawBaseName,
  );
  final baseName = englishPrimaryName ?? rawBaseName;
  final printedName =
      englishPrimaryName != null && englishPrimaryName != rawBaseName
      ? rawBaseName
      : null;

  var suffix = formatSearchContextLabel(displayDiscriminator);
  if (suffix == null && searchObjectType == 'child_printing') {
    suffix = (displayDiscriminator ?? '').trim();
    if (suffix.isEmpty) {
      suffix = formatFinishLabel(
        finishKey: finishKey,
        finishLabel: finishLabel,
      );
    }
  }
  suffix ??= formatVariantKey(variantKey);
  suffix ??= formatPrintedIdentityModifier(printedIdentityModifier);

  if (suffix == null &&
      _normalizeToken(setIdentityModel) == 'reprint_anthology') {
    suffix = 'Classic Collection';
  }

  return ResolvedDisplayIdentity(
    displayName: suffix == null ? baseName : '$baseName · $suffix',
    baseName: baseName,
    printedName: printedName,
    suffix: suffix,
  );
}

ResolvedDisplayIdentity resolveCardPrintDisplayIdentity(CardPrint card) {
  return resolveDisplayIdentityFromFields(
    name: card.name,
    variantKey: card.variantKey,
    printedIdentityModifier: card.printedIdentityModifier,
    finishKey: card.finishKey,
    finishLabel: card.finishLabel,
    displayDiscriminator: card.displayDiscriminator,
    searchObjectType: card.searchObjectType,
    setIdentityModel: card.setIdentityModel,
    setCode: card.setCode,
    number: card.number,
    externalIds: card.externalIds,
  );
}

String resolveDisplayName(CardPrint card) {
  return resolveCardPrintDisplayIdentity(card).displayName;
}
