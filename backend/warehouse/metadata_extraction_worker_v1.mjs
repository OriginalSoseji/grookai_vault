import '../env.mjs';

import pg from 'pg';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { parseCollectorNumberV1 } from '../identity/parseCollectorNumberV1.mjs';
import { runBufferedExtractionV1 } from './extraction_audit/extraction_audit_runner_v1.mjs';
import {
  buildSourceBackedMetadataExtractionPackages,
  getSourceBackedIdentity,
  EXTERNAL_DISCOVERY_BRIDGE_SOURCE,
} from './source_identity_contract_v1.mjs';

const { Pool } = pg;

const WORKER_NAME = 'metadata_extraction_worker_v1';
const EXTRACTION_EVENT_TYPES = new Set([
  'WAREHOUSE_METADATA_EXTRACTION_COMPLETE',
  'WAREHOUSE_METADATA_EXTRACTION_PARTIAL',
  'WAREHOUSE_METADATA_EXTRACTION_BLOCKED',
]);
const ACTIVE_CANDIDATE_STATES = [
  'RAW',
  'NORMALIZED',
  'CLASSIFIED',
  'REVIEW_READY',
  'APPROVED_BY_FOUNDER',
  'STAGED_FOR_PROMOTION',
];
const WAREHOUSE_EVIDENCE_BUCKET = 'user-card-images';

function log(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), worker: WORKER_NAME, event, ...payload }));
}

function parseArgs(argv) {
  const opts = {
    limit: 10,
    candidateId: null,
    dryRun: true,
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

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

    if (arg === '--candidate-id') {
      const value = normalizeText(argv[index + 1]);
      if (value) {
        opts.candidateId = value;
      }
      index += 1;
      continue;
    }

    if (arg.startsWith('--candidate-id=')) {
      const value = normalizeText(arg.slice('--candidate-id='.length));
      if (value) {
        opts.candidateId = value;
      }
      continue;
    }

    if (arg === '--limit') {
      const value = Number.parseInt(argv[index + 1] ?? '', 10);
      if (Number.isFinite(value) && value > 0) {
        opts.limit = value;
      }
      index += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(value) && value > 0) {
        opts.limit = value;
      }
    }
  }

  return opts;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueText(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((accumulator, key) => {
      accumulator[key] = canonicalizeJson(value[key]);
      return accumulator;
    }, {});
}

function sameJson(left, right) {
  return JSON.stringify(canonicalizeJson(left)) === JSON.stringify(canonicalizeJson(right));
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseJsonSafe(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }
  return value;
}

function buildTraceId(candidateId, mode) {
  return `warehouse_metadata_extraction_v1:${mode}:${candidateId}`;
}

function chooseTerminalEventType(status) {
  switch (status) {
    case 'READY':
      return 'WAREHOUSE_METADATA_EXTRACTION_COMPLETE';
    case 'PARTIAL':
      return 'WAREHOUSE_METADATA_EXTRACTION_PARTIAL';
    case 'BLOCKED':
    default:
      return 'WAREHOUSE_METADATA_EXTRACTION_BLOCKED';
  }
}

