import { createHash } from "node:crypto";

import { verifyMtgCanaryPayloadIntegrityV1 } from "./mtg_canonical_catalog_canary_preflight_v1.mjs";
import { buildMtgCanaryStageContractV1, stableJson } from "./mtg_canonical_catalog_canary_stage_v1.mjs";
import { canonicalPromotionRowsV1 } from "./mtg_canonical_catalog_promotion_contract_v1.mjs";

export const MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1 = Object.freeze({
  version: "MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1",
  accepted_payload_version: "MTG_CANONICAL_CATALOG_SET_BATCH_V1",
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
  migration_writes: false,
  release_control_writes: false,
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

function assertSetPayload(payload) {
  if (payload.plan_version !== MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1.accepted_payload_version) {
    throw new Error(`Unsupported set payload version: ${payload.plan_version}`);
  }
  const selectedCode = String(payload.selected_set?.code ?? "").trim().toLowerCase();
  if (!selectedCode) throw new Error("Selected set code is required");
  if (payload.rows.sets.length !== 1) throw new Error("A set promotion must contain exactly one set");
  if (String(payload.rows.sets[0].code).toLowerCase() !== selectedCode) {
    throw new Error("Selected set does not match the canonical set row");
  }
  if (payload.rows.card_prints.some((row) => String(row.set_code).toLowerCase() !== selectedCode)) {
    throw new Error("Card payload contains a row from another set");
  }
}

export function buildMtgCanonicalSetPromotionContractV1(payload) {
  const integrity = verifyMtgCanaryPayloadIntegrityV1(payload);
  if (!integrity.ok) {
    throw new Error(`Payload integrity failed: ${integrity.issues.join(", ")}`);
  }
  assertSetPayload(payload);
  const stagingContract = buildMtgCanaryStageContractV1(payload);
  const rows = canonicalPromotionRowsV1(payload);
  const rowCounts = Object.fromEntries(
    Object.entries(rows).map(([name, values]) => [name, values.length]),
  );
  for (const [name, count] of Object.entries(rowCounts)) {
    if (Number(payload.counts[name]) !== count) {
      throw new Error(`${name} promotion count does not match the frozen payload`);
    }
  }
  const totalRows = Object.values(rowCounts).reduce((sum, count) => sum + count, 0);
  const mutationContractSha256 = sha256(
    stableJson(MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1),
  );
  const promotionRowsSha256 = sha256(stableJson(rows));
  const planCore = {
    version: MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1.version,
    source_plan_version: payload.plan_version,
    writer_payload_fingerprint: payload.writer_payload_fingerprint,
    staging_batch_id: stagingContract.batch_id,
    staging_rows_sha256: stagingContract.staged_rows_sha256,
    selected_set: payload.selected_set,
    foundation_migration_sha256: payload.foundation_migration_sha256,
    mutation_contract_sha256: mutationContractSha256,
    promotion_rows_sha256: promotionRowsSha256,
    row_counts: rowCounts,
    total_rows: totalRows,
    boundaries: MTG_CANONICAL_CATALOG_SET_PROMOTION_CONTRACT_V1,
  };
  return {
    ...planCore,
    promotion_plan_sha256: sha256(stableJson(planCore)),
    rows,
    staging_contract: stagingContract,
  };
}
