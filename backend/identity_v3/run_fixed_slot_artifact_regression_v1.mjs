#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const DEFAULT_ENDPOINT = 'http://127.0.0.1:8790/scanner-v3/resolve-crops';
const NORMALIZED_WIDTH = 716;
const NORMALIZED_HEIGHT = 1000;
const ANN_CROP_SIZE = 224;
const FEATURE_SIZE = 48;
const CANDIDATE_SUPPORT_BONUS = 0.018;
const CANDIDATE_SUPPORT_BONUS_MAX = 0.072;

const REGION_RECTS = {
  title: { left: 0.02, top: 0.00, right: 0.98, bottom: 0.16 },
  artwork: { left: 0.12, top: 0.18, right: 0.88, bottom: 0.47 },
  attack: { left: 0.04, top: 0.50, right: 0.96, bottom: 0.67 },
  full: { left: 0.00, top: 0.00, right: 1.00, bottom: 1.00 },
  bottom: { left: 0.02, top: 0.90, right: 0.98, bottom: 1.00 },
};

const SCORE_WEIGHTS = {
  artwork: 0.40,
  title: 0.35,
  attack: 0.15,
  full: 0.05,
  bottom: 0.00,
  ann: 0.05,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const endpoint =
    args.endpoint ??
    process.env.SCANNER_V3_RESOLVE_ENDPOINT ??
    DEFAULT_ENDPOINT;
  const casesPath = resolve(
    repoRoot,
    args.cases ?? 'backend/identity_v3/fixtures/fixed_slot_artifact_regression_cases_v1.json',
  );
  const outPath = resolve(
    repoRoot,
    args.out ??
      `.tmp/scanner_fixed_slot_regression_v1/fixed_slot_artifact_regression_${dateToken(new Date())}.json`,
  );
  const referenceCacheDir = resolve(
    repoRoot,
    args.referenceCacheDir ?? '.tmp/scanner_visual_reference_cache_v1',
  );
  const topK = positiveInt(args.topK, 220);
  const maxCandidates = positiveInt(args.maxCandidates, 260);
  const confidenceThreshold = positiveNumber(args.confidenceThreshold, 0.78);
  const separationThreshold = positiveNumber(args.separationThreshold, 0.08);
  const allowInsecureReferenceDownloads =
    args.allowInsecureReferenceDownloads === true ||
    process.env.SCANNER_ALLOW_INSECURE_REFERENCE_DOWNLOADS === '1';

  const cases = await readJson(casesPath);
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error(`No fixed-slot regression cases found in ${casesPath}`);
  }

  await mkdir(dirname(outPath), { recursive: true });
  await mkdir(referenceCacheDir, { recursive: true });

  const startedAt = performance.now();
  const results = [];
  for (const testCase of cases) {
    results.push(
      await runCase({
        testCase,
        endpoint,
        topK,
        maxCandidates,
        confidenceThreshold,
        separationThreshold,
        referenceCacheDir,
        allowInsecureReferenceDownloads,
      }),
    );
  }

  const summary = {
    ok: results.every((result) => result.ok),
    mode: 'fixed_slot_artifact_regression_v1',
    endpoint,
    cases_path: casesPath,
    output_path: outPath,
    top_k: topK,
    max_candidates: maxCandidates,
    confidence_threshold: confidenceThreshold,
    separation_threshold: separationThreshold,
    allow_insecure_reference_downloads: allowInsecureReferenceDownloads,
    elapsed_ms: roundMs(performance.now() - startedAt),
    case_count: results.length,
    passed_count: results.filter((result) => result.ok).length,
    failed_count: results.filter((result) => !result.ok).length,
    results,
  };

  await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok && args.noFail !== true) {
    process.exitCode = 1;
  }
}

