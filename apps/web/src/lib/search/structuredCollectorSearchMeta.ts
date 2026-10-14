type StructuredCollectorSearchPacket = {
  numberTokens: string[];
  numberDigitTokens: string[];
  fractionTokens: string[];
  expandedNameTokens: string[];
  expectedSetCodes: string[];
  promoTokens: string[];
  variantTokens: string[];
};

type StructuredCollectorSearchRow = {
  number?: string | null;
  printed_total?: number | null;
};

type StructuredCollectorSearchMeta = {
  resolverState: "DIRECT_MATCH" | "AMBIGUOUS_MATCH" | "WEAK_MATCH" | "NO_MATCH";
  topScore: null;
  candidateCount: number;
  autoResolved: false;
  intentSummary: { expectedSetCodes: string[]; nameTokens: string[] };
  structuredEvidenceFlags: {
    text: boolean;
    textRequired: false;
    expectedSet: boolean;
    number: boolean;
    fraction: boolean;
    promo: boolean;
    variants: string[];
  };
};

function normalizeCollectorToken(value?: string | null) {
  return (value ?? "")
    .trim()
    .split("/", 1)[0]
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeDigits(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return digits || "0";
}

function rowMatchesFraction(
  row: StructuredCollectorSearchRow,
  fractionTokens: string[],
) {
  if (typeof row.printed_total !== "number") return false;
  const rowNumber = normalizeCollectorToken(row.number);
  return fractionTokens.some((fractionToken) => {
    const match = fractionToken.match(/^([A-Z]*\d+[A-Z]?)\/([A-Z]*\d+[A-Z]?)$/i);
    if (!match) return false;
    const requestedNumber = normalizeCollectorToken(match[1]);
    const sameNumber = rowNumber === requestedNumber ||
      (/^\d+$/.test(rowNumber) && /^\d+$/.test(requestedNumber) &&
        normalizeDigits(rowNumber) === normalizeDigits(requestedNumber));
    return sameNumber &&
      normalizeDigits(String(row.printed_total)) === normalizeDigits(match[2]);
  });
}

export function buildStructuredCollectorSearchMeta(
  rows: StructuredCollectorSearchRow[],
  packet: StructuredCollectorSearchPacket,
): StructuredCollectorSearchMeta {
  const collectorTokens = new Set(
    [
      ...packet.numberTokens,
      ...packet.numberDigitTokens,
      ...packet.fractionTokens.flatMap((fraction) => fraction.split("/")),
    ].map((token) => token.toLowerCase()),
  );
  const nameTokens = [...new Set(
    packet.expandedNameTokens.filter((token) => !collectorTokens.has(token)),
  )];
  const fractionMatched = packet.fractionTokens.length > 0 &&
    rows.some((row) => rowMatchesFraction(row, packet.fractionTokens));

  return {
    resolverState: rows.length === 0
      ? "NO_MATCH"
      : rows.length === 1 &&
          (packet.fractionTokens.length === 0 || fractionMatched)
        ? "DIRECT_MATCH"
        : "AMBIGUOUS_MATCH",
    topScore: null,
    candidateCount: rows.length,
    autoResolved: false,
    intentSummary: {
      expectedSetCodes: packet.expectedSetCodes,
      nameTokens,
    },
    structuredEvidenceFlags: {
      text: nameTokens.length > 0,
      textRequired: false,
      expectedSet: packet.expectedSetCodes.length > 0,
      number: packet.numberTokens.length > 0,
      fraction: fractionMatched,
      promo: packet.promoTokens.length > 0,
      variants: packet.variantTokens,
    },
  };
}
