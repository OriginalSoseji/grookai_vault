import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RECOVERY_VERSION = "TCGPLAYER_MARKET_INTERRUPTED_RUN_RECOVERY_V1";
const LOCK_NAME = "tcgplayer_market_interrupted_run_recovery_v1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "interrupted_run_recovery",
);

function parseArgs(argv) {
  const values = new Map();
  let apply = false;
  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") apply = false;
    else if (arg.startsWith("--") && arg.includes("=")) {
      const separator = arg.indexOf("=");
      values.set(arg.slice(2, separator), arg.slice(separator + 1).trim());
    }
  }
  const required = [
    "run-id",
    "expected-run-key",
    "expected-git-commit-sha",
    "expected-worker-version",
    "expected-source-sync-run-id",
  ];
  for (const key of required) {
    if (!values.get(key)) throw new Error(`--${key} is required`);
  }
  const expectedPlanFingerprint = values.get("expected-plan-fingerprint") || null;
  if (apply && !expectedPlanFingerprint) {
    throw new Error("--apply requires --expected-plan-fingerprint");
  }
  return {
    apply,
    runId: values.get("run-id"),
    expectedRunKey: values.get("expected-run-key"),
    expectedGitCommitSha: values.get("expected-git-commit-sha").toLowerCase(),
    expectedWorkerVersion: values.get("expected-worker-version"),
    expectedSourceSyncRunId: values.get("expected-source-sync-run-id"),
    expectedCurrentPhase: values.get("expected-current-phase") || null,
    expectedPlanFingerprint,
    reason: values.get("reason") || "worker_process_interrupted",
    outRoot: path.resolve(values.get("out-root") || DEFAULT_OUT_ROOT),
  };
}