async function runCase({
  testCase,
  endpoint,
  topK,
  maxCandidates,
  confidenceThreshold,
  separationThreshold,
  referenceCacheDir,
  allowInsecureReferenceDownloads,
}) {
  const caseStartedAt = performance.now();
  const id = textOrNull(testCase.id) ?? 'unnamed_case';
  const expectedGvId = textOrNull(testCase.expected_gv_id ?? testCase.expectedGvId);
  const allowNoMatch = testCase.allow_no_match === true || testCase.allowNoMatch === true;
  const artifactDir = resolve(repoRoot, textOrNull(testCase.artifact_dir ?? testCase.artifactDir) ?? '');
  const normalizedPath = resolve(
    artifactDir,
    textOrNull(testCase.normalized_file ?? testCase.normalizedFile) ??
      'latest_fixed_slot_normalized.png',
  );
  const manifestPath = resolve(artifactDir, 'latest_fixed_slot_manifest.json');

  const normalizedBuffer = await readFile(normalizedPath);
  const manifest = await readJsonIfExists(manifestPath);
  const annRequestStartedAt = performance.now();
  const annResponse = await callAnnEndpoint({
    endpoint,
    topK,
    normalizedBuffer,
    mode: `fixed_slot_artifact_regression_v1:${id}`,
  });
  const annElapsedMs = roundMs(performance.now() - annRequestStartedAt);
  const candidatePool = dedupeCandidatePool(annResponse.crops ?? []);
  const confirmation = await confirmCandidatePool({
    normalizedBuffer,
    candidatePool,
    maxCandidates,
    referenceCacheDir,
    allowInsecureReferenceDownloads,
    confidenceThreshold,
    separationThreshold,
  });

  const expectedVisualRank = expectedGvId
    ? confirmation.ranked.findIndex((candidate) => candidate.gv_id === expectedGvId) + 1
    : null;
  const expectedAnnRanks = expectedGvId
    ? annCropExpectedRanks(annResponse.crops ?? [], expectedGvId)
    : {};
  const backendConfirmation = annResponse.fixed_slot_visual_confirmation ?? null;
  const backendConfirmed = backendConfirmation?.confirmed === true;
  const backendConfirmedGvId = backendConfirmed
    ? textOrNull(backendConfirmation?.candidate?.gv_id ?? backendConfirmation?.candidate?.gvId)
    : null;
  const confirmedGvId = backendConfirmedGvId ?? confirmation.confirmed_candidate?.gv_id ?? null;
  const ok = Boolean(
    expectedGvId &&
      (
        (backendConfirmed && confirmedGvId === expectedGvId) ||
        (allowNoMatch && !backendConfirmed)
      ),
  );

  return {
    ok,
    id,
    label: textOrNull(testCase.label),
    expected_gv_id: expectedGvId,
    allow_no_match: allowNoMatch,
    confirmed_gv_id: confirmedGvId,
    confirmed: backendConfirmed,
    confirmation_failure_reason: backendConfirmed
      ? null
      : textOrNull(backendConfirmation?.failure_reason) ?? confirmation.failure_reason,
    backend_confirmation: backendConfirmation,
    visual_rank_expected: expectedVisualRank > 0 ? expectedVisualRank : null,
    ann_expected_ranks: expectedAnnRanks,
    ann_service_elapsed_ms: annResponse.elapsed_ms ?? null,
    ann_client_elapsed_ms: annElapsedMs,
    visual_confirmation_elapsed_ms: confirmation.elapsed_ms,
    total_elapsed_ms: roundMs(performance.now() - caseStartedAt),
    artifact_dir: artifactDir,
    normalized_path: normalizedPath,
    manifest_summary: manifestSummary(manifest),
    candidate_pool: {
      total: candidatePool.length,
      scored: confirmation.scored_count,
      skipped: confirmation.skipped_count,
    },
    decision: confirmation.decision,
    top_visual_candidates: confirmation.ranked.slice(0, 12),
    top_ann_candidates: topAnnCandidates(annResponse.crops ?? [], 12),
  };
}

