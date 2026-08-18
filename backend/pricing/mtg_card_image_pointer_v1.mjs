import crypto from 'node:crypto';

import {
  MTG_CARD_IMAGE_PATH_ROOT,
  MTG_CARD_IMAGE_PLAN_ROWS,
  MTG_CARD_IMAGE_SELF_HOST_VERSION,
  stableJsonMtgImageV1,
} from './mtg_card_image_self_host_v1.mjs';

export const MTG_CARD_IMAGE_POINTER_VERSION = 'MTG_CARD_IMAGE_POINTER_V1';
export const MTG_GAME_ID = '4d544700-0000-4000-8000-000000000001';
export const MTG_CARD_PRINT_COUNT = 104712;
export const MTG_ELIGIBLE_CARD_PRINT_COUNT = 104412;
export const MTG_IMAGE_CARD_COUNT = 104550;
export const MTG_IMAGE_GAP_COUNT = 162;
export const MTG_FRONT_FACE_COUNT = 104550;
export const MTG_BACK_FACE_COUNT = 3937;
export const MTG_FACE_COUNT = MTG_CARD_IMAGE_PLAN_ROWS;
export const MTG_IMAGE_SOURCE = 'self_hosted_scryfall_exact_print_v1';
export const MTG_FUTURE_DEFERRED_SET_CODES = Object.freeze([
  'ttrk', 'fra', 'sds', 'trc', 'mbc', 'trk', 'frc',
]);

export const MTG_PARENT_IMAGE_COLUMNS = Object.freeze([
  'image_url',
  'image_alt_url',
  'image_source',
  'image_hash',
  'image_status',
  'image_res',
  'image_last_checked_at',
  'image_path',
  'image_note',
  'representative_image_url',
]);

export function hashMtgImagePointerV1(value) {
  const body = Buffer.isBuffer(value) || typeof value === 'string'
    ? value
    : stableJsonMtgImageV1(value);
  return crypto.createHash('sha256').update(body).digest('hex');
}

export function mtgParentImageSnapshotV1(row) {
  return {
    image_url: row?.image_url ?? null,
    image_alt_url: row?.image_alt_url ?? null,
    image_source: row?.image_source ?? null,
    image_hash: row?.image_hash ?? null,
    image_status: row?.image_status ?? null,
    image_res: row?.image_res ?? null,
    image_last_checked_at: row?.image_last_checked_at
      ? new Date(row.image_last_checked_at).toISOString()
      : null,
    image_path: row?.image_path ?? null,
    image_note: row?.image_note ?? null,
    representative_image_url: row?.representative_image_url ?? null,
  };
}

export function mtgParentImageAfterV1(pointer, checkedAt) {
  return {
    image_url: pointer.image_url,
    image_alt_url: null,
    image_source: 'identity',
    image_hash: pointer.image_hash,
    image_status: 'exact',
    image_res: { width: pointer.width, height: pointer.height },
    image_last_checked_at: new Date(checkedAt).toISOString(),
    image_path: pointer.image_path,
    image_note: MTG_IMAGE_SOURCE,
    representative_image_url: null,
  };
}

export function mtgFaceRecordV1(pointer, sourceRunId) {
  return {
    card_print_id: pointer.card_print_id,
    face_index: pointer.face_index,
    face_role: pointer.face_role,
    image_source: MTG_IMAGE_SOURCE,
    image_status: 'exact',
    image_path: pointer.image_path,
    image_url: pointer.image_url,
    image_hash: pointer.image_hash,
    content_type: pointer.content_type,
    width: pointer.width,
    height: pointer.height,
    size_bytes: pointer.size_bytes,
    source_quality: pointer.source_quality,
    source_url: pointer.source_url,
    source_print_id: pointer.scryfall_print_id,
    evidence: {
      producer: MTG_CARD_IMAGE_SELF_HOST_VERSION,
      storage_run_id: String(sourceRunId),
      source_identity_status: 'exact_scryfall_print',
    },
  };
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    .test(String(value ?? ''));
}

