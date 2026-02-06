// fingerprint_worker_v1.mjs
// Usage:
//   node backend/condition/fingerprint_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1_fingerprint] [--dry-run true|false] [--debug true|false] [--emit-result-json true|false]

import '../env.mjs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { detectOuterBorderAI, warpCardQuadAI } from './ai_border_detector_client.mjs';
import { computeDHash64, computePHash64, hamming64 } from './fingerprint_hashes_v1.mjs';
import { scoreMatch, decisionFromScore } from './fingerprint_match_v1.mjs';
import { deriveFingerprintKeyV1 } from './fingerprint_key_v1.mjs';
import pg from 'pg';

const { Pool } = pg;
const pgPool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

const AI_BORDER_TIMEOUT_MS = 6000;

function parseArgs(argv) {
  const out = {
    snapshotId: null,
    analysisVersion: 'v1_fingerprint',
    dryRun: true,
    debug: false,
    emitResultJson: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot-id') {
      out.snapshotId = argv[i + 1] || null;
      i += 1;
    } else if (arg === '--analysis-version') {
      out.analysisVersion = argv[i + 1] || 'v1_fingerprint';
      i += 1;
    } else if (arg === '--dry-run') {
      const val = (argv[i + 1] || 'true').toLowerCase();
      out.dryRun = val === 'true';
      i += 1;
    } else if (arg === '--debug') {
      const val = (argv[i + 1] || 'false').toLowerCase();
      out.debug = val === 'true';
      i += 1;
    } else if (arg === '--emit-result-json') {
      const val = (argv[i + 1] || 'false').toLowerCase();
      out.emitResultJson = val === 'true';
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

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function pickWarpToken(face) {
  const sanitize = (val) => (val || '').toLowerCase().replace(/\s+/g, '_').slice(0, 64) || 'warp_failed';
  const flags = Array.isArray(face?.flags) ? face.flags : [];
  const tokens = flags.filter((f) => typeof f === 'string').map((f) => sanitize(f.trim()));
  const httpToken = tokens.find((t) => /^ai_warp_http_\d{3}$/.test(t));
  if (httpToken) return httpToken;
  const aiWarp = tokens.find((t) => t.startsWith('ai_warp_') && t !== 'ai_warp_http_error');
  if (aiWarp) return aiWarp;
  if (tokens.includes('ai_warp_http_error')) return 'ai_warp_http_error';
  const warpSpecific = tokens.find((t) => t.startsWith('warp_') && t !== 'warp_failed' && t !== 'warp_ok');
  if (warpSpecific) return warpSpecific;
  if (tokens.includes('warp_unknown')) return 'warp_unknown';
  return 'warp_failed';
}

async function recordFailure({
  supabase,
  snap,
  snapshotId,
  analysisVersion,
  analysisKey,
  error_code,
  error_detail,
  attempted_snapshot_id = null,
}) {
  if (!supabase || !snapshotId || !analysisVersion || !analysisKey) return;
  try {
    const { data: existing, error: selectErr } = await supabase
      .from('condition_analysis_failures')
      .select('id')
      .eq('snapshot_id', snapshotId)
      .eq('analysis_version', analysisVersion)
      .eq('analysis_key', analysisKey)
      .limit(1)
      .maybeSingle();
    if (selectErr) {
      console.warn(`[fingerprint][failure] select_failed analysis_key=${analysisKey} detail=${selectErr.message}`);
      return;
    }
    if (existing) return;
    const payload = {
      snapshot_id: snapshotId,
      user_id: snap?.user_id ?? null,
      analysis_version: analysisVersion,
      analysis_key: analysisKey,
      error_code,
      error_detail,
      attempted_snapshot_id: attempted_snapshot_id || null,
    };
    const { error: insertErr } = await supabase.from('condition_analysis_failures').insert(payload);
    if (insertErr && !String(insertErr.message || '').toLowerCase().includes('duplicate key')) {
      console.warn(`[fingerprint][failure] insert_failed analysis_key=${analysisKey} detail=${insertErr.message}`);
    }
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn(`[fingerprint][failure] exception analysis_key=${analysisKey} detail=${msg}`);
  }
}

async function downloadImage(supabase, bucket, path) {
  const targetBucket = typeof path === 'object' && path !== null && path.bucket ? path.bucket : bucket;
  const targetPath = typeof path === 'object' && path !== null && path.path ? path.path : path;

  const { data: signedUrlData, error: signErr } = await supabase.storage
    .from(targetBucket)
    .createSignedUrl(targetPath, 60);
  if (signErr || !signedUrlData?.signedUrl) {
    return { error: new Error(`signed_url_failed:${signErr?.message || 'unknown'}`) };
  }

  logStatus('image_download', {
    image_download_source: 'signed_url',
    bucket: targetBucket,
    path: targetPath,
  });

  const res = await fetch(signedUrlData.signedUrl);
  if (!res.ok) {
    return { error: new Error(`signed_url_fetch_failed:${res.status}`) };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf };
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

function selfIntersects(points) {
  const segs = [
    [points[0], points[1]],
    [points[1], points[2]],
    [points[2], points[3]],
    [points[3], points[0]],
  ];
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  for (let i = 0; i < segs.length; i += 1) {
    for (let j = i + 1; j < segs.length; j += 1) {
      if (Math.abs(i - j) === 1 || (i === 0 && j === segs.length - 1)) continue;
      const [a1, a2] = segs[i];
      const [b1, b2] = segs[j];
      const d1 = cross(a1, a2, b1);
      const d2 = cross(a1, a2, b2);
      const d3 = cross(b1, b2, a1);
      const d4 = cross(b1, b2, a2);
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
      }
    }
  }
  return false;
}

function validateQuad(quadAbs, imgW, imgH, { aiNotes = [] } = {}) {
  const flags = [];
  if (!Array.isArray(quadAbs) || quadAbs.length !== 4) {
    flags.push('quad_invalid_point_count');
    return { ok: false, flags };
  }
  for (const p of quadAbs) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      flags.push('quad_non_finite');
      return { ok: false, flags };
    }
    if (p.x < 0 || p.x > imgW || p.y < 0 || p.y > imgH) {
      flags.push('quad_out_of_bounds');
      return { ok: false, flags };
    }
  }
  if (selfIntersects(quadAbs)) {
    flags.push('quad_self_intersect');
    return { ok: false, flags };
  }
  const area = polygonArea(quadAbs);
  const areaNorm = area / (imgW * imgH);
  if (!Number.isFinite(areaNorm) || areaNorm < 0.2) {
    flags.push('quad_area_too_small');
    return { ok: false, flags, areaNorm };
  }
  const xs = quadAbs.map((p) => p.x);
  const ys = quadAbs.map((p) => p.y);
  const wPx = Math.max(...xs) - Math.min(...xs);
  const hPx = Math.max(...ys) - Math.min(...ys);
  const wNorm = wPx / imgW;
  const hNorm = hPx / imgH;
  const aspect = wPx > 0 && hPx > 0 ? wPx / hPx : 0;
  if (process.env.GV_DEBUG === '1' || globalThis.FP_DEBUG) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        event: 'validate_quad_debug',
        imgW,
        imgH,
        xs_min: Math.min(...xs),
        xs_max: Math.max(...xs),
        ys_min: Math.min(...ys),
        ys_max: Math.max(...ys),
        wPx,
        hPx,
        wNorm,
        hNorm,
        aspect,
        quadAbs,
      }),
    );
  }
  const bounds = { min: 0.4, max: 0.9 };
  let aspectDecision = 'ok';
  let aspectFlipped = null;
  if (!Number.isFinite(aspect) || aspect < bounds.min || aspect > bounds.max) {
    aspectFlipped = aspect > 0 ? 1 / aspect : null;
    const aspectFlippedOk = aspectFlipped && aspectFlipped >= bounds.min && aspectFlipped <= bounds.max;
    const centerSeed = aiNotes.some((n) => typeof n === 'string' && n.includes('center_seed_bbox'));
    if (aspectFlippedOk) {
      flags.push('quad_aspect_flipped_ok');
      aspectDecision = 'flipped_ok';
    } else if (centerSeed) {
      flags.push('quad_aspect_soft_fail');
      aspectDecision = 'soft_ok';
    } else {
      flags.push('quad_aspect_out_of_range');
      return { ok: false, flags, areaNorm, aspect, aspect_flipped: aspectFlipped, aspect_bounds: bounds, aspect_decision: 'hard_fail', ai_notes: aiNotes.slice(0, 5) };
    }
  }
  return { ok: true, flags, areaNorm, aspect, aspect_flipped: aspectFlipped, aspect_bounds: bounds, aspect_decision: aspectDecision, ai_notes: aiNotes.slice(0, 5) };
}

