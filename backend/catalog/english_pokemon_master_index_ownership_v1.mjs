export const ENGLISH_POKEMON_MASTER_INDEX_OWNERSHIP_VERSION =
  "ENGLISH_POKEMON_MASTER_INDEX_OWNERSHIP_V1";

export const ENGLISH_POKEMON_FOLDED_SUBSET_OWNERS_V1 = Object.freeze([
  Object.freeze({
    source_set_key: "rc",
    source_set_name: "Radiant Collection",
    canonical_set_key: "bw11",
    canonical_set_name: "Legendary Treasures",
    authority: "english_master_index_folded_subset_owner_v1",
    note: "TCGdex exposes Radiant Collection RC1-RC25 as a standalone shell, but the English Master Index assigns those subset coordinates to Legendary Treasures. Generations Radiant Collection remains under g1.",
  }),
  Object.freeze({
    source_set_key: "sma",
    source_set_name: "Hidden Fates Shiny Vault",
    canonical_set_key: "sm115",
    canonical_set_name: "Hidden Fates",
    authority: "english_master_index_folded_subset_owner_v1",
    note: "TCGdex exposes SV1-SV94 as sma, while the English Master Index assigns those subset coordinates to Hidden Fates.",
  }),
]);

export const ENGLISH_POKEMON_SOURCE_ALIAS_OWNERS_V1 = Object.freeze([
  Object.freeze({
    source_set_key: "30th-c",
    source_set_name: "30th Classic Collection",
    canonical_set_key: "30c-classic",
    canonical_set_name: "30th Celebration Classic Collection",
    authority: "english_master_index_source_alias_owner_v1",
    note: "TCGdex exposes the 30-card Classic Collection under 30th-c with 001-030 gallery ordinals. The governed canonical reprint-anthology owner is 30c-classic, whose 30 parents preserve each card's historic printed number; the source shell must reconcile to that existing owner and must never create 30 duplicate parents.",
  }),
  Object.freeze({
    source_set_key: "miscp",
    source_set_name: "Miscellaneous Promos",
    canonical_set_key: "misc",
    canonical_set_name: "Miscellaneous Cards & Products",
    authority: "english_master_index_source_alias_owner_v1",
    note: "TCGdex exposes Ancient Mew under miscp, while the governed English catalog already owns the same one-card promotional lane under misc.",
  }),
]);

export function mergeEnglishPokemonFoldedSubsetOwnersV1(
  artifactOwners = [],
) {
  const bySource = new Map();
  for (const owner of [
    ...ENGLISH_POKEMON_FOLDED_SUBSET_OWNERS_V1,
    ...ENGLISH_POKEMON_SOURCE_ALIAS_OWNERS_V1,
    ...(artifactOwners ?? []),
  ]) {
    const source = String(owner?.source_set_key ?? "").trim().toLowerCase();
    const canonical = String(owner?.canonical_set_key ?? "").trim().toLowerCase();
    if (!source || !canonical || source === canonical) continue;
    const existing = bySource.get(source);
    if (existing && existing.canonical_set_key !== canonical) {
      throw new Error(
        `Conflicting English Master Index owner for ${source}: ` +
        `${existing.canonical_set_key} versus ${canonical}`,
      );
    }
    bySource.set(source, {
      ...owner,
      ...existing,
      source_set_key: source,
      canonical_set_key: canonical,
      authority: String(existing?.authority ?? owner.authority ?? "").trim() ||
        "english_master_index_folded_subset_owner_v1",
    });
  }
  return [...bySource.values()].sort((left, right) =>
    left.source_set_key.localeCompare(right.source_set_key));
}
