#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const CARD_ASPECT = 0.716;
const NORMALIZED_WIDTH = 716;
const NORMALIZED_HEIGHT = 1000;
const ANN_CROP_SIZE = 224;
const FOREGROUND_DISTANCE_THRESHOLD = 45;
const ROW_FOREGROUND_FRACTION = 0.12;
const COLUMN_FOREGROUND_FRACTION = 0.12;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = resolve(
    args.inputDir ??
      resolve(repoRoot, '.tmp', 'scanner_fixed_slot_device', 'latest'),
  );
  const endpoint =
    args.endpoint ??
    process.env.SCANNER_V3_REPLAY_ENDPOINT ??
    process.env.SCANNER_V3_RESOLVE_ENDPOINT ??
    'http://127.0.0.1:8790/scanner-v3/resolve-crops';
  const expectedGvId = args.expectedGvId ?? 'GV-PK-ME03-023';
  const outPath = resolve(
    args.out ??
      resolve(
        inputDir,
        `replay_amaura_after_normalization_${dateToken(new Date())}.json`,
      ),
  );
  const artifactOutDir = resolve(
    args.artifactOutDir ?? resolve(inputDir, 'replay_amaura_after_normalization'),
  );
  await mkdir(artifactOutDir, { recursive: true });

  const manifestPath = resolve(inputDir, 'latest_fixed_slot_manifest.json');
  const fullStillPath = resolve(inputDir, 'latest_full_still.jpg');
  const normalizedPath = resolve(inputDir, 'latest_fixed_slot_normalized.png');
  const manifest = await readJsonIfExists(manifestPath);
  const initial = await buildInitialSlotImage({
    manifest,
    fullStillPath,
    normalizedPath,
  });

  const initialSlotPath = resolve(artifactOutDir, 'initial_slot_crop.png');
  await writeFile(initialSlotPath, initial.buffer);

  const refinement = await refineCardPlane(initial.buffer);
  const edgeRefinedPath = resolve(artifactOutDir, 'edge_refined_crop.png');
  const finalNormalizedPath = resolve(artifactOutDir, 'final_normalized_card.png');
  await writeFile(edgeRefinedPath, refinement.edgeRefinedBuffer);
  await writeFile(finalNormalizedPath, refinement.finalBuffer);

  const { crops, cropFiles } = await buildAnnCrops({
    normalizedBuffer: refinement.finalBuffer,
    outputDir: artifactOutDir,
  });

  const startedAt = performance.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      top_k: Number(args.topK ?? 10),
      mode: 'fixed_slot_artifact_replay_v1',
      crops: crops.map(({ filePath: _filePath, ...crop }) => crop),
    }),
  });
  const body = await response.json();
  const elapsedMs = roundMs(performance.now() - startedAt);
  const finalCandidate = chooseCoreConsensus(body?.crops ?? []);
  const report = {
    ok: response.ok,
    status: response.status,
    endpoint,
    expected_gv_id: expectedGvId,
    expected_rank1: finalCandidate?.gv_id === expectedGvId,
    final_candidate: finalCandidate,
    client_elapsed_ms: elapsedMs,
    service_elapsed_ms: body?.elapsed_ms ?? null,
    reference_count: body?.reference_count ?? null,
    reference_view_count: body?.reference_view_count ?? null,
    input: {
      input_dir: inputDir,
      manifest_path: manifestPath,
      full_still_path: fullStillPath,
      normalized_path: normalizedPath,
      source: initial.source,
    },
    geometry: {
      normalized_width: NORMALIZED_WIDTH,
      normalized_height: NORMALIZED_HEIGHT,
      initial_mapped_crop_rect_image_coordinates:
        manifest?.mapped_crop_rect_image_coordinates ?? null,
      edge_refinement: refinement.geometry,
    },
    artifacts: {
      initial_slot_crop: initialSlotPath,
      edge_refined_crop: edgeRefinedPath,
      final_normalized_card: finalNormalizedPath,
      ann_crops: cropFiles,
    },
    crops: summarizeCrops(body?.crops ?? []),
    raw_response: body,
  };
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

