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
  const normalizedBuffer = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .png()
    .toBuffer();
  const metadata = await sharp(normalizedBuffer, { failOn: 'none' }).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new Error('scanner_v5_rectify_invalid_image');
  }

  const detectedBox = await detectCardBoxWholeImage(normalizedBuffer, { width, height }).catch(() => null);
  const crop = normalizeCropToCardAspect(detectedBox ?? centralSlotBox(width, height), width, height);
  const quadSource = detectedBox == null ? 'fallback_slot' : 'detected';
  const png = await sharp(normalizedBuffer, { failOn: 'none' })
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
      skew_deg: detectedBox?.skew_deg ?? null,
      confidence: detectedBox?.confidence ?? 0.48,
      output_width: CANONICAL_WIDTH,
      output_height: CANONICAL_HEIGHT,
      algorithm: 'scanner_v5_whole_image_card_box_rectify_v2',
    },
  };
}

async function detectCardBoxWholeImage(imageBuffer, { width, height }) {
  const maxSample = 360;
  const scale = Math.min(maxSample / width, maxSample / height, 1);
  const sampleWidth = Math.max(1, Math.round(width * scale));
  const sampleHeight = Math.max(1, Math.round(height * scale));
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .resize(sampleWidth, sampleHeight, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bg = cornerMean(data, info.width, info.height, info.channels);
  const mask = new Uint8Array(info.width * info.height);
  const diffThreshold = 42;
  const lightBackground = bg.luma >= 120;
  const darkFloor = Math.max(18, bg.luma + 8);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const diff =
        Math.abs(r - bg.r) +
        Math.abs(g - bg.g) +
        Math.abs(b - bg.b);
      const luma = (r * 0.299) + (g * 0.587) + (b * 0.114);
      const foreground = lightBackground
        ? diff > 32
        : (diff > diffThreshold && (luma > darkFloor || diff > 65));
      if (foreground) {
        mask[y * info.width + x] = 1;
      }
    }
  }

  const component =
    largestPlausibleComponent(mask, info.width, info.height) ??
    projectedForegroundBox(mask, info.width, info.height);
  if (!component) return null;

  const scaleX = width / info.width;
  const scaleY = height / info.height;
  const padX = Math.max(2, Math.round(component.width * 0.018 * scaleX));
  const padY = Math.max(2, Math.round(component.height * 0.018 * scaleY));
  const left = Math.max(0, Math.floor(component.minX * scaleX) - padX);
  const top = Math.max(0, Math.floor(component.minY * scaleY) - padY);
  const right = Math.min(width, Math.ceil((component.maxX + 1) * scaleX) + padX);
  const bottom = Math.min(height, Math.ceil((component.maxY + 1) * scaleY) + padY);
  const aspect = (right - left) / Math.max(1, bottom - top);
  const aspectDelta = Math.abs(aspect - CARD_ASPECT);
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    skew_deg: null,
    confidence: Math.max(0.55, Math.min(0.9, 0.86 - aspectDelta * 0.5)),
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
  r /= points.length;
  g /= points.length;
  b /= points.length;
  return {
    r,
    g,
    b,
    luma: (r * 0.299) + (g * 0.587) + (b * 0.114),
  };
}

function largestPlausibleComponent(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const queue = [];
  const components = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    visited[start] = 1;
    queue.length = 0;
    queue.push(start);
    let head = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let area = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const x = idx % width;
      const y = Math.floor(idx / width);
      area += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const next of [idx - 1, idx + 1, idx - width, idx + width]) {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
        if ((idx % width === 0 && next === idx - 1) || (idx % width === width - 1 && next === idx + 1)) {
          continue;
        }
        visited[next] = 1;
        queue.push(next);
      }
    }
    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const boxArea = boxWidth * boxHeight;
    const imageArea = width * height;
    const fill = area / Math.max(1, boxArea);
    const aspect = boxWidth / Math.max(1, boxHeight);
    const coverage = boxArea / imageArea;
    const plausible =
      coverage >= 0.08 &&
      coverage <= 1.0 &&
      aspect >= 0.45 &&
      aspect <= 0.95 &&
      fill >= 0.18;
    if (plausible) {
      components.push({ minX, minY, maxX, maxY, width: boxWidth, height: boxHeight, area, boxArea, fill, coverage });
    }
  }
  components.sort((a, b) => b.boxArea - a.boxArea);
  return components[0] ?? null;
}

function projectedForegroundBox(mask, width, height) {
  const colCounts = new Int32Array(width);
  const rowCounts = new Int32Array(height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      colCounts[x] += 1;
      rowCounts[y] += 1;
    }
  }
  const minColRun = Math.max(2, Math.round(width * 0.025));
  const minRowRun = Math.max(2, Math.round(height * 0.025));
  const xRange = sustainedRange(colCounts, Math.max(2, Math.round(height * 0.035)), minColRun);
  const yRange = sustainedRange(rowCounts, Math.max(2, Math.round(width * 0.035)), minRowRun);
  if (!xRange || !yRange) return null;
  const boxWidth = xRange.max - xRange.min + 1;
  const boxHeight = yRange.max - yRange.min + 1;
  const aspect = boxWidth / Math.max(1, boxHeight);
  const coverage = (boxWidth * boxHeight) / Math.max(1, width * height);
  if (coverage < 0.08 || coverage > 1.0 || aspect < 0.42 || aspect > 1.02) {
    return null;
  }
  return {
    minX: xRange.min,
    minY: yRange.min,
    maxX: xRange.max,
    maxY: yRange.max,
    width: boxWidth,
    height: boxHeight,
  };
}

function sustainedRange(counts, threshold, minRun) {
  let best = null;
  let runStart = null;
  for (let i = 0; i <= counts.length; i += 1) {
    const active = i < counts.length && counts[i] >= threshold;
    if (active && runStart == null) {
      runStart = i;
    } else if (!active && runStart != null) {
      const runEnd = i - 1;
      if (runEnd - runStart + 1 >= minRun) {
        if (!best || runEnd - runStart > best.max - best.min) {
          best = { min: runStart, max: runEnd };
        }
      }
      runStart = null;
    }
  }
  return best;
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
