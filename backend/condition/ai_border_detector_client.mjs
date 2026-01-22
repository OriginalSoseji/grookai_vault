import '../env.mjs';

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

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

function validatePolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length !== 4) {
    return { ok: false, reason: 'invalid_point_count' };
  }
  const pts = [];
  for (const p of polygon) {
    if (!Array.isArray(p) || p.length !== 2) return { ok: false, reason: 'invalid_point_shape' };
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, reason: 'non_finite_point' };
    if (x < 0 || x > 1 || y < 0 || y > 1) return { ok: false, reason: 'out_of_bounds' };
    pts.push([x, y]);
  }

  if (selfIntersects(pts)) return { ok: false, reason: 'self_intersect' };
  const area = Math.abs(polygonArea(pts));
  if (area < 0.001) return { ok: false, reason: 'area_too_small' };

  return { ok: true, points: pts, area };
}

export async function detectOuterBorderAI({ imageBuffer, timeoutMs = 2000 }) {
  const notes = [];
  const enabled = process.env.GV_AI_BORDER_ENABLE === '1';
  const baseUrl = process.env.GV_AI_BORDER_URL || '';

  if (!enabled || !baseUrl) {
    return { ok: false, confidence: 0, notes, error: 'ai_disabled' };
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return { ok: false, confidence: 0, notes, error: 'invalid_input' };
  }

  if (typeof fetch !== 'function') {
    return { ok: false, confidence: 0, notes: [...notes, 'fetch_unavailable'], error: 'ai_unavailable' };
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/detect-card-border`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_b64: imageBuffer.toString('base64'), mode: 'polygon' }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const reason = err.name === 'AbortError' ? 'ai_timeout' : 'ai_network_error';
    notes.push(err.message);
    return { ok: false, confidence: 0, notes, error: reason };
  }
  clearTimeout(timer);

  if (!response.ok) {
    notes.push(`http_${response.status}`);
    return { ok: false, confidence: 0, notes, error: 'ai_http_error' };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    notes.push('invalid_json');
    return { ok: false, confidence: 0, notes, error: 'ai_invalid_json' };
  }
  if (!payload || typeof payload !== 'object') {
    notes.push('invalid_payload');
    return { ok: false, confidence: 0, notes, error: 'ai_invalid_json' };
  }

  const confidence = clamp01(payload?.confidence ?? 0);
  const polygon = payload?.polygon_norm;
  const mask = typeof payload?.mask_png_b64 === 'string' && payload.mask_png_b64.length > 16 ? payload.mask_png_b64 : undefined;

  const validation = validatePolygon(polygon);
  if (!validation.ok) {
    notes.push(validation.reason);
    return { ok: false, confidence, notes, mask_png_b64: mask, error: 'ai_invalid_polygon' };
  }

  return {
    ok: true,
    confidence,
    polygon_norm: validation.points,
    mask_png_b64: mask,
    notes,
  };
}

export async function warpCardQuadAI({ imageBuffer, quadNorm, outW, outH, timeoutMs = 4000 }) {
  const notes = [];
  const enabled = process.env.GV_AI_BORDER_ENABLE === '1';
  const baseUrl = process.env.GV_AI_BORDER_URL || '';

  if (!enabled || !baseUrl) {
    return { ok: false, imageBuffer: null, notes, error: 'ai_disabled' };
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_invalid_input' };
  }

  if (!Array.isArray(quadNorm) || quadNorm.length !== 4) {
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_invalid_quad' };
  }

  if (!Number.isInteger(outW) || !Number.isInteger(outH) || outW <= 0 || outH <= 0) {
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_invalid_size' };
  }

  if (typeof fetch !== 'function') {
    return { ok: false, imageBuffer: null, notes: [...notes, 'fetch_unavailable'], error: 'ai_unavailable' };
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/warp-card-quad`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image_b64: imageBuffer.toString('base64'),
        quad_norm: quadNorm,
        out_w: outW,
        out_h: outH,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const reason = err.name === 'AbortError' ? 'ai_warp_timeout' : 'ai_warp_network_error';
    notes.push(err.message);
    return { ok: false, imageBuffer: null, notes, error: reason };
  }
  clearTimeout(timer);

  if (!response.ok) {
    notes.push(`http_${response.status}`);
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_http_error' };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    notes.push('invalid_json');
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_invalid_json' };
  }
  if (!payload || typeof payload !== 'object') {
    notes.push('invalid_payload');
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_invalid_payload' };
  }

  const warpedB64 = payload?.warped_jpg_b64 || payload?.warped_b64;
  if (typeof warpedB64 !== 'string' || warpedB64.length < 16) {
    notes.push('missing_warped_payload');
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_invalid_payload' };
  }

  try {
    const imageBufferOut = Buffer.from(warpedB64, 'base64');
    return { ok: true, imageBuffer: imageBufferOut, notes, error: null };
  } catch (err) {
    notes.push('buffer_from_failed');
    return { ok: false, imageBuffer: null, notes, error: 'ai_warp_invalid_payload' };
  }
}

export async function ocrCardSignalsAI({ imageBuffer, timeoutMs = 4000 }) {
  const notes = [];
  const enabled = process.env.GV_AI_BORDER_ENABLE === '1';
  const baseUrl = process.env.GV_AI_BORDER_URL || '';

  if (!enabled || !baseUrl) {
    return { ok: false, notes: ['ai_disabled'], error: 'ai_disabled', result: null };
  }

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return { ok: false, notes: ['invalid_input'], error: 'ocr_invalid_input', result: null };
  }

  if (typeof fetch !== 'function') {
    return { ok: false, notes: ['fetch_unavailable'], error: 'ai_unavailable', result: null };
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/ocr-card-signals`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_b64: imageBuffer.toString('base64') }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const reason = err.name === 'AbortError' ? 'ai_timeout' : 'ai_network_error';
    notes.push(err.message);
    return { ok: false, notes, error: reason, result: null };
  }
  clearTimeout(timer);

  if (!response.ok) {
    notes.push(`http_${response.status}`);
    return { ok: false, notes, error: 'ai_http_error', result: null };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    notes.push('invalid_json');
    return { ok: false, notes, error: 'ai_invalid_json', result: null };
  }
  if (!payload || typeof payload !== 'object') {
    notes.push('invalid_payload');
    return { ok: false, notes, error: 'ai_invalid_json', result: null };
  }

  return { ok: true, notes, error: null, result: payload };
}
