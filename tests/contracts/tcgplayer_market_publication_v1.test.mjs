import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3,
  evaluateTcgplayerMarketQualificationV1,
  normalizeTcgplayerMarketSubtypeV1,
} from "../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs";
import {
  classifyMarketPipelineFailureV1,
  parseRetryDelaysV1,
  retryDelayMsV1,
} from "../../backend/pricing/tcgplayer_market_operations_policy_v1.mjs";
import {
  evaluateTcgplayerCurrentSourceHealthV1,
  TCGPLAYER_MARKET_HEALTH_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_health_policy_v1.mjs";
import {
  TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1,
  TCGPLAYER_MARKET_STAGED_CANDIDATE_PAGE_SIZE_V1,
  buildTcgplayerCandidateProductPagesV1,
  inspectTcgplayerBoundedPageProgressV1,
  inspectTcgplayerCandidateRowsV1,
} from "../../backend/pricing/tcgplayer_market_candidate_paging_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260728010000_tcgplayer_market_publication_v1.sql",
  ),
  "utf8",
);
const CANDIDATE_PERFORMANCE_MIGRATION = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260728020000_tcgplayer_market_candidate_view_performance_v1.sql",
  ),
  "utf8",
);
const ASSIGNMENT_IDEMPOTENCY_MIGRATION = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260728030000_tcgplayer_market_assignment_prepare_idempotency_v1.sql",
  ),
  "utf8",
);
const ASSIGNMENT_RUNTIME_REPAIR_MIGRATION = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260729190000_tcgplayer_market_assignment_prepare_runtime_repair_v1.sql",
  ),
  "utf8",
);
const WORKER = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgplayer_market_publication_worker_v1.mjs",
  ),
  "utf8",
);
const PIPELINE = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgplayer_market_pipeline_v1.mjs",
  ),
  "utf8",
);
const HEALTH = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgplayer_market_health_v1.mjs",
  ),
  "utf8",
);
const ROLLBACK_WORKER = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgplayer_market_rollback_v1.mjs",
  ),
  "utf8",
);
const PROVENANCE_LOOKUP = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_provenance_lookup_v1.mjs",
  ),
  "utf8",
);
const PROVENANCE_POLICY = readFileSync(
  path.join(
    ROOT,
    "backend",
    "pricing",
    "tcgplayer_market_provenance_policy_v1.mjs",
  ),
  "utf8",
);
const LOCAL_SMOKE = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_publication_local_smoke_v1.mjs",
  ),
  "utf8",
);
const SCHEDULED_RUNNER = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgplayer_market_scheduled_runner_v1.mjs",
  ),
  "utf8",
);
const OPERATIONS_WEBHOOK = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "ops",
    "grookai_operations_webhook_v1.mjs",
  ),
  "utf8",
);
const SCHEDULED_SERVICE = readFileSync(
  path.join(
    ROOT,
    "deploy",
    "systemd",
    "grookai-tcgplayer-market-pipeline.service",
  ),
  "utf8",
);
const SCHEDULED_TIMER = readFileSync(
  path.join(
    ROOT,
    "deploy",
    "systemd",
    "grookai-tcgplayer-market-pipeline.timer",
  ),
  "utf8",
);
const OPERATIONS_WEBHOOK_SERVICE = readFileSync(
  path.join(
    ROOT,
    "deploy",
    "systemd",
    "grookai-operations-webhook@.service",
  ),
  "utf8",
);
const SCHEDULE_INSTALLER = readFileSync(
  path.join(
    ROOT,
    "deploy",
    "scripts",
    "install-tcgplayer-market-pipeline-systemd.sh",
  ),
  "utf8",
);
const SCHEDULE_VERIFIER = readFileSync(
  path.join(
    ROOT,
    "deploy",
    "scripts",
    "verify-tcgplayer-market-pipeline-systemd.sh",
  ),
  "utf8",
);
const SCHEDULE_ENV_EXAMPLE = readFileSync(
  path.join(ROOT, "deploy", "env", "tcgplayer-market-pricing.env.example"),
  "utf8",
);
const RUNBOOK = readFileSync(
  path.join(
    ROOT,
    "docs",
    "runbooks",
    "TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md",
  ),
  "utf8",
);
const TCGCSV_WAREHOUSE_WORKER = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "workers",
    "tcgcsv_full_source_warehouse_worker_v1.mjs",
  ),
  "utf8",
);
const TCGCSV_ARTIFACT_LINK_REPAIR = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgcsv_current_price_artifact_link_repair_v1.mjs",
  ),
  "utf8",
);
const WEB_READ_MODEL = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "lib",
    "pricing",
    "marketPricingReadModelV1.ts",
  ),
  "utf8",
);
const WEB_VAULT = readFileSync(
  path.join(
    ROOT,
    "apps",
    "web",
    "src",
    "lib",
    "vault",
    "getCanonicalVaultCollectorRows.ts",
  ),
  "utf8",
);
const FLUTTER_PRICING = readFileSync(
  path.join(
    ROOT,
    "lib",
    "services",
    "public",
    "card_surface_pricing_service.dart",
  ),
  "utf8",
);
const FLUTTER_NETWORK = readFileSync(
  path.join(
    ROOT,
    "lib",
    "services",
    "network",
    "network_stream_service.dart",
  ),
  "utf8",
);

const NOW = new Date("2026-07-27T18:00:00.000Z");

function sourceHealthMetrics(overrides = {}) {
  return {
    latest_source_run_key: "current-attempt",
    latest_source_status: "completed",
    latest_source_marker: "2026-07-27T16:00:00+0000",
    latest_source_finished_at: "2026-07-27T17:00:00.000Z",
    latest_source_price_row_count: 500_000,
    latest_source_failed_count: 0,
    completed_source_run_key: "current-attempt",
    completed_source_status: "completed",
    completed_source_marker: "2026-07-27T16:00:00+0000",
    completed_source_finished_at: "2026-07-27T17:00:00.000Z",
    completed_source_price_row_count: 500_000,
    completed_source_failed_count: 0,
    ...overrides,
  };
}

