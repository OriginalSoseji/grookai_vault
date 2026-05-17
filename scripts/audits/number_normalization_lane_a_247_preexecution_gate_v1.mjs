import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const OUT_DIR = path.join(ROOT, 'docs', 'plans', 'pokemon_db_remediation_v1');
const COMMITTED_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_write_plan_matrix_20260517.json');
const SQL_PLAN_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_write_plan_20260517.sql');
const GATE_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_preexecution_gate_matrix_20260517.json');
const GATE_REPORT_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_preexecution_gate_20260517.md');
const GREY_FELT_HAT_CARD_PRINT_ID = '50386954-ded6-4909-8d17-6b391aeb53e4';

const HARD_STOP_CODES = [
  'pgo',
  'swsh10.5',
  'sv04.5',
  'sv4pt5',
  'sv06.5',
  'sv6pt5',
  'sv08.5',
  'sv8pt5',
];

const REVIEW_STOP_CODES = [
  'bog',
  'bp',
  'tk-ex-latia',
  'tk-ex-latio',
  'tk-ex-m',
  'tk-ex-p',
  'tk1a',
  'tk1b',
  'tk2a',
  'tk2b',
];

const USER_MARKET_REF_TABLES = [
  ['pricing_watch', 'card_print_id'],
  ['shared_cards', 'card_id'],
  ['slab_certs', 'card_print_id'],
  ['vault_item_instances', 'card_print_id'],
  ['vault_items', 'card_id'],
  ['justtcg_variants', 'card_print_id'],
  ['justtcg_variant_prices_latest', 'card_print_id'],
  ['justtcg_variant_price_snapshots', 'card_print_id'],
];

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function renderTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

function comparableCandidate(row) {
  return {
    card_print_id: row.card_print_id,
    set_id: row.set_id,
    set_code: row.set_code,
    set_name: row.set_name,
    card_name: row.card_name,
    approved_number: row.approved_number,
    approved_number_plain: row.approved_number_plain,
    source_carriers: [...(row.source_carriers ?? [])].sort(),
    source_external_ids: [...(row.source_external_ids ?? [])].sort(),
    current_print_identity_key: row.current_print_identity_key ?? null,
    current_gv_id: row.current_gv_id ?? null,
  };
}

function compareCommittedToLive(committedCandidates, liveCandidates) {
  const committedById = new Map(committedCandidates.map((row) => [row.card_print_id, comparableCandidate(row)]));
  const liveById = new Map(liveCandidates.map((row) => [row.card_print_id, comparableCandidate(row)]));
  const missingFromLive = [...committedById.keys()].filter((id) => !liveById.has(id)).sort();
  const extraInLive = [...liveById.keys()].filter((id) => !committedById.has(id)).sort();
  const fieldDiffs = [];

  for (const id of [...committedById.keys()].sort()) {
    if (!liveById.has(id)) continue;
    const committed = committedById.get(id);
    const live = liveById.get(id);
    const fields = [];
    for (const key of Object.keys(committed)) {
      if (JSON.stringify(committed[key]) !== JSON.stringify(live[key])) {
        fields.push({
          field: key,
          committed: committed[key],
          live: live[key],
        });
      }
    }
    if (fields.length) fieldDiffs.push({ card_print_id: id, fields });
  }

  return {
    missing_from_live: missingFromLive,
    extra_in_live: extraInLive,
    field_diffs: fieldDiffs,
    drift_count: missingFromLive.length + extraInLive.length + fieldDiffs.length,
  };
}

function buildSetBreakdown(candidates) {
  return Object.values(candidates.reduce((acc, row) => {
    acc[row.set_code] ||= {
      set_code: row.set_code,
      set_name: row.set_name,
      clean_rows: 0,
      min_approved_number: row.approved_number,
      max_approved_number: row.approved_number,
    };
    acc[row.set_code].clean_rows += 1;
    if (Number(row.approved_number) < Number(acc[row.set_code].min_approved_number)) acc[row.set_code].min_approved_number = row.approved_number;
    if (Number(row.approved_number) > Number(acc[row.set_code].max_approved_number)) acc[row.set_code].max_approved_number = row.approved_number;
    return acc;
  }, {})).sort((a, b) => a.set_code.localeCompare(b.set_code));
}

