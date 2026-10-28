export type EbaySearchContext = {
  cardName: string;
  setName?: string | null;
  collectorNumber?: string | null;
  finish?: string | null;
};

/** Search navigation only. Results are not verified matches or pricing evidence. */
export function buildEbaySearchUrl(
  context: EbaySearchContext,
  sold: boolean,
): string | null {
  if (!context.cardName.trim()) return null;
  const query = [
    context.cardName,
    context.setName,
    context.collectorNumber,
    context.finish,
  ]
    .map((value) => value?.trim()).filter(Boolean).join(" ");
  const url = new URL("https://www.ebay.com/sch/i.html");
  url.searchParams.set("_nkw", query);
  if (sold) {
    url.searchParams.set("LH_Sold", "1");
    url.searchParams.set("LH_Complete", "1");
  }
  return url.toString();
}
