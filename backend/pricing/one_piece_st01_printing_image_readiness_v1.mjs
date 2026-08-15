import {
  deterministicUuidV5,
  sha256,
  stableJson,
} from "./one_piece_canonical_import_staging_v1.mjs";
import {
  ONE_PIECE_GAME_CODE,
  ONE_PIECE_ST01_UUID_NAMESPACE,
  validateOnePieceSt01PromotionPlanV1,
} from "./one_piece_st01_canonical_promotion_v1.mjs";

export const ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION =
  "ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_V1";

export const ONE_PIECE_ST01_PRINTING_IMAGE_PINNED_INPUTS = Object.freeze({
  promotion_plan_sha256:
    "10b238edc52ab8fa1271481231e6803553814c451f348d19e6e459017d9bf5e3",
  source_readback_sha256:
    "ffd53870da7602ad8e3ca703c343696bf3510d64a7caf70270f9f44d7e67dc18",
  storage_readback_rows_sha256:
    "8aa7e0a573e8efe3ae48415670b971d09ee27c37a78e6eff330f7486e4370f3d",
  canonical_post_apply_readback_sha256:
    "93214d2eedc722bb26f48f9306e064172e105b98c7e6eeb685135c487eaceaac",
});

export const ONE_PIECE_ST01_REQUIRED_PRINTING_COLUMNS = Object.freeze([
  "id", "card_print_id", "finish_key", "created_at", "printing_gv_id",
  "image_source", "image_path", "image_url", "image_alt_url",
  "image_status", "image_note", "is_provisional", "provenance_source",
  "provenance_ref", "created_by",
]);

export const ONE_PIECE_ST01_REQUIRED_PARENT_IMAGE_COLUMNS = Object.freeze([
  "id", "gv_id", "image_source", "image_path", "image_url",
  "image_alt_url", "image_status", "image_note", "data_quality_flags",
]);

export const ONE_PIECE_ST01_REQUIRED_PRINTING_MAPPING_COLUMNS = Object.freeze([
  "id", "card_printing_id", "source", "external_id", "active", "synced_at",
  "meta",
]);

function mapBy(rows, key) {
  return new Map((rows ?? []).map((row) => [String(row[key]), row]));
}

function exactNormalPrinting(row, lane) {
  const id = deterministicUuidV5(
    `one-piece:st01:printing:${row.card_number}:normal`,
    ONE_PIECE_ST01_UUID_NAMESPACE,
  );
  return {
    id,
    card_print_id: row.card_print.id,
    printing_gv_id: `${row.card_print.gv_id}-STD`,
    finish_key: "normal",
    is_provisional: false,
    provenance_source: "tcgcsv_source_price_daily_observations",
    provenance_ref: lane.source_price_row_identity,
    created_by: ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
    image_source: null,
    image_path: null,
    image_url: null,
    image_alt_url: null,
    image_status: null,
    image_note: null,
  };
}

function exactNormalMapping(row, lane, printing) {
  return {
    id: deterministicUuidV5(
      `one-piece:st01:printing-mapping:tcgplayer:${row.source_product_id}:normal`,
      ONE_PIECE_ST01_UUID_NAMESPACE,
    ),
    card_printing_id: printing.id,
    source: "tcgplayer",
    external_id: String(row.source_product_id),
    active: true,
    meta: {
      source_price_row_identity: lane.source_price_row_identity,
      source_subtype: lane.subtype_name_normalized,
      evidence_authority: "exact_source_product_single_finish_lane",
      readiness_version: ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
    },
  };
}

