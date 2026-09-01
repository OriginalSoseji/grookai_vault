import path from "node:path";

import {
  buildFounderOutcomeAgentV1,
  buildFounderOutcomeStageV1,
  buildFounderOutcomeWorkflowPlanV1,
  buildFounderOutcomeWorkItemV1,
} from "./founder_outcome_workflow_v1.mjs";
import { operationsSha256V1 } from "./operations_control_plane_v1.mjs";

export const CATALOG_FOUNDER_OUTCOME_PACKAGE_VERSION =
  "CATALOG_FOUNDER_OUTCOME_PACKAGE_V1";
export const CATALOG_SET_COMPLETION_WORKFLOW_KEY = "catalog_set_completion_v1";

const SHA1_PATTERN = /^[a-f0-9]{40}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CATALOG_OUTCOME_WRITER_REGISTRY_V1 = Object.freeze({
  mtg_incremental_promotion_v1: Object.freeze({
    worker: "scripts/workers/mtg_incremental_promotion_v1.mjs",
    summary_file: "summary.json",
    preflight_file: "promotion_plan.json",
    fingerprint_field: "writer_payload_fingerprint",
    target_fields: Object.freeze(["set_code"]),
    count_fields: Object.freeze([
      "sets", "card_prints", "card_print_identity", "card_printings",
      "external_mappings", "external_printing_mappings",
    ]),
  }),
  one_piece_incremental_promotion_v1: Object.freeze({
    worker: "scripts/workers/one_piece_incremental_promotion_v1.mjs",
    summary_file: "summary.json",
    preflight_file: "promotion_plan.json",
    fingerprint_field: "payload_fingerprint_sha256",
    target_fields: Object.freeze(["set_code", "official_series_id"]),
    count_fields: Object.freeze([
      "sets", "set_release_controls", "card_prints", "identities", "evidence",
      "external_mappings",
    ]),
  }),
  english_pokemon_incremental_promotion_v1: Object.freeze({
    worker: "scripts/workers/english_pokemon_incremental_promotion_v1.mjs",
    summary_file: "report.json",
    preflight_file: "report.json",
    fingerprint_field: "payload_fingerprint_sha256",
    target_fields: Object.freeze(["source_set_code", "database_set_code"]),
    count_fields: Object.freeze(["card_prints", "identities", "evidence", "family_reviews"]),
  }),
  japanese_structured_incremental_promotion_v1: Object.freeze({
    worker: "scripts/workers/catalog_incremental_promotion_v1.mjs",
    summary_file: "summary.json",
    preflight_file: "promotion_plan.json",
    fingerprint_field: "payload_fingerprint_sha256",
    target_fields: Object.freeze([
      "pokemon_set_code", "pokemon_database_set_code", "pokemon_product_id",
    ]),
    count_fields: Object.freeze(["cards", "identities", "evidence", "family_reviews"]),
  }),
});

function clean(value) {
  return String(value ?? "").trim();
}

function safeKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function normalizeExpectedCounts(writerKey, summary) {
  let source;
  if (writerKey === "mtg_incremental_promotion_v1") source = summary.promotion_row_counts;
  else if (writerKey === "one_piece_incremental_promotion_v1") source = summary.counts;
  else if (writerKey === "english_pokemon_incremental_promotion_v1") {
    source = {
      card_prints: summary.counts?.card_prints,
      identities: summary.counts?.identities,
      evidence: summary.counts?.evidence,
      family_reviews: summary.counts?.family_reviews,
    };
  } else if (writerKey === "japanese_structured_incremental_promotion_v1") {
    source = summary.transaction_result?.expected;
  }
  assertPlainObject(source, "Catalog outcome expected counts");
  const counts = {};
  for (const [key, value] of Object.entries(source)) {
    const count = Number(value);
    if (!/^[a-z][a-z0-9_]*$/.test(key) || !Number.isInteger(count) || count < 0) {
      throw new Error(`Catalog outcome expected count is invalid: ${key}`);
    }
    counts[key] = count;
  }
  const writer = CATALOG_OUTCOME_WRITER_REGISTRY_V1[writerKey];
  if (JSON.stringify(Object.keys(counts).sort()) !==
      JSON.stringify([...writer.count_fields].sort())) {
    throw new Error("Catalog outcome expected count fields do not match the writer registry");
  }
  if (Object.values(counts).reduce((sum, count) => sum + count, 0) < 1) {
    throw new Error("Catalog outcome package cannot authorize an empty write");
  }
  return counts;
}

