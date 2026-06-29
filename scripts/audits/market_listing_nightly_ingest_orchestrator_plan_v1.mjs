import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

const PACKAGE_ID = "MARKET-LISTING-NIGHTLY-INGEST-ORCHESTRATOR-PLAN-V1";
const CONTRACT_PATH = "docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.json";
const DEFAULT_CALL_CEILING = 4000;

const REQUIRED_EXISTING_PHASE_SCRIPTS = [
  "scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs",
  "scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs",
  "scripts/audits/market_listing_acquisition_daily_batch_fetch_v1.mjs",
  "scripts/audits/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs",
  "scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs",
  "scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs",
  "docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.md",
  "docs/contracts/MARKET_LISTING_NIGHTLY_INGEST_V1.json",
];

const REQUIRED_MISSING_PHASE_SCRIPTS = [
  {
    path: "scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs",
    reason: "needed to insert strict-filtered review-only candidates/rollups instead of the older unfiltered rollups",
  },
  {
    path: "scripts/audits/market_listing_nightly_ingest_run_v1.mjs",
    reason: "needed to execute the one-approval end-to-end nightly run under MARKET_LISTING_NIGHTLY_INGEST_V1",
  },
  {
    path: "scripts/audits/market_listing_nightly_ingest_readback_v1.mjs",
    reason: "needed for the final morning report required by the contract",
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
  const callCeilingArg = argv.find((arg) => arg.startsWith("--call-ceiling="))?.slice("--call-ceiling=".length);
  const callCeiling = callCeilingArg ? Number.parseInt(callCeilingArg, 10) : DEFAULT_CALL_CEILING;
  if (!Number.isFinite(callCeiling) || callCeiling <= 0) {
    throw new Error("[market-listing-nightly-orchestrator-plan] --call-ceiling must be a positive integer");
  }
  return { callCeiling };
}

function fileExists(relativePath) {
  return existsSync(path.join(REPO_ROOT, relativePath));
}

function approvalPrompt({ contractHash, callCeiling }) {
  return `Approve real MARKET-LISTING-NIGHTLY-INGEST-V1 run only. Contract hash: ${contractHash}. Scope: run one bounded overnight Market Listing ingestion cycle using existing approved market_listing_* warehouse schema only. Allow up to ${callCeiling} ebay_active Browse API calls, local acquisition artifacts, warehouse inserts into market_listing_acquisition_runs, market_listing_query_cache, market_listing_raw_snapshots, market_listing_observations, market_listing_seller_snapshots, market_listing_price_events, review-only market_listing_card_candidates, and internal-only market_listing_rollups. Keep raw_single and slab lanes separated. Apply strict title evidence filtering before rollup medians are calculated. Keep all candidates and rollups needs_review=true, publishable=false, app_visible=false, market_truth=false, and can_publish_price_directly=false where applicable. No public pricing views. No app-visible pricing. No pricing_observations writes. No ebay_active_prices_latest writes. No JustTCG public pricing. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No migrations. No deletes except exact same-run market_listing_* repair cleanup. No merges. No global apply. Produce final audit report before stopping.`;
}

function renderMarkdown(report) {
  return [
    "# Market Listing Nightly Ingest Orchestrator Plan V1",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for overnight run approval: \`${report.ready_for_overnight_run_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Contract hash: \`${report.contract_hash_sha256}\``,
    `- Call ceiling: \`${report.call_ceiling}\``,
    "",
    "## Phase Plan",
    "",
    ...report.phase_plan.map((phase) => [
      `### ${phase.ordinal}. ${phase.name}`,
      "",
      `- Status: \`${phase.status}\``,
      `- Command: \`${phase.command ?? "not built yet"}\``,
      `- Boundary: ${phase.boundary}`,
      "",
    ].join("\n")),
    "## Existing Script Check",
    "",
    "```json",
    JSON.stringify(report.existing_script_check, null, 2),
    "```",
    "",
    "## Missing Implementation",
    "",
    ...(report.missing_implementation.length
      ? report.missing_implementation.map((item) => `- \`${item.path}\`: ${item.reason}`)
      : ["- none"]),
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
const contractText = readFileSync(path.join(REPO_ROOT, CONTRACT_PATH), "utf8");
const contract = JSON.parse(contractText);
const contractHash = sha256(contractText);

const existingScriptCheck = REQUIRED_EXISTING_PHASE_SCRIPTS.map((relativePath) => ({
  path: relativePath,
  exists: fileExists(relativePath),
}));
const missingExistingScripts = existingScriptCheck.filter((item) => !item.exists);
const missingImplementation = REQUIRED_MISSING_PHASE_SCRIPTS.filter((item) => !fileExists(item.path));

const phasePlan = [
  {
    ordinal: 1,
    name: "Build prioritized acquisition worklist",
    status: "available",
    command: "node scripts/audits/market_listing_acquisition_dry_run_plan_v1.mjs",
    boundary: "local artifact only; no provider calls; no DB writes",
  },
  {
    ordinal: 2,
    name: "Slice one bounded daily/nightly batch",
    status: "available",
    command: `node scripts/audits/market_listing_acquisition_daily_batch_plan_v1.mjs --call-limit=${args.callCeiling}`,
    boundary: "local artifact only; no provider calls; no DB writes",
  },
  {
    ordinal: 3,
    name: "Fetch eBay active listing evidence",
    status: "available_after_single_approval",
    command: "node scripts/audits/market_listing_acquisition_daily_batch_fetch_v1.mjs --batch-plan=<phase-2-artifact>",
    boundary: "provider calls allowed only within approved call ceiling; local artifacts only",
  },
  {
    ordinal: 4,
    name: "Prepare warehouse backfill package",
    status: "available",
    command: "node scripts/audits/market_listing_acquisition_daily_batch_backfill_plan_v1.mjs --fetch=<phase-3-artifact>",
    boundary: "local package only; no provider calls; no DB writes",
  },
  {
    ordinal: 5,
    name: "Apply internal warehouse rows",
    status: "available_after_single_approval",
    command: "node scripts/audits/market_listing_acquisition_daily_batch_backfill_apply_v1.mjs --plan=<phase-4-artifact>",
    boundary: "market_listing_* warehouse inserts only; no candidates or rollups",
  },
  {
    ordinal: 6,
    name: "Compute strict-filtered candidate and rollup package",
    status: "partially_available",
    command: "node scripts/audits/market_listing_strict_filtered_rollup_plan_v1.mjs",
    boundary: "currently local artifact only; strict title filtering before medians",
  },
  {
    ordinal: 7,
    name: "Apply strict-filtered review-only candidates and rollups",
    status: fileExists("scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs") ? "available_after_single_approval" : "missing_implementation",
    command: fileExists("scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs")
      ? "node scripts/audits/market_listing_strict_filtered_rollup_apply_v1.mjs --plan=<phase-6-artifact>"
      : null,
    boundary: "market_listing_card_candidates and market_listing_rollups only; all rows non-public and review-only",
  },
  {
    ordinal: 8,
    name: "Final morning readback",
    status: fileExists("scripts/audits/market_listing_nightly_ingest_readback_v1.mjs") ? "available" : "missing_implementation",
    command: fileExists("scripts/audits/market_listing_nightly_ingest_readback_v1.mjs")
      ? "node scripts/audits/market_listing_nightly_ingest_readback_v1.mjs --run-key=<nightly-run-key>"
      : null,
    boundary: "read-only report; confirms no public/app-visible pricing",
  },
];

const findings = [];
if (contract.contract !== "MARKET_LISTING_NIGHTLY_INGEST_V1") findings.push("contract_name_mismatch");
if (contract.status !== "candidate") findings.push("contract_status_not_candidate");
if (!contract.strict_filtering?.filter_before_median) findings.push("contract_missing_filter_before_median");
if (missingExistingScripts.length) findings.push("required_existing_phase_script_missing");
if (missingImplementation.length) findings.push("nightly_orchestrator_missing_final_apply_or_readback_scripts");

const reportPayloadForHash = {
  contract_hash_sha256: contractHash,
  call_ceiling: args.callCeiling,
  phase_plan: phasePlan,
  missing_implementation: missingImplementation,
  findings,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "local_orchestrator_plan_no_provider_calls_no_db_writes",
  contract_path: CONTRACT_PATH,
  contract_hash_sha256: contractHash,
  package_fingerprint_sha256: sha256(reportPayloadForHash),
  call_ceiling: args.callCeiling,
  ready_for_overnight_run_approval: findings.length === 0,
  phase_plan: phasePlan,
  existing_script_check: existingScriptCheck,
  missing_implementation: missingImplementation,
  boundary: {
    provider_calls: false,
    source_fetches: false,
    db_writes: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_writes: false,
    deletes: false,
  },
  findings,
  recommended_next_step: missingImplementation.length
    ? `Build missing implementation before attempting a one-approval overnight run: ${missingImplementation.map((item) => item.path).join(", ")}.`
    : "Ready to request the single overnight approval prompt and run the orchestrator.",
};
report.approval_prompt_for_future_run = approvalPrompt({
  contractHash,
  callCeiling: args.callCeiling,
});

mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
const stamp = report.generated_at.replace(/[:.]/g, "-");
const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12a_market_listing_nightly_ingest_orchestrator_plan_${stamp}.json`);
const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_12a_market_listing_nightly_ingest_orchestrator_plan_${stamp}.md`);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  ready_for_overnight_run_approval: report.ready_for_overnight_run_approval,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  contract_hash_sha256: report.contract_hash_sha256,
  findings: report.findings,
  missing_implementation: report.missing_implementation,
  artifacts: {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  },
  recommended_next_step: report.recommended_next_step,
  approval_prompt_for_future_run: report.approval_prompt_for_future_run,
}, null, 2));
