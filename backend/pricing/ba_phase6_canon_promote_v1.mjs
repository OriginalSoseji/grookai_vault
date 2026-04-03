import '../env.mjs';

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createBackendClient } from '../supabase_backend_client.mjs';

const PHASE_NAME = 'BA_PHASE6_CANON_PROMOTION_V1';
const BA_SET_CODES = ['ba-2020', 'ba-2022', 'ba-2024'];
const EXPECTED_CANDIDATE_COUNT = 328;
const EXPECTED_IDENTITY_KEY_FIELDS = [
  'ba_set_code',
  'printed_number',
  'normalized_printed_name',
  'source_name_raw',
];
const REQUIRED_CARD_PRINTS_COLUMNS = ['normalized_printed_name', 'source_name_raw'];
const APPLY_FLAG = '--apply';
const LOOKUP_CHUNK_SIZE = 100;

function buildPaths() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..', '..');
  const checkpointsDir = path.join(repoRoot, 'docs', 'checkpoints');

  return {
    repoRoot,
    checkpointsDir,
    phase5Candidates: path.join(checkpointsDir, 'ba_phase5_promotion_candidates_v1.json'),
    phase5Verification: path.join(checkpointsDir, 'ba_phase5_contract_verification_v1.json'),
    baContract: path.join(repoRoot, 'docs', 'contracts', 'BATTLE_ACADEMY_CANON_CONTRACT_V1.md'),
    promotionReport: path.join(checkpointsDir, 'ba_phase6_promotion_report_v1.json'),
  };
}

