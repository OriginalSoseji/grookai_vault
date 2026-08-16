import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMtgCatalogExecutionOrderV1,
  buildMtgCatalogIngestionEnvelopeV1,
  classifyMtgCatalogSetStateV1,
  isTransientMtgIngestionErrorV1,
  isMtgCatalogBatchEligibleAsOfV1,
  MTG_CATALOG_INGESTION_BOUNDARIES_V1,
  validateMtgCatalogManifestForIngestionV1,
  validateMtgPayloadInventoryV1,
} from "../../scripts/audits/mtg_canonical_catalog_ingestion_envelope_v1.mjs";

function batch(code, ordinal, overrides = {}) {
  return {
    ordinal,
    source_set_id: `set-${code}`,
    code,
    name: code.toUpperCase(),
    set_type: "expansion",
    released_at: "2025-01-01",
    release_date_resolution: "single_observed_value",
    catalog_state: "not_staged",
    candidate_count: 2,
    card_printings: 3,
    external_printing_mappings: 2,
    positive_market_lanes: 2,
    quarantined_collision_lanes: 0,
    total_staging_rows: 12,
    writer_payload_fingerprint: String(ordinal + 1).padStart(64, "a").slice(-64),
    payload_file_sha256: String(ordinal + 1).padStart(64, "b").slice(-64),
    payload_file: `.tmp/${code}.json`,
    ...overrides,
  };
}

function manifest() {
  const batches = [
    batch("dsk", 0, {
      catalog_state: "already_canonical_dsk",
      candidate_count: 417,
      card_printings: 807,
      external_printing_mappings: 807,
      total_staging_rows: 2866,
    }),
    batch("msh", 1),
    batch("tok", 2, { set_type: "token", candidate_count: 1, total_staging_rows: 6 }),
    batch("promo", 3, {
      set_type: "promo",
      external_printing_mappings: 0,
      positive_market_lanes: 0,
    }),
    batch("box", 4, {
      set_type: "box",
      release_date_resolution: "card_level_values_preserved_set_level_abstained",
      released_at: null,
    }),
    batch("collision", 5, { set_type: "commander", quarantined_collision_lanes: 1 }),
  ];
  return {
    version: "MTG_CANONICAL_CATALOG_BATCH_MANIFEST_V1",
    status: "full_catalog_batches_frozen",
    source: { bulk_sha256: "c".repeat(64), warehouse_sha256: "d".repeat(64) },
    bounded_stage_selection_policy: { as_of: "2026-08-13" },
    coverage: { total_set_count: batches.length },
    batches,
    findings: [],
  };
}

function inventory(value) {
  return value.batches.map((row) => ({
    ordinal: row.ordinal,
    source_set_id: row.source_set_id,
    code: row.code,
    payload_file_sha256: row.payload_file_sha256,
    writer_payload_fingerprint: row.writer_payload_fingerprint,
    total_staging_rows: row.total_staging_rows,
  }));
}

const repository = {
  governing_commit_sha: "e".repeat(40),
  governing_files_sha256: "f".repeat(64),
};

test("frozen manifest produces one approval for every remaining set", () => {
  const value = manifest();
  const envelope = buildMtgCatalogIngestionEnvelopeV1({
    manifest: value,
    manifestSha256: "1".repeat(64),
    payloadInventory: inventory(value),
    repository,
  });
  assert.equal(envelope.authorized_remaining_sets, 5);
  assert.equal(envelope.execution_order[0].code, "msh");
  assert.equal(envelope.authorized_counts.card_prints, 9);
  assert.equal(envelope.authorized_counts.card_printings, 15);
  assert.equal(envelope.authorized_counts.external_printing_mappings, 8);
  assert.match(envelope.required_approval_message, /without additional per-set approval/);
  assert.match(envelope.required_approval_message, /do not authorize migrations/i);
  assert.equal(envelope.boundaries.required_release_status, "hidden");
  assert.equal(envelope.boundaries.canonical_updates, false);
  assert.equal(envelope.boundaries.pricing_writes, false);
  assert.equal(envelope.boundaries.pokemon_mutation, false);
});

test("safety ramp covers MSH, set types, abstention, zero mapping, and collision quarantine", () => {
  const order = buildMtgCatalogExecutionOrderV1(manifest());
  assert.equal(order[0].code, "msh");
  assert.deepEqual(new Set(order.map((row) => row.set_type)), new Set([
    "expansion",
    "token",
    "promo",
    "box",
    "commander",
  ]));
  assert.ok(order.some((row) => row.release_date_resolution.includes("abstained")));
  assert.ok(order.some((row) => row.external_printing_mappings === 0));
  assert.ok(order.some((row) => row.quarantined_collision_lanes > 0));
});

