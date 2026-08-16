import { sha256, stableJson } from "./one_piece_canonical_import_staging_v1.mjs";
import {
  evaluateOnePieceSt01PrintingImageAttributionV1,
  evaluateOnePieceSt01PrintingImageTransactionReadbackV1,
  expectedOnePieceSt01PrintingImageAttributionV1,
  validateOnePieceSt01PrintingImageMutationPlanV1,
} from "./one_piece_st01_printing_image_mutation_plan_v1.mjs";

export const ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_PLAN_VERSION =
  "ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_PLAN_V1";
export const ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_VERSION =
  "ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_V1";
export const ONE_PIECE_ST01_PRINTING_IMAGE_POST_APPLY_VERSION =
  "ONE_PIECE_ST01_PRINTING_IMAGE_POST_APPLY_V1";
export const ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPROVAL_ENV =
  "ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_APPROVAL";

export const ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS =
  Object.freeze({
    mutation_plan_sha256:
      "6140bed1b25f38caf84f3114fadad0e212568d8c41f9a87415a6f06e4d5097a4",
    rollback_summary_sha256:
      "d2b2a8020b280111c75b71f33eb0667723ff29ae2023f5e0a17992f7d7d0b659",
    transaction_proof_sha256:
      "8ade2f07c024887af9cc7fcaf2d56f64d41c36d6cc6dacb169aa2c931f12cd09",
    independent_summary_sha256:
      "5640a4ecac6d7a5b68eda46a3878b17250e0c9b054ab8cbc425e1c07ed851de5",
    independent_readback_sha256:
      "8a6e9a916a37e7df64179affeb4e47df3d329909540f36ed7b85b9604c2fb06c",
  });

const EXPECTED_BOUNDARIES = Object.freeze({
  exact_parent_pointer_updates: 17,
  exact_normal_child_inserts: 14,
  exact_printing_mapping_inserts: 14,
  exact_total_updates: 17,
  exact_total_inserts: 28,
  delete_rows: 0,
  foil_child_writes: 0,
  child_image_pointer_writes: 0,
  storage_writes: 0,
  don_writes: 0,
  sealed_writes: 0,
  pricing_writes: 0,
  publication_writes: 0,
  vault_writes: 0,
  app_visibility_enabled: false,
  release_status: "hidden",
});

export function buildOnePieceSt01PrintingImageDurableApplyPlanV1({
  repository,
  inputHashes,
  mutationPlan,
  rollbackSummary,
  transactionProof,
  independentSummary,
  independentReadback,
}) {
  const validation = validateOnePieceSt01PrintingImageMutationPlanV1(
    mutationPlan,
  );
  if (!validation.valid) {
    throw new Error(`Mutation plan invalid: ${validation.findings.join(",")}`);
  }
  if (stableJson(inputHashes) !==
      stableJson(ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS)) {
    throw new Error("Durable apply proof inputs changed");
  }
  const rollbackValid =
    rollbackSummary?.status === "rollback_canary_passed_zero_durable_rows" &&
    rollbackSummary?.mutation_plan_fingerprint_sha256 ===
      mutationPlan.mutation_plan_fingerprint_sha256 &&
    rollbackSummary?.mutation_payload_fingerprint_sha256 ===
      mutationPlan.mutation_payload_fingerprint_sha256 &&
    rollbackSummary?.rollback_proof_sha256 ===
      independentSummary?.rollback_proof_sha256 &&
    rollbackSummary?.transaction?.rollback_succeeded === true &&
    rollbackSummary?.findings?.length === 0 &&
    transactionProof?.rollback_succeeded === true &&
    transactionProof?.findings?.length === 0 &&
    independentSummary?.status ===
      "rollback_independently_verified_zero_residue" &&
    independentSummary?.findings?.length === 0 &&
    stableJson(independentSummary?.production) ===
      stableJson(independentReadback);
  if (!rollbackValid) {
    throw new Error("Rollback and independent proof are not exact and passing");
  }
  const attributionFindings =
    evaluateOnePieceSt01PrintingImageAttributionV1(
      transactionProof.attributable_writes,
    );
  const transactionFindings =
    evaluateOnePieceSt01PrintingImageTransactionReadbackV1({
      plan: mutationPlan,
      readback: transactionProof.readback,
    });
  if (attributionFindings.length || transactionFindings.length) {
    throw new Error("Rollback transaction proof no longer satisfies policy");
  }

  const core = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_PLAN_VERSION,
    repository,
    input_hashes: inputHashes,
    mutation_plan_fingerprint_sha256:
      mutationPlan.mutation_plan_fingerprint_sha256,
    mutation_payload_fingerprint_sha256:
      mutationPlan.mutation_payload_fingerprint_sha256,
    rollback_proof_sha256: rollbackSummary.rollback_proof_sha256,
    authorized_rows: expectedOnePieceSt01PrintingImageAttributionV1(),
    target: structuredClone(mutationPlan.mutation_payload),
    expected_durable_readback:
      expectedOnePieceSt01PrintingImageDurableReadbackV1(mutationPlan),
    timeouts: structuredClone(mutationPlan.timeouts),
    boundaries: structuredClone(EXPECTED_BOUNDARIES),
  };
  return {
    ...core,
    apply_plan_fingerprint_sha256: sha256(stableJson(core)),
    approval_env: ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPROVAL_ENV,
  };
}

