import { gunzipSync } from "node:zlib";

import {
  PINNED_ONE_PIECE_MANIFEST_SHA256,
  sha256,
  stableJson,
  verifyOnePieceRollbackCanaryPlanV1,
} from "./one_piece_canonical_import_staging_v1.mjs";

export const ONE_PIECE_ROLLBACK_EXECUTOR_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_ROLLBACK_CANARY_EXECUTOR_V1";
export const ONE_PIECE_POST_ROLLBACK_VERIFIER_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_POST_ROLLBACK_VERIFIER_V1";
export const PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256 =
  "7eece6ff093de56b5cbea6a0a1f03a5a9b469789f11de233ac9fab90b4e80591";
export const PINNED_ONE_PIECE_CANARY_PLAN_SHA256 =
  "174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90";
export const ONE_PIECE_ROLLBACK_APPROVAL =
  `EXECUTE_ROLLBACK_ONLY_ONE_PIECE_CANARY:${PINNED_ONE_PIECE_CANARY_PLAN_SHA256}:` +
  `${PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256}:ZERO_DURABLE_ROWS`;

export const ONE_PIECE_STAGING_OBJECTS = Object.freeze({
  tables: [
    "public.one_piece_canonical_import_batches",
    "public.one_piece_canonical_import_rows",
  ],
  function:
    "public.one_piece_canonical_import_reject_mutation_v1()",
  policies: [
    "one_piece_import_batches_service_select",
    "one_piece_import_batches_service_insert",
    "one_piece_import_rows_service_select",
    "one_piece_import_rows_service_insert",
  ],
  triggers: [
    "one_piece_canonical_import_batches_immutable",
    "one_piece_canonical_import_rows_immutable",
  ],
  indexes: [
    "one_piece_canonical_import_batches_pkey",
    "one_piece_canonical_import_batches_canary_plan_fingerprint_sha256_key",
    "one_piece_canonical_import_rows_pkey",
    "one_piece_import_rows_batch_product_key",
    "one_piece_import_rows_batch_ordinal_key",
    "one_piece_canonical_import_rows_batch_idx",
  ],
  migration_version: "20260814010000",
});

export const PROTECTED_TABLES_V1 = Object.freeze([
  // Canonical identity.
  "public.games",
  "public.sets",
  "public.card_prints",
  "public.card_print_identity",
  "public.card_print_identity_source_evidence",
  "public.card_printings",
  "public.external_mappings",
  "public.external_printing_mappings",
  // Independent sealed domain, including expected future table names.
  "public.sealed_products",
  "public.sealed_product_printings",
  "public.sealed_external_mappings",
  "public.sealed_product_prices",
  "public.sealed_product_price_observations",
  // Governed publication and release controls.
  "public.market_price_publication_sets",
  "public.market_price_current_publication",
  "public.market_price_publication_events",
  "public.market_price_publication_snapshots",
  "public.market_price_pipeline_candidates",
  "public.market_price_qualification_decisions",
  "public.catalog_game_release_controls",
  // Pricing evidence and operational state.
  "public.card_prices",
  "public.card_price_observations",
  "public.card_price_rollups",
  "public.card_price_ticks",
  "public.market_prices",
  "public.prices",
  "public.pricing_observations",
  "public.pricing_jobs",
  "public.pricing_watch",
  // Vault ownership.
  "public.vault_items",
  "public.vault_item_instances",
  "public.vault_owners",
  // Active MTG staging state.
  "public.mtg_canonical_import_batches",
  "public.mtg_canonical_import_rows",
  // Migration ledger.
  "supabase_migrations.schema_migrations",
]);

function parseManifestRows(logicalManifest) {
  return logicalManifest
    .toString("utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid readiness manifest line ${index + 1}: ${error.message}`);
      }
    });
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function stripExactMigrationTransactionV1(sql) {
  if (typeof sql !== "string") throw new Error("Migration draft must be text");
  const beginMatches = sql.match(/^\s*begin;\s*/i) ?? [];
  const commitMatches = sql.match(/\s*commit;\s*$/i) ?? [];
  if (beginMatches.length === 0 || commitMatches.length === 0) {
    throw new Error("Migration draft must have exact outer BEGIN and COMMIT delimiters");
  }
  const inner = sql
    .replace(/^\s*begin;\s*/i, "")
    .replace(/\s*commit;\s*$/i, "");
  if (!inner.trim() || /(^|\n)\s*(begin|commit|rollback);\s*($|\n)/i.test(inner)) {
    throw new Error("Migration draft contains a nested transaction boundary");
  }
  return inner;
}

