import '../env.mjs';

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  NORMALIZED_CARD_HEIGHT,
  NORMALIZED_CARD_WIDTH,
  buildRawJpeg,
  extractNormalizedRegions,
  normalizeFromFallbackCrop,
} from '../scanner_v3/lib/card_normalization_v1.mjs';
import {
  isImagePath,
  safeBasename,
} from './lib/hash_index_v1.mjs';
import {
  PATCH_DESCRIPTOR_V1,
  computePatchDescriptorFromPath,
  rankPatchCandidates,
} from './lib/patch_descriptor_v1.mjs';

const DEFAULT_QUERY_DIR = '.tmp/scanner_v3_normalization_proof';
const DEFAULT_LABELS = '.tmp/embedding_test_images/results.json';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_identity_bridge_v4';
const DEFAULT_ALIGNED_REFERENCE_DIR = '.tmp/scanner_v3_reference_aligned';
const DEFAULT_V3_SUMMARY = '.tmp/scanner_v3_identity_bridge_v3/summary.json';
const DEFAULT_TOP_N = 10;
const DEFAULT_REFERENCE_LIMIT = 180;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const args = {
    query: DEFAULT_QUERY_DIR,
    references: null,
    labels: DEFAULT_LABELS,
    out: DEFAULT_OUTPUT_DIR,
    alignedReferences: DEFAULT_ALIGNED_REFERENCE_DIR,
    v3Summary: DEFAULT_V3_SUMMARY,
    top: DEFAULT_TOP_N,
    referenceLimit: DEFAULT_REFERENCE_LIMIT,
    referenceSetCodes: [],
    referenceCardIds: [],
    downloadTimeoutMs: DEFAULT_DOWNLOAD_TIMEOUT_MS,
    rebuildAligned: false,
    rebuildIndex: false,
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

    if (name === '--query' || name === '--input' || name === '--folder') {
      args.query = nextValue();
    } else if (name === '--references' || name === '--reference') {
      args.references = nextValue();
    } else if (name === '--labels') {
      args.labels = nextValue();
    } else if (name === '--out') {
      args.out = nextValue();
    } else if (name === '--aligned-references') {
      args.alignedReferences = nextValue();
    } else if (name === '--v3-summary') {
      args.v3Summary = nextValue();
    } else if (name === '--top') {
      args.top = positiveInt(nextValue(), DEFAULT_TOP_N);
    } else if (name === '--reference-limit') {
      args.referenceLimit = positiveInt(nextValue(), DEFAULT_REFERENCE_LIMIT);
    } else if (name === '--reference-set-codes') {
      args.referenceSetCodes = splitCsv(nextValue()).map((value) => value.toLowerCase());
    } else if (name === '--reference-card-ids') {
      args.referenceCardIds = splitCsv(nextValue());
    } else if (name === '--download-timeout-ms') {
      args.downloadTimeoutMs = positiveInt(nextValue(), DEFAULT_DOWNLOAD_TIMEOUT_MS);
    } else if (name === '--rebuild-aligned') {
      args.rebuildAligned = true;
    } else if (name === '--rebuild-index') {
      args.rebuildIndex = true;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_identity_bridge_v4_reference_alignment.mjs [--query <scanner_output>] [--references <folder_or_manifest>] [--out <folder>]',
    '',
    'Defaults:',
    `  --query ${DEFAULT_QUERY_DIR}`,
    `  --labels ${DEFAULT_LABELS}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --aligned-references ${DEFAULT_ALIGNED_REFERENCE_DIR}`,
    `  --top ${DEFAULT_TOP_N}`,
    `  --reference-limit ${DEFAULT_REFERENCE_LIMIT}`,
    '',
    'This harness only aligns reference crops, then reruns the unchanged V3 patch matcher.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const outputDir = path.resolve(args.out);
  const alignedReferenceDir = path.resolve(args.alignedReferences);
  await ensureDir(outputDir);
  await ensureDir(alignedReferenceDir);

  const labelIndex = await loadLabelIndex(args.labels);
  const queryDiscovery = await discoverScannerQueries(args.query, labelIndex);
  if (queryDiscovery.items.length === 0) {
    throw new Error(`identity_bridge_v4_no_scanner_queries:${path.resolve(args.query)}`);
  }

  const queryExpectedIds = queryDiscovery.items
    .map((item) => item.expected_card_id)
    .filter(Boolean);
  const labelSetCodes = [...new Set(
    queryDiscovery.items
      .map((item) => parseSetCodeFromLabel(item.expected_label))
      .filter(Boolean),
  )];

  const referencePlan = args.references
    ? await loadLocalReferenceEntries(args.references)
    : await loadSupabaseReferenceEntries({
      outputDir,
      cardIds: [...new Set([...args.referenceCardIds, ...queryExpectedIds])],
      setCodes: [...new Set([...args.referenceSetCodes, ...labelSetCodes])],
      limit: args.referenceLimit,
      timeoutMs: args.downloadTimeoutMs,
    });

  if (referencePlan.entries.length === 0) {
    throw new Error('identity_bridge_v4_no_reference_entries');
  }

  const alignmentPlan = await alignReferenceEntries({
    entries: referencePlan.entries,
    alignedReferenceDir,
    rebuildAligned: args.rebuildAligned,
  });

  if (alignmentPlan.entries.length === 0) {
    throw new Error('identity_bridge_v4_no_aligned_reference_entries');
  }

  const indexCachePath = path.join(outputDir, 'index_cache.json');
  const referenceFingerprint = await fingerprintAlignedReferenceEntries(alignmentPlan.entries);
  const descriptorIndex = await loadOrBuildPatchIndex({
    entries: alignmentPlan.entries,
    cachePath: indexCachePath,
    referenceFingerprint,
    rebuildIndex: args.rebuildIndex,
  });

  const queryDescriptors = [];
  const skippedQueries = [];
  for (const item of queryDiscovery.items) {
    try {
      queryDescriptors.push(await descriptorForQuery(item));
    } catch (error) {
      skippedQueries.push({
        query_id: item.query_id,
        source_dir: item.source_dir,
        reason: error?.message || String(error),
      });
    }
  }

  const v3Baseline = await loadV3Baseline(args.v3Summary);
  const comparisonsDir = path.join(outputDir, 'comparisons');
  await ensureDir(comparisonsDir);

  const matchResults = [];
  for (const query of queryDescriptors) {
    const topCandidates = rankPatchCandidates({
      query,
      references: descriptorIndex.references,
      topN: args.top,
    });
    const evaluation = evaluateCandidates(query.expected_card_id, topCandidates);
    const queryOutDir = path.join(comparisonsDir, safeBasename(query.query_id));
    await ensureDir(queryOutDir);
    const v3Result = v3Baseline.byQuery.get(query.query_id) ?? null;

    const result = {
      query: query.query_id,
      source_name: query.source_name,
      source_dir: query.source_dir,
      expected_card_id: query.expected_card_id,
      expected: query.expected_label,
      expected_label: query.expected_label,
      artwork_region_path: query.artwork_region_path,
      artifact_fallbacks: query.artifact_fallbacks,
      descriptor_version: PATCH_DESCRIPTOR_V1.name,
      matching_logic: 'unchanged_identity_bridge_v3_patch_matching',
      reference_alignment: referenceAlignmentSummary(),
      top_candidates: topCandidates,
      evaluation,
      v3_baseline: v3Result ? {
        correct_top1: v3Result.correct_top1,
        correct_in_top5: v3Result.correct_in_top5,
        correct_in_top10: v3Result.correct_in_top10,
        expected_rank: v3Result.expected_rank,
        top_candidate: v3Result.candidates?.[0] ?? null,
      } : null,
      final_identity_decision: false,
      proof_only: true,
    };

    await writeJson(path.join(queryOutDir, 'candidates.json'), result);
    matchResults.push(result);
  }

  const summary = buildSummary({
    outputDir,
    alignedReferenceDir,
    queryDiscovery,
    referencePlan,
    alignmentPlan,
    descriptorIndex,
    skippedQueries,
    matchResults,
    topN: args.top,
    v3Baseline,
  });
  await writeJson(path.join(outputDir, 'summary.json'), summary);

  for (const result of matchResults.slice(0, 5)) {
    console.log(JSON.stringify({
      query: result.query,
      expected_label: result.expected_label,
      top1_card_id: result.top_candidates[0]?.card_id ?? null,
      top1_score: result.top_candidates[0]?.final_score ?? null,
      correct_in_top5: result.evaluation.correct_in_top5,
      top_candidates: result.top_candidates.slice(0, 5).map((candidate) => ({
        card_id: candidate.card_id,
        name: candidate.name,
        set_code: candidate.set_code,
        number: candidate.number,
        final_score: candidate.final_score,
        used_patch_count: candidate.used_patch_count,
      })),
    }, null, 2));
  }
  console.log(JSON.stringify(summary, null, 2));
}

async function alignReferenceEntries({ entries, alignedReferenceDir, rebuildAligned }) {
  const aligned = [];
  const skipped = [];
  let cacheReusedCount = 0;
  let normalizedCount = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    try {
      const alignedEntry = await alignReferenceEntry({
        entry,
        alignedReferenceDir,
        rebuildAligned,
      });
      aligned.push(alignedEntry);
      if (alignedEntry.alignment_metrics.cache_reused) {
        cacheReusedCount += 1;
      } else {
        normalizedCount += 1;
      }
    } catch (error) {
      skipped.push({
        card_id: entry.card_id ?? entry.id ?? null,
        name: entry.name ?? null,
        reason: error?.message || String(error),
      });
    }
  }

  return {
    source: 'scanner_v3_reference_alignment',
    entries: aligned,
    skipped,
    aligned_count: aligned.length,
    normalized_count: normalizedCount,
    cache_reused_count: cacheReusedCount,
  };
}