function normToAbs(norm, imageW, imageH) {
  return norm.map(([x, y]) => ({
    x: (Number(x) || 0) * imageW,
    y: (Number(y) || 0) * imageH,
  }));
}

async function processFace({ buffer, faceLabel }) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const flags = [];
  if (width <= 0 || height <= 0) {
    return { status: 'failed', flags: [...flags, 'invalid_dimensions'], quadValid: false };
  }

  const ai = await detectOuterBorderAI({ imageBuffer: buffer, timeoutMs: AI_BORDER_TIMEOUT_MS });
  if (!ai?.ok || !Array.isArray(ai.polygon_norm)) {
    flags.push('ai_border_failed');
    if (ai?.error) flags.push(ai.error);
    if (Array.isArray(ai?.notes)) flags.push(...ai.notes.slice(0, 5));
    return {
      status: 'failed',
      flags,
      quadValid: false,
      quadSource: null,
      aspectDebug: null,
      normalized: null,
    };
  }

  const quadAbs = normToAbs(ai.polygon_norm, width, height);
  const validation = validateQuad(quadAbs, width, height, { aiNotes: ai.notes || [] });
  const aspectDiag =
    validation.flags && validation.flags.includes('quad_aspect_out_of_range')
      ? {
          face: faceLabel,
          image_w: width,
          image_h: height,
          quad_points: ai.polygon_norm || [],
          ai_confidence: ai?.confidence ?? null,
          ai_notes: ai?.notes || [],
        }
      : null;
  if (!validation.ok) {
    return {
      status: 'failed',
      flags: [...flags, ...validation.flags],
      quadValid: false,
      quadSource: 'ai_border',
      aspectDebug: {
        aspect_norm: validation.aspect ?? null,
        aspect_flipped: validation.aspect_flipped ?? null,
        aspect_bounds: validation.aspect_bounds ?? null,
        aspect_decision: validation.aspect_decision ?? null,
        ai_notes: validation.ai_notes ?? null,
      },
      aspectDiag,
    };
  }

  const warpRes = await warpCardQuadAI({
    imageBuffer: buffer,
    quadNorm: ai.polygon_norm,
    outW: 1024,
    outH: 1428,
    timeoutMs: AI_BORDER_TIMEOUT_MS + 2000,
  });
  if (!warpRes.ok || !warpRes.imageBuffer) {
    const httpNote = Array.isArray(warpRes.notes)
      ? warpRes.notes.find((n) => typeof n === 'string' && /^http_\d{3}$/i.test(n))
      : null;
    return {
      status: 'failed',
      flags: [
        ...flags,
        'warp_failed',
        warpRes.error || 'warp_unknown',
        ...(httpNote ? [`ai_warp_${httpNote.toLowerCase()}`] : []),
      ],
      quadValid: true,
      quadSource: 'ai_border',
      areaNorm: validation.areaNorm,
      aspectNorm: validation.aspect,
      aspectDebug: {
        aspect_norm: validation.aspect ?? null,
        aspect_flipped: validation.aspect_flipped ?? null,
        aspect_bounds: validation.aspect_bounds ?? null,
        aspect_decision: validation.aspect_decision ?? null,
        ai_notes: validation.ai_notes ?? null,
      },
      normalized: null,
    };
  }

  if (globalThis.FP_DEBUG) {
    logStatus('ai_warp_debug', {
      face: faceLabel,
      ok: warpRes.ok,
      error: warpRes.error || null,
      notes_count: Array.isArray(warpRes.notes) ? warpRes.notes.length : 0,
    });
  }

  return {
    status: 'ok',
    flags: [...flags, ...(warpRes.notes || []), 'warp_ok'],
    quadValid: true,
    quadSource: 'ai_border',
    areaNorm: validation.areaNorm,
    aspectNorm: validation.aspect,
    aspectDebug: {
      aspect_norm: validation.aspect ?? null,
      aspect_flipped: validation.aspect_flipped ?? null,
      aspect_bounds: validation.aspect_bounds ?? null,
      aspect_decision: validation.aspect_decision ?? null,
      ai_notes: validation.ai_notes ?? null,
    },
    normalized: warpRes.imageBuffer,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.snapshotId) {
    console.log('Usage: node backend/condition/fingerprint_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1_fingerprint] [--dry-run true|false] [--debug true|false] [--emit-result-json true|false]');
    process.exit(1);
  }
  const snapshotId = args.snapshotId.trim();
  const analysisVersion = (args.analysisVersion || 'v1_fingerprint').trim();
  const dryRun = !!args.dryRun;
  const emitResultJson = !!args.emitResultJson;
  const DEBUG = !!args.debug;
  if (globalThis.FP_DEBUG) {
    globalThis.FP_DEBUG = true;
  }

  const analysisKey = sha256Hex(`${snapshotId}::${analysisVersion}::fingerprint_v1`);
  const supabase = createBackendClient();
  const started = Date.now();
  let snap = null;

  try {
    if (!process.env.SUPABASE_DB_URL) {
      throw new Error('SNAPSHOT_READ_FAILED (admin_condition_snapshots_read_v1_db): missing SUPABASE_DB_URL');
    }

    try {
      const res = await pgPool.query(
        'select * from public.admin_condition_snapshots_read_v1($1)',
        [snapshotId],
      );
      snap = res.rows[0] ?? null;
    } catch (err) {
      throw new Error(`SNAPSHOT_READ_FAILED (admin_condition_snapshots_read_v1_db): ${err.message}`);
    }

    if (!snap) {
      const e = new Error('Snapshot not found');
      e.code = 'SNAPSHOT_NOT_FOUND';
      throw e;
    }

    logStatus('snapshot_read', { snapshotId, snapshot_read_source: 'admin_condition_snapshots_read_v1_db', vault_item_id: snap.vault_item_id });

    if (!snap) {
      const reason = 'SNAPSHOT_NOT_FOUND';
      const detail = 'Snapshot not found';
      logStatus('error', { snapshotId, analysisVersion, reason, detail });
      if (!dryRun) {
        await supabase.rpc('admin_condition_assist_insert_failure_v1', {
          p_snapshot_id: null,
          p_attempted_snapshot_id: snapshotId,
          p_analysis_version: analysisVersion,
          p_analysis_key: null,
          p_error_code: reason,
          p_error_detail: detail,
        });
      }
      process.exit(1);
    }

  const bucket = snap.images?.bucket ?? 'condition-scans';
  const frontPath = snap.images?.paths?.front ?? snap.images?.front?.path ?? snap.images?.front;
  const backPath = snap.images?.paths?.back ?? snap.images?.back?.path ?? snap.images?.back;

  if (typeof frontPath !== 'string' || typeof backPath !== 'string') {
    logStatus('invalid_images', { snapshotId, analysisVersion, reason: 'front/back missing' });
    await recordFailure({
      supabase,
      snap,
      snapshotId,
      analysisVersion,
      analysisKey,
      error_code: 'invalid_images',
      error_detail: 'invalid_images: front/back missing',
      attempted_snapshot_id: snapshotId,
    });
    process.exit(1);
  }

  const frontDl = await downloadImage(supabase, bucket, frontPath);
  if (frontDl.error) {
    logStatus('download_failed', { snapshotId, path: frontPath, detail: frontDl.error.message });
    await recordFailure({
      supabase,
      snap,
      snapshotId,
      analysisVersion,
      analysisKey,
      error_code: 'image_download_failed',
      error_detail: `image_download_failed: ${frontDl.error.message}`,
      attempted_snapshot_id: snapshotId,
    });
    process.exit(1);
  }
  const backDl = await downloadImage(supabase, bucket, backPath);
  if (backDl.error) {
    logStatus('download_failed', { snapshotId, path: backPath, detail: backDl.error.message });
    await recordFailure({
      supabase,
      snap,
      snapshotId,
      analysisVersion,
      analysisKey,
      error_code: 'image_download_failed',
      error_detail: `image_download_failed: ${backDl.error.message}`,
      attempted_snapshot_id: snapshotId,
    });
    process.exit(1);
  }

  const front = await processFace({ buffer: frontDl.data, faceLabel: 'front' });
  const back = await processFace({ buffer: backDl.data, faceLabel: 'back' });

  const anyQuadValid = front.quadValid || back.quadValid;
  const frontOk = front.status === 'ok';
  const backOk = back.status === 'ok';

  const fpFeatures = { front: null, back: null };
  const fpFlags = { front: [], back: [] };

  async function hashFace(label, face) {
    if (!face || face.status !== 'ok' || !face.normalized) return;
    try {
      const phash = await computePHash64(face.normalized);
      const dhash = await computeDHash64(face.normalized);
      fpFeatures[label] = { phash, dhash };
      if (globalThis.FP_DEBUG) {
        console.log(`[fingerprint][hash] face=${label} phash=${phash} dhash=${dhash}`);
      }
    } catch (e) {
      const token = (e?.message || 'hash_failed').slice(0, 80);
      fpFlags[label].push('hash_failed', `hash_error:${token}`);
      if (globalThis.FP_DEBUG) {
        console.log(`[fingerprint][hash] face=${label} failed: ${token}`);
      }
    }
  }

  await hashFace('front', front);
  await hashFace('back', back);

  const normalization = {
    front: {
      status: front.status,
      quad_source: front.quadSource || null,
      flags: front.flags || [],
      orientation_source: 'ui_gate_v1',
      normalized_size: frontOk ? { w: 1024, h: 1428 } : null,
      aspect_debug: front.aspectDebug || null,
      features: fpFeatures.front,
      flags_hash: fpFlags.front.length ? fpFlags.front : null,
    },
    back: {
      status: back.status,
      quad_source: back.quadSource || null,
      flags: back.flags || [],
      orientation_source: 'ui_gate_v1',
      normalized_size: backOk ? { w: 1024, h: 1428 } : null,
      aspect_debug: back.aspectDebug || null,
      features: fpFeatures.back,
      flags_hash: fpFlags.back.length ? fpFlags.back : null,
    },
  };

  const measurements = {
    version: 1,
    fingerprint: {
      normalization,
      features: fpFeatures,
      flags: fpFlags,
      match: {
        decision: 'uncertain',
        confidence_0_1: 0.0,
        best_candidate_snapshot_id: null,
        debug: { score: 0.0, reason: 'not_computed', shortlisted: 0, primary_face: null },
      },
      artifacts: {
        base_path: `condition-scans/${snapshotId}/derived/fingerprint/`,
        front_normalized: null,
        back_normalized: null,
        debug_overlay_front: null,
        debug_overlay_back: null,
        fingerprint_debug_json: null,
      },
    },
  };

  let analysisStatus = 'failed';
  let failureReason = 'fingerprint_no_quads';
  if (frontOk && backOk) {
    analysisStatus = 'ok';
    failureReason = null;
  } else if (frontOk || backOk) {
    analysisStatus = 'partial';
    failureReason = 'one_face_failed';
    } else if (anyQuadValid) {
      analysisStatus = 'failed';
      const frontFailed = front?.quadValid && front?.status !== 'ok';
      const backFailed = back?.quadValid && back?.status !== 'ok';
      const frontToken = pickWarpToken(front);
      const backToken = pickWarpToken(back);
      if (frontFailed && backFailed) {
        failureReason = `warp_failed:front:${frontToken}|back:${backToken}`;
      } else if (frontFailed) {
        failureReason = `warp_failed:front:${frontToken}`;
      } else if (backFailed) {
        failureReason = `warp_failed:back:${backToken}`;
      } else {
        failureReason = 'warp_failed';
      }
    }

    const shouldLogQuadDebug = DEBUG || failureReason === 'fingerprint_no_quads';
    if (shouldLogQuadDebug) {
      [
        { label: 'front', face: front },
        { label: 'back', face: back },
      ].forEach(({ label, face }) => {
        if (face?.aspectDiag) {
          logStatus('ai_quad_debug', {
            face: label,
            image_w: face.aspectDiag.image_w,
            image_h: face.aspectDiag.image_h,
            quad_points: face.aspectDiag.quad_points,
            ai_confidence: face.aspectDiag.ai_confidence ?? null,
            ai_notes: face.aspectDiag.ai_notes || [],
          });
        }
      });
    }

    // Matching (same-user only) using hashes
    const curFeatures = measurements.fingerprint.features;
    const cur = {
      front: curFeatures?.front || null,
      back: curFeatures?.back || null,
  };

  const matchResult = {
    decision: 'uncertain',
    confidence_0_1: 0.0,
    best_candidate_snapshot_id: null,
    debug: { score: 0.0, reason: 'no_hashes', shortlisted: 0, primary_face: null },
  };

  const hasFrontHash = !!(cur.front?.phash && cur.front?.dhash);
  const hasBackHash = !!(cur.back?.phash && cur.back?.dhash);
  if (hasFrontHash || hasBackHash) {
    const primaryFace = hasFrontHash ? 'front' : hasBackHash ? 'back' : null;
    matchResult.debug.primary_face = primaryFace;
    let candidates = [];
    try {
    const { data: rows, error } = await supabase
      .from('condition_snapshot_analyses')
      .select('snapshot_id, measurements, user_id')
      .eq('user_id', snap.user_id)
      .eq('analysis_version', analysisVersion)
        .neq('snapshot_id', snapshotId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && Array.isArray(rows)) {
        candidates = rows;
      }
    } catch (_) {
      candidates = [];
    }

    if (globalThis.FP_DEBUG) {
      console.log(`[fingerprint][match] fetched candidates=${candidates.length}`);
    }

    const parsed = [];
    for (const row of candidates) {
      try {
        const candFeat = row?.measurements?.fingerprint?.features;
        const candFront = candFeat?.front;
        const candBack = candFeat?.back;
        const candHasFront = candFront && typeof candFront.phash === 'string' && candFront.phash.length === 16 && typeof candFront.dhash === 'string' && candFront.dhash.length === 16;
        const candHasBack = candBack && typeof candBack.phash === 'string' && candBack.phash.length === 16 && typeof candBack.dhash === 'string' && candBack.dhash.length === 16;
        if (!candHasFront && !candHasBack) continue;
        parsed.push({
          snapshot_id: row.snapshot_id,
          front: candHasFront ? candFront : null,
          back: candHasBack ? candBack : null,
        });
      } catch (_) {
        continue;
      }
    }

    let shortlist = [];
    if (parsed.length > 0 && primaryFace) {
      shortlist = parsed
        .map((cand) => {
          if (cand[primaryFace] && cur[primaryFace]) {
            try {
              const dist = hamming64(cur[primaryFace].phash, cand[primaryFace].phash);
              return { cand, dist };
            } catch (_) {
              return { cand, dist: 999 };
            }
          }
          return { cand, dist: 999 };
        })
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 20)
        .map((item) => item.cand);
    }

    matchResult.debug.shortlisted = shortlist.length;

    let bestScore = 0;
    let bestSnap = null;
    let bestReason = 'no_face_overlap';

    if (parsed.length === 0) {
      matchResult.debug.reason = 'no_candidates';
      matchResult.decision = 'uncertain';
      matchResult.confidence_0_1 = 0.0;
      matchResult.best_candidate_snapshot_id = null;
      if (globalThis.FP_DEBUG) console.log('[fingerprint][match] no candidates => decision=uncertain');
    } else if (shortlist.length === 0) {
      matchResult.debug.reason = 'no_candidates';
      matchResult.decision = 'uncertain';
      matchResult.confidence_0_1 = 0.0;
      matchResult.best_candidate_snapshot_id = null;
      if (globalThis.FP_DEBUG) console.log('[fingerprint][match] shortlist empty => decision=uncertain');
    } else {
      for (const cand of shortlist) {
        try {
          const { score, reason } = scoreMatch({ cur, cand });
          if (score > bestScore) {
            bestScore = score;
            bestSnap = cand.snapshot_id || null;
            bestReason = reason;
          }
        } catch (_) {
          continue;
        }
      }

      matchResult.debug.score = bestScore;
      matchResult.debug.reason = bestReason;
      matchResult.best_candidate_snapshot_id = bestSnap;
      if (bestReason === 'no_face_overlap' || bestScore <= 0) {
        matchResult.decision = 'uncertain';
        matchResult.confidence_0_1 = 0.0;
        matchResult.best_candidate_snapshot_id = null;
        if (globalThis.FP_DEBUG) console.log('[fingerprint][match] no_face_overlap or zero score => decision=uncertain');
      } else {
        const decision = decisionFromScore(bestScore);
        matchResult.decision = decision;
        matchResult.confidence_0_1 = decision === 'uncertain' ? 0.0 : bestScore;
        if (globalThis.FP_DEBUG) {
          console.log(`[fingerprint][match] shortlisted=${shortlist.length} bestScore=${bestScore.toFixed(3)} decision=${decision} bestSnap=${bestSnap}`);
        }
      }
    }
  }

  measurements.fingerprint.match = matchResult;

  const fingerprintKey = deriveFingerprintKeyV1(measurements);
  if (globalThis.FP_DEBUG) {
    console.log(`[fingerprint][key] fingerprint_key=${fingerprintKey || 'null'}`);
  }

  let existingBinding = null;
  if (fingerprintKey) {
    try {
      const { data: bindRow } = await supabase
        .from('fingerprint_bindings')
        .select('vault_item_id, snapshot_id, analysis_key, last_seen_at')
        .eq('user_id', snap.user_id)
        .eq('fingerprint_key', fingerprintKey)
        .maybeSingle();
      if (bindRow) existingBinding = bindRow;
    } catch (_) {
      existingBinding = null;
    }
  }

  const seenBefore = {
    is_seen_before: false,
    vault_item_id: null,
    reason: 'no_hashes',
    best_candidate_snapshot_id: matchResult.best_candidate_snapshot_id || null,
    score: null,
  };

  const bestScore = typeof matchResult.debug?.score === 'number' ? matchResult.debug.score : null;
  if (!fingerprintKey) {
    seenBefore.reason = 'no_hashes';
  } else if (matchResult.debug?.reason === 'no_candidates') {
    seenBefore.reason = 'no_candidates';
    seenBefore.score = bestScore;
  } else if (matchResult.decision === 'same') {
    seenBefore.score = bestScore;
    if (existingBinding?.vault_item_id) {
      seenBefore.is_seen_before = true;
      seenBefore.vault_item_id = existingBinding.vault_item_id;
      seenBefore.reason = 'same_match_bound';
    } else {
      seenBefore.is_seen_before = false;
      seenBefore.reason = 'same_match_unbound';
    }
  } else if (matchResult.decision === 'different') {
    seenBefore.reason = 'different';
    seenBefore.score = bestScore;
  } else {
    seenBefore.reason = 'uncertain';
    seenBefore.score = bestScore;
  }

  measurements.fingerprint.seen_before = seenBefore;

  const scanQuality = {
    version: 1,
    ok: analysisStatus === 'ok',
    analysis_status: analysisStatus,
    failure_reason: failureReason,
    notes: ['fingerprint_v1'],
  };

  const payload = {
    snapshot_id: snapshotId,
    analysis_version: analysisVersion,
    analysis_key: analysisKey,
    scan_quality: scanQuality,
    measurements,
    defects: { version: 1, items: [] },
    confidence: 0.0,
    analysis_status: analysisStatus,
    failure_reason: failureReason,
  };

  if (dryRun) {
    logStatus('dry_run', { snapshotId, analysisVersion, analysisKey, analysis_status: analysisStatus, failure_reason: failureReason });
    console.log(JSON.stringify(payload, null, 2));
    if (emitResultJson) {
      console.log(JSON.stringify({ event: 'harness_result', analysis_status: analysisStatus, failure_reason: failureReason, snapshot_id: snapshotId, analysis_version: analysisVersion }));
    }
    return;
  }

    if (analysisStatus === 'failed') {
      await recordFailure({
        supabase,
        snap,
        snapshotId,
        analysisVersion,
        analysisKey,
        error_code: 'fingerprint_failed',
        error_detail: failureReason || 'unknown_stage',
        attempted_snapshot_id: snapshotId,
      });
    }

    const aiHintMetadata = {
      run_id: null,
      warp_sha256: null,
      model_version: null,
      ai_card_print_id: null,
      ai_score: null,
      analysis_key: analysisKey,
    }; // TODO: AI hint fields currently null until upstream wiring is added

    try {
      const { error: aiHintErr } = await supabase.rpc('admin_fingerprint_event_insert_v1', {
        p_user_id: snap.user_id,
        p_analysis_key: analysisKey,
        p_event_type: 'fingerprint_ai_hint',
        p_snapshot_id: snapshotId,
        p_fingerprint_key: fingerprintKey,
        p_vault_item_id: snap.vault_item_id,
        p_event_metadata: aiHintMetadata,
      });
      if (aiHintErr && !String(aiHintErr.message || '').toLowerCase().includes('unique constraint')) {
        console.warn(`[fingerprint][ai_hint] insert_failed analysis_key=${analysisKey} detail=${aiHintErr.message}`);
      }
    } catch (err) {
      const msg = err?.message || String(err);
      if (!msg.toLowerCase().includes('duplicate key') && !msg.toLowerCase().includes('unique constraint')) {
        console.warn(`[fingerprint][ai_hint] exception analysis_key=${analysisKey} detail=${msg}`);
      }
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
      p_confidence: 0.0,
    },
  );

    if (insertErr) {
      logStatus('error', { snapshotId, analysisVersion, analysisKey, reason: 'insert_failed', detail: insertErr.message });
      await recordFailure({
        supabase,
        snap,
        snapshotId,
        analysisVersion,
        analysisKey,
        error_code: 'analysis_insert_failed',
        error_detail: insertErr.message,
        attempted_snapshot_id: snapshotId,
      });
      await supabase.rpc('admin_condition_assist_insert_failure_v1', {
        p_snapshot_id: snapshotId,
        p_attempted_snapshot_id: snapshotId,
        p_analysis_version: analysisVersion,
        p_analysis_key: analysisKey,
        p_error_code: 'INSERT_FAILED',
        p_error_detail: insertErr.message,
      });
      return;
    }

      if (!inserted) {
        logStatus('noop', { snapshotId, analysisVersion, analysisKey, reason: 'duplicate' });
        return;
      }

      if (fingerprintKey) {
        if (!existingBinding) {
          await supabase.rpc('admin_fingerprint_event_insert_v1', {
            p_user_id: snap.user_id,
            p_analysis_key: analysisKey,
            p_event_type: 'fingerprint_created',
            p_snapshot_id: snapshotId,
            p_fingerprint_key: fingerprintKey,
            p_vault_item_id: snap.vault_item_id,
            p_event_metadata: { best_candidate_snapshot_id: matchResult.best_candidate_snapshot_id, score: matchResult.debug?.score ?? null },
          });
        }

        await supabase.rpc('admin_fingerprint_bind_v1', {
          p_user_id: snap.user_id,
          p_fingerprint_key: fingerprintKey,
          p_vault_item_id: snap.vault_item_id,
          p_snapshot_id: snapshotId,
          p_analysis_key: analysisKey,
        });

        await supabase.rpc('admin_fingerprint_event_insert_v1', {
          p_user_id: snap.user_id,
          p_analysis_key: analysisKey,
          p_event_type: 'fingerprint_bound_to_vault_item',
          p_snapshot_id: snapshotId,
          p_fingerprint_key: fingerprintKey,
          p_vault_item_id: snap.vault_item_id,
          p_event_metadata: { best_candidate_snapshot_id: matchResult.best_candidate_snapshot_id, score: matchResult.debug?.score ?? null },
        });

        if (matchResult.decision === 'same') {
          await supabase.rpc('admin_fingerprint_event_insert_v1', {
            p_user_id: snap.user_id,
            p_analysis_key: analysisKey,
            p_event_type: 'fingerprint_matched',
            p_snapshot_id: snapshotId,
            p_fingerprint_key: fingerprintKey,
            p_vault_item_id: snap.vault_item_id,
            p_event_metadata: { best_candidate_snapshot_id: matchResult.best_candidate_snapshot_id, score: matchResult.debug?.score ?? null },
          });
          if (seenBefore.is_seen_before) {
            await supabase.rpc('admin_fingerprint_event_insert_v1', {
              p_user_id: snap.user_id,
              p_analysis_key: analysisKey,
              p_event_type: 'fingerprint_rescan',
              p_snapshot_id: snapshotId,
              p_fingerprint_key: fingerprintKey,
              p_vault_item_id: seenBefore.vault_item_id,
              p_event_metadata: { best_candidate_snapshot_id: matchResult.best_candidate_snapshot_id, score: matchResult.debug?.score ?? null },
            });
          } else {
            await supabase.rpc('admin_fingerprint_event_insert_v1', {
              p_user_id: snap.user_id,
              p_analysis_key: analysisKey,
              p_event_type: 'fingerprint_match_unbound',
              p_snapshot_id: snapshotId,
              p_fingerprint_key: fingerprintKey,
              p_vault_item_id: snap.vault_item_id,
              p_event_metadata: { best_candidate_snapshot_id: matchResult.best_candidate_snapshot_id, score: matchResult.debug?.score ?? null },
            });
          }
        }
      }

      const elapsedMs = Date.now() - started;
      logStatus('ok', { snapshotId, analysisVersion, analysisKey, ms: elapsedMs, analysis_status: analysisStatus });
    } catch (e) {
    logStatus('error', { snapshotId, analysisVersion, analysisKey, reason: 'exception', detail: e?.message || e });
    await recordFailure({
      supabase,
      snap,
      snapshotId,
      analysisVersion,
      analysisKey,
      error_code: e?.code || 'exception',
      error_detail: e?.message || 'unknown_stage',
      attempted_snapshot_id: snapshotId,
    });
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].includes('fingerprint_worker_v1.mjs')) {
  main().catch((err) => {
    console.error('[fatal]', err);
    process.exit(1);
  });
}
