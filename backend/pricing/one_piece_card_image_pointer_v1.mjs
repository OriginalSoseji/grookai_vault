import {
  ONE_PIECE_CARD_IMAGE_AVAILABLE_STATUSES,
  ONE_PIECE_CARD_IMAGE_COUNT,
  ONE_PIECE_CARD_IMAGE_GAP_STATUS,
  hashOnePieceCardImageV1,
  validateOnePieceCardImagePointersV1,
  validateOnePieceCardImageSourcePlanV1,
} from "./one_piece_card_image_self_host_v1.mjs";

export const ONE_PIECE_CARD_IMAGE_POINTER_VERSION =
  "ONE_PIECE_CARD_IMAGE_POINTER_V1";
export const ONE_PIECE_CARD_IMAGE_POINTER_COLUMNS = Object.freeze([
  "image_url",
  "image_alt_url",
  "image_source",
  "image_hash",
  "image_status",
  "image_res",
  "image_last_checked_at",
  "image_path",
  "image_note",
]);

function iso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function onePieceCardImageSnapshotV1(row) {
  return {
    image_url: row?.image_url ?? null,
    image_alt_url: row?.image_alt_url ?? null,
    image_source: row?.image_source ?? null,
    image_hash: row?.image_hash ?? null,
    image_status: row?.image_status ?? null,
    image_res: row?.image_res ?? null,
    image_last_checked_at: iso(row?.image_last_checked_at),
    image_path: row?.image_path ?? null,
    image_note: row?.image_note ?? null,
  };
}

function expectedBlank(snapshot) {
  return ONE_PIECE_CARD_IMAGE_POINTER_COLUMNS.every((key) =>
    snapshot[key] === null);
}

export function buildOnePieceCardImagePointerPlanV1({
  sourcePlan,
  assetManifest,
  currentRows,
  pointerTimestamp,
  producerCommit,
  sourcePlanSha256,
  assetManifestSha256,
  boundarySnapshot,
}) {
  const sourceById = new Map(sourcePlan.items.map((row) =>
    [row.card_print_id, row]));
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const rows = assetManifest.pointers.map((pointer) => {
    const source = sourceById.get(pointer.card_print_id);
    const current = currentById.get(pointer.card_print_id);
    const before = onePieceCardImageSnapshotV1(current);
    const findings = [];
    if (!source) findings.push("source_missing");
    if (!current) findings.push("current_row_missing");
    if (current?.game_code !== "one_piece") findings.push("wrong_game");
    if (String(current?.source_product_id) !==
        String(pointer.source_product_id)) findings.push("mapping_mismatch");
    if (source && !ONE_PIECE_CARD_IMAGE_AVAILABLE_STATUSES.includes(
      source.source_availability_status)) findings.push("source_not_available");
    if (source?.evidence_role === "existing_official_self_hosted_image") {
      if (before.image_url !== null || before.image_alt_url !== null ||
          before.image_source !== "identity" ||
          before.image_status !== "exact" ||
          before.image_path !== source.existing_image_path ||
          before.image_note !== source.existing_image_note ||
          before.image_hash !== null || before.image_res !== null ||
          before.image_last_checked_at !== null) {
        findings.push("official_before_state_mismatch");
      }
    } else if (!expectedBlank(before)) {
      findings.push("blank_before_state_mismatch");
    }
    const after = {
      image_url: pointer.image_url,
      image_alt_url: null,
      image_source: "identity",
      image_hash: pointer.image_hash,
      image_status: "exact",
      image_res: pointer.image_res,
      image_last_checked_at: iso(pointerTimestamp),
      image_path: pointer.image_path,
      image_note: pointer.image_note,
    };
    return { card_print_id: pointer.card_print_id, gv_id: pointer.gv_id,
      source_product_id: pointer.source_product_id,
      storage_provenance: pointer.image_source,
      evidence_role: source?.evidence_role ?? null,
      before, before_hash_sha256: hashOnePieceCardImageV1(before),
      after, after_hash_sha256: hashOnePieceCardImageV1(after), findings };
  }).sort((left, right) => left.source_product_id - right.source_product_id);
  const gapRows = sourcePlan.items.filter((row) =>
    row.source_availability_status === ONE_PIECE_CARD_IMAGE_GAP_STATUS)
    .map((source) => {
      const current = currentById.get(source.card_print_id);
      return { card_print_id: source.card_print_id, gv_id: source.gv_id,
        source_product_id: source.source_product_id,
        current: onePieceCardImageSnapshotV1(current),
        current_hash_sha256: hashOnePieceCardImageV1(
          onePieceCardImageSnapshotV1(current)) };
    });
  const core = { version: ONE_PIECE_CARD_IMAGE_POINTER_VERSION,
    producer_commit: producerCommit, pointer_timestamp: iso(pointerTimestamp),
    source_plan_fingerprint_sha256: sourcePlan.plan_fingerprint_sha256,
    source_plan_sha256: sourcePlanSha256,
    asset_manifest_fingerprint_sha256:
      assetManifest.pointer_payload_fingerprint_sha256,
    asset_manifest_sha256: assetManifestSha256,
    counts: { catalog_rows: sourcePlan.items.length,
      pointer_rows: rows.length, coverage_gaps: gapRows.length },
    rows, gap_rows: gapRows, boundary_snapshot: boundarySnapshot,
    mutation_contract: { target_table: "public.card_prints",
      allowed_columns: ONE_PIECE_CARD_IMAGE_POINTER_COLUMNS,
      atomicity: "single_transaction", compare_and_swap: "full_before_snapshot",
      rollback_canary: true, storage_writes: 0, release_writes: 0,
      pricing_writes: 0, vault_writes: 0 } };
  return { ...core,
    pointer_payload_fingerprint_sha256: hashOnePieceCardImageV1(rows),
    pointer_plan_fingerprint_sha256: hashOnePieceCardImageV1(core) };
}

