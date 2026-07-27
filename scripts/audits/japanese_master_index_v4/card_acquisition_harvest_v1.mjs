#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildTcgdexJapaneseCardAssertion,
  parseTcgdexJapaneseCardPayload,
  parseTcgdexJapaneseSetPayload,
  relativeSnapshotRef,
  TCGDEX_JA_CARD_PARSER_VERSION,
  tcgdexContainerHealth,
} from './card_source_adapters/tcgdex_ja_v1.mjs';
import {
  buildLimitlessJapaneseCardAssertion,
  limitlessContainerHealth,
  LIMITLESS_JP_CARD_PARSER_VERSION,
  parseLimitlessJapaneseCardChecklist,
} from './card_source_adapters/limitless_jp_v1.mjs';
import {
  ARTOFPKM_JP_CARD_PARSER_VERSION,
  artOfPkmContainerHealth,
  buildArtOfPkmJapaneseCardAssertion,
  parseArtOfPkmJapaneseCardChecklist,
} from './card_source_adapters/artofpkm_jp_v1.mjs';
import {
  buildSerebiiJapaneseCardAssertion,
  parseSerebiiJapaneseCardChecklist,
  SEREBII_JP_CARD_PARSER_VERSION,
  serebiiContainerHealth,
} from './card_source_adapters/serebii_jp_v1.mjs';
import {
  buildOfficialJapaneseCardAssertion,
  officialContainerHealth,
  OFFICIAL_JP_CARD_PARSER_VERSION,
  parseOfficialJapaneseCardDetail,
  parseOfficialJapaneseCardSearchPage,
} from './card_source_adapters/official_jp_v1.mjs';
import {
  BULBAPEDIA_JP_CARD_PARSER_VERSION,
  buildBulbapediaJapaneseCardAssertion,
  bulbapediaContainerHealth,
  parseBulbapediaJapaneseCardList,
} from './card_source_adapters/bulbapedia_jp_v1.mjs';
import {
  buildPokeGuardianJapaneseCardAssertion,
  parsePokeGuardianJapaneseMainSetList,
  POKEGUARDIAN_JP_CARD_PARSER_VERSION,
  pokeGuardianContainerHealth,
} from './card_source_adapters/pokeguardian_jp_v1.mjs';
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

const PACKAGE_ID = 'JPN-MASTER-INDEX-V4-CARD-ACQUISITION-HARVEST-V1';
const GENERATOR_VERSION = 'JPN-MASTER-INDEX-CARD-ACQUISITION-HARVEST-V1';
const DEFAULT_OUTPUT_DIRECTORY = 'docs/audits/japanese_master_index_v4/cards';
const DEFAULT_PLAN_PATH = path.join(
  DEFAULT_OUTPUT_DIRECTORY,
  'card_acquisition_plan_v1.json',
);
const DEFAULT_TARGETED_QUEUE_PATH = path.join(
  'docs/audits/japanese_master_index_v4/index',
  'targeted_source_queue_v1.json',
);
const TCGDEX_LANE_ID = 'tcgdex_ja_cards';
const TCGDEX_API_ROOT = 'https://api.tcgdex.net/v2/ja';
const LIMITLESS_LANE_ID = 'limitless_jp_cards';
const LIMITLESS_CARD_ROOT = 'https://limitlesstcg.com/cards/jp';
const ARTOFPKM_LANE_ID = 'artofpkm_jp_cards';
const ARTOFPKM_SET_ROOT = 'https://www.artofpkm.com/sets';
const SEREBII_LANE_ID = 'serebii_jp_cards';
const SEREBII_CARD_ROOT = 'https://www.serebii.net/card';
const OFFICIAL_LANE_ID = 'official_jp_cards';
const OFFICIAL_CARD_ROOT = 'https://www.pokemon-card.com/card-search';
const BULBAPEDIA_LANE_ID = 'bulbapedia_jp_card_lists';
const BULBAPEDIA_CARD_ROOT =
  'https://bulbapedia.bulbagarden.net/wiki';
const POKEGUARDIAN_LANE_ID = 'pokeguardian_release_reports';
const POKEGUARDIAN_CARD_ROOT =
  'https://www.pokeguardian.com/sets/set-lists/japanese-sets';
const TARGETED_LANES = new Set([
  BULBAPEDIA_LANE_ID,
  POKEGUARDIAN_LANE_ID,
]);
const SUPPORTED_LANES = new Set([
  TCGDEX_LANE_ID,
  LIMITLESS_LANE_ID,
  ARTOFPKM_LANE_ID,
  SEREBII_LANE_ID,
  OFFICIAL_LANE_ID,
  BULBAPEDIA_LANE_ID,
  POKEGUARDIAN_LANE_ID,
]);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function positiveInteger(value, label) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function safePathComponent(value) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '');
  if (!normalized) throw new Error(`Unsafe empty path component: ${value}`);
  return normalized;
}

export function parseCardHarvestArgs(argv = process.argv.slice(2)) {
  let requestDelayProvided = false;
  const options = {
    source: TCGDEX_LANE_ID,
    offline: false,
    resume: false,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    planPath: DEFAULT_PLAN_PATH,
    targetedQueuePath: DEFAULT_TARGETED_QUEUE_PATH,
    containerIds: [],
    maxContainers: null,
    maxCardsPerContainer: null,
    requestDelayMs: 125,
    generatedAt: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--source' && argv[index + 1]) {
      options.source = argv[++index];
    } else if (token === '--offline') {
      options.offline = true;
      options.resume = true;
    } else if (token === '--resume') {
      options.resume = true;
    } else if (token === '--output-dir' && argv[index + 1]) {
      options.outputDirectory = argv[++index];
    } else if (token === '--plan' && argv[index + 1]) {
      options.planPath = argv[++index];
    } else if (token === '--targeted-queue' && argv[index + 1]) {
      options.targetedQueuePath = argv[++index];
    } else if (token === '--container' && argv[index + 1]) {
      options.containerIds.push(argv[++index]);
    } else if (token === '--max-containers' && argv[index + 1]) {
      options.maxContainers = positiveInteger(
        argv[++index],
        '--max-containers',
      );
    } else if (token === '--max-cards-per-container' && argv[index + 1]) {
      options.maxCardsPerContainer = positiveInteger(
        argv[++index],
        '--max-cards-per-container',
      );
    } else if (token === '--request-delay-ms' && argv[index + 1]) {
      options.requestDelayMs = positiveInteger(
        argv[++index],
        '--request-delay-ms',
      );
      requestDelayProvided = true;
    } else if (token === '--generated-at' && argv[index + 1]) {
      options.generatedAt = new Date(argv[++index]).toISOString();
    } else {
      throw new Error(`Unknown or incomplete argument: ${token}`);
    }
  }
  if (!SUPPORTED_LANES.has(options.source)) {
    throw new Error(
      `Source adapter is not implemented yet: ${options.source}.`,
    );
  }
  const minimumDelayByLane = new Map([
    [TCGDEX_LANE_ID, 100],
    [LIMITLESS_LANE_ID, 750],
    [ARTOFPKM_LANE_ID, 750],
    [SEREBII_LANE_ID, 750],
    [OFFICIAL_LANE_ID, 750],
    [BULBAPEDIA_LANE_ID, 5000],
    [POKEGUARDIAN_LANE_ID, 1500],
  ]);
  const minimumDelayMs = minimumDelayByLane.get(options.source);
  if (!requestDelayProvided) {
    options.requestDelayMs = minimumDelayMs;
  }
  if (!options.offline && options.requestDelayMs < minimumDelayMs) {
    throw new Error(
      `Live ${options.source} capture requires at least ${minimumDelayMs}ms delay.`,
    );
  }
  return options;
}

