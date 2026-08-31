import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import pg from "pg";

import "../../backend/env.mjs";
import {
  TCGPLAYER_MARKET_OPERATIONS_POLICY_V1,
  classifyMarketPipelineFailureV1,
  parseRetryDelaysV1,
  retryDelayMsV1,
  scheduledStatusForFailureClassificationV1,
} from "../../backend/pricing/tcgplayer_market_operations_policy_v1.mjs";
import {
  loadTcgplayerMarketCanaryDefinitionV1,
} from "../../backend/pricing/tcgplayer_market_canary_definition_v1.mjs";

const { Client } = pg;
const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PIPELINE = path.join(
  REPO_ROOT,
  "scripts",
  "workers",
  "tcgplayer_market_pipeline_v1.mjs",
);
const RUNNER_VERSION = "TCGPLAYER_MARKET_SCHEDULED_RUNNER_V1";
const LOCK_NAME = "tcgplayer_market_scheduled_runner_v1";
const FULL_SYNC_REQUEST_CEILING = 10_000;
const DEFAULT_PHASE_TIMEOUT_MINUTES = 120;
const FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES = 90;
const DEFAULT_DATABASE_TIMEOUT_MINUTES = 20;
const MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES = 10;

function parseArgs(argv) {
  const live = argv.includes("--run");
  const modeArg = argv.find((arg) => arg.startsWith("--mode="));
  const runKeyArg = argv.find((arg) => arg.startsWith("--run-key="));
  const outRootArg = argv.find((arg) => arg.startsWith("--out-root="));
  const maxAttemptsArg = argv.find((arg) => arg.startsWith("--max-attempts="));
  const mode =
    modeArg?.slice("--mode=".length) ||
    process.env.TCGPLAYER_MARKET_SCHEDULE_MODE ||
    "shadow";
  const maxAttempts = Number.parseInt(
    maxAttemptsArg?.slice("--max-attempts=".length) ||
      process.env.TCGPLAYER_MARKET_SCHEDULE_MAX_ATTEMPTS ||
      "3",
    10,
  );
  const retryDelaysSeconds = parseRetryDelaysV1(
    process.env.TCGPLAYER_MARKET_SCHEDULE_RETRY_DELAYS_SECONDS || "60,300",
  );
  const publicationLimitRaw =
    process.env.TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT || "";
  const publicationLimit = publicationLimitRaw
    ? Number.parseInt(publicationLimitRaw, 10)
    : null;
  const canaryDefinitionArg = argv.find((arg) =>
    arg.startsWith("--canary-definition="),
  );
  const canaryDefinitionRaw =
    canaryDefinitionArg?.slice("--canary-definition=".length) ||
    process.env.TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION ||
    "";
  const canaryDefinitionPath = canaryDefinitionRaw
    ? path.resolve(canaryDefinitionRaw)
    : null;
  const requestCeiling = Number.parseInt(
    process.env.TCGPLAYER_MARKET_SCHEDULE_REQUEST_CEILING ||
      String(FULL_SYNC_REQUEST_CEILING),
    10,
  );
  const phaseTimeoutMinutes = Number.parseInt(
    process.env.TCGPLAYER_MARKET_PHASE_TIMEOUT_MINUTES ||
      String(DEFAULT_PHASE_TIMEOUT_MINUTES),
    10,
  );
  const databaseTimeoutMinutes = Number.parseInt(
    process.env.TCGPLAYER_MARKET_DATABASE_TIMEOUT_MINUTES ||
      String(DEFAULT_DATABASE_TIMEOUT_MINUTES),
    10,
  );
  const freshnessHours = Number(
    process.env.TCGPLAYER_MARKET_SCHEDULE_FRESHNESS_HOURS || "36",
  );
  const expectedCommitSha =
    argv
      .find((arg) => arg.startsWith("--expected-commit-sha="))
      ?.slice("--expected-commit-sha=".length)
      .trim()
      .toLowerCase() ||
    (process.env.TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA || "")
      .trim()
      .toLowerCase();
  const outRoot = path.resolve(
    outRootArg?.slice("--out-root=".length) ||
      process.env.TCGPLAYER_MARKET_SCHEDULE_OUT_ROOT ||
      path.join(
        REPO_ROOT,
        "artifacts",
        "market_pricing_product_v1",
        "scheduled",
      ),
  );
  const runKey =
    runKeyArg?.slice("--run-key=".length) ||
    process.env.TCGPLAYER_MARKET_SCHEDULE_RUN_KEY ||
    `TCGPLAYER-MARKET-SCHEDULE-${mode.toUpperCase()}-${new Date()
      .toISOString()
      .slice(0, 10)}`;

  if (!new Set(["shadow", "canary", "production"]).has(mode)) {
    throw new Error("scheduled mode must be shadow, canary, or production");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new Error("max attempts must be an integer from 1 through 5");
  }
  if (
    !Number.isInteger(requestCeiling) ||
    requestCeiling < FULL_SYNC_REQUEST_CEILING
  ) {
    throw new Error(
      `scheduled full warehouse sync requires request ceiling >= ${FULL_SYNC_REQUEST_CEILING}`,
    );
  }
  if (
    !Number.isInteger(phaseTimeoutMinutes) ||
    phaseTimeoutMinutes < FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES
  ) {
    throw new Error(
      `scheduled full warehouse sync requires phase timeout >= ${FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES} minutes`,
    );
  }
  if (
    !Number.isInteger(databaseTimeoutMinutes) ||
    databaseTimeoutMinutes < MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES
  ) {
    throw new Error(
      `scheduled writes require database timeout >= ${MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES} minutes`,
    );
  }
  if (!Number.isFinite(freshnessHours) || freshnessHours <= 0) {
    throw new Error("freshness hours must be positive");
  }
  if (
    publicationLimit !== null &&
    (!Number.isInteger(publicationLimit) || publicationLimit < 1)
  ) {
    throw new Error("publication limit must be a positive integer");
  }
  if (mode === "production" && publicationLimit !== null) {
    throw new Error(
      "scheduled production mode forbids publication limits",
    );
  }
  if (mode === "canary" && !canaryDefinitionPath) {
    throw new Error(
      "scheduled canary mode requires an exact --canary-definition",
    );
  }
  if (mode === "canary" && publicationLimit !== null) {
    throw new Error(
      "scheduled canary mode forbids first-N publication limits",
    );
  }
  if (mode !== "canary" && canaryDefinitionPath) {
    throw new Error(
      "scheduled canary definition is only valid in canary mode",
    );
  }
  return {
    live,
    mode,
    runKey,
    outRoot,
    maxAttempts,
    retryDelaysSeconds,
    publicationLimit,
    canaryDefinitionPath,
    requestCeiling,
    phaseTimeoutMinutes,
    databaseTimeoutMinutes,
    freshnessHours,
    expectedCommitSha,
  };
}

