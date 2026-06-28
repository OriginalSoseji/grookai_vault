import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

import "../../backend/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const LOCK_KEY = "grookai_mee_post_ingest_orchestrator_v1";

const REQUIRED_FILES = [
  "docs/contracts/MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1.md",
  "docs/sql/mee_nightly_post_ingest_orchestrator_v1_preflight.sql",
  "docs/sql/mee_nightly_post_ingest_orchestrator_v1_readback.sql",
  "docs/sql/mee_core_fast_post_ingest_review_readback_v1.sql",
  "docs/sql/mee_candidate_evidence_cleanup_policy_v1_preflight.sql",
  "docs/sql/mee_candidate_cleanup_event_seed_v1_preflight.sql",
  "docs/sql/mee_candidate_cleanup_event_seed_v1_readback.sql",
  "docs/sql/mee_blocker_policy_closeout_v1_readback.sql",
  "docs/sql/mee_lifecycle_rollup_summary_refresh_v1.sql",
  "scripts/audits/market_evidence_lifecycle_backfill_batch_plan_v1.mjs",
  "scripts/audits/market_evidence_lifecycle_remaining_drain_v1.mjs",
  "scripts/audits/market_evidence_foundation_complete_v2.mjs",
];

const PHASES = [
  {
    key: "preflight_readback",
    mode: "readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_nightly_post_ingest_orchestrator_v1_preflight.sql"],
    readOnly: true,
  },
  {
    key: "fast_post_ingest_review_readback",
    mode: "readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_core_fast_post_ingest_review_readback_v1.sql"],
    readOnly: true,
  },
  {
    key: "lifecycle_projection_plan",
    mode: "plan",
    command: ["node", "scripts/audits/market_evidence_lifecycle_backfill_batch_plan_v1.mjs"],
    readOnly: true,
    localArtifacts: true,
    requiresLegacyCliPlanner: true,
  },
  {
    key: "lifecycle_projection_apply_gate",
    mode: "internal_write",
    command: ["node", "scripts/audits/market_evidence_lifecycle_remaining_drain_v1.mjs", "--continue"],
    internalWrites: true,
  },
  {
    key: "candidate_cleanup_classification_preflight",
    mode: "readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_candidate_evidence_cleanup_policy_v1_preflight.sql"],
    readOnly: true,
  },
  {
    key: "cleanup_event_seed_preflight",
    mode: "readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_candidate_cleanup_event_seed_v1_preflight.sql"],
    readOnly: true,
  },
  {
    key: "cleanup_event_seed_apply_gate",
    mode: "internal_write_sql_directory",
    sqlDirectory: "docs/sql/mee_candidate_cleanup_event_seed_v1",
    internalWrites: true,
  },
  {
    key: "cleanup_event_seed_readback",
    mode: "readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_candidate_cleanup_event_seed_v1_readback.sql"],
    readOnly: true,
  },
  {
    key: "blocker_policy_closeout",
    mode: "readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_blocker_policy_closeout_v1_readback.sql"],
    readOnly: true,
  },
  {
    key: "lifecycle_rollup_summary_refresh",
    mode: "derived_internal_refresh",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_lifecycle_rollup_summary_refresh_v1.sql"],
    internalWrites: true,
    derivedRefresh: true,
  },
  {
    key: "publication_gate_recheck",
    mode: "readback",
    command: ["supabase", "db", "query", "--linked", "-f", "docs/sql/mee_nightly_post_ingest_orchestrator_v1_readback.sql"],
    readOnly: true,
  },
  {
    key: "foundation_checkpoint",
    mode: "checkpoint",
    command: ["node", "scripts/audits/market_evidence_foundation_complete_v2.mjs"],
    readOnly: true,
    localArtifacts: true,
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
  const executeReadbacks = argv.includes("--execute-readbacks") || run;
  const allowInternalWrites = argv.includes("--allow-internal-writes") && process.env.MEE_POST_INGEST_ALLOW_INTERNAL_WRITES === "1";
  const runKey =
    argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length) ??
    `MEE-POST-INGEST-${new Date().toISOString().slice(0, 10)}`;
  return { run, dryRun, executeReadbacks, allowInternalWrites, runKey };
}

function commandText(command) {
  return command.join(" ");
}

function runCommand(command, timeoutMs = 1000 * 60 * 60 * 3) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
    timeout: timeoutMs,
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    command: commandText(command),
    status: result.status,
    signal: result.signal,
    stdout_tail: (result.stdout ?? "").slice(-6000),
    stderr_tail: (result.stderr ?? "").slice(-6000),
  };
}

