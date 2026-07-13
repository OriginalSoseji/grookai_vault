import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import "../../backend/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-NIGHTLY-DROPLET-WORKER-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const DEFAULT_CALL_CEILING = 4000;
const LOCK_KEY = "grookai_mee_nightly_worker_v1";
const LOCAL_BIN_DIR = path.join(REPO_ROOT, "node_modules", ".bin");
const REFERENCE_PHASE_KEYS = new Set([
  "tcgcsv_reference_query_plan",
  "tcgcsv_reference_acquisition_batch",
  "tcgcsv_reference_refresh",
  "tcgcsv_reference_normalization",
  "reference_warehouse_delta_writer",
]);
const PREFLIGHT_READBACK_TIMEOUT_MS = Number.parseInt(
  process.env.MEE_PREFLIGHT_READBACK_TIMEOUT_MS ?? String(1000 * 60 * 5),
  10,
);
if (!Number.isFinite(PREFLIGHT_READBACK_TIMEOUT_MS) || PREFLIGHT_READBACK_TIMEOUT_MS <= 0) {
  throw new Error("MEE_PREFLIGHT_READBACK_TIMEOUT_MS must be a positive integer when set.");
}
const REQUIRED_FILES = [
  "scripts/audits/market_listing_nightly_ingest_run_v1.mjs",
  "scripts/audits/market_evidence_normalization_only_runner_v1.mjs",
  "scripts/audits/market_evidence_normalization_gvid_assignment_audit_v1.mjs",
  "scripts/audits/market_evidence_lifecycle_remaining_drain_v1.mjs",
  "scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs",
  "scripts/audits/market_evidence_quality_scoring_read_model_v1.mjs",
  "scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs",
  "docs/sql/mee_variant_assignment_v1_backfill.sql",
  "docs/sql/mee_variant_assignment_v1_readback.sql",
  "docs/sql/mee_variant_read_models_v1_readback.sql",
  "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_preflight.sql",
  "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_apply_candidate.sql",
  "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_readback.sql",
];

