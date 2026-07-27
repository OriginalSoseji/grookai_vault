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
  parseBulbapediaJapaneseExpansions,
  parseLimitlessJapaneseSets,
  parseOfficialJapaneseProducts,
  parsePokeGuardianJapaneseSetIndex,
  parseSerebiiJapaneseSets,
  parseTcgCollectorJapaneseSets,
  parseTcgdexJapaneseSets,
} from './set_source_parsers_v1.mjs';

const PACKAGE_ID = 'JPN-MASTER-INDEX-V4-SET-REGISTRY-HARVEST-V1';
const DEFAULT_OUTPUT_DIRECTORY = 'docs/audits/japanese_master_index_v4/sets';
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
const SPECIAL_SOURCE_IDS = new Set([
  'official_jp_products',
  'pokeguardian_jp_sets',
]);

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
  {
    id: 'serebii_jp_sets',
    url: 'https://www.serebii.net/card/japanese.shtml',
    extension: 'html',
    parser: parseSerebiiJapaneseSets,
  },
  {
    id: 'bulbapedia_jp_expansions',
    url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Japanese_TCG_Expansions',
    extension: 'html',
    parser: parseBulbapediaJapaneseExpansions,
  },
];

const SOURCE_POLICIES = [
  {
    source_id: 'official_jp_products',
    automated_index_capture: 'admitted',
    boundary: 'Published product result API; bounded pagination only.',
    robots_url: 'https://www.pokemon-card.com/robots.txt',
    terms_url: null,
  },
  {
    source_id: 'tcgdex_ja_sets',
    automated_index_capture: 'admitted',
    boundary: 'Published Japanese set API; one collection request.',
    robots_url: 'https://api.tcgdex.net/robots.txt',
    terms_url: 'https://tcgdex.dev/',
  },
  {
    source_id: 'limitless_jp_sets',
    automated_index_capture: 'admitted',
    automated_card_capture: 'admitted_bounded_factual_metadata_only',
    boundary:
      'Public Japanese set index and server-rendered set checklists; one request per set, factual card fields and image references only, displayed prices ignored, no card-detail crawl.',
    robots_url: 'https://limitlesstcg.com/robots.txt',
    terms_url: null,
  },
  {
    source_id: 'artofpkm_jp_sets',
    automated_index_capture: 'admitted',
    automated_card_capture: 'admitted_bounded_factual_metadata_only',
    boundary:
      'Public set index and server-rendered set checklists; one request per set, factual card coordinates and image references only, no image download, prose reuse, or card-detail crawl.',
    robots_url: 'https://www.artofpkm.com/robots.txt',
    terms_url: 'https://www.artofpkm.com/disclaimer',
  },
  {
    source_id: 'tcgcollector_jp_sets',
    automated_index_capture: 'admitted',
    automated_card_capture: 'blocked_without_written_permission',
    boundary:
      'The public Japanese set index was captured once. Card/API acquisition is not automated because the API is partner-only and the published license does not authorize this commercial reuse.',
    robots_url: 'https://www.tcgcollector.com/robots.txt',
    terms_url: 'https://www.tcgcollector.com/legal/terms-of-service',
  },
  {
    source_id: 'serebii_jp_sets',
    automated_index_capture: 'admitted',
    boundary:
      'robots.txt permits the Japanese card index; one collection request.',
    robots_url: 'https://www.serebii.net/robots.txt',
    terms_url: null,
  },
  {
    source_id: 'bulbapedia_jp_expansions',
    automated_index_capture: 'admitted',
    boundary:
      'robots.txt allows /wiki/ with a five-second crawl delay; one article request.',
    robots_url: 'https://bulbapedia.bulbagarden.net/robots.txt',
    terms_url: 'https://bulbapedia.bulbagarden.net/wiki/Bulbapedia:Copyrights',
  },
  {
    source_id: 'pokeguardian_jp_sets',
    automated_index_capture: 'admitted',
    boundary:
      'Three server-rendered pages from one public set-list index; no article crawl.',
    robots_url: 'https://www.pokeguardian.com/robots.txt',
    terms_url: null,
  },
  {
    source_id: 'pokellector_jp_sets',
    automated_index_capture: 'blocked_without_written_permission',
    boundary:
      'Terms prohibit automated interaction with stored data; preserve as a manual-review lane only.',
    robots_url: 'https://jp.pokellector.com/robots.txt',
    terms_url: 'https://www.pokellector.com/terms',
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
      !SPECIAL_SOURCE_IDS.has(sourceId) &&
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
    if (seen.has(key))
      throw new Error(`Duplicate source set assertion: ${key}`);
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
  const url = new URL('https://www.pokemon-card.com/products/resultAPI.php');
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
    if (Number.isSafeInteger(expectedCount) && expectedCount !== actualCount) {
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

function pokeGuardianPagination(body) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const elementMatch = html.match(
    /<div\b[^>]*\bdata-jw-element-id="(?<id>\d+)"[^>]*\bclass="[^"]*\bjw-news\b[^"]*"/i,
  );
  const totalMatch = html.match(
    /<nav\b[^>]*\bclass="jw-pagination"[^>]*\bdata-page-total="(?<total>\d+)"/i,
  );
  const elementId = elementMatch?.groups?.id;
  const pageTotal = Number(totalMatch?.groups?.total ?? 1);
  if (
    !elementId ||
    !Number.isSafeInteger(pageTotal) ||
    pageTotal < 1 ||
    pageTotal > 10
  ) {
    throw new Error(
      `PokeGuardian pagination metadata is invalid: element=${elementId ?? 'missing'} pages=${totalMatch?.groups?.total ?? 'missing'}`,
    );
  }
  return { elementId, pageTotal };
}

function pokeGuardianUrl(elementId, zeroBasedPage) {
  const url = new URL(
    'https://www.pokeguardian.com/sets/set-lists/japanese-sets',
  );
  if (zeroBasedPage > 0) {
    url.searchParams.set(`ep[${elementId}][page]`, String(zeroBasedPage));
  }
  return url.toString();
}

async function pokeGuardianSnapshot({
  options,
  rawDirectory,
  page,
  elementId,
}) {
  const sourceId = `pokeguardian_jp_sets_page_${String(page + 1).padStart(2, '0')}`;
  return options.offline
    ? readSourceSnapshot({
        sourceId,
        outputDirectory: rawDirectory,
        extension: 'html',
      })
    : captureSourceSnapshot({
        sourceId,
        url: pokeGuardianUrl(elementId, page),
        outputDirectory: rawDirectory,
        extension: 'html',
      });
}

async function harvestPokeGuardian({ options, rawDirectory }) {
  const first = await pokeGuardianSnapshot({
    options,
    rawDirectory,
    page: 0,
    elementId: null,
  });
  const pagination = pokeGuardianPagination(first.body);
  const snapshots = [first];
  for (let page = 1; page < pagination.pageTotal; page += 1) {
    if (!options.offline) await sleep(SOURCE_REQUEST_INTERVAL_MS);
    snapshots.push(
      await pokeGuardianSnapshot({
        options,
        rawDirectory,
        page,
        elementId: pagination.elementId,
      }),
    );
  }
  const assertions = parsePokeGuardianJapaneseSetIndex(
    Buffer.concat(
      snapshots.flatMap((snapshot, index) =>
        index === 0
          ? [snapshot.body]
          : [Buffer.from('\n', 'utf8'), snapshot.body],
      ),
    ),
  );
  ensureUniqueSourceIds(assertions);
  return {
    source: {
      id: 'pokeguardian_jp_sets',
      url: 'https://www.pokeguardian.com/sets/set-lists/japanese-sets',
    },
    metadata: {
      snapshot_version: 'JPN-MASTER-INDEX-MULTIPAGE-SOURCE-SNAPSHOT-V1',
      source_id: 'pokeguardian_jp_sets',
      request_url: 'https://www.pokeguardian.com/sets/set-lists/japanese-sets',
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

  if (
    options.sourceIds.length === 0 ||
    options.sourceIds.includes('pokeguardian_jp_sets')
  ) {
    const pokeGuardian = await harvestPokeGuardian({
      options,
      rawDirectory,
    });
    sourceResults.push(pokeGuardian);
    console.log(
      `[jpn-master-index][sets] pokeguardian_jp_sets: ${pokeGuardian.assertions.length} assertions (${options.offline ? 'offline replay' : 'live capture'})`,
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
  const sourcePolicyArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      policies: SOURCE_POLICIES,
      blocked_automated_sources: SOURCE_POLICIES.filter(
        (policy) => policy.automated_index_capture !== 'admitted',
      ).map((policy) => policy.source_id),
      blocked_automated_card_sources: SOURCE_POLICIES.filter(
        (policy) =>
          policy.automated_card_capture ===
          'blocked_without_written_permission',
      ).map((policy) => policy.source_id),
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
  const sourcePolicyRecord = await writeJsonArtifact(
    path.join(outputDirectory, 'source_policy_v1.json'),
    sourcePolicyArtifact,
  );
  const manifestArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      raw_snapshots: sourceResults.flatMap(
        (result) => result.metadata.child_snapshots ?? [result.metadata],
      ),
      normalized_artifacts: [assertionRecord, healthRecord, sourcePolicyRecord],
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
  SOURCE_POLICIES,
  harvest,
  parseArgs,
};

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));
if (isEntrypoint) {
  harvest(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error('[jpn-master-index][sets] fatal:', error);
    process.exitCode = 1;
  });
}
