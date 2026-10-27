import {
  classifyTcgplayerMarketProductScopeV1_5,
} from "./tcgplayer_market_product_scope_v1.mjs";

export const TCGPLAYER_IDENTITY_MAPPING_WORKLIST_V1 =
  "TCGPLAYER_IDENTITY_MAPPING_WORKLIST_V1";

export const TCGPLAYER_MARKET_COVERAGE_POLICY_V1_3 =
  "TCGPLAYER_MARKET_COVERAGE_POLICY_V1_3";

const IDENTITY_REASONS = new Set([
  "missing_active_source_mapping",
  "missing_mapping_method",
]);

function text(value) {
  return String(value ?? "").trim();
}

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function escapeTcgplayerWorklistMarkdownCellV1(value) {
  return text(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

export function buildTcgplayerIdentityMappingWorklistV1(
  rows,
  { expectedRowCount = null } = {},
) {
  const findings = [];
  const observationIds = new Set();
  const groups = new Map();
  const categories = new Map();
  const routes = new Map();
  const products = new Set();
  const gaps = [];

  for (const row of rows ?? []) {
    const primaryReason = text(row.primary_reason);
    const sourceObservationId = text(row.source_observation_id);
    const sourceProductId = integer(row.source_product_id);
    const sourceGroupId = integer(row.source_group_id);
    const sourceCategoryId = integer(row.source_category_id);
    const sourceProductName = text(row.source_product_name);
    const sourceGroupName = text(row.source_group_name);
    const sourceCategoryName = text(row.source_category_name);
    const sourceSubtypeName = text(row.source_subtype_name);
    const recordedProductScopeResult = text(row.product_scope_result) || "unknown";
    const hasPrintedNumberEvidence = row.has_printed_number_evidence === true;
    const currentPokemonScope =
      sourceCategoryId === 3 && recordedProductScopeResult === "in_scope"
        ? classifyTcgplayerMarketProductScopeV1_5({
            category_id: sourceCategoryId,
            source_product_name: sourceProductName,
            source_group_name: sourceGroupName,
            has_printed_number_evidence: hasPrintedNumberEvidence,
          })
        : null;
    const productScopeResult =
      currentPokemonScope?.scope_result ?? recordedProductScopeResult;
    const productScopeRuleId =
      currentPokemonScope?.rule_id ?? (text(row.product_scope_rule_id) || null);
    const productScopePolicyVersion =
      currentPokemonScope?.policy_version ??
      (text(row.product_scope_policy_version) || null);

    if (!IDENTITY_REASONS.has(primaryReason)) {
      findings.push(`unexpected_primary_reason:${primaryReason || "missing"}`);
      continue;
    }
    if (
      !sourceObservationId
      || sourceProductId === null
      || sourceGroupId === null
      || sourceCategoryId === null
    ) {
      findings.push(`incomplete_source_identity:${sourceObservationId || "missing"}`);
      continue;
    }
    if (
      !sourceProductName
      || !sourceGroupName
      || !sourceCategoryName
      || !sourceSubtypeName
    ) {
      findings.push(`incomplete_source_metadata:${sourceObservationId}`);
      continue;
    }
    if (observationIds.has(sourceObservationId)) {
      findings.push(`duplicate_source_observation:${sourceObservationId}`);
      continue;
    }

    observationIds.add(sourceObservationId);
    products.add(sourceProductId);
    const category = categories.get(sourceCategoryId) ?? {
      source_category_id: sourceCategoryId,
      source_category_name: sourceCategoryName,
      agent_key: sourceCategoryId === 1
        ? "mtg-tcgplayer-identity-repair-v1"
        : sourceCategoryId === 3
          ? "pokemon-tcgplayer-identity-repair-v1"
          : "tcgplayer-identity-triage-v1",
      backlog_rows: 0,
      source_product_ids: new Set(),
      source_group_ids: new Set(),
      reasons: {},
    };
    category.backlog_rows += 1;
    category.source_product_ids.add(sourceProductId);
    category.source_group_ids.add(sourceGroupId);
    category.reasons[primaryReason] =
      (category.reasons[primaryReason] ?? 0) + 1;
    categories.set(sourceCategoryId, category);
    const agentKey = productScopeResult === "special_variant_v1_1"
      ? "special-variant-pricing-expansion-v1"
      : productScopeResult === "unsupported_product_kind"
        ? "unsupported-product-pricing-triage-v1"
        : sourceCategoryId === 1
          ? "mtg-tcgplayer-identity-repair-v1"
          : sourceCategoryId === 3
            ? "pokemon-tcgplayer-identity-repair-v1"
            : "tcgplayer-identity-triage-v1";
    const routeKey = `${sourceCategoryId}:${productScopeResult}:${agentKey}`;
    const route = routes.get(routeKey) ?? {
      source_category_id: sourceCategoryId,
      source_category_name: sourceCategoryName,
      product_scope_result: productScopeResult,
      agent_key: agentKey,
      backlog_rows: 0,
      source_product_ids: new Set(),
      source_group_ids: new Set(),
    };
    route.backlog_rows += 1;
    route.source_product_ids.add(sourceProductId);
    route.source_group_ids.add(sourceGroupId);
    routes.set(routeKey, route);
    const group = groups.get(sourceGroupId) ?? {
      source_category_id: sourceCategoryId,
      source_category_name: sourceCategoryName,
      source_group_id: sourceGroupId,
      source_group_name: sourceGroupName,
      backlog_rows: 0,
      source_product_ids: new Set(),
      reasons: {},
    };
    group.backlog_rows += 1;
    group.source_product_ids.add(sourceProductId);
    group.reasons[primaryReason] = (group.reasons[primaryReason] ?? 0) + 1;
    groups.set(sourceGroupId, group);

    gaps.push({
      policy_version: TCGPLAYER_MARKET_COVERAGE_POLICY_V1_3,
      primary_gap_reason: primaryReason,
      decision: text(row.decision),
      source_observation_id: sourceObservationId,
      source_product_id: sourceProductId,
      source_product_name: sourceProductName,
      source_category_id: sourceCategoryId,
      source_category_name: sourceCategoryName,
      source_group_id: sourceGroupId,
      source_group_name: sourceGroupName,
      source_subtype_name: sourceSubtypeName,
      product_scope_result: productScopeResult,
      product_scope_rule_id: productScopeRuleId,
      product_scope_policy_version: productScopePolicyVersion,
      has_printed_number_evidence: hasPrintedNumberEvidence,
      agent_key: agentKey,
    });
  }

  if (
    expectedRowCount !== null
    && integer(expectedRowCount) !== gaps.length
  ) {
    findings.push(
      `identity_mapping_partition_mismatch:${integer(expectedRowCount)}:${gaps.length}`,
    );
  }

  const groupRows = [...groups.values()]
    .map((group) => ({
      source_category_id: group.source_category_id,
      source_category_name: group.source_category_name,
      source_group_id: group.source_group_id,
      source_group_name: group.source_group_name,
      backlog_rows: group.backlog_rows,
      source_products: group.source_product_ids.size,
      reasons: Object.fromEntries(
        Object.entries(group.reasons).sort(([left], [right]) =>
          left.localeCompare(right)),
      ),
    }))
    .sort((left, right) =>
      right.backlog_rows - left.backlog_rows
      || left.source_group_name.localeCompare(right.source_group_name)
      || left.source_group_id - right.source_group_id);
  const categoryRows = [...categories.values()]
    .map((category) => ({
      source_category_id: category.source_category_id,
      source_category_name: category.source_category_name,
      agent_key: category.agent_key,
      backlog_rows: category.backlog_rows,
      source_products: category.source_product_ids.size,
      source_groups: category.source_group_ids.size,
      reasons: Object.fromEntries(
        Object.entries(category.reasons).sort(([left], [right]) =>
          left.localeCompare(right)),
      ),
    }))
    .sort((left, right) =>
      right.backlog_rows - left.backlog_rows
      || left.source_category_name.localeCompare(right.source_category_name)
      || left.source_category_id - right.source_category_id);
  const routeRows = [...routes.values()]
    .map((route) => ({
      source_category_id: route.source_category_id,
      source_category_name: route.source_category_name,
      product_scope_result: route.product_scope_result,
      agent_key: route.agent_key,
      backlog_rows: route.backlog_rows,
      source_products: route.source_product_ids.size,
      source_groups: route.source_group_ids.size,
    }))
    .sort((left, right) =>
      right.backlog_rows - left.backlog_rows
      || left.source_category_name.localeCompare(right.source_category_name)
      || left.product_scope_result.localeCompare(right.product_scope_result));

  return {
    policy_version: TCGPLAYER_IDENTITY_MAPPING_WORKLIST_V1,
    status: findings.length === 0 ? "ready" : "invalid",
    counts: {
      backlog_rows: gaps.length,
      source_products: products.size,
      source_groups: groupRows.length,
      missing_active_source_mapping: gaps.filter((row) =>
        row.primary_gap_reason === "missing_active_source_mapping").length,
      missing_mapping_method: gaps.filter((row) =>
        row.primary_gap_reason === "missing_mapping_method").length,
    },
    routes: routeRows,
    categories: categoryRows,
    groups: groupRows,
    gaps,
    findings: [...new Set(findings)].sort(),
  };
}
