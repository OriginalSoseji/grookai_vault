type TcgplayerCardReference = {
  name?: string | null;
  setName?: string | null;
  setCode?: string | null;
  number?: string | null;
  tcgplayerId?: string | null;
};

/**
 * Builds a public outbound TCGplayer reference for a card detail surface.
 * A known numeric product ID is exact; otherwise the identity is used as a
 * reviewable search query. No inventory or private account data is included.
 */
export function buildTcgplayerSearchHref(reference: TcgplayerCardReference) {
  const productId = reference.tcgplayerId?.trim() ?? "";
  if (/^[1-9]\d{0,11}$/.test(productId)) {
    return `https://www.tcgplayer.com/product/${productId}`;
  }

  const query = [reference.name, reference.setName, reference.setCode, reference.number]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0 && value !== "—")
    .join(" ");
  const params = new URLSearchParams({ q: query, view: "grid" });
  return `https://www.tcgplayer.com/search/all/product?${params.toString()}`;
}
