import assert from "node:assert/strict";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION,
  CARD_VISUAL_SEARCH_REPAIR_LEDGER_VERSION,
  externalSourceRegistryLoadRowsV2,
  parseCardVisualSearchCorpusReleaseArgsV2,
} from "../../backend/card_descriptions/card_visual_search_corpus_release_v2.mjs";
import { readFileSync } from "node:fs";

test("V2 release builder defaults to the immutable paid source release", () => {
  const args = parseCardVisualSearchCorpusReleaseArgsV2([]);
  assert.equal(
    CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION,
    "CARD_VISUAL_SEARCH_CORPUS_RELEASE_V2",
  );
  assert.equal(
    CARD_VISUAL_SEARCH_REPAIR_LEDGER_VERSION,
    "CARD_VISUAL_SEARCH_REPAIR_LEDGER_V1",
  );
  assert.match(args.projectionDir, /productization_bbf20d0f\/projection$/u);
  assert.match(args.eligibilityDir, /productization_bbf20d0f\/eligibility$/u);
  assert.match(args.cameoReference, /canonical_matches\.jsonl$/u);
  assert.match(
    args.reviewedEvidence,
    /card_visual_search_founder_reviews_v1\.json$/u,
  );
  assert.match(
    args.evidenceSuppressions,
    /card_visual_search_founder_suppressions_v1\.json$/u,
  );
});

test("V2 release builder accepts explicit immutable inputs", () => {
  const args = parseCardVisualSearchCorpusReleaseArgsV2([
    "--projection-dir=C:/projection",
    "--eligibility-dir=C:/eligibility",
    "--cameo-reference=C:/cameos.jsonl",
    "--reviewed-evidence=C:/reviews.json",
    "--evidence-suppressions=C:/suppressions.json",
    "--migration=C:/migration.sql",
    "--output-dir=C:/release",
  ]);
  assert.deepEqual(args, {
    projectionDir: "C:/projection",
    eligibilityDir: "C:/eligibility",
    cameoReference: "C:/cameos.jsonl",
    reviewedEvidence: "C:/reviews.json",
    evidenceSuppressions: "C:/suppressions.json",
    migration: "C:/migration.sql",
    outputRoot:
      "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721/_rebuild/unified_collector_search_v2",
    outputDir: "C:/release",
  });
});

test("Energy is blocked from searchable output but preserved as a coverage gap", () => {
  const source = readFileSync(
    new URL(
      "../../backend/card_descriptions/card_visual_search_corpus_release_v2.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /searchableEnergyDecisionIds/);
  assert.match(source, /excluded_energy_coverage_gaps/);
  assert.doesNotMatch(
    source,
    /eligibilityDecisions\.some\(\(row\) => row\.energy_card_detected\)\s*\|\|/u,
  );
});

test("V2 release freezes the governed external-source registry as a load input", () => {
  const rows = externalSourceRegistryLoadRowsV2();
  assert.equal(rows.length, 6);
  assert.deepEqual(
    rows.map((row) => row.source_key),
    [
      "artchu",
      "artfinder_tcg",
      "binderbloom",
      "rotomamiti_cameo_database",
      "sightdex",
      "tcg_curator",
    ],
  );
  assert.ok(rows.every((row) => row.network_acquisition_enabled === false));
  assert.equal(
    rows.find((row) => row.source_key === "rotomamiti_cameo_database")
      .snapshot_import_enabled,
    true,
  );
  assert.ok(
    rows.every(
      (row) =>
        row.rights_evidence.registry_version ===
        "CARD_VISUAL_EXTERNAL_SOURCE_REGISTRY_V1",
    ),
  );
});
