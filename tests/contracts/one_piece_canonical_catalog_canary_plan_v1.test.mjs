import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildOnePieceRollbackCanaryPlanV1,
  selectOnePieceCanaryGroupV1,
  sha256,
  verifyOnePieceRollbackCanaryPlanV1,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const FIXTURE = JSON.parse(
  fs.readFileSync(
    new URL(
      "../fixtures/one_piece_canonical_catalog_canary_v1/manifest_fixture.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const REPOSITORY = {
  commit_sha: "a".repeat(40),
  branch: "agent/one-piece-ingestion-readiness-v1",
};

function build(rows = FIXTURE) {
  return buildOnePieceRollbackCanaryPlanV1(
    {
      manifestRows: rows,
      manifestLogicalSha256: sha256("fixed-fixture-manifest-authority"),
      migrationDraftSha256: "b".repeat(64),
      repository: REPOSITORY,
      asOfDate: "2026-08-13",
    },
    { allowFixtureManifest: true },
  );
}

test("selector chooses the smallest released group that spans numbered, DON, and sealed", () => {
  const selected = selectOnePieceCanaryGroupV1(FIXTURE, {
    maxRows: 25,
    asOfDate: "2026-08-13",
  });
  assert.equal(selected.summary.source_group_id, 10);
  assert.equal(selected.summary.source_product_count, 3);
  assert.equal(selected.summary.numbered_card_count, 1);
  assert.equal(selected.summary.don_card_count, 1);
  assert.equal(selected.summary.sealed_product_count, 1);
  assert.deepEqual(selected.summary.languages, ["en", "ja"]);
});

test("future, presale, incomplete, and quarantined groups cannot win selection", () => {
  const selected = selectOnePieceCanaryGroupV1(FIXTURE, {
    maxRows: 25,
    asOfDate: "2026-08-13",
  });
  assert.notEqual(selected.summary.source_group_id, 9);
  assert.notEqual(selected.summary.source_group_id, 11);
  assert.notEqual(selected.summary.source_group_id, 12);
});

test("canary plan preserves exact source payloads and zero durable authorization", () => {
  const plan = build();
  assert.equal(plan.counts.source_products, 3);
  assert.equal(plan.counts.exact_single_card_candidates, 2);
  assert.equal(plan.counts.numbered_cards, 1);
  assert.equal(plan.counts.don_cards, 1);
  assert.equal(plan.counts.sealed_product_candidates, 1);
  assert.equal(plan.counts.future_or_presale_holds, 0);
  assert.equal(plan.batch.execution_mode, "rollback_only");
  assert.equal(plan.batch.authorized_durable_batch_rows, 0);
  assert.equal(plan.batch.authorized_durable_staging_rows, 0);
  assert.equal(plan.rollback_proof_contract.expected_durable_staging_rows, 0);
  assert.equal(plan.boundaries.current_gate_database_connection, false);
  assert.equal(plan.staging_rows[2].language_key, "ja");
  assert.equal(plan.staging_rows[2].single_card_kind, "don_card");

  const verified = verifyOnePieceRollbackCanaryPlanV1(plan, {
    manifestLogicalSha256: plan.manifest_logical_sha256,
    migrationDraftSha256: plan.migration_draft_sha256,
  });
  assert.deepEqual(verified, { valid: true, errors: [] });
});

test("plan and deterministic IDs do not depend on manifest input order", () => {
  const first = build();
  const second = build([...FIXTURE].reverse());
  assert.equal(first.canary_plan_fingerprint_sha256, second.canary_plan_fingerprint_sha256);
  assert.deepEqual(
    first.staging_rows.map((row) => row.id),
    second.staging_rows.map((row) => row.id),
  );
});

test("validator rejects nonzero durable rows and source-boundary drift", () => {
  const durable = structuredClone(build());
  durable.batch.authorized_durable_staging_rows = 1;
  const durableResult = verifyOnePieceRollbackCanaryPlanV1(durable);
  assert.equal(durableResult.valid, false);
  assert.match(durableResult.errors.join("\n"), /durable staging rows/);

  const drifted = structuredClone(build());
  drifted.staging_rows[0].record_class = "exact_single_card_candidate";
  const driftResult = verifyOnePieceRollbackCanaryPlanV1(drifted);
  assert.equal(driftResult.valid, false);
  assert.match(driftResult.errors.join("\n"), /changed classification/);
});

test("validator rejects duplicate products, payload changes, and publication authority", () => {
  const duplicate = structuredClone(build());
  duplicate.staging_rows[1].source_product_id = duplicate.staging_rows[0].source_product_id;
  assert.equal(verifyOnePieceRollbackCanaryPlanV1(duplicate).valid, false);

  const changed = structuredClone(build());
  changed.staging_rows[0].payload.language.normalized = "fr";
  const changedResult = verifyOnePieceRollbackCanaryPlanV1(changed);
  assert.equal(changedResult.valid, false);
  assert.match(changedResult.errors.join("\n"), /changed language|payload hash mismatch/);

  const publishable = structuredClone(build());
  publishable.staging_rows[0].payload.publishable = true;
  const publicationResult = verifyOnePieceRollbackCanaryPlanV1(publishable);
  assert.equal(publicationResult.valid, false);
  assert.match(publicationResult.errors.join("\n"), /publishable/);
});

test("file-only planner imports no database, network, or environment client", () => {
  const source = fs.readFileSync(
    new URL(
      "../../scripts/audits/one_piece_canonical_catalog_canary_plan_v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /from\s+["'](?:pg|dotenv|https?|undici|@supabase)/);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /\.query\s*\(/);
});
