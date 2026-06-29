import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PACKAGE_DIR_NAME = process.env.MEE_LIFECYCLE_PLAN_DIR ?? "MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1";
const PACKAGE_DIR = path.join(AUDIT_DIR, PACKAGE_DIR_NAME);
const PACKAGE_ID = process.env.MEE_LIFECYCLE_PLAN_PACKAGE_ID ?? "MEE-CORE-LIFECYCLE-BACKFILL-BATCH-V1";
const CONTRACT_VERSION = "MARKET_EVIDENCE_ENGINE_CORE_V1";
const EVENT_VERSION = process.env.MEE_LIFECYCLE_EVENT_VERSION ?? "MEE_CORE_LIFECYCLE_BACKFILL_BATCH_PLAN_V1";
const TOTAL_LIMIT = Number.parseInt(process.env.MEE_LIFECYCLE_TOTAL_LIMIT ?? "5000", 10);
const REFERENCE_LIMIT = Number.parseInt(process.env.MEE_LIFECYCLE_REFERENCE_LIMIT ?? "2500", 10);
const LISTING_LIMIT = Number.parseInt(process.env.MEE_LIFECYCLE_LISTING_LIMIT ?? "2500", 10);
const LISTING_KEYSET_CREATED_AT = process.env.MEE_LIFECYCLE_LISTING_KEYSET_CREATED_AT ?? null;
const LISTING_KEYSET_AFTER_ID = process.env.MEE_LIFECYCLE_LISTING_KEYSET_AFTER_ID ?? null;
const FAST_ACTIVE_LISTING_DRAIN = process.env.MEE_LIFECYCLE_FAST_ACTIVE_LISTING_DRAIN === "1";
const REFERENCE_SOURCES = (process.env.MEE_LIFECYCLE_REFERENCE_SOURCES ?? "")
  .split(",")
  .map((source) => source.trim())
  .filter(Boolean);

