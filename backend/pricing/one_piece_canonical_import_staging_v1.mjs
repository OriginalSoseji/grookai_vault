import { createHash } from "node:crypto";
import { v5 as uuidV5 } from "uuid";

export const ONE_PIECE_STAGING_SCHEMA_VERSION =
  "ONE_PIECE_CANONICAL_IMPORT_STAGING_SCHEMA_V1";
export const ONE_PIECE_CANARY_PLAN_VERSION =
  "ONE_PIECE_CANONICAL_CATALOG_ONE_GROUP_ROLLBACK_CANARY_V1";
export const PINNED_ONE_PIECE_MANIFEST_SHA256 =
  "e55e334b828db7b3a45e4b09cb34a51c81731cf309f3959c08052edb5cf4abf9";

const UUID_NAMESPACE = "5b5e280d-d337-5336-87d9-88f15bf3146a";
const RECORD_CLASSES = new Set([
  "exact_single_card_candidate",
  "sealed_product_candidate",
  "ambiguous_quarantine",
]);
const SINGLE_KINDS = new Set(["numbered_card", "don_card"]);
const PROMOTION_STATES = new Set([
  "current_candidate",
  "future_or_presale_hold",
  "inactive_source_hold",
  "separate_sealed_catalog",
  "quarantine",
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function deterministicUuidV5(name, namespace = UUID_NAMESPACE) {
  return uuidV5(String(name), namespace);
}

function numericCompare(left, right) {
  return Number(left) - Number(right);
}

function summarizeGroup(rows) {
  const first = rows[0];
  const exact = rows.filter((row) => row.classification === "exact_single_card_candidate");
  const numbered = exact.filter((row) => row.single_card_kind === "numbered_card");
  const don = exact.filter((row) => row.single_card_kind === "don_card");
  const sealed = rows.filter((row) => row.classification === "sealed_product_candidate");
  const quarantine = rows.filter((row) => row.classification === "ambiguous_quarantine");
  const futureOrPresale = rows.filter(
    (row) =>
      row.promotion_state === "future_or_presale_hold" ||
      row.release?.explicit_presale === true ||
      row.release?.future_release === true,
  );
  const inactive = rows.filter((row) => row.source_active !== true);
  return {
    source_group_id: Number(first.source_group_id),
    source_group_name: first.source_group_name,
    source_product_count: rows.length,
    exact_single_count: exact.length,
    numbered_card_count: numbered.length,
    don_card_count: don.length,
    sealed_product_count: sealed.length,
    quarantine_count: quarantine.length,
    future_or_presale_count: futureOrPresale.length,
    inactive_count: inactive.length,
    source_price_lane_count: rows.reduce(
      (count, row) => count + (row.source_price_lanes?.length ?? 0),
      0,
    ),
    released_on: [...new Set(rows.map((row) => row.release?.released_on).filter(Boolean))],
    languages: [...new Set(rows.map((row) => row.language?.normalized).filter(Boolean))].sort(),
  };
}

export function selectOnePieceCanaryGroupV1(manifestRows, options = {}) {
  const maxRows = options.maxRows ?? 25;
  const asOfDate = options.asOfDate ?? "9999-12-31";
  const groups = new Map();
  for (const row of manifestRows) {
    const groupId = Number(row.source_group_id);
    if (!Number.isInteger(groupId) || groupId <= 0) continue;
    const groupRows = groups.get(groupId) ?? [];
    groupRows.push(row);
    groups.set(groupId, groupRows);
  }

  const candidates = [];
  for (const rows of groups.values()) {
    rows.sort((left, right) => numericCompare(left.source_product_id, right.source_product_id));
    const summary = summarizeGroup(rows);
    const releasedByBoundary = rows.every(
      (row) =>
        row.release?.current_release_eligible === true &&
        typeof row.release?.released_on === "string" &&
        row.release.released_on <= asOfDate,
    );
    if (
      summary.source_product_count <= maxRows &&
      summary.exact_single_count > 0 &&
      summary.numbered_card_count > 0 &&
      summary.don_card_count > 0 &&
      summary.sealed_product_count > 0 &&
      summary.quarantine_count === 0 &&
      summary.future_or_presale_count === 0 &&
      summary.inactive_count === 0 &&
      releasedByBoundary
    ) {
      candidates.push({ rows, summary });
    }
  }
  candidates.sort(
    (left, right) =>
      left.summary.source_product_count - right.summary.source_product_count ||
      numericCompare(left.summary.source_group_id, right.summary.source_group_id),
  );
  if (candidates.length === 0) {
    throw new Error("No released role-rich One Piece group satisfies the bounded canary policy");
  }
  return candidates[0];
}

function buildCounts(rows) {
  return {
    source_products: rows.length,
    exact_single_card_candidates: rows.filter(
      (row) => row.classification === "exact_single_card_candidate",
    ).length,
    numbered_cards: rows.filter((row) => row.single_card_kind === "numbered_card").length,
    don_cards: rows.filter((row) => row.single_card_kind === "don_card").length,
    sealed_product_candidates: rows.filter(
      (row) => row.classification === "sealed_product_candidate",
    ).length,
    ambiguous_quarantined: rows.filter(
      (row) => row.classification === "ambiguous_quarantine",
    ).length,
    future_or_presale_holds: rows.filter(
      (row) => row.promotion_state === "future_or_presale_hold",
    ).length,
    source_price_lanes: rows.reduce(
      (count, row) => count + (row.source_price_lanes?.length ?? 0),
      0,
    ),
  };
}

export function buildOnePieceRollbackCanaryPlanV1(input, options = {}) {
  const manifestLogicalSha256 = input.manifestLogicalSha256;
  if (manifestLogicalSha256 !== PINNED_ONE_PIECE_MANIFEST_SHA256 && !options.allowFixtureManifest) {
    throw new Error("One Piece manifest fingerprint does not match the pinned V1 authority");
  }
  if (!/^[0-9a-f]{64}$/.test(input.migrationDraftSha256 ?? "")) {
    throw new Error("Migration draft SHA-256 is required");
  }
  if (!/^[0-9a-f]{40}$/.test(input.repository?.commit_sha ?? "") || !input.repository?.branch) {
    throw new Error("Repository commit SHA and branch are required");
  }

  const selected = selectOnePieceCanaryGroupV1(input.manifestRows, {
    maxRows: options.maxRows ?? 25,
    asOfDate: input.asOfDate,
  });
  const batchId = deterministicUuidV5(
    `one-piece:rollback-canary:${manifestLogicalSha256}:${selected.summary.source_group_id}`,
  );
  const stagingRows = selected.rows.map((payload, rowOrdinal) => ({
    id: deterministicUuidV5(
      `one-piece:staging-row:${batchId}:${payload.source_product_id}`,
    ),
    batch_id: batchId,
    source_product_id: Number(payload.source_product_id),
    source_group_id: Number(payload.source_group_id),
    record_class: payload.classification,
    single_card_kind: payload.single_card_kind,
    language_key: payload.language?.normalized ?? "und",
    promotion_state: payload.promotion_state,
    row_ordinal: rowOrdinal,
    payload,
    payload_sha256: sha256(stableJson(payload)),
  }));
  const counts = buildCounts(selected.rows);
  const planCore = {
    plan_version: ONE_PIECE_CANARY_PLAN_VERSION,
    schema_version: ONE_PIECE_STAGING_SCHEMA_VERSION,
    repository: input.repository,
    as_of_date: input.asOfDate,
    manifest_logical_sha256: manifestLogicalSha256,
    migration_draft_sha256: input.migrationDraftSha256,
    selected_group: selected.summary,
    batch: {
      id: batchId,
      execution_mode: "rollback_only",
      authorized_durable_batch_rows: 0,
      authorized_durable_staging_rows: 0,
    },
    staging_rows: stagingRows,
    counts,
    rollback_proof_contract: {
      transaction_sequence: [
        "begin",
        "apply_exact_migration_draft_inside_transaction",
        "insert_one_batch_and_selected_source_rows",
        "verify_exact_transaction_local_readback",
        "verify_rls_grants_and_immutability",
        "verify_protected_domain_counts_unchanged",
        "rollback",
        "verify_staging_schema_and_rows_absent",
        "verify_protected_domain_counts_unchanged_after_rollback",
      ],
      expected_transaction_local_batch_rows: 1,
      expected_transaction_local_staging_rows: stagingRows.length,
      expected_durable_batch_rows: 0,
      expected_durable_staging_rows: 0,
      rollback_required: true,
    },
    boundaries: {
      current_gate_database_connection: false,
      current_gate_migration_apply: false,
      current_gate_database_writes: false,
      durable_staging_rows_authorized: false,
      canonical_writes: false,
      sealed_catalog_writes: false,
      publication: false,
      storage_or_image_work: false,
      pricing_or_vault_writes: false,
      deployment: false,
      active_mtg_worktree_changes: false,
    },
  };
  return {
    ...planCore,
    canary_plan_fingerprint_sha256: sha256(stableJson(planCore)),
  };
}

export function verifyOnePieceRollbackCanaryPlanV1(plan, expectations = {}) {
  const errors = [];
  const fail = (condition, message) => {
    if (!condition) errors.push(message);
  };
  fail(plan?.plan_version === ONE_PIECE_CANARY_PLAN_VERSION, "unexpected plan version");
  fail(plan?.schema_version === ONE_PIECE_STAGING_SCHEMA_VERSION, "unexpected schema version");
  if (expectations.manifestLogicalSha256) {
    fail(
      plan?.manifest_logical_sha256 === expectations.manifestLogicalSha256,
      "manifest fingerprint mismatch",
    );
  }
  if (expectations.migrationDraftSha256) {
    fail(
      plan?.migration_draft_sha256 === expectations.migrationDraftSha256,
      "migration draft fingerprint mismatch",
    );
  }
  const { canary_plan_fingerprint_sha256: ignored, ...core } = plan ?? {};
  fail(
    plan?.canary_plan_fingerprint_sha256 === sha256(stableJson(core)),
    "canary plan fingerprint mismatch",
  );
  fail(plan?.batch?.execution_mode === "rollback_only", "execution must be rollback-only");
  fail(plan?.batch?.authorized_durable_batch_rows === 0, "durable batch rows are not authorized");
  fail(
    plan?.batch?.authorized_durable_staging_rows === 0,
    "durable staging rows are not authorized",
  );
  fail(plan?.rollback_proof_contract?.rollback_required === true, "rollback is required");
  fail(plan?.rollback_proof_contract?.expected_durable_batch_rows === 0, "durable batch expectation must be zero");
  fail(plan?.rollback_proof_contract?.expected_durable_staging_rows === 0, "durable row expectation must be zero");
  fail(
    Object.values(plan?.boundaries ?? {}).every((value) => value === false),
    "all current-gate mutation boundaries must be false",
  );

  const rows = plan?.staging_rows ?? [];
  fail(rows.length === plan?.counts?.source_products, "staging row count mismatch");
  fail(rows.length === plan?.selected_group?.source_product_count, "selected group count mismatch");
  fail(new Set(rows.map((row) => row.id)).size === rows.length, "duplicate staging row id");
  fail(
    new Set(rows.map((row) => row.source_product_id)).size === rows.length,
    "duplicate source product id",
  );
  for (const [index, row] of rows.entries()) {
    fail(row.row_ordinal === index, `row ${index} has an invalid ordinal`);
    fail(row.batch_id === plan?.batch?.id, `row ${index} has an invalid batch id`);
    fail(RECORD_CLASSES.has(row.record_class), `row ${index} has an invalid record class`);
    fail(PROMOTION_STATES.has(row.promotion_state), `row ${index} has an invalid promotion state`);
    fail(row.source_product_id === Number(row.payload?.source_product_id), `row ${index} changed source product id`);
    fail(row.source_group_id === Number(row.payload?.source_group_id), `row ${index} changed source group id`);
    fail(row.record_class === row.payload?.classification, `row ${index} changed classification`);
    fail(row.single_card_kind === row.payload?.single_card_kind, `row ${index} changed single kind`);
    fail(row.language_key === (row.payload?.language?.normalized ?? "und"), `row ${index} changed language`);
    fail(row.promotion_state === row.payload?.promotion_state, `row ${index} changed promotion state`);
    fail(row.payload_sha256 === sha256(stableJson(row.payload)), `row ${index} payload hash mismatch`);
    if (row.record_class === "exact_single_card_candidate") {
      fail(SINGLE_KINDS.has(row.single_card_kind), `row ${index} exact single lacks a valid kind`);
    } else {
      fail(row.single_card_kind === null, `row ${index} non-single has a single-card kind`);
    }
    fail(row.payload?.publishable === false, `row ${index} is publishable`);
    fail(row.payload?.canonical_write_authorized === false, `row ${index} authorizes canonical writes`);
    fail(row.payload?.sealed_write_authorized === false, `row ${index} authorizes sealed writes`);
    fail(row.payload?.release?.explicit_presale === false, `row ${index} is presale`);
    fail(row.payload?.release?.future_release === false, `row ${index} is future release`);
  }
  const recomputedCounts = buildCounts(rows.map((row) => row.payload));
  fail(stableJson(recomputedCounts) === stableJson(plan?.counts), "classification counts do not reconcile");
  return { valid: errors.length === 0, errors };
}
