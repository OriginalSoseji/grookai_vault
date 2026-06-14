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
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg14a_pl4_zapdos_g_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg14a_pl4_zapdos_g_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg14a_pl4_zapdos_g_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260611_pkg14a_pl4_zapdos_g_real_apply_checkpoint_v1.md');
const CHECKPOINT_INDEX = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');

const PACKAGE_ID = 'PKG-14A-PL4-ZAPDOS-G-PARENT-NAME-MAPPING-TRANSFER';
const CREATED_BY = 'pkg14a_pl4_zapdos_g_real_apply_v1';
const EXPECTED_DRY_RUN_PROOF = '108007ab690a57541e588b51584ecedbb2ce0502ecc93ea5cdae120e854b9d8c';

const TARGET = {
  set_code: 'pl4',
  card_number: '12',
  number_plain: '12',
  target_card_print_id: '8716f287-3497-49b2-a499-9c1e026a6a94',
  source_card_print_id: '6b44fbe5-21e8-4ee9-9065-195f24d74eb8',
  current_target_name: 'Zapdos',
  target_name: 'Zapdos G',
  source_parent_name: 'Shinx',
  source_parent_number: 'SH12',
  preserved_source_mapping: { source: 'tcgdex', external_id: 'pl4-SH12' },
  preserved_target_mapping: { source: 'tcgdex', external_id: 'pl4-12' },
  transfer_mappings: [
    { source: 'tcgplayer', external_id: '90726' },
    { source: 'justtcg', external_id: 'pokemon-arceus-zapdos-g-holo-rare' },
  ],
};

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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.execution?.dry_run_status !== 'pkg14a_zapdos_g_completed_rolled_back_no_durable_change') findings.push('dry_run_status_not_passed');
  if (dryRun.execution?.rollback_verified !== true) findings.push('dry_run_rollback_not_verified');
  if (dryRun.execution?.dry_run_proof_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if ((dryRun.execution?.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.db_writes_performed !== false || dryRun.durable_db_writes_performed !== false) findings.push('dry_run_reports_durable_write');
  if (dryRun.migrations_created !== false || dryRun.cleanup_performed !== false || dryRun.quarantine_performed !== false) findings.push('dry_run_reports_forbidden_action');
  const counts = dryRun.execution?.write_counts_inside_rolled_back_transaction ?? {};
  if (counts.parent_name_updates !== 1) findings.push('dry_run_parent_update_scope_mismatch');
  if (counts.card_print_identity_updates !== 1) findings.push('dry_run_identity_update_scope_mismatch');
  if (counts.external_mapping_transfers !== 2) findings.push('dry_run_mapping_transfer_scope_mismatch');
  if (counts.child_writes !== 0 || counts.deletes !== 0) findings.push('dry_run_child_or_delete_scope_present');
  return findings;
}

async function captureSnapshot(client) {
  const result = await client.query(
    `with target_ids as (
       select $1::uuid as target_card_print_id, $2::uuid as source_card_print_id
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.ai_metadata,
       null::text as finish_key,
       null::text as source,
       null::text as external_id,
       null::text as normalized_printed_name,
       null::text as identity_key_hash
     from target_ids t
     join public.card_prints cp on cp.id in (t.target_card_print_id, t.source_card_print_id)
     union all
     select
       'child_printing',
       cpr.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       null::jsonb,
       cpr.finish_key,
       null::text,
       null::text,
       null::text,
       null::text
     from target_ids t
     join public.card_printings cpr on cpr.card_print_id in (t.target_card_print_id, t.source_card_print_id)
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'external_mapping',
       em.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       em.meta,
       null::text,
       em.source,
       em.external_id,
       null::text,
       null::text
     from target_ids t
     join public.external_mappings em on em.card_print_id in (t.target_card_print_id, t.source_card_print_id)
     join public.card_prints cp on cp.id = em.card_print_id
     union all
     select
       'card_print_identity',
       cpi.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cpi.identity_payload,
       null::text,
       null::text,
       null::text,
       cpi.normalized_printed_name,
       cpi.identity_key_hash
     from target_ids t
     join public.card_print_identity cpi on cpi.card_print_id in (t.target_card_print_id, t.source_card_print_id) and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code, number_plain, number, name, finish_key nulls last, source nulls last, external_id nulls last, row_id`,
    [TARGET.target_card_print_id, TARGET.source_card_print_id],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function applyPackage(client) {
  const beforeSnapshot = await captureSnapshot(client);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg14a_target (
         target_card_print_id uuid primary key,
         source_card_print_id uuid not null,
         set_code text not null,
         card_number text not null,
         current_target_name text not null,
         target_name text not null,
         source_parent_name text not null,
         source_parent_number text not null
       ) on commit drop`,
    );
    await client.query(
      `create temporary table pkg14a_mapping_transfer (
         source text not null,
         external_id text not null,
         from_card_print_id uuid not null,
         to_card_print_id uuid not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg14a_target values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8)`,
      [
        TARGET.target_card_print_id,
        TARGET.source_card_print_id,
        TARGET.set_code,
        TARGET.card_number,
        TARGET.current_target_name,
        TARGET.target_name,
        TARGET.source_parent_name,
        TARGET.source_parent_number,
      ],
    );
    await client.query(
      `insert into pkg14a_mapping_transfer
       select row.source, row.external_id, $1::uuid, $2::uuid
       from jsonb_to_recordset($3::jsonb) as row(source text, external_id text)`,
      [TARGET.source_card_print_id, TARGET.target_card_print_id, JSON.stringify(TARGET.transfer_mappings)],
    );

    const guard = await client.query(
      `with projection as (
         select
           t.target_card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             cp.set_code,
             s.code,
             cp.number,
             cp.number_plain,
             t.target_name,
             cp.variant_key,
             coalesce(cp.printed_total, s.printed_total),
             coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from pkg14a_target t
         join public.card_prints cp on cp.id = t.target_card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       select
         (select count(*)::int from pkg14a_target) as target_rows,
         (select count(*)::int
          from pkg14a_target t
          join public.card_prints cp on cp.id = t.target_card_print_id
          where cp.set_code = t.set_code and cp.number = t.card_number and cp.number_plain = t.card_number and cp.name = t.current_target_name) as target_parent_current_rows,
         (select count(*)::int
          from pkg14a_target t
          join public.card_prints cp on cp.id = t.source_card_print_id
          where cp.set_code = t.set_code and cp.number = t.source_parent_number and cp.name = t.source_parent_name and cp.printed_identity_modifier = 'number_prefix:SH') as source_parent_preserved_rows,
         (select count(*)::int
          from pkg14a_target t
          join public.card_printings cpr on cpr.card_print_id = t.target_card_print_id and cpr.finish_key in ('holo', 'reverse')) as target_child_rows,
         (select count(*)::int
          from public.external_mappings em
          where em.card_print_id = (select target_card_print_id from pkg14a_target)
            and em.source = $1 and em.external_id = $2) as target_tcgdex_rows,
         (select count(*)::int
          from public.external_mappings em
          where em.card_print_id = (select source_card_print_id from pkg14a_target)
            and em.source = $3 and em.external_id = $4) as source_shinx_tcgdex_rows,
         (select count(*)::int
          from pkg14a_mapping_transfer mt
          join public.external_mappings em
            on em.source = mt.source and em.external_id = mt.external_id and em.card_print_id = mt.from_card_print_id) as transfer_mappings_on_source,
         (select count(*)::int
          from pkg14a_mapping_transfer mt
          join public.external_mappings em
            on em.source = mt.source and em.external_id = mt.external_id and em.card_print_id = mt.to_card_print_id) as transfer_mappings_already_on_target,
         (select count(*)::int from projection where projected->>'status' = 'ready' and projected->>'normalized_printed_name' = 'zapdos g') as ready_identity_projection_rows,
         (select count(*)::int
          from projection p
          join public.card_print_identity cpi
            on cpi.is_active = true
           and cpi.card_print_id <> p.target_card_print_id
           and cpi.identity_domain = p.projected->>'identity_domain'
           and cpi.identity_key_version = p.projected->>'identity_key_version'
           and cpi.identity_key_hash = p.projected->>'identity_key_hash') as identity_hash_collisions`,
      [
        TARGET.preserved_target_mapping.source,
        TARGET.preserved_target_mapping.external_id,
        TARGET.preserved_source_mapping.source,
        TARGET.preserved_source_mapping.external_id,
      ],
    );
    const guardRow = guard.rows[0];
    if (
      guardRow.target_rows !== 1 ||
      guardRow.target_parent_current_rows !== 1 ||
      guardRow.source_parent_preserved_rows !== 1 ||
      guardRow.target_child_rows !== 2 ||
      guardRow.target_tcgdex_rows !== 1 ||
      guardRow.source_shinx_tcgdex_rows !== 1 ||
      guardRow.transfer_mappings_on_source !== 2 ||
      guardRow.transfer_mappings_already_on_target !== 0 ||
      guardRow.ready_identity_projection_rows !== 1 ||
      guardRow.identity_hash_collisions !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guardRow)}`);
    }

    const parentUpdate = await client.query(
      `update public.card_prints cp
       set name = t.target_name,
           ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
             'pkg14a_previous_name', cp.name,
             'pkg14a_target_name', t.target_name,
             'pkg14a_package_id', $1::text,
             'pkg14a_created_by', $2::text
           )
       from pkg14a_target t
       where cp.id = t.target_card_print_id
         and cp.name = t.current_target_name
       returning cp.id::text, cp.name`,
      [PACKAGE_ID, CREATED_BY],
    );
    if (parentUpdate.rowCount !== 1) throw new Error(`parent update count mismatch: ${parentUpdate.rowCount}`);

    const identityUpdate = await client.query(
      `with projection as (
         select
           t.target_card_print_id,
           public.card_print_identity_backfill_projection_v1(
             s.source,
             cp.set_code,
             s.code,
             cp.number,
             cp.number_plain,
             cp.name,
             cp.variant_key,
             coalesce(cp.printed_total, s.printed_total),
             coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
           ) as projected
         from pkg14a_target t
         join public.card_prints cp on cp.id = t.target_card_print_id
         left join public.sets s on s.id = cp.set_id
       )
       update public.card_print_identity cpi
       set identity_domain = p.projected->>'identity_domain',
           set_code_identity = p.projected->>'set_code_identity',
           printed_number = p.projected->>'printed_number',
           normalized_printed_name = p.projected->>'normalized_printed_name',
           source_name_raw = nullif(p.projected->>'source_name_raw', ''),
           identity_payload = coalesce(p.projected->'identity_payload', '{}'::jsonb),
           identity_key_version = p.projected->>'identity_key_version',
           identity_key_hash = p.projected->>'identity_key_hash'
       from projection p
       where cpi.card_print_id = p.target_card_print_id
         and cpi.is_active = true
         and p.projected->>'status' = 'ready'
       returning cpi.id::text, cpi.normalized_printed_name, cpi.identity_key_hash`,
    );
    if (identityUpdate.rowCount !== 1) throw new Error(`identity update count mismatch: ${identityUpdate.rowCount}`);

    const mappingTransfer = await client.query(
      `update public.external_mappings em
       set card_print_id = mt.to_card_print_id,
           meta = coalesce(em.meta, '{}'::jsonb) || jsonb_build_object(
             'pkg14a_transferred_from_card_print_id', mt.from_card_print_id::text,
             'pkg14a_transferred_to_card_print_id', mt.to_card_print_id::text,
             'pkg14a_package_id', $1::text,
             'pkg14a_created_by', $2::text
           )
       from pkg14a_mapping_transfer mt
       where em.source = mt.source
         and em.external_id = mt.external_id
         and em.card_print_id = mt.from_card_print_id
       returning em.source, em.external_id, em.card_print_id::text`,
      [PACKAGE_ID, CREATED_BY],
    );
    if (mappingTransfer.rowCount !== 2) throw new Error(`mapping transfer count mismatch: ${mappingTransfer.rowCount}`);

    const proof = await client.query(
      `select
         (select count(*)::int from public.card_prints where id = $1::uuid and name = 'Zapdos G') as target_parent_updated,
         (select count(*)::int from public.card_print_identity where card_print_id = $1::uuid and is_active = true and normalized_printed_name = 'zapdos g') as target_identity_updated,
         (select count(*)::int from pkg14a_mapping_transfer mt join public.external_mappings em on em.source = mt.source and em.external_id = mt.external_id and em.card_print_id = mt.to_card_print_id) as transferred_mappings_on_target,
         (select count(*)::int from public.card_prints where id = $2::uuid and name = 'Shinx' and number = 'SH12' and printed_identity_modifier = 'number_prefix:SH') as source_parent_preserved,
         (select count(*)::int from public.external_mappings where card_print_id = $2::uuid and source = 'tcgdex' and external_id = 'pl4-SH12') as source_tcgdex_preserved,
         (select count(*)::int from public.card_printings where card_print_id = $1::uuid) as target_child_rows,
         (select count(*)::int from public.card_printings where card_print_id = $2::uuid) as source_child_rows`,
      [TARGET.target_card_print_id, TARGET.source_card_print_id],
    );
    const proofRow = proof.rows[0];
    if (
      proofRow.target_parent_updated !== 1 ||
      proofRow.target_identity_updated !== 1 ||
      proofRow.transferred_mappings_on_target !== 2 ||
      proofRow.source_parent_preserved !== 1 ||
      proofRow.source_tcgdex_preserved !== 1 ||
      proofRow.target_child_rows !== 2 ||
      proofRow.source_child_rows !== 2
    ) {
      throw new Error(`proof failed: ${JSON.stringify(proofRow)}`);
    }

    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client);
    return {
      apply_status: 'pkg14a_zapdos_g_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      guard: guardRow,
      proof: proofRow,
      write_counts: {
        parent_name_updates: parentUpdate.rowCount,
        card_print_identity_updates: identityUpdate.rowCount,
        external_mapping_transfers: mappingTransfer.rowCount,
        child_writes: 0,
        deletes: 0,
      },
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client).catch(() => null);
    return {
      apply_status: 'pkg14a_zapdos_g_real_apply_failed_rolled_back',
      committed: false,
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      write_counts: {},
      stop_findings: [`real_apply_error:${error.message}`],
    };
  }
}