const STAGES = [
  ["acquired", 1],
  ["raw_stored", 2],
  ["normalized", 3],
  ["matched", 4],
  ["classified", 5],
  ["quality_gated", 6],
  ["rollup_eligible", 7],
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

function localUuid(seed) {
  const hex = sha256(seed).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function q(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlInList(values) {
  return values.map((value) => q(value)).join(", ");
}

function runSql(sql) {
  const raw = execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(raw).rows ?? [];
}

function asJsonl(rows) {
  return `${rows.map((row) => JSON.stringify(stable(row))).join("\n")}\n`;
}

function buildEvents({
  observation,
  sourceRecordId,
  acquisitionRunId,
  rawSnapshotId,
  normalizedRef,
  matchedRef,
  classifiedRef,
  qualityGateRef,
  modelEligible,
  rollupEligible,
  matchConfidence,
  matchStatus,
  evidenceClass,
  qualityFlags,
  exclusionFlags,
  occurredAt,
  basePayload,
}) {
  return STAGES.map(([toState, stageOrder], index) => {
    const fromState = index === 0 ? null : STAGES[index - 1][0];
    const eventPayload = {
      ...basePayload,
      batch_plan_only: true,
      projected_stage: toState,
      projected_from_existing_warehouse: true,
    };
    const seed = {
      observation_id: observation.id,
      to_state: toState,
      stage_order: stageOrder,
      source_record_id: sourceRecordId,
      event_payload: eventPayload,
    };
    return {
      id: localUuid(`event:${sha256(seed)}`),
      observation_id: observation.id,
      contract_version: CONTRACT_VERSION,
      event_version: EVENT_VERSION,
      from_state: fromState,
      to_state: toState,
      stage_order: stageOrder,
      transition_reason: "projected_from_existing_warehouse_row",
      transition_actor: "batch_plan_projection",
      source: observation.source,
      source_type: observation.source_type,
      source_record_id: sourceRecordId,
      acquisition_run_id: acquisitionRunId,
      raw_snapshot_id: rawSnapshotId,
      normalized_observation_ref: stageOrder >= 3 ? normalizedRef : null,
      matched_candidate_ref: stageOrder >= 4 ? matchedRef : null,
      classified_ref: stageOrder >= 5 ? classifiedRef : null,
      quality_gate_ref: stageOrder >= 6 ? qualityGateRef : null,
      rollup_ref: null,
      publication_ref: null,
      match_confidence: stageOrder >= 4 ? matchConfidence : null,
      match_status: stageOrder >= 4 ? matchStatus : null,
      evidence_class: stageOrder >= 5 ? evidenceClass : null,
      quality_flags: stageOrder >= 6 ? qualityFlags : [],
      exclusion_flags: stageOrder >= 6 ? exclusionFlags : [],
      model_eligible: stageOrder >= 6 ? modelEligible : false,
      rollup_eligible: stageOrder >= 7 ? rollupEligible : false,
      needs_review: true,
      publishable: false,
      app_visible: false,
      market_truth: false,
      event_payload: eventPayload,
      event_hash: sha256(seed),
      occurred_at: occurredAt,
    };
  });
}

function projectReference(row) {
  const sourceRecordId = `${row.source}:${row.candidate_hash}`;
  const observationId = localUuid(`observation:${sourceRecordId}:reference:${row.normalized_evidence_id}`);
  const observation = {
    id: observationId,
    contract_version: CONTRACT_VERSION,
    source: row.source,
    source_type: "reference",
    provider_route: null,
    source_record_id: sourceRecordId,
    source_url: row.source_url,
    acquisition_run_table: "market_reference_acquisition_runs",
    acquisition_run_id: row.acquisition_run_id,
    raw_snapshot_table: "market_reference_raw_snapshots",
    raw_snapshot_id: row.raw_snapshot_id,
    provider_observation_table: "market_reference_normalized_evidence",
    provider_observation_id: row.normalized_evidence_id,
    provider_candidate_table: "market_reference_candidates",
    provider_candidate_id: row.candidate_id,
    provider_rollup_table: null,
    provider_rollup_id: null,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    observed_at: row.observed_at,
    adapter_version: "market_reference_existing_warehouse",
    normalizer_version: row.normalizer_version,
    matcher_version: "market_reference_candidates_existing_match_hint",
    classifier_version: EVENT_VERSION,
    quality_gate_version: EVENT_VERSION,
    rollup_version: null,
    publication_gate_version: null,
    identity_payload: {
      match_confidence_hint: row.match_confidence_hint,
      metric_key: row.metric_key,
      metric_family: row.metric_family,
    },
    source_payload: {
      model_disposition: row.model_disposition,
      model_eligible: row.model_eligible,
      normalized_currency: row.normalized_currency,
      normalized_price_present: row.normalized_price !== null && row.normalized_price !== undefined,
    },
  };

  return {
    lane: "reference",
    observation,
    lifecycle_events: buildEvents({
      observation,
      sourceRecordId,
      acquisitionRunId: row.acquisition_run_id,
      rawSnapshotId: row.raw_snapshot_id,
      normalizedRef: row.normalized_evidence_id,
      matchedRef: row.candidate_id,
      classifiedRef: row.normalized_evidence_id,
      qualityGateRef: row.normalized_evidence_id,
      modelEligible: row.model_eligible === true,
      rollupEligible: row.model_eligible === true && row.model_disposition === "reference_model_candidate",
      matchConfidence: null,
      matchStatus: row.match_confidence_hint ?? "unreviewed",
      evidenceClass: "reference_metric",
      qualityFlags: row.quality_flags ?? [],
      exclusionFlags: row.exclusion_flags ?? [],
      occurredAt: row.normalized_at ?? row.observed_at,
      basePayload: {
        provider_candidate_table: "market_reference_candidates",
        provider_normalized_table: "market_reference_normalized_evidence",
        model_disposition: row.model_disposition,
      },
    }),
  };
}

function projectListing(row) {
  const sourceRecordId = `${row.source}:${row.source_listing_id}`;
  const observationId = localUuid(`observation:${sourceRecordId}:active_listing_candidate:${row.candidate_id}`);
  const evidenceClass = row.listing_evidence_class ?? "ambiguous";
  const hardBlocked = evidenceClass !== "raw_single" && evidenceClass !== "slab";
  const hasRequiredPrice = row.total_ask_price !== null && row.total_ask_price !== undefined && row.currency === "USD";
  const rollupEligible = Boolean(!hardBlocked && hasRequiredPrice && row.card_print_id && row.match_status !== "blocked");
  const observation = {
    id: observationId,
    contract_version: CONTRACT_VERSION,
    source: row.source,
    source_type: "active_listing",
    provider_route: "ebay_browse_api",
    source_record_id: sourceRecordId,
    source_url: row.listing_url,
    acquisition_run_table: "market_listing_acquisition_runs",
    acquisition_run_id: row.acquisition_run_id,
    raw_snapshot_table: "market_listing_raw_snapshots",
    raw_snapshot_id: row.raw_snapshot_id,
    provider_observation_table: "market_listing_card_candidates",
    provider_observation_id: row.candidate_id,
    provider_candidate_table: "market_listing_card_candidates",
    provider_candidate_id: row.candidate_id,
    provider_rollup_table: null,
    provider_rollup_id: null,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    observed_at: row.observed_at,
    adapter_version: "market_listing_existing_warehouse",
    normalizer_version: "market_listing_observations_existing_shape",
    matcher_version: row.match_version,
    classifier_version: EVENT_VERSION,
    quality_gate_version: EVENT_VERSION,
    rollup_version: null,
    publication_gate_version: null,
    identity_payload: {
      listing_title: row.listing_title,
      match_status: row.match_status,
      match_confidence: row.match_confidence,
      provider_market_listing_observation_id: row.observation_id,
    },
    source_payload: {
      listing_status: row.listing_status,
      listing_format: row.listing_format,
      currency: row.currency,
      total_ask_price_present: row.total_ask_price !== null && row.total_ask_price !== undefined,
      listing_evidence_class: evidenceClass,
    },
  };

  return {
    lane: "active_listing",
    observation,
    lifecycle_events: buildEvents({
      observation,
      sourceRecordId,
      acquisitionRunId: row.acquisition_run_id,
      rawSnapshotId: row.raw_snapshot_id,
      normalizedRef: row.observation_id,
      matchedRef: row.candidate_id,
      classifiedRef: row.price_event_id ?? row.observation_id,
      qualityGateRef: row.price_event_id ?? row.candidate_id,
      modelEligible: false,
      rollupEligible,
      matchConfidence: row.match_confidence,
      matchStatus: row.match_status,
      evidenceClass,
      qualityFlags: hardBlocked ? ["projected_review_required_evidence_class"] : [],
      exclusionFlags: row.exclusion_flags ?? [],
      occurredAt: row.observed_at,
      basePayload: {
        provider_observation_table: "market_listing_observations",
        provider_candidate_table: "market_listing_card_candidates",
        provider_price_event_table: "market_listing_price_events",
        listing_status: row.listing_status,
        listing_format: row.listing_format,
      },
    }),
  };
}

function validateBatch(observations, events) {
  const findings = [];
  const observationIds = new Set(observations.map((row) => row.id));
  const eventHashes = new Set();
  const observationKeys = new Set();

  for (const observation of observations) {
    const key = [
      observation.source,
      observation.source_type,
      observation.source_record_id,
      observation.provider_observation_table ?? "",
      observation.provider_observation_id ?? "",
    ].join("|");
    if (observationKeys.has(key)) findings.push(`duplicate_observation_key:${key}`);
    observationKeys.add(key);
  }

  for (const event of events) {
    if (!observationIds.has(event.observation_id)) findings.push(`event_missing_observation:${event.id}`);
    if (eventHashes.has(event.event_hash)) findings.push(`duplicate_event_hash:${event.event_hash}`);
    eventHashes.add(event.event_hash);
    if (event.needs_review !== true) findings.push(`needs_review_leak:${event.id}`);
    if (event.publishable !== false) findings.push(`publishable_leak:${event.id}`);
    if (event.app_visible !== false) findings.push(`app_visible_leak:${event.id}`);
    if (event.market_truth !== false) findings.push(`market_truth_leak:${event.id}`);
  }

  const expectedStages = STAGES.map(([stage]) => stage);
  for (const observation of observations) {
    const stages = events
      .filter((event) => event.observation_id === observation.id)
      .sort((left, right) => left.stage_order - right.stage_order)
      .map((event) => event.to_state);
    if (JSON.stringify(stages) !== JSON.stringify(expectedStages)) {
      findings.push(`stage_sequence_invalid:${observation.id}`);
    }
  }

  return findings;
}

function buildReadbackSql(observations, events) {
  const observationValues = observations.map((row) => `(${q(row.id)}::uuid)`).join(",\n    ");
  const eventHashValues = events.map((row) => `(${q(row.event_hash)}::text)`).join(",\n    ");
  return `
-- MEE_CORE_LIFECYCLE_BACKFILL_BATCH_V1 readback SQL.
-- Run only after an explicitly approved apply package.
with expected_observations(id) as (
  values
    ${observationValues}
),
expected_events(event_hash) as (
  values
    ${eventHashValues}
),
obs as (
  select o.*
  from public.market_evidence_observations o
  join expected_observations e on e.id = o.id
),
evt as (
  select e.*
  from public.market_evidence_lifecycle_events e
  join expected_events x on x.event_hash = e.event_hash
),
stage_sequences as (
  select
    observation_id,
    jsonb_agg(to_state order by stage_order) as stages,
    count(*) as event_count,
    bool_or(publishable is distinct from false) as publishable_leak,
    bool_or(app_visible is distinct from false) as app_visible_leak,
    bool_or(market_truth is distinct from false) as market_truth_leak,
    bool_or(needs_review is distinct from true) as needs_review_leak
  from evt
  group by observation_id
)
select jsonb_build_object(
  'observations', jsonb_build_object(
    'expected', ${observations.length},
    'actual', (select count(*) from obs)
  ),
  'events', jsonb_build_object(
    'expected', ${events.length},
    'actual', (select count(*) from evt),
    'distinct_event_hashes', (select count(distinct event_hash) from evt)
  ),
  'current_view', jsonb_build_object(
    'expected', ${observations.length},
    'actual', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
    ),
    'app_visible_true', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
      where v.app_visible is distinct from false
    ),
    'market_truth_true', (
      select count(*)
      from public.v_market_evidence_lifecycle_current_v1 v
      join expected_observations e on e.id = v.observation_id
      where v.market_truth is distinct from false
    )
  ),
  'stage_sequences', coalesce((
    select jsonb_agg(to_jsonb(stage_sequences) order by observation_id)
    from stage_sequences
  ), '[]'::jsonb),
  'public_pricing_surface', jsonb_build_object(
    'pricing_observations_count', (select count(*) from public.pricing_observations),
    'v_card_pricing_references_market_evidence', pg_get_viewdef('public.v_card_pricing_ui_v1'::regclass, true) ilike '%market_evidence_%'
  )
)::text as report;
`;
}

function renderMarkdown(report) {
  return [
    "# MEE Core Lifecycle Backfill Batch Plan V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: local batch plan only, no DB writes",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Package fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Target observation cap: ${report.limits.total_limit}`,
    `- Reference observations: ${report.row_counts.reference_observations}`,
    `- Active-listing observations: ${report.row_counts.active_listing_observations}`,
    `- Total observations: ${report.row_counts.market_evidence_observations}`,
    `- Lifecycle events: ${report.row_counts.market_evidence_lifecycle_events}`,
    `- Findings: ${report.findings.length}`,
    "",
    "## Manifest Hashes",
    "",
    "```json",
    JSON.stringify(report.manifest_hashes, null, 2),
    "```",
    "",
    "## Duplicate Risk",
    "",
    "```json",
    JSON.stringify(report.duplicate_risk, null, 2),
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
    "## Artifacts",
    "",
    `- Observations: \`${report.artifacts.observations_jsonl}\``,
    `- Events: \`${report.artifacts.lifecycle_events_jsonl}\``,
    `- Readback SQL: \`${report.artifacts.readback_sql}\``,
    `- Manifest: \`${report.artifacts.manifest_json}\``,
    "",
  ].join("\n");
}

const existingCounts = runSql(`
select
  (select count(*)::int from public.market_evidence_observations) as existing_observation_count,
  (select count(*)::int from public.market_evidence_lifecycle_events) as existing_event_count
`);

const referenceRows = runSql(`
select
  c.id as candidate_id,
  n.id as normalized_evidence_id,
  c.acquisition_run_id,
  c.raw_snapshot_id,
  c.card_print_id,
  c.gv_id,
  c.source,
  c.source_url,
  c.candidate_hash,
  c.observed_at,
  c.match_confidence_hint,
  c.exclusion_flags,
  n.normalizer_version,
  n.metric_key,
  n.metric_family,
  n.normalized_price,
  n.normalized_currency,
  n.model_disposition,
  n.model_eligible,
  n.quality_flags,
  n.normalized_at
from public.market_reference_normalized_evidence n
join public.market_reference_candidates c on c.id = n.candidate_id
where c.raw_snapshot_id is not null
  ${REFERENCE_SOURCES.length > 0 ? `and c.source in (${sqlInList(REFERENCE_SOURCES)})` : ""}
  and not exists (
    select 1
    from public.market_evidence_observations existing
    where existing.source = c.source
      and existing.source_type = 'reference'
      and existing.source_record_id = c.source || ':' || c.candidate_hash
      and existing.provider_observation_table = 'market_reference_normalized_evidence'
      and existing.provider_observation_id = n.id
  )
order by n.normalized_at desc, n.id
limit ${REFERENCE_LIMIT}
`);

const listingRows = runSql(`
select
  cc.id as candidate_id,
  o.id as observation_id,
  ${FAST_ACTIVE_LISTING_DRAIN ? "null::uuid" : "pe.id"} as price_event_id,
  o.acquisition_run_id,
  o.raw_snapshot_id,
  cc.card_print_id,
  cc.gv_id,
  o.source,
  o.source_listing_id,
  o.listing_url,
  o.listing_title,
  o.listing_status,
  o.listing_format,
  o.total_ask_price,
  o.currency,
  o.observed_at,
  cc.match_version,
  cc.match_status,
  cc.match_confidence,
  cc.exclusion_flags,
  ${FAST_ACTIVE_LISTING_DRAIN ? "'active_listing_review_required'" : "pe.event_payload->>'listing_evidence_class'"} as listing_evidence_class
from public.market_listing_card_candidates cc
join public.market_listing_observations o on o.id = cc.observation_id
${FAST_ACTIVE_LISTING_DRAIN ? "" : `left join lateral (
  select pe_inner.*
  from public.market_listing_price_events pe_inner
  where pe_inner.observation_id = o.id
  order by pe_inner.observed_at desc, pe_inner.id
  limit 1
) pe on true`}
where cc.raw_snapshot_id is not null
  and cc.card_print_id is not null
  ${
    LISTING_KEYSET_CREATED_AT && LISTING_KEYSET_AFTER_ID
      ? `and (
    cc.created_at < ${q(LISTING_KEYSET_CREATED_AT)}::timestamptz
    or (
      cc.created_at = ${q(LISTING_KEYSET_CREATED_AT)}::timestamptz
      and cc.id > ${q(LISTING_KEYSET_AFTER_ID)}::uuid
    )
  )`
      : ""
  }
  and not exists (
    select 1
    from public.market_evidence_observations existing
    where existing.source = o.source
      and existing.source_type = 'active_listing'
      and existing.source_record_id = o.source || ':' || o.source_listing_id
      and existing.provider_observation_table = 'market_listing_card_candidates'
      and existing.provider_observation_id = cc.id
  )
order by cc.created_at desc, cc.id
limit ${LISTING_LIMIT}
`);

const projected = [
  ...referenceRows.map(projectReference),
  ...listingRows.map(projectListing),
].slice(0, TOTAL_LIMIT);

const observations = projected.map((sample) => sample.observation);
const lifecycleEvents = projected.flatMap((sample) => sample.lifecycle_events);
const observationJsonl = asJsonl(observations);
const lifecycleEventsJsonl = asJsonl(lifecycleEvents);
const readbackSql = buildReadbackSql(observations, lifecycleEvents);
const findings = validateBatch(observations, lifecycleEvents);

const laneCounts = projected.reduce(
  (acc, sample) => {
    acc[sample.lane] = (acc[sample.lane] ?? 0) + 1;
    return acc;
  },
  {},
);

const duplicateRisk = {
  observation_ids_unique: new Set(observations.map((row) => row.id)).size === observations.length,
  observation_keys_unique:
    new Set(
      observations.map((row) =>
        [
          row.source,
          row.source_type,
          row.source_record_id,
          row.provider_observation_table ?? "",
          row.provider_observation_id ?? "",
        ].join("|"),
      ),
    ).size === observations.length,
  event_hashes_unique: new Set(lifecycleEvents.map((row) => row.event_hash)).size === lifecycleEvents.length,
  excludes_existing_market_evidence_observations: true,
};

const manifestHashes = {
  market_evidence_observations_jsonl_sha256: sha256(observationJsonl),
  market_evidence_lifecycle_events_jsonl_sha256: sha256(lifecycleEventsJsonl),
  readback_sql_sha256: sha256(readbackSql),
};

const reportPayload = {
  observations_hash: manifestHashes.market_evidence_observations_jsonl_sha256,
  lifecycle_events_hash: manifestHashes.market_evidence_lifecycle_events_jsonl_sha256,
  readback_sql_hash: manifestHashes.readback_sql_sha256,
  row_counts: {
    observations: observations.length,
    events: lifecycleEvents.length,
  },
  duplicateRisk,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "local_backfill_batch_plan_only_no_db_writes",
  event_version: EVENT_VERSION,
  package_fingerprint_sha256: sha256(reportPayload),
  limits: {
    total_limit: TOTAL_LIMIT,
    reference_limit: REFERENCE_LIMIT,
    active_listing_limit: LISTING_LIMIT,
  },
  existing_lifecycle_counts_before_plan: existingCounts[0],
  row_counts: {
    reference_observations: laneCounts.reference ?? 0,
    active_listing_observations: laneCounts.active_listing ?? 0,
    market_evidence_observations: observations.length,
    market_evidence_lifecycle_events: lifecycleEvents.length,
  },
  manifest_hashes: manifestHashes,
  duplicate_risk: duplicateRisk,
  findings,
  artifacts: {
    observations_jsonl: `docs/audits/market_evidence_engine_v1/${PACKAGE_DIR_NAME}/market_evidence_observations.jsonl`,
    lifecycle_events_jsonl: `docs/audits/market_evidence_engine_v1/${PACKAGE_DIR_NAME}/market_evidence_lifecycle_events.jsonl`,
    readback_sql: `docs/audits/market_evidence_engine_v1/${PACKAGE_DIR_NAME}/readback.sql`,
    manifest_json: `docs/audits/market_evidence_engine_v1/${PACKAGE_DIR_NAME}/manifest.json`,
    report_md: `docs/audits/market_evidence_engine_v1/${PACKAGE_DIR_NAME}.md`,
  },
  boundary_proof: {
    db_writes: false,
    evidence_backfill_apply: false,
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

mkdirSync(PACKAGE_DIR, { recursive: true });
writeFileSync(path.join(PACKAGE_DIR, "market_evidence_observations.jsonl"), observationJsonl);
writeFileSync(path.join(PACKAGE_DIR, "market_evidence_lifecycle_events.jsonl"), lifecycleEventsJsonl);
writeFileSync(path.join(PACKAGE_DIR, "readback.sql"), readbackSql);
writeFileSync(path.join(PACKAGE_DIR, "manifest.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(path.join(AUDIT_DIR, `${PACKAGE_DIR_NAME}.md`), renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  row_counts: report.row_counts,
  manifest_hashes: report.manifest_hashes,
  duplicate_risk: report.duplicate_risk,
  findings: report.findings,
  artifacts: report.artifacts,
}, null, 2));
