#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXPORTER = path.join(REPO_ROOT, "scripts", "audits", "market_listing_bounded_review_export_v1.mjs");
const REVIEWER = path.join(REPO_ROOT, "scripts", "workers", "market_listing_ollama_review_v1.mjs");
const AUTOMATION_VERSION = "MEE_OLLAMA_AUTOMATION_V1";
const ACTOR = "ollama_automation_agent_v1";

function arg(argv, name, fallback = "") {
  return argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3).trim() ?? fallback;
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    limit: Number.parseInt(arg(argv, "limit", "500"), 10),
    pageSize: Number.parseInt(arg(argv, "page-size", "25"), 10),
    offset: arg(argv, "offset", "") === "" ? null : Number.parseInt(arg(argv, "offset", ""), 10),
    statePath: arg(argv, "state-path", "C:\\grookai_vault_operator_artifacts\\mee_ollama_automation_state.json"),
    outputRoot: arg(argv, "output-root", "C:\\grookai_vault_operator_artifacts"),
  };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stable(value))).digest("hex");
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseJsonFromOutput(output) {
  const first = output.indexOf("{");
  const last = output.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Unable to parse JSON command output");
  return JSON.parse(output.slice(first, last + 1));
}

function runNode(script, args = []) {
  return parseJsonFromOutput(execFileSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }));
}

function runSql(sql) {
  const output = execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return parseJsonFromOutput(output).rows ?? [];
}

function actionFor(row, review) {
  if (review.decision === "reject_contamination") {
    return { action_name: "reject_candidate", review_state: "rejected", reason_code: "evidence_quality_rejected" };
  }
  if (review.decision === "needs_more_evidence" || row.review_bucket === "review_required_more_evidence") {
    return { action_name: "defer_more_evidence", review_state: "deferred", reason_code: "insufficient_current_evidence" };
  }
  if (row.review_bucket === "review_required_outlier_spread") {
    return { action_name: "hold_manual_review", review_state: "manual_hold", reason_code: "spread_review" };
  }
  if (row.review_bucket === "review_ready_internal_candidate"
    && review.decision === "route_to_human_review"
    && review.reason_code === "clean_identity"
    && review.confidence >= 0.95) {
    return { action_name: "approve_internal_price_signal", review_state: "approved_internal", reason_code: "clean_raw_single_policy_candidate" };
  }
  return { action_name: "hold_manual_review", review_state: "manual_hold", reason_code: "title_sample_review" };
}

function automationKey(row, review, modelDigest) {
  return sha256({
    automation_version: AUTOMATION_VERSION,
    rollup_id: row.rollup_id,
    review_bucket: row.review_bucket,
    evidence_class: row.evidence_class,
    model_digest: modelDigest,
    review,
  });
}

function buildPriceEvent(row, review, modelDigest, sourcePackage, sourcePath) {
  const action = actionFor(row, review);
  const key = automationKey(row, review, modelDigest);
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    source_type: "active_listing",
    evidence_lane: "raw_single",
    source_rollup_id: row.rollup_id,
    currency: row.currency ?? "USD",
    candidate_median: row.median_active_ask,
    candidate_low: row.trimmed_low_active_ask,
    candidate_high: row.trimmed_high_active_ask,
    minimum_active_ask: row.minimum_active_ask,
    maximum_active_ask: row.maximum_active_ask,
    evidence_count: row.listing_count ?? 0,
    seller_count: row.seller_count ?? 0,
    signal_at: new Date().toISOString(),
    action_name: action.action_name,
    review_state: action.review_state,
    reason_code: action.reason_code,
    review_actor: ACTOR,
    review_note: `Local Ollama evidence automation: ${review.explanation}`,
    action_payload: {
      automation_version: AUTOMATION_VERSION,
      automation_key: key,
      model: "grookai-evidence-review:4b",
      model_digest: modelDigest,
      source_package_id: sourcePackage,
      source_input_path: sourcePath,
      review_bucket: row.review_bucket,
      model_review: review,
      public_boundary: {
        can_publish_price_directly: false,
        publishable: false,
        app_visible: false,
        market_truth: false,
      },
    },
    can_publish_price_directly: false,
    publishable: false,
    app_visible: false,
    market_truth: false,
    automation_key: key,
  };
}

