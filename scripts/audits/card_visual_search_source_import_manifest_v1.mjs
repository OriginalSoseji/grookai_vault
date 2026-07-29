import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MANIFEST_VERSION = "CARD_VISUAL_SEARCH_SOURCE_IMPORT_MANIFEST_V1";
export const SOURCE_SHA = "c5bbbba5dea998fcd51d0d8602601737356a1494";
export const PRODUCTION_BASELINE_SHA = "3c862b815735a4eda93b65ac108fc583f1c62fc9";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "../..");
const DEFAULT_OUTPUT = path.join(
  REPO_ROOT,
  "docs/manifests/card_visual_search_v1_selective_source_import_manifest.json",
);

const components = [
  {
    component_id: "governing_contracts",
    lane: "A_deterministic_core",
    decision: "import_now",
    rationale: "Freeze the evidence, search, schema, and evaluation boundaries before implementation moves.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md",
      "docs/contracts/CARD_VISUAL_CONTROLLED_VOCABULARY_V1.md",
      "docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md",
      "docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md",
    ],
    focused_tests: [
      "tests/contracts/card_visual_corpus_v1_inventory.test.mjs",
      "tests/contracts/card_visual_search_eligibility_v1.test.mjs",
      "tests/contracts/card_visual_artwork_grouping_v1.test.mjs",
      "tests/contracts/card_visual_search_projection_v1.test.mjs",
      "tests/contracts/card_visual_search_evaluation_bootstrap_v1.test.mjs",
      "tests/contracts/card_visual_search_lab_v1.test.mjs",
    ],
    files: [
      "docs/contracts/CARD_VISUAL_FACT_GRAPH_V2.md",
      "docs/contracts/CARD_VISUAL_CONTROLLED_VOCABULARY_V1.md",
      "docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md",
      "docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md",
    ],
  },
  {
    component_id: "corpus_inventory",
    lane: "A_deterministic_core",
    decision: "import_now",
    rationale: "Reconcile the immutable source population and source fact-graph hashes.",
    governing_contracts: ["docs/contracts/CARD_VISUAL_CORPUS_V1_BLUEPRINT.md"],
    focused_tests: ["tests/contracts/card_visual_corpus_v1_inventory.test.mjs"],
    files: [
      "backend/card_descriptions/card_visual_corpus_v1_inventory.mjs",
      "scripts/audits/card_visual_corpus_v1_inventory.mjs",
      "tests/contracts/card_visual_corpus_v1_inventory.test.mjs",
    ],
  },
  {
    component_id: "search_eligibility",
    lane: "A_deterministic_core",
    decision: "import_now",
    rationale: "Preserve the locked Tier A, guarded Tier B, and excluded Tier C policy.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4.md",
      "docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md",
    ],
    focused_tests: [
      "tests/contracts/card_visual_search_eligibility_v1.test.mjs",
      "tests/contracts/card_visual_search_eligibility_audit_v1.test.mjs",
    ],
    files: [
      "backend/card_descriptions/card_visual_search_eligibility_v1.mjs",
      "backend/card_descriptions/card_visual_search_eligibility_audit_v1.mjs",
      "scripts/audits/card_visual_search_eligibility_v1.mjs",
      "scripts/audits/card_visual_search_eligibility_audit_v1.mjs",
      "tests/contracts/card_visual_search_eligibility_v1.test.mjs",
      "tests/contracts/card_visual_search_eligibility_audit_v1.test.mjs",
      "docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4.md",
    ],
  },
  {
    component_id: "artwork_grouping",
    lane: "A_deterministic_core",
    decision: "import_now",
    rationale: "Rank distinct artwork identities before expanding results to canonical printings.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_ARTWORK_GROUPING_V1_1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md",
    ],
    focused_tests: [
      "tests/contracts/card_visual_artwork_grouping_v1.test.mjs",
      "tests/contracts/card_visual_artwork_grouping_audit_v1.test.mjs",
    ],
    files: [
      "backend/card_descriptions/card_visual_artwork_grouping_v1.mjs",
      "backend/card_descriptions/card_visual_artwork_grouping_audit_v1.mjs",
      "scripts/audits/card_visual_artwork_grouping_v1.mjs",
      "scripts/audits/card_visual_artwork_grouping_audit_v1.mjs",
      "tests/contracts/card_visual_artwork_grouping_v1.test.mjs",
      "tests/contracts/card_visual_artwork_grouping_audit_v1.test.mjs",
      "docs/contracts/CARD_VISUAL_ARTWORK_GROUPING_V1_1.md",
    ],
  },
  {
    component_id: "deterministic_projection",
    lane: "A_deterministic_core",
    decision: "import_now",
    rationale: "Produce stable subject, scene, and style documents with evidence references.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1_5.md",
      "docs/contracts/CARD_VISUAL_SEARCH_INDEX_SCHEMA_V1.md",
    ],
    focused_tests: ["tests/contracts/card_visual_search_projection_v1.test.mjs"],
    files: [
      "backend/card_descriptions/card_visual_search_projection_v1.mjs",
      "scripts/audits/card_visual_search_projection_v1.mjs",
      "tests/contracts/card_visual_search_projection_v1.test.mjs",
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1_5.md",
    ],
  },
  {
    component_id: "query_candidate_core",
    lane: "A_deterministic_core",
    decision: "import_now",
    rationale: "Preserve the proven parser, structured/lexical candidate index, ranking, and evidence explanation behavior.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_LAB_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md",
    ],
    focused_tests: [
      "tests/contracts/card_visual_search_evaluation_bootstrap_v1.test.mjs",
      "tests/contracts/card_visual_search_lab_v1.test.mjs",
    ],
    files: [
      "backend/card_descriptions/card_visual_search_evaluation_bootstrap_v1.mjs",
      "backend/card_descriptions/card_visual_search_lab_v1.mjs",
      "backend/card_descriptions/card_visual_search_lab_v1.html",
      "scripts/audits/card_visual_search_evaluation_bootstrap_v1.mjs",
      "tests/contracts/card_visual_search_evaluation_bootstrap_v1.test.mjs",
      "tests/contracts/card_visual_search_lab_v1.test.mjs",
      "docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_LAB_V1.md",
    ],
  },
  {
    component_id: "calibration_evaluator",
    lane: "B_calibration_tooling",
    decision: "import_later",
    rationale: "Import after the deterministic core so PokeJavi and founder judgments can be validated and scored without widening the production runtime.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md",
    ],
    focused_tests: ["tests/contracts/card_visual_search_calibration_evaluator_v1.test.mjs"],
    files: [
      "backend/card_descriptions/card_visual_search_calibration_evaluator_v1.mjs",
      "scripts/audits/card_visual_search_calibration_evaluator_v1.mjs",
      "tests/contracts/card_visual_search_calibration_evaluator_v1.test.mjs",
      "docs/contracts/CARD_VISUAL_SEARCH_CALIBRATION_EVALUATOR_V1.md",
    ],
  },
  {
    component_id: "judgment_packet",
    lane: "B_calibration_tooling",
    decision: "import_later",
    rationale: "Retain exact image/evidence review and JSONL export tooling without making reviewer decisions trusted application state.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_SEARCH_JUDGMENT_PACKET_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_EVALUATION_V1.md",
    ],
    focused_tests: ["tests/contracts/card_visual_search_judgment_packet_v1.test.mjs"],
    files: [
      "backend/card_descriptions/card_visual_search_judgment_packet_v1.mjs",
      "scripts/audits/card_visual_search_judgment_packet_v1.mjs",
      "tests/contracts/card_visual_search_judgment_packet_v1.test.mjs",
      "docs/contracts/CARD_VISUAL_SEARCH_JUDGMENT_PACKET_V1.md",
    ],
  },
  {
    component_id: "review_portal_source",
    lane: "C_portal_reference",
    decision: "reference_only",
    rationale: "The isolated read-only portal is already deployed; productization must not accidentally introduce server-side review writes.",
    governing_contracts: ["docs/contracts/CARD_VISUAL_SEARCH_REVIEW_PORTAL_V1.md"],
    focused_tests: ["tests/contracts/card_visual_search_review_portal_v1.test.mjs"],
    files: [
      "apps/web/src/app/api/review/visual-search/dashboard/route.ts",
      "apps/web/src/app/review/visual-search/page.tsx",
      "scripts/audits/build_card_visual_search_review_portal_bundle_v1.mjs",
      "tests/contracts/card_visual_search_review_portal_v1.test.mjs",
      "docs/contracts/CARD_VISUAL_SEARCH_REVIEW_PORTAL_V1.md",
    ],
  },
  {
    component_id: "pause_checkpoint",
    lane: "C_portal_reference",
    decision: "reference_only",
    rationale: "Preserve the exact restart truth and production portal provenance from the governed source branch.",
    governing_contracts: ["docs/contracts/CARD_VISUAL_SEARCH_CONTRACT_V1.md"],
    focused_tests: ["tests/contracts/card_visual_search_review_portal_v1.test.mjs"],
    files: [
      "docs/checkpoints/card_visual_descriptions/CARD_VISUAL_SEARCH_WORKSTREAM_PAUSE_20260721.md",
    ],
  },
  {
    component_id: "superseded_contracts",
    lane: "X_excluded",
    decision: "exclude_superseded",
    rationale: "Historical contract revisions remain available on the source branch but must not become active productization contracts.",
    governing_contracts: [
      "docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4.md",
      "docs/contracts/CARD_VISUAL_ARTWORK_GROUPING_V1_1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1_5.md",
    ],
    focused_tests: [
      "tests/contracts/card_visual_search_eligibility_v1.test.mjs",
      "tests/contracts/card_visual_artwork_grouping_v1.test.mjs",
      "tests/contracts/card_visual_search_projection_v1.test.mjs",
    ],
    files: [
      "docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_2.md",
      "docs/contracts/CARD_VISUAL_SEARCH_ELIGIBILITY_V1_3.md",
      "docs/contracts/CARD_VISUAL_ARTWORK_GROUPING_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1_1.md",
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1_2.md",
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1_3.md",
      "docs/contracts/CARD_VISUAL_SEARCH_PROJECTION_V1_4.md",
    ],
  },
  {
    component_id: "generated_portal_bundle",
    lane: "X_excluded",
    decision: "exclude_generated",
    rationale: "The existing production bundle is release evidence, not source for the new collector-facing product.",
    governing_contracts: ["docs/contracts/CARD_VISUAL_SEARCH_REVIEW_PORTAL_V1.md"],
    focused_tests: ["tests/contracts/card_visual_search_review_portal_v1.test.mjs"],
    files: [
      "apps/web/private/review/visual-search/CALIBRATION_REVIEW_DASHBOARD.html.br",
      "apps/web/private/review/visual-search/manifest.json",
    ],
  },
];

