import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

export const PATCH_DESCRIPTOR_V1 = {
  name: 'identity_v3_patch_descriptor_v1',
  grid_width: 6,
  grid_height: 6,
  patch_width: 24,
  patch_height: 24,
  color_histogram_bins_per_channel: 4,
  color_histogram_length: 64,
  patch_score_weights: {
    color_histogram: 0.45,
    mean_rgb: 0.35,
    edge_strength: 0.20,
  },
  patch_quality: {
    min_luma_variance: 0.0015,
    min_luma_mean: 0.04,
    max_luma_mean: 0.96,
  },
  patch_position_weights: {
    center: 2.0,
    middle: 1.25,
    edge: 0.5,
  },
};

export async function computePatchDescriptorFromPath(imagePath) {
  return computePatchDescriptorFromBuffer(await readFile(imagePath));
}

export async function computePatchDescriptorFromBuffer(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('patch_descriptor_invalid_image_buffer');
  }

  const targetWidth = PATCH_DESCRIPTOR_V1.grid_width * PATCH_DESCRIPTOR_V1.patch_width;
  const targetHeight = PATCH_DESCRIPTOR_V1.grid_height * PATCH_DESCRIPTOR_V1.patch_height;
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'fill',
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 3) throw new Error('patch_descriptor_unexpected_channels');

  const patches = [];
  for (let gridY = 0; gridY < PATCH_DESCRIPTOR_V1.grid_height; gridY += 1) {
    for (let gridX = 0; gridX < PATCH_DESCRIPTOR_V1.grid_width; gridX += 1) {
      patches.push(computePatch(data, info, gridX, gridY));
    }
  }

  const validPatches = patches.filter((patch) => patch.valid).length;
  return {
    version: PATCH_DESCRIPTOR_V1.name,
    source_width: info.width,
    source_height: info.height,
    normalized_width: targetWidth,
    normalized_height: targetHeight,
    grid_width: PATCH_DESCRIPTOR_V1.grid_width,
    grid_height: PATCH_DESCRIPTOR_V1.grid_height,
    patch_width: PATCH_DESCRIPTOR_V1.patch_width,
    patch_height: PATCH_DESCRIPTOR_V1.patch_height,
    valid_patch_count: validPatches,
    invalid_patch_count: patches.length - validPatches,
    patches,
  };
}

export function comparePatchDescriptors(query, reference) {
  if (!query || !reference) throw new Error('compare_patch_descriptors_missing_descriptor');
  if (!Array.isArray(query.patches) || !Array.isArray(reference.patches)) {
    throw new Error('compare_patch_descriptors_missing_patches');
  }
  if (query.patches.length !== reference.patches.length) {
    throw new Error('compare_patch_descriptors_shape_mismatch');
  }

  const patchScores = [];
  const aggregate = {
    weighted_score_sum: 0,
    weight_sum: 0,
    histogram_score_sum: 0,
    mean_rgb_score_sum: 0,
    edge_score_sum: 0,
    used_patch_count: 0,
    ignored_patch_count: 0,
    query_invalid_patch_count: 0,
    reference_invalid_patch_count: 0,
  };

  for (let index = 0; index < query.patches.length; index += 1) {
    const queryPatch = query.patches[index];
    const referencePatch = reference.patches[index];
    const weight = patchWeight(queryPatch.grid_x, queryPatch.grid_y);
    const queryValid = queryPatch.valid;
    const referenceValid = referencePatch.valid;

    if (!queryValid || !referenceValid) {
      aggregate.ignored_patch_count += 1;
      if (!queryValid) aggregate.query_invalid_patch_count += 1;
      if (!referenceValid) aggregate.reference_invalid_patch_count += 1;
      patchScores.push({
        index,
        grid_x: queryPatch.grid_x,
        grid_y: queryPatch.grid_y,
        weight,
        used: false,
        query_reasons: queryPatch.rejection_reasons,
        reference_reasons: referencePatch.rejection_reasons,
      });
      continue;
    }

    const histogramScore = histogramL1Distance(queryPatch.color_histogram, referencePatch.color_histogram);
    const meanRgbScore = meanRgbDistance(queryPatch.mean_rgb, referencePatch.mean_rgb);
    const edgeScore = Math.abs(queryPatch.edge_strength - referencePatch.edge_strength);
    const patchScore = (
      (histogramScore * PATCH_DESCRIPTOR_V1.patch_score_weights.color_histogram) +
      (meanRgbScore * PATCH_DESCRIPTOR_V1.patch_score_weights.mean_rgb) +
      (edgeScore * PATCH_DESCRIPTOR_V1.patch_score_weights.edge_strength)
    );

    aggregate.used_patch_count += 1;
    aggregate.weighted_score_sum += patchScore * weight;
    aggregate.weight_sum += weight;
    aggregate.histogram_score_sum += histogramScore;
    aggregate.mean_rgb_score_sum += meanRgbScore;
    aggregate.edge_score_sum += edgeScore;
    patchScores.push({
      index,
      grid_x: queryPatch.grid_x,
      grid_y: queryPatch.grid_y,
      weight,
      used: true,
      patch_score: round6(patchScore),
      histogram_score: round6(histogramScore),
      mean_rgb_score: round6(meanRgbScore),
      edge_score: round6(edgeScore),
    });
  }

  if (aggregate.used_patch_count === 0) {
    return compareWithAllPatches(query, reference);
  }

  return {
    final_score: round6(aggregate.weighted_score_sum / aggregate.weight_sum),
    histogram_score: round6(aggregate.histogram_score_sum / aggregate.used_patch_count),
    mean_rgb_score: round6(aggregate.mean_rgb_score_sum / aggregate.used_patch_count),
    edge_score: round6(aggregate.edge_score_sum / aggregate.used_patch_count),
    used_patch_count: aggregate.used_patch_count,
    ignored_patch_count: aggregate.ignored_patch_count,
    query_invalid_patch_count: aggregate.query_invalid_patch_count,
    reference_invalid_patch_count: aggregate.reference_invalid_patch_count,
    comparable_weight_sum: round6(aggregate.weight_sum),
    fallback_used_all_patches: false,
    patch_scores: patchScores,
  };
}

