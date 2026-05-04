import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

export const VISUAL_DESCRIPTOR_V1 = {
  name: 'identity_v3_visual_descriptor_v1',
  color_histogram_bins_per_channel: 4,
  color_histogram_length: 64,
  grid_width: 12,
  grid_height: 16,
  edge_grid_width: 12,
  edge_grid_height: 16,
  score_weights: {
    full_card: 0.34,
    artwork: 0.66,
    histogram: 0.28,
    color_grid: 0.52,
    edge_grid: 0.20,
  },
};

export async function computeVisualDescriptorFromPath(imagePath) {
  return computeVisualDescriptorFromBuffer(await readFile(imagePath));
}

export async function computeVisualDescriptorFromBuffer(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('visual_descriptor_invalid_image_buffer');
  }

  const [histogram, colorGrid, edgeGrid, metadata] = await Promise.all([
    computeColorHistogram(imageBuffer),
    computeColorGrid(imageBuffer),
    computeEdgeGrid(imageBuffer),
    imageMetadata(imageBuffer),
  ]);

  return {
    version: VISUAL_DESCRIPTOR_V1.name,
    source_width: metadata.width,
    source_height: metadata.height,
    color_histogram: histogram,
    color_grid: colorGrid,
    edge_grid: edgeGrid,
  };
}

export function compareRegionDescriptors(query, reference) {
  const colorScore = histogramL1Distance(query.color_histogram, reference.color_histogram);
  const gridScore = vectorMeanAbsoluteDistance(query.color_grid, reference.color_grid);
  const edgeScore = vectorMeanAbsoluteDistance(query.edge_grid, reference.edge_grid);
  const finalScore = (
    (colorScore * VISUAL_DESCRIPTOR_V1.score_weights.histogram) +
      (gridScore * VISUAL_DESCRIPTOR_V1.score_weights.color_grid) +
      (edgeScore * VISUAL_DESCRIPTOR_V1.score_weights.edge_grid)
  );

  return {
    color_score: round6(colorScore),
    grid_score: round6(gridScore),
    edge_score: round6(edgeScore),
    final_score: round6(finalScore),
  };
}

export function compareVisualDescriptors(query, reference) {
  const full = compareRegionDescriptors(query.full_card_descriptor, reference.full_card_descriptor);
  const artwork = compareRegionDescriptors(query.artwork_descriptor, reference.artwork_descriptor);
  const finalScore = (
    (full.final_score * VISUAL_DESCRIPTOR_V1.score_weights.full_card) +
      (artwork.final_score * VISUAL_DESCRIPTOR_V1.score_weights.artwork)
  );

  return {
    final_score: round6(finalScore),
    full_card_score: full.final_score,
    artwork_score: artwork.final_score,
    color_score: round6(
      (full.color_score * VISUAL_DESCRIPTOR_V1.score_weights.full_card) +
        (artwork.color_score * VISUAL_DESCRIPTOR_V1.score_weights.artwork),
    ),
    grid_score: round6(
      (full.grid_score * VISUAL_DESCRIPTOR_V1.score_weights.full_card) +
        (artwork.grid_score * VISUAL_DESCRIPTOR_V1.score_weights.artwork),
    ),
    edge_score: round6(
      (full.edge_score * VISUAL_DESCRIPTOR_V1.score_weights.full_card) +
        (artwork.edge_score * VISUAL_DESCRIPTOR_V1.score_weights.artwork),
    ),
    full_card_breakdown: full,
    artwork_breakdown: artwork,
  };
}

export function rankVisualCandidates({ query, references, topN = 10 }) {
  if (!query) throw new Error('rank_visual_candidates_missing_query');
  if (!Array.isArray(references)) throw new Error('rank_visual_candidates_missing_references');

  return references
    .map((reference) => {
      const score = compareVisualDescriptors(query, reference);
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
        full_card_score: score.full_card_score,
        artwork_score: score.artwork_score,
        color_score: score.color_score,
        grid_score: score.grid_score,
        edge_score: score.edge_score,
        score_breakdown: {
          full_card: score.full_card_breakdown,
          artwork: score.artwork_breakdown,
        },
      };
    })
    .sort((a, b) => {
      if (a.final_score !== b.final_score) return a.final_score - b.final_score;
      if (a.artwork_score !== b.artwork_score) return a.artwork_score - b.artwork_score;
      if (a.full_card_score !== b.full_card_score) return a.full_card_score - b.full_card_score;
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topN);
}

async function computeColorHistogram(imageBuffer) {
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: 96,
      height: 128,
      fit: 'fill',
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 3) throw new Error('visual_descriptor_histogram_unexpected_channels');
  const bins = VISUAL_DESCRIPTOR_V1.color_histogram_bins_per_channel;
  const histogram = new Array(VISUAL_DESCRIPTOR_V1.color_histogram_length).fill(0);
  const pixels = info.width * info.height;

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const r = Math.min(bins - 1, Math.floor(data[offset] / (256 / bins)));
    const g = Math.min(bins - 1, Math.floor(data[offset + 1] / (256 / bins)));
    const b = Math.min(bins - 1, Math.floor(data[offset + 2] / (256 / bins)));
    histogram[(r * bins * bins) + (g * bins) + b] += 1;
  }

  return histogram.map((value) => round6(value / pixels));
}

async function computeColorGrid(imageBuffer) {
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: VISUAL_DESCRIPTOR_V1.grid_width,
      height: VISUAL_DESCRIPTOR_V1.grid_height,
      fit: 'fill',
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 3) throw new Error('visual_descriptor_grid_unexpected_channels');
  const grid = [];
  for (let offset = 0; offset < data.length; offset += info.channels) {
    grid.push(round6(data[offset] / 255));
    grid.push(round6(data[offset + 1] / 255));
    grid.push(round6(data[offset + 2] / 255));
  }
  return grid;
}

async function computeEdgeGrid(imageBuffer) {
  const width = VISUAL_DESCRIPTOR_V1.edge_grid_width;
  const height = VISUAL_DESCRIPTOR_V1.edge_grid_height;
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width,
      height,
      fit: 'fill',
    })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 1) throw new Error('visual_descriptor_edge_unexpected_channels');
  const grid = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const here = data[(y * width) + x];
      const right = data[(y * width) + Math.min(width - 1, x + 1)];
      const down = data[(Math.min(height - 1, y + 1) * width) + x];
      const gradient = (Math.abs(here - right) + Math.abs(here - down)) / 510;
      grid.push(round6(gradient));
    }
  }
  return grid;
}

async function imageMetadata(imageBuffer) {
  const metadata = await sharp(imageBuffer, { failOn: 'none' }).rotate().metadata();
  return {
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}

function histogramL1Distance(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    throw new Error('histogram_distance_shape_mismatch');
  }
  let sum = 0;
  for (let i = 0; i < left.length; i += 1) {
    sum += Math.abs(left[i] - right[i]);
  }
  return sum / 2;
}

function vectorMeanAbsoluteDistance(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    throw new Error('vector_distance_shape_mismatch');
  }
  let sum = 0;
  for (let i = 0; i < left.length; i += 1) {
    sum += Math.abs(left[i] - right[i]);
  }
  return sum / left.length;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}
