import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { operationsSha256V1 } from
  "../../backend/operations/operations_control_plane_v1.mjs";
import {
  buildTkSmRExactApprovalV1,
  buildTkSmRPersistenceProjectionV1,
  buildTkSmRFounderApplyAgentV1,
  buildTkSmRFounderApplyWorkItemV1,
  classifyTkSmRReadbackV1,
  TK_SM_R_APPLY_ACTION,
  TK_SM_R_APPLY_EXECUTOR_VERSION,
  tkSmRPersistenceFingerprintV1,
  validateTkSmRApplyReportV1,
  validateTkSmRClaimedCommandV1,
  validateTkSmRFounderApplyManifestV1,
} from "../../backend/operations/tk_sm_r_founder_apply_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const AUDIT_DIR = path.join(
  ROOT, "docs", "audits", "catalog_incremental_promotion", "tk_sm_r_hidden_set_v1",
);
const manifestBytes = fs.readFileSync(path.join(AUDIT_DIR, "founder_apply_manifest.json"));
const packageBytes = fs.readFileSync(path.join(AUDIT_DIR, "package_manifest.json"));
const manifest = JSON.parse(manifestBytes);
const HEAD = "a".repeat(40);

function buildItem() {
  return buildTkSmRFounderApplyWorkItemV1({
    manifest,
    executorManifestSha256: operationsSha256V1(manifestBytes),
    packageManifestSha256: operationsSha256V1(packageBytes),
    sourceCommitSha: HEAD,
    sourceRunUri: `https://github.com/OriginalSoseji/grookai_vault/commit/${HEAD}`,
    createdAt: "2026-09-01T07:00:00.000Z",
    expiresAt: "2026-09-04T07:00:00.000Z",
  });
}

function buildCommand() {
  const item = buildItem();
  return {
    id: "00000000-0000-0000-0000-000000000001",
    lease_token: "00000000-0000-0000-0000-000000000002",
    action_type: item.action_type,
    executor_version: item.executor_version,
    plan_fingerprint: item.plan_fingerprint,
    cost_ceiling_usd: "0.0000",
    frozen_scope: {
      scope: item.scope,
      exclusions: item.exclusions,
      plan_payload: item.plan_payload,
      payload_sha256: operationsSha256V1(item.plan_payload),
    },
  };
}

function exactReadback() {
  return {
    card_prints: 11,
    identities: 11,
    evidence: 22,
    family_reviews: 11,
    child_printings: 0,
    mappings: 0,
    vault_items: 0,
    image_pointer_rows: 0,
    rows: manifest.expected_rows,
    persistence_fingerprint_sha256: manifest.expected_persistence_fingerprint_sha256,
  };
}

test("frozen manifest preserves the rollback-proven 11-row envelope", () => {
  assert.equal(validateTkSmRFounderApplyManifestV1(manifest), manifest);
  assert.equal(manifest.expected_rows.length, 11);
  assert.deepEqual(manifest.expected_rows.map((row) => row.number), [
    "1", "3", "5", "7", "8", "9", "10", "12", "24", "27", "28",
  ]);
  assert.equal(manifest.rollback_proof.rollback_absence_verified, true);
  assert.equal(manifest.expected_counts.image_candidates, 0);
});

test("dedicated agent cannot claim generic catalog work", () => {
  const agent = buildTkSmRFounderApplyAgentV1();
  assert.deepEqual(agent.allowed_work_item_types, ["catalog_hidden_set_apply"]);
  assert.deepEqual(agent.allowed_command_actions, [TK_SM_R_APPLY_ACTION]);
  assert.equal(agent.executor_version, TK_SM_R_APPLY_EXECUTOR_VERSION);
  assert.notEqual(agent.agent_key, "universal-catalog-discovery-v1");
});

test("phone work item is exact, recent-authenticated, and execution enabled", () => {
  const item = buildItem();
  assert.equal(item.command_policy.execution_enabled, true);
  assert.equal(item.command_policy.cost_ceiling_usd, 0);
  assert.equal(item.command_policy.max_attempts, 2);
  assert.equal(item.requires_recent_auth, true);
  assert.equal(item.scope.expected_card_print_ids.length, 11);
  assert.equal(item.plan_fingerprint, operationsSha256V1(item.plan_payload));
  assert.equal(item.plan_payload.expires_at, item.expires_at);
  assert.equal(item.plan_payload.approval_boundary.all_other_writes, false);
  assert.match(item.summary, /11 card_prints, 11 identities, 22 evidence rows, and 11 family reviews/);
  assert.ok(item.exclusions.includes("no Vault writes"));
  assert.deepEqual(new Set(item.evidence.map((row) => row.retention_class)),
    new Set(["permanent_audit", "workflow_90_day"]));
});

