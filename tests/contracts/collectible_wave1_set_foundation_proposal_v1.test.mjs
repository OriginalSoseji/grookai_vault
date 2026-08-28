import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
  COLLECTIBLE_WAVE1_SET_MANIFEST_SHA256,
  buildCollectibleWave1SetFoundationProposalV1,
  normalizeCollectibleWave1SetManifestsV1,
} from "../../backend/catalog/collectible_wave1_set_foundation_proposal_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PARSER_FIXTURES = path.join(
  ROOT,
  "tests",
  "fixtures",
  "collectible_shadow_parser_wave1",
);

function candidate({
  id,
  game = "yugioh",
  language = "en",
  setName = "Fixture Set Alpha",
  setCode = "FSA-EN001",
  number = setCode,
  sourceId = game === "yugioh"
    ? "yugioh_ygoprodeck_api_v7"
    : "gundam_gcg_api_v1",
} = {}) {
  const candidateId = id ?? `${game}:${setCode}`;
  return {
    shadow_candidate_id: candidateId,
    source_candidate_id: candidateId,
    source_evidence_sha256: "a".repeat(64),
    parser_version: "COLLECTIBLE_SHADOW_PARSER_WAVE1_V1",
    canonical_authority: false,
    candidate_source: { source_id: sourceId },
    identity_coordinates: {
      game,
      language,
      set_or_product: setName,
      set_code: setCode,
      collector_number: number,
    },
  };
}

function fixtureManifests() {
  return {
    yugiohManifest: [
      {
        set_name: "Fixture Set Alpha",
        set_code: "FSA",
        num_of_cards: 2,
        tcg_date: "2026-01-01",
        set_image: "https://images.invalid/FSA.jpg",
      },
      {
        set_name: "Fixture Set Alpha Preview",
        set_code: "FSA",
        num_of_cards: 1,
        tcg_date: "2025-12-20",
      },
      {
        set_name: "Fixture Set Alpha (POR)",
        set_code: "FSA",
        num_of_cards: 1,
        tcg_date: "2026-01-02",
      },
      {
        set_name: "Fixture Manifest Only",
        set_code: "FMO",
        num_of_cards: 1,
        tcg_date: "2026-02-01",
      },
    ],
    gundamManifest: {
      data: [{ set_code: "GX01", set_name: "Official Gundam Name", card_count: 2 }],
    },
  };
}

function normalizedFixtureSets() {
  return normalizeCollectibleWave1SetManifestsV1({
    ...fixtureManifests(),
    manifestSha256: {
      yugioh_ygoprodeck_api_v7: "b".repeat(64),
      gundam_gcg_api_v1: "c".repeat(64),
    },
  });
}

function altArtRow(candidateIds) {
  return {
    variant_evidence_version: "COLLECTIBLE_WAVE1_ALT_ART_ROW_ADDRESSABILITY_V1",
    variant_evidence_id: "yugioh_ygoprodeck_api_v7:fixture:alternative_artwork",
    source_id: "yugioh_ygoprodeck_api_v7",
    source_card_id: "fixture",
    source_evidence_sha256: "d".repeat(64),
    source_image_ids: ["fixture-1", "fixture-2"],
    source_image_count: 2,
    source_printing_candidate_ids: candidateIds,
    source_printing_candidate_count: candidateIds.length,
    mapping_status: "unresolved_artwork_to_printing",
    canonical_authority: false,
    write_authority: false,
  };
}

test("manifest normalization strips image URLs and never proposes canonical codes", () => {
  const rows = normalizedFixtureSets();
  assert.equal(rows.length, 5);
  assert.ok(rows.every((row) => row.canonical_code_proposed === false));
  assert.ok(rows.every((row) => row.canonical_authority === false));
  assert.ok(rows.every((row) => row.write_authority === false));
  assert.doesNotMatch(JSON.stringify(rows), /https?:\/\/|set_image|image_url/i);
  assert.equal(new Set(rows.map((row) => row.set_proposal_id)).size, rows.length);
});

