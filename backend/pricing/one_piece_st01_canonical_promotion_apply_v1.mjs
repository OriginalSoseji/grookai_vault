import { sha256, stableJson } from "./one_piece_canonical_import_staging_v1.mjs";
import {
  evaluateOnePieceSt01AttributableWritesV1,
  evaluateOnePieceSt01PromotionPreflightV1,
  expectedOnePieceSt01AttributableWritesV1,
  ONE_PIECE_ST01_PREFLIGHT_VERSION,
  validateOnePieceSt01PromotionPlanV1,
} from "./one_piece_st01_canonical_promotion_v1.mjs";

export const ONE_PIECE_ST01_DURABLE_APPLY_PLAN_VERSION =
  "ONE_PIECE_ST01_CANONICAL_PROMOTION_DURABLE_APPLY_PLAN_V1";
export const ONE_PIECE_ST01_DURABLE_APPLY_VERSION =
  "ONE_PIECE_ST01_CANONICAL_PROMOTION_DURABLE_APPLY_V1";
export const ONE_PIECE_ST01_POST_APPLY_VERSION =
  "ONE_PIECE_ST01_CANONICAL_PROMOTION_POST_APPLY_V1";
export const ONE_PIECE_ST01_DURABLE_APPROVAL_ENV =
  "ONE_PIECE_ST01_DURABLE_APPLY_APPROVAL";

export const ONE_PIECE_ST01_DURABLE_PINNED_INPUTS = Object.freeze({
  promotion_plan_sha256:
    "10b238edc52ab8fa1271481231e6803553814c451f348d19e6e459017d9bf5e3",
  rollback_summary_sha256:
    "d6fdcd97ffe87ba41b1f88d02e2643330a6929733448f05b38c2c0a9a8013135",
  transaction_proof_sha256:
    "f083e7d644457afc1f2e18971445a5fea70f7f5614f7be88209813faff4de9a0",
  post_rollback_summary_sha256:
    "eca1577dfbed43a392d0e0509fcc7b0d11505c14e46e00eb66c5f8563d9cca28",
});

