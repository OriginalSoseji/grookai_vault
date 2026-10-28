import {
  buildEbaySearchUrl,
  type EbaySearchContext,
} from "@/lib/pricing/ebaySearch";

export default function CardEbayLinks(context: EbaySearchContext) {
  const sold = buildEbaySearchUrl(context, true);
  const active = buildEbaySearchUrl(context, false);
  if (!sold || !active) return null;
  return (
    <div
      className="gv-ebay-listing-links"
      role="group"
      aria-label="eBay listing searches"
    >
      <a
        href={sold}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Search eBay sold listings"
      >
        <span>eBay sold listings</span>
        <span aria-hidden>↗</span>
      </a>
      <a
        href={active}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Search eBay active listings"
      >
        <span>Active listings</span>
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}
