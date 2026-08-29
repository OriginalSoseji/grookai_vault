import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
  buildCollectibleWave1CardIdentityProposalV1,
} from "../../backend/catalog/collectible_wave1_card_identity_proposal_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HASH = "a".repeat(64);

function setRow({
  game = "yugioh",
  id = "set-1",
  code = "ygo-lob",
  name = "Legend of Blue Eyes White Dragon",
  sourceName = name,
  sourceCode = "LOB",
} = {}) {
  const sourceId = game === "yugioh"
    ? "yugioh_ygoprodeck_api_v7"
    : "gundam_gcg_api_v1";
  return {
    apply_proposal_version: "COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_V1",
    source_set_proposal_id: `${game}:set-proposal:fixture`,
    id,
    game,
    code,
    name,
    source: {
      source_id: sourceId,
      source_set_name: sourceName,
      source_set_code: sourceCode,
      canonical_visibility: "hidden",
      card_identity_authorized: false,
    },
    canonical_authority_proposed: true,
    write_authority: false,
  };
}

function candidate({
  id = "100|LOB-001|Ultra Rare",
  game = "yugioh",
  setName = "Legend of Blue Eyes White Dragon",
  setCode = "LOB",
  number = "LOB-001",
  name = "Blue-Eyes White Dragon",
  rarity = "Ultra Rare",
  sourceProductId = "100",
} = {}) {
  const sourceId = game === "yugioh"
    ? "yugioh_ygoprodeck_api_v7"
    : "gundam_gcg_api_v1";
  return {
    shadow_candidate_id: `${game}_official_v1:${id}`,
    source_candidate_id: id,
    source_evidence_sha256: HASH,
    candidate_schema_version: "COLLECTIBLE_SHADOW_CANDIDATE_V1",
    parser_version: "COLLECTIBLE_SHADOW_PARSER_WAVE1_V1",
    candidate_source: { source_id: sourceId },
    canonical_authority: false,
    identity_coordinates: {
      game,
      language: "en",
      set_or_product: setName,
      set_code: setCode,
      collector_number: number,
      card_name: name,
      source_product_id: sourceProductId,
      rarity,
    },
  };
}

function altArt(candidateIds) {
  return {
    variant_evidence_version: "COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_V1",
    variant_evidence_id: "yugioh_ygoprodeck_api_v7:100:alternative_artwork",
    source_id: "yugioh_ygoprodeck_api_v7",
    source_card_id: "100",
    source_evidence_sha256: HASH,
    source_image_ids: ["100", "101"],
    source_image_count: 2,
    source_printing_candidate_ids: candidateIds,
    source_printing_candidate_count: candidateIds.length,
    mapping_status: "unresolved_artwork_to_printing",
    canonical_authority: false,
    write_authority: false,
    image_content_accessed: false,
    image_republication_authorized: false,
  };
}

test("the Wave 1 card proposal contract is versioned", () => {
  assert.equal(
    COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
    "COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_V1",
  );
});

test("printing candidates group into one parent without converting rarity to finish", () => {
  const first = candidate();
  const second = candidate({ id: "100|LOB-001|Secret Rare", rarity: "Secret Rare" });
  const result = buildCollectibleWave1CardIdentityProposalV1({
    candidates: [second, first],
    selectedSetRows: [setRow()],
  });

  assert.equal(result.parentProposals.length, 1);
  assert.equal(result.parentProposals[0].source_printing_candidate_count, 2);
  assert.deepEqual(result.parentProposals[0].source_rarity_labels, [
    "Secret Rare",
    "Ultra Rare",
  ]);
  assert.equal(result.parentProposals[0].proposal_status, "proposal_ready");
  assert.equal(result.sourcePrintingEvidence.length, 2);
  assert.ok(result.sourcePrintingEvidence.every((row) =>
    row.normalized_finish_key === null &&
    row.source_rarity_is_not_finish_authority === true));
});

test("a candidate outside the approved set payload is preserved as excluded", () => {
  const result = buildCollectibleWave1CardIdentityProposalV1({
    candidates: [candidate({ setName: "Unapproved Set", setCode: "NEW" })],
    selectedSetRows: [setRow()],
  });
  assert.equal(result.parentProposals.length, 0);
  assert.equal(result.excludedCandidates.length, 1);
  assert.equal(
    result.excludedCandidates[0].disposition,
    "excluded_missing_approved_set_foundation",
  );
  assert.equal(result.metrics.candidate_reconciliation_mismatch_count, 0);
});