async function buildInitialSlotImage({ manifest, fullStillPath, normalizedPath }) {
  if (manifest?.mapped_crop_rect_image_coordinates) {
    try {
      const rect = manifest.mapped_crop_rect_image_coordinates;
      const targetWidth = positiveInt(manifest.captured_image_width, 0);
      const targetHeight = positiveInt(manifest.captured_image_height, 0);
      let image = sharp(fullStillPath, { failOn: 'none' }).rotate();
      if (targetWidth > 0 && targetHeight > 0) {
        image = image.resize({ width: targetWidth, height: targetHeight, fit: 'fill' });
      } else if (targetWidth > 0) {
        image = image.resize({ width: targetWidth });
      }
      const metadata = await image.metadata();
      const extract = clampRect({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        imageWidth: targetWidth || metadata.width,
        imageHeight: targetHeight || metadata.height,
      });
      return {
        source: 'full_still_manifest_mapped_crop',
        buffer: await image
          .extract(extract)
          .resize(NORMALIZED_WIDTH, NORMALIZED_HEIGHT, { fit: 'fill' })
          .png()
          .toBuffer(),
      };
    } catch (error) {
      console.warn(
        `[fixed-slot-replay] full still replay fallback: ${error?.message ?? error}`,
      );
    }
  }
  return {
    source: 'existing_normalized_artifact',
    buffer: await sharp(normalizedPath, { failOn: 'none' })
      .rotate()
      .resize(NORMALIZED_WIDTH, NORMALIZED_HEIGHT, { fit: 'fill' })
      .png()
      .toBuffer(),
  };
}

