import '../env.mjs';

import pg from 'pg';

const { Pool } = pg;

const WORKER_NAME = 'promotion_executor_v1';
const POKEMON_GAME = 'pokemon';
const ALLOWED_ACTION_TYPES = new Set([
  'CREATE_CARD_PRINT',
  'CREATE_CARD_PRINTING',
  'ENRICH_CANON_IMAGE',
]);
const RETRYABLE_EXECUTION_STATUSES = new Set(['PENDING', 'FAILED']);
const STAGING_PAYLOAD_VERSION = 'warehouse_staging_v1';
const PROMOTION_RESULT_TYPES = {
  CARD_PRINT_CREATED: 'CARD_PRINT_CREATED',
  CARD_PRINTING_CREATED: 'CARD_PRINTING_CREATED',
  CANON_IMAGE_ENRICHED: 'CANON_IMAGE_ENRICHED',
  NO_OP: 'NO_OP',
};
const PROMOTED_IMAGE_TARGET_TYPES = {
  CARD_PRINT: 'CARD_PRINT',
};

class ExecutorError extends Error {
  constructor(code, detail = null, context = {}) {
    super(detail ? `${code}:${detail}` : code);
    this.name = 'ExecutorError';
    this.code = code;
    this.detail = detail;
    this.context = context;
  }
}

function log(event, payload = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    worker: WORKER_NAME,
    event,
    ...payload,
  }));
}

function parseArgs(argv) {
  const opts = {
    limit: 10,
    stagingId: null,
    dryRun: true,
    apply: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.apply = false;
      continue;
    }
    if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        opts.limit = parsed;
      }
      continue;
    }
    if (arg.startsWith('--staging-id=')) {
      const value = arg.slice('--staging-id='.length).trim();
      if (value) {
        opts.stagingId = value;
      }
    }
  }

  return opts;
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNumberPlain(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return null;
  const digits = normalized.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
}

function normalizeNameKey(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase().replace(/\s+/g, ' ') : null;
}

function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ''),
  );
}

