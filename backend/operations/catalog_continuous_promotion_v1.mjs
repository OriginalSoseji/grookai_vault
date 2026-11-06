import {
  operationsSha256V1,
  validateOperationsAgentV1,
} from "./operations_control_plane_v1.mjs";
import { validateCatalogFounderOutcomePackageV1 } from
  "./catalog_founder_outcome_v1.mjs";

export const CATALOG_CONTINUOUS_PROMOTION_VERSION =
  "CATALOG_CONTINUOUS_PROMOTION_V1";
export const CATALOG_CONTINUOUS_PROMOTION_AGENT_KEY =
  "catalog-continuous-promotion-v1";
export const CATALOG_CONTINUOUS_PROMOTION_MODE =
  "governed-continuous-promotion-v1";

export const CATALOG_CONTINUOUS_WRITER_ALLOWLIST_V1 = Object.freeze(new Set([
  "mtg_incremental_promotion_v1",
  "one_piece_incremental_promotion_v1",
  "one_piece_incremental_printing_promotion_v2",
  "english_pokemon_incremental_promotion_v1",
  "japanese_structured_incremental_promotion_v1",
]));

export function buildCatalogContinuousPromotionAgentV1() {
  return validateOperationsAgentV1({
    agent_key: CATALOG_CONTINUOUS_PROMOTION_AGENT_KEY,
    display_name: "Catalog Continuous Promotion",
    domain: "catalog",
    owner_label: "Grookai Catalog Operations",
    description:
      "Executes exact fingerprinted insert-only catalog deltas after rollback proof.",
    execution_platform: "github_actions",
    source_locator: ".github/workflows/catalog-continuous-promotion.yml",
    schedule_kind: "event",
    schedule_expression: "after:Universal Catalog Discovery",
    heartbeat_interval_seconds: 21600,
    stale_after_seconds: 50400,
    allowed_work_item_types: ["catalog_continuous_promotion_receipt"],
    allowed_command_actions: ["execute_catalog_continuous_promotion"],
    contract_version: CATALOG_CONTINUOUS_PROMOTION_VERSION,
    executor_version: CATALOG_CONTINUOUS_PROMOTION_VERSION,
    escalation_policy: {
      stale_severity: "high",
      failure_severity: "critical",
      recovery_notification: true,
      founder_pause_allowed: true,
    },
  });
}

export function validateCatalogContinuousPromotionBatchV1(packages, {
  headSha,
  sourceRunId,
  maxTargets = 5,
} = {}) {
  if (!Array.isArray(packages)) {
    throw new Error("Catalog continuous promotion packages must be an array");
  }
  if (!/^[a-f0-9]{40}$/.test(String(headSha ?? ""))) {
    throw new Error("Catalog continuous promotion requires an exact source commit");
  }
  if (!/^\d+$/.test(String(sourceRunId ?? ""))) {
    throw new Error("Catalog continuous promotion requires a numeric source run ID");
  }
  if (!Number.isInteger(maxTargets) || maxTargets < 1 || maxTargets > 5) {
    throw new Error("Catalog continuous promotion maxTargets must be between 1 and 5");
  }
  if (packages.length > maxTargets) {
    throw new Error("Catalog continuous promotion package count exceeds the bounded cycle");
  }
  const targetKeys = new Set();
  const validated = packages.map((outcomePackage) => {
    validateCatalogFounderOutcomePackageV1(outcomePackage, { sourceCommitSha: headSha });
    if (String(outcomePackage.source_run_id) !== String(sourceRunId)) {
      throw new Error("Catalog continuous promotion source run changed");
    }
    if (!CATALOG_CONTINUOUS_WRITER_ALLOWLIST_V1.has(outcomePackage.writer_key)) {
      throw new Error(`Catalog writer is not continuously admitted: ${outcomePackage.writer_key}`);
    }
    if (targetKeys.has(outcomePackage.target_key)) {
      throw new Error("Catalog continuous promotion contains a duplicate target");
    }
    targetKeys.add(outcomePackage.target_key);
    return outcomePackage;
  });
  return validated.sort((left, right) => left.target_key.localeCompare(right.target_key));
}

export function buildCatalogContinuousPromotionRunKeyV1({
  sourceRunId,
  headSha,
  packages,
}) {
  return `catalog-continuous-${sourceRunId}-${operationsSha256V1({
    head_sha: headSha,
    package_fingerprints: packages.map((row) => row.package_fingerprint_sha256),
  }).slice(0, 20)}`;
}
