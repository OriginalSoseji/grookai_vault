import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const CONTRACT_PATH = "docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.json";

const PACKAGE_ID = "MARKET-LISTING-NIGHTLY-INGEST-RUN-V1";
const DEFAULT_CALL_CEILING = 4000;
const BASE_STRICT_ROLLUP_VERSIONS = [
  "MEE_12B_INTERNAL_RAW_SINGLE_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1",
  "MEE_12B_INTERNAL_SLAB_STRICT_FILTERED_ACTIVE_ASK_REVIEW_V1",
];

const PHASES = [
  {
    key: "dry_run_plan",
    command: ["node", "scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs"],
    provider_calls: false,
    db_writes: false,
  },
  {
    key: "daily_batch_plan",
    command: ["node", "scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs", "--call-limit={callCeiling}"],
    provider_calls: false,
    db_writes: false,
  },
  {
    key: "daily_batch_fetch",
    command: ["node", "scripts/audits/market_listing_acquisition_daily_batch_fetch_v1.mjs", "--allow-dynamic-plan"],
    provider_calls: true,
    db_writes: false,
  },
  {
    key: "daily_batch_backfill_plan",
    command: ["node", "scripts/audits/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs", "--allow-dynamic-plan"],
    provider_calls: false,
    db_writes: false,
  },
  {
    key: "daily_batch_backfill_apply",
    command: ["node", "scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs", "--allow-dynamic-plan", "--apply"],
    provider_calls: false,
    db_writes: true,
  },
  {
    key: "card_candidate_rollup_plan",
    command: ["node", "scripts/audits/market_listing_card_candidate_rollup_plan_v1.mjs", "--run-key={runKey}"],
    provider_calls: false,
    db_writes: false,
  },
  {
    key: "card_candidate_rollup_apply",
    command: ["node", "scripts/audits/market_listing_card_candidate_rollup_apply_v1.mjs", "--allow-dynamic-plan", "--apply"],
    provider_calls: false,
    db_writes: true,
  },
  {
    key: "strict_filtered_rollup_plan",
    command: ["node", "scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs"],
    provider_calls: false,
    db_writes: false,
  },
  {
    key: "strict_filtered_rollup_apply",
    command: ["node", "scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs", "--allow-dynamic-plan", "--run-key={runKey}", "--apply"],
    provider_calls: false,
    db_writes: true,
  },
  {
    key: "nightly_readback",
    command: ["node", "scripts/audits/market_listing_nightly_ingest_readback_v1.mjs", "--run-key={runKey}"],
    provider_calls: false,
    db_writes: false,
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

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  const callCeilingRaw = argv.find((arg) => arg.startsWith("--call-ceiling="))?.slice("--call-ceiling=".length);
  const callCeiling = callCeilingRaw ? Number.parseInt(callCeilingRaw, 10) : DEFAULT_CALL_CEILING;
  if (!Number.isFinite(callCeiling) || callCeiling <= 0) throw new Error("--call-ceiling must be a positive integer");
  const runKey = argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length)
    ?? `MEE-NIGHTLY-${new Date().toISOString().slice(0, 10)}`;
  return {
    run: argv.includes("--run"),
    dryRun: !argv.includes("--run"),
    allowFixedRollupCollisionRisk: argv.includes("--allow-fixed-rollup-collision-risk"),
    callCeiling,
    runKey,
  };
}

