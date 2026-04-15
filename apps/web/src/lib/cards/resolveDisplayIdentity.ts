export type CardPrint = {
  name: string;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  set_identity_model: string | null;
  set_code: string;
  number: string | null;
  external_ids?: Record<string, string | null | undefined> | null;
};

export type ResolvedDisplayIdentity = {
  display_name: string;
  base_name: string;
  suffix: string | null;
};

const VARIANT_KEY_MAP: Record<string, string> = {
  pokemon_together_stamp: "Pokémon Together Stamp",
  prerelease: "Prerelease",
  staff: "Staff",
  alt: "Alternate Art",
  tg: "Trainer Gallery",
  rc: "Radiant Collection",
  cc: "Classic Collection",
};

const PRINTED_IDENTITY_MODIFIER_MAP: Record<string, string> = {
  delta_species: "δ Delta Species",
};

const NON_MEANINGFUL_VARIANT_KEYS = new Set(["", "base", "default", "normal", "standard", "none"]);

function normalizeToken(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function toTitleCaseToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "pokemon") {
    return "Pokémon";
  }

  if (normalized.length <= 2 && /^[a-z0-9]+$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  return `${normalized[0]?.toUpperCase() ?? ""}${normalized.slice(1)}`;
}

export function formatVariantKey(value?: string | null) {
  const normalized = normalizeToken(value);
  if (NON_MEANINGFUL_VARIANT_KEYS.has(normalized)) {
    return null;
  }

  const mapped = VARIANT_KEY_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  const humanized = normalized
    .split("_")
    .filter(Boolean)
    .map(toTitleCaseToken)
    .join(" ")
    .trim();

  return humanized || null;
}

export function formatPrintedIdentityModifier(value?: string | null) {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return null;
  }

  const mapped = PRINTED_IDENTITY_MODIFIER_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  const humanized = normalized
    .split("_")
    .filter(Boolean)
    .map(toTitleCaseToken)
    .join(" ")
    .trim();

  return humanized || null;
}

export function resolveDisplayIdentity(card: Partial<CardPrint> & { name?: string | null }): ResolvedDisplayIdentity {
  const base_name = (card.name ?? "").trim() || "Unknown card";

  let suffix = formatVariantKey(card.variant_key);

  if (!suffix) {
    suffix = formatPrintedIdentityModifier(card.printed_identity_modifier);
  }

  if (!suffix && normalizeToken(card.set_identity_model) === "reprint_anthology") {
    suffix = "Classic Collection";
  }

  return {
    display_name: suffix ? `${base_name} · ${suffix}` : base_name,
    base_name,
    suffix,
  };
}
