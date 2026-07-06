import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import {
  loadScannerV5Artifact,
  lookupByNumber,
} from './scanner_v5_artifact_v1.mjs';

const DEFAULT_ARTIFACT_DIR = '.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1';
const OCR_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/.:- ';
const OCR_NUMBER_CHARSET = '0123456789/';
const require = createRequire(import.meta.url);

export async function ocrCardNumberFile(inputPath, options = {}) {
  const buffer = await readFile(path.resolve(inputPath));
  return ocrCardNumberBuffer(buffer, {
    ...options,
    sourcePath: inputPath,
  });
}

export async function ocrCardNumberBuffer(imageBuffer, options = {}) {
  const artifactDir = options.artifactDir ?? process.env.SCANNER_V5_ARTIFACT_DIR ?? DEFAULT_ARTIFACT_DIR;
  const artifact = options.artifact ?? await loadScannerV5Artifact(artifactDir);
  const crops = await bottomStripOcrCrops(imageBuffer);
  if (options.debugDir) {
    await mkdir(options.debugDir, { recursive: true });
    for (const crop of crops) {
      await writeFile(path.join(options.debugDir, `${crop.name}.png`), crop.buffer);
    }
  }
  const ocr = await runTesseractOnCrops(crops).catch((error) => ({
    available: false,
    text: '',
    confidence: null,
    error: error?.message || String(error),
  }));
  const parsed = parseCardNumberText(ocr.text);
  const number = parsed.number ?? null;
  const setTotal = parsed.set_total ?? null;
  const setCodeGuess = parsed.set_code_guess ?? null;
  const matches = lookupByNumber(artifact, { number, setTotal, setCodeGuess });

  const result = {
    number,
    set_total: setTotal,
    set_code_guess: setCodeGuess,
    matches,
    ocr_confidence: ocr.confidence,
    ocr_available: ocr.available,
    ocr_text: ocr.text,
    ocr_error: ocr.error ?? null,
    parser_source: parsed.number ? 'tesseract' : 'none',
    raw_crops: ocr.raw_crops ?? [],
  };
  if (options.debugDir) {
    await writeFile(path.join(options.debugDir, 'ocr_card_number.json'), JSON.stringify(result, null, 2));
  }
  return result;
}

