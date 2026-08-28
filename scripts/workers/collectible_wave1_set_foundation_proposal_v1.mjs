import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
  COLLECTIBLE_WAVE1_SET_MANIFEST_SHA256,
  buildCollectibleWave1SetFoundationProposalV1,
  normalizeCollectibleWave1SetManifestsV1,
} from "../../backend/catalog/collectible_wave1_set_foundation_proposal_v1.mjs";

const FROZEN_INPUTS = Object.freeze({
  parser: Object.freeze({
    workflow_run_id: "33118951166",
    artifact_id: "9665669509",
    head_sha: "90afb4b7f33ff5b37c8c2183889bccae486b734b",
    candidate_count: 46259,
    candidate_sha256: "30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f",
    artifacts: Object.freeze([
      Object.freeze({ path: "candidate_index.jsonl", bytes: 56865223,
        sha256: "30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f" }),
      Object.freeze({ path: "completeness_report.json", bytes: 1310,
        sha256: "30bdaff50d82af573780ab445ed700e3335c77ce160012fb543d278b3aade4e8" }),
      Object.freeze({ path: "run_plan.json", bytes: 1398,
        sha256: "4344592f7ea620019c3b9e4bc7a1933bf5ba72134ab2673479d77d5871ca778e" }),
      Object.freeze({ path: "source_snapshots.json", bytes: 3013,
        sha256: "1fe6c4f871579ae9af86feca1ea7ca4cfd0858b527cf8d5875af1bc4bda8b573" }),
      Object.freeze({ path: "summary.json", bytes: 762,
        sha256: "4d71ad8786528c64ac29f6e038566565ffdb15d5aa21671db30be96e49cbe609" }),
      Object.freeze({ path: "validation_failures.jsonl", bytes: 0,
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }),
    ]),
  }),
  alternative_artwork: Object.freeze({
    workflow_run_id: "33132457407",
    artifact_id: "9670781463",
    head_sha: "23c6bb77941916f4bbcfd3b1f703fa0a1b7700e8",
    candidate_sha256: "fd74d6fa88158338b7b3a619243c3419fb697828b0240458ee254489a644089f",
    index_sha256: "ac33edbe569b8a1bb020366780182c4d3f293291fde46a10d8f76b257cbacddf",
    artifacts: Object.freeze([
      Object.freeze({ path: "alternative_artwork_index.jsonl", bytes: 175038,
        sha256: "ac33edbe569b8a1bb020366780182c4d3f293291fde46a10d8f76b257cbacddf" }),
      Object.freeze({ path: "candidate_index.jsonl", bytes: 54804853,
        sha256: "fd74d6fa88158338b7b3a619243c3419fb697828b0240458ee254489a644089f" }),
      Object.freeze({ path: "completeness_report.json", bytes: 1176,
        sha256: "c22f6f57a326aa10419420293c80e4243f5f4c8a6547fcd028e9130b932028ce" }),
      Object.freeze({ path: "run_plan.json", bytes: 1417,
        sha256: "8052f74285c2ea04ae50eee5782e57b152f8bcae8b38f355a3ecf2de3352ecca" }),
      Object.freeze({ path: "source_snapshots.json", bytes: 1487,
        sha256: "55a6ee7260dd22dea51de25de7b659528780e62843f3f789b2ba67ffb2854cfc" }),
      Object.freeze({ path: "summary.json", bytes: 841,
        sha256: "6890b0823da5ad841df75f7a3a74d2119864f7b8dd0766872a93bfc8a3347516" }),
      Object.freeze({ path: "validation_failures.jsonl", bytes: 0,
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }),
    ]),
  }),
  manifests: COLLECTIBLE_WAVE1_SET_MANIFEST_SHA256,
});

