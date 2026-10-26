import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildStorageBreakdownV1, renderStorageBreakdownMarkdownV1 } from "../../scripts/audits/supabase_production_storage_breakdown_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(ROOT, "scripts/audits/supabase_production_storage_breakdown_v1.mjs"), "utf8");

test("storage breakdown reports largest relations without changing input", () => {
  const input = {
    databaseBytes: "1000",
    relations: [{ schema_name: "public", relation_name: "prices", relation_kind: "r", total_bytes: "700", table_bytes: "500", index_bytes: "200" }],
    tableStats: [{ schema_name: "public", relation_name: "prices", estimated_live_rows: "10", estimated_dead_rows: "2", last_autovacuum: null, last_autoanalyze: null }],
  };
  const before = JSON.stringify(input);
  const report = buildStorageBreakdownV1(input, "2026-10-26T00:00:00.000Z");
  assert.equal(report.read_only, true);
  assert.equal(report.database_bytes, 1000);
  assert.equal(report.top_relations[0].estimated_dead_rows, 2);
  assert.equal(JSON.stringify(input), before);
  assert.match(renderStorageBreakdownMarkdownV1(report), /public\.prices/);
});

test("storage audit opens a read-only transaction and contains no mutation statements", () => {
  assert.match(source, /begin read only/);
  assert.match(source, /pg_database_size/);
  assert.match(source, /pg_total_relation_size/);
  assert.doesNotMatch(source, /\b(insert|update|delete|truncate|alter|drop|create)\s+(into|table|index|schema|database|view)\b/i);
});