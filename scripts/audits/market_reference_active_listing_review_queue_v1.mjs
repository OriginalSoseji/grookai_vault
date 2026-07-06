import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";
import {
  EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT,
  buildMarketReferenceActiveListingReviewQueueV1,
} from "../../backend/pricing/market_reference_active_listing_review_queue_v1.mjs";

export const PACKAGE_ID = "MARKET-REFERENCE-ACTIVE-LISTING-REVIEW-QUEUE-V1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");
}

async function fetchAll(supabase, table, select, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq("source", "ebay_active")
      .range(from, to);
    if (error) throw new Error(`[active-listing-review-queue] read failed for ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export async function buildMarketReferenceActiveListingReviewQueueReportV1({
  generatedAt = new Date().toISOString(),
  sampleLimit = 25,
} = {}) {
  const supabase = createBackendClient();
  const candidates = await fetchAll(
    supabase,
    "market_reference_candidates",
    "id,card_print_id,gv_id,source,source_type,source_url,raw_title,raw_price,currency,condition_hint,finish_hint,observed_at,match_confidence_hint,exclusion_flags,needs_review,can_publish_price_directly",
  );
  const queue = buildMarketReferenceActiveListingReviewQueueV1({ candidates });
  const findings = [...queue.findings];

  if (queue.summary.candidate_count !== EXPECTED_ACTIVE_LISTING_CANDIDATE_COUNT) {
    if (!findings.includes("active_listing_candidate_count_mismatch")) findings.push("active_listing_candidate_count_mismatch");
  }
  if (queue.summary.publishable_count !== 0) findings.push("publishable_active_listing_detected");

  return {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "internal_active_listing_review_queue_no_writes",
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      pricing_rollups: false,
      public_price_publication: false,
      app_visible_pricing: false,
      market_truth: false,
    },
    summary: queue.summary,
    samples: queue.review_items.slice(0, sampleLimit),
    findings,
    ready: findings.length === 0,
  };
}

function tableRows(object) {
  return Object.entries(object ?? {}).map(([key, value]) => `| ${key} | ${value} |`);
}

function itemRows(rows) {
  if (!rows.length) return ["| GV ID | Title | Price | Condition | Flags |", "| --- | --- | ---: | --- | --- |", "| none |  |  |  |  |"];
  return [
    "| GV ID | Title | Price | Condition | Flags |",
    "| --- | --- | ---: | --- | --- |",
    ...rows.map((row) => `| ${row.gv_id} | ${(row.raw_title ?? "").replace(/\|/g, "\\|")} | ${row.raw_price ?? ""} ${row.currency ?? ""} | ${row.condition_hint ?? ""} | ${row.review_flags.join(", ")} |`),
  ];
}

function renderMarkdown(report) {
  return [
    "# MEE-10E Active Listing Review Queue",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "## Boundary",
    "",
    "- Internal review queue only.",
    "- No provider calls.",
    "- No source fetches.",
    "- No database writes.",
    "- No pricing observations writes.",
    "- No eBay latest price writes.",
    "- No price rollups.",
    "- No public/app-visible pricing.",
    "- No market truth.",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    ...tableRows({
      candidate_count: report.summary.candidate_count,
      unique_card_count: report.summary.unique_card_count,
      needs_review_count: report.summary.needs_review_count,
      publishable_count: report.summary.publishable_count,
      min_price: report.summary.price_stats.min,
      average_price: report.summary.price_stats.average,
      max_price: report.summary.price_stats.max,
    }),
    "",
    "## Conditions",
    "",
    "| Condition | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.condition_counts),
    "",
    "## Review Flags",
    "",
    "| Flag | Rows |",
    "| --- | ---: |",
    ...tableRows(report.summary.review_flag_counts),
    "",
    "## Samples",
    "",
    ...itemRows(report.samples),
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

function writeReport(report) {
  mkdirSync(path.join(REPO_ROOT, AUDIT_DIR), { recursive: true });
  const base = `mee_10e_active_listing_review_queue_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `${base}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(report));
  return { jsonPath: rel(jsonPath), mdPath: rel(mdPath) };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  buildMarketReferenceActiveListingReviewQueueReportV1()
    .then((report) => {
      const artifacts = writeReport(report);
      console.log(JSON.stringify({ ...report, artifacts }, null, 2));
      if (!report.ready) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
