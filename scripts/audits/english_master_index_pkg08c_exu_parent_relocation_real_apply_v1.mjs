import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const GATE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_real_apply_gate_v1.json');
const DRY_RUN_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_real_apply_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_real_apply_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08c_exu_parent_relocation_real_apply_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08C-EXU-PARENT-RELOCATION';
const PACKAGE_FINGERPRINT = '89c340ab1b663ba736f85fe8b5715eb1ba95b61b2a0e26b8f81323bf26f00a62';
const DRY_RUN_PROOF_HASH = 'ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b';
const APPROVAL_TEXT = 'Approve real PKG-08C-EXU-PARENT-RELOCATION apply only. Fingerprint: 89c340ab1b663ba736f85fe8b5715eb1ba95b61b2a0e26b8f81323bf26f00a62. Scope: 28 parent relocations from ex10 to exu, 28 child printings preserved, 1 TCGdex mapping insert for the question-mark Unown. Dry-run proof: ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b == ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function validatePrerequisites({ gate, dryRun, targets }) {
  const findings = [];
  if (gate.required_operator_decision?.exact_approval_phrase_required !== APPROVAL_TEXT) findings.push('gate_approval_text_mismatch');
  if (gate.approval_gate_status !== 'ready_for_real_apply_operator_decision_apply_blocked_no_write') findings.push('gate_not_ready');
  if ((gate.stop_findings ?? []).length !== 0) findings.push('gate_stop_findings_present');
  if (gate.package_scope?.package_id !== PACKAGE_ID) findings.push('gate_wrong_package');
  if (gate.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('gate_fingerprint_mismatch');
  if (gate.package_scope?.target_parent_updates !== 28) findings.push('gate_parent_update_count_not_28');
  if (gate.package_scope?.mapping_inserts !== 1) findings.push('gate_mapping_insert_count_not_1');
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_wrong_package');
  if (dryRun.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('dry_run_fingerprint_mismatch');
  if (dryRun.dry_run_status !== 'pkg08c_exu_parent_relocation_completed_rolled_back_no_durable_change') findings.push('dry_run_not_passed');
  if (dryRun.before_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH || dryRun.after_snapshot?.hash_sha256 !== DRY_RUN_PROOF_HASH) {
    findings.push('dry_run_proof_hash_mismatch');
  }
  if (dryRun.durable_after_snapshot_matches_before_snapshot !== true) findings.push('dry_run_durable_state_not_proven_unchanged');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (targets.length !== 28) findings.push('target_count_not_28');
  if (targets.some((row) => row.from_set_code !== 'ex10' || row.to_set_code !== 'exu')) findings.push('non_ex10_to_exu_target_present');
  if (targets.some((row) => row.finish_key !== 'holo')) findings.push('non_holo_target_present');
  if (targets.some((row) => !row.tcgdex_external_id)) findings.push('target_external_id_missing');
  return findings;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, tcgdex_external_id text)
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       null::text as finish_key,
       null::text as source,
       null::text as external_id
     from target t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cp.set_id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cpr.finish_key,
       null::text as source,
       null::text as external_id
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'tcgdex_mapping' as row_type,
       em.id::text as row_id,
       null::text as set_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       null::text as finish_key,
       em.source,
       em.external_id
     from target t
     join public.external_mappings em
       on em.card_print_id = t.card_print_id
       or (em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id)
     left join public.card_prints cp on cp.id = em.card_print_id
     order by row_type, set_code nulls last, number nulls last, finish_key nulls last, external_id nulls last, row_id`,
    [JSON.stringify(targets.map((row) => ({
      card_print_id: row.card_print_id,
      tcgdex_external_id: row.tcgdex_external_id,
    })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      child_rows: result.rows.filter((row) => row.row_type === 'child').length,
      tcgdex_mapping_rows: result.rows.filter((row) => row.row_type === 'tcgdex_mapping').length,
      total_rows: result.rows.length,
    },
  };
}

async function preflightLiveTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         to_set_code text,
         live_number text,
         card_name text,
         finish_key text,
         tcgdex_external_id text
       )
     )
     select
       (select count(*)::int
        from target t
        join public.card_prints cp on cp.id = t.card_print_id
        where lower(cp.set_code) = 'ex10') as ex10_target_parents,
       (select count(*)::int
        from target t
        join public.card_prints cp on lower(cp.set_code) = lower(t.to_set_code)
         and cp.number = t.live_number
         and lower(cp.name) = lower(t.card_name)) as exu_parent_collisions,
       (select count(*)::int
        from target t
        join public.card_printings cpr on cpr.card_print_id = t.card_print_id and cpr.finish_key = t.finish_key) as target_holo_children,
       (select count(*)::int
        from target t
        join public.external_mappings em on em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id
        where em.card_print_id <> t.card_print_id) as mapping_wrong_parent_collisions,
       (select count(*)::int
        from target t
        join public.external_mappings em on em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id
        where em.card_print_id = t.card_print_id) as mapping_already_on_target,
       (select count(*)::int
        from target t
        left join public.external_mappings em on em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id
        where em.id is null) as missing_mapping_rows`,
    [JSON.stringify(targets)],
  );
  return result.rows[0];
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  const liveShape = await preflightLiveTargets(client, targets);
  const beforeFindings = [];
  if (liveShape.ex10_target_parents !== 28) beforeFindings.push(`ex10_target_parents_not_28:${liveShape.ex10_target_parents}`);
  if (liveShape.exu_parent_collisions !== 0) beforeFindings.push(`exu_parent_collisions_present:${liveShape.exu_parent_collisions}`);
  if (liveShape.target_holo_children !== 28) beforeFindings.push(`target_holo_children_not_28:${liveShape.target_holo_children}`);
  if (liveShape.mapping_wrong_parent_collisions !== 0) beforeFindings.push(`mapping_wrong_parent_collisions_present:${liveShape.mapping_wrong_parent_collisions}`);
  if (liveShape.mapping_already_on_target !== 27) beforeFindings.push(`mapping_already_on_target_not_27:${liveShape.mapping_already_on_target}`);
  if (liveShape.missing_mapping_rows !== 1) beforeFindings.push(`missing_mapping_rows_not_1:${liveShape.missing_mapping_rows}`);
  if (beforeFindings.length !== 0) {
    return {
      apply_status: 'blocked_before_real_apply_live_shape_mismatch',
      committed: false,
      before_snapshot: beforeSnapshot,
      after_snapshot: beforeSnapshot,
      post_apply_rows: [],
      live_shape: liveShape,
      write_counts: {},
      stop_findings: beforeFindings,
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08c_targets (
         card_print_id uuid primary key,
         to_set_id uuid not null,
         to_set_code text not null,
         live_number text not null,
         card_name text not null,
         finish_key text not null,
         tcgdex_external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08c_targets
       select
         row.card_print_id::uuid,
         row.to_set_id::uuid,
         row.to_set_code,
         row.live_number,
         row.card_name,
         row.finish_key,
         row.tcgdex_external_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         to_set_id text,
         to_set_code text,
         live_number text,
         card_name text,
         finish_key text,
         tcgdex_external_id text
       )`,
      [JSON.stringify(targets)],
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg08c_targets t join public.card_prints cp on cp.id = t.card_print_id where lower(cp.set_code) = 'ex10') as ex10_target_parents,
         (select count(*)::int from pkg08c_targets t join public.card_prints cp on lower(cp.set_code) = lower(t.to_set_code) and cp.number = t.live_number and lower(cp.name) = lower(t.card_name)) as exu_parent_collisions,
         (select count(*)::int from pkg08c_targets t join public.card_printings cpr on cpr.card_print_id = t.card_print_id and cpr.finish_key = t.finish_key) as target_holo_children,
         (select count(*)::int from pkg08c_targets t join public.external_mappings em on em.source = 'tcgdex' and em.external_id = t.tcgdex_external_id where em.card_print_id <> t.card_print_id) as mapping_wrong_parent_collisions`,
    );
    const guard = guards.rows[0];
    if (
      guard.ex10_target_parents !== 28 ||
      guard.exu_parent_collisions !== 0 ||
      guard.target_holo_children !== 28 ||
      guard.mapping_wrong_parent_collisions !== 0
    ) {
      throw new Error(`transaction guard failed: ${JSON.stringify(guard)}`);
    }

    const parentUpdate = await client.query(
      `update public.card_prints cp
       set set_id = t.to_set_id,
           set_code = t.to_set_code,
           ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
             'pkg08c_relocated_from_set_code', cp.set_code,
             'pkg08c_package_id', $1::text
           )
       from pkg08c_targets t
       where cp.id = t.card_print_id`,
      [PACKAGE_ID],
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select
         'tcgdex',
         t.tcgdex_external_id,
         t.card_print_id,
         jsonb_build_object('package_id', $1::text, 'created_by', $2::text)
       from pkg08c_targets t
       left join public.external_mappings em
         on em.source = 'tcgdex'
        and em.external_id = t.tcgdex_external_id
       where em.id is null`,
      [PACKAGE_ID, 'pkg08c_exu_parent_relocation_real_apply_v1'],
    );
    if (parentUpdate.rowCount !== 28) throw new Error(`parent update count mismatch: ${parentUpdate.rowCount}`);
    if (mappingInsert.rowCount !== 1) throw new Error(`mapping insert count mismatch: ${mappingInsert.rowCount}`);

    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08c_targets) as target_parent_updates,
         (select count(*)::int from pkg08c_targets t join public.card_prints cp on cp.id = t.card_print_id where lower(cp.set_code) = 'exu') as relocated_parent_rows,
         (select count(*)::int from pkg08c_targets t join public.card_printings cpr on cpr.card_print_id = t.card_print_id and cpr.finish_key = t.finish_key) as preserved_target_child_printings,
         $3::int as inserted_mapping_rows`,
      [PACKAGE_ID, PACKAGE_FINGERPRINT, mappingInsert.rowCount],
    );
    await client.query('commit');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      apply_status: 'pkg08c_exu_parent_relocation_real_apply_committed',
      committed: true,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      proof_row: proof.rows[0],
      live_shape: liveShape,
      write_counts: {
        parent_updates: parentUpdate.rowCount,
        mapping_inserts: mappingInsert.rowCount,
      },
      stop_findings: [],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      apply_status: 'failed_rolled_back',
      committed: false,
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      live_shape: liveShape,
      write_counts: {},
      stop_findings: [`real_apply_error:${error.message}`],
    };
  }
}

