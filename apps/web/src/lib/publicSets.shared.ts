import { SET_SHORTHANDS } from "@/lib/resolver/shorthand";

export const PUBLIC_SET_ROUTE_ALIAS_MAP: Record<string, string> = {
  "shiny vault": "sma",
  "shiny-vault": "sma",
  "2021swsh": "mcd21",
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
  printed_set_abbrev?: string | null;
  release_year?: number;
  normalized_name?: string;
  normalized_code?: string;
  normalized_printed_set_abbrev?: string;
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

export type PublicWorldChampionshipDecklistEntry = {
  id?: string;
  gv_id: string;
  name: string;
  number: string;
  quantity: number | null;
  source_set_name?: string;
  source_card_number?: string;
  rarity?: string;
};

export type PublicWorldChampionshipDecklist = {
  set_code: string;
  deck_name?: string;
  deck_year?: number;
  player_name?: string;
  total_quantity: number;
  unique_card_count: number;
  entries: PublicWorldChampionshipDecklistEntry[];
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

export type PublicSetEra =
  | "all"
  | "sv"
  | "swsh"
  | "sm"
  | "xy"
  | "bw"
  | "dp"
  | "ex"
  | "classic"
  | "unknown";

export type PublicSetLane =
  | "all"
  | "main"
  | "special"
  | "promo"
  | "deck"
  | "world";

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

export const PUBLIC_SET_ERA_OPTIONS: Array<{
  value: PublicSetEra;
  label: string;
  shortLabel: string;
}> = [
  { value: "all", label: "All eras", shortLabel: "All" },
  { value: "sv", label: "Scarlet & Violet", shortLabel: "SV" },
  { value: "swsh", label: "Sword & Shield", shortLabel: "SWSH" },
  { value: "sm", label: "Sun & Moon", shortLabel: "SM" },
  { value: "xy", label: "XY", shortLabel: "XY" },
  { value: "bw", label: "Black & White", shortLabel: "BW" },
  { value: "dp", label: "DP / HGSS", shortLabel: "DP" },
  { value: "ex", label: "EX / e-Card", shortLabel: "EX" },
  { value: "classic", label: "Classic", shortLabel: "Classic" },
  { value: "unknown", label: "Date pending", shortLabel: "Pending" },
];

export const PUBLIC_SET_LANE_OPTIONS: Array<{
  value: PublicSetLane;
  label: string;
}> = [
  { value: "all", label: "All set types" },
  { value: "main", label: "Main sets" },
  { value: "special", label: "Special sets" },
  { value: "promo", label: "Promos" },
  { value: "deck", label: "Decks & kits" },
  { value: "world", label: "Worlds decks" },
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

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getWorldChampionshipDeckParts(setInfo: PublicSetSearchCandidate) {
  const code = setInfo.code ?? setInfo.normalized_code ?? "";
  const name = setInfo.name ?? setInfo.normalized_name ?? "";
  const codeMatch = code.match(/^wcd(\d{4})-(.+)$/i);
  const nameMatch = name.match(/^\s*(?:(\d{4})\s+)?world championships? deck:\s*(.+)$/i);

  if (!codeMatch && !nameMatch) {
    return null;
  }

  const year = nameMatch?.[1] ?? codeMatch?.[1] ?? (typeof setInfo.release_year === "number" ? String(setInfo.release_year) : "");
  const deckName = (nameMatch?.[2] ?? codeMatch?.[2]?.replace(/[-_]+/g, " ") ?? "").trim();

  return {
    year,
    deckName,
  };
}

export function getPublicSetSearchHaystacks(setInfo: PublicSetSearchCandidate) {
  const baseHaystacks = [
    setInfo.normalized_name ?? normalizeSetQuery(setInfo.name ?? ""),
    setInfo.normalized_code ?? normalizeSetQuery(setInfo.code ?? ""),
    setInfo.normalized_printed_set_abbrev ?? normalizeSetQuery(setInfo.printed_set_abbrev ?? ""),
  ];

  const worldChampionshipDeck = getWorldChampionshipDeckParts(setInfo);
  if (!worldChampionshipDeck) {
    return uniqueValues(baseHaystacks);
  }

  const { year, deckName } = worldChampionshipDeck;
  const specificAliases = deckName
    ? [
        deckName,
        `${deckName} deck`,
        `${deckName} world championship deck`,
        `${deckName} world championships deck`,
        `${deckName} worlds deck`,
        year ? `${year} ${deckName}` : "",
        year ? `${year} ${deckName} deck` : "",
        year ? `${year} world championship deck ${deckName}` : "",
        year ? `${year} world championships deck ${deckName}` : "",
        year ? `${year} worlds deck ${deckName}` : "",
      ]
    : [];

  return uniqueValues(
    [
      ...baseHaystacks,
      "world championship deck",
      "world championship decks",
      "world championships deck",
      "world championships decks",
      "pokemon world championship deck",
      "pokemon world championship decks",
      "worlds deck",
      "worlds decks",
      "wcd",
      year ? `${year} world championship deck` : "",
      year ? `${year} world championship decks` : "",
      year ? `${year} worlds deck` : "",
      year ? `${year} worlds decks` : "",
      ...specificAliases,
    ].map(normalizeSetQuery),
  );
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

  const haystacks = getPublicSetSearchHaystacks(setInfo);

  return tokens.every((token) =>
    haystacks.some((value) => value.includes(token)),
  );
}

export function isSpecialPublicSet(setInfo: PublicSetSearchCandidate) {
  const code = normalizeSetQuery(setInfo.code ?? setInfo.normalized_code ?? "");
  const name = normalizeSetQuery(setInfo.name ?? setInfo.normalized_name ?? "");

  if (code.includes("pt5") || code.includes(".5")) {
    return true;
  }

  return [
    "trainer gallery",
    "radiant collection",
    "shiny",
    "fates",
    "crown zenith",
    "prismatic",
  ].some((marker) => name.includes(marker));
}

export function getPublicSetEra(setInfo: Pick<PublicSetSummary, "release_year">): PublicSetEra {
  const year = setInfo.release_year;
  if (typeof year !== "number") {
    return "unknown";
  }

  if (year >= 2023) return "sv";
  if (year >= 2020) return "swsh";
  if (year >= 2017) return "sm";
  if (year >= 2013) return "xy";
  if (year >= 2011) return "bw";
  if (year >= 2007) return "dp";
  if (year >= 2003) return "ex";
  return "classic";
}

export function getPublicSetLane(setInfo: PublicSetSearchCandidate): PublicSetLane {
  const code = normalizeSetQuery(setInfo.code ?? setInfo.normalized_code ?? "");
  const name = normalizeSetQuery(setInfo.name ?? setInfo.normalized_name ?? "");
  const haystack = `${code} ${name}`;

  if (code.startsWith("wcd") || haystack.includes("world championship")) {
    return "world";
  }

  if (
    haystack.includes("promo") ||
    haystack.includes("promotional") ||
    haystack.includes("black star") ||
    haystack.includes("pokemon center")
  ) {
    return "promo";
  }

  if (
    haystack.includes("deck") ||
    haystack.includes("trainer kit") ||
    haystack.includes("battle academy") ||
    haystack.includes("league battle") ||
    haystack.includes("starter set")
  ) {
    return "deck";
  }

  if (isSpecialPublicSet(setInfo)) {
    return "special";
  }

  return "main";
}

export function getPublicSetEraLabel(era: PublicSetEra) {
  return PUBLIC_SET_ERA_OPTIONS.find((option) => option.value === era)?.label ?? "All eras";
}

export function getPublicSetLaneLabel(lane: PublicSetLane) {
  return PUBLIC_SET_LANE_OPTIONS.find((option) => option.value === lane)?.label ?? "All set types";
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

export function normalizePublicSetEra(value?: string | null): PublicSetEra {
  switch ((value ?? "").trim().toLowerCase()) {
    case "sv":
    case "scarlet-violet":
      return "sv";
    case "swsh":
    case "sword-shield":
      return "swsh";
    case "sm":
    case "sun-moon":
      return "sm";
    case "xy":
      return "xy";
    case "bw":
    case "black-white":
      return "bw";
    case "dp":
    case "dpp":
    case "hgss":
      return "dp";
    case "ex":
    case "ecard":
      return "ex";
    case "classic":
    case "wotc":
      return "classic";
    case "unknown":
    case "other":
      return "unknown";
    default:
      return "all";
  }
}

export function normalizePublicSetLane(value?: string | null): PublicSetLane {
  switch ((value ?? "").trim().toLowerCase()) {
    case "main":
      return "main";
    case "special":
      return "special";
    case "promo":
    case "promos":
      return "promo";
    case "deck":
    case "decks":
      return "deck";
    case "world":
    case "worlds":
      return "world";
    default:
      return "all";
  }
}
