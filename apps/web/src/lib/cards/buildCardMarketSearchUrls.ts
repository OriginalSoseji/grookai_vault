type CardMarketSearchIdentity = {
  name?: string | null;
  setName?: string | null;
  setCode?: string | null;
  number?: string | null;
};

function buildQuery(identity: CardMarketSearchIdentity) {
  return [identity.name, identity.setName, identity.setCode, identity.number]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0 && value !== "—")
    .join(" ");
}

export function buildCardMarketSearchUrls(identity: CardMarketSearchIdentity) {
  const query = buildQuery(identity);
  const tcgplayerParams = new URLSearchParams({ q: query, view: "grid" });
  const ebayParams = new URLSearchParams({
    _nkw: query,
    _sacat: "0",
    LH_Sold: "1",
    LH_Complete: "1",
    _sop: "13",
  });

  return {
    tcgplayer: `https://www.tcgplayer.com/search/all/product?${tcgplayerParams.toString()}`,
    ebay: `https://www.ebay.com/sch/i.html?${ebayParams.toString()}`,
  };
}
