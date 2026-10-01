// Mirrored by native preview; shared fixtures cover direction and subset bounds.
export function collectrSetTargets(source: string, game: string, number: string): string[] {
  const key = source.trim().replace(/\s+/g, " ").toLowerCase();
  const scopes: Record<string, Record<string, string[]>> = {
    "pokemon": {
      "30th celebration: classic collection": ["30th celebration classic collection"],
      "mega evolution promos": ["mep black star promos"],
      "pitch black": ["mega evolution: pitch black"],
      "generations: radiant collection": ["generations"],
      "legendary treasures: radiant collections": ["legendary treasures"],
      "ex trainer kit 1: latias & latios": ["ex trainer kit (latias)", "ex trainer kit (latios)", "ex trainer kit latias", "ex trainer kit latios"],
      "sm trainer kit: lycanroc & alolan raichu": ["sm trainer kit (lycanroc)", "sm trainer kit (alolan raichu)"],
      "xy trainer kit: pikachu libre & suicune": ["xy trainer kit (pikachu libre)", "xy trainer kit (suicune)"],
    },
    "mtg": {
      "marvel eternal-legal": ["marvel universe"],
    },
  };
  const gameScopes = Object.hasOwn(scopes, game) ? scopes[game] : undefined;
  if (!gameScopes || !Object.hasOwn(gameScopes, key)) return [key];
  const targets = gameScopes[key];
  if (game === "pokemon" && ["generations: radiant collection", "legendary treasures: radiant collections"].includes(key) && !/^RC[0-9]+$/.test(number)) return [];
  return targets;
}
