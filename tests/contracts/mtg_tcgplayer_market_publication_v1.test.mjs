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
import {
  MTG_PRICING_MAX_MTG_DROP_RATIO_V1,
  MTG_PRICING_MAX_POKEMON_DROP_RATIO_V1,
  buildMtgPricingProductionGuardFailureArtifactV1,
  buildMtgPricingProductionGuardStartedArtifactV1,
  evaluateMtgPricingProductionActivationGuardV1,
  evaluateMtgPricingProductionGuardV1,
} from "../../backend/pricing/mtg_pricing_production_guard_v1.mjs";

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
  assert.match(MIGRATION, /inactive_existing_mapping/i);
  assert.match(MIGRATION, /bool_or\(mapping\.active\)/i);
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

test("production guard permits restoring an expired governed Pokemon view", () => {
  const result = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31178,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 0,
  });

  assert.equal(result.ready_for_production, true);
  assert.equal(result.current_publication_baseline_available, true);
  assert.equal(result.current_governed_view_available, false);
  assert.equal(result.counts.observed_pokemon_drop, 6);
});

test("production guard blocks material loss when the governed view is expired", () => {
  const result = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 1,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 0,
  });

  assert.equal(result.current_governed_view_available, false);
  assert.equal(result.ready_for_production, false);
  assert.equal(
    result.findings[0].code,
    "pokemon_active_publication_drop_exceeds_tolerance",
  );
});

test("production guard fails closed when the active Pokemon baseline is unavailable", () => {
  const result = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31178,
    baselinePokemonEligible: 0,
    freshCurrentPokemonEligible: 0,
  });

  assert.equal(result.current_publication_baseline_available, false);
  assert.equal(result.ready_for_production, false);
  assert.deepEqual(result.findings, [
    {
      code: "missing_current_publication_pokemon_baseline",
      baseline_pokemon_eligible: 0,
      fresh_current_pokemon_eligible: 0,
    },
  ]);
});

test("production guard permits the proven six-row Pokemon source delta", () => {
  const result = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31178,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });

  assert.equal(MTG_PRICING_MAX_POKEMON_DROP_RATIO_V1, 0.001);
  assert.equal(result.counts.observed_pokemon_drop, 6);
  assert.equal(result.counts.allowed_pokemon_drop, 31);
  assert.equal(result.ready_for_production, true);
});

test("production guard preserves the active MTG publication baseline", () => {
  const boundary = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132829,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31178,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });
  assert.equal(MTG_PRICING_MAX_MTG_DROP_RATIO_V1, 0.001);
  assert.equal(boundary.counts.observed_mtg_drop, 132);
  assert.equal(boundary.counts.allowed_mtg_drop, 132);
  assert.equal(boundary.ready_for_production, true);

  const collapsed = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 1,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31178,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });
  assert.equal(collapsed.ready_for_production, false);
  assert.equal(
    collapsed.findings[0].code,
    "mtg_active_publication_drop_exceeds_tolerance",
  );

  const missingBaseline = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 0,
    shadowPokemonEligible: 31178,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });
  assert.equal(missingBaseline.ready_for_production, false);
  assert.equal(
    missingBaseline.findings[0].code,
    "missing_current_publication_mtg_baseline",
  );
});

test("production guard enforces the Pokemon drop tolerance boundary", () => {
  const boundary = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31153,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });
  assert.equal(boundary.counts.observed_pokemon_drop, 31);
  assert.equal(boundary.counts.allowed_pokemon_drop, 31);
  assert.equal(boundary.ready_for_production, true);

  const overBoundary = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31152,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });
  assert.equal(overBoundary.counts.observed_pokemon_drop, 32);
  assert.equal(overBoundary.ready_for_production, false);
});

test("production guard blocks material Pokemon loss and missing MTG prices", () => {
  const materialDrop = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 30000,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });
  assert.equal(materialDrop.ready_for_production, false);
  assert.equal(
    materialDrop.findings[0].code,
    "pokemon_active_publication_drop_exceeds_tolerance",
  );

  const missingMtg = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 0,
    mtgEligible: 0,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 31178,
    baselinePokemonEligible: 31178,
    freshCurrentPokemonEligible: 31178,
  });
  assert.equal(missingMtg.ready_for_production, false);
  assert.equal(missingMtg.findings[0].code, "missing_eligible_mtg_pricing");
});

