import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SCRIPT = fs.readFileSync(new URL(
  "../../scripts/audits/pokemon_tcgplayer_exact_mapping_authority_v1.mjs",
  import.meta.url,
), "utf8");
const WORKER = fs.readFileSync(new URL(
  "../../scripts/workers/tcgplayer_pricing_completion_agent_v1.mjs",
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
});

test("Pokemon authority binds source, observation, parent, identity, and exact finish", () => {
  assert.match(SCRIPT, /validateTcgplayerExactMappingCandidateForApplyV1/);
  assert.match(SCRIPT, /source_observation_product_changed/);
  assert.match(SCRIPT, /source_observation_run_changed/);
  assert.match(SCRIPT, /active_standard_identity_count_changed/);
  assert.match(SCRIPT, /verified_printing_not_unique/);
  assert.match(SCRIPT, /active_publication_overlap_now_exists/);
  assert.match(SCRIPT, /source_or_target_mapping_now_exists/);
  assert.match(SCRIPT, /master_card_evidence_changed/);
  assert.match(SCRIPT, /master_printing_evidence_changed/);
  assert.match(SCRIPT, /english_master_index_publishable_v1/);
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

