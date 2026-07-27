import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../japanese_master_index_v4/card_assertion_contract_v1.mjs';
import {
  OFFICIAL_JP_CARD_PARSER_VERSION,
  OFFICIAL_JP_SOURCE_FAMILY,
  OFFICIAL_JP_SOURCE_ID,
  parseOfficialJapaneseCardDetail,
} from '../japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs';
import {
  buildArtifact,
  writeJsonArtifact,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  captureSourceSnapshot,
  readSourceSnapshot,
} from '../japanese_master_index_v4/source_snapshot_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-PRODUCT-COORDINATE-SEARCH-HARVEST-V1';
const GENERATED_AT = '2026-07-27T23:30:00.000Z';
const FOLLOWUPS =
  'docs/audits/japanese_master_index_v5/official_product_detail_pages/parsed/'
  + 'jpn_v5_official_product_coordinate_search_followups_v1.jsonl';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_coordinate_search';
const REQUEST_DELAY_MS = 750;

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

function searchUrl(row, page) {
  const url = new URL(
    'https://www.pokemon-card.com/card-search/resultAPI.php',
  );
  url.search = new URLSearchParams({
    keyword: row.printed_name,
    se_ta: '',
    regulation_sidebar_form: 'all',
    pg: '',
    illust: '',
    sm_and_keyword: 'true',
    page: String(page),
  }).toString();
  return url.toString();
}

function detailUrl(cardId) {
  return `https://www.pokemon-card.com/card-search/details.php/card/${
    cardId
  }/regu/all`;
}

function normalizedNumber(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return text;
  return String(Number.parseInt(text, 10));
}

function isTargetSetImage(value, sourceSetCode) {
  let pathname;
  try {
    pathname = new URL(
      String(value ?? ''),
      'https://www.pokemon-card.com',
    ).pathname;
  } catch {
    return false;
  }
  return pathname.toUpperCase().includes(
    `/LARGE/${sourceSetCode.toUpperCase()}/`,
  );
}

function parseSearchPage(body, row, expectedPage) {
  const payload = JSON.parse(body.toString('utf8'));
  if (!payload || Number(payload.result) !== 1) {
    throw new Error(
      `Official search failed for ${row.followup_key}: `
      + `${payload?.errMsg ?? 'unknown error'}`,
    );
  }
  const thisPage = Number(payload.thisPage);
  if (thisPage !== expectedPage) {
    throw new Error(
      `Official search page mismatch for ${row.followup_key}: `
      + `${thisPage} != ${expectedPage}`,
    );
  }
  const candidates = [];
  for (const card of Array.isArray(payload.cardList)
    ? payload.cardList
    : []) {
    const cardId = String(card.cardID ?? '').trim();
    const printedName = String(card.cardNameAltText ?? '')
      .normalize('NFC')
      .trim();
    if (!/^\d+$/.test(cardId)) continue;
    if (printedName !== row.printed_name) continue;
    if (!isTargetSetImage(card.cardThumbFile, row.source_set_code)) continue;
    candidates.push({
      card_id: cardId,
      printed_name: printedName,
      image_url: new URL(
        card.cardThumbFile,
        'https://www.pokemon-card.com',
      ).toString(),
      result_page: thisPage,
    });
  }
  return {
    candidates,
    hit_count: Number(payload.hitCnt ?? 0),
    max_page: Number(payload.maxPage ?? 1),
    this_page: thisPage,
  };
}

async function snapshot({
  extension,
  offline,
  outputRoot,
  sourceId,
  url,
}) {
  const rawDirectory = path.join(outputRoot, 'raw');
  try {
    return await readSourceSnapshot({
      sourceId,
      outputDirectory: rawDirectory,
      extension,
    });
  } catch (error) {
    if (offline) {
      throw new Error(
        `Offline snapshot unavailable for ${sourceId}: ${error.message}`,
      );
    }
  }
  const captured = await captureSourceSnapshot({
    sourceId,
    url,
    outputDirectory: rawDirectory,
    extension,
  });
  await sleep(REQUEST_DELAY_MS);
  return captured;
}

function relativePath(value) {
  return path.relative(process.cwd(), value).replaceAll('\\', '/');
}

function rawBodyPath(outputRoot, sourceId, extension) {
  return path.join(outputRoot, 'raw', `${sourceId}_v1.${extension}`);
}

