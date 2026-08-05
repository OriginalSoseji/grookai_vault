import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import tls from 'node:tls';
import { pathToFileURL } from 'node:url';

import {
  readVerifiedArtifact,
  writeShardedRows,
} from './artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import { buildWriterV2Plan } from './payload_writer_v2.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';

// Keep certificate and hostname verification enabled while adding the Windows
// trust store to Node's bundled roots, matching the existing image workers.
tls.setDefaultCACertificates([
  ...tls.getCACertificates('default'),
  ...tls.getCACertificates('system'),
]);

export const IMAGE_ACQUISITION_READINESS_VERSION =
  'JPN-MASTER-INDEX-V4-IMAGE-ACQUISITION-READINESS-V1';
export const EXPECTED_SCOPE_COUNT = 5_336;
export const EXPECTED_INTEGRATION_INVENTORY_FINGERPRINT =
  '54cdac7d005e1c0a043ad1684715be3dfee31ea8f585f38d5de94fb18c64e4a4';
export const EXPECTED_ROW_DATASET_FINGERPRINT =
  'eeb38caaa7365e9fc75ae8c1f873fed5a4e2e64ca12048d56498d592fca97c61';
export const EXPECTED_PRIMARY_HOST_COUNTS = Object.freeze({
  'assets.tcgdex.net': 18,
  'limitlesstcg.nyc3.cdn.digitaloceanspaces.com': 35,
  'www.pokemon-card.com': 5_283,
});
export const CANARY_HOST_ALLOCATION = Object.freeze({
  'assets.tcgdex.net': 18,
  'limitlesstcg.nyc3.cdn.digitaloceanspaces.com': 35,
  'www.pokemon-card.com': 17,
});
export const DEFAULT_CANARY_SIZE = 70;
export const SELF_HOSTED_IMAGE_PREFIX =
  'warehouse-derived/self-hosted-images-v1/card_prints';

const DEFAULT_INVENTORY_PATH =
  'docs/audits/japanese_master_index_v4/product_integration_inventory_v1/'
  + 'jpn_product_integration_inventory_v1.json';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/image_acquisition_readiness_v1';
const DEFAULT_CACHE_DIR =
  '.tmp/jpn_master_index_v4_image_acquisition_canary_v1';
const MAX_IMAGE_BYTES = 8_388_608;
const MIN_IMAGE_BYTES = 5_000;
const FETCH_TIMEOUT_MS = 45_000;
const ALLOWED_SOURCE_HOSTS = new Set([
  'assets.tcgdex.net',
  'limitlesstcg.nyc3.cdn.digitaloceanspaces.com',
  'www.pokemon-card.com',
  'www.serebii.net',
]);
const USER_AGENT = 'Grookai Japanese V4 Image Acquisition Readiness/1.0';

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizePathSegment(value, fallback = 'unknown') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = clean(keyFn(row)) ?? 'none';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) =>
      left.localeCompare(right)),
  );
}