function renderMarkdown(report) {
  const writeRows = Object.entries(report.execution.write_counts ?? {}).map(([key, value]) => [key, value]);
  return `# PKG-14A PL4 Zapdos G Real Apply V1

Real apply for the guarded PL4 Zapdos G parent-name and mapping-transfer correction.

## Result

- apply_status: ${report.execution.apply_status}
- committed: ${report.execution.committed}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`
- stop_findings: ${report.execution.stop_findings.length}

${markdownTable(['write', 'count'], writeRows)}

## Safety

- migrations_created: ${report.migrations_created}
- global_apply_performed: ${report.global_apply_performed}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- child_writes: ${report.execution.write_counts?.child_writes ?? 0}
- deletes: ${report.execution.write_counts?.deletes ?? 0}

Shinx SH12 was preserved and retains \`tcgdex:pl4-SH12\`.
`;
}

function checkpointMarkdown(report) {
  return `# PKG-14A PL4 Zapdos G Real Apply Checkpoint V1

- package_id: ${report.package_id}
- generated_at: ${report.generated_at}
- apply_status: ${report.execution.apply_status}
- committed: ${report.execution.committed}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_proof_sha256: \`${report.dry_run_proof_sha256}\`

## Scope

- parent_name_updates: ${report.execution.write_counts?.parent_name_updates ?? 0}
- card_print_identity_updates: ${report.execution.write_counts?.card_print_identity_updates ?? 0}
- external_mapping_transfers: ${report.execution.write_counts?.external_mapping_transfers ?? 0}
- child_writes: ${report.execution.write_counts?.child_writes ?? 0}
- deletes: ${report.execution.write_counts?.deletes ?? 0}
- migrations_created: ${report.migrations_created}

## Post-Apply Fact

PL4 #12 is now represented as Zapdos G, with the Zapdos-labelled TCGplayer and JustTCG mappings transferred off Shinx SH12. Shinx SH12 remains preserved as a distinct shiny subset parent.
`;
}