async function readVerifiedArtifact(artifactPath) {
  const raw = await fs.readFile(artifactPath, 'utf8');
  const artifact = JSON.parse(raw);
  if (
    artifact.content_fingerprint_sha256 !== contentFingerprint(artifact.content)
  ) {
    throw new Error(`Artifact fingerprint mismatch: ${artifactPath}`);
  }
  return artifact;
}

async function readVerifiedArtifactIfPresent(artifactPath) {
  try {
    return await readVerifiedArtifact(artifactPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function snapshotPaths({ sourceId, outputDirectory, extension }) {
  return {
    body: path.join(outputDirectory, `${sourceId}_v1.${extension}`),
    metadata: path.join(outputDirectory, `${sourceId}_v1.http.json`),
  };
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function loadOrCaptureSnapshot({
  options,
  sourceId,
  url,
  outputDirectory,
  extension = 'json',
}) {
  const paths = snapshotPaths({ sourceId, outputDirectory, extension });
  const [bodyExists, metadataExists] = await Promise.all([
    pathExists(paths.body),
    pathExists(paths.metadata),
  ]);
  if (bodyExists !== metadataExists) {
    throw new Error(
      `Partial source snapshot exists for ${sourceId}; refusing to overwrite incomplete provenance.`,
    );
  }
  if (options.offline || (options.resume && bodyExists)) {
    const snapshot = await readSourceSnapshot({
      sourceId,
      outputDirectory,
      extension,
    });
    return {
      ...snapshot,
      capture_mode: options.offline ? 'offline_replay' : 'resume_cache',
    };
  }
  const snapshot = await captureSourceSnapshot({
    sourceId,
    url,
    outputDirectory,
    extension,
  });
  return { ...snapshot, capture_mode: 'live_fetch' };
}

function tcgdexSetUrl(setId) {
  return `${TCGDEX_API_ROOT}/sets/${encodeURIComponent(setId)}`;
}

function tcgdexCardUrl(cardId) {
  return `${TCGDEX_API_ROOT}/cards/${encodeURIComponent(cardId)}`;
}

function limitlessChecklistUrl(setId) {
  return `${LIMITLESS_CARD_ROOT}/${encodeURIComponent(setId)}?display=list&show=all`;
}

function artOfPkmChecklistUrl(setId) {
  return `${ARTOFPKM_SET_ROOT}/${encodeURIComponent(setId)}`;
}

function serebiiChecklistUrl(setId) {
  return `${SEREBII_CARD_ROOT}/${encodeURIComponent(setId)}/`;
}

function officialSearchPageUrl(productId, page) {
  const query = new URLSearchParams({
    mode: 'statuslist',
    pg: String(productId),
    page: String(page),
  });
  return `${OFFICIAL_CARD_ROOT}/resultAPI.php?${query}`;
}

function officialCardDetailUrl(cardId) {
  return `${OFFICIAL_CARD_ROOT}/details.php/card/${encodeURIComponent(cardId)}/regu/all`;
}

function targetedArticleUrl(workItem, expectedRoot) {
  const value = String(workItem.source_container_url ?? '').trim();
  if (!value) {
    throw new Error(
      `${workItem.lane_id} work item ${workItem.source_container_id} has no source_container_url.`,
    );
  }
  const url = new URL(value);
  if (!url.href.startsWith(expectedRoot)) {
    throw new Error(
      `${workItem.lane_id} work item ${workItem.source_container_id} points outside its governed source root.`,
    );
  }
  return url.toString();
}

async function selectWorkItems(plan, options, laneId) {
  let rows;
  let targetedQueue = null;
  if (TARGETED_LANES.has(laneId)) {
    targetedQueue = await readVerifiedArtifact(
      path.resolve(options.targetedQueuePath),
    );
    if (
      targetedQueue.package_id
      !== 'JPN-MASTER-INDEX-TARGETED-SOURCE-QUEUE-V1'
    ) {
      throw new Error(
        `Unexpected targeted queue package: ${targetedQueue.package_id}`,
      );
    }
    const planRows = new Map(
      plan.content.work_items
        .filter((row) => row.lane_id === laneId)
        .map((row) => [
          `${row.registry_key}\u0000${row.source_container_id}`,
          row,
        ]),
    );
    rows = targetedQueue.content.work_items
      .filter((row) => row.lane_id === laneId)
      .map((row) => {
        const planRow = planRows.get(
          `${row.registry_key}\u0000${row.source_container_id}`,
        );
        if (!planRow) {
          throw new Error(
            `${laneId} targeted queue row is absent from the acquisition plan: ${row.registry_key}/${row.source_container_id}`,
          );
        }
        return {
          ...planRow,
          ...row,
          disposition: 'measured_targeted_queue',
        };
      });
  } else {
    rows = plan.content.work_items.filter(
      (row) => row.lane_id === laneId && row.disposition === 'scheduled',
    );
  }
  if (options.containerIds.length > 0) {
    const requested = new Set(
      options.containerIds.map((value) => value.toLowerCase()),
    );
    rows = rows.filter((row) =>
      requested.has(row.source_container_id.toLowerCase()),
    );
    const found = new Set(
      rows.map((row) => row.source_container_id.toLowerCase()),
    );
    const missing = [...requested].filter((value) => !found.has(value));
    if (missing.length > 0) {
      throw new Error(
        `${laneId} containers are not scheduled in the plan: ${missing.join(', ')}`,
      );
    }
  }
  rows.sort((left, right) =>
    left.source_container_id.localeCompare(
      right.source_container_id,
      undefined,
      { numeric: true, sensitivity: 'base' },
    ),
  );
  if (options.maxContainers !== null) {
    rows = rows.slice(0, options.maxContainers);
  }
  if (rows.length === 0) {
    throw new Error(`${laneId} harvest selection contains no work items.`);
  }
  return { rows, targetedQueue };
}

function mergeByKey(priorRows, freshRows, keyField) {
  const merged = new Map(priorRows.map((row) => [row[keyField], row]));
  for (const row of freshRows) merged.set(row[keyField], row);
  return [...merged.values()];
}

function sortAssertions(rows) {
  return [...rows].sort(
    (left, right) =>
      left.source_container_id.localeCompare(
        right.source_container_id,
        undefined,
        { numeric: true, sensitivity: 'base' },
      ) ||
      String(left.card_number_raw ?? '').localeCompare(
        String(right.card_number_raw ?? ''),
        undefined,
        { numeric: true, sensitivity: 'base' },
      ) ||
      left.source_external_id.localeCompare(right.source_external_id),
  );
}

function sortHealth(rows) {
  return [...rows].sort((left, right) =>
    left.source_container_id.localeCompare(
      right.source_container_id,
      undefined,
      { numeric: true, sensitivity: 'base' },
    ),
  );
}

function errorRecord(error) {
  return {
    error_name: error?.name ?? 'Error',
    error_code: error?.code ?? null,
    error_message: String(error?.message ?? error),
  };
}

async function harvestTcgdexContainer({
  options,
  workItem,
  rawRoot,
  requestState,
}) {
  const setDirectory = path.join(
    rawRoot,
    safePathComponent(workItem.source_container_id),
  );
  const setSnapshot = await loadOrCaptureSnapshot({
    options,
    sourceId: 'set_detail',
    url: tcgdexSetUrl(workItem.source_container_id),
    outputDirectory: setDirectory,
  });
  requestState.snapshots.push(setSnapshot.metadata);
  if (setSnapshot.capture_mode === 'live_fetch') {
    requestState.requestCount += 1;
    requestState.hasFetched = true;
  }
  const setPayload = parseTcgdexJapaneseSetPayload(
    setSnapshot.body,
    workItem.source_container_id,
  );
  const selectedCards =
    options.maxCardsPerContainer === null
      ? setPayload.cards
      : setPayload.cards.slice(0, options.maxCardsPerContainer);
  const assertions = [];
  const detailFailures = [];
  let detailSuccessCount = 0;

  for (const [index, brief] of selectedCards.entries()) {
    if (!options.offline && requestState.hasFetched) {
      await sleep(options.requestDelayMs);
    }
    const cardDirectory = path.join(setDirectory, 'cards');
    const cardSourceId = safePathComponent(brief.id);
    try {
      const detailSnapshot = await loadOrCaptureSnapshot({
        options,
        sourceId: cardSourceId,
        url: tcgdexCardUrl(brief.id),
        outputDirectory: cardDirectory,
      });
      requestState.snapshots.push(detailSnapshot.metadata);
      if (detailSnapshot.capture_mode === 'live_fetch') {
        requestState.requestCount += 1;
        requestState.hasFetched = true;
      }
      const card = parseTcgdexJapaneseCardPayload(
        detailSnapshot.body,
        brief.id,
      );
      assertions.push(
        buildTcgdexJapaneseCardAssertion({
          card,
          cardBrief: brief,
          setPayload,
          workItem,
          snapshotMetadata: detailSnapshot.metadata,
          rawSnapshotRef: relativeSnapshotRef(
            path.join(cardDirectory, `${cardSourceId}_v1.json`),
          ),
          detailStatus: 'captured',
        }),
      );
      detailSuccessCount += 1;
    } catch (error) {
      if (options.offline) throw error;
      detailFailures.push({
        source_external_id: brief.id,
        ...errorRecord(error),
      });
      assertions.push(
        buildTcgdexJapaneseCardAssertion({
          card: null,
          cardBrief: brief,
          setPayload,
          workItem,
          snapshotMetadata: setSnapshot.metadata,
          rawSnapshotRef: relativeSnapshotRef(
            path.join(setDirectory, 'set_detail_v1.json'),
          ),
          detailStatus: 'set_brief_fallback_after_detail_failure',
        }),
      );
    }
    if ((index + 1) % 100 === 0 || index + 1 === selectedCards.length) {
      console.log(
        `[jpn-master-index][tcgdex] ${setPayload.id} cards=${index + 1}/${selectedCards.length}`,
      );
    }
  }

  return {
    assertions,
    health: {
      ...tcgdexContainerHealth({
        setPayload,
        workItem,
        selectedCardCount: selectedCards.length,
        detailSuccessCount,
        detailFailureCount: detailFailures.length,
        operatorCardLimit: options.maxCardsPerContainer,
      }),
      set_snapshot_sha256: setSnapshot.metadata.body_sha256,
      set_snapshot_fetched_at: setSnapshot.metadata.fetched_at,
      detail_failures: detailFailures,
    },
  };
}

function markdownReport(content) {
  const lines = [
    '# Japanese Master Index V4 - TCGdex JA Card Harvest',
    '',
    `- Mode: ${content.run.mode}`,
    `- Selected containers: ${content.run.selected_container_count}`,
    `- Fresh assertions: ${content.summary.fresh_assertion_count}`,
    `- Combined assertions: ${content.summary.combined_assertion_count}`,
    `- Prior assertions retained: ${content.summary.retained_prior_assertion_count}`,
    `- Source requests: ${content.summary.source_request_count}`,
    `- Transport/parser failures: ${content.summary.failed_container_count}`,
    '',
    '| Status | Containers |',
    '| --- | ---: |',
    ...Object.entries(content.summary.container_status_counts).map(
      ([status, count]) => `| ${status} | ${count} |`,
    ),
    '',
    '## Execution Boundary',
    '',
    '- Database reads: false',
    '- Database writes: false',
    '- Storage writes: false',
    '- Canon promotion: false',
    '',
  ];
  return lines.join('\n');
}

export async function runTcgdexJaCardHarvest(options) {
  const outputDirectory = path.resolve(options.outputDirectory);
  const plan = await readVerifiedArtifact(path.resolve(options.planPath));
  const { rows: workItems } = await selectWorkItems(
    plan,
    options,
    TCGDEX_LANE_ID,
  );
  const rawRoot = path.join(outputDirectory, 'raw', TCGDEX_LANE_ID);
  const assertionPath = path.join(
    outputDirectory,
    'tcgdex_ja_card_assertions_v1.json',
  );
  const healthPath = path.join(
    outputDirectory,
    'tcgdex_ja_card_source_health_v1.json',
  );
  const priorAssertionArtifact =
    await readVerifiedArtifactIfPresent(assertionPath);
  const priorHealthArtifact = await readVerifiedArtifactIfPresent(healthPath);
  const priorAssertions = priorAssertionArtifact?.content.assertions ?? [];
  const priorHealth = priorHealthArtifact?.content.containers ?? [];
  const freshAssertions = [];
  const freshHealth = [];
  const requestState = {
    requestCount: 0,
    snapshots: [],
    hasFetched: false,
  };

  for (const workItem of workItems) {
    if (!options.offline && requestState.hasFetched) {
      await sleep(options.requestDelayMs);
    }
    try {
      const result = await harvestTcgdexContainer({
        options,
        workItem,
        rawRoot,
        requestState,
      });
      freshAssertions.push(...result.assertions);
      freshHealth.push(result.health);
      requestState.hasFetched = true;
      console.log(
        `[jpn-master-index][tcgdex] container=${workItem.source_container_id} status=${result.health.status} assertions=${result.assertions.length}`,
      );
    } catch (error) {
      freshHealth.push({
        source_container_id: workItem.source_container_id,
        registry_key: workItem.registry_key,
        status: 'source_fetch_or_parse_failed',
        findings: ['source_fetch_or_parse_failed'],
        detail_failures: [],
        ...errorRecord(error),
      });
      console.error(
        `[jpn-master-index][tcgdex] container=${workItem.source_container_id} failed: ${error.message}`,
      );
    }
  }

  const freshKeys = new Set(freshAssertions.map((row) => row.assertion_key));
  const combinedAssertions = sortAssertions(
    mergeByKey(priorAssertions, freshAssertions, 'assertion_key'),
  );
  const combinedHealth = sortHealth(
    mergeByKey(priorHealth, freshHealth, 'source_container_id'),
  );
  const statusCounts = {};
  for (const row of combinedHealth) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const retrieval = {
    generator_version: GENERATOR_VERSION,
    parser_version: TCGDEX_JA_CARD_PARSER_VERSION,
    mode: options.offline ? 'offline_replay' : 'live_capture',
    source_lane: TCGDEX_LANE_ID,
    source_base_url: TCGDEX_API_ROOT,
    request_delay_ms: options.offline ? null : options.requestDelayMs,
    resume: options.resume,
    plan_content_fingerprint_sha256: plan.content_fingerprint_sha256,
  };
  const commonRun = {
    mode: retrieval.mode,
    selected_container_count: workItems.length,
    selected_container_ids: workItems.map((row) => row.source_container_id),
    max_cards_per_container: options.maxCardsPerContainer,
  };
  const summary = {
    prior_assertion_count: priorAssertions.length,
    fresh_assertion_count: freshAssertions.length,
    retained_prior_assertion_count: priorAssertions.filter(
      (row) => !freshKeys.has(row.assertion_key),
    ).length,
    combined_assertion_count: combinedAssertions.length,
    source_request_count: requestState.requestCount,
    selected_container_count: workItems.length,
    tracked_container_count: combinedHealth.length,
    failed_container_count: freshHealth.filter((row) =>
      ['source_fetch_or_parse_failed', 'detail_failures'].includes(row.status),
    ).length,
    container_status_counts: Object.fromEntries(
      Object.entries(statusCounts).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    assertion_fingerprint_sha256: contentFingerprint(combinedAssertions),
  };
  const assertionArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      run: commonRun,
      summary,
      assertions: combinedAssertions,
      execution_boundary: {
        database_reads: false,
        database_writes: false,
        storage_writes: false,
        canon_promotion: false,
      },
    },
  });
  const healthArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      run: commonRun,
      summary,
      selected_run_healthy: summary.failed_container_count === 0,
      containers: combinedHealth,
    },
  });
  const assertionRecord = await writeJsonArtifact(
    assertionPath,
    assertionArtifact,
  );
  const healthRecord = await writeJsonArtifact(healthPath, healthArtifact);
  await fs.writeFile(
    path.join(outputDirectory, 'tcgdex_ja_card_harvest_v1.md'),
    markdownReport(assertionArtifact.content),
    'utf8',
  );
  const manifestArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      run: commonRun,
      raw_snapshots: requestState.snapshots,
      normalized_artifacts: [assertionRecord, healthRecord],
      summary,
    },
  });
  await writeJsonArtifact(
    path.join(outputDirectory, 'tcgdex_ja_card_manifest_v1.json'),
    manifestArtifact,
  );
  return {
    assertionArtifact,
    healthArtifact,
    manifestArtifact,
    failed: summary.failed_container_count > 0,
  };
}

