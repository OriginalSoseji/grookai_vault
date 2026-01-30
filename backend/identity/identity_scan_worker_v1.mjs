// Identity Scanner V1 Highway worker (Phase 1B)
// - Appends results to identity_scan_event_results (append-only)
// - Uses ingestion_jobs lock pattern (job_type=identity_scan_v1)
// - Border/warp via existing AI border client; OCR not implemented (records failure)

import '../env.mjs';
import pg from 'pg';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { detectOuterBorderAI, warpCardQuadAI, ocrCardSignalsAI } from '../condition/ai_border_detector_client.mjs';

const { Pool } = pg;
const JOB_TYPE = 'identity_scan_v1';
const LOCKED_BY = 'identity_scan_worker_v1';
const MAX_ENQUEUE = 50;
const AI_WARP_W = 1024;
const AI_WARP_H = 1428;

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
    .select('id,user_id,snapshot_id,analysis_version,created_at,snapshot:condition_snapshots(id,user_id,images)')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr) throw new Error(`event_fetch_failed:${eventErr.message}`);
  if (!eventRow) throw new Error('event_not_found');

  const userId = eventRow.user_id;
  const snapshot = eventRow.snapshot;
  if (!snapshot?.id) throw new Error('snapshot_not_found');

  const images = snapshot.images || {};
  const bucket = images.bucket || 'condition-scans';
  const frontPath =
    images.paths?.front ||
    images.front?.path ||
    (typeof images.front === 'string' ? images.front : null);
  if (!frontPath || typeof frontPath !== 'string' || frontPath.length === 0) {
    await insertResult(supabase, eventId, userId, 'failed', { reason: 'missing_front_image' }, [], 'missing_front_image');
    return { status: 'failed', error: 'missing_front_image' };
  }

  const frontDl = await downloadImage(supabase, bucket, frontPath);
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

  const ocr = await ocrCardSignalsAI({ imageBuffer: warp.imageBuffer, timeoutMs: 6000 });
  const signals = {
    polygon_norm: detect.polygon_norm,
    border_notes: detect.notes || [],
    warp: { ok: true, size: { w: AI_WARP_W, h: AI_WARP_H } },
    ocr_notes: ocr.notes || [],
    ocr_engine: ocr?.result?.debug?.engine || null,
    name_ocr: ocr?.result?.name?.text || null,
    name_conf: ocr?.result?.name?.confidence ?? null,
    number_raw: ocr?.result?.number_raw?.text || null,
    number_conf: ocr?.result?.number_raw?.confidence ?? null,
    number_digits: (ocr?.result?.number_raw?.text || '').replace(/[^0-9]/g, '') || null,
    printed_total: ocr?.result?.printed_total?.value ?? null,
    total_conf: ocr?.result?.printed_total?.confidence ?? null,
    printed_set_abbrev_raw: ocr?.result?.printed_set_abbrev_raw?.text || null,
    set_abbrev_conf: ocr?.result?.printed_set_abbrev_raw?.confidence ?? null,
  };

  const hasName = !!signals.name_ocr;
  const hasNumber = !!signals.number_raw;
  if (!ocr.ok || (!hasName && !hasNumber)) {
    await insertResult(
      supabase,
      eventId,
      userId,
      'failed',
      signals,
      [],
      ocr.error || 'ocr_no_signal',
    );
    return { status: 'failed', error: ocr.error || 'ocr_no_signal' };
  }

  // Build search inputs
  const name = (signals.name_ocr || '').trim();
  const numberRaw = (signals.number_raw || '').trim();
  const numberDigits = (signals.number_digits || '').trim();
  const numberInput = numberRaw || numberDigits || null;
  const setCodeIn = null;
  const q = name.length > 0 ? name : null;

  if (!q && !numberInput) {
    await insertResult(
      supabase,
      eventId,
      userId,
      'failed',
      signals,
      [],
      'no_search_inputs',
    );
    return { status: 'failed', error: 'no_search_inputs' };
  }

  let candidates = [];
  let searchError = null;
  try {
    const resp = await supabase.rpc('search_card_prints_v1', {
      q,
      set_code_in: setCodeIn,
      number_in: numberInput,
      limit_in: 10,
      offset_in: 0,
    });
    if (Array.isArray(resp)) {
      candidates = resp;
    } else if (resp?.data && Array.isArray(resp.data)) {
      candidates = resp.data;
    } else {
      candidates = [];
    }
  } catch (err) {
    searchError = err?.message || 'search_rpc_failed';
  }

  if (searchError) {
    await insertResult(supabase, eventId, userId, 'failed', signals, [], 'search_rpc_failed');
    return { status: 'failed', error: 'search_rpc_failed' };
  }

  // Evidence chips
  const evidenceSummary = [];
  if (name) evidenceSummary.push('signals:name');
  if (numberInput) evidenceSummary.push('signals:number');
  if (signals.printed_total !== null && signals.printed_total !== undefined) evidenceSummary.push('signals:total');
  if (signals.printed_set_abbrev_raw) evidenceSummary.push('signals:set_abbrev');
  evidenceSummary.push('search:rpc');

  const pad3 = numberDigits ? numberDigits.padStart(3, '0') : null;

  const mapped = candidates.map((c) => {
    const ev = [];
    const cName = (c?.name || '').toString();
    const cSet = (c?.set_code || '').toString();
    const cNumber = (c?.number || '').toString();
    const cImage = (c?.image_best || c?.image_url || c?.thumb_url || null) || null;
    const cNumberDigits = cNumber.replace(/[^0-9]/g, '');
    const cNumberSlashedMatch =
      pad3 && c?.number_slashed ? c.number_slashed.startsWith(`${pad3}/`) : false;

    if (name && cName.toLowerCase().includes(name.toLowerCase())) ev.push('name_match');
    if (numberDigits && cNumberDigits === numberDigits) ev.push('number_match');
    else if (numberInput && cNumberSlashedMatch) ev.push('number_slash_match');
    if (signals.printed_total && c?.number_slashed && c.number_slashed.endsWith(`/${signals.printed_total}`)) {
      ev.push('printed_total_match');
    }
    if (signals.printed_set_abbrev_raw) {
      ev.push('set_abbrev_present');
    }

    return {
      card_print_id: c?.id || null,
      name: cName,
      set_code: cSet,
      number: cNumber,
      image_url: cImage,
      evidence: ev,
    };
  });

  if (mapped.length === 0) {
    evidenceSummary.push('search:no_candidates');
  }

  signals.evidence_summary = evidenceSummary;

  await insertResult(
    supabase,
    eventId,
    userId,
    'complete',
    signals,
    mapped,
    mapped.length === 0 ? 'no_candidates' : null,
  );
  return { status: 'complete', error: mapped.length === 0 ? 'no_candidates' : null };
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