function fileExists(relativePath) {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

function fileContains(relativePath, pattern) {
  const resolved = path.join(REPO_ROOT, relativePath);
  if (!existsSync(resolved)) return false;
  return pattern.test(readFileSync(resolved, "utf8"));
}

function contractHash() {
  return sha256(readFileSync(path.join(REPO_ROOT, CONTRACT_PATH), "utf8"));
}

function runSql(sql) {
  return execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

function normalizeRollupVersionSuffix(raw) {
  const suffix = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!suffix) throw new Error("[nightly-ingest-run] run key normalized to empty rollup suffix");
  return suffix.slice(0, 80);
}

function strictRollupVersionsForRun(runKey) {
  const suffix = normalizeRollupVersionSuffix(runKey);
  return BASE_STRICT_ROLLUP_VERSIONS.map((version) => `${version}__${suffix}`);
}

function queryRollupPresence(rollupVersions) {
  const sql = `
    select jsonb_build_object(
      'existing_planned_strict_rollup_count', count(*),
      'by_version', coalesce(jsonb_object_agg(rollup_version, version_count), '{}'::jsonb)
    )::text as report
    from (
      select rollup_version, count(*) as version_count
      from public.market_listing_rollups
      where rollup_version in (${rollupVersions.map((version) => `'${version}'`).join(", ")})
      group by rollup_version
    ) s;
  `;
  const result = JSON.parse(runSql(sql));
  return JSON.parse(result.rows?.[0]?.report ?? "{}");
}

function commandText(command, args) {
  return command
    .map((part) => part.replace("{callCeiling}", String(args.callCeiling)).replace("{runKey}", args.runKey))
    .join(" ");
}

function executePhase(phase, args) {
  const command = phase.command.map((part) => part.replace("{callCeiling}", String(args.callCeiling)).replace("{runKey}", args.runKey));
  if (command.some((part) => part.includes("<"))) {
    throw new Error(`[nightly-ingest-run] phase ${phase.key} needs artifact plumbing before execution: ${command.join(" ")}`);
  }
  const result = spawnSync(command[0], command.slice(1), {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 256 * 1024 * 1024,
  });
  return {
    phase: phase.key,
    command: command.join(" "),
    status: result.status,
    stdout_tail: (result.stdout ?? "").slice(-4000),
    stderr_tail: (result.stderr ?? "").slice(-4000),
  };
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-NIGHTLY-INGEST-V1 run only. Package fingerprint: ${report.package_fingerprint_sha256}. Contract hash: ${report.contract_hash_sha256}. Scope: run one bounded overnight Market Listing ingestion cycle using existing approved market_listing_* warehouse schema only. Allow up to ${report.call_ceiling} ebay_active Browse API calls, local acquisition artifacts, warehouse inserts into market_listing_acquisition_runs, market_listing_query_cache, market_listing_raw_snapshots, market_listing_observations, market_listing_seller_snapshots, market_listing_price_events, review-only market_listing_card_candidates, and internal-only market_listing_rollups. Keep raw_single and slab lanes separated. Apply strict title evidence filtering before rollup medians are calculated. Keep all candidates and rollups needs_review=true, publishable=false, app_visible=false, market_truth=false, and can_publish_price_directly=false where applicable. No public pricing views. No app-visible pricing. No pricing_observations writes. No ebay_active_prices_latest writes. No JustTCG public pricing. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No migrations. No deletes except exact same-run market_listing_* repair cleanup. No merges. No global apply. Produce final audit report before stopping.`;
}

function renderMarkdown(report) {
  return [
    "# Market Listing Nightly Ingest Run V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Mode: \`${report.mode}\``,
    `- Ready for run approval: \`${report.ready_for_run_approval}\``,
    `- Run attempted: \`${report.run_attempted}\``,
    `- Run key: \`${report.run_key}\``,
    `- Contract hash: \`${report.contract_hash_sha256}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    "",
    "## Phase Plan",
    "",
    "```json",
    JSON.stringify(report.phase_plan, null, 2),
    "```",
    "",
    "## Preflight",
    "",
    "```json",
    JSON.stringify(report.preflight, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Approval Prompt",
    "",
    "```text",
    report.approval_prompt_for_future_run,
    "```",
    "",
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));
const hash = contractHash();
const existingScripts = PHASES.map((phase) => ({
  phase: phase.key,
  script_exists: phase.command[0] === "node" ? fileExists(phase.command[1]) : true,
}));
const missingScripts = existingScripts.filter((item) => !item.script_exists);
const plannedStrictRollupVersions = strictRollupVersionsForRun(args.runKey);
const strictRollupPresence = queryRollupPresence(plannedStrictRollupVersions);
const dynamicBackfillApplySupport = fileContains(
  "scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs",
  /--allow-dynamic-plan|dynamic_idempotent_apply/i,
);
const dynamicCandidateApplySupport = fileContains(
  "scripts/audits/market_listing_card_candidate_rollup_apply_v1.mjs",
  /--allow-dynamic-plan|allowDynamicPlan/i,
);
const phasePlan = PHASES.map((phase) => ({
  key: phase.key,
  command: commandText(phase.command, args),
  provider_calls: phase.provider_calls,
  db_writes: phase.db_writes,
}));

const findings = [];
if (missingScripts.length) findings.push("nightly_phase_script_missing");
if ((strictRollupPresence.existing_planned_strict_rollup_count ?? 0) > 0 && !args.allowFixedRollupCollisionRisk) {
  findings.push("run_specific_strict_rollup_versions_already_exist");
}
if (phasePlan.some((phase) => phase.command.includes("<"))) {
  findings.push("artifact_plumbing_placeholders_present");
}
if (!dynamicBackfillApplySupport) {
  findings.push("daily_batch_backfill_apply_dynamic_idempotency_required");
}
if (!dynamicCandidateApplySupport) {
  findings.push("card_candidate_rollup_apply_dynamic_idempotency_required");
}
if (args.run && findings.length) {
  findings.push("run_blocked_by_preflight_findings");
}

const execution = [];
if (args.run && findings.length === 0) {
  for (const phase of PHASES) {
    const result = executePhase(phase, args);
    execution.push(result);
    if (result.status !== 0) {
      findings.push(`phase_failed:${phase.key}`);
      break;
    }
  }
}

const reportPayloadForHash = {
  contract_hash_sha256: hash,
  call_ceiling: args.callCeiling,
  run_key: args.runKey,
  phase_plan: phasePlan,
  preflight: {
    existing_scripts: existingScripts,
    planned_strict_rollup_versions: plannedStrictRollupVersions,
    strict_rollup_presence: strictRollupPresence,
    dynamic_backfill_apply_support: dynamicBackfillApplySupport,
    dynamic_candidate_apply_support: dynamicCandidateApplySupport,
  },
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: args.run ? "run_requested" : "dry_run_readiness_no_provider_calls_no_db_writes",
  run_attempted: args.run && findings.filter((finding) => finding !== "run_blocked_by_preflight_findings").length === 0,
  ready_for_run_approval: findings.length === 0,
  contract_path: CONTRACT_PATH,
  contract_hash_sha256: hash,
  package_fingerprint_sha256: sha256(reportPayloadForHash),
  call_ceiling: args.callCeiling,
  run_key: args.runKey,
  phase_plan: phasePlan,
  preflight: {
    existing_scripts: existingScripts,
    planned_strict_rollup_versions: plannedStrictRollupVersions,
    strict_rollup_presence: strictRollupPresence,
    dynamic_backfill_apply_support: dynamicBackfillApplySupport,
    dynamic_candidate_apply_support: dynamicCandidateApplySupport,
    missing_scripts: missingScripts,
  },
  execution,
  boundary: {
    provider_calls: args.run && execution.some((phase) => phase.phase === "daily_batch_fetch"),
    db_writes: args.run && execution.some((phase) => ["daily_batch_backfill_apply", "card_candidate_rollup_apply", "strict_filtered_rollup_apply"].includes(phase.phase)),
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    card_prints_writes: false,
    card_printings_writes: false,
    vault_writes: false,
    image_writes: false,
    deletes: false,
    upserts: false,
    migrations: false,
  },
  findings,
  recommended_next_step: findings.includes("daily_batch_backfill_apply_dynamic_idempotency_required")
    ? "Patch daily batch backfill apply to support dynamic package fingerprints and idempotent delta inserts before enabling repeatable nightly runs."
    : findings.includes("run_specific_strict_rollup_versions_already_exist")
      ? "Choose a new run key or inspect the existing run-specific strict rollup version before rerunning."
    : findings.includes("artifact_plumbing_placeholders_present")
      ? "Add artifact handoff plumbing so each phase consumes the artifact produced by the prior phase."
      : "Ready for the single nightly approval prompt.",
};
report.approval_prompt_for_future_run = approvalPrompt(report);

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12d_market_listing_nightly_ingest_run_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12d_market_listing_nightly_ingest_run_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  mode: report.mode,
  ready_for_run_approval: report.ready_for_run_approval,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  contract_hash_sha256: report.contract_hash_sha256,
  preflight: report.preflight,
  findings: report.findings,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  },
  recommended_next_step: report.recommended_next_step,
  approval_prompt_for_future_run: report.approval_prompt_for_future_run,
}, null, 2));

if (args.run && findings.length) process.exitCode = 1;
