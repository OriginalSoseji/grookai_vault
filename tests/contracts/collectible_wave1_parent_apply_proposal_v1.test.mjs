import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION,
  COLLECTIBLE_WAVE1_PARENT_EXPECTED,
  COLLECTIBLE_WAVE1_PARENT_GAME_POLICY,
  COLLECTIBLE_WAVE1_PARENT_MIGRATION_VERSION,
  buildCollectibleWave1ParentApplyProposalV1,
  buildCollectibleWave1ParentRollbackContractV1,
  canonicalWave1ParentCardIdV1,
  canonicalWave1ParentGvIdV1,
  evaluateCollectibleWave1ParentPreflightV1,
  renderCollectibleWave1ParentMigrationCandidateV1,
} from "../../backend/catalog/collectible_wave1_parent_apply_proposal_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const HASH = "a".repeat(64);
const SET_IDS = Object.freeze({
  gundam: "0134a9db-db39-5ec3-acdb-5d3aed61c426",
  yugioh: "e11d869f-7fc1-5f79-b426-003d3513df45",
});

function proposalId(game, index) {
  return `${game}:card-proposal:${index.toString(16).padStart(24, "0")}`;
}

function shadowId(game, parentIndex, evidenceIndex) {
  return `${game}_official_v1:${parentIndex}|CARD-${parentIndex}|${evidenceIndex}`;
}

function readyParent(game, index, evidenceCount) {
  const number = `${game === "gundam" ? "GD" : "YG"}-${index
    .toString().padStart(6, "0")}${index === 0 ? "?" : ""}`;
  return {
    proposal_version: "COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_V1",
    parent_proposal_id: proposalId(game, index + (game === "gundam" ? 0 : 100000)),
    game,
    set_id: SET_IDS[game],
    canonical_set_code: game === "gundam" ? "gcg-test" : "ygo-test",
    canonical_set_name: `${game} Test Set`,
    source_set_proposal_id: `${game}:set-proposal:${"b".repeat(24)}`,
    source_set_name: `${game} Test Set`,
    source_set_code: game === "gundam" ? "GD" : "YG",
    language: "en",
    card_name: `${game} Card ${index}`,
    collector_number: number,
    normalized_card_name: `${game} card ${index}`,
    normalized_collector_number: number.toLowerCase(),
    source_printing_candidate_ids: Array.from(
      { length: evidenceCount },
      (_, evidenceIndex) => shadowId(game, index, evidenceIndex),
    ),
    source_printing_candidate_count: evidenceCount,
    source_product_ids: game === "gundam" ? [`GD-${index}`] : [],
    source_rarity_labels: ["Source Rarity"],
    source_evidence_sha256: [HASH],
    alternative_artwork_evidence_ids: [],
    alternative_artwork_evidence_count: 0,
    proposal_status: "proposal_ready",
    reason_codes: ["exact_selected_set_foundation", "source_parent_coordinates_complete"],
    canonical_parent_id_proposed: false,
    canonical_gv_id_proposed: false,
    canonical_authority: false,
    write_authority: false,
    image_authority: false,
    printing_authority: false,
  };
}

function evidenceFor(parent, evidenceIndex) {
  return {
    proposal_version: "COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_V1",
    shadow_candidate_id: parent.source_printing_candidate_ids[evidenceIndex],
    source_candidate_id: `${parent.game}:${parent.collector_number}:${evidenceIndex}`,
    parent_proposal_id: parent.parent_proposal_id,
    game: parent.game,
    set_id: parent.set_id,
    source_product_id: parent.game === "gundam" ? `GD-${evidenceIndex}` : "",
    source_rarity_label: "Source Rarity",
    source_evidence_sha256: HASH,
    alternative_artwork_evidence_ids: [],
    evidence_status: "source_printing_evidence_unmapped",
    normalized_finish_key: null,
    normalized_variant_key: null,
    source_rarity_is_not_finish_authority: true,
    canonical_printing_id_proposed: false,
    canonical_authority: false,
    write_authority: false,
    image_authority: false,
  };
}

let frozenFixture;
function fixture() {
  if (frozenFixture) return structuredClone(frozenFixture);
  const parents = [];
  const evidence = [];
  for (const [game, parentCount, evidenceCount] of [
    ["gundam", 206, 251],
    ["yugioh", 26513, 31515],
  ]) {
    const extras = evidenceCount - parentCount;
    for (let index = 0; index < parentCount; index += 1) {
      const parent = readyParent(game, index, index < extras ? 2 : 1);
      parents.push(parent);
      for (let evidenceIndex = 0;
        evidenceIndex < parent.source_printing_candidate_count;
        evidenceIndex += 1) {
        evidence.push(evidenceFor(parent, evidenceIndex));
      }
    }
  }
  for (let index = 0; index < 1116; index += 1) {
    parents.push({
      proposal_status: "review_required_unresolved_alternative_artwork",
      parent_proposal_id: proposalId("yugioh", 500000 + index),
      game: "yugioh",
    });
  }
  for (let index = 0; index < 1395; index += 1) {
    evidence.push({
      parent_proposal_id: proposalId("yugioh", 500000 + (index % 1116)),
      shadow_candidate_id: `review:${index}`,
      game: "yugioh",
    });
  }
  frozenFixture = { parentProposals: parents, sourcePrintingEvidence: evidence };
  return structuredClone(frozenFixture);
}

