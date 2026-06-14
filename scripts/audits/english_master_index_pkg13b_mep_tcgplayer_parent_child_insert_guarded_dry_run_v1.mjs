import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg13b_mep_tcgplayer_parent_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg13b_mep_tcgplayer_parent_child_insert_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg13b_mep_tcgplayer_parent_child_insert_guarded_dry_run_checkpoint_v1.md');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const PACKAGE_ID = 'PKG-13B-MEP-TCGPLAYER-PARENT-CHILD-INSERTS';
const CREATED_BY = 'pkg13b_mep_tcgplayer_parent_child_insert_guarded_dry_run_v1';
const PROVENANCE_SOURCE = 'verified_master_set_index_v1';

const TARGETS = [
  {
    set_key: 'mep',
    live_set_code: 'mep',
    set_name: 'MEP Black Star Promos',
    card_number: '078',
    number_plain: '078',
    card_name: 'Toxel',
    finish_key: 'cosmos',
    mapping: {
      source: 'tcgplayer',
      external_id: '694692',
      source_url: 'https://www.tcgplayer.com/product/694692/pokemon-me-mega-evolution-promo-toxel-078-cosmos-holo',
    },
    evidence_urls: [
      'https://www.tcgplayer.com/product/694692/pokemon-me-mega-evolution-promo-toxel-078-cosmos-holo',
      'https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list',
      'https://bulbapedia.bulbagarden.net/wiki/Toxel_(Phantasmal_Flames_67)',
    ],
    evidence_note: 'Exact TCGplayer product page identifies Toxel - 078 (Cosmos Holo) in ME: Mega Evolution Promo.',
  },
  {
    set_key: 'mep',
    live_set_code: 'mep',
    set_name: 'MEP Black Star Promos',
    card_number: '079',
    number_plain: '079',
    card_name: 'Charmeleon',
    finish_key: 'cosmos',
    mapping: {
      source: 'tcgplayer',
      external_id: '694693',
      source_url: 'https://www.tcgplayer.com/product/694693/pokemon-me-mega-evolution-promo-charmeleon-079-cosmos-holo',
    },
    evidence_urls: [
      'https://www.tcgplayer.com/product/694693/pokemon-me-mega-evolution-promo-charmeleon-079-cosmos-holo',
      'https://www.thepricedex.com/set/mep/mep-black-star-promos/price-list',
      'https://bulbapedia.bulbagarden.net/wiki/Charmeleon_(Phantasmal_Flames_12)',
    ],
    evidence_note: 'Exact TCGplayer product page identifies Charmeleon - 079 (Cosmos Holo) in ME: Mega Evolution Promo.',
  },
];

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function packageFingerprint() {
  return hash(stableJson({
    package_id: PACKAGE_ID,
    targets: TARGETS.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      mapping: row.mapping,
    })),
  }));
}

async function resolveSet(client) {
  const result = await client.query(
    `select id::text as set_id, code, name
     from public.sets
     where game = 'pokemon' and lower(code) = 'mep'
     order by id`,
  );
  if (result.rows.length !== 1) throw new Error(`expected exactly one mep set row, found ${result.rows.length}`);
  return result.rows[0];
}

function buildPlan(setRow) {
  const parentRows = TARGETS.map((row) => ({
    card_print_id: crypto.randomUUID(),
    set_id: setRow.set_id,
    live_set_code: setRow.code,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    number_plain: row.number_plain,
    printed_identity_modifier: null,
    card_name: row.card_name,
    rarity: null,
    variant_key: '',
    external_ids: { [row.mapping.source]: row.mapping.external_id },
    ai_metadata: {
      source: PROVENANCE_SOURCE,
      package_id: PACKAGE_ID,
      evidence_note: row.evidence_note,
      evidence_urls: row.evidence_urls,
    },
    evidence_urls: row.evidence_urls,
    mapping: row.mapping,
  }));
  const childRows = parentRows.map((row) => ({
    card_printing_id: crypto.randomUUID(),
    card_print_id: row.card_print_id,
    set_key: row.set_key,
    live_set_code: row.live_set_code,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: 'cosmos',
    provenance_source: PROVENANCE_SOURCE,
    provenance_ref: `${row.set_key}:${row.card_number}:cosmos`,
    created_by: CREATED_BY,
  }));
  const mappingRows = parentRows.map((row) => ({
    source: row.mapping.source,
    external_id: row.mapping.external_id,
    card_print_id: row.card_print_id,
    meta: {
      package_id: PACKAGE_ID,
      set_key: row.set_key,
      live_set_code: row.live_set_code,
      card_name: row.card_name,
      card_number: row.card_number,
      source_url: row.mapping.source_url,
      evidence_urls: row.evidence_urls,
    },
  }));
  return { parentRows, childRows, mappingRows };
}

