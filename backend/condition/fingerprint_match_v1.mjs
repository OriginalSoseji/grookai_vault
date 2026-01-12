import { hamming64 } from './fingerprint_hashes_v1.mjs';

/**
 * Similarity score from hamming distance (0..64) => (0..1)
 */
function hamSim(dist) {
  return 1 - dist / 64;
}

/**
 * Per-face score based on phash + dhash.
 * score = 0.55*ph + 0.45*dh
 */
function faceScore(curFace, candFace) {
  const ph = hamSim(hamming64(curFace.phash, candFace.phash));
  const dh = hamSim(hamming64(curFace.dhash, candFace.dhash));
  return 0.55 * ph + 0.45 * dh;
}

/**
 * Combine faces:
 * - if both faces exist on both sides, average
 * - else use whichever face overlap exists
 */
export function scoreMatch({ cur, cand }) {
  const scores = [];

  if (cur.front && cand.front) scores.push(faceScore(cur.front, cand.front));
  if (cur.back && cand.back) scores.push(faceScore(cur.back, cand.back));

  if (scores.length === 0) return { score: 0, reason: 'no_face_overlap' };

  const score = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { score, reason: 'ok' };
}

export function decisionFromScore(score) {
  if (score >= 0.85) return 'same';
  if (score <= 0.50) return 'different';
  return 'uncertain';
}
