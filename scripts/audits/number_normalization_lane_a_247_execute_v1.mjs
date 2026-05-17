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
const WRITE_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_write_plan_matrix_20260517.json');
const GATE_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_preexecution_gate_matrix_20260517.json');
const EXECUTION_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_execution_matrix_20260517.json');
const EXECUTION_REPORT_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_247_execution_20260517.md');
const GREY_FELT_HAT_CARD_PRINT_ID = '50386954-ded6-4909-8d17-6b391aeb53e4';

const EXPECTED_ROW_COUNT = 247;
const MAX_GATE_AGE_MS = 60 * 60 * 1000;

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

function assertCondition(condition, message, detail = undefined) {
  if (condition) return;
  const error = new Error(message);
  if (detail !== undefined) error.detail = detail;
  throw error;
}

function asNumber(value) {
  return Number(value ?? 0);
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

function normalizeCandidate(row) {
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

function buildSetBreakdown(rows) {
  return Object.values(rows.reduce((acc, row) => {
    acc[row.set_code] ||= {
      set_code: row.set_code,
      set_name: row.set_name,
      updated_rows: 0,
      min_number: row.approved_number,
      max_number: row.approved_number,
    };
    acc[row.set_code].updated_rows += 1;
    if (Number(row.approved_number) < Number(acc[row.set_code].min_number)) acc[row.set_code].min_number = row.approved_number;
    if (Number(row.approved_number) > Number(acc[row.set_code].max_number)) acc[row.set_code].max_number = row.approved_number;
    return acc;
  }, {})).sort((a, b) => a.set_code.localeCompare(b.set_code));
}

function validateApprovedMatrix(committed, gate) {
  const candidates = (committed.candidates ?? []).map(normalizeCandidate);
  const candidateIds = candidates.map((row) => row.card_print_id);
  const uniqueIds = new Set(candidateIds);
  const failures = [];

  if (committed.status !== 'NO_WRITE_LANE_A_247_WRITE_PLAN_MATRIX_ONLY') {
    failures.push(`unexpected committed matrix status: ${committed.status}`);
  }
  if (candidates.length !== EXPECTED_ROW_COUNT) {
    failures.push(`committed matrix row count is ${candidates.length}, expected ${EXPECTED_ROW_COUNT}`);
  }
  if (uniqueIds.size !== candidates.length) {
    failures.push('committed matrix contains duplicate card_print_id values');
  }
  if (candidateIds.includes(GREY_FELT_HAT_CARD_PRINT_ID)) {
    failures.push('Grey Felt Hat row is present in the 247 execution matrix');
  }
  if (candidates.some((row) => HARD_STOP_CODES.includes(row.set_code))) {
    failures.push('hard-stop set code is present in the 247 execution matrix');
  }
  if (candidates.some((row) => REVIEW_STOP_CODES.includes(row.set_code))) {
    failures.push('review-stop set code is present in the 247 execution matrix');
  }
  if (candidates.some((row) => row.set_code === 'me01')) {
    failures.push('me01 duplicate candidate is present in the 247 execution matrix');
  }
  if (candidates.some((row) => !/^[0-9]+$/.test(row.approved_number) || row.approved_number !== row.approved_number_plain)) {
    failures.push('at least one approved row is not a simple numeric number/plain pair');
  }
  if (gate.status !== 'PASS_247_EXACT_MATCH_NO_WRITE') {
    failures.push(`pre-execution gate is not passing: ${gate.status}`);
  }
  if (asNumber(gate.summary?.committed_vs_live_drift_count) !== 0) {
    failures.push('pre-execution gate reports committed-vs-live drift');
  }
  if (asNumber(gate.live_counts?.user_market_referenced_clean_candidates) !== 0) {
    failures.push('pre-execution gate reports user/market references in the 247 scope');
  }
  if (asNumber(gate.live_counts?.grey_felt_hat_in_247_scope) !== 0) {
    failures.push('pre-execution gate reports Grey Felt Hat in the 247 scope');
  }
  if (gate.write_boundary?.pass !== true) {
    failures.push('pre-execution gate did not pass write-boundary inspection');
  }
  const gateGeneratedAt = Date.parse(gate.generated_at ?? '');
  if (!Number.isFinite(gateGeneratedAt)) {
    failures.push('pre-execution gate generated_at is missing or invalid');
  } else if (Date.now() - gateGeneratedAt > MAX_GATE_AGE_MS) {
    failures.push('pre-execution gate is older than one hour; rerun the gate before execution');
  }

  assertCondition(failures.length === 0, 'Matrix validation failed before DB transaction.', failures);
  return candidates;
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

async function loadUserMarketReferences(client) {
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
      where ${quoteIdent(columnName)} in (
        select card_print_id from tmp_lane_a_247_approved
      )
    `;
    const { rows } = await client.query(countSql);
    inventory.push({
      table_name: tableName,
      column_name: columnName,
      table_available: true,
      reference_rows: asNumber(rows[0]?.reference_rows),
      referenced_candidate_rows: asNumber(rows[0]?.referenced_candidate_rows),
    });

    const detailSql = `
      select
        ${quoteIdent(columnName)}::text as card_print_id,
        count(*)::int as reference_rows
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(columnName)} in (
        select card_print_id from tmp_lane_a_247_approved
      )
      group by ${quoteIdent(columnName)}
      order by ${quoteIdent(columnName)}
    `;
    const { rows: detailRows } = await client.query(detailSql);
    for (const detail of detailRows) {
      if (!perCard.has(detail.card_print_id)) perCard.set(detail.card_print_id, []);
      perCard.get(detail.card_print_id).push({
        table_name: tableName,
        column_name: columnName,
        reference_rows: asNumber(detail.reference_rows),
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

async function insertApprovedRows(client, candidates) {
  await client.query(`
    create temp table tmp_lane_a_247_approved (
      card_print_id uuid primary key,
      set_id uuid not null,
      set_code text not null,
      set_name text not null,
      card_name text not null,
      approved_number text not null,
      approved_number_plain text not null,
      source_carriers text[] not null,
      source_external_ids text[] not null,
      expected_print_identity_key text,
      expected_gv_id text
    ) on commit drop
  `);

  const chunkSize = 50;
  for (let offset = 0; offset < candidates.length; offset += chunkSize) {
    const chunk = candidates.slice(offset, offset + chunkSize);
    const params = [];
    const values = chunk.map((row, index) => {
      const base = index * 11;
      params.push(
        row.card_print_id,
        row.set_id,
        row.set_code,
        row.set_name,
        row.card_name,
        row.approved_number,
        row.approved_number_plain,
        row.source_carriers,
        row.source_external_ids,
        row.current_print_identity_key,
        row.current_gv_id,
      );
      return `($${base + 1}::uuid, $${base + 2}::uuid, $${base + 3}::text, $${base + 4}::text, $${base + 5}::text, $${base + 6}::text, $${base + 7}::text, $${base + 8}::text[], $${base + 9}::text[], $${base + 10}::text, $${base + 11}::text)`;
    });
    await client.query(
      `
        insert into tmp_lane_a_247_approved (
          card_print_id,
          set_id,
          set_code,
          set_name,
          card_name,
          approved_number,
          approved_number_plain,
          source_carriers,
          source_external_ids,
          expected_print_identity_key,
          expected_gv_id
        )
        values ${values.join(',\n')}
      `,
      params,
    );
  }
}

async function scalarInt(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return asNumber(Object.values(rows[0] ?? {})[0]);
}

async function rowSet(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function loadRelatedHashes(client) {
  const hashQueries = {
    external_mappings: `
      select
        count(*)::int as row_count,
        md5(coalesce(jsonb_agg(payload order by order_key)::text, '[]')) as hash
      from (
        select to_jsonb(em) as payload, em.id::text as order_key
        from public.external_mappings em
        where em.card_print_id in (select card_print_id from tmp_lane_a_247_approved)
      ) q
    `,
    card_print_identity: `
      select
        count(*)::int as row_count,
        md5(coalesce(jsonb_agg(payload order by order_key)::text, '[]')) as hash
      from (
        select to_jsonb(cpi) as payload, cpi.id::text as order_key
        from public.card_print_identity cpi
        where cpi.card_print_id in (select card_print_id from tmp_lane_a_247_approved)
      ) q
    `,
    sets: `
      select
        count(*)::int as row_count,
        md5(coalesce(jsonb_agg(payload order by order_key)::text, '[]')) as hash
      from (
        select to_jsonb(s) as payload, s.id::text as order_key
        from public.sets s
        where s.id in (select distinct set_id from tmp_lane_a_247_approved)
      ) q
    `,
    raw_imports: `
      select
        count(*)::int as row_count,
        md5(coalesce(jsonb_agg(payload order by order_key)::text, '[]')) as hash
      from (
        select to_jsonb(ri) as payload, ri.id::text as order_key
        from public.raw_imports ri
        where ri.source = 'tcgdex'
          and ri.payload->>'_external_id' in (
            select unnest(source_external_ids) from tmp_lane_a_247_approved
          )
      ) q
    `,
  };

  const entries = [];
  for (const [name, sql] of Object.entries(hashQueries)) {
    const { rows } = await client.query(sql);
    entries.push([
      name,
      {
        row_count: asNumber(rows[0]?.row_count),
        hash: rows[0]?.hash ?? null,
      },
    ]);
  }
  return Object.fromEntries(entries);
}

async function loadNumberColumnSchema(client) {
  const { rows } = await client.query(`
    select column_name, is_generated, generation_expression
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'card_prints'
      and column_name in ('number', 'number_plain')
    order by column_name
  `);
  return rows.map((row) => ({
    column_name: row.column_name,
    is_generated: row.is_generated,
    generation_expression: row.generation_expression,
  }));
}

function assertNumberColumnSchema(schemaRows) {
  const byName = new Map(schemaRows.map((row) => [row.column_name, row]));
  const failures = [];
  if (byName.get('number')?.is_generated !== 'NEVER') {
    failures.push('card_prints.number must be a directly writable column');
  }
  if (byName.get('number_plain')?.is_generated !== 'ALWAYS') {
    failures.push('card_prints.number_plain must be a generated column');
  }
  const expression = byName.get('number_plain')?.generation_expression ?? '';
  if (!expression.includes('regexp_replace') || !expression.includes('number')) {
    failures.push('card_prints.number_plain generation expression is not the expected number-derived expression');
  }
  assertCondition(failures.length === 0, 'Number column schema guard failed. Transaction rolled back.', {
    failures,
    schema_rows: schemaRows,
  });
}

function compareHashes(before, after) {
  return Object.keys(before).map((name) => ({
    object: name,
    before_row_count: before[name].row_count,
    after_row_count: after[name].row_count,
    before_hash: before[name].hash,
    after_hash: after[name].hash,
    unchanged: before[name].row_count === after[name].row_count && before[name].hash === after[name].hash,
  }));
}

async function loadGuardEvidence(client) {
  const tempCount = await scalarInt(client, 'select count(*)::int from tmp_lane_a_247_approved');
  const targetRows = await scalarInt(
    client,
    `
      select count(*)::int
      from public.card_prints cp
      join tmp_lane_a_247_approved a on a.card_print_id = cp.id
    `,
  );
  const nonblankNumbers = await scalarInt(
    client,
    `
      select count(*)::int
      from public.card_prints cp
      join tmp_lane_a_247_approved a on a.card_print_id = cp.id
      where not (cp.number is null or btrim(cp.number) = '')
         or not (cp.number_plain is null or btrim(cp.number_plain) = '')
    `,
  );
  const setOrNameMismatches = await rowSet(
    client,
    `
      select
        a.card_print_id::text,
        a.set_code as expected_set_code,
        s.code as actual_set_code,
        a.card_name as expected_name,
        cp.name as actual_name
      from tmp_lane_a_247_approved a
      left join public.card_prints cp on cp.id = a.card_print_id
      left join public.sets s on s.id = cp.set_id
      where cp.id is null
         or cp.set_id is distinct from a.set_id
         or s.code is distinct from a.set_code
         or cp.name is distinct from a.card_name
      order by a.set_code, a.approved_number::int, a.card_name
    `,
  );
  const identityMismatches = await rowSet(
    client,
    `
      select
        a.card_print_id::text,
        a.expected_print_identity_key,
        cp.print_identity_key as actual_print_identity_key,
        a.expected_gv_id,
        cp.gv_id as actual_gv_id
      from tmp_lane_a_247_approved a
      join public.card_prints cp on cp.id = a.card_print_id
      where cp.print_identity_key is distinct from a.expected_print_identity_key
         or cp.gv_id is distinct from a.expected_gv_id
      order by a.set_code, a.approved_number::int, a.card_name
    `,
  );
  const sourceMismatches = await rowSet(
    client,
    `
      select
        a.card_print_id::text,
        a.source_external_ids,
        cp.external_ids->>'tcgdex' as card_print_tcgdex_id
      from tmp_lane_a_247_approved a
      join public.card_prints cp on cp.id = a.card_print_id
      where not (
        cp.external_ids->>'tcgdex' = any(a.source_external_ids)
        and exists (
          select 1
          from public.external_mappings em
          where em.card_print_id = cp.id
            and em.source = 'tcgdex'
            and em.active = true
            and em.external_id = any(a.source_external_ids)
        )
      )
      order by a.set_code, a.approved_number::int, a.card_name
    `,
  );
  const duplicateApprovedNumbers = await rowSet(
    client,
    `
      select set_code, approved_number, count(*)::int as row_count
      from tmp_lane_a_247_approved
      group by set_code, approved_number
      having count(*) > 1
      order by set_code, approved_number
    `,
  );
  const existingNumberCollisions = await rowSet(
    client,
    `
      select
        a.card_print_id::text as candidate_card_print_id,
        cp2.id::text as colliding_card_print_id,
        a.set_code,
        a.approved_number,
        cp2.name as colliding_name,
        cp2.number as colliding_number,
        cp2.number_plain as colliding_number_plain
      from tmp_lane_a_247_approved a
      join public.card_prints cp2
        on cp2.set_id = a.set_id
       and cp2.id <> a.card_print_id
       and (
        btrim(coalesce(cp2.number, '')) = a.approved_number
        or btrim(coalesce(cp2.number_plain, '')) = a.approved_number_plain
       )
      order by a.set_code, a.approved_number::int, a.card_name
      limit 50
    `,
  );
  const activeIdentityConflicts = await rowSet(
    client,
    `
      select
        a.card_print_id::text as candidate_card_print_id,
        cpi.card_print_id::text as conflicting_card_print_id,
        a.set_code,
        a.approved_number,
        cpi.identity_key_hash
      from tmp_lane_a_247_approved a
      join public.card_print_identity cpi
        on cpi.is_active = true
       and cpi.card_print_id <> a.card_print_id
       and cpi.set_code_identity = a.set_code
       and cpi.printed_number = a.approved_number
      order by a.set_code, a.approved_number::int, a.card_name
      limit 50
    `,
  );
  const excludedScopeRows = await rowSet(
    client,
    `
      select card_print_id::text, set_code, card_name, approved_number
      from tmp_lane_a_247_approved
      where card_print_id = $1::uuid
         or set_code = 'me01'
         or set_code = any($2::text[])
         or set_code = any($3::text[])
      order by set_code, approved_number::int, card_name
    `,
    [GREY_FELT_HAT_CARD_PRINT_ID, HARD_STOP_CODES, REVIEW_STOP_CODES],
  );
  const userMarketReferences = await loadUserMarketReferences(client);

  return {
    temp_count: tempCount,
    target_rows: targetRows,
    nonblank_number_rows: nonblankNumbers,
    set_or_name_mismatches: setOrNameMismatches,
    identity_mismatches: identityMismatches,
    source_mismatches: sourceMismatches,
    duplicate_approved_numbers: duplicateApprovedNumbers,
    existing_number_collisions: existingNumberCollisions,
    active_identity_conflicts: activeIdentityConflicts,
    excluded_scope_rows: excludedScopeRows,
    user_market_references: userMarketReferences,
  };
}

function assertGuardEvidence(guards) {
  const failures = [];
  if (guards.temp_count !== EXPECTED_ROW_COUNT) failures.push(`temp approved row count is ${guards.temp_count}`);
  if (guards.target_rows !== EXPECTED_ROW_COUNT) failures.push(`target row count is ${guards.target_rows}`);
  if (guards.nonblank_number_rows !== 0) failures.push(`${guards.nonblank_number_rows} target row(s) already have number or number_plain`);
  if (guards.set_or_name_mismatches.length !== 0) failures.push(`${guards.set_or_name_mismatches.length} target row(s) mismatch set or name evidence`);
  if (guards.identity_mismatches.length !== 0) failures.push(`${guards.identity_mismatches.length} target row(s) mismatch identity/gv evidence`);
  if (guards.source_mismatches.length !== 0) failures.push(`${guards.source_mismatches.length} target row(s) mismatch tcgdex source evidence`);
  if (guards.duplicate_approved_numbers.length !== 0) failures.push(`${guards.duplicate_approved_numbers.length} duplicate approved set/number group(s) in target scope`);
  if (guards.existing_number_collisions.length !== 0) failures.push(`${guards.existing_number_collisions.length} existing set-number collision(s) in target scope`);
  if (guards.active_identity_conflicts.length !== 0) failures.push(`${guards.active_identity_conflicts.length} active identity conflict(s) in target scope`);
  if (guards.excluded_scope_rows.length !== 0) failures.push(`${guards.excluded_scope_rows.length} excluded hard/review/me01/Grey row(s) in target scope`);
  if (guards.user_market_references.per_card.length !== 0) failures.push(`${guards.user_market_references.per_card.length} target row(s) have user/market references`);

  assertCondition(failures.length === 0, 'Pre-write transaction guard failed. Transaction rolled back.', {
    failures,
    guard_evidence: guards,
  });
}

async function executeUpdate(client) {
  const { rows } = await client.query(`
    update public.card_prints cp
    set
      number = a.approved_number
    from tmp_lane_a_247_approved a
    where cp.id = a.card_print_id
      and (cp.number is null or btrim(cp.number) = '')
      and (cp.number_plain is null or btrim(cp.number_plain) = '')
    returning
      cp.id::text as card_print_id,
      a.set_code,
      a.set_name,
      cp.name as card_name,
      cp.number,
      cp.number_plain
  `);
  return rows.sort((a, b) => (
    a.set_code.localeCompare(b.set_code) ||
    Number(a.number) - Number(b.number) ||
    a.card_name.localeCompare(b.card_name)
  ));
}

async function loadPostWriteEvidence(client) {
  const exactMatches = await scalarInt(
    client,
    `
      select count(*)::int
      from public.card_prints cp
      join tmp_lane_a_247_approved a on a.card_print_id = cp.id
      where cp.number = a.approved_number
        and cp.number_plain = a.approved_number_plain
    `,
  );
  const nonNumberColumnChanges = await rowSet(
    client,
    `
      select cp.id::text as card_print_id
      from public.card_prints cp
      join tmp_lane_a_247_card_prints_before b on b.id = cp.id
      where (to_jsonb(cp) - 'number' - 'number_plain')
        is distinct from
        (to_jsonb(b) - 'number' - 'number_plain')
      order by cp.id
      limit 50
    `,
  );
  const beforeAfterRows = await rowSet(
    client,
    `
      select
        a.card_print_id::text,
        a.set_code,
        a.set_name,
        a.card_name,
        b.number as before_number,
        b.number_plain as before_number_plain,
        cp.number as after_number,
        cp.number_plain as after_number_plain
      from tmp_lane_a_247_approved a
      join tmp_lane_a_247_card_prints_before b on b.id = a.card_print_id
      join public.card_prints cp on cp.id = a.card_print_id
      order by a.set_code, a.approved_number::int, a.card_name
    `,
  );
  const greyFeltHatChanged = await scalarInt(
    client,
    `
      select count(*)::int
      from public.card_prints cp
      join tmp_lane_a_247_grey_felt_hat_before b on b.id = cp.id
      where to_jsonb(cp) is distinct from to_jsonb(b)
    `,
  );
  const postCollisionRows = await rowSet(
    client,
    `
      select
        a.card_print_id::text as candidate_card_print_id,
        cp2.id::text as colliding_card_print_id,
        a.set_code,
        a.approved_number
      from tmp_lane_a_247_approved a
      join public.card_prints cp2
        on cp2.set_id = a.set_id
       and cp2.id <> a.card_print_id
       and (
        btrim(coalesce(cp2.number, '')) = a.approved_number
        or btrim(coalesce(cp2.number_plain, '')) = a.approved_number_plain
       )
      order by a.set_code, a.approved_number::int, a.card_name
      limit 50
    `,
  );

  return {
    exact_matches: exactMatches,
    non_number_column_changes: nonNumberColumnChanges,
    before_after_rows: beforeAfterRows,
    grey_felt_hat_changed_rows: greyFeltHatChanged,
    post_collision_rows: postCollisionRows,
  };
}

function assertPostWriteEvidence(postEvidence, relatedHashComparison) {
  const failures = [];
  if (postEvidence.exact_matches !== EXPECTED_ROW_COUNT) failures.push(`post-write exact match count is ${postEvidence.exact_matches}`);
  if (postEvidence.non_number_column_changes.length !== 0) failures.push(`${postEvidence.non_number_column_changes.length} target row(s) changed outside number/number_plain`);
  if (postEvidence.grey_felt_hat_changed_rows !== 0) failures.push('Grey Felt Hat row changed');
  if (postEvidence.post_collision_rows.length !== 0) failures.push(`${postEvidence.post_collision_rows.length} post-write set-number collision(s) found`);
  const changedRelated = relatedHashComparison.filter((row) => !row.unchanged);
  if (changedRelated.length !== 0) failures.push(`${changedRelated.length} related non-target object hash(es) changed`);

  assertCondition(failures.length === 0, 'Post-write verification failed. Transaction rolled back.', {
    failures,
    post_write_evidence: postEvidence,
    related_hash_comparison: relatedHashComparison,
  });
}

function renderMarkdown(matrix) {
  const lines = [];
  lines.push('# Lane A 247 Number Normalization Execution - 2026-05-17');
  lines.push('');
  lines.push(`Status: \`${matrix.status}\`.`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('Executed the approved Lane A number-normalization transaction for 247 collision-free, unreferenced Pokemon card print rows.');
  lines.push('');
  lines.push('Only these columns were explicitly updated:');
  lines.push('');
  lines.push('- `public.card_prints.number`');
  lines.push('');
  lines.push('`public.card_prints.number_plain` is a generated column. It was not explicitly assigned; post-write verification proves it derived to the approved `number_plain` value for all 247 rows.');
  lines.push('');
  lines.push('Only these `public.card_prints` columns changed:');
  lines.push('');
  lines.push('- `public.card_prints.number`');
  lines.push('- `public.card_prints.number_plain`');
  lines.push('');
  lines.push('No card movement, set creation, set deletion, alias deletion, metadata merge, external mapping movement, raw import mutation, identity mutation, missing-card backfill, variant write, migration, or schema change was performed.');
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(renderTable(
    ['Check', 'Result'],
    [
      ['Committed matrix rows', matrix.summary.committed_candidate_rows],
      ['Fresh pre-execution gate status', matrix.pre_execution_gate.status],
      ['Updated rows', matrix.summary.updated_rows],
      ['Post-write exact matches', matrix.summary.post_write_exact_matches],
      ['Non-number target column changes', matrix.summary.non_number_column_changes],
      ['Grey Felt Hat changed rows', matrix.summary.grey_felt_hat_changed_rows],
      ['Post-write collision rows', matrix.summary.post_write_collision_rows],
      ['User/market referenced target rows', matrix.summary.user_market_referenced_target_rows],
      ['Related object hashes changed', matrix.summary.related_object_hashes_changed],
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
      row.updated_rows,
      `${row.min_number}-${row.max_number}`,
    ]),
  ));
  lines.push('');
  lines.push('## Related Object Hashes');
  lines.push('');
  lines.push(renderTable(
    ['Object', 'Before rows', 'After rows', 'Unchanged'],
    matrix.related_hash_comparison.map((row) => [
      row.object,
      row.before_row_count,
      row.after_row_count,
      row.unchanged,
    ]),
  ));
  lines.push('');
  lines.push('## Rollback Note');
  lines.push('');
  lines.push('The transaction committed after all guards passed. If a future rollback is explicitly required, use the `before_after_rows` evidence in `number_normalization_lane_a_247_execution_matrix_20260517.json` to restore only `number` for these exact 247 `card_print_id` values, then verify generated `number_plain` and rerun the same post-write collision/reference checks.');
  lines.push('');
  lines.push('## Confirmation');
  lines.push('');
  lines.push('- Supabase write executed: yes, exactly 247 `card_prints` rows.');
  lines.push('- Migrations: none.');
  lines.push('- Schema changes: none.');
  lines.push('- Card movement: none.');
  lines.push('- Set changes: none.');
  lines.push('- External mapping changes: none.');
  lines.push('- Raw import changes: none.');
  lines.push('- Identity row changes: none.');
  lines.push('- Variant changes: none.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const committed = JSON.parse(await fs.readFile(WRITE_MATRIX_PATH, 'utf8'));
  const gate = JSON.parse(await fs.readFile(GATE_MATRIX_PATH, 'utf8'));
  const candidates = validateApprovedMatrix(committed, gate);

  const client = new pg.Client({
    connectionString,
    application_name: 'number_normalization_lane_a_247_execute_v1',
    statement_timeout: 120000,
  });

  const startedAt = new Date().toISOString();
  let committedTransaction = false;
  let matrix;

  await client.connect();
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '10s'");
    await client.query("set local statement_timeout = '120s'");

    const numberColumnSchema = await loadNumberColumnSchema(client);
    assertNumberColumnSchema(numberColumnSchema);
    await insertApprovedRows(client, candidates);
    await client.query(`
      create temp table tmp_lane_a_247_card_prints_before on commit drop as
      select cp.*
      from public.card_prints cp
      join tmp_lane_a_247_approved a on a.card_print_id = cp.id
    `);
    await client.query(
      `
        create temp table tmp_lane_a_247_grey_felt_hat_before on commit drop as
        select cp.*
        from public.card_prints cp
        where cp.id = $1::uuid
      `,
      [GREY_FELT_HAT_CARD_PRINT_ID],
    );
    await client.query(`
      select cp.id
      from public.card_prints cp
      join tmp_lane_a_247_approved a on a.card_print_id = cp.id
      for update of cp
    `);

    const guardEvidence = await loadGuardEvidence(client);
    assertGuardEvidence(guardEvidence);
    const relatedHashesBefore = await loadRelatedHashes(client);
    const updatedRows = await executeUpdate(client);
    assertCondition(updatedRows.length === EXPECTED_ROW_COUNT, `Update returned ${updatedRows.length} rows, expected ${EXPECTED_ROW_COUNT}.`);
    const relatedHashesAfter = await loadRelatedHashes(client);
    const relatedHashComparison = compareHashes(relatedHashesBefore, relatedHashesAfter);
    const postWriteEvidence = await loadPostWriteEvidence(client);
    assertPostWriteEvidence(postWriteEvidence, relatedHashComparison);

    matrix = {
      status: 'EXECUTED_COMMITTED',
      generated_at: new Date().toISOString(),
      started_at: startedAt,
      source: 'live Supabase guarded transaction',
      scope: {
        lane: 'Lane A 247 collision-free unreferenced number normalization',
        explicit_update_table: 'public.card_prints',
        explicit_update_columns: ['number'],
        generated_columns_verified: ['number_plain'],
        changed_card_print_columns_allowed: ['number', 'number_plain'],
        excluded_grey_felt_hat_card_print_id: GREY_FELT_HAT_CARD_PRINT_ID,
        excluded_hard_stop_codes: HARD_STOP_CODES,
        excluded_review_stop_codes: REVIEW_STOP_CODES,
        excluded_me01: true,
      },
      pre_execution_gate: {
        status: gate.status,
        generated_at: gate.generated_at,
        committed_vs_live_drift_count: gate.summary?.committed_vs_live_drift_count ?? null,
        user_market_referenced_clean_candidates: gate.live_counts?.user_market_referenced_clean_candidates ?? null,
        write_boundary_pass: gate.write_boundary?.pass ?? null,
      },
      summary: {
        committed_candidate_rows: candidates.length,
        updated_rows: updatedRows.length,
        post_write_exact_matches: postWriteEvidence.exact_matches,
        non_number_column_changes: postWriteEvidence.non_number_column_changes.length,
        grey_felt_hat_changed_rows: postWriteEvidence.grey_felt_hat_changed_rows,
        post_write_collision_rows: postWriteEvidence.post_collision_rows.length,
        user_market_referenced_target_rows: guardEvidence.user_market_references.per_card.length,
        related_object_hashes_changed: relatedHashComparison.filter((row) => !row.unchanged).length,
      },
      number_column_schema: numberColumnSchema,
      set_breakdown: buildSetBreakdown(candidates),
      guard_evidence: {
        temp_count: guardEvidence.temp_count,
        target_rows: guardEvidence.target_rows,
        nonblank_number_rows: guardEvidence.nonblank_number_rows,
        set_or_name_mismatches: guardEvidence.set_or_name_mismatches,
        identity_mismatches: guardEvidence.identity_mismatches,
        source_mismatches: guardEvidence.source_mismatches,
        duplicate_approved_numbers: guardEvidence.duplicate_approved_numbers,
        existing_number_collisions: guardEvidence.existing_number_collisions,
        active_identity_conflicts: guardEvidence.active_identity_conflicts,
        excluded_scope_rows: guardEvidence.excluded_scope_rows,
        user_market_reference_inventory: guardEvidence.user_market_references.inventory,
        user_market_referenced_target_rows: guardEvidence.user_market_references.per_card,
      },
      related_hash_comparison: relatedHashComparison,
      updated_rows: updatedRows,
      before_after_rows: postWriteEvidence.before_after_rows,
      no_migration_confirmation: true,
      no_schema_change_confirmation: true,
      no_external_mapping_change_confirmation: relatedHashComparison.find((row) => row.object === 'external_mappings')?.unchanged === true,
      no_raw_import_change_confirmation: relatedHashComparison.find((row) => row.object === 'raw_imports')?.unchanged === true,
      no_set_change_confirmation: relatedHashComparison.find((row) => row.object === 'sets')?.unchanged === true,
      no_identity_change_confirmation: relatedHashComparison.find((row) => row.object === 'card_print_identity')?.unchanged === true,
    };

    await client.query('commit');
    committedTransaction = true;
  } catch (error) {
    if (!committedTransaction) {
      try {
        await client.query('rollback');
      } catch {
        // Preserve the original error.
      }
    }
    throw error;
  } finally {
    await client.end();
  }

  await fs.writeFile(EXECUTION_MATRIX_PATH, JSON.stringify(matrix, null, 2) + '\n');
  await fs.writeFile(EXECUTION_REPORT_PATH, renderMarkdown(matrix));

  console.log(JSON.stringify({
    status: matrix.status,
    updated_rows: matrix.summary.updated_rows,
    post_write_exact_matches: matrix.summary.post_write_exact_matches,
    non_number_column_changes: matrix.summary.non_number_column_changes,
    grey_felt_hat_changed_rows: matrix.summary.grey_felt_hat_changed_rows,
    post_write_collision_rows: matrix.summary.post_write_collision_rows,
    related_object_hashes_changed: matrix.summary.related_object_hashes_changed,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  if (error.detail) console.error(JSON.stringify(error.detail, null, 2));
  process.exitCode = 1;
});
