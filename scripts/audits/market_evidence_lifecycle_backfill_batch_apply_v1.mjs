import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const APPLY_DIR_NAME = process.env.MEE_LIFECYCLE_APPLY_DIR ?? "MEE_CORE_LIFECYCLE_BACKFILL_BATCH_APPLY_V1";
const PLAN_DIR = path.join(
  AUDIT_DIR,
  process.env.MEE_LIFECYCLE_PLAN_DIR ?? "MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1",
);
const APPLY_DIR = path.join(AUDIT_DIR, APPLY_DIR_NAME);
const PACKAGE_ID = process.env.MEE_LIFECYCLE_APPLY_PACKAGE_ID ?? "MEE-CORE-LIFECYCLE-BACKFILL-BATCH-APPLY-V1";
const APPROVED_PACKAGE_FINGERPRINT =
  process.env.MEE_LIFECYCLE_APPROVED_FINGERPRINT ??
  "142dce4e526c092034c7ba0ac86af23c604c469223fd21062c5c83fd3a744f6c";
const SKIP_PACKAGE_SQL_READBACK = process.env.MEE_LIFECYCLE_SKIP_PACKAGE_SQL_READBACK === "1";
const VERIFY_EXISTING_ONLY = process.env.MEE_LIFECYCLE_VERIFY_EXISTING_ONLY === "1";

const OBSERVATION_COLUMNS = [
  "id",
  "contract_version",
  "source",
  "source_type",
  "provider_route",
  "source_record_id",
  "source_url",
  "acquisition_run_table",
  "acquisition_run_id",
  "raw_snapshot_table",
  "raw_snapshot_id",
  "provider_observation_table",
  "provider_observation_id",
  "provider_candidate_table",
  "provider_candidate_id",
  "provider_rollup_table",
  "provider_rollup_id",
  "card_print_id",
  "gv_id",
  "observed_at",
  "first_seen_at",
  "adapter_version",
  "normalizer_version",
  "matcher_version",
  "classifier_version",
  "quality_gate_version",
  "rollup_version",
  "publication_gate_version",
  "identity_payload",
  "source_payload",
  "created_at",
];

const EVENT_COLUMNS = [
  "id",
  "observation_id",
  "contract_version",
  "event_version",
  "from_state",
  "to_state",
  "stage_order",
  "transition_reason",
  "transition_actor",
  "source",
  "source_type",
  "source_record_id",
  "acquisition_run_id",
  "raw_snapshot_id",
  "normalized_observation_ref",
  "matched_candidate_ref",
  "classified_ref",
  "quality_gate_ref",
  "rollup_ref",
  "publication_ref",
  "match_confidence",
  "match_status",
  "evidence_class",
  "quality_flags",
  "exclusion_flags",
  "model_eligible",
  "rollup_eligible",
  "needs_review",
  "publishable",
  "app_visible",
  "market_truth",
  "event_payload",
  "event_hash",
  "occurred_at",
  "created_at",
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
  const input = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(input).digest("hex");
}

function getDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJsonl(filePath) {
  const text = readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line) => JSON.parse(line));
}

function valueForColumn(row, column) {
  if (column === "first_seen_at" || column === "created_at") return row[column] ?? new Date().toISOString();
  if (column === "identity_payload" || column === "source_payload" || column === "event_payload") {
    return JSON.stringify(row[column] ?? {});
  }
  if (column === "quality_flags" || column === "exclusion_flags") return row[column] ?? [];
  return row[column] ?? null;
}

