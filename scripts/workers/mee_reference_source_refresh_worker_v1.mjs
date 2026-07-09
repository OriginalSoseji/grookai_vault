import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { buildMarketEvidenceSourceRefreshPlanV1 } from "../../backend/pricing/market_evidence_source_refresh_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PACKAGE_ID = "MEE-REFERENCE-SOURCE-REFRESH-WORKER-V1";

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
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function parseArgs(argv) {
  const run = argv.includes("--run");
  const sourcesArg = argv.find((arg) => arg.startsWith("--sources="))?.slice("--sources=".length);
  const referenceLimitRaw = argv.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length)
    ?? process.env.MEE_NIGHTLY_REFERENCE_LIMIT
    ?? "5000";
  const referenceLimit = Number.parseInt(referenceLimitRaw, 10);
  if (!Number.isInteger(referenceLimit) || referenceLimit < 1) {
    throw new Error("[mee-reference-source-refresh] --limit must be a positive integer");
  }
  return {
    run,
    dryRun: argv.includes("--dry-run") || !run,
    sources: sourcesArg ? sourcesArg.split(",").map((source) => source.trim()).filter(Boolean) : undefined,
    referenceLimit,
    allowProviderCalls: process.env.MEE_REFERENCE_REFRESH_ALLOW_PROVIDER_CALLS === "1",
    allowDbWrites: process.env.MEE_REFERENCE_REFRESH_ALLOW_INTERNAL_WRITES === "1",
  };
}

function commandParts(command) {
  return command.split(/\s+/).filter(Boolean);
}

function runCommand(command) {
  const parts = commandParts(command);
  const result = spawnSync(parts[0], parts.slice(1), {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
    timeout: 1000 * 60 * 60 * 3,
    maxBuffer: 128 * 1024 * 1024,
  });
  return {
    command,
    status: result.status,
    signal: result.signal,
    stdout_tail: (result.stdout ?? "").slice(-4000),
    stderr_tail: (result.stderr ?? "").slice(-4000),
  };
}

function renderMarkdown(report) {
  return [
    `# ${PACKAGE_ID}`,
    "",
    `Generated: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Summary",
    "",
    `- adapters: ${report.plan.summary.adapter_count}`,
    `- free reference adapters: ${report.plan.summary.enabled_free_reference_adapter_count}`,
    `- findings: ${report.findings.length}`,
    "",
    "## Boundary",
    "",
    "```json",
    JSON.stringify(report.boundary, null, 2),
    "```",
    "",
    "## Execution",
    "",
    "```json",
    JSON.stringify(report.execution, null, 2),
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
  const jsonPath = path.join(AUDIT_DIR, `mee_reference_source_refresh_worker_v1_${stamp}.json`);
  const mdPath = path.join(AUDIT_DIR, `mee_reference_source_refresh_worker_v1_${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return {
    json: path.relative(REPO_ROOT, jsonPath).replace(/\\/g, "/"),
    markdown: path.relative(REPO_ROOT, mdPath).replace(/\\/g, "/"),
  };
}

const args = parseArgs(process.argv.slice(2));
const generatedAt = new Date().toISOString();
const findings = [];
const execution = [];

if (args.run && process.env.MEE_REFERENCE_REFRESH_ALLOW_RUN !== "1") {
  findings.push("MEE_REFERENCE_REFRESH_ALLOW_RUN_not_set_to_1");
}

const plan = buildMarketEvidenceSourceRefreshPlanV1({
  sources: args.sources,
  generatedAt,
  allowProviderCalls: args.run && args.allowProviderCalls,
  allowDbWrites: args.run && args.allowDbWrites,
  referenceLimit: args.referenceLimit,
});

if (args.run && findings.length === 0) {
  for (const adapter of plan.adapters) {
    if (!adapter.command) {
      execution.push({ source: adapter.source, skipped: true, reason: "manual_or_licensed_input_required" });
      continue;
    }
    if (adapter.provider_calls && !args.allowProviderCalls) {
      execution.push({ source: adapter.source, skipped: true, reason: "provider_calls_not_allowed" });
      continue;
    }
    if (adapter.db_writes && !args.allowDbWrites) {
      execution.push({ source: adapter.source, skipped: true, reason: "internal_writes_not_allowed" });
      continue;
    }
    const result = runCommand(adapter.command);
    execution.push({ source: adapter.source, ...result });
    if (result.status !== 0) {
      findings.push(`adapter_failed:${adapter.source}`);
      break;
    }
  }
} else {
  for (const adapter of plan.adapters) {
    execution.push({
      source: adapter.source,
      command: adapter.command,
      skipped: true,
      reason: args.run ? "preflight_findings" : "dry_run",
    });
  }
}

const boundary = {
  provider_calls: args.run && execution.some((item) => item.status === 0 && plan.adapters.find((adapter) => adapter.source === item.source)?.provider_calls),
  source_fetches: args.run && execution.some((item) => item.status === 0 && plan.adapters.find((adapter) => adapter.source === item.source)?.provider_calls),
  db_writes: args.run && execution.some((item) => item.status === 0 && plan.adapters.find((adapter) => adapter.source === item.source)?.db_writes),
  pricing_observations_writes: false,
  ebay_active_prices_latest_writes: false,
  public_pricing_views: false,
  app_visible_pricing: false,
  public_price_rollups: false,
  identity_table_writes: false,
  vault_writes: false,
  image_storage_writes: false,
  migrations: false,
  global_apply: false,
};

const payload = {
  package_id: PACKAGE_ID,
  generated_at: generatedAt,
  mode: args.run ? "run" : "dry_run",
  plan,
  boundary,
  execution,
  findings,
};
const report = {
  ...payload,
  package_fingerprint_sha256: sha256(payload),
};
report.artifacts = writeReport(report);

console.log(JSON.stringify(report, null, 2));
if (findings.length) process.exitCode = 1;
