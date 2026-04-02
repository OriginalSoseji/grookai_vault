import '../env.mjs';

import { createBackendClient } from '../supabase_backend_client.mjs';

const SOURCE = 'justtcg';
const STAGING_TABLE = 'external_discovery_candidates';
const MAPPINGS_TABLE = 'external_mappings';
const PAGE_SIZE = 200;
const WRITE_CHUNK_SIZE = 200;
const WORKER_NAME = 'tk_mapping_write_v1';
const MANIFEST_VERSION = 'TK_MANIFEST_V1';

if (process.env.SUPABASE_URL_LOCAL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_LOCAL;
}
if (process.env.SUPABASE_SECRET_KEY_LOCAL) {
  process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY_LOCAL;
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseArgs(argv) {
  const options = {
    apply: false,
    setId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--set-id' && argv[index + 1]) {
      options.setId = normalizeTextOrNull(argv[index + 1]);
      index += 1;
    } else if (token.startsWith('--set-id=')) {
      options.setId = normalizeTextOrNull(token.slice('--set-id='.length));
    }
  }

  return options;
}

async function fetchResolvedStageRows(supabase, setId) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(STAGING_TABLE)
      .select('id,source,upstream_id,set_id,resolved_set_code,card_print_id,classifier_version,match_status')
      .eq('source', SOURCE)
      .eq('set_id', setId)
      .eq('match_status', 'RESOLVED')
      .not('card_print_id', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += batch.length;
  }

  return rows;
}