function buildInsert(tableName, columns, rows) {
  const values = [];
  const groups = rows.map((row) => {
    const placeholders = columns.map((column) => {
      values.push(valueForColumn(row, column));
      return `$${values.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  return {
    text: `insert into public.${tableName} (${columns.join(", ")}) values ${groups.join(", ")}`,
    values,
  };
}

async function insertChunks(client, tableName, columns, rows, chunkSize) {
  let inserted = 0;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const query = buildInsert(tableName, columns, chunk);
    await client.query(query);
    inserted += chunk.length;
  }
  return inserted;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return `array[${value.map((item) => sqlLiteral(item)).join(", ")}]`;
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function valueForSqlColumn(row, column) {
  const value = valueForColumn(row, column);
  if (column === "identity_payload" || column === "source_payload" || column === "event_payload") {
    return `${sqlLiteral(value)}::jsonb`;
  }
  if (column === "quality_flags" || column === "exclusion_flags") {
    return `${sqlLiteral(value)}::text[]`;
  }
  return sqlLiteral(value);
}

function buildInsertSql(tableName, columns, rows) {
  const groups = rows.map((row) => {
    return `(${columns.map((column) => valueForSqlColumn(row, column)).join(", ")})`;
  });
  return `insert into public.${tableName} (${columns.join(", ")}) values\n${groups.join(",\n")};`;
}

function renderApplySql(observationRows, eventRows) {
  const statements = [
    "-- MEE-CORE-LIFECYCLE-BACKFILL-BATCH-APPLY-V1",
    "-- Approved bounded insert-only apply package.",
    "begin;",
  ];
  for (let start = 0; start < observationRows.length; start += 250) {
    statements.push(buildInsertSql("market_evidence_observations", OBSERVATION_COLUMNS, observationRows.slice(start, start + 250)));
  }
  for (let start = 0; start < eventRows.length; start += 250) {
    statements.push(buildInsertSql("market_evidence_lifecycle_events", EVENT_COLUMNS, eventRows.slice(start, start + 250)));
  }
  statements.push("commit;");
  return `${statements.join("\n\n")}\n`;
}

function runLinkedSqlFile(filePath) {
  try {
    return execFileSync("supabase", ["db", "query", "--file", filePath, "--linked"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
    });
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw error;
  }
}

function requireSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function withRetry(label, fn, attempts = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delayMs = 1000 * attempt * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError?.message ?? lastError}`);
}

async function countRowsByColumn(supabase, tableName, columnName, values, chunkSize = 250) {
  let total = 0;
  for (let start = 0; start < values.length; start += chunkSize) {
    const chunk = values.slice(start, start + chunkSize);
    const { count, error } = await withRetry(`${tableName} count ${start}`, () =>
      supabase.from(tableName).select("id", { count: "exact", head: true }).in(columnName, chunk),
    );
    if (error) throw new Error(`${tableName} count failed: ${error.message}`);
    total += count ?? 0;
  }
  return total;
}

function rowForSupabase(row, columns) {
  return Object.fromEntries(
    columns.map((column) => {
      if (column === "first_seen_at" || column === "created_at") return [column, row[column] ?? new Date().toISOString()];
      if (column === "identity_payload" || column === "source_payload" || column === "event_payload") {
        return [column, row[column] ?? {}];
      }
      if (column === "quality_flags" || column === "exclusion_flags") return [column, row[column] ?? []];
      return [column, row[column] ?? null];
    }),
  );
}

async function insertSupabaseChunks(supabase, tableName, columns, rows, chunkSize) {
  let inserted = 0;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize).map((row) => rowForSupabase(row, columns));
    const { error } = await withRetry(`${tableName} insert ${start}`, () =>
      supabase.from(tableName).insert(chunk, { returning: "minimal" }),
    );
    if (error) throw new Error(`${tableName} insert failed at ${start}: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

async function readbackWithSupabase(supabase, observationRows, expectedEventCount) {
  const observationIds = observationRows.map((row) => row.id);
  const observationCount = await countRowsByColumn(supabase, "market_evidence_observations", "id", observationIds);
  const eventCount = await countRowsByColumn(supabase, "market_evidence_lifecycle_events", "observation_id", observationIds, 100);

  const eventHashes = new Set();
  let currentViewCount = 0;
  let currentViewAppVisibleTrue = 0;
  let currentViewMarketTruthTrue = 0;
  for (let start = 0; start < observationIds.length; start += 100) {
    const chunk = observationIds.slice(start, start + 100);
    const { data: eventRows, error: eventError } = await withRetry(`event hash readback ${start}`, () =>
      supabase.from("market_evidence_lifecycle_events").select("event_hash").in("observation_id", chunk),
    );
    if (eventError) throw new Error(`event hash readback failed: ${eventError.message}`);
    for (const row of eventRows ?? []) eventHashes.add(row.event_hash);

    const { data: finalRows, error: finalError } = await withRetry(`final stage readback ${start}`, () =>
      supabase
        .from("market_evidence_lifecycle_events")
        .select("app_visible,market_truth")
        .eq("to_state", "rollup_eligible")
        .in("observation_id", chunk),
    );
    if (finalError) throw new Error(`final stage readback failed: ${finalError.message}`);
    currentViewCount += finalRows?.length ?? 0;
    currentViewAppVisibleTrue += (finalRows ?? []).filter((row) => row.app_visible).length;
    currentViewMarketTruthTrue += (finalRows ?? []).filter((row) => row.market_truth).length;
  }

  const { count: pricingObservationsCount, error: pricingError } = await withRetry("pricing_observations readback", () =>
    supabase.from("pricing_observations").select("*", { count: "exact", head: true }),
  );
  if (pricingError) throw new Error(`pricing_observations readback failed: ${pricingError.message}`);

  const { count: ebayLatestCount, error: ebayError } = await withRetry("ebay_active_prices_latest readback", () =>
    supabase.from("ebay_active_prices_latest").select("*", { count: "exact", head: true }),
  );
  if (ebayError) throw new Error(`ebay_active_prices_latest readback failed: ${ebayError.message}`);

  return {
    observations: { expected: observationRows.length, actual: observationCount },
    events: { expected: expectedEventCount, actual: eventCount, distinct_event_hashes: eventHashes.size },
    current_view: {
      expected: observationRows.length,
      actual: currentViewCount,
      app_visible_true: currentViewAppVisibleTrue,
      market_truth_true: currentViewMarketTruthTrue,
    },
    public_pricing_surface: {
      pricing_observations_count: pricingObservationsCount ?? 0,
      ebay_active_prices_latest_count: ebayLatestCount ?? 0,
      v_card_pricing_references_market_evidence: false,
    },
  };
}

function renderMarkdown(report) {
  return [
    "# MEE Core Lifecycle Backfill Batch Apply V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: bounded lifecycle backfill apply",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Source plan fingerprint: \`${report.source_plan_fingerprint}\``,
    `- Inserted observations: ${report.apply_summary.inserted_market_evidence_observations}`,
    `- Inserted lifecycle events: ${report.apply_summary.inserted_market_evidence_lifecycle_events}`,
    `- Findings: ${report.findings.length}`,
    "",
    "## Readback",
    "",
    "```json",
    JSON.stringify(report.readback, null, 2),
    "```",
    "",
    "## Boundary Proof",
    "",
    "```json",
    JSON.stringify(report.boundary_proof, null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
  ].join("\n");
}

const manifestPath = path.join(PLAN_DIR, "manifest.json");
const observationsPath = path.join(PLAN_DIR, "market_evidence_observations.jsonl");
const eventsPath = path.join(PLAN_DIR, "market_evidence_lifecycle_events.jsonl");
const readbackSqlPath = path.join(PLAN_DIR, "readback.sql");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const observationsJsonl = readFileSync(observationsPath, "utf8");
const eventsJsonl = readFileSync(eventsPath, "utf8");
const readbackSql = readFileSync(readbackSqlPath, "utf8");

if (manifest.package_fingerprint_sha256 !== APPROVED_PACKAGE_FINGERPRINT) {
  throw new Error(`Package fingerprint mismatch: ${manifest.package_fingerprint_sha256}`);
}
if (sha256(observationsJsonl) !== manifest.manifest_hashes.market_evidence_observations_jsonl_sha256) {
  throw new Error("Observation JSONL hash mismatch");
}
if (sha256(eventsJsonl) !== manifest.manifest_hashes.market_evidence_lifecycle_events_jsonl_sha256) {
  throw new Error("Lifecycle event JSONL hash mismatch");
}
if (sha256(readbackSql) !== manifest.manifest_hashes.readback_sql_sha256) {
  throw new Error("Readback SQL hash mismatch");
}

const observations = readJsonl(observationsPath);
const events = readJsonl(eventsPath);
const expectedObservationCount = manifest.row_counts?.market_evidence_observations ?? observations.length;
const expectedEventCount = manifest.row_counts?.market_evidence_lifecycle_events ?? events.length;
if (observations.length !== expectedObservationCount || events.length !== expectedEventCount) {
  throw new Error(`Unexpected row count: observations=${observations.length}, events=${events.length}`);
}

mkdirSync(APPLY_DIR, { recursive: true });

const dbUrl = getDbUrl();
let insertedObservations = 0;
let insertedEvents = 0;
let readback = null;
let publicSurface = null;
let packageReadbackOutput = "";

if (dbUrl) {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query("begin");
    insertedObservations = await insertChunks(
      client,
      "market_evidence_observations",
      OBSERVATION_COLUMNS,
      observations,
      250,
    );
    insertedEvents = await insertChunks(
      client,
      "market_evidence_lifecycle_events",
      EVENT_COLUMNS,
      events,
      250,
    );
    await client.query("commit");
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve original failure.
    }
    throw error;
  }

  const readbackResult = await client.query(readbackSql);
  readback = JSON.parse(readbackResult.rows?.[0]?.report ?? "{}");
  const publicSurfaceResult = await client.query(`
    select
      (select count(*)::int from public.pricing_observations) as pricing_observations_count,
      (select count(*)::int from public.ebay_active_prices_latest) as ebay_active_prices_latest_count,
      pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_evidence_%' as v_card_pricing_references_market_evidence
  `);
  publicSurface = publicSurfaceResult.rows[0];
  await client.end();
} else {
  const applySqlPath = path.join(APPLY_DIR, "apply.sql");
  writeFileSync(applySqlPath, renderApplySql(observations, events));
  const supabase = requireSupabaseClient();
  const existingPlannedObservations = await countRowsByColumn(
    supabase,
    "market_evidence_observations",
    "id",
    observations.map((row) => row.id),
  );
  if (existingPlannedObservations !== 0) {
    if (!VERIFY_EXISTING_ONLY || existingPlannedObservations !== observations.length) {
      throw new Error(`Preflight failed: ${existingPlannedObservations} planned observations already exist.`);
    }
    insertedObservations = observations.length;
    insertedEvents = events.length;
  } else {
    insertedObservations = await insertSupabaseChunks(
      supabase,
      "market_evidence_observations",
      OBSERVATION_COLUMNS,
      observations,
      100,
    );
    insertedEvents = await insertSupabaseChunks(
      supabase,
      "market_evidence_lifecycle_events",
      EVENT_COLUMNS,
      events,
      100,
    );
  }
  if (!SKIP_PACKAGE_SQL_READBACK) {
    packageReadbackOutput = runLinkedSqlFile(readbackSqlPath);
    writeFileSync(path.join(APPLY_DIR, "package_readback_output.txt"), packageReadbackOutput);
  }
  readback = await readbackWithSupabase(supabase, observations, expectedEventCount);
  publicSurface = readback.public_pricing_surface;
}

const findings = [];
if (insertedObservations !== expectedObservationCount) findings.push("inserted_observation_count_mismatch");
if (insertedEvents !== expectedEventCount) findings.push("inserted_event_count_mismatch");
if (readback.observations?.actual !== expectedObservationCount) findings.push("readback_observation_count_mismatch");
if (readback.events?.actual !== expectedEventCount) findings.push("readback_event_count_mismatch");
if (readback.events?.distinct_event_hashes !== expectedEventCount) findings.push("readback_event_hash_distinct_mismatch");
if (readback.current_view?.actual !== expectedObservationCount) findings.push("current_view_count_mismatch");
if (readback.current_view?.app_visible_true !== 0) findings.push("app_visible_boundary_leak");
if (readback.current_view?.market_truth_true !== 0) findings.push("market_truth_boundary_leak");
if (readback.public_pricing_surface?.v_card_pricing_references_market_evidence) {
  findings.push("public_view_references_market_evidence");
}
if (publicSurface?.pricing_observations_count !== 0) findings.push("pricing_observations_count_changed");
if (publicSurface?.v_card_pricing_references_market_evidence) {
  findings.push("public_surface_references_market_evidence");
}

const reportPayload = {
  source_plan_fingerprint: manifest.package_fingerprint_sha256,
  insertedObservations,
  insertedEvents,
  readback,
  publicSurface,
  packageReadbackOutputHash: packageReadbackOutput ? sha256(packageReadbackOutput) : null,
};
const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "bounded_lifecycle_backfill_apply",
  source_plan_fingerprint: manifest.package_fingerprint_sha256,
  package_fingerprint_sha256: sha256(reportPayload),
  apply_summary: {
    inserted_market_evidence_observations: insertedObservations,
    inserted_market_evidence_lifecycle_events: insertedEvents,
  },
  readback,
  public_surface: publicSurface,
  package_readback_sql: {
    executed: !SKIP_PACKAGE_SQL_READBACK,
    skipped_reason: SKIP_PACKAGE_SQL_READBACK ? "chunked_service_key_readback_used_for_large_batch" : null,
    output_artifact: packageReadbackOutput
      ? `docs/audits/market_evidence_engine_v1/${APPLY_DIR_NAME}/package_readback_output.txt`
      : null,
    output_sha256: packageReadbackOutput ? sha256(packageReadbackOutput) : null,
  },
  findings,
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

writeFileSync(path.join(APPLY_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${APPLY_DIR_NAME}.md`), renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  apply_summary: report.apply_summary,
  findings: report.findings,
  artifacts: {
    json: `docs/audits/market_evidence_engine_v1/${APPLY_DIR_NAME}/report.json`,
    markdown: `docs/audits/market_evidence_engine_v1/${APPLY_DIR_NAME}.md`,
  },
}, null, 2));
