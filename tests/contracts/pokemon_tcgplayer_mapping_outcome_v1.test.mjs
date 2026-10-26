import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildPokemonTcgplayerMappingAuthorityV1,
  buildPokemonTcgplayerMappingOutcomeAgentV1,
  buildPokemonTcgplayerMappingOutcomePackageV1,
  buildPokemonTcgplayerMappingOutcomeWorkItemV1,
  pokemonTcgplayerMappingDatabaseConfigV1,
  validateApprovedPokemonMappingReviewV1,
  validatePokemonTcgplayerMappingAuthorityV1,
} from "../../backend/operations/pokemon_tcgplayer_mapping_outcome_v1.mjs";
import { operationsSha256V1 } from "../../backend/operations/operations_control_plane_v1.mjs";
import { freezeMasterMappingAuthority } from "../../backend/pricing/master_index_mapping_authority_v1.mjs";
import { fixture as masterMappingFixture } from "../fixtures/master_mapping_authority_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function review() {
  const master = masterMappingFixture();
  const exactCandidate = structuredClone(master.selected[0]);
  const masterMappingAuthority = freezeMasterMappingAuthority(master.selected, [master]);
  const planPayload = {
    proposal_kind: "pokemon_tcgplayer_mapping_review",
    proposal_version: "TCGPLAYER_POKEMON_MAPPING_REVIEW_V1",
    source_pricing_run_id: "pricing-run-1",
    source_sync_run_id: "7ca0463c-98e1-430c-9a28-aa94b23de778",
    source_completed_at: "2026-10-26T04:52:22.788Z",
    source_commit_sha: "b5537aa254327413008226b2d88d011a70bbd62a",
    exact_mapping_candidates: [exactCandidate],
    master_mapping_authority: masterMappingAuthority,
    review_candidates: [{
      source_product_id: exactCandidate.source_product_id,
      source_product_name: exactCandidate.source_product_name,
      source_group_id: exactCandidate.source_group_id,
      source_group_name: exactCandidate.source_group_name,
      printed_number: exactCandidate.printed_number,
      source_subtypes: exactCandidate.source_subtypes,
      supporting_gap_observation_ids: exactCandidate.supporting_gap_observation_ids,
      review_targets: [{
        ...exactCandidate.target,
        set_name: "Synthetic fixture set",
        candidate_score: 98,
        candidate_evidence: { number_exact: true },
      }],
    }],
    review_boundary: {
      database_writes: false,
      mapping_writes: false,
      publication_writes: false,
      writer_dispatches: false,
      approval_records_review_only: true,
    },
  };
  return {
    id: "d8c12fc6-7ed3-434b-9dfc-da666c07b9d3",
    work_item_key: "pokemon-pricing-mapping-review:7ca0463c-98e1-430c-9a28-aa94b23de778",
    work_item_type: "tcgplayer_pricing_backlog_repair",
    action_type: "advance_tcgplayer_pricing_backlog",
    agent_key: "tcgplayer-pricing-completion-v1",
    version: 2,
    state: "approved",
    decided_at: "2026-10-26T06:00:00.000Z",
    plan_payload: planPayload,
    plan_fingerprint: operationsSha256V1(planPayload),
  };
}

test("approved Pokemon reviews become frozen insert-only authorities", () => {
  const approved = review();
  assert.equal(validateApprovedPokemonMappingReviewV1(approved).candidates.length, 1);
  const authority = buildPokemonTcgplayerMappingAuthorityV1({
    review: approved,
    sourceCommitSha: "a".repeat(40),
  });
  assert.equal(authority.expected_mapping_count, 1);
  assert.equal(authority.boundaries.mapping_inserts, 1);
  assert.equal(authority.boundaries.mapping_updates, 0);
  assert.equal(authority.master_mapping_authority.fingerprint,
    review().plan_payload.master_mapping_authority.fingerprint);
  assert.equal(validatePokemonTcgplayerMappingAuthorityV1(authority), authority);
});

test("unapproved, collided, or tampered reviews fail closed", () => {
  const unapproved = review();
  unapproved.state = "ready_for_review";
  assert.throws(() => validateApprovedPokemonMappingReviewV1(unapproved), /not an approved/);

  const collided = review();
  collided.plan_payload.review_candidates.push(structuredClone(
    collided.plan_payload.review_candidates[0],
  ));
  collided.plan_fingerprint = operationsSha256V1(collided.plan_payload);
  assert.throws(() => validateApprovedPokemonMappingReviewV1(collided), /collision/);

  const authority = buildPokemonTcgplayerMappingAuthorityV1({
    review: review(),
    sourceCommitSha: "b".repeat(40),
  });
  authority.candidates[0].target.gv_id = "changed";
  assert.throws(() => validatePokemonTcgplayerMappingAuthorityV1(authority),
    /exact mapping candidate changed|fingerprint changed/);

  const missingMaster = review();
  delete missingMaster.plan_payload.master_mapping_authority;
  missingMaster.plan_fingerprint = operationsSha256V1(missingMaster.plan_payload);
  assert.throws(() => validateApprovedPokemonMappingReviewV1(missingMaster),
    /Master Index mapping authority/);
});