function updateCheckpointIndex() {
  const line = '| 2026-06-11 | [PKG-14A PL4 Zapdos G Real Apply Checkpoint V1](20260611_pkg14a_pl4_zapdos_g_real_apply_checkpoint_v1.md) | Real-applied 1 Zapdos G parent-name update, 1 identity projection update, and 2 mapping transfers; preserved Shinx SH12. No migrations, child writes, deletes, cleanup, or quarantine. |';
  const current = fsSync.existsSync(CHECKPOINT_INDEX) ? fsSync.readFileSync(CHECKPOINT_INDEX, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260611_pkg14a_pl4_zapdos_g_real_apply_checkpoint_v1.md')) {
    fsSync.writeFileSync(CHECKPOINT_INDEX, current.split('\n').map((existingLine) => (
      existingLine.includes('20260611_pkg14a_pl4_zapdos_g_real_apply_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(CHECKPOINT_INDEX, `${current.trimEnd()}\n${line}\n`);
  }
}

const dryRun = await readJson(DRY_RUN_JSON);
const dryRunFindings = validateDryRun(dryRun);
const conn = connectionString();
let execution;
if (dryRunFindings.length) {
  execution = {
    apply_status: 'blocked_dry_run_validation_failed',
    committed: false,
    stop_findings: dryRunFindings,
    write_counts: {},
  };
} else if (!conn) {
  execution = {
    apply_status: 'blocked_missing_database_connection',
    committed: false,
    stop_findings: ['missing_database_connection'],
    write_counts: {},
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    execution = await applyPackage(client);
  } finally {
    await client.end().catch(() => {});
  }
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg14a_pl4_zapdos_g_real_apply_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
  dry_run_artifact: path.relative(ROOT, DRY_RUN_JSON),
  dry_run_proof_sha256: dryRun.execution?.dry_run_proof_sha256 ?? null,
  db_write_committed: execution.committed === true,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  global_apply_performed: false,
  unsupported_cleanup_performed: false,
  scope: TARGET,
  execution,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, checkpointMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: path.relative(ROOT, OUTPUT_JSON),
  output_md: path.relative(ROOT, OUTPUT_MD),
  checkpoint: path.relative(ROOT, CHECKPOINT_MD),
  apply_status: execution.apply_status,
  committed: execution.committed,
  write_counts: execution.write_counts,
  stop_findings: execution.stop_findings,
}, null, 2));
