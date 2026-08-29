import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseMtgPackageProduct,
  chooseMtgSourceGroup,
  isMtgDeckRelease,
  scoreMtgPackageProduct,
} from "../../backend/catalog/mtg_deck_package_cover_policy_v1.mjs";

test("authoritative MTG deck set types are eligible", () => {
  assert.equal(isMtgDeckRelease({ name: "Commander 2015", set_type: "commander" }), true);
  assert.equal(isMtgDeckRelease({ name: "Tempest", set_type: "expansion" }), false);
  assert.equal(isMtgDeckRelease({ name: "Welcome Deck 2017", set_type: "starter" }), true);
});

test("code and name evidence select an exact source group", () => {
  const result = chooseMtgSourceGroup(
    { code: "c15", name: "Commander 2015", set_type: "commander" },
    [
      { group_id: 1, name: "Commander 2015 Tokens", abbreviation: "TC15" },
      { group_id: 2, name: "Commander 2015", abbreviation: "C15" },
    ],
  );
  assert.equal(result?.group.group_id, 2);
  assert.equal(result?.match_reason, "exact_code_and_name");
});

test("ambiguous exact abbreviations abstain", () => {
  const result = chooseMtgSourceGroup(
    { code: "who", name: "Doctor Who", set_type: "commander" },
    [
      { group_id: 1, name: "Doctor Who Alpha", abbreviation: "WHO" },
      { group_id: 2, name: "Doctor Who Beta", abbreviation: "WHO" },
    ],
  );
  assert.equal(result, null);
});

test("planechase group cannot satisfy a commander set", () => {
  const result = chooseMtgSourceGroup(
    { code: "who", name: "Doctor Who", set_type: "commander" },
    [
      { group_id: 1, name: "Planechase: Universes Beyond: Doctor Who", abbreviation: "WHO" },
      { group_id: 2, name: "Universes Beyond: Doctor Who", abbreviation: "WHO" },
    ],
  );
  assert.equal(result?.group.group_id, 2);
});

test("standalone Duel Deck evidence cannot satisfy an anthology printing", () => {
  const result = chooseMtgSourceGroup(
    {
      code: "evg",
      name: "Duel Decks Anthology: Elves vs. Goblins",
      set_type: "duel_deck",
    },
    [
      {
        group_id: 1,
        name: "Duel Decks: Elves vs. Goblins",
        abbreviation: "EVG",
      },
    ],
  );
  assert.equal(result, null);
});

test("package scoring rejects cards that merely contain Commander", () => {
  const group = { name: "Duel Decks: Elves vs. Goblins" };
  assert.equal(
    scoreMtgPackageProduct(
      { name: "Ambush Commander", image_url: "https://example.invalid/card.jpg" },
      group,
    ),
    -1,
  );
  assert.ok(
    scoreMtgPackageProduct(
      {
        name: "Duel Decks: Elves vs. Goblins - Box Set",
        image_url: "https://example.invalid/package.jpg",
      },
      group,
    ) > 0,
  );
});

test("overview package outranks an individual deck when both exist", () => {
  const group = { name: "Commander 2015" };
  const result = chooseMtgPackageProduct(
    [
      {
        product_id: 2,
        name: "Commander 2015 - Plunder the Graves Commander Deck",
        image_url: "https://example.invalid/deck.jpg",
      },
      {
        product_id: 1,
        name: "Commander 2015 - Set of 5",
        image_url: "https://example.invalid/set.jpg",
      },
    ],
    group,
  );
  assert.equal(result?.product.product_id, 1);
});
