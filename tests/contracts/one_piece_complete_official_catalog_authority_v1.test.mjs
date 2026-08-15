import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnePieceOfficialNumberAuthorityV1,
  bindOnePieceNumberedCandidatesToOfficialAuthorityV1,
  normalizeOnePieceOfficialNameV1,
  parseOnePieceOfficialCardListHtmlV1,
  parseOnePieceOfficialSeriesOptionsV1,
} from "../../backend/pricing/one_piece_complete_official_catalog_authority_v1.mjs";

const html = `<!doctype html><html lang="en"><body>
<select>
  <option value="569101">BOOSTER PACK &lt;br&gt;-ROMANCE DAWN- [OP-01]</option>
  <option value="569115">BOOSTER PACK -ADVENTURE- [OP15-EB04]</option>
  <option value="569001">STARTER DECK -Straw Hat Crew- [ST-01]</option>
  <option value="569901">Promotion card</option>
</select>
<a class="modalOpen" data-src="#OP01-001"><img data-src="../images/cardlist/card/OP01-001.png?1" alt="Roronoa Zoro"></a>
<dl class="modalCol" id="OP01-001"><span>OP01-001</span> | <span>L</span> | <span>LEADER</span></dl>
<a class="modalOpen" data-src="#OP01-001_p1"><img data-src="../images/cardlist/card/OP01-001_p1.png?1" alt="Roronoa Zoro"></a>
<dl class="modalCol" id="OP01-001_p1"><span>OP01-001</span> | <span>L</span> | <span>LEADER</span></dl>
<a class="modalOpen" data-src="#OP01-001_r1"><img data-src="../images/cardlist/card/OP01-001_r1.png?1" alt="Roronoa Zoro"></a>
<dl class="modalCol" id="OP01-001_r1"><span>OP01-001</span> | <span>L</span> | <span>LEADER</span></dl>
</body></html>`;

test("official series parser normalizes single and combined code families", () => {
  const options = parseOnePieceOfficialSeriesOptionsV1(html);
  assert.deepEqual(options.find((row) => row.series_id === "569101").set_codes,
    ["OP01"]);
  assert.deepEqual(options.find((row) => row.series_id === "569115").set_codes,
    ["EB04", "OP15"]);
  assert.deepEqual(options.find((row) => row.series_id === "569001").set_codes,
    ["ST01"]);
  assert.deepEqual(options.find((row) => row.series_id === "569901").set_codes,
    ["P"]);
});

test("official card parser preserves base and alternate image evidence", () => {
  const records = parseOnePieceOfficialCardListHtmlV1({
    html,
    series: {
      series_id: "569101",
      label: "ROMANCE DAWN [OP-01]",
      set_codes: ["OP01"],
    },
    finalUrl: "https://en.onepiece-cardgame.com/cardlist/?series=569101",
  });
  assert.equal(records.length, 3);
  assert.equal(records[0].card_number, "OP01-001");
  assert.equal(records[0].official_name, "Roronoa Zoro");
  assert.equal(records[0].card_type, "leader");
  assert.equal(records[1].variant_suffix, "_p1");
  assert.equal(records[2].variant_suffix, "_r1");
});

test("number authority rejects conflicting official names", () => {
  const records = parseOnePieceOfficialCardListHtmlV1({
    html,
    series: {
      series_id: "569101", label: "ROMANCE DAWN", set_codes: ["OP01"],
    },
    finalUrl: "https://en.onepiece-cardgame.com/cardlist/?series=569101",
  });
  records[1].official_name = "Wrong Name";
  records[1].normalized_official_name = normalizeOnePieceOfficialNameV1(
    records[1].official_name);
  const result = buildOnePieceOfficialNumberAuthorityV1(records);
  assert.equal(result.authorities.length, 0);
  assert.equal(result.conflicts.length, 1);
});

test("product variants bind to the official number and base name", () => {
  const records = parseOnePieceOfficialCardListHtmlV1({
    html,
    series: {
      series_id: "569101", label: "ROMANCE DAWN", set_codes: ["OP01"],
    },
    finalUrl: "https://en.onepiece-cardgame.com/cardlist/?series=569101",
  });
  const authority = buildOnePieceOfficialNumberAuthorityV1(records);
  const binding = bindOnePieceNumberedCandidatesToOfficialAuthorityV1({
    numberedCandidates: [{
      source_product_id: 1,
      source_product_name: "Roronoa Zoro (Alternate Art)",
      card_number: "OP01-001",
      reconciliation_action: "propose_new_parent_after_official_authority",
    }],
    officialAuthorities: authority.authorities,
  });
  assert.equal(binding.summary.promotion_eligible_products, 1);
  assert.equal(binding.rows[0].official_authority_status,
    "exact_official_number_name_binding");
});

test("wrong source names never inherit authority from the card number alone", () => {
  const authority = [{
    card_number: "OP01-001",
    official_name: "Roronoa Zoro",
    normalized_official_name: "roronoa zoro",
  }];
  const binding = bindOnePieceNumberedCandidatesToOfficialAuthorityV1({
    numberedCandidates: [{
      source_product_id: 1,
      source_product_name: "Monkey.D.Luffy (Alternate Art)",
      card_number: "OP01-001",
      reconciliation_action: "propose_new_parent_after_official_authority",
    }],
    officialAuthorities: authority,
  });
  assert.equal(binding.summary.promotion_eligible_products, 0);
  assert.equal(binding.summary.source_name_mismatches, 1);
});

test("bounded orthographic differences require the exact card number authority", () => {
  const authority = [{
    card_number: "EB04-014",
    official_name: "Kozuki Sukiyaki",
    normalized_official_name: "kozuki sukiyaki",
  }];
  const binding = bindOnePieceNumberedCandidatesToOfficialAuthorityV1({
    numberedCandidates: [{
      source_product_id: 2,
      source_product_name: "Kouzuki Sukiyaki",
      card_number: "EB04-014",
      reconciliation_action: "propose_new_parent_after_official_authority",
    }],
    officialAuthorities: authority,
  });
  assert.equal(binding.summary.promotion_eligible_products, 1);
  assert.equal(binding.rows[0].source_name_support_kind,
    "bounded_orthographic_equivalence_with_exact_card_number");
  assert.equal(normalizeOnePieceOfficialNameV1("Bell-mère"), "bell mere");
});
