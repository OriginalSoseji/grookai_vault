import { RARITY_SHORTHANDS } from "@/lib/resolver/shorthand";

export type CollectorCardQueryFilter = {
  kind: "rarity" | "artwork";
  sourceText: string;
  value: string;
  label: string;
  index: number;
};

// Keep source spans so quoted card names and removal links retain their text.
export function readCollectorCardQueryFilters(query: string, pokemon: boolean): CollectorCardQueryFilter[] {
  const searchable = query.replace(/"[^"\n]*"/g, (text) => " ".repeat(text.length));
  const filters: CollectorCardQueryFilter[] = [];
  for (const match of searchable.matchAll(/\b(?:(?:hyper|ultra|secret|double|special illustration|illustration)\s+rare|uncommon|common|sir|ir|rare(?!\s+candy))\b/gi)) {
    const sourceText = match[0];
    const shorthand = /^(sir|ir)$/i.test(sourceText);
    if (shorthand && !pokemon) continue;
    const value = shorthand ? RARITY_SHORTHANDS[sourceText.toLowerCase()][0] : sourceText.toLowerCase().replace(/\s+/g, " ");
    filters.push({ kind: "rarity", sourceText, value, label: `Rarity: ${value}`, index: match.index });
  }
  if (pokemon) {
    for (const match of searchable.matchAll(/\bfull[-\s]*art\b/gi)) {
      filters.push({ kind: "artwork", sourceText: match[0], value: "full art", label: "Artwork: Full Art", index: match.index });
    }
  }
  return filters;
}

export function removeCollectorCardQueryFilters(query: string, filters: CollectorCardQueryFilter[]) {
  return [...filters].sort((a, b) => b.index - a.index).reduce(
    (text, filter) => text.slice(0, filter.index) + " " + text.slice(filter.index + filter.sourceText.length), query,
  );
}
