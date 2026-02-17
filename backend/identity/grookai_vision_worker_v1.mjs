// grookai_vision_worker_v1.mjs
// Phase 1: fetch pending identity_scan_events (identity_snapshots) -> call /ai-identify-warp -> evidence only.

import '../env.mjs';
import pg from 'pg';
import { createBackendClient } from '../supabase_backend_client.mjs';

const { Pool } = pg;
const JOB_TYPE = 'grookai_vision_v1';
const LOCKED_BY = 'grookai_vision_worker_v1';
const MAX_ENQUEUE = 50;

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
  // Enqueue ingestion_jobs for pending identity_scan_events (identity_snapshots) without active jobs.
  const sql = `
    with candidates as (
      select e.id
      from public.identity_scan_events e
      where e.status = 'pending'
        and e.source_table = 'identity_snapshots'
        and e.identity_snapshot_id is not null
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

async function callGrookaiVision(imageBuffer, traceId) {
  const token = process.env.GV_AI_ENDPOINT_TOKEN || '';
  if (!token) {
    return { error: new Error('missing_gv_token') };
  }
  const endpoint = 'https://ai.grookaivault.com/ai-identify-warp';
  const payload = {
    image_b64: imageBuffer.toString('base64'),
    trace_id: traceId,
  };
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gv-token': token,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { error: new Error(`gv_network_error:${err.message}`) };
  }

  if (!response.ok) {
    return { error: new Error(`gv_http_${response.status}`) };
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    return { error: new Error('gv_invalid_json') };
  }

  if (!json || typeof json !== 'object') {
    return { error: new Error('gv_invalid_payload') };
  }

  return { data: json };
}

async function processJob(supabase, job) {
  const jobId = job.id;
  const eventId = job.payload?.identity_scan_event_id;
  if (!eventId) {
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, reason: 'missing_event_id' });
    return;
  }

  const { data: event, error: eventErr } = await supabase
    .from('identity_scan_events')
    .select('id,user_id,identity_snapshot_id,signals,source_table,status')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr || !event) {
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: eventErr?.message || 'event_not_found' });
    return;
  }

  if (event.status === 'ai_hint_ready' && event.signals?.grookai_vision) {
    await markStatus(supabase, jobId, 'completed');
    log('job_skip', { jobId, eventId, reason: 'already_processed' });
    return;
  }

  const { data: priorReady, error: priorErr } = await supabase
    .from('identity_scan_event_results')
    .select('id')
    .eq('identity_scan_event_id', eventId)
    .eq('status', 'ai_hint_ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (priorErr) {
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: priorErr.message });
    return;
  }
  if (priorReady) {
    await markStatus(supabase, jobId, 'completed');
    log('job_skip', { jobId, eventId, reason: 'result_exists' });
    return;
  }

  if (event.source_table !== 'identity_snapshots' || !event.identity_snapshot_id) {
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: 'not_identity_envelope' });
    return;
  }

  const { data: snap, error: snapErr } = await supabase
    .from('identity_snapshots')
    .select('id,user_id,images')
    .eq('id', event.identity_snapshot_id)
    .maybeSingle();
  if (snapErr || !snap) {
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: snapErr?.message || 'snapshot_not_found' });
    return;
  }

  const images = snap.images || {};
  const bucket = images.bucket || 'condition-scans';
  const frontPath =
    (images.paths && typeof images.paths.front === 'string' && images.paths.front) ||
    (typeof images.front === 'string' && images.front) ||
    (images.front && typeof images.front.path === 'string' && images.front.path);

  if (!frontPath) {
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: 'missing_front_path' });
    return;
  }

  let normalizedPath = frontPath;
  if (normalizedPath.startsWith(`${bucket}/`)) {
    normalizedPath = normalizedPath.slice(bucket.length + 1);
  }

  const dl = await downloadImage(supabase, bucket, normalizedPath);
  if (dl.error) {
    const signals = { ...(event.signals || {}), grookai_vision: { error: dl.error.message } };
    await supabase.from('identity_scan_event_results').insert({
      user_id: event.user_id,
      identity_scan_event_id: eventId,
      status: 'failed',
      signals,
      candidates: [],
      error: dl.error.message,
      analysis_version: 'grookai-vision-v1',
    });
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: dl.error.message });
    return;
  }

  const gvResp = await callGrookaiVision(dl.data, eventId);
  if (gvResp.error) {
    const signals = { ...(event.signals || {}), grookai_vision: { error: gvResp.error.message } };
    await supabase.from('identity_scan_event_results').insert({
      user_id: event.user_id,
      identity_scan_event_id: eventId,
      status: 'failed',
      signals,
      candidates: [],
      error: gvResp.error.message,
      analysis_version: 'grookai-vision-v1',
    });
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: gvResp.error.message });
    return;
  }

  const payload = gvResp.data || {};
  const result = payload.result || {};
  const gvEvidence = {
    name:
      typeof result?.name === 'string'
        ? result.name
        : typeof result?.name?.text === 'string'
          ? result.name.text
          : null,
    number_raw:
      typeof result?.collector_number === 'string'
        ? result.collector_number
        : typeof result?.number === 'string'
          ? result.number
      : typeof result?.number_raw === 'string'
        ? result.number_raw
        : typeof result?.number_raw?.text === 'string'
          ? result.number_raw.text
          : null,
    printed_total:
  typeof result?.collector_printed_total === 'number'
    ? result.collector_printed_total
    : typeof result?.printed_total === 'number'
      ? result.printed_total
      : typeof result?.printed_total?.value === 'number'
        ? result.printed_total.value
        : null,

    hp:
      typeof result?.hp === 'number'
        ? result.hp
        : result?.hp_raw ?? null,
    confidence_0_1:
      typeof result?.confidence === 'number'
        ? result.confidence
        : typeof result?.confidence_0_1 === 'number'
          ? result.confidence_0_1
          : null,
    model: 'grookai-vision-v1',
    run_id: payload.run_id ?? null,
    warp_sha: payload.sha256 ?? null,
  };

  const signals = { ...(event.signals || {}), grookai_vision: gvEvidence };
  const { error: insErr } = await supabase.from('identity_scan_event_results').insert({
    user_id: event.user_id,
    identity_scan_event_id: eventId,
    status: 'ai_hint_ready',
    signals,
    candidates: [],
    error: null,
    analysis_version: 'grookai-vision-v1',
  });
  if (insErr) {
    await markStatus(supabase, jobId, 'failed');
    log('job_error', { jobId, eventId, reason: insErr.message });
    return;
  }

  await markStatus(supabase, jobId, 'completed');
  log('job_ok', { jobId, eventId, run_id: payload.run_id || null });
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

    try {
      await processJob(supabase, job);
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

if (process.argv[1] && process.argv[1].includes('grookai_vision_worker_v1.mjs')) {
  main().catch((err) => {
    log('fatal', { error: err.message });
    process.exit(1);
  });
}
