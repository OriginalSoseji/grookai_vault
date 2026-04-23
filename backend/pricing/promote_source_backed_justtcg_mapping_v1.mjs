import '../env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';

import { createBackendClient } from '../supabase_backend_client.mjs';
import {
  assertExecuteCanonWriteV1,
} from '../lib/contracts/execute_canon_write_v1.mjs';

const WORKER_NAME = 'promote_source_backed_justtcg_mapping_v1';
const TARGET_SOURCE = 'justtcg';
const LOOKUP_CHUNK_SIZE = 100;

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLowerOrNull(value) {
  const normalized = normalizeTextOrNull(value);
  return normalized ? normalized.toLowerCase() : null;
}

function chunkArray(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseArgs(argv) {
  const options = {
    inputJson: null,
    apply: false,
    dryRun: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      options.apply = true;
      options.dryRun = false;
    } else if (token === '--dry-run') {
      options.apply = false;
      options.dryRun = true;
    } else if (token === '--input-json' && argv[index + 1]) {
      options.inputJson = String(argv[index + 1]).trim() || null;
      index += 1;
    } else if (token.startsWith('--input-json=')) {
      options.inputJson = String(token.split('=').slice(1).join('=')).trim() || null;
    }
  }

  if (!options.inputJson) {
    throw new Error(`[${WORKER_NAME}] --input-json is required.`);
  }

  return options;
}

