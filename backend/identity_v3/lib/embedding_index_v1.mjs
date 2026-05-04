import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import {
  RawImage,
  pipeline,
} from '@huggingface/transformers';

export const EMBEDDING_INDEX_V1 = {
  name: 'identity_v3_embedding_index_v1',
  source: 'transformers_js_clip_image_feature_extraction',
  model: 'Xenova/clip-vit-base-patch32',
  dtype: 'fp32',
  dimensions: 512,
  preprocessing: {
    format: 'png',
    width: 224,
    height: 224,
    fit: 'cover',
    rotate_exif: true,
    remove_alpha: true,
  },
  distance: 'cosine_distance',
};

const extractors = new Map();

export async function embedImagePath(imagePath, options = {}) {
  return embedImageBuffer(await readFile(imagePath), options);
}

export async function embedImageBuffer(imageBuffer, options = {}) {
  if (!Buffer.isBuffer(imageBuffer) && !(imageBuffer instanceof Uint8Array)) {
    throw new Error('embedding_image_buffer_required');
  }
  if (imageBuffer.length === 0) {
    throw new Error('embedding_image_buffer_empty');
  }

  const startedAt = performance.now();
  const normalizedBuffer = await normalizeImageForEmbedding(imageBuffer, options);
  const rawImage = await RawImage.fromBlob(new Blob([normalizedBuffer], { type: 'image/png' }));
  const extractor = await getImageFeatureExtractor(options);
  const output = await extractor(rawImage, {
    pooling: 'mean',
    normalize: true,
  });
  const embedding = l2Normalize(Array.from(output.data, Number));

  return {
    embedding,
    dimensions: embedding.length,
    elapsed_ms: roundMs(performance.now() - startedAt),
    model: options.model ?? EMBEDDING_INDEX_V1.model,
    source: EMBEDDING_INDEX_V1.source,
  };
}

export async function buildEmbeddingIndex(entries, options = {}) {
  if (!Array.isArray(entries)) throw new Error('embedding_index_entries_must_be_array');
  const onSkip = typeof options.onSkip === 'function' ? options.onSkip : () => {};
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const references = [];
  const timings = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    try {
      const row = await embeddingIndexEntry(entry, options);
      timings.push(row.embedding_ms);
      references.push(row);
      onProgress({ index: index + 1, total: entries.length, entry, row });
    } catch (error) {
      onSkip({
        entry,
        reason: error?.message || String(error),
      });
    }
  }

  return {
    version: EMBEDDING_INDEX_V1.name,
    source: EMBEDDING_INDEX_V1.source,
    model: options.model ?? EMBEDDING_INDEX_V1.model,
    dimensions: references[0]?.embedding?.length ?? EMBEDDING_INDEX_V1.dimensions,
    reference_count: references.length,
    embedding_ms_avg: average(timings),
    embedding_ms_max: maxOrNull(timings),
    references,
  };
}

export async function buildMultiViewEmbeddingIndex(entries, options = {}) {
  if (!Array.isArray(entries)) throw new Error('embedding_index_entries_must_be_array');
  const onSkip = typeof options.onSkip === 'function' ? options.onSkip : () => {};
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const viewGenerator = typeof options.viewGenerator === 'function'
    ? options.viewGenerator
    : defaultReferenceViews;
  const references = [];
  const timings = [];
  let totalViews = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    try {
      const row = await multiViewEmbeddingIndexEntry(entry, {
        ...options,
        viewGenerator,
      });
      totalViews += row.views.length;
      for (const view of row.views) timings.push(view.embedding_ms);
      references.push(row);
      onProgress({ index: index + 1, total: entries.length, entry, row });
    } catch (error) {
      onSkip({
        entry,
        reason: error?.message || String(error),
      });
    }
  }

  return {
    version: `${EMBEDDING_INDEX_V1.name}_multiview`,
    source: EMBEDDING_INDEX_V1.source,
    model: options.model ?? EMBEDDING_INDEX_V1.model,
    dimensions: references[0]?.views?.[0]?.embedding?.length ?? EMBEDDING_INDEX_V1.dimensions,
    reference_count: references.length,
    reference_view_count: totalViews,
    views_per_reference_avg: references.length === 0 ? null : round6(totalViews / references.length),
    embedding_ms_avg: average(timings),
    embedding_ms_max: maxOrNull(timings),
    references,
  };
}