async function queryPostgres(sql) {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) return null;
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const result = await client.query(sql);
    return {
      command: "postgres_direct_query",
      status: 0,
      stdout_tail: JSON.stringify({ rows: result.rows }).slice(-6000),
      stderr_tail: "",
    };
  } catch (error) {
    return {
      command: "postgres_direct_query",
      status: 1,
      stdout_tail: "",
      stderr_tail: String(error?.message ?? error).slice(-6000),
    };
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore close failures after query/connect errors.
    }
  }
}

async function runSqlText(sql) {
  const direct = await queryPostgres(sql);
  if (direct) return direct;

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-post-ingest-lock-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    return runCommand(["supabase", "db", "query", "--linked", "-f", tempSql], 1000 * 60 * 2);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runSqlFile(relativePath) {
  const sql = readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
  const direct = await queryPostgres(sql);
  if (direct) return { ...direct, command: `postgres_direct_query ${relativePath}` };
  return runCommand(["supabase", "db", "query", "--linked", "-f", relativePath]);
}

function sqlFilesInDirectory(relativeDirectory) {
  const directory = path.join(REPO_ROOT, relativeDirectory);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => path.join(relativeDirectory, name).replace(/\\/g, "/"));
}

async function runSqlDirectory(relativeDirectory) {
  const files = sqlFilesInDirectory(relativeDirectory);
  const results = [];
  for (const file of files) {
    const result = await runSqlFile(file);
    results.push({ file, ...result });
    if (result.status !== 0) break;
  }
  return {
    command: `supabase db query --linked -f ${relativeDirectory}/*.sql`,
    status: results.every((result) => result.status === 0) ? 0 : 1,
    files: results.map((result) => ({
      file: result.file,
      status: result.status,
      stderr_tail: result.stderr_tail,
    })),
  };
}

function phasePlan(args) {
  return PHASES.map((phase) => ({
    key: phase.key,
    mode: phase.mode,
    command: phase.command ? commandText(phase.command) : phase.sqlDirectory ? `supabase db query --linked -f ${phase.sqlDirectory}/*.sql` : null,
    read_only: Boolean(phase.readOnly),
    local_artifacts: Boolean(phase.localArtifacts),
    internal_writes: Boolean(phase.internalWrites),
    derived_refresh: Boolean(phase.derivedRefresh),
    executes_in_dry_run: false,
    executes_with_readbacks: Boolean(phase.readOnly || phase.localArtifacts),
    requires_internal_write_gate: Boolean(phase.internalWrites && !phase.derivedRefresh),
    requires_derived_refresh_gate: Boolean(phase.derivedRefresh),
  }));
}

function preflight(args) {
  const missingFiles = REQUIRED_FILES.filter((relativePath) => !existsSync(path.join(REPO_ROOT, relativePath)));
  const findings = [];
  if (missingFiles.length) findings.push("required_file_missing");
  if (args.run && process.env.MEE_POST_INGEST_ALLOW_RUN !== "1") findings.push("MEE_POST_INGEST_ALLOW_RUN_not_set_to_1");
  if (args.run && !args.executeReadbacks) findings.push("run_without_readbacks_not_allowed");
  if (args.allowInternalWrites && !args.run) findings.push("internal_writes_requested_without_run");

  return {
    missing_files: missingFiles,
    env: {
      MEE_POST_INGEST_ALLOW_RUN: process.env.MEE_POST_INGEST_ALLOW_RUN === "1",
      MEE_POST_INGEST_ALLOW_INTERNAL_WRITES: process.env.MEE_POST_INGEST_ALLOW_INTERNAL_WRITES === "1",
      SUPABASE_URL_present: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SECRET_KEY_present: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      provider_auth_required: false,
      SUPABASE_ACCESS_TOKEN_present: Boolean(process.env.SUPABASE_ACCESS_TOKEN),
      MEE_POST_INGEST_ALLOW_DERIVED_REFRESH:
        process.env.MEE_POST_INGEST_ALLOW_DERIVED_REFRESH === "1",
      MEE_POST_INGEST_ENABLE_LEGACY_LIFECYCLE_PLAN:
        process.env.MEE_POST_INGEST_ENABLE_LEGACY_LIFECYCLE_PLAN === "1",
    },
    findings,
  };
}

async function acquireLock(args) {
  const sql = `select pg_try_advisory_lock(hashtext('${LOCK_KEY}')) as acquired, '${args.runKey}'::text as run_key;`;
  return runSqlText(sql);
}

async function releaseLock(args) {
  const sql = `select pg_advisory_unlock(hashtext('${LOCK_KEY}')) as released, '${args.runKey}'::text as run_key;`;
  return runSqlText(sql);
}

