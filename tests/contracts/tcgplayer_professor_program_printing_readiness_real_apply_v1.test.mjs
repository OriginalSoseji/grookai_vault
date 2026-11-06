import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sourcePath = path.join(process.cwd(), "scripts", "audits",
  "tcgplayer_professor_program_printing_readiness_real_apply_v1.mjs");
const evidencePath = path.join(process.cwd(), "docs", "audits",
  "tcgplayer_professor_program_printing_readiness_real_apply_20261105_v1.json");

test("Professor Program printing-readiness apply is locked to exact approval and production target", async () => {
  const source = await fs.readFile(sourcePath, "utf8");
  assert.match(source, /GROOKAI_APPROVED_PACKAGE_FINGERPRINT/);
  assert.match(source, /GROOKAI_APPROVED_SOURCE_COMMIT/);
  assert.match(source, /GROOKAI_PRODUCTION_APPROVAL/);
  assert.match(source, /git\("rev-parse", "HEAD"\)/);
  assert.match(source, /git\("status", "--porcelain"\)/);
  assert.match(source, /assertPrintingDatabaseTarget\(process\.env\.SUPABASE_DB_URL\)/);
  assert.match(source, /begin isolation level serializable/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /await client\.query\("commit"\)/);
  assert.match(source, /begin isolation level repeatable read read only/);
});

test("Professor Program printing-readiness apply has only the approved durable write shapes", async () => {
  const source = await fs.readFile(sourcePath, "utf8");
  assert.equal((source.match(/update public\.card_printings/g) ?? []).length, 1);
  assert.equal((source.match(/insert into public\.card_printing_truth_reviews/g) ?? []).length, 1);
  assert.doesNotMatch(source, /insert\s+into\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /update\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.market_price/i);
  assert.doesNotMatch(source, /update\s+public\.card_prints\b/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.card_print_identity/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\btruncate\b/i);
  assert.match(source, /assert\.equal\(updateCount, 3/);
  assert.match(source, /assert\.equal\(insertCount, 7/);
});

test("Professor Program printing-readiness production evidence proves exact committed readback", async () => {
  const report = JSON.parse(await fs.readFile(evidencePath, "utf8"));
  assert.equal(report.package_id, "TCGPLAYER-PROFESSOR-PROGRAM-PRINTING-READINESS-REPAIR-V1");
  assert.equal(report.package_fingerprint_sha256,
    "b9e2818bebd307b37649a3ee5a377e4832bb0bb8d6fb310b0849def5bced89f5");
  assert.equal(report.approved_source_commit, "2141c0ecc64f05e262821b0ef9c7fbed36006b9e");
  assert.equal(report.execution.status, "applied_and_verified");
  assert.equal(report.execution.committed, true);
  assert.equal(report.execution.exact_readback, true);
  assert.deepEqual(report.execution.counts, {
    targets: 7,
    printing_gv_id_updates: 3,
    truth_review_inserts: 7,
    mapping_writes: 0,
    pricing_writes: 0,
    publication_writes: 0,
    parent_writes: 0,
    identity_writes: 0,
    deletes: 0,
    merges: 0,
    migrations: 0,
  });
  assert.equal(report.execution.before_snapshot.hash_sha256,
    "7b59b57d5e38982fb9353b447980508a24b2ddddebcafbeef805a31d4b5188d0");
  assert.equal(report.execution.after_commit_snapshot.hash_sha256,
    report.execution.independent_readback_snapshot.hash_sha256);
  assert.equal(report.execution.after_commit_snapshot.reviews.length, 7);
  assert.equal(report.execution.readback_guard.active_mapping_count, 0);
  assert.equal(report.execution.readback_guard.active_publication_overlap_count, 0);
});