test("health accepts a completed current source sync", () => {
  const result = evaluateTcgplayerCurrentSourceHealthV1(
    sourceHealthMetrics(),
    { now: NOW, maxSourceAgeHours: 36 },
  );
  assert.equal(
    result.policy_version,
    TCGPLAYER_MARKET_HEALTH_POLICY_V1,
  );
  assert.equal(result.accepted, true);
  assert.equal(result.continuity_mode, "completed_sync");
  assert.deepEqual(result.findings, []);
});

test("health accepts a no-change check only with completed marker continuity", () => {
  const result = evaluateTcgplayerCurrentSourceHealthV1(
    sourceHealthMetrics({
      latest_source_run_key: "no-change-attempt",
      latest_source_status: "skipped_no_change",
      latest_source_price_row_count: 0,
      completed_source_run_key: "prior-completed-sync",
    }),
    { now: NOW, maxSourceAgeHours: 36 },
  );
  assert.equal(result.accepted, true);
  assert.equal(result.continuity_mode, "verified_no_change");
  assert.equal(result.effective_source_run_key, "prior-completed-sync");
  assert.equal(result.effective_source_price_row_count, 500_000);
  assert.deepEqual(result.findings, []);
});

test("health rejects no-change checks without matching completed evidence", () => {
  for (const overrides of [
    { completed_source_marker: "different-marker" },
    { completed_source_price_row_count: 0 },
    { completed_source_failed_count: 1 },
    { completed_source_status: null },
  ]) {
    const result = evaluateTcgplayerCurrentSourceHealthV1(
      sourceHealthMetrics({
        latest_source_status: "skipped_no_change",
        latest_source_price_row_count: 0,
        ...overrides,
      }),
      { now: NOW, maxSourceAgeHours: 36 },
    );
    assert.equal(result.accepted, false);
    assert.ok(
      result.findings.includes("latest_current_source_sync_not_completed"),
    );
  }
});

test("health rejects failed or stale current source checks", () => {
  const failed = evaluateTcgplayerCurrentSourceHealthV1(
    sourceHealthMetrics({ latest_source_status: "failed" }),
    { now: NOW, maxSourceAgeHours: 36 },
  );
  assert.equal(failed.accepted, false);
  assert.ok(
    failed.findings.includes("latest_current_source_sync_not_completed"),
  );

  const stale = evaluateTcgplayerCurrentSourceHealthV1(
    sourceHealthMetrics({
      latest_source_finished_at: "2026-07-25T00:00:00.000Z",
    }),
    { now: NOW, maxSourceAgeHours: 36 },
  );
  assert.ok(stale.findings.includes("latest_current_source_sync_stale"));
});

function validCandidate(overrides = {}) {
  return {
    source_observation_id: "10000000-0000-4000-8000-000000000001",
    source_sync_run_id: "10000000-0000-4000-8000-000000000002",
    source_artifact_id: "10000000-0000-4000-8000-000000000003",
    source_artifact_hash: "artifact-sha256",
    source_artifact_byte_size: 2048,
    source_price_row_identity: "3:12345:holofoil:2026-07-27",
    source_row_hash: "row-sha256",
    source_payload_hash: "abc123",
    source_product_id: 12345,
    category_id: 3,
    source_subtype_name: "Holofoil",
    normalized_finish_key: "holo",
    source_product_name: "Pikachu",
    source_product_active: true,
    source_product_catalog_status: "current",
    has_printed_number_evidence: true,
    source_sync_mode: "current_full_sync",
    source_sync_status: "completed",
    source_sync_failed_count: 0,
    source_sync_finished_at: "2026-07-27T16:00:00.000Z",
    source_observed_on: "2026-07-27",
    source_mapping_count: 1,
    source_mapping_id: "34567",
    mapping_method: "deterministic_product_mapping",
    card_print_mapping_count: 1,
    card_printing_mapping_count: 1,
    identity_domain_count: 1,
    identity_domain: "pokemon_eng_standard",
    card_print_id: "20000000-0000-4000-8000-000000000001",
    card_printing_id: "20000000-0000-4000-8000-000000000002",
    gv_id: "GV-PK-TEST-001",
    printing_gv_id: "GV-PK-TEST-001-HOLO",
    finish_key: "holo",
    variant_assignment_id: "30000000-0000-4000-8000-000000000001",
    variant_assignment_status: "exact_child_finish",
    variant_assignment_version: "MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1",
    duplicate_product_row_count: 1,
    card_rarity: "Rare Holo",
    currency: "USD",
    market_price: 42.5,
    low_price: 20,
    mid_price: 500,
    high_price: 1000,
    direct_low_price: 10,
    ...overrides,
  };
}

test("normalizes only unambiguous ordinary Pokemon and MTG subtypes", () => {
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Normal"), "normal");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Holofoil"), "holo");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Reverse Holofoil"), "reverse");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Foil"), "foil");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("1st Edition Holofoil"), null);
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Cosmos Holofoil"), null);
});

test("publishes an exact fresh English Pokemon printing", () => {
  const result = evaluateTcgplayerMarketQualificationV1(validCandidate(), {
    now: NOW,
  });
  assert.equal(result.policy_version, TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3);
  assert.equal(result.decision, "publish");
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reason_codes, []);
});

test("supporting low mid high and direct-low values do not derive the market close", () => {
  const first = evaluateTcgplayerMarketQualificationV1(validCandidate(), {
    now: NOW,
  });
  const second = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      low_price: 0.01,
      mid_price: 9999,
      high_price: 50000,
      direct_low_price: null,
    }),
    { now: NOW },
  );
  assert.equal(first.eligible, true);
  assert.equal(second.eligible, true);
  assert.equal(first.evidence.market_price_is_source_field, true);
  assert.equal(second.evidence.supporting_prices_do_not_set_market_close, true);
});

