import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'master_index_world_championship_decks_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const SOURCE_SUMMARY = path.join(AUDIT_DIR, 'world_championship_decks_09c_translation_dry_run_summary_v1.json');
const PROPOSED_SETS = path.join(AUDIT_DIR, 'world_championship_decks_09c_proposed_sets_v1.jsonl');
const PROPOSED_CARDS = path.join(AUDIT_DIR, 'world_championship_decks_09c_proposed_card_prints_v1.jsonl');
const SQL_PATH = path.join(SQL_DIR, 'world_championship_decks_09d_rollback_sql_dry_run_v1.sql');
const SUMMARY_JSON = path.join(AUDIT_DIR, 'world_championship_decks_09d_rollback_sql_dry_run_summary_v1.json');
const SUMMARY_MD = path.join(AUDIT_DIR, 'world_championship_decks_09d_rollback_sql_dry_run_summary_v1.md');
const PACKAGE_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-09D-ROLLBACK-SQL-DRY-RUN';
const APPLY_ID = 'MASTER-INDEX-WORLD-CHAMPIONSHIP-DECKS-V1';

function dbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonl(file) {
  const text = await fs.readFile(file, 'utf8');
  return text.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function dollarJson(value) {
  return `$grookai_json$${JSON.stringify(value)}$grookai_json$`;
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlArray(values) {
  return `array[${values.map(sqlQuote).join(', ')}]`;
}

function buildSql({ sourceSummary, sets, cards, fingerprint }) {
  const sqlSetPayload = sets.map((row) => ({
    code: row.proposed_set_code,
    name: row.proposed_set_name,
    year: row.year,
    deck_name: row.deck_name,
    player_name: row.player_name,
    printed_total: row.printed_total,
    decklist_total_card_quantity: row.decklist_total_card_quantity,
    source_url: row.source_url,
    source_index_url: row.source_index_url,
    lane_explanation: row.lane_explanation,
  }));
  const sqlCardPayload = cards.map((row) => ({
    gv_id: row.proposed_gv_id,
    set_code: row.proposed_set_code,
    name: row.name,
    number: row.number,
    variant_key: row.variant_key,
    rarity: row.rarity,
    source_set_name: row.source_set_name,
    source_card_number: row.source_card_number,
    source_card_reference_kind: row.source_card_reference_kind,
    source_card_print_id: row.source_card_print_id,
    source_card_print_gv_id: row.source_card_print_gv_id,
    deck_year: row.deck_year,
    deck_name: row.deck_name,
    player_name: row.player_name,
    deck_quantity: row.deck_quantity,
    source_url: row.source_url,
    image_note: row.image_note,
  }));

  return `-- ${PACKAGE_ID}
-- Apply family: ${APPLY_ID}
-- Scope: rollback-only proof for 80 World Championship Deck set lanes and 1,944 card_print parent identity rows.
-- No durable writes are allowed from this artifact.

begin;

do $$
declare
  v_existing_sets integer;
  v_existing_gv_ids integer;
begin
  select count(*)::int
  into v_existing_sets
  from public.sets
  where code = any(${sqlArray(sets.map((row) => row.proposed_set_code))});

  if v_existing_sets <> 0 then
    raise exception '${PACKAGE_ID}: proposed set code collisions found: %', v_existing_sets;
  end if;

  select count(*)::int
  into v_existing_gv_ids
  from public.card_prints
  where gv_id = any(${sqlArray(cards.map((row) => row.proposed_gv_id))});

  if v_existing_gv_ids <> 0 then
    raise exception '${PACKAGE_ID}: proposed gv_id collisions found: %', v_existing_gv_ids;
  end if;
end $$;

with proposed_sets as (
  select *
  from jsonb_to_recordset(${dollarJson(sqlSetPayload)}::jsonb) as x(
    code text,
    name text,
    year integer,
    deck_name text,
    player_name text,
    printed_total integer,
    decklist_total_card_quantity integer,
    source_url text,
    source_index_url text,
    lane_explanation text
  )
),
inserted_sets as (
  insert into public.sets (
    game,
    code,
    name,
    release_date,
    source,
    printed_total,
    printed_set_abbrev,
    set_role,
    identity_domain_default,
    identity_model
  )
  select
    'pokemon',
    ps.code,
    ps.name,
    null,
    jsonb_build_object(
      'grookai',
      jsonb_build_object(
        'package_id', '${PACKAGE_ID}',
        'apply_family', '${APPLY_ID}',
        'source_acquisition_fingerprint', '${sourceSummary.source_acquisition_fingerprint}',
        'translation_fingerprint', '${sourceSummary.fingerprint}',
        'rollback_sql_fingerprint', '${fingerprint}',
        'source_url', ps.source_url,
        'source_index_url', ps.source_index_url,
        'deck_year', ps.year,
        'deck_name', ps.deck_name,
        'player_name', ps.player_name,
        'lane_explanation', ps.lane_explanation
      )
    ),
    ps.printed_total,
    'WCD' || ps.year::text,
    'promotion_umbrella',
    'pokemon_eng_standard',
    'reprint_anthology'
  from proposed_sets ps
  returning id, code
),
proposed_cards as (
  select *
  from jsonb_to_recordset(${dollarJson(sqlCardPayload)}::jsonb) as x(
    gv_id text,
    set_code text,
    name text,
    number text,
    variant_key text,
    rarity text,
    source_set_name text,
    source_card_number text,
    source_card_reference_kind text,
    source_card_print_id text,
    source_card_print_gv_id text,
    deck_year integer,
    deck_name text,
    player_name text,
    deck_quantity integer,
    source_url text,
    image_note text
  )
),
inserted_card_prints as (
  insert into public.card_prints (
    set_id,
    name,
    number,
    variant_key,
    rarity,
    image_url,
    tcgplayer_id,
    external_ids,
    set_code,
    artist,
    regulation_mark,
    image_alt_url,
    image_source,
    variants,
    print_identity_key,
    ai_metadata,
    image_hash,
    data_quality_flags,
    image_status,
    image_res,
    image_last_checked_at,
    printed_set_abbrev,
    printed_total,
    gv_id,
    image_path,
    identity_domain,
    printed_identity_modifier,
    set_identity_model,
    representative_image_url,
    image_note
  )
  select
    inserted_sets.id,
    pc.name,
    pc.number,
    pc.variant_key,
    pc.rarity,
    null,
    null,
    jsonb_build_object(
      'grookai',
      jsonb_build_object(
        'package_id', '${PACKAGE_ID}',
        'apply_family', '${APPLY_ID}',
        'source_set_name', pc.source_set_name,
        'source_card_number', pc.source_card_number,
        'source_card_reference_kind', pc.source_card_reference_kind,
        'source_card_print_id', pc.source_card_print_id,
        'source_card_print_gv_id', pc.source_card_print_gv_id,
        'deck_year', pc.deck_year,
        'deck_name', pc.deck_name,
        'player_name', pc.player_name,
        'deck_quantity', pc.deck_quantity,
        'source_url', pc.source_url
      )
    ),
    pc.set_code,
    null,
    null,
    null,
    null,
    null,
    pc.set_code || ':' || pc.gv_id,
    jsonb_build_object(
      'package_id', '${PACKAGE_ID}',
      'apply_family', '${APPLY_ID}',
      'world_championship_deck_replica', true,
      'exact_image_claim_allowed', false
    ),
    null,
    jsonb_build_object(
      'source_image_truth', 'exact_world_championship_deck_image_not_cataloged',
      'ordinary_expansion_image_must_not_be_claimed_exact', true
    ),
    'missing',
    null,
    null,
    'WCD' || pc.deck_year::text,
    ps.printed_total,
    pc.gv_id,
    null,
    'pokemon_eng_standard',
    pc.deck_year::text || ' World Championships Deck: ' || pc.deck_name,
    'reprint_anthology',
    null,
    pc.image_note
  from proposed_cards pc
  join inserted_sets on inserted_sets.code = pc.set_code
  join proposed_sets ps on ps.code = pc.set_code
  returning id, set_code, gv_id, image_status, image_source
),
forbidden_rows as (
  select count(*)::int as forbidden_count
  from inserted_card_prints
  where image_status <> 'missing'
     or image_source is not null
),
proof as (
  select
    '${PACKAGE_ID}'::text as package_id,
    '${APPLY_ID}'::text as apply_family,
    '${fingerprint}'::text as rollback_sql_fingerprint,
    '${sourceSummary.source_acquisition_fingerprint}'::text as source_acquisition_fingerprint,
    '${sourceSummary.fingerprint}'::text as translation_fingerprint,
    (select count(*)::int from inserted_sets) as inserted_set_rows,
    (select count(*)::int from inserted_card_prints) as inserted_card_print_rows,
    (select forbidden_count from forbidden_rows) as forbidden_rows,
    (select count(distinct set_code)::int from inserted_card_prints) as card_print_set_count
)
select * from proof;

rollback;
`;
}

function validateSql(sql) {
  const stripped = sql.replace(/--.*$/gm, '');
  const findings = [];
  if (!/(^|\n)\s*begin\s*;/i.test(stripped)) findings.push('missing_begin');
  if (!/(^|\n)\s*rollback\s*;/i.test(stripped)) findings.push('missing_rollback');
  if (/(^|\n)\s*commit\s*;/i.test(stripped)) findings.push('contains_commit');
  if (/\bdelete\s+from\b/i.test(stripped)) findings.push('contains_delete');
  if (/\bupdate\s+public\./i.test(stripped)) findings.push('contains_update_public');
  if (/\bcard_printings\b/i.test(stripped)) findings.push('contains_child_table_card_printings');
  if (/\bprice_/i.test(stripped) || /\bcard_prices\b/i.test(stripped)) findings.push('contains_price_surface');
  if (!/\binsert\s+into\s+public\.sets\b/i.test(stripped)) findings.push('missing_sets_insert');
  if (!/\binsert\s+into\s+public\.card_prints\b/i.test(stripped)) findings.push('missing_card_prints_insert');
  return findings;
}

async function captureSnapshot(client, setCodes, gvIds) {
  const [sets, cards] = await Promise.all([
    client.query('select code, name from public.sets where code = any($1::text[]) order by code', [setCodes]),
    client.query('select gv_id, set_code from public.card_prints where gv_id = any($1::text[]) order by gv_id', [gvIds]),
  ]);
  const rows = { sets: sets.rows, card_prints: cards.rows };
  return {
    hash_sha256: sha256(stableJson(rows)),
    set_rows: sets.rows.length,
    card_print_rows: cards.rows.length,
  };
}

async function executeRollbackDryRun(sql, sets, cards) {
  const connectionString = dbUrl();
  if (!connectionString) {
    return {
      connected: false,
      execution_status: 'blocked_no_database_connection_string',
      error_message: 'Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.',
      before_snapshot: null,
      after_snapshot: null,
      proof_rows: [],
    };
  }
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const setCodes = sets.map((row) => row.proposed_set_code);
    const gvIds = cards.map((row) => row.proposed_gv_id);
    const beforeSnapshot = await captureSnapshot(client, setCodes, gvIds);
    let executionStatus = 'guarded_dry_run_transaction_completed_and_rolled_back';
    let errorMessage = null;
    let proofRows = [];
    try {
      const result = await client.query(sql);
      const resultSets = Array.isArray(result) ? result : [result];
      proofRows = resultSets.flatMap((entry) => entry.rows ?? []).filter((row) => row.package_id === PACKAGE_ID);
    } catch (error) {
      executionStatus = 'guarded_dry_run_transaction_failed';
      errorMessage = error instanceof Error ? error.message : String(error);
      await client.query('rollback').catch(() => {});
    }
    const afterSnapshot = await captureSnapshot(client, setCodes, gvIds);
    return {
      connected: true,
      execution_status: executionStatus,
      error_message: errorMessage,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_rows: proofRows,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function evaluate({ sqlFindings, execution, sets, cards }) {
  const findings = [...sqlFindings];
  const proof = execution.proof_rows?.[0] ?? null;
  if (!execution.connected) findings.push('database_connection_unavailable');
  if (execution.execution_status !== 'guarded_dry_run_transaction_completed_and_rolled_back') findings.push('dry_run_transaction_did_not_complete');
  if (execution.error_message) findings.push('dry_run_error_message_present');
  if (execution.before_snapshot?.hash_sha256 !== execution.after_snapshot?.hash_sha256) findings.push('rollback_snapshot_hash_mismatch');
  if (!proof) findings.push('proof_row_missing');
  if (proof) {
    if (Number(proof.inserted_set_rows) !== sets.length) findings.push('proof_set_row_count_mismatch');
    if (Number(proof.inserted_card_print_rows) !== cards.length) findings.push('proof_card_print_row_count_mismatch');
    if (Number(proof.card_print_set_count) !== sets.length) findings.push('proof_card_print_set_count_mismatch');
    if (Number(proof.forbidden_rows) !== 0) findings.push('proof_forbidden_rows_present');
  }
  return findings;
}

function renderMarkdown(summary) {
  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- SQL hash: \`${summary.sql_hash_sha256}\`
- Rollback SQL fingerprint: \`${summary.rollback_sql_fingerprint}\`
- Source WH09B fingerprint: \`${summary.source_acquisition_fingerprint}\`
- Translation WH09C fingerprint: \`${summary.translation_fingerprint}\`
- Execution status: ${summary.execution.execution_status}
- Rollback proof: \`${summary.execution.before_snapshot?.hash_sha256 ?? 'missing'} == ${summary.execution.after_snapshot?.hash_sha256 ?? 'missing'}\`
- Proof inserted set rows: ${summary.proof_row?.inserted_set_rows ?? 'missing'}
- Proof inserted card_print rows: ${summary.proof_row?.inserted_card_print_rows ?? 'missing'}
- Proof forbidden rows: ${summary.proof_row?.forbidden_rows ?? 'missing'}
- Write ready now: ${summary.write_ready_now}
- Durable DB writes performed: ${summary.durable_db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## Stop Findings

${summary.stop_findings.length ? summary.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._'}

## Required Real Apply Approval

\`${summary.required_real_apply_approval_text}\`

## SQL Artifact

\`${summary.sql_path}\`
`;
}

async function main() {
  const [translationSummary, sets, cards] = await Promise.all([
    readJson(SOURCE_SUMMARY),
    readJsonl(PROPOSED_SETS),
    readJsonl(PROPOSED_CARDS),
  ]);
  const fingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_acquisition_fingerprint: translationSummary.source_acquisition_fingerprint,
    translation_fingerprint: translationSummary.fingerprint,
    proposed_sets: sets.map((row) => ({
      code: row.proposed_set_code,
      name: row.proposed_set_name,
      printed_total: row.printed_total,
      identity_model: 'reprint_anthology',
      set_role: 'promotion_umbrella',
    })),
    proposed_cards: cards.map((row) => ({
      gv_id: row.proposed_gv_id,
      set_code: row.proposed_set_code,
      name: row.name,
      number: row.number,
      variant_key: row.variant_key,
      set_identity_model: 'reprint_anthology',
      image_status: 'missing',
      exact_image_claim_allowed: false,
    })),
  }));
  const sql = buildSql({ sourceSummary: translationSummary, sets, cards, fingerprint });
  const sqlHash = sha256(sql);
  const sqlFindings = validateSql(sql);
  await fs.mkdir(SQL_DIR, { recursive: true });
  await fs.writeFile(SQL_PATH, sql, 'utf8');

  const execution = await executeRollbackDryRun(sql, sets, cards);
  const stopFindings = evaluate({ sqlFindings, execution, sets, cards });
  const beforeHash = execution.before_snapshot?.hash_sha256 ?? 'missing';
  const afterHash = execution.after_snapshot?.hash_sha256 ?? 'missing';
  const requiredApprovalText = [
    `Approve real ${APPLY_ID} apply only.`,
    `Fingerprint: ${fingerprint}.`,
    `SQL hash: ${sqlHash}.`,
    `Scope: 80 World Championship Deck derived set lane inserts and 1,944 card_print parent identity inserts only.`,
    `Dry-run proof: ${beforeHash} == ${afterHash}.`,
    'No child writes. No identity-table writes. No external mapping writes. No price writes. No storage writes. No deletes. No merges. No migrations. No exact image claims. No global apply.',
  ].join(' ');
  const summary = {
    package_id: PACKAGE_ID,
    apply_family: APPLY_ID,
    generated_at: new Date().toISOString(),
    sql_path: path.relative(ROOT, SQL_PATH),
    sql_hash_sha256: sqlHash,
    rollback_sql_fingerprint: fingerprint,
    source_acquisition_fingerprint: translationSummary.source_acquisition_fingerprint,
    translation_fingerprint: translationSummary.fingerprint,
    proposed_set_rows: sets.length,
    proposed_card_print_rows: cards.length,
    execution,
    proof_row: execution.proof_rows?.[0] ?? null,
    required_real_apply_approval_text: requiredApprovalText,
    write_ready_now: stopFindings.length === 0,
    durable_db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    real_apply_authorized: false,
    stop_findings: stopFindings,
  };
  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    write_ready_now: summary.write_ready_now,
    execution_status: execution.execution_status,
    inserted_set_rows: summary.proof_row?.inserted_set_rows ?? null,
    inserted_card_print_rows: summary.proof_row?.inserted_card_print_rows ?? null,
    forbidden_rows: summary.proof_row?.forbidden_rows ?? null,
    sql_hash_sha256: sqlHash,
    fingerprint,
    stop_findings: stopFindings,
    summary_md: path.relative(ROOT, SUMMARY_MD),
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
