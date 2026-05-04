import '../env.mjs';

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  EMBEDDING_INDEX_V1,
  buildMultiViewEmbeddingIndex,
  embedImageBuffer,
  rankEmbeddingViewCandidates,
} from './lib/embedding_index_v1.mjs';
import {
  isImagePath,
  safeBasename,
} from './lib/hash_index_v1.mjs';
import {
  MULTICROP_GENERATOR_V1,
  generateQueryCrops,
  generateReferenceViews,
} from './lib/multicrop_generator_v1.mjs';

const DEFAULT_QUERY_DIR = '.tmp/scanner_v3_normalization_proof';
const DEFAULT_LABELS = '.tmp/embedding_test_images/results.json';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_identity_bridge_v7';
const DEFAULT_INDEX_CACHE = '.tmp/scanner_v3_embedding_index_v7.json';
const DEFAULT_V5_SUMMARY = '.tmp/scanner_v3_identity_bridge_v5/summary.json';
const DEFAULT_V6_SUMMARY = '.tmp/scanner_v3_identity_bridge_v6/summary.json';
const DEFAULT_TOP_PER_CROP = 50;
const DEFAULT_TOP_UNIFIED = 100;
const DEFAULT_REFERENCE_LIMIT = 184;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;
const FREQUENCY_BONUS = 0.018;