test("delays 36-72 hour evidence, suppresses older evidence, and quarantines non-current runs", () => {
  const delayed = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ source_sync_finished_at: "2026-07-25T00:00:00.000Z" }),
    { now: NOW },
  );
  assert.equal(delayed.decision, "delay");
  assert.equal(delayed.freshness_result, "delayed");
  assert.ok(delayed.reason_codes.includes("source_observation_stale"));

  const suppressed = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ source_sync_finished_at: "2026-07-23T00:00:00.000Z" }),
    { now: NOW },
  );
  assert.equal(suppressed.decision, "suppress_stale");
  assert.equal(suppressed.publication_lane, "suppressed_stale");
  assert.ok(suppressed.reason_codes.includes("source_suppressed_stale"));

  const historical = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ source_sync_mode: "historical_archive_backfill" }),
    { now: NOW },
  );
  assert.ok(historical.reason_codes.includes("not_current_source_sync"));
});

test("quarantines ambiguous parent or finish mappings", () => {
  const ambiguousParent = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ card_print_mapping_count: 2 }),
    { now: NOW },
  );
  assert.ok(ambiguousParent.reason_codes.includes("ambiguous_card_mapping"));

  const missingFinish = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      card_printing_mapping_count: 0,
      card_printing_id: null,
      printing_gv_id: null,
      finish_key: null,
    }),
    { now: NOW },
  );
  assert.ok(
    missingFinish.reason_codes.includes("missing_exact_printing_finish_mapping"),
  );
});

test("quarantines foreign, special, sealed, and code-card lanes", () => {
  const japanese = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ identity_domain: "pokemon_jpn" }),
    { now: NOW },
  );
  assert.ok(japanese.reason_codes.includes("not_english_standard_identity"));

  const special = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      source_subtype_name: "1st Edition Holofoil",
      normalized_finish_key: null,
    }),
    { now: NOW },
  );
  assert.ok(
    special.reason_codes.includes("unsupported_or_ambiguous_source_subtype"),
  );

  const sealed = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      source_product_name: "Test Booster Box",
      has_printed_number_evidence: false,
    }),
    { now: NOW },
  );
  assert.ok(sealed.reason_codes.includes("unsupported_product_kind"));
});

test("publication V1.2 scope is evidence-aware and keeps numbered card names", () => {
  const sealed = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      source_product_name: "Journey Together Booster Bundle",
      has_printed_number_evidence: false,
    }),
    { now: NOW },
  );
  assert.equal(sealed.decision, "exclude");
  assert.ok(sealed.reason_codes.includes("unsupported_product_kind"));

  const numberedCard = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ source_product_name: "Box of Disaster" }),
    { now: NOW },
  );
  assert.equal(numberedCard.decision, "publish");

  const ordinaryTinCard = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ source_product_name: "Suspicious Food Tin" }),
    { now: NOW },
  );
  assert.equal(ordinaryTinCard.decision, "publish");

  const special = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ source_product_name: "Pikachu (Master Ball Pattern)" }),
    { now: NOW },
  );
  assert.equal(special.decision, "exclude");
  assert.ok(special.reason_codes.includes("special_variant_v1_1"));
  assert.equal(
    special.evidence.product_scope_policy_version,
    "TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V1_3",
  );
  assert.equal(special.evidence.product_scope_rule_id, "ball_pattern_print");

  const tinPromo = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      source_product_name: "Celebi - 029 (EX Collector's Carry Tin)",
    }),
    { now: NOW },
  );
  assert.equal(tinPromo.decision, "exclude");
  assert.equal(
    tinPromo.evidence.product_scope_rule_id,
    "distribution_packaging_variant",
  );

  const yearQualifiedStaff = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      source_product_name: "Champions Festival - XY27 (2014 Staff)",
    }),
    { now: NOW },
  );
  assert.equal(yearQualifiedStaff.decision, "exclude");
  assert.equal(
    yearQualifiedStaff.evidence.product_scope_rule_id,
    "event_or_distribution_stamp",
  );

  const trainerKit = evaluateTcgplayerMarketQualificationV1(
    validCandidate({
      source_product_name: "Arcanine",
      source_group_name: "EX Trainer Kit 1: Latias & Latios",
    }),
    { now: NOW },
  );
  assert.equal(trainerKit.decision, "exclude");
  assert.ok(trainerKit.reason_codes.includes("special_variant_v1_1"));
  assert.equal(
    trainerKit.evidence.product_scope_rule_id,
    "deck_exclusive_special_variant",
  );
});

test("worker enriches candidates with source-group evidence before qualification", () => {
  assert.match(
    WORKER,
    /source_group\.name as source_group_name[\s\S]*tcgcsv_source_groups source_group[\s\S]*source_group\.group_id = candidate\.group_id/i,
  );
  assert.match(
    WORKER,
    /publication scope evidence missing for \$\{missingScopeEvidence\.length\} Pokemon candidates/i,
  );
  assert.match(WORKER, /TCGPLAYER_MARKET_PUBLICATION_WORKER_V1_6/);
});

test("candidate pages are bounded, deterministic, and deduplicate product IDs", () => {
  assert.equal(TCGPLAYER_MARKET_CANDIDATE_PRODUCT_PAGE_SIZE_V1, 10_000);
  assert.equal(TCGPLAYER_MARKET_STAGED_CANDIDATE_PAGE_SIZE_V1, 1_000);
  assert.deepEqual(
    buildTcgplayerCandidateProductPagesV1([4, 2, 4, 3, 1], 2),
    [[1, 2], [3, 4]],
  );
  assert.throws(
    () => buildTcgplayerCandidateProductPagesV1([1], 0),
    /positive integer/,
  );
});

