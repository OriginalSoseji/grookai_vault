import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import {
  loadVerifiedDatasetFromManifest,
  readVerifiedArtifact,
} from '../japanese_master_index_v4/artifact_rows_v1.mjs';
import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from '../japanese_master_index_v4/deterministic_artifact_v1.mjs';

const GENERATOR_VERSION =
  'JPN-MASTER-INDEX-V5-OFFICIAL-GLOBAL-CATALOG-RECONCILE-V1';
const GENERATED_AT = '2026-07-28T01:00:00.000Z';
const AS_OF_DATE = '2026-07-27';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v5/'
  + 'official_global_catalog_reconciliation';
const DISCOVERY =
  'docs/audits/japanese_master_index_v5/official_global_catalog/'
  + 'official_jp_global_card_discovery_v1.json.gz';
const SET_REGISTRY =
  'docs/audits/japanese_master_index_v4/sets/jpn_set_registry_v1.json';
const CANDIDATE_MANIFEST =
  'docs/audits/japanese_master_index_v4/index/'
  + 'candidate_union_manifest_v1.json';
const V5_IDENTITY_DELTA =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_identity_resolution/'
  + 'jpn_v5_official_product_identity_delta_v1.jsonl';

function parseArgs(argv) {
  const result = { outputRoot: DEFAULT_OUTPUT_ROOT, quiet: false };
  for (const value of argv.slice(2)) {
    if (value.startsWith('--output-root=')) {
      result.outputRoot = value.slice('--output-root='.length);
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

function readJsonArtifact(filePath) {
  const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (contentFingerprint(artifact.content)
      !== artifact.content_fingerprint_sha256) {
    throw new Error(`Artifact fingerprint mismatch: ${filePath}`);
  }
  return artifact;
}

function normalizedCode(value) {
  return String(value ?? '').normalize('NFKC').trim().toUpperCase();
}

function normalizedDate(value) {
  const text = String(value ?? '').normalize('NFKC').trim();
  const japanese = text.match(
    /(?<year>\d{4})年\s*(?<month>\d{1,2})月\s*(?<day>\d{1,2})日/,
  );
  if (japanese) {
    return [
      japanese.groups.year,
      japanese.groups.month.padStart(2, '0'),
      japanese.groups.day.padStart(2, '0'),
    ].join('-');
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function releaseDateFor(entry) {
  return (entry.source_release_dates ?? [])
    .map(normalizedDate)
    .filter(Boolean)
    .sort()
    .at(0) ?? null;
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(keyFn(row));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts].sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, stableJson(value));
}

async function main() {
  const args = parseArgs(process.argv);
  const outputRoot = path.resolve(args.outputRoot);
  const canonicalRoot = path.resolve(DEFAULT_OUTPUT_ROOT);
  if (outputRoot !== canonicalRoot
      && !outputRoot.includes(`${path.sep}.tmp${path.sep}`)) {
    throw new Error('Output must be canonical or under .tmp');
  }

  const { artifact: discoveryArtifact } =
    await readVerifiedArtifact(DISCOVERY);
  if (discoveryArtifact.content.status
      !== 'official_global_catalog_complete') {
    throw new Error('Global Official JP catalog is not complete');
  }
  const cards = discoveryArtifact.content.cards;
  const setRegistryArtifact = readJsonArtifact(SET_REGISTRY);
  const registryEntries = setRegistryArtifact.content.registry_entries;
  const registryByCode = new Map();
  for (const entry of registryEntries) {
    for (const code of entry.source_native_codes ?? []) {
      const key = normalizedCode(code);
      if (!key) continue;
      const values = registryByCode.get(key) ?? new Map();
      values.set(entry.registry_key, entry);
      registryByCode.set(key, values);
    }
  }

  const { rows: unionRows } = await loadVerifiedDatasetFromManifest({
    manifestPath: CANDIDATE_MANIFEST,
    datasetKey: 'source_assertion_union_rows_v1',
  });
  const { rows: candidateRows } = await loadVerifiedDatasetFromManifest({
    manifestPath: CANDIDATE_MANIFEST,
    datasetKey: 'identity_candidate_rows_v1',
  });
  const v4OfficialIds = new Set(
    unionRows
      .filter((row) => row.source_key === 'official_jp_cards')
      .map((row) => String(row.source_external_id ?? ''))
      .filter((value) => /^\d+$/.test(value)),
  );
  const v5DeltaIds = new Set(
    readJsonl(V5_IDENTITY_DELTA)
      .map((row) => String(row.official_card_id ?? ''))
      .filter((value) => /^\d+$/.test(value)),
  );
  const candidatesByRegistryAndName = new Map();
  for (const candidate of candidateRows) {
    for (const registryKey of candidate.registry_keys ?? []) {
      for (const printedName of candidate.printed_name_ja_candidates ?? []) {
        const key = `${registryKey}\u0000${
          String(printedName).normalize('NFC').trim()
        }`;
        const values = candidatesByRegistryAndName.get(key) ?? new Map();
        values.set(candidate.candidate_key, candidate);
        candidatesByRegistryAndName.set(key, values);
      }
    }
  }

  const reconciliation = cards.map((card) => {
    const registryCandidates = [
      ...(registryByCode.get(normalizedCode(card.image_set_code))
        ?.values() ?? []),
    ].sort((left, right) =>
      left.registry_key.localeCompare(right.registry_key));
    const registryKeys = registryCandidates.map((row) => row.registry_key);
    const releaseDates = registryCandidates
      .map(releaseDateFor)
      .filter(Boolean)
      .sort();
    const futureRelease = registryCandidates.length > 0
      && releaseDates.length === registryCandidates.length
      && releaseDates.every((value) => value > AS_OF_DATE);
    const candidateMatches = registryKeys.length === 1
      ? [
        ...(candidatesByRegistryAndName.get(
          `${registryKeys[0]}\u0000${
            String(card.printed_name ?? '').normalize('NFC').trim()
          }`,
        )?.values() ?? []),
      ].sort((left, right) =>
        left.candidate_key.localeCompare(right.candidate_key))
      : [];
    const priorCoverage = v4OfficialIds.has(card.official_card_id)
      ? 'v4_official_assertion_present'
      : v5DeltaIds.has(card.official_card_id)
        ? 'v5_official_product_assertion_present'
        : 'official_detail_not_preserved';
    return {
      official_card_id: card.official_card_id,
      printed_name: card.printed_name,
      image_url: card.image_url,
      image_set_code: card.image_set_code,
      registry_match_status: registryKeys.length === 1
        ? 'unique_native_code_match'
        : registryKeys.length > 1
          ? 'ambiguous_native_code_match'
          : 'native_code_unmapped',
      registry_keys: registryKeys,
      earliest_registry_release_date: releaseDates.at(0) ?? null,
      future_release: futureRelease,
      candidate_link_status: registryKeys.length !== 1
        ? 'registry_not_unique'
        : candidateMatches.length === 1
          ? 'unique_registry_printed_name_match'
          : candidateMatches.length > 1
            ? 'ambiguous_registry_printed_name_match'
            : 'registry_printed_name_not_found',
      candidate_keys: candidateMatches.map((row) => row.candidate_key),
      candidate_number_coordinates: candidateMatches.map((row) => ({
        candidate_key: row.candidate_key,
        number_core: row.number_core,
        printed_number_candidates: row.printed_number_candidates,
      })),
      prior_coverage: priorCoverage,
      detail_disposition: priorCoverage
          !== 'official_detail_not_preserved'
        ? 'detail_already_preserved'
        : futureRelease
          ? 'deferred_future_release'
          : 'official_detail_fetch_required',
    };
  }).sort((left, right) =>
    Number(left.official_card_id) - Number(right.official_card_id));

  const detailQueue = reconciliation
    .filter((row) =>
      row.detail_disposition === 'official_detail_fetch_required')
    .map((row) => ({
      work_key: `official_global_detail:${row.official_card_id}`,
      official_card_id: row.official_card_id,
      printed_name: row.printed_name,
      image_url: row.image_url,
      image_set_code: row.image_set_code,
      registry_match_status: row.registry_match_status,
      registry_keys: row.registry_keys,
      candidate_link_status: row.candidate_link_status,
      candidate_keys: row.candidate_keys,
      priority: row.registry_match_status === 'unique_native_code_match'
        && row.candidate_link_status
          === 'unique_registry_printed_name_match'
        ? 1
        : row.registry_match_status === 'unique_native_code_match'
          ? 2
        : row.registry_match_status === 'ambiguous_native_code_match'
          ? 3
          : 4,
      source_url:
        'https://www.pokemon-card.com/card-search/details.php/card/'
        + `${row.official_card_id}/regu/all`,
    }))
    .sort((left, right) =>
      left.priority - right.priority
      || Number(left.official_card_id) - Number(right.official_card_id));

  const executionBoundary = {
    database_reads: false,
    database_writes: false,
    detail_page_requests: false,
    image_downloads: false,
    pricing_writes: false,
    production_writes: false,
    storage_writes: false,
  };
  const retrieval = {
    mode: 'offline_reconciliation',
    discovery_path: DISCOVERY,
    discovery_content_fingerprint_sha256:
      discoveryArtifact.content_fingerprint_sha256,
    set_registry_path: SET_REGISTRY,
    set_registry_content_fingerprint_sha256:
      setRegistryArtifact.content_fingerprint_sha256,
    candidate_manifest_path: CANDIDATE_MANIFEST,
    v5_identity_delta_path: V5_IDENTITY_DELTA,
  };
  const reconciliationArtifact = buildArtifact({
    packageId: GENERATOR_VERSION,
    generatedAt: GENERATED_AT,
    retrieval,
    content: {
      reconciliation,
      execution_boundary: executionBoundary,
    },
  });
  const queueArtifact = buildArtifact({
    packageId: `${GENERATOR_VERSION}-DETAIL-QUEUE`,
    generatedAt: GENERATED_AT,
    retrieval,
    content: {
      work_items: detailQueue,
      request_policy: {
        approved_host: 'www.pokemon-card.com',
        max_concurrency: 1,
        minimum_request_delay_ms: 750,
        resume_required: true,
      },
      execution_boundary: executionBoundary,
    },
  });
  const summary = {
    generator_version: GENERATOR_VERSION,
    generated_at: GENERATED_AT,
    status: 'official_global_catalog_reconciled',
    as_of_date: AS_OF_DATE,
    official_global_card_count: reconciliation.length,
    v4_preserved_official_card_id_count: v4OfficialIds.size,
    v5_product_official_card_id_count: v5DeltaIds.size,
    prior_coverage_counts: countBy(
      reconciliation,
      (row) => row.prior_coverage,
    ),
    registry_match_counts: countBy(
      reconciliation,
      (row) => row.registry_match_status,
    ),
    candidate_link_counts: countBy(
      reconciliation,
      (row) => row.candidate_link_status,
    ),
    detail_disposition_counts: countBy(
      reconciliation,
      (row) => row.detail_disposition,
    ),
    detail_fetch_queue_count: detailQueue.length,
    detail_fetch_queue_by_priority: countBy(
      detailQueue,
      (row) => `priority_${row.priority}`,
    ),
    execution_boundary: executionBoundary,
  };

  await writeJsonArtifact(
    path.join(
      outputRoot,
      'official_jp_global_catalog_reconciliation_v1.json.gz',
    ),
    reconciliationArtifact,
  );
  await writeJsonArtifact(
    path.join(
      outputRoot,
      'official_jp_global_detail_fetch_queue_v1.json.gz',
    ),
    queueArtifact,
  );
  await writeJson(
    path.join(
      outputRoot,
      'official_jp_global_catalog_reconciliation_report_v1.json',
    ),
    summary,
  );
  if (!args.quiet) console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
