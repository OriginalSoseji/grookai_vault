import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08b_parent_identity_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08R-APPEND-ONLY-DUPLICATE-NON-DELETE-CHILD-INSERT';
const CREATED_BY = 'pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_v1';
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

function buildTarget(sourceRows) {
  const row = sourceRows.find((item) => (
    item.adjudication_lane === 'duplicate_exact_parent'
    && item.set_key === 'sv03.5'
    && item.card_number === '25'
    && item.card_name === 'Pikachu'
    && item.finish_key === 'cosmos'
  ));
  if (!row) return { target: null, blocked_reason: 'source_row_not_found' };
  const populated = row.same_number_candidates.filter((candidate) => Number(candidate.child_count) > 0);
  const empty = row.same_number_candidates.filter((candidate) => Number(candidate.child_count) === 0);
  if (populated.length !== 1 || empty.length !== 1) {
    return { target: null, blocked_reason: 'expected_one_populated_and_one_empty_candidate' };
  }
  return {
    target: {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      survivor_card_print_id: populated[0].card_print_id,
      preserved_duplicate_card_print_id: empty[0].card_print_id,
      card_printing_id: crypto.randomUUID(),
      provenance_source: PROVENANCE_SOURCE,
      provenance_ref: `${row.set_key}:${row.card_number}:${row.finish_key}`,
      created_by: CREATED_BY,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
    },
    blocked_reason: null,
  };
}

