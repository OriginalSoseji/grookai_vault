import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildArtifact,
  contentFingerprint,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import { assertAuditOnlyArgs } from './read_only_guard_v1.mjs';
import {
  captureSourceSnapshot,
  readSourceSnapshot,
} from './source_snapshot_v1.mjs';
import {
  PARSER_VERSION,
  parseArtOfPkmJapaneseSets,
  parseLimitlessJapaneseSets,
  parseOfficialJapaneseProducts,
  parseTcgCollectorJapaneseSets,
  parseTcgdexJapaneseSets,
} from './set_source_parsers_v1.mjs';

const PACKAGE_ID = 'JPN-MASTER-INDEX-V4-SET-REGISTRY-HARVEST-V1';
const DEFAULT_OUTPUT_DIRECTORY =
  'docs/audits/japanese_master_index_v4/sets';
const OFFICIAL_PRODUCT_TYPES = ['expansion', 'construction', 'others'];
const OFFICIAL_PRODUCT_QUERY = {
  dateLowerY: 1996,
  dateLowerM: 1,
  dateLowerD: 1,
  dateUpperY: 2099,
  dateUpperM: 12,
  dateUpperD: 31,
};
const SOURCE_REQUEST_INTERVAL_MS = 750;

const SOURCES = [
  {
    id: 'tcgdex_ja_sets',
    url: 'https://api.tcgdex.net/v2/ja/sets',
    extension: 'json',
    parser: parseTcgdexJapaneseSets,
  },
  {
    id: 'limitless_jp_sets',
    url: 'https://limitlesstcg.com/cards/jp',
    extension: 'html',
    parser: parseLimitlessJapaneseSets,
  },
  {
    id: 'artofpkm_jp_sets',
    url: 'https://www.artofpkm.com/sets',
    extension: 'html',
    parser: parseArtOfPkmJapaneseSets,
  },
  {
    id: 'tcgcollector_jp_sets',
    url: 'https://www.tcgcollector.com/sets/jp',
    extension: 'html',
    parser: parseTcgCollectorJapaneseSets,
  },
];

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseArgs(argv) {
  const options = {
    offline: false,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    sourceIds: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--offline') {
      options.offline = true;
    } else if (token === '--output-dir' && argv[index + 1]) {
      options.outputDirectory = argv[++index];
    } else if (token === '--source' && argv[index + 1]) {
      options.sourceIds.push(argv[++index]);
    }
  }
  return options;
}

