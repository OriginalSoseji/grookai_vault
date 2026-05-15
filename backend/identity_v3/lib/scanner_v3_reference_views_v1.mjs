import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

export const SCANNER_V3_REFERENCE_VIEWS_V1 = {
  name: 'scanner_v3_reference_views_v1',
  output: {
    width: 512,
    height: 512,
    format: 'png',
  },
  reference_view_types: [
    'artwork',
    'artwork_zoom_in_10',
    'center_tight',
    'title_band',
    'full_card',
    'full_card_upper',
    'full_card_middle',
  ],
};

export async function generateScannerV3ReferenceViews(entry) {
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
    artBuffer = await extractScannerV3ArtworkRegionBuffer(fullBuffer);
  }
  if (!fullBuffer && artBuffer) {
    fullBuffer = artBuffer;
  }
  if (!artBuffer && !fullBuffer) {
    throw new Error('scanner_v3_reference_missing_image');
  }

  if (artBuffer) {
    views.push({
      view_type: 'artwork',
      source: 'reference_artwork_crop',
      buffer: await normalizeScannerV3ReferenceCrop(artBuffer),
    });
    views.push({
      view_type: 'artwork_zoom_in_10',
      source: 'reference_artwork_crop',
      buffer: await scannerV3NormalizedRectCrop(artBuffer, rectFromCenter(0.50, 0.50, 0.90, 0.90)),
    });
    views.push({
      view_type: 'center_tight',
      source: 'reference_artwork_crop',
      buffer: await scannerV3NormalizedRectCrop(artBuffer, rectFromCenter(0.50, 0.50, 0.72, 0.72)),
    });
  }

  if (fullBuffer) {
    views.push({
      view_type: 'title_band',
      source: 'reference_full_card',
      buffer: await scannerV3NormalizedRectCrop(fullBuffer, {
        left: 0.02,
        top: 0.00,
        right: 0.98,
        bottom: 0.16,
      }),
    });
    views.push({
      view_type: 'full_card',
      source: 'reference_full_card',
      buffer: await normalizeScannerV3ReferenceCrop(fullBuffer),
    });
    views.push({
      view_type: 'full_card_upper',
      source: 'reference_full_card',
      buffer: await scannerV3NormalizedRectCrop(fullBuffer, {
        left: 0.06,
        top: 0.08,
        right: 0.94,
        bottom: 0.58,
      }),
    });
    views.push({
      view_type: 'full_card_middle',
      source: 'reference_full_card',
      buffer: await scannerV3NormalizedRectCrop(fullBuffer, {
        left: 0.06,
        top: 0.18,
        right: 0.94,
        bottom: 0.72,
      }),
    });
  }

  return views;
}

export async function scannerV3NormalizedRectCrop(imageBuffer, rect) {
  const image = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 10 || height < 10) {
    throw new Error('scanner_v3_reference_invalid_image_dimensions');
  }
  const crop = rectToPixels(rect, width, height);
  return image
    .extract(crop)
    .resize({
      width: SCANNER_V3_REFERENCE_VIEWS_V1.output.width,
      height: SCANNER_V3_REFERENCE_VIEWS_V1.output.height,
      fit: 'cover',
    })
    .removeAlpha()
    .png()
    .toBuffer();
}

export async function normalizeScannerV3ReferenceCrop(imageBuffer) {
  return sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({
      width: SCANNER_V3_REFERENCE_VIEWS_V1.output.width,
      height: SCANNER_V3_REFERENCE_VIEWS_V1.output.height,
      fit: 'cover',
    })
    .removeAlpha()
    .png()
    .toBuffer();
}

export async function extractScannerV3ArtworkRegionBuffer(fullCardBuffer) {
  const image = sharp(fullCardBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 20 || height < 20) {
    throw new Error('scanner_v3_reference_artwork_crop_invalid_dimensions');
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
