import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertCardVisualCorpusBranchV1,
  sha256JsonV1,
} from "./card_visual_corpus_v1_inventory.mjs";
import { loadGovernedCollectorSearchEngineV1 } from "./card_visual_search_evaluation_bootstrap_v1.mjs";

export const CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_VERSION =
  "CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_V1";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_PROJECTION_DIR =
  "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721/_rebuild/unified_collector_search_v2/projection/2026-07-30T14-57-50-725Z_projection_f407659f4d99";
const DEFAULT_OUTPUT_ROOT =
  "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721/_rebuild/unified_collector_search_v2/high_risk_regression";
const DEFAULT_CAMEO_REFERENCE =
  "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721/_analysis/card_visual_cameo_reference_import_v1/2026-07-30T05-21-18-311Z_import_0f9c53c4c02e/canonical_matches.jsonl";
const DEFAULT_REVIEWED_EVIDENCE =
  "docs/evidence/card_visual_search_founder_reviews_v1.json";
const DEFAULT_EVIDENCE_SUPPRESSIONS =
  "docs/evidence/card_visual_search_founder_suppressions_v1.json";

const REGRESSIONS = Object.freeze([
  {
    regression_id: "independent_mimikyu_pikachu",
    query: "Mimikyu and pika",
    exact_matches: 0,
  },
  {
    regression_id: "pikachu_cookie_contrast",
    query: "Pikachu-shaped cookie, not Pikachu eating a cookie",
    minimum_matches: 1,
    required_gv_ids: ["GV-PK-ASC-094"],
    required_role: "character_representation",
  },
  {
    regression_id: "pikachu_plush_role",
    query: "Pikachu plush",
    minimum_matches: 1,
    required_gv_ids: ["GV-PK-FLF-93"],
    required_role: "character_representation",
    all_results_require_role: true,
  },
  {
    regression_id: "pikachu_poster_role",
    query: "Pikachu on a poster",
    minimum_matches: 1,
    required_gv_ids: ["GV-PK-CRZ-147"],
    required_role: "depicted_subject",
    all_results_require_role: true,
  },
  {
    regression_id: "unconfirmed_pikachu_pin",
    query: "Pikachu pin",
    exact_matches: 0,
  },
  {
    regression_id: "pokemon_holding_pokeball",
    query: "Pokemon holding a Poke Ball",
    minimum_matches: 1,
    required_gv_ids: ["GV-PK-BST-52"],
    required_evidence_authority: "bound_subject_object_relationship",
  },
  {
    regression_id: "three_or_more_pokemon",
    query: "card with 3 or more Pokemon",
    minimum_matches: 1,
    minimum_visible_pokemon_count: 3,
  },
  {
    regression_id: "wingull_sky_suppression",
    query: "Wingull sky",
    minimum_matches: 1,
    excluded_gv_ids: ["GV-PK-DX-81"],
  },
  {
    regression_id: "wingull_cloud",
    query: "Wingull cloud",
    minimum_matches: 2,
    required_gv_ids: ["GV-PK-GE-95", "GV-PK-CES-111"],
  },
  {
    regression_id: "wingull_tree",
    query: "Wingull tree",
    minimum_matches: 2,
    required_gv_ids: ["GV-PK-AR-80", "GV-PK-AR-81"],
  },
  {
    regression_id: "marowak_standing_subject_boundary",
    query: "Marowak standing",
    minimum_matches: 1,
    forbidden_detected_subjects: ["standing"],
  },
  {
    regression_id: "marowak_ex_standing",
    query: "Marowak ex standing",
    exact_matches: 2,
    required_gv_ids: ["GV-TCGP-A1-264", "GV-TCGP-A3-236"],
    forbidden_detected_subjects: ["standing"],
  },
]);

