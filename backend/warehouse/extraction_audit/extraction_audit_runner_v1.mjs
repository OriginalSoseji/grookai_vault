import '../../env.mjs';

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

import { createBackendClient } from '../../supabase_backend_client.mjs';
import {
  compareParsedCollectorNumbersV1,
  parseCollectorNumberV1,
} from '../../identity/parseCollectorNumberV1.mjs';
import {
  canSafelyAdoptCanonNameV1,
  levenshteinDistanceV1,
  normalizeCardNameV1,
} from '../../identity/normalizeCardNameV1.mjs';
import { preprocessImageV1 } from '../../identity/preprocessImageV1.mjs';
import { normalizeSetIdentityV1 } from '../../identity/normalizeSetIdentityV1.mjs';

import {
  classifySetOutcome,
  stableOutputView,
  validateDeterminism,
  validateExpected,
  validateReplay,
  validateSchema,
  validateSemantics,
} from './extraction_assertions_v1.mjs';
import {
  appendCaseReport,
  createReport,
  printReport,
  writeReport,
} from './extraction_reporter_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_REPORT_PATH = path.join(REPO_ROOT, 'tmp', 'extraction_audit_report_v1.json');
const DEFAULT_AI_TIMEOUT_MS = 120_000;
const DEFAULT_OCR_TIMEOUT_MS = 120_000;
const POWERSHELL_TRANSFORM_SCRIPT = `
param(
  [Parameter(Mandatory = $true)]
  [string]$SpecPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-Color([string]$Hex, [int]$Alpha) {
  $clean = ($Hex -replace '^#','')
  if ($clean.Length -ne 6) {
    throw "invalid_color:$Hex"
  }
  $r = [Convert]::ToInt32($clean.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($clean.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($clean.Substring(4, 2), 16)
  return [System.Drawing.Color]::FromArgb($Alpha, $r, $g, $b)
}

function Get-NormValue($step, [string]$key, [int]$scale, [int]$fallback) {
  $valueRaw = $step.PSObject.Properties[$key].Value
  if ($null -eq $valueRaw) {
    return $fallback
  }
  $value = [double]$valueRaw
  return [int][Math]::Round($value * $scale)
}

$spec = Get-Content -LiteralPath $SpecPath -Raw | ConvertFrom-Json
$current = [System.Drawing.Bitmap]::new($spec.sourcePath)

try {
  foreach ($step in $spec.steps) {
    switch ([string]$step.kind) {
      'rotate90' {
        $current.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)
      }
      'rotate180' {
        $current.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone)
      }
      'crop' {
        $x = Get-NormValue $step 'x' $current.Width 0
        $y = Get-NormValue $step 'y' $current.Height 0
        $w = Get-NormValue $step 'w' $current.Width $current.Width
        $h = Get-NormValue $step 'h' $current.Height $current.Height
        if ($x -lt 0) { $x = 0 }
        if ($y -lt 0) { $y = 0 }
        if ($w -lt 1) { $w = 1 }
        if ($h -lt 1) { $h = 1 }
        if ($x + $w -gt $current.Width) { $w = $current.Width - $x }
        if ($y + $h -gt $current.Height) { $h = $current.Height - $y }

        $dest = [System.Drawing.Bitmap]::new($w, $h)
        $graphics = [System.Drawing.Graphics]::FromImage($dest)
        try {
          $destRect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
          $graphics.DrawImage($current, $destRect, $x, $y, $w, $h, [System.Drawing.GraphicsUnit]::Pixel)
        } finally {
          $graphics.Dispose()
        }

        $current.Dispose()
        $current = $dest
      }
      'overlay_rect' {
        $graphics = [System.Drawing.Graphics]::FromImage($current)
        try {
          $brush = [System.Drawing.SolidBrush]::new((New-Color ([string]$step.color) ([int]$step.alpha)))
          try {
            $x = Get-NormValue $step 'x' $current.Width 0
            $y = Get-NormValue $step 'y' $current.Height 0
            $w = Get-NormValue $step 'w' $current.Width $current.Width
            $h = Get-NormValue $step 'h' $current.Height $current.Height
            $graphics.FillRectangle($brush, $x, $y, $w, $h)
          } finally {
            $brush.Dispose()
          }
        } finally {
          $graphics.Dispose()
        }
      }
      'overlay_ellipse' {
        $graphics = [System.Drawing.Graphics]::FromImage($current)
        try {
          $brush = [System.Drawing.SolidBrush]::new((New-Color ([string]$step.color) ([int]$step.alpha)))
          try {
            $x = Get-NormValue $step 'x' $current.Width 0
            $y = Get-NormValue $step 'y' $current.Height 0
            $w = Get-NormValue $step 'w' $current.Width $current.Width
            $h = Get-NormValue $step 'h' $current.Height $current.Height
            $graphics.FillEllipse($brush, $x, $y, $w, $h)
          } finally {
            $brush.Dispose()
          }
        } finally {
          $graphics.Dispose()
        }
      }
      'overlay_text' {
        $graphics = [System.Drawing.Graphics]::FromImage($current)
        try {
          $fontSize = [Math]::Max(12, [int][Math]::Round(([double]$step.size) * $current.Height))
          $font = [System.Drawing.Font]::new('Arial', $fontSize, [System.Drawing.FontStyle]::Bold)
          $brush = [System.Drawing.SolidBrush]::new((New-Color ([string]$step.color) ([int]$step.alpha)))
          try {
            $graphics.DrawString(
              [string]$step.text,
              $font,
              $brush,
              [float](Get-NormValue $step 'x' $current.Width 0),
              [float](Get-NormValue $step 'y' $current.Height 0)
            )
          } finally {
            $brush.Dispose()
            $font.Dispose()
          }
        } finally {
          $graphics.Dispose()
        }
      }
      default {
        throw "unsupported_transform:$($step.kind)"
      }
    }
  }

  $directory = [System.IO.Path]::GetDirectoryName($spec.outputPath)
  if ($directory) {
    [void][System.IO.Directory]::CreateDirectory($directory)
  }

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' } |
    Select-Object -First 1
  if ($null -ne $codec) {
    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
    try {
      $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new($encoder, [long]90)
      $current.Save($spec.outputPath, $codec, $parameters)
    } finally {
      $parameters.Dispose()
    }
  } else {
    $current.Save($spec.outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  }
}
finally {
  $current.Dispose()
}
`;

