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
import { buildMtgParentMappingPlanV1 } from "../../backend/pricing/mtg_tcgplayer_parent_mapping_policy_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATION = readFileSync(
  path.join(
    ROOT,
    "supabase/migrations/20260816160000_mtg_tcgplayer_market_publication_v1.sql",
  ),
  "utf8",
);
const WORKER = readFileSync(
  path.join(ROOT, "scripts/workers/tcgplayer_market_publication_worker_v1.mjs"),
  "utf8",
);
const WORKFLOW = readFileSync(
  path.join(ROOT, ".github/workflows/mtg-pricing-publication-runner.yml"),
  "utf8",
);

const NOW = new Date("2026-08-16T16:00:00.000Z");

function mtgCandidate(overrides = {}) {
  return {
    source_observation_id: "10000000-0000-4000-8000-000000000001",
    source_sync_run_id: "10000000-0000-4000-8000-000000000002",
    source_artifact_id: "10000000-0000-4000-8000-000000000003",
    source_artifact_hash: "artifact-sha256",
    source_artifact_byte_size: 2048,
    source_price_row_identity: "1:12345:foil:2026-08-16",
    source_row_hash: "row-sha256",
    source_product_id: 12345,
    category_id: 1,
    source_subtype_name: "Foil",
    normalized_finish_key: "foil",
    source_product_name: "Lightning Bolt",
    source_product_active: true,
    source_product_catalog_status: "current",
    has_printed_number_evidence: true,
    source_sync_mode: "current_full_sync",
    source_sync_status: "completed",
    source_sync_failed_count: 0,
    source_sync_finished_at: "2026-08-16T15:00:00.000Z",
    source_observed_on: "2026-08-16",
    source_mapping_count: 1,
    source_mapping_id: "34567",
    mapping_method: "deterministic_mtg_printing_evidence_bridge",
    card_print_mapping_count: 1,
    card_printing_mapping_count: 1,
    identity_domain_count: 1,
    identity_domain: "mtg_eng_paper_print",
    card_print_id: "20000000-0000-4000-8000-000000000001",
    card_printing_id: "20000000-0000-4000-8000-000000000002",
    gv_id: "GV-MTG-TEST-001",
    printing_gv_id: "GV-MTG-TEST-001-FOIL",
    finish_key: "foil",
    variant_assignment_id: "30000000-0000-4000-8000-000000000001",
    variant_assignment_status: "exact_child_finish",
    variant_assignment_version: "MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1",
    duplicate_product_row_count: 1,
    card_rarity: "rare",
    currency: "USD",
    market_price: 12.34,
    ...overrides,
  };
}

test("MTG normal and foil are exact ordinary finish lanes", () => {
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Normal"), "normal");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Foil"), "foil");
  assert.equal(normalizeTcgplayerMarketSubtypeV1("Etched"), null);
});

test("an exact fresh English MTG printing qualifies under V1.3", () => {
  const result = evaluateTcgplayerMarketQualificationV1(mtgCandidate(), {
    now: NOW,
  });
  assert.equal(result.policy_version, TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3);
  assert.equal(result.decision, "publish");
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reason_codes, []);
  assert.equal(result.evidence.expected_identity_domain, "mtg_eng_paper_print");
});

test("category, identity, and exact-finish conflicts remain quarantined", () => {
  const wrongIdentity = evaluateTcgplayerMarketQualificationV1(
    mtgCandidate({ identity_domain: "pokemon_eng_standard" }),
    { now: NOW },
  );
  assert.equal(wrongIdentity.eligible, false);
  assert.ok(wrongIdentity.reason_codes.includes("not_english_standard_identity"));

  const etched = evaluateTcgplayerMarketQualificationV1(
    mtgCandidate({
      source_subtype_name: "Etched",
      normalized_finish_key: null,
      finish_key: "etched",
    }),
    { now: NOW },
  );
  assert.equal(etched.eligible, false);
  assert.ok(etched.reason_codes.includes("unsupported_or_ambiguous_source_subtype"));
});

test("migration preserves one global Pokemon and MTG candidate generation", () => {
  assert.match(MIGRATION, /observation\.category_id in \(1, 3\)/i);
  assert.match(MIGRATION, /identity\.identity_domain = 'mtg_eng_paper_print'/i);
  assert.match(MIGRATION, /printing_mapping\.source = 'tcgplayer_market'/i);
  assert.match(MIGRATION, /ambiguous_printing_parents/i);
  assert.match(MIGRATION, /conflicting_existing_mapping/i);
  assert.match(MIGRATION, /when 'foil' then 'foil'/i);
  assert.doesNotMatch(MIGRATION, /when 'etched' then/i);
  assert.match(
    MIGRATION,
    /revoke all on public\.v_mtg_tcgplayer_parent_mapping_candidates_v1[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(WORKER, /TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3/);
  assert.match(WORKER, /category_counts/);
});

test("parent bridge plans only exact insert candidates and fingerprints the rows", () => {
  const plan = buildMtgParentMappingPlanV1([
    {
      source_product_id: "12",
      card_print_id: "20000000-0000-4000-8000-000000000001",
      supporting_printing_mapping_count: 2,
      resolution: "insert_candidate",
    },
    {
      source_product_id: "13",
      card_print_id: "20000000-0000-4000-8000-000000000002",
      supporting_printing_mapping_count: 1,
      resolution: "already_exact",
    },
  ]);
  assert.equal(plan.selected_insert_count, 1);
  assert.equal(plan.unsafe_count, 0);
  assert.match(plan.plan_fingerprint, /^[0-9a-f]{64}$/);
  assert.match(plan.required_approval, /:1$/);

  const reviewOnly = buildMtgParentMappingPlanV1([
    {
      source_product_id: "14",
      card_print_id: "20000000-0000-4000-8000-000000000003",
      supporting_printing_mapping_count: 2,
      resolution: "ambiguous_printing_parents",
    },
  ]);
  assert.equal(reviewOnly.unsafe_count, 0);
  assert.equal(reviewOnly.review_only_count, 1);

  const unsafe = buildMtgParentMappingPlanV1([
    {
      source_product_id: "15",
      card_print_id: "20000000-0000-4000-8000-000000000004",
      supporting_printing_mapping_count: 1,
      resolution: "conflicting_existing_mapping",
    },
  ]);
  assert.equal(unsafe.blocking_unsafe_count, 1);
});

test("remote operations freeze migration, mapping, shadow, and activation boundaries", () => {
  assert.match(WORKFLOW, /test "\$GITHUB_SHA" = "\$EXPECTED_SHA"/);
  assert.match(WORKFLOW, /test "\$\{#pending\[@\]\}" -eq 1/);
  assert.match(WORKFLOW, /MTG_TCGPLAYER_PARENT_MAPPING_APPROVAL/);
  assert.match(WORKFLOW, /run_mode = 'shadow'/);
  assert.match(WORKFLOW, /state = 'shadow_verified'/);
  assert.match(WORKFLOW, /reconciliation_state = 'reconciled'/);
  assert.match(WORKFLOW, /policy_version = 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3'/);
  assert.match(WORKFLOW, /Shadow run did not prove eligible MTG pricing/);
  assert.match(WORKFLOW, /Shadow run would reduce current Pokemon publication/);
  assert.match(WORKFLOW, /--database-timeout-minutes=180/);
});
