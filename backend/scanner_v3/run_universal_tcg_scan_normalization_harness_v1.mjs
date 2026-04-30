import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import '../env.mjs';
import { detectOuterBorderAI, warpCardQuadAI } from '../condition/ai_border_detector_client.mjs';
import {
  NORMALIZED_CARD_HEIGHT,
  NORMALIZED_CARD_WIDTH,
  buildBorderDetectionJpeg,
  buildContactSheet,
  buildRawJpeg,
  ensureDir,
  extractNormalizedRegions,
  listImageFiles,
  normalizeFromFallbackCrop,
  normalizeWarpedCard,
  pathExists,
  polygonAreaNorm,
  sanitizePathSegment,
  writeJson,
} from './lib/card_normalization_v1.mjs';
import {
  computeScanQualityMetrics,
  evaluateCaptureAcceptance,
} from './lib/scan_quality_metrics_v1.mjs';

const DEFAULT_INPUT_FOLDER = '.tmp/embedding_test_images';
const DEFAULT_OUTPUT_FOLDER = '.tmp/scanner_v3_normalization_proof';
const BORDER_TIMEOUT_MS = 3000;
const WARP_TIMEOUT_MS = 5000;

function parseArgs(argv) {
  const args = {
    folder: null,
    out: DEFAULT_OUTPUT_FOLDER,
    limit: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const [name, inlineValue] = raw.includes('=') ? raw.split(/=(.*)/s, 2) : [raw, null];
    const nextValue = () => {
      if (inlineValue !== null) return inlineValue;
      i += 1;
      return argv[i] ?? '';
    };

    if (name === '--folder') {
      args.folder = nextValue();
    } else if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--limit') {
      const parsed = Number.parseInt(nextValue(), 10);
      args.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/scanner_v3/run_universal_tcg_scan_normalization_harness_v1.mjs --folder <path> [--out <path>] [--limit <n>]',
    '',
    'Defaults:',
    `  --folder ${DEFAULT_INPUT_FOLDER}, when present`,
    `  --out ${DEFAULT_OUTPUT_FOLDER}`,
    '',
    'This harness normalizes image quality only. It does not OCR, match, or identify cards.',
  ].join('\n');
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 1_000_000) / 1_000_000;
}

function roundMs(start) {
  return Math.round(performance.now() - start);
}

async function discoverInputFolder(explicitFolder) {
  if (explicitFolder) return path.resolve(explicitFolder);
  const fallback = path.resolve(DEFAULT_INPUT_FOLDER);
  if (await pathExists(fallback)) return fallback;
  return null;
}

async function detectBorder(rawBuffer) {
  const start = performance.now();
  const detectionBuffer = await buildBorderDetectionJpeg(rawBuffer);
  const result = await detectOuterBorderAI({
    imageBuffer: detectionBuffer,
    timeoutMs: BORDER_TIMEOUT_MS,
  });
  return {
    result,
    elapsed_ms: roundMs(start),
  };
}