export function parseCardNumberText(text) {
  const cleaned = String(text ?? '')
    .replace(/[|\\]/g, '/')
    .replace(/[^\w/.\-: ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const numberMatches = [...cleaned.matchAll(/(?:^|[^0-9])(\d{1,4})\s*\/\s*(\d{1,4})(?:[^0-9]|$)/g)];
  const numberMatch = numberMatches.find((match) => {
    const total = Number.parseInt(match[2], 10);
    return Number.isInteger(total) && total > 0 && total <= 500;
  }) ?? numberMatches[0];
  const standaloneNumber = cleaned.match(/(?:^|[^0-9])(\d{1,4})(?:[^0-9]|$)/);
  const setCodeWithNumber = cleaned.match(/\b([A-Z](?:\s*[A-Z]){1,4})\s*[- ]\s*\d{1,4}\b/);
  const setCodeMatch = cleaned.match(/\b(ASC|POR|SV\d{1,2}(?:\.\d+[A-Z]?)?)\b/);
  return {
    number: normalizeNumber(numberMatch?.[1] ?? standaloneNumber?.[1]),
    set_total: normalizeNumber(numberMatch?.[2]),
    set_code_guess: normalizeSetCode(setCodeWithNumber?.[1] ?? setCodeMatch?.[1]),
    cleaned_text: cleaned,
  };
}

async function bottomStripOcrCrops(imageBuffer) {
  const metadata = await sharp(imageBuffer, { failOn: 'none' }).metadata();
  const width = metadata.width ?? 716;
  const height = metadata.height ?? 1000;
  const specs = [
    { name: 'number_only_left', left: Math.round(width * 0.12), top: Math.round(height * 0.915), width: Math.round(width * 0.25), height: Math.round(height * 0.055), mode: 'soft' },
    { name: 'number_zone_left', left: Math.round(width * 0.09), top: Math.round(height * 0.905), width: Math.round(width * 0.36), height: Math.round(height * 0.075), mode: 'soft' },
    { name: 'number_zone_left_wide', left: Math.round(width * 0.075), top: Math.round(height * 0.885), width: Math.round(width * 0.50), height: Math.round(height * 0.11), mode: 'soft' },
    { name: 'set_code_footer_left', left: Math.round(width * 0.045), top: Math.round(height * 0.78), width: Math.round(width * 0.62), height: Math.round(height * 0.20), mode: 'soft' },
    { name: 'set_code_footer_tight', left: Math.round(width * 0.06), top: Math.round(height * 0.90), width: Math.round(width * 0.38), height: Math.round(height * 0.08), mode: 'set_code' },
  ];
  return Promise.all(specs.map(async (spec) => {
    let pipeline = sharp(imageBuffer, { failOn: 'none' })
      .extract({
        left: Math.max(0, spec.left),
        top: Math.max(0, spec.top),
        width: Math.min(width - spec.left, spec.width),
        height: Math.min(height - spec.top, spec.height),
      })
      .resize({ width: Math.max(900, spec.width * 3), withoutEnlargement: false })
      .grayscale()
      .normalize();
    if (spec.mode === 'threshold') {
      pipeline = pipeline.threshold(125);
    } else if (spec.mode === 'set_code') {
      pipeline = pipeline.sharpen();
    } else if (spec.mode !== 'soft') {
      pipeline = pipeline.threshold(150);
    }
    const buffer = await pipeline.png().toBuffer();
    return { ...spec, buffer };
  }));
}

async function runTesseractOnCrops(crops) {
  let createWorker;
  try {
    ({ createWorker } = await import('tesseract.js'));
  } catch {
    return {
      available: false,
      text: '',
      confidence: null,
      error: 'tesseract.js_not_installed',
    };
  }

  const worker = await createWorker('eng', 1, localTesseractOptions());
  try {
    await worker.setParameters({
      tessedit_char_whitelist: OCR_CHARSET,
      tessedit_pageseg_mode: '7',
    });
    const results = [];
    for (const crop of crops) {
      await worker.setParameters({
        tessedit_char_whitelist: crop.name.startsWith('number_') ? OCR_NUMBER_CHARSET : OCR_CHARSET,
        tessedit_pageseg_mode: crop.name.startsWith('number_') ? '6' : '7',
      });
      const result = await worker.recognize(crop.buffer);
      results.push({
        crop: crop.name,
        text: result.data?.text ?? '',
        confidence: Number(result.data?.confidence),
      });
    }
    return {
      available: true,
      text: results.map((row) => row.text).join('\n'),
      confidence: average(results.map((row) => row.confidence).filter(Number.isFinite)),
      raw_crops: results,
    };
  } finally {
    await worker.terminate().catch(() => {});
  }
}

function localTesseractOptions() {
  try {
    const englishDataIndex = require.resolve('@tesseract.js-data/eng');
    const englishDataRoot = path.dirname(englishDataIndex);
    return {
      langPath: path.join(englishDataRoot, '4.0.0_best_int'),
      gzip: true,
      cacheMethod: 'none',
    };
  } catch {
    return {};
  }
}

function normalizeNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const match = text.match(/\d+/);
  if (!match) return null;
  return String(Number.parseInt(match[0], 10)).padStart(3, '0');
}

function normalizeSetCode(value) {
  const text = String(value ?? '').trim();
  return text ? text.toLowerCase().replace(/[^a-z0-9.]+/g, '') : null;
}

function average(values) {
  return values.length === 0
    ? null
    : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

async function main() {
  const [input, outdir] = process.argv.slice(2);
  if (!input) {
    console.error('Usage: node ocr_card_number_v1.mjs <rectified-image> [outdir]');
    process.exitCode = 1;
    return;
  }
  const result = await ocrCardNumberFile(input);
  if (outdir) {
    await mkdir(outdir, { recursive: true });
    await writeFile(path.join(outdir, 'ocr_card_number.json'), JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