async function harvestLimitlessContainer({
  options,
  workItem,
  rawRoot,
  requestState,
}) {
  const setDirectory = path.join(
    rawRoot,
    safePathComponent(workItem.source_container_id),
  );
  const checklistSnapshot = await loadOrCaptureSnapshot({
    options,
    sourceId: 'set_checklist',
    url: limitlessChecklistUrl(workItem.source_container_id),
    outputDirectory: setDirectory,
    extension: 'html',
  });
  requestState.snapshots.push(checklistSnapshot.metadata);
  if (checklistSnapshot.capture_mode === 'live_fetch') {
    requestState.requestCount += 1;
    requestState.hasFetched = true;
  }
  const checklist = parseLimitlessJapaneseCardChecklist(
    checklistSnapshot.body,
    workItem.source_container_id,
  );
  const selectedCards =
    options.maxCardsPerContainer === null
      ? checklist.cards
      : checklist.cards.slice(0, options.maxCardsPerContainer);
  const rawSnapshotRef = relativeSnapshotRef(
    path.join(setDirectory, 'set_checklist_v1.html'),
  );
  const assertions = selectedCards.map((card) =>
    buildLimitlessJapaneseCardAssertion({
      card,
      checklist,
      workItem,
      snapshotMetadata: checklistSnapshot.metadata,
      rawSnapshotRef,
    }),
  );

  return {
    assertions,
    health: {
      ...limitlessContainerHealth({
        checklist,
        workItem,
        selectedCardCount: selectedCards.length,
        operatorCardLimit: options.maxCardsPerContainer,
      }),
      checklist_snapshot_sha256: checklistSnapshot.metadata.body_sha256,
      checklist_snapshot_fetched_at: checklistSnapshot.metadata.fetched_at,
    },
  };
}

