import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL("../../supabase/migrations/20260828180000_one_piece_verified_external_image_source_v1.sql", import.meta.url),
  "utf8",
);
const workflow = fs.readFileSync(
  new URL("../../.github/workflows/one-piece-verified-external-image-source.yml", import.meta.url),
  "utf8",
);

test("verified external image migration preserves authorities and adds one source", () => {
  for (const source of [
    "tcgdex",
    "ptcg",
    "pokemonapi",
    "identity",
    "user_photo",
    "scryfall",
    "self_hosted_tcgplayer_exact_product_v1",
    "self_hosted_bandai_official_exact_base_art_v1",
    "self_hosted_verified_external_exact_product_v1",
  ]) {
    assert.match(migration, new RegExp(`'${source}'::text`));
  }
  assert.match(migration, /add constraint card_prints_image_source_check/);
  assert.match(migration, /not valid;[\s\S]*validate constraint card_prints_image_source_check/);
  assert.doesNotMatch(migration, /delete from|truncate|drop table/i);
});

test("workflow freezes one migration and proves the new label with rollback", () => {
  assert.match(workflow, /TARGET_MIGRATION: '20260828180000'/);
  assert.match(workflow, /pending_count[\s\S]*test "\$pending_count" = "1"/);
  assert.match(workflow,
    /begin;[\s\S]*self_hosted_verified_external_exact_product_v1[\s\S]*rollback;/i);
  assert.match(workflow, /test "\$before" = "\$after"/);
});
