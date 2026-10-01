// Explicit source labels only. A combined kit searches every constituent deck;
// it never makes one deck interchangeable with another. Original fields stay intact.
List<String> collectrSetTargets(String source, String game, String number) {
  final key = source.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
  const scopes = <String, Map<String, List<String>>>{
    'pokemon': {
      "30th celebration: classic collection": [
        "30th celebration classic collection",
      ],
      "mega evolution promos": ["mep black star promos"],
      "pitch black": ["mega evolution: pitch black"],
      "generations: radiant collection": ["generations"],
      "legendary treasures: radiant collections": ["legendary treasures"],
      "ex trainer kit 1: latias & latios": [
        "ex trainer kit (latias)",
        "ex trainer kit (latios)",
        "ex trainer kit latias",
        "ex trainer kit latios",
      ],
      "sm trainer kit: lycanroc & alolan raichu": [
        "sm trainer kit (lycanroc)",
        "sm trainer kit (alolan raichu)",
      ],
      "xy trainer kit: pikachu libre & suicune": [
        "xy trainer kit (pikachu libre)",
        "xy trainer kit (suicune)",
      ],
    },
    'mtg': {
      "marvel eternal-legal": ["marvel universe"],
    },
  };
  final targets = scopes[game]?[key];
  if (targets == null) return [key];
  if (game == 'pokemon' &&
      const {
        'generations: radiant collection',
        'legendary treasures: radiant collections',
      }.contains(key) &&
      !RegExp(r'^RC[0-9]+$').hasMatch(number)) {
    return [];
  }
  return targets;
}
