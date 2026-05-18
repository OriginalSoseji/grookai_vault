import {
  getPrintedIdentityModifierDisplayLabel,
  getVariantDisplayLabel,
} from "@/lib/cards/displayDiscriminator";

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

const DUPLICATE_MEANING_IDENTITY_SUBTITLE_ALLOWLIST = new Set([
  "classic collection",
]);

const NEVER_SUPPRESS_DUPLICATE_MEANING_SUBTITLES = new Set([
  "pokémon together stamp",
  "alternate art",
  "trainer gallery",
  "radiant collection",
  "prerelease",
  "staff",
]);

function normalizeToken(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeDisplayMeaning(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLetterOrSymbolIdentity(value?: string | null) {
  const normalized = (value ?? "").trim();
  return /^[\p{L}\p{N}★☆]$/u.test(normalized);
}

export function formatVariantKey(value?: string | null) {
  return getVariantDisplayLabel(value);
}

export function formatPrintedIdentityModifier(value?: string | null) {
  return getPrintedIdentityModifierDisplayLabel(value);
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

export function resolveDisplayIdentitySubtitleForContext({
  identitySubtitle,
  visibleSetLabel,
}: {
  identitySubtitle?: string | null;
  visibleSetLabel?: string | null;
}) {
  if (!identitySubtitle) {
    return null;
  }

  const normalizedSubtitle = normalizeDisplayMeaning(identitySubtitle);
  if (!normalizedSubtitle) {
    return identitySubtitle;
  }

  if (
    NEVER_SUPPRESS_DUPLICATE_MEANING_SUBTITLES.has(normalizedSubtitle) ||
    isLetterOrSymbolIdentity(identitySubtitle)
  ) {
    return identitySubtitle;
  }

  if (!DUPLICATE_MEANING_IDENTITY_SUBTITLE_ALLOWLIST.has(normalizedSubtitle)) {
    return identitySubtitle;
  }

  const normalizedSetLabel = normalizeDisplayMeaning(visibleSetLabel);
  if (!normalizedSetLabel) {
    return identitySubtitle;
  }

  return normalizedSetLabel.includes(normalizedSubtitle) ? null : identitySubtitle;
}
