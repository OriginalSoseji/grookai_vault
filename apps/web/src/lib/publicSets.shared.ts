import { SET_SHORTHANDS } from "@/lib/resolver/shorthand";

export const SET_INTENT_ALIAS_MAP: Record<string, string[]> = {
  ...SET_SHORTHANDS,
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
  display_image_kind?: "exact" | "representative" | "missing";
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

export const PUBLIC_SET_FILTER_OPTIONS: Array<{ value: PublicSetFilter; label: string }> = [
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

  return tokens.every((token) => haystacks.some((value) => value.includes(token)));
}

export function normalizePublicSetFilter(value?: string | null): PublicSetFilter {
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
