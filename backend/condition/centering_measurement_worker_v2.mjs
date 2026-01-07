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

let DEBUG = false;

function parseArgs(argv) {
  const out = { snapshotId: null, analysisVersion: 'v2_centering', dryRun: true, debug: false };
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
    } else if (arg === '--debug') {
      const val = (argv[i + 1] || 'false').toLowerCase();
      out.debug = val === 'true';
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

function dbg(label, obj) {
  if (!DEBUG) return;
  console.log(`[DEBUG] ${label}: ${JSON.stringify(obj)}`);
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

async function fetchUserQuadRow(supabase, snapshotId) {
  const { data, error } = await supabase
    .from('condition_snapshot_analyses')
    .select('measurements, created_at')
    .eq('snapshot_id', snapshotId)
    .eq('analysis_version', 'v_user_quad_v1')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    dbg('user_quad_fetch_error', { error: error.message });
    return null;
  }
  if (!data) return null;
  return data;
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

function buildEdgeMap(data, width, height) {
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const gx = data[idx + 1] - data[idx - 1];
      const gy = data[idx + width] - data[idx - width];
      edges[idx] = Math.abs(gx) + Math.abs(gy);
    }
  }
  return edges;
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

function findBoundingBoxFromMask(mask, width, height, minFrac = 0.015) {
  const rowHits = new Array(height).fill(0);
  const colHits = new Array(width).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = mask[y * width + x];
      if (v > 0) {
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

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function segmentsIntersect(a1, a2, b1, b2) {
  const cross = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = cross(a1, a2, b1);
  const d2 = cross(a1, a2, b2);
  const d3 = cross(b1, b2, a1);
  const d4 = cross(b1, b2, a2);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function selfIntersects(points) {
  const edges = [
    [points[0], points[1]],
    [points[1], points[2]],
    [points[2], points[3]],
    [points[3], points[0]],
  ];
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      // ignore adjacent edges
      if (Math.abs(i - j) === 1 || (i === 0 && j === edges.length - 1)) continue;
      if (segmentsIntersect(edges[i][0], edges[i][1], edges[j][0], edges[j][1])) return true;
    }
  }
  return false;
}

function parseUserQuad(quad) {
  if (!quad || !Array.isArray(quad.points_norm)) return { ok: false, reason: 'quad_not_found', flag: 'user_quad_invalid' };
  const pts = quad.points_norm;
  if (!Array.isArray(pts) || pts.length !== 4) return { ok: false, reason: 'quad_not_found', flag: 'user_quad_invalid' };
  const parsed = [];
  for (const p of pts) {
    if (!Array.isArray(p) || p.length !== 2) return { ok: false, reason: 'quad_not_found', flag: 'user_quad_invalid' };
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, reason: 'quad_not_found', flag: 'user_quad_invalid' };
    if (x < 0 || x > 1 || y < 0 || y > 1) return { ok: false, reason: 'quad_not_found', flag: 'user_quad_invalid' };
    parsed.push([x, y]);
  }

  if (selfIntersects(parsed)) return { ok: false, reason: 'quad_not_found', flag: 'user_quad_invalid' };

  let area = polygonArea(parsed);
  const areaNorm = Math.abs(area);
  if (areaNorm < 0.2) return { ok: false, reason: 'quad_not_found', flag: 'user_quad_invalid' };

  // enforce clockwise ordering
  let ptsClockwise = parsed;
  if (area < 0) {
    ptsClockwise = [...parsed].reverse();
    area = -area;
  }

  return { ok: true, points: ptsClockwise, areaNorm };
}

function normalizeBox(box, width, height) {
  return {
    x: box.x / width,
    y: box.y / height,
    w: box.w / width,
    h: box.h / height,
  };
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function approxEqual(a, b, epsilon) {
  return Math.abs(a - b) <= epsilon;
}

const CARD_ASPECT = 0.716; // portrait W/H
const HARD_ASPECT_MIN = 0.4;
const HARD_ASPECT_MAX = 0.9;
const SOFT_ASPECT_MIN = 0.55;
const SOFT_ASPECT_MAX = 0.85;

function evaluateQuality(faceResult) {
  const flags = [];
  const outer = faceResult?.evidence?.outer_bbox;
  const inner = faceResult?.evidence?.inner_bbox;
  const lr = faceResult?.lrRatio;
  const tb = faceResult?.tbRatio;
  const baseConfidence = clamp01(faceResult?.confidence ?? 0);
  const validity = faceResult?.validity || {};

  let gated = baseConfidence;
  let degenerate = false;
  let softHit = false;

  if (validity.inner_margin_derived) {
    flags.push('inner_margin_derived');
    degenerate = true;
  }

  // soft warn flags propagate into quality
  if (validity.collector_soft_warn) {
    flags.push('collector_soft_warn');
  }
  if (validity.touches_edge) {
    flags.push('touches_edge');
  }
  if (validity.excessive_perspective) {
    flags.push('excessive_perspective');
  }

  if (validity.isValid === false) {
    if (validity.failureReason) flags.push(validity.failureReason);
    degenerate = true;
  }

  if (outer && typeof outer.w === 'number' && typeof outer.h === 'number') {
    if (outer.w >= 0.98 && outer.h >= 0.98) {
      flags.push('outer_full_frame');
      degenerate = true;
    }
    if (outer.w < 0.5 || outer.h < 0.5) {
      flags.push('outer_too_small');
      softHit = true;
    }
  }

  if (
    inner &&
    typeof inner.x === 'number' &&
    typeof inner.y === 'number' &&
    typeof inner.w === 'number' &&
    typeof inner.h === 'number'
  ) {
    const innerMarginDerived =
      approxEqual(inner.x, 0.08, 0.005) &&
      approxEqual(inner.y, 0.08, 0.005) &&
      approxEqual(inner.w, 0.84, 0.005) &&
      approxEqual(inner.h, 0.84, 0.005);
    if (innerMarginDerived) {
      flags.push('inner_margin_derived');
      degenerate = true;
    }
    if (inner.w <= 0 || inner.h <= 0) {
      flags.push('inner_invalid');
      softHit = true;
    }
  }

  const lrValid = typeof lr === 'number' && Number.isFinite(lr);
  const tbValid = typeof tb === 'number' && Number.isFinite(tb);
  if (lrValid && tbValid) {
    const ratiosPerfect = approxEqual(lr, 0.5, 0.001) && approxEqual(tb, 0.5, 0.001);
    if (ratiosPerfect) {
      flags.push('ratios_perfect_50_50');
      degenerate = true;
    }
  } else {
    flags.push('ratios_invalid');
    softHit = true;
  }

  if (softHit) {
    gated *= 0.5;
  }

  if (degenerate) {
    gated = Math.min(gated, 0.2);
  }

  if (validity.isValid === false || faceResult?.status !== 'ok') {
    gated = Math.min(gated, 0.2);
  }

  gated = Math.max(0.05, Math.min(1, gated));
  const flagsDeduped = [...new Set(flags)];

  return {
    quality_flags: flagsDeduped,
    quality_score_0_1: baseConfidence,
    gated_confidence_0_1: gated,
    degenerate,
  };
}

function tagTierForFace(faceLabel, faceWorst) {
  if (!Number.isFinite(faceWorst)) return 'below_gem';
  if (faceLabel === 'front') {
    if (faceWorst <= 51.0) return 'pristine';
    if (faceWorst <= 55.0) return 'gem_mint';
    return 'below_gem';
  }
  // back thresholds
  if (faceWorst <= 52.0) return 'pristine';
  if (faceWorst <= 65.0) return 'gem_mint';
  return 'below_gem';
}

function overallTagTier(frontTier, backTier) {
  const rank = { pristine: 3, gem_mint: 2, below_gem: 1 };
  const frontRank = rank[frontTier] ?? 1;
  const backRank = rank[backTier] ?? 1;
  const overallRank = Math.min(frontRank, backRank);
  return Object.entries(rank).find(([, v]) => v === overallRank)?.[0] ?? 'below_gem';
}

function bgsBucket(frontWorst, backWorst) {
  if (Number.isFinite(frontWorst) && Number.isFinite(backWorst)) {
    if (frontWorst <= 50.0 && backWorst <= 55.0) return 'black_label_like';
    if (frontWorst <= 55.0 && backWorst <= 70.0) return 'bgs10ish';
    if (frontWorst <= 60.0 && backWorst <= 80.0) return 'bgs9ish';
    if (frontWorst <= 65.0 && backWorst <= 90.0) return 'bgs8ish';
  }
  return 'below';
}

async function processFace(buffer, faceLabel, userQuad = null) {
  dbg(`${faceLabel}_init`, { buffer_len: buffer.length });

  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch (err) {
    dbg(`${faceLabel}_fail_meta`, { reason: 'image_decode_failed', error: err.message });
    return {
      status: 'failed',
      failure_reason: 'image_decode_failed',
      confidence: 0.05,
      evidence: {},
      validity: { isValid: false, failureReason: 'image_decode_failed' },
    };
  }

  dbg(`${faceLabel}_meta`, { width: meta.width ?? null, height: meta.height ?? null, format: meta.format ?? null });

  if (!meta?.width || !meta?.height) {
    dbg(`${faceLabel}_fail_meta_empty`, { reason: 'image_decode_failed' });
    return {
      status: 'failed',
      failure_reason: 'image_decode_failed',
      confidence: 0.05,
      evidence: {},
      validity: { isValid: false, failureReason: 'image_decode_failed' },
    };
  }

  const resized = await sharp(buffer)
    .resize({ width: 900, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const width = info.width;
  const height = info.height;
  const edgeMarginPx = Math.max(8, Math.floor(Math.min(width, height) * 0.01));

  let outer = null;
  let edgeStats = null;
  let edgeThreshold = null;
  let outerNorm = null;
  let areaNorm = null;
  let touchesEdge = false;
  let fullFrame = false;
  let tooSmall = false;
  let excessivePerspective = false;
  let failureReason = null;
  let softWarn = false;
  const validity = {};
  let quadSource = 'auto';

  if (userQuad) {
    const parsed = parseUserQuad(userQuad);
    if (parsed.ok) {
      quadSource = userQuad.source === 'user' ? 'user' : 'override';
      const points = parsed.points;
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const minX = Math.min(...xs) * width;
      const maxX = Math.max(...xs) * width;
      const minY = Math.min(...ys) * height;
      const maxY = Math.max(...ys) * height;
      outer = {
        x: Math.max(0, Math.floor(minX)),
        y: Math.max(0, Math.floor(minY)),
        w: Math.max(1, Math.floor(maxX - minX)),
        h: Math.max(1, Math.floor(maxY - minY)),
      };
      outerNorm = normalizeBox(outer, width, height);
      areaNorm = parsed.areaNorm;
      touchesEdge =
        outer.x <= edgeMarginPx ||
        outer.y <= edgeMarginPx ||
        outer.x + outer.w >= width - edgeMarginPx ||
        outer.y + outer.h >= height - edgeMarginPx;
      fullFrame = outerNorm.w >= 0.98 && outerNorm.h >= 0.98;
      tooSmall = areaNorm < 0.2;
      const aspectRaw = outer.h > 0 ? outer.w / outer.h : 0;
      const aspectNorm = aspectRaw >= 1 ? 1 / aspectRaw : aspectRaw;
      excessivePerspective = aspectNorm < HARD_ASPECT_MIN || aspectNorm > HARD_ASPECT_MAX;
      validity.user_quad = true;
      validity.area_norm = areaNorm;
      validity.outer_bbox_norm = outerNorm;
      validity.touches_edge = touchesEdge;
      validity.excessive_perspective = excessivePerspective;
      validity.edge_margin_px = edgeMarginPx;
      validity.aspect_raw = aspectRaw;
      validity.aspect_norm = aspectNorm;
      if (DEBUG) {
        dbg(`quad_source_${faceLabel}`, { source: quadSource, first_point: points[0], updated_at: userQuad.updated_at ?? null });
      }
    } else {
      failureReason = parsed.reason || 'quad_not_found';
      validity.user_quad_invalid = true;
      validity.failureReason = failureReason;
    }
  }

  if (!outer && !failureReason) {
    const edgeMap = buildEdgeMap(data, width, height);
    edgeStats = stats(edgeMap);
    edgeThreshold = Math.max(0, edgeStats.mean + edgeStats.std * 0.6);
    const edgeMask = new Uint8Array(edgeMap.length);
    for (let i = 0; i < edgeMap.length; i += 1) {
      if (edgeMap[i] > edgeThreshold) edgeMask[i] = 1;
    }

    outer = findBoundingBoxFromMask(edgeMask, width, height, 0.02);
    quadSource = 'auto';
  }

  if (!outer || failureReason) {
    dbg(`${faceLabel}_fail_outer`, {
      reason: failureReason || 'quad_not_found',
      edge_threshold: edgeThreshold,
      edge_stats: edgeStats ? { mean: edgeStats.mean, std: edgeStats.std } : null,
      flags: validity,
    });
    return {
      status: 'failed',
      failure_reason: failureReason || 'quad_not_found',
      confidence: 0.1,
      evidence: {},
      validity: { isValid: false, failureReason: failureReason || 'quad_not_found', ...validity },
    };
  }

  if (!outerNorm) outerNorm = normalizeBox(outer, width, height);
  if (areaNorm === null) areaNorm = (outer.w * outer.h) / (width * height);
  if (touchesEdge === false) {
    touchesEdge =
      outer.x <= edgeMarginPx ||
      outer.y <= edgeMarginPx ||
      outer.x + outer.w >= width - edgeMarginPx ||
      outer.y + outer.h >= height - edgeMarginPx;
  }
  fullFrame = fullFrame || (outerNorm.w >= 0.98 && outerNorm.h >= 0.98);
  tooSmall = tooSmall || areaNorm < 0.2;
  const aspectRaw = outer.h > 0 ? outer.w / outer.h : 0;
  const aspectNorm = aspectRaw >= 1 ? 1 / aspectRaw : aspectRaw;
  const hardAspectBad = aspectNorm < HARD_ASPECT_MIN || aspectNorm > HARD_ASPECT_MAX;
  const softAspectBad = aspectNorm < SOFT_ASPECT_MIN || aspectNorm > SOFT_ASPECT_MAX;
  const hardEdgeClip = touchesEdge && (outerNorm.w < 0.85 || outerNorm.h < 0.85);
  excessivePerspective = hardAspectBad;

  if (fullFrame) failureReason = 'border_not_detected';
  else if (tooSmall) failureReason = 'quad_too_small';
  else if (hardAspectBad) failureReason = 'excessive_perspective';
  else if (hardEdgeClip) failureReason = 'quad_out_of_frame';

  if (!failureReason) {
    if (softAspectBad && !hardAspectBad) softWarn = true;
    if (touchesEdge && !hardEdgeClip) softWarn = true;
  }

  validity.isValid = !failureReason;
  validity.collector_soft_warn = softWarn;
  validity.collector_usable = validity.isValid || softWarn;
  validity.failureReason = failureReason;
  validity.area_norm = areaNorm;
  validity.touches_edge = touchesEdge;
  validity.outer_bbox_norm = outerNorm;
  validity.excessive_perspective = hardAspectBad || softAspectBad;
  validity.quad_source = quadSource;
  validity.edge_margin_px = edgeMarginPx;
  validity.aspect_raw = aspectRaw;
  validity.aspect_norm = aspectNorm;

  dbg(`quad_source_${faceLabel}`, quadSource);

  if (failureReason) {
    dbg(`${faceLabel}_outer_invalid`, {
      failureReason,
      outer_bbox_px: outer,
      outer_bbox_norm: outerNorm,
      area_norm: areaNorm,
      touches_edge: touchesEdge,
      excessivePerspective,
      edge_margin_px: edgeMarginPx,
      aspect_raw: aspectRaw,
      aspect_norm: aspectNorm,
    });
    return {
      status: 'failed',
      failure_reason: failureReason,
      confidence: 0.1,
      evidence: { outer_bbox: outerNorm },
      validity,
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
  let innerBoxLocal = findBox(crop.data, crop.info.width, crop.info.height, thresholdInner, 0.05);
  let innerMarginDerived = false;

  if (!innerBoxLocal) {
    innerMarginDerived = true;
    innerBoxLocal = {
      x: marginX,
      y: marginY,
      w: innerW,
      h: innerH,
    };
  }

  const inner = {
    x: innerX0 + innerBoxLocal.x,
    y: innerY0 + innerBoxLocal.y,
    w: innerBoxLocal.w,
    h: innerBoxLocal.h,
  };

  validity.inner_margin_derived = innerMarginDerived;

  dbg(`${faceLabel}_outer_box`, {
    edge_threshold: edgeThreshold,
    outer_bbox_px: outer,
    outer_bbox_norm: outerNorm,
    stats: { mean: edgeStats.mean, std: edgeStats.std },
    area_norm: areaNorm,
    touches_edge: touchesEdge,
    excessivePerspective,
    edge_margin_px: edgeMarginPx,
    aspect_raw: aspectRaw,
    aspect_norm: aspectNorm,
  });

  dbg(`${faceLabel}_inner_box`, {
    thresholdInner,
    inner_bbox_px: inner,
    inner_bbox_norm: normalizeBox(inner, width, height),
    margins_px: { marginX, marginY },
    margin_pct: 0.08,
    inner_stats: { mean: innerStats.mean, std: innerStats.std },
    inner_margin_derived: innerMarginDerived,
  });

  const left = inner.x - outer.x;
  const right = outer.x + outer.w - (inner.x + inner.w);
  const top = inner.y - outer.y;
  const bottom = outer.y + outer.h - (inner.y + inner.h);

  const lrRatio = left + right > 0 ? left / (left + right) : null;
  const tbRatio = top + bottom > 0 ? top / (top + bottom) : null;

  dbg(`${faceLabel}_ratios`, {
    lr_ratio: lrRatio,
    tb_ratio: tbRatio,
    raw: { left, right, top, bottom },
  });

  let confidence = 0.9;
  const minDim = Math.min(width, height);
  if (minDim < 400) confidence -= 0.2;
  if (areaNorm < 0.35) confidence -= 0.15;
  if (touchesEdge) confidence -= 0.15;
  if (innerMarginDerived) confidence -= 0.1;
  confidence = Math.max(0.05, Math.min(1, confidence));
  if (softWarn && !failureReason) {
    confidence = Math.min(confidence, 0.35);
  }

  dbg(`${faceLabel}_confidence`, { confidence, min_dim: minDim, area_norm: areaNorm, touches_edge: touchesEdge, inner_margin_derived: innerMarginDerived });

  const methodName = quadSource === 'user' ? 'centering_v3_quad_user' : 'centering_v3_quad';

  return {
    status: 'ok',
    failure_reason: null,
    confidence,
    lrRatio,
    tbRatio,
    raw: { left, right, top, bottom, width_px: width, height_px: height },
    evidence: {
      outer_bbox: outerNorm,
      inner_bbox: normalizeBox(inner, width, height),
      method: methodName,
      notes: quadSource === 'user' ? ['user_quad_v1'] : [],
    },
    validity,
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
  DEBUG = !!args.debug;

  const supabase = createBackendClient();
  const started = Date.now();
  const runId = crypto.randomUUID();
  const runTs = new Date().toISOString();

  dbg('start', {
    snapshot_id: snapshotId,
    analysis_version: analysisVersion,
    dry_run: dryRun,
    debug: DEBUG,
    run_id: runId,
    run_ts: runTs,
  });

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
  const keyMaterial = JSON.stringify({
    snapshot_id: snapshotId,
    analysis_version: analysisVersion,
    run_id: runId,
    run_ts: runTs,
    key_version: 2,
  });
  const analysisKey = sha256Hex(keyMaterial);
  dbg('analysis_key_run', { runId, runTs, analysis_key: analysisKey });

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

  const userQuadRow = await fetchUserQuadRow(supabase, snapshotId);
  const userQuadMeasurements = userQuadRow?.measurements || {};
  const userQuadV1 = userQuadMeasurements?.user_quad_v1 || {};
  const userQuadFront =
    userQuadV1.front ??
    images?.ai_overrides?.quad_v1?.front ??
    null;
  const userQuadBack =
    userQuadV1.back ??
    images?.ai_overrides?.quad_v1?.back ??
    null;

  dbg('user_quad_row_found', { found: !!userQuadRow });

  const frontResult = await processFace(frontDl.data, 'front', userQuadFront);
  const backResult = await processFace(backDl.data, 'back', userQuadBack);

  const frontIsValid = frontResult.validity?.isValid ?? frontResult.status === 'ok';
  const backIsValid = backResult.validity?.isValid ?? backResult.status === 'ok';
  const frontSoftWarn = frontResult.validity?.collector_soft_warn ?? false;
  const backSoftWarn = backResult.validity?.collector_soft_warn ?? false;
  const frontInvalidReason = !frontIsValid ? (frontResult.validity?.failureReason || frontResult.failure_reason || null) : null;
  const backInvalidReason = !backIsValid ? (backResult.validity?.failureReason || backResult.failure_reason || null) : null;
  const overallValid = frontIsValid && backIsValid;
  const overallCollectorUsable =
    (frontResult.validity?.collector_usable ?? frontIsValid) &&
    (backResult.validity?.collector_usable ?? backIsValid);
  const overallSoftWarn = frontSoftWarn || backSoftWarn;

  const successes = [frontResult, backResult].filter((r) => r.status === 'ok').length;
  let analysisStatus = overallValid ? 'ok' : 'failed';
  if (analysisStatus === 'ok' && successes === 1) analysisStatus = 'partial';

  const failureReason =
    analysisStatus === 'ok'
      ? null
      : (frontInvalidReason || backInvalidReason || frontResult.failure_reason || backResult.failure_reason || 'unknown');

  const frontQuality = evaluateQuality(frontResult);
  const backQuality = evaluateQuality(backResult);

  const baseConfidence = Math.max(0.05, Math.min(frontResult.confidence || 0, backResult.confidence || 0));
  let confidence = Math.max(0.05, Math.min(frontQuality.gated_confidence_0_1, backQuality.gated_confidence_0_1));

  if (!overallValid) {
    confidence = Math.min(confidence, 0.2);
  }

  const lrValid = (v) => typeof v === 'number' && Number.isFinite(v);
  const makeFaceMetrics = (label, result, quality) => {
    const lr = lrValid(result.lrRatio) ? result.lrRatio : null;
    const tb = lrValid(result.tbRatio) ? result.tbRatio : null;
    const lrPct = lr === null ? { left: null, right: null } : { left: round1(lr * 100), right: round1((1 - lr) * 100) };
    const tbPct = tb === null ? { top: null, bottom: null } : { top: round1(tb * 100), bottom: round1((1 - tb) * 100) };
    const faceWorstLR = lr === null ? null : Math.max(lrPct.left, lrPct.right);
    const faceWorstTB = tb === null ? null : Math.max(tbPct.top, tbPct.bottom);
    const candidates = [faceWorstLR, faceWorstTB].filter((n) => Number.isFinite(n));
    const faceWorst = candidates.length ? Math.max(...candidates) : null;
    const isValid = result.validity?.isValid ?? result.status === 'ok';
    const invalidReason = !isValid ? (result.validity?.failureReason || result.failure_reason || null) : null;
    const tagTierBase = tagTierForFace(label, faceWorst ?? NaN);
    const tagTier = isValid ? tagTierBase : 'below_gem';
    return {
      lr_pct: lrPct,
      tb_pct: tbPct,
      face_worst: faceWorst,
      tag_tier: tagTier,
      quality_flags: quality.quality_flags,
      quality_score_0_1: quality.quality_score_0_1,
      gated_confidence_0_1: quality.gated_confidence_0_1,
      confidence_0_1: quality.gated_confidence_0_1,
      is_valid: isValid,
      invalid_reasons: isValid ? [] : [invalidReason].filter(Boolean),
      collector_usable: result.validity?.collector_usable ?? isValid,
      aspect_raw: result.validity?.aspect_raw ?? null,
      aspect_norm: result.validity?.aspect_norm ?? null,
      edge_margin_px: result.validity?.edge_margin_px ?? null,
      touches_edge: result.validity?.touches_edge ?? null,
    };
  };

  const frontV3 = makeFaceMetrics('front', frontResult, frontQuality);
  const backV3 = makeFaceMetrics('back', backResult, backQuality);

  const frontWorst = Number.isFinite(frontV3.face_worst) ? frontV3.face_worst : Number.POSITIVE_INFINITY;
  const backWorst = Number.isFinite(backV3.face_worst) ? backV3.face_worst : Number.POSITIVE_INFINITY;

  let overallTag = overallTagTier(frontV3.tag_tier, backV3.tag_tier);
  let bgs = bgsBucket(frontWorst, backWorst);
  const overallInvalidReasons = [...(frontV3.invalid_reasons || []), ...(backV3.invalid_reasons || [])].filter(Boolean);
  if (!overallValid) {
    overallTag = 'below_gem';
    bgs = 'below';
  }
  const worstFace = frontWorst >= backWorst ? 'front' : 'back';

  const centeringV2 = {
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
      method: frontResult.evidence?.method || backResult.evidence?.method || 'centering_v3_quad',
      notes: [],
    },
    analysis_status: analysisStatus,
    failure_reason: failureReason,
  };

  const centeringV3 = {
    version: 3,
    front: frontV3,
    back: backV3,
    overall: {
      is_valid: overallValid,
      collector_usable: overallCollectorUsable,
      collector_soft_warn: overallSoftWarn,
      tag_tier: overallTag,
      bgs_report_bucket: bgs,
      front_worst: Number.isFinite(frontV3.face_worst) ? frontV3.face_worst : null,
      back_worst: Number.isFinite(backV3.face_worst) ? backV3.face_worst : null,
      worst_face: Number.isFinite(frontV3.face_worst) || Number.isFinite(backV3.face_worst) ? worstFace : null,
      confidence_0_1: confidence,
      invalid_reasons: overallValid ? [] : Array.from(new Set(overallInvalidReasons)),
    },
  };

  let measurements = {
    version: 2,
    centering: centeringV2,
    centering_v3: centeringV3,
  };

  dbg('v3_validity_front', {
    is_valid: frontIsValid,
    reason: frontInvalidReason,
    outer_bbox_norm: frontResult.evidence?.outer_bbox ?? null,
    area_norm: frontResult.validity?.area_norm ?? null,
    touches_edge: frontResult.validity?.touches_edge ?? null,
  });

  dbg('v3_validity_back', {
    is_valid: backIsValid,
    reason: backInvalidReason,
    outer_bbox_norm: backResult.evidence?.outer_bbox ?? null,
    area_norm: backResult.validity?.area_norm ?? null,
    touches_edge: backResult.validity?.touches_edge ?? null,
  });

  dbg('v3_invalid_summary', {
    overall_is_valid: overallValid,
    failure_reason: failureReason,
    confidence_final: confidence,
    soft_warn_front: frontSoftWarn,
    soft_warn_back: backSoftWarn,
    hard_failure_front: frontInvalidReason,
    hard_failure_back: backInvalidReason,
  });

  dbg('centering_v3_summary', {
    front_worst: frontV3.face_worst,
    back_worst: backV3.face_worst,
    tag_tiers: { front: frontV3.tag_tier, back: backV3.tag_tier, overall: overallTag },
    bgs_bucket: bgs,
    quality_flags: { front: frontQuality.quality_flags, back: backQuality.quality_flags },
    base_confidence: baseConfidence,
    front_gated_confidence: frontQuality.gated_confidence_0_1,
    back_gated_confidence: backQuality.gated_confidence_0_1,
    final_confidence: confidence,
  });

  const scanNotes = ['centering-only'];
  if (overallSoftWarn) scanNotes.push('collector-soft-warn');

  const scanQuality = {
    version: 1,
  };

  if (failureReason) {
    scanQuality.ok = analysisStatus === 'ok' || analysisStatus === 'partial';
    scanQuality.analysis_status = analysisStatus;
    scanQuality.failure_reason = failureReason;
  } else if (overallSoftWarn) {
    scanQuality.ok = true;
    scanQuality.analysis_status = 'ok';
    scanQuality.failure_reason = null;
  } else {
    scanQuality.ok = analysisStatus === 'ok' || analysisStatus === 'partial';
    scanQuality.analysis_status = analysisStatus;
    scanQuality.failure_reason = null;
  }

  scanQuality.notes = scanNotes;

  dbg('centering_v3_soft_context', {
    edge_margin_front: frontResult.validity?.edge_margin_px ?? null,
    edge_margin_back: backResult.validity?.edge_margin_px ?? null,
    front_soft_warn: frontSoftWarn,
    back_soft_warn: backSoftWarn,
    overall_soft_warn: overallSoftWarn,
  });

  // HARD GUARANTEE: centering_v3 must exist in payload
  if (!measurements || typeof measurements !== 'object') measurements = { version: 2 };
  if (!('centering_v3' in measurements)) {
    measurements.centering_v3 = centeringV3;
  }
  if (!('centering' in measurements)) {
    measurements.centering = centeringV2;
  }

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

  dbg('analysis_summary', {
    snapshot_id: snapshotId,
    analysis_version: analysisVersion,
    analysis_key: analysisKey,
    front_status: frontResult.status,
    back_status: backResult.status,
    analysis_status: analysisStatus,
    base_confidence: baseConfidence,
    final_confidence: confidence,
    will_call_rpc: !dryRun,
  });
  dbg('payload_keys', {
    has_centering: !!measurements?.centering,
    has_centering_v3: !!measurements?.centering_v3,
    method: frontResult.evidence?.method || backResult.evidence?.method || null,
    status: analysisStatus,
    confidence,
  });

  if (dryRun) {
    logStatus('dry_run', { snapshotId, analysisVersion, analysisKey, analysis_status: analysisStatus });
    dbg('dry_run_skip', { message: 'dry_run=true -> skipping supabase.rpc' });
    const preview = {
      snapshot_id: snapshotId,
      analysis_version: analysisVersion,
      analysis_key: analysisKey,
      confidence,
      measurements_keys: Object.keys(measurements),
      defects_keys: Object.keys(payload.defects),
      scan_quality_keys: Object.keys(scanQuality),
      analysis_status: analysisStatus,
      failure_reason: failureReason,
      dry_run: true,
    };
    console.log(JSON.stringify(preview, null, 2));
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