function parseArgs(argv) {
  assertAuditOnlyArgs(argv);
  const options = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    cacheDir: DEFAULT_CACHE_DIR,
    canarySize: DEFAULT_CANARY_SIZE,
    concurrency: 6,
    timeoutMs: FETCH_TIMEOUT_MS,
  };
  for (const argument of argv) {
    if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else if (argument.startsWith('--cache-dir=')) {
      options.cacheDir = argument.slice('--cache-dir='.length);
    } else if (argument.startsWith('--canary-size=')) {
      options.canarySize = Number.parseInt(
        argument.slice('--canary-size='.length),
        10,
      );
    } else if (argument.startsWith('--concurrency=')) {
      options.concurrency = Number.parseInt(
        argument.slice('--concurrency='.length),
        10,
      );
    } else if (argument.startsWith('--timeout-ms=')) {
      options.timeoutMs = Number.parseInt(
        argument.slice('--timeout-ms='.length),
        10,
      );
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  if (options.canarySize !== DEFAULT_CANARY_SIZE) {
    throw new Error(`Canary size must remain ${DEFAULT_CANARY_SIZE}.`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1
    || options.concurrency > 10) {
    throw new Error('Concurrency must be between 1 and 10.');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 10_000
    || options.timeoutMs > 120_000) {
    throw new Error('Timeout must be between 10000 and 120000 milliseconds.');
  }
  const cacheRoot = path.resolve('.tmp');
  const resolvedCache = path.resolve(options.cacheDir);
  if (!resolvedCache.startsWith(`${cacheRoot}${path.sep}`)) {
    throw new Error('Canary cache must remain under the repository .tmp directory.');
  }
  options.cacheDir = resolvedCache;
  return options;
}

async function loadRowsFromDescriptor(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  if (rows.length !== descriptor.row_count) {
    throw new Error('Integration row count changed.');
  }
  if (contentFingerprint(rows) !== descriptor.content_fingerprint_sha256) {
    throw new Error('Integration row fingerprint changed.');
  }
  return rows;
}

function sourceProvider(host) {
  if (host === 'www.pokemon-card.com') return 'official_jp_cards';
  if (host === 'assets.tcgdex.net') return 'tcgdex';
  if (host === 'limitlesstcg.nyc3.cdn.digitaloceanspaces.com') {
    return 'limitless';
  }
  if (host === 'www.serebii.net') return 'serebii';
  return 'unknown';
}

function parseSourceUrl(value) {
  const raw = clean(value);
  if (!raw) return null;
  const parsed = new URL(raw);
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:') {
    throw new Error(`Non-HTTPS source URL: ${raw}`);
  }
  if (!ALLOWED_SOURCE_HOSTS.has(host)) {
    throw new Error(`Unapproved source host: ${host}`);
  }
  return {
    url: parsed.toString(),
    host,
    provider: sourceProvider(host),
    url_sha256: sha256(parsed.toString()),
  };
}

export function buildAcquisitionManifestRows(inventoryRows, cardRows) {
  const cardById = new Map(cardRows.map((row) => [row.id, row]));
  const rows = inventoryRows.map((row) => {
    const card = cardById.get(row.card_print_id);
    if (!card || card.gv_id !== row.gv_id) {
      throw new Error(`Card authority mismatch: ${row.card_print_id}`);
    }
    const primary = parseSourceUrl(row.image.image_url);
    const fallback = parseSourceUrl(row.image.image_alt_url);
    if (!primary) throw new Error(`Primary source URL missing: ${row.gv_id}`);
    const sourceContract = card.external_ids?.japanese_master_index_v4 ?? {};
    return {
      position: row.position,
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      identity_domain: row.identity_domain,
      primary_source: primary,
      fallback_source: fallback,
      preserved_source_ids: sourceContract.source_ids ?? [],
      preserved_source_assertion_keys:
        sourceContract.source_assertion_keys ?? [],
      source_identity_authority:
        'applied_japanese_v4_identity_evidence_pointer',
      visual_identity_reconfirmation: 'not_performed',
      target_storage_path_template:
        `${SELF_HOSTED_IMAGE_PREFIX}/`
        + `${normalizePathSegment(row.set_code)}/`
        + `${normalizePathSegment(row.gv_id)}/`
        + '{sha256-prefix-24}.{verified-extension}',
      acquisition_status: 'not_attempted_outside_canary',
    };
  });

  if (rows.length !== EXPECTED_SCOPE_COUNT) {
    throw new Error('Acquisition manifest scope changed.');
  }
  const cardIds = new Set(rows.map((row) => row.card_print_id));
  const gvIds = new Set(rows.map((row) => row.gv_id));
  const primaryUrls = new Set(rows.map((row) => row.primary_source.url));
  if (
    cardIds.size !== EXPECTED_SCOPE_COUNT
    || gvIds.size !== EXPECTED_SCOPE_COUNT
    || primaryUrls.size !== EXPECTED_SCOPE_COUNT
  ) {
    throw new Error('Acquisition manifest identities or source URLs are not unique.');
  }
  const hostCounts = countBy(rows, (row) => row.primary_source.host);
  if (stableJson(hostCounts) !== stableJson(EXPECTED_PRIMARY_HOST_COUNTS)) {
    throw new Error(`Primary source host distribution changed: ${stableJson(hostCounts)}`);
  }
  return rows;
}

function evenlySpaced(rows, count) {
  if (count >= rows.length) return [...rows];
  if (count === 1) return [rows[0]];
  return Array.from({ length: count }, (_, index) =>
    rows[Math.floor(index * (rows.length - 1) / (count - 1))],
  );
}

export function selectCanaryRows(manifestRows) {
  const selected = [];
  for (const [host, allocation] of Object.entries(CANARY_HOST_ALLOCATION)) {
    const hostRows = manifestRows
      .filter((row) => row.primary_source.host === host)
      .sort((left, right) => left.gv_id.localeCompare(right.gv_id));
    if (hostRows.length < allocation) {
      throw new Error(`Canary host allocation unavailable: ${host}`);
    }
    selected.push(...evenlySpaced(hostRows, allocation));
  }
  selected.sort((left, right) => left.position - right.position);
  if (
    selected.length !== DEFAULT_CANARY_SIZE
    || new Set(selected.map((row) => row.card_print_id)).size
      !== DEFAULT_CANARY_SIZE
  ) {
    throw new Error('Canary selection is not exact and unique.');
  }
  return selected.map((row, index) => ({
    ...row,
    canary_position: index + 1,
  }));
}

function pngDimensions(buffer) {
  if (buffer.length < 24
    || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    format: 'png',
  };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf
      && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: 'jpg',
      };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(buffer) {
  if (buffer.length < 30
    || buffer.subarray(0, 4).toString('ascii') !== 'RIFF'
    || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
    return null;
  }
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
      format: 'webp',
    };
  }
  if (chunk === 'VP8L' && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: 'webp',
    };
  }
  if (chunk === 'VP8 ' && buffer[23] === 0x9d
    && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      format: 'webp',
    };
  }
  return null;
}