async function tableColumnExists(client, tableName, columnName) {
  const { rows } = await client.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function loadUserMarketReferences(client, candidateIds) {
  const inventory = [];
  const perCard = new Map();
  for (const [tableName, columnName] of USER_MARKET_REF_TABLES) {
    const exists = await tableColumnExists(client, tableName, columnName);
    if (!exists) {
      inventory.push({
        table_name: tableName,
        column_name: columnName,
        table_available: false,
        reference_rows: 0,
        referenced_candidate_rows: 0,
      });
      continue;
    }

    const countSql = `
      select
        count(*)::int as reference_rows,
        count(distinct ${quoteIdent(columnName)})::int as referenced_candidate_rows
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(columnName)} = any($1::uuid[])
    `;
    const { rows } = await client.query(countSql, [candidateIds]);
    inventory.push({
      table_name: tableName,
      column_name: columnName,
      table_available: true,
      reference_rows: rows[0]?.reference_rows ?? 0,
      referenced_candidate_rows: rows[0]?.referenced_candidate_rows ?? 0,
    });

    const detailSql = `
      select
        ${quoteIdent(columnName)}::text as card_print_id,
        count(*)::int as reference_rows
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(columnName)} = any($1::uuid[])
      group by ${quoteIdent(columnName)}
      order by ${quoteIdent(columnName)}
    `;
    const { rows: detailRows } = await client.query(detailSql, [candidateIds]);
    for (const detail of detailRows) {
      if (!perCard.has(detail.card_print_id)) perCard.set(detail.card_print_id, []);
      perCard.get(detail.card_print_id).push({
        table_name: tableName,
        column_name: columnName,
        reference_rows: detail.reference_rows,
      });
    }
  }

  return {
    inventory,
    per_card: [...perCard.entries()]
      .map(([cardPrintId, references]) => ({ card_print_id: cardPrintId, references }))
      .sort((a, b) => a.card_print_id.localeCompare(b.card_print_id)),
  };
}

async function loadLiveScope(client) {
  const { rows } = await client.query(
    `
      with hard_stop_codes(set_code) as (
        select unnest($1::text[])
      ),
      review_stop_codes(set_code) as (
        select unnest($2::text[])
      ),
      source_candidates as (
        select
          cp.id as card_print_id,
          cp.set_id,
          s.code as set_code,
          s.name as set_name,
          cp.name as card_name,
          cp.variant_key,
          cp.print_identity_key,
          cp.gv_id,
          'external_ids.tcgdex'::text as source_carrier,
          cp.external_ids->>'tcgdex' as source_external_id
        from public.card_prints cp
        join public.sets s on s.id = cp.set_id
        where cp.external_ids ? 'tcgdex'
          and s.game = 'pokemon'
          and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
          and (cp.number is null or btrim(cp.number) = '')
          and (cp.number_plain is null or btrim(cp.number_plain) = '')

        union all

        select
          cp.id as card_print_id,
          cp.set_id,
          s.code as set_code,
          s.name as set_name,
          cp.name as card_name,
          cp.variant_key,
          cp.print_identity_key,
          cp.gv_id,
          'external_mappings.tcgdex'::text as source_carrier,
          em.external_id as source_external_id
        from public.card_prints cp
        join public.sets s on s.id = cp.set_id
        join public.external_mappings em
          on em.card_print_id = cp.id
         and em.source = 'tcgdex'
         and em.active = true
        where s.game = 'pokemon'
          and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
          and (cp.number is null or btrim(cp.number) = '')
          and (cp.number_plain is null or btrim(cp.number_plain) = '')
      ),
      normalized_candidates as (
        select
          *,
          case
            when regexp_replace(source_external_id, '^.*-', '') ~ '^[0-9]+$'
              then (regexp_replace(source_external_id, '^.*-', '')::int)::text
            when regexp_replace(source_external_id, '^.*-', '') ~ '^[A-Za-z]+0*[0-9]+[A-Za-z]*$'
              then upper(regexp_replace(regexp_replace(source_external_id, '^.*-', ''), '^([A-Za-z]+)0*([0-9]+)([A-Za-z]*)$', '\\1\\2\\3'))
            else upper(regexp_replace(source_external_id, '^.*-', ''))
          end as candidate_number
        from source_candidates
        where source_external_id like '%-%'
      ),
      candidate_rollup as (
        select
          cp.id::text as card_print_id,
          cp.set_id::text as set_id,
          s.code as set_code,
          s.name as set_name,
          cp.name as card_name,
          cp.variant_key,
          cp.print_identity_key as current_print_identity_key,
          cp.gv_id as current_gv_id,
          count(distinct nc.candidate_number)::int as distinct_candidate_numbers,
          array_agg(distinct nc.candidate_number order by nc.candidate_number) filter (where nc.candidate_number is not null) as candidate_numbers,
          array_agg(distinct nc.source_carrier order by nc.source_carrier) filter (where nc.source_carrier is not null) as source_carriers,
          array_agg(distinct nc.source_external_id order by nc.source_external_id) filter (where nc.source_external_id is not null) as source_external_ids,
          bool_or(hs.set_code is not null) as in_hard_stop_set,
          bool_or(rs.set_code is not null) as in_review_stop_set
        from public.card_prints cp
        join public.sets s on s.id = cp.set_id
        left join normalized_candidates nc on nc.card_print_id = cp.id
        left join hard_stop_codes hs on hs.set_code = s.code
        left join review_stop_codes rs on rs.set_code = s.code
        where s.game = 'pokemon'
          and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
          and (cp.number is null or btrim(cp.number) = '')
          and (cp.number_plain is null or btrim(cp.number_plain) = '')
        group by cp.id, cp.set_id, s.code, s.name, cp.name, cp.variant_key, cp.print_identity_key, cp.gv_id
      ),
      lane_a as (
        select
          card_print_id,
          set_id,
          set_code,
          set_name,
          card_name,
          candidate_numbers[1] as approved_number,
          candidate_numbers[1] as approved_number_plain,
          coalesce(source_carriers, array[]::text[]) as source_carriers,
          coalesce(source_external_ids, array[]::text[]) as source_external_ids,
          current_print_identity_key,
          current_gv_id
        from candidate_rollup
        where distinct_candidate_numbers = 1
          and in_hard_stop_set = false
          and in_review_stop_set = false
          and candidate_numbers[1] ~ '^[0-9]+$'
          and coalesce(source_carriers, array[]::text[]) @> array['external_ids.tcgdex','external_mappings.tcgdex']::text[]
      ),
      collision_ids as (
        select distinct c.card_print_id
        from lane_a c
        join public.card_prints existing
          on existing.set_id::text = c.set_id
         and existing.id::text <> c.card_print_id
         and (
           existing.number = c.approved_number
           or existing.number_plain = c.approved_number_plain
         )
      ),
      duplicate_ids as (
        select card_print_id
        from (
          select
            c.card_print_id,
            count(*) over (partition by c.set_id, c.approved_number_plain) as candidate_same_number_count
          from lane_a c
        ) scoped
        where candidate_same_number_count > 1
      ),
      active_identity_conflict_ids as (
        select distinct c.card_print_id
        from lane_a c
        join public.card_print_identity cpi
          on cpi.card_print_id::text = c.card_print_id
         and cpi.is_active = true
         and cpi.printed_number is not null
         and (
           case
             when split_part(upper(regexp_replace(regexp_replace(cpi.printed_number, '^#', ''), '\\s+', '', 'g')), '/', 1) ~ '^[0-9]+$'
               then (split_part(upper(regexp_replace(regexp_replace(cpi.printed_number, '^#', ''), '\\s+', '', 'g')), '/', 1)::int)::text
             when split_part(upper(regexp_replace(regexp_replace(cpi.printed_number, '^#', ''), '\\s+', '', 'g')), '/', 1) ~ '^[A-Z]+0*[0-9]+[A-Z]*$'
               then upper(regexp_replace(split_part(upper(regexp_replace(regexp_replace(cpi.printed_number, '^#', ''), '\\s+', '', 'g')), '/', 1), '^([A-Z]+)0*([0-9]+)([A-Z]*)$', '\\1\\2\\3'))
             else split_part(upper(regexp_replace(regexp_replace(cpi.printed_number, '^#', ''), '\\s+', '', 'g')), '/', 1)
           end
         ) is distinct from c.approved_number
      ),
      clean_248 as (
        select c.*
        from lane_a c
        left join collision_ids collisions on collisions.card_print_id = c.card_print_id
        left join duplicate_ids duplicates on duplicates.card_print_id = c.card_print_id
        left join active_identity_conflict_ids identities on identities.card_print_id = c.card_print_id
        where collisions.card_print_id is null
          and duplicates.card_print_id is null
          and identities.card_print_id is null
      ),
      clean_247 as (
        select *
        from clean_248
        where card_print_id <> $3
      ),
      lane_counts as (
        select
          count(*)::int as missing_number_rows_audited,
          count(*) filter (where in_hard_stop_set)::int as hard_stop_blocked_rows,
          count(*) filter (where in_review_stop_set)::int as review_stop_blocked_rows,
          count(*) filter (
            where distinct_candidate_numbers = 1
              and in_hard_stop_set = false
              and in_review_stop_set = false
              and candidate_numbers[1] ~ '^[0-9]+$'
          )::int as lane_a_numeric_non_hard_stop_candidates,
          count(*) filter (
            where distinct_candidate_numbers = 1
              and in_hard_stop_set = false
              and in_review_stop_set = false
              and candidate_numbers[1] ~ '^[A-Z]+[0-9]+[A-Z]*$'
          )::int as prefixed_source_candidate_non_hard_stop,
          count(*) filter (
            where distinct_candidate_numbers = 1
              and in_hard_stop_set = false
              and in_review_stop_set = false
              and candidate_numbers[1] !~ '^[0-9]+$'
              and candidate_numbers[1] !~ '^[A-Z]+[0-9]+[A-Z]*$'
          )::int as complex_source_candidate_non_hard_stop
        from candidate_rollup
      )
      select jsonb_build_object(
        'counts', jsonb_build_object(
          'missing_number_rows_audited', (select missing_number_rows_audited from lane_counts),
          'hard_stop_blocked_rows', (select hard_stop_blocked_rows from lane_counts),
          'review_stop_blocked_rows', (select review_stop_blocked_rows from lane_counts),
          'lane_a_numeric_non_hard_stop_candidates', (select lane_a_numeric_non_hard_stop_candidates from lane_counts),
          'prefixed_source_candidate_non_hard_stop', (select prefixed_source_candidate_non_hard_stop from lane_counts),
          'complex_source_candidate_non_hard_stop', (select complex_source_candidate_non_hard_stop from lane_counts),
          'collision_blocked_rows', (select count(*)::int from collision_ids),
          'duplicate_candidate_rows', (select count(*)::int from duplicate_ids),
          'active_identity_conflict_rows', (select count(*)::int from active_identity_conflict_ids),
          'clean_248_rows', (select count(*)::int from clean_248),
          'clean_247_rows', (select count(*)::int from clean_247),
          'me01_duplicate_candidates_excluded', (select count(*)::int from lane_a where set_code = 'me01'),
          'grey_felt_hat_in_clean_248', (select count(*)::int from clean_248 where card_print_id = $3),
          'grey_felt_hat_in_clean_247', (select count(*)::int from clean_247 where card_print_id = $3)
        ),
        'candidates', coalesce((
          select jsonb_agg(jsonb_build_object(
            'card_print_id', card_print_id,
            'set_id', set_id,
            'set_code', set_code,
            'set_name', set_name,
            'card_name', card_name,
            'approved_number', approved_number,
            'approved_number_plain', approved_number_plain,
            'source_carriers', source_carriers,
            'source_external_ids', source_external_ids,
            'current_print_identity_key', current_print_identity_key,
            'current_gv_id', current_gv_id
          ) order by set_code, approved_number::int, card_name, card_print_id)
          from clean_247
        ), '[]'::jsonb)
      ) as result
    `,
    [HARD_STOP_CODES, REVIEW_STOP_CODES, GREY_FELT_HAT_CARD_PRINT_ID],
  );
  return rows[0].result;
}

async function inspectWriteBoundary() {
  const sql = await fs.readFile(SQL_PLAN_PATH, 'utf8');
  const activeWriteStatements = sql
    .split(/\r?\n/)
    .filter((line) => /^\s*(insert|update|delete|create|drop|alter)\b/i.test(line));

  const lines = sql.split(/\r?\n/);
  const updateColumns = [];
  let insideCardPrintsUpdate = false;
  let insideSet = false;
  for (const line of lines) {
    if (/^--\s*update\s+public\.card_prints\s+cp\b/i.test(line)) {
      insideCardPrintsUpdate = true;
      insideSet = false;
      continue;
    }
    if (insideCardPrintsUpdate && /^--\s*set\b/i.test(line)) {
      insideSet = true;
      continue;
    }
    if (insideCardPrintsUpdate && insideSet && /^--\s*from\b/i.test(line)) {
      break;
    }
    if (insideCardPrintsUpdate && insideSet) {
      const match = line.match(/^--\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
      if (match) updateColumns.push(match[1]);
    }
  }

  const disallowedTableUpdates = lines.filter((line) => /^--\s*update\s+public\.(?!card_prints\b)/i.test(line));
  const disallowedUpdateColumns = updateColumns.filter((column) => !['number', 'number_plain'].includes(column));
  const expectedColumns = ['number', 'number_plain'];

  return {
    sql_plan_path: 'docs/plans/pokemon_db_remediation_v1/number_normalization_lane_a_247_write_plan_20260517.sql',
    active_write_statement_count: activeWriteStatements.length,
    commented_card_prints_update_columns: updateColumns,
    expected_update_columns: expectedColumns,
    disallowed_update_columns: disallowedUpdateColumns,
    disallowed_table_update_count: disallowedTableUpdates.length,
    pass:
      activeWriteStatements.length === 0 &&
      disallowedTableUpdates.length === 0 &&
      JSON.stringify(updateColumns) === JSON.stringify(expectedColumns) &&
      disallowedUpdateColumns.length === 0,
  };
}

function renderMarkdown(matrix) {
  const lines = [];
  lines.push('# Lane A 247 Pre-Execution Gate - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write pre-execution gate. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.');
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`Gate status: \`${matrix.status}\``);
  if (matrix.failure_reasons.length) {
    lines.push('');
    lines.push('Failure reasons:');
    lines.push('');
    for (const reason of matrix.failure_reasons) lines.push(`- ${reason}`);
  }
  lines.push('');
  lines.push(renderTable(
    ['Check', 'Result'],
    [
      ['Committed 247 candidate rows', matrix.summary.committed_candidate_rows],
      ['Live regenerated 247 rows', matrix.summary.live_clean_candidate_rows],
      ['Committed vs live drift count', matrix.summary.committed_vs_live_drift_count],
      ['User/market referenced 247 rows', matrix.live_counts.user_market_referenced_clean_candidates],
      ['Hard-stop rows in 247 scope', matrix.live_counts.hard_stop_rows_in_247_scope],
      ['Review-stop rows in 247 scope', matrix.live_counts.review_stop_rows_in_247_scope],
      ['Collision rows in 247 scope', matrix.live_counts.collision_rows_in_247_scope],
      ['`me01` rows in 247 scope', matrix.live_counts.me01_rows_in_247_scope],
      ['Grey Felt Hat row in 247 scope', matrix.live_counts.grey_felt_hat_in_247_scope],
      ['Explicit future update columns', matrix.write_boundary.commented_card_prints_update_columns.join(', ')],
      ['Recommended immediate writes', matrix.summary.recommended_immediate_writes],
    ],
  ));
  lines.push('');
  lines.push('## Set Breakdown');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Name', 'Rows', 'Range'],
    matrix.set_breakdown.map((row) => [
      `\`${row.set_code}\``,
      row.set_name,
      row.clean_rows,
      `${row.min_approved_number}-${row.max_approved_number}`,
    ]),
  ));
  lines.push('');
  lines.push('## Write Boundary Proof');
  lines.push('');
  lines.push(renderTable(
    ['Boundary', 'Result'],
    [
      ['Active write statements in SQL plan', matrix.write_boundary.active_write_statement_count],
      ['Commented target table', 'public.card_prints'],
      ['Commented update columns', matrix.write_boundary.commented_card_prints_update_columns.join(', ')],
      ['Disallowed update columns', matrix.write_boundary.disallowed_update_columns.length],
      ['Disallowed table updates', matrix.write_boundary.disallowed_table_update_count],
      ['Boundary pass', matrix.write_boundary.pass],
    ],
  ));
  lines.push('');
  lines.push('## Drift Details');
  lines.push('');
  if (matrix.comparison.drift_count === 0) {
    lines.push('No drift found. The live regenerated 247-row matrix exactly matches the committed 247-row matrix.');
  } else {
    lines.push('Drift found. Stop. Do not execute any number-normalization write.');
    lines.push('');
    lines.push(`- Missing from live: ${matrix.comparison.missing_from_live.length}`);
    lines.push(`- Extra in live: ${matrix.comparison.extra_in_live.length}`);
    lines.push(`- Field-diff rows: ${matrix.comparison.field_diffs.length}`);
  }
  lines.push('');
  lines.push('## Reference Gate Details');
  lines.push('');
  if (!matrix.referenced_clean_candidates.length) {
    lines.push('No user, vault, pricing, slab, shared-card, or JustTCG market references were found on the live 247-row candidate set.');
  } else {
    lines.push('At least one live 247-row candidate has user/market references. Stop before execution.');
  }
  lines.push('');
  lines.push('## No-Write Confirmation');
  lines.push('');
  lines.push('- No Supabase writes.');
  lines.push('- No migrations.');
  lines.push('- No inserts.');
  lines.push('- No updates.');
  lines.push('- No deletes.');
  lines.push('- No data changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const committed = JSON.parse(await fs.readFile(COMMITTED_MATRIX_PATH, 'utf8'));
  const committedCandidates = committed.candidates ?? [];
  const writeBoundary = await inspectWriteBoundary();

  const client = new pg.Client({
    connectionString,
    application_name: 'number_normalization_lane_a_247_preexecution_gate_v1:readonly',
    statement_timeout: 120000,
  });

  let liveScope;
  let userMarketRefs;
  await client.connect();
  try {
    await client.query('begin transaction read only');
    liveScope = await loadLiveScope(client);
    userMarketRefs = await loadUserMarketReferences(
      client,
      liveScope.candidates.map((row) => row.card_print_id),
    );
    await client.query('rollback');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    await client.end();
  }

  const liveCandidates = liveScope.candidates.map(comparableCandidate);
  const comparison = compareCommittedToLive(committedCandidates, liveCandidates);
  const referencedById = new Map(userMarketRefs.per_card.map((row) => [row.card_print_id, row.references]));
  const referencedCleanCandidates = liveCandidates
    .filter((row) => referencedById.has(row.card_print_id))
    .map((row) => ({
      ...row,
      references: referencedById.get(row.card_print_id),
    }));

  const committedHardStopRows = committedCandidates.filter((row) => HARD_STOP_CODES.includes(row.set_code)).length;
  const committedReviewStopRows = committedCandidates.filter((row) => REVIEW_STOP_CODES.includes(row.set_code)).length;
  const committedMe01Rows = committedCandidates.filter((row) => row.set_code === 'me01').length;
  const committedGreyRows = committedCandidates.filter((row) => row.card_print_id === GREY_FELT_HAT_CARD_PRINT_ID).length;
  const referenceTablesWithRefs = userMarketRefs.inventory.filter((row) => Number(row.reference_rows || 0) > 0).length;

  const failureReasons = [];
  if (committedCandidates.length !== 247) failureReasons.push(`committed matrix row count is ${committedCandidates.length}, expected 247`);
  if (liveCandidates.length !== 247) failureReasons.push(`live regenerated matrix row count is ${liveCandidates.length}, expected 247`);
  if (comparison.drift_count !== 0) failureReasons.push(`committed 247 matrix differs from live regenerated matrix in ${comparison.drift_count} row group(s)`);
  if (referencedCleanCandidates.length !== 0) failureReasons.push(`${referencedCleanCandidates.length} live 247 candidate(s) carry user/market references`);
  if (committedHardStopRows !== 0) failureReasons.push(`${committedHardStopRows} hard-stop row(s) are present in the committed 247 scope`);
  if (committedReviewStopRows !== 0) failureReasons.push(`${committedReviewStopRows} review-stop row(s) are present in the committed 247 scope`);
  if (committedMe01Rows !== 0) failureReasons.push(`${committedMe01Rows} me01 row(s) are present in the committed 247 scope`);
  if (committedGreyRows !== 0) failureReasons.push('Grey Felt Hat row is present in the committed 247 scope');
  if (liveScope.counts.grey_felt_hat_in_clean_247 !== 0) failureReasons.push('Grey Felt Hat row is present in the live regenerated 247 scope');
  if (!writeBoundary.pass) failureReasons.push('SQL write boundary does not prove only card_prints.number and card_prints.number_plain would be explicitly updated');

  const pass = failureReasons.length === 0;
  const matrix = {
    status: pass ? 'PASS_247_EXACT_MATCH_NO_WRITE' : 'FAIL_247_PREEXECUTION_GATE_NO_WRITE',
    generated_at: new Date().toISOString(),
    committed_matrix_path: 'docs/plans/pokemon_db_remediation_v1/number_normalization_lane_a_247_write_plan_matrix_20260517.json',
    source: 'live Supabase read-only transaction',
    summary: {
      committed_candidate_rows: committedCandidates.length,
      live_clean_candidate_rows: liveCandidates.length,
      committed_vs_live_drift_count: comparison.drift_count,
      recommended_immediate_writes: 0,
      execution_eligible_after_explicit_approval: pass,
    },
    failure_reasons: failureReasons,
    live_counts: {
      ...liveScope.counts,
      user_market_referenced_clean_candidates: referencedCleanCandidates.length,
      user_market_reference_tables_with_refs: referenceTablesWithRefs,
      hard_stop_rows_in_247_scope: committedHardStopRows,
      review_stop_rows_in_247_scope: committedReviewStopRows,
      collision_rows_in_247_scope: 0,
      me01_rows_in_247_scope: committedMe01Rows,
      grey_felt_hat_in_247_scope: committedGreyRows + Number(liveScope.counts.grey_felt_hat_in_clean_247 || 0),
    },
    set_breakdown: buildSetBreakdown(liveCandidates),
    write_boundary: writeBoundary,
    user_market_reference_inventory: userMarketRefs.inventory,
    referenced_clean_candidates: referencedCleanCandidates,
    comparison,
    live_candidates: liveCandidates,
    no_write_confirmation: {
      supabase_writes: false,
      migrations: false,
      inserts: false,
      updates: false,
      deletes: false,
      data_changes: false,
    },
  };

  await fs.writeFile(GATE_MATRIX_PATH, JSON.stringify(matrix, null, 2) + '\n');
  await fs.writeFile(GATE_REPORT_PATH, renderMarkdown(matrix));

  console.log(JSON.stringify({
    status: matrix.status,
    committed_candidate_rows: matrix.summary.committed_candidate_rows,
    live_clean_candidate_rows: matrix.summary.live_clean_candidate_rows,
    drift_count: matrix.summary.committed_vs_live_drift_count,
    user_market_referenced_clean_candidates: matrix.live_counts.user_market_referenced_clean_candidates,
    grey_felt_hat_in_247_scope: matrix.live_counts.grey_felt_hat_in_247_scope,
    write_boundary_pass: matrix.write_boundary.pass,
  }, null, 2));

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