const PHASES = [
  {
    key: "preflight_fast_readback",
    command: ["node", "scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs"],
    dryRunCommand: ["node", "scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs"],
    providerCalls: false,
    dbWrites: false,
    timeoutMs: PREFLIGHT_READBACK_TIMEOUT_MS,
    nonBlocking: true,
  },
  {
    key: "listing_ingest",
    command: [
      "node",
      "scripts/audits/market_listing_nightly_ingest_run_v1.mjs",
      "--run",
      "--call-ceiling={callCeiling}",
      "--run-key={runKey}",
    ],
    dryRunCommand: [
      "node",
      "scripts/audits/market_listing_nightly_ingest_run_v1.mjs",
      "--call-ceiling={callCeiling}",
      "--run-key={runKey}",
    ],
    providerCalls: true,
    dbWrites: true,
  },
  {
    key: "normalization_only_reprocess",
    command: [
      "node",
      "scripts/audits/market_evidence_normalization_only_runner_v1.mjs",
      "--run",
    ],
    dryRunCommand: [
      "node",
      "scripts/audits/market_evidence_normalization_only_runner_v1.mjs",
    ],
    providerCalls: false,
    dbWrites: true,
    normalizationOnly: true,
  },
  {
    key: "lifecycle_projection_drain",
    command: ["node", "scripts/audits/market_evidence_lifecycle_remaining_drain_v1.mjs", "--continue"],
    dryRunCommand: ["node", "scripts/audits/market_evidence_lifecycle_post_drain_readback_v1.mjs"],
    providerCalls: false,
    dbWrites: true,
    lifecycleDrain: true,
  },
  {
    key: "variant_assignment_backfill",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_variant_assignment_v1_backfill.sql"],
    dryRunCommand: null,
    providerCalls: false,
    dbWrites: true,
    runOnly: true,
  },
  {
    key: "variant_assignment_readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_variant_assignment_v1_readback.sql"],
    dryRunCommand: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_variant_assignment_v1_readback.sql"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "variant_read_models_readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_variant_read_models_v1_readback.sql"],
    dryRunCommand: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_variant_read_models_v1_readback.sql"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "quality_scoring_readback",
    command: ["node", "scripts/audits/market_evidence_quality_scoring_read_model_v1.mjs"],
    dryRunCommand: ["node", "scripts/audits/market_evidence_quality_scoring_read_model_v1.mjs"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "quality_gate_action_plan",
    command: ["node", "scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs"],
    dryRunCommand: ["node", "scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "quality_gate_action_preflight",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_preflight.sql"],
    dryRunCommand: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_preflight.sql"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "quality_gate_action_apply",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_apply_candidate.sql"],
    dryRunCommand: null,
    providerCalls: false,
    dbWrites: true,
    runOnly: true,
  },
  {
    key: "quality_gate_action_readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_readback.sql"],
    dryRunCommand: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_core_quality_gate_remaining_candidate_actions_v1_readback.sql"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "final_fast_readback",
    command: ["node", "scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs"],
    dryRunCommand: ["node", "scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs"],
    providerCalls: false,
    dbWrites: false,
    timeoutMs: PREFLIGHT_READBACK_TIMEOUT_MS,
  },
  {
    key: "foundation_checkpoint",
    command: ["node", "scripts/audits/market_evidence_foundation_complete_v2.mjs"],
    dryRunCommand: ["node", "scripts/audits/market_evidence_foundation_complete_v2.mjs"],
    providerCalls: false,
    dbWrites: false,
  },
];

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
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function parseArgs(argv) {
  const run = argv.includes("--run");
  const dryRun = argv.includes("--dry-run") || !run;
  const callCeilingRaw = argv.find((arg) => arg.startsWith("--call-ceiling="))?.slice("--call-ceiling=".length);
  const callCeiling = callCeilingRaw ? Number.parseInt(callCeilingRaw, 10) : DEFAULT_CALL_CEILING;
  if (!Number.isFinite(callCeiling) || callCeiling <= 0) {
    throw new Error("--call-ceiling must be a positive integer");
  }
  const referenceLimitRaw = argv.find((arg) => arg.startsWith("--reference-limit="))?.slice("--reference-limit=".length);
  const referenceLimit = referenceLimitRaw
    ? Number.parseInt(referenceLimitRaw, 10)
    : Number.parseInt(process.env.MEE_NIGHTLY_REFERENCE_LIMIT ?? "5000", 10);
  if (!Number.isFinite(referenceLimit) || referenceLimit <= 0) {
    throw new Error("--reference-limit must be a positive integer");
  }
  const runKey =
    argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length) ??
    `MEE-DROPLET-${new Date().toISOString().slice(0, 10)}`;
  return {
    run,
    dryRun,
    callCeiling,
    referenceLimit,
    runKey,
    skipProvider: argv.includes("--skip-provider"),
    skipApply: argv.includes("--skip-apply"),
    lockProbe: argv.includes("--lock-probe"),
    normalizationOnly: argv.includes("--normalization-only") || process.env.MEE_NIGHTLY_NORMALIZATION_ONLY === "1",
    enableLifecycleDrain: argv.includes("--enable-lifecycle-drain") || process.env.MEE_NIGHTLY_ENABLE_LIFECYCLE_DRAIN === "1",
    providerCallsEnabled: process.env.MEE_NIGHTLY_PROVIDER_CALLS_ENABLED === "1",
    maxCallCeiling: Number.parseInt(process.env.MEE_NIGHTLY_MAX_CALL_CEILING ?? String(DEFAULT_CALL_CEILING), 10),
  };
}

function fillCommand(command, args) {
  return command.map((part) =>
    part
      .replace("{callCeiling}", String(args.callCeiling))
      .replace("{referenceLimit}", String(args.referenceLimit))
      .replace("{runKey}", args.runKey),
  );
}

function executionCommand(command) {
  if (
    command[0] === "supabase" &&
    command[1] === "db" &&
    command[2] === "query" &&
    command.includes("--linked") &&
    process.env.SUPABASE_DB_URL
  ) {
    const withoutLinked = command.filter((part) => part !== "--linked");
    const hasOutput = withoutLinked.includes("--output");
    return [
      ...withoutLinked.slice(0, 3),
      ...(hasOutput ? [] : ["--output", "json"]),
      "--db-url",
      process.env.SUPABASE_DB_URL,
      ...withoutLinked.slice(3),
    ];
  }
  return command;
}

