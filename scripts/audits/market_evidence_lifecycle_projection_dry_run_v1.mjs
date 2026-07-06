import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const PACKAGE_ID = "MEE-CORE-LIFECYCLE-PROJECTION-DRY-RUN-V1";
const CONTRACT_VERSION = "MARKET_EVIDENCE_ENGINE_CORE_V1";
const EVENT_VERSION = "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1";

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

function runSql(sql) {
  const raw = execFileSync("supabase", ["db", "query", sql, "--linked"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  const parsed = JSON.parse(raw);
  return parsed.rows ?? [];
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
  const observationId = localUuid(`observation:${sourceRecordId}:active_listing:${row.observation_id}:${row.candidate_id}`);
  const evidenceClass = row.listing_evidence_class ?? "ambiguous";
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
    provider_observation_table: "market_listing_observations",
    provider_observation_id: row.observation_id,
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
    },
    source_payload: {
      listing_status: row.listing_status,
      listing_format: row.listing_format,
      currency: row.currency,
      total_ask_price_present: row.total_ask_price !== null && row.total_ask_price !== undefined,
      listing_evidence_class: evidenceClass,
    },
  };

  const hardBlocked = evidenceClass !== "raw_single" && evidenceClass !== "slab";
  const hasRequiredPrice = row.total_ask_price !== null && row.total_ask_price !== undefined && row.currency === "USD";
  const rollupEligible = !hardBlocked && hasRequiredPrice && row.card_print_id && row.match_status !== "blocked";

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
      dry_run_only: true,
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
      transition_actor: "dry_run_projection",
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

function assertNoSkippedStages(projectedRows) {
  const failures = [];
  for (const row of projectedRows) {
    const stages = row.lifecycle_events.map((event) => event.to_state);
    const expected = STAGES.map(([stage]) => stage);
    if (JSON.stringify(stages) !== JSON.stringify(expected)) {
      failures.push({ observation_id: row.observation.id, stages });
    }
    for (const event of row.lifecycle_events) {
      if (event.publishable || event.app_visible || event.market_truth) {
        failures.push({ observation_id: row.observation.id, boundary_leak: event.to_state });
      }
    }
  }
  return failures;
}

function renderMarkdown(report) {
  return [
    "# MEE Core Lifecycle Projection Dry Run V1",
    "",
    `Generated: ${report.generated_at}`,
    "",
    "Mode: read-only local projection, no DB writes",
    "",
    "## Summary",
    "",
    `- Package: \`${report.package_id}\``,
    `- Fingerprint: \`${report.package_fingerprint_sha256}\``,
    `- Reference samples: ${report.summary.reference_sample_count}`,
    `- Active-listing samples: ${report.summary.active_listing_sample_count}`,
    `- Projected observations: ${report.summary.projected_observation_count}`,
    `- Projected lifecycle events: ${report.summary.projected_event_count}`,
    `- Stage sequence valid: ${report.summary.stage_sequence_valid}`,
    "",
    "## Boundary Proof",
    "",
    "```json",
    JSON.stringify(report.boundary_proof, null, 2),
    "```",
    "",
    "## Projected Stage Sequence",
    "",
    report.stage_sequence.map((stage) => `- ${stage.stage_order}. \`${stage.to_state}\``).join("\n"),
    "",
    "## Samples",
    "",
    "```json",
    JSON.stringify(report.projected_samples.map((sample) => ({
      lane: sample.lane,
      observation: sample.observation,
      lifecycle_event_count: sample.lifecycle_events.length,
      final_state: sample.lifecycle_events.at(-1)?.to_state,
      final_rollup_eligible: sample.lifecycle_events.at(-1)?.rollup_eligible,
    })), null, 2),
    "```",
    "",
    "## Findings",
    "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Step",
    "",
    "If this projection shape is accepted, the next step is a tiny real backfill candidate plan, still capped and still internal-only.",
    "",
  ].join("\n");
}

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
order by n.normalized_at desc, n.id
limit 3
`);

const listingRows = runSql(`
select
  cc.id as candidate_id,
  o.id as observation_id,
  pe.id as price_event_id,
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
  pe.event_payload->>'listing_evidence_class' as listing_evidence_class
from public.market_listing_card_candidates cc
join public.market_listing_observations o on o.id = cc.observation_id
left join lateral (
  select pe_inner.*
  from public.market_listing_price_events pe_inner
  where pe_inner.observation_id = o.id
  order by pe_inner.observed_at desc, pe_inner.id
  limit 1
) pe on true
where cc.raw_snapshot_id is not null
  and cc.card_print_id is not null
order by cc.created_at desc, cc.id
limit 3
`);

const projectedSamples = [
  ...referenceRows.map(projectReference),
  ...listingRows.map(projectListing),
];

const stageFailures = assertNoSkippedStages(projectedSamples);
const reportPayload = {
  referenceRows,
  listingRows,
  projectedSamples,
  stageFailures,
};

const report = {
  package_id: PACKAGE_ID,
  generated_at: new Date().toISOString(),
  mode: "read_only_projection_no_db_writes",
  contract_version: CONTRACT_VERSION,
  event_version: EVENT_VERSION,
  package_fingerprint_sha256: sha256(reportPayload),
  summary: {
    reference_sample_count: referenceRows.length,
    active_listing_sample_count: listingRows.length,
    projected_observation_count: projectedSamples.length,
    projected_event_count: projectedSamples.reduce((sum, sample) => sum + sample.lifecycle_events.length, 0),
    stage_sequence_valid: stageFailures.length === 0,
  },
  stage_sequence: STAGES.map(([toState, stageOrder]) => ({ to_state: toState, stage_order: stageOrder })),
  projected_samples: projectedSamples,
  findings: stageFailures.length ? ["stage_sequence_or_boundary_failure"] : [],
  boundary_proof: {
    db_writes: false,
    evidence_backfill: false,
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
    merges: false,
    migrations: false,
    global_apply: false,
  },
};

mkdirSync(AUDIT_DIR, { recursive: true });
const jsonPath = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1.json");
const mdPath = path.join(AUDIT_DIR, "MEE_CORE_LIFECYCLE_PROJECTION_DRY_RUN_V1.md");
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(mdPath, renderMarkdown(report));

console.log(JSON.stringify({
  package_id: report.package_id,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  summary: report.summary,
  findings: report.findings,
  artifacts: {
    json: path.relative(REPO_ROOT, jsonPath).replace(/\\/g, "/"),
    markdown: path.relative(REPO_ROOT, mdPath).replace(/\\/g, "/"),
  },
}, null, 2));
