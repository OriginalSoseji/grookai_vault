import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildFounderOutcomeStageV1,
  buildFounderOutcomeWorkflowPlanV1,
  executeFounderOutcomeWorkflowV1,
  FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
  validateFounderOutcomeWorkflowPlanV1,
} from "../../backend/operations/founder_outcome_workflow_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const migration = source("supabase/migrations/20260901120000_founder_outcome_workflow_v1.sql");
const workflow = source(".github/workflows/operations-control-plane-maintenance.yml");
const executor = source("scripts/workers/founder_outcome_workflow_executor_v1.mjs");
const service = source("lib/services/operations/founder_operations_service.dart");
const screen = source("lib/screens/founder/founder_operations_screen.dart");
const contract = source("docs/contracts/FOUNDER_OUTCOME_WORKFLOW_V1.md");

function validWorkflow() {
  return buildFounderOutcomeWorkflowPlanV1({
    workflowKey: "operations_outcome_contract_proof_v1",
    stages: [
      buildFounderOutcomeStageV1({
        stageKey: "verify_scope",
        handlerKey: "verify_frozen_scope_v1",
        mode: "read_only",
        expectedEffects: { frozen_scope_valid: true },
        exclusions: ["no canonical writes"],
      }),
      buildFounderOutcomeStageV1({
        stageKey: "verify_terminal",
        handlerKey: "verify_terminal_contract_v1",
        mode: "read_only",
        expectedEffects: { terminal_contract_valid: true },
        exclusions: ["no canonical writes"],
      }),
    ],
    terminalOutcome: { summary: "The frozen outcome contract is fully reconciled." },
  });
}

test("a complete registered outcome workflow validates", () => {
  const plan = validWorkflow();
  assert.equal(
    validateFounderOutcomeWorkflowPlanV1(plan, {
      registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
    }),
    plan,
  );
  assert.equal(plan.stages.length, 2);
  assert.equal(plan.automatic_transient_retry, true);
});

test("unregistered behavior, changed fingerprints, and executable payload fields fail closed", () => {
  const unknown = structuredClone(validWorkflow());
  unknown.stages[0].handler_key = "arbitrary_shell_v1";
  assert.throws(() => validateFounderOutcomeWorkflowPlanV1(unknown, {
    registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
  }), /not registered/);

  const changed = structuredClone(validWorkflow());
  changed.stages[0].expected_effects.frozen_scope_valid = false;
  assert.throws(() => validateFounderOutcomeWorkflowPlanV1(changed, {
    registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
  }), /fingerprint changed/);

  const executable = buildFounderOutcomeWorkflowPlanV1({
    workflowKey: "operations_outcome_contract_proof_v1",
    stages: [buildFounderOutcomeStageV1({
      stageKey: "verify_scope",
      handlerKey: "verify_frozen_scope_v1",
      mode: "read_only",
      expectedEffects: { shell: "rm -rf /" },
      exclusions: [],
    })],
    terminalOutcome: { summary: "Invalid executable payload." },
  });
  assert.throws(() => validateFounderOutcomeWorkflowPlanV1(executable, {
    registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
  }), /prohibited/);
});

test("execution resumes after successful stages and records ordered receipts", async () => {
  const calls = [];
  const receipts = [];
  const result = await executeFounderOutcomeWorkflowV1({
    workflow: validWorkflow(),
    registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
    completedStageKeys: ["verify_scope"],
    handlers: {
      verify_frozen_scope_v1: async () => {
        calls.push("verify_scope");
        return { reconciled: true };
      },
      verify_terminal_contract_v1: async () => {
        calls.push("verify_terminal");
        return { reconciled: true };
      },
    },
    onStageReceipt: async (receipt) => receipts.push(receipt.status),
  });
  assert.deepEqual(calls, ["verify_terminal"]);
  assert.deepEqual(receipts, ["started", "succeeded"]);
  assert.equal(result.reconciled, true);
  assert.equal(result.receipts[0].status, "already_succeeded");
});

test("an unreconciled stage stops the workflow and emits a failed receipt", async () => {
  const statuses = [];
  await assert.rejects(executeFounderOutcomeWorkflowV1({
    workflow: validWorkflow(),
    registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
    handlers: {
      verify_frozen_scope_v1: async () => ({ reconciled: false }),
      verify_terminal_contract_v1: async () => ({ reconciled: true }),
    },
    onStageReceipt: async (receipt) => statuses.push(receipt.status),
  }), /did not reconcile/);
  assert.deepEqual(statuses, ["started", "failed"]);
});

test("a stage cannot exceed its frozen attempt ceiling", async () => {
  const plan = validWorkflow();
  await assert.rejects(executeFounderOutcomeWorkflowV1({
    workflow: plan,
    registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
    stageAttemptCounts: { verify_scope: plan.stages[0].max_attempts },
    handlers: {
      verify_frozen_scope_v1: async () => ({ reconciled: true }),
      verify_terminal_contract_v1: async () => ({ reconciled: true }),
    },
  }), /attempt ceiling reached/);
});

test("database receipts are private, append-only, plan-bound, and transient-only retryable", () => {
  assert.match(migration, /create table public\.operations_outcome_workflow_stage_receipts/);
  assert.match(migration, /trg_operations_outcome_stage_receipts_append_only/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.operations_outcome_workflow_stage_receipts[\s\S]*authenticated/);
  assert.match(migration, /outcome_workflow_stage_not_in_frozen_plan/);
  assert.match(migration, /successful_outcome_workflow_stage_requires_reconciliation/);
  assert.match(migration, /operations_requeue_retryable_outcome_workflows_v1/);
  assert.match(migration, /executor_lease_expired/);
  assert.match(migration, /transient_executor_failure/);
  assert.doesNotMatch(migration, /scope_expansion_required'[\s\S]*automatic_retry_queued/);
});

test("scheduled execution is registered and uses the frozen revision", () => {
  assert.match(workflow, /founder_outcome_workflow_v1\)/);
  assert.match(workflow, /founder_outcome_workflow_executor_v1\.mjs/);
  assert.match(workflow, /FOUNDER_OUTCOME_EXPECTED_COMMAND_ID/);
  assert.match(executor, /operations_claim_command_action_v1/);
  assert.match(executor, /operations_outcome_workflow_progress_v1/);
  assert.match(executor, /operations_record_outcome_workflow_stage_v1/);
  assert.match(executor, /operations_complete_command_v1/);
  assert.match(executor, /git\("status", "--short", "--untracked-files=no"\)/);
});

test("phone presents the terminal outcome and automatic stage progress", () => {
  assert.match(service, /workflowStages: _mapList\(json\['workflow_stages'\]\)/);
  assert.match(service, /bool get isOutcomeWorkflow/);
  assert.match(screen, /Approve complete outcome/);
  assert.match(screen, /Every listed stage will run automatically/);
  assert.match(screen, /Automatic outcome workflow/);
  assert.match(screen, /One approval covers every listed stage/);
});

test("contract makes normal continuation automatic but does not widen old approvals", () => {
  assert.match(contract, /approves an outcome, not a single implementation step/i);
  assert.match(contract, /no desktop follow-up is required/i);
  assert.match(contract, /not broadened retroactively/i);
  assert.match(contract, /Unregistered workflows\s+and stage handlers fail closed/i);
});
