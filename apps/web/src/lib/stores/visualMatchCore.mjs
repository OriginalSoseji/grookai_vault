// Still-scan visual retrieval only. Scores are distances, never identity probabilities.
import sharp from 'sharp';
export const VISUAL_VERSION = 'vendor_scan_visual_v1';
export const MAX_SCAN_BYTES = 4 * 1024 * 1024;
const WIDTH = 24, HEIGHT = 32;

export async function scanDescriptor(bytes, rotation = 0) {
  if (!bytes.length || bytes.length > MAX_SCAN_BYTES) throw new Error('Scan must be at most 4 MB.');
  const input = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' });
  const meta = await input.metadata();
  if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages ?? 1) !== 1) throw new Error('Use a single JPEG, PNG or WebP scan.');
  // First materialize EXIF orientation; rotate() alone must not silently replace autoOrient().
  const upright = await input.autoOrient().toBuffer();
  const oriented = await sharp(upright).rotate(rotation).removeAlpha().toColourspace('srgb').toBuffer();
  const image = sharp(oriented, { limitInputPixels: 16_000_000 });
  const { width, height } = await image.metadata();
  if (width < 180 || height < 240 || width / height < 0.60 || width / height > 0.80) throw new Error('Use a tightly cropped, upright scan of one card front.');
  const pixels = await image.extract({ left: Math.round(width * .04), top: Math.round(height * .04), width: Math.round(width * .92), height: Math.round(height * .92) })
    .resize(WIDTH, HEIGHT, { fit: 'fill' }).raw().toBuffer();
  const gray = [];
  for (let i = 0; i < pixels.length; i += 3) gray.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  const deviation = Math.sqrt(gray.reduce((a, b) => a + (b - mean) ** 2, 0) / gray.length);
  if (deviation < 14) throw new Error('The scan has too little visible card detail. Try a clearer front scan.');
  return pixels.toString('base64');
}

function unpack(encoded) {
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length !== WIDTH * HEIGHT * 3) throw new Error('Invalid visual descriptor.');
  const gray = new Float32Array(WIDTH * HEIGHT);
  let mean = 0;
  for (let i = 0; i < gray.length; i++) mean += gray[i] = (bytes[i * 3] + bytes[i * 3 + 1] + bytes[i * 3 + 2]) / (3 * 255);
  mean /= gray.length;
  const sd = Math.sqrt(gray.reduce((a, b) => a + (b - mean) ** 2, 0) / gray.length);
  for (let i = 0; i < gray.length; i++) gray[i] = (gray[i] - mean) / Math.max(.05, sd);
  return { bytes, gray };
}

export function prepareVisualIndex(artifact) {
  if (artifact.version !== VISUAL_VERSION || !Array.isArray(artifact.references) || artifact.references.length < 1 || artifact.references.length > 30000) throw new Error('Invalid visual index.');
  const ids = new Set();
  return artifact.references.map(row => {
    if (!/^[0-9a-f-]{36}$/.test(row.id) || ids.has(row.id) || !row.gv_id || !/^[0-9a-f]{64}$/.test(row.sha256)) throw new Error('Invalid visual reference.');
    ids.add(row.id);
    return { ...row, feature: unpack(row.descriptor) };
  });
}

export function scoreVisualScan(descriptor, references) {
  const query = unpack(descriptor);
  return references.map(row => {
    let structure = 0, color = 0, weight = 0;
    for (let i = 0; i < query.gray.length; i++) {
      const y = Math.floor(i / WIDTH) / HEIGHT;
      // Artwork gets extra weight; full-card structure still separates same-art layouts.
      const w = y > .13 && y < .55 ? 2 : 1;
      structure += w * Math.min(4, (query.gray[i] - row.feature.gray[i]) ** 2);
      for (let c = 0; c < 3; c++) color += w * Math.abs(query.bytes[i * 3 + c] - row.feature.bytes[i * 3 + c]) / (255 * 3);
      weight += w;
    }
    return { id: row.id, distance: .75 * structure / weight + .25 * color / weight };
  }).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
}

export function rankVisualScan(descriptor, references) {
  const ranked = scoreVisualScan(descriptor, references);
  // Deliberately conservative shortlist. No automatic selection, finish inference or identity lock.
  if (!ranked.length || ranked[0].distance > .30) return { status: 'no_match', candidates: [] };
  const candidates = ranked.filter(r => r.distance <= .30 && r.distance <= ranked[0].distance + .08).slice(0, 5);
  return { status: candidates.length > 1 ? 'ambiguous' : 'suggestions', candidates };
}
