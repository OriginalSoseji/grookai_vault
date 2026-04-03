import type { ActiveCardPrintIdentity, DisplayPrintedIdentity } from "@/types/cards";

type DisplayIdentityInput = {
  number?: string | null;
  printed_set_abbrev?: string | null;
  active_identity?: ActiveCardPrintIdentity | null;
};

function normalizeOptionalText(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getDisplayPrintedIdentity(card: DisplayIdentityInput): DisplayPrintedIdentity {
  const activePrintedNumber = normalizeOptionalText(card.active_identity?.printed_number);
  const legacyPrintedNumber = normalizeOptionalText(card.number);

  if (activePrintedNumber) {
    return {
      displayPrintedNumber: activePrintedNumber,
      displayPrintedSetAbbrev: normalizeOptionalText(card.printed_set_abbrev),
      identitySource: "card_print_identity",
    };
  }

  if (legacyPrintedNumber) {
    return {
      displayPrintedNumber: legacyPrintedNumber,
      displayPrintedSetAbbrev: normalizeOptionalText(card.printed_set_abbrev),
      identitySource: "card_prints",
    };
  }

  return {
    displayPrintedNumber: null,
    displayPrintedSetAbbrev: normalizeOptionalText(card.printed_set_abbrev),
    identitySource: "missing",
  };
}
