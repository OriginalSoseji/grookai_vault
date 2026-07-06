import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateMarketListingTitleGateV1 } from "../../backend/pricing/market_listing_title_gate_v1.mjs";

test("strict title evidence audit is read-only and checks high-risk lane title tokens", () => {
  const script = readFileSync(
    new URL("../../scripts/audits/market_listing_strict_title_evidence_audit_v1.mjs", import.meta.url),
    "utf8",
  );

  assert.match(script, /MARKET-LISTING-STRICT-TITLE-EVIDENCE-AUDIT-V1/);
  assert.match(script, /read_only_strict_title_evidence_audit_no_writes/);
  assert.match(script, /first_edition_lane_missing_title_token/);
  assert.match(script, /shadowless_lane_missing_title_token/);
  assert.match(script, /1999_2000_lane_missing_title_token/);
  assert.match(script, /base_lane_missing_exact_number/);
  assert.match(script, /app_visible_pricing:\s*false/);
  assert.match(script, /public_price_rollups:\s*false/);
  assert.doesNotMatch(script, /\binsert\s+into\b/i);
  assert.doesNotMatch(script, /\bupdate\s+public\./i);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(script, /\.insert\s*\(/);
  assert.doesNotMatch(script, /\.upsert\s*\(/);
  assert.doesNotMatch(script, /\.delete\s*\(/);
});

test("hardened market listing title gate blocks loose number-only GVID assignments", () => {
  const bw54Noise = evaluateMarketListingTitleGateV1({
    gv_id: "GV-PK-PR-BLW-BW54",
    listing_title: "Pokemon Topps Series 1 Card | Pikachu's Vacation Teamwork 54",
    strategy: "name_number",
    card: {
      gv_id: "GV-PK-PR-BLW-BW54",
      name: "Pikachu",
      set_name: "BW Black Star Promos",
      number: "BW54",
      number_plain: "54",
    },
  });
  assert.equal(bw54Noise.passes, false);
  assert.ok(bw54Noise.reasons.includes("bw_promo_lane_missing_promo_token"));
  assert.ok(bw54Noise.reasons.includes("wrong_set_phrase:topps"));

  const bw54Exact = evaluateMarketListingTitleGateV1({
    gv_id: "GV-PK-PR-BLW-BW54",
    listing_title: "Pokemon TCG Pikachu Black & White Holo Promo BW54 60 HP Basic Eng",
    strategy: "strict_identity",
    card: {
      gv_id: "GV-PK-PR-BLW-BW54",
      name: "Pikachu",
      set_name: "BW Black Star Promos",
      number: "BW54",
      number_plain: "54",
    },
  });
  assert.equal(bw54Exact.passes, true);
});

test("hardened market listing title gate requires special-lane evidence tokens", () => {
  const trainerKitWrongNumber = evaluateMarketListingTitleGateV1({
    gv_id: "GV-PK-TK-tk-sm-l-30",
    listing_title: "SM Trainer Kit: Lycanroc & Alolan Raichu #11/30 Fletchling Pokemon",
    strategy: "special_lane",
    card: {
      gv_id: "GV-PK-TK-tk-sm-l-30",
      name: "Lycanroc",
      set_name: "SM Trainer Kit (Lycanroc)",
      number: "30",
      number_plain: "30",
    },
  });
  assert.equal(trainerKitWrongNumber.passes, false);
  assert.ok(trainerKitWrongNumber.reasons.includes("trainer_kit_lane_missing_exact_number"));

  const worldChampOrdinarySource = evaluateMarketListingTitleGateV1({
    gv_id: "GV-PK-WCD-2023-MEWS_REVENGE-03-FUSION-185-GENESECT_V",
    listing_title: "Genesect V Holo Ultra Rare Pokemon Fusion Strike Card 185/264",
    strategy: "name_number",
    card: {
      gv_id: "GV-PK-WCD-2023-MEWS_REVENGE-03-FUSION-185-GENESECT_V",
      name: "Genesect V",
      set_name: "World Championship Decks 2023",
      number: "185",
      number_plain: "185",
    },
  });
  assert.equal(worldChampOrdinarySource.passes, false);
  assert.ok(worldChampOrdinarySource.reasons.includes("world_championship_lane_missing_title_token"));
});

test("hardened market listing title gate blocks ordinary wrong-set matches", () => {
  const wrongSet = evaluateMarketListingTitleGateV1({
    gv_id: "GV-PK-DS-2",
    listing_title: "Crobat 66/214 Pokemon Holo Unbroken Bonds Rare Near Mint Card NM 2",
    strategy: "name_number",
    card: {
      gv_id: "GV-PK-DS-2",
      name: "Crobat",
      set_name: "EX Delta Species",
      number: "2",
      number_plain: "2",
    },
  });
  assert.equal(wrongSet.passes, false);
  assert.ok(wrongSet.reasons.includes("name_number_lane_missing_set_context"));
  assert.ok(wrongSet.reasons.includes("wrong_set_phrase:unbroken_bonds"));
});
