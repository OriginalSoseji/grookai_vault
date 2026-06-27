import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PACKAGE_ID = "MEE-NIGHTLY-DROPLET-WORKER-V1";
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const DEFAULT_CALL_CEILING = 4000;
const LOCK_KEY = "grookai_mee_nightly_worker_v1";
const REQUIRED_FILES = [
  "scripts/audits/market_listing_nightly_ingest_run_v1.mjs",
  "scripts/audits/market_evidence_lifecycle_remaining_drain_v1.mjs",
  "scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs",
  "scripts/audits/market_evidence_quality_scoring_read_model_v1.mjs",
  "scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs",
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
    key: "lifecycle_projection_drain",
    command: ["node", "scripts/audits/market_evidence_lifecycle_remaining_drain_v1.mjs", "--continue"],
    dryRunCommand: ["node", "scripts/audits/market_evidence_lifecycle_post_drain_readback_v1.mjs"],
    providerCalls: false,
    dbWrites: true,
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
  const runKey =
    argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length) ??
    `MEE-DROPLET-${new Date().toISOString().slice(0, 10)}`;
  return {
    run,
    dryRun,
    callCeiling,
    runKey,
    skipProvider: argv.includes("--skip-provider"),
    skipApply: argv.includes("--skip-apply"),
  };
}

function fillCommand(command, args) {
  return command.map((part) =>
    part
      .replace("{callCeiling}", String(args.callCeiling))
      .replace("{runKey}", args.runKey),
  );
}

function commandText(command) {
  return command.join(" ");
}

function runCommand(command, timeoutMs = 1000 * 60 * 60 * 6) {
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

function runSupabaseSql(sql) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "mee-nightly-lock-"));
  const tempSql = path.join(tempDir, "query.sql");
  try {
    writeFileSync(tempSql, sql);
    return runCommand(["supabase", "db", "query", "--linked", "-f", tempSql], 1000 * 60 * 3);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function acquireLock(args) {
  const sql = `select pg_try_advisory_lock(hashtext('${LOCK_KEY}')) as acquired, '${args.runKey}'::text as run_key;`;
  const result = runSupabaseSql(sql);
  const acquired = /"acquired"\s*:\s*true/.test(result.stdout_tail);
  return { ...result, acquired };
}

function releaseLock(args) {
  const sql = `select pg_advisory_unlock(hashtext('${LOCK_KEY}')) as released, '${args.runKey}'::text as run_key;`;
  const result = runSupabaseSql(sql);
  const released = /"released"\s*:\s*true/.test(result.stdout_tail);
  return { ...result, released };
}

function phasePlan(args) {
  return PHASES.map((phase) => {
    const selected = args.run ? phase.command : phase.dryRunCommand;
    return {
      key: phase.key,
      command: selected ? commandText(fillCommand(selected, args)) : null,
      run_only: Boolean(phase.runOnly),
      provider_calls: phase.providerCalls,
      db_writes: phase.dbWrites,
      skipped_in_dry_run: !args.run && !phase.dryRunCommand,
    };
  });
}

function preflight(args) {
  const missingFiles = REQUIRED_FILES.filter((relativePath) => !existsSync(path.join(REPO_ROOT, relativePath)));
  const findings = [];
  if (missingFiles.length) findings.push("required_worker_file_missing");
  if (args.run && process.env.MEE_NIGHTLY_ALLOW_RUN !== "1") findings.push("MEE_NIGHTLY_ALLOW_RUN_not_set_to_1");
  if (args.run && args.skipProvider) findings.push("run_requested_with_skip_provider");
  return {
    missing_files: missingFiles,
    env: {
      MEE_NIGHTLY_ALLOW_RUN: process.env.MEE_NIGHTLY_ALLOW_RUN === "1",
      SUPABASE_URL_present: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY_present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
      EBAY_AUTH_PRESENT: Boolean(
        process.env.EBAY_BROWSE_TOKEN || (process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET),
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
    lock = acquireLock(args);
    execution.push({ phase: "acquire_lock", ...lock });
    if (!lock.acquired) findings.push("nightly_worker_lock_not_acquired");
  }

  if (findings.length === 0) {
    for (const phase of PHASES) {
      if (!args.run && !phase.dryRunCommand) {
        execution.push({ phase: phase.key, skipped: true, reason: "run_only_phase_skipped_in_dry_run" });
        continue;
      }
      if (args.skipProvider && phase.providerCalls) {
        execution.push({ phase: phase.key, skipped: true, reason: "skip_provider" });
        continue;
      }
      if (args.skipApply && phase.dbWrites) {
        execution.push({ phase: phase.key, skipped: true, reason: "skip_apply" });
        continue;
      }
      const command = fillCommand(args.run ? phase.command : phase.dryRunCommand, args);
      const result = runCommand(command);
      execution.push({ phase: phase.key, provider_calls: phase.providerCalls, db_writes: phase.dbWrites, ...result });
      if (result.status !== 0) {
        findings.push(`phase_failed:${phase.key}`);
        break;
      }
    }
  }
} finally {
  if (args.run && lock?.acquired) {
    lockRelease = releaseLock(args);
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
  phase_plan: phasePlan(args),
  preflight: preflightResult,
  execution: execution.map((phase) => ({
    phase: phase.phase,
    command: phase.command,
    status: phase.status,
    skipped: phase.skipped,
    reason: phase.reason,
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
