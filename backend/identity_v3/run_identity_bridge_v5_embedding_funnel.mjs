import '../env.mjs';

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  EMBEDDING_INDEX_V1,
  buildEmbeddingIndex,
  embedScannerQuery,
  rankEmbeddingCandidates,
} from './lib/embedding_index_v1.mjs';
import {
  isImagePath,
  safeBasename,
} from './lib/hash_index_v1.mjs';

const DEFAULT_QUERY_DIR = '.tmp/scanner_v3_normalization_proof';
const DEFAULT_LABELS = '.tmp/embedding_test_images/results.json';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_identity_bridge_v5';
const DEFAULT_INDEX_CACHE = '.tmp/scanner_v3_embedding_index.json';
const DEFAULT_TOP_N = 50;
const DEFAULT_REFERENCE_LIMIT = 184;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const args = {
    query: DEFAULT_QUERY_DIR,
    references: null,
    labels: DEFAULT_LABELS,
    out: DEFAULT_OUTPUT_DIR,
    indexCache: DEFAULT_INDEX_CACHE,
    top: DEFAULT_TOP_N,
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
    '  node backend/identity_v3/run_identity_bridge_v5_embedding_funnel.mjs [--query <scanner_output>] [--references <folder_or_manifest>] [--out <folder>]',
    '',
    'Defaults:',
    `  --query ${DEFAULT_QUERY_DIR}`,
    `  --labels ${DEFAULT_LABELS}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --index-cache ${DEFAULT_INDEX_CACHE}`,
    `  --top ${DEFAULT_TOP_N}`,
    `  --reference-limit ${DEFAULT_REFERENCE_LIMIT}`,
    `  --model ${EMBEDDING_INDEX_V1.model}`,
    '',
    'This harness builds or reuses real CLIP image embeddings and returns vector candidates only.',
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
    throw new Error(`identity_bridge_v5_no_scanner_queries:${path.resolve(args.query)}`);
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
    throw new Error('identity_bridge_v5_no_reference_entries');
  }

  const skippedReferences = [];
  const indexLoad = await loadOrBuildEmbeddingIndex({
    entries: referencePlan.entries,
    cachePath: indexCachePath,
    rebuildIndex: args.rebuildIndex,
    model: args.model,
    skippedReferences,
  });
  const referenceIndex = indexLoad.index;
  if (referenceIndex.references.length === 0) {
    throw new Error('identity_bridge_v5_reference_embedding_index_empty');
  }

  const embeddedQueries = [];
  const skippedQueries = [];
  for (const item of queryDiscovery.items) {
    try {
      embeddedQueries.push(await embedScannerQuery(item, { model: args.model }));
    } catch (error) {
      skippedQueries.push({
        query_id: item.query_id,
        source_dir: item.source_dir,
        reason: error?.message || String(error),
      });
    }
  }

  const vectorTimings = [];
  const matchResults = [];
  for (const query of embeddedQueries) {
    const vectorStart = performance.now();
    const candidates = rankEmbeddingCandidates({
      query,
      references: referenceIndex.references,
      topN: args.top,
    });
    vectorTimings.push(roundMs(performance.now() - vectorStart));
    const evaluation = evaluateCandidates(query.expected_card_id, candidates);
    const queryOutDir = path.join(outputDir, safeBasename(query.query_id));
    await ensureDir(queryOutDir);

    const result = {
      query: query.query_id,
      source_name: query.source_name,
      source_dir: query.source_dir,
      expected_card_id: query.expected_card_id,
      expected_label: query.expected_label,
      artwork_region_path: query.artwork_region_path,
      embedding_model: query.embedding_model,
      embedding_source: query.embedding_source,
      embedding_ms: query.embedding_ms,
      vector_search: {
        distance: EMBEDDING_INDEX_V1.distance,
        top_n: args.top,
        reference_count: referenceIndex.references.length,
      },
      candidates,
      evaluation,
      final_identity_decision: false,
      proof_only: true,
    };
    await writeJson(path.join(queryOutDir, 'candidates.json'), result);
    matchResults.push(result);
  }

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
    vectorTimings,
    topN: args.top,
  });

  await writeJson(path.join(outputDir, 'summary.json'), summary);
  await writeJson(path.join(outputDir, 'reference_index_summary.json'), {
    version: referenceIndex.version,
    embedding_source: referenceIndex.source,
    model: referenceIndex.model,
    dimensions: referenceIndex.dimensions,
    cache_path: indexCachePath,
    cache_reused: indexLoad.cacheReused,
    reference_count: referenceIndex.references.length,
    references: referenceIndex.references.map((reference) => ({
      card_id: reference.card_id,
      gv_id: reference.gv_id,
      name: reference.name,
      set_code: reference.set_code,
      number: reference.number,
      variant_key: reference.variant_key,
      image_url: reference.image_url,
      source_path: reference.source_path,
      embedding_ms: reference.embedding_ms,
    })),
  });

  for (const result of matchResults.slice(0, 5)) {
    console.log(JSON.stringify({
      query: result.query,
      expected_card_id: result.expected_card_id,
      expected_label: result.expected_label,
      top1_card_id: result.candidates[0]?.card_id ?? null,
      top1_distance: result.candidates[0]?.distance ?? null,
      correct_in_top5: result.evaluation.correct_in_top5,
      candidates: result.candidates.slice(0, 5).map((candidate) => ({
        card_id: candidate.card_id,
        name: candidate.name,
        set_code: candidate.set_code,
        number: candidate.number,
        distance: candidate.distance,
      })),
    }));
  }
  console.log(JSON.stringify(summary, null, 2));
}

