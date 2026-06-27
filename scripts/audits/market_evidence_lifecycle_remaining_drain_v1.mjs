import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const RUN_DIR_NAME = "MEE_CORE_LIFECYCLE_REMAINING_DRAIN_V1";
const RUN_DIR = path.join(AUDIT_DIR, RUN_DIR_NAME);
const RUN_ID = "MEE-CORE-LIFECYCLE-REMAINING-DRAIN-V1";
const CONTRACT_HASH = "macro_approval_2026_06_26_remaining_drain_v1";
const MAX_OBSERVATIONS_PER_BATCH = 10_000;
const EXPECTED_EVENTS_PER_OBSERVATION = 7;
const WAIT_MS = 60_000;
const START_BATCH = Number.parseInt(process.env.MEE_LIFECYCLE_DRAIN_START_BATCH ?? "4", 10);
const MAX_BATCHES = Number.parseInt(process.env.MEE_LIFECYCLE_DRAIN_MAX_BATCHES ?? "20", 10);
const INITIAL_PREVIOUS_PLAN_DIR =
  process.env.MEE_LIFECYCLE_DRAIN_PREVIOUS_PLAN_DIR ?? "MEE_CORE_LIFECYCLE_BACKFILL_BATCH_03_PLAN_V1";
const FAST_ACTIVE_LISTING_DRAIN = process.env.MEE_LIFECYCLE_FAST_ACTIVE_LISTING_DRAIN === "1";
const USE_KEYSET_CURSOR = process.env.MEE_LIFECYCLE_USE_KEYSET_CURSOR === "1";

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
  const input = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(input).digest("hex");
}

function batchLabel(batchNumber) {
  return String(batchNumber).padStart(2, "0");
}

function planDirName(batchNumber) {
  return `MEE_CORE_LIFECYCLE_BACKFILL_BATCH_${batchLabel(batchNumber)}_PLAN_V1`;
}

function applyDirName(batchNumber) {
  return `MEE_CORE_LIFECYCLE_BACKFILL_BATCH_${batchLabel(batchNumber)}_APPLY_V1`;
}

function planPackageId(batchNumber) {
  return `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-${batchLabel(batchNumber)}-V1`;
}

function applyPackageId(batchNumber) {
  return `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-${batchLabel(batchNumber)}-APPLY-V1`;
}

function eventVersion(batchNumber) {
  return `MEE_CORE_LIFECYCLE_BACKFILL_BATCH_${batchLabel(batchNumber)}_PLAN_V1`;
}

function runNode(scriptPath, env) {
  return execFileSync("node", [scriptPath], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
    timeout: 600_000,
  });
}

function requireSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readJsonl(filePath) {
  const text = readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => JSON.parse(line));
}