function isUsablePublicImageUrl(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function summarizeExistingSucceeded(stagingRow, candidateRow) {
  return {
    staging_id: stagingRow.id,
    candidate_id: stagingRow.candidate_id,
    approved_action_type: stagingRow.approved_action_type,
    execution_status: stagingRow.execution_status,
    candidate_state: candidateRow?.state ?? null,
    promotion_result_type: candidateRow?.promotion_result_type ?? null,
    promoted_card_print_id: candidateRow?.promoted_card_print_id ?? null,
    promoted_card_printing_id: candidateRow?.promoted_card_printing_id ?? null,
    promoted_image_target_type: candidateRow?.promoted_image_target_type ?? null,
    promoted_image_target_id: candidateRow?.promoted_image_target_id ?? null,
    executed_at: stagingRow.executed_at ?? null,
  };
}

function getVisibleIdentityHints(payload) {
  return asRecord(payload?.latest_normalized_package?.visible_identity_hints) ?? null;
}

function getNormalizedPackage(payload) {
  return asRecord(payload?.latest_normalized_package) ?? null;
}

function getClassificationPackage(payload) {
  return asRecord(payload?.latest_classification_package) ?? null;
}

function getMetadataExtractionPackage(payload) {
  return asRecord(payload?.latest_metadata_extraction_package) ?? null;
}

function getMetadataIdentity(payload) {
  return asRecord(getMetadataExtractionPackage(payload)?.identity) ?? null;
}

function getWritePlan(payload) {
  return asRecord(payload?.write_plan) ?? null;
}

function getPlannedCardPrint(payload) {
  return asRecord(getWritePlan(payload)?.preview?.after?.card_prints) ?? null;
}

function getResolverSummary(payload) {
  return asRecord(getClassificationPackage(payload)?.resolver_summary) ?? null;
}

function getEvidenceSummary(payload) {
  return asRecord(payload?.evidence_summary) ?? null;
}

function getEvidenceRows(payload) {
  const summary = getEvidenceSummary(payload);
  const rows = Array.isArray(summary?.evidence_rows) ? summary.evidence_rows : [];
  return rows.map((row) => asRecord(row)).filter(Boolean);
}

function extractSetCode(payload) {
  const visibleHints = getVisibleIdentityHints(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const classificationPackage = getClassificationPackage(payload);
  const metadataIdentity = getMetadataIdentity(payload);
  const frozenIdentity = asRecord(payload?.frozen_identity);
  const plannedCardPrint = getPlannedCardPrint(payload);
  const normalizedExtracted = asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields;
  const classifiedExtracted = asRecord(classificationPackage?.metadata_documentation)?.extracted_fields;

  return (
    normalizeLowerOrNull(plannedCardPrint?.set_code) ||
    normalizeLowerOrNull(frozenIdentity?.set_code) ||
    normalizeLowerOrNull(metadataIdentity?.set_code) ||
    normalizeLowerOrNull(visibleHints?.set_hint) ||
    normalizeLowerOrNull(normalizedExtracted?.set_hint) ||
    normalizeLowerOrNull(classifiedExtracted?.set_hint)
  );
}

function extractCardName(payload) {
  const visibleHints = getVisibleIdentityHints(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const classificationPackage = getClassificationPackage(payload);
  const metadataIdentity = getMetadataIdentity(payload);
  const frozenIdentity = asRecord(payload?.frozen_identity);
  const plannedCardPrint = getPlannedCardPrint(payload);
  const normalizedExtracted = asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields;
  const classifiedExtracted = asRecord(classificationPackage?.metadata_documentation)?.extracted_fields;

  return (
    normalizeTextOrNull(plannedCardPrint?.name) ||
    normalizeTextOrNull(frozenIdentity?.name) ||
    normalizeTextOrNull(metadataIdentity?.name) ||
    normalizeTextOrNull(visibleHints?.card_name) ||
    normalizeTextOrNull(normalizedExtracted?.card_name) ||
    normalizeTextOrNull(classifiedExtracted?.card_name)
  );
}

function extractPrintedNumberPlain(payload) {
  const visibleHints = getVisibleIdentityHints(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const classificationPackage = getClassificationPackage(payload);
  const metadataIdentity = getMetadataIdentity(payload);
  const frozenIdentity = asRecord(payload?.frozen_identity);
  const plannedCardPrint = getPlannedCardPrint(payload);
  const normalizedExtracted = asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields;
  const classifiedExtracted = asRecord(classificationPackage?.metadata_documentation)?.extracted_fields;

  return (
    normalizeTextOrNull(plannedCardPrint?.number_plain) ||
    normalizeNumberPlain(plannedCardPrint?.number) ||
    normalizeTextOrNull(frozenIdentity?.number_plain) ||
    normalizeTextOrNull(metadataIdentity?.number_plain) ||
    normalizeNumberPlain(metadataIdentity?.printed_number) ||
    normalizeNumberPlain(metadataIdentity?.number) ||
    normalizeTextOrNull(visibleHints?.printed_number_plain) ||
    normalizeNumberPlain(visibleHints?.printed_number) ||
    normalizeTextOrNull(normalizedExtracted?.printed_number_plain) ||
    normalizeNumberPlain(normalizedExtracted?.printed_number) ||
    normalizeTextOrNull(classifiedExtracted?.printed_number_plain) ||
    normalizeNumberPlain(classifiedExtracted?.printed_number)
  );
}

function extractVariantKey(payload) {
  const frozenIdentity = asRecord(payload?.frozen_identity);
  const writePlan = asRecord(payload?.write_plan);
  const plannedCardPrint = asRecord(writePlan?.preview?.after?.card_prints);

  return (
    normalizeTextOrNull(plannedCardPrint?.variant_key) ||
    normalizeTextOrNull(frozenIdentity?.variant_key) ||
    ''
  );
}

function extractRarityHint(payload) {
  const visibleHints = getVisibleIdentityHints(payload);
  return normalizeTextOrNull(visibleHints?.rarity_hint);
}

function extractResolvedFinishKey(payload) {
  return (
    normalizeTextOrNull(payload?.candidate_summary?.interpreter_resolved_finish_key) ||
    normalizeTextOrNull(getVisibleIdentityHints(payload)?.finish_hint)
  );
}

function extractMatchedCardPrintId(payload) {
  const resolverSummary = getResolverSummary(payload);
  const normalizedPackage = getNormalizedPackage(payload);
  const normalizedExtracted = asRecord(normalizedPackage?.raw_metadata_documentation)?.extracted_fields;
  const candidateId =
    normalizeTextOrNull(resolverSummary?.matched_card_print_id) ||
    normalizeTextOrNull(normalizedExtracted?.matched_card_print_id);
  return isUuid(candidateId) ? candidateId : null;
}

function extractMatchedCardPrintingId(payload) {
  const resolverSummary = getResolverSummary(payload);
  const candidateId = normalizeTextOrNull(resolverSummary?.matched_card_printing_id);
  return isUuid(candidateId) ? candidateId : null;
}

function extractPublicImageUrl(payload) {
  const evidenceRows = getEvidenceRows(payload);
  for (const row of evidenceRows) {
    const candidate = normalizeTextOrNull(row?.storage_path);
    if (isUsablePublicImageUrl(candidate)) {
      return candidate;
    }
  }

  const normalizedPackage = getNormalizedPackage(payload);
  const maybeRefs = [
    normalizedPackage?.primary_front_image_ref,
    normalizedPackage?.secondary_back_image_ref,
    ...(Array.isArray(normalizedPackage?.normalized_image_refs) ? normalizedPackage.normalized_image_refs : []),
  ];

  for (const ref of maybeRefs) {
    const candidate = normalizeTextOrNull(ref);
    if (isUsablePublicImageUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildPreflightFailure(stage, candidate, error) {
  return {
    ok: false,
    stage,
    candidate,
    error_code: error.code,
    error_detail: error.detail ?? null,
    error_context: error.context ?? {},
  };
}

async function fetchPendingStageIds(client, limit) {
  const sql = `
    select id
    from public.canon_warehouse_promotion_staging
    where execution_status = 'PENDING'
    order by staged_at asc, id asc
    limit $1
  `;
  const { rows } = await client.query(sql, [limit]);
  return rows.map((row) => row.id);
}

async function fetchStageRow(client, stageId) {
  const sql = `
    select
      id,
      candidate_id,
      approved_action_type,
      frozen_payload,
      founder_approved_by_user_id,
      founder_approved_at,
      staged_by_user_id,
      staged_at,
      execution_status,
      execution_attempts,
      last_error,
      last_attempted_at,
      executed_at
    from public.canon_warehouse_promotion_staging
    where id = $1
    limit 1
  `;
  const { rows } = await client.query(sql, [stageId]);
  return rows[0] ?? null;
}

async function fetchCandidateRow(client, candidateId) {
  const sql = `
    select
      id,
      state,
      current_staging_id,
      submission_intent,
      notes,
      tcgplayer_id,
      interpreter_decision,
      interpreter_reason_code,
      interpreter_explanation,
      interpreter_resolved_finish_key,
      proposed_action_type,
      founder_approved_by_user_id,
      founder_approved_at,
      founder_approval_notes,
      promotion_result_type,
      promoted_card_print_id,
      promoted_card_printing_id,
      promoted_image_target_type,
      promoted_image_target_id,
      promoted_by_user_id,
      promoted_at
    from public.canon_warehouse_candidates
    where id = $1
    limit 1
  `;
  const { rows } = await client.query(sql, [candidateId]);
  return rows[0] ?? null;
}

async function fetchSetByCode(client, setCode) {
  const sql = `
    select id, code, game
    from public.sets
    where lower(code) = $1
      and game = $2
    order by id asc
    limit 2
  `;
  const { rows } = await client.query(sql, [normalizeLowerOrNull(setCode), POKEMON_GAME]);
  return rows;
}

async function fetchExistingCardPrints(client, setId, numberPlain, variantKey = '') {
  const sql = `
    select
      id,
      set_id,
      set_code,
      name,
      number,
      number_plain,
      variant_key,
      tcgplayer_id,
      image_url,
      image_alt_url
    from public.card_prints
    where set_id = $1
      and coalesce(variant_key, '') = $3
      and (
        number_plain = $2
        or number = $2
      )
    order by id asc
    limit 2
  `;
  const { rows } = await client.query(sql, [setId, numberPlain, normalizeTextOrNull(variantKey) ?? '']);
  return rows;
}

async function fetchCardPrintById(client, cardPrintId) {
  const sql = `
    select
      id,
      set_id,
      set_code,
      name,
      number,
      number_plain,
      variant_key,
      image_url,
      image_alt_url
    from public.card_prints
    where id = $1
    limit 1
  `;
  const { rows } = await client.query(sql, [cardPrintId]);
  return rows[0] ?? null;
}

async function fetchCardPrintingById(client, cardPrintingId) {
  const sql = `
    select id, card_print_id, finish_key
    from public.card_printings
    where id = $1
    limit 1
  `;
  const { rows } = await client.query(sql, [cardPrintingId]);
  return rows[0] ?? null;
}

async function fetchExistingCardPrinting(client, cardPrintId, finishKey) {
  const sql = `
    select id, card_print_id, finish_key
    from public.card_printings
    where card_print_id = $1
      and finish_key = $2
    order by id asc
    limit 1
  `;
  const { rows } = await client.query(sql, [cardPrintId, finishKey]);
  return rows[0] ?? null;
}

async function finishKeyExists(client, finishKey) {
  const sql = `
    select key
    from public.finish_keys
    where key = $1
      and is_active = true
    limit 1
  `;
  const { rows } = await client.query(sql, [finishKey]);
  return rows.length > 0;
}

async function insertExecutorEvent(client, payload) {
  const sql = `
    insert into public.canon_warehouse_candidate_events (
      candidate_id,
      staging_id,
      event_type,
      action,
      previous_state,
      next_state,
      actor_user_id,
      actor_type,
      metadata,
      created_at
    )
    values ($1, $2, $3, $4, $5, $6, null, 'EXECUTOR', $7::jsonb, now())
  `;

  await client.query(sql, [
    payload.candidateId,
    payload.stagingId,
    payload.eventType,
    payload.action,
    payload.previousState,
    payload.nextState,
    JSON.stringify({
      worker: WORKER_NAME,
      ...payload.metadata,
    }),
  ]);
}

function buildBaseSummary(stage, candidate, payload) {
  return {
    staging_id: stage.id,
    candidate_id: stage.candidate_id,
    approved_action_type: stage.approved_action_type,
    execution_status: stage.execution_status,
    candidate_state: candidate?.state ?? null,
    payload_version: normalizeTextOrNull(payload?.payload_version),
  };
}

async function buildExecutionPlan(client, stage, candidate) {
  const payload = asRecord(stage.frozen_payload);
  if (!payload) {
    throw new ExecutorError('staging_payload_missing');
  }
  const payloadCandidateSummary = asRecord(payload.candidate_summary);

  const payloadVersion = normalizeTextOrNull(payload.payload_version);
  if (payloadVersion !== STAGING_PAYLOAD_VERSION) {
    throw new ExecutorError('unsupported_payload_version', payloadVersion ?? 'null');
  }

  if (normalizeTextOrNull(payload.candidate_id) !== stage.candidate_id) {
    throw new ExecutorError('staging_candidate_id_mismatch');
  }

  if (!candidate) {
    throw new ExecutorError('candidate_not_found');
  }

  if (candidate.state !== 'STAGED_FOR_PROMOTION') {
    throw new ExecutorError('candidate_not_staged_for_promotion', candidate.state);
  }

  if (candidate.current_staging_id !== stage.id) {
    throw new ExecutorError('candidate_current_staging_mismatch', candidate.current_staging_id ?? 'null');
  }

  if (!normalizeTextOrNull(stage.approved_action_type) || !ALLOWED_ACTION_TYPES.has(stage.approved_action_type)) {
    throw new ExecutorError('invalid_approved_action_type', stage.approved_action_type ?? 'null');
  }

  if (!normalizeTextOrNull(payload.approved_action_type) || payload.approved_action_type !== stage.approved_action_type) {
    throw new ExecutorError('staging_action_mismatch');
  }
  if (
    normalizeTextOrNull(payloadCandidateSummary?.proposed_action_type) &&
    payloadCandidateSummary.proposed_action_type !== stage.approved_action_type
  ) {
    throw new ExecutorError('payload_candidate_action_mismatch');
  }

  if (!stage.founder_approved_by_user_id || !stage.founder_approved_at) {
    throw new ExecutorError('founder_approval_missing_on_staging');
  }

  const payloadFounderApproval = asRecord(payload.founder_approval);
  if (
    !normalizeTextOrNull(payloadFounderApproval?.founder_approved_by_user_id) ||
    !normalizeTextOrNull(payloadFounderApproval?.founder_approved_at)
  ) {
    throw new ExecutorError('founder_approval_missing_in_payload');
  }
  if (
    candidate.promotion_result_type !== null ||
    candidate.promoted_card_print_id !== null ||
    candidate.promoted_card_printing_id !== null ||
    candidate.promoted_image_target_id !== null ||
    candidate.promoted_image_target_type !== null ||
    candidate.promoted_at !== null
  ) {
    throw new ExecutorError('candidate_already_has_promotion_result');
  }

  const baseSummary = buildBaseSummary(stage, candidate, payload);

  switch (stage.approved_action_type) {
    case 'CREATE_CARD_PRINT':
      return buildCreateCardPrintPlan(client, stage, candidate, payload, baseSummary);
    case 'CREATE_CARD_PRINTING':
      return buildCreateCardPrintingPlan(client, stage, candidate, payload, baseSummary);
    case 'ENRICH_CANON_IMAGE':
      return buildEnrichCanonImagePlan(client, stage, candidate, payload, baseSummary);
    default:
      throw new ExecutorError('invalid_approved_action_type', stage.approved_action_type);
  }
}

async function buildCreateCardPrintPlan(client, stage, candidate, payload, baseSummary) {
  const setCode = extractSetCode(payload);
  const cardName = extractCardName(payload);
  const numberPlain = extractPrintedNumberPlain(payload);
  const variantKey = extractVariantKey(payload);
  const rarity = extractRarityHint(payload);
  const tcgplayerId = normalizeTextOrNull(payload?.candidate_summary?.tcgplayer_id);

  if (!setCode) {
    throw new ExecutorError('set_code_missing_from_payload');
  }
  if (!cardName) {
    throw new ExecutorError('card_name_missing_from_payload');
  }
  if (!numberPlain) {
    throw new ExecutorError('printed_number_missing_from_payload');
  }

  const setRows = await fetchSetByCode(client, setCode);
  if (setRows.length !== 1) {
    throw new ExecutorError('set_resolution_failed', setCode, { set_row_count: setRows.length });
  }

  const setRow = setRows[0];
  const existingRows = await fetchExistingCardPrints(client, setRow.id, numberPlain, variantKey);
  if (existingRows.length > 1) {
    throw new ExecutorError('duplicate_existing_card_prints', `${setRow.code}:${numberPlain}`);
  }

  if (existingRows.length === 1) {
    const existingRow = existingRows[0];
    if (normalizeNameKey(existingRow.name) !== normalizeNameKey(cardName)) {
      throw new ExecutorError('existing_card_print_name_conflict', existingRow.id, {
        existing_name: existingRow.name,
        staged_name: cardName,
      });
    }
    if (
      tcgplayerId &&
      normalizeTextOrNull(existingRow.tcgplayer_id) &&
      normalizeTextOrNull(existingRow.tcgplayer_id) !== tcgplayerId
    ) {
      throw new ExecutorError('existing_card_print_tcgplayer_conflict', existingRow.id, {
        existing_tcgplayer_id: existingRow.tcgplayer_id,
        staged_tcgplayer_id: tcgplayerId,
      });
    }

    return {
      ok: true,
      action_type: stage.approved_action_type,
      result_type: PROMOTION_RESULT_TYPES.NO_OP,
      mutation: {
        type: 'card_print_existing_noop',
        card_print_id: existingRow.id,
      },
      result_linkage: {
        promoted_card_print_id: existingRow.id,
        promoted_card_printing_id: null,
        promoted_image_target_type: null,
        promoted_image_target_id: null,
      },
      summary: {
        ...baseSummary,
        plan: 'existing_card_print_noop',
        set_code: setRow.code,
        number_plain: numberPlain,
        card_name: cardName,
        result_card_print_id: existingRow.id,
        variant_key: variantKey,
      },
      payload,
      candidate,
      stage,
    };
  }

  return {
    ok: true,
    action_type: stage.approved_action_type,
    result_type: PROMOTION_RESULT_TYPES.CARD_PRINT_CREATED,
    mutation: {
      type: 'insert_card_print',
      set_id: setRow.id,
      set_code: setRow.code,
      number: numberPlain,
      variant_key: variantKey,
      name: cardName,
      rarity,
      tcgplayer_id: tcgplayerId,
    },
    result_linkage: {
      promoted_card_print_id: null,
      promoted_card_printing_id: null,
      promoted_image_target_type: null,
      promoted_image_target_id: null,
    },
    summary: {
      ...baseSummary,
      plan: 'insert_card_print',
      set_code: setRow.code,
      number_plain: numberPlain,
      card_name: cardName,
      variant_key: variantKey,
      tcgplayer_id: tcgplayerId,
    },
    payload,
    candidate,
    stage,
  };
}

async function buildCreateCardPrintingPlan(client, stage, candidate, payload, baseSummary) {
  const parentCardPrintId = extractMatchedCardPrintId(payload);
  const finishKey = extractResolvedFinishKey(payload);

  if (!parentCardPrintId) {
    throw new ExecutorError('parent_card_print_missing_from_payload');
  }
  if (!finishKey) {
    throw new ExecutorError('finish_key_missing_from_payload');
  }

  const [parentCardPrint, finishActive] = await Promise.all([
    fetchCardPrintById(client, parentCardPrintId),
    finishKeyExists(client, finishKey),
  ]);

  if (!parentCardPrint) {
    throw new ExecutorError('parent_card_print_not_found', parentCardPrintId);
  }
  if (!finishActive) {
    throw new ExecutorError('finish_key_not_found', finishKey);
  }

  const existingPrinting = await fetchExistingCardPrinting(client, parentCardPrintId, finishKey);
  if (existingPrinting) {
    return {
      ok: true,
      action_type: stage.approved_action_type,
      result_type: PROMOTION_RESULT_TYPES.NO_OP,
      mutation: {
        type: 'card_printing_existing_noop',
        card_printing_id: existingPrinting.id,
      },
      result_linkage: {
        promoted_card_print_id: null,
        promoted_card_printing_id: existingPrinting.id,
        promoted_image_target_type: null,
        promoted_image_target_id: null,
      },
      summary: {
        ...baseSummary,
        plan: 'existing_card_printing_noop',
        parent_card_print_id: parentCardPrintId,
        finish_key: finishKey,
        result_card_printing_id: existingPrinting.id,
      },
      payload,
      candidate,
      stage,
    };
  }

  return {
    ok: true,
    action_type: stage.approved_action_type,
    result_type: PROMOTION_RESULT_TYPES.CARD_PRINTING_CREATED,
    mutation: {
      type: 'insert_card_printing',
      card_print_id: parentCardPrintId,
      finish_key: finishKey,
      is_provisional: false,
      provenance_source: 'contract',
      provenance_ref: `warehouse_staging:${stage.id}`,
      created_by: WORKER_NAME,
    },
    result_linkage: {
      promoted_card_print_id: null,
      promoted_card_printing_id: null,
      promoted_image_target_type: null,
      promoted_image_target_id: null,
    },
    summary: {
      ...baseSummary,
      plan: 'insert_card_printing',
      parent_card_print_id: parentCardPrintId,
      finish_key: finishKey,
    },
    payload,
    candidate,
    stage,
  };
}

async function buildEnrichCanonImagePlan(client, stage, candidate, payload, baseSummary) {
  const targetCardPrintId = extractMatchedCardPrintId(payload);
  const matchedCardPrintingId = extractMatchedCardPrintingId(payload);
  if (!targetCardPrintId) {
    if (matchedCardPrintingId) {
      const child = await fetchCardPrintingById(client, matchedCardPrintingId);
      if (!child?.card_print_id) {
        throw new ExecutorError('image_target_not_found', matchedCardPrintingId);
      }
    }
    throw new ExecutorError('image_target_missing_from_payload');
  }

  const targetCardPrint = await fetchCardPrintById(client, targetCardPrintId);
  if (!targetCardPrint) {
    throw new ExecutorError('image_target_not_found', targetCardPrintId);
  }

  const desiredImageUrl = extractPublicImageUrl(payload);
  const currentImageUrl = normalizeTextOrNull(targetCardPrint.image_url);
  const currentImageAltUrl = normalizeTextOrNull(targetCardPrint.image_alt_url);
  const hasUsablePrimary = isUsablePublicImageUrl(currentImageUrl);
  const hasUsableAlt = isUsablePublicImageUrl(currentImageAltUrl);

  if (desiredImageUrl && (currentImageUrl === desiredImageUrl || currentImageAltUrl === desiredImageUrl)) {
    return {
      ok: true,
      action_type: stage.approved_action_type,
      result_type: PROMOTION_RESULT_TYPES.NO_OP,
      mutation: {
        type: 'canon_image_existing_noop',
        target_card_print_id: targetCardPrintId,
      },
      result_linkage: {
        promoted_card_print_id: null,
        promoted_card_printing_id: null,
        promoted_image_target_type: PROMOTED_IMAGE_TARGET_TYPES.CARD_PRINT,
        promoted_image_target_id: targetCardPrintId,
      },
      summary: {
        ...baseSummary,
        plan: 'canon_image_existing_noop',
        target_card_print_id: targetCardPrintId,
        desired_image_url: desiredImageUrl,
      },
      payload,
      candidate,
      stage,
    };
  }

  if (!desiredImageUrl) {
    if (hasUsablePrimary || hasUsableAlt) {
      return {
        ok: true,
        action_type: stage.approved_action_type,
        result_type: PROMOTION_RESULT_TYPES.NO_OP,
        mutation: {
          type: 'canon_image_already_present_noop',
          target_card_print_id: targetCardPrintId,
        },
        result_linkage: {
          promoted_card_print_id: null,
          promoted_card_printing_id: null,
          promoted_image_target_type: PROMOTED_IMAGE_TARGET_TYPES.CARD_PRINT,
          promoted_image_target_id: targetCardPrintId,
        },
        summary: {
          ...baseSummary,
          plan: 'canon_image_already_present_noop',
          target_card_print_id: targetCardPrintId,
        },
        payload,
        candidate,
        stage,
      };
    }

    throw new ExecutorError('image_url_missing_from_payload');
  }

  if (!hasUsablePrimary) {
    return {
      ok: true,
      action_type: stage.approved_action_type,
      result_type: PROMOTION_RESULT_TYPES.CANON_IMAGE_ENRICHED,
      mutation: {
        type: 'update_card_print_image_url',
        card_print_id: targetCardPrintId,
        image_url: desiredImageUrl,
      },
      result_linkage: {
        promoted_card_print_id: null,
        promoted_card_printing_id: null,
        promoted_image_target_type: PROMOTED_IMAGE_TARGET_TYPES.CARD_PRINT,
        promoted_image_target_id: targetCardPrintId,
      },
      summary: {
        ...baseSummary,
        plan: 'update_card_print_image_url',
        target_card_print_id: targetCardPrintId,
        desired_image_url: desiredImageUrl,
      },
      payload,
      candidate,
      stage,
    };
  }

  if (!hasUsableAlt) {
    return {
      ok: true,
      action_type: stage.approved_action_type,
      result_type: PROMOTION_RESULT_TYPES.CANON_IMAGE_ENRICHED,
      mutation: {
        type: 'update_card_print_image_alt_url',
        card_print_id: targetCardPrintId,
        image_alt_url: desiredImageUrl,
      },
      result_linkage: {
        promoted_card_print_id: null,
        promoted_card_printing_id: null,
        promoted_image_target_type: PROMOTED_IMAGE_TARGET_TYPES.CARD_PRINT,
        promoted_image_target_id: targetCardPrintId,
      },
      summary: {
        ...baseSummary,
        plan: 'update_card_print_image_alt_url',
        target_card_print_id: targetCardPrintId,
        desired_image_url: desiredImageUrl,
      },
      payload,
      candidate,
      stage,
    };
  }

  throw new ExecutorError('image_target_already_has_distinct_images', targetCardPrintId);
}

async function claimStageForExecution(pool, stageId, allowedStatuses = ['PENDING']) {
  const connection = await pool.connect();
  const claimedAt = new Date().toISOString();
  const normalizedStatuses = Array.from(
    new Set(
      (allowedStatuses ?? [])
        .map((value) => normalizeTextOrNull(value))
        .filter(Boolean),
    ),
  );
  try {
    await connection.query('begin');

    if (normalizedStatuses.length === 0) {
      await connection.query('rollback');
      return { claimed: false, reason: 'no_allowed_execution_statuses' };
    }

    const { rows } = await connection.query(
      `
        select
          id,
          candidate_id,
          approved_action_type,
          execution_status,
          execution_attempts,
          frozen_payload
        from public.canon_warehouse_promotion_staging
        where id = $1
          and execution_status = any($2::text[])
        for update skip locked
      `,
      [stageId, normalizedStatuses],
    );

    const stage = rows[0] ?? null;
    if (!stage) {
      await connection.query('rollback');
      return { claimed: false, reason: 'not_executable_or_locked' };
    }

    const attemptNumber = Number(stage.execution_attempts ?? 0) + 1;
    await connection.query(
      `
        update public.canon_warehouse_promotion_staging
        set
          execution_status = 'RUNNING',
          execution_attempts = execution_attempts + 1,
          last_attempted_at = $2,
          last_error = null
        where id = $1
      `,
      [stageId, claimedAt],
    );

    const payload = asRecord(stage.frozen_payload);
    await insertExecutorEvent(connection, {
      candidateId: stage.candidate_id,
      stagingId: stage.id,
      eventType: 'PROMOTION_EXECUTION_STARTED',
      action: 'EXECUTE',
      previousState: 'STAGED_FOR_PROMOTION',
      nextState: 'STAGED_FOR_PROMOTION',
      metadata: {
        staging_id: stage.id,
        approved_action_type: stage.approved_action_type,
        execution_attempt: attemptNumber,
        payload_version: normalizeTextOrNull(payload?.payload_version),
      },
    });

    await connection.query('commit');
    return { claimed: true, attemptNumber, claimedAt };
  } catch (error) {
    await connection.query('rollback');
    throw error;
  } finally {
    connection.release();
  }
}

async function applyMutation(connection, plan) {
  switch (plan.mutation.type) {
    case 'card_print_existing_noop':
    case 'card_printing_existing_noop':
    case 'canon_image_existing_noop':
    case 'canon_image_already_present_noop':
      return {
        result_type: plan.result_type,
        promoted_card_print_id: plan.result_linkage.promoted_card_print_id,
        promoted_card_printing_id: plan.result_linkage.promoted_card_printing_id,
        promoted_image_target_type: plan.result_linkage.promoted_image_target_type,
        promoted_image_target_id: plan.result_linkage.promoted_image_target_id,
      };
    case 'insert_card_print': {
      const insertSql = `
        insert into public.card_prints (
          set_id,
          set_code,
          number,
          variant_key,
          name,
          rarity,
          tcgplayer_id
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict do nothing
        returning id
      `;
      const insertResult = await connection.query(insertSql, [
        plan.mutation.set_id,
        plan.mutation.set_code,
        plan.mutation.number,
        plan.mutation.variant_key,
        plan.mutation.name,
        plan.mutation.rarity,
        plan.mutation.tcgplayer_id,
      ]);
      let cardPrintId = insertResult.rows[0]?.id ?? null;

      if (!cardPrintId) {
        const existingRows = await fetchExistingCardPrints(
          connection,
          plan.mutation.set_id,
          plan.mutation.number,
          plan.mutation.variant_key,
        );
        if (existingRows.length !== 1) {
          throw new ExecutorError('card_print_insert_conflict', `${plan.mutation.set_code}:${plan.mutation.number}`);
        }
        if (normalizeNameKey(existingRows[0].name) !== normalizeNameKey(plan.mutation.name)) {
          throw new ExecutorError('card_print_insert_name_conflict', existingRows[0].id);
        }
        cardPrintId = existingRows[0].id;
        return {
          result_type: PROMOTION_RESULT_TYPES.NO_OP,
          promoted_card_print_id: cardPrintId,
          promoted_card_printing_id: null,
          promoted_image_target_type: null,
          promoted_image_target_id: null,
        };
      }

      return {
        result_type: plan.result_type,
        promoted_card_print_id: cardPrintId,
        promoted_card_printing_id: null,
        promoted_image_target_type: null,
        promoted_image_target_id: null,
      };
    }
    case 'insert_card_printing': {
      const insertSql = `
        insert into public.card_printings (
          card_print_id,
          finish_key,
          is_provisional,
          provenance_source,
          provenance_ref,
          created_by
        )
        values ($1, $2, $3, $4, $5, $6)
        on conflict on constraint card_printings_card_print_id_finish_key_key do nothing
        returning id
      `;
      const insertResult = await connection.query(insertSql, [
        plan.mutation.card_print_id,
        plan.mutation.finish_key,
        plan.mutation.is_provisional,
        plan.mutation.provenance_source,
        plan.mutation.provenance_ref,
        plan.mutation.created_by,
      ]);
      let cardPrintingId = insertResult.rows[0]?.id ?? null;

      if (!cardPrintingId) {
        const existingPrinting = await fetchExistingCardPrinting(
          connection,
          plan.mutation.card_print_id,
          plan.mutation.finish_key,
        );
        if (!existingPrinting) {
          throw new ExecutorError('card_printing_insert_conflict', `${plan.mutation.card_print_id}:${plan.mutation.finish_key}`);
        }
        cardPrintingId = existingPrinting.id;
        return {
          result_type: PROMOTION_RESULT_TYPES.NO_OP,
          promoted_card_print_id: null,
          promoted_card_printing_id: cardPrintingId,
          promoted_image_target_type: null,
          promoted_image_target_id: null,
        };
      }

      return {
        result_type: plan.result_type,
        promoted_card_print_id: null,
        promoted_card_printing_id: cardPrintingId,
        promoted_image_target_type: null,
        promoted_image_target_id: null,
      };
    }
    case 'update_card_print_image_url': {
      const updateResult = await connection.query(
        `
          update public.card_prints
          set image_url = $2
          where id = $1
            and (image_url is null or btrim(image_url) = '' or image_url = $2)
          returning id
        `,
        [plan.mutation.card_print_id, plan.mutation.image_url],
      );
      if (!updateResult.rows[0]?.id) {
        throw new ExecutorError('card_print_image_update_conflict', plan.mutation.card_print_id);
      }
      return {
        result_type: plan.result_type,
        promoted_card_print_id: null,
        promoted_card_printing_id: null,
        promoted_image_target_type: PROMOTED_IMAGE_TARGET_TYPES.CARD_PRINT,
        promoted_image_target_id: plan.mutation.card_print_id,
      };
    }
    case 'update_card_print_image_alt_url': {
      const updateResult = await connection.query(
        `
          update public.card_prints
          set image_alt_url = $2
          where id = $1
            and (image_alt_url is null or btrim(image_alt_url) = '' or image_alt_url = $2)
          returning id
        `,
        [plan.mutation.card_print_id, plan.mutation.image_alt_url],
      );
      if (!updateResult.rows[0]?.id) {
        throw new ExecutorError('card_print_image_alt_update_conflict', plan.mutation.card_print_id);
      }
      return {
        result_type: plan.result_type,
        promoted_card_print_id: null,
        promoted_card_printing_id: null,
        promoted_image_target_type: PROMOTED_IMAGE_TARGET_TYPES.CARD_PRINT,
        promoted_image_target_id: plan.mutation.card_print_id,
      };
    }
    default:
      throw new ExecutorError('unsupported_mutation_type', plan.mutation.type);
  }
}

async function executeClaimedStage(pool, stageId, attemptNumber) {
  const connection = await pool.connect();
  const executedAt = new Date().toISOString();
  try {
    await connection.query('begin');

    const stage = await fetchStageRow(connection, stageId);
    if (!stage) {
      throw new ExecutorError('staging_row_not_found', stageId);
    }
    if (stage.execution_status !== 'RUNNING') {
      throw new ExecutorError('staging_not_running', stage.execution_status);
    }

    const candidate = await fetchCandidateRow(connection, stage.candidate_id);
    const plan = await buildExecutionPlan(connection, stage, candidate);
    const mutationResult = await applyMutation(connection, plan);

    const stagingUpdateResult = await connection.query(
      `
        update public.canon_warehouse_promotion_staging
        set
          execution_status = 'SUCCEEDED',
          last_error = null,
          last_attempted_at = $2,
          executed_at = $2
        where id = $1
      `,
      [stage.id, executedAt],
    );
    if (stagingUpdateResult.rowCount !== 1) {
      throw new ExecutorError('staging_success_update_failed', stage.id);
    }

    // The candidate schema currently requires promoted_by_user_id on PROMOTED.
    // Executor identity is recorded in warehouse events; founder approval identity is used
    // here only as the linked user until a dedicated executor-actor column exists.
    const candidateUpdateResult = await connection.query(
      `
        update public.canon_warehouse_candidates
        set
          state = 'PROMOTED',
          promotion_result_type = $2,
          promoted_card_print_id = $3,
          promoted_card_printing_id = $4,
          promoted_image_target_type = $5,
          promoted_image_target_id = $6,
          promoted_by_user_id = $7,
          promoted_at = $8,
          current_review_hold_reason = null
        where id = $1
          and state = 'STAGED_FOR_PROMOTION'
          and current_staging_id = $9
      `,
      [
        candidate.id,
        mutationResult.result_type,
        mutationResult.promoted_card_print_id,
        mutationResult.promoted_card_printing_id,
        mutationResult.promoted_image_target_type,
        mutationResult.promoted_image_target_id,
        stage.founder_approved_by_user_id,
        executedAt,
        stage.id,
      ],
    );
    if (candidateUpdateResult.rowCount !== 1) {
      throw new ExecutorError('candidate_promotion_update_failed', candidate.id);
    }

    await insertExecutorEvent(connection, {
      candidateId: candidate.id,
      stagingId: stage.id,
      eventType: 'PROMOTION_EXECUTION_SUCCEEDED',
      action: 'EXECUTE',
      previousState: 'STAGED_FOR_PROMOTION',
      nextState: 'PROMOTED',
      metadata: {
        staging_id: stage.id,
        approved_action_type: stage.approved_action_type,
        execution_attempt: attemptNumber,
        promotion_result_type: mutationResult.result_type,
        promoted_card_print_id: mutationResult.promoted_card_print_id,
        promoted_card_printing_id: mutationResult.promoted_card_printing_id,
        promoted_image_target_type: mutationResult.promoted_image_target_type,
        promoted_image_target_id: mutationResult.promoted_image_target_id,
      },
    });

    await connection.query('commit');

    return {
      status: 'applied',
      summary: {
        staging_id: stage.id,
        candidate_id: candidate.id,
        approved_action_type: stage.approved_action_type,
        execution_attempt: attemptNumber,
        promotion_result_type: mutationResult.result_type,
        promoted_card_print_id: mutationResult.promoted_card_print_id,
        promoted_card_printing_id: mutationResult.promoted_card_printing_id,
        promoted_image_target_type: mutationResult.promoted_image_target_type,
        promoted_image_target_id: mutationResult.promoted_image_target_id,
        executed_at: executedAt,
      },
    };
  } catch (error) {
    await connection.query('rollback');
    throw error;
  } finally {
    connection.release();
  }
}

async function markStageFailed(pool, stageId, error, attemptNumber) {
  const connection = await pool.connect();
  const failedAt = new Date().toISOString();
  try {
    await connection.query('begin');

    const stage = await fetchStageRow(connection, stageId);
    if (!stage) {
      await connection.query('rollback');
      return;
    }
    if (stage.execution_status === 'SUCCEEDED') {
      await connection.query('rollback');
      return;
    }

    const candidate = await fetchCandidateRow(connection, stage.candidate_id);
    const errorMessage = normalizeTextOrNull(error?.message) ?? 'promotion_execution_failed';

    await connection.query(
      `
        update public.canon_warehouse_promotion_staging
        set
          execution_status = 'FAILED',
          last_error = $2,
          last_attempted_at = $3
        where id = $1
      `,
      [stage.id, errorMessage, failedAt],
    );

    await insertExecutorEvent(connection, {
      candidateId: stage.candidate_id,
      stagingId: stage.id,
      eventType: 'PROMOTION_EXECUTION_FAILED',
      action: 'EXECUTE',
      previousState: candidate?.state ?? 'STAGED_FOR_PROMOTION',
      nextState: candidate?.state ?? 'STAGED_FOR_PROMOTION',
      metadata: {
        staging_id: stage.id,
        approved_action_type: stage.approved_action_type,
        execution_attempt: attemptNumber,
        error_code: error?.code ?? null,
        error_message: errorMessage,
        error_context: error?.context ?? null,
      },
    });

    await connection.query('commit');
  } catch (innerError) {
    await connection.query('rollback');
    throw innerError;
  } finally {
    connection.release();
  }
}

async function buildDryRunStageSummary(pool, stageId) {
  const connection = await pool.connect();
  try {
    const stage = await fetchStageRow(connection, stageId);
    if (!stage) {
      return { status: 'skipped', reason: 'staging_not_found' };
    }

    const candidate = await fetchCandidateRow(connection, stage.candidate_id);
    if (stage.execution_status === 'SUCCEEDED') {
      return {
        status: 'already_succeeded',
        summary: summarizeExistingSucceeded(stage, candidate),
      };
    }

    try {
      const plan = await buildExecutionPlan(connection, stage, candidate);
      return {
        status: 'dry_run',
        summary: plan.summary,
        plan: {
          result_type: plan.result_type,
          mutation: plan.mutation,
          result_linkage: plan.result_linkage,
        },
      };
    } catch (error) {
      if (error instanceof ExecutorError) {
        return {
          status: 'dry_run_failed_preflight',
          summary: buildPreflightFailure(stage, candidate, error),
        };
      }
      throw error;
    }
  } finally {
    connection.release();
  }
}

async function processStage(pool, stageId, opts) {
  if (opts.dryRun) {
    return buildDryRunStageSummary(pool, stageId);
  }

  const executableStatuses = opts.allowRetryOnFailed
    ? Array.from(RETRYABLE_EXECUTION_STATUSES)
    : ['PENDING'];

  const preClaimConnection = await pool.connect();
  try {
    const stage = await fetchStageRow(preClaimConnection, stageId);
    if (!stage) {
      return { status: 'skipped', reason: 'staging_not_found' };
    }

    if (stage.execution_status === 'SUCCEEDED') {
      const candidate = await fetchCandidateRow(preClaimConnection, stage.candidate_id);
      return {
        status: 'already_succeeded',
        summary: summarizeExistingSucceeded(stage, candidate),
      };
    }

    if (!executableStatuses.includes(stage.execution_status)) {
      return {
        status: 'skipped',
        reason: `staging_not_executable:${stage.execution_status}`,
      };
    }
  } finally {
    preClaimConnection.release();
  }

  const claim = await claimStageForExecution(pool, stageId, executableStatuses);
  if (!claim.claimed) {
    return {
      status: 'skipped',
      reason: claim.reason,
    };
  }

  try {
    return await executeClaimedStage(pool, stageId, claim.attemptNumber);
  } catch (error) {
    await markStageFailed(pool, stageId, error, claim.attemptNumber);
    return {
      status: 'failed',
      reason: error.message,
      error_code: error.code ?? null,
    };
  }
}

function emitStageResultLog(stageId, result) {
  if (result.status === 'dry_run') {
    log('dry_run_stage_plan', { stage_id: stageId, ...result.summary, plan: result.plan });
  } else if (result.status === 'dry_run_failed_preflight') {
    log('dry_run_stage_preflight_failed', { stage_id: stageId, ...result.summary });
  } else if (result.status === 'applied') {
    log('stage_applied', result.summary);
  } else if (result.status === 'already_succeeded') {
    log('stage_already_succeeded', result.summary);
  } else if (result.status === 'failed') {
    log('stage_failed', { stage_id: stageId, reason: result.reason, error_code: result.error_code ?? null });
  } else {
    log('stage_skipped', { stage_id: stageId, reason: result.reason });
  }
}

export async function runPromotionExecutorV1(input = {}) {
  const opts = {
    limit:
      Number.isFinite(Number(input.limit)) && Number(input.limit) > 0
        ? Math.trunc(Number(input.limit))
        : 10,
    stagingId: normalizeTextOrNull(input.stagingId),
    dryRun: input.apply ? false : input.dryRun === false ? false : true,
    apply: Boolean(input.apply),
    allowRetryOnFailed:
      typeof input.allowRetryOnFailed === 'boolean'
        ? input.allowRetryOnFailed
        : Boolean(input.stagingId),
    emitLogs: input.emitLogs !== false,
  };

  if (opts.apply) {
    opts.dryRun = false;
  }

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const connection = await pool.connect();
    let stageIds;
    try {
      stageIds = opts.stagingId
        ? [opts.stagingId]
        : await fetchPendingStageIds(connection, opts.limit);
      } finally {
      connection.release();
    }

    if (opts.emitLogs) {
      log('worker_start', {
        mode: opts.apply ? 'apply' : 'dry-run',
        requested_limit: opts.limit,
        staging_id: opts.stagingId,
        stage_count: stageIds.length,
        allow_retry_on_failed: opts.allowRetryOnFailed,
      });
    }

    const results = [];
    for (const stageId of stageIds) {
      try {
        const result = await processStage(pool, stageId, opts);
        results.push({ stageId, ...result });

        if (opts.emitLogs) {
          emitStageResultLog(stageId, result);
        }
      } catch (error) {
        results.push({
          stageId,
          status: 'fatal',
          reason: error.message,
        });
        if (opts.emitLogs) {
          log('stage_fatal', { stage_id: stageId, error: error.message });
        }
      }
    }

    const summary = {
      mode: opts.apply ? 'apply' : 'dry-run',
      requested_limit: opts.limit,
      staging_id: opts.stagingId,
      processed: results.length,
      results,
    };

    if (opts.emitLogs) {
      log('worker_complete', summary);
    }

    return summary;
  } finally {
    await pool.end();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await runPromotionExecutorV1(opts);
}

if (process.argv[1] && process.argv[1].includes('promotion_executor_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error.message });
    process.exit(1);
  });
}