function commandText(command) {
  return command
    .map((part) => (part === process.env.SUPABASE_DB_URL ? "<SUPABASE_DB_URL>" : part))
    .join(" ");
}

function translatedCommand(command) {
  const fileIndex = command.indexOf("-f");
  if (
    command[0] === "supabase" &&
    command[1] === "db" &&
    command[2] === "query" &&
    command.includes("--linked") &&
    fileIndex !== -1 &&
    command[fileIndex + 1]
  ) {
    return ["node", "scripts/lib/market_evidence_db_query_v1.mjs", "--file", command[fileIndex + 1]];
  }
  return command;
}

function ensureSupabaseShimDir() {
  const shimDir = path.join(os.tmpdir(), "grookai-mee-nightly-bin");
  mkdirSync(shimDir, { recursive: true });

  if (process.platform === "win32") {
    const shimPath = path.join(shimDir, "supabase.cmd");
    writeFileSync(
      shimPath,
      [
        "@echo off",
        `if exist "${path.join(LOCAL_BIN_DIR, "supabase.cmd")}" "${path.join(LOCAL_BIN_DIR, "supabase.cmd")}" %*`,
        "if not errorlevel 9009 exit /b %errorlevel%",
        "where supabase >nul 2>nul && supabase %* && exit /b %errorlevel%",
        "npx --yes supabase %*",
        "",
      ].join("\r\n"),
    );
    return shimDir;
  }

  const shimPath = path.join(shimDir, "supabase");
  writeFileSync(
    shimPath,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      `LOCAL_SUPABASE="${path.join(LOCAL_BIN_DIR, "supabase")}"`,
      'if [[ -x "${LOCAL_SUPABASE}" ]]; then',
      '  exec "${LOCAL_SUPABASE}" "$@"',
      "fi",
      "for candidate in /usr/local/bin/supabase /usr/bin/supabase; do",
      '  if [[ -x "${candidate}" ]]; then',
      '    exec "${candidate}" "$@"',
      "  fi",
      "done",
      'exec npx --yes supabase "$@"',
      "",
    ].join("\n"),
  );
  chmodSync(shimPath, 0o755);
  return shimDir;
}

function commandEnv() {
  const shimDir = ensureSupabaseShimDir();
  const currentPath = process.env.PATH ?? "";
  return {
    ...process.env,
    PATH: [shimDir, LOCAL_BIN_DIR, currentPath].filter(Boolean).join(path.delimiter),
  };
}

