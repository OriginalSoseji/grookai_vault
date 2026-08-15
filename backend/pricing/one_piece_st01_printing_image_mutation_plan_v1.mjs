import { sha256, stableJson } from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
} from "./one_piece_st01_printing_image_readiness_v1.mjs";

export const ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_VERSION =
  "ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_V1";

export const ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PINNED_INPUTS =
  Object.freeze({
    evidence_plan_sha256:
      "03555a96673106898ba66840a642402201c9a2a61e7037d70bf9f9a68b2a0a6e",
    readiness_rows_sha256:
      "99fa8c771087d30cfa4485acb36416894e61f22854213fd204de6ae795a38035",
    readiness_summary_sha256:
      "b08b96c320b0c509bf3061729091265339ccc51c10b4cb7d026f12a973997578",
    production_readback_sha256:
      "114281953ff2fb57834dbfc5db7c15369e72b35b8514feceacb1c5f1c8de3b04",
  });

const POINTER_UPDATE_COLUMNS = Object.freeze([
  "image_source", "image_path", "image_status", "image_note",
  "data_quality_flags",
]);
const POINTER_FORBIDDEN_COLUMNS = Object.freeze([
  "id", "game_id", "set_id", "set_code", "name", "number", "gv_id",
  "image_url", "image_alt_url", "identity_domain", "print_identity_key",
]);

function mapBy(rows, key) {
  return new Map((rows ?? []).map((row) => [String(row[key]), row]));
}

export function expectedOnePieceSt01PrintingImageAttributionV1() {
  return [
    { table_name: "card_prints", inserted: 0, updated: 17, deleted: 0,
      hot_updated: 0 },
    { table_name: "card_printings", inserted: 14, updated: 0, deleted: 0,
      hot_updated: 0 },
    { table_name: "external_printing_mappings", inserted: 14, updated: 0,
      deleted: 0, hot_updated: 0 },
  ];
}

function buildPointerUpdate(row, liveParent) {
  const proposed = row.parent_artwork_pointer_readiness.proposed_values;
  return {
    card_print_id: row.parent_card_print_id,
    gv_id: row.parent_gv_id,
    card_number: row.card_number,
    expected_before: {
      image_source: liveParent.image_source,
      image_path: liveParent.image_path,
      image_url: liveParent.image_url,
      image_alt_url: liveParent.image_alt_url,
      image_status: liveParent.image_status,
      image_note: liveParent.image_note,
      data_quality_flags: liveParent.data_quality_flags,
    },
    proposed_values: {
      image_source: "identity",
      image_path: proposed.image_path,
      image_status: proposed.image_status,
      image_note: proposed.image_note,
      data_quality_flags: {
        ...liveParent.data_quality_flags,
        image_pointer_deferred: false,
        exact_printing_children_deferred: true,
      },
    },
    allowed_update_columns: [...POINTER_UPDATE_COLUMNS],
    forbidden_update_columns: [...POINTER_FORBIDDEN_COLUMNS],
    physical_finish_claim: false,
    storage_write_required: false,
  };
}

function normalizeChild(row) {
  return structuredClone(row.child_printing_readiness.proposed_row);
}

function normalizeMapping(row) {
  return structuredClone(
    row.child_printing_readiness.proposed_external_printing_mapping,
  );
}

