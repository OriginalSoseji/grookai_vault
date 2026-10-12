import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCatalogPricingCompletionV1,
} from "../../backend/operations/catalog_pricing_completion_v1.mjs";

function component(componentId, evidence, status = "healthy") {
  return { component_id: componentId, status, evidence };
}

function fixture() {
  return {
    observed_at: "2026-10-12T05:15:19.895Z",
    overall_status: "degraded",
    components: [
      component("tcgplayer-market-pipeline", {
        selected_count: 208458,
        mapped_count: 176998,
        eligible_count: 165591,
        snapshot_count: 165591,
      }),
      component("japanese-master-index", {
        card_count: 31627,
        worker: {
          catalog_completeness_proven: false,
          metrics: { cards: 31627, mapped_cards: 118, cards_with_exact_printings: 12549, missing_image: 0 },
          coverage: { unmapped_cards: 31509, cards_without_exact_printings: 19078, missing_images: 0 },
        },
      }),
      component("one-piece-expansion", {
        card_count: 6899,
        worker: {
          catalog_completeness_proven: false,
          metrics: { cards: 6899, mapped_cards: 6899, cards_with_exact_printings: 6773, missing_image: 101 },
          coverage: { unmapped_cards: 0, cards_without_exact_printings: 126, missing_images: 101 },
        },
      }),
      component("cross-tcg-sealed", {
        family_count: 769,
        variant_count: 5828,
        worker: {
          catalog_completeness_proven: false,
          coverage: { pending_review_candidates: 13, unmapped_variants: 0 },
        },
      }),
      component("new-set-discovery", {
        counts: { candidate_backlog: 84, review_required: 6, newly_observed_review_required: 0 },
      }),
      component("funko-catalog", {}, "degraded"),
    ],
  };
}

test("healthy runtime evidence cannot hide the production pricing backlog", () => {
  const result = evaluateCatalogPricingCompletionV1(fixture());
  const pricing = result.lanes.find((lane) => lane.lane_id === "tcgplayer-pricing-completion");
  assert.equal(result.status, "incomplete");
  assert.equal(result.completion_allowed, false);
  assert.equal(pricing.status, "incomplete");
  assert.equal(pricing.backlog.unmapped, 31460);
  assert.equal(pricing.backlog.mapped_but_ineligible, 11407);
  assert.equal(pricing.backlog.eligible_but_unpublished, 0);
  assert.equal(pricing.backlog.without_published_snapshot, 42867);
  assert.equal(pricing.coverage.published_snapshot_percent, 79.436);
});

test("catalog lanes preserve separate overlapping gap dimensions", () => {
  const result = evaluateCatalogPricingCompletionV1(fixture());
  const japanese = result.lanes.find((lane) => lane.lane_id === "japanese-master-index-completion");
  const onePiece = result.lanes.find((lane) => lane.lane_id === "one-piece-catalog-completion");
  assert.deepEqual(japanese.backlog, {
    cards: 31627,
    identity_unmapped: 31509,
    exact_printing_missing: 19078,
    image_missing: 0,
  });
  assert.equal(onePiece.backlog.exact_printing_missing, 126);
  assert.equal(onePiece.backlog.image_missing, 101);
  assert.equal(result.interpretation.overlapping_catalog_dimensions, true);
});

test("completion requires zero backlog and explicit catalog completeness proof", () => {
  const input = fixture();
  input.components.find((row) => row.component_id === "tcgplayer-market-pipeline").evidence = {
    selected_count: 100,
    mapped_count: 100,
    eligible_count: 100,
    snapshot_count: 100,
  };
  for (const id of ["japanese-master-index", "one-piece-expansion"]) {
    const evidence = input.components.find((row) => row.component_id === id).evidence;
    evidence.worker.catalog_completeness_proven = true;
    evidence.worker.metrics = { cards: 100, mapped_cards: 100, cards_with_exact_printings: 100, missing_image: 0 };
    evidence.worker.coverage = { unmapped_cards: 0, cards_without_exact_printings: 0, missing_images: 0 };
  }
  const sealed = input.components.find((row) => row.component_id === "cross-tcg-sealed");
  sealed.evidence.worker.catalog_completeness_proven = true;
  sealed.evidence.worker.coverage = { pending_review_candidates: 0, unmapped_variants: 0 };
  input.components.find((row) => row.component_id === "new-set-discovery").evidence.counts = {
    candidate_backlog: 0,
    review_required: 0,
  };
  const funko = input.components.find((row) => row.component_id === "funko-catalog");
  funko.status = "healthy";
  funko.reason = "Catalog contract implemented with measured coverage.";
  funko.evidence.catalog_completeness_proven = true;

  const result = evaluateCatalogPricingCompletionV1(input);
  assert.equal(result.status, "complete");
  assert.equal(result.completion_allowed, true);
  assert.equal(result.counts.complete, 6);
});

test("missing source evidence is unmeasured rather than falsely healthy", () => {
  const result = evaluateCatalogPricingCompletionV1({ components: [] });
  assert.equal(result.status, "unmeasured");
  assert.ok(result.lanes.every((lane) => lane.status === "unmeasured"));
});

test("inconsistent pricing counters cannot satisfy the equality gate", () => {
  const input = fixture();
  input.components.find((row) => row.component_id === "tcgplayer-market-pipeline").evidence = {
    selected_count: 100,
    mapped_count: 100,
    eligible_count: 101,
    snapshot_count: 101,
  };
  const result = evaluateCatalogPricingCompletionV1(input);
  const pricing = result.lanes.find((lane) => lane.lane_id === "tcgplayer-pricing-completion");
  assert.equal(pricing.status, "incomplete");
  assert.equal(pricing.coverage.counter_integrity, false);
  assert.equal(pricing.coverage.published_snapshot_percent, null);
  assert.equal(result.completion_allowed, false);
});

test("missing completion-critical new-set counters are unmeasured", () => {
  const input = fixture();
  input.components.find((row) => row.component_id === "new-set-discovery").evidence = {
    counts: { candidate_backlog: 0 },
  };
  const result = evaluateCatalogPricingCompletionV1(input);
  const newSets = result.lanes.find((lane) => lane.lane_id === "new-set-admission");
  assert.equal(newSets.status, "unmeasured");
  assert.equal(newSets.backlog, null);
  assert.equal(result.status, "unmeasured");
  assert.equal(result.completion_allowed, false);
});
