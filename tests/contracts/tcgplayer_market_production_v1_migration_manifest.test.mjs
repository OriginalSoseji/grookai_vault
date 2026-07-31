import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const MANIFEST_PATH = path.join(
  ROOT,
  "backend",
  "pricing",
  "rollout",
  "tcgplayer_market_production_v1_migration_manifest.json",
);
const RUNBOOK_PATH = path.join(
  ROOT,
  "docs",
  "runbooks",
  "TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md",
);
const POST_CANARY_PLAN_PATH = path.join(
  ROOT,
  "backend",
  "pricing",
  "rollout",
  "tcgplayer_market_post_canary_release_plan_v1.json",
);
const HASHES_PATH = path.join(
  ROOT,
  "docs",
  "audits",
  "pricing",
  "mee_pricing_platform_production_v1",
  "migration_apply_readiness_v1",
  "2026-07-28T14-26-53-090Z",
  "artifact_hashes.json",
);

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sha256(relativePath) {
  return createHash("sha256")
    .update(readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const postCanaryPlan = JSON.parse(
  readFileSync(POST_CANARY_PLAN_PATH, "utf8"),
);
const runbook = readFileSync(RUNBOOK_PATH, "utf8");
const artifactHashes = JSON.parse(readFileSync(HASHES_PATH, "utf8"));

test("pricing rollout manifest freezes the exact pending migration set", () => {
  assert.equal(
    manifest.manifest_version,
    "TCGPLAYER_MARKET_PRODUCTION_V1_MIGRATION_ROLLOUT_MANIFEST_V1",
  );
  assert.equal(manifest.status, "pre_apply_ready_canary_blocked");
  assert.deepEqual(manifest.expected_local_only_migration_ids, [
    "20260728130000",
    "20260728133000",
  ]);
  assert.equal(manifest.pre_apply_evidence.actual_local_only_count, 2);
  assert.equal(manifest.pre_apply_evidence.remote_only_count, 0);
  assert.equal(manifest.pre_apply_evidence.strict_pre_push_status, "passed");
  assert.equal(manifest.pre_apply_evidence.full_local_replay, "passed");
  assert.equal(manifest.pre_apply_evidence.production_writes, 0);
});

test("frozen migration hashes match repository authority", () => {
  assert.equal(manifest.migrations.length, 2);
  for (const migration of manifest.migrations) {
    assert.equal(sha256(migration.path), migration.sha256);
    assert.equal(
      path.basename(migration.path).startsWith(`${migration.id}_`),
      true,
    );
  }
});

test("apply remains canary-gated and forbids history-skipping flags", () => {
  assert.equal(
    manifest.required_preconditions.canary_observer_status,
    "passed",
  );
  assert.equal(manifest.commands.apply, "supabase db push");
  assert.deepEqual(manifest.forbidden.apply_flags, ["--include-all"]);
  assert.doesNotMatch(
    Object.values(manifest.commands).join("\n"),
    /--include-all/,
  );
  assert.equal(manifest.forbidden.production_apply_before_canary_pass, true);
});

test("runbook requires exact preflight, apply, and post-apply audit order", () => {
  const prePushIndex = runbook.indexOf(
    "ExpectedLocalOnlyIds @(\"20260728130000\", \"20260728133000\")",
  );
  const applyIndex = runbook.indexOf("supabase db push", prePushIndex);
  const postApplyIndex = runbook.indexOf(
    "-Phase AuditLinkedSchema",
    applyIndex,
  );

  assert.ok(prePushIndex >= 0, "exact pending migration preflight is missing");
  assert.ok(applyIndex > prePushIndex, "apply must follow strict preflight");
  assert.ok(
    postApplyIndex > applyIndex,
    "linked schema audit must follow remote apply",
  );
  assert.match(runbook, /Do not use `--include-all`/);
  assert.match(runbook, /72-hour canary observer passes/);
});

test("manifest paths and migration IDs are not duplicated", () => {
  const ids = manifest.migrations.map((migration) => migration.id);
  const paths = manifest.migrations.map((migration) => migration.path);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual(ids, manifest.expected_local_only_migration_ids);
});

test("permanent migration-readiness artifacts match their recorded hashes", () => {
  assert.equal(artifactHashes.algorithm, "sha256");
  for (const [relativePath, expectedHash] of Object.entries(
    artifactHashes.files,
  )) {
    assert.equal(sha256(relativePath), expectedHash);
  }
});

test("post-canary release plan stays blocked, ordered, and exact", () => {
  assert.equal(
    postCanaryPlan.plan_version,
    "TCGPLAYER_MARKET_POST_CANARY_RELEASE_PLAN_V1",
  );
  assert.equal(postCanaryPlan.status, "frozen_blocked_by_active_canary");
  assert.equal(
    postCanaryPlan.production_runtime.anonymous_pricing_must_remain_denied,
    true,
  );
  assert.deepEqual(
    postCanaryPlan.pending_migration_package.migrations.map(
      (migration) => migration.id,
    ),
    ["20260728130000", "20260728133000"],
  );
  assert.equal(
    postCanaryPlan.pending_migration_package.runtime_repair_prerequisite
      .must_not_be_added_to_pending_package,
    true,
  );
  assert.deepEqual(
    postCanaryPlan.ordered_gates.map((gate) => gate.order),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  );
  assert.ok(
    postCanaryPlan.ordered_gates.find(
      (gate) => gate.gate === "client_deploy",
    ).order >
      postCanaryPlan.ordered_gates.find(
        (gate) => gate.gate === "schema_security_readback",
      ).order,
  );
  assert.ok(
    postCanaryPlan.ordered_gates.find(
      (gate) => gate.gate === "signed_in_activation",
    ).order >
      postCanaryPlan.ordered_gates.find(
        (gate) => gate.gate === "authenticated_product_surfaces",
      ).order,
  );
});
