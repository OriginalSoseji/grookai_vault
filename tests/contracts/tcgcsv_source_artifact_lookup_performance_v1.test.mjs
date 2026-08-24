import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const MIGRATION = fs.readFileSync(
  new URL(
    "../../supabase/migrations/20260824021500_tcgcsv_source_artifact_lookup_performance_v1.sql",
    import.meta.url,
  ),
  "utf8",
);

test("source artifact provenance lookup is indexed without blocking warehouse writes", () => {
  assert.match(MIGRATION, /create index concurrently if not exists/i);
  assert.match(
    MIGRATION,
    /tcgcsv_source_artifacts_sync_run_kind_latest_idx/,
  );
  assert.match(
    MIGRATION,
    /sync_run_id,\s*artifact_kind,\s*created_at desc,\s*id desc/i,
  );
  assert.match(MIGRATION, /include \(sha256\)/i);
  assert.doesNotMatch(MIGRATION, /\b(insert|update|delete|truncate)\b/i);
});
