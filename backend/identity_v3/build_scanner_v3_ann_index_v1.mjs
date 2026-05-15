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
  embedImageBuffer,
} from './lib/embedding_index_v1.mjs';
import {
  SCANNER_V3_REFERENCE_VIEWS_V1,
  generateScannerV3ReferenceViews,
} from './lib/scanner_v3_reference_views_v1.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, '.tmp/scanner_v3_ann_index_v1/sample_v1');
const DEFAULT_CACHE_DIR = path.join(REPO_ROOT, '.tmp/scanner_v3_full_db_identity_index_v1/reference_cache');
const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_LIMIT = 40;
const DEFAULT_PAL_LIMIT = 40;
const DEFAULT_PLANE_COUNT = 14;
const DEFAULT_SEED = 7331;
const DEFAULT_STORAGE_BUCKET = 'user-card-images';
const DEFAULT_SIGNED_URL_TTL_SEC = 600;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;
const DEFAULT_PROGRESS_EVERY = 100;
const VECTOR_DTYPE = 'float32le';
const VECTOR_BYTES = EMBEDDING_INDEX_V1.dimensions * 4;

function parseArgs(argv) {
  const args = {
    outDir: process.env.SCANNER_V3_ANN_OUT_DIR || DEFAULT_OUT_DIR,
    cacheDir: process.env.SCANNER_V3_ANN_REFERENCE_CACHE_DIR || DEFAULT_CACHE_DIR,
    full: isTruthy(process.env.SCANNER_V3_ANN_FULL),
    maxRows: optionalPositiveInt(process.env.SCANNER_V3_ANN_MAX_ROWS),
    limit: positiveInt(process.env.SCANNER_V3_ANN_LIMIT, DEFAULT_LIMIT),
    palLimit: positiveInt(process.env.SCANNER_V3_ANN_PAL_LIMIT, DEFAULT_PAL_LIMIT),
    pageSize: positiveInt(process.env.SCANNER_V3_ANN_PAGE_SIZE, DEFAULT_PAGE_SIZE),
    model: process.env.SCANNER_V3_IDENTITY_MODEL || EMBEDDING_INDEX_V1.model,
    planeCount: positiveInt(process.env.SCANNER_V3_ANN_PLANE_COUNT, DEFAULT_PLANE_COUNT),
    seed: positiveInt(process.env.SCANNER_V3_ANN_SEED, DEFAULT_SEED),
    storageBucket: process.env.SCANNER_V3_ANN_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET,
    signedUrlTtlSec: positiveInt(
      process.env.SCANNER_V3_ANN_SIGNED_URL_TTL_SEC,
      DEFAULT_SIGNED_URL_TTL_SEC,
    ),
    downloadTimeoutMs: positiveInt(
      process.env.SCANNER_V3_ANN_DOWNLOAD_TIMEOUT_MS,
      DEFAULT_DOWNLOAD_TIMEOUT_MS,
    ),
    progressEvery: positiveInt(process.env.SCANNER_V3_ANN_PROGRESS_EVERY, DEFAULT_PROGRESS_EVERY),
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

    if (name === '--out-dir') {
      args.outDir = nextValue() || DEFAULT_OUT_DIR;
    } else if (name === '--cache-dir') {
      args.cacheDir = nextValue() || DEFAULT_CACHE_DIR;
    } else if (name === '--full') {
      args.full = true;
    } else if (name === '--max-rows') {
      args.maxRows = optionalPositiveInt(nextValue());
    } else if (name === '--limit') {
      args.limit = positiveInt(nextValue(), DEFAULT_LIMIT);
    } else if (name === '--pal-limit') {
      args.palLimit = positiveInt(nextValue(), DEFAULT_PAL_LIMIT);
    } else if (name === '--page-size') {
      args.pageSize = positiveInt(nextValue(), DEFAULT_PAGE_SIZE);
    } else if (name === '--model') {
      args.model = nextValue() || EMBEDDING_INDEX_V1.model;
    } else if (name === '--planes') {
      args.planeCount = positiveInt(nextValue(), DEFAULT_PLANE_COUNT);
    } else if (name === '--seed') {
      args.seed = positiveInt(nextValue(), DEFAULT_SEED);
    } else if (name === '--storage-bucket') {
      args.storageBucket = nextValue() || DEFAULT_STORAGE_BUCKET;
    } else if (name === '--signed-url-ttl-sec') {
      args.signedUrlTtlSec = positiveInt(nextValue(), DEFAULT_SIGNED_URL_TTL_SEC);
    } else if (name === '--download-timeout-ms') {
      args.downloadTimeoutMs = positiveInt(nextValue(), DEFAULT_DOWNLOAD_TIMEOUT_MS);
    } else if (name === '--progress-every') {
      args.progressEvery = positiveInt(nextValue(), DEFAULT_PROGRESS_EVERY);
    } else if (name === '--help' || name === '-h') {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return [
    'Usage:',
    '  node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --limit 40 --pal-limit 40 --out-dir .tmp/scanner_v3_ann_index_v1/sample_v1',
    '  node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --out-dir .tmp/scanner_v3_ann_index_v1/full_candidate_v1',
    '  node backend/identity_v3/build_scanner_v3_ann_index_v1.mjs --full --max-rows 500 --out-dir .tmp/scanner_v3_ann_index_v1/full_mode_smoke_v1',
    '',
    'Purpose:',
    '  Builds a Scanner V3 ANN-style compact artifact from read-only Supabase card_prints.',
    '  This is not a full monolithic JSON rebuild and does not mutate Supabase.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const startedAt = performance.now();
  const outDir = path.resolve(args.outDir);
  const vectorsDir = path.join(outDir, 'vectors');
  const shardMetadataDir = path.join(outDir, 'metadata');
  const bucketsDir = path.join(outDir, 'buckets');
  const cacheDir = path.resolve(args.cacheDir);
  await Promise.all([
    mkdir(outDir, { recursive: true }),
    mkdir(vectorsDir, { recursive: true }),
    mkdir(shardMetadataDir, { recursive: true }),
    mkdir(bucketsDir, { recursive: true }),
    mkdir(cacheDir, { recursive: true }),
  ]);

  const supabase = createBackendClient();
  const selectedRows = await loadSelectedRows(supabase, args);
  const lsh = {
    kind: 'random_hyperplane_lsh_v1',
    seed: args.seed,
    plane_count: args.planeCount,
    dimensions: EMBEDDING_INDEX_V1.dimensions,
  };
  const planes = generatePlanes(lsh);
  const shardWriters = new Map();
  const cardMetadata = new Map();
  const skippedDownloads = [];
  const skippedReferences = [];
  const embeddedTimings = [];
  let referenceViewCount = 0;

  try {
    await writeProgress({
      outDir,
      args,
      startedAt,
      selectedRows,
      processedCount: 0,
      cardMetadata,
      referenceViewCount,
      skippedReferences,
      embeddedTimings,
      phase: 'embedding',
    });
    for (let index = 0; index < selectedRows.length; index += 1) {
      const row = selectedRows[index];
      try {
        const localImagePath = await materializeReferenceImage({
          supabase,
          row,
          args,
          cacheDir,
        });
        const entry = rowToEntry(row, localImagePath);
        const views = await generateScannerV3ReferenceViews(entry);
        cardMetadata.set(row.id, cardMetadataRow(row, localImagePath));

        for (const view of views) {
          const embedded = await embedImageBuffer(view.buffer, { model: args.model });
          embeddedTimings.push(embedded.elapsed_ms);
          const viewType = view.view_type ?? 'unknown';
          const bucket = hashEmbedding(embedded.embedding, planes);
          const shardLine = {
            card_id: row.id,
            gv_id: row.gv_id ?? null,
            name: row.name ?? null,
            set_code: row.set_code ?? null,
            number: row.number ?? null,
            number_plain: row.number_plain ?? null,
            variant_key: row.variant_key ?? null,
            image_url: firstImageUrl(row),
            image_url_field: firstImageField(row),
            image_source: row.image_source ?? null,
            image_status: row.image_status ?? null,
            image_kind: imageKind(row),
            image_is_representative: isRepresentativeStatus(row.image_status),
            print_identity_key: row.print_identity_key ?? null,
            view_type: viewType,
            bucket,
            embedding_model: embedded.model,
            embedding_source: embedded.source,
            embedding_ms: embedded.elapsed_ms,
          };
          await writeShardVector({
            shardWriters,
            vectorsDir,
            shardMetadataDir,
            viewType,
            metadata: shardLine,
            embedding: embedded.embedding,
          });
          referenceViewCount += 1;
        }

        console.log(JSON.stringify({
          event: 'scanner_v3_ann_reference_embedded',
          index: index + 1,
          total: selectedRows.length,
          card_id: row.id,
          name: row.name,
          set_code: row.set_code,
          view_count: views.length,
        }));
      } catch (error) {
        skippedReferences.push({
          card_id: row.id,
          gv_id: row.gv_id ?? null,
          name: row.name ?? null,
          set_code: row.set_code ?? null,
          number: row.number ?? null,
          reason: error?.message || String(error),
        });
      }
      if ((index + 1) % args.progressEvery === 0 || index + 1 === selectedRows.length) {
        await writeProgress({
          outDir,
          args,
          startedAt,
          selectedRows,
          processedCount: index + 1,
          cardMetadata,
          referenceViewCount,
          skippedReferences,
          embeddedTimings,
          phase: 'embedding',
        });
      }
    }
  } finally {
    await closeShardWriters(shardWriters);
  }

  const metadataPath = path.join(outDir, 'metadata.jsonl');
  await writeJsonl(metadataPath, [...cardMetadata.values()]);

  const shardArtifacts = await writeBucketFilesAndShardSummaries({
    shardWriters,
    vectorsDir,
    shardMetadataDir,
    bucketsDir,
  });
  const manifest = {
    generated_at: new Date().toISOString(),
    artifact: 'scanner_v3_ann_index_v1',
    contract: 'SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1',
    mode: args.full
      ? (args.maxRows ? 'full_selection_limited_ann_candidate' : 'full_ann_candidate')
      : 'bounded_ann_prototype',
    source_policy: {
      source_table: 'public.card_prints',
      writes_supabase: false,
      live_runtime_supabase_queries: false,
      image_priority: [
        'image_source=identity image_path',
        'image_url',
        'image_alt_url',
        'representative_image_url',
      ],
    },
    model: args.model,
    embedding: {
      source: EMBEDDING_INDEX_V1.source,
      dimensions: EMBEDDING_INDEX_V1.dimensions,
      distance: EMBEDDING_INDEX_V1.distance,
      embedding_ms_avg: average(embeddedTimings),
      embedding_ms_max: maxOrNull(embeddedTimings),
    },
    lsh,
    reference_view_generator: SCANNER_V3_REFERENCE_VIEWS_V1.name,
    reference_view_types: SCANNER_V3_REFERENCE_VIEWS_V1.reference_view_types,
    storage: {
      format: 'compact_f32_shards_v1',
      vector_dtype: VECTOR_DTYPE,
      vector_dimensions: EMBEDDING_INDEX_V1.dimensions,
      vector_bytes_per_embedding: VECTOR_BYTES,
      bucket_index: 'json_bucket_to_vector_indexes_v1',
      metadata: 'jsonl_without_embedding_vectors_v1',
    },
    selection: {
      full: args.full,
      max_rows: args.maxRows,
      limit: args.limit,
      pal_limit: args.palLimit,
      selected_row_count: selectedRows.length,
      selected_set_code_counts: countBy(selectedRows, (row) => setCodeKey(row.set_code)),
      selected_pal_sv02_count: selectedRows.filter(isPalSv02).length,
    },
    index: {
      reference_count: cardMetadata.size,
      reference_view_count: referenceViewCount,
      shard_count: shardArtifacts.length,
      shards: shardArtifacts,
      metadata_file: 'metadata.jsonl',
      metadata_sha256: await fileSha256(metadataPath),
    },
    skipped_downloads: skippedDownloads,
    skipped_references: skippedReferences,
    elapsed_ms: roundMs(performance.now() - startedAt),
  };

  await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeProgress({
    outDir,
    args,
    startedAt,
    selectedRows,
    processedCount: selectedRows.length,
    cardMetadata,
    referenceViewCount,
    skippedReferences,
    embeddedTimings,
    phase: 'complete',
  });
  console.log(JSON.stringify({
    event: 'scanner_v3_ann_index_built',
    out_dir: outDir,
    reference_count: manifest.index.reference_count,
    reference_view_count: manifest.index.reference_view_count,
    selected_pal_sv02_count: manifest.selection.selected_pal_sv02_count,
    shard_count: manifest.index.shard_count,
    elapsed_ms: manifest.elapsed_ms,
  }, null, 2));
}

async function loadSelectedRows(supabase, args) {
  if (args.full) return loadAllEligibleRows(supabase, args);
  const [generalRows, palRows] = await Promise.all([
    queryRows(supabase, { limit: args.limit, excludeSetCode: 'sv02' }),
    queryRows(supabase, { limit: args.palLimit, setCode: 'sv02' }),
  ]);
  const rows = dedupeRowsById([...palRows, ...generalRows]).filter(hasUsableImageSource);
  return args.maxRows ? rows.slice(0, args.maxRows) : rows;
}

async function loadAllEligibleRows(supabase, args) {
  const rows = [];
  let from = 0;
  while (true) {
    const page = await queryRowsPage(supabase, {
      from,
      to: from + args.pageSize - 1,
    });
    rows.push(...page);
    console.log(JSON.stringify({
      event: 'scanner_v3_ann_rows_loaded',
      loaded: rows.length,
      last_page_count: page.length,
      page_size: args.pageSize,
      max_rows: args.maxRows,
    }));
    if (args.maxRows && rows.length >= args.maxRows) {
      return dedupeRowsById(rows).filter(hasUsableImageSource).slice(0, args.maxRows);
    }
    if (page.length < args.pageSize) break;
    from += args.pageSize;
  }
  return dedupeRowsById(rows).filter(hasUsableImageSource);
}

async function queryRows(supabase, { limit, setCode = null, excludeSetCode = null }) {
  let query = supabase
    .from('card_prints')
    .select(cardPrintSelect())
    .order('id', { ascending: true })
    .limit(limit);
  if (setCode) query = query.eq('set_code', setCode);
  if (excludeSetCode) query = query.neq('set_code', excludeSetCode);
  query = query.or('image_path.not.is.null,image_url.not.is.null,image_alt_url.not.is.null,representative_image_url.not.is.null');
  const { data, error } = await query;
  if (error) throw new Error(`scanner_v3_ann_card_print_query_failed:${error.message}`);
  return data ?? [];
}

async function queryRowsPage(supabase, { from, to }) {
  let query = supabase
    .from('card_prints')
    .select(cardPrintSelect())
    .order('id', { ascending: true })
    .range(from, to);
  query = query.or('image_path.not.is.null,image_url.not.is.null,image_alt_url.not.is.null,representative_image_url.not.is.null');
  const { data, error } = await query;
  if (error) throw new Error(`scanner_v3_ann_card_print_page_query_failed:${error.message}`);
  return data ?? [];
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
  ].join(', ');
}

async function materializeReferenceImage({ supabase, row, args, cacheDir }) {
  const sources = referenceSources(row);
  const attempts = [];
  for (const source of sources) {
    try {
      return await downloadReferenceImage({
        supabase,
        source,
        cacheDir,
        cardId: row.id,
        storageBucket: args.storageBucket,
        signedUrlTtlSec: args.signedUrlTtlSec,
        timeoutMs: args.downloadTimeoutMs,
      });
    } catch (error) {
      attempts.push(`${source.field}=${error?.message || String(error)}`);
    }
  }
  throw new Error(`all_reference_downloads_failed:${attempts.join(';')}`);
}

async function downloadReferenceImage({
  supabase,
  source,
  cacheDir,
  cardId,
  storageBucket,
  signedUrlTtlSec,
  timeoutMs,
}) {
  const sourceLabel = source.url ?? storageUrlLabel(storageBucket, source.storage_path);
  const ext = imageExtensionFromSource(sourceLabel);
  const hash = sha1(sourceLabel).slice(0, 16);
  const filePath = path.join(
    cacheDir,
    `${safeBasename(cardId)}_${safeBasename(source.field)}_${hash}${ext}`,
  );
  if (await pathExists(filePath)) return filePath;

  const downloadUrl = await resolveDownloadUrl({
    supabase,
    source,
    storageBucket,
    signedUrlTtlSec,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(downloadUrl, {
      signal: controller.signal,
      headers: {
        'user-agent': 'grookai-scanner-v3-ann-index-builder-v1/1.0',
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

async function resolveDownloadUrl({ supabase, source, storageBucket, signedUrlTtlSec }) {
  if (source.field !== 'image_path') return source.url;
  if (!hasText(source.storage_path)) throw new Error('missing_storage_image_path');
  const { data, error } = await supabase.storage
    .from(storageBucket)
    .createSignedUrl(source.storage_path, signedUrlTtlSec);
  if (error) throw new Error(`storage_signed_url_failed:${error.message}`);
  if (!hasText(data?.signedUrl)) throw new Error('storage_signed_url_missing');
  return data.signedUrl;
}

function referenceSources(row) {
  const imageSource = normalizeText(row.image_source);
  const sources = [];
  if (imageSource === 'identity' && hasText(row.image_path)) {
    sources.push({
      field: 'image_path',
      storage_path: normalizeText(row.image_path),
      url: null,
    });
  }
  if (hasText(row.image_url)) {
    sources.push({ field: 'image_url', url: normalizeText(row.image_url), storage_path: null });
  }
  if (hasText(row.image_alt_url)) {
    sources.push({ field: 'image_alt_url', url: normalizeText(row.image_alt_url), storage_path: null });
  }
  if (hasText(row.representative_image_url)) {
    sources.push({
      field: 'representative_image_url',
      url: normalizeText(row.representative_image_url),
      storage_path: null,
    });
  }
  return sources;
}

function rowToEntry(row, localImagePath) {
  return {
    card_id: row.id,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    set_code: row.set_code ?? null,
    number: row.number ?? null,
    number_plain: row.number_plain ?? null,
    variant_key: row.variant_key ?? null,
    print_identity_key: row.print_identity_key ?? null,
    image_url: firstImageUrl(row),
    image_url_field: firstImageField(row),
    image_source: row.image_source ?? null,
    image_status: row.image_status ?? null,
    image_note: row.image_note ?? null,
    image_kind: imageKind(row),
    image_is_representative: isRepresentativeStatus(row.image_status),
    full_image_path: localImagePath,
    image_path: localImagePath,
  };
}

function cardMetadataRow(row, localImagePath) {
  return {
    card_id: row.id,
    gv_id: row.gv_id ?? null,
    name: row.name ?? null,
    set_code: row.set_code ?? null,
    number: row.number ?? null,
    number_plain: row.number_plain ?? null,
    variant_key: row.variant_key ?? null,
    print_identity_key: row.print_identity_key ?? null,
    image_url: firstImageUrl(row),
    image_url_field: firstImageField(row),
    image_source: row.image_source ?? null,
    image_status: row.image_status ?? null,
    image_kind: imageKind(row),
    image_is_representative: isRepresentativeStatus(row.image_status),
    source_path: localImagePath,
  };
}

async function writeShardVector({
  shardWriters,
  vectorsDir,
  shardMetadataDir,
  viewType,
  metadata,
  embedding,
}) {
  let writer = shardWriters.get(viewType);
  if (!writer) {
    const basename = safeBasename(viewType);
    writer = {
      viewType,
      basename,
      vectorFile: `vectors/${basename}.f32`,
      metadataFile: `metadata/${basename}.jsonl`,
      bucketFile: `buckets/${basename}.buckets.json`,
      vectorStream: createWriteStream(path.join(vectorsDir, `${basename}.f32`), { flags: 'w' }),
      metadataStream: createWriteStream(path.join(shardMetadataDir, `${basename}.jsonl`), {
        flags: 'w',
        encoding: 'utf8',
      }),
      vectorCount: 0,
      bucketVectors: new Map(),
      closed: false,
    };
    shardWriters.set(viewType, writer);
  }

  const vectorIndex = writer.vectorCount;
  writer.vectorCount += 1;
  const row = {
    ...metadata,
    vector_index: vectorIndex,
    vector_offset_bytes: vectorIndex * VECTOR_BYTES,
    vector_dimensions: EMBEDDING_INDEX_V1.dimensions,
    vector_dtype: VECTOR_DTYPE,
  };
  await writeStreamChunk(writer.vectorStream, embeddingToFloat32Buffer(embedding));
  await writeStreamChunk(writer.metadataStream, `${JSON.stringify(row)}\n`);
  if (!writer.bucketVectors.has(row.bucket)) writer.bucketVectors.set(row.bucket, []);
  writer.bucketVectors.get(row.bucket).push(vectorIndex);
}

async function writeStreamChunk(stream, chunk) {
  if (!stream.write(chunk)) await once(stream, 'drain');
}

async function closeShardWriters(shardWriters) {
  await Promise.all([...shardWriters.values()].map(async (writer) => {
    if (writer.closed) return;
    writer.closed = true;
    writer.vectorStream.end();
    writer.metadataStream.end();
    await Promise.all([
      finished(writer.vectorStream),
      finished(writer.metadataStream),
    ]);
  }));
}

async function writeJsonl(filePath, rows) {
  const stream = createWriteStream(filePath, { flags: 'w', encoding: 'utf8' });
  for (const row of rows) {
    if (!stream.write(`${JSON.stringify(row)}\n`)) await once(stream, 'drain');
  }
  stream.end();
  await finished(stream);
}

async function writeProgress({
  outDir,
  args,
  startedAt,
  selectedRows,
  processedCount,
  cardMetadata,
  referenceViewCount,
  skippedReferences,
  embeddedTimings,
  phase,
}) {
  const payload = {
    updated_at: new Date().toISOString(),
    artifact: 'scanner_v3_ann_index_v1',
    phase,
    mode: args.full
      ? (args.maxRows ? 'full_selection_limited_ann_candidate' : 'full_ann_candidate')
      : 'bounded_ann_prototype',
    full: args.full,
    max_rows: args.maxRows,
    selected_row_count: selectedRows.length,
    processed_row_count: processedCount,
    completed_reference_count: cardMetadata.size,
    reference_view_count: referenceViewCount,
    skipped_reference_count: skippedReferences.length,
    selected_pal_sv02_count: selectedRows.filter(isPalSv02).length,
    completed_pal_sv02_count: [...cardMetadata.values()].filter(isPalSv02).length,
    selected_set_code_counts: countBy(selectedRows, (row) => setCodeKey(row.set_code)),
    embedding_ms_avg: average(embeddedTimings),
    embedding_ms_max: maxOrNull(embeddedTimings),
    elapsed_ms: roundMs(performance.now() - startedAt),
  };
  await writeFile(path.join(outDir, 'progress.json'), `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeBucketFilesAndShardSummaries({
  shardWriters,
  vectorsDir,
  shardMetadataDir,
  bucketsDir,
}) {
  const rows = [];
  const writers = [...shardWriters.values()].sort((a, b) => a.viewType.localeCompare(b.viewType));
  for (const writer of writers) {
    const bucketRows = Object.fromEntries(
      [...writer.bucketVectors.entries()].sort(([left], [right]) => left.localeCompare(right)),
    );
    const bucketPath = path.join(bucketsDir, `${writer.basename}.buckets.json`);
    await writeFile(bucketPath, `${JSON.stringify(bucketRows)}\n`);
    rows.push({
      view_type: writer.viewType,
      vector_file: writer.vectorFile,
      metadata_file: writer.metadataFile,
      bucket_file: writer.bucketFile,
      vector_count: writer.vectorCount,
      bucket_count: writer.bucketVectors.size,
      vector_sha256: await fileSha256(path.join(vectorsDir, `${writer.basename}.f32`)),
      metadata_sha256: await fileSha256(path.join(shardMetadataDir, `${writer.basename}.jsonl`)),
      bucket_sha256: await fileSha256(bucketPath),
    });
  }
  return rows;
}

function embeddingToFloat32Buffer(embedding) {
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_INDEX_V1.dimensions) {
    throw new Error(`invalid_embedding_dimensions:${embedding?.length ?? 0}/${EMBEDDING_INDEX_V1.dimensions}`);
  }
  const buffer = Buffer.allocUnsafe(VECTOR_BYTES);
  for (let i = 0; i < embedding.length; i += 1) {
    const value = Number(embedding[i]);
    buffer.writeFloatLE(Number.isFinite(value) ? value : 0, i * 4);
  }
  return buffer;
}

function generatePlanes({ seed, plane_count: planeCount, dimensions }) {
  const random = seededRandom(seed);
  return Array.from({ length: planeCount }, () => {
    const plane = [];
    for (let i = 0; i < dimensions; i += 1) {
      plane.push((random() * 2) - 1);
    }
    return plane;
  });
}

function hashEmbedding(embedding, planes) {
  return planes.map((plane) => dot(embedding, plane) >= 0 ? '1' : '0').join('');
}

function dot(left, right) {
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let i = 0; i < length; i += 1) sum += Number(left[i]) * Number(right[i]);
  return sum;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function firstImageUrl(row) {
  return normalizeText(row.image_url)
    ?? normalizeText(row.image_alt_url)
    ?? normalizeText(row.representative_image_url)
    ?? storageUrlLabel(DEFAULT_STORAGE_BUCKET, row.image_path);
}

function firstImageField(row) {
  if (hasText(row.image_url)) return 'image_url';
  if (hasText(row.image_alt_url)) return 'image_alt_url';
  if (hasText(row.representative_image_url)) return 'representative_image_url';
  if (hasText(row.image_path)) return 'image_path';
  return null;
}

function imageKind(row) {
  if (firstImageField(row) === 'image_path') return 'identity_path';
  return isRepresentativeStatus(row.image_status) ? 'representative_url' : 'exact_url';
}

function hasUsableImageSource(row) {
  return referenceSources(row).length > 0;
}

function isRepresentativeStatus(value) {
  return String(value ?? '').trim().toLowerCase().startsWith('representative_');
}

function isPalSv02(row) {
  const setCode = setCodeKey(row?.set_code);
  const gvId = normalizeText(row?.gv_id)?.toUpperCase() ?? '';
  return setCode === 'sv02' || setCode === 'pal' || gvId.startsWith('GV-PK-PAL-');
}

function setCodeKey(value) {
  return normalizeText(value)?.toLowerCase() ?? 'unknown';
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function dedupeRowsById(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

function storageUrlLabel(bucket, storagePath) {
  return hasText(storagePath) ? `supabase-storage://${bucket}/${storagePath}` : null;
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

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function fileSha256(filePath) {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  await finished(stream);
  return hash.digest('hex');
}

function sha1(value) {
  return createHash('sha1').update(String(value)).digest('hex');
}

function safeBasename(value) {
  return String(value || 'item')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'item';
}

function hasText(value) {
  return normalizeText(value) !== null;
}

function normalizeText(value) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'null') return null;
  return text;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalPositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return roundMs(finite.reduce((sum, value) => sum + value, 0) / finite.length);
}

function maxOrNull(values) {
  let max = null;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (max === null || value > max) max = value;
  }
  return max;
}

function roundMs(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
