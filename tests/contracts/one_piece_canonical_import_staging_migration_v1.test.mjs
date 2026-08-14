import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DRAFT_PATH = path.join(
  ROOT,
  "supabase",
  "migration_drafts",
  "20260814010000_one_piece_canonical_import_staging_v1.sql",
);
const SQL = fs.readFileSync(DRAFT_PATH, "utf8");

test("One Piece staging SQL remains an unapplied transactional draft", () => {
  assert.equal(fs.existsSync(DRAFT_PATH), true);
  assert.equal(
    fs.existsSync(
      path.join(
        ROOT,
        "supabase",
        "migrations",
        "20260814010000_one_piece_canonical_import_staging_v1.sql",
      ),
    ),
    false,
  );
  assert.match(SQL, /^begin;/m);
  assert.match(SQL, /commit;\s*$/m);
});

test("One Piece staging draft is service-only and insert/read-only", () => {
  assert.match(SQL, /enable row level security/g);
  assert.match(
    SQL,
    /revoke all on table public\.one_piece_canonical_import_batches[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    SQL,
    /revoke all on table public\.one_piece_canonical_import_rows[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    SQL,
    /grant select, insert on table public\.one_piece_canonical_import_batches[\s\S]*to service_role/i,
  );
  assert.match(
    SQL,
    /grant select, insert on table public\.one_piece_canonical_import_rows[\s\S]*to service_role/i,
  );
  assert.doesNotMatch(SQL, /grant\s+(?:update|delete|all)/i);
  assert.doesNotMatch(SQL, /to\s+(?:anon|authenticated)\s*;/i);
});

test("One Piece staging rows preserve classification boundaries and immutability", () => {
  for (const term of [
    "exact_single_card_candidate",
    "numbered_card",
    "don_card",
    "sealed_product_candidate",
    "ambiguous_quarantine",
    "current_candidate",
    "future_or_presale_hold",
    "inactive_source_hold",
    "separate_sealed_catalog",
    "quarantine",
    "language_key",
  ]) {
    assert.match(SQL, new RegExp(term));
  }
  assert.match(SQL, /before update or delete on public\.one_piece_canonical_import_batches/i);
  assert.match(SQL, /before update or delete on public\.one_piece_canonical_import_rows/i);
  assert.match(SQL, /authorized_durable_batch_rows = 0/i);
  assert.match(SQL, /authorized_durable_staging_rows = 0/i);
});

test("One Piece staging draft exposes no canonical, publication, or destructive DML", () => {
  assert.doesNotMatch(SQL, /^\s*delete\s+from\b/im);
  assert.doesNotMatch(SQL, /^\s*update\s+\S+[\s\S]*?\bset\b/im);
  assert.doesNotMatch(SQL, /^\s*truncate\b/im);
  assert.doesNotMatch(
    SQL,
    /insert\s+into\s+public\.(games|sets|card_prints|card_printings|external_mappings|external_printing_mappings|market_price_publications|vault_items)/i,
  );
});