export function buildOnePieceSt01PrintingImageMutationPlanV1({
  repository,
  inputHashes,
  evidencePlan,
  readinessRows,
  readinessSummary,
  productionReadback,
}) {
  if (stableJson(inputHashes) !==
      stableJson(ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PINNED_INPUTS)) {
    throw new Error("Pinned ST-01 mutation-plan evidence inputs changed");
  }
  if (evidencePlan?.version !== ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION ||
      readinessSummary?.version !== ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION ||
      readinessSummary?.status !== "pass_with_expected_finish_taxonomy_blockers" ||
      readinessSummary?.findings?.length !== 0 ||
      readinessSummary?.readiness_fingerprint_sha256 !==
        "430a9b54a5820078934fbf6900cc6ebc7073c86514ed912cb10af26a679251b1") {
    throw new Error("Readiness proof is not the exact passing producer");
  }
  if (productionReadback?.transaction_read_only !== true ||
      productionReadback?.release?.release_status !== "hidden" ||
      productionReadback?.release?.anon_visible !== false ||
      productionReadback?.release?.authenticated_visible !== false ||
      productionReadback?.release?.service_visible !== false ||
      (productionReadback?.existing_children ?? []).length !== 0 ||
      (productionReadback?.existing_printing_mappings ?? []).length !== 0 ||
      Object.values(productionReadback?.collisions ?? {})
        .some((value) => Number(value) !== 0)) {
    throw new Error("Production readiness readback is not a clean hidden baseline");
  }

  const evidenceByCard = mapBy(evidencePlan.rows, "card_number");
  const parentById = mapBy(productionReadback.parents, "id");
  const pointerUpdates = [];
  const childInserts = [];
  const mappingInserts = [];
  const foilBlockers = [];

  for (const row of readinessRows) {
    const evidence = evidenceByCard.get(String(row.card_number));
    const liveParent = parentById.get(String(row.parent_card_print_id));
    if (!evidence || !liveParent ||
        stableJson(row.source_finish_evidence) !==
          stableJson(evidence.source_finish_evidence) ||
        row.parent_artwork_pointer_readiness.status !==
          "ready_for_separate_guarded_apply") {
      throw new Error(`Readiness row drift for ${row.card_number}`);
    }
    pointerUpdates.push(buildPointerUpdate(row, liveParent));
    if (row.child_printing_readiness.status ===
        "ready_for_separate_guarded_apply") {
      childInserts.push(normalizeChild(row));
      mappingInserts.push(normalizeMapping(row));
    } else if (row.child_printing_readiness.status ===
        "blocked_finish_taxonomy") {
      foilBlockers.push({
        card_number: row.card_number,
        name: row.name,
        parent_card_print_id: row.parent_card_print_id,
        parent_gv_id: row.parent_gv_id,
        source_product_id: row.source_product_id,
        source_finish_subtype: row.source_finish_evidence.subtype_name_normalized,
        blocker: row.child_printing_readiness.blocker,
        proposed_child_row: null,
        proposed_mapping_row: null,
      });
    } else {
      throw new Error(`Unexpected readiness status for ${row.card_number}`);
    }
  }

  const mutationPayload = {
    parent_pointer_updates: pointerUpdates,
    normal_child_inserts: childInserts,
    external_printing_mapping_inserts: mappingInserts,
    foil_taxonomy_blockers: foilBlockers,
  };
  const expectedTransactionReadback = {
    parent_pointer_rows: pointerUpdates.map((row) => ({
      id: row.card_print_id,
      gv_id: row.gv_id,
      image_source: row.proposed_values.image_source,
      image_path: row.proposed_values.image_path,
      image_url: null,
      image_alt_url: null,
      image_status: row.proposed_values.image_status,
      image_note: row.proposed_values.image_note,
      data_quality_flags: row.proposed_values.data_quality_flags,
    })),
    normal_child_rows: childInserts,
    external_printing_mapping_rows: mappingInserts,
    foil_child_rows: [],
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_visible: false,
  };
  const expectedPostRollback = {
    parent_pointer_rows: pointerUpdates.map((row) => ({
      id: row.card_print_id,
      gv_id: row.gv_id,
      ...row.expected_before,
    })),
    child_rows: [],
    external_printing_mapping_rows: [],
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_visible: false,
  };
  const core = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_VERSION,
    repository,
    input_hashes: inputHashes,
    readiness_fingerprint_sha256:
      readinessSummary.readiness_fingerprint_sha256,
    mutation_payload_fingerprint_sha256: sha256(stableJson(mutationPayload)),
    counts: {
      parent_pointer_updates: 17,
      normal_child_inserts: 14,
      external_printing_mapping_inserts: 14,
      foil_taxonomy_blockers: 3,
      child_image_pointer_writes: 0,
    },
    mutation_payload: mutationPayload,
    rollback_contract: {
      transaction_must_rollback: true,
      durable_commit_forbidden: true,
      expected_attributable_writes:
        expectedOnePieceSt01PrintingImageAttributionV1(),
      expected_transaction_readback: expectedTransactionReadback,
      expected_post_rollback_zero_residue: expectedPostRollback,
    },
    timeouts: {
      lock_timeout: "5s",
      statement_timeout: "120s",
      idle_in_transaction_session_timeout: "60s",
    },
    boundaries: {
      offline_plan_only: true,
      execution_mode_present: false,
      database_access: false,
      durable_database_writes: false,
      storage_writes: false,
      child_image_pointer_writes: false,
      foil_child_writes: false,
      don_writes: false,
      sealed_writes: false,
      pricing_writes: false,
      publication_writes: false,
      vault_writes: false,
      app_visibility_changes: false,
    },
  };
  return {
    ...core,
    mutation_plan_fingerprint_sha256: sha256(stableJson(core)),
  };
}