function chooseConfidenceLabel(result) {
  const overall = Number(result?.confidence?.overall ?? 0);
  const nameConfidence = Number(result?.confidence?.identity?.name ?? 0);
  const numberConfidence = Number(result?.confidence?.identity?.number ?? 0);
  const setConfidence = Number(result?.confidence?.identity?.set ?? 0);

  if (result?.status === 'BLOCKED') {
    return 'LOW';
  }

  if (overall >= 0.84 && nameConfidence >= 0.8 && numberConfidence >= 0.8 && setConfidence >= 0.8) {
    return 'HIGH';
  }

  if (overall >= 0.55 && nameConfidence >= 0.45 && numberConfidence >= 0.45) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function normalizeFieldConfidence(result) {
  const identity = asRecord(result?.confidence?.identity) ?? {};
  return {
    name: typeof identity.name === 'number' ? identity.name : null,
    number: typeof identity.number === 'number' ? identity.number : null,
    set: typeof identity.set === 'number' ? identity.set : null,
  };
}

function buildSourceSummary(candidate, evidenceRows, scanResults) {
  const front = evidenceRows.find(
    (row) => normalizeText(row.evidence_slot)?.toLowerCase() === 'front' && normalizeText(row.storage_path),
  ) ?? null;
  const back = evidenceRows.find(
    (row) => normalizeText(row.evidence_slot)?.toLowerCase() === 'back' && normalizeText(row.storage_path),
  ) ?? null;

  return {
    candidate_id: candidate.id,
    candidate_state: candidate.state,
    submission_intent: candidate.submission_intent,
    front_evidence_id: front?.id ?? null,
    front_storage_path: front?.storage_path ?? null,
    back_evidence_id: back?.id ?? null,
    back_storage_path: back?.storage_path ?? null,
    evidence_row_ids: evidenceRows.map((row) => row.id),
    identity_scan_event_ids: uniqueText(evidenceRows.map((row) => row.identity_scan_event_id)),
    identity_scan_result_ids: uniqueText(scanResults.map((row) => row.id)),
  };
}

function chooseDirectSignal(result, key) {
  const aiIdentify = asRecord(result?.raw_signals?.ai_identify);
  const ocr = asRecord(result?.raw_signals?.ocr);
  const setIdentity = asRecord(result?.raw_signals?.set_identity);
  const printedModifier = asRecord(result?.raw_signals?.printed_modifier);

  if (key === 'name') {
    return normalizeText(aiIdentify?.raw_name_text) ?? normalizeText(ocr?.raw_name_text);
  }

  if (key === 'number') {
    return normalizeText(aiIdentify?.raw_number_text) ?? normalizeText(ocr?.raw_number_text);
  }

  if (key === 'printed_modifier') {
    return (
      normalizeText(aiIdentify?.raw_printed_modifier_text) ??
      normalizeText(aiIdentify?.raw_stamp_text) ??
      normalizeText(ocr?.raw_printed_modifier_text) ??
      normalizeText(ocr?.raw_stamp_text) ??
      normalizeText(ocr?.raw_modifier_region_text) ??
      normalizeText(printedModifier?.modifier_label) ??
      normalizeText(printedModifier?.modifier_key)
    );
  }

  return (
    normalizeText(aiIdentify?.raw_set_text) ??
    normalizeText(aiIdentify?.raw_set_abbrev_text) ??
    normalizeText(ocr?.raw_set_text) ??
    normalizeText(ocr?.raw_set_symbol_region_text) ??
    normalizeText(setIdentity?.set_name) ??
    normalizeText(setIdentity?.set_code)
  );
}

function buildStableWorkerRawSignals(rawSignalsInput) {
  const rawSignals = asRecord(rawSignalsInput);
  if (!rawSignals) {
    return {};
  }

  const cloned = cloneJson(rawSignals);
  const aiIdentify = asRecord(cloned.ai_identify);
  const payload = asRecord(aiIdentify?.payload);
  const payloadResult = asRecord(payload?.result);

  if (aiIdentify) {
    if (payloadResult) {
      delete payloadResult.cached;
      delete payloadResult.sha256;
    }

    aiIdentify.payload = payloadResult ? { result: payloadResult } : null;
  }

  return cloned;
}

function buildRawExtractionPackage({ candidate, evidenceRows, scanResults, extractionResult }) {
  return {
    version: 'V1',
    status: extractionResult.status,
    extractor: {
      worker: WORKER_NAME,
      pipeline: 'WAREHOUSE_METADATA_EXTRACTION_BACKEND_V1',
      extraction_engine: 'runBufferedExtractionV1',
      ai_endpoint: 'ai-identify-warp',
      ocr_endpoint: 'ocr-card-signals',
      analysis_version: 'V1',
    },
    source_refs: buildSourceSummary(candidate, evidenceRows, scanResults),
    direct_signals: {
      name: chooseDirectSignal(extractionResult, 'name'),
      number: chooseDirectSignal(extractionResult, 'number'),
      set: chooseDirectSignal(extractionResult, 'set'),
      printed_modifier: chooseDirectSignal(extractionResult, 'printed_modifier'),
    },
    confidence: {
      overall: typeof extractionResult?.confidence?.overall === 'number' ? extractionResult.confidence.overall : null,
      ...normalizeFieldConfidence(extractionResult),
      printed_modifier:
        typeof extractionResult?.confidence?.printed_modifier === 'number'
          ? extractionResult.confidence.printed_modifier
          : null,
    },
    raw_signals: buildStableWorkerRawSignals(extractionResult.raw_signals ?? {}),
    errors: asArray(extractionResult.errors).map((value) => String(value)),
  };
}

function buildMissingFields(extractionResult, parsedNumber, setIdentity) {
  const missingFields = [];

  if (!normalizeText(extractionResult?.identity?.name)) {
    missingFields.push('name');
  }
  if (!parsedNumber?.ok || !normalizeText(parsedNumber.number_plain)) {
    missingFields.push('collector_number');
  }
  if (!normalizeText(setIdentity?.set_code)) {
    missingFields.push('set_identity');
  }

  return uniqueText(missingFields);
}

function buildEvidenceGaps({ candidate, evidenceRows, extractionResult, setIdentity }) {
  const gaps = [];
  const hasFront = evidenceRows.some(
    (row) => normalizeText(row.evidence_slot)?.toLowerCase() === 'front' && normalizeText(row.storage_path),
  );
  const hasBack = evidenceRows.some(
    (row) => normalizeText(row.evidence_slot)?.toLowerCase() === 'back' && normalizeText(row.storage_path),
  );

  if (!hasFront) {
    gaps.push('Front image evidence');
  }
  if (!hasBack && candidate.submission_intent === 'MISSING_CARD') {
    gaps.push('Back image evidence or stronger identity proof');
  }
  if (!normalizeText(setIdentity?.set_code)) {
    gaps.push('Printed set region evidence');
  }

  for (const error of asArray(extractionResult?.errors)) {
    if (String(error).includes('ocr_timeout')) {
      gaps.push('Set region OCR timed out');
    }
    if (String(error).includes('ai_timeout')) {
      gaps.push('AI identify timed out');
    }
    if (String(error).includes('ai_invalid_image')) {
      gaps.push('Readable front image');
    }
  }

  return uniqueText(gaps);
}

function buildAmbiguityNotes(extractionResult) {
  const extractionFlags = asArray(extractionResult?.raw_signals?.ambiguity_flags);
  const setFlags = asArray(extractionResult?.raw_signals?.set_identity?.ambiguity_flags);
  return uniqueText([...extractionFlags, ...setFlags]);
}

function buildNextActions({ extractionResult, missingFields, evidenceGaps, ambiguityNotes }) {
  const actions = [];

  if (extractionResult.status === 'READY') {
    actions.push('Use the normalized metadata package for founder review and interpreter input.');
  }

  if (missingFields.includes('name')) {
    actions.push('Capture a clearer front image so the printed card name is readable.');
  }
  if (missingFields.includes('collector_number')) {
    actions.push('Capture a clearer lower number band so the collector number can be resolved.');
  }
  if (missingFields.includes('set_identity')) {
    actions.push('Capture a clearer set symbol or printed set abbreviation before relying on set identity.');
  }
  if (evidenceGaps.includes('Back image evidence or stronger identity proof')) {
    actions.push('Add a back image or stronger supporting proof if the front image does not fully establish identity.');
  }
  if (evidenceGaps.includes('AI identify timed out') || evidenceGaps.includes('Set region OCR timed out')) {
    actions.push('Retry metadata extraction after the upstream extraction service is healthy.');
  }
  if (ambiguityNotes.length > 0) {
    actions.push('Review the ambiguity notes before treating this metadata package as decision-grade.');
  }

  return uniqueText(actions);
}

function buildNormalizedMetadataPackage({ candidate, evidenceRows, extractionResult }) {
  const parsedNumber = parseCollectorNumberV1(extractionResult?.identity?.number);
  const setIdentity = asRecord(extractionResult?.raw_signals?.set_identity);
  const printedModifier = asRecord(extractionResult?.printed_modifier ?? extractionResult?.raw_signals?.printed_modifier);
  const fieldConfidence = normalizeFieldConfidence(extractionResult);
  const missingFields = buildMissingFields(extractionResult, parsedNumber, setIdentity);
  const evidenceGaps = buildEvidenceGaps({
    candidate,
    evidenceRows,
    extractionResult,
    setIdentity,
  });
  const ambiguityNotes = buildAmbiguityNotes(extractionResult);

  return {
    version: 'V1',
    status: extractionResult.status,
    confidence: chooseConfidenceLabel(extractionResult),
    identity: {
      name: normalizeText(extractionResult?.identity?.name),
      number: parsedNumber.ok ? parsedNumber.number_plain : null,
      printed_number: parsedNumber.ok ? parsedNumber.number_raw : null,
      set_code: normalizeText(setIdentity?.set_code),
      set_name: normalizeText(setIdentity?.set_name),
    },
    printed_modifier: {
      status: normalizeText(printedModifier?.status),
      modifier_key: normalizeText(printedModifier?.modifier_key),
      modifier_label: normalizeText(printedModifier?.modifier_label),
      confidence:
        typeof printedModifier?.confidence === 'number'
          ? printedModifier.confidence
          : null,
      reason: normalizeText(printedModifier?.reason),
      ambiguity_flags: uniqueText(asArray(printedModifier?.ambiguity_flags)),
    },
    field_confidence: fieldConfidence,
    missing_fields: missingFields,
    evidence_gaps: evidenceGaps,
    ambiguity_notes: ambiguityNotes,
    next_actions: buildNextActions({
      extractionResult,
      missingFields,
      evidenceGaps,
      ambiguityNotes,
    }),
  };
}

function buildBlockedExtractionPackages({
  candidate,
  evidenceRows,
  scanResults,
  errorCode,
  missingFields,
  evidenceGaps,
  nextActions,
}) {
  const rawPackage = {
    version: 'V1',
    status: 'BLOCKED',
    extractor: {
      worker: WORKER_NAME,
      pipeline: 'WAREHOUSE_METADATA_EXTRACTION_BACKEND_V1',
      extraction_engine: 'runBufferedExtractionV1',
      ai_endpoint: 'ai-identify-warp',
      ocr_endpoint: 'ocr-card-signals',
      analysis_version: 'V1',
    },
    source_refs: buildSourceSummary(candidate, evidenceRows, scanResults),
    direct_signals: {
      name: null,
      number: null,
      set: null,
      printed_modifier: null,
    },
    confidence: {
      overall: 0,
      name: 0,
      number: 0,
      set: 0,
      printed_modifier: 0,
    },
    raw_signals: {},
    errors: [errorCode],
  };

  const normalizedPackage = {
    version: 'V1',
    status: 'BLOCKED',
    confidence: 'LOW',
    identity: {
      name: null,
      number: null,
      printed_number: null,
      set_code: null,
      set_name: null,
    },
        field_confidence: {
          name: null,
          number: null,
          set: null,
        },
        printed_modifier: {
          status: 'BLOCKED',
          modifier_key: null,
          modifier_label: null,
          confidence: null,
          reason: 'missing_printed_modifier_signal',
          ambiguity_flags: [],
        },
        missing_fields: uniqueText(missingFields),
        evidence_gaps: uniqueText(evidenceGaps),
        ambiguity_notes: [],
    next_actions: uniqueText(nextActions),
  };

  return {
    rawPackage,
    normalizedPackage,
  };
}

function latestExtractionFromEvents(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!EXTRACTION_EVENT_TYPES.has(event.event_type)) {
      continue;
    }

    const metadata = asRecord(parseJsonSafe(event.metadata, null));
    if (!metadata) {
      continue;
    }

    const rawExtractionPackage = asRecord(metadata.raw_extraction_package);
    const normalizedMetadataPackage = asRecord(metadata.normalized_metadata_package);
    if (!rawExtractionPackage && !normalizedMetadataPackage) {
      continue;
    }

    return {
      event_type: event.event_type,
      created_at: event.created_at,
      raw_extraction_package: rawExtractionPackage,
      normalized_metadata_package: normalizedMetadataPackage,
    };
  }

  return null;
}

