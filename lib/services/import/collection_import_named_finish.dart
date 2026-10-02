// Mirrored by pokemon_named_finish.ts and verified with the same fixture corpus.
// This only requests an existing governed child; it never creates a printing.
({String name, String finishKey})? collectrPokemonNamedFinish(String value) {
  const labels = {
    'cosmos holo': 'cosmos',
    'cosmo holo': 'cosmos',
    'cosmos foil': 'cosmos',
    'cosmo foil': 'cosmos',
    'cracked ice holo': 'cracked_ice',
    'poke ball pattern': 'pokeball',
    'poké ball pattern': 'pokeball',
    'master ball pattern': 'masterball',
  };
  final match = RegExp(
    r'^([^()]+)\s+\(([^()]+)\)$',
  ).firstMatch(value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase());
  final finishKey = match == null ? null : labels[match.group(2)];
  return match != null && finishKey != null
      ? (name: match.group(1)!.trim(), finishKey: finishKey)
      : null;
}

bool collectrNamedFinishVarianceAgrees(String value) => [
  '',
  'holo',
  'holofoil',
].contains(value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase());