export function buildOnePieceSt01PrintingImageEvidenceV1({
  repository,
  inputHashes,
  promotionPlan,
  sourceReadback,
  storageRows,
  canonicalReadback,
}) {
  if (stableJson(inputHashes) !==
      stableJson(ONE_PIECE_ST01_PRINTING_IMAGE_PINNED_INPUTS)) {
    throw new Error("Pinned ST-01 printing/image evidence inputs changed");
  }
  const promotionValidation = validateOnePieceSt01PromotionPlanV1(promotionPlan);
  if (!promotionValidation.valid) {
    throw new Error(`Invalid parent promotion plan: ${promotionValidation.findings.join(",")}`);
  }
  if ((canonicalReadback?.card_rows ?? []).length !== 17 ||
      canonicalReadback?.release_status !== "hidden" ||
      canonicalReadback?.anon_visible !== false ||
      canonicalReadback?.authenticated_visible !== false ||
      canonicalReadback?.service_visible !== false) {
    throw new Error("Canonical ST-01 post-apply proof is incomplete or visible");
  }

  const lanesByProduct = new Map();
  for (const lane of sourceReadback?.source?.price_lanes ?? []) {
    const key = String(lane.source_product_id);
    const values = lanesByProduct.get(key) ?? [];
    values.push(lane);
    lanesByProduct.set(key, values);
  }
  const storageByProduct = mapBy(storageRows, "source_product_id");
  const canonicalById = mapBy(canonicalReadback.card_rows, "id");
  const rows = [];

  for (const row of promotionPlan.payload.numbered_cards) {
    const productKey = String(row.source_product_id);
    const lanes = lanesByProduct.get(productKey) ?? [];
    const storage = storageByProduct.get(productKey);
    const canonical = canonicalById.get(String(row.card_print.id));
    if (lanes.length !== 1 || !storage?.verified || !canonical ||
        canonical.gv_id !== row.card_print.gv_id ||
        storage.target_storage_path !== row.image_storage_path ||
        storage.expected?.sha256 !== row.image_sha256) {
      throw new Error(`Incomplete printing/image evidence for ${row.card_number}`);
    }
    const lane = lanes[0];
    const sourceSubtype = String(lane.subtype_name_normalized ?? "").trim().toLowerCase();
    if (!new Set(["normal", "foil"]).has(sourceSubtype)) {
      throw new Error(`Unexpected source finish subtype for ${row.card_number}`);
    }
    const child = sourceSubtype === "normal" ? exactNormalPrinting(row, lane) : null;
    rows.push({
      card_number: row.card_number,
      name: row.card_print.name,
      source_product_id: Number(row.source_product_id),
      parent_card_print_id: row.card_print.id,
      parent_gv_id: row.card_print.gv_id,
      source_finish_evidence: {
        source: "tcgplayer",
        source_price_row_identity: lane.source_price_row_identity,
        subtype_name_normalized: sourceSubtype,
        observed_on: lane.observed_on,
        positive_market_signal: lane.positive_market_signal === true,
      },
      child_printing_readiness: child ? {
        status: "candidate_pending_live_preflight",
        blocker: null,
        proposed_row: child,
        proposed_external_printing_mapping:
          exactNormalMapping(row, lane, child),
      } : {
        status: "blocked_finish_taxonomy",
        blocker: "source_foil_not_authorized_for_one_piece_finish_registry",
        proposed_row: null,
        proposed_external_printing_mapping: null,
      },
      parent_artwork_pointer_readiness: {
        status: "candidate_pending_live_preflight",
        evidence_role: "exact_parent_artwork_identity",
        does_not_prove_physical_finish: true,
        proposed_values: {
          image_source: "official_one_piece_card_game",
          image_path: storage.target_storage_path,
          image_url: null,
          image_alt_url: null,
          image_status: "exact",
          image_note:
            `Official English ST-01 artwork, self-hosted and byte-verified; ` +
            `does not assert physical finish. Evidence SHA-256 ${storage.expected.sha256}.`,
        },
        data_quality_flag_transition: {
          image_pointer_deferred: { from: true, to: false },
          exact_printing_children_deferred: { from: true, to: true },
        },
        evidence: {
          storage_path: storage.target_storage_path,
          sha256: storage.expected.sha256,
          size_bytes: Number(storage.expected.size_bytes),
          width: Number(storage.expected.width),
          height: Number(storage.expected.height),
          format: storage.expected.format,
          storage_readback_verified: true,
        },
      },
      child_image_policy: {
        status: "not_authorized_from_parent_artwork_evidence",
        reason:
          "Official artwork proves parent artwork identity, not finish-specific physical appearance.",
        proposed_child_image_fields: null,
      },
    });
  }

  const core = {
    version: ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
    repository,
    input_hashes: inputHashes,
    evidence_policy: {
      normal_source_subtype: "stable_child_candidate",
      foil_source_subtype:
        "blocked_until_one_piece_finish_taxonomy_is_explicitly_authorized",
      parent_official_image: "exact_parent_artwork_pointer_candidate",
      child_image: "not_proven_by_parent_artwork",
    },
    boundaries: {
      mode: "read_only_plan",
      database_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_changes: 0,
    },
    rows,
  };
  return {
    ...core,
    evidence_plan_fingerprint_sha256: sha256(stableJson(core)),
  };
}