async function postApplyVerification(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, tcgdex_external_id text, finish_key text)
     )
     select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       coalesce(jsonb_agg(distinct cpr.finish_key order by cpr.finish_key) filter (where cpr.finish_key is not null), '[]'::jsonb) as finishes,
       coalesce(jsonb_agg(distinct em.external_id order by em.external_id) filter (where em.external_id is not null), '[]'::jsonb) as tcgdex_external_ids
     from target t
     join public.card_prints cp on cp.id = t.card_print_id
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.external_mappings em on em.card_print_id = cp.id and em.source = 'tcgdex'
     group by cp.id, cp.set_code, cp.number, cp.number_plain, cp.name
     order by cp.number, cp.id`,
    [JSON.stringify(targets)],
  );
  const rows = result.rows;
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      parent_rows_found: rows.length,
      by_set: countBy(rows, (row) => row.set_code),
      target_rows_with_holo: rows.filter((row) => row.finishes.includes('holo')).length,
      target_rows_with_tcgdex_mapping: rows.filter((row) => row.tcgdex_external_ids.some((externalId) => String(externalId).startsWith('exu-'))).length,
    },
  };
}

function renderMarkdown(report) {
  const setRows = Object.entries(report.post_apply_verification?.counts?.by_set ?? {}).map(([set, count]) => [set, count]);
  return `# PKG-08C EXU Parent Relocation Real Apply V1

