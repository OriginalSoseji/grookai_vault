export const MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1 =
  "MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1";

export const MTG_PRICING_RECONCILIATION_BOUNDARIES_V1 = Object.freeze({
  offline_only: true,
  database_access: false,
  database_writes: false,
  publication_writes: false,
  release_control_writes: false,
  image_access: false,
  storage_writes: false,
  vault_writes: false,
  active_ingestion_access: false,
  inferred_mappings: false,
});

const V1_FINISHES = new Set(["normal", "foil"]);

function clean(value) {
  return String(value ?? "").trim();
}

export function normalizeMtgPricingSubtypeV1(value) {
  return clean(value).toLowerCase();
}

function sortedUnique(values) {
  return [...new Set(values.map(normalizeMtgPricingSubtypeV1).filter(Boolean))].sort();
}

export function parseMtgTcgplayerLaneIdentityV1(value) {
  const match = /^(\d+):([^:]+)$/.exec(clean(value));
  if (!match) return null;
  const productId = Number(match[1]);
  const subtype = normalizeMtgPricingSubtypeV1(match[2]);
  if (!Number.isSafeInteger(productId) || productId <= 0 || !subtype) return null;
  return {
    product_id: productId,
    source_subtype: subtype,
    source_lane_identity: `${productId}:${subtype}`,
  };
}

export function buildMtgWarehousePricingIndexV1(rows = []) {
  const byProductId = new Map();
  const duplicateProductIds = new Set();
  const normalizedRows = [];

  for (const row of rows) {
    const productId = Number(row?.product_id);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      throw new Error(`Invalid warehouse product_id: ${row?.product_id}`);
    }
    const normalized = {
      product_id: productId,
      group_id: Number(row?.group_id) || null,
      name: clean(row?.name) || null,
      subtypes: sortedUnique(Array.isArray(row?.subtypes) ? row.subtypes : []),
      positive_market_signal_subtypes: sortedUnique(
        Array.isArray(row?.positive_market_subtypes)
          ? row.positive_market_subtypes
          : [],
      ),
    };
    normalizedRows.push(normalized);
    if (byProductId.has(productId)) duplicateProductIds.add(productId);
    else byProductId.set(productId, normalized);
  }

  return {
    by_product_id: byProductId,
    duplicate_product_ids: duplicateProductIds,
    input_row_count: normalizedRows.length,
    unique_product_count: byProductId.size,
  };
}

export function evaluateMtgWarehouseLaneSupportV1({
  productId,
  sourceSubtype,
  warehouseIndex,
}) {
  const subtype = normalizeMtgPricingSubtypeV1(sourceSubtype);
  if (warehouseIndex.duplicate_product_ids.has(productId)) {
    return {
      warehouse_lane_status: "duplicate_warehouse_product",
      warehouse_product_present: true,
      warehouse_subtype_present: false,
      positive_market_signal_present: false,
      warehouse_product_name: null,
    };
  }
  const product = warehouseIndex.by_product_id.get(productId);
  if (!product) {
    return {
      warehouse_lane_status: "missing_warehouse_product",
      warehouse_product_present: false,
      warehouse_subtype_present: false,
      positive_market_signal_present: false,
      warehouse_product_name: null,
    };
  }
  if (!product.subtypes.includes(subtype)) {
    return {
      warehouse_lane_status: "missing_warehouse_subtype",
      warehouse_product_present: true,
      warehouse_subtype_present: false,
      positive_market_signal_present: false,
      warehouse_product_name: product.name,
    };
  }
  const positiveSignal = product.positive_market_signal_subtypes.includes(subtype);
  return {
    warehouse_lane_status: positiveSignal
      ? "exact_snapshot_positive_signal_lane"
      : "exact_lane_without_positive_market_signal",
    warehouse_product_present: true,
    warehouse_subtype_present: true,
    positive_market_signal_present: positiveSignal,
    warehouse_product_name: product.name,
  };
}

