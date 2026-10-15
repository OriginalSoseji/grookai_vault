export type EbaySoldSearchInput = {
  cardName: string;
  setName?: string | null;
  collectorNumber?: string | null;
  finish?: string | null;
  variantLabels?: string[] | null;
};

/**
 * Builds a review link for completed eBay listings without treating those
 * listings as Grookai pricing evidence. The query keeps the exact-print
 * context visible so the user can reject mismatched variants manually.
 */
export function buildEbaySoldSearchHref({
  cardName,
  setName,
  collectorNumber,
  finish,
  variantLabels,
}: EbaySoldSearchInput) {
  const queryTokens = [
    cardName,
    setName,
    collectorNumber,
    ...(variantLabels ?? []),
    finish,
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
  const seen = new Set<string>();
  const query = queryTokens
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
  const url = new URL("https://www.ebay.com/sch/i.html");
  url.searchParams.set("_nkw", query);
  url.searchParams.set("LH_Sold", "1");
  url.searchParams.set("LH_Complete", "1");
  return url.toString();
}
