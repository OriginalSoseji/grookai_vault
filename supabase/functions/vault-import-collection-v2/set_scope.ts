// Mirrored by native preview; shared fixtures cover direction and subset bounds.
export function collectrSetTargets(source: string, game: string, number: string, sourceName = "", sourceNumber = ""): string[] {
  const key = source.trim().replace(/\s+/g, " ").toLowerCase();
  // Collectr's umbrella category is not a set alias. Only this exact reviewed
  // product coordinate can route to Generations; the name matcher separately
  // requires the stamped parent and the printing resolver verifies the finish.
  if (game === "pokemon" && key === "miscellaneous cards & products" &&
    sourceName.trim().replace(/\s+/g, " ").toLowerCase() === "pikachu (toys r us)" &&
    number === "26" && /^#?0*26\s*\/\s*0*83$/.test(sourceNumber.trim())) return ["generations"];
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