export function reconcileMtgExternalPrintingMappingV1({
  mapping,
  printing,
  cardPrint,
  set,
  warehouseIndex,
}) {
  const findings = [];
  const parsed = parseMtgTcgplayerLaneIdentityV1(mapping?.external_id);
  if (mapping?.source !== "tcgplayer_market") {
    findings.push("unsupported_mapping_source");
  }
  if (!parsed) findings.push("invalid_external_lane_identity");
  if (!printing) findings.push("missing_card_printing_reference");
  if (!cardPrint) findings.push("missing_card_print_reference");

  const productId = parsed?.product_id ?? (Number(mapping?.meta?.product_id) || null);
  const sourceSubtype =
    parsed?.source_subtype ?? normalizeMtgPricingSubtypeV1(mapping?.meta?.source_subtype);
  const finish = normalizeMtgPricingSubtypeV1(printing?.finish_key);
  const metaProductId = Number(mapping?.meta?.product_id) || null;
  const metaSubtype = normalizeMtgPricingSubtypeV1(mapping?.meta?.source_subtype);

  if (parsed && metaProductId !== parsed.product_id) {
    findings.push("external_id_meta_product_mismatch");
  }
  if (parsed && metaSubtype !== parsed.source_subtype) {
    findings.push("external_id_meta_subtype_mismatch");
  }
  if (finish && sourceSubtype && finish !== sourceSubtype) {
    findings.push("canonical_finish_source_subtype_mismatch");
  }
  if (finish && !V1_FINISHES.has(finish)) {
    findings.push("finish_outside_mtg_pricing_v1");
  }

  const warehouse = productId && sourceSubtype
    ? evaluateMtgWarehouseLaneSupportV1({ productId, sourceSubtype, warehouseIndex })
    : {
        warehouse_lane_status: "invalid_exact_lane",
        warehouse_product_present: false,
        warehouse_subtype_present: false,
        positive_market_signal_present: false,
        warehouse_product_name: null,
      };

  const structurallyExact = findings.length === 0;
  const exactSupported =
    structurallyExact &&
    warehouse.warehouse_subtype_present &&
    warehouse.warehouse_lane_status !== "duplicate_warehouse_product";
  const shadowQualificationCandidate =
    exactSupported && warehouse.positive_market_signal_present;

  return {
    reconciliation_version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
    set_ordinal: Number(set?.ordinal),
    set_id: clean(set?.source_set_id) || null,
    set_code: clean(set?.code).toLowerCase() || null,
    set_name: clean(set?.name) || null,
    card_print_id: clean(cardPrint?.id) || null,
    card_name: clean(cardPrint?.name) || null,
    collector_number: clean(cardPrint?.number) || null,
    card_printing_id: clean(printing?.id) || clean(mapping?.card_printing_id) || null,
    printing_gv_id: clean(printing?.printing_gv_id) || null,
    finish: finish || null,
    source: clean(mapping?.source) || null,
    product_id: productId,
    source_subtype: sourceSubtype || null,
    source_lane_identity: parsed?.source_lane_identity ?? null,
    warehouse_product_name: warehouse.warehouse_product_name,
    warehouse_product_present: warehouse.warehouse_product_present,
    warehouse_subtype_present: warehouse.warehouse_subtype_present,
    positive_market_signal_present: warehouse.positive_market_signal_present,
    warehouse_lane_status: warehouse.warehouse_lane_status,
    exact_mapping: structurallyExact,
    shadow_qualification_candidate: shadowQualificationCandidate,
    publication_candidate: false,
    publication_state: "blocked_requires_amount_and_freshness",
    findings,
  };
}

