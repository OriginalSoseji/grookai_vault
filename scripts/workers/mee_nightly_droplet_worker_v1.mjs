import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const LOCAL_BIN_DIR = path.join(REPO_ROOT, "node_modules", ".bin");
const REQUIRED_FILES = [
  "scripts/audits/market_evidence_engine_query_plan_v1.mjs",
  "scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs",
  "scripts/audits/market_evidence_engine_tcgcsv_reference_acquisition_v1.mjs",
  "scripts/audits/market_evidence_engine_normalized_reference_v1.mjs",
  "scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs",
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
    key: "tcgcsv_reference_query_plan",
    command: [
      "node",
      "scripts/audits/market_evidence_engine_query_plan_v1.mjs",
      "--limit={referenceLimit}",
    ],
    dryRunCommand: [
      "node",
      "scripts/audits/market_evidence_engine_query_plan_v1.mjs",
      "--limit={referenceLimit}",
    ],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "tcgcsv_reference_acquisition_batch",
    command: [
      "node",
      "scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs",
      "--sources=tcgcsv_reference",
      "--limit={referenceLimit}",
    ],
    dryRunCommand: [
      "node",
      "scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs",
      "--sources=tcgcsv_reference",
      "--limit={referenceLimit}",
    ],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "tcgcsv_reference_refresh",
    command: [
      "node",
      "scripts/audits/market_evidence_engine_tcgcsv_reference_acquisition_v1.mjs",
      "--limit={referenceLimit}",
      "--refresh-cache",
    ],
    dryRunCommand: null,
    providerCalls: true,
    dbWrites: false,
  },
  {
    key: "tcgcsv_reference_normalization",
    command: [
      "node",
      "scripts/audits/market_evidence_engine_normalized_reference_v1.mjs",
    ],
    dryRunCommand: [
      "node",
      "scripts/audits/market_evidence_engine_normalized_reference_v1.mjs",
    ],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "reference_warehouse_delta_writer",
    command: [
      "node",
      "scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs",
      "--run",
    ],
    dryRunCommand: [
      "node",
      "scripts/workers/mee_reference_warehouse_delta_writer_v1.mjs",
      "--dry-run",
    ],
    providerCalls: false,
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
    if (process.env.SUPABASE_DB_URL) {
      return runCommand(
        ["bash", "-lc", 'psql "$SUPABASE_DB_URL" -tA -f "$1"', "mee-nightly-psql", tempSql],
        1000 * 60 * 3,
      );
    }
    const targetArgs = ["--linked"];
    return runCommand(["supabase", "db", "query", "--output", "json", ...targetArgs, "-f", tempSql], 1000 * 60 * 3);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function acquireLock(args) {
  const sql = `select json_build_object('acquired', pg_try_advisory_lock(hashtext('${LOCK_KEY}')), 'run_key', '${args.runKey}'::text)::text as result;`;
  const result = runSupabaseSql(sql);
  const acquired = /"acquired"\s*:\s*true/.test(result.stdout_tail);
  return { ...result, acquired };
}

function releaseLock(args) {
  const sql = `select json_build_object('released', pg_advisory_unlock(hashtext('${LOCK_KEY}')), 'run_key', '${args.runKey}'::text)::text as result;`;
  const result = runSupabaseSql(sql);
  const released = /"released"\s*:\s*true/.test(result.stdout_tail);
  return { ...result, released };
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
      skipped_in_dry_run: !args.run && !phase.dryRunCommand,
    };
  });
}

function preflight(args) {
  const missingFiles = REQUIRED_FILES.filter((relativePath) => !existsSync(path.join(REPO_ROOT, relativePath)));
  const findings = [];
  if (missingFiles.length) findings.push("required_worker_file_missing");
  if (args.run && process.env.MEE_NIGHTLY_ALLOW_RUN !== "1") findings.push("MEE_NIGHTLY_ALLOW_RUN_not_set_to_1");
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
    lock = acquireLock(args);
    execution.push({ phase: "acquire_lock", ...lock });
    if (!lock.acquired) findings.push("nightly_worker_lock_not_acquired");
  }

  if (findings.length === 0 && args.lockProbe) {
    execution.push({ phase: "lock_probe", skipped: true, reason: "lock_probe_only" });
  } else if (findings.length === 0) {
    for (const phase of PHASES) {
      if (phase.normalizationOnly && !args.normalizationOnly) {
        execution.push({ phase: phase.key, skipped: true, reason: "normalization_only_phase_not_requested" });
        continue;
      }
      if (args.normalizationOnly && phase.providerCalls) {
        execution.push({ phase: phase.key, skipped: true, reason: "normalization_only_skips_provider_phase" });
        continue;
      }
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
