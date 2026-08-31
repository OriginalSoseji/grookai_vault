import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import pg from "pg";

import "../../backend/env.mjs";
import { evaluateTcgcsvCachedSourceContinuityV1 } from "../../backend/pricing/tcgcsv_cached_source_continuity_v1.mjs";
import { isTcgcsvSourceBlockedErrorV1 } from "../../backend/pricing/tcgcsv_source_fetch_retry_policy_v1.mjs";

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
const FULL_SYNC_REQUEST_CEILING = 10_000;
const DEFAULT_PHASE_TIMEOUT_MINUTES = 240;
const FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES = 90;
const DEFAULT_DATABASE_TIMEOUT_MINUTES = 20;
const MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES = 10;
const { Client } = pg;

function parseArgs(argv) {
  const args = {
    runMode: "dry_run",
    runKey: null,
    outRoot: DEFAULT_OUT_ROOT,
    skipIngest: false,
    requestCeiling: FULL_SYNC_REQUEST_CEILING,
    phaseTimeoutMinutes: Number.parseInt(
      process.env.TCGPLAYER_MARKET_PHASE_TIMEOUT_MINUTES ||
        String(DEFAULT_PHASE_TIMEOUT_MINUTES),
      10,
    ),
    databaseTimeoutMinutes: Number.parseInt(
      process.env.TCGPLAYER_MARKET_DATABASE_TIMEOUT_MINUTES ||
        String(DEFAULT_DATABASE_TIMEOUT_MINUTES),
      10,
    ),
    freshnessHours: 36,
    publicationLimit: null,
    canaryDefinitionPath: null,
  };

  for (const arg of argv) {
    if (arg === "--apply" || arg === "--run" || arg === "--production") {
      args.runMode = "production";
    } else if (arg === "--dry-run") args.runMode = "dry_run";
    else if (arg === "--shadow") args.runMode = "shadow";
    else if (arg === "--canary") args.runMode = "canary";
    else if (arg.startsWith("--mode=")) {
      args.runMode = arg.slice("--mode=".length).trim();
    } else if (arg === "--skip-ingest") args.skipIngest = true;
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
    } else if (arg.startsWith("--phase-timeout-minutes=")) {
      args.phaseTimeoutMinutes = Number.parseInt(
        arg.slice("--phase-timeout-minutes=".length),
        10,
      );
    } else if (arg.startsWith("--database-timeout-minutes=")) {
      args.databaseTimeoutMinutes = Number.parseInt(
        arg.slice("--database-timeout-minutes=".length),
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
    } else if (arg.startsWith("--canary-definition=")) {
      args.canaryDefinitionPath = path.resolve(
        arg.slice("--canary-definition=".length),
      );
    }
  }

  if (!Number.isInteger(args.requestCeiling) || args.requestCeiling < 1) {
    throw new Error("--request-ceiling must be a positive integer");
  }
  if (!args.skipIngest && args.requestCeiling < FULL_SYNC_REQUEST_CEILING) {
    throw new Error(
      `full warehouse sync requires --request-ceiling >= ${FULL_SYNC_REQUEST_CEILING}`,
    );
  }
  if (
    !Number.isInteger(args.phaseTimeoutMinutes) ||
    args.phaseTimeoutMinutes < 1
  ) {
    throw new Error("--phase-timeout-minutes must be a positive integer");
  }
  if (
    !Number.isInteger(args.databaseTimeoutMinutes) ||
    args.databaseTimeoutMinutes < MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES
  ) {
    throw new Error(
      `write modes require --database-timeout-minutes >= ${MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES}`,
    );
  }
  if (
    !args.skipIngest &&
    args.phaseTimeoutMinutes < FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES
  ) {
    throw new Error(
      `full warehouse sync requires --phase-timeout-minutes >= ${FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES}`,
    );
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
  if (args.runMode === "production" && args.publicationLimit !== null) {
    throw new Error(
      "production mode forbids --publication-limit; full rollout must evaluate the complete eligible scope",
    );
  }
  if (!new Set(["dry_run", "shadow", "canary", "production"]).has(args.runMode)) {
    throw new Error("--mode must be dry_run, shadow, canary, or production");
  }
  if (args.runMode === "canary" && !args.canaryDefinitionPath) {
    throw new Error("canary mode requires --canary-definition");
  }
  if (args.canaryDefinitionPath && args.publicationLimit !== null) {
    throw new Error(
      "exact canary definition modes forbid first-N --publication-limit",
    );
  }
  if (
    args.canaryDefinitionPath &&
    !new Set(["dry_run", "canary"]).has(args.runMode)
  ) {
    throw new Error(
      "--canary-definition is only valid in dry_run or canary mode",
    );
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

function databaseUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

async function latestCompletedSourceRun() {
  const url = databaseUrl();
  if (!url) throw new Error("cached source continuity check requires a database URL");
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
  });
  await client.connect();
  try {
    const result = await client.query(
      `select run_key, status, source_marker, finished_at, price_row_count, failed_count
         from public.tcgcsv_source_sync_runs
        where sync_mode = 'current_full_sync'
          and status = 'completed'
          and failed_count = 0
          and finished_at is not null
        order by finished_at desc, created_at desc, id desc
        limit 1`,
    );
    return result.rows[0] ?? null;
  } finally {
    await client.end().catch(() => {});
  }
}

async function runPhase({
  phase,
  command,
  args,
  runDir,
  state,
  statePath,
  timeoutMs,
}) {
  const startedAt = new Date().toISOString();
  const attempt = Number(state.phases[phase]?.attempt ?? 0) + 1;
  state.phases[phase] = {
    status: "running",
    attempt,
    started_at: startedAt,
    command: [command, ...args],
  };
  await writeJson(statePath, state);

  try {
    const result = await execFileAsync(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
    const stdoutPath = path.join(
      runDir,
      `${phase}.attempt_${attempt}.stdout.log`,
    );
    const stderrPath = path.join(
      runDir,
      `${phase}.attempt_${attempt}.stderr.log`,
    );
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
    const stdoutPath = path.join(
      runDir,
      `${phase}.attempt_${attempt}.stdout.log`,
    );
    const stderrPath = path.join(
      runDir,
      `${phase}.attempt_${attempt}.stderr.log`,
    );
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
  const writeMode = args.runMode !== "dry_run";
  const activationMode = new Set(["canary", "production"]).has(args.runMode);
  const runKey =
    args.runKey ||
    `TCGPLAYER-MARKET-PIPELINE-${args.runMode.toUpperCase()}-${timestamp()}`;
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
  if (writeMode && trackedChanges) {
    throw new Error(
      "apply mode requires a clean tracked working tree so the producing commit is exact",
    );
  }

  const runPlan = {
    pipeline_version: PIPELINE_VERSION,
    run_key: runKey,
    mode: args.runMode,
    commit_sha: commitSha,
    branch,
    created_at: new Date().toISOString(),
    phases: args.skipIngest
      ? ["active_ask_refresh", "publication", "health"]
      : [
          "warehouse_current_sync",
          "active_ask_refresh",
          "publication",
          "health",
        ],
    settings: {
      request_ceiling: args.requestCeiling,
      phase_timeout_minutes: args.phaseTimeoutMinutes,
      database_timeout_minutes: args.databaseTimeoutMinutes,
      publication_limit: args.publicationLimit,
      canary_definition_path: args.canaryDefinitionPath
        ? relative(args.canaryDefinitionPath)
        : null,
      freshness_hours: args.freshnessHours,
      phase_state_authority: "database",
      source_block_policy: "circuit_break_then_fresh_completed_cache_only",
    },
    boundaries: {
      canonical_identity_writes: false,
      vault_writes: false,
      synthetic_value_calculation: false,
      source_warehouse_writes: writeMode && !args.skipIngest,
      qualification_decision_writes: writeMode,
      immutable_publication_snapshot_writes: writeMode,
      current_publication_activation: activationMode,
    },
  };

  if (await exists(runPlanPath)) {
    const existingPlan = await readJson(runPlanPath);
    const frozenFields = [
      "commit_sha",
      "branch",
      "mode",
      "phases",
      "settings",
      "boundaries",
    ];
    const mismatches = frozenFields.filter(
      (field) =>
        JSON.stringify(existingPlan[field]) !== JSON.stringify(runPlan[field]),
    );
    if (mismatches.length) {
      throw new Error(
        `resume refused because frozen run-plan fields changed: ${mismatches.join(",")}`,
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
  state.status = "running";
  delete state.finished_at;
  await writeJson(statePath, state);

  if (!args.skipIngest) {
    const warehouseArgs = [
      path.join("scripts", "workers", "tcgcsv_full_source_warehouse_worker_v1.mjs"),
      "--mode=current",
      writeMode ? "--apply" : "--dry-run",
      `--resume-run-key=${runKey}-warehouse`,
      `--request-ceiling=${args.requestCeiling}`,
      `--out-dir=${path.join(runDir, "warehouse")}`,
    ];
    try {
      await runPhase({
        phase: "warehouse_current_sync",
        command: process.execPath,
        args: warehouseArgs,
        runDir,
        state,
        statePath,
        timeoutMs: args.phaseTimeoutMinutes * 60 * 1000,
      });
    } catch (error) {
      if (!isTcgcsvSourceBlockedErrorV1(error)) throw error;
      const cachedSource = await latestCompletedSourceRun();
      const continuity = evaluateTcgcsvCachedSourceContinuityV1(cachedSource, {
        maxAgeHours: args.freshnessHours,
      });
      if (!continuity.accepted) {
        throw new Error(
          `[TCGCSV_SOURCE_BLOCKED] cached source continuation refused: ${continuity.findings.join(",")}`,
          { cause: error },
        );
      }
      state.status = "running";
      delete state.finished_at;
      state.source_continuity = continuity;
      state.phases.warehouse_current_sync = {
        ...state.phases.warehouse_current_sync,
        status: "degraded_cached_source",
        provider_condition: "source_blocked",
        cached_source: continuity,
        recovered_at: new Date().toISOString(),
      };
      await writeJson(statePath, state);
      process.stdout.write(
        `[market-pipeline] phase=warehouse_current_sync status=degraded_cached_source source_run=${continuity.source_run_key}\n`,
      );
    }
  }

  const activeAskArgs = [
    path.join(
      "scripts",
      "workers",
      "tcgplayer_market_active_ask_refresh_v1.mjs",
    ),
    activationMode ? "--apply" : "--dry-run",
    `--out-root=${path.join(runDir, "active_ask_refresh")}`,
    `--timeout-minutes=${args.databaseTimeoutMinutes}`,
  ];
  await runPhase({
    phase: "active_ask_refresh",
    command: process.execPath,
    args: activeAskArgs,
    runDir,
    state,
    statePath,
    timeoutMs: args.phaseTimeoutMinutes * 60 * 1000,
  });

  const publicationArgs = [
    path.join("scripts", "workers", "tcgplayer_market_publication_worker_v1.mjs"),
    `--mode=${args.runMode}`,
    `--run-key=${runKey}-publication`,
    `--out-root=${path.join(runDir, "publication")}`,
    `--freshness-hours=${args.freshnessHours}`,
    `--database-timeout-minutes=${args.databaseTimeoutMinutes}`,
  ];
  if (args.publicationLimit !== null) {
    publicationArgs.push(`--limit=${args.publicationLimit}`);
  }
  if (args.canaryDefinitionPath) {
    publicationArgs.push(
      `--canary-definition=${args.canaryDefinitionPath}`,
    );
  }
  await runPhase({
    phase: "publication",
    command: process.execPath,
    args: publicationArgs,
    runDir,
    state,
    statePath,
    timeoutMs: args.phaseTimeoutMinutes * 60 * 1000,
  });

  const healthArgs = [
    path.join("scripts", "workers", "tcgplayer_market_health_v1.mjs"),
    `--run-key=${runKey}-publication`,
    `--out-root=${path.join(runDir, "health")}`,
    `--max-source-age-hours=${args.freshnessHours}`,
    activationMode ? "--minimum-current-prices=1" : "--minimum-current-prices=0",
  ];
  await runPhase({
    phase: "health",
    command: process.execPath,
    args: healthArgs,
    runDir,
    state,
    statePath,
    timeoutMs: args.phaseTimeoutMinutes * 60 * 1000,
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
        source_continuity: state.source_continuity ?? null,
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