let built;
function proposal() {
  built ??= buildCollectibleWave1ParentApplyProposalV1(fixture());
  return built;
}

function validPreflight() {
  return {
    transaction_read_only: true,
    planned_card_print_count: 26719,
    planned_identity_count: 26719,
    planned_evidence_count: 31766,
    existing_card_print_id_count: 0,
    existing_gv_id_count: 0,
    existing_standard_coordinate_count: 0,
    existing_identity_id_count: 0,
    existing_identity_hash_count: 0,
    existing_evidence_id_count: 0,
    existing_evidence_lane_count: 0,
    existing_target_set_card_count: 0,
    candidate_migration_count: 0,
    conflicting_lock_count: 0,
    selected_set_count: 505,
    identity_domain_constraint: "CHECK ((identity_domain = ANY (ARRAY['pokemon_eng_standard'::text, 'pokemon_ba'::text, 'pokemon_eng_special_print'::text, 'pokemon_jpn'::text, 'mtg_eng_paper_print'::text, 'one_piece_eng_print'::text])))",
    games: [
      {
        id: "47434700-0000-4000-8000-000000000001",
        code: "gundam",
        name: "Gundam Card Game",
        slug: "gundam-card-game",
      },
      {
        id: "59474f00-0000-4000-8000-000000000001",
        code: "yugioh",
        name: "Yu-Gi-Oh!",
        slug: "yu-gi-oh",
      },
    ],
    release_controls: [
      {
        game_code: "gundam",
        release_status: "hidden",
        release_version: "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1",
      },
      {
        game_code: "yugioh",
        release_status: "hidden",
        release_version: "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1",
      },
    ],
  };
}

test("the parent apply contract builds the exact frozen scope", () => {
  const result = proposal();
  assert.equal(result.version, COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_VERSION);
  assert.equal(result.cardPrints.length, 26719);
  assert.equal(result.identities.length, 26719);
  assert.equal(result.sourceEvidence.length, 31766);
  assert.deepEqual(result.metrics.parent_counts_by_game, { gundam: 206, yugioh: 26513 });
  assert.deepEqual(result.metrics.evidence_counts_by_game, { gundam: 251, yugioh: 31515 });
  assert.equal(result.metrics.review_required_rows_excluded, 1116);
  assert.equal(result.metrics.reconciliation_mismatch_count, 0);
  assert.match(result.payload_fingerprint_sha256, /^[0-9a-f]{64}$/);
});

test("parent rows never promote source rarity, product IDs, finishes, or variants", () => {
  const result = proposal();
  assert.ok(result.cardPrints.every((row) =>
    row.variant_key === null && row.rarity === null && row.tcgplayer_id === null &&
    Object.keys(row.external_ids).length === 0));
  assert.ok(result.identities.every((row) =>
    row.identity_payload.variant_key === null && row.identity_payload.rarity === null));
  assert.ok(result.sourceEvidence.every((row) =>
    row.evidence_payload.source_printing_evidence.source_rarity_is_not_finish_authority === true &&
    row.evidence_payload.source_printing_evidence.normalized_finish_key === null &&
    row.evidence_payload.source_printing_evidence.normalized_variant_key === null));
});

test("canonical parent UUIDs and GV-IDs are deterministic and globally unique", () => {
  const result = proposal();
  assert.equal(new Set(result.cardPrints.map((row) => row.id)).size, 26719);
  assert.equal(new Set(result.cardPrints.map((row) => row.gv_id)).size, 26719);
  const first = fixture().parentProposals.find((row) => row.proposal_status === "proposal_ready");
  assert.equal(canonicalWave1ParentCardIdV1(first.parent_proposal_id),
    canonicalWave1ParentCardIdV1(first.parent_proposal_id));
  assert.match(canonicalWave1ParentGvIdV1(first), /^GV-GCG-GD-000000-UNK-/);
  assert.throws(() => canonicalWave1ParentCardIdV1("bad"), /Invalid parent proposal ID/);
});

test("identity and evidence rows have exact traceable ownership", () => {
  const result = proposal();
  const cardIds = new Set(result.cardPrints.map((row) => row.id));
  const identityIds = new Set(result.identities.map((row) => row.id));
  assert.ok(result.identities.every((row) => cardIds.has(row.card_print_id)));
  assert.ok(result.sourceEvidence.every((row) =>
    cardIds.has(row.card_print_id) && identityIds.has(row.card_print_identity_id)));
  assert.equal(new Set(result.sourceEvidence.map((row) => row.id)).size, 31766);
  assert.equal(new Set(result.sourceEvidence.map((row) =>
    `${row.card_print_identity_id}|${row.source_key}|${row.acquisition_key}`)).size, 31766);
});

