import { sha256, stableJson } from
  "./one_piece_canonical_import_staging_v1.mjs";
import {
  expectedOnePieceCompleteNumberedCanaryWritesV1,
} from "./one_piece_complete_numbered_canonical_rollback_canary_v1.mjs";
import {
  evaluateOnePieceCompleteNumberedPreflightV1,
} from "./one_piece_complete_numbered_canonical_preflight_v1.mjs";
import {
  expectedOnePieceCompleteNumberedAttributableWritesV1,
  validateOnePieceCompleteNumberedPromotionPlanV1,
} from "./one_piece_complete_numbered_canonical_promotion_v1.mjs";

export const ONE_PIECE_COMPLETE_NUMBERED_APPLY_PLAN_VERSION =
  "ONE_PIECE_COMPLETE_NUMBERED_CANONICAL_APPLY_PLAN_V1";
export const ONE_PIECE_COMPLETE_NUMBERED_APPLY_VERSION =
  "ONE_PIECE_COMPLETE_NUMBERED_CANONICAL_APPLY_V1";

export const ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS = Object.freeze({
  promotion_plan_gzip_sha256:
    "734c65812792f9fbc9395c06b02ee4f838de074d2fc78629df997e0855f27084",
  preflight_summary_sha256:
    "800c70a0e84077b708a79d1a739b66f163b42b10f9a5c7d313b2046b7222e25c",
  rollback_summary_sha256:
    "4858932db5b639b54c42951a68e78542984409ccad585ea0c1ca8b3ae31bcf2e",
  rollback_transaction_sha256:
    "6f1d5a620888c08c9197fb1482177a6f24987d166585ab6a5cfee1b7397fad28",
  post_rollback_readback_sha256:
    "39477e67a5a532c7273ffbd5da7d4d1bb3ecc7121525a908540ef1e8c1361d0e",
});

export function onePieceCompleteNumberedApplyTargetBindingV1(promotionPlan) {
  const sets = promotionPlan?.payload?.set_rows ?? [];
  const rows = promotionPlan?.payload?.numbered_cards ?? [];
  return {
    counts: expectedOnePieceCompleteNumberedAttributableWritesV1(),
    set_ids_sha256: sha256(stableJson(sets.map((row) => row.id).sort())),
    card_print_ids_sha256: sha256(stableJson(rows.map((row) =>
      row.card_print.id).sort())),
    identity_ids_sha256: sha256(stableJson(rows.map((row) =>
      row.identity.id).sort())),
    evidence_ids_sha256: sha256(stableJson(rows.map((row) =>
      row.source_evidence.id).sort())),
    external_product_ids_sha256: sha256(stableJson(rows.map((row) =>
      row.external_mapping.external_id).sort())),
  };
}

function validateProofs({
  promotionPlan,
  preflightSummary,
  rollbackSummary,
  rollbackTransaction,
  postRollbackReadback,
}) {
  const findings = [
    ...validateOnePieceCompleteNumberedPromotionPlanV1(promotionPlan).findings
      .map((finding) => `promotion:${finding}`),
  ];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  add(preflightSummary?.status !== "production_read_only_preflight_passed" ||
    preflightSummary?.findings?.length !== 0,
  "preflight_not_passing");
  add(preflightSummary?.plan_fingerprint_sha256 !==
      promotionPlan?.plan_fingerprint_sha256 ||
      preflightSummary?.payload_fingerprint_sha256 !==
      promotionPlan?.payload_fingerprint_sha256,
  "preflight_binding_mismatch");
  add(rollbackSummary?.status !== "rollback_canary_passed_zero_durable_rows" ||
    rollbackSummary?.findings?.length !== 0 ||
    rollbackSummary?.transaction?.rollback_succeeded !== true,
  "rollback_summary_not_passing");
  add(rollbackSummary?.plan_fingerprint_sha256 !==
      promotionPlan?.plan_fingerprint_sha256 ||
      rollbackSummary?.payload_fingerprint_sha256 !==
      promotionPlan?.payload_fingerprint_sha256 ||
      rollbackSummary?.preflight_fingerprint_sha256 !==
      preflightSummary?.preflight_fingerprint_sha256,
  "rollback_binding_mismatch");
  add(rollbackTransaction?.findings?.length !== 0 ||
    rollbackTransaction?.rollback_succeeded !== true,
  "rollback_transaction_not_passing");
  add(stableJson((rollbackTransaction?.attributable_writes ?? []).map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  }))) !== stableJson(expectedOnePieceCompleteNumberedCanaryWritesV1()),
  "rollback_attribution_mismatch");
  const postEvaluation = evaluateOnePieceCompleteNumberedPreflightV1({
    plan: promotionPlan,
    snapshot: postRollbackReadback,
  });
  for (const finding of postEvaluation.findings) {
    findings.push(`post_rollback:${finding}`);
  }
  return [...new Set(findings)];
}

