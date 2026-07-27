import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import "../../backend/env.mjs";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "pipeline",
);
const PIPELINE_VERSION = "TCGPLAYER_MARKET_PIPELINE_V1";

function parseArgs(argv) {
  const args = {
    apply: false,
    runKey: null,
    outRoot: DEFAULT_OUT_ROOT,
    skipIngest: false,
    requestCeiling: 5000,
    freshnessHours: 36,
    publicationLimit: null,
  };

  for (const arg of argv) {
    if (arg === "--apply" || arg === "--run") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--skip-ingest") args.skipIngest = true;
    else if (arg.startsWith("--run-key=")) args.runKey = arg.slice(10).trim();
    else if (arg.startsWith("--resume-run-key=")) {
      args.runKey = arg.slice("--resume-run-key=".length).trim();
    } else if (arg.startsWith("--out-root=")) {
      args.outRoot = path.resolve(arg.slice("--out-root=".length));
    } else if (arg.startsWith("--request-ceiling=")) {
      args.requestCeiling = Number.parseInt(
        arg.slice("--request-ceiling=".length),
        10,
      );
    } else if (arg.startsWith("--freshness-hours=")) {
      args.freshnessHours = Number(
        arg.slice("--freshness-hours=".length),
      );
    } else if (arg.startsWith("--publication-limit=")) {
      args.publicationLimit = Number.parseInt(
        arg.slice("--publication-limit=".length),
        10,
      );
    }
  }

  if (!Number.isInteger(args.requestCeiling) || args.requestCeiling < 1) {
    throw new Error("--request-ceiling must be a positive integer");
  }
  if (!Number.isFinite(args.freshnessHours) || args.freshnessHours <= 0) {
    throw new Error("--freshness-hours must be positive");
  }
  if (
    args.publicationLimit !== null &&
    (!Number.isInteger(args.publicationLimit) || args.publicationLimit < 1)
  ) {
    throw new Error("--publication-limit must be a positive integer");
  }
  return args;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function relative(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function git(args) {
  const result = await execFileAsync("git", args, {
    cwd: REPO_ROOT,
    timeout: 15_000,
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath) {
  return createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

async function runPhase({
  phase,
  command,
  args,
  runDir,
  state,
  statePath,
}) {
  if (state.phases[phase]?.status === "completed") {
    process.stdout.write(`[market-pipeline] phase=${phase} status=resumed\n`);
    return;
  }

  const startedAt = new Date().toISOString();
  state.phases[phase] = {
    status: "running",
    started_at: startedAt,
    command: [command, ...args],
  };
  await writeJson(statePath, state);

  try {
    const result = await execFileAsync(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
      timeout: 60 * 60 * 1000,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
    const stdoutPath = path.join(runDir, `${phase}.stdout.log`);
    const stderrPath = path.join(runDir, `${phase}.stderr.log`);
    await fs.writeFile(stdoutPath, result.stdout ?? "");
    await fs.writeFile(stderrPath, result.stderr ?? "");
    state.phases[phase] = {
      ...state.phases[phase],
      status: "completed",
      finished_at: new Date().toISOString(),
      stdout_path: relative(stdoutPath),
      stderr_path: relative(stderrPath),
    };
    await writeJson(statePath, state);
    process.stdout.write(`[market-pipeline] phase=${phase} status=completed\n`);
  } catch (error) {
    const stdoutPath = path.join(runDir, `${phase}.stdout.log`);
    const stderrPath = path.join(runDir, `${phase}.stderr.log`);
    await fs.writeFile(stdoutPath, error.stdout ?? "");
    await fs.writeFile(stderrPath, error.stderr ?? String(error.stack ?? error));
    state.phases[phase] = {
      ...state.phases[phase],
      status: "failed",
      finished_at: new Date().toISOString(),
      stdout_path: relative(stdoutPath),
      stderr_path: relative(stderrPath),
      error: error.message,
    };
    state.status = "failed";
    state.finished_at = new Date().toISOString();
    await writeJson(statePath, state);
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runKey =
    args.runKey ||
    `TCGPLAYER-MARKET-PIPELINE-${args.apply ? "APPLY" : "DRY"}-${timestamp()}`;
  const runDir = path.join(args.outRoot, safeSegment(runKey));
  const runPlanPath = path.join(runDir, "run_plan.json");
  const statePath = path.join(runDir, "pipeline_state.json");
  await fs.mkdir(runDir, { recursive: true });

  const commitSha = await git(["rev-parse", "HEAD"]);
  const branch = await git(["branch", "--show-current"]);
  const trackedChanges = await git([
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  if (args.apply && trackedChanges) {
    throw new Error(
      "apply mode requires a clean tracked working tree so the producing commit is exact",
    );
  }

  const runPlan = {
    pipeline_version: PIPELINE_VERSION,
    run_key: runKey,
    mode: args.apply ? "apply" : "dry_run",
    commit_sha: commitSha,
    branch,
    created_at: new Date().toISOString(),
    phases: args.skipIngest
      ? ["publication", "health"]
      : ["warehouse_current_sync", "publication", "health"],
    settings: {
      request_ceiling: args.requestCeiling,
      publication_limit: args.publicationLimit,
      freshness_hours: args.freshnessHours,
    },
    boundaries: {
      canonical_identity_writes: false,
      vault_writes: false,
      synthetic_value_calculation: false,
      source_warehouse_writes: args.apply && !args.skipIngest,
      qualification_decision_writes: args.apply,
      immutable_publication_snapshot_writes: args.apply,
    },
  };

  if (await exists(runPlanPath)) {
    const existingPlan = await readJson(runPlanPath);
    if (
      existingPlan.commit_sha !== commitSha ||
      existingPlan.mode !== runPlan.mode
    ) {
      throw new Error(
        "resume refused because commit SHA or mode differs from the frozen run plan",
      );
    }
  } else {
    await writeJson(runPlanPath, runPlan);
  }

  const state = (await exists(statePath))
    ? await readJson(statePath)
    : {
        pipeline_version: PIPELINE_VERSION,
        run_key: runKey,
        status: "running",
        started_at: new Date().toISOString(),
        commit_sha: commitSha,
        phases: {},
      };

  if (!args.skipIngest) {
    const warehouseArgs = [
      path.join("scripts", "workers", "tcgcsv_full_source_warehouse_worker_v1.mjs"),
      "--mode=current",
      args.apply ? "--apply" : "--dry-run",
      `--resume-run-key=${runKey}-warehouse`,
      `--request-ceiling=${args.requestCeiling}`,
      `--out-dir=${path.join(runDir, "warehouse")}`,
    ];
    await runPhase({
      phase: "warehouse_current_sync",
      command: process.execPath,
      args: warehouseArgs,
      runDir,
      state,
      statePath,
    });
  }

  const publicationArgs = [
    path.join("scripts", "workers", "tcgplayer_market_publication_worker_v1.mjs"),
    args.apply ? "--apply" : "--dry-run",
    `--run-key=${runKey}-publication`,
    `--out-root=${path.join(runDir, "publication")}`,
    `--freshness-hours=${args.freshnessHours}`,
  ];
  if (args.publicationLimit !== null) {
    publicationArgs.push(`--limit=${args.publicationLimit}`);
  }
  await runPhase({
    phase: "publication",
    command: process.execPath,
    args: publicationArgs,
    runDir,
    state,
    statePath,
  });

  const healthArgs = [
    path.join("scripts", "workers", "tcgplayer_market_health_v1.mjs"),
    `--run-key=${runKey}-publication`,
    `--out-root=${path.join(runDir, "health")}`,
    `--max-source-age-hours=${args.freshnessHours}`,
    args.apply ? "--minimum-current-prices=1" : "--minimum-current-prices=0",
  ];
  await runPhase({
    phase: "health",
    command: process.execPath,
    args: healthArgs,
    runDir,
    state,
    statePath,
  });

  state.status = "completed";
  state.finished_at = new Date().toISOString();
  await writeJson(statePath, state);
  const hashes = {
    run_plan_sha256: await sha256File(runPlanPath),
    pipeline_state_sha256: await sha256File(statePath),
  };
  await writeJson(path.join(runDir, "artifact_hashes.json"), hashes);
  process.stdout.write(
    `${JSON.stringify(
      {
        pipeline_version: PIPELINE_VERSION,
        run_key: runKey,
        status: state.status,
        mode: runPlan.mode,
        commit_sha: commitSha,
        artifact_dir: relative(runDir),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  console.error(`[market-pipeline] ${error.stack || error.message}`);
  process.exitCode = 1;
});
