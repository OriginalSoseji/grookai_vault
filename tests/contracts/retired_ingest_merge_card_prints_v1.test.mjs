import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SQL = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260731170000_retire_legacy_ingest_merge_card_prints_v1.sql",
  ),
  "utf8",
);

test("legacy merge function is retained only as a fail-closed compatibility stub", () => {
  assert.match(SQL, /create or replace function ingest\.merge_card_prints\(\)/i);
  assert.match(SQL, /errcode = '0A000'/i);
  assert.match(SQL, /is retired/i);
  assert.doesNotMatch(SQL, /insert\s+into\s+public\.card_prints/i);
  assert.doesNotMatch(SQL, /on\s+conflict/i);
});

test("legacy merge function is not executable by application roles", () => {
  assert.match(SQL, /revoke all on function ingest\.merge_card_prints\(\) from public/i);
  assert.match(SQL, /revoke all on function ingest\.merge_card_prints\(\) from anon/i);
  assert.match(SQL, /revoke all on function ingest\.merge_card_prints\(\) from authenticated/i);
});
