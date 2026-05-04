import '../env.mjs';

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  extractArtworkRegionBuffer,
  isImagePath,
  safeBasename,
} from './lib/hash_index_v1.mjs';
import {
  PATCH_DESCRIPTOR_V1,
  computePatchDescriptorFromBuffer,
  computePatchDescriptorFromPath,
  rankPatchCandidates,
} from './lib/patch_descriptor_v1.mjs';

const DEFAULT_QUERY_DIR = '.tmp/scanner_v3_normalization_proof';
const DEFAULT_LABELS = '.tmp/embedding_test_images/results.json';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_identity_bridge_v3';
const DEFAULT_V2_SUMMARY = '.tmp/scanner_v3_identity_bridge_v2/summary.json';
const DEFAULT_TOP_N = 10;
const DEFAULT_REFERENCE_LIMIT = 180;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const args = {
    query: DEFAULT_QUERY_DIR,
    references: null,
    labels: DEFAULT_LABELS,
    out: DEFAULT_OUTPUT_DIR,
    v2Summary: DEFAULT_V2_SUMMARY,
    top: DEFAULT_TOP_N,
    referenceLimit: DEFAULT_REFERENCE_LIMIT,
    referenceSetCodes: [],
    referenceCardIds: [],
    downloadTimeoutMs: DEFAULT_DOWNLOAD_TIMEOUT_MS,
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
    } else if (name === '--v2-summary') {
      args.v2Summary = nextValue();
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
    '  node backend/identity_v3/run_identity_bridge_v3_patch_matching.mjs [--query <scanner_output>] [--references <folder_or_manifest>] [--out <folder>]',
    '',
    'Defaults:',
    `  --query ${DEFAULT_QUERY_DIR}`,
    `  --labels ${DEFAULT_LABELS}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --top ${DEFAULT_TOP_N}`,
    `  --reference-limit ${DEFAULT_REFERENCE_LIMIT}`,
    '',
    'This harness returns patch-based artwork candidates only. It does not make final identity decisions.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const outputDir = path.resolve(args.out);
  await ensureDir(outputDir);

  const labelIndex = await loadLabelIndex(args.labels);
  const queryDiscovery = await discoverScannerQueries(args.query, labelIndex);
  if (queryDiscovery.items.length === 0) {
    throw new Error(`identity_bridge_v3_no_scanner_queries:${path.resolve(args.query)}`);
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
    throw new Error('identity_bridge_v3_no_reference_entries');
  }

  const indexCachePath = path.join(outputDir, 'index_cache.json');
  const referenceFingerprint = await fingerprintReferenceEntries(referencePlan.entries);
  const descriptorIndex = await loadOrBuildPatchIndex({
    entries: referencePlan.entries,
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

  const v2Baseline = await loadV2Baseline(args.v2Summary);
  const matchResults = [];
  for (const query of queryDescriptors) {
    const topCandidates = rankPatchCandidates({
      query,
      references: descriptorIndex.references,
      topN: args.top,
    });
    const evaluation = evaluateCandidates(query.expected_card_id, topCandidates);
    const queryOutDir = path.join(outputDir, safeBasename(query.query_id));
    await ensureDir(queryOutDir);
    const v2Result = v2Baseline.byQuery.get(query.query_id) ?? null;

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
      descriptor_design: descriptorDesignSummary(),
      top_candidates: topCandidates,
      evaluation,
      v2_baseline: v2Result ? {
        correct_top1: v2Result.correct_top1,
        correct_in_top5: v2Result.correct_in_top5,
        correct_in_top10: v2Result.correct_in_top10,
        expected_rank: v2Result.expected_rank,
        top_candidate: v2Result.candidates?.[0] ?? null,
      } : null,
      final_identity_decision: false,
      proof_only: true,
    };

    await writeJson(path.join(queryOutDir, 'candidates.json'), result);
    matchResults.push(result);
  }

  const summary = buildSummary({
    outputDir,
    queryDiscovery,
    referencePlan,
    descriptorIndex,
    skippedQueries,
    matchResults,
    topN: args.top,
    v2Baseline,
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
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    try {
      references.push(await descriptorForReference(entry));
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
    cache_reused: false,
    reference_count: references.length,
    skipped_count: skipped.length,
    skipped,
    references,
  };
  await writeJson(cachePath, payload);
  return payload;
}

async function descriptorForReference(entry) {
  const cardId = normalizeId(entry.card_id ?? entry.id ?? entry.cardPrintId);
  if (!cardId) throw new Error('patch_reference_missing_card_id');
  const fullPath = entry.full_image_path ?? entry.image_path;
  if (!fullPath) throw new Error(`patch_reference_missing_image:${cardId}`);

  const artworkBuffer = entry.art_image_path
    ? await readFile(entry.art_image_path)
    : await extractArtworkRegionBuffer(await readFile(fullPath));
  const artworkDescriptor = await computePatchDescriptorFromBuffer(artworkBuffer);

  return {
    card_id: cardId,
    gv_id: entry.gv_id ?? null,
    name: entry.name ?? null,
    set_code: entry.set_code ?? null,
    number: entry.number ?? null,
    variant_key: entry.variant_key ?? null,
    image_url: entry.image_url ?? null,
    source_path: fullPath,
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
        art_image_path: row.art_image_path ? path.resolve(path.dirname(resolved), row.art_image_path) : null,
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
    const art = await firstExistingFileChoice(dir, [
      'artwork_region_color.png',
      'normalized_artwork_region.jpg',
      'artwork_region.jpg',
    ]);
    if (full || art) {
      entries.push({
        card_id: path.basename(dir) || `reference_${index + 1}`,
        name: path.basename(dir),
        full_image_path: full?.path ?? null,
        art_image_path: art?.path ?? null,
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
        'user-agent': 'grookai-identity-v3-patch-matching/1.0',
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
  queryDiscovery,
  referencePlan,
  descriptorIndex,
  skippedQueries,
  matchResults,
  topN,
  v2Baseline,
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
      const v2 = result.v2_baseline;
      if (!v2) return false;
      if (result.evaluation.correct_in_top5 && !v2.correct_in_top5) return true;
      if (Number.isFinite(result.evaluation.expected_rank) && Number.isFinite(v2.expected_rank)) {
        return result.evaluation.expected_rank < v2.expected_rank;
      }
      return false;
    })
    .map(compactResultForSummary);

  const regressions = evaluated
    .filter((result) => {
      const v2 = result.v2_baseline;
      if (!v2) return false;
      if (!result.evaluation.correct_in_top5 && v2.correct_in_top5) return true;
      if (Number.isFinite(result.evaluation.expected_rank) && Number.isFinite(v2.expected_rank)) {
        return result.evaluation.expected_rank > v2.expected_rank;
      }
      return false;
    })
    .map(compactResultForSummary);

  const v3AverageGap = average(gaps);
  const v2AverageGap = v2Baseline.summary?.average_top1_top2_score_gap ?? null;

  return {
    generated_at: new Date().toISOString(),
    harness: 'identity_bridge_v3_patch_matching',
    proof_only: true,
    final_identity_decision: false,
    descriptor_version: PATCH_DESCRIPTOR_V1.name,
    descriptor_design: descriptorDesignSummary(),
    query_input_dir: queryDiscovery.input_dir,
    labels_path: queryDiscovery.labels_path,
    reference_source: referencePlan.source,
    reference_input: referencePlan.input,
    output_dir: path.resolve(outputDir),
    top_n: topN,
    total_tests: queryDiscovery.items.length,
    evaluated_tests: evaluated.length,
    query_skipped_count: queryDiscovery.skipped.length + skippedQueries.length,
    reference_rows_seen: referencePlan.row_count ?? referencePlan.entries.length,
    reference_downloaded_count: referencePlan.entries.length,
    reference_index_count: descriptorIndex.reference_count,
    reference_index_cache_reused: Boolean(descriptorIndex.cache_reused),
    reference_skipped_count: (descriptorIndex.skipped?.length ?? 0) + (referencePlan.skipped_downloads?.length ?? 0),
    v2_baseline: v2Baseline.summary ? {
      top1_accuracy: v2Baseline.summary.v2_top1_accuracy,
      top5_accuracy: v2Baseline.summary.v2_top5_accuracy,
      top10_accuracy: v2Baseline.summary.v2_top10_accuracy,
      evaluated_tests: v2Baseline.summary.evaluated_tests,
      average_top1_top2_score_gap: v2Baseline.summary.average_top1_top2_score_gap,
      reference_index_count: v2Baseline.summary.reference_index_count,
    } : null,
    v3_top1_accuracy: evaluated.length > 0 ? round6(top1Correct / evaluated.length) : null,
    v3_top5_accuracy: evaluated.length > 0 ? round6(top5Correct / evaluated.length) : null,
    v3_top10_accuracy: evaluated.length > 0 ? round6(top10Correct / evaluated.length) : null,
    top1_correct_count: top1Correct,
    top5_correct_count: top5Correct,
    top10_correct_count: top10Correct,
    correct_card_rank_distribution: rankDistribution(evaluated),
    average_top1_top2_score_gap: v3AverageGap,
    score_separation_vs_v2: {
      v2_average_top1_top2_score_gap: v2AverageGap,
      v3_average_top1_top2_score_gap: v3AverageGap,
      gap_delta: Number.isFinite(v2AverageGap) && Number.isFinite(v3AverageGap)
        ? round6(v3AverageGap - v2AverageGap)
        : null,
      larger_gap_is_better_for_separation: true,
    },
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
    v2_baseline: result.v2_baseline,
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

async function loadV2Baseline(summaryPath) {
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
      expected_rank: expectedRankFromCandidates(example.expected_card_id, example.candidates ?? example.top_candidates),
      candidates: example.candidates ?? example.top_candidates ?? [],
    });
  }
  for (const improvement of summary.examples_where_v2_improved_over_v1 ?? []) {
    byQuery.set(improvement.query, {
      correct_top1: improvement.correct_top1,
      correct_in_top5: improvement.correct_in_top5,
      correct_in_top10: improvement.correct_in_top10,
      expected_rank: expectedRankFromCandidates(improvement.expected_card_id, improvement.candidates),
      candidates: improvement.candidates ?? [],
    });
  }
  for (const failure of summary.failure_cases ?? []) {
    if (!byQuery.has(failure.query)) {
      byQuery.set(failure.query, {
        correct_top1: false,
        correct_in_top5: false,
        correct_in_top10: false,
        expected_rank: expectedRankFromCandidates(failure.expected_card_id, failure.candidates),
        candidates: failure.candidates ?? [],
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

async function fingerprintReferenceEntries(entries) {
  const parts = [];
  for (const entry of entries) {
    const imagePath = entry.full_image_path ?? entry.image_path ?? entry.art_image_path ?? '';
    const imageStat = imagePath && await pathExists(imagePath) ? await stat(imagePath) : null;
    parts.push([
      entry.card_id ?? entry.id ?? '',
      entry.image_url ?? '',
      imagePath,
      imageStat?.size ?? 0,
      imageStat?.mtimeMs ?? 0,
    ].join('|'));
  }
  return `${PATCH_DESCRIPTOR_V1.name}:${parts.sort().join('::')}`;
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

function descriptorDesignSummary() {
  return {
    primary_signal: 'artwork_region_only',
    patch_grid: `${PATCH_DESCRIPTOR_V1.grid_width}x${PATCH_DESCRIPTOR_V1.grid_height}`,
    patch_descriptor: [
      `${PATCH_DESCRIPTOR_V1.color_histogram_length} bin RGB histogram`,
      'mean RGB',
      'simple luma gradient edge strength',
    ],
    patch_filtering: PATCH_DESCRIPTOR_V1.patch_quality,
    patch_score_weights: PATCH_DESCRIPTOR_V1.patch_score_weights,
    position_weighting: PATCH_DESCRIPTOR_V1.patch_position_weights,
    reference_artwork_crop: 'same deterministic card-relative crop used by V1/V2 reference fallback',
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
