import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const SOURCE_READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_missing_set_insert_readiness_v1.json');
const CARDS_JSON = path.join(AUDIT_DIR, 'english_master_index_cards_v1.json');
const PRINTINGS_JSON = path.join(AUDIT_DIR, 'english_master_index_printings_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg05a_final_snapshot_transaction_artifact_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg05a_final_snapshot_transaction_artifact_v1.md');
const OUTPUT_SQL = path.join(SQL_DIR, 'english_master_index_pkg05a_missing_set_inserts_guarded_dry_run_transaction_v1.sql');

const PACKAGE_ID = 'PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS';
const CREATED_BY = 'pkg05a_missing_set_insert_dry_run_artifact_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function uuid() {
  return crypto.randomUUID();
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value ?? {}))}::jsonb`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');
}

function factKey(setKey, number, name) {
  return [normalizeText(setKey), normalizeNumber(number), normalizeText(name)].join('|');
}

function printingKey(setKey, number, name, finishKey) {
  return [factKey(setKey, number, name), String(finishKey ?? '').trim()].join('|');
}

function tcgdexExternalIdFromEvidence(row) {
  for (const url of row.evidence_urls ?? []) {
    const match = String(url).match(/api\.tcgdex\.net\/v2\/en\/cards\/([^/?#]+)/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

function buildSelectedRows({ readiness, cardsArtifact, printingsArtifact }) {
  const selectedKeys = new Set((readiness.selected_sets ?? []).map((row) => row.set_key));
  const selectedByKey = new Map((readiness.selected_sets ?? []).map((row) => [row.set_key, row]));
  const cards = (cardsArtifact.cards ?? [])
    .filter((row) => selectedKeys.has(row.set_key) && row.status === 'master_verified')
    .sort((left, right) => (
      left.set_key.localeCompare(right.set_key) ||
      normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }) ||
      normalizeText(left.card_name).localeCompare(normalizeText(right.card_name))
    ));
  const printings = (printingsArtifact.printings ?? [])
    .filter((row) => selectedKeys.has(row.set_key) && row.status === 'master_verified')
    .sort((left, right) => (
      left.set_key.localeCompare(right.set_key) ||
      normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }) ||
      normalizeText(left.card_name).localeCompare(normalizeText(right.card_name)) ||
      String(left.finish_key).localeCompare(String(right.finish_key))
    ));

  const setRows = [];
  const parentRows = [];
  const childRows = [];
  const mappingRows = [];
  const parentByFact = new Map();

  for (const selected of readiness.selected_sets ?? []) {
    const setId = uuid();
    setRows.push({
      set_id: setId,
      set_key: selected.set_key,
      set_name: selected.set_name,
      tcgdex_set_id: selected.tcgdex_set_id,
      expected_parent_rows: selected.expected_parent_rows,
      expected_child_printings: selected.expected_child_printings,
      expected_finish_counts: selected.expected_finish_counts,
      aliases: selected.aliases,
      source_json: {
        tcgdex: {
          id: selected.tcgdex_set_id,
          name: selected.set_name,
        },
        verified_master_index_v1: {
          package_id: PACKAGE_ID,
          package_fingerprint_sha256: readiness.package_fingerprint_sha256,
        },
      },
    });
  }
  const setIdByKey = new Map(setRows.map((row) => [row.set_key, row.set_id]));

  for (const card of cards) {
    const selected = selectedByKey.get(card.set_key);
    const cardPrintId = uuid();
    const externalId = tcgdexExternalIdFromEvidence(card);
    const parent = {
      card_print_id: cardPrintId,
      set_id: setIdByKey.get(card.set_key),
      set_key: card.set_key,
      set_name: card.set_name,
      set_code: card.set_key,
      card_number: card.card_number,
      card_name: card.card_name,
      rarity: Array.isArray(card.rarity_values) ? card.rarity_values[0] ?? null : null,
      variant_key: '',
      external_ids: externalId ? { tcgdex: externalId } : {},
      ai_metadata: {
        source: PROVENANCE_SOURCE,
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: readiness.package_fingerprint_sha256,
      },
      source_count: card.source_count,
      sources: card.sources ?? [],
      evidence_urls: card.evidence_urls ?? [],
    };
    parentRows.push(parent);
    parentByFact.set(factKey(card.set_key, card.card_number, card.card_name), parent);
    if (externalId) {
      mappingRows.push({
        source: 'tcgdex',
        external_id: externalId,
        card_print_id: cardPrintId,
        meta: {
          package_id: PACKAGE_ID,
          set_key: card.set_key,
          set_name: selected?.set_name ?? card.set_name,
        },
      });
    }
  }

  for (const printing of printings) {
    const parent = parentByFact.get(factKey(printing.set_key, printing.card_number, printing.card_name));
    childRows.push({
      card_printing_id: uuid(),
      card_print_id: parent?.card_print_id ?? null,
      set_key: printing.set_key,
      card_number: printing.card_number,
      card_name: printing.card_name,
      finish_key: printing.finish_key,
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${printing.set_key}:${normalizeNumber(printing.card_number)}:${printing.finish_key}`,
      created_by: CREATED_BY,
      source_count: printing.source_count,
      sources: printing.sources ?? [],
      evidence_urls: printing.evidence_urls ?? [],
      parent_found: Boolean(parent),
      fact_key: printingKey(printing.set_key, printing.card_number, printing.card_name, printing.finish_key),
    });
  }

  return { setRows, parentRows, childRows, mappingRows };
}

