// Identity Scanner V1 Highway worker (Phase 1B)
// - Appends results to identity_scan_event_results (append-only)
// - Uses ingestion_jobs lock pattern (job_type=identity_scan_v1)
// - Border/warp via existing AI border client; OCR not implemented (records failure)

import '../env.mjs';
import pg from 'pg';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { detectOuterBorderAI, warpCardQuadAI } from '../condition/ai_border_detector_client.mjs';

const { Pool } = pg;
const JOB_TYPE = 'identity_scan_v1';
const LOCKED_BY = 'identity_scan_worker_v1';
const MAX_ENQUEUE = 50;
const AI_WARP_W = 1024;
const AI_WARP_H = 1428;
const ENABLE_AI_READ_NUMBER = false;

function log(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

function parseArgs(argv) {
  const opts = { once: false, maxJobs: 5, sleepMs: 1500, lockTtlMs: 10 * 60 * 1000 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--once') opts.once = true;
    else if (a === '--max-jobs') opts.maxJobs = parseInt(argv[i + 1], 10) || opts.maxJobs;
    else if (a === '--sleep-ms') opts.sleepMs = parseInt(argv[i + 1], 10) || opts.sleepMs;
    else if (a === '--lock-ttl-ms') opts.lockTtlMs = parseInt(argv[i + 1], 10) || opts.lockTtlMs;
  }
  return opts;
}

async function ensureJobs(pgPool, supabase, maxJobs = MAX_ENQUEUE) {
  // Enqueue ingestion_jobs for identity_scan_events with no results and no pending/processing jobs.
  const sql = `
    with candidates as (
      select e.id
      from public.identity_scan_events e
      where not exists (
        select 1 from public.identity_scan_event_results r
        where r.identity_scan_event_id = e.id
      )
      and not exists (
        select 1 from public.ingestion_jobs j
        where j.job_type = $1
          and j.payload ->> 'identity_scan_event_id' = e.id::text
          and j.status in ('pending','processing')
      )
      order by e.created_at asc
      limit $2
    )
    insert into public.ingestion_jobs (job_type, status, payload)
    select $1, 'pending', jsonb_build_object('identity_scan_event_id', id)
    from candidates
    returning id, payload->>'identity_scan_event_id' as event_id;
  `;
  try {
    const res = await pgPool.query(sql, [JOB_TYPE, maxJobs]);
    if (res.rowCount > 0) {
      log('enqueue_missing_jobs', { added: res.rowCount });
    }
  } catch (err) {
    log('enqueue_missing_jobs_error', { error: err.message });
  }
}

async function claimJob(supabase, lockTtlMs) {
  const nowIso = new Date().toISOString();
  const ttlCutoff = new Date(Date.now() - lockTtlMs).toISOString();

  const { data: pending, error: pendingErr } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .eq('job_type', JOB_TYPE)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (pendingErr) throw new Error(`claim select pending failed: ${pendingErr.message}`);

  let candidate = pending;
  let reclaimed = false;

  if (!candidate) {
    const { data: stale, error: staleErr } = await supabase
      .from('ingestion_jobs')
      .select('*')
      .eq('job_type', JOB_TYPE)
      .eq('status', 'processing')
      .lt('locked_at', ttlCutoff)
      .order('locked_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (staleErr) throw new Error(`claim select stale failed: ${staleErr.message}`);
    if (stale) {
      candidate = stale;
      reclaimed = true;
    }
  }

  if (!candidate) return null;

  const nextAttempts = (candidate.attempts ?? 0) + 1;
  const { data: updated, error: updateErr } = await supabase
    .from('ingestion_jobs')
    .update({
      locked_by: LOCKED_BY,
      locked_at: nowIso,
      last_attempt_at: nowIso,
      status: 'processing',
      attempts: nextAttempts,
    })
    .eq('id', candidate.id)
    .in('status', ['pending', 'processing'])
    .select()
    .maybeSingle();

  if (updateErr) throw new Error(`claim update failed: ${updateErr.message}`);
  if (!updated) return null;
  return { job: updated, reclaimed };
}

async function markStatus(supabase, jobId, status, extra = {}) {
  const { error } = await supabase
    .from('ingestion_jobs')
    .update({
      status,
      locked_by: null,
      locked_at: null,
      last_attempt_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', jobId);
  if (error) throw new Error(`update status failed: ${error.message}`);
}

async function downloadImage(supabase, bucket, path) {
  const { data: signed, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
  if (error || !signed?.signedUrl) {
    return { error: new Error(`signed_url_failed:${error?.message || 'unknown'}`) };
  }
  const res = await fetch(signed.signedUrl);
  if (!res.ok) {
    return { error: new Error(`signed_url_fetch_failed:${res.status}`) };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf };
}

async function aiIdentifyWarp(imageBuffer, traceId) {
  const baseUrl = process.env.GV_AI_BORDER_URL || '';
  if (!baseUrl) {
    return { error: new Error('ai_identify_disabled') };
  }
  const token = process.env.GV_AI_ENDPOINT_TOKEN || '';
  const endpoint = `${baseUrl.replace(/\/$/, '')}/ai-identify-warp`;
  const payload = {
    image_b64: imageBuffer.toString('base64'),
    force_refresh: false,
    trace_id: traceId,
  };
  const headers = { 'content-type': 'application/json' };
  if (token) headers['x-gv-token'] = token;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { error: new Error(`ai_identify_network_error:${err.message}`) };
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson === 'object') {
        const msg = errJson.error || errJson.message || errJson.detail || null;
        if (msg) detail = `:${msg}`;
      }
    } catch (_) {
      // ignore parse errors for non-JSON bodies
    }
    return { error: new Error(`ai_identify_http_${response.status}${detail}`) };
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    return { error: new Error('ai_identify_invalid_json') };
  }

  if (!data || typeof data !== 'object') {
    return { error: new Error('ai_identify_invalid_payload') };
  }

  if (data.ok === false) {
    const msg = data.error || data.message || data.detail || null;
    return { error: new Error(msg ? `ai_identify_failed:${msg}` : 'ai_identify_failed'), data };
  }

  return { data };
}

async function aiReadNumber({ baseUrl, imageBuffer, traceId, timeoutMs = 20000 }) {
  if (!baseUrl) {
    return { ok: false, error: 'ai_read_number_disabled' };
  }
  const token = process.env.GV_AI_ENDPOINT_TOKEN || '';
  const endpoint = `${baseUrl.replace(/\/$/, '')}/ai-read-number`;
  const payload = {
    image_b64: imageBuffer.toString('base64'),
    force_refresh: false,
    trace_id: traceId,
  };
  const headers = { 'content-type': 'application/json' };
  if (token) headers['x-gv-token'] = token;

  let response;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);
  } catch (err) {
    return { ok: false, error: `ai_read_number_network_error:${err.message}` };
  }

  if (!response.ok) {
    return { ok: false, error: `ai_read_number_http_${response.status}` };
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    return { ok: false, error: 'ai_read_number_invalid_json' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'ai_read_number_invalid_payload' };
  }

  if (data.ok === false) {
    return { ok: false, error: data.error || 'ai_read_number_failed', notes: data.notes ?? null };
  }

  const result = typeof data.result === 'object' && data.result ? data.result : data;
  return { ok: true, result, notes: data.notes ?? null };
}

