// Formatting equivalence only. Artwork, edition, stamp and finish labels remain
// part of the name. Callers must also match game, set, number and child printing.
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
  final suffix = RegExp(r'\s+\(([a-z]*\d+[a-z]*)\)$').firstMatch(name);
  if (suffix != null) {
    if (number(suffix.group(1)) != number(sourceNumber)) return false;
    name = name.substring(0, suffix.start);
  }
  // Only the separator before a terminal EX/GX changes. Never remove a suffix
  // such as Full Art, Secret, Delta Species, Red Cheeks or Cosmos Holo.
  String canonical(String value) => value.replaceFirstMapped(
    RegExp(r'[ -](ex|gx)$'),
    (match) => ' ${match.group(1)}',
  );
  return name.isNotEmpty && canonical(name) == canonical(text(card['name']));
}
