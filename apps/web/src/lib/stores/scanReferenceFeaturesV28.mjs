// Offline experiment only. Not wired into a serving worker or delivery route.
// A caller must supply a trusted manifest digest; an embedded image hash alone
// does not authenticate cached features or authorize reference disclosure.
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

export const FEATURE_CONTRACT_V28 = Object.freeze({
  format: 'grookai_reference_features_v28',
  opencv: '4.12.0-release.1',
  opencvSha256: 'bd0c3e6448043de04f6a64a12cb7b759f78c3ab8f7c35c9f2e0f71c88bb17103',
  sharp: '0.35.4', vips: '8.18.6', webp: '1.6.0', mozjpeg: '0826579',
  prepare16: '0fe997bed460a5a8c2c14144bfedbd51db14106eb25171151783a75c74fabd5e',
  prepare19: 'bfcedcd1d0e60441ae768655803c687dddf5c914c92607c1ff0306a0000efd39',
});
export const featureHashV28 = bytes => createHash('sha256').update(bytes).digest('hex');
export const FEATURE_CONTRACT_SHA256 = featureHashV28(JSON.stringify(FEATURE_CONTRACT_V28));
export const MAX_FEATURE_BYTES = 1024 * 1024;
const pixels = 640 * 880, digest = x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
const fail = () => { throw new Error('Invalid reference feature cache.'); };
function pointValid(p) {
  return p && [p.pt?.x, p.pt?.y, p.size, p.angle, p.response].every(n => Number.isFinite(n) && Math.fround(n) === n)
    && p.pt.x >= 0 && p.pt.x < 640 && p.pt.y >= 0 && p.pt.y < 880 && p.size > 0 && p.size <= 4096
    && p.angle >= -1 && p.angle <= 360 && Number.isInteger(p.octave) && p.octave >= 0 && p.octave <= 31
    && Number.isInteger(p.class_id) && p.class_id >= -2147483648 && p.class_id <= 2147483647;
}
function writePoint(buffer, offset, p) {
  if (!pointValid(p)) fail();
  [p.pt.x, p.pt.y, p.size, p.angle, p.response].forEach((n, i) => buffer.writeFloatLE(n, offset + 4 * i));
  buffer.writeInt32LE(p.octave, offset + 20); buffer.writeInt32LE(p.class_id, offset + 24);
}
function readPoint(buffer, offset) {
  const p = { pt: { x: buffer.readFloatLE(offset), y: buffer.readFloatLE(offset + 4) },
    size: buffer.readFloatLE(offset + 8), angle: buffer.readFloatLE(offset + 12), response: buffer.readFloatLE(offset + 16),
    octave: buffer.readInt32LE(offset + 20), class_id: buffer.readInt32LE(offset + 24) };
  if (!pointValid(p)) fail(); return p;
}

export function encodeReferenceFeaturesV28(reference, imageSha256) {
  if (!digest(imageSha256) || ![0, 90].includes(reference.baseRotation)
    || reference.image !== reference.original?.image || reference.baseRotation !== reference.original.baseRotation
    || reference.image.rows !== 880 || reference.image.cols !== 640 || reference.image.type() !== 0
    || reference.image.data.length !== pixels) fail();
  const views = [reference.original, reference], counts = views.map(v => v.points.size());
  if (counts.some((n, i) => !Number.isInteger(n) || n < 0 || n > [2048, 1152][i])) fail();
  const header = Buffer.from(JSON.stringify({ version: 28, contract: FEATURE_CONTRACT_SHA256, imageSha256,
    width: 640, height: 880, baseRotation: reference.baseRotation, originalRows: counts[0], balancedRows: counts[1] }));
  const raw = Buffer.alloc(4 + header.length + pixels + counts.reduce((a, b) => a + b, 0) * 60);
  raw.writeUInt32LE(header.length); header.copy(raw, 4); let offset = 4 + header.length;
  Buffer.from(reference.image.data).copy(raw, offset); offset += pixels;
  for (const [i, view] of views.entries()) {
    const n = counts[i];
    if (view.descriptor.rows !== n || (n && view.descriptor.cols !== 32) || view.descriptor.type() !== 0
      || view.descriptor.data.length !== n * 32) fail();
    for (let j = 0; j < n; j++) { writePoint(raw, offset, view.points.get(j)); offset += 28; }
    Buffer.from(view.descriptor.data).copy(raw, offset); offset += n * 32;
  }
  const bytes = gzipSync(raw, { level: 6 }); if (bytes.length > MAX_FEATURE_BYTES) fail(); return bytes;
}

export function decodeReferenceFeaturesV28(cv, bytes, expected) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_FEATURE_BYTES
    || !digest(expected?.imageSha256) || !digest(expected?.artifactSha256)
    || featureHashV28(bytes) !== expected.artifactSha256) fail();
  const raw = gunzipSync(bytes, { maxOutputLength: MAX_FEATURE_BYTES });
  if (raw.length < 4) fail(); const length = raw.readUInt32LE(0);
  if (length < 1 || length > 1024 || raw.length < 4 + length) fail();
  const h = JSON.parse(raw.subarray(4, 4 + length));
  const keys = ['version', 'contract', 'imageSha256', 'width', 'height', 'baseRotation', 'originalRows', 'balancedRows'];
  if (!h || Array.isArray(h) || Object.keys(h).length !== keys.length || !keys.every(k => Object.hasOwn(h, k))
    || h.version !== 28 || h.contract !== FEATURE_CONTRACT_SHA256 || h.imageSha256 !== expected.imageSha256
    || h.width !== 640 || h.height !== 880 || ![0, 90].includes(h.baseRotation)) fail();
  const counts = [h.originalRows, h.balancedRows];
  if (counts.some((n, i) => !Number.isInteger(n) || n < 0 || n > [2048, 1152][i])
    || raw.length !== 4 + length + pixels + counts.reduce((a, b) => a + b, 0) * 60) fail();
  // Validate every scalar before allocating any OpenCV objects.
  let offset = 4 + length + pixels;
  const pointSets = counts.map(n => { const points = []; for (let i = 0; i < n; i++) { points.push(readPoint(raw, offset)); offset += 28; } offset += n * 32; return points; });
  const owned = [], own = x => (owned.push(x), x); let disposed = false;
  const dispose = () => { if (disposed) return; disposed = true; for (const x of owned.reverse()) x.delete(); };
  try {
    const image = own(cv.matFromArray(880, 640, cv.CV_8UC1, raw.subarray(4 + length, 4 + length + pixels)));
    offset = 4 + length + pixels;
    const views = counts.map((n, i) => {
      const points = own(new cv.KeyPointVector()), descriptor = own(new cv.Mat(n, 32, cv.CV_8UC1));
      for (const p of pointSets[i]) points.push_back(p);
      offset += n * 28; descriptor.data.set(raw.subarray(offset, offset + n * 32)); offset += n * 32;
      return { image, points, descriptor, baseRotation: h.baseRotation };
    });
    return { ...views[1], original: views[0], dispose };
  } catch (error) { dispose(); throw error; }
}