async function getActiveCursorFromPlan(supabase, planDirectoryName) {
  const observationsPath = path.join(AUDIT_DIR, planDirectoryName, "market_evidence_observations.jsonl");
  const observations = readJsonl(observationsPath).filter((row) => row.source_type === "active_listing");
  const lastActive = observations.at(-1);
  if (!lastActive?.provider_observation_id) return null;

  const { data, error } = await supabase
    .from("market_listing_card_candidates")
    .select("id,created_at")
    .eq("id", lastActive.provider_observation_id)
    .single();
  if (error) throw new Error(`Failed to read active cursor for ${planDirectoryName}: ${error.message}`);
  return { created_at: data.created_at, id: data.id };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function assertCleanReport(report, expectedObservations) {
  const expectedEvents = expectedObservations * EXPECTED_EVENTS_PER_OBSERVATION;
  if (report.findings?.length) throw new Error(`Apply findings: ${report.findings.join(", ")}`);
  if (report.apply_summary?.inserted_market_evidence_observations !== expectedObservations) {
    throw new Error("Inserted observation count mismatch");
  }
  if (report.apply_summary?.inserted_market_evidence_lifecycle_events !== expectedEvents) {
    throw new Error("Inserted lifecycle event count mismatch");
  }
  if (report.readback?.observations?.actual !== expectedObservations) throw new Error("Observation readback mismatch");
  if (report.readback?.events?.actual !== expectedEvents) throw new Error("Event readback mismatch");
  if (report.readback?.events?.distinct_event_hashes !== expectedEvents) throw new Error("Event hash readback mismatch");
  if (report.readback?.current_view?.app_visible_true !== 0) throw new Error("app_visible boundary leak");
  if (report.readback?.current_view?.market_truth_true !== 0) throw new Error("market_truth boundary leak");
  if (report.readback?.public_pricing_surface?.pricing_observations_count !== 0) {
    throw new Error("pricing_observations boundary changed");
  }
  if (report.readback?.public_pricing_surface?.v_card_pricing_references_market_evidence !== false) {
    throw new Error("public pricing view references market evidence");
  }
}

mkdirSync(RUN_DIR, { recursive: true });

const supabase = requireSupabase();
const runStartedAt = new Date().toISOString();
const batchReports = [];
let previousPlanDir = INITIAL_PREVIOUS_PLAN_DIR;
let stoppedReason = "max_batches_reached";

for (let batchNumber = START_BATCH; batchNumber < START_BATCH + MAX_BATCHES; batchNumber += 1) {
  const cursor = USE_KEYSET_CURSOR ? await getActiveCursorFromPlan(supabase, previousPlanDir) : null;
  const planName = planDirName(batchNumber);
  const applyName = applyDirName(batchNumber);
  const planEnv = {
    MEE_LIFECYCLE_PLAN_DIR: planName,
    MEE_LIFECYCLE_PLAN_PACKAGE_ID: planPackageId(batchNumber),
    MEE_LIFECYCLE_EVENT_VERSION: eventVersion(batchNumber),
    MEE_LIFECYCLE_TOTAL_LIMIT: String(MAX_OBSERVATIONS_PER_BATCH),
    MEE_LIFECYCLE_REFERENCE_LIMIT: String(MAX_OBSERVATIONS_PER_BATCH),
    MEE_LIFECYCLE_LISTING_LIMIT: String(MAX_OBSERVATIONS_PER_BATCH),
    MEE_LIFECYCLE_FAST_ACTIVE_LISTING_DRAIN: FAST_ACTIVE_LISTING_DRAIN ? "1" : "0",
  };
  if (cursor) {
    planEnv.MEE_LIFECYCLE_LISTING_KEYSET_CREATED_AT = cursor.created_at;
    planEnv.MEE_LIFECYCLE_LISTING_KEYSET_AFTER_ID = cursor.id;
  }

  const planOutput = runNode("scripts/audits/market_evidence_lifecycle_backfill_batch_plan_v1.mjs", planEnv);
  writeFileSync(path.join(RUN_DIR, `${planName}.stdout.txt`), planOutput);
  const manifest = JSON.parse(readFileSync(path.join(AUDIT_DIR, planName, "manifest.json"), "utf8"));
  const plannedObservations = manifest.row_counts.market_evidence_observations;
  if (manifest.findings?.length) throw new Error(`Plan findings in ${planName}: ${manifest.findings.join(", ")}`);
  if (plannedObservations === 0) {
    stoppedReason = "no_eligible_source_rows_remaining";
    break;
  }
  if (plannedObservations > MAX_OBSERVATIONS_PER_BATCH) {
    throw new Error(`${planName} planned too many observations: ${plannedObservations}`);
  }
  if (manifest.row_counts.market_evidence_lifecycle_events !== plannedObservations * EXPECTED_EVENTS_PER_OBSERVATION) {
    throw new Error(`${planName} event count mismatch`);
  }

  const applyOutput = runNode("scripts/audits/market_evidence_lifecycle_backfill_batch_apply_v1.mjs", {
    MEE_LIFECYCLE_PLAN_DIR: planName,
    MEE_LIFECYCLE_APPLY_DIR: applyName,
    MEE_LIFECYCLE_APPLY_PACKAGE_ID: applyPackageId(batchNumber),
    MEE_LIFECYCLE_APPROVED_FINGERPRINT: manifest.package_fingerprint_sha256,
    MEE_LIFECYCLE_SKIP_PACKAGE_SQL_READBACK: "1",
  });
  writeFileSync(path.join(RUN_DIR, `${applyName}.stdout.txt`), applyOutput);

  const applyReport = JSON.parse(readFileSync(path.join(AUDIT_DIR, applyName, "report.json"), "utf8"));
  assertCleanReport(applyReport, plannedObservations);

  batchReports.push({
    batch_number: batchNumber,
    plan_dir: planName,
    apply_dir: applyName,
    plan_package_id: manifest.package_id,
    apply_package_id: applyReport.package_id,
    plan_fingerprint_sha256: manifest.package_fingerprint_sha256,
    apply_fingerprint_sha256: applyReport.package_fingerprint_sha256,
    row_counts: manifest.row_counts,
    readback: applyReport.readback,
  });

  previousPlanDir = planName;
  if (plannedObservations < MAX_OBSERVATIONS_PER_BATCH) {
    stoppedReason = "final_partial_batch_applied";
    break;
  }

  await sleep(WAIT_MS);
}

const summaryPayload = {
  run_id: RUN_ID,
  contract_hash: CONTRACT_HASH,
  batch_count: batchReports.length,
  total_inserted_observations: batchReports.reduce((sum, batch) => sum + batch.row_counts.market_evidence_observations, 0),
  total_inserted_events: batchReports.reduce((sum, batch) => sum + batch.row_counts.market_evidence_lifecycle_events, 0),
  stoppedReason,
};

const report = {
  run_id: RUN_ID,
  generated_at: new Date().toISOString(),
  started_at: runStartedAt,
  mode: "remaining_lifecycle_drain_run_only",
  package_fingerprint_sha256: sha256(summaryPayload),
  batch_size_limit: MAX_OBSERVATIONS_PER_BATCH,
  wait_between_batches_ms: WAIT_MS,
  stopped_reason: stoppedReason,
  batch_count: batchReports.length,
  total_inserted_observations: summaryPayload.total_inserted_observations,
  total_inserted_lifecycle_events: summaryPayload.total_inserted_events,
  batches: batchReports,
  boundary_proof: {
    provider_calls: false,
    source_fetches: false,
    pricing_observations_writes: false,
    ebay_active_prices_latest_writes: false,
    public_pricing_views: false,
    app_visible_pricing: false,
    public_price_rollups: false,
    identity_table_writes: false,
    vault_writes: false,
    image_storage_writes: false,
    deletes: false,
    upserts: false,
    merges: false,
    migrations: false,
    global_apply: false,
  },
};

writeFileSync(path.join(RUN_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  path.join(AUDIT_DIR, `${RUN_DIR_NAME}.md`),
  [
    "# MEE Core Lifecycle Remaining Drain V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `- Run: \`${RUN_ID}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Batches applied: ${report.batch_count}`,
    `- Total observations inserted: ${report.total_inserted_observations}`,
    `- Total lifecycle events inserted: ${report.total_inserted_lifecycle_events}`,
    `- Stopped reason: ${report.stopped_reason}`,
    "",
    "## Batches",
    "",
    ...report.batches.map(
      (batch) =>
        `- ${batch.apply_package_id}: ${batch.row_counts.market_evidence_observations} observations / ${batch.row_counts.market_evidence_lifecycle_events} events`,
    ),
    "",
  ].join("\n"),
);

console.log(JSON.stringify({
  run_id: report.run_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  stopped_reason: report.stopped_reason,
  batch_count: report.batch_count,
  total_inserted_observations: report.total_inserted_observations,
  total_inserted_lifecycle_events: report.total_inserted_lifecycle_events,
}, null, 2));