test("clean preflight builds one execution-enabled outcome workflow", () => {
  const authority = buildPokemonTcgplayerMappingAuthorityV1({
    review: review(),
    sourceCommitSha: "c".repeat(40),
  });
  const outcomePackage = buildPokemonTcgplayerMappingOutcomePackageV1({
    authority,
    preflight: {
      status: "passed",
      mode: "dry_run",
      authority_fingerprint_sha256: authority.authority_fingerprint_sha256,
      master_authority_fingerprint: authority.master_mapping_authority.fingerprint,
      expected_mapping_count: 1,
      missing_mapping_count: 1,
      already_applied_count: 0,
      conflict_count: 0,
      live_state_fingerprint_sha256: "d".repeat(64),
    },
  });
  const item = buildPokemonTcgplayerMappingOutcomeWorkItemV1({ outcomePackage });
  assert.equal(item.command_policy.execution_enabled, true);
  assert.equal(item.requires_recent_auth, true);
  assert.equal(item.scope.mapping_count, 1);
  assert.equal(item.plan_payload.outcome_workflow.workflow_key,
    "pokemon_tcgplayer_mapping_apply_v1");
  assert.deepEqual(item.plan_payload.outcome_workflow.stages.map((stage) => stage.handler_key), [
    "verify_pokemon_mapping_scope_v1",
    "apply_pokemon_mapping_plan_v1",
  ]);
  assert.equal(buildPokemonTcgplayerMappingOutcomeAgentV1().agent_key,
    "pokemon-tcgplayer-mapping-outcome-v1");
});

test("workflow and executor register only the frozen Pokemon handlers", () => {
  const workflow = source("backend/operations/founder_outcome_workflow_v1.mjs");
  const executor = source("scripts/workers/founder_outcome_workflow_executor_v1.mjs");
  const maintenance = source("backend/maintenance/run_canon_maintenance_v1.mjs");
  const action = source(".github/workflows/pokemon-tcgplayer-mapping-outcome.yml");
  const publisher = source("scripts/workers/pokemon_tcgplayer_mapping_outcome_publisher_v1.mjs");
  assert.match(workflow, /pokemon_tcgplayer_mapping_apply_v1/);
  assert.match(executor, /verify_pokemon_mapping_scope_v1/);
  assert.match(executor, /apply_pokemon_mapping_plan_v1/);
  assert.match(maintenance, /pokemon_tcgplayer_mapping_outcome_apply_v1\.mjs/);
  assert.match(action, /schedule:/);
  assert.match(action, /--publish/);
  assert.match(executor, /master_mapping_authority/);
  assert.match(maintenance, /pokemon_tcgplayer_mapping_outcome_apply_v1\.mjs/);
  const writer = source("backend/maintenance/pokemon_tcgplayer_mapping_outcome_apply_v1.mjs");
  assert.ok(writer.indexOf("assertMasterMappingBatchAuthority") < writer.indexOf("await client.connect()"));
  assert.match(writer, /authority_file_changed_before_commit/);
  assert.match(writer, /master_authority_binding/);
  assert.match(publisher, /\.range\(from, from \+ pageSize - 1\)/);
  assert.ok(publisher.indexOf("existingKeys.has(outcomeKey)") <
    publisher.indexOf("workItems.length >= options.limit"));
});

test("database guard accepts only verified production routes for the canonical project", () => {
  const direct = pokemonTcgplayerMappingDatabaseConfigV1(
    "postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres",
    { mode: "dry_run", env: {} },
  );
  assert.equal(direct.ssl.servername, "aws-1-us-east-2.pooler.supabase.com");
  assert.equal(new URL(direct.connectionString).username, "postgres.ycdxbpibncqcchqiihfz");
  assert.equal(new URL(direct.connectionString).port, "5432");
  assert.equal(direct.options, "-c default_transaction_read_only=on");
  const pooler = pokemonTcgplayerMappingDatabaseConfigV1(
    "postgresql://postgres.ycdxbpibncqcchqiihfz:fixture@aws-1-us-east-2.pooler.supabase.com:6543/postgres",
    { mode: "apply", env: {} },
  );
  assert.equal(pooler.ssl.servername, "aws-1-us-east-2.pooler.supabase.com");
  assert.equal(pooler.options, undefined);
  for (const url of [
    "postgresql://postgres:fixture@db.other.supabase.co:5432/postgres",
    "postgresql://postgres.other:fixture@aws-1-us-east-2.pooler.supabase.com:5432/postgres",
    "postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:1234/postgres",
    "postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/other",
    "postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres?options=bad",
  ]) assert.throws(() => pokemonTcgplayerMappingDatabaseConfigV1(url, { mode: "dry_run", env: {} }));
});