export function validateOnePieceSt01PrintingImageDurableApplyPlanV1(
  applyPlan,
  mutationPlan,
) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { apply_plan_fingerprint_sha256: ignored, approval_env: ignoredEnv,
    ...core } = applyPlan ?? {};
  add(applyPlan?.version !==
    ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_PLAN_VERSION,
  "apply_plan_version_mismatch");
  add(applyPlan?.apply_plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "apply_plan_fingerprint_mismatch");
  add(applyPlan?.approval_env !==
    ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPROVAL_ENV,
  "approval_env_mismatch");
  add(stableJson(applyPlan?.input_hashes) !==
    stableJson(ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_PINNED_INPUTS),
  "input_hashes_mismatch");
  add(applyPlan?.mutation_plan_fingerprint_sha256 !==
    mutationPlan?.mutation_plan_fingerprint_sha256 ||
    applyPlan?.mutation_payload_fingerprint_sha256 !==
      mutationPlan?.mutation_payload_fingerprint_sha256,
  "mutation_plan_binding_mismatch");
  add(stableJson(applyPlan?.target) !==
    stableJson(mutationPlan?.mutation_payload), "target_payload_mismatch");
  add(stableJson(applyPlan?.authorized_rows) !==
    stableJson(expectedOnePieceSt01PrintingImageAttributionV1()),
  "authorized_rows_mismatch");
  add(stableJson(applyPlan?.expected_durable_readback) !==
    stableJson(expectedOnePieceSt01PrintingImageDurableReadbackV1(mutationPlan)),
  "expected_durable_readback_mismatch");
  add(stableJson(applyPlan?.boundaries) !== stableJson(EXPECTED_BOUNDARIES),
    "boundaries_mismatch");
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}

export function requiredOnePieceSt01PrintingImageDurableApprovalV1({
  applyPlan,
}) {
  return "I approve the hidden durable One Piece ST-01 printing and image " +
    "apply only: 17 exact parent image-pointer updates, 14 normal child " +
    "card_printing inserts, and 14 exact TCGPlayer printing-mapping inserts, " +
    `using apply-plan fingerprint ${applyPlan.apply_plan_fingerprint_sha256}, ` +
    `mutation payload fingerprint ${applyPlan.mutation_payload_fingerprint_sha256}, ` +
    `and rollback proof ${applyPlan.rollback_proof_sha256}. I do not approve ` +
    "foil child writes, child image pointers, Storage writes, DON!! writes, " +
    "sealed writes, pricing writes, publication writes, Vault writes, app " +
    "visibility, deletes, cleanup, or rows outside this exact ST-01 payload.";
}

