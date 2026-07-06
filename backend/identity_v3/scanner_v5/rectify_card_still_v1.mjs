import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CANONICAL_WIDTH = 716;
const CANONICAL_HEIGHT = 1000;
const CARD_ASPECT = CANONICAL_WIDTH / CANONICAL_HEIGHT;

export async function rectifyCardStill(inputPath, outdir) {
  const input = path.resolve(inputPath);
  const outputDir = path.resolve(outdir);
  await mkdir(outputDir, { recursive: true });
  const result = await rectifyCardStillBuffer(await sharp(input, { failOn: 'none' }).rotate().toBuffer(), {
    sourcePath: input,
  });
  const outputPath = path.join(outputDir, 'rectified_card.png');
  const sidecarPath = path.join(outputDir, 'rectified_card.json');
  await writeFile(outputPath, result.png);
  await writeFile(sidecarPath, JSON.stringify(result.sidecar, null, 2));
  return {
    ...result,
    outputPath,
    sidecarPath,
  };
}

export async function rectifyCardStillBuffer(imageBuffer, options = {}) {
  if (!Buffer.isBuffer(imageBuffer) && !(imageBuffer instanceof Uint8Array)) {
    throw new Error('scanner_v5_rectify_buffer_required');
  }
  const metadata = await sharp(imageBuffer, { failOn: 'none' }).rotate().metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new Error('scanner_v5_rectify_invalid_image');
  }

  const trimBox = await detectTrimBox(imageBuffer).catch(() => null);
  const crop = normalizeCropToCardAspect(trimBox ?? centralSlotBox(width, height), width, height);
  const quadSource = trimBox == null ? 'fallback_slot' : 'trim_box';
  const png = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .extract(crop)
    .resize(CANONICAL_WIDTH, CANONICAL_HEIGHT, { fit: 'fill' })
    .png()
    .toBuffer();

  return {
    png,
    sidecar: {
      source_path: options.sourcePath ?? null,
      quad_source: quadSource,
      quad_points: [
        { x: crop.left, y: crop.top },
        { x: crop.left + crop.width, y: crop.top },
        { x: crop.left + crop.width, y: crop.top + crop.height },
        { x: crop.left, y: crop.top + crop.height },
      ],
      crop_rect: crop,
      skew_deg: 0,
      confidence: quadSource === 'trim_box' ? 0.72 : 0.48,
      output_width: CANONICAL_WIDTH,
      output_height: CANONICAL_HEIGHT,
      algorithm: 'scanner_v5_sharp_trim_rectify_v1',
    },
  };
}

async function detectTrimBox(imageBuffer) {
  const sampleWidth = 120;
  const sampleHeight = 168;
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize(sampleWidth, sampleHeight, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = cornerMean(data, info.width, info.height, info.channels);
  const threshold = 34;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const diff =
        Math.abs(data[offset] - bg.r) +
        Math.abs(data[offset + 1] - bg.g) +
        Math.abs(data[offset + 2] - bg.b);
      if (diff > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null;
  const scaleX = info.width <= 0 ? 1 : (await sharp(imageBuffer).metadata()).width / info.width;
  const scaleY = info.height <= 0 ? 1 : (await sharp(imageBuffer).metadata()).height / info.height;
  const padX = Math.max(1, Math.round((maxX - minX) * 0.015 * scaleX));
  const padY = Math.max(1, Math.round((maxY - minY) * 0.015 * scaleY));
  const left = Math.max(0, Math.floor(minX * scaleX) - padX);
  const top = Math.max(0, Math.floor(minY * scaleY) - padY);
  const right = Math.ceil((maxX + 1) * scaleX) + padX;
  const bottom = Math.ceil((maxY + 1) * scaleY) + padY;
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function cornerMean(data, width, height, channels) {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const offset = (y * width + x) * channels;
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
  }
  return { r: r / points.length, g: g / points.length, b: b / points.length };
}

function centralSlotBox(width, height) {
  const imageAspect = width / height;
  if (imageAspect > CARD_ASPECT) {
    const cropWidth = Math.round(height * CARD_ASPECT);
    return {
      left: Math.round((width - cropWidth) / 2),
      top: 0,
      width: cropWidth,
      height,
    };
  }
  const cropHeight = Math.round(width / CARD_ASPECT);
  return {
    left: 0,
    top: Math.round((height - cropHeight) / 2),
    width,
    height: cropHeight,
  };
}

function normalizeCropToCardAspect(box, width, height) {
  let left = Math.max(0, Math.round(box.left));
  let top = Math.max(0, Math.round(box.top));
  let cropWidth = Math.min(width - left, Math.round(box.width));
  let cropHeight = Math.min(height - top, Math.round(box.height));
  const currentAspect = cropWidth / cropHeight;

  if (currentAspect > CARD_ASPECT) {
    const nextWidth = Math.round(cropHeight * CARD_ASPECT);
    left += Math.round((cropWidth - nextWidth) / 2);
    cropWidth = nextWidth;
  } else if (currentAspect < CARD_ASPECT) {
    const nextHeight = Math.round(cropWidth / CARD_ASPECT);
    top += Math.round((cropHeight - nextHeight) / 2);
    cropHeight = nextHeight;
  }

  left = clampInt(left, 0, Math.max(0, width - 1));
  top = clampInt(top, 0, Math.max(0, height - 1));
  cropWidth = clampInt(cropWidth, 1, width - left);
  cropHeight = clampInt(cropHeight, 1, height - top);
  return { left, top, width: cropWidth, height: cropHeight };
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function main() {
  const [input, outdir] = process.argv.slice(2);
  if (!input || !outdir) {
    console.error('Usage: node rectify_card_still_v1.mjs <input> <outdir>');
    process.exitCode = 1;
    return;
  }
  const result = await rectifyCardStill(input, outdir);
  console.log(JSON.stringify({
    output: result.outputPath,
    sidecar: result.sidecarPath,
    ...result.sidecar,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