test("production guard failure artifacts preserve prior evidence", () => {
  const started = buildMtgPricingProductionGuardStartedArtifactV1();
  assert.equal(started.status, "preflight_started");
  assert.equal(started.ready_for_production, false);

  const evaluated = evaluateMtgPricingProductionGuardV1({
    mtgSelected: 161241,
    mtgEligible: 132961,
    baselineMtgEligible: 132961,
    shadowPokemonEligible: 1,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 0,
  });
  const failed = buildMtgPricingProductionGuardFailureArtifactV1({
    priorArtifact: evaluated,
    error: new Error("query timed out"),
  });

  assert.equal(failed.status, "blocked");
  assert.equal(failed.ready_for_production, false);
  assert.deepEqual(failed.counts, evaluated.counts);
  assert.deepEqual(failed.findings, evaluated.findings);
  assert.deepEqual(failed.preflight_error, {
    name: "Error",
    message: "query timed out",
  });
  assert.equal("stack" in failed.preflight_error, false);

  const workerFailed = buildMtgPricingProductionGuardFailureArtifactV1({
    priorArtifact: evaluated,
    error: new Error("candidate staging failed"),
    errorField: "worker_error",
  });
  assert.deepEqual(workerFailed.worker_error, {
    name: "Error",
    message: "candidate staging failed",
  });
  assert.equal("preflight_error" in workerFailed, false);
});

test("production activation guard reports actual publication snapshot coverage", () => {
  const ready = evaluateMtgPricingProductionActivationGuardV1({
    productionMtgSelected: 132961,
    productionMtgEligible: 132961,
    baselineMtgEligible: 132961,
    productionPokemonEligible: 31178,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 31184,
  });
  assert.equal(ready.guard_stage, "production_pre_activation");
  assert.equal(ready.evidence_scope, "production_publication_snapshots");
  assert.equal(ready.counts.production_pokemon_eligible, 31178);
  assert.equal("shadow_pokemon_eligible" in ready.counts, false);
  assert.equal(ready.ready_for_production, true);

  const blocked = evaluateMtgPricingProductionActivationGuardV1({
    productionMtgSelected: 0,
    productionMtgEligible: 0,
    baselineMtgEligible: 132961,
    productionPokemonEligible: 1,
    baselinePokemonEligible: 31184,
    freshCurrentPokemonEligible: 0,
  });
  assert.equal(blocked.ready_for_production, false);
  assert.deepEqual(
    blocked.findings.map((finding) => finding.code),
    [
      "missing_eligible_production_mtg_pricing",
      "mtg_active_publication_drop_exceeds_tolerance",
      "pokemon_active_publication_drop_exceeds_tolerance",
    ],
  );
  assert.equal(
    blocked.findings[1].production_mtg_eligible,
    0,
  );
  assert.equal(
    blocked.findings[2].production_pokemon_eligible,
    1,
  );
  assert.equal("shadow_mtg_eligible" in blocked.findings[1], false);
  assert.equal("shadow_pokemon_eligible" in blocked.findings[2], false);

  const missingBaseline = evaluateMtgPricingProductionActivationGuardV1({
    productionMtgSelected: 132961,
    productionMtgEligible: 132961,
    baselineMtgEligible: 132961,
    productionPokemonEligible: 31178,
    baselinePokemonEligible: 0,
    freshCurrentPokemonEligible: 0,
  });
  assert.equal(missingBaseline.ready_for_production, false);
  assert.equal(
    missingBaseline.findings[0].code,
    "missing_current_publication_pokemon_baseline",
  );
});

