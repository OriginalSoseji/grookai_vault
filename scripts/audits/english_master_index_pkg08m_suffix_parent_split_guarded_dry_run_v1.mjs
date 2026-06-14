import crypto from 'node:crypto';
import fsSync from 'node:fs';
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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08k_suffix_collision_split_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08m_suffix_parent_split_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08m_suffix_parent_split_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08M-SUFFIX-PARENT-SPLIT';
const CREATED_BY = 'pkg08m_suffix_parent_split_guarded_dry_run_v1';
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
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function buildTargets(rows) {
  return rows.map((row) => {
    const mapping = row.live_parent.external_mappings.find((item) => (
      item.source === 'tcgdex' && item.external_id === row.tcgdex_external_id
    ));
    return {
      suffix_parent_id: crypto.randomUUID(),
      suffix_child_id: crypto.randomUUID(),
      base_parent_id: row.live_parent.card_print_id,
      set_id: row.live_parent.set_id,
      set_key: row.set_key,
      set_code: row.live_parent.set_code,
      card_name: row.card_name,
      base_number: row.base_card_number,
      suffix_number: row.suffix_card_number,
      printed_identity_modifier: 'a',
      finish_key: row.master_truth.suffix_finishes[0],
      tcgdex_external_id: mapping?.external_id ?? null,
      external_mapping_id: mapping?.external_mapping_id ?? null,
      external_ids: { tcgdex: mapping?.external_id ?? null },
      ai_metadata: {
        source: PROVENANCE_SOURCE,
        package_id: PACKAGE_ID,
        source_set_key: row.set_key,
        split_from_card_print_id: row.live_parent.card_print_id,
        split_reason: 'suffix_number_collision',
      },
      provenance_ref: `${row.set_key}:${row.suffix_card_number}:${row.master_truth.suffix_finishes[0]}`,
      evidence_urls: row.evidence_urls,
      sources: row.sources,
    };
  });
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         suffix_parent_id uuid,
         suffix_child_id uuid,
         base_parent_id uuid,
         set_id uuid,
         set_code text,
         suffix_number text,
         printed_identity_modifier text,
         card_name text,
         finish_key text,
         tcgdex_external_id text,
         external_mapping_id text
       )
     )
     select
       'base_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       null::text as finish_key,
       null::text as external_id,
       null::text as mapping_card_print_id
     from target t
     join public.card_prints cp on cp.id = t.base_parent_id
     union all
     select
       'suffix_parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       null::text as finish_key,
       null::text as external_id,
       null::text as mapping_card_print_id
     from target t
     join public.card_prints cp
       on cp.id = t.suffix_parent_id
       or (
         cp.set_id = t.set_id
         and cp.number_plain = regexp_replace(t.suffix_number, '[^0-9]', '', 'g')
         and coalesce(cp.printed_identity_modifier, '') = t.printed_identity_modifier
         and coalesce(cp.variant_key, '') = ''
         and cp.set_identity_model = 'standard'
       )
     union all
     select
       'suffix_child' as row_type,
       cpr.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.printed_identity_modifier,
       cp.name,
       cpr.finish_key,
       null::text as external_id,
       null::text as mapping_card_print_id
     from target t
     join public.card_printings cpr
       on cpr.id = t.suffix_child_id
       or (cpr.card_print_id = t.suffix_parent_id and cpr.finish_key = t.finish_key)
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'tcgdex_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_code,
       null::text as number,
       null::text as number_plain,
       null::text as printed_identity_modifier,
       null::text as name,
       null::text as finish_key,
       em.external_id,
       em.card_print_id::text as mapping_card_print_id
     from target t
     join public.external_mappings em on em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id
     order by row_type, set_code nulls last, number nulls last, name nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      base_parent_rows: rows.filter((row) => row.row_type === 'base_parent').length,
      suffix_parent_rows: rows.filter((row) => row.row_type === 'suffix_parent').length,
      suffix_child_rows: rows.filter((row) => row.row_type === 'suffix_child').length,
      tcgdex_mapping_rows: rows.filter((row) => row.row_type === 'tcgdex_mapping').length,
      total_rows: rows.length,
    },
  };
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08m_targets (
         suffix_parent_id uuid primary key,
         suffix_child_id uuid not null,
         base_parent_id uuid not null,
         set_id uuid not null,
         set_code text not null,
         card_name text not null,
         suffix_number text not null,
         printed_identity_modifier text not null,
         finish_key text not null,
         tcgdex_external_id text not null,
         external_mapping_id bigint not null,
         external_ids jsonb not null,
         ai_metadata jsonb not null,
         provenance_ref text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08m_targets
       select
         row.suffix_parent_id::uuid,
         row.suffix_child_id::uuid,
         row.base_parent_id::uuid,
         row.set_id::uuid,
         row.set_code,
         row.card_name,
         row.suffix_number,
         row.printed_identity_modifier,
         row.finish_key,
         row.tcgdex_external_id,
         row.external_mapping_id::bigint,
         row.external_ids,
         row.ai_metadata,
         row.provenance_ref
       from jsonb_to_recordset($1::jsonb) as row(
         suffix_parent_id text,
         suffix_child_id text,
         base_parent_id text,
         set_id text,
         set_code text,
         card_name text,
         suffix_number text,
         printed_identity_modifier text,
         finish_key text,
         tcgdex_external_id text,
         external_mapping_id text,
         external_ids jsonb,
         ai_metadata jsonb,
         provenance_ref text
       )`,
      [JSON.stringify(targets)],
    );
    const shape = await client.query(
      `select
         count(*)::int as target_rows,
         count(*) filter (where finish_key <> 'normal')::int as non_normal_suffix_rows,
         count(*) filter (where tcgdex_external_id is null or external_mapping_id is null)::int as missing_mapping_rows
       from pkg08m_targets`,
    );
    const shapeRow = shape.rows[0];
    if (shapeRow.target_rows !== 3 || shapeRow.non_normal_suffix_rows !== 0 || shapeRow.missing_mapping_rows !== 0) {
      throw new Error(`target shape mismatch: ${JSON.stringify(shapeRow)}`);
    }
    const collision = await client.query(
      `select
         (select count(*)::int
          from pkg08m_targets t
          join public.card_prints cp
            on cp.id = t.suffix_parent_id
            or (
              cp.set_id = t.set_id
              and cp.number_plain = regexp_replace(t.suffix_number, '[^0-9]', '', 'g')
              and coalesce(cp.printed_identity_modifier, '') = t.printed_identity_modifier
              and coalesce(cp.variant_key, '') = ''
              and cp.set_identity_model = 'standard'
            )) as suffix_parent_collisions,
         (select count(*)::int
          from pkg08m_targets t
          join public.card_printings cpr
            on cpr.id = t.suffix_child_id
            or (cpr.card_print_id = t.suffix_parent_id and cpr.finish_key = t.finish_key)) as suffix_child_collisions,
         (select count(*)::int
          from pkg08m_targets t
          join public.external_mappings em
            on em.id = t.external_mapping_id
           and em.source = 'tcgdex'
           and em.external_id = t.tcgdex_external_id
           and em.card_print_id = t.base_parent_id) as expected_base_mappings`,
    );
    const collisionRow = collision.rows[0];
    if (collisionRow.suffix_parent_collisions !== 0 || collisionRow.suffix_child_collisions !== 0 || collisionRow.expected_base_mappings !== 3) {
      throw new Error(`collision guard failed: ${JSON.stringify(collisionRow)}`);
    }
    const parentInsert = await client.query(
      `insert into public.card_prints (
         id,
         set_id,
         set_code,
         number,
         name,
         variant_key,
         printed_identity_modifier,
         set_identity_model,
         external_ids,
         ai_metadata
       )
       select
         suffix_parent_id,
         set_id,
         set_code,
         suffix_number,
         card_name,
         '',
         printed_identity_modifier,
         'standard',
         external_ids,
         ai_metadata
       from pkg08m_targets`,
    );
    const mappingUpdate = await client.query(
      `update public.external_mappings em
       set card_print_id = t.suffix_parent_id,
           meta = coalesce(em.meta, '{}'::jsonb) || jsonb_build_object(
             'package_id', $1::text,
             'split_from_card_print_id', t.base_parent_id::text
           )
       from pkg08m_targets t
       where em.id = t.external_mapping_id
         and em.card_print_id = t.base_parent_id
         and em.source = 'tcgdex'
         and em.external_id = t.tcgdex_external_id`,
      [PACKAGE_ID],
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id,
         card_print_id,
         finish_key,
         is_provisional,
         provenance_source,
         provenance_ref,
         created_by
       )
       select
         suffix_child_id,
         suffix_parent_id,
         finish_key,
         false,
         $1::text,
         provenance_ref,
         $2::text
       from pkg08m_targets`,
      [PROVENANCE_SOURCE, CREATED_BY],
    );
    if (parentInsert.rowCount !== 3 || mappingUpdate.rowCount !== 3 || childInsert.rowCount !== 3) {
      throw new Error(`write count mismatch: ${JSON.stringify({
        parent_rows: parentInsert.rowCount,
        mapping_rows: mappingUpdate.rowCount,
        child_rows: childInsert.rowCount,
      })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08m_targets) as target_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg08m_suffix_parent_split_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg08m_suffix_parent_split_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  const rows = report.scope.target_rows.map((row) => [
    row.set_key,
    row.base_number,
    row.suffix_number,
    row.card_name,
    row.finish_key,
    row.base_parent_id,
  ]);
  return `# PKG-08M Suffix Parent Split Guarded Dry Run V1

Rollback-only dry run for suffix-number split repair. No durable write was authorized or performed.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- target_parent_inserts: ${report.scope.target_parent_inserts}
- target_child_inserts: ${report.scope.target_child_inserts}
- target_mapping_transfers: ${report.scope.target_mapping_transfers}
- stop_findings: ${report.stop_findings.length}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}

${markdownTable(['set', 'base', 'suffix', 'card', 'suffix finish', 'base parent'], rows)}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Exclusions

- No deletes.
- No unsupported cleanup.
- Existing base parent child printings are preserved.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08M Suffix Parent Split Guarded Dry Run Checkpoint V1](20260610_pkg08m_suffix_parent_split_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for 3 suffix parent splits; no deletes, cleanup, migrations, or durable writes. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08m_suffix_parent_split_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08m_suffix_parent_split_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.split_readiness === 'blocked_split_parent_required');
const targets = buildTargets(sourceRows);
const packageFingerprint = sha256(stableJson(targets.map((row) => ({
  set_key: row.set_key,
  base_number: row.base_number,
  suffix_number: row.suffix_number,
  card_name: row.card_name,
  finish_key: row.finish_key,
  tcgdex_external_id: row.tcgdex_external_id,
  base_parent_id: row.base_parent_id,
  printed_identity_modifier: row.printed_identity_modifier,
}))));

