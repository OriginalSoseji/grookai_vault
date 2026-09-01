import fs from "node:fs/promises";
import path from "node:path";

import { resolveFounderCommandDispatchV1 } from "../../backend/operations/founder_command_dispatcher_v1.mjs";

function parseArgs(argv) {
  const options = { outDir: null };
  for (const token of argv) {
    if (token.startsWith("--out-dir=")) options.outDir = path.resolve(token.slice(10));
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.outDir) throw new Error("--out-dir is required");
  return options;
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeGithubOutput(report) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  const command = report.command ?? {};
  const values = {
    command_found: report.command_found ? "true" : "false",
    command_id: command.command_id ?? "",
    action_type: command.action_type ?? "",
    executor_version: command.executor_version ?? "",
    workflow_handler: command.workflow_handler ?? "",
    source_commit_sha: command.source_commit_sha ?? "",
    plan_fingerprint: command.plan_fingerprint ?? "",
  };
  await fs.appendFile(
    outputFile,
    `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
    "utf8",
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.PROD_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  const report = await resolveFounderCommandDispatchV1({ supabaseUrl, serviceRoleKey });
  await writeJson(path.join(options.outDir, "dispatcher_resolution.json"), report);
  await writeGithubOutput(report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? error}\n`);
  process.exitCode = 1;
});