async function normalizeImage({ inputPath, outputDir }) {
  const metrics = {
    input_path: inputPath,
    output_dir: outputDir,
    decode_ok: false,
    border_detected: false,
    border_confidence: null,
    border_notes: [],
    border_error: null,
    border_elapsed_ms: null,
    polygon_norm: null,
    card_fill_ratio: null,
    background_ratio: null,
    warp_attempted: false,
    warp_success: false,
    warp_elapsed_ms: null,
    fallback_reason: null,
    fallback_crop_region: null,
    fallback_crop_area_ratio: null,
    normalized_width: null,
    normalized_height: null,
    artwork_region: null,
    bottom_band_region: null,
    capture_accepted: false,
    rejection_reasons: [],
    quality_thresholds: null,
  };

  await ensureDir(outputDir);

  let inputBuffer;
  let raw;
  let normalizedBuffer = null;
  let normalizedSource = 'none';

  try {
    inputBuffer = await readFile(inputPath);
    raw = await buildRawJpeg(inputBuffer);
    metrics.decode_ok = true;
    metrics.input_width = raw.width;
    metrics.input_height = raw.height;
    await writeFile(path.join(outputDir, 'raw.jpg'), raw.buffer);
  } catch (error) {
    metrics.decode_error = error?.message ?? String(error);
    const gate = evaluateCaptureAcceptance({
      decodeOk: false,
      normalizedExists: false,
      qualityMetrics: null,
      borderDetected: false,
      borderConfidence: null,
      cardFillRatio: null,
      warpSuccess: false,
    });
    Object.assign(metrics, gate);
    await writeJson(path.join(outputDir, 'metrics.json'), metrics);
    return {
      metrics,
      normalized_success: false,
      accepted: false,
      fallback_used: false,
      warp_success: false,
    };
  }

  let borderResult = null;
  try {
    const border = await detectBorder(raw.buffer);
    borderResult = border.result;
    metrics.border_elapsed_ms = border.elapsed_ms;
    metrics.border_confidence = Number.isFinite(Number(borderResult?.confidence))
      ? Number(borderResult.confidence)
      : null;
    metrics.border_notes = Array.isArray(borderResult?.notes) ? borderResult.notes : [];
    metrics.border_error = borderResult?.error ?? null;
    if (borderResult?.ok && Array.isArray(borderResult.polygon_norm)) {
      metrics.border_detected = true;
      metrics.polygon_norm = borderResult.polygon_norm;
      metrics.card_fill_ratio = polygonAreaNorm(borderResult.polygon_norm);
      metrics.background_ratio = Number.isFinite(metrics.card_fill_ratio)
        ? Math.max(0, 1 - metrics.card_fill_ratio)
        : null;
    }
  } catch (error) {
    metrics.border_error = error?.message ?? String(error);
    metrics.border_notes = ['border_detection_exception'];
  }

  if (metrics.border_detected && metrics.polygon_norm) {
    metrics.warp_attempted = true;
    const warpStart = performance.now();
    try {
      const warp = await warpCardQuadAI({
        imageBuffer: raw.buffer,
        quadNorm: metrics.polygon_norm,
        outW: NORMALIZED_CARD_WIDTH,
        outH: NORMALIZED_CARD_HEIGHT,
        timeoutMs: WARP_TIMEOUT_MS,
      });
      metrics.warp_elapsed_ms = roundMs(warpStart);
      if (warp?.ok && Buffer.isBuffer(warp.imageBuffer)) {
        const normalized = await normalizeWarpedCard(warp.imageBuffer);
        normalizedBuffer = normalized.buffer;
        metrics.warp_success = true;
        normalizedSource = 'warp';
      } else {
        metrics.fallback_reason = warp?.error ?? 'warp_failed';
      }
    } catch (error) {
      metrics.warp_elapsed_ms = roundMs(warpStart);
      metrics.fallback_reason = error?.message ?? String(error);
    }
  } else {
    metrics.fallback_reason = metrics.border_error || 'border_not_detected';
  }

  if (!normalizedBuffer) {
    try {
      const fallback = await normalizeFromFallbackCrop(raw.buffer, { width: raw.width, height: raw.height });
      normalizedBuffer = fallback.buffer;
      normalizedSource = 'center_portrait_crop';
      metrics.fallback_crop_region = fallback.crop_region;
      metrics.fallback_crop_area_ratio = fallback.crop_area_ratio;
      if (!Number.isFinite(metrics.background_ratio)) {
        metrics.background_ratio = Math.max(0, 1 - fallback.crop_area_ratio);
      }
    } catch (error) {
      metrics.fallback_reason = metrics.fallback_reason
        ? `${metrics.fallback_reason};${error?.message ?? String(error)}`
        : error?.message ?? String(error);
    }
  }

  if (normalizedBuffer) {
    await writeFile(path.join(outputDir, 'normalized_full_card.jpg'), normalizedBuffer);
    const meta = await sharp(normalizedBuffer, { failOn: 'none' }).metadata();
    metrics.normalized_width = Number(meta.width) || null;
    metrics.normalized_height = Number(meta.height) || null;
    metrics.normalized_source = normalizedSource;

    const regions = await extractNormalizedRegions(normalizedBuffer);
    await writeFile(path.join(outputDir, 'normalized_artwork_region.jpg'), regions.artwork.buffer);
    await writeFile(path.join(outputDir, 'normalized_bottom_band.jpg'), regions.bottomBand.buffer);
    metrics.artwork_region = regions.artwork.region;
    metrics.bottom_band_region = regions.bottomBand.region;

    const contactSheet = await buildContactSheet({
      rawBuffer: raw.buffer,
      normalizedBuffer,
      artworkBuffer: regions.artwork.buffer,
      bottomBandBuffer: regions.bottomBand.buffer,
    });
    await writeFile(path.join(outputDir, 'contact_sheet.jpg'), contactSheet);

    const quality = await computeScanQualityMetrics(normalizedBuffer);
    Object.assign(metrics, quality);
  }

  const gate = evaluateCaptureAcceptance({
    decodeOk: metrics.decode_ok,
    normalizedExists: Boolean(normalizedBuffer),
    qualityMetrics: metrics,
    borderDetected: metrics.border_detected,
    borderConfidence: metrics.border_confidence,
    cardFillRatio: metrics.card_fill_ratio,
    warpSuccess: metrics.warp_success,
  });
  Object.assign(metrics, gate);

  await writeJson(path.join(outputDir, 'metrics.json'), metrics);

  return {
    metrics,
    normalized_success: Boolean(normalizedBuffer),
    accepted: metrics.capture_accepted === true,
    fallback_used: normalizedSource === 'center_portrait_crop',
    warp_success: metrics.warp_success === true,
  };
}

