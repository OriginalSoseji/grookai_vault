import {
  formatPrintedIdentityModifier,
  formatVariantKey,
  resolveDisplayIdentity,
} from "@/lib/cards/resolveDisplayIdentity";

export const IDENTITY_FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "alternate_art", label: "Alternate Art" },
  { key: "classic_collection", label: "Classic Collection" },
  { key: "pokemon_together_stamp", label: "Pokémon Together Stamp" },
  { key: "trainer_gallery", label: "Trainer Gallery" },
  { key: "radiant_collection", label: "Radiant Collection" },
  { key: "prerelease", label: "Prerelease" },
  { key: "staff", label: "Staff" },
] as const;

export type IdentityFilterKey = (typeof IDENTITY_FILTER_OPTIONS)[number]["key"];

export type IdentitySearchCard = {
  name?: string | null;
  variant_key?: string | null;
  printed_identity_modifier?: string | null;
  set_identity_model?: string | null;
  set_code?: string | null;
  number?: string | null;
  external_ids?: Record<string, string | null | undefined> | null;
  rarity?: string | null;
  set_name?: string | null;
};

const IDENTITY_FILTER_LABEL_BY_KEY: Record<IdentityFilterKey, string> =
  Object.fromEntries(
    IDENTITY_FILTER_OPTIONS.map((option) => [option.key, option.label]),
  ) as Record<IdentityFilterKey, string>;

const VARIANT_KEY_TOKEN_MAP: Record<string, string[]> = {
  alt: ["alt", "alt art", "alternate art"],
  cc: ["cc", "classic collection", "celebrations classic collection"],
  pokemon_together_stamp: [
    "pokemon together",
    "together",
    "stamp",
    "pokemon together stamp",
  ],
  prerelease: ["prerelease"],
  rc: ["rc", "radiant collection"],
  staff: ["staff"],
  tg: ["tg", "trainer gallery"],
};

const PRINTED_IDENTITY_TOKEN_MAP: Record<string, string[]> = {
  delta_species: ["delta", "delta species"],
};

const FILTER_VARIANT_KEY_MAP: Record<
  Exclude<IdentityFilterKey, "all" | "classic_collection">,
  string
> = {
  alternate_art: "alt",
  pokemon_together_stamp: "pokemon_together_stamp",
  prerelease: "prerelease",
  radiant_collection: "rc",
  staff: "staff",
  trainer_gallery: "tg",
};