export function classifyMtgUnmappedPrintingGapV1({ printing, cardPrint, set }) {
  const finish = normalizeMtgPricingSubtypeV1(printing?.finish_key);
  const reason = finish === "etched"
    ? "unsupported_etched_finish_v1"
    : "no_exact_external_printing_mapping";
  return {
    reconciliation_version: MTG_EXACT_PRINTING_PRICING_RECONCILIATION_V1,
    set_ordinal: Number(set?.ordinal),
    set_id: clean(set?.source_set_id) || null,
    set_code: clean(set?.code).toLowerCase() || null,
    set_name: clean(set?.name) || null,
    card_print_id: clean(cardPrint?.id) || null,
    card_name: clean(cardPrint?.name) || null,
    collector_number: clean(cardPrint?.number) || null,
    card_printing_id: clean(printing?.id) || null,
    printing_gv_id: clean(printing?.printing_gv_id) || null,
    finish: finish || null,
    product_id: null,
    source_subtype: null,
    source_lane_identity: null,
    gap_reason: reason,
    publication_state: "blocked",
    inferred_mapping: false,
  };
}

export function gapReasonForMtgLaneV1(lane) {
  if (lane.findings?.length) return lane.findings[0];
  if (lane.warehouse_lane_status === "duplicate_warehouse_product") {
    return "duplicate_warehouse_product";
  }
  if (lane.warehouse_lane_status === "missing_warehouse_product") {
    return "missing_warehouse_product";
  }
  if (lane.warehouse_lane_status === "missing_warehouse_subtype") {
    return "missing_warehouse_subtype";
  }
  if (lane.warehouse_lane_status === "exact_lane_without_positive_market_signal") {
    return "no_positive_market_signal";
  }
  if (lane.source_lane_collision) return "source_lane_owner_collision";
  if (lane.card_printing_mapping_collision) return "card_printing_mapping_collision";
  return null;
}

export function markMtgMappingCollisionsV1(lanes = []) {
  const bySourceLane = new Map();
  const byPrinting = new Map();
  for (const lane of lanes) {
    if (lane.source_lane_identity) {
      const values = bySourceLane.get(lane.source_lane_identity) ?? [];
      values.push(lane);
      bySourceLane.set(lane.source_lane_identity, values);
    }
    if (lane.card_printing_id) {
      const values = byPrinting.get(lane.card_printing_id) ?? [];
      values.push(lane);
      byPrinting.set(lane.card_printing_id, values);
    }
  }

  const collisions = [];
  for (const [identity, values] of bySourceLane) {
    const owners = [...new Set(values.map((row) => row.card_printing_id).filter(Boolean))].sort();
    if (owners.length <= 1) continue;
    for (const lane of values) {
      lane.source_lane_collision = true;
      lane.shadow_qualification_candidate = false;
      lane.warehouse_lane_status = "source_lane_owner_collision";
    }
    collisions.push({
      collision_type: "source_lane_owner_collision",
      collision_key: identity,
      owner_card_printing_ids: owners,
      owner_count: owners.length,
      publication_state: "blocked",
    });
  }
  for (const [printingId, values] of byPrinting) {
    const lanesForPrinting = [...new Set(values.map((row) => row.source_lane_identity).filter(Boolean))].sort();
    if (lanesForPrinting.length <= 1) continue;
    for (const lane of values) {
      lane.card_printing_mapping_collision = true;
      lane.shadow_qualification_candidate = false;
      lane.warehouse_lane_status = "card_printing_mapping_collision";
    }
    collisions.push({
      collision_type: "card_printing_mapping_collision",
      collision_key: printingId,
      source_lane_identities: lanesForPrinting,
      lane_count: lanesForPrinting.length,
      publication_state: "blocked",
    });
  }
  collisions.sort((left, right) =>
    `${left.collision_type}:${left.collision_key}`.localeCompare(
      `${right.collision_type}:${right.collision_key}`,
    ),
  );
  return collisions;
}

export function isMtgShadowQualificationCandidateV1(lane) {
  return lane?.shadow_qualification_candidate === true &&
    lane?.publication_candidate === false &&
    lane?.source_lane_collision !== true &&
    lane?.card_printing_mapping_collision !== true &&
    Array.isArray(lane?.findings) && lane.findings.length === 0;
}
