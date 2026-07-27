import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-DETAIL-PAGE-HARVEST-V1';
const AS_OF_DATE = '2026-07-27';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/official_product_detail_pages';
const FOLLOWUP_QUEUE =
  'docs/audits/japanese_master_index_v5/product_corpus_reconciliation/'
  + 'jpn_v5_official_product_evidence_followup_queue_v1.jsonl';
const COMPLETED_PRODUCTS =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_identity_resolution/'
  + 'jpn_v5_official_product_scope_dispositions_v1.jsonl';
const REQUEST_DELAY_MS = 1_500;
const APPROVED_HOSTS = new Set([
  'www.pokemon-card.com',
  'www.30th.pokemon-card.com',
]);

function parseArgs(argv) {
  const result = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    offline: false,
    quiet: false,
  };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
    } else if (value === '--offline') {
      result.offline = true;
    } else if (value === '--quiet') {
      result.quiet = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  return result;
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalRequestUrl(value) {
  const url = new URL(value);
  if (!APPROVED_HOSTS.has(url.hostname)) {
    throw new Error(`Unapproved official source host: ${url.hostname}`);
  }
  url.hash = '';
  return url.toString();
}

function normalizedReleaseDate(value) {
  const match = String(value ?? '').match(
    /(?<year>\d{4})年\s*(?<month>\d{1,2})月\s*(?<day>\d{1,2})日/,
  );
  if (!match) return null;
  return [
    match.groups.year,
    match.groups.month.padStart(2, '0'),
    match.groups.day.padStart(2, '0'),
  ].join('-');
}

function fileToken(url) {
  return hash(url).slice(0, 20);
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stableJson(value));
}