function databaseUrl() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function safeSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function relative(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
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

async function git(args) {
  const result = await execFileAsync("git", args, {
    cwd: REPO_ROOT,
    timeout: 15_000,
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function readPipelineState(pipelineRunDir) {
  try {
    return JSON.parse(
      await fs.readFile(
        path.join(pipelineRunDir, "pipeline_state.json"),
        "utf8",
      ),
    );
  } catch {
    return null;
  }
}

function failedPhase(state) {
  return Object.entries(state?.phases ?? {}).find(
    ([, phase]) => phase?.status === "failed",
  )?.[0] ?? null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireSchedulerLockV1(url, onConnectionError) {
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  client.on("error", onConnectionError);
  try {
    await client.connect();
    const lock = await client.query(
      "select pg_try_advisory_lock(hashtext($1)) as acquired",
      [LOCK_NAME],
    );
    if (!lock.rows[0]?.acquired) {
      throw new Error("scheduled market pipeline overlap lock was not acquired");
    }
    return client;
  } catch (error) {
    client.removeListener("error", onConnectionError);
    await client.end().catch(() => {});
    throw error;
  }
}

async function releaseSchedulerLockV1(client, onConnectionError) {
  if (!client) return;
  await client
    .query("select pg_advisory_unlock(hashtext($1))", [LOCK_NAME])
    .catch(() => {});
  client.removeListener("error", onConnectionError);
  await client.end().catch(() => {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loadedCanary = args.canaryDefinitionPath
    ? await loadTcgplayerMarketCanaryDefinitionV1(
        args.canaryDefinitionPath,
      )
    : null;
  const commitSha = await git(["rev-parse", "HEAD"]);
  const branch = await git(["branch", "--show-current"]);
  const trackedWorktreeClean =
    !(await git(["status", "--porcelain", "--untracked-files=no"]));
  if (args.live) {
    if (!/^[a-f0-9]{40}$/.test(args.expectedCommitSha)) {
      throw new Error(
        "live schedule requires TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA",
      );
    }
    if (commitSha !== args.expectedCommitSha) {
      throw new Error(
        `scheduled producing commit mismatch: ${commitSha}:${args.expectedCommitSha}`,
      );
    }
    if (!trackedWorktreeClean) {
      throw new Error("live schedule requires a clean tracked worktree");
    }
  }
  const runDir = path.join(args.outRoot, safeSegment(args.runKey));
  const pipelineOutRoot = path.join(runDir, "pipeline");
  const pipelineRunDir = path.join(
    pipelineOutRoot,
    safeSegment(args.runKey),
  );
  const runPlanPath = path.join(runDir, "scheduled_run_plan.json");
  const attemptsPath = path.join(runDir, "scheduled_attempts.jsonl");
  const summaryPath = path.join(runDir, "scheduled_summary.json");
  await fs.mkdir(runDir, { recursive: true });

  const plan = {
    runner_version: RUNNER_VERSION,
    operations_policy_version: TCGPLAYER_MARKET_OPERATIONS_POLICY_V1,
    run_key: args.runKey,
    mode: args.mode,
    live: args.live,
    commit_sha: commitSha,
    expected_commit_sha: args.expectedCommitSha || null,
    branch,
    tracked_worktree_clean: trackedWorktreeClean,
    created_at: new Date().toISOString(),
    max_attempts: args.maxAttempts,
    retry_delays_seconds: args.retryDelaysSeconds,
    request_ceiling: args.requestCeiling,
    phase_timeout_minutes: args.phaseTimeoutMinutes,
    database_timeout_minutes: args.databaseTimeoutMinutes,
    freshness_hours: args.freshnessHours,
    publication_limit: args.publicationLimit,
    canary_definition_path: loadedCanary
      ? relative(loadedCanary.absolutePath)
      : null,
    canary_definition_sha256: loadedCanary
      ? createHash("sha256").update(loadedCanary.raw).digest("hex")
      : null,
    canary_id: loadedCanary?.definition.canary_id ?? null,
    canary_expected_count:
      loadedCanary?.definition.expected_count ?? null,
    boundaries: {
      source_sync: args.live,
      qualification_and_snapshot_writes: args.live,
      publication_activation:
        args.live && new Set(["canary", "production"]).has(args.mode),
      canonical_identity_writes: false,
      vault_writes: false,
      modeled_value_writes: false,
    },
  };
  if (await exists(runPlanPath)) {
    const existingPlan = JSON.parse(await fs.readFile(runPlanPath, "utf8"));
    const frozenFields = [
      "commit_sha",
      "expected_commit_sha",
      "branch",
      "tracked_worktree_clean",
      "mode",
      "live",
      "max_attempts",
      "retry_delays_seconds",
      "request_ceiling",
      "phase_timeout_minutes",
      "freshness_hours",
      "publication_limit",
      "canary_definition_path",
      "canary_definition_sha256",
      "canary_id",
      "canary_expected_count",
      "boundaries",
    ];
    const mismatches = frozenFields.filter(
      (field) =>
        JSON.stringify(existingPlan[field]) !== JSON.stringify(plan[field]),
    );
    if (mismatches.length) {
      throw new Error(
        `scheduled resume refused because frozen plan fields changed: ${mismatches.join(",")}`,
      );
    }
  } else {
    await writeJson(runPlanPath, plan);
  }

  if (!args.live) {
    const summary = {
      ...plan,
      status: "dry_run_planned",
      attempt_count: 0,
      artifact_root: relative(runDir),
    };
    await writeJson(summaryPath, summary);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }
  if (process.env.TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN !== "1") {
    throw new Error(
      "TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN=1 is required for scheduled writes",
    );
  }
  if (
    args.mode === "production" &&
    process.env.TCGPLAYER_MARKET_REPLACEMENT_VERIFIED !== "1"
  ) {
    throw new Error(
      "production schedule requires TCGPLAYER_MARKET_REPLACEMENT_VERIFIED=1",
    );
  }

  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  let lockConnectionError = null;
  let activePipelineAbortController = null;
  const onLockConnectionError = (error) => {
    lockConnectionError ??= error;
    activePipelineAbortController?.abort(error);
  };
  let lockClient = await acquireSchedulerLockV1(
    url,
    onLockConnectionError,
  );

  let finalStatus = "failed";
  let finalClassification = "retry_exhausted";
  let completedAttempts = 0;
  try {
    for (let attempt = 1; attempt <= args.maxAttempts; attempt += 1) {
      const startedAt = new Date().toISOString();
      const stdoutPath = path.join(runDir, `attempt_${attempt}.stdout.log`);
      const stderrPath = path.join(runDir, `attempt_${attempt}.stderr.log`);
      const pipelineArgs = [
        PIPELINE,
        `--mode=${args.mode}`,
        `--resume-run-key=${args.runKey}`,
        `--out-root=${pipelineOutRoot}`,
        `--request-ceiling=${args.requestCeiling}`,
        `--phase-timeout-minutes=${args.phaseTimeoutMinutes}`,
        `--database-timeout-minutes=${args.databaseTimeoutMinutes}`,
        `--freshness-hours=${args.freshnessHours}`,
      ];
      if (args.publicationLimit !== null) {
        pipelineArgs.push(`--publication-limit=${args.publicationLimit}`);
      }
      if (loadedCanary) {
        pipelineArgs.push(
          `--canary-definition=${loadedCanary.absolutePath}`,
        );
      }

      const abortController = new AbortController();
      activePipelineAbortController = abortController;
      if (lockConnectionError) {
        abortController.abort(lockConnectionError);
      }
      try {
        const result = await execFileAsync(process.execPath, pipelineArgs, {
          cwd: REPO_ROOT,
          env: process.env,
          timeout: 6 * 60 * 60 * 1000,
          maxBuffer: 128 * 1024 * 1024,
          windowsHide: true,
          signal: abortController.signal,
        });
        if (lockConnectionError) {
          throw new Error(
            `scheduled overlap lock connection lost: ${lockConnectionError.message}`,
          );
        }
        await fs.writeFile(stdoutPath, result.stdout ?? "");
        await fs.writeFile(stderrPath, result.stderr ?? "");
        completedAttempts = attempt;
        finalStatus = "completed";
        finalClassification = "success";
        await fs.appendFile(
          attemptsPath,
          `${JSON.stringify({
            attempt,
            status: "completed",
            started_at: startedAt,
            finished_at: new Date().toISOString(),
            stdout_path: relative(stdoutPath),
            stderr_path: relative(stderrPath),
          })}\n`,
        );
        break;
      } catch (error) {
        const effectiveError = lockConnectionError
          ? Object.assign(
              new Error(
                `scheduled overlap lock connection lost: ${lockConnectionError.message}`,
              ),
              {
                stdout: error.stdout ?? "",
                stderr: [
                  error.stderr,
                  error.stack,
                  lockConnectionError.stack,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            )
          : error;
        await fs.writeFile(stdoutPath, error.stdout ?? "");
        await fs.writeFile(
          stderrPath,
          effectiveError.stderr ?? String(effectiveError.stack ?? effectiveError),
        );
        completedAttempts = attempt;
        const state = await readPipelineState(pipelineRunDir);
        const phase = failedPhase(state);
        const classification = classifyMarketPipelineFailureV1({
          failedPhase: phase,
          errorText: [
            effectiveError.message,
            effectiveError.stdout,
            effectiveError.stderr,
            state?.phases?.[phase]?.error,
          ]
            .filter(Boolean)
            .join("\n"),
        });
        finalClassification = classification.classification;
        finalStatus = scheduledStatusForFailureClassificationV1(
          classification.classification,
        );
        const willRetry =
          classification.retryable && attempt < args.maxAttempts;
        await fs.appendFile(
          attemptsPath,
          `${JSON.stringify({
            attempt,
            status: finalStatus,
            classification: classification.classification,
            retryable: classification.retryable,
            will_retry: willRetry,
            lock_connection_error: lockConnectionError?.message ?? null,
            failed_phase: phase,
            started_at: startedAt,
            finished_at: new Date().toISOString(),
            stdout_path: relative(stdoutPath),
            stderr_path: relative(stderrPath),
          })}\n`,
        );
        if (!willRetry) break;
        if (lockConnectionError) {
          await releaseSchedulerLockV1(lockClient, onLockConnectionError);
          lockClient = null;
          await delay(retryDelayMsV1(args.retryDelaysSeconds, attempt));
          lockConnectionError = null;
          try {
            lockClient = await acquireSchedulerLockV1(
              url,
              onLockConnectionError,
            );
          } catch (reacquireError) {
            finalClassification = "retryable_lock_reacquire_failure";
            await fs.appendFile(
              attemptsPath,
              `${JSON.stringify({
                attempt,
                status: "lock_reacquire_failed",
                classification: finalClassification,
                error: String(reacquireError.message ?? reacquireError),
                finished_at: new Date().toISOString(),
              })}\n`,
            );
            break;
          }
          continue;
        }
        await delay(retryDelayMsV1(args.retryDelaysSeconds, attempt));
      } finally {
        if (activePipelineAbortController === abortController) {
          activePipelineAbortController = null;
        }
      }
    }
  } finally {
    await releaseSchedulerLockV1(lockClient, onLockConnectionError);
  }

  const summary = {
    ...plan,
    status: finalStatus,
    final_classification: finalClassification,
    attempt_count: completedAttempts,
    artifact_root: relative(runDir),
    finished_at: new Date().toISOString(),
  };
  await writeJson(summaryPath, summary);
  await writeJson(path.join(runDir, "artifact_hashes.json"), {
    scheduled_run_plan_sha256: await sha256File(runPlanPath),
    scheduled_attempts_sha256: await sha256File(attemptsPath),
    scheduled_summary_sha256: await sha256File(summaryPath),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (finalStatus === "failed") process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[market-scheduled-runner] ${error.stack || error.message}`);
  process.exitCode = 1;
});
