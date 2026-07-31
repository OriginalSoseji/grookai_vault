import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RECONCILIATION_VERSION =
  "CARD_VISUAL_SEARCH_PRODUCTIZATION_REBUILD_RECONCILIATION_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const RELEASE_ROOT =
  "C:\\grookai_visual_search_releases\\card_visual_search_corpus_release_v1_1_20260721";
const REBUILD_ROOT = path.join(
  RELEASE_ROOT,
  "_rebuild/productization_bbf20d0f",
);
const AUDIT_DIR = path.join(
  REPO_ROOT,
  "docs/audits/card_visual_search_productization_rebuild_v1/2026-07-29_bbf20d0f",
);
const EXPECTED_BRANCH = "feature/visual-search-v1-productization";
const EXPECTED_SHA = "bbf20d0f4a59e61c4d529f523de0a9721c964dd9";

const LOCKED_DIRS = Object.freeze({
  eligibility:
    "docs/audits/card_visual_search_eligibility_v1_4/2026-07-21T16-32-41-129Z_eligibility_a206881f5a0b",
  grouping:
    "docs/audits/card_visual_artwork_grouping_v1_1/2026-07-21T16-45-14-932Z_grouping_424dbd1f2469",
  projection:
    "docs/audits/card_visual_search_projection_v1_5/2026-07-21T17-23-42-102Z_projection_c3e708b1cd15",
  bootstrap:
    "docs/audits/card_visual_search_evaluation_bootstrap_v1/2026-07-21T17-51-47-805Z_bootstrap_4548a65b9be3",
});