const plannedRebuilds = [
  {
    component_id: "production_index_migration",
    decision: "rebuild_for_production",
    gate: "database_capability_and_migration_design",
    reason: "No source migration implements the approved immutable index, RLS, active pointer, and rollback contract.",
  },
  {
    component_id: "governed_visual_search_rpc",
    decision: "rebuild_for_production",
    gate: "database_capability_and_migration_design",
    reason: "The app requires a bounded signed-in read contract that does not expose source graphs or embeddings.",
  },
  {
    component_id: "collector_visual_search_service",
    decision: "rebuild_for_production",
    gate: "signed_in_product_canary",
    reason: "The loopback lab proves behavior but is not a deployable production service boundary.",
  },
  {
    component_id: "collector_search_ui",
    decision: "rebuild_for_production",
    gate: "signed_in_product_canary",
    reason: "The reviewer portal is an evidence tool, not the collector-facing search experience.",
  },
  {
    component_id: "embedding_build_pipeline",
    decision: "rebuild_for_production",
    gate: "embedding_canary",
    reason: "Provider, model, dimensions, cost ceiling, resume behavior, and database capability are not yet frozen.",
  },
];

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: options.encoding ?? "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sourceFileRecord(filePath) {
  const sourceObject = `${SOURCE_SHA}:${filePath}`;
  const contents = runGit(["show", sourceObject], { encoding: "buffer" });
  const blobOid = runGit(["rev-parse", sourceObject]).trim();
  const lastCommitSha = runGit(["log", "-1", "--format=%H", SOURCE_SHA, "--", filePath]).trim();

  if (!lastCommitSha) {
    throw new Error(`No source commit found for ${filePath}`);
  }

  return {
    source_path: filePath,
    destination_path: filePath,
    source_blob_oid: blobOid,
    source_sha256: sha256(contents),
    source_last_commit_sha: lastCommitSha,
  };
}