export function inspectMtgPointerAggregateV1(rows, expected = {
  faces: MTG_FACE_COUNT,
  fronts: MTG_FRONT_FACE_COUNT,
  backs: MTG_BACK_FACE_COUNT,
  cards: MTG_IMAGE_CARD_COUNT,
}) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(rows.length !== expected.faces, 'face_count_mismatch');
  const keys = rows.map((row) => `${row.card_print_id}:${row.face_index}`);
  add(new Set(keys).size !== keys.length, 'duplicate_face_key');
  const fronts = rows.filter((row) => row.face_role === 'front');
  const backs = rows.filter((row) => row.face_role === 'back');
  add(fronts.length !== expected.fronts, 'front_count_mismatch');
  add(backs.length !== expected.backs, 'back_count_mismatch');
  add(rows.some((row) => !['front', 'back'].includes(row.face_role)),
    'unsupported_face_role');
  const frontIds = new Set(fronts.map((row) => row.card_print_id));
  add(frontIds.size !== expected.cards,
    'front_card_count_mismatch');
  add(rows.some((row) => !validUuid(row.card_print_id)
    || !validUuid(row.scryfall_print_id)
    || !Number.isInteger(row.face_index)
    || row.face_index < 0
    || row.image_source !== MTG_IMAGE_SOURCE
    || row.image_status !== 'exact'
    || !String(row.image_path ?? '').startsWith(`${MTG_CARD_IMAGE_PATH_ROOT}/`)
    || !/^https:\/\//.test(row.image_url ?? '')
    || !/^[0-9a-f]{64}$/.test(row.image_hash ?? '')
    || !Number.isInteger(row.width) || row.width < 100
    || !Number.isInteger(row.height) || row.height < 100
    || !Number.isInteger(row.size_bytes) || row.size_bytes < 1000),
  'invalid_pointer');
  const backWithoutFront = backs.some((row) => !frontIds.has(row.card_print_id));
  add(backWithoutFront, 'back_without_front');
  return {
    valid: findings.length === 0,
    findings: [...new Set(findings)],
    counts: {
      faces: rows.length,
      fronts: fronts.length,
      backs: backs.length,
      cards: new Set(fronts.map((row) => row.card_print_id)).size,
    },
  };
}

export function buildMtgPointerAggregateV1(chunks, expected) {
  const rows = chunks.flatMap((chunk) => chunk.pointers.map((pointer) => ({
    ...pointer,
    source_storage_run_id: String(chunk.run_id),
  }))).sort((left, right) => left.card_print_id.localeCompare(right.card_print_id)
    || left.face_index - right.face_index);
  const inspection = inspectMtgPointerAggregateV1(rows, expected);
  if (!inspection.valid) throw new Error(inspection.findings.join(','));
  const sourceRuns = chunks.map((chunk) => ({
    run_id: String(chunk.run_id),
    start_index: chunk.summary.start_index,
    selected_assets: chunk.summary.selected_assets,
    manifest_logical_sha256: chunk.summary.manifest_logical_sha256,
  })).sort((left, right) => left.start_index - right.start_index);
  const core = {
    version: MTG_CARD_IMAGE_POINTER_VERSION,
    source_runs: sourceRuns,
    counts: inspection.counts,
    rows,
  };
  return {
    ...core,
    aggregate_fingerprint_sha256: hashMtgImagePointerV1(core),
  };
}