const FILE_COMPARISONS = Object.freeze([
  ["eligibility", "eligibility_decisions.jsonl"],
  ["grouping", "artwork_groups.jsonl"],
  ["grouping", "artwork_group_memberships.jsonl"],
  ["projection", "visual_search_artworks.jsonl"],
  ["projection", "visual_search_documents.jsonl"],
  ["projection", "visual_search_concept_evidence.jsonl"],
  ["bootstrap", "query_suite.jsonl"],
  ["bootstrap", "evaluation_failures.jsonl"],
  ["bootstrap", "holdout_judgment_seals.jsonl"],
  ["bootstrap", "ranked_outputs.jsonl"],
]);

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256Json(value) {
  return sha256Buffer(Buffer.from(JSON.stringify(value)));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  return (await fs.readFile(filePath, "utf8"))
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function fileHash(filePath) {
  return sha256Buffer(await fs.readFile(filePath));
}

function lockedPath(stage, file) {
  return path.join(RELEASE_ROOT, LOCKED_DIRS[stage], file);
}

function rebuiltPath(stage, file) {
  return path.join(REBUILD_ROOT, stage, file);
}

function stageCounts(stage, report) {
  if (stage === "eligibility") {
    return {
      source_ids: report.counts.source_ids,
      tier_a: report.counts.tier_a,
      tier_b: report.counts.tier_b,
      tier_c: report.counts.tier_c,
      search_eligible: report.counts.search_eligible,
      energy_rows_eligible: report.counts.energy_rows_eligible,
    };
  }
  if (stage === "grouping") {
    return {
      eligible_rows: report.reconciliation.counts.eligible_rows,
      artwork_groups: report.reconciliation.counts.artwork_groups,
      memberships: report.reconciliation.counts.memberships,
      conflict_rows: report.reconciliation.counts.conflict_rows,
    };
  }
  if (stage === "projection") {
    return {
      projected_artworks: report.reconciliation.counts.projected_artworks,
      documents: report.reconciliation.counts.documents,
      evidence_entries: report.reconciliation.counts.evidence_entries,
      exclusions: report.reconciliation.counts.exclusions,
      projection_failures: report.reconciliation.counts.projection_failures,
    };
  }
  return {
    total_queries: report.query_suite.total_queries,
    calibration_queries: report.metrics.calibration_queries,
    holdout_queries: report.query_suite.split_distribution.holdout,
    holdout_executed: report.query_suite.holdout_executed,
    failure_count: report.metrics.failure_count,
    indexed_entries: report.metrics.candidate_index.indexed_entries,
  };
}

async function compareStageCounts() {
  const reports = {
    eligibility: "ELIGIBILITY_RECONCILIATION.json",
    grouping: "ARTWORK_GROUPING_RECONCILIATION.json",
    projection: "PROJECTION_RECONCILIATION.json",
    bootstrap: "BOOTSTRAP_EVALUATION_REPORT.json",
  };
  const comparisons = {};
  for (const [stage, reportFile] of Object.entries(reports)) {
    const locked = stageCounts(stage, await readJson(lockedPath(stage, reportFile)));
    const rebuilt = stageCounts(stage, await readJson(rebuiltPath(stage, reportFile)));
    comparisons[stage] = {
      locked,
      rebuilt,
      exact_match: JSON.stringify(locked) === JSON.stringify(rebuilt),
    };
  }
  return comparisons;
}

async function compareFiles() {
  const results = [];
  for (const [stage, file] of FILE_COMPARISONS) {
    const lockedSha256 = await fileHash(lockedPath(stage, file));
    const rebuiltSha256 = await fileHash(rebuiltPath(stage, file));
    results.push({
      stage,
      file,
      locked_sha256: lockedSha256,
      rebuilt_sha256: rebuiltSha256,
      byte_identical: lockedSha256 === rebuiltSha256,
    });
  }
  return results;
}

async function compareRankings() {
  const locked = await readJsonl(lockedPath("bootstrap", "ranked_outputs.jsonl"));
  const rebuilt = await readJsonl(rebuiltPath("bootstrap", "ranked_outputs.jsonl"));
  let topResultChanges = 0;
  let resultWindowChanges = 0;
  const totalMatchChanges = [];

  for (let index = 0; index < locked.length; index += 1) {
    const lockedRow = locked[index];
    const rebuiltRow = rebuilt[index];
    if (lockedRow.query_id !== rebuiltRow?.query_id) {
      throw new Error(`Ranking row identity mismatch at ordinal ${index}`);
    }
    const lockedIds = (lockedRow.results ?? []).map((row) => row.artwork_group_id);
    const rebuiltIds = (rebuiltRow.results ?? []).map((row) => row.artwork_group_id);
    if (lockedIds[0] !== rebuiltIds[0]) topResultChanges += 1;
    if (JSON.stringify(lockedIds) !== JSON.stringify(rebuiltIds)) {
      resultWindowChanges += 1;
    }
    if (lockedRow.total_matches !== rebuiltRow.total_matches) {
      totalMatchChanges.push({
        query_id: lockedRow.query_id,
        query_text: lockedRow.query_text,
        locked_total_matches: lockedRow.total_matches,
        rebuilt_total_matches: rebuiltRow.total_matches,
        delta: rebuiltRow.total_matches - lockedRow.total_matches,
        top_result_unchanged: lockedIds[0] === rebuiltIds[0],
      });
    }
  }

  return {
    compared_queries: locked.length,
    top_result_changes: topResultChanges,
    result_window_changes: resultWindowChanges,
    total_match_changes: totalMatchChanges.length,
    match_expansions: totalMatchChanges.filter((row) => row.delta > 0).length,
    match_reductions: totalMatchChanges.filter((row) => row.delta < 0).length,
    changes: totalMatchChanges,
    documented_cause: {
      source_commit: "b6aa1b053192a83572e37e2d64d46d2aabeb3d45",
      source_commit_subject: "fix: reject negated visual search evidence",
      classification: "post-bootstrap ranker hardening",
    },
  };
}

function markdown(report) {
  const stageRows = Object.entries(report.stage_counts)
    .map(
      ([stage, value]) =>
        `| ${stage} | ${value.exact_match ? "yes" : "no"} | \`${JSON.stringify(value.rebuilt)}\` |`,
    )
    .join("\n");
  const fileRows = report.file_comparisons
    .map(
      (row) =>
        `| ${row.stage}/${row.file} | ${row.byte_identical ? "yes" : "no"} | \`${row.rebuilt_sha256}\` |`,
    )
    .join("\n");

  return `# Visual Search V1 Productization Rebuild Reconciliation

Date: 2026-07-29

Status: \`${report.status}\`

Producing SHA: \`${report.producing_sha}\`

## Stage Counts

| Stage | Exact | Rebuilt counts |
| --- | --- | --- |
${stageRows}

## Semantic Files

| File | Byte-identical | Rebuilt SHA-256 |
| --- | --- | --- |
${fileRows}

## Ranker Reconciliation

- Queries compared: \`${report.ranking_comparison.compared_queries}\`
- Top-result changes: \`${report.ranking_comparison.top_result_changes}\`
- Result-window changes: \`${report.ranking_comparison.result_window_changes}\`
- Total-match changes: \`${report.ranking_comparison.total_match_changes}\`
- Match expansions: \`${report.ranking_comparison.match_expansions}\`
- Match reductions: \`${report.ranking_comparison.match_reductions}\`
- Failure classifications byte-identical: \`${report.acceptance.failure_classifications_identical}\`
- Cause: later governed hardening \`fix: reject negated visual search evidence\`

The locked bootstrap predates the negative-evidence hardening. The
productization replay is therefore stricter for eight queries. It introduces no
match expansions, changes no top result, and preserves the exact calibration
failure classifications.

## Boundaries

No provider call, database connection or write, approval, embedding, holdout
execution, public search activation, or pricing change occurred.
`;
}

async function main() {
  const branch = git(["branch", "--show-current"]);
  const sha = git(["rev-parse", "HEAD"]);
  const trackedStatus = git(["status", "--porcelain", "--untracked-files=no"]);
  if (branch !== EXPECTED_BRANCH || sha !== EXPECTED_SHA || trackedStatus) {
    throw new Error(`Unexpected productization boundary: ${branch}@${sha}`);
  }

  const stageCountsResult = await compareStageCounts();
  const fileComparisons = await compareFiles();
  const rankingComparison = await compareRankings();
  const failureComparison = fileComparisons.find(
    (row) => row.file === "evaluation_failures.jsonl",
  );
  const holdoutComparison = fileComparisons.find(
    (row) => row.file === "holdout_judgment_seals.jsonl",
  );
  const exactCoreFiles = fileComparisons.filter(
    (row) => row.file !== "ranked_outputs.jsonl",
  );
  const acceptance = {
    all_stage_counts_exact: Object.values(stageCountsResult).every(
      (row) => row.exact_match,
    ),
    core_semantic_files_identical: exactCoreFiles.every(
      (row) => row.byte_identical,
    ),
    failure_classifications_identical: failureComparison.byte_identical,
    holdout_seals_identical: holdoutComparison.byte_identical,
    top_result_changes_zero: rankingComparison.top_result_changes === 0,
    match_expansions_zero: rankingComparison.match_expansions === 0,
  };
  const accepted = Object.values(acceptance).every(Boolean);
  const payload = {
    reconciliation_version: RECONCILIATION_VERSION,
    created_on: "2026-07-29",
    status: accepted
      ? "reconciled_with_documented_ranker_hardening"
      : "failed",
    producing_branch: branch,
    producing_sha: sha,
    release_root: RELEASE_ROOT,
    rebuild_root: REBUILD_ROOT,
    stage_counts: stageCountsResult,
    file_comparisons: fileComparisons,
    ranking_comparison: rankingComparison,
    acceptance,
    boundaries: {
      provider_calls: false,
      database_connection: false,
      database_writes: false,
      approvals: false,
      embeddings: false,
      holdout_execution: false,
      public_search_activation: false,
      pricing_changes: false,
    },
  };
  const report = {
    ...payload,
    reconciliation_payload_sha256: sha256Json(payload),
  };

  await fs.mkdir(AUDIT_DIR, { recursive: true });
  const reportPath = path.join(AUDIT_DIR, "rebuild_reconciliation.json");
  const markdownPath = path.join(AUDIT_DIR, "rebuild_reconciliation.md");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(markdownPath, markdown(report));
  const artifactHashes = {
    hash_algorithm: "sha256",
    generated_on: "2026-07-29",
    artifacts: [
      {
        path: path.relative(REPO_ROOT, reportPath).replaceAll("\\", "/"),
        sha256: await fileHash(reportPath),
      },
      {
        path: path.relative(REPO_ROOT, markdownPath).replaceAll("\\", "/"),
        sha256: await fileHash(markdownPath),
      },
    ],
  };
  await fs.writeFile(
    path.join(AUDIT_DIR, "artifact_hashes.json"),
    `${JSON.stringify(artifactHashes, null, 2)}\n`,
  );
  if (!accepted) throw new Error("Productization rebuild did not reconcile");
  console.log(
    JSON.stringify(
      {
        status: report.status,
        producing_sha: sha,
        reconciliation_payload_sha256: report.reconciliation_payload_sha256,
        top_result_changes: rankingComparison.top_result_changes,
        match_expansions: rankingComparison.match_expansions,
        match_reductions: rankingComparison.match_reductions,
      },
      null,
      2,
    ),
  );
}

await main();
