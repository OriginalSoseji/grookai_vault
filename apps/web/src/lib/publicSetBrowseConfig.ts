export const PUBLIC_SET_BROWSE_CONTRACT_VERSION = "CROSS_TCG_SET_BROWSER_V1";

export type PublicSetBrowseGame = "pokemon" | "one_piece" | "mtg";

export type PublicSetBrowseGroup =
  | "all"
  | "sv"
  | "swsh"
  | "sm"
  | "xy"
  | "bw"
  | "dp"
  | "ex"
  | "classic"
  | "op"
  | "eb"
  | "prb"
  | "st"
  | "promo"
  | "current"
  | "recent"
  | "modern"
  | "legacy"
  | "unknown";

export type PublicSetProductLane =
  | "all"
  | "main"
  | "special"
  | "promo"
  | "deck"
  | "world"
  | "token";

type SetCandidate = {
  game_code?: string | null;
  code?: string | null;
  name?: string | null;
  release_year?: number;
  catalog_set_type?: string | null;
};

type BrowseOption<TValue extends string> = {
  value: TValue;
  label: string;
  shortLabel?: string;
};

export type PublicSetBrowseConfig = {
  game: PublicSetBrowseGame;
  pageTitle: string;
  pageDescription: string;
  groupLabel: string;
  groupTitle: string;
  groupDescription: string;
  groups: BrowseOption<PublicSetBrowseGroup>[];
  lanes: BrowseOption<PublicSetProductLane>[];
};