function extractIdentitySnapshotFrontRef(images) {
  if (!images || typeof images !== 'object') {
    return { ok: false, error: 'identity_snapshot_images_missing', debug: { reason: 'images_null', keys: [] } };
  }
  const bucket = images.bucket;
  const frontPath = images?.paths?.front ?? images?.front?.path;
  const keys = Object.keys(images || {});
  if (!bucket || typeof bucket !== 'string' || bucket.length === 0) {
    return { ok: false, error: 'identity_snapshot_images_missing', debug: { reason: 'bucket_missing', keys } };
  }
  if (!frontPath || typeof frontPath !== 'string' || frontPath.length === 0) {
    return { ok: false, error: 'identity_snapshot_images_missing', debug: { reason: 'front_path_missing', keys } };
  }
  return { ok: true, bucket, path: frontPath };
}

function normalizeCollectorNumber(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const m = trimmed.match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  if (!m) return null;
  const num = m[1].padStart(3, '0');
  const total = m[2].padStart(3, '0');
  return `${num}/${total}`;
}

async function insertResult(supabase, eventId, userId, status, signals, candidates, error) {
  const { data, error: insErr } = await supabase
    .from('identity_scan_event_results')
    .insert({
      identity_scan_event_id: eventId,
      user_id: userId,
      status,
      signals,
      candidates,
      error,
      analysis_version: 'v1',
    })
    .select('id')
    .maybeSingle();
  if (insErr || !data?.id) {
    throw new Error(`result_insert_failed:${insErr?.message || 'unknown'}`);
  }
  return data.id;
}

