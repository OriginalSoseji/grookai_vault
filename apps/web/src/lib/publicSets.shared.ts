import { SET_SHORTHANDS } from "@/lib/resolver/shorthand";

export const PUBLIC_SET_ROUTE_ALIAS_MAP: Record<string, string> = {
  "shiny vault": "sma",
  "shiny-vault": "sma",
  "base set shadowless": "base1-shadowless",
  "base-set-shadowless": "base1-shadowless",
  "base shadowless": "base1-shadowless",
  "base1 shadowless": "base1-shadowless",
  "shadowless base set": "base1-shadowless",
  "shadowless base": "base1-shadowless",
  "no shadow base set": "base1-shadowless",
  "base set no shadow": "base1-shadowless",
  "base set first edition": "base1-first-edition",
  "base-set-first-edition": "base1-first-edition",
  "base first edition": "base1-first-edition",
  "base first ed": "base1-first-edition",
  "base 1st edition": "base1-first-edition",
  "base 1st ed": "base1-first-edition",
  "first edition base set": "base1-first-edition",
  "first edition base": "base1-first-edition",
  "base set 1st edition": "base1-first-edition",
  "1st edition base set": "base1-first-edition",
  "1st edition base": "base1-first-edition",
  "base1 first edition": "base1-first-edition",
  "base1 1st edition": "base1-first-edition",
  "base set 1999-2000": "base1-1999-2000",
  "base-set-1999-2000": "base1-1999-2000",
  "base set 1999 2000": "base1-1999-2000",
  "base 1999-2000": "base1-1999-2000",
  "base1 1999-2000": "base1-1999-2000",
  "1999-2000 base set": "base1-1999-2000",
  "1999-2000 base": "base1-1999-2000",
  "base set 2000": "base1-1999-2000",
  "base set fourth print": "base1-1999-2000",
  "base set 4th print": "base1-1999-2000",
  "base fourth print": "base1-1999-2000",
  "base 4th print": "base1-1999-2000",
  "uk base set": "base1-1999-2000",
  "base set uk print": "base1-1999-2000",
  rm: "ru1",
  sv3pt5: "sv03.5",
  sm35: "sm3.5",
};

export function normalizePublicSetRouteCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolvePublicSetRouteCode(value?: string | null) {
  const normalized = normalizePublicSetRouteCode(value);
  return PUBLIC_SET_ROUTE_ALIAS_MAP[normalized] ?? normalized;
}

export const SET_INTENT_ALIAS_MAP: Record<string, string[]> = {
  ...SET_SHORTHANDS,
  "shiny vault": ["sma"],
  "shiny-vault": ["sma"],
  rm: ["ru1"],
  sv3pt5: ["sv03.5"],
  sm35: ["sm3.5"],
  "ascended heroes": ["me02.5"],
  "pokemon 151": ["sv03.5"],
  "151": ["sv03.5"],
  "prismatic evolutions": ["sv8pt5"],
  "pris evo": ["sv8pt5"],
  "brilliant stars": ["swsh9"],
  brs: ["swsh9"],
  "lost origin": ["swsh11"],
  lor: ["swsh11"],
  "legendary treasures": ["bw11"],
  ltr: ["bw11"],
  "silver tempest": ["swsh12"],
  sit: ["swsh12"],
  "base set": ["base1"],
  shadowless: ["base1-shadowless"],
  "shadow less": ["base1-shadowless"],
  "base shadowless": ["base1-shadowless"],
  "base set shadowless": ["base1-shadowless"],
  "shadowless base set": ["base1-shadowless"],
  "shadowless base": ["base1-shadowless"],
  "base1 shadowless": ["base1-shadowless"],
  "no shadow base set": ["base1-shadowless"],
  "base set no shadow": ["base1-shadowless"],
  "base first edition": ["base1-first-edition"],
  "base first ed": ["base1-first-edition"],
  "base 1st edition": ["base1-first-edition"],
  "base 1st ed": ["base1-first-edition"],
  "base set first edition": ["base1-first-edition"],
  "base set 1st edition": ["base1-first-edition"],
  "first edition base set": ["base1-first-edition"],
  "first edition base": ["base1-first-edition"],
  "1st edition base set": ["base1-first-edition"],
  "1st edition base": ["base1-first-edition"],
  "base1 first edition": ["base1-first-edition"],
  "base1 1st edition": ["base1-first-edition"],
  "1999-2000": ["base1-1999-2000"],
  "1999 2000": ["base1-1999-2000"],
  "base 1999-2000": ["base1-1999-2000"],
  "base set 1999-2000": ["base1-1999-2000"],
  "base set 1999 2000": ["base1-1999-2000"],
  "1999-2000 base set": ["base1-1999-2000"],
  "1999-2000 base": ["base1-1999-2000"],
  "base1 1999-2000": ["base1-1999-2000"],
  "base set 2000": ["base1-1999-2000"],
  "fourth print": ["base1-1999-2000"],
  "4th print": ["base1-1999-2000"],
  "base fourth print": ["base1-1999-2000"],
  "base 4th print": ["base1-1999-2000"],
  "base set fourth print": ["base1-1999-2000"],
  "base set 4th print": ["base1-1999-2000"],
  "uk print": ["base1-1999-2000"],
  "uk base set": ["base1-1999-2000"],
  "base set uk print": ["base1-1999-2000"],
  svi: ["sv01"],
  obs: ["sv03"],
};