test("renewed phone item expiry creates a new immutable plan fingerprint", () => {
  const original = buildItem();
  const renewed = buildTkSmRFounderApplyWorkItemV1({
    manifest,
    executorManifestSha256: operationsSha256V1(manifestBytes),
    packageManifestSha256: operationsSha256V1(packageBytes),
    sourceCommitSha: HEAD,
    sourceRunUri: `https://github.com/OriginalSoseji/grookai_vault/commit/${HEAD}`,
    createdAt: original.plan_payload.created_at,
    expiresAt: "2026-09-07T07:00:00.000Z",
  });
  assert.equal(renewed.work_item_key, original.work_item_key);
  assert.notEqual(renewed.plan_fingerprint, original.plan_fingerprint);
  assert.equal(renewed.plan_payload.expires_at, renewed.expires_at);
});

test("claimed command must match action, executor, commit, manifest, and fingerprint", () => {
  const command = buildCommand();
  const preflight = validateTkSmRClaimedCommandV1({
    command,
    manifest,
    executorManifestSha256: operationsSha256V1(manifestBytes),
    headSha: HEAD,
  });
  assert.equal(preflight.passed, true);
  assert.equal(preflight.plan_fingerprint, command.plan_fingerprint);
  assert.throws(() => validateTkSmRClaimedCommandV1({
    command: { ...command, action_type: "apply_other_set" },
    manifest,
    executorManifestSha256: operationsSha256V1(manifestBytes),
    headSha: HEAD,
  }), /action mismatch/);
  assert.throws(() => validateTkSmRClaimedCommandV1({
    command,
    manifest,
    executorManifestSha256: operationsSha256V1(manifestBytes),
    headSha: "b".repeat(40),
  }), /commit mismatch/);
});

test("exact approval string is synthesized only from the frozen command", () => {
  assert.equal(buildTkSmRExactApprovalV1({ manifest, headSha: HEAD }), [
    "I approve ENGLISH_POKEMON_INCREMENTAL_PROMOTION_V1 apply only",
    "source_set=tk-sm-r",
    "database_set=tk-sm-r",
    `payload_fingerprint=${manifest.payload_fingerprint_sha256}`,
    `master_package_fingerprint=${manifest.master_package_fingerprint_sha256}`,
    `source_snapshot_fingerprint=${manifest.source_snapshot_fingerprint_sha256}`,
    `commit_sha=${HEAD}`,
  ].join("; "));
});

test("readback supports empty preflight, exact replay, and rejects partial state", () => {
  assert.equal(classifyTkSmRReadbackV1({ rows: [] }, manifest).state, "empty");
  assert.equal(classifyTkSmRReadbackV1(exactReadback(), manifest).state, "exact");
  assert.equal(classifyTkSmRReadbackV1({
    ...exactReadback(),
    evidence: 21,
  }, manifest).state, "partial_or_conflicting");
  assert.equal(classifyTkSmRReadbackV1({
    ...exactReadback(),
    child_printings: 1,
  }, manifest).state, "partial_or_conflicting");
  assert.equal(classifyTkSmRReadbackV1({
    ...exactReadback(),
    persistence_fingerprint_sha256: "f".repeat(64),
  }, manifest).state, "partial_or_conflicting");
});

test("persistence fingerprint covers every inserted table payload", () => {
  const fixture = {
    cardPrints: [{ id: "card-1", name: "Lightning Energy" }],
    identities: [{ id: "identity-1", card_print_id: "card-1", identity_key_hash: "hash-1" }],
    evidence: [{ id: "evidence-1", card_print_id: "card-1", evidence_payload: { source: "a" } }],
    familyReviews: [{ id: "review-1", card_print_id: "card-1", review_status: "pending" }],
  };
  const projection = buildTkSmRPersistenceProjectionV1(fixture);
  const fingerprint = tkSmRPersistenceFingerprintV1(fixture);
  assert.equal(projection.identities[0].identity_key_hash, "hash-1");
  assert.notEqual(fingerprint, tkSmRPersistenceFingerprintV1({
    ...fixture,
    evidence: [{ ...fixture.evidence[0], evidence_payload: { source: "changed" } }],
  }));
  assert.notEqual(fingerprint, tkSmRPersistenceFingerprintV1({
    ...fixture,
    familyReviews: [{ ...fixture.familyReviews[0], review_status: "changed" }],
  }));
});