async function alignReferenceEntry({ entry, alignedReferenceDir, rebuildAligned }) {
  const cardId = normalizeId(entry.card_id ?? entry.id ?? entry.cardPrintId);
  if (!cardId) throw new Error('reference_alignment_missing_card_id');

  const sourcePath = entry.full_image_path ?? entry.image_path;
  if (!sourcePath) throw new Error(`reference_alignment_missing_image:${cardId}`);

  const cardDir = path.join(alignedReferenceDir, safeBasename(cardId));
  const normalizedPath = path.join(cardDir, 'normalized_full_card.png');
  const artworkPath = path.join(cardDir, 'artwork_region.png');
  const metricsPath = path.join(cardDir, 'metrics.json');
  await ensureDir(cardDir);

  if (!rebuildAligned && await pathExists(normalizedPath) && await pathExists(artworkPath)) {
    const cachedMetrics = await readJsonIfPresent(metricsPath);
    return {
      ...entry,
      source_image_path: sourcePath,
      full_image_path: normalizedPath,
      art_image_path: artworkPath,
      alignment_metrics: {
        ...cachedMetrics,
        cache_reused: true,
      },
    };
  }

  const sourceBuffer = await readFile(sourcePath);
  const raw = await buildRawJpeg(sourceBuffer);
  const normalized = await normalizeFromFallbackCrop(raw.buffer, {
    width: raw.width,
    height: raw.height,
  });
  const normalizedPng = await sharp(normalized.buffer, { failOn: 'none' })
    .png()
    .toBuffer();
  const regions = await extractNormalizedRegions(normalizedPng);
  const artworkPng = await sharp(regions.artwork.buffer, { failOn: 'none' })
    .png()
    .toBuffer();

  await writeFile(normalizedPath, normalizedPng);
  await writeFile(artworkPath, artworkPng);

  const metrics = {
    card_id: cardId,
    source_image_path: sourcePath,
    normalized_full_card_path: normalizedPath,
    artwork_region_path: artworkPath,
    pipeline: 'scanner_v3_reference_alignment_v4',
    ai_called: false,
    quad_detector_called: false,
    quad_detector_reason: 'canonical_reference_images_are_already_flat_card_artifacts; no_ai_guardrail',
    normalized_width: NORMALIZED_CARD_WIDTH,
    normalized_height: NORMALIZED_CARD_HEIGHT,
    normalized_source: 'scanner_v3_center_portrait_normalization',
    crop_region: normalized.crop_region,
    crop_area_ratio: normalized.crop_area_ratio,
    artwork_region: regions.artwork.region,
    cache_reused: false,
  };
  await writeJson(metricsPath, metrics);

  return {
    ...entry,
    source_image_path: sourcePath,
    full_image_path: normalizedPath,
    art_image_path: artworkPath,
    alignment_metrics: metrics,
  };
}