async function refineCardPlane(initialBuffer) {
  const { data, info } = await sharp(initialBuffer, { failOn: 'none' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const detection = detectCardEdges(data, info.width, info.height);
  if (!detection) {
    return {
      finalBuffer: initialBuffer,
      edgeRefinedBuffer: initialBuffer,
      geometry: {
        applied: false,
        method: null,
        perspective_applied: false,
      },
    };
  }
  const edgeRefinedBuffer = await sharp(initialBuffer, { failOn: 'none' })
    .extract(toSharpRect(detection.bounds))
    .resize(NORMALIZED_WIDTH, NORMALIZED_HEIGHT, { fit: 'fill' })
    .png()
    .toBuffer();
  const finalRaw = warpRawQuadrilateral({
    sourceRaw: data,
    sourceWidth: info.width,
    sourceHeight: info.height,
    points: detection.points,
    width: NORMALIZED_WIDTH,
    height: NORMALIZED_HEIGHT,
  });
  const finalBuffer = await sharp(finalRaw, {
    raw: {
      width: NORMALIZED_WIDTH,
      height: NORMALIZED_HEIGHT,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
  return {
    finalBuffer,
    edgeRefinedBuffer,
    geometry: {
      applied: true,
      method: 'corner_background_foreground_projection_v1',
      perspective_applied: true,
      background_rgb: detection.backgroundRgb,
      foreground_distance_threshold: FOREGROUND_DISTANCE_THRESHOLD,
      normalized_bounds: detection.bounds,
      perspective_points_normalized_slot_coordinates: detection.points,
    },
  };
}

function detectCardEdges(raw, width, height) {
  const backgroundRgb = cornerMedianBackground(raw, width, height);
  const backgroundLum = luminance(...backgroundRgb);
  const rows = new Array(height).fill(0);
  const columns = new Array(width).fill(0);
  const leftByRow = new Array(height).fill(-1);
  const rightByRow = new Array(height).fill(-1);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * 4;
      const red = raw[offset];
      const green = raw[offset + 1];
      const blue = raw[offset + 2];
      const distance = Math.hypot(
        red - backgroundRgb[0],
        green - backgroundRgb[1],
        blue - backgroundRgb[2],
      );
      const lum = luminance(red, green, blue);
      if (
        distance <= FOREGROUND_DISTANCE_THRESHOLD ||
        lum <= backgroundLum + 10
      ) {
        continue;
      }
      rows[y] += 1;
      columns[x] += 1;
      if (leftByRow[y] < 0) leftByRow[y] = x;
      rightByRow[y] = x;
    }
  }

  const minimumRowCount = width * ROW_FOREGROUND_FRACTION;
  const minimumColumnCount = height * COLUMN_FOREGROUND_FRACTION;
  let top = 0;
  while (top < height && rows[top] < minimumRowCount) top += 1;
  let bottom = height - 1;
  while (bottom >= 0 && rows[bottom] < minimumRowCount) bottom -= 1;
  let left = 0;
  while (left < width && columns[left] < minimumColumnCount) left += 1;
  let right = width - 1;
  while (right >= 0 && columns[right] < minimumColumnCount) right -= 1;
  if (top >= bottom || left >= right) return null;

  const rectWidth = right - left + 1;
  const rectHeight = bottom - top + 1;
  if (rectWidth < width * 0.45 || rectHeight < height * 0.45) return null;
  const aspect = rectWidth / rectHeight;
  if (aspect < 0.55 || aspect > 0.92) return null;

  const bounds = {
    left,
    top,
    right: right + 1,
    bottom: bottom + 1,
    width: right - left + 1,
    height: bottom - top + 1,
  };
  return {
    backgroundRgb,
    bounds,
    points: perspectivePointsFromEdges({
      bounds,
      leftByRow,
      rightByRow,
      imageWidth: width,
    }),
  };
}

function perspectivePointsFromEdges({ bounds, leftByRow, rightByRow, imageWidth }) {
  const top = Math.round(bounds.top);
  const bottom = Math.max(top + 1, Math.round(bounds.bottom) - 1);
  const height = bottom - top + 1;
  const topStart = top + Math.round(height * 0.06);
  const topEnd = top + Math.round(height * 0.24);
  const bottomStart = bottom - Math.round(height * 0.24);
  const bottomEnd = bottom - Math.round(height * 0.06);

  const leftTop = medianEdge(leftByRow, topStart, topEnd) ?? bounds.left;
  const rightTop = medianEdge(rightByRow, topStart, topEnd) ?? bounds.right;
  const leftBottom = medianEdge(leftByRow, bottomStart, bottomEnd) ?? bounds.left;
  const rightBottom =
    medianEdge(rightByRow, bottomStart, bottomEnd) ?? bounds.right;

  return [
    { x: clamp(leftTop, 0, imageWidth - 1), y: bounds.top },
    { x: clamp(rightTop, 1, imageWidth), y: bounds.top },
    { x: clamp(rightBottom, 1, imageWidth), y: bounds.bottom },
    { x: clamp(leftBottom, 0, imageWidth - 1), y: bounds.bottom },
  ];
}

function warpRawQuadrilateral({
  sourceRaw,
  sourceWidth,
  sourceHeight,
  points,
  width,
  height,
}) {
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const inverseV = 1 - v;
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const inverseU = 1 - u;
      const sourceX =
        topLeft.x * inverseU * inverseV +
        topRight.x * u * inverseV +
        bottomRight.x * u * v +
        bottomLeft.x * inverseU * v;
      const sourceY =
        topLeft.y * inverseU * inverseV +
        topRight.y * u * inverseV +
        bottomRight.y * u * v +
        bottomLeft.y * inverseU * v;
      sampleBilinearRgba({
        sourceRaw,
        sourceWidth,
        sourceHeight,
        sourceX,
        sourceY,
        targetRaw: raw,
        targetOffset: ((y * width) + x) * 4,
      });
    }
  }
  return raw;
}

function sampleBilinearRgba({
  sourceRaw,
  sourceWidth,
  sourceHeight,
  sourceX,
  sourceY,
  targetRaw,
  targetOffset,
}) {
  const clampedX = clamp(sourceX, 0, sourceWidth - 1);
  const clampedY = clamp(sourceY, 0, sourceHeight - 1);
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(sourceWidth - 1, x0 + 1);
  const y1 = Math.min(sourceHeight - 1, y0 + 1);
  const wx = clampedX - x0;
  const wy = clampedY - y0;
  const topWeight = 1 - wy;
  const leftWeight = 1 - wx;
  const offsets = [
    ((y0 * sourceWidth) + x0) * 4,
    ((y0 * sourceWidth) + x1) * 4,
    ((y1 * sourceWidth) + x0) * 4,
    ((y1 * sourceWidth) + x1) * 4,
  ];
  const weights = [
    leftWeight * topWeight,
    wx * topWeight,
    leftWeight * wy,
    wx * wy,
  ];
  for (let channel = 0; channel < 4; channel += 1) {
    const value =
      sourceRaw[offsets[0] + channel] * weights[0] +
      sourceRaw[offsets[1] + channel] * weights[1] +
      sourceRaw[offsets[2] + channel] * weights[2] +
      sourceRaw[offsets[3] + channel] * weights[3];
    targetRaw[targetOffset + channel] = Math.round(clamp(value, 0, 255));
  }
}

async function buildAnnCrops({ normalizedBuffer, outputDir }) {
  const cropSpecs = [
    {
      crop_type: 'full_card_core',
      rect: { left: 0.08, top: 0.1, right: 0.92, bottom: 0.82 },
      grayscale: false,
    },
    {
      crop_type: 'full_card_core_identity',
      rect: { left: 0.09, top: 0.1, right: 0.91, bottom: 0.8 },
      grayscale: false,
    },
    {
      crop_type: 'artwork_zoom_in_10_gray',
      rect: { left: 0.12, top: 0.19, right: 0.88, bottom: 0.58 },
      grayscale: true,
    },
  ];
  const debugSpecs = [
    {
      crop_type: 'full_card',
      rect: { left: 0, top: 0, right: 1, bottom: 1 },
      grayscale: false,
    },
    {
      crop_type: 'full_card_upper',
      rect: { left: 0, top: 0, right: 1, bottom: 0.5 },
      grayscale: false,
    },
  ];

  const crops = [];
  const cropFiles = {};
  for (const spec of [...cropSpecs, ...debugSpecs]) {
    const crop = await renderCrop(normalizedBuffer, spec);
    const filePath = resolve(outputDir, `ann_crop_${safeFileToken(spec.crop_type)}.png`);
    await writeFile(filePath, crop.pngBuffer);
    cropFiles[spec.crop_type] = filePath;
    if (cropSpecs.includes(spec)) {
      crops.push({
        crop_type: spec.crop_type,
        raw_b64: crop.rawBuffer.toString('base64'),
        width: ANN_CROP_SIZE,
        height: ANN_CROP_SIZE,
        format: 'raw_rgba8888',
        filePath,
      });
    }
  }
  return { crops, cropFiles };
}

async function renderCrop(normalizedBuffer, spec) {
  const metadata = await sharp(normalizedBuffer, { failOn: 'none' }).metadata();
  const rect = {
    left: Math.floor(metadata.width * spec.rect.left),
    top: Math.floor(metadata.height * spec.rect.top),
    width: Math.max(1, Math.floor(metadata.width * (spec.rect.right - spec.rect.left))),
    height: Math.max(1, Math.floor(metadata.height * (spec.rect.bottom - spec.rect.top))),
  };
  let image = sharp(normalizedBuffer, { failOn: 'none' })
    .extract(rect)
    .resize(ANN_CROP_SIZE, ANN_CROP_SIZE, { fit: 'fill' });
  if (spec.grayscale) image = image.grayscale();
  const pngBuffer = await image.png().toBuffer();
  const rawBuffer = spec.grayscale
    ? await grayPngToRgba(pngBuffer)
    : await sharp(pngBuffer, { failOn: 'none' })
        .removeAlpha()
        .ensureAlpha()
        .raw()
        .toBuffer();
  return { pngBuffer, rawBuffer };
}

async function grayPngToRgba(pngBuffer) {
  const gray = await sharp(pngBuffer, { failOn: 'none' })
    .grayscale()
    .raw()
    .toBuffer();
  const raw = Buffer.alloc(ANN_CROP_SIZE * ANN_CROP_SIZE * 4);
  for (let index = 0; index < ANN_CROP_SIZE * ANN_CROP_SIZE; index += 1) {
    const value = gray[index];
    const offset = index * 4;
    raw[offset] = value;
    raw[offset + 1] = value;
    raw[offset + 2] = value;
    raw[offset + 3] = 255;
  }
  return raw;
}

function chooseCoreConsensus(crops) {
  const byType = new Map();
  for (const crop of crops) {
    byType.set(crop.crop_type, crop.candidates ?? []);
  }
  const anchorTypes = ['full_card_core', 'full_card_core_identity', 'full_card'];
  for (const anchorType of anchorTypes) {
    const candidates = byType.get(anchorType) ?? [];
    if (candidates.length === 0) continue;
    const top = candidates[0];
    const topId = top.card_id;
    const support = [];
    for (const [cropType, cropCandidates] of byType.entries()) {
      if (cropType === anchorType) continue;
      if (cropCandidates.slice(0, 6).some((candidate) => candidate.card_id === topId)) {
        support.push(cropType);
      }
    }
    if (support.length > 0 || Number(top.distance ?? 1) <= 0.18) {
      return {
        anchor_crop_type: anchorType,
        card_id: top.card_id ?? null,
        gv_id: top.gv_id ?? null,
        name: top.name ?? null,
        set_code: top.set_code ?? null,
        number: top.number ?? null,
        distance: top.distance ?? null,
        support,
      };
    }
  }
  return null;
}

function summarizeCrops(crops) {
  return crops.map((crop) => ({
    crop_type: crop.crop_type,
    ok: crop.ok,
    error: crop.error ?? null,
    elapsed_ms: crop.elapsed_ms ?? null,
    embedding_ms: crop.embedding_ms ?? null,
    vector_search_ms: crop.vector_search_ms ?? null,
    top: (crop.candidates ?? []).slice(0, 8).map((candidate) => ({
      rank: candidate.rank,
      name: candidate.name,
      gv_id: candidate.gv_id,
      set_code: candidate.set_code,
      number: candidate.number,
      card_id: candidate.card_id,
      distance: candidate.distance,
      best_reference_view_type: candidate.best_reference_view_type,
    })),
  }));
}

function cornerMedianBackground(raw, width, height) {
  const sampleSize = Math.max(12, Math.floor(Math.min(width, height) * 0.035));
  const reds = [];
  const greens = [];
  const blues = [];
  for (const [x0, y0] of [
    [0, 0],
    [width - sampleSize, 0],
    [0, height - sampleSize],
    [width - sampleSize, height - sampleSize],
  ]) {
    for (let y = y0; y < y0 + sampleSize; y += 1) {
      for (let x = x0; x < x0 + sampleSize; x += 1) {
        const offset = ((y * width) + x) * 4;
        reds.push(raw[offset]);
        greens.push(raw[offset + 1]);
        blues.push(raw[offset + 2]);
      }
    }
  }
  return [median(reds), median(greens), median(blues)];
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}

function medianEdge(values, start, end) {
  const safeStart = Math.max(0, Math.min(values.length - 1, start));
  const safeEnd = Math.max(safeStart, Math.min(values.length - 1, end));
  const selected = [];
  for (let index = safeStart; index <= safeEnd; index += 1) {
    if (values[index] >= 0) selected.push(values[index]);
  }
  if (selected.length === 0) return null;
  return median(selected);
}

function toSharpRect(rect) {
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function clampRect({ left, top, width, height, imageWidth, imageHeight }) {
  const safeLeft = Math.max(0, Math.min(imageWidth - 2, left));
  const safeTop = Math.max(0, Math.min(imageHeight - 2, top));
  const safeRight = Math.max(safeLeft + 1, Math.min(imageWidth, safeLeft + width));
  const safeBottom = Math.max(safeTop + 1, Math.min(imageHeight, safeTop + height));
  return {
    left: safeLeft,
    top: safeTop,
    width: safeRight - safeLeft,
    height: safeBottom - safeTop,
  };
}

function luminance(red, green, blue) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function roundMs(value) {
  return Math.round(value * 1000) / 1000;
}

function dateToken(date) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function safeFileToken(value) {
  return String(value ?? 'unknown').replace(/[^A-Za-z0-9_.-]+/g, '_') || 'unknown';
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
