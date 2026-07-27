import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  contentFingerprint,
  stableJson,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-LINK-HARVEST-V1';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/official_product_links';
const CORPUS_SOURCE_ROWS =
  'docs/audits/japanese_master_index_v5/product_corpus/'
  + 'jpn_v5_official_product_source_rows_corpus_v1.jsonl';
const REQUEST_DELAY_MS = 1_500;

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

function canonicalRequestUrl(value) {
  const url = new URL(value);
  if (url.hostname !== 'www.pokemon-card.com') {
    throw new Error(`Unapproved official source host: ${url.hostname}`);
  }
  url.hash = '';
  return url.toString();
}

function fileToken(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 20);
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stableJson(value));
}

async function capture({
  offline,
  outputRoot,
  sourceUrl,
}) {
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
  if (offline) {
    throw new Error(`Offline snapshot missing: ${requestUrl}`);
  }

  const fetchedAt = new Date().toISOString();
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
  const metadata = {
    generator_version: GENERATOR_VERSION,
    capture_mode: 'live_fetch',
    fetched_at: fetchedAt,
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
  if (!response.ok) {
    throw new Error(
      `Official product link returned ${response.status}: ${requestUrl}`,
    );
  }
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
  const products = readJsonl(CORPUS_SOURCE_ROWS)
    .filter((row) => row.link_card_list);
  const productsByUrl = new Map();
  for (const product of products) {
    const url = canonicalRequestUrl(product.link_card_list);
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
          registry_key: row.release_key,
          product_name: row.product_name,
          source_fragment: new URL(row.link_card_list).hash || null,
        }))
        .sort((left, right) =>
          left.registry_key.localeCompare(right.registry_key)),
    });
    if (!args.quiet) {
      console.log(
        `[jpn-v5][official-product-link] ${index + 1}/`
        + `${productsByUrl.size} ${captured.captureMode} ${sourceUrl}`,
      );
    }
  }

  const generatedAt = snapshots
    .map((row) => row.metadata.fetched_at)
    .sort()
    .at(-1);
  const manifest = {
    generator_version: GENERATOR_VERSION,
    generated_at: generatedAt,
    status: 'official_product_card_list_snapshots_preserved',
    source_product_count: products.length,
    unique_request_url_count: productsByUrl.size,
    snapshot_origin_live_fetch_count:
      snapshots.filter((row) => row.capture_mode === 'live_fetch').length,
    request_delay_ms: REQUEST_DELAY_MS,
    snapshots,
    boundary: {
      approved_source_host: 'www.pokemon-card.com',
      database_access: false,
      storage_access: false,
      production_writes: false,
      pricing_access: false,
    },
  };
  const manifestPath = path.join(
    outputRoot,
    'jpn_v5_official_product_link_snapshot_manifest_v1.json',
  );
  await writeJson(manifestPath, manifest);
  await writeJson(
    path.join(
      outputRoot,
      'jpn_v5_official_product_link_snapshot_fingerprint_v1.json',
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
      snapshot_origin_live_fetch_count:
        manifest.snapshot_origin_live_fetch_count,
      network_request_count_this_run: requestCount,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
