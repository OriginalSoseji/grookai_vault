import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SCRIPT = fs.readFileSync(
  new URL(
    "../../scripts/audits/production_supabase_launch_audit_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("Supabase launch audit is read-only and bounded", () => {
  assert.match(SCRIPT, /begin read only/i);
  assert.match(SCRIPT, /set local statement_timeout = '30s'/i);
  assert.match(SCRIPT, /set local lock_timeout = '5s'/i);
  assert.match(SCRIPT, /for \(const \[name, sql\] of queries\)/);
  assert.doesNotMatch(SCRIPT, /Promise\.all\(\[\s*section\(client/);
  assert.doesNotMatch(SCRIPT, /client\.query\(\s*`?\s*(insert|update|delete|truncate|alter|create|drop)\b/i);
  assert.match(SCRIPT, /database_writes: false/);
  assert.match(SCRIPT, /storage_writes: false/);
  assert.match(SCRIPT, /authority_changes: false/);
});

test("Supabase launch audit measures launch-critical database boundaries", () => {
  for (const required of [
    "pg_database_size",
    "max_connections",
    "cache_hit_ratio",
    "waiting_lock_count",
    "long_query_count",
    "invalid_index_count",
    "exposed_without_rls_count",
    "unsafe_definer_count",
    "storage_object_count",
    "largest_relations",
    "table_health",
    "migration_head",
  ]) {
    assert.match(SCRIPT, new RegExp(required));
  }
});

test("managed capacity and backup gates fail closed when control-plane data is absent", () => {
  assert.match(SCRIPT, /SUPABASE_DATABASE_CAPACITY_BYTES/);
  assert.match(SCRIPT, /SUPABASE_STORAGE_CAPACITY_BYTES/);
  assert.match(SCRIPT, /database_capacity_limit_unmeasured/);
  assert.match(SCRIPT, /storage_capacity_limit_unmeasured/);
  assert.match(SCRIPT, /managed_backup_restore_unmeasured/);
  assert.match(SCRIPT, /Backup\/PITR state inferred from SQL: no/);
});