export function verifyOnePieceRollbackExecutionInputsV1({
  plan,
  migrationDraft,
  compressedManifest,
}) {
  const issues = [];
  const migrationDraftSha256 = sha256(migrationDraft);
  let logicalManifest;
  try {
    logicalManifest = gunzipSync(compressedManifest);
  } catch (error) {
    throw new Error(`Readiness manifest cannot be decompressed: ${error.message}`);
  }
  const manifestLogicalSha256 = sha256(logicalManifest);
  const integrity = verifyOnePieceRollbackCanaryPlanV1(plan, {
    manifestLogicalSha256: PINNED_ONE_PIECE_MANIFEST_SHA256,
    migrationDraftSha256: PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256,
  });
  issues.push(...integrity.errors);
  if (plan?.canary_plan_fingerprint_sha256 !== PINNED_ONE_PIECE_CANARY_PLAN_SHA256) {
    issues.push("pinned_canary_plan_fingerprint_mismatch");
  }
  if (migrationDraftSha256 !== PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256) {
    issues.push("pinned_migration_draft_sha256_mismatch");
  }
  if (manifestLogicalSha256 !== PINNED_ONE_PIECE_MANIFEST_SHA256) {
    issues.push("pinned_manifest_logical_sha256_mismatch");
  }
  if (plan?.manifest_logical_sha256 !== manifestLogicalSha256) {
    issues.push("plan_manifest_logical_sha256_mismatch");
  }
  if (plan?.migration_draft_sha256 !== migrationDraftSha256) {
    issues.push("plan_migration_draft_sha256_mismatch");
  }
  if (plan?.selected_group?.source_group_id !== 3189) {
    issues.push("selected_group_id_mismatch");
  }
  if (plan?.staging_rows?.length !== 21 || plan?.counts?.source_products !== 21) {
    issues.push("selected_source_row_count_mismatch");
  }
  if (plan?.batch?.authorized_durable_batch_rows !== 0) {
    issues.push("durable_batch_authority_nonzero");
  }
  if (plan?.batch?.authorized_durable_staging_rows !== 0) {
    issues.push("durable_staging_authority_nonzero");
  }

  const manifestRows = parseManifestRows(logicalManifest);
  const selectedManifestRows = manifestRows
    .filter((row) => Number(row.source_group_id) === 3189)
    .sort((left, right) => Number(left.source_product_id) - Number(right.source_product_id));
  const plannedPayloads = (plan?.staging_rows ?? [])
    .map((row) => row.payload)
    .sort((left, right) => Number(left.source_product_id) - Number(right.source_product_id));
  if (selectedManifestRows.length !== 21) issues.push("manifest_selected_group_count_mismatch");
  if (stableJson(selectedManifestRows) !== stableJson(plannedPayloads)) {
    issues.push("plan_source_payload_drift");
  }
  const duplicateManifestIds = duplicateValues(
    manifestRows.map((row) => Number(row.source_product_id)),
  );
  if (duplicateManifestIds.length > 0) issues.push("manifest_duplicate_source_product_ids");

  let migrationInnerBody = null;
  try {
    migrationInnerBody = stripExactMigrationTransactionV1(migrationDraft.toString("utf8"));
  } catch (error) {
    issues.push(`migration_wrapper_invalid:${error.message}`);
  }
  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)],
    migration_draft_sha256: migrationDraftSha256,
    manifest_logical_sha256: manifestLogicalSha256,
    manifest_row_count: manifestRows.length,
    selected_manifest_row_count: selectedManifestRows.length,
    migration_inner_body: migrationInnerBody,
  };
}