test("apply report requires exact counts, rows, collision preflight, and boundaries", () => {
  const report = {
    pass: true,
    mode: "apply",
    payload_fingerprint_sha256: manifest.payload_fingerprint_sha256,
    counts: manifest.expected_counts,
    collision_preflight: {
      card_prints: 0,
      natural_coordinates: 0,
      identities: 0,
      evidence: 0,
      family_reviews: 0,
    },
    inserted_readback: exactReadback(),
    rows: manifest.expected_rows,
  };
  assert.equal(validateTkSmRApplyReportV1(report, manifest).summary_exact, true);
  assert.throws(
    () => validateTkSmRApplyReportV1({ ...report, counts: { ...report.counts, evidence: 21 } }, manifest),
    /count mismatch/,
  );
});

test("action-filtered resolver and lease RPCs are private and claim one frozen revision", () => {
  const migration = fs.readFileSync(
    path.join(ROOT, "supabase", "migrations", "20260901070000_founder_operations_action_claim_v1.sql"),
    "utf8",
  );
  assert.match(migration, /c\.action_type = btrim\(p_action_type\)/);
  assert.match(migration, /c\.executor_version = btrim\(p_executor_version\)/);
  assert.match(migration, /operations_peek_command_action_v1/);
  assert.match(migration, /operations_guard_work_item_supersession_v1/);
  assert.match(migration, /active_command_blocks_work_item_supersession/);
  assert.match(migration, /status = 'cancelled'/);
  assert.match(migration, /c\.id = p_expected_command_id/);
  assert.match(migration, /source_commit_sha}' = btrim\(p_source_commit_sha\)/);
  assert.match(migration, /w\.state = 'queued'/);
  assert.match(migration, /for update of c, w skip locked/);
  assert.match(migration, /operations_require_service_role_v1\(\)/);
  assert.match(migration, /grant execute on function public\.operations_peek_command_action_v1[\s\S]*to service_role/);
  assert.match(migration, /grant execute on function public\.operations_claim_command_action_v1[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to authenticated/);
});

test("workflow is manual-only and never exposes a direct apply input", () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "tk-sm-r-founder-apply-command.yml"),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /publish_work_item/);
  assert.match(workflow, /execute_approved_command/);
  assert.match(workflow, /tk_sm_r_founder_command_resolver_v1\.mjs/);
  assert.match(workflow, /steps\.resolve-command\.outputs\.source_commit_sha/);
  assert.match(workflow, /Check out the command's frozen source revision/);
  assert.match(workflow, /tk_sm_r_founder_command_executor_v1\.mjs/);
  assert.doesNotMatch(workflow, /english_pokemon_incremental_promotion_v1\.mjs[\s\\]*--mode=apply/);
});

test("executor claims only the frozen action and performs independent readback", () => {
  const executor = fs.readFileSync(
    path.join(ROOT, "scripts", "workers", "tk_sm_r_founder_command_executor_v1.mjs"),
    "utf8",
  );
  assert.match(executor, /operations_claim_command_action_v1/);
  assert.match(executor, /p_action_type: TK_SM_R_APPLY_ACTION/);
  assert.match(executor, /p_executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION/);
  assert.match(executor, /p_expected_command_id: expectedCommandId/);
  assert.match(executor, /p_source_commit_sha: expectedSourceCommit/);
  assert.match(executor, /p_lease_seconds: 1800/);
  assert.match(executor, /tkSmRPersistenceFingerprintV1/);
  assert.match(executor, /existing_exact_readback/);
  assert.match(executor, /partial_or_conflicting/);
  assert.match(executor, /independent durable readback did not reconcile/);
  assert.match(executor, /preflight\?\.passed === true && !durableReconciled/);
});
