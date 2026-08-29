import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  COLLECTIBLE_WAVE1_CARD_IDENTITY_PROPOSAL_VERSION,
  buildCollectibleWave1CardIdentityProposalV1,
} from "../../backend/catalog/collectible_wave1_card_identity_proposal_v1.mjs";
import { COLLECTIBLE_WAVE1_GAMES } from
  "../../backend/catalog/collectible_wave1_game_foundations_v1.mjs";
import { setReadbackFindings } from
  "../../scripts/workers/collectible_wave1_card_identity_proposal_v1.mjs";

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

test("production readback fails closed on any selected-set or game foundation drift", () => {
  const expected = {
    ...setRow({ id: "92cd6829-35bc-5f33-97b0-5d93613e004b", game: "gundam" }),
    release_date: null,
    printed_total: null,
    printed_set_abbrev: "LOB",
    set_role: null,
    identity_domain_default: null,
    identity_model: "standard",
    logo_url: null,
    symbol_url: null,
    hero_image_url: null,
    hero_image_source: null,
  };
  expected.source = {
    ...expected.source,
    canonical_apply_version: "COLLECTIBLE_WAVE1_SET_FOUNDATIONS_V1",
    canonical_payload_fingerprint_sha256:
      "fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668",
  };
  const controls = COLLECTIBLE_WAVE1_GAMES.map((game) => ({
    game_code: game.code,
    release_status: "hidden",
    release_version: "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1",
  }));
  const cleanFindings = setReadbackFindings(
    [expected],
    [structuredClone(expected)],
    COLLECTIBLE_WAVE1_GAMES.map((game) => ({ ...game })),
    controls,
    0,
  );
  assert.deepEqual(cleanFindings, []);

  for (const mutate of [
    (row) => { row.source.source_set_name = "drifted"; },
    (row) => { row.source.source_set_code = "DRIFT"; },
    (row) => { row.source.source_id = "drifted_source"; },
    (row) => { row.identity_model = "drifted"; },
  ]) {
    const drifted = structuredClone(expected);
    mutate(drifted);
    assert.deepEqual(setReadbackFindings(
      [expected],
      [drifted],
      COLLECTIBLE_WAVE1_GAMES.map((game) => ({ ...game })),
      controls,
      0,
    ), [`selected_set_row_mismatch:${expected.id}`]);
  }

  for (const field of ["name", "slug"]) {
    const games = COLLECTIBLE_WAVE1_GAMES.map((game) => ({ ...game }));
    games[0][field] = "drifted";
    assert.deepEqual(setReadbackFindings(
      [expected],
      [structuredClone(expected)],
      games,
      controls,
      0,
    ), ["game_foundations_mismatch"]);
  }
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

test("the permanent checkpoint is bound to the reconciled default-branch artifact", () => {
  const auditRoot = path.join(
    ROOT,
    "docs/audits/catalog_discovery/collectible_wave1_card_identity_proposal_v1",
  );
  const preserved = JSON.parse(fs.readFileSync(path.join(
    auditRoot,
    "preserved_artifact_hashes.json",
  ), "utf8"));
  assert.deepEqual(preserved, {
    algorithm: "sha256",
    artifacts: [
      {
        path: "database_readback.json",
        bytes: 451,
        sha256: "ffce972021185f0cd60581c59054a4673b4892e36a77518eef8bdcf658972789",
      },
      {
        path: "provenance.json",
        bytes: 813,
        sha256: "fb357d791c13ce38663856cdb4e6acedbb78a3d4492056d64bcb7b19cd1098c5",
      },
      {
        path: "remote_artifact_hashes.json",
        bytes: 1484,
        sha256: "59407526c003a9e1a37d6241cf3563458433ea1e0e7ffc7a80bf0f86a8692542",
      },
      {
        path: "REPORT.md",
        bytes: 789,
        sha256: "43c0e8d670e90b61b30e9466cf185772592d63103b5905abbd3b28038bd78ea6",
      },
      {
        path: "run_plan.json",
        bytes: 3944,
        sha256: "02e72c591aa077d81c500153d3322ae05a6963fd59e5360caada75a439e5ee41",
      },
      {
        path: "summary.json",
        bytes: 2194,
        sha256: "814e61e1589b4b05e24dd5366475ab65cba5bd7770a09bbeba061cc48f538107",
      },
    ],
  });
  for (const artifact of preserved.artifacts) {
    const bytes = fs.readFileSync(path.join(auditRoot, artifact.path));
    assert.equal(bytes.length, artifact.bytes);
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      artifact.sha256,
    );
  }

  const summary = JSON.parse(fs.readFileSync(path.join(auditRoot, "summary.json"), "utf8"));
  const provenance = JSON.parse(fs.readFileSync(path.join(
    auditRoot,
    "provenance.json",
  ), "utf8"));
  assert.equal(summary.actual_head_sha, provenance.producer_sha);
  assert.equal(summary.proposal_fingerprint_sha256, provenance.proposal_fingerprint_sha256);
  assert.equal(summary.metrics.selected_candidate_count, 46259);
  assert.equal(summary.metrics.candidate_reconciliation_mismatch_count, 0);
  assert.equal(summary.database_readback.database_writes, false);
  assert.equal(summary.database_readback.transaction_ended_with, "rollback");
  assert.equal(provenance.workflow_run_id, 33239106476);
  assert.equal(provenance.remote_artifact_hash_mismatch_count, 0);
});
