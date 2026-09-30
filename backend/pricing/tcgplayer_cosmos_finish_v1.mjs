export const TCGPLAYER_COSMOS_FINISH_V1 = "TCGPLAYER_COSMOS_FINISH_V1";

// Catalog treatment and provider price bucket are separate facts. Never infer
// Cosmos from the price bucket alone, or accept a generic Holo child as Cosmos.
export function isExplicitTcgplayerCosmosV1(row = {}) {
  return Number(row.category_id) === 3 &&
    /\(Cosmos Holo\)$/i.test(String(row.source_product_name ?? "").trim()) &&
    String(row.source_subtype_name ?? "").trim().toLowerCase() === "holofoil";
}

export function applyCosmosFinishPublicationScopeV1(scope, row = {}) {
  if (scope.rule_id !== "special_holo_treatment" ||
      !isExplicitTcgplayerCosmosV1(row) ||
      row.normalized_finish_key !== "cosmos" || row.finish_key !== "cosmos" ||
      row.cosmos_finish_authority !== true) return scope;
  return { ...scope, in_scope: true, scope_result: "in_scope", reason_code: null,
    rule_id: "verified_exact_cosmos_finish", finish_policy_version: TCGPLAYER_COSMOS_FINISH_V1 };
}

export function cosmosFinishQualificationReasonsV1(row = {}) {
  const required = row.source_mapping_meta?.required_finish_key;
  const cosmos = isExplicitTcgplayerCosmosV1(row) || required === "cosmos" ||
    row.normalized_finish_key === "cosmos" || row.finish_key === "cosmos";
  if (!cosmos) return [];
  const reasons = [];
  if (!isExplicitTcgplayerCosmosV1(row)) reasons.push("cosmos_source_treatment_conflict");
  if (row.normalized_finish_key !== "cosmos" || row.finish_key !== "cosmos") {
    reasons.push("cosmos_exact_finish_required");
  }
  if (row.cosmos_finish_authority !== true) reasons.push("cosmos_exact_mapping_review_required");
  if (!row.variant_assignment_id ||
      row.variant_assignment_version !== "MEE_MARKET_CLOSE_COSMOS_ASSIGNMENT_V1") {
    reasons.push("cosmos_assignment_required");
  }
  return reasons;
}