export function buildOnePieceSourceExpectationV1(plan) {
  const products = plan.staging_rows
    .map((row) => ({
      source_product_id: Number(row.payload.source_product_id),
      source_category_id: Number(row.payload.source_category_id),
      source_group_id: Number(row.payload.source_group_id),
      payload_hash: row.payload.source_payload_hash,
      source_active: row.payload.source_active,
      catalog_metadata_status: row.payload.source_catalog_metadata_status,
    }))
    .sort((left, right) => left.source_product_id - right.source_product_id);
  const priceLanes = plan.staging_rows
    .flatMap((row) =>
      (row.payload.source_price_lanes ?? []).map((lane) => ({
        source_product_id: Number(row.payload.source_product_id),
        source_price_row_identity: lane.source_price_row_identity,
        subtype_name_normalized: lane.subtype_name_normalized,
        observed_on: lane.observed_on,
        positive_market_signal: lane.positive_market_signal,
      })),
    )
    .sort(
      (left, right) =>
        left.source_product_id - right.source_product_id ||
        left.source_price_row_identity.localeCompare(right.source_price_row_identity) ||
        left.observed_on.localeCompare(right.observed_on),
    );
  return {
    category_id: 68,
    group: {
      group_id: 3189,
      name: plan.selected_group.source_group_name,
      published_on: plan.selected_group.released_on[0],
    },
    products,
    price_lanes: priceLanes,
  };
}

export function evaluateOnePieceSourceSnapshotV1(expectation, actual) {
  const issues = [];
  if (Number(actual?.category?.category_id) !== expectation.category_id) {
    issues.push("source_category_missing_or_changed");
  }
  if (
    Number(actual?.group?.group_id) !== expectation.group.group_id ||
    actual?.group?.name !== expectation.group.name ||
    actual?.group?.published_on !== expectation.group.published_on ||
    actual?.group?.source_active !== true ||
    actual?.group?.catalog_metadata_status !== "current"
  ) {
    issues.push("source_group_drift");
  }
  if (stableJson(actual?.products ?? []) !== stableJson(expectation.products)) {
    issues.push("source_product_drift");
  }
  if (stableJson(actual?.price_lanes ?? []) !== stableJson(expectation.price_lanes)) {
    issues.push("source_price_lane_drift");
  }
  return [...new Set(issues)];
}

export function evaluateOnePieceStagingFootprintAbsentV1(footprint) {
  const issues = [];
  for (const [name, present] of Object.entries(footprint?.tables ?? {})) {
    if (present) issues.push(`staging_table_present:${name}`);
  }
  if (footprint?.function_present) issues.push("staging_function_present");
  if ((footprint?.policies ?? []).length > 0) issues.push("staging_policies_present");
  if ((footprint?.triggers ?? []).length > 0) issues.push("staging_triggers_present");
  if ((footprint?.indexes ?? []).length > 0) issues.push("staging_indexes_present");
  if (footprint?.migration_recorded) issues.push("staging_migration_recorded");
  return issues;
}

export function compareOnePieceProtectedSnapshotsV1(before, after) {
  const issues = [];
  if (stableJson(before?.tables ?? {}) !== stableJson(after?.tables ?? {})) {
    issues.push("protected_table_counts_changed");
  }
  if (stableJson(before?.mtg_scope ?? {}) !== stableJson(after?.mtg_scope ?? {})) {
    issues.push("protected_mtg_scope_changed");
  }
  return issues;
}

const MTG_PROGRESS_TABLE_SCOPE_V1 = Object.freeze({
  "public.sets": "set_count",
  "public.card_prints": "card_count",
  "public.card_print_identity": "identity_count",
  "public.card_printings": "printing_count",
  "public.external_mappings": "external_mapping_count",
  "public.external_printing_mappings": "external_printing_mapping_count",
  "public.mtg_canonical_import_batches": "staging_batch_count",
  "public.mtg_canonical_import_rows": "staging_row_count",
});