export async function embeddingIndexEntry(entry, options = {}) {
  const cardId = normalizeId(entry.card_id ?? entry.id ?? entry.cardPrintId);
  if (!cardId) throw new Error('embedding_index_entry_missing_card_id');

  const imageBuffer = await resolveArtworkBuffer(entry);
  const result = await embedImageBuffer(imageBuffer, options);

  return {
    card_id: cardId,
    gv_id: entry.gv_id ?? null,
    name: entry.name ?? null,
    set_code: entry.set_code ?? null,
    number: entry.number ?? null,
    variant_key: entry.variant_key ?? null,
    image_url: entry.image_url ?? null,
    source_path: entry.art_image_path ?? entry.full_image_path ?? entry.image_path ?? null,
    embedding_model: result.model,
    embedding_source: result.source,
    embedding_ms: result.elapsed_ms,
    embedding: result.embedding,
  };
}

export async function multiViewEmbeddingIndexEntry(entry, options = {}) {
  const cardId = normalizeId(entry.card_id ?? entry.id ?? entry.cardPrintId);
  if (!cardId) throw new Error('embedding_index_entry_missing_card_id');
  const viewGenerator = typeof options.viewGenerator === 'function'
    ? options.viewGenerator
    : defaultReferenceViews;
  const views = await viewGenerator(entry);
  if (!Array.isArray(views) || views.length === 0) {
    throw new Error(`embedding_index_entry_missing_views:${cardId}`);
  }

  const embeddedViews = [];
  for (const view of views) {
    const imageBuffer = view.buffer ?? view.image_buffer;
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new Error(`embedding_index_entry_invalid_view:${cardId}:${view.view_type ?? 'unknown'}`);
    }
    const result = await embedImageBuffer(imageBuffer, options);
    embeddedViews.push({
      view_type: view.view_type ?? 'unknown',
      source: view.source ?? null,
      embedding_model: result.model,
      embedding_source: result.source,
      embedding_ms: result.elapsed_ms,
      embedding: result.embedding,
    });
  }

  return {
    card_id: cardId,
    gv_id: entry.gv_id ?? null,
    name: entry.name ?? null,
    set_code: entry.set_code ?? null,
    number: entry.number ?? null,
    variant_key: entry.variant_key ?? null,
    image_url: entry.image_url ?? null,
    source_path: entry.art_image_path ?? entry.full_image_path ?? entry.image_path ?? null,
    views: embeddedViews,
  };
}

export async function embedScannerQuery(entry, options = {}) {
  const queryId = normalizeId(entry.query_id ?? entry.id ?? entry.source_name ?? entry.source_dir);
  if (!queryId) throw new Error('scanner_embedding_query_missing_id');
  const artPath = entry.art_image_path ?? entry.artwork_region_path;
  if (!artPath) throw new Error(`scanner_embedding_query_missing_artwork_image:${queryId}`);

  const result = await embedImagePath(artPath, options);
  return {
    query_id: queryId,
    source_name: entry.source_name ?? null,
    source_dir: entry.source_dir ?? null,
    artwork_region_path: artPath,
    expected_card_id: normalizeId(entry.expected_card_id),
    expected_label: entry.expected_label ?? null,
    embedding_model: result.model,
    embedding_source: result.source,
    embedding_ms: result.elapsed_ms,
    embedding: result.embedding,
    metrics: entry.metrics ?? null,
  };
}