export function rankPatchCandidates({ query, references, topN = 10 }) {
  if (!query) throw new Error('rank_patch_candidates_missing_query');
  if (!Array.isArray(references)) throw new Error('rank_patch_candidates_missing_references');

  return references
    .map((reference) => {
      const score = comparePatchDescriptors(query.artwork_descriptor, reference.artwork_descriptor);
      return {
        card_id: reference.card_id,
        gv_id: reference.gv_id ?? null,
        name: reference.name ?? null,
        set_code: reference.set_code ?? null,
        number: reference.number ?? null,
        variant_key: reference.variant_key ?? null,
        image_url: reference.image_url ?? null,
        source_path: reference.source_path ?? null,
        final_score: score.final_score,
        histogram_score: score.histogram_score,
        mean_rgb_score: score.mean_rgb_score,
        edge_score: score.edge_score,
        used_patch_count: score.used_patch_count,
        ignored_patch_count: score.ignored_patch_count,
        query_invalid_patch_count: score.query_invalid_patch_count,
        reference_invalid_patch_count: score.reference_invalid_patch_count,
        comparable_weight_sum: score.comparable_weight_sum,
        fallback_used_all_patches: score.fallback_used_all_patches,
        patch_scores: score.patch_scores,
      };
    })
    .sort((a, b) => {
      if (a.final_score !== b.final_score) return a.final_score - b.final_score;
      if (a.used_patch_count !== b.used_patch_count) return b.used_patch_count - a.used_patch_count;
      if (a.ignored_patch_count !== b.ignored_patch_count) return a.ignored_patch_count - b.ignored_patch_count;
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topN);
}

function computePatch(data, info, gridX, gridY) {
  const bins = PATCH_DESCRIPTOR_V1.color_histogram_bins_per_channel;
  const histogram = new Array(PATCH_DESCRIPTOR_V1.color_histogram_length).fill(0);
  const startX = gridX * PATCH_DESCRIPTOR_V1.patch_width;
  const startY = gridY * PATCH_DESCRIPTOR_V1.patch_height;
  const endX = startX + PATCH_DESCRIPTOR_V1.patch_width;
  const endY = startY + PATCH_DESCRIPTOR_V1.patch_height;
  const pixelCount = PATCH_DESCRIPTOR_V1.patch_width * PATCH_DESCRIPTOR_V1.patch_height;
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let lumaSum = 0;
  let lumaSqSum = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = ((y * info.width) + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const luma = normalizedLuma(red, green, blue);
      redSum += red;
      greenSum += green;
      blueSum += blue;
      lumaSum += luma;
      lumaSqSum += luma * luma;

      const rBin = Math.min(bins - 1, Math.floor(red / (256 / bins)));
      const gBin = Math.min(bins - 1, Math.floor(green / (256 / bins)));
      const bBin = Math.min(bins - 1, Math.floor(blue / (256 / bins)));
      histogram[(rBin * bins * bins) + (gBin * bins) + bBin] += 1;

      if (x + 1 < endX && y + 1 < endY) {
        const rightOffset = ((y * info.width) + (x + 1)) * info.channels;
        const downOffset = (((y + 1) * info.width) + x) * info.channels;
        const rightLuma = normalizedLuma(data[rightOffset], data[rightOffset + 1], data[rightOffset + 2]);
        const downLuma = normalizedLuma(data[downOffset], data[downOffset + 1], data[downOffset + 2]);
        edgeSum += (Math.abs(luma - rightLuma) + Math.abs(luma - downLuma)) / 2;
        edgeCount += 1;
      }
    }
  }

  const lumaMean = lumaSum / pixelCount;
  const lumaVariance = Math.max(0, (lumaSqSum / pixelCount) - (lumaMean * lumaMean));
  const rejectionReasons = patchRejectionReasons({ lumaMean, lumaVariance });
  return {
    index: (gridY * PATCH_DESCRIPTOR_V1.grid_width) + gridX,
    grid_x: gridX,
    grid_y: gridY,
    weight: patchWeight(gridX, gridY),
    valid: rejectionReasons.length === 0,
    rejection_reasons: rejectionReasons,
    mean_rgb: [
      round6(redSum / pixelCount / 255),
      round6(greenSum / pixelCount / 255),
      round6(blueSum / pixelCount / 255),
    ],
    luma_mean: round6(lumaMean),
    luma_variance: round6(lumaVariance),
    edge_strength: round6(edgeCount > 0 ? edgeSum / edgeCount : 0),
    color_histogram: histogram.map((value) => round6(value / pixelCount)),
  };
}