async function callAnnEndpoint({ endpoint, topK, normalizedBuffer, mode }) {
  const crops = [
    {
      crop_type: 'fixed_slot_visual_confirmation',
      raw_b64: (await sharp(normalizedBuffer, { failOn: 'none' })
        .resize(NORMALIZED_WIDTH, NORMALIZED_HEIGHT, { fit: 'fill' })
        .ensureAlpha()
        .raw()
        .toBuffer()).toString('base64'),
      width: NORMALIZED_WIDTH,
      height: NORMALIZED_HEIGHT,
      format: 'rgba8888',
    },
    await buildAnnCrop({
      normalizedBuffer,
      cropType: 'full_card',
      rect: REGION_RECTS.full,
    }),
  ];
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      top_k: topK,
      mode,
      crops,
    }),
  });
  const body = await response.json();
  if (!response.ok || body?.ok !== true) {
    throw new Error(`ANN endpoint failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function buildAnnCrop({ normalizedBuffer, cropType, rect }) {
  const metadata = await sharp(normalizedBuffer, { failOn: 'none' }).metadata();
  const extract = rectToPixels(rect, metadata.width, metadata.height);
  const rawBuffer = await sharp(normalizedBuffer, { failOn: 'none' })
    .extract(extract)
    .resize(ANN_CROP_SIZE, ANN_CROP_SIZE, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();
  return {
    crop_type: cropType,
    raw_b64: rawBuffer.toString('base64'),
    width: ANN_CROP_SIZE,
    height: ANN_CROP_SIZE,
    format: 'raw_rgba8888',
  };
}

function dedupeCandidatePool(crops) {
  const byGvId = new Map();
  for (const crop of crops) {
    const cropType = textOrNull(crop?.crop_type ?? crop?.cropType);
    if (!cropType || cropType === 'fixed_slot_visual_confirmation') continue;
    const candidates = Array.isArray(crop?.candidates) ? crop.candidates : [];
    for (const candidate of candidates) {
      const gvId = textOrNull(candidate.gv_id ?? candidate.gvId);
      if (!gvId) continue;
      const currentDistance = finiteNumber(candidate.distance, 1);
      const currentRank = positiveInt(candidate.rank, null);
      const existing = byGvId.get(gvId);
      const cropTypes = new Set(existing?.fixed_slot_query_crop_types ?? []);
      cropTypes.add(cropType);
      const bestDistanceByCrop = {
        ...(existing?.fixed_slot_best_distance_by_crop ?? {}),
      };
      const bestRankByCrop = {
        ...(existing?.fixed_slot_best_rank_by_crop ?? {}),
      };
      if (
        bestDistanceByCrop[cropType] == null ||
        currentDistance < Number(bestDistanceByCrop[cropType])
      ) {
        bestDistanceByCrop[cropType] = round6(currentDistance);
      }
      if (
        bestRankByCrop[cropType] == null ||
        (currentRank != null && currentRank < Number(bestRankByCrop[cropType]))
      ) {
        bestRankByCrop[cropType] = currentRank;
      }
      const base = !existing || currentDistance < Number(existing.ann_distance ?? 1)
        ? {
        gv_id: gvId,
        card_id: textOrNull(candidate.card_id ?? candidate.cardId),
        name: textOrNull(candidate.name),
        set_code: textOrNull(candidate.set_code ?? candidate.setCode),
        number: textOrNull(candidate.number),
        image_url: textOrNull(candidate.image_url ?? candidate.imageUrl),
        ann_distance: currentDistance,
        ann_rank: currentRank,
        source_crop_type: cropType,
          }
        : existing;
      const supportCount = cropTypes.size;
      const supportBonus = Math.min(
        CANDIDATE_SUPPORT_BONUS_MAX,
        Math.max(0, supportCount - 1) * CANDIDATE_SUPPORT_BONUS,
      );
      byGvId.set(gvId, {
        ...base,
        fixed_slot_query_crop_types: [...cropTypes].sort(),
        fixed_slot_query_support_count: supportCount,
        fixed_slot_best_distance_by_crop: bestDistanceByCrop,
        fixed_slot_best_rank_by_crop: bestRankByCrop,
        fixed_slot_candidate_support_bonus: round6(supportBonus),
        fixed_slot_candidate_pool_score: round6(
          Math.max(0, Number(base.ann_distance ?? 1) - supportBonus),
        ),
      });
    }
  }
  return [...byGvId.values()].sort((a, b) => {
    const scoreA = finiteNumber(a.fixed_slot_candidate_pool_score, a.ann_distance);
    const scoreB = finiteNumber(b.fixed_slot_candidate_pool_score, b.ann_distance);
    if (scoreA !== scoreB) return scoreA - scoreB;
    const supportA = finiteNumber(a.fixed_slot_query_support_count, 1);
    const supportB = finiteNumber(b.fixed_slot_query_support_count, 1);
    if (supportA !== supportB) return supportB - supportA;
    return a.ann_distance - b.ann_distance;
  });
}

async function confirmCandidatePool({
  normalizedBuffer,
  candidatePool,
  maxCandidates,
  referenceCacheDir,
  allowInsecureReferenceDownloads,
  confidenceThreshold,
  separationThreshold,
}) {
  const startedAt = performance.now();
  const queryFeatures = await imageFeatures(normalizedBuffer);
  const ranked = [];
  let skippedCount = 0;

  for (const candidate of candidatePool.slice(0, maxCandidates)) {
    if (!candidate.image_url) {
      skippedCount += 1;
      continue;
    }
    try {
      const referenceFeatures = await cachedReferenceFeatures({
        candidate,
        referenceCacheDir,
        allowInsecureReferenceDownloads,
      });
      const distances = {};
      for (const key of Object.keys(REGION_RECTS)) {
        distances[key] = cosineDistance(queryFeatures[key], referenceFeatures[key]);
      }
      let visualScore = 0;
      for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
        if (key === 'ann') continue;
        visualScore += (distances[key] ?? 1) * weight;
      }
      const score =
        visualScore +
        (candidate.ann_distance * SCORE_WEIGHTS.ann) -
        fixedSlotCandidateSupportBonus(candidate);
      ranked.push({
        ...candidate,
        visual_confirmation_score: round6(score),
        visual_score: round6(visualScore),
        visual_distances: roundObject(distances),
      });
    } catch (error) {
      skippedCount += 1;
      ranked.push({
        ...candidate,
        visual_confirmation_error: String(error?.message ?? error),
      });
    }
  }

  ranked.sort((a, b) => {
    const left = finiteNumber(a.visual_confirmation_score, Number.POSITIVE_INFINITY);
    const right = finiteNumber(b.visual_confirmation_score, Number.POSITIVE_INFINITY);
    if (left !== right) return left - right;
    return a.ann_distance - b.ann_distance;
  });

  const top = ranked.find((candidate) =>
    Number.isFinite(candidate.visual_confirmation_score),
  );
  const second = ranked.filter((candidate) =>
    Number.isFinite(candidate.visual_confirmation_score),
  )[1] ?? null;
  const separation = top && second
    ? round6(second.visual_confirmation_score - top.visual_confirmation_score)
    : null;
  const confirmed = Boolean(
    top &&
      top.visual_confirmation_score <= confidenceThreshold &&
      (separation === null || separation >= separationThreshold),
  );

  return {
    confirmed,
    confirmed_candidate: confirmed ? top : null,
    failure_reason: confirmed ? null : confirmationFailureReason({
      top,
      second,
      confidenceThreshold,
      separationThreshold,
      separation,
    }),
    decision: {
      confidence_threshold: confidenceThreshold,
      separation_threshold: separationThreshold,
      top_score: top?.visual_confirmation_score ?? null,
      second_score: second?.visual_confirmation_score ?? null,
      separation,
    },
    ranked,
    scored_count: ranked.filter((candidate) =>
      Number.isFinite(candidate.visual_confirmation_score),
    ).length,
    skipped_count: skippedCount,
    elapsed_ms: roundMs(performance.now() - startedAt),
  };
}

function fixedSlotCandidateSupportBonus(candidate) {
  const supportCount = finiteNumber(candidate?.fixed_slot_query_support_count, 1);
  return Math.min(
    CANDIDATE_SUPPORT_BONUS_MAX,
    Math.max(0, supportCount - 1) * CANDIDATE_SUPPORT_BONUS,
  );
}

function confirmationFailureReason({
  top,
  second,
  confidenceThreshold,
  separationThreshold,
  separation,
}) {
  if (!top) return 'no_scored_visual_candidates';
  if (top.visual_confirmation_score > confidenceThreshold) {
    return 'visual_confirmation_score_too_high';
  }
  if (second && separation !== null && separation < separationThreshold) {
    return 'visual_confirmation_margin_too_small';
  }
  return 'visual_confirmation_unconfirmed';
}

async function cachedReferenceFeatures({
  candidate,
  referenceCacheDir,
  allowInsecureReferenceDownloads,
}) {
  const imageUrl = candidate.image_url;
  const featureCacheKey = createHash('sha1')
    .update(
      [
        'fixed_slot_visual_confirmation_features_v1',
        FEATURE_SIZE,
        JSON.stringify(REGION_RECTS),
        imageUrl,
      ].join('|'),
    )
    .digest('hex');
  const featureCachePath = resolve(
    referenceCacheDir,
    `${featureCacheKey}.features.json`,
  );
  try {
    return await readJson(featureCachePath);
  } catch {
    // Cache miss.
  }

  const referenceBuffer = await cachedReferenceImage({
    imageUrl,
    referenceCacheDir,
    allowInsecureReferenceDownloads,
  });
  const normalizedReference = await sharp(referenceBuffer, { failOn: 'none' })
    .rotate()
    .resize(NORMALIZED_WIDTH, NORMALIZED_HEIGHT, { fit: 'fill' })
    .png()
    .toBuffer();
  const features = await imageFeatures(normalizedReference);
  await writeFile(featureCachePath, `${JSON.stringify(features)}\n`);
  return features;
}

async function imageFeatures(imageBuffer) {
  const features = {};
  for (const [key, rect] of Object.entries(REGION_RECTS)) {
    features[key] = await grayscaleFeature(imageBuffer, rect);
  }
  return features;
}

async function grayscaleFeature(imageBuffer, rect) {
  const metadata = await sharp(imageBuffer, { failOn: 'none' }).rotate().metadata();
  const extract = rectToPixels(rect, metadata.width, metadata.height);
  const { data } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .extract(extract)
    .resize(FEATURE_SIZE, FEATURE_SIZE, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const values = Array.from(data, (value) => value / 255);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  let norm = 0;
  for (let index = 0; index < values.length; index += 1) {
    values[index] -= mean;
    norm += values[index] * values[index];
  }
  norm = Math.sqrt(norm) || 1;
  return values.map((value) => value / norm);
}

function rectToPixels(rect, width, height) {
  const left = Math.max(0, Math.min(width - 1, Math.floor(width * rect.left)));
  const top = Math.max(0, Math.min(height - 1, Math.floor(height * rect.top)));
  const right = Math.max(left + 1, Math.min(width, Math.floor(width * rect.right)));
  const bottom = Math.max(top + 1, Math.min(height, Math.floor(height * rect.bottom)));
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

async function cachedReferenceImage({
  imageUrl,
  referenceCacheDir,
  allowInsecureReferenceDownloads,
}) {
  const extension = imageUrl.split('?')[0].split('.').pop() || 'img';
  const cachePath = resolve(
    referenceCacheDir,
    `${createHash('sha1').update(imageUrl).digest('hex')}.${extension}`,
  );
  try {
    return await readFile(cachePath);
  } catch {
    // Cache miss.
  }
  const buffer = await downloadUrlBuffer(imageUrl, {
    allowInsecureReferenceDownloads,
  });
  await writeFile(cachePath, buffer);
  return buffer;
}

function downloadUrlBuffer(url, { allowInsecureReferenceDownloads }, redirects = 0) {
  return new Promise((resolvePromise, rejectPromise) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'http:' ? http : https;
    const request = transport.get(
      parsed,
      parsed.protocol === 'https:'
        ? { rejectUnauthorized: !allowInsecureReferenceDownloads }
        : {},
      (response) => {
        const statusCode = response.statusCode ?? 0;
        const location = response.headers.location;
        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          location &&
          redirects < 4
        ) {
          response.resume();
          const redirectedUrl = new URL(location, parsed).toString();
          downloadUrlBuffer(
            redirectedUrl,
            { allowInsecureReferenceDownloads },
            redirects + 1,
          ).then(resolvePromise, rejectPromise);
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          rejectPromise(new Error(`reference_download_http_${statusCode}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolvePromise(Buffer.concat(chunks)));
      },
    );
    request.on('error', rejectPromise);
    request.setTimeout(20000, () => {
      request.destroy(new Error('reference_download_timeout'));
    });
  });
}