export function validateOnePieceSt01PrintingImageMutationPlanV1(plan) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { mutation_plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PLAN_VERSION,
    "plan_version_mismatch");
  add(plan?.mutation_plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "plan_fingerprint_mismatch");
  add(plan?.mutation_payload_fingerprint_sha256 !==
    sha256(stableJson(plan?.mutation_payload)), "payload_fingerprint_mismatch");
  add(stableJson(plan?.input_hashes) !==
    stableJson(ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PINNED_INPUTS),
  "input_hashes_mismatch");
  add(stableJson(plan?.counts) !== stableJson({
    parent_pointer_updates: 17,
    normal_child_inserts: 14,
    external_printing_mapping_inserts: 14,
    foil_taxonomy_blockers: 3,
    child_image_pointer_writes: 0,
  }), "count_contract_mismatch");
  const payload = plan?.mutation_payload ?? {};
  add((payload.parent_pointer_updates ?? []).length !== 17,
    "pointer_update_count_mismatch");
  add((payload.normal_child_inserts ?? []).length !== 14,
    "child_insert_count_mismatch");
  add((payload.external_printing_mapping_inserts ?? []).length !== 14,
    "mapping_insert_count_mismatch");
  add((payload.foil_taxonomy_blockers ?? []).length !== 3,
    "foil_blocker_count_mismatch");
  add(stableJson(plan?.rollback_contract?.expected_attributable_writes) !==
    stableJson(expectedOnePieceSt01PrintingImageAttributionV1()),
  "rollback_attribution_contract_mismatch");
  add(plan?.rollback_contract?.transaction_must_rollback !== true ||
      plan?.rollback_contract?.durable_commit_forbidden !== true,
  "rollback_boundary_open");
  add(plan?.boundaries?.offline_plan_only !== true ||
      plan?.boundaries?.execution_mode_present !== false ||
      plan?.boundaries?.database_access !== false,
  "offline_boundary_open");
  for (const key of ["durable_database_writes", "storage_writes",
    "child_image_pointer_writes", "foil_child_writes", "don_writes",
    "sealed_writes", "pricing_writes", "publication_writes", "vault_writes",
    "app_visibility_changes"]) {
    add(plan?.boundaries?.[key] !== false, `boundary_open:${key}`);
  }
  const ids = new Set();
  const gvIds = new Set();
  for (const child of payload.normal_child_inserts ?? []) {
    add(child.finish_key !== "normal" || child.is_provisional !== false,
      `invalid_normal_child:${child.id ?? "unknown"}`);
    add(Boolean(child.image_source || child.image_path || child.image_url ||
      child.image_alt_url || child.image_status || child.image_note),
    `child_image_claim_present:${child.id ?? "unknown"}`);
    add(ids.has(child.id), `duplicate_child_id:${child.id}`);
    add(gvIds.has(child.printing_gv_id),
      `duplicate_printing_gv_id:${child.printing_gv_id}`);
    ids.add(child.id);
    gvIds.add(child.printing_gv_id);
  }
  for (const update of payload.parent_pointer_updates ?? []) {
    add(stableJson(update.allowed_update_columns) !==
      stableJson(POINTER_UPDATE_COLUMNS),
    `pointer_allowed_columns_mismatch:${update.card_number}`);
    add(update.proposed_values?.data_quality_flags?.image_pointer_deferred !==
      false ||
      update.proposed_values?.data_quality_flags
        ?.exact_printing_children_deferred !== true,
    `pointer_flag_transition_mismatch:${update.card_number}`);
    add(update.proposed_values?.image_source !== "identity",
      `pointer_image_source_mismatch:${update.card_number}`);
    add(update.expected_before?.image_path !== null ||
      update.expected_before?.image_url !== null ||
      update.expected_before?.image_alt_url !== null,
    `pointer_expected_before_not_empty:${update.card_number}`);
    add(update.physical_finish_claim !== false ||
      update.storage_write_required !== false,
    `pointer_evidence_boundary_mismatch:${update.card_number}`);
  }
  for (const blocker of payload.foil_taxonomy_blockers ?? []) {
    add(blocker.source_finish_subtype !== "foil" ||
      blocker.proposed_child_row !== null ||
      blocker.proposed_mapping_row !== null,
    `foil_blocker_invalid:${blocker.card_number}`);
  }
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function evaluateOnePieceSt01PrintingImageAttributionV1(rows) {
  const expected = expectedOnePieceSt01PrintingImageAttributionV1();
  const normalized = (rows ?? []).map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  }));
  const findings = [];
  for (const expectedRow of expected) {
    const actual = normalized.find((row) =>
      row.table_name === expectedRow.table_name);
    if (stableJson(actual) !== stableJson(expectedRow)) {
      findings.push(`attributable_write_mismatch:${expectedRow.table_name}`);
    }
  }
  for (const row of normalized) {
    if (!expected.some((expectedRow) =>
      expectedRow.table_name === row.table_name)) {
      findings.push(`unexpected_attributable_write:${row.table_name}`);
    }
  }
  return [...new Set(findings)];
}

