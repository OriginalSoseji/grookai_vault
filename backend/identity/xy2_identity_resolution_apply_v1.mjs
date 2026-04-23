/**
 * MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical identity outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

import { installIdentityMaintenanceBoundaryV1 } from './identity_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_IDENTITY_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
  );
}

if (process.env.IDENTITY_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
  );
}

if (process.env.IDENTITY_MAINTENANCE_ENTRYPOINT !== 'backend/identity/run_identity_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched from backend/identity/run_identity_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.IDENTITY_MAINTENANCE_DRY_RUN !== 'false';
const { assertMaintenanceWriteAllowed } = installIdentityMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('IDENTITY MAINTENANCE: running in DRY RUN mode');
}

void assertMaintenanceWriteAllowed;
const PHASE = 'XY2_IDENTITY_RESOLUTION_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'xy2';
const TARGET_SET_CODE = 'xy2';

const EXPECTED = {
  unresolvedCount: 16,
  canonicalTargetCount: 109,
  exactMatchCount: 0,
  sameTokenDifferentNameCount: 15,
  exactUnmatchedCount: 16,
  classification: 'BASE_VARIANT_COLLAPSE',
  mapCount: 16,
  distinctNewCount: 16,
  baseReusedTargetCount: 0,
  normalizedNameCount: 15,
  suffixVariantCount: 1,
  fanInGroupCount: 1,
  archivedIdentityCount: 1,
  selectedActiveIdentityCount: 16,
  targetAnyIdentityCount: 17,
};

const SUPPORTED_REFERENCE_TABLES = new Set([
  'card_print_identity.card_print_id',
  'card_print_traits.card_print_id',
  'card_printings.card_print_id',
  'external_mappings.card_print_id',
  'vault_items.card_id',
]);

const BACKUP_SCHEMA_PATH = path.join(process.cwd(), 'backups', 'xy2_preapply_schema.sql');
const BACKUP_DATA_PATH = path.join(process.cwd(), 'backups', 'xy2_preapply_data.sql');

const BACKUP_TABLE_CONFIG = [
  { table_name: 'card_prints', key_column: 'id' },
  { table_name: 'card_print_identity', key_column: 'card_print_id' },
  { table_name: 'card_print_traits', key_column: 'card_print_id' },
  { table_name: 'card_printings', key_column: 'card_print_id' },
  { table_name: 'external_mappings', key_column: 'card_print_id' },
  { table_name: 'vault_items', key_column: 'card_id' },
];

function normalizeCount(value) {
  return Number(value ?? 0);
}

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escapePgArrayElement(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (Array.isArray(value)) {
    return buildPgArrayLiteral(value);
  }

  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildPgArrayLiteral(values) {
  return `{${values.map((value) => escapePgArrayElement(value)).join(',')}}`;
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }

  if (value instanceof Date) {
    return sqlQuote(value.toISOString());
  }

  if (Array.isArray(value)) {
    return sqlQuote(buildPgArrayLiteral(value));
  }

  if (typeof value === 'object') {
    return sqlQuote(JSON.stringify(value));
  }

  return sqlQuote(value);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) {
    throw new Error(`${code}:${actual}:${expected}`);
  }
}

function assertZero(actual, code) {
  if (normalizeCount(actual) !== 0) {
    throw new Error(`${code}:${actual}`);
  }
}

function normalizeExactNameKey(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase().replace(/\s+/g, ' ').trim();
}

function nameNormalizeV1(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, ' ')
    .replace(/\s*-\s*gx\b/gi, ' gx')
    .replace(/\s*-\s*ex\b/gi, ' ex')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrintedTokenV1(value) {
  const normalized = normalizeTextOrNull(value);
  if (!normalized) {
    return {
      printed_token: null,
      base_number_plain: null,
      number_suffix: null,
    };
  }

  if (/^[0-9]+\/[0-9]+$/.test(normalized)) {
    return {
      printed_token: normalized,
      base_number_plain: normalized.split('/', 1)[0],
      number_suffix: null,
    };
  }

  if (/^[0-9]+$/.test(normalized)) {
    return {
      printed_token: normalized,
      base_number_plain: normalized,
      number_suffix: null,
    };
  }

  const numericPrefix = normalized.match(/^([0-9]+)([A-Za-z]+)$/);
  if (numericPrefix) {
    return {
      printed_token: normalized,
      base_number_plain: numericPrefix[1],
      number_suffix: numericPrefix[2],
    };
  }

  return {
    printed_token: normalized,
    base_number_plain: null,
    number_suffix: null,
  };
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function buildTempCollapseSurface(client) {
  await client.query(`
    drop table if exists tmp_xy2_unresolved;
    drop table if exists tmp_xy2_canonical;
    drop table if exists tmp_xy2_match_audit;
    drop table if exists tmp_xy2_collapse_map;
    drop table if exists tmp_xy2_fanin_resolution;

    create temp table tmp_xy2_unresolved on commit drop as
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.set_code as old_set_code,
      cp.number as old_parent_number,
      cp.number_plain as old_parent_number_plain,
      cp.variant_key,
      cpi.printed_number as source_printed_number,
      cpi.normalized_printed_name as source_normalized_printed_name
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = '${TARGET_IDENTITY_DOMAIN}'
      and cpi.set_code_identity = '${SOURCE_SET_CODE_IDENTITY}'
      and cp.gv_id is null;

    create index tmp_xy2_unresolved_token_idx
      on tmp_xy2_unresolved (source_printed_number);

    create temp table tmp_xy2_canonical on commit drop as
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.set_code as new_set_code,
      cp.number as new_number,
      cp.number_plain as new_number_plain,
      cp.gv_id as new_gv_id
    from public.card_prints cp
    where cp.set_code = '${TARGET_SET_CODE}'
      and cp.gv_id is not null;

    create index tmp_xy2_canonical_token_idx
      on tmp_xy2_canonical (new_number);

    create index tmp_xy2_canonical_number_plain_idx
      on tmp_xy2_canonical (new_number_plain);

    create temp table tmp_xy2_match_audit (
      old_id uuid primary key,
      old_name text not null,
      old_set_code text null,
      old_parent_number text null,
      old_parent_number_plain text null,
      variant_key text null,
      source_printed_number text not null,
      source_base_number_plain text null,
      source_number_suffix text null,
      source_exact_name_key text null,
      source_name_normalized_v1 text null,
      exact_same_token_candidate_count int not null,
      exact_candidate_count int not null,
      same_token_different_name_count int not null,
      base_group_candidate_count int not null,
      base_candidate_count int not null,
      base_invalid_candidate_count int not null,
      classification_path text not null,
      match_category text not null,
      candidate_new_id uuid null,
      candidate_new_name text null,
      candidate_new_set_code text null,
      candidate_new_number text null,
      candidate_new_number_plain text null,
      candidate_new_gv_id text null
    ) on commit drop;

    create temp table tmp_xy2_collapse_map (
      seq int not null,
      old_id uuid not null,
      new_id uuid not null,
      old_name text not null,
      new_name text not null,
      old_set_code text null,
      new_set_code text not null,
      old_parent_number text null,
      old_parent_number_plain text null,
      source_printed_number text not null,
      source_base_number_plain text not null,
      source_number_suffix text null,
      source_exact_name_key text not null,
      source_name_normalized_v1 text not null,
      new_number text not null,
      new_number_plain text not null,
      target_exact_name_key text not null,
      target_name_normalized_v1 text not null,
      match_category text not null,
      new_gv_id text not null
    ) on commit drop;

    create unique index tmp_xy2_collapse_map_seq_uidx
      on tmp_xy2_collapse_map (seq);

    create unique index tmp_xy2_collapse_map_old_uidx
      on tmp_xy2_collapse_map (old_id);

    create temp table tmp_xy2_fanin_resolution (
      target_card_print_id uuid not null,
      target_gv_id text not null,
      target_name text not null,
      target_number text not null,
      source_old_id uuid not null,
      source_old_name text not null,
      source_printed_number text not null,
      identity_id uuid not null,
      identity_printed_number text not null,
      identity_normalized_printed_name text null,
      is_active boolean not null,
      resolution_action text not null,
      name_match_rank int not null,
      token_match_rank int not null,
      lexical_distance int not null,
      deterministic_tiebreak text not null
    ) on commit drop;

    create unique index tmp_xy2_fanin_resolution_identity_uidx
      on tmp_xy2_fanin_resolution (identity_id);

  `);
}

async function loadMappingSourceRows(client) {
  const unresolvedRows = await queryRows(
    client,
    `
      select
        old_id,
        old_name,
        old_set_code,
        old_parent_number,
        old_parent_number_plain,
        variant_key,
        source_printed_number,
        source_normalized_printed_name
      from tmp_xy2_unresolved
      order by
        coalesce(nullif(regexp_replace(source_printed_number, '[^0-9]', '', 'g'), ''), '0')::int,
        source_printed_number,
        old_id
    `,
  );

  const canonicalRows = await queryRows(
    client,
    `
      select
        new_id,
        new_name,
        new_set_code,
        new_number,
        new_number_plain,
        new_gv_id
      from tmp_xy2_canonical
      order by
        coalesce(nullif(new_number_plain, ''), '0')::int,
        new_number,
        new_id
    `,
  );

  return { unresolvedRows, canonicalRows };
}

function countReusedTargets(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.new_id, (counts.get(row.new_id) ?? 0) + 1);
  }

  return [...counts.values()].filter((count) => count > 1).length;
}

function buildMatchArtifacts(unresolvedRows, canonicalRows) {
  const canonicalByToken = new Map();
  const canonicalByBase = new Map();

  for (const row of canonicalRows) {
    const exactNameKey = normalizeExactNameKey(row.new_name);
    const normalizedNameV1 = nameNormalizeV1(row.new_name);
    const tokenBucket = canonicalByToken.get(row.new_number) ?? [];
    tokenBucket.push({
      ...row,
      exact_name_key: exactNameKey,
      target_name_normalized_v1: normalizedNameV1,
    });
    canonicalByToken.set(row.new_number, tokenBucket);

    const baseBucket = canonicalByBase.get(row.new_number_plain) ?? [];
    baseBucket.push({
      ...row,
      exact_name_key: exactNameKey,
      target_name_normalized_v1: normalizedNameV1,
    });
    canonicalByBase.set(row.new_number_plain, baseBucket);
  }

  const analyses = unresolvedRows.map((row) => {
    const token = parsePrintedTokenV1(row.source_printed_number);
    const sourceExactNameKey = normalizeExactNameKey(row.source_normalized_printed_name ?? row.old_name);
    const sourceNameNormalizedV1 = nameNormalizeV1(row.old_name ?? row.source_normalized_printed_name);
    const exactTokenCandidates = canonicalByToken.get(row.source_printed_number) ?? [];
    const exactMatchedCandidates = exactTokenCandidates.filter(
      (candidate) => candidate.exact_name_key === sourceExactNameKey,
    );
    const baseCandidates = token.base_number_plain ? canonicalByBase.get(token.base_number_plain) ?? [] : [];
    const baseMatchedCandidates = baseCandidates.filter(
      (candidate) => candidate.target_name_normalized_v1 === sourceNameNormalizedV1,
    );

    let baseMatchCategory = 'invalid';
    if (baseMatchedCandidates.length === 1 && baseCandidates.length === 1 && token.base_number_plain) {
      baseMatchCategory =
        normalizeTextOrNull(token.printed_token) !== normalizeTextOrNull(baseMatchedCandidates[0].new_number)
          ? 'suffix_variant'
          : 'name_normalize_v3';
    }

    return {
      ...row,
      source_base_number_plain: token.base_number_plain,
      source_number_suffix: token.number_suffix,
      source_exact_name_key: sourceExactNameKey,
      source_name_normalized_v1: sourceNameNormalizedV1,
      exactTokenCandidates,
      exactMatchedCandidates,
      sameTokenDifferentNameCount: exactTokenCandidates.filter(
        (candidate) => candidate.exact_name_key !== sourceExactNameKey,
      ).length,
      baseCandidates,
      baseMatchedCandidates,
      baseInvalidCandidateCount: baseCandidates.filter(
        (candidate) => candidate.target_name_normalized_v1 !== sourceNameNormalizedV1,
      ).length,
      baseMatchCategory,
    };
  });

  const exactMapRows = analyses
    .filter((row) => row.exactMatchedCandidates.length === 1)
    .map((row) => {
      const matched = row.exactMatchedCandidates[0];
      return {
        old_id: row.old_id,
        new_id: matched.new_id,
        old_name: row.old_name,
        new_name: matched.new_name,
        old_set_code: row.old_set_code,
        new_set_code: matched.new_set_code,
        old_parent_number: row.old_parent_number,
        old_parent_number_plain: row.old_parent_number_plain,
        source_printed_number: row.source_printed_number,
        source_base_number_plain: row.source_base_number_plain,
        source_number_suffix: row.source_number_suffix,
        source_exact_name_key: row.source_exact_name_key,
        source_name_normalized_v1: row.source_name_normalized_v1,
        new_number: matched.new_number,
        new_number_plain: matched.new_number_plain,
        target_exact_name_key: matched.exact_name_key,
        target_name_normalized_v1: matched.target_name_normalized_v1,
        match_category: 'duplicate_exact_token_name',
        new_gv_id: matched.new_gv_id,
      };
    });

  const sameTokenDifferentNameCount = analyses.filter((row) => row.sameTokenDifferentNameCount > 0).length;
  const exactUnmatchedCount = analyses.filter((row) => row.exactMatchedCandidates.length === 0).length;
  const exactMultipleMatchOldCount = analyses.filter((row) => row.exactMatchedCandidates.length > 1).length;
  const exactReusedTargetCount = countReusedTargets(exactMapRows);

  const classification =
    exactMapRows.length === analyses.length &&
    sameTokenDifferentNameCount === 0 &&
    exactUnmatchedCount === 0 &&
    exactMultipleMatchOldCount === 0 &&
    exactReusedTargetCount === 0
      ? 'DUPLICATE_COLLAPSE'
      : 'BASE_VARIANT_COLLAPSE';

  const baseMapRows = analyses
    .filter((row) => row.baseMatchCategory !== 'invalid')
    .map((row) => {
      const matched = row.baseMatchedCandidates[0];
      return {
        old_id: row.old_id,
        new_id: matched.new_id,
        old_name: row.old_name,
        new_name: matched.new_name,
        old_set_code: row.old_set_code,
        new_set_code: matched.new_set_code,
        old_parent_number: row.old_parent_number,
        old_parent_number_plain: row.old_parent_number_plain,
        source_printed_number: row.source_printed_number,
        source_base_number_plain: row.source_base_number_plain,
        source_number_suffix: row.source_number_suffix,
        source_exact_name_key: row.source_exact_name_key,
        source_name_normalized_v1: row.source_name_normalized_v1,
        new_number: matched.new_number,
        new_number_plain: matched.new_number_plain,
        target_exact_name_key: matched.exact_name_key,
        target_name_normalized_v1: matched.target_name_normalized_v1,
        match_category: row.baseMatchCategory,
        new_gv_id: matched.new_gv_id,
      };
    });

  const selectedRows = classification === 'DUPLICATE_COLLAPSE' ? exactMapRows : baseMapRows;
  const selectedRowsSorted = [...selectedRows].sort((left, right) => {
    const baseDelta = Number(left.source_base_number_plain) - Number(right.source_base_number_plain);
    if (baseDelta !== 0) {
      return baseDelta;
    }

    const tokenDelta = left.source_printed_number.localeCompare(right.source_printed_number);
    if (tokenDelta !== 0) {
      return tokenDelta;
    }

    return left.old_id.localeCompare(right.old_id);
  });

  const collapseMapRows = selectedRowsSorted.map((row, index) => ({
    seq: index + 1,
    ...row,
  }));

  const baseReusedTargetCount = countReusedTargets(baseMapRows);
  const classificationSummary = {
    unresolved_count: unresolvedRows.length,
    canonical_target_count: canonicalRows.length,
    exact_match_count: exactMapRows.length,
    exact_multiple_match_old_count: exactMultipleMatchOldCount,
    exact_reused_target_count: exactReusedTargetCount,
    same_token_different_name_count: sameTokenDifferentNameCount,
    exact_unmatched_count: exactUnmatchedCount,
    classification,
    base_map_count: baseMapRows.length,
    base_invalid_count: analyses.filter((row) => row.baseMatchCategory === 'invalid').length,
    base_reused_target_count: baseReusedTargetCount,
    normalized_name_count: baseMapRows.filter((row) => row.match_category === 'name_normalize_v3').length,
    suffix_variant_count: baseMapRows.filter((row) => row.match_category === 'suffix_variant').length,
    null_old_parent_set_code_count: unresolvedRows.filter((row) => row.old_set_code === null).length,
    null_old_parent_number_count: unresolvedRows.filter((row) => row.old_parent_number === null).length,
    null_old_parent_number_plain_count: unresolvedRows.filter((row) => row.old_parent_number_plain === null).length,
    out_of_scope_new_target_count: selectedRows.filter((row) => row.new_set_code !== TARGET_SET_CODE).length,
    map_count: selectedRows.length,
    distinct_old_count: new Set(selectedRows.map((row) => row.old_id)).size,
    distinct_new_count: new Set(selectedRows.map((row) => row.new_id)).size,
  };

  const auditRows = analyses.map((row) => {
    const selected =
      classification === 'DUPLICATE_COLLAPSE'
        ? row.exactMatchedCandidates[0] ?? null
        : row.baseMatchedCandidates[0] ?? null;
    const matchCategory =
      classification === 'DUPLICATE_COLLAPSE'
        ? row.exactMatchedCandidates.length === 1
          ? 'duplicate_exact_token_name'
          : 'invalid'
        : row.baseMatchCategory;

    return {
      old_id: row.old_id,
      old_name: row.old_name,
      old_set_code: row.old_set_code,
      old_parent_number: row.old_parent_number,
      old_parent_number_plain: row.old_parent_number_plain,
      variant_key: row.variant_key,
      source_printed_number: row.source_printed_number,
      source_base_number_plain: row.source_base_number_plain,
      source_number_suffix: row.source_number_suffix,
      source_exact_name_key: row.source_exact_name_key,
      source_name_normalized_v1: row.source_name_normalized_v1,
      exact_same_token_candidate_count: row.exactTokenCandidates.length,
      exact_candidate_count: row.exactMatchedCandidates.length,
      same_token_different_name_count: row.sameTokenDifferentNameCount,
      base_group_candidate_count: row.baseCandidates.length,
      base_candidate_count: row.baseMatchedCandidates.length,
      base_invalid_candidate_count: row.baseInvalidCandidateCount,
      classification_path: classification,
      match_category: matchCategory,
      candidate_new_id: selected?.new_id ?? null,
      candidate_new_name: selected?.new_name ?? null,
      candidate_new_set_code: selected?.new_set_code ?? null,
      candidate_new_number: selected?.new_number ?? null,
      candidate_new_number_plain: selected?.new_number_plain ?? null,
      candidate_new_gv_id: selected?.new_gv_id ?? null,
    };
  });

  return {
    classificationSummary,
    auditRows,
    collapseMapRows,
  };
}

async function insertMatchAuditRows(client, rows) {
  await client.query(
    `
      insert into tmp_xy2_match_audit (
        old_id,
        old_name,
        old_set_code,
        old_parent_number,
        old_parent_number_plain,
        variant_key,
        source_printed_number,
        source_base_number_plain,
        source_number_suffix,
        source_exact_name_key,
        source_name_normalized_v1,
        exact_same_token_candidate_count,
        exact_candidate_count,
        same_token_different_name_count,
        base_group_candidate_count,
        base_candidate_count,
        base_invalid_candidate_count,
        classification_path,
        match_category,
        candidate_new_id,
        candidate_new_name,
        candidate_new_set_code,
        candidate_new_number,
        candidate_new_number_plain,
        candidate_new_gv_id
      )
      select
        old_id,
        old_name,
        old_set_code,
        old_parent_number,
        old_parent_number_plain,
        variant_key,
        source_printed_number,
        source_base_number_plain,
        source_number_suffix,
        source_exact_name_key,
        source_name_normalized_v1,
        exact_same_token_candidate_count,
        exact_candidate_count,
        same_token_different_name_count,
        base_group_candidate_count,
        base_candidate_count,
        base_invalid_candidate_count,
        classification_path,
        match_category,
        candidate_new_id,
        candidate_new_name,
        candidate_new_set_code,
        candidate_new_number,
        candidate_new_number_plain,
        candidate_new_gv_id
      from json_to_recordset($1::json) as x(
        old_id uuid,
        old_name text,
        old_set_code text,
        old_parent_number text,
        old_parent_number_plain text,
        variant_key text,
        source_printed_number text,
        source_base_number_plain text,
        source_number_suffix text,
        source_exact_name_key text,
        source_name_normalized_v1 text,
        exact_same_token_candidate_count int,
        exact_candidate_count int,
        same_token_different_name_count int,
        base_group_candidate_count int,
        base_candidate_count int,
        base_invalid_candidate_count int,
        classification_path text,
        match_category text,
        candidate_new_id uuid,
        candidate_new_name text,
        candidate_new_set_code text,
        candidate_new_number text,
        candidate_new_number_plain text,
        candidate_new_gv_id text
      )
    `,
    [JSON.stringify(rows)],
  );
}

async function insertCollapseMapRows(client, rows) {
  await client.query(
    `
      insert into tmp_xy2_collapse_map (
        seq,
        old_id,
        new_id,
        old_name,
        new_name,
        old_set_code,
        new_set_code,
        old_parent_number,
        old_parent_number_plain,
        source_printed_number,
        source_base_number_plain,
        source_number_suffix,
        source_exact_name_key,
        source_name_normalized_v1,
        new_number,
        new_number_plain,
        target_exact_name_key,
        target_name_normalized_v1,
        match_category,
        new_gv_id
      )
      select
        seq,
        old_id,
        new_id,
        old_name,
        new_name,
        old_set_code,
        new_set_code,
        old_parent_number,
        old_parent_number_plain,
        source_printed_number,
        source_base_number_plain,
        source_number_suffix,
        source_exact_name_key,
        source_name_normalized_v1,
        new_number,
        new_number_plain,
        target_exact_name_key,
        target_name_normalized_v1,
        match_category,
        new_gv_id
      from json_to_recordset($1::json) as x(
        seq int,
        old_id uuid,
        new_id uuid,
        old_name text,
        new_name text,
        old_set_code text,
        new_set_code text,
        old_parent_number text,
        old_parent_number_plain text,
        source_printed_number text,
        source_base_number_plain text,
        source_number_suffix text,
        source_exact_name_key text,
        source_name_normalized_v1 text,
        new_number text,
        new_number_plain text,
        target_exact_name_key text,
        target_name_normalized_v1 text,
        match_category text,
        new_gv_id text
      )
    `,
    [JSON.stringify(rows)],
  );
}

function levenshteinDistance(left, right) {
  const source = String(left ?? '');
  const target = String(right ?? '');
  const matrix = Array.from({ length: source.length + 1 }, () =>
    new Array(target.length + 1).fill(0),
  );

  for (let row = 0; row <= source.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column <= target.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      const substitutionCost = source[row - 1] === target[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );
    }
  }

  return matrix[source.length][target.length];
}

async function insertFanInResolutionRows(client, rows) {
  if (rows.length === 0) {
    return;
  }

  await client.query(
    `
      insert into tmp_xy2_fanin_resolution (
        target_card_print_id,
        target_gv_id,
        target_name,
        target_number,
        source_old_id,
        source_old_name,
        source_printed_number,
        identity_id,
        identity_printed_number,
        identity_normalized_printed_name,
        is_active,
        resolution_action,
        name_match_rank,
        token_match_rank,
        lexical_distance,
        deterministic_tiebreak
      )
      select
        target_card_print_id,
        target_gv_id,
        target_name,
        target_number,
        source_old_id,
        source_old_name,
        source_printed_number,
        identity_id,
        identity_printed_number,
        identity_normalized_printed_name,
        is_active,
        resolution_action,
        name_match_rank,
        token_match_rank,
        lexical_distance,
        deterministic_tiebreak
      from json_to_recordset($1::json) as x(
        target_card_print_id uuid,
        target_gv_id text,
        target_name text,
        target_number text,
        source_old_id uuid,
        source_old_name text,
        source_printed_number text,
        identity_id uuid,
        identity_printed_number text,
        identity_normalized_printed_name text,
        is_active boolean,
        resolution_action text,
        name_match_rank int,
        token_match_rank int,
        lexical_distance int,
        deterministic_tiebreak text
      )
    `,
    [JSON.stringify(rows)],
  );
}

async function buildFanInResolution(client) {
  const collapseMapRows = await queryRows(
    client,
    `
      select
        seq,
        old_id,
        new_id,
        old_name,
        new_name,
        source_printed_number,
        new_number,
        new_gv_id,
        match_category
      from tmp_xy2_collapse_map
      order by seq
    `,
  );

  const identityRows = await queryRows(
    client,
    `
      select
        cpi.id as identity_id,
        cpi.card_print_id,
        cpi.printed_number as identity_printed_number,
        cpi.normalized_printed_name as identity_normalized_printed_name,
        cpi.source_name_raw,
        cpi.is_active
      from public.card_print_identity cpi
      where cpi.card_print_id in (
        select old_id from tmp_xy2_collapse_map
        union
        select distinct new_id from tmp_xy2_collapse_map
      )
      order by cpi.card_print_id, cpi.is_active desc, cpi.id
    `,
  );

  const activeIdentityByCardPrintId = new Map();
  for (const row of identityRows) {
    if (!row.is_active) {
      continue;
    }
    if (activeIdentityByCardPrintId.has(row.card_print_id)) {
      throw new Error(`MULTIPLE_ACTIVE_IDENTITIES_PER_CARD_PRINT:${row.card_print_id}`);
    }
    activeIdentityByCardPrintId.set(row.card_print_id, row);
  }

  const collapseRowsByNewId = new Map();
  for (const row of collapseMapRows) {
    const bucket = collapseRowsByNewId.get(row.new_id) ?? [];
    bucket.push(row);
    collapseRowsByNewId.set(row.new_id, bucket);
  }

  const fanInResolutionRows = [];
  const fanInGroups = [];

  for (const [newId, rows] of collapseRowsByNewId.entries()) {
    const targetTemplate = rows[0];
    const candidates = rows.map((row) => {
      const identityRow = activeIdentityByCardPrintId.get(row.old_id);
      if (!identityRow) {
        throw new Error(`MISSING_ACTIVE_IDENTITY_FOR_FANIN_SOURCE:${row.old_id}`);
      }

      const identityName = normalizeTextOrNull(identityRow.source_name_raw) ?? row.old_name;
      const nameMatchRank =
        nameNormalizeV1(identityName) === nameNormalizeV1(row.new_name) ? 1 : 0;
      const tokenMatchRank =
        normalizeTextOrNull(identityRow.identity_printed_number) === normalizeTextOrNull(row.new_number) ? 1 : 0;
      const lexicalDistance = levenshteinDistance(
        normalizeTextOrNull(identityName)?.toLowerCase() ?? '',
        normalizeTextOrNull(row.new_name)?.toLowerCase() ?? '',
      );

      return {
        target_card_print_id: newId,
        target_gv_id: row.new_gv_id,
        target_name: row.new_name,
        target_number: row.new_number,
        source_old_id: row.old_id,
        source_old_name: row.old_name,
        source_printed_number: row.source_printed_number,
        identity_id: identityRow.identity_id,
        identity_printed_number: identityRow.identity_printed_number,
        identity_normalized_printed_name: identityRow.identity_normalized_printed_name,
        is_active: identityRow.is_active,
        name_match_rank: nameMatchRank,
        token_match_rank: tokenMatchRank,
        lexical_distance: lexicalDistance,
        deterministic_tiebreak: identityRow.identity_id,
      };
    });

    const targetIdentityRow = activeIdentityByCardPrintId.get(newId);
    if (targetIdentityRow) {
      const identityName =
        normalizeTextOrNull(targetIdentityRow.source_name_raw) ?? targetTemplate.new_name;
      candidates.push({
        target_card_print_id: newId,
        target_gv_id: targetTemplate.new_gv_id,
        target_name: targetTemplate.new_name,
        target_number: targetTemplate.new_number,
        source_old_id: newId,
        source_old_name: targetTemplate.new_name,
        source_printed_number:
          normalizeTextOrNull(targetIdentityRow.identity_printed_number) ?? targetTemplate.new_number,
        identity_id: targetIdentityRow.identity_id,
        identity_printed_number: targetIdentityRow.identity_printed_number,
        identity_normalized_printed_name: targetIdentityRow.identity_normalized_printed_name,
        is_active: targetIdentityRow.is_active,
        name_match_rank:
          nameNormalizeV1(identityName) === nameNormalizeV1(targetTemplate.new_name) ? 1 : 0,
        token_match_rank:
          normalizeTextOrNull(targetIdentityRow.identity_printed_number) ===
          normalizeTextOrNull(targetTemplate.new_number)
            ? 1
            : 0,
        lexical_distance: levenshteinDistance(
          normalizeTextOrNull(identityName)?.toLowerCase() ?? '',
          normalizeTextOrNull(targetTemplate.new_name)?.toLowerCase() ?? '',
        ),
        deterministic_tiebreak: targetIdentityRow.identity_id,
      });
    }

    if (candidates.length <= 1) {
      continue;
    }

    if (candidates.some((candidate) => candidate.name_match_rank !== 1)) {
      throw new Error(`FANIN_SEMANTIC_DIVERGENCE:${newId}`);
    }

    candidates.sort((left, right) => {
      if (right.name_match_rank !== left.name_match_rank) {
        return right.name_match_rank - left.name_match_rank;
      }
      if (right.token_match_rank !== left.token_match_rank) {
        return right.token_match_rank - left.token_match_rank;
      }
      if (left.lexical_distance !== right.lexical_distance) {
        return left.lexical_distance - right.lexical_distance;
      }
      return left.deterministic_tiebreak.localeCompare(right.deterministic_tiebreak);
    });

    const selected = candidates[0];
    const archived = candidates.slice(1);

    fanInGroups.push({
      target_card_print_id: newId,
      target_gv_id: selected.target_gv_id,
      target_name: selected.target_name,
      target_number: selected.target_number,
      incoming_sources: candidates.length,
      selected_identity_id: selected.identity_id,
      selected_source_old_id: selected.source_old_id,
      selected_source_name: selected.source_old_name,
      selected_source_printed_number: selected.source_printed_number,
      archived_identity_ids: archived.map((row) => row.identity_id),
      archived_source_old_ids: archived.map((row) => row.source_old_id),
      archived_source_names: archived.map((row) => row.source_old_name),
      archived_source_printed_numbers: archived.map((row) => row.source_printed_number),
    });

    fanInResolutionRows.push({
      ...selected,
      resolution_action: 'keep_active',
    });

    for (const archivedRow of archived) {
      fanInResolutionRows.push({
        ...archivedRow,
        resolution_action: 'archive_history',
      });
    }
  }

  await insertFanInResolutionRows(client, fanInResolutionRows);

  return {
    fan_in_group_count: fanInGroups.length,
    archived_identity_count: fanInResolutionRows.filter(
      (row) => row.resolution_action === 'archive_history',
    ).length,
    selected_active_identity_count: new Set(collapseMapRows.map((row) => row.new_id)).size,
    fan_in_groups: fanInGroups,
  };
}

async function populateMatchArtifacts(client) {
  const { unresolvedRows, canonicalRows } = await loadMappingSourceRows(client);
  const artifacts = buildMatchArtifacts(unresolvedRows, canonicalRows);

  await insertMatchAuditRows(client, artifacts.auditRows);
  await insertCollapseMapRows(client, artifacts.collapseMapRows);

  return artifacts.classificationSummary;
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.unresolved_count), EXPECTED.unresolvedCount, 'UNRESOLVED_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(summary?.exact_match_count), EXPECTED.exactMatchCount, 'EXACT_MATCH_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.same_token_different_name_count),
    EXPECTED.sameTokenDifferentNameCount,
    'SAME_TOKEN_DIFFERENT_NAME_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.exact_unmatched_count),
    EXPECTED.exactUnmatchedCount,
    'EXACT_UNMATCHED_COUNT_DRIFT',
  );
  if (summary?.classification !== EXPECTED.classification) {
    throw new Error(`CLASSIFICATION_DRIFT:${summary?.classification}:${EXPECTED.classification}`);
  }
  assertEqual(normalizeCount(summary?.map_count), EXPECTED.mapCount, 'MAP_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_old_count), EXPECTED.mapCount, 'DISTINCT_OLD_COUNT_DRIFT');
  assertEqual(
    normalizeCount(summary?.distinct_new_count),
    EXPECTED.distinctNewCount,
    'DISTINCT_NEW_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.normalized_name_count),
    EXPECTED.normalizedNameCount,
    'NORMALIZED_NAME_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.suffix_variant_count),
    EXPECTED.suffixVariantCount,
    'SUFFIX_VARIANT_COUNT_DRIFT',
  );
  assertZero(summary?.exact_multiple_match_old_count, 'EXACT_MULTIPLE_MATCH_OLD');
  assertZero(summary?.exact_reused_target_count, 'EXACT_REUSED_TARGET');
  assertZero(summary?.base_invalid_count, 'BASE_INVALID_COUNT');
  assertEqual(
    normalizeCount(summary?.base_reused_target_count),
    EXPECTED.baseReusedTargetCount,
    'BASE_REUSED_TARGET_COUNT_DRIFT',
  );
  assertZero(summary?.out_of_scope_new_target_count, 'OUT_OF_SCOPE_NEW_TARGET_COUNT');
}

function assertFanInResolution(summary) {
  assertEqual(
    normalizeCount(summary?.fan_in_group_count),
    EXPECTED.fanInGroupCount,
    'FAN_IN_GROUP_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.archived_identity_count),
    EXPECTED.archivedIdentityCount,
    'ARCHIVED_IDENTITY_COUNT_DRIFT',
  );
  assertEqual(
    normalizeCount(summary?.selected_active_identity_count),
    EXPECTED.selectedActiveIdentityCount,
    'SELECTED_ACTIVE_IDENTITY_COUNT_DRIFT',
  );
}

async function loadCollapseMapSamples(client) {
  const samples = await queryRows(
    client,
    `
      select
        m.seq,
        m.old_id,
        m.new_id,
        m.old_name,
        m.new_name,
        m.old_set_code,
        m.new_set_code,
        m.old_parent_number,
        m.old_parent_number_plain,
        m.source_printed_number,
        m.source_base_number_plain,
        m.source_number_suffix,
        m.source_exact_name_key,
        m.source_name_normalized_v1,
        m.new_number,
        m.new_number_plain,
        m.target_exact_name_key,
        m.target_name_normalized_v1,
        m.match_category,
        m.new_gv_id,
        fan_in.resolution_action
      from tmp_xy2_collapse_map m
      left join tmp_xy2_fanin_resolution fan_in
        on fan_in.source_old_id = m.old_id
      order by m.seq
    `,
  );

  if (samples.length === 0) {
    return [];
  }

  const fanInSample = await queryOne(
    client,
    `
      select m.*
      from tmp_xy2_collapse_map m
      join (
        select new_id
        from tmp_xy2_collapse_map
        group by new_id
        having count(*) > 1
      ) fan_in
        on fan_in.new_id = m.new_id
      order by
        case when m.match_category = 'suffix_variant' then 0 else 1 end,
        m.seq
      limit 1
    `,
  );

  const orderedSamples = [samples[0], fanInSample ?? null, samples[samples.length - 1]].filter(Boolean);
  const deduped = [];
  const seen = new Set();

  for (const sample of orderedSamples) {
    if (seen.has(sample.old_id)) {
      continue;
    }
    deduped.push(sample);
    seen.add(sample.old_id);
  }

  if (deduped.length < 3 && samples.length >= 3) {
    const middleIndex = Math.floor((samples.length - 1) / 2);
    const middleSample = samples[middleIndex];
    if (!seen.has(middleSample.old_id)) {
      deduped.splice(1, 0, middleSample);
    }
  }

  return deduped.slice(0, 3);
}

async function loadCardPrintFkInventory(client) {
  return queryRows(
    client,
    `
      select distinct
        rel.relname as table_name,
        att.attname as column_name
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      join pg_class frel on frel.oid = c.confrelid
      join pg_namespace fn on fn.oid = frel.relnamespace
      join unnest(c.conkey) with ordinality as k(attnum, ord) on true
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = k.attnum
      where c.contype = 'f'
        and n.nspname = 'public'
        and fn.nspname = 'public'
        and frel.relname = 'card_prints'
      order by rel.relname, att.attname
    `,
  );
}

async function loadFkCounts(client, fkInventory, sourceClause) {
  const counts = [];

  for (const fk of fkInventory) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(fk.table_name)}
        where ${quoteIdent(fk.column_name)} in (${sourceClause})
      `,
    );

    counts.push({
      table_name: fk.table_name,
      column_name: fk.column_name,
      row_count: normalizeCount(row?.row_count),
      supported_handler: SUPPORTED_REFERENCE_TABLES.has(`${fk.table_name}.${fk.column_name}`),
    });
  }

  return counts;
}

function assertNoUnexpectedReferencedTables(fkCounts) {
  const unexpected = fkCounts.filter((row) => row.row_count > 0 && !row.supported_handler);
  if (unexpected.length > 0) {
    throw new Error(`UNSUPPORTED_REFERENCING_TABLES:${JSON.stringify(unexpected)}`);
  }
}

async function loadCollisionSummary(client) {
  return queryOne(
    client,
    `
      with traits_on_old as (
        select count(*)::int as row_count
        from public.card_print_traits t
        where t.card_print_id in (select old_id from tmp_xy2_collapse_map)
      ),
      trait_key_conflicts as (
        select
          old_t.id as old_trait_id,
          new_t.id as new_trait_id,
          old_t.confidence as old_confidence,
          new_t.confidence as new_confidence,
          old_t.hp as old_hp,
          new_t.hp as new_hp,
          old_t.national_dex as old_national_dex,
          new_t.national_dex as new_national_dex,
          old_t.types as old_types,
          new_t.types as new_types,
          old_t.rarity as old_rarity,
          new_t.rarity as new_rarity,
          old_t.supertype as old_supertype,
          new_t.supertype as new_supertype,
          old_t.card_category as old_card_category,
          new_t.card_category as new_card_category,
          old_t.legacy_rarity as old_legacy_rarity,
          new_t.legacy_rarity as new_legacy_rarity
        from tmp_xy2_collapse_map m
        join public.card_print_traits old_t
          on old_t.card_print_id = m.old_id
        join public.card_print_traits new_t
          on new_t.card_print_id = m.new_id
         and new_t.trait_type = old_t.trait_type
         and new_t.trait_value = old_t.trait_value
         and new_t.source = old_t.source
      ),
      printing_on_old as (
        select count(*)::int as row_count
        from public.card_printings p
        where p.card_print_id in (select old_id from tmp_xy2_collapse_map)
      ),
      printing_finish_conflicts as (
        select
          old_p.id as old_printing_id,
          new_p.id as new_printing_id,
          old_p.is_provisional as old_is_provisional,
          new_p.is_provisional as new_is_provisional,
          old_p.provenance_source as old_provenance_source,
          new_p.provenance_source as new_provenance_source,
          old_p.provenance_ref as old_provenance_ref,
          new_p.provenance_ref as new_provenance_ref,
          old_p.created_by as old_created_by,
          new_p.created_by as new_created_by
        from tmp_xy2_collapse_map m
        join public.card_printings old_p
          on old_p.card_print_id = m.old_id
        join public.card_printings new_p
          on new_p.card_print_id = m.new_id
         and new_p.finish_key = old_p.finish_key
      ),
      mappings_on_old as (
        select count(*)::int as row_count
        from public.external_mappings em
        where em.card_print_id in (select old_id from tmp_xy2_collapse_map)
      ),
      external_conflicts as (
        select count(*)::int as row_count
        from tmp_xy2_collapse_map m
        join public.external_mappings old_em
          on old_em.card_print_id = m.old_id
        join public.external_mappings new_em
          on new_em.card_print_id = m.new_id
         and new_em.source = old_em.source
         and new_em.external_id = old_em.external_id
      ),
      target_identity as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_xy2_collapse_map)
      ),
      vault_on_old as (
        select count(*)::int as row_count
        from public.vault_items vi
        where vi.card_id in (select old_id from tmp_xy2_collapse_map)
      )
      select
        traits_on_old.row_count as old_trait_row_count,
        (select count(*)::int from trait_key_conflicts) as trait_target_key_conflict_count,
        (
          select count(*)::int
          from trait_key_conflicts
          where (
            (
              old_confidence is not distinct from new_confidence
              or old_confidence is null
              or new_confidence is null
            )
            and (
              old_hp is not distinct from new_hp
              or old_hp is null
              or new_hp is null
            )
            and (
              old_national_dex is not distinct from new_national_dex
              or old_national_dex is null
              or new_national_dex is null
            )
            and (
              old_types is not distinct from new_types
              or old_types is null
              or new_types is null
            )
            and (
              old_rarity is not distinct from new_rarity
              or nullif(old_rarity, 'None') is null
              or nullif(new_rarity, 'None') is null
            )
            and (
              old_supertype is not distinct from new_supertype
              or old_supertype is null
              or new_supertype is null
            )
            and (
              old_card_category is not distinct from new_card_category
              or old_card_category is null
              or new_card_category is null
            )
            and (
              old_legacy_rarity is not distinct from new_legacy_rarity
              or nullif(old_legacy_rarity, 'None') is null
              or nullif(new_legacy_rarity, 'None') is null
            )
          )
        ) as trait_mergeable_metadata_only_count,
        (
          select count(*)::int
          from trait_key_conflicts
          where (
              old_confidence is distinct from new_confidence
              and old_confidence is not null
              and new_confidence is not null
            )
             or (
              old_hp is distinct from new_hp
              and old_hp is not null
              and new_hp is not null
            )
             or (
              old_national_dex is distinct from new_national_dex
              and old_national_dex is not null
              and new_national_dex is not null
            )
             or (
              old_types is distinct from new_types
              and old_types is not null
              and new_types is not null
            )
             or (
              old_rarity is distinct from new_rarity
              and nullif(old_rarity, 'None') is not null
              and nullif(new_rarity, 'None') is not null
            )
             or (
              old_supertype is distinct from new_supertype
              and old_supertype is not null
              and new_supertype is not null
            )
             or (
              old_card_category is distinct from new_card_category
              and old_card_category is not null
              and new_card_category is not null
            )
             or (
              old_legacy_rarity is distinct from new_legacy_rarity
              and nullif(old_legacy_rarity, 'None') is not null
              and nullif(new_legacy_rarity, 'None') is not null
            )
        ) as trait_conflicting_non_identical_count,
        printing_on_old.row_count as old_printing_row_count,
        (select count(*)::int from printing_finish_conflicts) as printing_finish_conflict_count,
        (
          select count(*)::int
          from printing_finish_conflicts
          where old_is_provisional = new_is_provisional
            and (
              new_provenance_source is null
              or new_provenance_source = old_provenance_source
            )
            and (
              new_provenance_ref is null
              or new_provenance_ref = old_provenance_ref
            )
            and (
              new_created_by is null
              or new_created_by = old_created_by
            )
        ) as printing_mergeable_metadata_only_count,
        (
          select count(*)::int
          from printing_finish_conflicts
          where old_is_provisional is distinct from new_is_provisional
             or (
               old_provenance_source is not null
               and new_provenance_source is not null
               and old_provenance_source <> new_provenance_source
             )
             or (
               old_provenance_ref is not null
               and new_provenance_ref is not null
               and old_provenance_ref <> new_provenance_ref
             )
             or (
               old_created_by is not null
               and new_created_by is not null
               and old_created_by <> new_created_by
             )
        ) as printing_conflicting_non_identical_count,
        mappings_on_old.row_count as old_external_mapping_row_count,
        external_conflicts.row_count as external_mapping_conflict_count,
        target_identity.row_count as target_identity_row_count,
        vault_on_old.row_count as old_vault_item_row_count
      from traits_on_old
      cross join printing_on_old
      cross join mappings_on_old
      cross join external_conflicts
      cross join target_identity
      cross join vault_on_old
    `,
  );
}

function assertCollisionSummary(summary) {
  assertZero(summary?.trait_conflicting_non_identical_count, 'TRAIT_CONFLICTING_NON_IDENTICAL');
  assertZero(summary?.external_mapping_conflict_count, 'EXTERNAL_MAPPING_CONFLICT');

  const finishConflicts = normalizeCount(summary?.printing_finish_conflict_count);
  const mergeablePrintings = normalizeCount(summary?.printing_mergeable_metadata_only_count);
  const conflictingPrintings = normalizeCount(summary?.printing_conflicting_non_identical_count);

  if (mergeablePrintings !== finishConflicts) {
    throw new Error(`PRINTING_MERGEABLE_COUNT_DRIFT:${mergeablePrintings}:${finishConflicts}`);
  }

  assertZero(conflictingPrintings, 'PRINTING_CONFLICTING_NON_IDENTICAL');
}

async function loadCanonicalCount(client) {
  return queryOne(
    client,
    `
      select count(*)::int as canonical_target_count
      from public.card_prints
      where set_code = $1
        and gv_id is not null
    `,
    [TARGET_SET_CODE],
  );
}

async function loadTableColumns(client, tableName) {
  return queryRows(
    client,
    `
      select
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [tableName],
  );
}

async function loadSchemaSnapshot(client, tableNames) {
  const columns = await queryRows(
    client,
    `
      select
        table_name,
        column_name,
        ordinal_position,
        data_type,
        udt_name,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, ordinal_position
    `,
    [tableNames],
  );

  const constraints = await queryRows(
    client,
    `
      select
        c.relname as table_name,
        con.conname as constraint_name,
        con.contype,
        pg_get_constraintdef(con.oid) as constraint_def
      from pg_constraint con
      join pg_class c
        on c.oid = con.conrelid
      join pg_namespace n
        on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
      order by c.relname, con.conname
    `,
    [tableNames],
  );

  const indexes = await queryRows(
    client,
    `
      select
        tablename as table_name,
        indexname,
        indexdef
      from pg_indexes
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by tablename, indexname
    `,
    [tableNames],
  );

  return { columns, constraints, indexes };
}

async function loadBackupTableRows(client, tableName, keyColumn, ids) {
  const columns = await loadTableColumns(client, tableName);
  const columnNames = columns.map((column) => column.column_name);
  const orderTerms = [quoteIdent(keyColumn)];
  if (columnNames.includes('id') && keyColumn !== 'id') {
    orderTerms.push(quoteIdent('id'));
  }

  const rows = await queryRows(
    client,
    `
      select ${columnNames.map((columnName) => quoteIdent(columnName)).join(', ')}
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(keyColumn)} = any($1::uuid[])
      order by ${orderTerms.join(', ')}
    `,
    [ids],
  );

  return {
    table_name: tableName,
    key_column: keyColumn,
    columns: columnNames,
    rows,
  };
}

function buildSchemaBackupContent({ generatedAt, classification, collapseMapSamples, fkInventory, schemaSnapshot, fkCounts }) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- Mode: apply`);
  sections.push(`-- classification: ${classification}`);
  sections.push(`-- total_old_ids: ${collapseMapSamples.length > 0 ? EXPECTED.mapCount : 0}`);
  if (collapseMapSamples[0]) {
    sections.push(`-- sample_old_id: ${collapseMapSamples[0].old_id}`);
    sections.push(`-- sample_new_id: ${collapseMapSamples[0].new_id}`);
    sections.push(`-- sample_source_printed_number: ${collapseMapSamples[0].source_printed_number}`);
    sections.push(`-- sample_new_number: ${collapseMapSamples[0].new_number}`);
    sections.push(`-- sample_new_gv_id: ${collapseMapSamples[0].new_gv_id}`);
  }
  sections.push('');
  sections.push('-- Referencing FK inventory to public.card_prints');

  for (const fk of fkInventory) {
    const count = fkCounts.find(
      (row) => row.table_name === fk.table_name && row.column_name === fk.column_name,
    );
    sections.push(
      `-- ${fk.table_name}.${fk.column_name} -> old_id row_count=${normalizeCount(count?.row_count)} supported_handler=${String(
        count?.supported_handler ?? false,
      )}`,
    );
  }

  for (const tableName of BACKUP_TABLE_CONFIG.map((table) => table.table_name)) {
    sections.push('');
    sections.push(`-- Table: public.${tableName}`);
    sections.push('-- Columns');

    for (const column of schemaSnapshot.columns.filter((row) => row.table_name === tableName)) {
      sections.push(
        `--   ${column.column_name} ${column.data_type} (${column.udt_name}) nullable=${column.is_nullable} default=${column.column_default ?? 'null'}`,
      );
    }

    sections.push('-- Constraints');
    const tableConstraints = schemaSnapshot.constraints.filter((row) => row.table_name === tableName);
    if (tableConstraints.length === 0) {
      sections.push('--   none');
    } else {
      for (const constraint of tableConstraints) {
        sections.push(
          `--   ${constraint.constraint_name} [${constraint.contype}] ${constraint.constraint_def}`,
        );
      }
    }

    sections.push('-- Indexes');
    const tableIndexes = schemaSnapshot.indexes.filter((row) => row.table_name === tableName);
    if (tableIndexes.length === 0) {
      sections.push('--   none');
    } else {
      for (const index of tableIndexes) {
        sections.push(`--   ${index.indexname}: ${index.indexdef}`);
      }
    }
  }

  sections.push('');
  return `${sections.join('\n')}\n`;
}

function buildUpsertStatements(tableSnapshot) {
  if (tableSnapshot.rows.length === 0) {
    return [`-- public.${tableSnapshot.table_name}: no rows captured`];
  }

  const columnList = tableSnapshot.columns.map((columnName) => quoteIdent(columnName)).join(', ');
  const updateSet = tableSnapshot.columns
    .filter((columnName) => columnName !== 'id')
    .map((columnName) => `${quoteIdent(columnName)} = excluded.${quoteIdent(columnName)}`)
    .join(', ');

  return tableSnapshot.rows.map((row) => {
    const values = tableSnapshot.columns.map((columnName) => toSqlLiteral(row[columnName])).join(', ');
    return [
      `insert into public.${quoteIdent(tableSnapshot.table_name)} (${columnList})`,
      `values (${values})`,
      `on conflict (${quoteIdent('id')}) do update set ${updateSet};`,
    ].join('\n');
  });
}

function buildDataBackupContent({ generatedAt, classification, collapseMapRows, tableSnapshots }) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY DATA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- classification: ${classification}`);
  sections.push(`-- total_old_ids: ${collapseMapRows.length}`);
  sections.push(`-- total_new_ids: ${new Set(collapseMapRows.map((row) => row.new_id)).size}`);
  sections.push('begin;');
  sections.push('');
  sections.push('-- Restore parent rows first');

  const cardPrintsSnapshot = tableSnapshots.find((table) => table.table_name === 'card_prints');
  sections.push(...buildUpsertStatements(cardPrintsSnapshot));

  for (const tableName of BACKUP_TABLE_CONFIG.map((table) => table.table_name).filter((name) => name !== 'card_prints')) {
    sections.push('');
    sections.push(`-- Restore public.${tableName}`);
    const snapshot = tableSnapshots.find((table) => table.table_name === tableName);
    sections.push(...buildUpsertStatements(snapshot));
  }

  sections.push('');
  sections.push('commit;');
  sections.push('');
  return `${sections.join('\n')}\n`;
}

async function createBackupArtifacts(client, classification, collapseMapRows, collapseMapSamples, fkInventory, fkCounts) {
  const generatedAt = new Date().toISOString();
  const tableNames = BACKUP_TABLE_CONFIG.map((table) => table.table_name);
  const schemaSnapshot = await loadSchemaSnapshot(client, tableNames);
  const ids = [...new Set(collapseMapRows.flatMap((row) => [row.old_id, row.new_id]))];
  const tableSnapshots = [];

  for (const tableConfig of BACKUP_TABLE_CONFIG) {
    tableSnapshots.push(
      await loadBackupTableRows(client, tableConfig.table_name, tableConfig.key_column, ids),
    );
  }

  const schemaContent = buildSchemaBackupContent({
    generatedAt,
    classification,
    collapseMapSamples,
    fkInventory,
    schemaSnapshot,
    fkCounts,
  });
  const dataContent = buildDataBackupContent({
    generatedAt,
    classification,
    collapseMapRows,
    tableSnapshots,
  });

  ensureParentDir(BACKUP_SCHEMA_PATH);
  ensureParentDir(BACKUP_DATA_PATH);
  fs.writeFileSync(BACKUP_SCHEMA_PATH, schemaContent);
  fs.writeFileSync(BACKUP_DATA_PATH, dataContent);

  if (!fs.existsSync(BACKUP_SCHEMA_PATH) || !fs.existsSync(BACKUP_DATA_PATH)) {
    throw new Error('BACKUP_WRITE_FAILED');
  }

  return {
    schema_path: BACKUP_SCHEMA_PATH,
    data_path: BACKUP_DATA_PATH,
    table_row_counts: tableSnapshots.map((table) => ({
      table_name: table.table_name,
      row_count: table.rows.length,
    })),
  };
}

async function loadSupportedFkCounts(client) {
  const tables = [
    ['card_print_identity', 'card_print_id'],
    ['card_print_traits', 'card_print_id'],
    ['card_printings', 'card_print_id'],
    ['external_mappings', 'card_print_id'],
    ['vault_items', 'card_id'],
  ];

  const counts = {};

  for (const [tableName, columnName] of tables) {
    const row = await queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.${quoteIdent(tableName)}
        where ${quoteIdent(columnName)} in (
          select old_id from tmp_xy2_collapse_map
        )
      `,
    );

    counts[`${tableName}.${columnName}`] = normalizeCount(row?.row_count);
  }

  return counts;
}

async function applyCollapse(client) {
  const fkBefore = await loadSupportedFkCounts(client);

  const archivedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      is_active = false,
      updated_at = now()
    from tmp_xy2_fanin_resolution fan_in
    where cpi.id = fan_in.identity_id
      and fan_in.resolution_action = 'archive_history'
      and cpi.is_active = true
  `);

  const updatedIdentityRows = await client.query(`
    update public.card_print_identity cpi
    set
      card_print_id = m.new_id,
      updated_at = now()
    from tmp_xy2_collapse_map m
    where cpi.card_print_id = m.old_id
  `);

  const activeIdentityConflicts = await queryRows(
    client,
    `
      select
        cpi.card_print_id,
        count(*) filter (where cpi.is_active = true)::int as active_identity_rows
      from public.card_print_identity cpi
      where cpi.card_print_id in (
        select distinct new_id from tmp_xy2_collapse_map
      )
      group by cpi.card_print_id
      having count(*) filter (where cpi.is_active = true) <> 1
    `,
  );

  if (activeIdentityConflicts.length > 0) {
    throw new Error(`ACTIVE_IDENTITY_CONFLICT_AFTER_ARCHIVE:${JSON.stringify(activeIdentityConflicts)}`);
  }

  const mergedTraitMetadata = await client.query(`
    update public.card_print_traits new_t
    set
      confidence = coalesce(new_t.confidence, old_t.confidence),
      hp = coalesce(new_t.hp, old_t.hp),
      national_dex = coalesce(new_t.national_dex, old_t.national_dex),
      types = coalesce(new_t.types, old_t.types),
      rarity = case
        when new_t.rarity is null or new_t.rarity = 'None'
          then coalesce(nullif(old_t.rarity, 'None'), new_t.rarity)
        else new_t.rarity
      end,
      supertype = coalesce(new_t.supertype, old_t.supertype),
      card_category = coalesce(new_t.card_category, old_t.card_category),
      legacy_rarity = case
        when new_t.legacy_rarity is null or new_t.legacy_rarity = 'None'
          then coalesce(nullif(old_t.legacy_rarity, 'None'), new_t.legacy_rarity)
        else new_t.legacy_rarity
      end
    from public.card_print_traits old_t
    join tmp_xy2_collapse_map m
      on m.old_id = old_t.card_print_id
    where new_t.card_print_id = m.new_id
      and new_t.trait_type = old_t.trait_type
      and new_t.trait_value = old_t.trait_value
      and new_t.source = old_t.source
      and (
        new_t.confidence is distinct from old_t.confidence
        or new_t.hp is distinct from old_t.hp
        or new_t.national_dex is distinct from old_t.national_dex
        or new_t.types is distinct from old_t.types
        or new_t.rarity is distinct from old_t.rarity
        or new_t.supertype is distinct from old_t.supertype
        or new_t.card_category is distinct from old_t.card_category
        or new_t.legacy_rarity is distinct from old_t.legacy_rarity
      )
  `);

  const insertedTraits = await client.query(`
    insert into public.card_print_traits (
      card_print_id,
      trait_type,
      trait_value,
      source,
      confidence,
      created_at,
      hp,
      national_dex,
      types,
      rarity,
      supertype,
      card_category,
      legacy_rarity
    )
    select
      m.new_id,
      old_t.trait_type,
      old_t.trait_value,
      old_t.source,
      old_t.confidence,
      old_t.created_at,
      old_t.hp,
      old_t.national_dex,
      old_t.types,
      old_t.rarity,
      old_t.supertype,
      old_t.card_category,
      old_t.legacy_rarity
    from public.card_print_traits old_t
    join tmp_xy2_collapse_map m
      on m.old_id = old_t.card_print_id
    on conflict (card_print_id, trait_type, trait_value, source) do nothing
  `);

  const deletedOldTraits = await client.query(`
    delete from public.card_print_traits old_t
    using tmp_xy2_collapse_map m
    where old_t.card_print_id = m.old_id
  `);

  const mergedPrintingMetadata = await client.query(`
    update public.card_printings new_p
    set
      provenance_source = coalesce(new_p.provenance_source, old_p.provenance_source),
      provenance_ref = coalesce(new_p.provenance_ref, old_p.provenance_ref),
      created_by = coalesce(new_p.created_by, old_p.created_by)
    from public.card_printings old_p
    join tmp_xy2_collapse_map m
      on m.old_id = old_p.card_print_id
    where new_p.card_print_id = m.new_id
      and new_p.finish_key = old_p.finish_key
      and (
        (new_p.provenance_source is null and old_p.provenance_source is not null)
        or (new_p.provenance_ref is null and old_p.provenance_ref is not null)
        or (new_p.created_by is null and old_p.created_by is not null)
      )
  `);

  const movedUniquePrintings = await client.query(`
    update public.card_printings old_p
    set card_print_id = m.new_id
    from tmp_xy2_collapse_map m
    where old_p.card_print_id = m.old_id
      and not exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.new_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const deletedRedundantPrintings = await client.query(`
    delete from public.card_printings old_p
    using tmp_xy2_collapse_map m
    where old_p.card_print_id = m.old_id
      and exists (
        select 1
        from public.card_printings new_p
        where new_p.card_print_id = m.new_id
          and new_p.finish_key = old_p.finish_key
      )
  `);

  const updatedExternalMappings = await client.query(`
    update public.external_mappings em
    set card_print_id = m.new_id
    from tmp_xy2_collapse_map m
    where em.card_print_id = m.old_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set
      card_id = m.new_id,
      gv_id = cp_new.gv_id
    from tmp_xy2_collapse_map m
    join public.card_prints cp_new
      on cp_new.id = m.new_id
    where vi.card_id = m.old_id
  `);

  const fkAfter = await loadSupportedFkCounts(client);
  const remainingOldReferences = Object.entries(fkAfter)
    .filter(([, rowCount]) => rowCount > 0)
    .map(([table_ref, row_count]) => ({ table_ref, row_count }));

  if (remainingOldReferences.length > 0) {
    throw new Error(`REMAINING_OLD_REFERENCES_AFTER_REPOINT:${JSON.stringify(remainingOldReferences)}`);
  }

  return {
    fk_before: fkBefore,
    operations: {
      archived_identity_rows: archivedIdentityRows.rowCount ?? 0,
      updated_identity_rows: updatedIdentityRows.rowCount ?? 0,
      merged_trait_metadata_rows: mergedTraitMetadata.rowCount ?? 0,
      inserted_traits: insertedTraits.rowCount ?? 0,
      deleted_old_traits: deletedOldTraits.rowCount ?? 0,
      merged_printing_metadata_rows: mergedPrintingMetadata.rowCount ?? 0,
      moved_unique_printings: movedUniquePrintings.rowCount ?? 0,
      deleted_redundant_printings: deletedRedundantPrintings.rowCount ?? 0,
      updated_external_mappings: updatedExternalMappings.rowCount ?? 0,
      updated_vault_items: updatedVaultItems.rowCount ?? 0,
    },
    fk_after: fkAfter,
  };
}

async function loadPostValidation(client, classification, fkInventory) {
  const remainingOldReferences = await loadFkCounts(
    client,
    fkInventory,
    `select old_id from tmp_xy2_collapse_map`,
  );

  const summary = await queryOne(
    client,
    `
      with unresolved_after as (
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      ),
      target_identity as (
        select
          count(cpi.id)::int as any_identity_rows,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows,
          count(*) filter (where cpi.is_active = false)::int as inactive_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_xy2_collapse_map)
      ),
      target_gvid_drift as (
        select count(*)::int as row_count
        from tmp_xy2_collapse_map m
        join public.card_prints cp
          on cp.id = m.new_id
        where cp.gv_id is distinct from m.new_gv_id
      ),
      route_resolvable as (
        select count(*)::int as row_count
        from public.card_prints cp
        where cp.id in (select new_id from tmp_xy2_collapse_map)
          and cp.gv_id is not null
      ),
      active_identity_target_state as (
        select
          cpi.card_print_id,
          count(*) filter (where cpi.is_active = true)::int as active_identity_rows
        from public.card_print_identity cpi
        where cpi.card_print_id in (select new_id from tmp_xy2_collapse_map)
        group by cpi.card_print_id
      ),
      group_state_after as (
        select
          base.source_base_number_plain,
          count(*)::int as total_rows,
          count(*) filter (where cp.gv_id is not null)::int as canonical_rows,
          count(*) filter (where cp.gv_id is null)::int as noncanonical_rows
        from (
          select distinct source_base_number_plain
          from tmp_xy2_collapse_map
        ) base
        join public.card_prints cp
          on cp.set_code = $3
         and cp.number_plain = base.source_base_number_plain
        group by base.source_base_number_plain
      )
      select
        (
          select count(*)::int
          from public.card_prints cp
          where cp.id in (select old_id from tmp_xy2_collapse_map)
        ) as remaining_old_parent_rows,
        (
          select row_count from unresolved_after
        ) as remaining_unresolved_null_gvid_rows,
        (
          select count(*)::int
          from public.card_prints cp
          where cp.set_code = $3
            and cp.gv_id is not null
        ) as canonical_target_count,
        (
          select any_identity_rows from target_identity
        ) as target_any_identity_rows,
        (
          select active_identity_rows from target_identity
        ) as target_active_identity_rows,
        (
          select inactive_identity_rows from target_identity
        ) as target_inactive_identity_rows,
        (
          select row_count from target_gvid_drift
        ) as target_gvid_drift_count,
        (
          select row_count from route_resolvable
        ) as route_resolvable_target_count,
        (
          select count(*)::int
          from active_identity_target_state
          where active_identity_rows <> 1
        ) as target_active_identity_conflict_count,
        (
          select count(*)::int
          from group_state_after
          where total_rows = 1
            and canonical_rows = 1
            and noncanonical_rows = 0
        ) as clean_group_count,
        (
          select count(*)::int
          from group_state_after
          where total_rows <> 1
             or canonical_rows <> 1
             or noncanonical_rows <> 0
        ) as remaining_duplicate_group_count
    `,
    [TARGET_IDENTITY_DOMAIN, SOURCE_SET_CODE_IDENTITY, TARGET_SET_CODE],
  );

  return {
    classification,
    summary,
    remaining_old_references: remainingOldReferences,
  };
}

function assertPostValidation(postValidation, deletedOldParentRows) {
  const remainingReferences = postValidation.remaining_old_references.filter((row) => row.row_count > 0);
  if (remainingReferences.length > 0) {
    throw new Error(`POST_VALIDATION_OLD_REFERENCES:${JSON.stringify(remainingReferences)}`);
  }

  assertEqual(deletedOldParentRows, EXPECTED.mapCount, 'DELETED_OLD_PARENT_COUNT_DRIFT');
  assertZero(postValidation.summary?.remaining_old_parent_rows, 'REMAINING_OLD_PARENT_ROWS');
  assertZero(
    postValidation.summary?.remaining_unresolved_null_gvid_rows,
    'REMAINING_UNRESOLVED_NULL_GVID_ROWS',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.canonical_target_count),
    EXPECTED.canonicalTargetCount,
    'CANONICAL_TARGET_COUNT_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_any_identity_rows),
    EXPECTED.targetAnyIdentityCount,
    'TARGET_ANY_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_active_identity_rows),
    EXPECTED.selectedActiveIdentityCount,
    'TARGET_ACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertEqual(
    normalizeCount(postValidation.summary?.target_inactive_identity_rows),
    EXPECTED.archivedIdentityCount,
    'TARGET_INACTIVE_IDENTITY_ROWS_AFTER_DRIFT',
  );
  assertZero(postValidation.summary?.target_gvid_drift_count, 'TARGET_GVID_DRIFT_COUNT');
  assertEqual(
    normalizeCount(postValidation.summary?.route_resolvable_target_count),
    EXPECTED.distinctNewCount,
    'ROUTE_RESOLVABLE_TARGET_COUNT_DRIFT',
  );
  assertZero(
    postValidation.summary?.target_active_identity_conflict_count,
    'TARGET_ACTIVE_IDENTITY_CONFLICT_COUNT',
  );

  if (postValidation.classification === 'BASE_VARIANT_COLLAPSE') {
    assertEqual(
      normalizeCount(postValidation.summary?.clean_group_count),
      EXPECTED.distinctNewCount,
      'CLEAN_GROUP_COUNT_DRIFT',
    );
    assertZero(postValidation.summary?.remaining_duplicate_group_count, 'REMAINING_DUPLICATE_GROUP_COUNT');
  }
}

async function loadSampleAfterRows(client, sampleRows) {
  const afterRows = [];

  for (const sample of sampleRows) {
    const row = await queryOne(
      client,
      `
        select
          exists (
            select 1
            from public.card_prints old_cp
            where old_cp.id = $1
          ) as old_parent_still_exists,
          new_cp.id as new_id,
          new_cp.name as new_name,
          new_cp.number as new_number_after,
          new_cp.number_plain as new_number_plain_after,
          new_cp.set_code as new_set_code_after,
          new_cp.gv_id as target_gv_id_after,
          count(cpi.id)::int as identity_row_count_on_new_parent,
          count(*) filter (where cpi.is_active = true)::int as active_identity_row_count_on_new_parent,
          count(*) filter (where cpi.is_active = false)::int as inactive_identity_row_count_on_new_parent
        from public.card_prints new_cp
        left join public.card_print_identity cpi
          on cpi.card_print_id = new_cp.id
        where new_cp.id = $2
        group by
          new_cp.id,
          new_cp.name,
          new_cp.number,
          new_cp.number_plain,
          new_cp.set_code,
          new_cp.gv_id
      `,
      [sample.old_id, sample.new_id],
    );

    afterRows.push({
      ...sample,
      ...row,
    });
  }

  return afterRows;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    source_set_code_identity: SOURCE_SET_CODE_IDENTITY,
    target_set_code: TARGET_SET_CODE,
    classification: null,
    normalization_contract: {
      name_normalize_v3:
        "lowercase -> unicode apostrophe to ASCII -> normalize dash separators to spaces -> remove GX/EX punctuation variants -> collapse whitespace -> trim",
      token_normalize_v1: 'numeric base extraction; suffix routing only within the same base number',
    },
    archival_model: 'is_active=false with history preserved on canonical parent; live schema has no card_print_identity.archived_at column',
    preconditions: null,
    fan_in_resolution: null,
    collapse_map_samples: null,
    fk_inventory: null,
    collision_summary: null,
    canonical_count_before: null,
    backup_artifacts: null,
    apply_operations: null,
    deleted_old_parent_rows: 0,
    post_validation: null,
    sample_before_after_rows: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `xy2_identity_resolution_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCollapseSurface(client);
    report.preconditions = await populateMatchArtifacts(client);
    report.classification = report.preconditions.classification;
    assertPreconditions(report.preconditions);
    report.fan_in_resolution = await buildFanInResolution(client);
    assertFanInResolution(report.fan_in_resolution);
    report.collapse_map_samples = await loadCollapseMapSamples(client);
    if (report.collapse_map_samples.length !== 3) {
      throw new Error(`COLLAPSE_MAP_SAMPLE_COUNT_DRIFT:${report.collapse_map_samples.length}:3`);
    }

    const fkInventory = await loadCardPrintFkInventory(client);
    report.fk_inventory = await loadFkCounts(
      client,
      fkInventory,
      `select old_id from tmp_xy2_collapse_map`,
    );
    assertNoUnexpectedReferencedTables(report.fk_inventory);

    report.collision_summary = await loadCollisionSummary(client);
    assertCollisionSummary(report.collision_summary);

    report.canonical_count_before = await loadCanonicalCount(client);
    assertEqual(
      normalizeCount(report.canonical_count_before?.canonical_target_count),
      EXPECTED.canonicalTargetCount,
      'CANONICAL_TARGET_COUNT_BEFORE_DRIFT',
    );

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    const collapseMapRows = await queryRows(
      client,
      `
        select *
        from tmp_xy2_collapse_map
        order by seq
      `,
    );

    report.backup_artifacts = await createBackupArtifacts(
      client,
      report.classification,
      collapseMapRows,
      report.collapse_map_samples,
      fkInventory,
      report.fk_inventory,
    );

    report.apply_operations = await applyCollapse(client);

    const deletedParents = await client.query(`
      delete from public.card_prints cp
      using tmp_xy2_collapse_map m
      where cp.id = m.old_id
    `);
    report.deleted_old_parent_rows = deletedParents.rowCount ?? 0;

    report.post_validation = await loadPostValidation(client, report.classification, fkInventory);
    assertPostValidation(report.post_validation, report.deleted_old_parent_rows);

    report.sample_before_after_rows = await loadSampleAfterRows(client, report.collapse_map_samples);

    for (const row of report.sample_before_after_rows) {
      if (row.old_parent_still_exists !== false) {
        throw new Error(`OLD_PARENT_STILL_EXISTS:${row.old_id}`);
      }
      if (row.target_gv_id_after !== row.new_gv_id) {
        throw new Error(`TARGET_GVID_DRIFT:${row.target_gv_id_after}:${row.new_gv_id}`);
      }
    }

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
    }

    report.status = 'failed';
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});


