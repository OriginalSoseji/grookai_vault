// edges_corners_worker_v1.mjs
// Usage:
//   node backend/condition/edges_corners_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1_edges_corners] [--dry-run true|false] [--debug true|false]

import '../env.mjs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { createBackendClient } from '../supabase_backend_client.mjs';

const CARD_MM_SHORT = 63;
const CARD_MM_LONG = 88;

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
    analysisVersion: 'v1_edges_corners',
    dryRun: true,
    debug: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot-id') {
      out.snapshotId = argv[i + 1] || null;
      i += 1;
    } else if (arg === '--analysis-version') {
      out.analysisVersion = argv[i + 1] || 'v1_edges_corners';
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

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

async function normalizeImage(buffer) {
  return sharp(buffer)
    .resize({ width: 900, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

function computeBlurScore(data, width, height) {
  let sumGrad = 0;
  let count = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const idx = y * width + x;
      const v = data[idx];
      const dx = data[idx + 1] - v;
      const dy = data[idx + width] - v;
      sumGrad += Math.abs(dx) + Math.abs(dy);
      count += 2;
    }
  }
  if (count === 0) return 0;
  const meanGrad = sumGrad / count;
  // Normalize roughly to 0..1 by dividing by 255
  return Number(Math.min(1, Math.max(0, meanGrad / 255)).toFixed(4));
}

function computeBandStats(data, width, height, bandPx, side) {
  let vals = [];
  if (side === 'top') {
    for (let y = 0; y < bandPx; y += 1) {
      for (let x = 0; x < width; x += 1) vals.push(data[y * width + x]);
    }
  } else if (side === 'bottom') {
    for (let y = height - bandPx; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) vals.push(data[y * width + x]);
    }
  } else if (side === 'left') {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < bandPx; x += 1) vals.push(data[y * width + x]);
    }
  } else if (side === 'right') {
    for (let y = 0; y < height; y += 1) {
      for (let x = width - bandPx; x < width; x += 1) vals.push(data[y * width + x]);
    }
  }
  if (vals.length === 0) return { mean: 0, std: 0, mask: [] };
  let sum = 0;
  for (const v of vals) sum += v;
  const mean = sum / vals.length;
  let varSum = 0;
  for (const v of vals) {
    const d = v - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / vals.length);
  const threshold = mean + std * 1.0;

  const mask = [];
  if (side === 'top' || side === 'bottom') {
    const yStart = side === 'top' ? 0 : height - bandPx;
    for (let x = 0; x < width; x += 1) {
      let whitened = 0;
      for (let y = 0; y < bandPx; y += 1) {
        const yy = yStart + y;
        const idx = yy * width + x;
        if (data[idx] >= threshold) whitened += 1;
      }
      mask.push(whitened > 0 ? 1 : 0);
    }
  } else {
    const xStart = side === 'left' ? 0 : width - bandPx;
    for (let y = 0; y < height; y += 1) {
      let whitened = 0;
      for (let x = 0; x < bandPx; x += 1) {
        const xx = xStart + x;
        const idx = y * width + xx;
        if (data[idx] >= threshold) whitened += 1;
      }
      mask.push(whitened > 0 ? 1 : 0);
    }
  }

  return { mean, std, mask };
}

function runLengths(mask) {
  const runs = [];
  let current = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) {
      current += 1;
    } else if (current > 0) {
      runs.push(current);
      current = 0;
    }
  }
  if (current > 0) runs.push(current);
  return runs;
}