async function harvestArtOfPkmContainer({
  options,
  workItem,
  rawRoot,
  requestState,
}) {
  const setDirectory = path.join(
    rawRoot,
    safePathComponent(workItem.source_container_id),
  );
  const checklistSnapshot = await loadOrCaptureSnapshot({
    options,
    sourceId: 'set_checklist',
    url: artOfPkmChecklistUrl(workItem.source_container_id),
    outputDirectory: setDirectory,
    extension: 'html',
  });
  requestState.snapshots.push(checklistSnapshot.metadata);
  if (checklistSnapshot.capture_mode === 'live_fetch') {
    requestState.requestCount += 1;
    requestState.hasFetched = true;
  }
  const checklist = parseArtOfPkmJapaneseCardChecklist(
    checklistSnapshot.body,
    workItem.source_container_id,
  );
  const selectedCards =
    options.maxCardsPerContainer === null
      ? checklist.cards
      : checklist.cards.slice(0, options.maxCardsPerContainer);
  const rawSnapshotRef = relativeSnapshotRef(
    path.join(setDirectory, 'set_checklist_v1.html'),
  );
  const assertions = selectedCards.map((card) =>
    buildArtOfPkmJapaneseCardAssertion({
      card,
      checklist,
      workItem,
      snapshotMetadata: checklistSnapshot.metadata,
      rawSnapshotRef,
    }),
  );

  return {
    assertions,
    health: {
      ...artOfPkmContainerHealth({
        checklist,
        workItem,
        selectedCardCount: selectedCards.length,
        operatorCardLimit: options.maxCardsPerContainer,
      }),
      checklist_snapshot_sha256: checklistSnapshot.metadata.body_sha256,
      checklist_snapshot_fetched_at: checklistSnapshot.metadata.fetched_at,
    },
  };
}

