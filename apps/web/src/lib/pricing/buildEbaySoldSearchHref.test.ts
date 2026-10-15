import assert from "node:assert/strict";
import test from "node:test";
import { buildEbaySoldSearchHref } from "./buildEbaySoldSearchHref.ts";

test("builds a completed-listings search with exact-print context", () => {
  const url = new URL(
    buildEbaySoldSearchHref({
      cardName: "Charizard ex",
      setName: "151",
      collectorNumber: "199/165",
      finish: "Special Illustration Rare",
      variantLabels: ["Illustration Rare"],
    }),
  );

  assert.equal(url.host, "www.ebay.com");
  assert.equal(url.pathname, "/sch/i.html");
  assert.equal(url.searchParams.get("LH_Sold"), "1");
  assert.equal(url.searchParams.get("LH_Complete"), "1");
  assert.equal(
    url.searchParams.get("_nkw"),
    "Charizard ex 151 199/165 Illustration Rare Special Illustration Rare",
  );
});

test("keeps edition and stamp discriminators in the manual search", () => {
  const url = new URL(
    buildEbaySoldSearchHref({
      cardName: "Clefable",
      setName: "Jungle",
      collectorNumber: "1/64",
      finish: "Holo",
      variantLabels: ["1st Edition", "Holo"],
    }),
  );

  assert.equal(
    url.searchParams.get("_nkw"),
    "Clefable Jungle 1/64 1st Edition Holo",
  );
});

test("does not emit empty query tokens", () => {
  const url = new URL(
    buildEbaySoldSearchHref({ cardName: "  Pikachu  ", setName: null }),
  );
  assert.equal(url.searchParams.get("_nkw"), "Pikachu");
});
