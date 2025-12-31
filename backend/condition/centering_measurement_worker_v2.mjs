// centering_measurement_worker_v2.mjs
// Usage:
//   node backend/condition/centering_measurement_worker_v2.mjs --snapshot-id <uuid> [--analysis-version v2_centering] [--dry-run true|false]

import '../env.mjs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { createBackendClient } from '../supabase_backend_client.mjs';

// Allow local overrides without editing .env.local
if (process.env.SUPABASE_URL_LOCAL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_LOCAL;
}
if (process.env.SUPABASE_SECRET_KEY_LOCAL) {
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY_LOCAL;
}

function parseArgs(argv) {
  const out = { snapshotId: null, analysisVersion: 'v2_centering', dryRun: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot-id') {
      out.snapshotId = argv[i + 1] || null;
      i += 1;
    } else if (arg === '--analysis-version') {
      out.analysisVersion = argv[i + 1] || 'v2_centering';
      i += 1;
    } else if (arg === '--dry-run') {
      const val = (argv[i + 1] || 'true').toLowerCase();
      out.dryRun = val === 'true';
      i += 1;
    }
  }
  return out;
}

function printUsage() {
  console.log('Usage: node backend/condition/centering_measurement_worker_v2.mjs --snapshot-id <uuid> [--analysis-version v2_centering] [--dry-run true|false]');
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

async function downloadImage(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) return { error };
  if (!data) return { error: new Error('empty_download') };
  const buf = Buffer.from(await data.arrayBuffer());
  return { data: buf };
}

function stats(values) {
  let sum = 0;
  let sumSq = 0;
  for (const v of values) {
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / values.length;
  const variance = Math.max(0, sumSq / values.length - mean * mean);
  return { mean, std: Math.sqrt(variance) };
}

function findBox(data, width, height, threshold, minFrac = 0.04) {
  const rowHits = new Array(height).fill(0);
  const colHits = new Array(width).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const val = data[y * width + x];
      if (val < threshold) {
        rowHits[y] += 1;
        colHits[x] += 1;
      }
    }
  }

  const rowMin = width * minFrac;
  const colMin = height * minFrac;

  const top = rowHits.findIndex((c) => c > rowMin);
  const bottom = (() => {
    for (let y = height - 1; y >= 0; y -= 1) {
      if (rowHits[y] > rowMin) return y;
    }
    return -1;
  })();

  const left = colHits.findIndex((c) => c > colMin);
  const right = (() => {
    for (let x = width - 1; x >= 0; x -= 1) {
      if (colHits[x] > colMin) return x;
    }
    return -1;
  })();

  if (top < 0 || bottom < 0 || left < 0 || right < 0) return null;
  if (bottom - top < 10 || right - left < 10) return null;

  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function normalizeBox(box, width, height) {
  return {
    x: box.x / width,
    y: box.y / height,
    w: box.w / width,
    h: box.h / height,
  };
}