async function captureSnapshot(client, target) {
  const ids = [target.survivor_card_print_id, target.preserved_duplicate_card_print_id];
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.variant_key,
       cp.gv_id,
       cp.printed_identity_modifier,
       cp.set_identity_model,
       case
         when cp.id = $1::uuid then 'canonical_survivor_parent'
         when cp.id = $2::uuid then 'preserved_append_only_variant_parent'
         else 'unknown'
       end as target_role,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as card_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
       coalesce((select count(*)::int from public.card_feed_events cfe where cfe.card_print_id = cp.id), 0) as card_feed_event_count,
       coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
       coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_instance_count,
       coalesce((select count(*)::int from public.shared_cards sc where sc.card_id = cp.id), 0) as shared_card_count,
       coalesce((select count(*)::int from public.pricing_watch pw where pw.card_print_id = cp.id), 0) as pricing_watch_count
     from public.card_prints cp
     where cp.id = any($3::uuid[])
     order by target_role, cp.id`,
    [target.survivor_card_print_id, target.preserved_duplicate_card_print_id, ids],
  );
  const counts = await client.query(
    `select
       (select count(*)::int from public.card_prints where id = $1::uuid) as survivor_parent_rows,
       (select count(*)::int from public.card_prints where id = $2::uuid) as preserved_duplicate_parent_rows,
       (select count(*)::int from public.card_printings where card_print_id = $1::uuid and finish_key = $3::text) as survivor_target_child_rows,
       (select count(*)::int from public.card_printings where card_print_id = $2::uuid) as preserved_duplicate_child_rows,
       (select count(*)::int from public.card_feed_events where card_print_id = $2::uuid) as preserved_duplicate_feed_rows,
       (select count(*)::int from public.external_mappings where card_print_id = $2::uuid) as preserved_duplicate_mapping_rows,
       (select count(*)::int from public.vault_items where card_id = $2::uuid) as preserved_duplicate_vault_rows,
       (select count(*)::int from public.vault_item_instances where card_print_id = $2::uuid) as preserved_duplicate_vault_instance_rows,
       (select count(*)::int from public.shared_cards where card_id = $2::uuid) as preserved_duplicate_shared_card_rows`,
    [target.survivor_card_print_id, target.preserved_duplicate_card_print_id, target.finish_key],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: counts.rows[0],
  };
}

async function runDryRun(client, target, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, target);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08r_target (
         card_printing_id uuid primary key,
         survivor_card_print_id uuid not null,
         preserved_duplicate_card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         created_by text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08r_target
       values ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::text, $7::text)`,
      [
        target.card_printing_id,
        target.survivor_card_print_id,
        target.preserved_duplicate_card_print_id,
        target.finish_key,
        target.provenance_source,
        target.provenance_ref,
        target.created_by,
      ],
    );
    const guard = await client.query(
      `select
         (select count(*)::int from pkg08r_target) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg08r_target t on t.survivor_card_print_id = cp.id) as survivor_rows,
         (select count(*)::int from public.card_prints cp join pkg08r_target t on t.preserved_duplicate_card_print_id = cp.id) as preserved_duplicate_rows,
         (select count(*)::int from public.card_printings cpr join pkg08r_target t on t.survivor_card_print_id = cpr.card_print_id and t.finish_key = cpr.finish_key) as survivor_existing_finish_rows,
         (select count(*)::int from public.card_printings cpr join pkg08r_target t on t.preserved_duplicate_card_print_id = cpr.card_print_id) as preserved_duplicate_child_rows,
         (select count(*)::int from public.card_printings cpr join pkg08r_target t on t.card_printing_id = cpr.id) as planned_child_id_collisions,
         (select count(*)::int from public.card_feed_events cfe join pkg08r_target t on t.preserved_duplicate_card_print_id = cfe.card_print_id) as preserved_duplicate_feed_rows,
         (select count(*)::int from public.card_prints cp join pkg08r_target t on t.preserved_duplicate_card_print_id = cp.id where cp.variant_key = 'pokemon_together_stamp') as preserved_duplicate_stamp_variant_rows,
         (select count(*)::int from pkg08r_target t left join public.finish_keys fk on fk.key = t.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_rows`,
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== 1
      || guardRow.survivor_rows !== 1
      || guardRow.preserved_duplicate_rows !== 1
      || guardRow.survivor_existing_finish_rows !== 0
      || guardRow.preserved_duplicate_child_rows !== 0
      || guardRow.planned_child_id_collisions !== 0
      || guardRow.preserved_duplicate_feed_rows !== 1
      || guardRow.preserved_duplicate_stamp_variant_rows !== 1
      || guardRow.inactive_finish_rows !== 0
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guardRow)}`);
    }
    await client.query(
      `select cp.id
       from public.card_prints cp
       join (
         select survivor_card_print_id as card_print_id from pkg08r_target
         union
         select preserved_duplicate_card_print_id as card_print_id from pkg08r_target
       ) target on target.card_print_id = cp.id
       for update of cp`,
    );
    const childInsert = await client.query(
      `insert into public.card_printings (
         id, card_print_id, finish_key, is_provisional, provenance_source, provenance_ref, created_by
       )
       select card_printing_id, survivor_card_print_id, finish_key, false, provenance_source, provenance_ref, created_by
       from pkg08r_target`,
    );
    if (childInsert.rowCount !== 1) {
      throw new Error(`write count mismatch: ${JSON.stringify({ child_inserts: childInsert.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         $3::int as child_inserts,
         0::int as parent_updates,
         0::int as parent_deletes,
         0::int as dependency_transfers`,
      [PACKAGE_ID, packageFingerprint, childInsert.rowCount],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, target);
    return {
      status: 'pkg08r_append_only_duplicate_non_delete_child_insert_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, target).catch(() => null);
    return {
      status: 'pkg08r_append_only_duplicate_non_delete_child_insert_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
    };
  }
}

function renderMarkdown(report) {
  return `# PKG-08R Append-Only Duplicate Non-Delete Child Insert Guarded Dry Run V1

Rollback-only dry run for the remaining \`sv03.5\` Pikachu #025 cosmos row.

The preserved duplicate parent is a \`pokemon_together_stamp\` variant with append-only feed history. This package does not update, transfer, hide, merge, delete, or quarantine that parent.

## Status

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256 ?? ''}\`
- child_inserts: ${report.scope?.child_inserts ?? 0}
- parent_updates: ${report.scope?.parent_updates ?? 0}
- parent_deletes: ${report.scope?.parent_deletes ?? 0}
- dependency_transfers: ${report.scope?.dependency_transfers ?? 0}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- stop_findings: ${report.stop_findings?.length ?? 0}

## Target

${markdownTable(['set', 'card', 'finish', 'survivor_parent', 'preserved_parent'], [[
  report.scope?.target?.set_key,
  `${report.scope?.target?.card_number} ${report.scope?.target?.card_name}`,
  report.scope?.target?.finish_key,
  report.scope?.target?.survivor_card_print_id,
  report.scope?.target?.preserved_duplicate_card_print_id,
]])}

## Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08R Append-Only Duplicate Non-Delete Child Insert Guarded Dry Run Checkpoint V1](20260610_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for sv03.5 Pikachu #025 cosmos child insert; preserves Pokemon Together stamped parent with append-only feed history. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const { target, blocked_reason: blockedReason } = buildTarget(source.rows ?? []);
const packageFingerprint = target ? sha256(stableJson({
  package_id: PACKAGE_ID,
  survivor_card_print_id: target.survivor_card_print_id,
  preserved_duplicate_card_print_id: target.preserved_duplicate_card_print_id,
  finish_key: target.finish_key,
  write_shape: 'child_insert_only_no_parent_write_no_transfer_no_delete',
})) : null;
const conn = connectionString();
let report;

if (!conn || !target) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_status: !conn ? 'blocked_no_database_connection_string' : 'blocked_no_target',
    durable_db_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
    stop_findings: [!conn ? 'database_connection_unavailable' : blockedReason],
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const execution = await runDryRun(client, target, packageFingerprint);
    const durableMatch = Boolean(execution.before_snapshot?.hash_sha256)
      && execution.before_snapshot.hash_sha256 === execution.after_snapshot?.hash_sha256;
    const stopFindings = [
      ...(execution.status !== 'pkg08r_append_only_duplicate_non_delete_child_insert_completed_rolled_back_no_durable_change' ? ['dry_run_not_passed'] : []),
      ...(execution.error_message ? [`dry_run_error:${execution.error_message}`] : []),
      ...(!durableMatch ? ['durable_after_snapshot_differs_from_before_snapshot'] : []),
    ];
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08r_append_only_duplicate_non_delete_child_insert_guarded_dry_run_v1',
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
      unsupported_cleanup_performed: false,
      parent_updates_performed: false,
      parent_deletes_performed: false,
      dependency_transfers_performed: false,
      real_apply_authorized: false,
      scope: {
        child_inserts: execution.rollback_proof_rows?.[0]?.child_inserts ?? null,
        parent_updates: execution.rollback_proof_rows?.[0]?.parent_updates ?? null,
        parent_deletes: execution.rollback_proof_rows?.[0]?.parent_deletes ?? null,
        dependency_transfers: execution.rollback_proof_rows?.[0]?.dependency_transfers ?? null,
        target,
      },
      before_snapshot: execution.before_snapshot,
      after_snapshot: execution.after_snapshot,
      rollback_proof_rows: execution.rollback_proof_rows,
      durable_after_snapshot_matches_before_snapshot: durableMatch,
      recommended_real_apply_approval_text: stopFindings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 1 child-only card_printing insert for sv03.5/151 Pikachu #025 cosmos on canonical parent ${target.survivor_card_print_id}; preserved Pokemon Together stamped parent ${target.preserved_duplicate_card_print_id} remains untouched with append-only feed history. Dry-run proof: ${execution.before_snapshot?.hash_sha256} == ${execution.after_snapshot?.hash_sha256}. No parent writes. No dependency transfers. No deletes. No global apply. No migrations. No unsupported cleanup. No quarantine.`
        : null,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
  output_md: path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
  checkpoint_md: path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  scope: report.scope,
  before_hash: report.before_snapshot?.hash_sha256 ?? null,
  after_hash: report.after_snapshot?.hash_sha256 ?? null,
  durable_after_snapshot_matches_before_snapshot: report.durable_after_snapshot_matches_before_snapshot,
  recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  stop_findings: report.stop_findings,
}, null, 2));

if ((report.stop_findings ?? []).length !== 0) process.exitCode = 1;