test("Yu-Gi-Oh names remain case-sensitive and every candidate is reconciled once", () => {
  const candidates = [
    candidate({ id: "alpha", setName: "Fixture Set Alpha", setCode: "FSA-EN001" }),
    candidate({ id: "case-gap", setName: "Fixture Set alpha", setCode: "FSA-EN002" }),
  ];
  const proposal = buildCollectibleWave1SetFoundationProposalV1({
    candidates,
    setRows: normalizedFixtureSets(),
  });
  assert.equal(proposal.metrics.selected_candidate_count, 2);
  assert.equal(proposal.metrics.assigned_candidate_count, 1);
  assert.equal(proposal.metrics.candidate_source_gap_count, 1);
  assert.equal(proposal.candidateSetAssignments[0].shadow_candidate_id, "alpha");
  const gap = proposal.sourceGaps.find((row) => row.shadow_candidate_id === "case-gap");
  assert.equal(gap.gap_kind, "candidate_without_manifest");
  assert.deepEqual(gap.reason_codes, ["no_exact_source_set_name_manifest"]);
});

test("shared codes use collector namespace signatures as diagnostics only", () => {
  const candidates = [
    candidate({ id: "alpha-1", setName: "Fixture Set Alpha", setCode: "FSA-EN001" }),
    candidate({ id: "alpha-2", setName: "Fixture Set Alpha", setCode: "FSA-EN002" }),
    candidate({
      id: "preview",
      setName: "Fixture Set Alpha Preview",
      setCode: "FSA-EN000",
    }),
    candidate({
      id: "portuguese",
      setName: "Fixture Set Alpha (POR)",
      setCode: "FSA-PT001",
    }),
  ];
  const proposal = buildCollectibleWave1SetFoundationProposalV1({
    candidates,
    setRows: normalizedFixtureSets(),
  });
  assert.equal(proposal.setCodeCollisions.length, 1);
  assert.equal(
    proposal.setCodeCollisions[0].collector_namespace_relationship,
    "overlapping_collector_namespaces",
  );
  assert.equal(proposal.setCodeCollisions[0].canonical_code_proposed, false);
  const languageConflict = proposal.candidateSetConflicts.find((row) =>
    row.conflict_class === "language_marker_conflicts_with_parser_en");
  assert.deepEqual(languageConflict.observed_languages, ["en"]);
  assert.deepEqual(languageConflict.observed_collector_numbers, ["FSA-PT001"]);
});

test("Gundam maps by exact code and preserves candidate name conflicts", () => {
  const proposal = buildCollectibleWave1SetFoundationProposalV1({
    candidates: [candidate({
      id: "gundam-1",
      game: "gundam",
      setName: "Candidate Gundam Name",
      setCode: "GX01",
      number: "GX01-001",
    })],
    setRows: normalizedFixtureSets(),
  });
  assert.equal(proposal.candidateSetAssignments.length, 1);
  assert.equal(proposal.candidateSetAssignments[0].assignment_method, "exact_source_set_code");
  const conflict = proposal.candidateSetConflicts.find((row) =>
    row.conflict_class === "candidate_name_conflict");
  assert.equal(conflict.manifest_set_name, "Official Gundam Name");
  assert.deepEqual(conflict.observed_candidate_set_names, ["Candidate Gundam Name"]);
});