function compareWithAllPatches(query, reference) {
  let weightedScoreSum = 0;
  let weightSum = 0;
  let histogramScoreSum = 0;
  let meanRgbScoreSum = 0;
  let edgeScoreSum = 0;
  const patchScores = [];

  for (let index = 0; index < query.patches.length; index += 1) {
    const queryPatch = query.patches[index];
    const referencePatch = reference.patches[index];
    const weight = patchWeight(queryPatch.grid_x, queryPatch.grid_y);
    const histogramScore = histogramL1Distance(queryPatch.color_histogram, referencePatch.color_histogram);
    const meanRgbScore = meanRgbDistance(queryPatch.mean_rgb, referencePatch.mean_rgb);
    const edgeScore = Math.abs(queryPatch.edge_strength - referencePatch.edge_strength);
    const patchScore = (
      (histogramScore * PATCH_DESCRIPTOR_V1.patch_score_weights.color_histogram) +
      (meanRgbScore * PATCH_DESCRIPTOR_V1.patch_score_weights.mean_rgb) +
      (edgeScore * PATCH_DESCRIPTOR_V1.patch_score_weights.edge_strength)
    );

    weightedScoreSum += patchScore * weight;
    weightSum += weight;
    histogramScoreSum += histogramScore;
    meanRgbScoreSum += meanRgbScore;
    edgeScoreSum += edgeScore;
    patchScores.push({
      index,
      grid_x: queryPatch.grid_x,
      grid_y: queryPatch.grid_y,
      weight,
      used: true,
      patch_score: round6(patchScore),
      histogram_score: round6(histogramScore),
      mean_rgb_score: round6(meanRgbScore),
      edge_score: round6(edgeScore),
    });
  }

  return {
    final_score: round6(weightedScoreSum / weightSum),
    histogram_score: round6(histogramScoreSum / query.patches.length),
    mean_rgb_score: round6(meanRgbScoreSum / query.patches.length),
    edge_score: round6(edgeScoreSum / query.patches.length),
    used_patch_count: query.patches.length,
    ignored_patch_count: 0,
    query_invalid_patch_count: query.patches.filter((patch) => !patch.valid).length,
    reference_invalid_patch_count: reference.patches.filter((patch) => !patch.valid).length,
    comparable_weight_sum: round6(weightSum),
    fallback_used_all_patches: true,
    patch_scores: patchScores,
  };
}

function patchRejectionReasons({ lumaMean, lumaVariance }) {
  const reasons = [];
  if (lumaVariance < PATCH_DESCRIPTOR_V1.patch_quality.min_luma_variance) reasons.push('low_variance');
  if (lumaMean < PATCH_DESCRIPTOR_V1.patch_quality.min_luma_mean) reasons.push('too_dark');
  if (lumaMean > PATCH_DESCRIPTOR_V1.patch_quality.max_luma_mean) reasons.push('too_bright');
  return reasons;
}

function patchWeight(gridX, gridY) {
  const centerX = (PATCH_DESCRIPTOR_V1.grid_width - 1) / 2;
  const centerY = (PATCH_DESCRIPTOR_V1.grid_height - 1) / 2;
  const dx = Math.abs(gridX - centerX) / centerX;
  const dy = Math.abs(gridY - centerY) / centerY;
  const distance = Math.max(dx, dy);
  if (distance <= 0.35) return PATCH_DESCRIPTOR_V1.patch_position_weights.center;
  if (distance <= 0.75) return PATCH_DESCRIPTOR_V1.patch_position_weights.middle;
  return PATCH_DESCRIPTOR_V1.patch_position_weights.edge;
}

function histogramL1Distance(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    throw new Error('patch_histogram_distance_shape_mismatch');
  }
  let sum = 0;
  for (let i = 0; i < left.length; i += 1) {
    sum += Math.abs(left[i] - right[i]);
  }
  return sum / 2;
}

function meanRgbDistance(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    throw new Error('patch_mean_rgb_distance_shape_mismatch');
  }
  let sum = 0;
  for (let i = 0; i < left.length; i += 1) {
    sum += Math.abs(left[i] - right[i]);
  }
  return sum / left.length;
}

function normalizedLuma(red, green, blue) {
  return ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}
