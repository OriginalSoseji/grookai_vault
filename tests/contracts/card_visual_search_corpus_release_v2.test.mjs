import assert from "node:assert/strict";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_CORPUS_RELEASE_VERSION,
  CARD_VISUAL_SEARCH_REPAIR_LEDGER_VERSION,
  parseCardVisualSearchCorpusReleaseArgsV2,
} from "../../backend/card_descriptions/card_visual_search_corpus_release_v2.mjs";

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
});

test("V2 release builder accepts explicit immutable inputs", () => {
  const args = parseCardVisualSearchCorpusReleaseArgsV2([
    "--projection-dir=C:/projection",
    "--eligibility-dir=C:/eligibility",
    "--cameo-reference=C:/cameos.jsonl",
    "--reviewed-evidence=C:/reviews.json",
    "--migration=C:/migration.sql",
    "--output-dir=C:/release",
  ]);
  assert.deepEqual(args, {
    projectionDir: "C:/projection",
    eligibilityDir: "C:/eligibility",
    cameoReference: "C:/cameos.jsonl",
    reviewedEvidence: "C:/reviews.json",
    migration: "C:/migration.sql",
    outputRoot:
      "C:/grookai_visual_search_releases/card_visual_search_corpus_release_v1_1_20260721/_rebuild/unified_collector_search_v2",
    outputDir: "C:/release",
  });
});
