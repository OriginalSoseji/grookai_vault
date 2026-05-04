import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

import { extractArtworkRegionBuffer } from './hash_index_v1.mjs';

export const MULTICROP_GENERATOR_V1 = {
  name: 'identity_v3_multicrop_generator_v1',
  output: {
    width: 512,
    height: 512,
    format: 'png',
  },
  query_crop_types: [
    'artwork',
    'artwork_zoom_in_10',
    'shift_left',
    'shift_right',
    'shift_up',
    'shift_down',
    'center_tight',
    'full_card',
  ],
  reference_view_types: [
    'artwork',
    'artwork_zoom_in_10',
    'center_tight',
    'full_card',
    'full_card_upper',
    'full_card_middle',
  ],
};

export async function generateQueryCrops({
  normalizedFullCardPath,
  artworkRegionPath,
}) {
  if (!artworkRegionPath && !normalizedFullCardPath) {
    throw new Error('multicrop_query_missing_artifacts');
  }

  const crops = [];
  if (artworkRegionPath) {
    const artworkBuffer = await readFile(artworkRegionPath);
    crops.push({
      type: 'artwork',
      source: 'scanner_v3_artwork_region',
      buffer: await normalizeCropBuffer(artworkBuffer),
    });
    crops.push({
      type: 'artwork_zoom_in_10',
      source: 'scanner_v3_artwork_region',
      buffer: await normalizedRectCrop(artworkBuffer, rectFromCenter(0.50, 0.50, 0.90, 0.90)),
    });
    crops.push({
      type: 'shift_left',
      source: 'scanner_v3_artwork_region',
      buffer: await normalizedRectCrop(artworkBuffer, rectFromCenter(0.44, 0.50, 0.90, 0.92)),
    });
    crops.push({
      type: 'shift_right',
      source: 'scanner_v3_artwork_region',
      buffer: await normalizedRectCrop(artworkBuffer, rectFromCenter(0.56, 0.50, 0.90, 0.92)),
    });
    crops.push({
      type: 'shift_up',
      source: 'scanner_v3_artwork_region',
      buffer: await normalizedRectCrop(artworkBuffer, rectFromCenter(0.50, 0.44, 0.92, 0.90)),
    });
    crops.push({
      type: 'shift_down',
      source: 'scanner_v3_artwork_region',
      buffer: await normalizedRectCrop(artworkBuffer, rectFromCenter(0.50, 0.56, 0.92, 0.90)),
    });
    crops.push({
      type: 'center_tight',
      source: 'scanner_v3_artwork_region',
      buffer: await normalizedRectCrop(artworkBuffer, rectFromCenter(0.50, 0.50, 0.72, 0.72)),
    });
  }

  if (normalizedFullCardPath) {
    const fullCardBuffer = await readFile(normalizedFullCardPath);
    crops.push({
      type: 'full_card',
      source: 'scanner_v3_normalized_full_card',
      buffer: await normalizeCropBuffer(fullCardBuffer),
    });
  }

  return crops;
}

export async function generateReferenceViews(entry) {
  const fullPath = entry.full_image_path ?? entry.image_path;
  const artPath = entry.art_image_path;
  const views = [];
  let fullBuffer = null;
  let artBuffer = null;

  if (artPath) {
    artBuffer = await readFile(artPath);
  }
  if (fullPath) {
    fullBuffer = await readFile(fullPath);
  }
  if (!artBuffer && fullBuffer) {
    artBuffer = await extractArtworkRegionBuffer(fullBuffer);
  }
  if (!fullBuffer && artBuffer) {
    fullBuffer = artBuffer;
  }
  if (!artBuffer && !fullBuffer) {
    throw new Error('multicrop_reference_missing_image');
  }

  if (artBuffer) {
    views.push({
      view_type: 'artwork',
      source: 'reference_artwork_crop',
      buffer: await normalizeCropBuffer(artBuffer),
    });
    views.push({
      view_type: 'artwork_zoom_in_10',
      source: 'reference_artwork_crop',
      buffer: await normalizedRectCrop(artBuffer, rectFromCenter(0.50, 0.50, 0.90, 0.90)),
    });
    views.push({
      view_type: 'center_tight',
      source: 'reference_artwork_crop',
      buffer: await normalizedRectCrop(artBuffer, rectFromCenter(0.50, 0.50, 0.72, 0.72)),
    });
  }

  if (fullBuffer) {
    views.push({
      view_type: 'full_card',
      source: 'reference_full_card',
      buffer: await normalizeCropBuffer(fullBuffer),
    });
    views.push({
      view_type: 'full_card_upper',
      source: 'reference_full_card',
      buffer: await normalizedRectCrop(fullBuffer, {
        left: 0.06,
        top: 0.08,
        right: 0.94,
        bottom: 0.58,
      }),
    });
    views.push({
      view_type: 'full_card_middle',
      source: 'reference_full_card',
      buffer: await normalizedRectCrop(fullBuffer, {
        left: 0.06,
        top: 0.18,
        right: 0.94,
        bottom: 0.72,
      }),
    });
  }

  return views;
}

export async function normalizedRectCrop(imageBuffer, rect) {
  const image = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 10 || height < 10) {
    throw new Error('multicrop_invalid_image_dimensions');
  }
  const crop = rectToPixels(rect, width, height);
  return image
    .extract(crop)
    .resize({
      width: MULTICROP_GENERATOR_V1.output.width,
      height: MULTICROP_GENERATOR_V1.output.height,
      fit: 'cover',
    })
    .removeAlpha()
    .png()
    .toBuffer();
}

export async function normalizeCropBuffer(imageBuffer) {
  return sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: MULTICROP_GENERATOR_V1.output.width,
      height: MULTICROP_GENERATOR_V1.output.height,
      fit: 'cover',
    })
    .removeAlpha()
    .png()
    .toBuffer();
}

function rectFromCenter(centerX, centerY, width, height) {
  return {
    left: centerX - (width / 2),
    top: centerY - (height / 2),
    right: centerX + (width / 2),
    bottom: centerY + (height / 2),
  };
}

function rectToPixels(rect, width, height) {
  const leftNorm = clamp01(rect.left);
  const topNorm = clamp01(rect.top);
  const rightNorm = clamp01(rect.right);
  const bottomNorm = clamp01(rect.bottom);
  const left = Math.max(0, Math.min(width - 1, Math.round(leftNorm * width)));
  const top = Math.max(0, Math.min(height - 1, Math.round(topNorm * height)));
  const right = Math.max(left + 1, Math.min(width, Math.round(rightNorm * width)));
  const bottom = Math.max(top + 1, Math.min(height, Math.round(bottomNorm * height)));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function clamp01(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}
