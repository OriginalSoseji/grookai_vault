// Visual-only bounded retrieval. No OCR imports, workers, or identity decisions.
import sharp from 'sharp';
import { MAX_SCAN_BYTES, scanDescriptor, scoreVisualScan } from './visualMatchCore.mjs';
import { rankStructure } from './scanStructureV12.mjs';
export const SHORTLIST_VERSION = 'vendor_scan_shortlist_v19';

function artworkFeature(descriptor) {
  const pixels = Buffer.from(descriptor, 'base64');
  if (pixels.length !== 2304) throw new Error('Invalid visual descriptor.');
  const gray = [];
  for (let y = 4; y < 16; y++) for (let x = 2; x < 22; x++) {
    const i = (y * 24 + x) * 3;
    gray.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
  }
  const mean = gray.reduce((sum, value) => sum + value, 0) / gray.length;
  const sd = Math.sqrt(gray.reduce((sum, value) => sum + (value - mean) ** 2, 0) / gray.length);
  return gray.map(value => (value - mean) / Math.max(14, sd));
}

const artworkCache = new WeakMap();
function visualScores(descriptor, references) {
  let features = artworkCache.get(references);
  if (!features) { features = references.map(row => artworkFeature(row.descriptor)); artworkCache.set(references, features); }
  const query = artworkFeature(descriptor);
  const byId = new Map(references.map((reference, i) => [reference.id,
    query.reduce((sum, value, j) => sum + Math.min(4, (value - features[i][j]) ** 2), 0) / query.length]));
  return scoreVisualScan(descriptor, references).map(row => ({ ...row, artDistance: byId.get(row.id) }));
}

async function orientedDescriptors(bytes) {
  if (!bytes.length || bytes.length > MAX_SCAN_BYTES) throw new Error('Scan must be at most 4 MB.');
  const input = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' });
  const metadata = await input.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error('Use one JPEG, PNG or WebP scan.');
  const upright = await input.autoOrient().removeAlpha().toColourspace('srgb').toBuffer();
  const { width, height } = await sharp(upright).metadata();
  const short = Math.min(width, height), long = Math.max(width, height);
  if (short < 180 || long < 240 || short / long < .60 || short / long > .80) throw new Error('Use a tightly cropped scan of one card front.');
  const turns = width < height ? [0, 180] : [90, 270];
  const descriptors = [];
  for (const rotation of turns) {
    const oriented = await sharp(upright).rotate(rotation).resize({ width: 1000, withoutEnlargement: false }).png().toBuffer();
    descriptors.push(await scanDescriptor(oriented));
  }
  return descriptors;
}

export async function shortlistVisualReferences(bytes, references, catalog) {
  const found = new Map();
  for (const descriptor of await orientedDescriptors(bytes)) {
    const colors = visualScores(descriptor, references);
    const rankings = [colors.slice().sort((a, b) => a.distance - b.distance).slice(0, 6),
      rankStructure(descriptor, catalog).slice(0, 6),
      colors.slice().sort((a, b) => a.artDistance - b.artDistance).slice(0, 4)];
    for (const ranking of rankings) ranking.forEach((row, rank) => {
      const old = found.get(row.id);
      if (!old || rank < old.rank) found.set(row.id, { id: row.id, rank });
    });
  }
  return [...found.values()].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id)).slice(0, 32).map(row => row.id);
}
