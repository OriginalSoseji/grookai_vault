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
  'build_a_bear_workshop_stamp': 'Build-A-Bear Workshop Stamp',
  'burger_king_stamp': 'Burger King Stamp',
  'championship_stamp': 'Championship Stamp',
  'championship_staff_stamp': 'Championship Staff Stamp',
  'city_championships_stamp': 'City Championships Stamp',
  'city_championships_staff_stamp': 'City Championships Staff Stamp',
  'e3_stamp': 'E3 Stamp',
  'finalist_stamp': 'Finalist Stamp',
  'gamestop_stamp': 'GameStop Stamp',
  'league_cup_staff_stamp': 'League Cup Staff Stamp',
  'league_stamp': 'League Stamp',
  'national_championships_stamp': 'National Championships Stamp',
  'national_championships_staff_stamp': 'National Championships Staff Stamp',
  'pikachu_jack_o_lantern_stamp': 'Pikachu Jack-o\'-Lantern Stamp',
  'pikachu_pumpkin_stamp': 'Pikachu Pumpkin Stamp',
  'pokemon_center_stamp': 'Pokémon Center Stamp',
  'pokemon_together_stamp': 'Pokémon Together Stamp',
  'prize_pack_stamp': 'Prize Pack Stamp',
  'professor_program_stamp': 'Professor Program Stamp',
  'prerelease': 'Prerelease Stamp',
  'prerelease_stamp': 'Prerelease Stamp',
  'quarter_finalist_stamp': 'Quarter Finalist Stamp',
  'regional_championships_stamp': 'Regional Championships Stamp',
  'regional_championships_staff_stamp': 'Regional Championships Staff Stamp',
  'staff': 'Staff Stamp',
  'staff_stamp': 'Staff Stamp',
  'staff_prerelease_stamp': 'Staff Prerelease Stamp',
  'state_championships_stamp': 'State Championships Stamp',
  'state_championships_staff_stamp': 'State Championships Staff Stamp',
  'states_championships_stamp': 'State Championships Stamp',
  'states_championships_staff_stamp': 'State Championships Staff Stamp',
  'thank_you_stamp': 'Thank You Stamp',
  'toys_r_us_stamp': 'Toys R Us Stamp',
  'winner_stamp': 'Winner Stamp',
  'world_championships_stamp': 'World Championships Stamp',
  'world_championships_staff_stamp': 'World Championships Staff Stamp',
  'play_pokemon_stamp': 'Play Pokémon Stamp',
  'e_league_stamp': 'E-League Stamp',
  'e_league_winner_stamp': 'E-League Winner Stamp',
  'alt': 'Alternate Art',
  'tg': 'Trainer Gallery',
  'rc': 'Radiant Collection',
  'cc': 'Classic Collection',
  'illustration_rare': 'Illustration Rare',
  'shiny_rare': 'Shiny Rare',
};

const Map<String, String> _printedIdentityModifierMap = <String, String>{
  'build_a_bear_workshop_stamp': 'Build-A-Bear Workshop Stamp',
  'burger_king_stamp': 'Burger King Stamp',
  'championship_stamp': 'Championship Stamp',
  'championship_staff_stamp': 'Championship Staff Stamp',
  'delta_species': 'δ Delta Species',
  'e3_stamp': 'E3 Stamp',
  'first_edition': 'First Edition',
  'gamestop_stamp': 'GameStop Stamp',
  'league_stamp': 'League Stamp',
  'pikachu_jack_o_lantern_stamp': 'Pikachu Jack-o\'-Lantern Stamp',
  'pikachu_pumpkin_stamp': 'Pikachu Pumpkin Stamp',
  'pokemon_center_stamp': 'Pokémon Center Stamp',
  'prize_pack_stamp': 'Prize Pack Stamp',
  'professor_program_stamp': 'Professor Program Stamp',
  'regional_championships_stamp': 'Regional Championships Stamp',
  'toys_r_us_stamp': 'Toys R Us Stamp',
  'winner_stamp': 'Winner Stamp',
  'stamp:build_a_bear_workshop': 'Build-A-Bear Workshop Stamp',
  'stamp:burger_king': 'Burger King Stamp',
  'stamp:championship': 'Championship Stamp',
  'stamp:championship_staff': 'Championship Staff Stamp',
  'stamp:e3_red_cheeks': 'E3 Stamp Red Cheeks',
  'stamp:e3_yellow_cheeks': 'E3 Stamp Yellow Cheeks',
  'stamp:gamestop': 'GameStop Stamp',
  'stamp:inverted_wb_kids': 'Inverted WB Kids Stamp',
  'stamp:league': 'League Stamp',
  'stamp:missing_wb_kids': 'Missing WB Kids Stamp',
  'stamp:pikachu_jack_o_lantern': 'Pikachu Jack-o\'-Lantern Stamp',
  'stamp:pikachu_pumpkin': 'Pikachu Pumpkin Stamp',
  'stamp:pokemon_center': 'Pokémon Center Stamp',
  'stamp:prize_pack': 'Prize Pack Stamp',
  'stamp:professor_program': 'Professor Program Stamp',
  'stamp:regional_championships': 'Regional Championships Stamp',
  'stamp:toys_r_us': 'Toys R Us Stamp',
  'stamp:wb_kids': 'WB Kids Stamp',
  'stamp:winner': 'Winner Stamp',
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
  final baseName = (name ?? '').trim().isEmpty ? 'Unknown card' : name!.trim();

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
