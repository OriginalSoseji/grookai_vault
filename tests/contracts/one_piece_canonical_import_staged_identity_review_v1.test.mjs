import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

test("staged identity review is offline and keeps promotion closed", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_canonical_import_staged_identity_review_v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /\b(?:pg|postgres|supabaseClient|fetch)\b/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL/);
  assert.match(source, /promotion_ready_rows: 0/);
  assert.match(source, /canonical_write_authorized: false/);
  assert.match(source, /sealed_write_authorized: false/);
  assert.match(source, /publishable: false/);
});

test("review defines separate numbered, DON, sealed, language, and image gates", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_canonical_import_staged_identity_review_v1.mjs",
    "utf8",
  );
  for (const marker of ["numbered_card_parent_identity_review",
    "don_card_variant_identity_review", "sealed_product_identity_review",
    "language_authority_unverified", "image_not_self_hosted_and_hashed",
    "multi_product_bundle_requires_separate_contract"]) {
    assert.ok(source.includes(marker), marker);
  }
});