function measureEdgewear(data, width, height) {
  const bandPx = clamp(Math.round(Math.min(width, height) * 0.03), 8, 40);
  const isLandscape = width > height;
  const mmWidth = isLandscape ? CARD_MM_LONG : CARD_MM_SHORT;
  const mmHeight = isLandscape ? CARD_MM_SHORT : CARD_MM_LONG;
  const mmPerPxX = mmWidth / width;
  const mmPerPxY = mmHeight / height;

  const sides = ['top', 'bottom', 'left', 'right'];
  const instances = [];
  for (const side of sides) {
    const stats = computeBandStats(data, width, height, bandPx, side);
    const runs = runLengths(stats.mask);
    for (const r of runs) {
      if (side === 'top' || side === 'bottom') {
        const lenMm = r * mmPerPxX;
        if (lenMm >= 1) instances.push({ side, length_mm: Number(lenMm.toFixed(2)) });
      } else {
        const lenMm = r * mmPerPxY;
        if (lenMm >= 1) instances.push({ side, length_mm: Number(lenMm.toFixed(2)) });
      }
    }
  }

  const totalMm = instances.reduce((a, b) => a + b.length_mm, 0);
  const maxMm = instances.reduce((a, b) => Math.max(a, b.length_mm), 0);

  // Corner whitening (simple count in corner boxes)
  const cornerFrac = 0.12;
  const cornerW = Math.max(1, Math.round(width * cornerFrac));
  const cornerH = Math.max(1, Math.round(height * cornerFrac));
  const mmPerPxArea = mmPerPxX * mmPerPxY;
  let cornerCount = 0;
  const thresholdGlobal = (() => {
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += data[i];
    const mean = sum / data.length;
    let varSum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const d = data[i] - mean;
      varSum += d * d;
    }
    const std = Math.sqrt(varSum / data.length);
    return mean + std * 1.0;
  })();

  function countCorner(xStart, yStart) {
    let c = 0;
    for (let y = yStart; y < yStart + cornerH; y += 1) {
      for (let x = xStart; x < xStart + cornerW; x += 1) {
        const idx = y * width + x;
        if (data[idx] >= thresholdGlobal) c += 1;
      }
    }
    return c;
  }

  cornerCount += countCorner(0, 0);
  cornerCount += countCorner(width - cornerW, 0);
  cornerCount += countCorner(0, height - cornerH);
  cornerCount += countCorner(width - cornerW, height - cornerH);

  const cornerAreaMm2 = Number((cornerCount * mmPerPxArea).toFixed(2));

  return {
    edgewear_instances: instances,
    edgewear_total_mm: Number(totalMm.toFixed(2)),
    edgewear_max_contiguous_mm: Number(maxMm.toFixed(2)),
    edgewear_instances_count: instances.length,
    corner_whitening_total_mm2: cornerAreaMm2,
    debug: {
      width,
      height,
      orientation: isLandscape ? 'landscape' : 'portrait',
      card_mm_axes: { mm_width: mmWidth, mm_height: mmHeight },
      mm_per_px: { x: Number(mmPerPxX.toFixed(6)), y: Number(mmPerPxY.toFixed(6)) },
    },
  };
}

function capCondition(instances) {
  const maxLen = instances.reduce((a, b) => Math.max(a, b.length_mm), 0);
  if (maxLen > 80) {
    return { cap: 'MP', reasons: ['edgewear_over_80mm_instance_present'] };
  }
  if (maxLen > 20) {
    return { cap: 'LP', reasons: ['edgewear_minor_instance_present'] };
  }
  if (maxLen > 0) {
    return { cap: 'NM', reasons: ['edgewear_slight_present'] };
  }
  return { cap: 'NM', reasons: ['no_edgewear_detected'] };
}

