import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const NORMALIZED_CARD_WIDTH = 1000;
export const NORMALIZED_CARD_HEIGHT = 1400;
export const NORMALIZED_CARD_ASPECT = NORMALIZED_CARD_WIDTH / NORMALIZED_CARD_HEIGHT;

export async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

export async function listImageFiles(folder, limit = null) {
  const resolved = path.resolve(folder);
  const folderStat = await stat(resolved);
  if (!folderStat.isDirectory()) {
    throw new Error(`folder_not_directory:${resolved}`);
  }

  const entries = await readdir(resolved, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(resolved, entry.name))
    .sort((a, b) => a.localeCompare(b));

  return Number.isInteger(limit) && limit > 0 ? files.slice(0, limit) : files;
}

export function sanitizePathSegment(value, fallback = 'item') {
  const clean = String(value || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return clean || fallback;
}

export function polygonAreaNorm(points) {
  if (!Array.isArray(points) || points.length < 3) return null;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (!Array.isArray(a) || !Array.isArray(b)) return null;
    const ax = Number(a[0]);
    const ay = Number(a[1]);
    const bx = Number(b[0]);
    const by = Number(b[1]);
    if (![ax, ay, bx, by].every(Number.isFinite)) return null;
    area += (ax * by) - (bx * ay);
  }
  return Math.abs(area / 2);
}

export async function buildRawJpeg(inputBuffer) {
  const { data, info } = await sharp(inputBuffer, { failOn: 'none' })
    .rotate()
    .jpeg({ quality: 92, chromaSubsampling: '4:2:0' })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
  };
}

export async function buildBorderDetectionJpeg(rawBuffer) {
  return sharp(rawBuffer, { failOn: 'none' })
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, chromaSubsampling: '4:2:0' })
    .toBuffer();
}

export function centeredPortraitRegion(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  let cropWidth = Math.round(height * NORMALIZED_CARD_ASPECT);
  let cropHeight = height;
  if (cropWidth > width) {
    cropWidth = width;
    cropHeight = Math.round(width / NORMALIZED_CARD_ASPECT);
  }

  cropWidth = Math.max(1, Math.min(width, cropWidth));
  cropHeight = Math.max(1, Math.min(height, cropHeight));

  return {
    left: Math.max(0, Math.floor((width - cropWidth) / 2)),
    top: Math.max(0, Math.floor((height - cropHeight) / 2)),
    width: cropWidth,
    height: cropHeight,
  };
}

export async function normalizeFromFallbackCrop(rawBuffer, rawDims) {
  const region = centeredPortraitRegion(rawDims?.width, rawDims?.height);
  if (!region) {
    throw new Error('fallback_crop_invalid_dimensions');
  }

  const normalized = await sharp(rawBuffer, { failOn: 'none' })
    .extract(region)
    .resize({
      width: NORMALIZED_CARD_WIDTH,
      height: NORMALIZED_CARD_HEIGHT,
      fit: 'fill',
    })
    .jpeg({ quality: 88, chromaSubsampling: '4:2:0' })
    .toBuffer();

  return {
    buffer: normalized,
    crop_region: region,
    crop_area_ratio: (region.width * region.height) / (rawDims.width * rawDims.height),
  };
}

export async function normalizeWarpedCard(warpedBuffer) {
  const meta = await sharp(warpedBuffer, { failOn: 'none' }).metadata();
  let pipeline = sharp(warpedBuffer, { failOn: 'none' }).rotate();
  if (Number(meta?.width) > Number(meta?.height)) {
    pipeline = pipeline.rotate(90);
  }

  const { data, info } = await pipeline
    .resize({
      width: NORMALIZED_CARD_WIDTH,
      height: NORMALIZED_CARD_HEIGHT,
      fit: 'fill',
    })
    .jpeg({ quality: 88, chromaSubsampling: '4:2:0' })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    height: info.height,
  };
}

function regionFromFractions(width, height, region) {
  const left = Math.max(0, Math.min(width - 1, Math.floor(width * region.x)));
  const top = Math.max(0, Math.min(height - 1, Math.floor(height * region.y)));
  const right = Math.max(left + 1, Math.min(width, Math.ceil(width * (region.x + region.w))));
  const bottom = Math.max(top + 1, Math.min(height, Math.ceil(height * (region.y + region.h))));
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export async function extractNormalizedRegions(normalizedBuffer) {
  const meta = await sharp(normalizedBuffer, { failOn: 'none' }).metadata();
  const width = Number(meta.width);
  const height = Number(meta.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('normalized_region_invalid_dimensions');
  }

  const artworkRegion = regionFromFractions(width, height, { x: 0.08, y: 0.10, w: 0.84, h: 0.54 });
  const bottomBandRegion = regionFromFractions(width, height, { x: 0.00, y: 0.70, w: 1.00, h: 0.30 });

  const artwork = await sharp(normalizedBuffer, { failOn: 'none' })
    .extract(artworkRegion)
    .jpeg({ quality: 88, chromaSubsampling: '4:2:0' })
    .toBuffer();

  const bottomBand = await sharp(normalizedBuffer, { failOn: 'none' })
    .extract(bottomBandRegion)
    .jpeg({ quality: 88, chromaSubsampling: '4:2:0' })
    .toBuffer();

  return {
    artwork: {
      buffer: artwork,
      region: artworkRegion,
    },
    bottomBand: {
      buffer: bottomBand,
      region: bottomBandRegion,
    },
  };
}

async function fitForContactSheet(buffer, width, height) {
  return sharp(buffer, { failOn: 'none' })
    .resize({
      width,
      height,
      fit: 'contain',
      background: { r: 245, g: 247, b: 250, alpha: 1 },
    })
    .jpeg({ quality: 86, chromaSubsampling: '4:2:0' })
    .toBuffer();
}

export async function buildContactSheet({ rawBuffer, normalizedBuffer, artworkBuffer, bottomBandBuffer }) {
  const cellW = 500;
  const cellH = 700;
  const gap = 24;
  const canvasW = (cellW * 2) + (gap * 3);
  const canvasH = (cellH * 2) + (gap * 3);

  const composites = [];
  const items = [
    { buffer: rawBuffer, left: gap, top: gap },
    { buffer: normalizedBuffer, left: (gap * 2) + cellW, top: gap },
    { buffer: artworkBuffer, left: gap, top: (gap * 2) + cellH },
    { buffer: bottomBandBuffer, left: (gap * 2) + cellW, top: (gap * 2) + cellH },
  ];

  for (const item of items) {
    composites.push({
      input: await fitForContactSheet(item.buffer, cellW, cellH),
      left: item.left,
      top: item.top,
    });
  }

  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: { r: 229, g: 233, b: 239 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 88, chromaSubsampling: '4:2:0' })
    .toBuffer();
}

export async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}