async function harvestSerebiiContainer({
  options,
  workItem,
  rawRoot,
  requestState,
}) {
  const setDirectory = path.join(
    rawRoot,
    safePathComponent(workItem.source_container_id),
  );
  const checklistSnapshot = await loadOrCaptureSnapshot({
    options,
    sourceId: 'set_checklist',
    url: serebiiChecklistUrl(workItem.source_container_id),
    outputDirectory: setDirectory,
    extension: 'html',
  });
  requestState.snapshots.push(checklistSnapshot.metadata);
  if (checklistSnapshot.capture_mode === 'live_fetch') {
    requestState.requestCount += 1;
    requestState.hasFetched = true;
  }
  const checklist = parseSerebiiJapaneseCardChecklist(
    checklistSnapshot.body,
    workItem.source_container_id,
  );
  const selectedCards =
    options.maxCardsPerContainer === null
      ? checklist.cards
      : checklist.cards.slice(0, options.maxCardsPerContainer);
  const rawSnapshotRef = relativeSnapshotRef(
    path.join(setDirectory, 'set_checklist_v1.html'),
  );
  const assertions = selectedCards.map((card) =>
    buildSerebiiJapaneseCardAssertion({
      card,
      checklist,
      workItem,
      snapshotMetadata: checklistSnapshot.metadata,
      rawSnapshotRef,
    }),
  );

  return {
    assertions,
    health: {
      ...serebiiContainerHealth({
        checklist,
        workItem,
        selectedCardCount: selectedCards.length,
        operatorCardLimit: options.maxCardsPerContainer,
      }),
      checklist_snapshot_sha256: checklistSnapshot.metadata.body_sha256,
      checklist_snapshot_fetched_at: checklistSnapshot.metadata.fetched_at,
    },
  };
}

async function harvestBulbapediaContainer({
  options,
  workItem,
  rawRoot,
  requestState,
}) {
  const articleDirectory = path.join(
    rawRoot,
    safePathComponent(workItem.source_container_id),
  );
  const articleSnapshot = await loadOrCaptureSnapshot({
    options,
    sourceId: 'article',
    url: targetedArticleUrl(workItem, BULBAPEDIA_CARD_ROOT),
    outputDirectory: articleDirectory,
    extension: 'html',
  });
  requestState.snapshots.push(articleSnapshot.metadata);
  if (articleSnapshot.capture_mode === 'live_fetch') {
    requestState.requestCount += 1;
    requestState.hasFetched = true;
  }
  const checklist = parseBulbapediaJapaneseCardList(
    articleSnapshot.body,
    workItem,
  );
  const selectedCards =
    options.maxCardsPerContainer === null
      ? checklist.cards
      : checklist.cards.slice(0, options.maxCardsPerContainer);
  const rawSnapshotRef = relativeSnapshotRef(
    path.join(articleDirectory, 'article_v1.html'),
  );
  const assertions = selectedCards.map((card) =>
    buildBulbapediaJapaneseCardAssertion({
      card,
      checklist,
      workItem,
      snapshotMetadata: articleSnapshot.metadata,
      rawSnapshotRef,
    }),
  );

  return {
    assertions,
    health: {
      ...bulbapediaContainerHealth({
        checklist,
        workItem,
        selectedCardCount: selectedCards.length,
        operatorCardLimit: options.maxCardsPerContainer,
      }),
      article_snapshot_sha256: articleSnapshot.metadata.body_sha256,
      article_snapshot_fetched_at: articleSnapshot.metadata.fetched_at,
    },
  };
}