function connectionString() {
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

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function safePathSegment(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function loadRun(client, runId, { forUpdate = false } = {}) {
  const result = await client.query(
    `select *
       from public.market_price_pipeline_runs
      where id = $1
      ${forUpdate ? "for update" : ""}`,
    [runId],
  );
  return result.rows[0] ?? null;
}

async function loadDanglingAttempts(client, runId) {
  const result = await client.query(
    `select started.id,
            started.phase_name,
            started.attempt,
            started.started_at,
            started.source_observed_on,
            started.source_artifact_id,
            started.source_artifact_hash,
            started.code_version
       from public.market_price_pipeline_phase_attempts started
      where started.run_id = $1
        and started.state = 'started'
        and not exists (
          select 1
            from public.market_price_pipeline_phase_attempts terminal
           where terminal.run_id = started.run_id
             and terminal.phase_name = started.phase_name
             and terminal.attempt = started.attempt
             and terminal.state in ('succeeded', 'failed', 'skipped')
        )
      order by started.phase_name, started.attempt, started.created_at, started.id`,
    [runId],
  );
  return result.rows;
}

function assertExpectedRun(run, danglingAttempts, args) {
  if (!run) throw new Error(`pipeline run not found: ${args.runId}`);
  const mismatches = [];
  if (run.run_key !== args.expectedRunKey) mismatches.push("run_key");
  if (run.git_commit_sha !== args.expectedGitCommitSha) mismatches.push("git_commit_sha");
  if (run.worker_version !== args.expectedWorkerVersion) mismatches.push("worker_version");
  if (run.source_sync_run_id !== args.expectedSourceSyncRunId) {
    mismatches.push("source_sync_run_id");
  }
  if (args.expectedCurrentPhase && run.current_phase !== args.expectedCurrentPhase) {
    mismatches.push("current_phase");
  }
  if (!new Set(["running", "qualified", "reconciled"]).has(run.state)) {
    mismatches.push("recoverable_state");
  }
  if (!danglingAttempts.length) mismatches.push("dangling_phase_attempts");
  if (mismatches.length) {
    throw new Error(`recovery preflight mismatch: ${mismatches.join(",")}`);
  }
}

function recoveryPlan(run, danglingAttempts, args) {
  const immutable = {
    recovery_version: RECOVERY_VERSION,
    run_id: run.id,
    run_key: run.run_key,
    source_sync_run_id: run.source_sync_run_id,
    producing_git_commit_sha: run.git_commit_sha,
    producing_worker_version: run.worker_version,
    current_state: run.state,
    current_phase: run.current_phase,
    reason: args.reason,
    dangling_attempts: danglingAttempts.map((attempt) => ({
      id: attempt.id,
      phase_name: attempt.phase_name,
      attempt: Number(attempt.attempt),
      started_at: attempt.started_at,
      code_version: attempt.code_version,
    })),
    mutations: {
      append_terminal_phase_attempts: danglingAttempts.length,
      terminalize_exact_pipeline_run: 1,
      deletes: 0,
      source_rows: 0,
      publication_rows: 0,
      activation_rows: 0,
      canonical_rows: 0,
      vault_rows: 0,
    },
  };
  return {
    ...immutable,
    plan_fingerprint: sha256(immutable),
  };
}

async function applyRecovery(client, plan, args) {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_NAME]);
    const run = await loadRun(client, args.runId, { forUpdate: true });
    const danglingAttempts = await loadDanglingAttempts(client, args.runId);
    assertExpectedRun(run, danglingAttempts, args);
    const lockedPlan = recoveryPlan(run, danglingAttempts, args);
    if (lockedPlan.plan_fingerprint !== args.expectedPlanFingerprint) {
      throw new Error(
        `recovery plan fingerprint changed: expected=${args.expectedPlanFingerprint} actual=${lockedPlan.plan_fingerprint}`,
      );
    }

    const completedAt = new Date().toISOString();
    const inserted = [];
    for (const attempt of danglingAttempts) {
      const result = await client.query(
        `insert into public.market_price_pipeline_phase_attempts (
           run_id, run_key, phase_name, attempt, state,
           source_observed_on, source_artifact_id, source_artifact_hash,
           started_at, completed_at, error_classification, error,
           resumability_data, code_version
         )
         values (
           $1, $2, $3, $4, 'failed',
           $5, $6, $7, $8, $9, 'worker_process_interrupted', $10,
           $11::jsonb, $12
         )
         returning id, phase_name, attempt, state, completed_at`,
        [
          run.id,
          run.run_key,
          attempt.phase_name,
          Number(attempt.attempt),
          attempt.source_observed_on,
          attempt.source_artifact_id,
          attempt.source_artifact_hash,
          attempt.started_at,
          completedAt,
          `Prior worker terminated without a terminal phase state: ${args.reason}`,
          JSON.stringify({
            recovery_version: RECOVERY_VERSION,
            recovery_plan_fingerprint: lockedPlan.plan_fingerprint,
            interrupted_started_attempt_id: attempt.id,
            recovery_reason: args.reason,
          }),
          RECOVERY_VERSION,
        ],
      );
      inserted.push(result.rows[0]);
    }

    await client.query(
      `update public.market_price_pipeline_runs
          set state = 'failed',
              failed_at = $2,
              error_classification = 'worker_process_interrupted',
              error = $3,
              resumability_data = coalesce(resumability_data, '{}'::jsonb) || $4::jsonb
        where id = $1`,
      [
        run.id,
        completedAt,
        `Run terminalized after confirmed worker interruption: ${args.reason}`,
        JSON.stringify({
          recovery_version: RECOVERY_VERSION,
          recovery_plan_fingerprint: lockedPlan.plan_fingerprint,
          recovered_at: completedAt,
          recovery_reason: args.reason,
          terminal_phase_attempt_ids: inserted.map((row) => row.id),
        }),
      ],
    );
    await client.query("commit");
    return inserted;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) throw new Error("SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required");
  const outDir = path.join(args.outRoot, safePathSegment(args.runId));
  await fs.mkdir(outDir, { recursive: true });
  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    query_timeout: 120_000,
    statement_timeout: 120_000,
  });
  await client.connect();
  try {
    const before = await loadRun(client, args.runId);
    const danglingBefore = await loadDanglingAttempts(client, args.runId);
    assertExpectedRun(before, danglingBefore, args);
    const plan = recoveryPlan(before, danglingBefore, args);
    await writeJson(path.join(outDir, "recovery_plan.json"), {
      ...plan,
      mode: args.apply ? "apply" : "dry_run",
      generated_at: new Date().toISOString(),
    });
    if (!args.apply) {
      process.stdout.write(`${JSON.stringify({ status: "planned", artifact_dir: outDir, ...plan }, null, 2)}\n`);
      return;
    }
    if (plan.plan_fingerprint !== args.expectedPlanFingerprint) {
      throw new Error(
        `recovery plan fingerprint mismatch: expected=${args.expectedPlanFingerprint} actual=${plan.plan_fingerprint}`,
      );
    }
    const inserted = await applyRecovery(client, plan, args);
    const after = await loadRun(client, args.runId);
    const danglingAfter = await loadDanglingAttempts(client, args.runId);
    const report = {
      recovery_version: RECOVERY_VERSION,
      status: after?.state === "failed" && danglingAfter.length === 0 ? "terminalized" : "mismatch",
      plan_fingerprint: plan.plan_fingerprint,
      run_before: before,
      appended_terminal_attempts: inserted,
      run_after: after,
      dangling_attempts_after: danglingAfter,
      boundaries: plan.mutations,
      completed_at: new Date().toISOString(),
    };
    await writeJson(path.join(outDir, "recovery_report.json"), report);
    const reportHash = sha256(report);
    await fs.writeFile(path.join(outDir, "recovery_report.sha256"), `${reportHash}  recovery_report.json\n`);
    if (report.status !== "terminalized") throw new Error("recovery readback mismatch");
    process.stdout.write(`${JSON.stringify({ ...report, artifact_dir: outDir, report_sha256: reportHash }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[tcgplayer-market-recovery] ${error.stack || error.message}`);
  process.exitCode = 1;
});