function runCommand(command, timeoutMs = 1000 * 60 * 60 * 6) {
  const actualCommand = executionCommand(translatedCommand(command));
  const result = spawnSync(actualCommand[0], actualCommand.slice(1), {
    cwd: REPO_ROOT,
    env: commandEnv(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: timeoutMs,
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    command: commandText(command),
    actual_command: commandText(actualCommand),
    status: result.status,
    signal: result.signal,
    stdout_tail: (result.stdout ?? "").slice(-6000),
    stderr_tail: (result.stderr ?? "").slice(-6000),
  };
}

function runSupabaseSql(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-nightly-lock-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    const directDbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (directDbUrl) {
      return runCommand(
        ["bash", "-lc", 'psql "${SUPABASE_DB_URL:-${DATABASE_URL:-$POSTGRES_URL}}" -tA -f "$1"', "mee-nightly-psql", tempSql],
        1000 * 60 * 3,
      );
    }
    if (process.env.MEE_NIGHTLY_REQUIRE_DIRECT_DB === "1") {
      throw new Error("MEE_NIGHTLY_REQUIRE_DIRECT_DB is set but no SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is available");
    }
    const targetArgs = ["--linked"];
    return runCommand(["supabase", "db", "query", "--output", "json", ...targetArgs, "-f", tempSql], 1000 * 60 * 3);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function directDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function pgSslConfig(connectionString) {
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function parseJsonTail(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue below.
  }
  for (let index = trimmed.lastIndexOf("{"); index >= 0; index = trimmed.lastIndexOf("{", index - 1)) {
    const candidate = trimmed.slice(index);
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep walking backward until a complete JSON object parses.
    }
  }
  return null;
}

function sumObjectValues(value) {
  return Object.values(value ?? {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
}

function countsFromPhaseResult(phaseKey, result) {
  const parsed = parseJsonTail(result?.stdout_tail);
  const counts = {
    acquired_count: 0,
    candidate_count: 0,
    inserted_count: 0,
    updated_count: 0,
    no_op_count: 0,
    failed_count: result?.status === 0 ? 0 : 1,
    artifact_path: parsed?.artifacts?.json ?? parsed?.artifacts?.jsonPath ?? null,
    payload: parsed ? { child_report: parsed } : {},
  };

  if (phaseKey === "listing_ingest" && parsed?.execution) {
    const fetchPhase = parsed.execution.find((phase) => phase.phase === "daily_batch_fetch");
    const fetchReport = parseJsonTail(fetchPhase?.stdout_tail);
    counts.acquired_count = Number(
      fetchReport?.summary?.fetched_item_count
        ?? fetchReport?.summary?.projected_observation_count
        ?? fetchReport?.summary?.attempted_request_count
        ?? 0,
    );

    const applyPhase = parsed.execution.find((phase) => phase.phase === "daily_batch_backfill_apply");
    const applyReport = parseJsonTail(applyPhase?.stdout_tail);
    if (applyReport?.apply_result) {
      counts.inserted_count = sumObjectValues(applyReport.apply_result.inserted);
      counts.updated_count = sumObjectValues(applyReport.apply_result.updated);
      counts.no_op_count = sumObjectValues(applyReport.apply_result.no_op);
      counts.failed_count = sumObjectValues(applyReport.apply_result.failed) || counts.failed_count;
      counts.candidate_count = counts.inserted_count + counts.updated_count + counts.no_op_count + counts.failed_count;
      counts.payload = {
        ...counts.payload,
        listing_apply_artifacts: applyReport.artifacts ?? null,
        listing_apply_result: applyReport.apply_result,
      };
    }
  }

  if (REFERENCE_PHASE_KEYS.has(phaseKey)) {
    counts.candidate_count = Number(
      parsed?.summary?.candidate_evidence_count
        ?? parsed?.summary?.projected_normalized_rows
        ?? parsed?.summary?.projected_candidate_rows
        ?? parsed?.summary?.target_rows
        ?? 0,
    );
    counts.inserted_count = Number(
      parsed?.apply_result?.inserted_count
        ?? parsed?.apply_result?.inserted
        ?? parsed?.summary?.inserted_count
        ?? 0,
    );
    counts.updated_count = Number(
      parsed?.apply_result?.updated_count
        ?? parsed?.apply_result?.updated
        ?? parsed?.summary?.updated_count
        ?? 0,
    );
    counts.no_op_count = Number(
      parsed?.apply_result?.no_op_count
        ?? parsed?.apply_result?.no_op
        ?? parsed?.summary?.no_op_count
        ?? 0,
    );
  }

  return counts;
}

async function appendPhaseRunLedger({ args, phase, result, phaseStartedAt, skipped = false, reason = null }) {
  if (!args.run || !directDbUrl()) return null;
  const counts = countsFromPhaseResult(phase.key, result);
  const status = skipped
    ? "skipped"
    : result.status === 0
      ? "succeeded"
      : phase.nonBlocking
        ? "warning"
        : "failed";
  const client = new Client({
    connectionString: directDbUrl(),
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    ssl: pgSslConfig(directDbUrl()),
  });
  await client.connect();
  try {
    await client.query(
      `insert into public.market_pricing_pipeline_phase_runs (
         pipeline,
         phase,
         run_key,
         artifact_path,
         started_at,
         finished_at,
         status,
         acquired_count,
         candidate_count,
         inserted_count,
         updated_count,
         no_op_count,
         failed_count,
         error,
         payload
       ) values (
         'mee_nightly',
         $1,
         $2,
         $3,
         $4::timestamptz,
         now(),
         $5,
         $6::int,
         $7::int,
         $8::int,
         $9::int,
         $10::int,
         $11::int,
         $12,
         $13::jsonb
       )`,
      [
        phase.key,
        args.runKey,
        counts.artifact_path,
        phaseStartedAt,
        status,
        counts.acquired_count,
        counts.candidate_count,
        counts.inserted_count,
        counts.updated_count,
        counts.no_op_count,
        counts.failed_count,
        result.stderr_tail || reason || null,
        JSON.stringify({
          command: result.command,
          actual_command: result.actual_command,
          status: result.status,
          signal: result.signal,
          reason,
          stdout_tail: result.stdout_tail,
          stderr_tail: result.stderr_tail,
          ...counts.payload,
        }),
      ],
    );
    return { status: 0, written: true, table: "market_pricing_pipeline_phase_runs" };
  } catch (error) {
    return { status: 1, written: false, error: error.message, table: "market_pricing_pipeline_phase_runs" };
  } finally {
    await client.end().catch(() => {});
  }
}

async function acquireLock(args) {
  const connectionString = directDbUrl();
  if (!connectionString) {
    throw new Error("SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required to hold the nightly DB advisory lock.");
  }
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    ssl: pgSslConfig(connectionString),
  });
  await client.connect();
  try {
    const result = await client.query(
      "select pg_try_advisory_lock(hashtext($1)) as acquired, $2::text as run_key",
      [LOCK_KEY, args.runKey],
    );
    const acquired = result.rows?.[0]?.acquired === true;
    return {
      command: "pg_try_advisory_lock(hashtext($1))",
      actual_command: "node-pg held session advisory lock",
      status: 0,
      acquired,
      run_key: args.runKey,
      lock_client: acquired ? client : null,
    };
  } catch (error) {
    await client.end().catch(() => {});
    throw error;
  }
}

async function releaseLock(lock, args) {
  if (!lock?.lock_client) {
    return {
      command: "pg_advisory_unlock(hashtext($1))",
      actual_command: "node-pg held session advisory lock",
      status: 0,
      released: false,
      reason: "lock_client_missing",
      run_key: args.runKey,
    };
  }
  try {
    const result = await lock.lock_client.query(
      "select pg_advisory_unlock(hashtext($1)) as released, $2::text as run_key",
      [LOCK_KEY, args.runKey],
    );
    return {
      command: "pg_advisory_unlock(hashtext($1))",
      actual_command: "node-pg held session advisory lock",
      status: 0,
      released: result.rows?.[0]?.released === true,
      run_key: args.runKey,
    };
  } finally {
    await lock.lock_client.end().catch(() => {});
  }
}

function phasePlan(args) {
  return PHASES.filter((phase) => args.normalizationOnly || !phase.normalizationOnly).map((phase) => {
    const selected = args.run ? phase.command : phase.dryRunCommand;
    return {
      key: phase.key,
      command: selected ? commandText(fillCommand(selected, args)) : null,
      run_only: Boolean(phase.runOnly),
      provider_calls: phase.providerCalls,
      db_writes: phase.dbWrites,
      non_blocking: Boolean(phase.nonBlocking),
      timeout_ms: phase.timeoutMs ?? null,
      skipped_in_dry_run: !args.run && !phase.dryRunCommand,
    };
  });
}

function preflight(args) {
  const missingFiles = REQUIRED_FILES.filter((relativePath) => !existsSync(path.join(REPO_ROOT, relativePath)));
  const findings = [];
  if (missingFiles.length) findings.push("required_worker_file_missing");
  if (args.run && process.env.MEE_NIGHTLY_ALLOW_RUN !== "1") findings.push("MEE_NIGHTLY_ALLOW_RUN_not_set_to_1");
  if (args.run && !directDbUrl()) findings.push("direct_db_url_required_for_held_advisory_lock");
  if (args.run && args.skipProvider && !args.normalizationOnly) findings.push("run_requested_with_skip_provider");
  if (args.run && !args.providerCallsEnabled && !args.normalizationOnly) findings.push("provider_calls_disabled");
  if (args.run && args.providerCallsEnabled && (!Number.isFinite(args.maxCallCeiling) || args.maxCallCeiling <= 0)) {
    findings.push("invalid_max_call_ceiling");
  }
  if (args.run && args.providerCallsEnabled && args.callCeiling > args.maxCallCeiling) findings.push("call_ceiling_exceeds_max");
  return {
    missing_files: missingFiles,
    env: {
      MEE_NIGHTLY_ALLOW_RUN: process.env.MEE_NIGHTLY_ALLOW_RUN === "1",
      SUPABASE_URL_present: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SECRET_KEY_present: Boolean(process.env.SUPABASE_SECRET_KEY),
      SUPABASE_DB_URL_present: Boolean(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL),
      MEE_NIGHTLY_PROVIDER_CALLS_ENABLED: args.providerCallsEnabled,
      MEE_NIGHTLY_NORMALIZATION_ONLY: args.normalizationOnly,
      MEE_NIGHTLY_MAX_CALL_CEILING: args.maxCallCeiling,
      MEE_NIGHTLY_REFERENCE_LIMIT: args.referenceLimit,
      EBAY_AUTH_PRESENT: Boolean(
        process.env.EBAY_BROWSE_ACCESS_TOKEN || (process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
      ),
    },
    findings,
  };
}

function renderMarkdown(report) {
  return [
    `# ${PACKAGE_ID}`,
    "",
    `- Mode: \`${report.mode}\``,
    `- Run key: \`${report.run_key}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Findings: \`${report.findings.length}\``,
    "",
    "## Phase Plan",
    "",
    "```json",
    JSON.stringify(report.phase_plan, null, 2),
    "```",
    "",
    "## Execution",
    "",
    "```json",
    JSON.stringify(report.execution, null, 2),
    "```",
    "",
    "## Boundary",
    "",
    "```json",
    JSON.stringify(report.boundary, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(AUDIT_DIR, { recursive: true });
  const stamp = report.generated_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(AUDIT_DIR, `mee_nightly_droplet_worker_v1_${stamp}.json`);
  const mdPath = path.join(AUDIT_DIR, `mee_nightly_droplet_worker_v1_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return {
    json: path.relative(REPO_ROOT, jsonPath).replace(/\\/g, "/"),
    markdown: path.relative(REPO_ROOT, mdPath).replace(/\\/g, "/"),
  };
}

const args = parseArgs(process.argv.slice(2));
const startedAt = new Date().toISOString();
const preflightResult = preflight(args);
const execution = [];
const findings = [...preflightResult.findings];
let lock = null;
let lockRelease = null;

try {
  if (args.run && findings.length === 0) {
    lock = await acquireLock(args);
    execution.push({ phase: "acquire_lock", ...Object.fromEntries(Object.entries(lock).filter(([key]) => key !== "lock_client")) });
    if (!lock.acquired) findings.push("nightly_worker_lock_not_acquired");
  }

  if (findings.length === 0 && args.lockProbe) {
    execution.push({ phase: "lock_probe", skipped: true, reason: "lock_probe_only" });
  } else if (findings.length === 0) {
    for (const phase of PHASES) {
      if (phase.normalizationOnly && !args.normalizationOnly) {
        const skipped = { phase: phase.key, skipped: true, reason: "normalization_only_phase_not_requested", status: 0 };
        const ledger = await appendPhaseRunLedger({
          args,
          phase,
          result: { ...skipped, command: null, actual_command: null, stdout_tail: "", stderr_tail: "" },
          phaseStartedAt: new Date().toISOString(),
          skipped: true,
          reason: skipped.reason,
        });
        execution.push({ ...skipped, ledger });
        if (ledger?.status === 1) findings.push(`phase_ledger_write_failed:${phase.key}`);
        continue;
      }
      if (phase.lifecycleDrain && !args.enableLifecycleDrain) {
        const skipped = { phase: phase.key, skipped: true, reason: "lifecycle_drain_not_requested", status: 0 };
        const ledger = await appendPhaseRunLedger({
          args,
          phase,
          result: { ...skipped, command: null, actual_command: null, stdout_tail: "", stderr_tail: "" },
          phaseStartedAt: new Date().toISOString(),
          skipped: true,
          reason: skipped.reason,
        });
        execution.push({ ...skipped, ledger });
        if (ledger?.status === 1) findings.push(`phase_ledger_write_failed:${phase.key}`);
        continue;
      }
      if (args.normalizationOnly && phase.providerCalls) {
        const skipped = { phase: phase.key, skipped: true, reason: "normalization_only_skips_provider_phase", status: 0 };
        const ledger = await appendPhaseRunLedger({
          args,
          phase,
          result: { ...skipped, command: null, actual_command: null, stdout_tail: "", stderr_tail: "" },
          phaseStartedAt: new Date().toISOString(),
          skipped: true,
          reason: skipped.reason,
        });
        execution.push({ ...skipped, ledger });
        if (ledger?.status === 1) findings.push(`phase_ledger_write_failed:${phase.key}`);
        continue;
      }
      if (!args.run && !phase.dryRunCommand) {
        execution.push({ phase: phase.key, skipped: true, reason: "run_only_phase_skipped_in_dry_run" });
        continue;
      }
      if (args.skipProvider && phase.providerCalls) {
        const skipped = { phase: phase.key, skipped: true, reason: "skip_provider", status: 0 };
        const ledger = await appendPhaseRunLedger({
          args,
          phase,
          result: { ...skipped, command: null, actual_command: null, stdout_tail: "", stderr_tail: "" },
          phaseStartedAt: new Date().toISOString(),
          skipped: true,
          reason: skipped.reason,
        });
        execution.push({ ...skipped, ledger });
        if (ledger?.status === 1) findings.push(`phase_ledger_write_failed:${phase.key}`);
        continue;
      }
      if (args.skipApply && phase.dbWrites) {
        const skipped = { phase: phase.key, skipped: true, reason: "skip_apply", status: 0 };
        const ledger = await appendPhaseRunLedger({
          args,
          phase,
          result: { ...skipped, command: null, actual_command: null, stdout_tail: "", stderr_tail: "" },
          phaseStartedAt: new Date().toISOString(),
          skipped: true,
          reason: skipped.reason,
        });
        execution.push({ ...skipped, ledger });
        if (ledger?.status === 1) findings.push(`phase_ledger_write_failed:${phase.key}`);
        continue;
      }
      const command = fillCommand(args.run ? phase.command : phase.dryRunCommand, args);
      const phaseStartedAt = new Date().toISOString();
      const result = runCommand(command, phase.timeoutMs);
      const ledger = await appendPhaseRunLedger({ args, phase, result, phaseStartedAt });
      execution.push({ phase: phase.key, provider_calls: phase.providerCalls, db_writes: phase.dbWrites, ...result, ledger });
      if (ledger?.status === 1) findings.push(`phase_ledger_write_failed:${phase.key}`);
      if (result.status !== 0) {
        if (phase.nonBlocking) {
          execution.push({
            phase: `${phase.key}_warning`,
            skipped: true,
            reason: "non_blocking_preflight_failed",
          });
          continue;
        }
        findings.push(`phase_failed:${phase.key}`);
        if (phase.key === "listing_ingest" || REFERENCE_PHASE_KEYS.has(phase.key)) {
          continue;
        }
        break;
      }
    }
  }
} finally {
  if (args.run && lock?.acquired) {
    lockRelease = await releaseLock(lock, args);
    execution.push({ phase: "release_lock", ...lockRelease });
    if (!lockRelease.released) findings.push("nightly_worker_lock_release_failed");
  }
}

const boundary = {
  provider_calls: args.run && execution.some((phase) => phase.provider_calls === true && phase.status === 0),
  db_writes: args.run && execution.some((phase) => phase.db_writes === true && phase.status === 0),
  public_pricing_views: false,
  app_visible_pricing: false,
  public_price_rollups: false,
  pricing_observations_writes: false,
  ebay_active_prices_latest_writes: false,
  identity_table_writes: false,
  vault_writes: false,
  image_storage_writes: false,
  migrations: false,
  global_apply: false,
};

const payload = {
  package_id: PACKAGE_ID,
  mode: args.run ? "run" : "dry_run",
  run_key: args.runKey,
  call_ceiling: args.callCeiling,
  reference_limit: args.referenceLimit,
  phase_plan: phasePlan(args),
  preflight: preflightResult,
  execution: execution.map((phase) => ({
    phase: phase.phase,
    command: phase.command,
    actual_command: phase.actual_command,
    status: phase.status,
    skipped: phase.skipped,
    reason: phase.reason,
    ledger: phase.ledger,
  })),
  boundary,
  findings,
};

const report = {
  ...payload,
  generated_at: startedAt,
  package_fingerprint_sha256: sha256(payload),
};
report.artifacts = writeReport(report);

console.log(JSON.stringify(report, null, 2));
if (findings.length) process.exitCode = 1;