function parseArgs(argv) {
  const args = {
    query: DEFAULT_QUERY_DIR,
    references: null,
    labels: DEFAULT_LABELS,
    out: DEFAULT_OUTPUT_DIR,
    indexCache: DEFAULT_INDEX_CACHE,
    v5Summary: DEFAULT_V5_SUMMARY,
    v6Summary: DEFAULT_V6_SUMMARY,
    topPerCrop: DEFAULT_TOP_PER_CROP,
    topUnified: DEFAULT_TOP_UNIFIED,
    referenceLimit: DEFAULT_REFERENCE_LIMIT,
    referenceSetCodes: [],
    referenceCardIds: [],
    downloadTimeoutMs: DEFAULT_DOWNLOAD_TIMEOUT_MS,
    rebuildIndex: false,
    model: EMBEDDING_INDEX_V1.model,
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
    } else if (name === '--index-cache') {
      args.indexCache = nextValue();
    } else if (name === '--v5-summary') {
      args.v5Summary = nextValue();
    } else if (name === '--v6-summary') {
      args.v6Summary = nextValue();
    } else if (name === '--top-per-crop') {
      args.topPerCrop = positiveInt(nextValue(), DEFAULT_TOP_PER_CROP);
    } else if (name === '--top-unified') {
      args.topUnified = positiveInt(nextValue(), DEFAULT_TOP_UNIFIED);
    } else if (name === '--reference-limit') {
      args.referenceLimit = positiveInt(nextValue(), DEFAULT_REFERENCE_LIMIT);
    } else if (name === '--reference-set-codes') {
      args.referenceSetCodes = splitCsv(nextValue()).map((value) => value.toLowerCase());
    } else if (name === '--reference-card-ids') {
      args.referenceCardIds = splitCsv(nextValue());
    } else if (name === '--download-timeout-ms') {
      args.downloadTimeoutMs = positiveInt(nextValue(), DEFAULT_DOWNLOAD_TIMEOUT_MS);
    } else if (name === '--model') {
      args.model = nextValue() || EMBEDDING_INDEX_V1.model;
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
    '  node backend/identity_v3/run_identity_bridge_v7_multicrop_recall.mjs [--query <scanner_output>] [--references <folder_or_manifest>] [--out <folder>]',
    '',
    'Defaults:',
    `  --query ${DEFAULT_QUERY_DIR}`,
    `  --labels ${DEFAULT_LABELS}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --index-cache ${DEFAULT_INDEX_CACHE}`,
    `  --top-per-crop ${DEFAULT_TOP_PER_CROP}`,
    `  --top-unified ${DEFAULT_TOP_UNIFIED}`,
    `  --reference-limit ${DEFAULT_REFERENCE_LIMIT}`,
    '',
    'This harness expands recall using query multi-crops, reference multi-view embeddings, and deduped card candidate unioning.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const outputDir = path.resolve(args.out);
  const indexCachePath = path.resolve(args.indexCache);
  await ensureDir(outputDir);
  await ensureDir(path.dirname(indexCachePath));

  const labelIndex = await loadLabelIndex(args.labels);
  const queryDiscovery = await discoverScannerQueries(args.query, labelIndex);
  if (queryDiscovery.items.length === 0) {
    throw new Error(`identity_bridge_v7_no_scanner_queries:${path.resolve(args.query)}`);
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
    throw new Error('identity_bridge_v7_no_reference_entries');
  }

  const skippedReferences = [];
  const indexLoad = await loadOrBuildMultiViewIndex({
    entries: referencePlan.entries,
    cachePath: indexCachePath,
    rebuildIndex: args.rebuildIndex,
    model: args.model,
    skippedReferences,
  });
  const referenceIndex = indexLoad.index;
  if (referenceIndex.references.length === 0) {
    throw new Error('identity_bridge_v7_reference_index_empty');
  }

  const matchResults = [];
  const skippedQueries = [];
  for (const query of queryDiscovery.items) {
    try {
      const result = await processQuery({
        query,
        referenceIndex,
        outputDir,
        model: args.model,
        topPerCrop: args.topPerCrop,
        topUnified: args.topUnified,
      });
      matchResults.push(result);
      console.log(JSON.stringify({
        query: result.query,
        expected_card_id: result.expected_card_id,
        expected_rank: result.evaluation.expected_rank,
        correct_in_top10: result.evaluation.correct_in_top10,
        correct_in_top50: result.evaluation.correct_in_top50,
        contributing_crops: result.evaluation.expected_crop_contribution_count,
      }));
    } catch (error) {
      skippedQueries.push({
        query_id: query.query_id,
        source_dir: query.source_dir,
        reason: error?.message || String(error),
      });
    }
  }

  const baselines = {
    v5: await readJsonIfPresent(args.v5Summary),
    v6: await readJsonIfPresent(args.v6Summary),
  };
  const summary = buildSummary({
    outputDir,
    indexCachePath,
    queryDiscovery,
    referencePlan,
    referenceIndex,
    indexLoad,
    skippedReferences,
    skippedQueries,
    matchResults,
    baselines,
    args,
  });
  await writeJson(path.join(outputDir, 'summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

async function processQuery({
  query,
  referenceIndex,
  outputDir,
  model,
  topPerCrop,
  topUnified,
}) {
  const startedAt = performance.now();
  const crops = await generateQueryCrops({
    normalizedFullCardPath: query.full_image_path,
    artworkRegionPath: query.art_image_path,
  });
  const cropResults = [];
  const queryEmbeddingTimings = [];

  for (const crop of crops) {
    const embedResult = await embedImageBuffer(crop.buffer, { model });
    queryEmbeddingTimings.push(embedResult.elapsed_ms);
    const candidates = rankEmbeddingViewCandidates({
      queryEmbedding: embedResult.embedding,
      references: referenceIndex.references,
      topN: topPerCrop,
      queryCropType: crop.type,
    });
    cropResults.push({
      crop_type: crop.type,
      source: crop.source,
      embedding_ms: embedResult.elapsed_ms,
      top_candidates: candidates,
    });
  }

  const unifiedCandidates = unifyCandidates({
    cropResults,
    topUnified,
  });
  const evaluation = evaluateCandidates(query.expected_card_id, unifiedCandidates, cropResults);
  const queryOutDir = path.join(outputDir, safeBasename(query.query_id));
  await ensureDir(queryOutDir);
  const result = {
    query: query.query_id,
    source_name: query.source_name,
    source_dir: query.source_dir,
    expected_card_id: query.expected_card_id,
    expected_label: query.expected_label,
    normalized_full_card_path: query.full_image_path,
    artwork_region_path: query.art_image_path,
    crop_generator: MULTICROP_GENERATOR_V1.name,
    query_crop_types: crops.map((crop) => crop.type),
    reference_view_types: MULTICROP_GENERATOR_V1.reference_view_types,
    reference_count: referenceIndex.reference_count,
    reference_view_count: referenceIndex.reference_view_count,
    candidates: unifiedCandidates,
    crop_results: cropResults.map((cropResult) => ({
      ...cropResult,
      top_candidates: cropResult.top_candidates.slice(0, 10),
    })),
    evaluation,
    query_embedding_ms_avg: average(queryEmbeddingTimings),
    query_embedding_ms_max: maxOrNull(queryEmbeddingTimings),
    elapsed_ms: round3(performance.now() - startedAt),
    final_identity_decision: false,
    proof_only: true,
  };
  await writeJson(path.join(queryOutDir, 'candidates.json'), result);
  return result;
}

function unifyCandidates({ cropResults, topUnified }) {
  const byCard = new Map();
  for (const cropResult of cropResults) {
    for (const candidate of cropResult.top_candidates) {
      const current = byCard.get(candidate.card_id) ?? {
        card_id: candidate.card_id,
        gv_id: candidate.gv_id ?? null,
        name: candidate.name ?? null,
        set_code: candidate.set_code ?? null,
        number: candidate.number ?? null,
        variant_key: candidate.variant_key ?? null,
        image_url: candidate.image_url ?? null,
        source_path: candidate.source_path ?? null,
        best_distance: Infinity,
        best_similarity: 0,
        best_query_crop_type: null,
        best_reference_view_type: null,
        crop_types: new Set(),
        reference_view_types: new Set(),
        appearances: [],
      };
      current.crop_types.add(cropResult.crop_type);
      if (candidate.reference_view_type) current.reference_view_types.add(candidate.reference_view_type);
      current.appearances.push({
        query_crop_type: cropResult.crop_type,
        reference_view_type: candidate.reference_view_type,
        crop_rank: candidate.rank,
        distance: candidate.distance,
        similarity: candidate.similarity,
      });
      if (candidate.distance < current.best_distance) {
        current.best_distance = candidate.distance;
        current.best_similarity = candidate.similarity;
        current.best_query_crop_type = cropResult.crop_type;
        current.best_reference_view_type = candidate.reference_view_type;
      }
      byCard.set(candidate.card_id, current);
    }
  }

  return [...byCard.values()]
    .map((candidate) => {
      const cropCount = candidate.crop_types.size;
      const frequencyBonus = Math.min(0.12, Math.max(0, cropCount - 1) * FREQUENCY_BONUS);
      const aggregateScore = Math.max(0, Math.min(1, candidate.best_similarity + frequencyBonus));
      return {
        card_id: candidate.card_id,
        gv_id: candidate.gv_id,
        name: candidate.name,
        set_code: candidate.set_code,
        number: candidate.number,
        variant_key: candidate.variant_key,
        image_url: candidate.image_url,
        source_path: candidate.source_path,
        best_distance: round6(candidate.best_distance),
        best_similarity: round6(candidate.best_similarity),
        frequency_bonus: round6(frequencyBonus),
        aggregate_score: round6(aggregateScore),
        crop_contribution_count: cropCount,
        reference_view_contribution_count: candidate.reference_view_types.size,
        contributing_crop_types: [...candidate.crop_types].sort(),
        contributing_reference_view_types: [...candidate.reference_view_types].sort(),
        best_query_crop_type: candidate.best_query_crop_type,
        best_reference_view_type: candidate.best_reference_view_type,
        appearances: candidate.appearances
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 12),
      };
    })
    .sort((a, b) => {
      if (a.aggregate_score !== b.aggregate_score) return b.aggregate_score - a.aggregate_score;
      if (a.best_distance !== b.best_distance) return a.best_distance - b.best_distance;
      if (a.crop_contribution_count !== b.crop_contribution_count) {
        return b.crop_contribution_count - a.crop_contribution_count;
      }
      return String(a.card_id).localeCompare(String(b.card_id));
    })
    .slice(0, topUnified)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
}

async function loadOrBuildMultiViewIndex({
  entries,
  cachePath,
  rebuildIndex,
  model,
  skippedReferences,
}) {
  if (!rebuildIndex && await pathExists(cachePath)) {
    const cached = await readJson(cachePath);
    if (Array.isArray(cached.references) && cached.references.length > 0) {
      const references = cached.references;
      const referenceViewCount = references.reduce((sum, reference) => sum + (reference.views?.length ?? 0), 0);
      return {
        cacheReused: true,
        index: {
          version: cached.version ?? `${EMBEDDING_INDEX_V1.name}_multiview`,
          source: cached.source ?? EMBEDDING_INDEX_V1.source,
          model: cached.model ?? model,
          dimensions: cached.dimensions ?? EMBEDDING_INDEX_V1.dimensions,
          reference_count: references.length,
          reference_view_count: referenceViewCount,
          views_per_reference_avg: references.length === 0 ? null : round6(referenceViewCount / references.length),
          embedding_ms_avg: cached.embedding_ms_avg ?? null,
          embedding_ms_max: cached.embedding_ms_max ?? null,
          references,
        },
      };
    }
  }

  const index = await buildMultiViewEmbeddingIndex(entries, {
    model,
    viewGenerator: generateReferenceViews,
    onSkip: (skip) => skippedReferences.push(skip),
    onProgress: ({ index: current, total, row }) => {
      if (current === 1 || current % 10 === 0 || current === total) {
        console.log(JSON.stringify({
          event: 'multiview_reference_progress',
          current,
          total,
          card_id: row.card_id,
          view_count: row.views.length,
        }));
      }
    },
  });
  await writeJson(cachePath, index);
  return {
    cacheReused: false,
    index,
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
    const fullPath = await firstExistingFile(dir, [
      'normalized_full_card_color.png',
      'normalized_full_card_color.jpg',
      'normalized_full_card.jpg',
      'normalized_full_card.png',
    ]);
    const artPath = await firstExistingFile(dir, [
      'artwork_region_color.png',
      'artwork_region_color.jpg',
      'normalized_artwork_region_color.png',
      'normalized_artwork_region_color.jpg',
      'normalized_artwork_region.jpg',
      'artwork_region.jpg',
      'artwork_region.png',
    ]);

    if (!fullPath && !artPath) {
      skipped.push({
        source_dir: dir,
        reason: 'missing_full_card_and_artwork_region',
      });
      continue;
    }

    const sourceName = path.basename(dir);
    const label = labelIndex.findForName(sourceName);
    items.push({
      query_id: sourceName,
      source_name: sourceName,
      source_dir: dir,
      full_image_path: fullPath,
      art_image_path: artPath,
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
  const direct = await firstExistingFile(rootDir, [
    'normalized_full_card_color.png',
    'normalized_full_card.jpg',
    'artwork_region_color.png',
    'normalized_artwork_region.jpg',
  ]);
  if (direct) return [rootDir];

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
    const manifest = await readJson(resolved);
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
        art_image_path: row.art_image_path ? path.resolve(path.dirname(resolved), row.art_image_path) : null,
      })),
    };
  }

  const entries = [];
  const dirs = await discoverCandidateDirs(resolved);
  for (let index = 0; index < dirs.length; index += 1) {
    const dir = dirs[index];
    const full = await firstExistingFile(dir, [
      'normalized_full_card_color.png',
      'normalized_full_card.jpg',
      'full_card.jpg',
      'card.jpg',
    ]);
    const art = await firstExistingFile(dir, [
      'artwork_region_color.png',
      'normalized_artwork_region.jpg',
      'artwork_region.jpg',
    ]);
    if (full || art) {
      entries.push({
        card_id: path.basename(dir) || `reference_${index + 1}`,
        name: path.basename(dir),
        full_image_path: full,
        art_image_path: art,
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
        'user-agent': 'grookai-identity-v3-multicrop-recall/1.0',
      },
    });
    if (!response.ok) throw new Error(`download_http_${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw new Error('download_empty_image');
    await writeFile(filePath, buffer);
    return filePath;
  } finally {
    clearTimeout(timeout);
  }
}

function evaluateCandidates(expectedCardId, candidates, cropResults) {
  if (!expectedCardId) {
    return {
      evaluated: false,
      reason: 'missing_expected_card_id',
      expected_rank: null,
      correct_in_top10: false,
      correct_in_top20: false,
      correct_in_top50: false,
      correct_in_top100: false,
      expected_crop_contribution_count: 0,
      expected_contributing_crop_types: [],
    };
  }

  const index = candidates.findIndex((candidate) => candidate.card_id === expectedCardId);
  const expectedCandidate = index >= 0 ? candidates[index] : null;
  const cropTypes = new Set();
  for (const cropResult of cropResults) {
    if (cropResult.top_candidates.some((candidate) => candidate.card_id === expectedCardId)) {
      cropTypes.add(cropResult.crop_type);
    }
  }

  return {
    evaluated: true,
    expected_rank: index >= 0 ? index + 1 : null,
    correct_in_top10: index >= 0 && index < 10,
    correct_in_top20: index >= 0 && index < 20,
    correct_in_top50: index >= 0 && index < 50,
    correct_in_top100: index >= 0 && index < 100,
    expected_crop_contribution_count: cropTypes.size,
    expected_contributing_crop_types: [...cropTypes].sort(),
    expected_best_query_crop_type: expectedCandidate?.best_query_crop_type ?? null,
    expected_best_reference_view_type: expectedCandidate?.best_reference_view_type ?? null,
    expected_best_distance: expectedCandidate?.best_distance ?? null,
  };
}

function buildSummary({
  outputDir,
  indexCachePath,
  queryDiscovery,
  referencePlan,
  referenceIndex,
  indexLoad,
  skippedReferences,
  skippedQueries,
  matchResults,
  baselines,
  args,
}) {
  const evaluated = matchResults.filter((result) => result.evaluation.evaluated);
  const ranks = evaluated.map((result) => result.evaluation.expected_rank).filter(Number.isFinite);
  const recoveredFromV5Misses = evaluated
    .filter((result) => result.evaluation.correct_in_top50)
    .filter((result) => {
      const failure = baselines.v5?.failure_cases?.find((item) => item.query === result.query);
      return failure && (!Number.isFinite(failure.expected_rank) || failure.expected_rank > 50);
    });

  return {
    generated_at: new Date().toISOString(),
    output_dir: outputDir,
    index_cache_path: indexCachePath,
    proof_only: true,
    final_identity_decision: false,
    embedding_model: referenceIndex.model,
    crop_generator: MULTICROP_GENERATOR_V1.name,
    query_crop_types: MULTICROP_GENERATOR_V1.query_crop_types,
    reference_view_types: MULTICROP_GENERATOR_V1.reference_view_types,
    reference_source: referencePlan.source,
    reference_count_requested: referencePlan.row_count ?? referencePlan.entries.length,
    reference_count_indexed: referenceIndex.reference_count,
    reference_view_count: referenceIndex.reference_view_count,
    reference_view_count_per_card_avg: referenceIndex.views_per_reference_avg,
    index_cache_reused: indexLoad.cacheReused,
    skipped_reference_count: skippedReferences.length + (referencePlan.skipped_downloads?.length ?? 0),
    skipped_references: skippedReferences.slice(0, 20),
    skipped_downloads: referencePlan.skipped_downloads ?? [],
    query_input_dir: queryDiscovery.input_dir,
    total_queries_discovered: queryDiscovery.items.length,
    skipped_queries: skippedQueries,
    evaluated_sessions: evaluated.length,
    recall_at_10: recallAt(evaluated, 10),
    recall_at_20: recallAt(evaluated, 20),
    recall_at_50: recallAt(evaluated, 50),
    recall_at_100: recallAt(evaluated, 100),
    rank_distribution: rankDistribution(ranks),
    average_expected_rank: average(ranks),
    average_expected_crop_contribution_count: average(
      evaluated.map((result) => result.evaluation.expected_crop_contribution_count),
    ),
    multi_crop_contribution_stats: contributionStats(evaluated),
    top_per_crop: args.topPerCrop,
    top_unified: args.topUnified,
    query_embedding_ms_avg: average(matchResults.map((result) => result.query_embedding_ms_avg)),
    query_embedding_ms_max: maxOrNull(matchResults.map((result) => result.query_embedding_ms_max)),
    elapsed_ms_avg: average(matchResults.map((result) => result.elapsed_ms)),
    elapsed_ms_max: maxOrNull(matchResults.map((result) => result.elapsed_ms)),
    improvement_vs_v5: {
      v5_top1_accuracy: baselines.v5?.top1_accuracy ?? null,
      v5_top5_accuracy: baselines.v5?.top5_accuracy ?? null,
      v5_top20_accuracy: baselines.v5?.top20_accuracy ?? null,
      v7_recall_at_10: recallAt(evaluated, 10),
      v7_recall_at_20: recallAt(evaluated, 20),
      v7_recall_at_50: recallAt(evaluated, 50),
      v7_recall_at_100: recallAt(evaluated, 100),
    },
    improvement_vs_v6: {
      v6_top1_accuracy: baselines.v6?.v6_top1_accuracy ?? null,
      v6_top5_accuracy: baselines.v6?.v6_top5_accuracy ?? null,
      v7_recall_at_10: recallAt(evaluated, 10),
      v7_recall_at_20: recallAt(evaluated, 20),
      v7_recall_at_50: recallAt(evaluated, 50),
      v7_recall_at_100: recallAt(evaluated, 100),
    },
    recovered_missed_cases: recoveredFromV5Misses.map(resultExample),
    failure_cases: evaluated
      .filter((result) => !result.evaluation.correct_in_top100)
      .map(resultExample),
    examples: matchResults.slice(0, 5).map(resultExample),
    recall_sufficient_for_temporal_voting: recallAt(evaluated, 50) >= 0.8,
    next_blocker: recallAt(evaluated, 50) >= 0.8
      ? 'feed V7 candidate pool into reranking and temporal voting harness'
      : 'candidate recall is still too low; inspect crop/reference alignment and labels before app integration',
  };
}

function resultExample(result) {
  return {
    query: result.query,
    expected_label: result.expected_label,
    expected_card_id: result.expected_card_id,
    expected_rank: result.evaluation.expected_rank,
    expected_crop_contribution_count: result.evaluation.expected_crop_contribution_count,
    expected_contributing_crop_types: result.evaluation.expected_contributing_crop_types,
    top_candidates: result.candidates.slice(0, 5).map((candidate) => ({
      card_id: candidate.card_id,
      name: candidate.name,
      set_code: candidate.set_code,
      number: candidate.number,
      rank: candidate.rank,
      best_distance: candidate.best_distance,
      aggregate_score: candidate.aggregate_score,
      crop_contribution_count: candidate.crop_contribution_count,
      best_query_crop_type: candidate.best_query_crop_type,
      best_reference_view_type: candidate.best_reference_view_type,
    })),
  };
}

function recallAt(results, k) {
  if (results.length === 0) return null;
  return round6(results.filter((result) => {
    const rank = result.evaluation.expected_rank;
    return Number.isFinite(rank) && rank <= k;
  }).length / results.length);
}

function rankDistribution(ranks) {
  return {
    found_count: ranks.length,
    min: ranks.length === 0 ? null : Math.min(...ranks),
    max: ranks.length === 0 ? null : Math.max(...ranks),
    avg: average(ranks),
    ranks,
  };
}

function contributionStats(results) {
  const counts = results
    .filter((result) => Number.isFinite(result.evaluation.expected_rank))
    .map((result) => result.evaluation.expected_crop_contribution_count);
  return {
    found_cases: counts.length,
    avg_contributing_crops: average(counts),
    max_contributing_crops: maxOrNull(counts),
  };
}

async function loadLabelIndex(labelPath) {
  const resolved = path.resolve(labelPath);
  if (!await pathExists(resolved)) {
    return {
      path: resolved,
      rows: [],
      findForName: () => null,
    };
  }

  const json = await readJson(resolved);
  const rows = Array.isArray(json)
    ? json
    : json.selected_rows ?? json.results ?? json.items ?? [];

  return {
    path: resolved,
    rows,
    findForName(sourceName) {
      const normalizedSource = normalizeLabelKey(sourceName);
      return rows.find((row) => {
        const imageName = normalizeLabelKey(row.image_name ?? row.local_path ?? '');
        const imageStem = normalizeLabelKey(path.basename(String(row.image_name ?? row.local_path ?? ''), path.extname(String(row.image_name ?? row.local_path ?? ''))));
        const snapshotId = normalizeLabelKey(row.snapshot_id ?? '');
        return (imageName && normalizedSource.includes(imageName)) ||
          (imageStem && normalizedSource.includes(imageStem)) ||
          (snapshotId && normalizedSource.includes(snapshotId));
      }) ?? null;
    },
  };
}

function parseSetCodeFromLabel(label) {
  const text = String(label ?? '');
  const match = text.match(/\[([^\]#\s]+)\s*#/);
  return match?.[1]?.trim()?.toLowerCase() || null;
}

function normalizeLabelKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function firstExistingFile(dir, names) {
  for (const name of names) {
    const candidate = path.join(dir, name);
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

function normalizeUrl(value) {
  const text = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return null;
  return text;
}

function imageExtensionFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  } catch {
    // fall through
  }
  return '.jpg';
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readJsonIfPresent(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return round6(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

function maxOrNull(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return Math.max(...finite);
}

function round3(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
