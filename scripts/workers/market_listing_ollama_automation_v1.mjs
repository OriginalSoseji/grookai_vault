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
const RAW_EVENT_TABLE = "market_evidence_price_review_events";
const SLAB_EVENT_TABLE = "market_evidence_slab_review_events";
const SLAB_POLICY_VERSION = "MEE_SLAB_APPROVAL_POLICY_V1";

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
  for (let start = 0; start < output.length; start += 1) {
    if (output[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < output.length; index += 1) {
      const character = output[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}" && --depth === 0) {
        try {
          return JSON.parse(output.slice(start, index + 1));
        } catch {
          break;
        }
      }
    }
  }
  throw new Error("Unable to parse JSON command output");
}

function runNode(script, args = []) {
  return parseJsonFromOutput(execFileSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }));
}

function runSql(sql) {
  const output = execFileSync("supabase", ["db", "query", sql, "--linked", "--output", "json"], {
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
  if (row.evidence_class === "slab") {
    return { action_name: "hold_manual_review", review_state: "manual_hold", reason_code: "special_lane_hold" };
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

function slabPolicy(row, action) {
  if (row.evidence_class !== "slab") return null;
  const status = action.action_name === "reject_candidate"
    ? "blocked_contamination"
    : action.action_name === "defer_more_evidence"
      ? "blocked_insufficient_evidence"
      : row.review_bucket === "review_required_outlier_spread"
        ? "blocked_outlier_spread"
        : "blocked_missing_normalized_grade_identity";
  return {
    policy_version: SLAB_POLICY_VERSION,
    status,
    can_auto_approve: false,
    can_publish: false,
    requirements: [
      "grader_identity_per_listing",
      "numeric_grade_per_listing",
      "same_grader_and_grade_rollup",
      "listing_level_identity_provenance",
    ],
    rationale: "Slab asks cannot be promoted from a mixed rollup until grader and grade are normalized per listing.",
  };
}

function buildPriceEvent(row, review, modelDigest, sourcePackage, sourcePath) {
  const action = actionFor(row, review);
  const key = automationKey(row, review, modelDigest);
  return {
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    source_type: "active_listing",
    evidence_lane: row.evidence_class === "slab" ? "slab" : "raw_single",
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
      slab_policy: slabPolicy(row, action),
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

function insertEventChunk(events, tableName) {
  if (![RAW_EVENT_TABLE, SLAB_EVENT_TABLE].includes(tableName)) throw new Error(`Unsupported event table: ${tableName}`);
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
insert into public.${tableName} (
  card_print_id, gv_id, source_type, evidence_lane, source_rollup_id, currency,
  candidate_median, candidate_low, candidate_high, minimum_active_ask, maximum_active_ask,
  evidence_count, seller_count, signal_at, action_name, review_state, reason_code,
  review_actor, review_note, action_payload, can_publish_price_directly, publishable, app_visible, market_truth
)
values ${values}
returning id::text as event_id, source_rollup_id, action_name, review_state;
`);
}

function insertEvents(events, tableName) {
  const inserted = [];
  for (let start = 0; start < events.length; start += 5) {
    inserted.push(...insertEventChunk(events.slice(start, start + 5), tableName));
  }
  return inserted;
}

function existingAutomationKeys(tableName, keys) {
  if (![RAW_EVENT_TABLE, SLAB_EVENT_TABLE].includes(tableName)) throw new Error(`Unsupported event table: ${tableName}`);
  if (!keys.length) return [];
  return runSql(`select action_payload->>'automation_key' as automation_key from public.${tableName} where action_payload->>'automation_version' = ${sqlLiteral(AUTOMATION_VERSION)} and action_payload->>'automation_key' in (${keys.map(sqlLiteral).join(",")});`);
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
  const rawCandidates = [];
  const slabCandidates = [];
  const skipped = [];
  for (const result of reviews) {
    const row = rowsByRollup.get(result.rollup_id);
    if (!row || result.disposition === "local_model_error" || !result.review) {
      skipped.push({ rollup_id: result.rollup_id, reason: result.disposition ?? "missing_review" });
      continue;
    }
    const event = buildPriceEvent(row, result.review, reviewSummary.model_digest, exportSummary.package_id, inputPath);
    (row.evidence_class === "slab" ? slabCandidates : rawCandidates).push(event);
  }

  const rawExistingKeys = new Set(existingAutomationKeys(RAW_EVENT_TABLE, rawCandidates.map((event) => event.automation_key)).map((row) => row.automation_key));
  const slabExistingKeys = new Set(existingAutomationKeys(SLAB_EVENT_TABLE, slabCandidates.map((event) => event.automation_key)).map((row) => row.automation_key));
  const rawPending = rawCandidates.filter((event) => !rawExistingKeys.has(event.automation_key));
  const slabPending = slabCandidates.filter((event) => !slabExistingKeys.has(event.automation_key));
  const pending = [...rawPending, ...slabPending];
  const insertedRaw = args.dryRun ? [] : insertEvents(rawPending, RAW_EVENT_TABLE);
  const insertedSlab = args.dryRun ? [] : insertEvents(slabPending, SLAB_EVENT_TABLE);
  const inserted = [...insertedRaw, ...insertedSlab];
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
    candidates: rawCandidates.length + slabCandidates.length,
    raw_candidates: rawCandidates.length,
    slab_candidates: slabCandidates.length,
    already_applied: (rawCandidates.length - rawPending.length) + (slabCandidates.length - slabPending.length),
    pending_events: pending.length,
    inserted_events: inserted.length,
    raw_inserted_events: insertedRaw.length,
    slab_inserted_events: insertedSlab.length,
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
      writes_tables: [RAW_EVENT_TABLE, SLAB_EVENT_TABLE],
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