export function buildOnePieceSt01DurableApplyPlanV1({
  repository,
  inputHashes,
  promotionPlan,
  rollbackSummary,
  transactionProof,
  postRollbackSummary,
}) {
  const promotionValidation = validateOnePieceSt01PromotionPlanV1(promotionPlan);
  if (!promotionValidation.valid) {
    throw new Error(`Promotion plan invalid: ${promotionValidation.findings.join(",")}`);
  }
  if (stableJson(inputHashes) !== stableJson(ONE_PIECE_ST01_DURABLE_PINNED_INPUTS)) {
    throw new Error("Durable apply proof inputs changed");
  }
  if (rollbackSummary?.status !== "rollback_canary_passed_zero_durable_rows" ||
      rollbackSummary?.promotion_plan_fingerprint_sha256 !==
        promotionPlan.plan_fingerprint_sha256 ||
      rollbackSummary?.findings?.length !== 0 ||
      postRollbackSummary?.status !== "pass" ||
      postRollbackSummary?.preflight_fingerprint_sha256 !==
        rollbackSummary.preflight_fingerprint_sha256 ||
      transactionProof?.findings?.length !== 0) {
    throw new Error("Rollback proof is not exact and passing");
  }
  const attributableFindings = evaluateOnePieceSt01AttributableWritesV1(
    rollbackSummary.attributable_writes,
  );
  if (attributableFindings.length) {
    throw new Error(`Rollback attribution invalid: ${attributableFindings.join(",")}`);
  }
  const core = {
    version: ONE_PIECE_ST01_DURABLE_APPLY_PLAN_VERSION,
    repository,
    input_hashes: inputHashes,
    promotion_plan_fingerprint_sha256: promotionPlan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: promotionPlan.payload_fingerprint_sha256,
    rollback_preflight_fingerprint_sha256:
      rollbackSummary.preflight_fingerprint_sha256,
    authorized_rows: expectedOnePieceSt01AttributableWritesV1(),
    target: promotionPlan.payload,
    timeouts: {
      lock_timeout: "5s",
      statement_timeout: "120s",
      idle_in_transaction_session_timeout: "60s",
    },
    boundaries: {
      insert_only: true,
      exact_set_rows: 1,
      exact_card_print_rows: 17,
      exact_identity_rows: 17,
      exact_source_evidence_rows: 17,
      exact_external_mapping_rows: 17,
      update_rows: 0,
      delete_rows: 0,
      card_printing_child_writes: 0,
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
    approval_env: ONE_PIECE_ST01_DURABLE_APPROVAL_ENV,
  };
}

export function validateOnePieceSt01DurableApplyPlanV1(applyPlan, promotionPlan) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { apply_plan_fingerprint_sha256: ignored, approval_env: ignoredEnv,
    ...core } = applyPlan ?? {};
  add(applyPlan?.version !== ONE_PIECE_ST01_DURABLE_APPLY_PLAN_VERSION,
    "apply_plan_version_mismatch");
  add(applyPlan?.apply_plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "apply_plan_fingerprint_mismatch");
  add(applyPlan?.approval_env !== ONE_PIECE_ST01_DURABLE_APPROVAL_ENV,
    "approval_env_mismatch");
  add(stableJson(applyPlan?.input_hashes) !==
    stableJson(ONE_PIECE_ST01_DURABLE_PINNED_INPUTS), "input_hashes_mismatch");
  add(applyPlan?.promotion_plan_fingerprint_sha256 !==
    promotionPlan?.plan_fingerprint_sha256 ||
    applyPlan?.payload_fingerprint_sha256 !==
      promotionPlan?.payload_fingerprint_sha256,
  "promotion_plan_binding_mismatch");
  add(stableJson(applyPlan?.target) !== stableJson(promotionPlan?.payload),
    "target_payload_mismatch");
  add(stableJson(applyPlan?.authorized_rows) !==
    stableJson(expectedOnePieceSt01AttributableWritesV1()),
  "authorized_rows_mismatch");
  for (const key of ["update_rows", "delete_rows", "card_printing_child_writes",
    "don_writes", "sealed_writes", "storage_writes", "image_pointer_writes",
    "pricing_writes", "publication_writes", "vault_writes"]) {
    add(Number(applyPlan?.boundaries?.[key]) !== 0, `boundary_open:${key}`);
  }
  add(applyPlan?.boundaries?.insert_only !== true ||
    applyPlan?.boundaries?.app_visibility_enabled !== false,
  "insert_or_visibility_boundary_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function validateFreshPreflightForApplyV1({
  preflight,
  promotionPlan,
}) {
  const findings = [];
  if (preflight?.version !== ONE_PIECE_ST01_PREFLIGHT_VERSION ||
      preflight?.status !== "pass" || preflight?.findings?.length !== 0) {
    findings.push("fresh_preflight_not_passing");
  }
  if (preflight?.promotion_plan_fingerprint_sha256 !==
      promotionPlan?.plan_fingerprint_sha256 ||
      Number(preflight?.selected_numbered_cards) !== 17) {
    findings.push("fresh_preflight_scope_mismatch");
  }
  if (Object.values(preflight?.snapshot?.collisions ?? {})
    .some((value) => Number(value) !== 0)) {
    findings.push("fresh_preflight_collision");
  }
  return [...new Set(findings)];
}