async function captureSnapshot(client, plan) {
  const result = await client.query(
    `with parent_target as (
       select * from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         live_set_code text,
         number_plain text,
         printed_identity_modifier text,
         card_name text
       )
     ),
     child_target as (
       select * from jsonb_to_recordset($2::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         finish_key text
       )
     ),
     mapping_target as (
       select * from jsonb_to_recordset($3::jsonb) as t(
         source text,
         external_id text,
         card_print_id uuid
       )
     )
     select 'target_set' as row_type, s.id::text as row_id, s.code as set_code,
            null::text as card_number, s.name as card_name, null::text as finish_key,
            null::text as source, null::text as external_id
     from public.sets s
     where lower(coalesce(s.code, '')) = 'mep'
     union all
     select 'existing_parent_exact', cp.id::text, cp.set_code,
            coalesce(cp.number_plain, cp.number), cp.name, null::text, null::text, null::text
     from parent_target target
     join public.card_prints cp
       on cp.id = target.card_print_id
       or (
         lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
         and coalesce(cp.number_plain, cp.number, '') = target.number_plain
         and lower(coalesce(cp.printed_identity_modifier, '')) = lower(coalesce(target.printed_identity_modifier, ''))
         and lower(coalesce(cp.name, '')) = lower(target.card_name)
       )
     union all
     select 'existing_child_exact', cpr.id::text, cp.set_code,
            coalesce(cp.number_plain, cp.number), cp.name, cpr.finish_key, null::text, null::text
     from child_target target
     join public.card_printings cpr
       on cpr.id = target.card_printing_id
       or (cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key)
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select 'external_mapping_collision', em.id::text, cp.set_code,
            coalesce(cp.number_plain, cp.number), cp.name, null::text, em.source, em.external_id
     from mapping_target target
     join public.external_mappings em on em.source = target.source and em.external_id = target.external_id
     left join public.card_prints cp on cp.id = em.card_print_id
     order by row_type, set_code nulls last, card_number nulls last, card_name nulls last, finish_key nulls last, source nulls last, external_id nulls last, row_id`,
    [JSON.stringify(plan.parentRows), JSON.stringify(plan.childRows), JSON.stringify(plan.mappingRows)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: hash(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function runDryRun(client, plan, fingerprint) {
  const beforeSnapshot = await captureSnapshot(client, plan);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg13b_parent_targets (
         card_print_id uuid primary key,
         set_id uuid not null,
         live_set_code text not null,
         card_number text not null,
         number_plain text not null,
         card_name text not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg13b_child_targets (
         card_printing_id uuid primary key,
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg13b_mapping_targets (
         source text not null,
         external_id text not null,
         card_print_id uuid not null,
         meta jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg13b_parent_targets
       select row.card_print_id::uuid, row.set_id::uuid, row.live_set_code, row.card_number,
              row.number_plain, row.card_name, row.external_ids, row.ai_metadata
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         set_id text,
         live_set_code text,
         card_number text,
         number_plain text,
         card_name text,
         external_ids jsonb,
         ai_metadata jsonb
       )`,
      [JSON.stringify(plan.parentRows)],
    );
    await client.query(
      `insert into pkg13b_child_targets
       select row.card_printing_id::uuid, row.card_print_id::uuid, row.finish_key,
              row.provenance_source, row.provenance_ref, row.created_by
       from jsonb_to_recordset($1::jsonb) as row(
         card_printing_id text,
         card_print_id text,
         finish_key text,
         provenance_source text,
         provenance_ref text,
         created_by text
       )`,
      [JSON.stringify(plan.childRows)],
    );
    await client.query(
      `insert into pkg13b_mapping_targets
       select row.source, row.external_id, row.card_print_id::uuid, row.meta
       from jsonb_to_recordset($1::jsonb) as row(
         source text,
         external_id text,
         card_print_id text,
         meta jsonb
       )`,
      [JSON.stringify(plan.mappingRows)],
    );

    const guard = await client.query(
      `select
         (select count(*)::int from pkg13b_parent_targets) as parent_rows,
         (select count(*)::int from pkg13b_child_targets) as child_rows,
         (select count(*)::int from pkg13b_mapping_targets) as mapping_rows,
         (select count(*)::int from pkg13b_child_targets child left join public.finish_keys fk on fk.key = child.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows,
         (select count(*)::int from pkg13b_parent_targets target join public.card_prints cp
          on lower(coalesce(cp.set_code, '')) = lower(target.live_set_code)
         and coalesce(cp.number_plain, cp.number, '') = target.number_plain
         and lower(coalesce(cp.printed_identity_modifier, '')) = ''
         and lower(coalesce(cp.name, '')) = lower(target.card_name)) as parent_collisions,
         (select count(*)::int from pkg13b_child_targets target join public.card_printings cpr
          on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key) as child_collisions,
         (select count(*)::int from pkg13b_mapping_targets target join public.external_mappings em
          on em.source = target.source and em.external_id = target.external_id) as mapping_collisions`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.parent_rows !== plan.parentRows.length ||
      guardRow.child_rows !== plan.childRows.length ||
      guardRow.mapping_rows !== plan.mappingRows.length ||
      guardRow.inactive_finish_rows !== 0 ||
      guardRow.parent_collisions !== 0 ||
      guardRow.child_collisions !== 0 ||
      guardRow.mapping_collisions !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentInsert = await client.query(
      `insert into public.card_prints (
         id, set_id, set_code, number, name, rarity, variant_key, external_ids, ai_metadata
       )
       select card_print_id, set_id, live_set_code, card_number, card_name,
              null::text, ''::text, external_ids, ai_metadata
       from pkg13b_parent_targets`,
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select source, external_id, card_print_id, meta
       from pkg13b_mapping_targets`,
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source, provenance_ref, created_by
       )
       select card_printing_id, card_print_id, finish_key, false, provenance_source, provenance_ref, created_by
       from pkg13b_child_targets`,
    );
    const proof = await client.query(
      `select $1::text as package_id,
              $2::text as package_fingerprint,
              (select count(*)::int from pkg13b_parent_targets) as planned_parent_rows,
              (select count(*)::int from pkg13b_child_targets) as planned_child_rows,
              (select count(*)::int from pkg13b_mapping_targets) as planned_mapping_rows`,
      [PACKAGE_ID, fingerprint],
    );
    if (
      parentInsert.rowCount !== plan.parentRows.length ||
      childInsert.rowCount !== plan.childRows.length ||
      mappingInsert.rowCount !== plan.mappingRows.length
    ) {
      throw new Error('insert count mismatch during rollback dry-run');
    }
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, plan);
    return {
      dry_run_status: 'pkg13b_mep_tcgplayer_parent_child_insert_completed_rolled_back_no_durable_change',
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      durable_after_snapshot_matches_before_snapshot: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      guard: guardRow,
      rollback_proof_rows: proof.rows,
      attempted_insert_counts: {
        parent_inserts: parentInsert.rowCount,
        child_inserts: childInsert.rowCount,
        external_mapping_inserts: mappingInsert.rowCount,
      },
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, plan).catch(() => beforeSnapshot);
    return {
      dry_run_status: 'pkg13b_mep_tcgplayer_parent_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      durable_after_snapshot_matches_before_snapshot: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256,
      guard: null,
      rollback_proof_rows: [],
      attempted_insert_counts: { parent_inserts: 0, child_inserts: 0, external_mapping_inserts: 0 },
      stop_findings: [error.message],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-13B MEP TCGplayer Parent+Child Insert Guarded Dry Run V1

- package_id: \`${report.package_id}\`
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_status: ${report.execution.dry_run_status}
- rollback_verified: ${report.execution.durable_after_snapshot_matches_before_snapshot}
- target_parent_rows: ${report.scope.target_parent_rows}
- target_child_rows: ${report.scope.target_child_rows}
- target_external_mappings: ${report.scope.target_external_mappings}
- by_set: ${JSON.stringify(report.scope.by_set)}
- by_finish: ${JSON.stringify(report.scope.by_finish)}
- by_mapping_source: ${JSON.stringify(report.scope.by_mapping_source)}
- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Targets

${markdownTable(
  ['set', 'number', 'name', 'finish', 'mapping'],
  report.scope.parent_rows.map((row) => [
    row.live_set_code,
    row.card_number,
    row.card_name,
    'cosmos',
    `${row.mapping.source}:${row.mapping.external_id}`,
  ]),
)}

This report is rollback-only proof. It does not perform a durable apply.
`;
}

async function updateCheckpointIndex() {
  const line = '| 2026-06-10 | [PKG-13B MEP TCGplayer Parent+Child Insert Guarded Dry Run Checkpoint V1](20260610_pkg13b_mep_tcgplayer_parent_child_insert_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for two MEP TCGplayer-backed cosmos parent+child inserts. No durable writes or migrations. |';
  let current = '';
  try {
    current = await fs.readFile(CHECKPOINT_INDEX, 'utf8');
  } catch {
    current = '# Master Index Checkpoints\n';
  }
  if (!current.includes('20260610_pkg13b_mep_tcgplayer_parent_child_insert_guarded_dry_run_checkpoint_v1.md')) {
    await writeText(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL');
  const fingerprint = packageFingerprint();
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const setRow = await resolveSet(client);
    const plan = buildPlan(setRow);
    const execution = await runDryRun(client, plan, fingerprint);
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg13b_mep_tcgplayer_parent_child_insert_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: fingerprint,
      rollback_only: true,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      scope: {
        target_parent_rows: plan.parentRows.length,
        target_child_rows: plan.childRows.length,
        target_external_mappings: plan.mappingRows.length,
        by_set: countBy(plan.childRows, (row) => row.set_key),
        by_finish: countBy(plan.childRows, (row) => row.finish_key),
        by_mapping_source: countBy(plan.mappingRows, (row) => row.source),
        parent_rows: plan.parentRows,
        child_rows: plan.childRows,
        external_mapping_rows: plan.mappingRows,
      },
      execution,
    };
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    await writeText(CHECKPOINT_MD, `# PKG-13B MEP TCGplayer Parent+Child Insert Guarded Dry Run Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${fingerprint}\`
- Dry-run status: ${execution.dry_run_status}
- Rollback verified: ${execution.durable_after_snapshot_matches_before_snapshot}
- Parent inserts tested: ${execution.attempted_insert_counts.parent_inserts}
- Child inserts tested: ${execution.attempted_insert_counts.child_inserts}
- External mapping inserts tested: ${execution.attempted_insert_counts.external_mapping_inserts}
- Dry-run proof: \`${execution.before_snapshot.hash_sha256}\` == \`${execution.after_snapshot.hash_sha256}\`
- Durable DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
`);
    await updateCheckpointIndex();
    console.log(JSON.stringify({
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: fingerprint,
      dry_run_status: execution.dry_run_status,
      rollback_verified: execution.durable_after_snapshot_matches_before_snapshot,
      scope: report.scope,
      attempted_insert_counts: execution.attempted_insert_counts,
      stop_findings: execution.stop_findings,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_snapshot.hash_sha256}`,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