export function evaluateOnePieceSt01PrintingImageTransactionReadbackV1({
  plan,
  readback,
}) {
  const findings = [];
  const expected = plan?.rollback_contract?.expected_transaction_readback;
  for (const key of ["parent_pointer_rows", "normal_child_rows",
    "external_printing_mapping_rows", "foil_child_rows", "release_status",
    "anon_visible", "authenticated_visible", "service_visible"]) {
    if (stableJson(readback?.[key]) !== stableJson(expected?.[key])) {
      findings.push(`transaction_readback_mismatch:${key}`);
    }
  }
  return findings;
}

export function evaluateOnePieceSt01PrintingImageZeroResidueV1({
  plan,
  readback,
}) {
  const findings = [];
  const expected = plan?.rollback_contract?.expected_post_rollback_zero_residue;
  for (const key of ["parent_pointer_rows", "child_rows",
    "external_printing_mapping_rows", "release_status", "anon_visible",
    "authenticated_visible", "service_visible"]) {
    if (stableJson(readback?.[key]) !== stableJson(expected?.[key])) {
      findings.push(`post_rollback_residue:${key}`);
    }
  }
  return findings;
}

export const ONE_PIECE_ST01_POINTER_UPDATE_COLUMNS = POINTER_UPDATE_COLUMNS;
export const ONE_PIECE_ST01_POINTER_FORBIDDEN_COLUMNS =
  POINTER_FORBIDDEN_COLUMNS;
