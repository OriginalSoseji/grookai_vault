import '../env.mjs';

import { pathToFileURL } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  BA_SET_CODES,
  runUnderlyingIdentityAudit,
} from './ba_underlying_identity_audit_v1.mjs';

const SOURCE = 'justtcg';
const MAPPINGS_TABLE = 'external_mappings';
const WRITE_CHUNK_SIZE = 200;
const LOOKUP_CHUNK_SIZE = 200;
const WORKER_NAME = 'ba_phase1_mapping_write_v1';
const PHASE_NAME = 'BA_PHASE_1_UNDERLYING_MAPPING';

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
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--limit' && argv[index + 1]) {
      const parsed = Number.parseInt(String(argv[index + 1]), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const parsed = Number.parseInt(token.slice('--limit='.length), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
    }
  }

  return options;
}

function chunkArray(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function groupByExternalId(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const externalId = normalizeTextOrNull(row.external_id ?? row.upstream_id);
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

async function fetchMappingsByExternalIds(supabase, externalIds) {
  const rows = [];
  const uniqueExternalIds = [...new Set(externalIds.map((value) => normalizeTextOrNull(value)).filter(Boolean))];

  for (const chunk of chunkArray(uniqueExternalIds, LOOKUP_CHUNK_SIZE)) {
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

function buildPhase1Targets(audit) {
  return audit.classifiedRows.filter((row) => row.classification === 'STRUCTURED_SINGLE_MATCH');
}

function buildPlan(audit, existingMappingsByExternalId) {
  const structuredSingleRows = buildPhase1Targets(audit);
  const stageConflicts = [];
  const activeMappingConflicts = [];
  const inactiveMappingConflicts = [];
  const alreadyCorrectRows = [];
  const missingRows = [];
  const readyRows = [];

  const structuredByExternalId = groupByExternalId(structuredSingleRows);
  for (const [externalId, rows] of structuredByExternalId.entries()) {
    const distinctTargets = [...new Set(rows.map((row) => normalizeTextOrNull(row.mapped_card_print_id)).filter(Boolean))];
    if (distinctTargets.length > 1) {
      stageConflicts.push({
        external_id: externalId,
        staging_candidate_ids: rows.map((row) => row.staging_candidate_id),
        expected_card_print_ids: distinctTargets,
      });
      continue;
    }

    const representative = rows[0];
    const mappings = existingMappingsByExternalId.get(externalId) ?? [];
    const activeMappings = mappings.filter((mapping) => mapping.active === true);
    const inactiveMappings = mappings.filter((mapping) => mapping.active !== true);

    if (activeMappings.length > 1) {
      activeMappingConflicts.push({
        external_id: externalId,
        staging_candidate_ids: rows.map((row) => row.staging_candidate_id),
        mapping_ids: activeMappings.map((mapping) => mapping.id),
        mapped_card_print_ids: activeMappings.map((mapping) => mapping.card_print_id),
        expected_card_print_id: representative.mapped_card_print_id,
      });
      continue;
    }

    if (activeMappings.length === 1) {
      if (normalizeTextOrNull(activeMappings[0].card_print_id) !== normalizeTextOrNull(representative.mapped_card_print_id)) {
        activeMappingConflicts.push({
          external_id: externalId,
          staging_candidate_ids: rows.map((row) => row.staging_candidate_id),
          mapping_ids: [activeMappings[0].id],
          mapped_card_print_ids: [activeMappings[0].card_print_id],
          expected_card_print_id: representative.mapped_card_print_id,
        });
        continue;
      }

      alreadyCorrectRows.push(representative);
      continue;
    }

    if (inactiveMappings.length > 0) {
      inactiveMappingConflicts.push({
        external_id: externalId,
        staging_candidate_ids: rows.map((row) => row.staging_candidate_id),
        mapping_ids: inactiveMappings.map((mapping) => mapping.id),
        mapped_card_print_ids: inactiveMappings.map((mapping) => mapping.card_print_id),
        expected_card_print_id: representative.mapped_card_print_id,
      });
      continue;
    }

    missingRows.push(representative);
    readyRows.push(representative);
  }

  const incorrectExistingMappingCount = stageConflicts.length + activeMappingConflicts.length + inactiveMappingConflicts.length;

  return {
    structuredSingleRows,
    stageConflicts,
    activeMappingConflicts,
    inactiveMappingConflicts,
    alreadyCorrectRows,
    missingRows,
    readyRows,
    incorrectExistingMappingCount,
  };
}

function buildInsertRows(rows) {
  const syncedAt = new Date().toISOString();

  return rows.map((row) => ({
    card_print_id: row.mapped_card_print_id,
    source: SOURCE,
    external_id: row.upstream_id,
    active: true,
    meta: {
      source_worker: WORKER_NAME,
      phase: PHASE_NAME,
      set_id: row.set_id,
      normalized_name: row.normalized_name,
      number_raw: row.number_raw,
      candidate_id: row.staging_candidate_id,
      classification: 'STRUCTURED_SINGLE_MATCH',
    },
    synced_at: syncedAt,
  }));
}

async function insertMappings(supabase, rows) {
  let rowsWritten = 0;

  for (const chunk of chunkArray(rows, WRITE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from(MAPPINGS_TABLE)
      .insert(chunk)
      .select('id,external_id');

    if (error) {
      throw error;
    }

    rowsWritten += Array.isArray(data) ? data.length : 0;
  }

  return rowsWritten;
}

function printSummary(summary) {
  console.log(`[ba-phase1-mapping-write-v1] mode=${summary.mode}`);
  console.log(`[ba-phase1-mapping-write-v1] total_target_rows=${summary.total_target_rows}`);
  console.log(`[ba-phase1-mapping-write-v1] mapped_underlying_count=${summary.mapped_underlying_count}`);
  console.log(`[ba-phase1-mapping-write-v1] tcgplayer_bridged_underlying_count=${summary.tcgplayer_bridged_underlying_count}`);
  console.log(`[ba-phase1-mapping-write-v1] structured_single_match_count=${summary.structured_single_match_count}`);
  console.log(`[ba-phase1-mapping-write-v1] structured_multi_match_count=${summary.structured_multi_match_count}`);
  console.log(`[ba-phase1-mapping-write-v1] no_underlying_match_count=${summary.no_underlying_match_count}`);
  console.log(`[ba-phase1-mapping-write-v1] excluded_from_audit_count=${summary.excluded_from_audit_count}`);
  console.log(`[ba-phase1-mapping-write-v1] already_correct_count=${summary.already_correct_count}`);
  console.log(`[ba-phase1-mapping-write-v1] missing_mapping_count=${summary.missing_mapping_count}`);
  console.log(`[ba-phase1-mapping-write-v1] incorrect_existing_mapping_count=${summary.incorrect_existing_mapping_count}`);
  console.log(`[ba-phase1-mapping-write-v1] rows_ready_to_write=${summary.rows_ready_to_write}`);
  console.log(`[ba-phase1-mapping-write-v1] duplicate_target_surface_conflict_count=${summary.duplicate_target_surface_conflict_count}`);
  console.log(`[ba-phase1-mapping-write-v1] duplicate_active_mapping_count=${summary.duplicate_active_mapping_count}`);
  console.log(`[ba-phase1-mapping-write-v1] inactive_existing_mapping_count=${summary.inactive_existing_mapping_count}`);

  for (const releaseSummary of summary.per_release_counts) {
    console.log(
      `[ba-phase1-mapping-write-v1][release=${releaseSummary.ba_set_code}] mapped_underlying_count=${releaseSummary.mapped_underlying_count} tcgplayer_bridged_underlying_count=${releaseSummary.tcgplayer_bridged_underlying_count} structured_single_match_count=${releaseSummary.structured_single_match_count} structured_multi_match_count=${releaseSummary.structured_multi_match_count} no_underlying_match_count=${releaseSummary.no_underlying_match_count} excluded_from_audit_count=${releaseSummary.excluded_from_audit_count} already_correct_count=${releaseSummary.already_correct_count} missing_mapping_count=${releaseSummary.missing_mapping_count} incorrect_existing_mapping_count=${releaseSummary.incorrect_existing_mapping_count} rows_ready_to_write=${releaseSummary.rows_ready_to_write}`,
    );
  }
}

function printConflicts(plan) {
  if (plan.stageConflicts.length > 0) {
    console.log('[ba-phase1-mapping-write-v1][conflict] duplicate_target_surface_conflicts=');
    console.log(JSON.stringify(plan.stageConflicts, null, 2));
  }

  if (plan.activeMappingConflicts.length > 0) {
    console.log('[ba-phase1-mapping-write-v1][conflict] active_mapping_conflicts=');
    console.log(JSON.stringify(plan.activeMappingConflicts, null, 2));
  }

  if (plan.inactiveMappingConflicts.length > 0) {
    console.log('[ba-phase1-mapping-write-v1][conflict] inactive_mapping_conflicts=');
    console.log(JSON.stringify(plan.inactiveMappingConflicts, null, 2));
  }
}

function buildPerReleaseCounts(audit, plan) {
  return BA_SET_CODES.map((baSetCode) => {
    const releaseRows = audit.classifiedRows.filter((row) => row.ba_set_code === baSetCode);
    const releaseReadyRows = plan.readyRows.filter((row) => row.ba_set_code === baSetCode);
    const releaseAlreadyCorrectRows = plan.alreadyCorrectRows.filter((row) => row.ba_set_code === baSetCode);
    const releaseMissingRows = plan.missingRows.filter((row) => row.ba_set_code === baSetCode);
    const releaseIncorrectRows = [
      ...plan.stageConflicts.filter((row) => row.external_id && row.staging_candidate_ids),
      ...plan.activeMappingConflicts,
      ...plan.inactiveMappingConflicts,
    ].filter((conflict) => {
      const anyRow = [...releaseRows].find((row) => row.upstream_id === conflict.external_id);
      return Boolean(anyRow);
    });

    return {
      ba_set_code: baSetCode,
      mapped_underlying_count: releaseRows.filter((row) => row.classification === 'MAPPED_UNDERLYING').length,
      tcgplayer_bridged_underlying_count: releaseRows.filter(
        (row) => row.classification === 'TCGPLAYER_BRIDGED_UNDERLYING',
      ).length,
      structured_single_match_count: releaseRows.filter((row) => row.classification === 'STRUCTURED_SINGLE_MATCH')
        .length,
      structured_multi_match_count: releaseRows.filter((row) => row.classification === 'STRUCTURED_MULTI_MATCH')
        .length,
      no_underlying_match_count: releaseRows.filter((row) => row.classification === 'NO_UNDERLYING_MATCH').length,
      excluded_from_audit_count: releaseRows.filter((row) => row.classification === 'EXCLUDED_FROM_AUDIT').length,
      already_correct_count: releaseAlreadyCorrectRows.length,
      missing_mapping_count: releaseMissingRows.length,
      incorrect_existing_mapping_count: releaseIncorrectRows.length,
      rows_ready_to_write: releaseReadyRows.length,
    };
  });
}

async function verifyPhase1Mappings(supabase, targetRows, targetSurfaceExternalIds) {
  const allMappings = await fetchMappingsByExternalIds(
    supabase,
    targetSurfaceExternalIds.map((value) => normalizeTextOrNull(value)),
  );
  const mappingsByExternalId = groupByExternalId(allMappings);

  let correctCount = 0;
  let missingCount = 0;
  let incorrectCount = 0;

  for (const row of targetRows) {
    const externalId = normalizeTextOrNull(row.upstream_id);
    const activeMappings = (mappingsByExternalId.get(externalId) ?? []).filter((mapping) => mapping.active === true);

    if (activeMappings.length === 1) {
      if (normalizeTextOrNull(activeMappings[0].card_print_id) === normalizeTextOrNull(row.mapped_card_print_id)) {
        correctCount += 1;
      } else {
        incorrectCount += 1;
      }
      continue;
    }

    if (activeMappings.length === 0) {
      missingCount += 1;
      continue;
    }

    incorrectCount += 1;
  }

  const totalActiveBaFamilyMappings = [...new Set(
    allMappings
      .filter((mapping) => mapping.active === true)
      .map((mapping) => normalizeTextOrNull(mapping.external_id))
      .filter(Boolean),
  )].length;

  return {
    correct_count: correctCount,
    missing_count: missingCount,
    incorrect_count: incorrectCount,
    total_active_ba_family_justtcg_mappings: totalActiveBaFamilyMappings,
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = createBackendClient();

  console.log(`[ba-phase1-mapping-write-v1] mode=${options.apply ? 'apply' : 'dry-run'}`);

  const audit = await runUnderlyingIdentityAudit(supabase, { limit: options.limit });
  const targetSurfaceExternalIds = audit.classifiedRows
    .map((row) => normalizeTextOrNull(row.upstream_id))
    .filter(Boolean);
  const existingMappings = targetSurfaceExternalIds.length > 0
    ? await fetchMappingsByExternalIds(supabase, targetSurfaceExternalIds)
    : [];
  const existingMappingsByExternalId = groupByExternalId(existingMappings);
  const plan = buildPlan(audit, existingMappingsByExternalId);

  const summary = {
    mode: options.apply ? 'apply' : 'dry-run',
    total_target_rows: audit.classifiedRows.length,
    mapped_underlying_count: audit.overallSummaryCounts.mapped_underlying_count,
    tcgplayer_bridged_underlying_count: audit.overallSummaryCounts.tcgplayer_bridged_underlying_count,
    structured_single_match_count: audit.overallSummaryCounts.structured_single_match_count,
    structured_multi_match_count: audit.overallSummaryCounts.structured_multi_match_count,
    no_underlying_match_count: audit.overallSummaryCounts.no_underlying_match_count,
    excluded_from_audit_count: audit.overallSummaryCounts.excluded_from_audit_count,
    already_correct_count: plan.alreadyCorrectRows.length,
    missing_mapping_count: plan.missingRows.length,
    incorrect_existing_mapping_count: plan.incorrectExistingMappingCount,
    rows_ready_to_write: plan.readyRows.length,
    duplicate_target_surface_conflict_count: plan.stageConflicts.length,
    duplicate_active_mapping_count: plan.activeMappingConflicts.length,
    inactive_existing_mapping_count: plan.inactiveMappingConflicts.length,
    per_release_counts: buildPerReleaseCounts(audit, plan),
  };

  printSummary(summary);
  printConflicts(plan);

  if (!options.apply) {
    return;
  }

  if (plan.incorrectExistingMappingCount > 0) {
    throw new Error(
      `[ba-phase1-mapping-write-v1] STOP: incorrect or conflicting existing mappings detected: count=${plan.incorrectExistingMappingCount}.`,
    );
  }

  const insertRows = buildInsertRows(plan.readyRows);
  const rowsWritten = insertRows.length > 0 ? await insertMappings(supabase, insertRows) : 0;
  console.log(`[ba-phase1-mapping-write-v1][apply] rows_written=${rowsWritten}`);

  const verification = await verifyPhase1Mappings(
    supabase,
    plan.structuredSingleRows,
    targetSurfaceExternalIds,
  );
  console.log(`[ba-phase1-mapping-write-v1][verification] ${JSON.stringify(verification)}`);
}

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase1-mapping-write-v1] Fatal error:', error);
    process.exit(1);
  });
}