function assertionFor({
  candidate,
  detail,
  detailSnapshot,
  row,
  searchProofs,
}) {
  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: OFFICIAL_JP_SOURCE_ID,
      source_family: OFFICIAL_JP_SOURCE_FAMILY,
      source_kind: 'official_card_catalog',
      source_external_id: candidate.card_id,
      source_url: detailUrl(candidate.card_id),
      source_container_id:
        `coordinate:${row.source_set_code}:${row.card_number_raw}`,
      source_product_id: null,
      registry_key: row.registry_key,
      language: 'ja',
      parser_version: OFFICIAL_JP_CARD_PARSER_VERSION,
      retrieved_at: detailSnapshot.metadata.fetched_at,
      raw_snapshot_ref: relativePath(
        rawBodyPath(
          path.resolve(DEFAULT_OUTPUT_ROOT),
          `card_${candidate.card_id}`,
          'html',
        ),
      ),
      raw_snapshot_sha256: detailSnapshot.metadata.body_sha256,
      printed_name: detail.printed_name,
      card_number_raw: detail.card_number_raw,
      card_number_numerator: detail.card_number_numerator,
      card_number_denominator: detail.card_number_denominator,
      source_set_code: detail.source_set_code,
      source_set_name: detail.source_product_name,
      source_product_name: row.product_name,
      category: detail.category,
      rarity: detail.rarity,
      illustrator: detail.illustrator,
      hp: detail.hp,
      image_urls: [detail.image_url ?? candidate.image_url].filter(Boolean),
      related_urls: [
        row.source_url,
        detail.source_product_url,
      ].filter(Boolean),
      release_date: row.release_date,
      source_fields: {
        ...detail.source_fields,
        coordinate_followup_key: row.followup_key,
        coordinate_page_image_url: row.page_image_url,
        coordinate_page_snapshot_ref: row.raw_snapshot_ref,
        coordinate_page_snapshot_sha256: row.raw_snapshot_sha256,
        exact_coordinate_validation: true,
        search_hit_count: searchProofs[0]?.hit_count ?? null,
        search_max_page: searchProofs[0]?.max_page ?? null,
        search_result_pages: searchProofs.map((proof) => proof.page),
        search_snapshot_refs: searchProofs.map((proof) => proof.snapshot_ref),
        search_snapshot_sha256: searchProofs.map((proof) => proof.sha256),
      },
    }),
  );
}

