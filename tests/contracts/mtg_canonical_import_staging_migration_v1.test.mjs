import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SQL = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260813185000_mtg_canonical_import_staging_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("MTG staging migration is transactional and service-only", () => {
  assert.match(SQL, /^begin;/m);
  assert.match(SQL, /commit;\s*$/m);
  assert.match(SQL, /enable row level security/g);
  assert.match(SQL, /revoke all on table public\.mtg_canonical_import_batches[\s\S]*from public, anon, authenticated/i);
  assert.match(SQL, /revoke all on table public\.mtg_canonical_import_rows[\s\S]*from public, anon, authenticated/i);
  assert.match(SQL, /grant select, insert on table public\.mtg_canonical_import_batches[\s\S]*to service_role/i);
  assert.match(SQL, /grant select, insert on table public\.mtg_canonical_import_rows[\s\S]*to service_role/i);
});

test("MTG staging migration exposes no destructive or canonical mutation", () => {
  assert.doesNotMatch(SQL, /^\s*delete\s+from\b/im);
  assert.doesNotMatch(SQL, /^\s*update\s+\S+[\s\S]*?\bset\b/im);
  assert.doesNotMatch(SQL, /^\s*truncate\b/im);
  assert.doesNotMatch(SQL, /insert\s+into\s+public\.(games|sets|card_prints|card_printings|external_mappings|external_printing_mappings)/i);
  assert.doesNotMatch(SQL, /grant\s+.+\s+to\s+(anon|authenticated)/i);
});

test("staged rows preserve every canonical payload entity type", () => {
  for (const entity of [
    "sets",
    "card_prints",
    "card_print_identity",
    "card_printings",
    "external_mappings",
    "external_printing_mappings",
  ]) {
    assert.match(SQL, new RegExp(`'${entity}'`));
  }
});
