import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import "../../backend/env.mjs";
import { callOperationsRpcV1 } from "../../backend/operations/operations_control_plane_v1.mjs";
import {
  executeFounderOutcomeWorkflowV1,
  FOUNDER_OUTCOME_WORKFLOW_ACTION,
  FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY,
  FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
  FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
  validateFounderOutcomeCommandV1,
} from "../../backend/operations/founder_outcome_workflow_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");

function parseArgs(argv) {
  const options = { run: false, outDir: null };
  for (const token of argv) {
    if (token === "--run") options.run = true;
    else if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.run) throw new Error("Refusing outcome execution without --run");
  if (!options.outDir) throw new Error("--out-dir is required");
  return options;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function rpcCredentials() {
  const supabaseUrl = process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  if (!String(supabaseUrl ?? "").trim() || !String(serviceRoleKey ?? "").trim()) {
    throw new Error("Outcome workflow executor requires Supabase service credentials");
  }
  return { supabaseUrl, serviceRoleKey };
}

function transientFailureClass(error) {
  const message = String(error?.message ?? error ?? "");
  if (/timeout|timed out|econnreset|fetch failed|rate.?limit|temporar/i.test(message)) {
    return "transient_executor_failure";
  }
  return "registered_workflow_stage_failed";
}

const STAGE_HANDLERS = Object.freeze({
  async verify_frozen_scope_v1({ stage, workflow }) {
    return {
      reconciled: true,
      verification: "frozen_scope_validated",
      stage_fingerprint: stage.stage_fingerprint,
      workflow_fingerprint: workflow.workflow_fingerprint,
      canonical_writes: false,
    };
  },
  async verify_terminal_contract_v1({ stage, workflow }) {
    return {
      reconciled: true,
      verification: "terminal_contract_validated",
      stage_fingerprint: stage.stage_fingerprint,
      terminal_outcome: workflow.terminal_outcome,
      canonical_writes: false,
    };
  },
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const credentials = rpcCredentials();
  const headSha = git("rev-parse", "HEAD");
  if (git("status", "--short", "--untracked-files=no")) {
    throw new Error("Outcome workflow execution requires a clean tracked worktree");
  }
  const expectedCommandId = String(process.env.FOUNDER_OUTCOME_EXPECTED_COMMAND_ID ?? "").trim();
  const expectedSourceCommit = String(process.env.FOUNDER_OUTCOME_EXPECTED_SOURCE_COMMIT ?? "").trim();
  if (!expectedCommandId || expectedSourceCommit !== headSha) {
    throw new Error("Outcome workflow expected command or frozen source revision is invalid");
  }

  let command = null;
  let leaseToken = null;
  let workflow = null;
  try {
    command = await callOperationsRpcV1({
      ...credentials,
      functionName: "operations_claim_command_action_v1",
      body: {
        p_executor_key: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_KEY,
        p_action_type: FOUNDER_OUTCOME_WORKFLOW_ACTION,
        p_executor_version: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
        p_expected_command_id: expectedCommandId,
        p_source_commit_sha: headSha,
        p_lease_seconds: 1800,
      },
    });
    if (!command) {
      const report = {
        version: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
        status: "no_queued_command",
        command_id: expectedCommandId,
        canonical_writes: false,
      };
      await writeJson(path.join(options.outDir, "summary.json"), report);
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    leaseToken = command.lease_token;
    workflow = validateFounderOutcomeCommandV1(command, {
      registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
      headSha,
    });
    const progress = await callOperationsRpcV1({
      ...credentials,
      functionName: "operations_outcome_workflow_progress_v1",
      body: { p_command_id: command.id, p_lease_token: leaseToken },
    });
    const execution = await executeFounderOutcomeWorkflowV1({
      workflow,
      registry: FOUNDER_OUTCOME_WORKFLOW_RECIPE_REGISTRY_V1,
      handlers: STAGE_HANDLERS,
      completedStageKeys: progress?.completed_stage_keys ?? [],
      stageAttemptCounts: (progress?.receipts ?? [])
        .filter((receipt) => receipt?.status === "started")
        .reduce((counts, receipt) => ({
          ...counts,
          [receipt.stage_key]: Number(counts[receipt.stage_key] ?? 0) + 1,
        }), {}),
      onStageReceipt: async ({ stage, stage_index: stageIndex, status, result }) => {
        await callOperationsRpcV1({
          ...credentials,
          functionName: "operations_record_outcome_workflow_stage_v1",
          body: {
            p_command_id: command.id,
            p_lease_token: leaseToken,
            p_stage_index: stageIndex,
            p_stage_key: stage.stage_key,
            p_stage_fingerprint: stage.stage_fingerprint,
            p_status: status,
            p_result: result ?? {},
          },
        });
      },
    });
    const preflight = {
      passed: true,
      plan_fingerprint: command.plan_fingerprint,
      workflow_fingerprint: workflow.workflow_fingerprint,
      source_commit_sha: headSha,
    };
    const reconciliation = {
      ...execution,
      terminal_outcome: workflow.terminal_outcome,
      canonical_writes: workflow.stages.some((stage) => stage.mode === "canonical_write"),
    };
    await callOperationsRpcV1({
      ...credentials,
      functionName: "operations_complete_command_v1",
      body: {
        p_command_id: command.id,
        p_lease_token: leaseToken,
        p_status: "succeeded",
        p_preflight: preflight,
        p_reconciliation: reconciliation,
        p_error_summary: null,
      },
    });
    const report = {
      version: FOUNDER_OUTCOME_WORKFLOW_EXECUTOR_VERSION,
      status: "succeeded",
      command_id: command.id,
      source_commit_sha: headSha,
      plan_fingerprint: command.plan_fingerprint,
      ...reconciliation,
    };
    await writeJson(path.join(options.outDir, "summary.json"), report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const failureClass = transientFailureClass(error);
    const errorSummary = {
      failure_class: failureClass,
      error_class: error instanceof Error ? error.name : "UnknownError",
      error_message: error instanceof Error ? error.message : String(error),
    };
    if (command && leaseToken) {
      await callOperationsRpcV1({
        ...credentials,
        functionName: "operations_complete_command_v1",
        body: {
          p_command_id: command.id,
          p_lease_token: leaseToken,
          p_status: "failed",
          p_preflight: {
            passed: true,
            plan_fingerprint: command.plan_fingerprint,
            workflow_fingerprint: workflow?.workflow_fingerprint ?? null,
            source_commit_sha: headSha,
          },
          p_reconciliation: { reconciled: false },
          p_error_summary: errorSummary,
        },
      }).catch(() => {});
    }
    await writeJson(path.join(options.outDir, "failure.json"), errorSummary);
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