test("full-catalog staging, qualification, and artifact export remain bounded", () => {
  assert.deepEqual(
    inspectTcgplayerBoundedPageProgressV1({
      processedCount: 175_495,
      expectedCount: 175_495,
      largestPageCount: 1_000,
      pageSize: 1_000,
    }).findings,
    [],
  );
  assert.deepEqual(
    inspectTcgplayerBoundedPageProgressV1({
      processedCount: 999,
      expectedCount: 1_000,
      largestPageCount: 1_001,
      pageSize: 1_000,
    }).findings,
    ["candidate_count:999/1000", "page_size_exceeded:1001/1000"],
  );
  assert.match(WORKER, /visitCandidateRowPages/);
  assert.match(WORKER, /visitStagedCandidatePages/);
  assert.match(WORKER, /writeDatabaseDecisionJsonLines/);
  assert.match(WORKER, /prior_worker_terminated_without_terminal_state/);
  assert.doesNotMatch(WORKER, /const candidates = await stagedCandidates/);
});

test("candidate reconciliation pins count, source run, and observation uniqueness", () => {
  const sourceRunId = "00000000-0000-4000-8000-000000000001";
  const clean = inspectTcgplayerCandidateRowsV1({
    rows: [
      { source_observation_id: "obs-1", source_sync_run_id: sourceRunId },
      { source_observation_id: "obs-2", source_sync_run_id: sourceRunId },
    ],
    expectedSourceSyncRunId: sourceRunId,
    expectedCount: 2,
  });
  assert.deepEqual(clean.findings, []);

  const drifted = inspectTcgplayerCandidateRowsV1({
    rows: [
      { source_observation_id: "obs-1", source_sync_run_id: sourceRunId },
      { source_observation_id: "obs-1", source_sync_run_id: "other-run" },
    ],
    expectedSourceSyncRunId: sourceRunId,
    expectedCount: 3,
  });
  assert.deepEqual(drifted.findings, [
    "candidate_count:2/3",
    "duplicate_source_observation_id",
    "source_sync_run_mismatch",
  ]);
  assert.match(WORKER, /candidate\.source_sync_run_id = \$1/);
  assert.match(WORKER, /candidate\.source_product_id = any\(\$2::integer\[\]\)/);
  assert.match(WORKER, /candidate reconciliation failed/);
  assert.doesNotMatch(
    WORKER,
    /order by candidate\.source_product_id,[\s\S]{0,200}\$\{limitSql\}/,
  );
});

test("large qualification artifacts are written and hashed in bounded streams", () => {
  assert.match(WORKER, /async function writeJsonLines/);
  assert.match(WORKER, /for \(const batch of chunks\(rows, batchSize\)\)/);
  assert.match(WORKER, /createReadStream\(filePath\)/);
  assert.match(WORKER, /hashes\[name\] = await sha256File\(filePath\)/);
  assert.doesNotMatch(
    WORKER,
    /decisions\.map\(\(decision\) => JSON\.stringify\(decision\)\)\.join/,
  );
});

test("quarantines finish conflicts and non-positive market prices", () => {
  const conflict = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ finish_key: "reverse" }),
    { now: NOW },
  );
  assert.ok(conflict.reason_codes.includes("finish_mapping_conflict"));

  const missingMarket = evaluateTcgplayerMarketQualificationV1(
    validCandidate({ market_price: null }),
    { now: NOW },
  );
  assert.ok(missingMarket.reason_codes.includes("missing_positive_market_price"));
});