export function compareOnePieceProtectedSnapshotsAllowingMtgProgressV1(before, after) {
  const issues = [];
  const beforeTables = before?.tables ?? {};
  const afterTables = after?.tables ?? {};
  for (const relation of new Set([...Object.keys(beforeTables), ...Object.keys(afterTables)])) {
    const beforeRow = beforeTables[relation];
    const afterRow = afterTables[relation];
    if (!beforeRow || !afterRow || beforeRow.present !== afterRow.present) {
      issues.push(`protected_table_presence_changed:${relation}`);
      continue;
    }
    const scopeField = MTG_PROGRESS_TABLE_SCOPE_V1[relation];
    if (!scopeField) {
      if (stableJson(beforeRow) !== stableJson(afterRow)) {
        issues.push(`protected_non_mtg_table_changed:${relation}`);
      }
      continue;
    }
    const globalDelta = Number(afterRow.row_count) - Number(beforeRow.row_count);
    const scopeDelta =
      Number(after?.mtg_scope?.[scopeField]) - Number(before?.mtg_scope?.[scopeField]);
    if (!Number.isSafeInteger(globalDelta) || !Number.isSafeInteger(scopeDelta)) {
      issues.push(`protected_mtg_count_invalid:${relation}`);
    } else if (globalDelta < 0 || scopeDelta < 0) {
      issues.push(`protected_mtg_count_decreased:${relation}`);
    } else if (globalDelta !== scopeDelta) {
      issues.push(`protected_mtg_delta_unattributed:${relation}`);
    }
  }
  if (before?.mtg_scope?.canonical_scope !== "mtg" || after?.mtg_scope?.canonical_scope !== "mtg") {
    issues.push("protected_mtg_scope_invalid");
  }
  if (before?.mtg_scope?.game_count !== after?.mtg_scope?.game_count) {
    issues.push("protected_mtg_game_count_changed");
  }
  return [...new Set(issues)];
}

export function evaluateOnePieceTransactionSecurityV1(security) {
  const issues = [];
  for (const table of ["batch", "row"]) {
    if (security?.[`${table}_rls_enabled`] !== true) {
      issues.push(`${table}_rls_not_enabled`);
    }
    for (const role of ["anon", "authenticated"]) {
      for (const privilege of ["select", "insert", "update", "delete"]) {
        if (security?.privileges?.[role]?.[table]?.[privilege] !== false) {
          issues.push(`${role}_${table}_${privilege}_privilege_present`);
        }
      }
    }
    for (const privilege of ["select", "insert"]) {
      if (security?.privileges?.service_role?.[table]?.[privilege] !== true) {
        issues.push(`service_role_${table}_${privilege}_privilege_missing`);
      }
    }
    for (const privilege of ["update", "delete"]) {
      if (security?.privileges?.service_role?.[table]?.[privilege] !== false) {
        issues.push(`service_role_${table}_${privilege}_privilege_present`);
      }
    }
  }
  const policyKeys = (security?.policies ?? [])
    .map((row) => `${row.tablename}:${row.policyname}:${row.cmd}`)
    .sort();
  const expectedPolicyKeys = [
    "one_piece_canonical_import_batches:one_piece_import_batches_service_insert:INSERT",
    "one_piece_canonical_import_batches:one_piece_import_batches_service_select:SELECT",
    "one_piece_canonical_import_rows:one_piece_import_rows_service_insert:INSERT",
    "one_piece_canonical_import_rows:one_piece_import_rows_service_select:SELECT",
  ].sort();
  if (stableJson(policyKeys) !== stableJson(expectedPolicyKeys)) {
    issues.push("staging_policy_set_mismatch");
  }
  if (stableJson((security?.triggers ?? []).sort()) !== stableJson([...ONE_PIECE_STAGING_OBJECTS.triggers].sort())) {
    issues.push("staging_trigger_set_mismatch");
  }
  if (security?.function_present !== true) issues.push("staging_function_missing");
  return issues;
}

export function evaluateOnePieceTransactionReadbackV1(plan, readback) {
  const issues = [];
  if (Number(readback?.batch_count) !== 1) issues.push("transaction_batch_count_mismatch");
  if (Number(readback?.row_count) !== 21) issues.push("transaction_row_count_mismatch");
  if (stableJson(readback?.batch) !== stableJson(readback?.expected_batch)) {
    issues.push("transaction_batch_payload_mismatch");
  }
  if (stableJson(readback?.rows ?? []) !== stableJson(plan.staging_rows)) {
    issues.push("transaction_staging_rows_mismatch");
  }
  if (readback?.update_rejected !== true) issues.push("immutable_update_not_rejected");
  if (readback?.delete_rejected !== true) issues.push("immutable_delete_not_rejected");
  return issues;
}

