// scratches_surface_worker_v1.mjs
// Usage:
//   node backend/condition/scratches_surface_worker_v1.mjs --snapshot-id <uuid> --analysis-version v1_scratches --dry-run true|false --debug true|false

import '../env.mjs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { createBackendClient } from '../supabase_backend_client.mjs';

// Allow local overrides without editing .env.local
if (process.env.SUPABASE_URL_LOCAL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_LOCAL;
}
if (process.env.SUPABASE_SECRET_KEY_LOCAL) {
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY_LOCAL;
}

let DEBUG = false;

function parseArgs(argv) {
  const out = {
    snapshotId: null,
    analysisVersion: 'v1_scratches',
    dryRun: true,
    debug: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot-id') {
      out.snapshotId = argv[i + 1] || null;
      i += 1;
    } else if (arg === '--analysis-version') {
      out.analysisVersion = argv[i + 1] || 'v1_scratches';
      i += 1;
    } else if (arg === '--dry-run') {
      out.dryRun = (argv[i + 1] || 'true').toLowerCase() === 'true';
      i += 1;
    } else if (arg === '--debug') {
      out.debug = (argv[i + 1] || 'false').toLowerCase() === 'true';
      i += 1;
    }
  }
  return out;
}

function logStatus(event, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  console.log(JSON.stringify(entry));
}

function dbg(label, obj) {
  if (!DEBUG) return;
  console.log(`[DEBUG] ${label}: ${JSON.stringify(obj)}`);
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function resolvePath(images, key) {
  return (
    images?.paths?.[key] ??
    images?.[key]?.path ??
    (typeof images?.[key] === 'string' ? images[key] : null)
  );
}

async function downloadImage(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) return { error };
  if (!data) return { error: new Error('empty_download') };
  const buf = Buffer.from(await data.arrayBuffer());
  return { data: buf };
}

async function computeSignals(buffer) {
  const processed = await sharp(buffer)
    .resize({ width: 900, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = processed;
  const { width, height } = info;
  const len = data.length;
  if (!width || !height || len === 0) {
    throw new Error('invalid_image_dimensions');
  }

  let sumGrad = 0;
  let gradCount = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const idx = y * width + x;
      const val = data[idx];
      const dx = data[idx + 1] - val;
      const dy = data[idx + width] - val;
      sumGrad += Math.abs(dx) + Math.abs(dy);
      gradCount += 2;
    }
  }
  const highFreqEnergy = gradCount > 0 ? sumGrad / gradCount : 0;

  let sum = 0;
  for (let i = 0; i < len; i += 1) sum += data[i];
  const mean = len > 0 ? sum / len : 0;
  let varSum = 0;
  for (let i = 0; i < len; i += 1) {
    const diff = data[i] - mean;
    varSum += diff * diff;
  }
  const specularVariance = len > 0 ? varSum / len : 0;

  return {
    high_freq_energy: Number(highFreqEnergy.toFixed(4)),
    specular_variance: Number(specularVariance.toFixed(4)),
    debug: { width, height },
  };
}

