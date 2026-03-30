import '../env.mjs';

import crypto from 'node:crypto';

import pg from 'pg';
import sharp from 'sharp';

import { createBackendClient } from '../supabase_backend_client.mjs';
import { detectOuterBorderAI, warpCardQuadAI } from '../condition/ai_border_detector_client.mjs';
import { parseCollectorNumberV1 } from '../identity/parseCollectorNumberV1.mjs';
import { runBufferedExtractionV1 } from './extraction_audit/extraction_audit_runner_v1.mjs';

const { Pool } = pg;

const WORKER_NAME = 'promotion_image_normalization_worker_v1';
const PIPELINE_VERSION = 'promotion_image_normalization_v1';
const WAREHOUSE_BUCKET = 'user-card-images';
const ACTIVE_STATES = ['REVIEW_READY', 'APPROVED_BY_FOUNDER', 'STAGED_FOR_PROMOTION'];
const TERMINAL_EVENT_TYPES = new Set([
  'PROMOTION_IMAGE_NORMALIZATION_READY',
  'PROMOTION_IMAGE_NORMALIZATION_PARTIAL',
  'PROMOTION_IMAGE_NORMALIZATION_BLOCKED',
]);
const OUT_W = 1024;
const OUT_H = 1428;
const BACK_MIN_CONFIDENCE = 0.45;

function log(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), worker: WORKER_NAME, event, ...payload }));
}

