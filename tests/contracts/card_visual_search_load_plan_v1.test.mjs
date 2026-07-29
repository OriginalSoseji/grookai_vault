import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../..");

const plan = JSON.parse(
  readFileSync(
    new URL(
      "../../docs/audits/card_visual_search_load_plan_v1/2026-07-29_projection_bbf20d0f/load_plan.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("load plan hash and frozen projection counts reconcile", () => {
  const { load_plan_payload_sha256: actual, ...payload } = plan;
  const expected = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  assert.equal(actual, expected);
  assert.deepEqual(plan.target_counts, {
    releases: 1,
    artworks: 9532,
    printings: 9702,
    documents: 28596,
    evidence: 357413,
    index_entries: 321937,
    active_release_pointer_rows: 0,
  });
});

test("load plan remains strictly no-write and no-activation", () => {
  assert.deepEqual(plan.boundaries, {
    plan_only: true,
    database_connection: false,
    database_writes: false,
    migration_apply: false,
    release_load: false,
    release_activation: false,
    public_or_authenticated_grants: false,
    provider_calls: false,
    approvals: false,
    embeddings: false,
    holdout_execution: false,
    public_search_activation: false,
    pricing_changes: false,
  });
  assert.equal(plan.required_reconciliation.active_release_pointer_rows, 0);
  assert.equal(plan.required_reconciliation.rpc_visible_before_activation, 0);
});

test("every external projection input is hash-pinned and chunk-bounded", () => {
  for (const source of Object.values(plan.source_inputs)) {
    assert.match(source.artifact_sha256, /^[a-f0-9]{64}$/u);
    assert.ok(source.rows > 0);
    assert.ok(source.chunk_size > 0 && source.chunk_size <= 1000);
    assert.equal(source.planned_chunks, Math.ceil(source.rows / source.chunk_size));
  }
});

test("permanent load-plan artifacts match their hashes", () => {
  const hashManifest = JSON.parse(
    readFileSync(
      path.join(
        REPO_ROOT,
        "docs/audits/card_visual_search_load_plan_v1/2026-07-29_projection_bbf20d0f/artifact_hashes.json",
      ),
      "utf8",
    ),
  );
  for (const artifact of hashManifest.artifacts) {
    const actual = crypto
      .createHash("sha256")
      .update(readFileSync(path.join(REPO_ROOT, artifact.path)))
      .digest("hex");
    assert.equal(actual, artifact.sha256, artifact.path);
  }
});