async function processFace(buffer) {
  const resized = await sharp(buffer)
    .resize({ width: 900, withoutEnlargement: true })
    .grayscale()
    .blur(0.6)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const width = info.width;
  const height = info.height;
  const statsAll = stats(data);
  const thresholdOuter = Math.max(0, statsAll.mean - statsAll.std * 0.35);
  const outer = findBox(data, width, height, thresholdOuter, 0.03);

  if (!outer) {
    return {
      status: 'failed',
      failure_reason: 'quad_not_found',
      confidence: 0.1,
      evidence: {},
    };
  }

  const marginX = Math.floor(outer.w * 0.08);
  const marginY = Math.floor(outer.h * 0.08);
  const innerX0 = Math.min(width - 1, Math.max(0, outer.x + marginX));
  const innerY0 = Math.min(height - 1, Math.max(0, outer.y + marginY));
  const innerW = Math.max(8, outer.w - marginX * 2);
  const innerH = Math.max(8, outer.h - marginY * 2);

  const crop = await sharp(data, { raw: { width, height, channels: 1 } })
    .extract({ left: innerX0, top: innerY0, width: innerW, height: innerH })
    .blur(0.5)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const innerStats = stats(crop.data);
  const thresholdInner = Math.max(0, innerStats.mean - innerStats.std * 0.25);
  const innerBoxLocal = findBox(crop.data, crop.info.width, crop.info.height, thresholdInner, 0.05);

  if (!innerBoxLocal) {
    return {
      status: 'failed',
      failure_reason: 'inner_frame_not_found',
      confidence: 0.2,
      evidence: { outer_bbox: normalizeBox(outer, width, height) },
    };
  }

  const inner = {
    x: innerX0 + innerBoxLocal.x,
    y: innerY0 + innerBoxLocal.y,
    w: innerBoxLocal.w,
    h: innerBoxLocal.h,
  };

  const left = inner.x - outer.x;
  const right = (outer.x + outer.w) - (inner.x + inner.w);
  const top = inner.y - outer.y;
  const bottom = (outer.y + outer.h) - (inner.y + inner.h);

  const lrRatio = left / (left + right);
  const tbRatio = top / (top + bottom);

  let confidence = 1.0;
  const minDim = Math.min(width, height);
  if (minDim < 400) confidence -= 0.25;
  if (left < 4 || right < 4 || top < 4 || bottom < 4) confidence -= 0.25;
  confidence = Math.max(0.05, Math.min(1, confidence));

  return {
    status: 'ok',
    failure_reason: null,
    confidence,
    lrRatio,
    tbRatio,
    raw: { left, right, top, bottom, width_px: width, height_px: height },
    evidence: {
      outer_bbox: normalizeBox(outer, width, height),
      inner_bbox: normalizeBox(inner, width, height),
      method: 'centering_v2_rectangles',
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.snapshotId) {
    printUsage();
    process.exit(1);
  }
  const snapshotId = args.snapshotId.trim();
  const analysisVersion = (args.analysisVersion || 'v2_centering').trim();
  const dryRun = !!args.dryRun;

  const supabase = createBackendClient();
  const started = Date.now();

  // Fetch snapshot
  const { data: snap, error: snapErr } = await supabase
    .from('condition_snapshots')
    .select('id, user_id, images')
    .eq('id', snapshotId)
    .maybeSingle();

  if (snapErr || !snap) {
    const reason = snapErr ? 'SNAPSHOT_READ_ERROR' : 'SNAPSHOT_NOT_FOUND';
    const detail = snapErr?.message ?? 'Snapshot not found';
    logStatus('error', { snapshotId, analysisVersion, reason, detail });
    if (!dryRun) {
      await insertFailure(supabase, {
        snapshotId: snap ? snap.id : null,
        attemptedSnapshotId: snapshotId,
        analysisVersion,
        analysisKey: null,
        code: reason,
        detail,
      });
    }
    process.exit(1);
  }

  const userId = snap.user_id;
  const images = snap.images || {};
  const frontPath = images?.front?.path ?? images?.front;
  const backPath = images?.back?.path ?? images?.back;

  if (typeof frontPath !== 'string' || typeof backPath !== 'string') {
    logStatus('invalid_images', { snapshotId, analysisVersion, reason: 'front/back missing' });
    if (!dryRun) {
      await insertFailure(supabase, {
        snapshotId,
        attemptedSnapshotId: snapshotId,
        analysisVersion,
        analysisKey: null,
        code: 'INVALID_IMAGE_PATH',
        detail: 'front/back path missing',
      });
    }
    process.exit(1);
  }

  const requiredPrefix = `${userId}/`;
  if (!frontPath.startsWith(requiredPrefix) || !backPath.startsWith(requiredPrefix)) {
    logStatus('invalid_images', { snapshotId, analysisVersion, reason: 'prefix mismatch' });
    if (!dryRun) {
      await insertFailure(supabase, {
        snapshotId,
        attemptedSnapshotId: snapshotId,
        analysisVersion,
        analysisKey: null,
        code: 'INVALID_IMAGE_PATH_PREFIX',
        detail: 'front/back path prefix mismatch',
      });
    }
    process.exit(1);
  }

  const manifest = buildManifest(images);
  const manifestJson = JSON.stringify(manifest);
  const analysisKey = sha256Hex(`${snapshotId}|${analysisVersion}|${manifestJson}`);

  const bucket = images?.bucket ?? 'condition-scans';

  const frontDl = await downloadImage(supabase, bucket, frontPath);
  if (frontDl.error) {
    logStatus('download_failed', { snapshotId, path: frontPath, detail: frontDl.error.message });
    if (!dryRun) {
      await insertFailure(supabase, {
        snapshotId,
        attemptedSnapshotId: snapshotId,
        analysisVersion,
        analysisKey,
        code: 'download_failed',
        detail: frontDl.error.message,
      });
    }
    process.exit(1);
  }
  const backDl = await downloadImage(supabase, bucket, backPath);
  if (backDl.error) {
    logStatus('download_failed', { snapshotId, path: backPath, detail: backDl.error.message });
    if (!dryRun) {
      await insertFailure(supabase, {
        snapshotId,
        attemptedSnapshotId: snapshotId,
        analysisVersion,
        analysisKey,
        code: 'download_failed',
        detail: backDl.error.message,
      });
    }
    process.exit(1);
  }

  const frontResult = await processFace(frontDl.data);
  const backResult = await processFace(backDl.data);

  const successes = [frontResult, backResult].filter((r) => r.status === 'ok').length;
  let analysisStatus = 'ok';
  if (successes === 0) analysisStatus = 'failed';
  else if (successes === 1) analysisStatus = 'partial';

  const failureReason =
    analysisStatus === 'ok'
      ? null
      : (frontResult.failure_reason || backResult.failure_reason || 'unknown');

  const confidence = Math.max(0.05, Math.min(frontResult.confidence || 0, backResult.confidence || 0));

  const measurements = {
    version: 2,
    centering: {
      front_lr_ratio: frontResult.lrRatio ?? null,
      front_tb_ratio: frontResult.tbRatio ?? null,
      back_lr_ratio: backResult.lrRatio ?? null,
      back_tb_ratio: backResult.tbRatio ?? null,
      unit: 'ratio',
      raw: {
        front_left_px: frontResult.raw?.left ?? null,
        front_right_px: frontResult.raw?.right ?? null,
        front_top_px: frontResult.raw?.top ?? null,
        front_bottom_px: frontResult.raw?.bottom ?? null,
        back_left_px: backResult.raw?.left ?? null,
        back_right_px: backResult.raw?.right ?? null,
        back_top_px: backResult.raw?.top ?? null,
        back_bottom_px: backResult.raw?.bottom ?? null,
        normalized_size: {
          width_px: frontResult.raw?.width_px ?? backResult.raw?.width_px ?? null,
          height_px: frontResult.raw?.height_px ?? backResult.raw?.height_px ?? null,
        },
      },
      evidence: {
        front_outer_bbox: frontResult.evidence?.outer_bbox ?? null,
        front_inner_bbox: frontResult.evidence?.inner_bbox ?? null,
        back_outer_bbox: backResult.evidence?.outer_bbox ?? null,
        back_inner_bbox: backResult.evidence?.inner_bbox ?? null,
        method: 'centering_v2_rectangles',
        notes: [],
      },
      analysis_status: analysisStatus,
      failure_reason: failureReason,
    },
  };

  const scanQuality = {
    version: 1,
    ok: analysisStatus === 'ok' || analysisStatus === 'partial',
    analysis_status: analysisStatus,
    failure_reason: failureReason,
    notes: ['centering-only'],
  };

  const payload = {
    snapshot_id: snapshotId,
    analysis_version: analysisVersion,
    analysis_key: analysisKey,
    scan_quality: scanQuality,
    measurements,
    defects: { version: 1, items: [] },
    confidence,
    analysis_status: analysisStatus,
    failure_reason: failureReason,
  };

  if (dryRun) {
    logStatus('dry_run', { snapshotId, analysisVersion, analysisKey, analysis_status: analysisStatus });
    console.log(JSON.stringify(payload, null, 2));
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
      p_defects: { version: 1, items: [] },
      p_confidence: confidence,
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
  logStatus('ok', { snapshotId, analysisVersion, analysisKey, ms: elapsedMs, analysis_status: analysisStatus });
  process.exit(0);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