async function captureFreshSnapshot(selectedSets) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      impact_counts: {},
    };
  }
  const aliases = selectedSets.flatMap((row) => row.aliases ?? []);
  const setKeys = selectedSets.map((row) => row.set_key);
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         'set' as row_type,
         s.id::text as row_id,
         s.code as set_code,
         s.name,
         null::text as card_number,
         null::text as finish_key
       from public.sets s
       where s.game = 'pokemon'
         and (
           lower(coalesce(s.code, '')) = any($1::text[])
           or lower(coalesce(s.name, '')) = any($1::text[])
           or s.source->'tcgdex'->>'id' = any($2::text[])
         )
       union all
       select
         'card_print' as row_type,
         cp.id::text as row_id,
         cp.set_code,
         cp.name,
         coalesce(cp.number_plain, cp.number) as card_number,
         null::text as finish_key
       from public.card_prints cp
       where lower(coalesce(cp.set_code, '')) = any($1::text[])
       union all
       select
         'card_printing' as row_type,
         cpr.id::text as row_id,
         cp.set_code,
         cp.name,
         coalesce(cp.number_plain, cp.number) as card_number,
         cpr.finish_key
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id
       where lower(coalesce(cp.set_code, '')) = any($1::text[])
       order by row_type, set_code nulls last, card_number nulls last, name nulls last, finish_key nulls last`,
      [aliases, setKeys],
    );
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows: result.rows,
      hash_sha256: sha256(stableJson(result.rows)),
      impact_counts: {
        existing_set_rows: result.rows.filter((row) => row.row_type === 'set').length,
        existing_parent_rows: result.rows.filter((row) => row.row_type === 'card_print').length,
        existing_child_printing_rows: result.rows.filter((row) => row.row_type === 'card_printing').length,
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Read-only fresh snapshot failed: ${error.message}`,
      rows: [],
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildStopFindings({ readiness, planned, snapshot }) {
  const findings = [];
  if (readiness.package_id !== PACKAGE_ID) findings.push('source_readiness_package_id_mismatch');
  if ((readiness.selected_sets ?? []).length !== 4) findings.push('selected_set_count_not_four');
  if (planned.setRows.length !== (readiness.selected_sets ?? []).length) findings.push('planned_set_count_mismatch');
  if (planned.parentRows.length !== readiness.summary?.selected_expected_parent_rows) findings.push('planned_parent_count_mismatch');
  if (planned.childRows.length !== readiness.summary?.selected_expected_child_printings) findings.push('planned_child_count_mismatch');
  if (planned.childRows.some((row) => !row.parent_found)) findings.push('child_row_missing_planned_parent');
  if (planned.mappingRows.length !== planned.parentRows.length) findings.push('tcgdex_mapping_count_not_equal_parent_count');
  if (!snapshot.available) findings.push('fresh_snapshot_unavailable');
  if ((snapshot.impact_counts?.existing_set_rows ?? 0) !== 0) findings.push('fresh_snapshot_existing_set_rows_found');
  if ((snapshot.impact_counts?.existing_parent_rows ?? 0) !== 0) findings.push('fresh_snapshot_existing_parent_rows_found');
  if ((snapshot.impact_counts?.existing_child_printing_rows ?? 0) !== 0) findings.push('fresh_snapshot_existing_child_printing_rows_found');
  return findings;
}

