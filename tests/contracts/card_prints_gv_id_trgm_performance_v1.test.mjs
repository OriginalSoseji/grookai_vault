import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const MIGRATION = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260826070000_card_prints_gv_id_trgm_performance_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("case-insensitive Grookai ID lookups use a concurrent trigram index", () => {
  assert.match(MIGRATION, /create index concurrently if not exists/i);
  assert.match(MIGRATION, /card_prints_gv_id_trgm_idx/i);
  assert.match(MIGRATION, /using gin \(gv_id gin_trgm_ops\)/i);
  assert.match(MIGRATION, /where gv_id is not null/i);
  assert.doesNotMatch(MIGRATION, /\b(insert|update|delete|truncate)\b/i);
});
