// fingerprint_worker_v1.mjs
// Usage:
//   node backend/condition/fingerprint_worker_v1.mjs --snapshot-id <uuid> [--analysis-version v1_fingerprint] [--dry-run true|false] [--debug true|false] [--emit-result-json true|false]

import '../env.mjs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { createBackendClient } from '../supabase_backend_client.mjs';
import { detectOuterBorderAI } from './ai_border_detector_client.mjs';
import { detectAndWarpCard } from './ai_border_detector_client.mjs';
import { computeDHash64, computePHash64, hamming64 } from './fingerprint_hashes_v1.mjs';
import { scoreMatch, decisionFromScore } from './fingerprint_match_v1.mjs';
import { deriveFingerprintKeyV1 } from './fingerprint_key_v1.mjs';

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

async function downloadImage(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) return { error };
  if (!data) return { error: new Error('empty_download') };
  const buf = Buffer.from(await data.arrayBuffer());
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
  const wNorm = (Math.max(...xs) - Math.min(...xs)) / imgW;
  const hNorm = (Math.max(...ys) - Math.min(...ys)) / imgH;
  const aspect = wNorm > 0 && hNorm > 0 ? wNorm / hNorm : 0;
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

function normToAbs(norm, w, h) {
  return norm.map(([x, y]) => ({
    x: (Number(x) || 0) * w,
    y: (Number(y) || 0) * h,
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
    };
  }

  const warpRes = await detectAndWarpCard({
    imageBuffer: buffer,
    quadNorm: ai.polygon_norm,
    outW: 1024,
    outH: 1428,
    timeoutMs: AI_BORDER_TIMEOUT_MS + 2000,
  });
  if (!warpRes.ok || !warpRes.imageBuffer) {
    return {
      status: 'failed',
      flags: [...flags, 'warp_failed', warpRes.error || 'warp_unknown'],
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

  const supabase = createBackendClient();
  const started = Date.now();

    const { data: snap, error: snapErr } = await supabase
      .from('condition_snapshots')
      .select('id, user_id, vault_item_id, images')
      .eq('id', snapshotId)
      .maybeSingle();

  if (snapErr || !snap) {
    const reason = snapErr ? 'SNAPSHOT_READ_ERROR' : 'SNAPSHOT_NOT_FOUND';
    const detail = snapErr?.message ?? 'Snapshot not found';
    logStatus('error', { snapshotId, analysisVersion, reason, detail });
    if (!dryRun) {
      await supabase.rpc('admin_condition_assist_insert_failure_v1', {
        p_snapshot_id: snap ? snap.id : null,
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
    process.exit(1);
  }

  const analysisKey = sha256Hex(`${snapshotId}::${analysisVersion}::fingerprint_v1`);

  const frontDl = await downloadImage(supabase, bucket, frontPath);
  if (frontDl.error) {
    logStatus('download_failed', { snapshotId, path: frontPath, detail: frontDl.error.message });
    process.exit(1);
  }
  const backDl = await downloadImage(supabase, bucket, backPath);
  if (backDl.error) {
    logStatus('download_failed', { snapshotId, path: backPath, detail: backDl.error.message });
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
      if (DEBUG) {
        console.log(`[fingerprint][hash] face=${label} phash=${phash} dhash=${dhash}`);
      }
    } catch (e) {
      const token = (e?.message || 'hash_failed').slice(0, 80);
      fpFlags[label].push('hash_failed', `hash_error:${token}`);
      if (DEBUG) {
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
    failureReason = 'warp_failed';
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

    if (DEBUG) {
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
      if (DEBUG) console.log('[fingerprint][match] no candidates => decision=uncertain');
    } else if (shortlist.length === 0) {
      matchResult.debug.reason = 'no_candidates';
      matchResult.decision = 'uncertain';
      matchResult.confidence_0_1 = 0.0;
      matchResult.best_candidate_snapshot_id = null;
      if (DEBUG) console.log('[fingerprint][match] shortlist empty => decision=uncertain');
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
        if (DEBUG) console.log('[fingerprint][match] no_face_overlap or zero score => decision=uncertain');
      } else {
        const decision = decisionFromScore(bestScore);
        matchResult.decision = decision;
        matchResult.confidence_0_1 = decision === 'uncertain' ? 0.0 : bestScore;
        if (DEBUG) {
          console.log(`[fingerprint][match] shortlisted=${shortlist.length} bestScore=${bestScore.toFixed(3)} decision=${decision} bestSnap=${bestSnap}`);
        }
      }
    }
  }

  measurements.fingerprint.match = matchResult;

  const fingerprintKey = deriveFingerprintKeyV1(measurements);
  if (DEBUG) {
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

    try {
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
  }
}

if (process.argv[1] && process.argv[1].includes('fingerprint_worker_v1.mjs')) {
  main().catch((err) => {
    console.error('[fatal]', err);
    process.exit(1);
  });
}
