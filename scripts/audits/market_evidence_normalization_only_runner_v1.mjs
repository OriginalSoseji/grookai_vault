import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";

export const PACKAGE_ID = "MEE-NORMALIZATION-ONLY-RUNNER-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");

const PHASES = [
  {
    key: "normalization_gvid_assignment_audit",
    command: ["node", "scripts/audits/market_evidence_normalization_gvid_assignment_audit_v1.mjs"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "card_candidate_rollup_plan",
    command: ["node", "scripts/audits/market_listing_card_candidate_rollup_plan_v1.mjs", "--run-key={runKey}"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "card_candidate_rollup_apply",
    command: ["node", "scripts/audits/market_listing_card_candidate_rollup_apply_v1.mjs", "--allow-dynamic-plan", "--apply"],
    providerCalls: false,
    dbWrites: true,
  },
  {
    key: "strict_filtered_rollup_plan",
    command: ["node", "scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "strict_filtered_rollup_apply",
    command: [
      "node",
      "scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs",
      "--allow-dynamic-plan",
      "--run-key={runKey}",
      "--apply",
    ],
    providerCalls: false,
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
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "quality_gate_action_plan",
    command: ["node", "scripts/audits/market_evidence_quality_gate_remaining_candidate_actions_v1.mjs"],
    providerCalls: false,
    dbWrites: false,
  },
  {
    key: "final_assignment_audit",
    command: ["node", "scripts/audits/market_evidence_normalization_gvid_assignment_audit_v1.mjs"],
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
  const runKey = argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length) ?? null;
  return {
    run: argv.includes("--run"),
    skipApply: argv.includes("--skip-apply"),
    full: argv.includes("--full"),
    runKey,
  };
}

function fillCommand(command, args) {
  return command
    .map((part) => part.replace("{runKey}", args.runKey ?? ""))
    .filter((part) => part !== "--run-key=");
}

function commandText(command) {
  return command.join(" ");
}

function execute(command) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 256 * 1024 * 1024,
    timeout: 1000 * 60 * 60 * 4,
  });
  return {
    command: commandText(command),
    status: result.status,
    stdout_tail: (result.stdout ?? "").slice(-6000),
    stderr_tail: (result.stderr ?? "").slice(-6000),
  };
}

function renderMarkdown(report) {
  return [
    "# MEE Normalization-Only Runner V1",
    "",
    `- Mode: \`${report.mode}\``,
    `- Run key: \`${report.run_key}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
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

const args = parseArgs(process.argv.slice(2));
const execution = [];
const findings = [];

for (const phase of PHASES) {
  const command = fillCommand((!args.run && phase.dryRunCommand) ? phase.dryRunCommand : phase.command, args);
  if (!args.run && !args.full && ["card_candidate_rollup_plan", "strict_filtered_rollup_plan"].includes(phase.key)) {
    execution.push({
      phase: phase.key,
      command: commandText(command),
      skipped: true,
      reason: "full_normalization_plan_not_requested",
    });
    continue;
  }
  if ((args.skipApply || !args.run) && phase.dbWrites) {
    execution.push({
      phase: phase.key,
      command: commandText(command),
      skipped: true,
      reason: args.skipApply ? "skip_apply" : "dry_run_db_write_phase",
    });
    continue;
  }

  const result = execute(command);
  execution.push({
    phase: phase.key,
    provider_calls: phase.providerCalls,
    db_writes: phase.dbWrites,
    ...result,
  });
  if (result.status !== 0) {
    findings.push(`phase_failed:${phase.key}`);
    break;
  }
}

const phasePlan = PHASES.map((phase) => ({
  key: phase.key,
  command: commandText(fillCommand(phase.command, args)),
  dry_run_command: phase.dryRunCommand ? commandText(fillCommand(phase.dryRunCommand, args)) : null,
  provider_calls: phase.providerCalls,
  db_writes: phase.dbWrites,
}));

const payload = {
  package_id: PACKAGE_ID,
  mode: args.run ? "run" : "dry_run_no_db_writes",
  run_key: args.runKey ?? "latest_acquisition_run",
  full_plan_requested: args.full,
  phase_plan: phasePlan,
  execution: execution.map((phase) => ({
    phase: phase.phase,
    command: phase.command,
    status: phase.status,
    skipped: phase.skipped,
    reason: phase.reason,
  })),
  findings,
};

const report = {
  ...payload,
  generated_at: new Date().toISOString(),
  package_fingerprint_sha256: sha256(payload),
  boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: args.run && execution.some((phase) => phase.db_writes && phase.status === 0),
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    card_prints_writes: false,
    card_printings_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    migrations: false,
    global_apply: false,
  },
};

mkdirSync(AUDIT_DIR, { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(AUDIT_DIR, `mee_normalization_only_runner_v1_${stamp}.json`);
const mdPath = path.join(AUDIT_DIR, `mee_normalization_only_runner_v1_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  mode: report.mode,
  run_key: report.run_key,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  boundary: report.boundary,
  findings: report.findings,
  artifacts: {
    jsonPath: path.relative(REPO_ROOT, jsonPath).replace(/\\/g, "/"),
    mdPath: path.relative(REPO_ROOT, mdPath).replace(/\\/g, "/"),
  },
}, null, 2));

if (report.findings.length) process.exitCode = 1;
