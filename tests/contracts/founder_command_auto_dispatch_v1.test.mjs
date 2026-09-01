import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1,
  resolveFounderCommandDispatchV1,
  validateFounderCommandExecutorRegistryV1,
  validateResolvedFounderCommandV1,
} from "../../backend/operations/founder_command_dispatcher_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const maintenanceWorkflow = source(".github/workflows/operations-control-plane-maintenance.yml");
const manualWorkflow = source(".github/workflows/tk-sm-r-founder-apply-command.yml");
const worker = source("scripts/workers/founder_command_dispatcher_v1.mjs");

const validCommand = {
  command_id: "39fc4f45-ba76-497e-a88f-1d383e2a766f",
  action_type: "apply_tk_sm_r_hidden_set_v1",
  executor_version: "TK_SM_R_HIDDEN_SET_APPLY_EXECUTOR_V1",
  source_commit_sha: "8bc32559f318442798c1f5931f570abab83d3467",
  plan_fingerprint: "19b9d6bd2cb94112598a18c5ca16092524e2aeb8d6b74ed5715d4764d157f485",
  execution_deadline_at: "2026-09-01T10:27:55.764536Z",
};

test("dispatcher registry is explicit, unique, and source-specific", () => {
  assert.equal(validateFounderCommandExecutorRegistryV1(FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1), FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1);
  assert.deepEqual(FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1.map((entry) => entry.action_type), [
    "apply_tk_sm_r_hidden_set_v1",
  ]);
  assert.throws(() => validateFounderCommandExecutorRegistryV1([]), /non-empty array/);
  assert.throws(() => validateFounderCommandExecutorRegistryV1([
    FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1[0],
    { ...FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1[0], registry_key: "duplicate_key" },
  ]), /Duplicate founder command action/);
});

test("resolved commands must match the registered action, executor, SHA, fingerprint, and deadline", () => {
  const result = validateResolvedFounderCommandV1(
    validCommand,
    FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1[0],
    new Date("2026-09-01T09:30:00Z"),
  );
  assert.equal(result.workflow_handler, "tk_sm_r_hidden_set_apply_v1");
  assert.throws(() => validateResolvedFounderCommandV1(
    { ...validCommand, action_type: "arbitrary_shell" },
    FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1[0],
    new Date("2026-09-01T09:30:00Z"),
  ), /action is not registered/);
  assert.throws(() => validateResolvedFounderCommandV1(
    { ...validCommand, execution_deadline_at: "2026-09-01T09:29:59Z" },
    FOUNDER_COMMAND_EXECUTOR_REGISTRY_V1[0],
    new Date("2026-09-01T09:30:00Z"),
  ), /deadline is invalid or expired/);
});

test("dispatcher returns idle without claiming or writing when no command is queued", async () => {
  const calls = [];
  const report = await resolveFounderCommandDispatchV1({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-role",
    now: new Date("2026-09-01T09:30:00Z"),
    fetchImpl: async (url, request) => {
      calls.push({ url, body: JSON.parse(request.body) });
      return { ok: true, status: 200, json: async () => null };
    },
  });
  assert.equal(report.status, "idle");
  assert.equal(report.command_found, false);
  assert.equal(report.canonical_writes, false);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /operations_peek_command_action_v1$/);
  assert.doesNotMatch(calls[0].url, /claim|complete|decide/);
});

test("dispatcher resolves exact metadata but leaves the lease to the frozen executor", async () => {
  const report = await resolveFounderCommandDispatchV1({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-role",
    now: new Date("2026-09-01T09:30:00Z"),
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => validCommand }),
  });
  assert.equal(report.status, "resolved");
  assert.equal(report.command_found, true);
  assert.equal(report.command.command_id, validCommand.command_id);
  assert.equal(report.command.source_commit_sha, validCommand.source_commit_sha);
  assert.equal(report.canonical_writes, false);
});

test("maintenance schedule polls safely and executes only a hard-coded registered handler", () => {
  assert.match(maintenanceWorkflow, /schedule:[\s\S]*\*\/15 \* \* \* \*/);
  assert.match(maintenanceWorkflow, /dispatch-approved-command:/);
  assert.match(maintenanceWorkflow, /FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE/);
  assert.match(maintenanceWorkflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(maintenanceWorkflow, /test "\$GITHUB_REF_NAME" = "main"/);
  assert.match(maintenanceWorkflow, /founder_command_dispatcher_v1\.mjs/);
  assert.match(maintenanceWorkflow, /steps\.resolve-command\.outputs\.command_found == 'true'/);
  assert.match(maintenanceWorkflow, /ref: \$\{\{ steps\.resolve-command\.outputs\.source_commit_sha \}\}/);
  assert.match(maintenanceWorkflow, /case "\$\{\{ steps\.resolve-command\.outputs\.workflow_handler \}\}" in/);
  assert.match(maintenanceWorkflow, /tk_sm_r_founder_command_executor_v1\.mjs/);
  assert.match(maintenanceWorkflow, /Unregistered founder command workflow handler/);
  assert.doesNotMatch(maintenanceWorkflow, /english_pokemon_incremental_promotion_v1\.mjs/);
  assert.doesNotMatch(maintenanceWorkflow, /actions: write/);
});

test("manual fallback and scheduled dispatcher share a non-cancelling execution lock", () => {
  assert.match(manualWorkflow, /group: founder-approved-command-execution-v1/);
  assert.match(manualWorkflow, /cancel-in-progress: false/);
  assert.match(maintenanceWorkflow, /group: founder-approved-command-execution-v1/);
  assert.match(maintenanceWorkflow, /cancel-in-progress: false/);
});

test("dispatcher worker exports only bounded metadata and has no write mode", () => {
  assert.match(worker, /resolveFounderCommandDispatchV1/);
  assert.match(worker, /dispatcher_resolution\.json/);
  assert.match(worker, /command_found/);
  assert.doesNotMatch(worker, /--run|--apply|operations_claim_command|node:child_process|spawnSync|execFile/);
});
