import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

import { extractArtworkRegionBuffer } from './hash_index_v1.mjs';

export const RERANK_COMPARATOR_V1 = {
  name: 'identity_v3_rerank_comparator_v1',
  input_size: {
    width: 160,
    height: 160,
  },
  edge_size: {
    width: 96,
    height: 96,
  },
  weights: {
    embedding_score: 0.50,
    pixel_score: 0.30,
    edge_score: 0.20,
  },
  pixel_score_weights: {
    l2_similarity: 0.55,
    ssim_like_similarity: 0.30,
    layout_similarity: 0.15,
  },
  reference_crop: 'hash_index_artwork_region_v1',
};

export async function compareQueryToReferenceCandidate({
  queryArtworkPath,
  candidate,
  referenceArtworkCache,
}) {
  if (!queryArtworkPath) throw new Error('rerank_missing_query_artwork_path');
  if (!candidate?.source_path) throw new Error(`rerank_missing_candidate_source_path:${candidate?.card_id ?? 'unknown'}`);

  const [queryDescriptor, referenceDescriptor] = await Promise.all([
    descriptorFromArtworkPath(queryArtworkPath),
    descriptorForReferenceCandidate(candidate, referenceArtworkCache),
  ]);

  const pixelL2Similarity = l2Similarity(queryDescriptor.rgb, referenceDescriptor.rgb);
  const ssimLikeSimilarity = ssimLike(queryDescriptor.luma, referenceDescriptor.luma);
  const layoutSimilarity = layoutSimilarityScore(queryDescriptor.layout, referenceDescriptor.layout);
  const pixelScore = (
    (pixelL2Similarity * RERANK_COMPARATOR_V1.pixel_score_weights.l2_similarity) +
    (ssimLikeSimilarity * RERANK_COMPARATOR_V1.pixel_score_weights.ssim_like_similarity) +
    (layoutSimilarity * RERANK_COMPARATOR_V1.pixel_score_weights.layout_similarity)
  );
  const edgeScore = edgeSimilarity(queryDescriptor.edge, referenceDescriptor.edge);
  const embeddingScore = Number.isFinite(candidate.similarity)
    ? candidate.similarity
    : Math.max(0, Math.min(1, 1 - Number(candidate.distance ?? 1)));
  const finalScore = (
    (embeddingScore * RERANK_COMPARATOR_V1.weights.embedding_score) +
    (pixelScore * RERANK_COMPARATOR_V1.weights.pixel_score) +
    (edgeScore * RERANK_COMPARATOR_V1.weights.edge_score)
  );

  return {
    card_id: candidate.card_id,
    gv_id: candidate.gv_id ?? null,
    name: candidate.name ?? null,
    set_code: candidate.set_code ?? null,
    number: candidate.number ?? null,
    variant_key: candidate.variant_key ?? null,
    image_url: candidate.image_url ?? null,
    source_path: candidate.source_path ?? null,
    v5_rank: candidate.rank ?? null,
    v5_distance: round6(candidate.distance ?? null),
    embedding_score: round6(embeddingScore),
    pixel_score: round6(pixelScore),
    pixel_l2_similarity: round6(pixelL2Similarity),
    ssim_like_similarity: round6(ssimLikeSimilarity),
    layout_similarity: round6(layoutSimilarity),
    edge_score: round6(edgeScore),
    final_score: round6(finalScore),
  };
}

export async function rerankCandidates({
  queryArtworkPath,
  candidates,
  topN = 10,
}) {
  const referenceArtworkCache = new Map();
  const topCandidates = candidates.slice(0, topN);
  const scored = [];
  const skipped = [];

  for (const candidate of topCandidates) {
    try {
      scored.push(await compareQueryToReferenceCandidate({
        queryArtworkPath,
        candidate,
        referenceArtworkCache,
      }));
    } catch (error) {
      skipped.push({
        card_id: candidate?.card_id ?? null,
        v5_rank: candidate?.rank ?? null,
        reason: error?.message || String(error),
      });
    }
  }

  scored.sort((a, b) => {
    if (a.final_score !== b.final_score) return b.final_score - a.final_score;
    if (a.edge_score !== b.edge_score) return b.edge_score - a.edge_score;
    if (a.pixel_score !== b.pixel_score) return b.pixel_score - a.pixel_score;
    return String(a.card_id).localeCompare(String(b.card_id));
  });

  return {
    reranked_candidates: scored.map((candidate, index) => ({
      ...candidate,
      rerank_rank: index + 1,
    })),
    skipped_candidates: skipped,
  };
}

async function descriptorForReferenceCandidate(candidate, cache) {
  if (cache.has(candidate.source_path)) {
    return cache.get(candidate.source_path);
  }
  const fullBuffer = await readFile(candidate.source_path);
  const artworkBuffer = await extractArtworkRegionBuffer(fullBuffer);
  const descriptor = await descriptorFromArtworkBuffer(artworkBuffer);
  cache.set(candidate.source_path, descriptor);
  return descriptor;
}

async function descriptorFromArtworkPath(imagePath) {
  return descriptorFromArtworkBuffer(await readFile(imagePath));
}

