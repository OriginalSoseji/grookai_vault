export type WallCategory =
  | "grails"
  | "favorites"
  | "for_sale"
  | "personal_collection"
  | "trades"
  | "promos"
  | "psa"
  | "cgc"
  | "bgs"
  | "other";

export const WALL_CATEGORY_OPTIONS: Array<{ value: WallCategory; label: string }> = [
  { value: "grails", label: "Grails" },
  { value: "favorites", label: "Favorites" },
  { value: "for_sale", label: "For Sale" },
  { value: "personal_collection", label: "PC" },
  { value: "trades", label: "Trades" },
  { value: "promos", label: "Promos" },
  { value: "psa", label: "PSA" },
  { value: "cgc", label: "CGC" },
  { value: "bgs", label: "BGS" },
  { value: "other", label: "Other" },
];

export function normalizeWallCategory(value?: string | null): WallCategory | null {
  switch ((value ?? "").trim().toLowerCase()) {
    case "grails":
      return "grails";
    case "favorites":
      return "favorites";
    case "for_sale":
      return "for_sale";
    case "personal_collection":
      return "personal_collection";
    case "trades":
      return "trades";
    case "promos":
      return "promos";
    case "psa":
      return "psa";
    case "cgc":
      return "cgc";
    case "bgs":
      return "bgs";
    case "other":
      return "other";
    default:
      return null;
  }
}

export function getWallCategoryLabel(value?: string | null) {
  const normalized = normalizeWallCategory(value);
  return WALL_CATEGORY_OPTIONS.find((option) => option.value === normalized)?.label ?? null;
}