function sourceConstraints(writerKey, summary) {
  if (writerKey !== "english_pokemon_incremental_promotion_v1") return {};
  return {
    master_package_fingerprint_sha256: summary.master_index_hashes?.package_sha256 ?? null,
    source_snapshot_fingerprint_sha256: summary.source_snapshot?.body_sha256 ?? null,
  };
}

export function buildCatalogFounderOutcomePackageV1({
  target,
  result,
  summary,
  preflightProof,
  artifactHashes,
  sourceCommitSha,
  sourceRunId,
  asOf,
}) {
  assertPlainObject(target, "Catalog supervisor target");
  assertPlainObject(result, "Catalog supervisor result");
  assertPlainObject(summary, "Catalog writer summary");
  const writerKey = clean(target.writer_key);
  const writer = CATALOG_OUTCOME_WRITER_REGISTRY_V1[writerKey];
  if (!writer || target.founder_outcome_eligible !== true) {
    throw new Error(`Catalog writer is not outcome-enabled: ${writerKey}`);
  }
  if (clean(target.worker).replaceAll("\\", "/") !== writer.worker) {
    throw new Error("Catalog writer path does not match the code registry");
  }
  if (Number(result.exit_code) !== 0 || clean(result.target) !== clean(target.key)) {
    throw new Error("Catalog writer preflight did not complete for the exact target");
  }
  if (summary.mode !== "plan") {
    throw new Error("Catalog outcome package requires a read-only plan preflight");
  }
  assertPlainObject(preflightProof, "Catalog writer preflight proof");
  const collisions = preflightProof.collision_preflight ??
    preflightProof.collisions ?? summary.collision_preflight;
  assertPlainObject(collisions, "Catalog writer collision preflight");
  if (Object.values(collisions).some((value) => Number(value) !== 0)) {
    throw new Error("Catalog writer collision preflight is not clean");
  }
  const fingerprint = clean(summary[writer.fingerprint_field]);
  if (!SHA256_PATTERN.test(fingerprint)) {
    throw new Error("Catalog writer payload fingerprint is invalid");
  }
  const constraints = sourceConstraints(writerKey, summary);
  for (const [key, value] of Object.entries(constraints)) {
    if (!SHA256_PATTERN.test(clean(value))) throw new Error(`Catalog ${key} is invalid`);
  }
  const packageCore = {
    version: CATALOG_FOUNDER_OUTCOME_PACKAGE_VERSION,
    writer_key: writerKey,
    target_key: clean(target.key),
    target: target.target,
    source_commit_sha: clean(sourceCommitSha).toLowerCase(),
    source_run_id: clean(sourceRunId),
    as_of: clean(asOf),
    payload_fingerprint_sha256: fingerprint,
    source_constraints: constraints,
    expected_counts: normalizeExpectedCounts(writerKey, summary),
    preflight_artifact_fingerprint_sha256: operationsSha256V1(artifactHashes ?? {}),
    collision_preflight_fingerprint_sha256: operationsSha256V1(collisions),
    preflight_status: "planned_with_collision_preflight",
    boundaries: {
      insert_only: true,
      public_visibility_changes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      updates: 0,
      deletes: 0,
    },
  };
  const outcomePackage = {
    ...packageCore,
    package_fingerprint_sha256: operationsSha256V1(packageCore),
  };
  return validateCatalogFounderOutcomePackageV1(outcomePackage, { sourceCommitSha });
}

