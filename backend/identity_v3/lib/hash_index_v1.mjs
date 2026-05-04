import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import {
  DHASH_V1,
  computeDHashV1,
  hammingDistanceBits,
} from '../../scanner_v3/lib/image_hash_v1.mjs';

export const HASH_INDEX_V1 = {
  name: 'identity_v3_hash_index_v1',
  hash_algorithm: DHASH_V1.algorithm,
  full_weight: 0.45,
  artwork_weight: 0.55,
  artwork_crop: {
    left_ratio: 0.075,
    top_ratio: 0.155,
    width_ratio: 0.85,
    height_ratio: 0.34,
  },
};

export function normalizeId(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function safeBasename(value) {
  return String(value || 'item')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'item';
}

export function isImagePath(filePath) {
  return /\.(?:jpg|jpeg|png|webp)$/i.test(String(filePath || ''));
}

export function hammingDistance(leftBits, rightBits) {
  return hammingDistanceBits(leftBits, rightBits);
}

export function weightedHashDistance(query, reference, weights = HASH_INDEX_V1) {
  const fullDistance = hammingDistanceBits(query.full_hash.bits, reference.full_hash.bits);
  const artworkDistance = hammingDistanceBits(query.art_hash.bits, reference.art_hash.bits);
  const distance = (fullDistance * weights.full_weight) + (artworkDistance * weights.artwork_weight);

  return {
    distance: round6(distance),
    full_distance: fullDistance,
    artwork_distance: artworkDistance,
  };
}

export function rankHashCandidates({ query, references, topN = 10, weights = HASH_INDEX_V1 }) {
  if (!query) throw new Error('rank_hash_candidates_missing_query');
  if (!Array.isArray(references)) throw new Error('rank_hash_candidates_missing_references');

  return references
    .map((reference) => {
      const distances = weightedHashDistance(query, reference, weights);
      return {
        card_id: reference.card_id,
        gv_id: reference.gv_id ?? null,
        name: reference.name ?? null,
        set_code: reference.set_code ?? null,
        number: reference.number ?? null,
        variant_key: reference.variant_key ?? null,
        image_url: reference.image_url ?? null,
        source_path: reference.source_path ?? null,
        distance: distances.distance,
        full_distance: distances.full_distance,
        artwork_distance: distances.artwork_distance,
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.artwork_distance !== b.artwork_distance) return a.artwork_distance - b.artwork_distance;
      if (a.full_distance !== b.full_distance) return a.full_distance - b.full_distance;
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topN);
}

export async function buildHashIndex(entries, options = {}) {
  if (!Array.isArray(entries)) throw new Error('hash_index_entries_must_be_array');
  const onSkip = typeof options.onSkip === 'function' ? options.onSkip : () => {};
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const rows = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    try {
      rows.push(await hashIndexEntry(entry));
      onProgress({ index: index + 1, total: entries.length, entry });
    } catch (error) {
      onSkip({
        entry,
        reason: error?.message || String(error),
      });
    }
  }

  return {
    version: HASH_INDEX_V1.name,
    hash_algorithm: HASH_INDEX_V1.hash_algorithm,
    full_weight: HASH_INDEX_V1.full_weight,
    artwork_weight: HASH_INDEX_V1.artwork_weight,
    reference_count: rows.length,
    references: rows,
  };
}

export async function hashIndexEntry(entry) {
  const cardId = normalizeId(entry.card_id ?? entry.id ?? entry.cardPrintId);
  if (!cardId) throw new Error('hash_index_entry_missing_card_id');

  const fullBuffer = await resolveImageBuffer(entry.full_image_buffer, entry.full_image_path ?? entry.image_path);
  const artBuffer = entry.art_image_buffer
    ? entry.art_image_buffer
    : entry.art_image_path
      ? await readFile(entry.art_image_path)
      : await extractArtworkRegionBuffer(fullBuffer);

  const [fullHash, artHash] = await Promise.all([
    computeDHashV1(fullBuffer),
    computeDHashV1(artBuffer),
  ]);

  return {
    card_id: cardId,
    gv_id: entry.gv_id ?? null,
    name: entry.name ?? null,
    set_code: entry.set_code ?? null,
    number: entry.number ?? null,
    variant_key: entry.variant_key ?? null,
    image_url: entry.image_url ?? null,
    source_path: entry.full_image_path ?? entry.image_path ?? null,
    full_hash: fullHash,
    art_hash: artHash,
  };
}

export async function hashScannerQuery(entry) {
  const queryId = normalizeId(entry.query_id ?? entry.id ?? entry.source_name ?? entry.source_dir);
  if (!queryId) throw new Error('scanner_query_missing_id');
  const fullPath = entry.full_image_path ?? entry.normalized_full_card_path;
  const artPath = entry.art_image_path ?? entry.artwork_region_path;
  if (!fullPath) throw new Error(`scanner_query_missing_full_image:${queryId}`);
  if (!artPath) throw new Error(`scanner_query_missing_artwork_image:${queryId}`);

  const [fullBuffer, artBuffer] = await Promise.all([
    readFile(fullPath),
    readFile(artPath),
  ]);
  const [fullHash, artHash] = await Promise.all([
    computeDHashV1(fullBuffer),
    computeDHashV1(artBuffer),
  ]);

  return {
    query_id: queryId,
    source_name: entry.source_name ?? path.basename(entry.source_dir ?? fullPath),
    source_dir: entry.source_dir ?? null,
    normalized_full_card_path: fullPath,
    artwork_region_path: artPath,
    expected_card_id: normalizeId(entry.expected_card_id),
    expected_label: entry.expected_label ?? null,
    full_hash: fullHash,
    art_hash: artHash,
    metrics: entry.metrics ?? null,
  };
}

export async function extractArtworkRegionBuffer(fullCardBuffer) {
  if (!Buffer.isBuffer(fullCardBuffer) || fullCardBuffer.length === 0) {
    throw new Error('artwork_crop_invalid_full_card_buffer');
  }

  const image = sharp(fullCardBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 20 || height < 20) {
    throw new Error('artwork_crop_invalid_dimensions');
  }

  const crop = HASH_INDEX_V1.artwork_crop;
  const left = Math.max(0, Math.round(width * crop.left_ratio));
  const top = Math.max(0, Math.round(height * crop.top_ratio));
  const cropWidth = Math.max(1, Math.min(width - left, Math.round(width * crop.width_ratio)));
  const cropHeight = Math.max(1, Math.min(height - top, Math.round(height * crop.height_ratio)));

  return image
    .extract({
      left,
      top,
      width: cropWidth,
      height: cropHeight,
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

async function resolveImageBuffer(buffer, filePath) {
  if (Buffer.isBuffer(buffer) && buffer.length > 0) return buffer;
  if (!filePath) throw new Error('hash_index_entry_missing_image');
  return readFile(filePath);
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}