function parseArgs(argv) {
  const opts = { limit: 10, candidateId: null, dryRun: true, apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.apply = false;
    } else if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
    } else if (arg === '--candidate-id') {
      opts.candidateId = normalizeText(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--candidate-id=')) {
      opts.candidateId = normalizeText(arg.slice('--candidate-id='.length));
    } else if (arg === '--limit') {
      const value = Number.parseInt(argv[i + 1] ?? '', 10);
      if (Number.isFinite(value) && value > 0) opts.limit = value;
      i += 1;
    } else if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(value) && value > 0) opts.limit = value;
    }
  }
  return opts;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLower(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeNameKey(value) {
  const normalized = normalizeText(value);
  return normalized
    ? normalized.replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
    : null;
}

function toLowerSnakeCase(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function uniqueText(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function sameJson(left, right) {
  return JSON.stringify(canonicalizeJson(left)) === JSON.stringify(canonicalizeJson(right));
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function chooseTerminalEventType(status) {
  if (status === 'READY') return 'PROMOTION_IMAGE_NORMALIZATION_READY';
  if (status === 'PARTIAL') return 'PROMOTION_IMAGE_NORMALIZATION_PARTIAL';
  return 'PROMOTION_IMAGE_NORMALIZATION_BLOCKED';
}

function chooseEvidence(evidenceRows, slot) {
  const rows = evidenceRows.filter(
    (row) => normalizeLower(row.evidence_slot) === slot && normalizeText(row.storage_path),
  );
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

function latestMetadataExtraction(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const metadata = asRecord(events[i]?.metadata);
    const normalized = asRecord(metadata?.normalized_metadata_package);
    if (normalized) {
      return {
        event_type: events[i].event_type,
        created_at: events[i].created_at,
        normalized_metadata_package: normalized,
      };
    }
  }
  return null;
}

function latestNormalization(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (!TERMINAL_EVENT_TYPES.has(events[i].event_type)) continue;
    const metadata = asRecord(events[i]?.metadata);
    const normalization = asRecord(metadata?.promotion_image_normalization_package);
    if (normalization) {
      return {
        event_type: events[i].event_type,
        created_at: events[i].created_at,
        promotion_image_normalization_package: normalization,
      };
    }
  }
  return null;
}

function getExpectedIdentity(latestExtraction) {
  const normalized = asRecord(latestExtraction?.normalized_metadata_package);
  const identity = asRecord(normalized?.identity);
  const modifier = asRecord(normalized?.printed_modifier);
  return {
    name: normalizeText(identity?.name),
    printed_number: normalizeText(identity?.printed_number),
    set_code: normalizeLower(identity?.set_code),
    modifier_key:
      normalizeText(modifier?.status) === 'READY'
        ? toLowerSnakeCase(modifier?.modifier_key ?? modifier?.modifier_label)
        : null,
  };
}

function buildStoragePath(candidateId, frontEvidence, backEvidence, face) {
  const hash = sha256Hex(
    JSON.stringify({
      candidate_id: candidateId,
      face,
      front_storage_path: frontEvidence?.storage_path ?? null,
      back_storage_path: backEvidence?.storage_path ?? null,
      pipeline_version: PIPELINE_VERSION,
      out_w: OUT_W,
      out_h: OUT_H,
    }),
  ).slice(0, 16);
  return `warehouse-derived/promotion-image-normalization-v1/${candidateId}/${hash}/${face}.jpg`;
}

function buildBasePackage(candidate, frontEvidence, backEvidence, storagePaths) {
  return {
    version: 'V1',
    candidate_id: candidate.id,
    source_refs: {
      front_evidence_id: frontEvidence?.id ?? null,
      back_evidence_id: backEvidence?.id ?? null,
      front_storage_path: frontEvidence?.storage_path ?? null,
      back_storage_path: backEvidence?.storage_path ?? null,
    },
    outputs: {
      normalized_front_storage_path: storagePaths.front ?? null,
      normalized_back_storage_path: storagePaths.back ?? null,
    },
    method: {
      warp_used: false,
      openai_tunnel_used: false,
      pipeline_version: PIPELINE_VERSION,
      ai_service_used: false,
    },
    quality: {
      front_confidence: null,
      back_confidence: null,
    },
    missing_fields: [],
    evidence_gaps: [],
    next_actions: [],
    errors: [],
  };
}

function buildBlockedPackage(candidate, frontEvidence, backEvidence, storagePaths, overrides) {
  return {
    ...buildBasePackage(candidate, frontEvidence, backEvidence, storagePaths),
    status: 'BLOCKED',
    outputs: {
      normalized_front_storage_path: null,
      normalized_back_storage_path: null,
    },
    missing_fields: uniqueText(overrides.missing_fields ?? []),
    evidence_gaps: uniqueText(overrides.evidence_gaps ?? []),
    next_actions: uniqueText(overrides.next_actions ?? []),
    errors: uniqueText(overrides.errors ?? []),
    quality: {
      front_confidence: overrides.front_confidence ?? null,
      back_confidence: overrides.back_confidence ?? null,
    },
    method: {
      warp_used: Boolean(overrides.warp_used),
      openai_tunnel_used: Boolean(overrides.openai_tunnel_used),
      pipeline_version: PIPELINE_VERSION,
      ai_service_used: Boolean(overrides.ai_service_used),
    },
  };
}

async function downloadEvidenceImage(supabase, storagePath) {
  const normalizedPath = normalizeText(storagePath);
  if (!normalizedPath) throw new Error('missing_storage_path');
  if (/^https?:\/\//i.test(normalizedPath)) {
    const response = await fetch(normalizedPath);
    if (!response.ok) throw new Error(`evidence_fetch_failed:${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const { data: signed, error } = await supabase.storage
    .from(WAREHOUSE_BUCKET)
    .createSignedUrl(normalizedPath, 120);
  if (error || !signed?.signedUrl) {
    throw new Error(`signed_url_failed:${error?.message || 'unknown'}`);
  }
  const response = await fetch(signed.signedUrl);
  if (!response.ok) throw new Error(`signed_url_fetch_failed:${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function normalizeImageBuffer(imageBuffer, face) {
  const border = await detectOuterBorderAI({ imageBuffer, timeoutMs: 8000 });
  if (!border?.ok || !Array.isArray(border.polygon_norm)) {
    return {
      status: 'BLOCKED',
      error: `${face}_border_not_detected`,
      confidence: typeof border?.confidence === 'number' ? border.confidence : 0,
      buffer: null,
    };
  }
  const warp = await warpCardQuadAI({
    imageBuffer,
    quadNorm: border.polygon_norm,
    outW: OUT_W,
    outH: OUT_H,
    timeoutMs: 8000,
  });
  if (!warp?.ok || !warp.imageBuffer) {
    return {
      status: 'BLOCKED',
      error: `${face}_${warp?.error ?? 'warp_failed'}`,
      confidence: typeof border.confidence === 'number' ? border.confidence : 0,
      buffer: null,
    };
  }
  const normalizedBuffer = await sharp(warp.imageBuffer)
    .rotate()
    .resize(OUT_W, OUT_H, { fit: 'fill' })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  return {
    status: 'READY',
    error: null,
    confidence: typeof border.confidence === 'number' ? border.confidence : null,
    buffer: normalizedBuffer,
  };
}

function validateFrontIdentity(expected, extractionResult) {
  const setIdentity = asRecord(extractionResult?.raw_signals?.set_identity);
  const printedModifier =
    asRecord(extractionResult?.printed_modifier) ?? asRecord(extractionResult?.raw_signals?.printed_modifier);
  const aiIdentify = asRecord(extractionResult?.raw_signals?.ai_identify);
  const resolverPool = asRecord(extractionResult?.raw_signals?.identity_scan_candidates);
  const parsedNumber = parseCollectorNumberV1(extractionResult?.identity?.number);
  const actual = {
    name: normalizeText(extractionResult?.identity?.name),
    printed_number: parsedNumber.ok ? parsedNumber.number_raw : null,
    set_code: normalizeLower(setIdentity?.set_code),
    modifier_key:
      normalizeText(printedModifier?.status) === 'READY'
        ? toLowerSnakeCase(printedModifier?.modifier_key ?? printedModifier?.modifier_label)
        : null,
  };
  const errors = [];
  const resolverSetSupport = asArray(resolverPool?.rows)
    .map((row) => normalizeLower(row?.set_code))
    .filter(Boolean);
  const aiSetSignal = normalizeLower(aiIdentify?.raw_set_abbrev_text ?? aiIdentify?.raw_set_text);
  const setPreservedViaResolverSupport =
    expected.set_code &&
    !actual.set_code &&
    !aiSetSignal &&
    resolverSetSupport.includes(expected.set_code);
  if (expected.name && normalizeNameKey(actual.name) !== normalizeNameKey(expected.name)) {
    errors.push('normalized_front_name_mismatch');
  }
  if (expected.printed_number && actual.printed_number !== expected.printed_number) {
    errors.push('normalized_front_collector_number_mismatch');
  }
  if (expected.set_code && actual.set_code !== expected.set_code && !setPreservedViaResolverSupport) {
    errors.push('normalized_front_set_identity_mismatch');
  }
  if (expected.modifier_key && actual.modifier_key !== expected.modifier_key) {
    errors.push('normalized_front_printed_modifier_mismatch');
  }
  return { ok: errors.length === 0, errors };
}

async function uploadAsset(supabase, storagePath, buffer) {
  const { error } = await supabase.storage.from(WAREHOUSE_BUCKET).upload(storagePath, buffer, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw new Error(`derived_asset_upload_failed:${error.message}`);
}

async function withCandidateLock(pool, candidateId, fn) {
  const connection = await pool.connect();
  try {
    const lockResult = await connection.query('select pg_try_advisory_lock(hashtext($1)) as locked', [
      candidateId,
    ]);
    if (!lockResult.rows[0]?.locked) {
      return { status: 'skipped', reason: 'candidate_locked' };
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

async function fetchCandidateArtifacts(connection, candidateId) {
  const [candidateResult, evidenceResult, eventResult] = await Promise.all([
    connection.query(
      `select id,state,notes,submission_intent,current_staging_id from public.canon_warehouse_candidates where id = $1 limit 1`,
      [candidateId],
    ),
    connection.query(
      `select id,evidence_slot,storage_path,created_at from public.canon_warehouse_candidate_evidence where candidate_id = $1 order by created_at asc, id asc`,
      [candidateId],
    ),
    connection.query(
      `select id,event_type,metadata,created_at from public.canon_warehouse_candidate_events where candidate_id = $1 order by created_at asc, id asc`,
      [candidateId],
    ),
  ]);
  const events = eventResult.rows ?? [];
  return {
    candidate: candidateResult.rows[0] ?? null,
    evidenceRows: evidenceResult.rows ?? [],
    events,
    latestExtraction: latestMetadataExtraction(events),
    latestNormalization: latestNormalization(events),
  };
}

async function persistNormalization(connection, candidate, normalizationPackage) {
  const startedMetadata = {
    worker: WORKER_NAME,
    source_refs: normalizationPackage.source_refs,
    outputs: normalizationPackage.outputs,
    method: normalizationPackage.method,
  };
  const terminalMetadata = {
    worker: WORKER_NAME,
    promotion_image_normalization_package: normalizationPackage,
  };
  const terminalEventType = chooseTerminalEventType(normalizationPackage.status);
  await connection.query('begin');
  try {
    await connection.query(
      `insert into public.canon_warehouse_candidate_events (
         candidate_id, staging_id, event_type, action, previous_state, next_state, actor_user_id, actor_type, metadata, created_at
       ) values ($1, $2, 'PROMOTION_IMAGE_NORMALIZATION_STARTED', 'NORMALIZE_IMAGE', $3, $3, null, 'SYSTEM', $4::jsonb, clock_timestamp())`,
      [candidate.id, candidate.current_staging_id, candidate.state, JSON.stringify(startedMetadata)],
    );
    await connection.query(
      `insert into public.canon_warehouse_candidate_events (
         candidate_id, staging_id, event_type, action, previous_state, next_state, actor_user_id, actor_type, metadata, created_at
       ) values ($1, $2, $3, 'NORMALIZE_IMAGE', $4, $4, null, 'SYSTEM', $5::jsonb, clock_timestamp())`,
      [candidate.id, candidate.current_staging_id, terminalEventType, candidate.state, JSON.stringify(terminalMetadata)],
    );
    await connection.query('commit');
    return terminalEventType;
  } catch (error) {
    await connection.query('rollback');
    throw error;
  }
}

async function finalizeResult({ artifact, normalizationPackage, opts, connection, supabase, frontBuffer, backBuffer }) {
  const duplicate =
    artifact.latestNormalization &&
    sameJson(
      artifact.latestNormalization.promotion_image_normalization_package,
      normalizationPackage,
    );

  const summary = {
    candidate_id: artifact.candidate.id,
    state: artifact.candidate.state,
    normalization_status: normalizationPackage.status,
    normalized_front_storage_path: normalizationPackage.outputs.normalized_front_storage_path,
    normalized_back_storage_path: normalizationPackage.outputs.normalized_back_storage_path,
    duplicate,
  };

  if (opts.dryRun) {
    return {
      status: duplicate ? 'dry_run_duplicate' : 'dry_run',
      ...summary,
      normalization_package: normalizationPackage,
    };
  }

  if (duplicate) {
    return {
      status: 'skipped',
      reason: 'identical_normalization_exists',
      ...summary,
    };
  }

  if (frontBuffer && normalizationPackage.outputs.normalized_front_storage_path) {
    await uploadAsset(supabase, normalizationPackage.outputs.normalized_front_storage_path, frontBuffer);
  }
  if (backBuffer && normalizationPackage.outputs.normalized_back_storage_path) {
    await uploadAsset(supabase, normalizationPackage.outputs.normalized_back_storage_path, backBuffer);
  }

  const terminalEventType = await persistNormalization(
    connection,
    artifact.candidate,
    normalizationPackage,
  );

  return {
    status: 'applied',
    ...summary,
    terminal_event_type: terminalEventType,
  };
}

async function processCandidate(pool, supabase, candidateId, opts) {
  return withCandidateLock(pool, candidateId, async (connection) => {
    const artifact = await fetchCandidateArtifacts(connection, candidateId);
    if (!artifact.candidate) return { status: 'skipped', reason: 'candidate_not_found' };

    const frontEvidence = chooseEvidence(artifact.evidenceRows, 'front');
    const backEvidence = chooseEvidence(artifact.evidenceRows, 'back');
    const storagePaths = {
      front: buildStoragePath(candidateId, frontEvidence, backEvidence, 'front'),
      back: backEvidence ? buildStoragePath(candidateId, frontEvidence, backEvidence, 'back') : null,
    };

    if (!frontEvidence?.storage_path) {
      return finalizeResult({
        artifact,
        normalizationPackage: buildBlockedPackage(artifact.candidate, frontEvidence, backEvidence, storagePaths, {
          missing_fields: ['front_evidence_image'],
          evidence_gaps: ['Front evidence image'],
          next_actions: ['Attach a readable front image before generating a promotion asset.'],
          errors: ['missing_front_image'],
        }),
        opts,
        connection,
        supabase,
      });
    }

    const expectedIdentity = getExpectedIdentity(artifact.latestExtraction);
    if (!expectedIdentity.name || !expectedIdentity.printed_number || !expectedIdentity.set_code) {
      return finalizeResult({
        artifact,
        normalizationPackage: buildBlockedPackage(artifact.candidate, frontEvidence, backEvidence, storagePaths, {
          missing_fields: [
            'metadata_extraction.identity.name',
            'metadata_extraction.identity.printed_number',
            'metadata_extraction.identity.set_code',
          ],
          evidence_gaps: ['Metadata extraction package with resolved identity'],
          next_actions: ['Rerun metadata extraction and confirm set, name, and printed number before generating a promotion asset.'],
          errors: ['metadata_identity_incomplete'],
        }),
        opts,
        connection,
        supabase,
      });
    }

    let frontSourceBuffer;
    try {
      frontSourceBuffer = await downloadEvidenceImage(supabase, frontEvidence.storage_path);
    } catch (error) {
      return finalizeResult({
        artifact,
        normalizationPackage: buildBlockedPackage(artifact.candidate, frontEvidence, backEvidence, storagePaths, {
          missing_fields: ['readable_front_image'],
          evidence_gaps: ['Readable front evidence image'],
          next_actions: ['Restore or replace the front evidence image before generating a promotion asset.'],
          errors: [error instanceof Error ? error.message : String(error)],
        }),
        opts,
        connection,
        supabase,
      });
    }

    const frontNormalized = await normalizeImageBuffer(frontSourceBuffer, 'front');
    if (frontNormalized.status !== 'READY' || !frontNormalized.buffer) {
      return finalizeResult({
        artifact,
        normalizationPackage: buildBlockedPackage(artifact.candidate, frontEvidence, backEvidence, storagePaths, {
          evidence_gaps: ['Perspective-correct front card plane'],
          next_actions: ['Capture a cleaner straight-on front image before generating a promotion asset.'],
          errors: [frontNormalized.error ?? 'front_normalization_failed'],
          front_confidence: frontNormalized.confidence,
          warp_used: true,
          ai_service_used: true,
        }),
        opts,
        connection,
        supabase,
      });
    }

    const frontExtraction = await runBufferedExtractionV1({
      caseDef: {
        id: artifact.candidate.id,
        category: 'promotion_image_normalization',
        note_text: artifact.candidate.notes,
      },
      imagePath: storagePaths.front,
      imageBuffer: frontNormalized.buffer,
      supabase,
      runIndex: 1,
    });

    const frontValidation = validateFrontIdentity(expectedIdentity, frontExtraction);
    if (!frontValidation.ok) {
      return finalizeResult({
        artifact,
        normalizationPackage: buildBlockedPackage(artifact.candidate, frontEvidence, backEvidence, storagePaths, {
          evidence_gaps: ['Identity-preserving normalized front image'],
          next_actions: ['Do not use this derived asset for promotion. Re-capture or improve the source image before retrying normalization.'],
          errors: frontValidation.errors,
          front_confidence: frontNormalized.confidence,
          warp_used: true,
          openai_tunnel_used: true,
          ai_service_used: true,
        }),
        opts,
        connection,
        supabase,
      });
    }

    let backNormalized = null;
    if (backEvidence?.storage_path) {
      try {
        const backSourceBuffer = await downloadEvidenceImage(supabase, backEvidence.storage_path);
        backNormalized = await normalizeImageBuffer(backSourceBuffer, 'back');
        if (
          backNormalized.status === 'READY' &&
          typeof backNormalized.confidence === 'number' &&
          backNormalized.confidence < BACK_MIN_CONFIDENCE
        ) {
          backNormalized = {
            status: 'BLOCKED',
            error: 'back_normalization_confidence_below_threshold',
            confidence: backNormalized.confidence,
            buffer: null,
          };
        }
      } catch (error) {
        backNormalized = {
          status: 'BLOCKED',
          error: error instanceof Error ? error.message : String(error),
          confidence: 0,
          buffer: null,
        };
      }
    }

    const overallFrontConfidence =
      typeof frontExtraction?.confidence?.overall === 'number'
        ? Number((((frontNormalized.confidence ?? 0) + frontExtraction.confidence.overall) / 2).toFixed(3))
        : frontNormalized.confidence;

    const normalizationPackage = {
      ...buildBasePackage(artifact.candidate, frontEvidence, backEvidence, storagePaths),
      status: 'READY',
      outputs: {
        normalized_front_storage_path: storagePaths.front,
        normalized_back_storage_path:
          backEvidence && backNormalized?.status === 'READY' ? storagePaths.back : null,
      },
      method: {
        warp_used: true,
        openai_tunnel_used: true,
        pipeline_version: PIPELINE_VERSION,
        ai_service_used: true,
      },
      quality: {
        front_confidence: overallFrontConfidence,
        back_confidence: backNormalized?.confidence ?? null,
      },
      evidence_gaps:
        backEvidence && backNormalized?.status === 'BLOCKED'
          ? ['Optional normalized back asset']
          : [],
      next_actions:
        backEvidence && backNormalized?.status === 'BLOCKED'
          ? ['Proceed with the ready front asset only, or retry back normalization with a cleaner back image.']
          : [],
      errors:
        backEvidence && backNormalized?.status === 'BLOCKED'
          ? [backNormalized.error ?? 'back_normalization_failed']
          : [],
    };

    return finalizeResult({
      artifact,
      normalizationPackage,
      opts,
      connection,
      supabase,
      frontBuffer: frontNormalized.buffer,
      backBuffer:
        backEvidence && backNormalized?.status === 'READY' ? backNormalized.buffer : null,
    });
  });
}

async function fetchCandidateIds(pool, limit) {
  const { rows } = await pool.query(
    `select distinct c.id
       from public.canon_warehouse_candidates c
       join public.canon_warehouse_candidate_evidence e
         on e.candidate_id = c.id
        and lower(coalesce(e.evidence_slot, '')) = 'front'
        and nullif(e.storage_path, '') is not null
      where c.state = any($1::text[])
      order by c.id asc
      limit $2`,
    [ACTIVE_STATES, limit],
  );
  return rows.map((row) => row.id);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL is required');

  const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });
  const supabase = createBackendClient();

  try {
    const candidateIds = opts.candidateId ? [opts.candidateId] : await fetchCandidateIds(pool, opts.limit);

    log('worker_start', {
      mode: opts.apply ? 'apply' : 'dry-run',
      candidate_id: opts.candidateId,
      requested_limit: opts.limit,
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

if (process.argv[1] && process.argv[1].includes('promotion_image_normalization_worker_v1.mjs')) {
  main().catch((error) => {
    log('fatal', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  });
}