function valuesSql(rows, columns, mapper) {
  return rows.map((row) => `  (${columns.map((column) => mapper(row, column)).join(', ')})`).join(',\n');
}

function buildSql({ readiness, planned, snapshotHash, artifactFingerprint }) {
  const setColumns = ['set_id', 'set_key', 'set_name', 'tcgdex_set_id', 'source_json'];
  const parentColumns = ['card_print_id', 'set_id', 'set_code', 'card_number', 'card_name', 'rarity', 'variant_key', 'external_ids', 'ai_metadata'];
  const childColumns = ['card_printing_id', 'card_print_id', 'finish_key', 'provenance_source', 'provenance_ref', 'created_by'];
  const mappingColumns = ['source', 'external_id', 'card_print_id', 'meta'];

  return `-- English Master Index PKG-05A guarded dry-run transaction artifact V1
-- GENERATED ARTIFACT ONLY. Codex did not execute this SQL.
-- Scope: ${PACKAGE_ID}
-- Source readiness fingerprint: ${readiness.package_fingerprint_sha256}
-- Artifact fingerprint: ${artifactFingerprint}
-- Fresh snapshot hash: ${snapshotHash}
-- This artifact has no COMMIT path. It must roll back.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table pkg05a_sets (
  set_id uuid primary key,
  set_key text not null unique,
  set_name text not null,
  tcgdex_set_id text not null,
  source_json jsonb not null
) on commit drop;

insert into pkg05a_sets (${setColumns.join(', ')}) values
${valuesSql(planned.setRows, setColumns, (row, column) => {
  if (column === 'set_id') return sqlUuid(row.set_id);
  if (column === 'source_json') return sqlJson(row.source_json);
  return sqlString(row[column]);
})};

create temporary table pkg05a_card_prints (
  card_print_id uuid primary key,
  set_id uuid not null,
  set_code text not null,
  card_number text not null,
  card_name text not null,
  rarity text null,
  variant_key text not null,
  external_ids jsonb not null,
  ai_metadata jsonb not null
) on commit drop;

insert into pkg05a_card_prints (${parentColumns.join(', ')}) values
${valuesSql(planned.parentRows, parentColumns, (row, column) => {
  if (['card_print_id', 'set_id'].includes(column)) return sqlUuid(row[column]);
  if (['external_ids', 'ai_metadata'].includes(column)) return sqlJson(row[column]);
  return sqlString(row[column]);
})};

create temporary table pkg05a_card_printings (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  provenance_source text not null,
  provenance_ref text not null,
  created_by text not null
) on commit drop;

insert into pkg05a_card_printings (${childColumns.join(', ')}) values
${valuesSql(planned.childRows, childColumns, (row, column) => {
  if (['card_printing_id', 'card_print_id'].includes(column)) return sqlUuid(row[column]);
  return sqlString(row[column]);
})};

create temporary table pkg05a_external_mappings (
  source text not null,
  external_id text not null,
  card_print_id uuid not null,
  meta jsonb not null
) on commit drop;

insert into pkg05a_external_mappings (${mappingColumns.join(', ')}) values
${valuesSql(planned.mappingRows, mappingColumns, (row, column) => {
  if (column === 'card_print_id') return sqlUuid(row[column]);
  if (column === 'meta') return sqlJson(row[column]);
  return sqlString(row[column]);
})};

-- Guard 1: source package shape must still match the approved readiness artifact.
do $$
declare
  set_count int;
  parent_count int;
  child_count int;
begin
  select count(*) into set_count from pkg05a_sets;
  select count(*) into parent_count from pkg05a_card_prints;
  select count(*) into child_count from pkg05a_card_printings;
  if set_count <> ${planned.setRows.length} then raise exception 'PKG-05A set count drift: %', set_count; end if;
  if parent_count <> ${planned.parentRows.length} then raise exception 'PKG-05A parent count drift: %', parent_count; end if;
  if child_count <> ${planned.childRows.length} then raise exception 'PKG-05A child count drift: %', child_count; end if;
end $$;

-- Guard 2: no target set, parent, child, or external mapping may already exist.
do $$
declare
  collision_count int;
begin
  select count(*) into collision_count
  from pkg05a_sets target
  join public.sets s
    on s.game = 'pokemon'
   and (lower(coalesce(s.code, '')) = lower(target.set_key)
        or lower(coalesce(s.name, '')) = lower(target.set_name)
        or s.source->'tcgdex'->>'id' = target.tcgdex_set_id);
  if collision_count <> 0 then raise exception 'PKG-05A set collision count: %', collision_count; end if;

  select count(*) into collision_count
  from pkg05a_card_prints target
  join public.card_prints cp
    on lower(coalesce(cp.set_code, '')) = lower(target.set_code)
   and coalesce(cp.number_plain, cp.number) = regexp_replace(target.card_number, '[^0-9]', '', 'g')
   and lower(coalesce(cp.name, '')) = lower(target.card_name);
  if collision_count <> 0 then raise exception 'PKG-05A parent collision count: %', collision_count; end if;

  select count(*) into collision_count
  from pkg05a_external_mappings target
  join public.external_mappings em
    on em.source = target.source
   and em.external_id = target.external_id;
  if collision_count <> 0 then raise exception 'PKG-05A external mapping collision count: %', collision_count; end if;
end $$;

-- Dry-run insert simulation. This transaction must roll back.
insert into public.sets (
  id,
  game,
  code,
  name,
  source
)
select
  set_id,
  'pokemon',
  set_key,
  set_name,
  source_json
from pkg05a_sets;

insert into public.card_prints (
  id,
  set_id,
  set_code,
  number,
  name,
  rarity,
  variant_key,
  external_ids,
  ai_metadata
)
select
  card_print_id,
  set_id,
  set_code,
  card_number,
  card_name,
  rarity,
  variant_key,
  external_ids,
  ai_metadata
from pkg05a_card_prints;

insert into public.external_mappings (
  source,
  external_id,
  card_print_id,
  meta
)
select
  source,
  external_id,
  card_print_id,
  meta
from pkg05a_external_mappings;

insert into public.card_printings (
  id,
  card_print_id,
  finish_key,
  is_provisional,
  provenance_source,
  provenance_ref,
  created_by
)
select
  card_printing_id,
  card_print_id,
  finish_key,
  false,
  provenance_source,
  provenance_ref,
  created_by
from pkg05a_card_printings;

-- Guard 3: dry-run post-insert counts must match exactly.
do $$
declare
  inserted_sets int;
  inserted_parents int;
  inserted_children int;
begin
  select count(*) into inserted_sets
  from public.sets s
  join pkg05a_sets target on target.set_id = s.id;
  select count(*) into inserted_parents
  from public.card_prints cp
  join pkg05a_card_prints target on target.card_print_id = cp.id;
  select count(*) into inserted_children
  from public.card_printings cpr
  join pkg05a_card_printings target on target.card_printing_id = cpr.id;
  if inserted_sets <> ${planned.setRows.length} then raise exception 'PKG-05A inserted set count mismatch: %', inserted_sets; end if;
  if inserted_parents <> ${planned.parentRows.length} then raise exception 'PKG-05A inserted parent count mismatch: %', inserted_parents; end if;
  if inserted_children <> ${planned.childRows.length} then raise exception 'PKG-05A inserted child count mismatch: %', inserted_children; end if;
end $$;

-- Rollback proof query.
select
  '${PACKAGE_ID}'::text as package_id,
  '${readiness.package_fingerprint_sha256}'::text as readiness_fingerprint,
  '${artifactFingerprint}'::text as artifact_fingerprint,
  (select count(*) from pkg05a_sets)::int as planned_sets,
  (select count(*) from pkg05a_card_prints)::int as planned_parent_rows,
  (select count(*) from pkg05a_card_printings)::int as planned_child_rows;

rollback;
`;
}