async function harvestPokeGuardianContainer({
  options,
  workItem,
  rawRoot,
  requestState,
}) {
  const articleDirectory = path.join(
    rawRoot,
    safePathComponent(workItem.source_container_id),
  );
  const articleSnapshot = await loadOrCaptureSnapshot({
    options,
    sourceId: 'article',
    url: targetedArticleUrl(workItem, POKEGUARDIAN_CARD_ROOT),
    outputDirectory: articleDirectory,
    extension: 'html',
  });
  requestState.snapshots.push(articleSnapshot.metadata);
  if (articleSnapshot.capture_mode === 'live_fetch') {
    requestState.requestCount += 1;
    requestState.hasFetched = true;
  }
  const checklist = parsePokeGuardianJapaneseMainSetList(
    articleSnapshot.body,
    workItem,
  );
  const selectedCards =
    options.maxCardsPerContainer === null
      ? checklist.cards
      : checklist.cards.slice(0, options.maxCardsPerContainer);
  const rawSnapshotRef = relativeSnapshotRef(
    path.join(articleDirectory, 'article_v1.html'),
  );
  const assertions = selectedCards.map((card) =>
    buildPokeGuardianJapaneseCardAssertion({
      card,
      checklist,
      workItem,
      snapshotMetadata: articleSnapshot.metadata,
      rawSnapshotRef,
    }),
  );

  return {
    assertions,
    health: {
      ...pokeGuardianContainerHealth({
        checklist,
        workItem,
        selectedCardCount: selectedCards.length,
        operatorCardLimit: options.maxCardsPerContainer,
      }),
      article_snapshot_sha256: articleSnapshot.metadata.body_sha256,
      article_snapshot_fetched_at: articleSnapshot.metadata.fetched_at,
    },
  };
}

async function harvestOfficialContainer({
  options,
  workItem,
  rawRoot,
  requestState,
}) {
  const productDirectory = path.join(
    rawRoot,
    safePathComponent(workItem.source_container_id),
  );
  const pagesDirectory = path.join(productDirectory, 'pages');
  const pageRecords = [];
  let firstPage = null;
  let maxPage = 1;

  for (let page = 1; page <= maxPage; page += 1) {
    if (!options.offline && requestState.hasFetched) {
      await sleep(options.requestDelayMs);
    }
    const sourceId = `search_page_${page}`;
    const snapshot = await loadOrCaptureSnapshot({
      options,
      sourceId,
      url: officialSearchPageUrl(workItem.source_container_id, page),
      outputDirectory: pagesDirectory,
    });
    requestState.snapshots.push(snapshot.metadata);
    if (snapshot.capture_mode === 'live_fetch') {
      requestState.requestCount += 1;
      requestState.hasFetched = true;
    }
    const parsed = parseOfficialJapaneseCardSearchPage(
      snapshot.body,
      workItem.source_container_id,
      page,
    );
    firstPage ??= parsed;
    maxPage = parsed.max_page ?? 1;
    pageRecords.push({ parsed, snapshot, sourceId });
  }

  const cardIds = new Set();
  const cards = [];
  for (const pageRecord of pageRecords) {
    for (const card of pageRecord.parsed.cards) {
      if (cardIds.has(card.card_id)) {
        throw new Error(
          `Official Japanese product ${workItem.source_container_id} repeats card ${card.card_id} across result pages.`,
        );
      }
      cardIds.add(card.card_id);
      cards.push({
        ...card,
        search_snapshot: pageRecord.snapshot.metadata,
        search_snapshot_ref: relativeSnapshotRef(
          path.join(pagesDirectory, `${pageRecord.sourceId}_v1.json`),
        ),
      });
    }
  }
  const product = {
    ...firstPage,
    cards,
  };
  const selectedCards =
    options.maxCardsPerContainer === null
      ? cards
      : cards.slice(0, options.maxCardsPerContainer);
  const assertions = [];
  const detailFailures = [];
  let detailSuccessCount = 0;
  const detailDirectory = path.join(productDirectory, 'details');

  for (const [index, cardBrief] of selectedCards.entries()) {
    if (!options.offline && requestState.hasFetched) {
      await sleep(options.requestDelayMs);
    }
    const sourceId = `card_${safePathComponent(cardBrief.card_id)}`;
    let detail = null;
    let snapshotMetadata = cardBrief.search_snapshot;
    let rawSnapshotRef = cardBrief.search_snapshot_ref;
    let detailStatus = 'search_brief_fallback_after_detail_unavailable';
    try {
      const snapshot = await loadOrCaptureSnapshot({
        options,
        sourceId,
        url: officialCardDetailUrl(cardBrief.card_id),
        outputDirectory: detailDirectory,
        extension: 'html',
      });
      requestState.snapshots.push(snapshot.metadata);
      if (snapshot.capture_mode === 'live_fetch') {
        requestState.requestCount += 1;
        requestState.hasFetched = true;
      }
      detail = parseOfficialJapaneseCardDetail(
        snapshot.body,
        cardBrief.card_id,
      );
      snapshotMetadata = snapshot.metadata;
      rawSnapshotRef = relativeSnapshotRef(
        path.join(detailDirectory, `${sourceId}_v1.html`),
      );
      detailStatus = 'captured';
      detailSuccessCount += 1;
    } catch (error) {
      detailFailures.push({
        source_external_id: cardBrief.card_id,
        ...errorRecord(error),
      });
    }
    assertions.push(
      buildOfficialJapaneseCardAssertion({
        cardBrief,
        detail,
        product,
        workItem,
        snapshotMetadata,
        rawSnapshotRef,
        detailStatus,
      }),
    );
    if ((index + 1) % 100 === 0 || index + 1 === selectedCards.length) {
      console.log(
        `[jpn-master-index][official_jp] ${product.product_id} cards=${index + 1}/${selectedCards.length}`,
      );
    }
  }

  return {
    assertions,
    health: {
      ...officialContainerHealth({
        product,
        workItem,
        selectedCardCount: selectedCards.length,
        detailSuccessCount,
        detailFailureCount: detailFailures.length,
        operatorCardLimit: options.maxCardsPerContainer,
      }),
      detail_failures: detailFailures,
      result_page_snapshot_sha256: pageRecords.map(
        (row) => row.snapshot.metadata.body_sha256,
      ),
      result_page_snapshot_fetched_at: pageRecords.map(
        (row) => row.snapshot.metadata.fetched_at,
      ),
    },
  };
}