async function fetchCandidateIds(pool, limit) {
  const sql = `
    with latest_evidence as (
      select
        candidate_id,
        max(created_at) as latest_evidence_at,
        bool_or(lower(coalesce(evidence_slot, '')) = 'front' and nullif(storage_path, '') is not null) as has_front
      from public.canon_warehouse_candidate_evidence
      group by candidate_id
    ),
    latest_extraction as (
      select distinct on (candidate_id)
        candidate_id,
        created_at
      from public.canon_warehouse_candidate_events
      where event_type = any($2::text[])
      order by candidate_id, created_at desc, id desc
    )
    select c.id
    from public.canon_warehouse_candidates c
    left join latest_evidence le
      on le.candidate_id = c.id
    left join latest_extraction lx
      on lx.candidate_id = c.id
    where c.state = any($1::text[])
      and (
        (coalesce(le.has_front, false) = true and (lx.created_at is null or lx.created_at < le.latest_evidence_at))
        or (
          c.reference_hints_payload->>'bridge_source' = $3
          and (lx.created_at is null or lx.created_at < c.updated_at)
        )
      )
    order by coalesce(le.latest_evidence_at, c.updated_at) asc nulls first, c.created_at asc, c.id asc
    limit $4
  `;

  const { rows } = await pool.query(sql, [
    ACTIVE_CANDIDATE_STATES,
    EXTERNAL_DISCOVERY_BRIDGE_SOURCE,
    Array.from(EXTRACTION_EVENT_TYPES),
    limit,
  ]);
  return rows.map((row) => row.id);
}