function parseFlag(argv, name) {
  const prefix = `--${name}=`;
  const entry = argv.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

function repoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

function safeTimestamp(value = new Date().toISOString()) {
  return value.replace(/[:.]/gu, "-");
}

function currentGitState() {
  return {
    commit_sha: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim(),
    branch: execFileSync("git", ["branch", "--show-current"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim(),
    tracked_status_short: execFileSync(
      "git",
      ["status", "--short", "--untracked-files=no"],
      { cwd: REPO_ROOT, encoding: "utf8" },
    ).trim(),
  };
}

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
  );
}

function resultGvIds(response) {
  return new Set(
    response.results.flatMap((result) =>
      result.matching_printings.map((printing) => printing.gv_id),
    ),
  );
}

function evidenceHasReference(evidence) {
  return Boolean(
    evidence.supporting_observation_ids?.length ||
      evidence.supporting_external_evidence_ids?.length,
  );
}

export function evaluateHighRiskRegressionV1(specification, response) {
  const findings = [];
  const gvIds = resultGvIds(response);
  if (
    Number.isInteger(specification.exact_matches) &&
    response.total_matches !== specification.exact_matches
  ) {
    findings.push(
      `exact_match_count:${response.total_matches}:${specification.exact_matches}`,
    );
  }
  if (
    Number.isInteger(specification.minimum_matches) &&
    response.total_matches < specification.minimum_matches
  ) {
    findings.push(
      `minimum_match_count:${response.total_matches}:${specification.minimum_matches}`,
    );
  }
  for (const gvId of specification.required_gv_ids ?? []) {
    if (!gvIds.has(gvId)) findings.push(`required_gv_id_missing:${gvId}`);
  }
  for (const gvId of specification.excluded_gv_ids ?? []) {
    if (gvIds.has(gvId)) findings.push(`excluded_gv_id_present:${gvId}`);
  }
  if (
    specification.required_role &&
    !response.results.some((result) =>
      result.matched_subject_roles.includes(specification.required_role),
    )
  ) {
    findings.push(`required_role_missing:${specification.required_role}`);
  }
  if (
    specification.all_results_require_role &&
    response.results.some(
      (result) =>
        !result.matched_subject_roles.includes(specification.required_role),
    )
  ) {
    findings.push(`result_without_required_role:${specification.required_role}`);
  }
  if (
    specification.required_evidence_authority &&
    !response.results.some((result) =>
      result.matched_evidence.some(
        (evidence) =>
          evidence.match_authority ===
          specification.required_evidence_authority,
      ),
    )
  ) {
    findings.push(
      `required_evidence_authority_missing:${specification.required_evidence_authority}`,
    );
  }
  if (specification.minimum_visible_pokemon_count) {
    for (const result of response.results) {
      const supportedCount = Math.max(
        0,
        ...result.matched_evidence
          .map((evidence) => evidence.derived_visible_pokemon_count)
          .filter(Number.isFinite),
      );
      if (supportedCount < specification.minimum_visible_pokemon_count) {
        findings.push(
          `visible_pokemon_count_below_minimum:${result.artwork_group_id}:${supportedCount}`,
        );
      }
    }
  }
  const forbiddenSubjects = new Set(
    (specification.forbidden_detected_subjects ?? []).map((value) =>
      value.toLocaleLowerCase("en-US"),
    ),
  );
  for (const subject of response.parsed_query.detected_subjects ?? []) {
    if (forbiddenSubjects.has(subject.normalized_name)) {
      findings.push(`forbidden_detected_subject:${subject.normalized_name}`);
    }
  }
  for (const result of response.results) {
    for (const evidence of result.matched_evidence) {
      if (!evidenceHasReference(evidence)) {
        findings.push(
          `missing_evidence_reference:${result.artwork_group_id}:${evidence.source_id}`,
        );
      }
    }
  }
  return {
    regression_id: specification.regression_id,
    query: specification.query,
    passed: findings.length === 0,
    findings,
    total_matches: response.total_matches,
    result_gv_ids: [...gvIds].sort(),
    strict_zero_reason: response.strict_zero_reason,
  };
}

export function parseCardVisualSearchHighRiskRegressionArgsV1(argv = []) {
  return {
    projectionDir:
      parseFlag(argv, "projection-dir") ?? DEFAULT_PROJECTION_DIR,
    outputRoot: parseFlag(argv, "output-root") ?? DEFAULT_OUTPUT_ROOT,
    outputDir: parseFlag(argv, "output-dir"),
    cameoReference:
      parseFlag(argv, "cameo-reference") ?? DEFAULT_CAMEO_REFERENCE,
    reviewedEvidence:
      parseFlag(argv, "reviewed-evidence") ?? DEFAULT_REVIEWED_EVIDENCE,
    evidenceSuppressions:
      parseFlag(argv, "evidence-suppressions") ??
      DEFAULT_EVIDENCE_SUPPRESSIONS,
  };
}

export async function runCardVisualSearchHighRiskRegressionV1(args) {
  const git = currentGitState();
  assertCardVisualCorpusBranchV1(git.branch);
  if (git.tracked_status_short) {
    throw new Error(
      `tracked working tree must be clean: ${git.tracked_status_short}`,
    );
  }
  const projectionDir = repoPath(args.projectionDir);
  const cameoReference = repoPath(args.cameoReference);
  const reviewedEvidence = repoPath(args.reviewedEvidence);
  const evidenceSuppressions = repoPath(args.evidenceSuppressions);
  const inputHashes = {
    projection_reconciliation: sha256Buffer(
      await fs.readFile(
        path.join(projectionDir, "PROJECTION_RECONCILIATION.json"),
      ),
    ),
    cameo_reference: sha256Buffer(await fs.readFile(cameoReference)),
    reviewed_evidence: sha256Buffer(await fs.readFile(reviewedEvidence)),
    evidence_suppressions: sha256Buffer(
      await fs.readFile(evidenceSuppressions),
    ),
  };
  const runKey = sha256JsonV1({
    version: CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_VERSION,
    commit_sha: git.commit_sha,
    input_hashes: inputHashes,
    regressions: REGRESSIONS,
  });
  const outputDir = args.outputDir
    ? repoPath(args.outputDir)
    : path.join(
        repoPath(args.outputRoot),
        `${safeTimestamp()}_high_risk_${runKey.slice(0, 12)}`,
      );
  const runPlan = {
    version: CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_VERSION,
    created_at: new Date().toISOString(),
    run_key: runKey,
    commit_sha: git.commit_sha,
    branch: git.branch,
    tracked_worktree_clean: true,
    projection_dir: projectionDir.replaceAll("\\", "/"),
    regression_count: REGRESSIONS.length,
    input_hashes_sha256: inputHashes,
    boundaries: {
      provider_calls: false,
      database_connection: false,
      database_writes: false,
      approvals: false,
      embeddings: false,
      index_writes: false,
      holdout_execution: false,
      public_reads: false,
    },
  };
  await writeJson(path.join(outputDir, "run_plan.json"), runPlan);

  const governed = await loadGovernedCollectorSearchEngineV1({
    projectionDir,
    cameoReference,
    reviewedEvidence,
    evidenceSuppressions,
  });
  const queryResults = [];
  const decisions = [];
  for (const specification of REGRESSIONS) {
    const response = await governed.engine.search(specification.query, {
      limit: 48,
    });
    queryResults.push({
      regression_id: specification.regression_id,
      specification,
      response,
    });
    decisions.push(evaluateHighRiskRegressionV1(specification, response));
  }
  const report = {
    version: CARD_VISUAL_SEARCH_HIGH_RISK_REGRESSION_VERSION,
    created_at: new Date().toISOString(),
    run_plan: runPlan,
    counts: {
      total: decisions.length,
      passed: decisions.filter((decision) => decision.passed).length,
      failed: decisions.filter((decision) => !decision.passed).length,
    },
    suppression_stats: governed.suppression_stats,
    curated_evidence_stats: governed.curated_evidence_stats,
    decisions,
    passed: decisions.every((decision) => decision.passed),
  };
  const reportMarkdown = `# Card Visual Search High-Risk Regression V1

- Commit: \`${git.commit_sha}\`
- Regressions: \`${report.counts.total}\`
- Passed: \`${report.counts.passed}\`
- Failed: \`${report.counts.failed}\`
- Gate passed: \`${report.passed}\`

No provider calls, database connections or writes, approvals, embeddings, holdout execution, index writes, or public reads occurred.
`;
  await writeJsonl(path.join(outputDir, "query_results.jsonl"), queryResults);
  await writeJson(path.join(outputDir, "HIGH_RISK_REGRESSION_REPORT.json"), report);
  await fs.writeFile(
    path.join(outputDir, "HIGH_RISK_REGRESSION_REPORT.md"),
    reportMarkdown,
  );
  const artifactFiles = [
    "run_plan.json",
    "query_results.jsonl",
    "HIGH_RISK_REGRESSION_REPORT.json",
    "HIGH_RISK_REGRESSION_REPORT.md",
  ];
  const hashes = {};
  for (const file of artifactFiles) {
    hashes[file] = sha256Buffer(await fs.readFile(path.join(outputDir, file)));
  }
  await writeJson(path.join(outputDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    file_count: artifactFiles.length,
    files: hashes,
  });
  return { outputDir, report };
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runCardVisualSearchHighRiskRegressionV1(
    parseCardVisualSearchHighRiskRegressionArgsV1(argv),
  );
  console.log(
    `[card-visual-search-high-risk] output_dir=${result.outputDir}`,
  );
  console.log(
    `[card-visual-search-high-risk] passed=${result.report.counts.passed}/${result.report.counts.total}`,
  );
  if (!result.report.passed) process.exitCode = 1;
}