const POKEMON_GROUPS: PublicSetBrowseConfig["groups"] = [
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

const CONFIGS: Record<PublicSetBrowseGame, PublicSetBrowseConfig> = {
  pokemon: {
    game: "pokemon",
    pageTitle: "Browse Pokemon TCG Sets",
    pageDescription:
      "Explore Pokemon sets, special releases, promos, and decks. Open a set to see its cards and exact versions.",
    groupLabel: "Era",
    groupTitle: "Browse by era",
    groupDescription: "Jump into the Pokemon catalog by release era.",
    groups: POKEMON_GROUPS,
    lanes: [
      { value: "all", label: "All set types" },
      { value: "main", label: "Main sets" },
      { value: "special", label: "Special sets" },
      { value: "promo", label: "Promos" },
      { value: "deck", label: "Decks & kits" },
      { value: "world", label: "Worlds decks" },
    ],
  },
  one_piece: {
    game: "one_piece",
    pageTitle: "Browse One Piece Card Game Releases",
    pageDescription:
      "Explore booster releases, extra and premium boosters, starter decks, promos, and DON!! cards.",
    groupLabel: "Release family",
    groupTitle: "Browse One Piece releases",
    groupDescription: "Choose a release family or separate decks from booster sets.",
    groups: [
      { value: "all", label: "All releases", shortLabel: "All" },
      { value: "op", label: "Booster packs", shortLabel: "OP" },
      { value: "eb", label: "Extra boosters", shortLabel: "EB" },
      { value: "prb", label: "Premium boosters", shortLabel: "PRB" },
      { value: "st", label: "Starter decks", shortLabel: "ST" },
      { value: "promo", label: "Promos & DON!!", shortLabel: "Promo" },
    ],
    lanes: [
      { value: "all", label: "All product types" },
      { value: "main", label: "Booster sets" },
      { value: "special", label: "Extra & premium boosters" },
      { value: "deck", label: "Starter decks" },
      { value: "promo", label: "Promos & DON!!" },
    ],
  },
  mtg: {
    game: "mtg",
    pageTitle: "Browse Magic: The Gathering Sets",
    pageDescription:
      "Explore Magic expansions, supplemental releases, Commander products, promos, and tokens.",
    groupLabel: "Release period",
    groupTitle: "Browse Magic releases",
    groupDescription: "Narrow the catalog by release period, then filter by Magic product type.",
    groups: [
      { value: "all", label: "All release periods", shortLabel: "All" },
      { value: "current", label: "2025 and newer", shortLabel: "Current" },
      { value: "recent", label: "2020–2024", shortLabel: "2020s" },
      { value: "modern", label: "2010–2019", shortLabel: "2010s" },
      { value: "legacy", label: "Before 2010", shortLabel: "Legacy" },
      { value: "unknown", label: "Date pending", shortLabel: "Pending" },
    ],
    lanes: [
      { value: "all", label: "All product types" },
      { value: "main", label: "Expansions" },
      { value: "special", label: "Supplemental sets" },
      { value: "deck", label: "Commander & decks" },
      { value: "promo", label: "Promos" },
      { value: "token", label: "Tokens & extras" },
    ],
  },
};

function normalizedText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function getPublicSetBrowseConfig(game: PublicSetBrowseGame) {
  return CONFIGS[game];
}

export function normalizePublicSetBrowseGroup(
  value: string | null | undefined,
  game: PublicSetBrowseGame,
): PublicSetBrowseGroup {
  const normalized = normalizedText(value);
  return CONFIGS[game].groups.some((option) => option.value === normalized)
    ? (normalized as PublicSetBrowseGroup)
    : "all";
}

export function normalizePublicSetProductLane(
  value: string | null | undefined,
  game: PublicSetBrowseGame,
): PublicSetProductLane {
  const normalized = normalizedText(value);
  return CONFIGS[game].lanes.some((option) => option.value === normalized)
    ? (normalized as PublicSetProductLane)
    : "all";
}

export function getPublicSetBrowseGroup(
  setInfo: SetCandidate,
  game: PublicSetBrowseGame,
): PublicSetBrowseGroup {
  const code = normalizedText(setInfo.code);
  const year = setInfo.release_year;

  if (game === "one_piece") {
    if (code.startsWith("op")) return "op";
    if (code.startsWith("eb")) return "eb";
    if (code.startsWith("prb")) return "prb";
    if (code.startsWith("st")) return "st";
    if (code === "p" || code === "don") return "promo";
    return "unknown";
  }

  if (game === "mtg") {
    if (typeof year !== "number") return "unknown";
    if (year >= 2025) return "current";
    if (year >= 2020) return "recent";
    if (year >= 2010) return "modern";
    return "legacy";
  }

  if (typeof year !== "number") return "unknown";
  if (year >= 2023) return "sv";
  if (year >= 2020) return "swsh";
  if (year >= 2017) return "sm";
  if (year >= 2013) return "xy";
  if (year >= 2011) return "bw";
  if (year >= 2007) return "dp";
  if (year >= 2003) return "ex";
  return "classic";
}

export function getPublicSetProductLane(
  setInfo: SetCandidate,
  game: PublicSetBrowseGame,
): PublicSetProductLane {
  const code = normalizedText(setInfo.code);
  const name = normalizedText(setInfo.name);
  const haystack = `${code} ${name}`;

  if (game === "one_piece") {
    if (code.startsWith("st")) return "deck";
    if (code.startsWith("eb") || code.startsWith("prb")) return "special";
    if (code === "p" || code === "don" || name.includes("promo")) return "promo";
    return "main";
  }

  if (game === "mtg") {
    const catalogSetType = normalizedText(setInfo.catalog_set_type);
    if (["token", "memorabilia", "minigame"].includes(catalogSetType)) return "token";
    if (catalogSetType === "promo") return "promo";
    if (["commander", "duel_deck", "premium_deck", "planechase", "archenemy"].includes(catalogSetType)) return "deck";
    if ([
      "alchemy",
      "arsenal",
      "box",
      "draft_innovation",
      "from_the_vault",
      "funny",
      "masterpiece",
      "masters",
      "spellbook",
      "treasure_chest",
    ].includes(catalogSetType)) return "special";
    if (["core", "expansion", "starter"].includes(catalogSetType)) return "main";
    if (/token|memorabilia|art series|minigame/.test(haystack)) return "token";
    if (/promo|promotional|judge gift|play network|wizards play network/.test(haystack)) return "promo";
    if (/commander|deck|duel deck|planechase|archenemy/.test(haystack)) return "deck";
    if (/masters|remastered|antholog|conspiracy|horizon|supplement|box topper|masterpiece|secret lair/.test(haystack)) return "special";
    return "main";
  }

  if (code.startsWith("wcd") || haystack.includes("world championship")) return "world";
  if (/promo|promotional|black star|pokemon center/.test(haystack)) return "promo";
  if (/deck|trainer kit|battle academy|league battle|starter set/.test(haystack)) return "deck";
  if (code.includes("pt5") || code.includes(".5") || /trainer gallery|radiant collection|shiny|fates|crown zenith|prismatic/.test(name)) {
    return "special";
  }
  return "main";
}

export function getPublicSetGroupLabel(group: PublicSetBrowseGroup, game: PublicSetBrowseGame) {
  return CONFIGS[game].groups.find((option) => option.value === group)?.label ?? CONFIGS[game].groups[0].label;
}

export function getPublicSetProductLaneLabel(lane: PublicSetProductLane, game: PublicSetBrowseGame) {
  return CONFIGS[game].lanes.find((option) => option.value === lane)?.label ?? CONFIGS[game].lanes[0].label;
}