async function resolveFollowup({ offline, outputRoot, row }) {
  const searchProofs = [];
  const candidateById = new Map();
  let page = 1;
  let maxPage = 1;
  do {
    const sourceId =
      `search_${row.source_set_code.toLowerCase().replaceAll('-', '_')}_`
      + `${row.card_number_raw}_p${page}`;
    const captured = await snapshot({
      extension: 'json',
      offline,
      outputRoot,
      sourceId,
      url: searchUrl(row, page),
    });
    const parsed = parseSearchPage(captured.body, row, page);
    maxPage = parsed.max_page;
    for (const candidate of parsed.candidates) {
      candidateById.set(candidate.card_id, candidate);
    }
    searchProofs.push({
      page,
      hit_count: parsed.hit_count,
      max_page: parsed.max_page,
      snapshot_ref: relativePath(
        rawBodyPath(
          path.resolve(DEFAULT_OUTPUT_ROOT),
          sourceId,
          'json',
        ),
      ),
      sha256: captured.metadata.body_sha256,
    });
    page += 1;
  } while (page <= maxPage);

  const validated = [];
  const rejected = [];
  for (const candidate of [...candidateById.values()]
    .sort((left, right) => Number(left.card_id) - Number(right.card_id))) {
    const sourceId = `card_${candidate.card_id}`;
    const captured = await snapshot({
      extension: 'html',
      offline,
      outputRoot,
      sourceId,
      url: detailUrl(candidate.card_id),
    });
    const detail = parseOfficialJapaneseCardDetail(
      captured.body,
      candidate.card_id,
    );
    const matches =
      detail.printed_name === row.printed_name
      && String(detail.source_set_code ?? '').toUpperCase()
        === row.source_set_code.toUpperCase()
      && normalizedNumber(detail.card_number_raw)
        === normalizedNumber(row.card_number_raw);
    if (!matches) {
      rejected.push({
        card_id: candidate.card_id,
        printed_name: detail.printed_name,
        source_set_code: detail.source_set_code,
        card_number_raw: detail.card_number_raw,
      });
      continue;
    }
    validated.push({ candidate, captured, detail });
  }
  if (validated.length !== 1) {
    throw new Error(
      `${row.followup_key} resolved ${validated.length} exact candidates `
      + `from ${candidateById.size} set-filtered search candidates`,
    );
  }

  const exact = validated[0];
  return {
    assertion: assertionFor({
      candidate: exact.candidate,
      detail: exact.detail,
      detailSnapshot: exact.captured,
      row,
      searchProofs,
    }),
    resolution: {
      followup_key: row.followup_key,
      registry_key: row.registry_key,
      printed_name: row.printed_name,
      source_set_code: row.source_set_code,
      card_number_raw: row.card_number_raw,
      official_card_id: exact.candidate.card_id,
      search_hit_count: searchProofs[0]?.hit_count ?? null,
      set_filtered_candidate_count: candidateById.size,
      exact_candidate_count: validated.length,
      rejected_candidates: rejected,
      disposition: 'exact_official_coordinate_resolved',
    },
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
  const followups = readJsonl(FOLLOWUPS);
  const assertions = [];
  const resolutions = [];
  const failures = [];

  for (const [index, row] of followups.entries()) {
    try {
      const resolved = await resolveFollowup({
        offline: args.offline,
        outputRoot,
        row,
      });
      assertions.push(resolved.assertion);
      resolutions.push(resolved.resolution);
    } catch (error) {
      failures.push({
        followup_key: row.followup_key,
        registry_key: row.registry_key,
        source_set_code: row.source_set_code,
        card_number_raw: row.card_number_raw,
        printed_name: row.printed_name,
        error_name: error.name,
        error_message: error.message,
      });
    }
    if (!args.quiet) {
      console.log(
        `[jpn-v5][official-coordinate] ${index + 1}/${followups.length} `
        + `resolved=${resolutions.length} failed=${failures.length}`,
      );
    }
  }

  assertions.sort((left, right) =>
    left.source_set_code.localeCompare(right.source_set_code)
    || Number(left.card_number_raw) - Number(right.card_number_raw));
  resolutions.sort((left, right) =>
    left.source_set_code.localeCompare(right.source_set_code)
    || Number(left.card_number_raw) - Number(right.card_number_raw));
  failures.sort((left, right) =>
    left.followup_key.localeCompare(right.followup_key));

  const retrieval = {
    mode: 'preserved_source_capture',
    generator_version: GENERATOR_VERSION,
    parser_version: OFFICIAL_JP_CARD_PARSER_VERSION,
    request_delay_ms: REQUEST_DELAY_MS,
    source_followups_path: FOLLOWUPS,
  };
  const assertionArtifact = buildArtifact({
    packageId: GENERATOR_VERSION,
    generatedAt: GENERATED_AT,
    retrieval,
    content: {
      assertions,
      execution_boundary: {
        database_reads: false,
        database_writes: false,
        image_downloads: false,
        pricing_writes: false,
        production_writes: false,
        storage_writes: false,
      },
    },
  });
  const healthArtifact = buildArtifact({
    packageId: `${GENERATOR_VERSION}-HEALTH`,
    generatedAt: GENERATED_AT,
    retrieval,
    content: {
      summary: {
        followup_count: followups.length,
        resolved_count: resolutions.length,
        failed_count: failures.length,
        exact_card_ids: assertions.map((row) => row.source_external_id),
      },
      resolutions,
      failures,
      execution_boundary: assertionArtifact.content.execution_boundary,
    },
  });
  await writeJsonArtifact(
    path.join(outputRoot, 'official_jp_card_assertions_v1.json'),
    assertionArtifact,
  );
  await writeJsonArtifact(
    path.join(outputRoot, 'official_jp_coordinate_source_health_v1.json'),
    healthArtifact,
  );

  if (!args.quiet) {
    console.log(JSON.stringify({
      status: failures.length === 0
        ? 'official_coordinate_harvest_complete'
        : 'official_coordinate_harvest_incomplete',
      followup_count: followups.length,
      resolved_count: resolutions.length,
      failed_count: failures.length,
      exact_card_ids: assertions.map((row) => row.source_external_id),
      database_writes: false,
    }, null, 2));
  }
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