async function processFace(supabase, bucket, path) {
  if (!path) {
    return {
      status: 'failed',
      confidence_0_1: 0.2,
      signals: {
        edgewear_total_mm: 0.0,
        edgewear_max_contiguous_mm: 0.0,
        edgewear_instances_count: 0,
        corner_whitening_total_mm2: 0.0,
        blur_score: 0.0,
      },
      edgewear_instances: [],
      debug: { reason: 'path_missing' },
    };
  }
  const dl = await downloadImage(supabase, bucket, path);
  if (dl.error) {
    return {
      status: 'failed',
      confidence_0_1: 0.2,
      signals: {
        edgewear_total_mm: 0.0,
        edgewear_max_contiguous_mm: 0.0,
        edgewear_instances_count: 0,
        corner_whitening_total_mm2: 0.0,
        blur_score: 0.0,
      },
      edgewear_instances: [],
      debug: { reason: 'download_failed', detail: dl.error.message },
    };
  }
  try {
    const processed = await normalizeImage(dl.data);
    const { data, info } = processed;
    const { width, height } = info;
    if (!width || !height) throw new Error('invalid_image_dimensions');

    const blurScore = computeBlurScore(data, width, height);
    const wear = measureEdgewear(data, width, height);

    return {
      status: 'ok',
      confidence_0_1: 0.2,
      signals: {
        edgewear_total_mm: wear.edgewear_total_mm,
        edgewear_max_contiguous_mm: wear.edgewear_max_contiguous_mm,
        edgewear_instances_count: wear.edgewear_instances_count,
        corner_whitening_total_mm2: wear.corner_whitening_total_mm2,
        blur_score: blurScore,
      },
      edgewear_instances: wear.edgewear_instances,
      debug: {
        width,
        height,
        orientation: wear.debug.orientation,
        card_mm_axes: wear.debug.card_mm_axes,
        mm_per_px: wear.debug.mm_per_px,
      },
    };
  } catch (e) {
    return {
      status: 'failed',
      confidence_0_1: 0.2,
      signals: {
        edgewear_total_mm: 0.0,
        edgewear_max_contiguous_mm: 0.0,
        edgewear_instances_count: 0,
        corner_whitening_total_mm2: 0.0,
        blur_score: 0.0,
      },
      edgewear_instances: [],
      debug: { reason: 'compute_failed', detail: e.message },
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.snapshotId) {
    console.error('Usage: node backend/condition/edges_corners_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1_edges_corners] [--dry-run true|false] [--debug true|false]');
    process.exit(1);
  }
  const snapshotId = args.snapshotId.trim();
  let analysisVersion = (args.analysisVersion || 'v1_edges_corners').trim();
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

  const instancesCombined = [...(frontFace.edgewear_instances || []), ...(backFace.edgewear_instances || [])];
  const cap = instancesCombined.length > 0 ? capCondition(instancesCombined) : { cap: 'NM', reasons: ['no_edgewear_detected'] };

  const edgesCornersV1 = {
    version: 1,
    tcgplayer: {
      version: 1,
      best_possible_condition: cap.cap || 'UNKNOWN',
      reasons: cap.reasons || [],
    },
    front: {
      status: frontFace.status,
      confidence_0_1: 0.2,
      signals: frontFace.signals,
      edgewear_instances: frontFace.edgewear_instances,
      debug: frontFace.debug,
    },
    back: {
      status: backFace.status,
      confidence_0_1: 0.2,
      signals: backFace.signals,
      edgewear_instances: backFace.edgewear_instances,
      debug: backFace.debug,
    },
    overall: {
      status: overallStatus,
      confidence_0_1: 0.2,
      notes: ['tcgplayer-aligned-edgewear-v1'],
    },
  };

  const measurements = {
    edges_corners_v1: edgesCornersV1,
  };

  const defects = { version: 1, items: [] };
  let analysisStatus = overallStatus;
  let failureReason = overallStatus === 'ok' ? null : (frontFace.status === 'failed' || backFace.status === 'failed' ? 'face_decode_failed' : 'edgewear_partial');
  const confidence = 0.2;

  const scanQuality = {
    version: 1,
    ok: analysisStatus === 'ok' || analysisStatus === 'partial',
    analysis_status: analysisStatus,
    failure_reason: failureReason,
    notes: ['edges_corners_v1'],
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
    console.log(JSON.stringify({
      snapshot_id: snapshotId,
      analysis_version: analysisVersion,
      edges_corners_v1: edgesCornersV1,
      scan_quality: scanQuality,
    }, null, 2));
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

export async function runEdgesCornersOnSnapshot(options = {}) {
  const {
    snapshotId,
    analysisVersion = 'v1_edges_corners',
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
