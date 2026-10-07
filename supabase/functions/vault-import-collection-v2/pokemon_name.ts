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
  // These labels describe printed identity, not optional search decorations.
  const center = /^([^()]+)\s+\(pokemon center exclusive\)$/.exec(name);
  if (center) {
    if (text(card.variant_key) !== "pokemon_center_stamp" ||
      text(card.printed_identity_modifier) !== "pokemon_center_stamp") return false;
    name = center[1].trim();
  }
  const common = /^([^()]+)\s+\(holo common\)$/.exec(name);
  if (common) {
    // A trailing number prevents the named-finish parser from recognizing the
    // original label. Do not accept that stacked form without its finish gate.
    if (suffix) return false;
    // The named-finish resolver separately requires a governed holo child and
    // rejects conflicting Variance. Keep this label until rarity is checked.
    if (text(card.rarity) !== "common" || text(card.variant_key) ||
      text(card.printed_identity_modifier)) return false;
    name = common[1].trim();
  }
  // One reviewed punctuation difference; never drop question marks generally.
  if (name === "imakuni's doduo" && text(card.set_code) === "xy12" &&
    number(card.number) === "112" && !text(card.variant_key) &&
    !text(card.printed_identity_modifier)) name = "imakuni?'s doduo";
  // Artwork labels need positive catalog evidence; they are never generic noise.
  const art = /^([^()]+)\s+\(\s*(full art|secret|alternate art secret)\s*\)$/.exec(name);
  if (art) {
    const rarity = text(card.rarity), variant = text(card.variant_key);
    const secret = ["rare secret", "secret rare", "rare rainbow"].includes(rarity);
    const supported = art[2] === "full art"
      ? ["rare ultra", "ultra rare"].includes(rarity) && ["", "rc"].includes(variant)
      : art[2] === "secret" ? secret && ["", "tg"].includes(variant)
      : secret && variant === "alt";
    if (!supported || text(card.printed_identity_modifier)) return false;
    name = art[1].trim();
  }
  // Delta Species is an identity constraint, not a removable decoration.
  const delta = /^([^()]+)\s+\(delta species\)$/.exec(name);
  if (delta) {
    if (text(card.printed_identity_modifier) !== "delta_species" || !/ δ$/.test(text(card.name))) return false;
    name = delta[1].trim() + " δ";
  }
  const canonical = (value: string) => value
    .replace(/’/g, "'")
    .replace(/\bpok(?:é|e\u0301)/g, "poke")
    .replace(/^nidoran\s*(?:m|♂)$/, "nidoran ♂")
    .replace(/^nidoran\s*(?:f|♀)$/, "nidoran ♀")
    .replace(/^_{2,}'s pikachu$/, "__'s pikachu")
    .replace(/[ -](ex|gx)(?= δ$|$)/, " $1");
  return !!name && canonical(name) === canonical(text(card.name));
}