export function validateMtgParentRowsV1(aggregate, currentRows, checkedAt) {
  const findings = [];
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const fronts = aggregate.rows.filter((row) => row.face_role === 'front');
  const plan = fronts.map((pointer) => {
    const current = currentById.get(pointer.card_print_id);
    const before = mtgParentImageSnapshotV1(current);
    const proposed = mtgParentImageAfterV1(pointer, checkedAt);
    const rowFindings = [];
    if (!current) rowFindings.push('card_missing');
    if (current?.game_id !== MTG_GAME_ID) rowFindings.push('wrong_game');
    if (current?.scryfall_print_id !== pointer.scryfall_print_id) {
      rowFindings.push('scryfall_mapping_mismatch');
    }
    const beforeBlank = MTG_PARENT_IMAGE_COLUMNS.every((column) => before[column] === null);
    const alreadyAppliedCandidate = {
      ...proposed,
      image_last_checked_at: before.image_last_checked_at,
    };
    const alreadyApplied = before.image_last_checked_at !== null
      && hashMtgImagePointerV1(before) === hashMtgImagePointerV1(alreadyAppliedCandidate);
    const after = alreadyApplied ? before : proposed;
    if (!beforeBlank && !alreadyApplied) rowFindings.push('nonblank_parent_image_conflict');
    findings.push(...rowFindings.map((code) => `${code}:${pointer.gv_id}`));
    return {
      card_print_id: pointer.card_print_id,
      gv_id: pointer.gv_id,
      before,
      before_hash_sha256: hashMtgImagePointerV1(before),
      after,
      after_hash_sha256: hashMtgImagePointerV1(after),
      disposition: rowFindings.length ? 'blocked'
        : alreadyApplied ? 'already_applied_no_op' : 'update_required',
      findings: rowFindings,
    };
  });
  return { valid: findings.length === 0, findings, rows: plan };
}

export function validateMtgExistingFaceRowsV1(aggregate, existingRows) {
  const expected = new Map(aggregate.rows.map((pointer) => {
    const value = mtgFaceRecordV1(pointer, pointer.source_storage_run_id);
    return [`${value.card_print_id}:${value.face_index}`, value];
  }));
  const findings = [];
  for (const row of existingRows) {
    const key = `${row.card_print_id}:${row.face_index}`;
    const wanted = expected.get(key);
    if (!wanted) findings.push(`unexpected_existing_face:${key}`);
    else {
      const comparable = { ...row };
      delete comparable.id;
      delete comparable.created_at;
      if (hashMtgImagePointerV1(comparable) !== hashMtgImagePointerV1(wanted)) {
        findings.push(`existing_face_conflict:${key}`);
      }
    }
  }
  return { valid: findings.length === 0, findings };
}

