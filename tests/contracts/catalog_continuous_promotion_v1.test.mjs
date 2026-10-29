import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildCatalogContinuousPromotionAgentV1,
  buildCatalogContinuousPromotionRunKeyV1,
  CATALOG_CONTINUOUS_PROMOTION_MODE,
  validateCatalogContinuousPromotionBatchV1,
} from "../../backend/operations/catalog_continuous_promotion_v1.mjs";
import {
  buildCatalogFounderOutcomePackageV1,
  buildCatalogWriterInvocationV1,
  validateCatalogWriterRollbackProofV1,
} from "../../backend/operations/catalog_founder_outcome_v1.mjs";

function partialMtgPackage() {
  const counts = {
    sets: 0,
    card_prints: 9,
    card_print_identity: 9,
    card_printings: 9,
    external_mappings: 9,
    external_printing_mappings: 9,
  };
  return buildCatalogFounderOutcomePackageV1({
    target: {
      key: "mtg:fra",
      writer_key: "mtg_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/mtg_incremental_promotion_v1.mjs",
      target: { set_code: "fra" },
    },
    result: { target: "mtg:fra", exit_code: 0 },
    summary: {
      mode: "plan",
      database_state: "partial_or_drifted",
      writer_payload_fingerprint: "b".repeat(64),
      promotion_row_counts: { ...counts, sets: 1, card_prints: 461 },
      execution_row_counts: counts,
    },
    preflightProof: {
      collisions: Object.fromEntries(Object.keys(counts).map((key) => [key, 0])),
    },
    artifactHashes: { "summary.json": "c".repeat(64) },
    sourceCommitSha: "a".repeat(40),
    sourceRunId: "40781482588",
    asOf: "2026-10-29",
  });
}

test("continuous catalog batch admits only exact registered packages", () => {
  const outcomePackage = partialMtgPackage();
  assert.deepEqual(outcomePackage.expected_counts, {
    sets: 0,
    card_prints: 9,
    card_print_identity: 9,
    card_printings: 9,
    external_mappings: 9,
    external_printing_mappings: 9,
  });
  const batch = validateCatalogContinuousPromotionBatchV1([outcomePackage], {
    headSha: "a".repeat(40),
    sourceRunId: "40781482588",
    maxTargets: 5,
  });
  assert.equal(batch.length, 1);
  assert.throws(() => validateCatalogContinuousPromotionBatchV1(
    [outcomePackage, outcomePackage],
    { headSha: "a".repeat(40), sourceRunId: "40781482588", maxTargets: 5 },
  ), /duplicate target/);
  assert.throws(() => validateCatalogContinuousPromotionBatchV1(
    [outcomePackage],
    { headSha: "a".repeat(40), sourceRunId: "1", maxTargets: 5 },
  ), /source run changed/);
});

test("continuous catalog writer proves rollback before exact apply", () => {
  const outcomePackage = partialMtgPackage();
  const dryRun = buildCatalogWriterInvocationV1(outcomePackage, {
    headSha: "a".repeat(40),
    outDir: "catalog-dry-run",
    mode: "dry-run",
  });
  const apply = buildCatalogWriterInvocationV1(outcomePackage, {
    headSha: "a".repeat(40),
    outDir: "catalog-apply",
  });
  assert.ok(dryRun.args.includes("--mode=dry-run"));
  assert.ok(apply.args.includes("--mode=apply"));
  assert.ok(dryRun.args.includes(`--expected-payload-fingerprint=${"b".repeat(64)}`));
  const inserted = outcomePackage.expected_counts;
  const postRollback = Object.fromEntries(Object.keys(inserted).map((key) => [key, {
    planned_count: inserted[key], actual_count: 0, exact_count: 0,
  }]));
  const result = validateCatalogWriterRollbackProofV1(outcomePackage, {
    mode: "dry-run",
    writer_payload_fingerprint: outcomePackage.payload_fingerprint_sha256,
    transaction_result: { action: "rolled_back", inserted, post_rollback: postRollback },
  });
  assert.equal(result.rollback_proven, true);
  postRollback.card_prints.actual_count = 1;
  assert.throws(() => validateCatalogWriterRollbackProofV1(outcomePackage, {
    mode: "dry-run",
    writer_payload_fingerprint: outcomePackage.payload_fingerprint_sha256,
    transaction_result: { action: "rolled_back", inserted, post_rollback: postRollback },
  }), /retained rows/);
});

test("continuous catalog agent is durable, bounded, and activation-gated", () => {
  const agent = buildCatalogContinuousPromotionAgentV1();
  assert.equal(agent.agent_key, "catalog-continuous-promotion-v1");
  assert.equal(CATALOG_CONTINUOUS_PROMOTION_MODE, "governed-continuous-promotion-v1");
  const outcomePackage = partialMtgPackage();
  assert.equal(buildCatalogContinuousPromotionRunKeyV1({
    sourceRunId: "40781482588",
    headSha: "a".repeat(40),
    packages: [outcomePackage],
  }), buildCatalogContinuousPromotionRunKeyV1({
    sourceRunId: "40781482588",
    headSha: "a".repeat(40),
    packages: [outcomePackage],
  }));
  const workflow = fs.readFileSync(
    new URL("../../.github/workflows/catalog-continuous-promotion.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /CATALOG_CONTINUOUS_PROMOTION_ACTIVE == 'true'/);
  assert.match(workflow, /ref: main/);
  assert.doesNotMatch(workflow, /ref: \$\{\{ needs\.prepare\.outputs\.source_head_sha \}\}/);
  assert.match(workflow, /--max-targets=5/);
  assert.match(workflow, /catalog_continuous_promotion_v1\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /pull_request:/);
});