const EXPECTED_LIVE_METRICS = Object.freeze({
  selected_candidate_count: 46259,
  assigned_candidate_count: 46257,
  candidate_source_gap_count: 2,
  manifest_set_count: 1056,
  manifest_set_counts_by_game: Object.freeze({ gundam: 24, yugioh: 1032 }),
  proposal_status_counts: Object.freeze({
    candidate_name_conflict: 19,
    "language_marker_conflicts_with_parser_en+shared_source_code": 13,
    manifest_without_candidates: 2,
    "manifest_without_candidates+shared_source_code": 3,
    review_ready: 505,
    shared_source_code: 514,
  }),
  manifest_source_gap_count: 5,
  source_gap_count: 7,
  set_code_collision_count: 142,
  collision_relationship_counts: Object.freeze({
    disjoint_collector_namespaces: 87,
    insufficient_candidates: 3,
    overlapping_collector_namespaces: 52,
  }),
  candidate_set_conflict_count: 32,
  candidate_only_set_coordinate_count: 1,
  alternative_artwork_row_count: 124,
  alternative_artwork_candidate_reference_count: 1679,
  alternative_artwork_set_candidate_reference_count: 1266,
  alternative_artwork_missing_candidate_reference_count: 0,
  alternative_artwork_unmapped_manifest_candidate_count: 0,
});

const BOUNDARIES = Object.freeze({
  database_access: false,
  database_writes: false,
  storage_access: false,
  storage_writes: false,
  image_downloads: false,
  image_url_persistence: false,
  source_body_persistence: false,
  canonical_writes: false,
  pricing_writes: false,
  publication_writes: false,
  vault_writes: false,
  writer_dispatches: false,
});

const PARSER_ARTIFACTS = Object.freeze([
  "run_plan.json",
  "candidate_index.jsonl",
  "validation_failures.jsonl",
  "source_snapshots.json",
  "completeness_report.json",
  "summary.json",
]);
const ALT_ART_ARTIFACTS = Object.freeze([
  "run_plan.json",
  "candidate_index.jsonl",
  "alternative_artwork_index.jsonl",
  "validation_failures.jsonl",
  "source_snapshots.json",
  "completeness_report.json",
  "summary.json",
]);
const OUTPUT_JSONL = Object.freeze({
  setCandidates: "set_candidates.jsonl",
  candidateSetAssignments: "candidate_set_assignments.jsonl",
  setCodeCollisions: "set_code_collisions.jsonl",
  candidateSetConflicts: "candidate_set_conflicts.jsonl",
  candidateOnlySetCoordinates: "candidate_only_set_coordinates.jsonl",
  alternativeArtworkSetOverlays: "alternative_artwork_set_overlays.jsonl",
  sourceGaps: "source_gaps.jsonl",
});

