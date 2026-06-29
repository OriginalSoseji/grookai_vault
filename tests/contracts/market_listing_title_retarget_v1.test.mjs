import test from "node:test";
import assert from "node:assert/strict";

import { resolveMarketListingTitleTargetV1 } from "../../backend/pricing/market_listing_title_retarget_v1.mjs";

const catalog = [
  {
    card_print_id: "wrong-pikachu-5",
    gv_id: "GV-PK-CC-5",
    name: "Pikachu",
    set_code: "ex5.5",
    set_name: "Poké Card Creator Pack",
    number: "5",
    number_plain: "5",
    printed_set_abbrev: "CC",
    printed_total: null,
    rarity: null,
  },
  {
    card_print_id: "asc-pikachu-276",
    gv_id: "GV-PK-ASC-276",
    name: "Pikachu ex",
    set_code: "me02.5",
    set_name: "Ascended Heroes",
    number: "276",
    number_plain: "276",
    printed_set_abbrev: "ASC",
    printed_total: 217,
    rarity: "Special illustration rare",
  },
  {
    card_print_id: "other-pikachu-276",
    gv_id: "GV-PK-OTHER-276",
    name: "Pikachu ex",
    set_code: "other",
    set_name: "Other Set",
    number: "276",
    number_plain: "276",
    printed_set_abbrev: "OTH",
    printed_total: 300,
    rarity: "Double rare",
  },
];

test("retargets broad Pikachu query target when title has exact Ascended Heroes number/total", () => {
  const result = resolveMarketListingTitleTargetV1({
    listingTitle: "Pokemon Pikachu ex 276/217 Ascended Heroes Beckett 9.5 Gem Mint BGS",
    originalTarget: {
      card_print_id: "wrong-pikachu-5",
      gv_id: "GV-PK-CC-5",
    },
    catalog,
  });

  assert.equal(result.status, "title_retargeted_exact_set_number");
  assert.equal(result.retargeted, true);
  assert.equal(result.target.card_print_id, "asc-pikachu-276");
  assert.equal(result.target.gv_id, "GV-PK-ASC-276");
});

test("keeps original target when title does not carry exact set/number evidence", () => {
  const result = resolveMarketListingTitleTargetV1({
    listingTitle: "Pokemon Pikachu rare card holo",
    originalTarget: {
      card_print_id: "wrong-pikachu-5",
      gv_id: "GV-PK-CC-5",
    },
    catalog,
  });

  assert.equal(result.status, "no_exact_title_target");
  assert.equal(result.retargeted, false);
  assert.equal(result.target.card_print_id, "wrong-pikachu-5");
});
