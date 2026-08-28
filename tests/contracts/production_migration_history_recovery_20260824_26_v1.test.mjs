import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const AUDIT = path.join(
  ROOT,
  "docs",
  "audits",
  "catalog_discovery",
  "production_migration_history_recovery_20260824_26_v1",
);
const MANIFEST = JSON.parse(fs.readFileSync(
  path.join(AUDIT, "production_ledger_manifest.json"),
  "utf8",
));
const READBACK = JSON.parse(fs.readFileSync(
  path.join(AUDIT, "production_schema_readback.json"),
  "utf8",
));
const ARTIFACT_HASHES = JSON.parse(fs.readFileSync(
  path.join(AUDIT, "artifact_hashes.json"),
  "utf8",
));

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const EXPECTED = [
  ["20260824021500", "tcgcsv_source_artifact_lookup_performance_v1"],
  ["20260824033000", "tcgplayer_market_snapshot_paging_v1"],
  ["20260824043000", "operations_notification_severity_v2"],
  ["20260824170000", "print_identity_search_candidate_first_v1"],
  ["20260824173000", "catalog_parent_visibility_direct_v1"],
  ["20260824174500", "print_identity_search_bounded_candidates_v1"],
  ["20260826053000", "retire_mee_public_pricing_compatibility_v1"],
  ["20260826070000", "card_prints_gv_id_trgm_performance_v1"],
];

test("recovery contains exactly the eight production ledger rows", () => {
  assert.equal(MANIFEST.version, "PRODUCTION_MIGRATION_HISTORY_RECOVERY_20260824_26_V1");
  assert.equal(
    MANIFEST.recovery_base_commit,
    "515d98fb59a467429b3f2fda3f0426e94d36b863",
  );
  assert.equal(READBACK.recovery_base_commit, MANIFEST.recovery_base_commit);
  assert.match(MANIFEST.artifact_recorded_at, /^2026-08-28T/);
  assert.match(READBACK.artifact_recorded_at, /^2026-08-28T/);
  assert.equal(MANIFEST.database_writes, false);
  assert.equal(MANIFEST.latest_observed_version, "20260826070000");
  assert.deepEqual(
    MANIFEST.rows.map((row) => [row.version, row.name]),
    EXPECTED,
  );
  assert.deepEqual(
    READBACK.ledger_rows.map((row) => [row.version, row.name]),
    EXPECTED,
  );
  assert.equal(READBACK.transaction_read_only, true);
  assert.equal(READBACK.database_writes, false);
});

test("every recovered migration reconciles by path, bytes, and SHA-256", () => {
  for (const row of MANIFEST.rows) {
    const file = path.join(ROOT, ...row.recovered_path.split("/"));
    const body = fs.readFileSync(file);
    assert.equal(body.length, row.recovered_file_bytes, row.version);
    assert.equal(sha256(body), row.recovered_file_sha256, row.version);
    assert.equal(row.ledger_statement_sha256.length, row.ledger_statement_count);
    assert.equal(row.ledger_statement_trimmed_sha256.length, row.ledger_statement_count);
    assert.doesNotMatch(body.toString("utf8"), /(?:postgres(?:ql)?:\/\/|SUPABASE_DB_URL)/i);
  }
});

test("permanent production evidence reconciles to its audit hashes", () => {
  assert.equal(ARTIFACT_HASHES.algorithm, "sha256");
  assert.equal(ARTIFACT_HASHES.version, MANIFEST.version);
  assert.deepEqual(
    ARTIFACT_HASHES.artifacts.map((artifact) => artifact.path).sort(),
    ["production_ledger_manifest.json", "production_schema_readback.json"],
  );

  for (const artifact of ARTIFACT_HASHES.artifacts) {
    const body = fs.readFileSync(path.join(AUDIT, artifact.path));
    assert.equal(sha256(body), artifact.sha256, artifact.path);
  }
});

test("single-statement files preserve their exact ledger statement", () => {
  for (const row of MANIFEST.rows.filter((entry) => entry.ledger_statement_count === 1)) {
    const body = fs.readFileSync(
      path.join(ROOT, ...row.recovered_path.split("/")),
      "utf8",
    ).trim();
    assert.equal(sha256(body), row.ledger_statement_trimmed_sha256[0], row.version);
  }
});

test("normalized provenance-index comment matches live production", () => {
  const row = MANIFEST.rows.find((entry) => entry.version === "20260824021500");
  assert.match(row.normalization, /live valid SQL string literal/);
  const body = fs.readFileSync(path.join(ROOT, ...row.recovered_path.split("/")), "utf8");
  const live = READBACK.indexes.find((entry) =>
    entry.name === "tcgcsv_source_artifacts_sync_run_kind_latest_idx");
  assert.match(body, /create index concurrently if not exists/);
  assert.match(body, new RegExp(live.comment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(live.valid, true);
  assert.equal(live.ready, true);
});

test("concurrent index history remains replay-safe and transaction-free", () => {
  for (const version of ["20260824021500", "20260824033000", "20260826070000"]) {
    const row = MANIFEST.rows.find((entry) => entry.version === version);
    const body = fs.readFileSync(path.join(ROOT, ...row.recovered_path.split("/")), "utf8");
    assert.match(body, /create index concurrently if not exists/i);
    assert.doesNotMatch(body, /\bbegin\s*;/i);
    assert.doesNotMatch(body, /\bcommit\s*;/i);
  }
});

test("live schema readback proves recovered security and final definitions", () => {
  assert.equal(READBACK.latest_migration, "20260826070000");
  assert.equal(READBACK.indexes.length, 4);
  assert.ok(READBACK.indexes.every((entry) => entry.valid && entry.ready));
  assert.equal(READBACK.operations_constraint.validated, true);
  assert.match(READBACK.operations_constraint.definition, /critical.*high.*warning.*info/);
  assert.equal(READBACK.operations_function.acl, "{postgres=X/postgres,service_role=X/postgres}");
  assert.match(READBACK.search_function.comment, /BOUNDED_CANDIDATES_V1/);
  assert.match(READBACK.search_function.acl, /anon=X\/postgres/);
  assert.match(READBACK.visibility_function.comment, /CATALOG_PARENT_VISIBILITY_DIRECT_V1/);
  assert.deepEqual(READBACK.pricing_view.options, ["security_invoker=true"]);
  assert.equal(READBACK.pricing_view.acl, "{postgres=arwdDxtm/postgres,service_role=r/postgres}");
  assert.match(READBACK.pricing_view.comment, /intentionally returns zero rows/);
  for (const object of [
    READBACK.operations_function,
    READBACK.search_function,
    READBACK.visibility_function,
    READBACK.pricing_view,
  ]) {
    assert.match(object.definition_sha256, /^[0-9a-f]{64}$/);
    assert.ok(object.definition_bytes > 0);
  }
});

test("contract forbids reapply and production mutation", () => {
  const contract = fs.readFileSync(
    path.join(ROOT, "docs", "contracts", "PRODUCTION_MIGRATION_HISTORY_RECOVERY_20260824_26_V1.md"),
    "utf8",
  );
  assert.match(contract, /must never be re-applied to\s+production/);
  assert.match(contract, /zero migration-ledger writes/);
  assert.match(contract, /zero schema or data mutation/);
  assert.match(contract, /no new migration may be added until this historical chain is merged/);
});