function insertEvents(events) {
  if (!events.length) return [];
  const values = events.map((event) => `(
    ${sqlLiteral(event.card_print_id)}::uuid,
    ${sqlLiteral(event.gv_id)},
    ${sqlLiteral(event.source_type)},
    ${sqlLiteral(event.evidence_lane)},
    ${sqlLiteral(event.source_rollup_id)},
    ${sqlLiteral(event.currency)},
    ${event.candidate_median ?? "null"},
    ${event.candidate_low ?? "null"},
    ${event.candidate_high ?? "null"},
    ${event.minimum_active_ask ?? "null"},
    ${event.maximum_active_ask ?? "null"},
    ${event.evidence_count ?? 0},
    ${event.seller_count ?? 0},
    ${sqlLiteral(event.signal_at)}::timestamptz,
    ${sqlLiteral(event.action_name)},
    ${sqlLiteral(event.review_state)},
    ${sqlLiteral(event.reason_code)},
    ${sqlLiteral(event.review_actor)},
    ${sqlLiteral(event.review_note)},
    ${sqlLiteral(JSON.stringify(event.action_payload))}::jsonb,
    false, false, false, false
  )`).join(",\n");
  return runSql(`
insert into public.market_evidence_price_review_events (
  card_print_id, gv_id, source_type, evidence_lane, source_rollup_id, currency,
  candidate_median, candidate_low, candidate_high, minimum_active_ask, maximum_active_ask,
  evidence_count, seller_count, signal_at, action_name, review_state, reason_code,
  review_actor, review_note, action_payload, can_publish_price_directly, publishable, app_visible, market_truth
)
values ${values}
returning id::text as event_id, source_rollup_id, action_name, review_state;
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 500) throw new Error("--limit must be 1-500");
  if (!Number.isInteger(args.pageSize) || args.pageSize < 1 || args.pageSize > 100) throw new Error("--page-size must be 1-100");
  if (args.offset !== null && (!Number.isInteger(args.offset) || args.offset < 0)) throw new Error("--offset must be a non-negative integer");
  let state = { offset_per_bucket: 0, updated_at: null };
  try {
    state = { ...state, ...JSON.parse(await fs.readFile(path.resolve(args.statePath), "utf8")) };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const offsetPerBucket = args.offset ?? state.offset_per_bucket;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(args.outputRoot, `ollama_market_automation_${stamp}`);
  await fs.mkdir(outDir, { recursive: true });

  const exportSummary = runNode(EXPORTER, [`--limit-per-bucket=${args.pageSize}`, `--offset-per-bucket=${offsetPerBucket}`]);
  const inputPath = path.resolve(REPO_ROOT, exportSummary.artifacts.jsonPath);
  const reviewSummary = runNode(REVIEWER, [`--input=${inputPath}`, `--out-dir=${outDir}`, `--limit=${Math.min(args.limit, Math.max(1, exportSummary.selection.selected_rollups))}`]);
  const input = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const reviews = (await fs.readFile(path.join(outDir, "review.jsonl"), "utf8"))
    .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const rowsByRollup = new Map(input.rows.map((row) => [row.rollup_id, row]));
  const candidates = [];
  const skipped = [];
  for (const result of reviews) {
    const row = rowsByRollup.get(result.rollup_id);
    if (!row || result.disposition === "local_model_error" || !result.review) {
      skipped.push({ rollup_id: result.rollup_id, reason: result.disposition ?? "missing_review" });
      continue;
    }
    if (row.evidence_class !== "raw_single") {
      skipped.push({ rollup_id: result.rollup_id, reason: "slab_lane_requires_separate_policy" });
      continue;
    }
    candidates.push(buildPriceEvent(row, result.review, reviewSummary.model_digest, exportSummary.package_id, inputPath));
  }

  const keys = candidates.map((event) => event.automation_key);
  const existing = keys.length
    ? runSql(`select action_payload->>'automation_key' as automation_key from public.market_evidence_price_review_events where action_payload->>'automation_version' = ${sqlLiteral(AUTOMATION_VERSION)} and action_payload->>'automation_key' in (${keys.map(sqlLiteral).join(",")});`)
    : [];
  const existingKeys = new Set(existing.map((row) => row.automation_key));
  const pending = candidates.filter((event) => !existingKeys.has(event.automation_key));
  const inserted = args.dryRun ? [] : insertEvents(pending);
  const cycleComplete = exportSummary.selection.selected_rollups === 0;
  const nextOffsetPerBucket = cycleComplete ? 0 : offsetPerBucket + args.pageSize;
  if (!args.dryRun && args.offset === null) {
    const statePath = path.resolve(args.statePath);
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, `${JSON.stringify({ offset_per_bucket: nextOffsetPerBucket, updated_at: new Date().toISOString(), last_run_dir: outDir }, null, 2)}\n`);
  }
  const summary = {
    automation_version: AUTOMATION_VERSION,
    created_at: new Date().toISOString(),
    dry_run: args.dryRun,
    source_export: exportSummary,
    review: reviewSummary,
    candidates: candidates.length,
    already_applied: candidates.length - pending.length,
    pending_events: pending.length,
    inserted_events: inserted.length,
    page: {
      offset_per_bucket: offsetPerBucket,
      page_size: args.pageSize,
      next_offset_per_bucket: nextOffsetPerBucket,
      cycle_complete: cycleComplete,
    },
    inserted,
    skipped,
    action_counts: Object.fromEntries(Object.entries(Object.groupBy(pending, (event) => event.action_name)).map(([key, rows]) => [key, rows.length])),
    boundary: {
      database_reads: true,
      database_writes: !args.dryRun,
      writes_table: "market_evidence_price_review_events",
      public_price_publication: false,
      pricing_observations_writes: false,
      app_visible_pricing: false,
      market_truth: false,
      identity_mapping: false,
      customer_state_writes: false,
      loopback_ollama_only: true,
    },
  };
  await fs.writeFile(path.join(outDir, "automation-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => { console.error(`[market-listing-ollama-automation] ${error.stack ?? error.message}`); process.exitCode = 1; });