function parseArgs(argv) {
  return {
    apply: argv.includes(APPLY_FLAG),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUpperHyphenToken(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function buildPhase6GvId(row) {
  const numberToken = normalizeUpperHyphenToken(row.printed_number);
  const nameToken = normalizeUpperHyphenToken(row.normalized_printed_name);
  const sourceToken = normalizeUpperHyphenToken(row.source_name_raw);

  if (!numberToken || !nameToken || !sourceToken) {
    throw new Error(`[ba-phase6-canon-promote-v1] STOP: missing gv_id token input for row ${row.ba_row_id}.`);
  }

  return `GV-PK-BA-${numberToken}-${nameToken}-${sourceToken}`;
}

function buildIdentityKeyString(row) {
  return EXPECTED_IDENTITY_KEY_FIELDS.map((field) => JSON.stringify(row[field] ?? null)).join('::');
}

function buildIdentityKeyHash(row) {
  return crypto.createHash('sha256').update(buildIdentityKeyString(row)).digest('hex');
}

function chunkArray(values, chunkSize) {
  const chunks = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

async function loadPhase5State() {
  const paths = buildPaths();
  const [candidatesPayload, verificationPayload, contractText] = await Promise.all([
    readJson(paths.phase5Candidates),
    readJson(paths.phase5Verification),
    fs.readFile(paths.baContract, 'utf8'),
  ]);

  return {
    paths,
    candidatesPayload,
    verificationPayload,
    contractText,
  };
}

function validatePhase5State(state) {
  const mismatches = [];
  const summaryCount = state.candidatesPayload?.summary_counts?.promotion_eligible_candidate_count ?? null;
  if (summaryCount !== EXPECTED_CANDIDATE_COUNT) {
    mismatches.push({
      field: 'promotion_eligible_candidate_count',
      expected: EXPECTED_CANDIDATE_COUNT,
      actual: summaryCount,
    });
  }

  const keyFields = state.candidatesPayload?.candidate_identity_key_v1?.key_fields ?? [];
  if (JSON.stringify(keyFields) !== JSON.stringify(EXPECTED_IDENTITY_KEY_FIELDS)) {
    mismatches.push({
      field: 'candidate_identity_key_v1.key_fields',
      expected: EXPECTED_IDENTITY_KEY_FIELDS,
      actual: keyFields,
    });
  }

  if (state.verificationPayload?.passed !== true) {
    mismatches.push({
      field: 'phase5_verification_passed',
      expected: true,
      actual: state.verificationPayload?.passed ?? null,
    });
  }

  const contractIdentityString = '(ba_set_code, printed_number, normalized_printed_name, source_name_raw)';
  if (!state.contractText.includes(contractIdentityString)) {
    mismatches.push({
      field: 'ba_contract_identity_key',
      expected: contractIdentityString,
      actual: 'missing',
    });
  }

  if (mismatches.length > 0) {
    throw new Error(`[ba-phase6-canon-promote-v1] STOP: Phase 5 lock mismatch: ${JSON.stringify(mismatches)}.`);
  }
}

function buildPlannedCandidates(state) {
  const rows = state.candidatesPayload.rows ?? [];
  const plannedRows = [];
  const identityKeyIndex = new Map();
  const gvIdIndex = new Map();
  const rowValidationFailures = [];

  for (const row of rows) {
    const key = buildIdentityKeyString(row);
    const identityKeyHash = buildIdentityKeyHash(row);
    const gvId = buildPhase6GvId(row);
    const displayName = normalizeTextOrNull(row.raw_printed_name) ?? normalizeTextOrNull(row.normalized_printed_name);
    const numberPlain = normalizeTextOrNull(row.printed_number);
    const normalizedPrintedName = normalizeTextOrNull(row.normalized_printed_name);
    const sourceNameRaw = normalizeTextOrNull(row.source_name_raw);

    if (
      row.promotion_candidate_status !== 'PROMOTION_ELIGIBLE_CANDIDATE' ||
      !normalizeTextOrNull(row.ba_set_code) ||
      !numberPlain ||
      !normalizedPrintedName ||
      !sourceNameRaw ||
      !displayName
    ) {
      rowValidationFailures.push({
        ba_row_id: row.ba_row_id ?? null,
        upstream_id: row.upstream_id ?? null,
      });
      continue;
    }

    if (identityKeyIndex.has(key)) {
      throw new Error(
        `[ba-phase6-canon-promote-v1] STOP: duplicate planned identity key ${key} for rows ${identityKeyIndex.get(key)} and ${row.ba_row_id}.`,
      );
    }
    identityKeyIndex.set(key, row.ba_row_id);

    if (gvIdIndex.has(gvId)) {
      throw new Error(
        `[ba-phase6-canon-promote-v1] STOP: gv_id collision ${gvId} for rows ${gvIdIndex.get(gvId)} and ${row.ba_row_id}.`,
      );
    }
    gvIdIndex.set(gvId, row.ba_row_id);

    plannedRows.push({
      ba_row_id: row.ba_row_id,
      upstream_id: row.upstream_id,
      ba_set_code: row.ba_set_code,
      printed_number: row.printed_number,
      number_plain: numberPlain,
      parsed_printed_total: row.parsed_printed_total ?? null,
      normalized_printed_name: normalizedPrintedName,
      raw_printed_name: row.raw_printed_name ?? null,
      source_name_raw: sourceNameRaw,
      display_name: displayName,
      identity_key_string: key,
      identity_key_hash: identityKeyHash,
      gv_id: gvId,
    });
  }

  if (rowValidationFailures.length > 0) {
    throw new Error(
      `[ba-phase6-canon-promote-v1] STOP: invalid Phase 5 candidate rows: ${JSON.stringify(rowValidationFailures.slice(0, 10))}.`,
    );
  }

  return {
    rows: plannedRows,
    summary: {
      total_candidates: plannedRows.length,
      unique_identity_keys: identityKeyIndex.size,
      unique_gv_ids: gvIdIndex.size,
    },
  };
}

async function probeCardPrintsColumn(supabase, columnName) {
  const { error } = await supabase.from('card_prints').select(`id,${columnName}`).limit(1);
  if (!error) {
    return {
      column_name: columnName,
      present: true,
      error_message: null,
    };
  }

  const lowerMessage = String(error.message ?? '').toLowerCase();
  if (lowerMessage.includes('does not exist')) {
    return {
      column_name: columnName,
      present: false,
      error_message: error.message,
    };
  }

  throw error;
}

async function fetchBaSets(supabase) {
  const { data, error } = await supabase
    .from('sets')
    .select('id,code,name,game')
    .in('code', BA_SET_CODES)
    .order('code');

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchExistingBaCanonRows(supabase) {
  const { data, error } = await supabase
    .from('card_prints')
    .select('id,set_id,set_code,number,name,gv_id')
    .in('set_code', BA_SET_CODES);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchExistingGvIds(supabase, gvIds) {
  const rows = [];

  for (const chunk of chunkArray(gvIds, LOOKUP_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('card_prints')
      .select('id,gv_id,set_code,number,name')
      .in('gv_id', chunk);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

function buildPreflightSummary(plannedCandidates, columnProbes, baSets, existingBaCanonRows, existingGvIdRows) {
  const missingColumns = columnProbes.filter((probe) => probe.present !== true).map((probe) => probe.column_name);
  const missingSetCodes = BA_SET_CODES.filter((code) => !baSets.some((row) => row.code === code));
  const blockers = [];

  if (missingColumns.length > 0) {
    blockers.push({
      code: 'MISSING_CARD_PRINTS_IDENTITY_COLUMNS',
      missing_columns: missingColumns,
      details: columnProbes.filter((probe) => probe.present !== true),
    });
  }

  if (missingSetCodes.length > 0) {
    blockers.push({
      code: 'MISSING_BA_RELEASE_SETS',
      missing_set_codes: missingSetCodes,
    });
  }

  return {
    blocker_count: blockers.length,
    blockers,
    schema_identity_columns_present: missingColumns.length === 0,
    ba_sets_present: missingSetCodes.length === 0,
    ba_set_count: baSets.length,
    existing_ba_canon_row_count: existingBaCanonRows.length,
    planned_gv_id_count: plannedCandidates.rows.length,
    existing_gv_id_collision_count: existingGvIdRows.length,
  };
}

function buildPromotionReport({
  apply,
  plannedCandidates,
  columnProbes,
  baSets,
  existingBaCanonRows,
  existingGvIdRows,
  preflightSummary,
}) {
  const existingGvIdByValue = new Map(existingGvIdRows.map((row) => [normalizeTextOrNull(row.gv_id), row]));

  const candidateRows = plannedCandidates.rows.map((row) => {
    const existingGvIdMatch = existingGvIdByValue.get(row.gv_id) ?? null;

    return {
      ba_row_id: row.ba_row_id,
      upstream_id: row.upstream_id,
      ba_set_code: row.ba_set_code,
      printed_number: row.printed_number,
      normalized_printed_name: row.normalized_printed_name,
      source_name_raw: row.source_name_raw,
      identity_key_hash: row.identity_key_hash,
      gv_id: row.gv_id,
      existing_gv_id_match: existingGvIdMatch
        ? {
            id: existingGvIdMatch.id,
            set_code: existingGvIdMatch.set_code,
            number: existingGvIdMatch.number,
            name: existingGvIdMatch.name,
          }
        : null,
    };
  });

  return {
    generated_at: new Date().toISOString(),
    phase: PHASE_NAME,
    mode: apply ? 'apply' : 'dry-run',
    status: preflightSummary.blocker_count === 0 ? 'READY' : 'STOPPED_PRECONDITION_FAILURE',
    identity_key: EXPECTED_IDENTITY_KEY_FIELDS,
    total_candidates: plannedCandidates.summary.total_candidates,
    inserted_count: 0,
    skipped_existing_count: 0,
    duplicate_prevention_confirmation: {
      candidate_identity_collisions: plannedCandidates.summary.total_candidates - plannedCandidates.summary.unique_identity_keys,
      candidate_gv_id_collisions: plannedCandidates.summary.total_candidates - plannedCandidates.summary.unique_gv_ids,
      existing_gv_id_collision_count: preflightSummary.existing_gv_id_collision_count,
    },
    gv_id_generation_summary: {
      format: 'GV-PK-BA-{normalized_number}-{normalized_name_token}-{source_token}',
      planned_unique_gv_ids: plannedCandidates.summary.unique_gv_ids,
    },
    preflight: {
      required_card_prints_columns: columnProbes,
      ba_sets: baSets,
      existing_ba_canon_rows: existingBaCanonRows,
      blocker_summary: preflightSummary,
    },
    candidates: candidateRows,
  };
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function runPhase6Promotion(options = {}) {
  const state = await loadPhase5State();
  validatePhase5State(state);

  const supabase = createBackendClient();
  const plannedCandidates = buildPlannedCandidates(state);
  const [columnProbes, baSets, existingBaCanonRows, existingGvIdRows] = await Promise.all([
    Promise.all(REQUIRED_CARD_PRINTS_COLUMNS.map((columnName) => probeCardPrintsColumn(supabase, columnName))),
    fetchBaSets(supabase),
    fetchExistingBaCanonRows(supabase),
    fetchExistingGvIds(supabase, plannedCandidates.rows.map((row) => row.gv_id)),
  ]);

  const preflightSummary = buildPreflightSummary(
    plannedCandidates,
    columnProbes,
    baSets,
    existingBaCanonRows,
    existingGvIdRows,
  );

  const report = buildPromotionReport({
    apply: options.apply === true,
    plannedCandidates,
    columnProbes,
    baSets,
    existingBaCanonRows,
    existingGvIdRows,
    preflightSummary,
  });

  await writeJson(state.paths.promotionReport, report);

  return {
    state,
    plannedCandidates,
    columnProbes,
    baSets,
    existingBaCanonRows,
    existingGvIdRows,
    preflightSummary,
    report,
  };
}

function printRunSummary(result) {
  console.log(`[ba-phase6-canon-promote-v1] mode=${result.report.mode}`);
  console.log(`[ba-phase6-canon-promote-v1] status=${result.report.status}`);
  console.log(`[ba-phase6-canon-promote-v1] total_candidates=${result.report.total_candidates}`);
  console.log(
    `[ba-phase6-canon-promote-v1] unique_identity_keys=${result.plannedCandidates.summary.unique_identity_keys}`,
  );
  console.log(`[ba-phase6-canon-promote-v1] unique_gv_ids=${result.plannedCandidates.summary.unique_gv_ids}`);
  console.log(
    `[ba-phase6-canon-promote-v1] schema_identity_columns_present=${result.preflightSummary.schema_identity_columns_present}`,
  );
  console.log(`[ba-phase6-canon-promote-v1] ba_sets_present=${result.preflightSummary.ba_sets_present}`);
  console.log(`[ba-phase6-canon-promote-v1] existing_ba_canon_row_count=${result.preflightSummary.existing_ba_canon_row_count}`);
  console.log(`[ba-phase6-canon-promote-v1] blocker_count=${result.preflightSummary.blocker_count}`);

  if (result.preflightSummary.blockers.length > 0) {
    console.log('[ba-phase6-canon-promote-v1] blockers=');
    console.log(JSON.stringify(result.preflightSummary.blockers, null, 2));
  }

  console.log(`[ba-phase6-canon-promote-v1] report_path=${result.state.paths.promotionReport}`);
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runPhase6Promotion(options);
  printRunSummary(result);

  if (result.preflightSummary.blocker_count > 0) {
    if (options.apply) {
      throw new Error(
        `[ba-phase6-canon-promote-v1] STOP: current schema cannot store lawful BA identity: ${JSON.stringify(
          result.preflightSummary.blockers,
        )}.`,
      );
    }
    return;
  }

  if (!options.apply) {
    console.log('[ba-phase6-canon-promote-v1] dry-run ready: no preflight blockers detected.');
    return;
  }

  throw new Error(
    '[ba-phase6-canon-promote-v1] STOP: apply path not executed because live schema prerequisites are not yet contract-compatible in this repo state.',
  );
}

export {
  APPLY_FLAG,
  BA_SET_CODES,
  EXPECTED_CANDIDATE_COUNT,
  EXPECTED_IDENTITY_KEY_FIELDS,
  PHASE_NAME,
  REQUIRED_CARD_PRINTS_COLUMNS,
  buildIdentityKeyHash,
  buildIdentityKeyString,
  buildPhase6GvId,
  buildPaths,
  buildPlannedCandidates,
  buildPreflightSummary,
  buildPromotionReport,
  loadPhase5State,
  normalizeTextOrNull,
  normalizeUpperHyphenToken,
  parseArgs,
  runPhase6Promotion,
  validatePhase5State,
};

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref === import.meta.url) {
  run().catch((error) => {
    console.error('[ba-phase6-canon-promote-v1] Fatal error:', error);
    process.exit(1);
  });
}