function summaryForResults({ inputFolder, outputFolder, files, results }) {
  const imageResults = results.map((result, index) => ({
    index: index + 1,
    input_path: result.metrics.input_path,
    output_dir: result.metrics.output_dir,
    decode_ok: result.metrics.decode_ok,
    normalized_source: result.metrics.normalized_source ?? 'none',
    normalized_success: result.normalized_success,
    capture_accepted: result.accepted,
    border_detected: result.metrics.border_detected,
    border_confidence: result.metrics.border_confidence,
    warp_attempted: result.metrics.warp_attempted,
    warp_success: result.warp_success,
    fallback_reason: result.metrics.fallback_reason,
    brightness_score: result.metrics.brightness_score ?? null,
    blur_score: result.metrics.blur_score ?? null,
    glare_score: result.metrics.glare_score ?? null,
    rejection_reasons: result.metrics.rejection_reasons ?? [],
  }));

  return {
    generated_at: new Date().toISOString(),
    input_folder: inputFolder,
    output_folder: outputFolder,
    total_images: files.length,
    normalized_success_count: results.filter((result) => result.normalized_success).length,
    accepted_count: results.filter((result) => result.accepted).length,
    rejected_count: results.filter((result) => result.normalized_success && !result.accepted).length,
    fallback_count: results.filter((result) => result.fallback_used).length,
    warp_success_count: results.filter((result) => result.warp_success).length,
    average_blur_score: average(results.map((result) => result.metrics.blur_score)),
    average_brightness_score: average(results.map((result) => result.metrics.brightness_score)),
    average_glare_score: average(results.map((result) => result.metrics.glare_score)),
    per_image: imageResults,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const inputFolder = await discoverInputFolder(args.folder);
  if (!inputFolder) {
    throw new Error(`input_folder_not_found:${args.folder || DEFAULT_INPUT_FOLDER}`);
  }

  const outputFolder = path.resolve(args.out || DEFAULT_OUTPUT_FOLDER);
  await ensureDir(outputFolder);

  const files = await listImageFiles(inputFolder, args.limit);
  if (files.length === 0) {
    throw new Error(`no_images_found:${inputFolder}`);
  }

  const results = [];
  for (let index = 0; index < files.length; index += 1) {
    const filePath = files[index];
    const base = sanitizePathSegment(path.basename(filePath), `image_${index + 1}`);
    const imageOutputDir = path.join(outputFolder, `${String(index + 1).padStart(2, '0')}_${base}`);
    const result = await normalizeImage({
      inputPath: filePath,
      outputDir: imageOutputDir,
    });
    results.push(result);

    console.log(JSON.stringify({
      index: index + 1,
      file: path.basename(filePath),
      source: result.metrics.normalized_source ?? 'none',
      accepted: result.accepted,
      warp_success: result.warp_success,
      fallback: result.fallback_used,
      blur_score: result.metrics.blur_score ?? null,
      brightness_score: result.metrics.brightness_score ?? null,
      glare_score: result.metrics.glare_score ?? null,
      rejection_reasons: result.metrics.rejection_reasons ?? [],
      output_dir: imageOutputDir,
    }));
  }

  const summary = summaryForResults({
    inputFolder,
    outputFolder,
    files,
    results,
  });
  await writeJson(path.join(outputFolder, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
