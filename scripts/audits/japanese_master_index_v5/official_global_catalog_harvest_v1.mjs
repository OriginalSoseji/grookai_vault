import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  buildArtifact,
  contentFingerprint,
  writeJsonArtifact,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  captureSourceSnapshot,
  readSourceSnapshot,
} from '../japanese_master_index_v4/source_snapshot_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-GLOBAL-CATALOG-HARVEST-V1';
const GENERATED_AT = '2026-07-28T00:30:00.000Z';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/official_global_catalog';
const REQUEST_DELAY_MS = 750;

function parseArgs(argv) {
  const result = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    offline: false,
    quiet: false,
    maxPages: null,
  };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
    } else if (value.startsWith('--max-pages=')) {
      result.maxPages = Number.parseInt(
        value.slice('--max-pages='.length),
        10,
      );
      if (!Number.isSafeInteger(result.maxPages) || result.maxPages < 1) {
        throw new Error('--max-pages must be a positive integer');
      }
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function pageUrl(page) {
  const url = new URL(
    'https://www.pokemon-card.com/card-search/resultAPI.php',
  );
  url.search = new URLSearchParams({
    keyword: '',
    se_ta: '',
    regulation_sidebar_form: 'all',
    pg: '',
    illust: '',
    sm_and_keyword: 'true',
    page: String(page),
  }).toString();
  return url.toString();
}

function absoluteOfficialUrl(value) {
  return new URL(
    String(value ?? ''),
    'https://www.pokemon-card.com',
  ).toString();
}

function imageSetCode(value) {
  let pathname;
  try {
    pathname = new URL(
      String(value ?? ''),
      'https://www.pokemon-card.com',
    ).pathname;
  } catch {
    return null;
  }
  const match = pathname.match(/\/card_images\/large\/(?<code>[^/]*)\//i);
  return match?.groups?.code?.trim() || null;
}

function parsePage(body, expectedPage) {
  const payload = JSON.parse(body.toString('utf8'));
  if (!payload || Number(payload.result) !== 1) {
    throw new Error(
      `Official global catalog page ${expectedPage} failed: `
      + `${payload?.errMsg ?? 'unknown error'}`,
    );
  }
  const thisPage = Number(payload.thisPage);
  const maxPage = Number(payload.maxPage);
  const hitCount = Number(payload.hitCnt);
  if (thisPage !== expectedPage) {
    throw new Error(
      `Official global page mismatch: ${thisPage} != ${expectedPage}`,
    );
  }
  if (!Number.isSafeInteger(maxPage) || maxPage < 1) {
    throw new Error(`Invalid max page on official page ${expectedPage}`);
  }
  if (!Number.isSafeInteger(hitCount) || hitCount < 1) {
    throw new Error(`Invalid hit count on official page ${expectedPage}`);
  }
  const seen = new Set();
  const cards = [];
  for (const row of Array.isArray(payload.cardList) ? payload.cardList : []) {
    const cardId = String(row.cardID ?? '').trim();
    if (!/^\d+$/.test(cardId)) {
      throw new Error(
        `Official global page ${expectedPage} has invalid card id`,
      );
    }
    if (seen.has(cardId)) {
      throw new Error(
        `Official global page ${expectedPage} repeats card ${cardId}`,
      );
    }
    seen.add(cardId);
    const imageUrl = absoluteOfficialUrl(row.cardThumbFile);
    cards.push({
      official_card_id: cardId,
      printed_name: String(
        row.cardNameAltText ?? row.cardNameViewText ?? '',
      ).normalize('NFC').trim() || null,
      image_url: imageUrl,
      image_set_code: imageSetCode(imageUrl),
      result_page: expectedPage,
    });
  }
  return {
    cards,
    hit_count: hitCount,
    max_page: maxPage,
    this_page: thisPage,
  };
}

async function readOrCapturePage({
  offline,
  outputRoot,
  page,
}) {
  const sourceId = `global_search_page_${String(page).padStart(4, '0')}`;
  const rawDirectory = path.join(outputRoot, 'raw');
  try {
    const snapshot = await readSourceSnapshot({
      sourceId,
      outputDirectory: rawDirectory,
      extension: 'json',
    });
    return { ...snapshot, networkRequest: false, sourceId };
  } catch (error) {
    if (offline) {
      throw new Error(
        `Offline snapshot unavailable for page ${page}: ${error.message}`,
      );
    }
  }
  const snapshot = await captureSourceSnapshot({
    sourceId,
    url: pageUrl(page),
    outputDirectory: rawDirectory,
    extension: 'json',
  });
  return { ...snapshot, networkRequest: true, sourceId };
}

function relativePath(value) {
  return path.relative(process.cwd(), value).replaceAll('\\', '/');
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const first = await readOrCapturePage({
    offline: args.offline,
    outputRoot,
    page: 1,
  });
  const firstPage = parsePage(first.body, 1);
  const pagesToCapture = Math.min(
    firstPage.max_page,
    args.maxPages ?? firstPage.max_page,
  );
  const pageProofs = [];
  const cardsById = new Map();
  let networkRequestCount = 0;

  for (let page = 1; page <= pagesToCapture; page += 1) {
    const captured = page === 1
      ? first
      : await readOrCapturePage({
        offline: args.offline,
        outputRoot,
        page,
      });
    if (captured.networkRequest) {
      networkRequestCount += 1;
    }
    const parsed = page === 1 ? firstPage : parsePage(captured.body, page);
    if (parsed.hit_count !== firstPage.hit_count
        || parsed.max_page !== firstPage.max_page) {
      throw new Error(
        `Official catalog changed during capture at page ${page}: `
        + `${parsed.hit_count}/${parsed.max_page} != `
        + `${firstPage.hit_count}/${firstPage.max_page}`,
      );
    }
    for (const card of parsed.cards) {
      const prior = cardsById.get(card.official_card_id);
      if (prior) {
        if (contentFingerprint(prior) !== contentFingerprint(card)) {
          throw new Error(
            `Official card ${card.official_card_id} changed across pages`,
          );
        }
        throw new Error(
          `Official card ${card.official_card_id} repeats across pages`,
        );
      }
      cardsById.set(card.official_card_id, card);
    }
    pageProofs.push({
      page,
      card_count: parsed.cards.length,
      raw_snapshot_ref: relativePath(
        path.join(
          canonicalRoot,
          'raw',
          `${captured.sourceId}_v1.json`,
        ),
      ),
      raw_snapshot_sha256: captured.metadata.body_sha256,
      retrieved_at: captured.metadata.fetched_at,
    });
    if (!args.quiet && (page === 1 || page % 25 === 0
        || page === pagesToCapture)) {
      console.log(
        `[jpn-v5][official-global] page=${page}/${pagesToCapture} `
        + `cards=${cardsById.size}/${firstPage.hit_count} `
        + `network=${networkRequestCount}`,
      );
    }
    if (captured.networkRequest && page < pagesToCapture) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const complete = pagesToCapture === firstPage.max_page;
  const cards = [...cardsById.values()].sort((left, right) =>
    Number(left.official_card_id) - Number(right.official_card_id));
  if (complete && cards.length !== firstPage.hit_count) {
    throw new Error(
      `Official catalog count mismatch: ${cards.length} != `
      + `${firstPage.hit_count}`,
    );
  }
  const retrieval = {
    mode: 'preserved_source_capture',
    source_base_url: 'https://www.pokemon-card.com/card-search',
    request_delay_ms: REQUEST_DELAY_MS,
    max_page_reported: firstPage.max_page,
    hit_count_reported: firstPage.hit_count,
  };
  const executionBoundary = {
    database_reads: false,
    database_writes: false,
    detail_page_requests: false,
    image_downloads: false,
    pricing_writes: false,
    production_writes: false,
    storage_writes: false,
  };
  await writeJsonArtifact(
    path.join(outputRoot, 'official_jp_global_card_discovery_v1.json.gz'),
    buildArtifact({
      packageId: GENERATOR_VERSION,
      generatedAt: GENERATED_AT,
      retrieval,
      content: {
        status: complete
          ? 'official_global_catalog_complete'
          : 'official_global_catalog_bounded_partial',
        cards,
        page_proofs: pageProofs,
        execution_boundary: executionBoundary,
      },
    }),
  );
  await writeJsonArtifact(
    path.join(outputRoot, 'official_jp_global_catalog_health_v1.json'),
    buildArtifact({
      packageId: `${GENERATOR_VERSION}-HEALTH`,
      generatedAt: GENERATED_AT,
      retrieval,
      content: {
        status: complete ? 'complete' : 'bounded_partial',
        reported_hit_count: firstPage.hit_count,
        reported_max_page: firstPage.max_page,
        captured_page_count: pagesToCapture,
        unique_card_count: cards.length,
        cards_with_image_set_code:
          cards.filter((row) => row.image_set_code).length,
        cards_without_image_set_code:
          cards.filter((row) => !row.image_set_code).length,
        image_set_code_counts: Object.fromEntries(
          [...cards.reduce((counts, row) => {
            const key = row.image_set_code ?? '__missing__';
            counts.set(key, (counts.get(key) ?? 0) + 1);
            return counts;
          }, new Map())]
            .sort(([left], [right]) => left.localeCompare(right)),
        ),
        execution_boundary: executionBoundary,
      },
    }),
  );

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: complete
        ? 'official_global_catalog_complete'
        : 'official_global_catalog_bounded_partial',
      reported_hit_count: firstPage.hit_count,
      captured_page_count: pagesToCapture,
      unique_card_count: cards.length,
      network_request_count_this_run: networkRequestCount,
      database_writes: false,
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