function checklistMarkdownReport(content, title, boundaryNotes) {
  const lines = [
    `# Japanese Master Index V4 - ${title}`,
    '',
    `- Mode: ${content.run.mode}`,
    `- Selected containers: ${content.run.selected_container_count}`,
    `- Fresh assertions: ${content.summary.fresh_assertion_count}`,
    `- Combined assertions: ${content.summary.combined_assertion_count}`,
    `- Prior assertions retained: ${content.summary.retained_prior_assertion_count}`,
    `- Source requests: ${content.summary.source_request_count}`,
    `- Transport/parser failures: ${content.summary.failed_container_count}`,
    '',
    '| Status | Containers |',
    '| --- | ---: |',
    ...Object.entries(content.summary.container_status_counts).map(
      ([status, count]) => `| ${status} | ${count} |`,
    ),
    '',
    '## Execution Boundary',
    '',
    '- Database reads: false',
    '- Database writes: false',
    '- Storage writes: false',
    '- Canon promotion: false',
    ...boundaryNotes.map((note) => `- ${note}`),
    '',
  ];
  return lines.join('\n');
}

async function runChecklistCardHarvest({
  options,
  laneId,
  parserVersion,
  sourceBaseUrl,
  artifactStem,
  reportTitle,
  boundaryNotes,
  harvestContainer,
  retrievalFields = {},
  failureStatuses = ['source_fetch_or_parse_failed'],
}) {
  const outputDirectory = path.resolve(options.outputDirectory);
  const plan = await readVerifiedArtifact(path.resolve(options.planPath));
  const selection = await selectWorkItems(plan, options, laneId);
  const workItems = selection.rows;
  const rawRoot = path.join(outputDirectory, 'raw', laneId);
  const assertionPath = path.join(
    outputDirectory,
    `${artifactStem}_card_assertions_v1.json`,
  );
  const healthPath = path.join(
    outputDirectory,
    `${artifactStem}_card_source_health_v1.json`,
  );
  const priorAssertionArtifact =
    await readVerifiedArtifactIfPresent(assertionPath);
  const priorHealthArtifact = await readVerifiedArtifactIfPresent(healthPath);
  const priorAssertions = priorAssertionArtifact?.content.assertions ?? [];
  const priorHealth = priorHealthArtifact?.content.containers ?? [];
  const freshAssertions = [];
  const freshHealth = [];
  const requestState = {
    requestCount: 0,
    snapshots: [],
    hasFetched: false,
  };

  for (const workItem of workItems) {
    if (!options.offline && requestState.hasFetched) {
      await sleep(options.requestDelayMs);
    }
    try {
      const result = await harvestContainer({
        options,
        workItem,
        rawRoot,
        requestState,
      });
      freshAssertions.push(...result.assertions);
      freshHealth.push(result.health);
      requestState.hasFetched = true;
      console.log(
        `[jpn-master-index][${artifactStem}] container=${workItem.source_container_id} status=${result.health.status} assertions=${result.assertions.length}`,
      );
    } catch (error) {
      freshHealth.push({
        source_container_id: workItem.source_container_id,
        registry_key: workItem.registry_key,
        status: 'source_fetch_or_parse_failed',
        findings: ['source_fetch_or_parse_failed'],
        ...errorRecord(error),
      });
      console.error(
        `[jpn-master-index][${artifactStem}] container=${workItem.source_container_id} failed: ${error.message}`,
      );
    }
  }

  const freshKeys = new Set(freshAssertions.map((row) => row.assertion_key));
  const combinedAssertions = sortAssertions(
    mergeByKey(priorAssertions, freshAssertions, 'assertion_key'),
  );
  const combinedHealth = sortHealth(
    mergeByKey(priorHealth, freshHealth, 'source_container_id'),
  );
  const statusCounts = {};
  for (const row of combinedHealth) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const retrieval = {
    generator_version: GENERATOR_VERSION,
    parser_version: parserVersion,
    mode: options.offline ? 'offline_replay' : 'live_capture',
    source_lane: laneId,
    source_base_url: sourceBaseUrl,
    request_delay_ms: options.offline ? null : options.requestDelayMs,
    resume: options.resume,
    ...retrievalFields,
    plan_content_fingerprint_sha256: plan.content_fingerprint_sha256,
    targeted_queue_path: selection.targetedQueue
      ? path.resolve(options.targetedQueuePath).replaceAll('\\', '/')
      : null,
    targeted_queue_content_fingerprint_sha256:
      selection.targetedQueue?.content_fingerprint_sha256 ?? null,
  };
  const commonRun = {
    mode: retrieval.mode,
    selected_container_count: workItems.length,
    selected_container_ids: workItems.map((row) => row.source_container_id),
    max_cards_per_container: options.maxCardsPerContainer,
  };
  const summary = {
    prior_assertion_count: priorAssertions.length,
    fresh_assertion_count: freshAssertions.length,
    retained_prior_assertion_count: priorAssertions.filter(
      (row) => !freshKeys.has(row.assertion_key),
    ).length,
    combined_assertion_count: combinedAssertions.length,
    source_request_count: requestState.requestCount,
    selected_container_count: workItems.length,
    tracked_container_count: combinedHealth.length,
    failed_container_count: freshHealth.filter((row) =>
      failureStatuses.includes(row.status),
    ).length,
    container_status_counts: Object.fromEntries(
      Object.entries(statusCounts).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    assertion_fingerprint_sha256: contentFingerprint(combinedAssertions),
  };
  const assertionArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      run: commonRun,
      summary,
      assertions: combinedAssertions,
      execution_boundary: {
        database_reads: false,
        database_writes: false,
        storage_writes: false,
        canon_promotion: false,
      },
    },
  });
  const healthArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      run: commonRun,
      summary,
      selected_run_healthy: summary.failed_container_count === 0,
      containers: combinedHealth,
    },
  });
  const assertionRecord = await writeJsonArtifact(
    assertionPath,
    assertionArtifact,
  );
  const healthRecord = await writeJsonArtifact(healthPath, healthArtifact);
  await fs.writeFile(
    path.join(outputDirectory, `${artifactStem}_card_harvest_v1.md`),
    checklistMarkdownReport(
      assertionArtifact.content,
      reportTitle,
      boundaryNotes,
    ),
    'utf8',
  );
  const manifestArtifact = buildArtifact({
    packageId: PACKAGE_ID,
    generatedAt,
    retrieval,
    content: {
      run: commonRun,
      raw_snapshots: requestState.snapshots,
      normalized_artifacts: [assertionRecord, healthRecord],
      summary,
    },
  });
  await writeJsonArtifact(
    path.join(outputDirectory, `${artifactStem}_card_manifest_v1.json`),
    manifestArtifact,
  );
  return {
    assertionArtifact,
    healthArtifact,
    manifestArtifact,
    failed: summary.failed_container_count > 0,
  };
}

