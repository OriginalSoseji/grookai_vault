import '../env.mjs';

import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  EMBEDDING_INDEX_V1,
  buildMultiViewEmbeddingIndex,
} from './lib/embedding_index_v1.mjs';
import {
  SCANNER_V3_REFERENCE_VIEWS_V1,
  generateScannerV3ReferenceViews,
} from './lib/scanner_v3_reference_views_v1.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_OUT = path.join(
  REPO_ROOT,
  '.tmp/scanner_v3_full_db_identity_index_v1/scanner_v3_full_db_embedding_index_v1.json',
);
const DEFAULT_REPORT = path.join(
  REPO_ROOT,
  '.tmp/scanner_v3_full_db_identity_index_v1/build_report_v1.json',
);
const DEFAULT_CACHE_DIR = path.join(
  REPO_ROOT,
  '.tmp/scanner_v3_full_db_identity_index_v1/reference_cache',
);
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_STORAGE_BUCKET = 'user-card-images';
const DEFAULT_SIGNED_URL_TTL_SEC = 600;
const INCLUDED_SAMPLE_SIZE = 20;

function parseArgs(argv) {
  const args = {
    buildIndex: false,
    limit: positiveIntOrNull(process.env.SCANNER_V3_FULL_DB_LIMIT),
    offset: positiveInt(process.env.SCANNER_V3_FULL_DB_OFFSET, 0),
    out: process.env.SCANNER_V3_FULL_DB_INDEX_OUT || DEFAULT_OUT,
    report: process.env.SCANNER_V3_FULL_DB_REPORT || DEFAULT_REPORT,
    cacheDir: process.env.SCANNER_V3_FULL_DB_REFERENCE_CACHE_DIR || DEFAULT_CACHE_DIR,
    downloadTimeoutMs: positiveInt(
      process.env.SCANNER_V3_FULL_DB_DOWNLOAD_TIMEOUT_MS,
      DEFAULT_DOWNLOAD_TIMEOUT_MS,
    ),
    pageSize: positiveInt(process.env.SCANNER_V3_FULL_DB_PAGE_SIZE, DEFAULT_PAGE_SIZE),
    model: process.env.SCANNER_V3_IDENTITY_MODEL || EMBEDDING_INDEX_V1.model,
    storageBucket: process.env.SCANNER_V3_FULL_DB_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET,
    signedUrlTtlSec: positiveInt(
      process.env.SCANNER_V3_FULL_DB_SIGNED_URL_TTL_SEC,
      DEFAULT_SIGNED_URL_TTL_SEC,
    ),
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

    if (name === '--build-index') {
      args.buildIndex = true;
    } else if (name === '--coverage-only') {
      args.buildIndex = false;
    } else if (name === '--limit') {
      args.limit = positiveIntOrNull(nextValue());
    } else if (name === '--offset') {
      args.offset = positiveInt(nextValue(), 0);
    } else if (name === '--out') {
      args.out = nextValue() || DEFAULT_OUT;
    } else if (name === '--report') {
      args.report = nextValue() || DEFAULT_REPORT;
    } else if (name === '--cache-dir') {
      args.cacheDir = nextValue() || DEFAULT_CACHE_DIR;
    } else if (name === '--download-timeout-ms') {
      args.downloadTimeoutMs = positiveInt(nextValue(), DEFAULT_DOWNLOAD_TIMEOUT_MS);
    } else if (name === '--page-size') {
      args.pageSize = positiveInt(nextValue(), DEFAULT_PAGE_SIZE);
    } else if (name === '--model') {
      args.model = nextValue() || EMBEDDING_INDEX_V1.model;
    } else if (name === '--storage-bucket') {
      args.storageBucket = nextValue() || DEFAULT_STORAGE_BUCKET;
    } else if (name === '--signed-url-ttl-sec') {
      args.signedUrlTtlSec = positiveInt(nextValue(), DEFAULT_SIGNED_URL_TTL_SEC);
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/build_scanner_v3_full_db_identity_index_v1.mjs --coverage-only',
    '  node backend/identity_v3/build_scanner_v3_full_db_identity_index_v1.mjs --build-index --limit 20',
    '  node backend/identity_v3/build_scanner_v3_full_db_identity_index_v1.mjs --build-index',
    '',
    'Purpose:',
    '  Builds a read-only Scanner V3 full-DB identity index from live Supabase card_prints.',
    '  Bare execution is coverage-only. Embedding work requires --build-index.',
    '  The script writes local artifacts only and does not mutate Supabase.',
    '',
    'Defaults:',
    `  --out ${DEFAULT_OUT}`,
    `  --report ${DEFAULT_REPORT}`,
    `  --cache-dir ${DEFAULT_CACHE_DIR}`,
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const startedAt = performance.now();
  const outputPath = path.resolve(args.out);
  const reportPath = path.resolve(args.report);
  const cacheDir = path.resolve(args.cacheDir);
  await Promise.all([
    ensureDir(path.dirname(outputPath)),
    ensureDir(path.dirname(reportPath)),
    ensureDir(cacheDir),
  ]);

  const supabase = createBackendClient();
  const rows = await loadCardPrintRows(supabase, args);
  const plan = buildCoveragePlan(rows);
  const buildRows = selectBuildRows(plan.eligible_rows, args);
  const skippedDownloads = [];
  const skippedReferences = [];
  let index = null;
  let indexArtifact = null;

  if (args.buildIndex) {
    const entries = await materializeBuildEntries({
      supabase,
      rows: buildRows,
      args,
      cacheDir,
      skippedDownloads,
    });

    if (entries.length === 0) {
      throw new Error('scanner_v3_full_db_identity_index_no_entries');
    }

    const builtIndex = await buildMultiViewEmbeddingIndex(entries, {
      model: args.model,
      viewGenerator: generateScannerV3ReferenceViews,
      onSkip: (skip) => {
        skippedReferences.push({
          card_id: skip.entry?.card_id ?? null,
          name: skip.entry?.name ?? null,
          set_code: skip.entry?.set_code ?? null,
          number: skip.entry?.number ?? null,
          image_url_field: skip.entry?.image_url_field ?? null,
          reason: skip.reason,
        });
      },
      onProgress: ({ index: current, total, row }) => {
        console.log(JSON.stringify({
          event: 'scanner_v3_full_db_reference_embedded',
          index: current,
          total,
          card_id: row.card_id,
          name: row.name,
          set_code: row.set_code,
          number: row.number,
          view_count: row.views.length,
        }));
      },
    });

    index = buildOutputIndex({
      builtIndex,
      args,
      outputPath,
      reportPath,
      plan,
      buildRows,
      skippedDownloads,
      skippedReferences,
    });
    await writeIndexJson(outputPath, index);
    indexArtifact = await fileArtifact(outputPath);
  }

  const report = buildReport({
    args,
    outputPath,
    reportPath,
    plan,
    buildRows,
    skippedDownloads,
    skippedReferences,
    index,
    indexArtifact,
    elapsedMs: roundMs(performance.now() - startedAt),
  });
  await writeJson(reportPath, report);

  console.log(JSON.stringify({
    event: args.buildIndex
      ? 'scanner_v3_full_db_identity_index_built'
      : 'scanner_v3_full_db_identity_coverage_reported',
    output_path: args.buildIndex ? outputPath : null,
    report_path: reportPath,
    total_card_print_rows: plan.coverage.total_rows,
    eligible_reference_rows: plan.coverage.eligible_count,
    excluded_reference_rows: plan.coverage.excluded_count,
    build_reference_count: index?.reference_count ?? 0,
    build_reference_view_count: index?.reference_view_count ?? 0,
    build_pal_sv02_reference_count: index ? palSv02CountFromReferences(index.references) : 0,
    output_sha256: indexArtifact?.sha256 ?? null,
    skipped_download_count: skippedDownloads.length,
    skipped_reference_count: skippedReferences.length,
    elapsed_ms: report.elapsed_ms,
  }, null, 2));
}

async function loadCardPrintRows(supabase, args) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('card_prints')
      .select(cardPrintSelect())
      .order('id', { ascending: true })
      .range(from, from + args.pageSize - 1);
    if (error) {
      throw new Error(`scanner_v3_full_db_card_prints_query_failed:${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < args.pageSize) break;
    from += args.pageSize;
  }
  return rows;
}

function cardPrintSelect() {
  return [
    'id',
    'gv_id',
    'name',
    'number',
    'number_plain',
    'set_code',
    'variant_key',
    'image_source',
    'image_status',
    'image_note',
    'image_url',
    'image_alt_url',
    'representative_image_url',
    'image_path',
    'print_identity_key',
    'created_at',
    'updated_at',
    'last_synced_at',
    'image_last_checked_at',
  ].join(', ');
}

function buildCoveragePlan(rows) {
  const eligibleRows = [];
  const excludedRows = [];
  const imageFieldCounts = {
    image_path: 0,
    image_url: 0,
    image_alt_url: 0,
    representative_image_url: 0,
  };
  const imageStatusCounts = {};
  const imageSourceCounts = {};
  const metadataGaps = {
    missing_name: 0,
    missing_set_code: 0,
    missing_number: 0,
    missing_gv_id: 0,
    missing_print_identity_key: 0,
  };
  const setCodes = new Set();

  for (const row of rows) {
    if (hasText(row.image_path)) imageFieldCounts.image_path += 1;
    if (hasText(row.image_url)) imageFieldCounts.image_url += 1;
    if (hasText(row.image_alt_url)) imageFieldCounts.image_alt_url += 1;
    if (hasText(row.representative_image_url)) imageFieldCounts.representative_image_url += 1;

    const imageStatus = textOrKey(row.image_status);
    const imageSource = textOrKey(row.image_source);
    imageStatusCounts[imageStatus] = (imageStatusCounts[imageStatus] ?? 0) + 1;
    imageSourceCounts[imageSource] = (imageSourceCounts[imageSource] ?? 0) + 1;

    if (!hasText(row.name)) metadataGaps.missing_name += 1;
    if (!hasText(row.set_code)) metadataGaps.missing_set_code += 1;
    if (!hasText(row.number)) metadataGaps.missing_number += 1;
    if (!hasText(row.gv_id)) metadataGaps.missing_gv_id += 1;
    if (!hasText(row.print_identity_key)) metadataGaps.missing_print_identity_key += 1;
    if (hasText(row.set_code)) setCodes.add(String(row.set_code).trim());

    const sources = resolveReferenceSources(row);
    if (sources.length === 0) {
      excludedRows.push(summarizeRow(row, 'missing_usable_image_source'));
      continue;
    }

    eligibleRows.push({
      row,
      reference_source: sources[0],
      reference_sources: sources,
    });
  }

  const coverage = {
    total_rows: rows.length,
    eligible_count: eligibleRows.length,
    excluded_count: excludedRows.length,
    excluded_reasons: countBy(excludedRows, (row) => row.reason),
    image_field_counts: imageFieldCounts,
    image_status_counts: imageStatusCounts,
    image_source_counts: imageSourceCounts,
    metadata_gaps: metadataGaps,
    distinct_set_code_count: setCodes.size,
    reference_source_counts: countBy(eligibleRows, (entry) => entry.reference_source.field),
    representative_reference_count: eligibleRows.filter(
      (entry) => entry.reference_source.image_is_representative,
    ).length,
    eligible_set_code_counts: countBy(eligibleRows, (entry) => setCodeKey(entry.row.set_code)),
    eligible_pal_sv02_count: eligibleRows.filter((entry) => isPalSv02(entry.row)).length,
    source_timestamps: sourceTimestampSummary(rows),
  };

  return {
    coverage,
    eligible_rows: eligibleRows,
    excluded_rows: excludedRows,
  };
}

function resolveReferenceSources(row) {
  const imageSource = normalizeText(row.image_source);
  const imageStatus = normalizeText(row.image_status);
  const sources = [];
  if (imageSource === 'identity' && hasText(row.image_path)) {
    sources.push({
      field: 'image_path',
      url: null,
      storage_path: normalizeText(row.image_path),
      image_kind: 'identity_path',
      image_is_representative: false,
      image_status: imageStatus,
    });
  }
  if (hasText(row.image_url)) {
    sources.push({
      field: 'image_url',
      url: normalizeText(row.image_url),
      storage_path: null,
      image_kind: isRepresentativeStatus(imageStatus) ? 'representative_url' : 'exact_url',
      image_is_representative: isRepresentativeStatus(imageStatus),
      image_status: imageStatus,
    });
  }
  if (hasText(row.image_alt_url)) {
    sources.push({
      field: 'image_alt_url',
      url: normalizeText(row.image_alt_url),
      storage_path: null,
      image_kind: 'alternate_url',
      image_is_representative: isRepresentativeStatus(imageStatus),
      image_status: imageStatus,
    });
  }
  if (hasText(row.representative_image_url)) {
    sources.push({
      field: 'representative_image_url',
      url: normalizeText(row.representative_image_url),
      storage_path: null,
      image_kind: 'representative_url',
      image_is_representative: true,
      image_status: imageStatus,
    });
  }
  return sources;
}

function selectBuildRows(eligibleRows, args) {
  const start = Math.min(args.offset, eligibleRows.length);
  const end = args.limit === null ? eligibleRows.length : Math.min(eligibleRows.length, start + args.limit);
  return eligibleRows.slice(start, end);
}

async function materializeBuildEntries({
  supabase,
  rows,
  args,
  cacheDir,
  skippedDownloads,
}) {
  const entries = [];
  for (let index = 0; index < rows.length; index += 1) {
    const { row, reference_sources: referenceSources } = rows[index];
    try {
      const materialized = await downloadReferenceImageWithFallback({
        supabase,
        referenceSources,
        cacheDir,
        cardId: row.id,
        storageBucket: args.storageBucket,
        signedUrlTtlSec: args.signedUrlTtlSec,
        timeoutMs: args.downloadTimeoutMs,
      });
      const referenceSource = materialized.referenceSource;
      entries.push({
        card_id: row.id,
        gv_id: row.gv_id ?? null,
        name: row.name ?? null,
        set_code: row.set_code ?? null,
        number: row.number ?? null,
        number_plain: row.number_plain ?? null,
        variant_key: row.variant_key ?? null,
        print_identity_key: row.print_identity_key ?? null,
        image_url: referenceSource.url ?? storageUrlLabel(args.storageBucket, referenceSource.storage_path),
        image_url_field: referenceSource.field,
        image_source: row.image_source ?? null,
        image_status: row.image_status ?? null,
        image_note: row.image_note ?? null,
        image_kind: referenceSource.image_kind,
        image_is_representative: referenceSource.image_is_representative,
        download_attempts: materialized.attempts,
        full_image_path: materialized.localImagePath,
        image_path: materialized.localImagePath,
      });
      console.log(JSON.stringify({
        event: 'scanner_v3_full_db_reference_downloaded',
        index: index + 1,
        total: rows.length,
        card_id: row.id,
        image_url_field: referenceSource.field,
      }));
    } catch (error) {
      skippedDownloads.push({
        card_id: row.id,
        gv_id: row.gv_id ?? null,
        name: row.name ?? null,
        set_code: row.set_code ?? null,
        number: row.number ?? null,
        image_url_fields: referenceSources.map((source) => source.field),
        reason: error?.message || String(error),
      });
    }
  }
  return entries;
}

async function downloadReferenceImageWithFallback({
  supabase,
  referenceSources,
  cacheDir,
  cardId,
  storageBucket,
  signedUrlTtlSec,
  timeoutMs,
}) {
  const attempts = [];
  for (const referenceSource of referenceSources) {
    try {
      const localImagePath = await downloadReferenceImage({
        supabase,
        referenceSource,
        cacheDir,
        cardId,
        storageBucket,
        signedUrlTtlSec,
        timeoutMs,
      });
      attempts.push({
        image_url_field: referenceSource.field,
        ok: true,
      });
      return {
        localImagePath,
        referenceSource,
        attempts,
      };
    } catch (error) {
      attempts.push({
        image_url_field: referenceSource.field,
        ok: false,
        reason: error?.message || String(error),
      });
    }
  }

  throw new Error(
    `all_reference_downloads_failed:${
      attempts.map((attempt) => `${attempt.image_url_field}=${attempt.reason}`).join(';')
    }`,
  );
}

async function downloadReferenceImage({
  supabase,
  referenceSource,
  cacheDir,
  cardId,
  storageBucket,
  signedUrlTtlSec,
  timeoutMs,
}) {
  const sourceLabel = referenceSource.url ?? storageUrlLabel(storageBucket, referenceSource.storage_path);
  const ext = imageExtensionFromSource(sourceLabel);
  const hash = sha1(sourceLabel).slice(0, 16);
  const filePath = path.join(
    cacheDir,
    `${safeBasename(cardId)}_${safeBasename(referenceSource.field)}_${hash}${ext}`,
  );
  if (await pathExists(filePath)) return filePath;

  const downloadUrl = await resolveDownloadUrl({
    supabase,
    referenceSource,
    storageBucket,
    signedUrlTtlSec,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(downloadUrl, {
      signal: controller.signal,
      headers: {
        'user-agent': 'grookai-scanner-v3-full-db-index-builder-v1/1.0',
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

async function resolveDownloadUrl({
  supabase,
  referenceSource,
  storageBucket,
  signedUrlTtlSec,
}) {
  if (referenceSource.field !== 'image_path') return referenceSource.url;
  if (!hasText(referenceSource.storage_path)) {
    throw new Error('missing_storage_image_path');
  }
  const { data, error } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(referenceSource.storage_path, signedUrlTtlSec);
  if (error) throw new Error(`storage_signed_url_failed:${error.message}`);
  if (!hasText(data?.signedUrl)) throw new Error('storage_signed_url_missing');
  return data.signedUrl;
}

function buildOutputIndex({
  builtIndex,
  args,
  outputPath,
  reportPath,
  plan,
  buildRows,
  skippedDownloads,
  skippedReferences,
}) {
  return {
    ...builtIndex,
    version: `${EMBEDDING_INDEX_V1.name}_multiview_scanner_v3_full_db_v1`,
    builder: {
      name: 'scanner_v3_full_db_identity_index_builder_v1',
      contract: 'SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1',
      generated_at: new Date().toISOString(),
      output_path: outputPath,
      report_path: reportPath,
      source_table: 'public.card_prints',
      writes_supabase: false,
      build_scope: buildScope(args, buildRows),
      reference_view_generator: SCANNER_V3_REFERENCE_VIEWS_V1.name,
      reference_view_types: SCANNER_V3_REFERENCE_VIEWS_V1.reference_view_types,
      model: args.model,
      coverage: plan.coverage,
      selected_build_set_code_counts: countBy(buildRows, (entry) => setCodeKey(entry.row.set_code)),
      selected_build_pal_sv02_count: buildRows.filter((entry) => isPalSv02(entry.row)).length,
      included_set_code_counts: countBy(builtIndex.references, (reference) => setCodeKey(reference.set_code)),
      included_pal_sv02_count: palSv02CountFromReferences(builtIndex.references),
      skipped_download_count: skippedDownloads.length,
      skipped_reference_count: skippedReferences.length,
    },
  };
}

function buildReport({
  args,
  outputPath,
  reportPath,
  plan,
  buildRows,
  skippedDownloads,
  skippedReferences,
  index,
  indexArtifact,
  elapsedMs,
}) {
  const includedSetCodeCounts = index
    ? countBy(index.references, (reference) => setCodeKey(reference.set_code))
    : {};
  return {
    generated_at: new Date().toISOString(),
    builder: 'scanner_v3_full_db_identity_index_builder_v1',
    contract: 'SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1',
    mode: args.buildIndex ? 'build_index' : 'coverage_only',
    source_policy: {
      source_table: 'public.card_prints',
      label_authority: 'card_prints.id / gv_id / printed metadata',
      writes_supabase: false,
      live_runtime_supabase_queries: false,
      image_priority: [
        'image_source=identity image_path',
        'image_url',
        'image_alt_url',
        'representative_image_url',
      ],
    },
    args: {
      build_index: args.buildIndex,
      limit: args.limit,
      offset: args.offset,
      out: outputPath,
      report: reportPath,
      cache_dir: path.resolve(args.cacheDir),
      page_size: args.pageSize,
      model: args.model,
      storage_bucket: args.storageBucket,
      signed_url_ttl_sec: args.signedUrlTtlSec,
      download_timeout_ms: args.downloadTimeoutMs,
    },
    coverage: plan.coverage,
    build_scope: buildScope(args, buildRows),
    index: index
      ? {
          output_path: outputPath,
          bytes: indexArtifact?.bytes ?? null,
          sha256: indexArtifact?.sha256 ?? null,
          version: index.version,
          model: index.model,
          reference_count: index.reference_count,
          reference_view_count: index.reference_view_count,
          views_per_reference_avg: index.views_per_reference_avg,
          embedding_ms_avg: index.embedding_ms_avg,
          embedding_ms_max: index.embedding_ms_max,
          included_set_code_counts: includedSetCodeCounts,
          included_pal_sv02_count: palSv02CountFromReferences(index.references),
        }
      : null,
    included_sample: plan.eligible_rows
      .slice(0, INCLUDED_SAMPLE_SIZE)
      .map((entry) => summarizeEligibleRow(entry)),
    excluded_rows: plan.excluded_rows,
    skipped_downloads: skippedDownloads,
    skipped_references: skippedReferences,
    elapsed_ms: elapsedMs,
  };
}

function buildScope(args, buildRows) {
  return {
    full_db_catalog_rows_loaded: true,
    build_index: args.buildIndex,
    offset: args.offset,
    limit: args.limit,
    selected_eligible_row_count: buildRows.length,
    full_build_requested: args.buildIndex && args.limit === null && args.offset === 0,
    selected_set_code_counts: countBy(buildRows, (entry) => setCodeKey(entry.row.set_code)),
    selected_pal_sv02_count: buildRows.filter((entry) => isPalSv02(entry.row)).length,
  };
}

function summarizeEligibleRow(entry) {
  const { row, reference_source: source, reference_sources: sources } = entry;
  return {
    card_id: row.id,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    set_code: row.set_code ?? null,
    number: row.number ?? null,
    variant_key: row.variant_key ?? null,
    image_url_field: source.field,
    image_kind: source.image_kind,
    image_is_representative: source.image_is_representative,
    fallback_image_url_fields: sources.map((candidate) => candidate.field),
    image_source: row.image_source ?? null,
    image_status: row.image_status ?? null,
  };
}

function summarizeRow(row, reason) {
  return {
    card_id: row.id ?? null,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    set_code: row.set_code ?? null,
    number: row.number ?? null,
    variant_key: row.variant_key ?? null,
    image_source: row.image_source ?? null,
    image_status: row.image_status ?? null,
    reason,
  };
}

function storageUrlLabel(bucket, storagePath) {
  return hasText(storagePath) ? `supabase-storage://${bucket}/${storagePath}` : null;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'null';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function setCodeKey(value) {
  return normalizeText(value)?.toLowerCase() ?? 'unknown';
}

function isPalSv02(row) {
  const setCode = setCodeKey(row?.set_code);
  const gvId = normalizeText(row?.gv_id)?.toUpperCase() ?? '';
  return setCode === 'sv02' || setCode === 'pal' || gvId.startsWith('GV-PK-PAL-');
}

function palSv02CountFromReferences(references) {
  return (references ?? []).filter((reference) => isPalSv02(reference)).length;
}

function sourceTimestampSummary(rows) {
  return {
    max_created_at: maxIsoTimestamp(rows.map((row) => row.created_at)),
    max_updated_at: maxIsoTimestamp(rows.map((row) => row.updated_at)),
    max_last_synced_at: maxIsoTimestamp(rows.map((row) => row.last_synced_at)),
    max_image_last_checked_at: maxIsoTimestamp(rows.map((row) => row.image_last_checked_at)),
  };
}

function maxIsoTimestamp(values) {
  let max = null;
  for (const value of values) {
    const text = normalizeText(value);
    if (!text) continue;
    const time = Date.parse(text);
    if (!Number.isFinite(time)) continue;
    if (!max || time > max.time) max = { time, text };
  }
  return max?.text ?? null;
}

function hasText(value) {
  return normalizeText(value) !== null;
}

function normalizeText(value) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null') return null;
  return text;
}

function textOrKey(value) {
  return normalizeText(value) ?? 'null';
}

function isRepresentativeStatus(value) {
  return String(value ?? '').trim().toLowerCase().startsWith('representative_');
}

function safeBasename(value) {
  return String(value || 'item')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'item';
}

function imageExtensionFromSource(source) {
  const raw = String(source ?? '');
  try {
    const parsed = new URL(raw);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  } catch {
    const ext = path.extname(raw).toLowerCase();
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

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeIndexJson(filePath, index) {
  const stream = createWriteStream(filePath, { encoding: 'utf8' });
  const { references, ...metadata } = index;
  await writeChunk(stream, '{\n');
  const entries = Object.entries(metadata);
  for (let i = 0; i < entries.length; i += 1) {
    const [key, value] = entries[i];
    await writeChunk(
      stream,
      `  ${JSON.stringify(key)}: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')},\n`,
    );
  }
  await writeChunk(stream, '  "references": [\n');
  for (let i = 0; i < references.length; i += 1) {
    if (i > 0) await writeChunk(stream, ',\n');
    await writeChunk(stream, `    ${JSON.stringify(references[i])}`);
  }
  await writeChunk(stream, '\n  ]\n');
  await writeChunk(stream, '}\n');
  stream.end();
  await finished(stream);
}

async function writeChunk(stream, chunk) {
  if (stream.write(chunk)) return;
  await once(stream, 'drain');
}

async function fileArtifact(filePath) {
  const hash = createHash('sha256');
  let bytes = 0;
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => {
    bytes += chunk.length;
    hash.update(chunk);
  });
  await finished(stream);
  return {
    path: path.resolve(filePath),
    bytes,
    sha256: hash.digest('hex'),
  };
}

function sha1(value) {
  return createHash('sha1').update(String(value)).digest('hex');
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveIntOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