async function fetchExistingMappingsByExternalIds(supabase, externalIds) {
  const rows = [];

  for (let index = 0; index < externalIds.length; index += PAGE_SIZE) {
    const chunk = externalIds.slice(index, index + PAGE_SIZE);
    const { data, error } = await supabase
      .from(MAPPINGS_TABLE)
      .select('id,card_print_id,source,external_id,active')
      .eq('source', SOURCE)
      .in('external_id', chunk);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

function groupByExternalId(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const externalId = normalizeTextOrNull(row.external_id);
    if (!externalId) {
      continue;
    }

    if (!grouped.has(externalId)) {
      grouped.set(externalId, []);
    }

    grouped.get(externalId).push(row);
  }

  return grouped;
}

function buildInsertRows(readyRows) {
  return readyRows.map((row) => ({
    card_print_id: row.card_print_id,
    source: SOURCE,
    external_id: row.upstream_id,
    active: true,
    meta: {
      source_worker: WORKER_NAME,
      set_id: row.set_id,
      resolved_set_code: row.resolved_set_code,
      staging_candidate_id: row.id,
      classifier_version: row.classifier_version ?? null,
      manifest_version: MANIFEST_VERSION,
    },
    synced_at: new Date().toISOString(),
  }));
}

function printSummary(summary) {
  console.log(`[tk-mapping-write] mode=${summary.mode}`);
  console.log(`[tk-mapping-write] set_id=${summary.setId}`);
  console.log(`[tk-mapping-write] total_resolved_rows=${summary.totalResolvedRows}`);
  console.log(`[tk-mapping-write] already_mapped_count=${summary.alreadyMappedCount}`);
  console.log(`[tk-mapping-write] missing_mapping_count=${summary.missingMappingCount}`);
  console.log(`[tk-mapping-write] rows_ready_to_write=${summary.rowsReadyToWrite}`);
  console.log(
    `[tk-mapping-write] duplicate_staging_conflict_count=${summary.duplicateStagingConflictCount}`,
  );
  console.log(
    `[tk-mapping-write] active_mapping_conflict_count=${summary.activeMappingConflictCount}`,
  );
  console.log(
    `[tk-mapping-write] inactive_mapping_conflict_count=${summary.inactiveMappingConflictCount}`,
  );

  if (summary.mode === 'apply') {
    console.log(`[tk-mapping-write] rows_written=${summary.rowsWritten}`);
    console.log(`[tk-mapping-write] rows_skipped=${summary.rowsSkipped}`);
  }
}

async function writeMappings(supabase, rows) {
  let rowsWritten = 0;

  for (let index = 0; index < rows.length; index += WRITE_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + WRITE_CHUNK_SIZE);
    const { data, error } = await supabase
      .from(MAPPINGS_TABLE)
      .upsert(chunk, {
        onConflict: 'source,external_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      throw error;
    }

    rowsWritten += Array.isArray(data) ? data.length : 0;
  }

  return rowsWritten;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const setId = options.setId;
  if (!setId) {
    throw new Error('[tk-mapping-write] STOP: --set-id is required for repair-only TK mapping writes.');
  }

  const supabase = createBackendClient();
  const stagingRows = await fetchResolvedStageRows(supabase, setId);
  const externalIds = stagingRows
    .map((row) => normalizeTextOrNull(row.upstream_id))
    .filter(Boolean);

  const duplicateStageMap = groupByExternalId(
    stagingRows.map((row) => ({
      external_id: row.upstream_id,
      id: row.id,
    })),
  );
  const duplicateStagingConflicts = [...duplicateStageMap.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([externalId, rows]) => ({
      external_id: externalId,
      staging_candidate_ids: rows.map((row) => row.id),
    }));

  const existingMappings = externalIds.length
    ? await fetchExistingMappingsByExternalIds(supabase, externalIds)
    : [];
  const mappingsByExternalId = groupByExternalId(existingMappings);

  const activeMappingConflicts = [];
  const inactiveMappingConflicts = [];
  const incorrectMappings = [];
  const readyRows = [];
  let alreadyMappedCount = 0;
  let missingMappingCount = 0;

  for (const row of stagingRows) {
    const externalId = normalizeTextOrNull(row.upstream_id);
    const mappings = mappingsByExternalId.get(externalId) ?? [];
    const activeMappings = mappings.filter((mapping) => mapping.active === true);
    const inactiveMappings = mappings.filter((mapping) => mapping.active !== true);

    if (activeMappings.length > 1) {
      activeMappingConflicts.push({
        external_id: externalId,
        mapping_ids: activeMappings.map((mapping) => mapping.id),
      });
      continue;
    }

    if (activeMappings.length === 1) {
      if (activeMappings[0].card_print_id !== row.card_print_id) {
        incorrectMappings.push({
          external_id: externalId,
          staging_candidate_id: row.id,
          expected_card_print_id: row.card_print_id,
          mapped_card_print_id: activeMappings[0].card_print_id,
          mapping_id: activeMappings[0].id,
        });
        continue;
      }

      alreadyMappedCount += 1;
      continue;
    }

    if (inactiveMappings.length > 0) {
      inactiveMappingConflicts.push({
        external_id: externalId,
        mapping_ids: inactiveMappings.map((mapping) => mapping.id),
      });
      continue;
    }

    missingMappingCount += 1;
    readyRows.push(row);
  }

  const summary = {
    mode: options.apply ? 'apply' : 'dry-run',
    setId,
    totalResolvedRows: stagingRows.length,
    alreadyMappedCount,
    missingMappingCount,
    rowsReadyToWrite: readyRows.length,
    duplicateStagingConflictCount: duplicateStagingConflicts.length,
    activeMappingConflictCount: activeMappingConflicts.length + incorrectMappings.length,
    inactiveMappingConflictCount: inactiveMappingConflicts.length,
    rowsWritten: 0,
    rowsSkipped: alreadyMappedCount,
  };

  printSummary(summary);

  if (duplicateStagingConflicts.length > 0) {
    console.error(
      `[tk-mapping-write] STOP: duplicate staging rows detected: ${JSON.stringify(duplicateStagingConflicts)}`,
    );
    process.exit(1);
  }

  if (activeMappingConflicts.length > 0) {
    console.error(
      `[tk-mapping-write] STOP: duplicate active mappings detected: ${JSON.stringify(activeMappingConflicts)}`,
    );
    process.exit(1);
  }

  if (incorrectMappings.length > 0) {
    console.error(
      `[tk-mapping-write] STOP: incorrect existing mappings detected: ${JSON.stringify(incorrectMappings)}`,
    );
    process.exit(1);
  }

  if (inactiveMappingConflicts.length > 0) {
    console.error(
      `[tk-mapping-write] STOP: inactive mapping rows already exist for target external ids: ${JSON.stringify(inactiveMappingConflicts)}`,
    );
    process.exit(1);
  }

  if (!options.apply) {
    return;
  }

  if (readyRows.length === 0) {
    return;
  }

  summary.rowsWritten = await writeMappings(supabase, buildInsertRows(readyRows));
  summary.rowsSkipped = summary.totalResolvedRows - summary.rowsWritten;
  printSummary(summary);
}

run().catch((error) => {
  console.error('[tk-mapping-write] Fatal error:', error);
  process.exit(1);
});
