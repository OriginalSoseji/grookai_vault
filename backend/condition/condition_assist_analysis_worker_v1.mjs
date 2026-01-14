// condition_assist_analysis_worker_v1.mjs
// Backend Highway worker: append-only analysis writer for condition_snapshots
// Usage: node backend/condition/condition_assist_analysis_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1]

import '../env.mjs';
import crypto from 'node:crypto';
import { createBackendClient } from '../supabase_backend_client.mjs';

// Allow local overrides without editing .env.local
if (process.env.SUPABASE_URL_LOCAL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_LOCAL;
}
if (process.env.SUPABASE_SECRET_KEY_LOCAL) {
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY_LOCAL;
}

function parseArgs(argv) {
  const out = { snapshotId: null, analysisVersion: 'v1' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot-id') {
      out.snapshotId = argv[i + 1] || null;
      i += 1;
    } else if (arg === '--analysis-version') {
      out.analysisVersion = argv[i + 1] || 'v1';
      i += 1;
    }
  }
  return out;
}

function printUsage() {
  console.log('Usage: node backend/condition/condition_assist_analysis_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1]');
}

function logStatus(event, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  console.log(JSON.stringify(entry));
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function buildManifest(images) {
  const keys = ['front', 'back', 'corner_tl', 'corner_tr', 'corner_bl', 'corner_br'];
  const entries = [];
  for (const k of keys) {
    const path = images?.[k]?.path ?? images?.[k];
    if (typeof path === 'string' && path.length > 0) {
      entries.push([k, path]);
    }
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return Object.fromEntries(entries);
}

async function insertFailure(supabase, { snapshotId, attemptedSnapshotId, analysisVersion, analysisKey, code, detail }) {
  const { error } = await supabase.rpc('admin_condition_assist_insert_failure_v1', {
    p_snapshot_id: snapshotId,
    p_attempted_snapshot_id: attemptedSnapshotId,
    p_analysis_version: analysisVersion,
    p_analysis_key: analysisKey,
    p_error_code: code,
    p_error_detail: detail,
  });
  if (error) {
    logStatus('failure_insert_error', { snapshotId, analysisVersion, analysisKey, code, detail, db_error: error.message });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.snapshotId) {
    printUsage();
    process.exit(1);
  }
  const snapshotId = args.snapshotId.trim();
  const analysisVersion = (args.analysisVersion || 'v1').trim();

  const supabase = createBackendClient();
  const started = Date.now();

  // Fetch snapshot
  const { data: snap, error: snapErr } = await supabase
    .from('condition_snapshots')
    .select('id, user_id, images')
    .eq('id', snapshotId)
    .maybeSingle();

  if (snapErr) {
    await insertFailure(supabase, {
      snapshotId: null,
      attemptedSnapshotId: snapshotId,
      analysisVersion,
      analysisKey: null,
      code: 'SNAPSHOT_READ_ERROR',
      detail: snapErr.message,
    });
    logStatus('error', { snapshotId, analysisVersion, error: snapErr.message });
    process.exit(1);
  }

  if (!snap) {
    await insertFailure(supabase, {
      snapshotId: null,
      attemptedSnapshotId: snapshotId,
      analysisVersion,
      analysisKey: null,
      code: 'SNAPSHOT_NOT_FOUND',
      detail: 'Snapshot not found',
    });
    logStatus('not_found', { snapshotId, analysisVersion });
    process.exit(1);
  }

  const userId = snap.user_id;
  const images = snap.images || {};
  const frontPath = images?.front?.path ?? images?.front;
  const backPath = images?.back?.path ?? images?.back;

  if (typeof frontPath !== 'string' || typeof backPath !== 'string') {
    await insertFailure(supabase, {
      snapshotId,
      attemptedSnapshotId: snapshotId,
      analysisVersion,
      analysisKey: null,
      code: 'INVALID_IMAGE_PATH',
      detail: 'front/back path missing',
    });
    logStatus('invalid_images', { snapshotId, analysisVersion, reason: 'front/back missing' });
    process.exit(1);
  }

  const requiredPrefix = `${userId}/`;
  if (!frontPath.startsWith(requiredPrefix) || !backPath.startsWith(requiredPrefix)) {
    await insertFailure(supabase, {
      snapshotId,
      attemptedSnapshotId: snapshotId,
      analysisVersion,
      analysisKey: null,
      code: 'INVALID_IMAGE_PATH_PREFIX',
      detail: 'front/back path prefix mismatch',
    });
    logStatus('invalid_images', { snapshotId, analysisVersion, reason: 'prefix mismatch' });
    process.exit(1);
  }

  const manifest = buildManifest(images);
  const manifestJson = JSON.stringify(manifest);
  const analysisKey = sha256Hex(`${snapshotId}|${analysisVersion}|${manifestJson}`);

  const { data: inserted, error: insertErr } = await supabase.rpc(
    'admin_condition_assist_insert_analysis_v1',
    {
      p_snapshot_id: snapshotId,
      p_analysis_version: analysisVersion,
      p_analysis_key: analysisKey,
      p_scan_quality: { mvp: true, ok: true },
      p_measurements: {},
      p_defects: {},
      p_confidence: 0.5,
    },
  );

  if (insertErr) {
    await insertFailure(supabase, {
      snapshotId,
      attemptedSnapshotId: snapshotId,
      analysisVersion,
      analysisKey,
      code: 'INSERT_FAILED',
      detail: insertErr.message,
    });
    logStatus('error', { snapshotId, analysisVersion, analysisKey, error: insertErr.message });
    process.exit(1);
  }

  if (!inserted) {
    logStatus('noop', { snapshotId, analysisVersion, analysisKey, reason: 'duplicate' });
    process.exit(0);
  }

  const elapsedMs = Date.now() - started;
  logStatus('ok', { snapshotId, analysisVersion, analysisKey, ms: elapsedMs });
  process.exit(0);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