export function validateCatalogFounderOutcomePackageV1(outcomePackage, {
  sourceCommitSha = null,
} = {}) {
  assertPlainObject(outcomePackage, "Catalog founder outcome package");
  if (outcomePackage.version !== CATALOG_FOUNDER_OUTCOME_PACKAGE_VERSION) {
    throw new Error("Catalog founder outcome package version is unsupported");
  }
  const writer = CATALOG_OUTCOME_WRITER_REGISTRY_V1[clean(outcomePackage.writer_key)];
  if (!writer) throw new Error("Catalog founder outcome writer is not registered");
  if (!/^[a-z0-9_:-]+$/i.test(clean(outcomePackage.target_key))) {
    throw new Error("Catalog founder outcome target key is invalid");
  }
  assertPlainObject(outcomePackage.target, "Catalog founder outcome target");
  const targetKeys = Object.keys(outcomePackage.target).sort();
  if (JSON.stringify(targetKeys) !== JSON.stringify([...writer.target_fields].sort())) {
    throw new Error("Catalog founder outcome target fields do not match the writer registry");
  }
  if (targetKeys.some((key) => !clean(outcomePackage.target[key]))) {
    throw new Error("Catalog founder outcome target values are required");
  }
  if (targetKeys.some((key) => !/^[a-z0-9_.-]+$/i.test(clean(outcomePackage.target[key])))) {
    throw new Error("Catalog founder outcome target values are invalid");
  }
  const target = outcomePackage.target;
  const expectedTargetKey = outcomePackage.writer_key === "mtg_incremental_promotion_v1"
    ? `mtg:${clean(target.set_code).toLowerCase()}`
    : outcomePackage.writer_key === "one_piece_incremental_promotion_v1"
      ? `one_piece:${clean(target.set_code).toUpperCase()}`
      : outcomePackage.writer_key === "english_pokemon_incremental_promotion_v1"
        ? `pokemon_en:${clean(target.source_set_code).toLowerCase()}`
        : `pokemon_jpn:${clean(target.pokemon_set_code).toUpperCase()}`;
  if (clean(outcomePackage.target_key) !== expectedTargetKey) {
    throw new Error("Catalog founder outcome target key does not match its target fields");
  }
  if (!SHA1_PATTERN.test(clean(outcomePackage.source_commit_sha))) {
    throw new Error("Catalog founder outcome source commit is invalid");
  }
  if (sourceCommitSha && clean(outcomePackage.source_commit_sha) !== clean(sourceCommitSha)) {
    throw new Error("Catalog founder outcome source commit changed");
  }
  if (!/^\d+$/.test(clean(outcomePackage.source_run_id))) {
    throw new Error("Catalog founder outcome source run ID is invalid");
  }
  if (!DATE_PATTERN.test(clean(outcomePackage.as_of))) {
    throw new Error("Catalog founder outcome as-of date is invalid");
  }
  for (const key of [
    "payload_fingerprint_sha256",
    "preflight_artifact_fingerprint_sha256",
    "collision_preflight_fingerprint_sha256",
  ]) {
    if (!SHA256_PATTERN.test(clean(outcomePackage[key]))) {
      throw new Error(`Catalog founder outcome ${key} is invalid`);
    }
  }
  assertPlainObject(outcomePackage.expected_counts, "Catalog founder outcome expected counts");
  if (JSON.stringify(Object.keys(outcomePackage.expected_counts).sort()) !==
      JSON.stringify([...writer.count_fields].sort())) {
    throw new Error("Catalog founder outcome expected count fields changed");
  }
  if (Object.values(outcomePackage.expected_counts).some((value) =>
    !Number.isInteger(Number(value)) || Number(value) < 0)) {
    throw new Error("Catalog founder outcome expected counts are invalid");
  }
  if (Object.values(outcomePackage.expected_counts).reduce((sum, value) => sum + Number(value), 0) < 1) {
    throw new Error("Catalog founder outcome expected writes are empty");
  }
  const requiredBoundaries = {
    insert_only: true,
    public_visibility_changes: 0,
    storage_writes: 0,
    image_pointer_writes: 0,
    pricing_writes: 0,
    publication_writes: 0,
    vault_writes: 0,
    updates: 0,
    deletes: 0,
  };
  if (Object.keys(requiredBoundaries).some((key) =>
    outcomePackage.boundaries?.[key] !== requiredBoundaries[key]) ||
      JSON.stringify(Object.keys(outcomePackage.boundaries ?? {}).sort()) !==
      JSON.stringify(Object.keys(requiredBoundaries).sort())) {
    throw new Error("Catalog founder outcome boundaries changed");
  }
  assertPlainObject(outcomePackage.source_constraints, "Catalog founder outcome source constraints");
  if (outcomePackage.writer_key === "english_pokemon_incremental_promotion_v1") {
    const expectedConstraintKeys = [
      "master_package_fingerprint_sha256", "source_snapshot_fingerprint_sha256",
    ];
    if (JSON.stringify(Object.keys(outcomePackage.source_constraints).sort()) !==
        JSON.stringify(expectedConstraintKeys.sort()) ||
        Object.values(outcomePackage.source_constraints).some((value) =>
          !SHA256_PATTERN.test(clean(value)))) {
      throw new Error("English Pokemon source constraints are incomplete");
    }
  } else if (Object.keys(outcomePackage.source_constraints).length !== 0) {
    throw new Error("Catalog writer received unregistered source constraints");
  }
  if (outcomePackage.preflight_status !== "planned_with_collision_preflight") {
    throw new Error("Catalog founder outcome preflight status changed");
  }
  const fingerprintPayload = { ...outcomePackage };
  delete fingerprintPayload.package_fingerprint_sha256;
  if (operationsSha256V1(fingerprintPayload) !== outcomePackage.package_fingerprint_sha256) {
    throw new Error("Catalog founder outcome package fingerprint changed");
  }
  return outcomePackage;
}