test("Gundam candidates match the approved source set code, not the namespaced code", () => {
  const gundamSet = setRow({
    game: "gundam",
    id: "g-set-1",
    code: "gcg-eb01",
    name: "Eternal Nexus",
    sourceCode: "EB01",
  });
  const result = buildCollectibleWave1CardIdentityProposalV1({
    candidates: [candidate({
      game: "gundam",
      id: "EB01-001",
      setName: "Eternal Nexus",
      setCode: "EB01",
      number: "EB01-001",
      name: "Gundam Astray Red Frame Custom (EX)",
      rarity: "LR",
      sourceProductId: "EB01-001",
    })],
    selectedSetRows: [gundamSet],
  });
  assert.equal(result.parentProposals[0].canonical_set_code, "gcg-eb01");
  assert.equal(result.parentProposals[0].source_set_code, "EB01");
});

test("one collector number with multiple names routes every parent to review", () => {
  const candidates = [
    candidate({ name: "First Name" }),
    candidate({ id: "101|LOB-001|Rare", name: "Second Name", sourceProductId: "101" }),
  ];
  const result = buildCollectibleWave1CardIdentityProposalV1({
    candidates,
    selectedSetRows: [setRow()],
  });
  assert.equal(result.parentProposals.length, 2);
  assert.equal(result.metrics.conflicting_coordinate_count, 1);
  assert.ok(result.parentProposals.every((row) =>
    row.proposal_status === "review_required_identity_conflict"));
});

test("alternative-artwork evidence routes the parent to review without assigning images", () => {
  const sourceCandidate = candidate();
  const result = buildCollectibleWave1CardIdentityProposalV1({
    candidates: [sourceCandidate],
    selectedSetRows: [setRow()],
    alternativeArtworkRows: [altArt([sourceCandidate.shadow_candidate_id])],
  });
  assert.equal(
    result.parentProposals[0].proposal_status,
    "review_required_unresolved_alternative_artwork",
  );
  assert.equal(result.parentProposals[0].image_authority, false);
  assert.equal(result.sourcePrintingEvidence[0].normalized_variant_key, null);
});

test("alternative-artwork evidence cannot reference an unknown candidate", () => {
  assert.throws(() => buildCollectibleWave1CardIdentityProposalV1({
    candidates: [candidate()],
    selectedSetRows: [setRow()],
    alternativeArtworkRows: [altArt(["missing-candidate"])],
  }), /unknown candidate/);
});

test("set rows cannot silently authorize card identity or writes", () => {
  const unsafe = setRow();
  unsafe.source.card_identity_authorized = true;
  assert.throws(() => buildCollectibleWave1CardIdentityProposalV1({
    candidates: [candidate()],
    selectedSetRows: [unsafe],
  }), /invalid selected set foundation row/);
});

test("proposal output is stable regardless of candidate order", () => {
  const first = candidate();
  const second = candidate({ id: "100|LOB-001|Secret Rare", rarity: "Secret Rare" });
  const left = buildCollectibleWave1CardIdentityProposalV1({
    candidates: [first, second],
    selectedSetRows: [setRow()],
  });
  const right = buildCollectibleWave1CardIdentityProposalV1({
    candidates: [second, first],
    selectedSetRows: [setRow()],
  });
  assert.deepEqual(left, right);
});

test("the live worker and workflow remain default-branch, read-only, and artifact-only", () => {
  const worker = fs.readFileSync(path.join(
    ROOT,
    "scripts/workers/collectible_wave1_card_identity_proposal_v1.mjs",
  ), "utf8");
  const workflow = fs.readFileSync(path.join(
    ROOT,
    ".github/workflows/collectible-wave1-card-identity-proposal.yml",
  ), "utf8");
  assert.match(worker, /default_transaction_read_only=on/);
  assert.match(worker, /begin isolation level repeatable read read only/);
  assert.match(worker, /rollback/);
  assert.match(worker, /candidate_index\.jsonl/);
  assert.match(worker, /alternative_artwork_index\.jsonl/);
  assert.match(workflow, /github\.event\.repository\.default_branch/);
  assert.match(workflow, /run-id: "33118951166"/);
  assert.match(workflow, /run-id: "33132457407"/);
  assert.match(workflow, /CATALOG_AUTOMATION_MODE: shadow-only/);
  assert.doesNotMatch(workflow, /supabase db push|psql|storage.*upload/i);
});
