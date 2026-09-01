import fs from "node:fs/promises";
import path from "node:path";

import { callOperationsRpcV1 } from "../../backend/operations/operations_control_plane_v1.mjs";
import {
  TK_SM_R_APPLY_ACTION,
  TK_SM_R_APPLY_EXECUTOR_VERSION,
} from "../../backend/operations/tk_sm_r_founder_apply_v1.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function parseArgs(argv) {
  const options = { outDir: null };
  for (const token of argv) {
    if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  return options;
}

function normalizeRpcResult(payload) {
  if (Array.isArray(payload)) return payload[0] ?? null;
  return payload ?? null;
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeGithubOutput(values) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n");
  await fs.appendFile(outputFile, `${lines}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("PROD_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  }

  const payload = await callOperationsRpcV1({
    supabaseUrl,
    serviceRoleKey,
    functionName: "operations_peek_command_action_v1",
    body: {
      p_action_type: TK_SM_R_APPLY_ACTION,
      p_executor_version: TK_SM_R_APPLY_EXECUTOR_VERSION,
    },
  });
  const command = normalizeRpcResult(payload);
  if (!command) {
    const report = {
      version: "TK_SM_R_FOUNDER_COMMAND_RESOLVER_V1",
      status: "no_queued_command",
    };
    await writeJson(path.join(options.outDir, "command_resolution.json"), report);
    throw new Error("No queued TK-SM-R command is available");
  }

  const commandId = String(command.command_id ?? "").trim();
  const sourceCommitSha = String(command.source_commit_sha ?? "").trim();
  const planFingerprint = String(command.plan_fingerprint ?? "").trim();
  if (!UUID_PATTERN.test(commandId)) throw new Error("Resolved TK-SM-R command ID is invalid");
  if (!SHA1_PATTERN.test(sourceCommitSha)) throw new Error("Resolved TK-SM-R source commit is invalid");
  if (!SHA256_PATTERN.test(planFingerprint)) throw new Error("Resolved TK-SM-R plan fingerprint is invalid");
  if (command.action_type !== TK_SM_R_APPLY_ACTION) throw new Error("Resolved TK-SM-R action mismatch");
  if (command.executor_version !== TK_SM_R_APPLY_EXECUTOR_VERSION) {
    throw new Error("Resolved TK-SM-R executor mismatch");
  }

  const report = {
    version: "TK_SM_R_FOUNDER_COMMAND_RESOLVER_V1",
    status: "resolved",
    command_id: commandId,
    source_commit_sha: sourceCommitSha,
    plan_fingerprint: planFingerprint,
    canonical_writes: false,
  };
  await writeJson(path.join(options.outDir, "command_resolution.json"), report);
  await writeGithubOutput({
    command_id: commandId,
    source_commit_sha: sourceCommitSha,
    plan_fingerprint: planFingerprint,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});
