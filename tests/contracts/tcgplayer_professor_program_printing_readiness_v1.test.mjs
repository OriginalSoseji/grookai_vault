import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const auditPath = path.join(root, "docs", "audits",
  "tcgplayer_professor_program_mapping_readiness_20261105_v1.json");
const rehearsalPath = path.join(root, "docs", "audits",
  "tcgplayer_professor_program_printing_readiness_guarded_dry_run_20261105_v1.json");
const rehearsalScriptPath = path.join(root, "scripts", "audits",
  "tcgplayer_professor_program_printing_readiness_guarded_dry_run_v1.mjs");

test("Professor Program mapping readiness freezes seven exact targets and holds Sycamore", async () => {
  const report = JSON.parse(await fs.readFile(auditPath, "utf8"));
  assert.equal(report.version, "TCGPLAYER_PROFESSOR_PROGRAM_MAPPING_READINESS_V1");
  assert.equal(report.database_transaction, "repeatable_read_read_only");
  assert.equal(report.database_writes, 0);
  assert.equal(report.mapping_writes, 0);
  assert.equal(report.pricing_writes, 0);
  assert.equal(report.publication_writes, 0);
  assert.deepEqual(report.rows.map((row) => Number(row.source_product_id)),
    [176629, 176630, 176631, 176632, 176633, 213516, 499366]);
  assert.equal(report.held_row.source_product_id, 176638);
  assert.equal(report.held_row.status, "held_finish_conflict_confirmed");
  assert.equal(report.counts.active_mapping_collisions, 0);
  assert.equal(report.counts.active_publication_overlap, 0);
});

test("Professor Program printing-readiness rehearsal proves exact rollback-only repair", async () => {
  const report = JSON.parse(await fs.readFile(rehearsalPath, "utf8"));
  assert.equal(report.package_id, "TCGPLAYER-PROFESSOR-PROGRAM-PRINTING-READINESS-REPAIR-V1");
  assert.equal(report.rollback_only, true);
  assert.equal(report.execution_authorized, false);
  assert.equal(report.counts.targets, 7);
  assert.equal(report.counts.printing_gv_id_updates, 3);
  assert.equal(report.counts.truth_review_inserts, 7);
  assert.equal(report.counts.mapping_writes, 0);
  assert.equal(report.counts.pricing_writes, 0);
  assert.equal(report.counts.publication_writes, 0);
  assert.equal(report.proof.transient_change_verified, true);
  assert.equal(report.proof.rollback_verified, true);
  assert.equal(report.proof.before_snapshot.hash_sha256, report.proof.after_snapshot.hash_sha256);
  assert.match(report.approval_text, new RegExp(report.package_fingerprint_sha256));
  assert.match(report.approval_text, /No mapping writes\. No pricing writes\. No publication writes\./);
});

test("Professor Program printing-readiness rehearsal has no durable commit or out-of-scope writes", async () => {
  const source = await fs.readFile(rehearsalScriptPath, "utf8");
  assert.match(source, /begin isolation level serializable/);
  assert.match(source, /await client\.query\("rollback"\)/);
  assert.doesNotMatch(source, /await client\.query\(["']commit["']\)/);
  assert.doesNotMatch(source, /insert\s+into\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /update\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.market_price/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\btruncate\b/i);
});