function usage() {
  console.log('Usage:');
  console.log('  node extraction_audit_runner_v1.mjs --all');
  console.log('  node extraction_audit_runner_v1.mjs --case mega_clean');
}

function parseArgs(argv) {
  const opts = {
    all: false,
    caseId: null,
    reportPath: DEFAULT_REPORT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') {
      opts.all = true;
      continue;
    }
    if (arg === '--case') {
      opts.caseId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg.startsWith('--case=')) {
      opts.caseId = arg.slice('--case='.length);
      continue;
    }
    if (arg.startsWith('--report=')) {
      opts.reportPath = path.resolve(REPO_ROOT, arg.slice('--report='.length));
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
  }

  if (!opts.all && !opts.caseId) {
    opts.all = true;
  }

  return opts;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCollectorNumber(value) {
  const parsed = parseCollectorNumberV1(value);
  return parsed.ok ? parsed.number_raw : null;
}

function normalizeNumberPlain(value) {
  const parsed = parseCollectorNumberV1(value);
  return parsed.ok ? parsed.number_plain : null;
}

function clamp01(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function buildTraceId(caseId, runIndex) {
  return `extraction_audit:${caseId}:run_${runIndex}`;
}

async function loadJson(jsonPath) {
  return JSON.parse(await fs.readFile(jsonPath, 'utf8'));
}

async function ensureRuntimeDir() {
  const dir = path.join(os.tmpdir(), 'grookai_extraction_audit_v1');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function resolveCaseImagePath(caseDef) {
  return path.resolve(__dirname, caseDef.image_path);
}

async function writeRuntimeScript(runtimeDir) {
  const scriptPath = path.join(runtimeDir, 'image_transform_v1.ps1');
  await fs.writeFile(scriptPath, POWERSHELL_TRANSFORM_SCRIPT, 'utf8');
  return scriptPath;
}

async function createCorruptedCopy(sourcePath, runtimeDir, caseId) {
  const outputPath = path.join(runtimeDir, `${caseId}_corrupted.jpg`);
  await fs.writeFile(outputPath, Buffer.from('not a real image', 'utf8'));
  return outputPath;
}

async function createTransformedImage(sourcePath, steps, runtimeDir, caseId) {
  const scriptPath = await writeRuntimeScript(runtimeDir);
  const outputPath = path.join(runtimeDir, `${caseId}.jpg`);
  const specPath = path.join(runtimeDir, `${caseId}.json`);
  await fs.writeFile(
    specPath,
    JSON.stringify(
      {
        sourcePath,
        outputPath,
        steps,
      },
      null,
      2,
    ),
    'utf8',
  );

  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-SpecPath', specPath],
    {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `transform_failed:${result.stderr?.trim() || result.stdout?.trim() || 'powershell_failed'}`,
    );
  }

  return outputPath;
}

async function prepareCaseImage(caseDef, runtimeDir) {
  const basePath = resolveCaseImagePath(caseDef);

  if (caseDef?.simulation?.kind === 'corrupted_copy') {
    return {
      imagePath: await createCorruptedCopy(basePath, runtimeDir, caseDef.id),
      generated: true,
    };
  }

  if (Array.isArray(caseDef.transforms) && caseDef.transforms.length > 0) {
    return {
      imagePath: await createTransformedImage(basePath, caseDef.transforms, runtimeDir, caseDef.id),
      generated: true,
    };
  }

  return {
    imagePath: basePath,
    generated: false,
  };
}

async function readImageBuffer(imagePath) {
  const stat = await fs.stat(imagePath);
  if (!stat.isFile()) {
    throw new Error('image_not_a_file');
  }
  return fs.readFile(imagePath);
}

async function aiIdentifyWarp({ imageBuffer, traceId, timeoutMs }) {
  const baseUrl = normalizeText(process.env.GV_AI_BORDER_URL);
  const token = normalizeText(process.env.GV_AI_ENDPOINT_TOKEN);
  if (!baseUrl) {
    throw new Error('missing_gv_ai_border_url');
  }
  if (!token) {
    throw new Error('missing_gv_ai_endpoint_token');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs || DEFAULT_AI_TIMEOUT_MS));

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/ai-identify-warp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gv-token': token,
      },
      body: JSON.stringify({
        image_b64: imageBuffer.toString('base64'),
        force_refresh: false,
        trace_id: traceId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ai_http_${response.status}`);
    }

    const payload = await response.json();
    const result = payload?.result && typeof payload.result === 'object' ? payload.result : payload;
    if (payload?.ok === false || normalizeText(payload?.error) || normalizeText(result?.error)) {
      return {
        ok: false,
        error: normalizeAiError(
          normalizeText(payload?.error) || normalizeText(result?.error) || 'ai_failed',
        ),
      };
    }
    return {
      ok: true,
      payload,
      result,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        error: 'ai_timeout',
      };
    }
    return {
      ok: false,
      error: normalizeAiError(error?.message || 'ai_failed'),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function ocrCardSignalsSurface({ imageBuffer, timeoutMs }) {
  const baseUrl = normalizeText(process.env.GV_AI_BORDER_URL);
  const token = normalizeText(process.env.GV_AI_ENDPOINT_TOKEN);
  if (!baseUrl) {
    throw new Error('missing_gv_ai_border_url');
  }
  if (!token) {
    throw new Error('missing_gv_ai_endpoint_token');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs || DEFAULT_OCR_TIMEOUT_MS));

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/ocr-card-signals`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gv-token': token,
      },
      body: JSON.stringify({
        image_b64: imageBuffer.toString('base64'),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ocr_http_${response.status}`);
    }

    const payload = await response.json();
    if (normalizeText(payload?.error)) {
      const normalizedPayloadError = /cannot identify image file/i.test(String(payload.error))
        ? 'ocr_invalid_image'
        : normalizeText(payload.error);
      return {
        ok: false,
        error: normalizedPayloadError,
        notes: [],
      };
    }

    return {
      ok: true,
      result: payload,
      notes: [],
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        error: 'ocr_timeout',
        notes: ['This operation was aborted'],
      };
    }
    return {
      ok: false,
      error: error?.message || 'ocr_failed',
      notes: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractAiRawName(ai) {
  return normalizeText(ai?.result?.raw_name_text ?? ai?.result?.name ?? ai?.result?.name?.text);
}

function extractAiRawNumber(ai) {
  return normalizeText(
    ai?.result?.raw_number_text ??
      ai?.result?.collector_number ??
      ai?.result?.number ??
      ai?.result?.number_raw ??
      ai?.result?.number_raw?.text,
  );
}

function extractAiParsedNumber(ai) {
  return parseCollectorNumberV1(extractAiRawNumber(ai));
}

function extractAiConfidence(ai) {
  return clamp01(
    ai?.result?.confidence_0_1 ??
      ai?.result?.confidence ??
      ai?.payload?.confidence_0_1 ??
      ai?.payload?.confidence,
  );
}

function normalizeAiError(errorText) {
  const normalized = normalizeText(errorText);
  if (!normalized) return 'ai_failed';
  if (/cannot identify image file/i.test(normalized)) return 'ai_invalid_image';
  return normalized;
}

function extractAiRawSetAbbrev(ai) {
  return normalizeText(ai?.result?.raw_set_abbrev_text ?? ai?.result?.set_abbrev ?? null);
}

function extractAiRawSetText(ai) {
  return normalizeText(ai?.result?.raw_set_text ?? ai?.result?.set_text ?? null);
}

function extractAiSetConfidence(ai) {
  return clamp01(
    ai?.result?.set_confidence_0_1 ??
      ai?.result?.set_confidence ??
      ai?.payload?.set_confidence_0_1 ??
      ai?.payload?.set_confidence,
  );
}

function extractOcrRawName(ocr) {
  return normalizeText(ocr?.result?.name?.text);
}

function extractOcrRawNumber(ocr) {
  return normalizeText(ocr?.result?.number_raw?.text);
}

function extractOcrParsedNumber(ocr) {
  return parseCollectorNumberV1(extractOcrRawNumber(ocr));
}

function extractOcrSet(ocr) {
  return normalizeText(ocr?.result?.printed_set_abbrev_raw?.text)?.toUpperCase() ?? null;
}

function extractOcrSetText(ocr) {
  return normalizeText(
    ocr?.result?.raw_set_text?.text ??
      ocr?.result?.raw_set_text ??
      ocr?.result?.set_text?.text ??
      ocr?.result?.set_text ??
      null,
  );
}

function extractOcrSetSymbolRegionText(ocr) {
  return normalizeText(
    ocr?.result?.raw_set_symbol_region_text?.text ??
      ocr?.result?.raw_set_symbol_region_text ??
      null,
  );
}

function extractOcrSetCandidateSignals(ocr, sourcePrefix = '') {
  const signals = Array.isArray(ocr?.result?.raw_set_candidate_signals)
    ? ocr.result.raw_set_candidate_signals
    : [];

  return signals
    .map((signal) => ({
      ...signal,
      source: `${sourcePrefix}${normalizeText(signal?.source) ?? 'ocr:set_candidate'}`,
      text: normalizeText(signal?.text ?? signal?.raw_text),
      confidence: clamp01(signal?.confidence ?? 0),
      kind: normalizeText(signal?.kind) ?? 'abbrev',
    }))
    .filter((signal) => signal.text);
}

function extractOcrConfidence(ocr, key) {
  return clamp01(ocr?.result?.[key]?.confidence ?? 0);
}

function chooseResolvedNumber(primaryParsed, secondaryParsed, errors, ambiguityFlags) {
  const comparison = compareParsedCollectorNumbersV1(primaryParsed, secondaryParsed);

  if (comparison.comparable && comparison.agrees) {
    return primaryParsed.number_raw;
  }

  if (comparison.comparable && !comparison.agrees) {
    ambiguityFlags.push('number_source_conflict');
    errors.push('number_source_conflict');
    return null;
  }

  if (primaryParsed?.ok) return primaryParsed.number_raw;
  if (secondaryParsed?.ok) return secondaryParsed.number_raw;
  return null;
}

function choosePassSet(primarySet, secondarySet, errors, ambiguityFlags) {
  if (primarySet && secondarySet && primarySet !== secondarySet) {
    ambiguityFlags.push('set_source_conflict');
    errors.push('set_source_conflict');
    return null;
  }
  return primarySet ?? secondarySet ?? null;
}

function buildSetRawSignals({ ai, ocr, preprocessed }) {
  const baseSignals = {
    ai: {
      raw_set_abbrev_text: extractAiRawSetAbbrev(ai),
      raw_set_text: extractAiRawSetText(ai),
      set_confidence: extractAiSetConfidence(ai),
    },
    ocr: {
      raw_set_abbrev_text: extractOcrSet(ocr),
      raw_set_text: extractOcrSetText(ocr),
      raw_set_symbol_region_text: extractOcrSetSymbolRegionText(ocr),
      set_confidence: extractOcrConfidence(ocr, 'printed_set_abbrev_raw'),
      set_symbol_region_confidence: extractOcrConfidence(ocr, 'raw_set_symbol_region_text'),
      raw_set_candidate_signals: extractOcrSetCandidateSignals(ocr),
    },
  };

  if (!preprocessed) {
    return baseSignals;
  }

  const preprocessedAi = {
    raw_set_abbrev_text: extractAiRawSetAbbrev(preprocessed.ai),
    raw_set_text: extractAiRawSetText(preprocessed.ai),
    set_confidence: extractAiSetConfidence(preprocessed.ai),
  };

  const preprocessedOcrSignals = extractOcrSetCandidateSignals(preprocessed.ocr, 'preprocessed:');
  const preprocessedOcr = {
    raw_set_abbrev_text: extractOcrSet(preprocessed.ocr),
    raw_set_text: extractOcrSetText(preprocessed.ocr),
    raw_set_symbol_region_text: extractOcrSetSymbolRegionText(preprocessed.ocr),
    set_confidence: extractOcrConfidence(preprocessed.ocr, 'printed_set_abbrev_raw'),
    set_symbol_region_confidence: extractOcrConfidence(preprocessed.ocr, 'raw_set_symbol_region_text'),
    raw_set_candidate_signals: preprocessedOcrSignals,
  };

  return {
    ai: {
      ...baseSignals.ai,
      preprocessed: preprocessedAi,
    },
    ocr: {
      ...baseSignals.ocr,
      raw_set_candidate_signals: [
        ...baseSignals.ocr.raw_set_candidate_signals,
        ...preprocessedOcrSignals,
      ],
      preprocessed: preprocessedOcr,
    },
  };
}

function boostConfidence(base, delta) {
  return clamp01((Number.isFinite(base) ? base : 0) + delta);
}

async function resolveCanonNameCorrection(supabase, extractedName, parsedNumber) {
  const normalizedName = normalizeText(extractedName);
  if (!normalizedName || !parsedNumber?.ok || !parsedNumber.number_plain) {
    return null;
  }

  const numberVariants = Array.from(
    new Set(
      [parsedNumber.number_plain, String(Number.parseInt(parsedNumber.number_plain, 10))]
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  );

  const { data, error } = await supabase
    .from('card_prints')
    .select('id,name,number,number_plain,set_code')
    .in('number_plain', numberVariants)
    .limit(250);

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const ranked = data
    .filter((row) => normalizeText(row?.name))
    .map((row) => ({
      ...row,
      distance: levenshteinDistanceV1(normalizedName, row.name),
      correction: canSafelyAdoptCanonNameV1(normalizedName, row.name),
    }))
    .filter((row) => row.correction.ok)
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.name.localeCompare(right.name),
    );

  if (ranked.length === 0) return null;

  const best = ranked[0];
  const second = ranked[1] ?? null;
  if (
    second &&
    second.distance === best.distance &&
    second.correction?.reason === best.correction?.reason &&
    second.name !== best.name
  ) {
    return null;
  }

  return {
    canonName: best.name,
    cardPrintId: best.id,
    distance: best.distance,
    correctionReason: best.correction.reason,
  };
}

async function resolveCandidates(supabase, name, number) {
  const normalizedName = normalizeText(name);
  const normalizedNumber = normalizeCollectorNumber(number);
  if (!normalizedName) {
    return {
      ok: true,
      rows: [],
      query: null,
    };
  }

  const { data, error } = await supabase.rpc('search_card_prints_v1', {
    q: normalizedName,
    set_code_in: null,
    number_in: normalizedNumber,
    limit_in: 5,
    offset_in: 0,
  });

  if (error) {
    return {
      ok: false,
      rows: [],
      error: error.message,
      query: {
        q: normalizedName,
        number_in: normalizedNumber,
      },
    };
  }

  return {
    ok: true,
    rows: Array.isArray(data)
      ? data.map((row) => ({
          card_print_id: row.card_print_id,
          name: row.name,
          set_code: row.set_code,
          number: row.number,
          printed_set_abbrev: row.printed_set_abbrev,
          lane: row.lane,
          variant_key: row.variant_key,
        }))
      : [],
    query: {
      q: normalizedName,
      number_in: normalizedNumber,
    },
  };
}

async function buildExtractionResult({
  caseDef,
  imagePath,
  supabase,
  ai,
  ocr,
  preprocessed,
}) {
  const errors = [];
  const ambiguityFlags = [];
  const primaryOcrSetConfidence = extractOcrConfidence(ocr, 'printed_set_abbrev_raw');

  if (!ai.ok) {
    errors.push(ai.error);
  }

  const aiRawName = extractAiRawName(ai);
  const aiRawNumber = extractAiRawNumber(ai);
  const aiParsedNumber = extractAiParsedNumber(ai);
  const aiConfidence = extractAiConfidence(ai);

  const ocrRawName = extractOcrRawName(ocr);
  const ocrParsedNumber = extractOcrParsedNumber(ocr);
  const ocrSet = extractOcrSet(ocr);

  const primaryNameSeed = aiRawName ?? ocrRawName;
  const canonCorrection = await resolveCanonNameCorrection(
    supabase,
    primaryNameSeed,
    aiParsedNumber.ok ? aiParsedNumber : ocrParsedNumber,
  );

  const primaryName = normalizeCardNameV1(primaryNameSeed, {
    canonName: canonCorrection?.canonName ?? null,
  });
  const primaryNumber = chooseResolvedNumber(aiParsedNumber, ocrParsedNumber, errors, ambiguityFlags);
  const primarySet = primaryOcrSetConfidence >= 0.5 ? choosePassSet(ocrSet, null, errors, ambiguityFlags) : null;

  const primaryConfidence = {
    name: primaryName.ok
      ? primaryName.used_canon_correction
        ? boostConfidence(aiConfidence || extractOcrConfidence(ocr, 'name'), 0.08)
        : aiRawName
          ? aiConfidence
          : extractOcrConfidence(ocr, 'name')
      : 0,
    number: primaryNumber
      ? aiParsedNumber.ok
        ? aiConfidence
        : extractOcrConfidence(ocr, 'number_raw')
      : 0,
    set: primarySet ? primaryOcrSetConfidence : 0,
  };

  let finalName = primaryName.corrected_name ?? null;
  let finalNumber = primaryNumber;
  let finalSet = primarySet;
  let confidenceIdentity = { ...primaryConfidence };
  let preprocessedSignals = null;

  if (preprocessed) {
    const preprocessedSetConfidence = extractOcrConfidence(preprocessed.ocr, 'printed_set_abbrev_raw');

    if (!preprocessed.ai.ok) {
      errors.push(preprocessed.ai.error);
    }

    const preAiRawName = extractAiRawName(preprocessed.ai);
    const preAiParsedNumber = extractAiParsedNumber(preprocessed.ai);
    const preAiConfidence = extractAiConfidence(preprocessed.ai);
    const preOcrRawName = extractOcrRawName(preprocessed.ocr);
    const preOcrParsedNumber = extractOcrParsedNumber(preprocessed.ocr);
    const preOcrSet = extractOcrSet(preprocessed.ocr);
    const preNameSeed = preAiRawName ?? preOcrRawName;
    const preCanonCorrection = await resolveCanonNameCorrection(
      supabase,
      preNameSeed,
      preAiParsedNumber.ok ? preAiParsedNumber : preOcrParsedNumber,
    );
    const preName = normalizeCardNameV1(preNameSeed, {
      canonName: preCanonCorrection?.canonName ?? null,
    });
    const preNumber = chooseResolvedNumber(
      preAiParsedNumber,
      preOcrParsedNumber,
      errors,
      ambiguityFlags,
    );
    const preSet =
      preprocessedSetConfidence >= 0.5
        ? choosePassSet(preOcrSet, null, errors, ambiguityFlags)
        : null;

    preprocessedSignals = {
      ai_name: preAiRawName,
      ai_number: preAiParsedNumber.ok ? preAiParsedNumber.number_raw : null,
      ocr_name: preOcrRawName,
      ocr_number: preOcrParsedNumber.ok ? preOcrParsedNumber.number_raw : null,
      set: preSet,
      notes: preprocessed.preprocess.notes,
      quality: preprocessed.preprocess.quality,
    };

    if (finalName && preName.corrected_name && finalName !== preName.corrected_name) {
      ambiguityFlags.push('preprocessed_name_conflict');
      errors.push('preprocessed_name_conflict');
      confidenceIdentity.name = 0.45;
      finalName = primaryName.corrected_name ?? preName.corrected_name ?? null;
    } else if (finalName && preName.corrected_name && finalName === preName.corrected_name) {
      confidenceIdentity.name = boostConfidence(
        Math.max(confidenceIdentity.name, preAiConfidence),
        0.05,
      );
    } else if (!finalName && preName.corrected_name) {
      finalName = preName.corrected_name;
      confidenceIdentity.name = Math.max(0.5, preAiConfidence);
    }

    if (finalNumber && preNumber && finalNumber !== preNumber) {
      ambiguityFlags.push('preprocessed_number_conflict');
      errors.push('preprocessed_number_conflict');
      confidenceIdentity.number = 0.45;
    } else if (finalNumber && preNumber && finalNumber === preNumber) {
      confidenceIdentity.number = boostConfidence(
        Math.max(confidenceIdentity.number, preAiConfidence),
        0.05,
      );
    } else if (!finalNumber && preNumber) {
      finalNumber = preNumber;
      confidenceIdentity.number = Math.max(0.5, preAiConfidence);
    }

    if (finalSet && preSet && finalSet !== preSet) {
      ambiguityFlags.push('preprocessed_set_conflict');
      errors.push('preprocessed_set_conflict');
      confidenceIdentity.set = 0.3;
      finalSet = null;
    } else if (finalSet && preSet && finalSet === preSet) {
      confidenceIdentity.set = boostConfidence(
        Math.max(confidenceIdentity.set, preprocessedSetConfidence),
        0.05,
      );
    } else if (!finalSet && preSet) {
      finalSet = preSet;
      confidenceIdentity.set = preprocessedSetConfidence;
    }
  }

  const resolver = await resolveCandidates(supabase, finalName, finalNumber);
  if (!resolver.ok && resolver.error) {
    errors.push(`resolver:${resolver.error}`);
  }

  const setIdentity = await normalizeSetIdentityV1({
    supabase,
    rawSignals: buildSetRawSignals({ ai, ocr, preprocessed }),
    resolverCandidates: resolver.rows,
    nameConfidence: confidenceIdentity.name,
    numberConfidence: confidenceIdentity.number,
  });

  if (setIdentity.status === 'READY') {
    finalSet = setIdentity.set_code ?? finalSet;
    confidenceIdentity.set = clamp01(setIdentity.confidence);
  } else if (setIdentity.set_code) {
    finalSet = setIdentity.set_code;
    confidenceIdentity.set = clamp01(setIdentity.confidence);
    if (!setIdentity.ambiguity_flags.includes('resolver_only_set')) {
      ambiguityFlags.push(...setIdentity.ambiguity_flags);
    }
  } else {
    finalSet = null;
    confidenceIdentity.set = clamp01(setIdentity.confidence);
    ambiguityFlags.push(...setIdentity.ambiguity_flags);
  }

  const confidenceValues = Object.values(confidenceIdentity);
  const overall =
    confidenceValues.reduce((sum, value) => sum + value, 0) / Math.max(1, confidenceValues.length);
  const hasMatchedOcrBackedSetSignal = (setIdentity?.matched_set_candidates ?? []).some((candidate) =>
    Array.isArray(candidate?.sources) &&
    candidate.sources.some((source) => String(source).startsWith('ocr:')),
  );

  let status = 'BLOCKED';
  if (!ai.ok) {
    status = 'BLOCKED';
  } else if (
    finalName &&
    finalNumber &&
    finalSet &&
    setIdentity.status === 'READY' &&
    hasMatchedOcrBackedSetSignal &&
    !ambiguityFlags.includes('preprocessed_name_conflict') &&
    !ambiguityFlags.includes('preprocessed_set_conflict') &&
    !ambiguityFlags.includes('number_source_conflict') &&
    !ambiguityFlags.includes('preprocessed_number_conflict')
  ) {
    status = 'READY';
  } else if (finalName || finalNumber || finalSet || ai.ok || ocr.ok) {
    status = 'PARTIAL';
  }

  return {
    status,
    identity: {
      name: finalName,
      number: finalNumber,
      set: finalSet,
    },
    confidence: {
      overall: clamp01(overall),
      identity: {
        name: clamp01(confidenceIdentity.name),
        number: clamp01(confidenceIdentity.number),
        set: clamp01(confidenceIdentity.set),
      },
    },
    raw_signals: {
      source_image_path: imagePath,
      category: caseDef.category,
      preprocessing: preprocessed
        ? {
            applied: true,
            notes: preprocessed.preprocess.notes,
            quality: preprocessed.preprocess.quality,
          }
        : {
            applied: false,
            notes: [],
            quality: null,
          },
      ai_identify: ai.ok
        ? {
            ok: true,
            raw_name_text: aiRawName,
            raw_number_text: aiRawNumber,
            raw_set_abbrev_text: extractAiRawSetAbbrev(ai),
            raw_set_text: extractAiRawSetText(ai),
            name: primaryName.corrected_name ?? null,
            number: aiParsedNumber.ok ? aiParsedNumber.number_raw : null,
            number_plain: aiParsedNumber.ok ? aiParsedNumber.number_plain : null,
            printed_total: aiParsedNumber.ok ? aiParsedNumber.printed_total : null,
            ambiguity_flags: aiParsedNumber.ambiguity_flags ?? [],
            confidence: aiConfidence,
            set_confidence: extractAiSetConfidence(ai),
            payload: ai.payload,
          }
        : {
            ok: false,
            error: ai.error,
          },
      ocr: ocr.ok
        ? {
            ok: true,
            raw_name_text: ocrRawName,
            raw_number_text: extractOcrRawNumber(ocr),
            raw_set_text: extractOcrSetText(ocr),
            raw_set_symbol_region_text: extractOcrSetSymbolRegionText(ocr),
            raw_set_candidate_signals: extractOcrSetCandidateSignals(ocr),
            name: normalizeCardNameV1(ocrRawName).corrected_name ?? null,
            number: ocrParsedNumber.ok ? ocrParsedNumber.number_raw : null,
            number_plain: ocrParsedNumber.ok ? ocrParsedNumber.number_plain : null,
            set: ocrSet,
            ambiguity_flags: ocrParsedNumber.ambiguity_flags ?? [],
            payload: ocr.result,
          }
        : {
            ok: false,
            error: ocr.error,
            notes: ocr.notes ?? [],
          },
      preprocessed_pass: preprocessedSignals,
      canon_name_correction: canonCorrection,
      set_identity: setIdentity,
      identity_scan_candidates: {
        ok: resolver.ok,
        query: resolver.query,
        rows: resolver.rows,
      },
      ambiguity_flags: Array.from(new Set(ambiguityFlags)),
    },
    errors: Array.from(new Set(errors.filter(Boolean))),
  };
}

async function runSingleCaseExtraction(caseDef, imagePath, supabase, runIndex) {
  let imageBuffer;
  try {
    imageBuffer = await readImageBuffer(imagePath);
  } catch (error) {
    return {
      status: 'BLOCKED',
      identity: {
        name: null,
        number: null,
        set: null,
      },
      confidence: {
        overall: 0,
        identity: {
          name: 0,
          number: 0,
          set: 0,
        },
      },
      raw_signals: {
        source_image_path: imagePath,
        category: caseDef.category,
      },
      errors: [`image_read_failed:${error.message}`],
    };
  }

  const timeouts = caseDef.timeouts ?? {};
  const traceId = buildTraceId(caseDef.id, runIndex);
  const simulationKind = caseDef?.simulation?.kind ?? null;
  const preprocess = await preprocessImageV1(imageBuffer);

  const ocr =
    simulationKind === 'ocr_failure'
      ? {
          ok: false,
          error: 'ocr_simulated_failure',
          notes: ['simulated_failure'],
        }
      : await ocrCardSignalsSurface({
          imageBuffer,
          timeoutMs: timeouts.ocr_ms ?? DEFAULT_OCR_TIMEOUT_MS,
        });

  const ai =
    simulationKind === 'ai_timeout'
      ? {
          ok: false,
          error: 'ai_timeout',
        }
      : await aiIdentifyWarp({
          imageBuffer,
          traceId,
          timeoutMs: timeouts.ai_ms ?? DEFAULT_AI_TIMEOUT_MS,
        });

  let preprocessed = null;
  if (preprocess.applied) {
    const preTraceId = `${traceId}:preprocessed`;
    const preprocessedOcr =
      simulationKind === 'ocr_failure'
        ? {
            ok: false,
            error: 'ocr_simulated_failure',
            notes: ['simulated_failure'],
          }
        : await ocrCardSignalsSurface({
            imageBuffer: preprocess.imageBuffer,
            timeoutMs: timeouts.ocr_ms ?? DEFAULT_OCR_TIMEOUT_MS,
          });

    const preprocessedAi =
      simulationKind === 'ai_timeout'
        ? {
            ok: false,
            error: 'ai_timeout',
          }
        : await aiIdentifyWarp({
            imageBuffer: preprocess.imageBuffer,
            traceId: preTraceId,
            timeoutMs: timeouts.ai_ms ?? DEFAULT_AI_TIMEOUT_MS,
          });

    preprocessed = {
      ai: preprocessedAi,
      ocr: preprocessedOcr,
      preprocess,
    };
  }

  return buildExtractionResult({
    caseDef,
    imagePath,
    supabase,
    ai,
    ocr,
    preprocessed,
  });
}

async function runCase(caseDef, schema, supabase, runtimeDir) {
  const prepared = await prepareCaseImage(caseDef, runtimeDir);
  const runs = [];
  for (let runIndex = 1; runIndex <= 3; runIndex += 1) {
    runs.push(await runSingleCaseExtraction(caseDef, prepared.imagePath, supabase, runIndex));
  }

  const schemaViolations = [];
  const semanticViolations = [];
  const confidenceWarnings = [];
  const caseFailures = [];

  runs.forEach((result, index) => {
    const schemaCheck = validateSchema(schema, result);
    if (!schemaCheck.ok) {
      schemaViolations.push(...schemaCheck.errors.map((error) => `run_${index + 1}:${error}`));
    }

    const semanticCheck = validateSemantics(result);
    if (!semanticCheck.ok) {
      semanticViolations.push(
        ...semanticCheck.violations.map((violation) => `run_${index + 1}:${violation}`),
      );
    }
    confidenceWarnings.push(
      ...semanticCheck.warnings.map((warning) => `run_${index + 1}:${warning}`),
    );
  });

  const expectedCheck = validateExpected(caseDef, runs[0]);
  if (!expectedCheck.ok) {
    caseFailures.push(...expectedCheck.failures);
  }

  const determinismCheck = validateDeterminism(runs);
  const replayCheck = validateReplay(runs[0], runs[1]);

  if (!determinismCheck.ok) {
    caseFailures.push(...determinismCheck.failures.map((value) => `determinism:${value}`));
  }
  if (!replayCheck.ok) {
    caseFailures.push(...replayCheck.failures.map((value) => `replay:${value}`));
  }

  if (schemaViolations.length > 0) {
    caseFailures.push('schema_validation_failed');
  }
  if (semanticViolations.length > 0) {
    caseFailures.push('semantic_validation_failed');
  }

  return {
    id: caseDef.id,
    category: caseDef.category,
    image_path: prepared.imagePath,
    generated_image: prepared.generated,
    ok: caseFailures.length === 0,
    failures: caseFailures,
    determinism_failures: determinismCheck.ok ? [] : determinismCheck.failures,
    schema_violations: schemaViolations,
    semantic_violations: semanticViolations,
    replay_failures: replayCheck.ok ? [] : replayCheck.failures,
    confidence_warnings: confidenceWarnings,
    set_outcome: classifySetOutcome(caseDef, runs[0]),
    replay_safe: replayCheck.ok,
    stable_view: stableOutputView(runs[0]),
    runs,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const casesPath = path.join(__dirname, 'extraction_test_cases.json');
  const schemaPath = path.join(__dirname, 'extraction_schema_v1.json');

  const testCases = await loadJson(casesPath);
  const schema = await loadJson(schemaPath);

  const selectedCases = opts.all
    ? testCases.cases
    : testCases.cases.filter((caseDef) => caseDef.id === opts.caseId);

  if (!selectedCases.length) {
    throw new Error(`case_not_found:${opts.caseId}`);
  }

  if (!normalizeText(process.env.GV_AI_BORDER_URL)) {
    throw new Error('missing_gv_ai_border_url');
  }
  if (!normalizeText(process.env.GV_AI_ENDPOINT_TOKEN)) {
    throw new Error('missing_gv_ai_endpoint_token');
  }

  const runtimeDir = await ensureRuntimeDir();
  const supabase = createBackendClient();
  const report = createReport({
    mode: opts.all ? 'all' : 'single',
    selectedCaseIds: selectedCases.map((caseDef) => caseDef.id),
    schemaPath,
  });

  for (const caseDef of selectedCases) {
    const caseReport = await runCase(caseDef, schema, supabase, runtimeDir);
    appendCaseReport(report, caseReport);
  }

  await writeReport(report, opts.reportPath);
  printReport(report, opts.reportPath);

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
