import '../env.mjs';

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  EMBEDDING_INDEX_V1,
  buildMultiViewEmbeddingIndex,
} from './lib/embedding_index_v1.mjs';
import {
  SCANNER_V3_REFERENCE_VIEWS_V1,
  generateScannerV3ReferenceViews,
} from './lib/scanner_v3_reference_views_v1.mjs';

const DEFAULT_BASE_INDEX = '.tmp/scanner_v3_embedding_index_v7.json';
const DEFAULT_OUT = '.tmp/scanner_v3_embedding_index_v7_plus_targets_v1.json';
const DEFAULT_CACHE_DIR = '.tmp/scanner_v3_identity_index_builder_v1/reference_cache';
const DEFAULT_REPORT = '.tmp/scanner_v3_identity_index_builder_v1/build_report_v1.json';
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;

function parseArgs(argv) {
  const args = {
    names: [],
    cardIds: [],
    setCodes: [],
    baseIndex: process.env.SCANNER_V3_IDENTITY_BASE_INDEX || DEFAULT_BASE_INDEX,
    out: process.env.SCANNER_V3_IDENTITY_INDEX_OUT || DEFAULT_OUT,
    cacheDir: process.env.SCANNER_V3_IDENTITY_REFERENCE_CACHE_DIR || DEFAULT_CACHE_DIR,
    report: process.env.SCANNER_V3_IDENTITY_INDEX_REPORT || DEFAULT_REPORT,
    downloadTimeoutMs: positiveInt(
      process.env.SCANNER_V3_IDENTITY_DOWNLOAD_TIMEOUT_MS,
      DEFAULT_DOWNLOAD_TIMEOUT_MS,
    ),
    model: process.env.SCANNER_V3_IDENTITY_MODEL || EMBEDDING_INDEX_V1.model,
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

    if (name === '--names') {
      args.names = parseList(nextValue());
    } else if (name === '--card-ids') {
      args.cardIds = parseList(nextValue());
    } else if (name === '--set-codes') {
      args.setCodes = parseList(nextValue());
    } else if (name === '--base-index') {
      args.baseIndex = nextValue() || DEFAULT_BASE_INDEX;
    } else if (name === '--out') {
      args.out = nextValue() || DEFAULT_OUT;
    } else if (name === '--cache-dir') {
      args.cacheDir = nextValue() || DEFAULT_CACHE_DIR;
    } else if (name === '--report') {
      args.report = nextValue() || DEFAULT_REPORT;
    } else if (name === '--download-timeout-ms') {
      args.downloadTimeoutMs = positiveInt(nextValue(), DEFAULT_DOWNLOAD_TIMEOUT_MS);
    } else if (name === '--model') {
      args.model = nextValue() || EMBEDDING_INDEX_V1.model;
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/build_scanner_v3_identity_index_v1.mjs --card-ids <uuid,...> [--base-index <file>] [--out <file>]',
    '  node backend/identity_v3/build_scanner_v3_identity_index_v1.mjs --names Diggersby,Salandit [--base-index <file>] [--out <file>]',
    '  node backend/identity_v3/build_scanner_v3_identity_index_v1.mjs --set-codes me01,me02,me02.5,me03 [--base-index <file>] [--out <file>]',
    '',
    'Purpose:',
    '  Builds local Scanner V3 embedding references from existing catalog image_url or representative_image_url rows.',
    '  This is an offline index artifact builder. It does not write Supabase and does not change runtime identity gates.',
    '',
    'Defaults:',
    `  --base-index ${DEFAULT_BASE_INDEX}`,
    `  --out ${DEFAULT_OUT}`,
    `  --cache-dir ${DEFAULT_CACHE_DIR}`,
    `  --report ${DEFAULT_REPORT}`,
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args.names.length === 0 && args.cardIds.length === 0 && args.setCodes.length === 0) {
    throw new Error('scanner_v3_identity_index_targets_required');
  }

  const baseIndexPath = path.resolve(args.baseIndex);
  const outputPath = path.resolve(args.out);
  const cacheDir = path.resolve(args.cacheDir);
  const reportPath = path.resolve(args.report);
  await Promise.all([
    ensureDir(path.dirname(outputPath)),
    ensureDir(cacheDir),
    ensureDir(path.dirname(reportPath)),
  ]);

  const baseIndex = await readIndex(baseIndexPath);
  const targetPlan = await loadTargetEntries({
    names: args.names,
    cardIds: args.cardIds,
    setCodes: args.setCodes,
    cacheDir,
    timeoutMs: args.downloadTimeoutMs,
  });
  if (targetPlan.entry_count === 0) {
    throw new Error('scanner_v3_identity_index_no_target_entries');
  }

  const skippedReferences = [];
  const targetIndex = await buildMultiViewEmbeddingIndex(targetPlan.entries, {
    model: args.model,
    viewGenerator: generateScannerV3ReferenceViews,
    onSkip: (skip) => {
      skippedReferences.push({
        card_id: skip.entry?.card_id ?? null,
        name: skip.entry?.name ?? null,
        set_code: skip.entry?.set_code ?? null,
        number: skip.entry?.number ?? null,
        reason: skip.reason,
      });
    },
    onProgress: ({ index, total, row }) => {
      console.log(JSON.stringify({
        event: 'scanner_v3_identity_reference_embedded',
        index,
        total,
        card_id: row.card_id,
        name: row.name,
        set_code: row.set_code,
        number: row.number,
        view_count: row.views.length,
      }));
    },
  });

  const mergedIndex = mergeIndexes({
    baseIndex,
    targetIndex,
    args,
    baseIndexPath,
    outputPath,
    targetPlan,
    skippedReferences,
  });
  await writeJson(outputPath, mergedIndex);

  const report = buildReport({
    args,
    baseIndexPath,
    outputPath,
    baseIndex,
    targetPlan,
    targetIndex,
    skippedReferences,
    mergedIndex,
  });
  await writeJson(reportPath, report);

  console.log(JSON.stringify({
    event: 'scanner_v3_identity_index_built',
    output_path: outputPath,
    report_path: reportPath,
    base_reference_count: baseIndex.references.length,
    target_reference_count: targetIndex.references.length,
    merged_reference_count: mergedIndex.reference_count,
    merged_reference_view_count: mergedIndex.reference_view_count,
    skipped_download_count: targetPlan.skipped.length,
    skipped_reference_count: skippedReferences.length,
  }, null, 2));
}

async function loadTargetEntries({ names, cardIds, setCodes, cacheDir, timeoutMs }) {
  const supabase = createBackendClient();
  const rows = dedupeRowsById([
    ...await queryRowsByIds(supabase, cardIds),
    ...await queryRowsByNames(supabase, names),
    ...await queryRowsBySetCodes(supabase, setCodes),
  ]);
  const entries = [];
  const skipped = [];

  for (const row of rows) {
    const imageUrl = normalizeUrl(row.image_url) ?? normalizeUrl(row.representative_image_url);
    const imageUrlField = normalizeUrl(row.image_url) ? 'image_url' : 'representative_image_url';
    if (!imageUrl) {
      skipped.push({
        card_print_id: row.id,
        name: row.name ?? null,
        set_code: row.set_code ?? null,
        number: row.number ?? null,
        reason: 'missing_catalog_image_url',
      });
      continue;
    }

    try {
      const localImagePath = await downloadReferenceImage({
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
        image_url_field: imageUrlField,
        image_source: row.image_source ?? null,
        image_status: row.image_status ?? null,
        image_note: row.image_note ?? null,
        full_image_path: localImagePath,
        image_path: localImagePath,
      });
    } catch (error) {
      skipped.push({
        card_print_id: row.id,
        name: row.name ?? null,
        set_code: row.set_code ?? null,
        number: row.number ?? null,
        image_url: imageUrl,
        reason: error?.message || String(error),
      });
    }
  }

  return {
    requested: {
      names,
      card_ids: cardIds,
      set_codes: setCodes,
    },
    source_policy: {
      allowed_source: 'existing Grookai catalog card_prints image_url or representative_image_url',
      label_authority: 'card_prints.id / gv_id from catalog row',
      writes_supabase: false,
      runtime_identity_authority: false,
    },
    row_count: rows.length,
    entry_count: entries.length,
    entries,
    skipped,
  };
}

async function queryRowsByIds(supabase, cardIds) {
  if (cardIds.length === 0) return [];
  const { data, error } = await supabase
    .from('card_prints')
    .select(targetSelect())
    .in('id', cardIds)
    .order('name', { ascending: true })
    .order('set_code', { ascending: true })
    .order('number', { ascending: true });
  if (error) throw new Error(`scanner_v3_identity_target_id_query_failed:${error.message}`);
  return data ?? [];
}

async function queryRowsByNames(supabase, names) {
  if (names.length === 0) return [];
  const { data, error } = await supabase
    .from('card_prints')
    .select(targetSelect())
    .in('name', names)
    .order('name', { ascending: true })
    .order('set_code', { ascending: true })
    .order('number', { ascending: true });
  if (error) throw new Error(`scanner_v3_identity_target_name_query_failed:${error.message}`);
  return data ?? [];
}

async function queryRowsBySetCodes(supabase, setCodes) {
  if (setCodes.length === 0) return [];
  const { data, error } = await supabase
    .from('card_prints')
    .select(targetSelect())
    .in('set_code', setCodes)
    .order('set_code', { ascending: true })
    .order('number', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(`scanner_v3_identity_target_set_code_query_failed:${error.message}`);
  return data ?? [];
}

function targetSelect() {
  return [
    'id',
    'gv_id',
    'name',
    'number',
    'set_code',
    'variant_key',
    'image_url',
    'representative_image_url',
    'image_source',
    'image_status',
    'image_note',
  ].join(', ');
}

function mergeIndexes({
  baseIndex,
  targetIndex,
  args,
  baseIndexPath,
  outputPath,
  targetPlan,
  skippedReferences,
}) {
  const references = [];
  const indexByCardId = new Map();

  for (const reference of baseIndex.references) {
    const cardId = String(reference.card_id ?? reference.id ?? '').trim();
    if (!cardId) continue;
    indexByCardId.set(cardId, references.length);
    references.push(reference);
  }

  const replacedCardIds = [];
  const addedCardIds = [];
  for (const reference of targetIndex.references) {
    const cardId = String(reference.card_id ?? reference.id ?? '').trim();
    if (!cardId) continue;
    if (indexByCardId.has(cardId)) {
      references[indexByCardId.get(cardId)] = reference;
      replacedCardIds.push(cardId);
    } else {
      indexByCardId.set(cardId, references.length);
      references.push(reference);
      addedCardIds.push(cardId);
    }
  }

  const referenceViewCount = references.reduce(
    (sum, reference) => sum + countReferenceViews(reference),
    0,
  );
  const targetReferences = targetIndex.references.map((reference) => ({
    card_id: reference.card_id,
    gv_id: reference.gv_id ?? null,
    name: reference.name ?? null,
    set_code: reference.set_code ?? null,
    number: reference.number ?? null,
    variant_key: reference.variant_key ?? null,
    image_url: reference.image_url ?? null,
    view_count: countReferenceViews(reference),
    view_types: (reference.views ?? []).map((view) => view.view_type),
  }));

  return {
    version: `${EMBEDDING_INDEX_V1.name}_multiview_scanner_v3_target_merge_v1`,
    source: EMBEDDING_INDEX_V1.source,
    model: targetIndex.model ?? baseIndex.model ?? args.model,
    dimensions: targetIndex.dimensions ?? baseIndex.dimensions ?? EMBEDDING_INDEX_V1.dimensions,
    reference_count: references.length,
    reference_view_count: referenceViewCount,
    views_per_reference_avg: references.length === 0
      ? null
      : round6(referenceViewCount / references.length),
    embedding_ms_avg: targetIndex.embedding_ms_avg,
    embedding_ms_max: targetIndex.embedding_ms_max,
    builder: {
      name: 'scanner_v3_identity_index_builder_v1',
      generated_at: new Date().toISOString(),
      base_index_path: baseIndexPath,
      output_path: outputPath,
      reference_view_generator: SCANNER_V3_REFERENCE_VIEWS_V1.name,
      reference_view_types: SCANNER_V3_REFERENCE_VIEWS_V1.reference_view_types,
      requested_names: args.names,
      requested_card_ids: args.cardIds,
      requested_set_codes: args.setCodes,
      source_policy: targetPlan.source_policy,
      target_catalog_row_count: targetPlan.row_count,
      target_entry_count: targetPlan.entry_count,
      target_reference_count: targetIndex.reference_count,
      target_reference_view_count: targetIndex.reference_view_count,
      added_card_ids: addedCardIds,
      replaced_card_ids: replacedCardIds,
      skipped_download_count: targetPlan.skipped.length,
      skipped_reference_count: skippedReferences.length,
      target_references: targetReferences,
    },
    references,
  };
}

function buildReport({
  args,
  baseIndexPath,
  outputPath,
  baseIndex,
  targetPlan,
  targetIndex,
  skippedReferences,
  mergedIndex,
}) {
  return {
    generated_at: new Date().toISOString(),
    builder: 'scanner_v3_identity_index_builder_v1',
    base_index_path: baseIndexPath,
    output_path: outputPath,
    requested_names: args.names,
    requested_card_ids: args.cardIds,
    requested_set_codes: args.setCodes,
    reference_view_generator: SCANNER_V3_REFERENCE_VIEWS_V1,
    source_policy: targetPlan.source_policy,
    base_reference_count: baseIndex.references.length,
    base_reference_view_count: baseIndex.reference_view_count,
    target_catalog_row_count: targetPlan.row_count,
    target_entry_count: targetPlan.entry_count,
    target_reference_count: targetIndex.reference_count,
    target_reference_view_count: targetIndex.reference_view_count,
    merged_reference_count: mergedIndex.reference_count,
    merged_reference_view_count: mergedIndex.reference_view_count,
    target_rows: targetPlan.entries.map((entry) => ({
      card_id: entry.card_id,
      gv_id: entry.gv_id,
      name: entry.name,
      set_code: entry.set_code,
      number: entry.number,
      variant_key: entry.variant_key,
      image_url_field: entry.image_url_field,
      image_source: entry.image_source,
      image_status: entry.image_status,
      image_note: entry.image_note,
      local_image_path: entry.full_image_path,
    })),
    skipped_downloads: targetPlan.skipped,
    skipped_references: skippedReferences,
  };
}

async function readIndex(filePath) {
  const json = await readJson(filePath);
  const references = Array.isArray(json.references)
    ? json.references
    : Array.isArray(json)
      ? json
      : [];
  const referenceViewCount = references.reduce(
    (sum, reference) => sum + countReferenceViews(reference),
    0,
  );
  return {
    ...json,
    references,
    reference_count: references.length,
    reference_view_count: json.reference_view_count ?? referenceViewCount,
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
        'user-agent': 'grookai-scanner-v3-identity-index-builder-v1/1.0',
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

function dedupeRowsById(rows) {
  const byId = new Map();
  for (const row of rows) {
    const id = String(row?.id ?? '').trim();
    if (!id) continue;
    byId.set(id, row);
  }
  return [...byId.values()];
}

function safeBasename(value) {
  return String(value || 'item')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'item';
}

function countReferenceViews(reference) {
  if (Array.isArray(reference.views)) return reference.views.length;
  if (Array.isArray(reference.embedding)) return 1;
  return 0;
}

function parseList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeUrl(value) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null') return null;
  return text;
}

function imageExtensionFromUrl(url) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  } catch {
    const ext = path.extname(String(url)).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  }
  return '.jpg';
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function round6(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