export function evaluateOnePieceExecutionSummaryV1({
  summary,
  sourceExpectation,
}) {
  const issues = [];
  if (summary?.status !== "rollback_canary_passed_zero_durable_change") {
    issues.push("execution_status_not_passed");
  }
  if (summary?.canary_plan_fingerprint_sha256 !== PINNED_ONE_PIECE_CANARY_PLAN_SHA256) {
    issues.push("execution_plan_fingerprint_mismatch");
  }
  if (summary?.migration_draft_sha256 !== PINNED_ONE_PIECE_MIGRATION_DRAFT_SHA256) {
    issues.push("execution_migration_fingerprint_mismatch");
  }
  if (summary?.manifest_logical_sha256 !== PINNED_ONE_PIECE_MANIFEST_SHA256) {
    issues.push("execution_manifest_fingerprint_mismatch");
  }
  if (Number(summary?.selected_source_rows) !== 21) {
    issues.push("execution_selected_row_count_mismatch");
  }
  if (Number(summary?.authorized_durable_rows) !== 0) {
    issues.push("execution_durable_authority_nonzero");
  }
  const transaction = summary?.database_proof?.transaction;
  if (transaction?.transaction_read_only !== "off") {
    issues.push("execution_transaction_writability_not_proven");
  }
  if (transaction?.rollback_attempted !== true) issues.push("execution_rollback_not_attempted");
  if (transaction?.rollback_succeeded !== true) issues.push("execution_rollback_not_proven");
  if (Number(transaction?.transaction_readback?.batch_count) !== 1) {
    issues.push("execution_transaction_batch_count_mismatch");
  }
  if (Number(transaction?.transaction_readback?.row_count) !== 21) {
    issues.push("execution_transaction_row_count_mismatch");
  }
  if (transaction?.transaction_readback?.update_rejected !== true) {
    issues.push("execution_update_rejection_not_proven");
  }
  if (transaction?.transaction_readback?.delete_rejected !== true) {
    issues.push("execution_delete_rejection_not_proven");
  }
  if ((transaction?.findings ?? []).length > 0 || (summary?.findings ?? []).length > 0) {
    issues.push("execution_findings_present");
  }
  const baseline = summary?.database_proof?.baseline;
  const postRollback = summary?.database_proof?.post_rollback;
  if (postRollback?.transaction_read_only !== true || postRollback?.default_transaction_read_only !== true) {
    issues.push("execution_fresh_post_rollback_not_read_only");
  }
  if (baseline && postRollback) {
    issues.push(
      ...evaluateOnePieceStagingFootprintAbsentV1(postRollback.staging_footprint),
      ...compareOnePieceProtectedSnapshotsV1(
        baseline.protected_boundaries,
        postRollback.protected_boundaries,
      ),
      ...evaluateOnePieceSourceSnapshotV1(sourceExpectation, postRollback.source),
    );
  } else {
    issues.push("execution_baseline_or_post_rollback_missing");
  }
  return [...new Set(issues)];
}

export function buildOnePieceBatchRowV1(plan) {
  return {
    id: plan.batch.id,
    canary_plan_fingerprint_sha256: plan.canary_plan_fingerprint_sha256,
    manifest_logical_sha256: plan.manifest_logical_sha256,
    migration_draft_sha256: plan.migration_draft_sha256,
    plan_version: plan.plan_version,
    schema_version: plan.schema_version,
    producing_commit_sha: plan.repository.commit_sha,
    producing_branch: plan.repository.branch,
    selected_group_id: plan.selected_group.source_group_id,
    selected_group_name: plan.selected_group.source_group_name,
    selected_group_released_on: plan.selected_group.released_on[0],
    execution_mode: "rollback_only",
    authorized_durable_batch_rows: 0,
    authorized_durable_staging_rows: 0,
    row_counts: plan.counts,
    execution_boundaries: plan.boundaries,
  };
}