function parseArgs(argv) {
  const options = {
    altArtArtifactDir: null,
    expectedHeadSha: process.env.GITHUB_SHA ?? null,
    fixtureMode: false,
    gundamSetManifest: null,
    outDir: null,
    parserArtifactDir: null,
    yugiohSetManifest: null,
  };
  for (const token of argv) {
    if (token.startsWith("--alt-art-artifact-dir=")) {
      options.altArtArtifactDir = path.resolve(token.slice("--alt-art-artifact-dir=".length));
    } else if (token.startsWith("--expected-head-sha=")) {
      options.expectedHeadSha = token.slice("--expected-head-sha=".length);
    } else if (token === "--fixture-mode") {
      options.fixtureMode = true;
    } else if (token.startsWith("--gundam-set-manifest=")) {
      options.gundamSetManifest = path.resolve(token.slice("--gundam-set-manifest=".length));
    } else if (token.startsWith("--out-dir=")) {
      options.outDir = path.resolve(token.slice("--out-dir=".length));
    } else if (token.startsWith("--parser-artifact-dir=")) {
      options.parserArtifactDir = path.resolve(token.slice("--parser-artifact-dir=".length));
    } else if (token.startsWith("--yugioh-set-manifest=")) {
      options.yugiohSetManifest = path.resolve(token.slice("--yugioh-set-manifest=".length));
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  for (const [field, flag] of [
    ["altArtArtifactDir", "--alt-art-artifact-dir"],
    ["gundamSetManifest", "--gundam-set-manifest"],
    ["outDir", "--out-dir"],
    ["parserArtifactDir", "--parser-artifact-dir"],
    ["yugiohSetManifest", "--yugioh-set-manifest"],
  ]) {
    if (!options[field]) throw new Error(`${flag} is required`);
  }
  if (options.expectedHeadSha && !/^[0-9a-f]{40}$/.test(options.expectedHeadSha)) {
    throw new Error("--expected-head-sha must be a lowercase 40-character SHA");
  }
  if (options.fixtureMode && process.env.NODE_ENV !== "test") {
    throw new Error("--fixture-mode is restricted to NODE_ENV=test");
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((field) =>
      `${JSON.stringify(field)}:${stableJson(value[field])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function currentHeadSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function readJsonl(file) {
  const body = await fs.readFile(file, "utf8");
  return body.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
}

async function writeBytes(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return bytes;
}

async function writeJson(file, value) {
  return writeBytes(file, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

async function writeJsonl(file, rows) {
  const body = rows.length === 0 ? "" : `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  return writeBytes(file, Buffer.from(body));
}

async function verifyArtifactDirectory(directory, requiredPaths) {
  const manifest = await readJson(path.join(directory, "artifact_hashes.json"));
  if (manifest?.algorithm !== "sha256" || !Array.isArray(manifest?.artifacts)) {
    throw new Error("input artifact hash manifest is malformed");
  }
  const actualPaths = manifest.artifacts.map((row) => row.path).sort();
  const expectedPaths = [...requiredPaths].sort();
  if (stableJson(actualPaths) !== stableJson(expectedPaths)) {
    throw new Error("input artifact manifest does not contain the exact required path set");
  }
  const verified = [];
  for (const artifact of manifest.artifacts) {
    if (!/^[0-9a-f]{64}$/.test(artifact?.sha256 ?? "") ||
        !Number.isInteger(artifact?.bytes) || artifact.bytes < 0) {
      throw new Error(`input artifact manifest row is malformed: ${artifact?.path}`);
    }
    const bytes = await fs.readFile(path.join(directory, artifact.path));
    const actualSha = sha256(bytes);
    if (actualSha !== artifact.sha256 || bytes.length !== artifact.bytes) {
      throw new Error(`input artifact mismatch: ${artifact.path}`);
    }
    verified.push({ path: artifact.path, bytes: bytes.length, sha256: actualSha });
  }
  return verified.sort((left, right) => left.path.localeCompare(right.path));
}

function artifactByPath(verified, artifactPath) {
  const artifact = verified.find((row) => row.path === artifactPath);
  if (!artifact) throw new Error(`verified artifact is missing ${artifactPath}`);
  return artifact;
}

async function verifyInputs(options) {
  const parserArtifacts = await verifyArtifactDirectory(
    options.parserArtifactDir,
    PARSER_ARTIFACTS,
  );
  const altArtArtifacts = await verifyArtifactDirectory(
    options.altArtArtifactDir,
    ALT_ART_ARTIFACTS,
  );
  const parserPlan = await readJson(path.join(options.parserArtifactDir, "run_plan.json"));
  const parserSummary = await readJson(path.join(options.parserArtifactDir, "summary.json"));
  const altArtPlan = await readJson(path.join(options.altArtArtifactDir, "run_plan.json"));
  const altArtSummary = await readJson(path.join(options.altArtArtifactDir, "summary.json"));
  const manifestBytes = {
    yugioh_ygoprodeck_api_v7: await fs.readFile(options.yugiohSetManifest),
    gundam_gcg_api_v1: await fs.readFile(options.gundamSetManifest),
  };
  const manifestSha256 = Object.fromEntries(Object.entries(manifestBytes)
    .map(([sourceId, bytes]) => [sourceId, sha256(bytes)]));

  if (parserSummary?.validation_failure_count !== 0 || parserSummary?.failed_source_count !== 0 ||
      altArtSummary?.validation_failure_count !== 0 || altArtSummary?.failed_source_count !== 0) {
    throw new Error("frozen parser artifacts contain failures");
  }
  if (parserPlan?.mode !== "shadow-only" || parserSummary?.mode !== "shadow-only" ||
      altArtPlan?.mode !== "shadow-only" || altArtSummary?.mode !== "shadow-only") {
    throw new Error("input artifacts are outside shadow-only mode");
  }
  if (Object.values(parserSummary?.boundaries ?? {}).some((value) => value !== false) ||
      Object.values(altArtSummary?.boundaries ?? {}).some((value) => value !== false)) {
    throw new Error("input artifact production boundary was not closed");
  }
  if (!options.fixtureMode) {
    const parserCandidate = artifactByPath(parserArtifacts, "candidate_index.jsonl");
    const altCandidate = artifactByPath(altArtArtifacts, "candidate_index.jsonl");
    const altIndex = artifactByPath(altArtArtifacts, "alternative_artwork_index.jsonl");
    if (parserPlan.actual_head_sha !== FROZEN_INPUTS.parser.head_sha ||
        parserPlan.expected_head_sha !== FROZEN_INPUTS.parser.head_sha ||
        parserSummary.candidate_count !== FROZEN_INPUTS.parser.candidate_count ||
        parserCandidate.sha256 !== FROZEN_INPUTS.parser.candidate_sha256 ||
        altArtPlan.actual_head_sha !== FROZEN_INPUTS.alternative_artwork.head_sha ||
        altArtPlan.expected_head_sha !== FROZEN_INPUTS.alternative_artwork.head_sha ||
        altCandidate.sha256 !== FROZEN_INPUTS.alternative_artwork.candidate_sha256 ||
        altIndex.sha256 !== FROZEN_INPUTS.alternative_artwork.index_sha256 ||
        stableJson(parserArtifacts) !== stableJson(FROZEN_INPUTS.parser.artifacts) ||
        stableJson(altArtArtifacts) !==
          stableJson(FROZEN_INPUTS.alternative_artwork.artifacts) ||
        stableJson(manifestSha256) !== stableJson(FROZEN_INPUTS.manifests)) {
      throw new Error("proposal input does not match the frozen evidence tuple");
    }
  }
  return {
    altArtArtifacts,
    altArtPlan,
    altArtSummary,
    manifestBytes,
    manifestSha256,
    parserArtifacts,
    parserPlan,
    parserSummary,
  };
}

function assertNoPersistedSourceUrls(value, label) {
  const serialized = JSON.stringify(value);
  if (/https?:\/\//i.test(serialized)) {
    throw new Error(`${label} contains a source or image URL`);
  }
}

async function main() {
  if (process.env.CATALOG_AUTOMATION_MODE !== "shadow-only") {
    throw new Error("CATALOG_AUTOMATION_MODE=shadow-only is required");
  }
  const options = parseArgs(process.argv.slice(2));
  const headSha = currentHeadSha();
  if (options.expectedHeadSha && headSha !== options.expectedHeadSha) {
    throw new Error("checked-out commit does not match --expected-head-sha");
  }
  const inputs = await verifyInputs(options);
  const runPlan = {
    version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
    mode: "artifact-only",
    actual_head_sha: headSha,
    expected_head_sha: options.expectedHeadSha,
    fixture_mode: options.fixtureMode,
    inputs: {
      parser: {
        workflow_run_id: options.fixtureMode ? "fixture" : FROZEN_INPUTS.parser.workflow_run_id,
        artifact_id: options.fixtureMode ? "fixture" : FROZEN_INPUTS.parser.artifact_id,
        candidate_count: inputs.parserSummary.candidate_count,
        candidate_sha256: artifactByPath(
          inputs.parserArtifacts,
          "candidate_index.jsonl",
        ).sha256,
        verified_artifacts: inputs.parserArtifacts,
      },
      alternative_artwork: {
        workflow_run_id: options.fixtureMode
          ? "fixture"
          : FROZEN_INPUTS.alternative_artwork.workflow_run_id,
        artifact_id: options.fixtureMode ? "fixture" : FROZEN_INPUTS.alternative_artwork.artifact_id,
        index_sha256: artifactByPath(
          inputs.altArtArtifacts,
          "alternative_artwork_index.jsonl",
        ).sha256,
        verified_artifacts: inputs.altArtArtifacts,
      },
      set_manifests: inputs.manifestSha256,
    },
    mapping_policy: {
      yugioh: "exact_case_sensitive_source_set_name",
      gundam: "exact_source_set_code",
      shared_source_codes: "diagnostic_only_never_invent_or_merge",
      collector_namespace_signatures: "diagnostic_only",
      alternative_artwork: "join_only_never_assign_artwork_to_printing",
    },
    boundaries: BOUNDARIES,
  };
  assertNoPersistedSourceUrls(runPlan, "run plan");
  await writeJson(path.join(options.outDir, "run_plan.json"), runPlan);

  const candidates = await readJsonl(path.join(options.parserArtifactDir, "candidate_index.jsonl"));
  const alternativeArtworkRows = await readJsonl(
    path.join(options.altArtArtifactDir, "alternative_artwork_index.jsonl"),
  );
  const setRows = normalizeCollectibleWave1SetManifestsV1({
    yugiohManifest: JSON.parse(inputs.manifestBytes.yugioh_ygoprodeck_api_v7.toString("utf8")),
    gundamManifest: JSON.parse(inputs.manifestBytes.gundam_gcg_api_v1.toString("utf8")),
    manifestSha256: inputs.manifestSha256,
  });
  const proposal = buildCollectibleWave1SetFoundationProposalV1({
    candidates,
    setRows,
    alternativeArtworkRows,
  });
  if (!options.fixtureMode && stableJson(proposal.metrics) !== stableJson(EXPECTED_LIVE_METRICS)) {
    throw new Error("proposal metrics do not match the reviewed live evidence profile");
  }
  for (const [field, outputFile] of Object.entries(OUTPUT_JSONL)) {
    assertNoPersistedSourceUrls(proposal[field], outputFile);
    await writeJsonl(path.join(options.outDir, outputFile), proposal[field]);
  }
  await writeJsonl(path.join(options.outDir, "validation_failures.jsonl"), []);
  const summary = {
    version: COLLECTIBLE_WAVE1_SET_FOUNDATION_PROPOSAL_VERSION,
    mode: "artifact-only",
    status: "completed_with_review_rows",
    ...proposal.metrics,
    reconciled_candidate_count:
      proposal.metrics.assigned_candidate_count + proposal.metrics.candidate_source_gap_count,
    candidate_reconciliation_mismatch_count:
      proposal.metrics.selected_candidate_count -
      proposal.metrics.assigned_candidate_count -
      proposal.metrics.candidate_source_gap_count,
    validation_failure_count: 0,
    source_manifest_bodies_persisted: false,
    source_image_urls_persisted: false,
    secrets_recorded: false,
    boundaries: BOUNDARIES,
  };
  assertNoPersistedSourceUrls(summary, "summary");
  await writeJson(path.join(options.outDir, "summary.json"), summary);

  const artifactPaths = [
    "run_plan.json",
    ...Object.values(OUTPUT_JSONL),
    "validation_failures.jsonl",
    "summary.json",
  ].sort();
  const artifacts = [];
  for (const artifactPath of artifactPaths) {
    const bytes = await fs.readFile(path.join(options.outDir, artifactPath));
    artifacts.push({ path: artifactPath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await writeJson(path.join(options.outDir, "artifact_hashes.json"), {
    algorithm: "sha256",
    artifacts,
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(async (error) => {
    process.stderr.write(`${String(error?.stack ?? error)}\n`);
    process.exitCode = 1;
  });
}