function countBy(values, keySelector) {
  return values.reduce((counts, value) => {
    const key = keySelector(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildCardVisualSearchSourceImportManifestV1() {
  runGit(["cat-file", "-e", `${SOURCE_SHA}^{commit}`]);
  runGit(["cat-file", "-e", `${PRODUCTION_BASELINE_SHA}^{commit}`]);

  const hydratedComponents = components.map((component) => ({
    ...component,
    files: component.files.map(sourceFileRecord),
  }));
  const allFiles = hydratedComponents.flatMap((component) =>
    component.files.map((file) => ({
      ...file,
      component_id: component.component_id,
      lane: component.lane,
      decision: component.decision,
    })),
  );
  const uniquePaths = new Set(allFiles.map((file) => file.source_path));

  if (uniquePaths.size !== allFiles.length) {
    throw new Error("Source import manifest contains duplicate paths");
  }

  const payload = {
    manifest_version: MANIFEST_VERSION,
    generated_on: "2026-07-28",
    project: "CARD_VISUAL_SEARCH_V1_PRODUCTIZATION",
    production_baseline: {
      branch: "origin/main",
      commit_sha: PRODUCTION_BASELINE_SHA,
    },
    governed_source: {
      branch: "feature/card-visual-search-review-portal",
      commit_sha: SOURCE_SHA,
      production_review_portal_commit_sha: "f2e57e476e8d68aa241d2b6a3afbc8480e9d7100",
    },
    target: {
      branch: "feature/visual-search-v1-productization",
      import_strategy: "selective_manifest_driven",
      broad_merge_allowed: false,
    },
    boundaries: {
      database_writes_authorized: false,
      migration_apply_authorized: false,
      embeddings_authorized: false,
      provider_calls_authorized: false,
      public_search_activation_authorized: false,
      energy_cards_included: false,
      pricing_files_allowed: false,
      generated_bulk_evidence_allowed: false,
    },
    exclusion_policies: [
      {
        pattern: "docs/audits/card_visual_*/**",
        reason: "Generated evidence is transferred through a separately reconciled corpus release, not source import.",
      },
      {
        pattern: "backend/pricing/**|supabase/migrations/*pricing*|apps/web/**/pricing/**",
        reason: "Pricing release management remains isolated.",
      },
      {
        pattern: "backend/card_descriptions/card_visual_description_agent_v1.mjs",
        reason: "Paid extraction remains stopped and is not required by the search runtime.",
      },
      {
        pattern: "supabase/migrations/20260715120000_card_visual_description_agent_v1.sql",
        reason: "The existing source-table migration is already present on production main and is not re-imported.",
      },
      {
        pattern: "unrelated source-branch history",
        reason: "Only exact manifest entries may move into the productization branch.",
      },
    ],
    components: hydratedComponents,
    planned_rebuilds: plannedRebuilds,
    summary: {
      component_count: hydratedComponents.length,
      selected_source_file_count: allFiles.length,
      file_count_by_decision: countBy(allFiles, (file) => file.decision),
      file_count_by_lane: countBy(allFiles, (file) => file.lane),
      planned_rebuild_count: plannedRebuilds.length,
      duplicate_source_path_count: allFiles.length - uniquePaths.size,
      pricing_source_file_count: allFiles.filter((file) => /pricing/iu.test(file.source_path)).length,
      generated_audit_source_file_count: allFiles.filter((file) => file.source_path.startsWith("docs/audits/")).length,
    },
    exact_next_action: "Import only Lane A files after this manifest and its contract test are reviewed and committed.",
  };

  return {
    ...payload,
    manifest_payload_sha256: sha256(JSON.stringify(payload)),
  };
}

export async function writeCardVisualSearchSourceImportManifestV1(outputPath = DEFAULT_OUTPUT) {
  const manifest = buildCardVisualSearchSourceImportManifestV1();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const outputArg = process.argv.find((value) => value.startsWith("--output="));
  const outputPath = outputArg ? path.resolve(outputArg.slice("--output=".length)) : DEFAULT_OUTPUT;
  const manifest = await writeCardVisualSearchSourceImportManifestV1(outputPath);
  console.log(
    JSON.stringify(
      {
        output: path.relative(REPO_ROOT, outputPath).replaceAll("\\", "/"),
        selected_source_files: manifest.summary.selected_source_file_count,
        file_count_by_decision: manifest.summary.file_count_by_decision,
        manifest_payload_sha256: manifest.manifest_payload_sha256,
      },
      null,
      2,
    ),
  );
}