function normalizeVariantToken(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeIdentitySearchText(value?: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function appendPhrase(target: Set<string>, value?: string | null) {
  const normalized = normalizeIdentitySearchText(value);
  if (!normalized) {
    return;
  }

  target.add(normalized);
  for (const token of normalized.split(" ")) {
    if (!token) {
      continue;
    }
    target.add(token);
  }
}

function isSingleLetterIdentity(value?: string | null) {
  const normalized = (value ?? "").trim();
  return /^[A-Za-z0-9★☆]$/.test(normalized);
}

function getNormalizedVariantKey(card: IdentitySearchCard) {
  return normalizeVariantToken(card.variant_key);
}

function getNormalizedPrintedIdentityModifier(card: IdentitySearchCard) {
  return normalizeVariantToken(card.printed_identity_modifier);
}

function getNormalizedSetIdentityModel(card: IdentitySearchCard) {
  return normalizeVariantToken(card.set_identity_model);
}

export function normalizeIdentityFilterKey(
  value?: string | null,
): IdentityFilterKey {
  const normalized = normalizeIdentitySearchText(value).replace(/\s+/g, "_");
  return IDENTITY_FILTER_OPTIONS.some((option) => option.key === normalized)
    ? (normalized as IdentityFilterKey)
    : "all";
}

export function isIdentityFilterActive(value?: string | null) {
  return normalizeIdentityFilterKey(value) !== "all";
}

export function getIdentityFilterLabel(filterKey: IdentityFilterKey) {
  return IDENTITY_FILTER_LABEL_BY_KEY[filterKey];
}

export function getCardIdentityFilterKeys(card: IdentitySearchCard) {
  const keys = new Set<IdentityFilterKey>();
  const variantKey = getNormalizedVariantKey(card);
  const setIdentityModel = getNormalizedSetIdentityModel(card);

  if (variantKey === "alt") {
    keys.add("alternate_art");
  }

  if (variantKey === "cc" || setIdentityModel === "reprint_anthology") {
    keys.add("classic_collection");
  }

  if (variantKey === "pokemon_together_stamp") {
    keys.add("pokemon_together_stamp");
  }

  if (variantKey === "tg") {
    keys.add("trainer_gallery");
  }

  if (variantKey === "rc") {
    keys.add("radiant_collection");
  }

  if (variantKey === "prerelease") {
    keys.add("prerelease");
  }

  if (variantKey === "staff") {
    keys.add("staff");
  }

  return [...keys];
}

export function matchesIdentityFilter(
  card: IdentitySearchCard,
  filterKey?: string | null,
) {
  const normalized = normalizeIdentityFilterKey(filterKey);
  if (normalized === "all") {
    return true;
  }

  return getCardIdentityFilterKeys(card).includes(normalized);
}

export function buildIdentityFilterCounts(cards: Iterable<IdentitySearchCard>) {
  const counts: Record<IdentityFilterKey, number> = {
    all: 0,
    alternate_art: 0,
    classic_collection: 0,
    pokemon_together_stamp: 0,
    trainer_gallery: 0,
    radiant_collection: 0,
    prerelease: 0,
    staff: 0,
  };

  for (const card of cards) {
    counts.all += 1;
    for (const filterKey of getCardIdentityFilterKeys(card)) {
      counts[filterKey] += 1;
    }
  }

  return counts;
}

export function getIdentitySearchTokens(card: IdentitySearchCard) {
  const phrases = new Set<string>();
  const variantKey = getNormalizedVariantKey(card);
  const printedIdentityModifier = getNormalizedPrintedIdentityModifier(card);
  const displayIdentity = resolveDisplayIdentity({
    name: card.name ?? undefined,
    variant_key: card.variant_key ?? undefined,
    printed_identity_modifier: card.printed_identity_modifier ?? undefined,
    set_identity_model: card.set_identity_model ?? undefined,
    set_code: card.set_code ?? undefined,
    number: card.number ?? undefined,
    external_ids: card.external_ids ?? undefined,
  });

  appendPhrase(phrases, displayIdentity.suffix);
  appendPhrase(phrases, formatVariantKey(card.variant_key));
  appendPhrase(
    phrases,
    formatPrintedIdentityModifier(card.printed_identity_modifier),
  );

  for (const alias of VARIANT_KEY_TOKEN_MAP[variantKey] ?? []) {
    appendPhrase(phrases, alias);
  }

  for (const alias of PRINTED_IDENTITY_TOKEN_MAP[printedIdentityModifier] ??
    []) {
    appendPhrase(phrases, alias);
  }

  if (getNormalizedSetIdentityModel(card) === "reprint_anthology") {
    appendPhrase(phrases, "classic collection");
    appendPhrase(phrases, "celebrations classic collection");
  }

  if (isSingleLetterIdentity(card.variant_key)) {
    appendPhrase(phrases, card.variant_key);
  }

  if (isSingleLetterIdentity(card.printed_identity_modifier)) {
    appendPhrase(phrases, card.printed_identity_modifier);
  }

  return [...phrases];
}

export function buildIdentitySearchText(card: IdentitySearchCard) {
  return getIdentitySearchTokens(card).join(" ");
}

export function getVariantKeyForFilter(filterKey: IdentityFilterKey) {
  if (filterKey === "all" || filterKey === "classic_collection") {
    return null;
  }

  return FILTER_VARIANT_KEY_MAP[filterKey];
}
