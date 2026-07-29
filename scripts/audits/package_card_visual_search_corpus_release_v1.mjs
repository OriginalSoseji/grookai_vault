import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COMPLETE_REBUILD = process.argv.includes("--complete-rebuild");

export const RELEASE_VERSION = COMPLETE_REBUILD
  ? "CARD_VISUAL_SEARCH_CORPUS_RELEASE_V1_1"
  : "CARD_VISUAL_SEARCH_CORPUS_RELEASE_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const SOURCE_ROOT = "C:\\grookai_vault_card_desc_agent";
const RELEASE_ID = COMPLETE_REBUILD
  ? "card_visual_search_corpus_release_v1_1_20260721"
  : "card_visual_search_corpus_release_v1_20260721";
const RELEASE_ROOT = path.join("C:\\grookai_visual_search_releases", RELEASE_ID);
const AUDIT_DIR = path.join(
  REPO_ROOT,
  COMPLETE_REBUILD
    ? "docs/audits/card_visual_search_corpus_release_v1_1/2026-07-29_complete_rebuild_release_20260721"
    : "docs/audits/card_visual_search_corpus_release_v1/2026-07-29_release_20260721",
);
const REPO_MANIFEST_PATH = path.join(
  REPO_ROOT,
  COMPLETE_REBUILD
    ? "docs/manifests/card_visual_search_corpus_release_v1_1.json"
    : "docs/manifests/card_visual_search_corpus_release_v1.json",
);
const EXPECTED_PRODUCT_BRANCH = "feature/visual-search-v1-productization";
const EXPECTED_PRODUCT_SHA = "6848df94cb189932a072794c7d85e52a77fac3a8";
const EXPECTED_SOURCE_BRANCH = "feature/card-visual-search-review-portal";
const EXPECTED_SOURCE_SHA = "c5bbbba5dea998fcd51d0d8602601737356a1494";

const stages = [
  {
    stage: "corpus",
    relative_dir:
      "docs/audits/card_visual_corpus_v1/2026-07-21T15-51-01-795Z_inventory_3f72560c3b04",
    reconciliation_file: "CORPUS_SOURCE_RECONCILIATION.json",
  },
  {
    stage: "eligibility",
    relative_dir:
      "docs/audits/card_visual_search_eligibility_v1_4/2026-07-21T16-32-41-129Z_eligibility_a206881f5a0b",
    reconciliation_file: "ELIGIBILITY_RECONCILIATION.json",
  },
  {
    stage: "grouping",
    relative_dir:
      "docs/audits/card_visual_artwork_grouping_v1_1/2026-07-21T16-45-14-932Z_grouping_424dbd1f2469",
    reconciliation_file: "ARTWORK_GROUPING_RECONCILIATION.json",
  },
  {
    stage: "projection",
    relative_dir:
      "docs/audits/card_visual_search_projection_v1_5/2026-07-21T17-23-42-102Z_projection_c3e708b1cd15",
    reconciliation_file: "PROJECTION_RECONCILIATION.json",
  },
  {
    stage: "bootstrap",
    relative_dir:
      "docs/audits/card_visual_search_evaluation_bootstrap_v1/2026-07-21T17-51-47-805Z_bootstrap_4548a65b9be3",
    reconciliation_file: "BOOTSTRAP_EVALUATION_REPORT.json",
  },
];

