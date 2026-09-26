// Exact top-k evaluation of the V19 distances. No identity decisions or new
// thresholds. Partial sums can stop only after exceeding a full top-k score;
// all remaining terms are nonnegative. Equal scores always reach tie-breaking.
import sharp from 'sharp';
import { MAX_SCAN_BYTES, scanDescriptor, prepareVisualIndex, VISUAL_VERSION } from './visualMatchCore.mjs';
import { structureFeature } from './scanStructureV12.mjs';
export const SHORTLIST_VERSION = 'vendor_scan_shortlist_v25';

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
  return Float64Array.from(gray, value => (value - mean) / Math.max(14, sd));
}

const cache = new WeakMap();
const weights = Uint8Array.from({ length: 768 }, (_, i) => {
  const y = Math.floor(i / 24) / 32;
  return y > .13 && y < .55 ? 2 : 1;
});
const totalWeight = weights.reduce((sum, n) => sum + n, 0);
const order = (a, b) => a.distance - b.distance || a.id.localeCompare(b.id);
function insert(top, row, limit, compare = order) {
  if (top.length === limit && compare(row, top[top.length - 1]) >= 0) return;
  let i = 0;
  while (i < top.length && compare(row, top[i]) >= 0) i++;
  top.splice(i, 0, row);
  if (top.length > limit) top.pop();
}

// Preserve the exact Float32 normalization and channel accumulation order of
// scoreVisualScan. Infinity means only that this row cannot enter this top-k.
function colorDistance(query, reference, ceiling = Infinity) {
  let structure = 0, color = 0;
  const a = query.gray, b = reference.gray, x = query.bytes, y = reference.bytes;
  for (let i = 0; i < 768; i++) {
    const w = weights[i], p = i * 3;
    structure += w * Math.min(4, (a[i] - b[i]) ** 2);
    color += w * Math.abs(x[p] - y[p]) / (255 * 3);
    color += w * Math.abs(x[p + 1] - y[p + 1]) / (255 * 3);
    color += w * Math.abs(x[p + 2] - y[p + 2]) / (255 * 3);
    if ((i & 31) === 31 && .75 * structure / totalWeight + .25 * color / totalWeight > ceiling) return Infinity;
  }
  return .75 * structure / totalWeight + .25 * color / totalWeight;
}
function featureDistance(query, reference, ceiling, clip) {
  let sum = 0;
  for (let i = 0; i < query.length; i++) {
    const squared = (query[i] - reference[i]) ** 2;
    sum += clip ? Math.min(4, squared) : squared;
    if ((i & 31) === 31 && sum / query.length > ceiling) return Infinity;
  }
  return sum / query.length;
}

export function rankDescriptorV25(descriptor, references) {
  let features = cache.get(references);
  if (!features) {
    features = references.map(row => ({ art: artworkFeature(row.descriptor), structure: Float64Array.from(structureFeature(row.descriptor)) }));
    cache.set(references, features);
  }
  const query = prepareVisualIndex({ version: VISUAL_VERSION, references: [{ ...references[0], descriptor }] })[0].feature;
  const art = artworkFeature(descriptor), structure = structureFeature(descriptor);
  const colors = [], gradients = [], artworks = [];
  const artOrder = (a, b) => a.distance - b.distance || a.color - b.color || a.id.localeCompare(b.id);
  for (let i = 0; i < references.length; i++) {
    const row = references[i], feature = features[i];
    let color = colorDistance(query, row.feature, colors.length === 6 ? colors[5].distance : Infinity);
    if (Number.isFinite(color)) insert(colors, { id: row.id, distance: color }, 6);
    const gradient = featureDistance(structure, feature.structure, gradients.length === 6 ? gradients[5].distance : Infinity, false);
    if (Number.isFinite(gradient)) insert(gradients, { id: row.id, distance: gradient }, 6);
    const distance = featureDistance(art, feature.art, artworks.length === 4 ? artworks[3].distance : Infinity, true);
    if (Number.isFinite(distance)) {
      // V19's stable artwork sort inherits full color-distance/id ordering.
      if (!Number.isFinite(color)) color = colorDistance(query, row.feature);
      insert(artworks, { id: row.id, distance, color }, 4, artOrder);
    }
  }
  return [colors, gradients, artworks];
}

// Deliberately identical preprocessing to frozen V19, including materialized
// orientation and PNG passes. Changing resampling would change the query.
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

export async function shortlistVisualReferencesV25(bytes, references) {
  const found = new Map();
  for (const descriptor of await orientedDescriptors(bytes)) {
    for (const ranking of rankDescriptorV25(descriptor, references)) ranking.forEach((row, rank) => {
      const old = found.get(row.id);
      if (!old || rank < old.rank) found.set(row.id, { id: row.id, rank });
    });
  }
  return [...found.values()].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id)).slice(0, 32).map(row => row.id);
}