function buildMarkdown(report) {
  const setRows = report.planned_sets.map((row) => [
    row.set_key,
    row.set_name,
    row.expected_parent_rows,
    row.expected_child_printings,
    JSON.stringify(row.expected_finish_counts),
  ]);
  return `# PKG-05A Final Snapshot Transaction Artifact V1

Preparation only. This artifact was generated for review and rollback-only dry-run execution. It was not executed by this script.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- apply_paths_executed: ${report.apply_paths_executed}
- write_ready_now: ${report.write_ready_now}

## Fingerprints

- source_readiness_fingerprint: \`${report.source_readiness_fingerprint_sha256}\`
- artifact_fingerprint: \`${report.artifact_fingerprint_sha256}\`
- fresh_snapshot_hash: \`${report.fresh_snapshot.hash_sha256}\`

## Scope

${markdownTable(['set_key', 'set_name', 'expected_parent_rows', 'expected_child_printings', 'finish_counts'], setRows)}

## Counts

${markdownTable(['metric', 'value'], Object.entries(report.summary))}

## Stop Findings

${report.stop_findings.length ? report.stop_findings.map((item) => `- ${item}`).join('\n') : 'None.'}

## SQL Artifact

\`${path.relative(process.cwd(), report.sql_artifact_path)}\`
`;
}