function cosineDistance(left, right) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
  }
  return 1 - dot;
}

function annCropExpectedRanks(crops, expectedGvId) {
  const ranks = {};
  for (const crop of crops) {
    const cropType = textOrNull(crop.crop_type ?? crop.cropType) ?? 'unknown';
    const candidates = Array.isArray(crop.candidates) ? crop.candidates : [];
    const index = candidates.findIndex((candidate) =>
      textOrNull(candidate.gv_id ?? candidate.gvId) === expectedGvId,
    );
    ranks[cropType] = index >= 0 ? index + 1 : null;
  }
  return ranks;
}

function topAnnCandidates(crops, limit) {
  const rows = [];
  for (const crop of crops) {
    const cropType = textOrNull(crop.crop_type ?? crop.cropType) ?? 'unknown';
    const candidates = Array.isArray(crop.candidates) ? crop.candidates : [];
    for (const candidate of candidates.slice(0, limit)) {
      rows.push({
        crop_type: cropType,
        rank: candidate.rank ?? null,
        gv_id: candidate.gv_id ?? null,
        name: candidate.name ?? null,
        set_code: candidate.set_code ?? null,
        number: candidate.number ?? null,
        distance: candidate.distance ?? null,
      });
    }
  }
  return rows;
}

function manifestSummary(manifest) {
  if (!manifest || typeof manifest !== 'object') return null;
  return {
    scanner_surface: manifest.scanner_surface ?? null,
    identity_mode: manifest.identity_mode ?? null,
    ocr: manifest.ocr ?? null,
    live_identity_loop: manifest.live_identity_loop ?? null,
    normalized_output_width: manifest.normalized_output_width ?? null,
    normalized_output_height: manifest.normalized_output_height ?? null,
    ann_failure_reason: manifest.ann_failure_reason ?? null,
    ann_has_confident_match: manifest.ann_has_confident_match ?? null,
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonIfExists(path) {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

function parseArgs(rawArgs) {
  const args = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_match, letter) =>
      letter.toUpperCase(),
    );
    if (
      key === 'allowInsecureReferenceDownloads' ||
      key === 'noFail'
    ) {
      args[key] = true;
      continue;
    }
    args[key] = rawArgs[index + 1];
    index += 1;
  }
  return args;
}

function dateToken(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\..+$/, 'Z');
}

function textOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveInt(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.floor(number);
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return number;
}

function roundMs(value) {
  return Math.round(value * 1000) / 1000;
}

function round6(value) {
  return Number.isFinite(value) ? Math.round(value * 1_000_000) / 1_000_000 : null;
}

function roundObject(object) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, round6(value)]),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
