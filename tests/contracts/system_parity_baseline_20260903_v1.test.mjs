import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = "docs/audits/system_parity_baseline_20260903";

function read(name) {
  return fs.readFileSync(path.join(ROOT, name));
}

function json(name) {
  return JSON.parse(read(name).toString("utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("baseline is pinned to current-main authority and its exact producer", () => {
  const manifest = json("SYSTEM_PARITY_MANIFEST.json");
  assert.equal(manifest.capture_kind, "baseline");
  assert.equal(manifest.authority.ref, "origin/main");
  assert.equal(manifest.authority.sha, "9a6f62c077f02528ecb26ee7d660f501476475a6");
  assert.equal(manifest.producer.sha, "311dc50481714aee580f13daae75d3c70c2d1253");
  assert.equal(manifest.boundaries.database, "read_only_transaction");
  assert.equal(manifest.boundaries.browser, "signed_out_get_only");
});

test("baseline captures every required system domain without capture failure", () => {
  const summary = json("summary.json");
  assert.equal(summary.status, "BASELINE_CAPTURED");
  assert.equal(summary.repository.tracked_files, 21414);
  assert.equal(summary.repository.migrations, 382);
  assert.equal(summary.repository.workflows, 58);
  assert.equal(summary.repository.web_routes, 95);
  assert.equal(summary.repository.entrypoints, 160);
  assert.equal(summary.database.required_query_failures, 0);
  assert.equal(summary.runtime.error_count, 0);
  assert.equal(summary.product.case_count, 14);
  assert.equal(summary.product.failed_case_count, 0);
});

test("repository tree and production security inventories are internally complete", () => {
  const treeRows = read("repository_tree.jsonl").toString("utf8").trim().split("\n");
  const database = json("database_snapshot.json");
  assert.equal(treeRows.length, 21414);
  assert.equal(database.project_ref, "ycdxbpibncqcchqiihfz");
  assert.equal(database.transaction_mode, "read_only");
  assert.equal(database.queries.relations.row_count, 418);
  assert.equal(database.queries.functions.row_count, 464);
  assert.equal(database.queries.policies.row_count, 437);
  assert.equal(database.queries.grants.row_count, 6911);
  assert.equal(database.queries.migration_ledger.row_count, 380);
});

test("all product cases are signed out and known defects remain explicit", () => {
  const product = json("product_snapshot.json");
  const findings = json("baseline_findings.json");
  assert.equal(product.authentication, "signed_out");
  assert.equal(product.cases.length, 14);
  assert.ok(product.cases.every((entry) => entry.status === "captured"));
  assert.ok(findings.known_product_baseline_defects.some((entry) => entry.code === "failed_visible_images"));
  assert.ok(findings.known_product_baseline_defects.some((entry) => entry.code === "slow_signed_out_navigation"));
});

test("migration alignment distinguishes quarantine history from active pending work", () => {
  const alignment = json("migration_alignment.json");
  assert.deepEqual(alignment.remote_versions_missing_from_repository, []);
  assert.deepEqual(alignment.duplicate_repository_versions, []);
  assert.equal(alignment.repository_versions_missing_from_remote.length, 2);
  assert.ok(alignment.repository_versions_missing_from_remote.some((entry) =>
    entry.version === "20260816170000" && entry.classification === "active_pending_migration"));
});

test("all permanent artifacts match their SHA-256 manifest", () => {
  const manifest = json("artifact_hashes.json");
  const entries = Object.entries(manifest.files);
  assert.ok(entries.length >= 24);
  for (const [relativePath, expected] of entries) {
    assert.equal(sha256(read(relativePath)), expected, relativePath);
  }
  assert.equal(manifest.artifact_count, entries.length);
});

test("permanent text artifacts contain no credential-shaped payload", () => {
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.endsWith(".png")) continue;
    const body = read(entry.name).toString("utf8");
    assert.doesNotMatch(body, /postgres(?:ql)?:\/\/[^\s"']+/i, entry.name);
    assert.doesNotMatch(body, /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/, entry.name);
  }
});