function runGit(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function posixPath(value) {
  return value.replaceAll("\\", "/");
}

async function listFiles(directory) {
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function verifyGitBoundaries() {
  const productBranch = runGit(REPO_ROOT, ["branch", "--show-current"]);
  const productSha = runGit(REPO_ROOT, ["rev-parse", "HEAD"]);
  const sourceBranch = runGit(SOURCE_ROOT, ["branch", "--show-current"]);
  const sourceSha = runGit(SOURCE_ROOT, ["rev-parse", "HEAD"]);
  const sourceStatus = runGit(SOURCE_ROOT, ["status", "--porcelain"]);

  if (productBranch !== EXPECTED_PRODUCT_BRANCH || productSha !== EXPECTED_PRODUCT_SHA) {
    throw new Error(`Unexpected productization boundary: ${productBranch}@${productSha}`);
  }
  if (sourceBranch !== EXPECTED_SOURCE_BRANCH || sourceSha !== EXPECTED_SOURCE_SHA) {
    throw new Error(`Unexpected source boundary: ${sourceBranch}@${sourceSha}`);
  }
  if (sourceStatus) throw new Error("Governed source worktree has tracked or visible untracked changes");

  return { productBranch, productSha, sourceBranch, sourceSha };
}

function semanticCounts(reconciliations) {
  return {
    source_rows: reconciliations.corpus.reconciliation.counts.source_rows_total,
    valid_fact_graphs: reconciliations.corpus.reconciliation.counts.valid_rows_total,
    source_gaps: reconciliations.corpus.reconciliation.counts.coverage_gaps_total,
    search_eligible_printings: reconciliations.eligibility.counts.search_eligible,
    tier_a: reconciliations.eligibility.counts.tier_a,
    tier_b: reconciliations.eligibility.counts.tier_b,
    tier_c: reconciliations.eligibility.counts.tier_c,
    artwork_groups:
      reconciliations.grouping.reconciliation.counts.artwork_groups,
    artwork_memberships:
      reconciliations.grouping.reconciliation.counts.memberships,
    projection_documents:
      reconciliations.projection.reconciliation.counts.documents,
    concept_evidence_entries:
      reconciliations.projection.reconciliation.counts.evidence_entries,
    projection_exclusions:
      reconciliations.projection.reconciliation.counts.exclusions,
    projection_failures:
      reconciliations.projection.reconciliation.counts.projection_failures,
    calibration_queries: reconciliations.bootstrap.metrics.calibration_queries,
    sealed_holdout_queries:
      reconciliations.bootstrap.query_suite.split_distribution.holdout,
    holdout_executed:
      reconciliations.bootstrap.run_plan.boundaries.holdout_execution,
    indexed_entries:
      reconciliations.bootstrap.metrics.candidate_index.indexed_entries,
  };
}

async function collectReleaseFiles() {
  const filesByPath = new Map();
  const reconciliations = {};

  for (const stage of stages) {
    const stageRoot = path.join(SOURCE_ROOT, stage.relative_dir);
    const stageFiles = await listFiles(stageRoot);
    const reconciliationPath = path.join(stageRoot, stage.reconciliation_file);
    reconciliations[stage.stage] = JSON.parse(
      await fsp.readFile(reconciliationPath, "utf8"),
    );

    for (const sourcePath of stageFiles) {
      const relativePath = posixPath(path.relative(SOURCE_ROOT, sourcePath));
      const stats = await fsp.stat(sourcePath);
      filesByPath.set(relativePath, {
        stage: stage.stage,
        relative_path: relativePath,
        bytes: stats.size,
        sha256: await sha256File(sourcePath),
      });
    }
  }

  if (COMPLETE_REBUILD) {
    const candidatesPath = path.join(
      SOURCE_ROOT,
      stages.find((stage) => stage.stage === "corpus").relative_dir,
      "corpus_valid_candidates.jsonl",
    );
    const candidates = (await fsp.readFile(candidatesPath, "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    const sourcePaths = [
      ...new Set(candidates.map((candidate) => candidate.source_artifact_path)),
    ].sort();

    for (const relativePath of sourcePaths) {
      const normalizedPath = posixPath(relativePath);
      if (filesByPath.has(normalizedPath)) continue;
      const sourcePath = path.join(SOURCE_ROOT, normalizedPath);
      const stats = await fsp.stat(sourcePath);
      filesByPath.set(normalizedPath, {
        stage: "authoritative_payload",
        relative_path: normalizedPath,
        bytes: stats.size,
        sha256: await sha256File(sourcePath),
      });
    }
  }

  const files = [...filesByPath.values()];
  files.sort((left, right) => left.relative_path.localeCompare(right.relative_path));
  return { files, reconciliations };
}

async function buildPlan() {
  const git = verifyGitBoundaries();
  const collected = await collectReleaseFiles();
  const expectedFileCount = COMPLETE_REBUILD ? 9_418 : 41;
  if (collected.files.length !== expectedFileCount) {
    throw new Error(
      `Expected ${expectedFileCount} release files, received ${collected.files.length}`,
    );
  }

  const payload = {
    release_version: RELEASE_VERSION,
    release_id: RELEASE_ID,
    release_profile: COMPLETE_REBUILD ? "complete_rebuild" : "operational_index",
    planned_on: "2026-07-29",
    productization_branch: git.productBranch,
    productization_pre_release_sha: git.productSha,
    governed_source_branch: git.sourceBranch,
    governed_source_sha: git.sourceSha,
    source_root: SOURCE_ROOT,
    release_root: RELEASE_ROOT,
    stages,
    file_count: collected.files.length,
    total_bytes: collected.files.reduce((sum, file) => sum + file.bytes, 0),
    semantic_counts: semanticCounts(collected.reconciliations),
    files: collected.files,
    boundaries: {
      git_bulk_evidence_commit: false,
      provider_calls: false,
      database_connection: false,
      database_writes: false,
      embeddings: false,
      holdout_execution: false,
      public_search_activation: false,
      pricing_changes: false,
    },
  };
  const plan = { ...payload, plan_payload_sha256: sha256Json(payload) };
  await fsp.mkdir(AUDIT_DIR, { recursive: true });
  await fsp.writeFile(
    path.join(AUDIT_DIR, "release_plan.json"),
    `${JSON.stringify(plan, null, 2)}\n`,
    "utf8",
  );
  return plan;
}

async function loadPlan() {
  const plan = JSON.parse(
    await fsp.readFile(path.join(AUDIT_DIR, "release_plan.json"), "utf8"),
  );
  const { plan_payload_sha256: actualHash, ...payload } = plan;
  if (actualHash !== sha256Json(payload)) throw new Error("Release plan hash mismatch");
  if (plan.productization_pre_release_sha !== EXPECTED_PRODUCT_SHA) {
    throw new Error("Release plan uses the wrong productization SHA");
  }
  return plan;
}

async function applyRelease() {
  verifyGitBoundaries();
  const plan = await loadPlan();
  const outcomes = [];

  for (const file of plan.files) {
    const sourcePath = path.join(SOURCE_ROOT, file.relative_path);
    const destinationPath = path.join(RELEASE_ROOT, file.relative_path);
    const currentSourceHash = await sha256File(sourcePath);
    if (currentSourceHash !== file.sha256) {
      throw new Error(`Source changed after planning: ${file.relative_path}`);
    }
    await fsp.mkdir(path.dirname(destinationPath), { recursive: true });
    await fsp.copyFile(sourcePath, destinationPath);
    const destinationHash = await sha256File(destinationPath);
    outcomes.push({
      relative_path: file.relative_path,
      expected_sha256: file.sha256,
      destination_sha256: destinationHash,
      hash_match: destinationHash === file.sha256,
      bytes: file.bytes,
    });
  }

  const mismatches = outcomes.filter((outcome) => !outcome.hash_match);
  const manifestPayload = {
    release_version: plan.release_version,
    release_id: plan.release_id,
    created_on: "2026-07-29",
    governed_source_branch: plan.governed_source_branch,
    governed_source_sha: plan.governed_source_sha,
    productization_pre_release_sha: plan.productization_pre_release_sha,
    release_root: plan.release_root,
    stage_count: plan.stages.length,
    file_count: plan.file_count,
    total_bytes: plan.total_bytes,
    semantic_counts: plan.semantic_counts,
    files: plan.files,
  };
  const releaseManifest = {
    ...manifestPayload,
    release_manifest_payload_sha256: sha256Json(manifestPayload),
  };
  const reconciliationPayload = {
    reconciliation_version: COMPLETE_REBUILD
      ? "CARD_VISUAL_SEARCH_CORPUS_RELEASE_RECONCILIATION_V1_1"
      : "CARD_VISUAL_SEARCH_CORPUS_RELEASE_RECONCILIATION_V1",
    release_id: plan.release_id,
    release_plan_payload_sha256: plan.plan_payload_sha256,
    release_manifest_payload_sha256:
      releaseManifest.release_manifest_payload_sha256,
    planned_files: plan.file_count,
    copied_files: outcomes.length,
    matching_files: outcomes.length - mismatches.length,
    missing_files: plan.file_count - outcomes.length,
    mismatched_files: mismatches.length,
    extra_files: 0,
    copied_bytes: outcomes.reduce((sum, outcome) => sum + outcome.bytes, 0),
    status:
      outcomes.length === plan.file_count && mismatches.length === 0
        ? "reconciled"
        : "failed",
    outcomes,
  };
  const reconciliation = {
    ...reconciliationPayload,
    reconciliation_payload_sha256: sha256Json(reconciliationPayload),
  };

  await fsp.mkdir(path.dirname(REPO_MANIFEST_PATH), { recursive: true });
  await fsp.writeFile(
    REPO_MANIFEST_PATH,
    `${JSON.stringify(releaseManifest, null, 2)}\n`,
    "utf8",
  );
  await fsp.mkdir(path.join(RELEASE_ROOT, "_release"), { recursive: true });
  await fsp.writeFile(
    path.join(RELEASE_ROOT, "_release", "release_manifest.json"),
    `${JSON.stringify(releaseManifest, null, 2)}\n`,
    "utf8",
  );
  await fsp.writeFile(
    path.join(RELEASE_ROOT, "_release", "release_reconciliation.json"),
    `${JSON.stringify(reconciliation, null, 2)}\n`,
    "utf8",
  );
  await fsp.writeFile(
    path.join(AUDIT_DIR, "release_reconciliation.json"),
    `${JSON.stringify(reconciliation, null, 2)}\n`,
    "utf8",
  );

  if (reconciliation.status !== "reconciled") {
    throw new Error("Corpus release did not reconcile");
  }
  return { releaseManifest, reconciliation };
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  if (process.argv.includes("--apply")) {
    const result = await applyRelease();
    console.log(
      JSON.stringify(
        {
          mode: "apply",
          release_root: RELEASE_ROOT,
          status: result.reconciliation.status,
          files: result.reconciliation.copied_files,
          bytes: result.reconciliation.copied_bytes,
          release_manifest_payload_sha256:
            result.releaseManifest.release_manifest_payload_sha256,
          reconciliation_payload_sha256:
            result.reconciliation.reconciliation_payload_sha256,
        },
        null,
        2,
      ),
    );
  } else {
    const plan = await buildPlan();
    console.log(
      JSON.stringify(
        {
          mode: "plan",
          files: plan.file_count,
          bytes: plan.total_bytes,
          release_root: plan.release_root,
          plan_payload_sha256: plan.plan_payload_sha256,
        },
        null,
        2,
      ),
    );
  }
}