export function inspectImageBuffer(buffer, contentType) {
  const dimensions = pngDimensions(buffer)
    ?? jpegDimensions(buffer)
    ?? webpDimensions(buffer);
  const normalizedType = clean(contentType)?.split(';')[0].toLowerCase()
    ?? null;
  const width = dimensions?.width ?? null;
  const height = dimensions?.height ?? null;
  const aspectRatio = width && height ? width / height : null;
  const diagnostics = [];
  if (!normalizedType?.startsWith('image/')) diagnostics.push('non_image_content_type');
  if (!dimensions) diagnostics.push('unrecognized_image_bytes');
  if (buffer.length < MIN_IMAGE_BYTES) diagnostics.push('below_minimum_bytes');
  if (buffer.length > MAX_IMAGE_BYTES) diagnostics.push('above_maximum_bytes');
  if (width && height && (width < 300 || height < 400)) {
    diagnostics.push('low_resolution');
  }
  if (aspectRatio && (aspectRatio < 0.55 || aspectRatio > 0.85)) {
    diagnostics.push('unexpected_card_aspect_ratio');
  }
  return {
    content_type: normalizedType,
    size_bytes: buffer.length,
    sha256: sha256(buffer),
    width,
    height,
    format: dimensions?.format ?? null,
    aspect_ratio: aspectRatio,
    diagnostics,
    valid_image: !diagnostics.some((value) => [
      'non_image_content_type',
      'unrecognized_image_bytes',
      'below_minimum_bytes',
      'above_maximum_bytes',
      'unexpected_card_aspect_ratio',
    ].includes(value)),
    quality_band: !dimensions
      ? 'invalid'
      : width >= 600 && height >= 825
        ? 'high'
        : width >= 300 && height >= 400
          ? 'usable'
          : 'low',
  };
}

