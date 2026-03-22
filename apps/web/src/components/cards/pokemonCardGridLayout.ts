import type { ViewDensity } from "@/hooks/useViewDensity";

export const POKEMON_CARD_BROWSE_GRID_CLASSNAME =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export const POKEMON_CARD_BROWSE_LARGE_GRID_CLASSNAME =
  "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

export const POKEMON_CARD_DISCOVERY_GRID_CLASSNAME =
  "grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4";

export const POKEMON_CARD_DISCOVERY_COMPACT_GRID_CLASSNAME = "grid grid-cols-2 gap-3";

const COLLECTION_GRID_COLUMNS_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
  default: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  large: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

const COLLECTION_GRID_GAPS_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "gap-2.5 sm:gap-3.5",
  default: "gap-3 sm:gap-4 lg:gap-5",
  large: "gap-4 sm:gap-5 lg:gap-6",
};

export function getPokemonCardCollectionGridClassName(density: ViewDensity) {
  return `grid ${COLLECTION_GRID_COLUMNS_BY_DENSITY[density]} ${COLLECTION_GRID_GAPS_BY_DENSITY[density]}`;
}
