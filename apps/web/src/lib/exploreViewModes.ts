export type ExploreViewMode = "thumb" | "thumb-lg" | "list" | "details";

export const DEFAULT_EXPLORE_VIEW_MODE: ExploreViewMode = "thumb";

export function normalizeExploreViewMode(value?: string | null): ExploreViewMode {
  switch ((value ?? "").trim().toLowerCase()) {
    case "thumb":
    case "thumb-lg":
    case "list":
    case "details":
      return value!.trim().toLowerCase() as ExploreViewMode;
    case "grid":
      return "thumb";
    default:
      return DEFAULT_EXPLORE_VIEW_MODE;
  }
}

export function isExploreViewMode(value?: string | null): value is ExploreViewMode {
  return normalizeExploreViewMode(value) === value;
}
