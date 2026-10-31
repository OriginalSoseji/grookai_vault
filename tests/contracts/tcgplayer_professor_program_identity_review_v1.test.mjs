import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeProfessorProgramNameV1,
  reviewProfessorProgramProductV1,
} from "../../scripts/audits/tcgplayer_professor_program_identity_review_v1.mjs";

const source = Object.freeze({
  source_product_id: 176629,
  source_product_name: "Prof. Oak's Research (2004-2005)",
  source_group_id: 2332,
  source_group_name: "Professor Program Promos",
  printed_number: "98/112",
  source_subtypes: ["Normal"],
});
const card = Object.freeze({
  set_key: "ex6",
  set_name: "FireRed & LeafGreen",
  card_number: "98",
  card_name: "Prof. Oak's Research",
  status: "master_verified",
  sources: ["tcgdex"],
  evidence_urls: ["https://api.tcgdex.net/v2/en/cards/ex6-98"],
});
const printings = Object.freeze([
  Object.freeze({ ...card, finish_key: "normal" }),
  Object.freeze({ ...card, finish_key: "stamped", sources: ["pricecharting_csv_product"],
    evidence_urls: ["https://www.pricecharting.com/game/pokemon-firered-and-leafgreen/prof-oaks-research-professor-program-98"] }),
]);
const setsByKey = new Map([["ex6", {
  key: "ex6",
  source_totals: { tcgdex: { official: 112, total: 116 } },
}]]);

test("normalization preserves professor identity while removing coordinate and year display text", () => {
  assert.equal(normalizeProfessorProgramNameV1("Professor Juniper - 98/108 (2013)"),
    "professor juniper");
  assert.equal(normalizeProfessorProgramNameV1("Prof. Oak's Research (2004-2005)"),
    "professor oak s research");
  assert.equal(normalizeProfessorProgramNameV1("Professor's Research [Professor Juniper] - 060/072"),
    "professor s research professor juniper");
});

test("an ordinary live parent never authorizes a Professor Program mapping", () => {
  const reviewed = reviewProfessorProgramProductV1({ source, cards: [card], printings, setsByKey,
    grookaiRows: [{ set_key: "ex6", card_number: "98", index_card_name: "Prof. Oak's Research",
      finish_key: "normal", grookai_card_print_id: "base-parent", grookai_printing_id: "base-child" }] });
  assert.equal(reviewed.disposition, "hold");
  assert.equal(reviewed.reason, "live_professor_program_parent_link_not_proven");
  assert.equal(reviewed.match_counts.live_parent_targets, 0);
});

test("only an explicit distinct Professor Program parent and child can become an authority candidate", () => {
  const reviewed = reviewProfessorProgramProductV1({ source, cards: [card], printings, setsByKey,
    grookaiRows: [{ set_key: "ex6", card_number: "98", index_card_name: "Prof. Oak's Research",
      finish_key: "normal", variant_key: "professor_program_stamp",
      printed_identity_modifier: "professor_program_stamp",
      grookai_card_print_id: "program-parent", grookai_printing_id: "program-child" }] });
  assert.equal(reviewed.disposition, "authority_candidate");
  assert.equal(reviewed.reason, "exact_set_identity_stamp_finish_and_live_parent_proven");
  assert.equal(reviewed.match_counts.live_parent_targets, 1);
});

test("event placement labels remain identity-bearing holds", () => {
  const reviewed = reviewProfessorProgramProductV1({
    source: { ...source, source_product_id: 717548,
      source_product_name: "Rosa's Encouragement - 084/088 [Top 8]",
      printed_number: "084/088", source_subtypes: ["Reverse Holofoil"] },
    cards: [{ ...card, set_key: "me03", set_name: "Phantasmal Flames", card_number: "84",
      card_name: "Rosa's Encouragement" }],
    printings: [],
    setsByKey: new Map([["me03", { key: "me03", source_totals: { tcgdex: { official: 88 } } }]]),
    grookaiRows: [],
  });
  assert.equal(reviewed.identity_qualifier, "top_8");
  assert.equal(reviewed.reason, "identity_bearing_event_qualifier_requires_distinct_parent");
});