async function main() {
  const [readiness, cardsArtifact, printingsArtifact] = await Promise.all([
    readJson(SOURCE_READINESS_JSON),
    readJson(CARDS_JSON),
    readJson(PRINTINGS_JSON),
  ]);

  const planned = buildSelectedRows({ readiness, cardsArtifact, printingsArtifact });
  const freshSnapshot = await captureFreshSnapshot(readiness.selected_sets ?? []);
  const planningPayload = {
    package_id: PACKAGE_ID,
    source_readiness_fingerprint_sha256: readiness.package_fingerprint_sha256,
    planned_sets: planned.setRows,
    planned_parents: planned.parentRows.map((row) => ({
      card_print_id: row.card_print_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      external_ids: row.external_ids,
    })),
    planned_children: planned.childRows.map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
    })),
  };
  const artifactFingerprint = sha256(stableJson(planningPayload));
  const stopFindings = buildStopFindings({ readiness, planned, snapshot: freshSnapshot });
  const sql = buildSql({
    readiness,
    planned,
    snapshotHash: freshSnapshot.hash_sha256 ?? 'unavailable',
    artifactFingerprint,
  });

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg05a_final_snapshot_transaction_artifact_v1',
    package_id: PACKAGE_ID,
    preparation_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    write_ready_now: 0,
    source_readiness_fingerprint_sha256: readiness.package_fingerprint_sha256,
    artifact_fingerprint_sha256: artifactFingerprint,
    sql_artifact_path: OUTPUT_SQL,
    fresh_snapshot: freshSnapshot,
    summary: {
      planned_set_inserts: planned.setRows.length,
      planned_parent_inserts: planned.parentRows.length,
      planned_child_printing_inserts: planned.childRows.length,
      planned_external_mapping_inserts: planned.mappingRows.length,
      existing_set_rows_in_fresh_snapshot: freshSnapshot.impact_counts?.existing_set_rows ?? null,
      existing_parent_rows_in_fresh_snapshot: freshSnapshot.impact_counts?.existing_parent_rows ?? null,
      existing_child_rows_in_fresh_snapshot: freshSnapshot.impact_counts?.existing_child_printing_rows ?? null,
    },
    planned_sets: planned.setRows,
    planned_parent_rows: planned.parentRows,
    planned_child_printing_rows: planned.childRows,
    planned_external_mapping_rows: planned.mappingRows,
    rollback_strategy: {
      artifact_is_rollback_only: true,
      durable_apply_not_authorized: true,
      future_real_apply_rollback_selector: 'Use planned UUIDs from this artifact for inserted card_printings, external_mappings, card_prints, and sets in reverse dependency order.',
    },
    stop_findings: stopFindings,
    stop_rules: [
      'Do not execute this SQL as a real apply.',
      'Do not add COMMIT to this SQL without a separate real-apply approval gate.',
      'Stop if fresh snapshot contains any existing set, parent, or child rows for the selected sets.',
      'Stop if dry-run execution reports any collision or count mismatch.',
      'No migrations, deletes, merges, unsupported cleanup, or identity modifier work are in scope.',
    ],
  };

  await writeText(OUTPUT_SQL, sql);
  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    output_sql: OUTPUT_SQL,
    source_readiness_fingerprint_sha256: report.source_readiness_fingerprint_sha256,
    artifact_fingerprint_sha256: report.artifact_fingerprint_sha256,
    summary: report.summary,
    stop_findings: report.stop_findings,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error('[pkg05a][final-snapshot-artifact] failed:', error?.message ?? error);
  process.exitCode = 1;
});
