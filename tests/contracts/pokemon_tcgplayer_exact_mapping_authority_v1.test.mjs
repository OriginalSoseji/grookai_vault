import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  partitionPokemonMappingAuthorityFinishCandidatesV1,
} from "../../backend/operations/tcgplayer_pricing_completion_agent_v1.mjs";
import {
  assertCandidateLive,
} from "../../scripts/audits/pokemon_tcgplayer_exact_mapping_authority_v1.mjs";

const SCRIPT = fs.readFileSync(new URL(
  "../../scripts/audits/pokemon_tcgplayer_exact_mapping_authority_v1.mjs",
  import.meta.url,
), "utf8");
const WORKER = fs.readFileSync(new URL(
  "../../scripts/workers/tcgplayer_pricing_completion_agent_v1.mjs",
  import.meta.url,
), "utf8");
const PLAYBOOK = fs.readFileSync(new URL(
  "../../docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md",
  import.meta.url,
), "utf8");

test("Pokemon exact mapping authority is a verified read-only evidence packager", () => {
  assert.match(SCRIPT, /begin isolation level repeatable read read only/);
  assert.match(SCRIPT, /default_transaction_read_only=on/);
  assert.match(SCRIPT, /stream\?\.authorized !== true/);
  assert.match(SCRIPT, /canonical_card_print_maturity_gate_failed/);
  assert.match(SCRIPT, /canonical_set_maturity_gate_failed/);
  assert.match(SCRIPT, /canonical_trait_maturity_gate_failed/);
  assert.doesNotMatch(SCRIPT, /\binsert\s+into\s+public\./i);
  assert.doesNotMatch(SCRIPT, /\bupdate\s+public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(SCRIPT, /client\.query\(["']commit/i);
  assert.match(SCRIPT, /process\.env\.PROD_SUPABASE_URL \?\? process\.env\.SUPABASE_URL/);
});

test("Pokemon authority binds source, observation, parent, identity, and exact finish", () => {
  assert.match(SCRIPT, /validateTcgplayerExactMappingCandidateForApplyV1/);
  assert.match(SCRIPT, /source_observation_product_changed/);
  assert.match(SCRIPT, /source_observation_run_changed/);
  assert.match(SCRIPT, /catalog_source_run_not_completed/);
  assert.match(SCRIPT, /catalog_source_sync_run_ids/);
  assert.doesNotMatch(SCRIPT,
    /assert\.equal\(product\.last_seen_run_id, live\.sourceRun\.id/);
  assert.match(SCRIPT, /active_standard_identity_count_changed/);
  assert.match(SCRIPT, /verified_printing_not_unique/);
  assert.match(SCRIPT, /active_publication_overlap_now_exists/);
  assert.match(SCRIPT, /source_or_target_mapping_now_exists/);
  assert.match(SCRIPT, /master_card_evidence_changed/);
  assert.match(SCRIPT, /master_printing_evidence_changed/);
  assert.match(SCRIPT, /english_master_index_publishable_v1/);
});

test("catalog refresh and pricing observation runs are validated independently", () => {
  const candidate = {
    source_product_id: 694694,
    source_product_name: "Fennekin - 080",
    source_group_id: 24451,
    printed_number: "080",
    source_subtypes: ["Holofoil"],
    supporting_gap_observation_ids: ["observation-1"],
    target: {
      card_print_id: "parent-1",
      set_id: "set-1",
      set_code: "mep",
      canonical_name: "Fennekin",
      canonical_number: "80",
      gv_id: "GV-PK-MEP-80",
      variant_key: "",
    },
  };
  const live = {
    sourceRun: { id: "pricing-sync" },
    catalogSourceRuns: [{
      id: "newer-catalog-sync",
      status: "completed",
      sync_mode: "current_full_sync",
      failed_count: 0,
    }],
    products: [{
      product_id: 694694,
      category_id: 3,
      group_id: 24451,
      name: "Fennekin - 080",
      extended_data: [{ name: "Number", value: "080" }],
      last_seen_run_id: "newer-catalog-sync",
      source_active: true,
      catalog_metadata_status: "current",
    }],
    parents: [{
      id: "parent-1",
      set_id: "set-1",
      set_code: "mep",
      name: "Fennekin",
      number: "80",
      gv_id: "GV-PK-MEP-80",
      variant_key: "",
      identity_domain: "pokemon_eng_standard",
    }],
    identities: [{ card_print_id: "parent-1" }],
    printings: [{
      card_print_id: "parent-1",
      finish_key: "holo",
      is_provisional: false,
      printing_gv_id: "GV-PK-MEP-80-HOLO",
    }],
    observations: [{
      id: "observation-1",
      product_id: 694694,
      subtype_name: "Holofoil",
      last_seen_run_id: "pricing-sync",
    }],
  };
  assert.doesNotThrow(() => assertCandidateLive(candidate, live));
  live.catalogSourceRuns[0].status = "running";
  assert.throws(() => assertCandidateLive(candidate, live),
    /catalog_source_run_not_completed:694694/);
});

test("Pokemon authority package is evidence-only and requires later founder approval", () => {
  assert.match(SCRIPT, /freezeMasterMappingAuthority\(exactCandidates, scopes\)/);
  assert.match(SCRIPT, /assertMasterPrintingAuthority\(manifest, artifacts\)/);
  assert.match(SCRIPT, /mutation_authority: false/);
  assert.match(SCRIPT, /execution_authorized: false/);
  assert.match(SCRIPT, /mapping_writes: false/);
  assert.match(SCRIPT, /pricing_writes: false/);
  assert.match(SCRIPT, /publication_writes: false/);
});

test("completion agent publishes the evidence-rich replacement and fails closed", () => {
  assert.match(WORKER, /buildPokemonPricingMappingAuthorityReviewWorkItemV1/);
  assert.match(WORKER, /pokemon_tcgplayer_exact_mapping_authority_v1\.mjs/);
  assert.match(WORKER, /pokemonMappingAuthorityExpected/);
  assert.match(WORKER, /pokemonMappingAuthorityExpected\s*\? null/);
  assert.match(WORKER, /authority_status: pokemonMappingAuthorityProcess\.status/);
  assert.match(WORKER, /authority_receipt: pokemonMappingAuthority\?\.receipt \?\? null/);
  assert.ok(WORKER.indexOf("runPokemonExactMappingAuthority") <
    WORKER.indexOf("buildPokemonPricingMappingAuthorityReviewWorkItemV1({"));
});

test("multi-finish products are held without stalling unrelated authority candidates", () => {
  const singleFinish = {
    source_product_id: 694694,
    source_subtypes: ["Holofoil"],
  };
  const multiFinish = {
    source_product_id: 700001,
    source_subtypes: ["Normal", "Reverse Holofoil"],
  };
  const unsupportedFinish = {
    source_product_id: 700002,
    source_subtypes: ["Cosmos Holofoil"],
  };
  const result = partitionPokemonMappingAuthorityFinishCandidatesV1([
    multiFinish,
    singleFinish,
    unsupportedFinish,
  ]);
  assert.deepEqual(result.eligible, [singleFinish]);
  assert.deepEqual(result.held.map((row) => row.source_product_id), [700001, 700002]);
  assert.deepEqual(result.held_by_reason, {
    mapping_authority_source_finish_not_supported: 1,
    mapping_authority_source_finish_not_unique: 1,
  });
});

test("operators can distinguish an empty review from unavailable authority packaging", () => {
  assert.match(PLAYBOOK, /pokemon_mapping_authority_exact_candidates\.jsonl/);
  assert.match(PLAYBOOK, /authority_status = available/);
  assert.match(PLAYBOOK, /authority_status =\s*unavailable/);
  assert.match(PLAYBOOK, /Catalog refresh and pricing-observation run IDs are allowed to differ/);
  assert.match(PLAYBOOK, /second founder approval/);
  assert.match(PLAYBOOK, /mapping_authority_source_finish_not_unique/);
});

