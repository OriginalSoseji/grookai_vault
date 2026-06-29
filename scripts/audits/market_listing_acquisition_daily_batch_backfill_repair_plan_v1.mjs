import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import "../../backend/env.mjs";
import { createBackendClient } from "../../backend/supabase_backend_client.mjs";

export const PACKAGE_ID = "MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-REPAIR-PLAN-V1";
export const SOURCE_PLAN_FINGERPRINT = "2ebd59a1c8b56e8f613ebd7c5a616a82c655bb0b2eed9899b71d309ba2226c44";
export const SOURCE_ROW_MANIFEST_HASH = "92b002b5831f77b75c4ede1445a5dd2993bbee7df1a41ae78f83b539b185704a";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = "docs/audits/market_evidence_engine_v1";
const SOURCE_PLAN_PATH = "docs/audits/market_evidence_engine_v1/mee_11m_market_listing_acquisition_daily_batch_backfill_plan_2026-06-26T02-07-43-126Z.json";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
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

async function* readJsonLines(filePath) {
  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
  }
}

function writeRow(stream, row, hash) {
  stream.write(`${JSON.stringify(row)}\n`);
  hash.update(`${JSON.stringify(stable(row))}\n`);
}

function closeStream(stream) {
  return new Promise((resolve, reject) => {
    stream.end((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseRequest(factory, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await factory();
    if (result?.error && /fetch failed|network|terminated|timeout/i.test(result.error.message ?? "")) {
      lastError = result.error;
      if (attempt === attempts) return result;
      await sleep(500 * attempt);
      continue;
    }
    return result;
  }
  throw lastError;
}

async function existingIds(supabase, table, ids) {
  const found = new Set();
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    const { data, error } = await supabaseRequest(() => supabase
      .from(table)
      .select("id")
      .in("id", chunk));
    if (error) throw new Error(`[market-listing-repair-plan] existing id check failed for ${table}: ${error.message}`);
    for (const row of data ?? []) found.add(row.id);
  }
  return found;
}

async function collectIds(filePath) {
  const ids = [];
  for await (const row of readJsonLines(filePath)) {
    if (row.id) ids.push(row.id);
  }
  return ids;
}

function sanitizeSellerRow(row, stats) {
  const next = { ...row };
  if (next.feedback_score !== null && next.feedback_score < 0) {
    next.feedback_score = null;
    stats.negative_feedback_scores_sanitized += 1;
  }
  return next;
}

function approvalPrompt(report) {
  return `Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-REPAIR-APPLY-V1 apply only. Package fingerprint: ${report.package_fingerprint_sha256}. Row manifest hash: ${report.row_manifest_hash_sha256}. Source plan fingerprint: ${report.source_plan_fingerprint_sha256}. Source row manifest hash: ${report.source_row_manifest_hash_sha256}. Scope: insert ${report.proposed_table_row_counts.market_listing_seller_snapshots} missing sanitized market_listing_seller_snapshots rows and ${report.proposed_table_row_counts.market_listing_price_events} market_listing_price_events rows from local MEE-11P repair artifacts only, completing the partial MEE-11N apply while preserving slab/raw-single classification metadata in event_payload. Negative seller feedback_score values are normalized to null to satisfy the existing warehouse constraint. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const sourcePlan = JSON.parse(await fs.readFile(path.join(REPO_ROOT, SOURCE_PLAN_PATH), "utf8"));
  const outputDir = path.join(REPO_ROOT, AUDIT_DIR, `mee_11p_market_listing_acquisition_daily_batch_backfill_repair_plan_${stamp}`);
  mkdirSync(outputDir, { recursive: true });

  const findings = [];
  if (sourcePlan.package_fingerprint_sha256 !== SOURCE_PLAN_FINGERPRINT) findings.push("source_plan_fingerprint_mismatch");
  if (sourcePlan.row_manifest_hash_sha256 !== SOURCE_ROW_MANIFEST_HASH) findings.push("source_row_manifest_hash_mismatch");

  const supabase = createBackendClient();
  const sellerIds = await collectIds(path.resolve(REPO_ROOT, sourcePlan.row_files.sellerSnapshotRows));
  const priceEventIds = await collectIds(path.resolve(REPO_ROOT, sourcePlan.row_files.priceEventRows));
  const existingSellerIds = await existingIds(supabase, "market_listing_seller_snapshots", sellerIds);
  const existingPriceEventIds = await existingIds(supabase, "market_listing_price_events", priceEventIds);

  const sellerPath = path.join(outputDir, "market_listing_seller_snapshots_repair.jsonl");
  const priceEventsPath = path.join(outputDir, "market_listing_price_events_repair.jsonl");
  const sellerStream = createWriteStream(sellerPath, { encoding: "utf8" });
  const priceEventStream = createWriteStream(priceEventsPath, { encoding: "utf8" });
  const sellerHash = createHash("sha256");
  const priceEventHash = createHash("sha256");
  const stats = {
    existing_seller_rows_skipped: existingSellerIds.size,
    existing_price_event_rows_skipped: existingPriceEventIds.size,
    negative_feedback_scores_sanitized: 0,
  };
  let sellerCount = 0;
  let priceEventCount = 0;

  for await (const row of readJsonLines(path.resolve(REPO_ROOT, sourcePlan.row_files.sellerSnapshotRows))) {
    if (existingSellerIds.has(row.id)) continue;
    writeRow(sellerStream, sanitizeSellerRow(row, stats), sellerHash);
    sellerCount += 1;
  }
  for await (const row of readJsonLines(path.resolve(REPO_ROOT, sourcePlan.row_files.priceEventRows))) {
    if (existingPriceEventIds.has(row.id)) continue;
    writeRow(priceEventStream, row, priceEventHash);
    priceEventCount += 1;
  }
  await Promise.all([closeStream(sellerStream), closeStream(priceEventStream)]);

  const rowFileHashes = {
    sellerSnapshotRows: sellerHash.digest("hex"),
    priceEventRows: priceEventHash.digest("hex"),
  };
  const rowManifestHash = sha256({
    row_file_hashes: rowFileHashes,
    row_counts: {
      market_listing_seller_snapshots: sellerCount,
      market_listing_price_events: priceEventCount,
    },
    repair_stats: stats,
  });
  const packageFingerprint = sha256({
    package_id: PACKAGE_ID,
    source_plan_fingerprint: sourcePlan.package_fingerprint_sha256,
    source_row_manifest_hash: sourcePlan.row_manifest_hash_sha256,
    row_manifest_hash: rowManifestHash,
    repair_scope: {
      seller_snapshots_only_missing_rows: true,
      price_events_only_missing_rows: true,
      negative_feedback_score_to_null: true,
    },
  });

  const report = {
    package_id: PACKAGE_ID,
    generated_at: generatedAt,
    mode: "repair_plan_only_no_writes",
    source_plan_artifact: SOURCE_PLAN_PATH,
    source_plan_fingerprint_sha256: sourcePlan.package_fingerprint_sha256,
    source_row_manifest_hash_sha256: sourcePlan.row_manifest_hash_sha256,
    package_fingerprint_sha256: packageFingerprint,
    row_manifest_hash_sha256: rowManifestHash,
    row_file_hashes_sha256: rowFileHashes,
    proposed_table_row_counts: {
      market_listing_seller_snapshots: sellerCount,
      market_listing_price_events: priceEventCount,
    },
    repair_stats: stats,
    row_files: {
      sellerSnapshotRows: rel(sellerPath),
      priceEventRows: rel(priceEventsPath),
    },
    boundary: {
      provider_calls: false,
      source_fetches: false,
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      card_candidate_writes: false,
      rollup_writes: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      upserts: false,
      merges: false,
      migrations: false,
      global_apply: false,
    },
    findings,
    ready_for_apply_approval: findings.length === 0 && sellerCount > 0 && priceEventCount > 0,
  };
  report.approval_prompt_for_next_step = approvalPrompt(report);

  const jsonPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11p_market_listing_acquisition_daily_batch_backfill_repair_plan_${stamp}.json`);
  const mdPath = path.join(REPO_ROOT, AUDIT_DIR, `mee_11p_market_listing_acquisition_daily_batch_backfill_repair_plan_${stamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, [
    "# MEE-11P Market Listing Daily Batch Backfill Repair Plan",
    "",
    `- Ready for apply approval: \`${report.ready_for_apply_approval}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Row manifest hash: \`${report.row_manifest_hash_sha256}\``,
    "",
    "## Counts",
    "",
    `- Missing seller rows: \`${sellerCount}\``,
    `- Missing price event rows: \`${priceEventCount}\``,
    `- Existing seller rows skipped: \`${stats.existing_seller_rows_skipped}\``,
    `- Existing price event rows skipped: \`${stats.existing_price_event_rows_skipped}\``,
    `- Negative feedback scores sanitized: \`${stats.negative_feedback_scores_sanitized}\``,
    "",
    "## Next Approval Prompt",
    "",
    "```text",
    report.approval_prompt_for_next_step,
    "```",
    "",
  ].join("\n"));

  console.log(JSON.stringify({
    package_id: report.package_id,
    ready_for_apply_approval: report.ready_for_apply_approval,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    row_manifest_hash_sha256: report.row_manifest_hash_sha256,
    proposed_table_row_counts: report.proposed_table_row_counts,
    repair_stats: report.repair_stats,
    findings: report.findings,
    artifacts: {
      jsonPath: rel(jsonPath),
      mdPath: rel(mdPath),
    },
    approval_prompt_for_next_step: report.approval_prompt_for_next_step,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
