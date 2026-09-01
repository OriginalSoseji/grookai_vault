#!/usr/bin/env node

import {
  runOperationsMaintenanceV1,
  runOutcomeWorkflowRetryMaintenanceV1,
} from "../../backend/operations/operations_control_plane_v1.mjs";

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

if (!hasFlag("--run")) {
  throw new Error("Refusing to mutate operational state without explicit --run");
}

const supabaseUrl = String(process.env.SUPABASE_URL ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SECRET_KEY ?? "").trim();
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

const maintenance = await runOperationsMaintenanceV1({
  supabaseUrl,
  serviceRoleKey,
});

const outcomeWorkflowRetry = await runOutcomeWorkflowRetryMaintenanceV1({
  supabaseUrl,
  serviceRoleKey,
});

const result = {
  version: "OPERATIONS_MAINTENANCE_WITH_OUTCOME_RETRY_V1",
  maintenance,
  outcome_workflow_retry: outcomeWorkflowRetry,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