test("alternative artwork joins candidates to sets without assigning artwork ownership", () => {
  const candidates = [
    candidate({ id: "alpha-rare", setName: "Fixture Set Alpha", setCode: "FSA-EN001" }),
    candidate({ id: "alpha-ultra", setName: "Fixture Set Alpha", setCode: "FSA-EN001" }),
  ];
  const proposal = buildCollectibleWave1SetFoundationProposalV1({
    candidates,
    setRows: normalizedFixtureSets(),
    alternativeArtworkRows: [altArtRow(candidates.map((row) => row.shadow_candidate_id))],
  });
  const overlay = proposal.alternativeArtworkSetOverlays[0];
  assert.equal(overlay.source_printing_candidate_count, 2);
  assert.equal(overlay.set_candidate_reference_count, 1);
  assert.equal(overlay.artwork_to_printing_ownership_status, "unresolved");
  assert.equal(overlay.canonical_authority, false);
  assert.equal(overlay.write_authority, false);
  assert.throws(
    () => buildCollectibleWave1SetFoundationProposalV1({
      candidates,
      setRows: normalizedFixtureSets(),
      alternativeArtworkRows: [altArtRow(["missing-candidate"])],
    }),
    /references missing candidates/,
  );
});

test("invalid candidate and alternative-artwork evidence fails closed", () => {
  assert.throws(
    () => buildCollectibleWave1SetFoundationProposalV1({
      candidates: [candidate({ sourceId: "unexpected_source" })],
      setRows: normalizedFixtureSets(),
    }),
    /outside the frozen Wave 1 source boundary/,
  );
  const duplicateCount = altArtRow(["alpha"]);
  duplicateCount.source_printing_candidate_count = 2;
  assert.throws(
    () => buildCollectibleWave1SetFoundationProposalV1({
      candidates: [candidate({ id: "alpha" })],
      setRows: normalizedFixtureSets(),
      alternativeArtworkRows: [duplicateCount],
    }),
    /inconsistent counts or duplicates/,
  );
});

function hashArtifacts(directory, paths) {
  const artifacts = paths.map((artifactPath) => {
    const bytes = fs.readFileSync(path.join(directory, artifactPath));
    return {
      path: artifactPath,
      bytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    };
  });
  fs.writeFileSync(
    path.join(directory, "artifact_hashes.json"),
    `${JSON.stringify({ algorithm: "sha256", artifacts }, null, 2)}\n`,
  );
}

test("fixture CLI emits a complete artifact-only proposal with exact hashes", () => {
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const parserOut = fs.mkdtempSync(path.join(os.tmpdir(), "wave1-set-parser-"));
  const parserRun = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_shadow_parser_wave1_v1.mjs"),
    `--out-dir=${parserOut}`,
    `--expected-head-sha=${head}`,
    `--fixture-dir=${PARSER_FIXTURES}`,
    "--max-response-bytes=1048576",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.equal(parserRun.status, 0, parserRun.stderr);

  const altOut = fs.mkdtempSync(path.join(os.tmpdir(), "wave1-set-alt-"));
  const parserPaths = [
    "run_plan.json",
    "candidate_index.jsonl",
    "validation_failures.jsonl",
    "source_snapshots.json",
    "completeness_report.json",
    "summary.json",
  ];
  for (const file of parserPaths) fs.copyFileSync(path.join(parserOut, file), path.join(altOut, file));
  const parsedCandidates = fs.readFileSync(path.join(parserOut, "candidate_index.jsonl"), "utf8")
    .trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const yugiohIds = parsedCandidates.filter((row) =>
    row.identity_coordinates.game === "yugioh" &&
    row.identity_coordinates.set_or_product === "Fixture Set Alpha")
    .map((row) => row.shadow_candidate_id);
  fs.writeFileSync(
    path.join(altOut, "alternative_artwork_index.jsonl"),
    `${JSON.stringify(altArtRow(yugiohIds))}\n`,
  );
  hashArtifacts(altOut, [...parserPaths, "alternative_artwork_index.jsonl"]);

  const output = fs.mkdtempSync(path.join(os.tmpdir(), "wave1-set-proposal-"));
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_wave1_set_foundation_proposal_v1.mjs"),
    `--out-dir=${output}`,
    `--expected-head-sha=${head}`,
    `--parser-artifact-dir=${parserOut}`,
    `--alt-art-artifact-dir=${altOut}`,
    `--yugioh-set-manifest=${path.join(PARSER_FIXTURES, "yugioh_ygoprodeck_api_v7.sets.json")}`,
    `--gundam-set-manifest=${path.join(PARSER_FIXTURES, "gundam_gcg_api_v1.sets.json")}`,
    "--fixture-mode",
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      CATALOG_AUTOMATION_MODE: "shadow-only",
      NODE_ENV: "test",
    },
  });
  assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(fs.readFileSync(path.join(output, "summary.json"), "utf8"));
  assert.equal(summary.selected_candidate_count, 5);
  assert.equal(summary.assigned_candidate_count, 5);
  assert.equal(summary.candidate_reconciliation_mismatch_count, 0);
  assert.equal(summary.manifest_set_count, 4);
  assert.equal(summary.alternative_artwork_row_count, 1);
  assert.ok(Object.values(summary.boundaries).every((value) => value === false));
  const manifest = JSON.parse(fs.readFileSync(path.join(output, "artifact_hashes.json"), "utf8"));
  assert.equal(manifest.artifacts.length, 10);
  for (const artifact of manifest.artifacts) {
    const bytes = fs.readFileSync(path.join(output, artifact.path));
    assert.equal(bytes.length, artifact.bytes, artifact.path);
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      artifact.sha256,
      artifact.path,
    );
    assert.doesNotMatch(bytes.toString("utf8"), /https?:\/\//i, artifact.path);
  }
  const assignments = fs.readFileSync(
    path.join(output, "candidate_set_assignments.jsonl"),
    "utf8",
  ).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  assert.equal(new Set(assignments.map((row) => row.shadow_candidate_id)).size, 5);
});