async function loadOrBuildPatchIndex({ entries, cachePath, referenceFingerprint, rebuildIndex }) {
  if (!rebuildIndex && await pathExists(cachePath)) {
    const cached = JSON.parse(await readFile(cachePath, 'utf8'));
    if (
      cached?.descriptor_version === PATCH_DESCRIPTOR_V1.name &&
      cached?.reference_fingerprint === referenceFingerprint &&
      Array.isArray(cached.references)
    ) {
      return {
        ...cached,
        cache_reused: true,
      };
    }
  }

  const references = [];
  const skipped = [];
  for (const entry of entries) {
    try {
      references.push(await descriptorForAlignedReference(entry));
    } catch (error) {
      skipped.push({
        card_id: entry.card_id ?? entry.id ?? null,
        name: entry.name ?? null,
        reason: error?.message || String(error),
      });
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    descriptor_version: PATCH_DESCRIPTOR_V1.name,
    descriptor_config: PATCH_DESCRIPTOR_V1,
    reference_fingerprint: referenceFingerprint,
    reference_alignment: referenceAlignmentSummary(),
    cache_reused: false,
    reference_count: references.length,
    skipped_count: skipped.length,
    skipped,
    references,
  };
  await writeJson(cachePath, payload);
  return payload;
}

async function descriptorForAlignedReference(entry) {
  const cardId = normalizeId(entry.card_id ?? entry.id ?? entry.cardPrintId);
  if (!cardId) throw new Error('patch_reference_missing_card_id');
  if (!entry.art_image_path) throw new Error(`patch_reference_missing_aligned_artwork:${cardId}`);

  const artworkDescriptor = await computePatchDescriptorFromPath(entry.art_image_path);
  return {
    card_id: cardId,
    gv_id: entry.gv_id ?? null,
    name: entry.name ?? null,
    set_code: entry.set_code ?? null,
    number: entry.number ?? null,
    variant_key: entry.variant_key ?? null,
    image_url: entry.image_url ?? null,
    source_path: entry.source_image_path ?? entry.image_path ?? null,
    normalized_full_card_path: entry.full_image_path,
    artwork_region_path: entry.art_image_path,
    alignment_metrics: entry.alignment_metrics ?? null,
    artwork_descriptor: artworkDescriptor,
  };
}

async function descriptorForQuery(item) {
  const artworkDescriptor = await computePatchDescriptorFromPath(item.art_image_path);
  return {
    query_id: item.query_id,
    source_name: item.source_name,
    source_dir: item.source_dir,
    artwork_region_path: item.art_image_path,
    artifact_fallbacks: item.artifact_fallbacks,
    expected_card_id: normalizeId(item.expected_card_id),
    expected_label: item.expected_label ?? null,
    metrics: item.metrics ?? null,
    artwork_descriptor: artworkDescriptor,
  };
}

async function discoverScannerQueries(inputDir, labelIndex) {
  const resolved = path.resolve(inputDir);
  const rootStat = await stat(resolved);
  const candidateDirs = rootStat.isDirectory()
    ? await discoverCandidateDirs(resolved)
    : [path.dirname(resolved)];
  const items = [];
  const skipped = [];

  for (const dir of candidateDirs) {
    const artChoice = await firstExistingFileChoice(dir, [
      'artwork_region_color.png',
      'artwork_region_color.jpg',
      'normalized_artwork_region_color.png',
      'normalized_artwork_region_color.jpg',
      'normalized_artwork_region.jpg',
      'artwork_region.jpg',
      'artwork_region.png',
    ]);

    if (!artChoice) {
      skipped.push({
        source_dir: dir,
        reason: 'missing_artwork_region',
      });
      continue;
    }

    const sourceName = path.basename(dir);
    const label = labelIndex.findForName(sourceName);
    items.push({
      query_id: sourceName,
      source_name: sourceName,
      source_dir: dir,
      art_image_path: artChoice.path,
      artifact_fallbacks: {
        artwork: artChoice.name.includes('_color') ? null : 'color_artwork_missing_used_available_artwork_only',
      },
      expected_card_id: label?.true_card_id ?? null,
      expected_label: label?.true_card ?? null,
      metrics: await readJsonIfPresent(path.join(dir, 'metrics.json')),
    });
  }

  return {
    input_dir: resolved,
    items,
    skipped,
    labels_path: labelIndex.path,
  };
}

async function discoverCandidateDirs(rootDir) {
  const directArt = await firstExistingFileChoice(rootDir, [
    'artwork_region_color.png',
    'normalized_artwork_region.jpg',
  ]);
  if (directArt) return [rootDir];

  const entries = await readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

async function loadLocalReferenceEntries(referencePath) {
  const resolved = path.resolve(referencePath);
  const inputStat = await stat(resolved);
  if (inputStat.isFile()) {
    const manifest = JSON.parse(await readFile(resolved, 'utf8'));
    const rows = Array.isArray(manifest) ? manifest : manifest.references ?? manifest.cards ?? [];
    return {
      source: 'local_manifest',
      input: resolved,
      entries: rows.map((row, index) => ({
        card_id: row.card_id ?? row.id ?? `reference_${String(index + 1).padStart(4, '0')}`,
        gv_id: row.gv_id ?? null,
        name: row.name ?? null,
        set_code: row.set_code ?? null,
        number: row.number ?? null,
        variant_key: row.variant_key ?? null,
        image_url: row.image_url ?? null,
        image_path: row.image_path ? path.resolve(path.dirname(resolved), row.image_path) : null,
        full_image_path: row.full_image_path ? path.resolve(path.dirname(resolved), row.full_image_path) : null,
      })),
    };
  }

  const entries = [];
  const dirs = await discoverCandidateDirs(resolved);
  for (let index = 0; index < dirs.length; index += 1) {
    const dir = dirs[index];
    const full = await firstExistingFileChoice(dir, [
      'normalized_full_card_color.png',
      'normalized_full_card.jpg',
      'full_card.jpg',
      'card.jpg',
    ]);
    if (full) {
      entries.push({
        card_id: path.basename(dir) || `reference_${index + 1}`,
        name: path.basename(dir),
        full_image_path: full.path,
      });
    }
  }

  if (entries.length === 0) {
    const files = (await readdir(resolved, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && isImagePath(entry.name))
      .map((entry) => path.join(resolved, entry.name))
      .sort((a, b) => a.localeCompare(b));
    for (const file of files) {
      entries.push({
        card_id: path.basename(file, path.extname(file)),
        name: path.basename(file, path.extname(file)),
        image_path: file,
      });
    }
  }

  return {
    source: 'local_folder',
    input: resolved,
    entries,
  };
}

async function loadSupabaseReferenceEntries({ outputDir, cardIds, setCodes, limit, timeoutMs }) {
  const supabase = createBackendClient();
  const rowsById = new Map();

  if (cardIds.length > 0) {
    const { data, error } = await supabase
      .from('card_prints')
      .select('id, gv_id, name, number, set_code, variant_key, image_url, representative_image_url')
      .in('id', cardIds);
    if (error) throw new Error(`supabase_reference_card_ids_failed:${error.message}`);
    for (const row of data ?? []) rowsById.set(row.id, row);
  }

  let broadQuery = supabase
    .from('card_prints')
    .select('id, gv_id, name, number, set_code, variant_key, image_url, representative_image_url')
    .or('image_url.not.is.null,representative_image_url.not.is.null')
    .order('set_code', { ascending: true })
    .order('number', { ascending: true })
    .limit(limit);

  if (setCodes.length > 0) {
    broadQuery = broadQuery.in('set_code', setCodes);
  }

  const { data: broadRows, error: broadError } = await broadQuery;
  if (broadError) throw new Error(`supabase_reference_subset_failed:${broadError.message}`);
  for (const row of broadRows ?? []) rowsById.set(row.id, row);

  const cacheDir = path.join(outputDir, 'reference_cache');
  await ensureDir(cacheDir);

  const entries = [];
  const skippedDownloads = [];
  for (const row of rowsById.values()) {
    const imageUrl = normalizeUrl(row.image_url) ?? normalizeUrl(row.representative_image_url);
    if (!imageUrl) {
      skippedDownloads.push({ card_id: row.id, reason: 'missing_image_url' });
      continue;
    }
    try {
      const imagePath = await downloadReferenceImage({
        url: imageUrl,
        cacheDir,
        cardId: row.id,
        timeoutMs,
      });
      entries.push({
        card_id: row.id,
        gv_id: row.gv_id ?? null,
        name: row.name ?? null,
        set_code: row.set_code ?? null,
        number: row.number ?? null,
        variant_key: row.variant_key ?? null,
        image_url: imageUrl,
        image_path: imagePath,
      });
    } catch (error) {
      skippedDownloads.push({
        card_id: row.id,
        image_url: imageUrl,
        reason: error?.message || String(error),
      });
    }
  }

  return {
    source: 'supabase_card_prints',
    input: 'public.card_prints image_url/representative_image_url',
    requested_card_ids: cardIds,
    requested_set_codes: setCodes,
    requested_limit: limit,
    row_count: rowsById.size,
    skipped_downloads: skippedDownloads,
    entries,
  };
}

async function downloadReferenceImage({ url, cacheDir, cardId, timeoutMs }) {
  const ext = imageExtensionFromUrl(url);
  const filePath = path.join(cacheDir, `${safeBasename(cardId)}${ext}`);
  if (await pathExists(filePath)) return filePath;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'grookai-identity-v4-reference-alignment/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`download_failed:${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) throw new Error('download_empty');
    await writeFile(filePath, buffer);
    return filePath;
  } finally {
    clearTimeout(timeout);
  }
}

function buildSummary({
  outputDir,
  alignedReferenceDir,
  queryDiscovery,
  referencePlan,
  alignmentPlan,
  descriptorIndex,
  skippedQueries,
  matchResults,
  topN,
  v3Baseline,
}) {
  const evaluated = matchResults.filter((result) => result.expected_card_id);
  const top1Correct = evaluated.filter((result) => result.evaluation.correct_top1).length;
  const top5Correct = evaluated.filter((result) => result.evaluation.correct_in_top5).length;
  const top10Correct = evaluated.filter((result) => result.evaluation.correct_in_top10).length;
  const gaps = evaluated
    .map((result) => result.evaluation.score_gap_top1_top2)
    .filter(Number.isFinite);

  const improvements = evaluated
    .filter((result) => {
      const v3 = result.v3_baseline;
      if (!v3) return false;
      if (result.evaluation.correct_in_top5 && !v3.correct_in_top5) return true;
      if (Number.isFinite(result.evaluation.expected_rank) && Number.isFinite(v3.expected_rank)) {
        return result.evaluation.expected_rank < v3.expected_rank;
      }
      return false;
    })
    .map(compactResultForSummary);

  const regressions = evaluated
    .filter((result) => {
      const v3 = result.v3_baseline;
      if (!v3) return false;
      if (!result.evaluation.correct_in_top5 && v3.correct_in_top5) return true;
      if (Number.isFinite(result.evaluation.expected_rank) && Number.isFinite(v3.expected_rank)) {
        return result.evaluation.expected_rank > v3.expected_rank;
      }
      return false;
    })
    .map(compactResultForSummary);

  const v4AverageGap = average(gaps);
  const v3AverageGap = v3Baseline.summary?.average_top1_top2_score_gap ?? null;
  const v3Top1 = v3Baseline.summary?.v3_top1_accuracy ?? null;
  const v3Top5 = v3Baseline.summary?.v3_top5_accuracy ?? null;
  const v3Top10 = v3Baseline.summary?.v3_top10_accuracy ?? null;
  const v4Top1 = evaluated.length > 0 ? round6(top1Correct / evaluated.length) : null;
  const v4Top5 = evaluated.length > 0 ? round6(top5Correct / evaluated.length) : null;
  const v4Top10 = evaluated.length > 0 ? round6(top10Correct / evaluated.length) : null;

  return {
    generated_at: new Date().toISOString(),
    harness: 'identity_bridge_v4_reference_alignment',
    proof_only: true,
    final_identity_decision: false,
    descriptor_version: PATCH_DESCRIPTOR_V1.name,
    matching_logic: 'unchanged_identity_bridge_v3_patch_matching',
    reference_alignment: referenceAlignmentSummary(),
    query_input_dir: queryDiscovery.input_dir,
    labels_path: queryDiscovery.labels_path,
    reference_source: referencePlan.source,
    reference_input: referencePlan.input,
    aligned_reference_dir: path.resolve(alignedReferenceDir),
    output_dir: path.resolve(outputDir),
    comparisons_dir: path.resolve(path.join(outputDir, 'comparisons')),
    top_n: topN,
    total_tests: queryDiscovery.items.length,
    evaluated_tests: evaluated.length,
    query_skipped_count: queryDiscovery.skipped.length + skippedQueries.length,
    reference_rows_seen: referencePlan.row_count ?? referencePlan.entries.length,
    reference_downloaded_count: referencePlan.entries.length,
    reference_alignment_attempted_count: referencePlan.entries.length,
    reference_aligned_count: alignmentPlan.aligned_count,
    reference_alignment_success_rate: referencePlan.entries.length > 0
      ? round6(alignmentPlan.aligned_count / referencePlan.entries.length)
      : null,
    reference_alignment_cache_reused_count: alignmentPlan.cache_reused_count,
    reference_alignment_normalized_count: alignmentPlan.normalized_count,
    reference_index_count: descriptorIndex.reference_count,
    reference_index_cache_reused: Boolean(descriptorIndex.cache_reused),
    reference_skipped_count: (
      (descriptorIndex.skipped?.length ?? 0) +
      (referencePlan.skipped_downloads?.length ?? 0) +
      (alignmentPlan.skipped?.length ?? 0)
    ),
    v3_baseline: v3Baseline.summary ? {
      top1_accuracy: v3Top1,
      top5_accuracy: v3Top5,
      top10_accuracy: v3Top10,
      evaluated_tests: v3Baseline.summary.evaluated_tests,
      average_top1_top2_score_gap: v3AverageGap,
      reference_index_count: v3Baseline.summary.reference_index_count,
    } : null,
    v4_top1_accuracy: v4Top1,
    v4_top5_accuracy: v4Top5,
    v4_top10_accuracy: v4Top10,
    top1_correct_count: top1Correct,
    top5_correct_count: top5Correct,
    top10_correct_count: top10Correct,
    correct_card_rank_distribution: rankDistribution(evaluated),
    average_top1_top2_score_gap: v4AverageGap,
    improvement_vs_v3: {
      top1_delta: Number.isFinite(v3Top1) && Number.isFinite(v4Top1) ? round6(v4Top1 - v3Top1) : null,
      top5_delta: Number.isFinite(v3Top5) && Number.isFinite(v4Top5) ? round6(v4Top5 - v3Top5) : null,
      top10_delta: Number.isFinite(v3Top10) && Number.isFinite(v4Top10) ? round6(v4Top10 - v3Top10) : null,
      average_gap_delta: Number.isFinite(v3AverageGap) && Number.isFinite(v4AverageGap)
        ? round6(v4AverageGap - v3AverageGap)
        : null,
      larger_gap_is_better_for_separation: true,
      improved_case_count: improvements.length,
      regression_case_count: regressions.length,
    },
    alignment_fixed_problem: Boolean(
      Number.isFinite(v3Top5) &&
      Number.isFinite(v4Top5) &&
      v4Top5 > v3Top5
    ),
    improvement_cases: improvements,
    regression_cases: regressions,
    failure_cases: evaluated
      .filter((result) => !result.evaluation.correct_in_top10)
      .map(compactResultForSummary),
    examples: evaluated.slice(0, 5).map(compactResultForSummary),
    skipped_queries: [
      ...queryDiscovery.skipped,
      ...skippedQueries,
    ],
    skipped_reference_alignment: alignmentPlan.skipped,
    skipped_reference_descriptors: descriptorIndex.skipped,
    skipped_reference_downloads: referencePlan.skipped_downloads ?? [],
  };
}

function compactResultForSummary(result) {
  return {
    query: result.query,
    expected_card_id: result.expected_card_id,
    expected_label: result.expected_label,
    correct_top1: result.evaluation.correct_top1,
    correct_in_top5: result.evaluation.correct_in_top5,
    correct_in_top10: result.evaluation.correct_in_top10,
    expected_rank: result.evaluation.expected_rank,
    score_gap_top1_top2: result.evaluation.score_gap_top1_top2,
    v3_baseline: result.v3_baseline,
    top_candidates: result.top_candidates.slice(0, 5).map((candidate) => ({
      card_id: candidate.card_id,
      gv_id: candidate.gv_id,
      name: candidate.name,
      set_code: candidate.set_code,
      number: candidate.number,
      variant_key: candidate.variant_key,
      final_score: candidate.final_score,
      histogram_score: candidate.histogram_score,
      mean_rgb_score: candidate.mean_rgb_score,
      edge_score: candidate.edge_score,
      used_patch_count: candidate.used_patch_count,
      ignored_patch_count: candidate.ignored_patch_count,
      normalized_full_card_path: candidate.normalized_full_card_path,
      artwork_region_path: candidate.artwork_region_path,
    })),
  };
}

function evaluateCandidates(expectedCardId, candidates) {
  if (!expectedCardId) {
    return {
      evaluated: false,
      correct_top1: null,
      correct_in_top5: null,
      correct_in_top10: null,
      expected_rank: null,
      score_gap_top1_top2: scoreGap(candidates),
    };
  }
  const rankIndex = candidates.findIndex((candidate) => candidate.card_id === expectedCardId);
  return {
    evaluated: true,
    correct_top1: rankIndex === 0,
    correct_in_top5: rankIndex >= 0 && rankIndex < 5,
    correct_in_top10: rankIndex >= 0 && rankIndex < 10,
    expected_rank: rankIndex >= 0 ? rankIndex + 1 : null,
    score_gap_top1_top2: scoreGap(candidates),
  };
}

function scoreGap(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 2) return null;
  return round6(candidates[1].final_score - candidates[0].final_score);
}

function rankDistribution(evaluated) {
  return {
    rank_1: evaluated.filter((result) => result.evaluation.expected_rank === 1).length,
    ranks_2_to_5: evaluated.filter((result) =>
      Number.isFinite(result.evaluation.expected_rank) &&
      result.evaluation.expected_rank >= 2 &&
      result.evaluation.expected_rank <= 5
    ).length,
    ranks_6_to_10: evaluated.filter((result) =>
      Number.isFinite(result.evaluation.expected_rank) &&
      result.evaluation.expected_rank >= 6 &&
      result.evaluation.expected_rank <= 10
    ).length,
    not_in_top10: evaluated.filter((result) => !Number.isFinite(result.evaluation.expected_rank)).length,
  };
}

async function loadV3Baseline(summaryPath) {
  const resolved = path.resolve(summaryPath);
  if (!(await pathExists(resolved))) {
    return {
      summary: null,
      byQuery: new Map(),
    };
  }

  const summary = JSON.parse(await readFile(resolved, 'utf8'));
  const byQuery = new Map();
  for (const example of summary.examples ?? []) {
    byQuery.set(example.query, {
      correct_top1: example.correct_top1,
      correct_in_top5: example.correct_in_top5,
      correct_in_top10: example.correct_in_top10,
      expected_rank: expectedRankFromCandidates(example.expected_card_id, example.top_candidates),
      candidates: example.top_candidates ?? [],
    });
  }
  for (const failure of summary.failure_cases ?? []) {
    if (!byQuery.has(failure.query)) {
      byQuery.set(failure.query, {
        correct_top1: false,
        correct_in_top5: false,
        correct_in_top10: false,
        expected_rank: expectedRankFromCandidates(failure.expected_card_id, failure.top_candidates),
        candidates: failure.top_candidates ?? [],
      });
    }
  }
  return {
    summary,
    byQuery,
  };
}

function expectedRankFromCandidates(expectedCardId, candidates) {
  if (!expectedCardId || !Array.isArray(candidates)) return null;
  const index = candidates.findIndex((candidate) => candidate.card_id === expectedCardId);
  return index >= 0 ? index + 1 : null;
}

async function loadLabelIndex(labelsPath) {
  const resolved = path.resolve(labelsPath);
  if (!(await pathExists(resolved))) {
    return {
      path: resolved,
      rows: [],
      findForName: () => null,
    };
  }

  const raw = JSON.parse(await readFile(resolved, 'utf8'));
  const rows = Array.isArray(raw) ? raw : raw.selected_rows ?? raw.rows ?? [];
  return {
    path: resolved,
    rows,
    findForName: (sourceName) => {
      const normalized = String(sourceName || '').toLowerCase();
      return rows.find((row) => {
        const probes = [
          row.snapshot_id,
          row.image_name,
          row.local_path ? path.basename(row.local_path) : null,
        ].filter(Boolean).map((value) => String(value).toLowerCase());
        return probes.some((probe) => normalized.includes(probe.replace(/\.(?:jpg|jpeg|png|webp)$/i, '')));
      }) ?? null;
    },
  };
}

async function fingerprintAlignedReferenceEntries(entries) {
  const parts = [];
  for (const entry of entries) {
    const fullStat = await stat(entry.full_image_path);
    const artStat = await stat(entry.art_image_path);
    parts.push([
      entry.card_id ?? entry.id ?? '',
      entry.image_url ?? '',
      entry.full_image_path,
      fullStat.size,
      fullStat.mtimeMs,
      entry.art_image_path,
      artStat.size,
      artStat.mtimeMs,
    ].join('|'));
  }
  return `${PATCH_DESCRIPTOR_V1.name}:scanner_v3_reference_alignment_v4:${parts.sort().join('::')}`;
}

async function firstExistingFileChoice(dir, names) {
  for (const name of names) {
    const filePath = path.join(dir, name);
    if (await pathExists(filePath)) {
      return {
        name,
        path: filePath,
      };
    }
  }
  return null;
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readJsonIfPresent(filePath) {
  if (!(await pathExists(filePath))) return null;
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function normalizeUrl(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

function normalizeId(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function imageExtensionFromUrl(url) {
  const cleanUrl = String(url).split('?')[0];
  const ext = path.extname(cleanUrl).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
}

function parseSetCodeFromLabel(label) {
  if (!label) return null;
  const match = String(label).match(/\[([a-z0-9.]+)\s+#/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function referenceAlignmentSummary() {
  return {
    purpose: 'align_reference_artwork_crop_to_scanner_v3_normalized_artifacts',
    normalized_full_card_size: `${NORMALIZED_CARD_WIDTH}x${NORMALIZED_CARD_HEIGHT}`,
    reference_normalization: 'Scanner V3 centered portrait normalization for already-flat canonical card images',
    artwork_extraction: 'Scanner V3 extractNormalizedRegions artwork region',
    descriptor_changed: false,
    matching_logic_changed: false,
    ai_called: false,
  };
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function average(values) {
  const nums = values.filter(Number.isFinite);
  if (nums.length === 0) return null;
  return round6(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