async function capture({ offline, outputRoot, sourceUrl }) {
  const requestUrl = canonicalRequestUrl(sourceUrl);
  const token = fileToken(requestUrl);
  const bodyPath = path.join(outputRoot, 'raw', `${token}.html`);
  const metadataPath = path.join(outputRoot, 'raw', `${token}.http.json`);
  const bodyExists = fs.existsSync(bodyPath);
  const metadataExists = fs.existsSync(metadataPath);
  if (bodyExists && metadataExists) {
    const body = await fsp.readFile(bodyPath);
    const metadata = JSON.parse(await fsp.readFile(metadataPath, 'utf8'));
    if (metadata.body_sha256 !== hash(body)) {
      throw new Error(`Snapshot hash mismatch: ${bodyPath}`);
    }
    return {
      bodyPath,
      captureMode: metadata.capture_mode ?? 'live_fetch',
      metadata,
      networkRequest: false,
    };
  }
  if (bodyExists !== metadataExists) {
    throw new Error(`Incomplete preserved snapshot: ${requestUrl}`);
  }
  if (offline) throw new Error(`Offline snapshot missing: ${requestUrl}`);

  const response = await fetch(requestUrl, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ja,en;q=0.8',
      'user-agent':
        'GrookaiVault-JapaneseMasterIndex/5.0 '
        + '(evidence acquisition; contact hello@grookaivault.com)',
    },
    redirect: 'follow',
  });
  const body = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(
      `Official product detail returned ${response.status}: ${requestUrl}`,
    );
  }
  const metadata = {
    generator_version: GENERATOR_VERSION,
    capture_mode: 'live_fetch',
    fetched_at: new Date().toISOString(),
    request_url: requestUrl,
    final_url: response.url,
    http_status: response.status,
    response_headers: {
      cache_control: response.headers.get('cache-control'),
      content_length: response.headers.get('content-length'),
      content_type: response.headers.get('content-type'),
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified'),
    },
    body_bytes: body.byteLength,
    body_sha256: hash(body),
  };
  await fsp.mkdir(path.dirname(bodyPath), { recursive: true });
  await fsp.writeFile(bodyPath, body);
  await writeJson(metadataPath, metadata);
  return {
    bodyPath,
    captureMode: 'live_fetch',
    metadata,
    networkRequest: true,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const completed = new Set(
    readJsonl(COMPLETED_PRODUCTS).map((row) => row.product_registry_key),
  );
  const futureProducts = [];
  const products = readJsonl(FOLLOWUP_QUEUE)
    .filter((row) => row.next_evidence_lane === 'official_product_detail')
    .filter((row) => !completed.has(row.registry_key))
    .filter((row) => {
      const releaseDate = normalizedReleaseDate(row.release_date);
      if (releaseDate && releaseDate > AS_OF_DATE) {
        futureProducts.push(row);
        return false;
      }
      return true;
    });

  const productsByUrl = new Map();
  for (const product of products) {
    const url = canonicalRequestUrl(product.link_detail_page);
    const values = productsByUrl.get(url) ?? [];
    values.push(product);
    productsByUrl.set(url, values);
  }

  const snapshots = [];
  let requestCount = 0;
  for (const [index, [sourceUrl, sourceProducts]] of [
    ...productsByUrl,
  ].sort(([left], [right]) => left.localeCompare(right)).entries()) {
    if (requestCount > 0) await sleep(REQUEST_DELAY_MS);
    const captured = await capture({
      offline: args.offline,
      outputRoot,
      sourceUrl,
    });
    if (captured.networkRequest) requestCount += 1;
    snapshots.push({
      source_url: sourceUrl,
      body_path: path.relative(process.cwd(), captured.bodyPath)
        .replaceAll('\\', '/'),
      capture_mode: captured.captureMode,
      metadata: captured.metadata,
      products: sourceProducts
        .map((row) => ({
          registry_key: row.registry_key,
          product_name: row.product_name,
          release_date: row.release_date,
          source_fragment: new URL(row.link_detail_page).hash || null,
        }))
        .sort((left, right) =>
          left.registry_key.localeCompare(right.registry_key)),
    });
    if (!args.quiet) {
      console.log(
        `[jpn-v5][official-product-detail] ${index + 1}/`
        + `${productsByUrl.size} ${captured.captureMode} ${sourceUrl}`,
      );
    }
  }

  const generatedAt = snapshots
    .map((row) => row.metadata.fetched_at)
    .sort()
    .at(-1) ?? null;
  const manifest = {
    generator_version: GENERATOR_VERSION,
    generated_at: generatedAt,
    status: 'official_product_detail_pages_preserved',
    as_of_date: AS_OF_DATE,
    source_product_count: products.length,
    unique_request_url_count: productsByUrl.size,
    future_product_exclusion_count: futureProducts.length,
    completed_product_exclusion_count: completed.size,
    request_delay_ms: REQUEST_DELAY_MS,
    snapshots,
    future_product_exclusions: futureProducts
      .map((row) => ({
        registry_key: row.registry_key,
        product_name: row.product_name,
        release_date: row.release_date,
      }))
      .sort((left, right) =>
        left.registry_key.localeCompare(right.registry_key)),
    boundary: {
      approved_source_hosts: [...APPROVED_HOSTS].sort(),
      database_access: false,
      storage_access: false,
      production_writes: false,
      pricing_access: false,
    },
  };
  const manifestPath = path.join(
    outputRoot,
    'jpn_v5_official_product_detail_page_manifest_v1.json',
  );
  await writeJson(manifestPath, manifest);
  await writeJson(
    path.join(
      outputRoot,
      'jpn_v5_official_product_detail_page_fingerprint_v1.json',
    ),
    {
      generator_version: GENERATOR_VERSION,
      generated_at: generatedAt,
      manifest_sha256: hash(await fsp.readFile(manifestPath)),
      snapshot_content_sha256: contentFingerprint(
        snapshots.map((row) => ({
          request_url: row.metadata.request_url,
          body_sha256: row.metadata.body_sha256,
          products: row.products,
        })),
      ),
    },
  );

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: manifest.status,
      source_product_count: manifest.source_product_count,
      unique_request_url_count: manifest.unique_request_url_count,
      future_product_exclusion_count:
        manifest.future_product_exclusion_count,
      network_request_count_this_run: requestCount,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
