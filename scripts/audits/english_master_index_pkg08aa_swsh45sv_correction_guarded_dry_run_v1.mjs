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
const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08aa_swsh45sv_correction_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08AA-SWSH45SV-CORRECTION';

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

function buildTargets(readiness) {
  return (readiness.rows ?? [])
    .filter((row) => row.live_status === 'ready_for_guarded_correction_dry_run')
    .map((row) => ({
      card_print_id: row.card_print_id,
      card_printing_id: row.current_child_printing_id,
      from_set_code: 'swsh4.5',
      to_set_code: 'swsh45sv',
      card_number: row.card_number,
      card_name: row.card_name,
      from_finish_key: 'normal',
      to_finish_key: 'holo',
      from_printing_gv_id: row.current_parent?.child_printings?.find((child) => child.id === row.current_child_printing_id)?.printing_gv_id ?? null,
      to_printing_gv_id: String(row.current_parent?.child_printings?.find((child) => child.id === row.current_child_printing_id)?.printing_gv_id ?? '').replace(/-STD$/i, '-HOLO'),
      provenance_source: row.current_parent?.child_printings?.find((child) => child.id === row.current_child_printing_id)?.provenance_source ?? null,
      provenance_ref: row.current_parent?.child_printings?.find((child) => child.id === row.current_child_printing_id)?.provenance_ref ?? null,
      evidence_urls: row.master_index_evidence_urls ?? [],
    }))
    .sort((left, right) => left.card_number.localeCompare(right.card_number, undefined, { numeric: true }));
}

async function captureSnapshot(client, targets) {
  const parentIds = targets.map((row) => row.card_print_id);
  const childIds = targets.map((row) => row.card_printing_id);
  const result = await client.query(
    `select
       cp.id::text as card_print_id,
       cp.set_id::text as set_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as child_printings,
       coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings
     from public.card_prints cp
     where cp.id = any($1::uuid[])
     order by cp.set_code, cp.number, cp.name, cp.id`,
    [parentIds],
  );
  const counts = await client.query(
    `select
       (select count(*)::int from public.card_prints where id = any($1::uuid[])) as parent_rows,
       (select count(*)::int from public.card_prints where id = any($1::uuid[]) and lower(set_code) = 'swsh4.5') as host_parent_rows,
       (select count(*)::int from public.card_prints where id = any($1::uuid[]) and lower(set_code) = 'swsh45sv') as subset_parent_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[])) as child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and finish_key = 'normal') as normal_child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and finish_key = 'holo') as holo_child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and printing_gv_id like '%-HOLO') as holo_gv_child_rows,
       (select count(*)::int from public.card_printings where id = any($2::uuid[]) and printing_gv_id like '%-STD') as std_gv_child_rows`,
    [parentIds, childIds],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    impact_counts: counts.rows[0],
  };
}

function validateTargets(readiness, targets) {
  const findings = [];
  if (readiness.readiness_status !== 'ready_for_guarded_correction_dry_run') findings.push('readiness_not_ready');
  if (readiness.stop_findings?.length) findings.push('readiness_stop_findings_present');
  if (targets.length !== 25) findings.push(`target_count_not_25:${targets.length}`);
  if (targets.some((row) => row.from_set_code !== 'swsh4.5' || row.to_set_code !== 'swsh45sv')) findings.push('unexpected_set_direction');
  if (targets.some((row) => row.from_finish_key !== 'normal' || row.to_finish_key !== 'holo')) findings.push('unexpected_finish_direction');
  if (targets.some((row) => !row.from_printing_gv_id?.endsWith('-STD'))) findings.push('target_without_std_gv_id');
  if (targets.some((row) => !row.to_printing_gv_id?.endsWith('-HOLO'))) findings.push('target_without_holo_gv_id');
  return findings;
}

