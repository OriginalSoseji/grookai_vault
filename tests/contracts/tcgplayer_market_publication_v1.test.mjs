import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TCGPLAYER_MARKET_PUBLICATION_POLICY_V1,
  evaluateTcgplayerMarketQualificationV1,
  normalizeTcgplayerMarketSubtypeV1,
} from "../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const MIGRATION = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260727120000_tcgplayer_market_publication_v1.sql",
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
const LOCAL_SMOKE = readFileSync(
  path.join(
    ROOT,
    "scripts",
    "audits",
    "tcgplayer_market_publication_local_smoke_v1.mjs",
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

test("normalizes only unambiguous ordinary TCGPlayer subtypes", () => {
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Normal"), "normal");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Holofoil"), "holo");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Reverse Holofoil"), "reverse");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("1st Edition Holofoil"), null);
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Cosmos Holofoil"), null);
});

test("publishes an exact fresh English Pokemon printing", () => {
  const result = evaluateTcgplayerMarketQualificationV1(validCandidate(), {
    now: NOW,
  });
  assert.equal(result.policy_version, TCGPLAYER_MARKET_PUBLICATION_POLICY_V1);
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
    validCandidate({ source_product_name: "Test Booster Box" }),
    { now: NOW },
  );
  assert.ok(sealed.reason_codes.includes("unsupported_product_kind"));
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
  assert.match(WEB_VAULT, /getMarketPricingReadModelV1/);
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

test("health probe checks freshness, reconciliation, and source-to-publication trace", () => {
  assert.match(HEALTH, /latest_current_source_sync_stale/);
  assert.match(HEALTH, /eligible_snapshot_reconciliation_mismatch/);
  assert.match(HEALTH, /broken_source_to_publication_trace/);
  assert.match(HEALTH, /minimum_current_prices/);
  assert.match(HEALTH, /durable_pipeline_run_not_reconciled/);
  assert.match(HEALTH, /current_publication_pointer_mismatch/);
});

test("local smoke proves publication, resume, rollback, append-only, and ACL boundaries", () => {
  assert.match(LOCAL_SMOKE, /local smoke test refuses a non-local database URL/);
  assert.match(LOCAL_SMOKE, /\$1::bigint[\s\S]*jsonb_build_object\([\s\S]*\$1::bigint/);
  assert.match(LOCAL_SMOKE, /resuming a verified run must not repeat completed phases/);
  assert.match(LOCAL_SMOKE, /rollback_market_price_publication_set_v1/);
  assert.match(LOCAL_SMOKE, /append-only/i);
  assert.match(LOCAL_SMOKE, /set local role authenticated/i);
  assert.match(LOCAL_SMOKE, /get_market_price_trace_v1/);
});