function gameScopeAllows(finish, gameCode) {
  if (!finish) return false;
  const scope = finish?.meta?.game_scope;
  return !Array.isArray(scope) || scope.includes(gameCode);
}

export function evaluateOnePieceSt01PrintingImageReadinessV1({
  evidencePlan,
  snapshot,
}) {
  const findings = [];
  const add = (condition, code) => {
    if (condition) findings.push(code);
  };
  const { evidence_plan_fingerprint_sha256: ignored, ...core } = evidencePlan ?? {};
  add(evidencePlan?.version !== ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
    "evidence_plan_version_mismatch");
  add(evidencePlan?.evidence_plan_fingerprint_sha256 !== sha256(stableJson(core)),
    "evidence_plan_fingerprint_mismatch");
  add((evidencePlan?.rows ?? []).length !== 17, "evidence_row_count_mismatch");
  add(snapshot?.transaction_read_only !== true, "snapshot_not_read_only");
  add(snapshot?.release?.release_status !== "hidden" ||
      snapshot?.release?.anon_visible !== false ||
      snapshot?.release?.authenticated_visible !== false ||
      snapshot?.release?.service_visible !== false,
  "release_visibility_open");
  for (const column of ONE_PIECE_ST01_REQUIRED_PRINTING_COLUMNS) {
    add(!(snapshot?.schema?.card_printings ?? []).includes(column),
      `card_printings_column_missing:${column}`);
  }
  for (const column of ONE_PIECE_ST01_REQUIRED_PARENT_IMAGE_COLUMNS) {
    add(!(snapshot?.schema?.card_prints ?? []).includes(column),
      `card_prints_column_missing:${column}`);
  }
  for (const column of ONE_PIECE_ST01_REQUIRED_PRINTING_MAPPING_COLUMNS) {
    add(!(snapshot?.schema?.external_printing_mappings ?? []).includes(column),
      `external_printing_mappings_column_missing:${column}`);
  }
  add((snapshot?.parents ?? []).length !== 17, "live_parent_count_mismatch");
  add((snapshot?.parent_mappings ?? []).length !== 17,
    "live_parent_mapping_count_mismatch");
  add((snapshot?.existing_children ?? []).length !== 0,
    "existing_child_printings_present");
  add((snapshot?.existing_printing_mappings ?? []).length !== 0,
    "existing_external_printing_mappings_present");
  add((snapshot?.source_price_lanes ?? []).length !== 17,
    "live_source_price_lane_count_mismatch");
  add((snapshot?.blocking_pids ?? []).length !== 0, "database_session_blocked");

  const finishByKey = mapBy(snapshot?.finish_keys, "key");
  const normal = finishByKey.get("normal");
  const foil = finishByKey.get("foil");
  add(!normal || normal.is_active !== true ||
      !gameScopeAllows(normal, ONE_PIECE_GAME_CODE),
  "normal_finish_not_authorized_for_one_piece");
  add(!foil || foil.is_active !== true, "foil_finish_registry_missing");
  add(gameScopeAllows(foil, ONE_PIECE_GAME_CODE),
    "foil_unexpectedly_authorized_for_one_piece");

  const parents = mapBy(snapshot?.parents, "id");
  const parentMappings = mapBy(snapshot?.parent_mappings, "external_id");
  const liveLanes = new Map((snapshot?.source_price_lanes ?? []).map((lane) => [
    String(lane.source_product_id), lane,
  ]));
  const candidateRows = [];
  for (const row of evidencePlan?.rows ?? []) {
    const prefix = row.card_number ?? "unknown";
    const parent = parents.get(String(row.parent_card_print_id));
    add(!parent || parent.gv_id !== row.parent_gv_id ||
        parent.number !== row.card_number || parent.name !== row.name,
    `parent_identity_mismatch:${prefix}`);
    add(Boolean(parent?.image_source || parent?.image_path || parent?.image_url ||
      parent?.image_alt_url || parent?.image_status || parent?.image_note),
    `parent_image_fields_not_empty:${prefix}`);
    add(parent?.data_quality_flags?.image_pointer_deferred !== true,
      `parent_pointer_not_deferred:${prefix}`);
    const mapping = parentMappings.get(String(row.source_product_id));
    add(!mapping || mapping.card_print_id !== row.parent_card_print_id ||
      mapping.source !== "tcgplayer" || mapping.active !== true,
    `parent_mapping_mismatch:${prefix}`);
    const liveLane = liveLanes.get(String(row.source_product_id));
    add(!liveLane || liveLane.subtype_name_normalized !==
      row.source_finish_evidence.subtype_name_normalized,
    `source_finish_drift:${prefix}`);
    add(liveLane?.source_price_row_identity !==
      row.source_finish_evidence.source_price_row_identity,
    `source_price_identity_drift:${prefix}`);

    const sourceSubtype = row.source_finish_evidence.subtype_name_normalized;
    const child = row.child_printing_readiness.proposed_row;
    if (sourceSubtype === "normal") {
      add(!child || child.finish_key !== "normal" || child.is_provisional !== false ||
        !child.printing_gv_id.endsWith("-STD"),
      `normal_child_candidate_invalid:${prefix}`);
      candidateRows.push({
        ...row,
        child_printing_readiness: {
          ...row.child_printing_readiness,
          status: "ready_for_separate_guarded_apply",
        },
        parent_artwork_pointer_readiness: {
          ...row.parent_artwork_pointer_readiness,
          status: "ready_for_separate_guarded_apply",
        },
      });
    } else {
      add(sourceSubtype !== "foil" || child !== null ||
        row.child_printing_readiness.status !== "blocked_finish_taxonomy",
      `foil_boundary_invalid:${prefix}`);
      candidateRows.push({
        ...row,
        parent_artwork_pointer_readiness: {
          ...row.parent_artwork_pointer_readiness,
          status: "ready_for_separate_guarded_apply",
        },
      });
    }
  }

  for (const [key, value] of Object.entries(snapshot?.collisions ?? {})) {
    add(Number(value) !== 0, `collision:${key}`);
  }
  const normalReady = candidateRows.filter((row) =>
    row.child_printing_readiness.status === "ready_for_separate_guarded_apply");
  const finishBlocked = candidateRows.filter((row) =>
    row.child_printing_readiness.status === "blocked_finish_taxonomy");
  const pointerReady = candidateRows.filter((row) =>
    row.parent_artwork_pointer_readiness.status ===
      "ready_for_separate_guarded_apply");
  add(normalReady.length !== 14, "normal_ready_count_mismatch");
  add(finishBlocked.length !== 3, "finish_blocked_count_mismatch");
  add(pointerReady.length !== 17, "parent_pointer_ready_count_mismatch");
  return {
    valid: findings.length === 0,
    findings: [...new Set(findings)],
    rows: candidateRows,
    counts: {
      selected_parents: 17,
      parent_artwork_pointers_ready: pointerReady.length,
      normal_child_printings_ready: normalReady.length,
      external_printing_mappings_ready: normalReady.length,
      foil_children_blocked_by_taxonomy: finishBlocked.length,
      child_image_pointers_ready: 0,
    },
  };
}

export function buildOnePieceSt01PrintingImageReadinessFingerprintV1({
  producerCommitSha,
  evidencePlanFingerprint,
  snapshot,
  evaluation,
}) {
  return sha256(stableJson({
    version: ONE_PIECE_ST01_PRINTING_IMAGE_READINESS_VERSION,
    producer_commit_sha: producerCommitSha,
    evidence_plan_fingerprint_sha256: evidencePlanFingerprint,
    snapshot,
    counts: evaluation.counts,
    findings: evaluation.findings,
  }));
}
