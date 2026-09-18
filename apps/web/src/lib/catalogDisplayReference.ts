export function normalizeCollectorPrintedSetAbbrev(value?: string | null) {
  const code = value?.trim();
  if (!code || !/^[a-z0-9][a-z0-9.-]{0,15}$/i.test(code) || /product|^jpn$/i.test(code)) return undefined;
  return code.toUpperCase();
}

export function resolveCollectorPrintedCoordinates(input: {
  cardCode?: string | null;
  cardTotal?: number | null;
  evidenceCode?: string | null;
  setCode?: string | null;
  setTotal?: number | null;
  setIdentityModel?: string | null;
}) {
  // An anthology's membership count is not a card's printed denominator.
  const totals = input.setIdentityModel === 'reprint_anthology'
    ? [input.cardTotal] : [input.cardTotal, input.setTotal];
  const total = totals.find(value => Number.isSafeInteger(value) && Number(value) > 0);
  return {
    printedSetAbbrev: normalizeCollectorPrintedSetAbbrev(input.cardCode)
      ?? normalizeCollectorPrintedSetAbbrev(input.evidenceCode)
      ?? normalizeCollectorPrintedSetAbbrev(input.setCode),
    printedTotal: total ?? undefined,
  };
}

export function formatCollectorCardReference(input: {
  gvId: string;
  setCode?: string;
  number?: string;
  setName?: string;
  displayCode?: string;
}) {
  if (!input.setCode?.toLowerCase().startsWith("jpn-") ||
      !/(?:jpn-)?product-[0-9a-f]{16}|(?:artofpkm|tcgcollector):/i.test(input.gvId)) return input.gvId;
  const setLabel = input.displayCode && input.displayCode !== "Japanese release"
    ? input.displayCode : input.setName || "Japanese release";
  return `${setLabel} | ${input.number ? `#${input.number}` : "Unnumbered"} | Japanese`;
}
