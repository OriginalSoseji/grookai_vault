import { createHash } from "node:crypto";

import { stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";

export const MTG_CATALOG_INGESTION_ENVELOPE_VERSION =
  "MTG_CANONICAL_CATALOG_INGESTION_ENVELOPE_V1";
export const MTG_CATALOG_INGESTION_APPROVAL_ENV =
  "MTG_CANONICAL_CATALOG_INGESTION_APPROVAL";

export const MTG_CATALOG_INGESTION_BOUNDARIES_V1 = Object.freeze({
  source: "frozen_full_catalog_manifest_and_exact_payload_inventory",
  execution_order: "deterministic_safety_ramp_then_manifest_ordinal",
  release_date_policy: "future_dated_sets_deferred_before_database_access",
  transaction_unit: "one_set_one_stage_transaction_then_one_promotion_transaction",
  concurrency: 1,
  resume_authority: "database_exact_readback",
  automatic_transient_retries: 3,
  structural_failure_behavior: "stop_before_next_set",
  required_release_status: "hidden",
  staging_inserts: true,
  canonical_inserts: true,
  canonical_updates: false,
  deletes: false,
  truncates: false,
  migrations: false,
  release_control_writes: false,
  app_visibility_activation: false,
  storage_writes: false,
  image_pointer_writes: false,
  pricing_writes: false,
  publication_writes: false,
  vault_writes: false,
  pokemon_mutation: false,
});

export function sha256MtgIngestionV1(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sumBatchCounts(batches) {
  const totals = {
    sets: 0,
    card_prints: 0,
    card_print_identity: 0,
    card_printings: 0,
    external_mappings: 0,
    external_printing_mappings: 0,
    staged_and_canonical_rows: 0,
  };
  for (const batch of batches) {
    totals.sets += 1;
    totals.card_prints += Number(batch.candidate_count);
    totals.card_print_identity += Number(batch.candidate_count);
    totals.card_printings += Number(batch.card_printings);
    totals.external_mappings += Number(batch.candidate_count);
    totals.external_printing_mappings += Number(batch.external_printing_mappings);
    totals.staged_and_canonical_rows += Number(batch.total_staging_rows) * 2;
  }
  return totals;
}

function compareBatch(left, right) {
  return (
    Number(left.total_staging_rows) - Number(right.total_staging_rows) ||
    Number(left.ordinal) - Number(right.ordinal) ||
    left.code.localeCompare(right.code)
  );
}

export function buildMtgCatalogSafetyRampV1(manifest) {
  const remaining = manifest.batches.filter(
    (batch) => batch.catalog_state !== "already_canonical_dsk",
  );
  const asOf = manifest.bounded_stage_selection_policy?.as_of ?? "9999-12-31";
  const eligible = remaining.filter((batch) => isMtgCatalogBatchEligibleAsOfV1(batch, asOf));
  const selected = [];
  const selectedIds = new Set();
  const add = (batch, reason) => {
    if (!batch || selectedIds.has(batch.source_set_id)) return;
    selectedIds.add(batch.source_set_id);
    selected.push({ ...batch, safety_ramp_reason: reason });
  };

  add(remaining.find((batch) => batch.code === "msh"), "previously_rollback_proven_additive_set");

  const setTypes = [...new Set(remaining.map((batch) => batch.set_type))].sort();
  for (const setType of setTypes) {
    const candidate = eligible
      .filter((batch) => batch.set_type === setType)
      .sort(compareBatch)[0];
    add(candidate, `smallest_payload_for_set_type:${setType}`);
  }

  add(
    eligible
      .filter(
        (batch) =>
          batch.release_date_resolution ===
          "card_level_values_preserved_set_level_abstained",
      )
      .sort(compareBatch)[0],
    "set_release_date_abstention",
  );
  add(
    eligible.filter((batch) => batch.external_printing_mappings === 0).sort(compareBatch)[0],
    "zero_tcgplayer_mapping_lane",
  );
  add(
    eligible.filter((batch) => batch.quarantined_collision_lanes > 0).sort(compareBatch)[0],
    "quarantined_ambiguous_source_lane",
  );

  for (const batch of [...eligible].sort(compareBatch)) {
    if (selected.length >= 25) break;
    add(batch, "bounded_small_payload_fill");
  }
  return selected.slice(0, 25);
}

export function buildMtgCatalogExecutionOrderV1(manifest) {
  const ramp = buildMtgCatalogSafetyRampV1(manifest);
  const selected = new Set(ramp.map((batch) => batch.source_set_id));
  const rest = manifest.batches
    .filter(
      (batch) =>
        batch.catalog_state !== "already_canonical_dsk" &&
        !selected.has(batch.source_set_id),
    )
    .sort(
      (left, right) =>
        Number(left.ordinal) - Number(right.ordinal) || left.code.localeCompare(right.code),
    )
    .map((batch) => ({ ...batch, safety_ramp_reason: "manifest_ordinal" }));
  return [...ramp, ...rest].map((batch, executionOrdinal) => ({
    ...batch,
    execution_ordinal: executionOrdinal,
    safety_phase:
      executionOrdinal === 0
        ? "additive_proof"
        : executionOrdinal < 25
          ? "stratified_canary"
          : "full_catalog",
  }));
}

export function validateMtgCatalogManifestForIngestionV1(manifest) {
  const findings = [];
  if (manifest.version !== "MTG_CANONICAL_CATALOG_BATCH_MANIFEST_V1") {
    findings.push("manifest_version_mismatch");
  }
  if (manifest.status !== "full_catalog_batches_frozen") {
    findings.push("manifest_not_frozen");
  }
  if (!Array.isArray(manifest.findings) || manifest.findings.length !== 0) {
    findings.push("manifest_has_findings");
  }
  if (!Array.isArray(manifest.batches) || manifest.batches.length === 0) {
    findings.push("manifest_batches_missing");
    return findings;
  }
  if (Number(manifest.coverage?.total_set_count) !== manifest.batches.length) {
    findings.push("manifest_set_count_mismatch");
  }
  const dsk = manifest.batches.filter(
    (batch) => batch.catalog_state === "already_canonical_dsk",
  );
  if (dsk.length !== 1 || dsk[0]?.code !== "dsk") findings.push("dsk_baseline_mismatch");
  const sourceSetIds = manifest.batches.map((batch) => batch.source_set_id);
  const codes = manifest.batches.map((batch) => batch.code.toLowerCase());
  const fingerprints = manifest.batches.map((batch) => batch.writer_payload_fingerprint);
  const payloadHashes = manifest.batches.map((batch) => batch.payload_file_sha256);
  if (new Set(sourceSetIds).size !== sourceSetIds.length) findings.push("duplicate_source_set_id");
  if (new Set(codes).size !== codes.length) findings.push("duplicate_set_code");
  if (new Set(fingerprints).size !== fingerprints.length) {
    findings.push("duplicate_payload_fingerprint");
  }
  if (new Set(payloadHashes).size !== payloadHashes.length) {
    findings.push("duplicate_payload_file_hash");
  }
  for (const batch of manifest.batches) {
    if (!/^[0-9a-f]{64}$/.test(batch.writer_payload_fingerprint)) {
      findings.push(`invalid_payload_fingerprint:${batch.code}`);
    }
    if (!/^[0-9a-f]{64}$/.test(batch.payload_file_sha256)) {
      findings.push(`invalid_payload_file_hash:${batch.code}`);
    }
    if (Number(batch.total_staging_rows) <= 0 || Number(batch.candidate_count) <= 0) {
      findings.push(`empty_set_payload:${batch.code}`);
    }
  }
  const order = buildMtgCatalogExecutionOrderV1(manifest);
  if (order.length !== manifest.batches.length - 1) {
    findings.push("execution_order_count_mismatch");
  }
  if (order[0]?.code !== "msh") findings.push("msh_not_first_execution_set");
  return [...new Set(findings)];
}

export function validateMtgPayloadInventoryV1(manifest, inventory) {
  const findings = [];
  const bySet = new Map(inventory.map((entry) => [entry.source_set_id, entry]));
  if (inventory.length !== manifest.batches.length) findings.push("payload_inventory_count_mismatch");
  for (const batch of manifest.batches) {
    const entry = bySet.get(batch.source_set_id);
    if (!entry) {
      findings.push(`payload_missing:${batch.code}`);
      continue;
    }
    if (entry.code !== batch.code) findings.push(`payload_code_mismatch:${batch.code}`);
    if (entry.payload_file_sha256 !== batch.payload_file_sha256) {
      findings.push(`payload_file_hash_mismatch:${batch.code}`);
    }
    if (entry.writer_payload_fingerprint !== batch.writer_payload_fingerprint) {
      findings.push(`payload_fingerprint_mismatch:${batch.code}`);
    }
    if (Number(entry.total_staging_rows) !== Number(batch.total_staging_rows)) {
      findings.push(`payload_row_count_mismatch:${batch.code}`);
    }
  }
  return [...new Set(findings)];
}

export function buildMtgCatalogIngestionEnvelopeV1({
  manifest,
  manifestSha256,
  payloadInventory,
  repository,
}) {
  const findings = [
    ...validateMtgCatalogManifestForIngestionV1(manifest),
    ...validateMtgPayloadInventoryV1(manifest, payloadInventory),
  ];
  if (findings.length > 0) {
    throw new Error(`MTG ingestion envelope blocked: ${findings.join(", ")}`);
  }
  const executionOrder = buildMtgCatalogExecutionOrderV1(manifest);
  const payloadInventorySha256 = sha256MtgIngestionV1(stableJson(payloadInventory));
  const counts = sumBatchCounts(executionOrder);
  const contract = {
    version: MTG_CATALOG_INGESTION_ENVELOPE_VERSION,
    manifest_sha256: manifestSha256,
    source_bulk_sha256: manifest.source.bulk_sha256,
    warehouse_sha256: manifest.source.warehouse_sha256,
    payload_inventory_sha256: payloadInventorySha256,
    governing_commit_sha: repository.governing_commit_sha,
    governing_files_sha256: repository.governing_files_sha256,
    total_manifest_sets: manifest.batches.length,
    already_canonical_sets: 1,
    authorized_remaining_sets: executionOrder.length,
    authorized_counts: counts,
    safety_ramp: {
      additive_proof_sets: 1,
      stratified_canary_sets: Math.min(24, Math.max(0, executionOrder.length - 1)),
      automatic_gate_ordinals: [1, 25, executionOrder.length],
      no_human_pause_between_clean_gates: true,
    },
    set_type_coverage: Object.fromEntries(
      [...new Set(executionOrder.map((batch) => batch.set_type))]
        .sort()
        .map((setType) => [
          setType,
          executionOrder.filter((batch) => batch.set_type === setType).length,
        ]),
    ),
    boundaries: MTG_CATALOG_INGESTION_BOUNDARIES_V1,
  };
  const envelopeSha256 = sha256MtgIngestionV1(stableJson(contract));
  const approvalMessage =
    `I authorize the hidden, resumable MTG canonical catalog ingestion envelope ` +
    `${envelopeSha256} for frozen manifest ${manifestSha256}, payload inventory ` +
    `${payloadInventorySha256}, governing code commit ${repository.governing_commit_sha}, ` +
    `and governing source hash ${repository.governing_files_sha256}. It may process ` +
    `up to ${executionOrder.length} remaining frozen MTG sets as isolated insert-only ` +
    `transactions, creating at most ${counts.card_prints} card_prints, ` +
    `${counts.card_print_identity} identity rows, ${counts.card_printings} printings, ` +
    `${counts.external_mappings} Scryfall mappings, and ` +
    `${counts.external_printing_mappings} TCGPlayer printing mappings. It may resume ` +
    `and retry transient failures within the frozen envelope without additional ` +
    `per-set approval. I do not authorize migrations, release-control changes, ` +
    `signed-in or public MTG visibility, images, Storage, image pointers, pricing ` +
    `publication, Vault writes, Pokemon mutation, updates, deletes, truncates, ` +
    `cleanup, payload substitution, or rows outside this envelope.`;
  return {
    ...contract,
    envelope_sha256: envelopeSha256,
    approval_sha256: sha256MtgIngestionV1(approvalMessage),
    required_approval_message: approvalMessage,
    execution_order: executionOrder,
  };
}

export function classifyMtgCatalogSetStateV1({ plan, state, stageReconciliation, exact }) {
  const selectedExpected = {
    selected_set_count: plan.row_counts.sets,
    selected_card_count: plan.row_counts.card_prints,
    selected_identity_count: plan.row_counts.card_print_identity,
    selected_printing_count: plan.row_counts.card_printings,
    selected_parent_mapping_count: plan.row_counts.external_mappings,
    selected_printing_mapping_count: plan.row_counts.external_printing_mappings,
  };
  const selectedCounts = Object.keys(selectedExpected).map((key) => Number(state[key]));
  const canonicalAbsent = selectedCounts.every((count) => count === 0);
  const canonicalCountsExact = Object.entries(selectedExpected).every(
    ([key, expected]) => Number(state[key]) === Number(expected),
  );
  const exactReadback =
    exact &&
    Object.entries(plan.row_counts).every(([key, count]) => {
      const row = exact[key];
      return (
        Number(row?.planned_count) === Number(count) &&
        Number(row?.actual_count) === Number(count) &&
        Number(row?.exact_count) === Number(count)
      );
    });
  const stagingAbsent =
    Number(state.staging_batch_count) === 0 && Number(state.staging_row_count) === 0;
  const stagingExact =
    Number(state.staging_batch_count) === 1 &&
    Number(state.staging_row_count) === Number(plan.staging_contract.staged_row_count) &&
    stageReconciliation?.findings?.length === 0 &&
    stageReconciliation?.actual_hash_sha256 === plan.staging_rows_sha256;

  if (canonicalCountsExact && exactReadback && stagingExact) return "complete_exact";
  if (canonicalAbsent && stagingExact) return "staged_exact";
  if (canonicalAbsent && stagingAbsent) return "absent";
  return "partial_or_drifted";
}

export function isTransientMtgIngestionErrorV1(error) {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    ["40001", "40P01", "55P03", "57014", "57P01", "08000", "08003", "08006"].includes(code) ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("connection terminated") ||
    message.includes("connection closed") ||
    message.includes("temporary failure")
  );
}

export function isMtgCatalogBatchEligibleAsOfV1(batch, asOf) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("asOf must be YYYY-MM-DD");
  return !batch.released_at || batch.released_at <= asOf;
}