export function buildCatalogSetOutcomeWorkItemV1({
  outcomePackage,
  sourceRunUri = null,
  expiresAt,
}) {
  validateCatalogFounderOutcomePackageV1(outcomePackage);
  const stageEffects = { catalog_outcome_package: outcomePackage };
  const exclusions = [
    "no updates or deletes",
    "no Storage or image pointer writes",
    "no pricing or Vault writes",
    "no publication or public visibility change",
    "no rows outside the exact frozen target",
  ];
  const workflow = buildFounderOutcomeWorkflowPlanV1({
    workflowKey: CATALOG_SET_COMPLETION_WORKFLOW_KEY,
    stages: [
      buildFounderOutcomeStageV1({
        stageKey: "verify_catalog_scope",
        handlerKey: "verify_catalog_frozen_scope_v1",
        mode: "read_only",
        expectedEffects: stageEffects,
        exclusions,
        maxAttempts: 2,
      }),
      buildFounderOutcomeStageV1({
        stageKey: "apply_and_reconcile_catalog_set",
        handlerKey: "apply_catalog_frozen_plan_v1",
        mode: "canonical_write",
        expectedEffects: stageEffects,
        exclusions,
        maxAttempts: 2,
      }),
    ],
    terminalOutcome: {
      summary: "The exact hidden canonical set delta is applied and durably reconciled.",
      target_key: outcomePackage.target_key,
      expected_counts: outcomePackage.expected_counts,
      public_visibility_changes: 0,
    },
  });
  return buildFounderOutcomeWorkItemV1({
    workItemKey: `catalog-outcome:${safeKey(outcomePackage.target_key)}`,
    agentKey: "catalog-set-outcome-v1",
    title: `Complete catalog set: ${outcomePackage.target_key}`,
    summary: "One approval runs the exact frozen insert-only writer and verifies durable readback.",
    domain: "catalog",
    riskLevel: "high",
    scope: {
      target_key: outcomePackage.target_key,
      writer_key: outcomePackage.writer_key,
      target: outcomePackage.target,
      expected_counts: outcomePackage.expected_counts,
    },
    exclusions,
    workflow,
    sourceCommitSha: outcomePackage.source_commit_sha,
    evidence: [{
      evidence_key: `catalog-outcome:${outcomePackage.package_fingerprint_sha256}`,
      sha256: outcomePackage.preflight_artifact_fingerprint_sha256,
      media_type: "application/json",
      source_uri: sourceRunUri,
      durable_uri: null,
      retention_class: "workflow_90_day",
      role: "frozen_writer_preflight",
      summary: "Read-only writer preflight and exact expected effects.",
      metadata: {
        source_run_id: outcomePackage.source_run_id,
        package_fingerprint_sha256: outcomePackage.package_fingerprint_sha256,
      },
    }],
    costCeilingUsd: 0,
    maxAttempts: 3,
    expiresAt,
  });
}

export function buildCatalogSetOutcomeAgentV1() {
  return buildFounderOutcomeAgentV1({
    agentKey: "catalog-set-outcome-v1",
    displayName: "Catalog Set Outcome",
    domain: "catalog",
    sourceLocator: ".github/workflows/universal-catalog-discovery.yml",
    description: "Builds and executes exact fingerprinted insert-only catalog set outcomes.",
    scheduleKind: "event",
  });
}

