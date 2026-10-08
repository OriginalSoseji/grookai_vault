// Formatting and catalog-evidenced artwork labels only. Callers must also match
// game, set, number and child printing. Original source remains unchanged.
bool matchesCollectrPokemonName({
  required String sourceName,
  required String sourceNumber,
  required String game,
  required Map<String, dynamic> card,
}) {
  String text(dynamic value) => value is String
      ? value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase()
      : '';
  String number(dynamic value) {
    final raw = text(
      value,
    ).replaceFirst(RegExp(r'^#'), '').split('/').first.trim();
    final parts = RegExp(r'^([a-z]*)(\d+)([a-z]*)$').firstMatch(raw);
    if (parts == null) return raw;
    final digits = parts.group(2)!.replaceFirst(RegExp(r'^0+'), '');
    return '${parts.group(1)}${digits.isEmpty ? '0' : digits}${parts.group(3)}';
  }

  if (game != 'pokemon' ||
      card['identity_domain'] != 'pokemon_eng_standard' ||
      !['', 'en'].contains(text(card['language'])) ||
      number(sourceNumber).isEmpty ||
      number(sourceNumber) != number(card['number'])) {
    return false;
  }
  var name = text(sourceName);
  if (name == 'pikachu (toys r us)') {
    return text(card['name']) == 'pikachu' &&
        text(card['set_code']) == 'g1' &&
        number(card['number']) == '26' &&
        text(card['variant_key']) == 'toys_r_us_stamp' &&
        text(card['printed_identity_modifier']) == 'toys_r_us_stamp';
  }
  final suffix = RegExp(r'\s+\(#?([a-z]*\d+[a-z]*)\)$').firstMatch(name);
  if (suffix != null) {
    if (number(suffix.group(1)) != number(sourceNumber)) return false;
    name = name.substring(0, suffix.start);
  }
  final center = RegExp(
    r'^([^()]+)\s+\(pokemon center exclusive\)$',
  ).firstMatch(name);
  if (center != null) {
    if (text(card['variant_key']) != 'pokemon_center_stamp' ||
        text(card['printed_identity_modifier']) != 'pokemon_center_stamp') {
      return false;
    }
    name = center.group(1)!.trim();
  }
  final common = RegExp(r'^([^()]+)\s+\(holo common\)$').firstMatch(name);
  if (common != null) {
    // The original stacked label did not pass through named-finish resolution.
    if (suffix != null) return false;
    // Named-finish resolution enforces holo; retain the label for rarity proof.
    if (text(card['rarity']) != 'common' ||
        text(card['variant_key']).isNotEmpty ||
        text(card['printed_identity_modifier']).isNotEmpty) {
      return false;
    }
    name = common.group(1)!.trim();
  }
  // Reviewed punctuation at one coordinate, not a general punctuation alias.
  if (name == "imakuni's doduo" &&
      text(card['set_code']) == 'xy12' &&
      number(card['number']) == '112' &&
      text(card['variant_key']).isEmpty &&
      text(card['printed_identity_modifier']).isEmpty) {
    name = "imakuni?'s doduo";
  }
  final art = RegExp(
    r'^([^()]+)\s+\(\s*(full art|secret|alternate art secret)\s*\)$',
  ).firstMatch(name);
  if (art != null) {
    final rarity = text(card['rarity']);
    final variant = text(card['variant_key']);
    final secret = [
      'rare secret',
      'secret rare',
      'rare rainbow',
    ].contains(rarity);
    final supported = art.group(2) == 'full art'
        ? ['rare ultra', 'ultra rare'].contains(rarity) &&
              ['', 'rc'].contains(variant)
        : art.group(2) == 'secret'
        ? secret && ['', 'tg'].contains(variant)
        : secret && variant == 'alt';
    if (!supported || text(card['printed_identity_modifier']).isNotEmpty) {
      return false;
    }
    name = art.group(1)!.trim();
  }
  // Delta Species remains an explicit, positively evidenced identity.
  final delta = RegExp(r'^([^()]+)\s+\(delta species\)$').firstMatch(name);
  if (delta != null) {
    if (text(card['printed_identity_modifier']) != 'delta_species' ||
        !text(card['name']).endsWith(' δ')) {
      return false;
    }
    name = '${delta.group(1)!.trim()} δ';
  }
  // Keep unknown decorations, gender distinctions and all other accents literal.
  String canonical(String value) => value
      .replaceAll('’', "'")
      .replaceAll(RegExp('\\bpok(?:é|e\u0301)'), 'poke')
      .replaceAll(RegExp(r'^nidoran\s*(?:m|♂)$'), 'nidoran ♂')
      .replaceAll(RegExp(r'^nidoran\s*(?:f|♀)$'), 'nidoran ♀')
      .replaceAll(RegExp(r"^_{2,}'s pikachu$"), "__'s pikachu")
      .replaceFirstMapped(
        RegExp(r'[ -](ex|gx)(?= δ$|$)'),
        (match) => ' ${match.group(1)}',
      );
  return name.isNotEmpty && canonical(name) == canonical(text(card['name']));
}