async function processEvent(supabase, eventId) {
  // Phase 1C.2: candidates + evidence — uses public.search_card_prints_v1
  const { data: eventRow, error: eventErr } = await supabase
    .from('identity_scan_events')
    .select(
      'id,user_id,snapshot_id,identity_snapshot_id,source_table,analysis_version,created_at,snapshot:condition_snapshots(id,user_id,images),identity_snapshot:identity_snapshots(id,user_id,images)',
    )
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr) throw new Error(`event_fetch_failed:${eventErr.message}`);
  if (!eventRow) throw new Error('event_not_found');

  const userId = eventRow.user_id;
  const snapshot = eventRow.snapshot ?? eventRow.identity_snapshot ?? null;
  const snapshotLane = eventRow.snapshot ? 'condition_snapshots' : eventRow.identity_snapshot ? 'identity_snapshots' : null;
  if (!snapshot?.id) throw new Error('snapshot_not_found');
  log('snapshot_resolved', { eventId, snapshotId: snapshot.id, lane: snapshotLane });

  const images = snapshot.images || {};
  const bucket = images?.bucket;
  const frontPath = images?.paths?.front ?? images?.front?.path;
  if (
    !bucket ||
    typeof bucket !== 'string' ||
    bucket.length === 0 ||
    !frontPath ||
    typeof frontPath !== 'string' ||
    frontPath.length === 0
  ) {
    await insertResult(
      supabase,
      eventId,
      userId,
      'failed',
      { reason: 'snapshot_images_missing' },
      [],
      'snapshot_images_missing',
    );
    return { status: 'failed', error: 'snapshot_images_missing' };
  }

  let objectPath = frontPath;
  if (objectPath.startsWith('/')) {
    objectPath = objectPath.slice(1);
  }
  const bucketPrefix = `${bucket}/`;
  if (objectPath.startsWith(bucketPrefix)) {
    objectPath = objectPath.slice(bucketPrefix.length);
  }

  const frontDl = await downloadImage(supabase, bucket, objectPath);
  if (frontDl.error) {
    await insertResult(supabase, eventId, userId, 'failed', { reason: 'download_failed' }, [], frontDl.error.message);
    return { status: 'failed', error: frontDl.error.message };
  }

  const detect = await detectOuterBorderAI({ imageBuffer: frontDl.data, timeoutMs: 6000 });
  if (!detect?.ok || !Array.isArray(detect.polygon_norm)) {
    await insertResult(
      supabase,
      eventId,
      userId,
      'failed',
      { reason: 'ai_border_failed', notes: detect?.notes || [] },
      [],
      'ai_border_failed',
    );
    return { status: 'failed', error: 'ai_border_failed' };
  }

  const warp = await warpCardQuadAI({
    imageBuffer: frontDl.data,
    quadNorm: detect.polygon_norm,
    outW: AI_WARP_W,
    outH: AI_WARP_H,
    timeoutMs: 15000,
  });
  if (!warp?.ok || !warp.imageBuffer) {
    await insertResult(
      supabase,
      eventId,
      userId,
      'failed',
      { reason: 'warp_failed', notes: warp?.notes || [], polygon_norm: detect.polygon_norm },
      [],
      warp?.error || 'warp_failed',
    );
    return { status: 'failed', error: warp?.error || 'warp_failed' };
  }

  const signals = {
    polygon_norm: detect.polygon_norm,
    border_notes: detect.notes || [],
    warp: { ok: true, size: { w: AI_WARP_W, h: AI_WARP_H } },
    ai_notes: [],
  };

  const aiResp = await aiIdentifyWarp(warp.imageBuffer, eventId);
  if (aiResp.error) {
    const aiErr = aiResp.error.message;
    log('ai_identify_failed', { eventId, error: aiErr });
    signals.ai_notes.push(aiErr);
    signals.ai = { error: aiErr, trace_id: eventId };
    await insertResult(supabase, eventId, userId, 'failed', signals, [], 'ai_identify_failed');
    return { status: 'failed', error: 'ai_identify_failed' };
  }

  const aiPayload = aiResp.data || {};
  const aiResult =
    typeof aiPayload.result === 'object' && aiPayload.result
      ? aiPayload.result
      : aiPayload;
  const name =
    typeof aiResult?.name === 'string'
      ? aiResult.name
      : typeof aiResult?.name?.text === 'string'
        ? aiResult.name.text
        : null;
  const identifyCollectorNumber =
    typeof aiResult?.collector_number === 'string'
      ? aiResult.collector_number
      : null;
  const identifyPrintedTotal =
    typeof aiResult?.printed_total === 'number'
      ? aiResult.printed_total
      : typeof aiResult?.collector_printed_total === 'number'
        ? aiResult.collector_printed_total
        : null;
  const hp = typeof aiResult?.hp === 'number' ? aiResult.hp : null;
  const confidence =
    typeof aiResult?.confidence === 'number'
      ? aiResult.confidence
      : typeof aiResult?.confidence_0_1 === 'number'
        ? aiResult.confidence_0_1
        : null;

  let readCollectorNumber = identifyCollectorNumber ?? null;
  let readPrintedTotal = identifyPrintedTotal ?? null;
  let readNumberConfidence = null;
  let readNumberOk = false;

  if (ENABLE_AI_READ_NUMBER) {
    const baseUrl = process.env.GV_AI_BORDER_URL || '';
    const readNumber = await aiReadNumber({
      baseUrl,
      imageBuffer: warp.imageBuffer,
      traceId: eventId,
      timeoutMs: 20000,
    });
    readNumberOk = !!readNumber?.ok;
    if (!readNumber?.ok) {
      const readErr = readNumber?.error || 'unknown';
      signals.ai_notes.push(`ai_read_number_failed:${readErr}`);
    }
    const rnData = readNumber?.result || {};
    const readCollectorNumberRaw =
      typeof rnData?.collector_number === 'string' ? rnData.collector_number : null;
    readCollectorNumber = readCollectorNumberRaw
      ? normalizeCollectorNumber(readCollectorNumberRaw)
      : null;
    readPrintedTotal = typeof rnData?.printed_total === 'number' ? rnData.printed_total : null;
    readNumberConfidence =
      typeof rnData?.number_confidence_0_1 === 'number' ? rnData.number_confidence_0_1 : null;
  }

  const gvEvidence = {
    name,
    hp,
    confidence,
    run_id: aiPayload.run_id ?? null,
    trace_id: aiPayload.trace_id ?? eventId,
    notes: aiPayload.notes ?? aiResult?.notes ?? null,
    identify_debug: {
      collector_number: identifyCollectorNumber,
      printed_total: identifyPrintedTotal,
    },
  };
  gvEvidence.collector_number = readCollectorNumber ?? null;
  gvEvidence.printed_total = readPrintedTotal ?? null;
  if (ENABLE_AI_READ_NUMBER) {
    gvEvidence.number_confidence_0_1 = readNumberConfidence ?? null;
    gvEvidence.number_source = readNumberOk ? 'ai_read_number' : 'missing';
  }
  signals.ai = gvEvidence;

  const hasName = !!(name && name.trim());
  const hasCollector = !!(readCollectorNumber && readCollectorNumber.trim());
  const hasTotal = typeof readPrintedTotal === 'number';
  if (hasName) {
    log('ai_identify_ok', { eventId, run_id: aiPayload.run_id || null });
    await insertResult(supabase, eventId, userId, 'ai_hint_ready', signals, [], null);
    return { status: 'ai_hint_ready', error: null };
  }

  log('ai_identify_failed', { eventId, reason: 'missing_required_fields' });
  await insertResult(supabase, eventId, userId, 'failed', signals, [], 'ai_identify_failed');
  return { status: 'failed', error: 'ai_identify_failed' };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();
  const pgPool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  log('worker_start', { once: opts.once, maxJobs: opts.maxJobs, sleepMs: opts.sleepMs });

  await ensureJobs(pgPool, supabase, MAX_ENQUEUE);

  let processed = 0;
  let backoffMs = 0;
  const maxJobs = opts.maxJobs ?? 1;

  while (true) {
    if (opts.once && processed >= maxJobs) break;
    if (!opts.once && processed >= maxJobs) break;

    if (backoffMs > 0) {
      await new Promise((r) => setTimeout(r, backoffMs));
      backoffMs = 0;
    }

    let claimed = null;
    try {
      claimed = await claimJob(supabase, opts.lockTtlMs);
    } catch (err) {
      log('job_claim_error', { error: err.message });
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    if (!claimed) {
      log('claim_noop', { reason: 'no_pending_or_stale' });
      await new Promise((r) => setTimeout(r, opts.sleepMs));
      if (!opts.once) {
        processed = 0;
        await ensureJobs(pgPool, supabase, MAX_ENQUEUE);
        continue;
      }
      break;
    }

    const { job, reclaimed } = claimed;
    const eventId = job.payload?.identity_scan_event_id;
    log('job_claimed', { jobId: job.id, eventId, attempts: job.attempts, reclaimed: reclaimed || false });

    if (!eventId || typeof eventId !== 'string' || eventId.length === 0) {
      await markStatus(supabase, job.id, 'failed');
      log('job_error', { jobId: job.id, error: 'missing_event_id' });
      processed += 1;
      continue;
    }

    try {
      const res = await processEvent(supabase, eventId);
      await markStatus(supabase, job.id, 'completed');
      log('job_ok', { jobId: job.id, eventId, status: res.status });
    } catch (err) {
      await markStatus(supabase, job.id, 'failed');
      log('job_failed', { jobId: job.id, eventId, error: err.message });
      backoffMs = 1000;
    }

    processed += 1;
  }

  await pgPool.end();
  log('worker_exit', { processed });
}

if (process.argv[1] && process.argv[1].includes('identity_scan_worker_v1.mjs')) {
  main().catch((err) => {
    log('fatal', { error: err.message });
    process.exit(1);
  });
}