function selectedSources(sourceIds) {
  if (sourceIds.length === 0) return SOURCES;
  const allowed = new Set(sourceIds);
  const selected = SOURCES.filter((source) => allowed.has(source.id));
  const unknown = sourceIds.filter(
    (sourceId) =>
      sourceId !== 'official_jp_products' &&
      !SOURCES.some((source) => source.id === sourceId),
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown source ids: ${unknown.join(', ')}`);
  }
  return selected;
}

function ensureUniqueSourceIds(assertions) {
  const seen = new Set();
  for (const row of assertions) {
    const key = `${row.source_id}:${row.source_set_id}`;
    if (seen.has(key)) throw new Error(`Duplicate source set assertion: ${key}`);
    seen.add(key);
  }
}

function sortAssertions(assertions) {
  return [...assertions].sort(
    (left, right) =>
      left.source_id.localeCompare(right.source_id) ||
      left.source_set_id.localeCompare(right.source_set_id, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
  );
}

function officialProductUrl(productType, page) {
  const url = new URL(
    'https://www.pokemon-card.com/products/resultAPI.php',
  );
  url.searchParams.set('productType', productType);
  for (const [key, value] of Object.entries(OFFICIAL_PRODUCT_QUERY)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set('page', String(page));
  return url.toString();
}

async function officialProductSnapshot({
  options,
  rawDirectory,
  productType,
  page,
}) {
  const sourceId = `official_jp_products_${productType}_page_${String(page).padStart(2, '0')}`;
  return options.offline
    ? readSourceSnapshot({
        sourceId,
        outputDirectory: rawDirectory,
        extension: 'json',
      })
    : captureSourceSnapshot({
        sourceId,
        url: officialProductUrl(productType, page),
        outputDirectory: rawDirectory,
        extension: 'json',
      });
}

async function harvestOfficialProducts({ options, rawDirectory }) {
  const snapshots = [];
  const assertions = [];
  let ordinal = 0;

  for (const productType of OFFICIAL_PRODUCT_TYPES) {
    const typeStart = assertions.length;
    const first = await officialProductSnapshot({
      options,
      rawDirectory,
      productType,
      page: 1,
    });
    snapshots.push(first);
    const firstPayload = JSON.parse(first.body.toString('utf8'));
    const maxPage = Number(firstPayload.maxPage);
    if (!Number.isSafeInteger(maxPage) || maxPage < 1 || maxPage > 100) {
      throw new Error(
        `Official Japanese product page count is invalid for ${productType}: ${firstPayload.maxPage}`,
      );
    }
    const firstAssertions = parseOfficialJapaneseProducts(first.body, {
      productType,
      sourceOrdinalOffset: ordinal,
    });
    assertions.push(...firstAssertions);
    ordinal += firstAssertions.length;

    for (let page = 2; page <= maxPage; page += 1) {
      if (!options.offline) await sleep(SOURCE_REQUEST_INTERVAL_MS);
      const snapshot = await officialProductSnapshot({
        options,
        rawDirectory,
        productType,
        page,
      });
      snapshots.push(snapshot);
      const pageAssertions = parseOfficialJapaneseProducts(snapshot.body, {
        productType,
        sourceOrdinalOffset: ordinal,
      });
      assertions.push(...pageAssertions);
      ordinal += pageAssertions.length;
    }

    const expectedCount = Number(firstPayload.hitCnt);
    const actualCount = assertions.length - typeStart;
    if (
      Number.isSafeInteger(expectedCount) &&
      expectedCount !== actualCount
    ) {
      throw new Error(
        `Official Japanese product count mismatch for ${productType}: expected ${expectedCount}, parsed ${actualCount}`,
      );
    }
  }

  ensureUniqueSourceIds(assertions);
  return {
    source: {
      id: 'official_jp_products',
      url: 'https://www.pokemon-card.com/products/',
    },
    metadata: {
      snapshot_version: 'JPN-MASTER-INDEX-MULTIPAGE-SOURCE-SNAPSHOT-V1',
      source_id: 'official_jp_products',
      request_url: 'https://www.pokemon-card.com/products/',
      fetched_at: snapshots[0].metadata.fetched_at,
      http_status: snapshots.every(
        (snapshot) => snapshot.metadata.http_status === 200,
      )
        ? 200
        : null,
      response_headers: {},
      byte_size: snapshots.reduce(
        (sum, snapshot) => sum + snapshot.metadata.byte_size,
        0,
      ),
      body_sha256: contentFingerprint(
        snapshots.map((snapshot) => snapshot.metadata.body_sha256),
      ),
      child_snapshots: snapshots.map((snapshot) => snapshot.metadata),
    },
    assertions,
  };
}

async function harvest(options) {
  assertAuditOnlyArgs(process.argv.slice(2));
  const outputDirectory = path.resolve(options.outputDirectory);
  const rawDirectory = path.join(outputDirectory, 'raw');
  const sources = selectedSources(options.sourceIds);
  const sourceResults = [];

  if (
    options.sourceIds.length === 0 ||
    options.sourceIds.includes('official_jp_products')
  ) {
    const official = await harvestOfficialProducts({ options, rawDirectory });
    sourceResults.push(official);
    console.log(
      `[jpn-master-index][sets] official_jp_products: ${official.assertions.length} assertions (${options.offline ? 'offline replay' : 'live capture'})`,
    );
    if (!options.offline && sources.length > 0) {
      await sleep(SOURCE_REQUEST_INTERVAL_MS);
    }
  }

  for (const source of sources) {
    const snapshot = options.offline
      ? await readSourceSnapshot({
          sourceId: source.id,
          outputDirectory: rawDirectory,
          extension: source.extension,
        })
      : await captureSourceSnapshot({
          sourceId: source.id,
          url: source.url,
          outputDirectory: rawDirectory,
          extension: source.extension,
        });
    const assertions = source.parser(snapshot.body);
    ensureUniqueSourceIds(assertions);
    sourceResults.push({
      source,
      metadata: snapshot.metadata,
      assertions,
    });
    console.log(
      `[jpn-master-index][sets] ${source.id}: ${assertions.length} assertions (${options.offline ? 'offline replay' : 'live capture'})`,
    );
    if (!options.offline && source !== sources.at(-1)) {
      await sleep(SOURCE_REQUEST_INTERVAL_MS);
    }
  }

  const assertions = sortAssertions(
    sourceResults.flatMap((result) => result.assertions),
  );
  ensureUniqueSourceIds(assertions);
  const generatedAt = new Date().toISOString();
  const retrieval = {
    mode: options.offline ? 'offline_replay' : 'live_capture',
    parser_version: PARSER_VERSION,
    sources: sourceResults.map((result) => ({
      source_id: result.source.id,
      request_url: result.source.url,
      fetched_at: result.metadata.fetched_at,
      body_sha256: result.metadata.body_sha256,
      byte_size: result.metadata.byte_size,
      http_status: result.metadata.http_status,
    })),
  };

  const assertionsArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      assertion_count: assertions.length,
      source_counts: sourceResults.map((result) => ({
        source_id: result.source.id,
        assertion_count: result.assertions.length,
      })),
      assertions,
    },
  });
  const healthArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      all_sources_healthy: sourceResults.every(
        (result) => result.metadata.http_status === 200,
      ),
      sources: sourceResults.map((result) => ({
        source_id: result.source.id,
        request_url: result.source.url,
        http_status: result.metadata.http_status,
        fetched_at: result.metadata.fetched_at,
        response_headers: result.metadata.response_headers,
        byte_size: result.metadata.byte_size,
        body_sha256: result.metadata.body_sha256,
        assertion_count: result.assertions.length,
        assertion_fingerprint_sha256: contentFingerprint(result.assertions),
      })),
    },
  });

  const assertionRecord = await writeJsonArtifact(
    path.join(outputDirectory, 'source_set_assertions_v1.json'),
    assertionsArtifact,
  );
  const healthRecord = await writeJsonArtifact(
    path.join(outputDirectory, 'source_health_v1.json'),
    healthArtifact,
  );
  const manifestArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      raw_snapshots: sourceResults.flatMap((result) =>
        result.metadata.child_snapshots ?? [result.metadata],
      ),
      normalized_artifacts: [assertionRecord, healthRecord],
    },
  });
  await writeJsonArtifact(
    path.join(outputDirectory, 'source_manifest_v1.json'),
    manifestArtifact,
  );
  console.log(
    `[jpn-master-index][sets] complete assertions=${assertions.length} fingerprint=${assertionsArtifact.content_fingerprint_sha256}`,
  );
}

export {
  DEFAULT_OUTPUT_DIRECTORY,
  PACKAGE_ID,
  SOURCES,
  OFFICIAL_PRODUCT_TYPES,
  harvest,
  parseArgs,
};

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isEntrypoint) {
  harvest(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error('[jpn-master-index][sets] fatal:', error);
    process.exitCode = 1;
  });
}