export function expectedOnePieceSt01PrintingImageDurableReadbackV1(
  mutationPlan,
) {
  const expected = mutationPlan?.rollback_contract
    ?.expected_transaction_readback;
  return {
    parent_pointer_rows: structuredClone(expected?.parent_pointer_rows ?? []),
    child_rows: structuredClone(expected?.normal_child_rows ?? []),
    external_printing_mapping_rows: structuredClone(
      expected?.external_printing_mapping_rows ?? [],
    ),
    release_status: "hidden",
    anon_visible: false,
    authenticated_visible: false,
    service_visible: false,
  };
}

export function evaluateOnePieceSt01PrintingImageDurableReadbackV1({
  mutationPlan,
  readback,
}) {
  const findings = [];
  const expected = expectedOnePieceSt01PrintingImageDurableReadbackV1(
    mutationPlan,
  );
  for (const key of ["parent_pointer_rows", "child_rows",
    "external_printing_mapping_rows", "release_status", "anon_visible",
    "authenticated_visible", "service_visible"]) {
    if (stableJson(readback?.[key]) !== stableJson(expected[key])) {
      findings.push(`durable_readback_mismatch:${key}`);
    }
  }
  if (readback?.transaction_read_only !== true) {
    findings.push("durable_readback_not_read_only");
  }
  if ((readback?.blocking_pids ?? []).length !== 0) {
    findings.push("durable_readback_blocked");
  }
  return [...new Set(findings)];
}

export function evaluateOnePieceSt01PrintingImagePostApplyV1({
  mutationPlan,
  applyPlan,
  applySummary,
  freshReadback,
}) {
  const findings = [
    ...validateOnePieceSt01PrintingImageMutationPlanV1(mutationPlan).findings,
    ...validateOnePieceSt01PrintingImageDurableApplyPlanV1(
      applyPlan,
      mutationPlan,
    ).findings,
  ];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  add(applySummary?.version !==
    ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_APPLY_VERSION,
  "apply_summary_version_mismatch");
  add(applySummary?.status !==
    "durable_apply_committed_and_readback_passed",
  "apply_summary_status_mismatch");
  add(applySummary?.mode !== "apply" || applySummary?.committed !== true,
    "apply_not_committed");
  add(applySummary?.apply_plan_fingerprint_sha256 !==
    applyPlan?.apply_plan_fingerprint_sha256,
  "apply_plan_fingerprint_mismatch");
  add(applySummary?.mutation_payload_fingerprint_sha256 !==
    mutationPlan?.mutation_payload_fingerprint_sha256,
  "mutation_payload_fingerprint_mismatch");
  add(stableJson(applySummary?.boundaries) !==
    stableJson(applyPlan?.boundaries), "apply_boundaries_mismatch");

  for (const finding of evaluateOnePieceSt01PrintingImageTransactionReadbackV1({
    plan: mutationPlan,
    readback: applySummary?.transaction_readback,
  })) {
    findings.push(`transaction:${finding}`);
  }
  for (const finding of evaluateOnePieceSt01PrintingImageAttributionV1(
    applySummary?.attributable_writes,
  )) {
    findings.push(`attribution:${finding}`);
  }
  for (const [label, readback] of [
    ["writer_durable", applySummary?.durable_readback],
    ["independent_durable", freshReadback],
  ]) {
    for (const finding of evaluateOnePieceSt01PrintingImageDurableReadbackV1({
      mutationPlan,
      readback,
    })) {
      findings.push(`${label}:${finding}`);
    }
  }
  return [...new Set(findings)];
}

export const ONE_PIECE_ST01_PRINTING_IMAGE_DURABLE_BOUNDARIES =
  EXPECTED_BOUNDARIES;