export function requiredOnePieceSt01DurableApprovalV1({ applyPlan, preflight }) {
  return "I approve the durable One Piece ST-01 numbered-card canonical apply only: " +
    "1 hidden set row, 17 parent card_print rows, 17 active card_print_identity " +
    "rows, 17 card_print_identity_source_evidence rows, and 17 exact TCGPlayer " +
    `external_mappings, using apply-plan fingerprint ${applyPlan.apply_plan_fingerprint_sha256}, ` +
    `payload fingerprint ${applyPlan.payload_fingerprint_sha256}, and fresh preflight ` +
    `fingerprint ${preflight.preflight_fingerprint_sha256}. I do not approve child ` +
    "printing writes, DON!! writes, sealed writes, Storage writes, image-pointer " +
    "writes, pricing writes, publication writes, Vault writes, updates, deletes, " +
    "app visibility, or rows outside this exact 17-card ST-01 payload.";
}

export function expectedOnePieceSt01DurableReadbackV1(promotionPlan) {
  const rows = promotionPlan.payload.numbered_cards;
  return {
    set_rows: [structuredClone(promotionPlan.payload.set_row)],
    card_rows: rows.map((row) => structuredClone(row.card_print)),
    identity_rows: rows.map((row) => structuredClone(row.identity)),
    evidence_rows: rows.map((row) => structuredClone(row.source_evidence)),
    mapping_rows: rows.map((row) => structuredClone(row.external_mapping)),
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_visible: false,
  };
}

export function evaluateOnePieceSt01DurableReadbackV1({
  promotionPlan,
  readback,
}) {
  const expected = expectedOnePieceSt01DurableReadbackV1(promotionPlan);
  const findings = [];
  for (const key of ["set_rows", "card_rows", "identity_rows",
    "evidence_rows", "mapping_rows"]) {
    if (stableJson(readback?.[key]) !== stableJson(expected[key])) {
      findings.push(`durable_readback_mismatch:${key}`);
    }
  }
  for (const key of ["release_status", "anon_visible", "authenticated_visible",
    "service_visible"]) {
    if (readback?.[key] !== expected[key]) {
      findings.push(`durable_visibility_mismatch:${key}`);
    }
  }
  return [...new Set(findings)];
}

export function evaluateOnePieceSt01PostApplyV1({
  promotionPlan,
  applyPlan,
  applySummary,
  freshReadback,
}) {
  const findings = [
    ...validateOnePieceSt01DurableApplyPlanV1(applyPlan, promotionPlan).findings,
  ];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  add(applySummary?.version !== ONE_PIECE_ST01_DURABLE_APPLY_VERSION,
    "apply_summary_version_mismatch");
  add(applySummary?.status !== "durable_apply_committed_and_readback_passed",
    "apply_summary_status_mismatch");
  add(applySummary?.mode !== "apply" || applySummary?.committed !== true,
    "apply_not_committed");
  add(applySummary?.apply_plan_fingerprint_sha256 !==
    applyPlan?.apply_plan_fingerprint_sha256, "apply_plan_fingerprint_mismatch");
  add(applySummary?.payload_fingerprint_sha256 !==
    promotionPlan?.payload_fingerprint_sha256, "payload_fingerprint_mismatch");
  add(stableJson(applySummary?.boundaries) !== stableJson(applyPlan?.boundaries),
    "apply_boundaries_mismatch");
  const freshPreflight = evaluateOnePieceSt01PromotionPreflightV1({
    plan: promotionPlan,
    snapshot: applySummary?.apply_fresh_preflight_snapshot,
  });
  for (const finding of freshPreflight.findings) {
    findings.push(`apply_fresh_preflight:${finding}`);
  }
  for (const [label, readback] of [
    ["transaction", applySummary?.transaction_readback],
    ["writer_durable", applySummary?.durable_readback],
    ["independent_durable", freshReadback],
  ]) {
    for (const finding of evaluateOnePieceSt01DurableReadbackV1({
      promotionPlan,
      readback,
    })) {
      findings.push(`${label}:${finding}`);
    }
  }
  for (const finding of evaluateOnePieceSt01AttributableWritesV1(
    applySummary?.attributable_writes,
  )) {
    findings.push(`attribution:${finding}`);
  }
  return [...new Set(findings)];
}
