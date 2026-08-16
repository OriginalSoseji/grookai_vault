import { createHash } from "node:crypto";

import { verifyMtgCanaryPayloadIntegrityV1 } from "./mtg_canonical_catalog_canary_preflight_v1.mjs";
import {
  buildMtgCanaryStageContractV1,
  stableJson,
} from "./mtg_canonical_catalog_canary_stage_v1.mjs";

export const MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1 = Object.freeze({
  version: "MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1",
  source: "immutable_service_only_staging_batch",
  allowed_inserts: Object.freeze([
    "sets",
    "card_prints",
    "card_print_identity",
    "card_printings",
    "external_mappings",
    "external_printing_mappings",
  ]),
  required_release_status: "hidden",
  canonical_updates: false,
  deletes: false,
  truncates: false,
  image_pointer_writes: false,
  storage_writes: false,
  pricing_writes: false,
  publication_writes: false,
  pokemon_mutation: false,
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stripMtgPromotionMigrationEnvelopeV1(sql) {
  const withoutBegin = sql.replace(/(^|\r?\n)\s*begin;\s*(?=\r?\n)/i, "$1");
  const withoutCommit = withoutBegin.replace(/\r?\n\s*commit;\s*$/i, "\n");
  if (
    withoutBegin === sql ||
    withoutCommit === withoutBegin ||
    /(^|\r?\n)\s*(begin|commit);\s*($|\r?\n)/i.test(withoutCommit)
  ) {
    throw new Error("Promotion migration transaction wrapper could not be isolated");
  }
  return withoutCommit;
}

export function canonicalPromotionRowsV1(payload) {
  return {
    sets: payload.rows.sets.map((row) => ({ ...row })),
    card_prints: payload.rows.card_prints.map((row) => ({
      ...row,
      data_quality_flags: {
        ...(row.data_quality_flags ?? {}),
        mtg_catalog_release_v1: {
          status: "hidden_by_release_control",
          release_version: "MTG_CATALOG_APP_VISIBILITY_BOUNDARY_V1",
        },
      },
    })),
    card_print_identity: payload.rows.card_print_identity.map((row) => ({ ...row })),
    card_printings: payload.rows.card_printings.map((row) => ({ ...row })),
    external_mappings: payload.rows.external_mappings.map((row) => ({ ...row })),
    external_printing_mappings: payload.rows.external_printing_mappings.map((row) => ({
      ...row,
    })),
  };
}

export function buildMtgCanonicalPromotionContractV1({
  payload,
  foundationMigrationSha256,
  visibilityMigrationSha256,
}) {
  const integrity = verifyMtgCanaryPayloadIntegrityV1(payload);
  if (!integrity.ok) {
    throw new Error(`Payload integrity failed: ${integrity.issues.join(", ")}`);
  }
  if (foundationMigrationSha256 !== payload.foundation_migration_sha256) {
    throw new Error("Foundation migration hash does not match the frozen payload");
  }
  const stagingContract = buildMtgCanaryStageContractV1(payload);
  const rows = canonicalPromotionRowsV1(payload);
  const rowCounts = Object.fromEntries(
    Object.entries(rows).map(([name, values]) => [name, values.length]),
  );
  const totalRows = Object.values(rowCounts).reduce((sum, count) => sum + count, 0);
  const mutationContractSha256 = sha256(stableJson(MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1));
  const promotionRowsSha256 = sha256(stableJson(rows));
  const planCore = {
    version: MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1.version,
    writer_payload_fingerprint: payload.writer_payload_fingerprint,
    staging_batch_id: stagingContract.batch_id,
    staging_rows_sha256: stagingContract.staged_rows_sha256,
    selected_set: payload.selected_set,
    foundation_migration_sha256: foundationMigrationSha256,
    visibility_migration_sha256: visibilityMigrationSha256,
    mutation_contract_sha256: mutationContractSha256,
    promotion_rows_sha256: promotionRowsSha256,
    row_counts: rowCounts,
    total_rows: totalRows,
    boundaries: MTG_CANONICAL_CATALOG_PROMOTION_CONTRACT_V1,
  };
  return {
    ...planCore,
    promotion_plan_sha256: sha256(stableJson(planCore)),
    rows,
  };
}