const conn = connectionString();
let execution;
if (!conn) {
  execution = {
    status: 'blocked_no_database_connection_string',
    error_message: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
    before_snapshot: null,
    after_snapshot: null,
    rollback_proof_rows: [],
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    execution = await runDryRun(client, targets, packageFingerprint);
  } finally {
    await client.end().catch(() => {});
  }
}

const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
const stopFindings = [];
if (targets.length !== 3) stopFindings.push('target_rows_not_3');
if (targets.some((row) => row.finish_key !== 'normal')) stopFindings.push('non_normal_suffix_finish_present');
if (targets.some((row) => !row.tcgdex_external_id || !row.external_mapping_id)) stopFindings.push('target_mapping_missing');
if (execution.status !== 'pkg08m_suffix_parent_split_completed_rolled_back_no_durable_change') stopFindings.push('dry_run_not_passed');
if (execution.error_message) stopFindings.push(`dry_run_error:${execution.error_message}`);
if (!durableMatch) stopFindings.push('durable_after_snapshot_differs_from_before_snapshot');
if (execution.before_snapshot?.counts?.suffix_parent_rows !== 0) stopFindings.push('before_suffix_parent_rows_present');
if (execution.before_snapshot?.counts?.suffix_child_rows !== 0) stopFindings.push('before_suffix_child_rows_present');
if (execution.before_snapshot?.counts?.tcgdex_mapping_rows !== 3) stopFindings.push('before_tcgdex_mapping_rows_not_3');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08m_suffix_parent_split_guarded_dry_run_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: packageFingerprint,
  audit_only: false,
  rollback_only: true,
  dry_run_status: execution.status,
  durable_db_writes_performed: false,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  real_apply_authorized: false,
  scope: {
    source_rows: sourceRows.length,
    target_parent_inserts: targets.length,
    target_child_inserts: targets.length,
    target_mapping_transfers: targets.length,
    by_set: countBy(targets, (row) => row.set_key),
    by_finish: countBy(targets, (row) => row.finish_key),
    target_rows: targets,
  },
  before_snapshot: execution.before_snapshot,
  after_snapshot: execution.after_snapshot,
  durable_after_snapshot_matches_before_snapshot: durableMatch,
  rollback_proof_rows: execution.rollback_proof_rows,
  stop_findings: stopFindings,
  recommended_real_apply_approval_text: stopFindings.length === 0
    ? `Approve real PKG-08M-SUFFIX-PARENT-SPLIT apply only. Fingerprint: ${packageFingerprint}. Scope: 3 suffix parent inserts, 3 suffix child card_printing inserts, 3 TCGdex mapping transfers across 3 sets; finish normal=3; existing base parents preserved; unsupported cleanup deferred. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.`
    : null,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: {
    target_parent_inserts: report.scope.target_parent_inserts,
    target_child_inserts: report.scope.target_child_inserts,
    target_mapping_transfers: report.scope.target_mapping_transfers,
    by_set: report.scope.by_set,
    by_finish: report.scope.by_finish,
  },
  stop_findings: report.stop_findings,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));

if (stopFindings.length !== 0) process.exitCode = 1;