test("worker and workflow have no production access or substitution path", () => {
  const worker = fs.readFileSync(path.join(
    ROOT,
    "scripts",
    "workers",
    "collectible_wave1_set_foundation_proposal_v1.mjs",
  ), "utf8");
  assert.match(worker, /33118951166/);
  assert.match(worker, /33132457407/);
  assert.match(worker, /30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f/);
  assert.match(worker, /ac33edbe569b8a1bb020366780182c4d3f293291fde46a10d8f76b257cbacddf/);
  assert.doesNotMatch(worker, /@supabase|\bpg\b|DATABASE_URL|SUPABASE_DB_URL|storage\.from/i);
  assert.doesNotMatch(worker, /(?:insert\s+into|update\s+\w+\s+set|delete\s+from|truncate)/i);

  const workflow = fs.readFileSync(path.join(
    ROOT,
    ".github",
    "workflows",
    "collectible-wave1-set-foundation-proposal.yml",
  ), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.match(workflow, /run-id:\s*"33118951166"/);
  assert.match(workflow, /run-id:\s*"33132457407"/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.doesNotMatch(workflow, /inputs\.|SUPABASE_DB_URL|DATABASE_URL|--apply|storage\.from/i);
});

test("frozen hashes and governing contract preserve the exact stop boundary", () => {
  assert.deepEqual(COLLECTIBLE_WAVE1_SET_MANIFEST_SHA256, {
    yugioh_ygoprodeck_api_v7:
      "16c47dcdceffe4ea0b221b75efaeace5d8bd9f888795f061369023ce8ed1c999",
    gundam_gcg_api_v1:
      "e3c7c641711ccbabc42c6c191bd7ca6c5715c74c669d78002bc1ad85c500a14e",
  });
  assert.equal(
    COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
    "COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_V1",
  );
  const contract = fs.readFileSync(path.join(
    ROOT,
    "docs",
    "contracts",
    "COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_V1.md",
  ), "utf8");
  assert.match(contract, /exact, case-sensitive source set name/);
  assert.match(contract, /shared code never causes source\s+sets to be merged/);
  assert.match(contract, /46,259 parser candidates/);
  assert.match(contract, /Stop after one exact-artifact proposal run/);
  assert.match(contract, /Do not\s+create or update sets/);
});