test("migration candidate is exact, domain-aware, and does not write the ledger", () => {
  const sql = renderCollectibleWave1ParentMigrationCandidateV1(proposal());
  assert.match(sql, /gundam_eng_parent/);
  assert.match(sql, /yugioh_eng_parent/);
  assert.match(sql, /insert into public\.card_prints/i);
  assert.match(sql, /insert into public\.card_print_identity\s*\(/i);
  assert.match(sql, /insert into public\.card_print_identity_source_evidence/i);
  assert.match(sql, new RegExp(proposal().payload_fingerprint_sha256));
  assert.doesNotMatch(sql, /insert into supabase_migrations|update\s+public\.|delete\s+from|truncate/i);
  assert.equal(COLLECTIBLE_WAVE1_PARENT_MIGRATION_VERSION, "20260829230000");
});

test("rollback contract is non-executable and exact", () => {
  const rollback = buildCollectibleWave1ParentRollbackContractV1(proposal());
  assert.equal(rollback.automatic_execution_authorized, false);
  assert.equal(rollback.selector.exact_card_print_ids.length, 26719);
  assert.equal(rollback.selector.exact_identity_ids.length, 26719);
  assert.equal(rollback.selector.exact_source_evidence_ids.length, 31766);
  assert.equal(rollback.selector.exact_payload_fingerprint_sha256,
    proposal().payload_fingerprint_sha256);
  const partial = structuredClone(proposal());
  partial.cardPrints.pop();
  assert.throws(() => buildCollectibleWave1ParentRollbackContractV1(partial),
    /exact governed parent payload/);
});

test("preflight accepts only a hidden, collision-free production baseline", () => {
  assert.deepEqual(evaluateCollectibleWave1ParentPreflightV1(validPreflight()), []);
  const drift = validPreflight();
  drift.existing_gv_id_count = 1;
  drift.release_controls[0].release_status = "signed_in";
  drift.identity_domain_constraint += ", 'yugioh_eng_parent'::text";
  assert.deepEqual(evaluateCollectibleWave1ParentPreflightV1(drift), [
    "existing_gv_id_count_not_zero",
    "hidden_release_control_mismatch:gundam",
    "identity_domain_constraint_exact_set_mismatch",
    "target_identity_domain_already_present:yugioh_eng_parent",
  ]);
});

test("the rollback executor writes its run plan before database access and cannot commit", () => {
  const worker = fs.readFileSync(path.join(
    ROOT,
    "scripts/audits/collectible_wave1_parent_apply_rollback_v1.mjs",
  ), "utf8");
  assert.match(worker, /--execute-rollback-only/);
  assert.match(worker, /default_transaction_read_only=on/);
  assert.match(worker, /stripSealedMigrationTransactionWrapperV1/);
  assert.match(worker, /await client\.query\("rollback"\)/);
  assert.match(worker, /migration_ledger_writes:\s*0/);
  assert.ok(worker.indexOf('"run_plan.json"') < worker.indexOf("marketEvidenceDbUrl()"));
  assert.doesNotMatch(worker, /client\.query\(["']commit["']\)/i);
});

test("workflow is manual, default-branch-only, frozen-input, and rollback-only", () => {
  const workflow = fs.readFileSync(path.join(
    ROOT,
    ".github/workflows/collectible-wave1-parent-apply-rollback-v1.yml",
  ), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /github\.event\.repository\.default_branch/);
  assert.match(workflow, /run-id:\s*"33239106476"/);
  assert.match(workflow, /--execute-rollback-only/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.doesNotMatch(workflow, /supabase db push|--apply|storage.*upload/i);
});

test("governing contract stops before durable apply and every downstream surface", () => {
  const contract = fs.readFileSync(path.join(
    ROOT,
    "docs/contracts/COLLECTIBLE_WAVE1_PARENT_APPLY_PROPOSAL_V1.md",
  ), "utf8");
  assert.match(contract, /26,719 rows/);
  assert.match(contract, /31,766 selected source printing candidates/);
  assert.match(contract, /always issues `ROLLBACK`/);
  assert.match(contract, /Stop after the exact-SHA rollback proof/);
  assert.match(contract, /Do not apply\s+the migration durably/);
});

test("game policies remain parent-grain, hidden, and separate", () => {
  assert.deepEqual(COLLECTIBLE_WAVE1_PARENT_EXPECTED.parent_counts_by_game,
    { gundam: 206, yugioh: 26513 });
  assert.equal(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY.gundam.identity_domain,
    "gundam_eng_parent");
  assert.equal(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY.yugioh.identity_domain,
    "yugioh_eng_parent");
  assert.notEqual(COLLECTIBLE_WAVE1_PARENT_GAME_POLICY.gundam.game_id,
    COLLECTIBLE_WAVE1_PARENT_GAME_POLICY.yugioh.game_id);
});