async function processFace(supabase, bucket, path) {
  if (!path) {
    return {
      status: 'failed',
      confidence_0_1: 0.2,
      signals: { high_freq_energy: 0.0, specular_variance: 0.0 },
      regions: [],
      debug: { reason: 'path_missing' },
    };
  }
  const dl = await downloadImage(supabase, bucket, path);
  if (dl.error) {
    return {
      status: 'failed',
      confidence_0_1: 0.2,
      signals: { high_freq_energy: 0.0, specular_variance: 0.0 },
      regions: [],
      debug: { reason: 'download_failed', detail: dl.error.message },
    };
  }
  try {
    const sig = await computeSignals(dl.data);
    return {
      status: 'ok',
      confidence_0_1: 0.2,
      signals: {
        high_freq_energy: sig.high_freq_energy,
        specular_variance: sig.specular_variance,
      },
      regions: [],
      debug: sig.debug,
    };
  } catch (e) {
    return {
      status: 'failed',
      confidence_0_1: 0.2,
      signals: { high_freq_energy: 0.0, specular_variance: 0.0 },
      regions: [],
      debug: { reason: 'compute_failed', detail: e.message },
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.snapshotId) {
    console.error('Usage: node backend/condition/scratches_surface_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1_scratches] [--dry-run true|false] [--debug true|false]');
    process.exit(1);
  }
  const snapshotId = args.snapshotId.trim();
  let analysisVersion = (args.analysisVersion || 'v1_scratches').trim();
  const dryRun = !!args.dryRun;
  DEBUG = !!args.debug;

  const supabase = createBackendClient();
  const started = Date.now();

  const { data: snapshotRow, error: snapshotErr } = await supabase
    .from('condition_snapshots')
    .select('images')
    .eq('id', snapshotId)
    .maybeSingle();

  if (snapshotErr) {
    logStatus('error', { snapshotId, analysisVersion, error: snapshotErr.message });
    process.exit(1);
  }
  if (!snapshotRow?.images) {
    logStatus('error', { snapshotId, analysisVersion, error: 'images_missing' });
    process.exit(1);
  }

  const images = snapshotRow.images || {};
  const bucket = images.bucket || 'condition-scans';
  const frontPath = resolvePath(images, 'front');
  const backPath = resolvePath(images, 'back');

  const frontFace = await processFace(supabase, bucket, frontPath);
  const backFace = await processFace(supabase, bucket, backPath);

  const overallStatus =
    frontFace.status === 'ok' && backFace.status === 'ok'
      ? 'ok'
      : frontFace.status === 'ok' || backFace.status === 'ok'
        ? 'partial'
        : 'failed';

  const scratchesV1 = {
    version: 1,
    front: {
      status: frontFace.status,
      confidence_0_1: 0.2,
      signals: frontFace.signals,
      regions: frontFace.regions,
      debug: frontFace.debug,
    },
    back: {
      status: backFace.status,
      confidence_0_1: 0.2,
      signals: backFace.signals,
      regions: backFace.regions,
      debug: backFace.debug,
    },
    overall: {
      status: overallStatus,
      confidence_0_1: 0.2,
      notes: ['instrumentation-only'],
    },
  };

  const measurements = {
    scratches_v1: scratchesV1,
  };

  const defects = { version: 1, items: [] };
  let analysisStatus = overallStatus;
  let failureReason = overallStatus === 'ok' ? null : 'scratches_decode_failed';
  const confidence = 0.2;

  const scanQuality = {
    version: 1,
    ok: analysisStatus === 'ok' || analysisStatus === 'partial',
    analysis_status: analysisStatus,
    failure_reason: failureReason,
    notes: ['scratches_v1'],
  };

  const analysisKey = sha256Hex(`${snapshotId}|${analysisVersion}`);

  const payload = {
    snapshot_id: snapshotId,
    analysis_version: analysisVersion,
    analysis_key: analysisKey,
    scan_quality: scanQuality,
    measurements,
    defects,
    confidence,
    analysis_status: analysisStatus,
  };

  if (dryRun) {
    console.log(JSON.stringify({ snapshot_id: snapshotId, analysis_version: analysisVersion, scratches_v1: scratchesV1 }, null, 2));
    process.exit(0);
  }

  const { error: insertErr, data: inserted } = await supabase.rpc(
    'admin_condition_assist_insert_analysis_v1',
    {
      p_snapshot_id: snapshotId,
      p_analysis_version: analysisVersion,
      p_analysis_key: analysisKey,
      p_scan_quality: scanQuality,
      p_measurements: measurements,
      p_defects: defects,
      p_confidence: confidence,
    },
  );

  if (insertErr) {
    logStatus('error', { snapshotId, analysisVersion, analysisKey, error: insertErr.message });
    process.exit(1);
  }

  if (!inserted) {
    logStatus('noop', { snapshotId, analysisVersion, analysisKey, reason: 'duplicate' });
    process.exit(0);
  }

  const elapsedMs = Date.now() - started;
  logStatus('ok', { snapshotId, analysisVersion, analysisKey, ms: elapsedMs, analysis_status: analysisStatus });
  process.exit(0);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});

export async function runScratchesOnSnapshot(options = {}) {
  const {
    snapshotId,
    analysisVersion = 'v1_scratches',
    dryRun = true,
    debug = false,
  } = options;

  if (!snapshotId) {
    throw new Error('snapshotId is required');
  }

  const args = [
    fileURLToPath(import.meta.url),
    '--snapshot-id',
    snapshotId,
    '--analysis-version',
    analysisVersion,
    '--dry-run',
    dryRun ? 'true' : 'false',
    '--debug',
    debug ? 'true' : 'false',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}
