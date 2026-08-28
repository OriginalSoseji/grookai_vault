import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildOnePieceIncrementalPromotionPlanV1,
  validateOnePieceIncrementalPromotionPlanV1,
} from "../../backend/catalog/one_piece_incremental_promotion_v1.mjs";

function warehouseProduct({ id, name, number, published = "2026-08-28" }) {
  return {
    product_id: id,
    category_id: 68,
    group_id: 24736,
    group_name: "The World's Strongest Warriors",
    name,
    published_on: published,
    presale_info: { isPresale: false, releasedOn: published },
    extended_data: [
      { name: "Number", value: number },
      { name: "CardType", value: "Character" },
      { name: "Rarity", value: "Common" },
    ],
    source_active: true,
    image_url: `https://example.com/${id}.jpg`,
  };
}

const officialRecords = [{
  official_variant_id: "OP17-001",
  card_number: "OP17-001",
  official_name: "Monkey.D.Luffy",
  normalized_official_name: "monkey d luffy",
  rarity: "Leader",
  card_type: "leader",
  image_url: "https://en.onepiece-cardgame.com/images/op17-001.png",
  series_id: "569117",
  series_label: "The World's Strongest Warriors [OP-17]",
}];

test("One Piece incremental promotion holds exact candidates before release", () => {
  const plan = buildOnePieceIncrementalPromotionPlanV1({
    asOf: "2026-08-26",
    setCode: "OP-17",
    setName: "The World's Strongest Warriors",
    releaseDate: "2026-08-28",
    officialSeriesId: "569117",
    warehouseProducts: [warehouseProduct({ id: 700001, name: "Monkey.D.Luffy", number: "OP17-001" })],
    officialRecords,
  });
  assert.equal(plan.status, "held_future_release");
  assert.equal(plan.source_counts.exact_number_name_bindings, 1);
  assert.equal(plan.counts.card_prints, 0);
  assert.equal(plan.payload.set, null);
  assert.equal(validateOnePieceIncrementalPromotionPlanV1(plan).valid, true);
});

test("released One Piece incremental promotion emits only exact number/name bindings", () => {
  const plan = buildOnePieceIncrementalPromotionPlanV1({
    asOf: "2026-08-28",
    setCode: "OP17",
    setName: "The World's Strongest Warriors",
    releaseDate: "2026-08-28",
    officialSeriesId: "569117",
    warehouseProducts: [
      warehouseProduct({ id: 700001, name: "Monkey.D.Luffy", number: "OP17-001" }),
      warehouseProduct({ id: 700002, name: "Wrong Name", number: "OP17-001" }),
    ],
    officialRecords,
  });
  assert.equal(plan.status, "release_eligible");
  assert.equal(plan.counts.sets, 1);
  assert.equal(plan.counts.set_release_controls, 1);
  assert.equal(plan.counts.card_prints, 1);
  assert.equal(plan.holds.length, 1);
  assert.equal(plan.payload.rows[0].card_print.image_url, null);
  assert.equal(plan.payload.rows[0].source_evidence.source_key, "tcgplayer_bandai_official");
  assert.equal(plan.payload.rows[0].card_print.data_quality_flags.app_visibility_v1, undefined);
  assert.equal(plan.payload.set_release_control.set_id, plan.payload.set.id);
  assert.equal(plan.payload.set_release_control.release_status, "hidden");
  assert.equal(plan.payload.set_release_control.activated_at, null);
  assert.equal(validateOnePieceIncrementalPromotionPlanV1(plan).valid, true);
});

test("SP products preserve their older printed-set ownership", () => {
  const spOfficial = [{
    ...officialRecords[0],
    official_variant_id: "EB04-007_SP",
    card_number: "EB04-007",
    official_name: "Roronoa Zoro",
    normalized_official_name: "roronoa zoro",
  }];
  const plan = buildOnePieceIncrementalPromotionPlanV1({
    asOf: "2026-08-28",
    setCode: "OP17",
    setName: "The World's Strongest Warriors",
    releaseDate: "2026-08-28",
    officialSeriesId: "569117",
    warehouseProducts: [warehouseProduct({
      id: 700003,
      name: "Roronoa Zoro (EB04-007) (SP)",
      number: "EB04-007",
    })],
    officialRecords: spOfficial,
    existingSetCodes: ["EB04"],
  });
  assert.equal(plan.source_counts.cross_set_parent_candidates, 1);
  assert.equal(plan.payload.rows[0].card_print.set_code, "EB04");
  assert.notEqual(plan.payload.rows[0].card_print.set_id, plan.payload.set.id);
  assert.equal(
    plan.payload.rows[0].card_print.data_quality_flags.app_visibility_v1.status,
    "suppressed",
  );
  assert.equal(
    plan.payload.rows[0].card_print.data_quality_flags.app_visibility_v1.release_set_code,
    "OP17",
  );
  assert.equal(plan.boundaries.staged_rows_suppressed, 1);
});

test("incremental rows for an already-live target set remain suppressed", () => {
  const plan = buildOnePieceIncrementalPromotionPlanV1({
    asOf: "2026-08-28",
    setCode: "OP17",
    setName: "The World's Strongest Warriors",
    releaseDate: "2026-08-28",
    officialSeriesId: "569117",
    warehouseProducts: [warehouseProduct({
      id: 700005,
      name: "Monkey.D.Luffy",
      number: "OP17-001",
    })],
    officialRecords,
    existingSetCodes: ["OP17"],
  });
  assert.equal(plan.payload.set, null);
  assert.equal(plan.payload.set_release_control, null);
  assert.equal(
    plan.payload.rows[0].card_print.data_quality_flags.app_visibility_v1.status,
    "suppressed",
  );
  assert.equal(plan.boundaries.public_visibility_changes, 0);
  assert.equal(validateOnePieceIncrementalPromotionPlanV1(plan).valid, true);
});

test("promo-number SP products remain owned by the P set", () => {
  const promoOfficial = [{
    ...officialRecords[0],
    official_variant_id: "P-107_SP",
    card_number: "P-107",
    official_name: "Gol.D.Roger",
    normalized_official_name: "gol d roger",
  }];
  const plan = buildOnePieceIncrementalPromotionPlanV1({
    asOf: "2026-08-28",
    setCode: "OP17",
    setName: "The World's Strongest Warriors",
    releaseDate: "2026-08-28",
    officialSeriesId: "569117",
    warehouseProducts: [warehouseProduct({
      id: 700004,
      name: "Gol.D.Roger (P-107) (SP)",
      number: "P-107",
    })],
    officialRecords: promoOfficial,
    existingSetCodes: ["P"],
  });
  assert.equal(plan.payload.rows[0].card_print.set_code, "P");
});

test("One Piece promotion worker is release-gated, insert-only, and self-hosting-safe", () => {
  const worker = fs.readFileSync(
    new URL("../../scripts/workers/one_piece_incremental_promotion_v1.mjs", import.meta.url),
    "utf8",
  );
  assert.match(worker, /begin transaction isolation level repeatable read read only/i);
  assert.match(worker, /Apply requires the exact clean frozen commit/);
  assert.match(worker, /post_rollback_readback/);
  assert.match(worker, /--request[\s\S]*?POST/);
  assert.match(worker, /--data-urlencode[\s\S]*?series=/);
  assert.match(worker, /insert into public\.catalog_set_release_controls/i);
  assert.doesNotMatch(worker, /cardlist\/\?series=/i);
  assert.doesNotMatch(worker, /--insecure|(?:^|["'])-k(?:["']|$)/i);
  assert.doesNotMatch(worker, /\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\b/i);
});