async function runDryRun(client, targets, packageFingerprint) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08aa_targets (
         card_print_id uuid primary key,
         card_printing_id uuid not null,
         from_set_code text not null,
         to_set_id uuid not null,
         to_set_code text not null,
         card_number text not null,
         card_name text not null,
         from_finish_key text not null,
         to_finish_key text not null,
         from_printing_gv_id text not null,
         to_printing_gv_id text not null
       ) on commit drop`,
    );
    const targetSet = await client.query(
      `select id::text, code, name
       from public.sets
       where game = 'pokemon'
         and lower(code) = 'swsh45sv'`,
    );
    if (targetSet.rows.length !== 1) throw new Error(`expected_one_swsh45sv_set_found_${targetSet.rows.length}`);
    await client.query(
      `insert into pkg08aa_targets
       select
         row.card_print_id::uuid,
         row.card_printing_id::uuid,
         row.from_set_code,
         $2::uuid,
         $3::text,
         row.card_number,
         row.card_name,
         row.from_finish_key,
         row.to_finish_key,
         row.from_printing_gv_id,
         row.to_printing_gv_id
       from jsonb_to_recordset($1::jsonb) as row(
         card_print_id text,
         card_printing_id text,
         from_set_code text,
         card_number text,
         card_name text,
         from_finish_key text,
         to_finish_key text,
         from_printing_gv_id text,
         to_printing_gv_id text
       )`,
      [JSON.stringify(targets), targetSet.rows[0].id, targetSet.rows[0].code],
    );
    await client.query(
      `select cp.id
       from public.card_prints cp
       join pkg08aa_targets target on target.card_print_id = cp.id
       for update of cp`,
    );
    await client.query(
      `select cpr.id
       from public.card_printings cpr
       join pkg08aa_targets target on target.card_printing_id = cpr.id
       for update of cpr`,
    );
    const guards = await client.query(
      `select
         (select count(*)::int from pkg08aa_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg08aa_targets t on t.card_print_id = cp.id and lower(cp.set_code) = lower(t.from_set_code)) as source_parent_rows,
         (select count(*)::int from public.card_prints cp join pkg08aa_targets t on lower(cp.set_code) = lower(t.to_set_code) and cp.number = t.card_number and lower(cp.name) = lower(t.card_name) and cp.id <> t.card_print_id) as target_parent_collisions,
         (select count(*)::int from public.card_printings cpr join pkg08aa_targets t on cpr.id = t.card_printing_id and cpr.card_print_id = t.card_print_id and cpr.finish_key = t.from_finish_key and cpr.printing_gv_id = t.from_printing_gv_id) as normal_children_to_update,
         (select count(*)::int from public.card_printings cpr join pkg08aa_targets t on cpr.card_print_id = t.card_print_id and cpr.finish_key = t.to_finish_key) as existing_holo_child_collisions,
         (select count(*)::int from public.finish_keys fk where fk.key = 'holo' and fk.is_active = true) as active_holo_finish_keys`,
    );
    const guard = guards.rows[0];
    if (
      guard.target_rows !== targets.length ||
      guard.source_parent_rows !== targets.length ||
      guard.target_parent_collisions !== 0 ||
      guard.normal_children_to_update !== targets.length ||
      guard.existing_holo_child_collisions !== 0 ||
      guard.active_holo_finish_keys !== 1
    ) {
      throw new Error(`prewrite guard failed: ${JSON.stringify(guard)}`);
    }
    const parentUpdate = await client.query(
      `update public.card_prints cp
       set set_id = target.to_set_id,
           set_code = target.to_set_code,
           ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object(
             'pkg08aa_corrected_from_set_code', cp.set_code,
             'pkg08aa_package_id', $1::text
           )
       from pkg08aa_targets target
       where cp.id = target.card_print_id`,
      [PACKAGE_ID],
    );
    const childUpdate = await client.query(
      `update public.card_printings cpr
       set finish_key = target.to_finish_key,
           printing_gv_id = target.to_printing_gv_id
       from pkg08aa_targets target
       where cpr.id = target.card_printing_id`,
    );
    if (parentUpdate.rowCount !== targets.length || childUpdate.rowCount !== targets.length) {
      throw new Error(`write count mismatch: ${JSON.stringify({ parent_updates: parentUpdate.rowCount, child_updates: childUpdate.rowCount })}`);
    }
    const proof = await client.query(
      `select
         $1::text as package_id,
         $2::text as package_fingerprint,
         (select count(*)::int from pkg08aa_targets) as target_rows,
         (select count(*)::int from public.card_prints cp join pkg08aa_targets t on cp.id = t.card_print_id and lower(cp.set_code) = lower(t.to_set_code)) as corrected_parent_rows,
         (select count(*)::int from public.card_printings cpr join pkg08aa_targets t on cpr.id = t.card_printing_id and cpr.finish_key = t.to_finish_key and cpr.printing_gv_id = t.to_printing_gv_id) as corrected_child_rows`,
      [PACKAGE_ID, packageFingerprint],
    );
    await client.query('rollback');
    const afterSnapshot = await captureSnapshot(client, targets);
    return {
      status: 'pkg08aa_swsh45sv_correction_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: proof.rows,
      simulated_write_counts: {
        parent_updates: parentUpdate.rowCount,
        child_updates: childUpdate.rowCount,
        deletes: 0,
        inserts: 0,
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const afterSnapshot = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg08aa_swsh45sv_correction_failed_rolled_back',
      error_message: error.message,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      rollback_proof_rows: [],
      simulated_write_counts: {
        parent_updates: 0,
        child_updates: 0,
        deletes: 0,
        inserts: 0,
      },
    };
  }
}

function renderMarkdown(report) {
  const rowPreview = report.scope.targets.slice(0, 30).map((row) => [
    row.card_number,
    row.card_name,
    row.from_set_code,
    row.to_set_code,
    row.from_finish_key,
    row.to_finish_key,
    row.from_printing_gv_id,
    row.to_printing_gv_id,
  ]);
  return `# PKG-08AA SWSH45SV Correction Guarded Dry Run V1

