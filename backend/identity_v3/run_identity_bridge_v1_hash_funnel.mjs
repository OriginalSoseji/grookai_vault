import '../env.mjs';

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  HASH_INDEX_V1,
  buildHashIndex,
  hashScannerQuery,
  isImagePath,
  rankHashCandidates,
  safeBasename,
} from './lib/hash_index_v1.mjs';

const DEFAULT_QUERY_DIR = '.tmp/scanner_v3_normalization_proof';
const DEFAULT_LABELS = '.tmp/embedding_test_images/results.json';
const DEFAULT_OUTPUT_DIR = '.tmp/scanner_v3_identity_bridge_v1';
const DEFAULT_TOP_N = 10;
const DEFAULT_REFERENCE_LIMIT = 180;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const args = {
    query: DEFAULT_QUERY_DIR,
    references: null,
    labels: DEFAULT_LABELS,
    out: DEFAULT_OUTPUT_DIR,
    top: DEFAULT_TOP_N,
    referenceLimit: DEFAULT_REFERENCE_LIMIT,
    referenceSetCodes: [],
    referenceCardIds: [],
    downloadTimeoutMs: DEFAULT_DOWNLOAD_TIMEOUT_MS,
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
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/run_identity_bridge_v1_hash_funnel.mjs [--query <scanner_output>] [--references <folder_or_manifest>] [--out <folder>]',
    '',
    'Defaults:',
    `  --query ${DEFAULT_QUERY_DIR}`,
    `  --labels ${DEFAULT_LABELS}`,
    `  --out ${DEFAULT_OUTPUT_DIR}`,
    `  --top ${DEFAULT_TOP_N}`,
    `  --reference-limit ${DEFAULT_REFERENCE_LIMIT}`,
    '',
    'If --references is omitted, the harness builds a read-only Supabase reference subset from labeled card ids and set codes.',
    'This harness returns candidates only. It does not make final identity decisions.',
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
    throw new Error(`identity_bridge_no_scanner_queries:${path.resolve(args.query)}`);
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
    throw new Error('identity_bridge_no_reference_entries');
  }

  const skippedReferences = [];
  const referenceIndex = await buildHashIndex(referencePlan.entries, {
    onSkip: (skip) => skippedReferences.push(skip),
  });

  if (referenceIndex.references.length === 0) {
    throw new Error('identity_bridge_reference_hash_index_empty');
  }

  const hashedQueries = [];
  const skippedQueries = [];
  for (const item of queryDiscovery.items) {
    try {
      hashedQueries.push(await hashScannerQuery(item));
    } catch (error) {
      skippedQueries.push({
        query_id: item.query_id,
        source_dir: item.source_dir,
        reason: error?.message || String(error),
      });
    }
  }

  const matchResults = [];
  for (const query of hashedQueries) {
    const candidates = rankHashCandidates({
      query,
      references: referenceIndex.references,
      topN: args.top,
      weights: HASH_INDEX_V1,
    });
    const evaluation = evaluateCandidates(query.expected_card_id, candidates);
    const queryOutDir = path.join(outputDir, safeBasename(query.query_id));
    await ensureDir(queryOutDir);

    const result = {
      query: query.query_id,
      source_name: query.source_name,
      source_dir: query.source_dir,
      expected_card_id: query.expected_card_id,
      expected_label: query.expected_label,
      normalized_full_card_path: query.normalized_full_card_path,
      artwork_region_path: query.artwork_region_path,
      hash_algorithm: HASH_INDEX_V1.hash_algorithm,
      weighted_distance: {
        full_weight: HASH_INDEX_V1.full_weight,
        artwork_weight: HASH_INDEX_V1.artwork_weight,
      },
      candidates,
      evaluation,
      final_identity_decision: false,
      proof_only: true,
    };
    await writeJson(path.join(queryOutDir, 'match.json'), result);
    matchResults.push(result);
  }

  const summary = buildSummary({
    outputDir,
    queryDiscovery,
    referencePlan,
    referenceIndex,
    skippedReferences,
    skippedQueries,
    matchResults,
    topN: args.top,
  });

  await writeJson(path.join(outputDir, 'reference_index.json'), {
    ...referenceIndex,
    references: referenceIndex.references.map((reference) => ({
      card_id: reference.card_id,
      gv_id: reference.gv_id,
      name: reference.name,
      set_code: reference.set_code,
      number: reference.number,
      variant_key: reference.variant_key,
      image_url: reference.image_url,
      source_path: reference.source_path,
      full_hash_hex: reference.full_hash.hex,
      art_hash_hex: reference.art_hash.hex,
    })),
  });
  await writeJson(path.join(outputDir, 'summary.json'), summary);

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
      'normalized_artwork_region.jpg',
      'artwork_region.jpg',
      'artwork_region.png',
    ]);

    if (!fullPath || !artPath) {
      skipped.push({
        source_dir: dir,
        reason: !fullPath ? 'missing_normalized_full_card' : 'missing_artwork_region',
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
  const directFull = await firstExistingFile(rootDir, [
    'normalized_full_card_color.png',
    'normalized_full_card.jpg',
  ]);
  if (directFull) return [rootDir];

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
    if (full) {
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
        'user-agent': 'grookai-identity-v3-hash-funnel/1.0',
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
  referenceIndex,
  skippedReferences,
  skippedQueries,
  matchResults,
  topN,
}) {
  const evaluated = matchResults.filter((result) => result.expected_card_id);
  const top1Correct = evaluated.filter((result) => result.evaluation.correct_top1).length;
  const top5Correct = evaluated.filter((result) => result.evaluation.correct_in_top5).length;
  const gaps = evaluated
    .map((result) => result.evaluation.distance_gap_top1_top2)
    .filter(Number.isFinite);

  return {
    generated_at: new Date().toISOString(),
    harness: 'identity_bridge_v1_hash_funnel',
    proof_only: true,
    final_identity_decision: false,
    query_input_dir: queryDiscovery.input_dir,
    labels_path: queryDiscovery.labels_path,
    reference_source: referencePlan.source,
    reference_input: referencePlan.input,
    output_dir: outputDir,
    hash_algorithm: HASH_INDEX_V1.hash_algorithm,
    weights: {
      full_weight: HASH_INDEX_V1.full_weight,
      artwork_weight: HASH_INDEX_V1.artwork_weight,
    },
    top_n: topN,
    total_tests: matchResults.length,
    evaluated_tests: evaluated.length,
    query_skipped_count: skippedQueries.length,
    reference_rows_seen: referencePlan.row_count ?? referencePlan.entries.length,
    reference_downloaded_count: referencePlan.entries.length,
    reference_index_count: referenceIndex.references.length,
    reference_skipped_count: skippedReferences.length + (referencePlan.skipped_downloads?.length ?? 0),
    top1_accuracy: evaluated.length ? round6(top1Correct / evaluated.length) : null,
    top5_accuracy: evaluated.length ? round6(top5Correct / evaluated.length) : null,
    top1_correct_count: top1Correct,
    top5_correct_count: top5Correct,
    average_distance_gap_top1_top2: average(gaps),
    failure_cases: evaluated
      .filter((result) => !result.evaluation.correct_in_top5)
      .map((result) => ({
        query: result.query,
        expected_card_id: result.expected_card_id,
        expected_label: result.expected_label,
        top_candidate: result.candidates[0] ?? null,
        candidates: result.candidates.slice(0, 5),
      })),
    examples: matchResults.slice(0, 5).map((result) => ({
      query: result.query,
      expected_card_id: result.expected_card_id,
      expected_label: result.expected_label,
      correct_top1: result.evaluation.correct_top1,
      correct_in_top5: result.evaluation.correct_in_top5,
      distance_gap_top1_top2: result.evaluation.distance_gap_top1_top2,
      candidates: result.candidates.slice(0, 5),
    })),
    skipped_queries: skippedQueries,
    skipped_reference_hashes: skippedReferences,
    skipped_reference_downloads: referencePlan.skipped_downloads ?? [],
  };
}

function evaluateCandidates(expectedCardId, candidates) {
  if (!expectedCardId) {
    return {
      evaluated: false,
      correct_top1: null,
      correct_in_top5: null,
      expected_rank: null,
      distance_gap_top1_top2: distanceGap(candidates),
    };
  }
  const rankIndex = candidates.findIndex((candidate) => candidate.card_id === expectedCardId);
  return {
    evaluated: true,
    correct_top1: rankIndex === 0,
    correct_in_top5: rankIndex >= 0 && rankIndex < 5,
    expected_rank: rankIndex >= 0 ? rankIndex + 1 : null,
    distance_gap_top1_top2: distanceGap(candidates),
  };
}

function distanceGap(candidates) {
  if (!Array.isArray(candidates) || candidates.length < 2) return null;
  return round6(candidates[1].distance - candidates[0].distance);
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

async function firstExistingFile(dir, names) {
  for (const name of names) {
    const filePath = path.join(dir, name);
    if (await pathExists(filePath)) return filePath;
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