async function loadOrBuildEmbeddingIndex({
  entries,
  cachePath,
  rebuildIndex,
  model,
  skippedReferences,
}) {
  if (!rebuildIndex && await pathExists(cachePath)) {
    const cached = await readJson(cachePath);
    const references = Array.isArray(cached) ? cached : cached.references;
    if (Array.isArray(references) && references.length > 0) {
      return {
        cacheReused: true,
        index: {
          version: EMBEDDING_INDEX_V1.name,
          source: references[0]?.embedding_source ?? EMBEDDING_INDEX_V1.source,
          model: references[0]?.embedding_model ?? model,
          dimensions: references[0]?.embedding?.length ?? EMBEDDING_INDEX_V1.dimensions,
          reference_count: references.length,
          embedding_ms_avg: average(references.map((reference) => Number(reference.embedding_ms))),
          embedding_ms_max: maxOrNull(references.map((reference) => Number(reference.embedding_ms))),
          references,
        },
      };
    }
  }

  const index = await buildEmbeddingIndex(entries, {
    model,
    onSkip: (skip) => skippedReferences.push(skip),
    onProgress: ({ index: current, total, row }) => {
      if (current === 1 || current % 10 === 0 || current === total) {
        console.log(JSON.stringify({
          event: 'embedding_reference_progress',
          current,
          total,
          card_id: row.card_id,
          embedding_ms: row.embedding_ms,
        }));
      }
    },
  });
  await writeJson(cachePath, index.references);
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
    const artPath = await firstExistingFile(dir, [
      'artwork_region_color.png',
      'artwork_region_color.jpg',
      'normalized_artwork_region_color.png',
      'normalized_artwork_region_color.jpg',
      'normalized_artwork_region.jpg',
      'artwork_region.jpg',
      'artwork_region.png',
    ]);

    if (!artPath) {
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
  const directArt = await firstExistingFile(rootDir, [
    'artwork_region_color.png',
    'normalized_artwork_region.jpg',
    'artwork_region.jpg',
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
    const art = await firstExistingFile(dir, [
      'artwork_region_color.png',
      'normalized_artwork_region_color.png',
      'normalized_artwork_region.jpg',
      'artwork_region.jpg',
      'artwork_region.png',
    ]);
    const full = await firstExistingFile(dir, [
      'normalized_full_card_color.png',
      'normalized_full_card.jpg',
      'full_card.jpg',
      'card.jpg',
    ]);
    if (art || full) {
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
        'user-agent': 'grookai-identity-v3-embedding-funnel/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`download_http_${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) throw new Error('download_empty_image');
    await writeFile(filePath, buffer);
    return filePath;
  } finally {
    clearTimeout(timeout);
  }
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
  vectorTimings,
  topN,
}) {
  const evaluated = matchResults.filter((result) => result.evaluation.evaluated);
  const queryTimings = matchResults.map((result) => Number(result.embedding_ms)).filter(Number.isFinite);
  const top5 = Math.min(5, topN);
  const top20 = Math.min(20, topN);

  return {
    output_dir: outputDir,
    index_cache_path: indexCachePath,
    proof_only: true,
    final_identity_decision: false,
    embedding_source_used: referenceIndex.source,
    embedding_model: referenceIndex.model,
    embedding_dimensions: referenceIndex.dimensions,
    index_cache_reused: indexLoad.cacheReused,
    reference_source: referencePlan.source,
    reference_input: referencePlan.input,
    reference_count_requested: referencePlan.row_count ?? referencePlan.entries.length,
    reference_count_indexed: referenceIndex.references.length,
    reference_embeddings_count: referenceIndex.references.length,
    skipped_reference_count: skippedReferences.length + (referencePlan.skipped_downloads?.length ?? 0),
    skipped_references: skippedReferences.slice(0, 20),
    skipped_downloads: referencePlan.skipped_downloads ?? [],
    query_input_dir: queryDiscovery.input_dir,
    total_queries_discovered: queryDiscovery.items.length,
    skipped_queries: skippedQueries,
    evaluated_queries: evaluated.length,
    top1_accuracy: accuracy(evaluated, (result) => result.evaluation.correct_top1),
    top5_accuracy: accuracy(evaluated, (result) => result.evaluation.correct_in_top5),
    top20_accuracy: accuracy(evaluated, (result) => result.evaluation.correct_in_top20),
    correct_top1_count: evaluated.filter((result) => result.evaluation.correct_top1).length,
    correct_top5_count: evaluated.filter((result) => result.evaluation.correct_in_top5).length,
    correct_top20_count: evaluated.filter((result) => result.evaluation.correct_in_top20).length,
    average_top1_top2_distance_gap: average(
      matchResults.map((result) => result.evaluation.distance_gap_top1_top2).filter(Number.isFinite),
    ),
    reference_embedding_ms_avg: referenceIndex.embedding_ms_avg,
    reference_embedding_ms_max: referenceIndex.embedding_ms_max,
    query_embedding_ms_avg: average(queryTimings),
    query_embedding_ms_max: maxOrNull(queryTimings),
    vector_search_ms_avg: average(vectorTimings),
    vector_search_ms_max: maxOrNull(vectorTimings),
    top_n_returned: topN,
    top5_before_lock_behavior: top5 === 5
      ? `${evaluated.filter((result) => result.evaluation.correct_in_top5).length}/${evaluated.length} labeled queries had expected card in Top-5`
      : `top_n_below_5:${topN}`,
    lock_success_rate: 'not_run_in_this_backend_candidate_funnel',
    live_device_validation: 'not_run',
    failure_cases: matchResults
      .filter((result) => result.evaluation.evaluated && !result.evaluation.correct_in_top5)
      .slice(0, 10)
      .map((result) => ({
        query: result.query,
        expected_card_id: result.expected_card_id,
        expected_label: result.expected_label,
        expected_rank: result.evaluation.expected_rank,
        top1_card_id: result.candidates[0]?.card_id ?? null,
        top1_name: result.candidates[0]?.name ?? null,
        top1_distance: result.candidates[0]?.distance ?? null,
      })),
    examples: matchResults.slice(0, 5).map((result) => ({
      query: result.query,
      expected_card_id: result.expected_card_id,
      expected_label: result.expected_label,
      expected_rank: result.evaluation.expected_rank,
      top_candidates: result.candidates.slice(0, 5).map((candidate) => ({
        card_id: candidate.card_id,
        name: candidate.name,
        set_code: candidate.set_code,
        number: candidate.number,
        distance: candidate.distance,
      })),
    })),
    mock_candidates_are_real_identity: false,
    note: 'This V5 harness uses real local CLIP image embeddings and exact cosine search over the reference set. It does not make a final identity decision.',
    generated_at: new Date().toISOString(),
  };
}

function evaluateCandidates(expectedCardId, candidates) {
  if (!expectedCardId) {
    return {
      evaluated: false,
      reason: 'missing_expected_card_id',
      expected_rank: null,
      correct_top1: false,
      correct_in_top5: false,
      correct_in_top20: false,
      distance_gap_top1_top2: distanceGap(candidates),
    };
  }

  const rankIndex = candidates.findIndex((candidate) => candidate.card_id === expectedCardId);
  return {
    evaluated: true,
    expected_rank: rankIndex >= 0 ? rankIndex + 1 : null,
    correct_top1: rankIndex === 0,
    correct_in_top5: rankIndex >= 0 && rankIndex < 5,
    correct_in_top20: rankIndex >= 0 && rankIndex < 20,
    distance_gap_top1_top2: distanceGap(candidates),
  };
}

function distanceGap(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 2) return null;
  return round6(candidates[1].distance - candidates[0].distance);
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

function accuracy(results, predicate) {
  if (results.length === 0) return null;
  return round6(results.filter(predicate).length / results.length);
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

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