function shouldRunPhase(phase, args) {
  if (!args.executeReadbacks) return { run: false, reason: "dry_run_plan_only" };
  if (phase.requiresLegacyCliPlanner && process.env.MEE_POST_INGEST_ENABLE_LEGACY_LIFECYCLE_PLAN !== "1") {
    return { run: false, reason: "legacy_lifecycle_planner_disabled" };
  }
  if (phase.derivedRefresh && !args.run) return { run: false, reason: "derived_refresh_requires_run_mode" };
  if (phase.derivedRefresh && process.env.MEE_POST_INGEST_ALLOW_DERIVED_REFRESH !== "1") {
    return { run: false, reason: "derived_refresh_gate_closed" };
  }
  if (phase.internalWrites && !phase.derivedRefresh && !args.allowInternalWrites) {
    return { run: false, reason: "internal_write_gate_closed" };
  }
  return { run: true };
}

async function executePhase(phase) {
  if (phase.sqlDirectory) return runSqlDirectory(phase.sqlDirectory);
  if (phase.command?.[0] === "supabase" && phase.command.includes("-f")) {
    return runSqlFile(phase.command.at(-1));
  }
  return runCommand(phase.command);
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
  const jsonPath = path.join(AUDIT_DIR, `mee_nightly_post_ingest_orchestrator_v1_${stamp}.json`);
  const mdPath = path.join(AUDIT_DIR, `mee_nightly_post_ingest_orchestrator_v1_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return {
    json: path.relative(REPO_ROOT, jsonPath).replace(/\\/g, "/"),
    markdown: path.relative(REPO_ROOT, mdPath).replace(/\\/g, "/"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const preflightResult = preflight(args);
  const execution = [];
  const findings = [...preflightResult.findings];
  let lockAcquired = false;

  try {
  if (args.run && findings.length === 0) {
    const lock = await acquireLock(args);
    lockAcquired = lock.status === 0 && /acquired.*t|true/i.test(lock.stdout_tail);
    execution.push({ phase: "acquire_lock", status: lock.status, command: lock.command, acquired: lockAcquired });
    if (!lockAcquired) findings.push("post_ingest_lock_not_acquired");
  }

  if (findings.length === 0) {
    for (const phase of PHASES) {
      const decision = shouldRunPhase(phase, args);
      if (!decision.run) {
        execution.push({
          phase: phase.key,
          mode: phase.mode,
          skipped: true,
          reason: decision.reason,
          internal_writes: Boolean(phase.internalWrites),
          derived_refresh: Boolean(phase.derivedRefresh),
        });
        continue;
      }
      const result = await executePhase(phase);
      execution.push({
        phase: phase.key,
        mode: phase.mode,
        command: result.command,
        status: result.status,
        stderr_tail: result.stderr_tail,
        internal_writes: Boolean(phase.internalWrites),
        derived_refresh: Boolean(phase.derivedRefresh),
        read_only: Boolean(phase.readOnly),
        files: result.files,
      });
      if (result.status !== 0) {
        findings.push(`phase_failed:${phase.key}`);
        break;
      }
    }
  }
  } finally {
  if (args.run && lockAcquired) {
    const release = await releaseLock(args);
    execution.push({ phase: "release_lock", status: release.status, command: release.command });
    if (release.status !== 0) findings.push("post_ingest_lock_release_failed");
  }
  }

  const boundary = {
  provider_calls: false,
  source_fetches: false,
  db_writes:
    args.run && execution.some((phase) => phase.internal_writes === true && phase.status === 0),
  derived_refresh_writes:
    args.run && execution.some((phase) => phase.derived_refresh === true && phase.status === 0),
  function_invocation: false,
  public_pricing: false,
  app_visible_pricing: false,
  public_price_rollups: false,
  pricing_observations_writes: false,
  ebay_active_prices_latest_writes: false,
  identity_writes: false,
  card_print_writes: false,
  vault_writes: false,
  image_storage_writes: false,
  migrations: false,
  global_apply: false,
  };

  const payload = {
  package_id: PACKAGE_ID,
  mode: args.run ? (args.allowInternalWrites ? "run_with_internal_write_gate_open" : "run_readbacks_only") : "dry_run_plan_only",
  run_key: args.runKey,
  phase_plan: phasePlan(args),
  preflight: preflightResult,
  execution: execution.map((phase) => ({
    phase: phase.phase,
    mode: phase.mode,
    command: phase.command,
    status: phase.status,
    stderr_tail: phase.stderr_tail,
    skipped: phase.skipped,
    reason: phase.reason,
    internal_writes: phase.internal_writes,
    derived_refresh: phase.derived_refresh,
    read_only: phase.read_only,
    acquired: phase.acquired,
    files: phase.files,
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
}

await main();