export function buildOnePieceCompleteNumberedApplyPlanV1({
  repository,
  inputHashes,
  promotionPlan,
  preflightSummary,
  rollbackSummary,
  rollbackTransaction,
  postRollbackReadback,
}) {
  if (stableJson(inputHashes) !== stableJson(
    ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS)) {
    throw new Error("Complete numbered durable-apply proof inputs changed");
  }
  const proofFindings = validateProofs({ promotionPlan, preflightSummary,
    rollbackSummary, rollbackTransaction, postRollbackReadback });
  if (proofFindings.length) {
    throw new Error(`Complete numbered apply proofs invalid: ${proofFindings.join(",")}`);
  }
  const core = {
    version: ONE_PIECE_COMPLETE_NUMBERED_APPLY_PLAN_VERSION,
    repository,
    input_hashes: inputHashes,
    promotion_plan_fingerprint_sha256: promotionPlan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: promotionPlan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: preflightSummary.preflight_fingerprint_sha256,
    rollback_canary_fingerprint_sha256:
      rollbackSummary.rollback_canary_fingerprint_sha256,
    target_binding: onePieceCompleteNumberedApplyTargetBindingV1(promotionPlan),
    execution: {
      chunk_size: 250,
      advisory_lock_key: "one_piece_complete_numbered_canonical_apply_v1",
      lock_timeout: "5s",
      statement_timeout: "300s",
      idle_in_transaction_session_timeout: "120s",
    },
    boundaries: {
      insert_only: true,
      exact_set_rows: 58,
      exact_card_print_rows: 6491,
      exact_identity_rows: 6491,
      exact_source_evidence_rows: 6491,
      exact_external_mapping_rows: 6491,
      update_rows: 0,
      delete_rows: 0,
      child_printing_writes: 0,
      don_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_enabled: false,
    },
  };
  return {
    ...core,
    apply_plan_fingerprint_sha256: sha256(stableJson(core)),
  };
}

export function validateOnePieceCompleteNumberedApplyPlanV1(
  applyPlan,
  promotionPlan,
) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { apply_plan_fingerprint_sha256: ignored, ...core } = applyPlan ?? {};
  add(applyPlan?.version !== ONE_PIECE_COMPLETE_NUMBERED_APPLY_PLAN_VERSION,
    "apply_plan_version_mismatch");
  add(applyPlan?.apply_plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "apply_plan_fingerprint_mismatch");
  add(stableJson(applyPlan?.input_hashes) !== stableJson(
    ONE_PIECE_COMPLETE_NUMBERED_APPLY_PINNED_INPUTS),
  "input_hashes_mismatch");
  add(applyPlan?.promotion_plan_fingerprint_sha256 !==
      promotionPlan?.plan_fingerprint_sha256 ||
      applyPlan?.payload_fingerprint_sha256 !==
      promotionPlan?.payload_fingerprint_sha256,
  "promotion_binding_mismatch");
  add(stableJson(applyPlan?.target_binding) !== stableJson(
    onePieceCompleteNumberedApplyTargetBindingV1(promotionPlan)),
  "target_binding_mismatch");
  add(applyPlan?.execution?.chunk_size !== 250,
    "chunk_size_mismatch");
  for (const key of ["update_rows", "delete_rows", "child_printing_writes",
    "don_writes", "sealed_writes", "storage_writes", "image_pointer_writes",
    "pricing_writes", "publication_writes", "vault_writes"]) {
    add(Number(applyPlan?.boundaries?.[key]) !== 0, `boundary_open:${key}`);
  }
  add(applyPlan?.boundaries?.insert_only !== true ||
    applyPlan?.boundaries?.app_visibility_enabled !== false,
  "insert_or_visibility_boundary_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function expectedOnePieceCompleteNumberedDurableReadbackV1(
  promotionPlan,
) {
  const rows = promotionPlan?.payload?.numbered_cards ?? [];
  return {
    set_rows: structuredClone(promotionPlan?.payload?.set_rows ?? []),
    card_rows: rows.map((row) => structuredClone(row.card_print)),
    identity_rows: rows.map((row) => structuredClone(row.identity)),
    evidence_rows: rows.map((row) => structuredClone(row.source_evidence)),
    mapping_rows: rows.map((row) => structuredClone(row.external_mapping)),
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_role_visible: false,
  };
}

export function summarizeOnePieceCompleteNumberedDurableReadbackV1(readback) {
  const result = {};
  for (const key of ["set_rows", "card_rows", "identity_rows",
    "evidence_rows", "mapping_rows"]) {
    const rows = readback?.[key] ?? [];
    result[key] = {
      row_count: rows.length,
      rows_sha256: sha256(stableJson(rows)),
    };
  }
  result.visibility = {
    release_status: readback?.release_status ?? null,
    anon_visible: readback?.anon_visible ?? null,
    authenticated_visible: readback?.authenticated_visible ?? null,
    service_role_visible: readback?.service_role_visible ?? null,
  };
  result.readback_sha256 = sha256(stableJson(readback));
  return result;
}

export function evaluateOnePieceCompleteNumberedDurableReadbackV1({
  promotionPlan,
  readback,
}) {
  const expected = expectedOnePieceCompleteNumberedDurableReadbackV1(
    promotionPlan);
  const findings = [];
  for (const key of ["set_rows", "card_rows", "identity_rows",
    "evidence_rows", "mapping_rows"]) {
    if (stableJson(readback?.[key]) !== stableJson(expected[key])) {
      findings.push(`durable_readback_mismatch:${key}`);
    }
  }
  for (const key of ["release_status", "anon_visible", "authenticated_visible",
    "service_role_visible"]) {
    if (readback?.[key] !== expected[key]) {
      findings.push(`durable_visibility_mismatch:${key}`);
    }
  }
  return findings;
}

export function evaluateOnePieceCompleteNumberedAttributableWritesV1(rows) {
  const normalized = (rows ?? []).map((row) => ({
    table_name: row.table_name,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    deleted: Number(row.deleted),
    hot_updated: Number(row.hot_updated),
  })).sort((left, right) => String(left.table_name)
    .localeCompare(String(right.table_name)));
  const expected = Object.entries(
    expectedOnePieceCompleteNumberedAttributableWritesV1())
    .map(([table_name, inserted]) => ({
      table_name,
      inserted,
      updated: 0,
      deleted: 0,
      hot_updated: 0,
    })).sort((left, right) => String(left.table_name)
      .localeCompare(String(right.table_name)));
  return stableJson(normalized) === stableJson(expected)
    ? []
    : ["attributable_writes_mismatch"];
}

export { validateProofs as validateOnePieceCompleteNumberedApplyProofsV1 };