async function fetchCandidateArtifacts(connection, candidateId) {
  const [candidateResult, evidenceResult, eventResult] = await Promise.all([
    connection.query(
      `
        select
          id,
          state,
          submission_intent,
          notes,
          tcgplayer_id,
          claimed_identity_payload,
          reference_hints_payload,
          current_staging_id,
          created_at,
          updated_at
        from public.canon_warehouse_candidates
        where id = $1
        limit 1
      `,
      [candidateId],
    ),
    connection.query(
      `
        select
          id,
          candidate_id,
          evidence_kind,
          evidence_slot,
          identity_snapshot_id,
          condition_snapshot_id,
          identity_scan_event_id,
          storage_path,
          metadata_payload,
          created_at
        from public.canon_warehouse_candidate_evidence
        where candidate_id = $1
        order by created_at asc, id asc
      `,
      [candidateId],
    ),
    connection.query(
      `
        select
          id,
          event_type,
          action,
          previous_state,
          next_state,
          metadata,
          created_at
        from public.canon_warehouse_candidate_events
        where candidate_id = $1
        order by created_at asc, id asc
      `,
      [candidateId],
    ),
  ]);

  const candidate = candidateResult.rows[0] ?? null;
  const evidenceRows = evidenceResult.rows ?? [];
  const events = eventResult.rows ?? [];
  const scanEventIds = uniqueText(evidenceRows.map((row) => row.identity_scan_event_id));

  let latestScanResults = [];
  if (scanEventIds.length > 0) {
    const scanResults = await connection.query(
      `
        select distinct on (identity_scan_event_id)
          id,
          identity_scan_event_id,
          status,
          analysis_version,
          signals,
          candidates,
          error,
          created_at
        from public.identity_scan_event_results
        where identity_scan_event_id = any($1::uuid[])
        order by identity_scan_event_id, created_at desc, id desc
      `,
      [scanEventIds],
    );
    latestScanResults = scanResults.rows ?? [];
  }

  return {
    candidate,
    evidenceRows,
    events,
    latestScanResults,
    latestExtraction: latestExtractionFromEvents(events),
  };
}