Real apply for the approved EXU parent relocation package.

## Result

- apply_status: ${report.apply_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- parent_updates: ${report.write_counts.parent_updates ?? 0}
- mapping_inserts: ${report.write_counts.mapping_inserts ?? 0}
- db_write_committed: ${report.db_write_committed}
- migrations_created: ${report.migrations_created}
- deletes_performed: ${report.deletes_performed}
- merges_performed: ${report.merges_performed}
- unsupported_cleanup_performed: ${report.unsupported_cleanup_performed}
- global_apply_performed: ${report.global_apply_performed}
- stop_findings: ${report.stop_findings.length}

## Post-Apply Verification

${markdownTable(['set_code', 'rows'], setRows)}

- target_rows_with_holo: ${report.post_apply_verification?.counts?.target_rows_with_holo ?? 0}
- target_rows_with_tcgdex_mapping: ${report.post_apply_verification?.counts?.target_rows_with_tcgdex_mapping ?? 0}

## Rollback Preview

Rollback would move the 28 listed parent rows back to \`ex10\` and remove only the package-created \`exu-?\` TCGdex mapping. Do not run rollback unless explicitly approved.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08C EXU Parent Relocation Real Apply Checkpoint V1](20260610_pkg08c_exu_parent_relocation_real_apply_checkpoint_v1.md) | Real-applies approved 28 parent relocations from ex10 to exu; preserves child printings and inserts one missing TCGdex mapping. No migrations, deletes, merges, or unsupported cleanup. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (!current.includes('20260610_pkg08c_exu_parent_relocation_real_apply_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const gate = readJson(GATE_JSON);
  const dryRun = readJson(DRY_RUN_JSON);
  const targets = dryRun.scope?.targets ?? [];
  const prerequisiteFindings = validatePrerequisites({ gate, dryRun, targets });
  if (prerequisiteFindings.length !== 0) {
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08c_exu_parent_relocation_real_apply_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      apply_status: 'blocked_before_real_apply',
      db_write_committed: false,
      migrations_created: false,
      stop_findings: prerequisiteFindings,
    };
    writeJson(OUTPUT_JSON, report);
    writeText(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available.');
  const client = new Client({ connectionString: conn });
  await client.connect();
  let applyResult;
  let postApply = null;
  try {
    applyResult = await applyPackage(client, targets);
    if (applyResult.committed) postApply = await postApplyVerification(client, targets);
  } finally {
    await client.end().catch(() => {});
  }

  const postFindings = [];
  if (applyResult.committed) {
    if (postApply.counts.parent_rows_found !== 28) postFindings.push('post_apply_parent_rows_not_28');
    if (postApply.counts.by_set.exu !== 28) postFindings.push('post_apply_exu_rows_not_28');
    if (postApply.counts.target_rows_with_holo !== 28) postFindings.push('post_apply_holo_rows_not_28');
    if (postApply.counts.target_rows_with_tcgdex_mapping !== 28) postFindings.push('post_apply_tcgdex_mapping_rows_not_28');
  }

  const stopFindings = [...(applyResult.stop_findings ?? []), ...postFindings];
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08c_exu_parent_relocation_real_apply_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    approved_operator_text: APPROVAL_TEXT,
    apply_status: stopFindings.length === 0 ? applyResult.apply_status : 'committed_with_post_apply_findings',
    db_write_committed: applyResult.committed,
    migrations_created: false,
    deletes_performed: false,
    merges_performed: false,
    unsupported_cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    scope: {
      target_parent_updates: 28,
      from_set_code: 'ex10',
      to_set_code: 'exu',
      approved_child_printings_preserved: 28,
      actual_child_rows_preserved_in_snapshot: applyResult.after_snapshot?.counts?.child_rows ?? null,
      mapping_inserts: 1,
      targets,
    },
    live_shape_before_apply: applyResult.live_shape,
    before_snapshot: applyResult.before_snapshot,
    after_snapshot: applyResult.after_snapshot,
    proof_row: applyResult.proof_row ?? null,
    proof_hash_sha256: sha256(stableJson(applyResult.proof_row ?? {})),
    write_counts: applyResult.write_counts,
    post_apply_verification: postApply,
    rollback_preview: {
      parent_ids_to_move_back_to_ex10: targets.map((row) => row.card_print_id),
      package_created_mapping_external_id: 'exu-?',
      note: 'Rollback is not authorized by this report.',
    },
    stop_findings: stopFindings,
  };

  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    checkpoint_md: CHECKPOINT_MD,
    apply_status: report.apply_status,
    package_fingerprint_sha256: PACKAGE_FINGERPRINT,
    parent_updates: report.write_counts.parent_updates ?? 0,
    mapping_inserts: report.write_counts.mapping_inserts ?? 0,
    post_apply_counts: report.post_apply_verification?.counts ?? {},
    stop_findings: report.stop_findings,
    db_write_committed: report.db_write_committed,
    migrations_created: report.migrations_created,
  }, null, 2));

  if (stopFindings.length !== 0) process.exitCode = 1;
}

await main();