async function responseBuffer(response) {
  const declared = Number.parseInt(
    response.headers.get('content-length') ?? '0',
    10,
  );
  if (declared > MAX_IMAGE_BYTES) {
    throw new Error(`response_too_large_declared:${declared}`);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > MAX_IMAGE_BYTES) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`response_too_large_streamed:${size}`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function fetchCandidate(source, timeoutMs) {
  const parsed = new URL(source.url);
  if (parsed.protocol !== 'https:'
    || !ALLOWED_SOURCE_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`source_not_allowed:${source.url}`);
  }
  const response = await fetch(parsed, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'user-agent': USER_AGENT,
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.1',
      'accept-language': 'en-US,en;q=0.8,ja;q=0.7',
    },
  });
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:'
    || !ALLOWED_SOURCE_HOSTS.has(finalUrl.hostname.toLowerCase())) {
    throw new Error(`redirect_host_not_allowed:${response.url}`);
  }
  const buffer = await responseBuffer(response);
  const image = inspectImageBuffer(
    buffer,
    response.headers.get('content-type'),
  );
  return {
    buffer,
    attempt: {
      source_url: source.url,
      source_host: source.host,
      source_provider: source.provider,
      final_url: response.url,
      final_host: finalUrl.hostname.toLowerCase(),
      http_status: response.status,
      http_ok: response.ok,
      tls_verification:
        'enabled_with_node_bundled_plus_windows_system_ca_roots',
      ...image,
      accepted: response.ok && image.valid_image,
    },
  };
}

async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return output;
}

function targetStoragePath(row, observation) {
  return `${SELF_HOSTED_IMAGE_PREFIX}/`
    + `${normalizePathSegment(row.set_code)}/`
    + `${normalizePathSegment(row.gv_id)}/`
    + `${observation.sha256.slice(0, 24)}.${observation.format}`;
}

