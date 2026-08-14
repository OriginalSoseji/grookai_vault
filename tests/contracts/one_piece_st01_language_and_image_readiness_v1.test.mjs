import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  ST01_OFFICIAL_CARDS,
  evaluateSt01OfficialAuthority,
  inspectOnePieceImage,
  parseOfficialSt01CardImageSources,
  parseTcgplayerImageReference,
  proposedImageTarget,
  validateReadinessRows,
} from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";

function officialFixture() {
  const cards = ST01_OFFICIAL_CARDS.map(([number, name]) =>
    `${number} | C | CHARACTER ${name} -Straw Hat Crew-[ST-01]`).join(" ");
  return {
    productResponse: {
      final_url: "https://en.onepiece-cardgame.com/products/decks/st01-04.php",
      http_status: 200,
      http_ok: true,
      body: "<html lang=\"en\"><body>STARTER DECK -Straw Hat Crew- [ST-01] " +
        "December 2, 2022 USD $11.99 Constructed Deck x 1 (51 cards) " +
        "DON!! Cards x 10 Contains some identical cards from 17 types</body></html>",
    },
    cardListResponse: {
      final_url: "https://en.onepiece-cardgame.com/cardlist/?series=569001",
      http_status: 200,
      http_ok: true,
      body: `<html lang="en"><body>17 results ${cards}</body></html>`,
    },
  };
}

test("official authority is scoped to ST-01 and never category 68 broadly", () => {
  const stagedRows = ST01_OFFICIAL_CARDS.map(([card_number, source_product_name], index) => ({
    row_ordinal: index,
    staging_row_id: `row-${index}`,
    source_product_id: 300000 + index,
    source_product_name,
    review_lane: "numbered_card_parent_identity_review",
    card_number,
  }));
  stagedRows.push({
    row_ordinal: 17,
    staging_row_id: "sealed-deck",
    source_product_id: 288221,
    source_product_name: "Starter Deck 1: Straw Hat Crew",
    review_lane: "sealed_product_identity_review",
  });
  const authority = evaluateSt01OfficialAuthority({ ...officialFixture(), stagedRows });
  assert.equal(authority.summary.exact_language_authority_rows, 18);
  assert.equal(authority.summary.blanket_category_authority_granted, false);
  assert.ok(authority.rows.every((row) =>
    row.authority_scope === "tcgplayer_group_3189_st01_only"));
});

test("TCGPlayer source binding derives only the same product high-resolution URL", () => {
  const parsed = parseTcgplayerImageReference(
    "https://tcgplayer-cdn.tcgplayer.com/product/288228_200w.jpg",
    288228,
  );
  assert.equal(parsed.high_resolution_candidate_url,
    "https://tcgplayer-cdn.tcgplayer.com/product/288228_in_1000x1000.jpg");
  assert.throws(() => parseTcgplayerImageReference(
    "https://tcgplayer-cdn.tcgplayer.com/product/999_200w.jpg",
    288228,
  ));
});

test("official card images bind all 17 card numbers to their exact names", () => {
  const html = ST01_OFFICIAL_CARDS.map(([number, name]) =>
    `<a data-src="#${number}"><img data-src="../images/cardlist/card/${number}.png?1" alt="${name}"></a>`).join("\n");
  const sources = parseOfficialSt01CardImageSources(
    html,
    "https://en.onepiece-cardgame.com/cardlist/?series=569001",
  );
  assert.equal(sources.size, 17);
  assert.equal(sources.get("ST01-005").official_name, "Jinbe");
  assert.equal(sources.get("ST01-005").url,
    "https://en.onepiece-cardgame.com/images/cardlist/card/ST01-005.png?1");
});

test("image inspection verifies JPEG bytes and reports preferred resolution", () => {
  const jpeg = Buffer.alloc(6_000, 0);
  jpeg[0] = 0xff;
  jpeg[1] = 0xd8;
  jpeg[2] = 0xff;
  jpeg[3] = 0xc0;
  jpeg.writeUInt16BE(17, 4);
  jpeg.writeUInt16BE(1000, 7);
  jpeg.writeUInt16BE(715, 9);
  const observed = inspectOnePieceImage(jpeg, "image/jpeg");
  assert.equal(observed.valid_image, true);
  assert.equal(observed.width, 715);
  assert.equal(observed.height, 1000);
  assert.equal(observed.preferred_self_hosted_resolution, true);
});

test("image inspection accepts official PNG dimensions", () => {
  const png = Buffer.alloc(6_000, 0);
  Buffer.from("89504e470d0a1a0a", "hex").copy(png, 0);
  png.writeUInt32BE(600, 16);
  png.writeUInt32BE(840, 20);
  const observed = inspectOnePieceImage(png, "image/png");
  assert.equal(observed.valid_image, true);
  assert.equal(observed.format, "png");
  assert.equal(observed.preferred_self_hosted_resolution, true);
});

test("sealed rows never receive an invented card-print storage path", () => {
  const target = proposedImageTarget({
    source_product_id: 288221,
    review_lane: "sealed_product_identity_review",
  }, { sha256: "a".repeat(64), format: "jpg" });
  assert.deepEqual(target, {
    target_storage_path: null,
    target_path_status: "pending_sealed_image_contract",
  });
});

test("readiness validator rejects duplicate targets and write-boundary drift", () => {
  const base = (id) => ({
    source_product_id: id,
    review_lane: "numbered_card_parent_identity_review",
    image: {
      selected_source: { accepted: true, sha256: "a".repeat(64) },
      target_storage_path: "same/path.jpg",
      target_path_status: "proposed_content_addressed_card_path",
      storage_write_performed: false,
      pointer_write_performed: false,
    },
    database_write_performed: false,
  });
  const findings = validateReadinessRows([base(1), base(2)]);
  assert.ok(findings.includes("row_count_not_21"));
  assert.ok(findings.includes("duplicate_target_storage_path"));
  assert.ok(findings.includes("duplicate_selected_image_sha256"));
});

test("audit runner requires card-like aspect ratio for card and DON lanes", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_language_and_image_readiness_v1.mjs",
    "utf8",
  );
  assert.match(source, /requiresCardAspect/);
  assert.match(source, /aspectRatio >= 0\.55 && aspectRatio <= 0\.85/);
  assert.match(source, /non_card_aspect_ratio_for_card_or_don_lane/);
});

test("audit runner has no Supabase, database, or Storage client", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_language_and_image_readiness_v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /@supabase|createClient|\bpg\b|DATABASE_URL|SUPABASE_DB_URL/);
  assert.doesNotMatch(source, /\.storage\.from|\.upload\(|\.insert\(|\.update\(|\.delete\(/);
  assert.match(source, /storage_writes: 0/);
  assert.match(source, /pointer_updates: 0/);
  assert.match(source, /canonical_mutations: 0/);
});
