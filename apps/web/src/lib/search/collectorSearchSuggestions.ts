import type { PublicGameScope } from "@/lib/publicGameScope";

export type CollectorSearchSuggestion = {
  label: string;
  query: string;
};

export type CollectorSearchPreset = CollectorSearchSuggestion & {
  key: string;
  description: string;
};

const SUGGESTIONS: Record<PublicGameScope, CollectorSearchSuggestion[]> = {
  pokemon: [
    { label: "Gengar 2000-2024 reverse holo", query: "Gengar 2000-2024 reverse holo" },
    { label: "Charizard from 151", query: "Charizard from 151" },
    { label: "Exeggutor Poké Ball", query: "Exeggutor Poké Ball" },
    { label: "Pikachu 2014-2024 reverse holo", query: "Pikachu 2014-2024 reverse holo" },
  ],
  mtg: [
    { label: "Lightning Bolt 1993-2024 foil", query: "Lightning Bolt 1993-2024 foil" },
    { label: "Sol Ring foil", query: "Sol Ring foil" },
    { label: "Black Lotus from Alpha", query: "Black Lotus from Alpha" },
    { label: "Liliana 2015-2024 foil", query: "Liliana 2015-2024 foil" },
  ],
  one_piece: [
    { label: "Monkey D. Luffy from OP05", query: "Monkey D. Luffy from OP05" },
    { label: "Nami from OP01", query: "Nami from OP01" },
    { label: "Shanks from OP09", query: "Shanks from OP09" },
    { label: "Roronoa Zoro from OP01", query: "Roronoa Zoro from OP01" },
  ],
};

export function getCollectorSearchSuggestions(gameScope: PublicGameScope) {
  return SUGGESTIONS[gameScope];
}

export function getCollectorSearchPresets(gameScope: PublicGameScope): CollectorSearchPreset[] {
  return SUGGESTIONS[gameScope].map((suggestion, index) => ({
    ...suggestion,
    key: `${gameScope}-${index}`,
    description: `Search ${suggestion.label}`,
  }));
}