async function inspectCanaryRow(row, options) {
  const attempts = [];
  let selected = null;
  let selectedBuffer = null;
  for (const candidate of [
    ['primary', row.primary_source],
    ['fallback', row.fallback_source],
  ]) {
    const [role, source] = candidate;
    if (!source) continue;
    try {
      const result = await fetchCandidate(source, options.timeoutMs);
      attempts.push({ role, ...result.attempt });
      if (result.attempt.accepted) {
        selected = { role, ...result.attempt };
        selectedBuffer = result.buffer;
        break;
      }
    } catch (error) {
      attempts.push({
        role,
        source_url: source.url,
        source_host: source.host,
        source_provider: source.provider,
        accepted: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!selected || !selectedBuffer) {
    return {
      canary_position: row.canary_position,
      card_print_id: row.card_print_id,
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      status: 'quarantined_no_valid_source',
      attempts,
      selected_source: null,
      local_cache_path: null,
      target_storage_path: null,
      storage_write_performed: false,
      database_write_performed: false,
    };
  }

  const targetPath = targetStoragePath(row, selected);
  const relativeCachePath = path.join(
    normalizePathSegment(row.gv_id),
    `${selected.sha256}.${selected.format}`,
  );
  const cachePath = path.join(options.cacheDir, relativeCachePath);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, selectedBuffer);
  const cacheReadback = await fs.readFile(cachePath);
  if (sha256(cacheReadback) !== selected.sha256) {
    throw new Error(`Local cache hash mismatch: ${row.gv_id}`);
  }

  return {
    canary_position: row.canary_position,
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    set_code: row.set_code,
    number: row.number,
    status: selected.quality_band === 'low'
      ? 'review_low_resolution'
      : 'ready_for_future_storage_canary',
    attempts,
    selected_source: selected,
    source_identity_authority: row.source_identity_authority,
    visual_identity_reconfirmation: 'not_performed',
    local_cache_path: path.relative(process.cwd(), cachePath).replaceAll('\\', '/'),
    local_cache_sha256: selected.sha256,
    target_storage_path: targetPath,
    storage_write_performed: false,
    database_write_performed: false,
  };
}

function applyDuplicateReview(results) {
  const byHash = new Map();
  for (const row of results) {
    const hash = row.selected_source?.sha256;
    if (!hash) continue;
    const group = byHash.get(hash) ?? [];
    group.push(row);
    byHash.set(hash, group);
  }
  const duplicateHashes = [...byHash.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([hash]) => hash);
  const duplicateSet = new Set(duplicateHashes);
  return {
    rows: results.map((row) => duplicateSet.has(row.selected_source?.sha256)
      ? {
        ...row,
        status: 'review_duplicate_content_across_parents',
        duplicate_sha256: row.selected_source.sha256,
      }
      : row),
    duplicateHashes,
  };
}

export function summarizeManifest(manifestRows, selectedRows) {
  const fallbackRows = manifestRows.filter((row) => row.fallback_source);
  return {
    scope_rows: manifestRows.length,
    unique_card_print_ids:
      new Set(manifestRows.map((row) => row.card_print_id)).size,
    unique_gv_ids: new Set(manifestRows.map((row) => row.gv_id)).size,
    unique_primary_urls:
      new Set(manifestRows.map((row) => row.primary_source.url)).size,
    primary_host_counts: countBy(manifestRows, (row) =>
      row.primary_source.host),
    primary_provider_counts: countBy(manifestRows, (row) =>
      row.primary_source.provider),
    fallback_rows: fallbackRows.length,
    fallback_host_counts: countBy(fallbackRows, (row) =>
      row.fallback_source.host),
    canary_rows: selectedRows.length,
    canary_primary_host_counts: countBy(selectedRows, (row) =>
      row.primary_source.host),
    self_hosted_paths_created: 0,
    storage_writes: 0,
    database_writes: 0,
  };
}

export function summarizeCanary(results, duplicateHashes) {
  const accepted = results.filter((row) => row.selected_source);
  const selectedFallback = accepted.filter((row) =>
    row.selected_source.role === 'fallback');
  const attempts = results.flatMap((row) => row.attempts);
  return {
    selected_rows: results.length,
    ready_rows: results.filter((row) =>
      row.status === 'ready_for_future_storage_canary').length,
    low_resolution_review_rows: results.filter((row) =>
      row.status === 'review_low_resolution').length,
    duplicate_review_rows: results.filter((row) =>
      row.status === 'review_duplicate_content_across_parents').length,
    quarantined_rows: results.filter((row) =>
      row.status === 'quarantined_no_valid_source').length,
    selected_primary_rows: accepted.length - selectedFallback.length,
    selected_fallback_rows: selectedFallback.length,
    selected_source_host_counts: countBy(accepted, (row) =>
      row.selected_source.source_host),
    selected_format_counts: countBy(accepted, (row) =>
      row.selected_source.format),
    selected_quality_counts: countBy(accepted, (row) =>
      row.selected_source.quality_band),
    attempt_http_status_counts: countBy(attempts, (row) =>
      row.http_status ?? (row.error ? 'error' : 'none')),
    duplicate_hash_groups: duplicateHashes.length,
    local_cache_rows: accepted.length,
    local_cache_bytes: accepted.reduce((sum, row) =>
      sum + Number(row.selected_source.size_bytes), 0),
    storage_writes: 0,
    database_writes: 0,
  };
}

function markdown(report) {
  const manifest = report.manifest_summary;
  const canary = report.canary_summary;
  return `# Japanese Master Index V4 Image Acquisition Readiness V1

Generated: ${report.generated_at}

## Status

- Status: \`${report.status}\`
- Exact manifest rows: ${manifest.scope_rows}
- Canary rows: ${canary.selected_rows}
- Storage writes: 0
- Database writes: 0

## Manifest

- Unique parent IDs: ${manifest.unique_card_print_ids}
- Unique parent GV-IDs: ${manifest.unique_gv_ids}
- Unique primary URLs: ${manifest.unique_primary_urls}
- Rows with fallback sources: ${manifest.fallback_rows}
- Primary hosts: ${JSON.stringify(manifest.primary_host_counts)}
- Fallback hosts: ${JSON.stringify(manifest.fallback_host_counts)}

## Download Canary

- Ready for a future Storage canary: ${canary.ready_rows}
- Low-resolution review: ${canary.low_resolution_review_rows}
- Duplicate-content review: ${canary.duplicate_review_rows}
- Quarantined with no valid source: ${canary.quarantined_rows}
- Primary source selected: ${canary.selected_primary_rows}
- Fallback source selected: ${canary.selected_fallback_rows}
- Local cache bytes: ${canary.local_cache_bytes}
- Source hosts selected: ${JSON.stringify(canary.selected_source_host_counts)}
- Formats: ${JSON.stringify(canary.selected_format_counts)}
- Quality bands: ${JSON.stringify(canary.selected_quality_counts)}

The canary downloaded source bytes only to the repository's ignored \`.tmp\`
directory. It did not access or write Supabase Storage and did not connect to
the database.

## Decision

Use the canary failures and fallback behavior to repair the acquisition plan
before any Storage upload. A successful download proves byte availability,
format, dimensions, and hash; it does not by itself constitute a human visual
identity confirmation or authorize a database image-pointer update.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { artifact: inventory } = await readVerifiedArtifact(
    DEFAULT_INVENTORY_PATH,
  );
  if (
    inventory.content_fingerprint_sha256
    !== EXPECTED_INTEGRATION_INVENTORY_FINGERPRINT
  ) {
    throw new Error('Integration inventory fingerprint changed.');
  }
  if (
    inventory.content.row_dataset.content_fingerprint_sha256
    !== EXPECTED_ROW_DATASET_FINGERPRINT
  ) {
    throw new Error('Integration row dataset fingerprint changed.');
  }
  const inventoryRows = await loadRowsFromDescriptor(
    inventory.content.row_dataset,
  );
  const { payload } = await buildWriterV2Plan();
  const manifestRows = buildAcquisitionManifestRows(
    inventoryRows,
    payload.rows.card_print_rows,
  );
  const canarySelection = selectCanaryRows(manifestRows);
  const rawCanaryResults = await mapLimit(
    canarySelection,
    options.concurrency,
    (row) => inspectCanaryRow(row, options),
  );
  const duplicateReview = applyDuplicateReview(rawCanaryResults);
  const canaryResults = duplicateReview.rows;
  const manifestSummary = summarizeManifest(
    manifestRows,
    canarySelection,
  );
  const canarySummary = summarizeCanary(
    canaryResults,
    duplicateReview.duplicateHashes,
  );

  const generatedAt = new Date().toISOString();
  const retrieval = {
    access_mode: 'verified_local_scope_plus_bounded_https_download_canary',
    database_reads: false,
    database_writes: false,
    source_fetches: true,
    storage_access: false,
    storage_writes: false,
    local_cache_writes: true,
  };
  await fs.mkdir(options.outputRoot, { recursive: true });
  const manifestDataset = await writeShardedRows({
    outputRoot: options.outputRoot,
    datasetKey: 'jpn_image_acquisition_manifest_rows_v1',
    packageId: IMAGE_ACQUISITION_READINESS_VERSION,
    rows: manifestRows,
    generatedAt,
    retrieval,
  });
  const canaryDataset = await writeShardedRows({
    outputRoot: options.outputRoot,
    datasetKey: 'jpn_image_download_canary_rows_v1',
    packageId: IMAGE_ACQUISITION_READINESS_VERSION,
    rows: canaryResults,
    generatedAt,
    retrieval,
  });
  const report = {
    generated_at: generatedAt,
    readiness_version: IMAGE_ACQUISITION_READINESS_VERSION,
    status: 'manifest_and_local_download_canary_complete',
    source: {
      integration_inventory_content_fingerprint_sha256:
        inventory.content_fingerprint_sha256,
      integration_row_dataset_fingerprint_sha256:
        inventory.content.row_dataset.content_fingerprint_sha256,
      writer_payload_fingerprint_sha256:
        inventory.content.source.writer_payload_fingerprint_sha256,
    },
    manifest_summary: manifestSummary,
    canary_summary: canarySummary,
    manifest_dataset: manifestDataset,
    canary_dataset: canaryDataset,
    canary_selection_fingerprint_sha256:
      contentFingerprint(canarySelection.map((row) => ({
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        primary_source: row.primary_source,
        fallback_source: row.fallback_source,
      }))),
    cache: {
      root: path.relative(process.cwd(), options.cacheDir).replaceAll('\\', '/'),
      committed: false,
      local_only: true,
    },
    execution_boundary: {
      database_reads: false,
      database_writes: false,
      storage_reads: false,
      storage_writes: false,
      source_fetches: true,
      local_cache_writes: true,
      image_pointer_writes: false,
      child_printing_writes: false,
      family_promotion: false,
      scanner_writes: false,
    },
  };
  await writeJsonArtifact(
    path.join(options.outputRoot, 'jpn_image_acquisition_readiness_v1.json'),
    buildArtifact({
      packageId: IMAGE_ACQUISITION_READINESS_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_image_acquisition_readiness_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status: report.status,
    manifest_summary: manifestSummary,
    canary_summary: canarySummary,
    output_root: options.outputRoot,
  }));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