test("migration creates append-only qualification and publication ledgers", () => {
  assert.match(
    MIGRATION,
    /\('normal', 'Normal', 10[\s\S]*\('reverse', 'Reverse Holo', 20[\s\S]*\('holo', 'Holo', 30/i,
  );
  assert.match(MIGRATION, /create table if not exists public\.market_price_pipeline_runs/i);
  assert.match(MIGRATION, /create table if not exists public\.market_price_pipeline_phase_attempts/i);
  assert.match(MIGRATION, /create table if not exists public\.market_price_pipeline_candidates/i);
  assert.match(MIGRATION, /create table if not exists public\.market_price_publication_sets/i);
  assert.match(MIGRATION, /create table if not exists public\.market_price_current_publication/i);
  assert.match(MIGRATION, /create table if not exists public\.market_price_qualification_decisions/i);
  assert.match(MIGRATION, /create table if not exists public\.market_price_publication_snapshots/i);
  assert.match(MIGRATION, /market_price_pipeline_phase_attempts_append_only_guard/i);
  assert.match(MIGRATION, /market_price_pipeline_candidates_append_only_guard/i);
  assert.match(MIGRATION, /market_price_qualification_append_only_guard/i);
  assert.match(MIGRATION, /market_price_publication_append_only_guard/i);
});

test("publication activation is atomic, reconciled, and rollback-capable", () => {
  assert.match(MIGRATION, /activate_market_price_publication_set_v1/i);
  assert.match(MIGRATION, /pg_advisory_xact_lock/i);
  assert.match(MIGRATION, /current publication set changed before rollback/i);
  assert.match(MIGRATION, /rollback_market_price_publication_set_v1/i);
  assert.match(MIGRATION, /market price top-level counts do not reconcile/i);
});

test("current prices require the active reconciled publication generation", () => {
  assert.match(MIGRATION, /join public\.market_price_current_publication current_state/i);
  assert.match(MIGRATION, /pipeline_run\.reconciliation_state = 'reconciled'/i);
  assert.match(MIGRATION, /pipeline_run\.state in \('published', 'verified'\)/i);
  assert.match(MIGRATION, /snapshot\.source_sync_finished_at >= now\(\) - interval '36 hours'/i);
});

test("shared read model returns deterministic unavailable rows", () => {
  assert.match(MIGRATION, /'unavailable' else 'available'/i);
  assert.match(MIGRATION, /'no_current_qualified_market_price'/i);
  assert.match(MIGRATION, /'source_freshness_delayed'/i);
  assert.match(MIGRATION, /'suppressed_stale'/i);
});

test("current and history read models use source market_price", () => {
  assert.match(MIGRATION, /create or replace view public\.v_market_price_current_v1/i);
  assert.match(MIGRATION, /create or replace view public\.v_market_price_history_v1/i);
  assert.match(MIGRATION, /snapshot\.market_price/i);
  assert.doesNotMatch(MIGRATION, /grookai_value/i);
});

test("qualification candidate view avoids a redundant wide aggregation", () => {
  assert.match(
    CANDIDATE_PERFORMANCE_MIGRATION,
    /create or replace view public\.v_tcgplayer_market_qualification_candidates_v1/i,
  );
  assert.match(CANDIDATE_PERFORMANCE_MIGRATION, /source_run as materialized/i);
  assert.match(
    CANDIDATE_PERFORMANCE_MIGRATION,
    /case when source_mapping\.id is null then 0 else 1 end::integer\s+as source_mapping_count/i,
  );
  assert.match(
    CANDIDATE_PERFORMANCE_MIGRATION,
    /case when source_mapping\.card_print_id is null then 0 else 1 end::integer\s+as card_print_mapping_count/i,
  );
  assert.doesNotMatch(CANDIDATE_PERFORMANCE_MIGRATION, /\bgroup by\b/i);
  assert.doesNotMatch(CANDIDATE_PERFORMANCE_MIGRATION, /\barray_agg\s*\(/i);
});

test("variant assignment preparation uses one idempotent materialized run slice", () => {
  assert.match(
    ASSIGNMENT_IDEMPOTENCY_MIGRATION,
    /create or replace function public\.prepare_tcgplayer_market_variant_assignments_v1/i,
  );
  assert.match(
    ASSIGNMENT_IDEMPOTENCY_MIGRATION,
    /candidate\.variant_assignment_id is null/i,
  );
  assert.match(
    ASSIGNMENT_IDEMPOTENCY_MIGRATION,
    /on conflict \(\s*source_family,\s*source_row_id,\s*variant_assignment_version\s*\) do nothing/i,
  );
  assert.match(
    ASSIGNMENT_RUNTIME_REPAIR_MIGRATION,
    /source_observations as materialized/i,
  );
  assert.match(
    ASSIGNMENT_RUNTIME_REPAIR_MIGRATION,
    /observation\.last_seen_run_id = p_source_sync_run_id/i,
  );
  assert.match(
    ASSIGNMENT_RUNTIME_REPAIR_MIGRATION,
    /observation\.observed_on = source_observed_on/i,
  );
  assert.match(
    ASSIGNMENT_RUNTIME_REPAIR_MIGRATION,
    /set enable_nestloop = off/i,
  );
  assert.match(
    ASSIGNMENT_RUNTIME_REPAIR_MIGRATION,
    /source_mapping\.external_id =\s*observation\.source_product_id::text/i,
  );
  assert.match(
    ASSIGNMENT_RUNTIME_REPAIR_MIGRATION,
    /where not exists \([\s\S]*assignment\.source_row_id = candidate\.source_observation_id/i,
  );
  assert.match(
    ASSIGNMENT_RUNTIME_REPAIR_MIGRATION,
    /on conflict \(\s*source_family,\s*source_row_id,\s*variant_assignment_version\s*\) do nothing/i,
  );
  assert.doesNotMatch(WORKER, /missingVariantAssignmentCount/);
  assert.match(WORKER, /idempotent_prepare_no_op: insertedCount === 0/);
});

test("signed-in clients receive a shared contract while provenance stays service-only", () => {
  assert.match(
    MIGRATION,
    /revoke all on function public\.get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\)\s+from public, anon, authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /revoke all on function public\.get_market_price_trace_v1\(uuid\)\s+from public, anon, authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /grant execute on function public\.get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\) to authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /grant execute on function public\.get_market_price_trace_v1\(uuid\) to service_role/i,
  );
  assert.match(
    MIGRATION,
    /get_market_price_trace_v1\(p_provenance_id uuid\)[\s\S]*returns jsonb[\s\S]*to_jsonb\(trace_row\)/i,
  );
  assert.doesNotMatch(
    MIGRATION,
    /get_market_pricing_read_model_v1\(uuid\[\], uuid\[\]\) to anon/i,
  );
});

test("worker is dry-run by default and writes only governed pricing tables in write modes", () => {
  assert.match(WORKER, /runMode: "dry_run"/);
  assert.match(WORKER, /WRITE_MODES = new Set\(\["shadow", "canary", "production"\]\)/);
  assert.match(WORKER, /market_price_pipeline_runs/);
  assert.match(WORKER, /market_price_pipeline_phase_attempts/);
  assert.match(WORKER, /market_price_pipeline_candidates/);
  assert.match(WORKER, /market_price_publication_sets/);
  assert.match(WORKER, /market_price_qualification_decisions/);
  assert.match(WORKER, /market_price_publication_snapshots/);
  assert.match(WORKER, /activate_market_price_publication_set_v1/);
  assert.match(
    WORKER,
    /when \$2 = 'activate'[\s\S]*reconciliation_state = 'reconciled'[\s\S]*then 'reconciled'/,
  );
  assert.match(WORKER, /published readback mismatch/);
  assert.match(WORKER, /resume refused because the frozen run provenance does not match/);
  assert.doesNotMatch(WORKER, /update\s+public\.card_prints/i);
  assert.doesNotMatch(WORKER, /insert\s+into\s+public\.vault/i);
});

test("all active web and Flutter pricing consumers use the shared read model", () => {
  assert.match(WEB_READ_MODEL, /get_market_pricing_read_model_v1/);
  assert.match(WEB_VAULT, /getExactMarketPricingByCardPrintingIds/);
  assert.doesNotMatch(WEB_VAULT, /v_card_pricing_ui_v1|grookai_value/i);
  assert.match(FLUTTER_PRICING, /get_market_pricing_read_model_v1/);
  assert.match(FLUTTER_NETWORK, /get_top_market_pricing_v1/);
  assert.match(FLUTTER_NETWORK, /get_market_pricing_read_model_v1/);
  assert.doesNotMatch(FLUTTER_NETWORK, /v_card_pricing_ui_v1/);
});

test("pipeline freezes provenance, resumes completed phases, and keeps write boundaries narrow", () => {
  assert.match(PIPELINE, /commit_sha/);
  assert.match(PIPELINE, /run_plan\.json/);
  assert.match(PIPELINE, /pipeline_state\.json/);
  assert.match(PIPELINE, /phase_state_authority: "database"/);
  assert.doesNotMatch(
    PIPELINE,
    /state\.phases\[phase\]\?\.status === "completed"/,
  );
  assert.match(PIPELINE, /--mode=\$\{args\.runMode\}/);
  assert.match(PIPELINE, /canonical_identity_writes:\s*false/);
  assert.match(PIPELINE, /vault_writes:\s*false/);
  assert.match(PIPELINE, /synthetic_value_calculation:\s*false/);
  assert.match(PIPELINE, /clean tracked working tree/);
});

test("full source syncs cannot use a ceiling below the observed TCGCSV workload", () => {
  assert.match(PIPELINE, /FULL_SYNC_REQUEST_CEILING = 10_000/);
  assert.match(
    PIPELINE,
    /!args\.skipIngest && args\.requestCeiling < FULL_SYNC_REQUEST_CEILING/,
  );
  assert.match(SCHEDULED_RUNNER, /FULL_SYNC_REQUEST_CEILING = 10_000/);
  assert.match(
    SCHEDULED_RUNNER,
    /requestCeiling < FULL_SYNC_REQUEST_CEILING/,
  );
  assert.match(
    SCHEDULE_ENV_EXAMPLE,
    /TCGPLAYER_MARKET_SCHEDULE_REQUEST_CEILING=10000/,
  );
});

test("full source phase timeout exceeds the measured 70-76 minute runtime", () => {
  assert.match(PIPELINE, /DEFAULT_PHASE_TIMEOUT_MINUTES = 120/);
  assert.match(PIPELINE, /FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES = 90/);
  assert.match(
    PIPELINE,
    /phaseTimeoutMinutes < FULL_SYNC_MINIMUM_PHASE_TIMEOUT_MINUTES/,
  );
  assert.match(PIPELINE, /timeoutMs: args\.phaseTimeoutMinutes \* 60 \* 1000/g);
  assert.match(PIPELINE, /phase_timeout_minutes: args\.phaseTimeoutMinutes/);
  assert.match(
    PIPELINE,
    /resume refused because frozen run-plan fields changed/,
  );
  assert.match(SCHEDULED_RUNNER, /DEFAULT_PHASE_TIMEOUT_MINUTES = 120/);
  assert.match(
    SCHEDULED_RUNNER,
    /--phase-timeout-minutes=\$\{args\.phaseTimeoutMinutes\}/,
  );
  assert.match(
    SCHEDULE_ENV_EXAMPLE,
    /TCGPLAYER_MARKET_PHASE_TIMEOUT_MINUTES=120/,
  );
});

test("publication database timeout covers measured assignment preparation", () => {
  assert.match(WORKER, /DEFAULT_DATABASE_TIMEOUT_MINUTES = 20/);
  assert.match(WORKER, /MINIMUM_WRITE_DATABASE_TIMEOUT_MINUTES = 10/);
  assert.match(
    WORKER,
    /query_timeout: args\.databaseTimeoutMinutes \* 60 \* 1000/,
  );
  assert.match(
    WORKER,
    /statement_timeout: args\.databaseTimeoutMinutes \* 60 \* 1000/,
  );
  assert.match(
    WORKER,
    /select set_config\('statement_timeout', \$1, false\)/,
  );
  assert.match(WORKER, /\[`?\$\{args\.databaseTimeoutMinutes\}min`?\]/);
  assert.match(
    WORKER,
    /database_timeout_minutes: args\.databaseTimeoutMinutes/,
  );
  assert.match(PIPELINE, /DEFAULT_DATABASE_TIMEOUT_MINUTES = 20/);
  assert.match(
    PIPELINE,
    /--database-timeout-minutes=\$\{args\.databaseTimeoutMinutes\}/,
  );
  assert.match(
    PIPELINE,
    /database_timeout_minutes: args\.databaseTimeoutMinutes/,
  );
  assert.match(
    SCHEDULED_RUNNER,
    /--database-timeout-minutes=\$\{args\.databaseTimeoutMinutes\}/,
  );
  assert.match(
    SCHEDULE_ENV_EXAMPLE,
    /TCGPLAYER_MARKET_DATABASE_TIMEOUT_MINUTES=20/,
  );
});

test("warehouse price observations retain exact source artifact lineage", () => {
  assert.match(
    TCGCSV_WAREHOUSE_WORKER,
    /artifact\.database_id = resolved\.id/,
  );
  assert.match(
    TCGCSV_WAREHOUSE_WORKER,
    /artifactId: pricesArtifact\.database_id/,
  );
  assert.match(
    TCGCSV_WAREHOUSE_WORKER,
    /artifactPath: pricesArtifact\.local_path/,
  );
  assert.match(
    TCGCSV_WAREHOUSE_WORKER,
    /source_artifact_id is distinct from excluded\.source_artifact_id/,
  );
  assert.match(
    TCGCSV_WAREHOUSE_WORKER,
    /artifactId: artifactIdsByPath\.get\(row\.archivePath\) \?\? null/,
  );
  assert.match(
    TCGCSV_ARTIFACT_LINK_REPAIR,
    /source_artifact_id = artifact\.id/,
  );
  assert.match(
    TCGCSV_ARTIFACT_LINK_REPAIR,
    /source_archive_path = artifact\.local_path/,
  );
  assert.match(
    TCGCSV_ARTIFACT_LINK_REPAIR,
    /current_publication_activation: false/,
  );
});

test("scheduled failure policy retries source transport failures but stops invariant failures", () => {
  assert.deepEqual(
    classifyMarketPipelineFailureV1({
      failedPhase: "warehouse_current_sync",
      errorText: "HTTP 503",
    }),
    {
      classification: "retryable_source_or_transport_failure",
      retryable: true,
    },
  );
  assert.deepEqual(
    classifyMarketPipelineFailureV1({
      failedPhase: "health",
      errorText: "eligible snapshot reconciliation mismatch",
    }),
    {
      classification: "non_retryable_invariant_failure",
      retryable: false,
    },
  );
  for (const errorText of [
    "connect ECONNREFUSED",
    "getaddrinfo ENOTFOUND",
    "getaddrinfo EAI_AGAIN",
    "socket hang up",
    "could not connect to server",
    "Connection terminated unexpectedly",
  ]) {
    assert.equal(
      classifyMarketPipelineFailureV1({
        failedPhase: "publication",
        errorText,
      }).retryable,
      true,
      errorText,
    );
  }
  assert.deepEqual(parseRetryDelaysV1("60, 300"), [60, 300]);
  assert.equal(retryDelayMsV1([60, 300], 1), 60_000);
  assert.equal(retryDelayMsV1([60, 300], 3), 300_000);
});

test("scheduled runner is safe by default and preserves one durable run key across retries", () => {
  assert.match(SCHEDULED_RUNNER, /TCGPLAYER_MARKET_SCHEDULED_RUNNER_V1/);
  assert.match(SCHEDULED_RUNNER, /const live = argv\.includes\("--run"\)/);
  assert.match(SCHEDULED_RUNNER, /TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN !== "1"/);
  assert.match(
    SCHEDULED_RUNNER,
    /TCGPLAYER_MARKET_REPLACEMENT_VERIFIED !== "1"/,
  );
  assert.match(
    SCHEDULED_RUNNER,
    /pg_try_advisory_lock\(hashtext\(\$1\)\)/,
  );
  assert.match(SCHEDULED_RUNNER, /scheduled_attempts\.jsonl/);
  assert.match(SCHEDULED_RUNNER, /scheduled_summary\.json/);
  assert.match(SCHEDULED_RUNNER, /scheduled resume refused because frozen plan fields changed/);
  assert.match(SCHEDULED_RUNNER, /--resume-run-key=\$\{args\.runKey\}/);
  assert.match(
    SCHEDULED_RUNNER,
    /scheduled canary mode requires an exact --canary-definition/,
  );
  assert.match(
    SCHEDULED_RUNNER,
    /scheduled canary mode forbids first-N publication limits/,
  );
  assert.match(
    SCHEDULED_RUNNER,
    /--canary-definition=\$\{loadedCanary\.absolutePath\}/,
  );
  assert.match(SCHEDULED_RUNNER, /canary_definition_sha256/);
  assert.match(SCHEDULED_RUNNER, /classification\.retryable/);
  assert.match(SCHEDULED_RUNNER, /canonical_identity_writes:\s*false/);
  assert.match(SCHEDULED_RUNNER, /vault_writes:\s*false/);
  assert.match(SCHEDULED_RUNNER, /modeled_value_writes:\s*false/);
});

test("systemd schedule is authoritative at 08:15 UTC and has a required failure route", () => {
  assert.match(SCHEDULED_TIMER, /OnCalendar=\*-\*-\* 08:15:00 UTC/);
  assert.match(SCHEDULED_TIMER, /RandomizedDelaySec=0/);
  assert.match(
    SCHEDULED_SERVICE,
    /\/usr\/bin\/flock -n \/run\/lock\/grookai-tcgplayer-market-pipeline\.lock/,
  );
  assert.match(
    SCHEDULED_SERVICE,
    /OnFailure=grookai-operations-webhook@%n\.service/,
  );
  assert.match(
    SCHEDULED_SERVICE,
    /tcgplayer_market_scheduled_runner_v1\.mjs --run/,
  );
  assert.match(
    OPERATIONS_WEBHOOK_SERVICE,
    /grookai_operations_webhook_v1\.mjs/,
  );
  assert.match(OPERATIONS_WEBHOOK, /GROOKAI_OPERATIONS_WEBHOOK_URL/);
  assert.match(OPERATIONS_WEBHOOK, /notification_payload\.json/);
  assert.match(OPERATIONS_WEBHOOK, /delivery_receipt\.json/);
  assert.match(OPERATIONS_WEBHOOK, /status: "delivery_failed"/);
});

test("schedule installation cannot retire the old timer before replacement proof", () => {
  assert.match(SCHEDULE_INSTALLER, /ACTIVATE_TIMER="\$\{ACTIVATE_TIMER:-0\}"/);
  assert.match(
    SCHEDULE_INSTALLER,
    /TCGPLAYER_MARKET_REPLACEMENT_VERIFIED=1 after shadow verification/,
  );
  assert.match(
    SCHEDULE_INSTALLER,
    /systemctl disable --now "\$\{LEGACY_TIMER\}" "\$\{LEGACY_SERVICE\}"/,
  );
  assert.match(SCHEDULE_INSTALLER, /systemctl enable --now "\$\{TIMER_NAME\}"/);
  assert.match(SCHEDULE_VERIFIER, /legacy_current_sync_timer_still_enabled/);
  assert.match(SCHEDULE_VERIFIER, /missing_operations_webhook_route/);
  assert.match(SCHEDULE_VERIFIER, /schedule_mode_not_canary/);
  assert.match(SCHEDULE_VERIFIER, /canary_definition_not_found/);
  assert.match(
    SCHEDULE_ENV_EXAMPLE,
    /TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION=/,
  );
  assert.match(SCHEDULE_VERIFIER, /TCGPLAYER_MARKET_OPS_READY/);
});

test("health probe checks freshness, reconciliation, and source-to-publication trace", () => {
  assert.match(HEALTH, /evaluateTcgplayerCurrentSourceHealthV1/);
  assert.match(HEALTH, /source_continuity_mode/);
  assert.match(HEALTH, /eligible_snapshot_reconciliation_mismatch/);
  assert.match(HEALTH, /broken_source_to_publication_trace/);
  assert.match(HEALTH, /minimum_current_prices/);
  assert.match(HEALTH, /durable_pipeline_run_not_reconciled/);
  assert.match(HEALTH, /current_publication_pointer_mismatch/);
});

test("publication rollback is guarded, dry-run-default, and read back before commit", () => {
  assert.match(ROLLBACK_WORKER, /const apply = argv\.includes\("--apply"\)/);
  assert.match(
    ROLLBACK_WORKER,
    /--expected-current-publication-set-id is required/,
  );
  assert.match(
    ROLLBACK_WORKER,
    /--expected-restore-publication-set-id is required for apply/,
  );
  assert.match(ROLLBACK_WORKER, /--expected-commit-sha is required for apply/);
  assert.match(
    ROLLBACK_WORKER,
    /TCGPLAYER_MARKET_PUBLICATION_ROLLBACK_V1/,
  );
  assert.match(ROLLBACK_WORKER, /begin isolation level serializable/);
  assert.match(ROLLBACK_WORKER, /begin read only/);
  assert.match(
    ROLLBACK_WORKER,
    /rollback_market_price_publication_set_v1/,
  );
  assert.match(ROLLBACK_WORKER, /validatePostconditions/);
  assert.match(
    ROLLBACK_WORKER,
    /ROLLBACK_POSTCONDITION_FAILED[\s\S]*client\.query\("commit"\)/,
  );
  assert.match(ROLLBACK_WORKER, /artifact_hashes\.json/);
  assert.doesNotMatch(
    ROLLBACK_WORKER,
    /\b(insert\s+into|update|delete\s+from)\s+public\.market_price_/i,
  );
});

test("production runbook covers rollback and ordinary incident recovery", () => {
  assert.match(RUNBOOK, /## Guarded Publication Rollback/);
  assert.match(RUNBOOK, /pricing:market:rollback:dry-run/);
  assert.match(RUNBOOK, /pricing:market:rollback:apply/);
  assert.match(RUNBOOK, /## Acquisition And Artifact Failures/);
  assert.match(RUNBOOK, /--resume-run-key=<run-key>/);
  assert.match(RUNBOOK, /## Mapping And Duplicate Resolution/);
  assert.match(RUNBOOK, /## API Or Client Failure/);
  assert.match(RUNBOOK, /## Operations Webhook Failure/);
  assert.match(RUNBOOK, /## Historical Worker Coordination/);
});

test("GV-ID provenance lookup is read-only and closes the governed trace", () => {
  assert.match(
    PROVENANCE_LOOKUP,
    /provide exactly one of --printing-gv-id or --provenance-id/,
  );
  assert.match(PROVENANCE_LOOKUP, /begin read only/);
  assert.match(PROVENANCE_LOOKUP, /get_market_pricing_read_model_v1/);
  assert.match(PROVENANCE_LOOKUP, /get_market_price_trace_v1/);
  assert.match(PROVENANCE_POLICY, /trace_market_close_mismatch/);
  assert.match(PROVENANCE_POLICY, /"source_artifact_hash"/);
  assert.match(PROVENANCE_POLICY, /trace_missing_\$\{field\}/);
  assert.match(PROVENANCE_LOOKUP, /public_trace_exposure:\s*false/);
  assert.match(PROVENANCE_LOOKUP, /artifact_hashes\.json/);
  assert.doesNotMatch(
    PROVENANCE_LOOKUP,
    /\b(insert|update|delete)\s+(?:into|from|public\.)/i,
  );
});

test("local smoke proves publication, resume, rollback, append-only, and ACL boundaries", () => {
  assert.match(LOCAL_SMOKE, /local smoke test refuses a non-local database URL/);
  assert.match(LOCAL_SMOKE, /\$1::bigint[\s\S]*jsonb_build_object\([\s\S]*\$1::bigint/);
  assert.match(LOCAL_SMOKE, /resuming a verified run must not repeat completed phases/);
  assert.match(LOCAL_SMOKE, /rollback_market_price_publication_set_v1/);
  assert.match(LOCAL_SMOKE, /append-only/i);
  assert.match(LOCAL_SMOKE, /withClient\(url, async \(immutabilityClient\)/);
  assert.match(LOCAL_SMOKE, /has_function_privilege/);
  assert.match(LOCAL_SMOKE, /authenticated_can_trace/);
  assert.match(LOCAL_SMOKE, /service_role_can_trace/);
  assert.doesNotMatch(
    LOCAL_SMOKE,
    /client\.query\(\s*`begin;[\s\S]{0,500}array\[\$1\]::uuid/,
  );
  assert.match(LOCAL_SMOKE, /set local role authenticated/i);
  assert.match(LOCAL_SMOKE, /get_market_price_trace_v1/);
});