async function descriptorFromArtworkBuffer(imageBuffer) {
  const { width, height } = RERANK_COMPARATOR_V1.input_size;
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width, height, fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels < 3) throw new Error('rerank_unexpected_rgb_channels');

  const rgb = new Float32Array(width * height * 3);
  const luma = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * info.channels;
    const red = data[offset] / 255;
    const green = data[offset + 1] / 255;
    const blue = data[offset + 2] / 255;
    rgb[(index * 3)] = red;
    rgb[(index * 3) + 1] = green;
    rgb[(index * 3) + 2] = blue;
    luma[index] = (red * 0.299) + (green * 0.587) + (blue * 0.114);
  }

  return {
    rgb,
    luma,
    width,
    height,
    edge: edgeMap(luma, width, height),
    layout: layoutDescriptor({ rgb, luma, width, height }),
  };
}

function l2Similarity(left, right) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < length; i += 1) {
    const delta = left[i] - right[i];
    sumSquares += delta * delta;
  }
  const rmse = Math.sqrt(sumSquares / length);
  return clamp01(1 - rmse);
}

function ssimLike(left, right) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let leftSum = 0;
  let rightSum = 0;
  for (let i = 0; i < length; i += 1) {
    leftSum += left[i];
    rightSum += right[i];
  }
  const leftMean = leftSum / length;
  const rightMean = rightSum / length;

  let leftVariance = 0;
  let rightVariance = 0;
  let covariance = 0;
  for (let i = 0; i < length; i += 1) {
    const leftDelta = left[i] - leftMean;
    const rightDelta = right[i] - rightMean;
    leftVariance += leftDelta * leftDelta;
    rightVariance += rightDelta * rightDelta;
    covariance += leftDelta * rightDelta;
  }
  leftVariance /= length;
  rightVariance /= length;
  covariance /= length;

  const c1 = 0.01 * 0.01;
  const c2 = 0.03 * 0.03;
  const numerator = ((2 * leftMean * rightMean) + c1) * ((2 * covariance) + c2);
  const denominator = ((leftMean * leftMean) + (rightMean * rightMean) + c1) * (leftVariance + rightVariance + c2);
  if (denominator === 0) return 0;
  return clamp01((numerator / denominator + 1) / 2);
}

function edgeMap(luma, width, height) {
  const edge = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const topLeft = luma[((y - 1) * width) + x - 1];
      const top = luma[((y - 1) * width) + x];
      const topRight = luma[((y - 1) * width) + x + 1];
      const left = luma[(y * width) + x - 1];
      const right = luma[(y * width) + x + 1];
      const bottomLeft = luma[((y + 1) * width) + x - 1];
      const bottom = luma[((y + 1) * width) + x];
      const bottomRight = luma[((y + 1) * width) + x + 1];
      const gx = (-topLeft - (2 * left) - bottomLeft) + (topRight + (2 * right) + bottomRight);
      const gy = (-topLeft - (2 * top) - topRight) + (bottomLeft + (2 * bottom) + bottomRight);
      edge[(y * width) + x] = clamp01(Math.sqrt((gx * gx) + (gy * gy)) / 4);
    }
  }
  return edge;
}

function edgeSimilarity(left, right) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  let l1 = 0;
  for (let i = 0; i < length; i += 1) {
    dot += left[i] * right[i];
    leftNorm += left[i] * left[i];
    rightNorm += right[i] * right[i];
    l1 += Math.abs(left[i] - right[i]);
  }
  const cosine = leftNorm > 0 && rightNorm > 0
    ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
    : 0;
  const l1Similarity = 1 - (l1 / length);
  return clamp01((cosine * 0.65) + (l1Similarity * 0.35));
}

function layoutDescriptor({ rgb, luma, width, height }) {
  const bands = [];
  const bandCount = 5;
  for (let band = 0; band < bandCount; band += 1) {
    const startY = Math.floor((band / bandCount) * height);
    const endY = Math.floor(((band + 1) / bandCount) * height);
    let red = 0;
    let green = 0;
    let blue = 0;
    let lumaSum = 0;
    let lumaSqSum = 0;
    let edgeSum = 0;
    let count = 0;
    for (let y = startY; y < endY; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width) + x;
        red += rgb[(index * 3)];
        green += rgb[(index * 3) + 1];
        blue += rgb[(index * 3) + 2];
        lumaSum += luma[index];
        lumaSqSum += luma[index] * luma[index];
        if (x + 1 < width) edgeSum += Math.abs(luma[index] - luma[index + 1]);
        if (y + 1 < height) edgeSum += Math.abs(luma[index] - luma[index + width]);
        count += 1;
      }
    }
    const mean = count === 0 ? 0 : lumaSum / count;
    bands.push(
      count === 0 ? 0 : red / count,
      count === 0 ? 0 : green / count,
      count === 0 ? 0 : blue / count,
      mean,
      count === 0 ? 0 : Math.max(0, (lumaSqSum / count) - (mean * mean)),
      count === 0 ? 0 : edgeSum / (count * 2),
    );
  }
  return bands;
}

function layoutSimilarityScore(left, right) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += Math.abs(left[i] - right[i]);
  }
  return clamp01(1 - (sum / length));
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round6(value) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(Number(value))) return null;
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}