export function rankEmbeddingCandidates({
  query,
  references,
  topN = 50,
}) {
  if (!query) throw new Error('rank_embedding_candidates_missing_query');
  if (!Array.isArray(references)) throw new Error('rank_embedding_candidates_missing_references');
  const queryVector = l2Normalize(query.embedding);

  return references
    .filter((reference) => Array.isArray(reference.embedding) && reference.embedding.length > 0)
    .map((reference) => {
      const distance = cosineDistance(queryVector, reference.embedding);
      return {
        card_id: reference.card_id,
        gv_id: reference.gv_id ?? null,
        name: reference.name ?? null,
        set_code: reference.set_code ?? null,
        number: reference.number ?? null,
        variant_key: reference.variant_key ?? null,
        image_url: reference.image_url ?? null,
        source_path: reference.source_path ?? null,
        distance: round6(distance),
        similarity: round6(1 - distance),
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topN)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

export function rankEmbeddingViewCandidates({
  queryEmbedding,
  references,
  topN = 50,
  queryCropType = null,
}) {
  if (!Array.isArray(queryEmbedding)) throw new Error('rank_embedding_view_candidates_missing_query_embedding');
  if (!Array.isArray(references)) throw new Error('rank_embedding_view_candidates_missing_references');
  const queryVector = l2Normalize(queryEmbedding);
  const rows = [];

  for (const reference of references) {
    for (const view of reference.views ?? []) {
      if (!Array.isArray(view.embedding) || view.embedding.length === 0) continue;
      const distance = cosineDistance(queryVector, view.embedding);
      rows.push({
        card_id: reference.card_id,
        gv_id: reference.gv_id ?? null,
        name: reference.name ?? null,
        set_code: reference.set_code ?? null,
        number: reference.number ?? null,
        variant_key: reference.variant_key ?? null,
        image_url: reference.image_url ?? null,
        source_path: reference.source_path ?? null,
        reference_view_type: view.view_type ?? null,
        query_crop_type: queryCropType,
        distance: round6(distance),
        similarity: round6(1 - distance),
      });
    }
  }

  return rows
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (String(a.card_id) !== String(b.card_id)) return String(a.card_id).localeCompare(String(b.card_id));
      return String(a.reference_view_type).localeCompare(String(b.reference_view_type));
    })
    .slice(0, topN)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

export function cosineDistance(left, right) {
  const a = l2Normalize(left);
  const b = l2Normalize(right);
  const length = Math.min(a.length, b.length);
  if (length === 0) return 1;
  let dot = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(2, 1 - dot));
}

export function l2Normalize(vector) {
  if (!Array.isArray(vector) && !(vector instanceof Float32Array) && !(vector instanceof Float64Array)) {
    return [];
  }
  let sumSquares = 0;
  for (const value of vector) {
    const number = Number(value);
    if (Number.isFinite(number)) sumSquares += number * number;
  }
  if (sumSquares <= 0) return Array.from(vector, () => 0);
  const scale = 1 / Math.sqrt(sumSquares);
  return Array.from(vector, (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number * scale : 0;
  });
}

async function resolveArtworkBuffer(entry) {
  if (Buffer.isBuffer(entry.art_image_buffer) && entry.art_image_buffer.length > 0) {
    return entry.art_image_buffer;
  }
  if (entry.art_image_path) {
    return readFile(entry.art_image_path);
  }
  if (Buffer.isBuffer(entry.full_image_buffer) && entry.full_image_buffer.length > 0) {
    return extractArtworkRegionBuffer(entry.full_image_buffer);
  }
  const fullPath = entry.full_image_path ?? entry.image_path;
  if (!fullPath) throw new Error('embedding_index_entry_missing_image');
  return extractArtworkRegionBuffer(await readFile(fullPath));
}

async function defaultReferenceViews(entry) {
  const artBuffer = await resolveArtworkBuffer(entry);
  return [
    {
      view_type: 'artwork',
      source: 'default_artwork_crop',
      buffer: artBuffer,
    },
  ];
}

async function normalizeImageForEmbedding(imageBuffer, options = {}) {
  const preprocessing = {
    ...EMBEDDING_INDEX_V1.preprocessing,
    ...(options.preprocessing ?? {}),
  };

  return sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: preprocessing.width,
      height: preprocessing.height,
      fit: preprocessing.fit,
    })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function getImageFeatureExtractor(options = {}) {
  const model = options.model ?? EMBEDDING_INDEX_V1.model;
  const dtype = options.dtype ?? EMBEDDING_INDEX_V1.dtype;
  const key = `${model}:${dtype}`;
  if (!extractors.has(key)) {
    extractors.set(key, pipeline('image-feature-extraction', model, { dtype }));
  }
  return extractors.get(key);
}

async function extractArtworkRegionBuffer(fullCardBuffer) {
  const image = sharp(fullCardBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 20 || height < 20) {
    throw new Error('embedding_artwork_crop_invalid_dimensions');
  }

  const left = Math.max(0, Math.round(width * 0.075));
  const top = Math.max(0, Math.round(height * 0.155));
  const cropWidth = Math.max(1, Math.min(width - left, Math.round(width * 0.85)));
  const cropHeight = Math.max(1, Math.min(height - top, Math.round(height * 0.34)));

  return image
    .extract({
      left,
      top,
      width: cropWidth,
      height: cropHeight,
    })
    .jpeg({ quality: 92 })
    .toBuffer();
}

function normalizeId(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return round6(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

function maxOrNull(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return Math.max(...finite);
}

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}