export const STRUCTURED_CARD_SET_ALIAS_MAP: Record<string, string[]> = {
  ...SET_INTENT_ALIAS_MAP,
  base: ["base1"],
  "brilliant stars trainer gallery": ["swsh9tg"],
  "lost origin trainer gallery": ["swsh11tg"],
  "trainer gallery": ["swsh9tg", "swsh10tg", "swsh11tg", "swsh12tg"],
  brs: ["swsh9", "swsh9tg"],
  lor: ["swsh11", "swsh11tg"],
  "brilliant stars": ["swsh9", "swsh9tg"],
  "lost origin": ["swsh11", "swsh11tg"],
};

export type PublicSetSummary = {
  code: string;
  name: string;
  printed_set_abbrev?: string;
  printed_total?: number;
  release_date?: string;
  sort_date?: string;
  release_year?: number;
  card_count: number;
  normalized_code: string;
  normalized_name: string;
  normalized_tokens: string[];
  normalized_printed_set_abbrev?: string;
};

type PublicSetSearchCandidate = {
  name?: string | null;
  code?: string | null;
  normalized_name?: string;
  normalized_code?: string;
};

export type PublicSetCard = {
  id?: string;
  gv_id: string;
  name: string;
  number: string;
  set_code?: string;
  variant_key?: string;
  printed_identity_modifier?: string;
  set_identity_model?: string;
  rarity?: string;
  image_url?: string;
  representative_image_url?: string;
  image_status?: string;
  image_note?: string;
  image_source?: string;
  display_image_url?: string;
  display_image_kind?:
    | "exact"
    | "representative"
    | "missing_variant_visual"
    | "missing"
    | "blocked";
  printings?: Array<{
    id?: string;
    printing_gv_id?: string;
    finish_key?: string;
    finish_name?: string;
    image_url?: string;
    image_status?: string;
    image_note?: string;
    image_source?: string;
    display_image_url?: string;
    display_image_kind?:
      | "exact"
      | "representative"
      | "missing_variant_visual"
      | "missing"
      | "blocked";
    owned_count?: number;
  }>;
};

export type PublicSetDetail = PublicSetSummary & {
  cards: PublicSetCard[];
};

export type PublicSetFilter =
  | "all"
  | "modern"
  | "special"
  | "a-z"
  | "newest"
  | "oldest";

export const PUBLIC_SET_FILTER_OPTIONS: Array<{
  value: PublicSetFilter;
  label: string;
}> = [
  { value: "all", label: "All Sets" },
  { value: "modern", label: "Modern" },
  { value: "special", label: "Special" },
  { value: "a-z", label: "A-Z" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export function normalizeSetQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePublicSetDisplayName(value?: string | null) {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    return normalized;
  }

  return normalized
    .replace(/\bMacdonald's\b/gi, "McDonald's")
    .replace(/\btrainer Kit\b/g, "Trainer Kit");
}

export function tokenizeSetWords(value?: string | null) {
  return normalizeSetQuery(value ?? "").match(/[a-z0-9]+/g) ?? [];
}

export function normalizeSetSearchQuery(value: string) {
  return tokenizeSetWords(value);
}

export function matchesPublicSetSearch(
  setInfo: PublicSetSearchCandidate,
  tokens: string[],
) {
  if (tokens.length === 0) {
    return true;
  }

  const haystacks = [
    setInfo.normalized_name ?? normalizeSetQuery(setInfo.name ?? ""),
    setInfo.normalized_code ?? normalizeSetQuery(setInfo.code ?? ""),
  ];

  return tokens.every((token) =>
    haystacks.some((value) => value.includes(token)),
  );
}

export function normalizePublicSetFilter(
  value?: string | null,
): PublicSetFilter {
  switch ((value ?? "").trim().toLowerCase()) {
    case "modern":
      return "modern";
    case "special":
      return "special";
    case "a-z":
      return "a-z";
    case "newest":
      return "newest";
    case "oldest":
      return "oldest";
    default:
      return "all";
  }
}
