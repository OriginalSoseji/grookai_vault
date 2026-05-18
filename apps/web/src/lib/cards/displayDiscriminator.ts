export type CardPrintDisplayDiscriminatorInput = {
  variantKey?: string | null;
  printedIdentityModifier?: string | null;
  finishKey?: string | null;
  finishLabel?: string | null;
  hasDuplicateCaption?: boolean;
  fallbackIndex?: number;
};

export type CardPrintDisplayDiscriminator = {
  label: string | null;
  source: "parent_variant" | "child_finish" | "printed_identity_modifier" | "fallback" | "none";
};

const NON_MEANINGFUL_VARIANT_KEYS = new Set(["", "base", "default", "normal", "standard", "none"]);

const FINISH_LABELS: Record<string, string> = {
  normal: "Normal",
  holo: "Holo",
  reverse: "Reverse Holo",
  pokeball: "Poké Ball",
  masterball: "Master Ball",
};

const VARIANT_LABELS: Record<string, string> = {
  alt: "Alternate Art",
  cc: "Classic Collection",
  rc: "Radiant Collection",
  tg: "Trainer Gallery",
  prerelease: "Prerelease Stamp",
  prerelease_stamp: "Prerelease Stamp",
  staff: "Staff Prerelease Stamp",
  staff_stamp: "Staff Stamp",
  staff_prerelease_stamp: "Staff Prerelease Stamp",
  play_pokemon_stamp: "Play Pokemon Stamp",
  pokemon_together_stamp: "Pokemon Together Stamp",
  e_league_stamp: "E-League Stamp",
  e_league_winner_stamp: "E-League Winner Stamp",
  illustration_rare: "Illustration Rare",
  shiny_rare: "Shiny Rare",
};

const PRINTED_IDENTITY_MODIFIER_LABELS: Record<string, string> = {
  delta_species: "Delta Species",
};

function normalizeKey(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function clean(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function titleCaseToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (["sm", "xy", "bw", "ex", "dp", "hgss", "sv"].includes(normalized)) {
    return normalized.toUpperCase();
  }

  if (/^\d+$/.test(normalized)) {
    return normalized;
  }

  return `${normalized[0]?.toUpperCase() ?? ""}${normalized.slice(1)}`;
}

function humanizeKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ")
    .trim();
}

export function getCardPrintingFinishLabel(input?: {
  finishKey?: string | null;
  finishLabel?: string | null;
}) {
  const keyedLabel = FINISH_LABELS[normalizeKey(input?.finishKey)];
  if (keyedLabel) {
    return keyedLabel;
  }

  return clean(input?.finishLabel);
}

export function getVariantDisplayLabel(variantKey?: string | null) {
  const normalized = normalizeKey(variantKey);
  if (NON_MEANINGFUL_VARIANT_KEYS.has(normalized)) {
    return null;
  }

  const mapped = VARIANT_LABELS[normalized];
  if (mapped) {
    return mapped;
  }

  if (/^[a-z0-9!?★☆]$/i.test(clean(variantKey) ?? "")) {
    return clean(variantKey)?.toUpperCase() ?? null;
  }

  return humanizeKey(normalized) || null;
}

export function getPrintedIdentityModifierDisplayLabel(value?: string | null) {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return null;
  }

  return PRINTED_IDENTITY_MODIFIER_LABELS[normalized] ?? humanizeKey(normalized) ?? null;
}

export function getCardPrintDisplayDiscriminator(
  input: CardPrintDisplayDiscriminatorInput,
): CardPrintDisplayDiscriminator {
  const variantLabel = getVariantDisplayLabel(input.variantKey);
  if (variantLabel) {
    return { label: variantLabel, source: "parent_variant" };
  }

  const finishLabel = getCardPrintingFinishLabel({
    finishKey: input.finishKey,
    finishLabel: input.finishLabel,
  });
  if (finishLabel) {
    return { label: finishLabel, source: "child_finish" };
  }

  const printedIdentityModifierLabel = getPrintedIdentityModifierDisplayLabel(input.printedIdentityModifier);
  if (printedIdentityModifierLabel) {
    return { label: printedIdentityModifierLabel, source: "printed_identity_modifier" };
  }

  if (input.hasDuplicateCaption) {
    const fallbackIndex = input.fallbackIndex ?? 0;
    return {
      label: fallbackIndex === 0 ? "Standard Print" : "Unclassified Variant",
      source: "fallback",
    };
  }

  return { label: null, source: "none" };
}