test("remote operations freeze migration, mapping, shadow, and activation boundaries", () => {
  assert.match(WORKFLOW, /test "\$GITHUB_SHA" = "\$EXPECTED_SHA"/);
  assert.match(WORKFLOW, /test "\$\{#pending\[@\]\}" -eq 1/);
  assert.match(WORKFLOW, /MTG_TCGPLAYER_PARENT_MAPPING_APPROVAL/);
  assert.match(WORKFLOW, /run_mode = 'shadow'/);
  assert.match(WORKFLOW, /state = 'shadow_verified'/);
  assert.match(WORKFLOW, /reconciliation_state = 'reconciled'/);
  assert.match(WORKFLOW, /policy_version = 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3'/);
  assert.doesNotMatch(WORKFLOW, /from public\.v_market_price_current_v1/);
  assert.match(WORKFLOW, /from public\.market_price_current_publication current_state/);
  assert.match(WORKFLOW, /join public\.market_price_publication_snapshots snapshot/);
  assert.match(WORKFLOW, /pokemon_baseline_eligible/);
  assert.match(WORKFLOW, /mtg_baseline_eligible/);
  assert.match(WORKFLOW, /fresh_pokemon_eligible/);
  assert.match(
    WORKFLOW,
    /count\(distinct decision\.card_printing_id\) filter \([\s\S]*?category_id' = '3'/,
  );
  const shadowCountsSql = WORKFLOW.match(
    /shadow_counts as \(([\s\S]*?)\),\s*current_counts as/,
  )?.[1];
  assert.ok(shadowCountsSql);
  assert.equal(
    (
      shadowCountsSql.match(
        /truth_review\.card_printing_id = decision\.card_printing_id/g,
      ) ?? []
    ).length,
    2,
  );
  assert.equal(
    (shadowCountsSql.match(/truth_review\.active = true/g) ?? []).length,
    2,
  );
  assert.equal(
    (shadowCountsSql.match(/'hidden_pending_review'/g) ?? []).length,
    2,
  );
  assert.equal(
    (shadowCountsSql.match(/'hidden_unsupported'/g) ?? []).length,
    2,
  );
  assert.match(WORKFLOW, /statement_timeout: 120_000/);
  assert.match(WORKFLOW, /query_timeout: 125_000/);
  assert.match(WORKFLOW, /evaluateMtgPricingProductionGuardV1/);
  assert.match(WORKFLOW, /buildMtgPricingProductionGuardStartedArtifactV1/);
  assert.match(WORKFLOW, /buildMtgPricingProductionGuardFailureArtifactV1/);
  const initialGuardArtifactIndex = WORKFLOW.indexOf(
    "const initialGuardArtifact = buildMtgPricingProductionGuardStartedArtifactV1()",
  );
  const earliestGuardArtifactIndex = WORKFLOW.indexOf(
    "- name: Initialize production guard evidence",
  );
  const checkoutIndex = WORKFLOW.indexOf("- uses: actions/checkout@v4");
  const repositoryVerificationIndex = WORKFLOW.indexOf(
    "- name: Verify frozen repository boundary",
  );
  const dependencyInstallIndex = WORKFLOW.indexOf(
    "- name: Install operator dependencies",
  );
  const shadowKeyValidationIndex = WORKFLOW.indexOf(
    'test -n "$EXPECTED_SHADOW_RUN_KEY"',
  );
  assert.ok(earliestGuardArtifactIndex >= 0);
  assert.ok(earliestGuardArtifactIndex < checkoutIndex);
  assert.ok(earliestGuardArtifactIndex < repositoryVerificationIndex);
  assert.ok(earliestGuardArtifactIndex < dependencyInstallIndex);
  assert.ok(initialGuardArtifactIndex >= 0);
  assert.ok(shadowKeyValidationIndex >= 0);
  assert.ok(initialGuardArtifactIndex < shadowKeyValidationIndex);
  assert.match(WORKFLOW, /catch \(error\) \{/);
  assert.match(WORKFLOW, /await persistGuardArtifact\(\)/);
  assert.match(WORKFLOW, /mtg-pricing-production-guard\.json/);
  assert.match(WORKER, /evaluateMtgPricingProductionActivationGuardV1/);
  assert.match(WORKER, /async function evaluateProductionActivationGuard/);
  assert.match(
    WORKER,
    /production_counts as \([\s\S]*from public\.market_price_publication_snapshots snapshot/,
  );
  assert.match(
    WORKER,
    /production_counts as \([\s\S]*count\(distinct snapshot\.card_printing_id\)[\s\S]*card_printing_truth_reviews truth_review/,
  );
  assert.match(
    WORKER,
    /current_counts as \([\s\S]*from public\.market_price_current_publication current_state/,
  );
  assert.match(
    WORKER,
    /current_counts as \([\s\S]*category_id' = '1'[\s\S]*as mtg_baseline_eligible/,
  );
  assert.match(WORKER, /MTG_PRICING_PRODUCTION_GUARD_OUT/);
  assert.match(WORKER, /PRODUCTION_GUARD_STATEMENT_TIMEOUT_MS = 120_000/);
  assert.match(WORKER, /PRODUCTION_GUARD_QUERY_TIMEOUT_MS = 125_000/);
  assert.match(
    WORKER,
    /set_config\('statement_timeout', \$1, true\)[\s\S]*query_timeout: PRODUCTION_GUARD_QUERY_TIMEOUT_MS/,
  );
  assert.match(WORKER, /await ensureMtgProductionGuardArtifact\(\)/);
  assert.doesNotMatch(
    WORKER,
    /await persistMtgProductionGuardArtifact\(\s*buildMtgPricingProductionGuardStartedArtifactV1\(\)/,
  );
  assert.match(
    WORKER,
    /main\(\)\.catch\(async \(error\) => \{[\s\S]*persistMtgProductionWorkerFailure\(error\)/,
  );
  assert.match(WORKER, /errorField: "worker_error"/);
  const activationFunction = WORKER.match(
    /async function activateAndVerify\([\s\S]*?\n}\n\nasync function artifactRows/,
  )?.[0];
  assert.ok(activationFunction);
  assert.ok(
    activationFunction.indexOf("evaluateProductionActivationGuard") <
      activationFunction.indexOf("activate_market_price_publication_set_v1"),
  );
  assert.match(WORKFLOW, /--expected-source-sync-run-id=\$shadow_source_sync_run_id/);
  assert.match(WORKER, /does not match shadow-proven source run/);
  assert.match(WORKFLOW, /--database-timeout-minutes=180/);
  assert.match(WORKFLOW, /for attempt in 1 2 3/);
  assert.match(WORKFLOW, /classifyMarketPipelineFailureV1/);
  assert.match(WORKFLOW, /if \[\[ "\$retryable" != "true" \]\]/);
  assert.doesNotMatch(WORKFLOW, /if ! grep -Eqi/);
});