export function buildCatalogWriterInvocationV1(outcomePackage, { headSha, outDir }) {
  validateCatalogFounderOutcomePackageV1(outcomePackage, { sourceCommitSha: headSha });
  const writer = CATALOG_OUTCOME_WRITER_REGISTRY_V1[outcomePackage.writer_key];
  const args = [
    path.normalize(writer.worker),
    "--mode=apply",
    `--as-of=${outcomePackage.as_of}`,
    `--out-dir=${path.resolve(outDir)}`,
    `--expected-head-sha=${headSha}`,
    `--expected-payload-fingerprint=${outcomePackage.payload_fingerprint_sha256}`,
  ];
  const target = outcomePackage.target;
  if (outcomePackage.writer_key === "mtg_incremental_promotion_v1") {
    args.push(`--set-code=${target.set_code}`);
  } else if (outcomePackage.writer_key === "one_piece_incremental_promotion_v1") {
    args.push(`--set-code=${target.set_code}`, `--official-series-id=${target.official_series_id}`);
  } else if (outcomePackage.writer_key === "english_pokemon_incremental_promotion_v1") {
    args.push(
      `--source-set-code=${target.source_set_code}`,
      `--database-set-code=${target.database_set_code}`,
      `--expected-master-package-fingerprint=${outcomePackage.source_constraints.master_package_fingerprint_sha256}`,
      `--expected-source-snapshot-fingerprint=${outcomePackage.source_constraints.source_snapshot_fingerprint_sha256}`,
    );
  } else if (outcomePackage.writer_key === "japanese_structured_incremental_promotion_v1") {
    args.push(
      `--pokemon-set-code=${target.pokemon_set_code}`,
      `--pokemon-db-set-code=${target.pokemon_database_set_code}`,
      `--pokemon-product-id=${target.pokemon_product_id}`,
    );
  }
  const env = {};
  if (outcomePackage.writer_key === "english_pokemon_incremental_promotion_v1") {
    env.ENGLISH_POKEMON_INCREMENTAL_APPLY_APPROVAL = [
      "I approve ENGLISH_POKEMON_INCREMENTAL_PROMOTION_V1 apply only",
      `source_set=${target.source_set_code}`,
      `database_set=${target.database_set_code}`,
      `payload_fingerprint=${outcomePackage.payload_fingerprint_sha256}`,
      `master_package_fingerprint=${outcomePackage.source_constraints.master_package_fingerprint_sha256}`,
      `source_snapshot_fingerprint=${outcomePackage.source_constraints.source_snapshot_fingerprint_sha256}`,
      `commit_sha=${headSha}`,
    ].join("; ");
  }
  return { writer, args, env };
}

export function validateCatalogWriterResultV1(outcomePackage, summary) {
  validateCatalogFounderOutcomePackageV1(outcomePackage);
  assertPlainObject(summary, "Catalog writer apply summary");
  const writer = CATALOG_OUTCOME_WRITER_REGISTRY_V1[outcomePackage.writer_key];
  if (summary.mode !== "apply") throw new Error("Catalog writer did not run in apply mode");
  if (clean(summary[writer.fingerprint_field]) !== outcomePackage.payload_fingerprint_sha256) {
    throw new Error("Catalog writer result fingerprint does not match the approved package");
  }
  const result = summary.transaction_result;
  const englishWriter = outcomePackage.writer_key ===
    "english_pokemon_incremental_promotion_v1";
  if ((!englishWriter && result?.action !== "committed") ||
      (englishWriter && (!summary.inserted_readback || summary.rollback_absence_readback))) {
    throw new Error("Catalog writer did not report a committed durable result");
  }
  const durable = result?.durable_readback ?? summary.inserted_readback;
  assertPlainObject(durable, "Catalog writer durable readback");
  for (const [key, expected] of Object.entries(outcomePackage.expected_counts)) {
    const value = outcomePackage.writer_key === "mtg_incremental_promotion_v1"
      ? durable[key]?.exact_count
      : durable[key];
    const mtgCountsMatch = outcomePackage.writer_key !== "mtg_incremental_promotion_v1" ||
      (Number(durable[key]?.planned_count) === Number(expected) &&
       Number(durable[key]?.actual_count) === Number(expected));
    if (Number(value) !== Number(expected) || !mtgCountsMatch) {
      throw new Error(`Catalog writer durable readback mismatch: ${key}`);
    }
  }
  return {
    reconciled: true,
    target_key: outcomePackage.target_key,
    writer_key: outcomePackage.writer_key,
    payload_fingerprint_sha256: outcomePackage.payload_fingerprint_sha256,
    durable_readback: durable,
    canonical_writes: true,
    public_visibility_changes: 0,
  };
}
