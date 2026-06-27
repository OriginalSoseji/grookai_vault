import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_DAILY_CALL_CEILING,
  DEFAULT_DRY_RUN_TARGET_LIMIT,
  DEFAULT_MAX_RESULTS_PER_CALL,
  buildMarketListingAcquisitionDryRunPlanV1,
} from "../../backend/pricing/market_listing_acquisition_dry_run_plan_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv) {
  const getNumber = (name, fallback) => {
    const raw = argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`[market-listing-dry-run] --${name} must be positive`);
    return parsed;
  };
  return {
    targetLimit: getNumber("target-limit", DEFAULT_DRY_RUN_TARGET_LIMIT),
    dailyCallCeiling: getNumber("daily-call-ceiling", DEFAULT_DAILY_CALL_CEILING),
    maxResultsPerCall: getNumber("max-results-per-call", DEFAULT_MAX_RESULTS_PER_CALL),
  };
}

function runSupabaseQuery(sql) {
  const output = execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");
  const jsonEnd = output.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    throw new Error("[market-listing-dry-run] unable to parse Supabase JSON output");
  }
  return JSON.parse(output.slice(jsonStart, jsonEnd + 1)).rows ?? [];
}

function loadTargets(limit) {
  const sql = `
    select
      cp.id as card_print_id,
      cp.gv_id,
      cp.name,
      cp.set_code,
      s.name as set_name,
      cp.printed_set_abbrev,
      cp.number,
      cp.number_plain,
      cp.rarity,
      cp.variant_key,
      cp.identity_domain,
      cp.printed_identity_modifier
    from public.card_prints cp
    left join public.sets s on s.id = cp.set_id
    where cp.gv_id is not null
      and cp.name is not null
    order by
      case
        when cp.set_code ~* '^(wcd|tk-|base-|mcd|mep|bwp|np|ex)' then 0
        else 1
      end,
      case
        when lower(coalesce(cp.rarity, '')) in ('common', 'uncommon', 'rare') then 2
        when cp.rarity is null or btrim(cp.rarity) = '' then 1
        else 0
      end,
      cp.updated_at desc nulls last,
      cp.gv_id
    limit ${limit};
  `;
  return runSupabaseQuery(sql);
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1 acquisition only. Package fingerprint: ${report.package_fingerprint_sha256}. Request manifest hash: ${report.request_manifest_hash_sha256}. Schema migration hash: ${report.schema_migration_hash_sha256}. Scope: fetch a capped local-artifact-only smoke batch from the MEE-11D dry-run plan, using ebay_active Browse API requests only and writing local acquisition artifacts only. No DB writes. No market_listing_* writes. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.`;
}

function renderMarkdown(report) {
  const sampleRequests = report.acquisition_requests.slice(0, 30);
  return [
    "# MEE-11D Market Listing Acquisition Dry-Run Plan",
    "",
    `- Package: \`${report.package_id}\``,
    `- Ready for acquisition approval: \`${report.ready_for_acquisition_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Request manifest hash: \`${report.request_manifest_hash_sha256}\``,
    `- Schema migration hash: \`${report.schema_migration_hash_sha256}\``,
    `- Planned targets: \`${report.summary.planned_target_count}\``,
    `- Planned requests: \`${report.summary.acquisition_request_count}\``,
    `- Planned calls: \`${report.summary.planned_call_count}\``,
    `- Daily call ceiling: \`${report.summary.daily_call_ceiling}\``,
    `- Max results per call: \`${report.summary.max_results_per_call}\``,
    `- Estimated max listing envelope: \`${report.summary.estimated_max_listing_envelope}\``,
    `- Estimated day count at ceiling: \`${report.summary.estimated_day_count_at_ceiling}\``,
    "",
    "## Boundary",
    "",
    "- Dry-run plan only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No public/app-visible pricing.",
    "- No price rollups.",
    "",
    "## Priority Counts",
    "",
    "| Priority | Targets |",
    "| --- | ---: |",
    ...Object.entries(report.summary.priority_counts).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Strategy Counts",
    "",
    "| Strategy | Requests |",
    "| --- | ---: |",
    ...Object.entries(report.summary.strategy_counts).map(([key, value]) => `| ${key} | ${value} |`),
    "",
    "## Sample Requests",
    "",
    "| # | GV ID | Strategy | Query |",
    "| ---: | --- | --- | --- |",
    ...sampleRequests.map((request) => `| ${request.ordinal} | ${request.gv_id} | ${request.strategy} | ${request.query_text.replace(/\|/g, "\\|")} |`),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    approvalPrompt(report),
    "```",
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_11d_market_listing_acquisition_dry_run_plan_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  const output = {
    ...report,
    approval_prompt_for_next_step: approvalPrompt(report),
  };
  writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(output));
  return {
    jsonPath: rel(jsonPath),
    mdPath: rel(mdPath),
  };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const targets = loadTargets(args.targetLimit);
    const report = buildMarketListingAcquisitionDryRunPlanV1({
      targets,
      dryRunTargetLimit: args.targetLimit,
      dailyCallCeiling: args.dailyCallCeiling,
      maxResultsPerCall: args.maxResultsPerCall,
    });
    const artifacts = writeReport(report);
    console.log(JSON.stringify({
      package_id: report.package_id,
      ready_for_acquisition_approval: report.ready_for_acquisition_approval,
      package_fingerprint_sha256: report.package_fingerprint_sha256,
      request_manifest_hash_sha256: report.request_manifest_hash_sha256,
      summary: report.summary,
      findings: report.findings,
      artifacts,
      approval_prompt_for_next_step: approvalPrompt(report),
    }, null, 2));
    if (!report.ready_for_acquisition_approval) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
