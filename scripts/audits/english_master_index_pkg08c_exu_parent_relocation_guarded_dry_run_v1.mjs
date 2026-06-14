import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08c_exu_parent_relocation_guarded_dry_run_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08c_exu_parent_relocation_guarded_dry_run_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08C-EXU-PARENT-RELOCATION';
const CREATED_BY = 'pkg08c_exu_parent_relocation_guarded_dry_run_v1';

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

function tcgdexExternalId(row) {
  for (const url of row.evidence_urls ?? []) {
    const match = String(url).match(/api\.tcgdex\.net\/v2\/en\/cards\/([^/?#]+)/i);
    if (match?.[1]) {
      let value = match[1];
      for (let index = 0; index < 2; index += 1) {
        try {
          const decoded = decodeURIComponent(value);
          if (decoded === value) break;
          value = decoded;
        } catch {
          break;
        }
      }
      return value;
    }
  }
  return null;
}

function liveNumberForMasterNumber(value) {
  return String(value ?? '') === '%3F' ? '?' : String(value ?? '');
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, external_id text)
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.set_id::text as set_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       null::text as source,
       null::text as external_id
     from target t
     join public.card_prints cp on cp.id = t.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       null::text as set_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       null::text as source,
       cpr.finish_key as external_id
     from target t
     join public.card_printings cpr on cpr.card_print_id = t.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     union all
     select
       'mapping' as row_type,
       em.id::text as row_id,
       null::text as set_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       em.source,
       em.external_id
     from target t
     join public.external_mappings em on em.card_print_id = t.card_print_id or (em.source = 'tcgdex' and em.external_id = t.external_id)
     left join public.card_prints cp on cp.id = em.card_print_id
     order by row_type, set_code nulls last, number nulls last, external_id nulls last, row_id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id, external_id: row.tcgdex_external_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function buildTargets(client, sourceRows) {
  const exuSet = await client.query(`select id::text, code, name from public.sets where game = 'pokemon' and lower(code) = 'exu'`);
  if (exuSet.rows.length !== 1) throw new Error(`expected exactly one exu set, found ${exuSet.rows.length}`);
  const targetSet = exuSet.rows[0];
  const targets = [];
  const blocked = [];
  for (const row of sourceRows) {
    const liveNumber = liveNumberForMasterNumber(row.card_number);
    const externalId = tcgdexExternalId(row);
    const parent = await client.query(
      `select cp.id::text as card_print_id, cp.set_id::text, cp.set_code, cp.number, cp.number_plain, cp.name,
              coalesce(jsonb_agg(cpr.finish_key order by cpr.finish_key) filter (where cpr.finish_key is not null), '[]'::jsonb) as finishes
       from public.card_prints cp
       left join public.card_printings cpr on cpr.card_print_id = cp.id
       where lower(cp.set_code) = 'ex10'
         and cp.number = $1
         and lower(cp.name) = lower($2)
       group by cp.id, cp.set_id, cp.set_code, cp.number, cp.number_plain, cp.name
       order by cp.id`,
      [liveNumber, row.card_name],
    );
    if (parent.rows.length !== 1) {
      blocked.push({ ...row, live_number: liveNumber, blocked_reason: `expected_one_ex10_parent_found_${parent.rows.length}` });
      continue;
    }
    const parentRow = parent.rows[0];
    if (!parentRow.finishes.map(normalizeText).includes(normalizeText(row.finish_key))) {
      blocked.push({ ...row, live_number: liveNumber, card_print_id: parentRow.card_print_id, blocked_reason: 'target_finish_missing_on_ex10_parent' });
      continue;
    }
    targets.push({
      card_print_id: parentRow.card_print_id,
      from_set_code: parentRow.set_code,
      from_set_id: parentRow.set_id,
      to_set_code: targetSet.code,
      to_set_id: targetSet.id,
      card_number: row.card_number,
      live_number: liveNumber,
      card_name: row.card_name,
      finish_key: row.finish_key,
      tcgdex_external_id: externalId,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
    });
  }
  return { targetSet, targets, blocked };
}

async function runDryRun(client, targets, packageFingerprint) {
  const before = await captureSnapshot(client, targets);
  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table pkg08c_targets (
         card_print_id uuid primary key,
         to_set_id uuid not null,
         to_set_code text not null,
         external_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into pkg08c_targets
       select row.card_print_id::uuid, row.to_set_id::uuid, row.to_set_code, row.tcgdex_external_id
       from jsonb_to_recordset($1::jsonb) as row(card_print_id text, to_set_id text, to_set_code text, tcgdex_external_id text)`,
      [JSON.stringify(targets)],
    );
    const collision = await client.query(
      `select
         (select count(*)::int from pkg08c_targets t join public.card_prints cp on cp.id = t.card_print_id where lower(cp.set_code) <> 'ex10') as non_ex10_targets,
         (select count(*)::int from pkg08c_targets t join public.card_prints cp on lower(cp.set_code) = lower(t.to_set_code) and cp.number = (select number from public.card_prints where id = t.card_print_id) and cp.name = (select name from public.card_prints where id = t.card_print_id)) as target_parent_collisions`,
    );
    if (collision.rows[0].non_ex10_targets !== 0 || collision.rows[0].target_parent_collisions !== 0) {
      throw new Error(`collision guard failed: ${JSON.stringify(collision.rows[0])}`);
    }
    const update = await client.query(
      `update public.card_prints cp
       set set_id = t.to_set_id,
           set_code = t.to_set_code,
           ai_metadata = coalesce(cp.ai_metadata, '{}'::jsonb) || jsonb_build_object('pkg08c_relocated_from_set_code', cp.set_code, 'pkg08c_package_id', $1::text)
       from pkg08c_targets t
       where cp.id = t.card_print_id`,
      [PACKAGE_ID],
    );
    const mappingInsert = await client.query(
      `insert into public.external_mappings (source, external_id, card_print_id, meta)
       select 'tcgdex', t.external_id, t.card_print_id, jsonb_build_object('package_id', $1::text, 'created_by', $2::text)
       from pkg08c_targets t
       left join public.external_mappings em on em.source = 'tcgdex' and em.external_id = t.external_id
       where em.id is null`,
      [PACKAGE_ID, CREATED_BY],
    );
    if (update.rowCount !== targets.length) throw new Error(`parent update count mismatch: ${update.rowCount}`);
    const proof = await client.query(
      `select $1::text as package_id, $2::text as package_fingerprint,
              (select count(*)::int from pkg08c_targets) as target_parent_rows,
              $3::int as mapping_inserts`,
      [PACKAGE_ID, packageFingerprint, mappingInsert.rowCount],
    );
    await client.query('rollback');
    const after = await captureSnapshot(client, targets);
    return {
      status: 'pkg08c_exu_parent_relocation_completed_rolled_back_no_durable_change',
      error_message: null,
      before_snapshot: before,
      after_snapshot: after,
      rollback_proof_rows: proof.rows,
      simulated_parent_updates: update.rowCount,
      simulated_mapping_inserts: mappingInsert.rowCount,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const after = await captureSnapshot(client, targets).catch(() => null);
    return {
      status: 'pkg08c_exu_parent_relocation_failed_rolled_back',
      error_message: error.message,
      before_snapshot: before,
      after_snapshot: after,
      rollback_proof_rows: [],
      simulated_parent_updates: 0,
      simulated_mapping_inserts: 0,
    };
  }
}

function renderMarkdown(report) {
  const setRows = Object.entries(report.scope.by_set).map(([set, count]) => [set, count]);
  const finishRows = Object.entries(report.scope.by_finish).map(([finish, count]) => [finish, count]);
  return `# PKG-08C EXU Parent Relocation Guarded Dry Run V1

Rollback-only dry run for relocating Unseen Forces Unown Collection parents from \`ex10\` to existing set \`exu\`.

## Safety

- rollback_only: ${report.rollback_only}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- real_apply_authorized: ${report.real_apply_authorized}

## Scope

- dry_run_status: ${report.dry_run_status}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- target_parent_updates: ${report.scope.target_parent_updates}
- child_printings_preserved: ${report.scope.child_printings_preserved}
- simulated_mapping_inserts: ${report.simulated_mapping_inserts}
- blocked_rows: ${report.scope.blocked_rows}

${markdownTable(['set', 'rows'], setRows)}

${markdownTable(['finish', 'rows'], finishRows)}

## Rollback Proof

- before_hash: \`${report.before_snapshot?.hash_sha256 ?? 'missing'}\`
- after_hash: \`${report.after_snapshot?.hash_sha256 ?? 'missing'}\`
- durable_after_snapshot_matches_before_snapshot: ${report.durable_after_snapshot_matches_before_snapshot}

## Stop Findings

${markdownTable(['finding'], report.stop_findings.map((finding) => [finding]))}
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08C EXU Parent Relocation Guarded Dry Run Checkpoint V1](20260610_pkg08c_exu_parent_relocation_guarded_dry_run_checkpoint_v1.md) | Rollback-only dry run for ex10 -> exu Unown Collection parent relocation. No durable writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08c_exu_parent_relocation_guarded_dry_run_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08c_exu_parent_relocation_guarded_dry_run_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'missing_set_or_set_alias' && row.set_key === 'exu');
const conn = connectionString();
let report;
if (!conn) {
  report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08c_exu_parent_relocation_guarded_dry_run_v1',
    package_id: PACKAGE_ID,
    dry_run_status: 'blocked_no_database_connection_string',
    stop_findings: ['database_connection_unavailable'],
    durable_db_writes_performed: false,
    db_writes_performed: false,
    migrations_created: false,
  };
} else {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const { targets, blocked } = await buildTargets(client, sourceRows);
    const packageFingerprint = sha256(stableJson(targets.map((row) => ({
      card_print_id: row.card_print_id,
      from_set_code: row.from_set_code,
      to_set_code: row.to_set_code,
      number: row.live_number,
      name: row.card_name,
      finish_key: row.finish_key,
      tcgdex_external_id: row.tcgdex_external_id,
    }))));
    const dryRun = targets.length > 0
      ? await runDryRun(client, targets, packageFingerprint)
      : {
          status: 'blocked_no_targets',
          error_message: 'No target rows were built.',
          before_snapshot: null,
          after_snapshot: null,
          rollback_proof_rows: [],
          simulated_parent_updates: 0,
          simulated_mapping_inserts: 0,
        };
    const stopFindings = [
      ...(blocked.length ? ['blocked_rows_present'] : []),
      ...(targets.length !== 28 ? [`expected_28_targets_found_${targets.length}`] : []),
      ...(dryRun.error_message ? [`dry_run_error:${dryRun.error_message}`] : []),
      ...(dryRun.status !== 'pkg08c_exu_parent_relocation_completed_rolled_back_no_durable_change' ? ['dry_run_not_passed'] : []),
      ...(dryRun.before_snapshot?.hash_sha256 !== dryRun.after_snapshot?.hash_sha256 ? ['durable_after_snapshot_differs_from_before_snapshot'] : []),
    ];
    report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_pkg08c_exu_parent_relocation_guarded_dry_run_v1',
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: packageFingerprint,
      audit_only: false,
      rollback_only: true,
      dry_run_status: dryRun.status,
      durable_db_writes_performed: false,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      real_apply_authorized: false,
      scope: {
        source_rows: sourceRows.length,
        target_parent_updates: targets.length,
        child_printings_preserved: targets.length,
        blocked_rows: blocked.length,
        by_set: countBy(targets, (row) => row.to_set_code),
        by_finish: countBy(targets, (row) => row.finish_key),
        targets,
        blocked,
      },
      before_snapshot: dryRun.before_snapshot,
      after_snapshot: dryRun.after_snapshot,
      rollback_proof_rows: dryRun.rollback_proof_rows,
      simulated_parent_updates: dryRun.simulated_parent_updates,
      simulated_mapping_inserts: dryRun.simulated_mapping_inserts,
      durable_after_snapshot_matches_before_snapshot:
        Boolean(dryRun.before_snapshot?.hash_sha256) && dryRun.before_snapshot?.hash_sha256 === dryRun.after_snapshot?.hash_sha256,
      stop_findings: stopFindings,
      next_step_if_clean: stopFindings.length === 0
        ? 'Prepare real-apply gate for exact operator approval. No apply without approval.'
        : 'Resolve stop findings before any real-apply gate.',
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
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  dry_run_status: report.dry_run_status,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  target_parent_updates: report.scope?.target_parent_updates ?? 0,
  child_printings_preserved: report.scope?.child_printings_preserved ?? 0,
  simulated_mapping_inserts: report.simulated_mapping_inserts ?? 0,
  stop_findings: report.stop_findings,
  durable_db_writes_performed: report.durable_db_writes_performed,
  migrations_created: report.migrations_created,
}, null, 2));

if ((report.stop_findings ?? []).length !== 0) process.exitCode = 1;