export function validateOnePieceCardImagePointerPlanV1(
  plan,
  sourcePlan,
  assetManifest,
) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  const { pointer_payload_fingerprint_sha256: payloadFingerprint,
    pointer_plan_fingerprint_sha256: planFingerprint, ...core } = plan ?? {};
  add(plan?.version !== ONE_PIECE_CARD_IMAGE_POINTER_VERSION,
    "version_mismatch");
  add(planFingerprint !== hashOnePieceCardImageV1(core),
    "plan_fingerprint_mismatch");
  add(payloadFingerprint !== hashOnePieceCardImageV1(plan?.rows ?? []),
    "payload_fingerprint_mismatch");
  add(!validateOnePieceCardImageSourcePlanV1(sourcePlan).valid,
    "source_plan_invalid");
  add(!validateOnePieceCardImagePointersV1(assetManifest?.pointers,
    assetManifest?.counts?.image_pointers).valid, "asset_manifest_invalid");
  add(plan?.source_plan_fingerprint_sha256 !==
    sourcePlan?.plan_fingerprint_sha256, "source_plan_binding_mismatch");
  add(plan?.asset_manifest_fingerprint_sha256 !==
    assetManifest?.pointer_payload_fingerprint_sha256,
  "asset_manifest_binding_mismatch");
  add(plan?.counts?.catalog_rows !== ONE_PIECE_CARD_IMAGE_COUNT,
    "catalog_count_mismatch");
  add(plan?.counts?.pointer_rows !== assetManifest?.counts?.image_pointers ||
      plan?.rows?.length !== plan?.counts?.pointer_rows,
  "pointer_count_mismatch");
  add(plan?.counts?.coverage_gaps !== assetManifest?.counts?.coverage_gaps ||
      plan?.gap_rows?.length !== plan?.counts?.coverage_gaps,
  "gap_count_mismatch");
  add((plan?.rows ?? []).some((row) => row.findings.length > 0),
    "blocked_pointer_rows");
  add((plan?.gap_rows ?? []).some((row) =>
    !expectedBlank(row.current)), "coverage_gap_has_image_claim");
  for (const [label, values] of Object.entries({
    pointer_ids: (plan?.rows ?? []).map((row) => row.card_print_id),
    gap_ids: (plan?.gap_rows ?? []).map((row) => row.card_print_id),
  })) {
    add(new Set(values).size !== values.length, `duplicate_${label}`);
  }
  const pointerIds = new Set((plan?.rows ?? []).map((row) => row.card_print_id));
  add((plan?.gap_rows ?? []).some((row) => pointerIds.has(row.card_print_id)),
    "pointer_gap_overlap");
  return { valid: findings.length === 0,
    findings: [...new Set(findings)] };
}

export function evaluateOnePieceCardImagePointerStateV1(
  plan,
  currentRows,
  phase,
) {
  const expectedKey = phase === "after" ? "after" : "before";
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const findings = [];
  for (const row of plan.rows ?? []) {
    const current = currentById.get(row.card_print_id);
    if (!current || hashOnePieceCardImageV1(
      onePieceCardImageSnapshotV1(current)) !== row[`${expectedKey}_hash_sha256`]) {
      findings.push(`${phase}_state_mismatch:${row.gv_id}`);
    }
  }
  for (const gap of plan.gap_rows ?? []) {
    const current = currentById.get(gap.card_print_id);
    if (!current || hashOnePieceCardImageV1(
      onePieceCardImageSnapshotV1(current)) !== gap.current_hash_sha256) {
      findings.push(`gap_state_mismatch:${gap.gv_id}`);
    }
  }
  return [...new Set(findings)];
}