Rollback-only dry run for correcting the PKG-08Y Shining Fates Shiny Vault direction. No durable write was authorized or performed by this script.

## Status

- Dry-run status: \`${report.dry_run_status}\`
- Fingerprint: \`${report.package_fingerprint_sha256}\`
- Target rows: ${report.scope.target_rows}
- Parent updates simulated: ${report.simulated_write_counts.parent_updates}
- Child updates simulated: ${report.simulated_write_counts.child_updates}
- Deletes simulated: ${report.simulated_write_counts.deletes}
- Inserts simulated: ${report.simulated_write_counts.inserts}
- Durable DB writes performed: \`${report.durable_db_writes_performed}\`
- Stop findings: ${report.stop_findings.length}

## Rollback Proof

- Before hash: \`${report.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- After hash: \`${report.after_snapshot?.hash_sha256 ?? 'n/a'}\`
- Match: \`${report.durable_after_snapshot_matches_before_snapshot}\`

## Rows

${markdownTable(['Number', 'Name', 'From Set', 'To Set', 'From Finish', 'To Finish', 'From GV', 'To GV'], rowPreview)}

## Recommended Real Apply Approval Text

\`\`\`text
${report.recommended_real_apply_approval_text}
\`\`\`
`;
}

async function updateCheckpointIndex() {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08AA SWSH45SV Correction Guarded Dry Run Checkpoint V1](20260610_pkg08aa_swsh45sv_correction_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for correcting PKG-08Y swsh4.5 -> swsh45sv direction and normal -> holo child finish. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? await fs.readFile(indexPath, 'utf8') : '# Master Index Checkpoint Index\n\n';
  if (current.includes('20260610_pkg08aa_swsh45sv_correction_guarded_dry_run_checkpoint_v1.md')) {
    const next = current.split(/\r?\n/).map((existingLine) => (
      existingLine.includes('20260610_pkg08aa_swsh45sv_correction_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n');
    await fs.writeFile(indexPath, next.endsWith('\n') ? next : `${next}\n`);
    return;
  }
  await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
}

async function main() {
  const readiness = await readJson(READINESS_JSON);
  const targets = buildTargets(readiness);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    readiness_fingerprint: readiness.package_fingerprint_sha256,
    targets,
  }));
  const targetFindings = validateTargets(readiness, targets);

  let execution = {
    status: 'pkg08aa_swsh45sv_correction_not_run',
    error_message: targetFindings.join(', '),
    before_snapshot: null,
    after_snapshot: null,
    rollback_proof_rows: [],
    simulated_write_counts: { parent_updates: 0, child_updates: 0, deletes: 0, inserts: 0 },
  };

  if (targetFindings.length === 0) {
    const conn = connectionString();
    if (!conn) {
      targetFindings.push('database_connection_unavailable');
    } else {
      const client = new Client({ connectionString: conn });
      await client.connect();
      try {
        execution = await runDryRun(client, targets, packageFingerprint);
      } finally {
        await client.end().catch(() => {});
      }
    }
  }

  const durableMatch = execution.before_snapshot?.hash_sha256 === execution.after_snapshot?.hash_sha256;
  const stopFindings = [
    ...targetFindings,
    ...(execution.status !== 'pkg08aa_swsh45sv_correction_completed_rolled_back_no_durable_change' ? ['dry_run_not_completed'] : []),
    ...(durableMatch ? [] : ['rollback_snapshot_hash_mismatch']),
  ];
  const approvalText = `Approve real PKG-08AA-SWSH45SV-CORRECTION apply only. Fingerprint: ${packageFingerprint}. Scope: 25 parent relocations from swsh4.5 back to swsh45sv and 25 child finish updates from normal to holo in place; printing_gv_id STD -> HOLO; no deletes; no inserts; existing external mappings preserved. Dry-run proof: ${execution.before_snapshot?.hash_sha256 ?? 'n/a'} == ${execution.after_snapshot?.hash_sha256 ?? 'n/a'}. No global apply. No migrations. No merges. No unsupported cleanup. No quarantine.`;

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08aa_swsh45sv_correction_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    readiness_fingerprint_sha256: readiness.package_fingerprint_sha256,
    dry_run_status: execution.status,
    error_message: execution.error_message,
    audit_only: true,
    durable_db_writes_performed: false,
    db_writes_committed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    merges_performed: false,
    durable_after_snapshot_matches_before_snapshot: durableMatch,
    before_snapshot: execution.before_snapshot,
    after_snapshot: execution.after_snapshot,
    rollback_proof_rows: execution.rollback_proof_rows,
    simulated_write_counts: execution.simulated_write_counts,
    scope: {
      target_rows: targets.length,
      parent_updates: targets.length,
      child_finish_updates: targets.length,
      deletes: 0,
      inserts: 0,
      by_set_direction: countBy(targets, (row) => `${row.from_set_code}->${row.to_set_code}`),
      by_finish_direction: countBy(targets, (row) => `${row.from_finish_key}->${row.to_finish_key}`),
      targets,
    },
    stop_findings: stopFindings,
    recommended_real_apply_approval_text: stopFindings.length === 0 ? approvalText : null,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# PKG-08AA SWSH45SV Correction Guarded Dry Run Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${packageFingerprint}\`
- Dry-run status: \`${execution.status}\`
- Before hash: \`${execution.before_snapshot?.hash_sha256 ?? 'n/a'}\`
- After hash: \`${execution.after_snapshot?.hash_sha256 ?? 'n/a'}\`
- Rollback proof match: \`${durableMatch}\`
- Parent updates simulated: ${execution.simulated_write_counts.parent_updates}
- Child updates simulated: ${execution.simulated_write_counts.child_updates}
- Deletes simulated: ${execution.simulated_write_counts.deletes}
- Inserts simulated: ${execution.simulated_write_counts.inserts}
- DB writes committed: \`false\`
- Migrations created: \`false\`
`);
  await updateCheckpointIndex();

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    dry_run_status: execution.status,
    stop_findings: stopFindings,
    simulated_write_counts: execution.simulated_write_counts,
    before_hash: execution.before_snapshot?.hash_sha256 ?? null,
    after_hash: execution.after_snapshot?.hash_sha256 ?? null,
    durable_after_snapshot_matches_before_snapshot: durableMatch,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    recommended_real_apply_approval_text: report.recommended_real_apply_approval_text,
  }, null, 2));

  if (stopFindings.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
