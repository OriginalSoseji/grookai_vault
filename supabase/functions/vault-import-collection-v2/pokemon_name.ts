// Mirrored by the native preview; shared fixtures verify both runtimes.
// Callers independently enforce game, set, number and governed child printing.
export function matchesCollectrPokemonName({sourceName, sourceNumber, game, card}: {
  sourceName: string; sourceNumber: string; game: string; card: Record<string, any>;
}): boolean {
  const text = (value: unknown): string => typeof value === "string" ? value.trim().replace(/\s+/g, " ").toLowerCase() : "";
  const number = (value: unknown): string => {
    const raw = text(value).replace(/^#/, "").split("/")[0].trim();
    const parts = /^([a-z]*)(\d+)([a-z]*)$/.exec(raw);
    return parts ? parts[1] + (parts[2].replace(/^0+/, "") || "0") + parts[3] : raw;
  };
  if (game !== "pokemon" || card.identity_domain !== "pokemon_eng_standard" ||
    !["", "en"].includes(text(card.language)) || !number(sourceNumber) ||
    number(sourceNumber) !== number(card.number)) return false;
  let name = text(sourceName);
  const suffix = /\s+\(#?([a-z]*\d+[a-z]*)\)$/.exec(name);
  if (suffix) {
    if (number(suffix[1]) !== number(sourceNumber)) return false;
    name = name.slice(0, suffix.index);
  }
  const canonical = (value: string) => value.replace(/[ -](ex|gx)$/, " $1");
  return !!name && canonical(name) === canonical(text(card.name));
}
