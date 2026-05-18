import {
  getPrintedIdentityModifierDisplayLabel,
  getVariantDisplayLabel,
} from "@/lib/cards/displayDiscriminator";

export type VariantFlags = Partial<{
  firstEdition: boolean;
  shadowless: boolean;
  holo: boolean;
  reverse: boolean;
  reverseHolo: boolean;
  stamped: boolean;
  error: boolean;
}> | null;

type VariantPresentationInput = {
  number?: string | null;
  setCode?: string | null;
  variantKey?: string | null;
  variant_key?: string | null;
  printedIdentityModifier?: string | null;
  printed_identity_modifier?: string | null;
  variants?: VariantFlags;
};

const NUMBER_LANE_PREFIXES = new Set(["TG", "GG", "RC", "SV"]);

function readFlag(value: unknown) {
  return value === true;
}

function getNumberLane(number?: string | null) {
  const match = (number ?? "").trim().toUpperCase().match(/^([A-Z]{1,4})\d+[A-Z]?$/);
  if (!match) {
    return null;
  }

  return NUMBER_LANE_PREFIXES.has(match[1]) ? match[1] : null;
}

export function getVariantLabels(input: VariantPresentationInput, limit = 2) {
  const labels: string[] = [];
  const push = (label?: string | null) => {
    if (!label || labels.includes(label)) {
      return;
    }

    labels.push(label);
  };

  push(getNumberLane(input.number));
  push(getVariantDisplayLabel(input.variantKey ?? input.variant_key));
  push(getPrintedIdentityModifierDisplayLabel(input.printedIdentityModifier ?? input.printed_identity_modifier));

  const variants = input.variants ?? null;
  if (variants) {
    if (readFlag(variants.firstEdition)) push("1st Edition");
    if (readFlag(variants.shadowless)) push("Shadowless");
    if (readFlag(variants.reverseHolo) || readFlag(variants.reverse)) {
      push("Reverse Holo");
    }
    if (readFlag(variants.holo)) push("Holo");
    if (readFlag(variants.stamped)) push("Stamped");
    if (readFlag(variants.error)) push("Error");
  }

  return labels.slice(0, limit);
}