test("manifest and payload inventory drift fail closed", () => {
  const value = manifest();
  const badManifest = structuredClone(value);
  badManifest.status = "pending";
  badManifest.batches[2].writer_payload_fingerprint = badManifest.batches[1].writer_payload_fingerprint;
  assert.deepEqual(
    validateMtgCatalogManifestForIngestionV1(badManifest),
    ["manifest_not_frozen", "duplicate_payload_fingerprint"],
  );

  const badInventory = inventory(value);
  badInventory[1].payload_file_sha256 = "0".repeat(64);
  assert.deepEqual(validateMtgPayloadInventoryV1(value, badInventory), [
    "payload_file_hash_mismatch:msh",
  ]);
});

function classificationValue({ stageCount = 0, stageRows = 0, selected = 0, exact = false }) {
  const plan = {
    row_counts: {
      sets: 1,
      card_prints: 2,
      card_print_identity: 2,
      card_printings: 3,
      external_mappings: 2,
      external_printing_mappings: 2,
    },
    staging_contract: { staged_row_count: 12 },
    staging_rows_sha256: "stage",
  };
  const state = {
    staging_batch_count: stageCount,
    staging_row_count: stageRows,
    selected_set_count: selected ? 1 : 0,
    selected_card_count: selected ? 2 : 0,
    selected_identity_count: selected ? 2 : 0,
    selected_printing_count: selected ? 3 : 0,
    selected_parent_mapping_count: selected ? 2 : 0,
    selected_printing_mapping_count: selected ? 2 : 0,
  };
  const exactRows = exact
    ? Object.fromEntries(
        Object.entries(plan.row_counts).map(([key, count]) => [
          key,
          { planned_count: count, actual_count: count, exact_count: count },
        ]),
      )
    : null;
  return {
    plan,
    state,
    stageReconciliation: {
      findings: [],
      row_count: stageRows,
      actual_hash_sha256: stageCount ? "stage" : null,
    },
    exact: exactRows,
  };
}

test("resume classifier distinguishes absent, staged, complete, and partial states", () => {
  assert.equal(classifyMtgCatalogSetStateV1(classificationValue({})), "absent");
  assert.equal(
    classifyMtgCatalogSetStateV1(classificationValue({ stageCount: 1, stageRows: 12 })),
    "staged_exact",
  );
  assert.equal(
    classifyMtgCatalogSetStateV1(
      classificationValue({ stageCount: 1, stageRows: 12, selected: 1, exact: true }),
    ),
    "complete_exact",
  );
  assert.equal(
    classifyMtgCatalogSetStateV1(
      classificationValue({ stageCount: 1, stageRows: 12, selected: 1, exact: false }),
    ),
    "partial_or_drifted",
  );
});

test("only transient infrastructure failures are automatically retryable", () => {
  assert.equal(isTransientMtgIngestionErrorV1({ code: "40001" }), true);
  assert.equal(isTransientMtgIngestionErrorV1(new Error("connection terminated")), true);
  assert.equal(isTransientMtgIngestionErrorV1(new Error("canonical collision detected")), false);
  assert.equal(isTransientMtgIngestionErrorV1(new Error("payload hash mismatch")), false);
});

test("mutation envelope contains no destructive or adjacent authority", () => {
  assert.equal(MTG_CATALOG_INGESTION_BOUNDARIES_V1.concurrency, 1);
  assert.equal(MTG_CATALOG_INGESTION_BOUNDARIES_V1.transaction_unit.includes("one_set"), true);
  for (const key of [
    "canonical_updates",
    "deletes",
    "truncates",
    "migrations",
    "release_control_writes",
    "app_visibility_activation",
    "storage_writes",
    "image_pointer_writes",
    "pricing_writes",
    "publication_writes",
    "vault_writes",
    "pokemon_mutation",
  ]) {
    assert.equal(MTG_CATALOG_INGESTION_BOUNDARIES_V1[key], false, key);
  }
});

test("future-dated sets are deferred while abstained set dates remain eligible", () => {
  assert.equal(
    isMtgCatalogBatchEligibleAsOfV1({ released_at: "2026-08-14" }, "2026-08-13"),
    false,
  );
  assert.equal(
    isMtgCatalogBatchEligibleAsOfV1({ released_at: "2026-08-13" }, "2026-08-13"),
    true,
  );
  assert.equal(isMtgCatalogBatchEligibleAsOfV1({ released_at: null }, "2026-08-13"), true);
});

test("safety ramp prefers a released example over a smaller future set", () => {
  const value = manifest();
  value.batches.push(
    batch("future-expansion", 6, {
      source_set_id: "set-future-expansion",
      released_at: "2026-09-01",
      candidate_count: 1,
      total_staging_rows: 5,
    }),
  );
  value.coverage.total_set_count = value.batches.length;
  const order = buildMtgCatalogExecutionOrderV1(value);
  assert.equal(order[0].code, "msh");
  assert.equal(order.findIndex((row) => row.code === "future-expansion"), order.length - 1);
});
