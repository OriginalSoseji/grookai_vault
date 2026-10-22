import type { ViewDensity } from "@/hooks/useViewDensity";

export const POKEMON_CARD_BROWSE_GRID_CLASSNAME =
  "gv-card-grid grid grid-cols-2 items-start gap-[9px] sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

export const POKEMON_CARD_BROWSE_LARGE_GRID_CLASSNAME =
  "gv-card-grid grid grid-cols-1 items-start gap-[9px] md:grid-cols-2 xl:grid-cols-3";

export const POKEMON_CARD_DISCOVERY_GRID_CLASSNAME =
  "gv-card-grid grid grid-cols-2 gap-[9px] lg:grid-cols-3 xl:grid-cols-4";

export const POKEMON_CARD_DISCOVERY_COMPACT_GRID_CLASSNAME = "gv-card-grid grid grid-cols-2 gap-[9px]";

const COLLECTION_GRID_COLUMNS_BY_DENSITY: Record<ViewDensity, string> = {
  compact: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
  default: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  large: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

export function getPokemonCardCollectionGridClassName(density: ViewDensity) {
  return `gv-card-grid grid ${COLLECTION_GRID_COLUMNS_BY_DENSITY[density]} gap-[9px]`;
}