async function loadInputRows(inputJsonPath) {
  const resolvedPath = path.resolve(inputJsonPath);
  const raw = await fs.readFile(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : null;
  if (!rows) {
    throw new Error(`[${WORKER_NAME}] input json must contain a rows array.`);
  }

  const normalizedRows = rows.map((row, index) => ({
    batchIndex: Number(row.batch_index ?? index + 1),
    cardPrintId: normalizeTextOrNull(row.card_print_id),
    gvId: normalizeTextOrNull(row.gv_id),
    stampLabel: normalizeTextOrNull(row.stamp_label),
    variantKey: normalizeLowerOrNull(row.variant_key),
    effectiveSetCode: normalizeLowerOrNull(row.effective_set_code),
    sourceExternalId: normalizeTextOrNull(row.source_external_id),
    sourceCandidateId: normalizeTextOrNull(row.source_candidate_id),
    sourceFamily: normalizeTextOrNull(row.source_family),
  }));

  const missingFields = normalizedRows.filter(
    (row) => !row.cardPrintId || !row.sourceExternalId || !row.sourceCandidateId,
  );
  if (missingFields.length > 0) {
    throw new Error(
      `[${WORKER_NAME}] input rows missing required ids: ${missingFields
        .map((row) => row.batchIndex)
        .join(', ')}.`,
    );
  }

  const duplicateCardPrintIds = normalizedRows
    .map((row) => row.cardPrintId)
    .filter((value, index, values) => values.indexOf(value) !== index);
  if (duplicateCardPrintIds.length > 0) {
    throw new Error(`[${WORKER_NAME}] duplicate card_print_id detected in input batch.`);
  }

  const duplicateExternalIds = normalizedRows
    .map((row) => row.sourceExternalId)
    .filter((value, index, values) => values.indexOf(value) !== index);
  if (duplicateExternalIds.length > 0) {
    throw new Error(`[${WORKER_NAME}] duplicate source_external_id detected in input batch.`);
  }

  return {
    resolvedPath,
    rows: normalizedRows,
  };
}

async function fetchCardPrintRows(supabase, cardPrintIds) {
  const rows = [];
  for (const chunk of chunkArray(cardPrintIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('card_prints')
      .select('id,gv_id,name,number,variant_key,set_code')
      .in('id', chunk);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

async function fetchDiscoveryCandidates(supabase, candidateIds) {
  const rows = [];
  for (const chunk of chunkArray(candidateIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('external_discovery_candidates')
      .select('id,source,upstream_id')
      .in('id', chunk);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

async function fetchMappingsByCardPrintIds(supabase, cardPrintIds) {
  const rows = [];
  for (const chunk of chunkArray(cardPrintIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('external_mappings')
      .select('id,card_print_id,source,external_id,active')
      .eq('source', TARGET_SOURCE)
      .in('card_print_id', chunk);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

async function fetchMappingsByExternalIds(supabase, externalIds) {
  const rows = [];
  for (const chunk of chunkArray(externalIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('external_mappings')
      .select('id,card_print_id,source,external_id,active')
      .eq('source', TARGET_SOURCE)
      .in('external_id', chunk);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

function groupBy(rows, keySelector) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }
  return grouped;
}

function log(event, payload = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      worker: WORKER_NAME,
      event,
      ...payload,
    }),
  );
}

async function upsertMapping(supabase, row, batchInputPath) {
  const payloadSnapshot = {
    batch_input_path: batchInputPath,
    batch_index: row.batchIndex,
    card_print_id: row.cardPrintId,
    gv_id: row.gvId,
    source_external_id: row.sourceExternalId,
    source_candidate_id: row.sourceCandidateId,
    source_family: row.sourceFamily,
    variant_key: row.variantKey,
    effective_set_code: row.effectiveSetCode,
  };

  const meta = {
    promoted_by: WORKER_NAME,
    mapping_mode: 'source_backed_batch_input',
    batch_input_path: batchInputPath,
    batch_index: row.batchIndex,
    gv_id: row.gvId,
    stamp_label: row.stampLabel,
    variant_key: row.variantKey,
    effective_set_code: row.effectiveSetCode,
    source_candidate_id: row.sourceCandidateId,
    source_external_id: row.sourceExternalId,
    source_family: row.sourceFamily,
    source_reason: 'promoted_stamped_row_with_exact_source_backed_identity',
  };

  await assertExecuteCanonWriteV1({
    execution_name: 'promote_source_backed_justtcg_mapping_v1',
    payload_snapshot: payloadSnapshot,
    write_target: supabase,
    audit_target: supabase,
    ledger_target: supabase,
    transaction_control: 'none',
    actor_type: 'system_worker',
    source_worker: WORKER_NAME,
    source_system: 'pricing',
    contract_assertions: [
      {
        ok: Boolean(row.cardPrintId),
        contract_name: 'IDENTITY_CONTRACT_SUITE_V1',
        violation_type: 'missing_card_print_id',
        reason: 'Source-backed JustTCG mapping requires card_print_id.',
      },
      {
        ok: Boolean(row.sourceExternalId),
        contract_name: 'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
        violation_type: 'missing_source_external_id',
        reason: 'Source-backed JustTCG mapping requires source_external_id.',
      },
      {
        ok: Boolean(row.sourceCandidateId),
        contract_name: 'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
        violation_type: 'missing_source_candidate_id',
        reason: 'Source-backed JustTCG mapping requires source_candidate_id.',
      },
    ],
    proofs: [
      {
        name: 'external_mapping_round_trip',
        contract_name: 'EXTERNAL_SOURCE_INGESTION_MODEL_V1',
        violation_type: 'post_write_mapping_missing',
        async run() {
          const { data, error: selectError } = await supabase
            .from('external_mappings')
            .select('card_print_id,external_id,active')
            .eq('source', TARGET_SOURCE)
            .eq('external_id', row.sourceExternalId)
            .limit(1);

          if (selectError) {
            return {
              ok: false,
              reason: `JustTCG mapping post-write proof query failed: ${selectError.message}`,
            };
          }

          const mapping = Array.isArray(data) ? data[0] ?? null : null;
          return {
            ok:
              mapping?.active === true &&
              normalizeTextOrNull(mapping.card_print_id) === row.cardPrintId &&
              normalizeTextOrNull(mapping.external_id) === row.sourceExternalId,
            reason:
              `Expected active JustTCG mapping ${row.sourceExternalId} -> ${row.cardPrintId} after upsert.`,
          };
        },
      },
    ],
    async write(target) {
      const { error } = await target.from('external_mappings').upsert(
        {
          card_print_id: row.cardPrintId,
          source: TARGET_SOURCE,
          external_id: row.sourceExternalId,
          active: true,
          synced_at: new Date().toISOString(),
          meta,
        },
        { onConflict: 'source,external_id' },
      );

      if (error) {
        throw new Error(error.message);
      }
    },
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { resolvedPath, rows } = await loadInputRows(options.inputJson);
  const supabase = createBackendClient();

  log('run_config', {
    mode: options.apply ? 'apply' : 'dry-run',
    input_json: resolvedPath,
    scope: 'exact_promoted_stamped_batch_only',
    batch_size: rows.length,
  });

  const cardPrintIds = rows.map((row) => row.cardPrintId);
  const sourceCandidateIds = rows.map((row) => row.sourceCandidateId);
  const sourceExternalIds = rows.map((row) => row.sourceExternalId);

  const [cardPrintRows, discoveryCandidates, mappingsByCardPrintRows, mappingsByExternalIdRows] =
    await Promise.all([
      fetchCardPrintRows(supabase, cardPrintIds),
      fetchDiscoveryCandidates(supabase, sourceCandidateIds),
      fetchMappingsByCardPrintIds(supabase, cardPrintIds),
      fetchMappingsByExternalIds(supabase, sourceExternalIds),
    ]);

  if (cardPrintRows.length !== rows.length) {
    throw new Error(
      `[${WORKER_NAME}] card_print fetch mismatch: expected ${rows.length}, found ${cardPrintRows.length}.`,
    );
  }

  if (discoveryCandidates.length !== rows.length) {
    throw new Error(
      `[${WORKER_NAME}] discovery candidate fetch mismatch: expected ${rows.length}, found ${discoveryCandidates.length}.`,
    );
  }

  const cardPrintById = new Map(cardPrintRows.map((row) => [normalizeTextOrNull(row.id), row]));
  const discoveryById = new Map(discoveryCandidates.map((row) => [normalizeTextOrNull(row.id), row]));
  const mappingsByCardPrintId = groupBy(mappingsByCardPrintRows, (row) => normalizeTextOrNull(row.card_print_id));
  const mappingsByExternalId = groupBy(mappingsByExternalIdRows, (row) => normalizeTextOrNull(row.external_id));

  const results = [];
  let applied = 0;

  for (const row of rows.sort((left, right) => left.batchIndex - right.batchIndex)) {
    const cardPrint = cardPrintById.get(row.cardPrintId);
    if (!cardPrint) {
      throw new Error(`[${WORKER_NAME}] missing card_print ${row.cardPrintId}.`);
    }

    const discoveryCandidate = discoveryById.get(row.sourceCandidateId);
    if (!discoveryCandidate) {
      throw new Error(`[${WORKER_NAME}] missing source candidate ${row.sourceCandidateId}.`);
    }

    if (normalizeLowerOrNull(discoveryCandidate.source) !== TARGET_SOURCE) {
      throw new Error(
        `[${WORKER_NAME}] source candidate ${row.sourceCandidateId} is not ${TARGET_SOURCE}.`,
      );
    }

    if (normalizeTextOrNull(discoveryCandidate.upstream_id) !== row.sourceExternalId) {
      throw new Error(
        `[${WORKER_NAME}] source candidate ${row.sourceCandidateId} upstream_id drifted from input batch.`,
      );
    }

    if (
      row.variantKey &&
      normalizeLowerOrNull(cardPrint.variant_key) &&
      row.variantKey !== normalizeLowerOrNull(cardPrint.variant_key)
    ) {
      throw new Error(`[${WORKER_NAME}] variant_key drift detected for ${row.cardPrintId}.`);
    }

    if (
      row.effectiveSetCode &&
      normalizeLowerOrNull(cardPrint.set_code) &&
      row.effectiveSetCode !== normalizeLowerOrNull(cardPrint.set_code)
    ) {
      throw new Error(`[${WORKER_NAME}] set_code drift detected for ${row.cardPrintId}.`);
    }

    const activeMappingsForCard = (mappingsByCardPrintId.get(row.cardPrintId) ?? []).filter(
      (mapping) => mapping.active === true,
    );
    const mappingsForExternalId = mappingsByExternalId.get(row.sourceExternalId) ?? [];
    const activeMappingsForExternalId = mappingsForExternalId.filter((mapping) => mapping.active === true);
    const exactActiveMapping = activeMappingsForCard.find(
      (mapping) =>
        normalizeTextOrNull(mapping.external_id) === row.sourceExternalId &&
        normalizeTextOrNull(mapping.card_print_id) === row.cardPrintId,
    );

    let status = 'would_upsert';
    let reason = 'No active JustTCG mapping exists for this promoted stamped row yet.';

    if (exactActiveMapping) {
      status = 'already_correct';
      reason = 'Exact active JustTCG mapping already exists.';
    } else if (
      activeMappingsForCard.some(
        (mapping) =>
          normalizeTextOrNull(mapping.card_print_id) === row.cardPrintId &&
          normalizeTextOrNull(mapping.external_id) !== row.sourceExternalId,
      )
    ) {
      status = 'conflict_existing_card_print_mapping';
      reason = 'Card print already has a different active JustTCG mapping.';
    } else if (
      activeMappingsForExternalId.some(
        (mapping) => normalizeTextOrNull(mapping.card_print_id) !== row.cardPrintId,
      )
    ) {
      status = 'conflict_external_id_claimed_elsewhere';
      reason = 'Source external id is already mapped to a different card print.';
    } else if (
      mappingsForExternalId.some(
        (mapping) =>
          mapping.active !== true && normalizeTextOrNull(mapping.card_print_id) !== row.cardPrintId,
      )
    ) {
      status = 'conflict_inactive_external_id_claimed_elsewhere';
      reason = 'Inactive JustTCG mapping history points this external id at a different card print.';
    } else if (
      (mappingsByCardPrintId.get(row.cardPrintId) ?? []).some(
        (mapping) =>
          mapping.active !== true && normalizeTextOrNull(mapping.external_id) !== row.sourceExternalId,
      )
    ) {
      status = 'conflict_inactive_card_print_mapping';
      reason = 'Inactive JustTCG mapping history exists for a different external id on this card print.';
    }

    if (status === 'would_upsert' && options.apply) {
      await upsertMapping(supabase, row, resolvedPath);
      applied += 1;
      status = 'upserted';
      reason = 'Source-backed JustTCG mapping written for promoted stamped row.';
    }

    const result = {
      batch_index: row.batchIndex,
      card_print_id: row.cardPrintId,
      gv_id: row.gvId ?? normalizeTextOrNull(cardPrint.gv_id),
      name: normalizeTextOrNull(cardPrint.name),
      number: normalizeTextOrNull(cardPrint.number),
      variant_key: normalizeLowerOrNull(cardPrint.variant_key),
      set_code: normalizeLowerOrNull(cardPrint.set_code),
      source_external_id: row.sourceExternalId,
      status,
      reason,
    };
    results.push(result);
    log('row', result);
  }

  const summary = {
    batch_size: rows.length,
    already_correct: results.filter((row) => row.status === 'already_correct').length,
    would_upsert: results.filter((row) => row.status === 'would_upsert').length,
    upserted: results.filter((row) => row.status === 'upserted').length,
    conflicts: results.filter((row) => row.status.startsWith('conflict_')).length,
    applied,
    unique_card_print_ids: uniqueValues(results.map((row) => row.card_print_id)).length,
    unique_external_ids: uniqueValues(results.map((row) => row.source_external_id)).length,
    examples: results.slice(0, 10),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (summary.conflicts > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