export async function runLimitlessJaCardHarvest(options) {
  return runChecklistCardHarvest({
    options,
    laneId: LIMITLESS_LANE_ID,
    parserVersion: LIMITLESS_JP_CARD_PARSER_VERSION,
    sourceBaseUrl: LIMITLESS_CARD_ROOT,
    artifactStem: 'limitless_jp',
    reportTitle: 'Limitless JP Card Harvest',
    boundaryNotes: ['Displayed pricing fields: ignored'],
    harvestContainer: harvestLimitlessContainer,
    retrievalFields: {
      displayed_price_fields_ignored: true,
    },
  });
}

export async function runArtOfPkmJaCardHarvest(options) {
  return runChecklistCardHarvest({
    options,
    laneId: ARTOFPKM_LANE_ID,
    parserVersion: ARTOFPKM_JP_CARD_PARSER_VERSION,
    sourceBaseUrl: ARTOFPKM_SET_ROOT,
    artifactStem: 'artofpkm_jp',
    reportTitle: 'Art of Pokemon JP Card Harvest',
    boundaryNotes: [
      'Image references only: true',
      'Image downloads: false',
      'Card-detail requests: false',
    ],
    harvestContainer: harvestArtOfPkmContainer,
    retrievalFields: {
      image_references_only: true,
      image_downloads: false,
      card_detail_requests: false,
    },
  });
}

export async function runSerebiiJaCardHarvest(options) {
  return runChecklistCardHarvest({
    options,
    laneId: SEREBII_LANE_ID,
    parserVersion: SEREBII_JP_CARD_PARSER_VERSION,
    sourceBaseUrl: SEREBII_CARD_ROOT,
    artifactStem: 'serebii_jp',
    reportTitle: 'Serebii JP Card Harvest',
    boundaryNotes: [
      'One server-rendered checklist request per set: true',
      'Card-detail requests: false',
      'Image references only: true',
      'English display labels are not treated as Japanese printed names',
    ],
    harvestContainer: harvestSerebiiContainer,
    retrievalFields: {
      card_detail_requests: false,
      image_references_only: true,
      displayed_name_language: 'en',
    },
  });
}

export async function runBulbapediaJaCardHarvest(options) {
  return runChecklistCardHarvest({
    options,
    laneId: BULBAPEDIA_LANE_ID,
    parserVersion: BULBAPEDIA_JP_CARD_PARSER_VERSION,
    sourceBaseUrl: BULBAPEDIA_CARD_ROOT,
    artifactStem: 'bulbapedia_jp',
    reportTitle: 'Bulbapedia JP Card Harvest',
    boundaryNotes: [
      'One governed encyclopedia article request per targeted set',
      'Japanese table selected only by registry-backed denominator',
      'English labels are not treated as Japanese printed names',
      'Card-detail requests: false',
    ],
    harvestContainer: harvestBulbapediaContainer,
    retrievalFields: {
      card_detail_requests: false,
      japanese_table_selection: 'registry_expected_denominator',
      displayed_name_language: 'en',
    },
  });
}

export async function runPokeGuardianJaCardHarvest(options) {
  return runChecklistCardHarvest({
    options,
    laneId: POKEGUARDIAN_LANE_ID,
    parserVersion: POKEGUARDIAN_JP_CARD_PARSER_VERSION,
    sourceBaseUrl: POKEGUARDIAN_CARD_ROOT,
    artifactStem: 'pokeguardian_jp',
    reportTitle: 'PokeGuardian JP Card Harvest',
    boundaryNotes: [
      'One governed Main Set List article request per targeted set',
      'Card numbers are derived only from ordered main-set album position',
      'Romanized image filenames are not treated as printed names',
      'Image references only: true',
      'Image downloads: false',
    ],
    harvestContainer: harvestPokeGuardianContainer,
    retrievalFields: {
      card_detail_requests: false,
      image_references_only: true,
      image_downloads: false,
      card_number_derivation: 'ordered_main_set_album_position',
    },
  });
}

export async function runOfficialJaCardHarvest(options) {
  return runChecklistCardHarvest({
    options,
    laneId: OFFICIAL_LANE_ID,
    parserVersion: OFFICIAL_JP_CARD_PARSER_VERSION,
    sourceBaseUrl: OFFICIAL_CARD_ROOT,
    artifactStem: 'official_jp',
    reportTitle: 'Official Pokemon Card JP Harvest',
    boundaryNotes: [
      'Published result API pagination and linked card details only',
      'Image references only: true',
      'Image downloads: false',
      'Database reads/writes: false',
    ],
    harvestContainer: harvestOfficialContainer,
    retrievalFields: {
      result_api_pagination: true,
      card_detail_requests: true,
      image_references_only: true,
      image_downloads: false,
    },
    failureStatuses: ['source_fetch_or_parse_failed', 'detail_failures'],
  });
}

async function main() {
  assertAuditOnlyArgs(process.argv.slice(2));
  const options = parseCardHarvestArgs();
  let result;
  if (options.source === TCGDEX_LANE_ID) {
    result = await runTcgdexJaCardHarvest(options);
  } else if (options.source === LIMITLESS_LANE_ID) {
    result = await runLimitlessJaCardHarvest(options);
  } else if (options.source === ARTOFPKM_LANE_ID) {
    result = await runArtOfPkmJaCardHarvest(options);
  } else if (options.source === SEREBII_LANE_ID) {
    result = await runSerebiiJaCardHarvest(options);
  } else if (options.source === OFFICIAL_LANE_ID) {
    result = await runOfficialJaCardHarvest(options);
  } else if (options.source === BULBAPEDIA_LANE_ID) {
    result = await runBulbapediaJaCardHarvest(options);
  } else if (options.source === POKEGUARDIAN_LANE_ID) {
    result = await runPokeGuardianJaCardHarvest(options);
  } else {
    throw new Error(`Unhandled source lane: ${options.source}`);
  }
  console.log(
    `[jpn-master-index][cards-harvest] source=${options.source} assertions=${result.assertionArtifact.content.summary.combined_assertion_count} fingerprint=${result.assertionArtifact.content.summary.assertion_fingerprint_sha256}`,
  );
  if (result.failed) process.exitCode = 2;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
