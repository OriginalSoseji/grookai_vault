import {
  classifyCrossTcgSealedProductV1,
} from "./cross_tcg_sealed_product_identity_v1.mjs";
import {
  sha256V1,
  stableJsonV1,
  validateFutureSealedCanaryPlanV1,
} from "./cross_tcg_sealed_product_domain_v1.mjs";

export const CROSS_TCG_SEALED_PRODUCT_CANARY_PLAN_V1 =
  "CROSS_TCG_SEALED_PRODUCT_NO_PUBLICATION_CANARY_PLAN_V1";

export const SEALED_CANARY_SOURCE_PRODUCT_IDS_V1 = Object.freeze([
  96138,
  496072,
  502983,
  521160,
  561689,
  591147,
  637680,
  643132,
  644352,
  683774,
]);

export const SEALED_CANARY_TABLES_V1 = Object.freeze([
  "sealed_product_families",
  "sealed_product_variants",
  "sealed_product_candidates",
  "sealed_product_candidate_reviews",
  "sealed_product_source_mappings",
  "sealed_product_variant_evidence",
  "sealed_product_pricing_lane_qualifications",
  "sealed_product_releases",
  "sealed_product_release_members",
  "sealed_product_release_pointer",
]);

const CATEGORY_GAME_KEYS = new Map([
  ["Magic: The Gathering", "magic"],
  ["Pokemon", "pokemon"],
  ["Pokemon Japan", "pokemon_japan"],
  ["One Piece Card Game", "one_piece"],
]);

function sourcePayload(row) {
  return {
    source_provider: "tcgplayer",
    source_category_id: Number(row.category_id),
    source_category_name: row.category_name,
    source_group_id: Number(row.group_id),
    source_group_name: row.group_name,
    source_product_id: Number(row.product_id),
    source_product_name: row.name,
    source_clean_name: row.clean_name ?? null,
    source_url: row.source_url ?? null,
    presale_info: row.presale_info ?? null,
    extended_data: row.extended_data ?? [],
  };
}

export function buildSealedCanarySourcePayloadV1(row) {
  const payload = sourcePayload(row);
  return {
    ...payload,
    source_payload_sha256: sha256V1(stableJsonV1(payload)),
  };
}

function addFinding(findings, condition, value) {
  if (condition) findings.push(value);
}

export function buildSealedCanarySelectionPlanV1({ rows, schemaState }) {
  const findings = [];
  const expectedIds = [...SEALED_CANARY_SOURCE_PRODUCT_IDS_V1].sort((a, b) => a - b);
  const actualIds = rows.map((row) => Number(row.product_id)).sort((a, b) => a - b);
  addFinding(findings, new Set(actualIds).size !== actualIds.length,
    "duplicate_source_product_id");
  addFinding(findings, stableJsonV1(actualIds) !== stableJsonV1(expectedIds),
    "selected_source_product_inventory_mismatch");

  const candidates = rows
    .map((row) => {
      const source = buildSealedCanarySourcePayloadV1(row);
      const classification = classifyCrossTcgSealedProductV1({
        ...row,
        category_display_name: row.category_name,
      });
      const gameKey = CATEGORY_GAME_KEYS.get(row.category_name) ?? null;
      addFinding(findings, !gameKey,
        `unsupported_source_category:${row.category_name}`);
      addFinding(findings, classification.classification !== "sealed_candidate",
        `not_sealed_candidate:${source.source_product_id}`);
      addFinding(findings, Number(classification.confidence) < 0.9,
        `weak_classification_confidence:${source.source_product_id}`);
      addFinding(findings, !classification.candidate_identity.package_form,
        `missing_package_form:${source.source_product_id}`);
      return {
        source,
        game_key: gameKey,
        classification: classification.classification,
        classification_confidence: classification.confidence,
        package_form: classification.candidate_identity.package_form,
        candidate_identity: classification.candidate_identity,
        evidence: classification.evidence,
        reasons: classification.reasons,
        authority: {
          candidate_only: true,
          canonical_authority: false,
          publication_authority: false,
          review_status: "unreviewed",
        },
      };
    })
    .sort((left, right) =>
      left.source.source_product_id - right.source.source_product_id);

  for (const table of SEALED_CANARY_TABLES_V1) {
    addFinding(findings, Number(schemaState?.row_counts?.[table] ?? -1) !== 0,
      `sealed_table_not_empty:${table}`);
  }
  addFinding(findings, schemaState?.migration_ledger_present !== true,
    "sealed_schema_migration_ledger_missing");
  addFinding(findings, Number(schemaState?.active_release_pointer_count ?? -1) !== 0,
    "active_release_pointer_not_empty");
  addFinding(findings, schemaState?.transaction_read_only !== "on",
    "source_transaction_not_read_only");
  addFinding(findings,
    schemaState?.transaction_closed_before_artifacts !== true,
    "source_transaction_not_closed_before_artifacts");

  const coveragePlan = {
    candidates: candidates.map((entry) => ({
      source_product_id: entry.source.source_product_id,
    })),
    variants: candidates.map((entry) => ({
      game_key: entry.game_key,
      package_form: entry.package_form,
    })),
    release_state: "draft",
    change_active_release_pointer: false,
    publication_authority: false,
  };
  const coverage = validateFutureSealedCanaryPlanV1(coveragePlan);
  findings.push(...coverage.errors.map((error) => `coverage:${error}`));

  const core = {
    version: CROSS_TCG_SEALED_PRODUCT_CANARY_PLAN_V1,
    selected_source_product_ids: expectedIds,
    candidates,
    schema_state: schemaState,
    coverage_plan: coveragePlan,
    boundaries: {
      database_writes: false,
      canonical_rows_constructed: false,
      founder_review_recorded: false,
      publication_authority: false,
      active_release_pointer_change: false,
      card_domain_writes: false,
      pricing_values: false,
    },
  };
  return {
    ...core,
    plan_sha256: sha256V1(stableJsonV1(core)),
    findings: [...new Set(findings)],
    status: findings.length === 0
      ? "candidate_selection_frozen_review_required"
      : "blocked",
  };
}