function chooseEvidenceRow(evidenceRows, slot) {
  const candidates = evidenceRows.filter(
    (row) =>
      normalizeText(row.evidence_slot)?.toLowerCase() === slot &&
      normalizeText(row.storage_path),
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[candidates.length - 1];
}

async function downloadEvidenceImage(supabase, storagePath) {
  const normalizedPath = normalizeText(storagePath);
  if (!normalizedPath) {
    throw new Error('missing_storage_path');
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    const response = await fetch(normalizedPath);
    if (!response.ok) {
      throw new Error(`evidence_fetch_failed:${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const { data: signed, error } = await supabase
    .storage
    .from(WAREHOUSE_EVIDENCE_BUCKET)
    .createSignedUrl(normalizedPath, 120);

  if (error || !signed?.signedUrl) {
    throw new Error(`signed_url_failed:${error?.message || 'unknown'}`);
  }

  const response = await fetch(signed.signedUrl);
  if (!response.ok) {
    throw new Error(`signed_url_fetch_failed:${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function withCandidateLock(pool, candidateId, fn) {
  const connection = await pool.connect();
  try {
    const lockResult = await connection.query(
      'select pg_try_advisory_lock(hashtext($1)) as locked',
      [candidateId],
    );

    if (!lockResult.rows[0]?.locked) {
      return {
        status: 'skipped',
        reason: 'candidate_locked',
      };
    }

    try {
      return await fn(connection);
    } finally {
      await connection.query('select pg_advisory_unlock(hashtext($1))', [candidateId]);
    }
  } finally {
    connection.release();
  }
}

async function persistExtractionEvents(connection, { candidate, rawPackage, normalizedPackage }) {
  const terminalEventType = chooseTerminalEventType(normalizedPackage.status);
  const startedMetadata = {
    worker: WORKER_NAME,
    source_refs: rawPackage.source_refs,
    extractor: rawPackage.extractor,
  };
  const terminalMetadata = {
    worker: WORKER_NAME,
    raw_extraction_package: rawPackage,
    normalized_metadata_package: normalizedPackage,
  };

  await connection.query('begin');
  try {
    await connection.query(
      `
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
        values ($1, $2, $3, 'EXTRACT', $4, $4, null, 'SYSTEM', $5::jsonb, clock_timestamp())
      `,
      [
        candidate.id,
        candidate.current_staging_id,
        'WAREHOUSE_METADATA_EXTRACTION_STARTED',
        candidate.state,
        JSON.stringify(startedMetadata),
      ],
    );

    await connection.query(
      `
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
        values ($1, $2, $3, 'EXTRACT', $4, $4, null, 'SYSTEM', $5::jsonb, clock_timestamp())
      `,
      [
        candidate.id,
        candidate.current_staging_id,
        terminalEventType,
        candidate.state,
        JSON.stringify(terminalMetadata),
      ],
    );

    await connection.query('commit');
    return terminalEventType;
  } catch (error) {
    await connection.query('rollback');
    throw error;
  }
}

async function processCandidate(pool, supabase, candidateId, opts) {
  return withCandidateLock(pool, candidateId, async (connection) => {
    const artifact = await fetchCandidateArtifacts(connection, candidateId);
    if (!artifact.candidate) {
      return {
        status: 'skipped',
        reason: 'candidate_not_found',
      };
    }

    const sourceBackedIdentity = getSourceBackedIdentity(artifact.candidate);
    if (sourceBackedIdentity.is_bridge_candidate) {
      const { rawPackage, normalizedPackage } = buildSourceBackedMetadataExtractionPackages({
        candidate: artifact.candidate,
        evidenceRows: artifact.evidenceRows,
        scanResults: artifact.latestScanResults,
      });

      const duplicate =
        artifact.latestExtraction &&
        sameJson(artifact.latestExtraction.raw_extraction_package, rawPackage) &&
        sameJson(artifact.latestExtraction.normalized_metadata_package, normalizedPackage);

      const summary = {
        candidate_id: artifact.candidate.id,
        state: artifact.candidate.state,
        submission_intent: artifact.candidate.submission_intent,
        extraction_status: normalizedPackage.status,
        extraction_confidence: normalizedPackage.confidence,
        extracted_name: normalizedPackage.identity.name,
        extracted_number: normalizedPackage.identity.printed_number,
        extracted_set_code: normalizedPackage.identity.set_code,
        duplicate,
      };

      if (opts.dryRun) {
        log('dry_run_candidate_plan', {
          ...summary,
          raw_extraction_package: rawPackage,
          normalized_metadata_package: normalizedPackage,
        });
        return {
          status: duplicate ? 'dry_run_duplicate' : 'dry_run',
          ...summary,
          raw_package: rawPackage,
          normalized_package: normalizedPackage,
        };
      }

      if (duplicate) {
        return {
          status: 'skipped',
          reason: 'identical_extraction_exists',
          ...summary,
        };
      }

      const terminalEventType = await persistExtractionEvents(connection, {
        candidate: artifact.candidate,
        rawPackage,
        normalizedPackage,
      });

      return {
        status: 'applied',
        ...summary,
        terminal_event_type: terminalEventType,
      };
    }

    const frontEvidence = chooseEvidenceRow(artifact.evidenceRows, 'front');
    const backEvidence = chooseEvidenceRow(artifact.evidenceRows, 'back');

    if (!frontEvidence?.storage_path) {
      const { rawPackage, normalizedPackage } = buildBlockedExtractionPackages({
        candidate: artifact.candidate,
        evidenceRows: artifact.evidenceRows,
        scanResults: artifact.latestScanResults,
        errorCode: 'missing_front_image',
        missingFields: ['front_image', 'name', 'collector_number', 'set_identity'],
        evidenceGaps: ['Front image evidence'],
        nextActions: ['Provide a readable front image before rerunning metadata extraction.'],
      });

      const duplicate =
        artifact.latestExtraction &&
        sameJson(artifact.latestExtraction.raw_extraction_package, rawPackage) &&
        sameJson(artifact.latestExtraction.normalized_metadata_package, normalizedPackage);

      if (opts.dryRun) {
        return {
          status: duplicate ? 'dry_run_duplicate' : 'dry_run',
          candidate_id: candidateId,
          extraction_status: normalizedPackage.status,
          duplicate,
          raw_package: rawPackage,
          normalized_package: normalizedPackage,
        };
      }

      if (duplicate) {
        return {
          status: 'skipped',
          reason: 'identical_extraction_exists',
          candidate_id: candidateId,
          extraction_status: normalizedPackage.status,
        };
      }

      const terminalEventType = await persistExtractionEvents(connection, {
        candidate: artifact.candidate,
        rawPackage,
        normalizedPackage,
      });

      return {
        status: 'applied',
        candidate_id: candidateId,
        extraction_status: normalizedPackage.status,
        terminal_event_type: terminalEventType,
      };
    }

    let imageBuffer;
    try {
      imageBuffer = await downloadEvidenceImage(supabase, frontEvidence.storage_path);
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : String(error);
      const { rawPackage, normalizedPackage } = buildBlockedExtractionPackages({
        candidate: artifact.candidate,
        evidenceRows: artifact.evidenceRows,
        scanResults: artifact.latestScanResults,
        errorCode,
        missingFields: ['readable_front_image', 'name', 'collector_number', 'set_identity'],
        evidenceGaps: ['Readable front image'],
        nextActions: ['Restore or replace the front evidence image before rerunning metadata extraction.'],
      });

      const duplicate =
        artifact.latestExtraction &&
        sameJson(artifact.latestExtraction.raw_extraction_package, rawPackage) &&
        sameJson(artifact.latestExtraction.normalized_metadata_package, normalizedPackage);

      const summary = {
        candidate_id: artifact.candidate.id,
        state: artifact.candidate.state,
        submission_intent: artifact.candidate.submission_intent,
        extraction_status: normalizedPackage.status,
        extraction_confidence: normalizedPackage.confidence,
        extracted_name: null,
        extracted_number: null,
        extracted_set_code: null,
        duplicate,
      };

      if (opts.dryRun) {
        log('dry_run_candidate_plan', {
          ...summary,
          raw_extraction_package: rawPackage,
          normalized_metadata_package: normalizedPackage,
        });
        return {
          status: duplicate ? 'dry_run_duplicate' : 'dry_run',
          ...summary,
          raw_package: rawPackage,
          normalized_package: normalizedPackage,
        };
      }

      if (duplicate) {
        return {
          status: 'skipped',
          reason: 'identical_extraction_exists',
          ...summary,
        };
      }

      const terminalEventType = await persistExtractionEvents(connection, {
        candidate: artifact.candidate,
        rawPackage,
        normalizedPackage,
      });

      return {
        status: 'applied',
        ...summary,
        terminal_event_type: terminalEventType,
      };
    }

    const extractionResult = await runBufferedExtractionV1({
      caseDef: {
        id: artifact.candidate.id,
        category: 'warehouse',
        note_text: artifact.candidate.notes,
      },
      imagePath: frontEvidence.storage_path,
      imageBuffer,
      supabase,
      runIndex: 1,
    });

    const rawPackage = buildRawExtractionPackage({
      candidate: artifact.candidate,
      evidenceRows: artifact.evidenceRows,
      scanResults: artifact.latestScanResults,
      extractionResult,
    });
    const normalizedPackage = buildNormalizedMetadataPackage({
      candidate: artifact.candidate,
      evidenceRows: artifact.evidenceRows,
      extractionResult,
      frontEvidence,
      backEvidence,
    });

    const duplicate =
      artifact.latestExtraction &&
      sameJson(artifact.latestExtraction.raw_extraction_package, rawPackage) &&
      sameJson(artifact.latestExtraction.normalized_metadata_package, normalizedPackage);

    const summary = {
      candidate_id: artifact.candidate.id,
      state: artifact.candidate.state,
      submission_intent: artifact.candidate.submission_intent,
      extraction_status: normalizedPackage.status,
      extraction_confidence: normalizedPackage.confidence,
      extracted_name: normalizedPackage.identity.name,
      extracted_number: normalizedPackage.identity.printed_number,
      extracted_set_code: normalizedPackage.identity.set_code,
      duplicate,
    };

    if (opts.dryRun) {
      log('dry_run_candidate_plan', {
        ...summary,
        raw_extraction_package: rawPackage,
        normalized_metadata_package: normalizedPackage,
      });
      return {
        status: duplicate ? 'dry_run_duplicate' : 'dry_run',
        ...summary,
        raw_package: rawPackage,
        normalized_package: normalizedPackage,
      };
    }

    if (duplicate) {
      return {
        status: 'skipped',
        reason: 'identical_extraction_exists',
        ...summary,
      };
    }

    const terminalEventType = await persistExtractionEvents(connection, {
      candidate: artifact.candidate,
      rawPackage,
      normalizedPackage,
    });

    return {
      status: 'applied',
      ...summary,
      terminal_event_type: terminalEventType,
    };
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });
  const supabase = createBackendClient();

  try {
    const candidateIds = opts.candidateId
      ? [opts.candidateId]
      : await fetchCandidateIds(pool, opts.limit);

    log('worker_start', {
      mode: opts.apply ? 'apply' : 'dry-run',
      requested_limit: opts.limit,
      candidate_id: opts.candidateId,
      candidate_count: candidateIds.length,
    });

    const results = [];
    for (const candidateId of candidateIds) {
      try {
        const result = await processCandidate(pool, supabase, candidateId, opts);
        results.push(result);
        log('candidate_result', result);
      } catch (error) {
        const failure = {
          status: 'failed',
          candidate_id: candidateId,
          reason: error instanceof Error ? error.message : String(error),
        };
        results.push(failure);
        log('candidate_failed', failure);
      }
    }

    log('worker_complete', {
      mode: opts.apply ? 'apply' : 'dry-run',
      processed: results.length,
      results,
    });
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].includes('metadata_extraction_worker_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
}