export function buildMtgImagePointerPlanV1({ aggregate, currentRows,
  existingFaceRows, gapRows, checkedAt, producerCommit, boundarySnapshot,
  expectedCounts = null }) {
  const currentIds = new Set(currentRows.map((row) => row.id));
  const eligibleRows = aggregate.rows.filter((row) => currentIds.has(row.card_print_id));
  const deferredRows = aggregate.rows.filter((row) => !currentIds.has(row.card_print_id));
  const eligibleAggregate = { ...aggregate, rows: eligibleRows };
  const parent = validateMtgParentRowsV1(eligibleAggregate, currentRows, checkedAt);
  const faces = validateMtgExistingFaceRowsV1(eligibleAggregate, existingFaceRows);
  const findings = [...parent.findings, ...faces.findings];
  if (deferredRows.some((row) =>
    !MTG_FUTURE_DEFERRED_SET_CODES.includes(String(row.set_code).toLowerCase()))) {
    findings.push('unauthorized_missing_canonical_card');
  }
  const effectiveExpected = expectedCounts ?? {
    catalog: currentRows.length,
    parents: new Set(eligibleRows.filter((row) => row.face_role === 'front')
      .map((row) => row.card_print_id)).size,
    faces: eligibleRows.length,
    gaps: gapRows.length,
  };
  if (gapRows.length !== effectiveExpected.gaps) findings.push('gap_count_mismatch');
  if (gapRows.some((row) => row.game_id !== MTG_GAME_ID
    || MTG_PARENT_IMAGE_COLUMNS.some((column) => row[column] !== null))) {
    findings.push('gap_boundary_mismatch');
  }
  const faceRows = eligibleRows.map((pointer) =>
    mtgFaceRecordV1(pointer, pointer.source_storage_run_id));
  const core = {
    version: MTG_CARD_IMAGE_POINTER_VERSION,
    producer_commit: producerCommit,
    aggregate_fingerprint_sha256: aggregate.aggregate_fingerprint_sha256,
    checked_at: new Date(checkedAt).toISOString(),
    counts: {
      source_faces: aggregate.rows.length,
      catalog_cards: effectiveExpected.catalog,
      parent_pointers: parent.rows.length,
      face_rows: faceRows.length,
      coverage_gaps: gapRows.length,
      deferred_source_faces: deferredRows.length,
      deferred_source_cards: new Set(deferredRows.map((row) => row.card_print_id)).size,
    },
    parent_rows: parent.rows,
    face_rows: faceRows,
    deferred_source_face_keys: deferredRows.map((row) =>
      `${row.card_print_id}:${row.face_index}`).sort(),
    gap_card_print_ids: gapRows.map((row) => row.id).sort(),
    boundary_snapshot: boundarySnapshot,
    findings,
    mutation_contract: {
      parent_table: 'public.card_prints',
      parent_allowed_columns: MTG_PARENT_IMAGE_COLUMNS,
      face_table: 'public.card_print_image_faces',
      face_rows_insert_only: true,
      atomicity: 'single_transaction',
      compare_and_swap: 'full_parent_before_snapshot',
      release_writes: 0,
      pricing_writes: 0,
      vault_writes: 0,
      pokemon_writes: 0,
      deletes: 0,
    },
  };
  return {
    ...core,
    pointer_plan_fingerprint_sha256: hashMtgImagePointerV1(core),
  };
}

export function inspectMtgImagePointerPlanV1(plan, expected = {
  sourceFaces: MTG_FACE_COUNT,
  catalog: plan?.counts?.catalog_cards,
  parents: plan?.counts?.parent_pointers,
  faces: plan?.counts?.face_rows,
  gaps: plan?.counts?.coverage_gaps,
}) {
  const { pointer_plan_fingerprint_sha256: fingerprint, ...core } = plan ?? {};
  const findings = [...(plan?.findings ?? [])];
  if (plan?.version !== MTG_CARD_IMAGE_POINTER_VERSION) findings.push('version');
  if (fingerprint !== hashMtgImagePointerV1(core)) findings.push('fingerprint');
  if (plan?.counts?.source_faces !== (expected.sourceFaces ?? MTG_FACE_COUNT)
    || plan?.counts?.catalog_cards !== expected.catalog
    || plan?.counts?.parent_pointers !== expected.parents
    || plan?.counts?.face_rows !== expected.faces
    || plan?.counts?.coverage_gaps !== expected.gaps) findings.push('counts');
  if ((plan?.parent_rows ?? []).some((row) => row.findings.length)) findings.push('parent_rows');
  if (new Set((plan?.face_rows ?? []).map((row) =>
    `${row.card_print_id}:${row.face_index}`)).size !== expected.faces) findings.push('face_rows');
  if (Number(plan?.counts?.face_rows) + Number(plan?.counts?.deferred_source_faces)
    !== Number(plan?.counts?.source_faces)) findings.push('source_face_reconciliation');
  if ((plan?.deferred_source_face_keys ?? []).length
    !== Number(plan?.counts?.deferred_source_faces)) findings.push('deferred_faces');
  if (plan?.mutation_contract?.deletes !== 0
    || plan?.mutation_contract?.release_writes !== 0
    || plan?.mutation_contract?.pricing_writes !== 0
    || plan?.mutation_contract?.vault_writes !== 0
    || plan?.mutation_contract?.pokemon_writes !== 0) findings.push('boundary');
  return { valid: findings.length === 0, findings: [...new Set(findings)] };
}
